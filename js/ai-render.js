/* Archemistry Lab — AI render: 3D koʻrinish rasmini (maket) generativ model orqali vizualizatsiyaga aylantirish.
   Provayderlar (foydalanuvchining oʻz API kaliti bilan, brauzerdan toʻgʻridan-toʻgʻri):
   — Google Gemini «Nano Banana» (generateContent, rasm + matn → rasm)
   — OpenAI GPT Image (/v1/images/edits)
   — OpenRouter (chat/completions, modalities: image) — boshqa modellar uchun
   Kalit faqat shu brauzerning localStorage’ida saqlanadi; serverimiz yoʻq — soʻrov provayderga toʻgʻridan-toʻgʻri ketadi.
   Ishlatish: AIRENDER.open({grab:()=>dataURL, kind:'reja'|'bino', title, onAlbum:(src,name)=>Promise}) */
(function(){
'use strict';
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='kps_air';
const PROV={
  gemini:{n:'Google Gemini (Nano Banana)',models:['gemini-nano-banana-2.1','gemini-3-pro-image','gemini-3.1-flash-image','gemini-3.1-flash-lite-image','gemini-2.5-flash-image'],key:'https://aistudio.google.com/apikey'},
  openai:{n:'OpenAI (GPT Image)',models:['gpt-image-2','gpt-image-1'],key:'https://platform.openai.com/api-keys'},
  openrouter:{n:'OpenRouter (boshqa modellar)',models:['google/gemini-2.5-flash-image','openai/gpt-image-1'],key:'https://openrouter.ai/keys'}};
const STY=[
  ['foto','Fotorealistik kunduz','photorealistic daytime architectural visualization, clear sky, soft natural sunlight, realistic materials, people walking, street trees with full foliage, cars on the streets'],
  ['oltin','Oltin soat','photorealistic architectural visualization at golden hour, warm low sun, long soft shadows, glowing windows, atmospheric haze'],
  ['kech','Kechki chiroqlar','photorealistic dusk / blue hour visualization, warm interior lights in windows, street lamps on, deep blue sky'],
  ['qish','Qish','photorealistic winter scene, light snow on roofs and ground, bare deciduous trees, overcast soft light'],
  ['toshkent','Toshkent ruhida','photorealistic visualization set in Tashkent, Uzbekistan: plane trees (chinar) and mulberry along streets, open irrigation ditches (ariq), warm continental summer light, local people, light dust haze, Central Asian context'],
  ['akvarel','Akvarel eskiz','loose architectural watercolor sketch with ink linework, white paper background, soft washes of color, hand-drawn feel'],
  ['maket','Oq maket (fotosi)','photograph of a physical white architectural scale model made of matte card and wood, studio lighting, shallow depth of field'],
  ['diagramma','Diagramma','clean architectural diagram illustration, flat pastel colors, thin dark outlines, minimal shading, no people']];
let ST={prov:'gemini',model:{},key:{},sty:'foto',extra:'',keep:true};
try{Object.assign(ST,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(_){}};
const CSS=`.air{position:fixed;top:0;right:0;bottom:0;width:380px;z-index:5000;background:#fff;border-left:1px solid #141414;display:flex;flex-direction:column;font:14px/1.4 Archivo,system-ui,sans-serif;color:#141414;box-shadow:-8px 0 24px rgba(0,0,0,.08)}
.air .hd{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #dedbd4}.air .hd b{flex:1;font:600 15px Archivo,sans-serif}
.air .bd{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:12px}
.air .lb{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#5e5c58}
.air select,.air input[type=text],.air input[type=password],.air textarea{width:100%;border:1px solid #dedbd4;padding:6px 8px;font:13px Archivo,sans-serif;background:#fff}
.air textarea{min-height:56px;resize:vertical}
.air .st{display:grid;grid-template-columns:1fr 1fr;gap:5px}.air .st button{border:1px solid #dedbd4;background:#fff;padding:7px 6px;font:12.5px Archivo,sans-serif;text-align:left;cursor:pointer}
.air .st button[aria-pressed=true]{border-color:#2a6fb0;box-shadow:inset 0 0 0 1px #2a6fb0}
.air .btn{height:32px;padding:0 12px;border:1px solid #141414;background:#fff;font:500 12px 'IBM Plex Mono',monospace;cursor:pointer;white-space:nowrap}.air .btn.dark{background:#141414;color:#fff}.air .btn:disabled{opacity:.45;cursor:default}
.air .nt{font-size:12px;color:#5e5c58;margin:0}.air .er{font-size:12.5px;color:#b23a2e;margin:0;white-space:pre-wrap}
.air .gal{display:grid;grid-template-columns:1fr 1fr;gap:6px}.air .gal img{width:100%;display:block;border:1px solid #dedbd4;cursor:zoom-in}
.air .row{display:flex;gap:6px;flex-wrap:wrap}.air a{color:#2a6fb0}
.airv{position:fixed;inset:0;z-index:5100;background:rgba(20,20,20,.88);display:grid;grid-template-rows:auto 1fr;font:13px 'IBM Plex Mono',monospace;color:#fff}
.airv .airtb{display:flex;gap:8px;align-items:center;padding:10px 14px}.airv .airtb span{flex:1}
.airv .airtb button{height:30px;padding:0 12px;border:1px solid #fff;background:none;color:#fff;font:inherit;cursor:pointer}.airv .airtb button.on{background:#fff;color:#141414}
.airv .airim{position:relative;display:grid;place-items:center;min-height:0;padding:0 14px 14px}.airv img{max-width:100%;max-height:100%;object-fit:contain}
.airv .aircmp{position:relative;max-width:100%;max-height:100%}.airv .aircmp img{display:block}.airv .aircmp .b{position:absolute;inset:0;overflow:hidden}.airv .aircmp .b img{max-width:none;height:100%;object-fit:cover}
.airv .aircmp i{position:absolute;top:0;bottom:0;width:2px;background:#fff;cursor:ew-resize}`;
let PN=null,O=null,RES=[],BUSY=false;
function open(o){O=o;if(!document.getElementById('airCss')){const s=document.createElement('style');s.id='airCss';s.textContent=CSS;document.head.appendChild(s);}
  if(PN){PN.remove();PN=null;}PN=document.createElement('aside');PN.className='air';document.body.appendChild(PN);render();}
function close(){if(PN)PN.remove();PN=null;}
function render(){if(!PN)return;const P=PROV[ST.prov],model=ST.model[ST.prov]||P.models[0],key=ST.key[ST.prov]||'';
  PN.innerHTML=`<div class="hd"><b>${KIC.i('sparkle','b')}${esc(T('AI render'))}</b><button class="btn" id="airX" aria-label="${esc(T('Yopish'))}">${KIC.i('x')}</button></div><div class="bd">
    <p class="nt">${esc(T('Joriy 3D koʻrinish rasmini generativ modelga yuboradi: geometriya (binolar, koʻchalar, kamera) saqlanadi, materiallar, yorugʻlik, odamlar va muhit qoʻshiladi.'))}</p>
    <div><span class="lb">${esc(T('Model'))}</span><select id="airP">${Object.entries(PROV).map(([k,v])=>`<option value="${k}" ${k===ST.prov?'selected':''}>${esc(T(v.n))}</option>`).join('')}</select>
      <input type="text" id="airM" list="airML" value="${esc(model)}" style="margin-top:6px" aria-label="${esc(T('Model nomi'))}"><datalist id="airML">${P.models.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>
    <div><span class="lb">${esc(T('API kaliti'))}</span><input type="password" id="airK" value="${esc(key)}" placeholder="${esc(T('kalitni shu yerga qoʻying'))}" autocomplete="off">
      <p class="nt" style="margin-top:4px">${esc(T('Kalit faqat shu brauzerda saqlanadi va toʻgʻridan-toʻgʻri provayderga yuboriladi. Toʻlov — sizning hisobingizdan.'))} <a href="${P.key}" target="_blank" rel="noopener">${esc(T('Kalit olish'))}${KIC.i('external','a',14)}</a></p></div>
    <div><span class="lb">${esc(T('Uslub'))}</span><div class="st">${STY.map(([k,n])=>`<button data-st="${k}" aria-pressed="${ST.sty===k}">${esc(T(n))}</button>`).join('')}</div></div>
    <div><span class="lb">${esc(T('Qoʻshimcha (ixtiyoriy)'))}</span><textarea id="airE" placeholder="${esc(T('masalan: ikkinchi plandagi bogʻda bolalar maydonchasi, fasadlar terrakota gʻisht'))}">${esc(ST.extra)}</textarea></div>
    <label class="nt" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="airKeep" ${ST.keep?'checked':''}> ${esc(T('Geometriyani qatʼiy saqlash (bino soni, qavatlar, joylashuv)'))}</label>
    <button class="btn dark" id="airGo" ${BUSY?'disabled':''}>${BUSY?esc(T('Yaratilmoqda… (20–60 soniya)')):esc(T('Render qilish'))+KIC.i('sparkle','a')}</button>
    <p class="er" id="airErr" hidden></p>
    ${RES.length?`<div><span class="lb">${esc(T('Natijalar'))}</span><div class="gal">${RES.map((r,i)=>`<img src="${r.src}" data-i="${i}" alt="${esc(r.name)}" title="${esc(r.name)}">`).join('')}</div><p class="nt" style="margin-top:4px">${esc(T('Rasmni bosing — kattalashtirish, asl bilan solishtirish, albomga yuborish.'))}</p></div>`:''}
  </div>`;
  const $=s=>PN.querySelector(s);
  $('#airX').onclick=close;
  $('#airP').onchange=e=>{ST.prov=e.target.value;save();render();};
  $('#airM').onchange=e=>{ST.model[ST.prov]=e.target.value.trim();save();};
  $('#airK').onchange=e=>{ST.key[ST.prov]=e.target.value.trim();save();};
  PN.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ST.sty=b.dataset.st;save();render();});
  $('#airE').onchange=e=>{ST.extra=e.target.value;save();};
  $('#airKeep').onchange=e=>{ST.keep=e.target.checked;save();};
  $('#airGo').onclick=go;
  PN.querySelectorAll('.gal img').forEach(im=>im.onclick=()=>view(+im.dataset.i));}
function prompt(){const s=STY.find(x=>x[0]===ST.sty)||STY[0],what=O.kind==='bino'?'a single building (architectural 3D massing with windows, balconies and roof)':'an urban master plan / city block (3D massing model of buildings, streets, trees)';
  return `Transform this 3D model screenshot of ${what} into: ${s[2]}.`+
    (ST.keep?' Keep EXACTLY the same camera angle, framing, composition and perspective. Keep every building in the same position with the same footprint, height, number of floors, roof shape and window rhythm; keep the street layout and block shapes. Do not add or remove buildings.':' Keep the overall composition and camera angle.')+
    ' Do not add any text, labels, watermarks or borders.'+(ST.extra.trim()?' Additional instructions: '+ST.extra.trim():'');}
function err(m){const e=PN&&PN.querySelector('#airErr');if(e){e.hidden=false;e.textContent=m;}}
/* rasm: uzun tomoni 1536 px, JPEG */
function shrink(src,max){return new Promise(ok=>{const im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);ok({url:c.toDataURL('image/jpeg',.92),w:c.width,h:c.height});};im.src=src;});}
const ARS=[['1:1',1],['4:3',4/3],['3:2',1.5],['16:9',16/9],['21:9',21/9],['3:4',.75],['2:3',2/3],['9:16',9/16]];
const nearAR=a=>ARS.reduce((b,x)=>Math.abs(Math.log(x[1]/a))<Math.abs(Math.log(b[1]/a))?x:b)[0];
async function go(){if(BUSY)return;const key=(ST.key[ST.prov]||'').trim(),model=(ST.model[ST.prov]||PROV[ST.prov].models[0]).trim();
  if(!key){err(T('API kalitini kiriting.'));return;}
  let src;try{src=O.grab();}catch(e){src=null;}if(!src){err(T('3D koʻrinish rasmini olib boʻlmadi.'));return;}
  BUSY=true;render();const img=await shrink(src,1536),P=prompt();
  try{const out=await (ST.prov==='gemini'?gemini:ST.prov==='openai'?openai:openrouter)(key,model,P,img);
    const sty=(STY.find(x=>x[0]===ST.sty)||STY[0])[1];RES.unshift({src:out,orig:img.url,name:`${O.title||T('AI render')} · ${T(sty)} · ${model}`,prompt:P});}
  catch(e){BUSY=false;render();err(T('Xato')+': '+(e&&e.message||e));return;}
  BUSY=false;render();view(0);}
