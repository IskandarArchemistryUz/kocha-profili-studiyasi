/* =====================================================================
   Koʻchasoz · Tarmoq (tarmoq.html) — yangi interfeys, noldan (14.11.2026)
   Iskandar: «yangi yondoshuv, ortiqcha chalgʻituvchi elementlardan ozod».
   Dvigatel — studiyaniki (js/app.js: geometriya, polosalar, ulagichlar, harakat
   modeli), uning eski interfeysi yashirin (css/kt.css). Bu fayl faqat:
     · pastki dok: Tanlash · Koʻcha · Polosa · Ulash · Sinash
     · dok ustida asbob sozlamasi (koʻcha moduli)
     · bosilgan narsa yonida bitta karta (koʻcha yoki chorraha)
     · yuqorida bitta qator maslahat
   ===================================================================== */
(function(){
if(!document.body.classList.contains('kt'))return;
const SV=(d,w=22)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={
  select:SV('<path d="M5 4l13 6-5.5 1.8L10.5 17z"/>'),
  draw:SV('<path d="M5 21 9 3M19 21 15 3"/><path d="M12 5v2M12 11v2M12 17v2"/>'),
  lane:SV('<path d="M4 21V3M10 21V3M20 21V9"/><path d="M15 21V9l5-6"/>'),
  conn:SV('<circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M6 15.5C6 10 12 8 15.6 7"/>'),
  sim:SV('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
  undo:SV('<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-2"/>',18),
  redo:SV('<path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h2"/>',18),
  x:SV('<path d="M6 6l12 12M18 6 6 18"/>',16),
};
const LOGO=(document.querySelector('.brand .logo')||{}).outerHTML||'';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TOOLS=[['select','Tanlash','V'],['draw','Koʻcha','S'],['lane','Polosa','K'],['conn','Ulash','J'],['sim','Sinash','H']];
const COMMON=['res1','res','r2','r2b','r4','r4b','r4bus','r6m','one2','ped','boul'];
const JK=['x','sig','round'];

/* --- DOM --- */
const el=(h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstElementChild;};
const top=el(`<div class="kt-ui kt-pn kt-top"><a class="lg" href="app/" title="Archemistry Lab">${LOGO.replace('class="logo"','width="22" height="21"')}Archemistry Lab</a><span class="kt-badge"><i></i>Koʻchasoz</span>
  <nav class="kt-seg" aria-label="Koʻchasoz rejimlari"><span class="on"><b class="kt-mono">A</b>Tarmoq<span class="kt-tag">beta</span></span><a href="app/kochasoz.html#/b"><b class="kt-mono">B</b>Kesim</a><a href="app/kochasoz.html#/c"><b class="kt-mono">C</b>Chorraha<span class="kt-tag">beta</span></a></nav></div>`);
const acts=el(`<div class="kt-ui kt-pn kt-acts"><span class="kt-q-slot"></span>
  <button class="kt-btn ic" data-a="undo" title="Orqaga (Ctrl+Z)" aria-label="Orqaga">${IC.undo}</button><button class="kt-btn ic" data-a="redo" title="Oldinga (Ctrl+Y)" aria-label="Oldinga">${IC.redo}</button>
  <div class="kt-seg" role="group" aria-label="Fon"><button data-b="stil">Xarita</button><button data-b="img">Sunʼiy yoʻldosh</button></div>
  <button class="kt-btn" data-a="fun" title="Funksional ranglar (U)">Funksional</button><button class="kt-btn" data-a="3d">3D</button></div>`);
const hint=el(`<div class="kt-ui kt-pn kt-hint" role="status"></div>`);
const dock=el(`<div class="kt-ui kt-dock"><div class="kt-pn kt-tray" hidden></div><div class="kt-pn kt-tools" role="toolbar" aria-label="Asboblar">${TOOLS.map(([k,n,key],i)=>`${i===1?'<span class="kt-sep"></span>':''}<button class="kt-tool" data-t="${k}" title="${n} (${key})">${IC[k]}${n}<span class="k">${key}</span></button>`).join('')}</div></div>`);
const card=el(`<div class="kt-ui kt-pn kt-card" hidden></div>`);
document.body.append(top,acts,hint,dock,card);
/* joy qidirish — studiyaning oʻz formasi (natijalar roʻyxati bilan) shu yerga koʻchiriladi */
{const f=document.getElementById('searchForm');if(f){f.classList.add('kt-q');f.querySelector('input').placeholder='Xaritada joy…';acts.querySelector('.kt-q-slot').replaceWith(f);const r=f.querySelector('#results');if(r)r.classList.add('res','kt-pn');}}
const tray=dock.querySelector('.kt-tray');

/* --- amallar --- */
acts.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.a==='undo')undo();else if(b.dataset.a==='redo')redo();else if(b.dataset.a==='3d')open3D();
  else if(b.dataset.a==='fun'){toggleDSty();refresh();}
  else if(b.dataset.b){setBase(b.dataset.b);refresh();}});
