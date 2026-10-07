// Meat & Cheezz — admin dashboard (vanilla JS)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const jd = (fils) => (Number(fils || 0) / 1000).toFixed(2);
const toFils = (v) => Math.round(parseFloat(String(v).replace(',', '.')) * 1000);

const T = {
  ar: {
    loginTitle: 'لوحة التحكم', loginSub: 'ادخل كلمة السر لتعدّل المنيو والأسعار والفروع.', password: 'كلمة السر', signIn: 'دخول',
    langSwitch: 'English', dashboard: 'لوحة التحكم', viewSite: 'شوف الموقع',
    tabOverview: 'الرئيسية', tabMenu: 'المنيو', tabBranches: 'الفروع', tabSettings: 'الإعدادات',
    delete: 'حذف', cancel: 'إلغاء', save: 'حفظ', categories: 'الأقسام',
    notConfigured: 'كلمة السر مش معرّفة على السيرفر. شغّل: npx wrangler secret put ADMIN_PASSWORD',
    ordersToday: 'طلبات اليوم', revenueToday: 'مبيعات اليوم', orders7: 'طلبات آخر ٧ أيام', avgOrder: 'معدّل الطلب',
    estNote: 'من الطلبات المرسلة عبر الموقع', last14: 'آخر ١٤ يوم', byBranch: 'حسب الفرع (٧ أيام)', topItems: 'الأكثر طلباً (٧ أيام)',
    recent: 'آخر الطلبات', refresh: 'تحديث', noOrders: 'لسا ما في طلبات من الموقع. أول ما حدا يطلب، رح يبيّن هون.',
    time: 'الوقت', order: 'الطلب', branch: 'الفرع', type: 'النوع', customer: 'الزبون', total: 'المجموع',
    pickup: 'استلام', delivery: 'توصيل', orders: 'طلب', jd: 'د.أ',
    menu: 'المنيو', newItem: 'صنف جديد', all: 'الكل', searchItems: 'دوّر على صنف…',
    legend: 'المفاتيح: ⭐ مميّز (يظهر بالنجوم) · متوفر = بكل الفروع · وكل فرع لحاله',
    available: 'متوفر', hiddenBadge: 'مخفي', edit: 'تعديل',
    editItem: 'تعديل صنف', newItemTitle: 'صنف جديد',
    photo: 'الصورة', upload: 'ارفع صورة', removePhoto: 'شيل الصورة', pickPhoto: 'أو اختار من الصور الموجودة', uploading: 'عم نرفع…',
    nameAr: 'الاسم (عربي)', nameEn: 'الاسم (إنجليزي)', descAr: 'المكونات (عربي)', descEn: 'المكونات (إنجليزي)',
    noteAr: 'ملاحظة قصيرة (عربي)', noteEn: 'ملاحظة قصيرة (إنجليزي)', noteHint: 'مثل: ٦ حلقات، بكفي ٢-٣',
    category: 'القسم', id: 'المعرّف (بالإنجليزي)', idHint: 'حروف صغيرة وأرقام وشرطات فقط، ما بتتغير بعد الحفظ',
    sizes: 'الأحجام والأسعار', sizeAr: 'الحجم (عربي)', sizeEn: 'الحجم (إنجليزي)', price: 'السعر', addSize: 'زيد حجم',
    presetBeef: '١٠٠/١٥٠/٢٠٠/٣٠٠ غ', presetChicken: 'ميني/سنجل/دبل', presetSauce: 'صغير/كبير', presetOne: 'حجم واحد',
    tags: 'وسوم', tag_spicy: 'حار', tag_grilled: 'مشوي', tag_signature: 'الأكثر طلباً', tag_new: 'جديد',
    flags: 'الحالة', featured: 'مميّز (بالنجوم)', soldOutAll: 'نفذ بكل الفروع', isAddon: 'إضافة للبرغر', active: 'ظاهر بالموقع', sort: 'الترتيب',
    saved: 'تم الحفظ ✓', deleted: 'انحذف', confirmDelete: 'أكيد بدك تحذف هالصنف؟ ما في رجعة.', error: 'صار خطأ',
    needSize: 'لازم يكون في حجم واحد على الأقل',
    catName: 'اسم القسم', tagline: 'سطر تعريفي', allowsCombo: 'بسمح بالكومبو', allowsAddons: 'بسمح بالإضافات', newCategory: 'قسم جديد', addCategory: 'زيد قسم', confirmDeleteCat: 'تحذف القسم؟',
    branches: 'الفروع', branchLbl: 'اسم الفرع', address: 'العنوان', phone: 'رقم الهاتف', whatsapp: 'رقم الواتساب (دولي بدون +)', waHint: 'مثال: 962788600111 — الطلبات بتوصل لهون',
    maps: 'رابط Google Maps', rating: 'تقييم Google', reviews: 'عدد المراجعات', opens: 'بيفتح', closes: 'بسكّر', hasDelivery: 'في توصيل', accepting: 'مستقبل طلبات أونلاين',
    settings: 'الإعدادات', comboPrice: 'سعر الكومبو', heroRating: 'التقييم بالواجهة', heroReviews: 'عدد المراجعات بالواجهة',
    deliveryNoteAr: 'ملاحظة التوصيل (عربي)', deliveryNoteEn: 'ملاحظة التوصيل (إنجليزي)', announceAr: 'شريط إعلان (عربي)', announceEn: 'شريط إعلان (إنجليزي)', announceHint: 'اتركه فاضي لإخفائه — مثل: عرض الويكند: كومبو مجاني!',
    social: 'روابط السوشال', ordersEnabled: 'الطلب أونلاين شغّال', general: 'عام',
    orderDetails: 'تفاصيل الطلب', items: 'الأصناف', chat: 'افتح محادثة واتساب', call: 'اتصال',
    wrongPw: 'كلمة السر غلط', showPw: 'إظهار',
  },
  en: {
    loginTitle: 'Dashboard', loginSub: 'Enter the password to edit the menu, prices and branches.', password: 'Password', signIn: 'Sign in',
    langSwitch: 'عربي', dashboard: 'Dashboard', viewSite: 'View site',
    tabOverview: 'Overview', tabMenu: 'Menu', tabBranches: 'Branches', tabSettings: 'Settings',
    delete: 'Delete', cancel: 'Cancel', save: 'Save', categories: 'Categories',
    notConfigured: 'No admin password is set on the server. Run: npx wrangler secret put ADMIN_PASSWORD',
    ordersToday: 'Orders today', revenueToday: 'Sales today', orders7: 'Orders, last 7 days', avgOrder: 'Average order',
    estNote: 'from orders sent through the site', last14: 'Last 14 days', byBranch: 'By branch (7 days)', topItems: 'Top items (7 days)',
    recent: 'Recent orders', refresh: 'Refresh', noOrders: 'No website orders yet. They will appear here as soon as someone orders.',
    time: 'Time', order: 'Order', branch: 'Branch', type: 'Type', customer: 'Customer', total: 'Total',
    pickup: 'Pickup', delivery: 'Delivery', orders: 'orders', jd: 'JD',
    menu: 'Menu', newItem: 'New item', all: 'All', searchItems: 'Search items…',
    legend: 'Keys: ⭐ featured (shown in the headliners) · Available = all branches · then each branch on its own',
    available: 'Available', hiddenBadge: 'Hidden', edit: 'Edit',
    editItem: 'Edit item', newItemTitle: 'New item',
    photo: 'Photo', upload: 'Upload photo', removePhoto: 'Remove photo', pickPhoto: 'or pick an existing photo', uploading: 'Uploading…',
    nameAr: 'Name (Arabic)', nameEn: 'Name (English)', descAr: 'Ingredients (Arabic)', descEn: 'Ingredients (English)',
    noteAr: 'Short note (Arabic)', noteEn: 'Short note (English)', noteHint: 'e.g. 6 rings, serves 2–3',
    category: 'Category', id: 'ID (English)', idHint: 'lowercase letters, numbers and dashes; fixed after saving',
    sizes: 'Sizes & prices', sizeAr: 'Size (Arabic)', sizeEn: 'Size (English)', price: 'Price', addSize: 'Add size',
    presetBeef: '100/150/200/300g', presetChicken: 'Mini/Single/Double', presetSauce: 'Small/Large', presetOne: 'Single size',
    tags: 'Tags', tag_spicy: 'Spicy', tag_grilled: 'Grilled', tag_signature: 'Fan favourite', tag_new: 'New',
    flags: 'Status', featured: 'Featured (headliners)', soldOutAll: 'Sold out everywhere', isAddon: 'Burger add-on', active: 'Visible on site', sort: 'Sort order',
    saved: 'Saved ✓', deleted: 'Deleted', confirmDelete: 'Delete this item? This cannot be undone.', error: 'Something went wrong',
    needSize: 'At least one size is required',
    catName: 'Category name', tagline: 'Tagline', allowsCombo: 'Allows combo', allowsAddons: 'Allows add-ons', newCategory: 'New category', addCategory: 'Add category', confirmDeleteCat: 'Delete this category?',
    branches: 'Branches', branchLbl: 'Branch name', address: 'Address', phone: 'Phone', whatsapp: 'WhatsApp number (international, no +)', waHint: 'e.g. 962788600111 — orders are sent here',
    maps: 'Google Maps link', rating: 'Google rating', reviews: 'Review count', opens: 'Opens', closes: 'Closes', hasDelivery: 'Delivery available', accepting: 'Accepting online orders',
    settings: 'Settings', comboPrice: 'Combo price', heroRating: 'Rating shown on the homepage', heroReviews: 'Review count on the homepage',
    deliveryNoteAr: 'Delivery note (Arabic)', deliveryNoteEn: 'Delivery note (English)', announceAr: 'Announcement bar (Arabic)', announceEn: 'Announcement bar (English)', announceHint: 'Leave empty to hide — e.g. Weekend deal: free combo upgrade!',
    social: 'Social links', ordersEnabled: 'Online ordering is on', general: 'General',
    orderDetails: 'Order details', items: 'Items', chat: 'Open WhatsApp chat', call: 'Call',
    wrongPw: 'Wrong password', showPw: 'Show',
  },
};

