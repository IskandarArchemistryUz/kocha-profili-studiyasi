/* Archemistry Lab — tashqi kutubxonalarni zaxira CDN lardan yuklash (Leaflet, MapLibre, three, turf).
   Tartib: cdnjs.cloudflare.com → cdn.jsdelivr.net → unpkg.com (bir xil versiya).
   Hech biri ochilmasa — sahifada tushunarli xabar, kutubxonaga bogʻliq skriptlar umuman ishga tushmaydi
   (ReferenceError «L is not defined» oʻrniga).

   Ishlatish (sahifada, kutubxonaning birinchi <script> tegidan keyin):
     <script src="js/cdn.js"></script>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
     <script>KLIB.need('leaflet',['js/app.js?v=53'])</script>
   need(nomlar, bogʻliqlar) — yetishmagan kutubxonani keyingi CDN dan sinxron (document.write) yuklaydi,
   soʻng bogʻliq skriptlarni xuddi oddiy <script> teglari kabi tartib bilan ulaydi.
   Ichki skript: <script type="text/x-klib" data-need="leaflet">…</script><script>KLIB.run()</script>
   CSS: <link rel="stylesheet" href="…cdnjs…" onerror="KLIB.css(this)"> — keyingi CDN ga oʻtadi. */
window.KLIB=(function(){
'use strict';
const CJ='https://cdnjs.cloudflare.com/ajax/libs/',JD='https://cdn.jsdelivr.net/npm/',UN='https://unpkg.com/';
const LIB={
  leaflet:{t:()=>window.L&&window.L.map,
    js:[CJ+'leaflet/1.9.4/leaflet.min.js',JD+'leaflet@1.9.4/dist/leaflet.js',UN+'leaflet@1.9.4/dist/leaflet.js'],
    css:[CJ+'leaflet/1.9.4/leaflet.min.css',JD+'leaflet@1.9.4/dist/leaflet.css',UN+'leaflet@1.9.4/dist/leaflet.css']},
  maplibre:{t:()=>window.maplibregl&&window.maplibregl.Map,
    js:[CJ+'maplibre-gl/4.7.1/maplibre-gl.min.js',JD+'maplibre-gl@4.7.1/dist/maplibre-gl.js',UN+'maplibre-gl@4.7.1/dist/maplibre-gl.js'],
    css:[CJ+'maplibre-gl/4.7.1/maplibre-gl.min.css',JD+'maplibre-gl@4.7.1/dist/maplibre-gl.css',UN+'maplibre-gl@4.7.1/dist/maplibre-gl.css']},
  turf:{t:()=>window.turf&&window.turf.area,
    js:[CJ+'Turf.js/7.1.0/turf.min.js',JD+'@turf/turf@7.1.0/turf.min.js',UN+'@turf/turf@7.1.0/turf.min.js']},
  three:{t:()=>window.THREE&&window.THREE.Scene,
    js:[CJ+'three.js/r128/three.min.js',JD+'three@0.128.0/build/three.min.js',UN+'three@0.128.0/build/three.min.js']},
  /* three r128 «examples» cdnjs da yoʻq — jsdelivr → unpkg */
  orbit:{t:()=>window.THREE&&window.THREE.OrbitControls,
    js:[JD+'three@0.128.0/examples/js/controls/OrbitControls.js',UN+'three@0.128.0/examples/js/controls/OrbitControls.js']},
  gltf:{t:()=>window.THREE&&window.THREE.GLTFLoader,
    js:[JD+'three@0.128.0/examples/js/loaders/GLTFLoader.js',UN+'three@0.128.0/examples/js/loaders/GLTFLoader.js']}
};
const MSG='Xarita kutubxonasi yuklanmadi — internet yoki tarmoq cheklovini tekshiring va sahifani yangilang';
const MSG3='3D kutubxonasi yuklanmadi — internet yoki tarmoq cheklovini tekshiring va sahifani yangilang';
const tried={},failed={},jobs=[];
const ok=n=>{const l=LIB[n];return !!(l&&l.t());};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
/* sahifadagi xabar: bitta, yopiladigan, tarjima qilinadi (js/i18n.js matn tugunlarini kuzatadi) */
function show(names){
  const three=names.every(n=>n==='three'||n==='orbit'||n==='gltf'||n==='turf');
  const put=()=>{if(document.getElementById('klibMsg'))return;const d=document.createElement('div');d.id='klibMsg';d.setAttribute('role','alert');
    d.style.cssText='position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:100000;max-width:min(560px,calc(100vw - 32px));box-sizing:border-box;display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:#fff;color:#141414;border:1px solid #b23a2e;border-left-width:4px;border-radius:2px;box-shadow:0 6px 24px rgba(0,0,0,.14);font:500 13px/1.45 Archivo,system-ui,sans-serif';
    const t=document.createElement('span');t.textContent=three?MSG3:MSG;t.style.flex='1';d.appendChild(t);
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Yopish');
    b.style.cssText='flex:none;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border:0;background:none;color:inherit;cursor:pointer;padding:0';
    b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    b.onclick=()=>d.remove();d.appendChild(b);document.body.appendChild(d);};
  if(document.body)put();else document.addEventListener('DOMContentLoaded',put);
}
/* navbatdagi qadam: yetishmagan kutubxona — keyingi URL; hammasi tayyor — bogʻliq skriptlar */
function step(id){
  const j=jobs[id];
  for(const n of j.names){
    if(ok(n)||failed[n])continue;
    const l=LIB[n],i=tried[n]||0;
    if(i>=l.js.length){failed[n]=true;continue;}
    tried[n]=i+1;
    document.write('<script src="'+esc(l.js[i])+'"><\/script><script>KLIB._s('+id+')<\/script>');
    return;
  }
  const bad=j.names.filter(n=>!ok(n));
  if(bad.length){show(bad);return;}
  if(j.deps.length)document.write(j.deps.map(s=>'<script src="'+esc(s)+'"><\/script>').join(''));
}
function need(names,deps){
  names=[].concat(names||[]);deps=[].concat(deps||[]);
  names.forEach(n=>{if(!LIB[n])throw new Error('KLIB: '+n);const l=LIB[n];
    /* sahifadagi oddiy <script src> allaqachon birinchi URL ni sinab koʻrgan boʻlsa — qayta yuklamaymiz */
    if(!tried[n]&&[...document.scripts].some(s=>s.src===l.js[0]))tried[n]=1;});
  jobs.push({names,deps});step(jobs.length-1);
}
/* oldingi <script type="text/x-klib" data-need="…"> ni kutubxona tayyor boʻlsa sinxron bajaradi */
function run(){
  const me=document.currentScript;let s=me&&me.previousElementSibling;
  while(s&&!(s.tagName==='SCRIPT'&&s.type==='text/x-klib'))s=s.previousElementSibling;
  if(!s||s.dataset.klibDone)return;s.dataset.klibDone='1';
  const names=(s.dataset.need||'').split(/[\s,]+/).filter(Boolean);
  if(!names.every(ok)){show(names.filter(n=>!ok(n)));return;}
  const x=document.createElement('script');x.text=s.text;s.after(x);
}
/* CSS: yuklanmasa — keyingi CDN */
function css(link){
  const h=link.href;for(const n in LIB){const c=LIB[n].css;if(!c)continue;const i=c.indexOf(h);
    if(i>=0){if(i+1<c.length)link.href=c[i+1];else link.onerror=null;return;}}
  link.onerror=null;
}
/* dinamik (Promise) yuklash — 3D kabi kech kerak boʻladigan kutubxonalar uchun, ayni CDN tartibida */
function load(n){
  if(ok(n))return Promise.resolve();
  const l=LIB[n];let i=0;
  return new Promise((res,rej)=>{
    const next=()=>{if(ok(n)){res();return;}if(i>=l.js.length){rej(new Error(n==='leaflet'||n==='maplibre'?MSG:MSG3));return;}
      const s=document.createElement('script');s.src=l.js[i++];s.onload=next;s.onerror=next;document.head.appendChild(s);};
    next();});
}
return {need,run,css,load,ok,_s:step,LIB,MSG,MSG3,show};
})();
