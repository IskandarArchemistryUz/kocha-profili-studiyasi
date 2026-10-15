/* Archemistry Lab — Master reja muharriri (1: koʻcha tarmogʻi · 2: kvartallar va zonalash · 3: generatsiya · 4: binolarni qoʻlda tahrirlash · 5: tekshiruv linzalari · 6: variantlar, figure-ground, albom).
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
/* Uchastka (loyiha chegarasi) — hujjatda (D.plot); kps_site — faqat tahlil hududi */
/* uchastka geometriyasi: asosiy chegara − teshiklar (anklav) + alohida qismlar (eksklav) */
function plotFeature(){const r=plotRing();if(!r)return null;const pts=(D.plot.parts||[]).map(q=>{const g=q.ring.map(p=>[+p[1],+p[0]]);g.push(g[0]);return {hole:!!q.hole,g};});
  let f=turf.polygon([r]);try{const H=pts.filter(q=>q.hole),A=pts.filter(q=>!q.hole);
    if(H.length)f=turf.difference(turf.featureCollection([f,...H.map(q=>turf.polygon([q.g]))]))||f;
    if(A.length)f=turf.union(turf.featureCollection([f,...A.map(q=>turf.polygon([q.g]))]))||f;}catch(_){}
  return f;}
function plotRing(){const s=D&&D.plot;if(s&&s.ring&&s.ring.length>2){const r=s.ring.map(p=>[+p[1],+p[0]]);r.push(r[0]);return r;}return null;}
function siteRing(){try{const s=JSON.parse(localStorage.getItem('kps_site')||'null');if(s&&s.ring&&s.ring.length>2){const r=s.ring.map(p=>[+p[1],+p[0]]);r.push(r[0]);return r;}}catch(e){}return null;}
let SITE=null;

/* ---------- holat ---------- */
const S={tool:'street',sel:null,draw:null,cursor:null,shift:false,view:'plan',base:'sat',drag:null};
let BLK=[];   // hosil qilingan kvartallar: {f:Feature<Polygon>, ha, per, anchor:[lng,lat], z:zona yozuvi|null, name}
function fixSel(){if(S.sel&&((S.sel.t==='e'&&!edge(S.sel.id))||(S.sel.t==='n'&&!node(S.sel.id))||(S.sel.t==='bl'&&!bldRec(S.sel.zid,S.sel.bid))))S.sel=null;S.nb=null;S.arm=null;if(S.draw&&!node(S.draw))S.draw=null;}

/* ---------- xarita ---------- */
const STYLE=KPSMAP.mlStyle();   // umumiy fon xarita (js/basemap.js): Stil / OSM / Sunʼiy yoʻldosh / Fonsiz
const map=new maplibregl.Map({container:'map',style:STYLE,center:[69.2797,41.3111],zoom:15.5,maxPitch:70,attributionControl:{compact:true},doubleClickZoom:false,dragRotate:true,preserveDrawingBuffer:true});   // albom uchun kanvasni rasmga olish
map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
const KB=KPSMAP.maplibre(map,{control:false});
const MRPLOT=MRHUD_areaTool({id:'plot',label:'Uchastka',multi:true,modes:['poly','rect'],color:'#c2432b',dash:[6,2,1,2],width:2,fillOn:.06,fillOff:0,
  about:'Siz loyihalayotgan yer. Yoʻllar, parsellar va binolar shu ichida; TEP shu maydon boʻyicha hisoblanadi.',
  read:()=>D.plot||null,write:s=>act(()=>{if(s)D.plot=s;else delete D.plot;}),
  extra:st=>st?`${MRHUD.ring()?'':`<button class="btn" data-pana>Atrofini tahlil qilish →</button>`}<button class="btn dark" data-pnext>Yoʻllarni chizish →</button>`:'',
  bindExtra:root=>{const a=root.querySelector('[data-pana]');if(a)a.onclick=()=>{autoHud();setTool('hudud');};const n=root.querySelector('[data-pnext]');if(n)n.onclick=()=>setTool('street');}});
/* uchastka atrofida tahlil hududi: markazdan eng uzoq burchakkacha + 300 m, kamida 500 m, 50 m ga yaxlitlab */
function autoHud(){const r=plotRing();if(!r)return;const c=turf.centroid(turf.polygon([r])).geometry.coordinates;
  const far=Math.max(...r.map(p=>turf.distance(turf.point(c),turf.point(p),{units:'meters'})));const R=Math.max(500,Math.ceil((far+300)/50)*50);
  const mx=111320*Math.cos(c[1]*Math.PI/180),ring=[];for(let i=0;i<72;i++){const a=i/72*2*Math.PI;ring.push([+(c[1]+R*Math.sin(a)/110574).toFixed(6),+(c[0]+R*Math.cos(a)/mx).toFixed(6)]);}
  try{localStorage.setItem('kps_site',JSON.stringify({t:Date.now(),mode:'radius',ring,center:[c[1],c[0]],r:R,areaM2:Math.round(Math.PI*R*R),src:'muharrir'}));}catch(e){}MRHUD.reload();}
/* xarita tugmalari (pastki oʻng burchak): 2D/3D/FG, fon xarita, zoom — bitta ixcham guruh */
{const pop=$('#mcPop'),b=$('#mcBase');pop.appendChild(KPSMAP.control({}));
  b.onclick=e=>{e.stopPropagation();pop.hidden=!pop.hidden;b.setAttribute('aria-expanded',String(!pop.hidden));};
  document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!e.target.closest('#mcPop,#mcBase')){pop.hidden=true;b.setAttribute('aria-expanded','false');}});}
{const nav=new maplibregl.NavigationControl({visualizePitch:true});$('#mcNav').appendChild(nav.onAdd(map));}
const FC=f=>({type:'FeatureCollection',features:f||[]});
let K=78271.517;   // metr → piksel: px = m · 2^z / (78271,517 · cos φ)
/* zoom faqat yuqori darajadagi interpolate kirishi boʻla oladi — minimal piksel shu ichida */
const mpx=(prop,min)=>{const v=z=>['/',['*',['get',prop],2**z],K];const w=z=>min?['max',min,v(z)]:v(z);return ['interpolate',['exponential',2],['zoom'],10,w(10),24,w(24)];};

