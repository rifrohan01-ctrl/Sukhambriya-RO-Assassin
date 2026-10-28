'use strict';
const path=require('path');
const {spawnSync}=require('child_process');
const fs=require('fs');
const manifest=path.resolve(__dirname,'../public/obb-items.json');
let valid=false;try{const data=JSON.parse(fs.readFileSync(manifest,'utf8'));valid=data.itemCount===691&&Object.values(data.items).flat().length===691}catch{}
if(!valid){const cmd=spawnSync(process.execPath,[path.join(__dirname,'import-firero.js')],{stdio:'inherit',env:process.env});if(cmd.status!==0){console.error('Server NOT started: complete Fire RO data unavailable. Use npm run import:firero on a networked machine or provide FIRERO_HTML_PATH.');process.exit(1)}}
require('../server.js');
