// Meat & Cheezz — Cloudflare Worker
// Serves the JSON API (+ uploaded photos). Everything else is static assets from /public.
import { HttpError, json, errorResponse, readJson, str, int, bool, slug, parseJsonColumn } from './http.js';
import { createSession, sessionCookie, clearCookie, isAuthed, requireAdmin, checkPassword } from './auth.js';
import { ensureSeeded } from './seed.js';

const AMMAN_OFFSET = 3 * 3600; // Jordan is UTC+3 all year
const TAGS = ['spicy', 'grilled', 'signature', 'new'];
const SETTINGS_KEYS = {
  combo_price: 'int',
  google_rating: 'text',
  google_reviews: 'int',
  delivery_note_ar: 'text',
  delivery_note_en: 'text',
  announcement_ar: 'text',
  announcement_en: 'text',
  instagram: 'url',
  tiktok: 'url',
  facebook: 'url',
  talabat: 'url',
  orders_enabled: 'bool',
};
const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'];
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        await ensureSeeded(env);
        return await api(request, env, ctx, url);
      }
      if (url.pathname.startsWith('/img/u/')) {
        await ensureSeeded(env);
        return await serveImage(env, url.pathname.slice(7));
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      return errorResponse(err);
    }
  },
};

// ─── Router ─────────────────────────────────────────────────────────

async function api(request, env, ctx, url) {
  const { pathname } = url;
  const method = request.method;
  const parts = pathname.split('/').filter(Boolean); // ['api', ...]

  if (pathname === '/api/menu' && method === 'GET') {
    return json(await publicMenu(env), { cache: 'public, max-age=15, stale-while-revalidate=120' });
  }
  if (pathname === '/api/orders' && method === 'POST') return createOrder(request, env);

  if (parts[1] !== 'admin') throw new HttpError(404, 'Not found');

  // ── auth endpoints
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await readJson(request, 2048);
    if (!(await checkPassword(request, env, body.password))) throw new HttpError(401, 'Wrong password');
    return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(await createSession(env), request) } });
  }
  if (pathname === '/api/admin/logout' && method === 'POST') {
    return json({ ok: true }, { headers: { 'set-cookie': clearCookie() } });
  }
  if (pathname === '/api/admin/me' && method === 'GET') {
    return json({ ok: true, authed: await isAuthed(request, env), configured: Boolean(env.ADMIN_PASSWORD) });
  }

  await requireAdmin(request, env);
  const [, , resource, id, sub] = parts;

  switch (resource) {
    case 'menu':
      if (method === 'GET') return json(await adminMenu(env));
      break;
    case 'items':
      if (!id && method === 'POST') return json(await saveItem(env, null, await readJson(request)));
      if (id && sub === 'availability' && method === 'PUT') return json(await setAvailability(env, id, await readJson(request)));
      if (id && !sub && method === 'PUT') return json(await saveItem(env, id, await readJson(request)));
      if (id && !sub && method === 'PATCH') return json(await patchItem(env, id, await readJson(request)));
      if (id && !sub && method === 'DELETE') return json(await deleteItem(env, id));
      break;
    case 'categories':
      if (!id && method === 'POST') return json(await saveCategory(env, null, await readJson(request)));
      if (id && method === 'PUT') return json(await saveCategory(env, id, await readJson(request)));
      if (id && method === 'DELETE') return json(await deleteCategory(env, id));
      break;
    case 'branches':
      if (id && method === 'PUT') return json(await saveBranch(env, id, await readJson(request)));
      break;
    case 'settings':
      if (method === 'PUT') return json(await saveSettings(env, await readJson(request)));
      break;
    case 'images':
      if (method === 'POST') return json(await uploadImage(request, env));
      break;
    case 'orders':
      if (method === 'GET') return json(await listOrders(env, url));
      break;
    case 'stats':
      if (method === 'GET') return json(await stats(env, url));
      break;
  }
  throw new HttpError(404, 'Not found');
}

// ─── Reads ──────────────────────────────────────────────────────────

function rowToItem(r) {
  return {
    ...r,
    sizes: parseJsonColumn(r.sizes, []),
    tags: parseJsonColumn(r.tags, []),
  };
}

