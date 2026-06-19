-- โครงสร้างฐานข้อมูล (ปรับตาม Revision §13: สายอนุมัติหลายขั้น)
-- ใช้ IF NOT EXISTS เพื่อให้รันซ้ำได้

-- ผู้ใช้ทุกบทบาท
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN
                  ('student','parent','homeroom','gradehead','dormhead','deputy','principal','admin')),
  student_id    TEXT,
  class_room    TEXT,
  grade_level   TEXT,        -- นักเรียน: ระดับชั้นตน (เช่น ม.5); ผู้อนุมัติขั้น 2-4: ระดับที่ดูแล หรือ 'ทุกระดับ'
  advisor_id    INTEGER REFERENCES users(id),  -- ครูประจำชั้นของนักเรียน (ผู้อนุมัติขั้น 1)
  parent_id     INTEGER REFERENCES users(id),  -- ผู้ปกครองของนักเรียน
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- คำขอลา/ขาดเรียน
CREATE TABLE IF NOT EXISTS leave_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES users(id),
  leave_type    TEXT NOT NULL CHECK (leave_type IN ('sick','personal','activity')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  current_level INTEGER NOT NULL DEFAULT 1,   -- ขั้นที่กำลังพิจารณา (1-4)
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ประวัติการตัดสินแต่ละขั้นของสายอนุมัติ
CREATE TABLE IF NOT EXISTS approval_steps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL REFERENCES leave_requests(id),
  level       INTEGER NOT NULL,
  role        TEXT NOT NULL,
  approver_id INTEGER NOT NULL REFERENCES users(id),
  decision    TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  note        TEXT,
  decided_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ไฟล์แนบหลักฐาน
CREATE TABLE IF NOT EXISTS attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL REFERENCES leave_requests(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- การแจ้งเตือน (F6)
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  request_id INTEGER REFERENCES leave_requests(id),
  message    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_requests_level ON leave_requests(current_level, status);
CREATE INDEX IF NOT EXISTS idx_steps_request ON approval_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
