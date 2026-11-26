// katta massivlarda Math.min(...a) stekni to'ldiradi — xavfsiz min/max
const MN = a => { let m = Infinity; for (const v of a) if (v < m) m = v; return m; }, MX = a => { let m = -Infinity; for (const v of a) if (v > m) m = v; return m; };
/* Binokor — ko'rinishlar v2: bitta 3D sahna → aksonometriya (orbitali), fasad (el = 0) va kesim (kesuvchi tekislik + qopqoqlar).
   Reja koordinatasi: x o'ngga, y pastga (mm). 3D da X = x, Y = −y (shimol tepada), Z yuqoriga. */
'use strict';

// ---------- sahna: yuzalar ro'yxati {pts:[{x,y,z}], n:{x,y,z} (tashqi normal, reja koordinatasida), kind, id, lv}
// ---------- detalizatsiya (v3.35): deraza/eshik konstruksiyasi, otkos, otliv, podokonnik, kirish zinasi va soyabon, sokol, tom svesi (karniz, sofit)
// Barcha o'lchamlar — parametr (sukut: rom chuqurligi 70 mm, rom eni 60 mm, deraza tashqi yuzadan ~1/3 devor qalinligida)
const DET = { fd: 70, fw: 60, sash: 45, sill: 45, gz: -450, step: 150, tread: 300, land: 1200, canopy: 1200 };
const detGZ = M => (M && M.gz != null ? M.gz : DET.gz);
function detOpening(push, g, op, A0, A1, sb, st, n, isExt, extWall, primary, li, Lv, M) {
  const W = Math.hypot(A1.x - A0.x, A1.y - A0.y); if (W < 50) return; const e = { x: (A1.x - A0.x) / W, y: (A1.y - A0.y) / W }, m = { x: -n.x, y: -n.y }, t = g.t || 200, id = op.o.id, lv = Lv.id, win = op.o.cat === 'window';
  const P = (s, d, z) => ({ x: A0.x + e.x * s + m.x * d, y: A0.y + e.y * s + m.y * d, z }), N = { x: n.x, y: n.y, z: 0 }, NB = { x: -n.x, y: -n.y, z: 0 }, E = { x: e.x, y: e.y, z: 0 }, EB = { x: -e.x, y: -e.y, z: 0 }, UP = { x: 0, y: 0, z: 1 }, DN = { x: 0, y: 0, z: -1 };
  const q = (a, b, c, d, nn, kind, both) => F0(push, [a, b, c, d], nn, kind, id, lv, both);
  const fd = DET.fd, fw = win ? DET.fw : 70, dE = extWall || isExt ? Math.max(40, Math.min(160, t * 0.33)) : (t - fd) / 2, dF = isExt ? dE : extWall ? t - dE - fd : (t - fd) / 2;
  // otkoslar (devor ichidagi yon, tepa va past yuzalar) — shu yuzadan rom oldigacha
  if (dF > 1) { q(P(0, 0, sb), P(0, dF, sb), P(0, dF, st), P(0, 0, st), E, 'reveal'); q(P(W, dF, sb), P(W, 0, sb), P(W, 0, st), P(W, dF, st), EB, 'reveal'); q(P(0, 0, st), P(W, 0, st), P(W, dF, st), P(0, dF, st), DN, 'reveal'); if (win) q(P(0, dF, sb), P(W, dF, sb), P(W, 0, sb), P(0, 0, sb), UP, 'reveal'); }
  // bloklar: s (opening bo'ylab), d (devor ichiga, manfiy — tashqariga), z
  const box = (s0, s1, d0, d1, z0, z1, kind) => { q(P(s0, d0, z0), P(s1, d0, z0), P(s1, d0, z1), P(s0, d0, z1), N, kind); q(P(s1, d1, z0), P(s0, d1, z0), P(s0, d1, z1), P(s1, d1, z1), NB, kind); q(P(s0, d1, z0), P(s0, d0, z0), P(s0, d0, z1), P(s0, d1, z1), EB, kind); q(P(s1, d0, z0), P(s1, d1, z0), P(s1, d1, z1), P(s1, d0, z1), E, kind); q(P(s0, d0, z1), P(s1, d0, z1), P(s1, d1, z1), P(s0, d1, z1), UP, kind); q(P(s0, d1, z0), P(s1, d1, z0), P(s1, d0, z0), P(s0, d0, z0), DN, kind); };
  if (win && isExt) box(-25, W + 25, -DET.sill, dF + 10, sb - 35, sb - 5, 'sill'); // otliv
  if (win && !isExt) box(-50, W + 50, -50, dF, sb - 40, sb, 'sill2'); // podokonnik
  if (!primary) return;
  const d0 = dF, d1 = dF + fd, rect = (s0, s1, z0, z1, kind, dd0, dd1) => box(s0, s1, dd0 == null ? d0 : dd0, dd1 == null ? d1 : dd1, z0, z1, kind);
  if (win) { const H = st - sb, cols = W >= 1700 ? 3 : W >= 1050 ? 2 : 1, tr = H >= 1750 ? st - Math.min(550, H * 0.28) : null;
    rect(0, fw, sb, st, 'frame'); rect(W - fw, W, sb, st, 'frame'); rect(fw, W - fw, st - fw, st, 'frame'); rect(fw, W - fw, sb, sb + fw, 'frame');
    const xs = [fw]; for (let i = 1; i < cols; i++) { const c = W * i / cols; rect(c - fw / 2, c + fw / 2, sb + fw, st - fw, 'frame'); xs.push(c - fw / 2, c + fw / 2); } xs.push(W - fw); if (tr) rect(fw, W - fw, tr - fw / 2, tr + fw / 2, 'frame');
    for (let i = 0; i < xs.length; i += 2) { const s0 = xs[i], s1 = xs[i + 1], rows = tr ? [[sb + fw, tr - fw / 2, 1], [tr + fw / 2, st - fw, 0]] : [[sb + fw, st - fw, 1]];
      rows.forEach(([z0, z1, sash]) => { let a0 = s0, a1 = s1, b0 = z0, b1 = z1; if (sash && (s1 - s0) > 300) { const k = DET.sash; rect(a0, a0 + k, b0, b1, 'frame', d0 + 8, d1 - 8); rect(a1 - k, a1, b0, b1, 'frame', d0 + 8, d1 - 8); rect(a0 + k, a1 - k, b0, b0 + k, 'frame', d0 + 8, d1 - 8); rect(a0 + k, a1 - k, b1 - k, b1, 'frame', d0 + 8, d1 - 8); a0 += k; a1 -= k; b0 += k; b1 -= k; }
        q(P(a0, d0 + fd / 2, b0), P(a1, d0 + fd / 2, b0), P(a1, d0 + fd / 2, b1), P(a0, d0 + fd / 2, b1), N, 'glass', true); }); } }
  else { const dw = 70, dbl = W >= 1350, ext = isExt || extWall; rect(0, dw, sb, st, 'frame'); rect(W - dw, W, sb, st, 'frame'); rect(dw, W - dw, st - dw, st, 'frame');
    const ld0 = d0 + fd / 2 - 22, ld1 = d0 + fd / 2 + 22, leaves = dbl ? [[dw, W / 2 - 3], [W / 2 + 3, W - dw]] : [[dw, W - dw]];
    leaves.forEach(([s0, s1], li2) => { const zt = st - dw - 4; rect(s0, s1, sb + 8, zt, 'door', ld0, ld1); const lw = s1 - s0, mg = Math.min(110, lw * 0.16), hz = sb + 1000;
      const panel = (z0, z1, kind) => { rect(s0 + mg, s1 - mg, z0, z1, kind, ld0 - 6, ld0 + 2); rect(s0 + mg, s1 - mg, z0, z1, kind, ld1 - 2, ld1 + 6); };
      if (ext && li === 0) { panel(sb + 160, hz - 80, 'doorp'); q(P(s0 + mg, ld0 - 7, hz + 60), P(s1 - mg, ld0 - 7, hz + 60), P(s1 - mg, ld0 - 7, zt - mg), P(s0 + mg, ld0 - 7, zt - mg), N, 'glass', true); }
      else { panel(sb + 160, hz - 80, 'doorp'); panel(hz + 80, zt - mg, 'doorp'); }
      const hs = dbl ? (li2 === 0 ? s1 - 90 : s0 + 70) : s1 - 110; rect(hs, hs + 22, hz - 10, hz + 10, 'metal', ld0 - 55, ld1 + 55); rect(hs - (dbl && li2 === 0 ? 100 : 0), hs + (dbl && li2 === 0 ? 22 : 120), hz - 10, hz + 10, 'metal', ld0 - 60, ld0 - 45); });
    // kirish: zinapoyalar (yerdan ±0 gacha) va soyabon
    if (isExt && li === 0 && Math.abs(sb - Lv.z) < 20) { const gz = detGZ(M), n2 = Math.max(0, Math.round((Lv.z - gz) / DET.step)), wX = 600; let d = -DET.land; box(-wX, W + wX, d, 0, gz, Lv.z - 20, 'step');
      for (let k = 1; k < n2; k++) { box(-wX, W + wX, d - DET.tread, d, gz, Lv.z - 20 - k * DET.step, 'step'); d -= DET.tread; }
      box(-wX, W + wX, -DET.canopy, 0, st + 300, st + 450, 'canopy'); } } }
function F0(push, pts, n, kind, id, lv) { push(pts, n, kind, id, lv); }
// sokol: 1-qavat tashqi devorlari bo'ylab, yerdan ±0 gacha, 20 mm chiqib turadi
function detPlinth(push, L, Lv, M) { const gz = detGZ(M); if (Lv.z - gz < 50) return; L.outer.forEach(P => { P.forEach((p, i) => { const q = P[(i + 1) % P.length], d = V.unit(V.sub(q, p)), mq = V.mul(V.add(p, q), .5); let nn = { x: d.y, y: -d.x }; if (inPoly({ x: mq.x + nn.x * 30, y: mq.y + nn.y * 30 }, P)) nn = { x: -nn.x, y: -nn.y };
      const o = 20, a = { x: p.x + nn.x * o, y: p.y + nn.y * o }, b = { x: q.x + nn.x * o, y: q.y + nn.y * o };
      push([{ x: a.x, y: a.y, z: gz }, { x: b.x, y: b.y, z: gz }, { x: b.x, y: b.y, z: Lv.z + 30 }, { x: a.x, y: a.y, z: Lv.z + 30 }], { x: nn.x, y: nn.y, z: 0 }, 'plinth', 'plinth', Lv.id);
      push([{ x: p.x, y: p.y, z: Lv.z + 30 }, { x: q.x, y: q.y, z: Lv.z + 30 }, { x: b.x, y: b.y, z: Lv.z + 30 }, { x: a.x, y: a.y, z: Lv.z + 30 }], { x: 0, y: 0, z: 1 }, 'plinth', 'plinth', Lv.id); }); }); }
// tom: karniz (fasad taxtasi) eng past qirralar bo'ylab, sofit (sves osti), tizma
function detRoof(push, R, M) { if (!R || R.type === 'flat' || !R.frame) return; const Fr = R.frame, z = R.z, P2 = (a, b, zz) => ({ x: Fr.A.x * a + Fr.B.x * b, y: Fr.A.y * a + Fr.B.y * b, z: zz }), fh = 220, th = 160;
  const C = [[Fr.a0, Fr.b0], [Fr.a1, Fr.b0], [Fr.a1, Fr.b1], [Fr.a0, Fr.b1]]; // sves konturi
  C.forEach((c, i) => { const d = C[(i + 1) % 4], p = P2(c[0], c[1], 0), q = P2(d[0], d[1], 0), u = V.unit(V.sub(q, p)), nn = { x: u.y, y: -u.x }, mid = P2((Fr.a0 + Fr.a1) / 2, (Fr.b0 + Fr.b1) / 2, 0), out = (nn.x * (p.x - mid.x) + nn.y * (p.y - mid.y)) > 0 ? nn : { x: -nn.x, y: -nn.y };
    const gable = R.type === 'gable' && Math.abs(c[0] - d[0]) < 1; if (gable) return;
    push([{ x: p.x, y: p.y, z: z - fh + th }, { x: q.x, y: q.y, z: z - fh + th }, { x: q.x, y: q.y, z: z + th }, { x: p.x, y: p.y, z: z + th }], { x: out.x, y: out.y, z: 0 }, 'fascia', 'roof', 'roof'); });
  push(C.map(([a, b]) => P2(a, b, z - fh + th)), { x: 0, y: 0, z: -1 }, 'soffit', 'roof', 'roof'); }
// vitraj (shisha devor): impostlar (≈1,2 m), ригель (pastki va tepa), shisha orqada
function detCurtain(push, A0, A1, z0, z1, n, id, lv) { const W = Math.hypot(A1.x - A0.x, A1.y - A0.y); if (W < 30) return; const e = { x: (A1.x - A0.x) / W, y: (A1.y - A0.y) / W }, P = (s, d, z) => ({ x: A0.x + e.x * s - n.x * d, y: A0.y + e.y * s - n.y * d, z }), N = { x: n.x, y: n.y, z: 0 };
  const bar = (s0, s1, za, zb) => { push([P(s0, -8, za), P(s1, -8, za), P(s1, -8, zb), P(s0, -8, zb)], N, 'frame', id, lv); push([P(s0, -8, za), P(s0, 30, za), P(s0, 30, zb), P(s0, -8, zb)], { x: -e.x, y: -e.y, z: 0 }, 'frame', id, lv); push([P(s1, 30, za), P(s1, -8, za), P(s1, -8, zb), P(s1, 30, zb)], { x: e.x, y: e.y, z: 0 }, 'frame', id, lv); };
  const low = z1 - z0 < 1600; push([P(0, 20, z0), P(W, 20, z0), P(W, 20, z1), P(0, 20, z1)], N, low ? 'glassR' : 'glass', id, lv);
  if (low) { bar(0, W, z1 - 50, z1); const k2 = Math.max(1, Math.round(W / 1500)); for (let i = 0; i <= k2; i++) { const s = W * i / k2; bar(Math.max(0, s - 20), Math.min(W, s + 20), z0, z1); } return; }
  const k = Math.max(1, Math.round(W / 1200)); for (let i = 0; i <= k; i++) { const s = W * i / k; bar(Math.max(0, s - 25), Math.min(W, s + 25), z0, z1); }
  bar(0, W, z0, z0 + 90); bar(0, W, z1 - 60, z1); if (z1 - z0 > 2600) bar(0, W, z0 + 2400, z0 + 2450); }
// tashqi pardoz materiali — devor turining eng tashqi qatlami bo'yicha
function detFacKind(type) { const T0 = TYPES.wall[type]; if (!T0 || !T0.layers || !T0.layers.length) return 'wall'; const m = (T0.layers[T0.layers.length - 1].m || '').toLowerCase();
  return /g.?isht|brick|klinker/.test(m) ? 'fBrick' : /yog.?och|reyka|wood|taxta/.test(m) ? 'fWood' : /beton|fibro|keramogranit|tosh|travertin/.test(m) ? 'fStone' : /metall|alyumin|kompozit|tunuka/.test(m) ? 'fMetal' : 'wall'; }
// yog'och reyka: vertikal reykalar (≈150 mm qadam) — fasad yuzasidan 12 mm oldinda
function detSlats(push, A0, A1, za, zb, n, id, lv) { const W = Math.hypot(A1.x - A0.x, A1.y - A0.y); if (W < 100 || zb - za < 100) return; const e = { x: (A1.x - A0.x) / W, y: (A1.y - A0.y) / W }, P = (s, d, z) => ({ x: A0.x + e.x * s + n.x * d, y: A0.y + e.y * s + n.y * d, z }), N = { x: n.x, y: n.y, z: 0 };
  for (let s = 40; s < W - 40; s += 150) { push([P(s, 14, za), P(s + 45, 14, za), P(s + 45, 14, zb), P(s, 14, zb)], N, 'fWood2', id, lv); push([P(s + 45, 14, za), P(s + 45, 0, za), P(s + 45, 0, zb), P(s + 45, 14, zb)], { x: e.x, y: e.y, z: 0 }, 'fWood3', id, lv); } }
function detOpenRooms(L, Lv) { const low = L.walls.filter(g => g.w.h && g.w.h < Lv.h - 100); if (!low.length) return new Set(); const dS = (p, a, b) => { const d = V.sub(b, a), L2 = V.dot(d, d) || 1, t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), d) / L2)); return V.len(V.sub(p, V.add(a, V.mul(d, t)))); };
  return new Set(L.rooms.filter(r => { let lo = 0, pe = 0; r.poly.forEach((p, i) => { const q = r.poly[(i + 1) % r.poly.length], l = V.len(V.sub(q, p)), m = V.mul(V.add(p, q), .5); pe += l; if (low.some(g => dS(m, g.a, g.b) < (g.t || 100) / 2 + 60)) lo += l; }); return pe > 0 && lo / pe > 0.3; })); }

// ---------- balkon (v3.36): devorga osilgan konsol plita + to'siq (shisha yoki panjara). balcony WALLID s [w=3] [d=1.2] [rail=glass|bar] yoki balcony x,y LEVEL
const BAL = { w: 3000, d: 1200, t: 180, h: 1100 };
function balcGeom(M, A, lv) { const L = A.levels[lv]; if (!L) return []; const inR = p => L.rooms.some(r => inPoly(p, r.poly));
  return M.el.filter(e => e.cat === 'balcony' && e.level === lv).map(e => { const g = L.walls.find(q => q.w.id === e.host && !q.w.arc); if (!g) return { e, bad: true };
    const c = V.add(g.a, V.mul(g.u, e.s)); let n = { x: -g.u.y, y: g.u.x }; if (inR(V.add(c, V.mul(n, (g.t || 300) / 2 + 300)))) n = V.mul(n, -1);
    const off = (g.t || 300) / 2, w = e.w || BAL.w, d = e.d || BAL.d, P0 = V.add(c, V.mul(n, off)), u = g.u;
    const poly = [V.add(P0, V.mul(u, -w / 2)), V.add(P0, V.mul(u, w / 2)), V.add(V.add(P0, V.mul(u, w / 2)), V.mul(n, d)), V.add(V.add(P0, V.mul(u, -w / 2)), V.mul(n, d))];
    const door = L.openings.some(o => !o.bad && o.host === g && o.o.cat === 'door' && o.s1 > e.s - w / 2 && o.s0 < e.s + w / 2);
    return { e, g, n, u, w, d, poly, door, area: w * d / 1e6 }; }); }
