-- โครงสร้างฐานข้อมูลทั้งหมด (ตาม spec §6) — สร้างครบ 4 ตารางตั้งแต่ Phase 0
-- ใช้ IF NOT EXISTS เพื่อให้รันซ้ำได้ ไม่ต้อง migrate ตอนต่อยอดเฟสหลัง

-- ผู้ใช้ทุกบทบาท
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','teacher','admin','parent')),
  student_id    TEXT,
  class_room    TEXT,
  advisor_id    INTEGER REFERENCES users(id),
  parent_id     INTEGER REFERENCES users(id),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- คำขอลา/ขาดเรียน
CREATE TABLE IF NOT EXISTS leave_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL REFERENCES users(id),
  leave_type   TEXT NOT NULL CHECK (leave_type IN ('sick','personal','activity')),
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  teacher_note TEXT,
  reviewed_by  INTEGER REFERENCES users(id),
  reviewed_at  DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ไฟล์แนบหลักฐาน (จะใช้งานจริงในเฟส 2)
CREATE TABLE IF NOT EXISTS attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL REFERENCES leave_requests(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- การแจ้งเตือน (จะใช้งานจริงในเฟส 3)
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  request_id INTEGER REFERENCES leave_requests(id),
  message    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
