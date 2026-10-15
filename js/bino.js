/* Archemistry Lab — Bino studiyasi.
   Master rejadagi bitta binoni (kps_mr_doc → zones[].blds[]) alohida ekranda tahrirlash:
   hajm (qavatlar, tijorat qavatlari, tom), fasad (uslub, deraza, balkon, 1-qavat, devor, karniz),
   kvartiralar (js/mr-kvartira.js) va 3D koʻrinish — Maket yoki Render (quyosh soyasi bilan).
   Oʻzgarishlar oʻsha hujjatga yoziladi — Master reja «storage» hodisasi orqali yangilanadi.
   Fasad elementlari — vizual taqdimot (konsept), ishchi chizma emas. */
(function(){
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d=0)=>(+v).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const KEY='kps_mr_doc',SEL='kps_bino_sel',CTXK='kps_bino_ctx',UIK='kps_bino_ui',FH=3.3;

/* ---------- uslublar: rang, tom va fasad toʻplami (Master rejadagi STY bilan bir xil kalitlar) ---------- */
const BASE={ww:1.6,wh:1.6,bay:3.0,sill:.85,arch:0,sh:0,bal:'none',bn:2,bf:2,gf:'door',cor:0,mat:'plaster',frame:'#ffffff'};
const STY={
  zamonaviy:{n:'Zamonaviy',wall:'#f2f0ea',roof:'#9c9a94',rf:'parapet',fc:{ww:2.4,wh:2.2,bay:3.3,sill:.5,bal:'glass',bn:2,gf:'shop',frame:'#2f3336'}},
  sovet:{n:'Sovet modernizmi',wall:'#e2e0da',roof:'#8a8984',rf:'flat',fc:{ww:1.5,wh:1.5,bay:3.0,sill:.9,bal:'loggia',bn:2,gf:'door',mat:'panel',frame:'#f4f4f0'}},
  neoklassik:{n:'Neoklassik',wall:'#efe2c4',roof:'#6f7f86',rf:'mansard',fc:{ww:1.2,wh:2.2,bay:2.7,sill:.6,bal:'french',bn:1,bf:2,gf:'shop',cor:1,mat:'stone',frame:'#ffffff'}},
  milliy:{n:'Milliy (sharqona)',wall:'#e8d3ad',roof:'#2e7f8e',rf:'dome',fc:{ww:1.4,wh:2.0,bay:3.0,sill:.7,arch:1,gf:'ayvon',cor:1,mat:'brick',frame:'#6b4a2e'}},
  yevropa:{n:'Anʼanaviy yevropa',wall:'#efe7da',roof:'#a5533b',rf:'gable',slope:35,fc:{ww:1.1,wh:1.7,bay:2.6,sill:.8,sh:1,bal:'open',bn:3,gf:'door',cor:1,frame:'#ffffff'}},
  skandinav:{n:'Skandinav',wall:'#d8d0c2',roof:'#3a3a3a',rf:'gable',slope:42,fc:{ww:1.0,wh:1.5,bay:2.4,sill:.8,gf:'door',mat:'timber',frame:'#ffffff'}},
  paxsa:{n:'Paxsa / guvala (Xorazm, Buxoro)',wall:'#d6bf94',roof:'#b9a27a',rf:'flat',fc:{ww:.8,wh:1.0,bay:3.2,sill:1.1,gf:'door',frame:'#6b4a2e'}},
  ayvon:{n:'Ayvonli hovli (Fargʻona)',wall:'#efe6d2',roof:'#8a6a4a',rf:'hip',slope:18,fc:{ww:1.2,wh:1.6,bay:3.0,sill:.8,gf:'ayvon',frame:'#6b4a2e'}},
  ortayer:{n:'Oʻrta yer dengizi',wall:'#f6f3ec',roof:'#b5583a',rf:'hip',slope:22,fc:{ww:1.0,wh:1.6,bay:2.6,sill:.8,sh:1,bal:'open',bn:2,gf:'door',frame:'#2f5d4f'}},
  machiya:{n:'Machiya (Kioto)',wall:'#e8e0d0',roof:'#4b4b4b',rf:'gable',slope:25,fc:{ww:1.6,wh:1.4,bay:2.0,sill:.8,gf:'shop',mat:'timber',frame:'#3a2a1e'}},
  qishloq:{n:'Kirpich mahalla uyi',wall:'#c9876a',roof:'#7a7f86',rf:'gable',slope:20,fc:{ww:1.2,wh:1.4,bay:3.0,sill:.9,gf:'door',mat:'brick',frame:'#ffffff'}}};
const ROOF={flat:'Tekis',parapet:'Parapet',gable:'Ikki nishabli',hip:'Toʻrt nishabli',mansard:'Mansard',dome:'Gumbaz'};
const BAL={none:'Yoʻq',open:'Ochiq',glass:'Shisha',loggia:'Lodjiya',french:'Fransuz'};
const GF={plain:'Oddiy',door:'Kirish',shop:'Vitrina',ayvon:'Ayvon'};
const MAT={plaster:'Suvoq',brick:'Gʻisht',panel:'Panel',stone:'Tosh',timber:'Yogʻoch'};
const fcOf=x=>Object.assign({},BASE,(STY[x.sty]||{}).fc||{},x.fc||{});
const roofOf=x=>{const st=STY[x.sty]||{};return {rf:x.roof||st.rf||'flat',slope:x.slope||st.slope||30,rc:x.rc||st.roof||'#8f8d88',wall:(x.fc&&x.fc.wall)||st.wall||'#f2f0ea'};};

/* ---------- hujjat ---------- */
let D=null,CUR=null,UI={tab:'fasad',m:'maket',c:'p',mon:5,hr:15,cut:0};
try{Object.assign(UI,JSON.parse(localStorage.getItem(UIK)||'{}'));}catch(_){}
const saveUI=()=>{try{localStorage.setItem(UIK,JSON.stringify(UI));}catch(_){}};
function load(){try{D=JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){D=null;}if(!D||!Array.isArray(D.zones))D=null;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(D));}catch(_){}}
function list(){const o=[];if(!D)return o;D.zones.forEach(z=>(z.blds||[]).forEach(x=>{if(x&&x.cs)o.push({z,x});}));return o;}
function selRead(){try{return JSON.parse(localStorage.getItem(SEL)||'null');}catch(_){return null;}}
function cur(){const L=list();if(!L.length)return null;const s=selRead();return (s&&L.find(o=>o.z.id===s.zid&&o.x.id===s.bid))||L[0];}
const H={u:[],r:[]};let PEND=null;
function commit(pre){if(pre&&pre!==JSON.stringify(D)){H.u.push(pre);if(H.u.length>80)H.u.shift();H.r=[];}save();}
function edit(fn){const pre=JSON.stringify(D);const o=cur();if(!o)return;fn(o.x,o.z);commit(pre);refresh();}
/* slayder: sudralayotganda faqat 3D yangilanadi; qoʻyib yuborilganda — tarix va saqlash */
function live(fn){if(!PEND)PEND=JSON.stringify(D);const o=cur();if(!o)return;fn(o.x);sched();}
function liveEnd(){if(!PEND)return;const p=PEND;PEND=null;commit(p);refresh();}
function undo(){if(!H.u.length)return;H.r.push(JSON.stringify(D));D=JSON.parse(H.u.pop());save();refresh();}
function redo(){if(!H.r.length)return;H.u.push(JSON.stringify(D));D=JSON.parse(H.r.pop());save();refresh();}

