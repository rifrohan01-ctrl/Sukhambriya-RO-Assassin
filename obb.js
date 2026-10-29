/* Classic-inspired OBB — local game state + server-authoritative rolls when online. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const cfg=window.OBB_DATA;
const TIER_LABELS={Legendary:'หายากพิเศษ ★',Epic:'หายากมาก',Rare:'หายาก',Uncommon:'ทั่วไป',Common:'เจอบ่อย'};const tierLabel=t=>TIER_LABELS[t]||t;
const colors={Legendary:'#d8a22b',Epic:'#c458a8',Rare:'#577fda',Uncommon:'#61a347',Common:'#83909e'};
const state={remaining:1000,inventory:[],last:null,opening:false,selectedMode:'refine',online:false,requesting:false,startedAt:0,batchCount:1,bulkReport:null,rareExpanded:false,rareCache:[],rewardShownCount:60};
const STORAGE='sukhambriya:obb:firero691:v1';
const SELL_RATE=Object.freeze({Common:0,Uncommon:1,Rare:2,Epic:5,Legendary:20});
const invUI={open:false,tier:'All',search:'',page:0,selected:new Set(),busy:false};
const PAGE_SIZE=100;
const tierOrder={Legendary:0,Epic:1,Rare:2,Uncommon:3,Common:4};
function normalizeHighlightItem(item){if(!item)return null;return {key:item.key||item.name,name:item.name||'',nameTh:item.nameTh||'',icon:item.icon||'🎁',itemId:item.itemId,imageUrl:item.imageUrl,tier:item.tier||'Epic'};}
function collectAllRewards(items){
  return (items||[]).map(normalizeHighlightItem).filter(Boolean)
    .sort((a,b)=>(tierOrder[a.tier]??99)-(tierOrder[b.tier]??99)||String(a.name).localeCompare(String(b.name)));
}
function hideRareRewards(){
  const overlay=el('rareOverlay');if(!overlay)return;
  overlay.classList.remove('visible');overlay.setAttribute('aria-hidden','true');
  state.rareExpanded=false;state.rareCache=[];state.rewardShownCount=60;
}
function renderRareGrid(list){
  const grid=el('rareGrid');if(!grid)return;
  grid.replaceChildren();
  const count=list.length;grid.className='rareGrid count'+Math.min(count,8);
  if(count===2)grid.style.setProperty('--rareCols',2);
  else if(count===3)grid.style.setProperty('--rareCols',3);
  else grid.style.removeProperty('--rareCols');
  const big=count<=3&&state.rareCache.length<=3;
  for(const item of list){
    const card=document.createElement('div');
    card.className='rareItem '+(item.tier==='Legendary'?'legendary':item.tier==='Epic'?'epic':'standard')+(big?' big':'');
    card.style.setProperty('--rarity-color',colors[item.tier]||'#8b9aab');
    const iconWrap=document.createElement('div');iconWrap.className='rareIconWrap';
    const icon=document.createElement('div');icon.className='rareIcon';
    icon.append(window.obbMakeIcon(item));iconWrap.append(icon);
    const badge=document.createElement('div');badge.className='rareBadge';badge.textContent=tierLabel(item.tier);
    const name=document.createElement('div');name.className='rareName';name.textContent=item.name;
    const th=document.createElement('div');th.className='rareNameTh';th.textContent=item.nameTh||'';
    card.append(iconWrap,badge,name,th);grid.append(card);
  }
}
function renderAllRewards(){
  const all=state.rareCache;
  const shown=Math.min(state.rewardShownCount,all.length);
  renderRareGrid(all.slice(0,shown));
  const tally={Legendary:0,Epic:0,Rare:0,Uncommon:0,Common:0};
  all.forEach(item=>{if(item.tier in tally)tally[item.tier]++});
  el('rarePanelTitle').textContent='รายการไอเทมที่ได้รับทั้งหมด';
  el('rarePanelSubtitle').textContent=`เปิด ${state.batchCount.toLocaleString()} กล่อง · เรียงตามความหายากมากที่สุดก่อน`;
  el('rareMeta').textContent=`แสดง ${shown.toLocaleString()} / ${all.length.toLocaleString()} ชิ้น · หายากพิเศษ ★ ${tally.Legendary} · หายากมาก ${tally.Epic} · หายาก ${tally.Rare} · ทั่วไป ${tally.Uncommon} · เจอบ่อย ${tally.Common}`;
  const toggle=el('rareToggle');
  toggle.hidden=shown>=all.length;
  toggle.textContent=`ดูรายการถัดไป (${(all.length-shown).toLocaleString()} ชิ้นที่เหลือ)`;
}
function showRareRewards(items,count){
  const overlay=el('rareOverlay');if(!overlay)return;
  state.rareCache=collectAllRewards(items);
  if(!state.rareCache.length){hideRareRewards();return;}
  state.batchCount=count;
  state.rewardShownCount=60;
  renderAllRewards();
  overlay.classList.add('visible');overlay.setAttribute('aria-hidden','false');
}
function updateRareToggle(){
  state.rewardShownCount+=60;
  renderAllRewards();
}
function inventoryFiltered(){const q=invUI.search.trim().toLocaleLowerCase();return state.inventory.map((item,index)=>({item,index})).filter(x=>(invUI.tier==='All'||x.item.tier===invUI.tier)&&(!q||(x.item.name+' '+(x.item.nameTh||'')).toLocaleLowerCase().includes(q))).reverse();}
function sellReward(indices){return indices.reduce((n,i)=>n+(SELL_RATE[state.inventory[i]?.tier]||0),0);}
function inventoryNotice(message){el('inventoryNotice').textContent=message;}
function inventoryOpen(){invUI.open=true;el('inventoryOverlay').classList.add('visible');el('inventoryOverlay').setAttribute('aria-hidden','false');inventoryDraw();}
function inventoryClose(){invUI.open=false;el('inventoryOverlay').classList.remove('visible');el('inventoryOverlay').setAttribute('aria-hidden','true');invUI.selected.clear();}
function inventoryDraw(){if(!invUI.open)return;for(const i of [...invUI.selected])if(!state.inventory[i])invUI.selected.delete(i);const data=inventoryFiltered();const pages=Math.max(1,Math.ceil(data.length/PAGE_SIZE));invUI.page=Math.min(invUI.page,pages-1);const rows=data.slice(invUI.page*PAGE_SIZE,(invUI.page+1)*PAGE_SIZE);const host=el('inventoryList');host.replaceChildren();if(!data.length){host.textContent='ไม่พบไอเทมที่ค้นหา';}for(const {item,index} of rows){const row=document.createElement('div');row.className='inventoryRow';const cb=document.createElement('input');cb.type='checkbox';cb.checked=invUI.selected.has(index);cb.disabled=invUI.busy;cb.addEventListener('change',()=>{if(cb.checked)invUI.selected.add(index);else invUI.selected.delete(index);inventoryTotals();});const icon=document.createElement('span');icon.className='inventoryIcon';icon.append(window.obbMakeIcon(item));const name=document.createElement('div');name.className='inventoryName';name.textContent=item.name;const desc=document.createElement('small');desc.textContent=(item.nameTh||'')+' · ขายคืน '+SELL_RATE[item.tier]+' OBB';name.append(desc);const tier=document.createElement('span');tier.className='inventoryTier';tier.textContent=tierLabel(item.tier);const button=document.createElement('button');button.type='button';button.textContent='ขาย';button.disabled=invUI.busy;button.addEventListener('click',()=>inventorySell([index]));row.append(cb,icon,name,tier,button);host.append(row);}el('inventoryPageLabel').textContent='หน้า '+(invUI.page+1)+' / '+pages;el('inventoryPrev').disabled=invUI.page===0;el('inventoryNext').disabled=invUI.page>=pages-1;el('inventorySummary').textContent='ทั้งหมด '+state.inventory.length.toLocaleString()+' ชิ้น · พบ '+data.length.toLocaleString()+' ชิ้น';inventoryTotals();}
function inventoryTotals(){const chosen=[...invUI.selected].filter(i=>i>=0&&i<state.inventory.length);el('inventorySelection').textContent='เลือก '+chosen.length.toLocaleString()+' ชิ้น · ได้คืน '+sellReward(chosen).toLocaleString()+' OBB';el('inventorySellSelected').disabled=invUI.busy||chosen.length===0;el('inventorySellCommon').disabled=invUI.busy||!state.inventory.some(i=>i.tier==='Common');el('inventorySellLow').disabled=invUI.busy||!state.inventory.some(i=>i.tier==='Common'||i.tier==='Uncommon');}
function inventorySell(indices){if(invUI.busy||state.opening)return;if(!indices.length){inventoryNotice('ไม่มีไอเทมสำหรับขาย');return;}const unique=[...new Set(indices)].sort((a,b)=>a-b);if(unique.some(i=>i<0||i>=state.inventory.length))return;const special=unique.some(i=>['Epic','Legendary'].includes(state.inventory[i].tier));const reward=sellReward(unique);const confirmation=`ยืนยันขาย ${unique.length.toLocaleString()} ชิ้น ได้รับ ${reward.toLocaleString()} Old Blue Box?`+(special?'\n⚠️ มีไอเทมหายากมาก/หายากพิเศษ ★ อยู่ในรายการนี้!':'')+(reward===0?'\nรายการนี้ขายได้ 0 กล่อง':'');if(!confirm(confirmation))return;invUI.busy=true;inventoryNotice('กำลังดำเนินการขาย...');inventoryTotals();if(serverAvailable()){socket.send(JSON.stringify({type:'sellOBBItems',indices:unique}));setTimeout(()=>{if(invUI.busy){invUI.busy=false;inventoryNotice('ยังไม่ได้รับคำตอบจากเซิร์ฟเวอร์ กรุณาตรวจสอบก่อนลองใหม่');inventoryDraw()}},7000);}else{const selected=new Set(unique);state.inventory=state.inventory.filter((_,i)=>!selected.has(i));state.remaining+=reward;save();invUI.selected.clear();invUI.busy=false;inventoryNotice(`ขายสำเร็จ ${unique.length.toLocaleString()} ชิ้น รับ ${reward.toLocaleString()} OBB`);render();}}
function inventoryInit(){el('openInventory').onclick=inventoryOpen;el('inventoryClose').onclick=inventoryClose;el('inventoryOverlay').addEventListener('click',e=>{if(e.target===el('inventoryOverlay'))inventoryClose()});el('inventorySearch').oninput=e=>{invUI.search=e.target.value;invUI.page=0;inventoryDraw()};el('inventoryTier').onchange=e=>{invUI.tier=e.target.value;invUI.page=0;inventoryDraw()};el('inventorySelectFiltered').onclick=()=>{for(const v of inventoryFiltered())invUI.selected.add(v.index);inventoryDraw()};el('inventoryClear').onclick=()=>{invUI.selected.clear();inventoryDraw()};el('inventoryPrev').onclick=()=>{invUI.page--;inventoryDraw();el('inventoryList').scrollTop=0};el('inventoryNext').onclick=()=>{invUI.page++;inventoryDraw();el('inventoryList').scrollTop=0};el('inventorySellSelected').onclick=()=>inventorySell([...invUI.selected]);el('inventorySellCommon').onclick=()=>inventorySell(state.inventory.flatMap((x,i)=>x.tier==='Common'?[i]:[]));el('inventorySellLow').onclick=()=>inventorySell(state.inventory.flatMap((x,i)=>['Common','Uncommon'].includes(x.tier)?[i]:[]));window.addEventListener('keydown',e=>{if(e.key==='Escape'&&invUI.open)inventoryClose()});}
function load(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(Number.isInteger(v.remaining)&&v.remaining>=0&&v.remaining<=10000)state.remaining=v.remaining;if(Array.isArray(v.inventory))state.inventory=v.inventory.slice(-5000).filter(x=>x&&typeof x.name==='string'&&cfg.items[x.tier]?.some(y=>y.key===x.key));}catch{}}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({remaining:state.remaining,inventory:state.inventory}))}catch{}}
function serverAvailable(){return !!(window.location.protocol.startsWith('http')&&typeof socket!=='undefined'&&socket&&socket.readyState===1&&typeof online!=='undefined'&&online)}
function flip(mode){state.selectedMode=mode;const o=mode==='obb';el('obbMode').classList.toggle('visible',o);el('modeObb').classList.toggle('active',o);el('modeRefine').classList.toggle('active',!o);el('stage').classList.toggle('obb-active',o);document.querySelector('.mobileHint')?.classList.toggle('hidden',o);if(o)render()}
function pick(){let r=(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296)*100;let tier='Common';for(const [t,rate] of Object.entries(cfg.rates)){r-=rate;if(r<0){tier=t;break}}const list=cfg.items[tier];const sum=list.reduce((n,i)=>n+i.weight,0);let z=(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296)*sum;let item=list.at(-1);for(const q of list){z-=q.weight;if(z<0){item=q;break}}return {tier,item}}
function announceReward(reward){if(reward.tier==='Legendary'){if(typeof events!=='undefined'){events.push({kind:'success',text:`🏆 ${player.name} เปิด OBB ได้ ${reward.item.name} (${tierLabel(reward.tier)})!`});draw()}}}
function makeParticles(tier){const p=el('obbParticles');p.replaceChildren();for(let i=0;i<30;i++){const s=document.createElement('span');s.className='obbParticle';s.style.setProperty('--fx',colors[tier]);s.style.setProperty('--tx',`${(Math.random()-.5)*260}px`);s.style.setProperty('--ty',`${(Math.random()-.5)*260}px`);s.style.left=`${35+Math.random()*30}%`;s.style.top=`${25+Math.random()*30}%`;p.appendChild(s)}setTimeout(()=>p.replaceChildren(),1000)}
function render(){el('obbRemaining').textContent=state.remaining;el('obbInvCount').textContent=state.inventory.length;const inv=el('obbInventory');inv.innerHTML='';for(const item of state.inventory.slice().reverse().slice(0,80)){const r=document.createElement('div');r.className='obbInvRow';const a=document.createElement('div');const i=document.createElement('span');i.className='obbInvIcon';i.append(window.obbMakeIcon(item));a.append(i,document.createTextNode(item.name));const b=document.createElement('b');b.textContent=tierLabel(item.tier);b.style.color=colors[item.tier];r.append(a,b);inv.append(r)}if(!inv.children.length)inv.textContent='ยังไม่มีไอเทม';inventoryDraw();const btn=el('obbOpen');btn.disabled=state.opening||state.remaining<1||cfg.itemCount!==691;btn.classList.toggle('loading',state.opening);const label=el('obbButtonLabel');if(label)label.textContent=state.opening?'กำลังเปิด...':state.remaining?'เปิด Old Blue Box':'กล่องหมดแล้ว';document.querySelectorAll('[data-obb-count]').forEach(b=>{const n=Number(b.dataset.obbCount);b.disabled=state.opening||state.remaining<n||cfg.itemCount!==691;});}
function closeOBBReward(){
  if(state.opening||state.requesting)return;
  hideRareRewards();
  const stage=el('obbStage');
  stage.classList.remove('reward-shown','opening');
  const visual=el('obbVisual');
  visual.className='obbMystery';
  visual.replaceChildren();
  el('obbStageText').textContent='พร้อมเปิดกล่อง!';
  el('obbProgressFill').style.width='0%';
  el('obbStatus').textContent='เลือกรอบถัดไปเพื่อเปิด Old Blue Box';
  el('obbBulkReport').textContent='';
  // Inventory and box balance remain untouched.
  state.last=null;
  state.bulkReport=null;
  state.batchCount=1;
  render();
}
function showReward(reward){state.opening=false;state.requesting=false;state.last=reward;el('obbStage').classList.remove('opening');el('obbStage').classList.add('reward-shown');el('obbStageText').textContent='ได้รับไอเทม!';el('obbVisual').className='';el('obbVisual').innerHTML='';const card=document.createElement('div');card.className='obbResult';card.style.setProperty('--tierColor',colors[reward.tier]);const ico=document.createElement('div');ico.className='rewardIcon';ico.append(window.obbMakeIcon(reward.item));const name=document.createElement('div');name.className='rewardName';name.textContent=reward.item.name;const th=document.createElement('div');th.style.cssText='color:#fff;opacity:.95;font-weight:700;text-align:center;margin-top:2px';th.textContent=reward.item.nameTh;const tier=document.createElement('span');tier.className='rewardTier';tier.textContent=tierLabel(reward.tier);card.append(ico,name,th,tier);el('obbVisual').append(card);el('obbStatus').textContent=`ได้รับ ${reward.item.name} — ${tierLabel(reward.tier)}!`;makeParticles(reward.tier);const report=el('obbBulkReport');if(report){const r=state.bulkReport;report.textContent=r?`เปิด ${state.batchCount.toLocaleString()} กล่อง | หายากพิเศษ ★ ${r.tally.Legendary} · หายากมาก ${r.tally.Epic} · หายาก ${r.tally.Rare} · ทั่วไป ${r.tally.Uncommon} · เจอบ่อย ${r.tally.Common}`:'';}const results=state.bulkReport?.items?.length?state.bulkReport.items:[{...reward.item,tier:reward.tier}];showRareRewards(results,state.batchCount||1);render()}
function openingAnimation(){state.opening=true;state.startedAt=Date.now();el('obbStage').classList.remove('reward-shown');el('obbStage').classList.add('opening');el('obbVisual').className='obbMystery';el('obbVisual').innerHTML='';el('obbStageText').textContent='กำลังสุ่มไอเทม...';el('obbProgressFill').style.width='0%';el('obbStatus').textContent='ขอให้โชคดี!';render();let progress=0;const timer=setInterval(()=>{if(!state.opening){clearInterval(timer);return}progress=Math.min(93,progress+6.6);el('obbProgressFill').style.width=progress+'%'},105)}
function finish(reward){const left=Math.max(0,1200-(Date.now()-state.startedAt));setTimeout(()=>{el('obbProgressFill').style.width='100%';if(!serverAvailable()){state.remaining=Math.max(0,state.remaining-state.batchCount);if(state.bulkReport){state.inventory.push(...state.bulkReport.items);state.inventory=state.inventory.slice(-5000);save();for(const rewardName of state.bulkReport.legendary){events.push({kind:'success',text:'🏆 '+player.name+' เปิด OBB ได้ '+rewardName+' ('+tierLabel('Legendary')+')!'});}if(state.bulkReport.legendary.length)draw();}else{state.inventory.push({...reward.item,tier:reward.tier});save();announceReward(reward)}}showReward(reward)},left)}
function countRoll(count){const tally={Legendary:0,Epic:0,Rare:0,Uncommon:0,Common:0};const items=[];const legendary=[];const highlights=[];let last;
 for(let i=0;i<count;i++){const reward=pick();const item={...reward.item,tier:reward.tier};items.push(item);tally[reward.tier]++;if(reward.tier==='Legendary')legendary.push(reward.item.name);if(reward.tier==='Legendary'||reward.tier==='Epic')highlights.push(item);last=reward;}return {tally,items,legendary,highlights,last}}
function open(count=1){
 if(cfg.itemCount!==691){el('obbStatus').textContent='ยังไม่ได้นำเข้ารายการ Fire RO 691 ชิ้น';return;}
 if(state.opening)return;
 if(state.remaining<count){el('obbStatus').textContent=`กล่องไม่พอ ต้องมี ${count.toLocaleString()} ใบ`;return}
 state.batchCount=count;state.bulkReport=null;el('obbBulkReport').textContent='';hideRareRewards();openingAnimation();
 if(serverAvailable()){state.requesting=true;socket.send(JSON.stringify({type:'openOBB',count}));setTimeout(()=>{if(state.requesting){state.requesting=false;state.opening=false;el('obbStage').classList.remove('opening');el('obbStatus').textContent='เซิร์ฟเวอร์ตอบกลับช้า กรุณาลองใหม่';render()}},7000)}
 else{const result=countRoll(count);state.bulkReport=result;finish(result.last)}
}
function receiveMessage(msg){
 if(msg.type==='obbState'){state.remaining=msg.boxes;state.inventory=msg.inventory||[];state.online=true;render()}
 if(msg.type==='obbResult'){state.remaining=msg.boxes;state.inventory=msg.inventory||[];state.batchCount=msg.count||1;state.bulkReport={tally:msg.tally||{},items:msg.rolledItems||[],legendary:[],recent:msg.recent||[],highlights:(msg.highlights||[])};state.requesting=false;finish({tier:msg.tier,item:msg.item})}
 if(msg.type==='obbSaleResult'){state.remaining=msg.boxes;state.inventory=msg.inventory||[];invUI.busy=false;invUI.selected.clear();inventoryNotice('ขายสำเร็จ '+msg.sold+' ชิ้น ได้รับ '+msg.reward+' กล่อง OBB');render()}
 if(msg.type==='obbError'){if(invUI.busy){invUI.busy=false;inventoryNotice(msg.message||'ขายไม่สำเร็จ');inventoryDraw();}state.opening=false;state.requesting=false;el('obbStage').classList.remove('opening');el('obbStatus').textContent=msg.message||'เปิดกล่องไม่สำเร็จ';render()}
}
function addBoxes(n){if(serverAvailable())return;state.remaining+=n;save();render()}
function onRefine(){if(serverAvailable())return;const count=typeof player!=='undefined'?player.attempts:0;if(!Number.isInteger(count))return;const known=Number(localStorage.getItem('sukhambriya:obb:attempts:v2')||0);if(count>known){const earned=Math.floor(count/5)-Math.floor(known/5);if(earned>0){state.remaining+=earned;save()}localStorage.setItem('sukhambriya:obb:attempts:v2',String(count));render()}}

function renderTierCatalogue(){const host=el('obbTierCatalogue');if(!host)return;host.replaceChildren();for(const [tier,rate] of Object.entries(cfg.rates)){const details=document.createElement('details');details.className='obbTierBlock';details.dataset.tier=tier;details.open=true;const head=document.createElement('summary');const label=document.createElement('span');label.textContent=tierLabel(tier)+' ('+cfg.items[tier].length+')';const percent=document.createElement('strong');percent.textContent=rate.toFixed(2)+'%*';head.append(label,percent);const list=document.createElement('div');list.className='obbTierList';const items=cfg.items[tier].slice().sort((a,b)=>Number(!!b.new)-Number(!!a.new));for(const item of items){const row=document.createElement('div');row.className='obbTierItem'+(item.new?' isNew':'');row.title=item.nameTh+' · '+item.category;const icon=document.createElement('span');icon.append(window.obbMakeIcon(item));const name=document.createElement('span');name.textContent=item.name;row.append(icon,name);if(item.new){const tag=document.createElement('span');tag.className='obbNewTag';tag.textContent='NEW';row.append(tag)}list.append(row)}details.append(head,list);host.append(details)}}

load();inventoryInit();renderTierCatalogue();el('obbRewardClose').addEventListener('click',closeOBBReward);el('modeRefine').addEventListener('click',()=>flip('refine'));el('modeObb').addEventListener('click',()=>flip('obb'));el('obbOpen').addEventListener('click',()=>open(1));document.querySelectorAll('[data-obb-count]').forEach(b=>b.addEventListener('click',()=>open(Number(b.dataset.obbCount))));el('rareClose')?.addEventListener('click',hideRareRewards);el('rareDone')?.addEventListener('click',hideRareRewards);el('rareToggle')?.addEventListener('click',updateRareToggle);el('rareOverlay')?.addEventListener('click',e=>{if(e.target===el('rareOverlay'))hideRareRewards();});window.OBB_UI={receiveMessage,onRefine,render,addBoxes};
// Hook existing game's socket events and refine render without altering refine odds.
const originalDraw=draw;
draw=function(){originalDraw();onRefine()};
const oldConnect=connect;
function attachOBB(ws){if(!ws||ws.__obbAttached)return;ws.__obbAttached=true;ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type?.startsWith('obb'))receiveMessage(m)});}
connect=function(){oldConnect();attachOBB(socket)};
attachOBB(socket);
render();
if(location.protocol==='http:'||location.protocol==='https:'){if(socket?.readyState===1)socket.send(JSON.stringify({type:'obbSync'}));}
})();
