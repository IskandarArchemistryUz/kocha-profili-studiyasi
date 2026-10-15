/* Archemistry Lab — Master reja: 3D vizualizatsiya.
   Loyihaning barcha binolari fasadi bilan (js/bino3d.js: derazalar, balkonlar, tom, uslub), koʻchalar,
   kvartallar (zona boʻyicha sirt), daraxtlar. Maket yoki Render (quyosh soyasi — fasl va soat).
   Maʼlumot muharrirdan: MRVIZ.open(()=>({c, blds, blocks, streets, site})). */
(function(){
'use strict';
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const UIK='kps_viz_ui';
let UI={m:'render',mon:5,hr:16,c:'p'};try{Object.assign(UI,JSON.parse(localStorage.getItem(UIK)||'{}'));}catch(_){}
const saveUI=()=>{try{localStorage.setItem(UIK,JSON.stringify(UI));}catch(_){}};
let OV=null,R3,SC,CAM,CTRL,SUN,HEMI,ROOT,GET=null,DATA=null,DIRTY=false,RAF=0,SIZE=200,CTR=null;
function load(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
async function libs(){if(!window.THREE)await load('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');if(!THREE.OrbitControls)await load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');}
const CSS=`.vz{position:fixed;inset:0;z-index:4000;background:#eceae5;display:grid;grid-template-rows:44px minmax(0,1fr);font:14px/1.4 Archivo,system-ui,sans-serif;color:#141414}
.vz .bar{display:flex;align-items:center;gap:10px;padding:0 12px;background:#fff;border-bottom:1px solid #141414}
.vz .bar b{font:600 15px Archivo,system-ui,sans-serif;margin-right:6px}
.vz .seg{display:inline-flex;border:1px solid #dedbd4;background:#fff}.vz .seg button{border:0;border-left:1px solid #dedbd4;background:none;padding:5px 10px;font:500 12px 'IBM Plex Mono',monospace;cursor:pointer}
.vz .seg button:first-child{border-left:0}.vz .seg button[aria-pressed=true]{background:#141414;color:#fff}
.vz .sp{flex:1}.vz .btn{height:30px;padding:0 12px;border:1px solid #141414;background:#fff;font:500 12px 'IBM Plex Mono',monospace;cursor:pointer;white-space:nowrap}.vz .btn.dark{background:#141414;color:#fff}
.vz select{height:30px;border:1px solid #dedbd4;background:#fff;font:12px 'IBM Plex Mono',monospace}.vz .sun{display:flex;gap:6px;align-items:center;font:12px 'IBM Plex Mono',monospace}.vz .sun input{width:110px}
.vz .cv{position:relative;min-height:0}.vz .cv canvas{display:block}.vz .nt{position:absolute;left:12px;bottom:8px;font:11px 'IBM Plex Mono',monospace;color:#5e5c58;pointer-events:none}
.vz .ld{position:absolute;inset:0;display:grid;place-items:center;font:13px 'IBM Plex Mono',monospace;color:#5e5c58}`;
const hm=h=>String(Math.floor(h)).padStart(2,'0')+':'+String(Math.round((h%1)*60)).padStart(2,'0');
async function open(get){GET=get;if(!OV){const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);}
  OV=document.createElement('div');OV.className='vz';OV.innerHTML=`<div class="bar"><b>${esc(T('3D vizualizatsiya'))}</b>
    <div class="seg" data-g="m"><button data-m="maket">${esc(T('Maket'))}</button><button data-m="render">${esc(T('Render'))}</button></div>
    <div class="seg" data-g="c"><button data-c="p">${esc(T('Perspektiva'))}</button><button data-c="a">${esc(T('Aksonometriya'))}</button></div>
    <div class="sun"><select id="vzMon"><option value="2">${esc(T('21 mart'))}</option><option value="5">${esc(T('21 iyun'))}</option><option value="8">${esc(T('21 sentyabr'))}</option><option value="11">${esc(T('21 dekabr'))}</option></select><input type="range" id="vzHr" min="6" max="20" step="0.25"><span id="vzHrT"></span></div>
    <span class="sp"></span><button class="btn" id="vzPng">PNG</button><button class="btn dark" id="vzAlb">${esc(T('Albomga →'))}</button><button class="btn" id="vzX">✕ ${esc(T('Yopish'))}</button></div>
    <div class="cv" id="vzCv"><div class="ld" id="vzLd">${esc(T('3D tayyorlanmoqda…'))}</div><div class="nt">${esc(T('sichqoncha — aylantirish · oʻng tugma — surish · gʻildirak — masshtab · Esc — yopish'))}</div></div>`;
  document.body.appendChild(OV);sync();
  OV.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{UI.m=b.dataset.m;saveUI();sync();DIRTY=true;});
  OV.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{UI.c=b.dataset.c;saveUI();sync();makeCam();});
  OV.querySelector('#vzMon').onchange=e=>{UI.mon=+e.target.value;saveUI();light();};
  OV.querySelector('#vzHr').oninput=e=>{UI.hr=+e.target.value;OV.querySelector('#vzHrT').textContent=hm(UI.hr);saveUI();light();};
  OV.querySelector('#vzX').onclick=close;OV.querySelector('#vzPng').onclick=()=>{const u=png();if(!u)return;const a=document.createElement('a');a.href=u;a.download='vizualizatsiya.png';document.body.appendChild(a);a.click();a.remove();};
  OV.querySelector('#vzAlb').onclick=toAlb;document.addEventListener('keydown',esck);
  try{await libs();}catch(e){OV.querySelector('#vzLd').textContent=T('3D kutubxonasi yuklanmadi — internetni tekshiring.');return;}
  if(!window.BINO3D){OV.querySelector('#vzLd').textContent=T('3D moduli topilmadi.');return;}
  init();DATA=GET();DIRTY=true;}
function esck(e){if(e.key==='Escape')close();}
function close(){cancelAnimationFrame(RAF);RAF=0;document.removeEventListener('keydown',esck);if(R3){R3.dispose();R3.forceContextLoss&&R3.forceContextLoss();}R3=null;CAM=null;CTRL=null;ROOT=null;if(OV)OV.remove();OV=null;}
function sync(){if(!OV)return;OV.querySelectorAll('[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===UI.m));OV.querySelectorAll('[data-c]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===UI.c));
  OV.querySelector('#vzMon').value=UI.mon;OV.querySelector('#vzHr').value=UI.hr;OV.querySelector('#vzHrT').textContent=hm(UI.hr);}
