/* Archemistry Studio — AI hudud bahosi: 3D model va vektor illyustratsiya
   window.AI3D.open(ctx) — ctx: {D (LASTD), MX, MY, ULY, toast, putMat, mode, lv}
   Koʻrinish: izometrik (NW/NE/SW/SE), yuqoridan, koʻz sathi; perspektiva; soyalar.
   Qatlamlar: binolar, daraxtlar, koʻchalar, temir yoʻl, yashil, suv, ikonkalar (pin), tahlil qatlami, asos.
   Yuklab olish: SVG (vektor), PNG, OBJ+MTL, DXF (R12, 3DFACE), STL (3D bosma, mm), GLB, DAE (SketchUp). */
(function(){
'use strict';
const T=s=>window.kpsT?window.kpsT(s):s;
const J='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
const SRC={three:'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',orbit:J+'controls/OrbitControls.js',gltf:J+'exporters/GLTFExporter.js',dae:J+'exporters/ColladaExporter.js'};
const loaded={};
function load(k){if(loaded[k])return loaded[k];return loaded[k]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=SRC[k];s.onload=ok;s.onerror=()=>{delete loaded[k];no(new Error(SRC[k]+' yuklanmadi'));};document.head.appendChild(s);});}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PAL0={bg:'#f2efe8',ground:'#ddd7cb',base:'#bfb8a9',bld:'#ece7de',green:'#cbdcb0',water:'#a9c7d6',tree:'#7fae5a',road:'#faf9f6',major:'#f3e4c6',foot:'#e0d9ca',rail:'#6f6a63',edge:'#3a3a3a'};
const PRESET={none:{edges:0},thin:{edges:1,bld:'#f7f6f2'},bw:{edges:1,bg:'#ffffff',ground:'#ffffff',base:'#d8d8d8',bld:'#ffffff',green:'#ececec',water:'#d6d6d6',tree:'#a8a8a8',road:'#f7f7f7',major:'#e4e4e4',foot:'#eeeeee',rail:'#555555',edge:'#141414'}};
const SEQ=['#e8eef2','#c9d9e4','#9fbdd1','#6c98b8','#3d6f93'],USEC={res:'#ecd9a6',com:'#e6b3a0',off:'#e6b3a0',soc:'#b9cfdc',ind:'#cbb8d3',other:'#e6e0d6'};
const RW={motorway:24,trunk:22,primary:18,secondary:15,tertiary:11,unclassified:8,residential:8,living_street:6,service:4.5,pedestrian:6,track:3.5,footway:2.2,path:2,cycleway:2.4,steps:2,primary_link:8,secondary_link:7,tertiary_link:6,trunk_link:9,motorway_link:9};
const MAJ=/^(motorway|trunk|primary|secondary|motorway_link|trunk_link|primary_link)$/,FOOT=/^(footway|path|cycleway|steps|track|pedestrian)$/;
let S=null;

/* ---------------- geometriya ---------------- */
const pip=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){if(((r[i][1]>p[1])!==(r[j][1]>p[1]))&&(p[0]<(r[j][0]-r[i][0])*(p[1]-r[i][1])/(r[j][1]-r[i][1])+r[i][0]))c=!c;}return c;};
const sArea=r=>{let s=0;for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
const ccw=r=>sArea(r)<0?r.slice().reverse():r;
function isConvex(r){let sg=0;for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],c=r[(i+2)%r.length],z=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(z)<1e-9)continue;const s=Math.sign(z);if(sg&&s!==sg)return false;sg=s;}return true;}
function segX(a,b,c,d){const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-12)return null;const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;return t>0&&t<1&&u>=0&&u<=1?t:null;}
/* chiziqni ixtiyoriy koʻpburchak ichida kesish */
function clipLine(g,ring){const out=[];let cur=null;
  for(let i=1;i<g.length;i++){const a=g[i-1],b=g[i],ts=[0,1];for(let j=0;j<ring.length;j++){const t=segX(a,b,ring[j],ring[(j+1)%ring.length]);if(t!=null)ts.push(t);}ts.sort((x,y)=>x-y);
    for(let k=1;k<ts.length;k++){const t0=ts[k-1],t1=ts[k];if(t1-t0<1e-9)continue;const P=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],m=P((t0+t1)/2);
      if(pip(m,ring)){const p0=P(t0),p1=P(t1);if(cur&&Math.hypot(cur[cur.length-1][0]-p0[0],cur[cur.length-1][1]-p0[1])<1e-6)cur.push(p1);else{if(cur&&cur.length>1)out.push(cur);cur=[p0,p1];}}
      else{if(cur&&cur.length>1)out.push(cur);cur=null;}}}
  if(cur&&cur.length>1)out.push(cur);return out;}
/* koʻpburchakni qavariq chegara bilan kesish (Sutherland–Hodgman) */
function clipPoly(poly,ring,convex){if(!convex){const c=poly.reduce((s,p)=>[s[0]+p[0]/poly.length,s[1]+p[1]/poly.length],[0,0]);return pip(c,ring)?poly:null;}
  let out=poly;const n=ring.length;for(let i=0;i<n&&out.length;i++){const A=ring[i],B=ring[(i+1)%n],inn=p=>(B[0]-A[0])*(p[1]-A[1])-(B[1]-A[1])*(p[0]-A[0])>=0,inp=out;out=[];
    for(let k=0;k<inp.length;k++){const P=inp[k],Q=inp[(k+1)%inp.length],ip=inn(P),iq=inn(Q);if(ip)out.push(P);if(ip!==iq){const d1=[Q[0]-P[0],Q[1]-P[1]],d2=[B[0]-A[0],B[1]-A[1]],den=d1[0]*d2[1]-d1[1]*d2[0];if(Math.abs(den)>1e-12){const t=((A[0]-P[0])*d2[1]-(A[1]-P[1])*d2[0])/den;out.push([P[0]+d1[0]*t,P[1]+d1[1]*t]);}}}}
  return out.length>2?out:null;}
/* chiziq → lenta (koʻpburchaklar uchburchaklari) */
function ribbon(g,w,y,pos){const h=w/2,N=[];for(let i=0;i<g.length-1;i++){const dx=g[i+1][0]-g[i][0],dy=g[i+1][1]-g[i][1],l=Math.hypot(dx,dy)||1;N.push([-dy/l,dx/l]);}
  const L=[],R=[];for(let i=0;i<g.length;i++){const n1=N[Math.max(0,i-1)],n2=N[Math.min(N.length-1,i)];let nx=n1[0]+n2[0],ny=n1[1]+n2[1];const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;const k=Math.min(3,1/Math.max(.3,nx*n2[0]+ny*n2[1]));
    L.push([g[i][0]+nx*h*k,g[i][1]+ny*h*k]);R.push([g[i][0]-nx*h*k,g[i][1]-ny*h*k]);}
  for(let i=0;i<g.length-1;i++){const a=L[i],b=R[i],c=R[i+1],d=L[i+1];pos.push(a[0],y,-a[1],b[0],y,-b[1],c[0],y,-c[1],a[0],y,-a[1],c[0],y,-c[1],d[0],y,-d[1]);}
  return [L,R];}
function triPoly(poly,y,pos){const c=poly.map(p=>new THREE.Vector2(p[0],p[1]));let tr;try{tr=THREE.ShapeUtils.triangulateShape(c,[]);}catch(e){return;}tr.forEach(t=>t.forEach(i=>pos.push(poly[i][0],y,-poly[i][1])));}

