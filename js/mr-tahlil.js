/* Archemistry Lab — Master reja muharriri: «Tahlil qatlamlari» asbobi (A).
 * Tahlil boʻlimlari eʼlon qilgan natijalar (js/layerbus.js) shu xaritada qatlam boʻlib koʻrinadi:
 * yer qoplami, relyef, nishab, yer foydalanish, zichlik, tarmoqlar, shamol.
 * Yoqilgan qatlamlar boshqa asboblarda ham qoladi — loyiha ostida «taglik» sifatida.
 */
(function(){
'use strict';
let map=null,rerender=()=>{},on=false,GR=[],shown={};   // shown[gid]=t (xaritaga qoʻshilgan versiya)
const KEY='kps_tx';
const T=s=>window.T?window.T(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rd=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}};
const wr=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}};
let ST=rd();   // {gid:{on:bool, op:0..1}}
const PAGES=[['studio.html#area','Yer qoplami'],['gis.html','Relyef · zichlik · tarmoqlar'],['shamol.html','Shamol']];
const ORDER=g=>g.id==='tasnif'?0:g.id.startsWith('gis-')?1:2;

/* qatlam ostiga: loyiha qatlamlari (kvartallar, koʻchalar) ustida qoladi */
function beforeId(){const st=map.getStyle();if(!st)return undefined;const l=st.layers.find(x=>!x.id.startsWith('kb-')&&!x.id.startsWith('tx-'));return l&&l.id;}
const pid=(g,k)=>`tx-${g.id}-${k}`;
function opProp(t){return {raster:'raster-opacity',fill:'fill-opacity',line:'line-opacity',circle:'circle-opacity',symbol:'text-opacity'}[t];}
function drop(gid){const st=map.getStyle();if(!st)return;
  st.layers.filter(l=>l.id.startsWith(`tx-${gid}-`)).forEach(l=>{try{map.removeLayer(l.id);}catch(e){}});
  Object.keys(st.sources).filter(k=>k.startsWith(`tx-${gid}-`)).forEach(k=>{try{map.removeSource(k);}catch(e){}});
  delete shown[gid];}
function add(g){
  const b=beforeId(),op=(ST[g.id]&&ST[g.id].op!=null)?ST[g.id].op:1;
  Object.entries(g.sources).forEach(([k,v])=>{if(!map.getSource(pid(g,k)))map.addSource(pid(g,k),v);});
  g.layers.forEach(l=>{const c=JSON.parse(JSON.stringify(l));c.id=pid(g,l.id);c.source=pid(g,l.source);c.metadata={'kps:op0':(c.paint||{})[opProp(c.type)]};
    c.paint=Object.assign({},c.paint);const p=opProp(c.type),o0=c.paint[p];if(p)c.paint[p]=mul(o0==null?1:o0,op);
    try{map.addLayer(c,b);}catch(e){console.warn('Qatlam qoʻshilmadi',c.id,e);}});
  shown[g.id]=g.t;}
const mul=(o0,k)=>typeof o0==='number'?o0*k:['*',o0,k];
function setOp(gid,op){const st=map.getStyle();if(!st)return;
  st.layers.filter(l=>l.id.startsWith(`tx-${gid}-`)).forEach(l=>{const p=opProp(l.type);if(!p)return;const o0=(l.metadata||{})['kps:op0'];try{map.setPaintProperty(l.id,p,mul(o0==null?1:o0,op));}catch(e){}});}
function sync(){
  if(!map||!map.isStyleLoaded())return;
  const ids=new Set(GR.map(g=>g.id));
  Object.keys(shown).forEach(gid=>{if(!ids.has(gid)||!(ST[gid]&&ST[gid].on))drop(gid);});
  GR.forEach(g=>{const want=ST[g.id]&&ST[g.id].on;if(!want)return;if(shown[g.id]!==g.t){drop(g.id);add(g);}});
}
async function refresh(){GR=(await KPSLAY.list()).sort((a,b)=>ORDER(a)-ORDER(b)||a.name.localeCompare(b.name));
  /* yangi kelgan natija — avtomatik yoqiladi (bir marta) */
  GR.forEach(g=>{if(!ST[g.id]){ST[g.id]={on:true,op:.85};wr(ST);}});
  sync();if(on)rerender();}

