// Meat & Cheezz — customer site
// Vanilla JS, no dependencies. Arabic-first, RTL-aware.
import { DICT, TAGLINES, QUOTES } from './i18n.js?v=b4ca3f2d7c';

/* ════════════════════════ utilities ════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const raf2 = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
const idle = (fn, timeout = 700) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 60));
// Elements shown with showPopover() sit above open <dialog>s (top layer).
function topLayer(el, parent = document.body) {
  parent.append(el);
  if (el.showPopover) { el.setAttribute('popover', 'manual'); try { el.showPopover(); } catch { /* ignore */ } }
  return el;
}
const vibrate = (ms = 12) => { try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(ms); } catch { /* ignore */ } };

/* ════════════════════════ state ════════════════════════ */
const S = {
  lang: html.lang === 'en' ? 'en' : 'ar',
  menu: null,
  items: {},
  cats: {},
  branches: {},
  branchId: store.get('mc_branch', null),
  cart: store.get('mc_cart', []),
  step: 0,
  sent: null,
  geo: null,
  mood: 'all',
};

const t = (key, vars) => {
  let s = DICT[S.lang][key] ?? DICT.ar[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};
const L = (obj, field) => (obj ? obj[`${field}_${S.lang}`] || obj[`${field}_ar`] || obj[`${field}_en`] || '' : '');
const other = (obj, field) => (obj ? obj[`${field}_${S.lang === 'ar' ? 'en' : 'ar'}`] || '' : '');
const money = (fils) => (Math.round(fils) / 1000).toFixed(2);
const priceText = (fils) => `${money(fils)} ${t('cur')}`;
const priceHTML = (fils, prefix = '') => `${prefix ? `${prefix} ` : ''}<b>${money(fils)}</b> ${t('cur')}`;
const smImg = (src) => (src && src.startsWith('/img/menu/') ? src.replace(/\.webp$/, '-sm.webp') : src);

/* ════════════════════════ time & branches ════════════════════════ */
function ammanNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h % 24) * 60 + (m || 0); };
function fmtClock(min) {
  const d = new Date(Date.UTC(2020, 0, 1, Math.floor(min / 60) % 24, min % 60));
  return new Intl.DateTimeFormat(S.lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(d);
}
function isOpenAt(b, m) {
  const o = toMin(b.open_time), c = toMin(b.close_time);
  if (o === c) return true;
  return o < c ? m >= o && m < c : m >= o || m < c;
}
function branchStatus(b) {
  const open = isOpenAt(b, ammanNow());
  return { open, label: open ? t('openUntil', { t: fmtClock(toMin(b.close_time)) }) : t('opensAt', { t: fmtClock(toMin(b.open_time)) }) };
}
const branch = () => (S.branchId && S.branches[S.branchId]) || null;

/* ════════════════════════ i18n ════════════════════════ */
function applyStatic() {
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  });
  document.title = t('title');
  const lb = $('#langBtn');
  lb.textContent = t('langBtn');
  lb.setAttribute('aria-label', t('langLabel'));
  lb.lang = S.lang === 'ar' ? 'en' : 'ar';
}

function setLang(lang) {
  if (lang === S.lang) return;
  const run = () => {
    S.lang = lang;
    store.set('mc_lang', lang);
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    applyStatic();
    renderAll();
    story.remeasure?.();
    renderCart();
    if (S.step === 1) renderForm();
    if (S.step === 2 && !S.sent) renderReceipt(false);
  };
  if (document.startViewTransition && !reduced) document.startViewTransition(run);
  else run();
}

/* ════════════════════════ menu data ════════════════════════ */
async function fetchJSON(url, ms = 6000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function ingest(menu) {
  S.menu = menu;
  S.items = Object.fromEntries(menu.items.map((i) => [i.id, i]));
  S.cats = Object.fromEntries(menu.categories.map((c) => [c.id, c]));
  S.branches = Object.fromEntries(menu.branches.map((b) => [b.id, b]));
  if (S.branchId && !S.branches[S.branchId]) S.branchId = null;
  // Drop cart lines that no longer exist
  const before = S.cart.length;
  S.cart = S.cart.filter((l) => S.items[l.id] && S.items[l.id].sizes.some((s) => s.id === l.size));
  if (S.cart.length !== before) { saveCart(); toast(t('unavailableDropped'), 'close'); }
}

async function loadMenu() {
  const cached = store.get('mc_menu_cache', null);
  if (cached?.items) {
    ingest(cached);
    renderAll();
  }
  let fresh = null;
  try {
    fresh = await fetchJSON('/api/menu');
  } catch {
    try { fresh = await fetchJSON('/data/menu.json'); } catch { /* offline */ }
  }
  if (!fresh) return;
  const sig = (m) => JSON.stringify({ ...m, version: 0 });
  if (!cached || sig(cached) !== sig(fresh)) {
    store.set('mc_menu_cache', fresh);
    ingest(fresh);
    renderAll();
  }
}

const isOut = (item, bid = S.branchId) => Boolean(item.sold_out) || Boolean(bid && item.unavailable?.includes(bid));
const minPrice = (item) => Math.min(...item.sizes.map((s) => s.price));
const isBurgerCat = (catId) => Boolean(S.cats[catId]?.allows_addons || S.cats[catId]?.allows_combo);
const addonsList = () => S.menu.items.filter((i) => i.is_addon && !isOut(i));
const gramsOf = (size) => { const m = /^(\d+)g$/.exec(size.id); return m ? Number(m[1]) : null; };

/* ════════════════════════ rendering ════════════════════════ */
let firstRender = true;
function renderAll() {
  if (!S.menu) return;
  renderHeroMeta();
  renderTicker();
  renderBranchChip();
  updateCartBadges(false);
  const rest = [renderLineup, renderMenu, renderBranches, renderQuotes, renderFooter];
  if (firstRender) {
    // spread the first render over idle periods so the hero paints and settles first
    firstRender = false;
    const next = () => { const fn = rest.shift(); if (fn) { fn(); idle(next, 400); } };
    idle(next, 300);
  } else rest.forEach((fn) => fn());
}

function renderHeroMeta() {
  const st = S.menu.settings || {};
  const rating = st.google_rating || '4.9';
  const reviews = Number(st.google_reviews || 7400);
  $('#gScore').textContent = rating;
  $('#rvScore').textContent = rating;
  $('#gCount').textContent = `+${reviews.toLocaleString('en-US')}`;
  const ring = $('.hero__ring textPath');
  if (ring) ring.textContent = `★ ${rating} GOOGLE ★ ${reviews.toLocaleString('en-US')}+ REVIEWS ★ 100% ANGUS ★ AMMAN ★ OPEN TILL 2AM `;

  // Live open/closed for the hero (open if any branch is open)
  const bs = Object.values(S.branches);
  const now = ammanNow();
  const anyOpen = bs.some((b) => isOpenAt(b, now));
  const ref = bs[0];
  const dot = $('#heroDot');
  dot.classList.toggle('is-closed', !anyOpen);
  $('#heroOpen').textContent = ref
    ? anyOpen ? t('heroOpen', { t: fmtClock(toMin(ref.close_time)) }) : t('heroClosed', { t: fmtClock(toMin(ref.open_time)) })
    : '';

  // Time-aware greeting
  const h = Math.floor(now / 60);
  $('#greeting').textContent = h >= 5 && h < 11 ? t('greetMorning') : h < 16 && h >= 11 ? t('greetLunch') : h >= 16 && h < 22 ? t('greetDinner') : t('greetLate');

  // Stats
  const total = bs.reduce((s, b) => s + (Number(b.reviews) || 0), 0);
  const sr = $('#statReviews');
  if (total) sr.dataset.count = String(Math.floor(total / 100) * 100);
  $('#statBurgers').dataset.count = String(S.menu.items.filter((i) => isBurgerCat(i.category_id)).length);
  $('#statBranches').dataset.count = String(bs.length || 2);
  $('.stat__n[data-dec]').dataset.count = rating;
  $$('.stat__n').forEach((el) => { if (el.dataset.done) el.textContent = formatCount(el, 1); });

  // Combo prices in the story
  const combo = Number(st.combo_price || 1500);
  $('#comboPrice').textContent = `+${money(combo)}`;
  const smash = S.items.smash;
  $('#comboCtaPrice').textContent = smash ? money(minPrice(smash) + combo) : '';

  // Announcement
  const ann = L(st, 'announcement');
  const bar = $('#announce');
  bar.hidden = !ann;
  if (ann) $('#announceText').textContent = ann;
}

function renderTicker() {
  const words = S.lang === 'ar'
    ? ['سماش', 'ANGUS', 'جبنة بتسيل', 'CHEEZZY', 'حار', 'SMASH', 'عمّان', 'JUICY']
    : ['SMASH', 'لحمة', 'ANGUS', 'CHEEZZY', 'جبنة', 'SPICY', 'AMMAN', 'JUICY'];
  const row = (list, ic) => list.map((w) => `<span>${esc(w)}${icon(ic)}</span>`).join('');
  const a = row(words, 'star');
  const b = row([...words].reverse(), 'flame');
  $('#tickerA').innerHTML = a + a + a + a;
  $('#tickerB').innerHTML = b + b + b + b;
}

function tagChips(item, withNote = false) {
  const map = { spicy: 'chili', grilled: 'grill', signature: 'star', new: 'flame' };
  let out = (item.tags || []).filter((x) => map[x]).map((x) => `<span class="tag tag--${x}">${icon(map[x])}${esc(t(`tag_${x}`))}</span>`).join('');
  if (withNote && L(item, 'note')) out += `<span class="tag tag--note">${esc(L(item, 'note'))}</span>`;
  return out;
}

function renderLineup() {
  const rail = $('#rail');
  let list = S.menu.items.filter((i) => i.featured && i.image && !i.is_addon);
  if (list.length < 3) list = S.menu.items.filter((i) => isBurgerCat(i.category_id) && i.image).slice(0, 8);
  rail.innerHTML = list.map((item, i) => {
    const tl = TAGLINES[item.id]?.[S.lang] || L(item, 'desc');
    const out = isOut(item);
    const spicy = item.tags?.includes('spicy');
    return `<article class="track reveal${out ? ' is-out' : ''}" data-id="${esc(item.id)}" style="--rd:${Math.min(i, 4) * 90}ms">
      ${spicy ? `<span class="track__tag">${icon('chili')}${esc(t('tag_spicy'))}</span>` : ''}
      <div class="track__vinyl" aria-hidden="true"></div>
      <img class="track__img" src="${esc(item.image)}" alt="${esc(L(item, 'name'))}" loading="lazy" decoding="async" width="440" height="352">
      <div class="track__no">TRACK ${String(i + 1).padStart(2, '0')}</div>
      <h3 class="track__name${item.name_en.replace(/\s+burger$/i, '').length > 10 ? ' track__name--long' : ''}">${esc(item.name_en.replace(/\s+burger$/i, ''))}</h3>
      ${S.lang === 'ar' ? `<p class="track__ar">${esc(item.name_ar)}</p>` : ''}
      <p class="track__line">${esc(tl)}</p>
      <div class="track__foot">
        <span class="track__price">${out ? esc(t('soldOut')) : priceHTML(minPrice(item), t('from'))}</span>
        <button class="addbtn" type="button" data-open="${esc(item.id)}" aria-label="${esc(`${t('addToOrder')}: ${L(item, 'name')}`)}" ${out ? 'disabled' : ''}>${icon('plus')}</button>
      </div>
    </article>`;
  }).join('');
  observeTracks();
  observeReveals();
}

let trackObserver;
function observeTracks() {
  trackObserver?.disconnect();
  if (reduced) return;
  trackObserver = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('is-live', e.isIntersecting && e.intersectionRatio > 0.6);
  }, { threshold: [0, 0.6, 1] });
  $$('.track').forEach((el) => trackObserver.observe(el));
}

