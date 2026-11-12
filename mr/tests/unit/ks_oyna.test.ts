import { describe, it, expect, afterEach } from 'vitest';
import { PROFILES, profileWidth, profileById, setUserProfiles, checkProfile } from '../../src/core/profiles';
import { profileToKs, ksToProfile, type KsEl } from '../../src/kochasoz/fromMr';
import { scopeTarget } from '../../src/ui/kswin';
import { apply } from '../../src/core/commands';
import { blankProject, migrate } from '../../src/core/doc';
import { Store } from '../../src/core/store';

afterEach(() => setUserProfiles([]));

describe('Koʻchasoz → Master reja profili (teskari)', () => {
  it('har asosiy profil: MR → KS → MR qismlari va kenglik saqlanadi', () => {
    for (const p of PROFILES) {
      const k = profileToKs(p), back = ksToProfile(k, p, 'u_x', p.name);
      expect(profileWidth(back)).toBeCloseTo(profileWidth(p), 2);
      expect(back.parts.map(x => x.k)).toEqual(p.parts.map(x => x.k));
      const lanes = (q: typeof p) => q.parts.filter(x => x.k === 'qatnov').reduce((a, x) => a + (x.lanes ?? 1), 0);
      expect(lanes(back)).toBe(lanes(p));
      expect(back.cat).toBe(p.cat);
      expect(checkProfile(back).length).toBe(checkProfile(p).length);
    }
  });
  it('fasad oldi, texnik polosa — trotuarga; ariq — yashilga; asl elementlar ks da', () => {
    const els: KsEl[] = [['front', 1, {}], ['piy', 2.5, {}], ['ariq', 1.2, {}], ['velo', 1.8, {}], ['qat', 3.3, {}], ['qat', 3.3, {}], ['park', 2.5, {}], ['mebel', 0.8, {}], ['piy', 2, {}]];
    const p = ksToProfile({ els, sk: 'mh', uk: 'M1' }, PROFILES[1], 'u_1', 'X');
    expect(p.parts.map(x => [x.k, x.w, x.lanes])).toEqual([['trotuar', 3.5, undefined], ['yashil', 1.2, undefined], ['velo', 1.8, undefined], ['qatnov', 6.6, 2], ['parkovka', 2.5, undefined], ['trotuar', 2.8, undefined]]);
    expect(p.ks?.els.length).toBe(9);
    // qayta ochilganda Koʻchasoz aynan shu elementlarni oladi
    expect(profileToKs(p).els.map(e => e[0])).toEqual(els.map(e => e[0]));
  });
  it('toifa: Koʻchasoz tugmasidan (tm → tuman magistrali)', () => {
    const p = ksToProfile({ els: [['qat', 3.5, {}]], sk: 'tm' }, PROFILES[1], 'u', 'n');
    expect(p.cat).toBe('tuman-magistral');
  });
});

describe('Qoʻllanadigan joy', () => {
  const base = PROFILES[1], o = { base, label: 'Koʻcha 3', street: 's3', same: ['s1', 's3', 's4'], isUser: false };
  it('faqat shu koʻcha — yangi id; barcha — uchala koʻcha; andoza — hech qaysi', () => {
    let n = 0; const mk = () => `u_${++n}`;
    expect(scopeTarget(o, 'one', mk)).toEqual({ id: 'u_1', name: `${base.name} — Koʻcha 3`, streets: ['s3'] });
    expect(scopeTarget(o, 'all', mk).streets).toEqual(['s1', 's3', 's4']);
    expect(scopeTarget(o, 'tpl', mk).streets).toEqual([]);
  });
  it('loyiha profili — oʻz joyida yangilanadi', () => {
    const u = { ...base, id: 'u_9' };
    expect(scopeTarget({ ...o, base: u, isUser: true }, 'all').id).toBe('u_9');
    expect(scopeTarget({ ...o, base: u, isUser: true, same: ['s3'] }, 'one').id).toBe('u_9');
    expect(scopeTarget({ ...o, base: u, isUser: true }, 'one').id).not.toBe('u_9');
  });
});

describe('applyProfile buyrugʻi va hujjat', () => {
  it('profil hujjatga yoziladi, koʻchalarga beriladi, saqlanib qayta ochiladi', () => {
    let d = blankProject();
    d = { ...d, streets: [{ id: 's1', axis: [[69, 41], [69.001, 41]], profile: 'mahalla-15' }, { id: 's2', axis: [[69, 41.001], [69.001, 41.001]], profile: 'mahalla-15' }] };
    const p = ksToProfile(profileToKs(PROFILES[1]), PROFILES[1], 'u_a', 'Yangi');
    const d2 = apply(d, { type: 'applyProfile', profile: p, streets: ['s2'] });
    expect(d2.profiles?.map(x => x.id)).toEqual(['u_a']);
    expect(d2.streets.map(s => s.profile)).toEqual(['mahalla-15', 'u_a']);
    const d3 = apply(d2, { type: 'applyProfile', profile: { ...p, name: 'Yangi 2' }, streets: [] });
    expect(d3.profiles?.length).toBe(1);
    expect(d3.profiles?.[0].name).toBe('Yangi 2');
    const back = migrate(JSON.parse(JSON.stringify(d3)));
    expect(back.profiles?.[0].parts).toEqual(p.parts);
    expect(back.profiles?.[0].ks?.els.length).toBe(p.ks?.els.length);
    // Store: profileById loyiha profilini topadi, undo dan keyin — yoʻq
    const s = new Store(d);
    s.dispatch({ type: 'applyProfile', profile: p, streets: ['s1'] });
    expect(profileById('u_a').name).toBe('Yangi');
    s.undo();
    expect(profileById('u_a').id).not.toBe('u_a');
  });
  it('notoʻgʻri profil yuklanmaydi', () => {
    const d: any = JSON.parse(JSON.stringify(blankProject()));
    d.profiles = [{ id: 'u_b', name: 'x', cat: 'yoq', parts: [] }, { id: 'u_c', name: 'y', cat: 'mahalliy', parts: [{ k: 'qatnov', w: 7, lanes: 2 }, { k: 'zz', w: 1 }] }];
    const back = migrate(d);
    expect(back.profiles?.map(p => p.id)).toEqual(['u_c']);
    expect(back.profiles?.[0].parts.length).toBe(1);
  });
});
