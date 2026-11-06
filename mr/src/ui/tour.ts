/**
 * Yoʻlboshlovchi tur (06.11.2026, tanishtiruv — B qism): muharrirga birinchi kirishda interfeys xiralashadi,
 * kerakli joy yoritiladi (yumshoq puls), yonida kartochka: sarlavha, tushuntirish, «Batafsil», qisqa animatsiya.
 * «Oʻtkazib yuborish», klaviatura (← → Esc), yuqori paneldagi «?» tugmasi bilan qayta ochiladi.
 * Muharrir kodiga tegmaydi: elementlar id / data-* boʻyicha topiladi; topilmasa kartochka markazda chiqadi.
 * Matnlar 10 tilda — ./tour.json (kalit — oʻzbekcha, qiymat — [en, ru, es, pt, fr, az, uk, tr, kk]).
 */
import './tour.css';
import TX from './tour.json';
import { getLang, onLang } from '../i18n';
import { ANIM } from './tipanim';
import { trSvg } from '../i18n';

interface Step { sel?: string; t: string; b: string; more?: string; a?: string; open1?: boolean }

const STEPS: Step[] = [
  { t: 'Master reja — kvartaldan mikrorayongacha', b: 'Bu yerda joyni tanlab, koʻchalar, dahalar va binolarni loyihalaysiz. Dastur har oʻzgarishda TEP va Oʻzbekiston meʼyorlarini (ShNQ, QMQ, SanQvaN) tekshirib boradi. Tanishtiruv 2 daqiqa oladi.' },
  { sel: 'nav.rail', a: '1B', t: 'Ish 11 qadamdan iborat', b: 'Chap ustundagi raqamlar — loyiha qadamlari: Joy (1–2), Reja (3–6), Detal (7–10), Natija (11). Yuqoridan pastga yurasiz, istalgan qadamga qaytish mumkin.', more: 'Kulrang qadamlar uchastka chizilguncha yopiq — bu xato emas. Faol qadamni yana bossangiz yoki Tab tugmasini bossangiz panel yigʻiladi va xarita kengayadi.' },
  { sel: '#q', open1: true, t: 'Joyni toping', b: 'Manzil, mahalla nomi yoki koordinatani yozing — xarita oʻsha joyga uchadi. Yoki xaritani sichqoncha bilan suring, gʻildirak bilan yaqinlashtiring.', more: 'Juda uzoqlashsangiz dunyo xaritasi ochiladi. Loyiha markazini keyin ham oʻng tugma → «Loyiha markazini shu yerga koʻchirish» bilan oʻzgartirasiz.' },
  { sel: '#ctxLoad', open1: true, a: '3A', t: 'Atrofni yuklang', b: 'Mavjud binolar, yoʻllar, suv, relyef va sunʼiy yoʻldosh surati yuklanadi. Bepul. Ekran markazi atrofida yuklanadi — shuning uchun avval joyni toping.', more: 'Radius 300 m dan 4 km gacha. Atrof yuklangach kirish yoʻllari, xizmatlar va cheklovlar avtomatik hisoblanadi.' },
  { sel: '#drawSite', open1: true, a: '4B', t: 'Uchastka chegarasini chizing', b: 'Uch usul: sahnada chizish (burchaklarni bosing, Enter — tugatish), dahani bir bosishda aniqlash yoki eni × boʻyi bilan toʻrtburchak. Tayyor chegara boʻlsa — KML/KMZ, GeoJSON yoki DXF fayldan.', more: 'Chizilgach dastur cheklovlarni (qabriston, ELU, suv, sanoat SMZ) topadi va yaroqli maydonni hisoblaydi. Burchaklarni keyin sudrab tahrirlaysiz. Chizish bepul.' },
  { sel: '.tb', a: '19', t: 'Asboblar va oʻng tugma', b: 'Tanlash (V), Qoʻl (H), Chizgʻich (M), Kesim (S), Uslub nusxasi (I), Bekor qilish va Qaytarish (Ctrl+Z / Ctrl+Shift+Z).', more: 'Koʻp amallar oʻng tugma menyusida: qavat qoʻshish, nusxa, oʻchirish, dahani izolyatsiya qilish. Chizish paytida koʻrinish avtomatik «Reja»ga oʻtadi.' },
  { sel: '.seg:has([data-view])', a: '27', t: 'Koʻrinish va saqlash', b: 'Reja, Aksonometriya, Perspektiva — kamera turi. Loyiha avtomatik saqlanadi, lekin faqat shu brauzerda — zaxira uchun 11-qadamda «Loyiha fayli (JSON)».', more: 'Sodda / Toʻliq — ogʻir sahnada tezlik uchun. Kamera — koʻz sathi va saqlangan koʻrinishlar. Taqdimot — varaqlar va albom. Yuqoridagi «?» shu tanishtiruvni qayta ochadi.' },
  { sel: '.kpibar', a: '20', t: 'Koʻrsatkichlar va meʼyorlar', b: 'Har oʻzgarishda yangilanadi: uchastka, umumiy maydon, UMN, aholi. «Meʼyorlar»: ✓ — hammasi mos, raqam — mos kelmaganlar soni.', more: 'Bosilsa roʻyxat ochiladi: band, qiymat, chegara, natija. «Qayerda» muammoni sahnada koʻrsatadi, ayrim qatorlarda «Tuzatish» tugmasi bor.' },
  { sel: 'nav.rail', a: '13A', t: 'Loyiha qanday quriladi', b: '1) Koʻchalar (2): «Toʻr» → «Toʻrni qoʻllash» — koʻchalar uchastkani dahalarga boʻladi. 2) Dahalar (3): dahani bosing va funksiyani tanlang. 3) Hajmlar (5): dahani tanlab «Variant taklif qil». 4) Tekshiruv (10) va eksport (11).', more: '4, 6, 7, 8, 9-qadamlar — chuqurlashtirish uchun, tartib majburiy emas. 5-qadamda bino tanlansa panel inspektorga aylanadi: qaytish — «← 5-qadam» yoki Esc.' },
  { sel: '#acctIn, #acctPop', t: 'Asosiy ish — bepul', b: 'Loyihalash, chizish va tekshirish uchun hech narsa toʻlamaysiz. Tanga faqat ogʻir hisoblar (haftada 1 tasi sovgʻa) va toza fayllar (DXF, IFC, 3D, Excel) uchun kerak.', more: 'Hech narsa soʻramasdan yechilmaydi: narx tugma izohida oldindan koʻrinadi va har safar tasdiqlaysiz. Bitta loyiha uchun yuqori chegara bor. 1-qadam kirishsiz; davom etish uchun pochta orqali kiring — 6 xonali kod keladi.' },
];

