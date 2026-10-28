# ตรวจ Failed to fetch ตอนสมัครบัญชี

1. เปิด Render > Environment ตรวจ SUPABASE_URL ต้องตรงกับ Project URL จาก Supabase > Settings > Data API (ไม่ใช่ URL หน้า Dashboard และไม่มีช่องว่างหรือ /auth/v1)
2. ตรวจ SUPABASE_PUBLISHABLE_KEY ต้องมาจากโปรเจกต์เดียวกันและเป็น sb_publishable_... ไม่ใช่ secret key
3. เปิด https://<project-ref>.supabase.co/auth/v1/health ใน Chrome ถ้า DNS/ERR_NAME_NOT_RESOLVED หรือเชื่อมต่อไม่ได้ แก้ URL/สถานะโปรเจกต์ก่อน
4. เปิดเกม > F12 > Network > Fetch/XHR กดสมัคร แล้วดูคำขอสีแดงว่าเป็น /api/public-config หรือ /auth/v1/signup
5. ตรวจ Authentication > Sign In / Providers > Email ว่าเปิด Email และ Allow new users to sign up
6. หากเปิดเว็บผ่าน browser in-app ของ Messenger ลอง Chrome ปกติเพื่อแยกปัญหาการเชื่อมต่อ

ไฟล์นี้เพิ่มการตรวจรูปแบบ URL และแสดงข้อความรายละเอียดเมื่อ Fetch ล้มเหลว ไม่ได้พิสูจน์ว่าเครือข่ายไปถึงโปรเจกต์ Supabase จริงจากที่นี่