const S = { lang: localStorage.getItem('mc_admin_lang') || 'ar', data: null, view: 'overview', filter: 'all', q: '' };
const t = (k) => T[S.lang][k] ?? T.ar[k] ?? k;
const L = (o, f) => o?.[`${f}_${S.lang}`] || o?.[`${f}_ar`] || '';

function applyLang() {
  html.lang = S.lang;
  html.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.title = `${t('dashboard')} — MEAT AND CHEEZZ`;
}

function toast(msg, err = false) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast${err ? ' toast--err' : ''}`;
  el.textContent = msg;
  box.append(el);
  if (box.showPopover) { try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch { /* ignore */ } }
  setTimeout(() => el.remove(), err ? 4200 : 2200);
}

async function api(path, { method = 'GET', body, raw, type } = {}) {
  const headers = { 'x-mc-admin': '1' };
  if (raw) headers['content-type'] = type;
  else if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`/api/admin${path}`, { method, headers, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') { showLogin(); throw new Error(data.error || 'Not signed in'); }
  if (!res.ok || data.ok === false) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

/* ─── auth ─── */
function showLogin(msg) {
  $('#app').hidden = true;
  $('#login').hidden = false;
  if (msg) { $('#loginErr').hidden = false; $('#loginErr').textContent = msg; }
  setTimeout(() => $('#pw').focus(), 50);
}
async function boot() {
  applyLang();
  try { $('#toasts').setAttribute('popover', 'manual'); $('#toasts').showPopover?.(); } catch { /* ignore */ }
  const me = await fetch('/api/admin/me').then((r) => r.json()).catch(() => ({}));
  if (!me.configured) { showLogin(t('notConfigured')); return; }
  if (!me.authed) { showLogin(); return; }
  startApp();
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter || $('#loginForm button[type="submit"]');
  btn.disabled = true;
  try {
    await api('/login', { method: 'POST', body: { password: $('#pw').value } });
    $('#pw').value = '';
    $('#loginErr').hidden = true;
    startApp();
  } catch (err) {
    $('#loginErr').hidden = false;
    $('#loginErr').textContent = err.message === 'Wrong password' ? t('wrongPw') : err.message;
    const card = $('.login__card');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  } finally { btn.disabled = false; }
});
$('#pwEye').addEventListener('click', () => { const i = $('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; });
$('#logout').addEventListener('click', async () => { await api('/logout', { method: 'POST' }).catch(() => {}); showLogin(); });
$$('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  S.lang = S.lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('mc_admin_lang', S.lang);
  applyLang();
  if (!$('#app').hidden) render();
}));

async function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  await loadData();
  showView(location.hash.slice(1) || 'overview');
}
async function loadData() {
  S.data = await api('/menu');
}

/* ─── navigation ─── */
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) showView(b.dataset.view);
});
function showView(v) {
  if (!['overview', 'menu', 'branches', 'settings'].includes(v)) v = 'overview';
  S.view = v;
  history.replaceState(null, '', `#${v}`);
  $$('#tabs [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  $$('.view').forEach((s) => { s.hidden = s.id !== `view-${v}`; });
  render();
}
function render() {
  if (S.view === 'overview') renderOverview();
  if (S.view === 'menu') renderMenu();
  if (S.view === 'branches') renderBranches();
  if (S.view === 'settings') renderSettings();
}

