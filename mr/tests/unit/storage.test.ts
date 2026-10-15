import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { blankProject, uid } from '../../src/core/doc';
import { Store } from '../../src/core/store';
import { putProject, getProject, listProjects, deleteProject, exportJSON, importJSON, autosave, _reset } from '../../src/storage/db';

beforeEach(async () => { await _reset(); await new Promise(ok => { const r = indexedDB.deleteDatabase('archemistry-mr'); r.onsuccess = r.onerror = r.onblocked = () => ok(null); }); });

describe('IndexedDB', () => {
  it('saqlash, oʻqish, roʻyxat, oʻchirish', async () => {
    const a = blankProject('A'), b = { ...blankProject('B'), updated: '2099-01-01T00:00:00.000Z' };
    await putProject(a); await putProject(b);
    expect((await getProject(a.id))!.name).toBe('A');
    const l = await listProjects(); expect(l.map(x => x.name)).toEqual(['B', 'A']);
    await deleteProject(a.id); expect(await getProject(a.id)).toBeNull();
  });
  it('avtosaqlash: bir nechta oʻzgarish — bitta yozuv, flush darhol', async () => {
    const s = new Store(blankProject('A')); let n = 0; const states: string[] = [];
    const sv = autosave(fn => s.subscribe(c => fn(c.doc)), st => states.push(st), 10_000, async d => { n++; await putProject(d); });
    s.dispatch({ type: 'rename', name: 'B' }); s.dispatch({ type: 'rename', name: 'C' });
    expect(sv.state).toBe('pending'); await sv.flush(); expect(n).toBe(1);
    expect((await getProject(s.doc.id))!.name).toBe('C'); expect(states.at(-1)).toBe('saved'); sv.dispose();
  });
});

describe('fayl', () => {
  it('eksport → import nusxa beradi', () => {
    const a = blankProject('Fitrat');
    const b = importJSON(exportJSON(a), () => uid('p_'));
    expect(b.name).toBe('Fitrat'); expect(b.id).not.toBe(a.id);
    expect(() => importJSON('{"kind":"boshqa"}', () => 'x')).toThrow();
    expect(() => importJSON('emas json', () => 'x')).toThrow();
  });
});
