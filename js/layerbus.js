/* Archemistry Lab — tahlil qatlamlari shinasi.
 * Tahlil boʻlimlari (Yer qoplami, Relyef · zichlik · tarmoqlar, Shamol) hisoblagan natijani
 * shu yerga «eʼlon qiladi»; asosiy oyna (Master reja muharriri) ularni qatlam sifatida koʻrsatadi.
 *
 * Guruh: {id, name, page, t, legend:<html>, sources:{k:{type:'image',url,coordinates}|{type:'geojson',data}}, layers:[maplibre qatlamlari, source=k]}
 * Saqlash: IndexedDB «kps_layers» (rasmlar katta — localStorage sigʻmaydi); xabar: localStorage «kps_layers_ping» (iframe'lar orasida storage hodisasi).
 */
(function(){
'use strict';
if(window.KPSLAY)return;
const DB='kps_layers',ST='g';
let _db=null;
function db(){if(_db)return _db;return _db=new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST,{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>{_db=null;no(r.error);};});}
async function tx(mode,fn){const d=await db();return new Promise((ok,no)=>{const t=d.transaction(ST,mode),s=t.objectStore(ST);let out;const q=fn(s);if(q)q.onsuccess=()=>{out=q.result;};t.oncomplete=()=>ok(out);t.onerror=()=>no(t.error);});}
const subs=new Set();
function ping(id){try{localStorage.setItem('kps_layers_ping',JSON.stringify({id,t:Date.now()}));}catch(e){}subs.forEach(f=>{try{f(id);}catch(e){}});}
window.addEventListener('storage',e=>{if(e.key==='kps_layers_ping'){let id=null;try{id=JSON.parse(e.newValue).id;}catch(er){}subs.forEach(f=>{try{f(id);}catch(er){}});}});

async function publish(g){
  if(!g||!g.id||!g.layers||!g.layers.length)return;
  g.t=Date.now();
  try{await tx('readwrite',s=>s.put(g));ping(g.id);}catch(e){console.warn('Qatlam saqlanmadi',e);}
}
async function remove(id){try{await tx('readwrite',s=>s.delete(id));ping(id);}catch(e){}}
async function list(){try{return (await tx('readonly',s=>s.getAll()))||[];}catch(e){return [];}}
function onChange(f){subs.add(f);return()=>subs.delete(f);}

/* MapLibre sahifasidagi tahlil manbalarini kuzatib, oʻzgarganda nusxasini eʼlon qilish */
function mirror(map,o){
  const srcs=o.sources;let tm=null,busy=false,again=false,last={};
  const isBlank=s=>s.type==='image'&&(!s.url||!s.coordinates||Math.abs(s.coordinates[0][0])<1e-9&&Math.abs(s.coordinates[0][1]-0.001)<1e-9);
  async function snap(){
    if(busy){again=true;return;}busy=true;
    try{
      const style=map.getStyle();if(!style)return;
      const layers=style.layers.filter(l=>srcs.includes(l.source)&&l.type!=='fill-extrusion'&&!(l.layout&&l.layout.visibility==='none'));
      const used=[...new Set(layers.map(l=>l.source))],sources={};
      for(const k of used){const s=map.getSource(k);if(!s)continue;
        if(s.type==='image'){const v={type:'image',url:s.url,coordinates:s.coordinates};if(!isBlank(v))sources[k]=v;}
        else if(s.type==='geojson'){let d=null;try{d=s.getData?await s.getData():null;}catch(e){}if(!d)d=s._data;
          if(d&&typeof d==='object'&&(d.features?d.features.length:1))sources[k]={type:'geojson',data:d};}}
      const L=layers.filter(l=>sources[l.source]).map(l=>{const c=JSON.parse(JSON.stringify(l));delete c.metadata;if(c.layout)delete c.layout.visibility;return c;});
      if(!L.length)return;
      const id=typeof o.id==='function'?o.id():o.id;
      /* oʻzgarmagan boʻlsa qayta eʼlon qilinmaydi (fon xarita almashganda va h.k.) */
      const sig=JSON.stringify(L)+Object.entries(sources).map(([k,v])=>k+':'+(v.type==='image'?v.url.length+v.url.slice(-80)+JSON.stringify(v.coordinates):JSON.stringify(v.data).length)).join('|');
      if(last[id]===sig)return;last[id]=sig;
      await publish({id,name:typeof o.name==='function'?o.name():o.name,page:o.page,legend:o.legend?o.legend():'',sources,layers:L});
    }catch(e){console.warn('Qatlam nusxasi olinmadi',e);}
    finally{busy=false;if(again){again=false;sched();}}
  }
  function sched(){clearTimeout(tm);tm=setTimeout(snap,800);}
  map.on('sourcedata',e=>{if(e.sourceId&&srcs.includes(e.sourceId)&&e.isSourceLoaded)sched();});
  map.on('styledata',sched);
  return {now:snap};
}
window.KPSLAY={publish,remove,list,onChange,mirror};
})();
