// ตัวจำกัดอัตราแบบง่าย (in-memory) — เหมาะกับ deploy instance เดียว (โรงเรียน)
// หมายเหตุ: นับในหน่วยความจำ จะรีเซ็ตเมื่อรีสตาร์ต และไม่แชร์ข้ามหลาย instance
const buckets = new Map();

function rateLimit({ windowMs, max, message, key }) {
  return (req, res, next) => {
    // ปิดในโหมดทดสอบ เพื่อไม่ให้เทสต์สะดุด
    if (process.env.NODE_ENV === 'test') return next();

    const k = (key ? key(req) : (req.ip || 'x')) + '|' + req.path;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || now > b.reset) {
      b = { count: 0, reset: now + windowMs };
      buckets.set(k, b);
    }
    b.count++;
    if (b.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((b.reset - now) / 1000)));
      return res.status(429).json({ error: message || 'พยายามบ่อยเกินไป กรุณาลองใหม่ภายหลัง' });
    }
    next();
  };
}

// ล้าง bucket หมดอายุเป็นระยะ (กันหน่วยความจำบวม) — unref ไม่ให้ค้างโปรเซส
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}, 10 * 60 * 1000);
if (sweeper.unref) sweeper.unref();

module.exports = { rateLimit };