dock.querySelector('.kt-tools').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;const k=b.dataset.t;
  if(k==='sim'){simTool();}else pickTool(k);refresh();});
/* eski oʻng tugma menyusi — yangi sahifada yoʻq (hamma narsa karta orqali) */
window.openMenu=function(){};

/* --- koʻcha moduli (Koʻcha asbobi) --- */
function trayHTML(t){const ds=DS();
  if(t==='draw'){const cur=ds.preset;
    const chips=COMMON.filter(k=>PRESETS[k]).map(k=>{let w='',n=0;try{const L=stripsLayout(k);w=L.W.toFixed(0);n=L.lanes;}catch(e){}
      return `<button class="kt-prof${cur===k?' on':''}" data-p="${k}" title="${esc(PRESETS[k].n)}"><span style="width:72px">${stripSVG(k,12)}</span><span class="nm">${esc(short(PRESETS[k].n,k))}</span><span class="mt">${w} m${n?' · '+n+' pol.':''}</span></button>`;}).join('');
    const groups={};Object.entries(PRESETS).forEach(([k,v])=>{if(k==='custom')return;(groups[v.g]=groups[v.g]||[]).push([k,v.n]);});
    const more=`<select class="kt-more" data-more aria-label="Boshqa modullar"><option value="">Boshqa…</option>${Object.entries(groups).map(([g,it])=>`<optgroup label="${esc(g)}">${it.map(([k,n])=>`<option value="${k}"${!COMMON.includes(k)&&k===cur?' selected':''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')}</select>`;
    return chips+more;}
  if(t==='lane')return `<span class="tx">Koʻcha boʻylab sudrang — oʻsha qismga polosa qoʻshiladi (karman). <b>Alt</b> bilan — olib tashlanadi.</span>`;
  if(t==='conn')return `<span class="tx"><b style="color:#4c5bd4">●</b> kiruvchi → <b>○</b> chiquvchi polosa · rang: <b style="color:#4c5bd4">chap</b> · <b>toʻgʻri</b> · <b style="color:#2b7449">oʻng</b></span>`;
  if(t==='sim')return `<span class="tx">Sinash uchun chorrahadagi <b style="color:#4c5bd4">▶</b> belgisini bosing.</span>`;
  return '';}
const SHORT={res1:'Mahalla',res:'Mahalla + turargoh',r2:'2 polosa',r2b:'2 + velo',r4:'4 polosa',r4b:'4 + velo',r4m:'4 + ajratuvchi',r4bus:'4 + avtobus',r6m:'6 + ajratuvchi',one1:'Bir tomonlama 1',one2:'Bir tomonlama 2',ped:'Piyoda koʻcha',boul:'Bulvar'};
function short(n,k){return SHORT[k]||n.slice(0,22);}
tray.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b)return;DS().preset=b.dataset.p;save();refresh();});
tray.addEventListener('change',e=>{if(e.target.dataset.more==null||!e.target.value)return;DS().preset=e.target.value;save();refresh();});