async function loadAll(env) {
  const [cats, items, branches, avail, settings] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM categories ORDER BY sort, id'),
    env.DB.prepare('SELECT * FROM items ORDER BY sort, id'),
    env.DB.prepare('SELECT * FROM branches ORDER BY sort, id'),
    env.DB.prepare('SELECT item_id, branch_id FROM item_availability WHERE sold_out = 1'),
    env.DB.prepare('SELECT key, value FROM settings'),
  ]);
  const unavailable = {};
  for (const a of avail.results) (unavailable[a.item_id] ||= []).push(a.branch_id);
  return {
    categories: cats.results,
    items: items.results.map((r) => ({ ...rowToItem(r), unavailable: unavailable[r.id] || [] })),
    branches: branches.results,
    settings: Object.fromEntries(settings.results.map((s) => [s.key, s.value])),
  };
}

async function publicMenu(env) {
  const all = await loadAll(env);
  const activeCats = all.categories.filter((c) => c.active);
  const catIds = new Set(activeCats.map((c) => c.id));
  return {
    version: Date.now(),
    categories: activeCats.map(({ active, ...c }) => c),
    items: all.items.filter((i) => i.active && catIds.has(i.category_id)).map(({ active, updated_at, ...i }) => i),
    branches: all.branches,
    settings: all.settings,
  };
}

async function adminMenu(env) {
  return { ok: true, ...(await loadAll(env)) };
}

// ─── Items ──────────────────────────────────────────────────────────

function validateSizes(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 8) {
    throw new HttpError(400, 'An item needs between 1 and 8 sizes');
  }
  const seen = new Set();
  return input.map((s, i) => {
    let id = str(s.id, { max: 24, field: `size ${i + 1} id` }).toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!id) id = `s${i + 1}`;
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    return {
      id,
      ar: str(s.ar, { max: 40, required: true, field: `size ${i + 1} Arabic label` }),
      en: str(s.en, { max: 40, required: true, field: `size ${i + 1} English label` }),
      price: int(s.price, { min: 0, max: 1_000_000, field: `size ${i + 1} price` }),
    };
  });
}

function validateImagePath(v) {
  const s = str(v, { max: 300, field: 'image' });
  if (s && !/^\/img\/[a-z0-9/_.-]+$/i.test(s)) throw new HttpError(400, 'Image must be an uploaded photo');
  return s;
}

async function saveItem(env, id, body) {
  const isNew = !id;
  const itemId = isNew ? slug(body.id, 'item id') : id;
  const category_id = slug(body.category_id, 'category');
  const cat = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(category_id).first();
  if (!cat) throw new HttpError(400, 'Unknown category');

  if (isNew) {
    const exists = await env.DB.prepare('SELECT id FROM items WHERE id = ?').bind(itemId).first();
    if (exists) throw new HttpError(409, 'An item with this id already exists');
  } else {
    const exists = await env.DB.prepare('SELECT id FROM items WHERE id = ?').bind(itemId).first();
    if (!exists) throw new HttpError(404, 'Item not found');
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => TAGS.includes(t)) : [];
  const row = {
    id: itemId,
    category_id,
    name_ar: str(body.name_ar, { max: 80, required: true, field: 'Arabic name' }),
    name_en: str(body.name_en, { max: 80, required: true, field: 'English name' }),
    desc_ar: str(body.desc_ar, { max: 400, field: 'Arabic description' }),
    desc_en: str(body.desc_en, { max: 400, field: 'English description' }),
    note_ar: str(body.note_ar, { max: 60, field: 'Arabic note' }),
    note_en: str(body.note_en, { max: 60, field: 'English note' }),
    image: validateImagePath(body.image),
    sizes: JSON.stringify(validateSizes(body.sizes)),
    tags: JSON.stringify([...new Set(tags)]),
    featured: bool(body.featured),
    sold_out: bool(body.sold_out),
    is_addon: bool(body.is_addon),
    active: body.active === undefined ? 1 : bool(body.active),
    sort: int(body.sort, { min: 0, max: 100000, field: 'sort', fallback: 0 }),
    updated_at: Math.floor(Date.now() / 1000),
  };
  if (isNew && !body.sort) {
    const max = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM items WHERE category_id = ?').bind(category_id).first();
    row.sort = (max?.m || 0) + 10;
  }
  const cols = Object.keys(row);
  await env.DB.prepare(
    `INSERT INTO items (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
     ON CONFLICT(id) DO UPDATE SET ${cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(',')}`,
  ).bind(...Object.values(row)).run();
  const saved = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(itemId).first();
  return { ok: true, item: rowToItem(saved) };
}

