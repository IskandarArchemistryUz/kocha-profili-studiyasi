/* Archemistry Lab — narxlar sahifasi: hisoblagich (toʻplam, maydon koeffitsiyenti, fayllar) va soʻm / USD almashtirgich.
   Narxlar — andoza (qoralama); 1 tanga ≈ 3 300 soʻm (30 talik toʻplam). */
(function(){'use strict';
var t=window.ALT||function(s){return s;};
var P={alb:20,dxf:12,tik:6,mey:5,ifc:15,chz:15,png:2};
/* narx modeli D (28.10.2026): hamma Master reja fayllari × k, k = √(ga ÷ 3) — server/src/prices.js bilan bir xil */
var MR={alb:1,dxf:1,tik:1,mey:1,ifc:1,chz:1,png:1};
var PRE={kom:['alb','dxf','tik','mey'],taq:['chz','png'],bim:['dxf','ifc'],all:Object.keys(P)};
var KL={'1':'3 ga','1.8':'10 ga','3.2':'30 ga'},RATE=3300;
var sel={},k=1.8;PRE.kom.forEach(function(i){sel[i]=1;});
function q(s){return [].slice.call(document.querySelectorAll(s));}
function loc(){var l=document.documentElement.lang;return l==='en'?'en-US':'ru-RU';}
function nf(v,d){return v.toLocaleString(loc(),{maximumFractionDigits:d||0});}
function sum(list){return list.reduce(function(a,i){return a+P[i];},0);}
function cost(list){var m=sum(list.filter(function(i){return MR[i];})),r=sum(list.filter(function(i){return !MR[i];}));return {m:m,r:r,t:Math.round(m*k)+r};}
function draw(){
  var keys=Object.keys(sel).filter(function(i){return sel[i];}),c=cost(keys),tot=c.t;
  q('[data-it]').forEach(function(b){var on=!!sel[b.getAttribute('data-it')];b.setAttribute('aria-pressed',String(on));var c=b.querySelector('.check');if(c)c.classList.toggle('on',on);});
  q('[data-pre]').forEach(function(b){var p=PRE[b.getAttribute('data-pre')];b.setAttribute('aria-pressed',String(p.length===keys.length&&p.every(function(i){return sel[i];})));});
  q('[data-pre-sum]').forEach(function(s){s.textContent=nf(cost(PRE[s.getAttribute('data-pre-sum')]).t);});
  q('[data-k]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-k')===k));});
  var e=document.getElementById('cTot');if(e)e.textContent=nf(tot);
  e=document.getElementById('cFormula');if(e)e.textContent=(c.m?nf(c.m)+' × '+nf(k,1)+' ('+t(KL[String(k)]||'')+')':'')+(c.m&&c.r?' + ':'')+(c.r?nf(c.r):'');
  e=document.getElementById('cSum');if(e)e.textContent='≈ '+nf(Math.round(tot*RATE/1000)*1000)+' '+t('soʻm');}
q('[data-it]').forEach(function(b){b.addEventListener('click',function(){var i=b.getAttribute('data-it');sel[i]=sel[i]?0:1;draw();});});
q('[data-pre]').forEach(function(b){b.addEventListener('click',function(){sel={};PRE[b.getAttribute('data-pre')].forEach(function(i){sel[i]=1;});draw();});});
q('[data-k]').forEach(function(b){b.addEventListener('click',function(){k=+b.getAttribute('data-k');draw();});});
/* valyuta */
var cur='uzs';try{cur=localStorage.getItem('ks-cur')||'uzs';}catch(e){}
function money(){q('[data-cur]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-cur')===cur));});
  q('[data-uzs]').forEach(function(el){var v=el.getAttribute(cur==='usd'?'data-usd':'data-uzs');var o=t(v)!==v?t(v):v.replace('soʻm',t('soʻm'));if(document.documentElement.lang==='en')o=o.replace(/(\d) (\d{3})/g,'$1,$2');el.textContent=o;});
  pro();}
/* Pro obuna: oylik 149 000 soʻm; yillik −20 % (oyiga 119 200, yiliga 1 430 400). USD — 30 talik toʻplam kursi bilan (≈ 9 900 soʻm / $) */
var per='m',PRO=149000,RATE_USD=9900;
function pro(){var P=document.getElementById('proP');if(!P)return;
  q('[data-per]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-per')===per));});
  var m=per==='y'?Math.round(PRO*0.8):PRO,U=document.getElementById('proU'),Y=document.getElementById('proY');
  if(cur==='usd'){P.textContent='$'+Math.round(m/RATE_USD);U.textContent=t('/ oy');}
  else{P.textContent=nf(m);U.textContent=t('soʻm / oy');}
  Y.hidden=per!=='y';Y.textContent=per==='y'?t('yiliga')+' '+(cur==='usd'?'$'+Math.round(m*12/RATE_USD):nf(m*12)+' '+t('soʻm')):'';}
q('[data-per]').forEach(function(b){b.addEventListener('click',function(){per=b.getAttribute('data-per');pro();});});
q('[data-cur]').forEach(function(b){b.addEventListener('click',function(){cur=b.getAttribute('data-cur');try{localStorage.setItem('ks-cur',cur);}catch(e){}money();});});
/* til almashsa — raqam formati va soʻzlar */
new MutationObserver(function(){draw();money();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
draw();money();
})();
