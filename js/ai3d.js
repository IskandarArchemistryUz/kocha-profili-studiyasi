/* Archemistry Lab — AI hudud bahosi: 3D model va vektor illyustratsiya
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
const PAL0={bg:'#f2efe8',ground:'#ddd7cb',base:'#bfb8a9',bld:'#ece7de',green:'#cbdcb0',water:'#a9c7d6',tree:'#7fae5a',road:'#faf9f6',major:'#f3e4c6',foot:'#e0d9ca',rail:'#6f6a63',edge:'#3a3a3a',atree:'#93bd6c',site:'#c62828'};
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
  const pins=[],skip=new Set(['inter','trees','cross','atrees']);Object.values(ctx.ULY.LY).forEach(l=>{if(l.kind!=='pt'||!l.st.on||skip.has(l.id)||(l.data||[]).length>800)return;
    const icon=l.st.icon&&l.st.icon!=='dot'?l.st.icon:(l.icon||'dot');l.data.forEach(d=>{const p=d.p||d;if(!Array.isArray(p))return;const q=P(p);if(!ins(q))return;const col=l.colorFn?l.colorFn(d,l.st)||l.st.color:l.st.color;pins.push({x:q[0],y:q[1],col,icon,cat:l.name,key:q[0].toFixed(1)+','+q[1].toFixed(1)});});});
  // tahlil qatlamlari (rastr) — yer yuzasiga tekstura
  const rasters=Object.values(ctx.ULY.LY).filter(l=>l.kind==='raster'&&l.st.on).map(l=>{try{const r=l.render(l.st);return {url:r.url,b:r.bounds.map(P),op:+l.st.opacity,name:l.name};}catch(e){return null;}}).filter(Boolean);
  const atrees=[];(D.autoTrees||[]).forEach(p=>{const q=P(p);if(ins(q))atrees.push(q);});
  const sites=(ctx.sites||[]).map(x=>x.pts.map(P)).filter(g=>g.length>2);
  return {P,inv:q=>[c0[0]+q[1]/MY,c0[1]+q[0]/MX],atrees,sites,c0,ring,convex,R,blds,roads,rails,runway,green,water,aero,canals,trees,pins,rasters,roadKm,areaKm2:Math.abs(sArea(ring))/1e6};}

/* ---------------- interfeys ---------------- */
const CSS=`.a3{position:fixed;inset:0;z-index:3000;background:#f4f3f1;display:flex;flex-direction:column;font:14.5px/1.45 Archivo,system-ui,sans-serif;color:#141414}
.a3 header{height:52px;flex:none;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid #dedcd7;background:#f4f3f1}
.a3 .brand{display:flex;align-items:center;gap:10px}.a3 .brand b{font-weight:500;font-size:14.5px;letter-spacing:.2em}.a3 .crumb{font-size:12.5px;letter-spacing:.14em;color:#696969;text-transform:uppercase}
.a3 .st{margin-left:auto;display:flex;gap:0;font:12px 'IBM Plex Mono',monospace;color:#696969;border:1px solid #dedcd7;background:#fff}.a3 .st span{padding:4px 10px;border-left:1px solid #efede9;white-space:nowrap}.a3 .st span:first-child{border-left:0}.a3 .st b{color:#141414;font-weight:500;margin-left:5px}
.a3 .btn{height:30px;padding:0 12px;border:1px solid #141414;background:transparent;border-radius:2px;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;cursor:pointer;color:#141414}
.a3 .btn.dark{background:#141414;color:#f4f3f1}.a3 .btn.ghost{border-color:#cfccc5}.a3 .btn.sm{height:26px;padding:0 9px;font-size:11.5px}
.a3 main{flex:1;display:grid;grid-template-columns:1fr 340px;min-height:0}.a3 .vw{position:relative;min-width:0}.a3 canvas{display:block}
.a3 .cmp{position:absolute;left:14px;top:14px;width:118px;height:118px;border:1px solid #dedcd7;background:rgba(255,255,255,.94);border-radius:50%;box-shadow:0 6px 20px rgba(0,0,0,.06)}
.a3 .cmp button{position:absolute;width:34px;height:34px;border:1px solid #cfccc5;border-radius:50%;background:#fff;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.04em;cursor:pointer;color:#141414;padding:0}
.a3 .cmp button[aria-pressed=true]{background:#141414;color:#f4f3f1;border-color:#141414}.a3 .cmp .n{position:absolute;left:50%;top:3px;transform:translateX(-50%);font:600 10px 'IBM Plex Mono',monospace;color:#b3261e}
.a3 .vtools{position:absolute;left:14px;top:142px;display:flex;flex-direction:column;gap:4px}
.a3 .chip{display:flex;align-items:center;gap:7px;height:26px;padding:0 10px;border:1px solid #dedcd7;background:rgba(255,255,255,.94);font-size:12.5px;cursor:pointer;border-radius:13px;white-space:nowrap}.a3 .chip[aria-pressed=true]{background:#141414;color:#f4f3f1;border-color:#141414}
.a3 .hint3{position:absolute;left:14px;bottom:12px;font:11.5px 'IBM Plex Mono',monospace;color:#696969}
.a3 aside{border-left:1px solid #dedcd7;background:#fff;overflow:auto;display:flex;flex-direction:column}
.a3 .sec{padding:12px 16px;border-bottom:1px solid #efede9;display:flex;flex-direction:column;gap:7px}
.a3 .lbl{font-size:11.5px;letter-spacing:.14em;color:#696969;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
.a3 .seg{display:flex;border:1px solid #cfccc5;border-radius:2px;overflow:hidden;background:#fff}.a3 .seg button{flex:1;border:0;border-left:1px solid #efede9;background:none;height:28px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#141414}.a3 .seg button:first-child{border-left:0}.a3 .seg button[aria-pressed=true]{background:#141414;color:#f4f3f1}
.a3 .ly{display:grid;grid-template-columns:18px 22px 1fr auto;align-items:center;gap:8px;font-size:13.5px;padding:2px 0}.a3 .ly input[type=checkbox]{margin:0}.a3 .ly input[type=color]{width:22px;height:16px;border:1px solid #cfccc5;padding:0;background:none;cursor:pointer}.a3 .ly i{font:11px 'IBM Plex Mono',monospace;color:#8a877f;font-style:normal}.a3 .ly .ph{width:18px}
.a3 .ly.sub{padding-left:26px;font-size:12.5px;color:#3c3c3c;grid-template-columns:22px 1fr auto}
.a3 .rw{display:grid;grid-template-columns:128px minmax(0,1fr) 40px;align-items:center;gap:8px;font-size:12.5px;color:#3c3c3c}.a3 .rw output{font:11.5px 'IBM Plex Mono',monospace;text-align:right;color:#141414}.a3 .rw input{accent-color:#141414}
.a3 .nt{font:11.5px/1.55 'IBM Plex Mono',monospace;color:#696969}
.a3 .ex{display:flex;flex-wrap:wrap;gap:5px}.a3 .ex button{height:30px;padding:0 10px;border:1px solid #cfccc5;background:#fff;border-radius:2px;cursor:pointer;font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.04em;color:#141414}.a3 .ex button:hover{border-color:#141414}.a3 .ex button.dark{background:#141414;color:#f4f3f1;border-color:#141414}
.a3 .ex select{height:30px;border:1px solid #cfccc5;border-radius:2px;font:12px 'IBM Plex Mono',monospace;background:#fff}
.a3 .sel{position:absolute;right:14px;top:14px;width:250px;background:#fff;border:1px solid #141414;padding:10px 12px;display:flex;flex-direction:column;gap:7px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.08)}.a3 .sel[hidden]{display:none}.a3 .sel .hd{display:flex;align-items:center;gap:8px;font-weight:500}.a3 .sel .hd i{width:12px;height:12px;border-radius:50%;flex:none}.a3 .sel .hd button{margin-left:auto;border:0;background:none;font-size:16px;cursor:pointer;color:#696969}.a3 .sel .bt{display:flex;gap:5px}
.a3 .pc{display:grid;grid-template-columns:16px 10px minmax(0,1fr) 26px 78px;align-items:center;gap:6px;font-size:12.5px;color:#3c3c3c}.a3 .pc input[type=checkbox]{margin:0}.a3 .pc .dt{width:10px;height:10px;border-radius:50%}.a3 .pc span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.a3 .pc i{font:11px 'IBM Plex Mono',monospace;color:#8a877f;font-style:normal;text-align:right}.a3 .pc input[type=range]{width:78px;accent-color:#141414}
.a3 .busy{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:13px 'IBM Plex Mono',monospace;color:#696969;letter-spacing:.08em}
@media (max-width:860px){.a3 main{grid-template-columns:1fr;grid-template-rows:55% 45%}.a3 .st{display:none}}`;

