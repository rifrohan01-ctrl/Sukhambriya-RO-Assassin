const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const {drawOBB}=require('./obb-data.js');
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname,'public');
const MIME={'.apng':'image/png','.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp3':'audio/mpeg','.ogg':'audio/ogg','.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/api/public-config'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({supabaseUrl:process.env.SUPABASE_URL||'',supabasePublishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||''}));}
  // Fixed-upstream proxy; never accepts arbitrary hostnames. External catalogue is fetched on demand.
  if(pathname==='/api/real-costumes'){
    (async()=>{
      const source=await fetch('https://assets.latam-tools.com.br/raw/items_en.json',{signal:AbortSignal.timeout(16000)});
      if(!source.ok)throw Error('Costume catalogue upstream '+source.status);
      const rows=await source.json();
      if(!Array.isArray(rows))throw Error('Unexpected catalogue format');
      const filtered=rows.filter(x=>x&&Number.isInteger(x.id)&&Number.isInteger(x.spriteView)&&x.spriteView>0&&!x.spriteBlank&&['headgear','garment'].includes(x.viewKind)&&typeof x.name==='string').map(x=>({id:x.id,name:x.name,view:x.spriteView,kind:x.viewKind,slots:x.equipSlots||[],costume:!!x.costume}));
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=1200'});
      res.end(JSON.stringify({items:filtered,count:filtered.length,source:'ragassets items_en.json'}));
    })().catch(e=>{console.error('COSTUME CATALOG ERROR',e.message);res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Catalogue temporarily unavailable',detail:e.message}));});return;
  }
  if(pathname==='/api/costume-image'||pathname==='/api/costume-icon'){
    (async()=>{
      const q=new URL(req.url,'http://localhost').searchParams;
      let upstream;
      if(pathname==='/api/costume-icon'){
        const id=Number(q.get('id'));
        if(!Number.isInteger(id)||id<1||id>9999999)throw Error('Invalid item id');
        upstream='https://assets.latam-tools.com.br/icons/item/'+id+'.png';
      }else{
        const itemId=Number(q.get('itemId')||0),job=4013;
        const action=Number(q.get('action')||0),head=Number(q.get('head')||8),headPalette=Number(q.get('headPalette')||1),bodyPalette=Number(q.get('bodyPalette')??-1);
        const upper=Number(q.get('upper')||0),middle=Number(q.get('middle')||0),lower=Number(q.get('lower')||0),garment=Number(q.get('garment')||0);
        if(![action,head,headPalette,bodyPalette,upper,middle,lower,garment].every(Number.isInteger)||action<0||action>103||head<0||head>50||[upper,middle,lower,garment].some(v=>v<0||v>100000))throw Error('Invalid sprite parameters');
        const params=new URLSearchParams({job:String(job),action:String(action),gender:'1',head:String(head),headPalette:String(headPalette),bodyPalette:String(bodyPalette),headgear:[upper,middle,lower].join(','),garment:String(garment),canvas:'200x200+100+150',headdir:'straight'});
        upstream='https://assets.latam-tools.com.br/image?'+params;
      }
      const r=await fetch(upstream,{signal:AbortSignal.timeout(16000)});
      if(!r.ok)throw Error('Sprite upstream HTTP '+r.status);
      if(!(r.headers.get('content-type')||'').includes('image/'))throw Error('Upstream did not return an image');
      const b=Buffer.from(await r.arrayBuffer());if(b.length>2000000)throw Error('Sprite too large');
      res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=300'});res.end(b);
    })().catch(e=>{console.error('COSTUME IMAGE ERROR',e.message);res.writeHead(502,{'Content-Type':'text/plain'});res.end('Costume image unavailable');});return;
  }
  const safe=pathname==='/'?'/index.html':pathname;
  const target=path.normalize(path.join(PUBLIC,safe));
  if(target!==PUBLIC&&!target.startsWith(PUBLIC+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(target,(err,body)=>{
    if(err){res.writeHead(404);return res.end('Not found')}
    res.setHeader('Content-Type',MIME[path.extname(target).toLowerCase()]||'application/octet-stream');
    res.setHeader('Cache-Control',path.extname(target)==='.html'||path.extname(target)==='.js'||path.extname(target)==='.webmanifest'?'no-cache':'public, max-age=3600');res.end(body);
  });
});
const wss=new WebSocketServer({server});
const rooms=new Map();
const RATES=[100,100,100,100,60,40,40,20,20,12];
const ITEMS=['Infiltrator','Assassin Dagger','Combat knife'];
const REFINE_DELAY=1150;
const OBB_SELL_RATE=Object.freeze({Common:0,Uncommon:1,Rare:2,Epic:5,Legendary:20});
const RECORD_KEY='sukhambriya:refine:records:v1';
const REDIS_URL=(process.env.UPSTASH_REDIS_REST_URL||'').replace(/\/$/,'');
const REDIS_TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN||'';
let hall=Object.fromEntries(ITEMS.map(item=>[item,null]));
const hasDB=!!(REDIS_URL&&REDIS_TOKEN);
async function redis(cmd){const response=await fetch(REDIS_URL,{method:'POST',headers:{Authorization:'Bearer '+REDIS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmd)});if(!response.ok)throw new Error('Redis HTTP '+response.status);const data=await response.json();if(data.error)throw new Error(data.error);return data.result;}
async function loadHall(){if(!hasDB)return;try{const data=await redis(['GET',RECORD_KEY]);if(data){const loaded=JSON.parse(data);for(const item of ITEMS){const v=loaded[item];if(v&&Number.isInteger(v.level)&&v.level>=4&&v.level<=10&&typeof v.name==='string')hall[item]={level:v.level,name:v.name.slice(0,24),date:v.date||null};}}console.log('Hall of fame loaded');}catch(e){console.error('Hall of fame load failed:',e.message)}}
let saveChain=Promise.resolve();
function storeHall(){if(!hasDB)return;const payload=JSON.stringify(hall);saveChain=saveChain.then(()=>redis(['SET',RECORD_KEY,payload])).catch(e=>console.error('Hall of fame save failed:',e.message));}
function recordSuccess(p){const old=hall[p.item];if(!old||p.level>old.level){hall[p.item]={name:p.name,level:p.level,date:new Date().toISOString()};storeHall();return true}return false}
function send(ws,data){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))}
function broadcast(room,data){for(const p of room.players.values())send(p.ws,data)}
function snap(room){return {type:'state',room:room.id,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,item:p.item,level:p.level,broken:p.broken,zeny:p.zeny,ores:p.ores,attempts:p.attempts,wins:p.wins,obbBoxes:p.obbBoxes,arsenal:p.arsenal,equippedWeaponId:p.equippedWeaponId})),feed:room.feed.slice(-15),hall,permanent:hasDB,battle:room.battle?{active:room.battle.active,endsAt:room.battle.endsAt,scores:[...room.battle.scores.values()]}:null};}
function say(room,entry){room.feed.push({time:new Date().toISOString(),...entry});if(room.feed.length>60)room.feed.shift()}
function uniqueName(room,name){name=String(name||'นักผจญภัย').trim().slice(0,18).replace(/[<>]/g,'')||'นักผจญภัย';const names=[...room.players.values()].map(p=>p.name);let result=name,n=2;while(names.includes(result)){result=name+' '+n++;}return result}
function share(room){broadcast(room,snap(room))}