/* ---------------- maʼlumot tayyorlash ---------------- */
function prep(ctx){const D=ctx.D,MX=ctx.MX,MY=ctx.MY,ringLL=D.ring,c0=ringLL.reduce((s,p)=>[s[0]+p[0]/ringLL.length,s[1]+p[1]/ringLL.length],[0,0]);
  const P=p=>[(p[1]-c0[1])*MX,(p[0]-c0[0])*MY];let ring=ccw(ringLL.map(P));if(ring.length>2&&Math.hypot(ring[0][0]-ring[ring.length-1][0],ring[0][1]-ring[ring.length-1][1])<.01)ring.pop();
  const convex=isConvex(ring),ins=p=>pip(p,ring),R=Math.max(...ring.map(p=>Math.hypot(p[0],p[1])));
  const use=t=>{const b=t.building||'';if(/^(apartments|residential|house|detached|semidetached_house|terrace|dormitory)$/.test(b))return 'res';if(/^(commercial|retail|supermarket|kiosk|hotel)$/.test(b)||t.shop)return 'com';if(b==='office'||t.office)return 'off';if(/^(school|kindergarten|university|college|hospital|clinic|public|civic|government|mosque|church)$/.test(b)||t.amenity)return 'soc';if(/^(industrial|warehouse|garages|garage|service)$/.test(b))return 'ind';return 'other';};
  const blds=[];((D.blds&&D.blds.elements)||[]).forEach(w=>{let g=(w.geometry||[]).map(q=>P([q.lat,q.lon]));if(g.length>3&&Math.hypot(g[0][0]-g[g.length-1][0],g[0][1]-g[g.length-1][1])<.01)g.pop();if(g.length<3)return;
    const c=g.reduce((s,p)=>[s[0]+p[0]/g.length,s[1]+p[1]/g.length],[0,0]);if(!ins(c))return;const t=w.tags||{},lv=parseFloat(t['building:levels']),hh=parseFloat(String(t.height||'').replace(',','.'));
    blds.push({g:ccw(g),c,lv:lv>0?lv:null,h:hh>0?hh:null,u:use(t)});});
  const roads={major:[],minor:[],foot:[]};let roadKm=0;
  ((D.roads&&D.roads.elements)||[]).forEach(w=>{const t=w.tags||{},h=t.highway;if(!RW[h]||t.tunnel==='yes')return;const g=(w.geometry||[]).map(q=>P([q.lat,q.lon]));
    clipLine(g,ring).forEach(pc=>{const cls=MAJ.test(h)?'major':FOOT.test(h)?'foot':'minor';roads[cls].push({g:pc,w:+t.width>0&&+t.width<40?+t.width:RW[h]});for(let i=1;i<pc.length;i++)roadKm+=Math.hypot(pc[i][0]-pc[i-1][0],pc[i][1]-pc[i-1][1])/1000;});});
  const Tn=D.T||{rail:[],runway:[],aero:[]},rails=[];Tn.rail.forEach(r=>{if(r.tun)return;clipLine(r.g.map(P),ring).forEach(pc=>rails.push({g:pc,w:r.k==='tram'?2.6:3.4,k:r.k}));});
  const runway=[];(Tn.runway||[]).forEach(g=>clipLine(g.map(P),ring).forEach(pc=>runway.push({g:pc,w:45})));
  const polys=list=>{const o=[];(list||[]).forEach(r=>{const g=(r.g||r).map(P);if(g.length<3)return;const c=clipPoly(ccw(g),ring,convex);if(c)o.push(c);});return o;};
  const green=polys(D.E&&D.E.green),water=polys(D.E&&D.E.water),aero=polys(Tn.aero);
  const canals=[];((D.E&&D.E.waterLine)||[]).forEach(g=>clipLine(g.map(P),ring).forEach(pc=>canals.push({g:pc,w:6})));
  const trees=[];((D.E&&D.E.trees)||[]).forEach(p=>{const q=P(p);if(ins(q))trees.push(q);});
  ((D.E&&D.E.treeRows)||[]).forEach(r=>{const g=r.map(P);for(let i=1;i<g.length;i++){const a=g[i-1],b=g[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<L;s+=7){const q=[a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L];if(ins(q))trees.push(q);}}});
  // ikonkalar: xaritada yoqilgan nuqta qatlamlari
  const pins=[],skip=new Set(['inter','trees','cross']);Object.values(ctx.ULY.LY).forEach(l=>{if(l.kind!=='pt'||!l.st.on||skip.has(l.id)||(l.data||[]).length>800)return;
    const icon=l.st.icon&&l.st.icon!=='dot'?l.st.icon:(l.icon||'dot');l.data.forEach(d=>{const p=d.p||d;if(!Array.isArray(p))return;const q=P(p);if(!ins(q))return;const col=l.colorFn?l.colorFn(d,l.st)||l.st.color:l.st.color;pins.push({x:q[0],y:q[1],col,icon,cat:l.name});});});
  // tahlil qatlamlari (rastr) — yer yuzasiga tekstura
  const rasters=Object.values(ctx.ULY.LY).filter(l=>l.kind==='raster'&&l.st.on).map(l=>{try{const r=l.render(l.st);return {url:r.url,b:r.bounds.map(P),op:+l.st.opacity,name:l.name};}catch(e){return null;}}).filter(Boolean);
  return {c0,ring,convex,R,blds,roads,rails,runway,green,water,aero,canals,trees,pins,rasters,roadKm,areaKm2:Math.abs(sArea(ring))/1e6};}

/* ---------------- interfeys ---------------- */
const CSS=`.a3{position:fixed;inset:0;z-index:3000;background:#f4f3f1;display:flex;flex-direction:column;font:14px Archivo,system-ui,sans-serif;color:#141414}
.a3 header{height:56px;flex:none;display:flex;align-items:center;gap:18px;padding:0 16px;border-bottom:1px solid #dedcd7}.a3 header h2{margin:0;font-size:19px;font-weight:500}
.a3 .st{display:flex;gap:22px;margin-left:auto;font-family:'IBM Plex Mono',monospace}.a3 .st div{display:flex;flex-direction:column;align-items:flex-end;font-size:11px;color:#696969;letter-spacing:.08em;text-transform:uppercase}.a3 .st b{font:500 19px Archivo,sans-serif;color:#141414;letter-spacing:0}
.a3 .x{border:1px solid #141414;background:none;height:30px;padding:0 12px;cursor:pointer;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase}
.a3 main{flex:1;display:grid;grid-template-columns:1fr 330px;min-height:0}.a3 .vw{position:relative;min-width:0;background:var(--bg3,#f2efe8)}.a3 canvas{display:block}
.a3 .hint3{position:absolute;left:12px;bottom:10px;font-size:12px;color:#696969;background:rgba(255,255,255,.8);padding:3px 8px}
.a3 aside{border-left:1px solid #dedcd7;background:#fff;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:12px}
.a3 .lb{font-size:11px;letter-spacing:.14em;color:#696969;text-transform:uppercase;margin-bottom:5px}
.a3 .g2{display:grid;grid-template-columns:1fr 1fr;gap:4px}.a3 .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.a3 .b{height:28px;border:1px solid #cfccc5;background:#fff;cursor:pointer;font-size:12.5px;padding:0 6px}.a3 .b[aria-pressed=true]{background:#141414;color:#fff;border-color:#141414}.a3 .b.dk{background:#141414;color:#fff;border-color:#141414}
.a3 .tg{display:flex;align-items:center;justify-content:space-between;font-size:13.5px;padding:3px 0}.a3 .tg input{margin:0}
.a3 .cl{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px}.a3 .cl label{display:flex;align-items:center;gap:6px;font-size:12.5px}.a3 .cl input{width:22px;height:18px;border:1px solid #cfccc5;padding:0}
.a3 .rw{display:grid;grid-template-columns:118px minmax(0,1fr) 34px;align-items:center;gap:6px;font-size:12.5px}.a3 .rw output{font:11.5px 'IBM Plex Mono',monospace;text-align:right}
.a3 .nt{font:11.5px/1.5 'IBM Plex Mono',monospace;color:#696969}
.a3 .dl{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.a3 .dl button{border:1px solid #cfccc5;background:#fff;cursor:pointer;text-align:left;padding:6px 7px;font-size:12.5px;line-height:1.2}.a3 .dl button small{display:block;color:#8a877f;font-size:11px}
.a3 .busy{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(244,243,241,.7);font-size:14px}
@media (max-width:860px){.a3 main{grid-template-columns:1fr;grid-template-rows:55% 45%}}`;

