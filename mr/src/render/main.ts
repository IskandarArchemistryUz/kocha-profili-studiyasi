/**
 * Render studiyasi (beta) — app/render.html. Kanvasdagi «Render studiyasi — maket» (R-1, R-2, R-3).
 *   Kirish: asos rasm (geometriya va kadr) + 4 tagacha referens (uslub · material · yorugʻlik · kontekst).
 *   Render: uslub, asosga sodiqlik, soʻrov, variantlar → Gemini / GPT Image / OpenRouter (foydalanuvchining oʻz kaliti, brauzerdan).
 *   Natija: asl bilan solishtirish, PNG, Chizmadonga, asos yoki referens qilish.
 * Eski «Bino studiyasi» (bino.html: fasad, hajm, kvartiralar) va AI render oynasi — «Toʻliq asboblar»da qoladi (0-qoida).
 */
import '../ui/ds2.css';
import './render.css';
import { h, svgIcon, toast } from '../ui/dom';
import { logoSvg } from '../ui/logo';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { tr, tf, getLang, setLang, onLang, LANGS, type Lang } from '../i18n';
import { cacheGet, cachePut } from '../storage/db';
import { PROV, STY, SUBJECTS, FIDELITY, ROLES, RUN, NoImage, buildPrompt, loadState, saveState, modelOf, shrink, type ProvId, type RefRole, type Subject, type Fidelity } from './providers';
import { listSrc, listOut, addSrc, delSrc, addOut, delOut, type RenderSrc, type RenderOut, type From } from './inbox';

const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  up: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
};
const ic = (d: string) => svgIcon(d);
export const SERVICES = [
  { id: 'mr', name: 'Master reja', href: './', color: 'var(--svc-mr)' },
  { id: 'ks', name: 'Koʻchasoz', href: './kochasoz.html', color: 'var(--svc-ks)' },
  { id: 'joy', name: 'Joyshunos', href: './joyshunos.html', color: 'var(--svc-joy)' },
  { id: 'ren', name: 'Render', href: './render.html', color: 'var(--svc-ren)', cur: true, beta: true },
  { id: 'dk', name: 'Dizayn-kod', href: '../dizaynkod.html', color: 'var(--svc-dk)' },
  { id: 'chz', name: 'Chizmadon', href: './#/chizmadon', color: 'var(--svc-chz)' },
];
const FROM: Record<From, [string, string]> = { mr: ['Master reja', 'var(--svc-mr)'], ks: ['Koʻchasoz', 'var(--svc-ks)'], joy: ['Joyshunos', 'var(--svc-joy)'], chz: ['Chizmadon', 'var(--svc-chz)'], fayl: ['Fayldan', 'var(--faint)'], natija: ['Natijadan', 'var(--svc-ren)'] };
const MAX_REFS = 4;

/* ---------------- holat ---------------- */
const A = loadState();
A.fid ??= A.keep === false ? 'muvozanat' : 'qatiy'; A.subj ??= 'reja'; A.n ??= 1;
interface Ref { id: string; img: string; name: string; role: RefRole }
let SRC: RenderSrc[] = [], OUT: RenderOut[] = [], REFS: Ref[] = [];
let baseId = (() => { try { return localStorage.getItem('render-base') || ''; } catch { return ''; } })();
let view: 'asos' | 'natija' | 'cmp' = 'asos', busy = false, prog = '', err = '', pickOpen = false, keyOpen = false, provOpen = false, roleOpen = -1;
let viewer: { id: string; mode: 'natija' | 'cmp' | 'yon' } | null = null;
const base = () => SRC.find(s => s.id === baseId) ?? null;
const setBase = (id: string) => { baseId = id; try { localStorage.setItem('render-base', id); } catch { /* */ } const s = base(); if (s && s.subj) A.subj = s.subj; view = 'asos'; };
const saveRefs = () => { void cachePut('render-refs', REFS).catch(() => {}); };
const save = () => saveState(A);

