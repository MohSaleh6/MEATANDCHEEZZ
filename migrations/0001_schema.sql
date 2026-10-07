-- Meat & Cheezz — D1 schema
-- Money is stored as INTEGER fils (1 JD = 1000 fils).

CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  tagline_ar    TEXT NOT NULL DEFAULT '',
  tagline_en    TEXT NOT NULL DEFAULT '',
  sort          INTEGER NOT NULL DEFAULT 0,
  allows_combo  INTEGER NOT NULL DEFAULT 0,
  allows_addons INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS items (
  id          TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  desc_ar     TEXT NOT NULL DEFAULT '',
  desc_en     TEXT NOT NULL DEFAULT '',
  note_ar     TEXT NOT NULL DEFAULT '',
  note_en     TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL DEFAULT '',
  sizes       TEXT NOT NULL DEFAULT '[]',   -- JSON: [{id, ar, en, price}]
  tags        TEXT NOT NULL DEFAULT '[]',   -- JSON: ["spicy","grilled","signature","new"]
  featured    INTEGER NOT NULL DEFAULT 0,
  sold_out    INTEGER NOT NULL DEFAULT 0,   -- sold out everywhere
  is_addon    INTEGER NOT NULL DEFAULT 0,   -- offered as a burger add-on
  active      INTEGER NOT NULL DEFAULT 1,   -- hidden from the site when 0
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id, sort);

CREATE TABLE IF NOT EXISTS branches (
  id         TEXT PRIMARY KEY,
  name_ar    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  address_ar TEXT NOT NULL DEFAULT '',
  address_en TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  whatsapp   TEXT NOT NULL DEFAULT '',
  maps_url   TEXT NOT NULL DEFAULT '',
  rating     REAL NOT NULL DEFAULT 0,
  reviews    INTEGER NOT NULL DEFAULT 0,
  open_time  TEXT NOT NULL DEFAULT '12:00',
  close_time TEXT NOT NULL DEFAULT '02:00',
  delivery   INTEGER NOT NULL DEFAULT 1,
  accepting  INTEGER NOT NULL DEFAULT 1,
  sort       INTEGER NOT NULL DEFAULT 0
);

-- Per-branch "sold out" overrides
CREATE TABLE IF NOT EXISTS item_availability (
  item_id   TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sold_out  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, branch_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Photos uploaded from the dashboard (already resized to WebP in the browser)
CREATE TABLE IF NOT EXISTS images (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       BLOB NOT NULL,
  size       INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Orders sent to WhatsApp from the site (for the dashboard stats)
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  branch_id     TEXT NOT NULL,
  mode          TEXT NOT NULL,           -- pickup | delivery
  customer_name TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  total         INTEGER NOT NULL DEFAULT 0,
  items         TEXT NOT NULL DEFAULT '[]',
  lang          TEXT NOT NULL DEFAULT 'ar',
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip           TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL DEFAULT 0
);