async function open(ctx){if(!document.getElementById('a3css')){const st=document.createElement('style');st.id='a3css';st.textContent=CSS;document.head.appendChild(st);}
  const ov=document.createElement('div');ov.className='a3';ov.innerHTML=`<header><h2>${T('3D model va vektor illyustratsiya')}</h2><span class="nt">${esc(ctx.mode||'')}</span><div class="st" id="a3st"></div><button class="x" id="a3x">${T('Yopish')} ✕</button></header>
  <main><div class="vw" id="a3v"><div class="busy" id="a3b">${T('3D kutubxona yuklanmoqda…')}</div><div class="hint3">${T('Sichqoncha: aylantirish · gʻildirak: yaqinlashtirish · oʻng tugma / Shift: surish')}</div></div><aside id="a3p"></aside></main>`;
  document.body.appendChild(ov);const close=()=>{if(S&&S.ren){S.ren.dispose();S.ren.forceContextLoss&&S.ren.forceContextLoss();}window.removeEventListener('resize',S&&S.onR);document.removeEventListener('keydown',key);ov.remove();S=null;};
  const key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);ov.querySelector('#a3x').onclick=close;
  try{await load('three');await load('orbit');}catch(e){ov.querySelector('#a3b').textContent=T('3D kutubxonani yuklab boʻlmadi')+': '+e.message;return;}
  let pal;try{pal=Object.assign({},PAL0,JSON.parse(localStorage.getItem('kps_a3_pal')||'{}'));}catch(e){pal=Object.assign({},PAL0);}
  let opt={view:'sw',persp:false,shadow:true,preset:'none',lay:{},bmode:'one',lv:ctx.lv||2,fh:3.2,pinH:45,pinS:1,stl:2000};try{Object.assign(opt,JSON.parse(localStorage.getItem('kps_a3_opt')||'{}'));}catch(e){}
  S={ctx,ov,pal,opt,data:prep(ctx)};S.opt.lay=Object.assign({bld:1,tree:1,road:1,rail:1,green:1,water:1,pins:1,ras:0,base:1,legend:1},S.opt.lay||{});
  const d=S.data;ov.querySelector('#a3st').innerHTML=[['Binolar',d.blds.length],['Koʻchalar, km',d.roadKm.toFixed(1)],['Daraxtlar',d.trees.length],['Ikonkalar',d.pins.length],['Maydon, km²',d.areaKm2.toFixed(2)]].map(([n,v])=>`<div>${T(n)}<b>${v}</b></div>`).join('');
  initGL();buildAll();panel();setView(S.opt.view,true);ov.querySelector('#a3b').remove();}
const saveOpt=()=>{try{localStorage.setItem('kps_a3_opt',JSON.stringify(S.opt));localStorage.setItem('kps_a3_pal',JSON.stringify(S.pal));}catch(e){}};