function detBalcony(push, B, Lv) { if (B.bad) return; const z1 = Lv.z, z0 = Lv.z - BAL.t, P = B.poly, id = B.e.id, lv = Lv.id, h = B.e.h || BAL.h, rail = B.e.rail || 'glass';
  const side = (a, b, za, zb, kind) => { const d = V.unit(V.sub(b, a)), nn = { x: d.y, y: -d.x, z: 0 }; push([{ x: a.x, y: a.y, z: za }, { x: b.x, y: b.y, z: za }, { x: b.x, y: b.y, z: zb }, { x: a.x, y: a.y, z: zb }], nn, kind, id, lv); };
  push(P.map(p => ({ x: p.x, y: p.y, z: z1 })), { x: 0, y: 0, z: 1 }, 'slabtop', id, lv); push(P.slice().reverse().map(p => ({ x: p.x, y: p.y, z: z0 })), { x: 0, y: 0, z: -1 }, 'soffit', id, lv);
  for (let i = 1; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4]; side(a, b, z0, z1, 'canopy'); side(b, a, z0, z1, 'canopy'); }
  // to'siq: 3 tomon (devordan chiqqan 2 yon + old), 40 mm ichkarida
  const ins = (p, k) => V.add(p, V.add(V.mul(B.n, -40 * k[0]), V.mul(B.u, -40 * k[1]))), R = [ins(P[0], [0, -1]), ins(P[3], [1, -1]), ins(P[2], [1, 1]), ins(P[1], [0, 1])];
  for (let i = 0; i < 3; i++) { const a = R[i], b = R[i + 1], L0 = V.len(V.sub(b, a)), d = V.unit(V.sub(b, a));
    const post = (s) => { const p = V.add(a, V.mul(d, s)); const q = V.add(p, V.mul(d, 30)); side(p, q, z1, z1 + h, 'frame'); side(q, p, z1, z1 + h, 'frame'); };
    side(a, b, z1 + h - 45, z1 + h, 'frame'); side(b, a, z1 + h - 45, z1 + h, 'frame');
    if (rail === 'glass') { side(a, b, z1 + 60, z1 + h - 60, 'glassR'); for (let s = 0; s <= L0 - 30; s += Math.max(600, L0 / Math.max(1, Math.round(L0 / 1200)))) post(s); post(L0 - 30); }
    else { side(a, b, z1 + 80, z1 + 120, 'frame'); side(b, a, z1 + 80, z1 + 120, 'frame'); for (let s = 0; s <= L0 - 20; s += 120) { const p = V.add(a, V.mul(d, s)), q = V.add(p, V.mul(d, 18)); side(p, q, z1 + 80, z1 + h - 45, 'frame'); } } } }
function balcPlan(M, A, lv, SX, SY, o) { const ink = '#141414'; return balcGeom(M, A, lv).filter(B => !B.bad).map(B => { const on = o.sel && o.sel.has && o.sel.has(B.e.id), P = B.poly, pts = Q => Q.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join(' ');
    const R = [V.add(P[0], V.mul(B.n, 0)), V.add(P[3], V.add(V.mul(B.n, -60), V.mul(B.u, 60))), V.add(P[2], V.add(V.mul(B.n, -60), V.mul(B.u, -60))), P[1]];
    return `<polygon points="${pts(P)}" ${o.live ? `class="hit" data-id="${B.e.id}"` : ''} fill="${on ? 'rgba(229,102,143,.15)' : o.paper ? '#fff' : '#f4f3ef'}" stroke="${on ? '#e5668f' : ink}" stroke-width="${on ? 1.8 : 1}"/><polyline points="${pts([R[0], R[1], R[2], R[3]])}" fill="none" stroke="${ink}" stroke-width=".6"${B.e.rail === 'bar' ? '' : ' stroke-dasharray="4 2"'}/>` + (o.paper || VT_LBL(B, SX, SY) ? `<text x="${SX((P[0].x + P[2].x) / 2).toFixed(1)}" y="${(SY((P[0].y + P[2].y) / 2) + 3).toFixed(1)}" text-anchor="middle" font-size="${o.paper ? 7 : 9}" fill="#555">Balkon ${B.area.toFixed(1).replace('.', ',')} m²</text>` : ''); }).join(''); }
const VT_LBL = () => true;

function scene(M, A, opt) {
  opt = opt || {}; const F = []; const upto = opt.upto ? M.levels.findIndex(l => l.id === opt.upto) : M.levels.length - 1;
  const push = (pts, n, kind, id, lv, edges) => F.push({ pts, n, kind, id, lv, edges });
  M.levels.forEach((Lv, li) => {
    if (li > upto) return; const L = A.levels[Lv.id]; if (!L) return;
    // pol plitasi (qavat poli): tashqi konturlar bo'yicha, qalinlik 200 pastga
    if (!L.slabs.length) L.outer.forEach(P => { const z = Lv.z; push(P.map(p => ({ x: p.x, y: p.y, z })), { x: 0, y: 0, z: 1 }, 'floor', 'F' + Lv.id, Lv.id); });
    const prism = (P, z0, z1, kind, id, holes) => { const sg = Math.sign(polyArea(P)) || 1; const side = (Q, sgn, inward) => Q.forEach((p, i) => { const q = Q[(i + 1) % Q.length], d = V.unit(V.sub(q, p)); let n = sgn > 0 ? { x: d.y, y: -d.x, z: 0 } : { x: -d.y, y: d.x, z: 0 }; if (inward) n = { x: -n.x, y: -n.y, z: 0 }; push([{ x: p.x, y: p.y, z: z0 }, { x: q.x, y: q.y, z: z0 }, { x: q.x, y: q.y, z: z1 }, { x: p.x, y: p.y, z: z1 }], n, kind, id, Lv.id); });
      side(P, sg, false); (holes || []).forEach(H => side(H, Math.sign(polyArea(H)) || 1, true));
      // ustki yuza 2 m kataklarga bo'linadi — rassom algoritmi uchun (katta yuza yaqin devorlarni yopib qo'ymasin)
      const xs = P.map(p => p.x), ys = P.map(p => p.y), cs = 2000; for (let x = MN(xs); x < MX(xs); x += cs) for (let y = MN(ys); y < MX(ys); y += cs) { const R = [x, y, x + cs, y + cs], C = clipRect(P, R); if (!C) continue; F.push({ pts: C.map(p => ({ x: p.x, y: p.y, z: z1 })), n: { x: 0, y: 0, z: 1 }, kind: kind === 'slab' ? 'slabtop' : kind, id, lv: Lv.id, holes: (holes || []).map(H => clipRect(H, R)).filter(Boolean).map(H => H.map(p => ({ x: p.x, y: p.y, z: z1 }))) }); } F.push({ pts: P.map(p => ({ x: p.x, y: p.y, z: z0 })), n: { x: 0, y: 0, z: -1 }, kind, id, lv: Lv.id, holes: (holes || []).map(H => H.map(p => ({ x: p.x, y: p.y, z: z0 }))) }); };
    L.slabs.forEach(sl => prism(sl.poly, Lv.z - sl.t, Lv.z, 'slab', sl.s.id, sl.holes.map(h => h.poly)));
    L.beams.forEach(g => prism(g.body, Lv.z + Lv.h - g.T.h, Lv.z + Lv.h, 'col', g.bm.id));
    if (li === 0) { L.footings.forEach(f => prism(f.poly, Lv.z - f.f.d, Lv.z, 'found', f.f.id)); (A.summary.strips || []).forEach(g => prism(g.poly, Lv.z - (M.found ? M.found.d : 1500), Lv.z, 'found', g.w.id)); }
    const OPEN = detOpenRooms(L, Lv);
    L.walls.forEach(g => {
      const z0 = Lv.z, z1 = Lv.z + (g.w.h || Lv.h), poly = g.poly || g.body; const ops = L.openings.filter(o => !o.bad && o.host === g);
      // ko'pburchak yo'nalishi: musbat maydon (x o'ng, y past) — chap normal ichkariga; tashqi normal = o'ng normal
      const sg = Math.sign(polyArea(poly)) || 1, n2 = (p, q) => { const d = V.unit(V.sub(q, p)); return sg > 0 ? { x: d.y, y: -d.x, z: 0 } : { x: -d.y, y: d.x, z: 0 }; };
      const k = poly.length, longIdx = [0, (g.jb && poly.length > 4) ? null : null];
      for (let i = 0; i < k; i++) {
        const p = poly[i], q = poly[(i + 1) % k], n = n2(p, q), along = Math.abs(V.dot(V.unit(V.sub(q, p)), g.u));
        const isLong = along > 0.7 && V.len(V.sub(q, p)) > g.t * 0.9;
        if (!isLong) { // uchki yuza: tutashgan bo'lsa ichki — chizilmaydi
          const nearA = V.len(V.sub(V.mul(V.add(p, q), .5), g.a)) < V.len(V.sub(V.mul(V.add(p, q), .5), g.b)); if (nearA ? g.ja : g.jb) continue; }
        // tasmalarga bo'lish: teshik chegaralari + har 2 m
        const s = pt => V.dot(V.sub(pt, g.a), g.u), sp = s(p), sq = s(q), lo = Math.min(sp, sq), hi = Math.max(sp, sq);
        const cuts = new Set([lo, hi]); if (isLong) { ops.forEach(o => { if (o.s0 > lo && o.s0 < hi) cuts.add(o.s0); if (o.s1 > lo && o.s1 < hi) cuts.add(o.s1); }); for (let x = lo + 2000; x < hi; x += 2000) if (!ops.some(o => x > o.s0 && x < o.s1)) cuts.add(x); }
        let isExt = true, extWall = true, primary = true; if (isLong) { const fm = V.mul(V.add(p, q), .5), oP = { x: fm.x + n.x * 80, y: fm.y + n.y * 80 }, iP = { x: fm.x - n.x * ((g.t || 200) + 80), y: fm.y - n.y * ((g.t || 200) + 80) }; isExt = !L.rooms.some(r => !OPEN.has(r) && inPoly(oP, r.poly)); extWall = !L.rooms.some(r => !OPEN.has(r) && inPoly(iP, r.poly)); primary = isExt || (!extWall && (n.x * -g.u.y + n.y * g.u.x) > 0); }
        const cs = [...cuts].sort((a, b) => a - b); const at = sv => { const t = (sv - sp) / ((sq - sp) || 1); return V.add(p, V.mul(V.sub(q, p), t)); };
        for (let j = 0; j + 1 < cs.length; j++) { const A0 = at(cs[j]), A1 = at(cs[j + 1]); const mid = (cs[j] + cs[j + 1]) / 2; const o = isLong && ops.find(q2 => mid > q2.s0 && mid < q2.s1);
          const last = j + 2 === cs.length, topLv = li === M.levels.length - 1 || li === upto;
          const quad = (za, zb, kind) => push([{ x: A0.x, y: A0.y, z: za }, { x: A1.x, y: A1.y, z: za }, { x: A1.x, y: A1.y, z: zb }, { x: A0.x, y: A0.y, z: zb }], n, kind, g.w.id, Lv.id, kind !== 'wall' ? [1, 1, 1, 1] : [za === z0 && li === 0 ? 1 : 0, last && !g.w.arc ? 1 : 0, zb === z1 && topLv ? 1 : 0, j === 0 && !g.w.arc ? 1 : 0]);
          if (!o) { const gl0 = TYPES.wall[g.w.type] && TYPES.wall[g.w.type].glass; if (gl0 && isLong && !opt.noDet) { if (primary) detCurtain(push, A0, A1, z0, z1, n, g.w.id, Lv.id); } else { const fk0 = gl0 ? 'glass' : isLong && isExt && !opt.noDet ? detFacKind(g.w.type) : 'wall'; quad(z0, z1, fk0); if (fk0 === 'fWood') detSlats(push, A0, A1, z0, z1, n, g.w.id, Lv.id); } } else { const sb = z0 + (o.T.sill || 0), st = Math.min(z1, sb + o.T.h); const fk = isLong && isExt && !opt.noDet ? detFacKind(g.w.type) : 'wall'; if (sb > z0) { quad(z0, sb, fk); if (fk === 'fWood') detSlats(push, A0, A1, z0, sb, n, g.w.id, Lv.id); } detOpening(push, g, o, A0, A1, sb, st, n, isExt, extWall, primary, li, Lv, M); if (st < z1) { quad(st, z1, fk); if (fk === 'fWood') detSlats(push, A0, A1, st, z1, n, g.w.id, Lv.id); } } }
      }
      if (li === upto || g.w.h) push(poly.map(p => ({ x: p.x, y: p.y, z: z1 })), { x: 0, y: 0, z: 1 }, 'wtop', g.w.id, Lv.id);
    });
    if (li === 0 && !opt.noDet) detPlinth(push, L, Lv, M);
    balcGeom(M, A, Lv.id).forEach(B => detBalcony(push, B, Lv));
    // zina: har marsh — pog'ona usti, ko'tarilish yuzasi, ikki yon (pog'ona bloklari qiya ostigacha), qiya osti; maydoncha — prizma; to'siq — shisha panel
    (L.stairs || []).forEach(st => { const z00 = Lv.z; st.flights.forEach(F => { const P3 = (sv, ev, z) => ({ x: F.o.x + F.u.x * sv + F.n.x * ev, y: F.o.y + F.u.y * sv + F.n.y * ev, z: z00 + F.z0 + z }), up = { x: 0, y: 0, z: 1 }, fw = { x: -F.u.x, y: -F.u.y, z: 0 };
        const sl = F.nR * F.h / Math.max(1, F.run + F.b), cosA = Math.cos(Math.atan(sl)), dz = STAIR.waist / cosA + F.h, bot = sv => Math.max(0, sl * sv - dz + F.h * 0 + (sv <= 0 ? 0 : 0)), soff = sv => Math.max(0, Math.min(F.nR * F.h - dz, (sv - dz / sl) * sl));
        for (let i = 0; i <= F.nT; i++) { const s0 = i * F.b, s1 = i < F.nT ? (i + 1) * F.b : F.run, zt = (i + 1) * F.h; if (i === F.nT) break;
          push([P3(s0, 0, zt), P3(s1, 0, zt), P3(s1, F.w, zt), P3(s0, F.w, zt)], up, 'slab', st.s.id, Lv.id); push([P3(s0, 0, i * F.h), P3(s0, F.w, i * F.h), P3(s0, F.w, zt), P3(s0, 0, zt)], fw, 'col', st.s.id, Lv.id);
          [[0, -1], [F.w, 1]].forEach(([ev, sg]) => { const nn = { x: F.n.x * sg, y: F.n.y * sg, z: 0 }; push([P3(s0, ev, soff(s0)), P3(s1, ev, soff(s1)), P3(s1, ev, zt), P3(s0, ev, zt)], nn, 'col', st.s.id, Lv.id); }); }
        push([P3(F.run, 0, Math.max(0, F.nR * F.h - dz)), P3(F.run, F.w, Math.max(0, F.nR * F.h - dz)), P3(F.run, F.w, F.nT * F.h), P3(F.run, 0, F.nT * F.h)], { x: F.u.x, y: F.u.y, z: 0 }, 'col', st.s.id, Lv.id);
        const sA = 0, sB = F.run; push([P3(sA, F.w, soff(sA)), P3(sB, F.w, soff(sB)), P3(sB, 0, soff(sB)), P3(sA, 0, soff(sA))], { x: 0, y: 0, z: -1 }, 'col', st.s.id, Lv.id); });
      st.landings.forEach(Ld => { const z1 = z00 + Ld.z, z0 = z1 - Ld.t, P = Ld.poly; push(P.map(p => ({ x: p.x, y: p.y, z: z1 })), { x: 0, y: 0, z: 1 }, 'slab', st.s.id, Lv.id); P.forEach((p, i) => { const q = P[(i + 1) % P.length], d = V.unit(V.sub(q, p)); push([{ x: p.x, y: p.y, z: z0 }, { x: q.x, y: q.y, z: z0 }, { x: q.x, y: q.y, z: z1 }, { x: p.x, y: p.y, z: z1 }], { x: d.y, y: -d.x, z: 0 }, 'col', st.s.id, Lv.id); }); });
      st.rails.forEach(R => { const a = { x: R.a.x, y: R.a.y, z: z00 + R.a.z }, b = { x: R.b.x, y: R.b.y, z: z00 + R.b.z }, d = V.unit(V.sub(b, a)); push([a, b, { x: b.x, y: b.y, z: b.z + R.ht }, { x: a.x, y: a.y, z: a.z + R.ht }], { x: d.y, y: -d.x, z: 0 }, 'glass', st.s.id, Lv.id); }); });
    L.columns.forEach(c => { const z0 = Lv.z, z1 = Lv.z + Lv.h, P = c.poly, sg = Math.sign(polyArea(P)) || 1; P.forEach((p, i) => { const q = P[(i + 1) % P.length], d = V.unit(V.sub(q, p)); push([{ x: p.x, y: p.y, z: z0 }, { x: q.x, y: q.y, z: z0 }, { x: q.x, y: q.y, z: z1 }, { x: p.x, y: p.y, z: z1 }], sg > 0 ? { x: d.y, y: -d.x, z: 0 } : { x: -d.y, y: d.x, z: 0 }, 'col', c.c.id, Lv.id); }); push(P.map(p => ({ x: p.x, y: p.y, z: z1 })), { x: 0, y: 0, z: 1 }, 'wtop', c.c.id, Lv.id); });
  });
  (A.forms || []).forEach(Fm => Fm.floors.forEach((fl, fi) => { const z0 = fl.z, z1 = fl.z + fl.h, last = fi === Fm.floors.length - 1; fl.loops.forEach(Lp => { const sg = Math.sign(polyArea(Lp)) || 1, n = Lp.length;
    for (let i = 0; i < n; i++) { const p = Lp[i], q = Lp[(i + 1) % n], d = V.unit(V.sub(q, p)); push([{ x: p.x, y: p.y, z: z0 }, { x: q.x, y: q.y, z: z0 }, { x: q.x, y: q.y, z: z1 }, { x: p.x, y: p.y, z: z1 }], sg > 0 ? { x: d.y, y: -d.x, z: 0 } : { x: -d.y, y: d.x, z: 0 }, 'fin', Fm.e.id, 'form'); }
    const nxt = Fm.floors[fi + 1]; if (last || !nxt || Math.abs(nxt.area - fl.area) > 1) push(Lp.map(p => ({ x: p.x, y: p.y, z: z1 })), { x: 0, y: 0, z: 1 }, 'wtop', Fm.e.id, 'form'); });
    if (fl.terr) fl.terr.forEach(Lp => push(Lp.map(p => ({ x: p.x, y: p.y, z: z0 + 300 })), { x: 0, y: 0, z: 1 }, 'green', Fm.e.id, 'form')); }));
  (A.shells || []).forEach(S => { const O = S.O, nu = S.nu, nv = S.nv, step = nu > 90 ? 2 : 1, cx = O.flat().reduce((s, p) => s + p.x, 0) / O.flat().length, cy = O.flat().reduce((s, p) => s + p.y, 0) / O.flat().length;
    for (let i = 0; i < nu; i += step) for (let j = 0; j < nv; j += 2) { const i1 = Math.min(nu, i + step), j1 = Math.min(nv, j + 2); const a = O[i][j], b = O[i1][j], c = O[i1][j1], d = O[i][j1]; if (a.z < 1 && b.z < 1 && c.z < 1 && d.z < 1) continue;
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, w = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z }; let n = { x: u.y * w.z - u.z * w.y, y: u.z * w.x - u.x * w.z, z: u.x * w.y - u.y * w.x }; const l = Math.hypot(n.x, n.y, n.z) || 1; n = { x: n.x / l, y: n.y / l, z: n.z / l };
      const m = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }; if (n.z < -0.2 || (Math.abs(n.z) <= 0.2 && n.x * (m.x - cx) + n.y * (m.y - cy) < 0)) n = { x: -n.x, y: -n.y, z: -n.z };
      F.push({ pts: [a, b, c, d], n, kind: 'shellw', id: S.e.id, lv: 'shell', both: true }); }
    S.glass.forEach(q => { const u = { x: q[1].x - q[0].x, y: q[1].y - q[0].y }; const l = Math.hypot(u.x, u.y) || 1; F.push({ pts: q, n: { x: -u.y / l, y: u.x / l, z: 0 }, kind: 'glass', id: S.e.id, lv: 'shell', both: true }); });
    S.endGlass.forEach(q => F.push({ pts: q, n: { x: 1, y: 0, z: 0 }, kind: 'glass', id: S.e.id, lv: 'shell', both: true }));
    // ichki qavat plitalari va xona to'siqlari
    (S.floors || []).forEach(Fl => Fl.polys.forEach(L => { F.push({ pts: L, n: { x: 0, y: 0, z: 1 }, kind: 'slabtop', id: S.e.id, lv: 'shell' }); if (Fl.k > 0) F.push({ pts: L.map(p => ({ x: p.x, y: p.y, z: p.z - 300 })), n: { x: 0, y: 0, z: -1 }, kind: 'slab', id: S.e.id, lv: 'shell' }); }));
    (S.parts || []).forEach(L => { const a = L[0], b = L[1], c = L[L.length - 1]; const u = { x: b.x - a.x, y: b.y - a.y }, l = Math.hypot(u.x, u.y) || 1; F.push({ pts: L, n: { x: -u.y / l, y: u.x / l, z: 0 }, kind: L.fire ? 'roof' : 'wall', id: S.e.id, lv: 'shell', both: true }); });
    (S.cores || []).forEach(C => { const P = C.poly; P.forEach((p, i) => { const q = P[(i + 1) % 4], d = V.unit(V.sub(q, p)); F.push({ pts: [{ x: p.x, y: p.y, z: 0 }, { x: q.x, y: q.y, z: 0 }, { x: q.x, y: q.y, z: C.z1 }, { x: p.x, y: p.y, z: C.z1 }], n: { x: d.y, y: -d.x, z: 0 }, kind: 'col', id: S.e.id, lv: 'shell', both: true }); }); F.push({ pts: P.map(p => ({ x: p.x, y: p.y, z: C.z1 })), n: { x: 0, y: 0, z: 1 }, kind: 'wtop', id: S.e.id, lv: 'shell' }); }); });
  // qatlamli uy: plita lentasi (balkon konturi), devor bo'laklari (naqsh), tom
  (A.bars || []).forEach(S => { const h = S.h * 1000, out = (L, i) => { const a = L[i], b = L[(i + 1) % L.length], d = V.unit(V.sub(b, a)); let n = { x: d.y, y: -d.x, z: 0 }; const c = L.reduce((q, p) => ({ x: q.x + p.x / L.length, y: q.y + p.y / L.length }), { x: 0, y: 0 }); if (n.x * ((a.x + b.x) / 2 - c.x) + n.y * ((a.y + b.y) / 2 - c.y) < 0) n = { x: -n.x, y: -n.y, z: 0 }; return n; };
    S.floors.forEach(Fl => { const O = Fl.outer, B2 = Fl.base, z = Fl.z, st = 4; for (let i = 0; i < O.length; i += st) { const j = Math.min(O.length - 1, i + st), a = O[i], b = O[j]; F.push({ pts: [{ x: a.x, y: a.y, z: z - 150 }, { x: b.x, y: b.y, z: z - 150 }, { x: b.x, y: b.y, z: z + 350 }, { x: a.x, y: a.y, z: z + 350 }], n: out(O, i), kind: 'wtop', id: S.e.id, lv: 'bar' }); }
      const half = B2.length / 2; for (let i = 0; i < B2.length; i += st) { const j = Math.min(B2.length - 1, i + st), a = B2[i], b = B2[j], sIdx = i < half ? Fl.q0 + i : Fl.q0 + (B2.length - 1 - i), zn = S.wallZone(sIdx * S.ds, Fl.k + (i < half ? 0 : 3)); F.push({ pts: [{ x: a.x, y: a.y, z: z + 350 }, { x: b.x, y: b.y, z: z + 350 }, { x: b.x, y: b.y, z: z + h }, { x: a.x, y: a.y, z: z + h }], n: out(B2, i), kind: zn === 'wood' ? 'fin' : zn === 'glass' ? 'glass' : 'wall', id: S.e.id, lv: 'bar' }); } });
    for (let i = 0; i + 1 < S.roof.length; i++) { const [a, b] = S.roof[i], [c, d] = S.roof[i + 1]; F.push({ pts: [a, c, d, b], n: { x: 0, y: 0, z: 1 }, kind: 'wtop', id: S.e.id, lv: 'bar', both: true }); }
    (S.ribbons || []).forEach(R => { for (let i = 0; i + 2 < R.top.length; i += 2) { const j = i + 2, a = R.bot[i], b = R.bot[j]; F.push({ pts: [a, b, R.top[j], R.top[i]], n: out([a, b, { x: 2 * b.x - a.x, y: 2 * b.y - a.y }], 0), kind: 'wtop', id: S.e.id, lv: 'bar', both: true }); } }); });
  // umumiy modullar: primitivlar (teshik dog'larisiz)
  (A.mods || []).forEach(S => S.prims.forEach(r => { if (r.c === COL.dark || r.c === COL.hole || r.p.length < 3) return; F.push({ pts: r.p, n: { x: 0, y: 0, z: 1 }, kind: r.c === COL.glass ? 'glass' : 'wtop', id: S.e.id, lv: 'mod', both: true }); }));
  // oval zal: to'r elementlari (qo'pol), shisha, tom
  (A.ovals || []).forEach(S => { S.members.forEach(m => { for (let j = 0; j + 4 <= m.out.length - 1; j += 4) F.push({ pts: [m.out[j], m.out[j + 4], m.inn[j + 4], m.inn[j]], n: { x: 0, y: 0, z: 1 }, kind: 'wtop', id: S.e.id, lv: 'oval', both: true }); });
    for (let k = 0; k < S.NUg; k += 3) for (let q = 0; q + 4 <= S.NSg; q += 4) { const a = S.glass[k][q], b = S.glass[Math.min(S.NUg, k + 3)][q], c = S.glass[Math.min(S.NUg, k + 3)][q + 4], d = S.glass[k][q + 4]; F.push({ pts: [a, b, c, d], n: { x: 0, y: 0, z: 1 }, kind: 'glass', id: S.e.id, lv: 'oval', both: true }); }
    F.push({ pts: S.roof, n: { x: 0, y: 0, z: 1 }, kind: 'wtop', id: S.e.id, lv: 'oval' }); });
  // stadion: lamellar (tashqi qirra, qo'pol), membrana/vitraj, platforma
  (A.rings || []).forEach(S => { S.ribs.forEach(R => { for (let j = 0; j + 4 <= S.nv; j += 4) { const a = R.out[j], b = R.out[j + 4], ia = R.inn[j], ib = R.inn[j + 4]; F.push({ pts: [a, b, ib, ia], n: { x: 0, y: 0, z: 1 }, kind: 'fin', id: S.e.id, lv: 'ring', both: true }); } });
    for (let k = 0; k < S.NT; k += 2) for (let j = 0; j + 8 <= S.nv; j += 8) { const a = S.skin[k][j], b = S.skin[k + 2][j], c = S.skin[k + 2][j + 8], d = S.skin[k][j + 8]; if (a.z < 50 && d.z < 50) continue; const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, w = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z }; let n = { x: u.y * w.z - u.z * w.y, y: u.z * w.x - u.x * w.z, z: u.x * w.y - u.y * w.x }; const l = Math.hypot(n.x, n.y, n.z) || 1; F.push({ pts: [a, b, c, d], n: { x: n.x / l, y: n.y / l, z: n.z / l }, kind: 'shellw', id: S.e.id, lv: 'ring', both: true }); }
    F.push({ pts: S.disk, n: { x: 0, y: 0, z: 1 }, kind: 'floor', id: S.e.id, lv: 'ring' }); });
  if (upto === M.levels.length - 1) { const R = roofGeom(M, A); if (R) R.faces.forEach(f => { const p = f.pts; const a = V.sub(p[1], p[0]), b = V.sub(p[2], p[0]); const az = { x: p[1].x - p[0].x, y: p[1].y - p[0].y, z: p[1].z - p[0].z }, bz = { x: p[2].x - p[0].x, y: p[2].y - p[0].y, z: p[2].z - p[0].z };
    // normal (reja koordinatasida y pastga — chap qo'l tizimi; ishorani z > 0 bo'yicha tuzatamiz)
    let n = { x: az.y * bz.z - az.z * bz.y, y: az.z * bz.x - az.x * bz.z, z: az.x * bz.y - az.y * bz.x }; const l = Math.hypot(n.x, n.y, n.z) || 1; n = { x: n.x / l, y: n.y / l, z: n.z / l };
    if (f.kind === 'gable') { const c = { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length }; const ctr = R.frame ? { x: R.frame.A.x * (R.frame.a0 + R.frame.a1) / 2 + R.frame.B.x * (R.frame.b0 + R.frame.b1) / 2, y: R.frame.A.y * (R.frame.a0 + R.frame.a1) / 2 + R.frame.B.y * (R.frame.b0 + R.frame.b1) / 2 } : c; if (n.x * (c.x - ctr.x) + n.y * (c.y - ctr.y) < 0) n = { x: -n.x, y: -n.y, z: -n.z }; }
    else if (n.z < 0) n = { x: -n.x, y: -n.y, z: -n.z };
    push(f.kind === 'gable' ? p : p.map(q => ({ x: q.x, y: q.y, z: q.z + 160 })), n, f.kind === 'gable' ? 'wall' : 'roof', 'roof', 'roof'); }); if (!opt.noDet) detRoof(push, R, M); }
  return F;
}

