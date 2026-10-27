/* Sinov va eski sahifalar — hozircha faqat egasi uchun (kps_owner: akkaunt yoki «?egasi=…» havolasi).
   Oddiy tashrif buyuruvchi bosh sahifaga qaytariladi. Sahifa tayyor boʻlgach — undan shu skript olib tashlanadi.
   Eslatma: statik xostingda fayl manzili baribir ochiq; bu — interfeys darvozasi, maxfiylik himoyasi emas. */
(function(){
  var own=function(){try{return localStorage.getItem('kps_owner')==='1';}catch(e){return false;}};
  if(own())return;
  var q=location.search;
  /* avvalgi versiyada loyiha yaratganlar oʻz maʼlumotini ochishi va zaxiralashi mumkin */
  if(/loyiha\.html$/.test(location.pathname)&&/[?&](p|backup)=/.test(q))return;
  var go=function(){location.replace('./');};
  /* «?egasi=…» havolasini beta.js tekshiradi (asinxron) — natijani kutamiz */
  if(/[?&]egasi=/.test(q)){var d=document.documentElement;d.style.visibility='hidden';var t=0,iv=setInterval(function(){if(own()){clearInterval(iv);d.style.visibility='';}else if((t+=100)>=3000){clearInterval(iv);go();}},100);return;}
  go();
})();