// Persistent per-account game data: all writes are server-controlled.
const SB_URL=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const SB_PUB=process.env.SUPABASE_PUBLISHABLE_KEY||'';
const SB_SECRET=process.env.SUPABASE_SECRET_KEY||'';
const DB_ENABLED=!!(SB_URL&&SB_PUB&&SB_SECRET);
const FIELDS=['item','level','broken','zeny','ores','attempts','wins','brokenCount','obbBoxes','obbInventory','arsenal','equippedWeaponId'];
function gameSnapshot(p){const data={};for(const k of FIELDS)data[k]=p[k];data.redeemedCodes=[...(p.redeemedCodes||new Set())];return JSON.parse(JSON.stringify(data));}
function applyStored(p,d){if(!d||typeof d!=='object')return;const safe=(k,fn)=>{if(fn(d[k]))p[k]=d[k]};safe('item',v=>ITEMS.includes(v));safe('level',v=>Number.isInteger(v)&&v>=0&&v<=10);safe('broken',v=>typeof v==='boolean');for(const k of ['zeny','ores','attempts','wins','brokenCount','obbBoxes'])safe(k,v=>Number.isSafeInteger(v)&&v>=0);safe('arsenal',v=>Array.isArray(v)&&v.length<=100);safe('obbInventory',v=>Array.isArray(v)&&v.length<=5000);safe('equippedWeaponId',v=>v===null||typeof v==='string');if(Array.isArray(d.redeemedCodes))p.redeemedCodes=new Set(d.redeemedCodes.filter(x=>typeof x==='string'));}
async function dbFetch(endpoint,opts={}){
 const r=await fetch(SB_URL+'/rest/v1/'+endpoint,{...opts,headers:{'apikey':SB_SECRET,'Authorization':'Bearer '+SB_SECRET,'Content-Type':'application/json',...(opts.headers||{})}});
 if(!r.ok)throw Error('Supabase game state HTTP '+r.status+': '+(await r.text()).slice(0,240));
 const t=await r.text();return t?JSON.parse(t):null;
}
async function verifyAccount(token){if(!DB_ENABLED)throw Error('ระบบบันทึกยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY บน Render');if(typeof token!=='string'||token.length<20)throw Error('กรุณาเข้าสู่ระบบอีกครั้ง');const r=await fetch(SB_URL+'/auth/v1/user',{headers:{apikey:SB_PUB,Authorization:'Bearer '+token}});if(!r.ok)throw Error('บัญชีหมดอายุ กรุณาล็อกอินใหม่');const user=await r.json();if(!user.id)throw Error('ตรวจสอบบัญชีไม่สำเร็จ');return user.id;}
async function loadGame(userId){const rows=await dbFetch('player_game_state?user_id=eq.'+encodeURIComponent(userId)+'&select=game_data');return rows&&rows[0]?rows[0].game_data:null;}
function queueSave(p){if(!p||!p.userId)return Promise.resolve();const snapshot=gameSnapshot(p);p.saveQueue=(p.saveQueue||Promise.resolve()).catch(()=>{}).then(async()=>{
 await dbFetch('player_game_state?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:p.userId,game_data:snapshot,weapon_type:snapshot.item,refine_level:snapshot.level,zeny:snapshot.zeny,ores:snapshot.ores,obb_boxes:snapshot.obbBoxes,arsenal:snapshot.arsenal,obb_inventory:snapshot.obbInventory,equipped_weapon_id:snapshot.equippedWeaponId,updated_at:new Date().toISOString()})});
 }).catch(e=>{console.error('GAME SAVE ERROR',p.userId,e.message);send(p.ws,{type:'error',message:'บันทึกข้อมูลไม่สำเร็จ: '+e.message});});return p.saveQueue;}

wss.on('connection',ws=>{let room=null,player=null;let incoming=Promise.resolve();ws.on('message',raw=>{incoming=incoming.then(()=>handleMessage(raw)).catch(e=>{console.error('Message error',e);send(ws,{type:'error',message:e.message||'Server error'})});});async function handleMessage(raw){if(raw.length>55000)return;let msg;try{msg=JSON.parse(raw.toString())}catch{return}if(!msg||typeof msg!=='object')return;if(msg.type==='join'&&!player){const userId=await verifyAccount(msg.accessToken);const saved=await loadGame(userId);const id=String(msg.room||'MAIN').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16)||'MAIN';room=rooms.get(id);if(!room){room={id,players:new Map(),feed:[],battle:null};rooms.set(id,room)}if(room.players.size>=20){send(ws,{type:'error',message:'ห้องเต็ม (สูงสุด 20 คน)'});return}player={id:crypto.randomBytes(8).toString('hex'),ws,name:uniqueName(room,msg.name),item:'Infiltrator',level:0,broken:false,zeny:20000,ores:60,attempts:0,wins:0,refining:false,brokenCount:0,obbBoxes:1000,obbInventory:[],obbBusy:false,arsenal:[],equippedWeaponId:null};player.userId=userId;applyStored(player,saved);if(!saved)await queueSave(player);room.players.set(player.id,player);send(ws,{type:'welcome',id:player.id});send(ws,{type:'obbState',boxes:player.obbBoxes,inventory:player.obbInventory});say(room,{kind:'join',text:`${player.name} เข้าห้องแล้ว`});share(room);return;}if(!player)return;try{
if(msg.type==='huntReward'){
 const now=Date.now();
 if(!player.lastHuntReward)player.lastHuntReward=0;
 if(now-player.lastHuntReward<650){send(ws,{type:'huntRewardDenied',message:'รับรางวัลถี่เกินไป'});return;}
 player.lastHuntReward=now;
 const gain=crypto.randomInt(10,51);
 player.obbBoxes+=gain;
 send(ws,{type:'obbState',boxes:player.obbBoxes,inventory:player.obbInventory});
 send(ws,{type:'huntRewardResult',count:gain});
 return;
}

if(msg.type==='redeemCode'){
 const code=String(msg.code||'').trim().toLowerCase();
 if(code!=='9999obb'){send(ws,{type:'codeResult',ok:false,message:'โค้ดไม่ถูกต้อง'});return;}
 if(!player.redeemedCodes)player.redeemedCodes=new Set();
 if(player.redeemedCodes.has(code)){send(ws,{type:'codeResult',ok:false,message:'โค้ดนี้ใช้แล้วในรอบการเล่นนี้'});return;}
 player.redeemedCodes.add(code);
 player.obbBoxes+=9999;
 send(ws,{type:'obbState',boxes:player.obbBoxes,inventory:player.obbInventory});
 send(ws,{type:'codeResult',ok:true,message:'รับ Old Blue Box 9,999 กล่องสำเร็จ!'});
 share(room);return;
}
if(msg.type==='storeWeapon'){
 if(player.refining||player.broken||player.level<1||player.level>10){send(ws,{type:'arsenalError',message:'เก็บได้เฉพาะอาวุธ +1 ถึง +10 ที่ไม่แตกและไม่ได้กำลังตีบวก'});return;}
 if(player.arsenal.length>=100){send(ws,{type:'arsenalError',message:'คลังเต็ม (สูงสุด 100 ชิ้น)'});return;}
 const saved={id:crypto.randomBytes(10).toString('hex'),item:player.item,level:player.level,createdAt:new Date().toISOString()};
 player.arsenal.push(saved);player.level=0;player.broken=false;
 say(room,{kind:'success',text:`📦 ${player.name} เก็บ ${saved.item} +${saved.level} เข้าคลัง`});
 send(ws,{type:'arsenalState',arsenal:player.arsenal,equippedWeaponId:player.equippedWeaponId});share(room);return;
}
if(msg.type==='equipWeapon'){
 const id=msg.id==null?null:String(msg.id);
 if(id!==null&&!player.arsenal.some(w=>w.id===id)){send(ws,{type:'arsenalError',message:'ไม่พบอาวุธที่ต้องการสวมใส่'});return;}
 player.equippedWeaponId=id;send(ws,{type:'arsenalState',arsenal:player.arsenal,equippedWeaponId:id});share(room);return;
}
if(msg.type==='redeemWeapon'){
 const id=String(msg.id||'');const index=player.arsenal.findIndex(x=>x.id===id);
 if(index<0){send(ws,{type:'arsenalError',message:'ไม่พบอาวุธในคลัง'});return;}
 const weapon=player.arsenal[index];const reward={7:100,8:500,9:1000}[weapon.level];
 if(!reward){send(ws,{type:'arsenalError',message:'แลกกล่องได้เฉพาะอาวุธ +7, +8, +9'});return;}
 player.arsenal.splice(index,1);if(player.equippedWeaponId===id)player.equippedWeaponId=null;player.obbBoxes+=reward;
 send(ws,{type:'arsenalState',arsenal:player.arsenal,equippedWeaponId:player.equippedWeaponId});
 send(ws,{type:'obbState',boxes:player.obbBoxes,inventory:player.obbInventory});
 say(room,{kind:'success',text:`🎁 ${player.name} แลก ${weapon.item} +${weapon.level} เป็น OBB ${reward.toLocaleString()} กล่อง`});share(room);return;
}
if(msg.type==='sellOBBItems'){
 if(player.obbBusy){send(ws,{type:'obbError',message:'กรุณารอเปิดกล่องให้เสร็จก่อนขาย'});return;}
 const indexes=msg.indices;
 if(!Array.isArray(indexes)||indexes.length<1||indexes.length>5000||!indexes.every(i=>Number.isSafeInteger(i)&&i>=0&&i<player.obbInventory.length)||new Set(indexes).size!==indexes.length){send(ws,{type:'obbError',message:'รายการขายไม่ถูกต้องหรือมีรายการซ้ำ'});return;}
 // Validate on the server. Never accept client-computed prices or item metadata.
 const selected=indexes.map(i=>player.obbInventory[i]);
 if(selected.some(i=>!(i.tier in OBB_SELL_RATE))){send(ws,{type:'obbError',message:'ไอเทมไม่ถูกต้อง'});return;}
 const reward=selected.reduce((sum,i)=>sum+OBB_SELL_RATE[i.tier],0);
 const remove=new Set(indexes);player.obbInventory=player.obbInventory.filter((_,i)=>!remove.has(i));player.obbBoxes+=reward;
 send(ws,{type:'obbSaleResult',boxes:player.obbBoxes,inventory:player.obbInventory,sold:selected.length,reward});
 return;
}
if(msg.type==='obbSync'){send(ws,{type:'obbState',boxes:player.obbBoxes,inventory:player.obbInventory});return;}
if(msg.type==='openOBB'){
 const amount=Number(msg.count===undefined?1:msg.count);
 if(![1,10,100,1000].includes(amount)){send(ws,{type:'obbError',message:'จำนวนกล่องไม่ถูกต้อง'});return;}
 if(player.obbBusy){send(ws,{type:'obbError',message:'กำลังเปิดกล่อง'});return;}
 if(player.obbBoxes<amount){send(ws,{type:'obbError',message:`กล่องไม่พอ ต้องมีอย่างน้อย ${amount.toLocaleString()} กล่อง`});return;}
 player.obbBusy=true;player.obbBoxes-=amount;
 const tally={Legendary:0,Epic:0,Rare:0,Uncommon:0,Common:0};
 const recent=[];let legendary=[];const highlights=[];const rolledItems=[];let last=null;
 for(let n=0;n<amount;n++){
   const outcome=drawOBB(()=>crypto.randomInt(0,1000000)/1000000);
   const item={...outcome.item,tier:outcome.tier};tally[outcome.tier]++;
   player.obbInventory.push(item);rolledItems.push(item);last={tier:outcome.tier,item:outcome.item};
   if(recent.length<10)recent.push(item);
   if(outcome.tier==='Legendary')legendary.push(outcome.item.name);
   if(outcome.tier==='Legendary'||outcome.tier==='Epic')highlights.push(item);
 }
 // Keep 5000 results per session (supports 1,000-box batches).
 if(player.obbInventory.length>5000)player.obbInventory.splice(0,player.obbInventory.length-5000);
 send(ws,{type:'obbResult',boxes:player.obbBoxes,inventory:player.obbInventory,tier:last.tier,item:last.item,count:amount,tally,recent,highlights,rolledItems});
 if(legendary.length){const txt=`🏆 ${player.name} เปิด OBB ${amount} ใบ ได้ Legendary: ${legendary.slice(0,8).join(', ')}${legendary.length>8?' และอีก '+(legendary.length-8)+' ชิ้น':''}!`;say(room,{kind:'success',text:txt});broadcast(room,{type:'announce',text:txt})}
 else say(room,{kind:'new',text:`🎁 ${player.name} เปิด Old Blue Box ${amount} ใบ`});
 player.obbBusy=false;share(room);return;
}
if(msg.type==='startBattle'){if(room.battle&&room.battle.active)return;const scores=new Map();for(const p of room.players.values()){p.level=0;p.broken=false;p.zeny=20000;p.ores=60;p.attempts=0;p.wins=0;scores.set(p.id,{name:p.name,best:0,attempts:0})}room.battle={active:true,endsAt:Date.now()+300000,scores};say(room,{kind:'success',text:'⚔️ Refine Battle เริ่มแล้ว! แข่ง 5 นาที!'});broadcast(room,{type:'announce',text:'⚔️ เริ่มแข่งตีบวก 5 นาที!'});share(room);setTimeout(()=>{if(room.battle&&room.battle.scores===scores){room.battle.active=false;const ranking=[...scores.values()].sort((a,b)=>b.best-a.best||a.attempts-b.attempts);const winner=ranking[0];say(room,{kind:'success',text:`🏆 ผู้ชนะ Refine Battle: ${winner?.name||'ไม่มีผู้เล่น'} +${winner?.best??0}`});broadcast(room,{type:'announce',text:`🏆 ผู้ชนะ Refine Battle: ${winner?.name||'ไม่มีผู้เล่น'} +${winner?.best??0}`});share(room)}},300000);return}if(msg.type==='select'&&ITEMS.includes(msg.item)){if(player.refining)return;player.item=msg.item;player.level=0;player.broken=false;share(room)}if(msg.type==='refine'){if(player.refining){send(ws,{type:'error',message:'กำลังตีบวกอยู่'});return}if(room.battle&&room.battle.active&&Date.now()>=room.battle.endsAt){send(ws,{type:'error',message:'การแข่งขันสิ้นสุดแล้ว'});return}if(player.broken||player.level>=10){send(ws,{type:'error',message:'รับอาวุธใหม่ก่อน'});return}const cost=500;if(player.zeny<cost||player.ores<1){send(ws,{type:'error',message:'Zeny หรือ Oridecon ไม่เพียงพอ'});return}const from=player.level,rate=RATES[from],success=crypto.randomInt(10000)<rate*100;player.refining=true;player.zeny-=cost;player.ores--;player.attempts++;if(player.attempts%5===0){player.obbBoxes++;send(ws,{type:'obbState',boxes:player.obbBoxes,inventory:player.obbInventory})}send(ws,{type:'pending',from,rate,item:player.item});share(room);setTimeout(()=>{player.refining=false;if(success){player.level++;if(player.level===10)player.wins++;if(player.level>=9)broadcast(room,{type:'announce',text:`✨ ${player.name} ตี ${player.item} +${player.level} สำเร็จ!`});if(recordSuccess(player))say(room,{kind:'success',text:`🏆 NEW RECORD! ${player.item} +${player.level} โดย ${player.name}`})}else{player.broken=true;player.brokenCount=(player.brokenCount||0)+1}if(room.battle&&room.battle.active){const score=room.battle.scores.get(player.id);if(score){score.best=Math.max(score.best,player.level);score.attempts++}}const line=success?`✨ ${player.name}: ${player.item} +${from} → +${player.level} สำเร็จ (${rate}%)`:`💥 ${player.name}: ${player.item} +${from} → +${from+1} ล้มเหลว ไอเทมแตก! (${rate}%)`;say(room,{kind:success?'success':'failure',text:line});send(ws,{type:'result',success,from,rate,item:player.item});share(room);queueSave(player)},REFINE_DELAY)}if(msg.type==='newItem'){if(player.refining){send(ws,{type:'error',message:'กำลังตีบวกอยู่'});return}if(!player.broken&&player.level!==10){send(ws,{type:'error',message:'ไอเทมปัจจุบันยังใช้งานได้'});return}player.level=0;player.broken=false;say(room,{kind:'new',text:`${player.name} ได้รับ ${player.item} +0 ใหม่`});share(room)}if(msg.type==='chat'){const text=String(msg.text||'').trim().slice(0,160).replace(/[<>]/g,'');if(text){say(room,{kind:'chat',text:`${player.name}: ${text}`});share(room)}}}finally{await queueSave(player)}};ws.on('close',()=>{if(player)if(player&&room){room.players.delete(player.id);say(room,{kind:'leave',text:`${player.name} ออกจากห้อง`});share(room);if(room.players.size===0)rooms.delete(room.id)}})});
loadHall().finally(()=>server.listen(PORT,()=>console.log('Sukhambriya RO http://localhost:'+PORT+' | Persistent records: '+hasDB)));
