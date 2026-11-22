/* Archemistry Lab — bitta koʻcha tarmogʻi: asosiy oyna (Master reja muharriri) ↔ Koʻcha loyihasi · YHQ.
 * Tarmoq (tugunlar va koʻchalar) asosiy oynada chiziladi; bu yerda — batafsil: kesim, YHQ tekshiruvi,
 * belgilar, piyoda oʻtish joylari, chorrahalar.
 *  → asosiy oynadagi har bir koʻcha shu yerda segment boʻlib keladi (mr — muharrir id'si);
 *  ← shu yerda modul almashtirilsa, asosiy oynadagi koʻcha ham oʻsha modulga oʻtadi.
 * Faqat shu yerda chizilgan koʻchalar (mr belgisisiz) tegilmaydi.
 * app.js dan keyin yuklanadi: DS, newNode, afterDesign, PRESETS, nodeById — app.js ning global nomlari.
 */
(function(){
'use strict';
if(typeof DS!=='function'||typeof afterDesign!=='function')return;
const KEY='kps_mr_doc';
const J=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}};
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h);};
let busy=false;

function sync(force){
  const M=J();if(!M||!Array.isArray(M.nodes)||!Array.isArray(M.edges))return 0;
  const h=hash(JSON.stringify([M.pid||'',M.nodes,M.edges.map(e=>[e.id,e.a,e.b,e.preset])]));
  const ds=DS();if(!force&&ds.mrH===h)return 0;
  /* 19.11: loyiha ichidan (Koʻchasoz → Tarmoq, ?p=) — boshqa loyihadan qolgan sinxron koʻchalar olib tashlanadi; qoʻlda chizilganlari qoladi */
  if(M.pid&&ds.mrPid!==M.pid){const old=new Set(ds.segs.filter(s=>s.mr!=null).map(s=>s.id));for(let i=ds.segs.length-1;i>=0;i--)if(old.has(ds.segs[i].id))ds.segs.splice(i,1);for(let i=ds.nodes.length-1;i>=0;i--){const n=ds.nodes[i];if(n.mr!=null&&!ds.segs.some(s=>s.a===n.id||s.b===n.id))ds.nodes.splice(i,1);}ds.mrPid=M.pid;if(M.name)ds.name=ds.name||M.name;ds.mrFit=1;}
  const byN=new Map(ds.nodes.filter(n=>n.mr!=null).map(n=>[n.mr,n])),idMap={};
  M.nodes.forEach(m=>{const ll=[+(+m.ll[1]).toFixed(7),+(+m.ll[0]).toFixed(7)];let n=byN.get(m.id);
    if(!n){n=newNode(ll);n.mr=m.id;}else{n.ll=ll;byN.delete(m.id);}idMap[m.id]=n.id;});
  const byS=new Map(ds.segs.filter(s=>s.mr!=null).map(s=>[s.mr,s]));let added=0;
  M.edges.forEach(e=>{const a=idMap[e.a],b=idMap[e.b];if(a==null||b==null)return;const pre=PRESETS[e.preset]?e.preset:'r4';let s=byS.get(e.id);
    const pts=Array.isArray(e.pts)?e.pts.map(q=>[+(+q[0]).toFixed(7),+(+q[1]).toFixed(7)]):[];
    if(!s){s={id:ds.sid++,a,b,pts,rad:pts.map(()=>0),p:pre,mr:e.id,mrP:pre};if(Array.isArray(e.st)&&e.st.length){s.p='custom';s.st=e.st;s.shift=-autoOff(e.st);}if(e.name)s.name=e.name;ds.segs.push(s);added++;}
    else{byS.delete(e.id);
      /* bu yerda boʻlingan segment (uchlaridan biri mahalliy tugun) — geometriyasi saqlanadi */
      const A=nodeById(s.a),B=nodeById(s.b);if(A&&B&&A.mr!=null&&B.mr!=null){s.a=a;s.b=b;s.pts=[];s.rad=[];}
      if(s.p===s.mrP&&!s.st)s.p=pre;s.mrP=pre;}});
  /* asosiy oynada oʻchirilganlar */
  byS.forEach(s=>{const i=ds.segs.indexOf(s);if(i>=0)ds.segs.splice(i,1);});
  byN.forEach(n=>{if(ds.segs.some(s=>s.a===n.id||s.b===n.id))delete n.mr;else{const i=ds.nodes.indexOf(n);if(i>=0)ds.nodes.splice(i,1);}});
  ds.mrH=h;
  busy=true;try{afterDesign();}finally{busy=false;}
  if(ds.mrFit&&typeof map!=='undefined'){ds.mrFit=0;try{/* 22.11: hudud ham koʻrinsin (koʻchasiz loyihada — faqat hudud) */const ll=ds.nodes.filter(n=>n.mr!=null).map(n=>n.ll).concat(...(Array.isArray(M.site)?M.site:[]));if(ll.length)map.fitBounds(window.L.latLngBounds(ll).pad(.25),{maxZoom:19,animate:false});}catch(e){}}
  return added;
}
/* ← modul almashtirilsa asosiy oynaga */
function pushBack(){
  if(busy)return;const M=J();if(!M||!Array.isArray(M.edges))return;let ch=false;
  DS().segs.forEach(s=>{if(s.mr==null||s.st||s.p===s.mrP)return;const e=M.edges.find(x=>x.id===s.mr);if(!e)return;e.preset=s.p;s.mrP=s.p;ch=true;});
  if(!ch)return;
  try{localStorage.setItem(KEY,JSON.stringify(M));}catch(e){}
  DS().mrH=hash(JSON.stringify([M.pid||'',M.nodes,M.edges.map(e=>[e.id,e.a,e.b,e.preset])]));
}
const _ad=afterDesign;
afterDesign=function(){_ad();pushBack();};
window.addEventListener('storage',e=>{if(e.key===KEY){const n=sync(false);if(n&&typeof toast==='function')toast(`Asosiy oynadan ${n} ta koʻcha keldi.`);}});
const n0=sync(false);if(n0&&typeof toast==='function')setTimeout(()=>toast(`Asosiy oynadagi ${n0} ta koʻcha shu yerga olindi — kesim, YHQ va belgilar shu yerda.`),800);
/* 19.11 (egasi): loyiha joyida eski OSM binolari koʻrinmasin — uchastka asos xarita ustidan yopiladi, loyiha binolari (qavati bilan) chiziladi.
   Qatlam koʻchalar (design, z 450) ostida: koʻchalar va chorrahalar ustida qoladi. */
