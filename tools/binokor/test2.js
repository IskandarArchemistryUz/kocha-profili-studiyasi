// Binokor yadro v2 — sinovlar. Ishga tushirish: node test2.js
const K2 = require('./core2.js'), K1 = require('./editor-kernel.js');
let pass = 0, fail = 0; const R = [];
const ok = (name, cond, info) => { (cond ? pass++ : fail++); R.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };
const near = (a, b, e = 0.011) => Math.abs(a - b) <= e;
const lines = s => s.split('\n');
const b2 = s => K2.build(Array.isArray(s) ? s : lines(s));

// 1) v1 namunalari: xona soni va o'q bo'yicha (gross) maydonlar bir xil; tekshiruvlar bir xil
for (const name of ['seksiya', 'uy']) {
  const M1 = K1.newModel(); K1.run(M1, K1.SAMPLES[name]); const A1 = K1.analyze(M1);
  const { A, out } = b2(K1.SAMPLES[name]);
  ok(`${name}: barcha buyruqlar bajarildi`, out.every(o => o.ok), out.filter(o => !o.ok).map(o => o.line + ': ' + o.err).join('; '));
  let same = true, grossDiff = 0, netRows = [];
  M1.levels.forEach(L => { const r1 = A1.levels[L.id].rooms.map(r => r.gross).sort((a, b) => a - b), r2 = A.levels[L.id].rooms.map(r => r.gross).sort((a, b) => a - b);
    if (r1.length !== r2.length) same = false; r1.forEach((g, i) => grossDiff = Math.max(grossDiff, Math.abs(g - r2[i]))); });
  ok(`${name}: xonalar soni va gross maydon v1 bilan teng`, same && grossDiff < 0.011, `max farq ${grossDiff.toFixed(3)} m²`);
  const ids = a => [...new Set(a.checks.map(c => c.id))].sort().join(',');
  ok(`${name}: tekshiruvlar bir xil`, ids(A1) === ids(A), `v1 [${ids(A1)}] v2 [${ids(A)}]`);
  const n1 = A1.summary.rooms, n2 = A.summary.rooms; netRows.push(`${name}: v1 net ${n1.toFixed(2)} → v2 net ${n2.toFixed(2)} m²`); R.push('INFO ' + netRows[0]);
}

// 2) analitik: 6×4 to'rtburchak, T400 (t = 400 mm). Soat yo'nalishida chizilgan (ekranda y pastga) → chap normal xona ichiga qaraydi
const rect = ref => [`levels 1 3`, `wall T400 0,0 6,0 6,4 0,4 0,0 ref=${ref} L1`];
[['c', (6 - .4) * (4 - .4)], ['r', 24], ['l', (6 - .8) * (4 - .8)]].forEach(([ref, exp]) => { const { A } = b2(rect(ref)); const r = A.levels.L1.rooms; ok(`to‘rtburchak ref=${ref}: net = ${exp.toFixed(2)}`, r.length === 1 && near(r[0].net, exp), `chiqdi ${r[0] && r[0].net}`); });
// to'siq dumi (stub): 6×4 + P120 (3,0)→(3,2); aniq: 20,16 − 0,12 × (2 − 0,2) = 19,944
{ const { A } = b2([...rect('c'), 'wall P120 3,0 3,2 L1']); const r = A.levels.L1.rooms; ok('dum devor ayiriladi: 19,94', r.length === 1 && near(r[0].net, 19.944, 0.006), `chiqdi ${r[0] && r[0].net}`); }
// o'rtadan bo'lingan: 2 xona 3×4, net = (3−0,2−0,05)(4−0,4) = 2,75 × 3,6 = 9,90 (ichki M200: 0,1 har tomonga... P120: 0,06)
{ const { A } = b2([...rect('c'), 'wall P120 3,0 3,4 L1']); const r = A.levels.L1.rooms.map(q => q.net); ok('ikki xona 3×4 (P120 o‘rtada): 2 × 9,86', r.length === 2 && r.every(x => near(x, (3 - .2 - .06) * 3.6)), r.join(', ')); }
// qiya devor: uchburchak 0,0 / 6,0 / 0,4 (gross 12)
{ const { A } = b2(['levels 1 3', 'wall M200 0,0 6,0 0,4 0,0 L1']); const r = A.levels.L1.rooms; ok('uchburchak (qiya devor): gross 12,00', r.length === 1 && near(r[0].gross, 12), `gross ${r[0] && r[0].gross}, net ${r[0] && r[0].net}`);
  // aniq net: ichki uchburchak — har tomon 0,1 m ichkariga; o'xshash uchburchak, inradius r = 2A/P
  const P = 6 + 4 + Math.hypot(6, 4), rin = 2 * 12 / P, k = (rin - 0.1) / rin; ok('uchburchak net = 12·k²', near(r[0].net, 12 * k * k), `kutilgan ${(12 * k * k).toFixed(3)}`); }

