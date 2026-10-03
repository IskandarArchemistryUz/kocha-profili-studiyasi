/* Archemistry Studio — xarita qatlamlari boshqaruvi (yoqish/oʻchirish, rang, oʻlcham, shaffoflik, ikonka)
   window.ULY: set(id,def), clear(), panel(el), legend(el), toSVG(), PAL */
(function(){
'use strict';
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ---- palitralar (kartografiya tamoyillari: neytral asos, ketma-ket, divergent, xavf, yer foydalanish) ---- */
const PAL={
  seq:['#dbe7ef','#b8d0de','#8bb4c9','#5c93b3','#22577a'],
  seqG:['#e8f1e4','#c3dcb5','#93c089','#5e9e5e','#2e6b3f'],
  heat:['#f7e9c7','#f4c88a','#eda062','#d8724a','#b03a2e'],
  div:['#c46a3a','#eab59a','#ededed','#9ec1c7','#278062'],
  base:['#fafaf7','#d9dedc','#c8cfd1','#8e999d','#66747c','#263238'],
  use:{res:'#e9c46a',com:'#d77a61',off:'#d77a61',soc:'#8fb4c7',ind:'#b08bbb',green:'#b6c99a',mix:'#e4b08a',water:'#7ea6b8',other:'#c8cfd1'}
};
/* ---- ikonkalar (24×24, oq rangda doira ichida chiziladi) ---- */
const IC={
  dot:'',
  bus:'M6 4h12a2 2 0 0 1 2 2v10h-2v2h-2v-2H8v2H6v-2H4V6a2 2 0 0 1 2-2zm0 3v4h12V7zm1 6.5a1.2 1.2 0 1 0 0 .1zm10 0a1.2 1.2 0 1 0 0 .1z',
  metro:'M4 19 9 5l3 7 3-7 5 14h-3l-2-7-3 6-3-6-2 7z',
  school:'M12 4 2 9l10 5 8-4v6h2V9zM6 13v3c2 2 10 2 12 0v-3l-6 3z',
  health:'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  food:'M5 6h14l-1.5 9h-11zM8 18a1.5 1.5 0 1 0 0 .1zm8 0a1.5 1.5 0 1 0 0 .1zM3 4h3l1 2H3z',
  cafe:'M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zm12 1h2a2.5 2.5 0 0 1 0 5h-2v-2h2a.5.5 0 0 0 0-1h-2zM7 3h2v3H7zm4 0h2v3h-2z',
  tree:'M12 2a6 6 0 0 1 5.6 8.2A5 5 0 0 1 14 18h-1v4h-2v-4h-1a5 5 0 0 1-3.6-7.8A6 6 0 0 1 12 2z',
  park:'M12 3l5 7h-3l4 6h-5v5h-2v-5H6l4-6H7z',
  sport:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2c1.4 0 2.7.4 3.8 1.1L12 9 8.2 6.1A7 7 0 0 1 12 5zM5 12c0-1.4.4-2.7 1.1-3.8L9 12l-2.9 3.8A7 7 0 0 1 5 12zm7 7c-1.4 0-2.7-.4-3.8-1.1L12 15l3.8 2.9A7 7 0 0 1 12 19zm5.9-3.2L15 12l2.9-3.8A7 7 0 0 1 17.9 15.8z',
  cult:'M12 3 3 8v2h18V8zM5 11h2v7H5zm4 0h2v7H9zm4 0h2v7h-2zm4 0h2v7h-2zM3 19h18v2H3z',
  serv:'M4 7h16v12H4zm2 2v2h12V9zM9 4h6v3H9z',
  cross:'M3 6h3v12H3zm5 0h3v12H8zm5 0h3v12h-3zm5 0h3v12h-3z',
  wheel:'M11 3a2 2 0 1 1 0 .1zM10 7h2v5h5l2 6-2 .7-1.5-4.7H10zm-1.5 3.2.5 2A4 4 0 1 0 13.8 18l1.9.7A6 6 0 1 1 8.5 10.2z',
  bld:'M5 21V5l7-3 7 3v16h-5v-5h-4v5zm4-14v2h2V7zm4 0v2h2V7zm-4 4v2h2v-2zm4 0v2h2v-2z',
  warn:'M12 3 22 20H2zm-1 6v6h2V9zm0 7v2h2v-2z',
  star:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  bike:'M5 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm14-2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 5h3v2h-1.6l1.8 4.7-1.9.7-.6-1.4-3.4 4H8.7l3.6-5.6L11.4 7H10V5z'
};
const P2={};const path2=k=>P2[k]||(P2[k]=IC[k]?new Path2D(IC[k]):null);
/* ---- saqlangan uslublar ---- */
let SAVED={};try{SAVED=JSON.parse(localStorage.getItem('kps_uly')||'{}');}catch(e){}
const save=()=>{try{const o={};Object.values(LY).forEach(l=>{o[l.id]=l.st;});localStorage.setItem('kps_uly',JSON.stringify(Object.assign(SAVED,o)));}catch(e){}};
/* ---- kanvas nuqta qatlami ---- */
const PtLayer=L.Layer.extend({
  initialize(ly){this.ly=ly;},
  onAdd(map){this._map=map;const c=this._c=L.DomUtil.create('canvas','uly-pt');c.style.cssText='position:absolute;pointer-events:none';map.getPane('overlayPane').appendChild(c);
    this._r=()=>this.redraw();this._h=()=>{c.style.display='none';};map.on('moveend zoomend resize viewreset',this._r);map.on('zoomstart',this._h);this.redraw();},
  onRemove(map){map.off('moveend zoomend resize viewreset',this._r);map.off('zoomstart',this._h);this._c.remove();},
  redraw(){const map=this._map;if(!map)return;const c=this._c,sz=map.getSize(),dpr=Math.min(2,devicePixelRatio||1);c.width=sz.x*dpr;c.height=sz.y*dpr;c.style.width=sz.x+'px';c.style.height=sz.y+'px';c.style.display='';
    L.DomUtil.setPosition(c,map.containerPointToLayerPoint([0,0]));const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,sz.x,sz.y);
    const st=this.ly.st,s=+st.size||4,ic=st.shape==='icon'?path2(st.icon||this.ly.icon||'dot'):null,b=map.getBounds().pad(.05);g.globalAlpha=+st.opacity;
    const cf=this.ly.colorFn;for(const d of this.ly.data){const p=d.p||d;if(!b.contains(p))continue;const q=map.latLngToContainerPoint(p),col=cf?cf(d,st)||st.color:st.color;
      if(st.shape==='square'){g.fillStyle=col;g.fillRect(q.x-s,q.y-s,2*s,2*s);if(s>=3){g.strokeStyle='#fff';g.lineWidth=1;g.strokeRect(q.x-s,q.y-s,2*s,2*s);}continue;}
      g.beginPath();g.arc(q.x,q.y,s,0,7);g.fillStyle=col;g.fill();if(s>=3||ic){g.strokeStyle='#fff';g.lineWidth=s>=6?1.5:1;g.stroke();}
      if(ic&&s>=5){const k=s*1.25/24;g.save();g.translate(q.x-12*k,q.y-12*k);g.scale(k,k);g.fillStyle='#fff';g.fill(ic,'evenodd');g.restore();}}}
});
const RND=L.canvas({padding:.4});
/* ---- qatlamlar reyestri ---- */
const LY={};let MAP=null,ORDER=[],onChange=()=>{};
const DEF={pt:{color:'#7b61d1',size:4,opacity:.9,shape:'dot',icon:'dot'},line:{color:'#141414',size:1.5,opacity:.8},poly:{color:'#8e999d',size:.5,opacity:.45},raster:{color:'#22577a',opacity:.6}};
function set(id,d){if(LY[id])remove(id);const st=Object.assign({},DEF[d.kind],d.st||{},SAVED[id]||{});if(st.on==null)st.on=d.on!==false;const l=Object.assign({id,st,data:d.data||[]},d);l.st=st;LY[id]=l;if(!ORDER.includes(id))ORDER.push(id);build(l);if(st.on)l.layer.addTo(MAP);refresh();return l;}
function remove(id){const l=LY[id];if(!l)return;if(l.layer)MAP.removeLayer(l.layer);delete LY[id];}
function clear(keep){Object.keys(LY).forEach(id=>{if(!keep||!keep.includes(id))remove(id);});ORDER=ORDER.filter(id=>LY[id]);refresh();}
function build(l){const st=l.st;
  if(l.kind==='pt'){l.layer=new PtLayer(l);return;}
  if(l.kind==='raster'){const r=l.render(st);l.layer=L.imageOverlay(r.url,r.bounds,{opacity:+st.opacity,interactive:false,className:'uly-ras'});return;}
  const g=L.layerGroup();l.data.forEach(f=>{const col=l.colorFn?l.colorFn(f,st)||st.color:st.color;const o=l.kind==='line'?{renderer:RND,color:col,weight:+st.size,opacity:+st.opacity,interactive:false,dashArray:l.dashFn?l.dashFn(f):null}:{renderer:RND,color:l.stroke||col,weight:+st.size,opacity:Math.min(1,+st.opacity+.3),fillColor:col,fillOpacity:+st.opacity,interactive:false};
    const s=(l.kind==='line'?L.polyline:L.polygon)(f.g||f,o);s._f=f;g.addLayer(s);});l.layer=g;}
function restyle(l){const st=l.st;if(!l.layer)return;
  if(l.kind==='pt'){if(st.on)l.layer.redraw();}
  else if(l.kind==='raster'){const r=l.render(st);l.layer.setUrl(r.url);l.layer.setOpacity(+st.opacity);}
  else l.layer.eachLayer(s=>{const col=l.colorFn?l.colorFn(s._f,st)||st.color:st.color;s.setStyle(l.kind==='line'?{color:col,weight:+st.size,opacity:+st.opacity}:{color:l.stroke||col,weight:+st.size,fillColor:col,fillOpacity:+st.opacity,opacity:Math.min(1,+st.opacity+.3)});});
  save();onChange();}
function toggle(l,on){l.st.on=on;if(on)l.layer.addTo(MAP);else MAP.removeLayer(l.layer);save();refresh();}
/* ---- panel ---- */
let PEL=null,LEL=null,open={};
const ICN=Object.keys(IC);
function refresh(){if(PEL)renderPanel();if(LEL)renderLegend();onChange();}
function renderPanel(){const groups={};ORDER.forEach(id=>{const l=LY[id];if(!l)return;(groups[l.group||T('Boshqa')]=groups[l.group||T('Boshqa')]||[]).push(l);});
  let h=`<div class="uh"><b>${T('Qatlamlar')}</b><span style="flex:1"></span><button data-ua="none" title="${T('Hammasini oʻchirish')}">${T('oʻchirish')}</button><button data-ua="min" title="${T('Yigʻish')}">${PEL.classList.contains('min')?'▸':'▾'}</button></div><div class="ub">`;
  Object.entries(groups).forEach(([g,ls])=>{h+=`<div class="ug">${esc(T(g))}</div>`;ls.forEach(l=>{const st=l.st,n=l.count!=null?l.count:(l.data||[]).length;
    h+=`<div class="ur${open[l.id]?' op':''}" data-id="${l.id}"><label><input type="checkbox" data-uk="on" ${st.on?'checked':''}><span class="sw" style="${swatch(l)}"></span><span class="nm">${esc(T(l.name))}</span>${n?`<span class="ct">${n>999?Math.round(n/100)/10+'k':n}</span>`:''}</label><button data-uk="x" title="${T('Sozlash')}">⚙</button></div>`;
    if(open[l.id]){h+=`<div class="us" data-id="${l.id}">`;
      if(l.kind!=='raster'||l.palettes)h+=l.palettes?`<label>${T('Palitra')}<select data-uk="pal">${Object.entries(l.palettes).map(([k,v])=>`<option value="${k}" ${st.pal===k?'selected':''}>${esc(T(v))}</option>`).join('')}</select></label>`:'';
      if(l.modes)h+=`<label>${T('Rang boʻyicha')}<select data-uk="mode">${Object.entries(l.modes).map(([k,v])=>`<option value="${k}" ${st.mode===k?'selected':''}>${esc(T(v))}</option>`).join('')}</select></label>`;
      if(l.kind!=='raster'&&!(l.modes&&st.mode&&st.mode!=='one'))h+=`<label>${T('Rang')}<input type="color" data-uk="color" value="${st.color}"></label>`;
      if(l.kind==='pt')h+=`<label>${T('Oʻlcham')}<input type="range" min="1" max="16" step=".5" data-uk="size" value="${st.size}"><output>${st.size}</output></label><label>${T('Shakl')}<select data-uk="shape"><option value="dot" ${st.shape==='dot'?'selected':''}>${T('nuqta')}</option><option value="square" ${st.shape==='square'?'selected':''}>${T('kvadrat')}</option><option value="icon" ${st.shape==='icon'?'selected':''}>${T('ikonka')}</option></select></label>`+
        (st.shape==='icon'?`<div class="ui">${ICN.filter(k=>k!=='dot').map(k=>`<button data-uic="${k}" aria-pressed="${(st.icon||l.icon)===k}"><svg viewBox="0 0 24 24"><path d="${IC[k]}" fill-rule="evenodd"/></svg></button>`).join('')}</div>`:'');
      if(l.kind==='line')h+=`<label>${T('Qalinlik')}<input type="range" min=".5" max="8" step=".5" data-uk="size" value="${st.size}"><output>${st.size}</output></label>`;
      if(l.kind==='poly')h+=`<label>${T('Kontur')}<input type="range" min="0" max="4" step=".25" data-uk="size" value="${st.size}"><output>${st.size}</output></label>`;
      h+=`<label>${T('Shaffoflik')}<input type="range" min=".05" max="1" step=".05" data-uk="opacity" value="${st.opacity}"><output>${Math.round(st.opacity*100)}%</output></label>`;
      if(l.note)h+=`<div class="un">${esc(T(l.note))}</div>`;h+=`</div>`;}});});
  h+=`</div>`;PEL.innerHTML=h;}
function swatch(l){const st=l.st;if(l.kind==='raster'||(l.modes&&st.mode&&st.mode!=='one')){const p=l.legend?l.legend(st):[];return `background:linear-gradient(90deg,${(p.length?p.map(x=>x[0]):PAL.seq).join(',')})`;}
  if(l.kind==='line')return `background:${st.color};height:3px;margin-top:5px`;if(l.kind==='poly')return `background:${st.color};opacity:${Math.max(.35,st.opacity)}`;return `background:${st.color};border-radius:${st.shape==='square'?'1px':'50%'}`;}
function bindPanel(){PEL.addEventListener('input',e=>{const r=e.target.closest('[data-id]');if(!r)return;const l=LY[r.dataset.id],k=e.target.dataset.uk;if(!l||!k)return;
    if(k==='on'){toggle(l,e.target.checked);return;}let v=e.target.value;if(k==='size'||k==='opacity')v=+v;l.st[k]=v;const o=e.target.nextElementSibling;if(o&&o.tagName==='OUTPUT')o.textContent=k==='opacity'?Math.round(v*100)+'%':v;
    if(k==='shape'||k==='mode'||k==='pal'){restyle(l);renderPanel();}else{restyle(l);const sw=PEL.querySelector(`.ur[data-id="${l.id}"] .sw`);if(sw)sw.style.cssText=swatch(l);}if(LEL)renderLegend();});
  PEL.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const r=b.closest('[data-id]');
    if(b.dataset.ua==='none'){Object.values(LY).forEach(l=>{if(l.st.on&&!l.keep)toggle(l,false);});return;}if(b.dataset.ua==='min'){PEL.classList.toggle('min');renderPanel();return;}
    if(!r)return;const l=LY[r.dataset.id];if(b.dataset.uk==='x'){open[l.id]=!open[l.id];renderPanel();return;}if(b.dataset.uic){l.st.icon=b.dataset.uic;restyle(l);renderPanel();}});
  L.DomEvent.disableClickPropagation(PEL);L.DomEvent.disableScrollPropagation(PEL);}