async function patchItem(env, id, body) {
  const allowed = ['featured', 'sold_out', 'active'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (k in body) {
      sets.push(`${k} = ?`);
      vals.push(bool(body[k]));
    }
  }
  if ('sort' in body) {
    sets.push('sort = ?');
    vals.push(int(body.sort, { min: 0, max: 100000, field: 'sort' }));
  }
  if (!sets.length) throw new HttpError(400, 'Nothing to update');
  sets.push('updated_at = ?');
  vals.push(Math.floor(Date.now() / 1000));
  const res = await env.DB.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
  if (!res.meta.changes) throw new HttpError(404, 'Item not found');
  return { ok: true };
}

async function setAvailability(env, itemId, body) {
  const branchId = slug(body.branch_id, 'branch');
  const [item, branch] = await Promise.all([
    env.DB.prepare('SELECT id FROM items WHERE id = ?').bind(itemId).first(),
    env.DB.prepare('SELECT id FROM branches WHERE id = ?').bind(branchId).first(),
  ]);
  if (!item || !branch) throw new HttpError(404, 'Item or branch not found');
  await env.DB.prepare(
    'INSERT INTO item_availability (item_id, branch_id, sold_out) VALUES (?, ?, ?) ON CONFLICT(item_id, branch_id) DO UPDATE SET sold_out = excluded.sold_out',
  ).bind(itemId, branchId, bool(body.sold_out)).run();
  return { ok: true };
}

async function deleteItem(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM item_availability WHERE item_id = ?').bind(id),
    env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id),
  ]);
  return { ok: true };
}

// ─── Categories ─────────────────────────────────────────────────────

async function saveCategory(env, id, body) {
  const catId = id || slug(body.id, 'category id');
  if (!id) {
    const exists = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(catId).first();
    if (exists) throw new HttpError(409, 'A category with this id already exists');
  }
  const row = {
    id: catId,
    name_ar: str(body.name_ar, { max: 60, required: true, field: 'Arabic name' }),
    name_en: str(body.name_en, { max: 60, required: true, field: 'English name' }),
    tagline_ar: str(body.tagline_ar, { max: 120, field: 'Arabic tagline' }),
    tagline_en: str(body.tagline_en, { max: 120, field: 'English tagline' }),
    sort: int(body.sort, { min: 0, max: 100000, field: 'sort', fallback: 0 }),
    allows_combo: bool(body.allows_combo),
    allows_addons: bool(body.allows_addons),
    active: body.active === undefined ? 1 : bool(body.active),
  };
  const cols = Object.keys(row);
  await env.DB.prepare(
    `INSERT INTO categories (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
     ON CONFLICT(id) DO UPDATE SET ${cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(',')}`,
  ).bind(...Object.values(row)).run();
  return { ok: true, category: row };
}

async function deleteCategory(env, id) {
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM items WHERE category_id = ?').bind(id).first();
  if (count?.n) throw new HttpError(409, 'Move or delete the items in this category first');
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return { ok: true };
}