function cardHTML(item, idx) {
  const out = isOut(item);
  const name = L(item, 'name');
  const search = `${item.name_ar} ${item.name_en} ${item.desc_ar} ${item.desc_en}`;
  return `<article class="card reveal${out ? ' is-out' : ''}" data-id="${esc(item.id)}" data-search="${esc(norm(search))}" style="--rd:${(idx % 3) * 70}ms">
    ${out ? `<span class="stamp">${esc(t('soldOut'))}</span>` : ''}
    <button class="card__hit" type="button" data-open="${esc(item.id)}" aria-label="${esc(name)}"></button>
    <div class="card__media"><img src="${esc(item.image)}" alt="" loading="lazy" decoding="async" width="440" height="360"></div>
    <h4 class="card__title">${esc(name)}<span class="card__alt">${esc(other(item, 'name'))}</span></h4>
    <p class="card__desc">${esc(L(item, 'desc'))}</p>
    <div class="card__tags">${tagChips(item, true)}</div>
    <div class="card__foot">
      <span class="price">${item.sizes.length > 1 ? priceHTML(minPrice(item), t('from')) : priceHTML(minPrice(item))}</span>
      <button class="card__add" type="button" data-quick="${esc(item.id)}" aria-label="${esc(`${t('addToOrder')}: ${name}`)}" ${out ? 'disabled' : ''}>${icon('plus')}</button>
    </div>
  </article>`;
}

function miniIcon(item) {
  if (item.category_id === 'drinks') return 'can';
  if (item.category_id === 'sauces') return 'drop';
  if (item.id === 'extra-cheezzy' || item.id === 'extra-cheddar') return 'cheese';
  if (item.id === 'extra-patty' || item.id === 'extra-bacon') return 'burger';
  return 'plus';
}

function miniHTML(item) {
  const out = isOut(item);
  const search = `${item.name_ar} ${item.name_en} ${item.desc_ar} ${item.desc_en}`;
  const sub = [L(item, 'desc'), L(item, 'note')].filter(Boolean).join(' · ') || (out ? t('soldOut') : other(item, 'name'));
  const multi = item.sizes.length > 1;
  return `<div class="mini reveal${out ? ' is-out' : ''}" data-id="${esc(item.id)}" data-search="${esc(norm(search))}">
    <span class="mini__ic">${icon(miniIcon(item))}</span>
    <div class="mini__body"><h4>${esc(L(item, 'name'))}</h4><small>${esc(out ? t('soldOut') : sub)}</small></div>
    <div class="mini__sizes">${item.sizes.map((s) => `<button class="mini__btn" type="button" data-add="${esc(item.id)}" data-size="${esc(s.id)}" aria-label="${esc(`${t('addToOrder')}: ${L(item, 'name')} ${multi ? s[S.lang] : ''}`)}" ${out ? 'disabled' : ''}>${icon('plus')}${multi ? `<small>${esc(s[S.lang])}</small> ` : ''}${money(s.price)}</button>`).join('')}</div>
  </div>`;
}

function renderMenu() {
  const body = $('#menuBody');
  const cats = S.menu.categories;
  const byCat = {};
  for (const it of S.menu.items) (byCat[it.category_id] ||= []).push(it);

  body.innerHTML = cats.filter((c) => byCat[c.id]?.length).map((c) => {
    const items = byCat[c.id];
    const withImg = items.filter((i) => i.image);
    const noImg = items.filter((i) => !i.image);
    return `<section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
      <div class="cat__head"><h3 id="h-${esc(c.id)}">${esc(L(c, 'name'))}</h3><p>${esc(L(c, 'tagline'))}</p></div>
      ${withImg.length ? `<div class="grid">${withImg.map(cardHTML).join('')}</div>` : ''}
      ${noImg.length ? `<div class="minis"${withImg.length ? ' style="margin-top:14px"' : ''}>${noImg.map(miniHTML).join('')}</div>` : ''}
    </section>`;
  }).join('');

  const tabs = $('#tabs');
  tabs.querySelectorAll('button').forEach((b) => b.remove());
  tabs.insertAdjacentHTML('beforeend', cats.filter((c) => byCat[c.id]?.length).map((c, i) =>
    `<button type="button" role="tab" aria-selected="${i === 0}" data-tab="${esc(c.id)}" aria-controls="cat-${esc(c.id)}">${esc(L(c, 'name'))}</button>`).join(''));

  const b = branch();
  $('#menuBranchNote').textContent = b ? t('menuSubBranch', { b: L(b, 'name') }) : t('menuSub');

  observeReveals();
  setupScrollSpy();
  const activeTab = $('#tabs button[aria-selected="true"]');
  if (activeTab) requestAnimationFrame(() => moveInk(activeTab, false));
  if ($('#search').value) runSearch();
}

function renderBranches() {
  const wrap = $('#branchCards');
  wrap.innerHTML = Object.values(S.branches).map((b) => {
    const st = branchStatus(b);
    const waText = encodeURIComponent(t('waHi'));
    return `<article class="bcard reveal${S.branchId === b.id ? ' is-selected' : ''}">
      <div class="bcard__top">
        <div><h3>${esc(L(b, 'name'))}</h3><p class="bcard__addr">${esc(L(b, 'address'))}</p></div>
        <span class="status${st.open ? '' : ' is-closed'}"><i class="dot${st.open ? '' : ' is-closed'}"></i>${esc(st.label)}</span>
      </div>
      <div class="bcard__meta">
        <span>${icon('star')}<b>${esc(Number(b.rating).toFixed(1))}</b>&nbsp;${esc(t('reviewsN', { n: Number(b.reviews).toLocaleString('en-US') }))}</span>
        <span>${icon('clock')}<span dir="auto">${esc(t('hours', { o: fmtClock(toMin(b.open_time)), c: fmtClock(toMin(b.close_time)) }))}</span></span>
        <span>${icon(b.delivery ? 'scooter' : 'store')}${esc(b.delivery ? t('deliveryOn') : t('pickupOnly'))}</span>
      </div>
      <div class="bcard__actions">
        <button class="btn btn--yellow" type="button" data-order-branch="${esc(b.id)}">${icon('bag')}${esc(t('orderHere'))}</button>
        ${b.maps_url ? `<a class="btn btn--ghost" href="${esc(b.maps_url)}" target="_blank" rel="noopener">${icon('pin')}${esc(t('directions'))}</a>` : ''}
        ${b.whatsapp ? `<a class="btn btn--wa" href="https://wa.me/${esc(b.whatsapp)}?text=${waText}" target="_blank" rel="noopener">${icon('wa')}${esc(t('whatsapp'))}</a>` : ''}
        ${b.phone ? `<a class="btn btn--ghost" href="tel:${esc(b.phone)}" aria-label="${esc(`${t('call')} ${L(b, 'name')}`)}">${icon('phone')}${esc(t('call'))}</a>` : ''}
      </div>
    </article>`;
  }).join('');
  const names = Object.values(S.branches);
  const mecca = S.branches.mecca, abdoun = S.branches.abdoun;
  if (mecca) $('#radarMecca').textContent = mecca.name_en.toUpperCase();
  if (abdoun) $('#radarAbdoun').textContent = abdoun.name_en.toUpperCase();
  if (!names.length) wrap.innerHTML = '';
  observeReveals();
}

function renderQuotes() {
  const card = (q) => `<figure class="quote${q.hl ? ' quote--hl' : ''}">
    <div class="quote__stars">${icon('star').repeat(5)}</div>
    <p lang="en" dir="ltr">“${esc(q.t)}”</p>
    <small>${icon('google')}${esc(q.k === 'summary' ? t('gSummary') : t('gReview'))}</small>
  </figure>`;
  const half = Math.ceil(QUOTES.length / 2);
  const rows = [QUOTES.slice(0, half), QUOTES.slice(half)];
  $('#quotes').innerHTML = rows.map((r) => {
    const inner = r.map(card).join('');
    return `<div class="quotes__row"><div class="quotes__track">${inner}${inner}</div></div>`;
  }).join('');
}

function renderFooter() {
  const st = S.menu.settings || {};
  const socials = [['instagram', 'insta'], ['tiktok', 'tiktok'], ['facebook', 'fb']]
    .filter(([k]) => st[k]).map(([k, ic]) => `<a href="${esc(st[k])}" target="_blank" rel="noopener" aria-label="${k}">${icon(ic)}</a>`).join('');
  $('#socials').innerHTML = socials;
  $('#footBranches').innerHTML = `<h3>${esc(t('navBranches'))}</h3>` + Object.values(S.branches).map((b) =>
    `<a href="${esc(b.maps_url || '#branches')}" target="_blank" rel="noopener">${esc(L(b, 'name'))} — ${esc(L(b, 'address'))}</a>`).join('');
  const first = Object.values(S.branches)[0];
  if (first?.phone) { const fp = $('#footPhone'); fp.href = `tel:${first.phone}`; fp.textContent = prettyPhone(first.phone); }
  $('#year').textContent = String(new Date().getFullYear());
}

function prettyPhone(p) {
  const d = String(p).replace(/\D/g, '');
  if (d.startsWith('962') && d.length === 12) return `+962 ${d[3]} ${d.slice(4, 8)} ${d.slice(8)}`;
  return p;
}

function renderBranchChip() {
  const b = branch();
  const chip = $('#branchChip');
  chip.classList.toggle('is-set', Boolean(b));
  $('#branchChipText').textContent = b ? L(b, 'name') : t('pickBranch');
}

/* ════════════════════════ search ════════════════════════ */
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
}
let searchTimer;
function runSearch() {
  const q = norm($('#search').value).trim();
  const words = q.split(/\s+/).filter(Boolean);
  let any = false;
  $$('.cat').forEach((cat) => {
    let visible = 0;
    cat.querySelectorAll('[data-search]').forEach((el) => {
      const ok = !words.length || words.every((w) => el.dataset.search.includes(w));
      el.hidden = !ok;
      if (ok) { visible++; el.classList.add('in'); }
    });
    cat.hidden = visible === 0;
    if (visible) any = true;
  });
  $('#menuEmpty').hidden = any;
}