/* --- maslahat --- */
function hintText(t){const ds=DS(),nj=ds.nodes.filter(n=>JK.includes(nodeKind(n))).length;
  if(t==='draw')return D.start?'<b>Koʻcha.</b> Burilish nuqtalarini bosing · Enter yoki ikki marta bosish — tugatish · Esc — bekor':'<b>Koʻcha.</b> Boshlanish nuqtasini bosing. Mavjud koʻcha yoki chorrahaga bossangiz — ulanadi.';
  if(t==='lane')return '<b>Polosa.</b> Koʻcha boʻylab sudrang.';
  if(t==='conn')return nj?(typeof CN!=='undefined'&&CN.sel?'<b>Ulash.</b> Endi chiquvchi polosani (○) bosing.':'<b>Ulash.</b> Kiruvchi polosani (●) bosing · ulagichni bosib — Delete'):'<b>Ulash.</b> Avval chorraha hosil qiling: uchta koʻcha bir nuqtada uchrashsin.';
  if(t==='sim')return '<b>Sinash.</b> Chorrahani tanlang.';
  if(!ds.segs.length)return '<b>Boshlash:</b> pastdagi «Koʻcha» (S) — xaritada koʻcha chizing.';
  return ds.sel?'<b>Tanlangan.</b> Sozlamalar yonidagi kartada · Delete — oʻchirish · Esc — bekor':'<b>Tanlash.</b> Koʻcha yoki chorrahani bosing.';}

/* --- tanlangan narsa kartasi --- */
const PRI_N={main:'Asosiy yoʻl (2.1)',yield:'Yoʻl bering (2.4)',stop:'Toʻxtash (2.5)'};
function glyph(v,s=20){
  if(v==='main')return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="#f0b323" stroke="#fff" stroke-width="2.4"/><rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="none" stroke="#3a3936" stroke-width=".8"/></svg>`;
  if(v==='stop')return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="#c8312a" stroke="#fff" stroke-width="1.6"/><text x="12" y="14.6" text-anchor="middle" font-size="6.6" font-weight="700" fill="#fff" font-family="Archivo,sans-serif">STOP</text></svg>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M2.5 4h19L12 21z" fill="#fff" stroke="#c8312a" stroke-width="2.6" stroke-linejoin="round"/></svg>`;}
