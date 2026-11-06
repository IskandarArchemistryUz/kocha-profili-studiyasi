/**
 * Tugma izohlari (06.11.2026, tanishtiruv — A qism): sichqoncha 0,4 s tursa yoki klaviatura fokusida
 * tugma yonida karta chiqadi: nomi (tugmaning oʻz title/aria-label matni), bir gap izoh, narx (tanga) va yopiq boʻlsa — sababi.
 * Planshetda — uzoq bosish (0,5 s). Brauzerning oddiy title izohi bu tugmalarda chiqmaydi (title → data-tip-t).
 * Izoh matnlari 10 tilda — ./tips.json (kalit — oʻzbekcha matn, qiymat — [en, ru, es, pt, fr, az, uk, tr, kk]).
 * Muharrir kodiga tegmaydi: tugmalar id / data-* boʻyicha topiladi (topilmasa — izohsiz qoladi).
 */
import './tips.css';
import TX from './tips.json';
import { getLang, onLang, tr, trSvg } from '../i18n';
import { priceTag, heavyPrice, itemPrice, onPrices, type Heavy } from '../account/pay';
import { ANIM } from './tipanim';

type Price = 'free' | { heavy: Heavy } | { item: string; only?: boolean };
/** a — kanvasdagi animatsiya(lar) raqami; ikkitasi boʻlsa navbat bilan (avval kursor harakati, keyin natija) */
interface Tip { sel: string; d: string; p?: Price; a?: string[] }

