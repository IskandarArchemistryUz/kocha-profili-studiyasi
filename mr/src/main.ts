/**
 * Kirish nuqtasi: marshrutlash (#/ — loyihalar roʻyxati, #/p/<id> — loyiha oynasi).
 */
import './ui/style.css';
import { blankProject, uid } from './core/doc';
import { listProjects, getProject, putProject, deleteProject, importJSON, type ProjectMeta } from './storage/db';
import { Editor } from './ui/editor';
import { h, toast, icl, IC } from './ui/dom';

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
  root.replaceChildren(h('main', { class: 'home' },
    h('a', { class: 'lb', href: '../index.html', style: 'text-decoration:none' }, ...icl(IC.back, 'Archemistry Lab')),
    h('h1', {}, 'Master reja'),
    h('p', { class: 'lead' }, 'Uchastkadan meʼyoriy tekshiruvgacha — bitta 3D oynada. Har bir koʻrsatkich bitta modeldan hisoblanadi va ShNQ bandiga bogʻlanadi. Bu 0-bosqich: poydevor.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', id: 'newP', onclick: async () => { const p = blankProject(); await putProject(p); location.hash = `#/p/${p.id}`; } }, ...icl(IC.plus, 'Yangi loyiha')),
      h('button', { class: 'btn', onclick: () => file.click() }, 'Fayldan ochish'), file),
    list.length ? h('div', { class: 'cards', id: 'cards' }, ...list.map(p => h('a', { class: 'card', href: `#/p/${p.id}`, 'data-pid': p.id },
      h('b', {}, p.name), h('small', {}, `oʻzgargan: ${created(p.updated)}`),
      h('small', {}, `${p.hasSite ? 'uchastka bor' : 'uchastka yoʻq'} · ${p.buildings} bino`),
      h('div', { class: 'row' }, h('span', { class: 'sp' }), h('button', { class: 'btn danger', 'data-del': p.id, onclick: async (e: Event) => {
        e.preventDefault(); e.stopPropagation();
        if (!confirm(`«${p.name}» oʻchirilsinmi? Buni qaytarib boʻlmaydi.`)) return;
        await deleteProject(p.id); home();
      } }, 'Oʻchirish')))))
      : h('div', { class: 'empty', style: 'margin-top:16px' }, 'Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.'),
    h('p', { class: 'note', style: 'margin-top:24px' }, 'Loyihalar shu brauzerda saqlanadi. Akkaunt va bulutda saqlash keyingi bosqichda qoʻshiladi; hozircha muhim loyihani «Taqdimot va eksport» qadamida faylga saqlab qoʻying.')));
}

window.addEventListener('hashchange', route);
route();