function addLayers(){
  ['site','blocks','bsel','corr','road','sel','nodes','prev','blds','nbp','shadow','insp','dist','windc','walk'].forEach(id=>map.addSource(id,{type:'geojson',data:FC()}));
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
  map.addSource('ksec',{type:'geojson',data:FC()});
  map.addLayer({id:'ksec-l',type:'line',source:'ksec',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#141414','line-width':2,'line-dasharray':[4,2]}});
  map.addLayer({id:'ksec-p',type:'circle',source:'ksec',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':6,'circle-color':'#fff','circle-stroke-color':'#141414','circle-stroke-width':2}});
  map.addLayer({id:'ksec-t',type:'symbol',source:'ksec',filter:['==',['geometry-type'],'Point'],layout:{'text-field':['get','n'],'text-font':['Noto Sans Regular'],'text-size':12,'text-offset':[0,-1.3]},paint:{'text-color':'#141414','text-halo-color':'#fff','text-halo-width':1.5}});
  map.addSource('ctx',{type:'geojson',data:FC()});
  map.addLayer({id:'ctx',type:'fill-extrusion',source:'ctx',paint:{'fill-extrusion-color':'#c9c6bf','fill-extrusion-height':['get','h'],'fill-extrusion-base':0,'fill-extrusion-opacity':.75}});
  map.addSource('wind',{type:'image',url:BLANK,coordinates:[[69.27,41.32],[69.28,41.32],[69.28,41.31],[69.27,41.31]]});
  map.addLayer({id:'wind',type:'raster',source:'wind',layout:{visibility:'none'},paint:{'raster-opacity':.85,'raster-fade-duration':0,'raster-resampling':'linear'}});
  map.addLayer({id:'windc',type:'line',source:'windc',layout:{'line-cap':'round'},paint:{'line-color':'#1f6fb2','line-width':['interpolate',['linear'],['zoom'],14,2,17,5],'line-opacity':['get','o']}});
  map.addLayer({id:'shadow',type:'fill',source:'shadow',paint:{'fill-color':'#1f2b3d','fill-opacity':.4}});
  map.addLayer({id:'blds',type:'fill-extrusion',source:'blds',filter:['!=',['get','sl'],1],paint:{'fill-extrusion-color':['case',['==',['get','rf'],1],['get','rc'],['==',['get','ef'],1],'#f0b323',['get','bs'],'#7fb0e0',['get','out'],'#e8998c',['==',['get','nr'],1],'#8fb9cf',['get','s'],'#cfe0f2',['get','c']],'fill-extrusion-height':['get','h'],'fill-extrusion-base':['coalesce',['get','b'],0],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':false}});
  /* qavatlar orasidagi plita — qavat chiziqlari */
  map.addLayer({id:'blds-slab',type:'fill-extrusion',source:'blds',filter:['==',['get','sl'],1],paint:{'fill-extrusion-color':'#4a4a48','fill-extrusion-height':['get','h'],'fill-extrusion-base':['get','b'],'fill-extrusion-opacity':.96}});
  map.addLayer({id:'blds-line',type:'line',source:'blds',filter:['==',['get','o'],1],paint:{'line-color':'#111','line-width':.9,'line-opacity':['case',['==',['get','__p'],1],0,.85]}});
  map.addLayer({id:'dist',type:'line',source:'dist',paint:{'line-color':['get','c'],'line-width':1.8,'line-dasharray':[3,2]}});
  map.addLayer({id:'insp',type:'circle',source:'insp',paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,2,17,5],'circle-color':['get','c'],'circle-stroke-color':'#fff','circle-stroke-width':['interpolate',['linear'],['zoom'],14,0,16,1]}});
  map.addLayer({id:'walk',type:'circle',source:'walk',paint:{'circle-radius':['interpolate',['linear'],['zoom'],14,3,17,7],'circle-color':['get','c'],'circle-stroke-color':'#fff','circle-stroke-width':1.2}});
  map.addLayer({id:'nbp-fill',type:'fill',source:'nbp',paint:{'fill-color':['case',['get','ok'],'#7fb0e0','#e8998c'],'fill-opacity':.55}});
  map.addLayer({id:'nbp-line',type:'line',source:'nbp',paint:{'line-color':'#2a6fb0','line-width':1.6,'line-dasharray':[3,2]}});
  map.addSource('fe',{type:'geojson',data:FC()});
  map.addLayer({id:'fe-ghost',type:'line',source:'fe',filter:['==',['get','k'],'g'],paint:{'line-color':'#141414','line-width':1,'line-dasharray':[2,2],'line-opacity':.6}});
  map.addLayer({id:'fe-fill',type:'fill',source:'fe',filter:['==',['get','k'],'l'],paint:{'fill-color':'#f0b323','fill-opacity':.25}});
  map.addLayer({id:'fe-line',type:'line',source:'fe',filter:['==',['get','k'],'l'],paint:{'line-color':'#c27c00','line-width':2.6}});
  map.addLayer({id:'fe-edge',type:'line',source:'fe',filter:['==',['get','k'],'e'],paint:{'line-color':'#1d6fa5','line-width':5}});
  map.addLayer({id:'fe-mid',type:'circle',source:'fe',filter:['==',['get','k'],'m'],paint:{'circle-radius':5,'circle-color':'#1d6fa5','circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  map.addLayer({id:'fe-v',type:'circle',source:'fe',filter:['==',['get','k'],'v'],paint:{'circle-radius':5.5,'circle-color':'#fff','circle-stroke-color':'#c27c00','circle-stroke-width':2}});
  map.addLayer({id:'fg',type:'fill',source:'blds',layout:{visibility:'none'},paint:{'fill-color':'#111','fill-antialias':true}});
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
  let base=SITE?plotFeature():null;
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
const defG=typ=>{const t=MRGEN.TYP[typ];return Object.assign({typ,far:t.far,fl:t.fl,sb:t.sb},JSON.parse(JSON.stringify(t.g||{})));};
function ubHTML(g){const n=(k,l,mn,mx,st)=>`<label class="note" style="display:grid;gap:2px">${esc(T(l))}<input type="number" data-ub="${k}" min="${mn}" max="${mx}" step="${st}" value="${g[k]}" style="width:100%"></label>`;
  return `<div style="border:1px solid var(--line);padding:8px;display:flex;flex-direction:column;gap:8px"><span class="lb">${esc(T('Urban blok'))}</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${n('sl','Seksiya uzunligi, m',12,90,1)}${n('sd','Seksiya chuqurligi, m',9,30,1)}</div>
    <label class="note" style="display:grid;gap:2px">${esc(T('Kichik blok oʻlchami (analog)'))}<select data-ub="bk"><option value="avto" ${g.bk==='avto'?'selected':''}>${esc(T('Qoʻlda'))}</option>${window.MRBLOK?MRBLOK.L.filter(x=>x.bx<=250).map(x=>`<option value="${x.id}" ${g.bk===x.id?'selected':''}>${esc(T(x.n))} · ${x.bx}×${x.by}</option>`).join(''):''}</select></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${g.bk==='avto'?n('bs','Blok oʻlchami, m',40,300,5):'<span></span>'}${n('pw','Ichki koʻcha, m',0,40,1)}</div>
    <label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-ub="yopiq" ${g.yopiq?'checked':''}> ${esc(T('Yopiq perimetr (seksiyalar tutash, hovli Hmax · 2,3)'))}</label>
    <span class="note">${esc(T('Qavatlar'))}</span>
    <div class="seg" role="group" aria-label="${esc(T('Qavatlar rejimi'))}"><button data-flm="teng" aria-pressed="${g.flm==='teng'}">${esc(T('Bir xil'))}</button><button data-flm="burchak" aria-pressed="${g.flm==='burchak'}">${esc(T('Burchak aksenti +3'))}</button><button data-flm="janub" aria-pressed="${g.flm==='janub'}">${esc(T('Janubga pasayadi'))}</button></div>
    <p class="note" style="margin:0">${esc(T('Har bir seksiyaning qavatini keyin B asbobida alohida oʻzgartirasiz (birinchi oʻzgarishda kvartal qulflanadi).'))}</p></div>`;}
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
    <label class="note" style="display:flex;gap:6px;align-items:center;justify-content:space-between">${esc(T('yoki maqsadli GFA, m²'))}<input type="number" id="gGfa" min="100" step="1000" value="${Math.round(g.far*b.ha*1e4)}" style="width:110px"></label>
    <label class="rng"><span>${esc(T('Maks. qavat'))} <b>${g.fl}</b></span><input type="range" id="gFl" min="1" max="30" step="1" value="${g.fl}"></label>
    <label class="rng"><span>${esc(T('Qizil chiziqdan chekinish'))} <b>${g.sb} m</b></span><input type="range" id="gSb" min="0" max="20" step="1" value="${g.sb}"></label>
    ${g.typ==='urban'?ubHTML(g):''}
    <div class="kv"><span>${esc(T('Binolar'))}</span><b>${r.blds?r.blds.length:0} · ${fmt(r.flAvg||0,1)} ${esc(T('qavat'))}</b><span>GFA</span><b>${fmt(r.gfa,0)} m²</b><span>${esc(T('FAR (erishildi)'))}</span><b>${fmt(r.far,2)}</b><span>${esc(T('Qoplam'))}</span><b>${r.A?fmt(r.fp/r.A*100,0):'—'} %</b>${r.kv?`<span>${esc(T('Kvartiralar'))}</span><b>${fmt(r.kv,0)}</b><span>${esc(T('Aholi'))}</span><b>${fmt(r.pop,0)}</b><span>${esc(T('Netto zichlik'))} ${gi('brutto')}</span><b>${fmt(r.pop/b.ha,0)} ${esc(T('kishi/ga'))}</b>`:''}</div>
    
    <label class="chk" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="checkbox" id="gSeis" ${g.seis!==false?'checked':''}> ${esc(T('Seysmik hudud (8+ ball): binolar orasi ≥ 2H'))}</label>
    ${(r.warn||[]).map(w=>`<p class="warnn">${esc(T(w))}</p>`).join('')}
    ${r.rules&&r.rules.length?`<details class="grl"><summary class="lb">${esc(T('Qoʻllangan qoidalar'))} · ${r.rules.length}</summary>${r.rules.map(x=>`<div class="grr"><span>${esc(T(x.t))}</span><b>${esc(T(x.v))}</b><small>${esc(T(x.src))}</small></div>`).join('')}</details>`:''}
    <div class="brow"><button class="btn" id="genLock" title="${esc(T('Binolar hujjatga saqlanadi va generator ularni qayta chizmaydi'))}">${LOCK_SVG} ${esc(T('Qulflash'))}</button><button class="btn" id="genOff">${esc(T('Binolarni olib tashlash'))}</button></div></div>`;
  return h;}
function bindGen(b){if(!b)return;const rec=()=>zoneRec(b,true);
  const go=$('#genGo');if(go)go.onclick=()=>act(()=>{rec().g=b.z&&b.z.z==='ijtimoiy'?{typ:'perimetr',far:.6,fl:3,sb:10}:defG(b.ha<1.5?'perimetr':'seksiya');});
  $$('#panel [data-typ]').forEach(x=>x.onclick=()=>act(()=>{const g=rec().g,t=x.dataset.typ;rec().g=Object.assign(defG(t),{sb:g.sb});}));
  {const sz=$('#gSeis');if(sz)sz.onchange=()=>act(()=>{rec().g.seis=sz.checked;});}
  {const gg=$('#gGfa');if(gg)gg.onchange=()=>act(()=>{rec().g.far=Math.max(.05,Math.min(8,Math.round((+gg.value||0)/(b.ha*1e4)*100)/100));});}
  /* urban blok parametrlari */
  $$('#panel [data-ub]').forEach(i=>i.onchange=()=>act(()=>{const g=rec().g,k=i.dataset.ub;g[k]=i.type==='checkbox'?i.checked:i.type==='number'?Math.max(+i.min||0,Math.min(+i.max||999,+i.value||0)):i.value;}));
  $$('#panel [data-flm]').forEach(x=>x.onclick=()=>act(()=>{rec().g.flm=x.dataset.flm;}));
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
/* bino hajmi: pogʻonalar (N-qavatdan ichkariga X m) va pastki turar joy boʻlmagan qavatlar (nr) boʻyicha boʻlaklar
   seg: [{f0,f1,poly,nr}] — f0..f1 qavatlar (0 — yer sathi), poly — shu qavatlardagi dogʻ */
function bldMass(x){
  const fl=x.fl,base=x.f,nr=Math.max(0,Math.min(fl,x.nr||0));
  const T=(x.tiers||[]).filter(t=>t.from>1&&t.from<=fl&&(t.in>0||t.cs)).sort((a,b)=>a.from-b.from);
  const cuts=[0,...T.map(t=>t.from-1),fl].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
  if(nr>0&&nr<fl&&!cuts.includes(nr)){cuts.push(nr);cuts.sort((a,b)=>a-b);}
  const seg=[];let gfa=0,res=0;
  for(let i=0;i<cuts.length-1;i++){const f0=cuts[i],f1=cuts[i+1];if(f1<=f0)continue;
    const t=T.filter(t=>t.from-1<=f0).pop();let poly=base;
    if(t&&t.cs){try{poly=turf.polygon(t.cs);}catch(_){}}
    else if(t){try{const q=turf.buffer(base,-t.in,{units:'meters'});if(q&&q.geometry&&turf.area(q)>20)poly=q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]);}catch(_){}}
    const a=turf.area(poly),n=f1-f0;gfa+=a*n;const isNr=f1<=nr;if(!isNr)res+=a*n;seg.push({f0,f1,poly,nr:isNr,a});}
  return {seg,gfa,res};}
/* ---------- qavatni qoʻlda tahrirlash ---------- */
function feRing(){if(!S.fe)return null;const o=bldRec(S.fe.zid,S.fe.bid);if(!o)return null;const m=o.x.seg||bldMass(o.x).seg,f=S.fe.fl;
  const g=m.find(g=>g.f0<f&&f<=g.f1)||m[m.length-1];const below=f>1?(m.find(g=>g.f0<f-1&&f-1<=g.f1)||null):null;
  return {o,poly:g.poly,below:below&&below!==g?below.poly:null};}
const LM=c=>({kx:111320*Math.cos(c[1]*Math.PI/180),ky:110540});
/* ---------- arxitektura uslubi va tom ----------
   Uslub — vizual taqdimot uchun tayyor toʻplam (devor/tom rangi, standart tom); meʼyor emas.
   Tom MapLibre da qatlam-qatlam prizmalar bilan taxminlanadi (pogʻonali nishab) — hajm va siluet uchun, ishchi chizma emas. */
const STY={
  zamonaviy:{n:'Zamonaviy',wall:'#f2f0ea',roof:'#9c9a94',rf:'parapet'},
  sovet:{n:'Sovet modernizmi',wall:'#e2e0da',roof:'#8a8984',rf:'flat'},
  neoklassik:{n:'Neoklassik',wall:'#efe2c4',roof:'#6f7f86',rf:'mansard'},
  milliy:{n:'Milliy (sharqona)',wall:'#e8d3ad',roof:'#2e7f8e',rf:'dome'},
  yevropa:{n:'Anʼanaviy yevropa',wall:'#efe7da',roof:'#a5533b',rf:'gable',slope:35},
  skandinav:{n:'Skandinav',wall:'#d8d0c2',roof:'#3a3a3a',rf:'gable',slope:42},
  /* vernakular (xalq meʼmorchiligi) — rang va tom shakli boʻyicha umumlashtirilgan taqdimot toʻplami */
  paxsa:{n:'Paxsa / guvala (Xorazm, Buxoro)',wall:'#d6bf94',roof:'#b9a27a',rf:'flat'},
  ayvon:{n:'Ayvonli hovli (Fargʻona)',wall:'#efe6d2',roof:'#8a6a4a',rf:'hip',slope:18},
  ortayer:{n:'Oʻrta yer dengizi',wall:'#f6f3ec',roof:'#b5583a',rf:'hip',slope:22},
  machiya:{n:'Machiya (Kioto)',wall:'#e8e0d0',roof:'#4b4b4b',rf:'gable',slope:25},
  qishloq:{n:'Kirpich mahalla uyi',wall:'#c9876a',roof:'#7a7f86',rf:'gable',slope:20}};
const ROOF={flat:'Tekis',parapet:'Parapet',gable:'Ikki nishabli',hip:'Toʻrt nishabli',mansard:'Mansard',dome:'Gumbaz'};
function roofOf(x){const st=STY[x.sty]||null;return {rf:x.roof||(st&&st.rf)||'flat',slope:x.slope||(st&&st.slope)||30,wall:(x.fc&&x.fc.wall)||(st&&st.wall),rc:x.rc||(st&&st.roof)||'#8f8d88'};}
/* Bino studiyasi (bino.html): kvartal qulflanadi, tanlov va atrof (qoʻshni binolar, kvartal) localStorage orqali uzatiladi */
function openStudio(zid,bid){const b=blkOfZ(zid);if(!b)return;if(!(b.z.lock&&b.z.blds))act(()=>{bake(b);});
  const o=bldRec(zid,bid);if(!o)return;const c=turf.centroid(o.x.f).geometry.coordinates,nb=[];
  BLK.forEach(k=>{if(!k.r)return;k.r.blds.forEach(y=>{if(k===b&&y.id===bid)return;try{if(turf.distance(c,turf.centroid(y.f),{units:'meters'})<260)nb.push({cs:y.f.geometry.coordinates,fl:y.fl});}catch(_){}});});
  try{localStorage.setItem('kps_bino_ctx',JSON.stringify({blk:b.f.geometry.coordinates[0],nb:nb.slice(0,160)}));localStorage.setItem('kps_bino_sel',JSON.stringify({zid,bid}));}catch(_){}
  if(window.parent!==window)window.parent.postMessage({kps:'go',href:'bino.html'},location.origin);else location.href='bino.html';}
/* tom boʻlaklari: [{poly, b, h}] — b/h tom tagidan, metrda */
function roofParts(poly,R){const out=[];if(!poly||R.rf==='flat')return out;
  let f=poly;try{if(f.geometry.type!=='Polygon')return out;}catch(_){return out;}
  if(R.rf==='parapet'){try{const inr=turf.buffer(f,-.35,{units:'meters'});if(inr&&inr.geometry.type==='Polygon')out.push({poly:turf.polygon([f.geometry.coordinates[0],inr.geometry.coordinates[0].slice().reverse()]),b:0,h:1});}catch(_){}return out;}
  const c=turf.centroid(f).geometry.coordinates,K=LM(c),rotA=90-MRGEN.mainBearing(f),rot=turf.transformRotate(f,rotA,{pivot:c}),bb=turf.bbox(rot);
  const halfW=Math.max(1,(bb[3]-bb[1])*K.ky/2),tan=Math.tan(Math.max(5,Math.min(60,R.slope))*Math.PI/180),N=6;
  if(R.rf==='gable'){const rh=halfW*tan;for(let i=0;i<N;i++){const k=1-i/N,q=turf.clone(rot);turf.coordEach(q,p=>{p[1]=c[1]+(p[1]-c[1])*k;});out.push({poly:turf.transformRotate(q,-rotA,{pivot:c}),b:i*rh/N,h:(i+1)*rh/N});}return out;}
  if(R.rf==='hip'){const rh=halfW*tan;for(let i=0;i<N;i++){const d=halfW*i/N;let q=f;if(d>0){try{q=turf.buffer(f,-d,{units:'meters'});}catch(_){q=null;}}if(!q||turf.area(q)<4)break;q=q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]);out.push({poly:q,b:i*rh/N,h:(i+1)*rh/N});}return out;}
  if(R.rf==='mansard'){[[.9,0,2.2],[1.8,2.2,3.2]].forEach(([d,b,h])=>{try{const q=turf.buffer(f,-d,{units:'meters'});if(q&&turf.area(q)>8)out.push({poly:q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]),b,h});}catch(_){}});return out;}
  if(R.rf==='dome'){const r=Math.min(halfW*.8,12),drum=Math.max(.8,r*.25);out.push({poly:turf.circle(c,r*1.05,{units:'meters',steps:40}),b:0,h:drum});
    for(let i=0;i<N;i++){const a0=i/N*Math.PI/2,a1=(i+1)/N*Math.PI/2;out.push({poly:turf.circle(c,r*Math.cos(a0),{units:'meters',steps:40}),b:drum+r*Math.sin(a0),h:drum+r*Math.sin(a1)});}return out;}
  return out;}
function feDraw(){const src=map.getSource('fe');if(!src)return;const r=S.fe&&feRing();if(!r){src.setData(FC());return;}
  const ring=(S.fed&&S.fed.cur)||r.poly.geometry.coordinates[0],open=ring.slice(0,-1),f=[];
  if(r.below)f.push({type:'Feature',properties:{k:'g'},geometry:{type:'LineString',coordinates:r.below.geometry.coordinates[0]}});
  f.push({type:'Feature',properties:{k:'l'},geometry:{type:'Polygon',coordinates:[ring]}});
  if(S.fed&&S.fed.t==='e'){const i=S.fed.i;f.push({type:'Feature',properties:{k:'e'},geometry:{type:'LineString',coordinates:[open[i],open[(i+1)%open.length]]}});}
  open.forEach((p,i)=>{const q=open[(i+1)%open.length];f.push({type:'Feature',properties:{k:'v',i},geometry:{type:'Point',coordinates:p}});f.push({type:'Feature',properties:{k:'m',i},geometry:{type:'Point',coordinates:[(p[0]+q[0])/2,(p[1]+q[1])/2]}});});
  src.setData(FC(f));}
function feHit(pt){const r=feRing();if(!r)return null;const open=r.poly.geometry.coordinates[0].slice(0,-1);let best=null,bd=11;
  open.forEach((p,i)=>{const a=map.project(p),d=Math.hypot(a.x-pt.x,a.y-pt.y);if(d<bd){bd=d;best={t:'v',i};}});
  if(best)return best;bd=10;
  open.forEach((p,i)=>{const a=map.project(p),b=map.project(open[(i+1)%open.length]),dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy;if(!L)return;let t=((pt.x-a.x)*dx+(pt.y-a.y)*dy)/L;t=Math.max(0,Math.min(1,t));const d=Math.hypot(pt.x-a.x-t*dx,pt.y-a.y-t*dy);if(d<bd){bd=d;best={t:'e',i};}});
  return best;}
function feDown(e){const h=feHit(e.point);if(!h)return false;const r=feRing();e.preventDefault();map.dragPan.disable();
  S.fed=Object.assign(h,{p0:e.lngLat.toArray(),orig:r.poly.geometry.coordinates[0].map(p=>p.slice()),holes:r.poly.geometry.coordinates.slice(1),cur:null});return true;}
function feMove(e){const d=S.fed;if(!d)return;const ll=e.lngLat.toArray(),K=LM(d.p0),dx=(ll[0]-d.p0[0])*K.kx,dy=(ll[1]-d.p0[1])*K.ky,open=d.orig.slice(0,-1).map(p=>p.slice()),n=open.length,tip=$('#tip');
  if(d.t==='v'){let mx=dx,my=dy;if(S.shift){mx=Math.round(mx);my=Math.round(my);}open[d.i]=[open[d.i][0]+mx/K.kx,open[d.i][1]+my/K.ky];tip.textContent=`${fmt(Math.hypot(mx,my),1)} m`;}
  else{const A=open[d.i],B=open[(d.i+1)%n],ex=(B[0]-A[0])*K.kx,ey=(B[1]-A[1])*K.ky,L=Math.hypot(ex,ey)||1,nx=-ey/L,ny=ex/L;
    let s=dx*nx+dy*ny;s=S.shift?Math.round(s):Math.round(s*10)/10;
    /* tashqariga/ichkariga: markazga nisbatan */
    const c=turf.centroid(turf.polygon([d.orig])).geometry.coordinates,mid=[(A[0]+B[0])/2,(A[1]+B[1])/2],out=((mid[0]-c[0])*K.kx*nx+(mid[1]-c[1])*K.ky*ny)>0?1:-1;
    const W=FE.mode==='seg'?Math.max(.5,+FE.w||6):0;
    if(W&&W<L-.2){/* faqat ushlangan joy atrofidagi W metrli qism: A … P1, P1', P2', P2 … B */
      const t=Math.max(0,Math.min(1,((d.p0[0]-A[0])*K.kx*ex/L+(d.p0[1]-A[1])*K.ky*ey/L)/L)),h=W/L/2,t0=Math.max(0,Math.min(1-2*h,t-h)),t1=t0+2*h;
      const at=u=>[A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u],off=p=>[p[0]+s*nx/K.kx,p[1]+s*ny/K.ky],P1=at(t0),P2=at(t1);
      open.splice(d.i+1,0,P1,off(P1),off(P2),P2);d.segW=W;}
    else [d.i,(d.i+1)%n].forEach(j=>{open[j]=[open[j][0]+s*nx/K.kx,open[j][1]+s*ny/K.ky];});
    tip.textContent=`${s*out>=0?T('tashqariga'):T('ichkariga')} ${fmt(Math.abs(s),1)} m`;}
  d.cur=[...open,open[0]];tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';feDraw();}
function feUp(){const d=S.fed;if(!d)return;S.fed=null;map.dragPan.enable();$('#tip').textContent='';if(!d.cur){feDraw();return;}
  const cs=cs7([d.cur,...d.holes]),fl=S.fe.fl;let ok=true;try{ok=turf.area(turf.polygon(cs))>12&&turf.kinks(turf.polygon(cs)).features.length===0;}catch(_){ok=false;}
  if(!ok){$('#tip').textContent=T('Shakl oʻzini kesib oʻtdi — bekor qilindi');setTimeout(()=>{$('#tip').textContent='';},1800);feDraw();return;}
  const to=FE.to&&FE.to>=fl?FE.to:0;
  editBld(S.fe.zid,S.fe.bid,x=>{
    /* «…qavatgacha»: undan yuqori qavat oldingi shaklida qoladi (agar u yerda pogʻona boʻlmasa) */
    let keep=null;if(to&&to<x.fl){const m=bldMass(x).seg,g=m.find(g=>g.f0<to+1&&to+1<=g.f1);if(g)keep=cs7(g.poly.geometry.coordinates);}
    const t=x.tiers||(x.tiers=[]);
    if(fl===1)x.cs=cs;else{const e=t.find(t=>t.from===fl);if(e){e.cs=cs;delete e.in;}else t.push({from:fl,cs});}
    if(keep&&!t.some(q=>q.from===to+1))t.push({from:to+1,cs:keep});
    if(!t.length)delete x.tiers;});}
/* fasad tahriri sozlamalari: butun devor yoki bo'lak (kenglik, m), qaysi qavatgacha */
const FE={mode:'wall',w:6,to:0};
function bldPop(b,x){const res=RES_SHARE[b.z.z]||0,m=bldMass(x),g=(x.nr!=null||(x.tiers&&x.tiers.length))&&res?m.res*(b.z.z==='turar'?1:res):m.gfa*res;return g*KP.get('netGross')/KP.get('unitM2')*KP.get('hh');}
/* kvartirografiya (js/mr-kvartira.js): korpus oʻlchamlari — dogʻ perimetri va maydonidan (toʻgʻri toʻrtburchak uchun aniq) */
const kvTypes=()=>(D.kvT&&D.kvT.length===KVART.TYPES0.length?D.kvT.map((t,i)=>Object.assign({},KVART.TYPES0[i],t)):KVART.TYPES0.map(t=>Object.assign({},t)));
function slabDims(poly){const a=turf.area(poly);let P=0;turf.flattenEach(poly,f=>{f.geometry.coordinates.forEach(r=>{P+=turf.length(turf.lineString(r),{units:'meters'});});});
  const h=P/2,disc=Math.max(0,h*h-4*a),A=(h+Math.sqrt(disc))/2;return {A,D:A?a/A:0};}
function kvOf(x){if(!x.kv)return null;const m=x.seg?{seg:x.seg}:bldMass(x);
  const parts=m.seg.filter(g=>!g.nr).map(g=>Object.assign(slabDims(g.poly),{floors:g.f1-g.f0}));
  if(!parts.length)return null;return KVART.building(parts,x.kv,kvTypes());}
const KVDEF=()=>({sys:'sec',goal:.35,seed:1,pick:0});
function kvHTML(b,x){
  const res=(RES_SHARE[b.z.z]||0)>0;if(!res)return '';
  const head=`<span class="lb">${esc(T('Kvartirografiya'))}</span>`;
  if(!x.kv){const est=bldPop(b,x)/KP.get('hh');
    return `<div class="bsec">${head}<p class="note" style="margin:0">${esc(T('Hozir xonadonlar GFA dan taxmin qilinadi'))}: ~${fmt(est,0)}.</p>
      <div class="brow"><button class="btn dark" id="kvOn">${esc(T('Kvartirografiyani hisoblash'))}</button><button class="btn" id="kvAll" title="${esc(T('Barcha turar joy va aralash binolariga — kvartallar qulflanadi'))}">${esc(T('Barcha binolarga'))}</button></div></div>`;}
  const R=x.kvR||kvOf(x),TY=kvTypes(),P=x.kv;
  if(!R||!R.main)return `<div class="bsec">${head}<p class="warnn">${esc(T('Korpus juda kichik — kvartira sigʻmaydi.'))}</p><button class="btn" id="kvOff">${esc(T('Oʻchirish'))}</button></div>`;
  const pick=Math.min(P.pick||0,R.main.V.length-1),m=bldMass(x),K=m.gfa?R.net/m.gfa:0,ud=R.main.G.ud;
  const bad=TY.filter(t=>Math.max(t.min/ud,3.3)>t.max/ud).map(t=>t.name);
  return `<div class="bsec">${head}
    <div class="seg seg3" role="group" aria-label="${esc(T('Rejalash tizimi'))}">${Object.entries(KVART.SYS).map(([k,n])=>`<button data-kvs="${k}" aria-pressed="${(P.sys||'sec')===k}">${esc(T(n)).toUpperCase()}</button>`).join('')}</div>
    <label class="kvg"><span>${esc(T('Nisbatga aniqlik'))}</span><input type="range" min="0" max="1" step="0.05" value="${P.goal??.35}" id="kvGoal" aria-label="${esc(T('Optimallash maqsadi'))}"><span>${esc(T('Maks. soni'))}</span></label>
    <div class="kvv" role="group" aria-label="${esc(T('Variantlar'))}">${R.main.V.map((v,k)=>`<button data-kvp="${k}" aria-pressed="${k===pick}" title="${v.n} ${esc(T('kv/qavat'))} · ${esc(T('ogʻish'))} ${(v.err*100).toFixed(1)}%"><b>${'ABCDEF'[k]}</b><span>${v.n}</span><i>${v.counts.map((c,i)=>c?`<em style="flex:${c};background:${TY[i].color}"></em>`:'').join('')}</i></button>`).join('')}<button id="kvRe" title="${esc(T('Yangi variantlar'))}" aria-label="${esc(T('Yangi variantlar'))}">↻</button></div>
    <div class="kvplan">${KVART.planSVG(R.main,pick,TY,268)}<span class="note">${esc(T('Tipik qavat'))} · ${fmt(R.main.G.A,1)} × ${fmt(R.main.G.D,1)} m${R.parts.length>1?` · ${esc(T('pogʻonalar alohida hisoblangan'))}`:''}</span></div>
    <div class="kv"><span>${esc(T('Xonadonlar jami'))}</span><b>${fmt(R.n,0)}</b><span>${esc(T('Qavatda'))}</span><b>${R.perFl}</b><span>${esc(T('Sotiladigan maydon'))}</span><b>${fmt(R.net,0)} m²</b><span>${esc(T('Samaradorlik K'))}</span><b>${K.toFixed(2).replace('.',',')}</b><span>${esc(T('Aholi'))}</span><b>${fmt(R.n*KP.get('hh'),0)}</b></div>
    <table class="kvt"><tr><th>${esc(T('Tur'))}</th><th>${esc(T('Maqsad'))}</th><th>${esc(T('Natija'))}</th><th>${esc(T('Soni'))}</th></tr>${TY.map((t,i)=>`<tr><td><i style="background:${t.color}"></i>${esc(T(t.name))}</td><td>${Math.round(R.tgt[i]*100)}%</td><td class="${Math.abs(R.share[i]-R.tgt[i])>.05?'off':''}">${Math.round(R.share[i]*100)}%</td><td>${fmt(R.counts[i],0)}</td></tr>`).join('')}</table>
    ${bad.length?`<p class="warnn">${esc(bad.join(', '))}: ${fmt(ud,1)} m ${esc(T('chuqurlikda maydon oraligʻiga sigʻmaydi.'))}</p>`:''}${ud>9?`<p class="warnn">${esc(T('Kvartira chuqurligi'))} ${fmt(ud,1)} m — ${esc(T('tabiiy yorugʻlik uchun chuqur.'))}</p>`:''}
    <details class="kvty"><summary>${esc(T('Kvartira turlari va maydonlari (butun loyiha)'))}</summary><table class="kvt">${TY.map((t,i)=>`<tr><td><i style="background:${t.color}"></i>${esc(T(t.name))}</td><td><input type="number" min="0" max="100" value="${t.target}" data-kt="${i}" aria-label="${esc(T(t.name))} ${esc(T('ulushi'))}">%</td><td><input type="number" min="15" max="250" value="${t.min}" data-kmin="${i}" aria-label="min m²">–<input type="number" min="15" max="300" value="${t.max}" data-kmax="${i}" aria-label="max m²"> m²</td></tr>`).join('')}</table><p class="note">${esc(T('Maydon oraliqlari namunaviy — loyiha normasiga moslang.'))}</p></details>
    <div class="brow"><button class="btn" id="kvCsv">${esc(T('Jadval (CSV)'))}</button><button class="btn" id="kvOff">${esc(T('Taxminga qaytarish'))}</button></div></div>`;}
function bindKv(){const z=S.sel&&S.sel.zid,bid=S.sel&&S.sel.bid;if(z==null)return;const ed=f=>editBld(z,bid,x=>{x.kv=Object.assign(KVDEF(),x.kv||{});f(x.kv,x);});const on=(id,f)=>{const e=$(id);if(e)e.onclick=f;};
  on('#kvOn',()=>ed(()=>{}));on('#kvOff',()=>editBld(z,bid,x=>{delete x.kv;}));on('#kvRe',()=>ed(k=>{k.seed=(k.seed||1)+1;k.pick=0;}));
  on('#kvAll',()=>act(()=>{BLK.forEach(b=>{if(!b.r||!b.z||!(RES_SHARE[b.z.z]>0))return;const rec=bake(b);rec.blds.forEach(x=>{if(!x.kv)x.kv=KVDEF();});});}));
  $$('#panel [data-kvs]').forEach(b=>b.onclick=()=>ed(k=>{k.sys=b.dataset.kvs;k.pick=0;}));
  $$('#panel [data-kvp]').forEach(b=>b.onclick=()=>ed(k=>{k.pick=+b.dataset.kvp;}));
  const g=$('#kvGoal');if(g)g.onchange=()=>ed(k=>{k.goal=+g.value;k.pick=0;});
  const setT=(i,key,v)=>act(()=>{const TY=kvTypes();TY[i][key]=v;if(TY[i].min>TY[i].max)TY[i].max=TY[i].min;D.kvT=TY.map(t=>({target:t.target,min:t.min,max:t.max}));});
  $$('#panel [data-kt]').forEach(i=>i.onchange=()=>setT(+i.dataset.kt,'target',Math.max(0,+i.value||0)));
  $$('#panel [data-kmin]').forEach(i=>i.onchange=()=>setT(+i.dataset.kmin,'min',Math.max(15,+i.value||15)));
  $$('#panel [data-kmax]').forEach(i=>i.onchange=()=>setT(+i.dataset.kmax,'max',Math.max(15,+i.value||15)));
  on('#kvCsv',()=>{const o=bldRec(z,bid);if(!o||!o.x.kvR)return;const R=o.x.kvR,TY=kvTypes(),pick=Math.min(o.x.kv.pick||0,R.main.V.length-1);
    const L=['Boʻlak;Qavatlar;Tur;Maydon_m2;Eni_m;Chuqurligi_m'];R.parts.forEach((p,pi)=>{const v=p.V[Math.min(pick,p.V.length-1)];if(v)v.units.forEach(u=>L.push([pi+1,p.floors,u.type>=0?TY[u.type].name:'Texnik',u.area.toFixed(1),(u.b-u.a).toFixed(2),u.d.toFixed(2)].join(';')));});
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+L.join('\n')],{type:'text/csv'}));a.download=`kvartirografiya-${(o.b.name||'K')}-${bid}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);});}
/* bino profili (kesim sxemasi): har qavat eni — dogʻ maydoniga mutanosib */
function bldProfile(x){const m=bldMass(x),A=turf.area(x.f)||1,H=Math.min(150,Math.max(60,x.fl*6)),fh=H/x.fl,W=150;
  return `<svg viewBox="0 0 ${W+40} ${H+14}" width="100%" style="max-width:260px;display:block" role="img" aria-label="${esc(T('Bino kesimi: qavatlar va pogʻonalar'))}">`+
    m.seg.map(g=>{const w=W*Math.sqrt(g.a/A),x0=(W-w)/2;return `<rect x="${x0.toFixed(1)}" y="${(H-g.f1*fh).toFixed(1)}" width="${w.toFixed(1)}" height="${((g.f1-g.f0)*fh).toFixed(1)}" fill="${g.nr?'#8fb9cf':'#f1ebdd'}" stroke="#141414" stroke-width=".8"/>`;}).join('')+
    `<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#141414" stroke-width="1.2"/>`+
    m.seg.map(g=>`<text x="${W+4}" y="${(H-g.f1*fh+9).toFixed(1)}" font-size="8.5" font-family="IBM Plex Mono,monospace" fill="#5e5c58">${g.f1}</text>`).join('')+`</svg>`;}
function bldHTML(o){const {b,x}=o,a=turf.area(x.f),pop=bldPop(b,x),locked=!!(b.z.lock&&b.z.blds),m=bldMass(x),nr=x.nr||0,tiers=(x.tiers||[]).slice().sort((p,q)=>p.from-q.from);
  return `<div class="lb">${esc(T('Tanlangan bino'))} · ${esc(b.name)}</div>
    <button class="btn dark" id="toStudio" style="width:100%;margin:6px 0 10px" title="${esc(T('Fasad, derazalar, balkonlar, tom, kvartiralar va render — alohida ekranda'))}">${esc(T('Bino studiyasi →'))}</button>
    <div class="fl" role="group" aria-label="${esc(T('Qavatlar'))}"><button id="flDn" aria-label="${esc(T('Qavatni kamaytirish'))}">−</button><b>${x.fl}</b><button id="flUp" aria-label="${esc(T('Qavatni oshirish'))}">+</button><span class="note" style="margin-left:10px">${esc(T('qavat'))} · ${fmt(x.fl*MRGEN.FH,1)} m</span></div>
    <div class="bsec"><span class="lb">${esc(T('Pastki qavatlar — turar joy emas'))}</span>
      <div class="fl" role="group" aria-label="${esc(T('Turar joy boʻlmagan pastki qavatlar'))}"><button id="nrDn" aria-label="−">−</button><b>${nr}</b><button id="nrUp" aria-label="+">+</button><span class="note" style="margin-left:10px">${nr?esc(T('1–'+nr+'-qavat: tijorat, xizmat')):esc(T('hammasi turar joy'))}</span></div></div>
    <div class="bsec"><span class="lb">${esc(T('Pogʻonalar'))}</span>
      ${tiers.length?tiers.map((t,i)=>`<div class="tier"><label>${esc(T('qavatdan'))}<input type="number" min="2" max="${x.fl}" step="1" value="${t.from}" data-tf="${i}" aria-label="${esc(T('Pogʻona boshlanadigan qavat'))}"></label>${t.cs?`<span class="note" style="padding-bottom:6px">${esc(T('qoʻlda chizilgan shakl'))}</span>`:`<label>${esc(T('ichkariga, m'))}<input type="number" min="0.5" max="30" step="0.5" value="${t.in}" data-ti="${i}" aria-label="${esc(T('Ichkariga chekinish, m'))}"></label>`}<button class="x" data-td="${i}" aria-label="${esc(T('Pogʻonani oʻchirish'))}">×</button></div>`).join(''):`<p class="note" style="margin:0">${esc(T('Pogʻona yoʻq — bino butun balandligi boʻyicha bir xil dogʻda.'))}</p>`}
      <button class="btn" id="tAdd" ${x.fl<3?'disabled':''}>+ ${esc(T('Pogʻona'))}</button></div>
    <div class="bsec"><span class="lb">${esc(T('Qavatni qoʻlda tahrirlash'))}</span>
      <div class="fl" role="group" aria-label="${esc(T('Tahrirlanadigan qavat'))}"><button id="feDn" aria-label="−">−</button><b>${S.fe&&S.fe.bid===x.id?S.fe.fl:Math.min(x.fl,2)}</b><button id="feUp" aria-label="+">+</button>
        <button class="btn ${S.fe?'dark':''}" id="feGo" style="margin-left:8px;width:auto;min-width:0;padding:0 12px;font-size:12px">${esc(T(S.fe?'Tugatish':'✎ Tahrirlash'))}</button></div>
      ${S.fe?`<div class="seg" role="group" aria-label="${esc(T('Nimani surish'))}" style="margin:6px 0"><button data-fem="wall" aria-pressed="${FE.mode==='wall'}">${esc(T('Butun devor'))}</button><button data-fem="seg" aria-pressed="${FE.mode==='seg'}">${esc(T('Devor boʻlagi'))}</button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">${FE.mode==='seg'?`<label class="note" style="display:grid;gap:2px">${esc(T('Boʻlak kengligi, m'))}<input type="number" id="feW" min="0.5" max="200" step="0.5" value="${FE.w}" style="width:80px"></label>`:''}
        <label class="note" style="display:grid;gap:2px">${esc(T('…qavatgacha (boʻsh — tepagacha)'))}<input type="number" id="feTo" min="${S.fe.fl}" max="${x.fl}" step="1" value="${FE.to||''}" placeholder="${x.fl}" style="width:80px"></label></div>
      <p class="note" style="margin:6px 0 0">${esc(T(FE.mode==='seg'?'Devorning kerakli joyini ushlab suring: shu joydan berilgan kenglikdagi qism chiqadi (eriker, balkon bloki) yoki kiradi (tokcha, lodjiya). Shift — 1 m qadam.':'Devorni (koʻk nuqta) ushlab suring — ichkariga yoki tashqariga; burchakni suring. Shift — 1 m qadam.'))} ${esc(T('Oʻzgarish shu qavatdan'))} ${FE.to&&FE.to<x.fl?esc(T(FE.to+'-qavatgacha')):esc(T('yuqoriga (keyingi pogʻonagacha)'))}.</p>${S.fe.fl>1&&(x.tiers||[]).some(t=>t.from===S.fe.fl)?`<button class="btn" id="feRst">${esc(T('Bu qavatni asl holiga'))}</button>`:''}`:''}</div>
    <div class="bsec"><span class="lb">${esc(T('Uslub va tom'))}</span>
      <div class="tseg" role="group" aria-label="${esc(T('Arxitektura uslubi'))}">${Object.entries(STY).map(([k,v])=>`<button data-sty="${k}" aria-pressed="${x.sty===k}" title="${esc(T(v.n))}"><i style="display:inline-block;width:10px;height:10px;background:${v.wall};border:1px solid ${v.roof};margin-right:5px;vertical-align:-1px"></i>${esc(T(v.n))}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="${esc(T('Tom turi'))}" style="flex-wrap:wrap">${Object.entries(ROOF).map(([k,v])=>`<button data-roof="${k}" aria-pressed="${roofOf(x).rf===k}">${esc(T(v))}</button>`).join('')}</div>
      ${['gable','hip'].includes(roofOf(x).rf)?`<label class="rng"><span>${esc(T('Nishab'))} <b>${roofOf(x).slope}°</b></span><input type="range" id="roofSl" min="10" max="60" step="1" value="${roofOf(x).slope}"></label>`:''}
      <p class="note" style="margin:0">${esc(T('Uslub — taqdimot uchun rang va tom toʻplami. Tom 3D da pogʻonali taxmin bilan koʻrsatiladi.'))}</p></div>
    <div class="bprof">${bldProfile(x)}</div>
    ${kvHTML(b,x)}
    <div class="kv"><span>${esc(T('Dogʻ maydoni'))}</span><b>${fmt(a,0)} m²</b><span>GFA</span><b>${fmt(m.gfa,0)} m²</b><span>${esc(T('Turar joy GFA'))}</span><b>${fmt(m.res,0)} m²</b>${pop?`<span>${esc(T('Aholi (taxmin)'))}</span><b>${fmt(pop,0)}</b>`:''}<span>${esc(T('Holat'))}</span><b>${esc(T(locked?'qoʻlda tahrirlangan':'generatsiya'))}</b></div>
    ${x.out?`<p class="warnn">${esc(T('Bino kvartal chegarasidan (qizil chiziqdan) chiqib ketgan — koʻcha yerida qurilish mumkin emas.'))}</p>`:''}
    <div class="brow"><button class="btn" id="bRotL" title="[">↺ 15°</button><button class="btn" id="bRotR" title="]">↻ 15°</button><button class="btn" id="bDup" title="Ctrl+D">${esc(T('Nusxa'))}</button><button class="btn bad" id="bDel" title="Delete">${esc(T('Oʻchirish'))}</button></div>
    ${locked?'':`<p class="note">${esc(T('Birinchi oʻzgarishda kvartal qulflanadi: binolar saqlanadi va generator ularni qayta chizmaydi.'))}</p>`}
    <div class="keys"><b>+ / −</b>${esc(T('qavat'))} · <b>←↑→↓</b>${esc(T('1 m surish'))} (<b>Shift</b> 5 m)<br><b>[ ]</b>${esc(T('burish'))} · <b>Ctrl+D</b>${esc(T('nusxa'))} · <b>Delete</b>${esc(T('oʻchirish'))}</div>
    <button class="btn" id="desel">${esc(T('Tanlovni bekor qilish'))}</button>`;}
function bindBld(o){if(!o)return;const on=(id,f)=>{const e=$(id);if(e)e.onclick=f;};
  on('#flUp',()=>bldOp('fl',1));on('#flDn',()=>bldOp('fl',-1));bindKv();
  on('#toStudio',()=>openStudio(S.sel.zid,S.sel.bid));
  const fx=()=>bldRec(S.sel.zid,S.sel.bid);
  on('#feGo',()=>{if(S.fe){S.fe=null;render();return;}const o=fx();if(!o)return;const fl=+($('#feDn')&&$('#feDn').nextElementSibling.textContent)||1;
    S.fe={zid:S.sel.zid,bid:S.sel.bid,fl:Math.max(1,Math.min(o.x.fl,fl))};if(S.view!=='plan'){const pb=document.querySelector('[data-view="plan"]');if(pb)pb.click();}render();});
  const feSet=d=>{const o=fx();if(!o)return;if(S.fe){S.fe.fl=Math.max(1,Math.min(o.x.fl,S.fe.fl+d));render();}else{const el=$('#feDn').nextElementSibling;el.textContent=Math.max(1,Math.min(o.x.fl,(+el.textContent||1)+d));}};
  on('#feUp',()=>feSet(1));on('#feDn',()=>feSet(-1));
  $$('#panel [data-fem]').forEach(b=>b.onclick=()=>{FE.mode=b.dataset.fem;render();});
  $$('#panel [data-sty]').forEach(b=>b.onclick=()=>editBld(S.sel.zid,S.sel.bid,x=>{if(x.sty===b.dataset.sty){delete x.sty;}else{x.sty=b.dataset.sty;delete x.roof;delete x.slope;}}));
  $$('#panel [data-roof]').forEach(b=>b.onclick=()=>editBld(S.sel.zid,S.sel.bid,x=>{x.roof=b.dataset.roof;}));
  {const sl=$('#roofSl');if(sl)sl.onchange=()=>editBld(S.sel.zid,S.sel.bid,x=>{x.slope=Math.round(+sl.value);});}
  {const w=$('#feW');if(w)w.onchange=()=>{FE.w=Math.max(.5,Math.min(200,+w.value||6));};const t=$('#feTo');if(t)t.onchange=()=>{const v=Math.round(+t.value||0);FE.to=v>0?v:0;render();};}
  on('#feRst',()=>editBld(S.fe.zid,S.fe.bid,x=>{x.tiers=(x.tiers||[]).filter(t=>t.from!==S.fe.fl);if(!x.tiers.length)delete x.tiers;}));
  on('#nrUp',()=>editBld(S.sel.zid,S.sel.bid,x=>{x.nr=Math.min(x.fl-1,(x.nr||0)+1);}));on('#nrDn',()=>editBld(S.sel.zid,S.sel.bid,x=>{x.nr=Math.max(0,(x.nr||0)-1);}));
  on('#tAdd',()=>editBld(S.sel.zid,S.sel.bid,x=>{const t=x.tiers||(x.tiers=[]);const last=t.reduce((a,b)=>Math.max(a,b.from),1);const from=Math.min(x.fl,Math.max(last+2,Math.ceil(x.fl*.7)));const prev=t.reduce((a,b)=>Math.max(a,b.in),0);t.push({from,in:prev+3});}));
  $$('#panel [data-td]').forEach(b=>b.onclick=()=>{const i=+b.dataset.td;editBld(S.sel.zid,S.sel.bid,x=>{const t=(x.tiers||[]).slice().sort((p,q)=>p.from-q.from);t.splice(i,1);x.tiers=t;if(!t.length)delete x.tiers;});});
  $$('#panel [data-tf]').forEach(inp=>inp.onchange=()=>{const i=+inp.dataset.tf;editBld(S.sel.zid,S.sel.bid,x=>{const t=x.tiers.slice().sort((p,q)=>p.from-q.from);t[i].from=Math.max(2,Math.min(x.fl,Math.round(+inp.value||2)));x.tiers=t;});});
  $$('#panel [data-ti]').forEach(inp=>inp.onchange=()=>{const i=+inp.dataset.ti;editBld(S.sel.zid,S.sel.bid,x=>{const t=x.tiers.slice().sort((p,q)=>p.from-q.from);t[i].in=Math.max(.5,Math.min(30,+inp.value||1));x.tiers=t;});});on('#bRotL',()=>bldOp('rot',-15));on('#bRotR',()=>bldOp('rot',15));on('#bDup',()=>bldOp('dup'));on('#bDel',()=>bldOp('del'));}
function bldOp(op,v){if(!S.sel||S.sel.t!=='bl')return;const {zid,bid}=S.sel;
  if(op==='fl')editBld(zid,bid,x=>{x.fl=Math.max(1,Math.min(60,x.fl+v));if(x.nr)x.nr=Math.min(x.nr,x.fl-1);if(x.tiers){x.tiers=x.tiers.filter(t=>t.from<=x.fl);if(!x.tiers.length)delete x.tiers;}});
  else if(op==='rot')editBld(zid,bid,x=>{x.cs=rotCs(x.cs,v);});
  else if(op==='mv')editBld(zid,bid,x=>{x.cs=moveCs(x.cs,v[0],v[1]);});
  else if(op==='del'){S.sel=null;editBld(zid,bid,(x,rec)=>{rec.blds=rec.blds.filter(y=>y!==x);});}
  else if(op==='dup')editBld(zid,bid,(x,rec)=>{const f=polyOf(x),br=MRGEN.mainBearing(f)+90;
    const d=Math.min(60,Math.sqrt(turf.area(f))*.8+8);const n={id:rec.bn++,cs:cs7(turf.transformTranslate(f,d,br,{units:'meters'}).geometry.coordinates),fl:x.fl};if(x.tiers)n.tiers=JSON.parse(JSON.stringify(x.tiers));if(x.nr)n.nr=x.nr;rec.blds.push(n);S.sel={t:'bl',zid,bid:n.id};});}
/* ---------- 5-bosqich: tekshiruv linzalari ---------- */
const LENS=(()=>{try{return Object.assign({sh:false,ins:false,dist:false,wind:false,walk:false,wt:'ijtimoiy'},JSON.parse(localStorage.getItem('kps_mr_lens')||'{}'));}catch(_){return {sh:false,ins:false,dist:false};}})();
const saveLens=()=>{try{localStorage.setItem('kps_mr_lens',JSON.stringify(LENS));}catch(_){}};
const BLANK=(()=>{const c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL();})();
/* shamol linzasi: ERA5 shamol guli + VENT indeksi (shamol boʻlimidagi model) */
const WS=(()=>{const d={season:'yil',slice:'sutka',mode:'gul',dir:null};try{return Object.assign(d,JSON.parse(localStorage.getItem('kps_mr_wind')||'{}'));}catch(_){return d;}})();
const saveWS=()=>{try{localStorage.setItem('kps_mr_wind',JSON.stringify(WS));}catch(_){}};
if(!WS.v)WS.v='loyiha';if(WS.ctx==null)WS.ctx=true;
/* ---------- atrofdagi mavjud binolar (OSM) — shamol va 3D uchun ----------
   Uchastka ichidagilar loyiha bilan almashadi deb olinadi (hisobga kirmaydi). Manba: 1-qadam ulashgan paket yoki Overpass (14 kun kesh). */
let CTX=null,CTXst='',CTXk='';
function ctxBB(){const r=plotRing()||siteRing();if(!r)return null;const b=turf.bbox(turf.buffer(turf.polygon([r]),400,{units:'meters'}));return [b[1],b[0],b[3],b[2]];}
function ctxLoad(){const bb=ctxBB();if(!bb||!window.KOSM)return;const k=bb.map(v=>v.toFixed(4)).join(',');if(k===CTXk&&CTXst)return;CTXk=k;CTXst='load';CTX=null;
  const q=`[out:json][timeout:60];way["building"](${bb.join(',')});out geom;`;
  KOSM.shared(bb).then(sh=>sh&&sh.kinds.includes('building')?sh:KOSM.fetch(q)).then(j=>{if(CTXk!==k)return;
    const pf=plotFeature(),lv=KP.get('lvUnknown')||2,out=[];
    (j.elements||[]).forEach(e=>{const t=e.tags||{};if(!t.building||t['building:part']||!e.geometry||e.geometry.length<4)return;
      const cs=e.geometry.map(g=>[g.lon,g.lat]);if(cs[0][0]!==cs[cs.length-1][0]||cs[0][1]!==cs[cs.length-1][1])cs.push(cs[0]);
      let c=null;try{c=turf.centroid(turf.polygon([cs])).geometry.coordinates;}catch(_){return;}
      if(pf&&inPoly(c,pf))return;
      const n=parseFloat(t['building:levels']),hh=parseFloat(String(t.height||'').replace(',','.'));
      out.push({cs,h:hh>0?hh:(n>0?n:lv)*MRGEN.FH});});
    CTX=out;CTXst='ok';ctxDraw();WINDK='';render();}).catch(()=>{if(CTXk===k){CTXst='err';renderPanel();}});}
function ctxDraw(){const src=map.getSource('ctx');if(!src)return;src.setData(FC(WS.ctx&&CTX?CTX.map(b=>({type:'Feature',properties:{h:b.h},geometry:{type:'Polygon',coordinates:[b.cs]}})):[]));}
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
  const ctx=WS.ctx&&CTX?CTX.map(b=>({pts:b.cs.slice(0,-1).map(F.xy),h:b.h})).filter(b=>b.pts.some(([x,y])=>x>=bb[0]&&x<=bb[2]&&y>=bb[1]&&y<=bb[3])):[];
  const proj=L.map(b=>({pts:b.cs[0].slice(0,-1).map(F.xy),h:b.h})),w=windW(),only=[];w.forEach((v,k)=>{if(v>0)only.push(k);});
  const run=list=>{const geo=VENT.geometry(list,g),P=VENT.ventilate(geo,g,{},only),idx=new Float32Array(g.N);only.forEach(k=>{const v=P[k];for(let q=0;q<g.N;q++)idx[q]+=w[k]*v[q];});return {geo,idx};};
  const A=run(WS.v==='mavjud'?ctx:ctx.concat(proj)),B=WS.v==='farq'?run(ctx):null,geo=A.geo,idx=A.idx;
  /* koʻrsatkichlar: hudud ichidagi ochiq (bino bilan band boʻlmagan) kataklar */
  let n=0,sum=0,st=0,dsum=0,worse=0;for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const q=j*g.nx+i;if(geo.lp[q]>.5)continue;const x=g.x0+(i+.5)*g.dx,y=g.y0+(j+.5)*g.dx;
    if(site&&!vInPoly(x,y,site))continue;n++;sum+=idx[q];if(idx[q]<.45)st++;if(B){dsum+=idx[q]-B.idx[q];if(idx[q]-B.idx[q]<-.1)worse++;}}
  
  /* rasm: turgʻunlik shkalasi (shamol boʻlimidagi bilan bir xil) */
  const c=document.createElement('canvas');c.width=g.nx;c.height=g.ny;const x2=c.getContext('2d',{willReadFrequently:true})   /* GPU-kanvas emas: putImageData tez */,im=x2.createImageData(g.nx,g.ny),d=im.data;
  const stops=[[0,[250,214,120]],[.5,[232,120,58]],[1,[160,30,30]]],ramp=t=>{t=Math.max(0,Math.min(1,t));for(let s=1;s<stops.length;s++)if(t<=stops[s][0]){const [a,ca]=stops[s-1],[b,cb]=stops[s],u=(t-a)/(b-a);return ca.map((v,i)=>v+(cb[i]-v)*u);}return stops[2][1];};
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const q=j*g.nx+i,o=((g.ny-1-j)*g.nx+i)*4;if(geo.lp[q]>=.5)continue;
    if(B){/* farq: qizil — loyiha havoni yomonlashtiradi, koʻk — yaxshilaydi */const df=idx[q]-B.idx[q],a=Math.min(1,Math.abs(df)/.35);if(Math.abs(df)<.02)continue;
      const col=df<0?[178,40,40]:[40,110,190];d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=Math.round((.15+a*.7)*255);continue;}
    const t=(.92-idx[q])/.6;if(t>.05){const col=ramp(t);d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=Math.round(Math.min(.85,.2+t*.7)*255);}}
  x2.putImageData(im,0,0);
  const x1=g.x0+g.nx*g.dx,y1=g.y0+g.ny*g.dx;
  return {url:c.toDataURL(),coords:[F.ll([g.x0,y1]),F.ll([x1,y1]),F.ll([x1,g.y0]),F.ll([g.x0,g.y0])],mean:n?sum/n:null,stag:n?st/n:null,n,dx:g.dx,w,v:WS.v,nCtx:ctx.length,dmean:B&&n?dsum/n:null,worse:B&&n?worse/n:null};}
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
/* 15 daqiqa: koʻcha tarmogʻi (oʻqlar) boʻylab piyoda masofa — turar joy binosidan maqsad zonadagi eng yaqin kvartalgacha */
const WT=[{k:'ijtimoiy',n:'Ijtimoiy (maktab, bogʻcha)',z:['ijtimoiy']},{k:'yashil',n:'Park (yashil hudud)',z:['yashil']},{k:'savdo',n:'Savdo (savdo + aralash)',z:['savdo','aralash']}];
const WBIN=[[5,'#1a7f4b'],[10,'#7fb24a'],[15,'#e0b13a'],[Infinity,'#c2432b']];
const minCol=m=>m==null?'#8a857c':WBIN.find(b=>m<=b[0])[1];
let WALK=null;
function walkCalc(){const o=origin(),F=MRCHK.frame(o[1],o[0]),sp=(KP.get('speed')||5)*1000/60;   // m/daqiqa
  const NX=new Map(D.nodes.map(n=>[n.id,F.xy(n.ll)]));const E=[];D.edges.forEach(e=>{const A=NX.get(e.a),B=NX.get(e.b);if(A&&B)E.push({a:e.a,b:e.b,A,B,len:Math.hypot(B[0]-A[0],B[1]-A[1])});});
  if(!E.length)return null;const adj=new Map();E.forEach(x=>{[[x.a,x.b],[x.b,x.a]].forEach(([u,v])=>{if(!adj.has(u))adj.set(u,[]);adj.get(u).push([v,x.len]);});});
  const snap=p=>{let best=null;E.forEach((x,k)=>{const dx=x.B[0]-x.A[0],dy=x.B[1]-x.A[1],l=dx*dx+dy*dy;let t=l?((p[0]-x.A[0])*dx+(p[1]-x.A[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(p[0]-(x.A[0]+t*dx),p[1]-(x.A[1]+t*dy));if(!best||d<best.d)best={k,t,d};});return best;};
  const res=[];BLK.forEach(b=>{if(!b.r||!(RES_SHARE[b.z.z]>0))return;b.r.blds.forEach(x=>{const c=turf.centroid(x.f).geometry.coordinates;res.push({zid:b.z.id,bid:x.id,z:b.z.z,ll:c,s:snap(F.xy(c)),pop:bldPop(b,x)});});});
  const out={sp,res,t:{}};
  WT.forEach(tg=>{const T=BLK.filter(b=>b.z&&tg.z.includes(b.z.z));const dist=new Map(),onEdge=new Map();
    /* manbalar: maqsad kvartal chegarasi boʻylab har 20 m dagi nuqtalar, eng yaqin koʻcha oʻqiga ulanadi */
    T.forEach(b=>{const ring=b.f.geometry.coordinates[0],L=turf.length(turf.lineString(ring),{units:'meters'}),n=Math.max(4,Math.round(L/20));
      for(let i=0;i<n;i++){const p=F.xy(turf.along(turf.lineString(ring),L*i/n,{units:'meters'}).geometry.coordinates),s=snap(p);if(!s||s.d>60)continue;const x=E[s.k];
        [[x.a,s.d+s.t*x.len],[x.b,s.d+(1-s.t)*x.len]].forEach(([u,c])=>{if(!(dist.get(u)<=c))dist.set(u,c);});
        if(!onEdge.has(s.k))onEdge.set(s.k,[]);onEdge.get(s.k).push(s);}});
    /* Dijkstra (tugunlar soni kichik — oddiy navbat) */
    const done=new Set();for(;;){let u=null,du=Infinity;dist.forEach((d,k)=>{if(!done.has(k)&&d<du){du=d;u=k;}});if(u==null)break;done.add(u);
      (adj.get(u)||[]).forEach(([v,l])=>{if(!(dist.get(v)<=du+l))dist.set(v,du+l);});}
    const tz=new Set(T.map(b=>b.z.id));
    out.t[tg.k]=res.map(r=>{if(!T.length)return null;if(tz.has(r.zid)||tg.z.includes(r.z))return 0;const s=r.s;if(!s)return null;const x=E[s.k];
      let m=Math.min((dist.get(x.a)??Infinity)+s.t*x.len,(dist.get(x.b)??Infinity)+(1-s.t)*x.len);
      (onEdge.get(s.k)||[]).forEach(q=>{m=Math.min(m,q.d+Math.abs(q.t-s.t)*x.len);});
      return isFinite(m)?(m+s.d)/sp:null;});
    const P=res.reduce((a,r)=>a+r.pop,0)||1;out.t[tg.k].share=[5,10,15].map(th=>res.reduce((a,r,i)=>a+(out.t[tg.k][i]!=null&&out.t[tg.k][i]<=th?r.pop:0),0)/P);
    out.t[tg.k].none=!T.length;});
  return out;}
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
    if(k!==INSK&&!busy()){INSK=k;INS=null;clearTimeout(INST);INST=setTimeout(()=>{const t0=performance.now();const r=MRCHK.insolation(L,F,{md:c.md,lat:o[1],lng:o[0],wz:c.wz,step:c.step});r.L=L;r.ms=performance.now()-t0;INS=r;paintIns();scheduleSnap();renderPanel();renderLens();},250);}
    paintIns();}
  else{INSK='';INS=null;map.getSource('insp').setData(FC());}
  /* 15 daqiqa */
  if(LENS.walk){if(!busy())WALK=walkCalc();const M=WALK&&WALK.t[LENS.wt];
    map.getSource('walk').setData(FC(WALK?WALK.res.map((r,i)=>({type:'Feature',properties:{c:minCol(M?M[i]:null)},geometry:{type:'Point',coordinates:r.ll}})):[]));}
  else{WALK=null;map.getSource('walk').setData(FC());}
  /* shamol */
  const wl=map.getLayer('wind');
  if(LENS.wind){ensureRose();const w=windW();
    if(w){const cr=corridors(w);map.getSource('windc').setData(cr.fc);if(WIND)WIND.cshare=cr.share;
      if(WS.ctx)ctxLoad();
      if(L.length||(WS.v==='mavjud'&&CTX)){const k=geo+WS.season+WS.slice+WS.mode+WS.dir+WS.v+(WS.ctx?CTXst+(CTX?CTX.length:0):'x');if(k!==WINDK&&!busy()){WINDK=k;WIND=null;clearTimeout(WINDT);WINDT=setTimeout(()=>{const t0=performance.now();const r=windRun(L,F);r.ms=performance.now()-t0;r.cshare=cr.share;WIND=r;scheduleSnap();
        map.getSource('wind').updateImage({url:r.url,coordinates:r.coords});if(S.view!=='fg')map.setLayoutProperty('wind','visibility','visible');renderPanel();renderLens();},200);}}
      else{WIND=null;WINDK='';map.setLayoutProperty('wind','visibility','none');}}
    if(WIND&&wl&&S.view!=='fg')map.setLayoutProperty('wind','visibility','visible');}
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
  let h=`<div class="seg lseg" role="group" aria-label="${esc(T('Linzalar'))}">${tg('sh','Soya')}${tg('ins','Insolyatsiya')}${tg('dist','Masofalar')}${tg('wind','Shamol')}${tg('walk','15 daqiqa')}</div>
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
  if(LENS.walk){h+=`<div class="seg lseg" role="group" style="margin-top:10px" aria-label="${esc(T('Maqsad'))}">${WT.map(t=>`<button data-wt="${t.k}" aria-pressed="${LENS.wt===t.k}">${esc(T(t.n.split(' (')[0]))}</button>`).join('')}</div>
    <div class="chk">${WBIN.map((b,i)=>`<i style="background:${b[1]}"></i>${i<3?'≤ '+b[0]:'> 15'}`).join(' ')} ${esc(T('daq.'))} <i style="background:#8a857c"></i>${esc(T('yoʻq'))}</div>
    ${WALK&&WALK.t[LENS.wt]&&WALK.t[LENS.wt].none?`<p class="warnn">${esc(T('Bu turdagi zona hali yoʻq — Z asbobi bilan kvartal bering.'))}</p>`:''}
    <p class="note">${esc(T('Koʻcha oʻqlari boʻylab piyoda masofa, tezlik'))} ${fmt(KP.get('speed')||5,1)} ${esc(T('km/soat (loyiha parametri). Bino → eng yaqin koʻcha → maqsad kvartal chegarasi. Ichki yoʻlaklar va piyoda oʻtish joylari hisobga olinmaydi.'))}</p>`;}
  h+=`<p class="note">${esc(T('Normativ talablar va natijalar — Tekshiruv asbobida (T).'))}</p>`;
  el.innerHTML=h;
  $$('#lens [data-lens]').forEach(b=>b.onclick=()=>{LENS[b.dataset.lens]=!LENS[b.dataset.lens];saveLens();if(!LENS.sh)stopPlay();render();});
  const md=$('#lMd');if(md)md.onchange=()=>act(()=>{chk().md=md.value;});
  const se=$('#wSe');if(se)se.onchange=()=>{WS.season=se.value;saveWS();render();};const sl=$('#wSl');if(sl)sl.onchange=()=>{WS.slice=sl.value;saveWS();render();};
  $$('#lens [data-wm]').forEach(b=>b.onclick=()=>{WS.mode=b.dataset.wm;saveWS();render();});
  $$('#lens [data-wd]').forEach(p=>p.onclick=()=>{WS.mode='one';WS.dir=+p.dataset.wd;saveWS();render();});
  $$('#lens [data-wt]').forEach(b=>b.onclick=()=>{LENS.wt=b.dataset.wt;saveLens();render();});
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
  /* 15 daqiqa */
  h+=`<div class="lb" style="margin-top:4px">${esc(T('Piyoda qamrov (aholi ulushi)'))}</div>`;
  if(!LENS.walk)h+=`<button class="btn" data-on="walk">${esc(T('15 daqiqalik linzani yoqish'))}</button>`;
  else if(WALK&&WALK.res.length)h+=`<table class="wt"><tr><th></th><th>≤ 5</th><th>≤ 10</th><th>≤ 15 ${esc(T('daq.'))}</th></tr>${WT.map(t=>{const M=WALK.t[t.k];return `<tr><td>${esc(T(t.n.split(' (')[0]))}</td>${M.none?`<td colspan="3" class="mut">${esc(T('zona yoʻq'))}</td>`:M.share.map(v=>`<td>${fmt(v*100,0)} %</td>`).join('')}</tr>`;}).join('')}</table>
    <p class="note">${esc(T('Ulush — binolar aholisi boʻyicha (taxminiy aholi). 15 daqiqa — «15 daqiqalik shahar» konsepsiyasi (C. Moreno) moʻljali, meʼyor emas; ShNQ xizmat radiuslari alohida tekshiriladi.'))}</p>`;
  else h+=`<p class="note">${esc(T('Turar joy binolari va koʻchalar kerak.'))}</p>`;
  /* shamol */
  h+=`<div class="lb" style="margin-top:4px">${esc(T('Shamol'))}</div>`;
  if(!LENS.wind)h+=`<button class="btn" data-on="wind">${esc(T('Shamol linzasini yoqish'))}</button>`;
  if(LENS.wind)h+=`<div class="seg lseg" role="group" aria-label="${esc(T('Shamol koʻrinishi'))}" style="margin:4px 0 6px"><button data-wv="mavjud" aria-pressed="${WS.v==='mavjud'}">${esc(T('Mavjud'))}</button><button data-wv="loyiha" aria-pressed="${WS.v==='loyiha'}">${esc(T('Loyiha'))}</button><button data-wv="farq" aria-pressed="${WS.v==='farq'}">${esc(T('Farq'))}</button></div>
    <label class="note" style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><input type="checkbox" id="wCtx" ${WS.ctx?'checked':''}> ${esc(T('Atrofdagi binolar (OSM)'))} ${WS.ctx?(CTXst==='load'?'— '+esc(T('yuklanmoqda…')):CTXst==='err'?'— '+esc(T('yuklanmadi')):CTX?'— '+CTX.length:''):''}</label>`;
  if(!LENS.wind);
  else if(!WIND)h+=`<p class="note">${esc(T(ROSEst==='err'?'Shamol maʼlumoti yuklanmadi (Open-Meteo).':'Hisoblanmoqda…'))}</p>`;
  else h+=`<div class="kv"><span>${esc(T('Oʻrtacha indeks (ochiq joylar)'))}</span><b>${fmt(WIND.mean,2)}</b><span>${esc(T('Turgʻun ulush (indeks < 0,45)'))}</span><b style="color:${WIND.stag>.25?'#b23a2e':'inherit'}">${fmt(WIND.stag*100,0)} %</b>${WIND.cshare!=null?`<span>${esc(T('Shamol yoʻlagi boʻlgan koʻchalar'))}</span><b>${fmt(WIND.cshare*100,0)} %</b>`:''}<span>${esc(T('Katak · hisob vaqti'))}</span><b>${WIND.dx} m · ${fmt(WIND.ms/1000,2)} s</b></div>
    ${WIND.v==='farq'&&WIND.dmean!=null?`<div class="kv"><span>${esc(T('Indeks oʻzgarishi (loyiha − mavjud)'))}</span><b style="color:${WIND.dmean<0?'#b23a2e':'#2a6fb0'}">${WIND.dmean>0?'+':''}${fmt(WIND.dmean,3)}</b><span>${esc(T('Sezilarli yomonlashgan joylar'))}</span><b>${fmt(WIND.worse*100,0)} %</b></div><p class="note"><span style="color:#b23a2e">■</span> ${esc(T('loyiha havoni toʻsadi'))} · <span style="color:#2a6fb0">■</span> ${esc(T('yaxshilanadi'))}</p>`:''}
    <p class="note">${esc(T('0,45 chegarasi — shamol boʻlimidagi model shkalasi, meʼyor emas.'))} ${WIND.nCtx?esc(T('Atrofdagi '+WIND.nCtx+' ta mavjud bino hisobga olingan; uchastka ichidagilar loyiha bilan almashadi deb olingan.')):esc(T('Atrofdagi binolar hisobga olinmagan.'))}</p>`;
  /* tanlangan bino */
  if(so){const L=(INS&&INS.L)||[],i=L.findIndex(b=>b.zid===S.sel.zid&&b.bid===S.sel.bid),P=INS&&i>=0?INS.pts.filter(p=>p.bi===i):[];
    let nd=null;if(DST&&DST.L){const j=DST.L.findIndex(b=>b.zid===S.sel.zid&&b.bid===S.sel.bid);DST.all.forEach(o=>{if((o.i===j||o.j===j)&&(!nd||o.d<nd.d))nd=o;});}
    h+=`<div class="lb" style="margin-top:4px">${esc(T('Tanlangan bino'))} · ${esc(so.b.name)} · ${so.x.fl} ${esc(T('qavat'))}</div><div class="kv">${P.length?`<span>${esc(T('Fasad nuqtalari'))}</span><b>${P.length}</b><span>${esc(T('Uzluksiz: eng kam / eng koʻp'))}</span><b>${MRCHK.hm(Math.min(...P.map(p=>p.best)))} / ${MRCHK.hm(Math.max(...P.map(p=>p.best)))}</b>`:''}${WALK?(()=>{const i=WALK.res.findIndex(r=>r.zid===S.sel.zid&&r.bid===S.sel.bid);return i<0?'':WT.map(t=>{const m=WALK.t[t.k][i];return `<span>${esc(T('Piyoda'))}: ${esc(T(t.n.split(' (')[0]))}</span><b style="color:${minCol(m)}">${m==null?'—':fmt(m,1)+' '+T('daq.')}</b>`;}).join('');})():''}${nd?`<span>${esc(T('Eng yaqin bino'))}</span><b style="color:${nd.ok===false?'#b3261e':'inherit'}">${fmt(nd.d,1)} m${nd.req?' / '+fmt(nd.req,1):''}</b>`:''}</div>`;}
  h+=`<p class="note">${esc(T('Hisob usuli: quyosh holati (NOAA algoritmi, refraksiyasiz), 10 daqiqa qadam; turar joy binolari fasadlari boʻylab birinchi qavat deraza sathidagi nuqtalar; boshqa binolar soyasi. Atrofdagi mavjud binolar hali hisobga olinmaydi — chekka binolar natijasi optimistik.'))}</p>
    <div class="keys"><b>T</b>${esc(T('tekshiruv'))} · <b>B</b>${esc(T('binolar'))} · ${esc(T('binoni bosing — uning natijasi'))}</div>`;
  h+=ksHTML();
  return h;}
/* ---------- kesim: xaritada ikki nuqta — relyef va binolar profili ----------
   Relyef: Terrain Tiles (Mapzen/AWS terrarium, ~30 m SRTM asosida, z14) — kichik relyef shakllari koʻrinmaydi.
   Binolar: loyiha (qavat×3,3 m, tom bilan emas) va atrofdagi OSM binolari (yoqilgan boʻlsa). */
const KS={on:false,pts:[],prof:null,st:''};const DEMT=new Map();
function demTile(z,x,y){const k=z+'/'+x+'/'+y;if(DEMT.has(k))return DEMT.get(k);
  const p=fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${k}.png`).then(r=>{if(!r.ok)throw new Error('relyef '+r.status);return r.blob();}).then(createImageBitmap).then(bm=>{const c=new OffscreenCanvas(256,256),x2=c.getContext('2d');x2.drawImage(bm,0,0);return x2.getImageData(0,0,256,256).data;});
  DEMT.set(k,p);p.catch(()=>DEMT.delete(k));return p;}
async function elevAt(lng,lat){const z=14,n=2**z,fx=(lng+180)/360*n,la=lat*Math.PI/180,fy=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n,x=Math.floor(fx),y=Math.floor(fy);
  const d=await demTile(z,x,y),px=Math.min(255,Math.floor((fx-x)*256)),py=Math.min(255,Math.floor((fy-y)*256)),o=(py*256+px)*4;return d[o]*256+d[o+1]+d[o+2]/256-32768;}
async function ksRun(){const [a,b]=KS.pts,L=turf.distance(a,b,{units:'meters'}),N=Math.max(40,Math.min(400,Math.round(L/2)));KS.st='load';renderPanel();
  try{const pts=[];for(let i=0;i<=N;i++){const t=i/N;pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    const z=await Promise.all(pts.map(p=>elevAt(p[0],p[1])));
    /* binolar: har nuqtada eng baland bino (loyiha — qavatlar boʻyicha, pogʻonalar hisobga olinadi) */
    const proj=[];BLK.forEach(bk=>{if(bk.r)bk.r.blds.forEach(x=>{(x.seg||[]).forEach(g=>proj.push({poly:g.poly,h:g.f1*MRGEN.FH,p:1}));});});
    const ctx=WS.ctx&&CTX?CTX.map(c=>({poly:turf.polygon([c.cs]),h:c.h,p:0})):[];
    const all=proj.concat(ctx).map(o=>({o,bb:turf.bbox(o.poly)}));
    const hb=pts.map(p=>{let h=0,pr=0;for(const {o,bb} of all){if(p[0]<bb[0]||p[0]>bb[2]||p[1]<bb[1]||p[1]>bb[3])continue;if(o.h>h&&inPoly(p,o.poly)){h=o.h;pr=o.p;}}return {h,pr};});
    KS.prof={L,z,hb,N};KS.st='ok';}catch(e){KS.st='err';KS.err=String(e.message||e);}
  renderPanel();}
function ksDraw(){const src=map.getSource('ksec');if(!src)return;const f=[];if(KS.pts.length){if(KS.pts.length===2)f.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:KS.pts}});KS.pts.forEach((p,i)=>f.push({type:'Feature',properties:{n:'AB'[i]},geometry:{type:'Point',coordinates:p}}));}src.setData(FC(f));}
function ksSVG(){const P=KS.prof;if(!P)return '';const W=320,H=150,pad=26,zmin=Math.min(...P.z),zt=P.z.map((z,i)=>z+P.hb[i].h),zmax=Math.max(...zt,zmin+5),sx=(W-pad-6)/P.L;
  /* vertikal masshtab: binolar va relyef koʻrinsin; nisbat yozib qoʻyiladi */
  const sy=(H-pad-8)/(zmax-zmin),ex=sy/sx,X=i=>pad+i/P.N*P.L*sx,Y=v=>H-pad-(v-zmin)*sy;
  let g=`M${X(0)},${H-pad}`;P.z.forEach((z,i)=>{g+=` L${X(i).toFixed(1)},${Y(z).toFixed(1)}`;});g+=` L${X(P.N)},${H-pad} Z`;
  let bl='';for(let i=0;i<P.N;i++){const b=P.hb[i];if(!b.h)continue;bl+=`<rect x="${X(i).toFixed(1)}" y="${Y(P.z[i]+b.h).toFixed(1)}" width="${(X(i+1)-X(i)+.4).toFixed(1)}" height="${(b.h*sy).toFixed(1)}" fill="${b.pr?'#f0b323':'#b9b5ac'}"/>`;}
  const t=v=>Math.round(v);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(T('Kesim: relyef va binolar'))}" style="display:block;background:#fff;border:1px solid var(--line)">
    <path d="${g}" fill="#e7dcc6" stroke="#8a7a5c" stroke-width="1"/>${bl}
    <line x1="${pad}" y1="${H-pad}" x2="${W-6}" y2="${H-pad}" stroke="#141414" stroke-width=".8"/><line x1="${pad}" y1="8" x2="${pad}" y2="${H-pad}" stroke="#141414" stroke-width=".8"/>
    <g font-family="IBM Plex Mono,monospace" font-size="9" fill="#5e5c58"><text x="${pad}" y="${H-12}">A · 0</text><text x="${W-6}" y="${H-12}" text-anchor="end">B · ${t(P.L)} m</text>
    <text x="${pad-3}" y="${Y(zmin)+3}" text-anchor="end">${t(zmin)}</text><text x="${pad-3}" y="${Y(zmax)+9}" text-anchor="end">${t(zmax)}</text>
    <text x="${W-6}" y="16" text-anchor="end">${esc(T('vertikal'))} ×${ex.toFixed(1)}</text></g></svg>`;}
function ksHTML(){const P=KS.prof;let h=`<div class="lb" style="margin-top:10px">${esc(T('Kesim (profil)'))}</div>`;
  h+=`<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ${KS.on?'dark':''}" id="ksGo">${esc(T(KS.on?(KS.pts.length?'B nuqtani bosing…':'A nuqtani bosing…'):'✎ Kesim chizish'))}</button>${KS.pts.length?`<button class="btn" id="ksClr">${esc(T('Tozalash'))}</button>`:''}</div>`;
  if(KS.st==='load')h+=`<p class="note">${esc(T('Relyef yuklanmoqda…'))}</p>`;
  else if(KS.st==='err')h+=`<p class="warnn">${esc(T('Relyef yuklanmadi'))}: ${esc(KS.err||'')}</p>`;
  else if(P){const zmn=Math.min(...P.z),zmx=Math.max(...P.z);/* eng tik qism — kamida 30 m oraliqda (relyef manbasi ~30 m; qisqa oraliq shovqin beradi) */const st=P.L/P.N,w=Math.max(1,Math.ceil(30/st));let s=0;for(let i=0;i+w<=P.N;i++)s=Math.max(s,Math.abs(P.z[i+w]-P.z[i])/(w*st));
    h+=ksSVG()+`<div class="kv"><span>${esc(T('Uzunlik'))}</span><b>${fmt(P.L,0)} m</b><span>${esc(T('Balandlik farqi'))}</span><b>${fmt(zmx-zmn,1)} m (${fmt(zmn,0)}–${fmt(zmx,0)})</b><span>${esc(T('Oʻrtacha nishab'))}</span><b>${fmt(Math.abs(P.z[P.N]-P.z[0])/P.L*100,1)} %</b><span>${esc(T('Eng tik qism (30 m)'))}</span><b>${fmt(s*100,1)} %</b></div>
    <p class="note"><span style="color:#f0b323">■</span> ${esc(T('loyiha binolari'))} · <span style="color:#b9b5ac">■</span> ${esc(T('mavjud (OSM)'))}. ${esc(T('Relyef — Terrain Tiles (SRTM asosida, ~30 m), kichik shakllar koʻrinmaydi.'))}</p>`;}
  else h+=`<p class="note">${esc(T('Xaritada ikki nuqtani bosing — shu chiziq boʻylab relyef va binolar profili chiqadi.'))}</p>`;
  return h;}
function bindTek(){$$('#panel [data-ck]').forEach(i=>i.onchange=()=>act(()=>{chk()[i.dataset.ck]=i.value===''?'':+i.value;}));
  const rf=$('#cRef');if(rf)rf.onchange=()=>act(()=>{chk().ref=rf.value.trim().slice(0,120);});
  $$('#panel [data-on]').forEach(b=>b.onclick=()=>{LENS[b.dataset.on]=true;saveLens();render();});
  $$('#panel [data-wv]').forEach(b=>b.onclick=()=>{WS.v=b.dataset.wv;saveWS();WINDK='';render();});
  {const c=$('#wCtx');if(c)c.onchange=()=>{WS.ctx=c.checked;saveWS();ctxDraw();WINDK='';render();};}
  {const g=$('#ksGo');if(g)g.onclick=()=>{KS.on=!KS.on;if(KS.on){KS.pts=[];KS.prof=null;KS.st='';ksDraw();}renderPanel();};
   const c=$('#ksClr');if(c)c.onclick=()=>{KS.on=false;KS.pts=[];KS.prof=null;KS.st='';ksDraw();renderPanel();};}}
const LOCK_SVG='<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true" style="vertical-align:-1px;margin-left:3px"><rect x="2" y="5" width="8" height="6" fill="currentColor"/><path d="M4 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
/* qavat chiziqlari: har qavat alohida hajm + plita; juda koʻp qavatda (> 3000) — boʻlaklar bilan */
const SLAB=.22;let FLOORS=true;
let RQ=0;function render(){if(RQ)return;RQ=requestAnimationFrame(()=>{RQ=0;draw();});}
function draw(){
  if(!map.getSource('road'))return;
  {const pr=JSON.stringify(D.plot||null);if(pr!==draw._p){draw._p=pr;SITE=plotRing();if(SITE)K=78271.517*Math.cos(turf.center(turf.polygon([SITE])).geometry.coordinates[1]*Math.PI/180);MRPLOT.reload();}}
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
      r=MRGEN.stats(b.f,b.z.blds.map(x=>{const f=polyOf(x);return {f,fl:x.fl,id:x.id,out:!insideBlk(f,b.f),tiers:x.tiers,nr:x.nr,kv:x.kv,sty:x.sty,roof:x.roof,slope:x.slope};}));}
    else{const g=b.z.g;if(!g)return;r=MRGEN.gen(b.f,g);if(!r)return;b.g=g;r.blds.forEach((x,i)=>{x.id=i+1;});}
    b.r=r;
    /* pogʻonalar va turar joy boʻlmagan pastki qavatlar hisobga olinadi */
    let gfa=0,resG=0,expl=false;r.blds.forEach(x=>{const m=bldMass(x);x.seg=m.seg;x.gfa=m.gfa;x.res=m.res;gfa+=m.gfa;resG+=m.res;if(x.nr!=null||(x.tiers&&x.tiers.length))expl=true;});r.gfa=gfa;r.flAvg=r.fp?gfa/r.fp:0;r.far=r.A?gfa/r.A:0;
    const res=RES_SHARE[b.z.z]||0,share=b.z.z==='turar'?1:res;
    /* xonadonlar: kvartirografiya hisoblangan binoda — aniq soni, qolganlarida — GFA dan taxmin */
    r.kv=0;r.kvExact=0;r.blds.forEach(x=>{x.kvR=null;
      if(x.kv&&res){x.kvR=kvOf(x);if(x.kvR){r.kv+=x.kvR.n;r.kvExact++;return;}}
      r.kv+=(expl&&res?x.res*share:x.gfa*res)*KP.get('netGross')/KP.get('unitM2');});
    if(b.g&&(b.g.typ==='hovli'||b.g.typ==='ichki')&&!(b.z.lock&&b.z.blds))r.kv=r.blds.length;   // yakka uy — bitta xonadon
    r.pop=r.kv*KP.get('hh');r.nOut=r.blds.filter(x=>x.out).length;
    const sel=sb===b;r.blds.forEach(x=>{const RF=roofOf(x),P={fl:x.fl,c:RF.wall||BC[b.z.z]||'#f7f3ea',s:sel,zid:b.z.id,bid:x.id,bs:!!(sbl&&sbl.zid===b.z.id&&sbl.bid===x.id),out:!!x.out,__p:pitched};
      const fe=S.fe&&S.fe.zid===b.z.id&&S.fe.bid===x.id?S.fe.fl:0;
      x.seg.forEach((g,k)=>{const FH=MRGEN.FH,base=Object.assign({},P,{nr:g.nr?1:0,top:k>0?1:0});
        if(!FLOORS){bf.push({type:'Feature',geometry:g.poly.geometry,properties:Object.assign({},base,{b:g.f0*FH,h:g.f1*FH,o:1})});return;}
        for(let f=g.f0;f<g.f1;f++){bf.push({type:'Feature',geometry:g.poly.geometry,properties:Object.assign({},base,{b:f*FH,h:(f+1)*FH-SLAB,o:f===g.f0?1:0,ef:fe===f+1?1:0})});
          bf.push({type:'Feature',geometry:g.poly.geometry,properties:{sl:1,b:(f+1)*FH-SLAB,h:(f+1)*FH,zid:b.z.id,bid:x.id}});}});
      {const top=x.seg[x.seg.length-1];if(top)roofParts(top.poly,RF).forEach(q=>bf.push({type:'Feature',geometry:q.poly.geometry,properties:{rf:1,rc:RF.rc,zid:b.z.id,bid:x.id,s:sel,b:top.f1*MRGEN.FH+q.b,h:top.f1*MRGEN.FH+q.h}}));}});});
  if(sbl&&!bldRec(sbl.zid,sbl.bid))S.sel=null;
  if(S.fe&&!bldRec(S.fe.zid,S.fe.bid))S.fe=null;
  map.getSource('blds').setData(FC(bf));
  {const nF=bf.length/2;const want=nF<=3000;if(want!==FLOORS){FLOORS=want;render();}}
  feDraw();
  pubSoon();
  const sbo=S.sel&&S.sel.t==='bl'&&bldRec(S.sel.zid,S.sel.bid);
  map.getSource('bsel').setData(FC(sb?[turf.polygonToLine(sb.f)]:sbo?[turf.polygonToLine(sbo.b.f)]:[]));
  renderNb();renderLensMap();
  const selF=S.sel&&S.sel.t==='e'?roads.filter(f=>f.properties.id===S.sel.id):[];
  map.getSource('sel').setData(FC(selF));
  const showN=S.tool==='street'||S.tool==='select';
  map.getSource('nodes').setData(FC(showN?D.nodes.map(n=>({type:'Feature',properties:{id:n.id,d:deg(n.id),s:!!(S.sel&&S.sel.t==='n'&&S.sel.id===n.id)||S.draw===n.id},geometry:{type:'Point',coordinates:n.ll}})):[]));
  renderPrev();renderPanel();renderKpi();renderBal();renderLabels();renderUndo();renderLens();if(S.view==='fg')applyView();scheduleSnap();}
function renderLabels(){const box=$('#labels');if(!box)return;const z=map.getZoom();
  box.innerHTML=z<14.5?'':BLK.map(b=>{const p=map.project(b.anchor);const s=sizeOf(b.ha);return `<div class="blbl" style="left:${p.x}px;top:${p.y}px">${esc(b.name)}${b.z&&b.z.lock?`<span title="${esc(T('Qoʻlda tahrirlangan — qulflangan'))}">${LOCK_SVG}</span>`:''}<small>${fmt(b.ha,2)} ga · <span style="color:${s.c}">${esc(T(s.k==='daha'?'daha':s.k==='mavze'?'mavze oʻlchami':s.k==='tuman'?'tuman oʻlchami':'juda katta'))}</span></small></div>`;}).join('');}
function renderPrev(){const src=map.getSource('prev');if(!src)return;const a=S.draw&&node(S.draw);
  if(a&&S.cursor){const p=preOf(D.preset);src.setData(FC([{type:'Feature',properties:{W:p.W},geometry:{type:'LineString',coordinates:[a.ll,S.cursor]}}]));}else src.setData(FC());}
function renderNb(){const src=map.getSource('nbp');if(!src)return;const n=S.nb;
  if(n&&n.cur){const b=blockAt(n.p1);if(b){const r=rectFrom(b,n.p1,n.cur),ok=r.w>=NBMIN&&r.h>=NBMIN&&insideBlk(r.f,b.f);r.f.properties={ok};src.setData(FC([r.f]));return;}}src.setData(FC());}
function renderUndo(){$('#undo').disabled=!H.u.length;$('#redo').disabled=!H.r.length;}

/* ---------- TEP ---------- */
/* asosiy oyna binolari — boshqa boʻlimlar uchun yagona manba (js/project.js): Master reja koʻrsatkichlari, Shamol taʼsiri, Hudud bahosi */
const USE={turar:['res',null],aralash:['res','com'],savdo:['com',null],ijtimoiy:['soc',null]};
let PUBT=0,PUBK='';
function pubSoon(){clearTimeout(PUBT);PUBT=setTimeout(pubNow,700);}
function pubNow(){if(!window.KPSPRJ)return;
  const ll=c=>[+c[1].toFixed(7),+c[0].toFixed(7)],ring=cs=>{const r=cs.map(ll);if(r.length>1&&r[0][0]===r[r.length-1][0]&&r[0][1]===r[r.length-1][1])r.pop();return r;};
  const blds=[];let sell=0,res=0,maxH=0;
  BLK.forEach(b=>{if(!b.r||!b.z)return;const u=USE[b.z.z]||['oth',null],sh=RES_SHARE[b.z.z]||0;res+=b.r.gfa*sh;sell+=b.r.gfa*sh*KP.get('netGross');
    b.r.blds.forEach(x=>{const g=x.f&&x.f.geometry;if(!g)return;blds.push({poly:ring(g.coordinates[0]),fl:x.fl,use:u[0],gf:u[1]||undefined,ph:1});maxH=Math.max(maxH,x.fl*MRGEN.FH);});});
  const k=kpis(),siteM2=k.siteHa?k.siteHa*1e4:null;
  const P={src:'mr',site:SITE?ring(SITE):null,p:{fh:MRGEN.FH},blds,greens:[],parks:[]};
  const tep={src:'mr',name:'Master reja',siteHa:k.siteHa,fp:k.fp||0,gfa:k.gfa||0,res,nonres:(k.gfa||0)-res,far:siteM2?(k.gfa||0)/siteM2:0,cov:siteM2?(k.fp||0)/siteM2*100:0,
    green:(k.zha&&k.zha.yashil||0)*1e4,gr:k.greenPct||0,na:Math.round(k.kv||0),pop:Math.round(k.pop||0),sell,apts:[],parkHave:null,parkNeed:null,maxH,avgFl:k.flAvg||0,insMin:null,minDist:null,blds:blds.length};
  const key=JSON.stringify([P,tep]);if(key===PUBK)return;PUBK=key;
  P.t=tep.t=Date.now();KPSPRJ.publishMr(P,tep);}
function kpis(){
  const out={};
  out.siteHa=SITE?turf.area(plotFeature())/1e4:null;
  let L=0,Lin=0;const sp=SITE?plotFeature():null;
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
  const all=[
    c(k.siteHa!=null?fmt(k.siteHa,1)+' ga':'—',k.siteHa!=null?'Uchastka · '+sizeOf(k.siteHa).n.toLowerCase()+' oʻlchami':'Uchastka chizilmagan (U)','',k.siteHa!=null?(sizeOf(k.siteHa).k==='daha'?'daha':sizeOf(k.siteHa).k==='mavze'?'mavze':'tuman'):null,k.siteHa),
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
    c(k.pDens!=null&&k.pop?`<i class="${k.pDens<=400?'ok':'wn'}" title="${esc(T('ShNQ 2.07.01-23, 84-band: koʻp qavatli kompleks qurilishda mavze boʻyicha ≤ 400 kishi/ga (brutto)'))}">${fmt(k.pDens,0)}</i>`:'—','Zichlik, kishi/ga · ≤ 400',k.pDens!=null&&k.pop?'':'off','brutto')];
  const PRI=[0,8,9,10,11,12,7];$('#kpis').innerHTML=PRI.map(i=>all[i]).join('');const ka=$('#kpiAll');if(ka)ka.innerHTML=all.filter((_,i)=>!PRI.includes(i)).join('');}

/* ---------- panel ---------- */
const STEPS=['Yoʻllar','Parsellar','Zonalash','Generatsiya','Binolar','Tekshiruv'];
/* v2: yagona qadamlar oqimi — relsdagi tartib bilan bir xil */
const FLOW=[['uchastka','Uchastka'],['hudud','Atrof'],['street','Yoʻllar'],['zone','Zonalar'],['gen','Binolar'],['bino','Tahrir'],['tek','Tekshiruv']];
function flowIdx(t){const i=FLOW.findIndex(f=>f[0]===t);return i<0?-1:i;}
function stepHead(t,title,extra){const i=flowIdx(t),n=FLOW.length;
  return `<div class="ph"><span class="lb">${i>=0?esc(T('Qadam'))+' '+(i+1)+' / '+n:esc(T('Tanlash'))}</span><span class="phr">${extra||''}</span></div><h2>${esc(T(title))}</h2>`+
    (i>=0?`<div class="steps">${FLOW.map((f,k)=>`<i class="${k<=i?'on':''}" data-go="${f[0]}" title="${k+1}. ${esc(T(f[1]))}"></i>`).join('')}</div>`:'');}
function stepFoot(t){const i=flowIdx(t);if(i<0)return '';const nx=FLOW[i+1],pv=FLOW[i-1];
  return `<div class="pf">${pv?`<button class="btn" data-go="${pv[0]}">← ${esc(T(pv[1]))}</button>`:''}${nx?`<button class="btn dark" data-go="${nx[0]}">${esc(T(nx[1]))} →</button>`:`<button class="btn dark" id="pfAlb">${esc(T('Albomga'))} →</button>`}</div>`;}
function bindFlow(){$$('#panel [data-go]').forEach(b=>b.onclick=()=>setTool(b.dataset.go));const a=$('#pfAlb');if(a)a.onclick=()=>{if(typeof toAlbum==='function')toAlbum();};}
/* modul tanlash: oilalar bo'yicha yig'iladigan ro'yxat + qidiruv (uzun ochiladigan ro'yxat o'rniga) */
let PP_OPEN=null,PP_Q='';
function presetPicker(cur){const g={};MOD.presets.forEach(p=>(g[p.g]=g[p.g]||[]).push(p));const cp=MOD.presets.find(p=>p.id===cur);if(PP_OPEN==null)PP_OPEN=cp?cp.g:'';
  const q=PP_Q.trim().toLowerCase(),hit=p=>!q||T(p.n).toLowerCase().includes(q)||String(p.W).includes(q);
  return `<div class="ppk"><input type="search" id="ppQ" placeholder="${esc(T('Qidirish: velo, BRT, 18 m…'))}" value="${esc(PP_Q)}" autocomplete="off">
    ${Object.entries(g).map(([n,ps])=>{const l=ps.filter(hit);if(!l.length)return '';const open=q||PP_OPEN===n;
      return `<div class="ppf${open?' on':''}"><button class="pph" data-ppf="${esc(n)}" aria-expanded="${!!open}"><span>${esc(T(n))}</span><small>${l.length}</small></button>${open?`<div class="ppl">${l.map(p=>`<button class="ppo" data-pre="${p.id}" aria-pressed="${p.id===cur}" title="${esc(T(p.n))}"><span class="pps">${p.st.map(x=>`<i style="flex:${x[1]} 1 0;background:${(MOD.dk[x[0]]||{}).c||'#ccc'}"></i>`).join('')}</span><span class="ppn">${esc(T(p.n))}</span><b>${fmt(p.W,1)} m</b></button>`).join('')}</div>`:''}</div>`;}).join('')}</div>`;}
function bindPresetPicker(pick){const root=document.querySelector('.ppk');if(!root)return;
  root.querySelectorAll('[data-ppf]').forEach(b=>b.onclick=()=>{PP_OPEN=PP_OPEN===b.dataset.ppf?'':b.dataset.ppf;renderPanel();});
  root.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>pick(b.dataset.pre));
  const qi=root.querySelector('#ppQ');if(qi)qi.oninput=()=>{PP_Q=qi.value;const pos=qi.selectionStart;renderPanel();const n=document.getElementById('ppQ');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(_){}}};}