const TIPS: Tip[] = [
  /* yuqori panel */
  { sel: '#back', d: 'Loyihalar roʻyxatiga qaytish. Loyiha avtomatik saqlangan.' },
  { sel: 'input.pname', d: 'Loyiha nomi: oʻzgartiring va Enter bosing.' },
  { sel: '.save[data-s]', d: 'Loyiha shu brauzerda avtomatik saqlanadi. Boshqa kompyuter uchun — 11-qadamda «Loyiha fayli (JSON)».' },
  { sel: '[data-view="plan"]', d: 'Yuqoridan koʻrinish. Chizish shu rejimda ishlaydi.', a: ['27'] },
  { sel: '[data-view="axo"]', d: 'Hajmlarni burchakdan, perspektivasiz koʻrish.', a: ['27'] },
  { sel: '[data-view="persp"]', d: 'Inson koʻzi kabi koʻrinish. Koʻz sathi — «Kamera» menyusida.', a: ['27'] },
  { sel: '#liteSeg [data-lite]', d: '«Sodda» uzoqdagi derazalar va daraxtlarni yashiradi — sahna tezroq. Eksport doim toʻliq.' },
  { sel: '#camPop', d: 'Obyektiv, koʻz sathi, 2 nuqtali perspektiva, kadr va saqlangan koʻrinishlar.' },
  { sel: '#presPop', d: 'Varaq ramkasini xaritaga qoʻyish va Chizmadon taqdimot albomi.', a: ['25'] },
  { sel: '#tourBtn', d: 'Master reja boʻyicha 2 daqiqalik tanishtiruv.' },
  { sel: '#prefPop', d: 'Til (10 ta) va tungi rejim.' },
  { sel: '#acctIn, #homeIn', d: 'Pochta orqali kirish: parol kerak emas, 6 xonali kod keladi. 1-qadamdan keyin kerak.' },
  { sel: '#acctPop', d: 'Hisob: tanga balansi, xarid va sarf tarixi.' },
  { sel: '#acctBuy, #homeBuy', d: 'Tanga paketlari: Payme, Click yoki Multicard orqali.' },
  /* xarita */
  { sel: '#stylePop', d: 'Fon xaritasi, sahna uslubi, qogʻoz teksturasi va portlatilgan qatlamlar. Hisobga taʼsir qilmaydi.' },
  { sel: '#layPop', d: 'Atrof qatlamlari, yozuvlar, oʻz GeoJSON qatlamlaringiz va yer sathi xaritalari.' },
  { sel: '#worldBtn', d: 'Butun dunyo xaritasi — boshqa shahar yoki mamlakatga tez oʻtish.' },
  /* qadamlar */
  { sel: '.rb[data-step="uchastka"]', d: 'Joyni topish, atrofni yuklash va uchastka chegarasini chizish. Bepul, kirishsiz.' },
  { sel: '.rb[data-step="kocha"]', d: 'Koʻcha oʻqlari va profillari; qizil chiziq, trotuar va daraxtlar avtomatik.' },
  { sel: '.rb[data-step="parsel"]', d: 'Dahalarga funksiya berish, mavjud binolarni saqlash yoki buzish.' },
  { sel: '.rb[data-step="yashil"]', d: 'Koʻkalamzorlik balansi (kamida 25 %), hovli va maydonchalar.' },
  { sel: '.rb[data-step="hajm"]', d: 'Binolarni generatsiya qilish yoki qoʻlda chizish.', p: { heavy: 'gen' } },
  { sel: '.rb[data-step="quyosh"]', d: 'Jonli soyalar, insolyatsiya xaritasi va piyoda sathida shamol.' },
  { sel: '.rb[data-step="fasad"]', d: 'Material, derazalar, balkonlar va tom.' },
  { sel: '.rb[data-step="kvartira"]', d: 'Kvartirografiya, poetaj rejalar va derazalar insolyatsiyasi.' },
  { sel: '.rb[data-step="xizmat"]', d: 'Bogʻcha, maktab, poliklinika va bekatlargacha piyoda masofa.' },
  { sel: '.rb[data-step="tekshiruv"]', d: 'Barcha meʼyorlar bitta jadvalda: band, qiymat, chegara, natija.' },
  { sel: '.rb[data-step="eksport"]', d: 'Varaqlar, PDF, DXF, 3D model va IFC.' },
  /* pastki asboblar */
  { sel: '[data-tool="select"]', d: 'Bino, koʻcha yoki dahani tanlash.' },
  { sel: '[data-tool="hand"]', d: 'Xaritani surish. Boʻsh joyda sudrash ham suradi.' },
  { sel: '[data-tool="measure"]', d: 'Masofa va maydonni oʻlchash. Ikki marta bosish — tugatish.', a: ['6B'] },
  { sel: '[data-tool="section"]', d: 'Gorizontal yoki chizilgan vertikal kesim.', a: ['7B'] },
  { sel: '[data-tool="pipette"]', d: 'Fasad uslubini koʻchirish: avval namuna binoni, keyin boshqalarini bosing.', a: ['8B'] },
  { sel: '#undo', d: 'Oxirgi amalni bekor qilish.' },
  { sel: '#redo', d: 'Bekor qilinganni qaytarish.' },
  /* koʻrsatkichlar */
  { sel: '#kSite', d: 'Chegara ichidagi umumiy maydon.' },
  { sel: '#kUsable', d: 'Cheklovlar (SMZ, qabriston, ELU) chiqarilgandan keyingi maydon.' },
  { sel: '#kGfa', d: 'Barcha binolarning umumiy qavat maydoni.' },
  { sel: '#kUmn', d: 'Umumiy maydon / uchastka maydoni. Rang — meʼyor holati.' },
  { sel: '#kPop', d: 'Turar maydon va uy-joy normasidan hisoblangan aholi.' },
  { sel: '#kAll', d: 'FAR, qurilish zichligi, oʻrtacha qavat, zichlik va ish oʻrinlari.' },
  { sel: '#kMore', d: '✓ — hammasi mos; raqam — mos kelmagan meʼyorlar. Bosing: roʻyxat, «Qayerda» va «Tuzatish».', a: ['20'] },
  { sel: '#scaleChip', d: 'Ekrandagi taxminiy masshtab.' },
  /* 1-qadam */
  { sel: '#qGo', d: 'Manzil, joy nomi yoki koordinata (41.31, 69.28).' },
  { sel: '#ctxLoad', d: 'Ekran markazi atrofidagi binolar, yoʻllar, suv, relyef va sunʼiy yoʻldosh surati (OpenStreetMap).', p: 'free', a: ['3A'] },
  { sel: '#drawSite', d: 'Burchaklarni ketma-ket bosing. Enter — tugatish, Backspace — oxirgi nuqta, Esc — bekor.', p: 'free', a: ['4B'] },
  { sel: '#pickBlock', d: 'Koʻchalar bilan oʻralgan dahani bir bosishda chegara qilish.', p: 'free', a: ['5B'] },
  { sel: '#rectSite', d: 'Ekran markaziga berilgan oʻlchamdagi toʻrtburchak uchastka.', p: 'free' },
  { sel: '#siteFile', d: 'KML/KMZ, GeoJSON yoki DXF fayldan chegara.', p: 'free' },
  { sel: '#limOsm', d: 'Uchastkadagi cheklovlarni (qabriston, ELU, suv, sanoat) OSM dan aniqlash.', p: 'free' },
  /* 2-qadam */
  { sel: '#gridApply', d: 'Tanlangan modul boʻyicha uchastkaga koʻcha toʻri.', p: 'free', a: ['9A'] },
  { sel: '#gridBest', d: 'Toʻrni insolyatsiya uchun eng yaxshi burchakka burish.', a: ['9B'] },
  { sel: '#drawStreet', d: 'Koʻcha oʻqini nuqtalab chizing; profil — tanlangan karta.', p: 'free', a: ['10B', '10A'] },
  { sel: '#adoptOsm', d: 'Mavjud (OSM) yoʻlni loyiha koʻchasiga aylantirish.' },
  { sel: '#stKs', d: 'Koʻcha kesimini Koʻchasoz vositasida batafsil ochish.' },
  /* 3–4-qadam */
  { sel: '#keepAll', d: 'Uchastkadagi barcha mavjud binolarni saqlash.' },
  { sel: '#dropAll', d: 'Barcha mavjud binolarni buzishga belgilash — koʻchirish xarajati hisoblanadi.' },
  { sel: '#pSplit', d: 'Dahani berilgan oʻlcham va burchak boʻyicha yer uchastkalariga boʻlish.', p: 'free', a: ['11B'] },
  { sel: '#isoGo', d: 'Faqat shu dahani koʻrsatish.' },
  { sel: '#yardsOn', d: 'Hovlilarda oʻyin, sport va dam olish maydonchalarini avtomatik joylash (ShNQ 2.07.01-23, 90-band).' },
  /* 5-qadam */
  { sel: '#genGo', d: 'Tanlangan dahaga seksiyalarni meʼyorlar asosida joylashtiradi: chekinish, insolyatsiya, yongʻin yoʻllari.', p: { heavy: 'gen' }, a: ['13A'] },
  { sel: '#genAll', d: 'Barcha dahalarni bir hisobda generatsiya qilish.', p: { heavy: 'gen' }, a: ['13A'] },
  { sel: '#genClear', d: 'Dahadagi binolarni olib tashlash.' },
  { sel: '#gFar', d: 'Generatsiya shu zichlikka (UMN) intiladi.' },
  { sel: '#drawBld, #drawPoly, #drawAxis, #drawStrip', d: 'Binoni qoʻlda chizish: toʻrtburchak, erkin shakl, oʻq yoki chiziq boʻylab.', p: 'free', a: ['12A', '12B'] },
  /* 6, 8, 9-qadam */
  { sel: '#insolGo', d: 'Uchastka insolyatsiyasi (SanQvaN 0102-25). Loyiha oʻzgarsa — qayta bosing.', p: { heavy: 'sun' }, a: ['14B', '14A'] },
  { sel: '#windGo', d: 'Piyoda sathida shamol qulayligi (Lawson). Loyiha oʻzgarsa — qayta bosing.', p: { heavy: 'wind' }, a: ['15B', '15A'] },
  { sel: '#sunTime', d: 'Soyalarni kun davomida koʻrish.', p: 'free' },
  { sel: '#aptGo', d: 'Har derazaning insolyatsiya davomiyligi.', p: { heavy: 'flats' }, a: ['16B', '16A'] },
  { sel: '#planEditBtn', d: 'Poetaj rejalar albomini ochish.' },
  { sel: '#poiAdd', d: 'Xaritada yoʻq xizmat obyektini qoʻlda belgilash.' },
  /* 11-qadam */
  { sel: '#exPdf', d: 'Hisobot brauzer chop etish oynasi orqali PDF boʻladi.', p: 'free' },
  { sel: '#exJson', d: 'Toʻliq zaxira — boshqa kompyuterda ochish uchun.', p: 'free' },
  { sel: '#exXlsx', d: 'TEP va meʼyorlar reyestri Excel jadvalda.', p: { item: 'mr.tik', only: true } },
  { sel: '#exPng', d: 'Joriy koʻrinish rasmi.', p: { item: 'mr.png' }, a: ['24'] },
  { sel: '#exGx', d: 'Bosh reja, zonalash va aksonometriya varaqlari, albom.' },
  { sel: '#exCh', d: 'Chizmadon: taqdimot albomi.' },
  { sel: '#exAi', d: 'Qatlamli bosh reja Illustrator uchun.', p: { item: 'mr.sheet' }, a: ['24'] },
  { sel: '#exDxf', d: 'Reja va hajmlar AutoCAD uchun, qatlamlar bilan.', p: { item: 'mr.dxf', only: true } },
  { sel: '#exGlb, #exObj, #exGlbCtx', d: '3D model (Blender, SketchUp, Rhino).', p: { item: 'mr.glb', only: true } },
  { sel: '#exIfc', d: 'BIM model (IFC4) — ArchiCAD, Revit.', p: { item: 'mr.ifc', only: true } },
  { sel: '#exJoy', d: 'Diagramma uchun Joyshunos vositasiga yuborish.' },
  { sel: '#exRen', d: 'Joriy kadrni Render studiyasiga yuborish.' },
  /* varaqlar oynasi */
  { sel: '#shAlbum, #gxAlbum', d: 'Barcha varaqlar bitta PDF albomda.', p: { item: 'mr.album' } },
  { sel: '#gxPdf, #gxSvg, #gxAi, #gxPng, #gxPng3', d: 'Joriy varaq.', p: { item: 'mr.sheet' }, a: ['24'] },
  { sel: '#gxDxf', d: 'Varaq chiziqlari AutoCAD uchun.', p: { item: 'mr.dxf', only: true } },
  /* bosh sahifa */
  { sel: '#sampleP', d: 'Tayyor misol: Yangi Toshkent, 80A lot (3,95 ga) — koʻcha, ikki daha, 6 qavatli turar joy, bogʻcha va park, yer osti avtoturargoh. Nusxasi ochiladi.' },
  { sel: '#newP', d: 'Boʻsh loyiha — 1-qadamdan boshlaysiz.' },
  { sel: '#openFile', d: 'Avval saqlangan loyiha fayli (JSON).' },
  { sel: 'button[data-del]', d: 'Loyihani butunlay oʻchirish — qaytarib boʻlmaydi.' },
];