/* ─── overview ─── */
const fmtTime = (ts) => new Intl.DateTimeFormat(S.lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', { timeZone: 'Asia/Amman', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ts * 1000));
const branchName = (id) => L(S.data.branches.find((b) => b.id === id), 'name') || id;
let ordersCache = [];

async function renderOverview() {
  const v = $('#view-overview');
  v.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel" style="height:220px"></div>';
  let stats, orders;
  try {
    [stats, orders] = await Promise.all([api('/stats?days=14'), api('/orders?limit=40')]);
  } catch (err) { v.innerHTML = `<p class="empty">${esc(err.message)}</p>`; return; }
  ordersCache = orders.orders;
  const max = Math.max(1, ...stats.byDay.map((d) => d.revenue));
  const W = 560, H = 170, bw = W / stats.byDay.length;
  const bars = stats.byDay.map((d, i) => {
    const h = Math.max(2, (d.revenue / max) * (H - 30));
    const label = d.day.slice(8);
    return `<g><rect class="bar" x="${i * bw + 4}" y="${H - 18 - h}" width="${bw - 8}" height="${h}" rx="4"><title>${d.day}: ${d.count} · ${jd(d.revenue)} JD</title></rect><text x="${i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${label}</text></g>`;
  }).join('');
  const bTotal = Math.max(1, ...Object.values(stats.byBranch).map((b) => b.count));
  const topMax = Math.max(1, ...stats.top.map((x) => x.qty));

  v.innerHTML = `
    <div class="vhead"><h2>${esc(t('tabOverview'))}</h2><span class="sp"></span><button class="btn btn--ghost btn--sm" type="button" id="refresh">${icon('refresh')}${esc(t('refresh'))}</button></div>
    <div class="kpis">
      <div class="card kpi"><small>${esc(t('ordersToday'))}</small><b>${stats.today.count}</b><span>${esc(t('estNote'))}</span></div>
      <div class="card kpi"><small>${esc(t('revenueToday'))}</small><b>${jd(stats.today.revenue)}</b><span>${esc(t('jd'))}</span></div>
      <div class="card kpi"><small>${esc(t('orders7'))}</small><b>${stats.week.count}</b><span>${jd(stats.week.revenue)} ${esc(t('jd'))}</span></div>
      <div class="card kpi"><small>${esc(t('avgOrder'))}</small><b>${jd(stats.week.avg)}</b><span>${esc(t('jd'))}</span></div>
    </div>
    <div class="grid2">
      <div class="card"><h3>${esc(t('last14'))}</h3><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t('last14'))}">${bars}</svg></div>
      <div class="card">
        <h3>${esc(t('byBranch'))}</h3>
        ${S.data.branches.map((b) => { const x = stats.byBranch[b.id] || { count: 0, revenue: 0 }; return `<div class="hbar"><b>${esc(L(b, 'name'))}</b><span>${x.count} ${esc(t('orders'))} · ${jd(x.revenue)}</span><i style="--w:${(x.count / bTotal) * 100}%"></i></div>`; }).join('')}
        <h3 style="margin-top:18px">${esc(t('topItems'))}</h3>
        ${stats.top.length ? stats.top.map((x) => `<div class="hbar"><span>${esc(x[`name_${S.lang}`] || x.name_ar)}</span><b>×${x.qty}</b><i style="--w:${(x.qty / topMax) * 100}%"></i></div>`).join('') : `<p class="empty">—</p>`}
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>${esc(t('recent'))}</h3>
      ${ordersCache.length ? `<table class="orders"><thead><tr><th>${esc(t('time'))}</th><th>${esc(t('order'))}</th><th>${esc(t('branch'))}</th><th>${esc(t('type'))}</th><th>${esc(t('customer'))}</th><th>${esc(t('total'))}</th></tr></thead><tbody>
        ${ordersCache.map((o, i) => `<tr data-i="${i}" tabindex="0"><td>${esc(fmtTime(o.created_at))}</td><td><b dir="ltr">${esc(o.id)}</b></td><td class="hide-sm">${esc(branchName(o.branch_id))}</td><td class="hide-sm"><span class="pill ${o.mode === 'delivery' ? 'pill--y' : ''}">${esc(t(o.mode))}</span></td><td>${esc(o.customer_name)} <small class="muted" dir="ltr">${esc(o.phone)}</small></td><td class="num">${jd(o.total)}</td></tr>`).join('')}
      </tbody></table>` : `<p class="empty">${esc(t('noOrders'))}</p>`}
    </div>`;
  $('#refresh').addEventListener('click', renderOverview);
  $$('.orders tbody tr').forEach((tr) => {
    const open = () => openOrder(ordersCache[Number(tr.dataset.i)]);
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  });
}

function openOrder(o) {
  $('#odTitle').textContent = `${t('orderDetails')} · ${o.id}`;
  const intl = String(o.phone).replace(/\D/g, '').replace(/^0/, '962');
  $('#odBody').innerHTML = `
    <p><b>${esc(o.customer_name)}</b> · <span dir="ltr">${esc(o.phone)}</span></p>
    <p class="muted">${esc(fmtTime(o.created_at))} · ${esc(branchName(o.branch_id))} · ${esc(t(o.mode))}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px">
      <a class="btn btn--y btn--sm" href="https://wa.me/${esc(intl)}" target="_blank" rel="noopener">${icon('wa')}${esc(t('chat'))}</a>
      <a class="btn btn--ghost btn--sm" href="tel:${esc(o.phone)}">${esc(t('call'))}</a>
    </div>
    <h3 class="sec">${esc(t('items'))}</h3>
    ${o.items.map((l) => `<div class="hbar" style="margin-bottom:12px"><span><b>${l.qty}×</b> ${esc(l[`name_${S.lang}`] || l.name_ar)} <small class="muted">${esc(l.size || '')}${l.combo ? ' · combo' : ''}${l.addons?.length ? ` · +${esc(l.addons.join(', '))}` : ''}${l.note ? ` · “${esc(l.note)}”` : ''}</small></span><b dir="ltr">${jd(l.unit * l.qty)}</b></div>`).join('')}
    <div class="hbar" style="border-top:1px dashed var(--line2);padding-top:10px"><b>${esc(t('total'))}</b><b dir="ltr">${jd(o.total)} ${esc(t('jd'))}</b></div>`;
  $('#orderDlg').showModal();
}

/* ─── menu ─── */
function renderMenu() {
  const v = $('#view-menu');
  const { categories, items, branches } = S.data;
  v.innerHTML = `
    <div class="vhead"><h2>${esc(t('menu'))}</h2><span class="sp"></span>
      <button class="btn btn--ghost btn--sm" type="button" id="manageCats">${esc(t('categories'))}</button>
      <button class="btn btn--y btn--sm" type="button" id="newItem">${icon('plus')}${esc(t('newItem'))}</button></div>
    <div class="toolbar">
      <input class="search" id="q" type="search" placeholder="${esc(t('searchItems'))}" value="${esc(S.q)}">
      <div class="chips" id="catChips"><button type="button" data-f="all" aria-pressed="${S.filter === 'all'}">${esc(t('all'))}</button>${categories.map((c) => `<button type="button" data-f="${esc(c.id)}" aria-pressed="${S.filter === c.id}">${esc(L(c, 'name'))}</button>`).join('')}</div>
    </div>
    <p class="legend">${esc(t('legend'))}</p>
    <div id="groups"></div>`;
  $('#newItem').addEventListener('click', () => openEditor(null));
  $('#manageCats').addEventListener('click', openCats);
  $('#q').addEventListener('input', (e) => { S.q = e.target.value; drawGroups(); });
  $('#catChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    S.filter = b.dataset.f;
    $$('#catChips [data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    drawGroups();
  });
  drawGroups();

  function drawGroups() {
    const q = S.q.trim().toLowerCase();
    const groups = $('#groups');
    groups.innerHTML = categories.filter((c) => S.filter === 'all' || S.filter === c.id).map((c) => {
      const list = items.filter((i) => i.category_id === c.id && (!q || `${i.name_ar} ${i.name_en} ${i.id}`.toLowerCase().includes(q)));
      if (!list.length) return '';
      return `<div class="group"><h3>${esc(L(c, 'name'))} <span class="pill">${list.length}</span>${c.active ? '' : `<span class="pill pill--r">${esc(t('hiddenBadge'))}</span>`}</h3>
        ${list.map((i) => `<div class="row${i.active ? '' : ' is-hidden'}" data-id="${esc(i.id)}">
          <div class="row__img">${i.image ? `<img src="${esc(i.image)}" alt="" loading="lazy">` : icon('img')}</div>
          <div class="row__name"><b>${esc(L(i, 'name'))} ${i.active ? '' : `<span class="pill pill--r">${esc(t('hiddenBadge'))}</span>`}</b><small>${esc(S.lang === 'ar' ? i.name_en : i.name_ar)}</small>
            <span class="row__prices">${i.sizes.map((s) => `${esc(s.en)} ${jd(s.price)}`).join(' · ')}</span></div>
          <div class="row__ctl">
            <button class="star" type="button" data-act="featured" aria-pressed="${Boolean(i.featured)}" title="${esc(t('featured'))}" aria-label="${esc(t('featured'))}">${icon('star')}</button>
            <label class="sw"><input type="checkbox" data-act="available" ${i.sold_out ? '' : 'checked'}><i></i>${esc(t('available'))}</label>
            ${branches.map((b) => `<label class="sw"><input type="checkbox" data-act="branch" data-branch="${esc(b.id)}" ${i.unavailable.includes(b.id) ? '' : 'checked'} ${i.sold_out ? 'disabled' : ''}><i></i>${esc(L(b, 'name'))}</label>`).join('')}
            <button class="btn btn--ghost btn--sm" type="button" data-act="edit">${icon('edit')}${esc(t('edit'))}</button>
          </div>
        </div>`).join('')}</div>`;
    }).join('') || `<p class="empty">—</p>`;
  }

  $('#groups').onclick = async (e) => {
    const row = e.target.closest('.row');
    if (!row) return;
    const item = items.find((i) => i.id === row.dataset.id);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'edit') openEditor(item);
    if (act === 'featured') {
      const btn = e.target.closest('.star');
      const next = !item.featured;
      btn.setAttribute('aria-pressed', String(next));
      try { await api(`/items/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: { featured: next } }); item.featured = next ? 1 : 0; toast(t('saved')); }
      catch (err) { btn.setAttribute('aria-pressed', String(!next)); toast(err.message, true); }
    }
  };
  $('#groups').onchange = async (e) => {
    const input = e.target;
    const row = input.closest('.row');
    const item = items.find((i) => i.id === row.dataset.id);
    try {
      if (input.dataset.act === 'available') {
        await api(`/items/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: { sold_out: !input.checked } });
        item.sold_out = input.checked ? 0 : 1;
        $$('[data-act="branch"]', row).forEach((x) => { x.disabled = Boolean(item.sold_out); });
      } else if (input.dataset.act === 'branch') {
        const bid = input.dataset.branch;
        await api(`/items/${encodeURIComponent(item.id)}/availability`, { method: 'PUT', body: { branch_id: bid, sold_out: !input.checked } });
        item.unavailable = input.checked ? item.unavailable.filter((x) => x !== bid) : [...new Set([...item.unavailable, bid])];
      }
      toast(t('saved'));
    } catch (err) {
      input.checked = !input.checked;
      toast(err.message, true);
    }
  };
}

