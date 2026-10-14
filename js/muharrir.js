/* Archemistry Lab — Master reja muharriri (1: koʻcha tarmogʻi · 2: kvartallar va zonalash · 3: generatsiya · 4: binolarni qoʻlda tahrirlash · 5: tekshiruv linzalari).
   Tuzilma: bitta loyiha hujjati (D) → hisob zanjiri (qizil chiziqlar → kvartallar → TEP) → bitta MapLibre xaritasi.
   Kvartallar saqlanmaydi — har safar «hudud − koʻchalar» dan hosil qilinadi. Zona kvartal ichidagi
   «langar» nuqtaga bogʻlanadi: koʻcha surilsa ham zona oʻz kvartalida qoladi.
   Har oʻzgarish act() orqali: undo/redo, saqlash va qayta chizish bir joyda.
   4-bosqich: birinchi qoʻlda oʻzgarishda kvartal binolari zona yozuviga «pishiriladi» (blds, lock) — shundan keyin
   generator ularni qayta chizmaydi; koʻcha surilsa ham binolar joyida qoladi, kvartaldan chiqqani qizil boʻladi.
   Hujjat: localStorage 'kps_mr_doc' (loyiha snapshotiga kiradi). Koordinatalar [lng, lat]. */
(function(){
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d)=>v==null||!isFinite(v)?'—':v.toLocaleString('ru-RU',{maximumFractionDigits:d??(Math.abs(v)>=100?0:Math.abs(v)>=10?1:2)}).replace(/ /g,' ');
const KEY='kps_mr_doc';

/* ---------- maʼlumot: koʻcha modullari (koʻcha studiyasidan eksport) ---------- */
let MOD={dk:{},presets:[]},PRE={};
const ROADK=k=>!!(MOD.dk[k]&&MOD.dk[k].road);
function preOf(id){return PRE[id]||PRE.res||MOD.presets[0];}
function roadW(p){return p.st.filter(s=>ROADK(s[0])).reduce((a,s)=>a+s[1],0);}

/* ---------- loyiha hujjati ---------- */
/* tekshiruv sozlamalari: meʼyoriy qiymatlar boʻsh — foydalanuvchi ShNQ dan kiritadi (ref — asos bandi) */
const CHK0=()=>({md:'04-22',ins:'',dmin:'',dk:'',wz:1,step:8,ref:''});
const blank=()=>({v:1,nodes:[],edges:[],nid:1,eid:1,preset:'res',zones:[],zid:1,zcur:'turar',chk:CHK0()});
/* zonalar: rang yorugʻligi ham farq qiladi (faqat tusga tayanmaslik uchun) */
const ZT=[{k:'turar',n:'Turar joy',c:'#f1dca6'},{k:'aralash',n:'Aralash (turar + savdo)',c:'#e6b483'},{k:'ijtimoiy',n:'Ijtimoiy (maktab, bogʻcha, poliklinika)',c:'#93b9dc'},{k:'savdo',n:'Savdo / ofis',c:'#dc8f83'},{k:'yashil',n:'Yashil hudud / park',c:'#9fcb88'},{k:'texnik',n:'Muhandislik / avtoturargoh',c:'#bdb8ae'}];
const ZK=k=>ZT.find(z=>z.k===k);
const GENZ=['turar','aralash','savdo','ijtimoiy'];           // generatsiya mumkin boʻlgan zonalar
const RES_SHARE={turar:1,aralash:.7,savdo:0,ijtimoiy:0};      // GFA dagi turar joy ulushi (aralash — taxmin)
/* ---------- atamalar: ShNQ 2.07.01-23 boʻyicha (bandlar Archemistry Urban «Mavze, daha, kvartal» izohidan) ---------- */
const SIZE=[{k:'daha',n:'Daha (kvartal)',max:10,c:'#2a63d4'},{k:'mavze',n:'Mavze',max:50,c:'#de5f7c'},{k:'tuman',n:'Turar joy tumani',max:250,c:'#4aa874'}];
const sizeOf=ha=>ha==null?null:SIZE.find(x=>ha<=x.max)||{k:'katta',n:'Turar joy tumanidan katta',max:Infinity,c:'#56677d'};
const GLOS={
  daha:{t:'Daha (kvartal)',d:'Eng yaqin koʻchalar bilan chegaralangan hudud — eng kichik shaharsozlik elementi. Koʻchalar bilan boʻlinmagan, maydoni 10 ga gacha.',src:'ShNQ 2.07.01-23: 2-bob (taʼrif), 56-band (oʻlcham)',scale:1},
  mavze:{t:'Mavze',d:'Daha, mahalla yoki ularning guruhi; qizil chiziqlar bilan chegaralangan, magistral yoki tuman koʻchalari bilan boʻlinmagan hudud, 10–50 ga. Koʻp qavatli kompleks qurilishda hisobiy aholi zichligi 400 kishi/ga dan oshmasligi kerak — bu chegara har uchastkaga emas, butun mavzega tegishli.',src:'ShNQ 2.07.01-23: 56-band (oʻlcham), 84-band (400 kishi/ga)',scale:1},
  tuman:{t:'Turar joy tumani',d:'Umumiy markazga ega mavzelar guruhi; shahar ahamiyatidagi magistral koʻchalar, temir yoʻllar, tabiiy hududlar bilan boʻlinmagan, 50–250 ga. Maʼmuriy tuman (masalan, Chilonzor tumani) — boshqa tushuncha.',src:'ShNQ 2.07.01-23: 56-band',scale:1},
  kvartal:{t:'Bu muharrirda «kvartal»',d:'Koʻchalar (qizil chiziqlar) orasidan avtomatik chiqqan yer boʻlagi. Uning ShNQ toifasi maydoniga qarab aniqlanadi: 10 ga gacha — daha (kvartal), 10–50 ga — mavze oʻlchami. Kundalik nutqdagi «9-kvartal» (Chilonzor) normativ maʼnoda mavze.',src:'Toifa chegaralari: ShNQ 2.07.01-23, 56-band',scale:1},
  qizil:{t:'Qizil chiziq',d:'Koʻcha va boshqa umumiy foydalanishdagi hududni qurilish uchastkalaridan ajratuvchi chegara. Bu yerda qizil chiziqlar orasi = tanlangan koʻcha modulining toʻliq kengligi (qatnov qismi, trotuar, koʻkalamzor).',src:'Kenglik: koʻcha studiyasidagi YHQ modullari'},
  brutto:{t:'Brutto va netto zichlik',d:'Brutto — aholi butun mavze maydoniga boʻlinadi: turar joy, maktab, bogʻcha, xizmat, koʻkalamzor va avtoturargohlar yeri qoʻshiladi. Netto — faqat turar joy uchastkasiga. Shu sababli 400 kishi/ga (brutto) normasida uchastkaning oʻzida netto zichlik 1,5–2 baravar yuqori boʻladi. «Uchastkam 1 ga — demak 400 kishi» degan talqin xato.',src:'ShNQ 2.07.01-23: 84-band; zichlik jadvali, 3-izoh'},
  balans:{t:'Hudud balansi',d:'Hudud maydonining vazifalar boʻyicha taqsimoti: turar joy, ijtimoiy, savdo, yashil, koʻchalar. Yigʻindi hudud maydoniga teng boʻlishi kerak — boʻlmasa, biror yer hisobdan tushib qolgan.',src:''},
  kocha:{t:'Koʻchalar ulushi va zichligi',d:'Koʻchalar ulushi — qizil chiziqlar orasidagi yer / hudud maydoni. Koʻcha zichligi — 1 km² ga necha km koʻcha. Ikkalasi ham piyoda yurish va transport tarmogʻining toʻrliligini koʻrsatadi: siyrak tarmoqda masofalar uzayadi, bir nechta keng koʻchaga yuk tushadi.',src:'Moʻljallar: UN-Habitat, Five Principles (2014) — ≥ 30 % yer, ≥ 18 km/km²'}};
function scaleHTML(ha){if(ha==null)return '';const X=v=>Math.min(100,Math.log10(1+v)/Math.log10(1+300)*100);
  let h='<div class="gsc" aria-hidden="true"><div class="gtr">';let a=0;SIZE.forEach(x=>{h+=`<i style="left:${X(a)}%;width:${X(x.max)-X(a)}%;background:${x.c}"></i>`;a=x.max;});
  h+=`<b style="left:${X(ha)}%"></b></div><div class="gtk"><span style="left:${X(10)}%">10</span><span style="left:${X(50)}%">50</span><span style="left:${X(250)}%">250 ga</span></div></div>`;
  const s=sizeOf(ha);return h+`<p class="gnow">${fmt(ha,2)} ga → <b style="color:${s.c}">${esc(T(s.n))}</b></p>`;}
const gi=(k,ha)=>`<button class="gi" data-g="${k}"${ha!=null?` data-ha="${ha}"`:''} aria-label="${esc(T('Izoh'))}: ${esc(T((GLOS[k]||{}).t||k))}">i</button>`;
function openGlos(btn){const box=$('#gls');const k=btn.dataset.g,g=GLOS[k];if(!g)return;
  if(!box.hidden&&box.dataset.k===k+btn.dataset.ha){box.hidden=true;return;}
  const ha=btn.dataset.ha!=null?+btn.dataset.ha:null;
  box.innerHTML=`<div class="gh"><b>${esc(T(g.t))}</b><button class="gx" aria-label="${esc(T('Yopish'))}">×</button></div><p>${esc(T(g.d))}</p>${g.scale?scaleHTML(ha):''}${g.src?`<p class="gsrc">${esc(T(g.src))}</p>`:''}${['daha','mavze','tuman','kvartal','brutto'].includes(k)?`<p style="margin:8px 0 0"><a href="atamalar.html" target="_blank" rel="noopener" style="color:var(--focus)">${esc(T('Batafsil: interaktiv izoh →'))}</a></p>`:''}`;
  box.dataset.k=k+btn.dataset.ha;box.hidden=false;
  const r=btn.getBoundingClientRect(),m=$('.main').getBoundingClientRect();let x=r.left-m.left+r.width+8,y=r.top-m.top-8;
  if(x+320>m.width)x=Math.max(8,r.left-m.left-328);if(y+260>m.height)y=Math.max(8,m.height-270);if(y<8)y=8;
  if(r.top>m.bottom){x=Math.min(m.width-330,Math.max(8,r.left-m.left));y=m.height-280;}
  box.style.left=x+'px';box.style.top=y+'px';box.querySelector('.gx').onclick=()=>{box.hidden=true;};}
document.addEventListener('click',e=>{const b=e.target.closest('.gi');if(b){e.stopPropagation();openGlos(b);return;}if(!e.target.closest('#gls')){const g=$('#gls');if(g)g.hidden=true;}},true);
let D=blank();
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.v===1&&Array.isArray(v.nodes))D=Object.assign(blank(),v);D.chk=Object.assign(CHK0(),D.chk||{});}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(D));}catch(e){}}
const H={u:[],r:[]};
function act(fn){const prev=JSON.stringify(D);fn();if(JSON.stringify(D)!==prev){H.u.push(prev);if(H.u.length>200)H.u.shift();H.r=[];save();render();}}
function undo(){if(!H.u.length)return;H.r.push(JSON.stringify(D));D=JSON.parse(H.u.pop());fixSel();save();render();}
function redo(){if(!H.r.length)return;H.u.push(JSON.stringify(D));D=JSON.parse(H.r.pop());fixSel();save();render();}
const node=id=>D.nodes.find(n=>n.id===id),edge=id=>D.edges.find(e=>e.id===id);
const deg=id=>D.edges.filter(e=>e.a===id||e.b===id).length;
function addNode(ll){const n={id:D.nid++,ll:[+ll[0].toFixed(7),+ll[1].toFixed(7)]};D.nodes.push(n);return n;}
function addEdge(a,b,preset){if(a===b||D.edges.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)))return null;const e={id:D.eid++,a,b,preset};D.edges.push(e);return e;}
/* yangi koʻcha mavjudini kesib oʻtsa — kesishgan joyda chorraha (tugun) hosil boʻladi */
function addEdgeX(a,b,preset){const A=node(a),B=node(b);if(!A||!B)return;const seg=turf.lineString([A.ll,B.ll]),hits=[];
  D.edges.slice().forEach(e=>{if(e.a===a||e.b===a||e.a===b||e.b===b)return;const l=edgeLine(e);if(!l)return;
    turf.lineIntersect(seg,l).features.forEach(f=>{const c=f.geometry.coordinates;if(turf.distance(turf.point(c),turf.point(A.ll),{units:'meters'})<1||turf.distance(turf.point(c),turf.point(B.ll),{units:'meters'})<1)return;hits.push({e,c,d:turf.distance(turf.point(A.ll),turf.point(c))});});});
  hits.sort((x,y)=>x.d-y.d);let prev=a;
  hits.forEach(h=>{const cur=D.edges.includes(h.e)?h.e:D.edges.find(x=>{const l=edgeLine(x);return l&&turf.booleanPointOnLine(turf.point(h.c),l,{epsilon:1e-9});});if(!cur)return;const n=splitEdge(cur,h.c);addEdge(prev,n.id,preset);prev=n.id;});
  addEdge(prev,b,preset);}