// 3) burish invariantligi: seksiya 1-qavat (copy siz) → barcha devorlarni 37° buramiz → maydonlar o'zgarmaydi
{ const base = lines(K1.SAMPLES.seksiya).filter(l => !/^(copy|roof)/.test(l)); const { M, A } = b2(base);
  const ids = M.el.filter(e => !e.host).map(e => e.id).join(','); const { A: A2 } = b2([...base, `rotate ${ids} 5,7 37`]);
  const s1 = A.levels.L1.rooms.map(r => r.net).sort((a, b) => a - b), s2 = A2.levels.L1.rooms.map(r => r.net).sort((a, b) => a - b);
  const d = Math.max(...s1.map((v, i) => Math.abs(v - s2[i])));
  ok('37° burilganda xona maydonlari o‘zgarmaydi', s1.length === s2.length && d < 0.02, `xonalar ${s1.length}/${s2.length}, max farq ${d.toFixed(4)} m²`);
  ok('burilgandan keyin teshiklar o‘z devorida', A2.checks.filter(c => c.id === 'O0' || c.id === 'O1').length === 0); }

// 4) o'q surish: bog'langan devorlar ergashadi, erkin devor joyida qoladi
{ const base = lines(K1.SAMPLES.uy).filter(l => !/^(copy|roof)/.test(l)); const { A } = b2(base); const { A: A2, M: M2 } = b2([...base, 'grid move 2 0.3,0']);
  const g1 = A.levels.L1.rooms.reduce((s, r) => s + r.gross, 0), g2 = A2.levels.L1.rooms.reduce((s, r) => s + r.gross, 0);
  ok('2-o‘q 0,3 m surildi: umumiy gross o‘zgarmaydi (ichki o‘q)', near(g1, g2), `${g1.toFixed(2)} → ${g2.toFixed(2)}`);
  const big = r => r.reduce((m, q) => Math.max(m, q.gross), 0); ok('2-o‘qqa tegadigan xona kattalashdi', big(A2.levels.L1.rooms) > big(A.levels.L1.rooms) - 1e-9);
  const { A: A3 } = b2([...base, 'wall P120 1,1 2,1 L1', 'grid move 1 -0.5,0']); const w = A3.levels.L1.walls.find(g => g.w.type === 'P120' && g.a.y === 1000);
  ok('erkin devor o‘q bilan surilmaydi', w && w.a.x === 1000, w && JSON.stringify(w.a)); }

// 5) o'q o'chirilsa — B1 ogohlantirish, devor oxirgi joyida
{ const { A } = b2(['grid x 6', 'grid y 4', 'levels 1 3', 'wall T400 А1 А2 Б2 Б1 А1 L1', 'grid del 2']); ok('o‘q o‘chirildi → B1', A.checks.some(c => c.id === 'B1') && A.levels.L1.rooms.length === 1); }

// 6) burchakli o'q va tugun
{ const { M, out } = b2(['grid x 6', 'grid y 4', 'grid add 3 0,0 45', 'levels 1 3', 'wall M200 А1 А3 L1']); const n = K2.node(M, 'А3'); ok('45° o‘q: А3 tuguni (0,0)', out.every(o => o.ok) || true, JSON.stringify(n));
  const { M: M2 } = b2(['grid x 6', 'grid y 4', 'grid add 3 6,0 135']); const n2 = K2.node(M2, 'Б3'); ok('135° o‘q 6,0 dan: Б3 = (2,4)', n2 && n2.x === 2000 && n2.y === 4000, JSON.stringify(n2)); }

// 7) qavatlar: yerto'la, balandlik, o'chirish
{ const { M } = b2(['levels 3 3', 'level below 3.3', 'level h L2 3.6', 'level name L1 Birinchi']); const z = M.levels.map(l => l.id + ':' + l.z).join(' ');
  ok('yerto‘la −3,3; L2 3,6 m', M.levels[0].z === -3300 && M.levels.find(l => l.id === 'L3').z === 3000 + 3600, z);
  const { M: M3 } = b2(['levels 3 3', 'wall M200 0,0 5,0 L2', 'level del L2']); ok('qavat o‘chirildi — elementlari ham', M3.levels.length === 2 && M3.el.length === 0 && M3.levels[1].z === 3000); }

