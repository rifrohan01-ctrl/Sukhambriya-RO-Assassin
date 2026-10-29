(()=>{'use strict';
const $=id=>document.getElementById(id),ids=[1038,1039,1046,1052,1059,1086,1087,1112,1115,1147,1150,1157,1159,1190,1251,1272,1312,1389,1511,1583,1630,1685,1688,1768,1785];
const names={1052:'Rocker',1113:'Drops'};
const field=$('huntField'),mode=$('huntMode');if(!field||!mode)return;
let monsters=[],kills=0,boxes=0,running=false,moveTimer=0,nextId=1,waiting=new Set();const targetCount=6;
let hero=null,heroImg=null,heroX=48,heroY=73,heroTarget=null,heroTimer=0,heroHits=0,heroLastSwing=0,heroAnimation='',swingStart=0,swingImpacted=false,heroAttackDirection='AttackRight',heroWalkDirection='Walk';
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const log=msg=>{const d=document.createElement('div');d.textContent=msg;$('huntLog').prepend(d);while($('huntLog').children.length>45)$('huntLog').lastChild.remove()};
const hud=() =>{$('huntAlive').textContent=monsters.length;$('huntKills').textContent=kills;$('huntBoxes').textContent=boxes};
const online=()=>location.protocol.startsWith('http')&&typeof socket!=='undefined'&&socket?.readyState===1&&typeof window.OBB_UI!=='undefined';
function show(){mode.classList.add('visible');$('modeHunt').classList.add('active');$('modeObb').classList.remove('active');$('modeRefine').classList.remove('active');$('obbMode').classList.remove('visible');$('stage').style.display='none';document.querySelector('.mobileHint')?.classList.add('hidden');running=true;ensureHero();if(!monsters.length)for(let i=0;i<targetCount;i++)spawn();clearInterval(moveTimer);moveTimer=setInterval(wander,1800);cancelAnimationFrame(heroTimer);heroTimer=requestAnimationFrame(heroLoop);hud()}
function leave(){mode.classList.remove('visible');$('modeHunt').classList.remove('active');$('stage').style.display='';running=false;heroTarget=null;swingStart=0;hero?.classList.remove('swinging');setHeroAnimation('Idle');cancelAnimationFrame(heroTimer);clearInterval(moveTimer);$('modeRefine').classList.add('active');document.querySelector('.mobileHint')?.classList.remove('hidden')}
$('modeHunt').addEventListener('click',show);
for(const b of ['modeRefine','modeObb'])$(b).addEventListener('click',()=>{if(mode.classList.contains('visible')){mode.classList.remove('visible');$('modeHunt').classList.remove('active');$('stage').style.display='';running=false;heroTarget=null;swingStart=0;hero?.classList.remove('swinging');setHeroAnimation('Idle');cancelAnimationFrame(heroTimer);clearInterval(moveTimer)}});
function place(m){m.node.style.left=m.x+'%';m.node.style.top=m.y+'%'}
function spawn(){if(monsters.length>=targetCount)return;const available=ids.filter(id=>!monsters.some(m=>m.id===id));if(!available.length)return;const id=available[rand(0,available.length-1)];const m={uid:nextId++,id,name:names[id]||'Monster ' + id,maxHp:50000,hp:0,x:rand(30,77),y:rand(48,88),lastHit:0};m.hp=m.maxHp;
const e=document.createElement('div');e.className='huntMonster';e.tabIndex=0;e.setAttribute('role','button');e.setAttribute('aria-label','โจมตี '+m.name);e.innerHTML='<img alt=""><div class="huntHp"><i></i></div><div class="huntName"></div>';e.querySelector('img').src='assets/monster/'+id+'.gif';e.querySelector('img').alt=m.name;e.querySelector('.huntName').textContent=m.name;e.addEventListener('click',()=>selectTarget(m));e.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectTarget(m)}});m.node=e;place(m);field.append(e);monsters.push(m);hud()}
function wander(){if(!running)return;for(const m of monsters){if(m===heroTarget)continue;if(Math.random()<.78){m.x=Math.max(29,Math.min(79,m.x+rand(-5,5)));m.y=Math.max(46,Math.min(90,m.y+rand(-4,4)));place(m)}}}