/* ════════════════════════ tabs & scroll-spy ════════════════════════ */
function moveInk(btn, smooth = true) {
  const ink = $('#tabsInk');
  if (!btn || !ink) return;
  if (!smooth) ink.style.transition = 'none';
  ink.style.width = `${btn.offsetWidth}px`;
  ink.style.transform = `translateX(${btn.offsetLeft}px)`;
  if (!smooth) requestAnimationFrame(() => { ink.style.transition = ''; });
}
function setActiveTab(id, scrollTabs = true) {
  const btn = $(`#tabs button[data-tab="${CSS.escape(id)}"]`);
  if (!btn || btn.getAttribute('aria-selected') === 'true') return;
  $$('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
  moveInk(btn);
  if (scrollTabs) {
    const tabs = $('#tabs');
    const tr = tabs.getBoundingClientRect(), br = btn.getBoundingClientRect();
    tabs.scrollBy({ left: br.left + br.width / 2 - (tr.left + tr.width / 2), behavior: reduced ? 'auto' : 'smooth' });
  }
}
let spy, spyLock = 0;
function setupScrollSpy() {
  spy?.disconnect();
  spy = new IntersectionObserver((entries) => {
    if (Date.now() < spyLock) return;
    for (const e of entries) if (e.isIntersecting) setActiveTab(e.target.dataset.cat);
  }, { rootMargin: '-38% 0px -55% 0px' });
  $$('.cat').forEach((c) => spy.observe(c));
}

/* ════════════════════════ reveal & counters ════════════════════════ */
let revealer;
function observeReveals() {
  if (reduced || !('IntersectionObserver' in window)) { $$('.reveal').forEach((el) => el.classList.add('in')); return; }
  revealer ||= new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal:not(.in)').forEach((el) => revealer.observe(el));
}

function formatCount(el, p) {
  const target = Number(el.dataset.count || 0);
  const dec = Number(el.dataset.dec || 0);
  const v = target * p;
  const txt = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
  return `${el.dataset.plus ? '+' : ''}${txt}${el.dataset.suffix || ''}`;
}
function setupCounters() {
  const els = $$('.stat__n');
  const run = (el) => {
    if (reduced) { el.textContent = formatCount(el, 1); el.dataset.done = '1'; return; }
    const start = performance.now(), dur = 1500;
    const tick = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      el.textContent = formatCount(el, 1 - Math.pow(2, -10 * p));
      if (p < 1) requestAnimationFrame(tick); else { el.textContent = formatCount(el, 1); el.dataset.done = '1'; }
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/* ════════════════════════ odometer ════════════════════════ */
function odo(el, text) {
  if (!el) return;
  text = String(text);
  if (el.dataset.v === text) return;
  const prev = el.dataset.v;
  el.dataset.v = text;
  el.setAttribute('aria-label', text);
  if (reduced || !prev || prev.length !== text.length || !el.querySelector('.odo__d')) {
    el.innerHTML = [...text].map((ch) => /\d/.test(ch)
      ? `<span class="odo__d" aria-hidden="true"><span class="odo__col" style="transform:translateY(${prev ? 0 : -Number(ch) * 1.15}em)">${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}</span></span>`
      : `<span class="odo__c" aria-hidden="true">${esc(ch)}</span>`).join('');
    if (!prev) return;
  }
  const cols = el.querySelectorAll('.odo__d .odo__col');
  let i = 0;
  raf2(() => {
    for (const ch of text) if (/\d/.test(ch)) cols[i++].style.transform = `translateY(${-Number(ch) * 1.15}em)`;
  });
}

/* ════════════════════════ toasts ════════════════════════ */
function toast(msg, ic = 'check') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  const box = $('#toasts');
  box.append(el);
  if (box.showPopover) { try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch { /* ignore */ } }
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2200);
  while ($('#toasts').children.length > 3) $('#toasts').firstElementChild.remove();
}

/* ════════════════════════ dialogs ════════════════════════ */
function openDialog(dlg) {
  if (dlg.open) return;
  dlg.showModal();
  html.classList.add('lock');
  raf2(() => dlg.classList.add('is-in'));
}
function closeDialog(dlg) {
  if (!dlg.open) return Promise.resolve();
  return new Promise((resolve) => {
    dlg.classList.remove('is-in');
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.style.removeProperty('--drag');
      if (!$$('dialog[open]').length) html.classList.remove('lock');
      resolve();
    };
    const panel = dlg.firstElementChild;
    panel.addEventListener('transitionend', (e) => { if (e.target === panel) fin(); });
    setTimeout(fin, reduced ? 10 : 620);
  });
}
function wireDialog(dlg, onClose) {
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); onClose ? onClose() : closeDialog(dlg); });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) onClose ? onClose() : closeDialog(dlg);
  });
}