function armLabel(e){if(e.name)return e.name;const o=[-e.hin[0],-e.hin[1]],a=Math.atan2(o[1],o[0])*180/Math.PI;return (a>45&&a<=135?'Shimoliy':a>-45&&a<=45?'Sharqiy':a>-135&&a<=-45?'Janubiy':'Gʻarbiy')+' kirish';}
let anchor=null;
function cardHTML(sel){const ds=DS();
  if(sel.t==='seg'){const sg=segById(sel.id);if(!sg)return null;let lay=null;try{lay=layOf(sg);}catch(e){}
    anchor=()=>{const ll=segLL(sg);return ll[Math.floor((ll.length-1)/2)]&&midLL(ll);};
    const groups={};Object.entries(PRESETS).forEach(([k,v])=>{if(k==='custom')return;(groups[v.g]=groups[v.g]||[]).push([k,v.n]);});
    return `<span class="eb">KOʻCHA</span><div class="ti">${esc(sg.name||(sg.st?'Tahrirlangan kesim':PRESETS[sg.p]?.n||'Koʻcha'))}</div>
      ${lay?`<div class="kt-mut">Eni <b class="kt-mono" style="color:#141414">${lay.W.toFixed(1).replace('.',',')} m</b> · ${lay.lanes} polosa</div>`:''}
      <div class="lbl">Modul</div><select data-k="pre">${sg.st?'<option value="" selected>Tahrirlangan</option>':''}${Object.entries(groups).map(([g,it])=>`<optgroup label="${esc(g)}">${it.map(([k,n])=>`<option value="${k}"${!sg.st&&sg.p===k?' selected':''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')}</select>
      <div class="row"><button class="kt-btn" data-k="kesim" title="Koʻcha kesimini B rejimida ochish">Kesim (B)</button><span style="flex:1"></span><button class="kt-btn dg" data-k="del">Oʻchirish</button></div>`;}
  if(sel.t==='node'){const n=nodeById(sel.id);if(!n)return null;const k=nodeKind(n);anchor=()=>n.ll;
    if(!JK.includes(k))return `<span class="eb">TUGUN</span><div class="ti">${k==='end'?'Koʻcha uchi':'Burilish nuqtasi'}</div><div class="row"><span style="flex:1"></span><button class="kt-btn dg" data-k="del">Oʻchirish</button></div>`;
    const J=JNET.get(n.id),arms=J?J.E.filter(e=>e.lanes.length):[],names=[...new Set((J?J.E:[]).map(e=>e.name).filter(Boolean))];
    const ty=[['x','Belgisiz'],['sig','Svetofor'],['round','Halqa']].map(([v,t])=>`<button data-ty="${v}" class="${k===v?'on':''}">${t}</button>`).join('');
    const pri=k==='x'&&arms.length?`<div class="lbl">Imtiyoz belgilari${n.pri?'':' · hozir YHQ: oʻngdan kelayotganga yoʻl beriladi'}</div>
      ${arms.map(e=>{const cur=n.pri?priOf(n,e.key):null;return `<div class="kt-arm"><span title="${esc(armLabel(e))}">${esc(armLabel(e))}</span>${['main','yield','stop'].map(v=>`<button class="kt-pri${cur===v?' on':''}" data-pk="${esc(e.key)}" data-pv="${v}" title="${PRI_N[v]}">${glyph(v,18)}</button>`).join('')}</div>`;}).join('')}
      ${n.pri?'<button class="kt-btn" data-k="prir" style="align-self:flex-start">YHQ andozasiga qaytarish</button>':'<div class="kt-note">Bitta yon koʻchaga «Yoʻl bering» qoʻysangiz, qolganlari asosiy yoʻl boʻladi.</div>'}`:'';
    return `<span class="eb">CHORRAHA</span><div class="ti">${esc(names.length?names.slice(0,3).join(' × '):'Chorraha')}</div>
      <div class="kt-seg" role="group" aria-label="Turi" style="align-self:flex-start">${ty}</div>${pri}
      <div class="row"><button class="kt-btn pr" data-k="sim">▶ Harakatni sinash</button><span style="flex:1"></span><button class="kt-btn dg" data-k="del">Oʻchirish</button></div>`;}
  return null;}
function midLL(ll){let L=0;const d=[];for(let i=1;i<ll.length;i++){const s=map.distance(ll[i-1],ll[i]);d.push(s);L+=s;}let h=L/2;for(let i=0;i<d.length;i++){if(h<=d[i]){const t=h/(d[i]||1);return [ll[i][0]+(ll[i+1][0]-ll[i][0])*t,ll[i][1]+(ll[i+1][1]-ll[i][1])*t];}h-=d[i];}return ll[0];}
function placeCard(){if(card.hidden||!anchor)return;const ll=anchor();if(!ll)return;const p=map.latLngToContainerPoint(L.latLng(ll[0],ll[1])),r=map.getContainer().getBoundingClientRect();
  const W=card.offsetWidth,H=card.offsetHeight;let x=r.left+p.x+28,y=r.top+p.y-H/2;
  if(x+W>innerWidth-16)x=r.left+p.x-28-W;x=Math.max(16,Math.min(innerWidth-W-16,x));y=Math.max(76,Math.min(innerHeight-H-100,y));
  card.style.left=x+'px';card.style.top=y+'px';}
card.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ds=DS(),sel=ds.sel;if(!sel)return;
  if(b.dataset.k==='x'){ds.sel=null;afterDesign();return;}
  if(b.dataset.k==='del'){delSel();return;}
  if(b.dataset.k==='sim'){openSim(sel.id);return;}
  if(b.dataset.k==='kesim'){location.href='app/kochasoz.html#/b';return;}
  if(b.dataset.k==='prir'){setPri(sel.id,null);return;}
  if(b.dataset.pk){setPri(sel.id,b.dataset.pk,b.dataset.pv);return;}
  if(b.dataset.ty){const n=nodeById(sel.id),v=b.dataset.ty;n.type=v;if(v==='round'){const rt=RTYPES[n.rtype||ds.rtype||'r2'];n.rtype=n.rtype||ds.rtype||'r2';n.ri=n.ri||rt.ri;n.rw=n.rw||rt.rw;n.lanes=n.lanes||rt.lanes;}afterDesign();}});
