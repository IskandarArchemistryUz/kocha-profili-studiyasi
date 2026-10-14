/* Archemistry Lab — Master reja muharriri (1-bosqich: koʻcha tarmogʻi).
   Tuzilma: bitta loyiha hujjati (D) → hisob zanjiri (qizil chiziqlar, TEP) → bitta MapLibre xaritasi.
   Har oʻzgarish act() orqali: undo/redo, saqlash va qayta chizish bir joyda.
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
const blank=()=>({v:1,nodes:[],edges:[],nid:1,eid:1,preset:'res'});
let D=blank();
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.v===1&&Array.isArray(v.nodes))D=Object.assign(blank(),v);}catch(e){}}
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
function fixSel(){if(S.sel&&((S.sel.t==='e'&&!edge(S.sel.id))||(S.sel.t==='n'&&!node(S.sel.id))))S.sel=null;if(S.draw&&!node(S.draw))S.draw=null;}

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
  ['site','corr','road','sel','nodes','prev'].forEach(id=>map.addSource(id,{type:'geojson',data:FC()}));
  map.addLayer({id:'corr-fill',type:'fill',source:'corr',paint:{'fill-color':'#e4d9c3','fill-opacity':.92}});
  map.addLayer({id:'road',type:'line',source:'road',layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#55585c','line-width':mpx('rw')}});
  map.addLayer({id:'axis',type:'line',source:'road',paint:{'line-color':'#f7f6f2','line-width':1,'line-dasharray':[6,6],'line-opacity':.8}});
  map.addLayer({id:'red',type:'line',source:'corr',paint:{'line-color':'#b23a2e','line-width':1.4,'line-dasharray':[8,2,2,2]}});
  map.addLayer({id:'site',type:'line',source:'site',paint:{'line-color':'#111','line-width':1.8,'line-dasharray':[4,3]}});
  map.addLayer({id:'sel',type:'line',source:'sel',paint:{'line-color':'#2a6fb0','line-width':mpx('W',4),'line-opacity':.35}});
  map.addLayer({id:'road-hit',type:'line',source:'road',paint:{'line-color':'#000','line-opacity':0,'line-width':mpx('W',14)}});
  map.addLayer({id:'prev',type:'line',source:'prev',paint:{'line-color':'#f0b323','line-width':mpx('W',3),'line-opacity':.55}});
  map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-radius':['case',['get','s'],7,5],'circle-color':['case',['get','s'],'#2a6fb0',['>=',['get','d'],3],'#111','#fff'],'circle-stroke-color':['case',['get','s'],'#fff','#111'],'circle-stroke-width':1.5}});
}

/* ---------- hisob zanjiri: koʻcha → qizil chiziqlar → TEP ---------- */
let CORR=null;   // koʻchalar egallagan yer (qizil chiziqlar orasidagi maydon), birlashtirilgan poligon
function edgeLine(e){const a=node(e.a),b=node(e.b);return a&&b?turf.lineString([a.ll,b.ll]):null;}
function buildCorridor(){
  let u=null;
  for(const e of D.edges){const l=edgeLine(e);if(!l)continue;const p=preOf(e.preset);let b;try{b=turf.buffer(l,p.W/2,{units:'meters',steps:8});}catch(_){continue;}
    if(!b)continue;try{u=u?turf.union(turf.featureCollection([u,b])):b;}catch(_){}}
  return u;}
function render(){
  if(!map.getSource('road'))return;
  const roads=D.edges.map(e=>{const l=edgeLine(e);if(!l)return null;const p=preOf(e.preset);l.properties={id:e.id,rw:roadW(p),W:p.W};return l;}).filter(Boolean);
  map.getSource('road').setData(FC(roads));
  CORR=buildCorridor();
  map.getSource('corr').setData(CORR?FC([CORR]):FC());
  const selF=S.sel&&S.sel.t==='e'?roads.filter(f=>f.properties.id===S.sel.id):[];
  map.getSource('sel').setData(FC(selF));
  const showN=S.tool==='street'||S.tool==='select';
  map.getSource('nodes').setData(FC(showN?D.nodes.map(n=>({type:'Feature',properties:{id:n.id,d:deg(n.id),s:!!(S.sel&&S.sel.t==='n'&&S.sel.id===n.id)||S.draw===n.id},geometry:{type:'Point',coordinates:n.ll}})):[]));
  renderPrev();renderPanel();renderKpi();renderUndo();}