let projL=null;
function drawProject(){const M=J();if(projL){projL.remove();projL=null;}if(!M||(!M.site&&!M.bld)||typeof map==='undefined'||!window.L)return;
  if(!map.getPane('mrProj')){map.createPane('mrProj');map.getPane('mrProj').style.zIndex=420;map.getPane('mrProj').style.pointerEvents='none';}
  projL=window.L.layerGroup().addTo(map);const o={pane:'mrProj',interactive:false};
  (M.site||[]).forEach(r=>window.L.polygon(r,{...o,stroke:true,color:'#c0392b',weight:1.5,dashArray:'6 4',fillColor:'#f2efe9',fillOpacity:1}).addTo(projL));
  (M.bld||[]).forEach(b=>{window.L.polygon(b.r,{...o,color:'#6f6a60',weight:1,fillColor:b.f>=9?'#cfc5b4':'#ddd5c6',fillOpacity:1}).addTo(projL);
    const c=b.r.reduce((a,p)=>[a[0]+p[0]/b.r.length,a[1]+p[1]/b.r.length],[0,0]);
    window.L.marker(c,{pane:'mrProj',interactive:false,icon:window.L.divIcon({className:'',html:`<b style="font:600 10px Archivo,sans-serif;color:#4a463f;white-space:nowrap">${b.f}</b>`,iconSize:[16,12],iconAnchor:[8,6]})}).addTo(projL);});}
window.addEventListener('storage',e=>{if(e.key===KEY)drawProject();});
drawProject();
window.KPSMRSYNC={sync,drawProject};
})();
