#!/usr/bin/env node
'use strict';
// Imports the catalog only when all 691 items have been independently parsed.
const fs=require('fs');const path=require('path');const {load}=require('cheerio');
const URL='https://www.fire-ro.com/database/gacha/old-blue-box';
const GROUPS=[['หายากพิเศษ','Legendary',46],['หายากมาก','Epic',274],['หายาก','Rare',37],['ทั่วไป','Uncommon',332],['เจอบ่อย','Common',2]];
const target=path.resolve(__dirname,'..');
const flags=process.argv.slice(2);
function opt(n){const i=flags.indexOf(n);return i>=0?flags[i+1]:null}
function normalize(s){return String(s||'').replace(/\s+/g,' ').trim()}
function grabName($,img){
 const alt=normalize(img.attr('alt')||img.attr('title'));
 if(alt&& !/^(?:image|item|icon|รูปภาพ)$/i.test(alt))return alt;
 const card=img.closest('li,article,[class*=item-card],[class*=itemCard],[class*=gacha-item],[class*=gachaItem]');
 const root=card.length?card:img.parent().parent();
 const candidates=[root.find('a[href*="/database/item/"]').first().text(),root.find('a[href*="/database/items/"]').first().text(),root.find('h4,h5,[class*=item-name],[class*=itemName],strong').first().text(),img.parent().next().text()];
 return normalize(candidates.find(s=>normalize(s))||'');
}
function parse(html){
 const $=load(html);const found=Object.fromEntries(GROUPS.map(([_,tier])=>[tier,[]]));
 let current=null;const seen=new Set();
 $('h2,h3,h4,img').each((_,node)=>{
   const $node=$(node);
   if(node.tagName!=='img'){
      const heading=normalize($node.text());
      const entry=GROUPS.find(([name])=>heading.startsWith(name));
      if(entry)current=entry[1];
      else if(node.tagName==='h2' && !heading.includes('Old Blue Box'))current=null;
      return;
   }
   if(!current)return;
   let url=$node.attr('data-src')||$node.attr('src')||$node.attr('data-original')||'';
   if(!url){const ss=$node.attr('srcset')||'';url=ss.split(',')[0]?.trim().split(' ')[0]||''}
   const match=String(url).match(/(?:^|\/)img\/items\/(\d+)\.(?:png|gif|webp)(?:[?#]|$)/i);
   if(!match)return;
   const id=Number(match[1]),name=grabName($,$node);const key='firero-'+id;
   if(!name||seen.has(key+'|'+current))return;
   seen.add(key+'|'+current);
   found[current].push({key,name,nameTh:'',category:'Fire RO Old Blue Box',itemId:id,imageUrl:new URL(url,URL).href,weight:1,icon:'🎁'});
 });
 return found;
}
async function run(){
 let html;
 const filepath=opt('--html')||process.env.FIRERO_HTML_PATH;
 if(filepath){html=fs.readFileSync(path.resolve(filepath),'utf8')}
 else{
   console.log('Fetching catalog from',URL);
   const response=await fetch(URL,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Mozilla/5.0 (compatible; SukhambriyaGameCatalog/1.0)','Accept':'text/html'}});
   if(!response.ok)throw new Error('Fire RO responded '+response.status);
   html=await response.text();
 }
 const items=parse(html);
 const count=Object.values(items).reduce((n,v)=>n+v.length,0);
 const expected=Object.fromEntries(GROUPS.map(([_,tier,n])=>[tier,n]));
 const actual=Object.fromEntries(Object.entries(items).map(([tier,list])=>[tier,list.length]));
 console.log('Items found:',count,'Tier counts:',actual);
 if(count!==691||GROUPS.some(([_,tier,n])=>items[tier].length!==n))throw new Error('Catalog incomplete/mismatched; expected '+JSON.stringify(expected)+'. No game files were overwritten.');
 // Website does NOT disclose probability numbers. Explicit fallback: every item equally likely.
 const rates=Object.fromEntries(GROUPS.map(([_,tier,n])=>[tier,n/691*100]));
 const data={source:URL,sourceNote:'รายการ/กลุ่มจาก Fire RO; ไม่ใช่เรททางการ: สุ่มแต่ละไอเทมเท่ากัน (1/691)',probabilityMethod:'UNIFORM_PER_ITEM_NOT_OFFICIAL',itemCount:691,rates,items};
 const staged=JSON.stringify(data,null,2);
 const test=JSON.parse(staged);
 if(test.itemCount!==691||Object.values(test.items).flat().length!==691)throw new Error('Invalid export');
 // Atomic writes after complete validation. No legacy items in any resulting catalog.
 const publicDir=path.join(target,'public');
 const outputs=[
  [path.join(publicDir,'obb-items.json'),staged],
  [path.join(publicDir,'obb-catalog.js'),'window.OBB_DATA='+JSON.stringify(data)+';\n'],
  [path.join(target,'obb-data.js'),`'use strict';\nconst OBB_DATA=${JSON.stringify(data)};\nconst tiers=Object.keys(OBB_DATA.rates);\nfunction drawOBB(rng=Math.random){let roll=rng()*100,tier=tiers.at(-1);for(const t of tiers){roll-=OBB_DATA.rates[t];if(roll<0){tier=t;break}}const pool=OBB_DATA.items[tier];return {tier,item:pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))]}}\nmodule.exports={OBB_DATA,drawOBB};\n`]
 ];
 for(const [filename,content] of outputs){fs.writeFileSync(filename+'.tmp',content,'utf8');fs.renameSync(filename+'.tmp',filename)}
 console.log('SUCCESS: Imported exactly 691 records; previous 73-item catalog replaced.');
}
if(require.main===module)run().catch(e=>{console.error('IMPORT FAILED:',e.message);process.exitCode=1});
module.exports={parse};