card.addEventListener('change',e=>{const s=e.target;if(s.dataset.k!=='pre'||!s.value)return;const sg=segById(DS().sel.id);if(!sg)return;
  sg.p=s.value;delete sg.st;delete sg.off;delete sg.shift;delete sg.arr;delete sg.appr;delete sg.mk;DS().sel.strip=null;afterDesign();});
map.on('move zoom resize',placeCard);addEventListener('resize',placeCard);

/* --- xaritadagi imtiyoz belgilari (belgili chorrahalar; tanlanganda — barcha kirishlarda) --- */
const signL=L.layerGroup().addTo(map);
function drawSigns(){signL.clearLayers();const ds=DS();if(S.app!=='design')return;
  JNET.forEach((J,nid)=>{const n=nodeById(nid);if(!n||J.sig||J.ring)return;const sel=ds.tool==='select'&&ds.sel&&ds.sel.t==='node'&&ds.sel.id===nid;if(!n.pri&&!sel)return;
    J.E.forEach(e=>{if(!e.lanes.length)return;const l=e.lanes[e.lanes.length-1],r=[e.hin[1],-e.hin[0]],P=[l.P[0]+r[0]*3.6-e.hin[0]*4,l.P[1]+r[1]*3.6-e.hin[1]*4],v=priOf(n,e.key);
      const mk=L.marker(toLL(P,J.o),{interactive:true,keyboard:false,zIndexOffset:1800,icon:L.divIcon({className:'',iconSize:null,html:`<div class="kt-sign" title="${v?PRI_N[v]+' — bosib almashtiring':'Belgi qoʻyish'}" style="opacity:${v?1:.7}">${v?glyph(v,22):'<b style="color:#4c5bd4">+</b>'}</div>`})}).addTo(signL);
      mk.on('click',ev=>{L.DomEvent.stop(ev);setPri(nid,e.key,v?{main:'yield',yield:'stop',stop:'main'}[v]:'yield');});});});}

/* --- yangilash --- */
function refresh(){const ds=DS(),t=ds.tool||'select';
  document.body.classList.remove('ks2');document.body.classList.toggle('kt-sim',t==='sim');
  dock.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  const th=trayHTML(t);tray.hidden=!th;if(th&&tray.dataset.k!==t+':'+ds.preset){tray.innerHTML=th;tray.dataset.k=t+':'+ds.preset;}if(!th)tray.dataset.k='';
  hint.innerHTML=hintText(t);
  const sat=/^img/.test(S.base||'');acts.querySelectorAll('[data-b]').forEach(b=>b.classList.toggle('on',(b.dataset.b==='img')===sat));
  acts.querySelector('[data-a="fun"]').classList.toggle('on',S.dsty==='line');
  const sel=t==='select'&&!D.start?ds.sel:null,h=sel&&cardHTML(sel);
  if(h){const k=JSON.stringify(sel)+'|'+(sel.t==='node'?JSON.stringify((nodeById(sel.id)||{}).pri||0)+(nodeById(sel.id)||{}).type:'')+'|'+(sel.t==='seg'?(segById(sel.id)||{}).p:'');
    if(card.dataset.k!==k){card.innerHTML=`<button class="x" data-k="x" aria-label="Yopish">${IC.x}</button>`+h;card.dataset.k=k;}card.hidden=false;placeCard();}
  else{card.hidden=true;card.dataset.k='';anchor=null;}
  drawSigns();}
/* dvigatel chizgandan keyin — yangilaymiz (studiya funksiyalari global) */
{const rd=window.renderDesign;window.renderDesign=function(){const r=rd.apply(this,arguments);try{refresh();}catch(e){console.error(e);}return r;};
 const rh=window.renderHint;window.renderHint=function(){const r=rh.apply(this,arguments);try{hint.innerHTML=hintText(DS().tool||'select');}catch(e){}return r;};}
if(S.app!=='design')setApp('design');
if(!DS().tool)DS().tool='select';
renderDesign();
})();