function clipRect(P, R) { let out = P; const [x0, y0, x1, y1] = R; const edges = [[p => p.x >= x0, (a, b) => (x0 - a.x) / (b.x - a.x)], [p => p.x <= x1, (a, b) => (x1 - a.x) / (b.x - a.x)], [p => p.y >= y0, (a, b) => (y0 - a.y) / (b.y - a.y)], [p => p.y <= y1, (a, b) => (y1 - a.y) / (b.y - a.y)]];
  for (const [inside, tf] of edges) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const a = src[i], b = src[(i + 1) % src.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) { const t = tf(a, b); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } } if (out.length < 3) return null; } return out; }
// ---------- kamera: az (gradus, shimoldan soat yo'nalishida qaraydigan tomon), el (gradus). Ortografik.
function camera(az, el) { const a = az * Math.PI / 180, e = el * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
  // X = x, Y = −y. x' = X·ca − Y·sa; y' = X·sa + Y·ca (chuqurlik o'qi); sx = x'; sy = −(z·ce + y'·se); depth = y'·ce − z·se
  const proj = p => { const X = p.x, Y = -p.y, xp = X * ca - Y * sa, yp = X * sa + Y * ca; return { sx: xp, sy: -(p.z * ce + yp * se), d: yp * ce - p.z * se }; };
  const w = { x: sa * ce, y: -(ca * ce), z: -se }; // "uzoqqa" yo'nalish reja koordinatasida (y pastga)
  return { proj, w, az, el }; }
const SHADE = { shelli: [205, 205, 203], shellw: [242, 242, 240], fin: [214, 196, 160], green: [140, 165, 110], slabtop: [226, 223, 217], found: [190, 186, 178], slab: [210, 206, 199], wall: [236, 233, 228], col: [205, 200, 192], glass: [150, 186, 204], door: [118, 88, 64], floor: [222, 219, 213], wtop: [248, 246, 242], roof: [112, 108, 104], frame: [70, 72, 76], reveal: [222, 219, 212], sill: [178, 180, 183], sill2: [244, 243, 240], doorp: [104, 76, 56], metal: [190, 190, 186], plinth: [150, 144, 136], step: [196, 192, 184], canopy: [240, 240, 237], fBrick: [176, 104, 82], fWood: [120, 84, 56], fWood2: [168, 122, 82], fWood3: [96, 66, 44], glassR: [210, 226, 232], fStone: [200, 198, 192], fMetal: [88, 92, 96], fascia: [62, 62, 64], soffit: [226, 223, 216] };
function shadeOf(f, cam, flat) { const c = SHADE[f.kind] || [220, 220, 220]; if (flat) return `rgb(${c.join(',')})`; const L = { x: -0.45, y: -0.55, z: 0.7 }, ll = Math.hypot(L.x, L.y, L.z); const k = 0.72 + 0.28 * Math.max(0, (f.n.x * L.x + f.n.y * L.y + f.n.z * L.z) / ll); return `rgb(${c.map(v => Math.round(v * k)).join(',')})`; }

// ---------- kesuvchi tekislik bilan qirqish (Sutherland–Hodgman, bitta tekislik): saqlanadi — dot(p − P0, v) ≥ 0
function clipFace(pts, P0, v) { const f = p => (p.x - P0.x) * v.x + (p.y - P0.y) * v.y; const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b); if (fa >= 0) out.push(a); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }); } } return out.length >= 3 ? out : null; }
// 2D ko'pburchak ∩ to'g'ri chiziq (P0 + u·s): ichki oraliqlar [s0, s1]
function lineIntervals(poly, P0, u) { const n = { x: -u.y, y: u.x }, ss = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], fa = V.dot(V.sub(a, P0), n), fb = V.dot(V.sub(b, P0), n); if ((fa > 0) !== (fb > 0)) { const t = fa / (fa - fb); ss.push(V.dot(V.sub(V.add(a, V.mul(V.sub(b, a), t)), P0), u)); } }
  ss.sort((a, b) => a - b); const out = []; for (let i = 0; i + 1 < ss.length; i += 2) out.push([ss[i], ss[i + 1]]); return out; }

