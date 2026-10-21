-- Archemistry Lab server: hisob, tanga daftari, eksport, haftalik sinovlar.
-- Har bir migratsiya idempotent: qayta ishga tushirish xavfsiz.

CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT UNIQUE,
  phone       TEXT UNIQUE,
  lang        TEXT NOT NULL DEFAULT 'uz',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- bir martalik kirish kodlari (kodning oʻzi emas, xeshi saqlanadi)
CREATE TABLE IF NOT EXISTS otp (
  id          BIGSERIAL PRIMARY KEY,
  target      TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_target_idx ON otp (target, created_at DESC);

-- sessiyalar: brauzerdagi tokenning xeshi
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tanga daftari: balans = SUM(delta). Yozuvlar oʻchirilmaydi va oʻzgartirilmaydi.
-- (user_id, reason, ref) — takroriy yozuvdan himoya (masalan, toʻlov xabari ikki marta kelsa)
CREATE TABLE IF NOT EXISTS ledger (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  delta       INT NOT NULL CHECK (delta <> 0),
  reason      TEXT NOT NULL,
  ref         TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason, ref)
);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON ledger (user_id, created_at DESC);

-- toʻlangan eksportlar: shu holatni (state_hash) shu toʻplamda qayta yuklash bepul
CREATE TABLE IF NOT EXISTS exports (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  bundle      TEXT NOT NULL,
  state_hash  TEXT NOT NULL,
  coins       INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, bundle, state_hash)
);

-- haftalik bepul sinovlar (hafta — Toshkent vaqti boʻyicha dushanbadan)
CREATE TABLE IF NOT EXISTS trials (
  user_id     BIGINT NOT NULL REFERENCES users(id),
  week        TEXT NOT NULL,
  used        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week)
);

-- Google bilan kirish (2026-10-21): Google hisob identifikatori va koʻrinadigan ism
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users (google_sub);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