/* panel */
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?T('hozir'):m<60?m+' '+T('daq oldin'):m<1440?Math.round(m/60)+' '+T('soat oldin'):new Date(t).toLocaleDateString('ru-RU');};
function cleanLegend(h){const d=new DOMParser().parseFromString(`<div>${h||''}</div>`,'text/html');d.querySelectorAll('script,style,iframe,object,embed,link,img,svg,video,audio,form').forEach(x=>x.remove());
  d.querySelectorAll('*').forEach(x=>[...x.attributes].forEach(a=>{if(/^on/i.test(a.name)||/javascript:/i.test(a.value))x.removeAttribute(a.name);}));return d.body.firstChild.innerHTML;}
function html(){
  let h=`<p class="note">${T('Tahlil boʻlimlarida hisoblangan natijalar shu xaritada qatlam boʻlib turadi. Yoqilgan qatlam boshqa asboblarda ham koʻrinadi.')}</p>`;
  if(!GR.length)h+=`<p class="note"><b>${T('Hali natija yoʻq.')}</b> ${T('Quyidagi tahlillardan birini oching — natija avtomatik shu yerga keladi.')}</p>`;
  h+=`<div class="txl">${GR.map(g=>{const s=ST[g.id]||{};return `<div class="txg" data-g="${esc(g.id)}">
    <label class="txh"><input type="checkbox" data-on ${s.on?'checked':''}><b>${esc(T(g.name))}</b><small>${ago(g.t)}</small></label>
    ${s.on?`<div class="txo"><span>${T('Shaffoflik')}</span><input type="range" min="0.1" max="1" step="0.05" value="${s.op??1}" data-op aria-label="${T('Shaffoflik')}"></div><div class="txleg">${cleanLegend(g.legend)}</div>`:''}
    <div class="txb"><button class="btn" data-go="${esc(g.page)}">${T('Yangilash →')}</button><button class="btn" data-del title="${T('Roʻyxatdan olib tashlash')}">×</button></div></div>`;}).join('')}</div>`;
  h+=`<span class="lb" style="display:block;margin:12px 0 6px">${T('Tahlilni hisoblash')}</span><div style="display:flex;flex-wrap:wrap;gap:6px">${PAGES.map(([p,n])=>`<button class="btn" data-go="${p}">${T(n)} →</button>`).join('')}</div>`;
  return h;
}
function bind(root){
  root.querySelectorAll('.txg').forEach(el=>{const gid=el.dataset.g;
    const c=el.querySelector('[data-on]');c.onchange=()=>{ST[gid]=Object.assign({op:.85},ST[gid],{on:c.checked});wr(ST);sync();rerender();};
    const r=el.querySelector('[data-op]');if(r)r.oninput=()=>{ST[gid].op=+r.value;wr(ST);setOp(gid,+r.value);};
    el.querySelector('[data-del]').onclick=async()=>{await KPSLAY.remove(gid);delete ST[gid];wr(ST);};});
  root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{try{parent.postMessage({kps:'go',href:b.dataset.go},location.origin);}catch(e){}});
}
function css(){const s=document.createElement('style');s.textContent=`
.txl{display:grid;gap:8px}.txg{border:1px solid var(--line,#ddd);padding:8px 9px}
.txh{display:flex;align-items:center;gap:7px;cursor:pointer}.txh b{font-weight:500;flex:1}.txh small{color:#888;font-size:10.5px;white-space:nowrap}
.txo{display:flex;align-items:center;gap:8px;margin-top:7px;font-size:11px;color:#666}.txo input{flex:1}
.txleg{display:grid;gap:4px;margin-top:7px;font-size:11px}.txleg .t{font-weight:500}.txleg .it{display:flex;align-items:center;gap:6px}
.txleg i{width:13px;height:9px;flex:none;border:1px solid rgba(0,0,0,.15)}.txleg .ramp{height:8px;width:100%}.txleg .rl,.txleg .ramp-lbl{display:flex;justify-content:space-between;color:#888}
.txb{display:flex;gap:6px;margin-top:8px}.txb .btn{padding:3px 8px;font-size:11px}`;document.head.appendChild(s);}

function init(o){
  map=o.map;rerender=o.render||rerender;css();
  KPSLAY.onChange(()=>refresh());
  window.addEventListener('storage',e=>{if(e.key===KEY){ST=rd();sync();if(on)rerender();}});
  /* fon uslubi almashganda qatlamlar qayta qoʻshiladi */
  map.on('style.load',()=>{shown={};sync();});
  refresh();
}
function active(v){on=!!v;if(on)refresh();}
window.MRTX={init,active,html,bind,refresh,hint:()=>'Qatlamlarni yoqing va shaffofligini sozlang · boshqa asboblarda ham koʻrinadi',get groups(){return GR;}};
})();