// Assassin sprite-based navigation and damage synchronized to the attack frames.
const HERO_DIR='assets/assassin/';
function ensureHero(){
 if(hero)return;
 hero=document.createElement('div');hero.className='huntHero';hero.setAttribute('aria-label','Assassin');
 heroImg=document.createElement('img');heroImg.alt='Assassin';hero.append(heroImg);const slash=document.createElement('div');slash.className='assassinSlash';slash.setAttribute('aria-hidden','true');hero.append(slash);field.append(hero);
 setHeroAnimation('Idle');positionHero();
}
function setHeroAnimation(action,force=false){
 const key=action==='Attack'?heroAttackDirection:(action==='Walk'?heroWalkDirection:action);
 if(!heroImg||(!force&&heroAnimation===action&&heroImg.dataset.spriteKey===key))return;
 heroAnimation=action;heroImg.dataset.spriteKey=key;
 heroImg.src=HERO_DIR+key+'.png'+(force?'?s='+Math.floor(performance.now()):'');
 hero.classList.toggle('attacking',action==='Attack');
}
function updateFacing(dx,dy){
 // Available source animations: front idle/walk and four attack directions.
 // Never mirror attack APNGs: each direction has its own true frames.
 heroAttackDirection=dy < -2.5 ? (dx<0?'AttackBackLeft':'AttackBackRight') : (dx<0?'AttackLeft':'AttackRight');
 heroWalkDirection=Math.abs(dx)>2.0?(dx<0?'WalkLeft':'WalkRight'):'Walk';
 hero.classList.toggle('facingLeft',dx<0);
}
function positionHero(){if(!hero)return;hero.style.left=heroX+'%';hero.style.top=heroY+'%';hero.style.zIndex=String(8+Math.floor(heroY/10))}
function selectTarget(mon){
 if(!running||!monsters.includes(mon))return;
 ensureHero();heroTarget=mon;heroHits=0;heroLastSwing=0;swingStart=0;swingImpacted=false;hero.classList.remove('swinging');
 updateFacing(mon.x-heroX,mon.y-heroY);setHeroAnimation('Walk');log('⚔ Assassin กำลังเข้าหา '+mon.name);
}
let lastHeroFrame=0;
function heroLoop(time){
 if(!running)return;
 const dt=lastHeroFrame?Math.min(48,time-lastHeroFrame):16;lastHeroFrame=time;
 const mon=heroTarget;
 if(mon && monsters.includes(mon)){
  const dx=mon.x-heroX,dy=mon.y-heroY;
  const distance=Math.hypot(dx,dy*1.55);
  if(distance>7.4){
   swingStart=0;hero.classList.remove('swinging');
   const step=Math.min(distance,dt*.014);
   heroX=Math.max(29,Math.min(79,heroX+dx/distance*step));
   heroY=Math.max(46,Math.min(90,heroY+dy/distance*step));
   updateFacing(dx,dy);setHeroAnimation('Walk');
  }else{
   // Attack is a complete 900ms action. Impact occurs on the visible slash, not at click.
   if(!swingStart || time-swingStart>=900){
     swingStart=time;swingImpacted=false;
     updateFacing(dx,dy);setHeroAnimation('Attack',true);
     hero.classList.remove('swinging');
   }
   if(!swingImpacted && time-swingStart>=450){
     swingImpacted=true;attack(mon);
     if(!monsters.includes(mon)){
       heroTarget=null;swingStart=0;hero.classList.remove('swinging');setHeroAnimation('Idle');
     }
   }
  }
  // Keep facing direction stable while attacking; only change during travel.
  if(distance>7.4)hero.classList.toggle('facingLeft',dx<0);
 }else{heroTarget=null;swingStart=0;hero?.classList.remove('swinging');setHeroAnimation('Idle')}
 positionHero();heroTimer=requestAnimationFrame(heroLoop);
}
function float(m,text,critical=false){const d=document.createElement('div');d.className='huntDamage'+(critical?' critical':'');d.textContent=text;d.style.left=m.x+'%';d.style.top=m.y+'%';field.append(d);setTimeout(()=>d.remove(),900)}
function showDrop(m,count){const d=document.createElement('div');d.className='huntLoot';d.style.left=m.x+'%';d.style.top=m.y+'%';const img=document.createElement('img');img.src='assets/obb-drop-small.png';img.alt='Old Blue Box';const label=document.createElement('span');label.textContent='OBB +'+count;d.append(img,label);field.append(d);setTimeout(()=>d.remove(),2300)}