/* ---------- shahar toʻri shabloni: uchastka ichida analog shahar blok oʻlchamida koʻchalar ---------- */
const TG={id:'barselona',ang:null,edge:false,mid:true};
function tgAng(){const pf=plotFeature();if(TG.ang!=null)return TG.ang;if(!pf)return 0;try{const f=pf.geometry.type==='Polygon'?pf:turf.polygon(pf.geometry.coordinates[0]);return Math.round(MRGEN.mainBearing(f));}catch(_){return 0;}}
function presetFor(w){let best=null;MOD.presets.forEach(p=>{if(p.g==='Konstruktor')return;if(!best||Math.abs(p.W-w)<Math.abs(best.W-w))best=p;});return best?best.id:D.preset;}
function tgHTML(){if(!window.MRBLOK)return '';const t=MRBLOK.byId(TG.id)||MRBLOK.L[0],pf=plotFeature();
  return `<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><span class="lb" style="display:block;margin-bottom:6px">${esc(T('Shahar toʻri shabloni'))}</span>
    <select id="tgSel" style="width:100%">${MRBLOK.L.map(x=>`<option value="${x.id}" ${x.id===TG.id?'selected':''}>${esc(T(x.n))} · ${x.bx}×${x.by} m</option>`).join('')}</select>
    <div class="kv" style="margin-top:6px"><span>${esc(T('Blok'))}</span><b>${t.bx} × ${t.by} m</b><span>${esc(T('Koʻcha (qizil chiziqlar)'))}</span><b>${t.w} m${t.mid?' + '+t.mid+' m':''}</b><span>${esc(T('Blok maydoni'))}</span><b>${fmt(t.bx*t.by/1e4,2)} ga</b></div>
    <p class="note" style="margin:4px 0">${esc(T(t.note))}</p>
    <label class="note" style="display:flex;gap:6px;align-items:center">${esc(T('Yoʻnalish, °'))} <input type="number" id="tgAng" min="0" max="179" step="1" value="${tgAng()}" style="width:70px"> <button class="btn" id="tgAuto" style="height:24px;padding:0 6px">${esc(T('avto'))}</button></label>
    ${t.mid?`<label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="tgMid" ${TG.mid?'checked':''}> ${esc(T('Oʻrtadan kichik koʻcha'))} (${t.mid} m)</label>`:''}
    <label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="tgEdge" ${TG.edge?'checked':''}> ${esc(T('Uchastka chegarasi boʻylab ham koʻcha'))}</label>
    <button class="btn dark" id="tgGo" style="width:100%;margin-top:6px" ${pf?'':'disabled'}>${esc(T(pf?'Toʻrni chizish':'Avval uchastkani chizing (U)'))}</button>
    <details style="margin-top:6px"><summary class="note" style="cursor:pointer">${esc(T('Manba'))}</summary><p class="note" style="margin:4px 0">${esc(T(t.src))}</p></details></div>`;}
