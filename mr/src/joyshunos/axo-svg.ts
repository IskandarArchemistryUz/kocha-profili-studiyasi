/**
 * Joyshunos · aksonometriya → SVG (vektor). Joriy kamera (reja yoki aksonometriya) boʻyicha maʼlumotdan chiziladi:
 * relyef doirasi va halqalar, koʻchalar (lenta koʻpburchaklari), yashil va suv, binolar (devor + tom, «rassom» tartibida),
 * uchastka, belgilar, shamol guli va strelkalar, quyosh yoʻli. Portlatilgan rejimda har qatlam oʻz balandligida.
 * layered = true — har qatlam alohida guruh (Illustrator: id/data-name; Inkscape: groupmode="layer").
 */
import * as THREE from 'three';
import { frame } from '../core/geo';
import { sunPosition, localToUtcAt } from '../core/sun';
import { tr } from '../i18n';
import { AX_LAYERS, SUN_DAYS, type Axo, type AxLayer } from './axo';

type P2 = [number, number];
const f1 = (v: number) => v.toFixed(1);
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function axoSvg(a: Axo, layered: boolean): string {
  const st = a.exportState(), inp = st.inp; if (!inp) throw new Error(tr('Sahna hali tayyor emas'));
  const { cam, w, h, groups, R, clipR, slabTop, H } = st, P = a.P, fr = frame(inp.center);
  const off = (id: AxLayer) => groups.get(id)!.position.y;
  const v3 = new THREE.Vector3();
  /** mahalliy (x — sharq, y — shimol, z — balandlik) → ekran */
  const pr = (x: number, y: number, z: number, id: AxLayer): P2 => { v3.set(x, z + off(id), -y).project(cam); return [(v3.x + 1) / 2 * w, (1 - v3.y) / 2 * h]; };
  const poly = (pts: P2[]) => `M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z`;
  const line = (pts: P2[]) => `M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
  const inC = (x: number, y: number) => x * x + y * y <= clipR * clipR;
  const vis = (id: AxLayer) => a.eff(id);
  const out: Record<AxLayer, string[]> = { relyef: [], kochalar: [], transport: [], yashil: [], binolar: [], xizmat: [], shamol: [], quyosh: [] };
  const top = (_id: AxLayer) => (a.exploded ? slabTop : 0);

  /* --- disk (portlatilgan: qalin plastinka) yoki yer --- */
  const disc = (id: AxLayer, T: number, fill: string, sideCol: string) => {
    const n = 96, upper: P2[] = [], lower: P2[] = [];
    for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, x = Math.cos(t) * clipR, y = Math.sin(t) * clipR; upper.push(pr(x, y, top(id), id)); lower.push(pr(x, y, top(id) - T, id)); }
    if (a.exploded && T > 0) {
      // yon tomon: pastki va yuqori aylanalar orasidagi «lenta» (oldingi yarmi)
      const band = upper.map((p, i) => [p, lower[i]] as [P2, P2]);
      out[id].push(`<path d="${poly([...band.map(b => b[1]), ...band.map(b => b[0]).reverse()])}" fill="${sideCol}"/>`);
    }
    out[id].push(`<path d="${poly(upper)}" fill="${fill}"/>`);
  };
  const side = '#' + new THREE.Color(P.bg).multiplyScalar(0.82).getHexString();
  if (vis('relyef')) disc('relyef', a.exploded ? Math.max(8, R * 0.07) : 0, P.bg, inp.dark ? '#4a3f33' : '#9b8264');
  if (a.exploded) for (const id of ['kochalar', 'yashil', 'binolar'] as AxLayer[]) if (vis(id)) disc(id, Math.max(2, R * 0.012), P.bg, side);

  /* --- relyef: halqalar, yozuvlar, kompas --- */
  if (vis('relyef')) {
    const step = R > 600 ? 200 : 100, radii: number[] = []; for (let r = step; r < R - step * 0.4; r += step) radii.push(r); radii.push(R);
    for (const r of radii) {
      const pts: P2[] = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2, x = Math.cos(t) * r, y = Math.sin(t) * r; pts.push(pr(x, y, Math.max(H(x, y), top('relyef')) + 0.7, 'relyef')); }
      const main = r === R, [lx, ly] = pr(Math.cos(-0.75 * Math.PI) * r, Math.sin(-0.75 * Math.PI) * r, top('relyef') + 1, 'relyef');
      out.relyef.push(`<path d="${line(pts)}" fill="none" stroke="${main ? '#c0643a' : '#6b6965'}" stroke-width="${main ? 1.6 : 0.9}" stroke-dasharray="${main ? '7 4' : '4 5'}"/>`,
        `<text x="${f1(lx)}" y="${f1(ly)}" font-size="11" font-weight="600" fill="${main ? '#c0643a' : '#3a3936'}" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle">${r} m</text>`);
    }
    const RC = R * 1.08, cp: P2[] = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2; cp.push(pr(Math.cos(t) * RC, Math.sin(t) * RC, top('relyef') + 0.8, 'relyef')); }
    out.relyef.push(`<path d="${line(cp)}" fill="none" stroke="#3a3936" stroke-width=".8"/>`);
    for (const [d, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']] as const) { const an = (90 - d) * Math.PI / 180, [x, y] = pr(Math.cos(an) * RC * 1.09, Math.sin(an) * RC * 1.09, top('relyef') + 1, 'relyef'); out.relyef.push(`<text x="${f1(x)}" y="${f1(y + 5)}" font-size="16" font-weight="700" fill="${d === 0 ? '#c0643a' : '#3a3936'}" text-anchor="middle">${t}</text>`); }
  }

  /* --- koʻchalar: har bir yoʻl — lenta koʻpburchaklari (kenglik metrda) --- */
  if (vis('kochalar')) {
    const paths: string[] = [];
    for (const r of inp.bundle.osm.roads) {
      const pts = r.pts.map(p => fr.toLocal(p)); if (!pts.some(p => inC(p[0], p[1]))) continue;
      const hw = Math.max(1.5, r.w / 2);
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; if (!inC(ax, ay) && !inC(bx, by)) continue;
        const L = Math.hypot(bx - ax, by - ay); if (L < 0.1) continue;
        const nx = -(by - ay) / L * hw, ny = (bx - ax) / L * hw, z = (x: number, y: number) => (a.exploded ? top('kochalar') : H(x, y)) + 0.2;
        paths.push(poly([pr(ax + nx, ay + ny, z(ax, ay), 'kochalar'), pr(bx + nx, by + ny, z(bx, by), 'kochalar'), pr(bx - nx, by - ny, z(bx, by), 'kochalar'), pr(ax - nx, ay - ny, z(ax, ay), 'kochalar')]));
      }
    }
    if (paths.length) out.kochalar.push(`<path d="${paths.join('')}" fill="${P.road}" stroke="#${new THREE.Color(P.rc).multiplyScalar(0.85).getHexString()}" stroke-width=".8" stroke-linejoin="round"/>`);
  }

  /* --- yashil va suv --- */
  if (vis('yashil')) {
    const area = (list: { rings: [number, number][][] }[], col: string) => {
      const d: string[] = [];
      for (const ar of list) { const rr = ar.rings[0].map(p => fr.toLocal(p)); if (!rr.some(p => inC(p[0], p[1]))) continue; d.push(poly(rr.map(([x, y]) => pr(x, y, (a.exploded ? top('yashil') : H(x, y)) + 0.1, 'yashil')))); }
      if (d.length) out.yashil.push(`<path d="${d.join('')}" fill="${col}"/>`);
    };
    area(inp.bundle.osm.green as never, P.park); area(inp.bundle.osm.water as never, P.water);
    const tr2: string[] = [];
    for (const t of inp.bundle.osm.trees) { const [x, y] = fr.toLocal(t); if (!inC(x, y)) continue; const [sx, sy] = pr(x, y, (a.exploded ? top('yashil') : H(x, y)) + 5, 'yashil'); tr2.push(`<circle cx="${f1(sx)}" cy="${f1(sy)}" r="2.2"/>`); }
    if (tr2.length) out.yashil.push(`<g fill="#7fa65a">${tr2.join('')}</g>`);
  }

  /* --- binolar: devorlar va tom, uzoqdan yaqinga --- */
  if (vis('binolar')) {
    const dirV = new THREE.Vector3(); cam.getWorldDirection(dirV);
    const L = new THREE.Vector2(-0.6, 0.8).normalize();
    const bl = inp.bundle.osm.buildings.map(b => { const r = b.rings[0].map(p => fr.toLocal(p)); let cx = 0, cy = 0; r.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= r.length; cy /= r.length; return { r, h: b.h, cx, cy }; })
      .filter(b => inC(b.cx, b.cy))
      .map(b => ({ ...b, z0: a.exploded ? top('binolar') : H(b.cx, b.cy), depth: -(b.cx * dirV.x + -b.cy * dirV.z) }))
      .sort((p, q) => q.depth - p.depth);
    const wallBase = new THREE.Color(P.bld), parts: string[] = [];
    for (const b of bl) {
      const r = b.r[b.r.length - 1][0] === b.r[0][0] && b.r[b.r.length - 1][1] === b.r[0][1] ? b.r.slice(0, -1) : b.r;
      const walls: { d: number; s: string }[] = [];
      for (let i = 0; i < r.length; i++) {
        const [ax, ay] = r[i], [bx, by] = r[(i + 1) % r.length];
        const q = [pr(ax, ay, b.z0, 'binolar'), pr(bx, by, b.z0, 'binolar'), pr(bx, by, b.z0 + b.h, 'binolar'), pr(ax, ay, b.z0 + b.h, 'binolar')];
        const sa = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]);
        if (Math.abs(sa) < 0.01) continue;
        const nx = (by - ay), ny = -(bx - ax), nl = Math.hypot(nx, ny) || 1, lit = 0.72 + 0.22 * Math.abs((nx * L.x + ny * L.y) / nl);
        walls.push({ d: -((ax + bx) / 2 * dirV.x - (ay + by) / 2 * dirV.z), s: `<path d="${poly(q)}" fill="#${wallBase.clone().multiplyScalar(lit).getHexString()}"/>` });
      }
      walls.sort((p, q) => q.d - p.d);
      parts.push(...walls.map(x => x.s), `<path d="${poly(r.map(([x, y]) => pr(x, y, b.z0 + b.h, 'binolar')))}" fill="${P.bld}" stroke="${P.bl}" stroke-width=".5"/>`);
    }
    out.binolar.push(`<g stroke-linejoin="round">${parts.join('')}</g>`);
    // foydalanuvchi modeli: uchburchaklar (koʻk)
    if (st.model) {
      const tris: { d: number; s: string }[] = []; st.model.updateMatrixWorld(true);
      st.model.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; const g = m.geometry, pos = g.attributes.position as THREE.BufferAttribute, idx = g.index; const n = idx ? idx.count : pos.count;
        for (let i = 0; i < n && tris.length < 8000; i += 3) { const vs = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld));
          const s2 = vs.map(v => pr(v.x, -v.z, v.y - off('binolar'), 'binolar')), sa = (s2[1][0] - s2[0][0]) * (s2[2][1] - s2[0][1]) - (s2[2][0] - s2[0][0]) * (s2[1][1] - s2[0][1]); if (sa >= 0) continue;
          const c = vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1 / 3), nrm = vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize(), lit = 0.6 + 0.4 * Math.max(0, nrm.y * 0.7 + Math.abs(nrm.x) * 0.3);
          tris.push({ d: c.dot(dirV), s: `<path d="${poly(s2)}" fill="#${new THREE.Color(0x5b7fa8).multiplyScalar(lit).getHexString()}"/>` }); } });
      tris.sort((p, q) => q.d - p.d); out.binolar.push(`<g>${tris.map(t => t.s).join('')}</g>`);
    }
  }

  /* --- uchastka: har qatlamda qizil punktir --- */
  const site = a.siteRing();
  if (site) for (const id of ['relyef', 'kochalar', 'yashil', 'binolar', 'xizmat'] as AxLayer[]) {
    if (!vis(id)) continue;
    const pts = site.map(([x, y]) => pr(x, y, (a.exploded ? top(id) : H(x, y)) + 1.2, id));
    out[id].push(`<path d="${poly(pts)}" fill="#d2492f" fill-opacity=".14" stroke="#d2492f" stroke-width="1.4" stroke-dasharray="6 4"/>`);
  }

  /* --- belgilar --- */
  if (vis('xizmat')) for (const p of st.pins) {
    const [x0, y0] = pr(p.x, p.y, p.z - Math.max(16, R * 0.05), 'xizmat'), [x1, y1] = pr(p.x, p.y, p.z, 'xizmat'), tw = p.label.length * 5.6 + 18;
    out.xizmat.push(`<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="#6b6965" stroke-width=".8"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="3" fill="${p.col}"/>`,
      `<rect x="${f1(x1 - 6)}" y="${f1(y1 - 28)}" width="${f1(tw)}" height="18" rx="5" fill="#fff" stroke="#e3e1dc" stroke-width=".5"/><circle cx="${f1(x1 + 2)}" cy="${f1(y1 - 19)}" r="3" fill="${p.col}"/><text x="${f1(x1 + 9)}" y="${f1(y1 - 15.5)}" font-size="10" font-weight="600" fill="#3a3936">${esc(p.label)}</text>`);
  }

  /* --- shamol: gul va strelkalar --- */
  if (vis('shamol') && inp.wind) {
    const pet = inp.wind.petals, mx = Math.max(...pet, 1e-6), r0 = R * 0.04, rM = R * 0.3, d: string[] = [];
    pet.forEach((v, i) => { const r = r0 + v / mx * (rM - r0), pts: P2[] = []; for (let k = 0; k <= 6; k++) { const an = (i * 22.5 - 9 + 3 * k) * Math.PI / 180; pts.push(pr(Math.sin(an) * r, Math.cos(an) * r, 1.2, 'shamol')); } for (let k = 6; k >= 0; k--) { const an = (i * 22.5 - 9 + 3 * k) * Math.PI / 180; pts.push(pr(Math.sin(an) * r0, Math.cos(an) * r0, 1.2, 'shamol')); } d.push(poly(pts)); });
    out.shamol.push(`<path d="${d.join('')}" fill="#3f8f6b" fill-opacity=".32"/>`);
    const smax = Math.max(...st.flows.map(f => f.share), 1e-6);
    st.flows.forEach((f, rank) => {
      const n = 4 - rank, width = R * (0.012 + 0.016 * f.share / smax), an = f.deg * Math.PI / 180, dir: P2 = [-Math.sin(an), -Math.cos(an)], sd: P2 = [-dir[1], dir[0]], h0 = R * (0.07 + 0.02 * rank);
      for (let k = 0; k < n; k++) {
        const o = (k - (n - 1) / 2) * R * 0.16 + R * 0.05 * (rank - 1), bend = R * (0.12 + 0.05 * k) * (rank % 2 ? -1 : 1);
        const p0: P2 = [-dir[0] * R + sd[0] * o, -dir[1] * R + sd[1] * o], p2: P2 = [-dir[0] * R * (0.22 + 0.06 * k) + sd[0] * o * 0.7, -dir[1] * R * (0.22 + 0.06 * k) + sd[1] * o * 0.7];
        const p1: P2 = [(p0[0] + p2[0]) / 2 + sd[0] * bend, (p0[1] + p2[1]) / 2 + sd[1] * bend], pts: P2[] = [];
        for (let i = 0; i <= 30; i++) { const t = i / 30, x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]; pts.push(pr(x, y, h0 * (0.6 + 0.4 * Math.sin(Math.PI * t)), 'shamol')); }
        const e = pts[30], q = pts[28], dx = e[0] - q[0], dy = e[1] - q[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, sw = Math.max(2, width * 0.35);
        out.shamol.push(`<path d="${line(pts)}" fill="none" stroke="${f.col}" stroke-width="${f1(sw)}" stroke-linecap="round" stroke-opacity=".85"/><path d="M${f1(e[0] + ux * sw * 2.6)} ${f1(e[1] + uy * sw * 2.6)}L${f1(e[0] - uy * sw * 1.6)} ${f1(e[1] + ux * sw * 1.6)}L${f1(e[0] + uy * sw * 1.6)} ${f1(e[1] - ux * sw * 1.6)}Z" fill="${f.col}"/>`);
      }
    });
  }

  /* --- quyosh yoʻli --- */
  if (vis('quyosh')) {
    const D = R * 0.95, sv = (alt: number, az: number): [number, number, number] => { const al = alt * Math.PI / 180, z = az * Math.PI / 180; return [Math.sin(z) * Math.cos(al) * D, Math.cos(z) * Math.cos(al) * D, Math.sin(al) * D]; };
    SUN_DAYS.forEach(([mo, dd], k) => {
      const pts: [number, number, number][] = []; for (let t = 4; t <= 21; t += 0.25) { const s = sunPosition(localToUtcAt(2026, mo, dd, t, inp.center[1], inp.center[0]), inp.center[1], inp.center[0]); if (s.alt > 0) pts.push(sv(s.alt, s.az)); }
      if (pts.length < 2) return; const sel = k === a.day, sp = pts.map(p => pr(p[0], p[1], p[2], 'quyosh'));
      if (sel) { const c0 = pr(0, 0, 0, 'quyosh'); out.quyosh.push(`<path d="M${f1(c0[0])} ${f1(c0[1])}L${sp.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z" fill="#e8a317" fill-opacity=".18"/>`); }
      out.quyosh.push(`<path d="${line(sp)}" fill="none" stroke="#e8a317" stroke-width="${sel ? 1.6 : 1}" stroke-dasharray="5 4" stroke-opacity="${sel ? 1 : 0.5}"/>`);
      for (let t = 5; t <= 20; t++) { const s = sunPosition(localToUtcAt(2026, mo, dd, t, inp.center[1], inp.center[0]), inp.center[1], inp.center[0]); if (s.alt <= 0) continue; const [x, y] = pr(...sv(s.alt, s.az), 'quyosh'); out.quyosh.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${sel ? 3 : 2}" fill="#e8a317" fill-opacity="${sel ? 1 : 0.5}"/>${sel ? `<text x="${f1(x)}" y="${f1(y - 7)}" font-size="10" font-weight="700" fill="#b07a10" text-anchor="middle">${t}</text>` : ''}`); }
    });
    const si = a.sunInfo(); if (si && si.alt > 0) { const [x, y] = pr(...sv(si.alt, si.az), 'quyosh'), c0 = pr(0, 0, 0, 'quyosh'); out.quyosh.push(`<path d="M${f1(x)} ${f1(y)}L${f1(c0[0])} ${f1(c0[1])}" stroke="#e8a317" stroke-dasharray="5 4"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="#e0532c"/>`); }
  }

  /* --- yigʻish --- */
  const order = a.exploded ? a.order : (['relyef', 'kochalar', 'yashil', 'binolar', 'xizmat', 'shamol', 'quyosh'] as AxLayer[]);
  const bg = inp.dark ? '#17181a' : '#f4f2ee';
  const nameOf = (id: AxLayer, i: number) => `${String(i + 1).padStart(2, '0')} ${tr(AX_LAYERS.find(l => l.id === id)!.name)}`;
  const body = order.filter(id => vis(id) && out[id].length).map((id, i) => layered
    ? `<g id="${String(i + 1).padStart(2, '0')}_${id}" data-name="${esc(nameOf(id, i))}" inkscape:groupmode="layer" inkscape:label="${esc(nameOf(id, i))}">${out[id].join('')}</g>`
    : `<g>${out[id].join('')}</g>`).join('\n');
  // portlatilgan: yon izohlar (ekrandagi joylashuvidan)
  let notes = '';
  if (a.exploded) {
    const host = a.renderer.domElement.getBoundingClientRect(), parts: string[] = [];
    a.renderer.domElement.parentElement?.querySelectorAll<HTMLElement>('.axo-side').forEach(el => {
      if (el.hidden) return; const r = el.getBoundingClientRect(), x = r.left - host.left, y = r.top - host.top;
      parts.push(`<text x="${f1(x)}" y="${f1(y + 12)}" font-size="12" font-family="IBM Plex Mono, monospace" fill="#6b6965">${esc(el.querySelector('b')?.textContent ?? '')}</text><text x="${f1(x + 30)}" y="${f1(y + 13)}" font-size="14" font-weight="700" fill="#141414">${esc(el.querySelector('strong')?.textContent ?? '')}</text><text x="${f1(x + 30)}" y="${f1(y + 29)}" font-size="11" fill="#6b6965">${esc(el.querySelector('small')?.textContent ?? '')}</text>`);
    });
    a.renderer.domElement.parentElement?.querySelectorAll('.axo-lines path').forEach(p => parts.push(`<path d="${p.getAttribute('d')}" stroke="#a19e97" fill="none"/>`));
    notes = layered ? `<g id="izohlar" data-name="${esc(tr('Izohlar'))}" inkscape:groupmode="layer" inkscape:label="${esc(tr('Izohlar'))}">${parts.join('')}</g>` : `<g>${parts.join('')}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg"${layered ? ' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"' : ''} viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Archivo, Arial, sans-serif">\n<rect width="${w}" height="${h}" fill="${bg}"/>\n${body}\n${notes}\n</svg>`;
}
