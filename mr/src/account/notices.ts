/** Sovgʻa xabari (16.11.2026): /me dagi koʻrilmagan sovgʻalar (server/src/notices.js) — kirganda bir marta, pastki oʻng burchakda karta.
 *  Hamma xizmatlarda: session.ts check() chaqiradi. Yopilganda serverga «koʻrildi». Animatsiya — faqat paydo boʻlishda. */
import { tr, tf } from '../i18n';
import { fmt } from '../ui/dom';

export interface Notice { id: number; coins: number; kind: string; at: string }

const CSS = `.gift-note{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:3100;width:min(340px,calc(100vw - 32px));
background:var(--sf,#fff);color:var(--ink,#1f1e1d);border:1px solid var(--line,rgba(0,0,0,.08));border-radius:18px;padding:16px 16px 14px;
box-shadow:var(--sh-pop,0 12px 32px rgba(0,0,0,.16));display:grid;grid-template-columns:40px 1fr;gap:4px 12px;font-size:13px;line-height:1.45;
animation:gift-in .45s cubic-bezier(.2,.8,.2,1) both}
.gift-note .gn-ic{grid-row:1/3;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft,#f3eee6);color:var(--accent,#b0742e)}
.gift-note b{font-size:15px;font-weight:600}
.gift-note p{margin:0;color:var(--mute,#6b6a68)}
.gift-note .gn-row{grid-column:2;display:flex;gap:8px;margin-top:8px}
.gift-note button{height:32px;padding:0 14px;border-radius:999px;border:0;font:inherit;font-weight:600;cursor:pointer;background:var(--ink,#1f1e1d);color:var(--sf,#fff)}
[data-theme=dark] .gift-note{background:#232220;color:#f2f1ee;border-color:rgba(255,255,255,.08)}
[data-theme=dark] .gift-note p{color:#a9a7a2}
[data-theme=dark] .gift-note .gn-ic{background:rgba(232,176,110,.14);color:#e8b06e}
[data-theme=dark] .gift-note button{background:#f2f1ee;color:#1f1e1d}
@keyframes gift-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.gift-note{animation:none}}`;

const GIFT_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';

let shown = false;

/** Karta matni: bir nechta sovgʻa boʻlsa — jami tanga, matn birinchisining turiga koʻra */
export function noticeText(list: Notice[]): { title: string; body: string } {
  const sum = list.reduce((a, n) => a + n.coins, 0);
  const title = tf('Sizga ${n} tanga sovgʻa!', { n: fmt(sum) });
  const body = list[0]?.kind === 'signup'
    ? tr('Archemistry Labdan foydalanganingiz uchun rahmat. Tangalarni toza fayl, DXF yoki quyosh hisobi uchun ishlating.')
    : tr('Archemistry Lab jamoasidan — sinab koʻrishingiz uchun. Tangalar balansingizga qoʻshildi.');
  return { title, body };
}

export function showNotices(list: Notice[], seen: (upTo: number) => Promise<unknown>): void {
  if (shown || !list.length || typeof document === 'undefined') return;
  shown = true;
  if (!document.getElementById('giftNoteCss')) { const st = document.createElement('style'); st.id = 'giftNoteCss'; st.textContent = CSS; document.head.appendChild(st); }
  const { title, body } = noticeText(list);
  const el = document.createElement('div');
  el.className = 'gift-note'; el.id = 'giftNote'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="gn-ic">${GIFT_SVG}</div>`;
  const b = document.createElement('b'); b.textContent = title;
  const p = document.createElement('p'); p.textContent = body;
  const row = document.createElement('div'); row.className = 'gn-row';
  const ok = document.createElement('button'); ok.type = 'button'; ok.id = 'giftNoteOk'; ok.textContent = tr('Rahmat');
  row.appendChild(ok); el.append(b, p, row);
  const upTo = Math.max(...list.map(n => n.id));
  ok.addEventListener('click', () => { el.remove(); void seen(upTo).catch(() => { /* keyingi kirishda yana chiqadi */ }); });
  document.body.appendChild(el);
}
