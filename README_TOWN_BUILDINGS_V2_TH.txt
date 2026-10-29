Sukhambriya RO — Town Buildings V2

1. นำโฟลเดอร์และไฟล์ทั้งหมดใน ZIP ไปวางทับ repository (อย่าลบ public/assets เดิม)
2. Commit + Push ผ่าน GitHub Desktop
3. ตรวจ Render ว่า Deploy เสร็จ แล้วเปิด https://sukhambriya-ro-assassin.onrender.com/
4. กด Ctrl+Shift+R เพื่อโหลดหน้าเกมใหม่

เปลี่ยนแปลง:
- เมืองมีอาคารใหม่ 9 หลัง เป็น sprite PNG โปร่งใสจากภาพอ้างอิงที่ผู้ใช้ให้มา
- ยังคงมีน้ำพุเดิม / 4 NPC / ระบบเดินแบบ A* / collision / mini-map
- server.js เดิมตั้งให้ URL / เปิด town.html

ตรวจสอบ 3 รอบ:
1. โครงสร้าง ZIP / JavaScript syntax / อาคาร PNG ทั้ง 9 และ URL /
2. เมือง 44x44 / จุดเกิด / การเดินถึง NPC 4 ตัว / พื้นที่ชนอาคาร
3. จำลอง Canvas render frame / minimap / movement ไม่มี runtime exception
ทั้งหมด 24 checks ผ่าน
ข้อจำกัด: ยังไม่ได้ยืนยันผลใน Chromium/Render จริง ควรตรวจภาพในเบราว์เซอร์หลัง Deploy
