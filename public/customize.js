/* Real costume catalogue + rendered RO character. Data and sprites are loaded from the fixed ragassets upstream via our server. */
(()=>{
const $=id=>document.getElementById(id), tab=$('modeCustomize'), panel=$('customizeMode');if(!tab||!panel)return;
const slots=['upper','middle','lower','garment'],titles={upper:'Upper หมวก',middle:'Middle แว่น',lower:'Lower ใบหน้า',garment:'Garment ผ้าคลุม'};
let catalog=[], selection={upper:null,middle:null,lower:null,garment:null}, row=null,busy=false,loaded=false,action=0,direction=0;
const source=$('costumeSourceStatus'),state=$('customizeStatus'),preview=$('customizeSprite');
const status=(message,error=false)=>{state.textContent=message;state.style.color=error?'#ffb6b6':'#b6edc6'};
const byId=id=>catalog.find(x=>x.id===Number(id));

function slotFor(item) {
  if (item.kind === 'garment') return 'garment';

  const slots = (item.slots || []).map(
    s => String(s).toLowerCase()
  );

  if (slots.includes('low') || slots.includes('lower')) {
    return 'lower';
  }

  if (slots.includes('mid') || slots.includes('middle')) {
    return 'middle';
  }

  return 'upper';
}
  
function spriteUrl(a=0){const q=new URLSearchParams({action:String(a),head:String(row?.hair_style??8),headPalette:String(row?.hair_color??1),bodyPalette:String(row?.appearance?.bodyColor??-1)});for(const s of slots)q.set(s,String(byId(selection[s])?.view||0));return '/api/costume-image?'+q.toString()}
const lastGood='assets/assassin/Idle.png';
function setSprite(el,a){const url=spriteUrl(a);el.onerror=()=>{el.onerror=null;el.src=lastGood;source.textContent='ภาพเรนเดอร์ต้นทางไม่พร้อมใช้งาน · แสดงภาพเดิมแทน';};el.onload=()=>{};el.src=url;}
function updatePreview(){if(!row)return;setSprite(preview,action+direction);const bar=$('costumeSlots');bar.replaceChildren();for(const s of slots){const b=document.createElement('button');b.className='costumeSlot';b.type='button';const it=byId(selection[s]);const top=document.createElement('b');top.textContent=titles[s]+' ✕';const bottom=document.createElement('span');bottom.textContent=it?.name||'ยังไม่สวมใส่';b.append(top,bottom);b.onclick=()=>{selection[s]=null;updatePreview();showItems();status('ถอดอุปกรณ์แล้ว · กดบันทึก')};bar.append(b)}updateHero()}
window.RO_COSTUME_SPRITE=(key)=>{if(!row||!slots.some(s=>selection[s]))return null;const a=key.startsWith('Attack')?80:(key.startsWith('Walk')?8:0);const dir=key.endsWith('BackLeft')?3:key.endsWith('BackRight')?5:key.endsWith('Left')?2:key.endsWith('Right')?6:0;return spriteUrl(a+dir)};
function updateHero(){const hero=document.querySelector('.huntHero');if(!hero)return;const im=hero.querySelector('img');if(!im)return;if(!row)return;const selected=slots.some(s=>selection[s]);if(!selected)return;const next=window.RO_COSTUME_SPRITE(hero.dataset.spriteKey||'Idle');if(!next)return;if(im.dataset.costumeUrl!==next){im.dataset.costumeUrl=next;im.src=next;im.onerror=()=>{im.onerror=null;im.src='assets/assassin/Idle.png'}}}
function showItems(){const query=$('costumeSearch').value.trim().toLowerCase(),filter=$('costumeFilter').value,box=$('costumeCatalog');box.replaceChildren();let matched=catalog.filter(x=>(filter==='all'||slotFor(x)===filter)&&(!query||x.name.toLowerCase().includes(query)||String(x.id).includes(query)));source.textContent=`ข้อมูลอุปกรณ์จริง ${catalog.length.toLocaleString()} รายการ · แสดง ${Math.min(matched.length,120)} จาก ${matched.length} รายการ · ค้นหาชื่อ/รหัสเพื่อดูเพิ่มเติม`;
for(const it of matched.slice(0,120)){const s=slotFor(it),button=document.createElement('button');button.className='costumeItem'+(selection[s]===it.id?' equipped':'');button.type='button';const img=document.createElement('img');img.loading='lazy';img.src='/api/costume-icon?id='+it.id;img.onerror=()=>{img.style.opacity='.2'};const name=document.createElement('strong');name.textContent=it.name;const sub=document.createElement('small');sub.textContent=`#${it.id} · ${titles[s]}`;button.append(img,name,sub);button.onclick=()=>{selection[s]=selection[s]===it.id?null:it.id;updatePreview();showItems();status('ทดลองสวมแล้ว · กดบันทึกเพื่อเก็บถาวร')};box.append(button)} }
async function loadCatalog(){if(loaded)return;source.textContent='กำลังอ่านฐานข้อมูลอุปกรณ์จริง…';try{const r=await fetch('/api/real-costumes',{cache:'no-cache'});const data=await r.json();if(!r.ok)throw Error(data.detail||'HTTP '+r.status);catalog=Array.isArray(data.items)?data.items:[];if(!catalog.length)throw Error('ไม่พบอุปกรณ์ที่มี Sprite');loaded=true;showItems();updatePreview();}catch(e){source.textContent='โหลดรายการอุปกรณ์ไม่สำเร็จ: '+e.message+' — ตรวจ Render Logs / COSTUME CATALOG ERROR';}}
function fill(newRow){if(!newRow)return;row=newRow;const saved=row.appearance?.costumeSlots||{};for(const s of slots){const id=Number(saved[s]);selection[s]=Number.isInteger(id)&&id>0?id:null;}$('customizeName').textContent=row.character_name||'Assassin Cross';if(loaded){updatePreview();showItems()}}
async function open(){if(!window.SUKHAMBRIYA_CHARACTER){status('กรุณา Login ก่อน',true);return} $('modeRefine').click();$('obbMode')?.classList.remove('visible');$('huntMode')?.classList.remove('visible');$('stage').style.display='none';for(const id of ['modeRefine','modeObb','modeHunt'])$(id)?.classList.remove('active');tab.classList.add('active');panel.hidden=false;fill(window.SUKHAMBRIYA_CHARACTER);await loadCatalog();panel.scrollIntoView({block:'start',behavior:'smooth'})}
tab.addEventListener('click',open);for(const id of ['modeRefine','modeObb','modeHunt'])$(id)?.addEventListener('click',()=>{panel.hidden=true;tab.classList.remove('active');$('stage').style.display=''}) ;
for(const id of ['costumeSearch','costumeFilter'])$(id).addEventListener(id==='costumeSearch'?'input':'change',showItems);
window.addEventListener('sukhambriya:character-ready',e=>fill(e.detail));if(window.SUKHAMBRIYA_CHARACTER)fill(window.SUKHAMBRIYA_CHARACTER);
const controls=document.createElement('div');controls.className='costumeBar';controls.innerHTML='<button type="button" id="costumeTurnLeft" class="btn">↶ หันซ้าย</button><button type="button" id="costumeTurnRight" class="btn">↷ หันขวา</button><button type="button" id="costumeIdle" class="btn">ยืน</button><button type="button" id="costumeWalk" class="btn">เดิน</button><button type="button" id="costumeAttack" class="btn">ฟัน</button>';
$('costumeSpriteStage').after(controls);$('costumeTurnLeft').onclick=()=>{direction=(direction+1)%8;updatePreview()};$('costumeTurnRight').onclick=()=>{direction=(direction+7)%8;updatePreview()};$('costumeIdle').onclick=()=>{action=0;updatePreview()};$('costumeWalk').onclick=()=>{action=8;updatePreview()};$('costumeAttack').onclick=()=>{action=80;updatePreview()};
$('customizeSave').onclick=async()=>{if(busy||!row)return;const sb=window.SUKHAMBRIYA_SUPABASE;if(!sb){status('ไม่พบ Supabase',true);return}busy=true;$('customizeSave').disabled=true;status('กำลังบันทึก...');try{const {data:{user},error:err}=await sb.auth.getUser();if(err||!user)throw Error('กรุณา Login อีกครั้ง');const appearance={...(row.appearance||{}),costumeSlots:{...selection}};const {data,error}=await sb.from('characters').update({appearance,updated_at:new Date().toISOString()}).eq('user_id',user.id).select('user_id,character_name,job_id,hair_style,hair_color,appearance').single();if(error)throw error;row=data;window.SUKHAMBRIYA_CHARACTER=data;status('✓ บันทึกเครื่องแต่งตัวลง Supabase สำเร็จแล้ว')}catch(e){status('บันทึกผิดพลาด: '+e.message,true)}finally{busy=false;$('customizeSave').disabled=false}};
new MutationObserver(()=>updateHero()).observe(document.getElementById('huntField'),{childList:true,subtree:false});
})();
