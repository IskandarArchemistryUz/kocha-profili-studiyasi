/* Binokor — parametrik muharrir (Grasshopper-lite). Graf: tugunlar + simlar → topologik hisob → buyruqlar → model. */
const clampN = v => Math.max(0, Math.min(200, Math.round(+v || 0)));
const toList = v => Array.isArray(v) ? v.map(Number) : (v == null ? [] : [+v]);
function seeded(seed) { let s = (Math.abs(Math.round(seed)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const WT = () => Object.keys(TYPES.wall), OT = () => Object.keys(TYPES.window);
const YN = 'АБВГДЕЖИКЛМН';
const NODES = {
  slider: { t: 'Son slayderi', ins: [], outs: ['N'], p: { label: 'son', min: 1, max: 10, step: 1, value: 5 }, run: (i, p) => ({ N: +p.value }) },
  list: { t: 'Ro‘yxat', ins: [], outs: ['L'], p: { text: '6 1.8 6' }, run: (i, p) => ({ L: String(p.text).trim().split(/[\s,;]+/).map(Number).filter(n => !isNaN(n)) }) },
  repeat: { t: 'Takrorlash', ins: ['Qiymat', 'Soni'], d: { Qiymat: 3.6, Soni: 6 }, outs: ['L'], run: i => ({ L: Array.from({ length: clampN(i.Soni) }, () => +i.Qiymat) }) },
  series: { t: 'Qator (Series)', ins: ['Boshi', 'Qadam', 'Soni'], d: { Boshi: 3, Qadam: 0.3, Soni: 5 }, outs: ['L'], run: i => ({ L: Array.from({ length: clampN(i.Soni) }, (_, k) => +(+i.Boshi + k * i.Qadam).toFixed(3)) }) },
  random: { t: 'Tasodifiy qadamlar', ins: ['Min', 'Max', 'Soni', 'Seed'], d: { Min: 3, Max: 4.2, Soni: 6, Seed: 1 }, outs: ['L'], p: { modul: 0.3 }, run: (i, p) => { const r = seeded(i.Seed); const m = +p.modul || 0.1; return { L: Array.from({ length: clampN(i.Soni) }, () => +(Math.round((+i.Min + r() * (i.Max - i.Min)) / m) * m).toFixed(2)) }; } },
  mirror: { t: 'Oyna-simmetriya', ins: ['L'], outs: ['L'], run: i => { const L = toList(i.L); return { L: L.concat(L.slice().reverse()) }; } },
  expr: { t: 'Ifoda', ins: ['x', 'y'], d: { x: 1, y: 1 }, outs: ['R'], p: { f: 'x*y' }, run: (i, p) => { if (!/^[\w\s+\-*/().,<>=?:%]*$/.test(p.f)) throw new Error('ruxsat etilmagan belgi'); const f = new Function('x', 'y', 'with(Math){return (' + p.f + ')}'); const x = i.x, y = i.y; return { R: Array.isArray(x) ? x.map((v, k) => f(v, Array.isArray(y) ? y[k] : y)) : f(x, y) }; } },
  grid: { t: 'O‘qlar to‘ri', ins: ['X qadamlar', 'Y qadamlar'], outs: ['G', 'Cmd'], run: i => { const x = toList(i['X qadamlar']), y = toList(i['Y qadamlar']); if (!x.length || !y.length) throw new Error('qadamlar bo‘sh'); return { G: { x, y }, Cmd: [`grid x ${x.join(' ')}`, `grid y ${y.join(' ')}`] }; } },
  levels: { t: 'Qavatlar', ins: ['Soni', 'Balandlik', '1-qavat'], d: { Soni: 5, Balandlik: 3 }, outs: ['LV', 'Cmd'], run: i => { const n = Math.max(1, clampN(i.Soni)); const f = i['1-qavat'] != null ? +i['1-qavat'] : +i.Balandlik; return { LV: { n }, Cmd: [`levels ${n} ${+i.Balandlik}${f !== +i.Balandlik ? ' first ' + f : ''}`] }; } },
  shell: { t: 'Qobiq + pog‘ona', ins: ['G', 'LV', 'Pog‘ona qavati', 'Pog‘ona oraliq'], d: { 'Pog‘ona qavati': 0, 'Pog‘ona oraliq': 0 }, outs: ['F', 'Cmd'], p: { tur: 'T400' }, run: (i, p) => {
    const G = i.G, n = i.LV.n, nx = G.x.length, ny = G.y.length; const from = clampN(i['Pog‘ona qavati']), sb = Math.min(nx - 1, clampN(i['Pog‘ona oraliq']));
    const F = [], C = []; const yl = YN[ny];
    for (let k = 1; k <= n; k++) { const b = (from > 0 && k >= from) ? nx - sb : nx; F.push(b); C.push(`wall ${p.tur} А1 А${b + 1} L${k}`, `wall ${p.tur} ${yl}1 ${yl}${b + 1} L${k}`, `wall ${p.tur} А1 ${yl}1 L${k}`, `wall ${p.tur} А${b + 1} ${yl}${b + 1} L${k}`); }
    return { F: { bays: F, ny }, Cmd: C }; } },
  cross: { t: 'Ko‘ndalang devorlar', ins: ['F', 'Har nechta', 'Koridor tasmasi'], d: { 'Har nechta': 1, 'Koridor tasmasi': 0 }, outs: ['Cmd'], p: { tur: 'M200' }, run: (i, p) => {
    const F = i.F, ev = Math.max(1, clampN(i['Har nechta'])), cb = clampN(i['Koridor tasmasi']); const C = [];
    F.bays.forEach((b, k) => { for (let a = 1; a < b; a++) { if (a % ev) continue; for (let j = 0; j < F.ny; j++) { if (cb && j === cb - 1) continue; C.push(`wall ${p.tur} ${YN[j]}${a + 1} ${YN[j + 1]}${a + 1} L${k + 1}`); } } });
    return { Cmd: C }; } },
  longi: { t: 'Bo‘ylama devorlar', ins: ['F'], outs: ['Cmd'], p: { tur: 'M200' }, run: (i, p) => { const F = i.F, C = []; F.bays.forEach((b, k) => { for (let j = 1; j < F.ny; j++) C.push(`wall ${p.tur} ${YN[j]}1 ${YN[j]}${b + 1} L${k + 1}`); }); return { Cmd: C }; } },
  windows: { t: 'Oyna ritmi', ins: ['F', 'Siljish'], d: { Siljish: 0 }, outs: ['Cmd'], p: { naqsh: '12', a: 'O15', b: 'O21' }, run: (i, p) => {
    const F = i.F, pat = String(p.naqsh || '1'), sh = clampN(i.Siljish), C = []; const yl = YN[F.ny];
    F.bays.forEach((b, k) => { for (let a = 0; a < b; a++) { const ch = pat[(a + k * sh) % pat.length]; const ty = ch === '1' ? p.a : ch === '2' ? p.b : null; if (!ty) continue; C.push(`window ${ty} А${a + 1} А${a + 2} L${k + 1}`, `window ${ty} ${yl}${a + 1} ${yl}${a + 2} L${k + 1}`); } });
    return { Cmd: C }; } },
  core: { t: 'Yadro (zina)', ins: ['F', 'Oraliq №', 'Tasma №'], d: { 'Oraliq №': 3, 'Tasma №': 1 }, outs: ['Cmd'], run: i => { const F = i.F, a = Math.max(1, clampN(i['Oraliq №'])), j = Math.max(1, clampN(i['Tasma №'])); const C = []; F.bays.forEach((b, k) => { if (a <= b && j <= F.ny) C.push(`stair ${a} ${a + 1} ${YN[j - 1]} ${YN[j]} L${k + 1}`); }); return { Cmd: C }; } },
  roof: { t: 'Tom', ins: ['Burchak'], d: { Burchak: 30 }, outs: ['Cmd'], p: { tur: 'flat' }, run: (i, p) => ({ Cmd: [p.tur === 'gable' ? `roof gable ${+i.Burchak}` : 'roof flat'] }) },
  form: { t: 'Shakl: ikki minora', ins: ['Qavat chap', 'Qavat o‘ng', 'Baza R', 'Ajralish', 'Tepa R chap', 'Tepa R o‘ng', 'Ajralish boshi', 'Lamel qadami'], d: { 'Qavat chap': 40, 'Qavat o‘ng': 56, 'Baza R': 26, 'Ajralish': 14, 'Tepa R chap': 7.5, 'Tepa R o‘ng': 9, 'Ajralish boshi': 0.12, 'Lamel qadami': 0.9 }, outs: ['Cmd'],
    p: { joy: '0,0', rot: 0, h: 4.2, merge: 0.4, flare: 0.13, k0: 18, pod: 7, terr: 3.5, crown: 3, ell: 1.25, fd: 0.55, lean: 0 }, run: (i, p) => {
      const n1 = Math.max(0, clampN(i['Qavat chap'])), n2 = Math.max(1, clampN(i['Qavat o‘ng'])); if (!/^-?[\d.]+,-?[\d.]+$/.test(String(p.joy).trim())) throw new Error('joy: x,y (m)');
      const kv = { n1, n2, rb: +i['Baza R'], sep: +i['Ajralish'], rt1: +i['Tepa R chap'], rt2: +i['Tepa R o‘ng'], split: +i['Ajralish boshi'], fin: +i['Lamel qadami'] }; ['h', 'merge', 'flare', 'k0', 'pod', 'terr', 'crown', 'ell', 'fd', 'lean'].forEach(k => kv[k] = +p[k]);
      Object.entries(kv).forEach(([k, v]) => { if (!isFinite(v)) throw new Error(k + ' son emas'); });
      return { Cmd: [`form ${String(p.joy).trim()} rot=${+p.rot || 0} ` + Object.entries(kv).map(([k, v]) => k + '=' + +(+v).toFixed(3)).join(' ')] }; } },
  bar: { t: 'Uy: qatlamli blok', ins: ['Uzunlik', 'Chuqurlik', 'Past qanot', 'Baland uch', 'Egilish', 'Balkon', 'Yog‘och', 'Burilish'], d: { Uzunlik: 92, Chuqurlik: 17.5, 'Past qanot': 8, 'Baland uch': 13, Egilish: 22, Balkon: 2.2, 'Yog‘och': 0.3, Burilish: 90 }, outs: ['Cmd'],
    p: { joy: '0,0', bp: 0.45, sw0: 0.35, sw1: 0.95, tip: 6, h: 3.15, balL: 23, balK: 0.21, woodK: 0.17, cor: 1.8, evac: 25, mix1: 25, mix2: 45, mix3: 30 }, run: (i, p) => {
      if (!/^-?[\d.]+,-?[\d.]+$/.test(String(p.joy).trim())) throw new Error('joy: x,y (m)');
      const kv = { L: +i['Uzunlik'], W: +i['Chuqurlik'], nLo: Math.round(+i['Past qanot']), nHi: Math.round(+i['Baland uch']), bend: +i['Egilish'], bal: +i['Balkon'], wood: +i['Yog‘och'] }; ['bp', 'sw0', 'sw1', 'tip', 'h', 'balL', 'balK', 'woodK', 'cor', 'evac', 'mix1', 'mix2', 'mix3'].forEach(k => kv[k] = +p[k]);
      Object.entries(kv).forEach(([k, v]) => { if (!isFinite(v)) throw new Error(k + ' son emas'); }); if (kv.nHi < kv.nLo) throw new Error('Baland uch ≥ past qanot');
      return { Cmd: [`bar ${String(p.joy).trim()} rot=${+i['Burilish'] || 0} ` + Object.entries(kv).map(([k, v]) => k + '=' + +(+v).toFixed(3)).join(' ')] }; } },
  shell: { t: 'Qobiq: to‘lqin sirt', ins: ['Uzunlik', 'Chuqurlik', 'Asos balandlik', 'Chap cho‘qqi', 'To‘lqin', 'Kirish ko‘tarilishi', 'Kirish joyi', 'Uch halqasi', 'Buralish'], d: { Uzunlik: 150, Chuqurlik: 60, 'Asos balandlik': 22, 'Chap cho‘qqi': 24, 'To‘lqin': 20, 'Kirish ko‘tarilishi': 21, 'Kirish joyi': 0.48, 'Uch halqasi': 30, 'Buralish': 5 }, outs: ['Cmd'],
    p: { joy: '0,0', rot: 0, p1c: 0.06, p1s: 0.07, p3c: 0.88, p3s: 0.09, e1w: 0.12, e2c: 1, e2w: 0.1, e3h: 6, e3c: 0.22, top: 0.45, lip: 1.6, land: 12, tail: 0.1, tw: 32, rib: 3.5, fh: 6, wn: 0.55, t: 0.9 }, run: (i, p) => {
      if (!/^-?[\d.]+,-?[\d.]+$/.test(String(p.joy).trim())) throw new Error('joy: x,y (m)');
      const kv = { L: +i['Uzunlik'], W: +i['Chuqurlik'], h0: +i['Asos balandlik'], p1h: +i['Chap cho‘qqi'], p3h: +i['To‘lqin'], e1h: +i['Kirish ko‘tarilishi'], e1c: +i['Kirish joyi'], e2h: +i['Uch halqasi'], curl: +i['Buralish'] }; ['p1c', 'p1s', 'p3c', 'p3s', 'e1w', 'e2c', 'e2w', 'e3h', 'e3c', 'top', 'lip', 'land', 'tail', 'tw', 'rib', 'fh', 'wn', 't'].forEach(k => kv[k] = +p[k]);
      Object.entries(kv).forEach(([k, v]) => { if (!isFinite(v)) throw new Error(k + ' son emas'); });
      return { Cmd: [`shell ${String(p.joy).trim()} rot=${+p.rot || 0} ` + Object.entries(kv).map(([k, v]) => k + '=' + +(+v).toFixed(3)).join(' ')] }; } },
  ring: { t: 'Stadion: halqa-tom', ins: ['Tom radiusi', 'Ichki chet', 'Tom balandligi', 'Qatorlar', 'Ko‘rinish C', 'Lamellar', 'To‘lqinlar', 'Ko‘priklar'], d: { 'Tom radiusi': 105, 'Ichki chet': 50, 'Tom balandligi': 38, Qatorlar: 36, 'Ko‘rinish C': 0.09, Lamellar: 72, 'To‘lqinlar': 7, 'Ko‘priklar': 4 }, outs: ['Cmd'],
    p: { joy: '0,0', rot: 0, pL: 105, pW: 68, run: 8, tread: 0.8, vom: 14, flow: 60, plat: 30, armW: 22 }, run: (i, p) => {
      if (!/^-?[\d.]+,-?[\d.]+$/.test(String(p.joy).trim())) throw new Error('joy: x,y (m)');
      const kv = { R: +i['Tom radiusi'], ri: +i['Ichki chet'], H: +i['Tom balandligi'], rows: Math.round(+i['Qatorlar']), c: +i['Ko‘rinish C'], n: 2 * Math.round(+i['Lamellar'] / 2), f: Math.round(+i['To‘lqinlar']), arms: Math.round(+i['Ko‘priklar']) }; ['pL', 'pW', 'run', 'tread', 'vom', 'flow', 'plat', 'armW'].forEach(k => kv[k] = +p[k]);
      Object.entries(kv).forEach(([k, v]) => { if (!isFinite(v)) throw new Error(k + ' son emas'); }); if (kv.ri >= kv.R - 10) throw new Error('Ichki chet < tom radiusi − 10');
      return { Cmd: [`stadium ${String(p.joy).trim()} rot=${+p.rot || 0} ` + Object.entries(kv).map(([k, v]) => k + '=' + +(+v).toFixed(3)).join(' ')] }; } },
  lenta: modNode('lenta', 'Lenta: ko‘rgazma binosi', { Uzunlik: 'L', Eni: 'W', 'Tom balandligi': 'Hb', 'To‘lqin': 'Ha', Konsol: 'sb', 'Pandus nishabi, %': 'rs' }),
  seksiya: modNode('seksiya', 'Seksiya: kvartirografiya', { Seksiyalar: 'nS', 'Seksiya moduli': 'nM', Chuqurlik: 'D', Qavatlar: 'nF', '1 xonali, %': 'm1', '2 xonali, %': 'm2', '3 xonali, %': 'm3', '4 xonali, %': 'm4' }),
  pixel: modNode('pixel', 'Pog‘onali «piksel» uy', { Bloklar: 'N', 'Eng baland, qavat': 'nHi', 'Eng past, qavat': 'nLo', Siljish: 'sh', 'Balkon ulushi': 'bx', 'Kvartira eni': 'aw' }),
  oval: { t: 'Oval zal: to‘r fasad', ins: ['Uzunlik', 'Eni', 'Balandlik', 'Bo‘rtish', 'Katak', 'Yopiq ulush', 'Arka balandligi', 'Arka eni'], d: { Uzunlik: 120, Eni: 76, Balandlik: 26, 'Bo‘rtish': 4, Katak: 5, 'Yopiq ulush': 0.18, 'Arka balandligi': 14, 'Arka eni': 34 }, outs: ['Cmd'],
    p: { joy: '0,0', rot: 0, fn: 1, cL: 44, cW: 24, rows: 26, ne: 2.6, rtop: 5, arches: 1, archA: 270, fh: 6, void: 0.45, cores: 8, plazaW: 120, plazaD: 70 }, run: (i, p) => {
      if (!/^-?[\d.]+,-?[\d.]+$/.test(String(p.joy).trim())) throw new Error('joy: x,y (m)');
      const kv = { A: +i['Uzunlik'], B: +i['Eni'], H: +i['Balandlik'], bulge: +i['Bo‘rtish'], cell: +i['Katak'], solid: +i['Yopiq ulush'], archH: +i['Arka balandligi'], archW: +i['Arka eni'] }; ['fn', 'cL', 'cW', 'rows', 'ne', 'rtop', 'arches', 'archA', 'fh', 'void', 'cores', 'plazaW', 'plazaD'].forEach(k => kv[k] = +p[k]);
      Object.entries(kv).forEach(([k, v]) => { if (!isFinite(v)) throw new Error(k + ' son emas'); }); if (kv.archH >= kv.H) throw new Error('Arka balandligi < bino balandligi');
      return { Cmd: [`oval ${String(p.joy).trim()} rot=${+p.rot || 0} ` + Object.entries(kv).map(([k, v]) => k + '=' + +(+v).toFixed(3)).join(' ')] }; } },
  panel: { t: 'Panel', ins: ['x'], outs: [], run: () => ({}) },
  out: { t: 'Binokor ⟶ model', ins: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], outs: [], run: () => ({}) },
};
const PTYPE = { tur: () => WT().concat(['flat', 'gable']), a: OT, b: OT };

let GH = null, GHres = null, GHcmd = [];
// namuna: erkin shakl — ikki minora (referens: ikki minora bitta terrasali bazadan o'sib chiqadi)
function ghBar() { const n = (id, type, x, y, pp) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, pp || {}) });
  return { nodes: [
    n('c1', 'slider', 20, 20, { label: 'Uzunlik, m', min: 40, max: 160, step: 2, value: 92 }), n('c2', 'slider', 20, 170, { label: 'Chuqurlik, m', min: 12, max: 24, step: 0.5, value: 17.5 }),
    n('c3', 'slider', 20, 320, { label: 'Past qanot, qavat', min: 3, max: 20, step: 1, value: 8 }), n('c4', 'slider', 20, 470, { label: 'Baland uch, qavat', min: 3, max: 30, step: 1, value: 13 }),
    n('c5', 'slider', 260, 20, { label: 'Egilish, °', min: -45, max: 45, step: 1, value: 22 }), n('c6', 'slider', 260, 170, { label: 'Balkon chiqishi, m', min: 0, max: 4, step: 0.1, value: 2.2 }),
    n('c7', 'slider', 260, 320, { label: 'Yog‘och ulushi', min: 0, max: 0.7, step: 0.02, value: 0.3 }), n('c8', 'slider', 260, 470, { label: 'Burilish (yo‘nalish), °', min: 0, max: 180, step: 5, value: 90 }),
    n('u1', 'bar', 520, 120), n('out', 'out', 820, 200) ],
    wires: [['c1', 'N', 'u1', 'Uzunlik'], ['c2', 'N', 'u1', 'Chuqurlik'], ['c3', 'N', 'u1', 'Past qanot'], ['c4', 'N', 'u1', 'Baland uch'], ['c5', 'N', 'u1', 'Egilish'], ['c6', 'N', 'u1', 'Balkon'], ['c7', 'N', 'u1', 'Yog‘och'], ['c8', 'N', 'u1', 'Burilish'], ['u1', 'Cmd', 'out', 'A']] }; }
