// @ts-nocheck
/* Koʻchasoz · KS-B2 — kanvas maketidagi (Archemistry Lab, «Koʻchasoz» sahifasi, KS-B2.dc.html) mantiq aynan koʻchirilgan.
   Hisob-kitob va chizma shu yerda; qobiq, saqlash, til va tungi rejim — ../dc.ts va ../main.ts.
   2026-10-18 dan bu fayl qoʻlda tahrirlanadi (gen.py bilan qayta yaratilmaydi): kenglik moslashuvi (vw), rejada daraxtlar ustki qatlamda,
   zona va tarmoqlarni sudrash (meʼyor javobi bilan), bino kesimi va qavat tugmalari, rejada yoʻnalish strelkalari va velo belgisi,
   piktogrammalar (../kit.ts), tarmoq belgilari tilga qarab, tayyor kesimlar guruhlari (Master reja profillari). */
import { DCLogic } from '../dc';
import { PK, ulbl, drag, svgUnitsPerPx } from '../kit';
import { PROFILES } from '../../core/profiles';
import { PRESET_PROFILES } from '../../core/presets';
import { profileToKs } from '../fromMr';
import { tr, getLang } from '../../i18n';
import UA_ from './ua.json';
export default class Component extends DCLogic {
  constructor(p) { super(p); this.state = {"PL": [{"t": "parklet", "z": 4, "y": 15, "l": 6}, {"t": "yuklash", "z": 8, "y": 9, "l": 8}, {"t": "taksi", "z": 8, "y": 24, "l": 6}, {"t": "velopark", "z": 2, "y": 8, "l": 5}, {"t": "shpalera", "z": 6, "y": 10, "l": 12}, {"t": "terrasa", "z": 12, "y": 5, "l": 6}], "els": [["front", 3, {"kafe": true}], ["piy", 3, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.6, {"fonar": true}], ["park", 2.5, {"mashina": true, "dchontak": true}], ["qat", 3.5, {"zebra": true}], ["med", 4, {"daraxt": true, "fonar": true}], ["qat", 3.5, {"zebra": true}], ["park", 2.5, {"mashina": true, "dchontak": true}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["piy", 3, {}], ["front", 3, {"kafe": true}]], "rl": 35.2, "tplName": "Tuman koʻchasi", "TPL": [["Magistral · tramvayli", null, [["front", 2, {"kafe": true}], ["piy", 5, {}], ["velo", 1.8, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.6, {"fonar": true}], ["qat", 3.25, {}], ["qat", 3.25, {"zebra": true}], ["med", 2.5, {"fonar": true}], ["tram", 3.1, {"tayanch": true}], ["tram", 3.1, {"tayanch": true}], ["med", 2.5, {"fonar": true}], ["qat", 3.25, {"zebra": true}], ["qat", 3.25, {}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["velo", 1.8, {}], ["piy", 5, {}], ["front", 2, {"kafe": true}]], "sh2", "U2", [{"t": "terrasa", "z": 0, "y": 4, "l": 7}, {"t": "velopark", "z": 3, "y": 22, "l": 5}, {"t": "samokat", "z": 3, "y": 29, "l": 3}, {"t": "shpalera", "z": 7, "y": 12, "l": 10}, {"t": "buta", "z": 10, "y": 20, "l": 4}, {"t": "gul", "z": 17, "y": 6, "l": 1}, {"t": "orindiq", "z": 14, "y": 16, "l": 2}]], ["Tuman koʻchasi", null, [["front", 3, {"kafe": true}], ["piy", 3, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.6, {"fonar": true}], ["park", 2.5, {"mashina": true, "dchontak": true}], ["qat", 3.5, {"zebra": true}], ["med", 4, {"daraxt": true, "fonar": true}], ["qat", 3.5, {"zebra": true}], ["park", 2.5, {"mashina": true, "dchontak": true}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["piy", 3, {}], ["front", 3, {"kafe": true}]], "tm", "U3", [{"t": "parklet", "z": 4, "y": 15, "l": 6}, {"t": "yuklash", "z": 8, "y": 9, "l": 8}, {"t": "taksi", "z": 8, "y": 24, "l": 6}, {"t": "velopark", "z": 2, "y": 8, "l": 5}, {"t": "shpalera", "z": 6, "y": 10, "l": 12}, {"t": "terrasa", "z": 12, "y": 5, "l": 6}]], ["Avtobus koridori", null, [["front", 1, {}], ["piy", 5, {}], ["velo", 1.8, {}], ["yash", 3, {"daraxt": true, "velot": true}], ["mebel", 0.6, {"fonar": true}], ["bus", 3.75, {"bekat": true}], ["qat", 3.25, {"zebra": true}], ["med", 4, {"fonar": true, "orolcha": true}], ["qat", 3.25, {"zebra": true}], ["bus", 3.75, {"bekat": true}], ["mebel", 0.6, {"fonar": true}], ["yash", 3, {"daraxt": true, "velot": true}], ["velo", 1.8, {}], ["piy", 5, {}], ["front", 1, {}]], "sh2", "U2", [{"t": "bekat", "z": 3, "y": 12, "l": 10}, {"t": "velopark", "z": 11, "y": 8, "l": 5}, {"t": "samokat", "z": 11, "y": 16, "l": 3}]], ["Mahalla koʻchasi", null, [["front", 1.1, {"gul": true}], ["piy", 2.25, {}], ["yash", 3, {"daraxt": true, "buta": true}], ["mebel", 0.5, {"fonar": true}], ["qat", 3, {}], ["qat", 3, {}], ["mebel", 0.5, {"fonar": true}], ["yash", 3, {"daraxt": true, "buta": true}], ["piy", 2.25, {}], ["front", 1.1, {"gul": true}]], "mh", "M1", [{"t": "buta", "z": 2, "y": 6, "l": 4}, {"t": "orindiq", "z": 7, "y": 12, "l": 2}, {"t": "gul", "z": 9, "y": 5, "l": 1}]], ["Piyoda koʻchasi", null, [["front", 2, {"kafe": true}], ["piy", 5, {}], ["yash", 3, {"daraxt": true, "orin": true}], ["mebel", 0.5, {"fonar": true}], ["mebel", 0.5, {"fonar": true}], ["yash", 3, {"daraxt": true, "orin": true}], ["piy", 5, {}], ["front", 2, {"kafe": true}]], "pd", "U5", [{"t": "terrasa", "z": 0, "y": 3, "l": 10}, {"t": "terrasa", "z": 7, "y": 12, "l": 8}, {"t": "velopark", "z": 2, "y": 14, "l": 5}, {"t": "orindiq", "z": 5, "y": 8, "l": 2}]]], "sk": "tm", "uk": "U3", "sel": 4, "selU": -1, "view": 1, "gfx": 0, "showU": true, "bL": 7, "bR": 9, "U": []}; }
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
    function axoDraw(base, gfx, UCd, BX, BY, BW, BH) {
    // ===== aksonometriya =====
    var D = [], TT = [];
    function A(d, f, st, w, o, da, t) { D.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '', t: t || '' }); }
    function AT(x, y, t, fs, c, fw, an) { TT.push({ x: x.toFixed(1), y: y.toFixed(1), t: t, fs: fs || 10, c: c || '#141414', fw: fw || 400, ff: 'Archivo, sans-serif', a: an || 'start' }); }
    var line = gfx === 1, INK = '#2f2e2b', L = { line: line, ink: INK, add: A };
    var T = { front: ['#f1e9da', .15], piy: ['#ece8df', .15], mebel: ['#e4ddcf', .15], yash: ['#d3e4c6', .15], velo: ['#d98a78', .08], park: ['#dedfe2', 0], qat: ['#d2d3d7', 0], bus: ['#93a9d8', 0], tram: ['#e8dece', .02], med: ['#d9e7cd', .15], ariq: ['#cfe2ee', 0], kanal: ['#bcd6e6', 0] };
    var els = base.els, rl = base.rl, SB = 1.5, BD = 7, LG = 28;
    /* dimetriya (26.10): koʻndalang oʻq 10° pastga, koʻcha boʻylab 38° yuqoriga (0,8 masshtab) — kabinet proyeksiyadan qiyaroq, raqobatchilar kabi */
    var CA = Math.cos(10 * Math.PI / 180), SA = Math.sin(10 * Math.PI / 180), CB = Math.cos(38 * Math.PI / 180) * 0.8, SBy = Math.sin(38 * Math.PI / 180) * 0.8;
    var xL0 = -SB - BD, xR0 = rl + SB + BD, wM = (xR0 - xL0) * CA + LG * CB, hM = LG * SBy + (xR0 - xL0) * SA + 4.2 + Math.max(11, Math.min(Math.max((base.eL || 'bino') === 'bino' ? base.bL || 0 : 0, (base.eR || 'bino') === 'bino' ? base.bR || 0 : 0), 9) * 3.2 + 2);
    var W = rl + 2 * SB + 2 * BD, k = Math.min(BW / wM, (BH - 30) / hM), ox = BX + (BW - wM * k) / 2 - xL0 * CA * k, oy = BY + BH - 6 - (4.2 + xR0 * SA) * k;
    var DZ = (-CB / CA) * SA - SBy;   // koʻrish yoʻnalishi (y = 1 da z), yuzlar koʻrinishi uchun
    function P(x, y, z) { return [ox + (x * CA + y * CB) * k, oy - (z + y * SBy - x * SA) * k]; }
    function poly(pts) { return 'M' + pts.map(function (p) { var q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z'; }
    function box(x0, y0, z0, w, l, h, cTop, cFront, cSide, sw) { var so = sw || line ? '#5d5a55' : null, ww = sw || line ? 0.5 : 0; A(poly([[x0, y0, z0], [x0 + w, y0, z0], [x0 + w, y0, z0 + h], [x0, y0, z0 + h]]), cFront, so, ww); A(poly([[x0 + w, y0, z0], [x0 + w, y0 + l, z0], [x0 + w, y0 + l, z0 + h], [x0 + w, y0, z0 + h]]), cSide, so, ww); A(poly([[x0, y0, z0 + h], [x0 + w, y0, z0 + h], [x0 + w, y0 + l, z0 + h], [x0, y0 + l, z0 + h]]), cTop, so, ww); }
    /* ===== transport (oʻzimizning modellar oʻlchamida, kesim/reja uslubida: tekis rang, ingichka kontur) ===== */
    var VST = '#5d5a55', GL = line ? '#ffffff' : '#c3cdd5', WH = line ? '#ffffff' : '#55524d', CARC = ['#f4f3f0', '#ecebe7', '#e3e6e9', '#f4f3f0', '#ebe5da'], cI = 0;
    var VBK = '';   // joriy transport: tur@boshi-oxiri (m) — tekshiruv va CAD bloki uchun
    function tA(d, f, st, w, o) { A(d, f, st, w, o); D[D.length - 1].ly = 'KS_TRANSPORT'; D[D.length - 1].bk = VBK; }
    /* qavariq prizma: yon profil [[yy, z]] (yy — boʻylama 0..L), kenglik bo'ylab cx ± w/2; teskari (back) — profil koʻzguda.
       Koʻrinadigan yuzlar: oʻng yon (+x), old/tepa qirralar. ton: [tepa, old, yon] */
    function prism(cx, w, y0, L, back, prof, ton) {
      var pts = prof.map(function (p) { return [back ? y0 + L - p[0] : y0 + p[0], p[1]]; }), n = pts.length, cy = 0, cz = 0;
      pts.forEach(function (p) { cy += p[0] / n; cz += p[1] / n; });
      var x0 = cx - w / 2, x1 = cx + w / 2;
      for (var a = 0; a < n; a++) { var p = pts[a], q = pts[(a + 1) % n], ey = q[0] - p[0], ez = q[1] - p[1], ny = ez, nz = -ey, my = (p[0] + q[0]) / 2 - cy, mz = (p[1] + q[1]) / 2 - cz; if (ny * my + nz * mz < 0) { ny = -ny; nz = -nz; } var ln = Math.hypot(ny, nz) || 1; ny /= ln; nz /= ln; if (ny + nz * DZ >= -0.02) continue;
        tA(poly([[x0, p[0], p[1]], [x1, p[0], p[1]], [x1, q[0], q[1]], [x0, q[0], q[1]]]), line ? '#ffffff' : (nz > 0.6 ? ton[0] : ton[1]), VST, 0.45); }
      tA(poly(pts.map(function (p) { return [x1, p[0], p[1]]; })), line ? '#ffffff' : ton[2], VST, 0.45);
      return { x1: x1, Y: function (yy) { return back ? y0 + L - yy : y0 + yy; } };
    }
    function sidePane(x, Y, a, b, z0, z1, f) { tA(poly([[x + 0.01, Y(a), z0], [x + 0.01, Y(b), z0], [x + 0.01, Y(b), z1], [x + 0.01, Y(a), z1]]), f || GL, VST, 0.35); }
    function wheel(x, yy, r) { var c = []; for (var t = 0; t < 12; t++) { var an = t / 12 * Math.PI * 2; c.push([x + 0.02, yy + Math.cos(an) * r, r + Math.sin(an) * r]); } tA(poly(c), WH, VST, 0.4); }
    function shadowRect(x0, y0, w, l) { if (!line) A(poly([[x0 + 0.2, y0 + 0.3, 0], [x0 + w + 0.4, y0 + 0.3, 0], [x0 + w + 0.4, y0 + l + 0.3, 0], [x0 + 0.2, y0 + l + 0.3, 0]]), '#000000', null, 0, 0.08); }
    function frontPane(cx, w, yy, z0, z1) { tA(poly([[cx - w / 2, yy - 0.01, z0], [cx + w / 2, yy - 0.01, z0], [cx + w / 2, yy - 0.01, z1], [cx - w / 2, yy - 0.01, z1]]), GL, VST, 0.35); }
    /* yengil avtomobil 4,7 × 1,8 × 1,47 m (baza 2,75, old osilish 0,95) */
    function vSedan(cx, y, back, col) {
      var L = 4.7; VBK = 'sedan@' + y.toFixed(1) + '-' + (y + L).toFixed(1); var c = col || '#f4f3f0', T = [c, shade(c, 0.94), shade(c, 0.9)]; shadowRect(cx - 0.9, y, 1.8, L);
      var b = prism(cx, 1.8, y, L, back, [[0, 0.3], [L, 0.3], [L, 0.68], [L - 0.25, 0.8], [0.15, 0.84], [0, 0.72]], T);
      [0.95 + 0.0, 0.95 + 2.75].forEach(function (a) { wheel(b.x1, b.Y(L - a), 0.32); });
      var cb = prism(cx, 1.56, y, L, back, [[1.0, 0.8], [3.4, 0.8], [2.95, 1.45], [1.45, 1.47]], [c, GL, GL]);
      sidePane(cb.x1, cb.Y, 2.15, 2.22, 0.82, 1.44, c);
    }
    /* avtobus 12 × 2,55 × 3,15 m (baza 7,6, old osilish 2,4) */
    function vBus(cx, y, back) {
      var L = 12; VBK = 'bus@' + y.toFixed(1) + '-' + (y + L).toFixed(1); var c = line ? '#ffffff' : '#f3ecdd', T = [c, shade(c, 0.95), shade(c, 0.9)]; shadowRect(cx - 1.27, y, 2.55, L);
      var b = prism(cx, 2.55, y, L, back, [[0, 0.32], [L, 0.32], [L, 2.95], [L - 0.15, 3.15], [0.1, 3.15], [0, 3.0]], T);
      for (var a = 0.6; a < L - 1.2; a += 1.55) { if (Math.abs(a - 8.6) < 0.8 || Math.abs(a - 3.6) < 0.8) continue; sidePane(b.x1, b.Y, a, a + 1.35, 1.25, 2.75); }
      [[9.1, 10.3], [3.1, 4.3]].forEach(function (d) { sidePane(b.x1, b.Y, d[0], d[1], 0.35, 2.75); });
      if (!line) sidePane(b.x1, b.Y, 0.3, L - 0.3, 0.95, 1.08, '#4c5bd4');
      [L - 2.4, L - 10].forEach(function (a) { wheel(b.x1, b.Y(a), 0.5); });
      if (back) frontPane(cx, 2.2, y - 0.01, 1.1, 2.85); else frontPane(cx, 1.9, y - 0.01, 1.9, 2.8);
      prism(cx - 0.1, 1.9, y, L, back, [[6.2, 3.15], [9.0, 3.15], [8.9, 3.42], [6.3, 3.42]], [shade(c, 0.97), shade(c, 0.92), shade(c, 0.88)]);
    }
    /* tramvay 27 × 2,5 × 3,5 m, 3 seksiya */
    function vTram(cx, y, back) {
      var c = line ? '#ffffff' : '#f4f1ea', T = [c, shade(c, 0.95), shade(c, 0.9)], seg = 8.6, gap = 0.6; shadowRect(cx - 1.25, y, 2.5, 27);
      for (var s2 = 0; s2 < 3; s2++) {
        var a0 = s2 * (seg + gap), f = s2 === 0, l = s2 === 2, pr = [[f ? 0.9 : 0, 0.3], [l ? seg - 0.9 : seg, 0.3]];
        if (l) pr.push([seg, 1.2], [seg - 0.45, 3.3], [seg - 0.9, 3.5]); else pr.push([seg, 3.5]);
        if (f) pr.push([0.9, 3.5], [0.45, 3.3], [0, 1.2]); else pr.push([0, 3.5]);
        var b = prism(cx, 2.5, y + (back ? 27 - a0 - seg : a0), seg, back, pr, T);
        sidePane(b.x1, b.Y, f ? 1.2 : 0.4, l ? seg - 1.2 : seg - 0.4, 1.35, 2.75);
        sidePane(b.x1, b.Y, seg / 2 - 0.65, seg / 2 + 0.65, 0.35, 2.75, line ? '#ffffff' : '#d9d5cc');
        if (!line) sidePane(b.x1, b.Y, f ? 1 : 0.2, l ? seg - 1 : seg - 0.2, 0.85, 1.02, '#c96b5c');
        [1.8, seg - 1.8].forEach(function (aa) { wheel(b.x1, b.Y(aa), 0.36); });
        if (s2 < 2) prism(cx, 2.3, y + (back ? 27 - a0 - seg - gap : a0 + seg), gap, back, [[0, 0.5], [gap, 0.5], [gap, 3.3], [0, 3.3]], ['#8f8a80', '#77736b', '#6a6761']);
      }
      var m = y + 13.5, a = P(cx, m - 0.6, 3.5), bq = P(cx, m + 0.2, 4.4), cq = P(cx, m - 0.2, 5.3); tA('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + bq[0].toFixed(1) + ' ' + bq[1].toFixed(1) + 'L' + cq[0].toFixed(1) + ' ' + cq[1].toFixed(1), null, INK, 0.8);
    }
    function shade(hex, f) { var n = parseInt(hex.slice(1), 16), g = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); }; return '#' + ((g(n >> 16) << 16) | (g((n >> 8) & 255) << 8) | g(n & 255)).toString(16).padStart(6, '0'); }
    function car(cx, y) { vSedan(cx, y, cx < base.rl / 2, CARC[(cI++) % CARC.length]); return; if (!line) A(poly([[cx - 0.7, y + 0.3, 0], [cx + 1.2, y + 0.3, 0], [cx + 1.2, y + 4.8, 0], [cx - 0.7, y + 4.8, 0]]), '#000000', null, 0, 0.08); box(cx - 0.9, y, 0.25, 1.8, 4.5, 0.6, line ? '#fff' : '#f4f3f0', line ? '#fff' : '#e4e2dd', line ? '#fff' : '#ecebe7', 1); box(cx - 0.75, y + 1.1, 0.85, 1.5, 2.3, 0.55, line ? '#fff' : '#f4f3f0', line ? '#fff' : '#c3cdd5', line ? '#fff' : '#cdd6dc', 1); }
    var zx = [], acc = 0; els.forEach(function (e) { zx.push([acc, acc + e[1]]); acc += e[1]; });
    // yer kesimi (old va oʻng yuzlar)
    var DEP = 4.2, xL = -SB - BD, xR = rl + SB + BD;
    A(poly([[xL, 0, 0], [xR, 0, 0], [xR, 0, -DEP], [xL, 0, -DEP]]), line ? '#ffffff' : '#efe6d6', INK, 0.8);
    A(poly([[xR, 0, 0], [xR, LG, 0], [xR, LG, -DEP], [xR, 0, -DEP]]), line ? '#ffffff' : '#e3d8c4', INK, 0.8);
    for (var hx = xL; hx < xR; hx += 1.2) { var a1 = P(hx, 0, -DEP), a2 = P(Math.min(xR, hx + 0.8), 0, -DEP + 0.8); A('M' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + 'L' + a2[0].toFixed(1) + ' ' + a2[1].toFixed(1), null, '#c9bfae', 0.5); }
    (base.U || []).forEach(function (u) { var c = UCd(u.k), q = P(u.x, 0, -u.d), r = Math.max(2, c[8] * k / 2); A(El(q[0], q[1], r, r), '#ffffff', c[2], 1.2); var q2 = P(u.x, LG, -u.d); A('M' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + 'L' + q2[0].toFixed(1) + ' ' + q2[1].toFixed(1), null, c[2], 0.5, 0.35, '2 3'); AT(q[0] + r + 2, q[1] + 3, u.k, 7, c[2], 700); });
    // zonalar
    A(poly([[-SB, 0, 0.15], [0, 0, 0.15], [0, LG, 0.15], [-SB, LG, 0.15]]), line ? '#fff' : '#ebe7df', line ? INK : null, 0.5); A(poly([[rl, 0, 0.15], [rl + SB, 0, 0.15], [rl + SB, LG, 0.15], [rl, LG, 0.15]]), line ? '#fff' : '#ebe7df', line ? INK : null, 0.5);
    els.forEach(function (e, i) { var c = T[e[0]], x0 = zx[i][0], x1 = zx[i][1], h = c[1];
      if (e[0] === 'kanal') { /* kanal: qirgʻoq turi (NBS), suv sathi, old kesimda suv, panjara, koʻprik, qirgʻoq polosasi */ var fk = e[2] || {}, KB = kBank(fk, x1 - x0), zw = -KB.wl, WC = line ? '#ffffff' : '#bcd6e6', SC = line ? '#ffffff' : KCOL[KB.t], KN = kNorm(fk);
        var LP = KB.prof.map(function (q) { return [x0 + q[0], -q[1]]; }), RP = KB.prof.map(function (q) { return [x1 - q[0], -q[1]]; }).reverse(), FP = LP.concat(RP);
        A(poly(FP.map(function (q) { return [q[0], 0, q[1]]; })), '#ffffff', null, 0);
        var FW = clipBelow(FP.map(function (q) { return [q[0], -q[1]]; }), KB.wl).map(function (q) { return [q[0], 0, -q[1]]; }); if (FW.length > 2) A(poly(FW), line ? '#ffffff' : '#a9c8dc', INK, 0.5);
        if (KB.t === 'devor') { A(poly([[x0, 0, 0.1], [x0 + 0.35, 0, 0.1], [x0 + 0.35, 0, -KB.dep - 0.3], [x0, 0, -KB.dep - 0.3]]), SC, INK, 0.5); A(poly([[x1 - 0.35, 0, 0.1], [x1, 0, 0.1], [x1, 0, -KB.dep - 0.3], [x1 - 0.35, 0, -KB.dep - 0.3]]), SC, INK, 0.5);
          A(poly([[x0 + 0.35, 0, zw], [x0 + 0.35, LG, zw], [x0 + 0.35, LG, 0.1], [x0 + 0.35, 0, 0.1]]), line ? '#ffffff' : '#cfc9bd', INK, 0.5);
          [[x0, x0 + 0.35], [x1 - 0.35, x1]].forEach(function (r) { A(poly([[r[0], 0, 0.1], [r[1], 0, 0.1], [r[1], LG, 0.1], [r[0], LG, 0.1]]), SC, INK, 0.5); }); }
        else { [LP, RP.slice().reverse()].forEach(function (pp2, si) { for (var j = 1; j < pp2.length; j++) { var a = pp2[j - 1], b = pp2[j]; if (-a[1] > KB.wl + 0.01 && -b[1] > KB.wl + 0.01) continue; var flat = Math.abs(a[1] - b[1]) < 0.01, c = KB.t === 'zina' ? (flat ? SC : (line ? '#ffffff' : '#d3cbbd')) : SC; A(poly([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], LG, b[1]], [a[0], LG, a[1]]]), c, INK, KB.t === 'zina' ? 0.45 : 0.5); } });
          [-1, 1].forEach(function (sd) { var xe = sd < 0 ? x0 : x1, U = function (u) { return xe - sd * u; };
            if (KB.t === 'yashil') for (var yy = 2; yy < LG; yy += 3.3) { var q = P(U(KB.bh * 0.25), yy, -KB.dep * 0.25 + 0.3); A(El(q[0], q[1], 0.6 * k, 0.42 * k), line ? '#ffffff' : '#a9c897', line ? INK : '#7d9c69', 0.5); }
            if (KB.t === 'tosh') for (var yy2 = 0.8; yy2 < LG; yy2 += 1.1) [0.15, 0.35].forEach(function (fr) { var q = P(U(KB.bh * fr), yy2 + fr * 2, -KB.dep * fr + 0.08); A(El(q[0], q[1], 0.22 * k, 0.15 * k), line ? '#ffffff' : '#b5afa5', INK, 0.35); });
            if (KB.t === 'botqoq') for (var yy3 = 0.6; yy3 < LG; yy3 += 0.8) { var b0 = P(U(KB.bh * 0.6), yy3, -KB.wl - 0.15), b1 = P(U(KB.bh * 0.6) - 0.1, yy3, -KB.wl + 0.85); A('M' + b0[0].toFixed(1) + ' ' + b0[1].toFixed(1) + 'L' + b1[0].toFixed(1) + ' ' + b1[1].toFixed(1), null, line ? INK : '#6f8f55', 0.6); } }); }
        var ul = x0 + KB.ur, ur2 = x1 - KB.ur; A(poly([[ul, 0, zw], [ur2, 0, zw], [ur2, LG, zw], [ul, LG, zw]]), WC, INK, 0.5);
        for (var wy = 2.2; wy < LG - 1; wy += 3.4) for (var wx = ul + 0.6; wx < ur2 - 1; wx += 1.9) { var r1 = P(wx, wy + ((wx * 7) % 1.5), zw + 0.01), r2 = P(wx + 0.9, wy + ((wx * 7) % 1.5), zw + 0.01); A('M' + r1[0].toFixed(1) + ' ' + r1[1].toFixed(1) + 'L' + r2[0].toFixed(1) + ' ' + r2[1].toFixed(1), null, '#4f86a8', 0.6, 0.8); }
        if (fk.panjara !== false && KB.t !== 'zina') [x0 + 0.17, x1 - 0.17].forEach(function (rx) { for (var py = 0.4; py < LG; py += 2.5) { var p1 = P(rx, py, 0.1), p2 = P(rx, py, 1.1); A('M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1), null, INK, 0.6); } var ra = P(rx, 0, 1.1), rb = P(rx, LG, 1.1); A('M' + ra[0].toFixed(1) + ' ' + ra[1].toFixed(1) + 'L' + rb[0].toFixed(1) + ' ' + rb[1].toFixed(1), null, INK, 0.8); });
        if (fk.koprik) { var ky = 15; box(x0 - 0.3, ky, 0.1, x1 - x0 + 0.6, 4, 0.3, line ? '#fff' : '#ece6da', line ? '#fff' : '#d9d2c4', line ? '#fff' : '#e2dccf', 1); [ky + 0.15, ky + 3.85].forEach(function (yy) { var b1 = P(x0 - 0.3, yy, 1.4), b2 = P(x1 + 0.3, yy, 1.4); A('M' + b1[0].toFixed(1) + ' ' + b1[1].toFixed(1) + 'L' + b2[0].toFixed(1) + ' ' + b2[1].toFixed(1), null, INK, 0.8); for (var bx2 = x0 - 0.3; bx2 <= x1 + 0.31; bx2 += 1.2) { var c1 = P(bx2, yy, 0.4), c2 = P(bx2, yy, 1.4); A('M' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + 'L' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1), null, INK, 0.5); } }); }
        if (fk.bufer !== false && KN.pp) [[ul, -1], [ur2, 1]].forEach(function (b3) { var ox2 = b3[0] + b3[1] * KN.pp[0]; A(poly([[b3[0], 0, 0.2], [ox2, 0, 0.2], [ox2, LG, 0.2], [b3[0], LG, 0.2]]), '#e0a43c', '#c98a12', 0.7, 0.28, '4 3'); });
        return; }
      A(poly([[x0, 0, h], [x1, 0, h], [x1, LG, h], [x0, LG, h]]), line ? '#ffffff' : c[0], INK, 0.4);
      if (h > 0.05) A(poly([[x0, 0, 0], [x1, 0, 0], [x1, 0, h], [x0, 0, h]]), line ? '#ffffff' : c[0], INK, 0.4);
      if (e[0] === 'tram') [0.27, 0.73].forEach(function (f) { var xx = x0 + (x1 - x0) * f, a = P(xx, 0, h), b = P(xx, LG, h); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, '#55524d', 1); });
      var nx = els[i + 1]; if (e[0] === 'qat' && nx && nx[0] === 'qat') for (var yy = 9; yy < LG; yy += 4) A(poly([[x1 - 0.06, yy, 0.01], [x1 + 0.06, yy, 0.01], [x1 + 0.06, yy + 2, 0.01], [x1 - 0.06, yy + 2, 0.01]]), line ? INK : '#ffffff', null, 0);
      if ((e[0] === 'qat' || e[0] === 'bus' || e[0] === 'park') && els.some(function (q) { return q[2] && q[2].zebra; })) for (var zz = x0 + 0.25; zz < x1 - 0.3; zz += 1.0) A(poly([[zz, 2.5, 0.01], [zz + 0.5, 2.5, 0.01], [zz + 0.5, 6.5, 0.01], [zz, 6.5, 0.01]]), line ? '#ffffff' : '#ffffff', line ? INK : null, line ? 0.4 : 0);
    });
    var hasZA = els.some(function (q) { return q[2] && q[2].zebra; }), zFree = hasZA ? 7.6 : 0.6;   // oʻtish joyidan keyingi birinchi boʻsh joy
    // obyektlar: uzoqdan yaqinga (kalit = x − 2y)
    var OB = [];
    function ob(x, y, fn) { OB.push({ key: x - (CA / CB) * y, fn: fn }); }
    var PPL = ['ayol_yurgan', 'erkak_yurgan', 'ona_bola', 'telefon', 'ayol_koylak', 'ryukzak', 'erkak_turgan', 'aravacha', 'qariya', 'yuguruvchi', 'erkak_palto', 'ayol_sumka'], pI = 0;
    var bmax = Math.max(1, Math.floor(((oy - Math.max(BY, 30) - 18) / k - LG * SBy + xL0 * SA) / 3.2));   // bino tepasi sarlavhadan pastda
    /* chetlar (26.10): bino boʻlmasa — bogʻ, ochiq maydon, qiyalik yoki suv (rejadagi bilan bir xil) */
    var eLt = base.eL || 'bino', eRt = base.eR || 'bino';
    function edgeAxo(sd, et) { var xi = sd < 0 ? -SB : rl + SB, xo = sd < 0 ? -SB - BD : rl + SB + BD, xa = Math.min(xi, xo), xb2 = Math.max(xi, xo);
      function q4(a, f, st, w, o) { A(poly(a), f, st || null, w || 0, o); }
      if (et === 'bog') {
        box(xa, 0, 0, BD, LG, 0.15, line ? '#fff' : '#dbe8cc', line ? '#fff' : '#c9dbb6', line ? '#fff' : '#d2e2c0', 1);
        var xp = xa + BD * 0.5; q4([[xp - 0.6, 0, 0.16], [xp + 0.6, 0, 0.16], [xp + 0.6, LG, 0.16], [xp - 0.6, LG, 0.16]], line ? '#fff' : '#efe6d4', line ? INK : null, 0.4);
        [0.22, 0.8].forEach(function (fx, c) { for (var y = 3 + c * 3.5; y < LG - 1; y += 7) (function (x, yy, j) { ob(x, yy, function () { var q = P(x, yy, 0.15); AS.uaT(L, j % 2 ? 'T_bulut2' : 'T_bulut', q[0], q[1], 10, k, j, sd > 0); }); })(xa + BD * fx, y, Math.round(y) + c); });
        return; }
      if (et === 'ochiq') {
        box(xa, 0, 0, BD, LG, 0.12, line ? '#fff' : '#efeae1', line ? '#fff' : '#e2dccf', line ? '#fff' : '#e8e2d6', 1);
        for (var gx = xa + 1.5; gx < xb2 - 0.2; gx += 1.5) { var a = P(gx, 0, 0.121), b = P(gx, LG, 0.121); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, LIGHT, 0.35); }
        for (var gy = 1.5; gy < LG; gy += 1.5) { var c1 = P(xa, gy, 0.121), c2 = P(xb2, gy, 0.121); A('M' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + 'L' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1), null, LIGHT, 0.35); }
        [[0.4, 6], [0.65, 15], [0.3, 22]].forEach(function (pp, j) { var x = xa + BD * pp[0]; ob(x, pp[1], function () { var q = P(x, pp[1], 0.12); AS.ua(L, PPL[(pI++) % PPL.length], q[0], q[1], k, j % 2 === 0); }); });
        return; }
      if (et === 'qiyalik') { var H = 3, z0 = 0.15, G = line ? '#ffffff' : '#cfe0b8', S2 = line ? '#ffffff' : '#e3d8c4';
        q4([[xo, 0, 0], [xo, LG, 0], [xo, LG, H], [xo, 0, H]], S2, INK, 0.5);
        q4([[xi, 0, 0], [xo, 0, 0], [xo, 0, H], [xi, 0, z0]], S2, INK, 0.5);
        q4([[xi, 0, z0], [xo, 0, H], [xo, LG, H], [xi, LG, z0]], G, INK, 0.5);
        [1, 2].forEach(function (hh) { var x = xi + (xo - xi) * (hh - z0) / (H - z0), a = P(x, 0, hh), b = P(x, LG, hh); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, '#7fa06b', 0.6, 0.8, '4 3'); });
        for (var ty = 0.8; ty < LG; ty += 1.6) { var t1 = P(xi + (xo - xi) * 0.05, ty, z0 + 0.1), t2 = P(xi + (xo - xi) * 0.25, ty, z0 + (H - z0) * 0.25); A('M' + t1[0].toFixed(1) + ' ' + t1[1].toFixed(1) + 'L' + t2[0].toFixed(1) + ' ' + t2[1].toFixed(1), null, '#7fa06b', 0.5); }
        var cc = P((xi + xo) / 2, LG * 0.5, (H + z0) / 2 + 0.2); AT(cc[0], cc[1], tr('Qiyalik') + ' 1:3', 7.5, '#5f7f4f', 600, 'middle');
        return; }
      if (et === 'suv') { var bk = 1.6, xw = xi + sd * bk, zw = -0.7, WT = line ? '#ffffff' : '#bcd6e6';
        box(Math.min(xi, xw), 0, 0, bk, LG, 0.15, line ? '#fff' : '#e4ddd0', line ? '#fff' : '#d4cbbb', line ? '#fff' : '#dcd4c6', 1);
        q4([[xw, 0, zw - 1.6], [xo, 0, zw - 1.6], [xo, 0, zw], [xw, 0, zw]], line ? '#ffffff' : '#a9c8dc', INK, 0.5);
        q4([[xw, 0, zw], [xo, 0, zw], [xo, LG, zw], [xw, LG, zw]], WT, INK, 0.5);
        q4([[xw, 0, zw], [xw, LG, zw], [xw, LG, 0.15], [xw, 0, 0.15]], line ? '#ffffff' : '#d9d0c0', INK, 0.5);
        for (var wy = 2; wy < LG - 1; wy += 3.2) for (var wx = Math.min(xw, xo) + 0.8; wx < Math.max(xw, xo) - 0.8; wx += 1.8) { var r1 = P(wx, wy + (wx % 2), zw + 0.01), r2 = P(wx + 0.9, wy + (wx % 2), zw + 0.01); A('M' + r1[0].toFixed(1) + ' ' + r1[1].toFixed(1) + 'L' + r2[0].toFixed(1) + ' ' + r2[1].toFixed(1), null, '#4f86a8', 0.6, 0.8); }
        for (var ry = 0.4; ry < LG; ry += 2.5) { var p1 = P(xw - sd * 0.15, ry, 0.15), p2 = P(xw - sd * 0.15, ry, 1.1); A('M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1), null, INK, 0.6); }
        var ra = P(xw - sd * 0.15, 0, 1.1), rb = P(xw - sd * 0.15, LG, 1.1); A('M' + ra[0].toFixed(1) + ' ' + ra[1].toFixed(1) + 'L' + rb[0].toFixed(1) + ' ' + rb[1].toFixed(1), null, INK, 0.8);
        var cw = P((xw + xo) / 2, LG * 0.45, zw); AT(cw[0], cw[1], tr('Daryo / kanal'), 7.5, '#4f86a8', 600, 'middle');
        return; }
    }
    if (eLt !== 'bino') edgeAxo(-1, eLt); if (eRt !== 'bino') edgeAxo(1, eRt);
    if (eLt === 'bino') ob(-SB - BD, LG, function () { var H = Math.min(base.bL, bmax) * 3.2; box(-SB - BD, 0, 0, BD, LG, H, line ? '#fff' : '#ecebe7', line ? '#fff' : '#e2e0db', line ? '#fff' : '#f6f5f2'); for (var f = 1; f < H / 3.2; f++) { var a = P(-SB, 0, f * 3.2), b = P(-SB, LG, f * 3.2); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, '#cfcbc3', 0.6); } for (var wy = 2; wy < LG - 2; wy += 3.5) for (var f2 = 0; f2 < H / 3.2; f2++) A(poly([[-SB, wy, f2 * 3.2 + 0.9], [-SB, wy + 1.6, f2 * 3.2 + 0.9], [-SB, wy + 1.6, f2 * 3.2 + 2.5], [-SB, wy, f2 * 3.2 + 2.5]]), line ? '#fff' : '#d5dde3', line ? INK : null, 0.4); });
    /* oʻng (yaqin) bino — shaffof: toʻliq balandlikda, punktir kontur, koʻchani toʻsmaydi (26.10) */
    function ghostBld() { var x0 = rl + SB, x1 = x0 + BD, Hr = Math.max(1, Math.min(base.bR || 1, bmax)) * 3.2, V = [[x0, 0, 0], [x1, 0, 0], [x1, LG, 0], [x0, LG, 0], [x0, 0, Hr], [x1, 0, Hr], [x1, LG, Hr], [x0, LG, Hr]];
      A(poly([V[0], V[1], V[2], V[3]]), line ? '#ffffff' : '#ecebe7', null, 0, 0.55);
      if (!line) { A(poly([V[0], V[1], V[5], V[4]]), '#f4f2ee', null, 0, 0.16); A(poly([V[1], V[2], V[6], V[5]]), '#f4f2ee', null, 0, 0.12); A(poly([V[4], V[5], V[6], V[7]]), '#f4f2ee', null, 0, 0.16); }
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) { var a = P(V[e[0]][0], V[e[0]][1], V[e[0]][2]), b = P(V[e[1]][0], V[e[1]][1], V[e[1]][2]); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, '#8f8a80', 0.7, 0.9, '4 3'); });
      for (var f = 1; f < Hr / 3.2; f++) { var a = P(x0, 0, f * 3.2), b = P(x0, LG, f * 3.2); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, '#b9b3a8', 0.5, 0.6, '2 3'); } }
    /* ===== rejaga joylashtirilgan elementlar (parklet, bekat, shpalera…) — kesim uslubidagi illyustratsiya; boshqa obyektlar ularning joyiga tushmaydi ===== */
    var PLA = (base.PL || []).filter(function (p) { return p.z < els.length && p.y < LG - 0.6; }).map(function (p) { var y = Math.max(0, p.y); return { t: p.t, z: p.z, y: y, l: Math.max(0.6, Math.min(p.l, LG - 0.3 - y)) }; });
    function busy(i, a, b) { return PLA.some(function (p) { return p.z === i && p.y < b + 0.3 && p.y + p.l > a - 0.3; }); }
    function C3(a) { return line ? ['#ffffff', '#ffffff', '#ffffff'] : a; }
    var WOOD = C3(['#e6d3b3', '#cfb68f', '#dbc4a0']), GRN = C3(['#bcd6a8', '#9fbf8c', '#accb98']), CON = C3(['#e9e5dd', '#d2cdc3', '#dcd8cf']), GLS = line ? '#ffffff' : '#d6e5ee';
    function bx(x0, y0, z0, w, l, hh, c) { box(x0, y0, z0, w, l, hh, c[0], c[1], c[2], 1); }
    function shrub(x, y, z, r) { var q = P(x, y, z + r * 0.55); A(El(q[0], q[1], r * k, r * 0.7 * k), line ? '#ffffff' : '#a9c897', line ? INK : '#7d9c69', 0.5); }
    function seg3(a, b, st, w) { var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); A('M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1), null, st, w); }
    function mark(x0, x1, y, l, z, col, txt2) { A(poly([[x0 + 0.15, y, z], [x1 - 0.15, y, z], [x1 - 0.15, y + l, z], [x0 + 0.15, y + l, z]]), line ? '#ffffff' : '#f6efd6', col, 0.8, 1, '3 2');
      for (var t = 0.6; t < l - 0.2; t += 1.2) seg3([x0 + 0.2, y + t, z], [x1 - 0.2, y + t + 0.6, z], col, 0.5);
      var c = P((x0 + x1) / 2, y + l / 2, z); AT(c[0], c[1] + 3, txt2, 7, col, 700, 'middle'); }
    function drawPL(p) { var i = p.z, e = els[i], x0 = zx[i][0], x1 = zx[i][1], w = x1 - x0, cx = (x0 + x1) / 2, h = T[e[0]][1], y = p.y, l = p.l, leftZ = cx < rl / 2, xRoad = leftZ ? x1 : x0;
      if (p.t === 'parklet') { bx(x0 + 0.1, y, 0, w - 0.2, l, 0.15, WOOD); for (var t = 0.4; t < l; t += 0.5) seg3([x0 + 0.15, y + t, 0.151], [x1 - 0.15, y + t, 0.151], line ? '#d2cdc3' : '#c9ae86', 0.35);
        [y + 0.1, y + l - 0.7].forEach(function (yy) { bx(x0 + 0.2, yy, 0.15, w - 0.4, 0.6, 0.45, CON); [0.3, 0.7].forEach(function (f) { shrub(x0 + 0.2 + (w - 0.4) * f, yy + 0.3, 0.6, 0.38); }); });
        bx(xRoad - (leftZ ? 0.4 : 0) , y + 0.8, 0.15, 0.4, l - 1.6, 0.45, CON); for (var t2 = 1.1; t2 < l - 1; t2 += 0.8) shrub(xRoad + (leftZ ? -0.2 : 0.2), y + t2, 0.6, 0.3);
        bx(leftZ ? x0 + 0.2 : x1 - 0.65, y + 1.2, 0.15, 0.45, l - 2.4, 0.45, WOOD); return; }
      if (p.t === 'bekat') { var xb = leftZ ? x0 + 0.3 : x1 - 0.3, sd = leftZ ? 1 : -1, d2 = Math.min(1.8, w - 0.4), xf = xb + sd * d2;
        bx(Math.min(xb, xf), y, h, d2, l, 0.04, CON);
        A(poly([[xb, y, h], [xb, y + l, h], [xb, y + l, h + 2.4], [xb, y, h + 2.4]]), GLS, '#8f8a80', 0.5, line ? 1 : 0.75);
        [y, y + l].forEach(function (yy) { seg3([xf, yy, h], [xf, yy, h + 2.45], INK, 0.9); seg3([xb, yy, h], [xb, yy, h + 2.45], INK, 0.9); });
        bx(Math.min(xb, xf) - 0.1, y - 0.15, h + 2.45, d2 + 0.2, l + 0.3, 0.12, C3(['#f2f0eb', '#d9d5cc', '#e4e0d8']));
        bx(Math.min(xb + sd * 0.1, xb + sd * 0.55), y + 0.6, h, 0.45, l - 1.2, 0.45, WOOD);
        var sp = P(xf + sd * 0.2, y + l + 0.4, h + 2.6), sb = P(xf + sd * 0.2, y + l + 0.4, h); A('M' + sb[0].toFixed(1) + ' ' + sb[1].toFixed(1) + 'L' + sp[0].toFixed(1) + ' ' + sp[1].toFixed(1), null, INK, 0.9); A(El(sp[0], sp[1] - 3, 3.2, 3.2), line ? '#ffffff' : '#4c5bd4', INK, 0.5); return; }
      if (p.t === 'shpalera') { var ww = Math.min(0.9, w - 0.3); bx(cx - ww / 2, y, h, ww, l, 0.45, CON); bx(cx - ww / 2 + 0.1, y + 0.1, h + 0.45, ww - 0.2, l - 0.2, 1.0, GRN); return; }
      if (p.t === 'buta') { for (var t3 = 0.5; t3 < l; t3 += 1.0) shrub(cx + ((Math.round(t3) % 2) ? 0.35 : -0.35) * Math.min(1, w / 2), y + t3, h, 0.6); return; }
      if (p.t === 'terrasa') { bx(x0 + 0.1, y, h, w - 0.2, l, 0.08, WOOD); for (var t4 = 1.4; t4 < l - 0.6; t4 += 2.8) (function (yy) { var q = P(cx, yy, h + 0.08); AS.soyabon(L, q[0], q[1], k); })(y + t4); return; }
      if (p.t === 'velopark') { for (var t5 = 0.4; t5 < l; t5 += 0.9) { var yy5 = y + t5, a1 = P(cx - 0.4, yy5, h), a2 = P(cx - 0.4, yy5, h + 0.75), a3 = P(cx + 0.4, yy5, h + 0.75), a4 = P(cx + 0.4, yy5, h); A('M' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + 'L' + a2[0].toFixed(1) + ' ' + a2[1].toFixed(1) + 'L' + a3[0].toFixed(1) + ' ' + a3[1].toFixed(1) + 'L' + a4[0].toFixed(1) + ' ' + a4[1].toFixed(1), null, INK, 0.9); } return; }
      if (p.t === 'samokat') { for (var t6 = 0.3; t6 < l; t6 += 0.6) { var yy6 = y + t6; seg3([cx - 0.3, yy6, h + 0.08], [cx + 0.3, yy6, h + 0.08], INK, 1.2); seg3([cx + 0.3, yy6, h + 0.08], [cx + 0.25, yy6, h + 1.0], line ? INK : '#2f8f6a', 0.9); } return; }
      if (p.t === 'orindiq') { bx(cx - 0.25, y, h, 0.5, Math.min(l, 2), 0.45, WOOD); bx(leftZ ? cx - 0.3 : cx + 0.22, y, h + 0.45, 0.08, Math.min(l, 2), 0.4, WOOD); return; }
      if (p.t === 'axlat') { bx(cx - 0.25, y, h, 0.5, 0.5, 0.9, C3(['#bdb8ae', '#8f8a80', '#a49f95'])); return; }
      if (p.t === 'daraxt') { var q7 = P(cx, y + l / 2, h); AS.uaT(L, 'T_bulut', q7[0], q7[1], 10, k, i + Math.round(y), !leftZ); return; }
      if (p.t === 'gul') { bx(cx - 0.4, y, h, 0.8, Math.min(0.8, l), 0.45, CON); ['#e7a0b4', '#f2c14e', '#e7a0b4'].forEach(function (c4, j) { var q8 = P(cx - 0.2 + j * 0.2, y + 0.4, h + 0.62); A(El(q8[0], q8[1], 0.18 * k, 0.13 * k), line ? '#ffffff' : c4, line ? INK : '#9a6b5c', 0.4); }); shrub(cx, y + 0.4, h + 0.45, 0.3); return; }
      if (p.t === 'yuklash') { mark(x0, x1, y, l, 0.012, line ? INK : '#c79a12', 'YUK'); return; }
      if (p.t === 'taksi') { mark(x0, x1, y, l, 0.012, line ? INK : '#c79a12', 'TAKSI'); return; }
    }
    PLA.forEach(function (p) { var i = p.z, cx = (zx[i][0] + zx[i][1]) / 2; ob(cx, p.y + p.l / 2, function () { drawPL(p); }); });
    els.forEach(function (e, i) { var f = e[2] || {}, x0 = zx[i][0], x1 = zx[i][1], cx = (x0 + x1) / 2, h = T[e[0]][1], left = cx < rl / 2, dir = left ? 1 : -1;
      if ((e[0] === 'yash' || e[0] === 'med') && f.daraxt) [4, 12, 20, 27].forEach(function (y, j) { if (busy(i, y - 1.5, y + 1.5)) return; ob(cx, y, function () { var q = P(cx, y, h); AS.uaT(L, e[1] >= 2.9 ? (j % 2 ? 'T_bulut2' : 'T_bulut') : (e[0] === 'med' ? 'T_terak' : 'T_tuxum'), q[0], q[1], e[1] >= 2.9 ? 10 : 11, k, i + j, !left); }); });
      /* turargoh: oʻtish joyidan keyin, 6 m qadam bilan; har 4-joy — daraxt choʻntagi (reja bilan bir xil), hech narsa ustma-ust tushmaydi */
      if (e[0] === 'park' && (f.mashina || f.dchontak)) { var k2p = 0; for (var yp = zFree; yp + 4.7 <= LG - 0.3; yp += 6, k2p++) (function (y, kk) { if (busy(i, y, y + 4.7)) return; if (f.dchontak && kk % 4 === 2) ob(cx, y + 2.35, function () { var q = P(cx, y + 2.35, 0); AS.uaT(L, 'T_tuxum', q[0], q[1], 8, k, kk); }); else if (f.mashina) ob(cx, y, function () { car(cx, y); }); })(yp, k2p); }
      if (e[0] === 'qat' && f.mashina !== false) (i % 2 ? [12.5, 22.6] : [zFree + 0.6, 18.5]).forEach(function (y) { ob(cx, y, function () { car(cx, y); }); });   /* oʻtish joyi (2,5–6,5 m) bilan kesishmaydi */
      if (e[0] === 'bus' && !busy(i, 9, 21)) ob(cx, 9, function () { vBus(cx, 9, left); return; box(cx - 1.27, 9, 0, 2.55, 12, 3.1, line ? '#fff' : '#f3ecdd', line ? '#fff' : '#e3d9c4', line ? '#fff' : '#ebe2cf', 1); for (var wy = 10; wy < 20; wy += 2) A(poly([[cx + 1.28, wy, 1.4], [cx + 1.28, wy + 1.5, 1.4], [cx + 1.28, wy + 1.5, 2.5], [cx + 1.28, wy, 2.5]]), '#c3cdd5', '#5d5a55', 0.4, 1); });
      if (e[0] === 'tram' && i % 2 === 0) ob(cx, 3, function () { vTram(cx, 0.5, left); return; box(cx - 1.33, 3, 0, 2.65, 20, 3.4, line ? '#fff' : '#f4f1ea', line ? '#fff' : '#e2ddd3', line ? '#fff' : '#ece8e0', 1); A(poly([[cx + 1.34, 3, 0.9], [cx + 1.34, 23, 0.9], [cx + 1.34, 23, 1.2], [cx + 1.34, 3, 1.2]]), line ? '#fff' : '#c96b5c', null, 0); for (var wy = 4; wy < 22; wy += 2.2) A(poly([[cx + 1.34, wy, 1.4], [cx + 1.34, wy + 1.6, 1.4], [cx + 1.34, wy + 1.6, 2.7], [cx + 1.34, wy, 2.7]]), '#c3cdd5', '#5d5a55', 0.4, 1); var a = P(cx, 10, 3.4), b = P(cx + 0.4, 10.6, 5.6); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), null, INK, 1); });
      if (e[0] === 'tram') { var wa = P(cx, 0, 5.8), wb = P(cx, LG, 5.8); A('M' + wa[0].toFixed(1) + ' ' + wa[1].toFixed(1) + 'L' + wb[0].toFixed(1) + ' ' + wb[1].toFixed(1), null, INK, 0.5); }
      if ((e[0] === 'mebel' || e[0] === 'med') && f.fonar) [2, 14, 26].forEach(function (y) { ob(cx, y, function () { var a = P(cx, y, h), b = P(cx, y, h + 9), c2 = P(cx + dir * 1.6, y, h + 9.4); A('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'L' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1), null, INK, Math.max(1, 0.12 * k)); }); });
      if (e[0] === 'piy') [2, 8.5, 16, 23].forEach(function (y, j) { if (busy(i, y - 0.6, y + 0.6)) return; var xx = x0 + (x1 - x0) * (j % 2 ? 0.65 : 0.3); ob(xx, y, function () { var q = P(xx, y, h); AS.ua(L, PPL[(pI++) % PPL.length], q[0], q[1], k, j % 2 === 0); }); });
      if (e[0] === 'velo') [6, 19].forEach(function (y) { if (busy(i, y - 1, y + 1)) return; ob(cx, y, function () { var q = P(cx, y, h); AS.velochi(L, q[0], q[1], k, !left); }); });
      if (e[0] === 'front' && f.kafe) [4, 12, 20].forEach(function (y) { if (busy(i, y - 1.4, y + 1.4)) return; ob(cx, y, function () { var q = P(cx, y, h); AS.soyabon(L, q[0], q[1], k); }); });
      if ((e[0] === 'yash' || e[0] === 'front') && f.orin) [8, 24].forEach(function (y) { if (busy(i, y - 1, y + 1)) return; ob(cx, y, function () { var q = P(cx, y, h); AS.ua(L, 'otirgan_blok', q[0], q[1], k, !left); }); });
    });
    OB.sort(function (a, b) { return a.key - b.key; }).forEach(function (o) { o.fn(); });
    if (eRt === 'bino') ghostBld();   // eng oxirida — shaffof qobiq daraxt va odamlar ustida

      return { D: D, TT: TT, bmax: bmax };
    }
    function perspDraw(base, mode, gfx, W, H) {
      var D = [], TT = [], line = gfx === 1, INK = '#2f2e2b', ST = '#5d5a55';
      function A(d, f, st, w, o, da, t) { D.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '', t: t || '' }); }
      function AT(x, y, t, fs, c, fw, an) { TT.push({ x: x.toFixed(1), y: y.toFixed(1), t: t, fs: fs || 10, c: c || '#141414', fw: fw || 400, ff: 'Archivo, sans-serif', a: an || 'start' }); }
      var L = { line: line, ink: INK, add: A };
      var COL = { front: ['#f1e9da', .15], piy: ['#ece8df', .15], mebel: ['#e4ddcf', .15], yash: ['#d3e4c6', .15], velo: ['#d98a78', .08], park: ['#dedfe2', 0], qat: ['#d2d3d7', 0], bus: ['#93a9d8', 0], tram: ['#e8dece', .02], med: ['#d9e7cd', .15], ariq: ['#cfe2ee', 0], kanal: ['#bcd6e6', 0] };
      var ROADZ = { qat: 1, bus: 1, park: 1, tram: 1 };
      var hasZP = base.els.some(function (q) { return q[2] && q[2].zebra; });   // oʻtish joyi 34–38 m — mashina qoʻyilmaydi
      var els = base.els, rl = base.rl, SB = 1.5, zx = [], acc = 0; els.forEach(function (e) { zx.push([acc, acc + e[1]]); acc += e[1]; });
      function zc(i) { return (zx[i][0] + zx[i][1]) / 2; }
      function first(t, pred) { for (var i = 0; i < els.length; i++) if (els[i][0] === t && (!pred || pred(i))) return i; return -1; }
      var EYE = { piy: 1.6, bola: 1.0, velo: 1.45, mashina: 1.15 }[mode], NAME = { piy: 'Piyoda koʻzi', bola: 'Bola koʻzi', velo: 'Velosipedchi koʻzi', mashina: 'Haydovchi koʻzi' }[mode];
      var ci = mode === 'velo' ? first('velo') : (mode === 'mashina' ? first('qat', function (i) { return zc(i) > rl / 2; }) : first('piy'));
      if (ci < 0 && mode === 'mashina') ci = first('qat'); if (ci < 0) ci = first('piy'); if (ci < 0) ci = 0;
      var cx = zc(ci) + (mode === 'bola' ? 0.4 : 0), ch = COL[els[ci][0]][1], ez = ch + EYE;
      if (mode === 'mashina' && zc(ci) > rl / 2) cx = zc(ci) - 0.35;
      var f = W * 0.6, HZ = H * 0.46, Y0 = 0.9, Y1 = 260;
      function P(x, y, z) { return [W / 2 + f * (x - cx) / y, HZ + f * (ez - z) / y]; }
      function poly(pts) { return 'M' + pts.map(function (p) { var q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z'; }
      function seg(a, b) { var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); return 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }
      A('M0 0H' + W + 'V' + H + 'H0Z', line ? '#ffffff' : '#f6f5f1', null, 0);
      if (!line) A('M0 ' + HZ + 'H' + W + 'V' + H + 'H0Z', '#e7e3db', null, 0);
      // binolar
      [[-SB, base.bL, -1], [rl + SB, base.bR, 1]].forEach(function (b) { var x = b[0], Hb = b[1] * 3.2, sd = b[2];
        A(poly([[x, Y0, 0], [x, Y1, 0], [x, Y1, Hb], [x, Y0, Hb]]), line ? '#ffffff' : '#f0eee9', ST, 0.6);
        A(poly([[x, Y0, 0], [x, Y1, 0], [x, Y1, 3.6], [x, Y0, 3.6]]), line ? '#ffffff' : '#e6e1d8', ST, 0.4);
        for (var fl = 1; fl < b[1]; fl++) A(seg([x, Y0, 3.6 + (fl - 1) * 3.2 + 3.2 * 0], [x, Y1, 3.6 + (fl - 1) * 3.2]), null, '#d3cfc7', 0.5);
        for (var y = Y0 + 1.5; y < 110; y += 4.5) { A(poly([[x, y, 0.3], [x, y + 3.2, 0.3], [x, y + 3.2, 3.1], [x, y, 3.1]]), line ? '#ffffff' : '#cbd5dc', ST, 0.35); for (var fl2 = 1; fl2 < b[1]; fl2++) { var z0 = 3.6 + (fl2 - 1) * 3.2 + 0.8; A(poly([[x, y + 0.6, z0], [x, y + 2.4, z0], [x, y + 2.4, z0 + 1.6], [x, y + 0.6, z0 + 1.6]]), line ? '#ffffff' : '#d3dbe1', ST, 0.3); } }
        A(poly([[x, Y0, Hb], [x, Y1, Hb], [x + sd * 6, Y1, Hb], [x + sd * 6, Y0, Hb]]), line ? '#ffffff' : '#e3e0d9', ST, 0.4);
      });
      A(poly([[-SB, Y0, 0.15], [0, Y0, 0.15], [0, Y1, 0.15], [-SB, Y1, 0.15]]), line ? '#fff' : '#ebe7df', null, 0); A(poly([[rl, Y0, 0.15], [rl + SB, Y0, 0.15], [rl + SB, Y1, 0.15], [rl, Y1, 0.15]]), line ? '#fff' : '#ebe7df', null, 0);
      // zonalar
      els.forEach(function (e, i) { var c = COL[e[0]], x0 = zx[i][0], x1 = zx[i][1], h = c[1]; A(poly([[x0, Y0, h], [x1, Y0, h], [x1, Y1, h], [x0, Y1, h]]), line ? '#ffffff' : c[0], line ? ST : null, 0.4);
        var pr = els[i - 1]; if (pr) { var hp = COL[pr[0]][1]; if (Math.abs(hp - h) > 0.05) A(poly([[x0, Y0, Math.min(h, hp)], [x0, Y1, Math.min(h, hp)], [x0, Y1, Math.max(h, hp)], [x0, Y0, Math.max(h, hp)]]), line ? '#ffffff' : '#bdb8ae', ST, 0.4); }
        var nx = els[i + 1]; if (e[0] === 'qat' && nx && nx[0] === 'qat') for (var y = 4; y < 160; y += 9) A(poly([[x1 - 0.07, y, 0.01], [x1 + 0.07, y, 0.01], [x1 + 0.07, y + 3, 0.01], [x1 - 0.07, y + 3, 0.01]]), line ? ST : '#ffffff', null, 0);
        if (ROADZ[e[0]] && els.some(function (q) { return q[2] && q[2].zebra; })) for (var zz = x0 + 0.25; zz < x1 - 0.3; zz += 1.0) A(poly([[zz, 34, h + 0.01], [zz + 0.5, 34, h + 0.01], [zz + 0.5, 38, h + 0.01], [zz, 38, h + 0.01]]), line ? '#ffffff' : '#ffffff', line ? ST : null, 0.3);
        if (e[0] === 'tram') { [0.27, 0.73].forEach(function (fr) { A(seg([x0 + (x1 - x0) * fr, Y0, h + 0.02], [x0 + (x1 - x0) * fr, Y1, h + 0.02]), null, '#77736b', 1); }); A(seg([(x0 + x1) / 2, Y0 + 2, 5.9], [(x0 + x1) / 2, Y1, 5.9]), null, ST, 0.6); }
      });
      // obyektlar
      var OB = []; function ob(y, fn) { if (y > Y0 + 0.6) OB.push({ y: y, fn: fn }); }
      var PPL = ['ayol_yurgan', 'erkak_yurgan', 'ona_bola', 'telefon', 'ayol_koylak', 'ryukzak', 'erkak_turgan', 'aravacha', 'qariya', 'yuguruvchi', 'erkak_palto', 'ayol_sumka', 'qol_kotargan', 'ayol_palto'], pI = 0;
      function k(y) { return f / y; }
      els.forEach(function (e, i) { var fl = e[2] || {}, x0 = zx[i][0], x1 = zx[i][1], c = zc(i), h = COL[e[0]][1], left = c < rl / 2, dir = left ? 1 : -1;
        if ((e[0] === 'yash' || e[0] === 'med') && fl.daraxt) for (var y = 6 + (i % 3) * 2; y < 200; y += 8) (function (y) { ob(y, function () { var q = P(c, y, h); AS.uaT(L, e[1] >= 2.9 ? (Math.round(y) % 2 ? 'T_bulut2' : 'T_bulut') : (e[0] === 'med' ? 'T_terak' : 'T_tuxum'), q[0], q[1], e[1] >= 2.9 ? 10 : 11, k(y), i + Math.round(y), !left); }); })(y);
        if (e[0] === 'park' && fl.dchontak) for (var y2 = 18; y2 < 200; y2 += 24) (function (y) { ob(y, function () { var q = P(c, y, 0); AS.uaT(L, 'T_tuxum', q[0], q[1], 8, k(y), Math.round(y)); }); })(y2);
        if ((e[0] === 'mebel' || e[0] === 'med') && fl.fonar) for (var y3 = 9; y3 < 220; y3 += 25) (function (y) { ob(y, function () { A(seg([c, y, h], [c, y, h + 9]) + 'L' + P(c + dir * 1.6, y, h + 9.4).map(function (v) { return v.toFixed(1); }).join(' '), null, ST, Math.max(0.6, 0.16 * k(y))); var q = P(c + dir * 1.6, y, h + 9.3); A(El(q[0], q[1], Math.max(0.8, 0.35 * k(y)), Math.max(0.5, 0.12 * k(y))), line ? '#ffffff' : '#f3dc94', ST, 0.4); }); })(y3);
        if (e[0] === 'piy') for (var j = 0; j < 12; j++) (function (j) { var y = 4.5 + j * 6.5 + (i * 3.7 + j * 2.3) % 4, xx = x0 + (x1 - x0) * (0.2 + ((j * 37 + i * 11) % 60) / 100); if (mode !== 'velo' && mode !== 'mashina' && i === ci && Math.abs(xx - cx) < 0.8 && y < 8) return; ob(y, function () { var q = P(xx, y, h); AS.ua(L, PPL[(pI++) % PPL.length], q[0], q[1], k(y), j % 2 === 0); }); })(j);
        if (e[0] === 'velo') [9, 26, 58].forEach(function (y) { if (mode === 'velo' && i === ci && y < 12) return; ob(y, function () { var q = P(c, y, h); AS.velochi(L, q[0], q[1], k(y), !left); }); });
        if (e[0] === 'front' && fl.kafe) [6, 16, 26, 36].forEach(function (y) { ob(y, function () { var q = P(c, y, h); AS.soyabon(L, q[0], q[1], k(y)); }); });
        if ((e[0] === 'yash' || e[0] === 'front') && fl.orin) [11, 31].forEach(function (y) { ob(y, function () { var q = P(c - dir * 0.4, y, h); AS.ua(L, 'otirgan_blok', q[0], q[1], k(y), !left); }); });
        if (e[0] === 'qat') [14 + (i * 7) % 12, 42 + (i * 5) % 15, 75 + (i * 3) % 20].forEach(function (y) { if (mode === 'mashina' && i === ci && y < 18) return; ob(y, function () { var q = P(c, y, 0); AS.mashina(L, q[0], q[1], k(y)); }); });
        if (e[0] === 'park' && fl.mashina) for (var y4 = 8; y4 < 90; y4 += 6) { if (fl.dchontak && (y4 - 18) % 24 === 0) continue; if (hasZP && y4 > 30.5 && y4 < 41.5) continue; (function (y) { ob(y, function () { var q = P(c, y, 0); AS.mashina(L, q[0], q[1], k(y)); }); })(y4); }
        if (e[0] === 'bus') ob(30, function () { var q = P(c, 30, 0); AS.avtobus(L, q[0], q[1], k(30)); });
        if (e[0] === 'tram' && i % 2 === 0) ob(46, function () { var q = P(c, 46, h); AS.tramvay(L, q[0], q[1], k(46)); });
      });
      OB.sort(function (a, b) { return b.y - a.y; }).forEach(function (o) { o.fn(); });
      // yozuv
      A('M16 ' + (H - 44) + 'h' + 320 + 'v32h-320Z', '#ffffff', null, 0, 0.85);
      AT(26, H - 24, NAME + ' · koʻz balandligi ' + String(EYE).replace('.', ',') + ' m', 11, '#141414', 700); AT(26, H - 13, 'Kuzatuvchi: ' + ({ front: 'B3', piy: 'piyodalar hududi', mebel: 'B1', yash: 'B2', velo: 'velo yoʻlak', park: 'turargoh', qat: 'harakat boʻlagi', bus: 'avtobus boʻlagi', tram: 'tramvay', med: 'ajratuvchi', ariq: 'ariq', kanal: 'kanal' }[els[ci][0]]) + ', qizil chiziqdan ' + String(Math.round(cx * 10) / 10).replace('.', ',') + ' m', 8.5, '#8f8a80');
      return { D: D, TT: TT };
    }

    var T = {
      front: { n: 'B3 · Fasad oldi', s: 'B3', c: '#f1e9da', h: .15, ic: 'M4 20V6h16v14M4 12h16M9 20v-4h6v4' },
      piy: { n: 'Piyodalar hududi', s: 'Piyoda', c: '#ece8df', h: .15, ic: 'M11.5 4.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M10 21l2.2-6.2 2.8 2.7V21M8.5 11.5L12 8.5l2.8 2 2.7 1M12 8.5l-1.8 6.3' },
      mebel: { n: 'B1 · Texnik polosa', s: 'B1', c: '#e4ddcf', h: .15, ic: 'M12 3v18M8 6h8' },
      yash: { n: 'B2 · Yashil bufer', s: 'B2', c: '#d3e4c6', h: .15, ic: 'M12 21v-6M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6z' },
      velo: { n: 'Velo yoʻlak', s: 'Velo', c: '#d98a78', h: .08, ic: 'M6 16a3.5 3.5 0 1 0 0.1 0M18 16a3.5 3.5 0 1 0 0.1 0M6 16l4-7h5l3 7M10 9l2 7' },
      park: { n: 'Avtoturargoh', s: 'Turargoh', c: '#dedfe2', h: 0, ic: 'M6 4h12v16H6zM10 16V8h3a2.5 2.5 0 0 1 0 5h-3' },
      qat: { n: 'Harakat boʻlagi', s: 'Harakat', c: '#d2d3d7', h: 0, ic: 'M12 4v16M8 8l4-4 4 4' },
      bus: { n: 'Jamoat transporti boʻlagi', s: 'Avtobus', c: '#93a9d8', h: 0, ic: 'M5 4h14v13H5zM5 11h14M8 20v-3M16 20v-3' },
      tram: { n: 'Tramvay izi', s: 'Tramvay', c: '#e8dece', h: .02, ic: 'M7 3h10v14H7zM9 21l2-4M15 21l-2-4M12 3V1' },
      med: { n: 'Ajratuvchi tasma', s: 'Ajratuvchi', c: '#d9e7cd', h: .15, ic: 'M12 3v18M8 8h8M8 16h8' },
      ariq: { n: 'Ariq / lotok', s: 'Ariq', c: '#cfe2ee', h: 0, ic: 'M3 9h3l2 7h8l2-7h3M8 13h8' },
      kanal: { n: 'Kanal / daryo', s: 'Kanal', c: '#bcd6e6', h: 0, ic: 'M3 8c2 0 2 2 4.5 2S10 8 12 8s2.5 2 4.5 2S19 8 21 8M3 14c2 0 2 2 4.5 2S10 14 12 14s2.5 2 4.5 2S19 14 21 14' }
    };
    Object.keys(T).forEach(function (k) { if (PK[k]) T[k].ic = PK[k]; });

    /* ===== kanal / daryo (26.10): qirgʻoq turi (beton devor, zinapoya, yashil qiya, tosh, botqoq tokcha — NBS) va meʼyor ===== */
    var KSRC = 'VM 981-son qarori (11.12.2019), 29–31, 35, 37-bandlar · lex.uz: 23.06.2026 dan kuchini yoʻqotgan — amaldagi Suv kodeksi (2025) 128–131-moddalari bilan solishtiring';
    function kBank(f, wm) { var t = f.qirgoq || (f.qiya ? 'yashil' : 'devor'), dep = Math.max(0.8, Math.min(8, +f.dep || 2.6)), wl = Math.min(dep * 0.45, 1.2), ratio = { zina: 2, yashil: 2, tosh: 1.5, botqoq: 1.6 }[t] || 0, bh = t === 'devor' ? 0.35 : Math.min(wm * 0.34, ratio * dep), Pp = [];
      if (t === 'devor') Pp = [[0, 0], [0.35, 0], [0.35, dep]];
      else if (t === 'zina') { var n = Math.max(2, Math.round(dep / 0.45)); Pp.push([0, 0]); for (var s2 = 0; s2 < n; s2++) { Pp.push([bh * s2 / n, dep * (s2 + 1) / n]); Pp.push([bh * (s2 + 1) / n, dep * (s2 + 1) / n]); } }
      else if (t === 'botqoq') Pp = [[0, 0], [bh * 0.4, wl + 0.15], [bh * 0.78, wl + 0.15], [bh, dep]];
      else Pp = [[0, 0], [bh, dep]];
      var ur = t === 'devor' ? 0.35 : bh; if (t !== 'devor') for (var j = 1; j < Pp.length; j++) { var a = Pp[j - 1], b = Pp[j]; if ((a[1] - wl) * (b[1] - wl) <= 0 && a[1] !== b[1]) { ur = a[0] + (b[0] - a[0]) * (wl - a[1]) / (b[1] - a[1]); break; } }
      return { t: t, dep: dep, wl: wl, bh: bh, prof: Pp, ur: ur }; }
    function kNorm(f) { var q = +f.q > 0 ? +f.q : 10, dep = Math.max(0.8, Math.min(8, +f.dep || 2.6)), riv = f.tur === 'daryo', vz = null, pp = null;
      if (riv) vz = q > 100 ? [300, 500] : q >= 5 ? [100, 300] : q >= 2 ? [50, 100] : [35, 50];
      else { vz = q > 150 ? [100, 150] : q >= 100 ? [70, 100] : q >= 50 ? [50, 70] : null; pp = dep < 0.75 ? null : dep <= 2 ? [5, 5] : dep <= 5 ? [6.5, 9] : [9.5, 12]; }
      return { q: q, dep: dep, riv: riv, vz: vz, pp: pp }; }
    function clipBelow(Pp, yl) { var out = []; for (var i = 0; i < Pp.length; i++) { var a = Pp[i], b = Pp[(i + 1) % Pp.length], ai = a[1] >= yl, bi = b[1] >= yl; if (ai) out.push(a); if (ai !== bi) { var t = (yl - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, yl]); } } return out; }
    var KCOL = { devor: '#d9d4ca', zina: '#e4ddd0', yashil: '#bcd6a8', tosh: '#cdc8bf', botqoq: '#c4d9ad' };
    var ROAD = { qat: 1, bus: 1, park: 1, tram: 1 };
    var IT = {
      front: [['kafe', 'Terrasa (kafe)', 'DK 13.4'], ['gul', 'Gul tuvaklar', 'DK 13.4'], ['orin', 'Oʻrindiq', 'DK 3.3'], ['velot', 'Velo turargoh', 'DK 7.4']],
      piy: [['odam', 'Piyodalar (grafika)', '']],
      mebel: [['fonar', 'Koʻcha fonari', 'DK 3.3 · B1'], ['belgi', 'Yoʻl belgisi', 'DK 3.3 · B1']],
      yash: [['daraxt', 'Daraxt', 'ShNQ 35-jad.'], ['buta', 'Butalar', 'ShNQ 35-jad.'], ['orin', 'Oʻrindiq', 'DK 3.3 · B2'], ['velot', 'Velo turargoh', 'DK 7.4']],
      velo: [['velochi', 'Velosipedchi (grafika)', '']],
      park: [['mashina', 'Avtoturargoh joylari', 'DK 6'], ['dchontak', 'Daraxt choʻntagi', ''], ['bekat', 'Bekat', 'DK 5'], ['parklet', 'Parklet', '']],
      qat: [['mashina', 'Mashina (grafika)', ''], ['zebra', 'Piyoda oʻtish joyi', 'YHQ']],
      bus: [['avtobus', 'Avtobus (grafika)', ''], ['bekat', 'Bekat paviloni', 'DK 5']],
      tram: [['tramvay', 'Tramvay (grafika)', ''], ['tayanch', 'Kontakt tarmogʻi tayanchi', '']],
      med: [['daraxt', 'Daraxt', 'ShNQ 35-jad.'], ['fonar', 'Fonar', 'ShNQ 2.04.18-22'], ['orolcha', 'Piyoda orolchasi', 'YHQ']], ariq: [['yopiq', 'Yopiq lotok (panjara)', ''], ['koprik', 'Koʻprikcha', '']], kanal: [['panjara', 'Qirgʻoq panjarasi', ''], ['bufer', 'Qirgʻoq polosasini chizish', 'VM 981'], ['koprik', 'Koʻprik', '']]
    };
    var RULE = {
      front: 'DK 3.3: B3 — piyodalar hududi va fasad orasidagi bufer: kirishlar, vitrinalar, terrasalar. Kichik terrasa eni 1,5–2 m (DK 13.3); U1 da faqat B3 da, piyodalar uchun ≥ 3 m buzilmasligi kerak (DK 13.4.1).',
      piy: 'DK 3.3: piyodalarning erkin harakati uchun. Kiosk, oʻrindiq va boshqalar bu enga kirmaydi (ShNQ 20-jadval, 5-izoh). Devorga tutashsa — eni +0,5 m (7-izoh).',
      mebel: 'DK 3.3: B1 — texnik qism: kommunal xizmatlar, yoritish tayanchlari, yoʻl belgilari. Eng kami 0,5 m (DK 3.4).',
      yash: 'DK 3.3: B2 — yoʻl va piyodalar orasidagi bufer: koʻkalamzorlashtirish, toʻsiqlar, velo yoʻl. Daraxt oʻqidan qatnov qismi chetigacha ≥ 2,0 m, trotuar chetigacha ≥ 0,7 m (ShNQ 35-jadval).',
      velo: 'ShNQ 404-band: oqim yoʻnalishida ≥ 1,2 m, qarama-qarshi ≥ 1,5 m. DK 7.4.1: yoʻl sathidagi velo yoʻlak ≥ 1,5 m (ogʻir transport bilan 2 m gacha), mashinadan ≥ 0,5 m bufer bilan ajratiladi.',
      park: 'Joylar orasiga daraxt choʻntagi, bekat yoki parklet qoʻyish mumkin. Avtoturargoh qatnov qismiga kiradi — daraxt masofasi shunga koʻra tekshiriladi.',
      qat: 'ShNQ 2.07.06-24, 2-ilova 1-jadval: boʻlak eni toifaga bogʻliq (masalan, shahar 2-toifa 2,75–3,25, tuman va mahalliy 3,0–3,5). ShNQ 2.07.01-23 20-jadvalida esa 3,25–3,75 — ziddiyat, 311-band 2.07.06-24 ga yuboradi.',
      bus: 'ShNQ 20-jadval, 4-izoh: magistrallarda jamoat transporti uchun 3,75 m li alohida tasma. Bekatlar — DK 5.',
      tram: 'Daraxt tramvay yoʻli chetidan ≥ 5,0 m (ShNQ 35-jadval); yer osti tarmoqlari tramvay izidan ≥ 2,8 m (8-jadval).',
      med: 'ShNQ 2.07.06-24: markaziy ajratuvchi 4 m (toʻsiq bilan 2 m gacha, 109-band); ≥ 5 m boʻlsa boshqa inshootlar mumkin (110-band); koʻkalamzorlashtirish mumkin (91-band). Daraxt uchun har ikki chetdan ≥ 2,0 m (2.07.01-23, 35-jadval).', ariq: 'Ariq / lotok — yomgʻir yoki sugʻorish suvi uchun ochiq yoki yopiq kanal. Koʻchalar boʻylab va kam qavatli hududlarda ochiq tizim kyuvet-lotok koʻrinishida boʻladi (ShNQ 2.07.01-23, 242-band); eng yirik, yirik va katta shaharlarda sugʻorish ariqlari betonli boʻladi (594-band). Eng kichik nishablik: alohida lotok va ariqlar 0,005, asfalt qatnov qismi lotoklari 0,003 (QMQ 2.04.03-19, 19-jadval); trapetsiya kesimli ariq kamida: tubi 0,3 m, chuqurligi 0,4 m (2.43-band). Daraxt ariq qirgʻogʻidan ≥ 2,0 m, buta ≥ 1,0 m (ShNQ 2.07.01-23, 35-jadval). Ustidan oʻtish joylarida koʻprikcha kerak.', kanal: 'Kanal / daryo — ochiq suv oqimi (masalan, Anhor, Boʻzsuv). VM 981-son qarori (11.12.2019): daryo suvni muhofaza zonasi oʻrtacha koʻp yillik suv sarfiga qarab 35–500 m (29-band), daryo qirgʻoq polosasida xoʻjalik faoliyati va qurilish taqiqlanadi (30-band); kanal qirgʻoq polosasi chuqurlikka qarab: 0,75–2 m — 5 m, 2–5 m — 6,5–9 m, 5–10 m — 9,5–12 m (35-band); shahar va aholi punktlarida oʻlchamlar mahalliy sharoit va bosh reja hisobga olinib belgilanadi (30, 37-band). Qaror lex.uz boʻyicha 23.06.2026 dan kuchini yoʻqotgan — amaldagi Suv kodeksi (2025) 128–131-moddalari bilan solishtiring.'
    };
    // [kod, nom, rang, chuqurlik, poydevor(8-jad.), daraxt(35-jad.), yoʻl cheti(8-jad.), afzal zonalar, diametr m, 203-tartib, guruh]
    var UC = [
      ['T', 'Aloqa kanali', '#2b7449', 0.8, 0.6, 2.0, 1.5, ['setback', 'front', 'piy'], 0.15, 1, 'tel'],
      ['E', 'Elektr kabeli ≤ 1 kV', '#7a4fa0', 0.8, 0.6, 2.0, 1.5, ['setback', 'front', 'piy', 'mebel'], 0.15, 2, 'kab'],
      ['HV', 'Elektr kabeli 6–20 kV', '#9b3d9b', 1.0, 0.6, 2.0, 1.5, ['front', 'piy', 'mebel'], 0.15, 2, 'kab'],
      ['DH', 'Issiqlik tarmogʻi (kanal)', '#c0392b', 1.5, 2.0, 2.0, 1.5, ['piy', 'yash', 'front'], 1.2, 3, 'iss'],
      ['DC', 'Sovutish tarmogʻi', '#3a86c8', 1.5, 2.0, 2.0, 1.5, ['piy', 'yash'], 0.8, 3, 'iss'],
      ['G', 'Gaz (past bosim)', '#c79a12', 1.2, 2.0, 1.5, 1.0, ['setback', 'front', 'piy', 'yash'], 0.2, 4, 'gaz'],
      ['W', 'Suv quvuri', '#2a6fb0', 2.5, 5.0, 2.0, 2.0, ['piy', 'yash', 'med', 'velo'], 0.5, 5, 'suv'],
      ['SS', 'Xoʻjalik kanalizatsiyasi', '#8a5a3c', 3.0, 3.0, 1.5, 1.5, ['yash', 'med', 'velo', 'park', 'qat'], 0.6, 6, 'kan'],
      ['SD', 'Yomgʻir kanalizatsiyasi', '#0f8a7e', 2.0, 3.0, 1.5, 1.5, ['yash', 'mebel', 'med', 'park'], 0.8, 6, 'yom'],
      ['UD', 'Drenaj', '#6b6965', 1.8, 3.0, 2.0, 1.5, ['yash', 'med', 'mebel'], 0.3, 7, 'yom'],
      ['SL', 'Yoritish kabeli', '#d9822b', 0.7, 0.6, 2.0, 0.5, ['mebel', 'med', 'yash'], 0.12, 2, 'kab'],
      ['UT', 'Kommunal tunnel', '#141414', 3.0, 2.0, 2.0, 1.5, ['piy', 'yash', 'med'], 2.2, 3, 'tun']
    ];
    // ShNQ 9-jadval (soddalashtirilgan, past bosimli gaz, poʻlat quvur)
    var PR = { suv: { suv: 1.5, kan: 1.5, yom: 1.5, gaz: 1, kab: 0.5, tel: 0.5, iss: 1.5, tun: 1.5 }, kan: { kan: 0.4, yom: 0.4, gaz: 1, kab: 0.5, tel: 0.5, iss: 1, tun: 1 }, yom: { yom: 0.4, gaz: 1, kab: 0.5, tel: 1, iss: 1, tun: 1 }, gaz: { gaz: 0.4, kab: 1, tel: 1, iss: 2, tun: 2 }, kab: { kab: 0.1, tel: 0.5, iss: 2, tun: 2 }, tel: { tel: 0.1, iss: 1, tun: 1 }, iss: { iss: 0.5, tun: 2 }, tun: { tun: 0.5 } };
    function pair(a, b) { return (PR[a] && PR[a][b] != null) ? PR[a][b] : PR[b][a]; }
    var DKP = { U1: [3, 5, .5, 0, 0, '3.4.1', 'Markaziy, transport kam (2–4 tasma)'], U2: [3, 5, .5, 2.5, 0, '3.4.2', 'Markaziy, transport koʻp (5–8 tasma)'], U3: [3, 4, .5, 0, 3, '3.4.3', 'Periferik, transport kam'], U4: [3, 5, .5, 2.5, 4, '3.4.4', 'Periferik, transport koʻp'], U5: [5, 7, .5, 2.5, 0, '3.4.5', 'Piyodalar koʻchasi / maydon'], M1: [2.25, 3, .5, 1.1, 1.1, '3.4.6', 'Mahalla (M1–M2)'] };
    var SKP = { tz1: ['Tezkor 1', 3.0, 3.5, 0, 3.5, 3.75, 'Shaharlarning magistral koʻchalari, 1-toifa (130–90 km/h)'], tz2: ['Tezkor 2', 2.75, 3.25, 0, 3.25, 3.75, 'Shaharlarning magistral koʻchalari, 2-toifa (90–70 km/h)'], sh1: ['Shahar 1', 3.0, 3.5, 4.5, 3.5, 3.75, 'Shahar ahamiyatidagi magistral 1-sinf = 2.07.06-24 «umumiy foydalanishdagi magistral yoʻl 1-toifa»'], sh2: ['Shahar 2', 2.75, 3.0, 3.0, 3.25, 3.75, 'Shahar ahamiyatidagi magistral 2-sinf = umumiy foydalanishdagi 2-toifa'], sh3: ['Shahar 3', 2.75, 3.0, 3.0, 3.25, 3.75, 'Shahar ahamiyatidagi magistral 3-sinf = umumiy foydalanishdagi 3-toifa'], tm: ['Tuman', 3.0, 3.5, 2.25, 3.25, 3.75, 'Tuman ahamiyatidagi magistral'], mh: ['Mahalliy', 3.0, 3.5, 2.0, 3.0, 3.5, 'Mahalliy: turar joy / jamoat-savdo hududi'], pd: ['Piyoda', 0, 99, 0, 0, 99, 'Piyodalar koʻchasi va maydoni'] };
    function UCd(k) { return UC.filter(function (u) { return u[0] === k; })[0]; }
    /* oʻnlik ajratgich: uz — vergul, en/ru — nuqta (CAD fayl va xalqaro chizmalar uchun) */
    function fm(v) { var t = String(Math.round(v * 100) / 100); return getLang() === 'uz' ? t.replace('.', ',') : t; }
    var DC = { ok: '#2b7449', warn: '#c98a12', bad: '#b23a2e' };
    var els = s.els, rl = s.rl, SB = 1.5, used = 0; els.forEach(function (e) { used += e[1]; });
    var zx = [], acc = 0; els.forEach(function (e) { zx.push([acc, acc + e[1]]); acc += e[1]; });
    function zoneAt(x) { for (var i = 0; i < zx.length; i++) if (x >= zx[i][0] && x < zx[i][1]) return i; return -1; }
    function ztype(x) { var i = zoneAt(x); return i < 0 ? 'setback' : els[i][0]; }
    // yoʻl chetlari (qatnov qismi chegaralari) va tramvay chetlari
    var curbs = [], trams = [];
    els.forEach(function (e, i) { var pr = els[i - 1], nx = els[i + 1]; if (ROAD[e[0]] && e[0] !== 'tram') { if (!pr || !ROAD[pr[0]]) curbs.push(zx[i][0]); if (!nx || !ROAD[nx[0]]) curbs.push(zx[i][1]); } if (e[0] === 'tram') trams.push(zx[i]); });
    function nearest(x, arr) { var m = 99; arr.forEach(function (c) { m = Math.min(m, Math.abs(c - x)); }); return m; }
    function inRoad(x) { var t = ztype(x); return !!ROAD[t] && t !== 'park'; }
    var TX = []; els.forEach(function (e, i) { var f = e[2] || {}; if ((e[0] === 'yash' || e[0] === 'med') && f.daraxt) TX.push({ x: (zx[i][0] + zx[i][1]) / 2, z: i }); if (e[0] === 'park' && f.dchontak) TX.push({ x: (zx[i][0] + zx[i][1]) / 2, z: i, pocket: true }); });
    function evalU(u, others) {
      var c = UCd(u.k), x = u.x, rows = [], worst = 'ok';
      function r(n, src, v, need, st) { rows.push({ n: n, src: src, v: v, c: DC[st] }); if (st === 'bad' || (st === 'warn' && worst === 'ok')) worst = st; }
      var toF = Math.min(x + SB, rl + SB - x); r('Bino poydevorigacha', 'ShNQ 2.07.01-23, 209-band, 8-jadval · ≥ ' + fm(c[4]), fm(toF) + ' m', c[4], toF >= c[4] - 0.005 ? 'ok' : 'bad');
      if (TX.length) { var toT = 99; TX.forEach(function (t) { toT = Math.min(toT, Math.abs(t.x - x)); }); r('Daraxt oʻqigacha', 'ShNQ 2.07.01-23, 485-band, 35-jadval · ≥ ' + fm(c[5]), fm(toT) + ' m', c[5], toT >= c[5] - 0.005 ? 'ok' : 'bad'); }
      var wn = null, wv = 99, wneed = 0; others.forEach(function (o) { var nd = pair(c[10], UCd(o.k)[10]), dd = Math.abs(o.x - x); if (dd - nd < wv - wneed) { wv = dd; wneed = nd; wn = o.k; } });
      if (wn) r('Yaqin tarmoq: ' + wn, 'ShNQ 2.07.01-23, 210-band, 9-jadval · ≥ ' + fm(wneed), fm(wv) + ' m', wneed, wv >= wneed - 0.005 ? 'ok' : 'bad');
      if (inRoad(x)) r('Qatnov qismi ostida', 'ShNQ 2.07.01-23, 188/190-band: trotuar yoki ajratuvchi tasma ostiga', '—', 0, 'warn');
      else if (curbs.length) { var tc = nearest(x, curbs); if (ztype(x) !== 'park') r('Yoʻl cheti toshigacha', 'ShNQ 2.07.01-23, 8-jadval · ≥ ' + fm(c[6]), fm(tc) + ' m', c[6], tc >= c[6] - 0.005 ? 'ok' : 'warn'); }
      if (trams.length) { var tt = 99, inT = false; trams.forEach(function (z) { if (x > z[0] && x < z[1]) inT = true; tt = Math.min(tt, Math.abs(x - z[0]), Math.abs(x - z[1])); }); r('Tramvay izigacha', 'ShNQ 2.07.01-23, 8-jadval · ≥ 2,8', inT ? 'ichida' : fm(tt) + ' m', 2.8, (!inT && tt >= 2.8 - 0.005) ? 'ok' : 'bad'); }
      if ((u.k === 'G' || u.k === 'E' || u.k === 'T') && x < 0 || (u.k === 'G' || u.k === 'E' || u.k === 'T') && x > rl) r('Qizil chiziq va qurilish chizigʻi orasida', 'ShNQ 2.07.01-23, 188-band — ruxsat etiladi', '✓', 0, 'ok');
      return { rows: rows, worst: worst };
    }
    /* oxirgi joylashning eng yaxshi bahosi: ≥ 400 — meʼyor buzilmasdan joy yoʻq (tor kesim) */
    var lastPlace = 0;
    function place(k, others, side) {
      var c = UCd(k), best = 0, bs = 1e9;
      for (var x = -SB + 0.1; x <= rl + SB - 0.1; x += 0.1) {
        var t = ztype(x), pi = c[7].indexOf(t), ev = evalU({ k: k, x: x }, others), sc = pi < 0 ? 80 : pi * 6;
        ev.rows.forEach(function (rw) { if (rw.c === DC.bad) sc += 400; else if (rw.c === DC.warn) sc += 40; });
        if (side && (x - rl / 2) * side < 0) sc += 200;
        var dr = Math.min(x + SB, rl + SB - x); sc += Math.abs(dr - (c[9] * 1.1 + 0.4)) * 2;
        if (sc < bs) { bs = sc; best = x; }
      }
      lastPlace = bs;
      return Math.round(best * 10) / 10;
    }
    var U = s.U;
    // ===== chizma =====
    var draw = [], txt = [], zhit = [], HND = [], UH = [], BB = [];
    /* DXF eksporti uchun: LYR — CAD qatlami (UI va DIMROW — eksportga kirmaydi), BK — takrorlanuvchi siluet nusxasi (blok) */
    var LYR = '', BK = '', BKN = 0;
    var ZLY = { front: 'FRONTAGE', piy: 'FOOTWAY', yash: 'GREEN', mebel: 'FURNITURE', park: 'PARKING', qat: 'LANE', med: 'MEDIAN', ariq: 'WATER', kanal: 'CANAL', velo: 'CYCLE', tram: 'TRAM', bus: 'BUS' };
    function CADSIL(ly, nm, fn) { var o = LYR, ob = BK; LYR = ly; BK = nm + '#' + (++BKN); fn(); LYR = o; BK = ob; }
    function add(d, f, st, w, o, da, tr) { draw.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '', t: tr || '', ly: LYR, bk: BK }); }
    function tx(x, y, t, fs, c, fw, ff, an) { txt.push({ x: x.toFixed(1), y: y.toFixed(1), t: t, fs: fs || 11, c: c || '#141414', fw: fw || 400, ff: ff || 'Archivo, sans-serif', a: an || 'middle', ly: LYR, bk: BK }); }
    var line = s.gfx === 1, INK = '#2f2e2b', LIGHT = '#8f8a80';
    var L = { line: line, ink: INK, add: add };
    /* VW — chizma eni (viewBox), karta nisbatiga qarab qobiq beradi: kesim kartani toʻldiradi. px — balandlikka sigʻadigan eng katta qiymat bilan cheklanadi (daraxt, bino) */
    var VW = Math.max(784, s.vw || 784), HW = VW - 8;   // barcha koʻrinishlar kartani toʻldiradi (panellar yashirilsa — kengroq)
    var span = rl + 2 * SB + 6, px = Math.min((VW - 44) / span, Math.max(740 / span, 22)), X0 = Math.max(22, (VW - span * px) / 2) + 3 * px + SB * px;
    function X(m) { return X0 + m * px; }
    if (s.view === 0) {
      LYR = 'KS_GROUND'; var G = 372, DEP = 4.2, GB = G + 6 + DEP * px;
      add('M8 ' + G + 'H' + HW + 'V' + GB + 'H8Z', line ? '#ffffff' : '#f6f2ea', null, 0); add('M8 ' + GB + 'H' + HW, null, INK, 0.8); for (var hx = 8; hx < HW; hx += 7) add('M' + hx + ' ' + (GB + 6) + 'L' + (hx + 6) + ' ' + GB, null, LIGHT, 0.6);
      [[8, X(-SB), s.eL], [X(rl + SB), HW, s.eR]].forEach(function (bx) { if (bx[2] && bx[2] !== 'bino') return; add('M' + bx[0] + ' ' + G + 'H' + bx[1] + 'V' + (G + 3.2 * px) + 'H' + bx[0] + 'Z', line ? '#fff' : '#ebe7df', INK, 0.8); for (var hh = bx[0] - 3.2 * px; hh < bx[1]; hh += 6) { var xa = Math.max(bx[0], hh), xb = Math.min(bx[1], hh + 3.2 * px); if (xb > xa) add('M' + xa.toFixed(1) + ' ' + (G + 3.2 * px - (xa - hh)).toFixed(1) + 'L' + xb.toFixed(1) + ' ' + (G + 3.2 * px - (xb - hh)).toFixed(1), null, LIGHT, 0.5); } });
      /* binolar — kesimdagi oddiy hajm: kontur, qavat yopmalari, qavat raqamlari va sath belgisi; chuqurligi ≤ 14 m,
         qolgani uzilish chizigʻi bilan. Baland bino sigʻmasa — gorizontal uzilish. Ichida «N qavat · ≈ H m» va − / + */
      var BB = [], HCAP = G - 34;
      /* chet (qizil chiziq + chekinishdan tashqari): bino oʻrniga bogʻ, ochiq maydon, qiyalik yoki suv (daryo, kanal) */
      function edgeDraw(sd, et) {
        var fx = sd < 0 ? X(-SB) : X(rl + SB), ox = sd < 0 ? 8 : HW, a = Math.min(fx, ox), b = Math.max(fx, ox), w = b - a, n = Math.max(1, Math.floor(w / (7 * px))), o = LYR, q;
        LYR = 'KS_EDGE';
        if (et === 'bog') {
          var gy = G - 0.12 * px; add('M' + a + ' ' + gy + 'H' + b + 'V' + G + 'H' + a + 'Z', line ? '#ffffff' : '#cfe0bf', INK, 0.8);
          for (q = 0; q < n; q++) (function (q) { var cx = a + w * (q + 0.5) / n; CADSIL('KS_TREES', 'uaT', function () { AS.uaT(L, q % 2 ? 'T_bulut2' : 'T_bulut', cx, gy, q % 2 ? 10 : 11, px, q + 3, sd > 0); }); })(q);
          tx((a + b) / 2, GB - 8, tr('Bogʻ'), 8.5, LIGHT, 600, 'Archivo, sans-serif');
        } else if (et === 'ochiq') {
          var py = G - 0.1 * px; add('M' + a + ' ' + py + 'H' + b + 'V' + G + 'H' + a + 'Z', line ? '#ffffff' : '#efeae1', INK, 0.8);
          for (var j = a + px; j < b; j += px) add('M' + j.toFixed(1) + ' ' + py + 'V' + G, null, LIGHT, 0.4);
          var PO = ['erkak_yurgan', 'ayol_sumka', 'ona_bola', 'telefon'];
          for (q = 0; q < Math.min(n, 3); q++) (function (q) { var cx = a + w * (q + 0.5) / Math.min(n, 3); CADSIL('KS_PEOPLE', 'ua', function () { AS.ua(L, PO[q % PO.length], cx, py, px, q % 2 === 1); }); })(q);
          tx((a + b) / 2, GB - 8, tr('Ochiq maydon'), 8.5, LIGHT, 600, 'Archivo, sans-serif');
        } else if (et === 'qiyalik') {
          var hh = Math.min(4, w / px / 3) * px;
          add('M' + fx + ' ' + G + 'L' + ox + ' ' + (G - hh) + 'L' + ox + ' ' + G + 'Z', line ? '#ffffff' : '#e6dfcd', INK, 0.8);
          add('M' + fx + ' ' + G + 'L' + ox + ' ' + (G - hh), null, '#7fa06b', 2);
          tx(fx + sd * Math.min(w * 0.5, 4 * px), G - Math.min(w * 0.5, 4 * px) * hh / (w || 1) - 6, '1:3', 8, INK, 500, 'IBM Plex Mono, monospace');
          tx((a + b) / 2, GB - 8, tr('Qiyalik'), 8.5, LIGHT, 600, 'Archivo, sans-serif');
        } else if (et === 'suv') {
          var bk = Math.min(w * 0.35, 2.5 * px), bed = G + 2.2 * px, wl = G + 0.6 * px, x1 = fx + sd * bk, xw = fx + sd * bk * (0.6 / 2.2);
          add('M' + fx + ' ' + G + 'L' + x1 + ' ' + bed + 'L' + ox + ' ' + bed + 'L' + ox + ' ' + G + 'Z', '#ffffff', null, 0);
          add('M' + xw + ' ' + wl + 'L' + x1 + ' ' + bed + 'L' + ox + ' ' + bed + 'L' + ox + ' ' + wl + 'Z', line ? '#ffffff' : '#bcd6e6', null, 0);
          add('M' + fx + ' ' + G + 'L' + x1 + ' ' + bed + 'L' + ox + ' ' + bed, null, INK, 1.2);
          add('M' + xw + ' ' + wl + 'L' + ox + ' ' + wl, null, '#4f86a8', 1);
          for (var wv2 = Math.min(xw, ox) + 6; wv2 < Math.max(xw, ox) - 10; wv2 += 18) add('M' + wv2 + ' ' + (wl + 5) + 'q3 -2 6 0t6 0', null, '#4f86a8', 0.6);
          tx((Math.min(xw, ox) + Math.max(xw, ox)) / 2, wl - 4, tr('Daryo / kanal'), 8.5, '#4f86a8', 600, 'Archivo, sans-serif');
        }
        LYR = o;
      }
      LYR = 'KS_BUILDINGS'; [[-1, s.bL, s.eL], [1, s.bR, s.eR]].forEach(function (b) {
        if (b[2] && b[2] !== 'bino') { edgeDraw(b[0], b[2]); return; }
        var nF = b[1], hM = 4.2 + (nF - 1) * 3.2, full = hM * px, cut = full > HCAP, h = cut ? HCAP : full;
        var fx = b[0] < 0 ? X(-SB) : X(rl + SB), room = b[0] < 0 ? fx - 8 : HW - fx, wB = Math.min(room, 14 * px), deep = room > wB + 2;
        var xa = b[0] < 0 ? fx - wB : fx, xb = b[0] < 0 ? fx : fx + wB, xo = b[0] < 0 ? xa : xb, ytop = G - h;
        function fy(k) { return G - (k === 0 ? 0 : (4.2 + (k - 1) * 3.2) * px); }
        var BRK = cut ? ytop + Math.min(40, h * 0.25) : -1;
        add('M' + xa + ' ' + ytop + 'H' + xb + 'V' + G + 'H' + xa + 'Z', line ? '#fff' : '#f4f3f0', null, 0);
        /* yopmalar */
        for (var f = 1; f < nF; f++) { var yy = fy(f); if (yy <= ytop + 1) break; if (cut && yy < BRK + 14 && yy > BRK - 14) continue; add('M' + xa + ' ' + yy + 'H' + xb, null, '#cfcbc3', f === 1 ? 1 : 0.7); }
        /* qavat raqamlari — fasad yonida, qavat oʻrtasida */
        var fh = 3.2 * px, nx = b[0] < 0 ? fx - 5 : fx + 5, an = b[0] < 0 ? 'end' : 'start';
        if (fh >= 9) for (var f3 = 1; f3 <= nF; f3++) { var y0 = fy(f3 - 1), y1 = f3 === nF ? G - full : fy(f3), ym = (y0 + y1) / 2 + 3; if (y1 < ytop - 1 || (cut && ym > BRK - 10 && ym < BRK + 16)) continue; tx(nx, ym, String(f3), 7.5, LIGHT, 500, 'IBM Plex Mono, monospace', an); }
        if (cut) tx(nx, ytop + 10, String(nF), 7.5, LIGHT, 500, 'IBM Plex Mono, monospace', an);
        /* kontur: fasad va tom — qalin; ichki tomon — uzilish yoki chegara */
        add('M' + fx + ' ' + G + 'V' + ytop + 'H' + xo, null, INK, 1.5);
        if (deep) { var zx2 = 'M' + xo + ' ' + ytop, m = Math.max(3, Math.round(h / 18)); for (var q = 1; q <= m; q++) zx2 += 'L' + (xo + (q % 2 ? 4 : -4)) + ' ' + (ytop + h * (q - 0.5) / m) + 'L' + xo + ' ' + (ytop + h * q / m); add(zx2, null, '#a19e97', 0.8); }
        else add('M' + xo + ' ' + ytop + 'V' + G, null, INK, 0.8);
        if (cut) { var zz = 'M' + xa + ' ' + BRK, n = Math.max(4, Math.round(wB / 12)); for (var q2 = 1; q2 <= n; q2++) zz += 'L' + (xa + wB * (q2 - 0.5) / n) + ' ' + (BRK + (q2 % 2 ? -4 : 4)) + 'L' + (xa + wB * q2 / n) + ' ' + BRK; add(zz + 'V' + (BRK - 9) + 'H' + xa + 'Z', line ? '#fff' : '#f4f3f0', null, 0); add(zz, null, '#8f8a80', 0.8); }
        /* sath belgisi: tom ustida, fasad tomonda */
        var tkx = b[0] < 0 ? fx + 2 : fx - 2; add('M' + tkx + ' ' + ytop + 'h' + (b[0] < 0 ? 10 : -10) + 'M' + (tkx + (b[0] < 0 ? 4 : -4)) + ' ' + (ytop - 4) + 'l' + (b[0] < 0 ? -3 : 3) + ' 4l' + (b[0] < 0 ? 3 : -3) + ' 0z', null, INK, 0.8);
        tx(b[0] < 0 ? fx + 14 : fx - 14, ytop + 3, '+' + fm(Math.round(hM * 10) / 10), 7.5, INK, 500, 'IBM Plex Mono, monospace', b[0] < 0 ? 'start' : 'end');
        /* yozuv va − / + — binoning ichki (koʻchadan uzoq) yuqori burchagida */
        var cw2 = 62, lx = b[0] < 0 ? Math.max(xa + 6, fx - 22 - cw2) : Math.min(xb - 6 - cw2, fx + 22), ly = (cut ? BRK + 12 : ytop + 8);
        if (wB < cw2 + 30) lx = (xa + xb) / 2 - cw2 / 2;
        { var _ly = LYR; LYR = 'UI'; add(Rr(lx, ly, cw2, 46, 6), '#ffffff', '#d6d3cc', 0.6, 0.95); LYR = _ly; }
        { var _ly = LYR; LYR = 'UI'; tx(lx + cw2 / 2, ly + 14, nF + ' qavat', 10.5, '#141414', 700, 'Archivo, sans-serif', 'middle'); LYR = _ly; }
        var side = b[0] < 0 ? 'bL' : 'bR';
        BB.push({ x: lx + 6, y: ly + 22, t: '−', on: function () { var o = {}; o[side] = Math.max(1, self.state[side] - 1); self.setState(o); } });
        BB.push({ x: lx + cw2 - 28, y: ly + 22, t: '+', on: function () { var o = {}; o[side] = Math.min(30, self.state[side] + 1); self.setState(o); } });
      });
      LYR = 'KS_GROUND'; add('M' + X(-SB) + ' ' + G + 'H' + X(0) + 'V' + (G + 3) + 'H' + X(-SB) + 'Z', line ? '#fff' : '#e9e6df', INK, 0.8); add('M' + X(rl) + ' ' + G + 'H' + X(rl + SB) + 'V' + (G + 3) + 'H' + X(rl) + 'Z', line ? '#fff' : '#e9e6df', INK, 0.8);
      var pIdx = (s.tplName.length * 3) % 7, PPL = ['ayol_yurgan', 'erkak_yurgan', 'ona_bola', 'telefon', 'ayol_koylak', 'ryukzak', 'erkak_turgan', 'aravacha', 'ayol_sumka', 'qariya', 'yuguruvchi', 'erkak_palto', 'ayol_palto', 'qol_kotargan', 'erkak_3'];
      els.forEach(function (e, i) {
        var t = T[e[0]], x0 = X(zx[i][0]), x1 = X(zx[i][1]), w = x1 - x0, cx = (x0 + x1) / 2, top = G - t.h * px, f = e[2] || {}, on = s.sel === i && s.selU < 0, left = zx[i][0] < rl / 2, dir = left ? 1 : -1;
        LYR = 'KS_ZONE_' + (ZLY[e[0]] || 'OTHER'); BK = ''; if (e[0] === 'kanal') { /* kanal: qirgʻoq turi, suv sathi, qirgʻoq polosasi (VM 981) */ var KB = kBank(f, e[1]), kpx = function (u, v, sd) { return [sd < 0 ? x0 + u * px : x1 - u * px, G + v * px]; }, Lp = KB.prof.map(function (q) { return kpx(q[0], q[1], -1); }), Rp = KB.prof.map(function (q) { return kpx(q[0], q[1], 1); }).reverse(), PS = function (a) { return 'M' + a.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }, voidP = Lp.concat(Rp), wyy = G + KB.wl * px;
          add(PS(voidP) + 'Z', '#ffffff', null, 0);
          var wat = clipBelow(voidP, wyy); if (wat.length > 2) add(PS(wat) + 'Z', line ? '#ffffff' : '#bcd6e6', null, 0);
          var uL = kpx(KB.ur, KB.wl, -1)[0], uR = kpx(KB.ur, KB.wl, 1)[0]; add('M' + uL.toFixed(1) + ' ' + wyy + 'H' + uR.toFixed(1), null, '#4f86a8', 1.1);
          for (var rq = uL + 0.6 * px; rq < uR - 0.9 * px; rq += 1.6 * px) add('M' + rq.toFixed(1) + ' ' + (wyy + 0.35 * px).toFixed(1) + 'q' + (0.2 * px).toFixed(1) + ' ' + (-0.12 * px).toFixed(1) + ' ' + (0.4 * px).toFixed(1) + ' 0', null, '#4f86a8', 0.6);
          if (KB.t === 'devor') { var wt = Math.min(0.35 * px, w * 0.08); [[x0, x0 + wt], [x1 - wt, x1]].forEach(function (r2) { add('M' + r2[0] + ' ' + (G - 0.25 * px) + 'H' + r2[1] + 'V' + (G + KB.dep * px + 0.3 * px) + 'H' + r2[0] + 'Z', line ? '#ffffff' : KCOL.devor, INK, 0.8); }); add('M' + x0 + ' ' + (G + KB.dep * px) + 'H' + x1 + 'V' + (G + KB.dep * px + 0.3 * px) + 'H' + x0 + 'Z', line ? '#ffffff' : KCOL.devor, INK, 0.8); }
          else { [Lp, Rp.slice().reverse()].forEach(function (pp2) { var sk = pp2.map(function (q) { return [q[0], q[1] + 0.3 * px]; }).reverse(); add(PS(pp2.concat(sk)) + 'Z', line ? '#ffffff' : KCOL[KB.t], null, 0); add(PS(pp2), null, INK, 1.1); });
            add('M' + Lp[Lp.length - 1][0].toFixed(1) + ' ' + Lp[Lp.length - 1][1].toFixed(1) + 'H' + Rp[0][0].toFixed(1), null, INK, 1.1);
            [-1, 1].forEach(function (sd) { var B = function (u, v) { return kpx(u, v, sd); };
              if (KB.t === 'yashil') [0.22, 0.5].forEach(function (fr) { var q = B(KB.bh * fr, KB.dep * fr); if (fr * KB.dep < KB.wl) add(El(q[0], q[1] - 0.35 * px, 0.45 * px, 0.32 * px), line ? '#ffffff' : '#a9c897', line ? INK : '#7d9c69', 0.5); });
              if (KB.t === 'tosh') for (var fr2 = 0.12; fr2 < 0.95; fr2 += 0.14) { var q2 = B(KB.bh * fr2, KB.dep * fr2); add(El(q2[0], q2[1] - 0.12 * px, 0.2 * px, 0.13 * px), line ? '#ffffff' : '#b5afa5', INK, 0.4); }
              if (KB.t === 'botqoq') for (var fr3 = 0.42; fr3 < 0.78; fr3 += 0.09) { var q3 = B(KB.bh * fr3, KB.wl + 0.15); add('M' + q3[0].toFixed(1) + ' ' + q3[1].toFixed(1) + 'l' + (sd * -0.08 * px).toFixed(1) + ' ' + (-0.9 * px).toFixed(1) + 'M' + q3[0].toFixed(1) + ' ' + q3[1].toFixed(1) + 'l' + (sd * 0.12 * px).toFixed(1) + ' ' + (-0.7 * px).toFixed(1), null, line ? INK : '#6f8f55', 0.8); }
              if (KB.t === 'zina' && sd < 0 && KB.prof.length > 4 && L && AS.ua) { var st2 = KB.prof[2]; var q4 = B(st2[0] + (KB.prof[3][0] - st2[0]) * 0.5, st2[1]); AS.ua(L, 'otirgan_blok', q4[0], q4[1], px, false); } }); }
          if (f.panjara !== false && KB.t !== 'zina') [x0 + 0.15 * px, x1 - 0.15 * px].forEach(function (pxx) { add('M' + pxx + ' ' + (G - 0.25 * px) + 'V' + (G - 1.1 * px) + 'M' + (pxx - 0.12 * px) + ' ' + (G - 1.1 * px) + 'H' + (pxx + 0.12 * px), null, INK, 1.1); });
          var KN = kNorm(f); if (f.bufer !== false && KN.pp) [-1, 1].forEach(function (sd) { var ux = kpx(KB.ur, 0, sd)[0], ox2 = ux + sd * KN.pp[0] * px, a2 = Math.min(ux, ox2), b2 = Math.max(ux, ox2); add('M' + a2.toFixed(1) + ' ' + (G - 0.14 * px).toFixed(1) + 'H' + b2.toFixed(1) + 'V' + (G + 0.1 * px).toFixed(1) + 'H' + a2.toFixed(1) + 'Z', '#e0a43c', '#c98a12', 0.7, 0.35, '3 2'); tx((a2 + b2) / 2, G + 0.85 * px, '≥ ' + String(KN.pp[0]).replace('.', ',') + ' m', 7.5, '#a8730a', 600, 'IBM Plex Mono, monospace'); });
        } else if (e[0] === 'ariq') { /* ariq / lotok: trapetsiya kanal (chuqurlik ~0,7 m), suv; yopiq — panjara; koʻprikcha */ var ad = Math.min(0.7, e[1] * 0.6) * px, ai = Math.min(w * 0.18, 0.25 * px); add('M' + x0 + ' ' + G + 'L' + (x0 + ai) + ' ' + (G + ad) + 'H' + (x1 - ai) + 'L' + x1 + ' ' + G + 'Z', '#ffffff', null, 0); add('M' + (x0 + ai * 0.5) + ' ' + (G + ad * 0.5) + 'L' + (x0 + ai) + ' ' + (G + ad) + 'H' + (x1 - ai) + 'L' + (x1 - ai * 0.5) + ' ' + (G + ad * 0.5) + 'Z', line ? '#ffffff' : '#bcd6e6', null, 0); add('M' + x0 + ' ' + G + 'L' + (x0 + ai) + ' ' + (G + ad) + 'H' + (x1 - ai) + 'L' + x1 + ' ' + G, null, INK, 1.2); add('M' + (x0 + ai * 0.5) + ' ' + (G + ad * 0.5) + 'H' + (x1 - ai * 0.5), null, '#4f86a8', 0.8); if (f.yopiq) add('M' + x0 + ' ' + (G - 0.6) + 'H' + x1, null, INK, 1.6, 1, '2 1.5'); if (f.koprik) add('M' + (x0 - 0.2 * px) + ' ' + (G - 0.15 * px) + 'H' + (x1 + 0.2 * px) + 'V' + G + 'H' + (x0 - 0.2 * px) + 'Z', line ? '#ffffff' : '#d8d2c6', INK, 0.8); } else add('M' + x0 + ' ' + top + 'H' + x1 + 'V' + (G + 6) + 'H' + x0 + 'Z', line ? '#ffffff' : t.c, INK, 0.8);
        if (e[0] === 'tram') { add('M' + (x0 + w * 0.25) + ' ' + (top - 1.5) + 'h3M' + (x1 - w * 0.25 - 3) + ' ' + (top - 1.5) + 'h3', null, INK, 2); }
        zhit.push({ x: x0.toFixed(1), y: 50, w: w.toFixed(1), h: G - 40, pick: (function (ii) { return function () { self.setState({ sel: ii, selU: -1 }); }; })(i) });
        { var _ly = LYR; LYR = 'UI'; if (on) add('M' + x0 + ' ' + (G + 10) + 'H' + x1, null, '#4c5bd4', 3); LYR = _ly; }
        var gy = top;
        if (e[0] === 'piy' && f.odam !== false) { var n = Math.max(1, Math.min(4, Math.floor(e[1] / 1.25))); for (var a = 0; a < n; a++) { CADSIL('KS_PEOPLE', 'ua', function () { AS.ua(L, PPL[(pIdx++) % PPL.length], x0 + w * (a + 0.5) / n, gy, px, (a + i) % 2 === 1); }); } }
        if (e[0] === 'front') { if (f.kafe) CADSIL('KS_FURNITURE', 'soyabon', function () { AS.soyabon(L, cx, gy, px); }); else if (f.orin) CADSIL('KS_PEOPLE', 'ua', function () { AS.ua(L, 'otirgan_blok', cx, gy, px, !left); }); if (f.gul) CADSIL('KS_TREES', 'uaT', function () { AS.uaT(L, 'B_gul', cx, gy, 0.8, px, 2); }); }
        LYR = 'KS_FURNITURE'; if (e[0] === 'mebel') { if (f.fonar) CADSIL('KS_FURNITURE', 'fonar', function () { AS.fonar(L, cx, gy, px, dir, 9); }); if (f.belgi) { add('M' + (cx + dir * 4) + ' ' + gy + 'V' + (gy - 2.6 * px), null, INK, 1); add(El(cx + dir * 4, gy - 2.9 * px, 0.32 * px, 0.32 * px), line ? '#fff' : '#ffffff', INK, 1); } }
        if (e[0] === 'yash' || e[0] === 'med') { if (f.daraxt) { var tn = e[1] >= 2.9 ? (i % 2 ? 'T_bulut2' : 'T_bulut') : (e[0] === 'med' ? (e[1] >= 2 ? 'T_terak' : 'T_sarv') : 'T_tuxum'); CADSIL('KS_TREES', 'uaT', function () { AS.uaT(L, tn, cx, gy, { T_bulut: 11, T_bulut2: 10, T_terak: 13, T_sarv: 11, T_tuxum: 9 }[tn], px, i, !left); }); } if (f.buta) CADSIL('KS_TREES', 'uaT', function () { AS.uaT(L, i % 2 ? 'B_past' : 'B_yumaloq', x0 + w * (f.daraxt ? 0.78 : 0.5), gy, 0.9, px, i + 1); }); if (f.orin) { CADSIL('KS_PEOPLE', 'ua', function () { AS.ua(L, 'otirgan_blok', x0 + w * 0.22, gy, px, !left); }); } if (f.fonar && !f.daraxt) CADSIL('KS_FURNITURE', 'fonar', function () { AS.fonar(L, cx, gy, px, 1, 9); }); if (f.fonar && f.daraxt) CADSIL('KS_FURNITURE', 'piyfonar', function () { AS.piyfonar(L, x0 + w * 0.15, gy, px); }); }
        if (e[0] === 'velo' && f.velochi !== false) CADSIL('KS_PEOPLE', 'velochi', function () { AS.velochi(L, cx, gy, px, !left); });
        if (e[0] === 'qat' && f.mashina !== false) CADSIL('KS_CARS', 'mashina', function () { AS.mashina(L, cx, gy, px); });
        if (e[0] === 'park') { if (f.mashina) CADSIL('KS_CARS', 'mashina', function () { AS.mashina(L, cx, gy, px, '#ffffff'); }); else if (f.bekat) CADSIL('KS_FURNITURE', 'bekat', function () { AS.bekat(L, cx, gy, px, dir); }); }
        if (e[0] === 'bus') { if (f.avtobus !== false) CADSIL('KS_CARS', 'avtobus', function () { AS.avtobus(L, cx, gy, px); }); }
        if (e[0] === 'tram') { if (f.tramvay !== false) CADSIL('KS_CARS', 'tramvay', function () { AS.tramvay(L, cx, gy, px); }); }
      });
      // kontakt tarmogʻi simi
      LYR = 'KS_ZONE_TRAM'; BK = ''; if (els.some(function (e) { return e[0] === 'tram'; })) { var tz = trams; add('M' + X(tz[0][0]) + ' ' + (G - 5.9 * px) + 'H' + X(tz[tz.length - 1][1]), null, INK, 0.8); }
      LYR = 'KS_RED_LINE'; add('M' + X(0) + ' 66V' + (GB + 6) + 'M' + X(rl) + ' 66V' + (GB + 6), null, '#c0392b', 1.2, 1, '6 4');
      tx(X(0) + 4, 62, 'QCh', 9, '#c0392b', 700, 'IBM Plex Mono, monospace', 'start'); tx(X(rl) - 4, 62, 'QCh', 9, '#c0392b', 700, 'IBM Plex Mono, monospace', 'end');
      LYR = 'KS_TEXT'; tx(X(0) + 8, 24, 'Kesim A–A', 12, '#141414', 700, 'Archivo, sans-serif', 'start'); tx(X(0) + 8, 37, s.tplName + ' · ' + SKP[s.sk][0] + ' · ' + s.uk, 9.5, LIGHT, 400, 'Archivo, sans-serif', 'start');
      // chuqurlik oʻlchagichi
      LYR = 'KS_DIM'; var rx = X(-SB) - 10; add('M' + rx + ' ' + (G + 6) + 'V' + (G + 6 + 4 * px), null, INK, 0.8);
      for (var dm = 0; dm <= 4; dm++) { var yy = G + 6 + dm * px; add('M' + (rx - 3) + ' ' + yy + 'H' + rx, null, INK, 0.8); if (dm) tx(rx - 5, yy + 3, '−' + dm, 8, INK, 500, 'IBM Plex Mono, monospace', 'end'); }
      // tarmoqlar
      var ULB = [];
      if (s.showU) U.forEach(function (u, j) { var c = UCd(u.k), cx = X(u.x), cy = G + 6 + u.d * px, r = Math.max(2.6, c[8] * px / 2), on = s.selU === j, ev = evalU(u, U.filter(function (o, q) { return q !== j; })), sc = ev.worst === 'bad' ? '#b23a2e' : c[2];
        LYR = 'KS_UTILITIES_' + String(ulbl(u.k)).replace(/[^A-Za-z0-9]/g, ''); add('M' + cx + ' ' + (G + 6) + 'V' + (cy - r), null, c[2], 0.6, 0.7, '1.5 2.5');
        if (u.k === 'UT' || u.k === 'DH' || u.k === 'DC') add(Rr(cx - r, cy - r * 0.7, 2 * r, 1.4 * r, 1), line ? '#fff' : '#ffffff', c[2], on ? 2.4 : 1.3);
        else add(El(cx, cy, r, r), '#ffffff', c[2], on ? 2.4 : 1.3);
        add(El(cx, cy, 1.1, 1.1), c[2], null, 0);
        { var _ly = LYR; LYR = 'UI'; if (ev.worst === 'bad') add(El(cx, cy, r + 4, r + 4), null, '#b23a2e', 1, 0.8, '2 2'); LYR = _ly; }
        var ly0 = cy; for (var tr2 = 0; tr2 < 6; tr2++) { var hit2 = ULB.some(function (b) { return Math.abs(b[0] - (cx + r + 3)) < 26 && Math.abs(b[1] - ly0) < 17; }); if (!hit2) break; ly0 += 17; } ULB.push([cx + r + 3, ly0]);
        if (ly0 !== cy) add('M' + (cx + r) + ' ' + cy + 'L' + (cx + r + 2) + ' ' + (ly0 - 4), null, c[2], 0.5);
        tx(cx + r + 3, ly0 - 1, ulbl(u.k), 8, sc, 700, 'IBM Plex Mono, monospace', 'start'); tx(cx + r + 3, ly0 + 8, '−' + fm(u.d), 7.5, LIGHT, 400, 'IBM Plex Mono, monospace', 'start');
        { var _ly = LYR; LYR = 'UI'; if (on) { var fb = ufbOf(u, ev); tx(cx + r + 3, cy + 18, fb.s, 8, fb.c, 600, 'Archivo, sans-serif', 'start'); } LYR = _ly; }
        UH.push({ x: cx.toFixed(1), y: cy.toFixed(1), r: (r + 5).toFixed(1), down: udown(j, true) }); });
      // zona kodlari
      var CODE = { front: 'B3', piy: 'P', mebel: 'B1', yash: 'B2', velo: 'V', park: 'AT', qat: 'H', bus: 'JT', tram: 'TR', med: 'AJ', ariq: 'AR', kanal: 'KN' };
      /* zona kodlari tilga qarab (B1–B3 — Dizayn-kod belgisi, oʻzgarmaydi) */
      var CODEL = { en: { piy: 'P', velo: 'CY', park: 'PK', qat: 'TL', bus: 'BL', tram: 'TR', med: 'MD', ariq: 'DT', kanal: 'CN' }, ru: { piy: 'П', velo: 'ВД', park: 'ПС', qat: 'ПД', bus: 'ОТ', tram: 'ТР', med: 'РП', ariq: 'АР', kanal: 'КН' } }[({ uk: 'ru', kk: 'ru', es: 'en', pt: 'en', fr: 'en', az: 'en', tr: 'en' })[getLang()] || getLang()]; if (CODEL) CODE = Object.assign({}, CODE, CODEL);
      LYR = 'KS_DIM'; var D1 = GB + 34, D2 = D1 + 30, D3 = D2 + 26, NW = 0;
      els.forEach(function (e, i) { var x0 = X(zx[i][0]), x1 = X(zx[i][1]), cx = (x0 + x1) / 2, on = s.sel === i && s.selU < 0, cw = Math.min(Math.max(14, CODE[e[0]].length * 6 + 8), Math.max(10, (X(zx[i][1]) - X(zx[i][0])) - 1));
        LYR = 'KS_TEXT'; add(Rr(cx - cw / 2, GB + 10, cw, 13, 6.5), line ? '#ffffff' : T[e[0]].c, INK, 0.6); tx(cx, GB + 19.5, CODE[e[0]], 7.5, INK, 700, 'IBM Plex Mono, monospace'); if (on) { LYR = 'UI'; add(Rr(cx - cw / 2, GB + 10, cw, 13, 6.5), '#4c5bd4', null, 0); tx(cx, GB + 19.5, CODE[e[0]], 7.5, '#ffffff', 700, 'IBM Plex Mono, monospace'); LYR = 'KS_TEXT'; }
        LYR = 'DIMROW'; add('M' + x0 + ' ' + (D1 - 4) + 'V' + (D1 + 4), null, INK, 0.8);
        var narrow = (x1 - x0) < fm(e[1]).length * 5.4 + 3; NW = narrow ? NW + 1 : 0; tx(cx, narrow && NW % 2 === 0 ? D1 + 11 : D1 - 3, fm(e[1]), 8.5, on ? '#4c5bd4' : '#141414', on ? 700 : 500, 'IBM Plex Mono, monospace'); });
      LYR = 'DIMROW'; add('M' + X(0) + ' ' + D1 + 'H' + X(rl) + 'M' + X(rl) + ' ' + (D1 - 4) + 'V' + (D1 + 4), null, INK, 0.8);
      { var _ly = LYR; LYR = 'UI'; for (var bi = 0; bi < els.length - 1; bi++) { var hx2 = X(zx[bi][1]); HND.push({ x: (hx2 - 5).toFixed(1), y: (GB + 6).toFixed(1), w: 10, h: (D1 + 8 - GB - 6).toFixed(1), down: zdown(bi) }); add('M' + (hx2 - 1.6) + ' ' + (D1 + 7) + 'v5M' + (hx2 + 1.6) + ' ' + (D1 + 7) + 'v5', null, '#a19e97', 1); }
        /* tashqi chetlar (qizil chiziqlar): chetdagi zona eni va qizil chiziqlar orasi birga oʻzgaradi */
        [[-1, X(0)], [1, X(rl)]].forEach(function (q) { HND.push({ x: (q[1] - 5).toFixed(1), y: (GB + 6).toFixed(1), w: 10, h: (D1 + 8 - GB - 6).toFixed(1), down: edown(q[0]) }); add('M' + (q[1] - 1.6) + ' ' + (D1 + 7) + 'v5M' + (q[1] + 1.6) + ' ' + (D1 + 7) + 'v5', null, '#c0392b', 1); }); LYR = _ly; }
      // guruhlar
      LYR = 'KS_DIM'; var GRP = { front: 'Trotuar', piy: 'Trotuar', mebel: 'Trotuar', yash: 'Trotuar', velo: 'Velo yoʻlak', park: 'Qatnov qismi', qat: 'Qatnov qismi', bus: 'Qatnov qismi', tram: 'Tramvay', med: 'Ajratuvchi', ariq: 'Ariq', kanal: 'Kanal' }, gr = [];
      els.forEach(function (e, i) { var gname = GRP[e[0]], lg = gr[gr.length - 1]; if (lg && lg.n === gname) lg.b = zx[i][1]; else gr.push({ n: gname, a: zx[i][0], b: zx[i][1] }); });
      gr.forEach(function (q) { var x0 = X(q.a), x1 = X(q.b); add('M' + x0 + ' ' + (D2 - 4) + 'V' + (D2 + 4) + 'M' + x1 + ' ' + (D2 - 4) + 'V' + (D2 + 4) + 'M' + x0 + ' ' + D2 + 'H' + x1, null, LIGHT, 0.8); var lab = (x1 - x0) > 46 ? tr(q.n) + ' ' + fm(q.b - q.a) : fm(q.b - q.a); tx((x0 + x1) / 2, D2 - 3, lab, 8, '#3a3936', 500, 'Archivo, sans-serif'); });
      LYR = 'DIMROW'; add('M' + X(0) + ' ' + D3 + 'H' + X(rl), null, INK, 1); add('M' + X(0) + ' ' + (D3 - 5) + 'V' + (D3 + 5) + 'M' + X(rl) + ' ' + (D3 - 5) + 'V' + (D3 + 5), null, INK, 1);
      tx((X(0) + X(rl)) / 2, D3 - 4, tr('Qizil chiziqlar orasi') + ' ' + fm(rl) + ' ' + tr('m'), 9.5, '#141414', 700, 'Archivo, sans-serif');
      // shartli belgilar
      LYR = 'KS_LEGEND'; var LY = D3 + 26; tx(16, LY, 'ZONALAR', 8, LIGHT, 700, 'Archivo, sans-serif', 'start');
      var seen = {}, lx = Math.max(70, 26 + tr('ZONALAR').length * 5.6); els.forEach(function (e) { if (seen[e[0]]) return; seen[e[0]] = 1; var nm = tr(T[e[0]].n.replace(/^B\d · /, '')), cw = CODE[e[0]].length * 6 + 8; if (lx + cw + nm.length * 4.6 + 20 > HW) return; add(Rr(lx, LY - 9, cw, 12, 6), line ? '#fff' : T[e[0]].c, INK, 0.6); tx(lx + cw / 2, LY - 0.5, CODE[e[0]], 7, INK, 700, 'IBM Plex Mono, monospace'); tx(lx + cw + 4, LY, nm, 8.5, '#3a3936', 400, 'Archivo, sans-serif', 'start'); lx += cw + nm.length * 4.6 + 18; });
      if (s.showU && U.length) { var UY = LY + 20; tx(16, UY, 'TARMOQLAR', 8, LIGHT, 700, 'Archivo, sans-serif', 'start'); var ux = Math.max(70, 26 + tr('TARMOQLAR').length * 5.6), useen = {}; U.forEach(function (u) { if (useen[u.k]) return; useen[u.k] = 1; var c = UCd(u.k), nm = tr(c[1]); if (ux + nm.length * 4.6 + 40 > HW) return; add(El(ux + 5, UY - 3, 4, 4), '#fff', c[2], 1.3); tx(ux + 13, UY, ulbl(u.k), 7.5, c[2], 700, 'IBM Plex Mono, monospace', 'start'); var kl = ulbl(u.k).length; tx(ux + 13 + kl * 5.5 + 3, UY, nm, 8.5, '#3a3936', 400, 'Archivo, sans-serif', 'start'); ux += nm.length * 4.6 + kl * 5.5 + 30; }); }
      // masshtab
      var SY = (s.showU && U.length ? LY + 50 : LY + 30); [0, 1, 2, 3, 4].forEach(function (q) { add('M' + (16 + q * 2 * px) + ' ' + SY + 'h' + (2 * px) + 'v4h' + (-2 * px) + 'Z', q % 2 ? '#ffffff' : INK, INK, 0.6); }); tx(16, SY - 4, '0', 7.5, INK, 400, 'IBM Plex Mono, monospace', 'start'); tx(16 + 10 * px, SY - 4, '10 m', 7.5, INK, 400, 'IBM Plex Mono, monospace', 'middle');
      tx(HW, SY + 4, 'Archemistry Lab · Koʻchasoz · ShNQ 2.07.01-23, 2.07.06-24, Toshkent Dizayn-kodi', 7.5, LIGHT, 400, 'Archivo, sans-serif', 'end');
      LYR = '';
    } else if (s.view === 1) {
      var Y0 = 56, Y1 = 600, LM = (Y1 - Y0) / px;
      function YM(m) { return Y0 + m * px; }
      function rotL(cx, cy, deg) { return { line: line, ink: INK, add: function (d, f, st, w, o, da, t2) { add(d, f, st, w, o, da, 'rotate(' + deg + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')' + (t2 ? ' ' + t2 : '')); } }; }
      /* chet rejada: bino — shtrixli blok; bogʻ, ochiq maydon, qiyalik, suv — oʻz belgisi bilan (kesimdagi edgeDraw bilan bir xil) */
      function edgePlan(sd, et) {
        var fx = sd < 0 ? X(-SB) : X(rl + SB), ox = sd < 0 ? 8 : HW, a = Math.min(fx, ox), b = Math.max(fx, ox), w = b - a, o = LYR, R = 'M' + a + ' ' + Y0 + 'H' + b + 'V' + Y1 + 'H' + a + 'Z', q, yy;
        LYR = 'KS_EDGE';
        if (et === 'bog') {
          add(R, line ? '#ffffff' : '#dbe8cc', INK, 1.1);
          var nc = Math.max(1, Math.floor(w / (6 * px))), rr = Math.min(2.2 * px, w / nc / 2.4);
          for (yy = Y0 + 3 * px; yy < Y1 - rr; yy += 6 * px) for (q = 0; q < nc; q++) add(El(a + w * (q + 0.5) / nc, yy + (q % 2 ? 3 * px : 0), rr, rr), line ? '#ffffff' : '#bcd5a6', INK, 0.6);
          tx((a + b) / 2, Y0 + 14, tr('Bogʻ'), 8.5, LIGHT, 600, 'Archivo, sans-serif');
        } else if (et === 'ochiq') {
          add(R, line ? '#ffffff' : '#efeae1', INK, 1.1);
          for (q = fx + sd * px; sd < 0 ? q > a : q < b; q += sd * px) add('M' + q.toFixed(1) + ' ' + Y0 + 'V' + Y1, null, LIGHT, 0.4);
          for (yy = Y0 + px; yy < Y1; yy += px) add('M' + a + ' ' + yy.toFixed(1) + 'H' + b, null, LIGHT, 0.4);
          tx((a + b) / 2, Y0 + 14, tr('Ochiq maydon'), 8.5, LIGHT, 600, 'Archivo, sans-serif');
        } else if (et === 'qiyalik') {
          add(R, line ? '#ffffff' : '#e6dfcd', INK, 1.1);
          add('M' + fx + ' ' + Y0 + 'V' + Y1, null, '#7fa06b', 2);
          var sl = Math.min(w, 12 * px); q = 0;
          for (yy = Y0 + 0.75 * px; yy < Y1; yy += 0.75 * px, q++) add('M' + fx + ' ' + yy.toFixed(1) + 'h' + (sd * sl * (q % 2 ? 0.45 : 0.9)).toFixed(1), null, INK, 0.6);
          tx((a + b) / 2, Y0 + 14, tr('Qiyalik') + ' 1:3', 8.5, LIGHT, 600, 'Archivo, sans-serif');
        } else if (et === 'suv') {
          var bk = Math.min(w * 0.35, 2.5 * px), xw = fx + sd * bk;
          add(R, line ? '#ffffff' : '#e6dfcd', INK, 1.1);
          add('M' + Math.min(xw, ox) + ' ' + Y0 + 'H' + Math.max(xw, ox) + 'V' + Y1 + 'H' + Math.min(xw, ox) + 'Z', line ? '#ffffff' : '#bcd6e6', null, 0);
          add('M' + xw + ' ' + Y0 + 'V' + Y1, null, '#4f86a8', 1.2);
          for (yy = Y0 + 20; yy < Y1 - 6; yy += 22) for (q = Math.min(xw, ox) + 6; q < Math.max(xw, ox) - 14; q += 22) add('M' + q.toFixed(1) + ' ' + yy + 'q3 -2 6 0t6 0', null, '#4f86a8', 0.6);
          tx((Math.min(xw, ox) + Math.max(xw, ox)) / 2, Y0 + 14, tr('Daryo / kanal'), 8.5, '#4f86a8', 600, 'Archivo, sans-serif');
        }
        LYR = o;
      }
      [[-1, 8, X(-SB), s.eL], [1, X(rl + SB), HW, s.eR]].forEach(function (ed) { if (ed[3] && ed[3] !== 'bino') { edgePlan(ed[0], ed[3]); return; }
      add('M' + ed[1] + ' ' + Y0 + 'H' + ed[2] + 'V' + Y1 + 'H' + ed[1] + 'Z', line ? '#fff' : '#efeee9', INK, 1.1);
      [[ed[1], ed[2]]].forEach(function (bx) { var W0 = bx[1] - bx[0]; for (var hy = Y0 - W0; hy < Y1; hy += 9) { var ya = Math.max(Y0, hy), xa = bx[0] + (ya - hy), yb = Math.min(Y1, hy + W0), xb = bx[0] + (yb - hy); if (xb > xa) add('M' + xa.toFixed(1) + ' ' + ya.toFixed(1) + 'L' + xb.toFixed(1) + ' ' + yb.toFixed(1), null, '#cfcac0', 0.5); } }); });
      add('M' + X(-SB) + ' ' + Y0 + 'H' + X(0) + 'V' + Y1 + 'H' + X(-SB) + 'Z', line ? '#fff' : '#ebe7df', null, 0); add('M' + X(rl) + ' ' + Y0 + 'H' + X(rl + SB) + 'V' + Y1 + 'H' + X(rl) + 'Z', line ? '#fff' : '#ebe7df', null, 0);
      var MK = line ? INK : '#ffffff';
      /* harakat yoʻnalishi: yoʻl belgisi strelkasi (oʻng tomonlama harakat — chap yarim pastga, oʻng yarim yuqoriga) */
      /* yoʻl strelkasi (26.10): yoʻnalish va manyovr — toʻgʻri, chapga, oʻngga, toʻgʻri+chapga, toʻgʻri+oʻngga; up — ekranda yuqoriga harakat */
      function laneArrow(cx, cy, k, up, man) { man = man || 'togri'; if (man === 'yoq') return; var d = up ? 1 : -1, sw = 0.14, hw = 0.42, hl = 1.0;
        function Q(u, v) { return (cx + d * u * k).toFixed(1) + ' ' + (cy - d * v * k).toFixed(1); }
        function poly2(pts) { add('M' + pts.map(function (q) { return Q(q[0], q[1]); }).join('L') + 'Z', MK, null, 0, line ? 1 : 0.95); }
        var str = man === 'togri' || man.indexOf('togri_') === 0, side = man === 'chap' || man === 'togri_chap' ? -1 : man === 'ong' || man === 'togri_ong' ? 1 : 0;
        poly2([[-sw, -1.8], [sw, -1.8], [sw, str ? 0.8 : -0.15 + sw], [-sw, str ? 0.8 : -0.15 + sw]]);
        if (str) poly2([[-hw, 0.8], [0, 0.8 + hl], [hw, 0.8]]);
        if (side) { var y0 = str ? -0.55 : -0.15; poly2([[0, y0 - sw], [side * 0.75, y0 - sw], [side * 0.75, y0 + sw], [0, y0 + sw]]); poly2([[side * 0.75, y0 - hw], [side * (0.75 + hl), y0], [side * 0.75, y0 + hw]]); } }
      function laneUp(f, left) { return f.yon === 'up' ? true : f.yon === 'down' ? false : !left; }
      /* velo yoʻlak belgisi: velosiped (yon koʻrinish, yoʻl boʻylab) va strelka */
      function bikeMark(cx, cy, k, up) { var d = up ? -1 : 1; function P(u, v) { return (cx + v * k).toFixed(1) + ' ' + (cy + d * u * k).toFixed(1); } var r = 0.36, sw2 = Math.max(1.1, 0.07 * k);
        [[-0.6, 0], [0.6, 0]].forEach(function (w) { var c0 = P(w[0], w[1]).split(' '); add(El(+c0[0], +c0[1], r * k, r * k), null, MK, sw2); });
        add('M' + P(-0.6, 0) + 'L' + P(-0.02, 0) + 'L' + P(-0.2, -0.5) + 'Z', null, MK, sw2); add('M' + P(-0.02, 0) + 'L' + P(0.4, -0.5) + 'L' + P(-0.2, -0.5), null, MK, sw2); add('M' + P(0.4, -0.5) + 'L' + P(0.6, 0) + 'M' + P(0.32, -0.64) + 'L' + P(0.5, -0.64) + 'M' + P(-0.3, -0.58) + 'L' + P(-0.1, -0.58), null, MK, sw2);
        var a0 = 1.3, a1 = 2.7; add('M' + P(a0, 0) + 'L' + P(a1, 0) + 'M' + P(a1 - 0.45, -0.3) + 'L' + P(a1, 0) + 'L' + P(a1 - 0.45, 0.3), null, MK, sw2 * 1.2); }
      var hasZ = els.some(function (q) { return q[0] === 'qat' && q[2] && q[2].zebra; }), ZB = 1.5;
      var PL = s.PL || [];
      function itemsOf(i) { return PL.filter(function (p) { return p.z === i; }); }
      /* daraxt tojlari keyingi zonalar foni ostida qolmasligi uchun — hamma zonadan keyin chiziladi */
      var _pD = AS.pDaraxt, TQ = []; AS.pDaraxt = function () { TQ.push(arguments); };
      els.forEach(function (e, i) {
        var t = T[e[0]], x0 = X(zx[i][0]), x1 = X(zx[i][1]), w = x1 - x0, cx = (x0 + x1) / 2, f = e[2] || {}, on = s.sel === i && s.selU < 0, left = zx[i][0] < rl / 2, dir = left ? 1 : -1, mine = itemsOf(i);
        add('M' + x0 + ' ' + Y0 + 'H' + x1 + 'V' + Y1 + 'H' + x0 + 'Z', line ? '#fff' : t.c, null, 0);
        var pr = els[i - 1], edge = !pr || ((t.h > 0.05) !== (T[pr[0]].h > 0.05));
        add('M' + x0 + ' ' + Y0 + 'V' + Y1, null, edge ? INK : '#bdb9b1', edge ? 1.2 : 0.5);
        zhit.push({ x: x0.toFixed(1), y: Y0, w: w.toFixed(1), h: Y1 - Y0, pick: (function (ii) { return function () { self.setState({ sel: ii, selU: -1 }); }; })(i) });
        if (e[0] === 'kanal') { var KB = kBank(f, e[1]), kb = KB.bh * px, KN = kNorm(f), ul = x0 + KB.ur * px, ur2 = x1 - KB.ur * px;
          add('M' + x0 + ' ' + Y0 + 'H' + (x0 + kb) + 'V' + Y1 + 'H' + x0 + 'Z' + 'M' + (x1 - kb) + ' ' + Y0 + 'H' + x1 + 'V' + Y1 + 'H' + (x1 - kb) + 'Z', line ? '#ffffff' : KCOL[KB.t], INK, 0.6);
          if (KB.t === 'zina') { var nz = Math.max(2, Math.round(KB.dep / 0.45)); for (var sz = 1; sz < nz; sz++) [x0 + kb * sz / nz, x1 - kb * sz / nz].forEach(function (xx) { add('M' + xx.toFixed(1) + ' ' + Y0 + 'V' + Y1, null, INK, 0.45); }); }
          if (KB.t === 'tosh') for (var ty2 = Y0 + 0.6 * px; ty2 < Y1; ty2 += 0.9 * px) [0.25, 0.6].forEach(function (fr) { [x0 + kb * fr, x1 - kb * fr].forEach(function (xx) { add(El(xx + ((ty2 * 7) % 3), ty2, 0.22 * px, 0.16 * px), line ? '#ffffff' : '#b5afa5', INK, 0.4); }); });
          if (KB.t === 'yashil') for (var ty3 = Y0 + 1 * px; ty3 < Y1; ty3 += 2.2 * px) [x0 + kb * 0.4, x1 - kb * 0.4].forEach(function (xx) { add(El(xx, ty3, Math.min(0.6 * px, kb * 0.3), Math.min(0.6 * px, kb * 0.3)), line ? '#ffffff' : '#a9c897', line ? INK : '#7d9c69', 0.5); });
          if (KB.t === 'botqoq') for (var ty4 = Y0 + 0.5 * px; ty4 < Y1; ty4 += 0.7 * px) [x0 + kb * 0.6, x1 - kb * 0.6].forEach(function (xx) { add('M' + xx.toFixed(1) + ' ' + ty4.toFixed(1) + 'l-2 -4M' + xx.toFixed(1) + ' ' + ty4.toFixed(1) + 'l2 -4', null, line ? INK : '#6f8f55', 0.7); });
          for (var wy2 = Y0 + 1.5 * px; wy2 < Y1 - 0.5 * px; wy2 += 2.6 * px) for (var wx2 = ul + 0.5 * px; wx2 < ur2 - 1.1 * px; wx2 += 1.8 * px) add('M' + wx2.toFixed(1) + ' ' + (wy2 + ((wx2 - x0) % 2)).toFixed(1) + 'q' + (0.3 * px).toFixed(1) + ' ' + (-0.25 * px).toFixed(1) + ' ' + (0.6 * px).toFixed(1) + ' 0t' + (0.6 * px).toFixed(1) + ' 0', null, '#4f86a8', 0.7);
          if (f.panjara !== false && KB.t !== 'zina') [x0 + 0.15 * px, x1 - 0.15 * px].forEach(function (rx) { add('M' + rx + ' ' + Y0 + 'V' + Y1, null, INK, 1.2, 1, (0.15 * px) + ' ' + (1.2 * px)); add('M' + rx + ' ' + Y0 + 'V' + Y1, null, INK, 0.5); });
          if (f.koprik) { var kby = YM(LM * 0.5), kbl = 4 * px; add('M' + (x0 - 0.3 * px) + ' ' + (kby - kbl / 2) + 'H' + (x1 + 0.3 * px) + 'V' + (kby + kbl / 2) + 'H' + (x0 - 0.3 * px) + 'Z', line ? '#ffffff' : '#ece6da', INK, 1); [kby - kbl / 2 + 0.2 * px, kby + kbl / 2 - 0.2 * px].forEach(function (ry) { add('M' + x0 + ' ' + ry + 'H' + x1, null, INK, 0.7); }); }
          if (f.bufer !== false && KN.pp) [[ul, -1], [ur2, 1]].forEach(function (b3) { var ox2 = b3[0] + b3[1] * KN.pp[0] * px, a2 = Math.min(b3[0], ox2), c2 = Math.max(b3[0], ox2); add('M' + a2.toFixed(1) + ' ' + Y0 + 'H' + c2.toFixed(1) + 'V' + Y1 + 'H' + a2.toFixed(1) + 'Z', '#e0a43c', null, 0, 0.12); add('M' + ox2.toFixed(1) + ' ' + Y0 + 'V' + Y1, null, '#c98a12', 1, 0.9, '6 4'); tx((a2 + c2) / 2, Y0 + 26, '≥ ' + String(KN.pp[0]).replace('.', ',') + ' m', 8, '#a8730a', 600, 'IBM Plex Mono, monospace'); });
          tx(cx, YM(LM * 0.5) + (f.koprik ? 3.4 * px : 0), tr(KN.riv ? 'Daryo' : 'Kanal'), 8.5, '#4f86a8', 600, 'Archivo, sans-serif'); }
        if (hasZ && ROAD[e[0]] && e[0] !== 'park') for (var zb = x0 + 0.25 * px; zb < x1 - 0.3 * px; zb += 1.0 * px) add('M' + zb + ' ' + YM(ZB) + 'h' + (0.5 * px) + 'v' + (4 * px) + 'h' + (-0.5 * px) + 'Z', '#ffffff', line ? INK : null, line ? 0.4 : 0);
        if (e[0] === 'qat') { var nx = els[i + 1]; if (nx && nx[0] === 'qat') add('M' + x1 + ' ' + YM(ZB + 6) + 'V' + Y1, null, line ? INK : '#ffffff', 1.4, 1, (3 * px) + ' ' + (6 * px)); if (f.mashina !== false) [0, 1].forEach(function (k2) { if ((i + k2) % 2 === 0) AS.pMashina(L, cx, YM(12 + k2 * 17), px, !left); }); laneArrow(cx, YM(i % 2 ? 10 : Math.min(27, LM - 6)), px, laneUp(f, left), f.man); /* uchastka 25 m boʻlsa ham koʻrinadi */ if (LM > 44) laneArrow(cx, YM(LM - 5), px, laneUp(f, left), f.man); }
        if (e[0] === 'bus') { if (f.avtobus !== false) AS.pAvtobus(L, cx, YM(LM * 0.6), px, !left); tx(cx, YM(9), 'A', 13, line ? INK : '#ffffff', 700); laneArrow(cx, YM(LM * 0.32), px, laneUp(f, left), f.man); }
        if (e[0] === 'tram') { add('M' + (x0 + w * 0.27) + ' ' + Y0 + 'V' + Y1 + 'M' + (x0 + w * 0.73) + ' ' + Y0 + 'V' + Y1, null, '#55524d', 1.3); if (f.tramvay !== false && i % 2 === 0) AS.pTramvay(L, cx, YM(LM * 0.55), px, 20); if (f.tayanch) [8, 28].forEach(function (m) { add(El(left ? x0 : x1, YM(m), 2.4, 2.4), INK, null, 0); }); }
        // avtoturargoh: parallel / 45° / 90° (Dizayn-kod 6.3)
        if (e[0] === 'park') {
          var ang = f.ang || 0, pitch = ang === 0 ? 6.0 : (ang === 45 ? 2.5 / Math.SQRT1_2 / 2 * 1 + 1.77 : 2.5), busy = mine.map(function (p) { return [p.y, p.y + p.l]; });
          if (ang === 45) pitch = 3.54;
          var curbX = left ? x1 : x0, walkX = left ? x0 : x1, k2 = 0;
          for (var m = ZB + 6; m + pitch <= LM - 0.5; m += pitch, k2++) {
            var a = m, b = m + pitch, blocked = busy.some(function (r) { return r[0] < b && r[1] > a; }); if (blocked) continue;
            if (f.dchontak && !mine.length && k2 % 4 === 2) { AS.pDaraxt(L, cx, YM((a + b) / 2), px, Math.min(2.4, e[1] / 2 + 0.6), k2); continue; }
            if (ang === 0) { add('M' + x0 + ' ' + YM(a) + 'H' + x1, null, line ? INK : '#ffffff', 1); if (f.mashina !== false) AS.pMashina(L, cx, YM((a + b) / 2), px, !left); }
            else if (ang === 90) { add('M' + x0 + ' ' + YM(a) + 'H' + x1, null, line ? INK : '#ffffff', 1); if (f.mashina !== false && k2 % 3 !== 1) { var cy = YM((a + b) / 2); AS.pMashina(rotL(cx, cy, dir * 90), cx, cy, px, true); } }
            else { var sk = w * dir; add('M' + curbX + ' ' + YM(a) + 'L' + walkX + ' ' + (YM(a) - Math.abs(w) * 1), null, line ? INK : '#ffffff', 1); if (f.mashina !== false && k2 % 3 !== 1) { var cy2 = YM((a + b) / 2) - w / 2; AS.pMashina(rotL(cx, cy2, -dir * 45), cx, cy2, px, true); } }
          }
          add('M' + curbX + ' ' + Y0 + 'V' + Y1, null, line ? INK : '#ffffff', 1.2, 0.9);
          tx(cx, YM(ZB + 4.6), ang ? ang + '°' : '∥', 9, line ? INK : '#55524d', 700);
        }
        if ((e[0] === 'yash' || e[0] === 'med') && f.daraxt) for (var m2 = 5; m2 < LM; m2 += 8) AS.pDaraxt(L, cx, YM(m2), px, Math.min(e[1] / 2 + 1.6, 3.2), i + Math.round(m2));
        if (e[0] === 'yash' && f.buta && !mine.length) [9, 25].forEach(function (m3) { add(Rr(cx - w * 0.38, YM(m3) - 2.5 * px, w * 0.76, 5 * px, w * 0.38), line ? 'none' : '#b9d3a6', line ? INK : '#7d9c69', 0.7); });
        if ((e[0] === 'yash' || e[0] === 'front') && f.orin && !mine.length) [9, 25].forEach(function (m3) { AS.pOrindiq(L, cx + (e[0] === 'yash' && f.buta ? w * 0.3 : 0), YM(m3), px, true); });
        if (e[0] === 'velo') { for (var m3 = 9; m3 < LM - 3; m3 += 18) bikeMark(cx, YM(m3), px, !left); }
        if (e[0] === 'mebel') { [6, 26].forEach(function (m3) { if (f.fonar) AS.pFonar(L, cx, YM(m3), px, dir); }); if (f.belgi) add(El(cx, YM(14), 0.3 * px, 0.3 * px), '#ffffff', INK, 1); }
        if (e[0] === 'med' && f.fonar) [13, 33].forEach(function (m3) { AS.pFonar(L, cx, YM(m3), px, 1); AS.pFonar(L, cx, YM(m3), px, -1); });
        if (e[0] === 'front' && f.kafe && !mine.length) for (var m4 = 4; m4 < LM * 0.55; m4 += 3) AS.pKafe(L, cx, YM(m4), px * 0.85);
        if (e[0] === 'front' && f.gul && !mine.length) [LM * 0.7, LM * 0.85].forEach(function (m3) { add(Rr(cx - 0.4 * px, YM(m3) - 0.4 * px, 0.8 * px, 0.8 * px, 1), line ? '#fff' : '#d8cdb8', INK, 0.7); AS.pDaraxt(L, cx, YM(m3), px, 0.5, 3); });
        if (e[0] === 'piy' && f.odam !== false) [[0.3, 7, 0.2], [0.7, 14, 3.3], [0.42, 14.6, 3.0], [0.4, 22, 0.1], [0.65, 30, 3.1], [0.25, 36, 1.5]].forEach(function (p) { if (p[1] < LM) AS.pOdam(L, x0 + w * p[0], YM(p[1]), px, p[2]); });
        // foydalanuvchi elementlari
        mine.forEach(function (p) { var ya = YM(p.y), yb = YM(Math.min(LM, p.y + p.l)), hh = yb - ya, ym = (ya + yb) / 2, pad = Math.min(0.25 * px, w * 0.08);
          if (p.t === 'parklet') { add(Rr(x0 + pad, ya + 2, w - 2 * pad, hh - 4, 2), line ? '#fff' : '#e9d6b0', INK, 0.9); for (var q = ya + 4; q < yb - 4; q += 0.3 * px) add('M' + (x0 + pad + 2) + ' ' + q + 'H' + (x1 - pad - 2), null, '#b89e74', 0.4, 0.6); add(Rr(left ? x1 - pad - 0.5 * px : x0 + pad, ya + 2, 0.5 * px, hh - 4, 1), line ? '#fff' : '#b9d3a6', INK, 0.6); for (var q2 = ya + 1.4 * px; q2 < yb - 1.2 * px; q2 += 2.2 * px) AS.pKafe(L, cx - dir * 0.2 * px, q2, px * 0.7); }
          else if (p.t === 'bekat') { add(Rr(x0 + pad, ya, w - 2 * pad, hh, 2), line ? '#fff' : '#efe9dd', INK, 0.8); AS.pBekat(L, left ? x0 + pad + 0.9 * px : x1 - pad - 0.9 * px, ym, px, dir); for (var q3 = ya + 1.5 * px; q3 < yb - 1 * px; q3 += 2.5 * px) AS.pOdam(L, cx + dir * 0.4 * px, q3, px, Math.PI / 2 * dir); }
          else if (p.t === 'shpalera') { add(Rr(cx - Math.min(w * 0.35, 0.5 * px), ya, Math.min(w * 0.7, 1.0 * px), hh, 0.5 * px), line ? 'none' : '#9fbd86', line ? INK : '#6f8f5c', 0.8); for (var q4 = ya + 0.5 * px; q4 < yb; q4 += 0.7 * px) add(El(cx + ((q4 / 7) % 1 - 0.5) * 2, q4, 0.35 * px, 0.3 * px), line ? 'none' : '#b2c995', line ? INK : '#7d9c69', 0.4, 0.9); }
          else if (p.t === 'buta') { for (var q5 = ya + 0.6 * px, n5 = 0; q5 < yb; q5 += 0.9 * px, n5++) add(El(cx + (n5 % 2 ? 0.25 : -0.25) * Math.min(w, 2 * px), q5, 0.6 * px, 0.55 * px), line ? 'none' : ['#a3bf88', '#b8cf98', '#8fae78'][n5 % 3], line ? INK : '#6f8f5c', 0.5, 0.95); }
          else if (p.t === 'terrasa') { add(Rr(x0 + pad, ya, w - 2 * pad, hh, 2), line ? '#fff' : '#f3e7cf', INK, 0.5, 1, '3 3'); for (var q6 = ya + 1.2 * px; q6 < yb - 0.6 * px; q6 += 2.4 * px) AS.pKafe(L, cx, q6, px * 0.85); }
          else if (p.t === 'velopark') { for (var q7 = ya + 0.45 * px; q7 < yb; q7 += 0.9 * px) { add('M' + (cx - 0.6 * px) + ' ' + q7 + 'h' + 1.2 * px, null, INK, 1.4); add('M' + (cx - 0.9 * px) + ' ' + (q7 + 0.25 * px) + 'h' + 1.8 * px, null, '#77736b', 0.6, 0.7); } }
          else if (p.t === 'samokat') { add(Rr(x0 + pad, ya, w - 2 * pad, hh, 2), line ? '#fff' : '#e3ecf1', '#3a86c8', 0.8, 1, '4 3'); for (var q8 = ya + 0.5 * px; q8 < yb; q8 += 0.6 * px) add('M' + (cx - 0.5 * px) + ' ' + q8 + 'h' + 1.0 * px, null, '#3a86c8', 1.2); tx(cx, ym + 3, 'SIM', 7.5, '#3a86c8', 700); }
          else if (p.t === 'orindiq') AS.pOrindiq(L, cx, ym, px, true);
          else if (p.t === 'axlat') add(El(cx, ym, 0.3 * px, 0.3 * px), '#ffffff', VB.st, 0.8);
          else if (p.t === 'daraxt') AS.pDaraxt(L, cx, ym, px, Math.min(3, Math.max(1.6, w / px / 2 + 0.8)), Math.round(p.y));
          else if (p.t === 'gul') { add(Rr(cx - 0.45 * px, ym - 0.45 * px, 0.9 * px, 0.9 * px, 1), line ? '#fff' : '#d8cdb8', INK, 0.7); AS.pDaraxt(L, cx, ym, px, 0.55, 3); }
          else if (p.t === 'yuklash') { add(Rr(x0 + pad, ya, w - 2 * pad, hh, 0), line ? '#fff' : '#f4ecd2', '#c98a12', 1); for (var q9 = ya; q9 < yb; q9 += 0.8 * px) add('M' + (x0 + pad) + ' ' + q9 + 'L' + (x1 - pad) + ' ' + Math.min(yb, q9 + (w - 2 * pad)), null, '#c98a12', 0.5, 0.5); tx(cx, ym + 3, 'YUK', 8, '#a26c0a', 700); }
          else if (p.t === 'taksi') { add(Rr(x0 + pad, ya, w - 2 * pad, hh, 0), null, '#c98a12', 1.2, 1, '5 3'); tx(cx, ya + 10, 'TAKSI', 7.5, '#a26c0a', 700); AS.pMashina(L, cx, ym, px, !left); }
          if (on) add(Rr(x0 + 1, ya - 1, w - 2, hh + 2, 2), null, '#4c5bd4', 1.2, 1, '3 2');
        });
        if (on) add('M' + x0 + ' ' + Y0 + 'H' + x1 + 'V' + Y1 + 'H' + x0 + 'Z', null, '#4c5bd4', 2.5);
      });
      AS.pDaraxt = _pD; TQ.forEach(function (a) { var A = Array.prototype.slice.call(a), L0 = A[0]; A[0] = { line: L0.line, ink: L0.ink, add: function (d, f, st, w, o, da, t2) { L0.add(d, f, st, w, (o == null ? 1 : o) * (L0.line ? 1 : 0.82), da, t2); } }; _pD.apply(null, A); });
      add('M' + X(0) + ' 44V' + (Y1 + 4) + 'M' + X(rl) + ' 44V' + (Y1 + 4), null, '#c0392b', 1.3, 1, '8 5');
      if (s.showU) U.forEach(function (u, j) { var c = UCd(u.k), cx = X(u.x), on = s.selU === j; add('M' + cx + ' ' + Y0 + 'V' + Y1, null, c[2], on ? 2.4 : 1.1, 0.9, '10 6'); add(Rr(cx - 8, Y0 + 14 + (j % 4) * 18, 16, 12, 2), '#fff', c[2], 1); tx(cx, Y0 + 23 + (j % 4) * 18, ulbl(u.k), 8, c[2], 700, 'IBM Plex Mono, monospace'); });
      tx(X(-SB) - 24, 50, 'qurilish', 9, LIGHT); tx(X(rl + SB) + 24, 50, 'qurilish', 9, LIGHT);
      tx(16, 24, 'Reja · ' + fm(Math.round(LM)) + ' m uchastka', 12, '#141414', 700, 'Archivo, sans-serif', 'start'); tx(16, 37, s.tplName + ' · ' + SKP[s.sk][0] + ' · ' + s.uk, 9.5, LIGHT, 400, 'Archivo, sans-serif', 'start');
      var PSY = 632; [0, 1, 2, 3, 4].forEach(function (q) { add('M' + (16 + q * 2 * px) + ' ' + PSY + 'h' + (2 * px) + 'v4h' + (-2 * px) + 'Z', q % 2 ? '#ffffff' : INK, INK, 0.6); }); tx(16, PSY - 4, '0', 7.5, INK, 400, 'IBM Plex Mono, monospace', 'start'); tx(16 + 10 * px, PSY - 4, '10 m', 7.5, INK, 400, 'IBM Plex Mono, monospace', 'middle');
      tx(HW, PSY + 4, 'Archemistry Lab · Koʻchasoz', 7.5, LIGHT, 400, 'Archivo, sans-serif', 'end');
    } else if (s.view === 2) {
      var AXR = axoDraw(s, s.gfx, UCd, 16, 48, VW - 32, 616); AXR.D.forEach(function (p) { draw.push(p); }); AXR.TT.forEach(function (q) { txt.push(q); });
      tx(16, 24, 'Aksonometriya · 28 m uchastka', 12, '#141414', 700, 'Archivo, sans-serif', 'start'); tx(16, 37, 'Yer osti tarmoqlari old kesimda', 9.5, LIGHT, 400, 'Archivo, sans-serif', 'start');
    } else {
      var PRS = perspDraw(s, ['piy', 'bola', 'velo', 'mashina'][s.view - 3], s.gfx, VW, 680); PRS.D.forEach(function (p) { draw.push(p); }); PRS.TT.forEach(function (q) { txt.push(q); });
    }
    // ===== tekshiruv =====
    var sk = SKP[s.sk], dk = DKP[s.uk], R = [];
    function chk(st, n, src, v) { R.push({ st: st, n: n, src: src, v: v, c: DC[st] }); }
    var d = Math.round((used - rl) * 100) / 100;
    chk(Math.abs(d) < 0.01 ? 'ok' : (d > 0 ? 'bad' : 'warn'), 'Qizil chiziqlarga sigʻish', '', fm(used) + ' / ' + fm(rl));
    // tomonlar
    var firstR = -1, lastR = -1; els.forEach(function (e, i) { if (ROAD[e[0]]) { if (firstR < 0) firstR = i; lastR = i; } });
    var sides = firstR < 0 ? [[0, Math.ceil(els.length / 2)], [Math.ceil(els.length / 2), els.length]] : [[0, firstR], [lastR + 1, els.length]];
    function sum(rg, ty) { var m = 0; for (var i = rg[0]; i < rg[1]; i++) if (ty.indexOf(els[i][0]) >= 0) m += els[i][1]; return m; }
    var SD = sides.map(function (rg) { return { p: sum(rg, ['piy']), b1: sum(rg, ['mebel']), b2: sum(rg, ['yash', 'velo']), b3: sum(rg, ['front']) }; });
    function minS(key) { return Math.min(SD[0][key], SD[1] ? SD[1][key] : 99); }
    var lanes = els.filter(function (e) { return e[0] === 'qat' || e[0] === 'bus'; });
    var cars = els.filter(function (e) { return e[0] === 'qat'; }), buses = els.filter(function (e) { return e[0] === 'bus'; });
    if (cars.length && sk[1] > 0) { var lmin = 99, lmax = 0; cars.forEach(function (e) { lmin = Math.min(lmin, e[1]); lmax = Math.max(lmax, e[1]); }); var inN = lmin >= sk[1] - 0.001 && lmax <= sk[2] + 0.001, inO = lmin >= sk[4] - 0.001 && lmax <= sk[5] + 0.001; chk(inN ? 'ok' : (inO ? 'warn' : 'bad'), 'Harakat boʻlagi ' + fm(sk[1]) + '–' + fm(sk[2]) + ' m', 'ShNQ 2.07.06-24, 2-ilova 1-jadval' + (inN && !inO ? ' · 2.07.01-23 20-jad.: ' + fm(sk[4]) + '–' + fm(sk[5]) : '') + ' · ' + sk[0], fm(lmin) + (lmax !== lmin ? '–' + fm(lmax) : '')); }
    if (buses.length) { var bm = 99; buses.forEach(function (e) { bm = Math.min(bm, e[1]); }); chk(bm >= 3.5 ? 'ok' : 'warn', 'Jamoat transporti tasmasi ~3,75 m', 'ShNQ 2.07.01-23, 20-jadval 4-izoh', fm(bm)); }
    var meds = []; els.forEach(function (e, i) { if (e[0] === 'med' && i > firstR && i < lastR) meds.push(e); }); if (meds.length) { var mm = 99; meds.forEach(function (e) { mm = Math.min(mm, e[1]); }); chk(mm >= 4 ? 'ok' : (mm >= 2 ? 'warn' : 'bad'), 'Markaziy ajratuvchi ≥ 4 m (toʻsiq bilan ≥ 2)', 'ShNQ 2.07.06-24, 109-band', fm(mm)); }
    if (sk[3] > 0) chk(minS('p') >= sk[3] ? 'ok' : 'bad', 'Piyoda yoʻlagi ≥ ' + fm(sk[3]) + ' m', 'ShNQ 2.07.06-24, 1-jadval · ' + sk[0], fm(minS('p')));
    chk(minS('p') >= dk[0] ? (minS('p') >= dk[1] ? 'ok' : 'warn') : 'bad', 'Piyodalar hududi ≥ ' + fm(dk[0]) + ' (tavsiya ' + fm(dk[1]) + ')', 'Dizayn-kod ' + dk[5] + ' · ' + s.uk, fm(minS('p')));
    chk(minS('b1') >= dk[2] ? 'ok' : 'bad', 'B1 texnik polosa ≥ ' + fm(dk[2]) + ' m', 'Dizayn-kod ' + dk[5], fm(minS('b1')));
    if (dk[3] > 0) chk(minS('b2') >= dk[3] ? 'ok' : 'bad', 'B2 bufer ≥ ' + fm(dk[3]) + ' m', 'Dizayn-kod ' + dk[5], fm(minS('b2')));
    if (dk[4] > 0) chk(minS('b3') >= dk[4] ? 'ok' : 'bad', 'B3 fasad oldi ≥ ' + fm(dk[4]) + ' m', 'Dizayn-kod ' + dk[5], fm(minS('b3')));
    var velos = []; els.forEach(function (e, i) { if (e[0] === 'velo') velos.push(i); });
    if (velos.length) { var vm = 99, buf = 99; velos.forEach(function (i) { vm = Math.min(vm, els[i][1]); var c0 = (zx[i][0] + zx[i][1]) / 2; curbs.forEach(function (cb) { var b = Math.abs(cb - c0) - els[i][1] / 2; buf = Math.min(buf, b); }); }); chk(vm >= 1.5 ? 'ok' : (vm >= 1.2 ? 'warn' : 'bad'), 'Velo yoʻlak ≥ 1,5 m', 'DK 7.4.1 · ShNQ 2.07.06-24, 1-jadval', fm(vm)); if (curbs.length) chk(buf >= 0.5 ? 'ok' : 'bad', 'Velo ↔ mashina bufer ≥ 0,5 m', 'Dizayn-kod 7.4.1', fm(Math.max(0, buf))); }
    var ter = 99; els.forEach(function (e) { var f = e[2] || {}; if (e[0] === 'front' && f.kafe) ter = Math.min(ter, e[1]); }); if (ter < 90) chk(ter >= 1.5 ? 'ok' : 'bad', 'Terrasa uchun B3 ≥ 1,5 m', 'Dizayn-kod 13.3–13.4', fm(ter));
    if (TX.length) {
      var tc2 = 99, tb = 99, tt2 = 99, tw = 99; TX.forEach(function (t) { if (!t.pocket) { tc2 = Math.min(tc2, nearest(t.x, curbs)); var z = t.z, pe = []; els.forEach(function (q, j) { if (q[0] === 'piy') pe.push(zx[j][0], zx[j][1]); }); tw = Math.min(tw, nearest(t.x, pe)); } tb = Math.min(tb, t.x + SB, rl + SB - t.x); trams.forEach(function (z) { tt2 = Math.min(tt2, Math.abs(t.x - z[0]), Math.abs(t.x - z[1])); }); });
      if (curbs.length && tc2 < 90) chk(tc2 >= 1.995 ? 'ok' : 'warn', 'Daraxt ↔ qatnov qismi cheti ≥ 2,0', 'ShNQ 2.07.01-23, 485-band, 35-jadval', fm(tc2));
      if (tw < 90) chk(tw >= 0.7 ? 'ok' : 'warn', 'Daraxt ↔ trotuar cheti ≥ 0,7', 'ShNQ 35-jadval', fm(tw));
      chk(tb >= 5 ? 'ok' : 'bad', 'Daraxt ↔ bino devori ≥ 5,0', 'ShNQ 35-jadval', fm(tb));
      if (trams.length) chk(tt2 >= 5 ? 'ok' : 'bad', 'Daraxt ↔ tramvay yoʻli ≥ 5,0', 'ShNQ 35-jadval', fm(tt2));
    } else chk('warn', 'Daraxt yoʻq', 'Dizayn-kod 10 · iqlim qulayligi', '—');
    var roadW = 0; els.forEach(function (e) { if (e[0] === 'qat' || e[0] === 'bus') roadW += e[1]; });
    /* tor kesim: avto joylashda meʼyor buzilmasdan joy topilmagan tarmoqlar — bino tagiga qoʻyilmaydi, ogohlantirish */
    if (s.uSkip && s.uSkip.length) chk('warn', tr('Sigʻmagan tarmoqlar') + ': ' + s.uSkip.map(ulbl).join(', '), tr('ShNQ 209–210-band · kesimni kengaytiring yoki qoʻlda qoʻying'), String(s.uSkip.length));
    if (U.length) {
      var bad = 0; U.forEach(function (u, j) { if (evalU(u, U.filter(function (o, q) { return q !== j; })).worst === 'bad') bad++; });
      chk(bad ? 'bad' : 'ok', 'Tarmoqlar masofalari', 'ShNQ 209–210-band, 8–9-jadval', bad ? bad + ' ta muammo' : 'joyida');
      var ws = U.filter(function (u) { return u.k === 'W'; }); if (roadW > 22) chk(ws.length >= 2 && ws.some(function (u) { return u.x < rl / 2; }) && ws.some(function (u) { return u.x > rl / 2; }) ? 'ok' : 'bad', 'Qatnov qismi > 22 m: suv ikki tomonda', 'ShNQ 189-band', fm(roadW) + ' m');
      var ord = U.filter(function (u) { return u.x < rl / 2 && ['UT', 'SL', 'HV', 'DC', 'SD'].indexOf(u.k) < 0; }).sort(function (a, b) { return a.x - b.x; }), okO = true; for (var oi = 1; oi < ord.length; oi++) if (UCd(ord[oi].k)[9] < UCd(ord[oi - 1].k)[9]) okO = false; chk(okO ? 'ok' : 'warn', 'Qizil chiziqdan tartib (chap tomon)', 'ShNQ 203-band: T → E → DH → G → W → SS → UD', okO ? 'mos' : 'tekshiring');
    }
    /* masshtab tugmalari: karta markazi atrofida (1× — sigʻadi, 8× gacha) */
    function zoomBy(f) { var c = document.querySelector('.ws-b main > .card'), r = c ? c.getBoundingClientRect() : { width: 800, height: 600 }, z0 = self.state.zm || { z: 1, x: 0, y: 0 }, z1 = Math.max(1, Math.min(8, z0.z * f)), mx = r.width / 2, my = r.height / 2;
      if (z1 <= 1.001) { self.setState({ zm: null }); return; }
      var x = mx - (mx - z0.x) * z1 / z0.z, y = my - (my - z0.y) * z1 / z0.z; x = Math.min(0, Math.max(r.width * (1 - z1), x)); y = Math.min(0, Math.max(r.height * (1 - z1), y)); self.setState({ zm: { z: z1, x: x, y: y } }); }
    /* kanal: qirgʻoq boʻyi polosasi ichida yoʻl, turargoh yoki bino boʻlmasin (VM 981, 35/37-band — shaharda bosh reja boʻyicha) */
    els.forEach(function (e, i) { if (e[0] !== 'kanal') return; var f = e[2] || {}, KN = kNorm(f), KB = kBank(f, e[1]); if (!KN.pp) return; var pp = KN.pp[0], ul = zx[i][0] + KB.ur, ur2 = zx[i][1] - KB.ur, bad = [];
      els.forEach(function (o, j) { if (j === i || !(ROAD[o[0]] || o[0] === 'tram')) return; var a = zx[j][0], b = zx[j][1]; if ((b > ul - pp + 0.05 && a < ul) || (a < ur2 + pp - 0.05 && b > ur2)) bad.push(T[o[0]].s); });
      if ((s.eL || 'bino') === 'bino' && ul - pp < -SB) bad.push(tr('bino')); if ((s.eR || 'bino') === 'bino' && ur2 + pp > rl + SB) bad.push(tr('bino'));
      bad = bad.filter(function (v, k2) { return bad.indexOf(v) === k2; });
      chk(bad.length ? 'warn' : 'ok', 'Qirgʻoq boʻyi polosasi ≥ ' + fm(pp) + ' m' + (bad.length ? ': ' + bad.join(', ') : ''), KSRC, fm(pp)); });
    var nOk = R.filter(function (r) { return r.st === 'ok'; }).length;
    // ===== bloklar =====
    /* pastki qator chetlari: chet turi boʻyicha nom va rang */
    var EDB = { bino: ['Bino', '#ecebe8'], bog: ['Bogʻ', '#d9e8cc'], ochiq: ['Ochiq', '#efeae1'], qiyalik: ['Qiyalik', '#e6dfcd'], suv: ['Suv', '#cfe2ee'] };
    function edBlk(et) { var d = EDB[et || 'bino'] || EDB.bino; return { ei: '', f: SB, c: d[1], n: d[0], w: fm(SB), wc: '#141414', ic: 'M4 20V6h16v14M9 9h2M13 9h2M9 13h2M13 13h2', p: 'false', sh: 'none', pick: null }; }
    var blks = [edBlk(s.eL)];
    els.forEach(function (e, i) { var t = T[e[0]], bad = (e[0] === 'qat' && sk[1] > 0 && (e[1] < sk[1] || e[1] > Math.max(sk[2], 3.75))) || (e[0] === 'velo' && e[1] < 1.5) || (e[0] === 'mebel' && e[1] < dk[2]); blks.push({ ei: i, f: e[1], c: t.c, n: t.s, w: fm(e[1]), wc: bad ? '#b23a2e' : '#141414', ic: t.ic, p: s.sel === i && s.selU < 0 ? 'true' : 'false', sh: bad ? 'inset 0 -3px 0 #b23a2e' : 'none', pick: function () { self.setState({ sel: i, selU: -1 }); } }); });
    blks.push(edBlk(s.eR));
    var tot = rl + 2 * SB;
    function pctX(m) { return ((SB + m) / tot * 100).toFixed(2) + '%'; }
    function upd(fn) { var E = self.state.els.map(function (e) { return [e[0], e[1], Object.assign({}, e[2] || {})]; }); var r = fn(E, self.state.sel); self.setState(Object.assign({ els: E }, r || {})); }
    function defItems(k) { var o = {}; (IT[k] || []).forEach(function (it, ix) { o[it[0]] = ix < 2; }); return o; }
    /* tayyor kesim eskizi: zonalar oʻz sathida (trotuar 0,15 m baland), hamma narsa oʻz zonasi ustida turadi */
    function thumb(E) { var tw = 0; E.forEach(function (e) { tw += e[1]; }); var k = 196 / tw, xx = 17, GY = 50;
      var out = [{ d: 'M2 ' + GY + 'H228V58H2Z', f: '#f6f2ea', s: 'none', w: 0 }, { d: 'M4 14h13v' + (GY - 14) + 'H4Z', f: '#f0efec', s: '#8f8a80', w: 0.6 }, { d: 'M213 14h13v' + (GY - 14) + 'H213Z', f: '#f0efec', s: '#8f8a80', w: 0.6 }];
      E.forEach(function (e) { var w = e[1] * k, t = T[e[0]], f = e[2] || {}, top = GY - t.h * 12, cx = xx + w / 2, ww;
        out.push({ d: 'M' + xx.toFixed(1) + ' ' + top.toFixed(1) + 'h' + w.toFixed(1) + 'V' + (GY + 2) + 'H' + xx.toFixed(1) + 'Z', f: t.c, s: '#8f8a80', w: 0.4 });
        if ((e[0] === 'yash' || e[0] === 'med') && f.daraxt) { var rr = Math.max(2.5, Math.min(5.5, w / 2 + 1.5)); out.push({ d: 'M' + cx.toFixed(1) + ' ' + top.toFixed(1) + 'V' + (top - 9).toFixed(1) + 'M' + (cx - rr).toFixed(1) + ' ' + (top - 9 - rr * 1.1).toFixed(1) + 'a' + rr + ' ' + (rr * 1.15).toFixed(1) + ' 0 1 0 ' + (2 * rr) + ' 0a' + rr + ' ' + (rr * 1.15).toFixed(1) + ' 0 1 0 ' + (-2 * rr) + ' 0', f: '#c3d6a3', s: '#7d9c69', w: 0.6 }); }
        if ((e[0] === 'qat' && f.mashina !== false) || (e[0] === 'park' && f.mashina)) { ww = Math.min(6, w * 0.8); out.push({ d: 'M' + (cx - ww / 2).toFixed(1) + ' ' + top.toFixed(1) + 'h' + ww.toFixed(1) + 'v-3.2h' + (-ww).toFixed(1) + 'Z', f: '#fff', s: '#3a3936', w: 0.5 }); }
        if (e[0] === 'tram' || e[0] === 'bus') { ww = Math.min(7, w * 0.85); out.push({ d: 'M' + (cx - ww / 2).toFixed(1) + ' ' + top.toFixed(1) + 'h' + ww.toFixed(1) + 'v-8.5h' + (-ww).toFixed(1) + 'Z', f: '#fff', s: '#3a3936', w: 0.5 }); }
        if (e[0] === 'mebel' && f.fonar) out.push({ d: 'M' + cx.toFixed(1) + ' ' + top.toFixed(1) + 'V' + (top - 19).toFixed(1) + 'h3', f: 'none', s: '#55524d', w: 0.7 });
        if (e[0] === 'piy') out.push({ d: 'M' + cx.toFixed(1) + ' ' + top.toFixed(1) + 'v-5M' + (cx - 1).toFixed(1) + ' ' + (top - 6.2).toFixed(1) + 'a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', f: '#3a3936', s: '#3a3936', w: 1 });
        if (e[0] === 'front' && f.kafe) out.push({ d: 'M' + (cx - 3).toFixed(1) + ' ' + (top - 6).toFixed(1) + 'h6l-3 -2zM' + cx.toFixed(1) + ' ' + (top - 6).toFixed(1) + 'V' + top.toFixed(1), f: '#8f8a80', s: '#55524d', w: 0.5 });
        xx += w; });
      return out; }
    var cur = els[Math.min(s.sel, els.length - 1)], ct = T[cur[0]], cf = cur[2] || {};
    var su = s.selU >= 0 ? U[s.selU] : null, suc = su ? UCd(su.k) : null, sev = su ? evalU(su, U.filter(function (o, q) { return q !== s.selU; })) : null;
    function updU(fn) { var N = self.state.U.map(function (u) { return Object.assign({}, u); }); var r = fn(N, self.state.selU); self.setState(Object.assign({ U: N }, r || {})); }
    var EDGES = [['bino', 'Bino'], ['bog', 'Bogʻ'], ['ochiq', 'Ochiq'], ['qiyalik', 'Qiyalik'], ['suv', 'Suv']];
    function autoAll() { var N = [], list = ['UT', 'DH', 'W', 'SS', 'SD', 'G', 'E', 'T', 'SL', 'UD'].filter(function (k) { return k !== 'UT'; }); var SK = []; list.forEach(function (k) { var c = UCd(k), x = place(k, N, k === 'W' ? -1 : 0); if (lastPlace >= 400) SK.push(k); else N.push({ k: k, x: x, d: c[3] }); }); if (roadW > 22) { var xw = place('W', N, 1); if (lastPlace >= 400) SK.push('W'); else N.push({ k: 'W', x: xw, d: 2.5 }); } self.setState({ U: N, showU: true, selU: -1, uSkip: SK }); }
    var szt = su ? ztype(su.x) : '';
    var CAT = { parklet: ['Parklet', ['park'], 6, 'Dizayn-kod 13 · andoza'], bekat: ['Bekat', ['park', 'yash', 'mebel', 'bus'], 10, 'Dizayn-kod 5'], shpalera: ['Shpalera', ['yash', 'med', 'front', 'park'], 8, 'jonli toʻsiq · ShNQ 35-jad.'], buta: ['Butalar', ['yash', 'med', 'front'], 3, 'ShNQ 35-jad.'], terrasa: ['Terrasa · stol-stul', ['front'], 6, 'Dizayn-kod 13.3–13.4'], velopark: ['Velo turargoh', ['yash', 'front', 'mebel'], 5, 'Dizayn-kod 7.4'], samokat: ['Samokat turargohi', ['yash', 'front', 'mebel', 'park'], 4, 'andoza'], orindiq: ['Oʻrindiq', ['yash', 'front', 'mebel'], 2, 'Dizayn-kod 3.3'], axlat: ['Axlat qutisi', ['mebel', 'yash', 'front'], 0.6, ''], daraxt: ['Daraxt', ['park', 'yash', 'med', 'front'], 2.5, 'ShNQ 35-jad.'], gul: ['Gul tuvak', ['front', 'yash'], 1, 'Dizayn-kod 13.4'], yuklash: ['Yuk tushirish', ['park'], 8, 'andoza'], taksi: ['Taksi', ['park'], 6, 'Dizayn-kod 6.4.2'] };
    var LMg = 544 / px, PLs = s.PL || [], selT = els[Math.min(s.sel, els.length - 1)] ? els[Math.min(s.sel, els.length - 1)][0] : '';
    /* zona tartibi oʻzgarsa — rejadagi joylashtirilgan elementlar (parklet, shpalera…) oʻz zonasi bilan koʻchadi; −1 — oʻchadi */
    function remapPL(f) { return (self.state.PL || []).map(function (p) { return Object.assign({}, p, { z: f(p.z) }); }).filter(function (p) { return p.z >= 0; }); }
    function updPL(fn) { var N = (self.state.PL || []).map(function (p) { return Object.assign({}, p); }); var r = fn(N); self.setState(Object.assign({ PL: N }, r || {})); }
    function freeY(z, l) { var its = PLs.filter(function (p) { return p.z === z; }); for (var y = 7.5; y + l <= LMg; y += 0.5) { if (!its.some(function (p) { return p.y < y + l && p.y + p.l > y; })) return y; } return Math.max(0, LMg - l); }
    var ANG = { 0: [2.3, 3, '5,5–6 × 2,3–2,5 m, manevr ≥ 3 m'], 45: [4.9, 4.5, '4,5–5 × 2,5 m, manevr 4,5–5 m'], 90: [5.0, 6, '5–5,5 × 2,5–2,7 m, manevr ≥ 6 m'] };
    els.forEach(function (e, i) { if (e[0] !== 'park') return; var a2 = (e[2] || {}).ang || 0, need = ANG[a2]; var side = zx[i][0] < rl / 2 ? 1 : -1, man = 0; for (var j = i + side; j >= 0 && j < els.length && (els[j][0] === 'qat' || els[j][0] === 'bus'); j += side) man += els[j][1];
      R.push({ st: e[1] >= need[0] - 0.01 ? 'ok' : 'bad', n: 'Turargoh ' + (a2 ? a2 + '°' : 'parallel') + ': chuqurlik ≥ ' + fm(need[0]) + ' m', src: 'Dizayn-kod 6.3 · ' + need[2], v: fm(e[1]), c: DC[e[1] >= need[0] - 0.01 ? 'ok' : 'bad'] });
      R.push({ st: man >= need[1] ? 'ok' : 'warn', n: 'Manevr boʻlagi ≥ ' + fm(need[1]) + ' m', src: 'Dizayn-kod 6.3', v: fm(man), c: DC[man >= need[1] ? 'ok' : 'warn'] }); });
    if (els.some(function (e) { return e[0] === 'park'; }) && ['U2', 'U4', 'U5'].indexOf(s.uk) >= 0) R.push({ st: 'warn', n: 'Koʻcha boʻylab turargoh taqiqlangan (faqat choʻntak/taksi)', src: 'Dizayn-kod 6.4.2 · ' + s.uk, v: s.uk, c: DC.warn });
    nOk = R.filter(function (r) { return r.st === 'ok'; }).length;
    /* sudrash: 1 ekran pikseli → metr (chizma va pastki qator bir xil kenglikda) */
    function mpp() { return svgUnitsPerPx() / px; }
    function snap(v, st) { return Math.round(v / st) * st; }
    /* zona chegarasi (i | i+1): oddiy — qoʻshni zona hisobidan, Shift — faqat chapdagi zona (umumiy kenglik oʻzgaradi) */
    function zdown(i) { return function (ev) { var E0 = self.state.els.map(function (e) { return [e[0], e[1], Object.assign({}, e[2] || {})]; }), k = mpp(); self.setState({ sel: i, selU: -1 });
      drag(ev, k, function (dm, e) { var E = E0.map(function (q) { return [q[0], q[1], q[2]]; }), a = E0[i][1], b = E0[i + 1][1];
        if (e.shiftKey) { E[i][1] = Math.max(0.3, snap(a + dm, 0.05)); }
        else { var na = Math.min(a + b - 0.3, Math.max(0.3, snap(a + dm, 0.05))); E[i][1] = Math.round(na * 100) / 100; E[i + 1][1] = Math.round((a + b - na) * 100) / 100; }
        self.setState({ els: E }); }); }; }
    /* tashqi chet: sd = −1 — chap qizil chiziq, 1 — oʻng; chetdagi zona eni va rl birga; chapda — tarmoqlar ham siljiydi (x chap qizil chiziqdan) */
    function edown(sd) { return function (ev) { var E0 = self.state.els.map(function (e) { return [e[0], e[1], Object.assign({}, e[2] || {})]; }), U0 = (self.state.U || []).map(function (u) { return Object.assign({}, u); }), r0 = self.state.rl, i = sd < 0 ? 0 : E0.length - 1, k = mpp(); self.setState({ sel: i, selU: -1 });
      drag(ev, k, function (dm) { var E = E0.map(function (q) { return [q[0], q[1], q[2]]; }), nw = Math.round(Math.max(0.3, snap(E0[i][1] + sd * dm, 0.05)) * 100) / 100, d = nw - E0[i][1]; E[i][1] = nw;
        var o = { els: E, rl: Math.round((r0 + d) * 100) / 100 }; if (sd < 0) o.U = U0.map(function (u) { return Object.assign({}, u, { x: Math.round((u.x + d) * 100) / 100 }); }); self.setState(o); }); }; }
    /* tarmoq: pastki qatorda — gorizontal, kesimda — gorizontal va chuqurlik */
    function udown(j, deep) { return function (ev) { var u0 = Object.assign({}, self.state.U[j]), k = mpp(); self.setState({ selU: j, showU: true });
      drag(ev, k, function (dm, e) { var N = self.state.U.map(function (u) { return Object.assign({}, u); }); N[j].x = Math.max(-SB, Math.min(self.state.rl + SB, snap(u0.x + dm, 0.05)));
        if (deep) N[j].d = Math.max(0.3, Math.min(6, snap(u0.d + e.dy, 0.05))); N[j].x = Math.round(N[j].x * 100) / 100; N[j].d = Math.round(N[j].d * 100) / 100; self.setState({ U: N }); }); }; }
    /* meʼyor javobi: hammasi joyida — yashil; aks holda birinchi buzilgan qoida */
    function ufbOf(u, ev) { var c = UCd(u.k), bad = ev.rows.filter(function (r) { return r.c === DC.bad; })[0] || ev.rows.filter(function (r) { return r.c === DC.warn; })[0];
      if (!bad) return { t: '✓ ' + ulbl(u.k) + ' · ' + c[1] + ': meʼyorga mos', s: '✓ meʼyorga mos', c: DC.ok };
      var need = /≥\s*([\d,]+)/.exec(bad.src); return { t: '✕ ' + ulbl(u.k) + ' · ' + bad.n + ' ' + bad.v + (need ? ' — kerak ≥ ' + need[1] + ' m' : '') + ' (' + bad.src.replace(/\s*·\s*≥.*$/, '') + ')', s: '✕ ' + bad.n.toLowerCase() + ' ' + bad.v + (need ? ' < ' + need[1] + ' m' : ''), c: bad.c }; }
    var ufb = null; if (s.selU >= 0 && U[s.selU]) { var _u = U[s.selU]; ufb = ufbOf(_u, evalU(_u, U.filter(function (o, q) { return q !== s.selU; }))); }
    /* pastki qator joylashuvi — chizma bilan bir vertikalda (X → viewBox ulushi) */
    function pv(m) { return (X(m) / VW * 100).toFixed(3) + '%'; }
    function wv(m) { return 'calc(' + (m * px / VW * 100).toFixed(3) + '% - 2px)'; }
    var bxs = [[-SB, SB]].concat(zx.map(function (z) { return [z[0], z[1] - z[0]]; })).concat([[rl, SB]]);
    blks.forEach(function (b, q) { b.l = pv(bxs[q][0]); b.w2 = wv(bxs[q][1]); });
    /* pastki qatorda yaqin tarmoqlar — ikki qatorga */
    var UROW = U.map(function () { return 0; }), uord = U.map(function (u, j) { return j; }).sort(function (a, b) { return U[a].x - U[b].x; }), lastX = [-99, -99]; uord.forEach(function (j) { var sx = X(U[j].x), r = sx - lastX[0] > 26 * VW / 1000 * 1.6 ? 0 : (sx - lastX[1] > 26 * VW / 1000 * 1.6 ? 1 : 0); UROW[j] = r; lastX[r] = sx; });
    var SH = []; for (var bi2 = 0; bi2 < els.length - 1; bi2++) SH.push({ l: pv(zx[bi2][1]), down: zdown(bi2) });
    SH.push({ l: pv(0), down: edown(-1) }, { l: pv(rl), down: edown(1) });
    /* tayyor kesimlar: Koʻchasoz namunalari + Master reja profillari (guruhlab) */
    var MRG = [{ id: 'mr-asosiy', n: 'Asosiy', list: PROFILES }].concat(Array.from(new Set(PRESET_PROFILES.map(function (p) { return p.group; }))).map(function (g) { return { id: 'mr-' + g, n: g, list: PRESET_PROFILES.filter(function (p) { return p.group === g; }) }; }));
    var MY = s.MY || [], tg = s.tg || 'ks', TG = [{ id: 'my', n: 'Mening kesimlarim', c: MY.length }, { id: 'ks', n: 'Namunalar', c: s.TPL.length }].concat(MRG.map(function (g) { return { id: g.id, n: g.n, c: g.list.length }; }));
    var TL = tg === 'my' ? MY : tg === 'ks' ? s.TPL : ((MRG.filter(function (g) { return g.id === tg; })[0] || MRG[0]).list.map(function (p) { var k2 = profileToKs(p); return [p.name, null, k2.els, k2.sk, k2.uk, []]; }));
    var isPlanZone = s.selU < 0, cz = Math.min(s.sel, els.length - 1);
    var used2 = Math.round(used * 100) / 100;
    return {
      vw: VW, xa: X(-SB).toFixed(1), xb: X(rl + SB).toFixed(1), kx0: X(0).toFixed(3), kpx: px.toFixed(5), kg: s.view === 0 ? G : '', kd1: s.view === 0 ? D1 : '', kd3: s.view === 0 ? D3 : '', _UC: UC, _SKP: SKP, _DKP: DKP, _px: px, _ext: s.view === 0 ? [14, (s.showU && U.length ? D3 + 26 + 50 : D3 + 26 + 30) + 10] : [14, 642],
      modes: [['A', 'Tarmoq'], ['B', 'Kesim'], ['C', 'Chorraha'], ['D', 'Koʻcha muhiti'], ['E', 'Mikromodel']].map(function (m, i) { return { k: m[0], n: m[1], p: i === 1 ? 'true' : 'false' }; }),
      tplName: s.tplName, rl: fm(rl), used: fm(used2),
      sks: Object.keys(SKP).map(function (k) { return { n: SKP[k][0], t: SKP[k][6], p: s.sk === k ? 'true' : 'false', pick: function () { self.setState({ sk: k }); } }; }),
      uks: Object.keys(DKP).map(function (k) { return { n: k === 'M1' ? 'M1–M2' : k, t: DKP[k][6], p: s.uk === k ? 'true' : 'false', pick: function () { self.setState({ uk: k }); } }; }),
      lims: [['Boʻlak eni (2.07.06)', sk[1] ? fm(sk[1]) + '–' + fm(sk[2]) : '—'], ['Piyoda (ShNQ)', sk[3] ? '≥ ' + fm(sk[3]) : '—'], ['Piyoda (DK)', '≥ ' + fm(dk[0]) + ' · ' + fm(dk[1])], ['B1 / B2 / B3', fm(dk[2]) + ' / ' + fm(dk[3]) + ' / ' + fm(dk[4])]].map(function (l) { return { n: l[0], v: l[1] }; }),
      /* oʻz kesimi: boʻsh kesimdan boshlash va joriy kesimni «Mening kesimlarim» ga saqlash (nom — koʻcha nomi, bosib oʻzgartiriladi) */
      newBlank: function () { self.setState({ els: [['piy', 3, {}], ['qat', 3.5, { zebra: true }], ['qat', 3.5, { zebra: true }], ['piy', 3, {}]], rl: 13, tplName: tr('Yangi kesim'), sel: 1, selU: -1, U: [], PL: [] }); },
      saveMine: function () { var st0 = self.state, nm = st0.tplName || tr('Mening kesimim'), list = (st0.MY || []).filter(function (m) { return m[0] !== nm; });
        if ((st0.TPL || []).some(function (t) { return t[0] === nm; })) { var n = 2; while (list.some(function (m) { return m[0] === nm + ' (' + n + ')'; })) n++; nm = nm + ' (' + n + ')'; }
        list.unshift([nm, null, st0.els.map(function (e) { return [e[0], e[1], Object.assign({}, e[2] || {})]; }), st0.sk, st0.uk, (st0.PL || []).map(function (p) { return Object.assign({}, p); })]);
        self.setState({ MY: list, tplName: nm, tg: 'my', tOpen: true }); },
      myEmpty: tg === 'my' && !MY.length,
      tgs: TG.map(function (g) { return { n: g.n, c: g.c, p: tg === g.id ? 'true' : 'false', pick: function () { self.setState({ tg: g.id, tgMenu: false }); } }; }),
      tOpen: s.tOpen === false ? 'false' : 'true', tOpenB: s.tOpen !== false, tToggle: function () { self.setState({ tOpen: self.state.tOpen === false, tgMenu: false }); },
      tgMenu: s.tgMenu ? 'true' : 'false', tgMenuB: !!s.tgMenu, tgToggle: function () { self.setState({ tgMenu: !self.state.tgMenu }); },
      tgCur: (TG.filter(function (g) { return g.id === tg; })[0] || TG[0]).n, tCount: String(TG.reduce(function (a, g) { return a + g.c; }, 0)),
      tpls: TL.map(function (t) { var w = 0; t[2].forEach(function (e) { w += e[1]; }); return { n: t[0], u: t[4], w: fm(w), th: thumb(t[2]), p: s.tplName === t[0] ? 'true' : 'false', del: tg === 'my' ? function () { self.setState({ MY: (self.state.MY || []).filter(function (m) { return m[0] !== t[0]; }) }); } : null, pick: function () { self.setState({ els: t[2].map(function (e) { return [e[0], e[1], Object.assign({}, e[2] || {})]; }), rl: Math.round(w * 100) / 100, tplName: t[0], sk: t[3], uk: t[4], sel: 0, selU: -1, U: [], PL: (t[5] || []).map(function (p) { return Object.assign({}, p); }) }); } }; }),
      edL: EDGES.map(function (q) { return { n: q[1], p: String((s.eL || 'bino') === q[0]), pick: function () { self.setState({ eL: q[0] }); } }; }),
      edR: EDGES.map(function (q) { return { n: q[1], p: String((s.eR || 'bino') === q[0]), pick: function () { self.setState({ eR: q[0] }); } }; }),
      bLb: (s.eL || 'bino') === 'bino', bRb: (s.eR || 'bino') === 'bino',
      bL: s.bL, bR: s.bR, bLd: function () { self.setState({ bL: Math.max(1, self.state.bL - 1) }); }, bLu: function () { self.setState({ bL: Math.min(30, self.state.bL + 1) }); }, bRd: function () { self.setState({ bR: Math.max(1, self.state.bR - 1) }); }, bRu: function () { self.setState({ bR: Math.min(30, self.state.bR + 1) }); },
      skFull: SKP[s.sk][6], checks: R, okCount: nOk + ' / ' + R.length,
      /* chekka panellar yashirilishi va chizmani yaqinlashtirish (zm: z — masshtab, x/y — siljish px) */
      pCls: (s.pL ? 'pl-off' : '') + (s.pR ? ' pr-off' : ''), pLt: function () { self.setState({ pL: !self.state.pL }); }, pRt: function () { self.setState({ pR: !self.state.pR }); },
      pLlab: s.pL ? 'Chap panelni ochish' : 'Chap panelni yashirish', pRlab: s.pR ? 'Oʻng panelni ochish' : 'Oʻng panelni yashirish',
      zT: s.zm ? 'translate(' + s.zm.x.toFixed(1) + 'px, ' + s.zm.y.toFixed(1) + 'px) scale(' + s.zm.z.toFixed(4) + ')' : 'none', zPct: Math.round((s.zm ? s.zm.z : 1) * 100) + '%', zOneD: !s.zm || s.zm.z <= 1.001 ? 'true' : 'false', pLoff: s.pL ? 'true' : 'false', pRoff: s.pR ? 'true' : 'false',
      zIn: function () { zoomBy(1.25); }, zOut: function () { zoomBy(0.8); }, zFit: function () { self.setState({ zm: null }); },
      views: [['Kesim', 0], ['Reja', 1], ['Akso', 2], ['Piyoda', 3], ['Bola', 4], ['Velo', 5], ['Mashina', 6]].map(function (v) { return { n: v[0], p: s.view === v[1] ? 'true' : 'false', pick: function () { self.setState({ view: v[1], zm: null }); } }; }),
      gfx: (s.view === 2 ? [['Rangli', 0], ['Maket', 1]] : [['Rangli', 0], ['Chizma', 1]]).map(function (v) { return { n: v[0], p: s.gfx === v[1] ? 'true' : 'false', pick: function () { self.setState({ gfx: v[1] }); } }; }),
      alt: s.tplName + ' — ' + ['koʻndalang kesim', 'reja', 'aksonometriya', 'piyoda koʻzi', 'bola koʻzi', 'velosipedchi koʻzi', 'haydovchi koʻzi'][s.view], draw: draw, txt: txt, zhit: zhit,
      fillW: Math.min(100, used / rl * 100).toFixed(1) + '%', fillC: Math.abs(d) < 0.01 ? '#4c5bd4' : (d > 0 ? '#b23a2e' : '#e0a43c'),
      fitC: Math.abs(d) < 0.01 ? 'ok' : (d > 0 ? 'bad' : 'warn'), fitT: Math.abs(d) < 0.01 ? 'Qizil chiziqlarga sigʻadi' : (d > 0 ? '+' + fm(d) + ' m ortiqcha' : fm(-d) + ' m boʻsh'),
      fit: function () { upd(function (E) { var u = 0; E.forEach(function (e) { u += e[1]; }); var k = self.state.rl / u; E.forEach(function (e) { e[1] = Math.round(e[1] * k * 100) / 100; }); var u2 = 0; E.forEach(function (e) { u2 += e[1]; }); E[0][1] = Math.round((E[0][1] + self.state.rl - u2) * 100) / 100; }); },
      uOn: s.showU ? 'on' : '', tU: function () { self.setState({ showU: !self.state.showU }); }, showU: s.showU, auto: autoAll, clr: function () { self.setState({ U: [], selU: -1, uSkip: [] }); },
      clipR: s.view === 1 ? [{ x: 0, y: 0, w: VW, h: 604 }, { x: 0, y: 618, w: 16 + 10 * px + 30, h: 40 }] : [{ x: 0, y: 0, w: VW, h: 680 }], uH: UROW.some(function (r) { return r; }) ? '46px' : '30px',
      blks: blks, rlLp: pv(0), rlRp: pv(rl), hnd: HND, uh: UH, bb: BB, shnd: SH, ufb: ufb,
      ubs: U.map(function (u, j) { var c = UCd(u.k), on = s.selU === j, ev = evalU(u, U.filter(function (o, q) { return q !== j; })); return { k: ulbl(u.k), l: pv(u.x), tp: UROW[j] ? '20px' : '4px', down: udown(j, false), c: c[2], bg: on ? c[2] : '#fff', p: on ? 'true' : 'false', sh: ev.worst === 'bad' ? '0 0 0 2px #b23a2e' : 'none', pick: function () { self.setState({ selU: j }); } }; }),
      isPlanZone: isPlanZone,
      pang: selT === 'park' ? [[0, '∥ Parallel'], [45, '45°'], [90, '90°']].map(function (v) { var cur = (els[cz][2] || {}).ang || 0; return { n: v[1], p: cur === v[0] ? 'true' : 'false', pick: function () { upd(function (E, i) { E[i][2].ang = v[0]; E[i][1] = { 0: 2.5, 45: 5.0, 90: 5.0 }[v[0]]; }); } }; }) : [],
      pangNote: selT === 'park' ? 'Dizayn-kod 6.3: ' + ANG[(els[cz][2] || {}).ang || 0][2] + '. Burchak oʻzgarsa, zona eni moslashadi.' : 'Elementni bosing — zonadagi birinchi boʻsh joyga qoʻyiladi.',
      padd: Object.keys(CAT).filter(function (k) { return CAT[k][1].indexOf(selT) >= 0; }).map(function (k) { return { n: CAT[k][0], src: CAT[k][3], pick: function () { var l = CAT[k][2]; var y = freeY(cz, l); updPL(function (N) { N.push({ t: k, z: cz, y: Math.round(y * 2) / 2, l: l }); }); } }; }),
      plist: PLs.map(function (p, j) { return { p: p, j: j }; }).filter(function (o) { return o.p.z === cz; }).map(function (o) { var p = o.p, j = o.j; return { n: CAT[p.t][0], pos: fm(p.y) + '–' + fm(p.y + p.l) + ' m · ' + CAT[p.t][3], up: function () { updPL(function (N) { N[j].y = Math.max(0, N[j].y - 1); }); }, dn: function () { updPL(function (N) { N[j].y = Math.min(LMg - N[j].l, N[j].y + 1); }); }, sh: function () { updPL(function (N) { N[j].l = Math.max(0.6, N[j].l - 1); }); }, lg: function () { updPL(function (N) { N[j].l = Math.min(LMg - N[j].y, N[j].l + 1); }); }, del: function () { updPL(function (N) { N.splice(j, 1); }); } }; }),
      plEmpty: PLs.filter(function (p) { return p.z === cz; }).length ? '' : 'Bu zonada joylangan element yoʻq.',
      isZone: s.selU < 0, isUtil: s.selU >= 0,
      z: { n: ct.n, c: ct.c, ic: ct.ic, w: fm(cur[1]) + ' m', pos: (s.sel + 1) + ' / ' + els.length + ' · ' + fm(zx[s.sel] ? zx[s.sel][0] : 0) + '–' + fm(zx[s.sel] ? zx[s.sel][1] : 0) + ' m', rule: RULE[cur[0]],
        items: (IT[cur[0]] || []).map(function (it) { var on = cf[it[0]] !== undefined ? !!cf[it[0]] : ((['odam', 'velochi', 'mashina', 'avtobus', 'tramvay'].indexOf(it[0]) >= 0 && cur[0] !== 'park') || (cur[0] === 'kanal' && (it[0] === 'panjara' || it[0] === 'bufer'))); return { n: it[1], src: it[2], c: on ? 'on' : '', tog: function () { upd(function (E, i) { var v = E[i][2][it[0]]; if (v === undefined) v = on; E[i][2][it[0]] = !v; }); } }; }) },
      /* harakat boʻlagi: yoʻnalish va strelka (rejada) */
      arw: (cur[0] === 'qat' || cur[0] === 'bus') ? 'x' : '',
      /* kanal: turi, qirgʻoq turi (NBS), suv sarfi va chuqurlik — meʼyor natijasi */
      knl: cur[0] === 'kanal' ? (function () { var KN = kNorm(cf), KB = kBank(cf, cur[1]), r = function (a) { return a ? (a[0] === a[1] ? fm(a[0]) : fm(a[0]) + '–' + fm(a[1])) + ' m' : '—'; };
        return { tur: [['kanal', 'Kanal'], ['daryo', 'Daryo']].map(function (v) { return { n: v[1], p: (cf.tur || 'kanal') === v[0] ? 'true' : 'false', pick: function () { upd(function (E, i) { E[i][2].tur = v[0]; }); } }; }),
          qir: [['devor', 'Beton devor'], ['zina', 'Zinapoya (oʻtiriladigan)'], ['yashil', 'Yashil qiya'], ['tosh', 'Tosh bilan mustahkamlangan'], ['botqoq', 'Botqoq tokcha (qamish)']].map(function (v) { return { n: v[1], p: KB.t === v[0] ? 'true' : 'false', pick: function () { upd(function (E, i) { E[i][2].qirgoq = v[0]; delete E[i][2].qiya; }); } }; }),
          q: fm(KN.q) + ' m³/s', dep: fm(KN.dep) + ' m',
          vz: KN.riv ? r(KN.vz) : (KN.vz ? r(KN.vz) + ' · ' + tr('faqat ichimlik-maishiy suv kanallari') : tr('belgilanmaydi (< 50 m³/s yoki ichimlik suvi kanali emas)')),
          pp: KN.riv ? tr('aholi punktida — bosh reja boʻyicha (30-band)') : (KN.pp ? r(KN.pp) + ' · ' + tr('suv chetidan, har tomonda') : '—'),
          src: KSRC, nbs: KB.t === 'devor' ? '' : tr('Tabiatga asoslangan yechim (NBS): qirgʻoq yashillanadi, suv bilan aloqa ochiladi, toshqin va issiqlik orolini yumshatadi.') }; })() : '',

      yonC: [['auto', 'Avto'], ['up', '↑ Yuqoriga'], ['down', '↓ Pastga']].map(function (v) { var on = ((cf.yon || 'auto') === v[0]); return { n: v[1], p: on ? 'true' : 'false', pick: function () { upd(function (E, i) { E[i][2].yon = v[0]; }); } }; }),
      manC: [['togri', 'Toʻgʻri', 'M12 20V5M7 10l5-5 5 5'], ['chap', 'Chapga burilish', 'M14 20v-9H6M10 7l-4 4 4 4'], ['ong', 'Oʻngga burilish', 'M10 20v-9h8M14 7l4 4-4 4'], ['togri_chap', 'Toʻgʻri + chapga', 'M14 20V5M10 9l4-4 4 4M14 14H7M10 11l-3 3 3 3'], ['togri_ong', 'Toʻgʻri + oʻngga', 'M10 20V5M6 9l4-4 4 4M10 14h7M14 11l3 3-3 3'], ['yoq', 'Yoʻq', 'M6 6l12 12M18 6L6 18']].map(function (v) { var on = ((cf.man || 'togri') === v[0]); return { n: v[1], ic: v[2], p: on ? 'true' : 'false', pick: function () { upd(function (E, i) { E[i][2].man = v[0]; }); } }; }),
      wDn: function () { upd(function (E, i) { E[i][1] = Math.max(0.3, Math.round((E[i][1] - 0.05) * 100) / 100); }); }, wUp: function () { upd(function (E, i) { E[i][1] = Math.round((E[i][1] + 0.05) * 100) / 100; }); },
      mvL: function () { upd(function (E, i) { if (i > 0) { var t = E[i]; E[i] = E[i - 1]; E[i - 1] = t; return { sel: i - 1, PL: remapPL(function (z) { return z === i ? i - 1 : z === i - 1 ? i : z; }) }; } }); }, mvR: function () { upd(function (E, i) { if (i < E.length - 1) { var t = E[i]; E[i] = E[i + 1]; E[i + 1] = t; return { sel: i + 1, PL: remapPL(function (z) { return z === i ? i + 1 : z === i + 1 ? i : z; }) }; } }); },
      dup: function () { upd(function (E, i) { E.splice(i + 1, 0, [E[i][0], E[i][1], Object.assign({}, E[i][2])]); return { sel: i + 1, PL: remapPL(function (z) { return z > i ? z + 1 : z; }) }; }); },
      del: function () { upd(function (E, i) { if (E.length > 1) { E.splice(i, 1); return { sel: Math.max(0, i - 1), PL: remapPL(function (z) { return z === i ? -1 : z > i ? z - 1 : z; }) }; } }); },
      adds: Object.keys(T).map(function (k) { return { n: T[k].s, c: T[k].c, pick: function () { upd(function (E, i) { E.splice(i + 1, 0, [k, k === 'qat' || k === 'bus' ? 3.5 : (k === 'tram' ? 3.1 : (k === 'mebel' ? 0.6 : k === 'ariq' ? 1 : k === 'kanal' ? 6 : 1.5)), defItems(k)]); return { sel: i + 1, PL: remapPL(function (z) { return z > i ? z + 1 : z; }) }; }); } }; }),
      u: su ? { k: ulbl(su.k), n: suc[1], c: suc[2], x: fm(su.x) + ' m', d: fm(su.d) + ' m', zone: 'Ostida: ' + (szt === 'setback' ? 'qizil chiziqdan tashqari (qurilish oldi)' : T[szt].n), rows: sev.rows } : { k: '', n: '', c: '#000', x: '', d: '', zone: '', rows: [] },
      uxD: function () { updU(function (N, j) { N[j].x = Math.max(-SB, Math.round((N[j].x - 0.1) * 10) / 10); }); }, uxU: function () { updU(function (N, j) { N[j].x = Math.min(self.state.rl + SB, Math.round((N[j].x + 0.1) * 10) / 10); }); },
      udD: function () { updU(function (N, j) { N[j].d = Math.max(0.5, Math.round((N[j].d - 0.1) * 10) / 10); }); }, udU: function () { updU(function (N, j) { N[j].d = Math.round((N[j].d + 0.1) * 10) / 10; }); },
      ulL: function () { updU(function (N, j) { N[j].x = Math.max(-SB, Math.round((N[j].x - 0.5) * 10) / 10); }); }, ulR: function () { updU(function (N, j) { N[j].x = Math.min(self.state.rl + SB, Math.round((N[j].x + 0.5) * 10) / 10); }); },
      find: function () { updU(function (N, j) { N[j].x = place(N[j].k, N.filter(function (o, q) { return q !== j; })); }); },
      udel: function () { updU(function (N, j) { N.splice(j, 1); return { selU: -1 }; }); }, back: function () { self.setState({ selU: -1 }); },
      ucat: UC.map(function (c) { var n = U.filter(function (u) { return u.k === c[0]; }).length; return { k: ulbl(c[0]), n: c[1], c: c[2], f: '≥' + fm(c[4]), has: n ? '✓' : '', add: function () { var N = self.state.U.map(function (u) { return Object.assign({}, u); }); N.push({ k: c[0], x: place(c[0], N), d: c[3] }); self.setState({ U: N, selU: N.length - 1, showU: true }); } }; })
    };
    })();
    return __split(__r);
  }
}
