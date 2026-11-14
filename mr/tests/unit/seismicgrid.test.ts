import { describe, it, expect } from 'vitest';
import { cellBall } from '../../src/core/seismicgrid';

describe('GSHAP ball toʻri (0,5°)', () => {
  const g = new Uint8Array(720 * 360);
  // Santyago (−70,67; −33,45) → qator floor((90+33,45)/0,5)=246, ustun floor((180−70,67)/0,5)=218
  g[246 * 720 + 218] = 9;
  it('katak qiymati va maʼlumot yoʻq — null', () => {
    expect(cellBall(g, -70.67, -33.45)).toBe(9);
    expect(cellBall(g, 13.4, 52.5)).toBeNull();
    expect(cellBall(new Uint8Array(10), 0, 0)).toBeNull();
  });
  it('180° chegarasi va qutblar xatosiz', () => {
    expect(() => cellBall(g, 180, 90)).not.toThrow();
    expect(() => cellBall(g, -180, -90)).not.toThrow();
  });
});