// umumiy modul tuguni: kirishlar → MODS parametrlari; qolganlari — tugun xossalari
function modNode(kind, title, ins) { const D = MODS[kind].def, rest = Object.keys(D).filter(k => !Object.values(ins).includes(k)), p = { joy: '0,0', rot: 0 }; rest.forEach(k => p[k] = D[k]); const d = {}; Object.entries(ins).forEach(([l, k]) => d[l] = D[k]);
  return { t: title, ins: Object.keys(ins), d, outs: ['Cmd'], p, run: (i, pp) => { if (!/^-?[\d.]+,-?[\d.]+$/.test(String(pp.joy).trim())) throw new Error('joy: x,y (m)'); const kv = {}; Object.entries(ins).forEach(([l, k]) => kv[k] = +i[l]); rest.forEach(k => kv[k] = +pp[k]); Object.entries(kv).forEach(([k, v]) => { if (!isFinite(v)) throw new Error(k + ' son emas'); });
    return { Cmd: [`${kind} ${String(pp.joy).trim()} rot=${+pp.rot || 0} ` + Object.entries(kv).map(([k, v]) => k + '=' + +(+v).toFixed(3)).join(' ')] }; } }; }
function ghMod(kind, sl) { const n = (id, type, x, y, pp) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, pp || {}) }); const nodes = [], wires = [];
  sl.forEach(([lab, min, max, step], i) => { const id = 'm' + i; nodes.push(n(id, 'slider', 20 + 240 * (i % 2), 20 + 150 * Math.floor(i / 2), { label: lab, min, max, step, value: NODES[kind].d[lab] })); wires.push([id, 'N', 'k1', lab]); });
  nodes.push(n('k1', kind, 520, 120), n('out', 'out', 820, 200)); wires.push(['k1', 'Cmd', 'out', 'A']); return { nodes, wires }; }
