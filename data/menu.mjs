// Single source of truth for the seed menu.
// Transcribed from the current Meat & Cheezz PDF menu (7 pages).
// Prices are stored in fils (1 JD = 1000 fils) to avoid floating point errors.
//
// `npm run seed:build` turns this file into:
//   - migrations/0002_seed.sql   (initial D1 data)
//   - public/data/menu.json      (static fallback the site uses if the API is unreachable)

const jd = (v) => Math.round(v * 1000);

const grams = (list, prices) =>
  list.map((g, i) => ({ id: `${g}g`, ar: `${g} غ`, en: `${g}g`, price: jd(prices[i]) }));

const STD = grams([100, 150, 200, 300], [4.0, 4.5, 5.25, 6.75]);
const HEAVY = grams([120, 170, 220, 320], [4.25, 4.75, 5.5, 7.0]);
const chickenSizes = (mini, single, double) => [
  { id: 'mini', ar: 'ميني', en: 'Mini', price: jd(mini) },
  { id: 'single', ar: 'سنجل', en: 'Single', price: jd(single) },
  { id: 'double', ar: 'دبل', en: 'Double', price: jd(double) },
];
const one = (price, ar = 'عادي', en = 'Regular') => [{ id: 'one', ar, en, price: jd(price) }];
const sauceSizes = (s, l) => [
  { id: 'small', ar: 'صغير', en: 'Small', price: jd(s) },
  { id: 'large', ar: 'كبير', en: 'Large', price: jd(l) },
];

export const categories = [
  {
    id: 'angus',
    name_ar: 'برغر أنجوس',
    name_en: 'Angus Beef Burgers',
    tagline_ar: 'لحم أنجوس ١٠٠٪ — اختار وزنك',
    tagline_en: '100% Angus beef — pick your weight',
    allows_combo: 1,
    allows_addons: 1,
  },
  {
    id: 'chicken',
    name_ar: 'برغر دجاج',
    name_en: 'Chicken Burgers',
    tagline_ar: 'صدر دجاج مقرمش أو مشوي',
    tagline_en: 'Crispy or grilled chicken breast',
    allows_combo: 1,
    allows_addons: 1,
  },
  {
    id: 'appetizers',
    name_ar: 'مقبلات',
    name_en: 'Appetizers',
    tagline_ar: 'للمشاركة… أو لا',
    tagline_en: 'For sharing. Or not.',
  },
  {
    id: 'sauces',
    name_ar: 'صوصات',
    name_en: 'Sauces & Dips',
    tagline_ar: 'صغير ٠٫٢٥ — كبير ٠٫٥٠',
    tagline_en: 'Small 0.25 — Large 0.50',
  },
  {
    id: 'extras',
    name_ar: 'إضافات',
    name_en: 'Extras',
    tagline_ar: 'زيد على برغرك',
    tagline_en: 'Level up your burger',
  },
  {
    id: 'drinks',
    name_ar: 'مشروبات',
    name_en: 'Drinks',
    tagline_ar: 'باردة ومنعشة',
    tagline_en: 'Ice cold',
  },
];

