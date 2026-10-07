/* Archemistry Lab — beta: fikr-mulohaza, xato haqida xabar, qahva uchun donat, tashrif statistikasi.
   Sozlash: faqat quyidagi CFG qiymatlarini toʻldiring. Boʻsh qolgan tugma koʻrinmaydi. */
(function(){
var CFG={
  donate:'https://taps.so/archemistryurban', // qahva uchun donat sahifasi
  card:'',          // Humo karta raqami, masalan: '9860 0000 0000 0000'
  cardName:'Iskandar Soliyev',      // karta egasi, masalan: 'ISKANDAR S.'
  donateMin:25000,  // eng kam summa, soʻm
  donateSums:[25000,50000,100000],
  dlLimit:3,        // beta: bitta brauzerda bepul yuklab olish soni
  owner:'d49168b121efd4f413968b3ed78eb2339a9ce3033c3fb9c0d6f48cebaa44c6ff', // egasi kaliti (SHA-256)
  tg:'https://t.me/+OGltk-ZVMVQ3NzBi',            // masalan: 'https://t.me/archemistry_beta' (guruh) yoki 'https://t.me/username'
  form:'https://forms.gle/7rrP3FyPdUSa6ULC9',          // Google Form havolasi
  goat:'archemistry'           // GoatCounter kodi, masalan: 'archemistry' (archemistry.goatcounter.com)
};
window.KPS_BETA=CFG;
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
'#kbLim{position:fixed;inset:0;z-index:9500;background:rgba(20,20,20,.45);display:flex;align-items:center;justify-content:center}#kbLim>div{width:400px;max-width:calc(100vw - 32px);background:#fbfaf7;border:1px solid #141414;border-radius:10px;padding:20px;font:13px/1.5 "IBM Plex Sans",sans-serif;color:#141414}#kbLim h3{font:600 18px Archivo,sans-serif;margin:0 0 8px}#kbLim .r{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}#kbLim button{padding:8px 12px;border:1px solid #141414;border-radius:6px;background:#fff;cursor:pointer;font:500 13px "IBM Plex Sans",sans-serif}#kbLim button.k{background:#f0b429;border-color:#f0b429}'+
'#kbToast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9400;background:#141414;color:#f4f3ef;padding:8px 14px;border-radius:8px;font:13px "IBM Plex Sans",sans-serif}'+
'#kbPn .n{color:#6b6862;font-size:12px;margin-top:6px}#kbPn .x{float:right;border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#6b6862}'+
'#kbBar{position:relative;z-index:50;background:#f0b429;color:#141414;font:13px/1.4 "IBM Plex Sans",sans-serif;padding:8px 44px 8px 16px;text-align:center}#kbBar button{position:absolute;right:10px;top:6px;border:0;background:none;font-size:18px;cursor:pointer}#kbBar a{color:#141414;font-weight:600}'+
'#kbCof{position:fixed;left:16px;bottom:16px;z-index:8990;width:310px;background:#fbfaf7;color:#141414;border:1px solid #141414;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.14);padding:12px 14px;font:13px/1.4 "IBM Plex Sans",sans-serif}#kbCof .t{font:600 14px Archivo,sans-serif}#kbCof .x{position:absolute;right:8px;top:6px;border:0;background:none;font-size:16px;cursor:pointer;color:#6b6862}#kbCof .n{color:#6b6862;font-size:12.5px;margin-top:2px}#kbCof .cd{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:8px}#kbCof .cn{font:600 14px "IBM Plex Mono",monospace;letter-spacing:.03em;white-space:nowrap}#kbCof button.k{border:1px solid #f0b429;background:#f0b429;border-radius:6px;padding:5px 9px;font:500 12.5px "IBM Plex Sans",sans-serif;cursor:pointer}'+
'#kbCofS{display:inline-block;text-decoration:none;position:fixed;left:16px;bottom:16px;z-index:8990;height:36px;padding:0 14px;border-radius:18px;border:1px solid #f0b429;background:#f0b429;color:#141414;font:600 13px/34px "IBM Plex Sans",sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.15)}'+
'@media (max-width:700px){#kbCof{width:auto;right:70px}}'+
'@media print{#kbCof,#kbCofS,#kbBtn,#kbPn,#kbBar{display:none!important}}';document.head.appendChild(s);}
function sum(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ');}
function donateHtml(){return '<div class="s" id="kbDon"><a class="b k" href="'+CFG.donate+'" target="_blank" rel="noopener">☕ Qahva uchun</a></div>';}
function coffee(){var w=document.getElementById('kbCofW');if(!w){w=document.createElement('div');w.id='kbCofW';document.body.appendChild(w);}
  w.innerHTML='<a id="kbCofS" href="'+CFG.donate+'" target="_blank" rel="noopener">☕ Qahva uchun</a>';}
function ui(){css();
  var home=/(^|\/)(index\.html)?$/.test(location.pathname);var b=document.createElement('button');b.id='kbBtn';b.type='button';b.title='Fikr bildirish · xato haqida xabar';if(!home)b.className='c';b.innerHTML=(home?'BETA · Fikr bildirish':'β')+'<span id="kbDot"'+(ERR.length?'':' hidden')+'></span>';document.body.appendChild(b);
  var p=document.createElement('div');p.id='kbPn';p.hidden=true;
  p.innerHTML='<div class="h"><button class="x" id="kbX" aria-label="Yopish">×</button><b>Archemistry Lab</b><span class="tag">BETA</span><div class="n">Portal sinov rejimida va hamma uchun bepul. Xato topsangiz yoki gʻoyangiz boʻlsa — yozing, tez tuzatamiz.</div></div>'+
   '<div class="s"><div class="l">Fikr va taklif</div><textarea id="kbTxt" placeholder="Nima yoqdi, nima yetishmayapti, nima noqulay?"></textarea>'+
   (CFG.tg?'<button class="b" id="kbTg">Telegramda yuborish →</button>':'')+(CFG.form?'<a class="b" href="'+CFG.form+'" target="_blank" rel="noopener">Batafsil soʻrovnoma (Google Form) →</a>':'')+
   '<button class="b" id="kbCp">Matnni nusxalash</button></div>'+
   '<div class="s"><div class="l">Xato haqida xabar</div><div class="n">Tugma sahifa, brauzer va soʻnggi xatolar haqidagi texnik maʼlumotni matnga qoʻshadi — shaxsiy maʼlumot yuborilmaydi.</div><button class="b" id="kbBug">Xato maʼlumotini qoʻshish</button></div>'+
   (CFG.donate?donateHtml():'');
  document.body.appendChild(p);
  var T=function(){return document.getElementById('kbTxt');};
  b.onclick=function(){p.hidden=!p.hidden;};document.getElementById('kbX').onclick=function(){p.hidden=true;};
  function copy(t,ok){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(ok,function(){T().select();try{document.execCommand('copy');}catch(e){}ok();});}
  document.getElementById('kbBug').onclick=function(){var t=T();if(t.value.indexOf('Sahifa: ')<0)t.value=(t.value?t.value+'\n\n':'Nima qildim va nima boʻldi: \n\n')+'— texnik —\n'+info();t.focus();};
  document.getElementById('kbCp').onclick=function(){var x=this;copy(T().value||info(),function(){x.textContent='Nusxalandi ✓';setTimeout(function(){x.textContent='Matnni nusxalash';},1800);});};
  var kc=document.getElementById('kbCard');if(kc)kc.onclick=function(){copy(CFG.card.replace(/\s/g,''),function(){kc.textContent='Nusxalandi ✓';setTimeout(function(){kc.textContent='Nusxalash';},1800);});};
  window.KPS_openPanel=function(sec){p.hidden=false;var el=sec&&document.getElementById(sec);if(el)el.scrollIntoView({block:'nearest'});};
  var tg=document.getElementById('kbTg');if(tg)tg.onclick=function(){copy(T().value||info(),function(){window.open(CFG.tg,'_blank','noopener');});tg.textContent='Matn nusxalandi — Telegramda joylang (Ctrl+V)';};
  if(home&&CFG.donate)coffee();
  if(home&&!localStorage.getItem('kps_beta_bar')){var bar=document.createElement('div');bar.id='kbBar';
    bar.innerHTML='<span>Archemistry Lab — beta: hamma uchun bepul, sinov rejimida. Xato yoki gʻoya boʻlsa, pastdagi «Fikr bildirish» tugmasi orqali yozing.</span><button aria-label="Yopish">×</button>';
    document.body.insertBefore(bar,document.body.firstChild);bar.querySelector('button').onclick=function(){bar.remove();try{localStorage.setItem('kps_beta_bar','1');}catch(e){}};}
}
/* ---- yuklab olish cheklovi (beta) ---- */
function isOwner(){try{return localStorage.getItem('kps_owner')==='1';}catch(e){return false;}}
(function(){var m=/[?&]egasi=([^&#]+)/.exec(location.search);if(!m)return;var k=decodeURIComponent(m[1]);
  if(k==='off'){try{localStorage.removeItem('kps_owner');}catch(e){}return;}
  if(!(window.crypto&&crypto.subtle))return;crypto.subtle.digest('SHA-256',new TextEncoder().encode(k)).then(function(h){var x=Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    if(x===CFG.owner){try{localStorage.setItem('kps_owner','1');}catch(e){}toast(L('Egasi rejimi yoqildi — yuklab olish cheklanmagan.'));history.replaceState(null,'',location.pathname+location.hash);}});})();
function L(t){return window.kpsT?kpsT(t):t;}
function dlN(){try{return +localStorage.getItem('kps_dl')||0;}catch(e){return 0;}}
function toast(t){var d=document.getElementById('kbToast');if(!d){d=document.createElement('div');d.id='kbToast';document.body.appendChild(d);}d.textContent=t;clearTimeout(d._t);d._t=setTimeout(function(){d.remove();},3200);}
function exempt(a){var n=(a.download||'').toLowerCase();return /\.json$/.test(n)&&!/\.geojson$/.test(n);}
function limitBox(){if(document.getElementById('kbLim'))return;var w=document.createElement('div');w.id='kbLim';
  w.innerHTML='<div><h3>Bepul yuklab olish tugadi</h3><div>Beta rejimida bepul yuklab olish soni cheklangan va siz bu limitdan foydalandingiz. Portalda ishlashni davom ettirishingiz mumkin — tahlil, chizish va koʻrish cheklanmagan.</div><div style="margin-top:8px;color:#6b6862">Koʻproq yuklab olish kerak boʻlsa, beta guruhimizga yozing.</div><div class="r">'+(CFG.tg?'<button class="k" id="kbLimTg">Telegram guruh →</button>':'')+(CFG.donate?'<button id="kbLimDon">☕ Qahva uchun</button>':'')+'<button id="kbLimX">Yopish</button></div></div>';
  document.body.appendChild(w);w.onclick=function(e){if(e.target===w)w.remove();};document.getElementById('kbLimX').onclick=function(){w.remove();};
  var t=document.getElementById('kbLimTg');if(t)t.onclick=function(){window.open(CFG.tg,'_blank','noopener');};var d=document.getElementById('kbLimDon');if(d)d.onclick=function(){w.remove();window.open(CFG.donate,'_blank','noopener');};}
function gate(a){if(!a||!a.hasAttribute||!a.hasAttribute('download'))return true;if(a._kpsOk)return true;if(isOwner()||exempt(a)){a._kpsOk=1;return true;}
  var n=dlN();if(n>=CFG.dlLimit){limitBox();return false;}n++;try{localStorage.setItem('kps_dl',n);}catch(e){}a._kpsOk=1;setTimeout(function(){a._kpsOk=0;},1500);
  toast(L('Bepul yuklab olish qoldi:')+' '+(CFG.dlLimit-n));return true;}
window.KPS_gate=gate;
var _click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!gate(this))return;return _click.apply(this,arguments);};
var _disp=HTMLAnchorElement.prototype.dispatchEvent;HTMLAnchorElement.prototype.dispatchEvent=function(ev){if(ev&&ev.type==='click'&&!gate(this))return false;return _disp.apply(this,arguments);};
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[download]');if(a&&!gate(a)){e.preventDefault();e.stopPropagation();}},true);
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
st.textContent='html.kps-embed header .brand,html.kps-embed header .crumb,html.kps-embed #brandCrumb,html.kps-embed #kbBtn,html.kps-embed #kbPn{display:none!important}';
document.head.appendChild(st);
var PAGES=['index.html','studio.html','ai.html','posadka.html','maket.html','masterreja.html','data.html','shamol.html'];
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
