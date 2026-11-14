/**
 * 4-bosqich (14.11.2026): xizmatning jonli fon naqshi va sarlavha ostidagi yonuvchi chiziq.
 * Kanvas «Oʻtish: boʻlim → loyihalar»: Joyshunos — gorizontallar oqadi; Koʻchasoz — strelkalar bittalab chiqib buriladi;
 * Dizayn-kod — naqsh elementlari aylanadi; Chizmadon — rejalar chiziladi; Render — quyosh nurlari oʻtadi; Binokor — qavatlar koʻtariladi.
 * Naqsh sahifa foni ustida, panellar ostida (z-index 0, bosilmaydi); «harakatni kamaytirish»da — harakatsiz.
 * SVG lar kerak boʻlganda yuklanadi (har xizmat oʻzinikini).
 */
import './naqsh/naqsh.css';

export type NaqshId = 'joy' | 'ks' | 'dk' | 'chz' | 'ren' | 'bin';
/** naqsh rangi (r,g,b) va shaffofligi (kunduz, tun) — kanvasdagi bilan bir xil */
export const NAQSH: Record<NaqshId, { acc: string; op: [number, number] }> = {
  joy: { acc: '240,138,93', op: [.55, .6] },
  ks: { acc: '76,91,212', op: [.5, .45] },
  dk: { acc: '20,154,166', op: [.35, .4] },
  chz: { acc: '139,74,156', op: [.8, .5] },
  ren: { acc: '255,197,61', op: [.3, .45] },
  bin: { acc: '255,111,156', op: [.45, .55] },
};
export const SRC: Record<NaqshId, () => Promise<{ default: string }>> = {
  joy: () => import('./naqsh/joy.svg?raw'),
  ks: () => import('./naqsh/ks.svg?raw'),
  dk: () => import('./naqsh/dk.svg?raw'),
  chz: () => import('./naqsh/chz.svg?raw'),
  ren: () => import('./naqsh/ren.svg?raw'),
  bin: () => import('./naqsh/bin.svg?raw'),
};

/** Xizmat naqshini qoʻyadi: host — sahifa (body, fon ostida) yoki blok (sahna: blok foni ustida, mazmuni ostida). Qaytaradi — olib tashlash funksiyasi. */
export function svcBackdrop(id: NaqshId, host: HTMLElement = document.body): () => void {
  const n = NAQSH[id];
  document.documentElement.style.setProperty('--acc', n.acc);
  const el = document.createElement('div');
  el.className = 'nq'; el.setAttribute('aria-hidden', 'true'); el.dataset.naqsh = id;
  el.style.setProperty('--nq-op', String(n.op[0])); el.style.setProperty('--nq-op-d', String(n.op[1]));
  if (host !== document.body) { host.classList.add('nq-host'); if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; }
  host.prepend(el);
  // blok mazmuni qayta chizilsa (replaceChildren) — naqsh joyiga qaytadi
  const mo = host === document.body ? null : new MutationObserver(() => { if (el.parentNode !== host) host.prepend(el); });
  mo?.observe(host, { childList: true });
  let dead = false;
  // 14.11 (egasi): animatsiya faqat kirganda — 3 s dan keyin toʻxtaydi, ishga xalaqit bermaydi
  setTimeout(() => el.classList.add('still'), 3200);
  void SRC[id]().then(m => { if (!dead) el.innerHTML = m.default; }).catch(() => { /* naqshsiz ham ishlaydi */ });
  return () => { dead = true; mo?.disconnect(); el.remove(); };
}

/** Sarlavha ostidagi xizmat rangidagi chiziq (::after — sarlavha qayta chizilsa ham qoladi) */
export function svcGlow(header: HTMLElement): void {
  if (getComputedStyle(header).position === 'static') header.style.position = 'relative';
  header.classList.add('svc-glow');
}
