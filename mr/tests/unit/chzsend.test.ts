import { describe, it, expect, beforeEach } from 'vitest';
import { chzTarget, suggestSame } from '../../src/ui/chzsend';
import type { MrReturn } from '../../src/ui/mrback';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as any).sessionStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
});
const R = (o: Partial<MrReturn>): MrReturn => ({ id: 'p_A', name: 'A', step: 'hajm', cam: null, at: Date.now(), ...o });

describe('Chizmadonga yuborish: qaysi loyihaga', () => {
  it('Master rejadan kelinmagan — har doim yangi alohida loyiha (oyna chiqmaydi)', async () => {
    expect(await chzTarget('Joyshunos · Parij', [2.35, 48.85])).toEqual({ target: 'new', newName: 'Joyshunos · Parij', center: [2.35, 48.85] });
  });
  it('tavsiya: uchastkali loyiha hududida — shu loyiha; uzoqda — yangi', () => {
    expect(suggestSame(R({ origin: [69.28, 41.31], hasSite: true }), [69.29, 41.32])).toBe(true);
    expect(suggestSame(R({ origin: [69.28, 41.31], hasSite: true }), [66.96, 39.65])).toBe(false);
  });
  it('tavsiya: uchastkasiz yangi loyiha (markazi sukut — Toshkent) — Toshkentdagi tahlil ham yangi loyihaga', () => {
    expect(suggestSame(R({ origin: [69.2797, 41.3111], hasSite: false }), [69.282, 41.299])).toBe(false);
    expect(suggestSame(R({}), [69.282, 41.299])).toBe(false);   // eski mr-return (markazsiz)
  });
  it('joyi nomaʼlum varaq (Render) — kelingan loyiha tavsiya', () => {
    expect(suggestSame(R({ origin: [69.28, 41.31], hasSite: true }))).toBe(true);
  });
});