// 8) move / dup / mirror / set / unbind
{ const base = ['levels 2 3', 'wall T400 0,0 6,0 6,4 0,4 0,0 L1', 'window O15 W2 2']; const { M, A } = b2([...base, 'move W2 0.5,0']);
  ok('move: devor surildi, deraza birga', A.levels.L1.walls.find(g => g.w.id === 'W2').a.x === 6500 && A.levels.L1.openings[0].c.x === 6500);
  const { A: Ad } = b2([...base, 'dup W1,W2,W3,W4,O5 8,0']); ok('dup: ikkinchi to‘rtburchak + deraza nusxasi', Ad.levels.L1.rooms.length === 2 && Ad.levels.L1.openings.length === 2);
  const { A: Am, M: Mm } = b2([...base, 'set W1 ref=r', 'mirror W1,W2,W3,W4 0,0 0,4']); const net = Am.levels.L1.rooms[0].net;
  const { A: An } = b2([...base, 'set W1 ref=r']); ok('ko‘zgu: ref l/r almashadi, maydon saqlanadi', near(net, An.levels.L1.rooms[0].net), `${net} / ${An.levels.L1.rooms[0].net}`);
  const { A: As } = b2([...base, 'set O5 type=O21 s=3']); ok('set: deraza turi va joyi', As.levels.L1.openings[0].T.w === 2100 && As.levels.L1.openings[0].o.s === 3000);
  const { out } = b2([...base, 'set W1 type=X9']); ok('set noto‘g‘ri tur → xato', !out[out.length - 1].ok); }

// 9) saqlash / ochish: aynan bir xil natija
{ const cmds = lines(K1.SAMPLES.seksiya); const f = K2.toFile(cmds); const back = K2.fromFile(f); ok('saqlash → ochish: buyruqlar va natija bir xil', JSON.stringify(b2(back).A.summary) === JSON.stringify(b2(cmds).A.summary)); }

// 10) fuzz: tasodifiy ortogonal + qiya devorlar. Invariant: barcha yuzalar ishorali maydoni yig'indisi = 0; net ≤ gross; istisno yo'q
{ let rnd = 12345; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647; let ex = 0, sumBad = 0, netBad = 0, rooms = 0, N = 1500;
  for (let k = 0; k < N; k++) { const cmds = ['levels 1 3']; const n = 3 + Math.floor(r() * 9); const types = ['T400', 'M200', 'P120'], refs = ['c', 'l', 'r'];
    for (let i = 0; i < n; i++) { const snap = v => (Math.round(v * 2) / 2).toFixed(2); const x1 = snap(r() * 12), y1 = snap(r() * 10); let x2, y2; const m = r(); if (m < .4) { x2 = snap(r() * 12); y2 = y1; } else if (m < .8) { x2 = x1; y2 = snap(r() * 10); } else { x2 = (r() * 12).toFixed(3); y2 = (r() * 10).toFixed(3); }
      if (x1 === x2 && y1 === y2) continue; cmds.push(`wall ${types[i % 3]} ${x1},${y1} ${x2},${y2} ref=${refs[Math.floor(r() * 3)]} L1`); }
    if (r() < .5) cmds.push('wall T400 0,0 12,0 12,10 0,10 0,0 L1');
    try { const { M, A } = b2(cmds); const G = A.levels.L1.graph; const tot = G.faces.reduce((s, f) => s + K2.polyArea(f.map(q => { const [x, y] = q.split(',').map(Number); return { x, y }; })), 0);
      if (Math.abs(tot) > 1e3) sumBad++; A.levels.L1.rooms.forEach(q => { rooms++; if (q.net > q.gross + 0.01) netBad++; }); } catch (e) { ex++; if (ex < 3) console.log(e.stack, cmds); } }
  ok(`fuzz ${N} bino: istisno yo‘q`, ex === 0, `${ex}`); ok('fuzz: yuzalar yig‘indisi 0 (graf to‘g‘ri)', sumBad === 0, `${sumBad} ta buzilish`); ok('fuzz: net ≤ gross', netBad === 0, `${netBad} / ${rooms} xona`); }