/* ════════════════════════ fly to cart ════════════════════════ */
function cartTarget() {
  const dock = $('#dock');
  const nav = $('#nav');
  const navVisible = !nav.classList.contains('is-hidden');
  if (dock.classList.contains('is-on') && (innerWidth < 900 || !navVisible)) return $('.dock__bag');
  return navVisible ? $('#cartBtn') : $('.dock__bag');
}
function fly(fromEl, src) {
  const target = cartTarget();
  const done = () => {
    target.classList.remove('gulp');
    void target.offsetWidth;
    target.classList.add('gulp');
    updateCartBadges(true);
  };
  if (!fromEl || reduced) { done(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = clamp(Math.min(a.width, a.height || a.width), 44, 150);
  let el;
  if (src) { el = new Image(); el.src = src; el.alt = ''; }
  else { el = document.createElement('div'); el.style.cssText = 'border-radius:50%;background:var(--yellow);box-shadow:0 0 0 6px rgba(255,212,0,.25)'; }
  el.className = 'flyer';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  topLayer(el);
  const sx = a.left + a.width / 2 - size / 2, sy = a.top + a.height / 2 - size / 2;
  const ex = b.left + b.width / 2 - size / 2, ey = b.top + b.height / 2 - size / 2;
  const cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 140;
  const frames = [];
  for (let i = 0; i <= 18; i++) {
    const p = i / 18, q = 1 - p;
    const x = q * q * sx + 2 * q * p * cx + p * p * ex;
    const y = q * q * sy + 2 * q * p * cy + p * p * ey;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 - p * 0.82}) rotate(${p * -40}deg)`, opacity: p > 0.92 ? 0 : 1, offset: p });
  }
  const anim = el.animate(frames, { duration: 760, easing: 'cubic-bezier(.45,.05,.55,.95)' });
  anim.onfinish = () => { el.remove(); done(); };
  // +1 pop
  const plus = document.createElement('span');
  plus.className = 'plusone';
  plus.textContent = '+1';
  plus.style.left = `${a.left + a.width / 2}px`;
  plus.style.top = `${a.top}px`;
  topLayer(plus);
  plus.animate([{ transform: 'translate(-50%, 0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -30px) scale(1.2)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%, -60px) scale(1)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => plus.remove();
}

/* ════════════════════════ cart model ════════════════════════ */
const lineKey = (l) => [l.id, l.size, l.combo ? 1 : 0, [...(l.addons || [])].sort().join('+'), (l.note || '').trim()].join('|');
function saveCart() { store.set('mc_cart', S.cart); }
function linePrice(l) {
  const item = S.items[l.id];
  if (!item) return 0;
  const size = item.sizes.find((s) => s.id === l.size) || item.sizes[0];
  const cat = S.cats[item.category_id] || {};
  const combo = l.combo && cat.allows_combo ? Number(S.menu.settings?.combo_price || 0) : 0;
  const adds = cat.allows_addons ? (l.addons || []).reduce((s, id) => s + (S.items[id]?.sizes[0]?.price || 0), 0) : 0;
  return (size.price + combo + adds) * l.qty;
}
const cartTotal = () => S.cart.reduce((s, l) => s + linePrice(l), 0);
const cartCount = () => S.cart.reduce((s, l) => s + l.qty, 0);

function addLine(line) {
  const k = lineKey(line);
  const existing = S.cart.find((l) => lineKey(l) === k);
  if (existing) existing.qty = clamp(existing.qty + line.qty, 1, 50);
  else S.cart.push({ ...line, k });
  S.sent = null;
  saveCart();
  renderCart();
  vibrate();
}

function updateCartBadges(bump) {
  const n = cartCount();
  const c = $('#cartCount');
  c.hidden = n === 0;
  c.textContent = String(n);
  $('#dockCount').textContent = String(n);
  $('#dockTotal').textContent = n ? priceText(cartTotal()) : '';
  $('#dock').classList.toggle('is-empty', n === 0);
  if (bump && n) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  updateDock();
}

/* ════════════════════════ item sheet ════════════════════════ */
const sheet = $('#sheet');
let current = null; // { item, qty }

const DRIPS_SVG = '<svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M0 0h300v22c-10 0-12 8-12 20s-5 30-12 30-11-22-11-32-4-14-12-14-10 6-10 16 2 54-12 54-12-40-12-54-5-16-14-16-10 5-10 14 0 24-11 24-10-16-10-24-4-12-12-12-13 6-13 18-1 40-12 40-12-28-12-40-4-16-13-16-11 8-11 18-3 14-11 14-9-8-9-16-5-12-13-12-12 4-12 12 0 30-12 30-12-22-12-30-4-14-12-14H0z"/></svg>';

function openSheet(id, fromImg, opts = {}) {
  const item = S.items[id];
  if (!item) return;
  const cat = S.cats[item.category_id] || {};
  const out = isOut(item);
  const b = branch();
  current = { item, qty: 1 };
  const grams = item.sizes.map(gramsOf);
  const isGrams = grams.every((g) => g);
  const defaultSize = item.sizes[item.sizes.length > 2 ? 1 : 0];
  const addons = cat.allows_addons ? addonsList().filter((a) => a.id !== item.id) : [];
  const cheezzy = addons.find((a) => a.id === 'extra-cheezzy');
  const otherAddons = addons.filter((a) => a.id !== 'extra-cheezzy');

  $('#sheetBody').innerHTML = `
    <div class="si__hero">
      ${item.image ? `<img id="sheetImg" src="${esc(item.image)}" alt="${esc(L(item, 'name'))}" width="440" height="360">` : `<span class="si__ic">${icon(miniIcon(item))}</span>`}
      <div class="si__drips" id="siDrips">${DRIPS_SVG}</div>
    </div>
    <h2 class="si__title" id="sheetTitle">${esc(L(item, 'name'))}</h2>
    <div class="si__alt">${esc(other(item, 'name'))}</div>
    <div class="card__tags" style="margin-top:10px">${tagChips(item, true)}</div>
    ${L(item, 'desc') ? `<p class="si__desc">${esc(L(item, 'desc'))}</p>` : ''}
    ${out ? `<div class="si__out">${esc(item.sold_out || !b ? t('soldOut') : t('soldOutAt', { b: L(b, 'name') }))}</div>` : ''}
    ${item.sizes.length > 1 ? `
      <div class="si__sec">
        <h4>${esc(isGrams ? t('chooseWeight') : t('chooseSize'))}${isGrams ? `<small>${esc(t('weightHint'))}</small>` : ''}</h4>
        <div class="sizes" role="radiogroup">
          ${item.sizes.map((s) => `<label><input type="radio" name="size" value="${esc(s.id)}" ${s.id === defaultSize.id ? 'checked' : ''}><span><b>${esc(s[S.lang])}</b><small>${money(s.price)}</small></span></label>`).join('')}
        </div>
        ${isGrams ? `<div class="patty-meter" aria-hidden="true">
          <div class="pm-burger"><i class="pm-top"></i><i class="pm-cheese"></i><i class="pm-patty" id="pmPatty"></i><i class="pm-bottom"></i></div>
          <span class="pm-text" id="pmText"></span></div>` : ''}
      </div>` : ''}
    ${cat.allows_combo ? `
      <div class="si__sec">
        <label class="opt"><input type="checkbox" name="combo"><span class="opt__ic">${icon('fries')}${icon('can')}</span>
          <span class="opt__body"><b>${esc(t('comboTitle'))}</b><small>${esc(t('comboDesc'))}</small></span>
          <span class="opt__price">+${money(Number(S.menu.settings?.combo_price || 0))}</span><span class="opt__sw"></span></label>
        ${cheezzy ? `<label class="opt opt--cheezzy"><input type="checkbox" name="addon" value="extra-cheezzy"><span class="opt__ic">${icon('cheese')}</span>
          <span class="opt__body"><b>${esc(L(cheezzy, 'name'))}</b><small>${esc(L(cheezzy, 'desc') || t('cheezzyDesc'))}</small></span>
          <span class="opt__price">+${money(cheezzy.sizes[0].price)}</span><span class="opt__sw"></span></label>` : ''}
      </div>` : ''}
    ${otherAddons.length ? `
      <div class="si__sec"><h4>${esc(t('addonsTitle'))}</h4>
        <div class="addons">${otherAddons.map((a) => `<label><input type="checkbox" name="addon" value="${esc(a.id)}"><span>${icon('plus')}${esc(L(a, 'name'))} <em>+${money(a.sizes[0].price)}</em></span></label>`).join('')}</div>
      </div>` : ''}
    <div class="si__sec"><h4>${esc(t('noteTitle'))}</h4>
      <textarea class="si__note" name="note" rows="1" maxlength="140" placeholder="${esc(t('notePh'))}"></textarea></div>`;

  if (opts.combo) { const c = $('#sheetBody input[name="combo"]'); if (c) c.checked = true; }
  $('#sheetAdd').disabled = out;
  $('#sheetQtyVal').textContent = '1';
  $('#sheetTotal').dataset.v = '';
  updateSheet();
  openDialog(sheet);
  $('#sheetBody').scrollTop = 0;

  // shared-element flight from the card image into the sheet
  const target = $('#sheetImg');
  if (fromImg && target && !reduced) {
    const a = fromImg.getBoundingClientRect();
    target.style.opacity = '0';
    raf2(() => {
      const b2 = target.getBoundingClientRect();
      if (!a.width || !b2.width) { target.style.opacity = ''; return; }
      const clone = new Image();
      clone.src = fromImg.currentSrc || fromImg.src;
      clone.className = 'flyer';
      clone.style.width = `${b2.width}px`;
      clone.style.height = `${b2.height}px`;
      topLayer(clone);
      const s = a.width / b2.width;
      clone.animate([
        { transform: `translate(${a.left}px, ${a.top}px) scale(${s})`, transformOrigin: '0 0' },
        { transform: `translate(${b2.left}px, ${b2.top}px) scale(1)`, transformOrigin: '0 0' },
      ], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => { target.style.opacity = ''; clone.remove(); };
    });
  }
}

function readSheet() {
  const body = $('#sheetBody');
  const { item } = current;
  const size = body.querySelector('input[name="size"]:checked')?.value || item.sizes[0].id;
  const combo = Boolean(body.querySelector('input[name="combo"]')?.checked);
  const addons = $$('input[name="addon"]:checked', body).map((i) => i.value);
  const note = (body.querySelector('textarea[name="note"]')?.value || '').trim().slice(0, 140);
  return { id: item.id, size, qty: current.qty, combo, addons, note };
}

function updateSheet() {
  if (!current) return;
  const line = readSheet();
  odo($('#sheetTotal'), money(linePrice(line)));
  const size = current.item.sizes.find((s) => s.id === line.size);
  const g = size && gramsOf(size);
  const patty = $('#pmPatty');
  if (patty && g) { patty.style.setProperty('--g', String(g / 100)); $('#pmText').textContent = `${g}g`; }
  $('#siDrips')?.classList.toggle('on', line.addons.includes('extra-cheezzy'));
}

$('#sheetBody').addEventListener('change', updateSheet);
$('#sheetQty').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-q]');
  if (!btn || !current) return;
  current.qty = clamp(current.qty + Number(btn.dataset.q), 1, 50);
  $('#sheetQtyVal').textContent = String(current.qty);
  updateSheet();
});
$('#sheetAdd').addEventListener('click', () => {
  if (!current) return;
  const line = readSheet();
  const img = $('#sheetImg');
  addLine(line);
  const src = current.item.image ? smImg(current.item.image) : '';
  const rect = img || $('#sheetAdd');
  fly(rect, src);
  toast(`${t('added')} · ${L(current.item, 'name')}`);
  closeDialog(sheet);
  current = null;
});
wireDialog(sheet, () => { closeDialog(sheet); current = null; });

// drag the sheet down to dismiss (mobile)
(() => {
  const grab = $('#sheetGrab');
  let y0 = 0, dy = 0, t0 = 0, dragging = false;
  grab.addEventListener('pointerdown', (e) => {
    dragging = true; y0 = e.clientY; dy = 0; t0 = performance.now();
    grab.setPointerCapture(e.pointerId);
    sheet.classList.add('is-dragging');
  });
  grab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.setProperty('--drag', `${dy}px`);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('is-dragging');
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 120 || v > 0.6) { closeDialog(sheet); current = null; }
    else sheet.style.setProperty('--drag', '0px');
  };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
})();

function quickAdd(id, sizeId, fromEl) {
  const item = S.items[id];
  if (!item || isOut(item)) return;
  addLine({ id, size: sizeId || item.sizes[0].id, qty: 1, combo: false, addons: [], note: '' });
  const img = fromEl?.closest('.card, .up')?.querySelector('img');
  fly(img || fromEl, item.image ? smImg(item.image) : '');
  toast(`${t('added')} · ${L(item, 'name')}`);
}

/* ════════════════════════ cart drawer ════════════════════════ */
const drawer = $('#cart');

function openCart() {
  if (S.sent && S.step === 2) renderDone();
  else goStep(0, false);
  renderCart();
  openDialog(drawer);
}
function closeCart() {
  closeDialog(drawer).then(() => {
    if (S.sent) { S.cart = []; saveCart(); S.sent = null; goStep(0, false); renderCart(); }
  });
}
wireDialog(drawer, closeCart);

function renderCart() {
  const box = $('#cartLines');
  if (!S.menu) return;
  if (!S.cart.length) {
    const last = store.get('mc_last_order', null);
    box.innerHTML = `<div class="empty"><div class="empty__plate">${icon('burger')}</div>
      <h3>${esc(t('emptyTitle'))}</h3><p>${esc(t('emptyDesc'))}</p>
      <button class="btn btn--yellow" type="button" data-browse>${esc(t('browseMenu'))}</button>
      ${last?.lines?.length ? `<button class="btn btn--ghost" type="button" data-reorder>${icon('arrow', 'flip-rtl')}${esc(t('reorder'))}</button>` : ''}</div>`;
  } else {
    box.innerHTML = S.cart.map((l) => {
      const item = S.items[l.id];
      if (!item) return '';
      const size = item.sizes.find((s) => s.id === l.size);
      const opts = [
        item.sizes.length > 1 && size ? size[S.lang] : '',
        l.combo ? t('combo') : '',
        ...(l.addons || []).map((a) => S.items[a] ? L(S.items[a], 'name') : ''),
        l.note ? `“${l.note}”` : '',
      ].filter(Boolean).join(' · ');
      return `<div class="cline" data-k="${esc(l.k)}">
        <div class="cline__img">${item.image ? `<img src="${esc(smImg(item.image))}" alt="" loading="lazy" width="180" height="150">` : icon(miniIcon(item))}</div>
        <div><p class="cline__name">${esc(L(item, 'name'))}</p>${opts ? `<p class="cline__opts">${esc(opts)}</p>` : ''}
          ${isOut(item) ? `<p class="cline__opts" style="color:#ff8a73">${esc(t('soldOut'))}</p>` : ''}</div>
        <div class="cline__side">
          <span class="cline__price">${money(linePrice(l))}</span>
          <div class="qty qty--sm"><button type="button" data-dq="-1" aria-label="${esc(t('less'))}">${icon(l.qty === 1 ? 'trash' : 'minus')}</button><output>${l.qty}</output><button type="button" data-dq="1" aria-label="${esc(t('more'))}">${icon('plus')}</button></div>
        </div>
      </div>`;
    }).join('');
  }

  // upsell
  const sides = ['french-fries', 'curly-fries', 'onion-rings', 'mozzarella-sticks', 'cheese-dip', 'chicken-strips']
    .map((id) => S.items[id]).filter((i) => i && i.image && !isOut(i) && !S.cart.some((l) => l.id === i.id)).slice(0, 5);
  $('#upsell').innerHTML = S.cart.length && sides.length ? `<h4>${esc(t('upsellTitle'))}</h4><div class="upsell__row">${sides.map((i) =>
    `<div class="up"><img src="${esc(smImg(i.image))}" alt="" loading="lazy" width="180" height="120"><b>${esc(L(i, 'name'))}</b>
      <button class="mini__btn" type="button" data-add="${esc(i.id)}" data-size="${esc(i.sizes[0].id)}" aria-label="${esc(`${t('addToOrder')}: ${L(i, 'name')}`)}">${icon('plus')}${money(i.sizes[0].price)}</button></div>`).join('')}</div>` : '';

  odo($('#cartTotal'), money(cartTotal()));
  updateFoot();
  updateCartBadges(false);
}

$('#cartLines').addEventListener('click', (e) => {
  if (e.target.closest('[data-browse]')) { closeCart(); setTimeout(() => $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 250); return; }
  if (e.target.closest('[data-reorder]')) {
    const last = store.get('mc_last_order', null);
    if (last?.lines) {
      for (const l of last.lines) if (S.items[l.id] && !isOut(S.items[l.id])) addLine({ ...l });
      toast(t('reordered'));
    }
    return;
  }
  const btn = e.target.closest('[data-dq]');
  if (!btn) return;
  const row = btn.closest('.cline');
  const line = S.cart.find((l) => l.k === row.dataset.k);
  if (!line) return;
  line.qty += Number(btn.dataset.dq);
  vibrate(8);
  if (line.qty <= 0) {
    S.cart = S.cart.filter((l) => l !== line);
    saveCart();
    row.classList.add('is-leaving');
    setTimeout(renderCart, reduced ? 0 : 320);
    toast(t('removed'), 'trash');
  } else {
    line.qty = Math.min(line.qty, 50);
    saveCart();
    renderCart();
  }
  S.sent = null;
});

const PANE_REVIEW_HTML = $('#paneReview').innerHTML;
function goStep(n, animate = true) {
  if (!S.sent && !$('#receipt')) $('#paneReview').innerHTML = PANE_REVIEW_HTML;
  S.step = n;
  const track = $('#cartTrack');
  if (!animate) { track.style.transition = 'none'; requestAnimationFrame(() => { track.style.transition = ''; }); }
  track.style.setProperty('--step', String(n));
  ['#paneCart', '#paneDetails', '#paneReview'].forEach((sel, i) => { $(sel).inert = i !== n; });
  $$('#steps li').forEach((li, i) => li.classList.toggle('on', i <= n));
  $('#cartBack').hidden = n === 0 || Boolean(S.sent);
  updateFoot();
  if (n === 1) renderForm();
  if (n === 2 && !S.sent) renderReceipt(true);
  const pane = [$('#paneCart'), $('#paneDetails'), $('#paneReview')][n];
  if (pane) pane.scrollTop = 0;
}

function updateFoot() {
  const btn = $('#cartNext');
  const label = $('#cartNextLabel');
  const st = S.menu?.settings || {};
  btn.disabled = false;
  if (S.sent) { label.textContent = t('newOrder'); }
  else if (S.step === 0) { label.textContent = S.cart.length ? t('checkout') : t('browseMenu'); }
  else if (S.step === 1) label.textContent = t('review');
  else label.textContent = t('sendWa');
  btn.classList.toggle('btn--wa', S.step === 2 && !S.sent);
  btn.classList.toggle('btn--yellow', !(S.step === 2 && !S.sent));
  const note = $('#cartNote');
  if (st.orders_enabled === '0') { note.textContent = t('ordersOff'); if (S.step > 0 && !S.sent) btn.disabled = true; }
  else note.textContent = S.step >= 1 && getMode() === 'delivery' && !S.sent ? (L(st, 'delivery_note') || t('deliveryNoteDefault')) : '';
}

$('#cartNext').addEventListener('click', () => {
  if (S.sent) { S.cart = []; saveCart(); S.sent = null; goStep(0); renderCart(); return; }
  if (S.step === 0) {
    if (!S.cart.length) { closeCart(); setTimeout(() => $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 250); return; }
    goStep(1);
  } else if (S.step === 1) {
    if (validateForm()) goStep(2);
  } else if (S.step === 2) {
    sendOrder();
  }
});
$('#cartBack').addEventListener('click', () => goStep(Math.max(0, S.step - 1)));

/* ─── checkout form ─── */
const form = $('#checkoutForm');
const getMode = () => form.querySelector('input[name="mode"]:checked')?.value || 'pickup';

function renderForm() {
  const saved = store.get('mc_customer', {});
  if (!form.dataset.filled) {
    form.dataset.filled = '1';
    if (saved.name) $('#fName').value = saved.name;
    if (saved.phone) $('#fPhone').value = saved.phone;
    if (saved.address) $('#fAddr').value = saved.address;
    if (saved.mode) { const r = form.querySelector(`input[name="mode"][value="${saved.mode}"]`); if (r) r.checked = true; }
  }
  $('#formBranches').innerHTML = Object.values(S.branches).map((b) => {
    const st = branchStatus(b);
    return `<label><input type="radio" name="branch" value="${esc(b.id)}" ${S.branchId === b.id ? 'checked' : ''}><span><b>${esc(L(b, 'name'))}</b><small class="${st.open ? '' : 'is-closed'}">${esc(st.label)}</small></span></label>`;
  }).join('');
  $('#addrField').hidden = getMode() !== 'delivery';
  renderTimes();
  updateFoot();
}

function renderTimes() {
  const sel = $('#fTime');
  const later = form.querySelector('input[name="when"]:checked')?.value === 'later';
  sel.hidden = !later;
  const b = branch() || Object.values(S.branches)[0];
  if (!b) return;
  const prev = sel.value;
  const now = ammanNow();
  let start = Math.ceil((now + 30) / 15) * 15;
  const slots = [];
  for (let m = start; m < start + 24 * 60 && slots.length < 20; m += 15) {
    const mm = m % (24 * 60);
    // must be open at the slot and still open 15 min later
    if (isOpenAt(b, mm) && isOpenAt(b, (mm + 15) % 1440)) slots.push(mm);
  }
  sel.innerHTML = slots.map((m) => {
    const v = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return `<option value="${v}">${esc(fmtClock(m))}</option>`;
  }).join('');
  if (prev && slots.some((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` === prev)) sel.value = prev;
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'mode') { $('#addrField').hidden = getMode() !== 'delivery'; updateFoot(); }
  if (e.target.name === 'branch') { selectBranch(e.target.value, false); renderTimes(); }
  if (e.target.name === 'when') renderTimes();
  e.target.closest('.field')?.classList.remove('is-bad');
});
form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', (e) => e.preventDefault());

