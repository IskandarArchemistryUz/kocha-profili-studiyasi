/* Anonim foydalanish statistikasi (GoatCounter: cookie yoʻq, shaxsiy maʼlumot yoʻq).
   Maqsad — qaysi xizmat, qadam, eksport va hisob koʻp ishlatilishini bilish (tariflarni shunga qarab tuzish).
   Yuboriladi: faqat hodisa nomi, masalan «ev/mr/step/hajm» yoki «ev/export/mr/dxf». Loyiha, joy, matn — yuborilmaydi.
   Mahalliy kompyuterda, avtomatik testlarda va «Do Not Track» yoqilganda — hech narsa yuborilmaydi. */

import { initOwner } from './wm';

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

/** Hodisa: track('mr/step/hajm'). Bir sahifa ochilishida bir xil hodisa bir marta sanaladi (once=true). */
export function track(name: string, once = false): void {
  if (!enabled()) return;
  const path = 'ev/' + name.replace(/[^\w/.-]+/g, '-').slice(0, 80);
  if (once) { if (seen.has(path)) return; seen.add(path); }
  const o = { path, title: name, event: true };
  if (queue) queue.push(o); else W.goatcounter?.count(o);
}

/** Sahifa koʻrish (hash marshrutsiz — loyiha identifikatori yuborilmaydi) */
export function pageview(view: string): void {
  if (!enabled()) return;
  const o = { path: location.pathname.replace(/\/index\.html$/, '/') + (view ? '#' + view : ''), title: document.title };
  if (queue) queue.push(o); else W.goatcounter?.count(o);
}

/** Har bir xizmat sahifasida bir marta chaqiriladi: skript yuklanadi, sahifa koʻrish va yuklab olishlar sanaladi */
export function initStats(service: string, view = ''): void {
  void initOwner();
  if (!enabled()) return;
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