/* ---------- bino hajmi (Master rejadagi bldMass bilan bir xil) ---------- */
function mass(x){const fl=x.fl,base=turf.polygon(x.cs),nr=Math.max(0,Math.min(fl,x.nr||0));
  const TT=(x.tiers||[]).filter(t=>t.from>1&&t.from<=fl&&(t.in>0||t.cs)).sort((a,b)=>a.from-b.from);
  const cuts=[0,...TT.map(t=>t.from-1),fl].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
  if(nr>0&&nr<fl&&!cuts.includes(nr)){cuts.push(nr);cuts.sort((a,b)=>a-b);}
  const seg=[];let gfa=0,res=0;
  for(let i=0;i<cuts.length-1;i++){const f0=cuts[i],f1=cuts[i+1];if(f1<=f0)continue;const t=TT.filter(t=>t.from-1<=f0).pop();let poly=base;
    if(t&&t.cs){try{poly=turf.polygon(t.cs);}catch(_){}}
    else if(t){try{const q=turf.buffer(base,-t.in,{units:'meters'});if(q&&q.geometry&&turf.area(q)>20)poly=q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]);}catch(_){}}
    const a=turf.area(poly),n=f1-f0;gfa+=a*n;const isNr=f1<=nr;if(!isNr)res+=a*n;seg.push({f0,f1,poly,nr:isNr,a});}
  return {seg,gfa,res};}
/* kvartirografiya */
const kvTypes=()=>(D&&D.kvT&&D.kvT.length===KVART.TYPES0.length?D.kvT.map((t,i)=>Object.assign({},KVART.TYPES0[i],t)):KVART.TYPES0.map(t=>Object.assign({},t)));
function slabDims(poly){const a=turf.area(poly);let P=0;turf.flattenEach(poly,f=>{f.geometry.coordinates.forEach(r=>{P+=turf.length(turf.lineString(r),{units:'meters'});});});
  const h=P/2,disc=Math.max(0,h*h-4*a),A=(h+Math.sqrt(disc))/2;return {A,D:A?a/A:0};}
function kvOf(x,m){if(!x.kv)return null;const parts=m.seg.filter(g=>!g.nr).map(g=>Object.assign(slabDims(g.poly),{floors:g.f1-g.f0,seg:g}));if(!parts.length)return null;return KVART.building(parts,x.kv,kvTypes());}

/* ---------- 3D sahna ---------- */
const box=$('#c3');let R3,SC,CAM,CTRL,SUN,HEMI,ROOT,K0=null,DIRTY=true;
function initGL(){if(!window.THREE){$('#vnote').textContent=T('3D kutubxonasi yuklanmadi — internetni tekshiring.');return false;}
  R3=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R3.setPixelRatio(Math.min(2,devicePixelRatio||1));
  R3.shadowMap.enabled=true;R3.shadowMap.type=THREE.PCFSoftShadowMap;R3.outputEncoding=THREE.sRGBEncoding;R3.localClippingEnabled=false;
  box.appendChild(R3.domElement);SC=new THREE.Scene();
  HEMI=new THREE.HemisphereLight(0xffffff,0xb9b2a4,.62);SC.add(HEMI);
  SUN=new THREE.DirectionalLight(0xffffff,.85);SUN.castShadow=true;SUN.shadow.mapSize.set(2048,2048);SUN.shadow.bias=-.0004;SUN.shadow.normalBias=.03;SC.add(SUN);SC.add(SUN.target);
  new ResizeObserver(()=>{sizeGL();}).observe(box);
  (function loop(){requestAnimationFrame(loop);if(CTRL)CTRL.update();if(DIRTY){DIRTY=false;build();}if(CAM)R3.render(SC,CAM);})();
  return true;}
function sizeGL(){if(!R3)return;const w=box.clientWidth||1,h=box.clientHeight||1;R3.setSize(w,h);if(CAM){if(CAM.isPerspectiveCamera)CAM.aspect=w/h;else{const s=CAM.userData.s||60;CAM.left=-s*w/h;CAM.right=s*w/h;CAM.top=s;CAM.bottom=-s;}CAM.updateProjectionMatrix();}}
/* kamera: 4 ta diagonal yoʻnalishdan qoʻshni binolar eng kam toʻsadigani */
function camDir(){let best=[1,1],bs=1e9;const nb=(CTXD&&CTXD.nb)||[];[[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>{let sc=0;nb.forEach(n=>{try{const c=toL(turf.centroid(turf.polygon(n.cs)).geometry.coordinates),L=Math.hypot(c[0],c[1])||1,dot=(c[0]*d[0]+c[1]*-d[1])/(L*Math.SQRT2);if(dot>.3)sc+=n.fl*dot/Math.max(20,L);}catch(_){}});if(d[1]<0)sc+=.02;if(sc<bs){bs=sc;best=d;}});return best;}
function makeCam(size,ctr){const w=box.clientWidth||1,h=box.clientHeight||1,prev=CAM,dd=camDir();
  if(UI.c==='a'){const s=size*.85;CAM=new THREE.OrthographicCamera(-s*w/h,s*w/h,s,-s,-2000,4000);CAM.userData.s=s;CAM.position.set(ctr.x+dd[0]*size*2,ctr.y+size*2.1,ctr.z+dd[1]*size*2);}
  else{CAM=new THREE.PerspectiveCamera(35,w/h,.5,6000);CAM.position.set(ctr.x+dd[0]*size*1.7,ctr.y+size*1.1,ctr.z+dd[1]*size*2.1);}
  if(CTRL)CTRL.dispose();CTRL=new THREE.OrbitControls(CAM,R3.domElement);CTRL.target.copy(ctr);CTRL.enableDamping=true;CTRL.dampingFactor=.12;CTRL.maxPolarAngle=Math.PI*.495;CTRL.update();void prev;}
/* quyosh: NOAA soddalashtirilgan; vaqt — Toshkent (UTC+5), oyning 21-kuni */
function sunDir(lat,lng){const rad=Math.PI/180,hr=UI.hr,dt=Date.UTC(2026,UI.mon,21,0,0)+((hr-5)*3600e3),d=(dt-Date.UTC(2000,0,1,12))/864e5;
  const g=(357.529+.98560028*d)*rad,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*rad,e=(23.439-.00000036*d)*rad;
  const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L)),gmst=((18.697374558+24.06570982441908*d)%24+24)%24,H=(gmst*15+lng)*rad-ra;
  const alt=Math.asin(Math.sin(lat*rad)*Math.sin(dec)+Math.cos(lat*rad)*Math.cos(dec)*Math.cos(H)),az=Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(lat*rad)-Math.sin(lat*rad)*Math.cos(H));
  return {alt,az,v:new THREE.Vector3(Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt))};}

