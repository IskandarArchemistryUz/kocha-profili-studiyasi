/**
 * Kirish nuqtasi: marshrutlash (#/ — loyihalar roʻyxati, #/p/<id> — loyiha oynasi).
 */
import './ui/ds2.css';
import './ui/style.css';
import './ui/theme';
import { blankProject, uid } from './core/doc';
import { listProjects, getProject, putProject, deleteProject, importJSON, type ProjectMeta } from './storage/db';
import { Editor } from './ui/editor';
import { h, toast, icl, IC, svgIcon } from './ui/dom';
import { tr, autoTranslate } from './i18n';
autoTranslate();

const root = document.getElementById('root')!;
let editor: Editor | null = null;

async function route(): Promise<void> {
  editor?.dispose(); editor = null;
  // bosh sahifadan: #/yangi — yangi loyiha, #/namuna — namuna loyiha (data/ dan nusxa)
  if (location.hash === '#/yangi') { const p = blankProject(); await putProject(p); location.replace(`#/p/${p.id}`); return; }
  if (location.hash === '#/namuna') {
    try { const r = await fetch('../data/namuna-mahalla.archemistry.json'); if (!r.ok) throw new Error(String(r.status)); const p = importJSON(await r.text(), () => uid('p_')); await putProject(p); location.replace(`#/p/${p.id}`); }
    catch (e) { toast('Namuna loyiha yuklanmadi: ' + (e as Error).message); location.replace('#/'); }
    return;
  }
  const m = location.hash.match(/^#\/p\/([\w-]+)$/);
  if (m) {
    let doc = null;
    try { doc = await getProject(m[1]); } catch (e) { console.error(e); toast('Loyihani ochib boʻlmadi: ' + (e as Error).message); }
    if (!doc) { toast('Loyiha topilmadi'); location.hash = '#/'; return; }
    document.title = `${doc.name} — Archemistry Lab · Master reja`;
    editor = new Editor(root, doc, () => { location.hash = '#/'; });
    (window as any).__mr = editor; // e2e testlar uchun
    return;
  }
  document.title = 'Archemistry Lab · Master reja';
  await home();
}

async function home(): Promise<void> {
  let list: ProjectMeta[] = [];
  try { list = await listProjects(); } catch (e) { toast('Saqlash ishlamayapti: ' + (e as Error).message); }
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, id: 'file' }) as HTMLInputElement;
  file.onchange = async () => {
    const f = file.files?.[0]; if (!f) return;
    try { const p = importJSON(await f.text(), () => uid('p_')); await putProject(p); location.hash = `#/p/${p.id}`; }
    catch (e) { toast((e as Error).message); }
  };
  const created = (t: string) => new Date(t).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  const TRASH = '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', OPEN = '<path d="M4 7h6l2 2h8v10H4zM4 7V5h6"/>', DEMO_IC = '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>';
  root.replaceChildren(h('main', { class: 'home' },
    h('a', { class: 'btn btn-ghost btn-sm', href: '../index.html', style: 'align-self:flex-start;text-decoration:none' }, ...icl(IC.back, 'Archemistry Lab')),
    h('h1', { class: 't-display' }, tr('Master reja')),
    h('p', { class: 't-small lead' }, tr('Uchastkadan meʼyoriy tekshiruvgacha — bitta 3D oynada. Har bir koʻrsatkich bitta modeldan hisoblanadi va ShNQ bandiga bogʻlanadi.')),
    h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-primary btn-lg', id: 'newP', onclick: async () => { const p = blankProject(); await putProject(p); location.hash = `#/p/${p.id}`; } }, ...icl(IC.plus, tr('Yangi loyiha'))),
      h('button', { class: 'btn btn-lg', id: 'openFile', onclick: () => file.click() }, ...icl(OPEN, tr('Fayldan ochish'))), file,
      h('a', { class: 'btn btn-lg btn-ghost', id: 'demoP', href: '#/namuna', style: 'text-decoration:none' }, ...icl(DEMO_IC, tr('Namuna loyiha')))),
    list.length ? h('div', { class: 'row3 cards', id: 'cards' }, ...list.map(p => h('a', { class: 'card group', href: `#/p/${p.id}`, 'data-pid': p.id },
      h('b', {}, p.name),
      h('span', { class: 't-small' }, `${tr('oʻzgargan')}: ${created(p.updated)} · ${tr(p.hasSite ? 'uchastka bor' : 'uchastka yoʻq')} · ${p.buildings} ${tr('bino')}`),
      h('button', { class: 'btn btn-danger btn-sm', 'data-del': p.id, onclick: async (e: Event) => {
        e.preventDefault(); e.stopPropagation();
        if (!confirm(`«${p.name}» oʻchirilsinmi? Buni qaytarib boʻlmaydi.`)) return;
        await deleteProject(p.id); home();
      } }, ...icl(TRASH, tr('Oʻchirish'))))))
      : h('div', { class: 'empty', style: 'margin-top:16px' }, svgIcon('<path d="M4 4h16v16H4zM4 11h8V4M12 15h8M16 15v5"/>'), h('span', {}, tr('Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.'))),
    h('p', { class: 't-small', style: 'margin-top:24px' }, tr('Loyihalar shu brauzerda saqlanadi; muhim loyihani «Taqdimot va eksport» qadamida faylga saqlang.'))));
}

window.addEventListener('hashchange', route);
route();
