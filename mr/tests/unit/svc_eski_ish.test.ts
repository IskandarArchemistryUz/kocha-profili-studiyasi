import { describe, it, expect } from 'vitest';
import { migrateOld, listSvc, isLegacySvc } from '../../src/storage/svcprojects';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }, m }; };
const idbMem = () => { const m = new Map<string, unknown>(); return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: unknown) => void m.set(k, v), m }; };

describe('eski (loyihasiz) ish — bir marta nomli loyihaga (22.11)', () => {
  it('Koʻchasoz: umumiy kalitlar loyihaga nusxalanadi, ikkinchi marta koʻchirilmaydi', async () => {
    const st = mem(), db = idbMem();
    st.setItem('ks-b', '{"bL":4}'); st.setItem('ks-street', '{"PL":1}'); st.setItem('ks-exp-opts', '{}');
    const p = (await migrateOld('ks', 'Koʻchasoz — eski ish', db, st))!;
    expect(p.legacy).toBe(true);
    expect(st.getItem(`ks-b@${p.id}`)).toBe('{"bL":4}');
    expect(st.getItem(`ks-street@${p.id}`)).toBe('{"PL":1}');
    expect(st.getItem(`ks-exp-opts@${p.id}`)).toBeNull();   // sozlama — loyiha holati emas
    expect(isLegacySvc('ks', p.id, st)).toBe(true);
    expect(await migrateOld('ks', 'x', db, st)).toBeNull();
    expect(listSvc('ks', st)).toHaveLength(1);
  });
  it('Render: IndexedDB manba va natijalari ham; boʻsh boʻlsa loyiha yaratilmaydi', async () => {
    const st = mem(), db = idbMem();
    expect(await migrateOld('ren', 'Render — eski ish', db, st)).toBeNull();
    expect(listSvc('ren', st)).toHaveLength(0);
    const st2 = mem(), db2 = idbMem(); db2.m.set('render-src', [{ id: 's1' }]);
    const p = (await migrateOld('ren', 'Render — eski ish', db2, st2))!;
    expect(db2.m.get(`render-src@${p.id}`)).toEqual([{ id: 's1' }]);
  });
});