// ─── Branches & settings ────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function saveBranch(env, id, body) {
  const exists = await env.DB.prepare('SELECT id FROM branches WHERE id = ?').bind(id).first();
  if (!exists) throw new HttpError(404, 'Branch not found');
  const whatsapp = str(body.whatsapp, { max: 20, required: true, field: 'WhatsApp number' }).replace(/\D/g, '');
  if (whatsapp.length < 8 || whatsapp.length > 15) throw new HttpError(400, 'WhatsApp number must be in international format, e.g. 962788600111');
  const maps = str(body.maps_url, { max: 500, field: 'Maps link' });
  if (maps && !/^https:\/\//.test(maps)) throw new HttpError(400, 'Maps link must start with https://');
  const open = str(body.open_time, { max: 5, required: true, field: 'Opening time' });
  const close = str(body.close_time, { max: 5, required: true, field: 'Closing time' });
  if (!TIME_RE.test(open) || !TIME_RE.test(close)) throw new HttpError(400, 'Times must look like 12:00');
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) throw new HttpError(400, 'Rating must be between 0 and 5');

  const row = {
    name_ar: str(body.name_ar, { max: 60, required: true, field: 'Arabic name' }),
    name_en: str(body.name_en, { max: 60, required: true, field: 'English name' }),
    address_ar: str(body.address_ar, { max: 160, field: 'Arabic address' }),
    address_en: str(body.address_en, { max: 160, field: 'English address' }),
    phone: str(body.phone, { max: 24, field: 'Phone' }),
    whatsapp,
    maps_url: maps,
    rating: Math.round(rating * 10) / 10,
    reviews: int(body.reviews, { min: 0, max: 10_000_000, field: 'Reviews', fallback: 0 }),
    open_time: open,
    close_time: close,
    delivery: bool(body.delivery),
    accepting: bool(body.accepting),
  };
  await env.DB.prepare(`UPDATE branches SET ${Object.keys(row).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
    .bind(...Object.values(row), id).run();
  return { ok: true, branch: { id, ...row } };
}

async function saveSettings(env, body) {
  const stmts = [];
  for (const [key, type] of Object.entries(SETTINGS_KEYS)) {
    if (!(key in body)) continue;
    let value;
    if (type === 'int') value = String(int(body[key], { min: 0, max: 10_000_000, field: key }));
    else if (type === 'bool') value = String(bool(body[key]));
    else if (type === 'url') {
      value = str(body[key], { max: 300, field: key });
      if (value && !/^https:\/\//.test(value)) throw new HttpError(400, `${key} must start with https://`);
    } else value = str(body[key], { max: 300, field: key });
    if (key === 'google_rating' && value && !/^\d(\.\d)?$/.test(value)) throw new HttpError(400, 'Rating looks like 4.9');
    stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value));
  }
  if (!stmts.length) throw new HttpError(400, 'Nothing to update');
  await env.DB.batch(stmts);
  return { ok: true };
}

// ─── Images ─────────────────────────────────────────────────────────

async function uploadImage(request, env) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!IMAGE_TYPES.includes(type)) throw new HttpError(415, 'Upload a WebP, JPEG, PNG or AVIF image');
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) throw new HttpError(400, 'Empty file');
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image is larger than 1.5 MB');
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await env.DB.prepare('INSERT INTO images (id, mime, data, size, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, type, buf, buf.byteLength, Math.floor(Date.now() / 1000)).run();
  return { ok: true, url: `/img/u/${id}` };
}

async function serveImage(env, id) {
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT mime, data FROM images WHERE id = ?').bind(id).first();
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      'content-type': row.mime,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}

// ─── Orders ─────────────────────────────────────────────────────────

const ORDER_ID_RE = /^MC-[A-Z0-9]{4,8}$/;

// Light per-IP throttle so the public order log can't be flooded (reuses the attempts table).
async function throttleOrders(request, env) {
  const key = `order:${request.headers.get('cf-connecting-ip') || 'local'}`;
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT count, window_start FROM login_attempts WHERE ip = ?').bind(key).first();
  if (row && now - row.window_start < 600) {
    if (row.count >= 30) throw new HttpError(429, 'Too many orders, slow down');
    await env.DB.prepare('UPDATE login_attempts SET count = count + 1 WHERE ip = ?').bind(key).run();
  } else {
    await env.DB.prepare('INSERT OR REPLACE INTO login_attempts (ip, count, window_start) VALUES (?, 1, ?)').bind(key, now).run();
  }
}