// ---------- chizish: yuzalar + (kesimda) qopqoqlar → SVG
// katta SVG ni ixchamlashtirish: takrorlanadigan bo'yoq atributlari — CSS sinflari (har SVG o'z prefiksi bilan, varaqda bir nechtasi to'qnashmasin)
let SVGK = 0;
function svgCompact(s) { const pre = 'k' + (++SVGK).toString(36) + Math.random().toString(36).slice(2, 5), M2 = new Map(); let css = '';
  const out = s.replace(/ ((?:fill|stroke|stroke-width|stroke-linejoin|fill-rule)="[^"]*"(?: (?:fill|stroke|stroke-width|stroke-linejoin|fill-rule)="[^"]*")+)(?=\/>)/g, (m, at) => { let c = M2.get(at); if (!c) { c = pre + M2.size.toString(36); M2.set(at, c); css += `.${c}{${at.replace(/([\w-]+)="([^"]*)"/g, '$1:$2;')}}`; } return ` class="${c}"`; });
  return out.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`); }
function draw3D(M, A, o) {
  o = o || {}; const W = o.W || 900, H = o.H || 600; const cam = camera(o.az != null ? o.az : 35, o.el != null ? o.el : 30);
  let F = scene(M, A, { upto: o.upto }); if (o.zmin != null) F = F.filter(f => f.pts.some(p => p.z > o.zmin + 1)).map(f => f.pts.some(p => p.z < o.zmin) ? Object.assign({}, f, { pts: f.pts.map(p => p.z < o.zmin ? Object.assign({}, p, { z: o.zmin }) : p) }) : f); const cut = o.cut; // {p, v} reja koordinatasida; v — qarash yo'nalishi
  if (cut) F = F.map(f => { const c = clipFace(f.pts, cut.p, cut.v); return c ? Object.assign({}, f, { pts: c, holes: (f.holes || []).map(H => clipFace(H, cut.p, cut.v)).filter(Boolean) }) : null; }).filter(Boolean);
  // ko'rinmas tomonlarni tashlash (orqa yuzalar), chuqurlik bo'yicha saralash
  const items = []; F.forEach(f => { let dn = f.n.x * cam.w.x + f.n.y * cam.w.y + f.n.z * cam.w.z; if (dn > 1e-6) { if (!f.both) return; f = Object.assign({}, f, { n: { x: -f.n.x, y: -f.n.y, z: -f.n.z }, kind: f.kind === 'shellw' ? 'shelli' : f.kind }); } const P = f.pts.map(cam.proj); const d = P.reduce((s, q) => s + q.d, 0) / P.length; items.push({ f, P, d: d + (f.kind === 'glass' || f.kind === 'door' ? -1 : 0) - (f.lv === 'roof' && cam.el > 0 ? 1e9 : 0) + (f.kind === 'floor' ? 1e9 : 0) }); });
  // kesim qopqoqlari: devorlar (teshik bo'lsa uzuq), plitalar
  const caps = []; if (cut) { const u = { x: cut.v.y, y: -cut.v.x }; // kesim chizig'i bo'ylab yo'nalish
    M.levels.forEach((Lv, li) => { const L = A.levels[Lv.id]; if (!L || (o.upto && li > M.levels.findIndex(l => l.id === o.upto))) return;
      L.walls.forEach(g => { const iv = lineIntervals(g.poly || g.body, cut.p, u); if (!iv.length) return; const z0 = Lv.z, z1 = Lv.z + (g.w.h || Lv.h);
        let gap = null; const c = Math.abs(V.cross(g.u, u)) > 1e-6 ? lineX(g.a, g.u, cut.p, u) : null; if (c) { const tc = V.dot(V.sub(c, g.a), g.u); const op = L.openings.find(q => !q.bad && q.host === g && tc > q.s0 && tc < q.s1); if (op) gap = [z0 + (op.T.sill || 0), z0 + (op.T.sill || 0) + op.T.h]; }
        iv.forEach(([s0, s1]) => { const seg = (za, zb) => { const P = [[s0, za], [s1, za], [s1, zb], [s0, zb]].map(([s, z]) => { const q = V.add(cut.p, V.mul(u, s)); return { x: q.x, y: q.y, z }; }); caps.push(P.map(cam.proj)); };
          if (gap) { if (gap[0] > z0) seg(z0, gap[0]); if (gap[1] < z1) seg(gap[1], z1); } else seg(z0, z1); }); });
      const capPoly = (P, za, zb, holes) => lineIntervals(P, cut.p, u).forEach(([s0, s1]) => { let segs = [[s0, s1]]; (holes || []).forEach(H => lineIntervals(H, cut.p, u).forEach(([h0, h1]) => { segs = segs.flatMap(([a, b]) => h1 <= a || h0 >= b ? [[a, b]] : [[a, Math.max(a, h0)], [Math.min(b, h1), b]].filter(([x, y]) => y - x > 1)); }));
        segs.forEach(([a, b]) => caps.push([[a, za], [b, za], [b, zb], [a, zb]].map(([sv, z]) => { const q = V.add(cut.p, V.mul(u, sv)); return cam.proj({ x: q.x, y: q.y, z }); }))); });
      L.slabs.forEach(sl => capPoly(sl.poly, Lv.z - sl.t, Lv.z, sl.holes.map(h => h.poly)));
      L.beams.forEach(g => capPoly(g.body, Lv.z + Lv.h - g.T.h, Lv.z + Lv.h));
      if (li === 0) { L.footings.forEach(f => capPoly(f.poly, Lv.z - f.f.d, Lv.z)); (A.summary.strips || []).forEach(g => capPoly(g.poly, Lv.z - (M.found ? M.found.d : 1500), Lv.z)); }
      if (li > 0 && !L.slabs.length) L.outer.forEach(P => lineIntervals(P, cut.p, u).forEach(([s0, s1]) => { const pts = [[s0, Lv.z - 200], [s1, Lv.z - 200], [s1, Lv.z], [s0, Lv.z]].map(([s, z]) => { const q = V.add(cut.p, V.mul(u, s)); return { x: q.x, y: q.y, z }; }); caps.push(pts.map(cam.proj)); }));
    });
    (A.shells || []).forEach(S => { const fv = p => (p.x - cut.p.x) * cut.v.x + (p.y - cut.p.y) * cut.v.y; const O = S.O; for (let i = 0; i < S.nu; i++) for (let j = 0; j < S.nv; j++) { const Q = [O[i][j], O[i + 1][j], O[i + 1][j + 1], O[i][j + 1]], X = []; for (let k = 0; k < 4; k++) { const a = Q[k], b = Q[(k + 1) % 4], fa = fv(a), fb = fv(b); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); X.push(cam.proj({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })); } } if (X.length === 2) caps.push({ line: X }); }
      (S.floors || []).forEach(Fl => Fl.polys.forEach(L => lineIntervals(L, cut.p, u).forEach(([s0, s1]) => caps.push([[s0, Fl.z - (Fl.k ? 300 : 0) - (Fl.k ? 0 : 0)], [s1, Fl.z - (Fl.k ? 300 : 0)], [s1, Fl.z + (Fl.k ? 0 : 150)], [s0, Fl.z + (Fl.k ? 0 : 150)]].map(([sv, z]) => { const q = V.add(cut.p, V.mul(u, sv)); return cam.proj({ x: q.x, y: q.y, z }); }))))); });
    (A.forms || []).forEach(Fm => Fm.floors.forEach(fl => { const cap = (s0, s1, za, zb) => caps.push([[s0, za], [s1, za], [s1, zb], [s0, zb]].map(([sv, z]) => { const q = V.add(cut.p, V.mul(u, sv)); return cam.proj({ x: q.x, y: q.y, z }); }));
      (fl.terr || fl.loops).forEach(Lp => lineIntervals(Lp, cut.p, u).forEach(([s0, s1]) => cap(s0, s1, fl.z, fl.z + 300)));
      fl.loops.forEach(Lp => lineIntervals(Lp, cut.p, u).forEach(([s0, s1]) => { cap(s0, s0 + 150, fl.z, fl.z + fl.h); cap(s1 - 150, s1, fl.z, fl.z + fl.h); })); }));
    const top = M.levels[M.levels.length - 1]; if (top && M.roof && M.roof.type === 'flat' && !o.upto) A.levels[top.id].outer.forEach(P => lineIntervals(P, cut.p, u).forEach(([s0, s1]) => { const z = top.z + top.h; caps.push([[s0, z], [s1, z], [s1, z + 200], [s0, z + 200]].map(([s, zz]) => { const q = V.add(cut.p, V.mul(u, s)); return cam.proj({ x: q.x, y: q.y, z: zz }); })); }));
  }
  items.sort((a, b) => b.d - a.d);
  // kadrga sig'dirish
  const all = items.flatMap(i => i.P).concat(caps.filter(c => !c.line).flat()); if (!all.length) return { svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>`, fit: null };
  const xs = all.map(p => p.sx), ys = all.map(p => p.sy); const bx0 = MN(xs), bx1 = MX(xs), by0 = MN(ys), by1 = MX(ys);
  const pad = o.pad != null ? o.pad : 40, sc = o.scale || Math.min((W - 2 * pad) / Math.max(1, bx1 - bx0), (H - 2 * pad - (o.padBottom || 0)) / Math.max(1, by1 - by0)) * (o.zoom || 1);
  const ox = W / 2 - (bx0 + bx1) / 2 * sc + (o.panX || 0), oy = (H - (o.padBottom || 0)) / 2 - (by0 + by1) / 2 * sc + (o.panY || 0);
  const T = p => (ox + p.sx * sc).toFixed(1) + ',' + (oy + p.sy * sc).toFixed(1);
  // ko'rinmas yuzalarni kesish (fasad/kesim/aksonometriya): oldidan orqaga piksel qoplamasi — biror pikseli ochiq qolgan yuza chiziladi, butunlay yopilgani tashlanadi
  if (o.cull !== false && items.length > 200) { const k = o.cullK || 2, BW = Math.ceil(W * k), BH = Math.ceil(H * k), buf = new Uint8Array(BW * BH), keep = new Uint8Array(items.length);
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i], f = it.f, rings = [it.P].concat((f.holes || []).map(H => H.map(cam.proj))).map(R => R.map(p => [(ox + p.sx * sc) * k, (oy + p.sy * sc) * k]));
      let y0 = Infinity, y1 = -Infinity; rings[0].forEach(q => { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }); const ya = Math.max(0, Math.ceil(y0 - .5)), yb = Math.min(BH - 1, Math.floor(y1 - .5)); let vis = false, any = false;
      for (let y = ya; y <= yb; y++) { const yc = y + .5, X = []; rings.forEach(R => { for (let j = 0, n = R.length; j < n; j++) { const a = R[j], b = R[(j + 1) % n]; if ((a[1] <= yc) !== (b[1] <= yc)) X.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } }); X.sort((a, b) => a - b);
        for (let q = 0; q + 1 < X.length; q += 2) { const xa = Math.max(0, Math.ceil(X[q] - .5)), xb = Math.min(BW - 1, Math.floor(X[q + 1] - .5)); const row = y * BW; for (let x = xa; x <= xb; x++) { any = true; if (!buf[row + x]) { buf[row + x] = 1; vis = true; } } } }
      keep[i] = vis || !any ? 1 : 0; if (!vis) { // qirrasidan ko'rinadigan (yassi) yoki ingichka yuza: chizig'i ochiq joydan o'tsa — qoladi
        const R = rings[0]; let ok = false; for (let j = 0, n = R.length; j < n && !ok; j++) { const a = R[j], b = R[(j + 1) % n], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let t = 0; t <= m; t++) { const x = Math.floor(a[0] + (b[0] - a[0]) * t / m), y = Math.floor(a[1] + (b[1] - a[1]) * t / m); if (x >= 0 && x < BW && y >= 0 && y < BH && !buf[y * BW + x]) { ok = true; break; } } } keep[i] = ok ? 1 : 0; } }
    const n0 = items.length; let w = 0; for (let i = 0; i < n0; i++) if (keep[i]) items[w++] = items[i]; items.length = w; if (o.stats) o.stats.cull = [n0, items.length]; }
  const line = o.flat ? '#3a3936' : '#6b6965', lw = o.flat ? 0.6 : 0.45;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Archivo, sans-serif" font-size="10">`;
  items.forEach(it => { const f = it.f; const sel = o.sel && o.sel.has && o.sel.has(f.id); const fill = sel ? '#f6c9d7' : f.kind === 'glass' && o.flat ? '#dbe9ee' : shadeOf(f, cam, o.flat);
    if (f.edges) { s += `<polygon points="${it.P.map(T).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width=".6"/>`; const pp = it.P.map(T); let d = ''; f.edges.forEach((e, i) => { if (e) d += `M${pp[i]}L${pp[(i + 1) % 4]}`; }); if (d) s += `<path d="${d}" stroke="${line}" stroke-width="${lw * 1.6}" fill="none"/>`; }
    else if (f.kind === 'slabtop' || (f.holes && f.holes.length)) { const d = [it.P].concat((f.holes || []).map(H => H.map(cam.proj))).map(P => 'M' + P.map(T).join('L') + 'Z').join(''); s += `<path d="${d}" fill-rule="evenodd" fill="${fill}" stroke="${f.kind === 'slabtop' ? fill : line}" stroke-width="${f.kind === 'slabtop' ? .8 : lw}"/>`; }
    else s += `<polygon points="${it.P.map(T).join(' ')}" fill="${fill}" stroke="${f.kind === 'wtop' || f.kind === 'floor' ? '#a19e97' : line}" stroke-width="${lw}" stroke-linejoin="round"/>`; });
  // kesimda tom: tekislik bilan kesishish chizig'i
  if (cut) { const R0 = roofGeom(M, A); if (R0 && R0.type !== 'flat' && !o.upto) R0.faces.forEach(f => { const P = f.pts, fv = p => (p.x - cut.p.x) * cut.v.x + (p.y - cut.p.y) * cut.v.y, X = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], fa = fv(a), fb = fv(b); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); X.push(cam.proj({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })); } } if (X.length === 2) caps.push({ line: X }); }); }
  caps.forEach(P => s += P.line ? `<line x1="${T(P.line[0]).split(',')[0]}" y1="${T(P.line[0]).split(',')[1]}" x2="${T(P.line[1]).split(',')[0]}" y2="${T(P.line[1]).split(',')[1]}" stroke="#141414" stroke-width="3" stroke-linecap="round"/>` : `<polygon points="${P.map(T).join(' ')}" fill="#141414" stroke="#141414" stroke-width=".4"/>`);
  if (items.length > 300 && o.compact !== false) s = svgCompact(s);
  return { svg: s, end: '</svg>', T, sc, ox, oy, cam, box: { bx0, bx1, by0, by1 } };
}

// ---------- fasad / kesim: el = 0, qarash yo'nalishi v (reja koordinatasida); izohlar — sathlar, o'qlar, yer chizig'i
function elevation(M, A, o) {
  const v = V.unit(o.v), az = Math.atan2(v.x, -v.y) * 180 / Math.PI; // el = 0 da "uzoqqa" w = (sin az, −cos az) = v
  const R = draw3D(M, A, { W: o.W, H: o.H, az, el: 0, flat: true, zmin: o.cut ? null : detGZ(M), cut: o.cut ? { p: o.p, v } : null, pad: 70, padBottom: 30, scale: o.scale, cull: o.cull, stats: o.stats });
  if (!R.T) return R.svg; let s = R.svg; const cam = R.cam, T = R.T, ink = '#141414', mute = '#6b6965';
  const toS = (x, y, z) => { const q = cam.proj({ x, y, z }); return { X: R.ox + q.sx * R.sc, Y: R.oy + q.sy * R.sc }; };
  const xL = R.ox + R.box.bx0 * R.sc, xR = R.ox + R.box.bx1 * R.sc;
  // yer chizig'i (±0,000) va grunt (kesimda)
  const gz0 = Math.min(0, detGZ(M)), g0 = toS(0, 0, gz0).Y; s += `<line x1="${xL - 40}" y1="${g0}" x2="${xR + 40}" y2="${g0}" stroke="${ink}" stroke-width="1.6"/>`;
  if (gz0 < 0) s += `<text x="${xL - 36}" y="${g0 - 4}" fill="${mute}" font-family="IBM Plex Mono, monospace">${(gz0 / 1000).toFixed(3).replace('-', '−')}</text>`; if (o.cut) { const gb = toS(0, 0, Math.min(-600 + gz0, M.base - 300)).Y; s = s.replace('font-size="10">', `font-size="10"><rect x="${xL - 40}" y="${g0}" width="${xR - xL + 80}" height="${gb - g0}" fill="#ecebe8"/>`); }
  // sathlar
  // sathlar: belgilar bir-biriga tegmasin — oraliq tor bo'lsa nom yashiriladi, juda tor bo'lsa ba'zi qavatlar belgisi tashlanadi (±0, eng past, eng yuqori va balandligi o'zgargan qavatlar doim qoladi)
  { const top = M.levels[M.levels.length - 1], mk = M.levels.map((Lv, i) => ({ Lv, z: Lv.z, y: toS(0, 0, Lv.z).Y, i })); if (top) mk.push({ z: top.z + top.h, y: toS(0, 0, top.z + top.h).Y, top: true });
    const gaps = mk.slice(1).map((m, i) => Math.abs(m.y - mk[i].y)).sort((a, b) => a - b), med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 99, nm = med >= 25, need = nm ? 25 : 12;
    const must = m => m.top || m.i === 0 || Math.abs(m.z) < 1 || (m.i > 0 && M.levels[m.i - 1].h !== m.Lv.h) || m.i === M.levels.length - 1;
    const on = new Set(mk.filter(must)); const ys = () => [...on].map(m => m.y); mk.forEach(m => { if (!on.has(m) && ys().every(y => Math.abs(y - m.y) >= need)) on.add(m); });
    // majburiylar ham bir-biriga juda yaqin bo'lsa — pastdagisi qoladi
    [...on].sort((a, b) => b.y - a.y).reduce((last, m) => { if (last != null && Math.abs(last - m.y) < 11 && !m.top) { on.delete(m); return last; } return m.y; }, null);
    mk.forEach(m => { const y = m.y, lab = on.has(m); s += `<line x1="${xR + 12}" y1="${y}" x2="${xR + (lab ? 60 : 30)}" y2="${y}" stroke="${mute}" stroke-width="${lab ? 1 : .6}"/>`; if (!m.top) s += `<path d="M ${xR + 18} ${y} l ${lab ? 5 : 3} ${lab ? -6 : -4} h ${lab ? -10 : -6} z" fill="${ink}"/>`;
      if (lab) s += `<text x="${xR + 28}" y="${y - 3}" fill="${ink}" font-family="IBM Plex Mono, monospace">${m.z >= 0 ? '+' : '−'}${(Math.abs(m.z) / 1000).toFixed(3)}</text>` + (nm && !m.top ? `<text x="${xR + 28}" y="${y + 11}" fill="${mute}">${m.Lv.name}</text>` : ''); });
  }
  // o'qlar: qarash yo'nalishiga perpendikulyar bo'lmagan (kesishadigan) o'qlar — pastda pufakcha
  const u = { x: v.y, y: -v.x }, P0 = o.p || { x: 0, y: 0 }; const yb = Math.max(g0, toS(0, 0, Math.min(0, M.base) - (o.cut ? 300 : 0)).Y) + 34;
  { const G = []; M.grids.forEach(gr => { if (Math.abs(V.cross(gr.d, u)) < 0.3) return; const x = lineX(P0, u, gr.p, gr.d); if (!x) return; const q = toS(x.x, x.y, 0); if (q.X < xL - 30 || q.X > xR + 30) return; G.push({ X: q.X, name: gr.name }); });
    G.sort((a, b) => a.X - b.X); const rowX = []; // yaqin pufakchalar pastki qatorga tushadi (ustma-ust emas)
    G.forEach(g => { let r = 0; while (rowX[r] != null && g.X - rowX[r] < 22) r++; rowX[r] = g.X; const y = yb + r * 24; s += `<line x1="${g.X}" y1="${g0 + 4}" x2="${g.X}" y2="${y - 11}" stroke="${mute}" stroke-dasharray="6 2 1 2"/><circle cx="${g.X}" cy="${y}" r="10" fill="#fff" stroke="${mute}"/><text x="${g.X}" y="${y + 4}" text-anchor="middle" fill="${ink}" font-weight="600">${g.name}</text>`; }); }
  if (o.title) s += `<text x="16" y="22" fill="${ink}" font-size="13" font-weight="600">${o.title}</text>`;
  return s + '</svg>';
}