const ghLenta = () => ghMod('lenta', [['Uzunlik', 60, 200, 2], ['Eni', 30, 100, 1], ['Tom balandligi', 8, 40, 0.5], ['To‘lqin', 0, 16, 0.5], ['Konsol', 0, 8, 0.5], ['Pandus nishabi, %', 4, 12, 0.5]]);
const ghSeksiya = () => ghMod('seksiya', [['Seksiyalar', 1, 6, 1], ['Seksiya moduli', 5, 12, 1], ['Chuqurlik', 10, 20, 0.3], ['Qavatlar', 2, 25, 1], ['1 xonali, %', 0, 100, 5], ['2 xonali, %', 0, 100, 5], ['3 xonali, %', 0, 100, 5], ['4 xonali, %', 0, 100, 5]]);
const ghPixel = () => ghMod('pixel', [['Bloklar', 2, 16, 1], ['Eng baland, qavat', 3, 25, 1], ['Eng past, qavat', 2, 25, 1], ['Siljish', 0, 10, 0.5], ['Balkon ulushi', 0, 1, 0.05], ['Kvartira eni', 4.8, 12, 0.3]]);
function ghOval() { const n = (id, type, x, y, pp) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, pp || {}) });
  return { nodes: [
    n('e1', 'slider', 20, 20, { label: 'Uzunlik, m', min: 40, max: 220, step: 2, value: 120 }), n('e2', 'slider', 20, 170, { label: 'Eni, m', min: 30, max: 140, step: 2, value: 76 }),
    n('e3', 'slider', 20, 320, { label: 'Balandlik, m', min: 10, max: 60, step: 1, value: 26 }), n('e4', 'slider', 20, 470, { label: 'Bo‘rtish, m', min: 0, max: 10, step: 0.5, value: 4 }),
    n('e5', 'slider', 260, 20, { label: 'To‘r katagi, m', min: 2, max: 10, step: 0.5, value: 5 }), n('e6', 'slider', 260, 170, { label: 'Yopiq panellar ulushi', min: 0, max: 0.8, step: 0.02, value: 0.18 }),
    n('e7', 'slider', 260, 320, { label: 'Arka balandligi, m', min: 0, max: 40, step: 1, value: 14 }), n('e8', 'slider', 260, 470, { label: 'Arka yarim eni, m', min: 5, max: 80, step: 1, value: 34 }),
    n('v1', 'oval', 520, 120), n('out', 'out', 820, 200) ],
    wires: [['e1', 'N', 'v1', 'Uzunlik'], ['e2', 'N', 'v1', 'Eni'], ['e3', 'N', 'v1', 'Balandlik'], ['e4', 'N', 'v1', 'Bo‘rtish'], ['e5', 'N', 'v1', 'Katak'], ['e6', 'N', 'v1', 'Yopiq ulush'], ['e7', 'N', 'v1', 'Arka balandligi'], ['e8', 'N', 'v1', 'Arka eni'], ['v1', 'Cmd', 'out', 'A']] }; }