/* ---------------- qobiq ---------------- */
const root = document.getElementById('ren')!;
const header = h('header', { class: 'eko glass' });
const left = h('aside', { class: 'ren-lp panel', id: 'renLeft', 'aria-label': tr('Kirish') });
const stage = h('main', { class: 'ren-stage', id: 'renStage' });
const right = h('aside', { class: 'ren-rp panel', id: 'renRight', 'aria-label': tr('Render') });
const over = h('div', { class: 'ren-over', id: 'renView', hidden: true });
const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, id: 'renFile' }) as HTMLInputElement;
let fileFor: 'base' | 'ref' = 'base';
root.append(header, h('div', { class: 'ren-body' }, left, stage, right), over, fileIn);

function renderHeader(): void {
  header.replaceChildren(
    h('a', { class: 'brand', href: '../index.html', title: tr('Bosh sahifa') }, logoSvg(20), h('span', {}, 'Archemistry Lab')),
    h('span', { class: 'vr' }),
    h('nav', { class: 'svc', 'aria-label': tr('Xizmatlar') }, ...SERVICES.map(s => h('a', { href: s.href, class: s.cur ? 'on' : '', 'aria-current': s.cur ? 'page' : null, 'data-svc': s.id }, h('i', { style: `background:${s.color}` }), tr(s.name), s.beta ? h('em', { class: 'beta' }, 'beta') : null))),
    h('span', { class: 'sp' }),
    h('div', { class: 'seg sm langsw', role: 'group', 'aria-label': tr('Til'), id: 'langSw' }, ...LANGS.map(l => h('button', { type: 'button', 'data-lang': l.id, 'aria-pressed': l.id === getLang(), onclick: () => setLang(l.id as Lang) }, l.name))),
    (() => { const b = h('button', { class: 'btn btn-sm btn-ghost icon-btn', id: 'themeBtn', type: 'button', title: tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), 'aria-label': tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), onclick: () => toggleTheme() }); b.append(ic(isDark() ? ICON.sun : ICON.moon)); return b; })(),
  );
}