async function open(ctx){if(!document.getElementById('a3css')){const st=document.createElement('style');st.id='a3css';st.textContent=CSS;document.head.appendChild(st);}
  const ov=document.createElement('div');ov.className='a3';const lp=(document.getElementById('logoP')||{}).getAttribute?document.getElementById('logoP').getAttribute('d'):'';
  ov.innerHTML=`<header><span class="brand"><svg width="22" height="21" viewBox="0 0 103.45 100" aria-hidden="true"><path fill="#696969" fill-rule="evenodd" d="${lp}"/></svg><b>ARCHEMISTRY</b></span><span class="crumb">/ 06 · AI · ${T('3D maket')}</span><span class="crumb" style="letter-spacing:.06em;text-transform:none;font-family:'IBM Plex Mono',monospace">${esc(ctx.mode||'')}</span>
    <div class="st" id="a3st"></div><button class="btn ghost" id="a3x">← ${T('Xaritaga')}</button></header>
  <main><div class="vw" id="a3v"><div class="busy" id="a3b">${T('3D kutubxona yuklanmoqda…')}</div>
    <div class="cmp" title="${T('Koʻrinish yoʻnalishi')}"><span class="n">N</span>${[['nw',6,6],['ne',76,6],['sw',6,76],['se',76,76],['top',41,41]].map(([k,x,y])=>`<button data-vw="${k}" style="left:${x}px;top:${y}px" title="${k==='top'?T('Yuqoridan'):k.toUpperCase()+' '+T('izometriya')}">${k==='top'?'⊙':k.toUpperCase()}</button>`).join('')}</div>
    <div class="vtools"><button class="chip" data-vw="eye" aria-pressed="false">◉ ${T('Koʻz sathi')}</button><label class="chip"><input type="checkbox" id="a3pp"> ${T('Perspektiva')}</label><label class="chip"><input type="checkbox" id="a3sh"> ${T('Soyalar')}</label><button class="chip" id="a3exb" aria-pressed="false" title="${T('Qatlamlarni bir-biridan koʻtarib ajratish')}">⇕ ${T('Qatlamlarga ajratish')}</button><button class="chip" id="a3site" aria-pressed="false" title="${T('Yerda bosib chizing; birinchi nuqta yoki Enter — yopish; Esc — bekor')}">✎ ${T('Uchastka chizish')}</button></div>
    <div class="hint3" id="a3tip" style="bottom:34px;color:#141414"></div><div class="sel" id="a3sel" hidden></div>
    <div class="hint3">${T('sudrash — aylantirish · gʻildirak — masshtab · oʻng tugma — surish · ikonkani bosish — tanlash, sudrash — balandligi (Shift — hammasi) · Delete — yashirish')}</div></div><aside id="a3p"></aside></main>`;
  document.body.appendChild(ov);const close=()=>{if(S&&S.ren){S.ren.dispose();S.ren.forceContextLoss&&S.ren.forceContextLoss();}window.removeEventListener('resize',S&&S.onR);document.removeEventListener('keydown',key);ov.remove();S=null;};
  const key=e=>{if(S&&S.sdraw){if(e.key==='Escape')siteCancel();if(e.key==='Enter')siteFinish();if(e.key==='Backspace'){e.preventDefault();S.sdraw.pop();buildSites();render();siteTip();}return;}if(S&&S.pinSel){if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();hidePin(S.pinSel);return;}if(e.key==='Escape'){selPin(null);return;}}if(e.key==='Escape')close();};document.addEventListener('keydown',key);ov.querySelector('#a3x').onclick=close;
  try{await load('three');await load('orbit');}catch(e){ov.querySelector('#a3b').textContent=T('3D kutubxonani yuklab boʻlmadi')+': '+e.message;return;}
  let pal;try{pal=Object.assign({},PAL0,JSON.parse(localStorage.getItem('kps_a3_pal')||'{}'));}catch(e){pal=Object.assign({},PAL0);}
  let opt={view:'sw',persp:false,shadow:true,preset:'none',lay:{},bmode:'one',lv:ctx.lv||2,fh:3.2,pinK:.6,pinS:1,stl:2000,explode:false,exGap:.45};try{Object.assign(opt,JSON.parse(localStorage.getItem('kps_a3_opt')||'{}'));}catch(e){}
  S={ctx,ov,pal,opt,data:prep(ctx)};['pinHide','pinCatOff','pinCatH','pinOff'].forEach(k=>{if(!opt[k]||typeof opt[k]!=='object')opt[k]={};});S.ex=opt.explode?1:0;S.opt.lay=Object.assign({bld:1,tree:1,atree:1,site:1,road:1,rail:1,green:1,water:1,pins:1,ras:0,base:1,legend:1},S.opt.lay||{});
  const d=S.data;ov.querySelector('#a3st').innerHTML=[['binolar',d.blds.length],['koʻchalar',d.roadKm.toFixed(1)+' km'],['daraxtlar',d.trees.length],['ikonkalar',d.pins.length],['maydon',d.areaKm2.toFixed(2)+' km²']].map(([n,v])=>`<span>${T(n)}<b>${v}</b></span>`).join('');
  initGL();buildAll();panel();bindPointer();setView(S.opt.view,true);ov.querySelector('#a3b').remove();}
const saveOpt=()=>{try{localStorage.setItem('kps_a3_opt',JSON.stringify(S.opt));localStorage.setItem('kps_a3_pal',JSON.stringify(S.pal));}catch(e){}};