function ghRing() { const n = (id, type, x, y, pp) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, pp || {}) });
  return { nodes: [
    n('d1', 'slider', 20, 20, { label: 'Tom radiusi, m', min: 70, max: 160, step: 1, value: 105 }), n('d2', 'slider', 20, 170, { label: 'Tom ichki cheti, m', min: 35, max: 90, step: 1, value: 50 }),
    n('d3', 'slider', 20, 320, { label: 'Tom balandligi, m', min: 20, max: 70, step: 1, value: 38 }), n('d4', 'slider', 20, 470, { label: 'Qatorlar', min: 10, max: 70, step: 1, value: 36 }),
    n('d5', 'slider', 260, 20, { label: 'Ko‘rinish chizig‘i C, m', min: 0.06, max: 0.15, step: 0.01, value: 0.09 }), n('d6', 'slider', 260, 170, { label: 'Lamellar soni', min: 24, max: 140, step: 2, value: 72 }),
    n('d7', 'slider', 260, 320, { label: 'Lamel to‘lqinlari', min: 2, max: 14, step: 1, value: 7 }), n('d8', 'slider', 260, 470, { label: 'Ko‘priklar', min: 0, max: 8, step: 1, value: 4 }),
    n('r1', 'ring', 520, 120), n('out', 'out', 820, 200) ],
    wires: [['d1', 'N', 'r1', 'Tom radiusi'], ['d2', 'N', 'r1', 'Ichki chet'], ['d3', 'N', 'r1', 'Tom balandligi'], ['d4', 'N', 'r1', 'Qatorlar'], ['d5', 'N', 'r1', 'Ko‘rinish C'], ['d6', 'N', 'r1', 'Lamellar'], ['d7', 'N', 'r1', 'To‘lqinlar'], ['d8', 'N', 'r1', 'Ko‘priklar'], ['r1', 'Cmd', 'out', 'A']] }; }
