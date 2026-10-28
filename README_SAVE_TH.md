# Sukhambriya RO — Persistent Save

1. ใน Supabase SQL Editor รัน SUPABASE_SQL_SAVE.sql (ถ้าสร้างตารางแล้ว ข้ามได้)
2. Render → Environment ต้องมี SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY (Secret Key เก็บเฉพาะ Render ไม่ส่งแชท/ไม่ใส่ GitHub)
3. แตก ZIP แล้วอัปโหลดไฟล์ทั้งหมดขึ้น GitHub โดยให้ server.js, package.json, public อยู่ระดับบนสุด จากนั้น Deploy latest commit
4. เปิดหน้าเกมจาก Render เท่านั้น สมัคร/ล็อกอิน สร้างตัวละคร แล้วเล่นเพื่อทดสอบบันทึก
5. ทดสอบเปิด OBB, เก็บอาวุธ, Logout/Login และ Restart Render แล้วตรวจค่าคงเดิม

**ข้อจำกัดสำคัญ:** ไม่กู้ข้อมูลก่อนหน้า ผู้เล่นแต่ละบัญชีจะได้รับค่าเริ่มต้นครั้งแรกเมื่อไม่มี save เท่านั้น การให้รางวัล Monster Hunt ยังต้องย้ายการตรวจสอบการฆ่ามอนฝั่งเซิร์ฟเวอร์ก่อนเปิดเกมสาธารณะ ระบบนี้เป็นรุ่นทดสอบ ยังไม่รับประกันการป้องกันโกงหรือการคงข้อมูลหากเกิดคำขอแข่งกันจากหลายอุปกรณ์พร้อมกัน