function renderLegend(){const ls=ORDER.map(id=>LY[id]).filter(l=>l&&l.st.on&&!l.noLegend);if(!ls.length){LEL.hidden=true;return;}LEL.hidden=false;
  LEL.innerHTML=ls.map(l=>{const p=l.legend?l.legend(l.st):null;if(p&&p.length)return `<div class="lr"><span class="lt">${esc(T(l.name))}</span>${p.map(([c,t])=>`<span class="li"><i style="background:${c}"></i>${esc(T(t))}</span>`).join('')}</div>`;
    const st=l.st,ic=st.shape==='icon'&&IC[st.icon||l.icon]?`<svg viewBox="0 0 24 24" style="width:14px;height:14px;background:${st.color};border-radius:50%;fill:#fff;padding:2px"><path d="${IC[st.icon||l.icon]}" fill-rule="evenodd"/></svg>`:`<i style="${swatch(l)};width:12px;height:${l.kind==='line'?3:12}px;display:inline-block;margin:0"></i>`;
    return `<div class="lr"><span class="li">${ic}${esc(T(l.name))}</span></div>`;}).join('');}
/* ---- SVG eksport (albom uchun) ---- */
function toSVG(bb,W){const MX=111320*Math.cos((bb[0]+bb[2])/2*Math.PI/180),MY=110574,x0=bb[1]*MX,y1=bb[2]*MY,k=W/((bb[3]-bb[1])*MX),H=(bb[2]-bb[0])*MY*k,P=p=>`${((p[1]*MX-x0)*k).toFixed(1)} ${((y1-p[0]*MY)*k).toFixed(1)}`;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.toFixed(0)}"><rect width="${W}" height="${H.toFixed(0)}" fill="#fafaf7"/>`;
  ORDER.map(id=>LY[id]).filter(l=>l&&l.st.on).forEach(l=>{const st=l.st;
    if(l.kind==='raster'){const r=l.render(st),b=r.bounds;s+=`<image href="${r.url}" x="${((b[0][1]*MX-x0)*k).toFixed(1)}" y="${((y1-b[1][0]*MY)*k).toFixed(1)}" width="${((b[1][1]-b[0][1])*MX*k).toFixed(1)}" height="${((b[1][0]-b[0][0])*MY*k).toFixed(1)}" opacity="${st.opacity}" preserveAspectRatio="none"/>`;return;}
    if(l.kind==='pt'){const sz=(+st.size||4)*W/1000,ic=st.shape==='icon'&&IC[st.icon||l.icon];l.data.forEach(d=>{const p=d.p||d,c=l.colorFn?l.colorFn(d,st)||st.color:st.color,[x,y]=P(p).split(' ');
        s+=st.shape==='square'?`<rect x="${x-sz}" y="${y-sz}" width="${2*sz}" height="${2*sz}" fill="${c}" opacity="${st.opacity}"/>`:`<circle cx="${x}" cy="${y}" r="${sz.toFixed(1)}" fill="${c}" stroke="#fff" stroke-width="${(sz/5).toFixed(2)}" opacity="${st.opacity}"/>`;
        if(ic&&sz>=4){const kk=sz*1.25/24;s+=`<path d="${IC[st.icon||l.icon]}" fill="#fff" fill-rule="evenodd" transform="translate(${(x-12*kk).toFixed(1)} ${(y-12*kk).toFixed(1)}) scale(${kk.toFixed(3)})"/>`;}});return;}
    l.data.forEach(f=>{const g=f.g||f,c=l.colorFn?l.colorFn(f,st)||st.color:st.color;if(!g.length)return;const d='M'+g.map(P).join('L');
      s+=l.kind==='line'?`<path d="${d}" fill="none" stroke="${c}" stroke-width="${(+st.size*W/1000).toFixed(2)}" opacity="${st.opacity}" stroke-linecap="round" stroke-linejoin="round"/>`:`<path d="${d}Z" fill="${c}" fill-opacity="${st.opacity}" stroke="${l.stroke||c}" stroke-width="${(+st.size*W/1000).toFixed(2)}"/>`;});});
  return {svg:s+'</svg>',W,H,legend:legendItems()};}