function renderPrev(){const src=map.getSource('prev');if(!src)return;const a=S.draw&&node(S.draw);
  if(a&&S.cursor){const p=preOf(D.preset);src.setData(FC([{type:'Feature',properties:{W:p.W},geometry:{type:'LineString',coordinates:[a.ll,S.cursor]}}]));}else src.setData(FC());}
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
  return out;}
function renderKpi(){const k=kpis();
  const c=(v,l,cls)=>`<div class="kpi${cls?' '+cls:''}"><b>${v}</b><span>${esc(T(l))}</span></div>`;
  const bm=(v,t,u,src)=>v==null?'—':`<i class="${v>=t?'ok':'wn'}" title="${esc(T(src))}">${fmt(v,1)}</i>`;
  $('#kpis').innerHTML=[
    c(k.siteHa!=null?fmt(k.siteHa,1)+' ga':'—','Hudud'),
    c(fmt(k.lenKm,2)+' km','Koʻchalar uzunligi'),
    c(bm(k.dens,18,'km/km²','UN-Habitat, Five Principles (2014): ≥ 18 km/km²')+(k.dens!=null?' <small style="font-size:13px">km/km²</small>':''),'Koʻcha zichligi · moʻljal ≥ 18'),
    c(bm(k.corrPct,30,'%','UN-Habitat, Five Principles (2014): koʻchalarga ≥ 30 % yer')+(k.corrPct!=null?' %':''),'Koʻchalar ulushi · moʻljal ≥ 30'),
    c(k.inter!=null?`${k.inter} · ${bm(k.interD,80,'/km²','SDSN SDG indikatori i-70: 80–120 chorraha/km²')}`:'—','Chorrahalar · /km² · 80–120'),
    c('—','Kvartallar · 2-bosqich','off'),c('—','GFA · FAR · 3-bosqich','off'),c('—','Aholi · 3-bosqich','off')].join('');}

/* ---------- panel ---------- */
const STEPS=['Koʻchalar','Kvartallar','Zonalash','Generatsiya','Binolar','Tekshiruv'];
function presetOpts(cur){const g={};MOD.presets.forEach(p=>(g[p.g]=g[p.g]||[]).push(p));
  return Object.entries(g).map(([n,ps])=>`<optgroup label="${esc(T(n))}">${ps.map(p=>`<option value="${p.id}" ${p.id===cur?'selected':''}>${esc(T(p.n))} · ${fmt(p.W,1)} m</option>`).join('')}</optgroup>`).join('');}