$('#locBtn').addEventListener('click', () => {
  const btn = $('#locBtn');
  if (!navigator.geolocation) { toast(t('locFail'), 'close'); return; }
  btn.classList.add('is-busy');
  btn.querySelector('span').textContent = t('locating');
  navigator.geolocation.getCurrentPosition((pos) => {
    S.geo = { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) };
    btn.classList.remove('is-busy');
    btn.classList.add('is-done');
    btn.querySelector('span').textContent = t('locDone');
    $('#addrField').classList.remove('is-bad');
  }, () => {
    btn.classList.remove('is-busy');
    btn.querySelector('span').textContent = t('shareLoc');
    toast(t('locFail'), 'close');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});

function normPhone(v) {
  let d = String(v || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  d = d.replace(/[^\d+]/g, '');
  if (d.startsWith('+962')) d = `0${d.slice(4)}`;
  else if (d.startsWith('00962')) d = `0${d.slice(5)}`;
  else if (d.startsWith('962')) d = `0${d.slice(3)}`;
  else if (/^7[789]\d{7}$/.test(d)) d = `0${d}`;
  return /^07[789]\d{7}$/.test(d) ? d : null;
}

function bad(sel) {
  const f = $(sel).closest('.field');
  f.classList.remove('is-bad');
  void f.offsetWidth;
  f.classList.add('is-bad');
  return f;
}

function validateForm() {
  // allow Arabic-Indic digits in the phone field
  const phoneEl = $('#fPhone');
  phoneEl.value = phoneEl.value.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  const firstBad = [];
  const branchId = form.querySelector('input[name="branch"]:checked')?.value;
  if (!branchId) { firstBad.push(bad('#formBranches')); toast(t('needBranch'), 'pin'); }
  if ($('#fName').value.trim().length < 2) firstBad.push(bad('#fName'));
  if (!normPhone($('#fPhone').value)) firstBad.push(bad('#fPhone'));
  const mode = getMode();
  if (mode === 'delivery' && $('#fAddr').value.trim().length < 4 && !S.geo) firstBad.push(bad('#fAddr'));
  if (firstBad.length) { firstBad[0].scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); return false; }

  const b = S.branches[branchId];
  if (!b.accepting) { toast(t('notAccepting'), 'close'); return false; }
  if (mode === 'delivery' && !b.delivery) { toast(t('noDelivery'), 'close'); return false; }
  const outs = S.cart.filter((l) => isOut(S.items[l.id], branchId)).map((l) => L(S.items[l.id], 'name'));
  if (outs.length) { toast(t('outWarn', { list: outs.join(S.lang === 'ar' ? '، ' : ', ') }), 'close'); return false; }

  store.set('mc_customer', { name: $('#fName').value.trim(), phone: $('#fPhone').value.trim(), address: $('#fAddr').value.trim(), mode });
  return true;
}

/* ─── receipt & WhatsApp ─── */
function newOrderId() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(5));
  return `MC-${[...r].map((x) => abc[x % abc.length]).join('')}`;
}

function orderData() {
  const b = branch();
  const when = form.querySelector('input[name="when"]:checked')?.value === 'later' && $('#fTime').value
    ? fmtClock(toMin($('#fTime').value)) : t('asap');
  return {
    id: S.orderId ||= newOrderId(),
    branch: b,
    mode: getMode(),
    name: $('#fName').value.trim(),
    phone: normPhone($('#fPhone').value) || $('#fPhone').value.trim(),
    address: getMode() === 'delivery' ? $('#fAddr').value.trim() : '',
    geo: getMode() === 'delivery' ? S.geo : null,
    when,
    notes: $('#fNotes').value.trim(),
    lines: S.cart.map((l) => ({ ...l, item: S.items[l.id], price: linePrice(l) })),
    total: cartTotal(),
  };
}

function lineOpts(l) {
  const out = [];
  if (l.combo) out.push(t('comboTitle') + (S.lang === 'ar' ? ' (بطاطا + مشروب)' : ' (fries + drink)'));
  if (l.addons?.length) out.push(`${t('addonsLbl')}: ${l.addons.map((a) => (S.items[a] ? L(S.items[a], 'name') : a)).join(S.lang === 'ar' ? '، ' : ', ')}`);
  if (l.note) out.push(`${t('noteLbl')}: ${l.note}`);
  return out;
}