function bindTg(){const sel=$('#tgSel');if(!sel)return;sel.onchange=()=>{TG.id=sel.value;renderPanel();};
  const a=$('#tgAng');if(a)a.onchange=()=>{TG.ang=((Math.round(+a.value||0)%180)+180)%180;};const au=$('#tgAuto');if(au)au.onclick=()=>{TG.ang=null;renderPanel();};
  const m=$('#tgMid');if(m)m.onchange=()=>{TG.mid=m.checked;};const e=$('#tgEdge');if(e)e.onchange=()=>{TG.edge=e.checked;};
  const g=$('#tgGo');if(g)g.onclick=()=>{const pf=plotFeature(),t=MRBLOK.byId(TG.id);if(!pf||!t)return;
    const poly=pf.geometry.type==='Polygon'?pf:turf.polygon(pf.geometry.coordinates.reduce((a,b)=>turf.area(turf.polygon(b))>turf.area(turf.polygon(a))?b:a));
    const G=MRBLOK.grid(poly,t,tgAng(),{mid:TG.mid}),pm=presetFor(t.w),ps=t.mid?presetFor(t.mid):pm;
    act(()=>{const put=(seg,pr)=>{const a=addNode(seg[0]),b=addNode(seg[1]);addEdgeX(a.id,b.id,pr);};
      if(TG.edge){const r=poly.geometry.coordinates[0];for(let i=0;i<r.length-1;i++)put([r[i],r[i+1]],pm);}
      G.main.forEach(s=>put(s,pm));G.mid.forEach(s=>put(s,ps));});
    toastMsg(T('Toʻr chizildi')+': '+(G.main.length+G.mid.length)+' '+T('koʻcha')+' · '+T(t.n));};}