function panel(){const o=S.opt,p=S.pal,el=S.ov.querySelector('#a3p');const L=o.lay;
  const tg=(k,n)=>`<label class="tg"><span>${T(n)}</span><input type="checkbox" data-ly="${k}" ${L[k]?'checked':''}></label>`;
  el.innerHTML=`<div><div class="lb">${T('Koʻrinish')}</div><div class="g2">${[['nw','NW iso'],['ne','NE iso'],['sw','SW iso'],['se','SE iso'],['top','Yuqoridan'],['eye','Koʻz sathi']].map(([k,n])=>`<button class="b" data-vw="${k}" aria-pressed="${o.view===k}">${T(n)}</button>`).join('')}</div>
    <label class="tg"><span>${T('Perspektiva')}</span><input type="checkbox" id="a3pp" ${o.persp?'checked':''}></label><label class="tg"><span>${T('Soyalar')}</span><input type="checkbox" id="a3sh" ${o.shadow?'checked':''}></label></div>
  <div><div class="lb">${T('Grafika')}</div><div class="g3">${[['none','Konturiz'],['thin','Ingichka kontur'],['bw','Oq-qora']].map(([k,n])=>`<button class="b" data-pr="${k}" aria-pressed="${o.preset===k}">${T(n)}</button>`).join('')}</div></div>
  <div><div class="lb">${T('Qatlamlar')}</div>${tg('bld','Binolar')}${tg('tree','Daraxtlar')}${tg('road','Koʻchalar')}${tg('rail','Temir yoʻl, aeroport')}${tg('green','Yashil hududlar')}${tg('water','Suv')}${tg('pins','Ikonkalar (ustunda)')}${S.data.rasters.length?tg('ras','Tahlil qatlami (yerda)'):''}${tg('base','Asos (plita)')}${tg('legend','Legenda (SVG)')}</div>
  <div><div class="lb">${T('Binolar')}</div><div class="g3">${[['one','Bir rang'],['lv','Qavatlar'],['use','Funksiya']].map(([k,n])=>`<button class="b" data-bm="${k}" aria-pressed="${o.bmode===k}">${T(n)}</button>`).join('')}</div>
    <div class="rw" style="margin-top:6px"><span>${T('Tegsiz bino, qavat')}</span><input type="range" min="1" max="9" step="1" id="a3lv" value="${o.lv}"><output>${o.lv}</output></div>
    <div class="rw"><span>${T('Qavat balandligi, m')}</span><input type="range" min="2.7" max="4.5" step=".1" id="a3fh" value="${o.fh}"><output>${o.fh}</output></div></div>
  <div><div class="lb">${T('Ikonkalar')}</div><div class="rw"><span>${T('Ustun balandligi, m')}</span><input type="range" min="0" max="150" step="5" id="a3ph" value="${o.pinH}"><output>${o.pinH}</output></div>
    <div class="rw"><span>${T('Oʻlchami')}</span><input type="range" min=".5" max="2.5" step=".1" id="a3ps" value="${o.pinS}"><output>${o.pinS}</output></div><div class="nt">${T('Xaritada yoqilgan nuqta qatlamlari (bekat, maktab, kafe…) ustunga koʻtariladi.')}</div></div>
  <div><div class="lb">${T('Ranglar')}</div><div class="cl">${[['bg','Fon'],['ground','Yer'],['base','Asos'],['bld','Binolar'],['green','Yashil'],['water','Suv'],['tree','Daraxtlar'],['road','Koʻchalar'],['major','Magistral'],['foot','Piyoda yoʻli'],['rail','Temir yoʻl'],['edge','Kontur']].map(([k,n])=>`<label><input type="color" data-pc="${k}" value="${p[k]}">${T(n)}</label>`).join('')}</div><button class="b" id="a3rc" style="margin-top:6px;width:100%">${T('Ranglarni tiklash')}</button></div>
  <div><div class="lb">${T('Yuklab olish')}</div><div class="dl">
    <button data-ex="svg">${T('Vektor')}<small>.svg</small></button><button data-ex="png">${T('Rasm')}<small>.png · 2×</small></button><button data-ex="alb">${T('Albomga')}<small>SVG →</small></button>
    <button data-ex="obj">Rhino, ArchiCAD<small>.obj + .mtl</small></button><button data-ex="dxf">AutoCAD<small>.dxf · 3D</small></button><button data-ex="dae">SketchUp<small>.dae</small></button>
    <button data-ex="glb">Blender, web<small>.glb</small></button><button data-ex="stl">${T('3D bosma')}<small>.stl · mm</small></button><select id="a3stl" class="b" title="${T('STL masshtabi')}">${[1000,2000,5000,10000].map(v=>`<option value="${v}" ${+o.stl===v?'selected':''}>1:${v}</option>`).join('')}</select></div>
    <div class="nt" style="margin-top:6px">${T('Koordinatalar — metrda, hudud markazidan (X — sharq, Y — shimol, Z — balandlik). Balandlik: OSM building:levels yoki height; teg yoʻq binolar — yuqoridagi qavat soni. Relyef hisobga olinmagan. Manba: © OpenStreetMap.')}</div></div>`;
  el.querySelectorAll('[data-vw]').forEach(b=>b.onclick=()=>{setView(b.dataset.vw);});
  el.querySelector('#a3pp').onchange=e=>{o.persp=e.target.checked;setView(o.view);};
  el.querySelector('#a3sh').onchange=e=>{o.shadow=e.target.checked;applyShadow();saveOpt();render();};
  el.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{o.preset=b.dataset.pr;const pr=PRESET[o.preset];Object.assign(S.pal,PAL0,pr);delete S.pal.edges;restyle();panel();saveOpt();});
  el.querySelectorAll('[data-ly]').forEach(i=>i.onchange=()=>{L[i.dataset.ly]=i.checked?1:0;vis();saveOpt();render();});
  el.querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>{o.bmode=b.dataset.bm;buildBlds();panel();saveOpt();render();});
  const rng=(id,k,fn)=>{const i=el.querySelector(id);i.oninput=()=>{o[k]=+i.value;i.nextElementSibling.textContent=i.value;fn();render();};i.onchange=saveOpt;};
  rng('#a3lv','lv',buildBlds);rng('#a3fh','fh',buildBlds);rng('#a3ph','pinH',buildPins);rng('#a3ps','pinS',buildPins);
  el.querySelectorAll('[data-pc]').forEach(i=>i.oninput=()=>{S.pal[i.dataset.pc]=i.value;restyle();saveOpt();});
  el.querySelector('#a3rc').onclick=()=>{S.pal=Object.assign({},PAL0,PRESET[o.preset]);delete S.pal.edges;restyle();panel();saveOpt();};
  el.querySelector('#a3stl').onchange=e=>{o.stl=+e.target.value;saveOpt();};
  el.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>doExport(b.dataset.ex).catch(e=>S.ctx.toast(T('Eksport bajarilmadi')+': '+(e.message||e))));
  if(window.kpsT&&window.KPS_LANG&&window.KPS_LANG!=='uz'){/* i18n kuzatuvchisi matnni tarjima qiladi */}}

/* ---------------- WebGL sahna ---------------- */
function initGL(){const v=S.ov.querySelector('#a3v'),W=v.clientWidth,H=v.clientHeight;
  const ren=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setPixelRatio(Math.min(2,devicePixelRatio||1));ren.setSize(W,H);ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;v.prepend(ren.domElement);
  const sc=new THREE.Scene();S.ren=ren;S.sc=sc;
  sc.add(new THREE.HemisphereLight(0xffffff,0xc9c3b6,.6));const sun=new THREE.DirectionalLight(0xffffff,.55);const R=S.data.R;sun.position.set(-R*.8,R*1.4,R*.5);sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);const c=sun.shadow.camera;c.left=-R*1.3;c.right=R*1.3;c.top=R*1.3;c.bottom=-R*1.3;c.near=1;c.far=R*5;sun.shadow.bias=-.0004;sun.shadow.normalBias=.6;sc.add(sun);sc.add(sun.target);S.sun=sun;
  S.root=new THREE.Group();sc.add(S.root);
  S.onR=()=>{if(!S)return;const W2=v.clientWidth,H2=v.clientHeight;ren.setSize(W2,H2);fitCam();render();};window.addEventListener('resize',S.onR);}
function fitCam(){const v=S.ov.querySelector('#a3v'),a=v.clientWidth/Math.max(1,v.clientHeight),R=S.data.R*1.12,cam=S.cam;if(!cam)return;
  if(cam.isOrthographicCamera){cam.left=-R*a;cam.right=R*a;cam.top=R;cam.bottom=-R;}else cam.aspect=a;cam.updateProjectionMatrix();}