/* ---------------- chap panel: asos rasm va referenslar ---------------- */
function srcRow(s: RenderSrc, onPick: () => void, onDel?: () => void): HTMLElement {
  const [fn, fc] = FROM[s.from] ?? FROM.fayl;
  return h('div', { class: 'ren-src', 'data-src': s.id },
    h('button', { type: 'button', class: 'pick', 'aria-pressed': s.id === baseId, onclick: onPick },
      h('img', { src: s.img, alt: '' }),
      h('span', { class: 'tx' }, h('b', {}, s.name), h('span', {}, h('i', { style: `background:${fc}` }), tr(fn), s.w ? h('code', {}, `${s.w}×${s.h}`) : null))),
    onDel ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', 'aria-label': tr('Oʻchirish'), title: tr('Oʻchirish'), onclick: onDel }, ic(ICON.x)) : null);
}
function renderLeft(): void {
  const b = base();
  const pick = pickOpen ? h('div', { class: 'ren-pickl', role: 'listbox', 'aria-label': tr('Yuborilganlar') },
    ...(SRC.length ? SRC.map(s => srcRow(s, () => { setBase(s.id); pickOpen = false; renderAll(); }, () => void (async () => { await delSrc(s.id); SRC = await listSrc(); if (baseId === s.id) setBase(SRC[0]?.id ?? ''); renderAll(); })())) : [h('p', { class: 't-small' }, tr('Hali hech narsa yuborilmagan. Master reja, Joyshunos yoki Koʻchasozdan «Render studiyasiga» bosing yoki fayl yuklang.'))])) : null;
  left.replaceChildren(
    h('h1', { class: 'ttl' }, tr('Kirish')),
    h('section', { class: 'ren-sec' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Asos rasm — geometriya va kadr'))),
      b ? h('div', { class: 'ren-base' }, h('img', { src: b.img, alt: b.name }), h('div', { class: 'cap' }, h('i', { style: `background:${(FROM[b.from] ?? FROM.fayl)[1]}` }), h('b', {}, b.name), b.w ? h('code', {}, `${b.w}×${b.h}`) : null), h('div', { class: 'fr t-small' }, tr((FROM[b.from] ?? FROM.fayl)[0])))
        : h('button', { type: 'button', class: 'ren-empty', onclick: () => { fileFor = 'base'; fileIn.click(); } }, ic(ICON.up), tr('Asos rasmni yuklang (PNG, JPG)')),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn btn-sm', id: 'srcPick', 'aria-expanded': pickOpen, onclick: () => { pickOpen = !pickOpen; renderLeft(); } }, tf('Yuborilganlardan · ${n}', { n: SRC.length })),
        h('button', { type: 'button', class: 'btn btn-sm', id: 'srcFile', onclick: () => { fileFor = 'base'; fileIn.click(); } }, tr('Fayldan'))),
      pick),
    h('section', { class: 'ren-sec' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Referenslar — uslub, material, yorugʻlik')), h('code', {}, `${REFS.length} / ${MAX_REFS}`)),
      h('div', { class: 'ren-refs' },
        ...REFS.map((r, i) => h('div', { class: 'ref', 'data-ref': i },
          h('div', { class: 'im' }, h('img', { src: r.img, alt: r.name }), h('button', { type: 'button', class: 'del', 'aria-label': tr('Referensni olib tashlash'), onclick: () => { REFS.splice(i, 1); saveRefs(); renderAll(); } }, ic(ICON.x))),
          h('button', { type: 'button', class: 'role', 'aria-haspopup': 'listbox', 'aria-expanded': roleOpen === i, onclick: () => { roleOpen = roleOpen === i ? -1 : i; renderLeft(); } }, tr((ROLES.find(x => x[0] === r.role) ?? ROLES[0])[1]), ic(ICON.chev)),
          roleOpen === i ? h('div', { class: 'ren-menu', role: 'listbox' }, ...ROLES.map(([k, n]) => h('button', { type: 'button', role: 'option', 'aria-selected': r.role === k, onclick: () => { r.role = k; roleOpen = -1; saveRefs(); renderLeft(); } }, tr(n)))) : null)),
        ...(REFS.length < MAX_REFS ? [h('button', { type: 'button', class: 'add', id: 'refAdd', onclick: () => { fileFor = 'ref'; fileIn.click(); } }, '+ ', tr('Referens'))] : [])),
      h('p', { class: 't-small' }, tr('Har referensga rol bering: Uslub · Material · Yorugʻlik · Kontekst. Referens — fayldan yoki natija oynasidan («Referens qilish»).'))),
    h('span', { class: 'sp' }),
    h('details', { class: 'ren-old' }, h('summary', {}, tr('Toʻliq asboblar (avvalgi koʻrinish)')),
      h('a', { href: '../bino.html' }, tr('Bino studiyasi'), ' — ', tr('fasad, hajm, kvartiralar, AI render'))),
  );
}
fileIn.onchange = async () => {
  const f = fileIn.files?.[0]; fileIn.value = ''; if (!f) return;
  const url = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
  const sz = await imgSize(url);
  if (fileFor === 'ref') { if (REFS.length >= MAX_REFS) return; REFS.push({ id: `f${Date.now()}`, img: (await shrink(url, 1024)).url, name: f.name, role: REFS.length ? 'material' : 'uslub' }); saveRefs(); renderAll(); return; }
  const s = await addSrc({ name: f.name.replace(/\.[a-z]+$/i, ''), from: 'fayl', subj: A.subj!, img: url, w: sz.w, h: sz.h }); SRC = await listSrc(); setBase(s.id); renderAll();
};
function imgSize(src: string): Promise<{ w: number; h: number }> { return new Promise(ok => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok({ w: 0, h: 0 }); im.src = src; }); }

/* ---------------- markaz: asos / oxirgi natija / solishtirish ---------------- */
function lastOut(): RenderOut | null { return OUT.find(o => o.srcId === baseId) ?? null; }
function cmpBox(before: string, after: string): HTMLElement {
  const box = h('div', { class: 'ren-cmp' }, h('img', { src: after, alt: tr('Natija') }), h('div', { class: 'b' }, h('img', { src: before, alt: tr('Asos') })), h('i', { class: 'bar' }, h('span', {}, '‹ ›')));
  const b = box.querySelector<HTMLElement>('.b')!, bar = box.querySelector<HTMLElement>('i')!, im = box.querySelector<HTMLImageElement>(':scope > img')!;
  const fit = () => { const bi = b.querySelector<HTMLImageElement>('img')!; bi.style.width = `${im.clientWidth}px`; bi.style.height = `${im.clientHeight}px`; };
  im.onload = fit; requestAnimationFrame(fit);
  const set = (x: number) => { b.style.width = `${x * 100}%`; bar.style.left = `${x * 100}%`; };
  let drag = false;
  box.onpointerdown = e => { drag = true; box.setPointerCapture(e.pointerId); move(e); };
  box.onpointerup = () => { drag = false; };
  const move = (e: PointerEvent) => { if (!drag) return; const r = box.getBoundingClientRect(); set(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
  box.onpointermove = move;
  box.tabIndex = 0; box.setAttribute('role', 'slider'); box.setAttribute('aria-label', tr('Asl va natija ajratgichi'));
  box.onkeydown = e => { const cur = parseFloat(b.style.width || '50') / 100; if (e.key === 'ArrowLeft') set(Math.max(0, cur - 0.05)); if (e.key === 'ArrowRight') set(Math.min(1, cur + 0.05)); };
  set(0.5); return box;
}
function renderStage(): void {
  const b = base(), o = lastOut();
  if (!b) { stage.replaceChildren(h('div', { class: 'ren-hello' }, h('h2', {}, tr('Render studiyasi')), h('p', {}, tr('Asos rasm — Master reja, Joyshunos yoki Koʻchasozdagi kadr yoki oʻzingizning rasmingiz. Model fayli kerak emas: AI rasm bilan ishlaydi.')), h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { fileFor = 'base'; fileIn.click(); } }, ic(ICON.up), tr('Rasm yuklash')))); return; }
  const v = o ? view : 'asos';
  const body = v === 'cmp' && o ? cmpBox(b.img, o.src) : h('img', { class: 'ren-img', src: v === 'natija' && o ? o.src : b.img, alt: b.name });
  stage.replaceChildren(
    h('div', { class: 'ren-frame' }, body),
    h('div', { class: 'ren-top' },
      h('span', { class: 'chip big' }, tr(v === 'natija' ? 'Oxirgi natija' : 'Asos rasm'), b.w ? h('code', {}, `${b.w}×${b.h}`) : null),
      h('span', { class: 'sp' }),
      h('div', { class: 'seg sm glass', role: 'group', 'aria-label': tr('Koʻrinish'), id: 'stView' },
        ...([['asos', 'Asos'], ['natija', 'Oxirgi natija'], ['cmp', 'Solishtirish']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': v === k, disabled: k !== 'asos' && !o, onclick: () => { view = k; renderStage(); } }, tr(n))))),
    h('div', { class: 'ren-tools glass' },
      h('button', { type: 'button', class: 'btn btn-sm', disabled: true, title: tr('Tez orada') }, tr('Hudud belgilash'), h('em', { class: 'soon' }, tr('tez orada'))),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: true, title: tr('Tez orada') }, tr('Kattalashtirish ×2'), h('em', { class: 'soon' }, tr('tez orada')))),
    ...(busy ? [h('div', { class: 'ren-busy', role: 'status' }, h('span', { class: 'spin' }), prog)] : []),
  );
}

/* ---------------- oʻng panel: render sozlamalari ---------------- */
function renderRight(): void {
  const P = PROV[A.prov], key = A.key[A.prov] || '', outs = OUT.filter(o => o.srcId === baseId), b = base();
  right.replaceChildren(
    h('div', { class: 'hd' }, h('h2', { class: 'ttl' }, tr('Render')), h('span', { class: 'chip warn' }, 'beta')),
    h('div', { class: 'glabel' }, h('span', {}, tr('Nima tasvirlangan'))),
    h('div', { class: 'ren-chips', role: 'group', 'aria-label': tr('Nima tasvirlangan'), id: 'subj' }, ...SUBJECTS.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.subj === k, onclick: () => { A.subj = k as Subject; save(); renderRight(); } }, tr(n)))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Uslub'))),
    h('div', { class: 'tiles c2 ren-sty', id: 'sty' }, ...STY.map(([k, n]) => h('button', { type: 'button', class: 'tile', 'aria-pressed': A.sty === k, 'data-sty': k, onclick: () => { A.sty = A.sty === k && REFS.length ? '' : k; save(); renderRight(); } }, tr(n)))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Asosga sodiqlik'))),
    h('div', { class: 'seg', role: 'group', 'aria-label': tr('Asosga sodiqlik'), id: 'fid' }, ...FIDELITY.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.fid === k, onclick: () => { A.fid = k as Fidelity; A.keep = k === 'qatiy'; save(); renderRight(); } }, tr(n)))),
    h('p', { class: 't-small' }, tr(A.fid === 'qatiy' ? 'Binolar soni, qavatlar, joylashuv va kamera oʻzgarmaydi.' : A.fid === 'muvozanat' ? 'Hajm va kamera saqlanadi; fasad detallari, materiallar va obodonlashtirish qoʻshiladi.' : 'Asos — umumiy kompozitsiya; detallar va muhitni model erkin toʻldiradi.')),
    h('label', { class: 'glabel', for: 'renExtra' }, h('span', {}, tr('Soʻrov (ixtiyoriy)'))),
    (() => { const t = h('textarea', { class: 'input ren-ta', id: 'renExtra', rows: 2, placeholder: tr('masalan: fasadlar terrakota gʻisht, hovlida bolalar maydonchasi') }) as HTMLTextAreaElement; t.value = A.extra; t.oninput = () => { A.extra = t.value; save(); }; return t; })(),
    h('div', { class: 'ren-row' }, h('span', { class: 'glabel' }, h('span', {}, tr('Variantlar'))),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Variantlar soni'), id: 'nVar' }, ...[1, 2, 4].map(n => h('button', { type: 'button', 'aria-pressed': A.n === n, onclick: () => { A.n = n; save(); renderRight(); } }, String(n))))),
    h('details', { class: 'ren-key', open: keyOpen || !key, ontoggle: (e: Event) => { keyOpen = (e.target as HTMLDetailsElement).open; } },
      h('summary', {}, tr('Model va API kaliti'), ' · ', h('code', {}, P.n.split(' ')[0] === 'Google' ? 'Gemini' : P.n.split(' ')[0]), key ? null : h('em', { class: 'need' }, tr('kalit kerak'))),
      h('div', { class: 'in' },
        h('div', { class: 'ren-selw' },
          h('button', { type: 'button', class: 'ren-sel', id: 'prov', 'aria-haspopup': 'listbox', 'aria-expanded': provOpen, onclick: () => { provOpen = !provOpen; renderRight(); } }, tr(P.n), ic(ICON.chev)),
          provOpen ? h('div', { class: 'ren-menu', role: 'listbox' }, ...(Object.keys(PROV) as ProvId[]).map(k => h('button', { type: 'button', role: 'option', 'aria-selected': A.prov === k, onclick: () => { A.prov = k; provOpen = false; save(); renderRight(); } }, tr(PROV[k].n)))) : null),
        h('label', { class: 'fl' }, h('span', {}, tr('Model nomi')), (() => { const i = h('input', { class: 'input mono', id: 'renModel', list: 'renModels', value: modelOf(A) }) as HTMLInputElement; i.onchange = () => { A.model[A.prov] = i.value.trim(); save(); }; return i; })(),
          h('datalist', { id: 'renModels' }, ...P.models.map(m => h('option', { value: m })))),
        h('label', { class: 'fl' }, h('span', {}, tr('API kaliti')), (() => { const i = h('input', { class: 'input mono', id: 'renKey', type: 'password', autocomplete: 'off', placeholder: tr('kalitni shu yerga qoʻying'), value: key }) as HTMLInputElement; i.onchange = () => { A.key[A.prov] = i.value.trim(); save(); renderRight(); }; return i; })()),
        h('p', { class: 't-small' }, tr('Kalit faqat shu brauzerda saqlanadi va toʻgʻridan-toʻgʻri provayderga yuboriladi. Toʻlov — sizning hisobingizdan.'), ' ', h('a', { href: P.key, target: '_blank', rel: 'noopener' }, tr('Kalit olish'), ic(ICON.ext))))),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', id: 'renGo', disabled: busy || !b, onclick: () => void go() }, ic(ICON.spark), busy ? prog : A.n! > 1 ? tf('Render qilish · ${n} variant', { n: A.n! }) : tr('Render qilish')),
    ...(err ? [h('p', { class: 'note bad', id: 'renErr', role: 'alert' }, err)] : []),
    h('div', { class: 'glabel' }, h('span', {}, tr('Natijalar')), h('code', {}, `${outs.length} / ${OUT.length}`)),
    outs.length ? h('div', { class: 'ren-gal', id: 'renGal' }, ...outs.map(o => h('button', { type: 'button', 'aria-label': o.name, title: o.name, onclick: () => openViewer(o.id) }, h('img', { src: o.src, alt: '' }))))
      : h('p', { class: 't-small' }, tr('Natijalar shu yerda chiqadi. Bosing — kattalashtirish, asl bilan solishtirish, Chizmadonga.')),
  );
}