function toastMsg(m){const h=$('#hint');if(h){h.textContent=m;}}
function presetOpts(cur){const g={};MOD.presets.forEach(p=>(g[p.g]=g[p.g]||[]).push(p));
  return Object.entries(g).map(([n,ps])=>`<optgroup label="${esc(T(n))}">${ps.map(p=>`<option value="${p.id}" ${p.id===cur?'selected':''}>${esc(T(p.n))} · ${fmt(p.W,1)} m</option>`).join('')}</optgroup>`).join('');}
function stripBar(p){return `<div class="strips" title="${esc(T(p.n))}">${p.st.map(s=>`<i style="flex:${s[1]} 1 0;background:${(MOD.dk[s[0]]||{}).c||'#ccc'}" title="${esc(T((MOD.dk[s[0]]||{}).n||s[0]))} · ${fmt(s[1],2)} m"></i>`).join('')}</div>`;}
function renderPanel(){
  if(S.tool==='tahlil'){$('#panel').innerHTML=`${stepHead('tahlil','Tahlil qatlamlari')}<div class="bd">${MRTX.html()}</div>`;MRTX.bind($('#panel'));hint();return;}
  if(S.tool==='uchastka'){$('#panel').innerHTML=`${stepHead('uchastka','Uchastka')}<div class="bd">${MRPLOT.html()}</div>${stepFoot('uchastka')}`;MRPLOT.bind($('#panel'));bindFlow();hint();return;}
  if(S.tool==='hudud'){$('#panel').innerHTML=`${stepHead('hudud','Atrof — tahlil hududi')}<div class="bd">${MRHUD.html()}</div>${stepFoot('hudud')}`;MRHUD.bind($('#panel'));bindFlow();hint();return;}
  const st=S.tool==='tek'?5:S.tool==='bino'||(S.sel&&S.sel.t==='bl')?4:S.tool==='gen'?3:S.tool==='zone'||(S.sel&&S.sel.t==='b')?1:0,ttl=st===5?'Tekshiruv':st===4?'Binolar':st===3?'Generatsiya':st?'Parsellar va zonalash':'Yoʻllar';
  const hasEx=window.MRANIM&&MRANIM.has(S.tool);
  const ft=S.tool==='select'?(S.sel&&S.sel.t==='bl'?'bino':S.sel&&S.sel.t==='b'?'zone':'street'):S.tool;
  let h=`${stepHead(S.tool==='select'?'select':S.tool,S.tool==='select'?'Tanlash':ttl,hasEx?`<button class="qx" id="exQ" title="${esc(T('Koʻrib tushunish: qisqa sahna'))}" aria-label="${esc(T('Koʻrib tushunish'))}">?</button>`:'')}<div class="bd">`;
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
    h+=`<span class="lb" style="display:block;margin-bottom:6px">Koʻcha moduli</span>${presetPicker(D.preset)}${stripBar(p)}
      <div class="kv"><span>Qizil chiziqlar orasi ${gi('qizil')}</span><b>${fmt(p.W,1)} m</b><span>Boʻlaklar</span><b>${p.lanes}</b></div>
      <p class="note">Xaritada nuqtalarni bosing. Mavjud koʻcha yoki tugunga bossangiz — ulanadi va chorraha hosil boʻladi.</p>
      <div class="keys"><b>Enter</b>tugatish · <b>Esc</b>bekor<br><b>Shift</b>burchakni 15° ga yopishtirish<br><b>V</b>tanlash · <b>Ctrl+Z</b>bekor qilish</div>${tgHTML()}`;}
  else{h+=`<p class="note">Koʻcha yoki tugunni bosing — tanlanadi. Tugunni sudrab koʻchiring. <b>Delete</b> — oʻchirish.</p><div class="keys"><b>S</b>koʻcha chizish · <b>Ctrl+Z</b>bekor qilish</div>`;}
  h+=`<div class="kv" style="border-top:1px solid var(--line);padding-top:10px"><span>Koʻchalar</span><b>${D.edges.length}</b><span>Kvartallar</span><b>${BLK.length}</b><span>Zonalangan</span><b>${BLK.filter(b=>b.z).length}</b></div></div>`;
  $('#panel').innerHTML=h+stepFoot(ft);bindFlow();
  const dp=$('#drawPre');if(dp)dp.onchange=()=>act(()=>{D.preset=dp.value;});
  bindPresetPicker(id=>act(()=>{D.preset=id;}));bindTg();
  const sp=$('#selPre');if(sp)sp.onchange=()=>act(()=>{edge(S.sel.id).preset=sp.value;D.preset=sp.value;});
  const de=$('#delE');if(de)de.onclick=()=>{const id=S.sel.id;S.sel=null;act(()=>delEdge(id));};
  const dn=$('#delN');if(dn)dn.onclick=()=>{const id=S.sel.id;S.sel=null;act(()=>delNode(id));};
  const ds=$('#desel');if(ds)ds.onclick=()=>{S.sel=null;render();};
  $$('#panel [data-z]').forEach(b=>b.onclick=()=>{const k=b.dataset.z;if(sb)act(()=>setZone(sb,k));else act(()=>{D.zcur=k;});});
  const xq=$('#exQ');if(xq)xq.onclick=()=>{if(MRANIM.open&&MRANIM.cur===S.tool)MRANIM.hide();else MRANIM.show(S.tool,$('.main'));};
  bindGen(sb);if(S.tool==='tek')bindTek();else bindBld(so);const ga=$('#genAll');if(ga)ga.onclick=()=>act(()=>BLK.forEach(b=>{if(b.z&&['turar','aralash','savdo'].includes(b.z.z)&&!b.z.g&&!b.z.lock){const r=zoneRec(b,true);r.g=defG('seksiya');}}));
  const bn=$('#bName');if(bn)bn.onchange=()=>act(()=>{const r=zoneRec(sb,true);r.name=bn.value.trim().slice(0,40)||undefined;if(!r.name)delete r.name;});
  hint();}