function panel(){const o=S.opt,p=S.pal,d=S.data,el=S.ov.querySelector('#a3p');const L=o.lay;
  const cb=k=>`<input type="checkbox" data-ly="${k}" ${L[k]?'checked':''}>`,sw=k=>`<input type="color" data-pc="${k}" value="${p[k]}" title="${T('Rang')}">`;
  const row=(k,c,n,cnt)=>`<label class="ly">${k?cb(k):'<span class="ph"></span>'}${c?sw(c):'<span></span>'}<span>${T(n)}</span><i>${cnt??''}</i></label>`,sub=(c,n)=>`<label class="ly sub">${sw(c)}<span>${T(n)}</span><i></i></label>`;
  el.innerHTML=`<div class="sec"><div class="lbl">${T('Uslub')}</div><div class="seg">${[['none','Maket'],['thin','Chizma'],['bw','Monoxrom']].map(([k,n])=>`<button data-pr="${k}" aria-pressed="${o.preset===k}">${T(n)}</button>`).join('')}</div>
    <div class="nt">${T('Maket — konturisiz hajmlar; chizma — ingichka kontur; monoxrom — oq-qora taqdimot.')}</div></div>
  <div class="sec"><div class="lbl">${T('Qatlamlar va ranglar')}<button class="btn sm ghost" id="a3rc">${T('Tiklash')}</button></div>
    ${row('bld','bld','Binolar',d.blds.length)}${row('tree','tree','Daraxtlar (OSM)',d.trees.length)}${row('atree','atree','Daraxtlar — avto, yashildan',d.atrees.length)}${row('site','site','Uchastka chegarasi',d.sites.length||'')}${row('road','road','Koʻchalar',d.roadKm.toFixed(1)+' km')}${sub('major','magistrallar')}${sub('foot','piyoda yoʻllari')}
    ${row('rail','rail','Temir yoʻl, aeroport',d.rails.length+d.runway.length||'')}${row('green','green','Yashil hududlar',d.green.length)}${row('water','water','Suv',d.water.length+d.canals.length||'')}
    ${row('pins','','Ikonkalar ustunda',d.pins.length)}${d.rasters.length?row('ras','','Tahlil qatlami yerda',d.rasters.length):''}${row('base','base','Asos (plita)')}${row('','ground','Yer yuzasi')}${row('','bg','Fon')}${row('','edge','Kontur')}${row('legend','','Legenda (vektor)')}</div>
  <div class="sec"><div class="lbl">${T('Binolar')}</div><div class="seg">${[['one','Bir rang'],['lv','Qavatlar'],['use','Funksiya']].map(([k,n])=>`<button data-bm="${k}" aria-pressed="${o.bmode===k}">${T(n)}</button>`).join('')}</div>
    <div class="rw"><span>${T('Tegsiz bino, qavat')}</span><input type="range" min="1" max="9" step="1" id="a3lv" value="${o.lv}"><output>${o.lv}</output></div>
    <div class="rw"><span>${T('Qavat balandligi, m')}</span><input type="range" min="2.7" max="4.5" step=".1" id="a3fh" value="${o.fh}"><output>${o.fh}</output></div></div>
  <div class="sec"><div class="lbl">${T('Ikonkalar')}</div><div class="rw"><span>${T('Ustun balandligi, m')}</span><input type="range" min="0" max="${Math.round(d.R*1.2/10)*10}" step="10" id="a3ph" value="${pinH()}"><output>${pinH()}</output></div>
    <div class="rw"><span>${T('Oʻlchami')}</span><input type="range" min=".5" max="2.5" step=".1" id="a3ps" value="${o.pinS}"><output>${o.pinS}</output></div>${pinCatsHTML()}<div class="lbl" style="margin-top:2px"><span id="a3hid"></span><button class="btn sm ghost" id="a3unh">${T('Hammasini qaytarish')}</button></div>
    <div class="nt">${T('Ikonkani bosing — tanlanadi; yuqoriga-pastga sudrasangiz faqat oʻsha koʻtariladi (Shift bilan — hammasi). Delete — yashirish. Roʻyxatda — turini oʻchirish va turini alohida koʻtarish.')}</div></div>
  <div class="sec"><div class="lbl">${T('Qatlamlarga ajratish')}</div><div class="seg"><button data-exk="0" aria-pressed="${!o.explode}">${T('Yigʻilgan')}</button><button data-exk="1" aria-pressed="${!!o.explode}">${T('Ajratilgan')}</button></div>
    <div class="rw"><span>${T('Qatlamlar oraligʻi, m')}</span><input type="range" min="20" max="${Math.round(d.R*1.2/10)*10}" step="10" id="a3exg" value="${Math.round(o.exGap*d.R/10)*10}"><output>${Math.round(o.exGap*d.R/10)*10}</output></div>
    <div class="nt">${T('Pastdan yuqoriga: asos va koʻchalar → tahlil qatlami → landshaft (yashil, suv, daraxtlar) → binolar va uchastka → xizmatlar (ikonkalar). Oʻchirilgan qatlam oʻrin egallamaydi. SVG va albomga xuddi shu koʻrinishda chiqadi.')}</div></div>
  <div class="sec"><div class="lbl">${T('Taqdimot')}</div><div class="ex"><button data-ex="svg" class="dark">SVG</button><button data-ex="png">PNG 2×</button><button data-ex="alb">${T('Albomga')} →</button></div>
    <div class="lbl" style="margin-top:4px">${T('Model')}</div><div class="ex"><button data-ex="obj" title="Rhino, ArchiCAD, Blender">OBJ</button><button data-ex="dxf" title="AutoCAD">DXF</button><button data-ex="dae" title="SketchUp">DAE</button><button data-ex="glb" title="Blender, web">GLB</button><button data-ex="stl" title="${T('3D bosma, mm')}">STL</button><select id="a3stl" title="${T('STL masshtabi')}">${[1000,2000,5000,10000].map(v=>`<option value="${v}" ${+o.stl===v?'selected':''}>1:${v}</option>`).join('')}</select></div>
    <div class="nt">${T('Koordinatalar — metrda, hudud markazidan (X — sharq, Y — shimol, Z — balandlik). Balandlik: OSM building:levels yoki height; teg yoʻq binolar — yuqoridagi qavat soni. Relyef hisobga olinmagan. Manba: © OpenStreetMap.')}</div></div>`;
  const ov=S.ov;ov.querySelectorAll('[data-vw]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.vw===o.view);b.onclick=()=>setView(b.dataset.vw);});
  ov.querySelector('#a3site').onclick=()=>{if(S.sdraw)siteCancel();else siteStart();};
  const pp=ov.querySelector('#a3pp'),sh=ov.querySelector('#a3sh');pp.checked=!!o.persp;sh.checked=!!o.shadow;
  pp.closest('.chip').setAttribute('aria-pressed',!!o.persp);sh.closest('.chip').setAttribute('aria-pressed',!!o.shadow);
  pp.onchange=e=>{o.persp=e.target.checked;pp.closest('.chip').setAttribute('aria-pressed',o.persp);setView(o.view);};
  sh.onchange=e=>{o.shadow=e.target.checked;sh.closest('.chip').setAttribute('aria-pressed',o.shadow);applyShadow();saveOpt();render();};
  el.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{o.preset=b.dataset.pr;const pr=PRESET[o.preset];Object.assign(S.pal,PAL0,pr);delete S.pal.edges;restyle();panel();saveOpt();});
  el.querySelectorAll('[data-ly]').forEach(i=>i.onchange=()=>{L[i.dataset.ly]=i.checked?1:0;vis();applyLevels();if(S.ex>.01)recenter();saveOpt();if(i.dataset.ly==='pins')setView(o.view);else render();});
  el.querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>{o.bmode=b.dataset.bm;buildBlds();panel();saveOpt();render();});
  const rng=(id,k,fn)=>{const i=el.querySelector(id);i.oninput=()=>{o[k]=+i.value;i.nextElementSibling.textContent=i.value;fn();render();};i.onchange=saveOpt;};
  rng('#a3lv','lv',buildBlds);rng('#a3fh','fh',buildBlds);{const i=el.querySelector('#a3ph');i.oninput=()=>{o.pinK=+i.value/S.data.R;i.nextElementSibling.textContent=i.value;buildPins();fitCam();render();};i.onchange=saveOpt;}rng('#a3ps','pinS',buildPins);
  el.querySelectorAll('[data-pc]').forEach(i=>{i.onclick=e=>e.stopPropagation();i.oninput=()=>{S.pal[i.dataset.pc]=i.value;restyle();saveOpt();};});
  el.querySelector('#a3rc').onclick=e=>{e.preventDefault();S.pal=Object.assign({},PAL0,PRESET[o.preset]);delete S.pal.edges;restyle();panel();saveOpt();};
  el.querySelector('#a3stl').onchange=e=>{o.stl=+e.target.value;saveOpt();};
  el.querySelectorAll('[data-exk]').forEach(b=>b.onclick=()=>setExplode(b.dataset.exk==='1'));
  {const i=el.querySelector('#a3exg');i.oninput=()=>{o.exGap=+i.value/S.data.R;i.nextElementSibling.textContent=i.value;applyLevels();recenter();render();};i.onchange=saveOpt;}
  el.querySelectorAll('[data-pcat]').forEach(i=>i.onchange=()=>{const c=S.pcats[+i.dataset.pcat];if(i.checked)delete o.pinCatOff[c.cat];else o.pinCatOff[c.cat]=1;afterPins();});
  el.querySelectorAll('[data-pch]').forEach(i=>{i.oninput=()=>{const c=S.pcats[+i.dataset.pch];o.pinCatH[c.cat]=+i.value;buildPins();applyLevels();render();};i.onchange=saveOpt;});
  el.querySelector('#a3unh').onclick=e=>{e.preventDefault();o.pinHide={};o.pinOff={};o.pinCatH={};o.pinCatOff={};panel();afterPins();};updHid();
  const xb=ov.querySelector('#a3exb');xb.setAttribute('aria-pressed',!!o.explode);xb.onclick=()=>setExplode(!o.explode);
  el.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>doExport(b.dataset.ex).catch(e=>S.ctx.toast(T('Eksport bajarilmadi')+': '+(e.message||e))));}

/* ---------------- WebGL sahna ---------------- */
function initGL(){const v=S.ov.querySelector('#a3v'),W=v.clientWidth,H=v.clientHeight;
  const ren=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setPixelRatio(Math.min(2,devicePixelRatio||1));ren.setSize(W,H);ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;v.prepend(ren.domElement);
  const sc=new THREE.Scene();S.ren=ren;S.sc=sc;
  sc.add(new THREE.HemisphereLight(0xffffff,0xc9c3b6,.6));const sun=new THREE.DirectionalLight(0xffffff,.55);const R=S.data.R;sun.position.set(-R*.8,R*1.4,R*.5);sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);const c=sun.shadow.camera;c.left=-R*1.3;c.right=R*1.3;c.top=R*1.3;c.bottom=-R*1.3;c.near=1;c.far=R*5;sun.shadow.bias=-.0004;sun.shadow.normalBias=.6;sc.add(sun);sc.add(sun.target);S.sun=sun;
  S.root=new THREE.Group();sc.add(S.root);
  S.onR=()=>{if(!S)return;const W2=v.clientWidth,H2=v.clientHeight;ren.setSize(W2,H2);fitCam();render();};window.addEventListener('resize',S.onR);}
