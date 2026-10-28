(()=>{'use strict';
const form=document.getElementById('redeemForm');if(!form)return;
const input=document.getElementById('redeemCode');const feedback=document.getElementById('redeemFeedback');
const KEY='sukhambriya:redeem:9999obb:v1';
function status(message,ok){feedback.textContent=message;feedback.style.color=ok?'#17623d':'#9e2825';}
function isOnline(){return typeof online!=='undefined'&&online&&typeof socket!=='undefined'&&socket?.readyState===1;}
form.addEventListener('submit',e=>{e.preventDefault();const code=input.value.trim().toLowerCase();
 if(code!=='9999obb'){status('โค้ดไม่ถูกต้อง',false);return;}
 if(isOnline()){socket.send(JSON.stringify({type:'redeemCode',code}));status('กำลังตรวจสอบโค้ด...',true);return;}
 try{if(localStorage.getItem(KEY)==='used'){status('โค้ดนี้ใช้ในเครื่องนี้แล้ว',false);return;}
 if(!window.OBB_UI?.addBoxes){status('ระบบกล่องยังไม่พร้อม กรุณาโหลดหน้าใหม่',false);return;}
 window.OBB_UI.addBoxes(9999);localStorage.setItem(KEY,'used');status('รับ Old Blue Box 9,999 กล่องสำเร็จ!',true);
 }catch(err){status('ไม่สามารถบันทึกการใช้โค้ดในเครื่องนี้ได้',false);}}
);
function attach(ws){if(!ws||ws.__codeAttached)return;ws.__codeAttached=true;ws.addEventListener('message',e=>{let msg;try{msg=JSON.parse(e.data)}catch{return}if(msg.type==='codeResult')status(msg.message,!!msg.ok);});}
const prior=connect;connect=function(){prior();attach(socket)};attach(socket);
})();