function setView(k,first){const o=S.opt;o.view=k;saveOpt();const R=S.data.R,eye=k==='eye';const persp=o.persp||eye;
  const cam=persp?new THREE.PerspectiveCamera(eye?55:30,1,1,R*40):new THREE.OrthographicCamera(-1,1,1,-1,-R*20,R*20);S.cam=cam;fitCam();
  const dir={nw:[-1,1,-1],ne:[1,1,-1],sw:[-1,1,1],se:[1,1,1],top:[0,1,.001],eye:[-1,.05,1]}[k]||[-1,1,1],dv=new THREE.Vector3(...dir).normalize();
  const dist=persp?(eye?R*.9:R/Math.tan(15*Math.PI/180)*1.15):R*4;cam.position.copy(dv.multiplyScalar(dist));if(eye)cam.position.y=Math.max(cam.position.y,1.7*6);
  const tgt=new THREE.Vector3(0,eye?6:0,0);cam.lookAt(tgt);if(S.ctl)S.ctl.dispose();const ctl=new THREE.OrbitControls(cam,S.ren.domElement);ctl.target.copy(tgt);ctl.enableDamping=false;ctl.screenSpacePanning=true;ctl.maxPolarAngle=Math.PI*.495;
  ctl.addEventListener('change',render);ctl.update();S.ctl=ctl;S.ov.querySelectorAll('[data-vw]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.vw===k));render();}
function render(){if(S&&S.ren&&S.cam){const cam=S.cam;// ikonkalar ekranda doimiy oʻlchamda
    if(S.gPin){const f=.034*S.opt.pinS,v=new THREE.Vector3();S.gPin.children.forEach(o=>{if(!o.isSprite)return;const k=cam.isOrthographicCamera?f*(cam.top-cam.bottom)/cam.zoom:f*2*Math.tan(cam.fov*Math.PI/360)*v.copy(o.position).sub(cam.position).length();o.scale.set(k,k,1);});}
    S.ren.setClearColor(S.pal.bg);S.ren.render(S.sc,cam);}}
const MAT={};
function mat(k,col,extra){const m=MAT[k]||(MAT[k]=new THREE.MeshLambertMaterial(Object.assign({side:THREE.DoubleSide},extra||{})));m.color.set(col);return m;}
function geo(pos,cols){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(cols)g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();return g;}
function grp(name){if(S[name]){S.root.remove(S[name]);S[name].traverse(o=>{if(o.geometry)o.geometry.dispose();});}const g=new THREE.Group();g.name=name;S.root.add(g);S[name]=g;return g;}
function buildAll(){buildGround();buildFlat();buildBlds();buildTrees();buildPins();applyShadow();vis();}
function buildGround(){const d=S.data,g=grp('gBase'),sh=new THREE.Shape(d.ring.map(p=>new THREE.Vector2(p[0],p[1])));
  const ex=new THREE.ExtrudeGeometry(sh,{depth:8,bevelEnabled:false,curveSegments:1});ex.rotateX(-Math.PI/2);ex.translate(0,-8,0);
  const m=new THREE.Mesh(ex,[mat('ground',S.pal.ground),mat('base',S.pal.base)]);m.receiveShadow=true;m.name='asos';g.add(m);
  // tahlil qatlamlari — yer teksturasi
  const gr=grp('gRas');if(d.rasters.length){const xs=d.ring.map(p=>p[0]),ys=d.ring.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),K=Math.min(4,3000/Math.max(x1-x0,y1-y0));
    const cv=document.createElement('canvas');cv.width=Math.round((x1-x0)*K);cv.height=Math.round((y1-y0)*K);const c=cv.getContext('2d');S.rasBox={x0,x1,y0,y1,cv};
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;const sg=new THREE.ShapeGeometry(sh);const uv=sg.attributes.uv,pp=sg.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pp.getX(i)-x0)/(x1-x0),(pp.getY(i)-y0)/(y1-y0));sg.rotateX(-Math.PI/2);sg.translate(0,.2,0);
    const mm=new THREE.Mesh(sg,new THREE.MeshLambertMaterial({map:tex,transparent:true,depthWrite:false}));mm.receiveShadow=true;mm.name='tahlil';gr.add(mm);
    let n=0;d.rasters.forEach(r=>{const im=new Image();im.onload=()=>{c.globalAlpha=r.op;const bx0=r.b[0][0],by0=r.b[0][1],bx1=r.b[1][0],by1=r.b[1][1];c.drawImage(im,(bx0-x0)*K,(y1-by1)*K,(bx1-bx0)*K,(by1-by0)*K);tex.needsUpdate=true;if(++n===d.rasters.length)render();};im.src=r.url;});}}
function buildFlat(){const d=S.data,g=grp('gFlat');const add=(pos,k,col,name,lay)=>{if(!pos.length)return;const m=new THREE.Mesh(geo(pos),mat(k,col,{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));m.receiveShadow=true;m.name=name;m.userData.lay=lay;g.add(m);};
  let p=[];d.green.forEach(q=>triPoly(q,.05,p));add(p,'green',S.pal.green,'yashil','green');
  p=[];d.aero.forEach(q=>triPoly(q,.04,p));add(p,'aero',S.pal.foot,'aeroport','rail');
  p=[];d.water.forEach(q=>triPoly(q,.08,p));d.canals.forEach(r=>ribbon(r.g,r.w,.08,p));add(p,'water',S.pal.water,'suv','water');
  p=[];d.roads.foot.forEach(r=>ribbon(r.g,r.w,.1,p));add(p,'foot',S.pal.foot,'piyoda_yollari','road');
  p=[];d.roads.minor.forEach(r=>ribbon(r.g,r.w,.12,p));add(p,'road',S.pal.road,'kochalar','road');
  p=[];d.roads.major.forEach(r=>ribbon(r.g,r.w,.14,p));add(p,'major',S.pal.major,'magistrallar','road');
  p=[];d.runway.forEach(r=>ribbon(r.g,r.w,.13,p));add(p,'runway',S.pal.major,'uchish_yolagi','rail');
  p=[];d.rails.forEach(r=>ribbon(r.g,r.w,.18,p));add(p,'rail',S.pal.rail,'temir_yol','rail');}
function bHeight(b){return b.h||(b.lv||S.opt.lv)*S.opt.fh;}
function hexRGB(h){const c=new THREE.Color(h);return [c.r,c.g,c.b];}
function bColor(b){const m=S.opt.bmode;if(m==='lv'){const l=b.lv;if(!l)return S.pal.bld;return SEQ[l<=2?0:l<=5?1:l<=9?2:l<=16?3:4];}if(m==='use')return USEC[b.u]||S.pal.bld;return S.pal.bld;}
function buildBlds(){const g=grp('gBld'),pos=[],col=[],ed=[];S.data.blds.forEach(b=>{const h=bHeight(b),r=b.g,c=hexRGB(bColor(b));const n0=pos.length;
    const tri=THREE.ShapeUtils.triangulateShape(r.map(p=>new THREE.Vector2(p[0],p[1])),[]);tri.forEach(t=>t.forEach(i=>pos.push(r[i][0],h,-r[i][1])));
    for(let i=0;i<r.length;i++){const a=r[i],q=r[(i+1)%r.length];pos.push(a[0],0,-a[1],q[0],0,-q[1],q[0],h,-q[1],a[0],0,-a[1],q[0],h,-q[1],a[0],h,-a[1]);ed.push(a[0],h,-a[1],q[0],h,-q[1],a[0],0,-a[1],a[0],h,-a[1],a[0],0,-a[1],q[0],0,-q[1]);}
    for(let i=n0;i<pos.length;i+=3)col.push(...c);});
  if(!pos.length)return;const m=new THREE.Mesh(geo(pos,col),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));m.castShadow=true;m.receiveShadow=true;m.name='binolar';m.userData.lay='bld';g.add(m);
  const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(ed,3));const e=new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:S.pal.edge,transparent:true,opacity:S.opt.preset==='bw'?.9:.55}));e.name='kontur';e.userData.lay='bld';e.userData.edge=1;g.add(e);vis();}
function buildTrees(){const g=grp('gTree'),t=S.data.trees;if(!t.length)return;const cr=new THREE.IcosahedronGeometry(1,1),tr=new THREE.CylinderGeometry(.18,.25,1,6);
  const mc=new THREE.InstancedMesh(cr,mat('tree',S.pal.tree,{side:THREE.FrontSide}),t.length),mt=new THREE.InstancedMesh(tr,mat('trunk','#8a7a62',{side:THREE.FrontSide}),t.length),M=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
  t.forEach((p,i)=>{const h=((Math.abs(p[0]*7.3+p[1]*3.1))%1)*.5+.8,r=3*h;M.compose(new THREE.Vector3(p[0],2.6*h+r*.8,-p[1]),q,sc.set(r,r*.95,r));mc.setMatrixAt(i,M);M.compose(new THREE.Vector3(p[0],1.6*h,-p[1]),q,sc.set(1,3.2*h,1));mt.setMatrixAt(i,M);});
  mc.castShadow=mt.castShadow=true;mc.name='daraxtlar';mt.name='tanalar';g.add(mc,mt);}
const ICT={};
function iconTex(col,icon){const k=col+icon;if(ICT[k])return ICT[k];const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  c.beginPath();c.arc(64,64,58,0,7);c.fillStyle=col;c.fill();c.lineWidth=7;c.strokeStyle='#fff';c.stroke();const IC=(S.ctx.ULY.IC||{})[icon];
  if(IC){c.save();c.translate(64-36,64-36);c.scale(3,3);c.fillStyle='#fff';c.fill(new Path2D(IC),'evenodd');c.restore();}else{c.beginPath();c.arc(64,64,16,0,7);c.fillStyle='#fff';c.fill();}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return ICT[k]=t;}
