import { describe, it, expect } from 'vitest';
import { kioskPropose, kioskChecks, KIOSK_NOTE } from '../../src/kochasoz/kiosk';

type E = [string, number, Record<string, unknown>];
// fasad | B3 front 3 | piy 4 | yash 4 | qat 3,5 | qat 3,5 | yash 2,5 | piy 4 | front 3 | fasad
const els: E[] = [['front', 3, {}], ['piy', 4, {}], ['yash', 4, {}], ['qat', 3.5, {}], ['qat', 3.5, {}], ['yash', 4, {}], ['piy', 4, {}], ['front', 3, {}]];

describe('Kiosk joylari (Dizayn-kod 2-ilova P2.2 11.4, P2.3 4.4)', () => {
  it('U1: faqat B2 (yashil bufer) — yoʻl chetidan 1,5 m chekinish; har tomonda bittadan (oraliq 50 m)', () => {
    const add = kioskPropose(els, [], 'U1', 60);
    expect(add.map(a => a.z).sort()).toEqual([2, 5]);
    expect(add.every(a => a.t === 'kiosk' && a.l === 3)).toBe(true);
  });
  it('U3: B3 fasad oldida; U5: oraliq 5 m — koʻp joy', () => {
    expect(kioskPropose(els, [], 'U3', 60).map(a => a.z).sort()).toEqual([0, 7]);
    const u5 = [['yash', 6, {}], ['piy', 6, {}], ['med', 6, {}], ['piy', 6, {}], ['yash', 6, {}]] as E[];
    // chap yashil zona fasaddan 5 m talabida sigʻmaydi; oʻngda alleya (ajratuvchi 6 m ≥ 5 m, 110-band) — 5 m oraliq bilan
    const p5 = kioskPropose(u5, [], 'U5', 60);
    expect(p5.length).toBeGreaterThanOrEqual(6); expect(p5.every(a => a.z === 2)).toBe(true);
  });
  it('B2 2,5 m — yoʻl chetidan 1,5 m qolgach kiosk sigʻmaydi (U1)', () => {
    const narrow = els.map(e => (e[0] === 'yash' ? ['yash', 2.5, {}] : e)) as E[];
    expect(kioskPropose(narrow, [], 'U1', 60)).toEqual([]);
  });
  it('tekshiruv: U1 da pavilyon taqiqlangan, oraliq 50 m dan kam — bad; piyodalar zonasi 4 m', () => {
    const pl = [{ t: 'pavilyon', z: 2, y: 5, l: 6.6 }, { t: 'kiosk', z: 2, y: 20, l: 3 }];
    const r = kioskChecks(els, pl, 'U1', 3, 4);
    expect(r.find(x => x.n.startsWith('Pavilyon'))!.st).toBe('bad');
    expect(r.find(x => x.n.startsWith('Kiosklar orasidagi'))!.st).toBe('bad');
    expect(r.find(x => x.n.includes('piyodalar zonasi'))!.st).toBe('ok');
  });
  it('ochiq peshtaxta: U2 da taqiqlangan, U4 da faqat vaqtinchalik', () => {
    const pl = [{ t: 'peshtaxta', z: 0, y: 5, l: 2.1 }];
    expect(kioskChecks(els, pl, 'U2', 3, 4)[0].st).toBe('bad');
    expect(kioskChecks(els, pl, 'U4', 3, 4)[0].st).toBe('warn');
    expect(KIOSK_NOTE('U1')).toContain('P2.2 11.4.1');
  });
});
