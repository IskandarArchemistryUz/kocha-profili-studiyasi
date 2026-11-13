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
  <button class="kt-btn" data-a="sat" title="Fon: sunʼiy yoʻldosh / xarita">Sunʼiy yoʻldosh</button>
  <button class="kt-btn" data-a="fun" title="Funksional ranglar (U)">Funksional</button><button class="kt-btn" data-a="chk" title="YHQ tekshiruvi">Tekshiruv<span class="kt-cnt" hidden></span></button><button class="kt-btn" data-a="file">Fayl</button><button class="kt-btn" data-a="3d">3D</button><button class="kt-btn ic" data-a="help" title="Qoʻllanma (?)" aria-label="Qoʻllanma">?</button></div>`);
const hint=el(`<div class="kt-ui kt-pn kt-hint" role="status"></div>`);
const dock=el(`<div class="kt-ui kt-dock"><div class="kt-pn kt-tray" hidden></div><div class="kt-pn kt-tools" role="toolbar" aria-label="Asboblar">${TOOLS.map(([k,n,key],i)=>`${i===1?'<span class="kt-sep"></span>':''}<button class="kt-tool" data-t="${k}" title="${n} (${key})">${IC[k]}${n}<span class="k">${key}</span></button>`).join('')}</div></div>`);
const card=el(`<div class="kt-ui kt-pn kt-card" hidden></div>`);
document.body.append(top,acts,hint,dock,card);
/* joy qidirish — studiyaning oʻz formasi (natijalar roʻyxati bilan) shu yerga koʻchiriladi */
{const f=document.getElementById('searchForm');if(f){f.classList.add('kt-q');f.querySelector('input').placeholder='Xaritada joy…';acts.querySelector('.kt-q-slot').replaceWith(f);const r=f.querySelector('#results');if(r)r.classList.add('res','kt-pn');}}
const tray=dock.querySelector('.kt-tray');

/* --- amallar --- */
acts.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.a==='undo')undo();else if(b.dataset.a==='redo')redo();else if(b.dataset.a==='3d')open3D();else if(b.dataset.a==='help')openHelp();else if(b.dataset.a==='file')toggleFile(b);else if(b.dataset.a==='chk')toggleChk(b);
  else if(b.dataset.a==='fun'){toggleDSty();try{localStorage.setItem('kt-dsty','1');}catch(e){}refresh();}
  else if(b.dataset.a==='sat'){setBase(/^img/.test(S.base||'')?'stil':'img');refresh();}});
dock.querySelector('.kt-tools').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;const k=b.dataset.t;
  if(k==='sim'){simTool();}else pickTool(k);refresh();});
/* qoʻllanma (?) — faqat shu sahifa uchun */
window.openHelp=function(){const m=document.getElementById('helpModal'),b=document.getElementById('helpBody');if(!m||!b)return;
  const K=(k,t)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0eee9"><span>${t}</span><kbd style="padding:1px 7px">${k}</kbd></div>`;
  b.innerHTML=`<div class="card" style="padding:14px"><b style="font-size:15px">Besh tugma</b><ol style="margin:8px 0 0;padding-left:18px;line-height:1.7">
    <li><b>Koʻcha</b> — pastdagi modulni tanlang, xaritada nuqtalarni bosing. Mavjud koʻcha yoki chorrahaga bossangiz — ulanadi.</li>
    <li><b>Polosa</b> — koʻcha boʻylab sudrang: oʻsha qismga polosa (karman) qoʻshiladi; Alt bilan — olib tashlanadi.</li>
    <li><b>Ulash</b> — kiruvchi polosa (●) → chiquvchi (○): ulagich qoʻshiladi yoki olib tashlanadi.</li>
    <li><b>Tanlash</b> — koʻcha yoki chorrahani bosing: sozlamalar yonidagi kartada (modul, turi, imtiyoz belgilari).</li>
    <li><b>Sinash</b> — harakat modeli: talab, svetofor, kechikish va navbat.</li></ol></div>
  <div class="card" style="padding:14px"><b style="font-size:15px">Tugmalar</b><div style="margin-top:6px">${K('V','Tanlash')}${K('S','Koʻcha')}${K('K','Polosa')}${K('J','Ulash')}${K('H','Sinash')}${K('Enter','Koʻchani tugatish')}${K('Esc','Bekor qilish')}${K('Delete','Tanlanganni oʻchirish')}${K('Ctrl+Z / Ctrl+Y','Orqaga / oldinga')}${K('U','Funksional ranglar')}</div></div>`;
  const h=document.getElementById('helpTitle');if(h)h.textContent='Tarmoq — qoʻllanma';m.hidden=false;};