let hitAudioContext=null;
function playHuntThud(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const ctx=hitAudioContext||(hitAudioContext=new AC());
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    const now=ctx.currentTime, duration=.105;
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
    const pcm=buffer.getChannelData(0);
    for(let i=0;i<pcm.length;i++){
      const t=i/ctx.sampleRate,env=Math.exp(-t*34);
      const punch=Math.sin(2*Math.PI*(135*t-520*t*t));
      pcm[i]=(punch*.74+(Math.random()*2-1)*.21)*env;
    }
    const src=ctx.createBufferSource();src.buffer=buffer;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;
    const gain=ctx.createGain();gain.gain.setValueAtTime(.29,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start(now);src.stop(now+duration);
  }catch(err){/* Sound is optional; attacks must still work. */}
}

function attack(m){if(!running||!monsters.includes(m))return;const now=Date.now();if(now-m.lastHit<180)return;m.lastHit=now;playHuntThud();const equippedNow=window.WEAPON_COMBAT?.equipped();const critical=Math.random() < (.18+(equippedNow?.item==='Infiltrator'?.12:0));const base=critical?rand(4000,5000):rand(2000,2700);
const equipped=window.WEAPON_COMBAT?.equipped();const lvl=Math.max(0,Math.min(10,equipped?.level??4));
const multi=equipped?window.WEAPON_COMBAT.multipliers[lvl]:1;
const kind=equipped?.item;const bonus=kind==='Assassin Dagger'?.9:1;
const damage=Math.round(base*multi*bonus*(kind==='Combat knife'&&m.boss?1.20:1));
const second=kind==='Assassin Dagger'&&Math.random()<.25?Math.round(damage*.5):0;m.hp=Math.max(0,m.hp-damage-second);if(second)float(m,String(second),critical);m.node.querySelector('i').style.width=100*m.hp/m.maxHp+'%';m.node.classList.add('hit');setTimeout(()=>m.node.classList.remove('hit'),160);float(m,String(damage),critical);if(m.hp>0)return;
monsters=monsters.filter(x=>x!==m);m.node.classList.add('dead');setTimeout(()=>m.node.remove(),500);kills++;hud();log('⚔ กำจัด '+m.name+' สำเร็จ');const count=rand(10,50);if(!online()){boxes+=count;showDrop(m,count);log('🎁 ได้รับ Old Blue Box '+count+' กล่อง');hud()}else{showDrop(m,count);log('🎁 กำลังยืนยันรางวัล OBB กับเซิร์ฟเวอร์...')}
// Server authority handles online OBB; the local wallet handles file:// mode.
if(online()){try{socket.send(JSON.stringify({type:'huntReward',count}))}catch{log('⚠ เชื่อมเซิร์ฟเวอร์ไม่สำเร็จ')}}else if(window.OBB_UI){window.OBB_UI.addBoxes(count)}
setTimeout(()=>{if(running)spawn()},3000)}
window.HUNT_REWARD_RECEIVED=msg=>{if(msg?.type==='huntRewardDenied')log('⚠ '+(msg.message||'ไม่สามารถรับกล่องได้'));if(msg?.type==='huntRewardResult'){const awarded=Number(msg.count)||0;boxes+=awarded;hud();log('🎁 เซิร์ฟเวอร์ยืนยันรับ Old Blue Box '+awarded+' กล่อง')}};
log('🌿 สนามล่าพร้อมแล้ว — คลิกมอนสเตอร์เพื่อโจมตี');})();