function splitEdge(e,ll){const n=addNode(ll);D.edges=D.edges.filter(x=>x!==e);addEdge(e.a,n.id,e.preset);addEdge(n.id,e.b,e.preset);return n;}
function delEdge(id){D.edges=D.edges.filter(e=>e.id!==id);D.nodes=D.nodes.filter(n=>deg(n.id)>0);}
function delNode(id){D.edges=D.edges.filter(e=>e.a!==id&&e.b!==id);D.nodes=D.nodes.filter(n=>n.id!==id&&deg(n.id)>0);}

/* ---------- hudud (1-qadamdan) ---------- */
function siteRing(){try{const s=JSON.parse(localStorage.getItem('kps_site')||'null');if(s&&s.ring&&s.ring.length>2){const r=s.ring.map(p=>[+p[1],+p[0]]);r.push(r[0]);return r;}}catch(e){}return null;}
let SITE=null;

/* ---------- holat ---------- */
const S={tool:'street',sel:null,draw:null,cursor:null,shift:false,view:'plan',base:'sat',drag:null};
let BLK=[];   // hosil qilingan kvartallar: {f:Feature<Polygon>, ha, per, anchor:[lng,lat], z:zona yozuvi|null, name}
function fixSel(){if(S.sel&&((S.sel.t==='e'&&!edge(S.sel.id))||(S.sel.t==='n'&&!node(S.sel.id))||(S.sel.t==='bl'&&!bldRec(S.sel.zid,S.sel.bid))))S.sel=null;S.nb=null;S.arm=null;if(S.draw&&!node(S.draw))S.draw=null;}

/* ---------- xarita ---------- */
const STYLE={version:8,
  sources:{sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Esri World Imagery'},
    light:{type:'raster',tiles:['https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'],tileSize:256,maxzoom:20,attribution:'© OpenStreetMap, © CARTO'}},
  layers:[{id:'bg',type:'background',paint:{'background-color':'#e6e3db'}},{id:'sat',type:'raster',source:'sat',paint:{'raster-saturation':-.35,'raster-opacity':.9}},{id:'light',type:'raster',source:'light',layout:{visibility:'none'}}]};
const map=new maplibregl.Map({container:'map',style:STYLE,center:[69.2797,41.3111],zoom:15.5,maxPitch:70,attributionControl:{compact:true},doubleClickZoom:false,dragRotate:true});
map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
const FC=f=>({type:'FeatureCollection',features:f||[]});
let K=78271.517;   // metr → piksel: px = m · 2^z / (78271,517 · cos φ)
/* zoom faqat yuqori darajadagi interpolate kirishi boʻla oladi — minimal piksel shu ichida */
const mpx=(prop,min)=>{const v=z=>['/',['*',['get',prop],2**z],K];const w=z=>min?['max',min,v(z)]:v(z);return ['interpolate',['exponential',2],['zoom'],10,w(10),24,w(24)];};