function ghShell() { const n = (id, type, x, y, p) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, p || {}) });
  return { nodes: [
    n('b1', 'slider', 20, 20, { label: 'Uzunlik, m', min: 60, max: 260, step: 5, value: 150 }), n('b2', 'slider', 20, 170, { label: 'Chuqurlik, m', min: 20, max: 120, step: 2, value: 60 }),
    n('b3', 'slider', 20, 320, { label: 'Asos balandlik, m', min: 6, max: 40, step: 1, value: 22 }), n('b4', 'slider', 20, 470, { label: 'Chap cho‘qqi (+), m', min: 0, max: 40, step: 1, value: 24 }),
    n('b5', 'slider', 260, 20, { label: 'To‘lqin (+), m', min: 0, max: 40, step: 1, value: 20 }), n('b6', 'slider', 260, 170, { label: 'Kirish ko‘tarilishi, m', min: 0, max: 40, step: 1, value: 21 }),
    n('b7', 'slider', 260, 320, { label: 'Kirish joyi (0…1)', min: 0.15, max: 0.85, step: 0.01, value: 0.48 }), n('b8', 'slider', 260, 470, { label: 'Uch halqasi, m', min: 0, max: 45, step: 1, value: 30 }), n('b9', 'slider', 20, 620, { label: 'Hoshiya buralishi, m', min: 0, max: 12, step: 0.5, value: 5 }),
    n('q1', 'shell', 520, 120), n('out', 'out', 820, 200) ],
    wires: [['b1', 'N', 'q1', 'Uzunlik'], ['b2', 'N', 'q1', 'Chuqurlik'], ['b3', 'N', 'q1', 'Asos balandlik'], ['b4', 'N', 'q1', 'Chap cho‘qqi'], ['b5', 'N', 'q1', 'To‘lqin'], ['b6', 'N', 'q1', 'Kirish ko‘tarilishi'], ['b7', 'N', 'q1', 'Kirish joyi'], ['b8', 'N', 'q1', 'Uch halqasi'], ['b9', 'N', 'q1', 'Buralish'], ['q1', 'Cmd', 'out', 'A']] }; }
function ghForm() { const n = (id, type, x, y, p) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, p || {}) });
  return { nodes: [
    n('a1', 'slider', 20, 20, { label: 'Chap minora, qavat', min: 10, max: 90, step: 1, value: 40 }), n('a2', 'slider', 20, 170, { label: 'O‘ng minora, qavat', min: 10, max: 100, step: 1, value: 56 }),
    n('a3', 'slider', 20, 320, { label: 'Baza radiusi, m', min: 10, max: 45, step: 0.5, value: 26 }), n('a4', 'slider', 20, 470, { label: 'Minoralar ajralishi, m', min: 4, max: 30, step: 0.5, value: 14 }),
    n('a5', 'slider', 20, 620, { label: 'Tepa radius chap, m', min: 4, max: 16, step: 0.5, value: 7.5 }), n('a6', 'slider', 20, 770, { label: 'Tepa radius o‘ng, m', min: 4, max: 16, step: 0.5, value: 9 }),
    n('a7', 'slider', 260, 20, { label: 'Ajralish boshi (0…1)', min: 0, max: 0.5, step: 0.01, value: 0.12 }), n('a8', 'slider', 260, 170, { label: 'Lamel qadami, m', min: 0.45, max: 2.4, step: 0.05, value: 0.9 }),
    n('f1', 'form', 520, 120), n('out', 'out', 820, 200) ],
    wires: [['a1', 'N', 'f1', 'Qavat chap'], ['a2', 'N', 'f1', 'Qavat o‘ng'], ['a3', 'N', 'f1', 'Baza R'], ['a4', 'N', 'f1', 'Ajralish'], ['a5', 'N', 'f1', 'Tepa R chap'], ['a6', 'N', 'f1', 'Tepa R o‘ng'], ['a7', 'N', 'f1', 'Ajralish boshi'], ['a8', 'N', 'f1', 'Lamel qadami'], ['f1', 'Cmd', 'out', 'A']] }; }