/* materiallar */
function tex(kind,wall){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=wall;x.fillRect(0,0,256,256);
  const dk='rgba(0,0,0,.16)',lt='rgba(255,255,255,.18)';
  if(kind==='brick'){x.fillStyle=dk;for(let r=0;r<16;r++){x.fillRect(0,r*16,256,2);for(let k=0;k<5;k++)x.fillRect(((k*64+(r%2)*32)%256),r*16,2,16);}for(let i=0;i<180;i++){x.fillStyle=Math.random()<.5?dk:lt;x.globalAlpha=.25;x.fillRect(Math.random()*256,Math.random()*256,22,8);}x.globalAlpha=1;}
  else if(kind==='panel'){x.fillStyle=dk;x.fillRect(0,0,256,3);x.fillRect(0,0,3,256);}
  else if(kind==='stone'){x.fillStyle=dk;for(let r=0;r<4;r++)x.fillRect(0,r*64,256,3);x.fillRect(0,0,2,64);x.fillRect(128,64,2,64);}
  else if(kind==='timber'){x.fillStyle=dk;for(let k=0;k<8;k++)x.fillRect(k*32,0,2,256);}
  else return null;
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;
  const rep={brick:1/2.4,panel:1/3.3,stone:1/3.3,timber:1/2.4}[kind];t.repeat.set(rep,rep);t.anisotropy=4;return t;}
const LC=c=>new THREE.Color(c).convertSRGBToLinear();
function M(col,o){const R=UI.m==='render';const p=Object.assign({color:LC(col)},o||{});
  if(R)return new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},p));
  delete p.roughness;delete p.metalness;return new THREE.MeshLambertMaterial(p);}

/* geometriya yordamchilari */
let K=null;   // lng/lat → metr (bino markazi atrofida)
const toL=p=>[(p[0]-K.c[0])*K.kx,(p[1]-K.c[1])*K.ky];
const sArea=r=>{let a=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
function ringsL(poly){const cs=poly.geometry.coordinates;return cs.map((r,i)=>{let q=r.slice(0,-1).map(toL);const a=sArea(q);if((i===0&&a<0)||(i>0&&a>0))q=q.reverse();return q;});}
function shapeOf(rings){const s=new THREE.Shape(rings[0].map(p=>new THREE.Vector2(p[0],p[1])));rings.slice(1).forEach(h=>s.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],p[1])))));return s;}
function extr(rings,h,y0,mat,cast){const g=new THREE.ExtrudeGeometry(shapeOf(rings),{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y0;m.castShadow=cast!==false;m.receiveShadow=true;return m;}
function offsetRings(poly,d){try{const q=turf.buffer(poly,d,{units:'meters',steps:2});if(!q)return null;const p=q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]);return ringsL(p);}catch(_){return null;}}
function edges(mesh,col){const e=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,25),new THREE.LineBasicMaterial({color:col||0x3c3c3c,transparent:true,opacity:.55}));e.position.copy(mesh.position);e.rotation.copy(mesh.rotation);return e;}
/* instanslar: bir xil element koʻp marta (deraza, rom, balkon) */
function IB(){const S={};const q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),m4=new THREE.Matrix4(),sc=new THREE.Vector3();
  return {add(key,geo,mat,arr){if(!S[key])S[key]={geo,mat,arr:[]};return S[key];},
    put(key,px,py,nx,ny,lx,ly,lz,sx,sy,sz){const th=Math.atan2(nx,-ny);q.setFromAxisAngle(Y,th);v.set(lx,ly,lz).applyQuaternion(q);v.x+=px;v.z+=-py;sc.set(sx,sy,sz);m4.compose(v,q,sc);S[key].arr.push(m4.clone());},
    flush(root,cast){Object.values(S).forEach(s=>{if(!s.arr.length)return;const im=new THREE.InstancedMesh(s.geo,s.mat,s.arr.length);s.arr.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=cast!==false&&!s.mat.transparent;im.receiveShadow=true;root.add(im);});}};}

