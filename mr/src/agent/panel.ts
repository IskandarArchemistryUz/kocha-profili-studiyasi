/**
 * Maslahatchi paneli (Design kanvas «Lab agenti «Maslahatchi» — maket», 13.11): oʻngda yigʻiladigan panel,
 * tez tugmalar, savol, bajarilayotgan buyruqlar, javob. Faqat oʻqiydi — loyiha oʻzgarmaydi.
 * Pul: qisqa savol — haftalik bepul yoki 1 tanga; xulosa — 3 tanga (tasdiq bilan, «soʻramasdan» yoqilmagan boʻlsa).
 */
import './agent.css';
import { h, svgIcon, toast, fmt } from '../ui/dom';
import { tr, tf, getLang } from '../i18n';
import { ApiError, check, current } from '../account/session';
import { ensureLogin } from '../account/gate';
import { buyDialog } from '../account/buy';
import { autoPayOn, setAutoPayHere } from '../account/pay';
import { isOwner } from '../core/wm';
import { track } from '../core/stats';
import { agentApi, agentConfig, type AgentApi, type AgentCfg } from './api';
import { runAgent, type Tools } from './loop';

/** fill — savol matni maydonga qoʻyiladi (foydalanuvchi toʻldiradi), yuborilmaydi */
export interface Quick { id: string; label: string; scenario: string; prompt: string; hint?: string; fill?: boolean }
export interface PanelOpts {
  svc: string; tools: () => Tools; project: () => string | null; areaHa: () => number; quick: Quick[];
  api?: AgentApi; onClose?: () => void;
}

const TOOL_NAME: Record<string, string> = {
  project_summary: 'Loyiha xulosasi', get_tep: 'TEP koʻrsatkichlari', run_norm_check: 'Meʼyoriy tekshiruv natijalari', get_norm_clause: 'Meʼyor bandi',
  list_objects: 'Obyektlar roʻyxati', get_object: 'Obyekt parametrlari', get_constraints: 'Cheklovlar', highlight: 'Xaritada belgilash', price_estimate: 'Narx',
};
const CLOSE = '<path d="M6 6l12 12M18 6L6 18"/>', SEND = '<path d="M5 12h14M13 6l6 6-6 6"/>', CHEV = '<path d="M9 6l6 6-6 6"/>';