/* eski oʻng tugma menyusi — yangi sahifada yoʻq (hamma narsa karta orqali) */
window.openMenu=function(){};

/* --- Fayl: nom, saqlash/ochish, eksport (PNG, SVG, DXF, GeoJSON, CSV), Albomga, yangi loyiha --- */
const fileP=el(`<div class="kt-ui kt-pn kt-card kt-file" hidden></div>`);document.body.append(fileP);
function toggleFile(btn){if(!fileP.hidden){fileP.hidden=true;return;}const ds=DS(),r=btn.getBoundingClientRect();
  fileP.innerHTML=`<button class="x" data-f="x" aria-label="Yopish">${IC.x}</button><span class="eb">FAYL</span>
    <div class="lbl">Loyiha nomi</div><input data-f="name" value="${esc(projName())}" style="height:36px;border:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #ebe8e2,0 2px 0 #e2dfd8;padding:0 12px;font:600 13px Archivo,sans-serif">
    <div class="row"><button class="kt-btn pr" data-f="save">Saqlash (.json)</button><label class="kt-btn" style="cursor:pointer">Ochish…<input type="file" accept=".json" data-f="open" hidden></label></div>
    <div class="lbl">Eksport</div><div class="row"><button class="kt-btn" data-f="png">PNG</button><button class="kt-btn" data-f="svg">SVG</button><button class="kt-btn" data-f="dxf">DXF</button><button class="kt-btn" data-f="dxfu">DXF (UTM)</button><button class="kt-btn" data-f="csv">Hisob (.csv)</button></div>
    <div class="row"><button class="kt-btn" data-f="alb">Chizmadon albomiga →</button></div>
    <div class="kt-note">DXF — qatlamlar bilan (ArchiCAD, AutoCAD, QGIS). Loyiha shu brauzerda avtomatik saqlanadi.</div>
    <div class="row"><span style="flex:1"></span><button class="kt-btn dg" data-f="clr">Yangi loyiha (tozalash)</button></div>`;
  fileP.hidden=false;fileP.style.left=Math.max(16,Math.min(innerWidth-fileP.offsetWidth-16,r.right-fileP.offsetWidth))+'px';fileP.style.top=(r.bottom+14)+'px';}
fileP.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b||b.tagName==='INPUT')return;const f=b.dataset.f,ds=DS();
  if(f==='x'){fileP.hidden=true;return;}
  if(f==='save')saveProjectFile();else if(f==='png')exportPNG(4,/^img/.test(S.base||''));else if(f==='svg')exportSVG(false);
  else if(f==='dxf')exportDXF('local');else if(f==='dxfu')exportDXF('utm');else if(f==='csv')exportCSV();else if(f==='alb')sendToMaket();
  else if(f==='clr'){ds.nodes=[];ds.segs=[];ds.signs=[];ds.shapes=[];ds.lines=[];ds.sel=null;ds.cmp=null;afterDesign();toast('Loyiha tozalandi. Ctrl+Z — qaytarish.',()=>undo(),'Qaytarish');fileP.hidden=true;}});
fileP.addEventListener('change',e=>{const t=e.target;if(t.dataset.f==='name'){DS().name=t.value.trim();save();return;}
  if(t.dataset.f==='open'){const f=t.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const j=JSON.parse(rd.result);if(!j.prof&&!j.design)throw 0;loadState(j);setApp('design');toast('Loyiha ochildi.');fileP.hidden=true;}catch(err){toast('Fayl oʻqilmadi: bu Koʻchasoz loyihasi emas.');}};rd.readAsText(f);t.value='';}});
document.addEventListener('pointerdown',e=>{if(!fileP.hidden&&!e.target.closest('.kt-file,[data-a="file"]'))fileP.hidden=true;});