function buildPins(){const g=grp('gPin'),d=S.data;if(!d.pins.length)return;const H=S.opt.pinH,ln=[];
  d.pins.forEach(p=>{const top=H+((p.x*13.7+p.y*7.1)%1+1)%1*H*.25;p.top=top;if(H>0)ln.push(p.x,0,-p.y,p.x,top,-p.y);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(p.col,p.icon),depthTest:true}));s.position.set(p.x,top,-p.y);s.renderOrder=10;g.add(s);});
  if(ln.length){const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(ln,3));g.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:'#555555',transparent:true,opacity:.7})));}
  vis();}
function applyShadow(){S.ren.shadowMap.enabled=!!S.opt.shadow;S.sun.castShadow=!!S.opt.shadow;S.root.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.needsUpdate=true);}});}
function vis(){if(!S)return;const L=S.opt.lay;if(S.gBld)S.gBld.children.forEach(o=>o.visible=!!L.bld&&(!o.userData.edge||PRESET[S.opt.preset].edges===1));if(S.gTree)S.gTree.visible=!!L.tree;if(S.gPin)S.gPin.visible=!!L.pins;if(S.gRas)S.gRas.visible=!!L.ras;
  if(S.gFlat)S.gFlat.children.forEach(m=>m.visible=!!L[m.userData.lay]);if(S.gBase)S.gBase.children.forEach(m=>{m.material[1].visible=!!L.base;});}
function restyle(){const p=S.pal;['ground','base','green','water','foot','road','major','rail','tree'].forEach(k=>{if(MAT[k])MAT[k].color.set(p[k]);});if(MAT.runway)MAT.runway.color.set(p.major);if(MAT.aero)MAT.aero.color.set(p.foot);buildBlds();render();}

/* ---------------- eksport ---------------- */
function dl(name,data,type){const b=data instanceof Blob?data:new Blob([data],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
const fname=ext=>'archemistry-3d-'+new Date().toISOString().slice(0,10)+'.'+ext;
/* eksport uchun oddiy meshlar (instanslar birlashtiriladi, faqat koʻrinadiganlar) */
function exportMeshes(){const out=[];S.root.updateMatrixWorld(true);S.root.traverse(o=>{if(!o.visible)return;let p=o;while(p){if(!p.visible)return;p=p.parent;}
    if(o.isInstancedMesh){const base=o.geometry.index?o.geometry.toNonIndexed():o.geometry,pa=base.attributes.position,pos=[],M=new THREE.Matrix4(),v=new THREE.Vector3();
      for(let i=0;i<o.count;i++){o.getMatrixAt(i,M);for(let j=0;j<pa.count;j++){v.fromBufferAttribute(pa,j).applyMatrix4(M);pos.push(v.x,v.y,v.z);}}out.push({name:o.name,pos,color:o.material.color.getHexString()});return;}
    if(o.isMesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry,pa=g.attributes.position,pos=[],v=new THREE.Vector3();
      if(Array.isArray(o.material)){// ExtrudeGeometry: guruhlar (yuz / yon)
        o.geometry.groups.forEach((gr,gi)=>{if(!o.material[gr.materialIndex].visible)return;const ia=o.geometry.index,pp=[];for(let k=gr.start;k<gr.start+gr.count;k++){const vi=ia?ia.getX(k):k;v.fromBufferAttribute(o.geometry.attributes.position,vi).applyMatrix4(o.matrixWorld);pp.push(v.x,v.y,v.z);}out.push({name:o.name+(gi?'_yon':'_yuz'),pos:pp,color:o.material[gr.materialIndex].color.getHexString()});});return;}
      for(let j=0;j<pa.count;j++){v.fromBufferAttribute(pa,j).applyMatrix4(o.matrixWorld);pos.push(v.x,v.y,v.z);}out.push({name:o.name,pos,color:o.material.color?o.material.color.getHexString():'dddddd',vcol:o.material.vertexColors&&g.attributes.color?g.attributes.color.array:null});}});return out;}
function toOBJ(){const ms=exportMeshes();let obj='# Archemistry Studio — 3D hudud modeli (metr, Y — yuqoriga)\n# © OpenStreetMap hissadorlari\nmtllib '+fname('mtl')+'\n',mtl='',vi=1;
  ms.forEach((m,k)=>{const mn=m.name+'_'+k;mtl+=`newmtl ${mn}\nKd ${m.color.match(/../g).map(h=>(parseInt(h,16)/255).toFixed(3)).join(' ')}\nKa 0 0 0\nd 1\n\n`;obj+=`o ${m.name}\nusemtl ${mn}\n`;
    for(let i=0;i<m.pos.length;i+=3)obj+=`v ${m.pos[i].toFixed(3)} ${m.pos[i+1].toFixed(3)} ${m.pos[i+2].toFixed(3)}`+(m.vcol?` ${m.vcol[i].toFixed(3)} ${m.vcol[i+1].toFixed(3)} ${m.vcol[i+2].toFixed(3)}`:'')+'\n';
    for(let i=0;i<m.pos.length/3;i+=3)obj+=`f ${vi+i} ${vi+i+1} ${vi+i+2}\n`;vi+=m.pos.length/3;});return {obj,mtl};}
function toSTL(scale){const ms=exportMeshes().filter(m=>/^(asos|binolar|daraxtlar|tanalar)/.test(m.name)),k=1000/scale;let n=0;ms.forEach(m=>n+=m.pos.length/9);
  const buf=new ArrayBuffer(84+n*50),dv=new DataView(buf);dv.setUint32(80,n,true);let o=84;
  ms.forEach(m=>{const p=m.pos;for(let i=0;i<p.length;i+=9){const A=[p[i],-p[i+2],p[i+1]],B=[p[i+3],-p[i+5],p[i+4]],C=[p[i+6],-p[i+8],p[i+7]];// Z — yuqoriga
      const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],w=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],N=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...N)||1;
      [N[0]/l,N[1]/l,N[2]/l,...A.map(x=>x*k),...B.map(x=>x*k),...C.map(x=>x*k)].forEach(v=>{dv.setFloat32(o,v,true);o+=4;});dv.setUint16(o,0,true);o+=2;}});return buf;}