function pinLift(){return S.opt.lay.pins&&visPins().length?pinStalk():0;}
function liftAll(){return S.opt.view==='top'?0:pinLift()+levels().top;}
/* ---------------- sichqoncha: ikonkalarni sudrash, uchastka chizish ---------------- */
function bindPointer(){const el=S.ren.domElement,rc=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);let drag=null,down=null;
  const setN=e=>{const r=el.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);rc.setFromCamera(ndc,S.cam);};
  const hitPin=e=>{if(!S.gPin||!S.gPin.visible)return null;setN(e);const sp=S.gPin.children.filter(o=>o.isSprite);const h=rc.intersectObjects(sp,false)[0];return h?h.object:null;};
  const ground=e=>{setN(e);const v=new THREE.Vector3();return rc.ray.intersectPlane(plane,v)?[v.x,-v.z]:null;};
  const mpp=()=>{const cam=S.cam,h=el.clientHeight||1;if(cam.isOrthographicCamera)return (cam.top-cam.bottom)/cam.zoom/h;return 2*Math.tan(cam.fov*Math.PI/360)*cam.position.distanceTo(S.ctl.target)/h;};
  el.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY};if(S.sdraw)return;const sp=hitPin(e);if(!sp)return;
    const cosE=Math.max(.25,Math.sqrt(1-Math.pow(new THREE.Vector3().subVectors(S.cam.position,S.ctl.target).normalize().y,2)));
    const key=sp.userData.key;drag={x0:e.clientX,y0:e.clientY,moved:false,key,k0:S.opt.pinK??.6,one:e.shiftKey?null:key,off0:S.opt.pinOff[key]||0,k:mpp()/cosE};S.ctl.enabled=false;el.setPointerCapture(e.pointerId);e.stopPropagation();},true);
  el.addEventListener('pointermove',e=>{if(drag){if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<4)return;drag.moved=true;const dH=(drag.y0-e.clientY)*drag.k;if(drag.one){S.opt.pinOff[drag.one]=drag.off0+dH;S.pinSel=drag.one;}else S.opt.pinK=Math.max(0,drag.k0+dH/S.data.R);buildPins();applyLevels();showSel();render();
      const i=S.ov.querySelector('#a3ph');if(i&&!drag.one){i.value=pinH();i.nextElementSibling.textContent=pinH();}return;}
    if(S.sdraw){const q=ground(e);if(q){S.sdrawCur=q;}el.style.cursor='crosshair';return;}el.style.cursor=hitPin(e)?'ns-resize':'';});
  el.addEventListener('pointerup',e=>{if(drag){const d0=drag;drag=null;S.ctl.enabled=true;if(!d0.moved)selPin(S.pinSel===d0.key?null:d0.key);saveOpt();return;}
    if(!S.sdraw&&S.pinSel&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5)selPin(null);
    if(S.sdraw&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const q=ground(e);if(!q)return;const sd=S.sdraw;
      if(sd.length>2){const a=new THREE.Vector3(sd[0][0],0,-sd[0][1]).project(S.cam),r=el.getBoundingClientRect(),px=[(a.x+1)/2*r.width+r.left,(1-a.y)/2*r.height+r.top];if(Math.hypot(px[0]-e.clientX,px[1]-e.clientY)<14){siteFinish();return;}}
      sd.push(q);buildSites();render();siteTip();}down=null;});
  el.addEventListener('dblclick',()=>{if(S.sdraw&&S.sdraw.length>2){siteFinish();}});}
function siteTip(){const t=S.ov.querySelector('#a3tip');if(!t)return;t.textContent=S.sdraw?T('Uchastka')+': '+S.sdraw.length+' '+T('nuqta')+(S.sdraw.length>2?' · '+T('birinchi nuqta yoki Enter — yopish'):'')+' · Esc — '+T('bekor'):'';}
function siteStart(){S.sdraw=[];S.ov.querySelector('#a3site').setAttribute('aria-pressed','true');if(S.opt.view!=='top')setView('top');buildSites();siteTip();}
function siteCancel(){S.sdraw=null;S.ov.querySelector('#a3site').setAttribute('aria-pressed','false');buildSites();render();siteTip();}
function siteFinish(){const sd=S.sdraw;if(!sd||sd.length<3)return;const pts=sd.map(S.data.inv);const all=(S.ctx.sites||[]).concat([{id:Date.now().toString(36),pts}]);S.ctx.sites=all;if(S.ctx.onSites)S.ctx.onSites(all);
  S.data.sites=all.map(x=>x.pts.map(S.data.P));S.opt.lay.site=1;siteCancel();panel();S.ctx.toast(T('Uchastka chegarasi saqlandi — xaritada ham koʻrinadi.'));}
function fitCam(){const v=S.ov.querySelector('#a3v'),a=v.clientWidth/Math.max(1,v.clientHeight),R=S.data.R*1.12+liftAll()*.45,cam=S.cam;if(!cam)return;
  if(cam.isOrthographicCamera){cam.left=-R*a;cam.right=R*a;cam.top=R;cam.bottom=-R;}else cam.aspect=a;cam.updateProjectionMatrix();}
function setView(k,first){const o=S.opt;o.view=k;saveOpt();const R=S.data.R,eye=k==='eye';const persp=o.persp||eye;
  const cam=persp?new THREE.PerspectiveCamera(eye?55:30,1,1,R*40):new THREE.OrthographicCamera(-1,1,1,-1,-R*20,R*20);S.cam=cam;fitCam();
  const dir={nw:[-1,1,-1],ne:[1,1,-1],sw:[-1,1,1],se:[1,1,1],top:[0,1,.001],eye:[-1,.05,1]}[k]||[-1,1,1],dv=new THREE.Vector3(...dir).normalize();
  const dist=persp?(eye?R*.9:R/Math.tan(15*Math.PI/180)*1.15):R*4;cam.position.copy(dv.multiplyScalar(dist));if(eye)cam.position.y=Math.max(cam.position.y,1.7*6);
  const tgt=new THREE.Vector3(0,eye?6:liftAll()*.4,0);S.cy=tgt.y;cam.lookAt(tgt);if(S.ctl)S.ctl.dispose();const ctl=new THREE.OrbitControls(cam,S.ren.domElement);ctl.target.copy(tgt);ctl.enableDamping=false;ctl.screenSpacePanning=true;ctl.maxPolarAngle=Math.PI*.495;
  ctl.addEventListener('change',render);ctl.update();S.ctl=ctl;S.ov.querySelectorAll('[data-vw]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.vw===k));render();}
function render(){if(S&&S.ren&&S.cam){const cam=S.cam;// ikonkalar ekranda doimiy oʻlchamda
    if(S.gPin){const f=.034*S.opt.pinS,v=new THREE.Vector3();S.gPin.children.forEach(o=>{if(!o.isSprite)return;const k=cam.isOrthographicCamera?f*(cam.top-cam.bottom)/cam.zoom:f*2*Math.tan(cam.fov*Math.PI/360)*v.copy(o.position).sub(cam.position).length();if(o.userData.lbl){const a=o.userData.asp;o.scale.set(k*.62*a,k*.62,1);return;}const m=o.userData.ring?1.75:o.userData.key===S.pinSel?1.3:1;o.scale.set(k*m,k*m,1);});}
    if(S.gPlate&&S.gPlate.visible){const v=new THREE.Vector3();S.gPlate.children.forEach(o=>{if(!o.userData.lbl)return;let best=null,bx=1e9;S.data.ring.forEach(q=>{v.set(q[0],o.userData.y,-q[1]).project(cam);if(v.x<bx){bx=v.x;best=q;}});if(best)o.position.set(best[0],o.userData.y,-best[1]);});
      const f=.034*S.opt.pinS;S.gPlate.children.forEach(o=>{if(!o.userData.lbl)return;const k=cam.isOrthographicCamera?f*(cam.top-cam.bottom)/cam.zoom:f*2*Math.tan(cam.fov*Math.PI/360)*v.copy(o.position).sub(cam.position).length();o.scale.set(k*.62*o.userData.asp,k*.62,1);});}
    S.ren.setClearColor(S.pal.bg);S.ren.render(S.sc,cam);}}
const MAT={};
function mat(k,col,extra){const m=MAT[k]||(MAT[k]=new THREE.MeshLambertMaterial(Object.assign({side:THREE.DoubleSide},extra||{})));m.color.set(col);return m;}
function geo(pos,cols){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(cols)g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();return g;}
function grp(name){if(S[name]){S.root.remove(S[name]);S[name].traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isSprite||o.userData.own)o.material.dispose();});}const g=new THREE.Group();g.name=name;S.root.add(g);S[name]=g;return g;}
function buildAll(){buildGround();buildFlat();buildBlds();buildTrees();buildATrees();buildSites();buildPins();applyShadow();vis();applyLevels();}
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
function treeMesh(g,t,colKey,name){if(!t.length)return;const cr=new THREE.IcosahedronGeometry(1,1),tr=new THREE.CylinderGeometry(.18,.25,1,6);
  const mc=new THREE.InstancedMesh(cr,mat(colKey,S.pal[colKey],{side:THREE.FrontSide}),t.length),mt=new THREE.InstancedMesh(tr,mat('trunk','#8a7a62',{side:THREE.FrontSide}),t.length),M=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
  t.forEach((p,i)=>{const h=((Math.abs(p[0]*7.3+p[1]*3.1))%1)*.5+.8,r=3*h;M.compose(new THREE.Vector3(p[0],2.6*h+r*.8,-p[1]),q,sc.set(r,r*.95,r));mc.setMatrixAt(i,M);M.compose(new THREE.Vector3(p[0],1.6*h,-p[1]),q,sc.set(1,3.2*h,1));mt.setMatrixAt(i,M);});
  mc.castShadow=mt.castShadow=true;mc.name=name;mt.name=name+'_tana';g.add(mc,mt);}
