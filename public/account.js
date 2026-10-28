/* Sukhambriya RO: Supabase authentication and character profile. */
(async () => {
 const $=id=>document.getElementById(id);
 const show=(id,on)=>{const n=$(id); if(n)n.hidden=!on;};
 const message=(s,err=false)=>{const n=$('accountMessage');n.textContent=s;n.style.color=err?'#ffb6a8':'#ffe8a6';};
 const setGameAccess=ok=>{document.body.classList.toggle('account-locked',!ok)};
 const nameEl=$('accountName'),emailEl=$('accountEmail'),passEl=$('accountPassword');
 setGameAccess(true);
 let config;
 try {const response=await fetch('/api/public-config',{cache:'no-store'});if(!response.ok)throw Error('ไม่พบการตั้งค่า Supabase บนเซิร์ฟเวอร์');config=await response.json();if(!config.supabaseUrl||!config.supabasePublishableKey)throw Error('ยังไม่ได้ตั้ง SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY บน Render');}
 catch(e){show('accountGateway',true);setGameAccess(false);message(e.message,true);return;}
 if(!window.supabase?.createClient){show('accountGateway',true);setGameAccess(false);message('ไม่สามารถโหลด Supabase SDK ได้ กรุณาตรวจอินเทอร์เน็ตแล้วโหลดหน้าเว็บใหม่',true);return;}
 const sb=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
 let activeUser=null, busy=false;
 const lock=()=>{window.SUKHAMBRIYA_ACCESS_TOKEN=null;activeUser=null;setGameAccess(false);show('accountGateway',true);show('accountAuth',true);show('accountCreator',false);show('accountStatus',false)};
 async function loadCharacter(user){
   activeUser=user;setGameAccess(false);show('accountGateway',true);show('accountAuth',false);show('accountCreator',false);message('กำลังโหลดตัวละคร...');
   const {data,error}=await sb.from('characters').select('user_id,character_name,job_id,hair_style,hair_color,appearance').eq('user_id',user.id).maybeSingle();
   if(error){message('โหลดตัวละครไม่สำเร็จ: '+error.message,true);return;}
   if(!data){show('accountCreator',true);message('สร้างตัวละคร Assassin Cross ครั้งแรกได้เลยค่ะ');return;}
   const n=String(data.character_name||'นักผจญภัย');
   $('accountPlayerName').textContent=n;
   const nick=$('nickname');if(nick)nick.value=n;
   window.SUKHAMBRIYA_CHARACTER=data;
   const {data:sessionData}=await sb.auth.getSession();window.SUKHAMBRIYA_ACCESS_TOKEN=sessionData?.session?.access_token||null;
   show('accountGateway',false);show('accountStatus',true);setGameAccess(true);
   try{if(typeof window.SUKHAMBRIYA_ACCOUNT_READY==='function')window.SUKHAMBRIYA_ACCOUNT_READY(data)}catch(e){console.warn(e)}
 }
 async function auth(mode){if(busy)return;busy=true;try{
   const email=emailEl.value.trim(),password=passEl.value;
   if(!email||!password){message('กรุณาใส่อีเมลและรหัสผ่าน',true);return;}
   if(password.length<6){message('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',true);return;}
   message('กำลังดำเนินการ...');
   const {data,error}=mode==='signup'?await sb.auth.signUp({email,password,emailRedirectTo:location.origin+location.pathname}):await sb.auth.signInWithPassword({email,password});
   if(error)throw error;
   if(mode==='signup'&&!data.session){message('สมัครสำเร็จ กรุณาเปิดอีเมลและกดลิงก์ยืนยันก่อนเข้าสู่ระบบ');return;}
   if(data.user)await loadCharacter(data.user);
 }catch(e){message(e.message||'เกิดข้อผิดพลาด',true)}finally{busy=false}}
 $('accountSignIn').onclick=()=>auth('signin');$('accountSignUp').onclick=()=>auth('signup');
 $('accountSave').onclick=async()=>{
  if(busy||!activeUser)return;
  const n=nameEl.value.trim(),hairStyle=Number($('accountHairStyle').value),hairColor=Number($('accountHairColor').value);
  if(n.length<3||n.length>20){message('ชื่อตัวละครต้องยาว 3–20 ตัวอักษร',true);return;}
  busy=true;message('กำลังบันทึกตัวละคร...');
  try{
   const row={user_id:activeUser.id,character_name:n,job_id:4013,hair_style:hairStyle,hair_color:hairColor,appearance:{job:4013,hair:hairStyle,hairPalette:hairColor,headgear:[138,138,0]}};
   const {error}=await sb.from('characters').upsert(row,{onConflict:'user_id'});
   if(error)throw error;
   await loadCharacter(activeUser);
  }catch(e){message('บันทึกไม่สำเร็จ: '+e.message,true)}finally{busy=false}
 };
 $('accountLogout').onclick=async()=>{await sb.auth.signOut();location.reload()};
 sb.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){lock();return;}
   if(event==='SIGNED_IN'&&session?.user&&!activeUser)setTimeout(()=>loadCharacter(session.user),0);
 });
 const {data:{session}}=await sb.auth.getSession();
 if(session?.user)await loadCharacter(session.user);else{lock();message('เข้าสู่ระบบเพื่อสร้างหรือโหลดตัวละคร')}
})();
