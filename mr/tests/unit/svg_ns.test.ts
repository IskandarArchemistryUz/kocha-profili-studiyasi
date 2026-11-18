import { describe, it, expect } from 'vitest';
import { withNs } from '../../src/core/wm';

describe('withNs (18.11: PDF da xaritali varaqlar boʻsh chiqardi)', () => {
  it('ichki inkscape: qatlami boʻlsa — ildizga nomlar maydoni qoʻshiladi', () => {
    const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><svg><g inkscape:groupmode="layer" inkscape:label="A"/></svg></svg>';
    const o = withNs(s);
    expect(o).toContain('xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"');
    expect(o.match(/xmlns:inkscape=/g)).toHaveLength(1);
    expect(withNs(o)).toBe(o);
  });
  it('kerak boʻlmasa — oʻzgarmaydi', () => {
    const s = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    expect(withNs(s)).toBe(s);
  });
});