function buildATrees(){const g=grp('gATree');treeMesh(g,S.data.atrees,'atree','daraxtlar_avto');}
/* uchastka chegarasi: qizil shtrix-punktir (lenta) */
function dashDot(g,R){const out=[],L1=Math.max(4,R/55),d=Math.max(.6,R/320),gap=Math.max(1.5,R/170),pat=[[L1,1],[gap,0],[d,1],[gap,0]];
  for(let i=0;i<g.length;i++){const a=g[i],b=g[(i+1)%g.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);let s0=0,k=out.k||0;while(s0<len){const [l,on]=pat[k%4],s1=Math.min(len,s0+l);if(on)out.push([[a[0]+(b[0]-a[0])*s0/len,a[1]+(b[1]-a[1])*s0/len],[a[0]+(b[0]-a[0])*s1/len,a[1]+(b[1]-a[1])*s1/len]]);s0=s1;k++;}out.k=k;}return out;}
function buildSites(){const g=grp('gSite'),d=S.data;const pts=[...d.sites,...(S.sdraw&&S.sdraw.length>1?[S.sdraw]:[])];if(!pts.length)return;const pos=[],w=Math.max(1,d.R/260);
  d.sites.forEach(r=>dashDot(r,d.R).forEach(sg=>ribbon(sg,w,.6,pos)));
  if(S.sdraw&&S.sdraw.length>1){const open=S.sdraw.slice();for(let i=1;i<open.length;i++)ribbon([open[i-1],open[i]],w*.8,.65,pos);}
  if(pos.length){const m=new THREE.Mesh(geo(pos),new THREE.MeshBasicMaterial({color:S.pal.site,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4}));m.name='uchastka';m.renderOrder=5;g.add(m);}
  (S.sdraw||[]).forEach((p,i)=>{const c=new THREE.Mesh(new THREE.CircleGeometry(i===0&&S.sdraw.length>2?w*4:w*2.4,18),new THREE.MeshBasicMaterial({color:i===0&&S.sdraw.length>2?S.pal.site:'#ffffff',side:THREE.DoubleSide}));c.rotation.x=-Math.PI/2;c.position.set(p[0],.8,-p[1]);g.add(c);});vis();}
function buildTrees(){const g=grp('gTree'),t=S.data.trees;if(!t.length)return;const cr=new THREE.IcosahedronGeometry(1,1),tr=new THREE.CylinderGeometry(.18,.25,1,6);
  const mc=new THREE.InstancedMesh(cr,mat('tree',S.pal.tree,{side:THREE.FrontSide}),t.length),mt=new THREE.InstancedMesh(tr,mat('trunk','#8a7a62',{side:THREE.FrontSide}),t.length),M=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
  t.forEach((p,i)=>{const h=((Math.abs(p[0]*7.3+p[1]*3.1))%1)*.5+.8,r=3*h;M.compose(new THREE.Vector3(p[0],2.6*h+r*.8,-p[1]),q,sc.set(r,r*.95,r));mc.setMatrixAt(i,M);M.compose(new THREE.Vector3(p[0],1.6*h,-p[1]),q,sc.set(1,3.2*h,1));mt.setMatrixAt(i,M);});
  mc.castShadow=mt.castShadow=true;mc.name='daraxtlar';mt.name='tanalar';g.add(mc,mt);}
const ICT={};
function iconTex(col,icon){const k=col+icon;if(ICT[k])return ICT[k];const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  c.beginPath();c.arc(64,64,58,0,7);c.fillStyle=col;c.fill();c.lineWidth=7;c.strokeStyle='#fff';c.stroke();const IC=(S.ctx.ULY.IC||{})[icon];
  if(IC){c.save();c.translate(64-36,64-36);c.scale(3,3);c.fillStyle='#fff';c.fill(new Path2D(IC),'evenodd');c.restore();}else{c.beginPath();c.arc(64,64,16,0,7);c.fillStyle='#fff';c.fill();}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return ICT[k]=t;}
function pinH(){return Math.round(S.data.R*(S.opt.pinK??.6)/10)*10;}
/* koʻrinadigan ikonkalar: yashirilganlar va oʻchirilgan turlar chiqmaydi */
function visPins(){const o=S.opt;return S.data.pins.filter(p=>!o.pinHide[p.key]&&!o.pinCatOff[p.cat]);}
/* ajratilgan koʻrinishda ikonkalar oʻz tekisligida qisqa ustunda turadi */
function pinStalk(){const ex=S.ex||0;return pinH()*(1-ex)+Math.max(12,S.data.R*.05)*ex;}
function pinTop(p){const H=pinStalk(),o=S.opt;return Math.max(0,H+((p.x*13.7+p.y*7.1)%1+1)%1*H*.25+(o.pinCatH[p.cat]||0)+(o.pinOff[p.key]||0));}
let SELT=null;
function selTex(){if(SELT)return SELT;const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.beginPath();c.arc(64,64,56,0,7);c.lineWidth=10;c.strokeStyle='#141414';c.stroke();return SELT=new THREE.CanvasTexture(cv);}
function buildPins(){const g=grp('gPin'),list=visPins();if(!list.length){vis();return;}const ln=[];
  list.forEach(p=>{const top=pinTop(p);p.top=top;if(top>0)ln.push(p.x,0,-p.y,p.x,top,-p.y);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(p.col,p.icon),depthTest:true}));s.position.set(p.x,top,-p.y);s.userData.key=p.key;s.renderOrder=10;g.add(s);
    if(p.key===S.pinSel){const r=new THREE.Sprite(new THREE.SpriteMaterial({map:selTex(),depthTest:false,transparent:true}));r.position.copy(s.position);r.userData.ring=1;r.renderOrder=11;g.add(r);}});
  if(ln.length){const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(ln,3));const lm=new THREE.LineBasicMaterial({color:'#3a3a3a',transparent:true,opacity:.85});const ls=new THREE.LineSegments(lg,lm);ls.userData.own=1;g.add(ls);}
  vis();}
function afterPins(){if(S.pinSel&&!visPins().some(p=>p.key===S.pinSel))S.pinSel=null;buildPins();applyLevels();showSel();updHid();saveOpt();if(S.ex>.01)recenter();render();}
function hidePin(k){S.opt.pinHide[k]=1;S.pinSel=null;afterPins();S.ctx.toast(T('Ikonka yashirildi. «Hammasini qaytarish» bilan tiklanadi.'));}
function selPin(k){S.pinSel=k;buildPins();applyLevels();showSel();render();}
function updHid(){const el=S.ov.querySelector('#a3hid');if(!el)return;const n=Object.keys(S.opt.pinHide).length,c=Object.keys(S.opt.pinCatOff).length;el.textContent=n||c?T('Yashirilgan')+': '+n+(c?' · '+T('turlar')+': '+c:''):'';const b=S.ov.querySelector('#a3unh');if(b)b.hidden=!(n||c||Object.keys(S.opt.pinOff).length||Object.keys(S.opt.pinCatH).length);}
function pinCatsHTML(){const m={};S.data.pins.forEach(p=>{(m[p.cat]=m[p.cat]||{cat:p.cat,col:p.col,n:0}).n++;});S.pcats=Object.values(m);if(!S.pcats.length)return '';const R=Math.round(S.data.R*1.2/10)*10;
  return `<div class="lbl" style="margin-top:4px">${T('Turlar')}<span style="text-transform:none;letter-spacing:0">${T('koʻtarish')}</span></div>`+S.pcats.map((c,i)=>`<label class="pc"><input type="checkbox" data-pcat="${i}" ${S.opt.pinCatOff[c.cat]?'':'checked'}><span class="dt" style="background:${c.col}"></span><span title="${esc(T(c.cat))}">${esc(T(c.cat))}</span><i>${c.n}</i><input type="range" data-pch="${i}" min="${-R}" max="${R}" step="5" value="${S.opt.pinCatH[c.cat]||0}" title="${T('Shu turdagi hamma ikonkalarni koʻtarish / tushirish, m')}"></label>`).join('');}
/* tanlangan ikonka kartasi */
function showSel(){const el=S.ov.querySelector('#a3sel');if(!el)return;const p=S.pinSel&&S.data.pins.find(q=>q.key===S.pinSel);if(!p){el.hidden=true;return;}el.hidden=false;
  const own=S.opt.pinOff[p.key]||0,top=Math.round(pinTop(p)),mx=Math.round(S.data.R*1.6/10)*10;
  el.innerHTML=`<div class="hd"><i style="background:${p.col}"></i><span>${esc(T(p.cat))}</span><button title="Esc">×</button></div>
   <div class="rw" style="grid-template-columns:70px minmax(0,1fr) 44px"><span>${T('Balandlik')}</span><input type="range" min="0" max="${mx}" step="1" value="${top}"><output>${top} m</output></div>
   <div class="bt"><button class="btn sm dark" data-a="hide">${T('Yashirish')}</button><button class="btn sm ghost" data-a="reset" ${own?'':'disabled'}>${T('Tiklash')}</button></div>`;
  el.querySelector('.hd button').onclick=()=>selPin(null);
  const r=el.querySelector('input');r.oninput=()=>{S.opt.pinOff[p.key]=own+(+r.value-top);r.nextElementSibling.textContent=r.value+' m';buildPins();applyLevels();render();};r.onchange=()=>{saveOpt();showSel();};
  el.querySelector('[data-a=hide]').onclick=()=>hidePin(p.key);el.querySelector('[data-a=reset]').onclick=()=>{delete S.opt.pinOff[p.key];afterPins();};}

