import { describe, it, expect, beforeEach } from 'vitest';
import { chzTarget } from '../../src/ui/chzsend';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as any).sessionStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
});
const ret = (origin?: [number, number]) => mem.set('mr-return', JSON.stringify({ id: 'p_A', name: 'A', step: 'hajm', cam: null, at: Date.now(), origin }));

describe('Chizmadonga yuborish: qaysi loyihaga', () => {
  it('Master rejadan kelinmagan — har doim yangi alohida loyiha', () => {
    expect(chzTarget('Joyshunos · Parij', [2.35, 48.85])).toEqual({ target: 'new', newName: 'Joyshunos · Parij', center: [2.35, 48.85] });
  });
  it('loyiha hududida (≤ 3 km) — shu loyihaga', () => {
    ret([69.28, 41.31]);
    expect(chzTarget('x', [69.29, 41.32])).toEqual({ target: 'p_A' });
  });
  it('boshqa joy tahlil qilingan — loyihaga aralashmaydi, yangi loyiha', () => {
    ret([69.28, 41.31]);
    expect(chzTarget('Joyshunos · Samarqand', [66.96, 39.65]).target).toBe('new');
  });
  it('joyi nomaʼlum varaq (Render) — kelingan loyihaga', () => {
    ret([69.28, 41.31]);
    expect(chzTarget('Render · fasad').target).toBe('p_A');
  });
});
