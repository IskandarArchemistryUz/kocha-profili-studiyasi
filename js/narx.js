/* Archemistry Lab — narxlar sahifasi: hisoblagich (toʻplam, maydon koeffitsiyenti, fayllar) va soʻm / USD almashtirgich.
   Narxlar — andoza (qoralama); 1 tanga ≈ 3 300 soʻm (30 talik toʻplam). */
(function(){'use strict';
var t=window.ALT||function(s){return s;};
var P={alb:12,dxf:8,tik:3,mey:5,ifc:10,chz:10,png:1};
var PRE={kom:['alb','dxf','tik','mey'],taq:['chz','png'],bim:['dxf','ifc'],all:Object.keys(P)};
var KL={'1':'≤ 15 ga','1.5':'15–60 ga','2':'> 60 ga'},RATE=3300;
var sel={},k=1.5;PRE.kom.forEach(function(i){sel[i]=1;});
function q(s){return [].slice.call(document.querySelectorAll(s));}
function loc(){var l=document.documentElement.lang;return l==='en'?'en-US':'ru-RU';}
function nf(v,d){return v.toLocaleString(loc(),{maximumFractionDigits:d||0});}
function sum(list){return list.reduce(function(a,i){return a+P[i];},0);}
function draw(){
  var keys=Object.keys(sel).filter(function(i){return sel[i];}),base=sum(keys),tot=Math.round(base*k);
  q('[data-it]').forEach(function(b){var on=!!sel[b.getAttribute('data-it')];b.setAttribute('aria-pressed',String(on));var c=b.querySelector('.check');if(c)c.classList.toggle('on',on);});
  q('[data-pre]').forEach(function(b){var p=PRE[b.getAttribute('data-pre')];b.setAttribute('aria-pressed',String(p.length===keys.length&&p.every(function(i){return sel[i];})));});
  q('[data-pre-sum]').forEach(function(s){s.textContent=nf(Math.round(sum(PRE[s.getAttribute('data-pre-sum')])*k));});
  q('[data-k]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-k')===k));});
  var e=document.getElementById('cTot');if(e)e.textContent=nf(tot);
  e=document.getElementById('cFormula');if(e)e.textContent=nf(base)+' × '+nf(k,1)+' ('+t(KL[String(k)]||'')+')';
  e=document.getElementById('cSum');if(e)e.textContent='≈ '+nf(Math.round(tot*RATE/1000)*1000)+' '+t('soʻm');}
q('[data-it]').forEach(function(b){b.addEventListener('click',function(){var i=b.getAttribute('data-it');sel[i]=sel[i]?0:1;draw();});});
q('[data-pre]').forEach(function(b){b.addEventListener('click',function(){sel={};PRE[b.getAttribute('data-pre')].forEach(function(i){sel[i]=1;});draw();});});
q('[data-k]').forEach(function(b){b.addEventListener('click',function(){k=+b.getAttribute('data-k');draw();});});
/* valyuta */
var cur='uzs';try{cur=localStorage.getItem('ks-cur')||'uzs';}catch(e){}
function money(){q('[data-cur]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-cur')===cur));});
  q('[data-uzs]').forEach(function(el){var v=el.getAttribute(cur==='usd'?'data-usd':'data-uzs');el.textContent=cur==='usd'?v:v.replace('soʻm',t('soʻm'));});}
q('[data-cur]').forEach(function(b){b.addEventListener('click',function(){cur=b.getAttribute('data-cur');try{localStorage.setItem('ks-cur',cur);}catch(e){}money();});});
/* til almashsa — raqam formati va soʻzlar */
new MutationObserver(function(){draw();money();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
draw();money();
})();