/* ─── item editor ─── */
const editor = $('#editor');
let editing = null;
const PRESETS = {
  beef: [[100, 4000], [150, 4500], [200, 5250], [300, 6750]].map(([g, p]) => ({ id: `${g}g`, ar: `${g} غ`, en: `${g}g`, price: p })),
  chicken: [['mini', 'ميني', 'Mini', 3500], ['single', 'سنجل', 'Single', 4000], ['double', 'دبل', 'Double', 6000]].map(([id, ar, en, price]) => ({ id, ar, en, price })),
  sauce: [['small', 'صغير', 'Small', 250], ['large', 'كبير', 'Large', 500]].map(([id, ar, en, price]) => ({ id, ar, en, price })),
  one: [{ id: 'one', ar: 'عادي', en: 'Regular', price: 1000 }],
};
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function openEditor(item) {
  const isNew = !item;
  editing = isNew
    ? { id: '', category_id: S.filter !== 'all' ? S.filter : S.data.categories[0]?.id, name_ar: '', name_en: '', desc_ar: '', desc_en: '', note_ar: '', note_en: '', image: '', sizes: structuredClone(PRESETS.one), tags: [], featured: 0, sold_out: 0, is_addon: 0, active: 1, sort: 0, isNew: true }
    : { ...structuredClone(item), isNew: false };
  $('#edTitle').textContent = isNew ? t('newItemTitle') : `${t('editItem')} · ${L(item, 'name')}`;
  $('#edDelete').hidden = isNew;
  const imgs = [...new Set(S.data.items.map((i) => i.image).filter(Boolean))];
  $('#edBody').innerHTML = `
    <h3 class="sec">${esc(t('photo'))}</h3>
    <div class="photo">
      <div class="photo__prev" id="edPrev">${editing.image ? `<img src="${esc(editing.image)}" alt="">` : icon('img')}</div>
      <div class="photo__btns">
        <label class="btn btn--y btn--sm filebtn">${icon('img')}<span id="upLabel">${esc(t('upload'))}</span><input type="file" id="edFile" accept="image/*"></label>
        <button class="btn btn--ghost btn--sm" type="button" id="edNoImg">${esc(t('removePhoto'))}</button>
      </div>
    </div>
    <small class="muted">${esc(t('pickPhoto'))}</small>
    <div class="gallery" id="edGallery">${imgs.map((src) => `<button type="button" data-src="${esc(src)}" aria-pressed="${src === editing.image}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>

    <h3 class="sec">${esc(t('nameEn'))} / ${esc(t('nameAr'))}</h3>
    <div class="cols">
      <label class="fld"><span>${esc(t('nameAr'))}</span><input type="text" name="name_ar" dir="rtl" maxlength="80" required value="${esc(editing.name_ar)}"></label>
      <label class="fld"><span>${esc(t('nameEn'))}</span><input type="text" name="name_en" dir="ltr" maxlength="80" required value="${esc(editing.name_en)}"></label>
      <label class="fld"><span>${esc(t('descAr'))}</span><textarea name="desc_ar" dir="rtl" maxlength="400">${esc(editing.desc_ar)}</textarea></label>
      <label class="fld"><span>${esc(t('descEn'))}</span><textarea name="desc_en" dir="ltr" maxlength="400">${esc(editing.desc_en)}</textarea></label>
      <label class="fld"><span>${esc(t('noteAr'))}</span><input type="text" name="note_ar" dir="rtl" maxlength="60" value="${esc(editing.note_ar)}"><small>${esc(t('noteHint'))}</small></label>
      <label class="fld"><span>${esc(t('noteEn'))}</span><input type="text" name="note_en" dir="ltr" maxlength="60" value="${esc(editing.note_en)}"></label>
      <label class="fld"><span>${esc(t('category'))}</span><select name="category_id">${S.data.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === editing.category_id ? 'selected' : ''}>${esc(L(c, 'name'))}</option>`).join('')}</select></label>
      ${isNew ? `<label class="fld"><span>${esc(t('id'))}</span><input type="text" name="id" dir="ltr" maxlength="48" pattern="[a-z0-9][a-z0-9-]*" value=""><small>${esc(t('idHint'))}</small></label>` : `<label class="fld"><span>${esc(t('sort'))}</span><input type="number" name="sort" min="0" step="1" value="${esc(editing.sort)}"></label>`}
    </div>

    <h3 class="sec">${esc(t('sizes'))}</h3>
    <div class="sizes" id="edSizes"></div>
    <div class="presets">
      <button class="btn btn--ghost btn--sm" type="button" id="addSize">${icon('plus')}${esc(t('addSize'))}</button>
      ${['beef', 'chicken', 'sauce', 'one'].map((p) => `<button class="btn btn--ghost btn--sm" type="button" data-preset="${p}">${esc(t(`preset${p[0].toUpperCase()}${p.slice(1)}`))}</button>`).join('')}
    </div>

    <h3 class="sec">${esc(t('tags'))}</h3>
    <div class="checks">${['spicy', 'grilled', 'signature', 'new'].map((tg) => `<label class="sw sw--plain"><input type="checkbox" name="tag" value="${tg}" ${editing.tags.includes(tg) ? 'checked' : ''}><i></i>${esc(t(`tag_${tg}`))}</label>`).join('')}</div>

    <h3 class="sec">${esc(t('flags'))}</h3>
    <div class="checks">
      <label class="sw sw--plain"><input type="checkbox" name="active" ${editing.active ? 'checked' : ''}><i></i>${esc(t('active'))}</label>
      <label class="sw sw--plain"><input type="checkbox" name="featured" ${editing.featured ? 'checked' : ''}><i></i>${esc(t('featured'))}</label>
      <label class="sw sw--plain"><input type="checkbox" name="sold_out" ${editing.sold_out ? 'checked' : ''}><i></i>${esc(t('soldOutAll'))}</label>
      <label class="sw sw--plain"><input type="checkbox" name="is_addon" ${editing.is_addon ? 'checked' : ''}><i></i>${esc(t('isAddon'))}</label>
    </div>`;
  drawSizes();

  const form = $('#edForm');
  if (isNew) {
    const idIn = form.elements.id;
    form.elements.name_en.addEventListener('input', (e) => { if (!idIn.dataset.touched) idIn.value = slugify(e.target.value); });
    idIn.addEventListener('input', () => { idIn.dataset.touched = '1'; });
  }
  $('#edGallery').onclick = (e) => {
    const b = e.target.closest('[data-src]');
    if (!b) return;
    setImage(b.dataset.src);
  };
  $('#edNoImg').onclick = () => setImage('');
  $('#edFile').onchange = (e) => uploadPhoto(e.target.files[0]);
  $('#addSize').onclick = () => { readSizes(); editing.sizes.push({ id: '', ar: '', en: '', price: 0 }); drawSizes(); };
  $$('[data-preset]', $('#edBody')).forEach((b) => { b.onclick = () => { editing.sizes = structuredClone(PRESETS[b.dataset.preset]); drawSizes(); }; });
  editor.showModal();
  $('#edBody').scrollTop = 0;
}

