// ชุดทดสอบรวม (integration) — สายอนุมัติ 5 ขั้น + สิทธิ์ + แจ้งเตือน + admin
// รัน: npm test  (สตาร์ทแอปบนพอร์ตสุ่ม + ใช้ DB ชั่วคราว)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.JWT_SECRET = 'test-secret-xyz';
process.env.STAFF_SIGNUP_CODE = 'test-code';
const TMP_DB = path.join(os.tmpdir(), 'absence-test-' + process.pid + '.db');
process.env.DB_PATH = TMP_DB;
const CODE = 'test-code';

let server, base;

before(async () => {
  const app = (await import('../src/server.js')).default;
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  if (server) server.close();
  for (const f of [TMP_DB, TMP_DB + '-wal', TMP_DB + '-shm']) {
    try { fs.rmSync(f, { force: true }); } catch { /* ignore */ }
  }
});

async function j(p, { method = 'GET', token, body } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { status: r.status, d };
}
const reg = (b) => j('/api/auth/register', { method: 'POST', body: b });
const login = async (email) => (await j('/api/auth/login', { method: 'POST', body: { email, password: 'pass123' } })).d.token;
async function upload(id, token, name = 'cert.pdf') {
  const fd = new FormData();
  fd.append('file', new Blob([Buffer.from('%PDF-1.4\nx\n%%EOF')], { type: 'application/pdf' }), name);
  const r = await fetch(`${base}/api/requests/${id}/attachments`, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
  return { status: r.status, d: await r.json().catch(() => null) };
}
const dl = (attId, token) => fetch(`${base}/api/attachments/${attId}/download`, token ? { headers: { Authorization: 'Bearer ' + token } } : {}).then((r) => r.status);

// state ใช้ข้ามเทสต์ (รันตามลำดับในไฟล์เดียว)
const ids = {};
const tok = {};

test('health endpoint', async () => {
  assert.equal((await j('/api/health')).status, 200);
});

test('register chain users + grade auto-derive', async () => {
  const mk = async (key, body) => { ids[key] = (await reg(body)).d.user.id; tok[key] = await login(body.email); };
  await mk('adm', { full_name: 'แอดมิน', email: 'a@t.com', password: 'pass123', role: 'admin', staff_code: CODE });
  await mk('home', { full_name: 'ครูประจำชั้น', email: 'h@t.com', password: 'pass123', role: 'homeroom', staff_code: CODE });
  await mk('grade', { full_name: 'หัวหน้าระดับ', email: 'g@t.com', password: 'pass123', role: 'gradehead', grade_level: 'ม.5', staff_code: CODE });
  await mk('dorm', { full_name: 'หัวหน้าหอพัก', email: 'd@t.com', password: 'pass123', role: 'dormhead', grade_level: 'ทุกระดับ', staff_code: CODE });
  await mk('dep', { full_name: 'รองผอ', email: 'dp@t.com', password: 'pass123', role: 'deputy', grade_level: 'ทุกระดับ', staff_code: CODE });
  await mk('pri', { full_name: 'ผอ', email: 'p@t.com', password: 'pass123', role: 'principal', grade_level: 'ทุกระดับ', staff_code: CODE });
  await mk('par', { full_name: 'ผู้ปกครอง', email: 'pa@t.com', password: 'pass123', role: 'parent' });
  const s = await reg({ full_name: 'นักเรียน', email: 's@t.com', password: 'pass123', role: 'student', student_id: '1', class_room: 'ม.5/2' });
  ids.stu = s.d.user.id; tok.stu = await login('s@t.com');
  assert.equal(s.d.user.grade_level, 'ม.5');
});

test('staff role requires correct staff_code', async () => {
  assert.equal((await reg({ full_name: 'x', email: 'x@t.com', password: 'pass123', role: 'principal' })).status, 403);
  assert.equal((await reg({ full_name: 'x', email: 'x@t.com', password: 'pass123', role: 'principal', staff_code: 'wrong' })).status, 403);
});

test('admin pairs student with homeroom + parent', async () => {
  const r = await j('/api/users/' + ids.stu, { method: 'PUT', token: tok.adm, body: { advisor_id: ids.home, parent_id: ids.par } });
  assert.equal(r.status, 200);
  assert.equal(r.d.user.advisor_id, ids.home);
});

test('submit blocked without homeroom; allowed after pairing', async () => {
  const orphan = await reg({ full_name: 'กำพร้า', email: 'o@t.com', password: 'pass123', role: 'student', class_room: 'ม.5/9' });
  const ot = await login('o@t.com');
  assert.equal((await j('/api/requests', { method: 'POST', token: ot, body: { leave_type: 'sick', start_date: '2026-06-20', end_date: '2026-06-20', reason: 'x' } })).status, 409);

  const c = await j('/api/requests', { method: 'POST', token: tok.stu, body: { leave_type: 'sick', start_date: '2026-06-20', end_date: '2026-06-21', reason: 'ป่วย' } });
  assert.equal(c.status, 201);
  assert.equal(c.d.request.current_level, 1);
  ids.req = c.d.request.id;
});

test('attachment upload + scope-based download authorization', async () => {
  const u = await upload(ids.req, tok.stu);
  assert.equal(u.status, 201);
  const attId = u.d.attachment.id;
  assert.equal(await dl(attId, tok.stu), 200);    // เจ้าของ
  assert.equal(await dl(attId, tok.home), 200);   // ครูประจำชั้น (advisor)
  assert.equal(await dl(attId, tok.grade), 200);  // หัวหน้าระดับ ม.5 (in scope)
  assert.equal(await dl(attId, tok.par), 200);    // ผู้ปกครอง
  assert.equal(await dl(attId, null), 401);       // ไม่ล็อกอิน
});

test('5-level chain enforces order + scope', async () => {
  const decide = (token, decision, note) => j(`/api/requests/${ids.req}/decide`, { method: 'PUT', token, body: { decision, note } });
  assert.equal((await decide(tok.grade, 'approved')).status, 403); // ยังไม่ถึงคิว
  assert.equal((await decide(tok.home, 'approved')).d.request.current_level, 2);
  assert.equal((await decide(tok.grade, 'approved')).d.request.current_level, 3);
  assert.equal((await decide(tok.dorm, 'approved')).d.request.current_level, 4);
  assert.equal((await decide(tok.dep, 'approved')).d.request.current_level, 5);
  assert.equal((await decide(tok.pri, 'approved')).d.request.status, 'approved');
  assert.equal((await decide(tok.pri, 'approved')).status, 409); // พิจารณาเสร็จแล้ว
});

test('approved request has 5 recorded steps', async () => {
  const det = await j('/api/requests/' + ids.req, { token: tok.pri });
  assert.equal(det.d.steps.length, 5);
  assert.ok(det.d.steps.every((s) => s.decision === 'approved' && s.approver_name));
});

test('reject terminates with required note', async () => {
  const c = await j('/api/requests', { method: 'POST', token: tok.stu, body: { leave_type: 'personal', start_date: '2026-07-01', end_date: '2026-07-01', reason: 'ธุระ' } });
  assert.equal((await j(`/api/requests/${c.d.request.id}/decide`, { method: 'PUT', token: tok.home, body: { decision: 'rejected' } })).status, 400);
  const r = await j(`/api/requests/${c.d.request.id}/decide`, { method: 'PUT', token: tok.home, body: { decision: 'rejected', note: 'ไม่ครบ' } });
  assert.equal(r.d.request.status, 'rejected');
});

test('access control: non-admin cannot list users; cross-student view blocked', async () => {
  assert.equal((await j('/api/users', { token: tok.home })).status, 403);
  const s2 = await reg({ full_name: 'อื่น', email: 'o2@t.com', password: 'pass123', role: 'student', class_room: 'ม.5/1' });
  const t2 = await login('o2@t.com');
  assert.equal((await j('/api/requests/' + ids.req, { token: t2 })).status, 403);
});

test('admin delete: 409 for referenced, 200 for unreferenced; update re-derives grade', async () => {
  assert.equal((await j('/api/users/' + ids.home, { method: 'DELETE', token: tok.adm })).status, 409);
  const spare = await j('/api/users', { method: 'POST', token: tok.adm, body: { full_name: 'ลบได้', email: 'free@t.com', password: 'pass123', role: 'parent' } });
  assert.equal((await j('/api/users/' + spare.d.user.id, { method: 'DELETE', token: tok.adm })).status, 200);
  const upd = await j('/api/users/' + ids.stu, { method: 'PUT', token: tok.adm, body: { class_room: 'ม.6/1' } });
  assert.equal(upd.d.user.grade_level, 'ม.6');
});

test('notifications: list + mark read', async () => {
  const n = await j('/api/notifications', { token: tok.stu });
  assert.ok(n.d.unread > 0);
  await j('/api/notifications/' + n.d.notifications[0].id + '/read', { method: 'PUT', token: tok.stu });
  assert.equal((await j('/api/notifications', { token: tok.stu })).d.unread, n.d.unread - 1);
});