/* ---------------- render ---------------- */
async function go(): Promise<void> {
  const b = base(); if (!b || busy) return;
  const key = (A.key[A.prov] || '').trim(), model = modelOf(A);
  if (!key) { err = tr('API kalitini kiriting.'); keyOpen = true; renderRight(); return; }
  err = ''; busy = true;
  const n = A.n ?? 1, img = await shrink(b.img, 1536), refs = await Promise.all(REFS.map(r => shrink(r.img, 1024)));
  const P = buildPrompt(A, A.subj ?? 'reja', REFS.map(r => r.role));
  const styN = tr((STY.find(x => x[0] === A.sty) ?? ['', 'Referens boʻyicha'])[1]);
  try {
    for (let i = 0; i < n; i++) {
      prog = n > 1 ? tf('Yaratilmoqda… ${i} / ${n}', { i: i + 1, n }) : tr('Yaratilmoqda… (20–60 soniya)'); renderStage(); renderRight();
      const src = await RUN[A.prov](key, model, P, img, fetch.bind(globalThis), refs);
      await addOut({ srcId: b.id, src, orig: img.url, name: `${b.name} · ${styN}`, prompt: P, model, sty: A.sty, fid: A.fid!, refs: REFS.length });
      OUT = await listOut(); view = 'natija';
    }
  } catch (e) {
    err = e instanceof NoImage ? `${tr('Model rasm qaytarmadi')}${e.message ? ': ' + e.message : ''}` : `${tr('Xato')}: ${(e as Error).message || e}`;
  }
  busy = false; prog = ''; renderStage(); renderRight();
  if (!err && OUT[0]?.srcId === b.id) openViewer(OUT[0].id);
}

