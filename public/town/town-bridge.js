(function(){
 const q=new URLSearchParams(location.search); const id={refine:'modeRefine',obb:'modeObb',hunt:'modeHunt',costume:'modeCustomize'}[q.get('townNPC')];
 const home=document.createElement('a');home.href='town.html';home.textContent='🏰 เข้าเมือง Sukhambriya';Object.assign(home.style,{position:'fixed',right:'12px',bottom:'14px',zIndex:'9999',padding:'11px 15px',background:'#263c45',color:'#ffe0a6',border:'2px solid #be9a5e',borderRadius:'9px',boxShadow:'0 4px 14px #0009',font:'bold 13px Tahoma',textDecoration:'none'});document.body.append(home);
 if(id){let attempts=0;const timer=setInterval(()=>{attempts++;const el=document.getElementById(id),gate=document.getElementById('accountGateway');if(el&&(!gate||gate.hidden||getComputedStyle(gate).display==='none')){el.click();clearInterval(timer)}if(attempts>150)clearInterval(timer)},200)}
})();