/* ---------- binoni qurish ---------- */
let STAT={},CTXD=null;
function build(){if(!SC)return;if(ROOT){SC.remove(ROOT);ROOT.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  ROOT=new THREE.Group();SC.add(ROOT);const o=cur();$('#empty').hidden=!!o;
  if(!o){STAT={};renderKpi();return;}
  const x=o.x,base=turf.polygon(x.cs),c=turf.centroid(base).geometry.coordinates;K={c,kx:111320*Math.cos(c[1]*Math.PI/180),ky:110540};
  const F=fcOf(x),RF=roofOf(x),m=mass(x),REN=UI.m==='render';
  const wallCol=REN?RF.wall:'#f3f1ec',t=REN?tex(F.mat,RF.wall):null;
  const MW=M(wallCol,t?{map:t,color:LC('#ffffff')}:{}),MP=M(REN?'#8c877d':'#dcd9d2'),MR=M(REN?RF.rc:'#e6e3dc',{side:THREE.DoubleSide}),MC=M(REN?shade(RF.wall,.93):'#ecebe6');
  const MG=REN?new THREE.MeshStandardMaterial({color:0x5f7d92,roughness:.12,metalness:.55}):new THREE.MeshLambertMaterial({color:0xa9bac6});
  const MF=M(REN?F.frame:'#ffffff'),MS=M(REN?'#d9d6cf':'#f1efea'),MSH=M(REN?shade(F.frame==='#ffffff'?'#5f7d6a':F.frame,1):'#d7d4cc');
  const MRAIL=REN?new THREE.MeshStandardMaterial({color:0x2c2f33,roughness:.5,metalness:.4,transparent:true,opacity:.55}):new THREE.MeshLambertMaterial({color:0x8d8a84,transparent:true,opacity:.5});
  const MBG=REN?new THREE.MeshStandardMaterial({color:0xbfd3df,roughness:.05,metalness:.2,transparent:true,opacity:.35}):new THREE.MeshLambertMaterial({color:0xc9d6de,transparent:true,opacity:.45});
  const MDOOR=M(REN?'#3b2f27':'#b9b4aa');
  const B=IB(),BOX=new THREE.BoxGeometry(1,1,1),PL=new THREE.PlaneGeometry(1,1),ARC=new THREE.CircleGeometry(.5,18,0,Math.PI),CYL=new THREE.CylinderGeometry(.5,.5,1,12);
  B.add('glass',PL,MG);B.add('arch',ARC,MG);B.add('frame',BOX,MF);B.add('shut',BOX,MSH);B.add('slab',BOX,MS);B.add('rail',BOX,MRAIL);B.add('bglass',BOX,MBG);B.add('logg',BOX,MC);B.add('door',BOX,MDOOR);B.add('col',CYL,MF);
  let glassA=0,wallA=0,balN=0;
  const cut=UI.tab==='kv'&&UI.cut>0&&x.kv?Math.min(UI.cut,x.fl):0;
  /* hajm boʻlaklari */
  m.seg.forEach((g,si)=>{const rings=ringsL(g.poly),h=(g.f1-g.f0)*FH,y0=g.f0*FH;
    const mesh=extr(rings,h,y0,MW);ROOT.add(mesh);if(!REN)ROOT.add(edges(mesh));
    /* poydevor (sokol) va karniz */
    if(g.f0===0){const pr=offsetRings(g.poly,.06);if(pr)ROOT.add(extr(pr,.6,0,MP,false));}
    const top=m.seg[si+1];
    if(F.cor){const cr=offsetRings(g.poly,.32);if(cr)ROOT.add(extr(cr,.38,g.f1*FH-.42,MC));}
    else if(top&&g.nr){const cr=offsetRings(g.poly,.15);if(cr)ROOT.add(extr(cr,.25,g.f1*FH-.25,MC));}
    /* fasad elementlari */
    const longest=(()=>{let bi=0,bl=0;rings[0].forEach((p,i)=>{const q=rings[0][(i+1)%rings[0].length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>bl){bl=L;bi=i;}});return bi;})();
    rings.forEach((ring,ri)=>ring.forEach((A,ei)=>{const Bp=ring[(ei+1)%ring.length],dx=Bp[0]-A[0],dy=Bp[1]-A[1],L=Math.hypot(dx,dy);if(L<1.2)return;
      const ux=dx/L,uy=dy/L,nx=uy,ny=-ux;wallA+=L*h;
      const isMain=ri===0&&ei===longest;
      for(let f=g.f0;f<g.f1;f++){const y=f*FH,gnd=f===0,shopF=f<Math.max(x.nr||0,gnd&&F.gf==='shop'?1:0);
        /* 1-qavat: vitrina */
        if(shopF){const n=Math.max(1,Math.round(L/Math.max(3,F.bay*1.4))),bw=L/n,w=Math.min(bw-.5,6),hh=FH-1.0;if(w<.8)continue;
          for(let k=0;k<n;k++){const s=(k+.5)*bw,px=A[0]+ux*s,py=A[1]+uy*s;B.put('glass',px,py,nx,ny,0,y+.35+hh/2,.03,w,hh,1);glassA+=w*hh;
            B.put('frame',px,py,nx,ny,0,y+.35+hh+.05,.05,w+.2,.1,.12);B.put('frame',px,py,nx,ny,-w/2-.05,y+.35+hh/2,.05,.1,hh,.12);B.put('frame',px,py,nx,ny,w/2+.05,y+.35+hh/2,.05,.1,hh,.12);}
          if(gnd&&L>4)B.put('slab',A[0]+ux*L/2,A[1]+uy*L/2,nx,ny,0,FH-.45,.6,L-.6,.12,1.2);
          continue;}
        const n=Math.max(1,Math.floor(L/F.bay));if(L<F.ww+.8)continue;const bw=L/n;
        /* 1-qavat: ayvon (eng uzun tomonda) */
        if(gnd&&F.gf==='ayvon'&&isMain){const cn=Math.max(2,Math.round(L/3)+1);for(let k=0;k<cn;k++){const s=.3+(L-.6)*k/(cn-1);B.put('col',A[0]+ux*s,A[1]+uy*s,nx,ny,0,FH/2-.15,2.55,.3,FH-.3,.3);}
          B.put('slab',A[0]+ux*L/2,A[1]+uy*L/2,nx,ny,0,FH-.1,1.4,L,.28,2.95);B.put('slab',A[0]+ux*L/2,A[1]+uy*L/2,nx,ny,0,.08,1.4,L,.16,2.9);}
        const doors=gnd&&(F.gf==='door'||F.gf==='ayvon')&&ri===0&&L>=8?Math.max(1,Math.round(L/24)):0;
        for(let k=0;k<n;k++){const s=(k+.5)*bw,px=A[0]+ux*s,py=A[1]+uy*s;
          /* kirish eshigi */
          if(doors&&isMain&&doors>0&&(k===Math.floor(n/2)||(doors>1&&n>2&&k%Math.max(2,Math.round(n/doors))===Math.floor(n/doors/2)))){const dw=Math.min(1.8,bw-.4),dh=2.45;
            B.put('door',px,py,nx,ny,0,dh/2,.04,dw,dh,.08);B.put('frame',px,py,nx,ny,0,dh+.06,.06,dw+.2,.12,.14);B.put('slab',px,py,nx,ny,0,2.95,.75,dw+1.2,.14,1.5);continue;}
          const bal=!gnd&&F.bal!=='none'&&f+1>=F.bf&&L>=F.bay*2-.01&&ri===0&&(k%Math.max(1,F.bn)===0);
          let w=Math.min(F.ww,bw-.5),hh=Math.min(F.wh,FH-.6),sill=Math.min(F.sill,FH-hh-.25);
          if(bal&&F.bal!=='loggia'){hh=Math.min(FH-.6,Math.max(hh,2.2));sill=.05;}
          if(w<.4)continue;
          const yc=y+sill+hh/2;
          B.put('glass',px,py,nx,ny,0,yc,.03,w,hh,1);glassA+=w*hh;
          if(F.arch&&!bal){B.put('arch',px,py,nx,ny,0,yc+hh/2,.03,w,w,1);glassA+=Math.PI*w*w/8;}
          const ft=.08;B.put('frame',px,py,nx,ny,0,yc+hh/2+ft/2+(F.arch&&!bal?w/2:0),.05,w+2*ft,ft,.12);B.put('frame',px,py,nx,ny,0,yc-hh/2-ft/2,.08,w+.24,ft,.2);
          B.put('frame',px,py,nx,ny,-w/2-ft/2,yc,.05,ft,hh,.12);B.put('frame',px,py,nx,ny,w/2+ft/2,yc,.05,ft,hh,.12);
          if(w>1.5)B.put('frame',px,py,nx,ny,0,yc,.05,.06,hh,.08);
          if(F.sh&&!bal){B.put('shut',px,py,nx,ny,-w/2-w/4-.08,yc,.06,w/2,hh,.05);B.put('shut',px,py,nx,ny,w/2+w/4+.08,yc,.06,w/2,hh,.05);}
          if(bal){balN++;const bwid=Math.min(bw-.3,w+1.0);
            if(F.bal==='french'){B.put('slab',px,py,nx,ny,0,y+.06,.2,w+.4,.12,.4);B.put('rail',px,py,nx,ny,0,y+.55,.38,w+.4,.95,.03);}
            else if(F.bal==='loggia'){B.put('logg',px,py,nx,ny,0,y+FH/2,.65,bwid,FH-.04,1.3);B.put('glass',px,py,nx,ny,0,y+1.0+(FH-1.35)/2,1.31,bwid-.3,FH-1.35,1);}
            else{B.put('slab',px,py,nx,ny,0,y+.08,.7,bwid,.16,1.4);const RK=F.bal==='glass'?'bglass':'rail';
              B.put(RK,px,py,nx,ny,0,y+.6,1.38,bwid,1.0,.03);B.put(RK,px,py,nx,ny,-bwid/2,y+.6,.7,.03,1.0,1.4);B.put(RK,px,py,nx,ny,bwid/2,y+.6,.7,.03,1.0,1.4);}}}}}));
  });
  B.flush(ROOT);
  /* tom */
  const topSeg=m.seg[m.seg.length-1],H0=topSeg.f1*FH;let rH=0;
  if(RF.rf==='parapet'){const inn=offsetRings(topSeg.poly,-.3);const out=ringsL(topSeg.poly);if(inn){const r=[out[0]].concat(inn.slice(0,1).map(q=>q.slice().reverse()));const pm=extr(r,1.0,H0,MC);ROOT.add(pm);if(!REN)ROOT.add(edges(pm));rH=1;}}
  else if(RF.rf!=='flat'){const g=roofGeo(ringsL(topSeg.poly)[0],RF,H0);if(g){const rm=new THREE.Mesh(g.geo,MR);rm.castShadow=rm.receiveShadow=true;ROOT.add(rm);if(!REN)ROOT.add(edges(rm,0x555555));rH=g.h;
    if(g.gab){const gm=new THREE.Mesh(g.gab,MW);gm.castShadow=true;ROOT.add(gm);}}}
  /* kvartira kesimi */
  if(cut){const R=kvOf(x,m),fl=cut,p=R&&R.parts.find(p=>p.seg.f0<fl&&fl<=p.seg.f1);
    R3.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),(fl-1)*FH+1.25)];
    if(p){const v=p.V[Math.min(x.kv.pick||0,p.V.length-1)],G=p.G,ring=ringsL(p.seg.poly)[0],ob=obb(ring),TY=kvTypes(),y=(fl-1)*FH+.05;
      const sx=(ob.x1-ob.x0)/G.A,sy=(ob.y1-ob.y0)/G.D;
      const tile=(a,b,t0,t1,col)=>{const w=(b-a)*sx-.12,d=(t1-t0)*sy-.12;if(w<=0||d<=0)return;const pm=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:LC(col),toneMapped:false}));
        pm.rotation.x=-Math.PI/2;const u=ob.x0+(a+b)/2*sx,vv=ob.y0+(t0+t1)/2*sy,P=ob.w(u,vv);pm.position.set(P[0],y,-P[1]);pm.rotation.z=ob.a;ROOT.add(pm);};
      G.circ.forEach(c=>tile(c.s0,c.s1,c.t0,c.t1,'#d9d7d2'));G.cores.forEach(([a,b])=>tile(a,b,0,G.D,'#58666c'));
      if(v)v.units.forEach(u=>tile(u.a,u.b,u.t0,u.t1,u.type>=0?TY[u.type].color:'#b9a98f'));}}
  else R3.clippingPlanes=[];
  /* atrof: kvartal va qoʻshni binolar */
  const ctx=CTXD=(()=>{try{return JSON.parse(localStorage.getItem(CTXK)||'null');}catch(_){return null;}})();
  const MN=M(REN?'#dedad2':'#fbfaf8'),MB=M(REN?'#d8d3c8':'#e2dfd8'),MGR=M(REN?'#b9b6a8':'#e4e1da');
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),MGR);gnd.rotation.x=-Math.PI/2;gnd.position.y=-.02;gnd.receiveShadow=true;ROOT.add(gnd);
  if(ctx&&ctx.blk){try{const bm=extr(ringsL(turf.polygon([ctx.blk])),.03,-.01,MB,false);bm.castShadow=false;ROOT.add(bm);}catch(_){}}
  if(ctx&&ctx.nb&&!cut)ctx.nb.forEach(n=>{try{const nm=extr(ringsL(turf.polygon(n.cs)),Math.max(1,n.fl)*FH,0,MN);ROOT.add(nm);if(!REN)ROOT.add(edges(nm,0xb0aca4));}catch(_){}});
  /* yorugʻlik, kamera, fon */
  const bb=turf.bbox(base),size=Math.max(30,Math.hypot((bb[2]-bb[0])*K.kx,(bb[3]-bb[1])*K.ky),x.fl*FH*1.2);
  const sd=sunDir(c[1],c[0]),dir=sd.alt>.03?sd.v:new THREE.Vector3(.3,.15,.4).normalize();
  SUN.position.copy(dir.clone().multiplyScalar(size*4));SUN.target.position.set(0,0,0);const sc=SUN.shadow.camera,ext=size*1.6;sc.left=-ext;sc.right=ext;sc.top=ext;sc.bottom=-ext;sc.near=1;sc.far=size*10;sc.updateProjectionMatrix();
  SUN.intensity=REN?(sd.alt>.03?1.15:.25):.7;HEMI.intensity=REN?.55:.75;SUN.castShadow=REN||UI.m==='maket';
  SC.background=REN?skyTex():new THREE.Color(0xeceae5);SC.fog=REN?new THREE.Fog(0xdfe4e6,size*6,size*18):null;R3.toneMapping=REN?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;R3.toneMappingExposure=1.05;
  const key=o.z.id+'/'+o.x.id+'/'+UI.c;if(K0!==key){K0=key;makeCam(size,new THREE.Vector3(0,x.fl*FH*.4,0));sizeGL();}
  STAT={fl:x.fl,h:x.fl*FH+rH,gfa:m.gfa,res:m.res,wwr:wallA?glassA/wallA:0,bal:balN,kv:x.kv?kvOf(x,m):null};renderKpi();}