/* ---------------- qatlamlarga ajratish ---------------- */
const LVN={base:'Asos va koʻchalar',ras:'Tahlil',land:'Landshaft',bld:'Binolar',pins:'Xizmatlar'};
function levels(){const L=S.opt.lay,d=S.data,g=(S.opt.exGap??.45)*d.R*(S.ex||0),order=['base'];
  if(L.ras&&d.rasters.length)order.push('ras');
  if((L.green&&d.green.length)||(L.water&&(d.water.length||d.canals.length))||(L.tree&&d.trees.length)||(L.atree&&d.atrees.length))order.push('land');
  if((L.bld&&d.blds.length)||(L.site&&d.sites.length))order.push('bld');
  if(L.pins&&visPins().length)order.push('pins');
  const y={base:0,ras:0,land:0,bld:0,pins:0};order.forEach((k,i)=>y[k]=i*g);return {order,y,top:(order.length-1)*g};}
function applyLevels(){if(!S||!S.root)return;const {y}=levels();
  if(S.gRas)S.gRas.position.y=y.ras;if(S.gFlat)S.gFlat.children.forEach(m=>m.position.y=(m.userData.lay==='green'||m.userData.lay==='water')?y.land:0);
  if(S.gTree)S.gTree.position.y=y.land;if(S.gATree)S.gATree.position.y=y.land;if(S.gBld)S.gBld.position.y=y.bld;if(S.gSite)S.gSite.position.y=y.bld;if(S.gPin)S.gPin.position.y=y.pins;buildPlates();}
const LBT={};
function lblTex(t){if(LBT[t])return LBT[t];const cv=document.createElement('canvas'),c=cv.getContext('2d'),F='500 44px Archivo, system-ui, sans-serif';c.font=F;const w=Math.ceil(c.measureText(t).width)+48;cv.width=w;cv.height=72;c.font=F;
  c.fillStyle='#141414';c.fillRect(0,0,w,72);c.fillStyle='#ffffff';c.textBaseline='middle';c.fillText(t,24,38);const tx=new THREE.CanvasTexture(cv);tx.anisotropy=4;return LBT[t]={tx,asp:w/72};}
function buildPlates(){const g=grp('gPlate'),ex=S.ex||0;if(ex<.01){g.visible=false;return;}const d=S.data,{order,y,top}=levels(),sh=new THREE.Shape(d.ring.map(p=>new THREE.Vector2(p[0],p[1])));
  const ol=[];d.ring.forEach((q,i)=>{const r=d.ring[(i+1)%d.ring.length];ol.push(q[0],0,-q[1],r[0],0,-r[1]);});
  order.forEach(k=>{const yk=y[k];if(k!=='base'){if(k!=='ras'){const sg=new THREE.ShapeGeometry(sh);sg.rotateX(-Math.PI/2);const m=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({color:S.pal.ground,transparent:true,opacity:.42*ex,depthWrite:false,side:THREE.DoubleSide}));m.position.y=yk-.4;m.renderOrder=-1;m.userData.own=1;g.add(m);}
      const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(ol,3));const l=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:'#8a877f',transparent:true,opacity:.9*ex}));l.position.y=yk-.3;l.userData.own=1;g.add(l);}
    const t=lblTex(T(LVN[k])),sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t.tx,depthTest:false,transparent:true,opacity:ex}));sp.center.set(1.08,.5);sp.userData={lbl:1,y:yk+(k==='pins'?0:2),asp:t.asp};sp.renderOrder=12;g.add(sp);});
  if(top>0){const n=4,pp=[];for(let i=0;i<n;i++){const q=d.ring[Math.floor(i*d.ring.length/n)];pp.push(q[0],0,-q[1],q[0],top,-q[1]);}const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));
    const l=new THREE.LineSegments(lg,new THREE.LineDashedMaterial({color:'#8a877f',dashSize:Math.max(2,d.R/90),gapSize:Math.max(2,d.R/70),transparent:true,opacity:.8*ex}));l.computeLineDistances();l.userData.own=1;g.add(l);}
  g.visible=true;}
function recenter(){if(!S.cam||!S.ctl)return;const want=liftAll()*.4,dy=want-(S.cy??S.ctl.target.y);S.cam.position.y+=dy;S.ctl.target.y+=dy;S.cy=want;fitCam();S.ctl.update();}
function setExplode(on){const o=S.opt;o.explode=!!on;saveOpt();S.ov.querySelector('#a3exb').setAttribute('aria-pressed',o.explode);S.ov.querySelectorAll('[data-exk]').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.exk==='1')===o.explode));
  if(o.explode&&(o.view==='top'||o.view==='eye'))setView('sw');applyShadow();
  if(S.exAnim)cancelAnimationFrame(S.exAnim);const e0=S.ex||0,e1=o.explode?1:0,t0=performance.now();
  const step=now=>{if(!S)return;const t=Math.min(1,(now-t0)/700),k=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;S.ex=e0+(e1-e0)*k;buildPins();applyLevels();recenter();render();if(t<1)S.exAnim=requestAnimationFrame(step);else{S.exAnim=null;applyShadow();render();}};S.exAnim=requestAnimationFrame(step);}
function applyShadow(){const on=!!S.opt.shadow&&!S.opt.explode;S.ren.shadowMap.enabled=on;S.sun.castShadow=on;S.root.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.needsUpdate=true);}});}
function vis(){if(!S)return;const L=S.opt.lay;if(S.gBld)S.gBld.children.forEach(o=>o.visible=!!L.bld&&(!o.userData.edge||PRESET[S.opt.preset].edges===1));if(S.gTree)S.gTree.visible=!!L.tree;if(S.gATree)S.gATree.visible=!!L.atree;if(S.gSite)S.gSite.visible=!!L.site||!!(S.sdraw);if(S.gPin)S.gPin.visible=!!L.pins;if(S.gRas)S.gRas.visible=!!L.ras;
  if(S.gFlat)S.gFlat.children.forEach(m=>m.visible=!!L[m.userData.lay]);if(S.gBase)S.gBase.children.forEach(m=>{m.material[1].visible=!!L.base;});}
function restyle(){const p=S.pal;['ground','base','green','water','foot','road','major','rail','tree'].forEach(k=>{if(MAT[k])MAT[k].color.set(p[k]);});if(MAT.runway)MAT.runway.color.set(p.major);if(MAT.atree)MAT.atree.color.set(p.atree);buildSites();if(MAT.aero)MAT.aero.color.set(p.foot);buildBlds();render();}

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
function toOBJ(){const ms=exportMeshes();let obj='# Archemistry Lab — 3D hudud modeli (metr, Y — yuqoriga)\n# © OpenStreetMap hissadorlari\nmtllib '+fname('mtl')+'\n',mtl='',vi=1;
  ms.forEach((m,k)=>{const mn=m.name+'_'+k;mtl+=`newmtl ${mn}\nKd ${m.color.match(/../g).map(h=>(parseInt(h,16)/255).toFixed(3)).join(' ')}\nKa 0 0 0\nd 1\n\n`;obj+=`o ${m.name}\nusemtl ${mn}\n`;
    for(let i=0;i<m.pos.length;i+=3)obj+=`v ${m.pos[i].toFixed(3)} ${m.pos[i+1].toFixed(3)} ${m.pos[i+2].toFixed(3)}`+(m.vcol?` ${m.vcol[i].toFixed(3)} ${m.vcol[i+1].toFixed(3)} ${m.vcol[i+2].toFixed(3)}`:'')+'\n';
    for(let i=0;i<m.pos.length/3;i+=3)obj+=`f ${vi+i} ${vi+i+1} ${vi+i+2}\n`;vi+=m.pos.length/3;});return {obj,mtl};}
function toSTL(scale){const ms=exportMeshes().filter(m=>/^(asos|binolar|daraxtlar|tanalar)/.test(m.name)),k=1000/scale;let n=0;ms.forEach(m=>n+=m.pos.length/9);
  const buf=new ArrayBuffer(84+n*50),dv=new DataView(buf);dv.setUint32(80,n,true);let o=84;
  ms.forEach(m=>{const p=m.pos;for(let i=0;i<p.length;i+=9){const A=[p[i],-p[i+2],p[i+1]],B=[p[i+3],-p[i+5],p[i+4]],C=[p[i+6],-p[i+8],p[i+7]];// Z — yuqoriga
      const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],w=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],N=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...N)||1;
      [N[0]/l,N[1]/l,N[2]/l,...A.map(x=>x*k),...B.map(x=>x*k),...C.map(x=>x*k)].forEach(v=>{dv.setFloat32(o,v,true);o+=4;});dv.setUint16(o,0,true);o+=2;}});return buf;}
