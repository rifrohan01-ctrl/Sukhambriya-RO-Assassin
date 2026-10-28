แก้บัคช่อง Redeem Code คลิกพิมพ์ไม่ได้ในหน้า OBB
สาเหตุ: .obbMode เป็นแผง position:absolute และ z-index:30 ทับตำแหน่งช่องกรอกที่อยู่ด้านล่าง
แก้ไข: ยก .redeem-panel เป็น stacking context ที่ z-index:65 และให้ input/button รับการคลิกได้เสมอ
โค้ด 9999obb และกฎรับ 9,999 กล่องยังคงเดิม
วิธีทดสอบ: เปิดหน้าเกม > สลับ OBB > คลิกช่อง Redeem Code > พิมพ์ 9999obb > รับรางวัล
