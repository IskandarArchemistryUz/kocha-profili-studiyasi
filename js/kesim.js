/* Archemistry Lab — Koʻcha kesimi (urban:STREET uslubidagi sodda muharrir).
   Chap — shablonlar (data/kocha-modullari.json), markaz — Kesim / Reja / Aksonometriya (SVG, metr birligida),
   past — elementlar tasmasi (bosish, chetini sudrab kenglik, sudrab tartib), oʻng — element xususiyatlari va palitra.
   Holat: localStorage «kps_kesim». Albomga — IndexedDB «kps_mat» (boshqa boʻlimlar bilan bir xil). */
(function(){
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d=1)=>(+v).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const FH=3.3;
/* elementlar: nom, rang, standart kenglik, yoʻnalishi bormi, qatnov qismimi */
let DK={walk:{n:'Trotuar',c:'#e4d9c3'},shared:{n:'Umumiy sirt',c:'#dccfb0'},furn:{n:'Jihozlar zonasi',c:'#cdbfa3'},green:{n:'Koʻkalamzor',c:'#8cb36b'},
  median:{n:'Ajratuvchi polosa',c:'#86ad66'},island:{n:'Xavfsizlik orolchasi',c:'#d3cab6'},rain:{n:'Yomgʻir bogʻi',c:'#6aa07f'},buffer:{n:'Bufer / bordyur',c:'#d6d1c6'},
  hatch:{n:'Shtrixlangan ajratuvchi',c:'#55585f',road:true},lane:{n:'Harakat boʻlagi',c:'#4b4e55',road:true},turn:{n:'Burilish boʻlagi',c:'#51545b',road:true},
  bus:{n:'Avtobus boʻlagi',c:'#bf5a4d',road:true},tram:{n:'Tramvay yoʻli',c:'#6b6c72',road:true},bike:{n:'Velo yoʻlak',c:'#5fae88'},
  park:{n:'Avtoturargoh — parallel',c:'#62656c',road:true},park30:{n:'Avtoturargoh 30°',c:'#62656c',road:true},park45:{n:'Avtoturargoh 45°',c:'#62656c',road:true},park90:{n:'Avtoturargoh 90°',c:'#62656c',road:true}};
const DEFW={walk:2.25,shared:3.5,furn:1.5,green:1.5,median:2,island:2,rain:2,buffer:.6,hatch:1,lane:3.5,turn:3,bus:3.5,tram:3.1,bike:1.8,park:2.4,park30:4.7,park45:5.3,park90:5};
const DIRK=new Set(['lane','bus','tram','bike','turn']);
const PAL=[['Piyoda',['walk','furn','shared']],['Landshaft',['green','rain','median','island']],['Velo',['bike']],['Transport',['lane','turn','bus','tram']],['Avtoturargoh',['park','park30','park45','park90']],['Ajratuvchi',['buffer','hatch']]];
const dark=k=>['lane','turn','hatch','bus','tram','park','park30','park45','park90'].includes(k);

/* ---------- holat ---------- */
const DEF={W:24,hl:6,hr:6,tpl:'r4',st:[['walk',3,0],['green',2,0],['lane',3.5,-1],['lane',3.5,-1],['lane',3.5,1],['lane',3.5,1],['green',2,0],['walk',3,0]].map(([k,w,d])=>({k,w,d}))};
let S;try{S=JSON.parse(localStorage.getItem('kps_kesim')||'null');}catch(_){S=null;}
if(!S||!Array.isArray(S.st))S=JSON.parse(JSON.stringify(DEF));
let V={v:'kesim',d:0,sel:-1,vb:null};
const H={u:[],r:[]};
const save=()=>{try{localStorage.setItem('kps_kesim',JSON.stringify(S));}catch(_){}};
function act(fn){const p=JSON.stringify(S);fn();if(JSON.stringify(S)!==p){H.u.push(p);if(H.u.length>100)H.u.shift();H.r=[];save();}render();}
function undo(){if(!H.u.length)return;H.r.push(JSON.stringify(S));S=JSON.parse(H.u.pop());save();render();}
function redo(){if(!H.r.length)return;H.u.push(JSON.stringify(S));S=JSON.parse(H.r.pop());save();render();}
const sum=()=>S.st.reduce((a,e)=>a+e.w,0);

/* ---------- shablonlar ---------- */
let TPL=[];
fetch('data/kocha-modullari.json').then(r=>r.json()).then(d=>{Object.entries(d.dk||{}).forEach(([k,v])=>{DK[k]=Object.assign({},DK[k]||{},{n:DK[k]?DK[k].n:v.n,c:v.c,road:!!v.road});});
  TPL=(d.presets||[]).filter(p=>p.g!=='Konstruktor');renderTpl();}).catch(()=>{$('#tpls').innerHTML=`<p class="note">${esc(T('Shablonlar yuklanmadi.'))}</p>`;});
let OPEN=null;
function renderTpl(){const q=($('#q').value||'').trim().toLowerCase(),g={};TPL.forEach(p=>{if(q&&!(T(p.n).toLowerCase().includes(q)||String(p.W).includes(q)||p.st.some(s=>T((DK[s[0]]||{}).n||'').toLowerCase().includes(q))))return;(g[p.g]=g[p.g]||[]).push(p);});
  if(OPEN==null){const c=TPL.find(p=>p.id===S.tpl);OPEN=c?c.g:Object.keys(g)[0];}
  $('#tpls').innerHTML=Object.entries(g).map(([n,ps])=>{const open=q||OPEN===n;return `<div class="grp"><button data-g="${esc(n)}" aria-expanded="${!!open}">${open?'▾':'▸'} ${esc(T(n))}<small>${ps.length}</small></button>${open?ps.map(p=>`<button class="tpl" data-t="${p.id}" aria-pressed="${p.id===S.tpl}"><span class="st">${p.st.map(s=>`<i style="flex:${s[1]} 1 0;background:${(DK[s[0]]||{}).c||'#ccc'}"></i>`).join('')}</span><b>${esc(T(p.n))}</b><small>${fmt(p.W)} m</small></button>`).join(''):''}</div>`;}).join('')||`<p class="note">${esc(T('Topilmadi'))}</p>`;
  $$('#tpls [data-g]').forEach(b=>b.onclick=()=>{OPEN=OPEN===b.dataset.g?'':b.dataset.g;renderTpl();});
  $$('#tpls [data-t]').forEach(b=>b.onclick=()=>{const p=TPL.find(x=>x.id===b.dataset.t);if(!p)return;V.sel=-1;V.vb=null;act(()=>{S.tpl=p.id;S.W=p.W;S.st=p.st.map(([k,w,d])=>({k,w,d:d||0}));});renderTpl();});}
$('#q').oninput=renderTpl;

/* ---------- palitra va xususiyatlar ---------- */
function renderPal(){$('#pal').innerHTML=PAL.map(([g,ks])=>`<div class="pg"><span class="lb">${esc(T(g))}</span>${ks.map(k=>`<button class="pi" draggable="true" data-add="${k}"><i style="background:${DK[k].c}"></i><span>${esc(T(DK[k].n))}</span><small>${fmt(DEFW[k],2)}</small></button>`).join('')}</div>`).join('');
  $$('#pal [data-add]').forEach(b=>{b.onclick=()=>addEl(b.dataset.add);b.ondragstart=e=>{e.dataTransfer.setData('text/kps-add',b.dataset.add);e.dataTransfer.effectAllowed='copy';};});}
function addEl(k,at){act(()=>{const i=at!=null?at:(V.sel>=0?V.sel+1:Math.ceil(S.st.length/2));S.st.splice(i,0,{k,w:DEFW[k]||2,d:DIRK.has(k)?(i<S.st.length/2?-1:1):0});V.sel=i;});}
function renderProp(){const e=S.st[V.sel],el=$('#prop');
  if(!e){el.innerHTML=`<span class="lb">${esc(T('Element'))}</span><p class="note">${esc(T('Tasmadagi elementni bosing — kengligi va yoʻnalishini oʻzgartirasiz. Chetini sudrab kenglikni, oʻzini sudrab tartibni oʻzgartirasiz.'))}</p>`;return;}
  el.innerHTML=`<span class="lb">${esc(T('Element'))} ${V.sel+1} / ${S.st.length}</span><h3>${esc(T(DK[e.k].n))}</h3>
    <div class="kv"><span>${esc(T('Kenglik, m'))}</span><input type="number" id="pw" min="0.2" max="40" step="0.05" value="${e.w}">
    ${DIRK.has(e.k)?`<span>${esc(T('Yoʻnalish'))}</span><select id="pd"><option value="-1" ${e.d<0?'selected':''}>↓ ${esc(T('pastga'))}</option><option value="1" ${e.d>0?'selected':''}>↑ ${esc(T('yuqoriga'))}</option><option value="0" ${!e.d?'selected':''}>↕ ${esc(T('ikki tomon'))}</option></select>`:''}</div>
    <div style="display:flex;gap:6px"><button class="btn" id="pdup">${esc(T('Nusxa'))}</button><button class="btn" id="pdel">${esc(T('Oʻchirish'))}</button></div>`;
  $('#pw').onchange=ev=>act(()=>{e.w=Math.max(.2,Math.min(40,Math.round((+ev.target.value||e.w)*100)/100));});
  const pd=$('#pd');if(pd)pd.onchange=()=>act(()=>{e.d=+pd.value;});
  $('#pdup').onclick=()=>act(()=>{S.st.splice(V.sel+1,0,Object.assign({},e));V.sel++;});
  $('#pdel').onclick=()=>act(()=>{S.st.splice(V.sel,1);V.sel=Math.min(V.sel,S.st.length-1);});}

/* ---------- tasma ---------- */
function renderRow(){const row=$('#row'),tot=Math.max(S.W,sum()),used=sum();
  $('#usedT').textContent=`${T('Ishlatilgan')} ${fmt(used,2)} / ${fmt(S.W,2)} m`;const u=$('#used');u.classList.toggle('over',used>S.W+.005);u.firstElementChild.style.width=Math.min(100,used/S.W*100)+'%';
  row.innerHTML=`<span class="bld" title="${esc(T('Chap bino'))}">${S.hl||'—'}</span>`+S.st.map((e,i)=>`<div class="el${dark(e.k)?' dk':''}${i===V.sel?' sel':''}" data-i="${i}" draggable="true" style="flex:${e.w} 1 0;background:${DK[e.k].c}" title="${esc(T(DK[e.k].n))} · ${fmt(e.w,2)} m"><span class="nm">${esc(T(DK[e.k].n))}${DIRK.has(e.k)&&e.d?(e.d>0?' ↑':' ↓'):''}</span><span class="w">${fmt(e.w,2)}</span><span class="h" data-h="${i}"></span></div>`).join('')+
    (used<S.W-.005?`<div style="flex:${S.W-used} 1 0;background:repeating-linear-gradient(45deg,#fff,#fff 4px,#f0eee9 4px,#f0eee9 8px)" title="${esc(T('boʻsh'))}"></div>`:'')+`<span class="bld" title="${esc(T('Oʻng bino'))}">${S.hr||'—'}</span>`;
  $$('#row .el').forEach(d=>{const i=+d.dataset.i;
    d.onclick=ev=>{if(ev.target.dataset.h!=null)return;V.sel=i;render();};
    d.ondragstart=ev=>{if(ev.target!==d){ev.preventDefault();return;}ev.dataTransfer.setData('text/kps-move',String(i));ev.dataTransfer.effectAllowed='move';};
    d.ondragover=ev=>{ev.preventDefault();const r=d.getBoundingClientRect(),left=ev.clientX<r.left+r.width/2;d.classList.toggle('drop-l',left);d.classList.toggle('drop-r',!left);};
    d.ondragleave=()=>d.classList.remove('drop-l','drop-r');
    d.ondrop=ev=>{ev.preventDefault();d.classList.remove('drop-l','drop-r');const r=d.getBoundingClientRect(),at=ev.clientX<r.left+r.width/2?i:i+1;
      const add=ev.dataTransfer.getData('text/kps-add');if(add){addEl(add,at);return;}
      const from=+ev.dataTransfer.getData('text/kps-move');if(isNaN(from))return;act(()=>{const [e]=S.st.splice(from,1);const to=at>from?at-1:at;S.st.splice(to,0,e);V.sel=to;});};});
  row.ondragover=ev=>ev.preventDefault();
  row.ondrop=ev=>{if(ev.target!==row&&!ev.target.classList.contains('bld'))return;const add=ev.dataTransfer.getData('text/kps-add');if(add)addEl(add,S.st.length);};
  /* chetini sudrab kenglik: 0,05 m qadam (Shift — 0,5 m) */
  $$('#row [data-h]').forEach(h=>h.onpointerdown=ev=>{ev.preventDefault();ev.stopPropagation();const i=+h.dataset.h,e=S.st[i],w0=e.w,x0=ev.clientX,pxm=row.clientWidth/Math.max(S.W,sum()),snap=JSON.stringify(S);
    const mv=m=>{let w=w0+(m.clientX-x0)/pxm;w=m.shiftKey?Math.round(w*2)/2:Math.round(w*20)/20;e.w=Math.max(.2,Math.min(40,w));V.sel=i;renderRow();renderView();renderProp();};
    const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);if(JSON.stringify(S)!==snap){H.u.push(snap);H.r=[];save();}};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);});}