function addLayers(){
  ['site','blocks','bsel','corr','road','sel','nodes','prev','blds','nbp','shadow','insp','dist','windc'].forEach(id=>map.addSource(id,{type:'geojson',data:FC()}));
  map.addLayer({id:'blocks-fill',type:'fill',source:'blocks',paint:{'fill-color':['get','c'],'fill-opacity':['case',['get','z'],.78,.35]}});
  map.addLayer({id:'blocks-line',type:'line',source:'blocks',paint:{'line-color':'#111','line-width':.8,'line-opacity':.45}});
  map.addLayer({id:'corr-fill',type:'fill',source:'corr',paint:{'fill-color':'#e4d9c3','fill-opacity':.92}});
  map.addLayer({id:'road',type:'line',source:'road',layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#55585c','line-width':mpx('rw')}});
  map.addLayer({id:'axis',type:'line',source:'road',paint:{'line-color':'#f7f6f2','line-width':1,'line-dasharray':[6,6],'line-opacity':.8}});
  map.addLayer({id:'red',type:'line',source:'corr',paint:{'line-color':'#b23a2e','line-width':1.4,'line-dasharray':[8,2,2,2]}});
  map.addLayer({id:'site',type:'line',source:'site',paint:{'line-color':'#111','line-width':1.8,'line-dasharray':[4,3]}});
  map.addLayer({id:'bsel',type:'line',source:'bsel',paint:{'line-color':'#2a6fb0','line-width':3,'line-dasharray':[2,1.5]}});
  map.addLayer({id:'sel',type:'line',source:'sel',paint:{'line-color':'#2a6fb0','line-width':mpx('W',4),'line-opacity':.35}});
  map.addLayer({id:'road-hit',type:'line',source:'road',paint:{'line-color':'#000','line-opacity':0,'line-width':mpx('W',14)}});
  map.addLayer({id:'prev',type:'line',source:'prev',paint:{'line-color':'#f0b323','line-width':mpx('W',3),'line-opacity':.55}});
  map.addSource('wind',{type:'image',url:BLANK,coordinates:[[69.27,41.32],[69.28,41.32],[69.28,41.31],[69.27,41.31]]});
  map.addLayer({id:'wind',type:'raster',source:'wind',layout:{visibility:'none'},paint:{'raster-opacity':.85,'raster-fade-duration':0,'raster-resampling':'linear'}});
  map.addLayer({id:'windc',type:'line',source:'windc',layout:{'line-cap':'round'},paint:{'line-color':'#1f6fb2','line-width':['interpolate',['linear'],['zoom'],14,2,17,5],'line-opacity':['get','o']}});
  map.addLayer({id:'shadow',type:'fill',source:'shadow',paint:{'fill-color':'#1f2b3d','fill-opacity':.4}});
  map.addLayer({id:'blds',type:'fill-extrusion',source:'blds',paint:{'fill-extrusion-color':['case',['get','bs'],'#7fb0e0',['get','out'],'#e8998c',['get','s'],'#cfe0f2',['get','c']],'fill-extrusion-height':['get','h'],'fill-extrusion-base':0,'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}});
  map.addLayer({id:'blds-line',type:'line',source:'blds',paint:{'line-color':'#111','line-width':.9,'line-opacity':['case',['==',['get','__p'],1],0,.85]}});
  map.addLayer({id:'dist',type:'line',source:'dist',paint:{'line-color':['get','c'],'line-width':1.8,'line-dasharray':[3,2]}});
  map.addLayer({id:'insp',type:'circle',source:'insp',paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,2,17,5],'circle-color':['get','c'],'circle-stroke-color':'#fff','circle-stroke-width':['interpolate',['linear'],['zoom'],14,0,16,1]}});
  map.addLayer({id:'nbp-fill',type:'fill',source:'nbp',paint:{'fill-color':['case',['get','ok'],'#7fb0e0','#e8998c'],'fill-opacity':.55}});
  map.addLayer({id:'nbp-line',type:'line',source:'nbp',paint:{'line-color':'#2a6fb0','line-width':1.6,'line-dasharray':[3,2]}});
  map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-radius':['case',['get','s'],7,5],'circle-color':['case',['get','s'],'#2a6fb0',['>=',['get','d'],3],'#111','#fff'],'circle-stroke-color':['case',['get','s'],'#fff','#111'],'circle-stroke-width':1.5}});
}

/* ---------- hisob zanjiri: koʻcha → qizil chiziqlar → TEP ---------- */
let CORR=null;   // koʻchalar egallagan yer (qizil chiziqlar orasidagi maydon), birlashtirilgan poligon
function edgeLine(e){const a=node(e.a),b=node(e.b);return a&&b?turf.lineString([a.ll,b.ll]):null;}
let CORR_ERR=0;
function buildCorridor(){
  const bs=[];
  for(const e of D.edges){const l=edgeLine(e);if(!l)continue;const p=preOf(e.preset);try{const b=turf.buffer(l,p.W/2,{units:'meters',steps:8});if(b)bs.push(turf.truncate(b,{precision:7}));}catch(_){}}
  if(!bs.length)return null;if(bs.length===1)return bs[0];
  try{return turf.union(turf.featureCollection(bs));}catch(err){console.warn('[MR] union',err);}
  // zaxira: bittalab, muvaffaqiyatsizini oxirida qayta urinish
  let u=bs[0],left=bs.slice(1),guard=0;CORR_ERR=0;
  while(left.length&&guard++<3){const next=[];left.forEach(b=>{try{u=turf.union(turf.featureCollection([u,b]));}catch(_){next.push(b);}});left=next;}
  CORR_ERR=left.length;return u;}
/* kvartallar = hudud − koʻcha koridorlari; hudud yoʻq boʻlsa — koʻchalar oʻrab olgan yuzalar */
const inPoly=(ll,f)=>{try{return turf.booleanPointInPolygon(turf.point(ll),f);}catch(_){return false;}};
function computeBlocks(){
  let base=SITE?turf.polygon([SITE]):null;
  if(!base&&D.edges.length>2){try{const faces=turf.polygonize(turf.featureCollection(D.edges.map(edgeLine).filter(Boolean)));if(faces.features.length)base=faces.features.length>1?turf.union(faces):faces.features[0];}catch(_){base=null;}}
  if(!base)return [];
  let rest=base;if(CORR){try{rest=turf.difference(turf.featureCollection([base,CORR]));}catch(_){rest=null;}}
  if(!rest)return [];
  const parts=[];turf.flattenEach(rest,f=>{if(f.geometry.type==='Polygon')parts.push(f);});
  const out=parts.map(f=>({f,a:turf.area(f)})).filter(x=>x.a>=300).map(x=>{const pt=turf.pointOnFeature(x.f).geometry.coordinates,c=turf.centroid(x.f).geometry.coordinates;
    return {f:x.f,ha:x.a/1e4,per:turf.length(turf.polygonToLine(x.f),{units:'meters'}),anchor:pt,c};});
  out.sort((a,b)=>(b.c[1]-a.c[1])*3+(a.c[0]-b.c[0])||0);   // shimoli-gʻarbdan janubi-sharqqa
  const used=new Set();
  out.forEach((b,i)=>{b.z=D.zones.find(z=>!used.has(z.id)&&inPoly(z.ll,b.f))||null;if(b.z)used.add(b.z.id);b.name=(b.z&&b.z.name)||('K-'+(i+1));});
  return out;}
const blockAt=ll=>BLK.find(b=>inPoly(ll,b.f));
function zoneRec(b,create){if(b.z)return D.zones.find(z=>z.id===b.z.id)||null;if(!create)return null;const r={id:D.zid++,ll:b.anchor.map(v=>+v.toFixed(7)),z:''};D.zones.push(r);return r;}
const defG=typ=>{const t=MRGEN.TYP[typ];return {typ,far:t.far,fl:t.fl,sb:t.sb};};
function genHTML(b){const z=b.z;if(!z||!GENZ.includes(z.z))return S.tool==='gen'?`<p class="note">${esc(T('Avval kvartalga turar joy, aralash, savdo yoki ijtimoiy zona bering (Z).'))}</p>`:'';
  const g=z.g;let h=`<div style="border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:10px"><span class="lb">Generatsiya</span>`;
  if(z.lock&&z.blds){const r=b.r||{};
    return h+`<p class="note"><b>${LOCK_SVG} ${esc(T('Qoʻlda tahrirlangan — qulflangan.'))}</b> ${esc(T('Koʻcha yoki parametrlar oʻzgarsa ham binolar joyida qoladi. Tahrirlash — B asbobi.'))}</p>
      <div class="kv"><span>${esc(T('Binolar'))}</span><b>${r.blds?r.blds.length:0} · ${fmt(r.flAvg,1)} ${esc(T('qavat'))}</b><span>GFA</span><b>${fmt(r.gfa,0)} m²</b><span>FAR</span><b>${fmt(r.far,2)}</b><span>${esc(T('Qoplam'))}</span><b>${r.A?fmt(r.fp/r.A*100,0):'—'} %</b>${r.kv?`<span>${esc(T('Aholi'))}</span><b>${fmt(r.pop,0)}</b>`:''}</div>
      ${r.nOut?`<p class="warnn">${esc(T('Kvartaldan chiqib ketgan binolar'))}: ${r.nOut}</p>`:''}
      <button class="btn${S.arm===z.id?' bad':''}" id="genRe">${esc(T(S.arm===z.id?'Tasdiqlang: qoʻlda oʻzgarishlar yoʻqoladi':'Qayta generatsiya'))}</button><button class="btn" id="genOff">${esc(T('Binolarni olib tashlash'))}</button></div>`;}
  if(!g)return h+`<button class="btn dark" id="genGo">${esc(T('Binolarni generatsiya qilish'))}</button></div>`;
  const r=b.r||{};
  h+=`<div class="tseg" role="group" aria-label="${esc(T('Tipologiya'))}">${Object.entries(MRGEN.TYP).map(([k,t])=>`<button data-typ="${k}" aria-pressed="${g.typ===k}">${esc(T(t.n))}</button>`).join('')}</div>
    <label class="rng"><span>FAR (maqsad) <b>${fmt(g.far,2)}</b></span><input type="range" id="gFar" min="0.2" max="6" step="0.1" value="${g.far}"></label>
    <label class="rng"><span>${esc(T('Maks. qavat'))} <b>${g.fl}</b></span><input type="range" id="gFl" min="1" max="30" step="1" value="${g.fl}"></label>
    <label class="rng"><span>${esc(T('Qizil chiziqdan chekinish'))} <b>${g.sb} m</b></span><input type="range" id="gSb" min="0" max="20" step="1" value="${g.sb}"></label>
    <div class="kv"><span>${esc(T('Binolar'))}</span><b>${r.blds?r.blds.length:0} · ${r.flAvg||0} ${esc(T('qavat'))}</b><span>GFA</span><b>${fmt(r.gfa,0)} m²</b><span>${esc(T('FAR (erishildi)'))}</span><b>${fmt(r.far,2)}</b><span>${esc(T('Qoplam'))}</span><b>${r.A?fmt(r.fp/r.A*100,0):'—'} %</b>${r.kv?`<span>${esc(T('Kvartiralar'))}</span><b>${fmt(r.kv,0)}</b><span>${esc(T('Aholi'))}</span><b>${fmt(r.pop,0)}</b><span>${esc(T('Netto zichlik'))} ${gi('brutto')}</span><b>${fmt(r.pop/b.ha,0)} ${esc(T('kishi/ga'))}</b>`:''}</div>
    ${r.capped?`<p class="warnn">${esc(T('Maks. qavat cheklovi tufayli maqsadli FAR ga yetmadi — qavatni oshiring yoki tipologiyani almashtiring.'))}</p>`:''}${r.note?`<p class="warnn">${esc(T(r.note))}</p>`:''}
    <p class="note">${esc(T('Binolar orasi va chuqurligi — taxmin; insolyatsiya va yongʻinga qarshi masofalar keyingi bosqichda tekshiriladi.'))}</p>
    <div class="brow"><button class="btn" id="genLock" title="${esc(T('Binolar hujjatga saqlanadi va generator ularni qayta chizmaydi'))}">${LOCK_SVG} ${esc(T('Qulflash'))}</button><button class="btn" id="genOff">${esc(T('Binolarni olib tashlash'))}</button></div></div>`;
  return h;}
function bindGen(b){if(!b)return;const rec=()=>zoneRec(b,true);
  const go=$('#genGo');if(go)go.onclick=()=>act(()=>{rec().g=b.z&&b.z.z==='ijtimoiy'?{typ:'perimetr',far:.6,fl:3,sb:10}:defG(b.ha<1.5?'perimetr':'seksiya');});
  $$('#panel [data-typ]').forEach(x=>x.onclick=()=>act(()=>{const g=rec().g,t=x.dataset.typ;rec().g=Object.assign(defG(t),{sb:g.sb});}));
  [['#gFar','far',parseFloat],['#gFl','fl',v=>parseInt(v,10)],['#gSb','sb',v=>parseInt(v,10)]].forEach(([id,k,cv])=>{const i=$(id);if(!i)return;
    i.oninput=()=>{const lb=i.previousElementSibling&&i.previousElementSibling.querySelector('b');if(lb)lb.textContent=k==='sb'?i.value+' m':k==='far'?(+i.value).toFixed(1).replace('.',','):i.value;};
    i.onchange=()=>act(()=>{rec().g[k]=cv(i.value);});});
  const off=$('#genOff');if(off)off.onclick=()=>{S.arm=null;act(()=>{const r=rec();delete r.g;delete r.blds;delete r.bn;delete r.lock;});};
  const lk=$('#genLock');if(lk)lk.onclick=()=>act(()=>{bake(b);});
  const re=$('#genRe');if(re)re.onclick=()=>{const r=rec();if(S.arm!==r.id){S.arm=r.id;render();return;}S.arm=null;
    act(()=>{delete r.blds;delete r.bn;delete r.lock;if(!r.g)r.g=r.z==='ijtimoiy'?{typ:'perimetr',far:.6,fl:3,sb:10}:defG(b.ha<1.5?'perimetr':'seksiya');});};}
function setZone(b,k){const r=zoneRec(b,true);r.z=k;if(!GENZ.includes(k)){delete r.g;delete r.blds;delete r.bn;delete r.lock;}if(!k&&!r.name)D.zones=D.zones.filter(z=>z.id!==r.id);}
/* ---------- 4-bosqich: binolar ---------- */
const r7=v=>+v.toFixed(7);
const cs7=cs=>cs.map(ring=>ring.map(p=>[r7(p[0]),r7(p[1])]));
const blkOfZ=zid=>BLK.find(b=>b.z&&b.z.id===zid);
/* tanlangan bino: {b, x} — x generatsiya qilingan yoki saqlangan bino ({f, fl, id, out}) */
function bldRec(zid,bid){const b=blkOfZ(zid);if(!b||!b.r)return null;const x=b.r.blds.find(x=>x.id===bid);return x?{b,x}:null;}
/* «pishirish»: generator natijasini hujjatga koʻchirish va kvartalni qulflash */
function bake(b){const rec=zoneRec(b,true);if(rec.lock&&rec.blds)return rec;
  rec.blds=(b.r?b.r.blds:[]).map((x,i)=>({id:i+1,cs:cs7(x.f.geometry.coordinates),fl:x.fl}));rec.bn=rec.blds.length+1;rec.lock=true;return rec;}
function editBld(zid,bid,fn){const b=blkOfZ(zid);if(!b)return;act(()=>{const rec=bake(b),x=rec.blds.find(x=>x.id===bid);if(x)fn(x,rec);});}
const polyOf=x=>turf.polygon(x.cs);
const insideBlk=(f,blk)=>{try{const i=turf.intersect(turf.featureCollection([f,blk]));return !!i&&turf.area(i)>=turf.area(f)*.98;}catch(_){return false;}};
function moveCs(cs,dxm,dym){const lat=cs[0][0][1],kx=1/(111320*Math.cos(lat*Math.PI/180)),ky=1/110540;return cs7(cs.map(r=>r.map(p=>[p[0]+dxm*kx,p[1]+dym*ky])));}
function rotCs(cs,deg){const f=turf.polygon(cs),c=turf.centroid(f).geometry.coordinates;return cs7(turf.transformRotate(f,deg,{pivot:c}).geometry.coordinates);}
/* yangi bino: ikki nuqtadan kvartalning asosiy yoʻnalishiga parallel toʻrtburchak */
function rectFrom(b,p1,p2){const rotA=90-MRGEN.mainBearing(b.f);const q=turf.transformRotate(turf.point(p2),rotA,{pivot:p1}).geometry.coordinates;
  const bb=[Math.min(p1[0],q[0]),Math.min(p1[1],q[1]),Math.max(p1[0],q[0]),Math.max(p1[1],q[1])];
  const w=(bb[2]-bb[0])*111320*Math.cos(p1[1]*Math.PI/180),h=(bb[3]-bb[1])*110540;
  return {f:turf.transformRotate(turf.bboxPolygon(bb),-rotA,{pivot:p1}),w,h};}
const NBMIN=6;   // m — yangi binoning eng kichik tomoni
function defFl(b){const g=b.z&&b.z.g;return g?Math.min(g.fl,Math.max(1,Math.round(b.r&&b.r.flAvg||g.fl))):5;}
function bldPop(b,x){const res=RES_SHARE[b.z.z]||0;return turf.area(x.f)*x.fl*res*KP.get('netGross')/KP.get('unitM2')*KP.get('hh');}
function bldHTML(o){const {b,x}=o,a=turf.area(x.f),pop=bldPop(b,x),locked=!!(b.z.lock&&b.z.blds);
  return `<div class="lb">${esc(T('Tanlangan bino'))} · ${esc(b.name)}</div>
    <div class="fl" role="group" aria-label="${esc(T('Qavatlar'))}"><button id="flDn" aria-label="${esc(T('Qavatni kamaytirish'))}">−</button><b>${x.fl}</b><button id="flUp" aria-label="${esc(T('Qavatni oshirish'))}">+</button><span class="note" style="margin-left:10px">${esc(T('qavat'))} · ${fmt(x.fl*MRGEN.FH,1)} m</span></div>
    <div class="kv"><span>${esc(T('Dogʻ maydoni'))}</span><b>${fmt(a,0)} m²</b><span>GFA</span><b>${fmt(a*x.fl,0)} m²</b>${pop?`<span>${esc(T('Aholi (taxmin)'))}</span><b>${fmt(pop,0)}</b>`:''}<span>${esc(T('Holat'))}</span><b>${esc(T(locked?'qoʻlda tahrirlangan':'generatsiya'))}</b></div>
    ${x.out?`<p class="warnn">${esc(T('Bino kvartal chegarasidan (qizil chiziqdan) chiqib ketgan — koʻcha yerida qurilish mumkin emas.'))}</p>`:''}
    <div class="brow"><button class="btn" id="bRotL" title="[">↺ 15°</button><button class="btn" id="bRotR" title="]">↻ 15°</button><button class="btn" id="bDup" title="Ctrl+D">${esc(T('Nusxa'))}</button><button class="btn bad" id="bDel" title="Delete">${esc(T('Oʻchirish'))}</button></div>
    ${locked?'':`<p class="note">${esc(T('Birinchi oʻzgarishda kvartal qulflanadi: binolar saqlanadi va generator ularni qayta chizmaydi.'))}</p>`}
    <div class="keys"><b>+ / −</b>${esc(T('qavat'))} · <b>←↑→↓</b>${esc(T('1 m surish'))} (<b>Shift</b> 5 m)<br><b>[ ]</b>${esc(T('burish'))} · <b>Ctrl+D</b>${esc(T('nusxa'))} · <b>Delete</b>${esc(T('oʻchirish'))}</div>
    <button class="btn" id="desel">${esc(T('Tanlovni bekor qilish'))}</button>`;}
function bindBld(o){if(!o)return;const on=(id,f)=>{const e=$(id);if(e)e.onclick=f;};
  on('#flUp',()=>bldOp('fl',1));on('#flDn',()=>bldOp('fl',-1));on('#bRotL',()=>bldOp('rot',-15));on('#bRotR',()=>bldOp('rot',15));on('#bDup',()=>bldOp('dup'));on('#bDel',()=>bldOp('del'));}
function bldOp(op,v){if(!S.sel||S.sel.t!=='bl')return;const {zid,bid}=S.sel;
  if(op==='fl')editBld(zid,bid,x=>{x.fl=Math.max(1,Math.min(60,x.fl+v));});
  else if(op==='rot')editBld(zid,bid,x=>{x.cs=rotCs(x.cs,v);});
  else if(op==='mv')editBld(zid,bid,x=>{x.cs=moveCs(x.cs,v[0],v[1]);});
  else if(op==='del'){S.sel=null;editBld(zid,bid,(x,rec)=>{rec.blds=rec.blds.filter(y=>y!==x);});}
  else if(op==='dup')editBld(zid,bid,(x,rec)=>{const f=polyOf(x),br=MRGEN.mainBearing(f)+90;
    const d=Math.min(60,Math.sqrt(turf.area(f))*.8+8);const n={id:rec.bn++,cs:cs7(turf.transformTranslate(f,d,br,{units:'meters'}).geometry.coordinates),fl:x.fl};rec.blds.push(n);S.sel={t:'bl',zid,bid:n.id};});}
/* ---------- 5-bosqich: tekshiruv linzalari ---------- */
const LENS=(()=>{try{return Object.assign({sh:false,ins:false,dist:false,wind:false},JSON.parse(localStorage.getItem('kps_mr_lens')||'{}'));}catch(_){return {sh:false,ins:false,dist:false};}})();
const saveLens=()=>{try{localStorage.setItem('kps_mr_lens',JSON.stringify(LENS));}catch(_){}};
const BLANK=(()=>{const c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL();})();
/* shamol linzasi: ERA5 shamol guli + VENT indeksi (shamol boʻlimidagi model) */
const WS=(()=>{const d={season:'yil',slice:'sutka',mode:'gul',dir:null};try{return Object.assign(d,JSON.parse(localStorage.getItem('kps_mr_wind')||'{}'));}catch(_){return d;}})();
const saveWS=()=>{try{localStorage.setItem('kps_mr_wind',JSON.stringify(WS));}catch(_){}};
let ROSE=null,ROSEst='',WIND=null,WINDK='',WINDT=0,GRIDK='',GRID=null;
function ensureRose(){if(ROSE||ROSEst==='load')return;const o=origin();ROSEst='load';
  VENT.loadRoses(o[1],o[0]).then(r=>{ROSE=r;ROSEst='ok';WINDK='';render();}).catch(e=>{ROSEst='err';ROSE=null;console.warn('[MR] ERA5',e);renderLens();});}
const roseNow=()=>ROSE&&ROSE[WS.season]&&ROSE[WS.season][WS.slice];
const domDir=R=>{let b=0;R.freq.forEach((f,i)=>{if(f>R.freq[b])b=i;});return b;};
function windW(){const R=roseNow();if(!R)return null;if(WS.mode==='one'){const w=new Array(16).fill(0);w[WS.dir!=null?WS.dir:domDir(R)]=1;return w;}
  const s=R.freq.reduce((a,b)=>a+b,0)||1;return R.freq.map(f=>f/s);}
function windRun(L,F){const site=SITE?SITE.map(F.xy):null,pts=site||L.flatMap(b=>b.cs[0].map(F.xy));
  let bb=[Infinity,Infinity,-Infinity,-Infinity];pts.forEach(p=>{bb[0]=Math.min(bb[0],p[0]);bb[1]=Math.min(bb[1],p[1]);bb[2]=Math.max(bb[2],p[0]);bb[3]=Math.max(bb[3],p[1]);});
  bb=[bb[0]-250,bb[1]-250,bb[2]+250,bb[3]+250];const gk=bb.map(v=>Math.round(v)).join(',');if(gk!==GRIDK){GRIDK=gk;GRID=VENT.makeGrid(bb);}const g=GRID;
  const list=L.map(b=>({pts:b.cs[0].slice(0,-1).map(F.xy),h:b.h})),geo=VENT.geometry(list,g),w=windW(),only=[];w.forEach((v,k)=>{if(v>0)only.push(k);});
  const P=VENT.ventilate(geo,g,{},only),idx=new Float32Array(g.N);only.forEach(k=>{const v=P[k];for(let q=0;q<g.N;q++)idx[q]+=w[k]*v[q];});
  /* koʻrsatkichlar: hudud ichidagi ochiq (bino bilan band boʻlmagan) kataklar */
  let n=0,sum=0,st=0;for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const q=j*g.nx+i;if(geo.lp[q]>.5)continue;const x=g.x0+(i+.5)*g.dx,y=g.y0+(j+.5)*g.dx;
    if(site&&!vInPoly(x,y,site))continue;n++;sum+=idx[q];if(idx[q]<.45)st++;}
  
  /* rasm: turgʻunlik shkalasi (shamol boʻlimidagi bilan bir xil) */
  const c=document.createElement('canvas');c.width=g.nx;c.height=g.ny;const x2=c.getContext('2d',{willReadFrequently:true})   /* GPU-kanvas emas: putImageData tez */,im=x2.createImageData(g.nx,g.ny),d=im.data;
  const stops=[[0,[250,214,120]],[.5,[232,120,58]],[1,[160,30,30]]],ramp=t=>{t=Math.max(0,Math.min(1,t));for(let s=1;s<stops.length;s++)if(t<=stops[s][0]){const [a,ca]=stops[s-1],[b,cb]=stops[s],u=(t-a)/(b-a);return ca.map((v,i)=>v+(cb[i]-v)*u);}return stops[2][1];};
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const q=j*g.nx+i,o=((g.ny-1-j)*g.nx+i)*4,t=(.92-idx[q])/.6;if(t>.05&&geo.lp[q]<.5){const col=ramp(t);d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=Math.round(Math.min(.85,.2+t*.7)*255);}}
  x2.putImageData(im,0,0);
  const x1=g.x0+g.nx*g.dx,y1=g.y0+g.ny*g.dx;
  return {url:c.toDataURL(),coords:[F.ll([g.x0,y1]),F.ll([x1,y1]),F.ll([x1,g.y0]),F.ll([g.x0,g.y0])],mean:n?sum/n:null,stag:n?st/n:null,n,dx:g.dx,w};}
function vInPoly(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
/* shamol yoʻlaklari: koʻcha yoʻnalishi shamol yoʻnalishlariga qanchalik parallel (chastota bilan tortilgan |cos|) */
function corridors(w){let tot=0,good=0;const f=[];D.edges.forEach(e=>{const l=edgeLine(e);if(!l)return;const a=node(e.a).ll,b=node(e.b).ll,br=turf.bearing(a,b)*Math.PI/180,len=turf.length(l,{units:'meters'});
  let al=0;w.forEach((v,k)=>{if(v)al+=v*Math.abs(Math.cos(br-k*22.5*Math.PI/180));});tot+=len;if(al>=.8)good+=len;
  f.push({type:'Feature',properties:{o:al>=.8?.9:al>=.65?.35:0,al},geometry:l.geometry});});return {fc:FC(f),share:tot?good/tot:null};}
function roseSVG(R){const c=58,rm=48,mx=Math.max(...R.freq,.01),pt=(a,r)=>`${(c+Math.sin(a)*r).toFixed(1)},${(c-Math.cos(a)*r).toFixed(1)}`,sel=WS.mode==='one'?(WS.dir!=null?WS.dir:domDir(R)):-1;
  let s=`<svg viewBox="0 0 116 116" width="116" height="116" class="rose" role="img" aria-label="${esc(T('Shamol guli'))}"><circle cx="${c}" cy="${c}" r="${rm}" fill="none" stroke="#d9d3c8"/><circle cx="${c}" cy="${c}" r="${rm/2}" fill="none" stroke="#d9d3c8"/>`;
  for(let k=0;k<16;k++){const a0=(k*22.5-10)*Math.PI/180,a1=(k*22.5+10)*Math.PI/180,rr=9+(rm-9)*R.freq[k]/mx;
    s+=`<polygon data-wd="${k}" points="${pt(a0,6)} ${pt(a0,rm)} ${pt(a1,rm)} ${pt(a1,6)}" fill="transparent" style="cursor:pointer"><title>${VENT.NAMES[k]} ${Math.round(R.freq[k]*100)} %</title></polygon><polygon points="${pt(a0,9)} ${pt(a0,rr)} ${pt(a1,rr)} ${pt(a1,9)}" fill="${k===sel?'#c2432b':'#1d1b18'}" fill-opacity="${k===sel?1:.7}" pointer-events="none"/>`;}
  [['N',c,8],['E',111,c+3],['S',c,114],['W',5,c+3]].forEach(([t,x,y])=>s+=`<text x="${x}" y="${y}" text-anchor="middle" font-size="8" font-family="IBM Plex Mono,monospace" fill="#6f6a61">${t}</text>`);
  return s+'</svg>';}
let HR=11,PLAY=0,SHK='',INS=null,INSK='',INST=0,DST=null;
const chk=()=>D.chk||(D.chk=CHK0());
function origin(){if(SITE){const c=turf.center(turf.polygon([SITE])).geometry.coordinates;return c;}const b=BLK.find(b=>b.r);return b?b.c:(D.nodes[0]||{ll:[69.28,41.31]}).ll;}
/* tekshiriladigan binolar roʻyxati (hamma kvartallardan) */
function bldList(){const out=[];BLK.forEach(b=>{if(!b.r)return;const res=(RES_SHARE[b.z.z]||0)>0;b.r.blds.forEach(x=>out.push({cs:x.f.geometry.coordinates,h:x.fl*MRGEN.FH,res,zid:b.z.id,bid:x.id,name:b.name}));});return out;}
const busy=()=>!!((S.drag&&S.drag.moved)||(S.bdrag&&S.bdrag.moved));
function insColor(best,thr){if(thr)return best>=thr?'#2e7d4f':'#b3261e';const t=Math.min(1,best/6);return `hsl(${t*45},${best?85:0}%,${30+t*25}%)`;}
function renderLensMap(){if(!map.getSource('shadow'))return;const L=bldList(),o=origin(),F=MRCHK.frame(o[1],o[0]),c=chk(),geo=JSON.stringify(L.map(b=>[b.cs,b.h]));
  /* soya */
  if(LENS.sh&&L.length){if(!busy()){const k=geo+c.md+HR;if(k!==SHK){SHK=k;const sh=MRCHK.shadows(L,MRCHK.sun(c.md,HR,o[1],o[0]),F);map.getSource('shadow').setData(sh||FC());}}}
  else{SHK='';map.getSource('shadow').setData(FC());}
  /* masofalar */
  DST=null;if(LENS.dist&&L.length>1){DST=MRCHK.distances(L,F,c);DST.L=L;
    map.getSource('dist').setData(FC(DST.pairs.map(p=>({type:'Feature',properties:{c:p.ok===false?'#b3261e':p.ok?'#2e7d4f':'#111'},geometry:{type:'LineString',coordinates:[p.a,p.c]}}))));}
  else map.getSource('dist').setData(FC());
  /* insolyatsiya — ogʻir hisob: kechiktirilgan, surish paytida emas */
  if(LENS.ins&&L.some(b=>b.res)){const k=geo+c.md+c.wz+c.step;
    if(k!==INSK&&!busy()){INSK=k;INS=null;clearTimeout(INST);INST=setTimeout(()=>{const t0=performance.now();const r=MRCHK.insolation(L,F,{md:c.md,lat:o[1],lng:o[0],wz:c.wz,step:c.step});r.L=L;r.ms=performance.now()-t0;INS=r;paintIns();renderPanel();renderLens();},250);}
    paintIns();}
  else{INSK='';INS=null;map.getSource('insp').setData(FC());}
  /* shamol */
  const wl=map.getLayer('wind');
  if(LENS.wind){ensureRose();const w=windW();
    if(w){const cr=corridors(w);map.getSource('windc').setData(cr.fc);if(WIND)WIND.cshare=cr.share;
      if(L.length){const k=geo+WS.season+WS.slice+WS.mode+WS.dir;if(k!==WINDK&&!busy()){WINDK=k;clearTimeout(WINDT);WINDT=setTimeout(()=>{const t0=performance.now();const r=windRun(L,F);r.ms=performance.now()-t0;r.cshare=cr.share;WIND=r;
        map.getSource('wind').updateImage({url:r.url,coordinates:r.coords});map.setLayoutProperty('wind','visibility','visible');renderPanel();renderLens();},200);}}
      else{WIND=null;WINDK='';map.setLayoutProperty('wind','visibility','none');}}
    if(WIND&&wl)map.setLayoutProperty('wind','visibility','visible');}
  else{WINDK='';if(wl)map.setLayoutProperty('wind','visibility','none');map.getSource('windc').setData(FC());}
  renderDLabels();}
function paintIns(){const src=map.getSource('insp');if(!src)return;const thr=+chk().ins;src.setData(FC(INS?INS.pts.map(p=>({type:'Feature',properties:{c:insColor(p.best,thr)},geometry:{type:'Point',coordinates:p.ll}})):[]));}
function renderDLabels(){let box=$('#dlabels');if(!box){box=document.createElement('div');box.id='dlabels';box.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden';$('#labels').after(box);}
  if(!DST||map.getZoom()<15.5){box.innerHTML='';return;}
  box.innerHTML=DST.pairs.map(p=>{const q=map.project([(p.a[0]+p.c[0])/2,(p.a[1]+p.c[1])/2]),col=p.ok===false?'#b3261e':p.ok?'#2e7d4f':'#111';
    return `<div class="dl" style="left:${q.x}px;top:${q.y}px;color:${col}">${fmt(p.d,1)}${p.req?' / '+fmt(p.req,1):''} m</div>`;}).join('');}
/* yon paneldagi «Linzalar» bloki */
function renderLens(){const el=$('#lens');if(!el)return;const c=chk(),o=origin(),[sr,ss]=MRCHK.dayLen(c.md,o[1],o[0]);
  if(sr!=null)HR=Math.min(Math.max(HR,Math.ceil(sr*4)/4),Math.floor(ss*4)/4);
  const tg=(k,n)=>`<button data-lens="${k}" aria-pressed="${!!LENS[k]}">${esc(T(n))}</button>`;
  const D8=[['02-22','22 fevral'],['03-22','22 mart'],['04-22','22 aprel'],['06-22','22 iyun'],['08-22','22 avgust'],['09-22','22 sentabr'],['12-22','22 dekabr']];
  let h=`<div class="seg lseg" role="group" aria-label="${esc(T('Linzalar'))}">${tg('sh','Soya')}${tg('ins','Insolyatsiya')}${tg('dist','Masofalar')}${tg('wind','Shamol')}</div>
    <label class="rng" style="margin-top:8px"><span>${esc(T('Sana'))}</span><select id="lMd">${D8.map(([v,t])=>`<option value="${v}" ${c.md===v?'selected':''}>${esc(T(t))}</option>`).join('')}</select></label>`;
  if(LENS.sh)h+=`<div class="hrow"><button class="btn" id="lPlay" aria-label="${esc(T(PLAY?'Toʻxtatish':'Kun davomida koʻrsatish'))}">${PLAY?'❚❚':'▶'}</button><label class="rng" style="flex:1"><span>${esc(T('Vaqt (UTC+5)'))} <b>${MRCHK.hm(HR)}</b></span><input type="range" id="lHr" min="${Math.ceil(sr*4)/4}" max="${Math.floor(ss*4)/4}" step="0.25" value="${HR}"></label></div>
    <p class="note">${esc(T('Quyosh'))}: ${MRCHK.hm(sr)}–${MRCHK.hm(ss)}</p>`;
  if(LENS.ins)h+=`<div class="chk">${+c.ins?'':`<i style="background:${insColor(0)}"></i>0 <i style="background:${insColor(3)}"></i>3 <i style="background:${insColor(6)}"></i>6+ ${esc(T('soat uzluksiz'))}`}${+c.ins?`<b>${esc(T('Talab kiritilgan'))} (${fmt(+c.ins,2)} ${esc(T('soat'))}): <i style="background:#2e7d4f"></i> ${esc(T('bajarilgan'))} <i style="background:#b3261e"></i> ${esc(T('bajarilmagan'))}</b>`:''}</div>${LENS.ins&&!INS?`<p class="note">${esc(T('Hisoblanmoqda…'))}</p>`:''}`;
  if(LENS.wind){const R=roseNow();
    h+=`<div class="wbox"><div class="hrow" style="margin-top:10px"><label class="rng" style="flex:1"><span>${esc(T('Mavsum'))}</span><select id="wSe">${VENT.SEASONS.map(([k,n])=>`<option value="${k}" ${WS.season===k?'selected':''}>${esc(T(n))}</option>`).join('')}</select></label><label class="rng" style="flex:1"><span>${esc(T('Vaqt'))}</span><select id="wSl">${VENT.SLICES.map(([k,n])=>`<option value="${k}" ${WS.slice===k?'selected':''}>${esc(T(n))}</option>`).join('')}</select></label></div>
      <div class="seg lseg" role="group" style="margin-top:8px"><button data-wm="gul" aria-pressed="${WS.mode==='gul'}">${esc(T('Butun shamol guli'))}</button><button data-wm="one" aria-pressed="${WS.mode==='one'}">${esc(T('Bitta yoʻnalish'))}</button></div>`;
    if(ROSEst==='load')h+=`<p class="note">${esc(T('ERA5 shamol maʼlumoti yuklanmoqda (2015–2024)…'))}</p>`;
    else if(ROSEst==='err')h+=`<p class="warnn">${esc(T('Shamol maʼlumoti yuklanmadi (Open-Meteo).'))} <button class="btn" id="wRetry" style="height:26px">${esc(T('Qayta urinish'))}</button></p>`;
    else if(R){const ms=R.speed.reduce((a,v,i)=>a+v*R.freq[i],0),top=R.freq.map((f,i)=>[f,i]).sort((a,b)=>b[0]-a[0]);
      h+=`<div style="display:flex;justify-content:center;margin-top:8px">${roseSVG(R)}</div><div class="kv"><span>${esc(T('Asosiy'))}</span><b>${VENT.NAMES[top[0][1]]} ${Math.round(top[0][0]*100)} %</b><span>${esc(T('Ikkinchi'))}</span><b>${VENT.NAMES[top[1][1]]} ${Math.round(top[1][0]*100)} %</b><span>${esc(T('Shtil'))}</span><b>${Math.round(R.calm*100)} %</b><span>${esc(T('Oʻrt. tezlik'))}</span><b>${fmt(ms,1)} m/s</b></div>
        ${WS.mode==='one'?`<p class="note">${esc(T('Gul ustidagi yoʻnalishni bosing.'))}</p>`:''}
        <div class="ramp" style="background:linear-gradient(90deg,rgba(250,214,120,.3),#e8783a,#a01e1e)"></div><div class="ramp-lbl"><span>${esc(T('biroz pasaygan'))}</span><span>${esc(T('havo turib qoladi'))}</span></div>
        <div class="lg" style="margin-top:6px"><i style="height:4px;background:#1f6fb2"></i>${esc(T('Shamol yoʻlagi: koʻcha asosiy shamollarga parallel'))}</div>
        <p class="note">${esc(T('ERA5 reanalizi, 2015–2024, 10 m (Open-Meteo). Indeks — shamol boʻlimidagi soddalashtirilgan model; CFD emas, nisbiy taqqoslash uchun.'))}</p>`;}
    h+=`</div>`;}
  h+=`<p class="note">${esc(T('Normativ talablar va natijalar — Tekshiruv asbobida (T). 15 daqiqalik linza keyingi qismda.'))}</p>`;
  el.innerHTML=h;
  $$('#lens [data-lens]').forEach(b=>b.onclick=()=>{LENS[b.dataset.lens]=!LENS[b.dataset.lens];saveLens();if(!LENS.sh)stopPlay();render();});
  const md=$('#lMd');if(md)md.onchange=()=>act(()=>{chk().md=md.value;});
  const se=$('#wSe');if(se)se.onchange=()=>{WS.season=se.value;saveWS();render();};const sl=$('#wSl');if(sl)sl.onchange=()=>{WS.slice=sl.value;saveWS();render();};
  $$('#lens [data-wm]').forEach(b=>b.onclick=()=>{WS.mode=b.dataset.wm;saveWS();render();});
  $$('#lens [data-wd]').forEach(p=>p.onclick=()=>{WS.mode='one';WS.dir=+p.dataset.wd;saveWS();render();});
  const rt=$('#wRetry');if(rt)rt.onclick=()=>{ROSEst='';ensureRose();renderLens();};
  const hr=$('#lHr');if(hr){hr.oninput=()=>{HR=+hr.value;const lb=hr.previousElementSibling.querySelector('b');if(lb)lb.textContent=MRCHK.hm(HR);renderLensMap();};}
  const pl=$('#lPlay');if(pl)pl.onclick=()=>{if(PLAY){stopPlay();renderLens();return;}if(HR>=Math.floor(ss*4)/4-.01)HR=Math.ceil(sr*4)/4;
    PLAY=setInterval(()=>{HR+=.25;if(HR>Math.floor(ss*4)/4){stopPlay();HR=Math.floor(ss*4)/4;}renderLensMap();const i=$('#lHr');if(i){i.value=HR;const lb=i.previousElementSibling.querySelector('b');if(lb)lb.textContent=MRCHK.hm(HR);}if(!PLAY)renderLens();},140);renderLens();};}
function stopPlay(){if(PLAY){clearInterval(PLAY);PLAY=0;}}
/* Tekshiruv asbobi paneli */
function tekHTML(so){const c=chk(),thr=+c.ins;let h='';
  const fld=(id,k,l,ph,st)=>`<label class="fi"><span>${esc(T(l))}</span><input type="number" step="${st}" id="${id}" data-ck="${k}" value="${esc(c[k])}" placeholder="${esc(T(ph))}"></label>`;
  h+=`<p class="note">${esc(T('Muharrir oʻlchaydi; meʼyoriy qiymatlar avtomatik qoʻyilmaydi — ShNQ dan kiriting va asos bandini yozing. Boʻsh maydon — tekshiruvsiz, faqat oʻlchov.'))}</p>
    <div class="fgrid">${fld('cIns','ins','Insolyatsiya talabi, soat','ShNQ dan','0.25')}${fld('cDmin','dmin','Binolar orasi, min m','ShNQ dan','0.5')}${fld('cDk','dk','yoki × balandlik','koeff.','0.1')}${fld('cWz','wz','Deraza sathi, m','1','0.1')}${fld('cStep','step','Nuqtalar qadami, m','8','1')}</div>
    <label class="fi"><span>${esc(T('Asos (hujjat va band)'))}</span><input type="text" id="cRef" value="${esc(c.ref)}" placeholder="${esc(T('masalan: ShNQ …, …-band'))}"></label>`;
  /* insolyatsiya natijasi */
  h+=`<div class="lb" style="margin-top:4px">${esc(T('Insolyatsiya'))} · ${esc(T(({'02-22':'22 fevral','03-22':'22 mart','04-22':'22 aprel','06-22':'22 iyun','08-22':'22 avgust','09-22':'22 sentabr','12-22':'22 dekabr'})[c.md]||c.md))}</div>`;
  if(!LENS.ins)h+=`<button class="btn" data-on="ins">${esc(T('Insolyatsiyani hisoblash'))}</button>`;
  else if(!INS)h+=`<p class="note">${esc(T('Hisoblanmoqda…'))}</p>`;
  else if(!INS.pts.length)h+=`<p class="note">${esc(T('Turar joy binolari yoʻq.'))}</p>`;
  else{const P=INS.pts,worst=Math.min(...P.map(p=>p.best)),bad=thr?P.filter(p=>p.best<thr):[],bb=new Set(bad.map(p=>p.bi)),nres=new Set(P.map(p=>p.bi)).size;
    h+=`<div class="kv"><span>${esc(T('Hisob nuqtalari'))}</span><b>${P.length} · ${nres} ${esc(T('bino'))}</b><span>${esc(T('Eng kam uzluksiz'))}</span><b>${MRCHK.hm(worst)}</b>${thr?`<span>${esc(T('Talabdan past nuqtalar'))}</span><b style="color:${bad.length?'#b3261e':'#2e7d4f'}">${bad.length} · ${fmt(bad.length/P.length*100,0)} %</b><span>${esc(T('Shunday nuqtasi bor binolar'))}</span><b style="color:${bb.size?'#b3261e':'#2e7d4f'}">${bb.size} / ${nres}</b>`:''}<span>${esc(T('Hisob vaqti'))}</span><b>${fmt(INS.ms/1000,1)} s</b></div>`;}
  /* masofalar natijasi */
  h+=`<div class="lb" style="margin-top:4px">${esc(T('Binolar orasidagi masofa'))}</div>`;
  if(!LENS.dist)h+=`<button class="btn" data-on="dist">${esc(T('Masofalarni koʻrsatish'))}</button>`;
  else if(DST&&DST.all.length){const mn=Math.min(...DST.all.map(o=>o.d)),bad=DST.all.filter(o=>o.ok===false);
    h+=`<div class="kv"><span>${esc(T('Eng yaqin binolar oraligʻi'))}</span><b>${fmt(mn,1)} m</b>${DST.all.some(o=>o.req)?`<span>${esc(T('Talabni buzgan juftlar'))}</span><b style="color:${bad.length?'#b3261e':'#2e7d4f'}">${bad.length}</b>`:''}</div>`;}
  else h+=`<p class="note">${esc(T('Kamida ikkita bino kerak.'))}</p>`;
  /* shamol */
  h+=`<div class="lb" style="margin-top:4px">${esc(T('Shamol'))}</div>`;
  if(!LENS.wind)h+=`<button class="btn" data-on="wind">${esc(T('Shamol linzasini yoqish'))}</button>`;
  else if(!WIND)h+=`<p class="note">${esc(T(ROSEst==='err'?'Shamol maʼlumoti yuklanmadi (Open-Meteo).':'Hisoblanmoqda…'))}</p>`;
  else h+=`<div class="kv"><span>${esc(T('Oʻrtacha indeks (ochiq joylar)'))}</span><b>${fmt(WIND.mean,2)}</b><span>${esc(T('Turgʻun ulush (indeks < 0,45)'))}</span><b style="color:${WIND.stag>.25?'#b23a2e':'inherit'}">${fmt(WIND.stag*100,0)} %</b>${WIND.cshare!=null?`<span>${esc(T('Shamol yoʻlagi boʻlgan koʻchalar'))}</span><b>${fmt(WIND.cshare*100,0)} %</b>`:''}<span>${esc(T('Katak · hisob vaqti'))}</span><b>${WIND.dx} m · ${fmt(WIND.ms/1000,2)} s</b></div>
    <p class="note">${esc(T('0,45 chegarasi — shamol boʻlimidagi model shkalasi, meʼyor emas. Atrofdagi mavjud binolar hali hisobga olinmaydi.'))}</p>`;
  /* tanlangan bino */
  if(so){const L=(INS&&INS.L)||[],i=L.findIndex(b=>b.zid===S.sel.zid&&b.bid===S.sel.bid),P=INS&&i>=0?INS.pts.filter(p=>p.bi===i):[];
    let nd=null;if(DST&&DST.L){const j=DST.L.findIndex(b=>b.zid===S.sel.zid&&b.bid===S.sel.bid);DST.all.forEach(o=>{if((o.i===j||o.j===j)&&(!nd||o.d<nd.d))nd=o;});}
    h+=`<div class="lb" style="margin-top:4px">${esc(T('Tanlangan bino'))} · ${esc(so.b.name)} · ${so.x.fl} ${esc(T('qavat'))}</div><div class="kv">${P.length?`<span>${esc(T('Fasad nuqtalari'))}</span><b>${P.length}</b><span>${esc(T('Uzluksiz: eng kam / eng koʻp'))}</span><b>${MRCHK.hm(Math.min(...P.map(p=>p.best)))} / ${MRCHK.hm(Math.max(...P.map(p=>p.best)))}</b>`:''}${nd?`<span>${esc(T('Eng yaqin bino'))}</span><b style="color:${nd.ok===false?'#b3261e':'inherit'}">${fmt(nd.d,1)} m${nd.req?' / '+fmt(nd.req,1):''}</b>`:''}</div>`;}
  h+=`<p class="note">${esc(T('Hisob usuli: quyosh holati (NOAA algoritmi, refraksiyasiz), 10 daqiqa qadam; turar joy binolari fasadlari boʻylab birinchi qavat deraza sathidagi nuqtalar; boshqa binolar soyasi. Atrofdagi mavjud binolar hali hisobga olinmaydi — chekka binolar natijasi optimistik.'))}</p>
    <div class="keys"><b>T</b>${esc(T('tekshiruv'))} · <b>B</b>${esc(T('binolar'))} · ${esc(T('binoni bosing — uning natijasi'))}</div>`;
  return h;}
function bindTek(){$$('#panel [data-ck]').forEach(i=>i.onchange=()=>act(()=>{chk()[i.dataset.ck]=i.value===''?'':+i.value;}));
  const rf=$('#cRef');if(rf)rf.onchange=()=>act(()=>{chk().ref=rf.value.trim().slice(0,120);});
  $$('#panel [data-on]').forEach(b=>b.onclick=()=>{LENS[b.dataset.on]=true;saveLens();render();});}
const LOCK_SVG='<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true" style="vertical-align:-1px;margin-left:3px"><rect x="2" y="5" width="8" height="6" fill="currentColor"/><path d="M4 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
let RQ=0;function render(){if(RQ)return;RQ=requestAnimationFrame(()=>{RQ=0;draw();});}
function draw(){
  if(!map.getSource('road'))return;
  const roads=D.edges.map(e=>{const l=edgeLine(e);if(!l)return null;const p=preOf(e.preset);l.properties={id:e.id,rw:roadW(p),W:p.W};return l;}).filter(Boolean);
  map.getSource('road').setData(FC(roads));
  CORR=buildCorridor();
  map.getSource('corr').setData(CORR?FC([CORR]):FC());
  BLK=computeBlocks();
  map.getSource('blocks').setData(FC(BLK.map((b,i)=>{const z=b.z&&ZK(b.z.z);return Object.assign({},b.f,{properties:{i,z:!!z,c:z?z.c:'#ffffff'}});})));
  const sb=S.sel&&S.sel.t==='b'&&blockAt(S.sel.ll);if(S.sel&&S.sel.t==='b'&&!sb)S.sel=null;
  /* 3-bosqich: generatsiya — binolar saqlanmaydi, kvartal + parametrlardan har safar hosil boʻladi (kesh bilan) */
  const BC={turar:'#f7f3ea',aralash:'#f1dcc2',savdo:'#ecc9c1',ijtimoiy:'#dbe7f3'};const bf=[];const pitched=map.getPitch()>5?1:0;
  const sbl=S.sel&&S.sel.t==='bl'?S.sel:null;
  BLK.forEach(b=>{b.g=null;b.r=null;if(!b.z||!GENZ.includes(b.z.z))return;let r=null;
    if(b.z.lock&&b.z.blds){   // qoʻlda tahrirlangan: hujjatdagi binolar
      r=MRGEN.stats(b.f,b.z.blds.map(x=>{const f=polyOf(x);return {f,fl:x.fl,id:x.id,out:!insideBlk(f,b.f)};}));}
    else{const g=b.z.g;if(!g)return;r=MRGEN.gen(b.f,g);if(!r)return;b.g=g;r.blds.forEach((x,i)=>{x.id=i+1;});}
    b.r=r;
    const res=RES_SHARE[b.z.z]||0,net=r.gfa*res*KP.get('netGross');r.kv=net/KP.get('unitM2');r.pop=r.kv*KP.get('hh');r.nOut=r.blds.filter(x=>x.out).length;
    const sel=sb===b;r.blds.forEach(x=>bf.push(Object.assign({},x.f,{properties:{h:x.fl*MRGEN.FH,fl:x.fl,c:BC[b.z.z]||'#f7f3ea',s:sel,zid:b.z.id,bid:x.id,bs:!!(sbl&&sbl.zid===b.z.id&&sbl.bid===x.id),out:!!x.out,__p:pitched}})));});
  if(sbl&&!bldRec(sbl.zid,sbl.bid))S.sel=null;
  map.getSource('blds').setData(FC(bf));
  const sbo=S.sel&&S.sel.t==='bl'&&bldRec(S.sel.zid,S.sel.bid);
  map.getSource('bsel').setData(FC(sb?[turf.polygonToLine(sb.f)]:sbo?[turf.polygonToLine(sbo.b.f)]:[]));
  renderNb();renderLensMap();
  const selF=S.sel&&S.sel.t==='e'?roads.filter(f=>f.properties.id===S.sel.id):[];
  map.getSource('sel').setData(FC(selF));
  const showN=S.tool==='street'||S.tool==='select';
  map.getSource('nodes').setData(FC(showN?D.nodes.map(n=>({type:'Feature',properties:{id:n.id,d:deg(n.id),s:!!(S.sel&&S.sel.t==='n'&&S.sel.id===n.id)||S.draw===n.id},geometry:{type:'Point',coordinates:n.ll}})):[]));
  renderPrev();renderPanel();renderKpi();renderBal();renderLabels();renderUndo();renderLens();}
function renderLabels(){const box=$('#labels');if(!box)return;const z=map.getZoom();
  box.innerHTML=z<14.5?'':BLK.map(b=>{const p=map.project(b.anchor);const s=sizeOf(b.ha);return `<div class="blbl" style="left:${p.x}px;top:${p.y}px">${esc(b.name)}${b.z&&b.z.lock?`<span title="${esc(T('Qoʻlda tahrirlangan — qulflangan'))}">${LOCK_SVG}</span>`:''}<small>${fmt(b.ha,2)} ga · <span style="color:${s.c}">${esc(T(s.k==='daha'?'daha':s.k==='mavze'?'mavze oʻlchami':s.k==='tuman'?'tuman oʻlchami':'juda katta'))}</span></small></div>`;}).join('');}
function renderPrev(){const src=map.getSource('prev');if(!src)return;const a=S.draw&&node(S.draw);
  if(a&&S.cursor){const p=preOf(D.preset);src.setData(FC([{type:'Feature',properties:{W:p.W},geometry:{type:'LineString',coordinates:[a.ll,S.cursor]}}]));}else src.setData(FC());}
function renderNb(){const src=map.getSource('nbp');if(!src)return;const n=S.nb;
  if(n&&n.cur){const b=blockAt(n.p1);if(b){const r=rectFrom(b,n.p1,n.cur),ok=r.w>=NBMIN&&r.h>=NBMIN&&insideBlk(r.f,b.f);r.f.properties={ok};src.setData(FC([r.f]));return;}}src.setData(FC());}
function renderUndo(){$('#undo').disabled=!H.u.length;$('#redo').disabled=!H.r.length;}

/* ---------- TEP ---------- */
function kpis(){
  const out={};
  out.siteHa=SITE?turf.area(turf.polygon([SITE]))/1e4:null;
  let L=0,Lin=0;const sp=SITE?turf.polygon([SITE]):null;
  D.edges.forEach(e=>{const l=edgeLine(e);if(!l)return;const len=turf.length(l,{units:'kilometers'});L+=len;
    if(sp){const n=20;let k=0;for(let i=0;i<n;i++){const m=turf.along(l,len*(i+.5)/n,{units:'kilometers'});if(turf.booleanPointInPolygon(m,sp))k++;}Lin+=len*k/n;}});
  out.lenKm=L;
  if(sp&&out.siteHa){out.dens=Lin/(out.siteHa/100);
    let ca=null;if(CORR){try{const x=turf.intersect(turf.featureCollection([CORR,sp]));ca=x?turf.area(x):0;}catch(_){ca=null;}}else ca=0;
    out.corrPct=ca!=null?ca/(out.siteHa*1e4)*100:null;
    out.inter=D.nodes.filter(n=>deg(n.id)>=3&&turf.booleanPointInPolygon(turf.point(n.ll),sp)).length;out.interD=out.inter/(out.siteHa/100);}
  out.nB=BLK.length;out.bHa=BLK.reduce((a,b)=>a+b.ha,0);
  const G=BLK.filter(b=>b.r);out.gfa=G.reduce((a,b)=>a+b.r.gfa,0);out.fp=G.reduce((a,b)=>a+b.r.fp,0);out.kv=G.reduce((a,b)=>a+(b.r.kv||0),0);out.pop=G.reduce((a,b)=>a+(b.r.pop||0),0);
  out.nBld=G.reduce((a,b)=>a+b.r.blds.length,0);out.flAvg=out.fp?out.gfa/out.fp:null;
  const base=out.siteHa||out.bHa;if(G.length&&base){out.far=out.gfa/(base*1e4);out.cov=out.fp/(base*1e4)*100;out.pDens=out.pop/base;out.cap=400*base;}
  const zha={};BLK.forEach(b=>{const k=(b.z&&b.z.z)||'_';zha[k]=(zha[k]||0)+b.ha;});out.zha=zha;
  const tot=out.siteHa||out.bHa;out.greenPct=tot&&BLK.length?(zha.yashil||0)/tot*100:null;
  return out;}
function renderBal(){const el=$('#bal');if(!el)return;const k=kpis(),tot=k.siteHa||null;
  if(!BLK.length||!tot){el.innerHTML=`<p class="note">${esc(T('Koʻchalar chizilgach kvartallar avtomatik chiqadi.'))}</p>`;$('#zleg').innerHTML='';return;}
  const roadHa=k.corrPct!=null?k.corrPct/100*tot:0,rows=[...ZT.map(z=>[z.n,k.zha[z.k]||0,z.c]),['Zonasiz kvartallar',k.zha._||0,'#ffffff'],['Koʻchalar (qizil chiziqlar orasi)',roadHa,'#55585c']].filter(r=>r[1]>0.005);
  el.innerHTML=`<div class="bbar">${rows.map(r=>`<i style="flex:${r[1]} 1 0;background:${r[2]}" title="${esc(T(r[0]))}"></i>`).join('')}</div>`+
    `<div class="kv">${rows.map(r=>`<span>${esc(T(r[0]))}</span><b>${fmt(r[1],2)} ga · ${fmt(r[1]/tot*100,0)} %</b>`).join('')}</div><p class="note" style="margin-top:6px">${gi('balans')} ${esc(T('Hudud balansi nima?'))}</p>`+capHTML(k);
  $('#zleg').innerHTML=ZT.map(z=>`<div class="lg"><i style="height:12px;background:${z.c};border:1px solid rgba(0,0,0,.2)"></i>${esc(T(z.n))}</div>`).join('');}
function capHTML(k){if(!k.cap||!k.pop)return '';const u=k.pop/k.cap,over=u>1;
  const segs=BLK.filter(b=>b.r&&b.r.pop).map((b,i)=>`<i style="flex:${b.r.pop} 1 0;background:${['#e8a33d','#c98a2b','#f2c86b','#b07a22','#e3b452','#d49431'][i%6]}" title="${esc(b.name)}: ${fmt(b.r.pop,0)}"></i>`).join('');
  return `<div style="margin-top:14px"><span class="lb hd">${esc(T('Aholi sigʻimi'))} ${gi('brutto')}</span>
    <div style="position:relative"><div class="bbar" style="width:${Math.min(100,u*100)}%;margin-bottom:2px">${segs}</div>${over?`<i style="position:absolute;top:-3px;bottom:-1px;left:${100/u}%;width:2px;background:#b23a2e"></i>`:''}</div>
    <div class="kv"><span>${esc(T('Sigʻim: 400 kishi/ga × hudud'))}</span><b>${fmt(k.cap,0)}</b><span>${esc(T('Loyihada'))}</span><b style="color:${over?'#b23a2e':'inherit'}">${fmt(k.pop,0)} · ${fmt(u*100,0)} %</b></div>
    <p class="note" style="margin-top:6px">${esc(T(over?'Sigʻimdan oshdi: maktab, bogʻcha va tarmoqlar rejadagi aholiga moʻljallangan boʻladi.':'84-band mavze uchun yozilgan; hudud bir necha mavzedan iborat boʻlsa, sigʻim har biri uchun alohida tekshiriladi.'))}</p></div>`;}
function renderKpi(){const k=kpis();
  const c=(v,l,cls,g,ha)=>`<div class="kpi${cls?' '+cls:''}"><b>${v}</b><span>${esc(T(l))}${g?' '+gi(g,ha):''}</span></div>`;
  const bm=(v,t,u,src)=>v==null?'—':`<i class="${v>=t?'ok':'wn'}" title="${esc(T(src))}">${fmt(v,1)}</i>`;
  $('#kpis').innerHTML=[
    c(k.siteHa!=null?fmt(k.siteHa,1)+' ga':'—',k.siteHa!=null?'Hudud · '+sizeOf(k.siteHa).n.toLowerCase()+' oʻlchami':'Hudud','',k.siteHa!=null?(sizeOf(k.siteHa).k==='daha'?'daha':sizeOf(k.siteHa).k==='mavze'?'mavze':'tuman'):null,k.siteHa),
    c(fmt(k.lenKm,2)+' km','Koʻchalar uzunligi'),
    c(bm(k.dens,18,'km/km²','UN-Habitat, Five Principles (2014): ≥ 18 km/km²')+(k.dens!=null?' <small style="font-size:13px">km/km²</small>':''),'Koʻcha zichligi · moʻljal ≥ 18'),
    c(bm(k.corrPct,30,'%','UN-Habitat, Five Principles (2014): koʻchalarga ≥ 30 % yer')+(k.corrPct!=null?' %':''),'Koʻchalar ulushi · moʻljal ≥ 30','','kocha'),
    c(k.inter!=null?`${k.inter} · ${bm(k.interD,80,'/km²','SDSN SDG indikatori i-70: 80–120 chorraha/km²')}`:'—','Chorrahalar · /km² · 80–120'),
    c(k.nB?`${k.nB} · ${fmt(k.bHa/k.nB,2)} ga`:'—','Kvartallar · oʻrtacha','','kvartal'),
    c(k.zha&&k.zha.turar?fmt(k.zha.turar+(k.zha.aralash||0),2)+' ga':'—','Turar joy + aralash'),
    c(k.greenPct!=null?bm(k.greenPct,15,'%','UN-Habitat, Five Principles (2014): ochiq jamoat joylariga 15–20 % yer')+' %':'—','Yashil zona · moʻljal 15–20'),
    c(k.gfa?fmt(k.gfa/1000,0)+' ming m²':'—','GFA · binolar '+(k.nBld||0),k.gfa?'':'off'),
    c(k.far!=null?`${fmt(k.far,2)} · ${fmt(k.cov,0)} %`:'—','FAR · qoplam (hudud boʻyicha)',k.far!=null?'':'off'),
    c(k.flAvg?fmt(k.flAvg,1):'—','Oʻrtacha qavat',k.flAvg?'':'off'),
    c(k.pop?`${fmt(k.pop,0)} · ${fmt(k.kv,0)} kv`:'—','Aholi · kvartiralar',k.pop?'':'off'),
    c(k.pDens!=null&&k.pop?`<i class="${k.pDens<=400?'ok':'wn'}" title="${esc(T('ShNQ 2.07.01-23, 84-band: koʻp qavatli kompleks qurilishda mavze boʻyicha ≤ 400 kishi/ga (brutto)'))}">${fmt(k.pDens,0)}</i>`:'—','Zichlik, kishi/ga · ≤ 400',k.pDens!=null&&k.pop?'':'off','brutto')].join('');}

/* ---------- panel ---------- */
const STEPS=['Koʻchalar','Kvartallar','Zonalash','Generatsiya','Binolar','Tekshiruv'];
function presetOpts(cur){const g={};MOD.presets.forEach(p=>(g[p.g]=g[p.g]||[]).push(p));
  return Object.entries(g).map(([n,ps])=>`<optgroup label="${esc(T(n))}">${ps.map(p=>`<option value="${p.id}" ${p.id===cur?'selected':''}>${esc(T(p.n))} · ${fmt(p.W,1)} m</option>`).join('')}</optgroup>`).join('');}
function stripBar(p){return `<div class="strips" title="${esc(T(p.n))}">${p.st.map(s=>`<i style="flex:${s[1]} 1 0;background:${(MOD.dk[s[0]]||{}).c||'#ccc'}" title="${esc(T((MOD.dk[s[0]]||{}).n||s[0]))} · ${fmt(s[1],2)} m"></i>`).join('')}</div>`;}
function renderPanel(){
  const st=S.tool==='tek'?5:S.tool==='bino'||(S.sel&&S.sel.t==='bl')?4:S.tool==='gen'?3:S.tool==='zone'||(S.sel&&S.sel.t==='b')?1:0,ttl=st===5?'Tekshiruv':st===4?'Binolar':st===3?'Generatsiya':st?'Kvartallar va zonalash':'Koʻcha tarmogʻi';
  let h=`<div class="ph"><span class="lb">3 · Master reja · ${st+1} / 6</span><span class="lb">beta</span></div><h2>${esc(T(ttl))}</h2><div class="steps">${STEPS.map((s,i)=>`<i class="${i<=st?'on':''}" title="${esc(T(s))}"></i>`).join('')}</div><div class="bd">`;
  const sel=S.sel&&S.sel.t==='e'&&edge(S.sel.id),sb=S.sel&&S.sel.t==='b'&&blockAt(S.sel.ll);
  const zpal=cur=>`<div class="zp">${ZT.map(z=>`<button data-z="${z.k}" aria-pressed="${cur===z.k}"><i style="background:${z.c}"></i>${esc(T(z.n.split(' (')[0]))}</button>`).join('')}<button data-z="" aria-pressed="${cur===''}"><i style="background:#fff"></i>${esc(T('Zonasiz'))}</button></div>`;
  const so=S.sel&&S.sel.t==='bl'&&bldRec(S.sel.zid,S.sel.bid);
  if(S.tool==='tek'){h+=tekHTML(so);}
  else if(so){h+=bldHTML(so);}
  else if(sb){const z=sb.z&&ZK(sb.z.z);
    h+=`<div class="lb">Tanlangan kvartal</div><label><span class="lb" style="display:block;margin-bottom:6px">Nomi</span><input type="text" id="bName" value="${esc(sb.name)}"></label>
      <div class="kv"><span>Maydon</span><b>${fmt(sb.ha,2)} ga</b><span>Perimetr</span><b>${fmt(sb.per,0)} m</b><span>Zona</span><b>${esc(T(z?z.n.split(' (')[0]:'zonasiz'))}</b><span>ShNQ toifasi ${gi(sizeOf(sb.ha).k==='daha'?'daha':sizeOf(sb.ha).k==='mavze'?'mavze':'tuman',sb.ha)}</span><b style="color:${sizeOf(sb.ha).c}">${esc(T(sizeOf(sb.ha).n))}</b></div>
      ${sb.ha>10?`<p class="note">${esc(T(sb.ha>50?'Bu boʻlak turar joy tumani oʻlchamida. Uni ichki koʻchalar bilan mavze va dahalarga boʻling.':'Bu boʻlak dahadan katta — mavze oʻlchamida. 400 kishi/ga normasi butun mavze uchun hisoblanadi; ichidagi turar joy uchastkalarida zichlik yuqoriroq boʻladi.'))} ${gi('brutto')}</p>`:''}
      ${S.tool==='gen'?'':`<span class="lb">Zona</span>${zpal(z?z.k:'')}`}${genHTML(sb)}<button class="btn" id="desel">Tanlovni bekor qilish</button>`;}
  else if(sel){const p=preOf(sel.preset),l=edgeLine(sel);
    h+=`<div class="lb">Tanlangan koʻcha</div><div class="kv"><span>Uzunlik</span><b>${fmt(l?turf.length(l,{units:'meters'}):null,0)} m</b><span>Qizil chiziqlar orasi</span><b>${fmt(p.W,1)} m</b><span>Qatnov qismi</span><b>${fmt(roadW(p),1)} m</b></div>
      <label><span class="lb" style="display:block;margin-bottom:6px">Modul</span><select id="selPre">${presetOpts(sel.preset)}</select></label>${stripBar(p)}
      <div style="display:flex;gap:8px"><button class="btn bad" id="delE">Oʻchirish</button><button class="btn" id="desel">Tanlovni bekor qilish</button></div>`;}
  else if(S.sel&&S.sel.t==='n'&&node(S.sel.id)){const n=node(S.sel.id);
    h+=`<div class="lb">Tanlangan tugun</div><div class="kv"><span>Ulangan koʻchalar</span><b>${deg(n.id)}</b></div><p class="note">Tugunni sudrab koʻchiring — ulangan koʻchalar ham siljiydi.</p><div style="display:flex;gap:8px"><button class="btn bad" id="delN">Tugunni oʻchirish</button><button class="btn" id="desel">Bekor qilish</button></div>`;}
  else if(S.tool==='bino'){const nl=BLK.filter(b=>b.z&&b.z.lock).length,no=BLK.reduce((a,b)=>a+(b.r&&b.r.nOut||0),0);
    h+=`<p class="note">${esc(T('Binoni bosing — tanlanadi; sudrab suring. Kvartal ichidagi boʻsh joyni ikki marta bosing (ikki burchak) — yangi bino, kvartal yoʻnalishiga parallel.'))}</p>
      <div class="kv"><span>${esc(T('Qulflangan kvartallar'))}</span><b>${nl}</b><span>${esc(T('Kvartaldan chiqqan binolar'))}</span><b style="color:${no?'#b23a2e':'inherit'}">${no}</b></div>
      <p class="note">${esc(T('Qoʻlda oʻzgartirilgan kvartal qulflanadi: koʻchalar surilsa ham binolar joyida qoladi, chegaradan chiqqanlari qizil boʻladi.'))}</p>
      <div class="keys"><b>Esc</b>${esc(T('bekor'))} · <b>G</b>${esc(T('generatsiya'))} · <b>Ctrl+Z</b>${esc(T('bekor qilish'))}</div>`;}
  else if(S.tool==='gen'){const nz=BLK.filter(b=>b.z&&['turar','aralash','savdo'].includes(b.z.z)),ng=nz.filter(b=>b.z.g||b.z.lock).length;
    h+=`<p class="note">Turar joy, aralash, savdo yoki ijtimoiy zonadagi kvartalni bosing — tipologiya, FAR va maksimal qavatni bering, binolar oʻzi joylashadi.</p>
      <div class="kv"><span>Turar joy, aralash va savdo kvartallari</span><b>${nz.length}</b><span>Binolari bor</span><b>${ng}</b></div>
      ${nz.length>ng?`<button class="btn dark" id="genAll">Qolgan ${nz.length-ng} ta kvartalga standart</button><p class="note">Standart: seksiyali qatorlar, FAR 2,5, 9 qavat (G8 modeli: PR 2,5, asosan 9 qavat), chekinish 6 m.</p>`:''}
      <div class="keys"><b>Z</b>zonalash · <b>V</b>tanlash · <b>Ctrl+Z</b>bekor qilish</div>`;}
  else if(S.tool==='zone'){
    h+=`<p class="note">Kvartallar koʻchalar orasidan avtomatik chiqadi ${gi('kvartal')}. Zonani tanlang va kvartallarni bosing.</p><span class="lb">Joriy zona</span>${zpal(D.zcur||'')}
      <p class="note">Koʻchani surish yoki qoʻshish zonani oʻchirmaydi: zona kvartal ichidagi nuqtaga bogʻlangan.</p><div class="keys"><b>V</b>tanlash · <b>S</b>koʻcha · <b>Ctrl+Z</b>bekor qilish</div>`;}
  else if(S.tool==='street'){const p=preOf(D.preset);
    h+=`<label><span class="lb" style="display:block;margin-bottom:6px">Koʻcha moduli</span><select id="drawPre">${presetOpts(D.preset)}</select></label>${stripBar(p)}
      <div class="kv"><span>Qizil chiziqlar orasi ${gi('qizil')}</span><b>${fmt(p.W,1)} m</b><span>Boʻlaklar</span><b>${p.lanes}</b></div>
      <p class="note">Xaritada nuqtalarni bosing. Mavjud koʻcha yoki tugunga bossangiz — ulanadi va chorraha hosil boʻladi.</p>
      <div class="keys"><b>Enter</b>tugatish · <b>Esc</b>bekor<br><b>Shift</b>burchakni 15° ga yopishtirish<br><b>V</b>tanlash · <b>Ctrl+Z</b>bekor qilish</div>`;}
  else{h+=`<p class="note">Koʻcha yoki tugunni bosing — tanlanadi. Tugunni sudrab koʻchiring. <b>Delete</b> — oʻchirish.</p><div class="keys"><b>S</b>koʻcha chizish · <b>Ctrl+Z</b>bekor qilish</div>`;}
  h+=`<div class="kv" style="border-top:1px solid var(--line);padding-top:10px"><span>Koʻchalar</span><b>${D.edges.length}</b><span>Kvartallar</span><b>${BLK.length}</b><span>Zonalangan</span><b>${BLK.filter(b=>b.z).length}</b></div></div>`;
  $('#panel').innerHTML=h;
  const dp=$('#drawPre');if(dp)dp.onchange=()=>act(()=>{D.preset=dp.value;});
  const sp=$('#selPre');if(sp)sp.onchange=()=>act(()=>{edge(S.sel.id).preset=sp.value;D.preset=sp.value;});
  const de=$('#delE');if(de)de.onclick=()=>{const id=S.sel.id;S.sel=null;act(()=>delEdge(id));};
  const dn=$('#delN');if(dn)dn.onclick=()=>{const id=S.sel.id;S.sel=null;act(()=>delNode(id));};
  const ds=$('#desel');if(ds)ds.onclick=()=>{S.sel=null;render();};
  $$('#panel [data-z]').forEach(b=>b.onclick=()=>{const k=b.dataset.z;if(sb)act(()=>setZone(sb,k));else act(()=>{D.zcur=k;});});
  bindGen(sb);if(S.tool==='tek')bindTek();else bindBld(so);const ga=$('#genAll');if(ga)ga.onclick=()=>act(()=>BLK.forEach(b=>{if(b.z&&['turar','aralash','savdo'].includes(b.z.z)&&!b.z.g&&!b.z.lock){const r=zoneRec(b,true);r.g=defG('seksiya');}}));
  const bn=$('#bName');if(bn)bn.onchange=()=>act(()=>{const r=zoneRec(sb,true);r.name=bn.value.trim().slice(0,40)||undefined;if(!r.name)delete r.name;});
  hint();}
function hint(){let t='';
  if(S.tool==='zone')t='Kvartalni bosing — joriy zona beriladi';
  else if(S.tool==='gen')t='Kvartalni bosing — binolar parametrlari';
  else if(S.tool==='tek')t='Binoni bosing — insolyatsiya va eng yaqin masofa';
  else if(S.tool==='bino')t=S.nb?'Ikkinchi burchakni bosing · Esc — bekor':'Binoni bosing yoki sudrang · boʻsh joyda bosing — yangi bino';
  else if(S.tool==='street')t=S.draw?'Keyingi nuqtani bosing · Enter — tugatish · Shift — 15° qadam':'Koʻchaning boshlanish nuqtasini bosing';
  $('#hint').textContent=T(t);}

/* ---------- asboblar ---------- */
function setTool(t){S.tool=t;S.draw=null;S.cursor=null;S.nb=null;S.arm=null;if(t!=='gen'&&t!=='select'&&S.sel&&S.sel.t==='b')S.sel=null;if(t!=='bino'&&t!=='select'&&t!=='tek'&&S.sel&&S.sel.t==='bl')S.sel=null;if(t==='tek'&&!LENS.ins&&!LENS.dist&&!LENS.sh){LENS.ins=LENS.dist=true;saveLens();}if(t!=='select'&&t!=='street'&&S.sel&&(S.sel.t==='e'||S.sel.t==='n'))S.sel=null;$$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));map.getCanvas().style.cursor=t==='street'?'crosshair':'';$('#tip').textContent='';render();}
$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('#undo').onclick=undo;$('#redo').onclick=redo;
$$('[data-view]').forEach(b=>b.onclick=()=>{S.view=b.dataset.view;$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x===b));map.easeTo(S.view==='axo'?{pitch:55,bearing:-25,duration:600}:{pitch:0,bearing:0,duration:600});setTimeout(render,650);});
$$('[data-base]').forEach(b=>b.onclick=()=>{S.base=b.dataset.base;$$('[data-base]').forEach(x=>x.setAttribute('aria-pressed',x===b));map.setLayoutProperty('sat','visibility',S.base==='sat'?'visible':'none');map.setLayoutProperty('light','visibility',S.base==='light'?'visible':'none');});

