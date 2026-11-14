/* =====================================================================
   Koʻchasoz · Mavjud holat (14.11.2026)
   1) «Hozirgisini mavjud holat deb saqlash» — joriy chizma nusxasi (koʻchalar, tugunlar, belgilar, harakat modeli natijasi) ds.exist ga.
      Keyin loyiha oʻzgartiriladi; albomda «Mavjud holat» va «Mavjud ↔ loyiha» varaqlari chiqadi.
   2) Asos rasmi: syomka, skan yoki foto (PNG/JPG) xarita ustiga qoʻyiladi — sudrash, masshtab (m/px), burish, shaffoflik.
      Foydalanuvchi rasmni sunʼiy yoʻldosh bilan moslab, mavjud koʻchalarni ustidan chizadi.
   ===================================================================== */
(function(){
const UKEY='kps_underlay';let U=null,img=null,hdl=null,pan=null;
function load(){try{U=JSON.parse(localStorage.getItem(UKEY)||'null');}catch(e){U=null;}}
function store(){try{localStorage.setItem(UKEY,JSON.stringify(U));}catch(e){toast('Rasm katta — brauzer xotirasiga sigʻmadi; sahifani yangilasangiz qayta yuklang.');}}
function place(){if(!U||!img)return;const z=map.getZoom(),mpp=156543.03392*Math.cos(U.c[0]*Math.PI/180)/2**z,p=map.latLngToLayerPoint(U.c),w=U.w*U.s/mpp;
  img.style.width=w+'px';img.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%) rotate(${U.r||0}deg)`;img.style.opacity=U.op??.6;}
function mount(){unmount();if(!U)return;img=document.createElement('img');img.src=U.src;img.style.cssText='position:absolute;left:0;top:0;transform-origin:50% 50%;pointer-events:none;z-index:250;max-width:none';
  map.getPane('overlayPane').appendChild(img);img.onload=()=>{if(!U.w){U.w=img.naturalWidth;U.h=img.naturalHeight;store();}place();};
  hdl=L.marker(U.c,{draggable:true,icon:L.divIcon({className:'',html:'<div style="width:18px;height:18px;border-radius:50%;background:#2a6fb0;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translate(-50%,-50%);cursor:move" title="Asos rasmini surish"></div>'})}).addTo(map);
  hdl.on('drag',e=>{const ll=e.target.getLatLng();U.c=[ll.lat,ll.lng];place();}).on('dragend',store);map.on('zoom viewreset move',place);panel();}
function unmount(){if(img)img.remove();img=null;if(hdl)hdl.remove();hdl=null;map.off('zoom viewreset move',place);if(pan)pan.remove();pan=null;}
function panel(){if(pan)pan.remove();pan=document.createElement('div');pan.className='kt-ui kt-card';pan.style.cssText='position:fixed;left:16px;bottom:120px;z-index:1200;width:260px;padding:12px;font:12.5px Archivo,sans-serif';
  const sl=(k,min,max,step,v,lab)=>`<label style="display:grid;grid-template-columns:80px 1fr 46px;gap:6px;align-items:center;margin:4px 0">${lab}<input type="range" data-u="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${v}</output></label>`;
  pan.innerHTML=`<b>Asos rasmi (syomka / skan)</b><div style="color:#666;margin:4px 0 6px">Koʻk nuqtani suring; masshtab va burchakni sunʼiy yoʻldosh bilan moslang, keyin mavjud koʻchalarni ustidan chizing.</div>
    ${sl('op',0,1,.05,U.op??.6,'Shaffoflik')}${sl('r',-180,180,.5,U.r||0,'Burchak, °')}${sl('ls',-3,1,.01,Math.log10(U.s||.1).toFixed(2),'Masshtab')}
    <label style="display:grid;grid-template-columns:80px 1fr;gap:6px;align-items:center">m / px<input data-u="s" type="number" step="0.001" value="${(U.s||.1).toFixed(4)}" style="height:26px"></label>
    <div style="display:flex;gap:6px;margin-top:8px"><button class="kt-btn" data-u="hide">Yashirish</button><button class="kt-btn dg" data-u="del">Olib tashlash</button></div>`;
  document.body.appendChild(pan);
  pan.addEventListener('input',e=>{const k=e.target.dataset.u;if(!k)return;const v=+e.target.value;if(k==='op')U.op=v;else if(k==='r')U.r=v;else if(k==='ls'){U.s=10**v;pan.querySelector('input[data-u="s"]').value=U.s.toFixed(4);}else if(k==='s'&&v>0)U.s=v;
    const o=e.target.parentNode.querySelector('output');if(o)o.textContent=e.target.value;place();});
  pan.addEventListener('change',store);
  pan.addEventListener('click',e=>{const k=e.target.dataset.u;if(k==='hide'){unmount();toast('Asos rasmi yashirildi — «Fayl → Asos rasmi» bilan qayta koʻrsatiladi.');}if(k==='del'){unmount();U=null;try{localStorage.removeItem(UKEY);}catch(_){}toast('Asos rasmi olib tashlandi.');}});}
function pickImage(){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{const c=map.getCenter(),z=map.getZoom(),mpp=156543.03392*Math.cos(c.lat*Math.PI/180)/2**z;
    /* boshlangʻich masshtab: rasm ekran enining ~60 % ini egallasin */
    const im=new Image();im.onload=()=>{U={src:rd.result,c:[c.lat,c.lng],w:im.naturalWidth,h:im.naturalHeight,s:map.getSize().x*.6*mpp/im.naturalWidth,r:0,op:.6,name:f.name};store();mount();};im.src=rd.result;};rd.readAsDataURL(f);};inp.click();}
function showUnderlay(){load();if(U)mount();else pickImage();}
function saveExist(){const ds=DS();let marks={};try{marks=buildShapes().marks;}catch(e){}
  ds.exist={t:Date.now(),segs:JSON.parse(JSON.stringify(ds.segs)),nodes:JSON.parse(JSON.stringify(ds.nodes)),signs:JSON.parse(JSON.stringify(ds.signs||[])),sim:ds.simAlb?JSON.parse(JSON.stringify(ds.simAlb)):null,marks,src:U?('asos rasmi: '+(U.name||'syomka')):'foydalanuvchi chizmasi'};
  save();toast(`Mavjud holat saqlandi (${ds.segs.length} koʻcha${ds.simAlb?', harakat modeli natijasi bilan':''}). Endi loyihani oʻzgartiring — albomda taqqoslash chiqadi.`);}
function clearExist(){const ds=DS();delete ds.exist;save();toast('Mavjud holat oʻchirildi.');}
window.KSMAV={saveExist,clearExist,showUnderlay,pickImage};
load();if(U)setTimeout(mount,800);
})();
