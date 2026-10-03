/* Archemistry Studio — beta: fikr-mulohaza, xato haqida xabar, qahva uchun donat, tashrif statistikasi.
   Sozlash: faqat quyidagi CFG qiymatlarini toʻldiring. Boʻsh qolgan tugma koʻrinmaydi. */
(function(){
var CFG={
  donate:'',        // masalan: 'https://tirikchilik.uz/archemistry'
  donateSum:'50 000',
  tg:'',            // masalan: 'https://t.me/archemistry_beta' (guruh) yoki 'https://t.me/username'
  form:'',          // Google Form havolasi
  goat:''           // GoatCounter kodi, masalan: 'archemistry' (archemistry.goatcounter.com)
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
'#kbPn .n{color:#6b6862;font-size:12px;margin-top:6px}#kbPn .x{float:right;border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#6b6862}'+
'#kbBar{position:relative;z-index:50;background:#f0b429;color:#141414;font:13px/1.4 "IBM Plex Sans",sans-serif;padding:8px 44px 8px 16px;text-align:center}#kbBar button{position:absolute;right:10px;top:6px;border:0;background:none;font-size:18px;cursor:pointer}#kbBar a{color:#141414;font-weight:600}'+
'@media print{#kbBtn,#kbPn,#kbBar{display:none!important}}';document.head.appendChild(s);}
function ui(){css();
  var home=/(^|\/)(index\.html)?$/.test(location.pathname);var b=document.createElement('button');b.id='kbBtn';b.type='button';b.title='Fikr bildirish · xato haqida xabar';if(!home)b.className='c';b.innerHTML=(home?'BETA · Fikr bildirish':'β')+'<span id="kbDot"'+(ERR.length?'':' hidden')+'></span>';document.body.appendChild(b);
  var p=document.createElement('div');p.id='kbPn';p.hidden=true;
  p.innerHTML='<div class="h"><button class="x" id="kbX" aria-label="Yopish">×</button><b>Archemistry Studio</b><span class="tag">BETA</span><div class="n">Portal sinov rejimida va hamma uchun bepul. Xato topsangiz yoki gʻoyangiz boʻlsa — yozing, tez tuzatamiz.</div></div>'+
   '<div class="s"><div class="l">Fikr va taklif</div><textarea id="kbTxt" placeholder="Nima yoqdi, nima yetishmayapti, nima noqulay?"></textarea>'+
   (CFG.tg?'<button class="b" id="kbTg">Telegramda yuborish →</button>':'')+(CFG.form?'<a class="b" href="'+CFG.form+'" target="_blank" rel="noopener">Batafsil soʻrovnoma (Google Form) →</a>':'')+
   '<button class="b" id="kbCp">Matnni nusxalash</button></div>'+
   '<div class="s"><div class="l">Xato haqida xabar</div><div class="n">Tugma sahifa, brauzer va soʻnggi xatolar haqidagi texnik maʼlumotni matnga qoʻshadi — shaxsiy maʼlumot yuborilmaydi.</div><button class="b" id="kbBug">Xato maʼlumotini qoʻshish</button></div>'+
   (CFG.donate?'<div class="s"><div class="l">Qoʻllab-quvvatlash</div><div class="n">Portal bepul. Rivojlanishiga hissa qoʻshmoqchi boʻlsangiz — istalgan summani yuboring.</div><div class="n"><b>'+CFG.donateSum+' soʻm</b> — bir qahva</div><a class="b k" href="'+CFG.donate+'" target="_blank" rel="noopener">☕ Qahva uchun donat →</a></div>':'');
  document.body.appendChild(p);
  var T=function(){return document.getElementById('kbTxt');};
  b.onclick=function(){p.hidden=!p.hidden;};document.getElementById('kbX').onclick=function(){p.hidden=true;};
  function copy(t,ok){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(ok,function(){T().select();try{document.execCommand('copy');}catch(e){}ok();});}
  document.getElementById('kbBug').onclick=function(){var t=T();if(t.value.indexOf('Sahifa: ')<0)t.value=(t.value?t.value+'\n\n':'Nima qildim va nima boʻldi: \n\n')+'— texnik —\n'+info();t.focus();};
  document.getElementById('kbCp').onclick=function(){var x=this;copy(T().value||info(),function(){x.textContent='Nusxalandi ✓';setTimeout(function(){x.textContent='Matnni nusxalash';},1800);});};
  var tg=document.getElementById('kbTg');if(tg)tg.onclick=function(){copy(T().value||info(),function(){window.open(CFG.tg,'_blank','noopener');});tg.textContent='Matn nusxalandi — Telegramda joylang (Ctrl+V)';};
  if(home&&!localStorage.getItem('kps_beta_bar')){var bar=document.createElement('div');bar.id='kbBar';
    bar.innerHTML='<span>Archemistry Studio — beta: hamma uchun bepul, sinov rejimida. Xato yoki gʻoya boʻlsa, pastdagi «Fikr bildirish» tugmasi orqali yozing.</span><button aria-label="Yopish">×</button>';
    document.body.insertBefore(bar,document.body.firstChild);bar.querySelector('button').onclick=function(){bar.remove();try{localStorage.setItem('kps_beta_bar','1');}catch(e){}};}
}
if(CFG.goat){var g=document.createElement('script');g.async=true;g.dataset.goatcounter='https://'+CFG.goat+'.goatcounter.com/count';g.src='https://gc.zgo.at/count.js';document.head.appendChild(g);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
})();