function shade(hex,k){const c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString();}
let SKY=null;function skyTex(){if(SKY)return SKY;const c=document.createElement('canvas');c.width=2;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#9fbfd8');g.addColorStop(.6,'#dbe6ec');g.addColorStop(1,'#eef0ee');x.fillStyle=g;x.fillRect(0,0,2,256);SKY=new THREE.CanvasTexture(c);SKY.encoding=THREE.sRGBEncoding;return SKY;}
/* yoʻnaltirilgan chegaralovchi toʻrtburchak: eng uzun tomon boʻylab */
function obb(ring){let bi=0,bl=0;ring.forEach((p,i)=>{const q=ring[(i+1)%ring.length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>bl){bl=L;bi=i;}});
  const p=ring[bi],q=ring[(bi+1)%ring.length],a=Math.atan2(q[1]-p[1],q[0]-p[0]),ca=Math.cos(a),sa=Math.sin(a);
  const loc=ring.map(r=>[r[0]*ca+r[1]*sa,-r[0]*sa+r[1]*ca]),xs=loc.map(r=>r[0]),ys=loc.map(r=>r[1]);
  return {a,x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),w:(u,v)=>[u*ca-v*sa,u*sa+v*ca]};}
/* tom geometriyasi (OBB boʻyicha): ikki nishabli, toʻrt nishabli, mansard, gumbaz */
function roofGeo(ring,RF,H0){const o=obb(ring),ov=RF.rf==='dome'?0:.45,x0=o.x0-ov,x1=o.x1+ov,y0=o.y0-ov,y1=o.y1+ov,W=y1-y0,L=x1-x0,tn=Math.tan(Math.max(5,Math.min(60,RF.slope))*Math.PI/180);
  const P=[],G=[];const W3=(u,v,z)=>{const p=o.w(u,v);return [p[0],z,-p[1]];};
  const tri=(A,a,b,c)=>{A.push(...W3(...a),...W3(...b),...W3(...c));};const quad=(A,a,b,c,d)=>{tri(A,a,b,c);tri(A,a,c,d);};
  const hip=(A,x0,x1,y0,y1,z,t)=>{const w=y1-y0,l=x1-x0,h=Math.min(w,l)/2*t,ym=(y0+y1)/2;
    if(l>=w){const rx0=x0+w/2,rx1=x1-w/2;quad(A,[x0,y0,z],[x1,y0,z],[rx1,ym,z+h],[rx0,ym,z+h]);quad(A,[x1,y1,z],[x0,y1,z],[rx0,ym,z+h],[rx1,ym,z+h]);tri(A,[x1,y0,z],[x1,y1,z],[rx1,ym,z+h]);tri(A,[x0,y1,z],[x0,y0,z],[rx0,ym,z+h]);}
    else{const xm=(x0+x1)/2,ry0=y0+l/2,ry1=y1-l/2;quad(A,[x1,y0,z],[x1,y1,z],[xm,ry1,z+h],[xm,ry0,z+h]);quad(A,[x0,y1,z],[x0,y0,z],[xm,ry0,z+h],[xm,ry1,z+h]);tri(A,[x0,y0,z],[x1,y0,z],[xm,ry0,z+h]);tri(A,[x1,y1,z],[x0,y1,z],[xm,ry1,z+h]);}
    return h;};
  let h=0;
  if(RF.rf==='gable'){h=W/2*tn;const ym=(y0+y1)/2;quad(P,[x0,y0,H0],[x1,y0,H0],[x1,ym,H0+h],[x0,ym,H0+h]);quad(P,[x1,y1,H0],[x0,y1,H0],[x0,ym,H0+h],[x1,ym,H0+h]);
    const gx0=o.x0,gx1=o.x1;tri(G,[gx1,o.y0,H0],[gx1,o.y1,H0],[gx1,ym,H0+(W/2-ov)*tn]);tri(G,[gx0,o.y1,H0],[gx0,o.y0,H0],[gx0,ym,H0+(W/2-ov)*tn]);}
  else if(RF.rf==='hip')h=hip(P,x0,x1,y0,y1,H0,tn);
  else if(RF.rf==='mansard'){const d=1.1,z1=H0+2.7;quad(P,[x0,y0,H0],[x1,y0,H0],[x1-d,y0+d,z1],[x0+d,y0+d,z1]);quad(P,[x1,y0,H0],[x1,y1,H0],[x1-d,y1-d,z1],[x1-d,y0+d,z1]);quad(P,[x1,y1,H0],[x0,y1,H0],[x0+d,y1-d,z1],[x1-d,y1-d,z1]);quad(P,[x0,y1,H0],[x0,y0,H0],[x0+d,y0+d,z1],[x0+d,y1-d,z1]);
    h=2.7+hip(P,x0+d,x1-d,y0+d,y1-d,z1,Math.tan(18*Math.PI/180));}
  else if(RF.rf==='dome'){const r=Math.max(2,Math.min(W*.42,12)),dr=Math.max(.8,r*.3),cu=(o.x0+o.x1)/2,cv=(o.y0+o.y1)/2,cp=o.w(cu,cv);
    const geo=new THREE.Group();const dg=new THREE.CylinderGeometry(r*1.04,r*1.04,dr,32);dg.translate(cp[0],H0+dr/2,-cp[1]);const sg=new THREE.SphereGeometry(r,32,16,0,Math.PI*2,0,Math.PI/2);sg.translate(cp[0],H0+dr,-cp[1]);
    const merged=mergeGeo([dg,sg]);void geo;return {geo:merged,h:dr+r};}
  else return null;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.computeVertexNormals();
  let gab=null;if(G.length){gab=new THREE.BufferGeometry();gab.setAttribute('position',new THREE.Float32BufferAttribute(G,3));gab.computeVertexNormals();}
  return {geo,gab,h};}