function buildMessage(o) {
  const ar = S.lang === 'ar';
  const sep = '━━━━━━━━━━━━━━';
  const rows = [];
  rows.push(ar ? '🍔 *طلب جديد — Meat & Cheezz*' : '🍔 *New order — Meat & Cheezz*');
  rows.push(`${ar ? 'رقم الطلب' : 'Order no.'}: *${o.id}*`);
  rows.push(`${ar ? 'الفرع' : 'Branch'}: ${L(o.branch, 'name')}`);
  rows.push(`${ar ? 'النوع' : 'Type'}: ${o.mode === 'delivery' ? `${t('delivery')} 🛵` : `${t('pickup')} 🏪`}`);
  rows.push(sep);
  for (const l of o.lines) {
    const size = l.item.sizes.length > 1 ? (l.item.sizes.find((s) => s.id === l.size) || {})[S.lang] : '';
    const nm = ar ? `${l.item.name_ar} (${l.item.name_en})` : l.item.name_en;
    rows.push(`*${l.qty}× ${nm}*${size ? ` — ${size}` : ''}`);
    for (const opt of lineOpts(l)) rows.push(`   ▫️ ${opt}`);
    rows.push(`   = ${priceText(l.price)}`);
  }
  rows.push(sep);
  rows.push(`*${t('total')}: ${priceText(o.total)}*`);
  if (o.mode === 'delivery') rows.push(`_${L(S.menu.settings, 'delivery_note') || t('deliveryNoteDefault')}_`);
  rows.push(sep);
  rows.push(`👤 ${t('name')}: ${o.name}`);
  rows.push(`📞 ${t('phone')}: ${o.phone}`);
  if (o.mode === 'delivery') {
    if (o.address) rows.push(`📍 ${t('address')}: ${o.address}`);
    if (o.geo) rows.push(`🗺️ ${ar ? 'الموقع' : 'Location'}: https://maps.google.com/?q=${o.geo.lat},${o.geo.lng}`);
  }
  rows.push(`⏰ ${t('time')}: ${o.when}`);
  if (o.notes) rows.push(`📝 ${t('notes')}: ${o.notes}`);
  return rows.join('\n');
}

function renderReceipt(animate) {
  const o = orderData();
  const r = $('#receipt');
  const kv = [
    [t('branch'), L(o.branch, 'name')],
    [t('orderType'), o.mode === 'delivery' ? t('delivery') : t('pickup')],
    [t('name'), o.name],
    [t('phone'), o.phone],
    ...(o.mode === 'delivery' ? [[t('address'), [o.address, o.geo ? '📍 GPS' : ''].filter(Boolean).join(' · ')]] : []),
    [t('time'), o.when],
    ...(o.notes ? [[t('notes'), o.notes]] : []),
  ];
  r.innerHTML = `<h3>MEAT &amp; CHEEZZ</h3><div class="rc-sub">${esc(t('receiptSub'))}</div><hr>
    ${o.lines.map((l) => {
      const size = l.item.sizes.length > 1 ? (l.item.sizes.find((s) => s.id === l.size) || {})[S.lang] : '';
      return `<div class="rc-row"><span>${l.qty}× ${esc(L(l.item, 'name'))}${size ? ` · ${esc(size)}` : ''}</span><span>${money(l.price)}</span></div>
        ${lineOpts(l).map((x) => `<div class="rc-opts">${esc(x)}</div>`).join('')}`;
    }).join('')}
    <hr><div class="rc-row rc-total"><span>${esc(t('total'))}</span><span>${esc(priceText(o.total))}</span></div>
    ${o.mode === 'delivery' ? `<div class="rc-opts" style="padding:0">${esc(L(S.menu.settings, 'delivery_note') || t('deliveryNoteDefault'))}</div>` : ''}
    <hr><dl class="rc-kv">${kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="rc-code">${esc(o.id)}</div>`;
  const b = o.branch;
  if (b && !branchStatus(b).open && o.when === t('asap')) toast(t('closedWarn'), 'clock');
  r.classList.remove('print');
  if (animate && !reduced) { void r.offsetWidth; r.classList.add('print'); }
  else r.style.clipPath = 'none';
}

function sendOrder() {
  const o = orderData();
  if (!o.branch) { goStep(1); toast(t('needBranch'), 'pin'); return; }
  const msg = buildMessage(o);
  const url = `https://wa.me/${o.branch.whatsapp}?text=${encodeURIComponent(msg)}`;

  // Log for the dashboard (fire-and-forget; never blocks the customer)
  const payload = JSON.stringify({
    id: o.id, branch_id: o.branch.id, mode: o.mode, name: o.name, phone: o.phone, lang: S.lang,
    lines: o.lines.map((l) => ({ item_id: l.id, size_id: l.size, qty: l.qty, combo: l.combo, addons: l.addons, note: l.note })),
  });
  try {
    const ok = navigator.sendBeacon?.('/api/orders', new Blob([payload], { type: 'application/json' }));
    if (!ok) fetch('/api/orders', { method: 'POST', body: payload, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }

  // Must stay synchronous inside the click so pop-up blockers allow it
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();

  store.set('mc_last_order', { lines: S.cart.map(({ k, ...l }) => l), at: Date.now() });
  S.sent = { id: o.id, url };
  S.orderId = null;
  renderDone();
  confetti($('#cartNext'));
}

function renderDone() {
  goStep(2, false);
  $('#paneReview').innerHTML = `<div class="done"><div class="done__check">${icon('check')}</div>
    <h3>${esc(t('doneTitle'))}</h3><p>${esc(t('doneDesc'))}</p>
    <a class="btn btn--wa" href="${esc(S.sent.url)}" target="_blank" rel="noopener">${icon('wa')}${esc(t('openWaAgain'))}</a></div>`;
  $('#cartBack').hidden = true;
  updateFoot();
}

/* ════════════════════════ branch picker ════════════════════════ */
const branchModal = $('#branchModal');
wireDialog(branchModal);
function openBranchPicker() {
  $('#bmList').innerHTML = Object.values(S.branches).map((b) => {
    const st = branchStatus(b);
    return `<button type="button" data-pick="${esc(b.id)}"><span class="bm__pin">${icon('pin')}</span>
      <span class="bm__body"><b>${esc(L(b, 'name'))}</b><small>${esc(L(b, 'address'))}</small>
      <span class="status${st.open ? '' : ' is-closed'}"><i class="dot${st.open ? '' : ' is-closed'}"></i>${esc(st.label)}</span></span></button>`;
  }).join('');
  openDialog(branchModal);
}
$('#bmList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pick]');
  if (!btn) return;
  selectBranch(btn.dataset.pick);
  closeDialog(branchModal);
});
function selectBranch(id, announce = true) {
  if (!S.branches[id]) return;
  const changed = S.branchId !== id;
  S.branchId = id;
  store.set('mc_branch', id);
  renderBranchChip();
  if (changed) {
    renderLineup();
    renderMenu();
    renderBranches();
    renderCart();
  }
  if (announce) toast(t('branchSet', { b: L(S.branches[id], 'name') }), 'pin');
}

/* ════════════════════════ DJ turntable ════════════════════════ */
function setupDJ() {
  const vinyl = $('#djVinyl');
  const arm = $('#djArm');
  const name = $('#djName');
  const img = $('#djImg');
  let angle = 0, spinning = false;
  if (!reduced) vinyl.classList.add('idle');

  $('#djMoods').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mood]');
    if (!b) return;
    S.mood = b.dataset.mood;
    $$('#djMoods [data-mood]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  });

  $('#djSpin').addEventListener('click', () => {
    if (spinning || !S.menu) return;
    let pool = S.menu.items.filter((i) => isBurgerCat(i.category_id) && i.image && !isOut(i));
    if (S.mood === 'spicy') pool = pool.filter((i) => i.tags?.includes('spicy'));
    else if (S.mood !== 'all') pool = pool.filter((i) => i.category_id === S.mood);
    if (!pool.length) return;
    spinning = true;
    vibrate(20);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    vinyl.classList.remove('idle');
    arm.classList.add('on');
    $('#djResult').innerHTML = '';
    const turns = 4 + Math.floor(Math.random() * 3);
    const from = angle;
    angle += turns * 360 + Math.floor(Math.random() * 360);
    const dur = reduced ? 10 : 2600;
    vinyl.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: dur, easing: 'cubic-bezier(.12,.8,.22,1)', fill: 'forwards' });
    // name shuffle that slows down like a slot machine
    let elapsed = 0, gap = 50, i = 0;
    const shuffle = () => {
      const it = pool[i++ % pool.length];
      name.textContent = it.name_en.toUpperCase();
      img.src = smImg(it.image);
      elapsed += gap;
      gap = Math.min(380, gap * 1.16);
      if (elapsed < dur - 300 && !reduced) setTimeout(shuffle, gap);
      else land();
    };
    const land = () => {
      name.textContent = pick.name_en.toUpperCase();
      img.src = smImg(pick.image);
      spinning = false;
      const tl = TAGLINES[pick.id]?.[S.lang] || L(pick, 'desc');
      $('#djResult').innerHTML = `<div class="djcard"><img src="${esc(smImg(pick.image))}" alt="" width="180" height="150">
        <div><small style="color:var(--yellow);font-weight:800">${esc(t('djPick'))}</small><h3>${esc(L(pick, 'name'))}</h3><p>${esc(tl)}</p>
        <button class="btn btn--yellow" type="button" data-open="${esc(pick.id)}">${icon('plus')}${esc(t('djOrder'))} · ${money(minPrice(pick))}</button></div></div>`;
      $('#djSpin span').textContent = t('djAgain');
      confetti($('#deck'));
      vibrate([10, 40, 10]);
    };
    shuffle();
  });
}

function confetti(origin) {
  if (reduced || !origin) return;
  const r = origin.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 3;
  const colors = ['#ffd400', '#ffb703', '#ff7a00', '#fff6d5', '#ff4b2b'];
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    const s = 6 + Math.random() * 8;
    p.style.cssText = `width:${s}px;height:${s * (Math.random() > .5 ? 1 : .45)}px;background:${colors[i % colors.length]};left:${cx}px;top:${cy}px;${Math.random() > .7 ? 'border-radius:50%;' : ''}`;
    topLayer(p);
    const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 180;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 120;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx * 1.2}px, ${dy + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => p.remove();
  }
}

/* ════════════════════════ hero: embers + tilt ════════════════════════ */
function setupEmbers() {
  const c = $('#embers');
  if (!c || reduced) return;
  const ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let w = 0, h = 0, running = false, visible = true;
  if (navigator.connection?.saveData) return;
  const N = innerWidth < 760 ? 18 : 40;
  const parts = [];
  const spawn = (p, initial) => {
    p.x = Math.random() * w;
    p.y = initial ? Math.random() * h : h + 10;
    p.r = 0.8 + Math.random() * 2.4;
    p.vy = 0.25 + Math.random() * 0.9;
    p.vx = (Math.random() - 0.5) * 0.4;
    p.life = 0;
    p.max = 260 + Math.random() * 360;
    p.hue = 38 + Math.random() * 18;
    p.seed = Math.random() * 6.28;
    return p;
  };
  const size = () => {
    const r = c.getBoundingClientRect();
    w = r.width; h = r.height;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  for (let i = 0; i < N; i++) parts.push(spawn({}, true));
  let started = false;
  const frame = () => {
    if (!running) return;
    started = true;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.life++;
      p.y -= p.vy;
      p.x += p.vx + Math.sin((p.life + p.seed * 50) / 40) * 0.3;
      const a = Math.sin(Math.PI * clamp(p.life / p.max, 0, 1));
      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${a * 0.12})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${a * 0.9})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      if (p.life > p.max || p.y < -20) spawn(p, false);
    }
    requestAnimationFrame(frame);
  };
  const toggle = () => {
    const should = visible && !document.hidden;
    if (should && !running) { running = true; requestAnimationFrame(frame); }
    else if (!should) running = false;
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (started) toggle(); }).observe(c);
  document.addEventListener('visibilitychange', () => { if (started) toggle(); });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); }, { passive: true });
  // start once the page has loaded (and the intro finished) so we never compete with first paint
  const start = () => setTimeout(() => idle(toggle, 1000), html.classList.contains('no-intro') ? 900 : 1900);
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
}

