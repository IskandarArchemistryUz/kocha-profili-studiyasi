// @ts-nocheck
/* Koʻchasoz · KS-A — kanvas maketidagi (Archemistry Lab, «Koʻchasoz» sahifasi, KS-A.dc.html) mantiq aynan koʻchirilgan.
   Hisob-kitob va chizma shu yerda; qobiq, saqlash, til va tungi rejim — ../dc.ts va ../main.ts. */
import { DCLogic } from '../dc';
export default class Component extends DCLogic {
  constructor(p) { super(p); this.state = {"S": [{"n": "Shahar magistrali A", "k": "sh2", "p": [[0, 420], [1500, 420]], "st": [180, 700, 1250], "cx": [], "lab": 0.13}, {"n": "Magistral B · tramvay", "k": "sh1", "p": [[1060, 0], [1060, 1600]], "st": [300, 950, 1460], "cx": [], "tr": 1, "lab": 0.05}, {"n": "Tuman koʻchasi 1", "k": "tm", "p": [[0, 1150], [1500, 1150]], "st": [500, 1300], "cx": [], "lab": 0.13}, {"n": "Tuman koʻchasi 2", "k": "tm", "p": [[380, 0], [380, 1600]], "cx": [], "lab": 0.05, "st": []}, {"n": "Mahalla 1", "k": "mh", "p": [[0, 150], [1500, 150]], "cx": [], "st": []}, {"n": "Mahalla 2", "k": "mh", "p": [[150, 0], [150, 1600]], "cx": [], "st": []}, {"n": "Mahalla 3", "k": "mh", "p": [[600, 150], [600, 1150]], "cx": [], "st": []}, {"n": "Mahalla 4", "k": "mh", "p": [[380, 640], [1060, 640]], "cx": [], "st": []}, {"n": "Mahalla 5", "k": "mh", "p": [[380, 880], [600, 880]], "cx": [], "st": []}, {"n": "Mahalla 6", "k": "mh", "p": [[1300, 150], [1300, 1600]], "cx": [], "st": []}, {"n": "Mahalla 7", "k": "mh", "p": [[0, 1380], [1500, 1380]], "cx": [], "st": []}, {"n": "Berk koʻcha 1", "k": "mh", "p": [[820, 1150], [820, 1320]], "cx": [], "st": []}, {"n": "Berk koʻcha 2", "k": "mh", "p": [[150, 760], [290, 760]], "cx": [], "st": []}, {"n": "Piyoda koʻchasi", "k": "pd", "p": [[820, 420], [820, 640]], "lab": 0.5, "cx": [], "st": []}], "park": [[[162, 892], [368, 892], [368, 1138], [162, 1138]]], "sel": -1, "lX": true, "lS": true, "lCov": false}; }
  renderVals() {
    var s = this.state, self = this;

    function __split(r) { Object.keys(r).forEach(function (k) { var v = r[k]; if (!Array.isArray(v) || !/(txt|T)$/.test(k)) return; r[k + '_m'] = v.filter(function (t) { return !t.a || t.a === 'middle'; }); r[k + '_s'] = v.filter(function (t) { return t.a === 'start'; }); r[k + '_e'] = v.filter(function (t) { return t.a === 'end'; }); }); return r; }
    var __r = (function () {

    var DC = { ok: '#2b7449', warn: '#c98a12', bad: '#b23a2e' };
    function fm(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
    var CL = { sh1: ['Shahar 1', '#3b49c4', 1], sh2: ['Shahar 2', '#4c5bd4', 1], tm: ['Tuman', '#8a96ff', 1], mh: ['Mahalliy', '#c4c6d0', 0], pd: ['Piyoda', '#e0a43c', 0] };
    var draw = [], txt = [], hit = [];
    function add(d, f, st, w, o, da, lc) { draw.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '', lc: lc || 'round' }); }
    function tx(x, y, t, fs, c, fw, an, ff) { txt.push({ x: x.toFixed(1), y: y.toFixed(1), t: t, fs: fs || 10, c: c || '#141414', fw: fw || 400, a: an || 'middle', ff: ff || 'Archivo, sans-serif' }); }
    var px = 0.5, OX = 17, OY = 18;
    function X(m) { return OX + m * px; } function Y(m) { return OY + m * px; }
    var S = s.S, AW = 1500, AH = 1600, AREA = AW * AH / 1e6;
    function len(q) { return Math.hypot(q.p[1][0] - q.p[0][0], q.p[1][1] - q.p[0][1]); }
    function at(q, t) { var L0 = len(q); return [q.p[0][0] + (q.p[1][0] - q.p[0][0]) * t / L0, q.p[0][1] + (q.p[1][1] - q.p[0][1]) * t / L0]; }
    function inter(a, b) { var p = a.p[0], r = [a.p[1][0] - p[0], a.p[1][1] - p[1]], q = b.p[0], sv = [b.p[1][0] - q[0], b.p[1][1] - q[1]]; var den = r[0] * sv[1] - r[1] * sv[0]; if (Math.abs(den) < 1e-9) return null; var t = ((q[0] - p[0]) * sv[1] - (q[1] - p[1]) * sv[0]) / den, u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / den; if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null; return [t * len(a), u * len(b)]; }
    var IX = S.map(function () { return []; }), nodes = {};
    S.forEach(function (a, i) { S.forEach(function (b, j) { if (j <= i) return; var r = inter(a, b); if (!r) return; IX[i].push(r[0]); IX[j].push(r[1]); var pt = at(a, r[0]); nodes[Math.round(pt[0]) + ',' + Math.round(pt[1])] = 1; }); });
    var W = { sh1: 47, sh2: 39, tm: 35, mh: 20, pd: 21 };
    // fon
    add('M' + X(0) + ' ' + Y(0) + 'H' + X(AW) + 'V' + Y(AH) + 'H' + X(0) + 'Z', '#efeee9', '#d6d3cc', 1);
    s.park.forEach(function (pg) { add('M' + pg.map(function (p) { return X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('L') + 'Z', '#d3e4c6', null, 0); tx(X((pg[0][0] + pg[2][0]) / 2), Y((pg[0][1] + pg[2][1]) / 2) + 3, 'Bogʻ', 9, '#4f7f5a', 600); });
    // qamrov: bekatlardan 400 m
    var stopsXY = []; S.forEach(function (q) { (q.st || []).forEach(function (t) { stopsXY.push(at(q, t)); }); });
    var cov = 0, tot = 0, unc = '';
    for (var gx = 25; gx < AW; gx += 50) for (var gy = 25; gy < AH; gy += 50) { var inPark = s.park.some(function (pg) { return gx > pg[0][0] && gx < pg[2][0] && gy > pg[0][1] && gy < pg[2][1]; }); if (inPark) continue; tot++; var ok = stopsXY.some(function (p) { return Math.hypot(p[0] - gx, p[1] - gy) <= 400; }); if (ok) cov++; else unc += 'M' + (X(gx) - 1.2).toFixed(1) + ' ' + Y(gy).toFixed(1) + 'a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0'; }
    if (s.lCov) { stopsXY.forEach(function (p) { add('M' + (X(p[0]) - 200) + ' ' + Y(p[1]) + 'a200 200 0 1 0 400 0a200 200 0 1 0 -400 0', '#4c5bd4', null, 0, 0.05); add('M' + (X(p[0]) - 200) + ' ' + Y(p[1]) + 'a200 200 0 1 0 400 0a200 200 0 1 0 -400 0', null, '#4c5bd4', 0.6, 0.35, '3 4'); }); if (unc) add(unc, '#c98a12', null, 0, 0.75); }
    add('M0 0H784V' + Y(0) + 'H0Z' + 'M0 ' + Y(AH) + 'H784V860H0Z' + 'M0 0H' + X(0) + 'V860H0Z' + 'M' + X(AW) + ' 0H784V860H' + X(AW) + 'Z', '#ffffff', null, 0);
    add('M' + X(0) + ' ' + Y(0) + 'H' + X(AW) + 'V' + Y(AH) + 'H' + X(0) + 'Z', null, '#bdb9b1', 1);
    // koʻchalar
    var order = ['mh', 'pd', 'tm', 'sh2', 'sh1'];
    var sorted = S.map(function (q, i) { return i; }).sort(function (a, b) { return order.indexOf(S[a].k) - order.indexOf(S[b].k); });
    sorted.forEach(function (i) { var q = S[i], c = CL[q.k], d = 'M' + X(q.p[0][0]) + ' ' + Y(q.p[0][1]) + 'L' + X(q.p[1][0]) + ' ' + Y(q.p[1][1]), w = W[q.k] * px;
      add(d, null, '#ffffff', w + 3, 1, '', 'butt');
      add(d, null, c[1], w, q.k === 'pd' ? 0.55 : 0.9, '', 'butt');
      if (q.k === 'pd') add(d, null, '#ffffff', 1, 0.9, '2 3', 'butt');
      if (s.sel === i) add(d, null, '#141414', w + 5, 0.25, '', 'butt');
      hit.push({ d: d, pick: (function (ii) { return function () { self.setState({ sel: ii }); }; })(i) }); });
    // tupik
    var R0 = [];
    function chk(st, n, src, v) { R0.push({ st: st, n: n, src: src, v: v, c: DC[st] }); }
    var dead = [];
    S.forEach(function (q, i) { [0, 1].forEach(function (e) { var tEnd = e ? len(q) : 0, pe = q.p[e]; var onEdge = pe[0] <= 0 || pe[0] >= AW || pe[1] <= 0 || pe[1] >= AH; var conn = IX[i].some(function (t) { return Math.abs(t - tEnd) < 1; }); if (!onEdge && !conn) { var ds = IX[i].length ? Math.min.apply(null, IX[i].map(function (t) { return Math.abs(t - tEnd); })) : len(q); dead.push({ i: i, l: ds, p: pe }); add('M' + (X(pe[0]) - 7.5) + ' ' + Y(pe[1]) + 'a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0 -15 0', ds > 150 ? '#f3d6d2' : '#ece8df', ds > 150 ? '#b23a2e' : '#8f8a80', 1); } }); });
    // oʻtish joylari
    var gapsBad = 0, gapsMax = 0;
    S.forEach(function (q, i) { if (!CL[q.k][2]) return; var L0 = len(q), pts = IX[i].slice().concat(q.cx || []).sort(function (a, b) { return a - b; });
      var full = [0].concat(pts).concat([L0]);
      for (var g = 0; g < full.length - 1; g++) { var a = full[g], b = full[g + 1], edge = g === 0 || g === full.length - 2, gap = b - a; if (!edge) gapsMax = Math.max(gapsMax, gap); if (!edge && gap > 500) { gapsBad++; if (s.lX) { var pa = at(q, a), pb = at(q, b); add('M' + X(pa[0]) + ' ' + Y(pa[1]) + 'L' + X(pb[0]) + ' ' + Y(pb[1]), null, '#b23a2e', 3, 0.9, '6 4', 'butt'); var pm = at(q, (a + b) / 2); tx(X(pm[0]) + 6, Y(pm[1]) - 6, Math.round(gap) + ' m', 8.5, '#b23a2e', 700, 'start', 'IBM Plex Mono, monospace'); } } }
      if (s.lX) pts.forEach(function (t, k) { var p = at(q, t), hz = Math.abs(q.p[1][1] - q.p[0][1]) < 1, w = W[q.k] * px / 2 + 2, mid = (q.cx || []).indexOf(t) >= 0; add(hz ? 'M' + (X(p[0]) - 2.5) + ' ' + (Y(p[1]) - w) + 'h5v' + (2 * w) + 'h-5Z' : 'M' + (X(p[0]) - w) + ' ' + (Y(p[1]) - 2.5) + 'h' + (2 * w) + 'v5h' + (-2 * w) + 'Z', '#ffffff', mid ? '#4c5bd4' : '#141414', mid ? 1.4 : 0.8); }); });
    // bekatlar
    var stopBad = 0, stopNear = 0, stopsN = 0;
    S.forEach(function (q, i) { var st = (q.st || []).slice().sort(function (a, b) { return a - b; }); stopsN += st.length; for (var g = 0; g < st.length - 1; g++) { var gap = st[g + 1] - st[g]; if (gap > 600 || gap < 400) { stopBad++; if (s.lS) { var pa = at(q, st[g]), pb = at(q, st[g + 1]), pm = at(q, (st[g] + st[g + 1]) / 2); tx(X(pm[0]) - 6, Y(pm[1]) + 14, 'bekatlar ' + Math.round(gap) + ' m', 8, gap > 600 ? '#b23a2e' : '#c98a12', 700, 'end', 'IBM Plex Mono, monospace'); } } }
      st.forEach(function (t) { var near = IX[i].some(function (u) { return Math.abs(u - t) < 20; }); if (near) stopNear++; if (!s.lS) return; var p = at(q, t), hz = Math.abs(q.p[1][1] - q.p[0][1]) < 1, o = W[q.k] * px / 2 + 7; var bx = hz ? X(p[0]) : X(p[0]) + o, by = hz ? Y(p[1]) - o : Y(p[1]); add('M' + (bx - 6) + ' ' + (by - 6) + 'h12v12h-12Z', near ? '#b23a2e' : '#141414', '#ffffff', 1.2); tx(bx, by + 3.2, q.tr ? 'T' : 'A', 8, '#ffffff', 700); }); });
    // nomlar
    S.forEach(function (q, i) { if (!q.lab) return; var p = at(q, len(q) * q.lab), hz = Math.abs(q.p[1][1] - q.p[0][1]) < 1; tx(X(p[0]) + (hz ? 0 : W[q.k] * px / 2 + 5), Y(p[1]) + (hz ? -(W[q.k] * px / 2 + 5) : 3), q.n, 9, '#3a3936', 600, hz ? 'middle' : 'start'); });
    // metrikalar
    var magL = 0, trL = 0, allL = 0; S.forEach(function (q) { var l = len(q) / 1000; allL += l; if (q.k === 'sh1' || q.k === 'sh2' || q.k === 'tm') magL += l; if ((q.st || []).length) trL += l; });
    var magD = magL / AREA, trD = trL / AREA, covP = tot ? cov / tot * 100 : 0, nN = Object.keys(nodes).length;
    chk(magD >= 2.2 && magD <= 2.4 ? 'ok' : 'warn', 'Magistral tarmoq zichligi 2,2–2,4 km/km²', 'ShNQ 2.07.01-23, 314-band', fm(magD));
    chk(trD >= 1.5 && trD <= 2.5 ? 'ok' : 'warn', 'Jamoat transporti yoʻnalishlari zichligi 1,5–2,5', 'ShNQ 2.07.01-23, 379-band', fm(trD) + ' km/km²');
    chk(covP >= 99 ? 'ok' : (covP >= 85 ? 'warn' : 'bad'), 'Bekatgacha ≤ 400 m', 'ShNQ 2.07.01-23, 382-band', Math.round(covP) + ' %');
    chk(stopBad ? 'bad' : 'ok', 'Bekatlar oraligʻi 400–600 m', 'ShNQ 2.07.01-23, 384 · 2.07.06-24, 26-band', stopBad ? stopBad + ' ta oraliq' : 'mos');
    chk(stopNear ? 'warn' : 'ok', 'Bekat chorrahadan ≥ 20 m', 'ShNQ 2.07.01-23, 393-band', stopNear ? stopNear + ' ta' : 'mos');
    chk(gapsBad ? 'bad' : 'ok', 'Oʻtish joylari oraligʻi ≤ 500 m', 'ShNQ 2.07.06-24, 12-band', gapsBad ? gapsBad + ' ta · max ' + Math.round(gapsMax) + ' m' : 'max ' + Math.round(gapsMax) + ' m');
    var deadBad = dead.filter(function (d) { return d.l > 150; }).length;
    chk(deadBad ? 'bad' : 'ok', 'Berk koʻcha ≤ 150 m, oxirida R ≥ 15 m maydon', 'ShNQ 2.07.06-24, 57 va 106-band', dead.length + ' ta · ' + (deadBad ? deadBad + ' ta uzun' : 'mos'));
    var nOk = R0.filter(function (r) { return r.st === 'ok'; }).length;
    // masshtab
    var SY = 840; [0, 1, 2, 3, 4].forEach(function (k2) { add('M' + (17 + k2 * 50 * px) + ' ' + SY + 'h' + (50 * px) + 'v4h' + (-50 * px) + 'Z', k2 % 2 ? '#ffffff' : '#2f2e2b', '#2f2e2b', 0.6); }); tx(17, SY - 4, '0', 7.5, '#2f2e2b', 400, 'start'); tx(17 + 250 * px, SY - 4, '250 m', 7.5, '#2f2e2b', 400, 'middle'); tx(767, SY + 4, 'Archemistry Lab · Koʻchasoz A · namuna hudud', 7.5, '#8f8a80', 400, 'end');
    // tanlangan
    var q0 = s.sel >= 0 ? S[s.sel] : null;
    function updS(fn) { var N = self.state.S.map(function (q) { return Object.assign({}, q, { cx: (q.cx || []).slice(), st: (q.st || []).slice() }); }); fn(N[self.state.sel]); self.setState({ S: N }); }
    function bigGap(q, i, arr) { var L0 = len(q), pts = [0].concat(arr.slice().sort(function (a, b) { return a - b; })).concat([L0]), best = 0, bt = L0 / 2; for (var g = 0; g < pts.length - 1; g++) { if (pts[g + 1] - pts[g] > best) { best = pts[g + 1] - pts[g]; bt = (pts[g] + pts[g + 1]) / 2; } } return Math.round(bt); }
    var sel = q0 ? { n: q0.n, info: CL[q0.k][0] + ' · ' + Math.round(len(q0)) + ' m · ' + (W[q0.k]) + ' m qizil chiziqlar orasi',
      cls: Object.keys(CL).map(function (k) { return { n: CL[k][0], p: q0.k === k ? 'true' : 'false', pick: function () { updS(function (q) { q.k = k; }); } }; }),
      rows: [['Kesishmalar', String(IX[s.sel].length), '#141414'], ['Qoʻshimcha oʻtish joylari', String((q0.cx || []).length), '#141414'], ['Bekatlar', String((q0.st || []).length), '#141414'], ['Kesimi (B)', { sh1: 'Magistral · tramvayli', sh2: 'Avtobus koridori', tm: 'Tuman koʻchasi', mh: 'Mahalla koʻchasi', pd: 'Piyoda koʻchasi' }[q0.k], '#4c5bd4']].map(function (r) { return { n: r[0], v: r[1], c: r[2] }; }),
      addX: function () { updS(function (q) { q.cx.push(bigGap(q, 0, IX[self.state.sel].concat(q.cx))); }); }, addS: function () { var ix = IX[self.state.sel]; updS(function (q) { var L0 = len(q), n = Math.max(1, Math.round(L0 / 500)), out = []; for (var k2 = 0; k2 < n; k2++) { var tt = L0 / n * (k2 + 0.5); ix.forEach(function (u) { if (Math.abs(u - tt) < 25) tt = u + 25; }); out.push(Math.round(tt)); } q.st = out; }); }, clr: function () { updS(function (q) { q.cx = []; q.st = []; }); } } : { n: '', info: '', cls: [], rows: [], addX: null, addS: null, clr: null };
    return {
      modes: [['A', 'Tarmoq'], ['B', 'Kesim'], ['C', 'Chorraha'], ['D', 'Koʻcha muhiti'], ['E', 'Mikromodel']].map(function (m, i) { return { k: m[0], n: m[1], p: i === 0 ? 'true' : 'false' }; }),
      nStreets: S.length, draw: draw, txt: txt, hit: hit, hasSel: !!q0, sel: sel, unsel: function () { self.setState({ sel: -1 }); },
      lay: [['lX', 'Oʻtish joylari', '12-band'], ['lS', 'Bekatlar', '384-band'], ['lCov', '400 m qamrov', '382-band']].map(function (o) { return { n: o[1], src: o[2], c: s[o[0]] ? 'on' : '', tog: function () { var p = {}; p[o[0]] = !self.state[o[0]]; self.setState(p); } }; }),
      mets: [['Koʻchalar uzunligi', fm(allL) + ' km', '#141414'], ['Magistral zichligi', fm(magD) + ' km/km²', '#141414'], ['Transport yoʻnalishlari', fm(trD) + ' km/km²', '#141414'], ['Kesishmalar', nN + ' ta · ' + fm(nN / AREA) + ' /km²', '#141414'], ['Bekatlar', stopsN + ' ta', '#141414'], ['400 m qamrov', Math.round(covP) + ' %', covP >= 99 ? DC.ok : DC.warn], ['Berk koʻchalar', dead.length + ' ta', deadBad ? DC.bad : '#141414']].map(function (l) { return { n: l[0], v: l[1], c: l[2] }; }),
      leg: [['sh1', 'Shahar magistrali 1', '6px'], ['sh2', 'Shahar magistrali 2', '5px'], ['tm', 'Tuman magistrali', '4px'], ['mh', 'Mahalliy koʻcha', '3px'], ['pd', 'Piyoda koʻchasi', '3px']].map(function (l) { return { n: l[1], c: CL[l[0]][1], h: l[2] }; }),
      checks: R0, okCount: nOk + ' / ' + R0.length
    };
    })();
    return __split(__r);
  }
}