async function jfetch(url,opt){const r=await fetch(url,opt);const t=await r.text();let j=null;try{j=JSON.parse(t);}catch(_){}
  if(!r.ok){const m=(j&&(j.error&&(j.error.message||j.error)||j.message))||t.slice(0,300);throw new Error(`${r.status} ${typeof m==='string'?m:JSON.stringify(m)}`);}return j;}
async function gemini(key,model,P,img){const b64=img.url.split(',')[1],ar=nearAR(img.w/img.h);
  const body=cfg=>JSON.stringify({contents:[{parts:[{text:P},{inline_data:{mime_type:'image/jpeg',data:b64}}]}],generationConfig:Object.assign({responseModalities:['TEXT','IMAGE']},cfg)});
  const url=v=>`https://generativelanguage.googleapis.com/${v}/models/${encodeURIComponent(model)}:generateContent`;
  /* rasm sozlamalari maydoni versiyaga qarab farq qiladi — ketma-ket urinib koʻriladi */
  const tries=[['v1beta',{imageConfig:{aspectRatio:ar}}],['v1',{responseFormat:{image:{aspectRatio:ar}}}],['v1beta',{}]];let last=null;
  for(const [v,cfg] of tries){try{const j=await jfetch(url(v),{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:body(cfg)});
      const parts=(((j.candidates||[])[0]||{}).content||{}).parts||[];const p=parts.filter(p=>(p.inlineData||p.inline_data)&&!p.thought).pop();
      if(p){const d=p.inlineData||p.inline_data;return `data:${d.mimeType||d.mime_type||'image/png'};base64,${d.data}`;}
      const txt=parts.map(p=>p.text).filter(Boolean).join(' ');throw new Error(T('Model rasm qaytarmadi')+(txt?': '+txt.slice(0,240):''));}
    catch(e){last=e;if(!/^400\b/.test(e.message)&&!/^404\b/.test(e.message))throw e;}}
  throw last;}