function setupTilt() {
  if (reduced || !fine) return;
  const pin = $('#storyPin');
  const float = $('#sbFloat');
  const layers = [[$('.hero__ring'), 18], [$('.hero__glow'), 30]];
  let raf = 0, tx = 0, ty = 0;
  pin.addEventListener('pointermove', (e) => {
    if (story.p > 0.02) return;
    const r = pin.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5;
    ty = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      float.style.setProperty('--ry', `${tx * 16}deg`);
      float.style.setProperty('--rx', `${-ty * 12}deg`);
      layers.forEach(([el, k]) => { el.style.translate = `${tx * k}px ${ty * k}px`; });
    });
  });
  pin.addEventListener('pointerleave', () => {
    float.style.setProperty('--ry', '0deg');
    float.style.setProperty('--rx', '0deg');
    layers.forEach(([el]) => { el.style.translate = ''; });
  });
}

/* ════════════════════════ the Smash story (pinned, scroll-scrubbed) ════════════════════════
   0.00 hero → 0.10 zoom → 0.20 stack (explode + labels) → 0.48 slam → 0.56 SMASH! impact
   → 0.66 combo box rises → 0.72 burger drops in → fries / drink / dip → 0.86 lid closes → CTA */
const ASPECT = 1568 / 1237;
// cut lines between the 5 layers, as [x%, y%] points across the burger photo
const CUTS = [
  [[0, 33], [20, 32], [45, 30], [65, 31], [80, 35], [92, 40], [100, 42]],
  [[0, 47], [25, 48], [45, 50], [62, 52], [75, 58], [84, 61], [92, 54], [100, 50]],
  [[0, 64], [25, 66], [50, 69], [75, 71], [100, 68]],
  [[0, 79], [25, 81], [50, 85], [75, 87], [100, 88]],
];
const L_OFF = [-0.52, -0.25, 0, 0.23, 0.48];   // explode offsets (× burger height)
const L_ROT = [-5, 4, -2, 3, -3];
const L_MID = [0.16, 0.41, 0.58, 0.75, 0.92];   // where each layer's label points
const CH_P = [0, 0.34, 0.575, 0.985];
const story = { p: 0 };

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const mix = (a, b, t) => a + (b - a) * t;
const mixR = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t) });

function clipFor(i) {
  const top = i === 0 ? [[0, 0], [100, 0]] : CUTS[i - 1];
  // bottom edge overlaps the next layer by a hair so no seam shows when stacked
  const bot = i === 4 ? [[0, 100], [100, 100]] : CUTS[i].map(([x, y]) => [x, y + 0.7]);
  return `polygon(${[...top, ...[...bot].reverse()].map(([x, y]) => `${x}% ${y}%`).join(',')})`;
}