function mergeGeo(gs){const P=[],N=[];gs.forEach(g=>{const n=g.index?g.toNonIndexed():g;P.push(...n.attributes.position.array);N.push(...n.attributes.normal.array);});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));return g;}
let schedT=0;function sched(){if(schedT)return;schedT=requestAnimationFrame(()=>{schedT=0;DIRTY=true;});}

/* ---------- koʻrsatkichlar ---------- */
function renderKpi(){const s=STAT,el=$('#kpis');if(!s.fl){el.innerHTML='';return;}
  const kv=s.kv&&s.kv.n?fmt(s.kv.n):'~'+fmt(s.res*.78/62);
  const c=(v,l,t)=>`<div class="kpi" title="${esc(T(t||''))}"><b>${v}</b><span>${esc(T(l))}</span></div>`;
  el.innerHTML=c(s.fl,'Qavat')+c(fmt(s.h,1)+' m','Balandlik')+c(fmt(s.gfa)+' m²','Umumiy maydon (GFA)')+c(kv,'Xonadonlar',s.kv?'Kvartirografiya boʻyicha':'Taxmin: turar joy maydoni × 0,78 / 62 m². Aniq son — «Kvartiralar» tabida.')+
    c(Math.round(s.wwr*100)+' %','Derazalar ulushi','Oyna yuzasi / tashqi devor yuzasi (WWR). Turar joyda odatda 20–40 %.')+c(s.bal,'Balkonlar');}