$('#fit').onclick=()=>act(()=>{const s=sum();if(!s)return;const k=S.W/s;S.st.forEach(e=>{e.w=Math.round(e.w*k*100)/100;});const d=Math.round((S.W-sum())*100)/100;if(S.st.length)S.st[Math.floor(S.st.length/2)].w=Math.round((S.st[Math.floor(S.st.length/2)].w+d)*100)/100;});
$('#mirror').onclick=()=>act(()=>{const n=S.st.length,half=S.st.slice(0,Math.ceil(n/2));const mid=n%2?[half.pop()]:[];S.st=half.concat(mid,half.slice().reverse().map(e=>Object.assign({},e,{d:-e.d})));});
$('#clear').onclick=()=>act(()=>{S.st=[];V.sel=-1;});
['W','hl','hr'].forEach(k=>{const i=$('#'+k);i.onchange=()=>act(()=>{S[k]=Math.max(+i.min,Math.min(+i.max,+i.value||0));});});

/* ---------- koʻrinishlar (SVG, metr birligida) ---------- */
const svg=$('#svg');
const P=(a)=>a.map(p=>p[0].toFixed(3)+','+p[1].toFixed(3)).join(' ');
function bounds(){let y=0;return S.st.map(e=>{const o={e,y0:y,y1:y+e.w,c:y+e.w/2};y+=e.w;return o;});}
const lvl=e=>DK[e.k].road?0:.15;
function people(y,z,h,col){return `<g stroke="${col}" stroke-width=".09" stroke-linecap="round" fill="none"><circle cx="${y}" cy="${-(z+h-.12)}" r=".12" fill="${col}" stroke="none"/><path d="M${y} ${-(z+h-.26)}V${-(z+.85)}M${y} ${-(z+.85)}l-.18 ${.85}M${y} ${-(z+.85)}l.18 ${.85}M${y} ${-(z+h-.5)}l-.25 .5M${y} ${-(z+h-.5)}l.25 .5"/></g>`;}
function tree(y,z,w){const r=Math.max(1.1,Math.min(2.6,w*.9));return `<path d="M${y} ${-z}V${-(z+2.6)}" stroke="#6d5b45" stroke-width=".22"/><ellipse cx="${y}" cy="${-(z+2.6+r*1.05)}" rx="${r}" ry="${r*1.15}" fill="#a9c98b" fill-opacity=".85" stroke="#6f9a52" stroke-width=".05"/>`;}
function car(y,z,w,ht,col){return `<rect x="${y-w/2}" y="${-(z+ht*.62)}" width="${w}" height="${ht*.5}" rx=".25" fill="${col}"/><path d="M${y-w*.36} ${-(z+ht*.62)}L${y-w*.26} ${-(z+ht)}H${y+w*.26}L${y+w*.36} ${-(z+ht*.62)}Z" fill="${col}" opacity=".85"/><circle cx="${y-w*.3}" cy="${-(z+.32)}" r=".32" fill="#222"/><circle cx="${y+w*.3}" cy="${-(z+.32)}" r=".32" fill="#222"/>`;}
function kesimSVG(){const B=bounds(),W=S.W,HL=S.hl*FH,HR=S.hr*FH,Hm=Math.max(HL,HR,9),bd=6;let g='';
  /* binolar */
  const bld=(x0,x1,h,side)=>{if(!h)return '';let s=`<rect x="${x0}" y="${-h}" width="${x1-x0}" height="${h}" fill="#efede8" stroke="#141414" stroke-width=".06"/>`;
    for(let f=0;f<h/FH;f++){const z=f*FH;s+=`<line x1="${x0}" x2="${x1}" y1="${-z}" y2="${-z}" stroke="#141414" stroke-width=".02"/>`;if(f>0)s+=`<rect x="${side<0?x1-.25:x0}" y="${-(z+2.1)}" width=".25" height="1.4" fill="#9fb6c9"/>`;}
    return s;};
  g+=bld(-bd,0,HL,-1)+bld(W,W+bd,HR,1);
  /* sirt */
  B.forEach(o=>{const z=lvl(o.e);g+=`<rect x="${o.y0}" y="${-z}" width="${o.e.w}" height="${z+.6}" fill="${DK[o.e.k].c}" stroke="#141414" stroke-width=".03" data-i="${S.st.indexOf(o.e)}"/>`;});
  /* jihozlar */
  B.forEach((o,i)=>{const e=o.e,z=lvl(e),k=e.k,c=o.c;
    if(k==='walk'||k==='shared'){const n=Math.max(1,Math.floor(e.w/2.2));for(let j=0;j<n;j++)g+=people(o.y0+(j+.5)*e.w/n,z,1.7-(j%2)*.1,'#3a3a3a');}
    else if(k==='green'||k==='median')g+=tree(c,z,e.w);
    else if(k==='rain')g+=`<ellipse cx="${c}" cy="${-(z+.5)}" rx="${e.w*.35}" ry=".5" fill="#7fae86"/>`;
    else if(k==='furn')g+=`<path d="M${o.y0+.3} ${-z}V${-(z+6)}h${Math.min(1.2,e.w)}" stroke="#555" stroke-width=".1" fill="none"/><rect x="${c-.5}" y="${-(z+.45)}" width="1" height=".1" fill="#555"/>`;
    else if(k==='bike')g+=`<g stroke="#2d6b4f" stroke-width=".07" fill="none"><circle cx="${c-.45}" cy="${-(z+.34)}" r=".33"/><circle cx="${c+.45}" cy="${-(z+.34)}" r=".33"/></g>`+people(c,z+.6,1.2,'#2d6b4f');
    else if(k==='lane'||k==='turn')g+=car(c,z,1.8,1.45,i%2?'#d8d5ce':'#c9c4ba');
    else if(k.startsWith('park'))g+=car(c,z,Math.min(1.8,e.w*.8),1.45,'#bdb8ad');
    else if(k==='bus')g+=`<rect x="${c-1.25}" y="${-(z+3.1)}" width="2.5" height="2.8" rx=".2" fill="#d96b5d"/><circle cx="${c-.8}" cy="${-(z+.4)}" r=".45" fill="#222"/><circle cx="${c+.8}" cy="${-(z+.4)}" r=".45" fill="#222"/>`;
    else if(k==='tram')g+=`<rect x="${c-1.3}" y="${-(z+3.5)}" width="2.6" height="3.2" rx=".2" fill="#e2dccd" stroke="#555" stroke-width=".05"/><path d="M${c} ${-(z+3.5)}l-.6-1h1.2" stroke="#555" stroke-width=".05" fill="none"/><line x1="${c-1}" x2="${c+1}" y1="${-(z+5.9)}" y2="${-(z+5.9)}" stroke="#555" stroke-width=".04"/>`;
    else if(k==='buffer'||k==='island')g+=`<rect x="${c-.06}" y="${-(z+.9)}" width=".12" height=".9" fill="#777"/>`;});
  /* oʻlchamlar */
  let dm='';B.forEach(o=>{dm+=`<line x1="${o.y0}" x2="${o.y0}" y1="1.1" y2="1.6" stroke="#141414" stroke-width=".03"/><text x="${o.c}" y="2.05" font-size=".42" text-anchor="middle" font-family="IBM Plex Mono,monospace">${fmt(o.e.w,2)}</text>`;});
  const sw=sum();dm+=`<line x1="${sw}" x2="${sw}" y1="1.1" y2="1.6" stroke="#141414" stroke-width=".03"/><line x1="0" x2="${sw}" y1="1.35" y2="1.35" stroke="#141414" stroke-width=".03"/>`;
  dm+=`<line x1="0" x2="${W}" y1="2.9" y2="2.9" stroke="#b23a2e" stroke-width=".04" stroke-dasharray=".3 .2"/><text x="${W/2}" y="3.6" font-size=".5" text-anchor="middle" font-family="IBM Plex Mono,monospace" fill="#b23a2e">${T('qizil chiziqlar orasi')} ${fmt(W,2)} m</text>`;
  dm+=`<line x1="0" x2="0" y1="${-Hm-1}" y2="3" stroke="#b23a2e" stroke-width=".05" stroke-dasharray=".4 .25"/><line x1="${W}" x2="${W}" y1="${-Hm-1}" y2="3" stroke="#b23a2e" stroke-width=".05" stroke-dasharray=".4 .25"/>`;
  if(V.sel>=0&&B[V.sel])dm+=`<rect x="${B[V.sel].y0}" y="${-Hm-1}" width="${B[V.sel].e.w}" height="${Hm+1.6}" fill="#2a6fb0" fill-opacity=".08" stroke="#2a6fb0" stroke-width=".05"/>`;
  return {g:g+dm,vb:[-bd-1,-Hm-2,W+2*bd+2,Hm+6.5]};}
