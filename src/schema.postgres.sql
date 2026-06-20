-- โครงสร้างฐานข้อมูลสำหรับ PostgreSQL (Supabase) — Phase 6
-- ใช้กับ pglite (เทสต์/ดev) และ Supabase Postgres (prod) ได้เหมือนกัน

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN
                  ('student','parent','homeroom','gradehead','dormhead','deputy','principal','admin')),
  student_id    TEXT,
  class_room    TEXT,
  grade_level   TEXT,
  advisor_id    INTEGER REFERENCES users(id),
  parent_id     INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES users(id),
  leave_type    TEXT NOT NULL CHECK (leave_type IN ('sick','personal','activity','dorm_stay')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  current_level INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id          SERIAL PRIMARY KEY,
  request_id  INTEGER NOT NULL REFERENCES leave_requests(id),
  level       INTEGER NOT NULL,
  role        TEXT NOT NULL,
  approver_id INTEGER NOT NULL REFERENCES users(id),
  decision    TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  note        TEXT,
  decided_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id          SERIAL PRIMARY KEY,
  request_id  INTEGER NOT NULL REFERENCES leave_requests(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,         -- object key ใน Supabase Storage (หรือชื่อไฟล์ใน local)
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  request_id INTEGER REFERENCES leave_requests(id),
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_requests_level ON leave_requests(current_level, status);
CREATE INDEX IF NOT EXISTS idx_steps_request ON approval_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