function init(){const box=OV.querySelector('#vzCv');R3=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R3.setPixelRatio(Math.min(2,devicePixelRatio||1));
  R3.shadowMap.enabled=true;R3.shadowMap.type=THREE.PCFSoftShadowMap;R3.outputEncoding=THREE.sRGBEncoding;box.prepend(R3.domElement);SC=new THREE.Scene();
  HEMI=new THREE.HemisphereLight(0xffffff,0xb9b2a4,.6);SC.add(HEMI);SUN=new THREE.DirectionalLight(0xffffff,1);SUN.castShadow=true;SUN.shadow.mapSize.set(4096,4096);SUN.shadow.bias=-.0005;SUN.shadow.normalBias=.05;SC.add(SUN);SC.add(SUN.target);
  const rs=()=>{if(!R3)return;const w=box.clientWidth||1,h=box.clientHeight||1;R3.setSize(w,h);if(CAM){if(CAM.isPerspectiveCamera)CAM.aspect=w/h;else{const s=CAM.userData.s;CAM.left=-s*w/h;CAM.right=s*w/h;CAM.top=s;CAM.bottom=-s;}CAM.updateProjectionMatrix();}};
  new ResizeObserver(rs).observe(box);rs();
  const loop=()=>{if(!R3)return;RAF=requestAnimationFrame(loop);if(DIRTY){DIRTY=false;build();OV.querySelector("#vzLd").style.display="none";}if(CTRL)CTRL.update();if(CAM)R3.render(SC,CAM);};loop();}
function makeCam(){if(!R3||!CTR)return;const box=OV.querySelector('#vzCv'),w=box.clientWidth||1,h=box.clientHeight||1,s=SIZE;
  if(UI.c==='a'){CAM=new THREE.OrthographicCamera(-s*.6*w/h,s*.6*w/h,s*.6,-s*.6,-5000,8000);CAM.userData.s=s*.6;CAM.position.set(CTR.x+s,CTR.y+s*1.1,CTR.z+s);}
  else{CAM=new THREE.PerspectiveCamera(32,w/h,1,s*30);CAM.position.set(CTR.x+s*.75,CTR.y+s*.55,CTR.z+s*.95);}
  if(CTRL)CTRL.dispose();CTRL=new THREE.OrbitControls(CAM,R3.domElement);CTRL.target.copy(CTR);CTRL.enableDamping=true;CTRL.dampingFactor=.12;CTRL.maxPolarAngle=Math.PI*.495;CTRL.update();}
