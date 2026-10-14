/* Archemistry Lab — Master reja muharriri: «Hudud» asbobi (H).
 * Hudud chegarasi shu xaritaning oʻzida chiziladi: doira, toʻrtburchak yoki erkin chegara.
 * Natija «kps_site» ga yoziladi — format AI · hudud bahosi (ai.html) bilan bir xil:
 *   {t, mode:'radius'|'rect'|'poly', ring:[[lat,lng],…], center:[lat,lng]|null, r:<m>|null, areaM2, src:'muharrir'}
 * Doira halqasi ai.html dagi formula bilan yasaladi (72 nuqta, 6 xona) — ikkala boʻlim bir xil chegarani koʻradi.
 */
(function(){
'use strict';
const R=Math.PI/180,MY=110574,SNAP=12;
let map=null,onSite=()=>{},rerender=()=>{},on=false;
const H={mode:'radius',r:500,center:null,a:null,cur:null,poly:[],done:false,drag:null};
const FC=f=>({type:'FeatureCollection',features:f||[]});
const T=s=>window.T?window.T(s):s;

/* ---------- kps_site ↔ holat ---------- */
function readSite(){try{return JSON.parse(localStorage.getItem('kps_site')||'null');}catch(e){return null;}}
function fromSite(){
  const s=readSite();H.a=null;H.cur=null;H.drag=null;
  if(!s||!s.ring||s.ring.length<3){H.center=null;H.poly=[];H.done=false;return;}
  H.mode=['radius','rect','poly'].includes(s.mode)?s.mode:'poly';
  if(H.mode==='radius'&&s.center){H.center=[+s.center[1],+s.center[0]];if(s.r)H.r=Math.round(+s.r);H.poly=[];}
  else{H.mode=H.mode==='radius'?'poly':H.mode;H.center=null;H.poly=s.ring.map(p=>[+p[1],+p[0]]);}
  H.done=true;
}
/* [lng,lat] koʻrinishidagi yopiq boʻlmagan halqa */
function ring(){
  if(H.mode==='radius'){if(!H.center)return null;const c=H.center,mx=111320*Math.cos(c[1]*R),o=[];
    for(let i=0;i<72;i++){const a=i/72*2*Math.PI;o.push([c[0]+H.r*Math.cos(a)/mx,c[1]+H.r*Math.sin(a)/MY]);}return o;}
  if(H.mode==='rect'&&!H.done&&H.a&&H.cur)return rectOf(H.a,H.cur);
  return H.poly.length?H.poly:null;
}
const rectOf=(a,b)=>[[Math.min(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.max(a[1],b[1])]];
function stats(){const r=ring();if(!r||r.length<3||(!H.done&&H.mode!=='radius'))return null;
  const p=turf.polygon([[...r,r[0]]]);return {area:turf.area(p),per:turf.length(turf.lineString([...r,r[0]]),{units:'meters'})};}
function commit(){
  const r=ring();if(!r||r.length<3)return;
  const ringLL=r.map(p=>[+(+p[1]).toFixed(6),+(+p[0]).toFixed(6)]);
  const st=stats();
  const prev=readSite();if(prev&&JSON.stringify(prev.ring)===JSON.stringify(ringLL))return;
  const s={t:Date.now(),mode:H.mode,ring:ringLL,center:H.mode==='radius'&&H.center?[H.center[1],H.center[0]]:null,r:H.mode==='radius'?Math.round(H.r):null,areaM2:st?Math.round(st.area):null,src:'muharrir'};
  try{localStorage.setItem('kps_site',JSON.stringify(s));}catch(e){}
  onSite();
}

/* ---------- xaritadagi koʻrinish ---------- */
function addLayers(){
  if(map.getSource('hud'))return;
  map.addSource('hud',{type:'geojson',data:FC()});
  map.addLayer({id:'hud-fill',type:'fill',source:'hud',filter:['==',['get','k'],'a'],paint:{'fill-color':'#7b61d1','fill-opacity':.06}});
  map.addLayer({id:'hud-line',type:'line',source:'hud',filter:['==',['get','k'],'a'],paint:{'line-color':'#7b61d1','line-width':1.8,'line-dasharray':[3,2]}});
  map.addLayer({id:'hud-pts',type:'circle',source:'hud',filter:['==',['get','k'],'v'],paint:{'circle-radius':5,'circle-color':'#fff','circle-stroke-color':'#7b61d1','circle-stroke-width':2}});
}
function draw(){
  if(!map||!map.getSource('hud'))return;
  if(!on){map.getSource('hud').setData(FC());return;}
  const f=[],r=ring();
  if(r&&r.length>1){
    if(H.done||H.mode!=='poly')f.push({type:'Feature',properties:{k:'a'},geometry:{type:'Polygon',coordinates:[[...r,r[0]]]}});
    else f.push({type:'Feature',properties:{k:'a'},geometry:{type:'LineString',coordinates:H.cur?[...r,H.cur]:r}});}
  handles().forEach(p=>f.push({type:'Feature',properties:{k:'v'},geometry:{type:'Point',coordinates:p}}));
  map.getSource('hud').setData(FC(f));
}
function handles(){
  if(H.mode==='radius')return H.center?[H.center,edgePt()]:[];
  if(H.mode==='rect'&&!H.done)return H.a?[H.a]:[];
  return H.poly;
}
const edgePt=()=>{const c=H.center,mx=111320*Math.cos(c[1]*R);return [c[0]+H.r/mx,c[1]];};
function hit(pt){const hs=handles();let best=-1,bd=SNAP;
  hs.forEach((p,i)=>{const q=map.project(p),d=Math.hypot(q.x-pt.x,q.y-pt.y);if(d<bd){bd=d;best=i;}});return best;}

/* ---------- sichqoncha / klaviatura (muharrir.js chaqiradi, faqat S.tool==='hudud' da) ---------- */
function click(e){
  const ll=e.lngLat.toArray();
  if(H.mode==='radius'){if(H.center&&H.done)return;H.center=ll;H.done=true;commit();}
  else if(H.mode==='rect'){
    if(H.done)return;
    if(!H.a){H.a=ll;H.cur=ll;}
    else{H.poly=rectOf(H.a,ll);H.a=null;H.cur=null;H.done=true;commit();}}
  else{
    if(H.done)return;
    if(H.poly.length>2){const q=map.project(H.poly[0]);if(Math.hypot(q.x-e.point.x,q.y-e.point.y)<14){close();return;}}
    H.poly.push(ll);}
  draw();rerender();
}
function close(){if(H.mode!=='poly'||H.poly.length<3)return;H.done=true;H.cur=null;commit();draw();rerender();}
function move(e){
  if(H.drag)return;
  if(!H.done&&(H.mode==='rect'&&H.a||H.mode==='poly'&&H.poly.length)){H.cur=e.lngLat.toArray();draw();}
  map.getCanvas().style.cursor=hit(e.point)>=0?'move':'crosshair';
}
function down(e){
  if(!on)return;const i=hit(e.point);if(i<0)return;
  e.preventDefault();map.dragPan.disable();H.drag={i};
}
function dragMove(e){
  if(!on||!H.drag)return;const ll=e.lngLat.toArray();
  if(H.mode==='radius'){if(H.drag.i===0)H.center=ll;
    else{const c=H.center;H.r=Math.max(20,Math.round(turf.distance(turf.point(c),turf.point(ll),{units:'meters'})));}}
  else H.poly[H.drag.i]=ll;
  H.drag.moved=true;draw();rerender();
}
function up(){if(!H.drag)return;const m=H.drag.moved;H.drag=null;map.dragPan.enable();if(m){commit();rerender();}}
function dbl(e){if(H.mode==='poly'&&!H.done){e.preventDefault();close();}}
function key(e){
  if(e.key==='Enter'&&H.mode==='poly'&&!H.done){close();return true;}
  if(e.key==='Escape'&&!H.done&&(H.a||H.poly.length)){H.a=null;H.cur=null;H.poly=[];draw();rerender();return true;}
  return false;
}
function setMode(m){H.mode=m;H.center=null;H.a=null;H.cur=null;H.poly=[];H.done=false;draw();rerender();}
function redraw(){setMode(H.mode);}

/* ---------- panel ---------- */
const fmt=(v,d)=>(+v).toLocaleString('ru-RU',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
function hint(){
  if(H.mode==='radius')return H.done?'Markazni yoki chetdagi nuqtani sudrang — hudud oʻzgaradi':'Hudud markazini bosing';
  if(H.mode==='rect')return H.done?'Burchaklarni sudrab tuzating':H.a?'Ikkinchi burchakni bosing · Esc — bekor':'Birinchi burchakni bosing';
  return H.done?'Nuqtalarni sudrab tuzating':H.poly.length?'Keyingi nuqta · birinchi nuqtani bosing yoki Enter — yopish · Esc — bekor':'Chegaraning birinchi nuqtasini bosing';
}
function html(){
  const st=stats(),M=[['radius','Doira'],['rect','Toʻrtburchak'],['poly','Erkin chegara']];
  return `<div class="seg seg3" role="group" aria-label="${T('Hudud shakli')}" style="margin-bottom:10px">${M.map(([k,n])=>`<button data-hm="${k}" aria-pressed="${H.mode===k}">${T(n).toUpperCase()}</button>`).join('')}</div>
    ${H.mode==='radius'?`<label class="kv" style="align-items:center"><span>${T('Radius, m')}</span><input id="hudR" type="number" min="50" max="9000" step="50" value="${H.r}" style="width:90px"></label>`:''}
    ${st?`<div class="kv"><span>${T('Maydon')}</span><b>${fmt(st.area/1e4,2)} ${T('ga')}</b><span>${T('Perimetr')}</span><b>${fmt(st.per)} m</b></div>`:''}
    <p class="note">${T('Chegara barcha boʻlimlarga birdan oʻtadi: Tahlil, Koʻchalar, Binolar va AI · hudud bahosi shu hududni oladi.')}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${H.done?`<button class="btn" id="hudNew">${T('Qayta chizish')}</button>`:''}${st?`<button class="btn" id="hudGo">${T('Hudud bahosi →')}</button>`:''}${st?`<button class="btn" id="hudNext">${T('Koʻchalarni chizish →')}</button>`:''}</div>
    <div class="keys" style="margin-top:10px"><b>H</b>${T('hudud')} · <b>S</b>${T('koʻcha')} · <b>Esc</b>${T('bekor')}</div>`;
}
function bind(root){
  root.querySelectorAll('[data-hm]').forEach(b=>b.onclick=()=>setMode(b.dataset.hm));
  const r=root.querySelector('#hudR');if(r)r.onchange=()=>{H.r=Math.max(50,Math.min(9000,Math.round(+r.value||500)));draw();commit();rerender();};
  const n=root.querySelector('#hudNew');if(n)n.onclick=redraw;
  const g=root.querySelector('#hudGo');if(g)g.onclick=()=>{try{parent.postMessage({kps:'go',href:'ai.html'},location.origin);}catch(e){}};
  const x=root.querySelector('#hudNext');if(x)x.onclick=()=>{if(window.MRHUD.next)window.MRHUD.next();};
}

function init(o){
  map=o.map;onSite=o.onSite||onSite;rerender=o.render||rerender;
  const go=()=>{addLayers();fromSite();draw();};
  if(map.isStyleLoaded())go();else map.once('load',go);
  map.on('mousedown',down);map.on('mousemove',dragMove);window.addEventListener('mouseup',up);
  window.addEventListener('storage',e=>{if(e.key==='kps_site'&&!H.drag){fromSite();draw();if(on)rerender();}});
}
function active(v){on=!!v;if(on){fromSite();if(!H.done&&!H.mode)H.mode='radius';}draw();}
window.MRHUD={init,active,click,move,dbl,key,html,bind,hint,get state(){return H;},next:null};
})();