function hint(){let t='';
  if(S.tool==='uchastka')t=MRPLOT.hint();
  if(S.tool==='hudud')t=MRHUD.hint();
  if(S.tool==='tahlil')t=MRTX.hint();
  if(S.tool==='zone')t='Kvartalni bosing — joriy zona beriladi';
  else if(S.tool==='gen')t='Kvartalni bosing — binolar parametrlari';
  else if(S.tool==='tek')t='Binoni bosing — insolyatsiya va eng yaqin masofa';
  else if(S.tool==='bino')t=S.nb?'Ikkinchi burchakni bosing · Esc — bekor':'Binoni bosing yoki sudrang · boʻsh joyda bosing — yangi bino';
  else if(S.tool==='street')t=S.draw?'Keyingi nuqtani bosing · Enter — tugatish · Shift — 15° qadam':'Koʻchaning boshlanish nuqtasini bosing';
  $('#hint').textContent=T(t);}

/* ---------- asboblar ---------- */
function setTool(t){S.fe=null;S.fed=null;S.tool=t;S.draw=null;S.cursor=null;S.nb=null;S.arm=null;if(t!=='gen'&&t!=='select'&&S.sel&&S.sel.t==='b')S.sel=null;if(t!=='bino'&&t!=='select'&&t!=='tek'&&S.sel&&S.sel.t==='bl')S.sel=null;if(t==='tek'&&!LENS.ins&&!LENS.dist&&!LENS.sh){LENS.ins=LENS.dist=true;saveLens();}if(t!=='select'&&t!=='street'&&S.sel&&(S.sel.t==='e'||S.sel.t==='n'))S.sel=null;$$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));if(window.MRANIM){if(MRANIM.open&&MRANIM.cur!==t)MRANIM.hide();}if(window.MRHUD)MRHUD.active(t==='hudud');MRPLOT.active(t==='uchastka');if(window.MRTX)MRTX.active(t==='tahlil');map.getCanvas().style.cursor=t==='street'||t==='hudud'||t==='uchastka'?'crosshair':'';$('#tip').textContent='';render();}
$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('#undo').onclick=undo;$('#redo').onclick=redo;
$$('[data-view]').forEach(b=>b.onclick=()=>{S.view=b.dataset.view;$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x===b));map.easeTo(S.view==='axo'?{pitch:55,bearing:-25,duration:600}:{pitch:0,bearing:0,duration:600});applyView();setTimeout(render,650);});
/* fon tugmalari — umumiy boshqaruvda (js/basemap.js) */

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
  if((S.drag&&S.drag.moved)||S.bdrag)return;
  if(S.fe)return;
  if(KS.on){KS.pts.push(e.lngLat.toArray());if(KS.pts.length>=2){KS.pts=KS.pts.slice(-2);KS.on=false;ksDraw();ksRun();}else{ksDraw();renderPanel();}return;}
  if(S.tool==='uchastka'){MRPLOT.click(e);return;}
  if(S.tool==='hudud'){MRHUD.click(e);return;}
  if(S.tool==='tahlil')return;
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
map.on('dblclick',e=>{if(S.tool==='uchastka'){MRPLOT.dbl(e);return;}if(S.tool==='hudud'){MRHUD.dbl(e);return;}if(S.tool==='street'&&S.draw){e.preventDefault();endDraw();}});
map.on('mousemove',e=>{
  if(S.fe){if(S.fed){feMove(e);return;}const h=feHit(e.point);map.getCanvas().style.cursor=h?(h.t==='v'?'move':'grab'):'';return;}
  if(S.tool==='uchastka'&&!S.drag){MRPLOT.move(e);return;}
  if(S.tool==='hudud'){MRHUD.move(e);return;}
  if(S.tool==='tahlil'){map.getCanvas().style.cursor='';return;}
  if(S.drag){if(S.drag.p0&&!S.drag.moved&&Math.hypot(e.point.x-S.drag.p0.x,e.point.y-S.drag.p0.y)<4)return;const n=node(S.drag.id);if(n){n.ll=e.lngLat.toArray();S.drag.moved=true;render();}return;}
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
map.on('mousedown',e=>{if(S.fe){feDown(e);return;}
  if(S.tool==='street'&&!S.draw){const n=snapNode(e.point);if(n){e.preventDefault();map.dragPan.disable();S.drag={id:n.id,prev:JSON.stringify(D),moved:false,p0:e.point};}return;}
  if(S.tool!=='select'&&S.tool!=='bino')return;if(S.nb)return;
  const n=S.tool==='select'&&snapNode(e.point);
  if(!n){if(S.tool==='select'&&map.queryRenderedFeatures(e.point,{layers:['road-hit']})[0])return;const f=bldAt(e.point);if(!f)return;e.preventDefault();map.dragPan.disable();
    const zid=f.properties.zid,bid=f.properties.bid;S.bdrag={zid,bid,prev:JSON.stringify(D),p0:e.lngLat.toArray(),moved:false};S.sel={t:'bl',zid,bid};render();return;}e.preventDefault();map.dragPan.disable();S.drag={id:n.id,prev:JSON.stringify(D),moved:false};S.sel={t:'n',id:n.id};});
window.addEventListener('mouseup',()=>{if(S.fed){feUp();return;}if(S.bdrag){const d=S.bdrag;map.dragPan.enable();setTimeout(()=>{S.bdrag=null;},0);$('#tip').textContent='';
    if(d.moved&&JSON.stringify(D)!==d.prev){H.u.push(d.prev);if(H.u.length>200)H.u.shift();H.r=[];save();}render();return;}
  if(!S.drag)return;const d=S.drag;map.dragPan.enable();setTimeout(()=>{S.drag=null;},0);
  if(d.moved&&JSON.stringify(D)!==d.prev){H.u.push(d.prev);H.r=[];save();}render();});
function endDraw(){S.draw=null;S.cursor=null;$('#tip').textContent='';render();}

/* ---------- klaviatura ---------- */
/* bino tanlanganida: capture bosqichida — xaritaning oʻq tugmalari bilan surishidan oldin */
window.addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(e.key==='Escape'&&S.fe){S.fe=null;S.fed=null;map.dragPan.enable();render();e.stopPropagation();return;}
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
  if(S.tool==='uchastka'&&MRPLOT.key(e)){e.preventDefault();return;}
  if(S.tool==='hudud'&&MRHUD.key(e)){e.preventDefault();return;}
  if(e.key==='Enter'||e.key==='Escape'){if(S.draw){endDraw();}else if(e.key==='Escape'&&S.sel){S.sel=null;render();}return;}
  if(k==='u'&&!e.ctrlKey&&!e.metaKey)setTool('uchastka');
  if(k==='h'&&!e.ctrlKey&&!e.metaKey)setTool('hudud');
  if(k==='a'&&!e.ctrlKey&&!e.metaKey)setTool('tahlil');
  if(k==='s'&&!e.ctrlKey&&!e.metaKey)setTool('street');
  if(k==='v'&&!e.ctrlKey&&!e.metaKey)setTool('select');
  if(k==='z'&&!e.ctrlKey&&!e.metaKey)setTool('zone');
  if(k==='g'&&!e.ctrlKey&&!e.metaKey)setTool('gen');
  if(k==='b'&&!e.ctrlKey&&!e.metaKey)setTool('bino');
  if(k==='t'&&!e.ctrlKey&&!e.metaKey)setTool('tek');
  if((e.key==='Delete'||e.key==='Backspace')&&S.sel&&(S.sel.t==='e'||S.sel.t==='n')){e.preventDefault();const s=S.sel;S.sel=null;act(()=>s.t==='e'?delEdge(s.id):delNode(s.id));}});