/* ---------- matnlar (10 til) ---------- */
const ORDER = ['en', 'ru', 'es', 'pt', 'fr', 'az', 'uk', 'tr', 'kk'];
const T = TX as unknown as Record<string, string[]>;
/** Izoh matni joriy tilda (yoʻq boʻlsa — inglizcha, u ham yoʻq boʻlsa — oʻzbekcha) */
export function tipText(uz: string, vals: Record<string, string | number> = {}): string {
  const l = getLang(), v = T[uz];
  let s = l === 'uz' || !v ? uz : v[ORDER.indexOf(l)] || v[0] || uz;
  for (const [k, x] of Object.entries(vals)) s = s.replace('${' + k + '}', String(x));
  return s;
}

/* ---------- koʻrsatish ---------- */
const SEL = TIPS.map(t => t.sel).join(',');
const DELAY = 400, LONG = 500;
let timer = 0, cur: HTMLElement | null = null, box: HTMLElement | null = null;

function find(el: EventTarget | null): { e: HTMLElement; t: Tip } | null {
  if (!(el instanceof Element)) return null;
  const e = el.closest<HTMLElement>(SEL); if (!e) return null;
  const t = TIPS.find(x => e.matches(x.sel)); return t ? { e, t } : null;
}
/** Oddiy brauzer izohini oʻchirish: title → data-tip-t (matn sarlavha sifatida ishlatiladi) */
function stash(e: HTMLElement): void { const t = e.getAttribute('title'); if (t) { e.dataset.tipT = t; e.removeAttribute('title'); } }

