# คู่มือ Deploy: Supabase (Postgres + Storage) + Vercel

> branch นี้ (`phase6-supabase`) ใช้ Postgres ของ Supabase + รันบน Vercel แบบ serverless
> (เวอร์ชัน SQLite + Render อยู่บน branch `master`)

## สถาปัตยกรรม
- **Vercel** = หน้าเว็บ (static `public/`) + API (Express รันเป็น serverless function ที่ `api/index.js`)
- **Supabase** = ฐานข้อมูล Postgres (ข้อมูลถาวร) + Storage (ไฟล์แนบ)
- โค้ดเลือกอัตโนมัติ: มี `DATABASE_URL` → ใช้ Postgres จริง; ไม่มี → ใช้ pglite (in-memory, สำหรับ dev/test)

---

## ขั้น A — ตั้งค่า Supabase
1. [supabase.com](https://supabase.com) → **New project** → ตั้งชื่อ + ตั้ง **Database Password** (จดไว้) + region `Southeast Asia (Singapore)`
2. รอ provision เสร็จ (~2 นาที)
3. **สร้างตาราง:** เมนู **SQL Editor** → New query → วางเนื้อหาทั้งหมดของ `src/schema.postgres.sql` → **Run**
4. **สร้างที่เก็บไฟล์:** เมนู **Storage** → **New bucket** → ชื่อ `attachments` → **Private** → Create
5. **เก็บค่า 3 ตัว** (เมนู **Project Settings**):
   - `DATABASE_URL` — **Database → Connection string → "Connection pooling"** (Transaction mode, พอร์ต **6543**) → คัดลอก URI แล้วแทน `[YOUR-PASSWORD]` ด้วยรหัส DB
   - `SUPABASE_URL` — **API → Project URL**
   - `SUPABASE_SERVICE_KEY` — **API → Project API keys → `service_role`** (ลับมาก)

## ขั้น B — Deploy บน Vercel
1. push branch ขึ้น GitHub: `git push -u origin phase6-supabase`
2. [vercel.com](https://vercel.com) → **Add New → Project** → import repo `megaaaop/kati-s-project`
3. ตั้ง **Production Branch = `phase6-supabase`** (หรือ merge เข้า `master` ก่อนแล้ว deploy `master`)
4. ใส่ **Environment Variables**:

| Key | ค่า |
|---|---|
| `JWT_SECRET` | (ค่าสุ่มยาวๆ) |
| `STAFF_SIGNUP_CODE` | เช่น `kru-la-2026` |
| `DATABASE_URL` | (จากขั้น A.5 — แบบ pooler 6543) |
| `SUPABASE_URL` | (จากขั้น A.5) |
| `SUPABASE_SERVICE_KEY` | (จากขั้น A.5) |
| `SUPABASE_BUCKET` | `attachments` |
| `NODE_ENV` | `production` |

5. **Deploy** → ได้ URL `https://xxxx.vercel.app`

## ขั้น C — หลัง deploy
- เปิด URL → สมัคร **แอดมินคนแรก** (บทบาท=ผู้ดูแลระบบ + รหัสลับ) → จับคู่ครู/นักเรียน
- เช็ก `URL/api/health` → `{"ok":true}`
- ข้อมูล/ไฟล์อยู่ถาวรใน Supabase แล้ว (ไม่หายตอน redeploy) ✓

## ข้อควรรู้ด้านความปลอดภัย/ปฏิบัติการ
- **ต้องตั้ง env ให้ครบ** — ถ้าขาด `JWT_SECRET`/`STAFF_SIGNUP_CODE`/`DATABASE_URL` แอปจะ throw ตอนเริ่ม (ทุก route ขึ้น 500) ดู log ของ Vercel จะเห็นสาเหตุชัด (จงใจให้ fail เร็ว ไม่แอบรันด้วยข้อมูลชั่วคราว)
- **Rate limiter เป็นแบบ in-memory ต่อ instance** — บน Vercel ที่มีหลาย instance การจำกัด login/register จะเป็น "best-effort" (กันได้ระดับหนึ่ง ไม่เป๊ะข้าม instance) เพราะรหัสผ่านยัง hash ด้วย bcrypt อยู่แล้ว ถ้าต้องการเข้มกว่านี้ค่อยย้าย limiter ไปเก็บใน Postgres/Redis
- **TLS ฐานข้อมูล** — ค่าเริ่มต้นเข้ารหัสการเชื่อมต่อแต่ไม่ตรวจใบรับรอง (ใช้ได้กับ Supabase ทันที) ถ้าต้องการตรวจ cert เต็มรูปแบบ ตั้ง `PG_CA_CERT` เป็นเนื้อหา CA ของ Supabase (Project Settings → Database → SSL)

## รัน/ทดสอบในเครื่อง
- `npm run dev` (ไม่มี DATABASE_URL → pglite in-memory, รีสตาร์ตแล้วข้อมูลหาย — เหมาะลองเล่น)
- `npm test` → 17 เทสต์ (รันบน pglite อัตโนมัติ)
- อยากต่อ Supabase จริงในเครื่อง: ใส่ `DATABASE_URL` + `SUPABASE_*` ใน `.env`
