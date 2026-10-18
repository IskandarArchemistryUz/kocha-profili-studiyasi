// @ts-nocheck
/* Koʻchasoz · KS-E — kanvas maketidagi (Archemistry Lab, «Koʻchasoz» sahifasi, KS-E.dc.html) mantiq aynan koʻchirilgan.
   Hisob-kitob va chizma shu yerda; qobiq, saqlash, til va tungi rejim — ../dc.ts va ../main.ts. */
import { DCLogic } from '../dc';
export default class Component extends DCLogic {
  constructor(p) { super(p); this.state = {"L": 950, "nb": 3, "vf": 25, "qE": 260, "qW": 220, "D": 1600, "dly": 45, "scn": 0, "t": 900}; }
  renderVals() {
    var s = this.state, self = this;

    function __split(r) { Object.keys(r).forEach(function (k) { var v = r[k]; if (!Array.isArray(v) || !/(txt|T)$/.test(k)) return; r[k + '_m'] = v.filter(function (t) { return !t.a || t.a === 'middle'; }); r[k + '_s'] = v.filter(function (t) { return t.a === 'start'; }); r[k + '_e'] = v.filter(function (t) { return t.a === 'end'; }); }); return r; }
    var __r = (function () {

    function fm(v, d) { var k = Math.pow(10, d == null ? 1 : d); return String(Math.round(v * k) / k).replace('.', ','); }
    var P = { L: s.L, nb: s.nb, vf: s.vf, qE: s.qE, qW: s.qW, D: s.D, dly: s.dly };
    function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    // ===== simulyatsiya =====
    function sim(mode) {
      var L = P.L, vf = P.vf / 3.6, nb = mode === 0 ? P.nb : 0, WARM = 300, T = WARM + 3600, GAP = 7.5, BAYCAP = 5, COURT = 60;
      var R = rng(20261017 + mode), bnd = [0]; for (var k = 1; k <= nb; k++) bnd.push(L * k / (nb + 1)); bnd.push(L);
      var NB = bnd.length - 1, occ = []; for (var j = 0; j < NB; j++) occ.push([0, 0]);
      var veh = [], done = [], qmax = [0, 0], waitReq = {}, id = 0, gridlock = 0, still = 0;
      var useW = mode !== 1, shared = mode === 0;
      function prog(v) { return v.d > 0 ? v.x : L - v.x; }
      function blkOf(p, d) { for (var j = 0; j < NB; j++) { var a = d > 0 ? bnd[j] : L - bnd[j + 1], b = d > 0 ? bnd[j + 1] : L - bnd[j]; if (p >= a - 1e-6 && p < b - 1e-6) return d > 0 ? j : j; } return NB - 1; }
      // yoʻnalish boʻyicha progress chegaralari
      function pB(d, n) { return d > 0 ? bnd[n] : L - bnd[NB - n]; } // n-chi chegara (0..NB) progress koordinatasida
      function physBlk(d, n) { return d > 0 ? n : NB - 1 - n; } // progress blok n → fizik blok
      var bay = []; for (var bb = 0; bb <= NB; bb++) bay.push([0, 0]);
      function capFull(blk, di) { var far = di === 0 ? blk + 1 : blk; var oppAny = occ.some(function (q) { return q[1 - di] > 0; }); return oppAny && far > 0 && far < NB && bay[far][di] + occ[blk][di] >= BAYCAP; }
      function blocked(blk, di, myT) { var o = occ[blk][1 - di], req = waitReq[blk + '_' + (1 - di)]; if (o > 0) return true; if (capFull(blk, di)) return true; if (req != null && capFull(blk, 1 - di)) req = null; if (req == null) return false; if (occ[blk][di] > 0) return t - req > COURT; return req < myT; }
      for (var t = 0; t < T; t++) {
        // kelish
        [[1, P.qE], [-1, useW ? P.qW : 0]].forEach(function (a) { if (R() < a[1] / 3600) veh.push({ id: id++, d: a[0], p: -1, v: 0, t0: t, n: -1, wait: t, st: 0, tr: [] }); });
        var moved = 0; waitReq = {}; veh.forEach(function (v) { if (v.want != null) { var k = v.want + '_' + (v.d > 0 ? 0 : 1); if (waitReq[k] == null || v.wq < waitReq[k]) waitReq[k] = v.wq; } });
        (t % 2 ? [1, -1] : [-1, 1]).forEach(function (d) {
          var di = d > 0 ? 0 : 1, list = veh.filter(function (v) { return v.d === d; }).sort(function (a, b) { return b.p - a.p || a.id - b.id; });
          var q = list.filter(function (v) { return v.p < 0; }).length; if (t >= WARM) qmax[di] = Math.max(qmax[di], q);
          for (var i = 0; i < list.length; i++) {
            var v = list[i], lead = null; for (var jj = i - 1; jj >= 0; jj--) { if (list[jj].bay == null || v.p < 0) { lead = list[jj]; break; } } var gap = lead ? (lead.p < 0 ? -99 : lead.p - Math.max(0, v.p)) : 1e9; if (v.bay != null) gap = 1e9;
            if (v.p < 0) { // kirish navbati
              if (lead && lead.p < GAP) continue;
              var pb0 = physBlk(d, 0);
              if (shared && blocked(pb0, di, v.wq != null ? v.wq : t)) { if (v.want == null) { v.want = pb0; v.wq = t; } continue; }
              if (shared) occ[pb0][di]++; v.p = 0; v.n = 0; v.v = 0; v.want = null; v.wq = null; moved++; continue;
            }
            var nextB = pB(d, v.n + 1), needStop = false, nb2 = v.n + 1 < NB ? physBlk(d, v.n + 1) : -1;
            if (nb2 >= 0 && shared) needStop = blocked(nb2, di, v.want === nb2 ? v.wq : t);
            var adv = Math.min(vf, Math.max(0, gap - GAP));
            if (v.v < vf) adv = Math.min(adv, v.v + 2.5);
            var np = v.p + adv;
            if (np >= nextB - 1e-6) {
              if (v.n + 1 >= NB) { v.done = t; done.push(v); v.p = L + 1; if (shared) occ[physBlk(d, v.n)][di]--; moved++; continue; }
              var bi = d > 0 ? v.n + 1 : NB - (v.n + 1);
              if (needStop) { np = nextB; if (v.want == null) { v.want = nb2; v.wq = t; } if (v.bay == null && bay[bi][di] < BAYCAP) { bay[bi][di]++; occ[physBlk(d, v.n)][di]--; v.bay = bi; } }
              else { if (shared) { if (v.bay != null) { bay[v.bay][di]--; v.bay = null; } else occ[physBlk(d, v.n)][di]--; occ[nb2][di]++; } v.want = null; v.wq = null; v.n++; }
            }
            if (np > v.p + 0.01) moved++;
            v.v = np - v.p; v.p = np;
          }
        });
        veh = veh.filter(function (v) { return v.p <= L; });
        if (veh.length && !moved && veh.some(function (v) { return v.p >= 0; })) { still++; if (still > 120) gridlock++; } else still = 0;
        if (t % 2 === 0) veh.forEach(function (v) { if (v.p >= 0) v.tr.push([t, v.d > 0 ? v.p : L - v.p, v.v < 0.3 ? 1 : 0]); });
      }
      var res = [0, 1].map(function (di) { var arr = done.filter(function (v) { return (v.d > 0 ? 0 : 1) === di && v.t0 >= WARM; }).map(function (v) { return v.done - v.t0; }).sort(function (a, b) { return a - b; }); var n = arr.length, mean = n ? arr.reduce(function (a, b) { return a + b; }, 0) / n : 0; return { n: n, mean: mean, p95: n ? arr[Math.floor(n * 0.95)] : 0, q: qmax[di] }; });
      if (mode === 1) { var tw = P.D / (30 / 3.6) + P.dly; res[1] = { n: Math.round(P.qW), mean: tw, p95: tw * 1.25, q: 0, det: true }; }
      return { res: res, done: done.concat(veh), bnd: bnd, grid: gridlock, free: L / vf };
    }
    var key = JSON.stringify(P);
    if (!self._sc || self._sc.k !== key) self._sc = { k: key, r: [sim(0), sim(1), sim(2)] };
    var S3 = self._sc.r, cur = S3[s.scn];
    // ===== chizma =====
    var draw = [], txt = [];
    function add(d, f, st, w, o, da) { draw.push({ d: d, f: f || 'none', s: st || 'none', w: w || 0, o: o == null ? 1 : o, da: da || '' }); }
    function tx(x, y, t, fs, c, fw, an, ff) { txt.push({ x: x.toFixed(1), y: y.toFixed(1), t: t, fs: fs || 10, c: c || '#141414', fw: fw || 400, a: an || 'start', ff: ff || 'Archivo, sans-serif' }); }
    var CE = '#4c5bd4', CW = '#c0643a', INK = '#2f2e2b', LIGHT = '#8f8a80', L = P.L, X0 = 40, X1 = 744, kx = (X1 - X0) / L, now = 300 + s.t;
    tx(20, 26, ['Hozirgi holat: ikki tomonlama, bitta tor boʻlak', 'Bir tomonlama (sharqqa)', 'Ikki tomonlama, turargohsiz (2 boʻlak)'][s.scn], 13, '#141414', 700); tx(20, 41, 'Koʻcha ' + L + ' m · ' + P.nb + ' ta oʻtish choʻntagi · ' + P.vf + ' km/h', 9.5, LIGHT);
    // 1) koʻcha surati
    var SY = 92; add('M' + X0 + ' ' + (SY - 14) + 'H' + X1 + 'V' + (SY + 14) + 'H' + X0 + 'Z', '#d2d3d7', null, 0);
    add('M' + X0 + ' ' + (SY - 22) + 'H' + X1 + 'V' + (SY - 14) + 'H' + X0 + 'Z', '#ece8df', null, 0); add('M' + X0 + ' ' + (SY + 14) + 'H' + X1 + 'V' + (SY + 22) + 'H' + X0 + 'Z', '#ece8df', null, 0);
    if (s.scn !== 2) for (var px2 = X0 + 4; px2 < X1 - 8; px2 += 6.5 * kx) { var inBay = cur.bnd.some(function (b, i) { return i > 0 && i < cur.bnd.length - 1 && Math.abs(X0 + b * kx - px2) < 12; }); if (!inBay) add('M' + px2 + ' ' + (SY + 6) + 'h' + (4.6 * kx) + 'v7h' + (-4.6 * kx) + 'Z', '#b9b5ad', null, 0); }
    if (s.scn === 0) cur.bnd.forEach(function (b, i) { if (i === 0 || i === cur.bnd.length - 1) return; var x = X0 + b * kx; add('M' + (x - 12) + ' ' + (SY + 14) + 'h24v8h-24Z', '#d2d3d7', null, 0); add('M' + x + ' ' + (SY - 30) + 'v6', null, LIGHT, 1); tx(x, SY - 33, 'choʻntak', 7.5, LIGHT, 400, 'middle'); });
    if (s.scn === 1) for (var ax = X0 + 40; ax < X1; ax += 90) add('M' + ax + ' ' + SY + 'h14M' + (ax + 10) + ' ' + (SY - 4) + 'l4 4-4 4', null, '#ffffff', 1.4);
    else if (s.scn === 2) add('M' + X0 + ' ' + SY + 'H' + X1, null, '#ffffff', 1, 1, '8 6');
    tx(X0, SY + 38, 'Jahonbaxsh tomoni', 8.5, LIGHT); tx(X1, SY + 38, 'Rustaveli tomoni', 8.5, LIGHT, 400, 'end');
    var onNow = cur.done.filter(function (v) { return v.t0 <= now && (v.done == null || v.done > now); });
    var qE = 0, qW = 0;
    onNow.forEach(function (v) { var pt = null; for (var i = 0; i < v.tr.length; i++) { if (v.tr[i][0] <= now) pt = v.tr[i]; else break; } var c = v.d > 0 ? CE : CW; if (!pt || v.tr.length && v.tr[0][0] > now) { if (v.d > 0) { qE++; } else { qW++; } return; } var x = X0 + pt[1] * kx, y = s.scn === 2 ? (v.d > 0 ? SY + 5 : SY - 5) : SY + (s.scn === 0 && cur.bnd.some(function (b, i) { return i > 0 && i < cur.bnd.length - 1 && Math.abs(b - pt[1]) < 3; }) && v.d < 0 ? 12 : 0); add('M' + (x - 4.5) + ' ' + (y - 3) + 'h9v6h-9Z', c, pt[2] ? '#b23a2e' : '#ffffff', pt[2] ? 1.4 : 0.6); });
    for (var qi = 0; qi < Math.min(qE, 14); qi++) add('M' + (X0 - 14 - qi * 0) + ' ' + (SY - 6 + qi * 0) + 'h0', null, null, 0);
    if (qE) { add('M8 ' + (SY - 6) + 'h' + Math.min(26, 3 + qE * 2) + 'v12h' + (-Math.min(26, 3 + qE * 2)) + 'Z', CE, null, 0, 0.7); tx(20, SY + 26, qE + ' navbatda', 8.5, CE, 700, 'middle'); }
    if (qW) { add('M' + (776 - Math.min(26, 3 + qW * 2)) + ' ' + (SY - 6) + 'h' + Math.min(26, 3 + qW * 2) + 'v12h' + (-Math.min(26, 3 + qW * 2)) + 'Z', CW, null, 0, 0.7); tx(764, SY + 26, qW + ' navbatda', 8.5, CW, 700, 'middle'); }
    // 2) fazoviy-vaqt diagrammasi
    var GY0 = 170, GY1 = 520, T0 = 300 + Math.max(0, Math.min(3000, s.t - 120)), TW = 600, kt = (X1 - X0) / TW, ky = (GY1 - GY0) / L;
    tx(20, GY0 - 14, 'Fazoviy-vaqt diagrammasi · har bir chiziq — bitta mashina, gorizontal qism — kutish', 10, '#141414', 700);
    add('M' + X0 + ' ' + GY0 + 'H' + X1 + 'V' + GY1 + 'H' + X0 + 'Z', '#fbfaf8', '#d6d3cc', 0.8);
    cur.bnd.forEach(function (b, i) { var y = GY1 - b * ky; add('M' + X0 + ' ' + y + 'H' + X1, null, i === 0 || i === cur.bnd.length - 1 ? '#bdb9b1' : '#e4e1da', 0.8, 1, i === 0 || i === cur.bnd.length - 1 ? '' : '3 3'); });
    for (var tm = 0; tm <= TW; tm += 60) { var x = X0 + tm * kt; add('M' + x + ' ' + GY1 + 'v4', null, LIGHT, 0.8); tx(x, GY1 + 14, String(Math.floor((T0 - 300 + tm) / 60)) + ' min', 8, LIGHT, 400, 'middle'); }
    tx(X0 - 6, GY1, '0', 8, LIGHT, 400, 'end'); tx(X0 - 6, GY0 + 8, L + ' m', 8, LIGHT, 400, 'end');
    cur.done.forEach(function (v) { var seg = v.tr.filter(function (p) { return p[0] >= T0 && p[0] <= T0 + TW; }); if (seg.length < 2) return; var d = 'M' + seg.map(function (p) { return (X0 + (p[0] - T0) * kt).toFixed(1) + ' ' + (GY1 - p[1] * ky).toFixed(1); }).join('L'); add(d, null, v.d > 0 ? CE : CW, 1.1, 0.85); });
    var nx = X0 + (now - T0) * kt; if (nx >= X0 && nx <= X1) add('M' + nx + ' ' + GY0 + 'V' + GY1, null, '#141414', 1, 0.6, '4 3');
    add('M' + (X1 - 210) + ' ' + (GY0 + 10) + 'h14', null, CE, 2); tx(X1 - 192, GY0 + 13, 'sharqqa', 8.5, CE, 600); add('M' + (X1 - 130) + ' ' + (GY0 + 10) + 'h14', null, CW, 2); tx(X1 - 112, GY0 + 13, 'gʻarbga', 8.5, CW, 600);
    // 3) taqqoslash ustunlari
    var BY = 600, labs = ['Hozir', 'Bir tomonlama', 'Turargohsiz'];
    tx(20, BY - 30, 'Oʻrtacha safar vaqti, daqiqa · ' + L + ' m', 10, '#141414', 700);
    var mx = 0; S3.forEach(function (r) { r.res.forEach(function (q) { mx = Math.max(mx, q.mean); }); }); mx = Math.max(mx, 1);
    S3.forEach(function (r, i) { var gx = X0 + i * 240; tx(gx, BY + 108, labs[i], 9.5, i === s.scn ? '#141414' : LIGHT, i === s.scn ? 700 : 400); [0, 1].forEach(function (di) { var q = r.res[di], h = q.mean / mx * 90, bx = gx + di * 46; add('M' + bx + ' ' + (BY + 92 - h) + 'h36V' + (BY + 92) + 'h-36Z', di ? CW : CE, null, 0, q.det ? 0.45 : 0.9); tx(bx + 18, BY + 88 - h, fm(q.mean / 60, 1), 9, di ? CW : CE, 700, 'middle', 'IBM Plex Mono, monospace'); if (q.det) tx(bx + 18, BY + 80, 'aylanma', 7, CW, 600, 'middle'); }); });
    add('M' + X0 + ' ' + (BY + 92) + 'H' + X1, null, '#bdb9b1', 0.8);
    // ===== jadval =====
    function cell(v, best) { return v; }
    function row(n, f, unit, lowGood) { var vals = S3.map(function (r) { return f(r); }), b = lowGood ? Math.min.apply(null, vals) : Math.max.apply(null, vals); var o = { n: n }; vals.forEach(function (v, i) { o['v' + i] = fm(v, unit === 'min' ? 1 : 0); o['c' + i] = Math.abs(v - b) < 1e-6 ? '#2b7449' : '#141414'; }); return o; }
    var tab = [
      row('Safar · sharqqa, min', function (r) { return r.res[0].mean / 60; }, 'min', true),
      row('Safar · gʻarbga, min', function (r) { return r.res[1].mean / 60; }, 'min', true),
      row('Eng yomon 5 % · min', function (r) { return Math.max(r.res[0].p95, r.res[1].p95) / 60; }, 'min', true),
      row('Navbat (max) · sharq', function (r) { return r.res[0].q; }, '', true),
      row('Navbat (max) · gʻarb', function (r) { return r.res[1].q; }, '', true),
      row('Kechikish, mashina·soat', function (r) { return (r.res[0].n * Math.max(0, r.res[0].mean - r.free) + r.res[1].n * Math.max(0, r.res[1].mean - r.free)) / 3600; }, '', true),
      row('Oʻtgan mashinalar', function (r) { return r.res[0].n + r.res[1].n; }, '', false)
    ];
    var a0 = S3[0], a1 = S3[1], dV0 = (a0.res[0].n * (a0.res[0].mean - a0.free) + a0.res[1].n * (a0.res[1].mean - a0.free)) / 3600, dV1 = (a1.res[0].n * (a1.res[0].mean - a1.free) + a1.res[1].n * (a1.res[1].mean - a1.free)) / 3600;
    var verdict = (dV1 < dV0 ? 'Bir tomonlama sxema umumiy kechikishni ' + fm(dV0, 1) + ' dan ' + fm(dV1, 1) + ' mashina·soatga kamaytiradi. ' : 'Bir tomonlama sxema umumiy kechikishni kamaytirmaydi: ' + fm(dV0, 1) + ' → ' + fm(dV1, 1) + ' mashina·soat. Aylanma yoʻl juda uzun yoki gʻarbga oqim katta. ') + 'Gʻarbga ketuvchilar ' + fm(P.D, 0) + ' m aylanib oʻtadi (' + fm(a1.res[1].mean / 60, 1) + ' min). Ozod boʻlgan ~2 m eni trotuar yoki daraxt qatoriga beriladi — buni B kesimida chizing.' + (a0.grid ? ' Hozirgi sxemada ' + a0.grid + ' s tiqilinch (hech kim qimirlay olmagan holat) kuzatildi.' : '');
    function st(key, n, v, step, mn, mx2, unit) { return { n: n, v: fm(v, 0) + (unit ? ' ' + unit : ''), dn: function () { var o = {}; o[key] = Math.max(mn, self.state[key] - step); self.setState(o); }, up: function () { var o = {}; o[key] = Math.min(mx2, self.state[key] + step); self.setState(o); } }; }
    return {
      modes: [['A', 'Tarmoq'], ['B', 'Kesim'], ['C', 'Chorraha'], ['D', 'Koʻcha muhiti'], ['E', 'Mikromodel']].map(function (m, i) { return { k: m[0], n: m[1], p: i === 4 ? 'true' : 'false' }; }),
      title: 'Bir tomonlama sinovi', alt: 'Mikromodel: fazoviy-vaqt diagrammasi va taqqoslash', draw: draw, txt: txt,
      par1: [st('L', 'Uzunligi', P.L, 50, 200, 2000, 'm'), st('nb', 'Oʻtish choʻntaklari', P.nb, 1, 0, 10, 'ta'), st('vf', 'Tezlik', P.vf, 5, 10, 50, 'km/h')],
      par2: [st('qE', 'Sharqqa', P.qE, 20, 0, 800, 'avt/s'), st('qW', 'Gʻarbga', P.qW, 20, 0, 800, 'avt/s')],
      par3: [st('D', 'Aylanma yoʻl', P.D, 100, 200, 5000, 'm'), st('dly', 'Svetofor kutishi', P.dly, 10, 0, 300, 's')],
      scn: [['Hozir', 'Ikki tomonlama, bitta tor boʻlak + choʻntaklar'], ['Bir tomonlama', 'Sharqqa; gʻarbga aylanma yoʻl orqali'], ['Turargohsiz', 'Ikki tomonlama, 2 toʻliq boʻlak (taqqoslash uchun)']].map(function (c, i) { return { n: c[0], d: c[1], p: s.scn === i ? 'true' : 'false', pick: function () { self.setState({ scn: i }); } }; }),
      clock: Math.floor(s.t / 60) + ':' + ('0' + (s.t % 60)).slice(-2), tW: (s.t / 3600 * 100).toFixed(1) + '%',
      tB: function () { self.setState({ t: Math.max(0, self.state.t - 60) }); }, tF: function () { self.setState({ t: Math.min(3540, self.state.t + 60) }); },
      tP: [0, 15, 30, 45].map(function (m) { return { n: m + "'", pick: function () { self.setState({ t: m * 60 }); } }; }),
      tab: tab, verdict: verdict,
      how: [{ t: 'Har 1 soniyada har bir mashina alohida hisoblanadi (mikroskopik model, mashinalar orasida ≥ 7,5 m).' }, { t: 'Hozirgi holatda koʻcha bitta boʻlak: qarshi tomondan mashina kelayotgan boʻlsa, choʻntakda kutiladi.' }, { t: 'Bir tomon 60 s dan ortiq kutsa, ikkinchi tomon yoʻl beradi (xushmuomalalik qoidasi).' }, { t: 'Kelish tasodifiy (Puasson), urugʻ qayd etilgan — natija takrorlanadi. 5 daqiqa qizdirish, keyin 1 soat oʻlchanadi.' }, { t: 'Bir tomonlamada gʻarbga oqim aylanma yoʻldan 30 km/h da + svetofor kutishi bilan hisoblanadi.' }],
      next: [{ t: 'Kamera yozuvidan 15 daqiqalik hisob (har yoʻnalish, eng gavjum soat).' }, { t: 'Choʻntaklarning haqiqiy joylari va hovlilardan chiqishlar.' }, { t: 'Aylanma yoʻlning haqiqiy uzunligi va svetofor sikli (Jahonbaxsh / Rustaveli).' }, { t: 'Natija va B kesimini bitta albom varagʻida aholiga koʻrsatish.' }]
    };
    })();
    return __split(__r);
  }
}
