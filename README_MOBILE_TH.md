# Sukhambriya RO Mobile PWA

- รองรับการแสดงผลมือถือแนวตั้ง หน้าตีบวกปรับเป็นแนวตั้งและตารางเรทด้านล่าง
- หน้า OBB และ Inventory เป็นคอลัมน์เดียวบนจอเล็ก เลื่อนขึ้นลงได้
- มี manifest, ไอคอน 192/512 และ service worker สำหรับติดตั้งจาก Render HTTPS
- การเล่นออนไลน์ต้องใช้ Render และอินเทอร์เน็ต PWA ไม่ได้ทำให้ข้อมูลออนไลน์เป็นข้อมูลถาวร
- รูปไอคอน OBB ภายนอกเว็บไซต์ Fire RO อาจใช้ไม่ได้เมื่อออฟไลน์หรือเซิร์ฟเวอร์รูปถูกจำกัด
- iOS: Safari → Share → Add to Home Screen; Android Chrome → Install app/Add to Home screen
- ถ้า Deploy URL เดิมแล้วภาพเก่า แนะนำปิดแอปเปิดใหม่ หรือเคลียร์ cache ของ PWA
- ชุดนี้มาจาก No MVP Battle; ไม่มี Poring Hunt และ MVP Battle