/** Javob matni: xavfsiz (innerHTML yoʻq) — xatboshi, roʻyxat, **qalin**, `kod` */
export function renderAnswer(text: string): HTMLElement {
  const box = h('div', { class: 'ag-ans' });
  const inline = (s: string): (Node | string)[] => s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map(p =>
    p.startsWith('**') && p.endsWith('**') ? h('b', {}, p.slice(2, -2)) : p.startsWith('`') && p.endsWith('`') ? h('span', { class: 'mono' }, p.slice(1, -1)) : p);
  for (const para of text.split(/\n{2,}/)) {
    const lines = para.split('\n').filter(l => l.trim());
    if (!lines.length) continue;
    if (lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
      const ol = lines.every(l => /^\s*\d+[.)]\s+/.test(l));
      box.append(h(ol ? 'ol' : 'ul', {}, ...lines.map(l => h('li', {}, ...inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))))));
    } else if (/^#{1,4}\s/.test(lines[0])) {
      box.append(h('p', {}, h('b', {}, lines[0].replace(/^#+\s*/, ''))));
      if (lines.length > 1) box.append(h('p', {}, ...inline(lines.slice(1).join(' '))));
    } else box.append(h('p', {}, ...inline(lines.join('\n'))));
  }
  return box;
}

export class AgentPanel {
  readonly el: HTMLElement;
  private log: HTMLElement;
  private input: HTMLTextAreaElement;
  private send: HTMLButtonElement;
  private freeEl: HTMLElement;
  private cfg: AgentCfg | null = null;
  private busy: AbortController | null = null;
  private hist: { q: string; a: string }[] = [];
  private api: AgentApi;
  /** tez tugma maydonni toʻldirgan boʻlsa — shu ssenariy bilan yuboriladi */
  private pending: string | null = null;

  constructor(private o: PanelOpts) {
    this.api = o.api ?? agentApi;
    this.log = h('div', { class: 'ag-log', 'aria-live': 'polite' });
    this.input = h('textarea', { class: 'ag-in', id: 'agIn', rows: 2, maxlength: 2000, placeholder: tr('Loyiha haqida savol bering…'), 'aria-label': tr('Savol') }) as HTMLTextAreaElement;
    this.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submit(); } });
    this.send = h('button', { class: 'btn btn-primary', id: 'agSend', type: 'button', onclick: () => this.submit() }) as HTMLButtonElement;
    this.freeEl = h('span', { class: 't-small ag-free', id: 'agFree' });
    const quick = h('div', { class: 'ag-quick', role: 'group', 'aria-label': tr('Tez savollar') }, ...o.quick.map(q =>
      h('button', { class: 'ag-chip', type: 'button', 'data-q': q.id, title: q.hint ? tr(q.hint) : '', onclick: () => { if (q.fill) { this.pending = q.scenario; this.input.value = tr(q.prompt); this.input.focus(); this.paintPrices(); } else void this.ask(tr(q.prompt), q.scenario); } }, tr(q.label), h('span', { class: 'ag-price', 'data-sc': q.scenario }))));
    this.el = h('section', { class: 'agentp', id: 'agentPanel', 'aria-label': tr('Maslahatchi'), hidden: true },
      h('div', { class: 'ag-head' },
        h('div', { class: 'ag-title' },
          h('div', { class: 'row' }, h('span', { class: 't-title' }, tr('Maslahatchi')), h('span', { class: 'ag-beta' }, 'beta')),
          h('div', { class: 't-small' }, tr('Faqat oʻqiydi · loyihani oʻzgartirmaydi'))),
        h('button', { class: 'ib sm', id: 'agClose', type: 'button', 'aria-label': tr('Yopish'), onclick: () => this.close() }, svgIcon(CLOSE))),
      this.log,
      h('div', { class: 'ag-foot' }, quick, h('div', { class: 'ag-box' }, this.input, h('div', { class: 'row ag-row' }, this.freeEl, this.send))));
    this.empty();
    void this.loadCfg();
  }

  get isOpen(): boolean { return !this.el.hidden; }
  open(): void { this.el.hidden = false; track(`${this.o.svc}/agent/open`); void this.loadCfg(true); setTimeout(() => this.input.focus(), 30); }
  close(): void { this.el.hidden = true; this.o.onClose?.(); }
  toggle(): void { if (this.isOpen) this.close(); else this.open(); }

  private async loadCfg(force = false): Promise<void> {
    this.cfg = await agentConfig(force);
    this.paintPrices();
  }
  private coins(sc: string): number { return this.cfg?.scenarios[sc]?.coins ?? 1; }
  private tier(sc: string): 'short' | 'long' { return this.cfg?.scenarios[sc]?.tier ?? 'short'; }
  private freeMode(): boolean { return !!this.cfg?.owner || isOwner(); }
  private paintPrices(): void {
    const left = this.cfg?.freeLeft;
    this.el.querySelectorAll<HTMLElement>('.ag-price').forEach(s => {
      const sc = s.dataset.sc!;
      s.textContent = this.freeMode() ? '' : this.tier(sc) === 'short' && (left ?? 0) > 0 ? tr('bepul') : tf('${n} tanga', { n: this.coins(sc) });
      s.dataset.free = String(s.textContent === tr('bepul'));
    });
    this.freeEl.replaceChildren();
    if (!this.freeMode() && left != null) this.freeEl.append(tr('Bu hafta bepul:'), ' ', h('b', {}, `${left} / ${this.cfg?.freePerWeek ?? 3}`));
    const sc = this.pending ?? `${this.o.svc}.ask`, free = this.freeMode() || (this.tier(sc) === 'short' && (left ?? 0) > 0);
    this.send.replaceChildren(this.busy ? tr('Toʻxtatish') : free ? tr('Yuborish · bepul') : tf('Yuborish · ${n} tanga', { n: this.coins(this.pending ?? `${this.o.svc}.ask`) }), ...(this.busy ? [] : [svgIcon(SEND)]));
  }

  private empty(): void {
    this.log.replaceChildren(h('div', { class: 'ag-intro' }, tr('Loyiha raqamlari va meʼyorlar boʻyicha javob beraman. Raqamni oʻzim yozmayman — faqat Lab hisobidan olaman.')));
  }

  private submit(): void {
    if (this.busy) { this.busy.abort(); return; }
    const q = this.input.value.trim(); if (!q) { this.input.focus(); return; }
    const sc = this.pending ?? `${this.o.svc}.ask`; this.pending = null;
    void this.ask(q, sc);
  }

  /** Savol berish (tez tugma, «Nega?» chipi yoki matn) */
  async ask(question: string, scenario: string): Promise<void> {
    if (this.busy) return;
    if (!this.isOpen) this.open();
    if (!await ensureLogin(undefined, 'Maslahatchidan foydalanish uchun kiring. Hisob bepul — haftasiga 3 ta savol bepul.')) return;
    if (!this.cfg) await this.loadCfg(true);
    if (!this.cfg?.enabled) { this.note(tr('Maslahatchi hozircha yoqilmagan.')); return; }
    if (this.tier(scenario) === 'long' && !this.freeMode() && !autoPayOn() && !await this.confirm(scenario)) return;
    this.input.value = '';
    if (this.log.querySelector('.ag-intro')) this.log.replaceChildren();
    this.log.append(h('div', { class: 'ag-q' }, question));
    const steps = h('ol', { class: 'ag-steps', 'aria-label': tr('Bajarilayotgan buyruqlar') });
    const wait = h('div', { class: 't-small ag-wait' }, tr('Javob tayyorlanmoqda…'));
    this.log.append(steps, wait); this.scroll();
    const ac = new AbortController(); this.busy = ac; this.paintPrices();
    const lines = new Map<string, HTMLElement>();
    track(`${this.o.svc}/agent/ask/${scenario.split('.')[1] ?? scenario}`);
    try {
      const r = await runAgent({
        api: this.api, scenario, question, lang: getLang(), tools: this.o.tools(), project: this.o.project(), areaHa: this.o.areaHa(),
        history: this.hist, signal: ac.signal,
        ev: {
          onRun: (run) => { if (this.cfg) this.cfg.freeLeft = run.freeLeft; this.paintPrices(); if (run.charged) { toast(tf('${n} tanga yechildi. Balans: ${b}', { n: fmt(run.charged), b: fmt(run.balance) })); void check(true); } },
          onTool: (name, st) => {
            let li = lines.get(name);
            if (!li) { li = h('li', { 'data-tool': name }, h('i'), h('span', {}, tr(TOOL_NAME[name] ?? name)), h('span', { class: 'mono' }, name)); lines.set(name, li); steps.append(li); this.scroll(); }
            li.dataset.s = st;
          },
        },
      });
      wait.remove();
      const n = steps.children.length;
      if (n) { const det = h('details', { class: 'ag-done' }, h('summary', {}, svgIcon(CHEV), tf('${n} ta buyruq bajarildi', { n }))); steps.before(det); det.append(steps); }
      else steps.remove();
      this.log.append(r.text ? renderAnswer(r.text) : h('div', { class: 't-small' }, tr('Javob boʻsh qaytdi.')));
      if (r.status === 'limit') this.note(tr('Bu savol yakunlandi: bitta savolda 10 qadamgacha ishlanadi. Davom etish uchun yangi savol bering.'));
      if (r.status === 'stopped') this.note(tr('Toʻxtatildi.'));
      if (r.unsourced?.length) this.log.append(h('div', { class: 't-small ag-src ag-warn' }, tf('Bu raqamlar Lab hisobida topilmadi — tekshiring: ${list}', { list: r.unsourced.join(', ') })));
      else this.log.append(h('div', { class: 't-small ag-src' }, tr('Raqamlar — Lab hisobidan, shu brauzerda.')));
      if (r.text) this.hist.push({ q: question, a: r.text.slice(0, 4000) });
    } catch (e) {
      wait.remove(); if (!steps.children.length) steps.remove();
      if ((e as Error)?.name === 'AbortError') this.note(tr('Toʻxtatildi.'));
      else { console.error('agent', e); this.error(e); }
    } finally {
      this.busy = null; void this.loadCfg(true); this.scroll();
    }
  }

  private note(text: string): void { this.log.append(h('div', { class: 'ag-note' }, text)); this.scroll(); }
  private scroll(): void { this.log.scrollTop = this.log.scrollHeight; }

  private error(e: unknown): void {
    const code = e instanceof ApiError ? e.code : '', st = e instanceof ApiError ? e.status : 0;
    if (st === 402 || code === 'insufficient') {
      this.log.append(h('div', { class: 'ag-note warn', id: 'agShort' }, h('b', {}, tr('Tanga yetmaydi')),
        h('span', {}, tr('Bu haftaning bepul savollari tugadi yoki xulosa tanga talab qiladi. Bepul savollar dushanba yangilanadi.')),
        h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: () => void buyDialog() }, tr('Tanga sotib olish'))));
    } else if (st === 401) { this.note(tr('Hisobga kiring.')); void ensureLogin(undefined, 'Maslahatchidan foydalanish uchun kiring.'); }
    else if (code === 'agent_budget') this.note(tr('Bugungi umumiy chegara tugadi — ertaga yana urinib koʻring.'));
    else if (code === 'agent_interrupted') this.note(tr('Model javobni yakunlay olmadi — savolni qayta yuboring.'));
    else if (code === 'agent_busy' || code === 'agent_upstream') this.note(tr('Model hozir javob bermadi. Tanga va bepul savol qaytarildi — birozdan keyin qayta yuboring.'));
    else if (code === 'run_limit' || code === 'run_closed' || code === 'run_expired') this.note(tr('Bu savol yakunlandi. Davom etish uchun yangi savol bering.'));
    else if (code === 'agent_off') this.note(tr('Maslahatchi hozircha yoqilmagan.'));
    else this.note(tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring'));
    this.scroll();
  }

  /** Pullik xulosa oldidan: narx, balans, «soʻramasdan yechilsin» */
  private confirm(scenario: string): Promise<boolean> {
    const price = this.coins(scenario), bal = current()?.balance;
    return new Promise(resolve => {
      let auto = false;
      const sw = h('button', { class: 'ag-sw', type: 'button', role: 'switch', 'aria-checked': 'false', id: 'agAuto', 'aria-label': tr('Bu loyihada soʻramasdan yechilsin'),
        onclick: () => { auto = !auto; sw.setAttribute('aria-checked', String(auto)); } }, h('i'));
      const done = (ok: boolean) => { card.remove(); if (ok && auto) setAutoPayHere(true); resolve(ok); };
      const card = h('div', { class: 'ag-confirm', role: 'dialog', id: 'agConfirm', 'aria-label': tr('Narx') },
        h('div', { class: 't-head' }, tr('Xulosa tanga bilan')),
        h('div', { class: 'ag-kv' }, h('span', {}, tr('Narx')), h('span', { class: 'mono' }, tf('${n} tanga', { n: price })),
          bal != null ? h('span', {}, tr('Balans')) : '', bal != null ? h('span', { class: 'mono' }, `${fmt(bal)} → ${fmt(Math.max(0, bal - price))}`) : ''),
        h('div', { class: 'row ag-row' }, h('span', { class: 't-small' }, tr('Bu loyihada soʻramasdan yechilsin')), sw),
        h('div', { class: 't-small' }, tr('Model javob bermasa, tanga qaytadi.')),
        h('div', { class: 'row ag-row' },
          h('button', { class: 'btn', type: 'button', id: 'agNo', onclick: () => done(false) }, tr('Bekor')),
          h('button', { class: 'btn btn-primary', type: 'button', id: 'agYes', onclick: () => done(true) }, tf('${n} tanga bilan boshlash', { n: price }))));
      this.log.append(card); this.scroll();
      (card.querySelector('#agYes') as HTMLElement).focus();
    });
  }
}

