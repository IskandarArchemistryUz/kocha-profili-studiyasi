// agent javobi (P(x,y) piksel) → Binokor modeli → devor o'qlari/tanalari, teshiklar (rasm-mm koordinatasida, y pastga)
const fs = require('fs'), vm = require('vm'); const ctx = { console }; vm.createContext(ctx); const B = '/home/claude/binokor/';
const strip = f => fs.readFileSync(B + f, 'utf8').replace(/\nif \(typeof module[^\n]*\n?$/, '\n');
vm.runInContext(strip('core2.js') + '\nthis.X={build, TYPES, f3: typeof f3!=="undefined"?f3:null, planCleanup: typeof planCleanup!=="undefined"?planCleanup:null};', ctx);
const [txtF, mmpx, outF, mode] = [process.argv[2], +process.argv[3], process.argv[4], process.argv[5] || 'raw'];
const f3 = v => (v / 1000).toFixed(3).replace(/\.?0+$/, '') || '0';
let text = fs.readFileSync(txtF, 'utf8').replace(/```[a-z]*\n?/g, '');
text = text.replace(/P\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g, (m, x, y) => f3(Math.round(+x * mmpx)) + ',' + f3(Math.round(+y * mmpx))).replace(/S\(\s*(-?[\d.]+)\s*\)/g, (m, v) => f3(Math.round(+v * mmpx)));
let lines = ['levels 1 3'].concat(text.split('\n').map(s => s.trim()).filter(Boolean));
let info = null; if (mode !== 'raw') { let ink = null; if (mode === 'ink') { const base = txtF.replace(/\.agent.*$/, ''), hd = JSON.parse(fs.readFileSync(base + '.gray.json')); ink = { w: hd.w, h: hd.h, gray: fs.readFileSync(base + '.gray'), mmpx, toImg: p => ({ x: p.x / mmpx, y: p.y / mmpx }) }; }
  const r = ctx.X.planCleanup(lines, { ink }); lines = r.lines; info = r.info; }
const r = ctx.X.build(lines); const L = r.A.levels.L1;
const walls = L.walls.map(g => ({ id: g.w.id, a: [g.a.x, g.a.y], b: [g.b.x, g.b.y], t: g.t, body: (g.poly || g.body).map(p => [p.x, p.y]) }));
const ops = L.openings.filter(o => !o.bad).map(o => { const h = o.host, c = { x: h.a.x + h.u.x * (o.s0 + o.s1) / 2, y: h.a.y + h.u.y * (o.s0 + o.s1) / 2 }; return { kind: o.o.cat, c: [c.x, c.y], w: o.T.w }; });
fs.writeFileSync(outF, JSON.stringify({ walls, ops, bad: r.out.filter(o => !o.ok).map(o => o.line + ' — ' + o.err), fails: r.A.checks.filter(c => c.status === 'FAIL').map(c => c.id + ': ' + c.msg), rooms: L.rooms.length, roomP: L.rooms.map(r => r.poly.map(p => [p.x, p.y])), n: lines.length, info }));
if (info) console.log(JSON.stringify(Object.assign({}, info, { noInk: info.noInk.length })));
console.log('walls', walls.length, 'ops', ops.length, 'bad', r.out.filter(o => !o.ok).length, 'FAIL', r.A.checks.filter(c => c.status === 'FAIL').length, 'rooms', L.rooms.length);
