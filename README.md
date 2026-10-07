# Meat & Cheezz — لحمة وجبنة

A fast, animated, Arabic-first ordering website for **Meat & Cheezz** (Amman: Abdoun & Mecca St.).
It replaces the link-in-bio page and the 5–7 page PDF menu. Customers browse the menu, build their order, and send it to the selected branch on **WhatsApp** as a neatly formatted message. The owner manages everything from a password-protected **dashboard** at `/admin`.

**Stack:** Cloudflare Workers + D1 + Workers Static Assets. No frameworks, no build step, no runtime dependencies. Vanilla JS/CSS, self-hosted fonts.

---

## 1. The plan

| Step | What | Where |
|---|---|---|
| 1 | **Data model**: categories, items with per-size prices (stored in fils, 1 JD = 1000), tags, per-branch sold-out, branches, settings, uploaded photos, order log | `migrations/0001_schema.sql` |
| 2 | **Menu**: transcribed from the current 7-page PDF (Angus, Chicken, Appetizers, Sauces, Extras, Drinks, plus combo +1.50 and "Make it Super Cheeezzy" +1.00) into one source file that generates the seed SQL and a static fallback JSON | `data/menu.mjs` → `npm run seed:build` |
| 3 | **API** (Worker): public menu, order logging with server-side re-pricing, admin CRUD, photo upload, stats | `src/` |
| 4 | **Customer site**: Arabic RTL first, one-tap English, animated, mobile-first, WhatsApp checkout | `public/index.html`, `public/css`, `public/js` |
| 5 | **Dashboard**: login, overview and stats, menu editor, sold-out per item and per branch, featured, photos, branches, settings | `public/admin/` |
| 6 | **Deploy** with Wrangler to `workers.dev` | see §5 |

---

## 2. Customer site — what's in it

**Brand & motion**
- **Intro**: the burger builds itself layer by layer (bun → patty → cheese drips → lettuce → bun), the logo slams in, and a yellow wipe reveals the page. It plays once per session and is skipped for reduced-motion users and on repeat visits.
- **Opening scroll story (pinned, scroll-scrubbed), starring the Smash Burger**. The photo is AI-upscaled ×4 from the PDF and cut into 5 real layers:
  1. **Hero**: the floating burger with 3D tilt, a rotating "★ 4.9 GOOGLE" ring, ember particles and the cheese drip under «وجبنة».
  2. **Zoom**: on scroll, the copy slides away, the burger glides to centre and a yellow halftone burst explodes from it.
  3. **The stack**: the burger splits into brioche · beef bacon + secret sauce · smash patty #1 + cheddar · smash patty #2 + caramelized onions · base. Each layer gets a label, and a giant "THE STACK" drifts behind.
  4. **SMASH!**: the layers slam back together. Screen shake, a shockwave, grease sparks, a haptic buzz on phones.
  5. **Combo**: a branded box rises, the burger drops in, then the fries, the drink cup and the cheese dip land with a bounce.
  6. **Lid**: the lid swings shut in 3D onto the logo, with a light sweep. "Order the Smash combo" opens the item sheet with the combo already ticked.
  - A chapter nav on desktop lets you jump between scenes. Reduced-motion users get the static hero.
- **The DJ picks for you**: for customers who can't decide. Pick a mood (anything / beef / chicken / spicy), spin the turntable, and names shuffle like a slot machine before landing on a burger with confetti.
- **Branches radar**: an animated radar with both branch pins, plus cards with live open/closed status, Google rating, hours, directions, WhatsApp and call buttons.
- **Reviews**: real snippets from the Google Maps listing in a marquee.
- **"Hungry?" finale**: giant outlined text that fills with yellow as you scroll.

**Ordering**
- **Menu**: a sticky category bar with a sliding indicator, scroll-spy and smooth scrolling. Search understands Arabic spelling variants (أ/ا, ة/ه…); press `/` on desktop to jump to it.
- **Item sheet** (bottom sheet on mobile, drag down to dismiss):
  - The photo flies from the card into the sheet.
  - Weight picker (100/150/200/300 g, or 120…320 g for the heavy burgers) with a **patty that grows** as you pick a bigger size.
  - Rolling odometer price.
  - **Make it a combo** (+1.50).
  - **«شيّززها!»** (+1.00): cheese visibly pours down over the photo.
  - Add-ons (cheddar, beef bacon, mushrooms, extra Angus patty), kitchen note, quantity.
