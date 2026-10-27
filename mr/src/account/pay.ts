/**
 * Pullik qism (27.10.2026, egasining qarori):
 *  1) Toza yuklash — har bir fayl uchun «Belgi bilan — bepul» yoki «Toza — N tanga».
 *     DXF, IFC, GLB/OBJ, Excel, PPTX — faqat toza (tanga bilan). Narx serverda (/quote, /export/ticket — server/src/prices.js).
 *     Shu holatni (fayl mazmuni xeshi) qayta yuklash — bepul (server «repeat»).
 *  2) Haftalik sinovlar — ogʻir hisoblar (shamol, xonadonlar): haftasiga 3 tasi bepul, keyin tanga (/trial).
 *  3) Mening tangalarim — balans va sarf tarixi (/me/history).
 * Egasi (akkaunt yoki «?egasi=» havolasi) — cheklovsiz.
 */
import './account.css';
import { h, svgIcon, IC, fmt, toast } from '../ui/dom';
import { tr, tf } from '../i18n';
import { isOwner, setExportGate, exportArea, type ExportMode } from '../core/wm';
import { ensureLogin } from './gate';
import { check, current, ApiError, quote, exportTicket, useTrial, history, type HistItem } from './session';
import { buyDialog } from './buy';
import { authRequired } from './config';

/** Faqat toza (belgili bepul varianti yoʻq) fayl turlari */
const PAID_ONLY = /\.(dxf|ifc|glb|gltf|obj|xlsx|xls|csv|pptx)$/i;
/** Bepul — belgisiz ham (loyiha fayli, maʼlumot) */
const ALWAYS_FREE = /\.(json)$/i;

type Svc = 'mr' | 'ks' | 'joy' | 'chz' | 'ren' | 'tr';
function service(): Svc {
  const p = location.pathname;
  if (/kochasoz/.test(p)) return 'ks';
  if (/joyshunos/.test(p)) return 'joy';
  if (/render/.test(p)) return 'ren';
  if (/transport/.test(p)) return 'tr';
  if (/chizmadon/.test(location.hash)) return 'chz';
  return 'mr';
}

/** Fayl nomi va xizmat boʻyicha narx roʻyxatidagi id (aniq id chaqiruvchi bersa — oʻsha) */
export function itemFor(name: string, item?: string): string {
  if (item) return item;
  const ext = (name.split('.').pop() || '').toLowerCase(), s = service();
  if (s === 'ks') return ext === 'dxf' ? 'ks.dxf' : ext === 'pdf' ? 'ks.a3' : 'ks.section';
  if (s === 'joy') return ext === 'pdf' ? 'joy.passport' : 'joy.axo';
  if (s === 'chz') return ext === 'pptx' || ext === 'pdf' ? 'chz.album' : 'mr.sheet';
  if (/_q\d+\.svg$|_qavatlar\.svg$|_rejalar_/.test(name)) return 'mr.floors';
  switch (ext) {
    case 'dxf': return 'mr.dxf';
    case 'ifc': return 'mr.ifc';
    case 'glb': case 'gltf': case 'obj': return 'mr.glb';
    case 'xlsx': case 'xls': case 'csv': return 'mr.tik';
    case 'png': case 'jpg': case 'jpeg': return /\d+dpi/.test(name) ? 'mr.sheet' : 'mr.png';
    case 'pptx': return 'chz.album';
    case 'pdf': return 'mr.album';
    default: return 'mr.sheet';
  }
}

