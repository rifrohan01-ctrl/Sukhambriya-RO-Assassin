Sukhambriya RO City Live
=======================

เกมเว็บสไตล์เมืองจากภาพต้นแบบ พร้อมหน้าต่าง Refine ที่คลิกใช้งานได้จริง และตัวละครเลเยอร์หน้าเดินไปมา/ร่ายสกิล

เปิด public/index.html เพื่อทดลองออฟไลน์ หรือ npm install และ npm start สำหรับเล่นออนไลน์

อัปเดต GitHub: อัปโหลด public/index.html, public/town.png และไฟล์เดิมที่ขาด หาก server.js รุ่นปัจจุบันยังรองรับเกม สามารถคงไฟล์ server.js เดิมได้ แต่แนะนำใช้อัปเดตชุดนี้ทั้งโปรเจกต์

หมายเหตุ: ภาพต้นแบบมีตัวละครและ UI ที่ไม่เคลื่อนไหวฝังอยู่ในภาพ เลเยอร์ด้านหน้าและ UI ที่ใช้กดจริงถูกวางเพิ่มเติม การทำให้ตัวละคร *ทุกตัว* ในภาพขยับได้จะต้องแยก sprite ออกทั้งหมด


## Blacksmith fix
- เอาตัวละครเดินที่ซ้อนบนฉากออกทั้งหมด
- แทน emoji หน้าการ์ตูนด้วยภาพบังรีฟช่างตีเหล็กถือค้อนจากภาพต้นแบบเมือง
- มีแอนิเมชันค้อนขยับและประกายไฟเมื่อกดตีบวก
- ตัวละครที่เป็นส่วนหนึ่งของ town.png ยังคงเป็นภาพนิ่ง


## v2 fixes
- เปลี่ยน Gungnir เป็นไฟล์พื้นหลังโปร่งใสมากขึ้น
- ขยายช่างตีเหล็กให้เต็มพื้นที่ฝั่งซ้ายของส่วนตีบวก และไม่ทับกล่องอาวุธ


## Offline startup fix
- เพิ่มการเรียก loadHall() และ draw() ทันทีเมื่อเปิด index.html
- โหลดรายการอาวุธ 3 ชิ้น / ตาราง Enhancement Info / Success Rate ได้ทันที ไม่ต้องกดตีบวก
- เมื่อเปิดผ่าน HTTP/HTTPS จะเชื่อมต่อห้องออนไลน์อัตโนมัติ


OBB visual upgrade: game-style overlay over town scene, SVG 3D chest, pedestal, three-panel classic UI, before/during/after states.


## OBB box style fix
- Replaced public/obb-chest.svg with a new blue-purple box illustration closer to the requested mockup.
- This updates the box image in both the left info panel and the center OBB opening panel.


## Approved OBB Real UI
- Uses approved generated white-background OBB image in the left info panel (`public/obb_white_clean.png`).
- Uses approved generated magical OBB scene in the center opening panel (`public/obb_magic_scene.png`).
- Layout tuned to match the approved mockup more closely while keeping the OBB system interactive.


## Center panel size fix
- The OBB center panel now uses `public/obb_magic_scene.png` as a true full-size background (`background-size: cover`).
- This prevents the image from shrinking into the top-left corner and matches the approved mockup more closely.
- Left panel still uses `public/obb_white_clean.png`.


## OBB full fix + attractive center
- Moved mode tabs to the top so they no longer cover the OBB window.
- Reduced OBB modal proportions so the left info, center panel, and open button all fit cleanly.
- Added an animated floating chest overlay, glow pulse, sparkle twinkles, and a breathing CTA button in the center panel.
- Repositioned center text, bag count, and progress bar to avoid overlap and improve readability.


## OBB 73-item catalog update
- Added 10 unique candidate Classic-style rewards, two per rarity tier.
- Replaced previously proposed Jellopy with Clover because Jellopy was already in the 63-item catalog.
- Counts: Legendary 4, Epic 4, Rare 10, Uncommon 22, Common 33.
- Tier drop rates remain 0.5%, 2.5%, 12%, 30%, 55%.
- public/obb-items.json, public/obb-catalog.js and obb-data.js are synchronized.
- The right OBB Database UI now renders all 73 entries and highlights the 10 new ones; tier sections can be collapsed.
- No changes to refine logic or rates in server.js or the main gameplay script.
- Items are curated for the fan game, not verified official Old Blue Box drop chances.


## Arsenal + bulk OBB update
- Save any unbroken weapon +7 to +10. Saving creates a fresh +4 of the same weapon. Inventory limit 100 weapons.
- Redeem stored +7 for 100 OBB, +8 for 500, +9 for 1,000. +10 can be stored but is not redeemable. A confirmation is required.
- OBB bulk-open buttons: 10, 100, 1,000; also retain single-open. All draws use the same 5-tier probability table.
- Offline saves weapon inventory and OBB counts via localStorage. Online state is server-authoritative but SESSION-ONLY: reconnect/restart loses stored weapons and boxes. A durable account/database is required for persistence across sessions.
- Note: These unusually high exchange rewards make bulk opening fast; balance is intentionally as specified by the user.