function setupStory() {
  const sec = $('#top');
  const pin = $('#storyPin');
  const sb = $('#sb');
  const layers = $$('.sb__l', sb);
  const shadow = $('#sbShadow');
  const copy = $('#storyCopy');
  const slot = $('#heroSlot');
  const slotDecor = $('#slotDecor');
  const decor = $('#storyDecor');
  const burst = $('#storyBurst');
  const word = $('#stackWord');
  const head = $('#stackHead');
  const labels = $$('#sLabels li');
  const impact = $('#impact');
  const shake = $('#storyShake');
  const comboHead = $('#comboHead');
  const box = $('#box');
  const boxSlot = $('#boxSlot');
  const back = $('.box__back'), front = $('.box__front'), lid = $('#boxLid');
  const fries = $('.box__fries'), cup = $('.box__cup'), dip = $('.box__dip');
  const lidOut = $('.lid__out');
  const cta = $('#comboCta');
  const hint = $('#storyHint');
  const bar = $('#storyBar');
  const chapters = $$('#chapters [data-ch]');
  layers.forEach((l, i) => { l.style.clipPath = clipFor(i); });

  let M = null, lastP = 0, ticking = false, active = true;

  const measure = () => {
    const vw = pin.clientWidth, vh = pin.clientHeight;
    const pr = pin.getBoundingClientRect();
    const rel = (r) => ({ x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height });
    const mobile = vw < 900;
    const rtl = html.dir === 'rtl';
    const navH = $('#nav').offsetHeight || 64;
    const gutter = vw < 760 ? 16 : 28;
    // hero: fit inside the slot (minus the decor padding)
    const s = rel(slot.getBoundingClientRect());
    const ins = mobile ? [0.06, 0.02, 0.1] : [0.1, 0.02, 0.12];
    const iw = s.w * (1 - ins[1] * 2), ih = s.h * (1 - ins[0] - ins[2]);
    const hw = Math.min(iw, ih * ASPECT);
    const hero = { x: s.x + (s.w - hw) / 2, y: s.y + s.h * ins[0] + (ih - hw / ASPECT) / 2, w: hw };
    // zoom: big and centred
    const zw = Math.min(vw * (mobile ? 0.92 : 0.62), (vh - navH - 40) * 0.78 * ASPECT, 820);
    const zoom = { x: (vw - zw) / 2, y: navH + (vh - navH - zw / ASPECT) / 2, w: zw };
    // stack: leaves room for the explode (≈1.9× height) and the labels
    const sw = Math.min(mobile ? vw * 0.54 : vw * 0.34, ((vh - navH - (mobile ? 150 : 190)) / 2.1) * ASPECT, 560);
    const sx = mobile ? (rtl ? vw - gutter - sw : gutter) : (vw - sw) / 2;
    const stack = { x: sx, y: navH + (mobile ? 88 : 110) + ((vh - navH - (mobile ? 88 : 110)) - sw / ASPECT) / 2, w: sw };
    // impact: centred, medium
    const iw2 = Math.min(vw * (mobile ? 0.8 : 0.42), (vh * 0.42) * ASPECT, 600);
    const imp = { x: (vw - iw2) / 2, y: (vh - iw2 / ASPECT) / 2 - vh * 0.02, w: iw2 };
    // box: the slot inside the combo box (box parts are only translated, the slot is not)
    const b = rel(boxSlot.getBoundingClientRect());
    const inBox = { x: b.x, y: b.y, w: b.w };
    const base = Math.ceil(Math.max(hero.w, zoom.w, stack.w, imp.w, inBox.w));
    sb.style.width = `${base}px`;
    const lw = mobile ? Math.max(110, (rtl ? sx - gutter : vw - (sx + sw) - gutter) - 14) : clamp(vw * 0.2, 190, 300);
    pin.style.setProperty('--lw', `${lw}px`);
    M = { vw, vh, mobile, rtl, hero, zoom, stack, imp, inBox, base, lw, gutter, boxH: box.offsetHeight };
  };

  const render = () => {
    ticking = false;
    if (!M) measure();
    const r0 = sec.getBoundingClientRect();
    const span = Math.max(1, sec.offsetHeight - pin.clientHeight);
    const p = reduced ? 0 : clamp(-r0.top / span, 0, 1);
    story.p = p;
    sec.classList.toggle('is-moving', p > 0.004);

    // ── actor path
    const tA = easeIO(seg(p, 0, 0.1)), tB = easeIO(seg(p, 0.1, 0.2));
    const tI = easeIO(seg(p, 0.5, 0.57)), tC = easeIO(seg(p, 0.71, 0.8));
    let r = mixR(M.hero, M.zoom, tA);
    r = mixR(r, M.stack, tB);
    r = mixR(r, M.imp, tI);
    r = mixR(r, M.inBox, tC);
    const s = r.w / M.base;
    sb.style.transform = `translate3d(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    const H0 = M.base / ASPECT;
    const explode = easeOut(seg(p, 0.17, 0.36)) * (1 - easeIn(seg(p, 0.47, 0.555)));
    layers.forEach((l, i) => {
      l.style.transform = explode ? `translate3d(0, ${(L_OFF[i] * explode * H0).toFixed(2)}px, 0) rotate(${(L_ROT[i] * explode).toFixed(2)}deg)` : '';
    });
    shadow.style.opacity = String((1 - seg(p, 0.02, 0.12)) + 0.8 * seg(p, 0.57, 0.6) * (1 - seg(p, 0.68, 0.72)));

    // ── hero layer fades out
    const fade = seg(p, 0, 0.07);
    copy.style.opacity = String(1 - fade);
    copy.style.transform = fade ? `translateY(${-70 * easeIn(fade)}px)` : '';
    copy.style.visibility = fade >= 1 ? 'hidden' : '';
    slotDecor.style.opacity = String(1 - seg(p, 0, 0.05));
    decor.style.opacity = String(1 - seg(p, 0.03, 0.12));
    hint.style.opacity = String(1 - seg(p, 0, 0.03));

    // ── yellow burst from the burger's centre
    const cx = r.x + r.w / 2, cy = r.y + r.w / ASPECT / 2;
    const maxR = Math.hypot(Math.max(cx, M.vw - cx), Math.max(cy, M.vh - cy)) + 20;
    const rad = maxR * easeIO(seg(p, 0.07, 0.17)) * (1 - easeIO(seg(p, 0.63, 0.71)));
    burst.style.clipPath = `circle(${rad.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
    const brandDark = rad > maxR * 0.5;
    $('#nav').classList.toggle('on-yellow', brandDark);

    // ── chapter 2: the stack
    const stackIn = seg(p, 0.17, 0.24) * (1 - seg(p, 0.46, 0.5));
    head.style.opacity = String(stackIn);
    head.style.transform = `translateY(${(1 - stackIn) * 24}px)`;
    word.style.opacity = String(seg(p, 0.15, 0.24) * (1 - seg(p, 0.48, 0.53)));
    word.style.transform = `translateX(${(-p * 0.9 * M.vw).toFixed(1)}px)`;
    labels.forEach((li, i) => {
      const t = seg(p, 0.23 + i * 0.03, 0.27 + i * 0.03) * (1 - seg(p, 0.45, 0.48));
      const side = M.mobile ? (M.rtl ? 'l' : 'r') : (i % 2 ? 'l' : 'r');
      if (li.dataset.side !== side) li.dataset.side = side;
      const ay = r.y + s * (L_MID[i] * H0 + L_OFF[i] * explode * H0);
      const ax = side === 'r' ? r.x + r.w + 10 : r.x - 10 - M.lw;
      const slide = (1 - easeOut(t)) * (side === 'r' ? 30 : -30);
      li.style.opacity = String(t);
      li.style.transform = `translate3d(${(ax + slide).toFixed(1)}px, ${(ay - 15).toFixed(1)}px, 0)`;
    });

    // ── chapter 3: SMASH!
    const imp = seg(p, 0.55, 0.565) * (1 - seg(p, 0.64, 0.68));
    impact.style.opacity = String(imp);
    impact.style.setProperty('--cx', `${cx.toFixed(0)}px`);
    impact.style.setProperty('--cy', `${cy.toFixed(0)}px`);
    if (lastP < 0.56 && p >= 0.56) {
      for (const el of [impact, shake]) { el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
      vibrate([25, 30, 15]);
      if (!reduced) sparks(cx, cy + (r.w / ASPECT) * 0.35);
    }

    // ── chapter 4: combo box
    const rise = 1 - easeOut(seg(p, 0.65, 0.73));
    const riseY = (rise * (M.vh * 0.9)).toFixed(1);
    back.style.transform = `translate3d(0, ${riseY}px, 0)`;
    front.style.transform = `translate3d(0, ${riseY}px, 0)`;
    comboHead.style.opacity = String(seg(p, 0.67, 0.73));
    comboHead.style.transform = `translateY(${(1 - seg(p, 0.67, 0.73)) * 30}px)`;
    const drop = (el, a, b, rot) => {
      const t = seg(p, a, b);
      const y = (1 - easeBack(t)) * -M.vh;
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) rotate(${((1 - t) * rot).toFixed(1)}deg)`;
    };
    drop(fries, 0.77, 0.82, -24);
    drop(cup, 0.795, 0.845, 18);
    drop(dip, 0.815, 0.86, -14);
    const close = seg(p, 0.86, 0.94);
    const ang = -112 + 112 * (close < 1 ? easeIO(close) : 1);
    lid.style.transform = `translate3d(0, ${riseY}px, 0) perspective(1400px) rotateX(${ang.toFixed(2)}deg)`;
    lidOut.style.setProperty('--shine', `${(-120 + 240 * seg(p, 0.93, 0.99)).toFixed(0)}%`);
    if (lastP < 0.935 && p >= 0.935) { vibrate(18); box.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(6px) scaleY(.985)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' }); }
    const ctaT = seg(p, 0.93, 0.97);
    cta.style.opacity = String(ctaT);
    cta.style.transform = `translateY(${(1 - ctaT) * 20}px)`;
    cta.classList.toggle('on', ctaT > 0.5);

    // ── progress UI
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    const ch = p < 0.14 ? 0 : p < 0.5 ? 1 : p < 0.64 ? 2 : 3;
    chapters.forEach((c, i) => c.classList.toggle('on', i === ch));
    lastP = p;
  };

  const kick = () => { if (!ticking && active) { ticking = true; requestAnimationFrame(render); } };
  if (reduced) sec.classList.add('is-static');
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) kick(); }, { rootMargin: '200px 0px' }).observe(sec);
  addEventListener('scroll', kick, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { M = null; kick(); }, 120); }, { passive: true });
  document.fonts?.ready.then(() => { M = null; kick(); });
  addEventListener('load', () => { M = null; kick(); }, { once: true });
  story.remeasure = () => { M = null; kick(); };
  measure();
  render();
  sb.classList.add('is-ready');

  chapters.forEach((c) => c.addEventListener('click', () => {
    const span = sec.offsetHeight - pin.clientHeight;
    const top = sec.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + span * CH_P[Number(c.dataset.ch)], behavior: reduced ? 'auto' : 'smooth' });
  }));
}

// grease sparks flying off the griddle at the SMASH moment
function sparks(x, y) {
  const colors = ['#ffd400', '#ffb703', '#ff7a00', '#fff2b8'];
  for (let i = 0; i < 26; i++) {
    const el = document.createElement('i');
    el.className = 'confetti';
    const sz = 3 + Math.random() * 6;
    el.style.cssText = `width:${sz}px;height:${sz}px;border-radius:50%;background:${colors[i % colors.length]};left:${x}px;top:${y}px;box-shadow:0 0 8px ${colors[i % colors.length]}`;
    topLayer(el);
    const ang = Math.PI + Math.random() * Math.PI, dist = 80 + Math.random() * 220;
    const dx = Math.cos(ang) * dist * (Math.random() > 0.5 ? 1 : -1), dy = Math.sin(ang) * dist * 0.7;
    el.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(.8)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx * 1.15}px, ${dy + 140}px) scale(.3)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => el.remove();
  }
}

/* ════════════════════════ scroll-driven bits ════════════════════════ */
function setupScroll() {
  const nav = $('#nav');
  const menubar = $('#menubar');
  const finale = $('#finaleBig');
  let lastY = scrollY, ticking = false, finOn = false;

  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  new IntersectionObserver(([e]) => { finOn = e.isIntersecting; kick(); }).observe(finale);

  const update = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 10);
    const delta = y - lastY;
    if (!html.classList.contains('lock') && Math.abs(delta) > 4) {
      if (delta > 0 && y > 700) nav.classList.add('is-hidden');
      else if (delta < 0) nav.classList.remove('is-hidden');
    }
    if (y < 200) nav.classList.remove('is-hidden');
    lastY = y;
    menubar.classList.toggle('is-stuck', menubar.getBoundingClientRect().top <= (nav.classList.contains('is-hidden') ? 1 : nav.offsetHeight + 1));
    updateDock();
    if (finOn) {
      const r = finale.getBoundingClientRect();
      const p = clamp((innerHeight - r.top) / (innerHeight * 0.75), 0, 1);
      finale.style.setProperty('--fill', `${Math.round(p * 100)}%`);
    }
  };
  addEventListener('scroll', kick, { passive: true });
  update();
}

function updateDock() {
  const dock = $('#dock');
  const sec = $('#top');
  const storyEnd = sec.offsetTop + sec.offsetHeight - innerHeight * 0.6;
  const show = cartCount() > 0 ? scrollY < 40 || scrollY > storyEnd || story.p < 0.04 : scrollY > storyEnd;
  dock.classList.toggle('is-on', show && !html.classList.contains('lock'));
}

function setupMagnetic() {
  if (reduced || !fine) return;
  document.addEventListener('pointermove', (e) => {
    const m = e.target.closest?.('.magnetic');
    if (!m) return;
    const r = m.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    m.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
  });
  document.addEventListener('pointerout', (e) => {
    const m = e.target.closest?.('.magnetic');
    if (m && !m.contains(e.relatedTarget)) m.style.transform = '';
  });
}

function setupCursor() {
  if (reduced || !fine) return;
  const c = $('#cursor');
  let x = -100, y = -100, cx = -100, cy = -100, on = false;
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!on) { on = true; c.classList.add('on'); }
    c.classList.toggle('big', Boolean(e.target.closest?.('a, button, label, .card, .track, input, select, textarea')));
  }, { passive: true });
  document.addEventListener('pointerleave', () => { on = false; c.classList.remove('on'); });
  const loop = () => {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    c.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

/* ════════════════════════ global events ════════════════════════ */
document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) {
    const card = open.closest('.card, .track, .djcard');
    openSheet(open.dataset.open, card?.querySelector('img'));
    return;
  }
  const quick = e.target.closest('[data-quick]');
  if (quick) {
    const item = S.items[quick.dataset.quick];
    if (!item) return;
    const cat = S.cats[item.category_id] || {};
    if (item.sizes.length === 1 && !cat.allows_combo && !cat.allows_addons) quickAdd(item.id, null, quick);
    else openSheet(item.id, quick.closest('.card')?.querySelector('img'));
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) { quickAdd(add.dataset.add, add.dataset.size, add); return; }
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    const sec = $(`#cat-${CSS.escape(tab.dataset.tab)}`);
    spyLock = Date.now() + 900;
    $$('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
    moveInk(tab);
    const tabs = $('#tabs');
    const tr = tabs.getBoundingClientRect(), br = tab.getBoundingClientRect();
    tabs.scrollBy({ left: br.left + br.width / 2 - (tr.left + tr.width / 2), behavior: reduced ? 'auto' : 'smooth' });
    sec?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  const ob = e.target.closest('[data-order-branch]');
  if (ob) { selectBranch(ob.dataset.orderBranch); $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return; }
  const oc = e.target.closest('[data-open-combo]');
  if (oc) { openSheet(oc.dataset.openCombo, $('#sb img'), { combo: true }); return; }
  if (e.target.closest('[data-open-cart]')) openCart();
});

$('#cartBtn').addEventListener('click', openCart);
$('#dockCart').addEventListener('click', openCart);
$('#branchChip').addEventListener('click', () => S.menu && openBranchPicker());
$('#langBtn').addEventListener('click', () => setLang(S.lang === 'ar' ? 'en' : 'ar'));
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 110);
  $('#searchToggle').classList.toggle('has-q', Boolean($('#search').value));
});
$('#searchToggle').addEventListener('click', () => {
  const bar = $('#menubar');
  const on = !bar.classList.contains('is-searching');
  bar.classList.toggle('is-searching', on);
  $('#searchToggle').setAttribute('aria-expanded', String(on));
  if (on) $('#search').focus({ preventScroll: true });
});
// "/" jumps to search on desktop
addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.target.closest?.('input, textarea, select') || html.classList.contains('lock')) return;
  e.preventDefault();
  $('#menubar').classList.add('is-searching');
  $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  setTimeout(() => $('#search').focus({ preventScroll: true }), reduced ? 0 : 450);
});
$('#railPrev').addEventListener('click', () => $('#rail').scrollBy({ left: -340 * (S.lang === 'ar' ? -1 : 1), behavior: 'smooth' }));
$('#railNext').addEventListener('click', () => $('#rail').scrollBy({ left: 340 * (S.lang === 'ar' ? -1 : 1), behavior: 'smooth' }));
addEventListener('resize', () => { const a = $('#tabs button[aria-selected="true"]'); if (a) moveInk(a, false); }, { passive: true });
addEventListener('storage', (e) => { if (e.key === 'mc_cart') { S.cart = store.get('mc_cart', []); renderCart(); } });

// refresh open/closed labels every minute
setInterval(() => { if (S.menu) { renderHeroMeta(); } }, 60000);

function setupPausing() {
  if (!('IntersectionObserver' in window)) { $$('.paused').forEach((el) => el.classList.remove('paused')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('paused', !e.isIntersecting);
  }, { rootMargin: '150px 0px' });
  $$('[data-anim]').forEach((el) => io.observe(el));
}

/* ════════════════════════ boot ════════════════════════ */
if (S.lang !== 'ar') applyStatic();
try { $('#toasts').setAttribute('popover', 'manual'); $('#toasts').showPopover?.(); } catch { /* ignore */ }
setupPausing();
setupStory();
setupScroll();
setupCounters();
setupEmbers();
setupTilt();
setupDJ();
setupMagnetic();
setupCursor();
observeReveals();
renderCart();
loadMenu().finally(() => $('#menuSkeleton')?.remove());
setTimeout(() => $('#intro')?.remove(), 2600);
