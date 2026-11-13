/** Bulut oynalari (2-PR): ziddiyat va «bulutda yangiroq nusxa bor». Uslub — chzsend oynasi bilan bir xil. */
import { tr, tf } from '../i18n';
import { injectCss } from './chzsend';
import type { SyncState } from '../storage/cloud';

function dialog<T>(id: string, title: string, sub: string, opts: { id: string; title: string; note: string; rec?: boolean; val: T }[], cancel: T): Promise<T> {
  injectCss();
  return new Promise(done => {
    const back = document.createElement('div'); back.className = 'chzs-back';
    const box = document.createElement('div'); box.className = 'chzs'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.id = id;
    const h = document.createElement('h2'); h.textContent = title;
    const p = document.createElement('p'); p.textContent = sub;
    box.append(h, p);
    let first: HTMLButtonElement | null = null;
    for (const o of opts) {
      const b = document.createElement('button'); b.type = 'button'; b.className = `chzs-o${o.rec ? ' rec' : ''}`; b.dataset.cloud = o.id;
      const t = document.createElement('b'); t.textContent = o.title; const n = document.createElement('span'); n.textContent = o.note;
      b.append(t, n); b.onclick = () => close(o.val); box.append(b);
      if (o.rec || !first) first = b;
    }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'chzs-x'; x.textContent = tr('Keyinroq'); x.onclick = () => close(cancel);
    box.append(x); back.append(box); document.body.append(back);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(cancel); };
    document.addEventListener('keydown', key);
    first?.focus();
    function close(v: T) { document.removeEventListener('keydown', key); back.remove(); done(v); }
  });
}

/** Ikki qurilmada oʻzgartirilgan: qaysi nusxa qolsin */
export function askConflict(name: string): Promise<'mine' | 'theirs' | null> {
  return dialog<'mine' | 'theirs' | null>('cloudConflict', tr('Loyiha boshqa qurilmada oʻzgargan'), tf('«${n}» — bulutdagi nusxa shu brauzerdagidan yangiroq.', { n: name }), [
    { id: 'theirs', title: tr('Bulutdagisini ochish'), note: tr('Shu brauzerdagi nusxa oʻchmaydi — alohida loyiha boʻlib saqlanadi'), rec: true, val: 'theirs' },
    { id: 'mine', title: tr('Shu nusxani bulutga yozish'), note: tr('Bulutdagisi eski nusxalar roʻyxatida qoladi'), val: 'mine' },
  ], null);
}

/** Loyiha ochilganda: bulutda yangiroq versiya bor */
export function askNewer(name: string): Promise<boolean> {
  return dialog<boolean>('cloudNewer', tr('Bulutda yangiroq nusxa bor'), tf('«${n}» boshqa qurilmada oʻzgartirilgan.', { n: name }), [
    { id: 'load', title: tr('Yangisini ochish'), note: tr('Shu brauzerdagi nusxa yangilanadi'), rec: true, val: true },
  ], false);
}

/** Saqlash holati matni: brauzer + bulut */
export function saveText(local: 'saved' | 'pending' | 'error', cloud: SyncState): { s: 'saved' | 'pending' | 'error'; t: string } {
  if (local === 'error') return { s: 'error', t: tr('saqlanmadi!') };
  if (local === 'pending' || cloud === 'pending' || cloud === 'syncing') return { s: 'pending', t: tr('saqlanmoqda…') };
  if (cloud === 'cloud') return { s: 'saved', t: tr('saqlandi · bulutda') };
  if (cloud === 'offline') return { s: 'pending', t: tr('saqlandi · internet yoʻq, keyin yuklanadi') };
  if (cloud === 'conflict') return { s: 'error', t: tr('boshqa qurilmada oʻzgargan — bosing') };
  if (cloud === 'error') return { s: 'error', t: tr('saqlandi · bulutga yuklanmadi') };
  return { s: 'saved', t: tr('saqlandi · shu brauzerda') };
}