/* ---------------- natija oynasi (R-2) ---------------- */
function openViewer(id: string): void { viewer = { id, mode: viewer?.mode ?? 'cmp' }; renderViewer(); }
function closeViewer(): void { viewer = null; renderViewer(); }
function renderViewer(): void {
  const o = viewer ? OUT.find(x => x.id === viewer!.id) : null;
  over.hidden = !o; if (!o || !viewer) { over.replaceChildren(); return; }
  const src = SRC.find(s => s.id === o.srcId), sib = OUT.filter(x => x.srcId === o.srcId), V = viewer;
  const body = V.mode === 'cmp' ? cmpBox(o.orig, o.src) : V.mode === 'yon' ? h('div', { class: 'ren-yon' }, h('figure', {}, h('img', { src: o.orig, alt: tr('Asos') }), h('figcaption', {}, tr('Asos'))), h('figure', {}, h('img', { src: o.src, alt: tr('Natija') }), h('figcaption', {}, tr('Natija')))) : h('img', { class: 'ren-img', src: o.src, alt: o.name });
  const dt = new Date(o.t), when = `${dt.toLocaleDateString('ru-RU')} ${dt.toTimeString().slice(0, 5)}`;
  over.replaceChildren(
    h('header', { class: 'eko glass ren-vh' },
      h('button', { type: 'button', class: 'btn btn-ghost', id: 'vBack', onclick: closeViewer }, ic(ICON.back), tr('Render studiyasi')),
      h('span', { class: 'vr' }),
      h('div', { class: 'nm' }, h('b', {}, o.name), h('code', {}, `${o.model} · ${when}`)),
      h('span', { class: 'sp' }),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Koʻrinish'), id: 'vMode' }, ...([['natija', 'Natija'], ['cmp', 'Asl bilan solishtirish'], ['yon', 'Yonma-yon']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': V.mode === k, onclick: () => { V.mode = k; renderViewer(); } }, tr(n)))),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'vPng', onclick: () => void savePng(o) }, tr('PNG yuklab olish')),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'vAgain', onclick: () => { closeViewer(); if (src) setBase(src.id); renderAll(); void go(); } }, tr('Yana render')),
      h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'vChz', onclick: () => void toChizmadon(o) }, tr('Chizmadonga'), ic(ICON.arrow))),
    h('div', { class: 'ren-vb' },
      h('div', { class: 'ren-vstage' }, body),
      h('aside', { class: 'panel ren-va' },
        h('h3', {}, tr('Natija haqida')),
        h('dl', {},
          h('dt', {}, tr('Manba')), h('dd', {}, src ? `${src.name} (${tr((FROM[src.from] ?? FROM.fayl)[0])})` : '—'),
          h('dt', {}, tr('Uslub')), h('dd', {}, tr((STY.find(x => x[0] === o.sty) ?? ['', 'Referens boʻyicha'])[1])),
          h('dt', {}, tr('Sodiqlik')), h('dd', {}, tr((FIDELITY.find(x => x[0] === o.fid) ?? FIDELITY[0])[1])),
          h('dt', {}, tr('Referenslar')), h('dd', {}, String(o.refs)),
          h('dt', {}, tr('Model')), h('dd', {}, h('code', {}, o.model))),
        h('details', { class: 'ren-key' }, h('summary', {}, tr('Soʻrov matni (prompt)')), h('p', { class: 'mono t-small' }, o.prompt)),
        sib.length > 1 ? h('div', { class: 'glabel' }, h('span', {}, tr('Shu manbadan boshqa natijalar'))) : null,
        sib.length > 1 ? h('div', { class: 'ren-gal' }, ...sib.map(x => h('button', { type: 'button', 'aria-pressed': x.id === o.id, 'aria-label': x.name, onclick: () => openViewer(x.id) }, h('img', { src: x.src, alt: '' })))) : null,
        h('span', { class: 'sp' }),
        h('button', { type: 'button', class: 'btn btn-block', id: 'vBase', onclick: () => void asBase(o) }, tr('Natijani asos rasm qilish')),
        h('button', { type: 'button', class: 'btn btn-block', id: 'vRef', disabled: REFS.length >= MAX_REFS, onclick: () => { REFS.push({ id: o.id, img: o.src, name: o.name, role: 'uslub' }); saveRefs(); toast(tr('Referensga qoʻshildi')); renderAll(); } }, tr('Referens qilish')),
        h('button', { type: 'button', class: 'btn btn-block btn-danger', id: 'vDel', onclick: () => void (async () => { await delOut(o.id); OUT = await listOut(); closeViewer(); renderAll(); })() }, tr('Oʻchirish')))),
  );
}
async function asBase(o: RenderOut): Promise<void> {
  const sz = await imgSize(o.src);
  const s = await addSrc({ name: o.name, from: 'natija', subj: A.subj!, img: o.src, w: sz.w, h: sz.h });
  SRC = await listSrc(); setBase(s.id); closeViewer(); renderAll();
}
async function savePng(o: RenderOut): Promise<void> {
  const b = await (await fetch(o.src)).blob(), u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = `render-${o.id}.${b.type.includes('jpeg') ? 'jpg' : 'png'}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
/** Chizmadon kiruvchi varagʻi (Koʻchasoz bilan bir xil kalit): A3 albom, rasm sigʻdirilgan, ostida nom */
async function toChizmadon(o: RenderOut): Promise<void> {
  const im = await shrink(o.src, 2400), W = 420, H = 297, M = 12, cap = 10, aw = W - 2 * M, ah = H - 2 * M - cap, k = Math.min(aw / im.w, ah / im.h), w = im.w * k, hh = im.h * k, x = (W - w) / 2, y = M + (ah - hh) / 2;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<g id="01_Render" data-name="Render"><image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${hh.toFixed(2)}" href="${im.url}" preserveAspectRatio="xMidYMid meet"/></g><g id="02_Yozuv" data-name="Yozuv"><text x="${M}" y="${H - M}" font-size="4" font-family="Archivo, sans-serif" fill="#1d1d1b">${esc(o.name)}</text><text x="${W - M}" y="${H - M}" font-size="2.6" text-anchor="end" font-family="IBM Plex Mono, monospace" fill="#6b6965">${esc(tr('AI render'))} · ${esc(o.model)}</text></g>`;
  try { localStorage.setItem('ks-chz-inbox', JSON.stringify({ name: `${tr('Render')} · ${o.name}`, kind: 'sheet', svg, vb: [0, 0, W, H], w: W, h: H })); }
  catch { toast(tr('Brauzer xotirasi toʻla — varaq uzatilmadi')); return; }
  location.href = './#/chizmadon';
}