- **Add to cart**: the burger flies along an arc into the cart, the bag "gulps", there's a +1 pop and a short haptic buzz on phones.
- **Cart drawer**:
  - Slides in from the side, with quantity steppers.
  - "Goes great with" upsell row of fries, rings and dips.
  - **Reorder last time** on the empty state.
- **Checkout**:
  - Pickup or delivery (sliding toggle) and branch picker with live open/closed status.
  - Name, Jordanian phone validation (Arabic-Indic digits accepted), address with **"Share my location"** (adds a Google Maps pin to the message).
  - ASAP or a scheduled time: 15-minute slots inside the branch's opening hours, in Amman time.
  - Notes field.
- **Preview**: a thermal-receipt "prints" out. **Send on WhatsApp** opens `wa.me/<branch number>` with this message:

```
🍔 *طلب جديد — Meat & Cheezz*
رقم الطلب: *MC-B7BLW*
الفرع: عبدون
النوع: توصيل 🛵
━━━━━━━━━━━━━━
*2× سماش برغر (Smash Burger)* — 200 غ
   ▫️ حوّلها كومبو (بطاطا + مشروب)
   ▫️ إضافات: شيّززها!، بيكن بقري
   ▫️ ملاحظة: بدون بصل
   = 16.70 د.أ
━━━━━━━━━━━━━━
*المجموع: 18.20 د.أ*
👤 الاسم: محمد
📞 رقم الهاتف: 0791234567
📍 العنوان: عبدون، شارع القاهرة…
🗺️ الموقع: https://maps.google.com/?q=…
⏰ الوقت: 9:30 م
```

Every order is also logged (fire-and-forget) so the dashboard can show stats. The server **re-prices** each order from the database and never trusts prices sent by the browser.

**Other details**
- Sold-out items show a red "SOLD OUT" tape, globally or only at the selected branch.
- The language switch uses a smooth View Transition.
- Works offline-ish: the last menu is cached and the site falls back to `/data/menu.json` if the API is unreachable.
- Installable (web manifest and icons), with an Open Graph share image, `Restaurant` JSON-LD, and a custom 404.
- Accessible: native `<dialog>`s, focus styles, ARIA, and `prefers-reduced-motion` respected everywhere.

### Lighthouse (mobile, local dev server, no compression)

| Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|
| **95** | **100** | **100** | **100** |

LCP 2.6 s · TBT 10–70 ms · CLS 0.02 · Speed Index 3.2 s. Production adds Cloudflare's brotli and edge caching.

How it stays fast:
- Responsive WebP images: the hero ships in 420/640/900 px variants, everything else is lazy-loaded.
- Self-hosted subsetted fonts with preloads.
- Infinite animations pause while off-screen.
- `content-visibility` on below-the-fold sections.
- The menu renders in idle time.
- CSS/JS are content-hashed and cached for a year (`npm run stamp`).

---

## 3. Dashboard (`/admin`)

- **Login**: one password, stored as a Worker secret, never in code.
  - Sessions are an HMAC-signed `HttpOnly; Secure; SameSite=Strict` cookie, valid for 7 days.
  - Login is rate-limited: 8 failed attempts per 15 minutes per IP.
- **Overview**: orders and sales today, last 7 days, average order, a 14-day chart, split by branch, top items, and recent orders. Click an order for details plus a button to open a WhatsApp chat with that customer.
- **Menu**:
  - Search and filter by category.
  - Per item: ⭐ featured (shown in the Headliners), **Available everywhere** switch, and a **switch per branch** (Abdoun / Mecca St.). Switches save instantly.
  - **Item editor**:
    - Photo upload (resized to WebP in the browser, max 900 px) or pick an existing photo.
    - Arabic and English names, ingredients and short notes.
    - Sizes table (labels and prices) with presets: 100/150/200/300 g, Mini/Single/Double, Small/Large.
    - Tags (spicy, grilled, fan favourite, new) and visibility.
    - Burger add-on flag.
    - Create and delete items.
