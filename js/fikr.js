/* Archemistry Lab — fikr-mulohaza, xato haqida xabar, egasi rejimi, tashrif statistikasi.
   (27.10.2026: beta davri yopildi — donat, sariq qator va soʻrovnoma kodi bilan yuklash cheklovi olib tashlandi; pullik qism — tanga, ilovada.)
   Sozlash: faqat quyidagi CFG qiymatlarini toʻldiring. Boʻsh qolgan tugma koʻrinmaydi. */
(function(){
var CFG={
  owner:'d334a182444e562a7b7793445d07de9716924308b1887db6b15452f719ab5560', // egasi kaliti (SHA-256)
  tg:'https://t.me/+OGltk-ZVMVQ3NzBi',            // fikr-mulohaza guruhi
  form:'https://forms.gle/7rrP3FyPdUSa6ULC9',          // Google Form havolasi
  goat:'archemistry'           // GoatCounter kodi, masalan: 'archemistry' (archemistry.goatcounter.com)
};
window.KPS_FIKR=CFG;
var ERR=[];try{ERR=JSON.parse(sessionStorage.getItem('kps_errs')||'[]');}catch(e){}
function keep(m){ERR.push({t:new Date().toISOString().slice(11,19),m:String(m).slice(0,300),p:location.pathname.split('/').pop()+location.hash});ERR=ERR.slice(-8);try{sessionStorage.setItem('kps_errs',JSON.stringify(ERR));}catch(e){}var d=document.getElementById('kbDot');if(d)d.hidden=false;}
window.addEventListener('error',function(e){keep((e.message||'xato')+(e.filename?' @'+e.filename.split('/').pop()+':'+e.lineno:''));});
window.addEventListener('unhandledrejection',function(e){keep('promise: '+(e.reason&&e.reason.message||e.reason));});
function info(){var n=navigator;return ['Sahifa: '+location.href,'Til: '+(localStorage.getItem('kps_lang')||'uz'),'Brauzer: '+n.userAgent,'Ekran: '+screen.width+'×'+screen.height+' · oyna '+innerWidth+'×'+innerHeight,'Vaqt: '+new Date().toLocaleString()].concat(ERR.length?['Xatolar:'].concat(ERR.map(function(x){return '  '+x.t+' '+x.p+' — '+x.m;})):['Xatolar: yoʻq']).join('\n');}
function css(){var s=document.createElement('style');s.textContent=
'#kbBtn{position:fixed;right:16px;bottom:16px;z-index:9000;height:36px;padding:0 14px;border-radius:18px;border:1px solid #141414;background:#141414;color:#f4f3ef;font:500 12px/34px "IBM Plex Mono",monospace;letter-spacing:.06em;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.18)}'+
'#kbBtn.c{right:12px;bottom:12px;width:34px;height:34px;padding:0;font:600 16px/32px Archivo,sans-serif;opacity:.82}#kbBtn.c:hover{opacity:1}#kbBtn.c #kbDot{position:absolute;top:2px;right:2px;margin:0}#kbBtn:hover{background:#2b2b2b}#kbDot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#e5484d;margin-left:7px;vertical-align:1px}#kbDot[hidden]{display:none}'+
'#kbPn{position:fixed;right:16px;bottom:60px;z-index:9001;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 90px);overflow:auto;background:#fbfaf7;color:#141414;border:1px solid #141414;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.2);font:13px/1.45 "IBM Plex Sans",system-ui,sans-serif}'+
'#kbPn[hidden]{display:none}#kbPn .h{padding:14px 16px 10px;border-bottom:1px solid #e3e0d8}#kbPn .h b{font:600 15px "Archivo",sans-serif}#kbPn .tag{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:9px;background:#f0b429;font:500 10px "IBM Plex Mono",monospace;vertical-align:2px}'+
'#kbPn .s{padding:12px 16px;border-bottom:1px solid #e3e0d8}#kbPn .s:last-child{border-bottom:0}#kbPn .l{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:#6b6862;margin-bottom:6px}'+
'#kbPn a.b,#kbPn button.b{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:8px 10px;border:1px solid #141414;border-radius:6px;background:#fff;color:#141414;text-decoration:none;text-align:left;font:500 13px "IBM Plex Sans",sans-serif;cursor:pointer}'+
'#kbPn a.b:hover,#kbPn button.b:hover{background:#f0eee8}#kbPn .b.k{background:#f0b429;border-color:#f0b429}#kbPn .b.k:hover{background:#e5a91d}#kbPn textarea{width:100%;box-sizing:border-box;height:84px;margin-top:6px;padding:8px;border:1px solid #cfcac0;border-radius:6px;font:12px "IBM Plex Mono",monospace;resize:vertical}'+
'#kbPn .am{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#kbPn .am span{padding:4px 9px;border:1px solid #cfcac0;border-radius:12px;font:500 12px "IBM Plex Mono",monospace;background:#fff}#kbPn .cd{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:10px;padding:10px;border:1px dashed #141414;border-radius:8px;background:#fff}#kbPn .cd .b{width:auto;margin:0;flex:none}#kbPn .cn{font:600 15px "IBM Plex Mono",monospace;letter-spacing:.04em}'+
'#kbToast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9400;background:#141414;color:#f4f3ef;padding:8px 14px;border-radius:8px;font:13px "IBM Plex Sans",sans-serif}'+
'#kbPn .n{color:#6b6862;font-size:12px;margin-top:6px}#kbPn .x{float:right;border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#6b6862}'+
'@media print{#kbBtn,#kbPn{display:none!important}}';document.head.appendChild(s);}
function ui(){css();
  /* sahifaning oʻz «Fikr» tugmasi boʻlsa ([data-kb-own]) — suzuvchi tugma chiqmaydi; panel KPS_openPanel() orqali ochiladi */
  var own=!!document.querySelector('[data-kb-own]');
  var home=/(^|\/)(index\.html)?$/.test(location.pathname);var b=document.createElement('button');b.id='kbBtn';b.type='button';b.title='Fikr bildirish · xato haqida xabar';if(!home)b.className='c';b.setAttribute('aria-label',L('Fikr bildirish'));b.innerHTML=(home?L('Fikr bildirish'):'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>')+'<span id="kbDot"'+(ERR.length?'':' hidden')+'></span>';if(own)b.hidden=true;document.body.appendChild(b);
  var p=document.createElement('div');p.id='kbPn';p.hidden=true;
  p.innerHTML='<div class="h"><button class="x" id="kbX" aria-label="Yopish"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><b>'+L('Fikr bildirish')+'</b><div class="n">'+L('Xato topsangiz yoki gʻoyangiz boʻlsa — yozing, tez tuzatamiz.')+'</div></div>'+
   '<div class="s"><div class="l">'+L('Fikr va taklif')+'</div><textarea id="kbTxt" placeholder="'+L('Nima yoqdi, nima yetishmayapti, nima noqulay?')+'"></textarea>'+
   (CFG.tg?'<button class="b" id="kbTg">'+L('Telegramda yuborish')+'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-left:6px"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>':'')+(CFG.form?'<a class="b" href="'+CFG.form+'" target="_blank" rel="noopener">'+L('Batafsil soʻrovnoma (Google Form)')+'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-left:6px"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>':'')+
   '<button class="b" id="kbCp">'+L('Matnni nusxalash')+'</button></div>'+
   '<div class="s"><div class="l">'+L('Xato haqida xabar')+'</div><div class="n">'+L('Tugma sahifa, brauzer va soʻnggi xatolar haqidagi texnik maʼlumotni matnga qoʻshadi — shaxsiy maʼlumot yuborilmaydi.')+'</div><button class="b" id="kbBug">'+L('Xato maʼlumotini qoʻshish')+'</button></div>'+
   '';
  document.body.appendChild(p);
  var T=function(){return document.getElementById('kbTxt');};
  b.onclick=function(){p.hidden=!p.hidden;};document.getElementById('kbX').onclick=function(){p.hidden=true;};
  function copy(t,ok){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(ok,function(){T().select();try{document.execCommand('copy');}catch(e){}ok();});}
  document.getElementById('kbBug').onclick=function(){var t=T();if(t.value.indexOf('Sahifa: ')<0)t.value=(t.value?t.value+'\n\n':'Nima qildim va nima boʻldi: \n\n')+'— texnik —\n'+info();t.focus();};
  document.getElementById('kbCp').onclick=function(){var x=this;copy(T().value||info(),function(){x.textContent='Nusxalandi ✓';setTimeout(function(){x.textContent='Matnni nusxalash';},1800);});};
  window.KPS_openPanel=function(sec){p.hidden=false;var el=sec&&document.getElementById(sec);if(el)el.scrollIntoView({block:'nearest'});};
  var tg=document.getElementById('kbTg');if(tg)tg.onclick=function(){copy(T().value||info(),function(){window.open(CFG.tg,'_blank','noopener');});tg.textContent='Matn nusxalandi — Telegramda joylang (Ctrl+V)';};
}
/* ---- egasi rejimi («?egasi=…» havolasi) ---- */
function isOwner(){try{return localStorage.getItem('kps_owner')==='1';}catch(e){return false;}}
(function(){var m=/[?&]egasi=([^&#]+)/.exec(location.search);if(!m)return;var k=decodeURIComponent(m[1]);
  if(k==='off'){try{localStorage.removeItem('kps_owner');}catch(e){}return;}
  if(!(window.crypto&&crypto.subtle))return;crypto.subtle.digest('SHA-256',new TextEncoder().encode(k)).then(function(h){var x=Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    if(x===CFG.owner){try{localStorage.setItem('kps_owner','1');}catch(e){}toast(L('Egasi rejimi yoqildi.'));history.replaceState(null,'',location.pathname+location.hash);}});})();
function L(t){return window.kpsT?kpsT(t):window.ALT?ALT(t):t;}
function toast(t){var d=document.getElementById('kbToast');if(!d){d=document.createElement('div');d.id='kbToast';document.body.appendChild(d);}d.textContent=t;clearTimeout(d._t);d._t=setTimeout(function(){d.remove();},3200);}
if(CFG.goat){var g=document.createElement('script');g.async=true;g.dataset.goatcounter='https://'+CFG.goat+'.goatcounter.com/count';g.src='https://gc.zgo.at/count.js';document.head.appendChild(g);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
})();
/* Loyiha rejimi: sahifa loyiha.html ichida (iframe) ochilganda — bosh sahifa havolasi va
   fikr tugmasi yashiriladi, boshqa boʻlimlarga havolalar loyiha oynasida qadam sifatida ochiladi. */
(function(){
var inShell=false;try{inShell=window.parent!==window&&/loyiha\.html$/.test(window.parent.location.pathname);}catch(e){}
if(!inShell)return;
document.documentElement.classList.add('kps-embed');
var st=document.createElement('style');
st.textContent='html.kps-embed header .brand,html.kps-embed header .crumb,html.kps-embed #brandCrumb,html.kps-embed #kbBtn,html.kps-embed #kbPn,html.kps-embed #kpsLang{display:none!important}';
document.head.appendChild(st);
var PAGES=['index.html','studio.html','ai.html','posadka.html','masterreja.html','data.html','shamol.html','gis.html'];
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
  var u;try{u=new URL(a.getAttribute('href'),location.href);}catch(x){return;}
  if(u.origin!==location.origin)return;
  var p=u.pathname.split('/').pop()||'index.html';if(PAGES.indexOf(p)<0)return;
  if(p===(location.pathname.split('/').pop()||'index.html')&&u.hash&&u.search===location.search)return; // sahifa ichidagi langar
  e.preventDefault();e.stopPropagation();
  window.parent.postMessage({kps:'go',href:p+u.search+u.hash},location.origin);
},true);
})();
/* Telefon va planshet: sahifa nomi html[data-page] da, moslashuv uslublari css/mobile.css da.
   Xaritali boʻlimlarda telefonda panel pastdan ochiladi, pastki qatordagi tugmalar bilan almashtiriladi. */
(function(){
var pg=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index';
document.documentElement.dataset.page=pg;
var l=document.createElement('link');l.rel='stylesheet';l.href='css/mobile.css?v=3';document.head.appendChild(l);
var SHEETS={
  ai:[['Xarita',null],['Natija','main > aside']],
  posadka:[['Reja',null],['Koʻrsatkichlar','main > aside']],
  shamol:[['Xarita',null],['Boshqaruv','.app > aside']],
  gis:[['Xarita',null],['Tahlil','.app > aside']],
  studio:[['Xarita',null],['Panel','.work > aside.side']],
  maket:[['Varaq',null],['Materiallar','main > aside.l'],['Xususiyatlar','main > aside.r']]
};
var cfg=SHEETS[pg];if(!cfg)return;
function init(){
  var panels=cfg.map(function(c){var el=c[1]?document.querySelector(c[1]):null;if(el)el.classList.add('km-panel');return el;});
  var bar=document.createElement('nav');bar.id='kmBar';bar.setAttribute('aria-label','Koʻrinish');
  bar.innerHTML=cfg.map(function(c,i){return '<button type="button" data-i="'+i+'" aria-pressed="'+(i===0)+'">'+c[0]+'</button>';}).join('');
  document.body.appendChild(bar);
  var mq=matchMedia('(max-width:820px)'),cur=0;
  function pick(i){cur=i;panels.forEach(function(p,k){if(p)p.classList.toggle('km-on',k===i);});
    [].forEach.call(bar.children,function(b,k){b.setAttribute('aria-pressed',k===i);});
    setTimeout(function(){window.dispatchEvent(new Event('resize'));},60);}
  function apply(){document.documentElement.classList.toggle('km-sheet',mq.matches);pick(mq.matches?cur:0);}
  bar.onclick=function(e){var b=e.target.closest('button');if(!b)return;var i=+b.dataset.i;pick(i===cur&&i!==0?0:i);};
  mq.addEventListener?mq.addEventListener('change',apply):mq.addListener(apply);apply();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