/* ---------------- ishga tushirish ---------------- */
function renderAll(): void { renderHeader(); renderLeft(); renderStage(); renderRight(); renderViewer(); document.title = `${tr('Render studiyasi')} · Archemistry Lab`; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (viewer) closeViewer(); else if (pickOpen || provOpen || roleOpen >= 0) { pickOpen = provOpen = false; roleOpen = -1; renderAll(); } } });
onLang(() => { renderAll(); document.documentElement.lang = getLang(); });
onTheme(() => renderHeader());
async function boot(): Promise<void> {
  try { [SRC, OUT, REFS] = await Promise.all([listSrc(), listOut(), cacheGet<Ref[]>('render-refs').then(r => r ?? [])]); } catch (e) { toast(`${tr('Saqlash ishlamayapti')}: ${(e as Error).message}`); }
  const m = /^#\/s\/([\w-]+)/.exec(location.hash);
  if (m && SRC.some(s => s.id === m[1])) { setBase(m[1]); history.replaceState(null, '', location.pathname); }
  else if (!base() && SRC[0]) setBase(SRC[0].id);
  renderAll();
}
renderAll();
void boot();
addEventListener('hashchange', () => { if (location.hash.startsWith('#/s/')) void boot(); });
(window as unknown as { renderStudio: unknown }).renderStudio = { get state() { return { baseId, refs: REFS.length, out: OUT.length, src: SRC.length, A }; } };