function setImage(src) {
  editing.image = src;
  $('#edPrev').innerHTML = src ? `<img src="${esc(src)}" alt="">` : icon('img');
  $$('#edGallery [data-src]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.src === src)));
}

function drawSizes() {
  $('#edSizes').innerHTML = editing.sizes.map((s, i) => `<div class="size" data-i="${i}">
    <input type="text" data-k="ar" dir="rtl" placeholder="${esc(t('sizeAr'))}" aria-label="${esc(t('sizeAr'))}" value="${esc(s.ar)}" maxlength="40">
    <input type="text" data-k="en" dir="ltr" placeholder="${esc(t('sizeEn'))}" aria-label="${esc(t('sizeEn'))}" value="${esc(s.en)}" maxlength="40">
    <span class="price"><input type="number" data-k="price" min="0" step="0.05" inputmode="decimal" aria-label="${esc(t('price'))}" value="${jd(s.price)}"></span>
    <span class="ctl">
      <button class="iconbtn" type="button" data-mv="-1" aria-label="up" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
      <button class="iconbtn" type="button" data-mv="1" aria-label="down" ${i === editing.sizes.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
      <button class="iconbtn" type="button" data-rm aria-label="${esc(t('delete'))}">${icon('trash')}</button>
    </span></div>`).join('');
  $('#edSizes').onclick = (e) => {
    const row = e.target.closest('.size');
    if (!row) return;
    const i = Number(row.dataset.i);
    readSizes();
    if (e.target.closest('[data-rm]')) {
      if (editing.sizes.length <= 1) { toast(t('needSize'), true); return; }
      editing.sizes.splice(i, 1);
    } else if (e.target.closest('[data-mv]')) {
      const j = i + Number(e.target.closest('[data-mv]').dataset.mv);
      if (j < 0 || j >= editing.sizes.length) return;
      [editing.sizes[i], editing.sizes[j]] = [editing.sizes[j], editing.sizes[i]];
    } else return;
    drawSizes();
  };
}

function readSizes() {
  editing.sizes = $$('#edSizes .size').map((row, i) => {
    const prev = editing.sizes[i] || {};
    const en = row.querySelector('[data-k="en"]').value.trim();
    return {
      id: prev.id || slugify(en) || `s${i + 1}`,
      ar: row.querySelector('[data-k="ar"]').value.trim(),
      en,
      price: toFils(row.querySelector('[data-k="price"]').value || 0),
    };
  });
}

// Resize in the browser so uploads stay small and fast (D1 stores the bytes).
async function uploadPhoto(file) {
  if (!file) return;
  const label = $('#upLabel');
  label.textContent = t('uploading');
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.84));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const res = await api('/images', { method: 'POST', raw: true, type: blob.type, body: blob });
    setImage(res.url);
    toast(t('saved'));
  } catch (err) {
    toast(err.message || t('error'), true);
  } finally {
    label.textContent = t('upload');
    $('#edFile').value = '';
  }
}

