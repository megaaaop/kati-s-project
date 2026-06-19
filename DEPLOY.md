# คู่มือนำเว็บขึ้นออนไลน์ (Deploy)

> การ deploy จริงต้องทำผ่านบัญชี hosting ของคุณเอง ไฟล์ในโปรเจกต์เตรียมให้พร้อมแล้ว

## สรุปสั้น
แอปนี้เป็น Node + Express + SQLite รันด้วย `node src/server.js` ที่พอร์ตจาก `PORT`
ตั้งค่าได้ผ่าน environment variables:

| ตัวแปร | จำเป็น | คำอธิบาย |
|---|---|---|
| `JWT_SECRET` | ✅ | คีย์ลับเซ็น token (สุ่มยาวๆ) |
| `STAFF_SIGNUP_CODE` | ✅ | รหัสลับสมัครครู/ผู้บริหาร |
| `PORT` | – | พอร์ต (โฮสต์ส่วนใหญ่กำหนดให้เอง) |
| `DB_PATH` | – | ที่อยู่ไฟล์ DB (ชี้ไป persistent disk) |
| `UPLOAD_DIR` | – | โฟลเดอร์ไฟล์แนบ (ชี้ไป persistent disk) |
| `NODE_ENV` | – | ตั้งเป็น `production` ตอนใช้จริง |
| `SMTP_HOST/PORT/USER/PASS/SECURE`, `MAIL_FROM` | – | ใส่ถ้าต้องการส่งอีเมลจริง (ไม่ใส่ = อีเมลจำลอง log ลง console) |

## ⚠️ เรื่องสำคัญ: เก็บข้อมูลให้ถาวร
SQLite เก็บข้อมูลเป็นไฟล์ ถ้าโฮสต์เป็นแบบ ephemeral (เช่น Render free tier, container ทั่วไป)
ไฟล์จะถูกล้างทุกครั้งที่ deploy/restart → **ข้อมูลหาย**

ทางเลือก:
1. ใช้ **persistent disk** แล้วชี้ `DB_PATH` + `UPLOAD_DIR` ไปที่ disk นั้น (เช่น `/var/data/...`)
2. (ใช้จริงจังขึ้น) ย้ายไป **PostgreSQL** — เป็นงานเฟสถัดไป

---

## วิธีที่ 1 — Render (แนะนำ, มี `render.yaml` ให้แล้ว)
1. push โค้ดขึ้น GitHub: `git remote add origin <repo>` แล้ว `git push -u origin master`
2. ไป <https://render.com> → New → Blueprint → เลือก repo (Render อ่าน `render.yaml`)
3. ตั้งค่า env `STAFF_SIGNUP_CODE` ในหน้า dashboard (ตัวอื่น render.yaml จัดให้)
4. เลือก plan ที่มี disk (free tier ไม่มี disk ถาวร) → Deploy
5. เปิด URL ที่ได้ → สมัครแอดมินคนแรกด้วยรหัสลับ

## วิธีที่ 2 — Railway / โฮสต์ที่รองรับ Docker
- มี `Dockerfile` ให้แล้ว (เก็บ DB/ไฟล์แนบไว้ที่ `/data` — mount volume มาที่นี่)
- ตั้ง env: `JWT_SECRET`, `STAFF_SIGNUP_CODE` (DB_PATH/UPLOAD_DIR ตั้งใน Dockerfile แล้ว)
- รัน: `docker build -t absence . && docker run -p 3000:3000 -v absence-data:/data -e JWT_SECRET=... -e STAFF_SIGNUP_CODE=... absence`

## หลัง deploy
- เปิดเว็บ → **สมัครแอดมินคนแรก** (บทบาท=ผู้ดูแลระบบ + ใส่รหัสลับ)
  - สมัครแอดมินเองได้ "เฉพาะคนแรก" ตอน DB ยังว่าง จากนั้นระบบจะล็อก — แอดมินสร้างบัญชีอื่นผ่านหน้าจัดการผู้ใช้
- จากนั้นสร้าง/จับคู่ ครูประจำชั้น/ผู้ปกครอง/ระดับชั้น ให้นักเรียน
- ตรวจสุขภาพระบบ: `GET /api/health` → `{"ok":true}`

## ความปลอดภัยที่ควรรู้
- **ต้องตั้ง** `JWT_SECRET` และ `STAFF_SIGNUP_CODE` ไม่งั้นแอปจะไม่บูต (fail-fast)
- ตั้ง `STAFF_SIGNUP_CODE` ให้ยาวและสุ่ม แจกเฉพาะบุคลากร (ใช้สมัครครู/ผู้บริหาร)
- มี rate limit กัน brute-force ที่ login/register (in-memory — เหมาะ instance เดียว; ถ้าสเกลหลาย instance ค่อยเปลี่ยนเป็น store กลาง)
- ก่อนใช้จริง: รัน `npm test` ให้ผ่าน