async function openai(key,model,P,img){const blob=await (await fetch(img.url)).blob(),fd=new FormData(),a=img.w/img.h;
  fd.append('model',model);fd.append('prompt',P);fd.append('image',blob,'massing.jpg');fd.append('size',a>1.2?'1536x1024':a<.83?'1024x1536':'1024x1024');fd.append('n','1');
  const j=await jfetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+key},body:fd});
  const d=(j.data||[])[0]||{};if(d.b64_json)return 'data:image/png;base64,'+d.b64_json;if(d.url)return d.url;throw new Error(T('Model rasm qaytarmadi'));}
async function openrouter(key,model,P,img){const j=await jfetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key,'X-Title':'Archemistry Lab'},
    body:JSON.stringify({model,modalities:['image','text'],messages:[{role:'user',content:[{type:'text',text:P},{type:'image_url',image_url:{url:img.url}}]}]})});
  const m=((j.choices||[])[0]||{}).message||{},im=(m.images||[])[0];if(im&&im.image_url&&im.image_url.url)return im.image_url.url;
  throw new Error(T('Model rasm qaytarmadi')+(m.content?': '+String(m.content).slice(0,240):''));}
/* koʻrish: katta, asl bilan solishtirish (sudraladigan ajratgich), albom, yuklab olish */
function view(i){const r=RES[i];if(!r)return;const V=document.createElement('div');V.className='airv';let cmp=false;
  const draw=()=>{V.innerHTML=`<div class="airtb"><span>${esc(r.name)}</span><button id="airvC" class="${cmp?'on':''}">${esc(T('Asl bilan solishtirish'))}</button><button id="airvD">${esc(T('Yuklab olish'))}</button>${O.onAlbum?`<button id="airvA">${esc(T('Albomga'))}${KIC.i('arrow-right','a')}</button>`:''}<button id="airvX" aria-label="${esc(T('Yopish'))}">${KIC.i('x')}</button></div>
    <div class="airim">${cmp?`<div class="aircmp"><img src="${r.src}" id="airvI"><div class="b" style="width:50%"><img src="${r.orig}"></div><i style="left:50%"></i></div>`:`<img src="${r.src}">`}</div>`;
    V.querySelector('#airvX').onclick=()=>V.remove();V.querySelector('#airvC').onclick=()=>{cmp=!cmp;draw();};
    V.querySelector('#airvD').onclick=()=>{const a=document.createElement('a');a.href=r.src;a.download='ai-render.png';document.body.appendChild(a);a.click();a.remove();};
    const al=V.querySelector('#airvA');if(al)al.onclick=()=>{al.disabled=true;Promise.resolve(O.onAlbum(r.src,r.name,r.prompt)).then(()=>{al.innerHTML=KIC.i('check','b')+esc(T('Yuborildi'));}).catch(e=>{al.textContent=T('Xato');al.disabled=false;});};
    if(cmp){const box=V.querySelector('.aircmp'),b=box.querySelector('.b'),ln=box.querySelector('i'),im=box.querySelector('#airvI');
      const fit=()=>{b.querySelector('img').style.width=im.clientWidth+'px';b.querySelector('img').style.height=im.clientHeight+'px';};im.onload=fit;fit();
      box.onpointermove=e=>{if(!(e.buttons&1)&&e.pointerType==='mouse'&&!box._d)return;const rc=box.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-rc.left)/rc.width));b.style.width=x*100+'%';ln.style.left=x*100+'%';};
      box.onpointerdown=e=>{box._d=1;box.setPointerCapture(e.pointerId);box.onpointermove(e);};box.onpointerup=()=>{box._d=0;};}};
  draw();V.addEventListener('click',e=>{if(e.target===V)V.remove();});document.body.appendChild(V);}
window.AIRENDER={open,close};
})();