async function sha(sample: string | Blob, salt: string): Promise<string> {
  const buf = typeof sample === 'string' ? new TextEncoder().encode(sample) : new Uint8Array(await sample.arrayBuffer());
  const s = new TextEncoder().encode(salt + '|'), all = new Uint8Array(s.length + buf.length); all.set(s); all.set(buf, s.length);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', all))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

/* ---------- umumiy oyna ---------- */
function dialog(id: string, title: string, lead: string): { wrap: HTMLElement; box: HTMLElement; msg: HTMLElement; close: () => void; done: Promise<void> } {
  document.getElementById(id)?.remove();
  let fin!: () => void; const done = new Promise<void>(r => { fin = r; });
  const close = () => { wrap.remove(); removeEventListener('keydown', onKey, true); fin(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const msg = h('div', { class: 'kd-msg', role: 'alert', hidden: true });
  const box = h('div', { class: 'kd-box' },
    h('button', { class: 'ib sm kd-x', type: 'button', 'aria-label': tr('Yopish'), title: tr('Yopish'), onclick: close }, svgIcon(IC.x)),
    h('h2', { id: id + 'T' }, title), lead ? h('p', { class: 'kd-lead' }, lead) : '');
  const wrap = h('div', { class: 'kd', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + 'T', id, onclick: (e: Event) => { if (e.target === wrap) close(); } }, box);
  document.body.append(wrap); addEventListener('keydown', onKey, true);
  return { wrap, box, msg, close, done };
}
const opt = (id: string, cls: string, title: string, sub: string, price: string, onclick: () => void) =>
  h('button', { class: 'kd-opt ' + cls, type: 'button', id, onclick }, h('b', {}, title), h('span', { class: 'sub' }, sub), h('span', { class: 'pr' }, price)) as HTMLButtonElement;

function balRow(): HTMLElement {
  const m = current();
  return h('div', { class: 'kd-bal' }, m ? tf('Balans: ${b} tanga', { b: fmt(m.balance) }) : tr('Toza fayl uchun hisobga kirasiz'), h('span', { class: 'sp' }),
    h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => { document.querySelectorAll('.kd').forEach(e => e.remove()); void buyDialog(); } }, tr('Tanga olish')));
}

/** «Tanga yetmaydi» — oynada xabar va sotib olish tugmasi */
function short(msg: HTMLElement, e: ApiError, need: number): void {
  const d = e.details;
  msg.hidden = false;
  msg.replaceChildren(tf('Tanga yetmaydi: kerak ${n}, balansda ${b}.', { n: fmt(d?.need ?? need), b: fmt(d?.balance ?? current()?.balance ?? 0) }), ' ',
    h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { document.querySelectorAll('.kd').forEach(x => x.remove()); void buyDialog(); } }, tr('Tanga olish')));
}