function stripBar(p){return `<div class="strips" title="${esc(T(p.n))}">${p.st.map(s=>`<i style="flex:${s[1]} 1 0;background:${(MOD.dk[s[0]]||{}).c||'#ccc'}" title="${esc(T((MOD.dk[s[0]]||{}).n||s[0]))} · ${fmt(s[1],2)} m"></i>`).join('')}</div>`;}
function renderPanel(){
  let h=`<div class="ph"><span class="lb">3 · Master reja · 1 / 6</span><span class="lb">beta</span></div><h2>${esc(T('Koʻcha tarmogʻi'))}</h2><div class="steps">${STEPS.map((s,i)=>`<i class="${i===0?'on':''}" title="${esc(T(s))}"></i>`).join('')}</div><div class="bd">`;
  const sel=S.sel&&S.sel.t==='e'&&edge(S.sel.id);
  if(sel){const p=preOf(sel.preset),l=edgeLine(sel);
    h+=`<div class="lb">Tanlangan koʻcha</div><div class="kv"><span>Uzunlik</span><b>${fmt(l?turf.length(l,{units:'meters'}):null,0)} m</b><span>Qizil chiziqlar orasi</span><b>${fmt(p.W,1)} m</b><span>Qatnov qismi</span><b>${fmt(roadW(p),1)} m</b></div>
      <label><span class="lb" style="display:block;margin-bottom:6px">Modul</span><select id="selPre">${presetOpts(sel.preset)}</select></label>${stripBar(p)}
      <div style="display:flex;gap:8px"><button class="btn bad" id="delE">Oʻchirish</button><button class="btn" id="desel">Tanlovni bekor qilish</button></div>`;}
  else if(S.sel&&S.sel.t==='n'&&node(S.sel.id)){const n=node(S.sel.id);
    h+=`<div class="lb">Tanlangan tugun</div><div class="kv"><span>Ulangan koʻchalar</span><b>${deg(n.id)}</b></div><p class="note">Tugunni sudrab koʻchiring — ulangan koʻchalar ham siljiydi.</p><div style="display:flex;gap:8px"><button class="btn bad" id="delN">Tugunni oʻchirish</button><button class="btn" id="desel">Bekor qilish</button></div>`;}
  else if(S.tool==='street'){const p=preOf(D.preset);
    h+=`<label><span class="lb" style="display:block;margin-bottom:6px">Koʻcha moduli</span><select id="drawPre">${presetOpts(D.preset)}</select></label>${stripBar(p)}
      <div class="kv"><span>Qizil chiziqlar orasi</span><b>${fmt(p.W,1)} m</b><span>Boʻlaklar</span><b>${p.lanes}</b></div>
      <p class="note">Xaritada nuqtalarni bosing. Mavjud koʻcha yoki tugunga bossangiz — ulanadi va chorraha hosil boʻladi.</p>
      <div class="keys"><b>Enter</b>tugatish · <b>Esc</b>bekor<br><b>Shift</b>burchakni 15° ga yopishtirish<br><b>V</b>tanlash · <b>Ctrl+Z</b>bekor qilish</div>`;}
  else{h+=`<p class="note">Koʻcha yoki tugunni bosing — tanlanadi. Tugunni sudrab koʻchiring. <b>Delete</b> — oʻchirish.</p><div class="keys"><b>S</b>koʻcha chizish · <b>Ctrl+Z</b>bekor qilish</div>`;}
  h+=`<div class="kv" style="border-top:1px solid var(--line);padding-top:10px"><span>Koʻchalar</span><b>${D.edges.length}</b><span>Tugunlar</span><b>${D.nodes.length}</b></div></div>`;
  $('#panel').innerHTML=h;
  const dp=$('#drawPre');if(dp)dp.onchange=()=>act(()=>{D.preset=dp.value;});
  const sp=$('#selPre');if(sp)sp.onchange=()=>act(()=>{edge(S.sel.id).preset=sp.value;D.preset=sp.value;});
  const de=$('#delE');if(de)de.onclick=()=>{const id=S.sel.id;S.sel=null;act(()=>delEdge(id));};
  const dn=$('#delN');if(dn)dn.onclick=()=>{const id=S.sel.id;S.sel=null;act(()=>delNode(id));};
  const ds=$('#desel');if(ds)ds.onclick=()=>{S.sel=null;render();};
  hint();}
function hint(){let t='';
  if(S.tool==='street')t=S.draw?'Keyingi nuqtani bosing · Enter — tugatish · Shift — 15° qadam':'Koʻchaning boshlanish nuqtasini bosing';
  $('#hint').textContent=T(t);}

/* ---------- asboblar ---------- */
function setTool(t){S.tool=t;S.draw=null;S.cursor=null;$$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));map.getCanvas().style.cursor=t==='street'?'crosshair':'';$('#tip').textContent='';render();}
$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('#undo').onclick=undo;$('#redo').onclick=redo;
$$('[data-view]').forEach(b=>b.onclick=()=>{S.view=b.dataset.view;$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x===b));map.easeTo(S.view==='axo'?{pitch:55,bearing:-25,duration:600}:{pitch:0,bearing:0,duration:600});});
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
map.on('click',e=>{
  if(S.drag)return;
  if(S.tool==='street'){const r=resolvePoint(e);
    act(()=>{let n=r.node||(r.edge?splitEdge(r.edge,r.ll):addNode(r.ll));if(S.draw&&node(S.draw)&&S.draw!==n.id)addEdgeX(S.draw,n.id,D.preset);S.draw=n.id;});
    render();return;}
  if(S.tool==='select'){const n=snapNode(e.point);if(n){S.sel={t:'n',id:n.id};render();return;}
    const f=map.queryRenderedFeatures(e.point,{layers:['road-hit']})[0];S.sel=f?{t:'e',id:f.properties.id}:null;render();}});
