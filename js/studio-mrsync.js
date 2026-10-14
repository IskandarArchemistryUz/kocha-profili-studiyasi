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
  const h=hash(JSON.stringify([M.nodes,M.edges.map(e=>[e.id,e.a,e.b,e.preset])]));
  const ds=DS();if(!force&&ds.mrH===h)return 0;
  const byN=new Map(ds.nodes.filter(n=>n.mr!=null).map(n=>[n.mr,n])),idMap={};
  M.nodes.forEach(m=>{const ll=[+(+m.ll[1]).toFixed(7),+(+m.ll[0]).toFixed(7)];let n=byN.get(m.id);
    if(!n){n=newNode(ll);n.mr=m.id;}else{n.ll=ll;byN.delete(m.id);}idMap[m.id]=n.id;});
  const byS=new Map(ds.segs.filter(s=>s.mr!=null).map(s=>[s.mr,s]));let added=0;
  M.edges.forEach(e=>{const a=idMap[e.a],b=idMap[e.b];if(a==null||b==null)return;const pre=PRESETS[e.preset]?e.preset:'r4';let s=byS.get(e.id);
    if(!s){s={id:ds.sid++,a,b,pts:[],rad:[],p:pre,mr:e.id,mrP:pre};ds.segs.push(s);added++;}
    else{byS.delete(e.id);
      /* bu yerda boʻlingan segment (uchlaridan biri mahalliy tugun) — geometriyasi saqlanadi */
      const A=nodeById(s.a),B=nodeById(s.b);if(A&&B&&A.mr!=null&&B.mr!=null){s.a=a;s.b=b;s.pts=[];s.rad=[];}
      if(s.p===s.mrP&&!s.st)s.p=pre;s.mrP=pre;}});
  /* asosiy oynada oʻchirilganlar */
  byS.forEach(s=>{const i=ds.segs.indexOf(s);if(i>=0)ds.segs.splice(i,1);});
  byN.forEach(n=>{if(ds.segs.some(s=>s.a===n.id||s.b===n.id))delete n.mr;else{const i=ds.nodes.indexOf(n);if(i>=0)ds.nodes.splice(i,1);}});
  ds.mrH=h;
  busy=true;try{afterDesign();}finally{busy=false;}
  return added;
}
/* ← modul almashtirilsa asosiy oynaga */
function pushBack(){
  if(busy)return;const M=J();if(!M||!Array.isArray(M.edges))return;let ch=false;
  DS().segs.forEach(s=>{if(s.mr==null||s.st||s.p===s.mrP)return;const e=M.edges.find(x=>x.id===s.mr);if(!e)return;e.preset=s.p;s.mrP=s.p;ch=true;});
  if(!ch)return;
  try{localStorage.setItem(KEY,JSON.stringify(M));}catch(e){}
  DS().mrH=hash(JSON.stringify([M.nodes,M.edges.map(e=>[e.id,e.a,e.b,e.preset])]));
}
const _ad=afterDesign;
afterDesign=function(){_ad();pushBack();};
window.addEventListener('storage',e=>{if(e.key===KEY){const n=sync(false);if(n&&typeof toast==='function')toast(`Asosiy oynadan ${n} ta koʻcha keldi.`);}});
const n0=sync(false);if(n0&&typeof toast==='function')setTimeout(()=>toast(`Asosiy oynadagi ${n0} ta koʻcha shu yerga olindi — kesim, YHQ va belgilar shu yerda.`),800);
window.KPSMRSYNC={sync};
})();