function legendItems(){const out=[];ORDER.map(id=>LY[id]).filter(l=>l&&l.st.on&&!l.noLegend).forEach(l=>{const p=l.legend?l.legend(l.st):null;if(p&&p.length)p.forEach(([c,t])=>out.push({col:c,label:l.name+': '+t,kind:'fill',on:true}));else out.push({col:l.st.color,label:l.name,kind:l.kind==='line'?'line':l.kind==='pt'?'dot':'fill',on:true});});return out;}
/* ---- uslublar ---- */
const css=document.createElement('style');css.textContent=`
.ulyP{position:absolute;left:52px;top:10px;z-index:650;width:296px;max-height:calc(100% - 90px);display:flex;flex-direction:column;background:rgba(255,255,255,.97);border:1px solid #dedcd7;box-shadow:0 6px 20px rgba(0,0,0,.07);font:13px Archivo,sans-serif}
.ulyP .uh{display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid #efede9}.ulyP .uh b{font-weight:500;letter-spacing:.12em;text-transform:uppercase;font-size:11.5px}.ulyP .uh button{border:0;background:none;font-size:11.5px;color:#696969;cursor:pointer}
.ulyP.min .ub{display:none}.ulyP .ub{overflow:auto;padding:2px 0 6px}
.ulyP .ug{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#8a877f;padding:8px 10px 2px}
.ulyP .ur{display:flex;align-items:center;padding:1px 6px 1px 8px}.ulyP .ur:hover{background:#f6f5f2}.ulyP .ur.op{background:#f1efea}
.ulyP .ur label{flex:1;display:flex;align-items:center;gap:7px;min-width:0;cursor:pointer;padding:3px 0}.ulyP .ur input{margin:0}
.ulyP .sw{width:12px;height:12px;flex:none;display:inline-block}.ulyP .nm{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ulyP .ct{font:11px 'IBM Plex Mono',monospace;color:#8a877f}
.ulyP .ur>button{border:0;background:none;color:#8a877f;cursor:pointer;font-size:13px;width:22px}
.ulyP .us{background:#f1efea;padding:4px 10px 8px 28px;display:flex;flex-direction:column;gap:5px}.ulyP .us label{display:grid;grid-template-columns:70px minmax(0,1fr) 36px;align-items:center;gap:6px;font-size:12px;color:#555}
.ulyP .us select{font:12px Archivo,sans-serif;border:1px solid #cfccc5;padding:1px 2px;grid-column:2/4}.ulyP .us input[type=color]{width:100%;height:20px;border:1px solid #cfccc5;padding:0;grid-column:2/4}.ulyP output{font:11px 'IBM Plex Mono',monospace;width:32px;text-align:right}
.ulyP .ui{display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:2px}.ulyP .ui button{border:1px solid #dedcd7;background:#fff;padding:2px;cursor:pointer;aspect-ratio:1}.ulyP .ui button[aria-pressed=true]{background:#141414;border-color:#141414}.ulyP .ui button[aria-pressed=true] svg{fill:#fff}.ulyP .ui svg{width:100%;height:100%;fill:#333}
.ulyP .un{font:11px/1.45 'IBM Plex Mono',monospace;color:#696969}
.ulyL{position:absolute;right:12px;bottom:28px;z-index:600;background:rgba(255,255,255,.95);border:1px solid #dedcd7;padding:6px 10px;font-size:12px;display:flex;flex-direction:column;gap:3px;max-width:420px;max-height:45%;overflow:auto}
.ulyL .lr{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}.ulyL .lt{color:#696969;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin-right:2px}.ulyL .li{display:inline-flex;align-items:center;gap:5px}.ulyL .li i{width:11px;height:11px;display:inline-block}
.uly-ras{image-rendering:auto}
@media (max-width:860px){.ulyP{width:220px;max-height:60%}}`;document.head.appendChild(css);
window.ULY={PAL,IC,LY,set,remove,clear,toSVG,legendItems,restyle,
  init(map,mapEl,cb){MAP=map;onChange=cb||onChange;PEL=document.createElement('div');PEL.className='ulyP';mapEl.appendChild(PEL);LEL=document.createElement('div');LEL.className='ulyL';LEL.hidden=true;mapEl.appendChild(LEL);bindPanel();renderPanel();},
  /* qiymat → rang (pogʻonali) */
  step(v,br,pal){let i=0;while(i<br.length&&v>br[i])i++;return pal[Math.min(i,pal.length-1)];},
  /* panjara kataklaridan silliq rastr */
  grid(cells,step,MX,MY,ring,colorOf){const la=cells.map(c=>c.p[0]),lo=cells.map(c=>c.p[1]);const a0=Math.min(...la)-step/MY/2,a1=Math.max(...la)+step/MY/2,o0=Math.min(...lo)-step/MX/2,o1=Math.max(...lo)+step/MX/2;
    const nx=Math.round((o1-o0)*MX/step),ny=Math.round((a1-a0)*MY/step),sm=document.createElement('canvas');sm.width=nx;sm.height=ny;const g=sm.getContext('2d');
    cells.forEach(c=>{const col=colorOf(c);if(!col)return;g.fillStyle=col;g.fillRect(Math.floor((c.p[1]-o0)*MX/step),Math.floor((a1-c.p[0])*MY/step),1,1);});
    const K=Math.max(2,Math.min(12,Math.floor(1600/Math.max(nx,ny)))),big=document.createElement('canvas');big.width=nx*K;big.height=ny*K;const G=big.getContext('2d');
    if(ring&&ring.length>2){G.beginPath();ring.forEach((p,i)=>{const x=(p[1]-o0)*MX/step*K,y=(a1-p[0])*MY/step*K;i?G.lineTo(x,y):G.moveTo(x,y);});G.closePath();G.clip();}
    G.imageSmoothingEnabled=true;G.imageSmoothingQuality='high';G.drawImage(sm,0,0,nx*K,ny*K);return {url:big.toDataURL('image/png'),bounds:[[a0,o0],[a1,o1]]};}
};
})();