function ghDefault() {
  const n = (id, type, x, y, p) => ({ id, type, x, y, p: Object.assign({}, NODES[type].p || {}, p || {}) });
  return { nodes: [
    n('s1', 'slider', 20, 20, { label: 'Oraliqlar soni', min: 2, max: 12, value: 6 }),
    n('s2', 'slider', 20, 185, { label: 'Qadam, m', min: 3, max: 4.2, step: 0.3, value: 3.6 }),
    n('r1', 'repeat', 260, 80),
    n('l1', 'list', 20, 350, { text: '6 1.8 6' }),
    n('g1', 'grid', 500, 160),
    n('s3', 'slider', 20, 480, { label: 'Qavatlar', min: 1, max: 16, value: 7 }),
    n('s4', 'slider', 20, 645, { label: 'Qavat balandligi', min: 2.8, max: 3.6, step: 0.1, value: 3 }),
    n('v1', 'levels', 260, 540),
    n('s5', 'slider', 260, 700, { label: 'Pog‘ona qavati', min: 0, max: 16, value: 5 }),
    n('s6', 'slider', 500, 700, { label: 'Pog‘ona oraliq', min: 0, max: 6, value: 2 }),
    n('h1', 'shell', 740, 380),
    n('c1', 'cross', 1000, 20),
    n('o1', 'longi', 1000, 250),
    n('w1', 'windows', 1000, 410, { naqsh: '12' }),
    n('s7', 'slider', 740, 640, { label: 'Ritm siljishi', min: 0, max: 3, value: 1 }),
    n('k1', 'core', 1000, 680),
    n('t1', 'roof', 1000, 860),
    n('out', 'out', 1250, 300),
  ], wires: [
    ['s2', 'N', 'r1', 'Qiymat'], ['s1', 'N', 'r1', 'Soni'], ['r1', 'L', 'g1', 'X qadamlar'], ['l1', 'L', 'g1', 'Y qadamlar'],
    ['s3', 'N', 'v1', 'Soni'], ['s4', 'N', 'v1', 'Balandlik'],
    ['g1', 'G', 'h1', 'G'], ['v1', 'LV', 'h1', 'LV'], ['s5', 'N', 'h1', 'Pog‘ona qavati'], ['s6', 'N', 'h1', 'Pog‘ona oraliq'],
    ['h1', 'F', 'c1', 'F'], ['h1', 'F', 'o1', 'F'], ['h1', 'F', 'w1', 'F'], ['s7', 'N', 'w1', 'Siljish'], ['h1', 'F', 'k1', 'F'],
    ['g1', 'Cmd', 'out', 'A'], ['v1', 'Cmd', 'out', 'B'], ['h1', 'Cmd', 'out', 'C'], ['c1', 'Cmd', 'out', 'D'], ['o1', 'Cmd', 'out', 'E'], ['w1', 'Cmd', 'out', 'F'], ['k1', 'Cmd', 'out', 'G'], ['t1', 'Cmd', 'out', 'H'],
  ] };
}
// ---- hisob: Kahn bo‘yicha topologik tartib
function ghEval(G) {
  const res = {}, err = {}, indeg = {}, adj = {}; G.nodes.forEach(n => { indeg[n.id] = 0; adj[n.id] = []; });
  G.wires.forEach(([a, , b]) => { if (indeg[b] != null && adj[a]) { indeg[b]++; adj[a].push(b); } });
  const q = G.nodes.filter(n => !indeg[n.id]).map(n => n.id), order = [];
  while (q.length) { const id = q.shift(); order.push(id); adj[id].forEach(b => { if (--indeg[b] === 0) q.push(b); }); }
  if (order.length < G.nodes.length) G.nodes.filter(n => !order.includes(n.id)).forEach(n => err[n.id] = 'sikl (aylana ulanish)');
  let cmd = [];
  order.forEach(id => { const n = G.nodes.find(q2 => q2.id === id), D = NODES[n.type]; const inp = Object.assign({}, D.d || {});
    let missing = [];
    D.ins.forEach(k => { const w = G.wires.find(w2 => w2[2] === id && w2[3] === k); if (w) { const v = res[w[0]] && res[w[0]][w[1]]; if (v === undefined) missing.push(k); else inp[k] = v; } else if (inp[k] === undefined && !['1-qavat'].includes(k) && n.type !== 'out' && n.type !== 'panel') missing.push(k); });
    if (missing.length) { err[id] = 'kirish yo‘q: ' + missing.join(', '); return; }
    try { res[id] = D.run(inp, n.p) || {}; if (n.type === 'out') D.ins.forEach(k => { const v = inp[k]; if (Array.isArray(v)) cmd = cmd.concat(v.filter(x => typeof x === 'string')); }); if (n.type === 'panel') res[id] = { _show: inp.x }; }
    catch (e) { err[id] = e.message; } });
  return { res, err, cmd };
}
// ---- chizish
// ---- kanvas ko'rinishi: g'ildirak — kursor atrofida masshtab, bo'sh joydan sudrash — surish, ikki marta bosish / «Hammasi» — hammasini ko'rsatish
let GHV = { x: 0, y: 0, z: 1 };
function ghZ() { let z = $('#ghz'); if (z) return z; const box = $('#ghc'); z = document.createElement('div'); z.id = 'ghz'; box.appendChild(z); z.appendChild($('#ghw'));
  const ui = document.createElement('div'); ui.id = 'ghui'; ui.innerHTML = '<button class="btn" data-z="-" title="Kichraytirish">−</button><span class="mono" id="ghzp">100%</span><button class="btn" data-z="+" title="Kattalashtirish">+</button><button class="btn" data-z="fit" title="Hammasini ko‘rsatish (F yoki ikki marta bosish)">Hammasi</button>'; box.appendChild(ui);
  ui.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { const r = box.getBoundingClientRect(); if (b.dataset.z === 'fit') ghFit(); else ghZoomAt(r.width / 2, r.height / 2, b.dataset.z === '+' ? 1.25 : 0.8); });
  box.addEventListener('wheel', ev => { ev.preventDefault(); const r = box.getBoundingClientRect(); ghZoomAt(ev.clientX - r.left, ev.clientY - r.top, ev.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  box.addEventListener('mousedown', ev => { const t = ev.target; if (!(t === box || t === z || t.id === 'ghw' || ev.button === 1)) return; ev.preventDefault(); const sx = ev.clientX, sy = ev.clientY, x0 = GHV.x, y0 = GHV.y; box.classList.add('pan');
    const mv = e => { GHV.x = x0 + e.clientX - sx; GHV.y = y0 + e.clientY - sy; ghView(); }, up = () => { box.classList.remove('pan'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); });
  box.addEventListener('dblclick', ev => { if (ev.target === box || ev.target === z || ev.target.id === 'ghw') ghFit(); });
  return z; }
function ghView() { const z = $('#ghz'); if (z) z.style.transform = `translate(${GHV.x}px,${GHV.y}px) scale(${GHV.z})`; const zp = $('#ghzp'); if (zp) zp.textContent = Math.round(GHV.z * 100) + '%'; }
function ghZoomAt(mx, my, k) { const z2 = Math.min(2.5, Math.max(0.2, GHV.z * k)), wx = (mx - GHV.x) / GHV.z, wy = (my - GHV.y) / GHV.z; GHV = { x: mx - wx * z2, y: my - wy * z2, z: z2 }; ghView(); }
function ghFit() { const box = $('#ghc'), r = box.getBoundingClientRect(); if (!GH.nodes.length || !r.width) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  GH.nodes.forEach(n => { const d = $(`#ghz .nd[data-id="${n.id}"]`), w = d ? d.offsetWidth : 200, h = d ? d.offsetHeight : 120; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + w); y1 = Math.max(y1, n.y + h); });
  const pad = 30, z2 = Math.min(1.4, Math.max(0.2, Math.min((r.width - 2 * pad) / (x1 - x0), (r.height - 2 * pad - 30) / (y1 - y0)))); GHV = { z: z2, x: pad - x0 * z2 + ((r.width - 2 * pad) - (x1 - x0) * z2) / 2, y: pad + 30 - y0 * z2 }; ghView(); }
function ghRender() {
  const box = ghZ(); const R = GHres = ghEval(GH); GHcmd = R.cmd;
  box.querySelectorAll('.nd').forEach(e => e.remove()); ghView();
  GH.nodes.forEach(n => { const D = NODES[n.type]; const d = document.createElement('div'); d.className = 'nd' + (R.err[n.id] ? ' bad' : '') + (n.type === 'out' ? ' outn' : ''); d.style.left = n.x + 'px'; d.style.top = n.y + 'px'; d.dataset.id = n.id;
    let body = '';
    if (n.type === 'slider') body = `<div class="sl"><span>${n.p.label}</span><b class="mono">${n.p.value}</b></div><input type="range" min="${n.p.min}" max="${n.p.max}" step="${n.p.step}" value="${n.p.value}" data-k="value"><div class="mono mute" style="font-size:10px">${n.p.min} … ${n.p.max} · qadam ${n.p.step}</div>`;
    Object.keys(n.p || {}).forEach(k => { if (n.type === 'slider') return; if (PTYPE[k]) body += `<label>${k}<select data-k="${k}">${PTYPE[k]().map(o => `<option ${o === n.p[k] ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`; else body += `<label>${k}<input data-k="${k}" value="${n.p[k]}"></label>`; });
    const r = R.res[n.id] || {};
    if (n.type === 'panel') body += `<div class="mono pv">${JSON.stringify(r._show === undefined ? '—' : r._show).slice(0, 220)}</div>`;
    if (n.type === 'out') body += `<div class="mono pv">${GHcmd.length} buyruq → model</div>`;
    const ports = `<div class="ports"><div>${D.ins.map(k => `<div class="pi" data-in="${k}"><i></i>${k}</div>`).join('')}</div><div>${D.outs.map(k => { const v = r[k]; const s = v === undefined ? '' : Array.isArray(v) ? `[${v.length}]` : typeof v === 'object' ? '{…}' : (+v).toFixed ? (+v).toFixed(2).replace(/\.00$/, '') : v; return `<div class="po" data-out="${k}">${k} <span class="mute mono">${s}</span><i></i></div>`; }).join('')}</div></div>`;
    d.innerHTML = `<div class="nh"><span>${D.t}</span><span class="x" title="O‘chirish">×</span></div>${ports}${body ? `<div class="nb">${body}</div>` : ''}${R.err[n.id] ? `<div class="ne">${R.err[n.id]}</div>` : ''}`;
    box.appendChild(d);
    d.querySelectorAll('[data-k]').forEach(inp => { const ev = inp.type === 'range' ? 'input' : 'change'; inp.addEventListener(ev, () => { n.p[inp.dataset.k] = inp.type === 'range' ? +inp.value : inp.value; if (inp.type === 'range') { d.querySelector('.sl b').textContent = inp.value; ghLive(); } else ghRender(); }); });
    d.querySelector('.x').onclick = () => { GH.nodes = GH.nodes.filter(q => q.id !== n.id); GH.wires = GH.wires.filter(w => w[0] !== n.id && w[2] !== n.id); ghRender(); };
    // sudrash
    d.querySelector('.nh').onmousedown = e => { if (e.target.classList.contains('x')) return; const sx = e.clientX, sy = e.clientY, nx0 = n.x, ny0 = n.y; const mv = ev => { n.x = Math.round(nx0 + (ev.clientX - sx) / GHV.z); n.y = Math.round(ny0 + (ev.clientY - sy) / GHV.z); d.style.left = n.x + 'px'; d.style.top = n.y + 'px'; ghWires(); }; const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); };
    // sim tortish: chiqishdan kirishga
    d.querySelectorAll('.po i').forEach(dot => dot.onmousedown = e => { e.stopPropagation(); const from = [n.id, dot.parentElement.dataset.out]; const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('class', 'wtmp'); $('#ghw').appendChild(tmp); const p0 = portXY(dot);
      const mv = ev => { const r0 = box.getBoundingClientRect(); const x = (ev.clientX - r0.left) / GHV.z, y = (ev.clientY - r0.top) / GHV.z; tmp.setAttribute('d', bez(p0, { x, y })); };
      const up = ev => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); tmp.remove(); const t = document.elementFromPoint(ev.clientX, ev.clientY); const pi = t && t.closest('.pi'); if (pi) { const to = pi.closest('.nd').dataset.id; GH.wires = GH.wires.filter(w => !(w[2] === to && w[3] === pi.dataset.in)); GH.wires.push([from[0], from[1], to, pi.dataset.in]); ghRender(); } };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); });
  });
  ghWires(); ghPreview();
}
function portXY(el) { const r0 = $('#ghz').getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - r0.left) / GHV.z, y: (r.top + r.height / 2 - r0.top) / GHV.z }; }
const bez = (a, b) => { const dx = Math.max(40, Math.abs(b.x - a.x) / 2); return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`; };
function ghWires() {
  const svg = $('#ghw'); svg.querySelectorAll('path:not(.wtmp)').forEach(p => p.remove()); const box = $('#ghz');
  svg.setAttribute('width', 8000); svg.setAttribute('height', 6000);
  GH.wires.forEach((w, k) => { const a = box.querySelector(`.nd[data-id="${w[0]}"] .po[data-out="${w[1]}"] i`), b = box.querySelector(`.nd[data-id="${w[2]}"] .pi[data-in="${w[3]}"] i`); if (!a || !b) return;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', bez(portXY(a), portXY(b))); p.setAttribute('class', 'wire'); p.onclick = () => { GH.wires.splice(k, 1); ghRender(); }; p.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'title')).textContent = 'Bosing — simni o‘chirish'; svg.appendChild(p); });
}
// slayder siljiganda: graf qayta hisoblanadi, tugun qiymatlari va ko‘rinish yangilanadi (to‘liq qayta chizmasdan)
let liveT = null;
function ghLive() { clearTimeout(liveT); liveT = setTimeout(() => { const R = GHres = ghEval(GH); GHcmd = R.cmd; GH.nodes.forEach(n => { const d = $(`#ghc .nd[data-id="${n.id}"]`); if (!d) return; const r = R.res[n.id] || {}; d.querySelectorAll('.po').forEach(po => { const v = r[po.dataset.out]; po.querySelector('span').textContent = v === undefined ? '' : Array.isArray(v) ? `[${v.length}]` : typeof v === 'object' ? '{…}' : (+v).toFixed(2).replace(/\.00$/, ''); }); const pv = d.querySelector('.pv'); if (pv && n.type === 'out') pv.textContent = GHcmd.length + ' buyruq → model'; if (pv && n.type === 'panel') pv.textContent = JSON.stringify(r._show === undefined ? '—' : r._show).slice(0, 220); d.classList.toggle('bad', !!R.err[n.id]); }); ghPreview(); }, 30); }
function buildFrom(cmds) { const m = newModel(); run(m, cmds.join('\n')); return { m, a: analyze(m) }; }
function withModel(m, a, fn) { const sm = M, sa = A, sl = LV; M = m; A = a; LV = 'L1'; try { return fn(); } finally { M = sm; A = sa; LV = sl; } }
function metrics(m, a) { const S = a.summary; const win = m.el.filter(e => e.cat === 'window').reduce((s, e) => s + TYPES.window[e.type].w * TYPES.window[e.type].h / 1e6, 0); const ext = (S.walls.find(r => r.type === 'T400') || { A: 0 }).A + win; return { mM: (a.mods || []).map(G => [G.e.id + ' · ' + MODS[G.kind].title, G.metrics]), oG: (S.ovals || []).reduce((x, f) => x + (f.gfa || 0), 0), oM: (S.ovals || []).reduce((x, f) => x + (f.memL || 0), 0), oF: (S.ovals || []).reduce((x, f) => x + (f.facA || 0), 0), oH: (S.ovals || []).reduce((x, f) => Math.max(x, f.H || 0), 0), oS: (S.ovals || []).reduce((x, f) => x + (f.seats || 0), 0), rS: (S.rings || []).reduce((x, f) => x + (f.seats || 0), 0), rP: (S.rings || []).reduce((x, f) => x + (f.cars || 0), 0), rC: (S.rings || []).reduce((x, f) => Math.max(x, f.covP || 0), 0), rT: (S.rings || []).reduce((x, f) => Math.max(x, f.tEv || 0), 0), rH: (S.rings || []).reduce((x, f) => Math.max(x, f.H || 0), 0), bS: (S.bars || []).reduce((x, f) => x + (f.noSun || 0), 0), bA: (S.bars || []).reduce((x, f) => x + f.apts, 0), bG: (S.bars || []).reduce((x, f) => x + f.gfa, 0), bN: (S.bars || []).reduce((x, f) => x + f.net, 0), bH: (S.bars || []).reduce((x, f) => Math.max(x, f.H), 0), sh: (S.shells || []).reduce((x, f) => x + f.area, 0), shH: (S.shells || []).reduce((x, f) => Math.max(x, f.H), 0), shV: (S.shells || []).reduce((x, f) => x + f.vol, 0), gfa: (S.forms || []).reduce((x, f) => x + f.gfa, 0), fins: (S.forms || []).reduce((x, f) => x + f.fins, 0), fH: (S.forms || []).reduce((x, f) => Math.max(x, f.H), 0), lv: m.levels.length, H: S.H, rooms: S.rooms, slab: S.slab, win: m.el.filter(e => e.cat === 'window').length, wwr: ext ? win / ext : 0, conc: S.concrete, fail: a.checks.filter(c => c.status === 'FAIL').length }; }
function ghPreview() {
  const { m, a } = buildFrom(GHcmd); const box = $('#ghprev').getBoundingClientRect();
  $('#ghprev').innerHTML = withModel(m, a, () => axo(box.width || 420, box.height || 360));
  const k = metrics(m, a);
  $('#ghmet').innerHTML = (k.mM || []).flatMap(([t, ms]) => ms.map(([l, v]) => [t + ': ' + l, v])).concat(k.oG ? [['Oval zal balandligi', f2(k.oH) + ' m'], ['Umumiy maydon', Math.round(k.oG).toLocaleString('ru') + ' m²'], ['To‘r elementlari', Math.round(k.oM).toLocaleString('ru') + ' m'], ['Shisha', Math.round(k.oF).toLocaleString('ru') + ' m²']].concat(k.oS ? [['Sport saroyi sig‘imi', k.oS.toLocaleString('ru') + ' o‘rin']] : []) : []).concat(k.rS ? [['Stadion sig‘imi', k.rS.toLocaleString('ru') + ' o‘rin'], ['Tom qamrovi', k.rC + ' %'], ['Bo‘shatish', f2(k.rT) + ' daq'], ['Avtoturargoh', (k.rP || 0).toLocaleString('ru') + ' joy'], ['Tom balandligi', f2(k.rH) + ' m']] : []).concat(k.bG ? [['Uy balandligi', f2(k.bH) + ' m'], ['Umumiy maydon', Math.round(k.bG).toLocaleString('ru') + ' m²'], ['Kvartiralar', k.bA], ['Quyoshi < talab', k.bS + ' kv.'], ['Sotiladigan', Math.round(k.bN).toLocaleString('ru') + ' m² (' + Math.round(k.bN / k.bG * 100) + ' %)']] : []).concat(k.sh ? [['Qobiq balandligi', f2(k.shH) + ' m'], ['Qobiq sirti', Math.round(k.sh).toLocaleString('ru') + ' m²'], ['Ichki hajm', Math.round(k.shV).toLocaleString('ru') + ' m³']] : []).concat(k.gfa ? [['Shakl balandligi', f2(k.fH) + ' m'], ['Umumiy maydon (GFA)', Math.round(k.gfa).toLocaleString('ru') + ' m²'], ['Lamellar', k.fins.toLocaleString('ru')]] : []).concat([['Qavatlar', k.lv], ['Balandlik', f2(k.H) + ' m'], ['Xonalar', Math.round(k.rooms) + ' m²'], ['Plitalar', Math.round(k.slab) + ' m²'], ['Derazalar', k.win], ['Oynalash (WWR)', Math.round(k.wwr * 100) + ' %'], ['Beton', k.conc + ' m³'], ['Tekshiruv', k.fail ? `<span style="color:var(--fail)">${k.fail} FAIL</span>` : '<span style="color:var(--pass)">toza</span>']]).map(([a1, b]) => `<div class="kp"><span class="mute">${a1}</span><b>${b}</b></div>`).join('');
  $('#ghcmd').textContent = GHcmd.slice(0, 400).join('\n') + (GHcmd.length > 400 ? `\n… (+${GHcmd.length - 400})` : '');
  const sel = $('#ghvar'); const cur = sel.value; sel.innerHTML = GH.nodes.filter(n => n.type === 'slider').map(n => `<option value="${n.id}" ${n.id === cur ? 'selected' : ''}>${n.p.label}</option>`).join('');
}
// Galapagos-lite: bitta slayder bo‘yicha 6 variant
function ghVariants() {
  const id = $('#ghvar').value, n = GH.nodes.find(q => q.id === id); if (!n) return; const vals = []; for (let k = 0; k < 6; k++) { let v = +n.p.min + (n.p.max - n.p.min) * k / 5; v = Math.round(v / n.p.step) * n.p.step; vals.push(+v.toFixed(3)); }
  $('#ghgal').innerHTML = [...new Set(vals)].map(v => { const g2 = JSON.parse(JSON.stringify(GH)); g2.nodes.find(q => q.id === id).p.value = v; const R = ghEval(g2); const { m, a } = buildFrom(R.cmd); const k = metrics(m, a); const svg = withModel(m, a, () => axo(260, 200));
    return `<div class="vc" data-v="${v}"><div class="mono" style="font-size:11px">${n.p.label} = <b>${v}</b></div>${svg}<div class="mono mute" style="font-size:10.5px">${k.sh ? 'sirt ' + Math.round(k.sh).toLocaleString('ru') + ' m² · H ' + k.shH.toFixed(0) + ' m · ' : ''}${k.gfa ? 'GFA ' + Math.round(k.gfa).toLocaleString('ru') + ' m² · H ' + k.fH.toFixed(0) + ' m · ' : ''}xonalar ${Math.round(k.rooms)} m² · WWR ${Math.round(k.wwr * 100)} % · beton ${k.conc} m³ · ${k.fail ? k.fail + ' FAIL' : 'toza'}</div></div>`; }).join('');
  $$('#ghgal .vc').forEach(c => c.onclick = () => { n.p.value = +c.dataset.v; ghRender(); });
}
function ghAdd(type) { const id = type[0] + Math.random().toString(36).slice(2, 6); GH.nodes.push({ id, type, x: Math.round((60 - GHV.x) / GHV.z + Math.random() * 80), y: Math.round((60 - GHV.y) / GHV.z + Math.random() * 80), p: Object.assign({}, NODES[type].p || {}) }); ghRender(); }
function ghInit() {
  GH = ghDefault();
  $('#ghpal').innerHTML = Object.keys(NODES).map(k => `<button class="btn" data-n="${k}">+ ${NODES[k].t}</button>`).join('');
  $$('#ghpal [data-n]').forEach(b => b.onclick = () => ghAdd(b.dataset.n));
  $('#ghbake').onclick = () => { CMDS = GHcmd.slice(); $$('#modes button').find(b => b.dataset.m === 'model').click(); REDO = []; rebuild(); fit(); };
  $('#ghreset').onclick = () => { GH = ghDefault(); ghRender(); ghFit(); };
  if ($('#ghform')) $('#ghform').onclick = () => { GH = ghForm(); ghRender(); ghFit(); };
  if ($('#ghshell')) $('#ghshell').onclick = () => { GH = ghShell(); ghRender(); ghFit(); };
  if ($('#ghbar')) $('#ghbar').onclick = () => { GH = ghBar(); ghRender(); ghFit(); };
  if ($('#ghring')) $('#ghring').onclick = () => { GH = ghRing(); ghRender(); ghFit(); };
  if ($('#ghoval')) $('#ghoval').onclick = () => { GH = ghOval(); ghRender(); ghFit(); };
  if ($('#ghlenta')) $('#ghlenta').onclick = () => { GH = ghLenta(); ghRender(); ghFit(); }; if ($('#ghpixel')) $('#ghpixel').onclick = () => { GH = ghPixel(); ghRender(); ghFit(); }; if ($('#ghseksiya')) $('#ghseksiya').onclick = () => { GH = ghSeksiya(); ghRender(); ghFit(); };
  $('#ghgo').onclick = ghVariants;
}