function toDXF(){const d=S.data,L=S.opt.lay;let s='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n9\n';
  const LY=[['CHEGARA',7],['BINOLAR',8],['YASHIL',3],['SUV',5],['KOCHA_OQ',9],['TEMIR_YOL',1],['DARAXT',94],['IKONKA',6],['ASOS',8]];LY.forEach(([n,c])=>s+=`0\nLAYER\n2\n${n}\n70\n0\n62\n${c}\n6\nCONTINUOUS\n`);s+='0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  const f=v=>(+v).toFixed(3),pl=(ly,g,closed,z=0)=>{s+=`0\nPOLYLINE\n8\n${ly}\n66\n1\n70\n${closed?1:0}\n10\n0\n20\n0\n30\n${f(z)}\n`;g.forEach(p=>s+=`0\nVERTEX\n8\n${ly}\n10\n${f(p[0])}\n20\n${f(p[1])}\n30\n${f(z)}\n`);s+='0\nSEQEND\n';};
  const face=(ly,a,b,c,e)=>{e=e||c;s+=`0\n3DFACE\n8\n${ly}\n10\n${f(a[0])}\n20\n${f(a[1])}\n30\n${f(a[2])}\n11\n${f(b[0])}\n21\n${f(b[1])}\n31\n${f(b[2])}\n12\n${f(c[0])}\n22\n${f(c[1])}\n32\n${f(c[2])}\n13\n${f(e[0])}\n23\n${f(e[1])}\n33\n${f(e[2])}\n`;};
  pl('CHEGARA',d.ring,true);
  if(L.bld)d.blds.forEach(b=>{const h=bHeight(b),r=b.g;pl('BINOLAR',r,true,0);pl('BINOLAR',r,true,h);
    THREE.ShapeUtils.triangulateShape(r.map(p=>new THREE.Vector2(p[0],p[1])),[]).forEach(t=>face('BINOLAR',[...r[t[0]],h],[...r[t[1]],h],[...r[t[2]],h]));
    for(let i=0;i<r.length;i++){const a=r[i],q=r[(i+1)%r.length];face('BINOLAR',[a[0],a[1],0],[q[0],q[1],0],[q[0],q[1],h],[a[0],a[1],h]);}});
  if(L.green)d.green.forEach(g=>pl('YASHIL',g,true));if(L.water){d.water.forEach(g=>pl('SUV',g,true));d.canals.forEach(r=>pl('SUV',r.g,false));}
  if(L.road)['major','minor','foot'].forEach(k=>d.roads[k].forEach(r=>pl('KOCHA_OQ',r.g,false)));if(L.rail){d.rails.forEach(r=>pl('TEMIR_YOL',r.g,false));d.runway.forEach(r=>pl('TEMIR_YOL',r.g,false));}
  if(L.tree)d.trees.forEach(p=>s+=`0\nCIRCLE\n8\nDARAXT\n10\n${f(p[0])}\n20\n${f(p[1])}\n30\n0\n40\n2.5\n`);
  if(L.pins)d.pins.forEach(p=>{s+=`0\nPOINT\n8\nIKONKA\n10\n${f(p.x)}\n20\n${f(p.y)}\n30\n0\n`;s+=`0\nTEXT\n8\nIKONKA\n10\n${f(p.x+3)}\n20\n${f(p.y+3)}\n30\n0\n40\n3\n1\n${String(p.cat).replace(/[^\x20-\x7EЀ-ӿ]/g,'')}\n`;});
  return s+'0\nENDSEC\n0\nEOF\n';}
/* vektor illyustratsiya: joriy kamera boʻyicha proyeksiya, uzoqdan yaqinga boʻyash */
function toSVG(){const cam=S.cam,v=S.ov.querySelector('#a3v'),W=1800,H=Math.round(W*v.clientHeight/Math.max(1,v.clientWidth)),d=S.data,L=S.opt.lay,p=S.pal,edges=PRESET[S.opt.preset].edges===1;
  cam.updateMatrixWorld();const V=new THREE.Vector3(),pr=(x,y,z)=>{V.set(x,y,z).project(cam);return [(V.x+1)/2*W,(1-V.y)/2*H];},vz=(x,y,z)=>{V.set(x,y,z).applyMatrix4(cam.matrixWorldInverse);return V.z;};
  const P2=(pts,y)=>pts.map(q=>pr(q[0],y,-q[1]).map(n=>n.toFixed(1)).join(' ')).join('L');
  const sw=edges?` stroke="${p.edge}" stroke-width=".45" stroke-linejoin="round"`:'';let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Archivo, sans-serif"><rect width="${W}" height="${H}" fill="${p.bg}"/>`;
  const ringD='M'+P2(d.ring,0)+'Z';
  // asos (plita) yon devorlari
  if(L.base){const r=d.ring;for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],n3=new THREE.Vector3(b[1]-a[1],0,b[0]-a[0]),cd=new THREE.Vector3();cam.getWorldDirection(cd);if(n3.dot(cd)>=0)continue;
      s+=`<path d="M${P2([a,b],0)}L${P2([b,a],-8)}Z" fill="${shade(p.base,.86)}"/>`;}}
  s+=`<defs><clipPath id="rg"><path d="${ringD}"/></clipPath></defs><path d="${ringD}" fill="${p.ground}"/><g clip-path="url(#rg)">`;
  // tahlil qatlami (faqat ortografik koʻrinishda — affin akslantirish)
  if(L.ras&&S.rasBox&&cam.isOrthographicCamera){const b=S.rasBox,o=pr(b.x0,0,-b.y1),ex=pr(b.x1,0,-b.y1),ey=pr(b.x0,0,-b.y0),cw=b.cv.width,ch=b.cv.height;
    s+=`<image href="${b.cv.toDataURL('image/png')}" width="${cw}" height="${ch}" transform="matrix(${((ex[0]-o[0])/cw).toFixed(5)} ${((ex[1]-o[1])/cw).toFixed(5)} ${((ey[0]-o[0])/ch).toFixed(5)} ${((ey[1]-o[1])/ch).toFixed(5)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})" preserveAspectRatio="none"/>`;}
  const flat=(list,col,y)=>list.forEach(g=>s+=`<path d="M${P2(g,y)}Z" fill="${col}"/>`);
  const rib=(list,col,y)=>list.forEach(r=>{const pos=[];const [Lf,Rt]=ribbon(r.g,r.w,y,pos);s+=`<path d="M${P2(Lf,y)}L${P2(Rt.slice().reverse(),y)}Z" fill="${col}"/>`;});
  if(L.green)flat(d.green,p.green,.05);if(L.rail)flat(d.aero,p.foot,.04);if(L.water){flat(d.water,p.water,.08);rib(d.canals,p.water,.08);}
  if(L.road){rib(d.roads.foot,p.foot,.1);rib(d.roads.minor,p.road,.12);rib(d.roads.major,p.major,.14);}if(L.rail){rib(d.runway,p.major,.13);rib(d.rails,p.rail,.18);}
  s+='</g>';
  // hajmlar: binolar (tom va koʻrinadigan devorlar), daraxtlar — chuqurlik boʻyicha
  const prims=[],lt=new THREE.Vector3(-.8,0,.5).normalize(),camDir=new THREE.Vector3();cam.getWorldDirection(camDir);
  if(L.bld)d.blds.forEach(b=>{const h=bHeight(b),r=b.g,col=bColor(b);
    for(let i=0;i<r.length;i++){const a=r[i],q=r[(i+1)%r.length],nx=q[1]-a[1],nz=(q[0]-a[0]),nl=Math.hypot(nx,nz)||1;// devor normali (three: x, -y)
      const n3=new THREE.Vector3(nx/nl,0,nz/nl);if(cam.isOrthographicCamera?n3.dot(camDir)>=0:n3.dot(new THREE.Vector3((a[0]+q[0])/2,h/2,-(a[1]+q[1])/2).sub(cam.position))>=0)continue;
      const k=.72+.28*Math.max(0,n3.dot(lt));prims.push({z:vz((a[0]+q[0])/2,h/2,-(a[1]+q[1])/2),d:`<path d="M${P2([a,q],0)}L${P2([q,a],h)}Z" fill="${shade(col,k)}"${sw}/>`});}
    prims.push({z:vz(b.c[0],h,-b.c[1])+.01,d:`<path d="M${P2(r,h)}Z" fill="${col}"${sw}/>`});});
  if(L.tree){const sc=pxPerM();d.trees.forEach(t=>{const hh=((Math.abs(t[0]*7.3+t[1]*3.1))%1)*.5+.8,r=3*hh,y=2.6*hh+r*.8,c=pr(t[0],y,-t[1]),g=pr(t[0],0,-t[1]);
    prims.push({z:vz(t[0],y,-t[1]),d:`<line x1="${g[0].toFixed(1)}" y1="${g[1].toFixed(1)}" x2="${c[0].toFixed(1)}" y2="${c[1].toFixed(1)}" stroke="#8a7a62" stroke-width="${(sc*.4).toFixed(2)}"/><circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(r*sc).toFixed(2)}" fill="${p.tree}"${edges?` stroke="${shade(p.tree,.7)}" stroke-width=".4"`:''}/>`});});}
  prims.sort((a,b)=>a.z-b.z).forEach(x=>s+=x.d);
  // ikonkalar — ustunda, hammasining ustida
  if(L.pins&&d.pins.length){const R0=13*S.opt.pinS,IC=S.ctx.ULY.IC||{};d.pins.slice().sort((a,b)=>vz(a.x,a.top||0,-a.y)-vz(b.x,b.top||0,-b.y)).forEach(q=>{const g=pr(q.x,0,-q.y),t=pr(q.x,q.top||S.opt.pinH,-q.y);
    s+=`<line x1="${g[0].toFixed(1)}" y1="${g[1].toFixed(1)}" x2="${t[0].toFixed(1)}" y2="${t[1].toFixed(1)}" stroke="#555" stroke-width="1"/><circle cx="${g[0].toFixed(1)}" cy="${g[1].toFixed(1)}" r="1.6" fill="#555"/><circle cx="${t[0].toFixed(1)}" cy="${t[1].toFixed(1)}" r="${R0}" fill="${q.col}" stroke="#fff" stroke-width="2"/>`;
    if(IC[q.icon]){const k=R0*1.25/24;s+=`<path d="${IC[q.icon]}" fill="#fff" fill-rule="evenodd" transform="translate(${(t[0]-12*k).toFixed(1)} ${(t[1]-12*k).toFixed(1)}) scale(${k.toFixed(3)})"/>`;}});}
  // legenda
  if(L.legend){const it=[];if(L.bld&&S.opt.bmode==='lv')[['1–2',SEQ[0]],['3–5',SEQ[1]],['6–9',SEQ[2]],['10–16',SEQ[3]],['17+',SEQ[4]]].forEach(([n,c])=>it.push([c,T('Qavatlar')+': '+n,'f']));
    else if(L.bld&&S.opt.bmode==='use')[['res','Turar joy'],['com','Savdo / ofis'],['soc','Ijtimoiy'],['ind','Sanoat / ombor'],['other','Boshqa']].forEach(([k,n])=>it.push([USEC[k],T(n),'f']));else if(L.bld)it.push([p.bld,T('Binolar'),'f']);
    if(L.green&&d.green.length)it.push([p.green,T('Yashil hududlar'),'f']);if(L.water&&(d.water.length||d.canals.length))it.push([p.water,T('Suv'),'f']);if(L.tree&&d.trees.length)it.push([p.tree,T('Daraxtlar'),'c']);if(L.rail&&d.rails.length)it.push([p.rail,T('Temir yoʻl'),'l']);
    if(L.pins){const seen={};d.pins.forEach(q=>{if(!seen[q.cat]){seen[q.cat]=1;it.push([q.col,T(q.cat),'c']);}});}
    const lh=20,bh=it.length*lh+16,y0=H-bh-16;s+=`<g><rect x="16" y="${y0}" width="300" height="${bh}" fill="#ffffff" fill-opacity=".9" stroke="#dedcd7"/>`;
    it.forEach(([c,n,k],i)=>{const y=y0+14+i*lh;s+=k==='c'?`<circle cx="31" cy="${y+5}" r="6" fill="${c}"/>`:k==='l'?`<rect x="24" y="${y+3}" width="14" height="4" fill="${c}"/>`:`<rect x="24" y="${y-1}" width="14" height="12" fill="${c}" stroke="#bbb" stroke-width=".5"/>`;s+=`<text x="46" y="${y+9}" font-size="12.5" fill="#3c3c3c">${esc(n)}</text>`;});s+='</g>';}
  s+=`<text x="${W-16}" y="${H-12}" font-size="11" fill="#8a877f" text-anchor="end">© OpenStreetMap · Archemistry Studio</text></svg>`;return {svg:s,W,H};}
