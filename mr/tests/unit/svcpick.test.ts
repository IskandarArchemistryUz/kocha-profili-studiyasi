import { describe, it, expect } from 'vitest';
import { svcList } from '../../src/ui/svcpick';

const store = (keys: string[]) => ({ length: keys.length, key: (i: number) => keys[i] ?? null });
const P = [
  { id: 'p_aaaa1', name: 'Eski', updated: '2026-11-01T00:00:00Z' },
  { id: 'p_bbbb2', name: 'Yangi', updated: '2026-11-13T00:00:00Z' },
  { id: 'p_cccc3', name: '', updated: '2026-11-10T00:00:00Z' },
];
describe('xizmat eshigi — loyihalar roʻyxati', () => {
  it('shu xizmatda ishlanganlar avval, keyin oxirgi oʻzgarganlar', () => {
    const l = svcList(P, 'joyshunos', store(['joy-state@p_aaaa1', 'ks-street@p_bbbb2', 'mr-lite']));
    expect(l.map(x => [x.id, x.used])).toEqual([['p_aaaa1', true], ['p_bbbb2', false], ['p_cccc3', false]]);
    expect(svcList(P, 'kochasoz', store(['ks-street@p_cccc3']))[0]).toMatchObject({ id: 'p_cccc3', used: true });
    expect(l[2].name).toBeTruthy();   // nomsiz — tarjima qilingan oʻrinbosar
  });
  it('localStorage yoʻq — faqat sanasi boʻyicha', () => {
    expect(svcList(P, 'render', null).map(x => x.id)).toEqual(['p_bbbb2', 'p_cccc3', 'p_aaaa1']);
  });
});
