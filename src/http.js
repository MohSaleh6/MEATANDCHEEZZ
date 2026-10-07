// Small HTTP helpers shared by the Worker routes.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

export function json(data, init = {}) {
  const headers = new Headers(BASE_HEADERS);
  if (!init.cache) headers.set('cache-control', 'no-store');
  else headers.set('cache-control', init.cache);
  for (const [k, v] of Object.entries(init.headers || {})) headers.set(k, v);
  return new Response(JSON.stringify(data), { status: init.status || 200, headers });
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    return json({ ok: false, error: err.message, ...err.extra }, { status: err.status });
  }
  console.error(err);
  return json({ ok: false, error: 'Internal error' }, { status: 500 });
}

export async function readJson(request, maxBytes = 64 * 1024) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, 'Payload too large');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Payload too large');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

// ─── Validation helpers ────────────────────────────────────────────

export function str(v, { max = 500, required = false, field = 'field' } = {}) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string' && typeof v !== 'number') throw new HttpError(400, `${field} must be text`);
  const s = String(v).trim();
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} is too long (max ${max})`);
  return s;
}

export function int(v, { min = 0, max = 1e9, field = 'field', fallback } = {}) {
  if ((v === undefined || v === null || v === '') && fallback !== undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || Math.round(n) !== n) throw new HttpError(400, `${field} must be a whole number`);
  if (n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  return n;
}

export function bool(v) {
  return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function slug(v, field = 'id') {
  const s = str(v, { max: 48, required: true, field });
  if (!SLUG_RE.test(s)) throw new HttpError(400, `${field} may only contain a-z, 0-9 and dashes`);
  return s;
}

export function parseJsonColumn(v, fallback) {
  try {
    const out = JSON.parse(v);
    return out ?? fallback;
  } catch {
    return fallback;
  }
}
