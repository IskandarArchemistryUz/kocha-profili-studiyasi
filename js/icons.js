/* Archemistry Lab — yagona ikonka tili (dizayn: «Ikonkalar — yagona uslub»).
   Qoida: 24 × 24 toʻr, 1,75 px chiziq, uchlar va burchaklar round, toʻldirish yoʻq,
   chegara chizigʻi shtrix 3,5 / 2, faol holat — qora fon, oq chiziq.
   Bir xil vazifa — bir xil belgi: «Bino» Hudud, Binolar, Master reja va 3D da bitta ikonka.
   KIC.P — <svg> ichki qismi; KIC.D — faqat path (kanvas va Path2D uchun, xizmat belgilari). */
window.KIC=(function(){
'use strict';
const P={
  /* umumiy · hudud */
  select:'<path d="M5 4l13 6-5.5 1.8L10.5 17z"/>',
  circle:'<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  rect:'<rect x="4" y="5" width="16" height="14"/>',
  poly:'<path d="M5 8l9-4 6 7-4 9-11-3z"/>',
  parcel:'<path d="M4 8l12-4 4 12-13 4z" stroke-dasharray="3.5 2"/>',
  layers:'<path d="M12 4 3 9l9 5 9-5z"/><path d="M3 14l9 5 9-5"/>',
  upload:'<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  album:'<rect x="4" y="3" width="16" height="18"/><path d="M8 8h8M8 12h5"/><path d="M14 17h6M17 14l3 3-3 3"/>',
  /* koʻchalar */
  street:'<path d="M5 21 9 3M19 21 15 3"/><path d="M12 5v2M12 11v2M12 17v2"/>',
  crossing:'<path d="M3 7h18M3 17h18"/><path d="M6 9.5v5M10 9.5v5M14 9.5v5M18 9.5v5"/>',
  round:'<circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
  sign:'<path d="M12 4l7 12H5z"/><path d="M12 16v5"/>',
  roadline:'<path d="M4 20 20 4" stroke-dasharray="3 3"/>',
  freeform:'<path d="M4 16c3-8 6 2 9-6s5 2 7 4"/>',
  objects:'<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 21h6"/>',
  section:'<path d="M3 12h18"/><path d="M6 8v8M18 8v8"/><path d="M10 10h4v4h-4z"/>',
  /* binolar */
  bld:'<path d="M5 21V8l7-4 7 4v13"/><path d="M10 21v-5h4v5"/><path d="M3 21h18"/>',
  bldpoly:'<path d="M4 18l2-12 9-2 5 8-6 7z"/><path d="M9 12h6"/>',
  green:'<path d="M12 21v-6"/><path d="M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6z"/>',
  parking:'<rect x="4" y="4" width="16" height="16"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>',
  plan:'<rect x="4" y="4" width="16" height="16"/><path d="M4 11h8V4M12 15h8M16 15v5"/>',
  sun:'<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  wind:'<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  /* oʻlchash va koʻrinish */
  ruler:'<path d="M3 12h18"/><path d="M3 9v6M21 9v6"/><path d="M8 11v2M13 11v2M18 11v2"/>',
  area:'<path d="M5 6l12-2 2 13-13 3z"/><path d="M8 15l6-8M11 18l6-8"/>',
  idea3d:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  city3d:'<path d="M4 21V10l4-2v13M8 21V5l6-2v18M14 21V9l6 3v9M2 21h20"/>',
  models:'<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  /* master reja */
  zone:'<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="16" height="7"/>',
  gen:'<path d="M4 21V11l5-3v13M9 21V6l6-3v18M15 21V9l5 3v9"/>',
  /* boshqaruv belgilari (eski sahifalar: tugmalar, havolalar) — unicode belgilar (→ × ▾ ✎ …) oʻrniga */
  'arrow-right':'<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-left':'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-up':'<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrow-down':'<path d="M12 5v14M6 13l6 6 6-6"/>',
  external:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  'chevron-down':'<path d="M6 9l6 6 6-6"/>',
  'chevron-up':'<path d="M6 15l6-6 6 6"/>',
  'chevron-right':'<path d="M9 6l6 6-6 6"/>',
  'chevron-left':'<path d="M15 6l-6 6 6 6"/>',
  pencil:'<path d="M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 3L8 18z"/><path d="M13.5 6.5l3 3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  play:'<path d="M8 5v14l11-7z"/>',
  pause:'<path d="M9 5v14M15 5v14"/>',
  stop:'<rect x="6" y="6" width="12" height="12"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  'rotate-cw':'<path d="M19.5 9A8 8 0 1 0 20 15"/><path d="M20 4v5h-5"/>',
  'rotate-ccw':'<path d="M4.5 9A8 8 0 1 1 4 15"/><path d="M4 4v5h5"/>',
  settings:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  width:'<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  height:'<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>',
  more:'<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
  copy:'<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/>',
  scissors:'<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5 20 17M8 16.5 20 7"/>',
  'align-left':'<path d="M4 3v18M8 7h12v3H8zM8 14h7v3H8z"/>',
  'align-center':'<path d="M12 3v18M6 7h12v3H6zM8.5 14h7v3h-7z"/>',
  'align-right':'<path d="M20 3v18M4 7h12v3H4zM9 14h7v3H9z"/>',
  'align-top':'<path d="M3 4h18M7 8h3v12H7zM14 8h3v7h-3z"/>',
  'align-middle':'<path d="M3 12h18M7 6h3v12H7zM14 8.5h3v7h-3z"/>',
  'align-bottom':'<path d="M3 20h18M7 4h3v12H7zM14 9h3v7h-3z"/>',
  'flip-h':'<path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M9 7 3 17h6zM15 7l6 10h-6z"/>',
  'flip-v':'<path d="M3 12h18" stroke-dasharray="2 2.5"/><path d="M7 9h10L7 3zM7 15h10L7 21z"/>',
  'page-l':'<rect x="3" y="6" width="18" height="12"/>',
  'page-p':'<rect x="6" y="3" width="12" height="18"/>',
  template:'<rect x="4" y="4" width="16" height="16"/><path d="M4 9h16M10 9v11"/>',
  download:'<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 15v5h16v-5"/>',
  eye:'<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
  expand:'<path d="M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6"/>',
  backspace:'<path d="M9 5h11v14H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>',
  sparkle:'<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  move:'<path d="M12 3v18M3 12h18M9.5 5.5 12 3l2.5 2.5M9.5 18.5 12 21l2.5-2.5M5.5 9.5 3 12l2.5 2.5M18.5 9.5 21 12l-2.5 2.5"/>',
  swap:'<path d="M4 8h15M15 4l4 4-4 4"/><path d="M20 16H5M9 12l-4 4 4 4"/>',
  'swap-v':'<path d="M8 20V5M4 9l4-4 4 4"/><path d="M16 4v15M12 15l4 4 4-4"/>'
};
/* xaritadagi xizmatlar: ayni chiziq, rangli doira ichida (oq) — faqat path, Path2D uchun */
const D={
  food:'M5 9h14l-1.5 10h-11zM9 9l3-5 3 5',
  school:'M3 9l9-5 9 5-9 5zM7 11.5v4c3 2 7 2 10 0v-4',
  health:'M12 5v14M5 12h14',
  bus:'M7 4h10a2 2 0 0 1 2 2v11H5V6a2 2 0 0 1 2-2zM5 11h14M8 20v-3M16 20v-3',
  metro:'M5 19 8 6l4 7 4-7 3 13',
  park:'M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5',
  tree:'M12 21v-6M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6z',
  sport:'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16',
  cafe:'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16',
  serv:'M4 7h16v12H4zM9 7V4h6v3M4 12h16',
  cult:'M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  cross:'M3 7h18M3 17h18M6 9.5v5M10 9.5v5M14 9.5v5M18 9.5v5',
  wheel:'M11 4.5a1.5 1.5 0 1 0 .1 0M10 8v5h5l2 5M8.5 10.8a5 5 0 1 0 6.3 7.4',
  bld:'M5 21V8l7-4 7 4v13M10 21v-5h4v5M3 21h18',
  warn:'M12 4l9 16H3zM12 10v4M12 17v.5',
  star:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  bike:'M6 17.5a3.5 3.5 0 1 0 .1 0M18 17.5a3.5 3.5 0 1 0 .1 0M6 17.5l4-7h6l2 7M10 10.5 8.5 7H7M16 10.5 14.5 7h2'
};
const svg=(n,s,extra)=>`<svg viewBox="0 0 24 24" width="${s||22}" height="${s||22}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra?' '+extra:''}>${P[n]||''}</svg>`;
/* qatordagi kichik ikonka (tugma, havola): 1,75 px, odatda 16 px, matn bilan bir chiziqda.
   pos: 'a' — matndan keyin (chapdan oraliq), 'b' — matndan oldin (oʻngdan oraliq), boʻsh — faqat ikonka. */
const i=(n,pos,s)=>`<svg class="kic${pos?' kic-'+pos:''}" viewBox="0 0 24 24" width="${s||16}" height="${s||16}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n]||''}</svg>`;
/* statik HTML: <i data-i="arrow-right" data-p="a"></i> — sahifa ochilganda <svg> ga almashtiriladi */
function fill(root){(root||document).querySelectorAll('i[data-i]').forEach(e=>{e.insertAdjacentHTML('beforebegin',i(e.dataset.i,e.dataset.p||'',+e.dataset.s||null));e.remove();});}
if(!document.getElementById('kicCss')){const st=document.createElement('style');st.id='kicCss';
  st.textContent='.kic{display:inline-block;flex:none;vertical-align:-3px;pointer-events:none}.kic-a{margin-left:.4em}.kic-b{margin-right:.4em}';
  (document.head||document.documentElement).appendChild(st);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>fill());else fill();
/* data-ic="nom" boʻlgan elementlarga ikonka qoʻyish */
function apply(root){(root||document).querySelectorAll('[data-ic]').forEach(e=>{if(e.dataset.icDone)return;e.insertAdjacentHTML('afterbegin',svg(e.dataset.ic,+e.dataset.icS||null));e.dataset.icDone='1';});}
return {P,D,svg,apply,i,fill};
})();