/* ---------- panel ---------- */
const rg=(id,l,v,min,max,st,u)=>`<label class="rg"><span>${esc(T(l))}</span><output id="${id}O">${fmt(v,st<1?1:0)}${u||''}</output><input type="range" id="${id}" min="${min}" max="${max}" step="${st}" value="${v}"></label>`;
const seg=(attr,obj,val)=>`<div class="seg" role="group">${Object.entries(obj).map(([k,n])=>`<button data-${attr}="${k}" aria-pressed="${val===k}">${esc(T(n))}</button>`).join('')}</div>`;
function renderSel(){const L=list(),o=cur(),s=$('#bSel');s.innerHTML=L.map(({z,x})=>`<option value="${z.id}/${x.id}" ${o&&o.z===z&&o.x===x?'selected':''}>${esc(z.name||T('Kvartal')+' '+z.id)} · ${x.id}-${esc(T('bino'))} · ${x.fl} ${esc(T('qavat'))}</option>`).join('');s.hidden=!L.length;}
function renderPane(){const o=cur(),P=$('#pane');$$('.tabs [data-t]').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===UI.tab));
  if(!o){P.innerHTML=`<p class="note">${esc(T('Bino tanlanmagan.'))}</p>`;return;}
  const x=o.x,F=fcOf(x),RF=roofOf(x);let h='';
  if(UI.tab==='hajm'){h=`<div class="sec"><span class="lb">${esc(T('Qavatlar'))}</span><div class="fl"><button id="flDn">−</button><b>${x.fl}</b><button id="flUp">+</button></div></div>
    <div class="sec"><span class="lb">${esc(T('Pastki tijorat qavatlari'))}</span><div class="fl"><button id="nrDn">−</button><b>${x.nr||0}</b><button id="nrUp">+</button></div><p class="note">${esc(T('Doʻkon, xizmat — fasadda vitrina boʻlib chiqadi, turar joy hisobiga kirmaydi.'))}</p></div>
    <div class="sec"><span class="lb">${esc(T('Tom'))}</span>${seg('rf',ROOF,RF.rf)}
      ${['gable','hip'].includes(RF.rf)?rg('rSl','Nishab, °',RF.slope,10,60,1):''}
      <label class="clr"><input type="color" id="rCol" value="${RF.rc}"> ${esc(T('Tom rangi'))}</label></div>
    ${(x.tiers||[]).length?`<p class="note">${esc(T('Pogʻonalar va qavat shakli Master rejada tahrirlanadi (Binolar → Tahrir).'))}</p>`:''}`;}
  else if(UI.tab==='fasad'){h=`<div class="sec"><span class="lb">${esc(T('Uslub'))}</span><div class="sty">${Object.entries(STY).map(([k,v])=>`<button data-sty="${k}" aria-pressed="${x.sty===k}"><i style="background:${v.wall}"><b style="background:${v.roof}"></b></i><span>${esc(T(v.n))}</span></button>`).join('')}</div></div>
    <div class="sec"><span class="lb">${esc(T('Derazalar'))}</span>${rg('fWw','Eni, m',F.ww,.6,4,.1)}${rg('fWh','Balandligi, m',F.wh,.6,2.8,.1)}${rg('fBay','Qadami (oʻqlar orasi), m',F.bay,1.8,7,.1)}${rg('fSill','Poldan balandligi, m',F.sill,.1,1.4,.05)}
      <label class="chk"><input type="checkbox" id="fArch" ${F.arch?'checked':''}> ${esc(T('Arkali (yarim doira tepa)'))}</label>
      <label class="chk"><input type="checkbox" id="fSh" ${F.sh?'checked':''}> ${esc(T('Darcha qopqoqlari (stavni)'))}</label>
      <label class="clr"><input type="color" id="fFr" value="${F.frame}"> ${esc(T('Rom rangi'))}</label></div>
    <div class="sec"><span class="lb">${esc(T('Balkonlar'))}</span>${seg('bal',BAL,F.bal)}
      ${F.bal!=='none'?rg('fBn','Har nechta derazada bittadan',F.bn,1,4,1)+rg('fBf','Qaysi qavatdan',F.bf,2,Math.max(2,x.fl),1):''}
      <p class="note">${esc(T('Balkonlar faqat tashqi uzun fasadlarda; balkon bor joyda deraza — balkon eshigi.'))}</p></div>
    <div class="sec"><span class="lb">${esc(T('1-qavat'))}</span>${seg('gf',GF,F.gf)}</div>
    <div class="sec"><span class="lb">${esc(T('Devor'))}</span>${seg('mat',MAT,F.mat)}<label class="clr"><input type="color" id="fWall" value="${RF.wall}"> ${esc(T('Devor rangi'))}</label>
      <label class="chk"><input type="checkbox" id="fCor" ${F.cor?'checked':''}> ${esc(T('Karniz (tepada chiqiq)'))}</label>
      <p class="note">${esc(T('Material va rang «Render» koʻrinishida chiqadi; «Maket» — oq maket.'))}</p></div>
    ${x.fc?`<button class="btn" id="fRst">${esc(T('Uslub sozlamalariga qaytarish'))}</button>`:''}`;}
  else{const m=mass(x),R=kvOf(x,m),TY=kvTypes();
    if(!x.kv){h=`<div class="sec"><span class="lb">${esc(T('Kvartirografiya'))}</span><p class="note">${esc(T('Hozir xonadonlar soni maydondan taxmin qilinadi. Hisoblasangiz — tipik qavat rejasi, kvartira turlari va soni chiqadi, 3D da qavat kesimini koʻrasiz.'))}</p><button class="btn dark" id="kvOn">${esc(T('Kvartiralarni hisoblash'))}</button></div>`;}
    else if(!R||!R.main){h=`<p class="warn">${esc(T('Korpus juda kichik — kvartira sigʻmaydi.'))}</p><button class="btn" id="kvOff">${esc(T('Oʻchirish'))}</button>`;}
    else{const pick=Math.min(x.kv.pick||0,R.main.V.length-1);
      h=`<div class="sec"><span class="lb">${esc(T('Rejalash tizimi'))}</span>${seg('kvs',KVART.SYS,x.kv.sys||'sec')}</div>
      <div class="sec"><span class="lb">${esc(T('Variantlar'))}</span><div class="kvv">${R.main.V.map((v,k)=>`<button data-kvp="${k}" aria-pressed="${k===pick}"><b>${'ABCDEF'[k]}</b><span>${v.n}</span><i>${v.counts.map((c,i)=>c?`<s style="flex:${c};background:${TY[i].color}"></s>`:'').join('')}</i></button>`).join('')}</div>
        <div style="background:#fbfaf8;border:1px solid var(--line);padding:8px">${KVART.planSVG(R.main,pick,TY,280)}</div><p class="note">${esc(T('Tipik qavat'))} · ${fmt(R.main.G.A,1)} × ${fmt(R.main.G.D,1)} m</p></div>
      <div class="sec"><span class="lb">${esc(T('3D da qavat kesimi'))}</span>${rg('kCut','Qavat (0 — oʻchiq)',UI.cut||0,0,x.fl,1)}</div>
      <div class="kv"><span>${esc(T('Xonadonlar jami'))}</span><b>${fmt(R.n)}</b><span>${esc(T('Bir qavatda'))}</span><b>${R.perFl}</b><span>${esc(T('Sotiladigan maydon'))}</span><b>${fmt(R.net)} m²</b><span>${esc(T('Samaradorlik (sotiladigan / umumiy)'))}</span><b>${(m.gfa?R.net/m.gfa:0).toFixed(2).replace('.',',')}</b></div>
      <table class="kvt"><tr><th>${esc(T('Tur'))}</th><th>${esc(T('Maqsad'))}</th><th>${esc(T('Natija'))}</th><th>${esc(T('Soni'))}</th></tr>${TY.map((t,i)=>`<tr><td><i style="background:${t.color}"></i>${esc(T(t.name))}</td><td>${Math.round(R.tgt[i]*100)}%</td><td>${Math.round(R.share[i]*100)}%</td><td>${fmt(R.counts[i])}</td></tr>`).join('')}</table>
      <p class="note">${esc(T('Turlar nisbati va maydonlari — Master reja → Tahrir → Kvartirografiya (butun loyiha uchun).'))}</p>
      <button class="btn" id="kvOff">${esc(T('Taxminga qaytarish'))}</button>`;}}
  P.innerHTML=h;bindPane();}