window.addEventListener('keyup',e=>{if(e.key==='Shift')S.shift=false;});
if(window.KP)KP.on(()=>render());
window.addEventListener('storage',e=>{if(e.key===KEY){load();fixSel();render();}if(e.key===VK){varsLoad();renderVars();}});

/* ---------- ishga tushirish ---------- */
function loadSite(){SITE=plotRing();if(map.getSource('site'))map.getSource('site').setData(FC());
  const c=SITE?turf.center(turf.polygon([SITE])).geometry.coordinates:null;if(c)K=78271.517*Math.cos(c[1]*Math.PI/180);return c;}
/* ---------- 6-bosqich: figure-ground ---------- */
/* Nolli usuli: binolar qora, qolgan hamma narsa (koʻcha, hovli, park) oq — shahar toʻqimasining zichligi va ochiq joylar ritmi */
const FG_HIDE=['blds-slab','fe-ghost','fe-fill','fe-line','fe-edge','fe-mid','fe-v','sat','light','blocks-fill','blocks-line','corr-fill','road','axis','red','bsel','sel','road-hit','prev','wind','windc','shadow','blds','blds-line','dist','insp','walk','nodes','nbp-fill','nbp-line'];
let FGON=false;
function applyView(){if(!map.getLayer('fg'))return;const on=S.view==='fg';
  if(on){FG_HIDE.forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');});map.setLayoutProperty('fg','visibility','visible');KB.suppress(true);map.setPaintProperty('kb-bg','background-color','#ffffff');}
  else if(FGON){FG_HIDE.forEach(id=>{if(map.getLayer(id)&&!['sat','light','wind'].includes(id))map.setLayoutProperty(id,'visibility','visible');});
    KB.suppress(false);
    map.setLayoutProperty('wind','visibility',LENS.wind&&WIND?'visible':'none');map.setLayoutProperty('fg','visibility','none');}
  FGON=on;['#labels','#dlabels'].forEach(q=>{const e=$(q);if(e)e.style.display=on?'none':'';});}
/* rasm uchun geometriya (mahalliy metr) */
function fgGeom(){const o=origin(),F=MRCHK.frame(o[1],o[0]),rings=[];BLK.forEach(b=>{if(b.r)b.r.blds.forEach(x=>rings.push(x.f.geometry.coordinates.map(r=>r.map(F.xy))));});
  const site=SITE?SITE.map(F.xy):null,pts=(site||[]).concat(...rings.map(r=>r[0]));if(!pts.length)return null;
  let bb=[Infinity,Infinity,-Infinity,-Infinity];pts.forEach(p=>{bb[0]=Math.min(bb[0],p[0]);bb[1]=Math.min(bb[1],p[1]);bb[2]=Math.max(bb[2],p[0]);bb[3]=Math.max(bb[3],p[1]);});
  const m=Math.max(30,(bb[2]-bb[0])*.04);return {rings,site,bb:[bb[0]-m,bb[1]-m,bb[2]+m,bb[3]+m]};}
function fgSVG(w){const G=fgGeom();if(!G)return '';const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],k=w/bw,h=Math.round(bh*k),X=x=>((x-G.bb[0])*k).toFixed(1),Y=y=>((G.bb[3]-y)*k).toFixed(1);
  const d=G.rings.map(r=>r.map(ring=>'M'+ring.map(p=>X(p[0])+' '+Y(p[1])).join('L')+'Z').join('')).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#fff"/>${G.site?`<path d="M${G.site.map(p=>X(p[0])+' '+Y(p[1])).join('L')}Z" fill="none" stroke="#999" stroke-width=".8" stroke-dasharray="3 2"/>`:''}<path d="${d}" fill="#111" fill-rule="evenodd"/></svg>`;}
function fgCanvas(W,title){const G=fgGeom();if(!G)return null;const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],k=W/bw,H=Math.round(bh*k)+90,c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d'),X=v=>(v-G.bb[0])*k,Y=v=>(G.bb[3]-v)*k;x.fillStyle='#fff';x.fillRect(0,0,W,H);
  if(G.site){x.setLineDash([12,8]);x.strokeStyle='#8a857c';x.lineWidth=2;x.beginPath();G.site.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));x.closePath();x.stroke();x.setLineDash([]);}
  x.fillStyle='#111';G.rings.forEach(r=>{x.beginPath();r.forEach(ring=>{ring.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));x.closePath();});x.fill('evenodd');});
  /* masshtab va shimol */
  const y0=H-40,len=[50,100,200,500,1000].find(v=>v*k>W*.12)||1000;x.fillStyle='#111';x.fillRect(40,y0,len*k,6);x.font='22px sans-serif';x.fillText(`${len} m`,40+len*k+12,y0+8);
  x.beginPath();x.moveTo(W-50,y0+10);x.lineTo(W-38,y0-26);x.lineTo(W-26,y0+10);x.closePath();x.fill();x.fillText('N',W-46,y0+34);
  if(title){x.font='24px sans-serif';x.fillText(title,40,y0-24);}
  return c;}
