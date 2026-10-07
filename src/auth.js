// Password login for /admin with an HMAC-signed, HttpOnly session cookie.
import { HttpError } from './http.js';

const COOKIE = 'mc_admin';
const SESSION_SECONDS = 7 * 24 * 3600;
const MAX_FAILURES = 8;
const WINDOW_SECONDS = 15 * 60;

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function requirePassword(env) {
  if (!env.ADMIN_PASSWORD) {
    throw new HttpError(503, 'ADMIN_PASSWORD is not configured. Run: npx wrangler secret put ADMIN_PASSWORD');
  }
  return env.ADMIN_PASSWORD;
}

async function hmacKey(env) {
  // Changing ADMIN_PASSWORD (or SESSION_SECRET) logs every session out.
  const material = `mc-session:${requirePassword(env)}:${env.SESSION_SECRET || ''}`;
  return crypto.subtle.importKey('raw', enc.encode(material), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSession(env) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export function sessionCookie(token, request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function readCookie(request) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === COOKIE) return part.slice(i + 1);
  }
  return '';
}

export async function isAuthed(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const token = readCookie(request);
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64url(sig), enc.encode(payload));
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function requireAdmin(request, env) {
  if (!(await isAuthed(request, env))) throw new HttpError(401, 'Not signed in');
  // CSRF guard: browsers cannot send this custom header cross-site without a CORS preflight we never allow.
  if (request.method !== 'GET' && request.headers.get('x-mc-admin') !== '1') {
    throw new HttpError(403, 'Missing admin header');
  }
}

export async function checkPassword(request, env, password) {
  const expected = requirePassword(env);
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const now = Math.floor(Date.now() / 1000);

  const row = await env.DB.prepare('SELECT count, window_start FROM login_attempts WHERE ip = ?').bind(ip).first();
  const inWindow = row && now - row.window_start < WINDOW_SECONDS;
  if (inWindow && row.count >= MAX_FAILURES) {
    const wait = Math.ceil((WINDOW_SECONDS - (now - row.window_start)) / 60);
    throw new HttpError(429, `Too many attempts. Try again in ${wait} min.`);
  }

  const ok = timingSafeEqual(await sha256(String(password || '')), await sha256(expected));
  if (ok) {
    await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
    return true;
  }
  if (inWindow) {
    await env.DB.prepare('UPDATE login_attempts SET count = count + 1 WHERE ip = ?').bind(ip).run();
  } else {
    await env.DB.prepare('INSERT OR REPLACE INTO login_attempts (ip, count, window_start) VALUES (?, 1, ?)').bind(ip, now).run();
  }
  return false;
}