/* --- Tekshiruv (YHQ): muammolar roʻyxati, xaritada raqamli belgilar, «Tuzatish» --- */
const chkP=el(`<div class="kt-ui kt-pn kt-card kt-chk" hidden></div>`);document.body.append(chkP);
function issues(){let ck={};try{ck=checkYHQ();}catch(e){}const out=[];ckOrder(ck).forEach(q=>{const c=ck[q.id];(c[2]||[]).forEach((it,i)=>out.push({rid:q.id,i,it,t:q.t,st:c[0]}));});return {ck,out};}
function chkHTML(){const {ck,out}=issues(),ds=DS();if(!ds.segs.length)return '<div class="kt-note">Hali koʻcha chizilmagan.</div>';
  const nok=Object.values(ck).filter(x=>x[0]==='ok').length;
  return (out.length?`<div class="kt-note" style="color:#b2342a;font-weight:600">${out.length} ta muammo — bosing, xaritada koʻrsatiladi</div>`:`<div class="kt-note" style="color:#2b7449;font-weight:600">${nok} ta qoida tekshirildi — muammo yoʻq</div>`)
    +out.map((x,n)=>{const sg=segById(x.it.id);return `<div class="kt-iss" data-iss="${x.rid}:${x.i}"><span class="n">${n+1}</span><span class="w"><b>${esc(x.t)}</b><br>${sg?esc(segTitle(sg))+' · ':''}${x.it.why}</span>${x.it.fix?`<button class="kt-btn pr" data-fix="${x.rid}:${x.i}" style="height:28px;padding:0 10px">Tuzatish</button>`:''}</div>`;}).join('')
    +`<div class="row" style="margin-top:4px"><button class="kt-btn" data-auto>Yoʻl belgilarini avtomatik qoʻyish</button></div><div class="kt-note">Qoida mazmuni YHQ ilovalari asosida umumlashtirilgan; band raqamini tasdiqlang. Faqat koʻcha kesimi va tugunlar tekshiriladi.</div>`;}
function drawChk(){chkP.innerHTML=`<button class="x" data-c="x" aria-label="Yopish">${IC.x}</button><span class="eb">TEKSHIRUV · YHQ</span>`+chkHTML();}
function toggleChk(btn){const ds=DS();if(!chkP.hidden){chkP.hidden=true;ds.itab='prop';ds.ckF=null;renderCheckMarks();refresh();return;}
  fileP.hidden=true;ds.itab='check';drawChk();chkP.hidden=false;renderCheckMarks();const r=btn.getBoundingClientRect();
  chkP.style.left=Math.max(16,Math.min(innerWidth-chkP.offsetWidth-16,r.right-chkP.offsetWidth))+'px';chkP.style.top=(r.bottom+14)+'px';}
chkP.addEventListener('click',e=>{const ds=DS();if(e.target.closest('[data-c="x"]')){chkP.hidden=true;ds.itab='prop';ds.ckF=null;renderCheckMarks();refresh();return;}
  const f=e.target.closest('[data-fix]');if(f){const [r1,i1]=f.dataset.fix.split(':');fixIssue(r1,+i1);drawChk();return;}
  if(e.target.closest('[data-auto]')){autoSigns();drawChk();return;}
  const it=e.target.closest('[data-iss]');if(it){const [r1,i1]=it.dataset.iss.split(':');pickTool('select');focusIssue(r1,+i1);chkP.querySelectorAll('.kt-iss').forEach(x=>x.classList.toggle('on',x===it));}});

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
  if(t==='xwalk')return `<span class="tx">Koʻchaning istalgan joyiga bosing — piyoda oʻtish joyi qoʻyiladi.</span><button class="kt-btn" data-back>Tayyor</button>`;
  if(t==='obj')return `<span class="tx">${esc((ATT[ds.attType||'bus']||{}).n||'Obyekt')}: koʻchaning kerakli tomoniga bosing.</span><button class="kt-btn" data-back>Tayyor</button>`;
  if(t==='sim')return `<span class="tx">Sinash uchun chorrahadagi <b style="color:#4c5bd4">▶</b> belgisini bosing.</span>`;
  return '';}
