'use strict';
const OBB_DATA=require('./public/obb-items.json');
const TIERS=Object.keys(OBB_DATA.rates);
function drawOBB(rng=Math.random){
 const x=rng(); if(!(x>=0&&x<1))throw Error('rng must return number [0,1)');
 let r=x*100, tier=TIERS.at(-1);
 for(const t of TIERS){r-=OBB_DATA.rates[t];if(r<0){tier=t;break}}
 const list=OBB_DATA.items[tier];
 const item=list[Math.floor(rng()*list.length)];
 return {tier,item};
}
module.exports={OBB_DATA,drawOBB};
