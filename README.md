# ระบบยื่นเอกสารลา / ขาดเรียนออนไลน์

เว็บไซต์ให้นักเรียนยื่นใบลาแบบดิจิทัล อนุมัติออนไลน์ตามสายงาน และติดตามสถานะได้
(อ้างอิงสเปก: `../absence-system-spec.md` — ดู §13 สำหรับสายอนุมัติหลายขั้น)

## สถานะตอนนี้ — Phase 0–5 ✅

- **Phase 0–1** โครง Node/Express + SQLite, ล็อกอินแยกบทบาท (bcrypt+JWT), ฟอร์มยื่นใบลา
- **Phase 2** แนบไฟล์หลักฐาน (ตรวจไบต์จริง), ติดตามสถานะ
- **Phase 3 — สายอนุมัติหลายขั้น (โรงเรียนหอพัก)**
  - **สายอนุมัติ 5 ขั้น:** ครูประจำชั้น → ครูหัวหน้าระดับ → หัวหน้าฝ่ายหอพัก → รองผอ → ผอ
    (ปฏิเสธขั้นใดก็จบ, แยกคิวตามระดับชั้น, นิยามสายที่ `src/config/approval.js`)
  - **แจ้งเตือน (F6)** กระดิ่งในเว็บ + อีเมลจำลอง (log console ผ่าน Nodemailer, ต่อ SMTP ได้)
  - **ผู้ปกครอง** ดูการลาของบุตรหลาน + รับแจ้งเตือน (ดูอย่างเดียว)
  - **แอดมิน** จัดการผู้ใช้ + จับคู่ครูประจำชั้น/ผู้ปกครอง/ระดับชั้น
- **Phase 4** ชุดทดสอบอัตโนมัติ (`npm test`), production hardening (`/api/health`, security headers, env paths), ไฟล์ deploy (Docker/Render, ดู `DEPLOY.md`)
- **Phase 5** แดชบอร์ดสถิติ + กราฟ, Export CSV (เปิดใน Excel), ปฏิทินวันลา — ขอบเขตข้อมูลตาม role
  - *(PDF ใบลาที่อนุมัติ: รอเทมเพลตทางการ)*

## บทบาท (roles)
`student` · `parent` · `homeroom` (ครูประจำชั้น) · `gradehead` (ครูหัวหน้าระดับ) · `dormhead` (หัวหน้าฝ่ายหอพัก) · `deputy` (รองผอ) · `principal` (ผอ) · `admin`

## วิธีติดตั้งและรัน

```bash
cd absence-system
npm install
cp .env.example .env          # ใส่ JWT_SECRET และ STAFF_SIGNUP_CODE
npm run dev                   # หรือ npm start  → http://localhost:3000
```
สร้างค่าสุ่ม: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### การสมัคร (ชั่วคราวจนกว่าจะมีแอดมินคนแรก)
- **นักเรียน/ผู้ปกครอง** สมัครได้เลย (นักเรียนกรอกห้อง เช่น `ม.5/2` → ระบบดึงระดับชั้น `ม.5` ให้)
- **ครู/ผู้บริหาร/แอดมิน** ต้องใช้ **รหัสลับ** (`STAFF_SIGNUP_CODE` ใน `.env`)
- ผู้อนุมัติขั้น 2–5 ใส่ "ระดับชั้นที่ดูแล" (เช่น `ม.5`) หรือ `ทุกระดับ`
- จากนั้น **แอดมินจับคู่** นักเรียน ↔ ครูประจำชั้น/ผู้ปกครอง ในหน้าจัดการผู้ใช้

## API หลัก

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/api/auth/register` `/login` `/logout` · GET `/me` | — |
| POST | `/api/requests` | นักเรียน (ต้องมีครูประจำชั้นก่อน) |
| GET | `/api/requests` · `/api/requests/:id` | กรองตามบทบาท/ขอบเขต |
| PUT | `/api/requests/:id/decide` `{decision, note}` | ผู้อนุมัติขั้นปัจจุบัน |
| POST | `/api/requests/:id/attachments` · GET `/api/attachments/:id/download` | นักเรียน / เจ้าของ+ผู้อนุมัติในขอบเขต |
| GET | `/api/notifications` · PUT `/:id/read` · `/read-all` | ต้องล็อกอิน |
| GET | `/api/requests/export.csv` | ตามขอบเขตผู้ใช้ |
| GET | `/api/stats` | แอดมิน + ผู้อนุมัติ (กรองตามขอบเขต) |
| GET/POST/PUT/DELETE | `/api/users` | แอดมิน |
| GET | `/api/health` | — |