export const items = [
  // ─── Angus beef burgers ───────────────────────────────────────────
  {
    id: 'meat-cheezz', category_id: 'angus', image: '/img/menu/meat-cheezz.webp',
    name_ar: 'ميت آند تشيز', name_en: 'Meat & Cheezz',
    desc_ar: 'أنجوس بيف، ناتشوز، بيف بيكن، طماطم، خس، جبنة تشدر، صوص الخاص',
    desc_en: 'Angus beef, nachos, beef bacon, lettuce, tomatoes, cheddar cheese, secret sauce',
    sizes: STD, tags: ['signature'], featured: 1,
  },
  {
    id: 'bob-marley', category_id: 'angus', image: '/img/menu/bob-marley.webp',
    name_ar: 'بوب مارلي', name_en: 'Bob Marley',
    desc_ar: 'أنجوس بيف، هالابينو، تشيلي ميت، جبنة مشكلة، خس، ناتشوز، طماطم، صوص الخاص',
    desc_en: 'Angus beef, jalapeño, chilli meat, lettuce, nachos, tomato, mixed cheese, secret sauce',
    sizes: HEAVY, tags: ['spicy'], featured: 1,
  },
  {
    id: 'eminem', category_id: 'angus', image: '/img/menu/eminem.webp',
    name_ar: 'إمينيم', name_en: 'Eminem Burger',
    desc_ar: 'أنجوس بيف، فطر مع كريمة وبصل، جبنة موزاريلا، مايونيز',
    desc_en: 'Angus beef, fresh mushroom, cooking cream, grilled onion, mozzarella cheese, mayonnaise',
    sizes: STD, tags: [],
  },
  {
    id: '2pac', category_id: 'angus', image: '/img/menu/2pac.webp',
    name_ar: 'توباك', name_en: '2Pac Burger',
    desc_ar: 'أنجوس بيف، فطر طازج، بصل، جبنة سويسرية، جريفي صوص، مايونيز، باربيكيو صوص',
    desc_en: 'Angus beef, fresh mushroom, grilled onion, Swiss cheese, gravy sauce, mayonnaise, BBQ',
    sizes: STD, tags: ['signature'], featured: 1,
  },
  {
    id: 'smash', category_id: 'angus', image: '/img/menu/smash.webp',
    name_ar: 'سماش برغر', name_en: 'Smash Burger',
    desc_ar: 'سماش أنجوس بيف، بيف بيكن، بصل مكرمل، جبنة تشدر، صوص خاص',
    desc_en: 'Smashed Angus beef, beef bacon, caramelized onions, cheddar cheese, secret sauce',
    sizes: STD, tags: ['signature'], featured: 1,
  },
  {
    id: 'spicy-smash', category_id: 'angus', image: '/img/menu/spicy-smash.webp',
    name_ar: 'سبايسي سماش', name_en: 'Spicy Smash',
    desc_ar: 'أنجوس بيف، فلفل أخضر مشوي، جبنة مكس، صوص الخاص',
    desc_en: 'Angus beef, grilled green pepper, mix cheese, secret sauce',
    sizes: HEAVY, tags: ['spicy'], featured: 1,
  },
  {
    id: '50-cent', category_id: 'angus', image: '/img/menu/50-cent.webp',
    name_ar: 'فيفتي سنت', name_en: '50 Cent',
    desc_ar: 'أنجوس بيف، بصل، خس، جبنة تشدر، صوص المدخن الحار',
    desc_en: 'Angus beef, onion, lettuce, cheddar cheese, spicy smoked sauce',
    sizes: STD, tags: ['spicy'],
  },
  {
    id: 'mj', category_id: 'angus', image: '/img/menu/mj.webp',
    name_ar: 'مايكل جاكسون', name_en: 'MJ Burger',
    desc_ar: 'أنجوس بيف، طماطم، بصل، خس، جبنة تشدر، مخلل، صوص الخاص',
    desc_en: 'Angus beef, tomato, onion, lettuce, cheddar cheese, pickles, secret sauce',
    sizes: STD, tags: [],
  },

  // ─── Chicken burgers ──────────────────────────────────────────────
  {
    id: 'lady-gaga', category_id: 'chicken', image: '/img/menu/lady-gaga.webp',
    name_ar: 'ليدي غاغا', name_en: 'Lady Gaga Burger',
    desc_ar: 'صدر دجاج مقلي، رانش صوص، خس، تشدر تشيز، كولسلو، بافالو صوص',
    desc_en: 'Fried chicken breast, ranch, lettuce, cheddar cheese, coleslaw, buffalo sauce',
    sizes: chickenSizes(3.5, 4.0, 6.0), tags: ['signature'], featured: 1,
  },
  {
    id: 'madonna', category_id: 'chicken', image: '/img/menu/madonna.webp',
    name_ar: 'مادونا', name_en: 'Madonna Burger',
    desc_ar: 'صدر دجاج مقلي، كولسلو، خس، جبنة تشدر، رانش صوص، صوص هاني ماسترد',
    desc_en: 'Fried chicken breast, coleslaw, lettuce, cheddar cheese, ranch, honey mustard',
    sizes: chickenSizes(3.5, 4.0, 6.0), tags: ['signature'], featured: 1,
  },
  {
    id: 'cardi-b', category_id: 'chicken', image: '/img/menu/cardi-b.webp',
    name_ar: 'كاردي بي', name_en: 'Cardi B Burger',
    desc_ar: 'صدر دجاج مقلي، خس، جبنة تشدر، مخلل، رانش، صوص كاردي بي الحار-حلو',
    desc_en: 'Fried chicken breast, lettuce, cheddar cheese, pickles, ranch, Cardi B sweet-chilli sauce',
    sizes: chickenSizes(3.5, 4.0, 6.0), tags: [],
  },
  {
    id: 'shakira', category_id: 'chicken', image: '/img/menu/shakira.webp',
    name_ar: 'شاكيرا', name_en: 'Shakira Burger',
    desc_ar: 'صدر دجاج مقلي، خس، جبنة تشدر، عسل، رانش، صوص شاكيرا الحار',
    desc_en: 'Fried chicken breast, lettuce, cheddar cheese, honey, ranch, Shakira hot sauce',
    sizes: chickenSizes(3.5, 4.0, 6.0), tags: ['spicy'], featured: 1,
  },
  {
    id: 'sia', category_id: 'chicken', image: '/img/menu/sia.webp',
    name_ar: 'سيا', name_en: 'Sia Burger',
    desc_ar: 'صدر دجاج مقلي، خس، جبنة تشدر، رانش، صوص المدخن الحار',
    desc_en: 'Fried chicken breast, lettuce, cheddar cheese, ranch, spicy smoked sauce',
    sizes: chickenSizes(4.0, 4.5, 6.5), tags: ['spicy'],
  },
  {
    id: 'marilyn', category_id: 'chicken', image: '/img/menu/marilyn.webp',
    name_ar: 'مارلين', name_en: 'Marilyn Burger',
    desc_ar: 'صدر دجاج مشوي، طماطم، خس، جبنة تشدر، صوص خاص',
    desc_en: 'Grilled chicken breast, lettuce, tomato, cheddar cheese, secret sauce',
    sizes: chickenSizes(3.5, 4.0, 6.0), tags: ['grilled'],
  },

  // ─── Appetizers ───────────────────────────────────────────────────
  {
    id: 'chicken-cheese-fries', category_id: 'appetizers', image: '/img/menu/chicken-cheese-fries.webp',
    name_ar: 'تشكن تشيز فرايز', name_en: 'Chicken Cheese Fries',
    desc_ar: 'بطاطا مقلية، قطع دجاج مقلية، رانش صوص، بافالو صوص، مكس تشيز، أوريغانو',
    desc_en: 'French fries, fried chicken pieces, ranch, buffalo sauce, mix cheese, oregano',
    note_ar: 'بكفي ٢-٣ أشخاص', note_en: 'Serves 2–3',
    sizes: one(4.5), tags: ['signature'],
  },
  {
    id: 'chilli-cheese-fries', category_id: 'appetizers', image: '/img/menu/chilli-cheese-fries.webp',
    name_ar: 'تشيلي تشيز فرايز', name_en: 'Chilli Cheese Fries',
    desc_ar: 'بطاطا مقلية، خلطة تشيلي ميت الخاصة، رانش صوص، بافالو صوص، مكس تشيز، هالابينو',
    desc_en: 'French fries, special chilli meat mix, ranch, buffalo sauce, mix cheese, jalapeño',
    note_ar: 'بكفي ٢-٣ أشخاص', note_en: 'Serves 2–3',
    sizes: one(4.5), tags: ['spicy'],
  },
  {
    id: 'chicken-strips', category_id: 'appetizers', image: '/img/menu/chicken-strips.webp',
    name_ar: 'أصابع الدجاج', name_en: 'Chicken Strips',
    desc_ar: 'أصابع دجاج مقرمشة — اختار كم قطعة بدك',
    desc_en: 'Crispy fried chicken fingers — order as many as you like',
    note_ar: 'السعر للقطعة', note_en: 'Price per piece',
    sizes: one(1.0, 'قطعة', '1 piece'), tags: [],
  },
  {
    id: 'onion-rings', category_id: 'appetizers', image: '/img/menu/onion-rings.webp',
    name_ar: 'حلقات البصل', name_en: 'Onion Rings',
    desc_ar: 'حلقات بصل مقرمشة', desc_en: 'Golden crispy onion rings',
    note_ar: '٦ حلقات', note_en: '6 rings',
    sizes: one(2.75), tags: [],
  },
  {
    id: 'mozzarella-sticks', category_id: 'appetizers', image: '/img/menu/mozzarella-sticks.webp',
    name_ar: 'أصابع الموزاريلا', name_en: 'Mozzarella Sticks',
    desc_ar: 'موزاريلا بتمطّ، مقرمشة من برّا', desc_en: 'Stretchy mozzarella, crunchy outside',
    note_ar: '٥ أصابع', note_en: '5 sticks',
    sizes: one(3.0), tags: [],
  },
  {
    id: 'curly-fries', category_id: 'appetizers', image: '/img/menu/curly-fries.webp',
    name_ar: 'بطاطس كيرلي', name_en: 'Curly Fries',
    desc_ar: 'بطاطا حلزونية متبّلة', desc_en: 'Seasoned spiral fries',
    sizes: one(1.75), tags: [],
  },
  {
    id: 'french-fries', category_id: 'appetizers', image: '/img/menu/french-fries.webp',
    name_ar: 'فرينش فرايز', name_en: 'French Fries',
    desc_ar: 'بطاطا مقلية ذهبية', desc_en: 'Golden french fries',
    sizes: one(1.0), tags: [],
  },
  {
    id: 'cheese-dip', category_id: 'appetizers', image: '/img/menu/cheese-dip.webp',
    name_ar: 'صحن جبنة', name_en: 'Cheese Dip',
    desc_ar: 'صوص جبنة سايح للتغميس', desc_en: 'Warm melted cheese for dipping',
    note_ar: 'صحن كبير', note_en: 'Large plate',
    sizes: one(3.0), tags: [],
  },

  // ─── Sauces & dips ────────────────────────────────────────────────
  ...[
    ['buffalo', 'صوص البافالو', 'Buffalo Sauce'],
    ['sweet-chilli', 'صوص الحار / حلو', 'Sweet / Chilli Sauce'],
    ['ranch', 'صوص الرانش', 'Ranch Sauce'],
    ['secret', 'صوص الخاص', 'Secret Sauce'],
    ['honey-mustard', 'صوص الهاني ماسترد', 'Honey Mustard Sauce'],
    ['bbq', 'صوص الباربيكيو', 'BBQ Sauce'],
    ['cheese-sauce', 'صوص الجبنة', 'Cheese Sauce'],
  ].map(([id, ar, en]) => ({
    id: `sauce-${id}`, category_id: 'sauces', image: '',
    name_ar: ar, name_en: en, desc_ar: '', desc_en: '',
    sizes: sauceSizes(0.25, 0.5), tags: id === 'buffalo' || id === 'sweet-chilli' ? ['spicy'] : [],
  })),
  {
    id: 'sauce-all', category_id: 'sauces', image: '',
    name_ar: 'تشكيلة صوصات', name_en: 'All Sauces',
    desc_ar: 'كل الصوصات بعلبة وحدة', desc_en: 'Every sauce, one box',
    sizes: sauceSizes(1.0, 2.0), tags: [],
  },

  // ─── Extras (also offered as burger add-ons) ──────────────────────
  {
    id: 'extra-cheezzy', category_id: 'extras', image: '',
    name_ar: 'شيّززها!', name_en: 'Make it Super Cheeezzy',
    desc_ar: 'جبنة زيادة بتسيل على أي برغر', desc_en: 'Extra melting cheese on any burger',
    sizes: one(1.0), tags: ['signature'], is_addon: 1,
  },
  {
    id: 'extra-cheddar', category_id: 'extras', image: '',
    name_ar: 'جبنة تشيدر', name_en: 'Cheddar Cheese',
    desc_ar: '', desc_en: '', sizes: one(0.35, 'شريحة', '1 slice'), tags: [], is_addon: 1,
  },
  {
    id: 'extra-patty', category_id: 'extras', image: '',
    name_ar: 'قطعة لحمة برغر', name_en: 'Angus Beef Patty',
    desc_ar: '', desc_en: '', sizes: one(1.5, '١٠٠ غ', '100g'), tags: [], is_addon: 1,
  },
  {
    id: 'extra-mushrooms', category_id: 'extras', image: '',
    name_ar: 'ماشروم', name_en: 'Mushrooms',
    desc_ar: '', desc_en: '', sizes: one(0.5), tags: [], is_addon: 1,
  },
  {
    id: 'extra-bacon', category_id: 'extras', image: '',
    name_ar: 'بيكن بقري', name_en: 'Beef Bacon',
    desc_ar: '', desc_en: '', sizes: one(0.6, 'شريحة', '1 slice'), tags: [], is_addon: 1,
  },

  // ─── Drinks ───────────────────────────────────────────────────────
  {
    id: 'soft-drink', category_id: 'drinks', image: '',
    name_ar: 'مشروبات غازية', name_en: 'Soft Drinks',
    desc_ar: 'اكتب النوع اللي بدك ياه بالملاحظات', desc_en: 'Tell us your flavour in the notes',
    sizes: one(0.5), tags: [],
  },
  {
    id: 'water', category_id: 'drinks', image: '',
    name_ar: 'مياه معدنية', name_en: 'Mineral Water',
    desc_ar: '', desc_en: '', sizes: one(0.5), tags: [],
  },
];

