(()=>{
'use strict';
const rewards={7:100,8:500,9:1000};
const key='sukhambriya:arsenal:v1';
let arsenal=[];let equippedId=null;const equippedKey='sukhambriya:equipped:v1';
function isOnline(){return !!(typeof online!=='undefined'&&online&&socket?.readyState===1)}
function load(){try{const a=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(a))arsenal=a.map(w=>{if(w&&typeof w.item==='string'){const oldNames={'Gungnir':'Infiltrator','Infiltrador':'Infiltrator','Assasin Dagger':'Assassin Dagger'};w.item=oldNames[w.item]||w.item}return w}).filter(w=>w&&ITEMS.includes(w.item)&&Number.isInteger(w.level)&&w.level>=1&&w.level<=10&&typeof w.id==='string').slice(0,100)}catch{}}
function save(){try{localStorage.setItem(key,JSON.stringify(arsenal))}catch{}}
try{equippedId=localStorage.getItem(equippedKey)||null}catch{}
function held(){return isOnline()?(Array.isArray(player.arsenal)?player.arsenal:[]):arsenal}
function selected(){return held().find(w=>w.id===(isOnline()?player.equippedWeaponId:equippedId))||null}
window.WEAPON_COMBAT={equipped:selected,list:held,multipliers:[.75,.8,.86,.93,1,1.10,1.25,1.45,1.75,2.10,2.60]};
function render(){
  const stock=held();
  const saveBtn=document.getElementById('arsenalSave');const list=document.getElementById('arsenalList');
  saveBtn.disabled=pending||player.broken||player.level<1||player.level>10||stock.length>=100;
  saveBtn.textContent=player.level>=1&&!player.broken?`📦 เก็บ ${player.item} +${player.level} แล้วรับ +0 ชิ้นใหม่`:'📦 เก็บอาวุธ (+1 ขึ้นไป)';
  list.replaceChildren();
  if(!stock.length){list.textContent='ยังไม่มีอาวุธในคลัง';renderEquipSelect();return}
  stock.slice().reverse().forEach(w=>{
    const row=document.createElement('div');row.className='arsenalRow';
    const name=document.createElement('div');name.className='arsenalName';name.textContent=`⚔️ ${w.item} +${w.level}`;
    const sub=document.createElement('small');sub.textContent=w.level===10?'เก็บสะสม (+10 ยังไม่เปิดให้แลก)':rewards[w.level]?'แลกได้ '+rewards[w.level].toLocaleString()+' OBB':'เก็บไว้ใช้โจมตี';name.append(sub);row.append(name);
    const equip=document.createElement('button');equip.type='button';equip.textContent=selected()?.id===w.id?'✅ กำลังสวมใส่':'⚔ สวมใส่';equip.disabled=selected()?.id===w.id;equip.addEventListener('click',()=>equipWeapon(w.id));row.append(equip);
    if(rewards[w.level]){const b=document.createElement('button');b.type='button';b.textContent='🎁 แลก '+rewards[w.level].toLocaleString()+' กล่อง';b.addEventListener('click',()=>{
      if(!confirm(`แลก ${w.item} +${w.level} เป็น OBB ${rewards[w.level].toLocaleString()} กล่อง?\nอาวุธชิ้นนี้จะถูกใช้และหายจากคลังถาวร`))return;
      if(isOnline())socket.send(JSON.stringify({type:'redeemWeapon',id:w.id}));
      else{const idx=arsenal.findIndex(x=>x.id===w.id);if(idx<0)return;arsenal.splice(idx,1);if(equippedId===w.id){equippedId=null;localStorage.removeItem(equippedKey)}save();window.OBB_UI?.addBoxes(rewards[w.level]);events.push({kind:'success',text:`🎁 แลก ${w.item} +${w.level} เป็น OBB ${rewards[w.level]} กล่องแล้ว`});draw();}
    });row.append(b)}list.append(row)
  });
  renderEquipSelect();
}
function renderEquipSelect(){const select=document.getElementById('huntEquipped');if(!select)return;const stock=held(),cur=selected();select.replaceChildren(new Option('ยังไม่สวมใส่ (ดาเมจพื้นฐาน)',''));stock.forEach(w=>select.add(new Option(`${w.item} +${w.level}`,w.id)));select.value=cur?.id||'';const badge=document.getElementById('huntWeaponBonus');if(badge)badge.textContent=cur?`ตัวคูณ +${cur.level}: ×${window.WEAPON_COMBAT.multipliers[cur.level].toFixed(2)}`:'โจมตีพื้นฐาน';}
function equipWeapon(id){if(isOnline())socket.send(JSON.stringify({type:'equipWeapon',id:id||null}));else{equippedId=id||null;try{if(equippedId)localStorage.setItem(equippedKey,equippedId);else localStorage.removeItem(equippedKey)}catch{}render();}}
document.getElementById('huntEquipped')?.addEventListener('change',e=>equipWeapon(e.target.value));
window.showRefineDecision=()=>{if(pending||player.broken||player.level<1)return;const pop=document.getElementById('refineChoice');document.getElementById('refineChoiceLabel').textContent=`${player.item} +${player.level} — ต้องการตีต่อหรือเก็บเข้าคลัง?`;pop.hidden=false};
const dismiss=()=>document.getElementById('refineChoice').hidden=true;
document.getElementById('choiceContinue').addEventListener('click',dismiss);
document.getElementById('choiceStore').addEventListener('click',()=>{dismiss();document.getElementById('arsenalSave').click()});
load();
const oldDraw=draw;draw=function(){oldDraw();render()};
const oldLocalAction=localAction;
localAction=function(d){
  if(d.type==='storeWeapon'){
    if(pending||player.broken||player.level<1||player.level>10||arsenal.length>=100)return;
    const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());
    const weapon={id,item:player.item,level:player.level,createdAt:new Date().toISOString()};
    arsenal.push(weapon);save();player.level=0;player.broken=false;infoMsg='เก็บ '+weapon.item+' +'+weapon.level+' แล้ว รับชิ้นใหม่ +0';
    events.push({kind:'success',text:`📦 เก็บ ${weapon.item} +${weapon.level} เข้าคลังแล้ว`});draw();return;
  }
  oldLocalAction(d);
};
document.getElementById('arsenalSave').addEventListener('click',()=>{if(!pending)send({type:'storeWeapon'})});
// Online messages: post-process state and arsenal confirmations; server is the authority.
const connectOriginal=connect;
function attach(ws){if(!ws||ws.__arsenalAttached)return;ws.__arsenalAttached=true;ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='arsenalState'){player.arsenal=m.arsenal||[];player.equippedWeaponId=m.equippedWeaponId??null;render()}if(m.type==='arsenalError'){alert(m.message||'คลังอาวุธมีปัญหา')}})}
connect=function(){connectOriginal();attach(socket)};
attach(socket);
render();
})();