function light(){if(!SUN||!DATA)return;const B3=BINO3D,REN=UI.m==='render',sd=B3.sunDir(DATA.c[1],DATA.c[0],UI.mon,UI.hr),dir=sd.alt>.03?sd.v:new THREE.Vector3(.3,.15,.4).normalize();
  SUN.position.copy(dir.clone().multiplyScalar(SIZE*3)).add(CTR||new THREE.Vector3());SUN.target.position.copy(CTR||new THREE.Vector3());const c=SUN.shadow.camera,e=SIZE*.85;c.left=-e;c.right=e;c.top=e;c.bottom=-e;c.near=1;c.far=SIZE*8;c.updateProjectionMatrix();
  SUN.intensity=REN?(sd.alt>.03?1.15:.25):.7;HEMI.intensity=REN?.55:.75;}
/* --- sahna --- */
function build(){if(!DATA)return;if(ROOT){SC.remove(ROOT);ROOT.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  const B3=BINO3D,REN=UI.m==='render',K=B3.setK(DATA.c),toL=B3.toL;ROOT=new THREE.Group();SC.add(ROOT);
  const M=(c,o)=>B3.M(UI.m,c,o);
  const flat=(rings,y,mat)=>{try{const s=new THREE.Shape(rings[0].map(p=>new THREE.Vector2(p[0],p[1])));rings.slice(1).forEach(h=>s.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],p[1])))));const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;m.receiveShadow=true;ROOT.add(m);}catch(_){}};
  /* chegaralar */
  let xs=[],ys=[];DATA.blocks.forEach(b=>b.f.geometry.coordinates[0].forEach(p=>{const q=toL(p);xs.push(q[0]);ys.push(q[1]);}));DATA.blds.forEach(x=>x.f.geometry.coordinates[0].forEach(p=>{const q=toL(p);xs.push(q[0]);ys.push(q[1]);}));
  if(!xs.length){xs=[-100,100];ys=[-100,100];}
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),cx=(x0+x1)/2,cy=(y0+y1)/2;SIZE=Math.max(80,Math.hypot(x1-x0,y1-y0)*.75);
  const hMax=Math.max(10,...DATA.blds.map(x=>x.fl*B3.FH));CTR=new THREE.Vector3(cx,Math.min(hMax*.3,30),-cy);
  /* yer, koʻchalar, kvartallar */
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(SIZE*20,SIZE*20),M(REN?'#c9c4b6':'#e4e1da'));gnd.rotation.x=-Math.PI/2;gnd.position.set(cx,-.05,-cy);gnd.receiveShadow=true;ROOT.add(gnd);
  const MSW=M(REN?'#d2cdc2':'#eceae4'),MAS=M(REN?'#5d5f63':'#c9c6bf'),MLN=new THREE.MeshBasicMaterial({color:REN?0xf1efe8:0xffffff});
  const rib=(a,b,w,y,mat)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);if(L<.5)return;const m=new THREE.Mesh(new THREE.PlaneGeometry(L,w),mat);m.rotation.x=-Math.PI/2;m.rotation.z=Math.atan2(dy,dx);m.position.set((a[0]+b[0])/2,y,-(a[1]+b[1])/2);m.receiveShadow=true;ROOT.add(m);};
  DATA.streets.forEach(s=>{const a=toL(s.a),b=toL(s.b),w=s.w||15;rib(a,b,w,.01,MSW);rib(a,b,Math.max(3.5,w*.55),.03,MAS);
    /* oʻq chizigʻi (punktir) */
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=4;t<L-4;t+=9){const p=[a[0]+(b[0]-a[0])*t/L,a[1]+(b[1]-a[1])*t/L],q=[a[0]+(b[0]-a[0])*(t+3)/L,a[1]+(b[1]-a[1])*(t+3)/L];rib(p,q,.15,.05,MLN);}});
  const ZC={turar:'#e6e1d6',aralash:'#e3dccd',ijtimoiy:'#dfe2dc',savdo:'#e5ddd5',yashil:'#9fbf7e',texnik:'#d3d0c8'};
  DATA.blocks.forEach(b=>{const zc=REN?(ZC[b.zz]||'#e2ded4'):(b.zz==='yashil'?'#d9e4cf':'#f4f2ee');try{const r=B3.ringsL(b.f);const m=B3.extr(r,.15,0,M(zc),false);m.castShadow=false;ROOT.add(m);if(b.zz!=='yashil'){const inn=B3.offsetRings(b.f,-3);if(inn)flat(inn,.17,M(REN?'#a9c48a':'#e6ebe0'));}}catch(_){}});
  /* daraxtlar: kvartal chetida (koʻcha daraxtlari) va yashil zonada */
  const tr=[];const inB=(p,blds)=>blds.some(f=>{try{return turf.booleanPointInPolygon(p,f);}catch(_){return false;}});
  DATA.blocks.forEach(b=>{let ring;try{const q=turf.buffer(b.f,-1.6,{units:'meters'});ring=q&&(q.geometry.type==='Polygon'?q.geometry.coordinates[0]:q.geometry.coordinates[0][0]);}catch(_){}if(!ring)return;
    const bf=b.bf||[];const L=turf.length(turf.lineString(ring),{units:'meters'});const line=turf.lineString(ring);
    for(let s=4;s<L;s+=9){const p=turf.along(line,s,{units:'meters'}).geometry.coordinates;if(!inB(p,bf))tr.push(toL(p));}
    if(b.zz==='yashil'){const bb=turf.bbox(b.f);const st=9/111320;let k=0;for(let lo=bb[0];lo<bb[2];lo+=st/Math.cos(DATA.c[1]*Math.PI/180))for(let la=bb[1];la<bb[3];la+=st){k++;const p=[lo+((k*7919)%10-5)*st*.04,la+((k*104729)%10-5)*st*.04];if(turf.booleanPointInPolygon(p,b.f)&&!inB(p,bf)&&(k%3))tr.push(toL(p));}}});
  if(tr.length){const tg=new THREE.CylinderGeometry(.18,.24,1,6),cg=new THREE.IcosahedronGeometry(1,1),tm=M(REN?'#6b5640':'#cfcac0'),cm=M(REN?'#6f9a52':'#eef0ea');
    const it=new THREE.InstancedMesh(tg,tm,tr.length),ic=new THREE.InstancedMesh(cg,cm,tr.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),s=new THREE.Vector3();
    tr.forEach((p,i)=>{const k=.8+((i*37)%10)/25,h=3.2*k;m4.compose(v.set(p[0],h/2,-p[1]),q,s.set(1,h,1));it.setMatrixAt(i,m4);m4.compose(v.set(p[0],h+1.6*k,-p[1]),q,s.set(2.4*k,2.2*k,2.4*k));ic.setMatrixAt(i,m4);});
    it.castShadow=ic.castShadow=true;ic.receiveShadow=true;ROOT.add(it);ROOT.add(ic);}
  /* binolar — fasad bilan */
  const bt=B3.batch(UI.m,{edges:DATA.blds.length<=60});DATA.blds.forEach(x=>{try{B3.building(bt,x);}catch(e){console.warn('Bino 3D',e);}});ROOT.add(B3.finish(bt));
  SC.background=REN?B3.skyTex():new THREE.Color(0xeceae5);SC.fog=REN?new THREE.Fog(0xdfe4e6,SIZE*4,SIZE*14):null;R3.toneMapping=REN?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;R3.toneMappingExposure=1.05;
  if(!CAM)makeCam();light();}
function png(){if(!R3||!CAM)return null;R3.render(SC,CAM);return R3.domElement.toDataURL('image/png');}
function matPut(o){return new Promise((res,rej)=>{const r=indexedDB.open('kps_mat',1);r.onupgradeneeded=()=>r.result.createObjectStore('mats',{keyPath:'id'});r.onsuccess=()=>{const t=r.result.transaction('mats','readwrite');t.objectStore('mats').put(o);t.oncomplete=res;t.onerror=()=>rej(t.error);};r.onerror=()=>rej(r.error);});}
function toAlb(){const u=png(),b=OV.querySelector('#vzAlb');if(!u)return;const cv=R3.domElement;
  matPut({id:'vz'+Date.now().toString(36),kind:'png',name:T('3D vizualizatsiya')+' · '+T(UI.m==='render'?'Render':'Maket'),src:u,thumb:u,aspect:cv.width/cv.height,sub:`${DATA.blds.length} ${T('bino')}`,t:new Date().toISOString()})
  .then(()=>{b.textContent=T('Yuborildi ✓');setTimeout(()=>{if(OV)b.textContent=T('Albomga →');},1800);}).catch(()=>{b.textContent=T('Xato');});}
window.MRVIZ={open,close,get open_(){return !!OV;}};
})();