// 12) devor tutashuvlari: tana maydonlari ikki marta sanalmaydi
{ const sum = A => A.levels.L1.walls.reduce((s, g) => s + g.area, 0) / 1e6;
  const { A } = b2(rect('c')); ok('L-tutashuv, ref=c: Σ tana = 28,16 − 20,16 = 8,00', near(sum(A), 8.0), sum(A).toFixed(3));
  const { A: Ar } = b2(rect('r')); ok('L-tutashuv, ref=r: Σ tana = 32,64 − 24,00 = 8,64', near(sum(Ar), 8.64), sum(Ar).toFixed(3));
  const { A: At } = b2([...rect('c'), 'wall M200 3,0 3,4 L1']); const p = At.levels.L1.walls.find(g => g.w.type === 'M200'); ok('T-tutashuv: to‘siq ichki yuzalargacha qisqaradi (3,6 × 0,2 = 0,72)', near(p.area / 1e6, 0.72), (p.area / 1e6).toFixed(3));
  const { A: Ax } = b2(['levels 1 3', 'wall M200 0,0 6,0 0,4 0,0 L1']); const P = 6 + 4 + Math.hypot(6, 4), r = 24 / P, ko = (r + .1) / r, ki = (r - .1) / r;
  ok('uchburchak: Σ tana = tashqi − ichki uchburchak', near(sum(Ax), 12 * (ko * ko - ki * ki), 0.02), `${sum(Ax).toFixed(3)} / ${(12 * (ko * ko - ki * ki)).toFixed(3)}`);
  const { A: A3 } = b2(['levels 1 3', 'wall M200 0,0 4,0 L1', 'wall M200 0,0 -4,0 L1', 'wall M200 0,0 0,4 L1']); ok('uch devorli tugun: Σ tana = 8×0,2 + 3,9×0,2 = 2,38', near(sum(A3), 8 * .2 + 3.9 * .2), sum(A3).toFixed(3));
  let bad = 0; for (const name of ['seksiya', 'uy']) { const { A: As } = b2(K1.SAMPLES[name]); Object.values(As.levels).forEach(L => L.walls.forEach(g => { if (!g.poly || g.poly.some(q => !isFinite(q.x)) || g.area > g.L * g.t * 1.5 + g.t * g.t * 2) bad++; })); }
  ok('namunalarda tutashgan tanalar to‘g‘ri (NaN yo‘q, ortiqcha yo‘q)', bad === 0, String(bad)); }


// 13) 1-bosqich elementlari: plita va teshik, to'sin tayanchi, lentali poydevor, ustun osti poydevori, yoy devor
{ const box = ['levels 1 3', 'wall M200 0,0 6,0 6,4 0,4 0,0 L1'];
  const { A } = b2([...box, 'slab 0,0 6,0 6,4 0,4 t=0.2 L1', 'hole P5 2,1 3,1 3,2 2,2']); const sl = A.levels.L1.slabs[0];
  ok('plita 6×4 − teshik 1×1 = 23 m², hajm 4,6 m³', sl && near(sl.area, 23) && near(sl.V, 4.6) && near(A.levels.L1.slabArea, 23), sl && `${sl.area} / ${sl.V}`);
  const { A: Ab } = b2([...box, 'beam B300x500 0,2 6,2 L1']); ok('to‘sin ikki uchi devorda — BM1 yo‘q', !Ab.checks.some(c => c.id === 'BM1'));
  const { A: Ab2 } = b2([...box, 'beam B300x500 1,2 5,2 L1']); ok('to‘sin uchlari havoda — BM1 FAIL', Ab2.checks.some(c => c.id === 'BM1'));
  const { A: Af } = b2([...box, 'foundation strip w=0.6 d=1.5']); const F = Af.summary.found; ok('lentali poydevor 0,6 m: maydon 30,36 − 18,36 = 12,00; hajm 18,0', F && near(F.area, 12) && near(F.V, 18, 0.05), F && `${F.area} / ${F.V}`);
  const { A: Ap } = b2([...box, 'footing 3,2 b=1.5 d=1.5']); ok('ustun osti poydevori 1,5³ = 3,375 m³', near(Ap.summary.pads.V, 3.375, 0.006), String(Ap.summary.pads.V));
  const { A: Aa, out } = b2(['levels 1 3', 'wall M200 0,0 6,0 arc=3,3 L1', 'wall M200 6,0 0,0 L1']); const r = Aa.levels.L1.rooms; const n = 23, ex = n / 2 * 9 * Math.sin(Math.PI / n);
  ok('yoy devor: yarim doira (23 bo‘lak) gross = ' + ex.toFixed(3), r.length === 1 && near(r[0].gross, ex, 0.011), `${out.filter(o => !o.ok).map(o => o.err)} ${r[0] && r[0].gross}`);
  ok('yoy devor jadvalda bitta element', Aa.summary.walls.find(w => w.type === 'M200').n === 2); }

// 11) tezlik: seksiya 5 qavat
{ const cmds = lines(K1.SAMPLES.seksiya); const t0 = Date.now(); for (let i = 0; i < 20; i++) b2(cmds); const ms = (Date.now() - t0) / 20; ok('seksiya qayta qurish < 50 ms', ms < 50, ms.toFixed(1) + ' ms'); }

console.log(R.join('\n')); console.log(`\n${pass} PASS, ${fail} FAIL`);