/* ---------- birinchi tanishuv: tugma qimirlaydi, qisqa izoh (bir marta) ---------- */
const LS_INTRO = 'mr-agent-intro', LS_SEEN = 'mr-agent-seen';
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return '1'; } };
const lsSet = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* */ } };
export const agentSeen = (): boolean => !!lsGet(LS_SEEN);
export const markAgentSeen = (): void => lsSet(LS_SEEN);

/** Tugma ostida izoh (bir marta): «Sinab koʻrish» — panel ochiladi; «Keyinroq» — yopiladi. Har ikkisi ham qayta chiqmaydi. */
export function agentIntro(btn: HTMLElement, onTry: () => void): void {
  if (lsGet(LS_INTRO)) return;
  lsSet(LS_INTRO);
  btn.classList.add('ag-nudge');
  setTimeout(() => btn.classList.remove('ag-nudge'), 5200);
  const close = () => { tip.remove(); removeEventListener('keydown', esc, true); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const tip = h('div', { class: 'ag-tip', role: 'dialog', id: 'agTip', 'aria-label': tr('Yangi: Maslahatchi') },
    h('div', { class: 'row' }, h('span', { class: 'ag-new' }, tr('yangi')), h('b', {}, tr('Maslahatchi'))),
    h('p', {}, tr('Loyihangiz boʻyicha savol bering: nega FAIL, qaysi band, qanday tuzatish mumkin. Javobdagi raqamlar Lab hisobidan olinadi.')),
    h('div', { class: 't-small' }, tr('Loyihani oʻzi oʻzgartirmaydi · haftasiga 3 ta savol bepul')),
    h('div', { class: 'row ag-row' },
      h('button', { class: 'btn btn-sm ag-try', type: 'button', id: 'agTry', onclick: () => { close(); onTry(); } }, tr('Sinab koʻrish')),
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', id: 'agLater', onclick: close }, tr('Keyinroq'))));
  const place = () => { const r = btn.getBoundingClientRect(); tip.style.top = `${r.bottom + 10}px`; tip.style.right = `${Math.max(8, innerWidth - r.right - 20)}px`; };
  setTimeout(() => { if (!btn.isConnected) return; place(); document.body.append(tip); addEventListener('keydown', esc, true); }, 1200);
}