function bindPane(){const on=(id,f)=>{const e=$(id);if(e)e.onclick=f;};const setFc=(k,v)=>x=>{x.fc=Object.assign({},x.fc||{},{[k]:v});};
  on('#flUp',()=>edit(x=>{x.fl=Math.min(60,x.fl+1);}));on('#flDn',()=>edit(x=>{x.fl=Math.max(1,x.fl-1);if((x.nr||0)>=x.fl)x.nr=x.fl-1;}));
  on('#nrUp',()=>edit(x=>{x.nr=Math.min(x.fl-1,(x.nr||0)+1);}));on('#nrDn',()=>edit(x=>{x.nr=Math.max(0,(x.nr||0)-1);if(!x.nr)delete x.nr;}));
  $$('#pane [data-rf]').forEach(b=>b.onclick=()=>edit(x=>{x.roof=b.dataset.rf;}));
  $$('#pane [data-sty]').forEach(b=>b.onclick=()=>edit(x=>{if(x.sty===b.dataset.sty)delete x.sty;else x.sty=b.dataset.sty;delete x.roof;delete x.slope;delete x.rc;delete x.fc;}));
  $$('#pane [data-bal]').forEach(b=>b.onclick=()=>edit(setFc('bal',b.dataset.bal)));
  $$('#pane [data-gf]').forEach(b=>b.onclick=()=>edit(setFc('gf',b.dataset.gf)));
  $$('#pane [data-mat]').forEach(b=>b.onclick=()=>edit(setFc('mat',b.dataset.mat)));
  const sl=(id,fn,dec)=>{const e=$(id);if(!e)return;e.oninput=()=>{const v=+e.value;$(id+'O').textContent=fmt(v,dec);live(x=>fn(x,v));};e.onchange=liveEnd;};
  sl('#rSl',(x,v)=>{x.slope=v;},0);
  [['#fWw','ww'],['#fWh','wh'],['#fBay','bay'],['#fSill','sill']].forEach(([id,k])=>sl(id,(x,v)=>setFc(k,v)(x),k==='sill'?2:1));
  [['#fBn','bn'],['#fBf','bf']].forEach(([id,k])=>sl(id,(x,v)=>setFc(k,v)(x),0));
  const ck=(id,k)=>{const e=$(id);if(e)e.onchange=()=>edit(setFc(k,e.checked?1:0));};ck('#fArch','arch');ck('#fSh','sh');ck('#fCor','cor');
  const cl=(id,fn)=>{const e=$(id);if(!e)return;e.oninput=()=>live(x=>fn(x,e.value));e.onchange=liveEnd;};
  cl('#fFr',(x,v)=>setFc('frame',v)(x));cl('#fWall',(x,v)=>setFc('wall',v)(x));cl('#rCol',(x,v)=>{x.rc=v;});
  on('#fRst',()=>edit(x=>{delete x.fc;}));
  on('#kvOn',()=>edit(x=>{x.kv={sys:'sec',goal:.35,seed:1,pick:0};}));on('#kvOff',()=>{UI.cut=0;saveUI();edit(x=>{delete x.kv;});});
  $$('#pane [data-kvs]').forEach(b=>b.onclick=()=>edit(x=>{x.kv.sys=b.dataset.kvs;x.kv.pick=0;}));
  $$('#pane [data-kvp]').forEach(b=>b.onclick=()=>edit(x=>{x.kv.pick=+b.dataset.kvp;}));
  const kc=$('#kCut');if(kc){kc.oninput=()=>{UI.cut=+kc.value;$('#kCutO').textContent=kc.value;saveUI();sched();};}}

function refresh(){renderSel();renderPane();sched();$('#undo').disabled=!H.u.length;$('#redo').disabled=!H.r.length;}

/* ---------- boshqaruv ---------- */
$$('.tabs [data-t]').forEach(b=>b.onclick=()=>{UI.tab=b.dataset.t;saveUI();renderPane();sched();});
$('#bSel').onchange=e=>{const [z,b]=e.target.value.split('/').map(Number);localStorage.setItem(SEL,JSON.stringify({zid:z,bid:b}));UI.cut=0;refresh();};
$$('#mSeg [data-m]').forEach(b=>b.onclick=()=>{UI.m=b.dataset.m;saveUI();syncBar();sched();});
$$('#cSeg [data-c]').forEach(b=>b.onclick=()=>{UI.c=b.dataset.c;K0=null;saveUI();syncBar();sched();});
$('#sMon').onchange=e=>{UI.mon=+e.target.value;saveUI();sched();};
$('#sHr').oninput=e=>{UI.hr=+e.target.value;$('#sHrT').textContent=hm(UI.hr);saveUI();sched();};
const hm=h=>String(Math.floor(h)).padStart(2,'0')+':'+String(Math.round((h%1)*60)).padStart(2,'0');
function syncBar(){$$('#mSeg [data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===UI.m));$$('#cSeg [data-c]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===UI.c));$('#sMon').value=UI.mon;$('#sHr').value=UI.hr;$('#sHrT').textContent=hm(UI.hr);}
$('#undo').onclick=undo;$('#redo').onclick=redo;
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}});
const goMr=()=>{if(window.parent!==window)window.parent.postMessage({kps:'go',href:'muharrir.html'},location.origin);else location.href='muharrir.html';};
$('#back').onclick=goMr;$('#goMr').onclick=goMr;
/* boshqa oynadagi oʻzgarishlar (Master reja tahriri, boshqa bino tanlandi) */
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===SEL||e.key===CTXK){load();if(e.key===SEL){UI.cut=0;K0=null;}refresh();}});
/* eksport */
function png(){if(!R3)return null;R3.render(SC,CAM);return R3.domElement.toDataURL('image/png');}
$('#exPng').onclick=()=>{const u=png();if(!u)return;const a=document.createElement('a');a.href=u;a.download='bino.png';document.body.appendChild(a);a.click();a.remove();};
function matPut(o){return new Promise((res,rej)=>{const r=indexedDB.open('kps_mat',1);r.onupgradeneeded=()=>r.result.createObjectStore('mats',{keyPath:'id'});r.onsuccess=()=>{const t=r.result.transaction('mats','readwrite');t.objectStore('mats').put(o);t.oncomplete=res;t.onerror=()=>rej(t.error);};r.onerror=()=>rej(r.error);});}
$('#toAlb').onclick=()=>{const u=png(),o=cur(),b=$('#toAlb');if(!u||!o)return;const x=o.x,st=STY[x.sty];
  matPut({id:'bn'+Date.now().toString(36),kind:'png',name:T('Bino')+` ${x.id} · ${x.fl} ${T('qavat')}`+(st?' · '+T(st.n):''),src:u,thumb:u,aspect:box.clientWidth/box.clientHeight,sub:`GFA ${fmt(STAT.gfa)} m² · ${T('derazalar')} ${Math.round(STAT.wwr*100)} %`,t:new Date().toISOString()})
  .then(()=>{b.textContent=T('Yuborildi ✓');setTimeout(()=>{b.textContent=T('Albomga →');},1800);}).catch(()=>{b.textContent=T('Xato');});};

load();syncBar();if(initGL())sizeGL();refresh();
window.BINO={get D(){return D;},cur,build:()=>{DIRTY=true;},get STAT(){return STAT;},get UI(){return UI;}};
})();
