// ที่เก็บไฟล์แนบ (Phase 6) — Supabase Storage (prod) / in-memory (test) / local disk (dev)
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const BUCKET = process.env.SUPABASE_BUCKET || 'attachments';
const LOCAL_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const mode = useSupabase ? 'supabase' : (process.env.NODE_ENV === 'test' ? 'memory' : 'local');

let supabase;
const mem = new Map();
if (mode === 'supabase') {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
} else if (mode === 'local') {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

// สร้าง object key แบบสุ่ม + นามสกุล
function newKey(ext) {
  return crypto.randomBytes(16).toString('hex') + (ext || '');
}

async function put(key, buffer, contentType) {
  if (mode === 'supabase') {
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, { contentType, upsert: false });
    if (error) throw new Error('อัปโหลดไฟล์ไม่สำเร็จ: ' + error.message);
  } else if (mode === 'memory') {
    mem.set(key, buffer);
  } else {
    fs.writeFileSync(path.join(LOCAL_DIR, path.basename(key)), buffer);
  }
}

async function get(key) {
  if (mode === 'supabase') {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) throw new Error('ไม่พบไฟล์');
    return Buffer.from(await data.arrayBuffer());
  } else if (mode === 'memory') {
    const b = mem.get(key);
    if (!b) throw new Error('ไม่พบไฟล์');
    return b;
  } else {
    const p = path.join(LOCAL_DIR, path.basename(key));
    if (!fs.existsSync(p)) throw new Error('ไม่พบไฟล์');
    return fs.readFileSync(p);
  }
}

module.exports = { put, get, newKey, mode };