/* ---------- yopishish ---------- */
const SNAP=12;
function snapNode(px,excl){let best=null,bd=SNAP;D.nodes.forEach(n=>{if(n.id===excl)return;const q=map.project(n.ll),d=Math.hypot(q.x-px.x,q.y-px.y);if(d<bd){bd=d;best=n;}});return best;}
function snapEdge(px){let best=null,bd=SNAP;D.edges.forEach(e=>{const a=map.project(node(e.a).ll),b=map.project(node(e.b).ll),dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy;if(!L)return;
  let t=((px.x-a.x)*dx+(px.y-a.y)*dy)/L;if(t<=.02||t>=.98)return;const x=a.x+t*dx,y=a.y+t*dy,d=Math.hypot(px.x-x,px.y-y);if(d<bd){bd=d;best={e,ll:map.unproject([x,y]).toArray()};}});return best;}
function angleSnap(from,ll){const a=turf.point(from),b=turf.point(ll),dist=turf.distance(a,b,{units:'meters'}),br=Math.round(turf.bearing(a,b)/15)*15;return turf.destination(a,dist,br,{units:'meters'}).geometry.coordinates;}
function resolvePoint(e){const px=e.point,n=snapNode(px);if(n)return {node:n,ll:n.ll};
  let ll=e.lngLat.toArray();const se=snapEdge(px);if(se)return {edge:se.e,ll:se.ll};
  if(S.shift&&S.draw){ll=angleSnap(node(S.draw).ll,ll);}return {ll};}

