# ระบบแต่งตัวจากฐานข้อมูล RO จริง (ทดลองเชื่อม API)

ใช้แหล่ง `https://assets.latam-tools.com.br/raw/items_en.json` ผ่าน `/api/real-costumes` โดยเซิร์ฟเวอร์กรองรายการที่มี `spriteView` และไอคอนจาก `/icons/item/{id}.png`

แสดงภาพที่ `/api/costume-image` เรนเดอร์จาก `/image?job=4013&action=...` ของ ragassets (APNG) โดยส่ง headgear, garment, hair, palette ไปยัง upstream

ติดตั้ง GitHub/Render เหมือนเดิม ไม่ต้องเปลี่ยน SQL. ต้องมีอินเทอร์เน็ตและ upstream ออนไลน์; หากโหลดไม่ได้ให้ดู `COSTUME CATALOG ERROR`/`COSTUME IMAGE ERROR` ใน Render Logs.

**ข้อจำกัด:** ไม่ได้ดึงจาก `costume.irowiki.org` โดยตรง แต่ใช้ ragassets ที่มีรายการและเรนเดอร์จริง; การแมป Middle/Lower ด้วย `equipSlots` ยังต้องตรวจข้อมูลจริงของแต่ละไอเทม และอาจไม่ตรงทั้งหมด. ท่า Monster Hunt ที่สวมของใช้เรนเดอร์จาก API เมื่อมีเครื่องแต่งกาย ไม่ได้ยืนยันว่าฟันทุกทิศตรงเฟรม 100%. ยังไม่สามารถทดสอบ upstream ภายในสภาพแวดล้อมนี้เพราะไม่สามารถเชื่อมเครือข่ายภายนอกได้.
