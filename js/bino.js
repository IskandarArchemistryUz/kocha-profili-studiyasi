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

const {STY,BASE,ROOF,BAL,GF,MAT,fcOf,roofOf,mass}=BINO3D;

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
const sunDir=(lat,lng)=>BINO3D.sunDir(lat,lng,UI.mon,UI.hr);
const LC=c=>BINO3D.LC(c),M=(c,o)=>BINO3D.M(UI.m,c,o),toL=p=>BINO3D.toL(p),ringsL=p=>BINO3D.ringsL(p),extr=(...a)=>BINO3D.extr(...a),edges=(...a)=>BINO3D.edges(...a),obb=r=>BINO3D.obb(r),skyTex=()=>BINO3D.skyTex();
let K=null;
/* ---------- binoni qurish ---------- */
let STAT={},CTXD=null;
function build(){if(!SC)return;if(ROOT){SC.remove(ROOT);ROOT.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  ROOT=new THREE.Group();SC.add(ROOT);const o=cur();$('#empty').hidden=!!o;
  if(!o){STAT={};renderKpi();return;}
  const x=o.x,base=turf.polygon(x.cs),c=turf.centroid(base).geometry.coordinates;K={c,kx:111320*Math.cos(c[1]*Math.PI/180),ky:110540};
  BINO3D.setK(c);const bt=BINO3D.batch(UI.m),RR=BINO3D.building(bt,x);BINO3D.finish(bt);ROOT.add(bt.root);
  const m=RR.m,REN=UI.m==='render';const {rH,glassA,wallA,balN}=RR;
  const cut=UI.tab==='kv'&&UI.cut>0&&x.kv?Math.min(UI.cut,x.fl):0;
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
