/* Anonim foydalanish statistikasi (GoatCounter: cookie yoʻq, shaxsiy maʼlumot yoʻq).
   Maqsad — qaysi xizmat, qadam, eksport va hisob koʻp ishlatilishini bilish (tariflarni shunga qarab tuzish).
   Yuboriladi: faqat hodisa nomi, masalan «ev/mr/step/hajm» yoki «ev/export/mr/dxf». Loyiha, joy, matn — yuborilmaydi.
   Mahalliy kompyuterda, avtomatik testlarda va «Do Not Track» yoqilganda — hech narsa yuborilmaydi.
   12.11.2026: xuddi shu hodisalar oʻz serverimizga ham (POST /ev, egasi paneli — voronka, qaytish, eng koʻp bosilgan tugmalar).
   Brauzer belgisi — localStorage dagi tasodifiy anonim ID (cookie emas); kirgan boʻlsa server hisobni sessiyadan biladi.
   Qoʻshimcha: tugma bosilishi (id yoki izoh kaliti boʻyicha), ekran kengligi, sensorli ekran, kelgan sayt (faqat domen) va UTM belgilari. */

import { initOwner } from './wm';
import { apiBase } from '../account/config';

const CODE = 'archemistry';
type GC = { count: (o: { path: string; title?: string; event?: boolean }) => void };
const W = window as unknown as { goatcounter?: GC & { no_onload?: boolean } };

let queue: { path: string; title?: string; event?: boolean }[] | null = [];
const seen = new Set<string>();

function enabled(): boolean {
  if (typeof location === 'undefined' || navigator.webdriver) return false;
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === 'file:') return false;
  const n = navigator as Navigator & { doNotTrack?: string };
  return n.doNotTrack !== '1';
}

function flush(): void {
  if (!W.goatcounter?.count || !queue) return;
  const q = queue; queue = null;
  q.forEach((o) => W.goatcounter!.count(o));
}

function load(): void {
  if (!enabled() || document.querySelector('script[data-goatcounter]')) return;
  W.goatcounter = { ...(W.goatcounter || {}), no_onload: true } as never;  // sahifa koʻrishni oʻzimiz yuboramiz
  const s = document.createElement('script');
  s.async = true; s.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  s.src = 'https://gc.zgo.at/count.js';
  s.onload = flush;
  document.head.appendChild(s);
}

/* ---------- oʻz serverimiz: POST /ev (navigator.sendBeacon, text/plain JSON) ---------- */
type Ev = { n: string; p?: Record<string, string | number | boolean> };
let svc = '';
let out: Ev[] = [];
let timer = 0;
const clicks = new Map<string, number>();

/** Brauzerning anonim belgisi (cookie emas): bir marta yaratiladi, localStorage da turadi */
function anonId(): string {
  try {
    let a = localStorage.getItem('ax-anon');
    if (!a || !/^[A-Za-z0-9_-]{8,40}$/.test(a)) {
      const b = new Uint8Array(16); crypto.getRandomValues(b);
      a = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      localStorage.setItem('ax-anon', a);
    }
    return a;
  } catch { return 'nostorage'; }
}
const evName = (s: string) => s.toLowerCase().replace(/[^a-z0-9_./:-]+/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 80);

function send(): void {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!out.length || !svc) return;
  const e = out.splice(0, 50);
  const body = JSON.stringify({ a: anonId(), s: svc, e });
  try {
    const url = apiBase() + '/ev';
    if (!navigator.sendBeacon?.(url, body)) void fetch(url, { method: 'POST', body, credentials: 'include', keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => { /* */ });
  } catch { /* statistika — ish toʻxtamasin */ }
  if (out.length) send();
}
function push(e: Ev): void {
  if (!e.n) return;
  out.push(e);
  if (out.length >= 40) send();
  else if (!timer) timer = window.setTimeout(send, 15e3);
}

/** Hodisa: track('mr/step/hajm'). Bir sahifa ochilishida bir xil hodisa bir marta sanaladi (once=true). */
export function track(name: string, once = false): void {
  if (!enabled()) return;
  const path = 'ev/' + name.replace(/[^\w/.-]+/g, '-').slice(0, 80);
  if (once) { if (seen.has(path)) return; seen.add(path); }
  const o = { path, title: name, event: true };
  if (queue) queue.push(o); else W.goatcounter?.count(o);
  push({ n: evName(name) });
}

/** Sahifa ochilishi: koʻrinish, ekran kengligi, sensorli ekran, kelgan sayt (domen) va UTM — manba va qurilma hisobi uchun */
function pvProps(view: string): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = { w: Math.round(innerWidth), dpr: Math.round((devicePixelRatio || 1) * 100) / 100, touch: matchMedia?.('(pointer: coarse)').matches ?? false };
  if (view) p.v = view;
  try { const r = document.referrer ? new URL(document.referrer).hostname : ''; if (r && r !== location.hostname) p.ref = r.replace(/^www\./, ''); } catch { /* */ }
  const q = new URLSearchParams(location.search);
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) { const v = q.get(k); if (v) p[k.slice(4)] = v.slice(0, 60); }
  try { p.lang = (navigator.language || '').slice(0, 5); } catch { /* */ }
  return p;
}

/** Sahifa koʻrish (hash marshrutsiz — loyiha identifikatori yuborilmaydi) */
export function pageview(view: string): void {
  if (!enabled()) return;
  const o = { path: location.pathname.replace(/\/index\.html$/, '/') + (view ? '#' + view : ''), title: document.title };
  if (queue) queue.push(o); else W.goatcounter?.count(o);
  push({ n: 'pv', p: pvProps(view) });
}

/** Tugma bosilishi: id yoki izoh kaliti (data-tip) boʻyicha; bir tugma bir sahifa ochilishida koʻpi bilan 30 marta */
function onClick(e: MouseEvent): void {
  if (!e.isTrusted) return;
  const el = (e.target as Element | null)?.closest?.('button, a, [role="button"], [role="tab"], [data-tip]') as HTMLElement | null;
  if (!el || el.closest('[data-noev]')) return;
  const key = el.id || el.getAttribute('data-ev') || el.getAttribute('data-tip') || '';
  if (!key) return;
  const n = evName(`click/${svc}/${key}`);
  const k = (clicks.get(n) ?? 0) + 1; clicks.set(n, k);
  if (k <= 30) push({ n });
}

/** Har bir xizmat sahifasida bir marta chaqiriladi: skript yuklanadi, sahifa koʻrish va yuklab olishlar sanaladi */
export function initStats(service: string, view = ''): void {
  void initOwner();
  if (!enabled()) return;
  svc = service;
  document.addEventListener('click', onClick, true);
  addEventListener('pagehide', send);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
  load();
  pageview(view);
  // yuklab olishlar: <a download> bosilishi (dasturiy a.click() ham) — fayl turi boʻyicha
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.download) track(`export/${service}/${(this.download.split('.').pop() || 'fayl').toLowerCase()}`);
    return orig.call(this);
  };
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[download]') as HTMLAnchorElement | null;
    if (a && e.isTrusted) track(`export/${service}/${(a.download.split('.').pop() || 'fayl').toLowerCase()}`);
  }, true);
}