/* ---------- sichqoncha ---------- */
const bldAt=pt=>{try{return map.queryRenderedFeatures(pt,{layers:['blds']})[0]||null;}catch(_){return null;}};
map.on('click',e=>{
  if(S.drag||S.bdrag)return;
  if(S.tool==='tek'){const f=bldAt(e.point);S.sel=f?{t:'bl',zid:f.properties.zid,bid:f.properties.bid}:null;render();return;}
  if(S.tool==='bino'){const ll=e.lngLat.toArray(),tip=$('#tip');
    if(S.nb){const b=blockAt(S.nb.p1),r=b&&rectFrom(b,S.nb.p1,ll);S.nb=null;tip.textContent='';
      if(r&&r.w>=NBMIN&&r.h>=NBMIN){const fl=defFl(b);act(()=>{const rec=bake(b),n={id:rec.bn++,cs:cs7(r.f.geometry.coordinates),fl};rec.blds.push(n);S.sel={t:'bl',zid:rec.id,bid:n.id};});}
      else{tip.textContent=T('Kamida 6 × 6 m');tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';}render();return;}
    const f=bldAt(e.point);if(f){S.sel={t:'bl',zid:f.properties.zid,bid:f.properties.bid};render();return;}
    const b=blockAt(ll);if(!b){S.sel=null;render();return;}
    if(!b.z||!GENZ.includes(b.z.z)){tip.textContent=T('Avval zona bering (Z): turar joy, aralash, savdo yoki ijtimoiy');tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';return;}
    S.sel=null;S.nb={p1:ll,cur:null};render();return;}
  if(S.tool==='street'){const r=resolvePoint(e);
    act(()=>{let n=r.node||(r.edge?splitEdge(r.edge,r.ll):addNode(r.ll));if(S.draw&&node(S.draw)&&S.draw!==n.id)addEdgeX(S.draw,n.id,D.preset);S.draw=n.id;});
    render();return;}
  if(S.tool==='select'){const n=snapNode(e.point);if(n){S.sel={t:'n',id:n.id};render();return;}
    const f=map.queryRenderedFeatures(e.point,{layers:['road-hit']})[0];if(f){S.sel={t:'e',id:f.properties.id};render();return;}
    const bf=bldAt(e.point);if(bf){S.sel={t:'bl',zid:bf.properties.zid,bid:bf.properties.bid};render();return;}
    const b=blockAt(e.lngLat.toArray());S.sel=b?{t:'b',ll:b.anchor}:null;render();return;}
  if(S.tool==='zone'){const b=blockAt(e.lngLat.toArray());if(b){const k=D.zcur||'';act(()=>setZone(b,k));}}
  if(S.tool==='gen'){const b=blockAt(e.lngLat.toArray());S.sel=b?{t:'b',ll:b.anchor}:null;render();}});
map.on('dblclick',e=>{if(S.tool==='street'&&S.draw){e.preventDefault();endDraw();}});
map.on('mousemove',e=>{
  if(S.drag){const n=node(S.drag.id);if(n){n.ll=e.lngLat.toArray();S.drag.moved=true;render();}return;}
  if(S.bdrag){const d=S.bdrag,ll=e.lngLat.toArray();if(!d.moved){const px=map.project(d.p0);if(Math.hypot(px.x-e.point.x,px.y-e.point.y)<3)return;
      const b=blkOfZ(d.zid);if(!b)return;const rec=bake(b),x=rec.blds.find(x=>x.id===d.bid);if(!x)return;d.x=x;d.cs=x.cs;d.moved=true;}
    const lat=d.p0[1],dxm=(ll[0]-d.p0[0])*111320*Math.cos(lat*Math.PI/180),dym=(ll[1]-d.p0[1])*110540;d.x.cs=moveCs(d.cs,dxm,dym);render();
    const tip=$('#tip');tip.textContent=`${fmt(Math.hypot(dxm,dym),1)} m`;tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';return;}
  if(S.tool==='bino'){const ll=e.lngLat.toArray();if(S.nb){S.nb.cur=ll;renderNb();const b=blockAt(S.nb.p1);if(b){const r=rectFrom(b,S.nb.p1,ll),tip=$('#tip');tip.textContent=`${fmt(r.w,1)} × ${fmt(r.h,1)} m`;tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';}return;}
    map.getCanvas().style.cursor=bldAt(e.point)?'move':blockAt(ll)?'crosshair':'';return;}
  if(S.tool==='street'){const r=resolvePoint(e);S.cursor=r.ll;renderPrev();
    const tip=$('#tip');if(S.draw&&node(S.draw)){const a=node(S.draw).ll,d=turf.distance(turf.point(a),turf.point(r.ll),{units:'meters'}),br=(turf.bearing(turf.point(a),turf.point(r.ll))+360)%360;
      tip.textContent=`${fmt(d,0)} m · ${fmt(br,0)}°${r.node?' · '+T('tugun'):r.edge?' · '+T('ulanadi'):''}`;tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';}
    else{tip.textContent=r.node||r.edge?T(r.node?'tugun':'ulanadi'):'';tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';}}
  else if(S.tool==='select'){const n=snapNode(e.point),f=!n&&map.queryRenderedFeatures(e.point,{layers:['road-hit']})[0];map.getCanvas().style.cursor=n?'move':f?'pointer':bldAt(e.point)?'move':'';}
  else if(S.tool==='tek'){map.getCanvas().style.cursor=bldAt(e.point)?'pointer':'';}
  else if(S.tool==='zone'||S.tool==='gen'){map.getCanvas().style.cursor=blockAt(e.lngLat.toArray())?'pointer':'';}});
map.on('move',()=>{renderLabels();renderDLabels();});
map.on('mousedown',e=>{if(S.tool!=='select'&&S.tool!=='bino')return;if(S.nb)return;
  const n=S.tool==='select'&&snapNode(e.point);
  if(!n){if(S.tool==='select'&&map.queryRenderedFeatures(e.point,{layers:['road-hit']})[0])return;const f=bldAt(e.point);if(!f)return;e.preventDefault();map.dragPan.disable();
    const zid=f.properties.zid,bid=f.properties.bid;S.bdrag={zid,bid,prev:JSON.stringify(D),p0:e.lngLat.toArray(),moved:false};S.sel={t:'bl',zid,bid};render();return;}e.preventDefault();map.dragPan.disable();S.drag={id:n.id,prev:JSON.stringify(D),moved:false};S.sel={t:'n',id:n.id};});
window.addEventListener('mouseup',()=>{if(S.bdrag){const d=S.bdrag;map.dragPan.enable();setTimeout(()=>{S.bdrag=null;},0);$('#tip').textContent='';
    if(d.moved&&JSON.stringify(D)!==d.prev){H.u.push(d.prev);if(H.u.length>200)H.u.shift();H.r=[];save();}render();return;}
  if(!S.drag)return;const d=S.drag;map.dragPan.enable();setTimeout(()=>{S.drag=null;},0);
  if(d.moved&&JSON.stringify(D)!==d.prev){H.u.push(d.prev);H.r=[];save();}render();});
function endDraw(){S.draw=null;S.cursor=null;$('#tip').textContent='';render();}

/* ---------- klaviatura ---------- */
/* bino tanlanganida: capture bosqichida — xaritaning oʻq tugmalari bilan surishidan oldin */
window.addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(e.key==='Escape'&&S.nb){S.nb=null;$('#tip').textContent='';render();e.stopPropagation();return;}
  if(!S.sel||S.sel.t!=='bl'||e.altKey)return;
  const st=e.shiftKey?5:1,A={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,st],ArrowDown:[0,-st]}[e.key];
  let done=true;
  if(A&&!e.ctrlKey&&!e.metaKey){const br=map.getBearing()*Math.PI/180;bldOp('mv',[A[0]*Math.cos(br)+A[1]*Math.sin(br),-A[0]*Math.sin(br)+A[1]*Math.cos(br)]);}
  else if((e.key==='+'||e.key==='=')&&!e.ctrlKey&&!e.metaKey)bldOp('fl',1);
  else if((e.key==='-'||e.key==='_')&&!e.ctrlKey&&!e.metaKey)bldOp('fl',-1);
  else if(e.key==='['||e.key===']')bldOp('rot',(e.key===']'?1:-1)*(e.shiftKey?5:15));
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d')bldOp('dup');
  else if(e.key==='Delete'||e.key==='Backspace')bldOp('del');
  else done=false;
  if(done){e.preventDefault();e.stopPropagation();}},true);
window.addEventListener('keydown',e=>{
  if(e.key==='Shift')S.shift=true;
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();return;}
  if(e.key==='Enter'||e.key==='Escape'){if(S.draw){endDraw();}else if(e.key==='Escape'&&S.sel){S.sel=null;render();}return;}
  if(k==='s'&&!e.ctrlKey&&!e.metaKey)setTool('street');
  if(k==='v'&&!e.ctrlKey&&!e.metaKey)setTool('select');
  if(k==='z'&&!e.ctrlKey&&!e.metaKey)setTool('zone');
  if(k==='g'&&!e.ctrlKey&&!e.metaKey)setTool('gen');
  if(k==='b'&&!e.ctrlKey&&!e.metaKey)setTool('bino');
  if(k==='t'&&!e.ctrlKey&&!e.metaKey)setTool('tek');
  if((e.key==='Delete'||e.key==='Backspace')&&S.sel&&(S.sel.t==='e'||S.sel.t==='n')){e.preventDefault();const s=S.sel;S.sel=null;act(()=>s.t==='e'?delEdge(s.id):delNode(s.id));}});
window.addEventListener('keyup',e=>{if(e.key==='Shift')S.shift=false;});
if(window.KP)KP.on(()=>render());
window.addEventListener('storage',e=>{if(e.key==='kps_site'){loadSite();}if(e.key===KEY){load();fixSel();render();}});

/* ---------- ishga tushirish ---------- */
function loadSite(){SITE=siteRing();if(map.getSource('site'))map.getSource('site').setData(SITE?FC([turf.lineString(SITE)]):FC());
  const c=SITE?turf.center(turf.polygon([SITE])).geometry.coordinates:null;if(c)K=78271.517*Math.cos(c[1]*Math.PI/180);return c;}
async function init(){
  try{MOD=await (await fetch('data/kocha-modullari.json?v=1')).json();}catch(e){MOD={dk:{},presets:[{id:'res',g:'—',n:'Koʻcha',W:15,lanes:2,st:[['lane',7,0]]}]};}
  MOD.presets.forEach(p=>PRE[p.id]=p);
  load();
  map.on('load',()=>{
    SITE=siteRing();if(SITE)K=78271.517*Math.cos(turf.center(turf.polygon([SITE])).geometry.coordinates[1]*Math.PI/180);
    else if(D.nodes.length)K=78271.517*Math.cos(D.nodes[0].ll[1]*Math.PI/180);
    addLayers();const c=loadSite();
    const pts=D.nodes.map(n=>n.ll);
    if(pts.length>1){const b=turf.bbox(turf.multiPoint(pts));map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:120,duration:0});}
    else if(SITE){const b=turf.bbox(turf.lineString(SITE));map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:60,bottom:60,left:340,right:60},duration:0});}
    else{$('#empty').hidden=false;}
    setTool(D.edges.length?'select':'street');});
  $('#emptyGo').onclick=()=>{$('#empty').hidden=true;};
}
init();
window.MR={get D(){return D;},get BLK(){return BLK;},get S(){return S;},get INS(){return INS;},get WIND(){return WIND;},WS,get DST(){return DST;},LENS,setHr:h=>{HR=h;renderLensMap();},act,undo,redo,map,kpis,draw,bake,bldOp,rectFrom};   // sinov va keyingi bosqichlar uchun
})();
