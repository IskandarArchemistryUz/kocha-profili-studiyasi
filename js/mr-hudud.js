/* Archemistry Lab — asosiy oyna: ikki xil chegara, bitta chizish moduli.
 *
 *  MRPLOT — «Uchastka» (U): siz loyihalayotgan yer. Yoʻllar, parsellar, binolar va TEP shu ichida.
 *           Loyiha hujjatida saqlanadi (kps_mr_doc → plot), bekor qilish (Ctrl+Z) ishlaydi.
 *  MRHUD  — «Tahlil hududi» (H): uchastka atrofidagi doira yoki toʻrtburchak — faqat atrofni tahlil qilish uchun
 *           (Hudud bahosi, Yer qoplami, Relyef, Shamol). «kps_site» ga yoziladi.
 *
 *  Ikkalasining formati bir xil: {t, mode:'radius'|'rect'|'poly', ring:[[lat,lng],…], center:[lat,lng]|null, r:<m>|null, areaM2}
 *  Doira halqasi ai.html dagi formula bilan (72 nuqta, 6 xona).
 */
(function(){
'use strict';
const R=Math.PI/180,MY=110574,SNAP=12;
const FC=f=>({type:'FeatureCollection',features:f||[]});
const T=s=>window.T?window.T(s):s;
const fmt=(v,d)=>(+v).toLocaleString('ru-RU',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const rectOf=(a,b)=>[[Math.min(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.max(a[1],b[1])]];
const MODE_N={radius:'Doira',rect:'Toʻrtburchak',poly:'Erkin chegara'};

function areaTool(cfg){
  let map=null,rerender=()=>{},on=false;
  const H={mode:cfg.modes[0],r:cfg.r0||500,center:null,a:null,cur:null,poly:[],done:false,drag:null,extra:[],sub:null};
  /* eksklav (alohida qism) va anklav (teshik) — faqat cfg.multi bo'lsa: {ring:[[lng,lat]…],hole:bool} */
  const L=k=>cfg.id+'-'+k;

  function fromStore(){
    const s=cfg.read();H.a=null;H.cur=null;H.drag=null;H.sub=null;
    H.extra=(s&&Array.isArray(s.parts))?s.parts.filter(q=>q&&q.ring&&q.ring.length>2).map(q=>({hole:!!q.hole,ring:q.ring.map(p=>[+p[1],+p[0]])})):[];
    if(!s||!s.ring||s.ring.length<3){H.center=null;H.poly=[];H.done=false;return;}
    H.mode=cfg.modes.includes(s.mode)?s.mode:'poly';
    if(H.mode==='radius'&&s.center){H.center=[+s.center[1],+s.center[0]];if(s.r)H.r=Math.round(+s.r);H.poly=[];}
    else{if(H.mode==='radius')H.mode='poly';H.center=null;H.poly=s.ring.map(p=>[+p[1],+p[0]]);}
    H.done=true;
  }
  function ring(){
    if(H.mode==='radius'){if(!H.center)return null;const c=H.center,mx=111320*Math.cos(c[1]*R),o=[];
      for(let i=0;i<72;i++){const a=i/72*2*Math.PI;o.push([c[0]+H.r*Math.cos(a)/mx,c[1]+H.r*Math.sin(a)/MY]);}return o;}
    if(H.mode==='rect'&&!H.done&&H.a&&H.cur)return rectOf(H.a,H.cur);
    return H.poly.length?H.poly:null;
  }
  function stats(){const r=ring();if(!r||r.length<3||(!H.done&&H.mode!=='radius'))return null;
    const p=turf.polygon([[...r,r[0]]]);let area=turf.area(p),per=turf.length(turf.lineString([...r,r[0]]),{units:'meters'});
    H.extra.forEach(x=>{const q=[...x.ring,x.ring[0]];const a=turf.area(turf.polygon([q]));area+=x.hole?-a:a;per+=turf.length(turf.lineString(q),{units:'meters'});});
    return {area:Math.max(0,area),per,nPart:H.extra.filter(x=>!x.hole).length,nHole:H.extra.filter(x=>x.hole).length};}
  function commit(){
    const r=ring();if(!r||r.length<3)return;
    const ringLL=r.map(p=>[+(+p[1]).toFixed(6),+(+p[0]).toFixed(6)]);
    const prev=cfg.read();if(prev&&JSON.stringify(prev.ring)===JSON.stringify(ringLL)&&JSON.stringify(prev.parts||[])===JSON.stringify(H.extra.map(x=>({hole:x.hole,ring:x.ring.map(p=>[+(+p[1]).toFixed(6),+(+p[0]).toFixed(6)])}))))return;
    const st=stats();
    const parts=H.extra.map(x=>({hole:x.hole,ring:x.ring.map(p=>[+(+p[1]).toFixed(6),+(+p[0]).toFixed(6)])}));
    cfg.write({t:Date.now(),mode:H.mode,ring:ringLL,...(parts.length?{parts}:{}),center:H.mode==='radius'&&H.center?[H.center[1],H.center[0]]:null,r:H.mode==='radius'?Math.round(H.r):null,areaM2:st?Math.round(st.area):null,src:'muharrir'});
  }
  function clear(){H.extra=[];H.sub=null;H.center=null;H.poly=[];H.a=null;H.cur=null;H.done=false;cfg.write(null);draw();rerender();}

  function addLayers(){
    if(map.getSource(L('src')))return;
    map.addSource(L('src'),{type:'geojson',data:FC()});
    const c=cfg.color;
    map.addLayer({id:L('fill'),type:'fill',source:L('src'),filter:['==',['get','k'],'a'],paint:{'fill-color':c,'fill-opacity':['case',['get','on'],cfg.fillOn,cfg.fillOff]}});
    map.addLayer({id:L('line'),type:'line',source:L('src'),filter:['==',['get','k'],'a'],paint:{'line-color':c,'line-width':['case',['get','on'],cfg.width+.6,cfg.width],'line-dasharray':cfg.dash,'line-opacity':['case',['get','on'],1,.75]}});
    map.addLayer({id:L('lab'),type:'symbol',source:L('src'),filter:['==',['get','k'],'t'],layout:{'text-field':['get','n'],'text-font':['Noto Sans Regular'],'text-size':11,'text-letter-spacing':.08,'text-anchor':'bottom-left','text-offset':[.4,-.3]},paint:{'text-color':c,'text-halo-color':'#fff','text-halo-width':1.4}});
    /* chizish jarayonidagi chiziq — yaxlit va qalin (uzuq-uzuq chiziq kichik masshtabda koʻrinmay qolardi) */
    map.addLayer({id:L('draft'),type:'line',source:L('src'),filter:['==',['get','k'],'d'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':c,'line-width':2.4}});
    /* doira radiusi — markazdan chetgacha chiziq va yozuv */
    map.addLayer({id:L('rad'),type:'line',source:L('src'),filter:['==',['get','k'],'r'],paint:{'line-color':c,'line-width':1.2,'line-dasharray':[2,2]}});
    map.addLayer({id:L('rlab'),type:'symbol',source:L('src'),filter:['==',['get','k'],'rl'],layout:{'text-field':['get','n'],'text-font':['Noto Sans Regular'],'text-size':12,'text-offset':[0,-.8],'text-allow-overlap':true},paint:{'text-color':c,'text-halo-color':'#fff','text-halo-width':1.6}});
    map.addLayer({id:L('pts'),type:'circle',source:L('src'),filter:['==',['get','k'],'v'],paint:{'circle-radius':5,'circle-color':'#fff','circle-stroke-color':c,'circle-stroke-width':2}});
  }
  function draw(){
    if(!map||!map.getSource(L('src')))return;
    const f=[],r=ring();
    if(r&&r.length>1){
      const holes=H.done?H.extra.filter(x=>x.hole).map(x=>[...x.ring,x.ring[0]]):[];
      if(H.done||H.mode!=='poly')f.push({type:'Feature',properties:{k:H.done||H.mode==='radius'?'a':'d',on},geometry:H.done||H.mode==='radius'?{type:'Polygon',coordinates:[[...r,r[0]],...holes]}:{type:'LineString',coordinates:[...r,r[0]]}});
      if(H.done)H.extra.filter(x=>!x.hole).forEach(x=>f.push({type:'Feature',properties:{k:'a',on},geometry:{type:'Polygon',coordinates:[[...x.ring,x.ring[0]]]}}));
      if(H.sub&&H.sub.poly.length)f.push({type:'Feature',properties:{k:'d'},geometry:{type:'LineString',coordinates:H.cur?[...H.sub.poly,H.cur]:H.sub.poly}});
      if(H.mode==='radius'&&H.center){const e=edgePt(),mid=[(H.center[0]+e[0])/2,H.center[1]];
        f.push({type:'Feature',properties:{k:'r'},geometry:{type:'LineString',coordinates:[H.center,e]}});
        f.push({type:'Feature',properties:{k:'rl',n:'r = '+fmt(H.r)+' m'},geometry:{type:'Point',coordinates:mid}});}
      else if(on)f.push({type:'Feature',properties:{k:'d'},geometry:{type:'LineString',coordinates:H.cur?[...r,H.cur]:r}});
      /* yorliq — eng shimoli-gʻarbiy nuqtada */
      if(H.done||H.mode==='radius'){const p=r.reduce((a,b)=>b[1]-b[0]*.3>a[1]-a[0]*.3?b:a,r[0]);f.push({type:'Feature',properties:{k:'t',n:T(cfg.label).toUpperCase()},geometry:{type:'Point',coordinates:p}});}}
    if(on)handles().map(h=>h.p).forEach(p=>f.push({type:'Feature',properties:{k:'v'},geometry:{type:'Point',coordinates:p}}));
    map.getSource(L('src')).setData(FC(f));
  }
  function handles(){
    if(H.mode==='radius')return H.center?[{p:H.center,set:ll=>{H.center=ll;}},{p:edgePt(),set:ll=>{H.r=Math.max(20,Math.round(turf.distance(turf.point(H.center),turf.point(ll),{units:'meters'})));}}]:[];
    if(H.mode==='rect'&&!H.done)return H.a?[{p:H.a,set:()=>{}}]:[];
    const o=H.poly.map((p,i)=>({p,set:ll=>{H.poly[i]=ll;}}));
    if(H.done)H.extra.forEach(x=>x.ring.forEach((p,i)=>o.push({p,set:ll=>{x.ring[i]=ll;}})));
    if(H.sub)H.sub.poly.forEach(p=>o.push({p,set:()=>{}}));
    return o;
  }
  const edgePt=()=>{const c=H.center,mx=111320*Math.cos(c[1]*R);return [c[0]+H.r/mx,c[1]];};
  function hit(pt){const hs=handles();let best=-1,bd=SNAP;
    hs.forEach((h,i)=>{const q=map.project(h.p),d=Math.hypot(q.x-pt.x,q.y-pt.y);if(d<bd){bd=d;best=i;}});return best;}

  function click(e){
    if(H.dragged){H.dragged=false;return;}
    if(H.sub){const sp=H.sub.poly;if(sp.length>2){const q=map.project(sp[0]);if(Math.hypot(q.x-e.point.x,q.y-e.point.y)<14){closeSub();return;}}
      sp.push(e.lngLat.toArray());draw();rerender();return;}
    if(!H.done&&!H.poly.length&&!H.a)toTop();   // chizish boshlanganda qatlamlar eng ustida
    const ll=e.lngLat.toArray();
    if(H.mode==='radius'){if(H.center&&H.done)return;H.center=ll;H.done=true;commit();}
    else if(H.mode==='rect'){if(H.done)return;
      if(!H.a){H.a=ll;H.cur=ll;}else{H.poly=rectOf(H.a,ll);H.a=null;H.cur=null;H.done=true;commit();}}
    else{if(H.done)return;
      if(H.poly.length>2){const q=map.project(H.poly[0]);if(Math.hypot(q.x-e.point.x,q.y-e.point.y)<14){close();return;}}
      H.poly.push(ll);}
    draw();rerender();
  }
  function closeSub(){if(!H.sub||H.sub.poly.length<3)return;let ring=H.sub.poly;
    if(H.sub.hole){/* teshik asosiy chegara ichida bo'lishi kerak — tashqarisi kesiladi */
      try{const m=ring.length&&turf.polygon([[...H.poly,H.poly[0]]]),c=turf.intersect(turf.featureCollection([m,turf.polygon([[...ring,ring[0]]])]));
        if(!c){H.sub=null;H.cur=null;draw();rerender();return;}if(c.geometry.type==='Polygon')ring=c.geometry.coordinates[0].slice(0,-1);}catch(_){}}
    H.extra.push({hole:H.sub.hole,ring});H.sub=null;H.cur=null;commit();draw();rerender();}
  function startSub(hole){if(!H.done||H.mode==='radius')return;H.sub={hole,poly:[]};H.cur=null;draw();rerender();}
  function close(){if(H.mode!=='poly'||H.poly.length<3)return;H.done=true;H.cur=null;commit();draw();rerender();}
  function move(e){
    if(H.drag)return;
    if(H.sub&&H.sub.poly.length||!H.done&&(H.mode==='rect'&&H.a||H.mode==='poly'&&H.poly.length)){H.cur=e.lngLat.toArray();draw();}
    map.getCanvas().style.cursor=hit(e.point)>=0?'move':'crosshair';
  }
  function down(e){if(!on)return;const i=hit(e.point);if(i<0)return;e.preventDefault();map.dragPan.disable();H.drag={i};}
  function dragMove(e){
    if(!on||!H.drag)return;const ll=e.lngLat.toArray();
    const h=handles()[H.drag.i];if(h)h.set(ll);
    H.drag.moved=true;draw();rerender();
  }
  function up(){if(!H.drag)return;const m=H.drag.moved;H.drag=null;map.dragPan.enable();if(m){H.dragged=true;setTimeout(()=>{H.dragged=false;},0);commit();rerender();}}
  function dbl(e){if(H.sub){e.preventDefault();closeSub();return;}if(H.mode==='poly'&&!H.done){e.preventDefault();close();}}
  function key(e){
    if(H.sub){if(e.key==='Enter'){closeSub();return true;}if(e.key==='Escape'){H.sub=null;H.cur=null;draw();rerender();return true;}
      if(e.key==='Backspace'&&H.sub.poly.length){H.sub.poly.pop();draw();rerender();return true;}}
    if(e.key==='Enter'&&H.mode==='poly'&&!H.done){close();return true;}
    if(e.key==='Escape'&&!H.done&&(H.a||H.poly.length)){H.a=null;H.cur=null;H.poly=[];draw();rerender();return true;}
    if(e.key==='Backspace'&&H.mode==='poly'&&!H.done&&H.poly.length){H.poly.pop();draw();rerender();return true;}
    return false;
  }
  function setMode(m){H.extra=[];H.sub=null;H.mode=m;H.center=null;H.a=null;H.cur=null;H.poly=[];H.done=false;draw();rerender();}

  function hint(){
    if(H.sub)return (H.sub.hole?'Teshik (anklav)':'Qoʻshimcha qism (eksklav)')+': nuqtalarni bosing · birinchi nuqta yoki Enter — yopish · Esc — bekor';
    if(H.mode==='radius')return H.done?'Markazni yoki chetdagi nuqtani sudrang':'Markazni bosing';
    if(H.mode==='rect')return H.done?'Burchaklarni sudrab tuzating':H.a?'Ikkinchi burchakni bosing · Esc — bekor':'Birinchi burchakni bosing';
    return H.done?'Nuqtalarni sudrab tuzating':H.poly.length?'Keyingi nuqta · birinchi nuqtani bosing yoki Enter — yopish · Backspace — oxirgisini oʻchirish':'Chegaraning birinchi nuqtasini bosing';
  }
  function html(){
    const st=stats();
    return `<p class="note" style="margin-top:0">${T(cfg.about)}</p>
    ${cfg.modes.length>1?`<div class="seg ${cfg.modes.length===3?'seg3':''}" role="group" aria-label="${T('Shakl')}" style="margin-bottom:10px">${cfg.modes.map(k=>`<button data-am="${k}" aria-pressed="${H.mode===k}">${T(MODE_N[k]).toUpperCase()}</button>`).join('')}</div>`:''}
    ${H.mode==='radius'?`<label class="kv" style="align-items:center"><span>${T('Radius, m')}</span><input data-ar type="number" min="50" max="9000" step="50" value="${H.r}" style="width:90px"></label>`:''}
    ${st?`<div class="kv"><span>${T('Maydon')}</span><b>${fmt(st.area/1e4,2)} ${T('ga')}</b><span>${T('Perimetr')}</span><b>${fmt(st.per)} m</b></div>`:''}
    ${cfg.multi&&H.done&&H.mode!=='radius'?`<div style="margin-top:10px;border-top:1px solid var(--line,#ddd);padding-top:8px"><div class="lb" style="margin-bottom:6px">${T('Murakkab chegara')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-asub="0" title="${T('Asosiy chegaradan ajralgan alohida yer boʻlagi')}" ${H.sub&&!H.sub.hole?'aria-pressed="true"':''}>+ ${T('Qism (eksklav)')}</button><button class="btn" data-asub="1" title="${T('Uchastka ichidagi loyihaga kirmaydigan joy (masalan, saqlanadigan bino yoki boshqa egalik)')}" ${H.sub&&H.sub.hole?'aria-pressed="true"':''}>− ${T('Teshik (anklav)')}</button></div>
      ${H.extra.length?`<div style="margin-top:6px;display:grid;gap:3px">${H.extra.map((x,i)=>{const a=turf.area(turf.polygon([[...x.ring,x.ring[0]]]))/1e4;return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px"><span>${x.hole?'− '+T('Teshik'):'+ '+T('Qism')} ${i+1} · ${fmt(a,2)} ${T('ga')}</span><button class="btn" data-axdel="${i}" style="height:22px;padding:0 6px" aria-label="${T('Oʻchirish')}">${KIC.i('x','',14)}</button></div>`;}).join('')}</div>`:''}</div>`:''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${H.done?`<button class="btn" data-anew>${T('Qayta chizish')}</button><button class="btn" data-adel>${T('Oʻchirish')}</button>`:''}${(cfg.extra&&cfg.extra(st))||''}</div>`;
  }
  function bind(root){
    root.querySelectorAll('[data-am]').forEach(b=>b.onclick=()=>setMode(b.dataset.am));
    const r=root.querySelector('[data-ar]');if(r)r.onchange=()=>{H.r=Math.max(50,Math.min(9000,Math.round(+r.value||500)));draw();commit();rerender();};
    const n=root.querySelector('[data-anew]');if(n)n.onclick=()=>setMode(H.mode);
    const d=root.querySelector('[data-adel]');if(d)d.onclick=clear;
    root.querySelectorAll('[data-asub]').forEach(b=>b.onclick=()=>startSub(b.dataset.asub==='1'));
    root.querySelectorAll('[data-axdel]').forEach(b=>b.onclick=()=>{H.extra.splice(+b.dataset.axdel,1);commit();draw();rerender();});
    if(cfg.bindExtra)cfg.bindExtra(root);
  }
  function init(o){
    map=o.map;rerender=o.render||rerender;
    const go=()=>{addLayers();fromStore();draw();};
    if(map.isStyleLoaded())go();else map.once('load',go);
    map.on('mousedown',down);map.on('mousemove',dragMove);window.addEventListener('mouseup',up);
  }
  /* tashqaridan oʻzgarganda (boshqa oyna, bekor qilish) */
  function reload(){if(H.drag)return;const keep=on&&(H.sub||!H.done&&(H.a||H.poly.length));if(!keep)fromStore();draw();}
  function active(v){on=!!v;if(on){fromStore();toTop();}draw();}
  function toTop(){if(!map)return;['fill','line','draft','rad','lab','rlab','pts'].forEach(k=>{try{if(map.getLayer(L(k)))map.moveLayer(L(k));}catch(e){}});}
  return {init,active,click,move,dbl,key,html,bind,hint,reload,draw,setMode,get state(){return H;},stats,ring,next:null};
}

/* Tahlil hududi — kps_site */
const readSite=()=>{try{return JSON.parse(localStorage.getItem('kps_site')||'null');}catch(e){return null;}};
window.MRHUD=areaTool({id:'hud',label:'Tahlil hududi',modes:['radius','rect','poly'],r0:500,color:'#6a4fc9',dash:[3,2],width:2,fillOn:.07,fillOff:.03,
  about:'Uchastka atrofidagi hudud — faqat tahlil uchun: Hudud bahosi, Yer qoplami, Relyef, Shamol shu hudud boʻyicha hisoblanadi. Loyiha chegarasi emas.',
  read:readSite,
  write:s=>{try{if(s)localStorage.setItem('kps_site',JSON.stringify(s));else localStorage.removeItem('kps_site');}catch(e){}},
  extra:st=>st?`<button class="btn" data-ago>${T('Hudud bahosi')}${KIC.i('arrow-right','a')}</button>`:'',
  bindExtra:root=>{const g=root.querySelector('[data-ago]');if(g)g.onclick=()=>{try{parent.postMessage({kps:'go',href:'ai.html#auto'},location.origin);}catch(e){}};}});
window.addEventListener('storage',e=>{if(e.key==='kps_site')window.MRHUD.reload();});
window.MRHUD_areaTool=areaTool;
})();