const KEY = 'mr-tour-v1';
const ORDER = ['en', 'ru', 'es', 'pt', 'fr', 'az', 'uk', 'tr', 'kk'];
const T = TX as unknown as Record<string, string[]>;
export function tourText(uz: string, vals: Record<string, string | number> = {}): string {
  const l = getLang(), v = T[uz];
  let s = l === 'uz' || !v ? uz : v[ORDER.indexOf(l)] || v[0] || uz;
  for (const [k, x] of Object.entries(vals)) s = s.replace('${' + k + '}', String(x));
  return s;
}
const seen = (): boolean => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
const markSeen = (): void => { try { localStorage.setItem(KEY, '1'); } catch { /* xususiy oyna */ } };

let i = 0, root: HTMLElement | null = null, prevFocus: Element | null = null;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

/** 1-qadam paneli ochiq boʻlishi kerak (qidiruv, atrof, chegara) */
function openStep1(): void {
  const b = document.querySelector<HTMLElement>('.rb[data-step="uchastka"]'); if (!b) return;
  if (!(b.getAttribute('aria-current') === 'step' && b.getAttribute('aria-expanded') === 'true')) b.click();
}
function target(s: Step): HTMLElement | null {
  if (!s.sel) return null;
  for (const one of s.sel.split(',')) { const e = document.querySelector<HTMLElement>(one.trim()); if (e && e.getClientRects().length) return e; }
  return null;
}