const SHORT={res1:'Mahalla',res:'Mahalla + turargoh',r2:'2 polosa',r2b:'2 + velo',r4:'4 polosa',r4b:'4 + velo',r4m:'4 + ajratuvchi',r4bus:'4 + avtobus',r6m:'6 + ajratuvchi',one1:'Bir tomonlama 1',one2:'Bir tomonlama 2',ped:'Piyoda koʻcha',boul:'Bulvar'};
function short(n,k){return SHORT[k]||n.slice(0,22);}
tray.addEventListener('click',e=>{if(e.target.closest('[data-back]')){pickTool('select');return;}const b=e.target.closest('[data-p]');if(!b)return;DS().preset=b.dataset.p;save();refresh();});
tray.addEventListener('change',e=>{if(e.target.dataset.more==null||!e.target.value)return;DS().preset=e.target.value;save();refresh();});

/* --- maslahat --- */
function hintText(t){const ds=DS(),nj=ds.nodes.filter(n=>JK.includes(nodeKind(n))).length;
  if(t==='draw')return D.start?'<b>Koʻcha.</b> Burilish nuqtalarini bosing · Enter yoki ikki marta bosish — tugatish · Esc — bekor':'<b>Koʻcha.</b> Boshlanish nuqtasini bosing. Mavjud koʻcha yoki chorrahaga bossangiz — ulanadi.';
  if(t==='lane')return '<b>Polosa.</b> Koʻcha boʻylab sudrang.';
  if(t==='conn')return nj?(typeof CN!=='undefined'&&CN.sel?'<b>Ulash.</b> Endi chiquvchi polosani (○) bosing.':'<b>Ulash.</b> Kiruvchi polosani (●) bosing · ulagichni bosib — Delete'):'<b>Ulash.</b> Avval chorraha hosil qiling: uchta koʻcha bir nuqtada uchrashsin.';
  if(t==='sim')return '<b>Sinash.</b> Chorrahani tanlang.';
  if(t==='xwalk')return '<b>Oʻtish joyi.</b> Koʻchaga bosing · Esc — tugatish';
  if(t==='obj')return '<b>Bekat.</b> Koʻchaning kerakli tomoniga bosing · Esc — tugatish';
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
      ${(()=>{const L2=issues().out.filter(x=>x.it.id===sg.id);return L2.length?`<div class="lbl" style="color:#b2342a">Tekshiruv · ${L2.length} ta muammo</div>${L2.map(x=>`<div class="kt-iss"><span class="n" style="background:#b2342a">!</span><span class="w">${x.it.why}</span>${x.it.fix?`<button class="kt-btn pr" data-fix="${x.rid}:${x.i}" style="height:28px;padding:0 10px">Tuzatish</button>`:''}</div>`).join('')}`:'';})()}
      ${apprHTML(sg)}
      <div class="lbl">Qoʻshish</div><div class="row"><button class="kt-btn" data-add="xwalk">Oʻtish joyi</button><button class="kt-btn" data-add="bus">Bekat</button><button class="kt-btn" data-add="bay">Choʻntakli bekat</button></div>
      <div class="row"><button class="kt-btn" data-k="kesim" title="Koʻcha kesimini B rejimida ochish">Kesim (B)</button><span style="flex:1"></span><button class="kt-btn dg" data-k="del">Oʻchirish</button></div>`;}
  if(sel.t==='att'||sel.t==='xw'){const sg=segById(sel.id);if(!sg)return null;const it=sel.t==='att'?(sg.att||[])[sel.i]:(sg.xw||[])[sel.i];if(!it)return null;
    anchor=()=>{const ll=segLL(sg);return midLL(ll);};
    const nm=sel.t==='xw'?'Piyoda oʻtish joyi':((ATT[it.type]||{}).n||'Obyekt');
    return `<span class="eb">${sel.t==='xw'?'OʻTISH JOYI':'KOʻCHA OBYEKTI'}</span><div class="ti">${esc(nm)}</div><div class="kt-note">Xaritada sudrab koʻchiring.</div><div class="row"><span style="flex:1"></span><button class="kt-btn dg" data-k="del">Oʻchirish</button></div>`;}
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
/* koʻchaning chorraha tomonidagi uchlari: karman (qoʻshimcha burilish polosasi) */
function endName(sg,k){const ll=segLL(sg),e=k==='a'?ll[0]:ll[ll.length-1],m=midLL(ll),dy=e[0]-m[0],dx=(e[1]-m[1])*Math.cos(e[0]*Math.PI/180),a=Math.atan2(dy,dx)*180/Math.PI;
  return (a>45&&a<=135?'Shimoliy':a>-45&&a<=45?'Sharqiy':a>-135&&a<=-45?'Janubiy':'Gʻarbiy')+' uchi';}
function apprCur(sg,k){const u=sg.appr&&sg.appr[k];if(u&&u.man)return {man:1,L:u.L|0,R:u.R|0,U:u.U||'none',Ls:+u.Ls||30,Lt:+u.Lt||15};
  const c=withVirtual(V=>endPieceOf(sg,k,V)._cfg)||{L:0,R:0,U:'none',Ls:30,Lt:15};return {man:0,L:c.L,R:c.R,U:c.U,Ls:Math.round(c.Ls),Lt:Math.round(c.Lt)};}
function apprHTML(sg){const ends=['a','b'].filter(k=>{const n=nodeById(k==='a'?sg.a:sg.b);return n&&isInter(nodeKind(n))&&nodeKind(n)!=='round';});if(!ends.length)return '';
  return ends.map(k=>{const c=apprCur(sg,k),ch=(key,v,t)=>`<button class="kt-pri${String(c[key])===String(v)?' on':''}" style="width:auto;padding:0 10px;font:600 12px Archivo,sans-serif" data-ap="${k}" data-apk="${key}" data-apv="${v}">${t}</button>`;
    return `<div class="lbl">Karman · ${esc(endName(sg,k))}</div>
    <div class="kt-seg" style="align-self:flex-start"><button data-apm="${k}" data-v="auto" class="${c.man?'':'on'}">Avto</button><button data-apm="${k}" data-v="man" class="${c.man?'on':''}">Qoʻlda</button></div>
    <div class="kt-arm"><span>Chapga burilish</span>${ch('L',0,'0')}${ch('L',1,'1')}${ch('L',2,'2')}</div>
    <div class="kt-arm"><span>Oʻngga burilish</span>${ch('R',0,'0')}${ch('R',1,'1')}</div>
    <div class="kt-arm"><span>Qayrilish</span>${ch('U','none','yoʻq')}${ch('U','lane','chapdan')}${ch('U','sep','alohida')}</div>
    <div class="kt-arm"><span>Uzunligi, m</span><input type="number" data-apn="${k}" data-apk="Ls" value="${c.Ls}" min="10" step="5" style="width:64px;height:30px;border:0;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #ebe8e2,0 1px 0 #e2dfd8;padding:0 8px;font:500 13px 'IBM Plex Mono',monospace"><span style="flex:0 0 auto" class="kt-mut kt-mono">+ ${c.Lt} m taper</span></div>`;}).join('')
    +`<div class="kt-note">Avto — polosa soni va burilishlarga qarab. Uzunlik — namuna: navbat uzunligi boʻyicha tasdiqlang.</div>`;}
function setAppr(sg,k,fn){const c=apprCur(sg,k);const u={man:1,L:c.L,R:c.R,U:c.U,Ls:c.Ls,Lt:c.Lt};fn(u);sg.appr=sg.appr||{};sg.appr[k]=u;if(sg.arr)delete sg.arr[k];afterDesign();}
function midLL(ll){let L=0;const d=[];for(let i=1;i<ll.length;i++){const s=map.distance(ll[i-1],ll[i]);d.push(s);L+=s;}let h=L/2;for(let i=0;i<d.length;i++){if(h<=d[i]){const t=h/(d[i]||1);return [ll[i][0]+(ll[i+1][0]-ll[i][0])*t,ll[i][1]+(ll[i+1][1]-ll[i][1])*t];}h-=d[i];}return ll[0];}
function placeCard(){if(card.hidden||!anchor)return;if(innerWidth<=760){card.style.left='';card.style.top='';return;}const ll=anchor();if(!ll)return;const p=map.latLngToContainerPoint(L.latLng(ll[0],ll[1])),r=map.getContainer().getBoundingClientRect();
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
  if(b.dataset.fix){const [r1,i1]=b.dataset.fix.split(':');fixIssue(r1,+i1);return;}
  if(b.dataset.add){const a=b.dataset.add;if(a==='xwalk')pickTool('xwalk');else{ds.attType=a;pickTool('obj');}return;}
  if(b.dataset.apm){const sg=segById(sel.id),k=b.dataset.apm;if(b.dataset.v==='auto'){if(sg.appr)delete sg.appr[k];if(sg.arr)delete sg.arr[k];afterDesign();}else setAppr(sg,k,()=>{});return;}
  if(b.dataset.ap){const sg=segById(sel.id);setAppr(sg,b.dataset.ap,u=>{const k2=b.dataset.apk;u[k2]=k2==='U'?b.dataset.apv:+b.dataset.apv;});return;}
  if(b.dataset.ty){const n=nodeById(sel.id),v=b.dataset.ty;n.type=v;if(v==='round'){const rt=RTYPES[n.rtype||ds.rtype||'r2'];n.rtype=n.rtype||ds.rtype||'r2';n.ri=n.ri||rt.ri;n.rw=n.rw||rt.rw;n.lanes=n.lanes||rt.lanes;}afterDesign();}});
card.addEventListener('change',e=>{const s=e.target;
  if(s.dataset.apn){const sg=segById(DS().sel.id),v=Math.max(10,+s.value||30);setAppr(sg,s.dataset.apn,u=>{u.Ls=v;});return;}
  if(s.dataset.k!=='pre'||!s.value)return;const sg=segById(DS().sel.id);if(!sg)return;
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
  const th=trayHTML(t);tray.hidden=!th;if(th&&tray.dataset.k!==t+':'+ds.preset+':'+(ds.attType||'')){tray.innerHTML=th;tray.dataset.k=t+':'+ds.preset+':'+(ds.attType||'');}if(!th)tray.dataset.k='';
  hint.innerHTML=hintText(t);
  acts.querySelector('[data-a="sat"]').classList.toggle('on',/^img/.test(S.base||''));
  acts.querySelector('[data-a="fun"]').classList.toggle('on',S.dsty==='line');
  {const n=issues().out.length,c=acts.querySelector('.kt-cnt');c.hidden=!n;c.textContent=n;if(!chkP.hidden)drawChk();}
  const sel=t==='select'&&!D.start&&chkP.hidden?ds.sel:null,h=sel&&cardHTML(sel);
  if(h){const k=JSON.stringify(sel)+'|'+(sel.t==='node'?JSON.stringify((nodeById(sel.id)||{}).pri||0)+(nodeById(sel.id)||{}).type:'')+'|'+(sel.t==='seg'?issues().out.filter(x=>x.it.id===sel.id).map(x=>x.rid+x.it.why).join()+(segById(sel.id)||{}).p+JSON.stringify((segById(sel.id)||{}).appr||0)+JSON.stringify(withVirtual(V=>['a','b'].map(k=>{const sg=segById(sel.id),p=sg&&endPieceOf(sg,k,V);return p&&p._cfg?[p._cfg.L,p._cfg.R,Math.round(p._cfg.Ls)]:0;}))):'');
    if(card.dataset.k!==k){card.innerHTML=`<button class="x" data-k="x" aria-label="Yopish">${IC.x}</button>`+h;card.dataset.k=k;}card.hidden=false;placeCard();}
  else{card.hidden=true;card.dataset.k='';anchor=null;}
  drawSigns();}
/* dvigatel chizgandan keyin — yangilaymiz (studiya funksiyalari global) */
{const rd=window.renderDesign;window.renderDesign=function(){const r=rd.apply(this,arguments);try{refresh();}catch(e){console.error(e);}return r;};
 const rh=window.renderHint;window.renderHint=function(){const r=rh.apply(this,arguments);try{hint.innerHTML=hintText(DS().tool||'select');}catch(e){}return r;};}
/* andoza chizma uslubi — funksional (och ranglar, B4); foydalanuvchi oʻzgartirsa — eslab qolinadi */
try{if(!localStorage.getItem('kt-dsty')){S.dsty='line';save();localStorage.setItem('kt-dsty','1');}}catch(e){}
if(S.app!=='design')setApp('design');
if(!DS().tool)DS().tool='select';
renderDesign();
})();