async function createOrder(request, env) {
  await throttleOrders(request, env);
  const body = await readJson(request, 32 * 1024);
  const id = str(body.id, { max: 12, required: true, field: 'order id' }).toUpperCase();
  if (!ORDER_ID_RE.test(id)) throw new HttpError(400, 'Bad order id');

  const branch_id = slug(body.branch_id, 'branch');
  const mode = body.mode === 'delivery' ? 'delivery' : 'pickup';
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length || lines.length > 60) throw new HttpError(400, 'Order must have 1–60 lines');

  const all = await loadAll(env);
  if (!all.branches.some((b) => b.id === branch_id)) throw new HttpError(400, 'Unknown branch');
  const items = Object.fromEntries(all.items.filter((i) => i.active).map((i) => [i.id, i]));
  const cats = Object.fromEntries(all.categories.map((c) => [c.id, c]));
  const comboPrice = Number(all.settings.combo_price || 0);

  let total = 0;
  const priced = lines.map((l) => {
    const item = items[l.item_id];
    if (!item) throw new HttpError(409, `Item no longer available: ${String(l.item_id).slice(0, 40)}`);
    const size = item.sizes.find((s) => s.id === l.size_id) || item.sizes[0];
    const qty = int(l.qty, { min: 1, max: 50, field: 'qty' });
    const cat = cats[item.category_id] || {};
    const combo = Boolean(l.combo) && Boolean(cat.allows_combo);
    const addonIds = Array.isArray(l.addons) ? l.addons.slice(0, 10) : [];
    const addons = cat.allows_addons
      ? addonIds.map((a) => items[a]).filter((a) => a && a.is_addon && a.id !== item.id)
      : [];
    const unit = size.price + (combo ? comboPrice : 0) + addons.reduce((s, a) => s + (a.sizes[0]?.price || 0), 0);
    total += unit * qty;
    return {
      item_id: item.id,
      name_ar: item.name_ar,
      name_en: item.name_en,
      size: size.en,
      qty,
      combo,
      addons: addons.map((a) => a.name_en),
      note: str(l.note, { max: 140, field: 'note' }),
      unit,
    };
  });

  await env.DB.prepare(
    'INSERT OR IGNORE INTO orders (id, branch_id, mode, customer_name, phone, total, items, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(
    id,
    branch_id,
    mode,
    str(body.name, { max: 60, field: 'name' }),
    str(body.phone, { max: 20, field: 'phone' }),
    total,
    JSON.stringify(priced),
    body.lang === 'en' ? 'en' : 'ar',
    Math.floor(Date.now() / 1000),
  ).run();

  return json({ ok: true, id, total });
}

async function listOrders(env, url) {
  const limit = int(url.searchParams.get('limit'), { min: 1, max: 200, field: 'limit', fallback: 50 });
  const before = int(url.searchParams.get('before'), { min: 0, max: 4e9, field: 'before', fallback: 4e9 });
  const { results } = await env.DB.prepare('SELECT * FROM orders WHERE created_at < ? ORDER BY created_at DESC LIMIT ?')
    .bind(before, limit).all();
  return { ok: true, orders: results.map((o) => ({ ...o, items: parseJsonColumn(o.items, []) })) };
}

function ammanDay(ts) {
  return new Date((ts + AMMAN_OFFSET) * 1000).toISOString().slice(0, 10);
}

async function stats(env, url) {
  const days = int(url.searchParams.get('days'), { min: 1, max: 90, field: 'days', fallback: 14 });
  const now = Math.floor(Date.now() / 1000);
  const todayStart = Math.floor((now + AMMAN_OFFSET) / 86400) * 86400 - AMMAN_OFFSET;
  const from = todayStart - (days - 1) * 86400;

  const { results } = await env.DB.prepare(
    'SELECT branch_id, total, items, created_at FROM orders WHERE created_at >= ? ORDER BY created_at DESC LIMIT 5000',
  ).bind(from).all();

  const byDay = {};
  for (let d = 0; d < days; d++) byDay[ammanDay(from + d * 86400)] = { count: 0, revenue: 0 };
  const byBranch = {};
  const top = {};
  const today = { count: 0, revenue: 0 };
  const week = { count: 0, revenue: 0 };
  const weekStart = todayStart - 6 * 86400;

  for (const o of results) {
    const day = ammanDay(o.created_at);
    if (byDay[day]) {
      byDay[day].count++;
      byDay[day].revenue += o.total;
    }
    if (o.created_at >= todayStart) {
      today.count++;
      today.revenue += o.total;
    }
    if (o.created_at >= weekStart) {
      week.count++;
      week.revenue += o.total;
      const b = (byBranch[o.branch_id] ||= { count: 0, revenue: 0 });
      b.count++;
      b.revenue += o.total;
      for (const l of parseJsonColumn(o.items, [])) {
        const t = (top[l.item_id] ||= { item_id: l.item_id, name_ar: l.name_ar, name_en: l.name_en, qty: 0 });
        t.qty += l.qty || 0;
      }
    }
  }

  return {
    ok: true,
    today,
    week: { ...week, avg: week.count ? Math.round(week.revenue / week.count) : 0 },
    byDay: Object.entries(byDay).map(([day, v]) => ({ day, ...v })),
    byBranch,
    top: Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 6),
  };
}
