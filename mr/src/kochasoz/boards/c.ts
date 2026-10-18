// @ts-nocheck
/* Koʻchasoz · KS-C — kanvas maketidagi (Archemistry Lab, «Koʻchasoz» sahifasi, KS-C.dc.html) mantiq aynan koʻchirilgan.
   Hisob-kitob va chizma shu yerda; qobiq, saqlash, til va tungi rejim — ../dc.ts va ../main.ts. */
import { DCLogic } from '../dc';
import UA_ from './ua.json';
export default class Component extends DCLogic {
  constructor(p) { super(p); this.state = {"veh": "avtobus", "turn": true, "TPL": [["Magistral · tramvayli", null, [["front", 2, {"kafe": true}], ["piy", 5, {}], ["velo", 1.8, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.6, {"fonar": true}], ["qat", 3.25, {}], ["qat", 3.25, {"zebra": true}], ["med", 2.5, {"fonar": true}], ["tram", 3.1, {"tayanch": true}], ["tram", 3.1, {"tayanch": true}], ["med", 2.5, {"fonar": true}], ["qat", 3.25, {"zebra": true}], ["qat", 3.25, {}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["velo", 1.8, {}], ["piy", 5, {}], ["front", 2, {"kafe": true}]], "sh2", "U2", [{"t": "terrasa", "z": 0, "y": 4, "l": 7}, {"t": "velopark", "z": 3, "y": 22, "l": 5}, {"t": "samokat", "z": 3, "y": 29, "l": 3}, {"t": "shpalera", "z": 7, "y": 12, "l": 10}, {"t": "buta", "z": 10, "y": 20, "l": 4}, {"t": "gul", "z": 17, "y": 6, "l": 1}, {"t": "orindiq", "z": 14, "y": 16, "l": 2}]], ["Tuman koʻchasi", null, [["front", 3, {"kafe": true}], ["piy", 3, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.6, {"fonar": true}], ["park", 2.5, {"mashina": true, "dchontak": true}], ["qat", 3.5, {"zebra": true}], ["med", 4, {"daraxt": true, "fonar": true}], ["qat", 3.5, {"zebra": true}], ["park", 2.5, {"mashina": true, "dchontak": true}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["piy", 3, {}], ["front", 3, {"kafe": true}]], "tm", "U3", [{"t": "parklet", "z": 4, "y": 15, "l": 6}, {"t": "yuklash", "z": 8, "y": 9, "l": 8}, {"t": "taksi", "z": 8, "y": 24, "l": 6}, {"t": "velopark", "z": 2, "y": 8, "l": 5}, {"t": "shpalera", "z": 6, "y": 10, "l": 12}, {"t": "terrasa", "z": 12, "y": 5, "l": 6}]], ["Avtobus koridori", null, [["front", 1, {}], ["piy", 5, {}], ["velo", 1.8, {}], ["yash", 3, {"daraxt": true, "velot": true}], ["mebel", 0.6, {"fonar": true}], ["bus", 3.75, {"bekat": true}], ["qat", 3.25, {"zebra": true}], ["med", 4, {"fonar": true, "orolcha": true}], ["qat", 3.25, {"zebra": true}], ["bus", 3.75, {"bekat": true}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "velot": true}], ["velo", 1.8, {}], ["piy", 5, {}], ["front", 1, {}]], "sh2", "U2", [{"t": "bekat", "z": 3, "y": 12, "l": 10}, {"t": "velopark", "z": 11, "y": 8, "l": 5}, {"t": "samokat", "z": 11, "y": 16, "l": 3}]], ["Mahalla koʻchasi", null, [["front", 1.1, {"gul": true}], ["piy", 2.25, {}], ["yash", 3, {"daraxt": true, "buta": true}], ["mebel", 0.5, {"fonar": true}], ["qat", 3, {}], ["qat", 3, {}], ["mebel", 0.5, {"fonar": true}], ["yash", 3, {"daraxt": true, "buta": true}], ["piy", 2.25, {}], ["front", 1.1, {"gul": true}]], "mh", "M1", [{"t": "buta", "z": 2, "y": 6, "l": 4}, {"t": "orindiq", "z": 7, "y": 12, "l": 2}, {"t": "gul", "z": 9, "y": 5, "l": 1}]], ["Piyoda koʻchasi", null, [["front", 2, {"kafe": true}], ["piy", 5, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.5, {"fonar": true}], ["mebel", 0.5, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["piy", 5, {}], ["front", 2, {"kafe": true}]], "pd", "U5", [{"t": "terrasa", "z": 0, "y": 3, "l": 10}, {"t": "terrasa", "z": 7, "y": 12, "l": 8}, {"t": "velopark", "z": 2, "y": 14, "l": 5}, {"t": "orindiq", "z": 5, "y": 8, "l": 2}]]], "a": 2, "b": 1, "vA": 60, "vB": 50, "rek": 1, "R": 8, "ctl": 0, "zebra": true, "raised": false, "bulb": true, "island": true, "sight": false, "gfx": 0, "ang": 90, "lay": {}, "tdir": 2}; }
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

    var T = { front: '#f1e9da', piy: '#ece8df', mebel: '#e4ddcf', yash: '#d3e4c6', velo: '#d98a78', park: '#dedfe2', qat: '#d2d3d7', bus: '#93a9d8', tram: '#e8dece', med: '#d9e7cd' };
    var ROAD = { qat: 1, bus: 1, park: 1, tram: 1 };
    var SSD = { 30: 45, 40: 55, 50: 75, 60: 85, 80: 150 };
    var SKN = { tz1: 'Tezkor 1', tz2: 'Tezkor 2', sh1: 'Shahar 1', sh2: 'Shahar 2', sh3: 'Shahar 3', tm: 'Tuman', mh: 'Mahalliy', pd: 'Piyoda' };
    var DC = { ok: '#2b7449', warn: '#c98a12', bad: '#b23a2e' };
    function fm(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
    var draw = [], txt = [];
    function add(d, f, st, w, o, da, t) { draw.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '', t: t || '' }); }
    function tx(x, y, t, fs, c, fw, an, ff) { txt.push({ x: x.toFixed(1), y: y.toFixed(1), t: t, fs: fs || 10, c: c || '#141414', fw: fw || 400, a: an || 'middle', ff: ff || 'Archivo, sans-serif' }); }
    var line = s.gfx === 1, INK = '#2f2e2b', LIGHT = '#8f8a80', WM = line ? INK : '#ffffff';
    var px = 5.6, CX = 392, CY = 400, R = s.R, SB = 1.5, dl = (s.ang - 90) * Math.PI / 180, cs = Math.cos(dl), sn = Math.sin(dl);
    var KT = Math.abs(s.ang - 90) < 0.01 ? '' : 'rotate(' + (s.ang - 90) + ' ' + CX + ' ' + CY + ')';
    function X(m) { return CX + m * px; } function Y(m) { return CY + m * px; }
    function G(a, b) { return [a * cs - b * sn, a * sn + b * cs]; } // K lokal → global (m)
    function Lc(p) { return [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs]; } // global → K lokal
    var NV = [cs, sn], UV = [-sn, cs];
    function inter(P1, d1, P2, d2) { var den = d1[0] * d2[1] - d1[1] * d2[0]; var t1 = ((P2[0] - P1[0]) * d2[1] - (P2[1] - P1[1]) * d2[0]) / den; return [P1[0] + t1 * d1[0], P1[1] + t1 * d1[1]]; }
    function mainLine(c) { return [[0, c], [1, 0]]; } function kLine(k) { return [[k * NV[0], k * NV[1]], UV]; }
    function lw(L0) { return { line: line, ink: INK, add: function (d, f, st, w, o, da, t) { add(d, f, st, w, o, da, KT + (t ? ' ' + t : '')); } }; }
    var LK = lw(), L = { line: line, ink: INK, add: add };
    function rot(cx, cy, Lb) { return { line: line, ink: INK, add: function (d, f, st, w, o, da, t) { (Lb || L).add(d, f, st, w, o, da, 'rotate(90 ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')' + (t ? ' ' + t : '')); } }; }
    function street(t) { var els = t[2], rl = 0; els.forEach(function (e) { rl += e[1]; }); var z = [], a = -rl / 2; els.forEach(function (e) { z.push({ t: e[0], a: a, b: a + e[1], w: e[1], f: e[2] || {} }); a += e[1]; }); var road = z.filter(function (q) { return ROAD[q.t]; }); var c1 = road.length ? road[0].a : 0, c2 = road.length ? road[road.length - 1].b : 0; return { n: t[0], sk: t[3], uk: t[4], rl: rl, z: z, c1: c1, c2: c2, cw: c2 - c1, park: road.some(function (q) { return q.t === 'park'; }), lanes: z.filter(function (q) { return q.t === 'qat' || q.t === 'bus'; }).length, med: z.filter(function (q) { return q.t === 'med' && q.a > c1 && q.b < c2; }), velo: z.filter(function (q) { return q.t === 'velo'; }), bus: z.filter(function (q) { return q.t === 'bus'; }), piy: z.filter(function (q) { return q.t === 'piy'; }) }; }
    var MA = street(s.TPL[s.a]), MB = street(s.TPL[s.b]);
    var ym1 = MA.c1, ym2 = MA.c2, xc1 = MB.c1, xc2 = MB.c2, hasCore = MA.cw > 0 && MB.cw > 0;
    var dk = function (uk) { return (uk === 'U2' || uk === 'U4' || uk === 'U5') ? [30, 15, '6.4.2'] : [20, 5, '6.4.1']; }, dkA = dk(MA.uk), dkB = dk(MB.uk);
    var Ly = s.lay || {};
    // ===== burchaklar (qiyshiq ham) =====
    var CR = [];
    if (hasCore) [[xc1, ym1], [xc2, ym1], [xc1, ym2], [xc2, ym2]].forEach(function (q) { var k = q[0], c = q[1], m = mainLine(c), kk = kLine(k); var P = inter(m[0], m[1], kk[0], kk[1]); var e1 = [k > 0 ? 1 : -1, 0], sg = c > 0 ? 1 : -1, e2 = [sg * UV[0], sg * UV[1]]; var dot = e1[0] * e2[0] + e1[1] * e2[1], phi = Math.acos(Math.max(-1, Math.min(1, dot))); var tl = R / Math.tan(phi / 2), T1 = [P[0] + e1[0] * tl, P[1] + e1[1] * tl], T2 = [P[0] + e2[0] * tl, P[1] + e2[1] * tl]; var bis = [e1[0] + e2[0], e1[1] + e2[1]], bl = Math.hypot(bis[0], bis[1]), Cc = [P[0] + bis[0] / bl * R / Math.sin(phi / 2), P[1] + bis[1] / bl * R / Math.sin(phi / 2)]; var cr = (T1[0] - Cc[0]) * (T2[1] - Cc[1]) - (T1[1] - Cc[1]) * (T2[0] - Cc[0]); CR.push({ k: k, c: c, P: P, T1: T1, T2: T2, C: Cc, sw: cr > 0 ? 1 : 0, e1: e1, e2: e2, tl: tl }); });
    function crn(k, c) { return CR.filter(function (q) { return q.k === k && q.c === c; })[0]; }
    function pp(p) { return X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }
    // chegaralar: asosiy koʻchada K kesib oʻtgan joy (x), K da asosiy kesib oʻtgan joy (lokal b)
    var xW = hasCore ? Math.min(crn(xc1, ym1).T1[0], crn(xc1, ym2).T1[0]) : -6, xE = hasCore ? Math.max(crn(xc2, ym1).T1[0], crn(xc2, ym2).T1[0]) : 6;
    var bN = hasCore ? Math.min(Lc(crn(xc1, ym1).T2)[1], Lc(crn(xc2, ym1).T2)[1]) : -6, bS = hasCore ? Math.max(Lc(crn(xc1, ym2).T2)[1], Lc(crn(xc2, ym2).T2)[1]) : 6;
    var ZW = 4, VW = 2.0;
    var vwA = MA.velo.length ? Math.max.apply(null, MA.velo.map(function (q) { return q.w; })) : 0, vwB = MB.velo.length ? Math.max.apply(null, MB.velo.map(function (q) { return q.w; })) : 0;
    // oʻtish joylari: zebra tashqarida, velo oʻtish yadro tomonida
    var zW = [xW - 0.5 - (vwB ? vwB : 0) - ZW, xW - 0.5 - (vwB ? vwB : 0)], zE = [xE + 0.5 + (vwB ? vwB : 0), xE + 0.5 + (vwB ? vwB : 0) + ZW];
    var zN = [bN - 0.5 - (vwA ? vwA : 0) - ZW, bN - 0.5 - (vwA ? vwA : 0)], zS = [bS + 0.5 + (vwA ? vwA : 0), bS + 0.5 + (vwA ? vwA : 0) + ZW];
    var EXT = 140;
    // 1) fon: kvartallar
    add('M0 0H784V800H0Z', line ? '#ffffff' : '#e4e1da', null, 0);
    for (var h = -800; h < 784; h += 9) add('M' + Math.max(0, h) + ' ' + (h < 0 ? -h : 0) + 'L' + Math.min(784, h + 800) + ' ' + (h + 800 > 784 ? 800 - (h + 800 - 784) : 800), null, '#cfcac0', 0.5);
    add('M0 ' + Y(-MA.rl / 2 - SB) + 'H784M0 ' + Y(MA.rl / 2 + SB) + 'H784', null, INK, 1.1);
    add('M' + X(-MB.rl / 2 - SB) + ' ' + Y(-EXT) + 'V' + Y(EXT) + 'M' + X(MB.rl / 2 + SB) + ' ' + Y(-EXT) + 'V' + Y(EXT), null, INK, 1.1, 1, '', KT);
    add('M0 ' + Y(-MA.rl / 2 - SB) + 'H784V' + Y(MA.rl / 2 + SB) + 'H0Z', line ? '#ffffff' : '#ebe7df', null, 0);
    add('M' + X(-MB.rl / 2 - SB) + ' ' + Y(-EXT) + 'H' + X(MB.rl / 2 + SB) + 'V' + Y(EXT) + 'H' + X(-MB.rl / 2 - SB) + 'Z', line ? '#ffffff' : '#ebe7df', null, 0, 1, '', KT);
    // 2) zonalar
    MA.z.forEach(function (q) { add('M0 ' + Y(q.a) + 'H784V' + Y(q.b) + 'H0Z', line ? '#ffffff' : T[q.t], line ? '#d6d3cc' : null, 0.4); });
    MB.z.forEach(function (q) { add('M' + X(q.a) + ' ' + Y(-EXT) + 'H' + X(q.b) + 'V' + Y(EXT) + 'H' + X(q.a) + 'Z', line ? '#ffffff' : T[q.t], line ? '#d6d3cc' : null, 0.4, 1, '', KT); });
    var asph = line ? '#ffffff' : '#d2d3d7';
    if (MA.cw > 0) add('M0 ' + Y(ym1) + 'H784V' + Y(ym2) + 'H0Z', asph, null, 0);
    if (MB.cw > 0) add('M' + X(xc1) + ' ' + Y(-EXT) + 'H' + X(xc2) + 'V' + Y(EXT) + 'H' + X(xc1) + 'Z', asph, null, 0, 1, '', KT);
    // yoʻl ichidagi zonalar (yadrodan tashqarida)
    MA.z.forEach(function (q) { if (!ROAD[q.t] && q.t !== 'med' || q.t === 'qat') return; if (q.a < ym1 - 0.01 || q.b > ym2 + 0.01) return; var col = line ? '#ffffff' : T[q.t], n0 = q.t === 'med' ? (s.island ? zW[0] - 1.5 : xW - 2) : xW, n1 = q.t === 'med' ? (s.island ? zE[1] + 1.5 : xE + 2) : xE; if (q.t === 'bus' || q.t === 'tram') { n0 = xW; n1 = xE; } [[-XW(), n0], [n1, XW()]].forEach(function (r) { if (r[1] > r[0]) add('M' + X(r[0]) + ' ' + Y(q.a) + 'H' + X(r[1]) + 'V' + Y(q.b) + 'H' + X(r[0]) + 'Z', col, line || q.t === 'med' ? INK : null, 0.6); }); });
    function XW() { return 784 / px / 2 + 2; }
    MB.z.forEach(function (q) { if (!ROAD[q.t] && q.t !== 'med' || q.t === 'qat') return; if (q.a < xc1 - 0.01 || q.b > xc2 + 0.01) return; var col = line ? '#ffffff' : T[q.t], n0 = q.t === 'med' ? (s.island ? zN[0] - 1.5 : bN - 2) : bN, n1 = q.t === 'med' ? (s.island ? zS[1] + 1.5 : bS + 2) : bS; [[-EXT, n0], [n1, EXT]].forEach(function (r) { if (r[1] > r[0]) add('M' + X(q.a) + ' ' + Y(r[0]) + 'H' + X(q.b) + 'V' + Y(r[1]) + 'H' + X(q.a) + 'Z', col, line || q.t === 'med' ? INK : null, 0.6, 1, '', KT); }); });
    // 3) burchak radiuslari va bordyurlar
    CR.forEach(function (c) { add('M' + pp(c.P) + 'L' + pp(c.T1) + 'A' + (R * px) + ' ' + (R * px) + ' 0 0 ' + c.sw + ' ' + pp(c.T2) + 'Z', asph, null, 0); add('M' + pp(c.T1) + 'A' + (R * px) + ' ' + (R * px) + ' 0 0 ' + c.sw + ' ' + pp(c.T2), null, INK, 1.4); var f1 = [c.T1[0] + c.e1[0] * 200, c.T1[1]], f2 = [c.T2[0] + c.e2[0] * 200, c.T2[1] + c.e2[1] * 200]; add('M' + pp(c.T1) + 'L' + pp(f1), null, INK, 1.4); add('M' + pp(c.T2) + 'L' + pp(f2), null, INK, 1.4); });
    if (!hasCore) { if (MA.cw > 0) add('M0 ' + Y(ym1) + 'H784M0 ' + Y(ym2) + 'H784', null, INK, 1.4); if (MB.cw > 0) add('M' + X(xc1) + ' ' + Y(-EXT) + 'V' + Y(EXT) + 'M' + X(xc2) + ' ' + Y(-EXT) + 'V' + Y(EXT), null, INK, 1.4, 1, '', KT); }
    // 4) velo va avtobus davomi (vb)
    if (hasCore && Ly.vb !== false) {
      MA.bus.forEach(function (q) { add('M' + X(xW) + ' ' + Y(q.a) + 'H' + X(xE) + 'V' + Y(q.b) + 'H' + X(xW) + 'Z', line ? '#ffffff' : T.bus, null, 0, 0.55); add('M' + X(xW) + ' ' + Y(q.a) + 'H' + X(xE) + 'M' + X(xW) + ' ' + Y(q.b) + 'H' + X(xE), null, WM, 1.2, 1, '6 5'); });
      MB.bus.forEach(function (q) { add('M' + X(q.a) + ' ' + Y(bN) + 'H' + X(q.b) + 'V' + Y(bS) + 'H' + X(q.a) + 'Z', line ? '#ffffff' : T.bus, null, 0, 0.55, '', KT); add('M' + X(q.a) + ' ' + Y(bN) + 'V' + Y(bS) + 'M' + X(q.b) + ' ' + Y(bN) + 'V' + Y(bS), null, WM, 1.2, 1, '6 5', KT); });
      // velo yoʻlini oʻtish joyiga ulash (burchakda egilish)
      var vcol = line ? '#ffffff' : T.velo;
      if (vwA) MA.velo.forEach(function (q) { var north = q.b <= 0, r = north ? [zN[1], zN[1] + vwA] : [zS[0] - vwA, zS[0]]; [xc1, xc2].forEach(function (xk) { var sd = xk < 0 ? -1 : 1, kr = kLine(sd * (MB.rl / 2 + SB)); var pa = inter(mainLine(q.a)[0], [1, 0], kr[0], kr[1]), pb = inter(mainLine(q.b)[0], [1, 0], kr[0], kr[1]); var g0 = G(xk, r[0]), g1 = G(xk, r[1]); add('M' + pp(pa) + 'L' + pp(pb) + 'L' + pp(g1) + 'L' + pp(g0) + 'Z', vcol, line ? INK : null, 0.6); }); });
      if (vwB) MB.velo.forEach(function (q) { var west = q.b <= 0, r = west ? [zW[1], zW[1] + vwB] : [zE[0] - vwB, zE[0]]; [ym1, ym2].forEach(function (yk) { var sd = yk < 0 ? -1 : 1, ml = mainLine(sd * (MA.rl / 2 + SB)); var pa = inter(ml[0], ml[1], kLine(q.a)[0], UV), pb = inter(ml[0], ml[1], kLine(q.b)[0], UV); add('M' + pp(pa) + 'L' + pp(pb) + 'L' + X(r[1]) + ' ' + Y(yk) + 'L' + X(r[0]) + ' ' + Y(yk) + 'Z', vcol, line ? INK : null, 0.6); }); });
      // velo oʻtish: asosiy koʻchaning velo yoʻli K qatnov qismini kesadi (K lokal) va aksincha
      if (vwA) [[zN[1], zN[1] + vwA], [zS[0] - vwA, zS[0]]].forEach(function (r) { add('M' + X(xc1) + ' ' + Y(r[0]) + 'H' + X(xc2) + 'V' + Y(r[1]) + 'H' + X(xc1) + 'Z', line ? '#ffffff' : T.velo, null, 0, 0.9, '', KT); for (var a2 = xc1; a2 < xc2; a2 += 1.0) add('M' + X(a2) + ' ' + Y(r[0]) + 'h' + (0.5 * px) + 'M' + X(a2) + ' ' + Y(r[1]) + 'h' + (0.5 * px), null, WM, 1.6, 1, '', KT); });
      if (vwB) [[zW[1], zW[1] + vwB], [zE[0] - vwB, zE[0]]].forEach(function (r) { add('M' + X(r[0]) + ' ' + Y(ym1) + 'H' + X(r[1]) + 'V' + Y(ym2) + 'H' + X(r[0]) + 'Z', line ? '#ffffff' : T.velo, null, 0, 0.9); for (var y2 = ym1; y2 < ym2; y2 += 1.0) add('M' + X(r[0]) + ' ' + Y(y2) + 'v' + (0.5 * px) + 'M' + X(r[1]) + ' ' + Y(y2) + 'v' + (0.5 * px), null, WM, 1.6); });
    }
    // 5) piyoda oʻtish joylari (px)
    if (hasCore && s.zebra && Ly.px !== false) {
      [zW, zE].forEach(function (z) { if (s.raised) add('M' + X(z[0]) + ' ' + Y(ym1) + 'H' + X(z[1]) + 'V' + Y(ym2) + 'H' + X(z[0]) + 'Z', line ? '#fff' : '#e7dfd0', null, 0); for (var yy = ym1 + 0.25; yy < ym2 - 0.3; yy += 1.0) add('M' + X(z[0]) + ' ' + Y(yy) + 'H' + X(z[1]) + 'V' + Y(yy + 0.5) + 'H' + X(z[0]) + 'Z', '#ffffff', line ? INK : null, line ? 0.4 : 0); });
      [zN, zS].forEach(function (z) { if (s.raised) add('M' + X(xc1) + ' ' + Y(z[0]) + 'H' + X(xc2) + 'V' + Y(z[1]) + 'H' + X(xc1) + 'Z', line ? '#fff' : '#e7dfd0', null, 0, 1, '', KT); for (var xx = xc1 + 0.25; xx < xc2 - 0.3; xx += 1.0) add('M' + X(xx) + ' ' + Y(z[0]) + 'V' + Y(z[1]) + 'H' + X(xx + 0.5) + 'V' + Y(z[0]) + 'Z', '#ffffff', line ? INK : null, line ? 0.4 : 0, 1, '', KT); });
      if (s.island) { MA.med.forEach(function (q) { if (q.w < 1.5) return; [zW, zE].forEach(function (z) { add('M' + X(z[0] - 1.5) + ' ' + Y(q.a) + 'H' + X(z[1] + 1.5) + 'V' + Y(q.b) + 'H' + X(z[0] - 1.5) + 'Z', line ? '#fff' : '#ece8df', INK, 1); for (var yy = q.a + 0.25; yy < q.b - 0.3; yy += 1.0) add('M' + X(z[0]) + ' ' + Y(yy) + 'H' + X(z[1]) + 'V' + Y(yy + 0.5) + 'H' + X(z[0]) + 'Z', '#d6d0c4', null, 0); }); }); MB.med.forEach(function (q) { if (q.w < 1.5) return; [zN, zS].forEach(function (z) { add('M' + X(q.a) + ' ' + Y(z[0] - 1.5) + 'H' + X(q.b) + 'V' + Y(z[1] + 1.5) + 'H' + X(q.a) + 'Z', line ? '#fff' : '#ece8df', INK, 1, 1, '', KT); }); }); }
    }
    // 6) yoʻl chiziqlari, toʻxtash chiziqlari, strelkalar (mk)
    function arrow(cx, cy, kind, Lb) { var d = 'M' + cx + ' ' + (cy + 2.6 * px) + 'V' + (cy - 1.2 * px) + 'M' + (cx - 0.5 * px) + ' ' + (cy - 0.4 * px) + 'L' + cx + ' ' + (cy - 1.5 * px) + 'L' + (cx + 0.5 * px) + ' ' + (cy - 0.4 * px); if (kind === 'r') d += 'M' + cx + ' ' + (cy + 0.6 * px) + 'Q' + cx + ' ' + (cy - 0.1 * px) + ' ' + (cx + 0.9 * px) + ' ' + (cy - 0.1 * px) + 'M' + (cx + 0.6 * px) + ' ' + (cy - 0.5 * px) + 'L' + (cx + 1.1 * px) + ' ' + (cy - 0.1 * px) + 'L' + (cx + 0.6 * px) + ' ' + (cy + 0.3 * px); if (kind === 'l') d += 'M' + cx + ' ' + (cy + 0.6 * px) + 'Q' + cx + ' ' + (cy - 0.1 * px) + ' ' + (cx - 0.9 * px) + ' ' + (cy - 0.1 * px) + 'M' + (cx - 0.6 * px) + ' ' + (cy - 0.5 * px) + 'L' + (cx - 1.1 * px) + ' ' + (cy - 0.1 * px) + 'L' + (cx - 0.6 * px) + ' ' + (cy + 0.3 * px); (Lb || L).add(d, null, WM, 1.6); }
    if (Ly.mk !== false) {
      // asosiy: sharqqa (janubiy yarmi, y>0) — toʻxtash zW[0]-1 da; gʻarbga (y<0) — zE[1]+1 da
      var stopW = hasCore ? zW[0] - 1 : -999, stopE = hasCore ? zE[1] + 1 : 999;
      for (var i = 0; i < MA.z.length - 1; i++) { var q = MA.z[i], nx = MA.z[i + 1]; if (!(ROAD[q.t] && ROAD[nx.t]) || q.t === 'tram' || nx.t === 'tram' || q.t === 'park' || nx.t === 'park') continue; var cen = Math.abs(q.b) < 0.01; [[-XW(), stopW], [stopE, XW()]].forEach(function (r, side) { if (r[1] <= r[0]) return; var solidFrom = side ? r[0] : r[1] - 20, solidTo = side ? r[0] + 20 : r[1]; if (cen) { add('M' + X(r[0]) + ' ' + Y(q.b - 0.12) + 'H' + X(r[1]) + 'M' + X(r[0]) + ' ' + Y(q.b + 0.12) + 'H' + X(r[1]), null, WM, 1); } else { var a0 = side ? solidTo : r[0], a1 = side ? r[1] : solidFrom; if (a1 > a0) add('M' + X(a0) + ' ' + Y(q.b) + 'H' + X(a1), null, WM, 1, 1, (3 * px) + ' ' + (6 * px)); add('M' + X(Math.max(r[0], solidFrom)) + ' ' + Y(q.b) + 'H' + X(Math.min(r[1], solidTo)), null, WM, 1.1); } }); }
      for (var j = 0; j < MB.z.length - 1; j++) { var q2 = MB.z[j], n2 = MB.z[j + 1]; if (!(ROAD[q2.t] && ROAD[n2.t]) || q2.t === 'tram' || n2.t === 'tram' || q2.t === 'park' || n2.t === 'park') continue; var cen2 = Math.abs(q2.b) < 0.01; var sN = hasCore ? zN[0] - 1 : -999, sS = hasCore ? zS[1] + 1 : 999; [[-EXT, sN], [sS, EXT]].forEach(function (r, side) { if (r[1] <= r[0]) return; if (cen2) add('M' + X(q2.b - 0.12) + ' ' + Y(r[0]) + 'V' + Y(r[1]) + 'M' + X(q2.b + 0.12) + ' ' + Y(r[0]) + 'V' + Y(r[1]), null, WM, 1, 1, '', KT); else { var sf = side ? r[0] : r[1] - 20, st2 = side ? r[0] + 20 : r[1]; var a0 = side ? st2 : r[0], a1 = side ? r[1] : sf; if (a1 > a0) add('M' + X(q2.b) + ' ' + Y(a0) + 'V' + Y(a1), null, WM, 1, 1, (3 * px) + ' ' + (6 * px), KT); add('M' + X(q2.b) + ' ' + Y(Math.max(r[0], sf)) + 'V' + Y(Math.min(r[1], st2)), null, WM, 1.1, 1, '', KT); } }); }
      if (hasCore) {
        var inA = MA.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.a >= 0; }), outA = MA.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.b <= 0; });
        var a0 = inA.length ? inA[0].a : 0, a1 = inA.length ? inA[inA.length - 1].b : 0; if (a1 > a0) add('M' + X(stopW) + ' ' + Y(a0) + 'V' + Y(a1), null, WM, 3);
        var o0 = outA.length ? outA[0].a : 0, o1 = outA.length ? outA[outA.length - 1].b : 0; if (o1 > o0) add('M' + X(stopE) + ' ' + Y(o0) + 'V' + Y(o1), null, WM, 3);
        inA.forEach(function (q, k) { var cy = Y((q.a + q.b) / 2), cx = X(stopW - 6); arrow(cx, cy, k === inA.length - 1 ? 'r' : (k === 0 && inA.length > 1 ? 'l' : 's'), rot(cx, cy)); });
        outA.forEach(function (q, k) { var cy = Y((q.a + q.b) / 2), cx = X(stopE + 6); var Lr = { line: line, ink: INK, add: function (d, f, st, w, o, da, t) { add(d, f, st, w, o, da, 'rotate(-90 ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')' + (t ? ' ' + t : '')); } }; arrow(cx, cy, k === 0 ? 'r' : (k === outA.length - 1 && outA.length > 1 ? 'l' : 's'), Lr); });
        var sNb = zN[0] - 1, sSb = zS[1] + 1;
        var inB = MB.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.b <= 0; }), outB = MB.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.a >= 0; });
        if (inB.length) add('M' + X(inB[0].a) + ' ' + Y(sNb) + 'H' + X(inB[inB.length - 1].b), null, WM, 3, 1, '', KT);
        if (outB.length) add('M' + X(outB[0].a) + ' ' + Y(sSb) + 'H' + X(outB[outB.length - 1].b), null, WM, 3, 1, '', KT);
        inB.forEach(function (q, k) { var cx = X((q.a + q.b) / 2), cy = Y(sNb - 6); var Lr = { line: line, ink: INK, add: function (d, f, st, w, o, da, t) { add(d, f, st, w, o, da, KT + ' rotate(180 ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')' + (t ? ' ' + t : '')); } }; arrow(cx, cy, k === 0 ? 'r' : (k === inB.length - 1 && inB.length > 1 ? 'l' : 's'), Lr); });
        outB.forEach(function (q, k) { var cx = X((q.a + q.b) / 2), cy = Y(sSb + 6); arrow(cx, cy, k === outB.length - 1 ? 'r' : (k === 0 && outB.length > 1 ? 'l' : 's'), LK); });
      }
      MA.z.forEach(function (q) { if (q.t !== 'tram') return; [0.27, 0.73].forEach(function (f) { add('M0 ' + Y(q.a + q.w * f) + 'H784', null, '#55524d', 1.1); }); });
      MB.z.forEach(function (q) { if (q.t !== 'tram') return; [0.27, 0.73].forEach(function (f) { add('M' + X(q.a + q.w * f) + ' ' + Y(-EXT) + 'V' + Y(EXT), null, '#55524d', 1.1, 1, '', KT); }); });
      MA.bus.forEach(function (q) { [-1, 1].forEach(function (sd) { var xx = sd < 0 ? stopW - 18 : stopE + 18; tx(X(xx), Y((q.a + q.b) / 2) + 3, 'A', 11, WM, 800); }); });
    }
    // 7) avtoturargoh va DK masofalari (np)
    var removed = 0;
    function parkStreet(S2, v, dd, Lb, c0, c1, cr0, cr1, lo, hi) { S2.z.forEach(function (q, qi) { if (q.t !== 'park') return; var noA = Math.min(c0 - dd[0], cr0 - dd[1]), noB = Math.max(c1 + dd[0], cr1 + dd[1]);
      [[lo, noA], [noB, hi]].forEach(function (r2, side) { var n = Math.floor((r2[1] - r2[0]) / 6); for (var k2 = 0; k2 < n; k2++) { var m0 = side ? r2[0] + k2 * 6 : r2[1] - (k2 + 1) * 6, mc = m0 + 3; if (q.f.dchontak && k2 % 4 === 2) { if (v) AS.pDaraxt(Lb, X((q.a + q.b) / 2), Y(mc), px, 2.2, k2); else AS.pDaraxt(Lb, X(mc), Y((q.a + q.b) / 2), px, 2.2, k2); continue; } if (v) AS.pMashina(Lb, X((q.a + q.b) / 2), Y(mc), px, q.a > 0); else AS.pMashina(rot(X(mc), Y((q.a + q.b) / 2), Lb), X(mc), Y((q.a + q.b) / 2), px, q.a < 0); if (v) Lb.add('M' + X(q.a) + ' ' + Y(m0) + 'H' + X(q.b), null, WM, 0.8); else Lb.add('M' + X(m0) + ' ' + Y(q.a) + 'V' + Y(q.b), null, WM, 0.8); } });
      removed += Math.round(((c0 - noA) + (noB - c1)) / 6);
      if (s.bulb) [[cr0 - 6, cr0], [cr1, cr1 + 6]].forEach(function (r3) { if (v) Lb.add('M' + X(q.a) + ' ' + Y(r3[0]) + 'H' + X(q.b) + 'V' + Y(r3[1]) + 'H' + X(q.a) + 'Z', line ? '#fff' : '#ece8df', INK, 1); else Lb.add('M' + X(r3[0]) + ' ' + Y(q.a) + 'H' + X(r3[1]) + 'V' + Y(q.b) + 'H' + X(r3[0]) + 'Z', line ? '#fff' : '#ece8df', INK, 1); });
      if (Ly.np !== false) [[noA, c0 - (s.bulb ? c0 - cr0 + 6 : 0)], [c1 + (s.bulb ? cr1 - c1 + 6 : 0), noB]].forEach(function (r3) { var aa = Math.max(lo, Math.min(r3[0], r3[1])), bb = Math.min(hi, Math.max(r3[0], r3[1])); for (var hh = aa; hh < bb; hh += 1.2) { if (v) Lb.add('M' + X(q.a) + ' ' + Y(hh) + 'L' + X(q.b) + ' ' + Y(Math.min(bb, hh + q.w)), null, '#b23a2e', 0.6, 0.55); else Lb.add('M' + X(hh) + ' ' + Y(q.a) + 'L' + X(Math.min(bb, hh + q.w)) + ' ' + Y(q.b), null, '#b23a2e', 0.6, 0.55); } }); }); }
    if (hasCore) { parkStreet(MA, 0, dkA, L, xW, xE, zW[0], zE[1], -XW(), XW()); parkStreet(MB, 1, dkB, LK, bN, bS, zN[0], zS[1], -EXT, EXT); }
    // 8) daraxt, fonar, odamlar
    var TR = [];
    [[MA, 0, L, xW - 4, xE + 4, -XW(), XW()], [MB, 1, LK, bN - 4, bS + 4, -EXT, EXT]].forEach(function (p) { var S2 = p[0], v = p[1], Lb = p[2], ex0 = p[3] - (v ? MA.rl / 2 : MB.rl / 2), ex1 = p[4] + (v ? MA.rl / 2 : MB.rl / 2); S2.z.forEach(function (q, qi) { var c = (q.a + q.b) / 2; if ((q.t === 'yash' || q.t === 'med') && q.f.daraxt) for (var m = p[5] + 4; m < p[6]; m += 8) { if (m > ex0 - 2 && m < ex1 + 2) continue; TR.push(v ? G(c, m) : [m, c]); if (v) AS.pDaraxt(Lb, X(c), Y(m), px, Math.min(q.w / 2 + 1.5, 3), qi + Math.round(m)); else AS.pDaraxt(Lb, X(m), Y(c), px, Math.min(q.w / 2 + 1.5, 3), qi + Math.round(m)); } if (q.t === 'mebel' && q.f.fonar) for (var m2 = p[5] + 9; m2 < p[6]; m2 += 24) { if (m2 > ex0 && m2 < ex1) continue; if (v) AS.pFonar(Lb, X(c), Y(m2), px, q.a < 0 ? 1 : -1); else AS.pFonar(rot(X(m2), Y(c)), X(m2), Y(c), px, q.a < 0 ? 1 : -1); } if (q.t === 'piy') for (var m3 = p[5] + 6; m3 < p[6]; m3 += 13) { if (m3 > ex0 && m3 < ex1) continue; var jx = c + (Math.round(m3) % 2 ? 0.25 : -0.25) * q.w; if (v) AS.pOdam(Lb, X(jx), Y(m3), px, Math.round(m3) % 2 ? 0 : Math.PI); else AS.pOdam(L, X(m3), Y(jx), px, Math.round(m3) % 2 ? Math.PI / 2 : -Math.PI / 2); } }); });
    if (hasCore && s.zebra) { AS.pOdam(L, X((zW[0] + zW[1]) / 2), Y(ym1 + (ym2 - ym1) * 0.35), px, 0); AS.pOdam(LK, X(xc1 + (xc2 - xc1) * 0.6), Y((zS[0] + zS[1]) / 2), px, Math.PI / 2); }
    // 9) koʻrinish uchburchaklari (st)
    var vAs = s.vA, vBs = s.vB, dA = SSD[vAs] || 75, dB = SSD[vBs] || 55, triBad = 0, triTree = 0;
    function inTri(p, a, b, c) { function sg(p1, p2, p3) { return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]); } var d1 = sg(p, a, b), d2 = sg(p, b, c), d3 = sg(p, c, a); return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0))); }
    if (hasCore) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var lA = q[1] < 0 ? ym1 + 1.75 : ym2 - 1.75, lB = q[0] < 0 ? xc1 + 1.75 : xc2 - 1.75; var ml = mainLine(lA), kl = kLine(lB); var C = inter(ml[0], ml[1], kl[0], kl[1]); var A2 = [C[0] + q[0] * dA, C[1]], B2 = [C[0] + q[1] * dB * UV[0], C[1] + q[1] * dB * UV[1]]; var bm = mainLine(q[1] * (MA.rl / 2 + SB)), bk = kLine(q[0] * (MB.rl / 2 + SB)); var bc = inter(bm[0], bm[1], bk[0], bk[1]); var hit = inTri(bc, C, A2, B2); if (hit) triBad++; TR.forEach(function (t) { if (inTri(t, C, A2, B2) && Math.hypot(t[0] - C[0], t[1] - C[1]) < 20) triTree++; }); if (s.sight) { add('M' + pp(C) + 'L' + pp(A2) + 'L' + pp(B2) + 'Z', '#4c5bd4', null, 0, 0.05); add('M' + pp(A2) + 'L' + pp(B2), null, '#4c5bd4', 1, 0.8, '5 4'); if (hit) add(El(X(bc[0]), Y(bc[1]), 6, 6), null, '#b23a2e', 2); } });
    // 10) burilish izi (tr) — 90° da aniq, qiyshiqda taxminiy; "Hammasi" — 4 avtomobil bir chizmada
    var VH = { yengil: ['Yengil', 3.4, 0.9, 1.8, 7.3], avtobus: ['Avtobus 12 m', 7.6, 2.4, 2.6, 12.8], ot: ['Oʻt oʻchirish', 6.1, 1.5, 2.5, 12.8], yuk: ['Yuk 10 m', 6.1, 1.2, 2.5, 12.8] };
    var VC = { yengil: '#2b7449', avtobus: '#4c5bd4', ot: '#b23a2e', yuk: '#c98a12' }, VDA = { yengil: '', avtobus: '6 3', ot: '2 3', yuk: '9 3 2 3' };
    var ALL = s.veh === 'all', VKEYS = ALL ? ['yengil', 'yuk', 'ot', 'avtobus'] : [s.veh in VH ? s.veh : 'avtobus'], TRS = [];
    var tv = VH[VKEYS[VKEYS.length - 1]], TR0 = null;
    function calcTurn(key, Rv) { var tv1 = VH[key], Lw = tv1[1], fo = tv1[2], Wv = tv1[3], Rmin = tv1[4], RrMin = Math.sqrt(Math.max(1, Rmin * Rmin - Lw * Lw)); var c0 = crn(xc1, ym2), phi = Math.acos(Math.max(-1, Math.min(1, c0.e1[0] * c0.e2[0] + c0.e1[1] * c0.e2[1]))), bis = [c0.e1[0] + c0.e2[0], c0.e1[1] + c0.e2[1]], bl = Math.hypot(bis[0], bis[1]); var Ck = [c0.P[0] + bis[0] / bl * Rv / Math.sin(phi / 2), c0.P[1] + bis[1] / bl * Rv / Math.sin(phi / 2)];
      var Rr = Math.max(RrMin, Rv + 0.5 + Wv / 2), Ri = Rr - Wv / 2, Ro = Math.sqrt(Math.pow(Rr + Wv / 2, 2) + Math.pow(Lw + fo, 2));
      var laneA = (MA.z.filter(function (q) { return q.t === 'qat' || q.t === 'bus'; }).map(function (q) { return q.w; })[0]) || 3.5, laneB = (MB.z.filter(function (q) { return q.t === 'qat' || q.t === 'bus'; }).map(function (q) { return q.w; })[0]) || 3.5;
      var parkA = s.bulb ? 0 : MA.z.filter(function (q) { return q.t === 'park' && q.a > 0; }).reduce(function (a2, q) { return a2 + q.w; }, 0), parkB = s.bulb ? 0 : MB.z.filter(function (q) { return q.t === 'park' && q.a < 0; }).reduce(function (a2, q) { return a2 + q.w; }, 0);
      var appO = (Ck[1] - Rr - Wv / 2), lanesA = Math.max(1, Math.ceil((ym2 - parkA - appO) / laneA - 0.01)), exO = Lc(Ck)[0] + Rr + Wv / 2, lanesB = Math.max(1, Math.ceil((exO - (xc1 + parkB)) / laneB - 0.01));
      var crossA = appO < 0, crossB = exO > 0;
      return { key: key, n: tv1[0], Ck: Ck, c0: c0, Lw: Lw, fo: fo, Wv: Wv, Rr: Rr, Ri: Ri, Ro: Ro, lanesA: lanesA, lanesB: lanesB, crossA: crossA, crossB: crossB, swing: Rr > RrMin + 0.05 ? 0 : 1, st: (crossA || crossB) ? 'bad' : ((lanesA > 1 || lanesB > 1) ? 'warn' : 'ok') }; }
    function rOk(key) { for (var r = 3; r <= 25; r++) if (calcTurn(key, r).st === 'ok') return r; return 0; }
    function turnOne(key, idx) {
      var T1 = calcTurn(key, R), tv1 = VH[key], Lw = T1.Lw, fo = T1.fo, Wv = T1.Wv, Rr = T1.Rr, Ri = T1.Ri, Ro = T1.Ro, Ck = T1.Ck, c0 = T1.c0, crossA = T1.crossA, crossB = T1.crossB, lanesA = T1.lanesA, lanesB = T1.lanesB;
      var col = ALL ? VC[key] : DC[T1.st];
      T1.mid = null; if (Ly.tr !== false || Ly.cf !== false) { var th0q = -Math.PI / 2, th1q = th0q + (Math.PI - Math.acos(c0.e1[0] * c0.e2[0] + c0.e1[1] * c0.e2[1])), mq = []; for (var kq = 0; kq <= 16; kq++) { var tq = th0q + (th1q - th0q) * kq / 16; mq.push([Ck[0] + Rr * Math.cos(tq), Ck[1] + Rr * Math.sin(tq)]); } for (var kq2 = 1; kq2 <= 8; kq2++) mq.push([mq[16][0] + UV[0] * 4 * kq2, mq[16][1] + UV[1] * 4 * kq2]); T1.mid = mq; }
      if (Ly.tr !== false && DIR !== 1) {
        var th0 = -Math.PI / 2, th1 = th0 + (Math.PI - Math.acos(c0.e1[0] * c0.e2[0] + c0.e1[1] * c0.e2[1]));
        function arcPts(r, a, b, n) { var o = []; for (var k = 0; k <= n; k++) { var th = a + (b - a) * k / n; o.push([Ck[0] + r * Math.cos(th), Ck[1] + r * Math.sin(th)]); } return o; }
        var outer = arcPts(Ro, th0, th1, 16), inner = arcPts(Ri, th1, th0, 16), mid = arcPts(Rr, th0, th1, 16);
        add('M' + outer.concat(inner).map(pp).join('L') + 'Z', col, null, 0, ALL ? 0.08 : 0.18);
        add('M' + outer.map(pp).join('L'), null, col, ALL ? 1.6 : 1.2, 0.95, ALL ? (VDA[key] || '') : '4 3'); add('M' + inner.map(pp).join('L'), null, col, ALL ? 1.6 : 1, 0.95, ALL ? (VDA[key] || '') : '2 2');
        if (!ALL) {
          var ap = [Ck[0] - 28, mid[0][1]], ep = [mid[16][0] + UV[0] * 28, mid[16][1] + UV[1] * 28];
          add('M' + pp(ap) + 'L' + mid.map(pp).join('L') + 'L' + pp(ep), null, col, 1.6, 0.9);
          [0, 8, 16].forEach(function (k) { var p0 = mid[k], th = th0 + (th1 - th0) * k / 16, hd = th + Math.PI / 2, Lb2 = Lw + fo + 1.5, cxp = X(p0[0] + Math.cos(hd) * Lw / 2), cyp = Y(p0[1] + Math.sin(hd) * Lw / 2); add('M' + (cxp - Lb2 * px / 2) + ' ' + (cyp - Wv * px / 2) + 'h' + (Lb2 * px) + 'v' + (Wv * px) + 'h' + (-Lb2 * px) + 'Z', '#ffffff', col, 1, 0.95, '', 'rotate(' + (hd * 180 / Math.PI).toFixed(1) + ' ' + cxp.toFixed(1) + ' ' + cyp.toFixed(1) + ')'); });
          tx(X(Ck[0] + Ro) + 4, Y(Ck[1] - Ro * 0.72), tv1[0] + ' · Ro ' + fm(Ro) + ' m', 9, col, 700, 'start');
        }
      }
      return T1;
    }
    var DIR = s.tdir == null ? 0 : s.tdir;
    if (hasCore && s.turn) { VKEYS.forEach(function (k, i) { TRS.push(turnOne(k, i)); }); TR0 = TRS[TRS.length - 1]; }
    // 10b) chapga burilish — chorraha markazi orqali, qarshi oqimni kesib
    var TLS = [], CF = [];
    function calcLeft(key) {
      var tv1 = VH[key], Lw = tv1[1], fo = tv1[2], Wv = tv1[3], Rmin = tv1[4], RrMin = Math.sqrt(Math.max(1, Rmin * Rmin - Lw * Lw));
      var inA = MA.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.a >= 0; }), outB = MB.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.a >= 0; });
      var y0 = inA.length ? (inA[0].a + inA[0].b) / 2 : ym2 / 2, x0 = outB.length ? (outB[0].a + outB[0].b) / 2 : xc2 / 2;
      var P = inter([0, y0], [1, 0], [x0 * NV[0], x0 * NV[1]], UV), e1 = [-1, 0], e2 = [-UV[0], -UV[1]];
      var phi = Math.acos(Math.max(-1, Math.min(1, e1[0] * e2[0] + e1[1] * e2[1])));
      var tlMax = Math.min(P[0] - xW, Lc(P)[1] - bN), Rd = Math.max(1, tlMax * Math.tan(phi / 2)), Rr = Math.max(RrMin, Rd), fit = RrMin <= Rd + 0.01;
      var tl = Rr / Math.tan(phi / 2), T1 = [P[0] + e1[0] * tl, P[1] + e1[1] * tl], T2 = [P[0] + e2[0] * tl, P[1] + e2[1] * tl];
      var bis = [e1[0] + e2[0], e1[1] + e2[1]], bl = Math.hypot(bis[0], bis[1]), C = [P[0] + bis[0] / bl * Rr / Math.sin(phi / 2), P[1] + bis[1] / bl * Rr / Math.sin(phi / 2)];
      var a0 = Math.atan2(T1[1] - C[1], T1[0] - C[0]), a1 = Math.atan2(T2[1] - C[1], T2[0] - C[0]), da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      var Ri = Rr - Wv / 2, Ro = Math.sqrt(Math.pow(Rr + Wv / 2, 2) + Math.pow(Lw + fo, 2));
      var mid = []; for (var k = 0; k <= 16; k++) { var th = a0 + da * k / 16; mid.push([C[0] + Rr * Math.cos(th), C[1] + Rr * Math.sin(th)]); } for (var k2 = 1; k2 <= 8; k2++) mid.push([mid[16][0] - UV[0] * 4 * k2, mid[16][1] - UV[1] * 4 * k2]);
      var opp = MA.z.filter(function (q) { return (q.t === 'qat' || q.t === 'bus') && q.b <= 0; }).length;
      return { key: key, n: tv1[0], C: C, Rr: Rr, Ri: Ri, Ro: Ro, a0: a0, da: da, Rd: Rd, fit: fit, opp: opp, mid: mid, Wv: Wv, Lw: Lw, fo: fo, T1: T1, behind: T1[0] < (zW[0] - 1) };
    }
    function leftOne(key, idx) {
      var t = calcLeft(key), col = ALL ? VC[key] : (t.fit ? '#4c5bd4' : '#c98a12');
      if (Ly.tr !== false) {
        function ap(r, rev) { var o = []; for (var k = 0; k <= 16; k++) { var th = t.a0 + t.da * (rev ? 16 - k : k) / 16; o.push([t.C[0] + r * Math.cos(th), t.C[1] + r * Math.sin(th)]); } return o; }
        var outer = ap(t.Ro), inner = ap(t.Ri, 1);
        add('M' + outer.concat(inner).map(pp).join('L') + 'Z', col, null, 0, ALL ? 0.06 : 0.14);
        add('M' + outer.map(pp).join('L'), null, col, ALL ? 1.4 : 1.2, 0.9, ALL ? (VDA[key] || '') : '4 3'); add('M' + inner.map(pp).join('L'), null, col, ALL ? 1.4 : 1, 0.9, ALL ? (VDA[key] || '') : '2 2');
        if (!ALL) { add('M' + pp([t.T1[0] - 20, t.T1[1]]) + 'L' + t.mid.map(pp).join('L'), null, col, 1.6, 0.9); var e = t.mid[t.mid.length - 1], e0 = t.mid[t.mid.length - 2]; var ang = Math.atan2(e[1] - e0[1], e[0] - e0[0]); add('M' + pp(e) + 'l' + (Math.cos(ang + 2.6) * 7).toFixed(1) + ' ' + (Math.sin(ang + 2.6) * 7).toFixed(1) + 'M' + pp(e) + 'l' + (Math.cos(ang - 2.6) * 7).toFixed(1) + ' ' + (Math.sin(ang - 2.6) * 7).toFixed(1), null, col, 1.6); tx(X(t.C[0]) + 4, Y(t.C[1]) - 4, '↰ ' + t.n + ' · R ' + fm(t.Rr) + ' m', 9, col, 700, 'start'); }
      }
      return t;
    }
    if (hasCore && s.turn && DIR !== 0) VKEYS.forEach(function (k, i) { TLS.push(leftOne(k, i)); });
    // toʻqnashuv nuqtalari (cf) — dizayn avtomobili boʻyicha
    function crossPts(path, fnVal, target) { for (var i = 1; i < path.length; i++) { var v0 = fnVal(path[i - 1]) - target, v1 = fnVal(path[i]) - target; if (v0 === 0 || v0 * v1 < 0) { var f = v0 / (v0 - v1); return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f]; } } return null; }
    function gy(p) { return p[1]; } function lb(p) { return Lc(p)[1]; }
    if (hasCore && s.turn) {
      var TRd = TRS.length ? TRS[TRS.length - 1] : null, TLd = TLS.length ? TLS[TLS.length - 1] : null;
      if (TLd) { MA.z.forEach(function (q) { if ((q.t === 'qat' || q.t === 'bus') && q.b <= 0) { var p = crossPts(TLd.mid, gy, (q.a + q.b) / 2); if (p) CF.push([p, 'avto', 'Chapga burilish × qarshi toʻgʻri oqim']); } if (q.t === 'tram') { var pt = crossPts(TLd.mid, gy, (q.a + q.b) / 2); if (pt) CF.push([pt, 'avto', 'Chapga burilish × tramvay izi']); } }); if (s.zebra) { var p1 = crossPts(TLd.mid, lb, (zN[0] + zN[1]) / 2); if (p1) CF.push([p1, 'piy', 'Chapga burilish × piyoda (shimoliy oʻtish)']); } if (vwA) { var p2 = crossPts(TLd.mid, lb, zN[1] + vwA / 2); if (p2) CF.push([p2, 'velo', 'Chapga burilish × velo oʻtish']); } }
      if (TRd && TRd.mid && DIR !== 1) { if (s.zebra) { var p3 = crossPts(TRd.mid, lb, (zS[0] + zS[1]) / 2); if (p3) CF.push([p3, 'piy', 'Oʻngga burilish × piyoda (janubiy oʻtish)']); } if (vwA) { var p4 = crossPts(TRd.mid, lb, zS[0] - vwA / 2); if (p4) CF.push([p4, 'velo', 'Oʻngga burilish × velo oʻtish']); } }
      if (Ly.cf !== false) CF.forEach(function (c) { var x = X(c[0][0]), y = Y(c[0][1]), cc = { avto: '#b23a2e', piy: '#c98a12', velo: '#c0583f' }[c[1]]; add(El(x, y, 6.5, 6.5), '#ffffff', cc, 2.2); if (c[1] === 'avto') add(El(x, y, 3, 3), cc, null, 0); else if (c[1] === 'piy') add('M' + (x - 3) + ' ' + y + 'h6M' + x + ' ' + (y - 3) + 'v6', null, cc, 1.6); else add('M' + (x - 3) + ' ' + (y + 2) + 'L' + x + ' ' + (y - 3) + 'L' + (x + 3) + ' ' + (y + 2), null, cc, 1.5); });
    }
    // legenda (Hammasi rejimi)
    if (hasCore && s.turn && ALL && Ly.tr !== false) { var rows = VKEYS.length, bh = 30 + rows * 13; add('M548 54h222a8 8 0 0 1 8 8v' + (bh - 16) + 'a8 8 0 0 1-8 8h-222a8 8 0 0 1-8-8v-' + (bh - 16) + 'a8 8 0 0 1 8-8Z', '#ffffff', '#d6d3cc', 0.8, 0.96); tx(552, 70, 'Burilish izi · ' + ['oʻngga', 'chapga', 'oʻngga va chapga'][DIR] + ' · R ' + fm(R) + ' m', 9, INK, 700, 'start');
      VKEYS.forEach(function (k, i) { var ly = 86 + i * 13, r = TRS[i], l = TLS[i], col = VC[k]; add('M554 ' + (ly - 3) + 'h22', null, col, 2, 1, VDA[k] || ''); var t = VH[k][0] + (DIR !== 1 && r ? ' · ↱ ' + (r.crossA || r.crossB ? 'qarshi' : r.lanesA + '+' + r.lanesB) : '') + (DIR !== 0 && l ? ' · ↰ R ' + fm(l.Rr) + (l.fit ? '' : ' (tor)') : ''); tx(582, ly, t, 8.5, col, 700, 'start'); }); }

    // 11) belgilar (sg)
    function sign(gx, gy, kind) { var x = X(gx), y = Y(gy), r = 7; add('M' + x + ' ' + (y + r) + 'v8', null, INK, 1); if (kind === 'piy') { add('M' + (x - r) + ' ' + (y - r) + 'h' + 2 * r + 'v' + 2 * r + 'h' + (-2 * r) + 'Z', '#2a62b8', '#ffffff', 1); add('M' + x + ' ' + (y - r + 2) + 'L' + (x + r - 2) + ' ' + (y + r - 2) + 'H' + (x - r + 2) + 'Z', '#ffffff', null, 0); add(El(x, y - 0.5, 1, 1) + 'M' + (x - 1.5) + ' ' + (y + 4) + 'L' + x + ' ' + (y + 0.6) + 'L' + (x + 1.5) + ' ' + (y + 4), INK, INK, 0.8); }
      else if (kind === 'asosiy') { add('M' + x + ' ' + (y - r - 1) + 'L' + (x + r + 1) + ' ' + y + 'L' + x + ' ' + (y + r + 1) + 'L' + (x - r - 1) + ' ' + y + 'Z', '#ffffff', INK, 0.8); add('M' + x + ' ' + (y - r + 2) + 'L' + (x + r - 2) + ' ' + y + 'L' + x + ' ' + (y + r - 2) + 'L' + (x - r + 2) + ' ' + y + 'Z', '#f2c230', null, 0); }
      else if (kind === 'yolber') add('M' + (x - r - 1) + ' ' + (y - r + 1) + 'H' + (x + r + 1) + 'L' + x + ' ' + (y + r + 1) + 'Z', '#ffffff', '#c0392b', 2.2);
      else if (kind === 'aylanma') { add(El(x, y, r, r), '#2a62b8', '#ffffff', 1); add('M' + (x - 3) + ' ' + (y - 2) + 'A3.5 3.5 0 1 1 ' + (x - 3) + ' ' + (y + 2), null, '#ffffff', 1.2); }
      else if (kind === 'velo') { add(El(x, y, r, r), '#2a62b8', '#ffffff', 1); add(El(x - 2.5, y + 1.5, 1.8, 1.8) + El(x + 2.5, y + 1.5, 1.8, 1.8) + 'M' + (x - 2.5) + ' ' + (y + 1.5) + 'L' + (x - 0.5) + ' ' + (y - 2) + 'L' + (x + 2.5) + ' ' + (y + 1.5), null, '#ffffff', 0.9); }
      else if (kind === 'avtobus') { add('M' + (x - r) + ' ' + (y - r) + 'h' + 2 * r + 'v' + 2 * r + 'h' + (-2 * r) + 'Z', '#2a62b8', '#ffffff', 1); add('M' + (x - 3.5) + ' ' + (y - 3.5) + 'h7v6h-7Z', '#ffffff', null, 0); }
      else if (kind === 'toxtash') { add(El(x, y, r, r), '#2a62b8', '#c0392b', 2); add('M' + (x - 4) + ' ' + (y - 4) + 'L' + (x + 4) + ' ' + (y + 4) + 'M' + (x + 4) + ' ' + (y - 4) + 'L' + (x - 4) + ' ' + (y + 4), null, '#c0392b', 1.6); } }
    var SG = [];
    if (hasCore && Ly.sg !== false) {
      var side = [[zW[0] - 2, ym2 + 1.2, 'A'], [zE[1] + 2, ym1 - 1.2, 'A']], sideK = [[xc1 - 1.2, zN[0] - 2], [xc2 + 1.2, zS[1] + 2]].map(function (p) { return G(p[0], p[1]); });
      if (s.zebra) { side.forEach(function (p) { sign(p[0], p[1], 'piy'); }); sideK.forEach(function (p) { sign(p[0], p[1], 'piy'); }); SG.push('piy'); }
      if (s.ctl === 1) { sign(zW[0] - 9, ym2 + 1.2, 'asosiy'); sign(zE[1] + 9, ym1 - 1.2, 'asosiy'); sideK.forEach(function (p, i) { var g = G([xc1 - 1.2, xc2 + 1.2][i], [zN[0] - 8, zS[1] + 8][i]); sign(g[0], g[1], 'yolber'); }); SG.push('asosiy', 'yolber'); }
      if (s.ctl === 2) { sign(zW[0] - 9, ym2 + 1.2, 'aylanma'); sign(zE[1] + 9, ym1 - 1.2, 'aylanma'); SG.push('aylanma'); }
      if (MA.bus.length) { sign(zW[0] - 16, ym2 + 1.2, 'avtobus'); sign(zE[1] + 16, ym1 - 1.2, 'avtobus'); SG.push('avtobus'); }
      if (vwA || vwB) { var gv = G(xc1 - 1.2, zN[0] - 14); sign(gv[0], gv[1], 'velo'); SG.push('velo'); }
      if (MA.park || MB.park) { sign(zW[0] - dkA[0] - 1, MA.park ? ym2 + 1.2 : ym2 + 1.2, 'toxtash'); SG.push('toxtash'); }
      if (s.ctl === 0) { CR.forEach(function (c, i) { var p = [c.P[0] + (c.e1[0] + c.e2[0]) * 1.5, c.P[1] + (c.e1[1] + c.e2[1]) * 1.5], x = X(p[0]), y = Y(p[1]); add('M' + (x - 3) + ' ' + (y - 5) + 'h6v10h-6Z', INK, null, 0); add(El(x, y - 2.5, 1.6, 1.6), '#5cbf85', null, 0); add(El(x, y + 2.5, 1.6, 1.6), '#ef6b5c', null, 0, 0.5); }); SG.push('svetofor'); }
    }
    if (hasCore && s.ctl === 2) { var rr = Math.max(2, Math.min(MA.cw, MB.cw) / 2 - 5); add(El(CX, CY, rr * px, rr * px), line ? '#fff' : '#d3e4c6', INK, 1.2); add(El(CX, CY, (rr + 1) * px, (rr + 1) * px), null, WM, 1, 1, '4 4'); }
    // yozuvlar
    tx(16, 22, 'Chorraha · reja · ' + s.ang + '°', 12, '#141414', 700, 'start'); tx(16, 35, MA.n + ' × ' + MB.n, 9.5, LIGHT, 400, 'start');
    if (hasCore) { var cc = crn(xc2, ym1); tx(X(cc.C[0]) + 4, Y(cc.C[1]) + 4, 'R ' + fm(R), 9, '#4c5bd4', 700, 'start', 'IBM Plex Mono, monospace'); }
    var SY = 832; [0, 1, 2, 3, 4].forEach(function (q) { add('M' + (16 + q * 2 * px) + ' ' + SY + 'h' + (2 * px) + 'v4h' + (-2 * px) + 'Z', q % 2 ? '#ffffff' : INK, INK, 0.6); }); tx(16, SY - 4, '0', 7.5, INK, 400, 'start'); tx(16 + 10 * px, SY - 4, '10 m', 7.5, INK, 400, 'middle');
    add('M0 800H784', null, '#d6d3cc', 0.8); add('M0 800H784V860H0Z', '#ffffff', null, 0); tx(16, 818, 'Koʻrinish uchburchagi: ' + dA + ' m × ' + dB + ' m (toʻxtash masofasi, ' + vAs + ' / ' + vBs + ' km/h)', 9, '#4c5bd4', 400, 'start'); tx(776, 838, 'Archemistry Lab · Koʻchasoz C', 7.5, LIGHT, 400, 'end');
    add('M16 828h' + (10 * px) + 'v4h' + (-10 * px) + 'Z', null, null, 0);
    [0, 1, 2, 3, 4].forEach(function (q) { add('M' + (16 + q * 2 * px) + ' ' + SY + 'h' + (2 * px) + 'v4h' + (-2 * px) + 'Z', q % 2 ? '#ffffff' : INK, INK, 0.6); });
    // ===== tekshiruv =====
    var R0 = [];
    function chk(st, n, src, v) { R0.push({ st: st, n: n, src: src, v: v, c: DC[st] }); }
    var Rmin2 = s.rek ? 5 : 15;
    if (hasCore) chk(R >= Rmin2 ? 'ok' : 'bad', 'Burilish radiusi ≥ ' + Rmin2 + ' m' + (s.rek ? ' (rekonstruksiya)' : ' (yangi qurilish)'), 'ShNQ 2.07.06-24, 108-band', fm(R) + ' m');
    if (hasCore && Math.abs(s.ang - 90) > 0.1) chk(Math.abs(s.ang - 90) <= 30 ? 'warn' : 'bad', 'Kesishish burchagi', 'andoza: 90° ga yaqin boʻlgani maʼqul; burilish izi qiyshiqda taxminiy', s.ang + '°');
    if (DIR !== 1) TRS.forEach(function (t) { chk(t.st, t.n + ' oʻngga buriladi', 'Burilish izi · dizayn avtomobili (andoza)', t.crossA || t.crossB ? 'qarshi boʻlakka chiqadi' : t.lanesA + ' + ' + t.lanesB + ' boʻlak'); });
    TLS.forEach(function (t) { chk(t.fit ? 'ok' : 'warn', t.n + ' chapga buriladi', t.fit ? 'chorraha ichida sigʻadi (andoza)' : 'min. radius ' + fm(t.Rr) + ' m > ' + fm(t.Rd) + ' m — toʻxtash chizigʻidan oldin burila boshlaydi', 'R ' + fm(t.Rr) + ' m'); });
    if (TLS.length) { var op = TLS[0].opp; chk(op >= 2 && s.ctl === 0 ? 'warn' : (op >= 2 ? 'bad' : 'ok'), 'Chapga burilish qarshi oqimni kesadi', op >= 2 ? (s.ctl === 0 ? 'alohida chapga burilish fazasi tavsiya (andoza)' : 'belgilar bilan xavfli — svetofor kerak (andoza)') : 'bitta boʻlak — ruxsat etilgan faza yetarli', op + ' boʻlak'); }
    if (CF.length) { var nP = CF.filter(function (c) { return c[1] === 'piy'; }).length, nV = CF.filter(function (c) { return c[1] === 'velo'; }).length; if (nP + nV) chk(s.ctl === 0 ? 'warn' : 'bad', 'Burilish × piyoda/velo toʻqnashuvi', s.ctl === 0 ? 'LPI — piyodaga 3–7 s oldin yashil (andoza)' : 'svetofor yoʻq — burchak radiusini kichraytirish', nP + ' + ' + nV); }
    var LA = MA.cw - (s.bulb ? MA.z.filter(function (q) { return q.t === 'park'; }).reduce(function (a2, q) { return a2 + q.w; }, 0) : 0), LB = MB.cw - (s.bulb ? MB.z.filter(function (q) { return q.t === 'park'; }).reduce(function (a2, q) { return a2 + q.w; }, 0) : 0);
    var islA = MA.med.some(function (q) { return q.w >= 1.5; }) && s.island, islB = MB.med.some(function (q) { return q.w >= 1.5; }) && s.island;
    if (hasCore) { chk(LA <= 14 || islA ? 'ok' : 'warn', 'Asosiy koʻchani kesib oʻtish', islA ? 'orolcha bor · ShNQ 2.07.06-24, 27-band' : '> 14 m — orolcha tavsiya (27-band)', fm(LA) + ' m'); chk(LB / Math.max(0.5, cs) <= 14 || islB ? 'ok' : 'warn', 'Kesishuvchi koʻchani kesib oʻtish', islB ? 'orolcha bor' : '> 14 m — orolcha tavsiya (27-band)', fm(LB) + ' m'); }
    if (MA.park || MB.park) chk('ok', 'Toʻxtash: chorrahadan ≥ ' + dkA[0] + ' m, oʻtishdan ≥ ' + dkA[1] + ' m', 'Dizayn-kod ' + dkA[2] + ' · ' + MA.uk, '−' + removed + ' joy');
    if (hasCore && s.sight) { chk(triBad ? 'warn' : 'ok', 'Koʻrinish uchburchagi ' + dA + ' × ' + dB + ' m', 'ShNQ 2.07.06-24, 118-band, 13-ilova 1-jadval', triBad ? triBad + ' burchakda bino' : 'ochiq'); if (triTree) chk('warn', 'Burchakka 20 m yaqin daraxtlar', 'koʻrinish uchburchagida · toj osti ochiq boʻlsin (andoza)', triTree + ' ta'); }
    var magA = ['tz1', 'tz2', 'sh1', 'sh2', 'sh3'].indexOf(MA.sk) >= 0;
    if (hasCore) chk(!magA || s.ctl === 0 ? 'ok' : 'bad', 'Magistralda svetofor bilan oʻtish', 'ShNQ 2.07.01-23, 19-jadval', s.ctl === 0 ? 'svetofor' : (s.ctl === 1 ? 'yoʻq' : 'aylanma'));
    if (hasCore && s.ctl === 2) chk(magA ? 'warn' : 'ok', 'Kichik aylanma', 'ShNQ 2.07.06-24, 27-band — ruxsat etiladi', magA ? 'magistralda?' : 'mos');
    if ((vwA || vwB) && hasCore) chk(Ly.vb !== false ? 'ok' : 'warn', 'Velo yoʻl chorrahadan uzluksiz oʻtadi', 'Dizayn-kod 7.4.1 · chorrahada velo oʻtish joyi', Ly.vb !== false ? 'chizilgan' : 'yashirilgan');
    if ((MA.bus.length || MB.bus.length) && hasCore) chk('ok', 'Avtobus boʻlagi chorrahada davom etadi', 'ShNQ 2.07.01-23, 20-jadval 4-izoh', 'punktir bilan');
    var nOk = R0.filter(function (r) { return r.st === 'ok'; }).length;
    function pickT(key) { return s.TPL.map(function (t, i) { return { n: t[0].split(' ')[0] === 'Magistral' ? 'Magistral' : t[0].replace(' koʻchasi', '').replace('Avtobus koridori', 'Avtobus'), p: s[key] === i ? 'true' : 'false', pick: function () { var o = {}; o[key] = i; o[key === 'a' ? 'vA' : 'vB'] = { tz1: 80, tz2: 60, sh1: 60, sh2: 60, sh3: 50, tm: 50, mh: 40, pd: 30 }[t[3]]; self.setState(o); } }; }); }
    function seg(key, vals, lab) { return vals.map(function (v, i) { return { n: lab ? lab[i] : String(v), p: s[key] === v ? 'true' : 'false', pick: function () { var o = {}; o[key] = v; self.setState(o); } }; }); }
    function togL(k) { return function () { var l = Object.assign({}, self.state.lay || {}); l[k] = l[k] === false ? true : false; self.setState({ lay: l }); }; }
    var SGN = { piy: ['Piyodalar oʻtish joyi', '#2a62b8', '#ffffff', '2px'], asosiy: ['Asosiy yoʻl', '#f2c230', '#ffffff', '2px'], yolber: ['Yoʻl bering', '#ffffff', '#c0392b', '2px'], aylanma: ['Aylanma harakat', '#2a62b8', '#ffffff', '50%'], avtobus: ['Avtobus boʻlagi', '#2a62b8', '#ffffff', '2px'], velo: ['Velosiped yoʻlkasi', '#2a62b8', '#ffffff', '50%'], toxtash: ['Toʻxtash taqiqlangan', '#2a62b8', '#c0392b', '50%'], svetofor: ['Svetofor', '#2f2e2b', '#2f2e2b', '2px'] };
    var ped = hasCore ? Math.max(LA, LB) / 1.2 : 0;
    return {
      modes: [['A', 'Tarmoq'], ['B', 'Kesim'], ['C', 'Chorraha'], ['D', 'Koʻcha muhiti'], ['E', 'Mikromodel']].map(function (m, i) { return { k: m[0], n: m[1], p: i === 2 ? 'true' : 'false' }; }),
      title: MA.n + ' × ' + MB.n, sub: SKN[MA.sk] + ' / ' + SKN[MB.sk] + ' · ' + MA.uk + ' / ' + MB.uk,
      tA: pickT('a'), tB: pickT('b'), vA: seg('vA', [30, 40, 50, 60, 80]), vB: seg('vB', [30, 40, 50, 60, 80]),
      ang: s.ang + '°', aD: function () { self.setState({ ang: Math.max(60, self.state.ang - 5) }); }, aU: function () { self.setState({ ang: Math.min(120, self.state.ang + 5) }); },
      rek: seg('rek', [0, 1], ['Yangi qurilish', 'Rekonstruksiya']), R: fm(R) + ' m', rD: function () { self.setState({ R: Math.max(3, self.state.R - 1) }); }, rU: function () { self.setState({ R: Math.min(25, self.state.R + 1) }); },
      ctl: seg('ctl', [0, 1, 2], ['Svetofor', 'Belgilar', 'Aylanma']),
      opts: [['zebra', 'Piyoda oʻtish joylari', 'YHQ'], ['raised', 'Koʻtarilgan oʻtish joyi', 'tavsiya'], ['bulb', 'Bordyur kengaytmasi', 'turargoh boʻlsa'], ['island', 'Xavfsizlik orolchasi', '27-band'], ['sight', 'Koʻrinish uchburchagi', '118-band'], ['turn', 'Burilish izi', 'andoza']].map(function (o) { return { n: o[1], src: o[2], c: s[o[0]] ? 'on' : '', tog: function () { var p = {}; p[o[0]] = !self.state[o[0]]; self.setState(p); } }; }),
      lay: [['mk', 'Yoʻl chiziqlari, toʻxtash chizigʻi, strelkalar', 'YHQ'], ['px', 'Piyoda oʻtish joylari', 'YHQ'], ['vb', 'Velo va avtobus yoʻlagi davomi', 'DK 7.4.1'], ['sg', 'Yoʻl belgilari va svetofor', 'YHQ'], ['np', 'Toʻxtash taqiqlangan joylar', 'DK 6.4'], ['tr', 'Burilish izi', 'andoza'], ['cf', 'Toʻqnashuv nuqtalari', 'andoza']].map(function (o) { return { n: o[1], src: o[2], c: Ly[o[0]] === false ? '' : 'on', tog: togL(o[0]) }; }),
      tdir: seg('tdir', [0, 1, 2], ['Oʻngga', 'Chapga', 'Ikkalasi']),
      cfl: CF.map(function (c) { return { n: c[2], c: { avto: '#b23a2e', piy: '#c98a12', velo: '#c0583f' }[c[1]] }; }),
      veh: [['yengil', 'Yengil'], ['avtobus', 'Avtobus'], ['ot', 'Oʻt oʻch.'], ['yuk', 'Yuk'], ['all', 'Hammasi']].map(function (v) { return { n: v[1], p: s.veh === v[0] ? 'true' : 'false', pick: function () { self.setState({ veh: v[0], turn: true }); } }; }),
      vehNote: !TR0 ? 'Burilish izi oʻchirilgan.' : (ALL ? 'Toʻrt avtomobil bir burchakda, bir xil R = ' + fm(R) + ' m bilan. Rang — avtomobil, chiziq turi — avtomobil. Eng katta tashqi iz: ' + TRS.reduce(function (m, t) { return t.Ro > m.Ro ? t : m; }).n + '.' : tv[0] + ': baza ' + fm(tv[1]) + ' m, eni ' + fm(tv[3]) + ' m, min. radius ' + fm(tv[4]) + ' m. Ichki iz ' + fm(TR0.Ri) + ' m, tashqi ' + fm(TR0.Ro) + ' m. ' + (TR0.swing ? 'Oʻz minimal radiusida buriladi — chetki boʻlakdan chiqib ketadi.' : 'Radius yetarli — bordyur yonidan buriladi.')) + (Math.abs(s.ang - 90) > 0.1 ? ' Qiyshiq chorrahada iz taxminiy.' : ''),
      cmp: TRS.map(function (t) { var v = VH[t.key]; return { n: t.n, c: ALL ? VC[t.key] : DC[t.st], ri: fm(t.Ri), ro: fm(t.Ro), ln: t.crossA || t.crossB ? 'qarshi' : t.lanesA + '+' + t.lanesB, sc: DC[t.st], rk: (function (r) { return r ? r + ' m' : '> 25'; })(rOk(t.key)) }; }),
      gfx: [['Rangli', 0], ['Chizma', 1]].map(function (v) { return { n: v[0], p: s.gfx === v[1] ? 'true' : 'false', pick: function () { self.setState({ gfx: v[1] }); } }; }),
      alt: 'Chorraha rejasi: ' + MA.n + ' va ' + MB.n, draw: draw, txt: txt,
      mets: [['Asosiy: qatnov qismi', fm(MA.cw) + ' m · ' + MA.lanes + ' boʻlak'], ['Kesishuvchi: qatnov qismi', fm(MB.cw) + ' m · ' + MB.lanes + ' boʻlak'], ['Kesishish burchagi', s.ang + '°'], ['Eng uzun oʻtish', hasCore ? fm(Math.max(LA, LB)) + ' m · ' + Math.round(ped) + ' s' : '—'], ['Toʻxtash masofasi', dA + ' / ' + dB + ' m'], ['Olib tashlangan joylar', removed + ' ta']].map(function (l) { return { n: l[0], v: l[1] }; }),
      checks: R0, okCount: nOk + ' / ' + R0.length,
      note: 'Piyoda oʻtish joyi burchak egri qismidan keyin, velo oʻtish joyi esa uning yadro tomonida joylashadi. Avtobus boʻlagi chorrahada koʻk punktir bilan davom etadi. Yangi qurilishda R ≥ 15 m (108-band), kichik radius esa piyoda uchun xavfsizroq — ziddiyat ochiq qoldirilgan.',
      signs: SG.map(function (k) { var g = SGN[k]; return { n: g[0], c: g[1], b: g[2], r: g[3] }; })
    };
    })();
    return __split(__r);
  }
}