function toDXF(){const d=S.data,L=S.opt.lay;let s='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n9\n';
  const LY=[['CHEGARA',7],['BINOLAR',8],['YASHIL',3],['SUV',5],['KOCHA_OQ',9],['TEMIR_YOL',1],['DARAXT',94],['DARAXT_AVTO',96],['UCHASTKA',1],['IKONKA',6],['ASOS',8]];LY.forEach(([n,c])=>s+=`0\nLAYER\n2\n${n}\n70\n0\n62\n${c}\n6\nCONTINUOUS\n`);s+='0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  const f=v=>(+v).toFixed(3),pl=(ly,g,closed,z=0)=>{s+=`0\nPOLYLINE\n8\n${ly}\n66\n1\n70\n${closed?1:0}\n10\n0\n20\n0\n30\n${f(z)}\n`;g.forEach(p=>s+=`0\nVERTEX\n8\n${ly}\n10\n${f(p[0])}\n20\n${f(p[1])}\n30\n${f(z)}\n`);s+='0\nSEQEND\n';};
  const face=(ly,a,b,c,e)=>{e=e||c;s+=`0\n3DFACE\n8\n${ly}\n10\n${f(a[0])}\n20\n${f(a[1])}\n30\n${f(a[2])}\n11\n${f(b[0])}\n21\n${f(b[1])}\n31\n${f(b[2])}\n12\n${f(c[0])}\n22\n${f(c[1])}\n32\n${f(c[2])}\n13\n${f(e[0])}\n23\n${f(e[1])}\n33\n${f(e[2])}\n`;};
  pl('CHEGARA',d.ring,true);
  if(L.bld)d.blds.forEach(b=>{const h=bHeight(b),r=b.g;pl('BINOLAR',r,true,0);pl('BINOLAR',r,true,h);
    THREE.ShapeUtils.triangulateShape(r.map(p=>new THREE.Vector2(p[0],p[1])),[]).forEach(t=>face('BINOLAR',[...r[t[0]],h],[...r[t[1]],h],[...r[t[2]],h]));
    for(let i=0;i<r.length;i++){const a=r[i],q=r[(i+1)%r.length];face('BINOLAR',[a[0],a[1],0],[q[0],q[1],0],[q[0],q[1],h],[a[0],a[1],h]);}});
  if(L.green)d.green.forEach(g=>pl('YASHIL',g,true));if(L.water){d.water.forEach(g=>pl('SUV',g,true));d.canals.forEach(r=>pl('SUV',r.g,false));}
  if(L.road)['major','minor','foot'].forEach(k=>d.roads[k].forEach(r=>pl('KOCHA_OQ',r.g,false)));if(L.rail){d.rails.forEach(r=>pl('TEMIR_YOL',r.g,false));d.runway.forEach(r=>pl('TEMIR_YOL',r.g,false));}
  if(L.site)d.sites.forEach(g=>pl('UCHASTKA',g,true));if(L.atree)d.atrees.forEach(p=>s+=`0\nCIRCLE\n8\nDARAXT_AVTO\n10\n${f(p[0])}\n20\n${f(p[1])}\n30\n0\n40\n2.5\n`);
  if(L.tree)d.trees.forEach(p=>s+=`0\nCIRCLE\n8\nDARAXT\n10\n${f(p[0])}\n20\n${f(p[1])}\n30\n0\n40\n2.5\n`);
  if(L.pins)visPins().forEach(p=>{s+=`0\nPOINT\n8\nIKONKA\n10\n${f(p.x)}\n20\n${f(p.y)}\n30\n0\n`;s+=`0\nTEXT\n8\nIKONKA\n10\n${f(p.x+3)}\n20\n${f(p.y+3)}\n30\n0\n40\n3\n1\n${String(p.cat).replace(/[^\x20-\x7EЀ-ӿ]/g,'')}\n`;});
  return s+'0\nENDSEC\n0\nEOF\n';}