$('#edForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target.elements;
  readSizes();
  if (!editing.sizes.length) { toast(t('needSize'), true); return; }
  const body = {
    id: editing.isNew ? f.id.value.trim() : editing.id,
    category_id: f.category_id.value,
    name_ar: f.name_ar.value, name_en: f.name_en.value,
    desc_ar: f.desc_ar.value, desc_en: f.desc_en.value,
    note_ar: f.note_ar.value, note_en: f.note_en.value,
    image: editing.image,
    sizes: editing.sizes,
    tags: $$('input[name="tag"]:checked', e.target).map((i) => i.value),
    featured: f.featured.checked, sold_out: f.sold_out.checked, is_addon: f.is_addon.checked, active: f.active.checked,
    sort: editing.isNew ? 0 : Number(f.sort.value || 0),
  };
  const btn = $('#edSave');
  btn.disabled = true;
  try {
    const res = editing.isNew
      ? await api('/items', { method: 'POST', body })
      : await api(`/items/${encodeURIComponent(editing.id)}`, { method: 'PUT', body });
    const saved = { ...res.item, unavailable: editing.unavailable || [] };
    const idx = S.data.items.findIndex((i) => i.id === saved.id);
    if (idx >= 0) S.data.items[idx] = saved; else S.data.items.push(saved);
    S.data.items.sort((a, b) => a.sort - b.sort);
    editor.close();
    toast(t('saved'));
    renderMenu();
  } catch (err) { toast(err.message, true); }
  finally { btn.disabled = false; }
});