/* TEP jadvali — rasm */
const SUMROWS=[['Uchastka','siteHa',v=>fmt(v,1)+' ga'],['Koʻchalar ulushi','corrPct',v=>fmt(v,1)+' %'],['Koʻcha zichligi','dens',v=>fmt(v,1)+' km/km²'],['Chorrahalar zichligi','interD',v=>fmt(v,0)+' /km²'],['Kvartallar','nB',v=>fmt(v,0)],['Binolar','nBld',v=>fmt(v,0)],['GFA','gfa',v=>fmt(v/1000,0)+' ming m²'],['FAR (hudud boʻyicha)','far',v=>fmt(v,2)],['Qoplam','cov',v=>fmt(v,0)+' %'],['Oʻrtacha qavat','flAvg',v=>fmt(v,1)],['Aholi','pop',v=>fmt(v,0)],['Zichlik (brutto)','pDens',v=>fmt(v,0)+' kishi/ga'],['Yashil zona ulushi','greenPct',v=>fmt(v,1)+' %'],
  ['Insolyatsiya: talabdan past nuqtalar','insBad',v=>fmt(v*100,0)+' %'],['Eng kam uzluksiz insolyatsiya','insMin',v=>MRCHK.hm(v)],['Shamol: turgʻun ulush','windStag',v=>fmt(v*100,0)+' %'],['15 daqiqada: ijtimoiy','w_ijtimoiy',v=>fmt(v*100,0)+' %'],['15 daqiqada: park','w_yashil',v=>fmt(v*100,0)+' %'],['15 daqiqada: savdo','w_savdo',v=>fmt(v*100,0)+' %']];
function summary(){const k=kpis(),o={};['siteHa','corrPct','dens','interD','nB','nBld','gfa','far','cov','flAvg','pop','pDens','greenPct'].forEach(n=>{if(k[n]!=null&&isFinite(k[n]))o[n]=k[n];});
  if(LENS.ins&&INS&&INS.pts.length){o.insMin=Math.min(...INS.pts.map(p=>p.best));if(+chk().ins){o.insBad=INS.pts.filter(p=>p.best<+chk().ins).length/INS.pts.length;o.insThr=+chk().ins;}o.insMd=chk().md;}
  if(LENS.wind&&WIND)o.windStag=WIND.stag;
  if(LENS.walk&&WALK)WT.forEach(t=>{const M=WALK.t[t.k];if(M&&!M.none)o['w_'+t.k]=M.share[2];});
  return o;}
function tepCanvas(title,sum){const rows=SUMROWS.filter(r=>sum[r[1]]!=null),W=1400,RH=46,H=140+rows.length*RH,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#111';x.font='600 34px sans-serif';x.fillText(title,40,64);x.font='26px sans-serif';
  rows.forEach((r,i)=>{const y=130+i*RH;x.fillStyle='#d9d3c8';x.fillRect(40,y+12,W-80,1);x.fillStyle='#111';x.fillText(T(r[0]),40,y);x.textAlign='right';x.fillText(r[2](sum[r[1]]),W-40,y);x.textAlign='left';});
  return c;}
/* ---------- 6-bosqich: variantlar ---------- */
/* Faol variant — doim kps_mr_doc (boshqa boʻlimlar shuni oʻqiydi); qolganlari kps_mr_vars da nusxa sifatida.
   Har variant uchun TEP xulosasi va figure-ground eskizi saqlanadi — solishtirish ularni qayta hisoblamasdan koʻrsatadi. */
const VK='kps_mr_vars';let VARS=null,SNT=0;
function varsLoad(){try{VARS=JSON.parse(localStorage.getItem(VK)||'null');}catch(_){VARS=null;}
  if(!VARS||!Array.isArray(VARS.items)||!VARS.items.length)VARS={cur:'v1',n:2,items:[{id:'v1',name:'A',doc:null,sum:null,fg:''}]};
  if(!VARS.items.find(v=>v.id===VARS.cur))VARS.cur=VARS.items[0].id;}
function varsSave(){try{localStorage.setItem(VK,JSON.stringify(VARS));}catch(e){console.warn('[MR] variantlar saqlanmadi',e);}}
const curVar=()=>VARS.items.find(v=>v.id===VARS.cur);
function snapVar(){if(!VARS)return;const v=curVar();v.doc=JSON.stringify(D);v.sum=summary();v.fg=fgSVG(180);v.t=Date.now();varsSave();if(!$('#cmp').hidden)renderCmp();}
function scheduleSnap(){clearTimeout(SNT);SNT=setTimeout(()=>{if(!busy())snapVar();else scheduleSnap();},700);}
function loadDoc(json){D=Object.assign(blank(),json?JSON.parse(json):{});D.chk=Object.assign(CHK0(),D.chk||{});H.u=[];H.r=[];S.sel=null;S.nb=null;S.draw=null;INSK='';INS=null;WINDK='';WIND=null;save();}
function switchVar(id){if(!VARS||id===VARS.cur)return;snapVar();const v=VARS.items.find(x=>x.id===id);if(!v)return;VARS.cur=id;loadDoc(v.doc);varsSave();renderVars();render();}
function nextName(){const used=new Set(VARS.items.map(v=>v.name));for(let i=0;i<26;i++){const n=String.fromCharCode(65+i);if(!used.has(n))return n;}return 'V'+VARS.n;}
function dupVar(){snapVar();const c=curVar(),id='v'+(VARS.n++);VARS.items.push({id,name:nextName(),doc:c.doc,sum:c.sum,fg:c.fg,t:Date.now()});VARS.cur=id;H.u=[];H.r=[];varsSave();renderVars();render();}
let VARM=null;   // oʻchirish uchun ikki bosqichli tasdiq
function delVar(id){if(VARS.items.length<2)return;if(VARM!==id){VARM=id;renderCmp();return;}VARM=null;const wasCur=id===VARS.cur;VARS.items=VARS.items.filter(v=>v.id!==id);
  if(wasCur){VARS.cur=VARS.items[0].id;loadDoc(VARS.items[0].doc);render();}varsSave();renderVars();renderCmp();}
function renderVars(){const el=$('#vars');if(!el||!VARS)return;
  el.innerHTML=`<div class="vtabs" role="group" aria-label="${esc(T('Variantlar'))}">${VARS.items.map(v=>`<button data-var="${v.id}" aria-pressed="${v.id===VARS.cur}" title="${esc(T('Variant'))} ${esc(v.name)}">${esc(v.name)}</button>`).join('')}<button id="varDup" title="${esc(T('Joriy variantdan nusxa — yangi variant'))}" aria-label="${esc(T('Yangi variant'))}">+</button></div>
    <div class="brow" style="margin-top:8px"><button class="btn" id="varCmp" ${VARS.items.length<2?'disabled':''}>${esc(T('Solishtirish'))}</button><button class="btn dark" id="toAlb">${esc(T('Albomga →'))}</button></div><p class="note" id="albSt" aria-live="polite"></p>`;
  $$('#vars [data-var]').forEach(b=>b.onclick=()=>switchVar(b.dataset.var));$('#varDup').onclick=dupVar;$('#varCmp').onclick=()=>{snapVar();$('#cmp').hidden=false;renderCmp();};$('#toAlb').onclick=toAlbum;}
function renderCmp(){const el=$('#cmp');if(!el||el.hidden)return;const V=VARS.items;
  const rows=SUMROWS.filter(r=>V.some(v=>v.sum&&v.sum[r[1]]!=null));
  el.innerHTML=`<div class="cbox"><div class="ph"><span class="lb">${esc(T('Variantlarni solishtirish'))}</span><button class="gx" id="cmpX" aria-label="${esc(T('Yopish'))}">×</button></div>
    <div class="cscroll"><table class="ct"><tr><th></th>${V.map(v=>`<th class="${v.id===VARS.cur?'cur':''}"><div class="cfg">${v.fg||''}</div><input type="text" data-vn="${v.id}" value="${esc(v.name)}" maxlength="24" aria-label="${esc(T('Variant nomi'))}"><div class="brow" style="justify-content:center;margin-top:6px">${v.id===VARS.cur?`<span class="note">${esc(T('ochiq'))}</span>`:`<button class="btn" data-vo="${v.id}">${esc(T('Ochish'))}</button>`}${V.length>1?`<button class="btn${VARM===v.id?' bad':''}" data-vd="${v.id}">${esc(T(VARM===v.id?'Tasdiqlang':'Oʻchirish'))}</button>`:''}</div></th>`).join('')}</tr>
    ${rows.map(r=>`<tr><td>${esc(T(r[0]))}</td>${V.map(v=>`<td class="${v.id===VARS.cur?'cur':''}">${v.sum&&v.sum[r[1]]!=null?esc(r[2](v.sum[r[1]])):'—'}</td>`).join('')}</tr>`).join('')}</table></div>
    <p class="note">${esc(T('Linzalar natijasi (insolyatsiya, shamol, 15 daqiqa) variantda shu linza yoqilgan holda saqlanadi; «—» — hali hisoblanmagan. Insolyatsiya talabi va sanasi har variantning oʻz sozlamasidan.'))}</p></div>`;
  $('#cmpX').onclick=()=>{$('#cmp').hidden=true;VARM=null;};
  $$('#cmp [data-vo]').forEach(b=>b.onclick=()=>{switchVar(b.dataset.vo);renderCmp();});
  $$('#cmp [data-vd]').forEach(b=>b.onclick=()=>delVar(b.dataset.vd));
  $$('#cmp [data-vn]').forEach(i=>i.onchange=()=>{const v=VARS.items.find(x=>x.id===i.dataset.vn);if(v){v.name=i.value.trim().slice(0,24)||v.name;varsSave();renderVars();}});}
/* ---------- 6-bosqich: albomga ---------- */
function matPut(o){return new Promise((res,rej)=>{const r=indexedDB.open('kps_mat',1);r.onupgradeneeded=()=>r.result.createObjectStore('mats',{keyPath:'id'});r.onsuccess=()=>{const t=r.result.transaction('mats','readwrite');t.objectStore('mats').put(o);t.oncomplete=res;t.onerror=()=>rej(t.error);};r.onerror=()=>rej(r.error);});}
async function toAlbum(){const st=$('#albSt');
  try{if(!BLK.length)throw new Error(T('avval koʻchalar va kvartallar kerak'));st.textContent=T('Tayyorlanmoqda…');snapVar();
    const vn=curVar().name,t=new Date().toISOString(),id=Date.now().toString(36),to=ms=>new Promise(r=>setTimeout(r,ms));
    map.triggerRepaint();await Promise.race([new Promise(r=>map.once('render',r)),to(900)]);await Promise.race([new Promise(r=>requestAnimationFrame(r)),to(200)]);
    const cv=map.getCanvas(),src=cv.toDataURL('image/png'),view={plan:'reja',axo:'aksonometriya',fg:'figure-ground'}[S.view]||'',lens=[LENS.sh&&'soya '+MRCHK.hm(HR),LENS.ins&&'insolyatsiya',LENS.dist&&'masofalar',LENS.wind&&'shamol',LENS.walk&&'15 daqiqa'].filter(Boolean).join(', ');
    const zl=ZT.filter(z=>BLK.some(b=>b.z&&b.z.z===z.k)).map(z=>({col:z.c,label:z.n,kind:'fill',on:true}));
    await matPut({id:'mr'+id,kind:'png',name:`${T('Master reja')} — ${T('variant')} ${vn}`,src,thumb:src,aspect:cv.width/cv.height,sub:view+(lens?' · '+lens:''),t,legend:S.view==='fg'?[{col:'#111111',label:'Binolar',kind:'fill',on:true}]:zl.concat([{col:'#b23a2e',label:'Qizil chiziq',kind:'line',dash:true,on:true}])});
    let n=1;const fc=fgCanvas(2400,`Figure-ground — ${T('variant')} ${vn}`);
    if(fc){const s2=fc.toDataURL('image/png');await matPut({id:'mrfg'+id,kind:'png',name:`Figure-ground — ${T('variant')} ${vn}`,src:s2,thumb:s2,aspect:fc.width/fc.height,sub:T('binolar qora, ochiq joy oq'),t,legend:[{col:'#111111',label:'Binolar',kind:'fill',on:true}]});n++;}
    const tc=tepCanvas(`${T('TEP')} — ${T('variant')} ${vn}`,curVar().sum||{}),s3=tc.toDataURL('image/png');
    await matPut({id:'mrtep'+id,kind:'png',name:`${T('TEP')} — ${T('variant')} ${vn}`,src:s3,thumb:s3,aspect:tc.width/tc.height,sub:T('master reja muharriri'),t});n++;
    st.textContent=`${n} ${T('ta material albomga yuborildi (Albom → Varaqlar).')}`;}
  catch(e){st.textContent=T('Yuborilmadi')+': '+e.message;}}
/* loyiha oynasi (loyiha.html) bosqich almashganda asbobni tanlaydi: {kps:'tool', t} */
let LOADED=false,PENDING_TOOL=null;
window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||e.data.kps!=='tool')return;const t=String(e.data.t||'');
  if(!['uchastka','hudud','tahlil','street','select','zone','gen','bino','tek'].includes(t))return;if(LOADED){if(S.tool!==t)setTool(t);}else PENDING_TOOL=t;});
async function init(){
  try{MOD=await (await fetch('data/kocha-modullari.json?v=1')).json();}catch(e){MOD={dk:{},presets:[{id:'res',g:'—',n:'Koʻcha',W:15,lanes:2,st:[['lane',7,0]]}]};}
  MOD.presets.forEach(p=>PRE[p.id]=p);
  load();varsLoad();renderVars();
  map.on('load',()=>{
    SITE=plotRing();if(SITE)K=78271.517*Math.cos(turf.center(turf.polygon([SITE])).geometry.coordinates[1]*Math.PI/180);
    else if(D.nodes.length)K=78271.517*Math.cos(D.nodes[0].ll[1]*Math.PI/180);
    addLayers();const c=loadSite();
    const pts=D.nodes.map(n=>n.ll);
    if(pts.length>1){const b=turf.bbox(turf.multiPoint(pts));map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:120,duration:0});}
    else if(SITE){const b=turf.bbox(turf.lineString(SITE));map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:60,bottom:60,left:340,right:60},duration:0});}
    MRPLOT.init({map,render:()=>{if(S.tool==='uchastka')renderPanel();}});
    MRHUD.init({map,render:()=>{if(S.tool==='hudud')renderPanel();}});
    MRTX.init({map,render:()=>{if(S.tool==='tahlil')renderPanel();}});
    LOADED=true;
    setTool(PENDING_TOOL||(!SITE&&!D.edges.length?'uchastka':D.edges.length?'select':'street'));PENDING_TOOL=null;});
  $('#emptyGo').onclick=()=>{$('#empty').hidden=true;};
}
init();
window.MR={get D(){return D;},get BLK(){return BLK;},get S(){return S;},get INS(){return INS;},get WIND(){return WIND;},get WALK(){return WALK;},get VARS(){return VARS;},snapVar,switchVar,dupVar,toAlbum,fgSVG,WS,get DST(){return DST;},LENS,setHr:h=>{HR=h;renderLensMap();},act,undo,redo,map,kpis,draw,bake,bldOp,rectFrom};   // sinov va keyingi bosqichlar uchun

/* yon panel: «Hudud bahosi» — aniq boshlanish nuqtasi. Tahlil hududi bo'lmasa, uchastka atrofida avtomatik doira chiziladi */
(function(){const b=document.getElementById('anaGo');if(!b)return;
  const site=()=>{try{return JSON.parse(localStorage.getItem('kps_site')||'null');}catch(e){return null;}};
  const upd=()=>{const s=site(),n=document.getElementById('anaNote');if(!n)return;
    n.textContent=s&&s.ring?(T('Tahlil hududi')+': '+(s.mode==='radius'&&s.r?T('doira')+' r = '+s.r.toLocaleString('ru-RU')+' m':Math.round((s.areaM2||0)/1e4)+' '+T('ga'))):(plotRing()?T('Uchastka atrofida avtomatik doira olinadi (chetidan +300 m).'):T('Avval uchastkani (U) yoki tahlil hududini (H) chizing.'));};
  b.onclick=()=>{if(!site()){if(plotRing())autoHud();else{setTool('hudud');return;}}try{parent.postMessage({kps:'go',href:'ai.html#auto'},location.origin);}catch(e){}};
  upd();window.addEventListener('storage',e=>{if(e.key==='kps_site')upd();});setInterval(upd,3000);})();

/* v2: qatlamlar kartasi, pastki «Batafsil», TEP, tahlil qatlamlari */
(function(){const t=document.getElementById('sideT'),b=document.getElementById('sbody');if(t&&b){const set=on=>{b.hidden=!on;t.setAttribute('aria-expanded',String(on));t.textContent=T('Qatlamlar')+(on?' ▴':' ▾');try{localStorage.setItem('kps_mr_side',on?'1':'0');}catch(_){}};
    let on=false;try{on=localStorage.getItem('kps_mr_side')==='1';}catch(_){}set(on);t.onclick=()=>set(b.hidden);}
  const m=document.getElementById('kMore'),d=document.getElementById('drawer');if(m&&d)m.onclick=()=>{d.hidden=!d.hidden;m.setAttribute('aria-expanded',String(!d.hidden));m.textContent=T('Batafsil')+(d.hidden?' ▴':' ▾');};
  const tp=document.getElementById('tepGo');if(tp)tp.onclick=()=>{try{parent.postMessage({kps:'go',href:'masterreja.html'},location.origin);}catch(_){}};
  const tx=document.getElementById('txGo');if(tx)tx.onclick=()=>setTool('tahlil');})();
})();