// ---------- avtomatik fasadlar va kesimlar
function facadeDirs(M, A) { // binoning asosiy yo'nalishi bo'yicha 4 fasad
  const L = A.levels[M.levels[0] && M.levels[0].id]; let ua = { x: 1, y: 0 }; if (L && L.walls.length) { const lw = L.walls.reduce((m, g) => g.L > m.L ? g : m); ua = lw.u; if (Math.abs(ua.x) < Math.abs(ua.y)) ua = { x: -ua.y, y: ua.x }; if (ua.x < 0) ua = V.mul(ua, -1); }
  const ub = { x: -ua.y, y: ua.x }; // pastga (janubga) qaraydigan
  const nm = d => { const a = (Math.atan2(d.x, -d.y) * 180 / Math.PI + 360) % 360; return ['Shimoliy', 'Shimoli-sharqiy', 'Sharqiy', 'Janubi-sharqiy', 'Janubiy', 'Janubi-g‘arbiy', 'G‘arbiy', 'Shimoli-g‘arbiy'][Math.round(a / 45) % 8]; };
  // fasad nomi — fasad qaragan tomon (kuzatuvchi turgan tomon); qarash yo'nalishi v teskari
  return [ub, V.mul(ub, -1), ua, V.mul(ua, -1)].map(face => ({ v: V.mul(face, -1), name: nm(face) + ' fasad' }));
}