$('#edDelete').addEventListener('click', async () => {
  if (!editing || editing.isNew || !confirm(t('confirmDelete'))) return;
  try {
    await api(`/items/${encodeURIComponent(editing.id)}`, { method: 'DELETE' });
    S.data.items = S.data.items.filter((i) => i.id !== editing.id);
    editor.close();
    toast(t('deleted'));
    renderMenu();
  } catch (err) { toast(err.message, true); }
});

$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }));

/* ─── categories ─── */
function openCats() {
  const body = $('#catsBody');
  const row = (c, isNew) => `<form class="catrow" data-id="${esc(c.id)}" ${isNew ? 'data-new="1"' : ''}>
    <div class="cols">
      <label class="fld"><span>${esc(t('catName'))} (AR)</span><input type="text" name="name_ar" dir="rtl" required maxlength="60" value="${esc(c.name_ar)}"></label>
      <label class="fld"><span>${esc(t('catName'))} (EN)</span><input type="text" name="name_en" dir="ltr" required maxlength="60" value="${esc(c.name_en)}"></label>
      <label class="fld"><span>${esc(t('tagline'))} (AR)</span><input type="text" name="tagline_ar" dir="rtl" maxlength="120" value="${esc(c.tagline_ar)}"></label>
      <label class="fld"><span>${esc(t('tagline'))} (EN)</span><input type="text" name="tagline_en" dir="ltr" maxlength="120" value="${esc(c.tagline_en)}"></label>
      ${isNew ? `<label class="fld"><span>${esc(t('id'))}</span><input type="text" name="id" dir="ltr" required maxlength="48" pattern="[a-z0-9][a-z0-9-]*"></label>` : ''}
      <label class="fld"><span>${esc(t('sort'))}</span><input type="number" name="sort" min="0" step="1" value="${esc(c.sort)}"></label>
    </div>
    <div class="checks">
      <label class="sw sw--plain"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}><i></i>${esc(t('active'))}</label>
      <label class="sw sw--plain"><input type="checkbox" name="allows_combo" ${c.allows_combo ? 'checked' : ''}><i></i>${esc(t('allowsCombo'))}</label>
      <label class="sw sw--plain"><input type="checkbox" name="allows_addons" ${c.allows_addons ? 'checked' : ''}><i></i>${esc(t('allowsAddons'))}</label>
    </div>
    <div class="actions">${isNew ? '' : `<button class="btn btn--danger btn--sm" type="button" data-del>${icon('trash')}</button>`}<button class="btn btn--y btn--sm" type="submit">${esc(t('save'))}</button></div>
  </form>`;
  const draw = () => {
    body.innerHTML = S.data.categories.map((c) => row(c, false)).join('') +
      `<button class="btn btn--ghost" type="button" id="addCat">${icon('plus')}${esc(t('addCategory'))}</button>`;
    $('#addCat').onclick = () => {
      $('#addCat').insertAdjacentHTML('beforebegin', row({ id: '', name_ar: '', name_en: '', tagline_ar: '', tagline_en: '', sort: (S.data.categories.length + 1) * 10, active: 1, allows_combo: 0, allows_addons: 0 }, true));
    };
  };
  body.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const isNew = f.dataset.new === '1';
    const payload = {
      id: isNew ? f.elements.id.value.trim() : f.dataset.id,
      name_ar: f.elements.name_ar.value, name_en: f.elements.name_en.value,
      tagline_ar: f.elements.tagline_ar.value, tagline_en: f.elements.tagline_en.value,
      sort: Number(f.elements.sort.value || 0),
      active: f.elements.active.checked, allows_combo: f.elements.allows_combo.checked, allows_addons: f.elements.allows_addons.checked,
    };
    try {
      await api(isNew ? '/categories' : `/categories/${encodeURIComponent(payload.id)}`, { method: isNew ? 'POST' : 'PUT', body: payload });
      await loadData();
      toast(t('saved'));
      draw();
      renderMenu();
    } catch (err) { toast(err.message, true); }
  };
  body.onclick = async (e) => {
    if (!e.target.closest('[data-del]')) return;
    const f = e.target.closest('form');
    if (!confirm(t('confirmDeleteCat'))) return;
    try {
      await api(`/categories/${encodeURIComponent(f.dataset.id)}`, { method: 'DELETE' });
      await loadData();
      toast(t('deleted'));
      draw();
      renderMenu();
    } catch (err) { toast(err.message, true); }
  };
  draw();
  $('#catsDlg').showModal();
}

