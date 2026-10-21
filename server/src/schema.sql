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

-- Toʻlovlar (2026-10-21): buyurtma — tanga toʻplami; Payme va Click tranzaksiyalari alohida
CREATE TABLE IF NOT EXISTS orders (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  pack         TEXT NOT NULL,
  coins        INT NOT NULL CHECK (coins > 0),
  amount       INT NOT NULL CHECK (amount > 0),
  provider     TEXT,
  state        TEXT NOT NULL DEFAULT 'new',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at      TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);

-- Payme Merchant API: vaqtlar — millisekund (Payme talabi), summa — tiyin
CREATE TABLE IF NOT EXISTS payme_tx (
  id           BIGSERIAL PRIMARY KEY,
  payme_id     TEXT NOT NULL UNIQUE,
  order_id     BIGINT NOT NULL REFERENCES orders(id),
  payme_time   BIGINT NOT NULL,
  amount       BIGINT NOT NULL,
  state        INT NOT NULL,
  create_time  BIGINT NOT NULL,
  perform_time BIGINT NOT NULL DEFAULT 0,
  cancel_time  BIGINT NOT NULL DEFAULT 0,
  reason       INT
);
CREATE INDEX IF NOT EXISTS payme_tx_order_idx ON payme_tx (order_id);

-- Click Shop API: prepare → complete
CREATE TABLE IF NOT EXISTS click_tx (
  id             BIGSERIAL PRIMARY KEY,
  click_trans_id TEXT NOT NULL UNIQUE,
  order_id       BIGINT NOT NULL REFERENCES orders(id),
  amount         NUMERIC NOT NULL,
  state          TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- oddiy sozlamalar (masalan, Payme ChangePassword bilan almashtirilgan kalit)
CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Multicard (agregator: Uzcard, Humo, Visa, Mastercard, Payme, Click, Uzum): invoys → callback
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ext_id TEXT;
CREATE TABLE IF NOT EXISTS multicard_tx (
  id          BIGSERIAL PRIMARY KEY,
  uuid        TEXT NOT NULL UNIQUE,
  order_id    BIGINT NOT NULL REFERENCES orders(id),
  amount      BIGINT NOT NULL,
  ps          TEXT,
  card_pan    TEXT,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