function render(): void {
  if (!root) return;
  const s = STEPS[i], last = i === STEPS.length - 1;
  if (s.open1) openStep1();
  root.replaceChildren();
  const t = target(s), pad = 6;
  const spot = el('div', 'tour-spot');
  if (t) {
    t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = t.getBoundingClientRect();
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  } else spot.classList.add('none');
  root.append(spot);

  const c = el('section', 'tour-card'); c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'tourT');
  const head = el('div', 'tour-head');
  head.append(el('span', 'tour-n', tourText('Tanishtiruv · ${i} / ${n}', { i: i + 1, n: STEPS.length })));
  const dots = el('span', 'tour-dots'); STEPS.forEach((_, k) => dots.append(el('i', k === i ? 'on' : k < i ? 'was' : ''))); head.append(dots);
  const h = el('h2', '', tourText(s.t)); h.id = 'tourT';
  c.append(head, h, el('p', 'tour-b', tourText(s.b)));
  if (s.a && ANIM[s.a]) { const a = el('div', 'tour-anim'); a.setAttribute('aria-hidden', 'true'); a.innerHTML = `<svg viewBox="0 0 260 84" width="100%" height="100%">${s.a === "27" ? ANIM[s.a] : trSvg(ANIM[s.a])}</svg>`; c.append(a); }
  if (s.more) { const d = el('details', 'tour-more'); d.append(el('summary', '', tourText('Batafsil')), el('p', '', tourText(s.more))); c.append(d); }
  const foot = el('div', 'tour-foot');
  const skip = el('button', 'tour-skip', tourText('Oʻtkazib yuborish')); skip.type = 'button'; skip.onclick = () => close();
  const sp = el('span', 'tour-sp');
  if (!last) foot.append(skip);
  foot.append(sp);
  if (i > 0) { const back = el('button', 'tour-back', tourText('Orqaga')); back.type = 'button'; back.onclick = () => go(i - 1); foot.append(back); }
  const next = el('button', 'tour-next', tourText(i === 0 ? 'Boshlash' : last ? 'Tugatish' : 'Keyingi')); next.type = 'button'; next.onclick = () => (last ? close() : go(i + 1));
  foot.append(next); c.append(foot);
  root.append(c);
  place(c, t);
  next.focus({ preventScroll: true });
}

function place(c: HTMLElement, t: HTMLElement | null): void {
  const W = window.innerWidth, H = window.innerHeight, cw = c.offsetWidth, ch = c.offsetHeight, g = 16;
  let x = (W - cw) / 2, y = (H - ch) / 2, side = 'center';
  if (t) {
    const r = t.getBoundingClientRect();
    if (r.right + g + cw < W - 8) { side = 'right'; x = r.right + g; y = r.top + r.height / 2 - ch / 2; }
    else if (r.left - g - cw > 8) { side = 'left'; x = r.left - g - cw; y = r.top + r.height / 2 - ch / 2; }
    else if (r.top - g - ch > 8) { side = 'top'; x = r.left + r.width / 2 - cw / 2; y = r.top - g - ch; }
    else { side = 'bottom'; x = r.left + r.width / 2 - cw / 2; y = r.bottom + g; }
  }
  c.dataset.side = side;
  c.style.left = `${Math.round(Math.max(8, Math.min(W - cw - 8, x)))}px`;
  c.style.top = `${Math.round(Math.max(8, Math.min(H - ch - 8, y)))}px`;
}

function go(n: number): void { i = Math.max(0, Math.min(STEPS.length - 1, n)); render(); }
function onKey(e: KeyboardEvent): void {
  if (!root) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); if (i < STEPS.length - 1) go(i + 1); else close(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(i - 1); }
  else if (e.key === 'Tab') {   // fokus kartochka ichida qoladi
    const f = [...root.querySelectorAll<HTMLElement>('button, summary')]; if (!f.length) return;
    const k = f.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); }
    e.stopImmediatePropagation();
  }
}
const onResize = (): void => { if (root) render(); };

/** Turni boshlash (yuqoridagi «?» yoki birinchi kirish) */
export function startTour(from = 0): void {
  if (root) close(false);
  prevFocus = document.activeElement;
  root = el('div', 'tour-root'); root.dataset.notr = '';
  document.body.append(root);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  go(from);
}
function close(mark = true): void {
  if (mark) markSeen();
  root?.remove(); root = null;
  window.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', onResize);
  if (prevFocus instanceof HTMLElement) prevFocus.focus({ preventScroll: true });
}

/** Yuqori panelda «?» tugmasi (muharrir qayta chizsa — qaytadan qoʻyiladi) */
function ensureBtn(): void {
  if (document.getElementById('tourBtn')) return;
  const pref = document.getElementById('prefPop'); if (!pref?.parentElement) return;
  const b = el('button', pref.className.replace('popbtn', '').trim() || 'btn', '?');
  b.id = 'tourBtn'; b.type = 'button';
  b.setAttribute('aria-label', tourText('Tanishtiruvni qayta ochish')); b.title = tourText('Tanishtiruvni qayta ochish');
  b.onclick = () => startTour(0);
  pref.parentElement.insertBefore(b, pref);
}

let inited = false;
export function initTour(): void {
  if (inited || typeof document === 'undefined') return; inited = true;
  window.setInterval(() => {
    if (!location.hash.startsWith('#/p/')) return;
    ensureBtn();
    // avtomatik testlarda (webdriver) oʻzi ochilmaydi
    if (!root && !seen() && !navigator.webdriver && document.querySelector('nav.rail .rb')) { markSeen(); window.setTimeout(() => startTour(0), 600); }
  }, 1200);
  onLang(() => { document.getElementById('tourBtn')?.remove(); if (root) render(); });
}