function rejaSVG(){const B=bounds(),W=S.W,L=60;let g='';
  g+=`<rect x="0" y="-9" width="${L}" height="8.6" fill="#e3e0d9" stroke="#141414" stroke-width=".05"/><rect x="0" y="${W+.4}" width="${L}" height="8.6" fill="#e3e0d9" stroke="#141414" stroke-width=".05"/>`;
  B.forEach(o=>{g+=`<rect x="0" y="${o.y0}" width="${L}" height="${o.e.w}" fill="${DK[o.e.k].c}" data-i="${S.st.indexOf(o.e)}"/>`;});
  /* chiziqlar orasidagi belgilar */
  for(let i=0;i<B.length-1;i++){const a=B[i].e,b=B[i+1].e,y=B[i].y1;if(!DK[a.k].road||!DK[b.k].road)continue;
    if(a.k.startsWith('park')||b.k.startsWith('park'))g+=`<line x1="0" x2="${L}" y1="${y}" y2="${y}" stroke="#fff" stroke-width=".12"/>`;
    else if(a.d&&b.d&&a.d!==b.d)g+=`<line x1="0" x2="${L}" y1="${y-.12}" y2="${y-.12}" stroke="#fff" stroke-width=".1"/><line x1="0" x2="${L}" y1="${y+.12}" y2="${y+.12}" stroke="#fff" stroke-width=".1"/>`;
    else g+=`<line x1="0" x2="${L}" y1="${y}" y2="${y}" stroke="#fff" stroke-width=".12" stroke-dasharray="3 6"/>`;}
  /* piyoda oʻtish joyi */
  const rd=B.filter(o=>DK[o.e.k].road);if(rd.length){const y0=Math.min(...rd.map(o=>o.y0)),y1=Math.max(...rd.map(o=>o.y1));for(let x=8;x<12;x+=1)g+=`<rect x="${x}" y="${y0}" width=".5" height="${y1-y0}" fill="#fff" opacity=".9"/>`;}
  B.forEach((o,i)=>{const e=o.e,k=e.k,c=o.c;
    if(k==='green'||k==='median')for(let x=4;x<L;x+=8)g+=`<circle cx="${x}" cy="${c}" r="${Math.min(2.4,Math.max(1.2,e.w*.9))}" fill="#7fae5f" fill-opacity=".75" stroke="#5c8a42" stroke-width=".06"/>`;
    if((k==='lane'||k==='turn'||k==='bus')&&e.d){const ar=x=>{const d=e.d;return `<path d="M${x-d*1.8} ${c}H${x}" stroke="#fff" stroke-width=".16"/><path d="M${x+d*.7} ${c}L${x} ${c-.45}L${x} ${c+.45}Z" fill="#fff"/>`;};g+=ar(30)+ar(50);}
    if(k==='lane')for(let x=16+(i*7)%10;x<L-6;x+=18)g+=`<rect x="${x}" y="${c-.9}" width="4.5" height="1.8" rx=".4" fill="${i%2?'#e9e6df':'#d4cfc4'}"/>`;
    if(k==='bus')g+=`<rect x="36" y="${c-1.25}" width="12" height="2.5" rx=".3" fill="#e37a6c"/>`;
    if(k==='tram')g+=`<line x1="0" x2="${L}" y1="${c-.72}" y2="${c-.72}" stroke="#999" stroke-width=".08"/><line x1="0" x2="${L}" y1="${c+.72}" y2="${c+.72}" stroke="#999" stroke-width=".08"/>`;
    if(k==='park')for(let x=14;x<L-5;x+=6)g+=`<rect x="${x}" y="${c-.9}" width="5" height="1.8" rx=".3" fill="#c8c3b8"/>`;
    if(k==='park30'||k==='park45'||k==='park90'){const a=k==='park30'?30:k==='park45'?45:90,sa=Math.sin(a*Math.PI/180),ln=Math.min(4.8,(e.w-.2)/sa);g+=`<clipPath id="pc${i}"><rect x="0" y="${o.y0}" width="${L}" height="${e.w}"/></clipPath><g clip-path="url(#pc${i})">`;for(let x=14;x<L-6;x+=2.6/sa)g+=`<rect x="${x-ln/2}" y="${c-1}" width="${ln}" height="2" rx=".3" fill="#c8c3b8" transform="rotate(${-a} ${x} ${c})"/>`;g+='</g>';}
    if(k==='bike'){g+=`<g fill="none" stroke="#fff" stroke-width=".1"><circle cx="40" cy="${c}" r=".5"/><circle cx="41.6" cy="${c}" r=".5"/></g>`;}
    if(k==='walk'||k==='shared')for(let x=6+(i*5)%9;x<L;x+=11)g+=`<circle cx="${x}" cy="${c+((x*7)%3-1)*e.w*.2}" r=".3" fill="#444"/>`;});
  g+=`<line x1="0" x2="${L}" y1="0" y2="0" stroke="#b23a2e" stroke-width=".08" stroke-dasharray=".6 .35"/><line x1="0" x2="${L}" y1="${W}" y2="${W}" stroke="#b23a2e" stroke-width=".08" stroke-dasharray=".6 .35"/>`;
  if(V.sel>=0&&B[V.sel])g+=`<rect x="0" y="${B[V.sel].y0}" width="${L}" height="${B[V.sel].e.w}" fill="none" stroke="#2a6fb0" stroke-width=".15"/>`;
  return {g,vb:[-2,-10,L+4,W+20]};}
