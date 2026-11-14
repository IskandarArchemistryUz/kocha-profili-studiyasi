import { describe, it, expect } from 'vitest';
import { listSvc, createSvc, removeSvc, renameSvc, touchSvc, isSvcId } from '../../src/storage/svcprojects';

class MemLS { m = new Map<string, string>(); get length() { return this.m.size; } key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, String(v)); } removeItem(k: string) { this.m.delete(k); } }

describe('xizmatlarning oʻz loyihalari', () => {
  it('yaratish, nomlash, vaqt, oʻchirish (holati bilan); xizmatlar aralashmaydi', () => {
    const s = new MemLS();
    const a = createSvc('ks', 'Navoiy koʻchasi', s, new Date('2026-11-14T10:00:00Z'));
    const b = createSvc('joy', 'Yunusobod', s);
    expect(isSvcId(a.id)).toBe(true); expect(isSvcId('p_abc')).toBe(false);
    expect(listSvc('ks', s).map(p => p.name)).toEqual(['Navoiy koʻchasi']);
    expect(listSvc('joy', s).map(p => p.id)).toEqual([b.id]);
    renameSvc('ks', a.id, 'Amir Temur', s); touchSvc('ks', a.id, s, new Date('2026-11-14T12:00:00Z'));
    expect(listSvc('ks', s)[0]).toMatchObject({ name: 'Amir Temur', updated: '2026-11-14T12:00:00.000Z' });
    s.setItem(`ks-street@${a.id}`, '{}'); s.setItem('ks-street', 'asosiy');
    removeSvc('ks', a.id, s);
    expect(listSvc('ks', s)).toEqual([]); expect(s.getItem(`ks-street@${a.id}`)).toBeNull(); expect(s.getItem('ks-street')).toBe('asosiy');
  });
});
