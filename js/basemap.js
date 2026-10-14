/* Archemistry Lab — umumiy fon xarita va xarita holati (barcha boʻlimlar uchun bitta).
 *
 *  kps_base  — {mode:'stil'|'osm'|'sat'|'none', pal:'arch'|…, custom:{token:rang}|null, labels:bool}
 *  kps_view  — {c:[lng,lat], z:<MapLibre zoom>, t, src}   (Leaflet zoom = z + 1, 256 px plitka)
 *
 *  Ishlatish:
 *    Leaflet:  KPSMAP.leaflet(map, {control:true})
 *    MapLibre: new maplibregl.Map({style: KPSMAP.mlStyle(), …});  KPSMAP.maplibre(map, {control:true})
 *  Barcha sahifalar bir xil localStorage kalitlarini oʻqiydi; «storage» hodisasi iframe'lar orasida jonli sinxronlaydi.
 */
(function(){
'use strict';
if(window.KPSMAP) return;

const ML_V='4.7.1';
const OFM='https://tiles.openfreemap.org/planet';
const GLYPHS='https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const SAT_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR={stil:'© OpenStreetMap, OpenMapTiles, OpenFreeMap',sat:'Sunʼiy yoʻldosh: Esri World Imagery',osm:'© OpenStreetMap hissadorlari'};

/* ---------- palitralar ---------- */
const TOK=[['bg','Fon'],['bld','Bino'],['bl','Bino konturi'],['road','Yoʻl'],['rc','Yoʻl cheti'],['park','Yashil'],['water','Suv'],['rail','Temir yoʻl'],['label','Yozuvlar']];
const PAL={
  arch:{n:'Archemistry',bg:'#f3f1ec',water:'#cddbe4',park:'#dfe6d3',road:'#ffffff',rc:'#dcd6ca',bld:'#e5e0d6',bl:'#b9b1a2',bw:.5,rail:'#cbc4b6',label:'#6f6a60'},
  line:{n:'Chizma',bg:'#ffffff',water:'#e3ecf2',park:'#eef2e8',road:'#ffffff',rc:'#b9bcc1',bld:'#ffffff',bl:'#1a1c1e',bw:.7,rail:'#c9ccd1',label:'#5b5f66'},
  fig:{n:'Figura-fon',bg:'#efece4',water:'#cfdbe2',park:'#d7dfcb',road:'#efece4',rc:'#efece4',bld:'#1a1c1e',bl:'#1a1c1e',bw:0,rail:'#d6d2c8',label:'#7a756b'},
  dark:{n:'Grafit',bg:'#1c1e21',water:'#18252f',park:'#22302a',road:'#2b2e33',rc:'#2b2e33',bld:'#3a3e44',bl:'#4a4f56',bw:.5,rail:'#33363b',label:'#9aa0a8'},
  pastel:{n:'Pastel',bg:'#f8f4ed',water:'#cde2f1',park:'#d8ead0',road:'#ffffff',rc:'#e6ddcc',bld:'#e7ddf6',bl:'#c9b8f0',bw:.6,rail:'#e6ddcc',label:'#7d7488'},
  beton:{n:'Beton',bg:'#e9e8e4',water:'#c3cdd2',park:'#d2d8c9',road:'#f7f7f5',rc:'#cfccc4',bld:'#bdbab3',bl:'#8f8b83',bw:.4,rail:'#b5b1a8',label:'#5d5a54'},
  gisht:{n:'Gʻisht',bg:'#f4ede4',water:'#c9d6dc',park:'#dbe0c9',road:'#fffaf3',rc:'#e2d3c1',bld:'#e2b9a0',bl:'#b07a5c',bw:.4,rail:'#d6c3ae',label:'#7a5a48'},
};
const DEF={mode:'stil',pal:'arch',custom:null,labels:true};
const MODES=[['stil','Stil'],['osm','OSM'],['sat','Sunʼiy yoʻldosh'],['none','Fonsiz']];

/* ---------- saqlash ---------- */
const rd=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const PAGE=(location.pathname.split('/').pop()||'index.html');
function base(){const b=Object.assign({},DEF,rd('kps_base',{}));if(!MODES.some(m=>m[0]===b.mode))b.mode='stil';if(!PAL[b.pal])b.pal='arch';return b;}
function palette(b){b=b||base();return Object.assign({},PAL[b.pal],b.custom||{});}
const subs=new Set();
function set(p){const b=Object.assign(base(),p);wr('kps_base',b);subs.forEach(f=>{try{f(b);}catch(e){console.warn(e);}});return b;}
function onChange(f){subs.add(f);return()=>subs.delete(f);}
window.addEventListener('storage',e=>{if(e.key==='kps_base'){const b=base();subs.forEach(f=>{try{f(b);}catch(er){}});}});

/* ---------- MapLibre uslubi ---------- */
const W=(a,b)=>['interpolate',['exponential',1.6],['zoom'],12,a,19,b];
const cls=c=>['match',['get','class'],c,true,false];
/* har bir qatlam: [id, paint-xossa, token] — rang almashganda faqat shular yangilanadi */
function stilLayers(p,o){
  o=o||{};const out=[],paintMap=[];
  const add=(l,props)=>{l.metadata={'kps:grp':'stil'};out.push(l);(props||[]).forEach(x=>paintMap.push([l.id,x[0],x[1]]));};
  add({id:'kb-park',type:'fill',source:'kb','source-layer':'park',paint:{'fill-color':p.park}},[['fill-color','park']]);
  add({id:'kb-green',type:'fill',source:'kb','source-layer':'landcover',filter:cls(['grass','wood','farmland']),paint:{'fill-color':p.park}},[['fill-color','park']]);
  add({id:'kb-water',type:'fill',source:'kb','source-layer':'water',paint:{'fill-color':p.water}},[['fill-color','water']]);
  add({id:'kb-wway',type:'line',source:'kb','source-layer':'waterway',paint:{'line-color':p.water,'line-width':W(.5,8)}},[['line-color','water']]);
  add({id:'kb-rail',type:'line',source:'kb','source-layer':'transportation',filter:cls(['rail','transit']),paint:{'line-color':p.rail,'line-width':W(.5,3),'line-dasharray':[3,2]}},[['line-color','rail']]);
  const R=[['min',['minor','service','track'],.4,14],['ter',['tertiary','secondary'],.8,30],['maj',['primary','trunk','motorway'],1.2,44]];
  R.forEach(([k,c,a,b])=>add({id:'kb-r'+k+'-c',type:'line',source:'kb','source-layer':'transportation',filter:cls(c),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':p.rc,'line-width':W(a+1,b+2)}},[['line-color','rc']]));
  R.forEach(([k,c,a,b])=>add({id:'kb-r'+k,type:'line',source:'kb','source-layer':'transportation',filter:cls(c),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':p.road,'line-width':W(a,b)}},[['line-color','road']]));
  if(o.buildings!==false){
    add({id:'kb-bld',type:'fill',source:'kb','source-layer':'building',minzoom:13,paint:{'fill-color':p.bld,'fill-outline-color':p.bl}},[['fill-color','bld'],['fill-outline-color','bl']]);
    add({id:'kb-bldl',type:'line',source:'kb','source-layer':'building',minzoom:15,paint:{'line-color':p.bl,'line-width':['interpolate',['linear'],['zoom'],15,.3,19,Math.max(p.bw||0,.3)*1.6]}},[['line-color','bl']]);
  }
  if(o.labels!==false){
    const lab={'text-color':p.label,'text-halo-color':p.bg,'text-halo-width':1.2};
    add({id:'kb-lab-road',type:'symbol',source:'kb','source-layer':'transportation_name',minzoom:14,layout:{'symbol-placement':'line','text-field':['coalesce',['get','name:uz'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14,10,19,13]},paint:lab},[['text-color','label'],['text-halo-color','bg']]);
    add({id:'kb-lab-place',type:'symbol',source:'kb','source-layer':'place',filter:['match',['get','class'],['city','town','suburb','neighbourhood','quarter','village'],true,false],layout:{'text-field':['coalesce',['get','name:uz'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['match',['get','class'],'city',15,'town',13,11.5],'text-letter-spacing':.06,'text-transform':'uppercase','text-max-width':8},paint:lab},[['text-color','label'],['text-halo-color','bg']]);
  }
  return {layers:out,paintMap};
}
function mlLayers(o){
  const b=Object.assign(base(),o&&o.mode?{mode:o.mode}:{}),p=palette(b),st=stilLayers(p,o);
  const vis=g=>({visibility:b.mode===g?'visible':'none'});
  st.layers.forEach(l=>{l.layout=Object.assign({},l.layout||{},vis('stil'));if(l.type==='symbol'&&!b.labels)l.layout.visibility='none';});
  const layers=[{id:'kb-bg',type:'background',metadata:{'kps:grp':'bg'},paint:{'background-color':b.mode==='sat'?'#2b2d2f':b.mode==='osm'?'#f2efe9':p.bg}},
    ...st.layers,
    {id:'kb-sat',type:'raster',source:'kb-sat',metadata:{'kps:grp':'sat'},layout:vis('sat')},
    {id:'kb-osm',type:'raster',source:'kb-osm',metadata:{'kps:grp':'osm'},layout:vis('osm')}];
  return {layers,paintMap:st.paintMap};
}
function mlSources(){return {
  kb:{type:'vector',url:OFM,attribution:ATTR.stil},
  'kb-sat':{type:'raster',tiles:[SAT_URL],tileSize:256,maxzoom:19,attribution:ATTR.sat},
  'kb-osm':{type:'raster',tiles:[OSM_URL],tileSize:256,maxzoom:19,attribution:ATTR.osm}};}
/* toʻliq uslub — MapLibre sahifalari shu bilan ochiladi; sahifa oʻz qatlamlarini ustiga qoʻshadi */
function mlStyle(o){return {version:8,glyphs:GLYPHS,sources:mlSources(),layers:mlLayers(o).layers};}
/* Leaflet ichidagi MapLibre uchun: faqat stil qatlamlari */
function stilStyle(o){const b=base(),p=palette(b),st=stilLayers(p,o);
  if(!b.labels)st.layers.forEach(l=>{if(l.type==='symbol')l.layout=Object.assign({},l.layout,{visibility:'none'});});
  return {version:8,glyphs:GLYPHS,sources:{kb:{type:'vector',url:OFM}},layers:[{id:'kb-bg',type:'background',paint:{'background-color':p.bg}},...st.layers]};}

/* mavjud MapLibre xaritasida fon holatini yangilash (qatlamlarni qayta yuklamasdan) */
function mlApply(map,o){
  if(!map||!map.getLayer||!map.getLayer('kb-bg'))return;
  const b=base(),p=palette(b),sup=o&&o._suppress;
  const st=stilLayers(p,o);
  const show=(id,on)=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on&&!sup?'visible':'none');};
  st.layers.forEach(l=>show(l.id,b.mode==='stil'&&(l.type!=='symbol'||b.labels)));
  show('kb-sat',b.mode==='sat');show('kb-osm',b.mode==='osm');
  st.paintMap.forEach(([id,prop,t])=>{if(map.getLayer(id))try{map.setPaintProperty(id,prop,p[t]);}catch(e){}});
  if(!sup)map.setPaintProperty('kb-bg','background-color',b.mode==='sat'?'#2b2d2f':b.mode==='osm'?'#f2efe9':p.bg);
}

/* ---------- yuklovchilar ---------- */
const _ld={};
function loadScript(src){if(_ld[src])return _ld[src];
  return _ld[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=()=>res();s.onerror=()=>{delete _ld[src];rej(new Error('yuklanmadi: '+src));};document.head.appendChild(s);});}
async function needMapLibre(){if(!window.maplibregl){if(!document.querySelector('link[href*="maplibre-gl.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href=`https://cdn.jsdelivr.net/npm/maplibre-gl@${ML_V}/dist/maplibre-gl.css`;document.head.appendChild(l);}
  await loadScript(`https://cdn.jsdelivr.net/npm/maplibre-gl@${ML_V}/dist/maplibre-gl.js`);}
  if(window.L&&window.L.version&&!window.L.maplibreGL)await loadScript('https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js');}

/* ---------- xarita holati (markaz + masshtab) ---------- */
function getView(){const v=rd('kps_view',null);return v&&v.c&&isFinite(v.c[0])&&isFinite(v.c[1])&&isFinite(v.z)?v:null;}
function visible(el){return !!(el&&el.offsetWidth>0&&el.offsetHeight>0&&!document.hidden);}
/* umumiy mexanizm: adapter = {el, get():{c,z}, apply(v), on(evt,fn)} */
const _maps=[];
function syncView(A){
  _maps.push(A);
  let applying=false,touched=false,lastSeen=0,wasVis=visible(A.el);
  const t0=Date.now();
  ['pointerdown','wheel','keydown','touchstart'].forEach(e=>A.el.addEventListener(e,()=>{touched=true;},{passive:true,capture:true}));
  const apply=v=>{if(!v)return;lastSeen=v.t||0;applying=true;try{A.apply(v);}catch(e){}setTimeout(()=>{applying=false;},60);};
  const write=()=>{if(applying||!visible(A.el))return;const v=A.get();if(!v||!isFinite(v.z))return;
    const o=getView();if(o&&Math.abs(o.c[0]-v.c[0])<1e-7&&Math.abs(o.c[1]-v.c[1])<1e-7&&Math.abs(o.z-v.z)<1e-3)return;
    const n={c:[+v.c[0].toFixed(7),+v.c[1].toFixed(7)],z:+v.z.toFixed(3),t:Date.now(),src:PAGE};lastSeen=n.t;wr('kps_view',n);};
  A.on('moveend',()=>{
    if(applying)return;
    // sahifa yuklanayotganda oʻzi qilgan dastlabki fitBounds/setView umumiy holatni buzmasin
    if(!touched&&Date.now()-t0<2500){const v=getView();if(v){apply(v);return;}}
    write();});
  const v0=getView();if(v0)apply(v0);
  window.addEventListener('storage',e=>{if(e.key!=='kps_view')return;const v=getView();if(v&&v.t!==lastSeen&&visible(A.el))apply(v);});
  /* iframe yashirindan koʻrinadigan boʻlganda (bosqich almashganda) — oxirgi umumiy holat */
  const ro=new ResizeObserver(()=>{const vis=visible(A.el);if(vis&&!wasVis){A.resize&&A.resize();const v=getView();if(v&&v.t!==lastSeen)apply(v);}wasVis=vis;});
  ro.observe(A.el);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){const v=getView();if(v&&v.t!==lastSeen&&visible(A.el))apply(v);}});
  return {apply,write};
}

/* ---------- boshqaruv paneli (fon + ranglar) ---------- */
let cssDone=false;
function css(){if(cssDone)return;cssDone=true;const s=document.createElement('style');s.textContent=`
.kbm{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:6px;font:12px/1.2 inherit;font-family:inherit;pointer-events:auto}
.kbm-seg{display:flex;background:#fff;border:1px solid #1a1c1e33;box-shadow:0 1px 3px #0001}
.kbm-seg button{border:0;background:none;padding:5px 9px;font:inherit;font-size:11.5px;letter-spacing:.04em;cursor:pointer;color:#3a3d42;white-space:nowrap}
.kbm-seg button+button{border-left:1px solid #1a1c1e14}
.kbm-seg button[aria-pressed=true]{background:#1a1c1e;color:#fff}
.kbm-seg .kbm-sw{display:flex;align-items:center;gap:5px}.kbm-sw i{display:inline-flex;width:22px;height:11px;border:1px solid #0002}.kbm-sw i b{flex:1}
.kbm-pop{position:absolute;bottom:calc(100% + 6px);left:0;width:300px;max-height:min(72vh,560px);overflow:auto;background:#fff;border:1px solid #1a1c1e33;box-shadow:0 6px 24px #0002;padding:10px 12px 12px;z-index:1000;color:#1a1c1e}
.kbm-pop[hidden]{display:none}
.kbm-pop h5{margin:10px 0 6px;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#7a7d82}.kbm-pop h5:first-child{margin-top:0}
.kbm-pals{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px}
.kbm-pals button{display:flex;flex-direction:column;gap:4px;border:1px solid #1a1c1e1f;background:#fff;padding:5px;cursor:pointer;font:inherit;font-size:11px;text-align:left}
.kbm-pals button[aria-pressed=true]{outline:2px solid #1a1c1e;outline-offset:-2px}
.kbm-pals .st{display:flex;height:14px;border:1px solid #0001;border-radius:0;overflow:hidden;padding:0}.kbm-pals .st b{display:block;flex:1;border:0;border-radius:0;margin:0;padding:0}
.kbm-tok{display:grid;grid-template-columns:1fr auto 1fr auto;gap:5px 8px;align-items:center}
.kbm-tok label{font-size:11.5px}.kbm-tok input[type=color]{width:30px;height:20px;border:1px solid #1a1c1e33;padding:0;background:none;cursor:pointer}
.kbm-row{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
.kbm-row button{border:1px solid #1a1c1e33;background:#fff;padding:4px 9px;font:inherit;font-size:11.5px;cursor:pointer}
.kbm-row label{display:flex;gap:6px;align-items:center;font-size:12px}
.maplibregl-ctrl-bottom-left .kbm{margin:0 0 10px 10px}
.kbm-seg{flex-wrap:wrap}.kbm.down{flex-direction:column}.kbm.down .kbm-pop{bottom:auto;top:calc(100% + 6px)}`;document.head.appendChild(s);}
function swatch(p){return `<span class="st">${['bg','bld','road','park','water'].map(t=>`<b style="background:${p[t]}"></b>`).join('')}</span>`;}
function control(opts){
  css();opts=opts||{};
  const d=document.createElement('div');d.className='kbm'+(opts.down?' down':'');
  d.innerHTML=`<div class="kbm-pop" hidden></div><div class="kbm-seg" role="group" aria-label="Fon xarita">${opts.modes===false?'':MODES.map(([k,n])=>`<button data-m="${k}">${n}</button>`).join('')}<button class="kbm-sw" data-pal title="Xarita ranglari"><i></i>Ranglar</button></div>`;
  const pop=d.querySelector('.kbm-pop');
  const paint=()=>{const b=base(),p=palette(b);
    d.querySelectorAll('[data-m]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===b.mode));
    d.querySelector('.kbm-sw i').innerHTML=['bg','bld','road','park'].map(t=>`<b style="background:${p[t]}"></b>`).join('');
    if(!pop.hidden)fill();};
  const fill=()=>{const b=base(),p=palette(b);
    pop.innerHTML=`<h5>Uslub</h5><div class="kbm-pals">${Object.entries(PAL).map(([k,v])=>`<button data-p="${k}" aria-pressed="${k===b.pal&&!b.custom}">${swatch(v)}${v.n}</button>`).join('')}</div>
      <h5>Ranglar${b.custom?' · oʻzgartirilgan':''}</h5><div class="kbm-tok">${TOK.map(([t,n])=>`<label for="kbm-${t}">${n}</label><input type="color" id="kbm-${t}" data-t="${t}" value="${p[t]}">`).join('')}</div>
      <div class="kbm-row"><label><input type="checkbox" data-lab ${b.labels?'checked':''}> Nomlar</label><button data-reset>Tiklash</button><button data-copy title="Ranglarni JSON koʻrinishida nusxalash">Nusxa</button></div>
      <div class="kbm-row" style="margin-top:6px;color:#7a7d82;font-size:11px">Ranglar «Stil» fonida koʻrinadi va barcha boʻlimlarga birdan qoʻllanadi.</div>`;};
  d.addEventListener('click',e=>{
    const m=e.target.closest('[data-m]');if(m){set({mode:m.dataset.m});return;}
    if(e.target.closest('[data-pal]')){pop.hidden=!pop.hidden;if(!pop.hidden)fill();return;}
    const pp=e.target.closest('[data-p]');if(pp){set({pal:pp.dataset.p,custom:null,mode:'stil'});return;}
    if(e.target.closest('[data-reset]')){set({custom:null});return;}
    if(e.target.closest('[data-copy]')){const t=JSON.stringify(palette());try{navigator.clipboard.writeText(t);}catch(er){}return;}
  });
  d.addEventListener('input',e=>{const t=e.target.dataset&&e.target.dataset.t;if(!t)return;const b=base();set({custom:Object.assign({},b.custom||{},{[t]:e.target.value}),mode:'stil'});});
  d.addEventListener('change',e=>{if(e.target.matches('[data-lab]'))set({labels:e.target.checked});});
  document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!d.contains(e.target))pop.hidden=true;});
  ['pointerdown','wheel','dblclick','click','mousedown','touchstart'].forEach(ev=>d.addEventListener(ev,e=>e.stopPropagation()));
  onChange(paint);paint();
  return d;
}

/* ---------- Leaflet ---------- */
function leaflet(map,opts){
  const L=window.L;
  opts=opts||{};
  const el=map.getContainer();
  const tiles={sat:L.tileLayer(SAT_URL,{maxZoom:22,maxNativeZoom:19,attribution:ATTR.sat}),osm:L.tileLayer(OSM_URL,{maxZoom:22,maxNativeZoom:19,attribution:ATTR.osm})};
  let stil=null,cur=null,curK=null,local=false,loading=null;
  const getStil=async()=>{if(stil)return stil;if(loading)return loading;
    loading=(async()=>{await needMapLibre();stil=L.maplibreGL({style:stilStyle(opts),attribution:ATTR.stil,interactive:false});return stil;})();
    try{return await loading;}finally{loading=null;}};
  const stilMap=()=>{try{return stil&&stil.getMaplibreMap&&stil.getMaplibreMap();}catch(e){return null;}};
  async function show(){
    if(local)return;const b=base();el.style.background=b.mode==='none'?palette(b).bg:'';
    if(b.mode!==curK){
      let lay=null;
      if(b.mode==='stil'){try{lay=await getStil();}catch(e){console.warn('Stil xarita ochilmadi',e);lay=tiles.osm;}}
      else lay=tiles[b.mode]||null;
      if(base().mode!==b.mode)return;   // kutish paytida yana oʻzgargan
      if(cur&&cur!==lay)map.removeLayer(cur);
      if(lay&&!map.hasLayer(lay)){lay.addTo(map);lay.bringToBack&&lay.bringToBack();}
      cur=lay;curK=b.mode;
    }
    if(b.mode==='stil'){const m=stilMap();if(m&&m.getLayer&&m.getLayer('kb-bg')){mlApply(m,opts);}else if(m)m.once('styledata',()=>mlApply(m,opts));}
  }
  onChange(()=>show());show();
  if(opts.control!==false){const C=L.control({position:opts.position||'bottomleft'});C.onAdd=()=>control(opts);C.addTo(map);}
  const sync=opts.view===false?null:syncView({el,
    get:()=>{const c=map.getCenter();return {c:[c.lng,c.lat],z:map.getZoom()-1};},
    apply:v=>map.setView([v.c[1],v.c[0]],v.z+1,{animate:false}),
    on:(e,f)=>map.on(e,f),resize:()=>map.invalidateSize({pan:false})});
  return {
    /* sahifa oʻzining qoʻshimcha fonini qoʻysa (Google, Esri nomlar va h.k.) — umumiy fon vaqtincha chetga */
    release(){local=true;if(cur)map.removeLayer(cur);cur=null;curK=null;el.style.background='';},
    claim(){local=false;show();},
    stilLayer:getStil,refresh:show,sync};
}

/* ---------- MapLibre ---------- */
function maplibre(map,opts){
  opts=opts||{};
  const el=map.getContainer();
  const ensure=()=>{
    if(!map.getLayer('kb-bg')){   // sahifa oʻz uslubi bilan ochilgan boʻlsa — fon qatlamlarini pastga qoʻshamiz
      const src=mlSources();Object.keys(src).forEach(k=>{if(!map.getSource(k))map.addSource(k,src[k]);});
      const first=(map.getStyle().layers||[])[0];
      mlLayers(opts).layers.forEach(l=>{try{map.addLayer(l,first&&first.id);}catch(e){}});
    }
    mlApply(map,opts);};
  if(map.isStyleLoaded())ensure();else map.once('load',ensure);
  map.on('style.load',()=>{if(!map.getLayer('kb-bg'))ensure();});
  onChange(()=>{if(map.isStyleLoaded())mlApply(map,opts);else map.once('idle',()=>mlApply(map,opts));});
  if(opts.control!==false){const C={onAdd:()=>{const d=control(opts);d.classList.add('maplibregl-ctrl');return d;},onRemove:()=>{}};map.addControl(C,opts.position||'bottom-left');}
  const sync=opts.view===false?null:syncView({el,
    get:()=>{const c=map.getCenter();return {c:[c.lng,c.lat],z:map.getZoom()};},
    apply:v=>map.jumpTo({center:v.c,zoom:v.z}),
    on:(e,f)=>map.on(e,f),resize:()=>map.resize()});
  return {
    suppress(on){opts._suppress=!!on;mlApply(map,opts);},
    refresh:()=>mlApply(map,opts),sync};
}

/* stil fonining rasmi (albom uchun): bb=[janub,gʻarb,shimol,sharq] → dataURL; Web Mercator, plitka matematikasi bilan bir xil nisbat */
async function snapshot(bb,maxPx){
  maxPx=maxPx||2048;await needMapLibre();
  const R=Math.PI/180,mx=l=>(l+180)/360,my=a=>(1-Math.log(Math.tan(a*R)+1/Math.cos(a*R))/Math.PI)/2;
  const x0=mx(bb[1]),x1=mx(bb[3]),y0=my(bb[2]),y1=my(bb[0]),dx=x1-x0,dy=y1-y0;
  const k=maxPx/Math.max(dx,dy),w=Math.max(64,Math.round(dx*k)),h=Math.max(64,Math.round(dy*k));
  const z=Math.log2(w/(dx*512)),cx=(x0+x1)/2,cy=(y0+y1)/2;
  const c=[cx*360-180,Math.atan(Math.sinh(Math.PI*(1-2*cy)))/R];
  const div=document.createElement('div');div.style.cssText=`position:fixed;left:-${w+50}px;top:0;width:${w}px;height:${h}px;pointer-events:none`;document.body.appendChild(div);
  const m=new maplibregl.Map({container:div,style:mlStyle({mode:'stil'}),center:c,zoom:z,interactive:false,attributionControl:false,preserveDrawingBuffer:true,pixelRatio:1,fadeDuration:0});
  try{await new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('vaqt tugadi')),20000);m.once('idle',()=>{clearTimeout(t);ok();});});
    return m.getCanvas().toDataURL('image/jpeg',.9);}
  catch(e){console.warn('Stil rasmi olinmadi',e);return null;}
  finally{m.remove();div.remove();}
}

window.KPSMAP={_maps,PAL,TOK,MODES,base,palette,set,onChange,mlStyle,stilStyle,mlApply,leaflet,maplibre,control,getView,snapshot,
  setView(c,z){wr('kps_view',{c,z,t:Date.now(),src:PAGE});}};
})();