function pxPerM(){const cam=S.cam,V=new THREE.Vector3(),W=1800;const a=V.set(0,0,0).project(cam).clone(),b=new THREE.Vector3(1,0,0).project(cam),c=new THREE.Vector3(0,1,0).project(cam);return Math.max(Math.hypot(b.x-a.x,b.y-a.y),Math.hypot(c.x-a.x,c.y-a.y))/2*W;}
function shade(hex,k){const c=new THREE.Color(hex);c.r=Math.min(1,c.r*k);c.g=Math.min(1,c.g*k);c.b=Math.min(1,c.b*k);return '#'+c.getHexString();}
async function doExport(k){const t=S.ctx.toast;
  if(k==='svg'){dl(fname('svg'),toSVG().svg,'image/svg+xml');return;}
  if(k==='alb'){const X=toSVG(),src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(X.svg);await S.ctx.putMat({id:'a3d'+Date.now().toString(36),kind:'svg',name:T('3D illyustratsiya')+' — '+(S.ctx.mode||''),src,thumb:src,aspect:X.W/X.H,sub:S.opt.view.toUpperCase(),t:new Date().toISOString()});t(T('Albomga yuborildi.'));return;}
  if(k==='png'){const r=S.ren,pr0=r.getPixelRatio();r.setPixelRatio(Math.min(4,pr0*2));render();const u=r.domElement.toDataURL('image/png');r.setPixelRatio(pr0);render();const b=await (await fetch(u)).blob();dl(fname('png'),b);return;}
  if(k==='obj'){const o=toOBJ();dl(fname('obj'),o.obj,'text/plain');setTimeout(()=>dl(fname('mtl'),o.mtl,'text/plain'),400);t(T('OBJ va MTL yuklab olindi (ikkalasini bir papkada saqlang).'));return;}
  if(k==='stl'){dl(fname('stl'),new Blob([toSTL(+S.opt.stl||2000)]));t(T('STL: asos, binolar va daraxtlar, masshtab')+' 1:'+S.opt.stl+', mm');return;}
  if(k==='dxf'){dl(fname('dxf'),toDXF(),'application/dxf');return;}
  if(k==='glb'||k==='dae'){await load(k==='glb'?'gltf':'dae');const g=new THREE.Group();exportMeshes().forEach(m=>{const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(m.pos,3));if(m.vcol)gg.setAttribute('color',new THREE.Float32BufferAttribute(m.vcol,3));gg.computeVertexNormals();
      const mm=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({color:'#'+m.color,vertexColors:!!m.vcol}));mm.name=m.name;g.add(mm);});
    if(k==='glb'){new THREE.GLTFExporter().parse(g,res=>dl(fname('glb'),new Blob([res])),{binary:true});return;}
    const ex=new THREE.ColladaExporter(),res=ex.parse(g,null,{upAxis:'Y_UP',unitName:'meter',unitMeter:1});dl(fname('dae'),res.data,'model/vnd.collada+xml');return;}}
window.AI3D={open,_S:()=>S};
})();