// ---------- reja (muharrir va varaq uchun bitta funksiya). VT = {s, ox, oy}: ekran = ox + x·s. o.live — tanlash/hit sinflari, o.paper — oq-qora
const SHFC = { foye: '#f6e7c8', kafe: '#f7d9c6', korg: '#dfe7f2', aud: '#eadcf0', kut: '#e2f0d8', ofis: '#d8edf3', wc: '#d4efec', gard: '#efe5d3', omb: '#e7e4de', yuk: '#e3ddd2', art: '#f0d9e4', tex: '#dddddd', zl: '#c9c9c9', kor: '#eef3f6' }; // qobiq xonalari ranglari (funksiya)
function planSVG(M, A, lv, VT, o) {
  o = o || {}; const SX = x => VT.ox + x * VT.s, SY = y => VT.oy + y * VT.s, sel = o.sel || new Set(), paper = !!o.paper;
  const L = A.levels[lv]; const idx = M.levels.findIndex(l => l.id === lv), below = idx > 0 ? A.levels[M.levels[idx - 1].id] : null;
  const poly = (P, at) => `<polygon points="${P.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join(' ')}" ${at}/>`;
  const ACC = '#e5668f', ink = '#141414', mute = paper ? '#555' : '#a19e97';
  // material shtrixovkalari (Archicad qurilish materiallari kabi; kesimda): g'isht — zich 45°, temirbeton — 45° + nuqtalar, gazoblok — punktir, issiqlik izolyatsiyasi — zigzag, suvoq/gips — bo'sh
  const hk = 'h' + (paper ? 'p' : 'l'), hl = paper ? ink : '#57544e', hatch = o.hatch !== false;
  let s = hatch ? `<defs><pattern id="${hk}b" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff"/><line x1="0" y1="0" x2="0" y2="4" stroke="${hl}" stroke-width=".7"/></pattern><pattern id="${hk}c" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fff"/><line x1="0" y1="0" x2="0" y2="8" stroke="${hl}" stroke-width=".6"/><circle cx="4" cy="4" r=".7" fill="${hl}"/></pattern><pattern id="${hk}g" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="${hl}" stroke-width=".5" stroke-dasharray="2 2"/></pattern><pattern id="${hk}i" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="#fff"/><path d="M0 3 L1.5 0 L4.5 6 L6 3" fill="none" stroke="${hl}" stroke-width=".5"/></pattern></defs>` : '';
  const matH = m => /g.?isht|brick/i.test(m) ? 'b' : /beton|concrete|TB\b/i.test(m) ? 'c' : /gazo|blok|block/i.test(m) ? 'g' : /paxta|issiq|izol|wool|insul/i.test(m) ? 'i' : null;
  // o'qlar
  const bb0 = planBox(M, A), pad = Math.max(2800, 46 / VT.s), bb = { x0: bb0.x0 - pad, y0: bb0.y0 - pad, x1: bb0.x1 + pad, y1: bb0.y1 + pad };
  M.grids.forEach(g => { let c = clipLine(g.p, g.d, bb); if (!c) return; const on = o.selG === g.name; if (g.ray) { const t2 = c.map(e2 => (e2.x - g.p.x) * g.d.x + (e2.y - g.p.y) * g.d.y); if (MX(t2) <= 0) return; const far = t2[0] > t2[1] ? c[0] : c[1]; c = [{ x: g.p.x, y: g.p.y }, far]; } const [p, q] = c;
    s += `<line x1="${SX(p.x)}" y1="${SY(p.y)}" x2="${SX(q.x)}" y2="${SY(q.y)}" stroke="${on ? ACC : mute}" stroke-width="${on ? 1.6 : .7}" stroke-dasharray="14 4 2 4"/>`;
    if (o.live) s += `<line class="gh" data-g="${g.name}" x1="${SX(p.x)}" y1="${SY(p.y)}" x2="${SX(q.x)}" y2="${SY(q.y)}" stroke="transparent" stroke-width="10"/>`;
    (g.ray ? [q] : [p, q]).forEach((e, k0) => { const k = g.ray ? 1 : k0, dir = k ? 1 : -1, r = paper ? 9 : 12, cx = SX(e.x) + g.d.x * (r + 1) * dir, cy = SY(e.y) + g.d.y * (r + 1) * dir; s += `<circle ${o.live ? `class="gh" data-g="${g.name}"` : ''} cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${on ? ACC : paper ? ink : '#6b6965'}" stroke-width="${on ? 1.6 : 1}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${paper ? 9 : 11}" font-weight="600" fill="${ink}" pointer-events="none">${g.name}</text>`; }); });
  (M.cgrids || []).forEach(g => { const on = o.selG === g.name, r = g.r * VT.s, cx = SX(g.c.x), cy = SY(g.c.y), ang = -Math.PI / 4, bx = cx + (r + 14) * Math.cos(ang), by = cy + (r + 14) * Math.sin(ang), rb = paper ? 9 : 12;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${on ? ACC : mute}" stroke-width="${on ? 1.6 : .7}" stroke-dasharray="14 4 2 4"/>`; if (o.live) s += `<circle class="gh" data-g="${g.name}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="transparent" stroke-width="10"/>`;
    s += `<circle ${o.live ? `class="gh" data-g="${g.name}"` : ''} cx="${bx}" cy="${by}" r="${rb}" fill="#fff" stroke="${on ? ACC : paper ? ink : '#6b6965'}" stroke-width="${on ? 1.6 : 1}"/><text x="${bx}" y="${by + 4}" text-anchor="middle" font-size="${paper ? 9 : 11}" font-weight="600" fill="${ink}" pointer-events="none">${g.name}</text>`; });
  // o'lcham zanjirlari (x va y oilalari, tashqarida)
  const edT = (ed, x, y, txt, fs, extra) => { const w = String(txt).length * fs * 0.62 + 8; return o.live && ed ? `<g class="dimed" data-dim="${ed}" ${extra || ''}><rect x="${x - w / 2}" y="${y - fs}" width="${w}" height="${fs + 4}" rx="3" fill="#fff" fill-opacity=".001"/><text x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" font-family="IBM Plex Mono, monospace" fill="${ink}">${txt}</text></g>` : `<text x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" font-family="IBM Plex Mono, monospace" fill="${ink}" ${extra || ''}>${txt}</text>`; };
  if (o.dims !== false) { const fx = M.grids.filter(g => g.fam === 'x').sort((a, b) => a.p.x - b.p.x), fy = M.grids.filter(g => g.fam === 'y').sort((a, b) => a.p.y - b.p.y); const tick = (x, y) => `<line x1="${x - 4}" y1="${y + 4}" x2="${x + 4}" y2="${y - 4}" stroke="${ink}"/>`;
    const d1 = Math.max(1400 * VT.s, 16), d2 = Math.max(600 * VT.s, 15); // zanjirlar orasidagi masofa ekranda kamida ~15 px (yozuvlar ustma-ust tushmasin)
    if (fx.length > 1) { const y = SY(bb0.y1) + d1; s += `<line x1="${SX(fx[0].p.x) - 8}" y1="${y}" x2="${SX(fx[fx.length - 1].p.x) + 8}" y2="${y}" stroke="${ink}" stroke-width=".6"/>`; fx.forEach((g, i) => { s += tick(SX(g.p.x), y); const n = fx[i + 1]; if (n) s += edT('gx|' + i, SX((g.p.x + n.p.x) / 2), y - 4, Math.round(n.p.x - g.p.x), paper ? 8.5 : 10); });
      if (fx.length > 2) { const y2 = SY(bb0.y1) + d1 + d2; s += `<line x1="${SX(fx[0].p.x) - 8}" y1="${y2}" x2="${SX(fx[fx.length - 1].p.x) + 8}" y2="${y2}" stroke="${ink}" stroke-width=".6"/>` + tick(SX(fx[0].p.x), y2) + tick(SX(fx[fx.length - 1].p.x), y2) + `<text x="${SX((fx[0].p.x + fx[fx.length - 1].p.x) / 2)}" y="${y2 - 4}" text-anchor="middle" font-size="${paper ? 8.5 : 10}" font-family="IBM Plex Mono, monospace" fill="${ink}">${Math.round(fx[fx.length - 1].p.x - fx[0].p.x)}</text>`; } }
    if (fy.length > 1) { const x = SX(bb0.x1) + d1; s += `<line x1="${x}" y1="${SY(fy[0].p.y) - 8}" x2="${x}" y2="${SY(fy[fy.length - 1].p.y) + 8}" stroke="${ink}" stroke-width=".6"/>`; fy.forEach((g, i) => { s += tick(x, SY(g.p.y)); const n = fy[i + 1]; if (n) { const yy = SY((g.p.y + n.p.y) / 2); s += edT('gy|' + i, x + 5, yy, Math.round(n.p.y - g.p.y), paper ? 8.5 : 10, `transform="rotate(90 ${x + 5} ${yy})"`); } });
      if (fy.length > 2) { const x2 = x + d2, ym = SY((fy[0].p.y + fy[fy.length - 1].p.y) / 2); s += `<line x1="${x2}" y1="${SY(fy[0].p.y) - 8}" x2="${x2}" y2="${SY(fy[fy.length - 1].p.y) + 8}" stroke="${ink}" stroke-width=".6"/>` + tick(x2, SY(fy[0].p.y)) + tick(x2, SY(fy[fy.length - 1].p.y)) + `<text x="${x2 + 5}" y="${ym}" text-anchor="middle" font-size="${paper ? 8.5 : 10}" font-family="IBM Plex Mono, monospace" fill="${ink}" transform="rotate(90 ${x2 + 5} ${ym})">${Math.round(fy[fy.length - 1].p.y - fy[0].p.y)}</text>`; } } }
  // qatlamli uy: tanlangan qavat (o.shf) — balkon konturi, tashqi devor, koridor, kvartiralar (tur rangida) va xonalari, yadrolar (marsh, 2 lift)
  const modsPlan = () => { let s = ''; (A.mods || []).forEach(S => { const on = sel.has(S.e.id), kf = Math.max(0, Math.min(S.floors.length - 1, o.shf || 0));
      S.plan.forEach(r => { if (r.shf != null && r.shf !== kf) return; if (r.t) { const cx = r.p.reduce((a, p) => a + p.x, 0) / r.p.length, cy = r.p.reduce((a, p) => a + p.y, 0) / r.p.length, L2 = String(r.t).split('|'), fs = Math.max(paper ? 2.2 : 5, Math.min(paper ? 6.5 : 9, 420 * VT.s)) * (r.fs || 1); if (!paper && 420 * VT.s < 4.2 && !r.fs) { if (r.fill === 'none' && r.stroke === 'none') return; } else s += `<text x="${SX(cx)}" y="${SY(cy) - (L2.length - 1) * fs * 0.55}" text-anchor="middle" font-size="${fs}" font-family="IBM Plex Sans, sans-serif" fill="${ink}" pointer-events="none">${L2.map((t, i) => `<tspan x="${SX(cx)}" dy="${i ? fs * 1.1 : 0}">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</tspan>`).join('')}</text>`; if (r.fill === 'none' && r.stroke === 'none') return; } const fill = r.fill === 'none' ? (r.hit && o.live ? 'rgba(255,255,255,0.01)' : 'none') : paper ? '#fff' : r.fill; s += poly(r.p, `${r.hit && o.live ? `class="hit" data-id="${S.e.id}"` : ''} fill="${fill}" stroke="${r.hit && on ? ACC : r.stroke === '#141414' ? ink : r.stroke}" stroke-width="${r.hit && on ? 2.4 : r.w}"${r.dash ? ' stroke-dasharray="6 3"' : ''} ${r.hit ? '' : 'pointer-events="none"'}`); });
      const c = S.T([0, 0, 0]); if (!paper) s += `<text x="${SX(c.x)}" y="${SY(c.y)}" text-anchor="middle" font-size="11" fill="${ink}" pointer-events="none">${S.e.id} · ${S.label}</text>`; }); return s; };
  const ovalsPlan = () => { let s = modsPlan(); (A.ovals || []).forEach(S => { const on = sel.has(S.e.id), kf = Math.max(0, Math.min(S.floors.length - 1, o.shf || 0)), F = S.floors[kf];
      S.plaza.forEach(st => s += poly(st.poly, `fill="${paper ? (st.dark ? '#eee' : '#fff') : (st.dark ? '#d6d6d4' : '#f1f0ec')}" stroke="none" pointer-events="none"`));
      s += poly(S.roof, `${o.live ? `class="hit" data-id="${S.e.id}"` : ''} fill="${paper ? '#fff' : 'rgba(245,245,243,.7)'}" stroke="${on ? ACC : mute}" stroke-width="${on ? 2 : .8}" stroke-dasharray="6 3"`);
      if (S.sport && kf === 0) { const SP = S.sport; s += `<path d="M${SP.serv.outer.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join('L')}Z M${SP.serv.hole.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join('L')}Z" fill-rule="evenodd" fill="${paper ? '#fff' : SHFC.wc}" stroke="${ink}" stroke-width="1.2" pointer-events="none"/>`;
        s += poly(SP.zone, `fill="${paper ? '#fff' : '#f2e2d2'}" stroke="${ink}" stroke-width=".8" pointer-events="none"`) + poly(SP.court, `fill="${paper ? '#fff' : '#e8c9a4'}" stroke="${ink}" stroke-width="1" pointer-events="none"`); SP.lines.forEach(L => s += poly(L, `fill="${ink}" stroke="none" pointer-events="none"`));
        SP.tiers.forEach((t, k) => { if (k % 3 && k !== SP.tiers.length - 1) return; let d = ''; for (let q = 0; q < SP.NS; q++) { const q1 = (q + 1) % SP.NS; if (t.on[q] && t.on[q1]) d += `M${SX(t.a[q].x).toFixed(1)},${SY(t.a[q].y).toFixed(1)}L${SX(t.a[q1].x).toFixed(1)},${SY(t.a[q1].y).toFixed(1)}`; } s += `<path d="${d}" stroke="${mute}" stroke-width=".6" fill="none" pointer-events="none"/>`; });
        const tm = SP.tiers[Math.floor(SP.tiers.length / 2)]; SP.vomA.forEach(a => { const q = Math.round(a / (2 * Math.PI) * SP.NS) % SP.NS; if (!tm.on[q]) return; s += `<circle cx="${SX(tm.a[q].x)}" cy="${SY(tm.a[q].y)}" r="${Math.max(2, 900 * VT.s)}" fill="${ink}" pointer-events="none"/>`; }); }
      else if (F) { s += F.hole ? `<path d="M${F.outer.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join('L')}Z M${F.hole.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join('L')}Z" fill-rule="evenodd" fill="${paper ? '#fff' : SHFC.korg}" stroke="${ink}" stroke-width="1.6" pointer-events="none"/>` : poly(F.outer, `fill="${paper ? '#fff' : SHFC.foye}" stroke="${ink}" stroke-width="1.6" pointer-events="none"`); }
      s += poly(S.base, `fill="none" stroke="${on ? ACC : ink}" stroke-width="${on ? 2.4 : 1.4}" pointer-events="none"`);
      S.cores.forEach(C => { s += poly(C.poly, `fill="#fff" stroke="${ink}" stroke-width="1.4" pointer-events="none"`); C.flights.forEach(F4 => s += poly(F4, `fill="none" stroke="${ink}" stroke-width=".5" pointer-events="none"`)); s += poly(C.lift, `fill="none" stroke="${ink}" stroke-width=".7" pointer-events="none"`); });
      S.edges.forEach(L => s += `<polyline points="${L.map(q => SX(q.i.x).toFixed(1) + ',' + SY(q.i.y).toFixed(1)).join(' ')}" fill="none" stroke="#2a6fb0" stroke-width="2" pointer-events="none"/>`);
      const c = S.T([0, 0, 0]); if (!paper) s += `<text x="${SX(c.x)}" y="${SY(c.y) + (S.sport && kf === 0 ? (S.P.cW / 2 + 4) * 1000 * VT.s : 0)}" text-anchor="middle" font-size="11" fill="${ink}" pointer-events="none">${S.e.id} · ${S.sport ? 'sport saroyi · ' + S.sport.seats.toLocaleString('ru') + ' o‘rin ·' : 'oval zal ·'} ${kf + 1}-qavat ${F ? F.area.toLocaleString('ru') + ' m²' : ''}</text>`; }); return s; };
  const ringsPlan = () => { let s = ovalsPlan(); (A.rings || []).forEach(S => { const on = sel.has(S.e.id), kf = o.shf || 0, F = S.floors[Math.min(kf, S.floors.length - 1)];
      s += poly(S.disk, `${o.live ? `class="hit" data-id="${S.e.id}"` : ''} fill="${paper ? '#fff' : '#eeeae3'}" stroke="${on ? ACC : mute}" stroke-width="${on ? 2 : .8}"`); S.arms.forEach(a => s += poly(a.poly, `fill="${paper ? '#fff' : '#eeeae3'}" stroke="${mute}" stroke-width=".8" pointer-events="none"`));
      S.lots.forEach(L => { s += poly(L.poly, `fill="${paper ? '#fff' : '#dcdcdc'}" stroke="${ink}" stroke-width=".8" pointer-events="none"`); L.rows.forEach(([a, b]) => s += `<line x1="${SX(a.x)}" y1="${SY(a.y)}" x2="${SX(b.x)}" y2="${SY(b.y)}" stroke="${mute}" stroke-width=".5" pointer-events="none"/>`); const c = L.poly.reduce((q, p) => ({ x: q.x + p.x / 4, y: q.y + p.y / 4 }), { x: 0, y: 0 }); s += `<text x="${SX(c.x)}" y="${SY(c.y)}" text-anchor="middle" font-size="${paper ? 7 : 9.5}" fill="${ink}" pointer-events="none">P · ${L.cars} joy</text>`; });
      if (kf === 0) (S.boxes || []).forEach(bx => s += poly(bx.poly, `fill="${paper ? '#fff' : '#f0d9e4'}" stroke="${ink}" stroke-width=".5" pointer-events="none"`));
      S.islands.forEach(I => s += poly(I.poly, `fill="${paper ? '#fff' : '#d9e6cf'}" stroke="${mute}" stroke-width=".6" pointer-events="none"`)); if (!paper) S.trees.forEach(t => s += `<circle cx="${SX(t.p.x)}" cy="${SY(t.p.y)}" r="${Math.max(1.5, 2500 * VT.s)}" fill="none" stroke="#6f8f5a" stroke-width=".6" pointer-events="none"/>`);
      if (F && kf > 0) { s += `<path d="M${F.outer.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join('L')}Z M${F.hole.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join('L')}Z" fill-rule="evenodd" fill="${paper ? '#fff' : SHFC.korg}" stroke="${ink}" stroke-width="1.2" pointer-events="none"/>`; }
      else { s += poly(S.pitch.apron, `fill="${paper ? '#fff' : '#cfe3c6'}" stroke="${ink}" stroke-width=".8" pointer-events="none"`) + poly(S.pitch.field, `fill="${paper ? '#fff' : '#b9d8ab'}" stroke="${ink}" stroke-width="1" pointer-events="none"`); S.lines.forEach(L => s += poly(L, `fill="${ink}" stroke="none" pointer-events="none"`));
        S.tiers.forEach((t, k) => { if (k % 4 && k !== S.tiers.length - 1) return; let d = ''; for (let q = 0; q < S.NS; q++) { const q1 = (q + 1) % S.NS; if (t.on[q] && t.on[q1]) d += `M${SX(t.a[q].x).toFixed(1)},${SY(t.a[q].y).toFixed(1)}L${SX(t.a[q1].x).toFixed(1)},${SY(t.a[q1].y).toFixed(1)}`; } s += `<path d="${d}" stroke="${k % 8 ? mute : ink}" stroke-width="${k % 8 ? .5 : .8}" fill="none" pointer-events="none"/>`; });
        const c0 = S.T([0, 0, 0]); S.vomA.forEach(a => { const t = S.tiers[Math.floor(S.tiers.length / 2)]; const q = Math.round(((a + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * S.NS) % S.NS; const p = t.a[q]; s += `<circle cx="${SX(p.x)}" cy="${SY(p.y)}" r="${Math.max(2, 1400 * VT.s)}" fill="${ink}" pointer-events="none"/>`; }); }
      const circ = (r, dash) => `<circle cx="${SX(S.T([0, 0, 0]).x)}" cy="${SY(S.T([0, 0, 0]).y)}" r="${r * 1000 * VT.s}" fill="none" stroke="${on ? ACC : ink}" stroke-width="${dash ? .9 : 2}" ${dash ? 'stroke-dasharray="8 4"' : ''} pointer-events="none"/>`;
      s += circ(S.facR(0.5), false) + circ(S.prof[S.nv][0], true) + circ(S.P.R + S.P.bulge, true);
      S.cores.filter(C => C.top >= kf).forEach(C => { s += poly(C.poly, `fill="#fff" stroke="${ink}" stroke-width="1.4" pointer-events="none"`); C.flights.forEach(F4 => s += poly(F4, `fill="none" stroke="${ink}" stroke-width=".5" pointer-events="none"`)); });
      const c = S.T([0, 0, 0]); if (!paper) s += `<text x="${SX(c.x)}" y="${SY(c.y) + (S.P.pW / 2 + 18) * 1000 * VT.s}" text-anchor="middle" font-size="11" fill="${ink}" pointer-events="none">${S.e.id} · stadion · ${S.seats.toLocaleString('ru')} o‘rin · ${kf > 0 && F ? 'konkors ' + (kf + 1) + '-qavat ' + F.area.toLocaleString('ru') + ' m²' : 'tribuna ' + S.tiers.length + ' qator'}</text>`; }); return s; };
  const barsPlan = () => { let s = ringsPlan(); (A.bars || []).forEach(S => { const on = sel.has(S.e.id), kf = Math.max(0, Math.min(S.floors.length - 1, o.shf || 0)), F = S.floors[kf];
      S.floors.forEach(F2 => { if (F2 !== F) s += poly(F2.base, `fill="none" stroke="${mute}" stroke-width=".4" stroke-dasharray="3 3" pointer-events="none"`); });
      if (!F) return; const lbl = (x, y, t1, t2) => `<text x="${SX(x)}" y="${SY(y) - 2}" text-anchor="middle" font-size="${paper ? 7 : 9}" fill="${ink}" pointer-events="none">${t1}</text>` + (t2 ? `<text x="${SX(x)}" y="${SY(y) + (paper ? 7 : 9)}" text-anchor="middle" font-size="${paper ? 6.5 : 8.5}" font-family="IBM Plex Mono, monospace" fill="${mute}" pointer-events="none">${t2}</text>` : '');
      s += poly(F.outer, `fill="${paper ? '#fff' : '#f7f7f5'}" stroke="${mute}" stroke-width=".7" pointer-events="none"`);
      const AC = { 0: '#e7e4de', 1: '#f6e7c8', 2: '#d8edf3', 3: '#e2f0d8' };
      S.apts.filter(a => a.k === kf).forEach(a => { s += poly(a.poly, `${o.live ? `class="hit" data-id="${S.e.id}"` : ''} fill="${paper ? '#fff' : a.lobby ? '#f0d9e4' : (AC[a.t] || '#eee')}" stroke="${ink}" stroke-width="1.4"`); a.rooms.forEach(r => s += poly(r.poly, `fill="none" stroke="${ink}" stroke-width=".5" pointer-events="none"`)); });
      S.corr.filter(c => c.k === kf).forEach(c => s += poly(c.poly, `fill="${paper ? '#f2f2f2' : SHFC.kor}" stroke="none" pointer-events="none"`));
      // mebel (ingichka kontur) va eshiklar (devorda ochiq joy + tabaqa + ochilish yoyi)
      S.apts.filter(a => a.k === kf).forEach(a => { (a.furn || []).forEach(f => s += poly(f.poly, `fill="${paper ? 'none' : 'rgba(255,255,255,.55)'}" stroke="${mute}" stroke-width=".45" pointer-events="none"`));
        (a.doors || []).forEach(d => { const hx = SX(d.h.x), hy = SY(d.h.y), bx = SX(d.b.x), by = SY(d.b.y), cx = SX(d.c.x), cy = SY(d.c.y), r = Math.hypot(bx - hx, by - hy), sw = ((bx - hx) * (cy - hy) - (by - hy) * (cx - hx)) > 0 ? 1 : 0;
          s += `<line x1="${hx}" y1="${hy}" x2="${bx}" y2="${by}" stroke="${paper ? '#fff' : '#f7f7f5'}" stroke-width="2.6" pointer-events="none"/><line x1="${hx}" y1="${hy}" x2="${cx}" y2="${cy}" stroke="${ink}" stroke-width=".7" pointer-events="none"/><path d="M${bx},${by}A${r},${r} 0 0 ${sw} ${cx},${cy}" fill="none" stroke="${mute}" stroke-width=".4" stroke-dasharray="2 1.5" pointer-events="none"/>`; }); });
      s += poly(F.base, `fill="none" stroke="${on ? ACC : ink}" stroke-width="${on ? 3 : 2.4}" pointer-events="none"`);
      S.cores.filter(C => C.top >= kf).forEach(C => { s += poly(C.poly, `fill="#fff" stroke="${ink}" stroke-width="1.6" pointer-events="none"`); C.flights.forEach((F4, q) => { s += poly(F4, `fill="none" stroke="${ink}" stroke-width=".6" pointer-events="none"`); const [p0, p1, p2, p3] = F4; for (let t = 1; t < C.steps; t++) { const f = t / C.steps, A2 = { x: p0.x + (p3.x - p0.x) * f, y: p0.y + (p3.y - p0.y) * f }, B2 = { x: p1.x + (p2.x - p1.x) * f, y: p1.y + (p2.y - p1.y) * f }; s += `<line x1="${SX(A2.x)}" y1="${SY(A2.y)}" x2="${SX(B2.x)}" y2="${SY(B2.y)}" stroke="${mute}" stroke-width=".35" pointer-events="none"/>`; } });
        C.lifts.forEach(Lf => s += poly(Lf, `fill="none" stroke="${ink}" stroke-width=".8" pointer-events="none"`) + `<path d="M${SX(Lf[0].x)},${SY(Lf[0].y)}L${SX(Lf[2].x)},${SY(Lf[2].y)}M${SX(Lf[1].x)},${SY(Lf[1].y)}L${SX(Lf[3].x)},${SY(Lf[3].y)}" stroke="${ink}" stroke-width=".5" pointer-events="none"/>`); });
      S.apts.filter(a => a.k === kf).forEach(a => { if (a.t && !a.insOk && !paper) s += poly(a.poly, `fill="none" stroke="#d2453a" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"`); s += lbl(a.c.x, a.c.y, a.t ? `${a.t}x` : (a.duplex ? 'dupleks' : a.lobby ? 'kirish' : 'do‘kon'), `${(kf + 1)}.${a.n} · ${a.area.toFixed(0)} m²` + (a.t && a.sun != null ? ` · ☀${a.sun.toFixed(1)}` : '')); });
      if (!paper && kf === 0) s += `<text x="${SX(S.floors[0].base[0].x)}" y="${SY(S.floors[0].base[0].y) - 10}" font-size="11" fill="${ink}" pointer-events="none">${S.e.id} · uy · ${S.floors.length} qavat · ${S.nApt} kv.</text>`; }); return s; };
  const shellsPlan = () => { let s = barsPlan(); (A.shells || []).forEach(S => { const on = sel.has(S.e.id), O = S.O; const ext = (r, sg) => { let b = null; r.forEach(p => { if (p.z > 300 && (!b || sg * (p.y - b.y) > 0)) b = p; }); return b ? { x: r[0].x, y: b.y } : r[Math.round(S.nv / 2)]; }, fr = r => ext(r, -1), bk = r => ext(r, 1); const foot = O.map(fr).concat(O.map(bk).reverse()); // yerga tegish chizig'i (pandus kirmaydi)
      s += poly(foot, `${o.live ? `class="hit" data-id="${S.e.id}"` : ''} fill="${on ? 'rgba(229,102,143,.10)' : paper ? '#fff' : 'rgba(240,240,236,.6)'}" stroke="${on ? ACC : ink}" stroke-width="${on ? 2 : 1.2}"`);
      for (let i = 0; i <= S.nu; i += Math.max(1, Math.round(S.nu / 24))) s += `<polyline points="${O[i].map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join(' ')}" fill="none" stroke="${mute}" stroke-width=".5" pointer-events="none"/>`;
      // qobiq cheti ko'tarilgan joy — punktir (tepada)
      s += `<polyline points="${O.map(r => r[0]).filter(p => p.z > 1200).map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join(' ')}" fill="none" stroke="${ink}" stroke-width=".8" stroke-dasharray="6 3" pointer-events="none"/>`;
      S.glass.forEach(q => s += `<line x1="${SX(q[0].x)}" y1="${SY(q[0].y)}" x2="${SX(q[1].x)}" y2="${SY(q[1].y)}" stroke="#2a6fb0" stroke-width="2" pointer-events="none"/>`);
      // ichki reja: tanlangan qobiq qavati (o.shf) — xonalar funksiya rangida, koridor, yadrolar (zina marshlari, lift), sanuzellar, to'siqlar, auditoriya o'rindiqlari
      const shf = Math.max(0, Math.min((S.floors || []).length - 1, o.shf || 0)), Fl = (S.floors || [])[shf];
      (S.floors || []).forEach(F2 => { if (F2 !== Fl) F2.polys.forEach(L => s += poly(L, `fill="none" stroke="${mute}" stroke-width=".4" stroke-dasharray="3 3" pointer-events="none"`)); });
      if (Fl) { const lbl = (x, y, t1, t2, big) => `<text x="${SX(x)}" y="${SY(y) - (t2 ? 2 : -4)}" text-anchor="middle" font-size="${paper ? (big ? 8.5 : 7) : (big ? 11 : 9)}" fill="${ink}" pointer-events="none">${t1}</text>` + (t2 ? `<text x="${SX(x)}" y="${SY(y) + (paper ? 8 : 10)}" text-anchor="middle" font-size="${paper ? 7 : 9}" font-family="IBM Plex Mono, monospace" fill="${mute}" pointer-events="none">${t2}</text>` : '');
        Fl.polys.forEach(L => s += poly(L, `fill="#fff" stroke="${ink}" stroke-width="1.3" pointer-events="none"`));
        Fl.rooms.forEach(r => { s += poly(r.poly, `fill="${paper ? '#fff' : (SHFC[r.fn] || '#eee')}" stroke="${mute}" stroke-width=".5" pointer-events="none"`); });
        (Fl.corr || []).forEach(L => s += poly(L, `fill="${paper ? '#f4f4f4' : SHFC.kor}" stroke="none" pointer-events="none"`));
        if (shf === 0 && S.hall) { const H = S.hall; (H.rows || []).forEach(rw => s += `<line x1="${SX(rw.a.x)}" y1="${SY(rw.a.y)}" x2="${SX(rw.b.x)}" y2="${SY(rw.b.y)}" stroke="${mute}" stroke-width=".5" pointer-events="none"/>`); }
        if (shf > 0 && S.hall) s += poly(S.hall.poly, `fill="none" stroke="${mute}" stroke-width=".8" stroke-dasharray="8 4" pointer-events="none"`) + (() => { const P = S.hall.poly, c = P.reduce((a, p) => ({ x: a.x + p.x / P.length, y: a.y + p.y / P.length }), { x: 0, y: 0 }); return lbl(c.x, c.y, 'Auditoriya ustidagi bo‘shliq', '', true); })();
        // to'siqlar (shu qavat): pastki kesmasi; yong'in devori qizil, koridordagi yong'in eshigi — oraliq
        (S.parts || []).filter(L => L.k === shf).forEach(L => { const a = L[L.length - 1], b = L[L.length - 2]; if (L.door) { const m1 = { x: a.x + (b.x - a.x) * 0.2, y: a.y + (b.y - a.y) * 0.2 }, m2 = { x: a.x + (b.x - a.x) * 0.8, y: a.y + (b.y - a.y) * 0.8 }; s += `<line x1="${SX(a.x)}" y1="${SY(a.y)}" x2="${SX(m1.x)}" y2="${SY(m1.y)}" stroke="#c0392b" stroke-width="2.4"/><line x1="${SX(m2.x)}" y1="${SY(m2.y)}" x2="${SX(b.x)}" y2="${SY(b.y)}" stroke="#c0392b" stroke-width="2.4"/>`; return; }
          s += `<line x1="${SX(a.x)}" y1="${SY(a.y)}" x2="${SX(b.x)}" y2="${SY(b.y)}" stroke="${L.fire ? '#c0392b' : ink}" stroke-width="${L.fire ? 2.4 : 1}" pointer-events="none"/>`; });
        // yadrolar: devor, ikki marsh (pog'ona chiziqlari, yo'nalish o'qi), lift (diagonal)
        (S.cores || []).filter(C => C.top >= shf).forEach(C => { s += poly(C.poly, `fill="#fff" stroke="${ink}" stroke-width="1.6" pointer-events="none"`);
          C.flights.forEach((F4, q) => { s += poly(F4, `fill="none" stroke="${ink}" stroke-width=".6" pointer-events="none"`); const [p0, p1, p2, p3] = F4, n = C.steps; for (let t = 1; t < n; t++) { const f = t / n, A2 = { x: p0.x + (p3.x - p0.x) * f, y: p0.y + (p3.y - p0.y) * f }, B2 = { x: p1.x + (p2.x - p1.x) * f, y: p1.y + (p2.y - p1.y) * f }; s += `<line x1="${SX(A2.x)}" y1="${SY(A2.y)}" x2="${SX(B2.x)}" y2="${SY(B2.y)}" stroke="${mute}" stroke-width=".35" pointer-events="none"/>`; }
            const m0 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, m1 = { x: (p3.x + p2.x) / 2, y: (p3.y + p2.y) / 2 }, [u0, u1] = q ? [m1, m0] : [m0, m1]; s += `<line x1="${SX(u0.x)}" y1="${SY(u0.y)}" x2="${SX(u1.x)}" y2="${SY(u1.y)}" stroke="${ink}" stroke-width=".6" marker-end="url(#shArr)" pointer-events="none"/>`; });
          const Lf = C.lift; s += poly(Lf, `fill="none" stroke="${ink}" stroke-width=".8" pointer-events="none"`) + `<path d="M${SX(Lf[0].x)},${SY(Lf[0].y)}L${SX(Lf[2].x)},${SY(Lf[2].y)}M${SX(Lf[1].x)},${SY(Lf[1].y)}L${SX(Lf[3].x)},${SY(Lf[3].y)}" stroke="${ink}" stroke-width=".5" pointer-events="none"/>`; });
        Fl.rooms.forEach(r => { if (r.fn === 'zl') return; const big = r.area > 150; if (r.area < 25) return; s += lbl(r.c.x, r.c.y, r.area > 60 ? r.name : '', `${shf + 1}.${r.n} · ${r.area.toFixed(0)} m²`, big); });
        s += `<defs><marker id="shArr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L6,3L0,6z" fill="${ink}"/></marker></defs>`; }
      const c = O[Math.round(S.nu / 2)][Math.round(S.nv / 2)]; if (!(S.floors || []).length) s += `<text x="${SX(c.x)}" y="${SY(c.y)}" text-anchor="middle" font-size="${paper ? 9 : 11}" fill="${ink}" pointer-events="none">${S.e.id} · qobiq · H ${S.H} m</text>`; }); return s; };
  const formsPlan = () => { let s = shellsPlan();
  // shakllar: barcha qavat konturlari (ingichka) + shu qavat sathidagi kesim (to'ldirilgan)
  (A.forms || []).forEach(Fm => { const on = sel.has(Fm.e.id); const zc = (M.levels.find(l => l.id === lv) || { z: 0 }).z + 1200; const fl = Fm.floors.find(f => zc >= f.z && zc < f.z + f.h) || Fm.floors[0];
    Fm.floors.forEach((f, i) => { if (i % 4 && i !== Fm.floors.length - 1) return; f.loops.forEach(Lp => s += poly(Lp, `fill="none" stroke="${on ? ACC : mute}" stroke-width=".5" pointer-events="none"`)); });
    if (fl) { (fl.terr || []).forEach(Lp => s += poly(Lp, `fill="none" stroke="${ink}" stroke-width=".7" stroke-dasharray="5 3" pointer-events="none"`)); fl.loops.forEach(Lp => s += poly(Lp, `${o.live ? `class="hit" data-id="${Fm.e.id}"` : ''} fill="${on ? 'rgba(229,102,143,.12)' : paper ? '#fff' : 'rgba(214,196,160,.25)'}" stroke="${on ? ACC : ink}" stroke-width="${on ? 2.2 : 1.6}"`)); const c = fl.loops[0] && fl.loops[0].reduce((a, p) => ({ x: a.x + p.x / fl.loops[0].length, y: a.y + p.y / fl.loops[0].length }), { x: 0, y: 0 }); if (c) s += `<text x="${SX(c.x)}" y="${SY(c.y)}" text-anchor="middle" font-size="${paper ? 9 : 11}" fill="${ink}" pointer-events="none">${Fm.e.id} · ${fl.i + 1}-qavat · ${fl.area.toFixed(0)} m²</text>`; } });
  return s; };
  if (!L) return s + formsPlan();
  if (below && !paper) below.walls.forEach(g => s += poly(g.poly || g.body, 'fill="none" stroke="#c9c6bf" stroke-width=".8" stroke-dasharray="3 3"'));
  const ROOML = ['#fbeef2', '#eef1f8', '#edf4ef', '#f8f3e6', '#f3eef6'];
  if (!paper) L.rooms.forEach((rm, i) => { s += poly(rm.poly, `fill="${o.fillFn ? o.fillFn(rm) : ROOML[i % 5]}"${o.under ? ' fill-opacity=".25"' : ''}`); });
  s += balcPlan(M, A, lv, SX, SY, o);
  // plitalar (ingichka punktir), teshiklar (diagonal xoch), to'sinlar (yuqorida — punktir), poydevorlar (eng pastki qavatda)
  L.slabs.forEach(sl => { const on = sel.has(sl.s.id); s += poly(sl.poly, `${o.live ? `class="hit" data-id="${sl.s.id}"` : ''} fill="${on ? 'rgba(229,102,143,.08)' : 'none'}" stroke="${on ? ACC : mute}" stroke-width="${on ? 1.8 : .8}" stroke-dasharray="6 3"`); });
  (L.holes || []).forEach(h => { const on = sel.has(h.h.id), P = h.poly; s += poly(P, `${o.live ? `class="hit" data-id="${h.h.id}"` : ''} fill="#fff" stroke="${on ? ACC : ink}" stroke-width="${on ? 1.8 : .8}"`); if (P.length === 4) s += `<path d="M${SX(P[0].x)},${SY(P[0].y)}L${SX(P[2].x)},${SY(P[2].y)}M${SX(P[1].x)},${SY(P[1].y)}L${SX(P[3].x)},${SY(P[3].y)}" stroke="${ink}" stroke-width=".6" pointer-events="none"/>`; });
  if (idx === 0) { L.footings.forEach(f => { const on = sel.has(f.f.id); s += poly(f.poly, `${o.live ? `class="hit" data-id="${f.f.id}"` : ''} fill="none" stroke="${on ? ACC : mute}" stroke-width="${on ? 1.8 : .8}" stroke-dasharray="3 3"`); }); (A.summary.strips || []).forEach(g => s += poly(g.poly, `fill="none" stroke="${mute}" stroke-width=".6" stroke-dasharray="3 3" pointer-events="none"`)); }
  // zinalar
  // zina: katak (tanlash), marshlar (pog'ona chiziqlari), maydonchalar, to'siqlar, yurish chizig'i va ko'tarilish strelkasi
  L.stairs.forEach(st => { const on = sel.has(st.s.id), col = on ? ACC : st.fits ? (paper ? ink : '#6b6965') : '#b23a2e', pl2 = (P, at) => `<polygon points="${P.map(p => SX(p.x) + ',' + SY(p.y)).join(' ')}" ${at}/>`;
    s += `<rect ${o.live ? `class="hit" data-id="${st.s.id}"` : ''} x="${SX(st.x0)}" y="${SY(st.y0)}" width="${Math.max(0, (st.x1 - st.x0) * VT.s)}" height="${Math.max(0, (st.y1 - st.y0) * VT.s)}" fill="${paper ? 'none' : 'rgba(255,255,255,.01)'}" stroke="${col}" stroke-width="${on ? 2 : .6}" stroke-dasharray="${st.fits ? '' : '5 3'}"/>`;
    st.landings.forEach(Ld => s += pl2(Ld.poly, `fill="#fff" stroke="${ink}" stroke-width=".8" pointer-events="none"`));
    const walk = []; st.flights.forEach(F => { s += pl2(F.poly, `fill="#fff" stroke="${ink}" stroke-width=".8" pointer-events="none"`);
      for (let i = 1; i <= F.nT; i++) { const d = i * F.b, a2 = { x: F.o.x + F.u.x * d, y: F.o.y + F.u.y * d }, b2 = { x: a2.x + F.n.x * F.w, y: a2.y + F.n.y * F.w }; s += `<line x1="${SX(a2.x)}" y1="${SY(a2.y)}" x2="${SX(b2.x)}" y2="${SY(b2.y)}" stroke="${ink}" stroke-width=".5" pointer-events="none"/>`; }
      const m0 = { x: F.o.x + F.n.x * F.w / 2, y: F.o.y + F.n.y * F.w / 2 }; walk.push(m0, { x: m0.x + F.u.x * F.run, y: m0.y + F.u.y * F.run }); });
    if (walk.length) { s += `<polyline points="${walk.map(p => SX(p.x) + ',' + SY(p.y)).join(' ')}" fill="none" stroke="${col}" stroke-width=".9" pointer-events="none"/><circle cx="${SX(walk[0].x)}" cy="${SY(walk[0].y)}" r="2.5" fill="${col}" pointer-events="none"/>`;
      const e2 = walk[walk.length - 1], e1 = walk[walk.length - 2], d = V.unit(V.sub(e2, e1)), nn = { x: -d.y, y: d.x }, k = 6; s += `<path d="M ${SX(e2.x)} ${SY(e2.y)} L ${SX(e2.x) - d.x * k * 1.6 + nn.x * k} ${SY(e2.y) - d.y * k * 1.6 + nn.y * k} L ${SX(e2.x) - d.x * k * 1.6 - nn.x * k} ${SY(e2.y) - d.y * k * 1.6 - nn.y * k} z" fill="${col}" pointer-events="none"/>`; }
    st.rails.forEach(R => s += `<line x1="${SX(R.a.x)}" y1="${SY(R.a.y)}" x2="${SX(R.b.x)}" y2="${SY(R.b.y)}" stroke="${ink}" stroke-width="1.6" pointer-events="none"/>`); });
  // devorlar
  L.walls.forEach(g => { const on = sel.has(g.w.id), bear = TYPES.wall[g.w.type].bearing; const fill = paper ? (bear ? ink : '#fff') : (bear ? '#3a3936' : '#a19e97');
    const Ly = hatch && TYPES.wall[g.w.type] && TYPES.wall[g.w.type].layers;
    if (Ly && Ly.length && (g.hi - g.lo) * VT.s > 3) { const P = g.poly || g.body, cid = 'wc' + lv + g.w.id + '_' + (g.seg || 0), tot = Ly.reduce((q, l) => q + l.d, 0) || 1, E = (g.hi - g.lo) * 2; let off = g.lo; s += `<clipPath id="${cid}">${poly(P, '')}</clipPath><g clip-path="url(#${cid})" pointer-events="none">`;
      Ly.forEach((l, i) => { const d = (g.hi - g.lo) * l.d / tot, o1 = off, o2 = off + d, at = (p, k, e) => ({ x: p.x + g.n.x * k + g.u.x * e, y: p.y + g.n.y * k + g.u.y * e }), h = matH(l.m); s += poly([at(g.a, o1, -E), at(g.b, o1, E), at(g.b, o2, E), at(g.a, o2, -E)], `fill="${h ? `url(#${hk}${h})` : '#fff'}" stroke="none"`); if (i) s += `<line x1="${SX(at(g.a, o1, -E).x)}" y1="${SY(at(g.a, o1, -E).y)}" x2="${SX(at(g.b, o1, E).x)}" y2="${SY(at(g.b, o1, E).y)}" stroke="${hl}" stroke-width=".4"/>`; off = o2; });
      s += `</g>` + poly(P, `${o.live ? `class="hit" data-id="${g.w.id}"` : ''} fill="${o.live ? 'rgba(255,255,255,.01)' : 'none'}" stroke="${on ? ACC : ink}" stroke-width="${on ? 2.2 : paper ? .9 : (bear ? 1.2 : .7)}"`); }
    else s += poly(g.poly || g.body, `${o.live ? `class="hit" data-id="${g.w.id}"` : ''} fill="${fill}" stroke="${on ? ACC : paper ? ink : fill}" stroke-width="${on ? 2.2 : paper ? .8 : 1}"`);
    if (paper && !bear) { const P = g.poly || g.body; const c = V.mul(V.add(g.a, g.b), .5); s += `<line x1="${SX(g.a.x)}" y1="${SY(g.a.y)}" x2="${SX(g.b.x)}" y2="${SY(g.b.y)}" stroke="${ink}" stroke-width=".4" stroke-dasharray="2 2"/>`; } });
  L.beams.forEach(g => { const on = sel.has(g.bm.id); s += poly(g.body, `${o.live ? `class="hit" data-id="${g.bm.id}"` : ''} fill="${on ? 'rgba(229,102,143,.15)' : 'rgba(255,255,255,.01)'}" stroke="${on ? ACC : ink}" stroke-width="${on ? 2 : .9}" stroke-dasharray="8 4"`); });
  L.columns.forEach(c => { const on = sel.has(c.c.id); s += poly(c.poly, `${o.live ? `class="hit" data-id="${c.c.id}"` : ''} fill="${ink}" stroke="${on ? ACC : ink}" stroke-width="${on ? 2.2 : .5}"`); });
  // teshiklar
  // teshiklar (Revit/Archicad shartli belgilari asosida): devor teshik bo'yicha kesiladi (oq), yonbosh (откос) chiziqlari; eshik — tabaqa to'rtburchagi (40 mm) 90° ochiq holatda + ochilish yoyi, ≥ 1400 mm — ikki tabaqa;
  // deraza — rom (70 mm) devor o'rtasida, rom uchlari, shisha chizig'i, tashqarida otliv, ichkarida podokonnik. Tomonlar: xona tomoni — ichkari (flip — teskari), hand — lo'li o'ngda
  const inRoom = p => L.rooms.some(r => r.poly && inPoly(p, r.poly));
  L.openings.filter(q => !q.bad).forEach(O => { const g = O.host, u = g.u, n = g.n, on = sel.has(O.o.id); const hw = O.T.w / 2; const p0 = { x: O.c.x - u.x * hw, y: O.c.y - u.y * hw }, p1 = { x: O.c.x + u.x * hw, y: O.c.y + u.y * hw };
    const at = (p, k) => ({ x: p.x + n.x * k, y: p.y + n.y * k }), ln = (a, b, w, extra) => `<line x1="${SX(a.x).toFixed(1)}" y1="${SY(a.y).toFixed(1)}" x2="${SX(b.x).toFixed(1)}" y2="${SY(b.y).toFixed(1)}" stroke="${st}" stroke-width="${w}" pointer-events="none"${extra || ''}/>`, e = 1.6 / VT.s;
    const box = [at(p0, g.lo - e), at(p1, g.lo - e), at(p1, g.hi + e), at(p0, g.hi + e)];
    const bad = !paper && A.checks.some(c => c.status === 'FAIL' && new RegExp('\\b' + O.o.id + '\\b').test(c.msg)), st = on ? ACC : bad ? '#b23a2e' : ink, wC = paper ? .9 : 1.2, wT = paper ? .45 : .6;
    s += poly(box, `${o.live ? `class="hit" data-id="${O.o.id}"` : ''} fill="${on ? 'rgba(229,102,143,.10)' : '#fff'}" stroke="none"`);
    s += ln(at(p0, g.lo), at(p0, g.hi), wC) + ln(at(p1, g.lo), at(p1, g.hi), wC);
    const rN = inRoom(at(O.c, g.hi + 250)), rM = inRoom(at(O.c, g.lo - 250)); let inSide = rN && !rM ? 1 : rM && !rN ? -1 : 1; if (O.o.flip) inSide = -inSide; const ext = rN !== rM;
    if (O.o.cat === 'window') { const m = (g.lo + g.hi) / 2, fd = Math.min(70, (g.hi - g.lo) * 0.45) / 2, fw = Math.min(60, O.T.w / 6);
      s += ln(at(p0, m - fd), at(p1, m - fd), wT) + ln(at(p0, m + fd), at(p1, m + fd), wT) + ln(at(p0, m), at(p1, m), wT * .8);
      [[p0, 1], [p1, -1]].forEach(([p, sg]) => { const q = { x: p.x + u.x * fw * sg, y: p.y + u.y * fw * sg }; s += ln(at(q, m - fd), at(q, m + fd), wT); });
      if (ext) { const fo = inSide > 0 ? g.lo : g.hi, fi = inSide > 0 ? g.hi : g.lo, so = fo - inSide * 40, si = fi + inSide * 50;
        s += ln(at(p0, fo), at(p0, so), wT) + ln(at(p0, so), at(p1, so), wT) + ln(at(p1, so), at(p1, fo), wT) + ln(at(p0, fi), at(p0, si), wT) + ln(at(p0, si), at(p1, si), wT) + ln(at(p1, si), at(p1, fi), wT); } }
    else { const face = inSide > 0 ? g.hi : g.lo, ns = { x: n.x * inSide, y: n.y * inSide }, two = O.T.w >= 1400, lw = two ? O.T.w / 2 : O.T.w, th = 40;
      const leaves = two ? [[p0, 1], [p1, -1]] : [O.o.hand ? [p1, -1] : [p0, 1]];
      leaves.forEach(([pe, sg]) => { const H = at(pe, face), ud = { x: u.x * sg, y: u.y * sg }, T2 = { x: H.x + ns.x * lw, y: H.y + ns.y * lw }, C2 = { x: H.x + ud.x * lw, y: H.y + ud.y * lw };
        s += poly([H, T2, { x: T2.x + ud.x * th, y: T2.y + ud.y * th }, { x: H.x + ud.x * th, y: H.y + ud.y * th }], `fill="#fff" stroke="${st}" stroke-width="${wT * 1.4}" pointer-events="none"`);
        const sw = V.cross(ns, ud) > 0 ? 1 : 0; s += `<path d="M ${SX(T2.x).toFixed(1)} ${SY(T2.y).toFixed(1)} A ${(lw * VT.s).toFixed(1)} ${(lw * VT.s).toFixed(1)} 0 0 ${sw} ${SX(C2.x).toFixed(1)} ${SY(C2.y).toFixed(1)}" fill="none" stroke="${st}" stroke-width="${wT}" pointer-events="none"/>`; }); } });
  // xona yozuvlari
  { // xona yozuvlari: kattadan kichikka; yozuv qutisi oldingilari bilan to'qnashsa — xona ichida pastga/yuqoriga suriladi; sig'masa — faqat raqam va maydon, u ham sig'masa — faqat raqam
    const fs1 = paper ? 8.5 : 11, fs2 = paper ? 9 : 11.5, dy = paper ? 11 : 14, boxes = (L.stairs || []).map(st => ({ x0: SX(Math.min(st.x0, st.x1)), x1: SX(Math.max(st.x0, st.x1)), y0: SY(Math.min(st.y0, st.y1)), y1: SY(Math.max(st.y0, st.y1)) })).concat(paper ? [] : L.zones.map(z => ({ x0: SX(z.x) - 6, x1: SX(z.x) + 6, y0: SY(z.y) - 6, y1: SY(z.y) + 6 }))), W2 = (sx, sy) => ({ x: (sx - VT.ox) / VT.s, y: (sy - VT.oy) / VT.s }), hit = b => boxes.some(q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
    [...L.rooms].sort((a, b) => b.net - a.net).forEach(rm => { const X = SX(rm.cx), Y = SY(rm.cy), xs = rm.poly.map(p => SX(p.x)), ys = rm.poly.map(p => SY(p.y)), rw = MX(xs) - MN(xs), rh = MX(ys) - MN(ys);
      const t1full = `${rm.n}${rm.name ? ' · ' + rm.name : ''}`, ar = rm.net.toFixed(2).replace('.', ','), wd = t => t.length * fs1 * 0.58 + 4;
      const opts = [[t1full, ar], [String(rm.n), ar], [String(rm.n), null]]; let done = false;
      for (const [t1, t2] of opts) { const w = Math.max(wd(t1), t2 ? t2.length * fs2 * 0.62 + 4 : 0), h = t2 ? dy + fs2 : fs1 + 2; if ((w > rw * 1.02 || h > rh * 1.02) && t2 !== null && !(t1 === String(rm.n) && !t2)) continue;
        for (const [k, hx] of [[0, 0], [1, 0], [-1, 0], [0, .7], [0, -.7], [1, .7], [-1, .7], [1, -.7], [-1, -.7], [2, 0], [-2, 0], [0, 1.4], [0, -1.4], [3, 0], [-3, 0]]) { const xx = X + hx * w, yy = Y + k * (h + 2), b = { x0: xx - w / 2, x1: xx + w / 2, y0: yy - fs1, y1: yy - fs1 + h }; if ((k || hx) && ![[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].every(([u, v]) => inPoly(W2(u, v), rm.poly))) continue; if (hit(b)) continue;
          boxes.push(b); s += `<text x="${xx}" y="${yy}" text-anchor="middle" font-size="${fs1}" fill="${paper ? ink : '#6b6965'}" pointer-events="none">${t1}</text>` + (t2 ? `<text x="${xx}" y="${yy + dy}" text-anchor="middle" font-size="${fs2}" font-family="IBM Plex Mono, monospace" fill="${ink}" pointer-events="none">${t2}</text>` : ''); done = true; break; }
        if (done) break; } }); }
  if (!paper && !o.fillFn) L.zones.forEach(z => { const on = sel.has(z.z.id); s += `<circle ${o.live ? `class="hit" data-id="${z.z.id}"` : ''} cx="${SX(z.x)}" cy="${SY(z.y)}" r="${on ? 6 : 4}" fill="${on ? ACC : '#fff'}" stroke="${ACC}" stroke-width="1.5"/>`; });
  // o'lchamlar (qo'lda) va matnlar
  const fs0 = paper ? 8.5 : 10.5, dimLine = (a, b, off, id, on, ed) => { const d = V.sub(b, a), L = V.len(d); if (L < 1) return ''; const u = V.unit(d), n = { x: -u.y, y: u.x }, A2 = V.add(a, V.mul(n, off)), B2 = V.add(b, V.mul(n, off)); const col = on ? ACC : ink; let r = '';
    r += `<line x1="${SX(a.x)}" y1="${SY(a.y)}" x2="${SX(A2.x + n.x * Math.sign(off) * 150)}" y2="${SY(A2.y + n.y * Math.sign(off) * 150)}" stroke="${col}" stroke-width=".5"/><line x1="${SX(b.x)}" y1="${SY(b.y)}" x2="${SX(B2.x + n.x * Math.sign(off) * 150)}" y2="${SY(B2.y + n.y * Math.sign(off) * 150)}" stroke="${col}" stroke-width=".5"/>`;
    r += `<line ${id && o.live ? `class="hit" data-id="${id}"` : ''} x1="${SX(A2.x - u.x * 150)}" y1="${SY(A2.y - u.y * 150)}" x2="${SX(B2.x + u.x * 150)}" y2="${SY(B2.y + u.y * 150)}" stroke="${col}" stroke-width="${on ? 1.6 : .7}"/>`;
    [A2, B2].forEach(p => r += `<line x1="${SX(p.x) - 4 * (u.x - n.x)}" y1="${SY(p.y) - 4 * (u.y - n.y)}" x2="${SX(p.x) + 4 * (u.x - n.x)}" y2="${SY(p.y) + 4 * (u.y - n.y)}" stroke="${col}" stroke-width="1.1"/>`);
    let ang = Math.atan2(u.y, u.x) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang <= -90) ang += 180; const m = V.mul(V.add(A2, B2), .5), tp = { x: SX(m.x) + n.x * 0, y: SY(m.y) }, sh = 4; const sgn = ang === Math.atan2(u.y, u.x) * 180 / Math.PI ? 1 : -1;
    if (o.live && ed) { const w = String(Math.round(L)).length * fs0 * 0.62 + 8; r += `<g class="dimed${on ? ' on' : ''}" data-dim="${ed}" transform="rotate(${ang.toFixed(2)} ${tp.x} ${tp.y}) translate(0 ${-sh})"><rect x="${tp.x - w / 2}" y="${tp.y - fs0}" width="${w}" height="${fs0 + 4}" rx="3" fill="#fff" fill-opacity=".001"/><text x="${tp.x}" y="${tp.y}" text-anchor="middle" font-size="${fs0}" font-family="IBM Plex Mono, monospace" fill="${col}">${Math.round(L)}</text></g>`; return r; }
    r += `<text x="${tp.x}" y="${tp.y}" transform="rotate(${ang.toFixed(2)} ${tp.x} ${tp.y}) translate(0 ${-sh})" text-anchor="middle" font-size="${fs0}" font-family="IBM Plex Mono, monospace" fill="${col}" pointer-events="none">${Math.round(L)}</text>`; return r; };
  (L.dims || []).forEach(q => s += dimLine(q.a, q.b, q.d.off, q.d.id, sel.has(q.d.id), 'd|' + q.d.id));
  // tanlangan elementlarning vaqtinchalik o'lchamlari (Archicad kabi): devor/to'sin uzunligi, deraza/eshik — devor uchlaridan masofa; raqamni bosib yangi qiymat yoziladi
  if (o.live) { L.walls.forEach(g => { if (!sel.has(g.w.id) || g.w.arc || g.seg) return; s += dimLine(g.a, g.b, g.hi + 600, null, true, 'w|' + g.w.id); });
    (L.beams || []).forEach(g => { if (sel.has(g.bm.id)) s += dimLine(g.a, g.b, g.T.b / 2 + 500, null, true, 'b|' + g.bm.id); });
    L.stairs.forEach(st => { if (!sel.has(st.s.id)) return; const A0 = { x: st.x0, y: st.y0 }, B0 = { x: st.x1, y: st.y0 }, C0 = { x: st.x0, y: st.y1 }; s += dimLine(A0, B0, -600, null, true, 'sx|' + st.s.id) + dimLine(C0, A0, -600, null, true, 'sy|' + st.s.id);
      const F = st.flights[0]; if (F) { const p0 = F.o, p1 = { x: F.o.x + F.n.x * F.w, y: F.o.y + F.n.y * F.w }; s += dimLine(p0, p1, -350, null, true, 'sw|' + st.s.id); } });
    L.openings.forEach(O => { if (O.bad || O.arcHost || !sel.has(O.o.id)) return; const g = O.host, at = t2 => V.add(g.a, V.mul(g.u, t2)), off = g.lo - 600; if (O.s0 > 1) s += dimLine(g.a, at(O.s0), off, null, true, 'o|' + O.o.id + '|0'); s += dimLine(at(O.s0), at(O.s1), off, null, true, 'ow|' + O.o.id); if (g.L - O.s1 > 1) s += dimLine(at(O.s1), g.b, off, null, true, 'o|' + O.o.id + '|1'); }); }
  (L.lines2d || []).forEach(q => { const on = sel.has(q.ln.id), pts = q.pts.map(p => SX(p.x).toFixed(1) + ',' + SY(p.y).toFixed(1)).join(' '), da = { dash: '8 4', dot: '1.5 3', dashdot: '12 4 2 4' }[q.ln.style] || ''; s += `<polyline points="${pts}" fill="none" stroke="${on ? ACC : ink}" stroke-width="${Math.max(.5, (q.ln.w || .25) * (paper ? 2.8 : 3))}"${da ? ` stroke-dasharray="${da}"` : ''}/>`; if (o.live) s += `<polyline class="hit" data-id="${q.ln.id}" points="${pts}" fill="none" stroke="transparent" stroke-width="10"/>`; });
  (L.texts || []).forEach(q => { const on = sel.has(q.tx.id); s += `<text ${o.live ? `class="hit" data-id="${q.tx.id}"` : ''} x="${SX(q.x)}" y="${SY(q.y)}" font-size="${paper ? 10 : 12.5}" fill="${on ? ACC : ink}" font-weight="500">${q.tx.s.replace(/[<&]/g, '')}</text>`; });
  // avtomatik o'lcham zanjiri: tashqi devorlardagi teshiklar (varaqlarda; muharrirda — tugma bilan)
  if (o.autoDims) L.walls.forEach(g => { if (g.w.arc) return; const ops = L.openings.filter(q => !q.bad && q.o.host === g.w.id); if (!ops.length) return;
    const P = g.poly || g.body, ss = P.map(p => V.dot(V.sub(p, g.a), g.u)), s0 = MN(ss), s1 = MX(ss); const probe = side => V.add(V.mul(V.add(g.a, g.b), .5), V.mul(g.n, side));
    const inRoom = p => L.rooms.some(r => inPolyV(p, r.poly)); const outHi = !inRoom(probe(g.hi + 50)), outLo = !inRoom(probe(g.lo - 50)); if (!outHi && !outLo) return;
    const off = outHi ? g.hi + 650 : g.lo - 650; const marks = [s0, s1].concat(ops.flatMap(q => [q.s0, q.s1])).sort((a, b) => a - b);
    for (let i = 0; i + 1 < marks.length; i++) { if (marks[i + 1] - marks[i] < 1) continue; const a = V.add(g.a, V.mul(g.u, marks[i])), b = V.add(g.a, V.mul(g.u, marks[i + 1])); s += dimLine(a, b, off, null, false).replace(/<line x1="[^"]*" y1="[^"]*" x2="[^"]*" y2="[^"]*" stroke="[^"]*" stroke-width=".5"\/><line x1="[^"]*" y1="[^"]*" x2="[^"]*" y2="[^"]*" stroke="[^"]*" stroke-width=".5"\/>/, ''); } });
  s += formsPlan();
  // kesim chiziqlari
  (M.sections || []).forEach(sc => { const p = resolve(M, sc.p), q = resolve(M, sc.q), d = V.unit(V.sub(q, p)), v = { x: -d.y, y: d.x }, on = o.selS === sc.name; // qarash — chizilgan yo'nalishning o'ng tomoni (ekranda): v = (−d.y, d.x)
    s += `<line ${o.live ? `class="sh" data-s="${sc.name}"` : ''} x1="${SX(p.x)}" y1="${SY(p.y)}" x2="${SX(q.x)}" y2="${SY(q.y)}" stroke="${on ? ACC : ink}" stroke-width="${on ? 2 : 1.2}" stroke-dasharray="18 4 3 4"/>`;
    [p, q].forEach(e => { const a = { x: SX(e.x), y: SY(e.y) }; s += `<line x1="${a.x}" y1="${a.y}" x2="${a.x + v.x * 16}" y2="${a.y + v.y * 16}" stroke="${on ? ACC : ink}" stroke-width="2.4"/><path d="M ${a.x + v.x * 20} ${a.y + v.y * 20} l ${-v.x * 6 + v.y * 4} ${-v.y * 6 - v.x * 4} l ${-v.y * 8} ${v.x * 8} z" fill="${on ? ACC : ink}"/><text x="${a.x - d.x * 14}" y="${a.y - d.y * 14 + 4}" text-anchor="middle" font-weight="700" font-size="${paper ? 10 : 12}" fill="${on ? ACC : ink}">${sc.name}</text>`; }); });
  return s;
}
function inPolyV(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
// rejaning chegarasi: elementlar + o'qlar. O'q kesishmalari faqat ≥ 20° burchak ostida kesishgan juftlardan (deyarli parallel o'qlar juda uzoqda kesishadi) va elementlar bo'lsa — ular atrofida 6 m ichida; x/y oilasidagi o'qlar har doim kiradi
function planBox(M, A) { const P = [], G = [];
  Object.values(A.levels).forEach(L => L.walls.forEach(g => P.push(...(g.poly || g.body)))); (A.forms || []).forEach(F => F.floors[0] && (F.floors[0].terr || F.floors[0].loops).forEach(Lp => P.push(...Lp))); (A.shells || []).forEach(S => S.O.forEach(r => P.push(r[0], r[S.nv]))); (A.bars || []).forEach(S => S.floors.forEach(F => P.push(...F.outer))); (A.ovals || []).forEach(S => { P.push(...S.base); S.plaza.forEach(st => P.push(...st.poly)); }); (A.rings || []).forEach(S => { P.push(...S.disk); S.lots.forEach(L => P.push(...L.poly)); }); (A.mods || []).forEach(S => S.plan.forEach(r => P.push(...r.p)));
  M.grids.forEach((g, i) => M.grids.forEach((h, j) => { if (j <= i || Math.abs(V.cross(g.d, h.d)) < 0.34) return; const x = lineX(g.p, g.d, h.p, h.d); if (x) G.push(x); }));
  const box = Q => { const xs = Q.map(p => p.x), ys = Q.map(p => p.y); return { x0: MN(xs), y0: MN(ys), x1: MX(xs), y1: MX(ys) }; };
  (M.cgrids || []).forEach(g => G.push({ x: g.c.x - g.r, y: g.c.y - g.r }, { x: g.c.x + g.r, y: g.c.y + g.r })); if (!P.length) return G.length ? box(G) : { x0: -2000, y0: -2000, x1: 12000, y1: 10000 };
  const e = box(P), m = 6000, Q = P.concat(G.filter(p => p.x > e.x0 - m && p.x < e.x1 + m && p.y > e.y0 - m && p.y < e.y1 + m)), b = box(Q);
  (M.cgrids || []).forEach(g => { b.x0 = Math.min(b.x0, g.c.x - g.r); b.x1 = Math.max(b.x1, g.c.x + g.r); b.y0 = Math.min(b.y0, g.c.y - g.r); b.y1 = Math.max(b.y1, g.c.y + g.r); });
  M.grids.forEach(g => { if (g.fam === 'x') { b.x0 = Math.min(b.x0, g.p.x); b.x1 = Math.max(b.x1, g.p.x); } else if (g.fam === 'y') { b.y0 = Math.min(b.y0, g.p.y); b.y1 = Math.max(b.y1, g.p.y); } }); return b; }
function clipLine(p, d, b) { let t0 = -1e9, t1 = 1e9; for (const [pp, dd, lo, hi] of [[p.x, d.x, b.x0, b.x1], [p.y, d.y, b.y0, b.y1]]) { if (Math.abs(dd) < 1e-12) { if (pp < lo || pp > hi) return null; continue; } let a = (lo - pp) / dd, c = (hi - pp) / dd; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); } return t0 < t1 ? [{ x: p.x + d.x * t0, y: p.y + d.y * t0 }, { x: p.x + d.x * t1, y: p.y + d.y * t1 }] : null; }
function fitPlan(M, A, W, H, margin) { const b0 = planBox(M, A), m = 3600, b = { x0: b0.x0 - m, y0: b0.y0 - m, x1: b0.x1 + m, y1: b0.y1 + m }; const s = Math.min((W - 2 * (margin || 20)) / (b.x1 - b.x0), (H - 2 * (margin || 20)) / (b.y1 - b.y0)); return { s, ox: (W - (b.x1 - b.x0) * s) / 2 - b.x0 * s, oy: (H - (b.y1 - b.y0) * s) / 2 - b.y0 * s }; }
// kesim ta'rifidan elevation parametrlari
function sectionView(M, sc) { const p = resolve(M, sc.p), q = resolve(M, sc.q), d = V.unit(V.sub(q, p)); return { p, v: { x: -d.y, y: d.x }, cut: true, title: 'Kesim ' + sc.name + '-' + sc.name }; }


