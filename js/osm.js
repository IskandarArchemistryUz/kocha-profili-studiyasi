/* Archemistry Lab — umumiy OSM (Overpass) mijozi va qadamlar orasida ulashish.
   KOSM.fetch(q)      — 4 ta oyna, parallel zaxira soʻrov (15 s), 90 s chegarasi, 14 kunlik IndexedDB kesh ('kps_ovc', 1-qadam bilan bir xil).
   KOSM.share(o,bb)   — 1-qadam yuklagan binolar, koʻchalar va muhit qatlamlarini boshqa qadamlar uchun saqlaydi.
   KOSM.shared(bb)    — saqlangan paketdan berilgan chegara [s,w,n,e] ichidagi elementlarni qaytaradi (yoki null).
   Maqsad: bir qadam serverdan olgan maʼlumotni boshqasi qayta soʻramasin; server javob bermasa — ulashilgan maʼlumot ishlatiladi. */
(function(){
  var MIR=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  var TTL=14*864e5,SHARE_KEY='share:hudud',idx=0;
  var host=function(u){return u.replace(/^https?:\/\//,'').split('/')[0];};
  function one(u,q,signal){return fetch(u,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:signal}).then(function(r){
      if(!r.ok)throw new Error('HTTP '+r.status+' · '+host(u)+(r.status===429?' (navbat toʻla)':r.status>=500?' (server band)':''));
      return r.json().catch(function(){throw new Error(host(u)+': notoʻgʻri javob');});}).then(function(j){
      if(j.remark&&/runtime error|timed out|out of memory/i.test(j.remark))throw new Error(host(u)+': '+j.remark.slice(0,80));return j;});}
  function hedge(q,onTry){var order=MIR.map(function(_,k){return MIR[(idx+k)%MIR.length];});idx++;
    return new Promise(function(ok,no){var fin=false,started=0,active=0,errs=[],ctl=[];
      function launch(){if(fin||started>=order.length)return;var u=order[started++],ac=new AbortController(),tm=setTimeout(function(){ac.abort();},90000);ctl.push(ac);active++;if(onTry)onTry(started,order.length,host(u));
        one(u,q,ac.signal).then(function(j){clearTimeout(tm);if(fin)return;fin=true;ctl.forEach(function(c){if(c!==ac)c.abort();});ok(j);})
          .catch(function(e){clearTimeout(tm);active--;if(fin)return;errs.push(e&&e.name==='AbortError'?host(u)+': 90 s ichida javob yoʻq':String(e&&e.message||e));if(started<order.length)launch();else if(!active)no(new Error(errs.join(' · ')));});}
      launch();var hd=setInterval(function(){if(fin||started>=order.length){clearInterval(hd);return;}if(active<2)launch();},15000);});}
  function db(){return new Promise(function(ok,no){var r=indexedDB.open('kps_ovc',1);r.onupgradeneeded=function(){r.result.createObjectStore('c',{keyPath:'q'});};r.onsuccess=function(){ok(r.result);};r.onerror=function(){no(r.error);};});}
  function cget(q,anyAge){return db().then(function(d){return new Promise(function(ok){var t=d.transaction('c','readonly').objectStore('c').get(q);t.onsuccess=function(){var v=t.result;ok(v&&(anyAge||Date.now()-v.t<TTL)?v.j:null);};t.onerror=function(){ok(null);};});}).catch(function(){return null;});}
  function cput(q,j){return db().then(function(d){return new Promise(function(ok){var tx=d.transaction('c','readwrite');tx.objectStore('c').put({q:q,j:j,t:Date.now()});tx.oncomplete=function(){ok(true);};tx.onerror=function(){ok(false);};});}).catch(function(){return false;});}
  function inBB(g,bb){return g&&g.lat>=bb[0]&&g.lat<=bb[2]&&g.lon>=bb[1]&&g.lon<=bb[3];}
  function gbbHit(gs,bb){var s=90,w=180,n=-90,e=-180;gs.forEach(function(g){if(!g)return;if(g.lat<s)s=g.lat;if(g.lat>n)n=g.lat;if(g.lon<w)w=g.lon;if(g.lon>e)e=g.lon;});return s<=bb[2]&&n>=bb[0]&&w<=bb[3]&&e>=bb[1];}
  function touches(el,bb){if(el.geometry)return gbbHit(el.geometry,bb);   // chiziq hudud ustidan oʻtsa ham (ichida nuqtasi boʻlmasa ham)
if(el.lat!=null)return inBB(el,bb);if(el.members)return el.members.some(function(m){return (m.geometry||[]).some(function(g){return inBB(g,bb);});});return false;}
  var KOSM={
    mirrors:MIR,
    fetch:function(q,opt){opt=opt||{};return cget(q).then(function(c){if(c)return c;return hedge(q,opt.onTry).then(function(j){cput(q,j);return j;});});},
    /* o: {building:[...], highway:[...], env:[...]}; bb: [s,w,n,e] — 1-qadam hududi */
    share:function(o,bb){var el=[],seen={};['building','highway','env'].forEach(function(k){(o[k]||[]).forEach(function(e){var id=e.type+e.id;if(!seen[id]){seen[id]=1;el.push(e);}});});
      return cput(SHARE_KEY,{bb:bb,t:Date.now(),kinds:Object.keys(o).filter(function(k){return (o[k]||[]).length;}),elements:el});},
    /* bb ichidagi elementlar; paket bb ni toʻliq qoplamasa — null (chala maʼlumotni toʻliq deb koʻrsatmaslik uchun) */
    shared:function(bb){return cget(SHARE_KEY,true).then(function(v){if(!v||!v.bb)return null;var p=v.bb,tol=0.0025;
      if(bb[0]<p[0]-tol||bb[1]<p[1]-tol||bb[2]>p[2]+tol||bb[3]>p[3]+tol)return null;
      return {elements:v.elements.filter(function(e){return touches(e,bb);}),kinds:v.kinds||[],t:v.t};});}
  };
  window.KOSM=KOSM;
})();
