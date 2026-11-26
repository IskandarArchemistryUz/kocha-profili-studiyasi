import { describe, it, expect } from 'vitest';
import { isForeignErr } from '../../src/core/foreign_err';

describe('ilova ichidagi brauzer xatolari', () => {
  it('WebView koʻprigi xatosi hisobga olinmaydi', () => {
    expect(isForeignErr('Uncaught ReferenceError: WebViewJavascriptBridge is not defined')).toBe(true);
    expect(isForeignErr("TypeError: undefined is not an object (evaluating '__gCrWeb.message')")).toBe(true);
  });
  it('oʻz xatolarimiz qoladi', () => {
    expect(isForeignErr("Uncaught TypeError: Cannot read properties of undefined (reading 'x')")).toBe(false);
  });
});