## Rare rewards special panel
- Added a special overlay panel when OBB results include Epic or Legendary items.
- Single opens show a highlighted rare item in a gold-framed panel.
- Batch opens (10 / 100 / 1000) collect only Epic and Legendary items, sort Legendary before Epic, and show them in a dedicated showcase with a gold glow.
- If more than 8 rare items appear, the panel first shows 8 items and provides a toggle button to view all results.


## Poring Hunt (new third game mode)

Choose Poring (100 HP, 10%), Drops (180 HP, 15%), Poporing (300 HP, 20%, 1–2 OBB), Marin (500 HP, 30%, 2–3 OBB), or King Poring (2000 HP, 100%, 5–10 OBB). Click the monster or attack button to deal damage. OBB drop is rolled on kill and collected automatically into the same OBB wallet used by refinement, exchanges, and inventory sales.

Offline: browser storage for kill and OBB state. Online: the Node/WebSocket server controls HP, attack cooldown (320 ms), monster selection and random drops. Online player state is session-only until account/database support is added.

Rates and game balance are custom to Sukhambriya RO and not official Ragnarok drop tables. Images are original lightweight SVG artwork inspired by cute slime monsters.


## Assassin Auto-Farm (v3 hunt)
- Adds an original Assassin-style dual-dagger adventurer figure and seven rotating monster types: Poring, Drops, Poporing, Marin, Lunatic, Fabre, King Poring.
- Player initiates Auto-Farm with the Start button; the character visually approaches, strikes rapidly, and auto-collects OBB to the existing wallet.
- Online: server controls combat/drops every 650ms while the connected WebSocket remains open, independent of the currently shown game tab; stopping Auto-Farm or disconnecting clears the server timer.
- Offline: auto-combat uses a browser timer and stores results in localStorage; it continues while switching modes on the same page, but browser throttling/suspension may pause it in background or when closed.
- The seven monster rates are custom Sukhambriya RO balancing, not official Ragnarok rates. King Poring has a 2% selection chance among respawns.
- Existing Refinement, Arsenal, Inventory sell system, OBB 73-item catalog and rarity overlay preserved.
- IMPORTANT: Online player inventory and boxes are session-only in this build; add account/database support before promising persistent progress.


## Weapon cards update
- Three full ornate golden weapon cards cropped from the user-approved preview image, including their exact lettering and artwork.
- Weapon order: Infiltrator, Assassin Dagger, Combat knife.
- Weapon names changed in server and client; existing refine rate, OBB, Hunt, inventory and arsenal mechanics unchanged.
- Legacy offline arsenal names are migrated on load.


## Manual Poring Hunt and refine startup fix
- Removed Assassin Auto-Farm (no timers or automatic hunting). Manual attacks, seven rotating monsters and OBB drops remain.
- Fixed startup weapon image paths for all 3 gold cards.
- Open `public/index.html` offline or deploy all files to Render.


## Gold-theme refine center panel update
- Updated the central refine work area to a gold-and-parchment fantasy theme so the background matches the ornate golden weapon cards.
- Re-skinned the three weapon card slots with parchment/gold styling and a gold selected-state glow.
- Refined the +level tray, Enhance button, and Oridecon/Zeny status area so they sit cleanly inside the panel without overlap.
- Preserved the existing refine system, success rates, OBB mode, inventory systems, and manual Poring Hunt mode.
- Base used: `Sukhambriya_RO_Manual_Hunt_Refine_Startup_Fixed` (Auto-Farm remains removed).

## Approved gold-frame artwork — interactive update (2026-10-27)
- The Refine UI uses `public/refine-gold-approved.png`, carefully cropped from the approved golden layout, as an exact decorative reference layer (ornate gilded borders, winged Enhance button and illustrated blacksmith).
- Weapons remain interactive click targets; displayed refinement levels, resources, success rates and outcomes come from the existing game code.
- Kept manual Poring Hunt and OBB game modes; Auto-Farm remains removed.
- The baked reference includes a blue selection glow on Combat knife; dynamic selection borders are overlaid when the player chooses other weapons. This is a visual limitation of reusing a flat approved image rather than separate editable artwork layers.
- Headless-browser validation: initial 3 weapon targets, +4 to +5, info and success table, select another weapon, Enhance click and outcome state, with zero page errors in this test. Online multiplayer still needs real Render testing.


## Animated OBB seven item showcase
Seven user-approved illustrated transparent PNGs are embedded locally under public/obb-item-art. OBB tier database, prize reveal, rare rewards panel, inventory previews and expanded inventory use the correct images by name. Floating item showcase loops in center OBB stage, supports reduced-motion. Item names and loot odds are unchanged.

## OBB reward close button
- A visible ✕ button appears at the top-right of the central result card once the roll finishes.
- Closing resets the preview and progress bar to idle without changing inventory or remaining OBB.
- Available for single and bulk opens. Epic/Legendary special overlay still uses its own close button.

## Combat knife highlight startup bug fix
- Removed blue highlight painted directly in refine-gold-approved.png, leaving a gold border.
- Weapon buttons only show a blue outline after a user explicitly clicks a weapon; default current weapon is unhighlighted.
- Other game systems, selected weapon defaults, and rates unchanged.
