/**
 * Koʻrinadigan joy — video eksport (13.11, kanvas «Joyshunos» K4).
 * Xarita plitkalari emas — oʻzimizning vektor sahna: binolar, iz, joriy koʻrinish, marshrut, ①②, sarlavha, raqam va grafik.
 * Kanvas → captureStream → MediaRecorder (MP4, boʻlmasa WebM). Yozuv real vaqtda (10 / 20 / 30 s).
 */
import { isovist, walkSum, type IsoIndex, type IsoOpt, type P2, type Walk, type polyline } from './izovist';
import { wmCanvas } from '../core/wm';

export type VidFmt = '9:16' | '16:9' | '1:1';
export interface VidOpt {
  fmt: VidFmt; sec: number; title: string; sub: string;
  chart: boolean; num: boolean; trail: boolean; marks: boolean;
  /** toza (1080p, belgisiz) yoki bepul (720p, belgili) */
  clean: boolean;
}
export interface VidScene {
  ix: IsoIndex; rings: P2[][]; pl: ReturnType<typeof polyline>; route: P2[]; w: Walk; opt: IsoOpt;
  /** tahlil doirasi radiusi (markaz 0,0) */ clip: number;
  /** tarjima qilingan yozuvlar */
  t: { area: string; dist: string; open: string; tight: string; src: string; inside: string };
  fmtN: (v: number, d?: number) => string;
}

const ORANGE = '#ff9900', RED = '#e3242b', BG = '#f6f5f2', BLD = '#a7a5a0', INK = '#141414', MUTED = '#6b6965';
const FONT = "'Archivo','Golos Text',system-ui,sans-serif";