/* aksonometriya: x — koʻcha boʻylab (0…L), y — koʻndalang, z — yuqoriga */
function axoSVG(){const B=bounds(),W=S.W,L=40,th=[45,135,315,225][V.d]*Math.PI/180,sn=Math.sin(th),cs=Math.cos(th),K=.5,KZ=.82;
  const pr=(x,y,z)=>[x*cs-y*sn,(x*sn+y*cs)*K-z*KZ],dep=(x,y)=>x*sn+y*cs;
  const items=[];
  const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),r=Math.round(((n>>16)&255)*k),g=Math.round(((n>>8)&255)*k),b=Math.round((n&255)*k);return `rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;};
  function box(x0,x1,y0,y1,z0,z1,col,st,extra){const top=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(p=>pr(p[0],p[1],z1));
    let s=`<polygon points="${P(top)}" fill="${col}" stroke="${st||'#141414'}" stroke-width=".04"/>`;
    const sideX=sn>0?x1:x0,sideY=cs>0?y1:y0;
    const fx=[[sideX,y0,z0],[sideX,y1,z0],[sideX,y1,z1],[sideX,y0,z1]].map(p=>pr(...p)),fy=[[x0,sideY,z0],[x1,sideY,z0],[x1,sideY,z1],[x0,sideY,z1]].map(p=>pr(...p));
    s=`<polygon points="${P(fx)}" fill="${shade(col,.82)}" stroke="${st||'#141414'}" stroke-width=".04"/><polygon points="${P(fy)}" fill="${shade(col,.92)}" stroke="${st||'#141414'}" stroke-width=".04"/>`+s+(extra||'');
    const o={d:dep((x0+x1)/2,(y0+y1)/2),s};items.push(o);return o;}
  /* sirt boʻlaklari (pastda — birinchi chiziladi) */
  const ground=[];B.forEach(o=>{const z=lvl(o.e),c=DK[o.e.k].c,top=[[0,o.y0],[L,o.y0],[L,o.y1],[0,o.y1]].map(p=>pr(p[0],p[1],z));ground.push({d:dep(L/2,o.c),s:`<polygon points="${P(top)}" fill="${c}" stroke="#141414" stroke-width=".03"/>`});});
  /* binolar */
  const HL=S.hl*FH,HR=S.hr*FH;
  const wins=(x0,x1,y,h,dir)=>{let s='';const vis=(dir>0)===(cs<0);if(!vis)return '';for(let f=1;f<h/FH;f++)for(let x=x0+1.5;x<x1-1;x+=3){const q=[[x,y,f*FH+.9],[x+1.4,y,f*FH+.9],[x+1.4,y,f*FH+2.4],[x,y,f*FH+2.4]].map(p=>pr(...p));s+=`<polygon points="${P(q)}" fill="#c6d3dd"/>`;}return s;};
  const bl=HL?box(0,L,-10,0,0,HL,'#f2f0ea',null,wins(0,L,0,HL,1)):null,br=HR?box(0,L,W,W+10,0,HR,'#f2f0ea',null,wins(0,L,W,HR,-1)):null;
  /* yaqindagi bino koʻchani toʻsmasin: u eng oxirida, shaffof chiziladi; uzoqdagisi — eng birinchi */
  const nearL=dep(L/2,-5)>dep(L/2,W+5),nb=nearL?bl:br,fb=nearL?br:bl;
  if(fb)fb.d=-1e9;if(nb){nb.d=1e9;nb.s=`<g opacity=".28">${nb.s}</g>`;}
  /* obyektlar */
  B.forEach((o,i)=>{const e=o.e,k=e.k,c=o.c,z=lvl(e);
    if(k==='green'||k==='median')for(let x=4;x<L;x+=8){const r=Math.min(2.2,Math.max(1.1,e.w*.85)),[u,v]=pr(x,c,z+2.6+r),[u0,v0]=pr(x,c,z);items.push({d:dep(x,c)+.01,s:`<line x1="${u0}" y1="${v0}" x2="${u}" y2="${v+r*.6}" stroke="#6d5b45" stroke-width=".2"/><ellipse cx="${u}" cy="${v}" rx="${r}" ry="${r*1.05}" fill="#a9c98b" fill-opacity=".9" stroke="#6f9a52" stroke-width=".05"/>`});}
    if(k==='lane'||k==='turn')for(let x=6+(i*7)%9;x<L-5;x+=16)box(x,x+4.4,c-.9,c+.9,z,z+1.45,i%2?'#e9e6df':'#d6d1c6');
    if(k==='bus')box(14,26,c-1.25,c+1.25,z,z+3.1,'#e37a6c');
    if(k==='tram')box(10,30,c-1.3,c+1.3,z,z+3.5,'#ece7da');
    if(k==='park')for(let x=4;x<L-5;x+=6.5)box(x,x+4.6,c-.85,c+.85,z,z+1.4,'#cfcac0');
    if(k==='walk'||k==='shared')for(let x=3+(i*5)%7;x<L;x+=6){const yy=o.y0+e.w*(.3+((x*3)%5)/12),[u,v]=pr(x,yy,z),[u1,v1]=pr(x,yy,z+1.7);items.push({d:dep(x,yy),s:`<line x1="${u}" y1="${v}" x2="${u1}" y2="${v1}" stroke="#333" stroke-width=".22" stroke-linecap="round"/><circle cx="${u1}" cy="${v1-.15}" r=".16" fill="#333"/>`});}
    if(k==='furn')for(let x=5;x<L;x+=12){const [u,v]=pr(x,c,z),[u1,v1]=pr(x,c,z+6);items.push({d:dep(x,c),s:`<line x1="${u}" y1="${v}" x2="${u1}" y2="${v1}" stroke="#555" stroke-width=".08"/>`});}
    if(k==='bike')for(let x=12;x<L;x+=17){const [u,v]=pr(x,c,z+.4);items.push({d:dep(x,c),s:`<circle cx="${u}" cy="${v}" r=".35" fill="none" stroke="#2d6b4f" stroke-width=".07"/><circle cx="${u+.8}" cy="${v}" r=".35" fill="none" stroke="#2d6b4f" stroke-width=".07"/>`});}});
  ground.sort((a,b)=>a.d-b.d);items.sort((a,b)=>a.d-b.d);
  let g=ground.map(o=>o.s).join('')+items.map(o=>o.s).join('');
  /* koʻrinish chegarasi */
  const all=[[0,-10,0],[L,-10,0],[0,W+10,0],[L,W+10,0],[0,-10,HL],[L,W+10,HR],[0,W+10,HR],[L,-10,HL]].map(p=>pr(...p));
  const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys)-4,y1=Math.max(...ys)+2;
  return {g,vb:[x0-2,y0,x1-x0+4,y1-y0]};}
function renderView(){const r=V.v==='reja'?rejaSVG():V.v==='axo'?axoSVG():kesimSVG();
  if(!V.vb||V.vk!==V.v+V.d){V.vb=r.vb.slice();V.vk=V.v+V.d;}
  svg.setAttribute('viewBox',V.vb.join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.innerHTML=`<rect x="${V.vb[0]-1e4}" y="${V.vb[1]-1e4}" width="${2e4}" height="${2e4}" fill="#fbfaf8"/>`+r.g;
  $$('#svg [data-i]').forEach(n=>n.onclick=()=>{V.sel=+n.getAttribute('data-i');render();});}
/* gʻildirak — masshtab, sudrash — surish */
svg.addEventListener('wheel',e=>{e.preventDefault();if(!V.vb)return;const r=svg.getBoundingClientRect(),k=e.deltaY>0?1.12:1/1.12,s=Math.max(V.vb[2]/r.width,V.vb[3]/r.height);
  const mx=V.vb[0]+(e.clientX-r.left-(r.width-V.vb[2]/s)/2)*s,my=V.vb[1]+(e.clientY-r.top-(r.height-V.vb[3]/s)/2)*s;
  V.vb=[mx-(mx-V.vb[0])*k,my-(my-V.vb[1])*k,V.vb[2]*k,V.vb[3]*k];svg.setAttribute('viewBox',V.vb.join(' '));},{passive:false});
svg.addEventListener('pointerdown',e=>{if(e.target.hasAttribute('data-i'))return;const r=svg.getBoundingClientRect(),s=Math.max(V.vb[2]/r.width,V.vb[3]/r.height),x0=e.clientX,y0=e.clientY,vb0=V.vb.slice();svg.style.cursor='grabbing';
  const mv=m=>{V.vb=[vb0[0]-(m.clientX-x0)*s,vb0[1]-(m.clientY-y0)*s,vb0[2],vb0[3]];svg.setAttribute('viewBox',V.vb.join(' '));};
  const up=()=>{svg.style.cursor='';window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);});
svg.addEventListener('dblclick',()=>{V.vb=null;renderView();});

$$('#vSeg [data-v]').forEach(b=>b.onclick=()=>{V.v=b.dataset.v;V.vb=null;$$('#vSeg [data-v]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#dSeg').hidden=V.v!=='axo';renderView();});
$$('#dSeg [data-d]').forEach(b=>b.onclick=()=>{V.d=+b.dataset.d;V.vb=null;$$('#dSeg [data-d]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderView();});
$('#undo').onclick=undo;$('#redo').onclick=redo;
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if((e.key==='Delete'||e.key==='Backspace')&&V.sel>=0){e.preventDefault();act(()=>{S.st.splice(V.sel,1);V.sel=Math.min(V.sel,S.st.length-1);});}
  else if(e.key==='Escape'){V.sel=-1;render();}});

/* ---------- eksport ---------- */
function svgText(){const vb=V.vb||[0,0,100,50],w=1600,h=Math.round(w*vb[3]/vb[2]);return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb.join(' ')}">${svg.innerHTML}</svg>`;}
function dl(name,href){const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();}
function pngURL(){return new Promise((ok,no)=>{const s=svgText(),img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0);ok(c.toDataURL('image/png'));};img.onerror=no;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);});}
$('#exSvg').onclick=()=>dl('kocha-'+V.v+'.svg','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText()));
$('#exPng').onclick=()=>pngURL().then(u=>dl('kocha-'+V.v+'.png',u));
function matPut(o){return new Promise((res,rej)=>{const r=indexedDB.open('kps_mat',1);r.onupgradeneeded=()=>r.result.createObjectStore('mats',{keyPath:'id'});r.onsuccess=()=>{const t=r.result.transaction('mats','readwrite');t.objectStore('mats').put(o);t.oncomplete=res;t.onerror=()=>rej(t.error);};r.onerror=()=>rej(r.error);});}
$('#toAlb').onclick=()=>{const b=$('#toAlb');pngURL().then(src=>matPut({id:'ks'+Date.now().toString(36),kind:'png',name:T('Koʻcha')+' — '+T({kesim:'kesim',reja:'reja',axo:'aksonometriya'}[V.v])+` · ${fmt(S.W,1)} m`,src,thumb:src,aspect:(V.vb[2]/V.vb[3]),sub:S.st.map(e=>T(DK[e.k].n)+' '+fmt(e.w,2)).join(' · '),t:new Date().toISOString(),
  legend:[...new Set(S.st.map(e=>e.k))].map(k=>({col:DK[k].c,label:DK[k].n,kind:'fill',on:true}))})).then(()=>{b.textContent=T('Yuborildi ✓');setTimeout(()=>{b.textContent=T('Albomga →');},1800);}).catch(()=>{b.textContent=T('Xato');});};

function render(){$('#W').value=S.W;$('#hl').value=S.hl;$('#hr').value=S.hr;renderRow();renderProp();renderView();}
renderPal();render();
})();
