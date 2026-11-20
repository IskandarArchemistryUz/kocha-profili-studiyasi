import { describe, it, expect } from 'vitest';
import { projectMaterials } from '../../src/chizmadon/materials';

describe('Chizmadon: meʼyoriy tekshiruv jadvali (20.11)', () => {
  const normt = [['Aholi zichligi', 'ShNQ 2.07.01-23, 84-band', '≤ 400', '332 kishi/ga', 'pass'], ['Avtoturargoh', 'ShNQ 2.07.01-23, 416-band', '6624', '422 joy', 'fail']];
  it('normt berilsa «p:norm» jadval materiali paydo boʻladi va natijalar rangli yoziladi', () => {
    const m = projectMaterials({ normt }, {}, true).find(x => x.id === 'p:norm');
    expect(m?.role).toBe('table');
    const svg = m!.render!({ x: 0, y: 0, w: 380, h: 220 }, { u: 1, P: {} } as never, false);
    expect(svg).toContain('mos emas');
    expect(svg).toContain('#c23b30');
    expect(svg).toContain('✓ 1   ✗ 1');
  });
  it('normt boʻsh — material yoʻq', () => {
    expect(projectMaterials({}, {}, true).some(x => x.id === 'p:norm')).toBe(false);
  });
});
