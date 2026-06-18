# ระบบยื่นเอกสารลา / ขาดเรียนออนไลน์

เว็บไซต์ให้นักเรียนยื่นใบลาแบบดิจิทัล ครูอนุมัติออนไลน์ ติดตามสถานะได้
(อ้างอิงสเปก: `../absence-system-spec.md`)

## สถานะตอนนี้ — Phase 0 + Phase 1 ✅

- **Phase 0** วางโครง Node/Express + SQLite (สร้างตารางครบ 4 ตาราง) + Git
- **Phase 1**
  - **F1** สมัคร/ล็อกอินแยกบทบาท — รหัสผ่านเข้ารหัส bcrypt, ออก JWT, กันคนไม่ล็อกอิน, ตรวจสิทธิ์ตาม role
  - **F2** ฟอร์มยื่นใบลา — บันทึกลง DB จริง สถานะเริ่มต้น `pending` + หน้า "คำขอของฉัน" พร้อมป้ายสถานะ

> เฟสถัดไป: ครูอนุมัติ/ปฏิเสธ + แนบไฟล์ (เฟส 2) · แจ้งเตือนในเว็บ/อีเมล + ผู้ปกครอง + แอดมิน (เฟส 3)

## วิธีติดตั้งและรัน

```bash
cd absence-system
npm install
cp .env.example .env          # แล้วใส่ค่า JWT_SECRET (สุ่มยาวๆ)
npm run dev                   # หรือ npm start
```

สร้าง `JWT_SECRET` แบบสุ่ม:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

เปิดเบราว์เซอร์: <http://localhost:3000> → สมัครสมาชิก → ใช้งานได้เลย
(ช่วง MVP เลือกบทบาทตอนสมัครได้เองเพื่อทดสอบ; รอบจริงจะให้แอดมินกำหนด)

## โครงสร้างหลัก

```
src/
  server.js            จุดเริ่ม Express
  db.js + schema.sql   เชื่อม SQLite + สร้างตาราง
  routes/ controllers/ models/ middleware/
public/                หน้าเว็บ (Bootstrap 5 + ธีม indigo/slate)
data/absence.db        ฐานข้อมูล (สร้างอัตโนมัติตอนรัน, ไม่ commit)
```

## API (รอบนี้)

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/api/auth/register` | ทุกคน |
| POST | `/api/auth/login` | ทุกคน |
| GET  | `/api/auth/me` | ต้องล็อกอิน |
| POST | `/api/requests` | นักเรียน |
| GET  | `/api/requests` | ต้องล็อกอิน (กรองตาม role) |
| GET  | `/api/requests/:id` | ต้องล็อกอิน |

แนบ token ทุก request ที่ต้องล็อกอิน: `Authorization: Bearer <token>`
