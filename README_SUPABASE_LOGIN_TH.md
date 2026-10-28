# Sukhambriya RO — Supabase Login และ Characters

## การตั้งค่า Render
เพิ่ม SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY ใน Environment แล้ว Deploy โค้ดนี้
ใช้ npm install และ npm start ตามเดิม (Node >=18)

## การตั้งค่า Supabase
- Authentication > Sign In / Providers เปิด Email
- Authentication > URL Configuration: Site URL เป็น URL ของ Render, Redirect URLs เพิ่ม URL Render/**
- ตาราง public.characters มี user_id uuid อ้างอิง auth.users, character_name, job_id, hair_style, hair_color, appearance และ RLS ของเจ้าของข้อมูล
- Confirm Email อาจต้องตั้ง SMTP เพื่อส่งอีเมลถึงผู้เล่นทั่วไป

## วิธีทดสอบ
สมัครสมาชิก > ยืนยันอีเมล (ถ้าเปิด) > ล็อกอิน > สร้าง Assassin Cross > บันทึก > ออกจากระบบ > เข้าระบบใหม่ > โหลดชื่อ/ข้อมูล character เดิม

## ข้อจำกัดที่สำคัญ
- เวอร์ชันนี้เก็บ **ข้อมูลตัวละคร** (ชื่อ, job, รหัสทรงผมและสีผม, appearance) ลง Supabase เท่านั้น
- การเลือกทรงผม/สีผมยังไม่สลับไฟล์ Sprite ใน Monster Hunt ซึ่งต้องมี asset ที่ได้รับอนุญาตครบทุกท่า
- **OBB, การตีบวก และ Inventory เดิมยังไม่ถูกบันทึกถาวรใน Supabase** และ WebSocket multiplayer เดิมยังไม่มีการยืนยัน JWT จาก Supabase ที่ฝั่งเซิร์ฟเวอร์ จึงไม่ปลอดภัยสำหรับระบบรางวัลที่มีมูลค่า/เปิดให้ผู้เล่นทั่วไปใช้
- การตั้งค่าในหน้าบัญชีใช้ Publishable key เท่านั้น ห้ามใส่ secret key ฝั่งเบราว์เซอร์