- **Categories**: rename, reorder, hide, and choose whether combo and add-ons apply.
- **Branches**: names, addresses, **WhatsApp number per branch** (orders go here), phone, Google Maps link, opening hours, rating, delivery on/off, and "accepting online orders" on/off.
- **Settings**:
  - Combo price and the rating shown on the homepage.
  - Delivery-fee note, Arabic and English.
  - **Announcement bar**, e.g. «عرض الويكند…».
  - Social links.
  - A master "online ordering on/off".
- Bilingual (Arabic/English) and fully usable on a phone.

---

## 4. Project structure

```
data/menu.mjs              ← the menu (single source of truth for the seed)
migrations/                ← D1 schema + generated seed
scripts/build-seed.mjs     ← data/menu.mjs → migrations/0002_seed.sql + public/data/menu.json
scripts/stamp.mjs          ← content-hash ?v= for CSS/JS (runs before dev/deploy)
src/index.js               ← Worker: router, menu, orders, admin API, images
src/auth.js, src/http.js   ← sessions, rate limiting, validation helpers
public/                    ← static site (index.html, css/, js/, img/, fonts/, admin/, _headers)
wrangler.jsonc             ← Worker + D1 + assets config
```

---

## 5. Deploy (Cloudflare Workers + D1)

You need Node 18+ and a free Cloudflare account.

```bash
# 1) install wrangler (dev dependency)
npm install

# 2) log in to Cloudflare (opens the browser)
npx wrangler login

# 3) create the database and copy the printed "database_id"
npx wrangler d1 create meat-and-cheezz
#    → paste it into wrangler.jsonc  →  d1_databases[0].database_id

# 4) create the tables and load the menu, branches and settings
npm run db:remote          # = wrangler d1 migrations apply DB --remote

# 5) set the dashboard password (and an extra random secret for sessions)
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET     # any long random string

# 6) deploy
npm run deploy             # stamps assets, then wrangler deploy
```

Wrangler prints the URL, e.g. `https://meat-and-cheezz.<your-subdomain>.workers.dev`.
Open `/admin`, sign in, and set each branch's **WhatsApp number** under **Branches** (both default to +962 7 8860 0111).

**Custom domain (optional):** Cloudflare dashboard → Workers & Pages → `meat-and-cheezz` → Settings → Domains & Routes → add e.g. `order.meatandcheezz.com`.

**Run locally**

```bash
cp .dev.vars.example .dev.vars        # sets ADMIN_PASSWORD=change-me for local only
npm run db:local                      # local D1 with the seed
npm run dev                           # http://localhost:8787  and  /admin
```

**Changing the seed menu later.** Edit `data/menu.mjs`, then run `npm run seed:build`.
- On a fresh database, `npm run db:remote` loads it.
- On a live database, use the dashboard instead. Re-running the seed file overwrites items with the same id, which would undo edits made in the dashboard.

**Change the admin password:** run `npx wrangler secret put ADMIN_PASSWORD` again. This also signs everyone out.

---

## 6. Before handing over — confirm with the owner

- **WhatsApp per branch**: only +962 7 8860 0111 was provided, so both branches use it. The older Mecca St. menu shows 077 88 66 44 7.
- **Map pins**: the branch links are Google Maps searches. Paste the exact place links in the dashboard.
- **Photos**: cut out of the official PDF menu, AI-upscaled ×4 (Real-ESRGAN), with backgrounds removed. The original high-resolution shoots will look even sharper, and can be uploaded per item from the dashboard.
- **Prices**: taken from the current 7-page "Meat & Cheezz" PDF. The older 5-page Mecca St. menu has different prices and a "Wedges" item; those were not used.
- **Combo contents**: fries + soft drink + dip (as pictured on the menu). Delivery fees are not on the menu, so the checkout says "depends on your area — confirmed on WhatsApp". The text is editable in Settings.
- **Social links**: the heylink page is behind a bot check. Add Instagram, TikTok, Facebook and Talabat in Settings; icons appear in the footer automatically.
- **Google ratings** (Abdoun 4.9 · 7,430 reviews, Mecca St. 4.8 · 5,883) and opening hours (12:00 PM–2:00 AM daily) come from Google Maps on 7 Oct 2026 and are editable.