/* vektor illyustratsiya: joriy kamera boʻyicha proyeksiya, uzoqdan yaqinga boʻyash */
function toSVG(){const cam=S.cam,v=S.ov.querySelector('#a3v'),W=1800,H=Math.round(W*v.clientHeight/Math.max(1,v.clientWidth)),d=S.data,L=S.opt.lay,p=S.pal,edges=PRESET[S.opt.preset].edges===1;
  cam.updateMatrixWorld();const V=new THREE.Vector3(),pr=(x,y,z)=>{V.set(x,y,z).project(cam);return [(V.x+1)/2*W,(1-V.y)/2*H];},vz=(x,y,z)=>{V.set(x,y,z).applyMatrix4(cam.matrixWorldInverse);return V.z;};
  const P2=(pts,y)=>pts.map(q=>pr(q[0],y,-q[1]).map(n=>n.toFixed(1)).join(' ')).join('L');
  const LV=levels(),Y=LV.y,ex=(S.ex||0)>.01;
  const sw=edges?` stroke="${p.edge}" stroke-width=".45" stroke-linejoin="round"`:'';let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Archivo, sans-serif"><rect width="${W}" height="${H}" fill="${p.bg}"/>`;
  const ringD=y=>'M'+P2(d.ring,y)+'Z';let cid=0;const clipOpen=y=>{const id='rg'+(cid++);s+=`<defs><clipPath id="${id}"><path d="${ringD(y)}"/></clipPath></defs><g clip-path="url(#${id})">`;};
  // ajratilgan koʻrinish: tik yoʻnaltiruvchi chiziqlar (eng orqada)
  if(ex&&LV.top>0){for(let i=0;i<4;i++){const q=d.ring[Math.floor(i*d.ring.length/4)],a=pr(q[0],0,-q[1]),b=pr(q[0],LV.top,-q[1]);s+=`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#8a877f" stroke-width="1" stroke-dasharray="6 5"/>`;}}
  // asos (plita) yon devorlari
  if(L.base){const r=d.ring;for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],n3=new THREE.Vector3(b[1]-a[1],0,b[0]-a[0]),cd=new THREE.Vector3();cam.getWorldDirection(cd);if(n3.dot(cd)>=0)continue;
      s+=`<path d="M${P2([a,b],0)}L${P2([b,a],-8)}Z" fill="${shade(p.base,.86)}"/>`;}}
  const flat=(list,col,y)=>list.forEach(g=>s+=`<path d="M${P2(g,y)}Z" fill="${col}"/>`);
  const rib=(list,col,y)=>list.forEach(r=>{const pos=[];const [Lf,Rt]=ribbon(r.g,r.w,y,pos);s+=`<path d="M${P2(Lf,y)}L${P2(Rt.slice().reverse(),y)}Z" fill="${col}"/>`;});
  const ras=y=>{if(!(L.ras&&S.rasBox&&cam.isOrthographicCamera))return;const b=S.rasBox,o=pr(b.x0,y,-b.y1),exx=pr(b.x1,y,-b.y1),ey=pr(b.x0,y,-b.y0),cw=b.cv.width,ch=b.cv.height;
    s+=`<image href="${b.cv.toDataURL('image/png')}" width="${cw}" height="${ch}" transform="matrix(${((exx[0]-o[0])/cw).toFixed(5)} ${((exx[1]-o[1])/cw).toFixed(5)} ${((ey[0]-o[0])/ch).toFixed(5)} ${((ey[1]-o[1])/ch).toFixed(5)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})" preserveAspectRatio="none"/>`;};
  const landFlat=y=>{if(L.green)flat(d.green,p.green,y+.05);if(L.water){flat(d.water,p.water,y+.08);rib(d.canals,p.water,y+.08);}};
  const plate=(y)=>{s+=`<path d="${ringD(y)}" fill="${p.ground}" fill-opacity=".42" stroke="#8a877f" stroke-width="1"/>`;};
  const label=(k,y)=>{let best=null,bx=1e9;d.ring.forEach(q=>{const c=pr(q[0],y,-q[1]);if(c[0]<bx){bx=c[0];best=c;}});const t=T(LVN[k]),w=t.length*8.2+22;s+=`<g><rect x="${(best[0]-w-14).toFixed(1)}" y="${(best[1]-12).toFixed(1)}" width="${w.toFixed(1)}" height="24" fill="#141414"/><text x="${(best[0]-w-3).toFixed(1)}" y="${(best[1]+5).toFixed(1)}" font-size="13.5" fill="#fff">${esc(t)}</text></g>`;};
  // hajmlar (binolar, daraxtlar) — chuqurlik boʻyicha
  const camDir=new THREE.Vector3();cam.getWorldDirection(camDir);const lt=new THREE.Vector3(-.8,0,.5).normalize();
  const bldPrims=y0=>{const pr2=[];if(L.bld)d.blds.forEach(b=>{const h=bHeight(b),r=b.g,col=bColor(b);
    for(let i=0;i<r.length;i++){const a=r[i],q=r[(i+1)%r.length],nx=q[1]-a[1],nz=(q[0]-a[0]),nl=Math.hypot(nx,nz)||1;
      const n3=new THREE.Vector3(nx/nl,0,nz/nl);if(cam.isOrthographicCamera?n3.dot(camDir)>=0:n3.dot(new THREE.Vector3((a[0]+q[0])/2,y0+h/2,-(a[1]+q[1])/2).sub(cam.position))>=0)continue;
      const k=.72+.28*Math.max(0,n3.dot(lt));pr2.push({z:vz((a[0]+q[0])/2,y0+h/2,-(a[1]+q[1])/2),d:`<path d="M${P2([a,q],y0)}L${P2([q,a],y0+h)}Z" fill="${shade(col,k)}"${sw}/>`});}
    pr2.push({z:vz(b.c[0],y0+h,-b.c[1])+.01,d:`<path d="M${P2(r,y0+h)}Z" fill="${col}"${sw}/>`});});return pr2;};
  const treePrims=y0=>{const pr2=[],sc=pxPerM();const one=(t,col,trunk)=>{const hh=((Math.abs(t[0]*7.3+t[1]*3.1))%1)*.5+.8,r=3*hh,y=y0+2.6*hh+r*.8,c=pr(t[0],y,-t[1]),g=pr(t[0],y0,-t[1]);
      pr2.push({z:vz(t[0],y,-t[1]),d:(trunk?`<line x1="${g[0].toFixed(1)}" y1="${g[1].toFixed(1)}" x2="${c[0].toFixed(1)}" y2="${c[1].toFixed(1)}" stroke="#8a7a62" stroke-width="${(sc*.4).toFixed(2)}"/>`:'')+`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(r*sc).toFixed(2)}" fill="${col}"${edges?` stroke="${shade(col,.7)}" stroke-width=".4"`:''}/>`});};
    if(L.tree)d.trees.forEach(t=>one(t,p.tree,1));if(L.atree)d.atrees.forEach(t=>one(t,p.atree,0));return pr2;};
  const emit=a=>a.sort((x,y)=>x.z-y.z).forEach(x=>s+=x.d);
  const site=y=>{if(L.site)d.sites.forEach(r=>{s+=`<path d="M${P2(r,y+.6)}Z" fill="none" stroke="${p.site}" stroke-width="2.4" stroke-dasharray="16 6 3 6" stroke-linejoin="round"/>`;});};
  // 1) asos: yer, (yigʻilganda — tahlil va landshaft ham), koʻchalar, temir yoʻl
  s+=`<path d="${ringD(0)}" fill="${p.ground}"/>`;clipOpen(0);
  if(!ex){ras(0);landFlat(0);}
  if(L.rail)flat(d.aero,p.foot,.04);if(L.road){rib(d.roads.foot,p.foot,.1);rib(d.roads.minor,p.road,.12);rib(d.roads.major,p.major,.14);}if(L.rail){rib(d.runway,p.major,.13);rib(d.rails,p.rail,.18);}
  s+='</g>';if(ex)label('base',0);
  if(!ex){emit(bldPrims(0).concat(treePrims(0)));site(0);}
  else{// 2) yuqoriga qatlam-qatlam
    LV.order.forEach(k=>{if(k==='base')return;const y=Y[k];
      if(k==='ras'){clipOpen(y);ras(y);s+='</g>';s+=`<path d="${ringD(y)}" fill="none" stroke="#8a877f" stroke-width="1"/>`;}
      if(k==='land'){plate(y);clipOpen(y);landFlat(y);s+='</g>';emit(treePrims(y));}
      if(k==='bld'){plate(y);emit(bldPrims(y));site(y);}
      if(k==='pins')plate(y);
      label(k,y);});}
  // ikonkalar — ustunda, hammasining ustida
  const pins=visPins();if(L.pins&&pins.length){const R0=13*S.opt.pinS,IC=S.ctx.ULY.IC||{},y0=Y.pins;pins.slice().sort((a,b)=>vz(a.x,y0+(a.top||0),-a.y)-vz(b.x,y0+(b.top||0),-b.y)).forEach(q=>{const g=pr(q.x,y0,-q.y),t=pr(q.x,y0+(q.top??pinTop(q)),-q.y);
    s+=`<line x1="${g[0].toFixed(1)}" y1="${g[1].toFixed(1)}" x2="${t[0].toFixed(1)}" y2="${t[1].toFixed(1)}" stroke="#3a3a3a" stroke-width="1.3"/><circle cx="${g[0].toFixed(1)}" cy="${g[1].toFixed(1)}" r="1.6" fill="#555"/><circle cx="${t[0].toFixed(1)}" cy="${t[1].toFixed(1)}" r="${R0}" fill="${q.col}" stroke="#fff" stroke-width="2"/>`;
    if(IC[q.icon]){const k=R0*1.25/24;s+=`<path d="${IC[q.icon]}" fill="#fff" fill-rule="evenodd" transform="translate(${(t[0]-12*k).toFixed(1)} ${(t[1]-12*k).toFixed(1)}) scale(${k.toFixed(3)})"/>`;}});}
  // legenda
  if(L.legend){const it=[];if(L.bld&&S.opt.bmode==='lv')[['1–2',SEQ[0]],['3–5',SEQ[1]],['6–9',SEQ[2]],['10–16',SEQ[3]],['17+',SEQ[4]]].forEach(([n,c])=>it.push([c,T('Qavatlar')+': '+n,'f']));
    else if(L.bld&&S.opt.bmode==='use')[['res','Turar joy'],['com','Savdo / ofis'],['soc','Ijtimoiy'],['ind','Sanoat / ombor'],['other','Boshqa']].forEach(([k,n])=>it.push([USEC[k],T(n),'f']));else if(L.bld)it.push([p.bld,T('Binolar'),'f']);
    if(L.green&&d.green.length)it.push([p.green,T('Yashil hududlar'),'f']);if(L.water&&(d.water.length||d.canals.length))it.push([p.water,T('Suv'),'f']);if(L.tree&&d.trees.length)it.push([p.tree,T('Daraxtlar'),'c']);if(L.atree&&d.atrees.length)it.push([p.atree,T('Daraxtlar (taxminiy, yashil hududlardan)'),'c']);if(L.site&&d.sites.length)it.push([p.site,T('Uchastka chegarasi'),'l']);if(L.rail&&d.rails.length)it.push([p.rail,T('Temir yoʻl'),'l']);
    if(L.pins){const seen={};pins.forEach(q=>{if(!seen[q.cat]){seen[q.cat]=1;it.push([q.col,T(q.cat),'c']);}});}
    const lh=20,bh=it.length*lh+16,y0=H-bh-16;s+=`<g><rect x="16" y="${y0}" width="300" height="${bh}" fill="#ffffff" fill-opacity=".9" stroke="#dedcd7"/>`;
    it.forEach(([c,n,k],i)=>{const y=y0+14+i*lh;s+=k==='c'?`<circle cx="31" cy="${y+5}" r="6" fill="${c}"/>`:k==='l'?`<rect x="24" y="${y+3}" width="14" height="4" fill="${c}"/>`:`<rect x="24" y="${y-1}" width="14" height="12" fill="${c}" stroke="#bbb" stroke-width=".5"/>`;s+=`<text x="46" y="${y+9}" font-size="12.5" fill="#3c3c3c">${esc(n)}</text>`;});s+='</g>';}
  s+=`<text x="${W-16}" y="${H-12}" font-size="11" fill="#8a877f" text-anchor="end">© OpenStreetMap · Archemistry Lab</text></svg>`;return {svg:s,W,H};}
function pxPerM(){const cam=S.cam,V=new THREE.Vector3(),W=1800;const a=V.set(0,0,0).project(cam).clone(),b=new THREE.Vector3(1,0,0).project(cam),c=new THREE.Vector3(0,1,0).project(cam);return Math.max(Math.hypot(b.x-a.x,b.y-a.y),Math.hypot(c.x-a.x,c.y-a.y))/2*W;}
function shade(hex,k){const c=new THREE.Color(hex);c.r=Math.min(1,c.r*k);c.g=Math.min(1,c.g*k);c.b=Math.min(1,c.b*k);return '#'+c.getHexString();}
async function doExport(k){const t=S.ctx.toast;
  if(k==='svg'){dl(fname('svg'),toSVG().svg,'image/svg+xml');return;}
  if(k==='alb'){const X=toSVG(),src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(X.svg);await S.ctx.putMat({id:'a3d'+Date.now().toString(36),kind:'svg',name:T('3D illyustratsiya')+' — '+(S.ctx.mode||''),src,thumb:src,aspect:X.W/X.H,sub:S.opt.view.toUpperCase()+(S.opt.explode?' · '+T('qatlamlarga ajratilgan'):''),t:new Date().toISOString()});t(T('Albomga yuborildi.'));return;}
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