const chip = (cls: string, s: string) => { const c = document.createElement('span'); c.className = `tip-chip ${cls}`; c.textContent = s; return c; };
function priceRow(p: Price): HTMLElement | null {
  const row = document.createElement('div'); row.className = 'tip-price';
  if (p === 'free') { row.append(chip('ok', tipText('Bepul'))); return row; }
  if ('heavy' in p) {
    const tag = priceTag(p.heavy); if (!tag) return null;   // egasi / hisob oʻchiq yoki narx hali yuklanmagan
    const rule = p.heavy === 'gen' ? 'Har loyihada 3 ta generatsiya bepul' : 'Haftada 1 ta ogʻir hisob bepul';
    if (tag === tr('bepul')) row.append(chip('ok', tipText('Hozir bepul')));
    else row.append(chip('coin', tipText('≈ ${n} tanga', { n: heavyPrice(p.heavy) ?? '' })));
    row.append(chip('', tipText(rule)));
    return row;
  }
  const n = itemPrice(p.item); if (n == null) return null;
  if (p.only) row.append(chip('coin', tipText('≈ ${n} tanga', { n })), chip('', tipText('Faqat toza fayl')));
  else row.append(chip('ok', tipText('Belgi bilan — bepul')), chip('coin', tipText('Toza — ≈ ${n} tanga', { n })));
  return row;
}

