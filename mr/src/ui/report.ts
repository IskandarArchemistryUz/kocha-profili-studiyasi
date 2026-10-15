/**
 * PDF hisobot: brauzerning «Chop etish → PDF sifatida saqlash» orqali (A4). Shriftlar va oʻzbek harflari
 * toʻgʻri chiqadi, qoʻshimcha kutubxona kerak emas. Mazmun: koʻrinishlar, TEP, meʼyoriy reyestr, taxminlar.
 */
import type { Project } from '../core/doc';
import type { Result } from '../norms/rules';
import type { TepRow } from '../core/tep';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (v: number, d = 0) => v.toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: 0 }).replace(/ /g, ' ');
const STATUS: Record<string, [string, string]> = { pass: ['mos', '#1f7a4d'], fail: ['mos emas', '#b3261e'], review: ['koʻrib chiqish', '#a15c00'], na: ['baholanmadi', '#6b6b6b'] };

export function reportHtml(doc: Project, shots: Record<'plan' | 'axo' | 'persp', string>, tep: TepRow[], rules: Result[], notes: string[]): string {
  const date = new Date().toLocaleDateString('ru-RU');
  const fmtV = (r: TepRow) => r.v == null ? '—' : typeof r.v === 'string' ? esc(r.v) : num(r.v, Math.abs(r.v) < 10 ? 2 : r.unit === '%' ? 1 : 0);
  const groups = [...new Set(tep.map(r => r.g))];
  const counts = rules.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {} as Record<string, number>);
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${esc(doc.name)} — Master reja hisoboti</title>
<style>
@page { size: A4; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; } body { font: 10.5pt/1.45 "Inter", "Segoe UI", Arial, sans-serif; color: #1d1d1b; margin: 0; background: #fff; }
.bar { position: sticky; top: 0; background: #1d1d1b; color: #fff; padding: 10px 18px; display: flex; gap: 12px; align-items: center; }
.bar button { font: inherit; padding: 6px 14px; border: 0; border-radius: 6px; background: #fff; cursor: pointer; } .bar span { opacity: .75; }
main { max-width: 186mm; margin: 0 auto; padding: 8mm 0; }
h1 { font-size: 20pt; margin: 0 0 2mm; letter-spacing: -.01em; } h2 { font-size: 12.5pt; margin: 8mm 0 3mm; border-bottom: 1.5px solid #1d1d1b; padding-bottom: 1mm; }
.meta { color: #555; font-size: 9.5pt; } .kick { font: 600 8pt/1 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; color: #8a857c; }
img { width: 100%; display: block; border: 1px solid #ddd; } .two { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4mm; }
.cap { font-size: 8.5pt; color: #666; margin-top: 1mm; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; } th, td { text-align: left; padding: 1.6mm 2mm; border-bottom: .6px solid #ddd; vertical-align: top; }
th { font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #666; } td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
tr.g td { background: #f3f1ec; font-weight: 600; } .sm { font-size: 8.5pt; color: #666; }
.chip { display: inline-block; padding: .4mm 2mm; border-radius: 3mm; color: #fff; font-size: 8pt; white-space: nowrap; }
.sum { display: flex; gap: 6mm; margin: 2mm 0 3mm; font-size: 9.5pt; } ul { padding-left: 5mm; } li { margin: 1mm 0; }
.pb { break-before: page; } tr, img { break-inside: avoid; }
@media print { .bar { display: none; } main { padding: 0; } }
</style></head><body>
<div class="bar"><button onclick="print()">PDF saqlash / chop etish</button><span>Chop etish oynasida «PDF sifatida saqlash»ni tanlang (A4).</span></div>
<main>
<div class="kick">Archemistry Lab · Master reja</div>
<h1>${esc(doc.name)}</h1>
<div class="meta">${date} · markaz ${doc.origin[1].toFixed(5)}, ${doc.origin[0].toFixed(5)} · meʼyorlar: ShNQ 2.07.01-23, SanQvaN 0331-16</div>
<h2>Hajmiy-fazoviy yechim</h2>
<img src="${shots.axo}" alt="Aksonometriya"><div class="cap">Aksonometriya</div>
<div class="two"><div><img src="${shots.plan}" alt="Reja"><div class="cap">Bosh reja</div></div><div><img src="${shots.persp}" alt="Perspektiva"><div class="cap">Perspektiva</div></div></div>
<h2 class="pb">Texnik-iqtisodiy koʻrsatkichlar</h2>
<table><thead><tr><th>Koʻrsatkich</th><th>Birlik</th><th style="text-align:right">Qiymat</th><th>Izoh</th></tr></thead><tbody>
${groups.map(g => `<tr class="g"><td colspan="4">${esc(g)}</td></tr>` + tep.filter(r => r.g === g).map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.unit)}</td><td class="n">${fmtV(r)}</td><td class="sm">${esc(r.note ?? '')}</td></tr>`).join('')).join('')}
</tbody></table>
<h2 class="pb">Meʼyoriy reyestr</h2>
<div class="sum">${Object.entries(STATUS).filter(([k]) => counts[k]).map(([k, [t, c]]) => `<span><span class="chip" style="background:${c}">${t}</span> ${counts[k]}</span>`).join('')}</div>
<table><thead><tr><th>Talab va manba</th><th style="text-align:right">Qiymat</th><th style="text-align:right">Meʼyor</th><th>Natija</th></tr></thead><tbody>
${rules.map(r => `<tr><td><b>${esc(r.title)}</b><br><span class="sm">${esc(`${r.source.doc}, ${r.source.clause}${r.source.verified ? '' : ' (tekshirilsin)'}`)}</span>${r.note ? `<div class="sm">${esc(r.note)}</div>` : ''}</td><td class="n">${r.value != null ? `${num(r.value, Math.abs(r.value) < 10 ? 2 : 0)} ${esc(r.unit ?? '')}` : '—'}</td><td class="n">${r.limit ? esc(`${r.limit} ${r.unit ?? ''}`) : '—'}</td><td><span class="chip" style="background:${STATUS[r.status][1]}">${STATUS[r.status][0]}</span></td></tr>`).join('')}
</tbody></table>
<h2>Taxminlar va cheklovlar</h2>
<ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
<p class="sm">Hisobot Archemistry Lab «Master reja» ilovasida avtomatik tuzildi. Qiymatlar loyiha hujjatidan har safar qayta hisoblanadi; meʼyor bandlari asl matndan olingan, «tekshirilsin» belgisi borlari — asl matn bilan solishtirilmagan.</p>
</main></body></html>`;
}