export function vidSize(f: VidFmt, clean: boolean): [number, number] {
  const s = clean ? 1080 : 720;
  return f === '9:16' ? [s, Math.round(s * 16 / 9)] : f === '16:9' ? [Math.round(s * 16 / 9), s] : [s, s];
}
/** MediaRecorder qoʻllaydigan tur: avval MP4 (Chrome 126+), keyin WebM */
export function vidMime(): string {
  const MR = (globalThis as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder;
  for (const t of ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MR?.isTypeSupported?.(t)) return t;
  return 'video/webm';
}

type Box = { x: number; y: number; w: number; h: number };
/** Kadr joylashuvi: xarita, matn va grafik qutilari */
function layout(W: number, H: number, f: VidFmt) {
  const m = Math.round(Math.min(W, H) * 0.05), u = Math.min(W, H) / 1080;
  if (f === '16:9') {
    const map: Box = { x: 0, y: 0, w: H, h: H }, px = H + m, pw = W - px - m;
    return { u, m, map, head: { x: px, y: m * 1.6, w: pw, h: 0 }, num: { x: px, y: H * 0.42, w: pw, h: 0 }, chart: { x: px, y: H * 0.62, w: pw, h: H * 0.2 }, foot: { x: W - m, y: H - m * 0.7 } };
  }
  const headH = f === '9:16' ? H * 0.13 : H * 0.15, botH = f === '9:16' ? H * 0.22 : H * 0.27;
  const map: Box = { x: 0, y: headH, w: W, h: H - headH - botH };
  return { u, m, map, head: { x: m, y: m * 1.8, w: W - 2 * m, h: 0 }, num: { x: m, y: H - botH + m, w: W - 2 * m, h: 0 }, chart: { x: m, y: H - botH * 0.42 - m * 0.3, w: W - 2 * m, h: botH * 0.32 }, foot: { x: W - m, y: H - m * 0.5 } };
}

/** Bitta kadr (d — marshrut boʻyicha masofa, m) */
export function drawFrame(g: CanvasRenderingContext2D, W: number, H: number, sc: VidScene, o: VidOpt, d: number, base: HTMLCanvasElement, trailPolys: { d: number; poly: P2[] }[], wm: HTMLCanvasElement | null): void {
  const L = layout(W, H, o.fmt), mp = L.map, u = L.u;
  // xarita masshtabi: marshrut ± radius, doiradan chiqmaydi
  const view = viewOf(sc), s = Math.min(mp.w / (view.x1 - view.x0), mp.h / (view.y1 - view.y0)) * 0.94;
  const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
  const X = (x: number) => mp.x + mp.w / 2 + (x - cx) * s, Y = (y: number) => mp.y + mp.h / 2 - (y - cy) * s;
  const path = (poly: P2[]) => { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath(); };
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.rect(mp.x, mp.y, mp.w, mp.h); g.clip();
  if (o.trail) { g.fillStyle = ORANGE; g.globalAlpha = 0.09; for (const t of trailPolys) if (t.d <= d && t.poly.length > 2) { path(t.poly); g.fill(); } g.globalAlpha = 1; }
  const p = sc.pl.at(d), iso = isovist(sc.ix, p, sc.pl.heading(d), sc.opt);
  if (iso.poly.length > 2) { g.fillStyle = ORANGE; g.globalAlpha = 0.92; path(iso.poly); g.fill(); g.globalAlpha = 1; }
  g.drawImage(base, 0, 0);   // binolar va doira (oldindan chizilgan)
  g.strokeStyle = RED; g.lineWidth = 2.4 * u; g.setLineDash([7 * u, 6 * u]);
  g.beginPath(); sc.route.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1])))); g.stroke(); g.setLineDash([]);
  if (o.marks) { const sm = walkSum(sc.w); [sm.iMax, sm.iMin].forEach((i, n) => { if (i < 0) return; const q = sc.pl.at(sc.w.d[i]), r = 15 * u;
    g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 2 * u; g.beginPath(); g.arc(X(q[0]), Y(q[1]), r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = `700 ${Math.round(17 * u)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n + 1), X(q[0]), Y(q[1]) + u); }); }
  g.fillStyle = RED; g.strokeStyle = '#fff'; g.lineWidth = 3 * u; g.beginPath(); g.arc(X(p[0]), Y(p[1]), 10 * u, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
  // matn
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const hd = L.head, f1 = Math.round(48 * u), f2 = Math.round(26 * u);
  g.fillStyle = INK; g.font = `700 ${f1}px ${FONT}`; fitText(g, o.title, hd.x, hd.y + f1 * 0.4, hd.w, f1);
  g.fillStyle = MUTED; g.font = `400 ${f2}px ${FONT}`; fitText(g, o.sub, hd.x, hd.y + f1 * 0.4 + f2 * 1.5, hd.w, f2);
  if (o.num) {
    const n = L.num, fb = Math.round(64 * u);
    g.fillStyle = '#8a4f00'; g.font = `700 ${fb}px ${FONT}`; g.fillText(iso.inside ? sc.t.inside : `${sc.fmtN(iso.area)} m²`, n.x, n.y + fb * 0.4);
    g.fillStyle = MUTED; g.font = `400 ${f2}px ${FONT}`; g.fillText(`${sc.t.area} · ${sc.fmtN(d)} / ${sc.fmtN(sc.pl.L)} m`, n.x, n.y + fb * 0.4 + f2 * 1.4);
  }
  if (o.chart) drawChart(g, sc, L.chart, d, u, o.marks);
  g.fillStyle = MUTED; g.font = `400 ${Math.round(17 * u)}px ${FONT}`; g.textAlign = 'right'; g.fillText(sc.t.src, L.foot.x, L.foot.y); g.textAlign = 'left';
  if (wm) g.drawImage(wm, 0, 0);
}
function fitText(g: CanvasRenderingContext2D, t: string, x: number, y: number, w: number, size: number): void {
  if (!t) return; let s = t; while (s.length > 4 && g.measureText(s).width > w) s = s.slice(0, -2);
  g.fillText(s === t ? t : `${s.trimEnd()}…`, x, y); void size;
}
function drawChart(g: CanvasRenderingContext2D, sc: VidScene, b: Box, d: number, u: number, marks: boolean): void {
  const w = sc.w; let mx = 1500; for (const a of w.area) if (a > mx) mx = a;
  const X = (v: number) => b.x + (w.L ? v / w.L : 0) * b.w, Y = (a: number) => b.y + b.h - (a / mx) * b.h;
  g.fillStyle = 'rgba(20,20,20,0.06)'; g.fillRect(b.x, Y(1000), b.w, b.y + b.h - Y(1000));
  g.beginPath(); let first = true;
  for (let i = 0; i < w.d.length; i++) { const a = w.area[i]; if (Number.isNaN(a)) continue; if (first) { g.moveTo(X(w.d[i]), Y(a)); first = false; } else g.lineTo(X(w.d[i]), Y(a)); }
  g.strokeStyle = '#e08600'; g.lineWidth = 2.5 * u; g.stroke();
  g.lineTo(b.x + b.w, b.y + b.h); g.lineTo(b.x, b.y + b.h); g.closePath(); g.fillStyle = 'rgba(255,153,0,0.18)'; g.fill();
  if (marks) { const sm = walkSum(w); g.fillStyle = INK; g.font = `600 ${Math.round(16 * u)}px ${FONT}`; g.textAlign = 'center'; [sm.iMax, sm.iMin].forEach((i, n) => { if (i >= 0) g.fillText(String(n + 1), X(w.d[i]), b.y + 16 * u); }); g.textAlign = 'left'; }
  g.strokeStyle = RED; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(X(d), b.y - 2 * u); g.lineTo(X(d), b.y + b.h); g.stroke();
}
/** Xarita oynasi: marshrut atrofida radius + 20 m, doira bilan cheklangan */
function viewOf(sc: VidScene): { x0: number; y0: number; x1: number; y1: number } {
  const r = sc.opt.R + 20; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of sc.route) { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }
  const c = sc.clip; return { x0: Math.max(x0, -c), y0: Math.max(y0, -c), x1: Math.min(x1, c), y1: Math.min(y1, c) };
}
/** Oʻzgarmas qatlam: binolar va tahlil doirasi (shaffof fonda) */
function baseLayer(W: number, H: number, sc: VidScene, o: VidOpt): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  const L = layout(W, H, o.fmt), mp = L.map, view = viewOf(sc), s = Math.min(mp.w / (view.x1 - view.x0), mp.h / (view.y1 - view.y0)) * 0.94;
  const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
  const X = (x: number) => mp.x + mp.w / 2 + (x - cx) * s, Y = (y: number) => mp.y + mp.h / 2 - (y - cy) * s;
  g.save(); g.beginPath(); g.rect(mp.x, mp.y, mp.w, mp.h); g.clip();
  g.fillStyle = BLD;
  for (const r of sc.rings) { g.beginPath(); r.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath(); g.fill(); }
  g.strokeStyle = '#c0643a'; g.globalAlpha = 0.6; g.lineWidth = 1.6 * L.u; g.setLineDash([8 * L.u, 6 * L.u]); g.beginPath(); g.arc(X(0), Y(0), sc.clip * s, 0, Math.PI * 2); g.stroke();
  g.restore();
  return c;
}

/** Video yozish. onProgress(0…1); signal — bekor qilish */
export async function recordVideo(sc: VidScene, o: VidOpt, onProgress: (f: number) => void, signal?: AbortSignal): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const [W, H] = vidSize(o.fmt, o.clean), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { alpha: false })!;
  const base = baseLayer(W, H, sc, o);
  let wm: HTMLCanvasElement | null = null;
  if (!o.clean) { wm = document.createElement('canvas'); wm.width = W; wm.height = H; wmCanvas(wm); }
  const trail = Array.from({ length: 13 }, (_, i) => { const d = sc.pl.L * i / 12; return { d, poly: isovist(sc.ix, sc.pl.at(d), sc.pl.heading(d), sc.opt).poly }; });
  const mime = vidMime(), ext: 'mp4' | 'webm' = mime.includes('mp4') ? 'mp4' : 'webm';
  const stream = (c as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: o.clean ? 10_000_000 : 4_000_000 });
  const chunks: Blob[] = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>(r => { rec.onstop = () => r(); });
  const HOLD0 = 0.6, HOLD1 = 1.2, total = o.sec + HOLD0 + HOLD1;
  drawFrame(g, W, H, sc, o, 0, base, trail, wm);
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((done, fail) => {
    const tick = () => {
      if (signal?.aborted) { fail(new DOMException('Bekor qilindi', 'AbortError')); return; }
      const t = (performance.now() - t0) / 1000, k = Math.max(0, Math.min(1, (t - HOLD0) / o.sec));
      drawFrame(g, W, H, sc, o, sc.pl.L * k, base, trail, wm);
      onProgress(Math.min(1, t / total));
      if (t >= total) { done(); return; }
      setTimeout(tick, 1000 / 30);   // setTimeout — fon vkladkada ham (sekinroq) davom etadi
    };
    tick();
  }).finally(() => { if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(tr => tr.stop()); });
  await stopped;
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext };
}