/** Tugmaning koʻrinadigan yozuvi (narx belgisi, holat belgisi, ikonkasiz); tugma boʻlmasa — boʻsh */
function label(e: HTMLElement): string {
  if (e.tagName !== 'BUTTON') return '';
  const c = e.cloneNode(true) as HTMLElement; c.querySelectorAll('.ptag,.kst,svg').forEach(x => x.remove());
  return (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function build(e: HTMLElement, t: Tip): HTMLElement {
  const b = document.createElement('div'); b.className = 'tip-card'; b.id = 'mr-tip'; b.setAttribute('role', 'tooltip'); b.dataset.notr = '';
  const title = e.dataset.tipT || e.getAttribute('title') || '', aria = e.getAttribute('aria-label') || '';
  const lines = title.split('\n').map(s => s.trim()).filter(Boolean);
  const head = (aria.length > (lines[0]?.length ?? 0) && !aria.includes(' — ') ? aria : lines[0]) || aria || label(e);   // nomi boʻlmasa (koʻrsatkichlar) — faqat izoh
  if (head) { const h = document.createElement('div'); h.className = 'tip-h'; h.textContent = head; b.append(h); }
  const d = document.createElement('div'); d.className = 'tip-d'; d.textContent = tipText(t.d); b.append(d);
  for (const w of lines.slice(1)) { const x = document.createElement('div'); x.className = 'tip-warn'; x.textContent = w; b.append(x); }
  if (t.a?.length) {
    const box = document.createElement('div'); box.className = 'tip-anim'; box.dataset.n = String(t.a.length); box.setAttribute('aria-hidden', 'true');
    for (const id of t.a) { const v = document.createElement('div'); v.className = 'tip-av'; v.innerHTML = `<svg viewBox="0 0 260 84" width="256" height="83">${id === '27' ? ANIM[id] : trSvg(ANIM[id] ?? '')}</svg>`; box.append(v); }
    b.append(box);
  }
  if (t.p) { const r = priceRow(t.p); if (r) b.append(r); }
  return b;
}

function place(b: HTMLElement, e: HTMLElement): void {
  const r = e.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, bw = b.offsetWidth, bh = b.offsetHeight, g = 8;
  let x: number, y: number, side: string;
  if (r.right < 110 && r.right + g + bw < W) { side = 'right'; x = r.right + g; y = r.top + r.height / 2 - bh / 2; }   // chap qator
  else if (r.top > H * 0.55 && r.top - g - bh > 0) { side = 'top'; x = r.left + r.width / 2 - bw / 2; y = r.top - g - bh; }   // pastki panel
  else { side = 'bottom'; x = r.left + r.width / 2 - bw / 2; y = r.bottom + g; }
  b.dataset.side = side;
  b.style.left = `${Math.round(Math.max(g, Math.min(W - bw - g, x)))}px`;
  b.style.top = `${Math.round(Math.max(g, Math.min(H - bh - g, y)))}px`;
}

function show(e: HTMLElement, t: Tip): void {
  hide(); cur = e;
  const b = build(e, t); b.style.visibility = 'hidden'; document.body.append(b); place(b, e); b.style.visibility = '';
  box = b; e.setAttribute('aria-describedby', 'mr-tip');
}
function hide(): void {
  clearTimeout(timer);
  if (cur && cur.getAttribute('aria-describedby') === 'mr-tip') cur.removeAttribute('aria-describedby');
  box?.remove(); box = null; cur = null;
}
function schedule(e: HTMLElement, t: Tip, ms: number): void { clearTimeout(timer); timer = window.setTimeout(() => { if (e.isConnected) show(e, t); }, ms); }

let inited = false;
export function initTips(): void {
  if (inited || typeof document === 'undefined') return; inited = true;
  document.addEventListener('pointerover', ev => {
    if (ev.pointerType === 'touch') return;
    const m = find(ev.target); if (!m) return;
    stash(m.e);
    if (m.e === cur) return;
    if (box) show(m.e, m.t); else schedule(m.e, m.t, DELAY);   // bitta izoh ochiq boʻlsa — qoʻshni tugmaga darhol oʻtadi
  }, true);
  document.addEventListener('pointerout', ev => {
    if (ev.pointerType === 'touch') return;
    const m = find(ev.target); if (!m) return;
    const to = ev.relatedTarget; if (to instanceof Node && m.e.contains(to)) return;
    clearTimeout(timer); if (m.e === cur) hide();
  }, true);
  document.addEventListener('pointerdown', ev => {
    hide();
    if (ev.pointerType !== 'touch') return;
    const m = find(ev.target); if (!m) return;
    stash(m.e); schedule(m.e, m.t, LONG);   // planshet: uzoq bosish
  }, true);
  document.addEventListener('pointerup', ev => { if (ev.pointerType === 'touch' && !box) clearTimeout(timer); }, true);
  document.addEventListener('pointercancel', () => clearTimeout(timer), true);
  document.addEventListener('focusin', ev => {
    const m = find(ev.target); if (!m || !m.e.matches(':focus-visible')) return;
    stash(m.e); show(m.e, m.t);
  });
  document.addEventListener('focusout', () => hide());
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && box) hide(); }, true);
  window.addEventListener('scroll', () => hide(), true);
  window.addEventListener('resize', () => hide());
  onLang(hide);
  onPrices(() => { if (cur && box) { const m = find(cur); if (m) show(m.e, m.t); } });
}