/* ─── branches ─── */
function renderBranches() {
  const v = $('#view-branches');
  v.innerHTML = `<div class="vhead"><h2>${esc(t('branches'))}</h2></div>` + S.data.branches.map((b) => `
    <form class="card branchcard" data-id="${esc(b.id)}">
      <h3>${esc(L(b, 'name'))}</h3>
      <div class="cols">
        <label class="fld"><span>${esc(t('branchLbl'))} (AR)</span><input type="text" name="name_ar" dir="rtl" required value="${esc(b.name_ar)}"></label>
        <label class="fld"><span>${esc(t('branchLbl'))} (EN)</span><input type="text" name="name_en" dir="ltr" required value="${esc(b.name_en)}"></label>
        <label class="fld"><span>${esc(t('address'))} (AR)</span><input type="text" name="address_ar" dir="rtl" value="${esc(b.address_ar)}"></label>
        <label class="fld"><span>${esc(t('address'))} (EN)</span><input type="text" name="address_en" dir="ltr" value="${esc(b.address_en)}"></label>
        <label class="fld"><span>${esc(t('whatsapp'))}</span><input type="tel" name="whatsapp" dir="ltr" required value="${esc(b.whatsapp)}"><small>${esc(t('waHint'))}</small></label>
        <label class="fld"><span>${esc(t('phone'))}</span><input type="tel" name="phone" dir="ltr" value="${esc(b.phone)}"></label>
        <label class="fld" style="grid-column:1/-1"><span>${esc(t('maps'))}</span><input type="url" name="maps_url" dir="ltr" value="${esc(b.maps_url)}"></label>
      </div>
      <div class="cols cols--3">
        <label class="fld"><span>${esc(t('opens'))}</span><input type="time" name="open_time" required value="${esc(b.open_time)}"></label>
        <label class="fld"><span>${esc(t('closes'))}</span><input type="time" name="close_time" required value="${esc(b.close_time)}"></label>
        <label class="fld"><span>${esc(t('rating'))}</span><input type="number" name="rating" min="0" max="5" step="0.1" value="${esc(b.rating)}"></label>
        <label class="fld"><span>${esc(t('reviews'))}</span><input type="number" name="reviews" min="0" step="1" value="${esc(b.reviews)}"></label>
      </div>
      <div class="checks">
        <label class="sw sw--plain"><input type="checkbox" name="accepting" ${b.accepting ? 'checked' : ''}><i></i>${esc(t('accepting'))}</label>
        <label class="sw sw--plain"><input type="checkbox" name="delivery" ${b.delivery ? 'checked' : ''}><i></i>${esc(t('hasDelivery'))}</label>
      </div>
      <div class="savebar"><button class="btn btn--y" type="submit">${esc(t('save'))}</button></div>
    </form>`).join('');
  v.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const el = f.elements;
    const body = {
      name_ar: el.name_ar.value, name_en: el.name_en.value, address_ar: el.address_ar.value, address_en: el.address_en.value,
      whatsapp: el.whatsapp.value, phone: el.phone.value, maps_url: el.maps_url.value,
      open_time: el.open_time.value, close_time: el.close_time.value, rating: el.rating.value, reviews: el.reviews.value || 0,
      accepting: el.accepting.checked, delivery: el.delivery.checked,
    };
    try {
      const res = await api(`/branches/${encodeURIComponent(f.dataset.id)}`, { method: 'PUT', body });
      const i = S.data.branches.findIndex((b) => b.id === f.dataset.id);
      S.data.branches[i] = { ...S.data.branches[i], ...res.branch };
      toast(t('saved'));
    } catch (err) { toast(err.message, true); }
  };
}

/* ─── settings ─── */
function renderSettings() {
  const st = S.data.settings;
  const v = $('#view-settings');
  v.innerHTML = `<div class="vhead"><h2>${esc(t('settings'))}</h2></div>
    <form class="card" id="setForm">
      <h3 class="sec">${esc(t('general'))}</h3>
      <div class="checks" style="margin-bottom:14px"><label class="sw sw--plain"><input type="checkbox" name="orders_enabled" ${st.orders_enabled !== '0' ? 'checked' : ''}><i></i>${esc(t('ordersEnabled'))}</label></div>
      <div class="cols cols--3">
        <label class="fld"><span>${esc(t('comboPrice'))}</span><span class="price"><input type="number" name="combo_price" min="0" step="0.05" value="${jd(st.combo_price)}"></span></label>
        <label class="fld"><span>${esc(t('heroRating'))}</span><input type="text" name="google_rating" dir="ltr" maxlength="3" value="${esc(st.google_rating)}"></label>
        <label class="fld"><span>${esc(t('heroReviews'))}</span><input type="number" name="google_reviews" min="0" step="1" value="${esc(st.google_reviews)}"></label>
      </div>
      <div class="cols">
        <label class="fld"><span>${esc(t('deliveryNoteAr'))}</span><input type="text" name="delivery_note_ar" dir="rtl" maxlength="300" value="${esc(st.delivery_note_ar)}"></label>
        <label class="fld"><span>${esc(t('deliveryNoteEn'))}</span><input type="text" name="delivery_note_en" dir="ltr" maxlength="300" value="${esc(st.delivery_note_en)}"></label>
        <label class="fld"><span>${esc(t('announceAr'))}</span><input type="text" name="announcement_ar" dir="rtl" maxlength="300" value="${esc(st.announcement_ar)}"><small>${esc(t('announceHint'))}</small></label>
        <label class="fld"><span>${esc(t('announceEn'))}</span><input type="text" name="announcement_en" dir="ltr" maxlength="300" value="${esc(st.announcement_en)}"></label>
      </div>
      <h3 class="sec">${esc(t('social'))}</h3>
      <div class="cols">
        ${['instagram', 'tiktok', 'facebook', 'talabat'].map((k) => `<label class="fld"><span>${k[0].toUpperCase() + k.slice(1)}</span><input type="url" name="${k}" dir="ltr" placeholder="https://" value="${esc(st[k])}"></label>`).join('')}
      </div>
      <div class="savebar"><button class="btn btn--y" type="submit">${esc(t('save'))}</button></div>
    </form>`;
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    const el = e.target.elements;
    const body = {
      orders_enabled: el.orders_enabled.checked,
      combo_price: toFils(el.combo_price.value || 0),
      google_rating: el.google_rating.value.trim(),
      google_reviews: Number(el.google_reviews.value || 0),
      delivery_note_ar: el.delivery_note_ar.value, delivery_note_en: el.delivery_note_en.value,
      announcement_ar: el.announcement_ar.value, announcement_en: el.announcement_en.value,
      instagram: el.instagram.value.trim(), tiktok: el.tiktok.value.trim(), facebook: el.facebook.value.trim(), talabat: el.talabat.value.trim(),
    };
    try {
      await api('/settings', { method: 'PUT', body });
      Object.assign(S.data.settings, Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)])));
      toast(t('saved'));
    } catch (err) { toast(err.message, true); }
  };
}

boot();
