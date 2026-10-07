// First-run setup: creates the tables and loads the starter menu when the
// database is empty. Safe to run on every cold start — it only ever inserts
// what is missing (INSERT OR IGNORE), so dashboard edits are never overwritten.
import schemaSql from '../migrations/0001_schema.sql';
import seed from '../public/data/menu.json';

let ready = false;

function statements(sql) {
  return sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export async function ensureSeeded(env) {
  if (ready) return;
  const has = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'categories'").first();
  if (!has) await env.DB.batch(statements(schemaSql).map((s) => env.DB.prepare(s)));

  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM categories').first();
  if (!row?.n) {
    const now = Math.floor(Date.now() / 1000);
    const stmts = [];
    for (const c of seed.categories) {
      stmts.push(env.DB.prepare('INSERT OR IGNORE INTO categories (id,name_ar,name_en,tagline_ar,tagline_en,sort,allows_combo,allows_addons,active) VALUES (?,?,?,?,?,?,?,?,1)')
        .bind(c.id, c.name_ar, c.name_en, c.tagline_ar || '', c.tagline_en || '', c.sort || 0, c.allows_combo ? 1 : 0, c.allows_addons ? 1 : 0));
    }
    for (const i of seed.items) {
      stmts.push(env.DB.prepare('INSERT OR IGNORE INTO items (id,category_id,name_ar,name_en,desc_ar,desc_en,note_ar,note_en,image,sizes,tags,featured,sold_out,is_addon,active,sort,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)')
        .bind(i.id, i.category_id, i.name_ar, i.name_en, i.desc_ar || '', i.desc_en || '', i.note_ar || '', i.note_en || '', i.image || '',
          JSON.stringify(i.sizes), JSON.stringify(i.tags || []), i.featured ? 1 : 0, i.sold_out ? 1 : 0, i.is_addon ? 1 : 0, i.sort || 0, now));
    }
    for (const b of seed.branches) {
      stmts.push(env.DB.prepare('INSERT OR IGNORE INTO branches (id,name_ar,name_en,address_ar,address_en,phone,whatsapp,maps_url,rating,reviews,open_time,close_time,delivery,accepting,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(b.id, b.name_ar, b.name_en, b.address_ar, b.address_en, b.phone, b.whatsapp, b.maps_url, b.rating, b.reviews, b.open_time, b.close_time, b.delivery, b.accepting, b.sort));
    }
    for (const [k, v] of Object.entries(seed.settings)) {
      stmts.push(env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').bind(k, String(v)));
    }
    // Tell `wrangler d1 migrations apply` these already ran, so it never re-seeds over live edits.
    stmts.push(env.DB.prepare('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)'));
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_schema.sql'), ('0002_seed.sql')"));
    await env.DB.batch(stmts);
  }
  ready = true;
}