export const branches = [
  {
    id: 'abdoun',
    name_ar: 'عبدون', name_en: 'Abdoun',
    address_ar: 'عبدون — شارع المزار', address_en: 'Abdoun — Al Mazar St.',
    phone: '+962788600111',
    whatsapp: '962788600111',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Meat+and+Cheese+Abdoun+Amman',
    rating: 4.9, reviews: 7430,
    open_time: '12:00', close_time: '02:00',
    delivery: 1, accepting: 1, sort: 1,
  },
  {
    id: 'mecca',
    name_ar: 'شارع مكة', name_en: 'Mecca St.',
    address_ar: 'شارع مكة — بالقرب من مجمع الداوود', address_en: 'Mecca St. — near Al-Dawood Complex',
    phone: '+962788600111',
    whatsapp: '962788600111',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Meat+and+Cheezz+Mecca+St+Amman',
    rating: 4.8, reviews: 5883,
    open_time: '12:00', close_time: '02:00',
    delivery: 1, accepting: 1, sort: 2,
  },
];

export const settings = {
  combo_price: '1500',
  google_rating: '4.9',
  google_reviews: '7400',
  delivery_note_ar: 'رسوم التوصيل حسب المنطقة — بنأكدها معك على واتساب',
  delivery_note_en: 'Delivery fee depends on your area — we confirm it on WhatsApp',
  announcement_ar: '',
  announcement_en: '',
  instagram: '',
  tiktok: '',
  facebook: '',
  talabat: '',
  orders_enabled: '1',
};
