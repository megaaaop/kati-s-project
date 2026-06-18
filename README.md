# ระบบยื่นเอกสารลา / ขาดเรียนออนไลน์

เว็บไซต์ให้นักเรียนยื่นใบลาแบบดิจิทัล ครูอนุมัติออนไลน์ ติดตามสถานะได้
(อ้างอิงสเปก: `../absence-system-spec.md`)

## สถานะตอนนี้ — Phase 0 + 1 + 2 ✅

- **Phase 0** วางโครง Node/Express + SQLite (สร้างตารางครบ 4 ตาราง) + Git
- **Phase 1**
  - **F1** สมัคร/ล็อกอินแยกบทบาท — bcrypt + JWT, กันคนไม่ล็อกอิน, ตรวจสิทธิ์ตาม role
  - **F2** ฟอร์มยื่นใบลา — บันทึกลง DB จริง สถานะเริ่มต้น `pending`
- **Phase 2**
  - **F5** ครูอนุมัติ/ปฏิเสธ — รายการคำขอ + หน้ารายละเอียด + ใส่หมายเหตุ, บันทึกผู้รีวิว/เวลา, พิจารณาซ้ำไม่ได้
  - **F3** แนบไฟล์หลักฐาน — JPG/PNG/PDF ≤ 5MB, ตรวจไบต์จริง (ไม่เชื่อนามสกุล), เปิดดูได้เฉพาะเจ้าของ/ครู
  - **F4** ติดตามสถานะ — หน้ารายละเอียดฝั่งนักเรียน เห็นสถานะ + หมายเหตุครู + ประวัติ

> เฟสถัดไป: แจ้งเตือนในเว็บ/อีเมล (F6) + บทบาทผู้ปกครอง + **หน้าแอดมินจัดการผู้ใช้** (เฟส 3) · ทดสอบรวม + deploy (เฟส 4)

## วิธีติดตั้งและรัน

```bash
cd absence-system
npm install
cp .env.example .env          # แล้วใส่ค่า JWT_SECRET และ STAFF_SIGNUP_CODE
npm run dev                   # หรือ npm start
```

สร้างค่าสุ่มสำหรับ `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(6).toString('hex'))"    # STAFF_SIGNUP_CODE
```

เปิดเบราว์เซอร์: <http://localhost:3000> → สมัครสมาชิก → ใช้งานได้เลย

### การสมัครสมาชิก (ชั่วคราวจนกว่าจะมีหน้าแอดมินในเฟส 3)
- **นักเรียน / ผู้ปกครอง** สมัครได้เลย
- **ครู / แอดมิน** ต้องกรอก **รหัสลับ** ที่ตรงกับ `STAFF_SIGNUP_CODE` ใน `.env`
  (แจกรหัสนี้ให้เฉพาะครู/ผู้ดูแล) — กันไม่ให้ใครก็ได้สมัครเป็นครูแล้วเห็นข้อมูลนักเรียนทุกคน

## โครงสร้างหลัก

```
src/
  server.js              จุดเริ่ม Express
  db.js + schema.sql     เชื่อม SQLite + สร้างตาราง
  routes/ controllers/ models/ middleware/   (auth, requests, attachments, upload)
public/                  หน้าเว็บ (Bootstrap 5 + ธีม indigo/slate)
  student/  teacher/     หน้าจอแยกตามบทบาท
uploads/                 ไฟล์แนบ (ไม่ commit)
data/absence.db          ฐานข้อมูล (สร้างอัตโนมัติตอนรัน, ไม่ commit)
```

## API

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/api/auth/register` | ทุกคน (ครู/แอดมินต้องมี staff_code) |
| POST | `/api/auth/login` | ทุกคน |
| GET  | `/api/auth/me` | ต้องล็อกอิน |
| POST | `/api/requests` | นักเรียน |
| GET  | `/api/requests` | ต้องล็อกอิน (กรองตาม role) |
| GET  | `/api/requests/:id` | ต้องล็อกอิน (เจ้าของ/ครู) |
| PUT  | `/api/requests/:id/approve` | ครู |
| PUT  | `/api/requests/:id/reject` | ครู (ต้องมีหมายเหตุ) |
| POST | `/api/requests/:id/attachments` | นักเรียน (เจ้าของ, คำขอ pending) |
| GET  | `/api/attachments/:id/download` | เจ้าของ/ครู/แอดมิน |

แนบ token ทุก request ที่ต้องล็อกอิน: `Authorization: Bearer <token>`