map.on('dblclick',e=>{if(S.tool==='street'&&S.draw){e.preventDefault();endDraw();}});
map.on('mousemove',e=>{
  if(S.drag){const n=node(S.drag.id);if(n){n.ll=e.lngLat.toArray();S.drag.moved=true;render();}return;}
  if(S.tool==='street'){const r=resolvePoint(e);S.cursor=r.ll;renderPrev();
    const tip=$('#tip');if(S.draw&&node(S.draw)){const a=node(S.draw).ll,d=turf.distance(turf.point(a),turf.point(r.ll),{units:'meters'}),br=(turf.bearing(turf.point(a),turf.point(r.ll))+360)%360;
      tip.textContent=`${fmt(d,0)} m · ${fmt(br,0)}°${r.node?' · '+T('tugun'):r.edge?' · '+T('ulanadi'):''}`;tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';}
    else{tip.textContent=r.node||r.edge?T(r.node?'tugun':'ulanadi'):'';tip.style.left=e.point.x+'px';tip.style.top=e.point.y+'px';}}
  else if(S.tool==='select'){const n=snapNode(e.point),f=!n&&map.queryRenderedFeatures(e.point,{layers:['road-hit']})[0];map.getCanvas().style.cursor=n?'move':f?'pointer':'';}});
map.on('mousedown',e=>{if(S.tool!=='select')return;const n=snapNode(e.point);if(!n)return;e.preventDefault();map.dragPan.disable();S.drag={id:n.id,prev:JSON.stringify(D),moved:false};S.sel={t:'n',id:n.id};});
window.addEventListener('mouseup',()=>{if(!S.drag)return;const d=S.drag;map.dragPan.enable();setTimeout(()=>{S.drag=null;},0);
  if(d.moved&&JSON.stringify(D)!==d.prev){H.u.push(d.prev);H.r=[];save();}render();});
function endDraw(){S.draw=null;S.cursor=null;$('#tip').textContent='';render();}

/* ---------- klaviatura ---------- */
window.addEventListener('keydown',e=>{
  if(e.key==='Shift')S.shift=true;
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();return;}
  if(e.key==='Enter'||e.key==='Escape'){if(S.draw){endDraw();}else if(e.key==='Escape'&&S.sel){S.sel=null;render();}return;}
  if(k==='s'&&!e.ctrlKey&&!e.metaKey)setTool('street');
  if(k==='v'&&!e.ctrlKey&&!e.metaKey)setTool('select');
  if((e.key==='Delete'||e.key==='Backspace')&&S.sel){e.preventDefault();const s=S.sel;S.sel=null;act(()=>s.t==='e'?delEdge(s.id):delNode(s.id));}});
window.addEventListener('keyup',e=>{if(e.key==='Shift')S.shift=false;});
window.addEventListener('storage',e=>{if(e.key==='kps_site'){loadSite();}if(e.key===KEY){load();fixSel();render();}});

/* ---------- ishga tushirish ---------- */
function loadSite(){SITE=siteRing();if(map.getSource('site'))map.getSource('site').setData(SITE?FC([turf.lineString(SITE)]):FC());
  const c=SITE?turf.center(turf.polygon([SITE])).geometry.coordinates:null;if(c)K=78271.517*Math.cos(c[1]*Math.PI/180);return c;}
async function init(){
  try{MOD=await (await fetch('data/kocha-modullari.json?v=1')).json();}catch(e){MOD={dk:{},presets:[{id:'res',g:'—',n:'Koʻcha',W:15,lanes:2,st:[['lane',7,0]]}]};}
  MOD.presets.forEach(p=>PRE[p.id]=p);
  load();
  map.on('load',()=>{
    addLayers();const c=loadSite();
    const pts=D.nodes.map(n=>n.ll);
    if(pts.length>1){const b=turf.bbox(turf.multiPoint(pts));map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:120,duration:0});}
    else if(SITE){const b=turf.bbox(turf.lineString(SITE));map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:60,bottom:60,left:340,right:60},duration:0});}
    else{$('#empty').hidden=false;}
    if(!c&&pts.length)K=78271.517*Math.cos(pts[0][1]*Math.PI/180);
    setTool(D.edges.length?'select':'street');});
  $('#emptyGo').onclick=()=>{$('#empty').hidden=true;};
}
init();
window.MR={get D(){return D;},act,undo,redo,map,kpis};   // sinov va keyingi bosqichlar uchun
})();
