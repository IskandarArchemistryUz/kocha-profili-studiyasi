// @ts-nocheck
/* Koʻchasoz · KS-Grafika — kanvas maketidagi (Archemistry Lab, «Koʻchasoz» sahifasi, KS-Grafika.dc.html) mantiq aynan koʻchirilgan.
   Hisob-kitob va chizma shu yerda; qobiq, saqlash, til va tungi rejim — ../dc.ts va ../main.ts. */
import { DCLogic } from '../dc';
import UA_ from './ua.json';
export default class Component extends DCLogic {
  constructor(p) { super(p); this.state = { gfx: 0 }; }
  renderVals() {
    var s = this.state, self = this;

    function __split(r) { Object.keys(r).forEach(function (k) { var v = r[k]; if (!Array.isArray(v) || !/(txt|T)$/.test(k)) return; r[k + '_m'] = v.filter(function (t) { return !t.a || t.a === 'middle'; }); r[k + '_s'] = v.filter(function (t) { return t.a === 'start'; }); r[k + '_e'] = v.filter(function (t) { return t.a === 'end'; }); }); return r; }
    var __r = (function () {
    var UA = UA_;
    // ===== Archemistry grafik kutubxonasi (original, metrda chiziladi) =====
    function F1(v) { return (Math.round(v * 10) / 10).toString(); }
    function Pp(pts, open) { return 'M' + pts.map(function (p) { return F1(p[0]) + ' ' + F1(p[1]); }).join('L') + (open ? '' : 'Z'); }
    function El(cx, cy, rx, ry) { return 'M' + F1(cx - rx) + ' ' + F1(cy) + 'a' + F1(rx) + ' ' + F1(ry) + ' 0 1 0 ' + F1(2 * rx) + ' 0a' + F1(rx) + ' ' + F1(ry) + ' 0 1 0 ' + F1(-2 * rx) + ' 0'; }
    function Rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return 'M' + F1(x + r) + ' ' + F1(y) + 'h' + F1(w - 2 * r) + 'q' + F1(r) + ' 0 ' + F1(r) + ' ' + F1(r) + 'v' + F1(h - 2 * r) + 'q0 ' + F1(r) + ' ' + F1(-r) + ' ' + F1(r) + 'h' + F1(-(w - 2 * r)) + 'q' + F1(-r) + ' 0 ' + F1(-r) + ' ' + F1(-r) + 'v' + F1(-(h - 2 * r)) + 'q0 ' + F1(-r) + ' ' + F1(r) + ' ' + F1(-r) + 'Z'; }
    var GR = ['#9fbd86', '#b8cf98', '#88ab73', '#c9d9ad', '#7fa36c'];
    // L = { line: bool, ink: '#..', add: fn(d, fill, stroke, w, o) }
    var UK = 1.78 / 165;
    function uaDraw(L, nm, x, y, s, flip, fill, stroke, sw, op) { var a = UA[nm]; if (!a) return; var tr = 'translate(' + F1(x) + ' ' + F1(y) + ') scale(' + (flip ? -s : s).toFixed(4) + ' ' + s.toFixed(4) + ') translate(' + (-a.ox) + ' ' + (-a.oy) + ')'; a.d.forEach(function (p) { L.add(p[0], p[1] ? '#ffffff' : fill, stroke || null, sw ? sw / s : 0, op == null ? 1 : op, '', tr); }); }
    var AS = {
      ua: function (L, nm, x, y, px, flip, col) { var a = UA[nm]; if (a) uaDraw(L, nm, x, y, UK * px, flip, col || L.ink); },
      uaT: function (L, nm, x, y, hm, px, seed, flip) { var a = UA[nm]; if (!a) return; var s = hm * px / a.h; if (L.line) uaDraw(L, nm, x, y, s, flip, '#ffffff', L.ink, 0.7, 1); else uaDraw(L, nm, x, y, s, flip, ['#8fae78', '#a3bf88', '#7fa06b', '#b2c995'][(seed || 0) % 4], null, 0, 0.88); },
      // --- KESIM: odamlar (yon koʻrinish, siluet) ---
      odam: function (L, x, y, k, pose, flip, c0) {
        var f = flip ? -1 : 1, H = pose === 'bola' ? 0.62 : 1, ink = c0 || L.ink;
        var fill = L.line ? '#ffffff' : ink, st = L.line ? ink : 'none', sw = L.line ? 0.9 : 0;
        function q(dx, dy) { return [x + f * dx * k * H, y - dy * k * H]; }
        var lw = Math.max(1.3, 0.085 * k * H) * (L.line ? 0.55 : 1), sit = pose === 'oʻtirgan', hy = sit ? 1.22 : 1.63, ty = sit ? 0.42 : 0;
        L.add(El(q(0.01, hy)[0], q(0, hy)[1], 0.1 * k * H, 0.118 * k * H), fill, st, sw);
        if (pose === 'koʻylak') L.add(Pp([q(-0.1, 1.49), q(0.1, 1.49), q(0.13, 1.02), q(0.27, 0.36), q(-0.21, 0.36), q(-0.12, 1.02)]), fill, st, sw);
        else L.add(Pp([q(-0.15, 1.48 - ty), q(0.13, 1.48 - ty), q(0.11, 0.9 - ty), q(-0.11, 0.9 - ty)]), fill, st, sw);
        var legs, arms;
        if (sit) { legs = 'M' + q(0, 0.5)[0] + ' ' + q(0, 0.5)[1] + 'L' + q(0.42, 0.47)[0] + ' ' + q(0.42, 0.47)[1] + 'L' + q(0.44, 0)[0] + ' ' + q(0.44, 0)[1]; arms = 'M' + q(0.08, 1.0)[0] + ' ' + q(0.08, 1.0)[1] + 'L' + q(0.3, 0.6)[0] + ' ' + q(0.3, 0.6)[1]; }
        else if (pose === 'yurgan' || pose === 'bola') { legs = 'M' + q(-0.03, 0.92)[0] + ' ' + q(-0.03, 0.92)[1] + 'L' + q(-0.25, 0)[0] + ' ' + q(-0.25, 0)[1] + 'M' + q(0.04, 0.92)[0] + ' ' + q(0.04, 0.92)[1] + 'L' + q(0.22, 0)[0] + ' ' + q(0.22, 0)[1]; arms = 'M' + q(0.1, 1.42)[0] + ' ' + q(0.1, 1.42)[1] + 'L' + q(0.25, 0.96)[0] + ' ' + q(0.25, 0.96)[1] + 'M' + q(-0.11, 1.42)[0] + ' ' + q(-0.11, 1.42)[1] + 'L' + q(-0.22, 0.99)[0] + ' ' + q(-0.22, 0.99)[1]; }
        else if (pose === 'koʻylak') { legs = 'M' + q(-0.06, 0.36)[0] + ' ' + q(-0.06, 0.36)[1] + 'L' + q(-0.08, 0)[0] + ' ' + q(-0.08, 0)[1] + 'M' + q(0.08, 0.36)[0] + ' ' + q(0.08, 0.36)[1] + 'L' + q(0.12, 0)[0] + ' ' + q(0.12, 0)[1]; arms = 'M' + q(0.08, 1.43)[0] + ' ' + q(0.08, 1.43)[1] + 'L' + q(0.17, 0.98)[0] + ' ' + q(0.17, 0.98)[1]; }
        else if (pose === 'qoʻl') { legs = 'M' + q(-0.05, 0.92)[0] + ' ' + q(-0.05, 0.92)[1] + 'L' + q(-0.06, 0)[0] + ' ' + q(-0.06, 0)[1] + 'M' + q(0.05, 0.92)[0] + ' ' + q(0.05, 0.92)[1] + 'L' + q(0.07, 0)[0] + ' ' + q(0.07, 0)[1]; arms = 'M' + q(0.12, 1.44)[0] + ' ' + q(0.12, 1.44)[1] + 'L' + q(0.3, 1.86)[0] + ' ' + q(0.3, 1.86)[1]; }
        else { legs = 'M' + q(-0.05, 0.92)[0] + ' ' + q(-0.05, 0.92)[1] + 'L' + q(-0.06, 0)[0] + ' ' + q(-0.06, 0)[1] + 'M' + q(0.05, 0.92)[0] + ' ' + q(0.05, 0.92)[1] + 'L' + q(0.07, 0)[0] + ' ' + q(0.07, 0)[1]; arms = 'M' + q(0.13, 1.43)[0] + ' ' + q(0.13, 1.43)[1] + 'L' + q(0.15, 0.93)[0] + ' ' + q(0.15, 0.93)[1]; }
        L.add(legs, 'none', ink, lw); L.add(arms, 'none', ink, lw * 0.85);
        if (pose === 'it') { var dx0 = 0.55; L.add(Pp([q(dx0, 0.32), q(dx0 + 0.45, 0.32), q(dx0 + 0.5, 0.42), q(dx0 + 0.58, 0.4), q(dx0 + 0.52, 0.28), q(dx0 + 0.45, 0.18), q(dx0 + 0.05, 0.18)]), fill, st, sw); L.add('M' + q(dx0 + 0.08, 0.2)[0] + ' ' + q(0, 0.2)[1] + 'L' + q(dx0 + 0.08, 0)[0] + ' ' + q(0, 0)[1] + 'M' + q(dx0 + 0.42, 0.2)[0] + ' ' + q(0, 0.2)[1] + 'L' + q(dx0 + 0.42, 0)[0] + ' ' + q(0, 0)[1] + 'M' + q(0.25, 0.96)[0] + ' ' + q(0, 0.96)[1] + 'Q' + q(0.45, 0.4)[0] + ' ' + q(0, 0.4)[1] + ' ' + q(dx0 + 0.5, 0.4)[0] + ' ' + q(0, 0.4)[1], 'none', ink, 0.8); }
      },
      // velosipedchi orqadan (kesimda)
      velochi: function (L, x, y, k) {
        var ink = L.ink, fill = L.line ? '#ffffff' : ink, st = L.line ? ink : 'none';
        function q(dx, dy) { return [x + dx * k, y - dy * k]; }
        L.add(El(x, q(0, 0.35)[1], 0.035 * k + 0.6, 0.35 * k), 'none', ink, Math.max(1, 0.05 * k));
        L.add('M' + q(-0.24, 1.0)[0] + ' ' + q(0, 1.0)[1] + 'L' + q(0.24, 1.0)[0] + ' ' + q(0, 1.0)[1] + 'M' + x + ' ' + q(0, 0.7)[1] + 'V' + q(0, 1.0)[1], 'none', ink, Math.max(1, 0.05 * k));
        L.add(Pp([q(-0.19, 1.52), q(0.19, 1.52), q(0.14, 0.95), q(-0.14, 0.95)]), fill, st, 0.9);
        L.add(El(x, q(0, 1.72)[1], 0.11 * k, 0.12 * k), fill, st, 0.9);
        L.add('M' + q(-0.1, 0.95)[0] + ' ' + q(0, 0.95)[1] + 'L' + q(-0.11, 0.42)[0] + ' ' + q(0, 0.42)[1] + 'M' + q(0.1, 0.95)[0] + ' ' + q(0, 0.95)[1] + 'L' + q(0.12, 0.62)[0] + ' ' + q(0, 0.62)[1] + 'M' + q(-0.17, 1.45)[0] + ' ' + q(0, 1.45)[1] + 'L' + q(-0.24, 1.02)[0] + ' ' + q(0, 1.02)[1] + 'M' + q(0.17, 1.45)[0] + ' ' + q(0, 1.45)[1] + 'L' + q(0.24, 1.02)[0] + ' ' + q(0, 1.02)[1], 'none', ink, Math.max(1.2, 0.08 * k));
      },
      // --- KESIM: daraxtlar ---
      daraxt: function (L, x, y, k, t, seed) {
        var S = { chinor: [14, 11], yumaloq: [9, 7], terak: [17, 3.4], archa: [9, 4.2], kichik: [5.5, 4] }[t] || [9, 7], H = S[0], W = S[1], s = seed || 0;
        function q(dx, dy) { return [x + dx * k, y - dy * k]; }
        var tc = L.line ? L.ink : '#6f6252';
        L.add('M' + x + ' ' + y + 'L' + x + ' ' + q(0, H * 0.45)[1], 'none', tc, Math.max(1.4, 0.3 * k));
        var C;
        if (t === 'chinor') C = [[-0.3, 0.6, 0.36, 0.25], [0.3, 0.64, 0.38, 0.26], [0, 0.8, 0.4, 0.2], [-0.05, 0.52, 0.28, 0.16]];
        else if (t === 'terak') C = [[0, 0.58, 0.5, 0.42], [0.08, 0.66, 0.3, 0.28]];
        else if (t === 'kichik') C = [[0, 0.66, 0.5, 0.34], [-0.12, 0.6, 0.3, 0.22]];
        else C = [[0, 0.62, 0.5, 0.38], [0.18, 0.7, 0.3, 0.24], [-0.2, 0.55, 0.26, 0.2]];
        if (t === 'archa') { L.add(Pp([q(0, H), q(W * 0.5, H * 0.16), q(-W * 0.5, H * 0.16)]), L.line ? 'none' : GR[4], L.line ? L.ink : '#6f8f5c', 0.8, L.line ? 1 : 0.8); L.add(Pp([q(0, H * 0.82), q(W * 0.32, H * 0.3), q(-W * 0.32, H * 0.3)]), 'none', L.line ? L.ink : '#6f8f5c', 0.5, 0.6); return; }
        C.forEach(function (c, i) { var cc = q(c[0] * W, c[1] * H); L.add(El(cc[0], cc[1], c[2] * W * k, c[3] * H * k), L.line ? 'none' : GR[(i + s) % 4], L.line ? L.ink : '#7d9c69', L.line ? 0.8 : 0.6, L.line ? 1 : 0.62); });
        if (L.line) { var tp = q(0, H * 0.45); [-0.3, 0.25, 0.05].forEach(function (a) { L.add('M' + tp[0] + ' ' + tp[1] + 'L' + q(a * W, H * 0.7)[0] + ' ' + q(0, H * 0.7)[1], 'none', L.ink, 0.6); }); }
      },
      buta: function (L, x, y, k, w) { var n = Math.max(2, Math.round(w / 0.9)); for (var i = 0; i < n; i++) { var cx = x - w * k / 2 + (i + 0.5) * w * k / n; L.add(El(cx, y - 0.32 * k, w * k / n * 0.62, 0.36 * k), L.line ? 'none' : GR[(i + 1) % 4], L.line ? L.ink : '#7d9c69', 0.6, L.line ? 1 : 0.7); } },
      // --- KESIM: transport (old/orqa koʻrinish) ---
      mashina: function (L, x, y, k, col) {
        function q(dx, dy) { return [x + dx * k, y - dy * k]; }
        var bf = L.line ? '#ffffff' : (col || '#ffffff');
        L.add(Rr(q(-0.12 - 0.78, 0)[0], q(0, 0.36)[1], 0.18 * k, 0.36 * k, 2), L.ink, null, 0); L.add(Rr(q(0.72, 0)[0], q(0, 0.36)[1], 0.18 * k, 0.36 * k, 2), L.ink, null, 0);
        L.add(Rr(q(-0.9, 0)[0], q(0, 0.9)[1], 1.8 * k, 0.6 * k, 0.15 * k), bf, L.ink, 1);
        L.add(Pp([q(-0.72, 0.9), q(-0.56, 1.45), q(0.56, 1.45), q(0.72, 0.9)]), bf, L.ink, 1);
        L.add(Pp([q(-0.62, 0.93), q(-0.5, 1.38), q(0.5, 1.38), q(0.62, 0.93)]), L.line ? '#ffffff' : '#dbe6ef', L.ink, 0.6);
        L.add(El(q(-0.6, 0)[0], q(0, 0.72)[1], 0.11 * k, 0.07 * k) + El(q(0.6, 0)[0], q(0, 0.72)[1], 0.11 * k, 0.07 * k), '#ffffff', L.ink, 0.6);
      },
      avtobus: function (L, x, y, k) {
        function q(dx, dy) { return [x + dx * k, y - dy * k]; }
        L.add(Rr(q(-1.15, 0)[0], q(0, 0.4)[1], 0.3 * k, 0.4 * k, 2) + Rr(q(0.85, 0)[0], q(0, 0.4)[1], 0.3 * k, 0.4 * k, 2), L.ink, null, 0);
        L.add(Rr(q(-1.27, 0)[0], q(0, 3.1)[1], 2.55 * k, 2.8 * k, 0.25 * k), L.line ? '#ffffff' : '#f2e3c2', L.ink, 1);
        L.add(Rr(q(-1.1, 0)[0], q(0, 2.7)[1], 2.2 * k, 1.35 * k, 0.12 * k), L.line ? '#ffffff' : '#dbe6ef', L.ink, 0.7);
        L.add(Rr(q(-0.7, 0)[0], q(0, 3.0)[1], 1.4 * k, 0.22 * k, 2), L.line ? '#ffffff' : '#2b2a28', L.ink, 0.6);
        L.add('M' + q(-1.1, 0)[0] + ' ' + q(0, 0.75)[1] + 'h' + 2.2 * k, 'none', L.ink, 0.6);
      },
      tramvay: function (L, x, y, k) {
        function q(dx, dy) { return [x + dx * k, y - dy * k]; }
        L.add(Rr(q(-1.0, 0)[0], q(0, 0.35)[1], 0.35 * k, 0.35 * k, 2) + Rr(q(0.65, 0)[0], q(0, 0.35)[1], 0.35 * k, 0.35 * k, 2), L.ink, null, 0);
        L.add(Pp([q(-1.33, 0.35), q(-1.33, 3.1), q(-1.1, 3.45), q(1.1, 3.45), q(1.33, 3.1), q(1.33, 0.35)]), '#ffffff', L.ink, 1);
        L.add(Rr(q(-1.12, 0)[0], q(0, 3.0)[1], 2.24 * k, 1.5 * k, 0.15 * k), L.line ? '#ffffff' : '#dbe6ef', L.ink, 0.7);
        L.add(Rr(q(-0.6, 0)[0], q(0, 3.3)[1], 1.2 * k, 0.2 * k, 2), L.line ? '#ffffff' : '#2b2a28', L.ink, 0.5);
        L.add('M' + q(-1.33, 0)[0] + ' ' + q(0, 1.2)[1] + 'h' + 2.66 * k, 'none', L.line ? L.ink : '#c0392b', L.line ? 0.6 : 1.6);
        L.add('M' + q(-0.3, 3.45)[0] + ' ' + q(0, 3.45)[1] + 'L' + q(0.35, 4.6)[0] + ' ' + q(0, 4.6)[1] + 'L' + q(-0.3, 5.7)[0] + ' ' + q(0, 5.7)[1] + 'M' + q(-0.6, 5.7)[0] + ' ' + q(0, 5.7)[1] + 'h' + 1.2 * k, 'none', L.ink, 1);
      },
      // --- KESIM: jihozlar ---
      fonar: function (L, x, y, k, dir, h) { h = h || 9; function q(dx, dy) { return [x + dx * k, y - dy * k]; } var c = L.line ? L.ink : '#4a4844'; L.add('M' + x + ' ' + y + 'V' + q(0, h)[1] + 'Q' + x + ' ' + q(0, h + 0.5)[1] + ' ' + q(dir * 0.6, h + 0.5)[0] + ' ' + q(0, h + 0.5)[1] + 'H' + q(dir * 1.5, 0)[0], 'none', c, Math.max(1.2, 0.14 * k)); L.add(Rr(Math.min(q(dir * 1.2, 0)[0], q(dir * 2.0, 0)[0]), q(0, h + 0.62)[1], 0.8 * k, 0.2 * k, 2), c, null, 0); if (!L.line) L.add(Pp([q(dir * 1.25, h + 0.42), q(dir * 1.95, h + 0.42), q(dir * 3.2, 0.05), q(dir * 0.1, 0.05)]), '#f6d77a', null, 0, 0.16); },
      piyfonar: function (L, x, y, k) { function q(dx, dy) { return [x + dx * k, y - dy * k]; } var c = L.line ? L.ink : '#4a4844'; L.add('M' + x + ' ' + y + 'V' + q(0, 4.2)[1], 'none', c, Math.max(1, 0.1 * k)); L.add(Rr(q(-0.18, 0)[0], q(0, 4.7)[1], 0.36 * k, 0.5 * k, 2), L.line ? '#ffffff' : '#f6e3a6', c, 0.8); },
      orindiq: function (L, x, y, k) { function q(dx, dy) { return [x + dx * k, y - dy * k]; } L.add('M' + q(-0.25, 0)[0] + ' ' + y + 'V' + q(0, 0.45)[1] + 'H' + q(0.3, 0)[0] + 'V' + y + 'M' + q(-0.25, 0)[0] + ' ' + q(0, 0.45)[1] + 'L' + q(-0.32, 0.85)[1 - 1] + ' ' + q(0, 0.85)[1], 'none', L.ink, Math.max(1.1, 0.07 * k)); },
      axlat: function (L, x, y, k) { function q(dx, dy) { return [x + dx * k, y - dy * k]; } L.add(Rr(q(-0.2, 0)[0], q(0, 0.85)[1], 0.4 * k, 0.85 * k, 2), L.line ? '#ffffff' : '#8f8a80', L.ink, 0.8); },
      soyabon: function (L, x, y, k) { function q(dx, dy) { return [x + dx * k, y - dy * k]; } L.add('M' + x + ' ' + y + 'V' + q(0, 2.4)[1], 'none', L.ink, 1); L.add(Pp([q(-1.3, 2.0), q(0, 2.5), q(1.3, 2.0)]), L.line ? '#ffffff' : '#efe2c6', L.ink, 0.8); L.add('M' + q(-0.4, 0)[0] + ' ' + y + 'V' + q(0, 0.75)[1] + 'H' + q(0.4, 0)[0] + 'V' + y + 'M' + q(-0.55, 0)[0] + ' ' + y + 'V' + q(0, 0.45)[1] + 'H' + q(-0.8, 0)[0] + 'M' + q(-0.8, 0)[0] + ' ' + y + 'V' + q(0, 0.9)[1] + 'M' + q(0.55, 0)[0] + ' ' + y + 'V' + q(0, 0.45)[1] + 'H' + q(0.8, 0)[0] + 'M' + q(0.8, 0)[0] + ' ' + y + 'V' + q(0, 0.9)[1], 'none', L.ink, 0.9); },
      bekat: function (L, x, y, k, dir) { function q(dx, dy) { return [x + dx * k, y - dy * k]; } L.add('M' + q(-dir * 0.8, 0)[0] + ' ' + y + 'V' + q(0, 2.6)[1] + 'L' + q(dir * 1.0, 2.75)[0] + ' ' + q(0, 2.75)[1], 'none', L.ink, Math.max(1.2, 0.08 * k)); L.add(Pp([q(-dir * 0.8, 0.15), q(-dir * 0.8, 2.5), q(-dir * 0.7, 2.5), q(-dir * 0.7, 0.15)]), L.line ? '#ffffff' : '#cfe0ea', L.ink, 0.6); L.add('M' + q(-dir * 0.7, 0)[0] + ' ' + q(0, 0.45)[1] + 'H' + q(-dir * 0.2, 0)[0], 'none', L.ink, 1.2); },
      // --- REJA: yuqoridan ---
      pMashina: function (L, x, y, k, up, col) { var w = 1.8 * k, h = 4.5 * k, x0 = x - w / 2, y0 = y - h / 2, s = up ? 1 : -1; L.add(Rr(x0, y0, w, h, 0.35 * k), L.line ? '#ffffff' : (col || '#ffffff'), L.ink, 0.9); var wy = y - s * 0.55 * k; L.add(Pp([[x0 + 0.15 * k, wy - s * 0.1 * k], [x0 + w - 0.15 * k, wy - s * 0.1 * k], [x0 + w - 0.25 * k, wy + s * 0.45 * k], [x0 + 0.25 * k, wy + s * 0.45 * k]]), L.line ? '#ffffff' : '#c9d6e0', L.ink, 0.6); L.add(Rr(x0 + 0.22 * k, y - (up ? -0.1 : 1.2) * k, w - 0.44 * k, 1.1 * k, 0.12 * k), 'none', L.ink, 0.5); },
      pAvtobus: function (L, x, y, k, up) { var w = 2.55 * k, h = 12 * k, x0 = x - w / 2, y0 = y - h / 2; L.add(Rr(x0, y0, w, h, 0.3 * k), L.line ? '#ffffff' : '#f2e3c2', L.ink, 0.9); [0.25, 0.5].forEach(function (f) { L.add(Rr(x - 0.6 * k, y0 + h * f, 1.2 * k, 1.6 * k, 2), 'none', L.ink, 0.6); }); L.add('M' + x0 + ' ' + (up ? y0 + 0.5 * k : y0 + h - 0.5 * k) + 'h' + w, 'none', L.ink, 1.2); },
      pTramvay: function (L, x, y, k, len) { var w = 2.65 * k, seg = 9.2 * k, gap = 0.7 * k, n = Math.max(1, Math.round(len / 9.9)); var y0 = y - (n * seg + (n - 1) * gap) / 2; for (var i = 0; i < n; i++) { var yy = y0 + i * (seg + gap); L.add(Rr(x - w / 2, yy, w, seg, (i === 0 || i === n - 1) ? 0.6 * k : 2), '#ffffff', L.ink, 0.9); L.add('M' + (x - 0.5 * k) + ' ' + (yy + seg * 0.3) + 'h' + 1 * k + 'M' + (x - 0.5 * k) + ' ' + (yy + seg * 0.7) + 'h' + 1 * k, 'none', L.ink, 0.6); if (i) L.add(Rr(x - w * 0.42, yy - gap, w * 0.84, gap, 0), L.line ? '#ffffff' : '#d6d3cc', L.ink, 0.5); } },
      pOdam: function (L, x, y, k, rot, col) { var a = rot || 0, c = Math.cos(a), sn = Math.sin(a), kk = k * 1.15; function q(dx, dy) { return [x + (dx * c - dy * sn) * kk, y + (dx * sn + dy * c) * kk]; } function P2(pts) { return Pp(pts.map(function (p) { return q(p[0], p[1]); })); }
        var bf = L.line ? '#ffffff' : (col || '#e9dcc6');
        L.add(El(q(0.2, -0.13)[0], q(0.2, -0.13)[1], 0.055 * kk, 0.055 * kk) + El(q(-0.2, 0.1)[0], q(-0.2, 0.1)[1], 0.055 * kk, 0.055 * kk), bf, L.ink, 0.6);
        L.add(P2([[-0.25, -0.02], [-0.22, -0.11], [-0.1, -0.15], [0.1, -0.15], [0.22, -0.11], [0.25, -0.02], [0.22, 0.08], [0.1, 0.12], [-0.1, 0.12], [-0.22, 0.08]]), bf, L.ink, 0.7);
        var h = q(0, -0.03); L.add(El(h[0], h[1], 0.105 * kk, 0.105 * kk), L.line ? '#ffffff' : '#3a3530', L.ink, 0.6); },
      pDaraxt: function (L, x, y, k, r, seed) { var d = '', n = 14; for (var i = 0; i <= n; i++) { var a = i / n * Math.PI * 2, rr = r * k * (i % 2 ? 0.9 : 1) * (1 + 0.04 * Math.sin(i * 1.7 + (seed || 0))); d += (i ? 'L' : 'M') + F1(x + rr * Math.cos(a)) + ' ' + F1(y + rr * Math.sin(a)); } L.add(d + 'Z', L.line ? 'none' : GR[(seed || 0) % 4], L.line ? L.ink : '#7d9c69', 0.8, L.line ? 1 : 0.85); for (var j = 0; j < 7; j++) { var b = j / 7 * Math.PI * 2 + 0.4; L.add('M' + F1(x) + ' ' + F1(y) + 'L' + F1(x + r * k * 0.68 * Math.cos(b)) + ' ' + F1(y + r * k * 0.68 * Math.sin(b)), 'none', L.line ? L.ink : '#6f8f5c', 0.5, 0.8); } L.add(El(x, y, 1.5, 1.5), L.ink, null, 0); },
      pKafe: function (L, x, y, k) { L.add(El(x, y, 1.3 * k, 1.3 * k), L.line ? 'none' : '#f3e7cf', L.ink, 0.5, 1, '3 3'); L.add(Rr(x - 0.35 * k, y - 0.35 * k, 0.7 * k, 0.7 * k, 1), '#ffffff', L.ink, 0.8); [[0, -0.62], [0, 0.62], [-0.62, 0], [0.62, 0]].forEach(function (o) { L.add(Rr(x + o[0] * k - 0.2 * k, y + o[1] * k - 0.2 * k, 0.4 * k, 0.4 * k, 0.1 * k), '#ffffff', L.ink, 0.6); }); },
      pOrindiq: function (L, x, y, k, vert) { var w = (vert ? 0.55 : 1.8) * k, h = (vert ? 1.8 : 0.55) * k; L.add(Rr(x - w / 2, y - h / 2, w, h, 1), L.line ? '#ffffff' : '#d9ccb2', L.ink, 0.8); for (var i = 1; i < 4; i++) L.add(vert ? 'M' + (x - w / 2 + i * w / 4) + ' ' + (y - h / 2) + 'v' + h : 'M' + (x - w / 2) + ' ' + (y - h / 2 + i * h / 4) + 'h' + w, 'none', L.ink, 0.4); },
      pFonar: function (L, x, y, k, dir) { L.add(El(x, y, 0.16 * k, 0.16 * k), L.ink, null, 0); L.add('M' + x + ' ' + y + 'h' + dir * 1.5 * k, 'none', L.ink, 0.9); L.add(Rr(x + dir * 1.5 * k - (dir > 0 ? 0 : 0.5 * k), y - 0.12 * k, 0.5 * k, 0.24 * k, 1), L.line ? '#ffffff' : '#f6d77a', L.ink, 0.6); },
      pVelot: function (L, x, y, k) { for (var i = 0; i < 4; i++) { var yy = y - 1.2 * k + i * 0.8 * k; L.add('M' + (x - 0.4 * k) + ' ' + yy + 'h' + 0.8 * k, 'none', L.ink, 1.4); } },
      pBekat: function (L, x, y, k, dir) { L.add(Rr(x - 0.8 * k, y - 2.5 * k, 1.6 * k, 5 * k, 1), L.line ? '#ffffff' : '#e3ecf1', L.ink, 0.8); L.add('M' + (x - dir * 0.8 * k) + ' ' + (y - 2.5 * k) + 'v' + 5 * k, 'none', L.ink, 2); }
    };
    // ===== yagona uslub: tekis siluet (odamlar bilan bir xil) =====
    var SIL = { win: '#ffffff', winO: 0.92 };
    function sq(x, y, k) { return function (dx, dy) { return [x + dx * k, y - dy * k]; }; }
    function PQ(q, pts) { return Pp(pts.map(function (p) { return q(p[0], p[1]); })); }
    AS.velochi = function (L, x, y, k, flip) {
      var q = sq(x, y, k), ink = L.ink, f = flip ? -1 : 1;
      L.add(El(x, q(0, 0.34)[1], Math.max(0.6, 0.045 * k), 0.34 * k), ink, null, 0);
      L.add(PQ(q, [[-0.03, 0.62], [0.03, 0.62], [0.025, 1.0], [-0.025, 1.0]]), ink, null, 0);
      L.add('M' + q(-0.27, 1.02)[0] + ' ' + q(0, 1.02)[1] + 'Q' + x + ' ' + q(0, 0.96)[1] + ' ' + q(0.27, 1.02)[0] + ' ' + q(0, 1.02)[1], 'none', ink, Math.max(1, 0.05 * k));
      L.add(PQ(q, [[-0.2, 1.5], [-0.12, 1.56], [0.12, 1.56], [0.2, 1.5], [0.17, 1.12], [0.13, 0.98], [-0.13, 0.98], [-0.17, 1.12]]), ink, null, 0);
      L.add(El(q(0.01 * f, 0)[0], q(0, 1.69)[1], 0.1 * k, 0.12 * k), ink, null, 0);
      L.add(PQ(q, [[-0.2, 1.47], [-0.15, 1.45], [-0.25, 1.04], [-0.29, 1.04]]) + PQ(q, [[0.2, 1.47], [0.15, 1.45], [0.25, 1.04], [0.29, 1.04]]), ink, null, 0);
      L.add(PQ(q, [[-0.13, 1.0], [-0.03, 1.0], [-0.06, 0.58], [-0.1, 0.36], [-0.15, 0.36], [-0.12, 0.6]]) + PQ(q, [[0.13, 1.0], [0.03, 1.0], [0.07, 0.78], [0.1, 0.64], [0.15, 0.64], [0.14, 0.8]]), ink, null, 0);
    };
    AS.mashina = function (L, x, y, k) { var q = sq(x, y, k), ink = L.ink;
      L.add(PQ(q, [[-0.9, 0.3], [-0.92, 0.72], [-0.82, 0.86], [-0.68, 1.38], [-0.55, 1.46], [0.55, 1.46], [0.68, 1.38], [0.82, 0.86], [0.92, 0.72], [0.9, 0.3]]), ink, null, 0);
      L.add(Rr(q(-0.86, 0)[0], q(0, 0.32)[1], 0.26 * k, 0.32 * k, 0.05 * k) + Rr(q(0.6, 0)[0], q(0, 0.32)[1], 0.26 * k, 0.32 * k, 0.05 * k), ink, null, 0);
      L.add(PQ(q, [[-0.66, 0.92], [-0.55, 1.36], [0.55, 1.36], [0.66, 0.92]]), SIL.win, null, 0, SIL.winO);
      L.add(El(q(-0.66, 0)[0], q(0, 0.68)[1], 0.11 * k, 0.06 * k) + El(q(0.66, 0)[0], q(0, 0.68)[1], 0.11 * k, 0.06 * k), SIL.win, null, 0, 0.8); };
    AS.avtobus = function (L, x, y, k) { var q = sq(x, y, k), ink = L.ink;
      L.add(Rr(q(-1.27, 0)[0], q(0, 3.15)[1], 2.55 * k, 2.85 * k, 0.22 * k), ink, null, 0);
      L.add(Rr(q(-1.15, 0)[0], q(0, 0.4)[1], 0.36 * k, 0.4 * k, 0.05 * k) + Rr(q(0.79, 0)[0], q(0, 0.4)[1], 0.36 * k, 0.4 * k, 0.05 * k), ink, null, 0);
      L.add(Rr(q(-1.1, 0)[0], q(0, 2.62)[1], 2.2 * k, 1.35 * k, 0.12 * k), SIL.win, null, 0, SIL.winO);
      L.add(Rr(q(-0.65, 0)[0], q(0, 3.02)[1], 1.3 * k, 0.2 * k, 0.04 * k), SIL.win, null, 0, 0.55);
      L.add('M' + q(-0.02, 0)[0] + ' ' + q(0, 2.62)[1] + 'V' + q(0, 1.27)[1], 'none', ink, Math.max(1, 0.05 * k)); };
    AS.tramvay = function (L, x, y, k) { var q = sq(x, y, k), ink = L.ink;
      L.add(PQ(q, [[-1.33, 0.32], [-1.33, 3.1], [-1.12, 3.45], [1.12, 3.45], [1.33, 3.1], [1.33, 0.32]]), ink, null, 0);
      L.add(Rr(q(-1.0, 0)[0], q(0, 0.34)[1], 0.4 * k, 0.34 * k, 0.04 * k) + Rr(q(0.6, 0)[0], q(0, 0.34)[1], 0.4 * k, 0.34 * k, 0.04 * k), ink, null, 0);
      L.add(Rr(q(-1.1, 0)[0], q(0, 2.95)[1], 2.2 * k, 1.45 * k, 0.15 * k), SIL.win, null, 0, SIL.winO);
      L.add(Rr(q(-0.55, 0)[0], q(0, 3.3)[1], 1.1 * k, 0.18 * k, 0.04 * k), SIL.win, null, 0, 0.55);
      L.add('M' + q(-1.2, 0)[0] + ' ' + q(0, 1.15)[1] + 'h' + 2.4 * k, 'none', SIL.win, Math.max(1, 0.06 * k), 0.6);
      L.add('M' + q(-0.25, 3.45)[0] + ' ' + q(0, 3.45)[1] + 'L' + q(0.3, 4.55)[0] + ' ' + q(0, 4.55)[1] + 'L' + q(-0.25, 5.7)[0] + ' ' + q(0, 5.7)[1] + 'M' + q(-0.55, 5.7)[0] + ' ' + q(0, 5.7)[1] + 'h' + 1.1 * k, 'none', ink, Math.max(1, 0.06 * k)); };
    AS.fonar = function (L, x, y, k, dir, h) { h = h || 9; var q = sq(x, y, k), ink = L.ink; L.add(PQ(q, [[-0.1, 0], [0.1, 0], [0.06, h], [-0.06, h]]), ink, null, 0); L.add('M' + x + ' ' + q(0, h)[1] + 'Q' + x + ' ' + q(0, h + 0.5)[1] + ' ' + q(dir * 0.6, 0)[0] + ' ' + q(0, h + 0.5)[1] + 'H' + q(dir * 1.45, 0)[0], 'none', ink, Math.max(1, 0.1 * k)); L.add(PQ(q, [[dir * 1.2, h + 0.62], [dir * 2.0, h + 0.62], [dir * 1.95, h + 0.42], [dir * 1.25, h + 0.42]]), ink, null, 0); if (!L.line) L.add(PQ(q, [[dir * 1.25, h + 0.42], [dir * 1.95, h + 0.42], [dir * 3.0, 0.05], [dir * 0.2, 0.05]]), '#f3dc94', null, 0, 0.13); };
    AS.piyfonar = function (L, x, y, k) { var q = sq(x, y, k), ink = L.ink; L.add(PQ(q, [[-0.06, 0], [0.06, 0], [0.04, 4.2], [-0.04, 4.2]]), ink, null, 0); L.add(PQ(q, [[-0.2, 4.2], [0.2, 4.2], [0.14, 4.75], [-0.14, 4.75]]), ink, null, 0); };
    AS.orindiq = function (L, x, y, k) { var q = sq(x, y, k), ink = L.ink; L.add(PQ(q, [[-0.3, 0.42], [0.3, 0.42], [0.3, 0.5], [-0.24, 0.5], [-0.3, 0.88], [-0.36, 0.88]]), ink, null, 0); L.add(PQ(q, [[-0.26, 0], [-0.2, 0], [-0.2, 0.42], [-0.26, 0.42]]) + PQ(q, [[0.2, 0], [0.26, 0], [0.26, 0.42], [0.2, 0.42]]), ink, null, 0); };
    AS.axlat = function (L, x, y, k) { var q = sq(x, y, k); L.add(Rr(q(-0.2, 0)[0], q(0, 0.85)[1], 0.4 * k, 0.85 * k, 0.06 * k), L.ink, null, 0); };
    AS.soyabon = function (L, x, y, k) { var q = sq(x, y, k), ink = L.ink; L.add(PQ(q, [[-1.35, 2.0], [0, 2.45], [1.35, 2.0], [1.3, 1.92], [-1.3, 1.92]]), ink, null, 0); L.add('M' + x + ' ' + y + 'V' + q(0, 2.4)[1], 'none', ink, Math.max(1, 0.06 * k)); L.add(PQ(q, [[-0.42, 0.74], [0.42, 0.74], [0.42, 0.8], [-0.42, 0.8]]), ink, null, 0); L.add('M' + q(-0.3, 0)[0] + ' ' + y + 'V' + q(0, 0.74)[1] + 'M' + q(0.3, 0)[0] + ' ' + y + 'V' + q(0, 0.74)[1], 'none', ink, Math.max(0.8, 0.04 * k)); [-1, 1].forEach(function (s2) { L.add(PQ(q, [[s2 * 0.55, 0], [s2 * 0.6, 0], [s2 * 0.6, 0.45], [s2 * 0.85, 0.45], [s2 * 0.88, 0.95], [s2 * 0.83, 0.95], [s2 * 0.8, 0.5], [s2 * 0.55, 0.5]]), ink, null, 0); }); };
    AS.bekat = function (L, x, y, k, dir) { var q = sq(x, y, k), ink = L.ink; L.add(PQ(q, [[-dir * 0.85, 0], [-dir * 0.75, 0], [-dir * 0.75, 2.6], [dir * 1.0, 2.7], [dir * 1.0, 2.82], [-dir * 0.85, 2.72]]), ink, null, 0); L.add(PQ(q, [[-dir * 0.75, 0.2], [-dir * 0.7, 0.2], [-dir * 0.7, 2.5], [-dir * 0.75, 2.5]]), ink, null, 0, 0.5); L.add(PQ(q, [[-dir * 0.7, 0.42], [-dir * 0.25, 0.42], [-dir * 0.25, 0.48], [-dir * 0.7, 0.48]]), ink, null, 0); };
    // reja — siluet
    AS.pMashina = function (L, x, y, k, up) { var w = 1.8 * k, h = 4.5 * k, x0 = x - w / 2, y0 = y - h / 2, s = up ? -1 : 1; L.add(Rr(x0, y0, w, h, 0.4 * k), L.ink, null, 0); var wy = y + s * 0.7 * k; L.add(Pp([[x0 + 0.2 * k, wy], [x0 + w - 0.2 * k, wy], [x0 + w - 0.28 * k, wy + s * 0.55 * k], [x0 + 0.28 * k, wy + s * 0.55 * k]]), SIL.win, null, 0, 0.85); var ry = y - s * 1.45 * k; L.add(Pp([[x0 + 0.25 * k, ry], [x0 + w - 0.25 * k, ry], [x0 + w - 0.3 * k, ry - s * 0.3 * k], [x0 + 0.3 * k, ry - s * 0.3 * k]]), SIL.win, null, 0, 0.6); };
    AS.pAvtobus = function (L, x, y, k, up) { var w = 2.55 * k, h = 12 * k, x0 = x - w / 2, y0 = y - h / 2; L.add(Rr(x0, y0, w, h, 0.3 * k), L.ink, null, 0); [0.3, 0.55].forEach(function (f) { L.add(Rr(x - 0.6 * k, y0 + h * f, 1.2 * k, 1.6 * k, 1), SIL.win, null, 0, 0.35); }); L.add(Rr(x0 + 0.2 * k, up ? y0 + 0.25 * k : y0 + h - 0.85 * k, w - 0.4 * k, 0.6 * k, 1), SIL.win, null, 0, 0.85); };
    AS.pTramvay = function (L, x, y, k, len) { var w = 2.65 * k, seg = 9.2 * k, gap = 0.7 * k, n = Math.max(1, Math.round(len / 9.9)); var y0 = y - (n * seg + (n - 1) * gap) / 2; for (var i = 0; i < n; i++) { var yy = y0 + i * (seg + gap); L.add(Rr(x - w / 2, yy, w, seg, (i === 0 || i === n - 1) ? 0.6 * k : 2), L.ink, null, 0); L.add('M' + (x - 0.5 * k) + ' ' + (yy + seg * 0.3) + 'h' + 1 * k + 'M' + (x - 0.5 * k) + ' ' + (yy + seg * 0.7) + 'h' + 1 * k, 'none', SIL.win, 0.8, 0.5); if (i) L.add(Rr(x - w * 0.4, yy - gap, w * 0.8, gap, 0), L.ink, null, 0, 0.6); } };
    AS.pOdam = function (L, x, y, k, rot) { var a = rot || 0, c = Math.cos(a), sn = Math.sin(a), kk = k * 1.15; function q(dx, dy) { return [x + (dx * c - dy * sn) * kk, y + (dx * sn + dy * c) * kk]; } function P2(pts) { return Pp(pts.map(function (p) { return q(p[0], p[1]); })); }
      L.add(P2([[0.14, -0.08], [0.24, -0.2], [0.29, -0.16], [0.2, -0.04]]) + P2([[-0.14, 0.06], [-0.24, 0.17], [-0.29, 0.13], [-0.2, 0.02]]), L.ink, null, 0);
      L.add(P2([[-0.25, -0.02], [-0.22, -0.11], [-0.1, -0.15], [0.1, -0.15], [0.22, -0.11], [0.25, -0.02], [0.22, 0.08], [0.1, 0.12], [-0.1, 0.12], [-0.22, 0.08]]), L.ink, null, 0);
      var h = q(0, -0.03); L.add(El(h[0], h[1], 0.1 * kk, 0.1 * kk), '#ffffff', L.ink, 0.6, 1); };
    AS.pFonar = function (L, x, y, k, dir) { L.add(El(x, y, 0.16 * k, 0.16 * k), L.ink, null, 0); L.add('M' + x + ' ' + y + 'h' + dir * 1.5 * k, 'none', L.ink, Math.max(0.8, 0.1 * k)); L.add(Rr(x + dir * 1.5 * k - (dir > 0 ? 0 : 0.6 * k), y - 0.14 * k, 0.6 * k, 0.28 * k, 1), L.ink, null, 0); };
    AS.pOrindiq = function (L, x, y, k, vert) { var w = (vert ? 0.55 : 1.8) * k, h = (vert ? 1.8 : 0.55) * k; L.add(Rr(x - w / 2, y - h / 2, w, h, 1), L.ink, null, 0); };
    AS.pKafe = function (L, x, y, k) { L.add(El(x, y, 1.3 * k, 1.3 * k), 'none', L.ink, 0.5, 0.6, '3 3'); L.add(El(x, y, 0.38 * k, 0.38 * k), L.ink, null, 0); [[0, -0.66], [0, 0.66], [-0.66, 0], [0.66, 0]].forEach(function (o) { L.add(Rr(x + o[0] * k - 0.2 * k, y + o[1] * k - 0.2 * k, 0.4 * k, 0.4 * k, 0.1 * k), L.ink, null, 0); }); };
    AS.pBekat = function (L, x, y, k, dir) { L.add(Rr(x - 0.8 * k, y - 2.5 * k, 1.6 * k, 5 * k, 1), L.ink, null, 0, 0.25); L.add('M' + (x - dir * 0.8 * k) + ' ' + (y - 2.5 * k) + 'v' + 5 * k, 'none', L.ink, 2); };
    // ===== yumshoq uslub (qora emas) =====
    var PC = function (L) { return L.line ? '#55524d' : '#77736b'; };
    var VB = { body: '#f4f3f0', bus: '#efe8d8', tram: '#f2efe8', win: '#c3cdd5', st: '#5d5a55' };
    var _ua = AS.ua; AS.ua = function (L, nm, x, y, px, flip, col) { _ua(L, nm, x, y, px, flip, col || PC(L)); };
    ['velochi', 'orindiq', 'soyabon', 'axlat', 'piyfonar', 'bekat'].forEach(function (n) { var f0 = AS[n]; AS[n] = function (L) { var a = Array.prototype.slice.call(arguments); a[0] = { line: L.line, ink: PC(L), add: L.add }; return f0.apply(null, a); }; });
    AS.mashina = function (L, x, y, k) { var q = sq(x, y, k), st = VB.st, b = L.line ? '#ffffff' : VB.body;
      L.add(Rr(q(-0.84, 0)[0], q(0, 0.3)[1], 0.24 * k, 0.3 * k, 0.05 * k) + Rr(q(0.6, 0)[0], q(0, 0.3)[1], 0.24 * k, 0.3 * k, 0.05 * k), st, null, 0);
      L.add(PQ(q, [[-0.9, 0.28], [-0.92, 0.72], [-0.82, 0.86], [-0.68, 1.38], [-0.55, 1.46], [0.55, 1.46], [0.68, 1.38], [0.82, 0.86], [0.92, 0.72], [0.9, 0.28]]), b, st, 0.8);
      L.add(PQ(q, [[-0.64, 0.92], [-0.54, 1.34], [0.54, 1.34], [0.64, 0.92]]), L.line ? '#ffffff' : VB.win, st, 0.5);
      L.add(El(q(-0.64, 0)[0], q(0, 0.66)[1], 0.1 * k, 0.055 * k) + El(q(0.64, 0)[0], q(0, 0.66)[1], 0.1 * k, 0.055 * k), '#ffffff', st, 0.5); L.add('M' + q(-0.3, 0)[0] + ' ' + q(0, 0.5)[1] + 'H' + q(0.3, 0)[0], null, st, 0.6); };
    AS.avtobus = function (L, x, y, k) { var q = sq(x, y, k), st = VB.st;
      L.add(Rr(q(-1.12, 0)[0], q(0, 0.38)[1], 0.34 * k, 0.38 * k, 0.05 * k) + Rr(q(0.78, 0)[0], q(0, 0.38)[1], 0.34 * k, 0.38 * k, 0.05 * k), st, null, 0);
      L.add(Rr(q(-1.27, 0)[0], q(0, 3.15)[1], 2.55 * k, 2.82 * k, 0.22 * k), L.line ? '#ffffff' : VB.bus, st, 0.8);
      L.add(Rr(q(-1.1, 0)[0], q(0, 2.62)[1], 2.2 * k, 1.35 * k, 0.12 * k), L.line ? '#ffffff' : VB.win, st, 0.5);
      L.add(Rr(q(-0.65, 0)[0], q(0, 3.02)[1], 1.3 * k, 0.2 * k, 0.04 * k), st, null, 0, 0.8); };
    AS.tramvay = function (L, x, y, k) { var q = sq(x, y, k), st = VB.st;
      L.add(Rr(q(-1.0, 0)[0], q(0, 0.32)[1], 0.4 * k, 0.32 * k, 0.04 * k) + Rr(q(0.6, 0)[0], q(0, 0.32)[1], 0.4 * k, 0.32 * k, 0.04 * k), st, null, 0);
      L.add(PQ(q, [[-1.33, 0.3], [-1.33, 3.1], [-1.12, 3.45], [1.12, 3.45], [1.33, 3.1], [1.33, 0.3]]), L.line ? '#ffffff' : VB.tram, st, 0.8);
      L.add(Rr(q(-1.1, 0)[0], q(0, 2.95)[1], 2.2 * k, 1.45 * k, 0.15 * k), L.line ? '#ffffff' : VB.win, st, 0.5);
      L.add(PQ(q, [[-1.33, 0.9], [1.33, 0.9], [1.33, 1.2], [-1.33, 1.2]]), L.line ? '#ffffff' : '#c96b5c', L.line ? st : null, 0.5);
      L.add('M' + q(-0.25, 3.45)[0] + ' ' + q(0, 3.45)[1] + 'L' + q(0.3, 4.55)[0] + ' ' + q(0, 4.55)[1] + 'L' + q(-0.25, 5.7)[0] + ' ' + q(0, 5.7)[1] + 'M' + q(-0.55, 5.7)[0] + ' ' + q(0, 5.7)[1] + 'h' + 1.1 * k, 'none', st, Math.max(0.8, 0.05 * k)); };
    AS.pMashina = function (L, x, y, k, up) { var w = 1.8 * k, h = 4.5 * k, x0 = x - w / 2, y0 = y - h / 2, s = up ? -1 : 1, st = VB.st; if (!L.line) L.add(Rr(x0 + 0.25 * k, y0 + 0.3 * k, w, h, 0.4 * k), '#000000', null, 0, 0.07); L.add(Rr(x0, y0, w, h, 0.42 * k), L.line ? '#ffffff' : VB.body, st, 0.8); var wy = y + s * 0.7 * k; L.add(Pp([[x0 + 0.22 * k, wy], [x0 + w - 0.22 * k, wy], [x0 + w - 0.3 * k, wy + s * 0.55 * k], [x0 + 0.3 * k, wy + s * 0.55 * k]]), L.line ? '#ffffff' : VB.win, st, 0.5); var ry = y - s * 1.45 * k; L.add(Pp([[x0 + 0.28 * k, ry], [x0 + w - 0.28 * k, ry], [x0 + w - 0.32 * k, ry - s * 0.3 * k], [x0 + 0.32 * k, ry - s * 0.3 * k]]), L.line ? '#ffffff' : VB.win, st, 0.5); };
    AS.pAvtobus = function (L, x, y, k, up) { var w = 2.55 * k, h = 12 * k, x0 = x - w / 2, y0 = y - h / 2, st = VB.st; if (!L.line) L.add(Rr(x0 + 0.3 * k, y0 + 0.4 * k, w, h, 0.3 * k), '#000000', null, 0, 0.07); L.add(Rr(x0, y0, w, h, 0.3 * k), L.line ? '#ffffff' : VB.bus, st, 0.8); [0.3, 0.55].forEach(function (f) { L.add(Rr(x - 0.6 * k, y0 + h * f, 1.2 * k, 1.6 * k, 1), 'none', st, 0.5); }); L.add(Rr(x0 + 0.2 * k, up ? y0 + 0.25 * k : y0 + h - 0.85 * k, w - 0.4 * k, 0.6 * k, 1), L.line ? '#ffffff' : VB.win, st, 0.5); };
    AS.pTramvay = function (L, x, y, k, len) { var w = 2.65 * k, seg = 9.2 * k, gap = 0.7 * k, n = Math.max(1, Math.round(len / 9.9)), st = VB.st; var y0 = y - (n * seg + (n - 1) * gap) / 2; for (var i = 0; i < n; i++) { var yy = y0 + i * (seg + gap); if (!L.line) L.add(Rr(x - w / 2 + 0.3 * k, yy + 0.4 * k, w, seg, 2), '#000000', null, 0, 0.07); L.add(Rr(x - w / 2, yy, w, seg, (i === 0 || i === n - 1) ? 0.6 * k : 2), L.line ? '#ffffff' : VB.tram, st, 0.8); L.add('M' + (x - 0.5 * k) + ' ' + (yy + seg * 0.3) + 'h' + 1 * k + 'M' + (x - 0.5 * k) + ' ' + (yy + seg * 0.7) + 'h' + 1 * k, 'none', st, 0.6); if (i) L.add(Rr(x - w * 0.4, yy - gap, w * 0.8, gap, 0), L.line ? '#ffffff' : '#d9d5cc', st, 0.5); } };
    AS.pOdam = function (L, x, y, k, rot, col) { var a = rot || 0, c = Math.cos(a), sn = Math.sin(a), kk = k * 1.15; function q(dx, dy) { return [x + (dx * c - dy * sn) * kk, y + (dx * sn + dy * c) * kk]; } function P2(pts) { return Pp(pts.map(function (p) { return q(p[0], p[1]); })); } var st = '#6e6a63', bf = L.line ? '#ffffff' : (col || '#d8d2c6');
      L.add(P2([[0.14, -0.08], [0.24, -0.2], [0.29, -0.16], [0.2, -0.04]]) + P2([[-0.14, 0.06], [-0.24, 0.17], [-0.29, 0.13], [-0.2, 0.02]]), bf, st, 0.5);
      L.add(P2([[-0.25, -0.02], [-0.22, -0.11], [-0.1, -0.15], [0.1, -0.15], [0.22, -0.11], [0.25, -0.02], [0.22, 0.08], [0.1, 0.12], [-0.1, 0.12], [-0.22, 0.08]]), bf, st, 0.6);
      var h = q(0, -0.03); L.add(El(h[0], h[1], 0.1 * kk, 0.1 * kk), L.line ? '#ffffff' : '#8a847a', st, 0.5); };
    AS.pOrindiq = function (L, x, y, k, vert) { var w = (vert ? 0.55 : 1.8) * k, h = (vert ? 1.8 : 0.55) * k; L.add(Rr(x - w / 2, y - h / 2, w, h, 1), L.line ? '#ffffff' : '#d9ccb2', VB.st, 0.6); for (var i = 1; i < 4; i++) L.add(vert ? 'M' + (x - w / 2) + ' ' + (y - h / 2 + i * h / 4) + 'h' + w : 'M' + (x - w / 2 + i * w / 4) + ' ' + (y - h / 2) + 'v' + h, 'none', VB.st, 0.3); };
    AS.pKafe = function (L, x, y, k) { L.add(El(x, y, 1.3 * k, 1.3 * k), L.line ? 'none' : '#f3e7cf', VB.st, 0.5, 0.8, '3 3'); L.add(El(x, y, 0.38 * k, 0.38 * k), '#ffffff', VB.st, 0.6); [[0, -0.66], [0, 0.66], [-0.66, 0], [0.66, 0]].forEach(function (o) { L.add(Rr(x + o[0] * k - 0.2 * k, y + o[1] * k - 0.2 * k, 0.4 * k, 0.4 * k, 0.1 * k), '#ffffff', VB.st, 0.5); }); };
    AS.pBekat = function (L, x, y, k, dir) { L.add(Rr(x - 0.8 * k, y - 2.5 * k, 1.6 * k, 5 * k, 1), L.line ? '#ffffff' : '#e3ecf1', VB.st, 0.6); L.add('M' + (x - dir * 0.8 * k) + ' ' + (y - 2.5 * k) + 'v' + 5 * k, 'none', VB.st, 1.6); };

    var draw = [], txt = [];
    function add(d, f, st, w, o, da, tr) { draw.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '', t: tr || '' }); }
    function tx(x, y, t, sm) { txt.push({ x: x, y: y, t: t, fs: sm ? 9 : 11, fw: sm ? 400 : 600, c: sm ? '#a19e97' : '#8f8a80', ls: sm ? 0 : 1, a: sm ? 'middle' : 'start' }); }
    var line = s.gfx === 1, L = { line: line, ink: '#2f2e2b', add: add };
    function nice(n) { return n.replace(/^[TB]_/, '').replace(/_/g, ' ').replace('otirgan', 'oʻtirgan').replace('qol kotargan', 'qoʻl koʻtargan').replace('koylak', 'koʻylak').replace('ot', 'oʻt'); }
    function flow(y, title, list, wOf, draw1) { tx(40, y - 0, title); var x = 50, base = y + 0; return list.map(function (n) { return n; }).reduce(function (xx, n) { var w = wOf(n); draw1(n, xx + w / 2); tx(xx + w / 2, s.__b + 14, nice(n), 1); return xx + w + 22; }, 50); }
    // 1 odamlar
    var PX = 42, P1 = ['ayol_yurgan', 'erkak_turgan', 'erkak_yurgan', 'ona_bola', 'ryukzak', 'telefon', 'ayol_sumka', 'erkak_2', 'qol_kotargan', 'ayol_koylak', 'erkak_3', 'erkak_4', 'qariya', 'otirgan_stul', 'otirgan_blok', 'aravacha', 'it', 'samokat', 'erkak_palto', 'ayol_palto', 'ayol_sumka2', 'yuguruvchi'];
    function row(base, title, list, scaleOf, drawIt, gap, th) { tx(40, base - (th || 132), title); add('M40 ' + base + 'H1352', null, '#e4e1da', 0.8); var x = 50; list.forEach(function (n) { var a = UA[n], w = a.w * scaleOf(n); drawIt(n, x + w / 2, base); tx(x + w / 2, base + 15, nice(n), 1); x += w + (gap || 20); }); }
    row(170, 'ODAMLAR · siz yuborgan siluetlar (1,78 m = ' + PX * 1.78 + ' px)', P1, function () { return UK * PX; }, function (n, x, y) { AS.ua(L, n, x, y, PX); }, 22);
    row(340, 'VELOSIPED VA MOBILLIK', ['velo_1', 'velo_2', 'velo_sport', 'velo_ryukzak', 'velo_savat', 'velo_bola', 'velo_yuk'], function () { return UK * PX; }, function (n, x, y) { AS.ua(L, n, x, y, PX); }, 30);
    var TH = { T_bulut: 11, T_bulut2: 10, T_qaragay: 14, T_shar: 8, T_doirali: 9, T_terak: 13, T_tuxum: 9, T_sarv: 12, T_qatlam: 10, T_shoxli: 8, T_archa: 9 }, TP = 15;
    row(650, 'DARAXTLAR · rangli rejimda yashil, chizmada kontur (balandligi metrda)', Object.keys(TH), function (n) { return TH[n] * TP / UA[n].h; }, function (n, x, y) { AS.uaT(L, n, x, y, TH[n], TP, x | 0); tx(x, y + 26, TH[n] + ' m', 1); }, 34, 255);
    var BS = ['B_past', 'B_yumaloq', 'B_gul', 'B_ot', 'B_ot2', 'B_lotus', 'B_qamish', 'B_barg', 'B_barg2', 'B_tor', 'B_tish', 'B_tish2'];
    row(815, 'BUTALAR VA OʻTLAR', BS, function (n) { return 1.0 * 70 / UA[n].h * (UA[n].h / 80); }, function (n, x, y) { AS.uaT(L, n, x, y, UA[n].h / 80, 70, x | 0); }, 34, 112);
    tx(40, 870, 'TRANSPORT VA JIHOZLAR · old koʻrinish (Archemistry chizmasi)'); add('M40 1060H1040', null, '#e4e1da', 0.8);
    AS.mashina(L, 90, 1060, 30); AS.avtobus(L, 210, 1060, 30); AS.tramvay(L, 360, 1060, 30); AS.fonar(L, 470, 1060, 18, 1, 9); AS.piyfonar(L, 620, 1060, 30); AS.orindiq(L, 700, 1060, 30); AS.axlat(L, 770, 1060, 30); AS.soyabon(L, 870, 1060, 30); AS.bekat(L, 990, 1060, 30, 1);
    add('M1080 870V1070', null, '#e4e1da', 1); tx(1100, 870, 'REJA · yuqoridan');
    AS.pMashina(L, 1120, 960, 16, true); AS.pAvtobus(L, 1175, 990, 11, true); AS.pDaraxt(L, 1240, 930, 11, 3, 1); AS.pKafe(L, 1320, 935, 24); AS.pOrindiq(L, 1240, 1020, 20, false); AS.pFonar(L, 1300, 1010, 20, 1); AS.pBekat(L, 1340, 1030, 9, 1);
    [0, 1.2, 2.6, 4, 5.3, 0.6].forEach(function (a, i) { AS.pOdam(L, 1110 + i * 40, 1055, 30, a, ['#e9dcc6', '#cfdbe6', '#e6cfc6', '#d6e2cf'][i % 4]); });
    return { draw: draw, txt: txt, gfx: [['Rangli', 0], ['Chizma', 1]].map(function (v) { return { n: v[0], p: s.gfx === v[1] ? 'true' : 'false', pick: function () { self.setState({ gfx: v[1] }); } }; }) };
    })();
    return __split(__r);
  }
}