/* ---------- 1) toza yuklash ---------- */
async function gate(o: { name: string; item?: string; sample: string | Blob }): Promise<ExportMode | null> {
  if (isOwner() || ALWAYS_FREE.test(o.name) && !/\.geojson$/i.test(o.name)) return 'clean';
  if (!authRequired()) return 'wm';   // hisob oʻchirilgan (mahalliy sinov) — avvalgidek: belgili bepul fayl
  const item = itemFor(o.name, o.item), paidOnly = PAID_ONLY.test(o.name), area = exportArea();
  let price: number | null = null;
  try { price = (await quote([item], area)).coins; } catch { /* oflayn — narxsiz koʻrsatamiz */ }
  await check();   // balans qatori uchun (kirmagan — null)
  return new Promise<ExportMode | null>(resolve => {
    let res: ExportMode | null = null, busy = false;
    const ext = (o.name.split('.').pop() || '').toUpperCase();
    const D = dialog('kdExport', tr('Faylni yuklash'), paidOnly
      ? tf('${e} — faqat toza fayl: tanga bilan. Bir xil holatni qayta yuklash — bepul.', { e: ext })
      : tr('Belgili fayl koʻrib chiqish uchun yetadi. Topshirish uchun — toza fayl.'));
    const pr = price == null ? '…' : tf('${n} tanga', { n: fmt(price) });
    const paid = opt('kdClean', 'pri', tr('Toza fayl'), tr('belgisiz · shu holatni qayta yuklash bepul'), pr, () => void buy());
    const opts = h('div', { class: 'kd-opts' },
      paidOnly ? '' : opt('kdWm', '', tr('Belgi bilan'), tr('«ARCHEMISTRY · BEPUL» setkasi'), tr('bepul'), () => { res = 'wm'; D.close(); }),
      paid);
    D.box.append(h('p', { class: 't-small mono', style: 'margin:0;color:var(--muted)' }, o.name), opts, balRow(), D.msg);
    void D.done.then(() => resolve(res));
    (paidOnly ? paid : opts.firstElementChild as HTMLElement | null)?.focus();
    async function buy(): Promise<void> {
      if (busy) return; busy = true; paid.disabled = true; D.msg.hidden = true;
      try {
        D.wrap.hidden = true;
        const ok = await ensureLogin(undefined, 'Toza fayl uchun kiring. Hisob bepul.');
        D.wrap.hidden = false;
        if (!ok) { busy = false; paid.disabled = false; return; }
        const t = await exportTicket([item], area, await sha(o.sample, item + '|' + o.name));
        await check(true);
        toast(t.charged ? tf('${n} tanga yechildi. Balans: ${b}', { n: fmt(t.charged), b: fmt(t.balance) }) : tr('Bu holat avval toʻlangan — qayta yuklash bepul'));
        res = 'clean'; D.close();
      } catch (e) {
        D.wrap.hidden = false;
        if (e instanceof ApiError && e.status === 402) short(D.msg, e, price ?? 0);
        else { D.msg.hidden = false; D.msg.textContent = tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring'); }
        busy = false; paid.disabled = false;
      }
    }
  });
}

/* ---------- 2) haftalik sinovlar ---------- */
const TRIAL_NAME: Record<string, string> = { wind: 'Shamol oqimi', flats: 'Xonadonlar hisobi', area: 'Yangi hudud' };
const TRIAL_COINS: Record<string, number> = { wind: 2, flats: 2, area: 1 };
/**
 * Ogʻir hisobdan oldin chaqiriladi. true — davom etish mumkin (sinov yoki tanga yechildi).
 * Sinovlar tugagan boʻlsa — avval tasdiq soʻraladi (tanga jimgina yechilmaydi).
 */
export async function useHeavy(kind: 'wind' | 'flats' | 'area', ref?: string): Promise<boolean> {
  if (isOwner() || !authRequired()) return true;
  if (!await ensureLogin(undefined, 'Bu hisob uchun kiring. Hisob bepul — haftasiga 3 ta sinov.')) return false;
  const me = current() ?? await check();
  if (!me) return false;
  const run = async (): Promise<boolean> => {
    const r = await useTrial(kind, ref);
    void check(true);
    if (r.free) toast(r.left ? tf('Bepul sinov: bu haftada yana ${n} ta qoldi', { n: r.left }) : tr('Bu haftaning oxirgi bepul sinovi'));
    else toast(tf('${n} tanga yechildi. Balans: ${b}', { n: fmt(r.charged), b: fmt(r.balance) }));
    return true;
  };
  if (me.trialsLeft > 0) { try { return await run(); } catch (e) { toast(tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring')); return false; } }
  return new Promise<boolean>(resolve => {
    let ok = false, busy = false;
    const D = dialog('kdTrial', tr('Bu haftaning sinovlari tugadi'), tr('Haftasiga 3 ta ogʻir hisob bepul: shamol, xonadonlar, yangi hudud. Dushanba kuni yangilanadi.'));
    const go = opt('kdTrialGo', 'pri', tr(TRIAL_NAME[kind]), tr('hozir hisoblash'), tf('${n} tanga', { n: TRIAL_COINS[kind] }), async () => {
      if (busy) return; busy = true; go.disabled = true; D.msg.hidden = true;
      try { ok = await run(); D.close(); } catch (e) {
        if (e instanceof ApiError && e.status === 402) short(D.msg, e, TRIAL_COINS[kind]);
        else { D.msg.hidden = false; D.msg.textContent = tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring'); }
        busy = false; go.disabled = false;
      }
    });
    D.box.append(h('div', { class: 'kd-opts' }, go), balRow(), D.msg);
    void D.done.then(() => resolve(ok));
    go.focus();
  });
}

/* ---------- 3) mening tangalarim ---------- */
const REASON: Record<string, string> = { export: 'Toza fayl', trial: 'Ogʻir hisob', payment: 'Sotib olindi', pay: 'Sotib olindi', topup: 'Sotib olindi', gift: 'Sovgʻa', bonus: 'Sovgʻa', refund: 'Qaytarildi', admin: 'Tuzatish' };
const ITEM_NAME: Record<string, string> = {
  'mr.album': 'Albom PDF', 'mr.dxf': 'DXF — reja', 'mr.dxf3d': 'DXF — 3D', 'mr.glb': 'GLB / OBJ', 'mr.tik': 'TIK — Excel', 'mr.norm': 'Meʼyoriy hisobot', 'mr.ifc': 'IFC4',
  'mr.sheet': 'Varaq', 'mr.axo': 'Aksonometriya', 'mr.floors': 'Qavat rejalari', 'mr.png': 'PNG', 'chz.album': 'Chizmadon albomi', 'ks.section': 'Koʻcha kesimi', 'ks.a3': 'Koʻchasoz A3',
  'ks.dxf': 'Koʻchasoz DXF', 'joy.passport': 'Joy pasporti', 'joy.axo': 'Joyshunos aksonometriya', wind: 'Shamol oqimi', flats: 'Xonadonlar hisobi', area: 'Yangi hudud',
};
function label(x: HistItem): [string, string] {
  const what = String(x.ref ?? '').split('@')[0], parts = what.split('+').map(s => tr(ITEM_NAME[s] ?? '')).filter(Boolean);
  return [tr(REASON[x.reason] ?? x.reason), parts.join(' + ')];
}
export async function coinsDialog(): Promise<void> {
  if (!await ensureLogin(undefined, 'Tangalaringizni koʻrish uchun kiring.')) return;
  const me = await check(true);
  const D = dialog('kdCoins', tr('Mening tangalarim'), '');
  const list = h('div', { class: 'kd-hist', role: 'list', 'aria-label': tr('Tarix') }, h('div', { class: 'row' }, h('span', { class: 'sub' }, tr('Yuklanmoqda…'))));
  D.box.append(
    h('div', { class: 'kd-big' }, h('b', { class: 'mono' }, fmt(me?.balance ?? 0)), h('span', {}, tr('tanga · muddati tugamaydi'))),
    h('div', { class: 'kd-bal' }, tf('Bu haftaning bepul sinovlari: ${n} / 3', { n: me?.trialsLeft ?? 0 })),
    h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: () => { D.close(); void buyDialog(); } }, tr('Tanga olish')),
    h('div', { class: 'glabel' }, h('span', {}, tr('Tarix'))), list, D.msg);
  try {
    const items = await history();
    list.replaceChildren(...(items.length ? items.map(x => {
      const [k, sub] = label(x), d = Number(x.delta);
      return h('div', { class: 'row', role: 'listitem' }, h('span', {}, k), h('span', { class: 'sub' }, [sub, new Date(x.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })].filter(Boolean).join(' · ')),
        h('span', { class: 'd' + (d > 0 ? ' plus' : '') }, (d > 0 ? '+' : '−') + fmt(Math.abs(d))));
    }) : [h('div', { class: 'row' }, h('span', { class: 'sub' }, tr('Hali hech narsa yoʻq.')))]));
  } catch (e) { list.replaceChildren(h('div', { class: 'row' }, h('span', { class: 'sub' }, tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring')))); }
}

/** Har xizmat kirish nuqtasida bir marta: yuklash darvozasini ulaydi */
export function initPay(): void { setExportGate(gate); }
initPay();

/* ---------- 4) Master reja: bepul uchastka ≤ 3 ga (egasi qarori 27.10) ---------- */
export const FREE_SITE_HA = 3;
/** Maydon koeffitsiyenti pogʻonasi — server/src/prices.js areaK bilan bir xil (≤ 15 → 1, ≤ 60 → 1,5, katta → 2) */
const bracket = (ha: number): number => ha <= 15 ? 1 : ha <= 60 ? 1.5 : 2;
const UNLOCK_KEY = 'kps_site_unlock';
function unlocked(pid: string): number { try { return Number((JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}') as Record<string, number>)[pid]) || 0; } catch { return 0; } }
function remember(pid: string, k: number): void { try { const m = JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}') as Record<string, number>; m[pid] = Math.max(m[pid] || 0, k); localStorage.setItem(UNLOCK_KEY, JSON.stringify(m)); } catch { /* */ } }
/** Darhol tekshiruv (sudrab tahrirlashda): ruxsat bormi */
export function siteOk(pid: string, ha: number): boolean {
  return isOwner() || !authRequired() || ha <= FREE_SITE_HA || unlocked(pid) >= bracket(ha);
}
/**
 * Uchastka chegarasi qoʻyilishidan oldin. 3 ga dan katta — «Loyihani ochish — N tanga» (shu loyiha va maydon pogʻonasi uchun bir marta;
 * boshqa kompyuterda qayta ochish — bepul, server «repeat»). false — chegara qoʻyilmaydi.
 */
export async function siteGate(pid: string, ha: number): Promise<boolean> {
  if (siteOk(pid, ha)) return true;
  const k = bracket(ha);
  let price: number | null = null;
  try { price = (await quote(['mr.site'], ha)).coins; } catch { /* */ }
  await check();
  return new Promise<boolean>(resolve => {
    let ok = false, busy = false;
    const D = dialog('kdSite', tf('Uchastka ${a} ga', { a: fmt(ha, 2) }), tf('Bepul tarifda master reja uchastkasi — ${f} ga gacha. Kattaroq hududni ochish — shu loyiha uchun bir marta toʻlanadi.', { f: FREE_SITE_HA }));
    const go = opt('kdSiteGo', 'pri', tr('Loyihani ochish'), k > 1 ? tf('maydon koeffitsiyenti ×${k}', { k: String(k).replace('.', ',') }) : tr('generatsiya, tekshiruv va barcha qadamlar'), price == null ? '…' : tf('${n} tanga', { n: fmt(price) }), async () => {
      if (busy) return; busy = true; go.disabled = true; D.msg.hidden = true;
      try {
        D.wrap.hidden = true;
        const inOk = await ensureLogin(undefined, 'Katta uchastka uchun kiring. Hisob bepul.');
        D.wrap.hidden = false;
        if (!inOk) { busy = false; go.disabled = false; return; }
        const t = await exportTicket(['mr.site'], ha, await sha(pid, 'site|k' + k));
        remember(pid, k); await check(true); ok = true;
        toast(t.charged ? tf('${n} tanga yechildi. Balans: ${b}', { n: fmt(t.charged), b: fmt(t.balance) }) : tr('Bu loyiha avval ochilgan — bepul'));
        D.close();
      } catch (e) {
        D.wrap.hidden = false;
        if (e instanceof ApiError && e.status === 402) short(D.msg, e, price ?? 0);
        else { D.msg.hidden = false; D.msg.textContent = tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring'); }
        busy = false; go.disabled = false;
      }
    });
    D.box.append(h('div', { class: 'kd-opts' }, go), balRow(), D.msg);
    void D.done.then(() => resolve(ok));
    go.focus();
  });
}
