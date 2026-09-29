try{if(window.top!==window.self)document.getElementById('frameWarn').hidden=false;}catch(e){document.getElementById('frameWarn').hidden=false;}
/* ---------- Element kutubxonasi ---------- */
const LIB={
  facade:{n:'Fasad zonasi',a:'Fasad',c:'ped',w:.6,col:'#d9d0bd'},
  walk:{n:'Piyoda oʻtish zonasi',a:'Piyoda',c:'ped',w:2.4,col:'#ebe2cf',capM:[3000,3000]},
  shared:{n:'Umumiy sirt (shared space)',a:'Umumiy',c:'ped',w:6,col:'#e2d5b6'},
  furn:{n:'Jihozlar zonasi (skameyka, chiroq)',a:'Jihoz',c:'other',w:1.2,col:'#cfc3a8'},
  trees:{n:'Daraxt qatori',a:'Daraxt',c:'green',w:2,col:'#8cb36b',tree:1},
  ariq:{n:'Ariq + daraxt qatori',a:'Ariq',c:'green',w:1.2,col:'#7fb0a8',tree:1,ariq:1},
  lawn:{n:'Maysazor',a:'Maysa',c:'green',w:1.5,col:'#a9c98a'},
  bike1:{n:'Velo yoʻlak (1 yoʻnalish)',a:'Velo',c:'bike',w:1.8,col:'#4fa585',capM:[2500,2500]},
  bike2:{n:'Velo yoʻlak (2 yoʻnalish)',a:'Velo ⇅',c:'bike',w:3,col:'#3e9a74',capM:[2500,2500]},
  buffer:{n:'Himoya bufer',a:'Bufer',c:'other',w:.6,col:'#d6d1c6'},
  park:{n:'Parkovka (parallel)',a:'Park.',c:'park',w:2.4,col:'#6e7178',road:1},
  lane:{n:'Avto harakat boʻlagi',a:'Avto',c:'car',w:3.3,col:'#4b4e55',road:1,cap:[600,1600]},
  mixed:{n:'Aralash boʻlak (avto + avtobus)',a:'Avto+A',c:'car',w:3.5,col:'#5d585a',road:1,cap:[1000,2800]},
  bus:{n:'Ajratilgan avtobus boʻlagi',a:'Avtobus',c:'transit',w:3.5,col:'#bf5a4d',road:1,cap:[4000,8000]},
  tram:{n:'Ajratilgan tramvay yoʻli',a:'Tramvay',c:'transit',w:3.3,col:'#b8894f',road:1,cap:[10000,25000]},
  median:{n:'Ajratuvchi / piyoda orolchasi',a:'Orolcha',c:'other',w:2,col:'#b9c4a6',refuge:1},
  // qoʻshimcha elementlar (v16)
  parklet:{n:'Parklet (parkovka oʻrnida oʻtirish joyi)',a:'Parklet',c:'ped',w:2.2,col:'#c9a877'},
  busstop:{n:'Bekat maydonchasi / platforma',a:'Bekat',c:'ped',w:3,col:'#d9cfb8'},
  kiosk:{n:'Kiosk / savdo qatori',a:'Kiosk',c:'other',w:2.5,col:'#c2b59b'},
  rain:{n:'Yomgʻir bogʻi (bioswale)',a:'Yomgʻir',c:'green',w:2,col:'#6f9f7c'},
  water:{n:'Kanal / suv yoqasi',a:'Suv',c:'green',w:3,col:'#7fb2cf'},
  bikepark:{n:'Veloparkovka',a:'V-park',c:'bike',w:2,col:'#7fb3a5'},
  bikeprot:{n:'Himoyalangan velo yoʻlak (bordyur bilan)',a:'Velo+',c:'bike',w:2.2,col:'#3f917d',capM:[2500,2500]},
  park30:{n:'Parkovka — 30° burchakli',a:'P 30°',c:'park',w:4.7,col:'#858891',road:1,sp:5},
  park45:{n:'Parkovka — 45° burchakli',a:'P 45°',c:'park',w:5.3,col:'#81848d',road:1,sp:3.54},
  park90:{n:'Parkovka — perpendikulyar (90°)',a:'P 90°',c:'park',w:5,col:'#7d8089',road:1,sp:2.5},
  parkkerb:{n:'Parkovka — trotuar ustida (yarim)',a:'P ½',c:'park',w:1.2,col:'#a3a6ad'},
  loading:{n:'Yuk tushirish / taksi zonasi',a:'Yuk/taksi',c:'park',w:2.5,col:'#9a8f7c',road:1},
  turn:{n:'Burilish boʻlagi (markaziy/choʻntak)',a:'Burilish',c:'car',w:3.25,col:'#62676d',road:1},
  hatch:{n:'Chiziqli ajratuvchi (shtrixlangan)',a:'Shtrix',c:'other',w:1.5,col:'#70757b',road:1},
  brt:{n:'BRT yoʻlagi (toʻsiq bilan ajratilgan)',a:'BRT',c:'transit',w:3.5,col:'#a33d31',road:1,cap:[6000,12000]},
  island:{n:'Xavfsizlik orolchasi (bordyurli)',a:'Orol',c:'other',w:2,col:'#c8c0ab',refuge:1},
  shoulder:{n:'Yoʻl yoqasi (obochina)',a:'Yoqa',c:'other',w:1.5,col:'#b9ae96'},
  barrier:{n:'Shovqin / himoya toʻsigʻi',a:'Toʻsiq',c:'other',w:.5,col:'#9aa0a6'},
};
const LIBG=[['Piyoda',['facade','walk','shared','furn','parklet','busstop','kiosk']],['Yashil va suv',['trees','ariq','lawn','rain','water']],['Velo',['bike1','bike2','bikeprot','bikepark']],
  ['Parkovka',['park','park30','park45','park90','parkkerb','loading']],['Avto',['lane','mixed','turn']],['Jamoat transporti',['bus','brt','tram']],['Ajratuvchi va boshqa',['median','island','hatch','buffer','shoulder','barrier']]];
const DARK=new Set(['lane','mixed','bus','park','bike2','bike1','tram','park30','park45','park90','loading','turn','hatch','brt','bikeprot']);
const CATS={ped:['Piyoda','#d8c492'],green:['Yashil','#7fae6a'],bike:['Velo','#3c8676'],transit:['Jamoat transporti','#b8483a'],car:['Avto harakat','#5b6065'],park:['Parkovka','#8c8f97'],other:['Boshqa','#b3bca6']};

let _id=0; const mk=(k,w)=>({id:++_id,k,w:+(w??LIB[k].w).toFixed(2)});
const sum=p=>p.reduce((a,e)=>a+e.w,0);
const f1=x=>(Math.round(x*10)/10).toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1});
const f2=x=>x.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const fi=x=>Math.round(x).toLocaleString('ru-RU');
const clone=o=>JSON.parse(JSON.stringify(o));

function sample(){
  return {
    design:{nodes:[],segs:[],nid:1,sid:1,preset:'r4',tool:'draw',sel:null,src:{},thr:{laneMin:2.75,laneMax:3.75,cw:4,parkGap:5}},
    row:25, len:80, mode:'pick', view:'pr', active:'pr', sel:{ex:null,pr:null}, sat:false, app:'area', base:'img', area:null,
    site:null, measure:null, draw:[],
    set:{treeSp:8, parkLen:6, speed:1.0},
    thr:{walkMin:2.0, laneMax:3.5, crossMax:14, treeW:1.5},
    prof:{
      ex:[mk('walk',2),mk('ariq',1),mk('park',2.5),mk('lane',3.5),mk('lane',3.5),mk('lane',3.5),mk('lane',3.5),mk('park',2.5),mk('ariq',1),mk('walk',2)],
      pr:[mk('walk',2.6),mk('ariq',1.2),mk('bike1',1.8),mk('buffer',.5),mk('bus',3.3),mk('lane',3.1),mk('lane',3.1),mk('bus',3.3),mk('buffer',.5),mk('bike1',1.8),mk('ariq',1.2),mk('walk',2.6)]
    }
  };
}
let S=sample();
try{const s=JSON.parse(localStorage.getItem('kps_v1')||'null'); if(s&&s.prof){S=Object.assign(sample(),s); S.draw=[]; S.mode='pick';
  _id=Math.max(0,...S.prof.ex.map(e=>e.id),...S.prof.pr.map(e=>e.id));}}catch(e){}
function save(){try{localStorage.setItem('kps_v1',JSON.stringify(S))}catch(e){}}

/* ---------- Metrikalar ---------- */
function metrics(p){
  const L=S.len, m={w:sum(p),cat:{},capLo:0,capHi:0,lanes:0,cross:0,trees:0,parking:0,greenA:0,roadA:0,walkMinSide:Infinity,laneMaxW:0,walkW:0};
  Object.keys(CATS).forEach(c=>m.cat[c]=0);
  let run=0;
  p.forEach(e=>{
    const d=LIB[e.k]; m.cat[d.c]+=e.w;
    if(d.cap){m.capLo+=d.cap[0];m.capHi+=d.cap[1];}
    if(d.capM){m.capLo+=d.capM[0]*e.w;m.capHi+=d.capM[1]*e.w;}
    if(e.k==='lane'||e.k==='mixed'||e.k==='bus'||e.k==='brt'){m.lanes++; if(e.k!=='bus'&&e.k!=='brt') m.laneMaxW=Math.max(m.laneMaxW,e.w);}
    if(e.k==='walk'||e.k==='shared'){m.walkW+=e.w; m.walkMinSide=Math.min(m.walkMinSide,e.w);}
    if(d.tree && e.w>=0.8) m.trees+=Math.floor(L/S.set.treeSp)+1;
    if(d.c==='park'&&e.k!=='loading') m.parking+=Math.floor(L/(d.sp||S.set.parkLen));
    if(d.c==='green') m.greenA+=e.w*L;
    if(d.road||d.c==='bike') m.roadA+=e.w*L;
    if(d.road){run+=e.w; m.cross=Math.max(m.cross,run);} else if(!(d.c==='bike'||e.k==='buffer')||d.refuge){ if(d.refuge&&e.w<1.5){} else run=0; }
  });
  if(m.walkMinSide===Infinity) m.walkMinSide=0;
  m.crossT=m.cross/S.set.speed;
  return m;
}

/* ---------- Kesim (SVG) ---------- */
function sectionSVG(p,sc,W){
  const skyM=8, base=20+skyM*sc, H=base+46, x0=24, tot=sum(p);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Golos Text, system-ui, sans-serif">`;
  // binolar
  const bh=Math.min(base-6,7*sc);
  s+=`<rect x="0" y="${base-bh}" width="${x0-4}" height="${bh}" fill="#9aa19c"/>`;
  s+=`<rect x="${x0+tot*sc+4}" y="${base-bh}" width="${x0-4}" height="${bh}" fill="#9aa19c"/>`;
  let x=x0;
  p.forEach(e=>{
    const d=LIB[e.k], w=e.w*sc, cx=x+w/2, raised=!d.road&&d.c!=='bike';
    const top=raised?base-0.15*sc:base;
    s+=`<rect x="${x}" y="${top}" width="${w}" height="${base+10-top}" fill="${d.col}" stroke="#1c2628" stroke-width=".4"/>`;
    const m=v=>v*sc;
    if(e.k==='lane'||(d.c==='park'&&d.road)||e.k==='mixed'||e.k==='turn'){const cw=Math.min(w*.72,m(1.8)),ch=m(1.45);s+=`<rect x="${cx-cw/2}" y="${base-ch}" width="${cw}" height="${ch}" rx="${m(.3)}" fill="#e9ecef" stroke="#3b4146" stroke-width=".8"/><rect x="${cx-cw/2+cw*.12}" y="${base-ch+ch*.15}" width="${cw*.76}" height="${ch*.35}" fill="#9fb4c3"/>`;}
    if(e.k==='mixed'||e.k==='bus'||e.k==='brt'){if(e.k==='bus'||true){const bw=Math.min(w*.8,m(2.5)),bh2=m(3.1);if(e.k==='bus')s+=`<rect x="${cx-bw/2}" y="${base-bh2}" width="${bw}" height="${bh2}" rx="${m(.25)}" fill="#d9574a" stroke="#6b231b" stroke-width=".8"/><rect x="${cx-bw/2+bw*.1}" y="${base-bh2+bh2*.12}" width="${bw*.8}" height="${bh2*.3}" fill="#f3d8d3"/>`;}}
    if(e.k==='tram'){const bw=Math.min(w*.85,m(2.6)),bh2=m(3.4);s+=`<line x1="${cx}" y1="${base-bh2}" x2="${cx}" y2="${base-bh2-m(1.2)}" stroke="#3b4146"/><line x1="${cx-m(.6)}" y1="${base-bh2-m(1.2)}" x2="${cx+m(.6)}" y2="${base-bh2-m(1.2)}" stroke="#3b4146"/><rect x="${cx-bw/2}" y="${base-bh2}" width="${bw}" height="${bh2}" rx="${m(.3)}" fill="#e39a45" stroke="#6b421b" stroke-width=".8"/><rect x="${cx-bw/2+bw*.1}" y="${base-bh2+bh2*.12}" width="${bw*.8}" height="${bh2*.3}" fill="#fbe8cf"/>`;}
    if(e.k==='bike1'||e.k==='bike2'){const r=m(.33);const n=e.k==='bike2'?2:1;for(let i=0;i<n;i++){const bx=x+w*(i+1)/(n+1);s+=`<circle cx="${bx}" cy="${base-r}" r="${r}" fill="none" stroke="#123" stroke-width="1.1"/><line x1="${bx}" y1="${base-r}" x2="${bx}" y2="${base-m(1.25)}" stroke="#123" stroke-width="1.4"/><circle cx="${bx}" cy="${base-m(1.45)}" r="${m(.13)}" fill="#123"/>`;}}
    if(e.k==='walk'||e.k==='shared'||e.k==='facade'&&e.w>=1){const n=Math.max(1,Math.min(3,Math.floor(e.w/1.6)));for(let i=0;i<n;i++){const px=x+w*(i+1)/(n+1),h=m(1.7);s+=`<line x1="${px}" y1="${top}" x2="${px}" y2="${top-h*.85}" stroke="#2a3133" stroke-width="${Math.max(1.4,m(.12))}" stroke-linecap="round"/><circle cx="${px}" cy="${top-h*.93}" r="${Math.max(2,m(.12))}" fill="#2a3133"/>`;}}
    if(d.tree&&e.w>=0.8||e.k==='median'&&e.w>=1.5){const th=m(e.k==='median'?2.2:3),cr=Math.min(m(e.k==='median'?1.3:2.4),Math.max(w*.9,m(1.4)));s+=`<rect x="${cx-m(.12)}" y="${top-th}" width="${m(.24)}" height="${th}" fill="#6b4f35"/><circle cx="${cx}" cy="${top-th-cr*.6}" r="${cr}" fill="#5e9a4c" fill-opacity=".85" stroke="#3f6e33" stroke-width=".6"/>`;}
    if(d.ariq){const aw=Math.min(w*.55,m(.7));s+=`<path d="M${cx-aw/2} ${top} L${cx-aw/3} ${top+m(.5)} L${cx+aw/3} ${top+m(.5)} L${cx+aw/2} ${top} Z" fill="#4c8fb0"/>`;}
    if(e.k==='lawn'){for(let gx=x+3;gx<x+w-2;gx+=5)s+=`<line x1="${gx}" y1="${top}" x2="${gx+1.5}" y2="${top-4}" stroke="#4f7f3c"/>`;}
    if(e.k==='furn'&&e.w>=.8){s+=`<line x1="${cx}" y1="${top}" x2="${cx}" y2="${top-m(4.5)}" stroke="#3b4146" stroke-width="1.2"/><line x1="${cx}" y1="${top-m(4.5)}" x2="${cx+m(.7)}" y2="${top-m(4.5)}" stroke="#3b4146" stroke-width="1.2"/>`;}
    // yorliqlar
    s+=`<text x="${cx}" y="${base+24}" font-size="10" text-anchor="middle" font-family="JetBrains Mono, monospace" fill="currentColor">${e.w.toFixed(e.w%1?2:0).replace(/0$/,'')}</text>`;
    if(w>=26) s+=`<text x="${cx}" y="${base+37}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".75">${d.a}</text>`;
    x+=w;
  });
  s+=`<line x1="${x0}" y1="${base+10}" x2="${x}" y2="${base+10}" stroke="currentColor" stroke-width=".6"/>`;
  s+=`</svg>`;
  return s;
}

/* ---------- Xarita ---------- */
const map=L.map('map',{zoomControl:true}).setView(S.site?.center||[41.3111,69.2797],S.site?17:15);
const ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
const BASES={
  img:[L.tileLayer(ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:19,attribution:'Sunʼiy yoʻldosh: Esri World Imagery'})],
  street:[L.tileLayer(ESRI+'World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:19,attribution:'Esri World Street Map'})],
};
const CARTO='https://{s}.basemaps.cartocdn.com/rastertiles/';
const osmBnd=L.layerGroup();
BASES.imgl=[BASES.img[0],L.tileLayer(CARTO+'voyager_only_labels/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:21,maxNativeZoom:20,attribution:'Nomlar: © OpenStreetMap, © CARTO'}),osmBnd];
BASES.osm=[L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,maxNativeZoom:19,attribution:'© OpenStreetMap hissadorlari'})];
BASES.carto=[L.tileLayer(CARTO+'voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:21,maxNativeZoom:20,attribution:'© OpenStreetMap, © CARTO'})];
let curBase=null;
/* Google Map Tiles API — faqat foydalanuvchining oʻz API kaliti bilan (rasmiy yoʻl) */
async function googleBase(){
  let key=S.gkey;
  if(!key){key=(window.prompt('Google Map Tiles API kaliti (Google Cloud Console → Map Tiles API yoqilgan boʻlishi kerak). Kalit faqat shu brauzerda saqlanadi:')||'').trim();if(!key)return null;}
  try{const r=await fetch('https://tile.googleapis.com/v1/createSession?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mapType:'satellite',language:'uz-UZ',region:'UZ'})});
    const j=await r.json();if(!r.ok||!j.session)throw new Error(j.error?.message||('HTTP '+r.status));
    S.gkey=key;save();
    return [L.tileLayer(`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${j.session}&key=${encodeURIComponent(key)}`,{maxZoom:22,maxNativeZoom:21,attribution:'Tasvir: © Google'})];
  }catch(e){toast('Google tasviri ochilmadi: '+e.message);S.gkey=null;save();return null;}
}
async function setBase(k){
  let lay=BASES[k];
  if(k==='google'){lay=BASES.google||await googleBase();if(lay)BASES.google=lay;else k=S.base&&S.base!=='google'?S.base:'img',lay=BASES[k];}
  if(curBase)curBase.forEach(l=>map.removeLayer(l));curBase=lay||BASES.img;curBase.forEach(l=>l.addTo(map));S.base=k;document.getElementById('baseSel').value=k;save();
  if(k==='imgl')setTimeout(loadBoundaries,0);
}
document.getElementById('baseSel').onchange=e=>setBase(e.target.value);
/* OSM maʼmuriy chegaralari (Overpass) — sunʼiy yoʻldosh ustida */
let bndKey='',bndT=0;
async function loadBoundaries(){
  if(S.base!=='imgl')return;const z=map.getZoom();if(z<8){osmBnd.clearLayers();return;}
  const b=map.getBounds().pad(.2),bb=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].map(v=>v.toFixed(3)).join(','),lv=z>=12?'4|5|6|8':z>=10?'2|4|5|6':'2|4';
  const key=bb+lv;if(key===bndKey)return;bndKey=key;
  try{const out=[];for(const l of lv.split('|')){const el=await overpassRaw(`rel[boundary=administrative][admin_level=${l}](${bb});way(r)(${bb});out geom;`);out.push([+l,el.filter(e=>e.type==='way'&&e.geometry)]);}
    if(key!==bndKey)return;osmBnd.clearLayers();
    const st={2:{color:'#ffffff',weight:3.5,dashArray:null},4:{color:'#ffd24d',weight:2.5,dashArray:'8 5'},5:{color:'#ffd24d',weight:2,dashArray:'4 4'},6:{color:'#ffe9a8',weight:1.6,dashArray:'6 4'},8:{color:'#fff3cf',weight:1,dashArray:'2 4'}};
    out.forEach(([l,ws])=>ws.forEach(w=>L.polyline(w.geometry.map(g=>[g.lat,g.lon]),Object.assign({interactive:false,opacity:.95},st[l])).addTo(osmBnd)));
  }catch(e){bndKey='';}
}
map.on('moveend',()=>{clearTimeout(bndT);bndT=setTimeout(loadBoundaries,700);});
setBase(S.base||'img');
L.control.scale({imperial:false,maxWidth:160,position:'bottomright'}).addTo(map);
const planL=L.layerGroup().addTo(map), measL=L.layerGroup().addTo(map), drawL=L.layerGroup().addTo(map);
function renderBase(){}

const R=Math.PI/180;
const toXY=(ll,o)=>[(ll[1]-o[1])*Math.cos(o[0]*R)*111320,(ll[0]-o[0])*110574];
const toLL=(p,o)=>[o[0]+p[1]/110574,o[1]+p[0]/(Math.cos(o[0]*R)*111320)];
function cumLen(pts){const c=[0];for(let i=1;i<pts.length;i++)c.push(c[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return c;}
function project(pts,p){let best={d:Infinity,s:0};const c=cumLen(pts);for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1e-9;let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const q=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<best.d)best={d,s:c[i]+t*Math.sqrt(l2)};}return best;}
function pointAt(pts,c,s){for(let i=1;i<pts.length;i++){if(c[i]>=s){const t=(s-c[i-1])/((c[i]-c[i-1])||1e-9);return[pts[i-1][0]+t*(pts[i][0]-pts[i-1][0]),pts[i-1][1]+t*(pts[i][1]-pts[i-1][1])];}}return pts[pts.length-1];}
function subLine(pts,a,b){const c=cumLen(pts),out=[pointAt(pts,c,a)];for(let i=1;i<pts.length-1;i++)if(c[i]>a&&c[i]<b)out.push(pts[i]);out.push(pointAt(pts,c,b));return out;}
function offsetLine(pts,d){const n=pts.length,N=[];for(let i=0;i<n-1;i++){const dx=pts[i+1][0]-pts[i][0],dy=pts[i+1][1]-pts[i][1],l=Math.hypot(dx,dy)||1e-9;N.push([-dy/l,dx/l]);}
  return pts.map((p,i)=>{const a=N[Math.max(0,i-1)],b=N[Math.min(n-2,i)];let mx=a[0]+b[0],my=a[1]+b[1];const ml=Math.hypot(mx,my)||1;mx/=ml;my/=ml;const k=d/Math.max(mx*b[0]+my*b[1],.35);return[p[0]+mx*k,p[1]+my*k];});}

function clippedAxis(){
  const st=S.site; if(!st||!st.full) return null;
  const o=st.full[0], xy=st.full.map(ll=>toXY(ll,o)), c=cumLen(xy), total=c[c.length-1];
  const s0=st.anchor!=null?Math.min(st.anchor,total):total/2;
  let a=Math.max(0,s0-S.len/2), b=Math.min(total,a+S.len); a=Math.max(0,b-S.len);
  return {o,xy:subLine(xy,a,b),len:b-a};
}
let stripsG=null,drP=0;
function axisMenu(e,pre){stopE(e);openMenu(e.containerPoint,[...(pre||[]),{h:'Koʻcha oʻqi'+(S.site&&S.site.name?' · '+S.site.name:'')},
  {t:'Profil qatlamini yashirish / koʻrsatish',f:()=>{S.view=S.view==='none'?S.active:'none';renderTabs();renderPlan();save();}},
  {t:'Oʻqni teskari qilish',f:()=>{const ax=clippedAxis();if(!ax)return;S.site.full=ax.xy.map(q=>toLL(q,ax.o)).reverse();S.site.anchor=null;S.site.off=-(S.site.off||0);Object.keys(S.prof).forEach(k=>S.prof[k].reverse());renderAll();save();}},
  {t:'Oʻqni va profilni oʻchirish',danger:1,f:delAxis}]);}
function delAxis(){const prev=clone(S);S.site=null;renderAll();renderPlan();save();toast('Koʻcha oʻqi oʻchirildi.',()=>{S=prev;renderAll();renderPlan();save();});}
function drawPlanStrips(G){
  G.clearLayers();const ax=clippedAxis();if(!ax)return;
  L.polyline(ax.xy.map(q=>toLL(q,ax.o)),{color:'#b8672a',weight:14,opacity:0,bubblingMouseEvents:false}).on('contextmenu',axisMenu).bindTooltip('Koʻcha oʻqi — oʻng tugma: menyu, nuqtalarni sudrang',{sticky:true}).addTo(G);
  L.polyline(ax.xy.map(q=>toLL(q,ax.o)),{color:'#b8672a',weight:2,dashArray:'6 5',interactive:false}).addTo(G);
  if(S.view==='none')return;
  const w=S.view,p=S.prof[w],tot=sum(p),off=(S.site&&S.site.off)||0;let cum=0;
  p.forEach(e=>{
    const d=LIB[e.k], d1=off+tot/2-cum, d2=d1-e.w; cum+=e.w;
    const A=offsetLine(ax.xy,d1), B=offsetLine(ax.xy,d2).reverse(), on=S.sel[w]===e.id;
    const pg=L.polygon([...A,...B].map(q=>toLL(q,ax.o)),{color:on?'#f4c542':'#1c2628',weight:on?3:.6,fillColor:d.col,fillOpacity:.72}).bindTooltip(`${d.n} · ${f2(e.w)} m — bosib tanlang`,{sticky:true}).addTo(G);
    pg.on('click',ev=>{L.DomEvent.stop(ev);S.active=w;S.sel[w]=S.sel[w]===e.id?null:e.id;renderTabs();renderEditor();drawPlanStrips(G);});
    pg.on('contextmenu',ev=>axisMenu(ev,[{h:`${d.n} · ${f2(e.w)} m`},{t:'Tanlash (muharrirda)',f:()=>{S.active=w;S.sel[w]=e.id;renderTabs();renderEditor();drawPlanStrips(G);}},
      {t:'Elementni oʻchirish',danger:1,f:()=>{const i=p.indexOf(e);if(i>=0&&p.length>1){p.splice(i,1);if(w==='ex')S.row=+sum(p).toFixed(2);renderAll();save();}}},'-']));
    if(d.tree&&e.w>=.8){const mid=offsetLine(ax.xy,(d1+d2)/2),c=cumLen(mid),T=c[c.length-1];for(let s=S.set.treeSp/2;s<=T;s+=S.set.treeSp)L.circleMarker(toLL(pointAt(mid,c,s),ax.o),{interactive:false,radius:Math.max(3,Math.min(9,map.getZoom()-12)),color:'#3f6e33',weight:1,fillColor:'#5e9a4c',fillOpacity:.7}).addTo(G);}
  });
  [off+tot/2,off-tot/2].forEach(d=>L.polyline(offsetLine(ax.xy,d).map(q=>toLL(q,ax.o)),{color:'#d0342c',weight:2.5,interactive:false}).addTo(G));
}
function renderPlan(){
  planL.clearLayers();
  const ax=clippedAxis(); if(!ax) return;
  stripsG=L.layerGroup().addTo(planL);
  drawPlanStrips(stripsG);
  // oʻq nuqtalari — sudrab tahrirlash
  const vic=L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],html:'<div style="width:14px;height:14px;background:#fff;border:2px solid #b8672a;border-radius:3px;cursor:grab;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>'});
  const axPts=ax.xy.map(q=>toLL(q,ax.o));let axDrag=0;
  const soonA=()=>{if(!drP)drP=requestAnimationFrame(()=>{drP=0;drawPlanStrips(stripsG);});};
  axPts.forEach((pt,i)=>{const m=L.marker(pt,{draggable:true,icon:vic,zIndexOffset:900,title:'Oʻq nuqtasi — sudrang; oʻng tugma: menyu'}).addTo(planL);
    m.on('dragstart',()=>{S.site.full=axPts.map(p=>p.slice());S.site.anchor=null;if(S.site.src==='osm')S.site.src='osm+';axDrag=1;});
    m.on('drag',ev=>{const g=ev.target.getLatLng();S.site.full[i]=[g.lat,g.lng];const o=S.site.full[0],c=cumLen(S.site.full.map(q=>toXY(q,o)));S.len=Math.max(5,Math.ceil(c[c.length-1]));soonA();});
    m.on('dragend',()=>{axDrag=0;renderAll();save();});
    m.on('contextmenu',e=>{stopE(e);openMenu(e.containerPoint,[{h:'Oʻq nuqtasi'},
      axPts.length>2?{t:'Nuqtani oʻchirish',danger:1,f:()=>{S.site.full=axPts.filter((_,k)=>k!==i);S.site.anchor=null;const o=S.site.full[0],c=cumLen(S.site.full.map(q=>toXY(q,o)));S.len=Math.max(5,Math.ceil(c[c.length-1]));renderAll();save();}}:null,
      i<axPts.length-1?{t:'Keyingi nuqta bilan orasiga nuqta qoʻshish',f:()=>{S.site.full=axPts.slice();S.site.full.splice(i+1,0,mid(axPts[i],axPts[i+1]));S.site.anchor=null;renderAll();save();}}:null,
      '-',{t:'Oʻqni va profilni oʻchirish',danger:1,f:delAxis}]);});});
  if(S.view==='none') return;
  const w=S.view,p=S.prof[w];if(!S.site||!p.length)return;
  const c=cumLen(ax.xy),T=c[c.length-1],f=frameAt(ax.xy,c,T/2);
  const P=d=>toLL([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d],ax.o), proj=ll=>{const q=toXY([ll.lat,ll.lng],ax.o);return (q[0]-f.p[0])*f.n[0]+(q[1]-f.p[1])*f.n[1];};
  const ico=(bg,tx)=>L.divIcon({className:'',iconSize:[24,24],iconAnchor:[12,12],html:`<div style="width:24px;height:24px;border-radius:50%;background:${bg};border:2px solid #1c2628;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:grab;display:flex;align-items:center;justify-content:center;font:700 13px sans-serif;color:#1c2628">${tx}</div>`});
  const soon=()=>{if(!drP)drP=requestAnimationFrame(()=>{drP=0;drawPlanStrips(stripsG);});};
  const done=()=>{if(w==='ex')S.row=+sum(p).toFixed(2);renderAll();save();};
  const mkH=side=>{const off=S.site.off||0,tot=sum(p);const m=L.marker(P(side>0?off+tot/2:off-tot/2),{draggable:true,zIndexOffset:1000,icon:ico('#fff','↔'),title:'Chetni sudrang — chekka element eni oʻzgaradi'}).addTo(planL);
    m.on('drag',ev=>{const dn=proj(ev.target.getLatLng()),it=side>0?p[0]:p[p.length-1],o0=S.site.off||0,t0=sum(p),edge=side>0?o0+t0/2:o0-t0/2;
      const nw=Math.max(.3,+(it.w+side*(dn-edge)).toFixed(2)),real=nw-it.w;it.w=nw;S.site.off=+(o0+side*real/2).toFixed(3);soon();});
    m.on('dragend',done);};
  const mkC=()=>{const m=L.marker(P(S.site.off||0),{draggable:true,zIndexOffset:1000,icon:ico('#f4c542','✥'),title:'Butun profilni koʻndalangiga siljiting'}).addTo(planL);
    m.on('drag',ev=>{S.site.off=+proj(ev.target.getLatLng()).toFixed(2);soon();});m.on('dragend',done);};
  mkH(1);mkH(-1);mkC();
}
map.on('zoomend',renderPlan);

/* ---------- OSM: ko'cha tanlash ---------- */
const HW='^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service)(_link)?$';
const OVERPASS=['https://overpass-api.de/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function overpassRaw(q){
  let err;
  for(const u of [OVERPASS[0],...OVERPASS]){const c=new AbortController(),tm=setTimeout(()=>c.abort(),45000);
    try{const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent('[out:json][timeout:60];'+q),signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();clearTimeout(tm);return j.elements;}catch(e){clearTimeout(tm);err=e;}}
  throw err||new Error('Overpass');
}
async function overpass(q){return (await overpassRaw(q)).filter(e=>e.type==='way'&&e.geometry);}
async function pickStreet(ll){
  hint('OpenStreetMap dan koʻcha maʼlumoti olinmoqda…');
  try{
    const near=await overpass(`way(around:30,${ll.lat},${ll.lng})[highway~"${HW}"];out geom;`);
    if(!near.length){hint('Bu nuqtada 30 m radiusda koʻcha topilmadi. Koʻcha oʻqiga yaqinroq bosing yoki «Oʻqni chizish» rejimidan foydalaning.');return;}
    const o=[ll.lat,ll.lng], P=[0,0];
    near.forEach(w=>w._d=project(w.geometry.map(g=>toXY([g.lat,g.lon],o)),P).d);
    near.sort((a,b)=>a._d-b._d); const w0=near[0], t=w0.tags||{};
    let ways=[w0];
    try{
      const nm=t.name?`["name"="${t.name.replace(/"/g,'\\"')}"]`:'';
      ways=await overpass(`way(around:${Math.max(120,S.len*1.2)},${ll.lat},${ll.lng})[highway="${t.highway}"]${nm};out geom;`);
      if(!ways.find(w=>w.id===w0.id)) ways.push(w0);
    }catch(e){}
    // zanjir
    let nodes=[...w0.nodes], geom=w0.geometry.map(g=>[g.lat,g.lon]); const used=new Set([w0.id]); let grew=true,guard=0;
    while(grew&&guard++<40){grew=false;for(const w of ways){if(used.has(w.id))continue;const g=w.geometry.map(q=>[q.lat,q.lon]),a=w.nodes[0],b=w.nodes[w.nodes.length-1],L0=nodes[0],L1=nodes[nodes.length-1];
      if(a===L1){nodes=nodes.concat(w.nodes.slice(1));geom=geom.concat(g.slice(1));}
      else if(b===L1){nodes=nodes.concat([...w.nodes].reverse().slice(1));geom=geom.concat([...g].reverse().slice(1));}
      else if(b===L0){nodes=w.nodes.slice(0,-1).concat(nodes);geom=g.slice(0,-1).concat(geom);}
      else if(a===L0){nodes=[...w.nodes].reverse().slice(0,-1).concat(nodes);geom=[...g].reverse().slice(0,-1).concat(geom);}
      else continue; used.add(w.id);grew=true;}}
    const oo=geom[0], xy=geom.map(q=>toXY(q,oo)), anchor=project(xy,toXY(o,oo)).s;
    const g=guess(t);
    const prev=clone(S);
    S.site={name:t.name||t['name:uz']||'Nomsiz koʻcha',osmId:w0.id,tags:t,full:geom,anchor,center:[ll.lat,ll.lng],notes:g.notes,src:'osm'};
    S.prof.ex=g.items; S.prof.pr=g.items.map(e=>mk(e.k,e.w)); S.row=+sum(g.items).toFixed(2); S.sel={ex:null,pr:null}; S.active='ex';
    renderAll(); save();
    hint(null);
    const ok=await autoProfile();
    toast(ok?'Mavjud profil sunʼiy yoʻldosh + OSM boʻyicha avtomatik aniqlandi. Loyiha shu profildan nusxa.':'Sunʼiy yoʻldosh tahlili boʻlmadi — profil OSM teglaridan taxmin qilindi.',()=>{S=prev;renderAll();save();});
    hint(null);
  }catch(e){hint('OSM bilan bogʻlanib boʻlmadi ('+e.message+'). Internetni tekshiring yoki «Oʻqni chizish» rejimida oʻqni qoʻlda chizing.');}
}
function guess(t){
  const hw=(t.highway||'').replace('_link',''), notes=[];
  if(hw==='pedestrian') return {items:[mk('facade',.6),mk('shared',8),mk('facade',.6)],notes:['Piyoda koʻchasi — umumiy sirt sifatida olindi.']};
  const defL={motorway:6,trunk:6,primary:4,secondary:4,tertiary:2,unclassified:2,residential:2,living_street:1,service:1};
  let lanes=parseInt(t.lanes); if(!lanes){lanes=defL[hw]??2; notes.push(`«lanes» tegi yoʻq — ${lanes} boʻlak deb olindi.`);}
  const big=['motorway','trunk','primary'].includes(hw);
  let lw=big?3.5:3.25; if(t.width&&parseFloat(t.width)>0){lw=Math.min(3.75,Math.max(2.75,parseFloat(t.width)/lanes)); notes.push(`«width»=${t.width} m qatnov qismi boʻyicha boʻlak kengligi ${f2(lw)} m.`);}
  const oneway=t.oneway==='yes'||t.oneway==='1';
  if(oneway&&['trunk','primary','secondary'].includes(hw)) notes.push('Bir yoʻnalishli yoʻl: ehtimol ikki qatnov qismli koʻchaning bir tomoni. Kesimni oʻlchab, ikkinchi tomon boʻlaklarini qoʻshing.');
  const sw=t.sidewalk||t['sidewalk:both']||''; let sL=true,sR=true;
  if(sw){sL=/both|left|yes/.test(sw);sR=/both|right|yes/.test(sw); if(sw==='separate'){sL=sR=true;notes.push('Trotuar OSM da alohida chiziq sifatida chizilgan.');}}
  else notes.push('Trotuar tegi yoʻq — ikki tomonda bor deb olindi.');
  const cyc=k=>/lane|track/.test(t['cycleway:'+k]||t['cycleway:both']||t.cycleway||'');
  const pk=k=>/lane|parallel|street_side|on_street|half_on_kerb/.test(t['parking:'+k]||t['parking:both']||t['parking:lane:'+k]||t['parking:lane:both']||'');
  const side=(k)=>{const a=[];if(k==='left'?sL:sR)a.push(mk('walk',2.25));if(cyc(k))a.push(mk('bike1',1.5));if(pk(k))a.push(mk('park',2.4));return a;};
  const mid=[]; for(let i=0;i<lanes;i++){mid.push(mk('lane',lw)); if(!oneway&&lanes>=4&&big&&i===lanes/2-1) mid.push(mk('median',2));}
  if(!oneway&&lanes>=4&&big) notes.push('Ajratuvchi polosa (2 m) taxminiy qoʻshildi — satellitda tekshiring.');
  const L=side('left'),Rr=side('right').reverse();
  notes.push('Trotuar va boshqa zonalar kengligi taxminiy. Sunʼiy yoʻldosh qatlami va «Kesimni oʻlchash» bilan aniqlang.');
  return {items:[...L,...mid,...Rr],notes};
}

/* ---------- Xarita rejimlari ---------- */
map.on('click',e=>{
  lastLL=e.latlng;
  if(M.tool){measClick(e.latlng);return;}
  if(S.app==='design'){designClick(e.latlng);return;}
  if(S.app==='area'){areaClick(e.latlng);return;}
  if(S.mode==='pick') pickStreet(e.latlng);
  else if(S.mode==='measure'){
    if(!S.measure||S.measure.b){S.measure={a:[e.latlng.lat,e.latlng.lng]};}
    else{S.measure.b=[e.latlng.lat,e.latlng.lng];S.measure.d=map.distance(S.measure.a,S.measure.b);}
    renderMeasure(); renderHint(); save();
  } else if(S.mode==='draw'){S.draw.push([e.latlng.lat,e.latlng.lng]);renderDraw();renderHint();}
});
function renderMeasure(){measL.clearLayers();const m=S.measure;if(!m)return;
  const del=()=>{S.measure=null;renderMeasure();renderHint();save();};
  const menu=e=>{stopE(e);openMenu(e.containerPoint,[{h:'Kesim oʻlchovi'+(m.d?' · '+f2(m.d)+' m':'')},m.b?{t:'Qizil chiziq kengligi qilish',f:()=>{S.row=+m.d.toFixed(2);fit('ex');fit('pr');renderAll();save();}}:null,{t:'Oʻchirish',k:'Delete',danger:1,f:del}]);};
  const vi=L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],html:'<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #b3412f;cursor:grab;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>'});
  let line=null,labM=null;
  const upd=()=>{if(!m.b)return;m.d=map.distance(m.a,m.b);line.setLatLngs([m.a,m.b]);labM.setLatLng([(m.a[0]+m.b[0])/2,(m.a[1]+m.b[1])/2]);labM.setIcon(labIcon());};
  const labIcon=()=>L.divIcon({className:'',html:`<span class="m-label">${f2(m.d)} m <b class="mx" title="Oʻchirish">✕</b></span>`,iconSize:null});
  if(m.b){line=L.polyline([m.a,m.b],{color:'#b3412f',weight:3,bubblingMouseEvents:false}).on('contextmenu',menu).bindTooltip('Oʻng tugma — menyu; uchlarini sudrang',{sticky:true}).addTo(measL);
    labM=L.marker([(m.a[0]+m.b[0])/2,(m.a[1]+m.b[1])/2],{icon:labIcon(),zIndexOffset:800}).addTo(measL);
    labM.on('click',e=>{if(e.originalEvent&&e.originalEvent.target.closest('.mx')){stopE(e);del();}});labM.on('contextmenu',menu);}
  ['a','b'].forEach(k=>{if(!m[k])return;const mk=L.marker(m[k],{draggable:true,icon:vi,zIndexOffset:900}).addTo(measL);
    mk.on('drag',e=>{const g=e.target.getLatLng();m[k]=[g.lat,g.lng];upd();});mk.on('dragend',()=>{renderHint();save();});mk.on('contextmenu',menu);});
}
document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&S.app==='prof'&&S.measure&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();S.measure=null;renderMeasure();renderHint();save();}});
function renderDraw(){drawL.clearLayers();if(S.draw.length){L.polyline(S.draw,{color:'#1f6f7a',weight:3}).addTo(drawL);S.draw.forEach(p=>L.circleMarker(p,{radius:3,color:'#1f6f7a'}).addTo(drawL));}}
function setMode(m){S.mode=m;document.querySelectorAll('#profModes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===m));
  map.getContainer().style.cursor=m==='pick'?'pointer':'crosshair'; if(m!=='draw'){S.draw=[];renderDraw();} renderHint();}
document.querySelectorAll('#profModes button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

let hintMsg=null;
function hint(m){hintMsg=m;renderHint();}
function renderHint(){
  const h=document.getElementById('hint');
  if(S.app==='area'){areaHint(h);return;}
  if(hintMsg){h.innerHTML=hintMsg;return;}
  if(S.mode==='pick') h.innerHTML='<b>Koʻchani tanlash.</b> Xaritada koʻcha oʻqiga bosing — OSM dagi geometriya va teglardan mavjud profil taxmin qilinadi.';
  else if(S.mode==='measure'){const m=S.measure;
    if(m&&m.b) h.innerHTML=`<b>Kesim: <span class="num">${f2(m.d)} m</span></b> (bino/panjara chizigʻidan narigi tomongacha).<div class="row"><button class="btn sm primary" id="applyRow">Qizil chiziq kengligi qilish</button><button class="btn sm" id="clrMeas">Tozalash</button></div>`;
    else h.innerHTML='<b>Kesimni oʻlchash.</b> Sunʼiy yoʻldoshda koʻchaning bir chetini, soʻng qarama-qarshi chetini bosing.';}
  else h.innerHTML=`<b>Oʻqni chizish.</b> Koʻcha oʻqi boʻylab nuqtalar qoʻying (${S.draw.length} ta).<div class="row"><button class="btn sm primary" id="finDraw" ${S.draw.length<2?'disabled':''}>Tugatish</button><button class="btn sm" id="clrDraw">Tozalash</button></div>`;
  const q=id=>document.getElementById(id);
  if(q('applyRow')) q('applyRow').onclick=()=>{S.row=+S.measure.d.toFixed(2);fit('ex');fit('pr');renderAll();save();toast(`Kenglik ${f2(S.row)} m — ikkala profil moslashtirildi`);};
  if(q('clrMeas')) q('clrMeas').onclick=()=>{S.measure=null;renderMeasure();renderHint();save();};
  if(q('clrDraw')) q('clrDraw').onclick=()=>{S.draw=[];renderDraw();renderHint();};
  if(q('finDraw')) q('finDraw').onclick=()=>{const g=S.draw.slice();S.site=Object.assign(S.site&&S.site.src==='osm'?{}:(S.site||{}),{name:(S.site&&S.site.name)||'Qoʻlda chizilgan uchastka',full:g,anchor:null,center:g[0],src:'manual',tags:S.site?.tags||null,notes:S.site?.notes||[]});
    const xy=g.map(p=>toXY(p,g[0])),c=cumLen(xy);S.len=Math.max(10,Math.round(c[c.length-1]));S.draw=[];renderDraw();setMode('pick');renderAll();save();toast('Oʻq chizildi. Profil saqlab qolindi.');};
}

/* ---------- Tahrirlovchi ---------- */
function fit(which){
  const p=S.prof[which]; let diff=S.row-sum(p); if(Math.abs(diff)<.005) return;
  let tgt=p.filter(e=>e.k==='walk'||e.k==='shared'); if(!tgt.length) tgt=p.filter(e=>LIB[e.k].c==='green'); if(!tgt.length) tgt=p;
  const each=diff/tgt.length; tgt.forEach(e=>e.w=+Math.max(.3,e.w+each).toFixed(2));
  const rest=S.row-sum(p); if(Math.abs(rest)>.005) tgt[0].w=+Math.max(.3,tgt[0].w+rest).toFixed(2);
}
function renderEditor(){
  const w=S.active, p=S.prof[w], tot=sum(p), selId=S.sel[w], sel=p.find(e=>e.id===selId);
  const diff=S.row-tot, st=Math.abs(diff)<.005?['ok','Kenglikka mos']:diff>0?['warn',`${f2(diff)} m boʻsh`]:['bad',`${f2(-diff)} m oshiq`];
  let h=`<div class="strip" role="group" aria-label="Profil elementlari">`;
  p.forEach(e=>{const d=LIB[e.k];h+=`<button class="blk ${DARK.has(e.k)?'dark':''} ${e.w/tot<.085?'nar':''}" data-id="${e.id}" aria-pressed="${e.id===selId}" title="${d.n} — ${f2(e.w)} m" style="flex:${e.w} 1 0;background:${d.col}"><span class="t">${d.a}</span><span class="w">${f2(e.w)}</span></button>`;});
  h+=`</div><div class="sumline"><span class="num">Jami ${f2(tot)} / ${f2(S.row)} m</span><span class="chip ${st[0]}">${st[1]}</span>
    <span style="flex:1"></span>
    <button class="btn sm" id="fitB">Kenglikka moslash</button><button class="btn sm" id="mirB">Oynali aks</button>
    ${w==='pr'?'<button class="btn sm" id="copyB">Mavjuddan nusxa</button>':''}</div>`;
  if(sel){
    h+=`<div class="selbox"><select id="selK" aria-label="Element turi">${LIBG.map(([g,ks])=>`<optgroup label="${g}">${ks.map(k=>`<option value="${k}" ${k===sel.k?'selected':''}>${LIB[k].n}</option>`).join('')}</optgroup>`).join('')}</select>
    <input id="selW" type="number" step="0.05" min="0.2" value="${sel.w}" class="num" aria-label="Kenglik, m"><span class="small">m</span>
    <button class="btn sm" data-act="left" aria-label="Chapga">←</button><button class="btn sm" data-act="right" aria-label="Oʻngga">→</button>
    <button class="btn sm" data-act="dup">Nusxa</button><button class="btn sm" data-act="del" style="color:var(--bad)">Oʻchirish</button></div>`;
  } else h+=`<div class="small">Elementni tanlang yoki pastdan qoʻshing. Yangi element tanlangan elementdan keyin qoʻyiladi.</div>`;
  h+=`<div><div class="pal-h">Qoʻshish</div>${LIBG.map(([g,ks])=>`<div class="small" style="margin:8px 0 4px;font-weight:600">${g}</div><div class="palette">${ks.map(k=>`<button data-add="${k}"><span class="sw" style="background:${LIB[k].col}"></span>${LIB[k].n}</button>`).join('')}</div>`).join('')}</div>`;
  h+=`<div><div class="pal-h">Tayyor sxemalar (joriy kenglikka moslanadi)</div><div class="tools">
    <button class="btn sm" data-tpl="complete">Toʻliq koʻcha</button><button class="btn sm" data-tpl="brt">Avtobus koridori</button>
    <button class="btn sm" data-tpl="tram">Tramvay + bulvar</button><button class="btn sm" data-tpl="calm">Tinch mahalla koʻchasi</button></div></div>`;
  const ed=document.getElementById('editor'); ed.innerHTML=h;
  ed.querySelectorAll('.blk').forEach(b=>b.onclick=()=>{S.sel[w]=+b.dataset.id===S.sel[w]?null:+b.dataset.id;renderEditor();});
  ed.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const e=mk(b.dataset.add);const i=p.findIndex(x=>x.id===S.sel[w]);p.splice(i<0?p.length:i+1,0,e);S.sel[w]=e.id;update();});
  ed.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{const prev=clone(S);S.prof[w]=template(b.dataset.tpl);S.sel[w]=null;update();toast('Sxema qoʻllandi',()=>{S=prev;renderAll();save();});});
  ed.querySelector('#fitB').onclick=()=>{fit(w);update();};
  ed.querySelector('#mirB').onclick=()=>{p.reverse();update();};
  if(ed.querySelector('#copyB')) ed.querySelector('#copyB').onclick=()=>{const prev=clone(S);S.prof.pr=S.prof.ex.map(e=>mk(e.k,e.w));S.sel.pr=null;update();toast('Loyiha mavjud holatdan nusxalandi',()=>{S=prev;renderAll();save();});};
  if(sel){
    ed.querySelector('#selK').onchange=ev=>{sel.k=ev.target.value;update();};
    ed.querySelector('#selW').onchange=ev=>{const v=parseFloat(ev.target.value);if(v>0){sel.w=+v.toFixed(2);update();}};
    ed.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const i=p.indexOf(sel),a=b.dataset.act;
      if(a==='left'&&i>0)[p[i-1],p[i]]=[p[i],p[i-1]];
      if(a==='right'&&i<p.length-1)[p[i+1],p[i]]=[p[i],p[i+1]];
      if(a==='dup'){const e=mk(sel.k,sel.w);p.splice(i+1,0,e);S.sel[w]=e.id;}
      if(a==='del'){p.splice(i,1);S.sel[w]=null;}
      update();});
  }
}
function template(t){
  const W=S.row; let side,mid;
  if(t==='complete'){side=[['walk',2.4],['trees',2],['bike1',1.8],['buffer',.6]];mid=[['lane',3.25],['lane',3.25]];}
  if(t==='brt'){side=[['walk',2.4],['ariq',1.2],['bike1',1.8],['buffer',.5]];mid=[['lane',3.25],['bus',3.5],['median',2.5],['bus',3.5],['lane',3.25]];}
  if(t==='tram'){side=[['walk',2.4],['trees',2],['bike1',1.8],['buffer',.5]];mid=[['lane',3.25],['median',1.5],['tram',3.2],['tram',3.2],['median',1.5],['lane',3.25]];}
  if(t==='calm'){side=[['walk',2],['ariq',1.2],['park',2.2]];mid=[['lane',3],['lane',3]];}
  // mid already symmetric for brt/tram (listed fully); for complete/calm mid is two directions
  const arr=[...side.map(([k,w])=>mk(k,w)),...mid.map(([k,w])=>mk(k,w)),...[...side].reverse().map(([k,w])=>mk(k,w))];
  const tmp=S.prof[S.active]; S.prof[S.active]=arr; fit(S.active); const out=S.prof[S.active]; S.prof[S.active]=tmp;
  if(sum(out)-W>.01||out.some(e=>e.w<.3)) toast('Diqqat: sxema bu kenglikka sigʻmaydi — piyoda zonasi juda tor. Elementlarni qisqartiring.');
  return out;
}

/* ---------- Taqqoslash ---------- */
const ROWS=[
  ['Umumiy kenglik, m',m=>m.w,2],
  ['Piyoda oʻtish zonasi (jami), m',m=>m.walkW,2],
  ['Eng tor piyoda zonasi, m',m=>m.walkMinSide,2],
  ['Yashil zonalar, m',m=>m.cat.green,2],
  ['Velo infratuzilma, m',m=>m.cat.bike,2],
  ['Jamoat transporti, m',m=>m.cat.transit,2],
  ['Avto harakat + parkovka, m',m=>m.cat.car+m.cat.park,2],
  ['Harakat boʻlaklari, dona',m=>m.lanes,0],
  ['Oʻtkazuvchanlik (min), kishi/soat',m=>m.capLo,0],
  ['Oʻtkazuvchanlik (max), kishi/soat',m=>m.capHi,0],
  ['Eng uzun kesib oʻtish (orolchasiz), m',m=>m.cross,1,true],
  ['Kesib oʻtish vaqti, s',m=>m.crossT,0,true],
  ['Daraxtlar, dona',m=>m.trees,0],
  ['Parkovka joylari, dona',m=>m.parking,0],
  ['Yashil maydon, m²',m=>m.greenA,0],
  ['Transport qoplamasi, m²',m=>m.roadA,0,true],
];
const fmt=(v,d)=>d===0?fi(v):d===1?f1(v):f2(v);
function renderCompare(){
  const W=640, mx=Math.max(sum(S.prof.ex),sum(S.prof.pr),S.row), sc=(W-48)/mx;
  document.getElementById('secEx').innerHTML=sectionSVG(S.prof.ex,sc,W);
  document.getElementById('secPr').innerHTML=sectionSVG(S.prof.pr,sc,W);
  document.getElementById('exSum').textContent=`${f2(sum(S.prof.ex))} m`;
  document.getElementById('prSum').textContent=`${f2(sum(S.prof.pr))} m`;
  const A=metrics(S.prof.ex),B=metrics(S.prof.pr);
  document.getElementById('lenNote').textContent=`Uchastka: ${fi(S.len)} m. Daraxt qadami ${S.set.treeSp} m, bitta parkovka joyi ${S.set.parkLen} m, piyoda tezligi ${S.set.speed} m/s.`;
  // ulushlar
  const bar=(m,t)=>`<div><div class="sbl"><span>${t}</span><span class="num">${f2(m.w)} m</span></div><div class="sbar">${Object.entries(CATS).map(([c,[n,col]])=>m.cat[c]>0?`<div style="width:${m.cat[c]/m.w*100}%;background:${col}" title="${n}: ${f1(m.cat[c]/m.w*100)}%"></div>`:'').join('')}</div></div>`;
  document.getElementById('shares').innerHTML=bar(A,'Mavjud')+bar(B,'Loyiha')+`<div class="legend">${Object.entries(CATS).map(([c,[n,col]])=>`<span><i class="sw" style="background:${col}"></i>${n} <b class="num">${f1(A.cat[c]/A.w*100)}→${f1(B.cat[c]/B.w*100)}%</b></span>`).join('')}</div>`;
  let t=`<thead><tr><th>Koʻrsatkich</th><th>Mavjud</th><th>Loyiha</th><th>Farq</th></tr></thead><tbody>`;
  ROWS.forEach(([n,fn,d,lowerBetter])=>{const a=fn(A),b=fn(B),df=b-a;const cls=Math.abs(df)<1e-6?'eq':(df>0)!==!!lowerBetter?'up':'dn';
    const pct=a?` (${df>0?'+':''}${fi(df/a*100)}%)`:'';
    t+=`<tr><td>${n}</td><td class="d">${fmt(a,d)}</td><td class="d">${fmt(b,d)}</td><td class="d ${cls}">${Math.abs(df)<1e-6?'—':(df>0?'+':'')+fmt(df,d)+pct}</td></tr>`;});
  document.getElementById('mt').innerHTML=t+'</tbody>';
  document.getElementById('legend').innerHTML=Object.entries(LIB).filter(([k])=>S.prof.ex.some(e=>e.k===k)||S.prof.pr.some(e=>e.k===k)).map(([k,d])=>`<span><i class="sw" style="background:${d.col}"></i>${d.a} — ${d.n}</span>`).join('');
  // tekshiruvlar
  const T=S.thr;
  const cks=[
    ['Eng tor piyoda zonasi ≥ '+f2(T.walkMin)+' m',m=>m.walkMinSide>=T.walkMin,m=>f2(m.walkMinSide)],
    ['Avto boʻlak kengligi ≤ '+f2(T.laneMax)+' m',m=>m.laneMaxW<=T.laneMax,m=>f2(m.laneMaxW)],
    ['Orolchasiz kesib oʻtish ≤ '+f1(T.crossMax)+' m',m=>m.cross<=T.crossMax,m=>f1(m.cross)],
    ['Daraxt zonasi kengligi ≥ '+f2(T.treeW)+' m',(m,p)=>p.filter(e=>LIB[e.k].tree).every(e=>e.w>=T.treeW),(m,p)=>{const z=p.filter(e=>LIB[e.k].tree);return z.length?f2(Math.min(...z.map(e=>e.w))):'—'}],
    ['Profil qizil chiziqqa sigʻadi',m=>Math.abs(m.w-S.row)<.01,m=>f2(m.w)],
  ];
  document.getElementById('checks').innerHTML=`<div class="ck small"><span></span><span>Mavjud</span><span>Loyiha</span></div>`+cks.map(([n,ok,v])=>{
    const c=(m,p)=>`<span class="chip ${ok(m,p)?'ok':'bad'} num">${v(m,p)}</span>`;
    return `<div class="ck"><span>${n}</span>${c(A,S.prof.ex)}${c(B,S.prof.pr)}</div>`;}).join('');
}
function renderThr(){
  const F=[['walkMin','Min. piyoda zona, m',S.thr],['laneMax','Maks. avto boʻlak, m',S.thr],['crossMax','Maks. kesib oʻtish, m',S.thr],['treeW','Min. daraxt zona, m',S.thr],
    ['treeSp','Daraxt qadami, m',S.set],['parkLen','1 parkovka joyi, m',S.set],['speed','Piyoda tezligi, m/s',S.set]];
  document.getElementById('thr').innerHTML=F.map(([k,n])=>`<div class="field"><label for="t_${k}">${n}</label><input id="t_${k}" data-k="${k}" type="number" step="0.05" class="num"></div>`).join('');
  F.forEach(([k,,o])=>{const i=document.getElementById('t_'+k);i.value=o[k];i.onchange=()=>{const v=parseFloat(i.value);if(v>0){o[k]=v;renderCompare();renderPlan();save();}};});
}
function renderSite(){
  const s=S.site, el=document.getElementById('site');
  if(!s){el.innerHTML=`<h2>Namuna profil</h2><div class="meta">Real koʻcha emas — 25 m kenglikdagi shartli misol. Xaritada koʻchani bosing.</div>`;return;}
  const tg=s.tags?['highway','lanes','width','oneway','sidewalk','cycleway','maxspeed','surface'].filter(k=>s.tags[k]).map(k=>`<span class="tag">${k}=${s.tags[k]}</span>`).join(''):'';
  el.innerHTML=`<h2>${s.name}</h2><div class="meta">${s.src==='osm'?`OSM way <span class="num">${s.osmId}</span>`:'Qoʻlda chizilgan oʻq'} · uchastka ${fi(S.len)} m</div>${tg?`<div class="tags">${tg}</div>`:''}${s.shares?siteShares(s.shares):''}${(s.notes||[]).map(n=>`<div class="note">${n}</div>`).join('')}`;
}
function siteShares(sh){const g={};AC.forEach(c=>{g[c.g]=(g[c.g]||0)+(sh[c.k]||0);});
  return `<div style="margin-top:8px"><div class="pal-h">Sunʼiy yoʻldosh: qizil chiziqlar orasidagi ulushlar</div><div class="sbar" style="height:18px">${AG.map(([n,col])=>g[n]>0?`<div style="width:${g[n]}%;background:${col}" title="${n}: ${f1(g[n])}%"></div>`:'').join('')}</div><div class="legend" style="margin-top:4px">${AG.filter(([n])=>g[n]>=.5).map(([n,col])=>`<span><i class="sw" style="background:${col}"></i>${n} <b class="num">${f1(g[n])}%</b></span>`).join('')}</div></div>`;}
function renderTabs(){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===S.active));
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===S.view));}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{S.active=b.dataset.tab;if(S.view!=='none')S.view=S.active;renderTabs();renderEditor();renderPlan();save();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{S.view=b.dataset.view;renderTabs();renderPlan();save();});
const rowI=document.getElementById('row'),lenI=document.getElementById('len');
rowI.onchange=()=>{const v=parseFloat(rowI.value);if(v>0){S.row=v;update();}};
lenI.onchange=()=>{const v=parseFloat(lenI.value);if(v>=10){S.len=v;update();}};

function update(){renderEditor();renderCompare();renderPlan();renderSite();rowI.value=S.row;lenI.value=S.len;save();}
function renderAll(){renderTabs();renderThr();renderMeasure();renderBase();renderHint();update();}

/* ---------- Qidiruv ---------- */
document.getElementById('searchForm').onsubmit=async ev=>{ev.preventDefault();const q=document.getElementById('q').value.trim();if(!q)return;const box=document.getElementById('results');
  const co=q.match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
  if(co){const a=parseFloat(co[1].replace(',','.')),c=parseFloat(co[2].replace(',','.'));map.setView([a,c],18);box.hidden=true;return;}
  box.innerHTML='<button type="button" disabled>Qidirilmoqda…</button>';box.hidden=false;
  let items=[];
  try{const r=await fetch('https://photon.komoot.io/api/?limit=7&lat=41.31&lon=69.28&q='+encodeURIComponent(q));const j=await r.json();
    items=j.features.map(f=>{const p=f.properties;return{ll:[f.geometry.coordinates[1],f.geometry.coordinates[0]],t:[p.name,p.street&&p.housenumber?p.street+' '+p.housenumber:p.street,p.district,p.city,p.country].filter(Boolean).join(', ')};});}catch(e){}
  if(!items.length){try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=uz,ru&q='+encodeURIComponent(q));const j=await r.json();items=j.map(x=>({ll:[+x.lat,+x.lon],t:x.display_name}));}catch(e){}}
  box.innerHTML=items.length?items.map((x,i)=>`<button type="button" data-i="${i}">${x.t}</button>`).join(''):'<button type="button" disabled>Topilmadi. Koordinata kiriting (masalan 41.3111, 69.2797) yoki xaritani qoʻlda suring.</button>';
  box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{map.setView(items[+b.dataset.i].ll,18);box.hidden=true;});};
document.addEventListener('click',e=>{if(!e.target.closest('.search'))document.getElementById('results').hidden=true;});

/* ---------- Eksport ---------- */
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
const slug=()=>(S.site?.name||'namuna').replace(/[^\p{L}\p{N}]+/gu,'-').toLowerCase();
document.getElementById('expJson').onclick=()=>dl(`kocha-profil-${slug()}.json`,JSON.stringify(Object.assign({format:'kocha-profili-studiyasi/1'},S),null,1),'application/json');
document.getElementById('expCsv').onclick=()=>{const A=metrics(S.prof.ex),B=metrics(S.prof.pr);
  const lines=[['Koʻrsatkich','Mavjud','Loyiha','Farq'].join(';'),...ROWS.map(([n,fn,d])=>[n,fn(A).toFixed(d),fn(B).toFixed(d),(fn(B)-fn(A)).toFixed(d)].join(';')),'',
    'Profil;Element;Kenglik, m',...['ex','pr'].flatMap(w=>S.prof[w].map(e=>[w==='ex'?'Mavjud':'Loyiha',LIB[e.k].n,e.w].join(';')))];
  dl(`kocha-farqlar-${slug()}.csv`,'﻿'+lines.join('\n'),'text/csv');};
document.getElementById('expSvg').onclick=()=>{const W=640,mx=Math.max(sum(S.prof.ex),sum(S.prof.pr),S.row),sc=(W-48)/mx;
  const a=sectionSVG(S.prof.ex,sc,W),b=sectionSVG(S.prof.pr,sc,W);const h=+a.match(/viewBox="0 0 \d+ ([\d.]+)"/)[1];
  const inner=s=>s.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  dl(`kocha-kesim-${slug()}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${2*h+50}" style="color:#1c2628;background:#fff"><text x="24" y="16" font-size="13" font-weight="600">${S.site?.name||'Namuna'} — mavjud holat</text><g transform="translate(0,20)">${inner(a)}</g><text x="24" y="${h+40}" font-size="13" font-weight="600">Loyiha</text><g transform="translate(0,${h+44})">${inner(b)}</g></svg>`,'image/svg+xml');};
document.getElementById('imp').onchange=ev=>{const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!j.prof)throw 0;S=Object.assign(sample(),j);
  _id=Math.max(0,...S.prof.ex.map(e=>e.id),...S.prof.pr.map(e=>e.id));renderAll();if(S.site?.center)map.setView(S.site.center,17);toast('Loyiha ochildi');}catch(e){toast('Fayl oʻqilmadi: bu Koʻcha Profili Studiyasi loyihasi emas.');}};r.readAsText(f);ev.target.value='';};
document.getElementById('resetAll').onclick=()=>{const prev=clone(S);S=sample();renderAll();map.setView([41.3111,69.2797],14);toast('Namuna tiklandi',()=>{S=prev;renderAll();save();});};

let tt;function toast(msg,undo){const t=document.getElementById('toast');t.innerHTML=`<span>${msg}</span>`+(undo?'<button type="button">Qaytarish</button>':'');t.hidden=false;
  if(undo)t.querySelector('button').onclick=()=>{undo();t.hidden=true;};clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,6000);}

/* =====================================================================
   HUDUD TAHLILI: sunʼiy yoʻldosh tasviri + OSM → funksional taqsimot
   ===================================================================== */
const AC=[
  {k:'build', n:'Binolar (tom proyeksiyasi)',        col:'#c8553d', g:'Binolar'},
  {k:'road',  n:'Qatnov qismi (avto yoʻl)',           col:'#474c52', g:'Avto transport'},
  {k:'park',  n:'Parkovka maydonlari',                col:'#8f939b', g:'Avto transport'},
  {k:'rail',  n:'Relsli transport (tramvay, t/y)',    col:'#c47b2a', g:'Jamoat transporti'},
  {k:'bike',  n:'Velo yoʻlaklar',                     col:'#2f8f7a', g:'Velo'},
  {k:'ped',   n:'Piyoda yoʻlaklari (OSMda chizilgan)',col:'#e2bf55', g:'Piyoda'},
  {k:'side',  n:'Yoʻl yoqasi / trotuar (taxmin)',     col:'#f0dda2', g:'Piyoda'},
  {k:'water', n:'Suv, kanal, ariq',                   col:'#3f86c6', g:'Suv'},
  {k:'veg',   n:'Oʻsimlik (daraxt, maysa)',           col:'#4f9a3e', g:'Yashil'},
  {k:'soil',  n:'Ochiq tuproq / qizgʻish tomlar',                     col:'#b08a5a', g:'Boshqa'},
  {k:'paved', n:'Boshqa qattiq sirt (hovli, maydon)', col:'#bdb8ae', g:'Boshqa'},
  {k:'shadow',n:'Soya — aniqlanmagan',                col:'#2c2d36', g:'Aniqlanmagan'},
  {k:'asph',  n:'Asfalt (yoʻl, parkovka, asfaltli hovli)', col:'#3e4349', g:'Asfalt'},
  {k:'light', n:'Yorugʻ qattiq sirt (trotuar, maydon, tomlar)', col:'#e3d6b4', g:'Yorugʻ qattiq sirt'},
];
const AG=[['Asfalt','#3e4349'],['Yorugʻ qattiq sirt','#e3d6b4'],['Avto transport','#474c52'],['Jamoat transporti','#c47b2a'],['Velo','#2f8f7a'],['Piyoda','#e2bf55'],['Yashil','#4f9a3e'],['Suv','#3f86c6'],['Binolar','#c8553d'],['Boshqa','#bdb8ae'],['Aniqlanmagan','#2c2d36']];
const A={tool:'rect',pts:[],busy:false,prog:0,msg:'',err:'',cache:null,res:null,opac:.65,
  P:Object.assign({veg:.05,shadow:48,side:4,roadMul:1,zoom:'auto',src:'pix',osmB:false,asph:'auto'},S.area?.P||{}),poly:S.area?.poly||null};
const areaL=L.layerGroup(); let classOverlay=null;
const TS=256, gxf=(lon,z)=>(lon+180)/360*TS*2**z, gyf=(lat,z)=>(1-Math.log(Math.tan(lat*R)+1/Math.cos(lat*R))/Math.PI)/2*TS*2**z;
const lonf=(x,z)=>x/(TS*2**z)*360-180, latf=(y,z)=>Math.atan(Math.sinh(Math.PI*(1-2*y/(TS*2**z))))/R;
function saveArea(){S.area={P:A.P,poly:A.poly};save();}

function areaClick(ll){
  if(A.busy) return;
  if(A.res&&A.pts.length===0){/* yangi hudud boshlanadi */}
  A.pts.push([ll.lat,ll.lng]);
  if(A.tool==='rect'&&A.pts.length===2){const[a,b]=A.pts;A.poly=[[a[0],a[1]],[a[0],b[1]],[b[0],b[1]],[b[0],a[1]]];A.pts=[];drawArea();analyze();return;}
  drawArea();renderHint();
}
function drawArea(){
  areaL.clearLayers(); if(classOverlay) areaL.addLayer(classOverlay);
  if(A.poly&&!A.pts.length) L.polygon(A.poly,{color:'#f4c542',weight:2,fill:false,dashArray:'6 4'}).addTo(areaL);
  if(A.pts.length){A.pts.forEach(p=>L.circleMarker(p,{radius:4,color:'#f4c542',fillOpacity:1}).addTo(areaL));if(A.pts.length>1)L.polyline(A.pts,{color:'#f4c542',weight:2}).addTo(areaL);}
}
function areaHint(h){
  if(A.busy){h.innerHTML=`<b>${A.msg}</b><div class="prog" style="margin-top:6px"><div style="width:${Math.round(A.prog*100)}%"></div></div>`;return;}
  if(A.tool==='rect') h.innerHTML=A.pts.length?'<b>Qarama-qarshi burchakni bosing.</b>':'<b>Hududni belgilang.</b> Toʻrtburchakning bir burchagini, soʻng qarama-qarshi burchagini bosing. Yoki oʻng paneldagi «Ekrandagi hudud».';
  else{h.innerHTML=`<b>Koʻpburchak.</b> Chegarani nuqtama-nuqta bosing (${A.pts.length} ta).<div class="row"><button class="btn sm primary" id="aFin" ${A.pts.length<3?'disabled':''}>Tugatish va hisoblash</button><button class="btn sm" id="aClr">Tozalash</button></div>`;
    h.querySelector('#aFin').onclick=()=>{A.poly=A.pts.slice();A.pts=[];drawArea();analyze();};
    h.querySelector('#aClr').onclick=()=>{A.pts=[];drawArea();renderHint();};}
}
function setProg(p,m){A.prog=p;if(m)A.msg=m;renderHint();}

function loadTile(url){return new Promise(res=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=()=>res(null);im.src=url;});}
async function loadImagery(bb,z){
  const x0=Math.floor(gxf(bb.w,z)/TS),x1=Math.floor(gxf(bb.e,z)/TS),y0=Math.floor(gyf(bb.n,z)/TS),y1=Math.floor(gyf(bb.s,z)/TS);
  const nt=(x1-x0+1)*(y1-y0+1); if(nt>900) throw new Error('Hudud bu masshtab uchun juda katta. Kichikroq hudud tanlang yoki parametrlarda kichikroq zoom qoʻying.');
  const cv=document.createElement('canvas');cv.width=(x1-x0+1)*TS;cv.height=(y1-y0+1)*TS;const cx=cv.getContext('2d',{willReadFrequently:true});
  cx.fillStyle='#808080';cx.fillRect(0,0,cv.width,cv.height);
  let done=0,missing=0,flat=0; const jobs=[];
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)jobs.push(loadTile(`${ESRI}World_Imagery/MapServer/tile/${z}/${y}/${x}`).then(im=>{
    done++;setProg(.05+.45*done/nt,`Sunʼiy yoʻldosh tasviri: ${done}/${nt} plitka (zoom ${z})`);
    if(!im){missing++;return;} cx.drawImage(im,(x-x0)*TS,(y-y0)*TS);
    try{const d=cx.getImageData((x-x0)*TS+32,(y-y0)*TS+32,192,192).data;let s=0,s2=0,n=0;for(let i=0;i<d.length;i+=4*97){const v=d[i]+d[i+1]+d[i+2];s+=v;s2+=v*v;n++;}if(Math.sqrt(s2/n-(s/n)**2)<6)flat++;}catch(e){throw new Error('CORS');}
  }));
  try{await Promise.all(jobs);}catch(e){throw new Error('Brauzer sunʼiy yoʻldosh piksellarini oʻqishga ruxsat bermadi (CORS). Faylni Chrome yoki Edge’da oching.');}
  if(missing===nt) throw new Error('Sunʼiy yoʻldosh plitkalari yuklanmadi. Internet aloqasini tekshiring va faylni Claude oynasida emas, Chrome/Edge brauzerida oching.');
  return {cv,cx,ox:x0*TS,oy:y0*TS,nt,missing,flat};
}

async function analyze(){
  if(!A.poly||A.poly.length<3) return;
  A.busy=true;A.err='';saveArea();renderAreaPanel();setProg(.02,'Tayyorlanmoqda…');
  try{
    const bb={s:Math.min(...A.poly.map(p=>p[0])),n:Math.max(...A.poly.map(p=>p[0])),w:Math.min(...A.poly.map(p=>p[1])),e:Math.max(...A.poly.map(p=>p[1]))};
    const lat0=(bb.s+bb.n)/2, side=Math.max((bb.e-bb.w)*111320*Math.cos(lat0*R),(bb.n-bb.s)*110574);
    if(side>4000) throw new Error('Hudud juda katta (tomoni 4 km dan ortiq). Mahalla yoki koʻcha uchastkasi darajasida tanlang.');
    let z=A.P.zoom==='auto'?(side<=700?19:side<=1500?18:17):+A.P.zoom, notes=[];
    let im=await loadImagery(bb,z);
    if(im.flat/im.nt>.3&&z>17){notes.push(`Zoom ${z} da tasvir yoʻq plitkalar koʻp edi — zoom ${z-1} ishlatildi.`);z--;im=await loadImagery(bb,z);}
    if(im.missing) notes.push(`${im.missing} ta plitka yuklanmadi (kulrang).`);
    const cx0=Math.floor(gxf(bb.w,z))-im.ox, cy0=Math.floor(gyf(bb.n,z))-im.oy;
    const cw=Math.ceil(gxf(bb.e,z))-im.ox-cx0, ch=Math.ceil(gyf(bb.s,z))-im.oy-cy0;
    let pix; try{pix=im.cx.getImageData(cx0,cy0,cw,ch).data;}catch(e){throw new Error('Brauzer sunʼiy yoʻldosh piksellarini oʻqishga ruxsat bermadi (CORS).');}
    setProg(.55,'OpenStreetMap: binolar, yoʻllar, trotuarlar olinmoqda…');
    const b=`(${bb.s},${bb.w},${bb.n},${bb.e})`;
    let osm=[];try{osm=await overpassRaw(`(way["building"]${b};relation["building"]${b};way["highway"]${b};way["area:highway"]${b};way["amenity"="parking"]${b};way["railway"~"^(tram|rail|light_rail|narrow_gauge)$"]${b};way["natural"="water"]${b};relation["natural"="water"]${b};way["waterway"]${b};way["landuse"="reservoir"]${b};);out geom;`);}catch(e){if((A.P.src||'pix')!=='pix'||A.forceMix)throw e;notes.push('OpenStreetMap maʼlumoti olinmadi — tahlil faqat sunʼiy yoʻldosh piksellaridan.');}
    A.cache={z,gx0:im.ox+cx0,gy0:im.oy+cy0,cw,ch,pix,osm,bb,lat0,mpp:156543.03392*Math.cos(lat0*R)/2**z,notes};
    setProg(.85,'Piksellar tasniflanmoqda…');
    await new Promise(r=>setTimeout(r,20));
    classify();
  }catch(e){A.err=e.message||String(e);if(/fetch|Failed|NetworkError|HTTP/.test(A.err))A.err='Tarmoq xatosi: '+A.err+'. Internetni tekshiring; fayl Claude oynasida emas, oddiy brauzerda ochilganiga ishonch hosil qiling.';}
  A.busy=false;renderHint();renderAreaPanel();
}

function classify(){
  const C=A.cache,{z,gx0,gy0,cw,ch,pix,osm,mpp}=C,P=A.P,N=cw*ch;
  const pt=(lat,lon)=>[gxf(lon,z)-gx0,gyf(lat,z)-gy0];
  const ring=(x,g)=>{g.forEach((q,i)=>{const[a,b]=pt(q.lat,q.lon);i?x.lineTo(a,b):x.moveTo(a,b);});};
  const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const x=cv.getContext('2d',{willReadFrequently:true});
  const mask=draw=>{x.clearRect(0,0,cw,ch);x.fillStyle='#000';x.strokeStyle='#000';x.lineCap='round';x.lineJoin='round';draw();const d=x.getImageData(0,0,cw,ch).data,m=new Uint8Array(N);for(let i=0;i<N;i++)m[i]=d[i*4+3]>110?1:0;return m;};
  const fillEls=els=>els.forEach(el=>{x.beginPath();if(el.type==='way'&&el.geometry)ring(x,el.geometry);else if(el.members)el.members.forEach(m=>m.geometry&&ring(x,m.geometry));x.fill('evenodd');});
  const strokeEls=(els,wf)=>els.forEach(el=>{if(!el.geometry)return;x.lineWidth=Math.max(1,wf(el.tags||{})/mpp);x.beginPath();ring(x,el.geometry);x.stroke();});
  const T=e=>e.tags||{}, under=t=>t.tunnel&&t.tunnel!=='no'||t.covered==='yes'||t.location==='underground'||parseInt(t.layer)<0;
  const closed=e=>e.geometry&&e.geometry.length>3&&e.geometry[0].lat===e.geometry[e.geometry.length-1].lat&&e.geometry[0].lon===e.geometry[e.geometry.length-1].lon;
  const VEH=/^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|road|busway)(_link)?$/;
  const PED=/^(footway|path|pedestrian|steps|corridor|bridleway|track)$/;
  const num=v=>{const f=parseFloat(String(v||'').replace(',','.'));return f>0?f:0;};
  const roadW=t=>{const w=num(t.width);if(w>=3)return w*P.roadMul;const l=parseInt(t.lanes);if(l>0)return l*3.3*P.roadMul;
    const d={motorway:16,trunk:14,primary:12,secondary:10,tertiary:8,unclassified:6,residential:6,living_street:5,road:6,busway:7};
    const h=t.highway||'';let v=h.endsWith('_link')?6:d[h]??(t.service==='parking_aisle'?5:t.service==='driveway'?3:4);return v*P.roadMul;};
  const pedW=t=>num(t.width)||({pedestrian:4,steps:2,path:1.5,track:3}[t.highway]??(t.footway==='sidewalk'?2.5:2));
  const els=osm;
  const bld=els.filter(e=>{const t=T(e);return t.building&&t.building!=='no'&&!under(t);});
  const hw=els.filter(e=>e.type==='way'&&T(e).highway&&!under(T(e)));
  const vehL=hw.filter(e=>VEH.test(T(e).highway)&&T(e).area!=='yes');
  const pedArea=hw.filter(e=>(T(e).highway==='pedestrian'||T(e).highway==='footway')&&(T(e).area==='yes'||(T(e).highway==='pedestrian'&&closed(e))));
  const pedL=hw.filter(e=>PED.test(T(e).highway)&&!pedArea.includes(e));
  const bikeL=hw.filter(e=>T(e).highway==='cycleway');
  const ah=els.filter(e=>T(e)['area:highway']);
  const ahRoad=ah.filter(e=>VEH.test(T(e)['area:highway'])), ahPed=ah.filter(e=>/footway|pedestrian|path|steps/.test(T(e)['area:highway'])), ahBike=ah.filter(e=>T(e)['area:highway']==='cycleway');
  const rails=els.filter(e=>T(e).railway&&!under(T(e)));
  const parks=els.filter(e=>T(e).amenity==='parking'&&!/underground|multi-storey|rooftop/.test(T(e).parking||'')&&closed(e));
  const wPoly=els.filter(e=>(T(e).natural==='water'||T(e).landuse==='reservoir'||T(e).waterway==='riverbank')&&(e.type==='relation'||closed(e)));
  const wLine=els.filter(e=>e.type==='way'&&T(e).waterway&&T(e).waterway!=='riverbank'&&!under(T(e))&&T(e).tunnel!=='culvert');
  const wW=t=>num(t.width)||({river:20,canal:8,stream:3,drain:1.5,ditch:1.2}[t.waterway]??1.5);

  const Mpoly=mask(()=>{x.beginPath();A.poly.forEach((p,i)=>{const[a,b]=pt(p[0],p[1]);i?x.lineTo(a,b):x.moveTo(a,b);});x.closePath();x.fill();});
  const Mb=mask(()=>fillEls(bld));
  const Mr=mask(()=>{strokeEls(vehL,roadW);fillEls(ahRoad);});
  const Mband=mask(()=>{strokeEls(vehL,t=>roadW(t)+2*P.side);});
  const Mp=mask(()=>{strokeEls(pedL,pedW);fillEls(pedArea);fillEls(ahPed);});
  const Mc=mask(()=>{strokeEls(bikeL,t=>num(t.width)||2);fillEls(ahBike);});
  const Mt=mask(()=>strokeEls(rails,t=>t.railway==='tram'?3:5));
  const Mk=mask(()=>fillEls(parks));
  const Mw=mask(()=>{fillEls(wPoly);strokeEls(wLine,wW);});

  const PIX=(P.src||'pix')==='pix'&&!A.forceMix;
  // asfalt/yorugʻ sirt chegarasi: Otsu usuli (kulrang piksellar yorqinligi gistogrammasi)
  let thrA=150;
  if(PIX){const hist=new Float64Array(256);let n=0;
    for(let i=0;i<N;i++){if(!Mpoly[i])continue;const r=pix[i*4],g=pix[i*4+1],b=pix[i*4+2],sm=r+g+b,br=sm/3,mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=(mx-mn)/(mx+1),exg=(2*g-r-b)/(sm+1);
      if(exg>P.veg&&g>=r*.95)continue;if(br<P.shadow)continue;if(r>g&&g>b&&sat>.18&&br>70&&(r-b)>25)continue;hist[Math.min(255,Math.round(br))]++;n++;}
    if(P.asph!=='auto'&&+P.asph>0)thrA=+P.asph;
    else if(n>100){let sumA=0;for(let t=0;t<256;t++)sumA+=t*hist[t];let wB=0,sB=0,best=0,bt=128;const V=new Float64Array(256);for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=t*hist[t];const mB=sB/wB,mF=(sumA-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);V[t]=v;if(v>best)best=v;}
      {let a=-1,b2=-1;for(let t=0;t<256;t++)if(V[t]>=best*.995){if(a<0)a=t;b2=t;}bt=Math.round((a+b2)/2);}
      thrA=Math.max(70,Math.min(175,bt));}
    A.thrA=thrA;}
  const keys=AC.map(c=>c.k), cnt=Object.fromEntries(keys.map(k=>[k,0])), cls=new Uint8Array(N).fill(255);
  let tot=0,canopy=0,roadAll=0,roadCan=0,pedAll=0,pedCan=0;
  const ki=Object.fromEntries(keys.map((k,i)=>[k,i]));
  for(let i=0;i<N;i++){
    if(!Mpoly[i])continue; tot++;
    const r=pix[i*4],g=pix[i*4+1],b=pix[i*4+2],s=r+g+b,br=s/3,mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=(mx-mn)/(mx+1),exg=(2*g-r-b)/(s+1);
    const veg=exg>P.veg&&g>=r*.95&&br>18;
    const soil=!veg&&r>g&&g>b&&sat>.18&&br>70&&(r-b)>25;
    if(veg)canopy++;
    let k;
    if(PIX){
      if(P.osmB&&Mb[i])k='build';else if(veg)k='veg';else if(br<P.shadow)k='shadow';
      else if(b>r+12&&b>=g&&sat>.12&&br<170)k='water';else if(soil)k='soil';else k=br<=thrA?'asph':'light';
    }else{
    if(Mb[i])k='build';else if(Mw[i])k='water';else if(Mt[i])k='rail';else if(Mr[i])k='road';else if(Mc[i])k='bike';else if(Mp[i])k='ped';else if(Mk[i])k='park';
    else if(veg)k='veg';else if(Mband[i]&&!soil&&br>=P.shadow)k='side';else if(soil)k='soil';else if(br<P.shadow)k='shadow';else k='paved';}
    if(k==='road'){roadAll++;if(veg)roadCan++;} if(k==='ped'||k==='side'||(k==='veg'&&Mband[i])){pedAll++;if(veg)pedCan++;}
    cnt[k]++;cls[i]=ki[k];
  }
  // rangli qatlam
  const out=x.createImageData(cw,ch),rgb=AC.map(c=>[parseInt(c.col.slice(1,3),16),parseInt(c.col.slice(3,5),16),parseInt(c.col.slice(5,7),16)]);
  for(let i=0;i<N;i++){const c=cls[i];if(c===255)continue;const q=rgb[c];out.data[i*4]=q[0];out.data[i*4+1]=q[1];out.data[i*4+2]=q[2];out.data[i*4+3]=255;}
  x.clearRect(0,0,cw,ch);x.putImageData(out,0,0);
  const url=cv.toDataURL('image/png');
  const bounds=[[latf(gy0+ch,z),lonf(gx0,z)],[latf(gy0,z),lonf(gx0+cw,z)]];
  if(classOverlay)areaL.removeLayer(classOverlay);
  classOverlay=L.imageOverlay(url,bounds,{opacity:A.opac});
  const px2=mpp*mpp;
  A.res={pix:PIX,thrA:PIX?thrA:null,tot,cnt,m2:tot*px2,px2,canopy,roadAll,roadCan,pedAll,pedCan,url,
    cls,counts:{bld:bld.length,veh:vehL.length,ped:pedL.length+pedArea.length+ahPed.length,bike:bikeL.length,park:parks.length,water:wPoly.length+wLine.length},mpp,z};
  drawArea();
}

function renderAreaPanel(){
  const el=document.getElementById('areaPanel'),r=A.res;
  let h=`<div><h2>Hudud tahlili</h2><p class="lead">Xaritada istalgan hududni belgilang. Sunʼiy yoʻldosh tasviri piksellarga ajratilib, hudud necha foiz asfalt, yashil, trotuar va boshqa sirtlardan iboratligi koʻrsatiladi.</p></div>
  <div class="seg"><button class="btn sm ${A.tool==='rect'?'primary':''}" data-tool="rect">Toʻrtburchak</button><button class="btn sm ${A.tool==='poly'?'primary':''}" data-tool="poly">Koʻpburchak</button><button class="btn sm" id="aView">Ekrandagi hudud</button>${A.poly&&!A.busy?'<button class="btn sm" id="aRe">Qayta hisoblash</button>':''}</div>`;
  if(A.err) h+=`<div class="warnbox" style="color:var(--bad);border-color:var(--bad)">${A.err}</div>`;
  if(A.busy) h+=`<div class="small">${A.msg}</div><div class="prog"><div style="width:${Math.round(A.prog*100)}%"></div></div>`;
  if(r&&!A.busy){
    const pc=k=>r.cnt[k]/r.tot*100, grp={};AG.forEach(([g])=>grp[g]=0);AC.forEach(c=>grp[c.g]+=pc(c.k));
    if(r.pix)h+=`<div class="big">
      <div><b>${f2(r.m2/10000)}</b><span>ga, maydon</span></div>
      <div><b>${f1(pc('asph'))}%</b><span>asfalt</span></div>
      <div><b>${f1(pc('light'))}%</b><span>yorugʻ qattiq sirt (trotuar, maydon${A.P.osmB?'':', tomlar'})</span></div>
      <div><b>${f1(pc('veg'))}%</b><span>yashil (daraxt, maysa)</span></div>
      ${A.P.osmB?`<div><b>${f1(pc('build'))}%</b><span>binolar (OSM)</span></div>`:`<div><b>${f1(pc('soil')+pc('water'))}%</b><span>tuproq va suv</span></div>`}
    </div>`;
    else h+=`<div class="big">
      <div><b>${f2(r.m2/10000)}</b><span>ga, maydon</span></div>
      <div><b>${f1(grp['Avto transport'])}%</b><span>avto yoʻl + parkovka</span></div>
      <div><b>${f1(grp['Piyoda'])}%</b><span>piyoda (OSM + taxmin)</span></div>
      <div><b>${f1(r.canopy/r.tot*100)}%</b><span>oʻsimlik qoplami (sputnik)</span></div>
      <div><b>${f1(grp['Binolar'])}%</b><span>binolar ostida</span></div>
    </div>
    <div><div class="sbar" style="height:22px">${AG.map(([g,c])=>grp[g]>0?`<div style="width:${grp[g]}%;background:${c}" title="${g}: ${f1(grp[g])}%"></div>`:'').join('')}</div>
    <div class="legend" style="margin-top:6px">${AG.filter(([g])=>grp[g]>0.05).map(([g,c])=>`<span><i class="sw" style="background:${c}"></i>${g} <b class="num">${f1(grp[g])}%</b></span>`).join('')}</div></div>
    <div style="overflow-x:auto"><table class="ctab"><thead><tr><th>Sinf</th><th>m²</th><th>%</th></tr></thead><tbody>
    ${AC.filter(c=>r.cnt[c.k]>0).map(c=>`<tr><td><i class="sw" style="background:${c.col}"></i>${c.n}</td><td class="d">${fi(r.cnt[c.k]*r.px2)}</td><td class="d">${f1(pc(c.k))}</td></tr>`).join('')}
    <tr><td><b>Jami</b></td><td class="d"><b>${fi(r.m2)}</b></td><td class="d"><b>100,0</b></td></tr></tbody></table></div>
    ${r.pix?`<table><tbody><tr><td>Asfalt / yorugʻ sirt chegarasi (yorqinlik)</td><td class="d">${r.thrA}${A.P.asph==='auto'?' (avto)':''}</td></tr><tr><td>Tasvir aniqligi</td><td class="d">${f2(r.mpp)} m/piksel (zoom ${r.z})</td></tr></tbody></table>`:''}
    ${r.pix?'':`<table><tbody>
      <tr><td>Yoʻl sirtining daraxt soyasi ostidagi qismi</td><td class="d">${r.roadAll?f1(r.roadCan/r.roadAll*100)+'%':'—'}</td></tr>
      <tr><td>Piyoda zonasi (yoʻl yoqasi bilan) soyali qismi</td><td class="d">${r.pedAll?f1(r.pedCan/r.pedAll*100)+'%':'—'}</td></tr>
      <tr><td>Avto : piyoda maydon nisbati</td><td class="d">${grp['Piyoda']?'1 : '+f2(grp['Piyoda']/Math.max(grp['Avto transport'],.01)):'—'}</td></tr>
      <tr><td>Tasvir aniqligi</td><td class="d">${f2(r.mpp)} m/piksel (zoom ${r.z})</td></tr>
    </tbody></table>`}`;
    const cN=r.counts, warns=[...(A.cache.notes||[])];
    if(r.pix){warns.push('Hisob faqat sunʼiy yoʻldosh piksellaridan: daraxt tojlari ostidagi trotuar va yoʻl «yashil» boʻlib chiqadi; yorugʻ tomlar trotuardan ajratilmaydi (buning uchun «OSM binolari»ni yoqing). Tasvir sanasi nomaʼlum.');}
    else{if(!cN.ped) warns.push('Bu hududda trotuar/piyoda yoʻlaklari OSMda chizilmagan: piyoda ulushi faqat «yoʻl yoqasi» taxminiga tayanadi.');
    if(!cN.bld) warns.push('OSMda binolar yoʻq — tomlar «boshqa qattiq sirt»ga tushgan boʻlishi mumkin.');
    }
    if(r.cnt.shadow/r.tot>.08) warns.push('Soya ulushi yuqori. «Soya chegarasi»ni pasaytirib qayta hisoblang.');
    if(!r.pix)h+=`<div class="small">OSM obyektlari: binolar <b class="num">${cN.bld}</b>, avto yoʻllar <b class="num">${cN.veh}</b>, piyoda <b class="num">${cN.ped}</b>, velo <b class="num">${cN.bike}</b>, parkovka <b class="num">${cN.park}</b>, suv <b class="num">${cN.water}</b>.</div>`;
    warns.forEach(w=>h+=`<div class="warnbox">${w}</div>`);
    if(r.pix)h+=`<details><summary>Qanday hisoblanadi va aniqligi</summary><p class="small">Har bir piksel Esri World Imagery tasviridan rangi boʻyicha tasniflanadi: oʻsimlik — yashillik indeksi (ExG); soya — past yorqinlik; tuproq va qizgʻish tomlar — iliq rang; qolgan kulrang sirtlar yorqinlik boʻyicha ikkiga boʻlinadi: qoramtir — asfalt, yorugʻ — trotuar, maydon, tomlar. Chegara Otsu usulida (yorqinlik gistogrammasidan) avtomatik tanlanadi yoki qoʻlda beriladi. OpenStreetMap faqat «binolarni ajratish» yoqilganda ishlatiladi.</p></details>`;
    else h+=`<details><summary>Qanday hisoblanadi va aniqligi</summary><p class="small">Binolar, yoʻllar, trotuarlar, parkovka, relslar va suv chegaralari OpenStreetMap geometriyasidan olinadi (yoʻl kengligi: <i>width</i> → <i>lanes</i> × 3,3 m → yoʻl toifasi boʻyicha standart). Oʻsimlik, ochiq tuproq va soya Esri World Imagery piksellari rangidan aniqlanadi (ExG = 2G−R−B indeksi). OSMda belgilanmagan, yoʻl chetidan belgilangan masofadagi qattiq sirt «yoʻl yoqasi / trotuar (taxmin)» deb olinadi. Daraxt tojlari yoʻl ustida boʻlsa, piksel funksional jihatdan yoʻl hisoblanadi; oʻsimlik qoplami foizi esa alohida, barcha piksellar boʻyicha beriladi. Sunʼiy yoʻldosh tasvirining olingan sanasi nomaʼlum — natijani joyida yoki yangi tasvir bilan tekshiring.</p></details>`;
  }
  const PX=(A.P.src||'pix')==='pix';
  h+=`<div class="params" style="margin:6px 0"><label for="pSrc"><b>Tahlil manbasi</b></label><select id="pSrc" class="btn sm" style="grid-column:1/-1"><option value="pix" ${PX?'selected':''}>Sunʼiy yoʻldosh tasviri (piksellar)</option><option value="mix" ${PX?'':'selected'}>Sunʼiy yoʻldosh + OSM qatlamlari</option></select>
    ${PX?`<label style="grid-column:1/-1;display:flex;gap:6px;align-items:center"><input type="checkbox" id="pOsmB" ${A.P.osmB?'checked':''}> Binolarni OSM dan ajratish (tomlar trotuarga qoʻshilmasin)</label>`:''}</div>`;
  h+=`<details ${r?'':'open'}><summary>Parametrlar</summary><div class="params" style="margin-top:8px">
    ${PX?`<label for="pAs">Asfalt chegarasi (yorqinlik)</label><span class="num" id="vAs">${A.P.asph==='auto'?'avto'+(A.thrA?' ('+A.thrA+')':''):A.P.asph}</span><input id="pAs" type="range" min="60" max="190" step="1" value="${A.P.asph==='auto'?(A.thrA||130):A.P.asph}" style="grid-column:1/-1"><button class="btn sm" id="pAsAuto" style="grid-column:1/-1;justify-self:start">Avto (Otsu)</button>`:''}
    <label for="pVeg">Oʻsimlik sezgirligi (ExG chegarasi)</label><span class="num" id="vVeg">${A.P.veg.toFixed(3)}</span><input id="pVeg" type="range" min="0" max="0.15" step="0.005" value="${A.P.veg}" style="grid-column:1/-1">
    <label for="pSh">Soya chegarasi (yorqinlik)</label><span class="num" id="vSh">${A.P.shadow}</span><input id="pSh" type="range" min="10" max="90" step="1" value="${A.P.shadow}" style="grid-column:1/-1">
    ${PX?'':`<label for="pSide">Trotuar taxmini: yoʻl chetidan, m</label><span class="num" id="vSide">${A.P.side}</span><input id="pSide" type="range" min="0" max="10" step="0.5" value="${A.P.side}" style="grid-column:1/-1">
    <label for="pRm">Yoʻl kengligi koeffitsiyenti</label><span class="num" id="vRm">${A.P.roadMul}</span><input id="pRm" type="range" min="0.6" max="1.6" step="0.05" value="${A.P.roadMul}" style="grid-column:1/-1">`}
    <label for="pZ">Tasvir zoom</label><select id="pZ" class="btn sm"><option value="auto">avto</option><option>17</option><option>18</option><option>19</option></select>
  </div>${A.cache?'<button class="btn sm primary" id="aRecl" style="margin-top:8px">Parametrlar bilan qayta tasniflash</button>':''}</details>`;
  if(r&&!A.busy) h+=`<div class="tools"><button class="btn" id="aCsv">Natija (.csv)</button><button class="btn" id="aPng">Tasnif xaritasi (.png)</button><button class="btn" id="aGeo">Hudud chegarasi (.geojson)</button></div>`;
  el.innerHTML=h;
  const q=s=>el.querySelector(s);
  el.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{A.tool=b.dataset.tool;A.pts=[];drawArea();renderHint();renderAreaPanel();});
  q('#aView').onclick=()=>{const b=map.getBounds();A.poly=[[b.getNorth(),b.getWest()],[b.getNorth(),b.getEast()],[b.getSouth(),b.getEast()],[b.getSouth(),b.getWest()]];A.pts=[];drawArea();analyze();};
  if(q('#aRe'))q('#aRe').onclick=analyze;
  const bind=(id,key,vid,cast)=>{const i=q(id);if(!i)return;i.oninput=()=>{A.P[key]=cast(i.value);q(vid).textContent=i.value;saveArea();};};
  bind('#pVeg','veg','#vVeg',parseFloat);bind('#pSh','shadow','#vSh',parseFloat);bind('#pSide','side','#vSide',parseFloat);bind('#pRm','roadMul','#vRm',parseFloat);
  q('#pZ').value=A.P.zoom;q('#pZ').onchange=e=>{A.P.zoom=e.target.value;saveArea();};
  const recl=()=>{if(A.cache){classify();}renderAreaPanel();};
  q('#pSrc').onchange=e=>{A.P.src=e.target.value;saveArea();recl();};
  if(q('#pOsmB'))q('#pOsmB').onchange=e=>{A.P.osmB=e.target.checked;saveArea();recl();};
  if(q('#pAs')){q('#pAs').oninput=e=>{A.P.asph=+e.target.value;q('#vAs').textContent=e.target.value;saveArea();};q('#pAs').onchange=()=>recl();}
  if(q('#pAsAuto'))q('#pAsAuto').onclick=()=>{A.P.asph='auto';saveArea();recl();};
  if(q('#aRecl'))q('#aRecl').onclick=()=>{if(A.cache&&A.cache.z!==(A.P.zoom==='auto'?A.cache.z:+A.P.zoom)){analyze();return;}classify();renderAreaPanel();};
  if(q('#aCsv'))q('#aCsv').onclick=()=>{const L2=['Sinf;Guruh;m2;%',...AC.map(c=>[c.n,c.g,Math.round(r.cnt[c.k]*r.px2),(r.cnt[c.k]/r.tot*100).toFixed(2)].join(';')),`Jami;;${Math.round(r.m2)};100`,'',
    `Oʻsimlik qoplami (sputnik), %;;;${(r.canopy/r.tot*100).toFixed(2)}`,`Yoʻl sirtining soyali qismi, %;;;${r.roadAll?(r.roadCan/r.roadAll*100).toFixed(2):''}`,`Tasvir aniqligi, m/piksel;;;${r.mpp.toFixed(3)}`];
    dl('hudud-tahlili.csv','﻿'+L2.join('\n'),'text/csv');};
  if(q('#aPng'))q('#aPng').onclick=()=>{const a=document.createElement('a');a.href=r.url;a.download='hudud-tasnif.png';document.body.appendChild(a);a.click();a.remove();};
  if(q('#aGeo'))q('#aGeo').onclick=()=>dl('hudud.geojson',JSON.stringify({type:'Feature',properties:{maydon_m2:Math.round(r.m2)},geometry:{type:'Polygon',coordinates:[[...A.poly,A.poly[0]].map(p=>[p[1],p[0]])]}}),'application/geo+json');
}
document.getElementById('opac').oninput=e=>{A.opac=+e.target.value;if(classOverlay)classOverlay.setOpacity(A.opac);};

function setApp(a){
  S.app=a;document.querySelectorAll('#appTabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.app===a));
  const ar=a==='area',pr=a==='prof',de=a==='design';
  document.getElementById('profModes').hidden=!pr;document.getElementById('profView').hidden=!pr;document.getElementById('areaView').hidden=!ar;
  document.getElementById('areaPanel').hidden=!ar;document.getElementById('profPanel').hidden=!pr;document.getElementById('compare').hidden=!pr;
  document.getElementById('designPanel').hidden=!de;
  [planL,measL,drawL].forEach(l=>pr?l.addTo(map):map.removeLayer(l)); ar?areaL.addTo(map):map.removeLayer(areaL);
  if(typeof designL!=='undefined'){de?designL.addTo(map):map.removeLayer(designL); de?map.doubleClickZoom.disable():(M.tool||map.doubleClickZoom.enable()); if(de){renderDesign();renderDesignPanel();}}
  map.getContainer().style.cursor=ar||de?'crosshair':(S.mode==='pick'?'pointer':'crosshair');
  renderHint();if(ar)renderAreaPanel();save();
}
document.querySelectorAll('#appTabs button').forEach(b=>b.onclick=()=>setApp(b.dataset.app));
drawArea();

/* =====================================================================
   OʻLCHASH ASBOBLARI: lineyka, maydon, kesim → profil
   ===================================================================== */
let lastLL=null;
const M={tool:null,pts:[],items:(S.meas||[]),busy:false};
const mL=L.layerGroup().addTo(map), mTmp=L.layerGroup().addTo(map);
const fmtD=d=>d>=1000?f2(d/1000)+' km':f2(d)+' m';
const fmtA=a=>a>=10000?f2(a/10000)+' ga':fi(a)+' m²';
function lineLen(p){let d=0;for(let i=1;i<p.length;i++)d+=map.distance(p[i-1],p[i]);return d;}
function polyArea(p){const o=p[0],q=p.map(x=>toXY(x,o));let a=0;for(let i=0;i<q.length;i++){const j=(i+1)%q.length;a+=q[i][0]*q[j][1]-q[j][0]*q[i][1];}return Math.abs(a/2);}
const lab=(ll,t)=>L.marker(ll,{interactive:false,icon:L.divIcon({className:'',html:`<span class="mlab">${t}</span>`,iconSize:null,iconAnchor:[-6,10]})});
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
function saveMeas(){S.meas=M.items.map(({type,pts,runs,total,name})=>({type,pts,runs,total,name}));save();}

function setTool(t){
  M.tool=M.tool===t?null:t;M.pts=[];mTmp.clearLayers();
  document.querySelectorAll('.mbar button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===M.tool));
  M.tool?map.doubleClickZoom.disable():map.doubleClickZoom.enable();
  map.getContainer().style.cursor=M.tool?'crosshair':'';
  measHint();
}
document.querySelectorAll('.mbar button').forEach(b=>b.onclick=()=>setTool(b.dataset.m));
function measHint(){
  const h=document.getElementById('hint');
  if(!M.tool){renderHint();return;}
  const n=M.pts.length;
  const txt={dist:`<b>Lineyka.</b> Nuqtalarni bosing. Har bir boʻlak va jami masofa koʻrsatiladi.${n>1?` Hozir: <b class="num">${fmtD(lineLen(M.pts))}</b>`:''}`,
    area:`<b>Maydon.</b> Chegarani nuqtama-nuqta bosing, birinchi nuqtani bosib yoki Enter bilan yoping.${n>2?` Hozir: <b class="num">${fmtA(polyArea(M.pts))}</b>`:''}`,
    cut:`<b>Kesim → profil.</b> Koʻchaning bir chetini (bino yoki panjara chizigʻi), soʻng qarama-qarshi chetini bosing. Shu chiziq boʻyicha sunʼiy yoʻldosh tasniflanadi va mavjud profil hosil boʻladi.`}[M.tool];
  h.innerHTML=txt+(M.tool!=='cut'&&n?`<div class="row"><button class="btn sm primary" id="mFin" ${n<(M.tool==='area'?3:2)?'disabled':''}>Tugatish (Enter)</button><button class="btn sm" id="mUndo">Oxirgi nuqta (⌫)</button><button class="btn sm" id="mEsc">Bekor (Esc)</button></div>`:'')+(M.busy?`<div class="small">Tahlil qilinmoqda…</div>`:'');
  const q=id=>h.querySelector(id);
  if(q('#mFin'))q('#mFin').onclick=measFinish; if(q('#mUndo'))q('#mUndo').onclick=measUndo; if(q('#mEsc'))q('#mEsc').onclick=()=>{M.pts=[];mTmp.clearLayers();measHint();};
}
function measClick(ll){
  if(M.busy)return;
  const p=[ll.lat,ll.lng];
  if(M.tool==='area'&&M.pts.length>2){const f=map.latLngToContainerPoint(M.pts[0]),c=map.latLngToContainerPoint(ll);if(f.distanceTo(c)<12){measFinish();return;}}
  M.pts.push(p);
  if(M.tool==='cut'&&M.pts.length===2){const [a,b]=M.pts;M.pts=[];mTmp.clearLayers();doCut(a,b);return;}
  drawTmp();measHint();
}
function measUndo(){M.pts.pop();drawTmp();measHint();}
function measFinish(){
  const n=M.pts.length;
  if(M.tool==='dist'&&n>=2){M.items.unshift({type:'dist',pts:M.pts.slice()});}
  else if(M.tool==='area'&&n>=3){M.items.unshift({type:'area',pts:M.pts.slice()});}
  else return;
  M.pts=[];mTmp.clearLayers();saveMeas();renderMeas();measHint();
}
function drawTmp(cur){
  mTmp.clearLayers();const p=M.pts.slice();if(!p.length)return;
  const all=cur?[...p,cur]:p;
  if(M.tool==='area'&&all.length>2)L.polygon(all,{color:'#f4c542',weight:2,fillOpacity:.15,dashArray:cur?'5 4':null}).addTo(mTmp);
  else L.polyline(all,{color:M.tool==='cut'?'#e2533f':'#f4c542',weight:3,dashArray:cur?'5 4':null}).addTo(mTmp);
  p.forEach(q=>L.circleMarker(q,{radius:4,color:'#1c2628',weight:1,fillColor:'#f4c542',fillOpacity:1}).addTo(mTmp));
  for(let i=1;i<all.length;i++)lab(mid(all[i-1],all[i]),fmtD(map.distance(all[i-1],all[i]))).addTo(mTmp);
  if(cur&&M.tool==='dist'&&all.length>2)lab(cur,'Σ '+fmtD(lineLen(all))).addTo(mTmp);
  if(cur&&M.tool==='area'&&all.length>2)lab(cur,fmtA(polyArea(all))).addTo(mTmp);
}
map.on('mousemove',e=>{
  document.getElementById('coords').textContent=`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
  if(M.tool&&M.pts.length)drawTmp([e.latlng.lat,e.latlng.lng]);
});
document.addEventListener('keydown',e=>{
  if(!M.tool||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(e.key==='Enter'){e.preventDefault();measFinish();}
  else if(e.key==='Backspace'){e.preventDefault();measUndo();}
  else if(e.key==='Escape'){if(M.pts.length){M.pts=[];mTmp.clearLayers();measHint();}else setTool(M.tool);}
});
document.getElementById('copyC').onclick=async()=>{
  const t=lastLL?`${lastLL.lat.toFixed(6)}, ${lastLL.lng.toFixed(6)}`:document.getElementById('coords').textContent;
  try{await navigator.clipboard.writeText(t);toast('Nusxalandi: '+t);}catch(e){toast(t);}
};
document.getElementById('bigMap').onclick=()=>{document.body.classList.toggle('big');setTimeout(()=>map.invalidateSize(),60);};

/* Kesim: sunʼiy yoʻldosh tasnifidan koʻndalang profil */
const CUT2LIB={asph:'lane',light:'walk',road:'lane',park:'park',rail:'tram',bike:'bike1',ped:'walk',side:'walk',water:'water',veg:'trees',soil:'lawn',paved:'walk'};
async function doCut(a,b){
  const total=map.distance(a,b);
  if(total<3||total>200){toast('Kesim uzunligi 3–200 m boʻlishi kerak.');return;}
  M.busy=true;measHint();
  const sample=()=>{const C=A.cache,r=A.res;if(!C||!r||!r.cls)return null;const n=Math.max(2,Math.round(total/0.2)),out=[];let miss=0;
    for(let i=0;i<=n;i++){const t=i/n,lat=a[0]+(b[0]-a[0])*t,lon=a[1]+(b[1]-a[1])*t;const px=Math.floor(gxf(lon,C.z)-C.gx0),py=Math.floor(gyf(lat,C.z)-C.gy0);
      const c=(px>=0&&py>=0&&px<C.cw&&py<C.ch)?r.cls[py*C.cw+px]:255;if(c===255)miss++;out.push(c);}
    return miss/out.length>.05?null:out;};
  let s=sample();
  if(!s){
    const la=Math.min(a[0],b[0]),lb=Math.max(a[0],b[0]),oa=Math.min(a[1],b[1]),ob=Math.max(a[1],b[1]),d=25/110574,e=25/(111320*Math.cos(a[0]*R));
    A.poly=[[lb+d,oa-e],[lb+d,ob+e],[la-d,ob+e],[la-d,oa-e]];drawArea();
    toast('Kesim atrofi sunʼiy yoʻldoshdan tahlil qilinmoqda…');
    await analyze(); s=sample();
  }
  M.busy=false;
  if(!s){toast(A.err||'Kesim boʻyicha tasnif olinmadi.');measHint();return;}
  // uzluksiz boʻlaklar
  const step=total/(s.length-1);
  const runs=runsFromSeq(s,step);
  const tot=runs.reduce((x,r)=>x+r.len,0);
  M.items.unshift({type:'cut',pts:[a,b],runs,total:tot});saveMeas();renderMeas();setTool('cut');measHint();
  toast(`Kesim tayyor: ${f2(tot)} m, ${runs.length} ta zona. «Profilga» tugmasini bosing.`);
}
function runsFromSeq(seq,step){
  let runs=[];
  seq.forEach(c=>{const k=(c===255||c==null)?'shadow':AC[c].k;const l=runs[runs.length-1];if(l&&l.k===k)l.len+=step;else runs.push({k,len:step});});
  runs.forEach((r,i)=>{if(r.k==='shadow'){const nb=runs[i-1]&&runs[i-1].k!=='shadow'?runs[i-1]:runs.slice(i+1).find(x=>x.k!=='shadow');if(nb)r.k=nb.k;}});
  const merge=()=>{const o=[];runs.forEach(r=>{const l=o[o.length-1];if(l&&l.k===r.k)l.len+=r.len;else o.push({...r});});runs=o;};
  merge();
  for(let guard=0;guard<80;guard++){const i=runs.findIndex(r=>r.len<.6);if(i<0||runs.length<2)break;const L1=runs[i-1],R1=runs[i+1];const t=!L1?R1:!R1?L1:(L1.len>=R1.len?L1:R1);t.len+=runs[i].len;runs.splice(i,1);merge();}
  while(runs.length&&runs[0].k==='build')runs.shift(); while(runs.length&&runs[runs.length-1].k==='build')runs.pop();
  return runs;
}
function itemsFromRuns(runs){
  const items=[];
  runs.forEach(r=>{
    if(r.k==='road'){const n=Math.max(1,Math.round(r.len/3.3));for(let i=0;i<n;i++)items.push(mk('lane',r.len/n));}
    else if(r.k==='build')items.push(mk('buffer',r.len));
    else if(r.k==='bike')items.push(mk(r.len>=2.6?'bike2':'bike1',r.len));
    else{const k=CUT2LIB[r.k]||'furn',l=items[items.length-1];if(l&&l.k===k)l.w=+(l.w+r.len).toFixed(2);else items.push(mk(k,r.len));}
  });
  return items;
}
function cutToProfile(it){
  const items=itemsFromRuns(it.runs);
  const [a,b]=it.pts,o=a,va=toXY(a,o),vb=toXY(b,o),v=[vb[0]-va[0],vb[1]-va[1]],vl=Math.hypot(...v),d=[-v[1]/vl,v[0]/vl],m=[(va[0]+vb[0])/2,(va[1]+vb[1])/2];
  const half=Math.max(S.len,40)/2;
  const prev=clone(S);
  S.site={name:'Sunʼiy yoʻldosh kesimi',full:[toLL([m[0]-d[0]*half,m[1]-d[1]*half],o),toLL([m[0]+d[0]*half,m[1]+d[1]*half],o)],anchor:null,center:toLL(m,o),src:'cut',tags:null,
    notes:['Profil sunʼiy yoʻldosh + OSM tasnifidan olindi. Yoʻl eni boʻlak soniga 3,3 m hisobida boʻlindi; kengliklarni tekshirib toʻgʻrilang.']};
  S.prof.ex=items;S.prof.pr=items.map(e=>mk(e.k,e.w));S.row=+sum(items).toFixed(2);S.sel={ex:null,pr:null};S.active='ex';
  setApp('prof');renderAll();save();
  toast('Mavjud profil kesimdan yaratildi. Endi «Loyiha» ichida yangi dizaynni chizing.',()=>{S=prev;renderAll();save();});
}
function renderMeas(){
  mL.clearLayers();
  const el=document.getElementById('mlist');
  el.innerHTML=M.items.map((it,i)=>{
    let v,extra='';
    if(it.type==='dist'){v=fmtD(lineLen(it.pts));extra=it.pts.length>2?`<span class="small">${it.pts.length-1} boʻlak</span>`:'';}
    if(it.type==='area'){v=fmtA(polyArea(it.pts));extra=`<span class="small">perimetr ${fmtD(lineLen([...it.pts,it.pts[0]]))}</span>`;}
    if(it.type==='cut'){v=fmtD(it.total);extra=`<div class="mstrip">${it.runs.map(r=>{const c=AC.find(x=>x.k===r.k);return `<div style="flex:${r.len} 1 0;background:${c?c.col:'#999'}" title="${c?c.n:r.k}: ${f2(r.len)} m"></div>`;}).join('')}</div>
      <div class="small">${it.runs.map(r=>{const c=AC.find(x=>x.k===r.k);return (c?c.n.split(' (')[0]:r.k)+' '+f1(r.len);}).join(' · ')}</div>
      <button class="btn sm primary" data-prof="${i}">Profilga → loyihalash</button>`;}
    const name={dist:'Masofa',area:'Maydon',cut:'Kesim'}[it.type];
    return `<div class="mitem"><div class="h"><span>${name}</span><span class="v">${v}</span><button class="x" data-del="${i}" aria-label="Oʻchirish">✕</button></div>${extra}</div>`;
  }).join('')+(M.items.length?`<button class="btn sm" id="mClr">Hammasini tozalash</button>`:'');
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{M.items.splice(+b.dataset.del,1);saveMeas();renderMeas();});
  el.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>cutToProfile(M.items[+b.dataset.prof]));
  if(el.querySelector('#mClr'))el.querySelector('#mClr').onclick=()=>{M.items=[];saveMeas();renderMeas();};
  M.items.forEach((it,ii)=>{
    const col=it.type==='cut'?'#e2533f':'#f4c542';
    const menu=e=>{stopE(e);openMenu(e.containerPoint,[{h:{dist:'Masofa',area:'Maydon',cut:'Kesim'}[it.type]},it.type==='cut'?{t:'Profilga → loyihalash',f:()=>cutToProfile(it)}:null,{t:'Oʻchirish',danger:1,f:()=>{M.items.splice(M.items.indexOf(it),1);saveMeas();renderMeas();}},{t:'Hammasini tozalash',danger:1,f:()=>{M.items=[];saveMeas();renderMeas();}}]);};
    const shp=(it.type==='area'?L.polygon(it.pts,{color:col,weight:3,fillOpacity:.12,bubblingMouseEvents:false}):L.polyline(it.pts,{color:col,weight:3,bubblingMouseEvents:false})).on('contextmenu',menu).bindTooltip('Oʻng tugma — oʻchirish; nuqtalarni sudrang',{sticky:true}).addTo(mL);
    const vi=L.divIcon({className:'',iconSize:[12,12],iconAnchor:[6,6],html:`<div style="width:12px;height:12px;border-radius:50%;background:${col};border:2px solid #1c2628;cursor:grab"></div>`});
    it.pts.forEach((q,k)=>{const mk=L.marker(q,{draggable:true,icon:vi,zIndexOffset:900}).addTo(mL);
      mk.on('drag',e=>{const g=e.target.getLatLng();it.pts[k]=[g.lat,g.lng];shp.setLatLngs(it.pts);});mk.on('dragend',()=>{saveMeas();renderMeas();});mk.on('contextmenu',menu);});
    if(it.type==='dist'){for(let i=1;i<it.pts.length;i++)lab(mid(it.pts[i-1],it.pts[i]),fmtD(map.distance(it.pts[i-1],it.pts[i]))).addTo(mL);if(it.pts.length>2)lab(it.pts[it.pts.length-1],'Σ '+fmtD(lineLen(it.pts))).addTo(mL);}
    if(it.type==='area'){const c=it.pts.reduce((s,p)=>[s[0]+p[0]/it.pts.length,s[1]+p[1]/it.pts.length],[0,0]);lab(c,fmtA(polyArea(it.pts))).addTo(mL);}
    if(it.type==='cut')lab(mid(...it.pts),fmtD(it.total)).addTo(mL);
  });
}
renderMeas();
const _rh=renderHint; renderHint=function(){if(M.tool){measHint();return;}_rh();};

/* =====================================================================
   AVTOMATIK PROFIL: koʻchani bosish → sunʼiy yoʻldosh + OSM → mavjud profil
   ===================================================================== */
async function autoProfile(){
  const ax=clippedAxis(); if(!ax||ax.len<8) return false;
  const H=35, ST=0.25;
  A.poly=[...offsetLine(ax.xy,H+4),...offsetLine(ax.xy,-(H+4)).reverse()].map(q=>toLL(q,ax.o));
  hint('Sunʼiy yoʻldosh tasviri va OSM tahlil qilinmoqda — profil aniqlanmoqda…');
  A.forceMix=true;try{await analyze();}finally{A.forceMix=false;}
  if(!A.res||!A.res.cls||A.err){hint(null);return false;}
  const C=A.cache, cls=A.res.cls, c=cumLen(ax.xy), T=c[c.length-1], nD=Math.round(2*H/ST)+1, NA=AC.length;
  const cnt=Array.from({length:nD},()=>new Uint32Array(NA+1));
  // Piksel asosidagi kesim: qatnov qismi OSM buferidan emas, tasvirdagi asfalt rangidan aniqlanadi
  const KI=Object.fromEntries(AC.map((c,i)=>[c.k,i])),P=A.P,pix=C.pix;
  const samp=[];
  for(let s=1;s<T-1;s+=1){
    const p=pointAt(ax.xy,c,s),p1=pointAt(ax.xy,c,Math.max(0,s-.7)),p2=pointAt(ax.xy,c,Math.min(T,s+.7));
    const tx=p2[0]-p1[0],ty=p2[1]-p1[1],tl=Math.hypot(tx,ty)||1,n=[-ty/tl,tx/tl];
    for(let i=0;i<nD;i++){const d=H-i*ST,ll=toLL([p[0]+n[0]*d,p[1]+n[1]*d],ax.o);
      const px=Math.floor(gxf(ll[1],C.z)-C.gx0),py=Math.floor(gyf(ll[0],C.z)-C.gy0);
      samp.push(i,(px>=0&&py>=0&&px<C.cw&&py<C.ch)?py*C.cw+px:-1);}
  }
  const feat=j=>{const r=pix[j*4],g=pix[j*4+1],b=pix[j*4+2],sm=r+g+b,br=sm/3,mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=(mx-mn)/(mx+1),exg=(2*g-r-b)/(sm+1);
    const veg=exg>P.veg&&g>=r*.95&&br>18,soil=!veg&&r>g&&g>b&&sat>.18&&br>70&&(r-b)>25;return {br,veg,soil,sh:br<P.shadow};};
  const med=a=>{if(!a.length)return null;a.sort((x,y)=>x-y);return a[a.length>>1];};
  const aB=[],pB=[];
  for(let q=0;q<samp.length;q+=2){const i=samp[q],j=samp[q+1];if(j<0)continue;const k=cls[j],f=feat(j);if(f.veg||f.soil||f.sh)continue;const d=Math.abs(H-i*ST);
    if(k===KI.road&&d<=3)aB.push(f.br);else if(k===KI.ped||k===KI.side)pB.push(f.br);}
  const mA=med(aB),mP=med(pB);
  const thr=mA==null?null:(mP!=null&&pB.length>30&&mP>mA+12?Math.min(mA+60,Math.max(mA+12,(mA+mP)/2)):mA+30);
  for(let q=0;q<samp.length;q+=2){const i=samp[q],j=samp[q+1];if(j<0){cnt[i][NA]++;continue;}
    const k=cls[j];let L2=k;
    if(thr!=null&&k!==KI.build&&k!==KI.water&&k!==KI.rail&&k!==KI.bike){const f=feat(j);
      if(f.veg)L2=KI.veg;else if(f.sh)L2=KI.shadow;else if(f.soil)L2=KI.soil;else if(f.br<=thr)L2=(k===KI.park?KI.park:KI.road);else L2=(k===KI.ped?KI.ped:KI.side);}
    cnt[i][L2]++;}
  const SH=AC.findIndex(x=>x.k==='shadow');
  const maj=cnt.map(h=>{let b=-1,bv=0,t=0;for(let k=0;k<NA;k++){t+=h[k];if(k!==SH&&h[k]>bv){bv=h[k];b=k;}}return bv>0&&bv>=t*.15?b:(t?SH:255);});
  const key=i=>maj[i]===255?'none':AC[maj[i]].k;
  // yoʻl oʻqiga eng yaqin qatnov qismi
  const i0=Math.round(H/ST); let ic=i0;
  for(let r=0;r<nD;r++){if(key(i0-r)==='road'){ic=i0-r;break;}if(key(i0+r)==='road'){ic=i0+r;break;}}
  const edge=dir=>{let bRun=0,pRun=0,sRun=0,i=ic;
    for(;i>=0&&i<nD;i+=dir){const k=key(i);
      if(k==='none')return {i:i-dir,why:'tahlil chegarasi'};
      if(k==='build'){if(++bRun>=4)return {i:i-dir*bRun,why:'bino'};}else bRun=0;
      if(k==='paved'||k==='soil'){if(++pRun>=16)return {i:i-dir*pRun,why:'hovli/ochiq maydon'};}else pRun=0;
      if(k==='side'||k==='ped'){if(++sRun>=48)return {i:i-dir*sRun,why:'keng ochiq maydon'};}else sRun=0;}
    return {i:i-dir,why:`${H} m chegara`};};
  const eL=edge(-1),eR=edge(1);
  const seq=maj.slice(eL.i,eR.i+1).map(k=>k===SH?255:k);
  const runs=runsFromSeq(seq,ST); if(!runs.length){hint(null);return false;}
  const items=itemsFromRuns(runs);
  const shares={},tot={n:0};
  for(let i=eL.i;i<=eR.i;i++)for(let k=0;k<NA;k++){shares[AC[k].k]=(shares[AC[k].k]||0)+cnt[i][k];tot.n+=cnt[i][k];}
  Object.keys(shares).forEach(k=>shares[k]=shares[k]/tot.n*100);
  S.prof.ex=items;S.prof.pr=items.map(e=>mk(e.k,e.w));S.row=+sum(items).toFixed(2);S.sel={ex:null,pr:null};S.active='ex';
  {const dTop=H-eL.i*ST+ST/2,dBot=H-eR.i*ST-ST/2;S.site.off=+((dTop+dBot)/2).toFixed(2);}
  S.site.shares=shares;S.site.auto=true;
  S.site.notes=[`Profil ${fi(T)} m uchastka boʻylab har 1 m da olingan kesimlarning koʻpchilik qiymatidan aniqlandi (sunʼiy yoʻldosh + OSM).`,
    `Chap chet: ${eL.why}; oʻng chet: ${eR.why}. Qizil chiziqlar orasini «Kesimni oʻlchash» bilan tekshiring.`,
    thr!=null?`Qatnov qismi tasvirdagi asfalt rangidan aniqlandi (asfalt yorqinligi ≈${Math.round(mA)}, chegara ${Math.round(thr)}); OSM oʻqidan siljish ${f2(S.site.off||0)} m.`:'Asfalt rangi aniqlanmadi — qatnov qismi OSM teglaridan olindi.',
    'Daraxt tojlari ostidagi trotuar «yashil» boʻlib chiqishi mumkin; yoʻl eni boʻlaklarga 3,3 m hisobida boʻlingan. Chetlarni xaritadagi ↔ tutqichlar bilan, butun profilni ✥ bilan siljiting.'];
  renderAll();save();hint(null);return true;
}

/* =====================================================================
   LOYIHA CHIZISH: YHQ ga mos, bir-biriga ulanadigan modullar
   ===================================================================== */
const DK={
  walk:{n:'Trotuar',col:'#e4d9c3',cat:'ped'}, shared:{n:'Umumiy sirt (yashash zonasi)',col:'#dccfb0',cat:'ped'},
  green:{n:'Koʻkalamzor / daraxt qatori',col:'#8cb36b',cat:'green'}, median:{n:'Ajratuvchi polosa (koʻkalamzor)',col:'#86ad66',cat:'green'},
  buffer:{n:'Himoya bufer / bordyur',col:'#d6d1c6',cat:'ped'},
  lane:{n:'Harakat boʻlagi',col:'#4b4e55',cat:'car',road:1}, turn:{n:'Markaziy burilish boʻlagi',col:'#51545b',cat:'car',road:1},
  hatch:{n:'Chiziqli ajratuvchi (shtrixlangan)',col:'#55585f',cat:'car',road:1},
  park:{n:'Parkovka — parallel',col:'#62656c',cat:'car',road:1,ang:0,sp:6},park30:{n:'Parkovka — 30° burchakli',col:'#62656c',cat:'car',road:1,ang:30,sp:5},
  park45:{n:'Parkovka — 45° burchakli',col:'#62656c',cat:'car',road:1,ang:45,sp:3.54},park90:{n:'Parkovka — perpendikulyar (90°)',col:'#62656c',cat:'car',road:1,ang:90,sp:2.5},
  bus:{n:'Yoʻnalishli transport boʻlagi (avtobus/BRT)',col:'#bf5a4d',cat:'pt',road:1}, tram:{n:'Tramvay yoʻli',col:'#6b6c72',cat:'pt',road:1},
  bike:{n:'Velosiped boʻlagi/yoʻlkasi',col:'#5fae88',cat:'bike'},
  rain:{n:'Yomgʻir bogʻi (bioswale)',col:'#6aa07f',cat:'green'}, island:{n:'Xavfsizlik orolchasi (bordyurli)',col:'#d3cab6',cat:'ped'},
  furn:{n:'Jihozlar zonasi (skameyka, chiroq)',col:'#cdbfa3',cat:'ped'},
};
const isPk=k=>typeof k==='string'&&k.startsWith('park');
const PKW={park:2.3,park30:4.7,park45:5.3,park90:5};
const DCAT={car:['Avto yoʻl','#3c3e43'],pt:['Jamoat transporti','#9e3a32'],bike:['Velo','#2f8f58'],ped:['Piyoda','#d6c3a2'],green:['Yashil','#6f8f4e']};

/* parametrik kesim generatori (Konstruktor va tayyor modullar shundan hosil boʻladi) */
function gen(o){
  const lw=o.lw||3.5;
  const side=(dir,n)=>{const a=[];
    if(o.tram==='center')a.push(['tram',3.2,dir]);
    if(o.bus==='center')a.push(['bus',3.5,dir]);
    for(let i=0;i<n;i++)a.push(['lane',lw,dir]);
    if(o.bus==='curb')a.push(['bus',3.5,dir]);
    if(o.tram==='side')a.push(['tram',3.2,dir]);
    if(o.park==='both'||(o.park==='right'&&dir>0)){const pk=o.pang?'park'+o.pang:'park';a.push([pk,o.pang?PKW[pk]:(o.pw||2.3),dir]);}
    if(o.bike==='lane')a.push(['bike',1.8,dir]);
    if(o.bike==='prot'){a.push(['buffer',.8]);a.push(['bike',2,dir]);}
    if(o.service){a.push(['green',o.sep||4]);for(let i=0;i<o.service;i++)a.push(['lane',3.5,dir]);if(o.spark)a.push(['park',2.3,dir]);}
    if(o.bike==='track'){a.push(['green',1.2]);a.push(['bike',2,dir]);}
    if(o.bike==='track2'&&dir>0){a.push(['green',1.2]);a.push(['bike',3,0]);}
    if(o.rain)a.push(['rain',o.rw||2]);
    if((o.green??2)>0)a.push(['green',o.green??2]);
    if(o.furn)a.push(['furn',1.2]);
    if((o.walk??3)>0)a.push(['walk',o.walk??3]);
    return a;};
  let left;
  if(o.oneway){left=[];if(o.contra)left.push(['bus',3.5,-1]);if(o.bike==='track2'){left.push(['green',1.2],['bike',3,0]);}if((o.green??2)>0)left.push(['green',o.green??2]);if((o.walk??3)>0)left.push(['walk',o.walk??3]);}
  else left=side(-1,o.b??2);
  const right=side(1,o.f??2),med=[];
  if(o.med==='green')med.push(['median',o.mw||3]);
  if(o.med==='hatch')med.push(['hatch',o.mw||1.5]);
  if(o.med==='island')med.push(['island',o.mw||2]);
  if(o.med==='rain')med.push(['rain',o.mw||3]);
  if(o.med==='turn')med.push(['turn',o.mw||3.25,0]);
  if(o.med==='brt')med.push(['median',1],['bus',3.5,-1],['bus',3.5,1],['median',1]);
  if(o.med==='brtst')med.push(['median',.8],['bus',3.5,-1],['walk',o.mw||4],['bus',3.5,1],['median',.8]);
  if(o.med==='boul')med.push(['median',2],['walk',o.mw||8],['median',2]);
  if(o.med==='tram')med.push(['median',1],['tram',3.2,-1],['tram',3.2,1],['median',1]);
  return [...left.slice().reverse(),...med,...right];
}
const P_=(g,n,o)=>({g,n,o});
const PRESETS={
  // Mahalla va turar joy
  shared:P_('Mahalla va turar joy','Yashash koʻchasi — umumiy sirt',null),
  res1:P_('Mahalla va turar joy','Mahalla koʻchasi 1+1, ariqli',{f:1,b:1,lw:3,green:1.2,walk:2}),
  res:P_('Mahalla va turar joy','Mahalla koʻchasi + parkovka (2 tomon)',{f:1,b:1,lw:3,park:'both',pw:2.2,green:1.2,walk:2}),
  resp1:P_('Mahalla va turar joy','Mahalla koʻchasi + parkovka (1 tomon)',{f:1,b:1,lw:3,park:'right',pw:2.2,green:1.2,walk:2}),
  res45:P_('Mahalla va turar joy','Mahalla koʻchasi + 45° parkovka',{f:1,b:1,lw:3,park:'both',pang:45,green:1.2,walk:2}),
  res90:P_('Mahalla va turar joy','Bir tomonlama + perpendikulyar parkovka',{oneway:1,f:1,lw:3.5,park:'right',pang:90,green:1.2,walk:2}),
  r4p30:P_('Shahar koʻchalari','4 boʻlak + 30° parkovka',{f:2,b:2,lw:3.25,park:'both',pang:30,green:1.5,walk:3}),
  resOne:P_('Mahalla va turar joy','Bir tomonlama mahalla koʻchasi + parkovka',{oneway:1,f:1,lw:3.5,park:'right',pw:2.2,green:1,walk:2}),
  school:P_('Mahalla va turar joy','Maktab oldi (tor boʻlak, keng trotuar)',{f:1,b:1,lw:3,green:1.5,walk:4}),
  // Shahar koʻchalari
  r2:P_('Shahar koʻchalari','2 boʻlak (1+1)',{f:1,b:1,green:1.5,walk:2.5}),
  r2b:P_('Shahar koʻchalari','2 boʻlak + velo boʻlaklar',{f:1,b:1,lw:3.25,bike:'lane',green:1.5,walk:2.5}),
  r2pb:P_('Shahar koʻchalari','2 boʻlak + parkovka + velo',{f:1,b:1,lw:3.25,park:'both',bike:'lane',green:1.2,walk:2.5}),
  r2rain:P_('Shahar koʻchalari','2 boʻlak + yomgʻir bogʻlari',{f:1,b:1,lw:3.25,rain:1,green:0,walk:2.5}),
  r4rain:P_('Shahar koʻchalari','4 boʻlak + yomgʻir bogʻlari + velo',{f:2,b:2,lw:3.25,rain:1,bike:'prot',green:0,walk:2.5}),
  r4isl:P_('Shahar koʻchalari','4 boʻlak + markaziy xavfsizlik orolchasi',{f:2,b:2,lw:3.25,med:'island',mw:2,green:1.5,walk:3}),
  r2t:P_('Shahar koʻchalari','2+1: markaziy burilish boʻlagi',{f:1,b:1,lw:3.25,med:'turn',green:1.5,walk:2.5}),
  r4:P_('Shahar koʻchalari','4 boʻlak (2+2)',{f:2,b:2,green:2,walk:3}),
  r4h:P_('Shahar koʻchalari','4 boʻlak + chiziqli ajratuvchi',{f:2,b:2,lw:3.25,med:'hatch',mw:1.5,green:2,walk:3}),
  r4p:P_('Shahar koʻchalari','4 boʻlak + parkovka',{f:2,b:2,lw:3.25,park:'both',green:1.5,walk:3}),
  r4b:P_('Shahar koʻchalari','4 boʻlak + velo boʻlaklar',{f:2,b:2,lw:3.25,bike:'lane',green:1.5,walk:2.5}),
  r4pb:P_('Shahar koʻchalari','4 boʻlak + himoyalangan velo',{f:2,b:2,lw:3.25,bike:'prot',green:1.5,walk:2.5}),
  r4m:P_('Shahar koʻchalari','4 boʻlak + ajratuvchi polosa',{f:2,b:2,med:'green',mw:3,green:2,walk:3}),
  r4t:P_('Shahar koʻchalari','4+1: markaziy burilish boʻlagi',{f:2,b:2,lw:3.25,med:'turn',green:2,walk:3}),
  // Magistral
  r6:P_('Magistral koʻchalar','6 boʻlak (3+3)',{f:3,b:3,med:'hatch',mw:1,green:2.5,walk:3.5}),
  r6m:P_('Magistral koʻchalar','6 boʻlak + ajratuvchi',{f:3,b:3,med:'green',mw:4,green:2.5,walk:3.5}),
  r6tr:P_('Magistral koʻchalar','6 boʻlak + velo trek',{f:3,b:3,med:'green',mw:4,bike:'track',green:2,walk:3}),
  r6d:P_('Magistral koʻchalar','6 boʻlak + dublyorlar (Toshkent tipi)',{f:3,b:3,med:'green',mw:4,service:1,spark:1,sep:4,green:2,walk:3}),
  r8d:P_('Magistral koʻchalar','8 boʻlak + ajratuvchi + dublyorlar',{f:4,b:4,med:'green',mw:5,service:2,sep:5,green:2.5,walk:4}),
  r8:P_('Magistral koʻchalar','8 boʻlak + keng ajratuvchi',{f:4,b:4,med:'green',mw:8,green:3,walk:4}),
  // Jamoat transporti
  r4bus:P_('Jamoat transporti','4 boʻlak, chetda avtobus boʻlagi',{f:1,b:1,lw:3.25,bus:'curb',green:1.5,walk:3}),
  r6bus:P_('Jamoat transporti','6 boʻlak, chetda avtobus boʻlagi',{f:2,b:2,lw:3.25,bus:'curb',med:'green',mw:2,green:2,walk:3}),
  r4brt:P_('Jamoat transporti','4 boʻlak + markazda BRT',{f:2,b:2,lw:3.25,med:'brt',green:2,walk:3}),
  r6brt:P_('Jamoat transporti','6 boʻlak + markazda BRT',{f:3,b:3,lw:3.25,med:'brt',green:2,walk:3.5}),
  brtst:P_('Jamoat transporti','BRT bekati kesimi (markaziy platforma)',{f:2,b:2,lw:3.25,med:'brtst',mw:4,green:1.5,walk:3}),
  tram:P_('Jamoat transporti','2+2 + markazda tramvay',{f:2,b:2,lw:3.25,tram:'center',green:2,walk:3}),
  tramm:P_('Jamoat transporti','2+2 + ajratilgan tramvay polosasi',{f:2,b:2,lw:3.25,med:'tram',green:2,walk:3}),
  tram1:P_('Jamoat transporti','1+1 + markazda tramvay',{f:1,b:1,lw:3.25,tram:'center',green:1.5,walk:3}),
  transit:P_('Jamoat transporti','Faqat jamoat transporti koʻchasi',{f:0,b:0,bus:'curb',green:2,walk:5}),
  // Bir tomonlama
  one1:P_('Bir tomonlama','Bir tomonlama, 1 boʻlak',{oneway:1,f:1,green:1.5,walk:2.5}),
  one2:P_('Bir tomonlama','Bir tomonlama, 2 boʻlak',{oneway:1,f:2,green:1.5,walk:2.5}),
  one3:P_('Bir tomonlama','Bir tomonlama, 3 boʻlak',{oneway:1,f:3,lw:3.25,green:2,walk:3}),
  one2b:P_('Bir tomonlama','Bir tomonlama 2 + ikki yoʻnalishli velo trek',{oneway:1,f:2,lw:3.25,bike:'track2',green:1.5,walk:2.5}),
  one2c:P_('Bir tomonlama','Bir tomonlama 2 + qarshi avtobus boʻlagi',{oneway:1,contra:1,f:2,lw:3.25,green:1.5,walk:3}),
  // Piyoda va velo
  ped:P_('Piyoda va velo','Piyoda koʻchasi',null),
  pedT:P_('Piyoda va velo','Piyoda koʻchasi + daraxt qatorlari',null),
  boul:P_('Piyoda va velo','Bulvar (2+2, markaziy xiyobon)',{f:2,b:2,lw:3.25,med:'boul',mw:10,green:2,walk:3}),
  greenway:P_('Piyoda va velo','Yashil yoʻlak (piyoda + velo)',null),
  bikep:P_('Piyoda va velo','Alohida velo yoʻlak (2 yoʻnalish)',null),
  bike1:P_('Piyoda va velo','Alohida velo yoʻlak (1 yoʻnalish)',null),
  kon:P_('Konstruktor','Konstruktor (oʻz parametrlaringiz)',null),
  custom:P_('Konstruktor','«Koʻcha profili» → Loyiha profili',null),
};
const FIXED={shared:[['walk',2],['shared',6],['walk',2]],ped:[['walk',8]],pedT:[['green',2],['walk',8],['green',2]],
  greenway:[['green',1.5],['walk',3],['green',1],['bike',3,0],['green',1.5]],bikep:[['green',1],['bike',3,0],['green',1]],bike1:[['green',1],['bike',2,1],['green',1]]};
const LIB2DK={walk:'walk',facade:'walk',shared:'shared',furn:'walk',trees:'green',ariq:'green',lawn:'green',median:'median',buffer:'buffer',park:'park',lane:'lane',mixed:'lane',bus:'bus',tram:'tram',bike1:'bike',bike2:'bike',parklet:'furn',busstop:'walk',kiosk:'furn',rain:'rain',water:'rain',bikepark:'furn',bikeprot:'bike',park30:'park30',park45:'park45',park90:'park90',parkkerb:'walk',loading:'park',turn:'turn',hatch:'hatch',brt:'bus',island:'island',shoulder:'buffer',barrier:'buffer'};
const KON0={pang:0,rain:0,furn:0,oneway:0,f:2,b:2,lw:3.5,med:'none',mw:3,bus:'none',tram:'none',bike:'none',park:'none',service:0,green:2,walk:3};
function presetStrips(p){
  if(p==='custom'){const pr=S.prof.pr,tot=sum(pr);let cum=0;
    return pr.map(e=>{const mid=cum+e.w/2;cum+=e.w;const k=LIB2DK[e.k]||'walk';const dir=(DK[k].road||k==='bike')?(e.k==='bike2'?0:(mid<tot/2?-1:1)):0;return [k,e.w,dir];});}
  if(p==='kon')return gen(Object.assign({},KON0,DS().kon||{}));
  if(FIXED[p])return FIXED[p];
  const d=PRESETS[p];return d&&d.o?gen(d.o):FIXED.ped;
}
function segStrips(sg){return sg.st||presetStrips(sg.p);}
const layOf=sg=>stripsLayout(segStrips(sg),sg.off||0);
function stripsLayout(p,off=0){const st=Array.isArray(p)?p:presetStrips(p),W=st.reduce((a,x)=>a+x[1],0);let cum=0;
  const out=st.map(([k,w,dir])=>{const d1=W/2-cum+off,d2=W/2-cum-w+off;cum+=w;return {k,w,dir:dir||0,d1,d2,mid:(d1+d2)/2};});
  const road=out.filter(x=>DK[x.k].road);const half=road.length?Math.max(...road.map(x=>Math.max(Math.abs(x.d1),Math.abs(x.d2)))):0;
  const outer=Math.max(Math.abs(out[0].d1),Math.abs(out[out.length-1].d2));
  return {st:out,W,half,outer,road,lanes:road.filter(x=>x.k==='lane'||x.k==='bus').length,twoWay:road.some(x=>x.dir>0)&&road.some(x=>x.dir<0)};}

/* aylanma harakat turlari */
const RTYPES={
  r1:{n:'Bir boʻlakli halqa',ri:12,rw:6,lanes:1},
  r2:{n:'Ikki boʻlakli halqa',ri:14,rw:9.5,lanes:2},
  r3:{n:'Uch boʻlakli halqa',ri:18,rw:13.5,lanes:3},
  turbo:{n:'Turbo-halqa (spiral)',ri:12,rw:10,lanes:2,turbo:1},
  mini:{n:'Mini-halqa (bosib oʻtiladigan orol)',ri:2.5,rw:6.5,lanes:1,mount:1},
  big:{n:'Katta halqa (maydon)',ri:35,rw:11,lanes:3},
  sigr:{n:'Svetoforli katta halqa',ri:30,rw:11,lanes:3,sig:1},
};

if(!S.design) S.design={nodes:[],segs:[],nid:1,sid:1,preset:'r4',tool:'draw',sel:null,src:{},thr:{laneMin:2.75,laneMax:3.75,cw:4,parkGap:5}};
const DS=()=>S.design;
const D={pts:[],start:null,cur:null};
const designL=L.layerGroup();
map.createPane('design');map.getPane('design').style.zIndex=450;
const DR=L.canvas({pane:'design',padding:.3,tolerance:0});
const previewL=L.layerGroup().addTo(map);
const nodeById=id=>DS().nodes.find(n=>n.id===id), segById=id=>DS().segs.find(s=>s.id===id);
const degree=n=>DS().segs.filter(s=>s.a===n.id||s.b===n.id).length;
const segLL=sg=>[nodeById(sg.a).ll,...sg.pts,nodeById(sg.b).ll];
function nodeKind(n){const d=degree(n);if(n.type==='round')return 'round';if(d<=1)return 'end';if(n.type==='sig')return 'sig';if(n.type==='x')return 'x';return d===2?'join':'x';}
const isInter=k=>k==='x'||k==='sig'||k==='round';
function armsOf(n){return DS().segs.filter(s=>s.a===n.id||s.b===n.id).map(s=>({s,lay:layOf(s)}));}
function joinDev(n){const a=DS().segs.filter(s=>s.a===n.id||s.b===n.id);if(a.length!==2)return 0;const o=n.ll;
  const dirOut=sg=>{const ll=segLL(sg),q=sg.a===n.id?ll[1]:ll[ll.length-2],v=toXY(q,o),l=Math.hypot(...v)||1;return [v[0]/l,v[1]/l];};
  const u=dirOut(a[0]),v=dirOut(a[1]);return Math.PI-Math.acos(Math.max(-1,Math.min(1,u[0]*v[0]+u[1]*v[1])));}
function nodeR(n){const k=nodeKind(n);
  if(k==='round')return n.ri+n.rw;
  if(k==='x'||k==='sig'){const a=armsOf(n);return Math.max(3,...a.map(x=>x.lay.half))+(n.kr??6);}
  if(k==='join'){const dev=joinDev(n);if(dev<.2)return 0;const a=armsOf(n);return Math.min(40,Math.max(...a.map(x=>x.lay.outer))*Math.tan(Math.min(dev,2.6)/2)+.5);}
  return 0;}
function majorArms(n){const a=armsOf(n).sort((x,y)=>(y.lay.lanes-x.lay.lanes)||(y.lay.W-x.lay.W));return new Set(a.slice(0,2).map(x=>x.s.id));}
function origin(){const n=DS().nodes[0];return n?n.ll:[41.3111,69.2797];}
const circleLL=(c,r,o,n=48)=>Array.from({length:n},(_,i)=>{const t=i/n*2*Math.PI;return toLL([c[0]+r*Math.cos(t),c[1]+r*Math.sin(t)],o);});
function frameAt(xy,c,s){const T=c[c.length-1];s=Math.max(0,Math.min(T,s));const p=pointAt(xy,c,s),p1=pointAt(xy,c,Math.max(0,s-.5)),p2=pointAt(xy,c,Math.min(T,s+.5));const tx=p2[0]-p1[0],ty=p2[1]-p1[1],l=Math.hypot(tx,ty)||1;return{p,t:[tx/l,ty/l],n:[-ty/l,tx/l]};}
function arrowShape(p,t,len,o){const n=[-t[1],t[0]],w=.18,hw=.75,hl=1.6;const P=(a,b)=>toLL([p[0]+t[0]*a+n[0]*b,p[1]+t[1]*a+n[1]*b],o);
  return [P(-len/2,-w),P(len/2-hl,-w),P(len/2-hl,-hw),P(len/2,0),P(len/2-hl,hw),P(len/2-hl,w),P(-len/2,w)];}
/* koʻcha oʻqi: burilish nuqtalarida berilgan radiusli yoy (fillet) */
function segXY(sg,o){
  const P=segLL(sg).map(q=>toXY(q,o));if(P.length<3)return P;
  const Wh=layOf(sg).outer,out=[P[0]];
  for(let i=1;i<P.length-1;i++){
    const A1=P[i-1],B=P[i],C=P[i+1],v1=[A1[0]-B[0],A1[1]-B[1]],v2=[C[0]-B[0],C[1]-B[1]],l1=Math.hypot(...v1),l2=Math.hypot(...v2);
    if(l1<.05||l2<.05){out.push(B);continue;}
    const u1=[v1[0]/l1,v1[1]/l1],u2=[v2[0]/l2,v2[1]/l2],th=Math.acos(Math.max(-1,Math.min(1,u1[0]*u2[0]+u1[1]*u2[1])));
    if(th>Math.PI-.02){out.push(B);continue;}
    let r=Math.max(sg.rad&&sg.rad[i-1]!=null?sg.rad[i-1]:0,Wh+1),t=r/Math.tan(th/2);
    const tmax=Math.min(i===1?l1:l1/2,i===P.length-2?l2:l2/2)*.98;if(t>tmax){t=tmax;r=t*Math.tan(th/2);}
    const T1=[B[0]+u1[0]*t,B[1]+u1[1]*t],T2=[B[0]+u2[0]*t,B[1]+u2[1]*t],bis=[u1[0]+u2[0],u1[1]+u2[1]],bl=Math.hypot(...bis)||1,dc=r/Math.sin(th/2),Cc=[B[0]+bis[0]/bl*dc,B[1]+bis[1]/bl*dc];
    const a1=Math.atan2(T1[1]-Cc[1],T1[0]-Cc[0]);let da=Math.atan2(T2[1]-Cc[1],T2[0]-Cc[0])-a1;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
    const n=Math.max(4,Math.ceil(Math.abs(da)*r/1.5));for(let k=0;k<=n;k++){const a=a1+da*k/n;out.push([Cc[0]+r*Math.cos(a),Cc[1]+r*Math.sin(a)]);}
  }
  out.push(P[P.length-1]);return out;
}
const effRad=(sg,i)=>Math.max(sg.rad&&sg.rad[i]!=null?sg.rad[i]:0,layOf(sg).outer+1);
function lineInt(p,u,q,v){const den=u[0]*v[1]-u[1]*v[0];if(Math.abs(den)<1e-6)return null;const dx=q[0]-p[0],dy=q[1]-p[1];const t1=(dx*v[1]-dy*v[0])/den,t2=(dx*u[1]-dy*u[0])/den;return {p:[p[0]+t1*u[0],p[1]+t1*u[1]],t1,t2};}

/* shakllar roʻyxati: xaritaga ham, maydon hisobiga ham xizmat qiladi */
function buildShapes(){
  const ds=DS(),o=origin(),sh=[],marks={},cwW=ds.thr.cw,gap=ds.thr.parkGap,WH='#f2f2ee';
  const poly=(ll,col,cat,z,op)=>{if(ll&&ll.length>2)sh.push({t:'poly',ll,col,cat,z,op});};
  const line=(ll,opt,code,z=6)=>{sh.push({t:'line',ll,opt,z});if(code)marks[code]=(marks[code]||0)+1;};
  const mark=c=>marks[c]=(marks[c]||0)+1;
  const markOv=(mx,d,code)=>{if(code==='none')return;const LL=e=>offsetLine(mx,d+e).map(q=>toLL(q,o));const W1={color:'#fff',weight:1.3};
    if(code==='1.1'||code==='1.2')line(LL(0),{color:'#fff',weight:2},code);
    else if(code==='1.3'){line(LL(-.12),W1);line(LL(.12),W1);mark('1.3');}
    else if(code==='1.5')line(LL(0),{color:'#fff',weight:1.5,dashArray:'8 10'},'1.5');
    else if(code==='1.6')line(LL(0),{color:'#fff',weight:1.5,dashArray:'20 6'},'1.6');
    else if(code==='1.11'){line(LL(-.12),W1);line(LL(.12),Object.assign({dashArray:'8 10'},W1));mark('1.11');}};
  const arms={};
  ds.segs.forEach(sg=>{
    const A1=nodeById(sg.a),B1=nodeById(sg.b);if(!A1||!B1)return;
    const lay=layOf(sg);let xy=segXY(sg,o);const c0=cumLen(xy),T0=c0[c0.length-1];
    const trim=n=>{const R0=nodeR(n);return nodeKind(n)==='round'&&lay.half<R0-1?Math.sqrt(R0*R0-lay.half*lay.half):R0;};
    const ra=trim(A1),rb=trim(B1);if(T0-ra-rb<2)return;
    xy=subLine(xy,ra,T0-rb);const c=cumLen(xy),T=c[c.length-1];
    const ka=nodeKind(A1),kb=nodeKind(B1);
    (arms[A1.id]=arms[A1.id]||[]).push({sg,xy,atA:true,lay});(arms[B1.id]=arms[B1.id]||[]).push({sg,xy,atA:false,lay});
    const hasRoad=lay.road.some(x=>!isPk(x.k));
    const cwA=isInter(ka)&&sg.cwA!==false&&hasRoad,cwB=isInter(kb)&&sg.cwB!==false&&hasRoad;
    const off=k=>k==='round'?5:.5;
    const zoneA=cwA?off(ka)+cwW:(isInter(ka)?1:0), zoneB=cwB?off(kb)+cwW:(isInter(kb)?1:0);
    const band=(d1,d2,s1=0,s2=T)=>{s1=Math.max(0,s1);s2=Math.min(T,s2);if(s2-s1<.2)return null;const x=(s1>0||s2<T)?subLine(xy,s1,s2):xy;return [...offsetLine(x,d1),...offsetLine(x,d2).reverse()].map(q=>toLL(q,o));};
    // oʻrtadagi piyoda oʻtish joylari (segment boʻyi)
    const xws=(sg.xw||[]).map((x,i)=>({...x,i,s:x.f*T0-ra})).filter(x=>x.s>x.w/2&&x.s<T-x.w/2);
    // toʻxtab turish taqiqlangan oraliqlar
    const atts=(sg.att||[]).map((x,i)=>({...x,i,s:x.f*T0-ra})).filter(x=>x.s>0&&x.s<T);
    const cuts=[];atts.forEach(x=>{if(x.t==='bus'||x.t==='bay')cuts.push([x.s-x.len/2-5,x.s+x.len/2+5]);if(x.t==='parklet'||x.t==='bikepark')cuts.push([x.s-x.len/2,x.s+x.len/2]);});if(isInter(ka))cuts.push([0,zoneA+gap]);if(isInter(kb))cuts.push([T-zoneB-gap,T]);xws.forEach(x=>cuts.push([x.s-x.w/2-gap,x.s+x.w/2+gap]));
    const freeRanges=()=>{const cs=cuts.slice().sort((a,b)=>a[0]-b[0]);const r=[];let cur=0;cs.forEach(([a,b])=>{if(a>cur)r.push([cur,a]);cur=Math.max(cur,b);});if(cur<T)r.push([cur,T]);return r;};
    lay.st.forEach(st=>{const k=DK[st.k];
      if(isPk(st.k)){const rg=cuts.length?freeRanges():[[0,T]];if(cuts.length)poly(band(st.d1,st.d2),DK.walk.col,'ped',1);
        const inner=Math.abs(st.d1)<Math.abs(st.d2)?st.d1:st.d2,outer=inner===st.d1?st.d2:st.d1,ang=k.ang||0,sp=k.sp||6,dv=st.dir||1;
        rg.forEach(([a,b])=>{poly(band(st.d1,st.d2,a,b),k.col,'car',2);const L0=b-a;if(L0<sp)return;let n=0;
          const shift=ang&&ang<90?Math.abs(outer-inner)/Math.tan(ang*Math.PI/180):0;
          for(let s0=a+(dv>0?0:shift);s0<=b-(dv>0?shift:0)+.01;s0+=sp){const s1=s0+(dv>0?shift:-shift);if(s1<a-.01||s1>b+.01)continue;const f0=frameAt(xy,c,s0),f1=frameAt(xy,c,s1);
            line([toLL([f0.p[0]+f0.n[0]*inner,f0.p[1]+f0.n[1]*inner],o),toLL([f1.p[0]+f1.n[0]*outer,f1.p[1]+f1.n[1]*outer],o)],{color:'#fff',weight:1},null,2.5);n++;
            {const sm=(s0+s1)/2+sp/2*dv;if(sm<b-1&&sm>a+1&&((Math.abs(s0)*7.31)%1)<.62){const fm=frameAt(xy,c,sm),dm=(inner+outer)/2,rad=(ang||0)*Math.PI/180*(dv>0?1:-1)*(outer>inner?1:-1);
              const hx=fm.t[0]*Math.cos(rad)+fm.n[0]*Math.sin(rad),hy=fm.t[1]*Math.cos(rad)+fm.n[1]*Math.sin(rad);sh.push({t:'car',ll:toLL([fm.p[0]+fm.n[0]*dm,fm.p[1]+fm.n[1]*dm],o),h:Math.atan2(hy,hx),z:0});}}}
          marks['Parkovka joyi']=(marks['Parkovka joyi']||0)+Math.max(0,n-1);});}
      else poly(band(st.d1,st.d2),k.col,k.cat,1);
      if(st.k==='tram'){[-.72,.72].forEach(e=>line(offsetLine(xy,st.mid+e).map(q=>toLL(q,o)),{color:'#9ea1a8',weight:1.2}));}
      if(st.k==='hatch'&&st.w>=.8){for(let s=2;s<T-2;s+=4){const f=frameAt(xy,c,s),g=frameAt(xy,c,s+1.8);line([toLL([f.p[0]+f.n[0]*st.d1,f.p[1]+f.n[1]*st.d1],o),toLL([g.p[0]+g.n[0]*st.d2,g.p[1]+g.n[1]*st.d2],o)],{color:'#fff',weight:1});}mark('1.16');}
      if((st.k==='green'||st.k==='median')&&st.w>=1.4&&!sg.noTrees){const r=Math.min(3.2,Math.max(1.9,st.w*.95));for(let s=4;s<T-3;s+=8){const f=frameAt(xy,c,s),P2=[f.p[0]+f.n[0]*st.mid,f.p[1]+f.n[1]*st.mid];{const cr=circleLL(P2,r,o,24);poly(cr,'#6e9c50',null,7.2,.82);poly(circleLL([P2[0]-r*.2,P2[1]+r*.2],r*.6,o,18),'#96c173',null,7.25,.75);line([...cr,cr[0]],{color:'#48703a',weight:1},null,7.3);}sh.push({t:'tree',ll:toLL(P2,o),r,z:0});}}
      if(st.k==='rain'){[st.d1-.15,st.d2+.15].forEach(e=>line(offsetLine(xy,e).map(q=>toLL(q,o)),{color:'#6fb3d9',weight:1.2,dashArray:'4 3'},null,2));for(let s=2;s<T-2;s+=3.5){const f=frameAt(xy,c,s);poly(circleLL([f.p[0]+f.n[0]*st.mid,f.p[1]+f.n[1]*st.mid],Math.min(.7,st.w/3),o,10),'#3d6b4f',null,2);}}
      if(st.k==='island'){[st.d1-.1,st.d2+.1].forEach(e=>line(offsetLine(xy,e).map(q=>toLL(q,o)),{color:'#fff',weight:1.2},null,2));}
      if(st.k==='shared'){for(let s=3;s<T-3;s+=6){const f=frameAt(xy,c,s);poly(circleLL([f.p[0]+f.n[0]*st.mid,f.p[1]+f.n[1]*st.mid],.6,o,10),'#b8a47e',null,2);}}
    });
    // bordyur chiziqlari: koʻtarilgan zona va qatnov qismi chegarasi, koʻcha tashqi chetlari
    {const raised=k=>!DK[k].road;for(let i=0;i<lay.st.length-1;i++){const a1=lay.st[i],b1=lay.st[i+1];if(raised(a1.k)!==raised(b1.k))line(offsetLine(xy,a1.d2).map(q=>toLL(q,o)),{color:'#f7f5ef',weight:1.4},null,2.8);}
      [lay.st[0].d1,lay.st[lay.st.length-1].d2].forEach(d=>line(offsetLine(xy,d).map(q=>toLL(q,o)),{color:'#9a917f',weight:1.1},null,2.8));}
    // boʻlaklar orasidagi chiziqlar
    const ms=zoneA?zoneA+1:0,me=zoneB?T-zoneB-1:T;
    if(me-ms>2){const mx=subLine(xy,ms,me);
      for(let i=0;i<lay.st.length-1;i++){const L1=lay.st[i],R1=lay.st[i+1];{const ov=sg.mk&&sg.mk[i];if(ov){markOv(mx,L1.d2,ov);continue;}}
        if(!DK[L1.k].road||!DK[R1.k].road)continue;if(isPk(L1.k)||isPk(R1.k))continue;
        const d=L1.d2,ll=offsetLine(mx,d).map(q=>toLL(q,o));
        if(L1.k==='hatch'||R1.k==='hatch'){line(ll,{color:'#fff',weight:2},'1.1');continue;}
        if(L1.k==='turn'||R1.k==='turn'){markOv(mx,d+(L1.k==='turn'?.12:-.12),'1.11');continue;}
        if(L1.dir&&R1.dir&&L1.dir!==R1.dir){
          if(L1.k==='tram'&&R1.k==='tram')continue;
          if(lay.lanes>=4){[d-.12,d+.12].forEach(e=>line(offsetLine(mx,e).map(q=>toLL(q,o)),{color:'#fff',weight:1.3},null));mark('1.3');}
          else line(ll,{color:'#fff',weight:1.5,dashArray:'8 10'},'1.5');}
        else if(L1.k==='bus'||R1.k==='bus'||L1.k==='tram'||R1.k==='tram')line(ll,{color:'#fff',weight:2},'1.1');
        else line(ll,{color:'#fff',weight:1.5,dashArray:'8 10'},'1.5');}
      const cm=cumLen(mx),Tm=cm[cm.length-1];
      lay.st.filter(x=>x.k==='bus').forEach(x=>{for(let s=Tm/2;s<Tm;s+=80){const f=frameAt(mx,cm,s);sh.push({t:'label',ll:toLL([f.p[0]+f.n[0]*x.mid,f.p[1]+f.n[1]*x.mid],o),txt:'A',z:8});mark('1.23');}});
      lay.st.filter(x=>x.k==='bike').forEach(x=>{for(let s=Tm/2;s<Tm;s+=60){const f=frameAt(mx,cm,s);[-.55,.55].forEach(e=>{const cc=[f.p[0]+f.n[0]*x.mid+f.t[0]*e,f.p[1]+f.n[1]*x.mid+f.t[1]*e],ring=circleLL(cc,.38,o,14);line(ring.concat([ring[0]]),{color:'#fff',weight:1.2},null);});}});
      lay.st.filter(x=>x.k==='turn').forEach(x=>{for(let s=15;s<Tm-15;s+=30){const f=frameAt(mx,cm,s);[1,-1].forEach(dv=>poly(arrowShape([f.p[0]+f.n[0]*x.mid+f.t[0]*dv*3,f.p[1]+f.n[1]*x.mid+f.t[1]*dv*3],[f.t[0]*dv,f.t[1]*dv],4,o),'#f4f4f0',null,7));}});
    }
    // zebra: faqat harakat va velo boʻlaklari ustida
    const zebra=(S0,S1)=>{lay.st.forEach(x=>{if(!(DK[x.k].road&&!isPk(x.k))&&x.k!=='bike')return;for(let d=x.d2+.25;d<x.d1-.2;d+=1){const b=band(Math.min(d+.5,x.d1-.05),d,S0,S1);poly(b,WH,null,7);}});
      lay.st.forEach(x=>{if(['median','green','hatch','buffer','rain','island','furn'].includes(x.k))poly(band(x.d1,x.d2,S0,S1),'#cdbf9f','ped',3);});mark('1.14.1');};
    const stopLine=(sStop,dirSel,kind)=>{const inc=lay.road.filter(x=>!isPk(x.k)&&x.dir===dirSel);if(!inc.length)return;const f=frameAt(xy,c,sStop),lo=Math.min(...inc.map(x=>x.d2)),hi=Math.max(...inc.map(x=>x.d1));
      const P=d=>toLL([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d],o);
      if(kind==='1.12')line([P(lo),P(hi)],{color:'#fff',weight:4},'1.12');else line([P(lo),P(hi)],{color:'#fff',weight:3,dashArray:'4 4'},'1.13');};
    const end=(atB,node,kind)=>{
      const s0=off(kind),s1=s0+cwW,S0=atB?T-s1:s0,S1=atB?T-s0:s1,dirSel=atB?1:-1;
      if(atB?cwB:cwA)zebra(S0,S1);
      const sStop=(atB?cwB:cwA)?(atB?T-s1-1:s1+1):(atB?T-1.5:1.5);
      const code=kind==='sig'?'1.12':kind==='round'?'1.13':(majorArms(node).has(sg.id)?null:'1.13');
      if(code)stopLine(sStop,dirSel,code);
      if(kind==='round')return;
      const inc=lay.road.filter(x=>(x.k==='lane'||x.k==='bus')&&x.dir===dirSel);const sA=atB?sStop-7:sStop+7;if(sA<2||sA>T-2)return;
      const fa=frameAt(xy,c,sA),dirv=atB?fa.t:[-fa.t[0],-fa.t[1]];
      inc.forEach(x=>{poly(arrowShape([fa.p[0]+fa.n[0]*x.mid,fa.p[1]+fa.n[1]*x.mid],dirv,5,o),'#f4f4f0',null,7);mark('1.18');});
    };
    if(isInter(ka))end(false,A1,ka);if(isInter(kb))end(true,B1,kb);
    drawAtts(atts,lay,xy,c,T,band,poly,line,mark,sh,o);
    // segment boʻyidagi oʻtish joylari
    xws.forEach(x=>{const S0=x.s-x.w/2,S1=x.s+x.w/2;
      if(x.type==='raised'){lay.st.forEach(y=>{if(DK[y.k].road)poly(band(y.d1,y.d2,S0-2,S1+2),'#7a6f5f','car',2);});mark('5.20 / notekislik');}
      zebra(S0,S1);
      if(x.type==='signal'){stopLine(S0-2,1,'1.12');stopLine(S1+2,-1,'1.12');}
      if(x.type==='refuge'){const i=lay.st.findIndex((y,j)=>j<lay.st.length-1&&y.dir&&lay.st[j+1].dir&&y.dir!==lay.st[j+1].dir);
        if(i>=0){const d=lay.st[i].d2;poly(band(d+1,d-1,S0-4,S1+4),'#bdb39e','ped',8);}}
    });
  });
  // tugunlar: chorraha va burilish shakllari (bordyur radiusi bilan)
  ds.nodes.forEach(n=>{const k=nodeKind(n),c=toXY(n.ll,o),A2=arms[n.id]||[];
    if((k==='x'||k==='sig'||k==='join')&&A2.length>=2&&nodeR(n)>0){
      const L2=A2.map(a=>{const cc=cumLen(a.xy),T=cc[cc.length-1],f=frameAt(a.xy,cc,a.atA?0:T),u=a.atA?f.t:[-f.t[0],-f.t[1]];
        const P=d=>[f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d],rd=a.lay.road.length?a.lay.road:a.lay.st,ang=Math.atan2(f.p[1]-c[1],f.p[0]-c[0]);
        const ord=pts=>{const an=p=>{let d=Math.atan2(p[1]-c[1],p[0]-c[0])-ang;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};return an(pts[0])<an(pts[1])?pts:[pts[1],pts[0]];};
        return {ang,u,inn:ord([P(Math.max(...rd.map(x=>x.d1))),P(Math.min(...rd.map(x=>x.d2)))]),out:ord([P(a.lay.st[0].d1),P(a.lay.st[a.lay.st.length-1].d2)])};}).sort((x,y)=>x.ang-y.ang);
      const build=key=>{const pl=[];L2.forEach((a,i)=>{const b=L2[(i+1)%L2.length],p1=a[key][1],p2=b[key][0];pl.push(a[key][0],p1);
        const X=lineInt(p1,a.u,p2,b.u);if(X&&X.t1<.01&&X.t2<.01&&X.t1>-80&&X.t2>-80){for(let j=1;j<14;j++){const t=j/14;pl.push([(1-t)**2*p1[0]+2*(1-t)*t*X.p[0]+t*t*p2[0],(1-t)**2*p1[1]+2*(1-t)*t*X.p[1]+t*t*p2[1]]);}}});return pl.map(q=>toLL(q,o));};
      poly(build('out'),DK.walk.col,'ped',0);poly(build('inn'),DK.lane.col,'car',3);
      if(k==='sig')mark('svetofor');}
    if(k==='round'){const rt=RTYPES[n.rtype||'r2']||RTYPES.r2,Ro=n.ri+n.rw,side=Math.max(3,...A2.map(a=>a.lay.outer-a.lay.half)),lanes=n.lanes||rt.lanes,lw=n.rw/lanes;
      poly(circleLL(c,Ro+side,o,90),DK.walk.col,'ped',0);poly(circleLL(c,Ro,o,90),DK.lane.col,'car',3);
      if(rt.mount){poly(circleLL(c,n.ri,o,48),'#c9b690','car',5);const cl=circleLL(c,n.ri,o,48);line(cl.concat([cl[0]]),{color:'#fff',weight:2},null);}
      else{poly(circleLL(c,n.ri+1.5,o,72),'#c2ab83','car',4);poly(circleLL(c,n.ri,o,72),DK.green.col,'green',5);}
      if(rt.turbo){const rot=(n.rot||0)*Math.PI/180,R2=(x,y)=>[c[0]+x*Math.cos(rot)-y*Math.sin(rot),c[1]+x*Math.sin(rot)+y*Math.cos(rot)];
        const a=lw/2,r1=n.ri+1.5+lw,sp=[];
        for(let t=-90;t<=90;t+=4){const q=t*Math.PI/180;sp.push(R2(r1*Math.cos(q),a+r1*Math.sin(q)));}
        for(let t=90;t<=270;t+=4){const q=t*Math.PI/180;sp.push(R2((r1+lw)*Math.cos(q),-a+(r1+lw)*Math.sin(q)));}
        poly([...offsetLine(sp,.25),...offsetLine(sp,-.25).reverse()].map(q=>toLL(q,o)),'#d9d4c7',null,6);
        [.35,-.35].forEach(e=>line(offsetLine(sp,e).map(q=>toLL(q,o)),{color:'#fff',weight:1.3},null));mark('turbo: koʻtarilgan ajratgich');}
      else for(let i=1;i<lanes;i++){const cl=circleLL(c,n.ri+(rt.mount?0:1.5)+i*lw-(rt.mount?0:1.5*i/lanes),o,90);line(cl.concat([cl[0]]),{color:'#fff',weight:1.5,dashArray:'8 10'},'1.5 (halqa)');}
      for(let i=0;i<lanes;i++){const rA=n.ri+(rt.mount?0:1.5)+(i+.5)*(n.rw-(rt.mount?0:1.5))/lanes;
        [45,135,225,315].forEach(g=>{const t=(g+i*20)*Math.PI/180,p=[c[0]+rA*Math.cos(t),c[1]+rA*Math.sin(t)];poly(arrowShape(p,[-Math.sin(t),Math.cos(t)],3.5,o),'#f4f4f0',null,7);});mark('1.18 (halqa)');}
      // kirish-chiqishdagi ajratuvchi orolchalar
      A2.forEach(a=>{const st=a.lay.st,i=st.findIndex((y,j)=>j<st.length-1&&DK[y.k].road&&DK[st[j+1].k].road&&y.dir&&st[j+1].dir&&y.dir!==st[j+1].dir);if(i<0)return;
        const d=st[i].d2,cc=cumLen(a.xy),T=cc[cc.length-1],pts=[];
        for(let s=0;s<=16;s+=2){const f=frameAt(a.xy,cc,a.atA?s:T-s),w=1.8*(1-s/20)+.3;pts.push([[f.p[0]+f.n[0]*(d+w),f.p[1]+f.n[1]*(d+w)],[f.p[0]+f.n[0]*(d-w),f.p[1]+f.n[1]*(d-w)]]);}
        poly([...pts.map(p=>p[0]),...pts.map(p=>p[1]).reverse()].map(q=>toLL(q,o)),'#bdb39e','ped',8);});
      if(rt.sig)mark('svetofor');}
  });
  freeShapes(ds,o,poly,line,mark);
  return {sh,marks};
}
function renderDesign(){
  designL.clearLayers();const {sh}=buildShapes();
  const zk=Math.pow(2,map.getZoom()-19),sc=o=>{const r=Object.assign({},o);r.weight=Math.max(.5,(o.weight??3)*zk);if(o.dashArray)r.dashArray=String(o.dashArray).split(/[ ,]+/).map(v=>Math.max(1,+v*zk).toFixed(1)).join(' ');return r;};
  const oc=origin();
  sh.sort((a,b)=>a.z-b.z).forEach(x=>{
    if(x.t==='poly')L.polygon(x.ll,{pane:'design',renderer:DR,stroke:false,fillColor:x.col,fillOpacity:x.op??1,interactive:false}).addTo(designL);
    else if(x.t==='line')L.polyline(x.ll,Object.assign({pane:'design',renderer:DR,interactive:false,lineCap:'butt'},sc(x.opt))).addTo(designL);
    else if(x.t==='car'&&zk>=.45){const P=toXY(x.ll,oc),ca=Math.cos(x.h),sa=Math.sin(x.h),R=(u,v)=>toLL([P[0]+u*ca-v*sa,P[1]+u*sa+v*ca],oc);
      L.polygon([R(-2.2,-.85),R(1.9,-.85),R(2.2,-.6),R(2.2,.6),R(1.9,.85),R(-2.2,.85)],{pane:'design',renderer:DR,color:'#8a8d94',weight:Math.max(.5,zk),fillColor:'#f3f3f0',fillOpacity:1,interactive:false}).addTo(designL);
      L.polygon([R(-1.1,-.72),R(.9,-.72),R(.9,.72),R(-1.1,.72)],{pane:'design',renderer:DR,stroke:false,fillColor:'#cfd6de',fillOpacity:1,interactive:false}).addTo(designL);}
    else if(x.t==='label')L.marker(x.ll,{pane:'design',interactive:false,icon:L.divIcon({className:'',html:`<b style="color:#fff;font:700 ${x.sm?10:12}px var(--sans)">${x.txt}</b>`,iconSize:null,iconAnchor:[4,8]})}).addTo(designL);
  });
  const sel=DS().sel;
  DS().segs.forEach(sg=>{const A1=nodeById(sg.a),B1=nodeById(sg.b);if(!A1||!B1)return;
    const on=sel&&sel.t==='seg'&&sel.id===sg.id,o=origin();
    L.polyline(segXY(sg,o).map(q=>toLL(q,o)),{pane:'design',renderer:DR,interactive:false,color:on?'#f4c542':'#ffffff',weight:on?3:1,opacity:on?1:.35,dashArray:on?null:'2 6'}).addTo(designL);});
  DS().nodes.forEach(n=>{const on=sel&&sel.t==='node'&&sel.id===n.id;
    L.circleMarker(n.ll,{pane:'design',renderer:DR,interactive:false,radius:on?7:5,color:on?'#f4c542':'#1c2628',weight:2,fillColor:nodeKind(n)==='round'?'#6f8f4e':nodeKind(n)==='sig'?'#e03b2e':'#ffffff',fillOpacity:1}).addTo(designL);});
  drawPreview();
}
function drawPreview(){previewL.clearLayers();if(S.app!=='design')return;
  freePreview();
  if(D.start){const st=nodeById(D.start);if(!st)return;const pts=[st.ll,...D.pts,...(D.cur?[D.cur]:[])];L.polyline(pts,{pane:'designEdit',interactive:false,color:'#f4c542',weight:3,dashArray:'6 5'}).addTo(previewL);
    if(D.cur)lab(D.cur,fmtD(lineLen(pts))).addTo(previewL);}
}
let pvRAF=0;const previewSoon=()=>{if(pvRAF)return;pvRAF=requestAnimationFrame(()=>{pvRAF=0;drawPreview();});};

/* bosish, ulash (snap), boʻlish */
function hitTest(ll){
  const P=map.latLngToContainerPoint(ll);let best=null;
  DS().nodes.forEach(n=>{const d=map.latLngToContainerPoint(n.ll).distanceTo(P);if(d<14&&(!best||d<best.d))best={t:'node',id:n.id,d};});
  if(best)return best;
  return hitSeg(ll)||best;
}
/* koʻcha sirtiga tegish: oʻq atrofida koʻchaning butun eni boʻyicha (tor koʻchalarda kamida 10 px) */
function hitSeg(ll,skip){
  const P=map.latLngToContainerPoint(ll),ppm=1/(156543.03392*Math.cos(ll.lat*Math.PI/180)/Math.pow(2,map.getZoom()));let best=null;
  DS().segs.forEach(sg=>{if(skip&&skip.has(sg.id))return;const A1=nodeById(sg.a),B1=nodeById(sg.b);if(!A1||!B1)return;
    let half=10;try{const lay=layOf(sg);half=Math.max(10,lay.outer*ppm+3);}catch(e){}
    const ll2=segLL(sg),pp=ll2.map(q=>map.latLngToContainerPoint(q));
    for(let i=0;i<pp.length-1;i++){const a=pp[i],b=pp[i+1],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;let t=((P.x-a.x)*dx+(P.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));
      const q=L.point(a.x+t*dx,a.y+t*dy),d=q.distanceTo(P);if(d<half&&(!best||d/half<best.r))best={t:'seg',id:sg.id,i,ll:map.containerPointToLatLng(q),d,r:d/half};}});
  return best;
}
/* osilib qolgan uchni yonidagi koʻchaga ulash (T-chorraha) */
function snapEnd(n){if(!n)return false;const ds=DS(),inc=ds.segs.filter(sg=>sg.a===n.id||sg.b===n.id);if(inc.length!==1)return false;
  const h=hitSeg(L.latLng(n.ll[0],n.ll[1]),new Set(inc.map(x=>x.id)));if(!h)return false;
  const tgt=segById(h.id);const endA=nodeById(tgt.a),endB=nodeById(tgt.b);
  // uchi nishon koʻchaning oxiriga juda yaqin boʻlsa — oʻsha tugunga ulanadi
  const P=map.latLngToContainerPoint(h.ll);let m=null;[endA,endB].forEach(e=>{if(map.latLngToContainerPoint(L.latLng(e.ll[0],e.ll[1])).distanceTo(P)<16)m=e;});
  if(!m)m=splitSeg(h);
  inc.forEach(sg=>{if(sg.a===n.id)sg.a=m.id;if(sg.b===n.id)sg.b=m.id;});ds.nodes=ds.nodes.filter(x=>x!==n);return m;}
const newNode=ll=>{const n={id:DS().nid++,ll:[+ll[0].toFixed(7),+ll[1].toFixed(7)],type:'auto',ri:14,rw:9.5,rtype:'r2',kr:6};DS().nodes.push(n);return n;};
/* koʻchani nuqtada ikkiga boʻlish — barcha xususiyatlar saqlanadi */
function splitSegAt(sg,i,ll,node){
  const o=origin(),l2=segLL(sg),Tfull=cumLen(segXY(sg,o)).pop();
  const pre=[...l2.slice(0,i+1),ll].map(q=>toXY(q,o)),sSplit=cumLen(pre).pop();
  const s2={id:DS().sid++,a:node.id,b:sg.b,pts:l2.slice(i+1,-1),p:sg.p,cwB:sg.cwB};
  ['st','off','mk','name'].forEach(k=>{if(sg[k]!=null)s2[k]=clone(sg[k]);});
  if(sg.rad){s2.rad=sg.rad.slice(i);sg.rad=sg.rad.slice(0,i);}
  if(sg.xw){const T1=sSplit,T2=Tfull-sSplit,all=sg.xw.map(x=>({...x,s:x.f*Tfull}));
    sg.xw=all.filter(x=>x.s<T1).map(x=>({...x,f:x.s/T1}));s2.xw=all.filter(x=>x.s>=T1).map(x=>({...x,f:(x.s-T1)/T2}));sg.xw.forEach(x=>delete x.s);s2.xw.forEach(x=>delete x.s);}
  sg.pts=l2.slice(1,i+1);sg.b=node.id;delete sg.cwB;DS().segs.push(s2);return s2;
}
function splitSeg(h){const sg=segById(h.id),n=newNode([h.ll.lat,h.ll.lng]);splitSegAt(sg,h.i,[h.ll.lat,h.ll.lng],n);return n;}
function resolve(ll,h){if(h&&h.t==='node')return nodeById(h.id);if(h&&h.t==='seg')return splitSeg(h);return newNode([ll.lat,ll.lng]);}
function designClick(ll){
  const ds=DS(),h=hitTest(ll);
  if(ds.tool==='select'){selectAt(ll,h);return;}
  if(ds.tool==='sign'){placeSign(ll);return;}
  if(ds.tool==='xwalk'){placeCrossing(ll,h);return;}
  if(ds.tool==='shape'||ds.tool==='line'){freeClick(ll);return;}
  if(ds.tool==='obj'){placeAtt(ll);return;}
  if(ds.tool==='round'){if(h&&h.t==='node'){const n=nodeById(h.id);if(n.type==='round')n.type='auto';else{const rt=RTYPES[ds.rtype||'r2'];n.type='round';n.rtype=ds.rtype||'r2';n.ri=rt.ri;n.rw=rt.rw;n.lanes=rt.lanes;}ds.sel={t:'node',id:n.id};afterDesign();}else toast('Halqa qoʻyish uchun tugun (nuqta)ni bosing.');return;}
  if(!D.start){const n=resolve(ll,h);D.start=n.id;D.pts=[];afterDesign();return;}
  if(h&&(h.t==='node'&&h.id!==D.start||h.t==='seg')){const n=resolve(ll,h);finishSeg(n);return;}
  D.pts.push([ll.lat,ll.lng]);afterDesign();
}
function finishSeg(endNode){
  if(!D.start)return;
  if(!endNode){if(!D.pts.length){D.start=null;afterDesign();return;}const last=D.pts.pop();const hh=hitTest(L.latLng(last[0],last[1]));endNode=hh&&(hh.t==='seg'||(hh.t==='node'&&hh.id!==D.start))?resolve(L.latLng(last[0],last[1]),hh):newNode(last);}
  if(endNode.id===D.start){D.start=null;D.pts=[];afterDesign();return;}
  const ds=DS(),sg={id:ds.sid++,a:D.start,b:endNode.id,pts:D.pts.slice(),p:ds.preset,rad:D.pts.map(()=>ds.drawR||0)};
  if(ds.preset==='kon'||ds.preset==='custom')sg.st=clone(presetStrips(ds.preset));
  if(ds.drawOne)setTraffic(sg,'fwd');
  ds.segs.push(sg);autoCross(sg);
  D.start=null;D.pts=[];D.cur=null;ds.sel={t:'seg',id:sg.id,strip:null};afterDesign();
}
/* kesishgan koʻchalarni avtomatik ulash: kesishish nuqtasida chorraha tuguni */
function autoCross(sNew){
  const o=origin();
  let queue=[sNew],guard=0;
  while(queue.length&&guard++<40){
    const cur=queue.shift();let hit=null;
    for(const sg of DS().segs){if(sg===cur)continue;
      const P=segLL(cur).map(q=>toXY(q,o)),Q=segLL(sg).map(q=>toXY(q,o));
      for(let i=0;i<P.length-1&&!hit;i++)for(let j=0;j<Q.length-1&&!hit;j++){
        const a=P[i],b=P[i+1],c=Q[j],d=Q[j+1],r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)continue;
        const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;if(t<=0||t>=1||u<=0||u>=1)continue;
        const X=[a[0]+t*r[0],a[1]+t*r[1]],ends=[P[0],P[P.length-1],Q[0],Q[Q.length-1]];
        if(ends.some(e=>Math.hypot(e[0]-X[0],e[1]-X[1])<2))continue;
        hit={sg,i,j,ll:toLL(X,o)};}
      if(hit)break;}
    if(!hit)continue;
    const n=newNode(hit.ll);const a2=splitSegAt(cur,hit.i,hit.ll,n),b2=splitSegAt(hit.sg,hit.j,hit.ll,n);
    queue.push(cur,a2,hit.sg,b2);
  }
}
/* segment boʻyidagi piyoda oʻtish joyi */
function placeCrossing(ll,h){
  const ds=DS(),o=origin(),q=toXY([ll.lat,ll.lng],o);let best=null;
  ds.segs.forEach(sg=>{const xy=segXY(sg,o),pr=project(xy,q),T=cumLen(xy).pop();if(pr.d<layOf(sg).outer+2&&(!best||pr.d<best.d))best={sg,s:pr.s,T,d:pr.d};});
  if(!best){toast('Oʻtish joyini koʻcha ustiga bosing.');return;}
  const sg=best.sg;sg.xw=sg.xw||[];sg.xw.push({f:best.s/best.T,w:ds.thr.cw,type:ds.xwType||'zebra'});
  ds.sel={t:'xw',id:sg.id,i:sg.xw.length-1};afterDesign();
}
function delSel(){const ds=DS(),s=ds.sel;if(!s)return;
  if(s.t==='seg')ds.segs=ds.segs.filter(x=>x.id!==s.id);
  if(s.t==='sign'){ds.signs=(ds.signs||[]).filter(x=>x.id!==s.id);ds.sel=null;afterDesign();return;}
  if(s.t==='shape'||s.t==='line'){const key=s.t==='shape'?'shapes':'lines';ds[key]=(ds[key]||[]).filter(x=>x.id!==s.id);ds.sel=null;afterDesign();return;}
  if(s.t==='att'){const sg=segById(s.id);if(sg&&sg.att)sg.att.splice(s.i,1);ds.sel=null;afterDesign();return;}
  if(s.t==='xw'){const sg=segById(s.id);if(sg&&sg.xw)sg.xw.splice(s.i,1);ds.sel=null;afterDesign();return;}
  if(s.t==='node'){ds.segs=ds.segs.filter(x=>x.a!==s.id&&x.b!==s.id);ds.nodes=ds.nodes.filter(x=>x.id!==s.id);}
  ds.nodes=ds.nodes.filter(n=>degree(n)>0);ds.sel=null;afterDesign();}
function afterDesign(){renderDesign();renderDesignPanel();renderHint();pushHist();save();}
map.on('mousemove',e=>{if(S.app==='design'&&D.start&&!M.tool){D.cur=[e.latlng.lat,e.latlng.lng];previewSoon();}});
map.on('dblclick',e=>{if(S.app==='design'&&D.start&&!M.tool){D.pts.pop();finishSeg(null);}});
document.addEventListener('keydown',e=>{
  if(S.app!=='design'||M.tool||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(F.pts.length&&(e.key==='Enter'||e.key==='Escape'||e.key==='Backspace')){e.preventDefault();if(e.key==='Enter')finishFree();else if(e.key==='Escape'){F.pts=[];renderDesign();}else{F.pts.pop();renderDesign();}renderHint();return;}
  if(e.key==='Enter'){e.preventDefault();finishSeg(null);}
  else if(e.key==='Escape'){D.start=null;D.pts=[];D.cur=null;DS().sel=null;afterDesign();}
  else if(e.key==='Backspace'&&D.start){e.preventDefault();D.pts.pop();afterDesign();}
  else if(e.key==='Delete'){delSel();}
});
function designHint(h){
  const t=DS().tool;
  if(t==='draw')h.innerHTML=D.start?`<b>Koʻchani chizish</b> (radius ${DS().drawR||0} m). Burilish nuqtalarini bosing, qoʻyilganlarini sudrab tuzating. Boshqa koʻcha yoki tugunni bossangiz — ulanadi va chorraha hosil boʻladi.<div class="row"><button class="btn sm primary" id="dFin">Tugatish (Enter)</button><button class="btn sm" id="dEsc">Bekor (Esc)</button></div>`
    :`<b>Koʻchani chizish</b> (${PRESETS[DS().preset].n}). Boshlanish nuqtasini bosing. Mavjud koʻcha yoki tugun ustiga bossangiz, avtomatik ulanadi.`;
  if(t==='select')h.innerHTML=DS().sel?'':'<b>Tanlash.</b> Obyektni bosing, soʻng uni ushlab sudrang · Delete — oʻchirish · oʻng tugma — menyu';
  if(t==='sign')h.innerHTML='<b>Yoʻl belgilari.</b> Oʻng paneldan belgini tanlang va xaritaga bosing. Belgini sudrab koʻchiring, bosib — tahrirlang.';
  if(t==='round')h.innerHTML=`<b>Aylanma halqa</b> (${RTYPES[DS().rtype||'r2'].n}). Chorraha tugunini bosing — halqaga aylanadi (yana bosish — qaytaradi).`;
  if(t==='shape'||t==='line'){freeHint(h,t);return;}
  if(t==='obj'){h.innerHTML=`<b>${ATT[DS().attType||'bus'].n}.</b> Koʻchaning kerakli tomoniga bosing. Qoʻyilganini sudrab koʻchiring, oʻng tugma — menyu.`;return;}
  if(t==='xwalk')h.innerHTML='<b>Piyoda oʻtish joyi.</b> Koʻchaning istalgan joyiga bosing — oʻtish joyi qoʻyiladi. Turini oʻng panelda tanlang; qoʻyilganini sudrab koʻchiring.';
  const q=id=>h.querySelector(id);if(q('#dFin'))q('#dFin').onclick=()=>finishSeg(null);if(q('#dEsc'))q('#dEsc').onclick=()=>{D.start=null;D.pts=[];D.cur=null;afterDesign();};
}

/* YHQ tekshiruvlari */
const YHQ=[
  {id:'rh',t:'Oʻng tomonlama harakat: har yoʻnalish boʻlaklari oʻz yoʻnalishi boʻyicha oʻng tomonda'},
  {id:'sep',t:'Qarama-qarshi oqimlar ajratilgan: 4+ boʻlakda qoʻsh uzluksiz (1.3), 2–3 boʻlakda uzuq (1.5) chiziq yoki ajratuvchi polosa'},
  {id:'round',t:'Aylanma harakatda harakat soat miliga teskari yoʻnalishda'},
  {id:'cross',t:'Chorraha va halqaning har bir yoʻlida piyodalar oʻtish joyi (1.14.1)'},
  {id:'stop',t:'Chorrahada toʻxtash chizigʻi (1.12), halqaga kirishda yoʻl berish chizigʻi (1.13)'},
  {id:'park',t:'Piyodalar oʻtish joyi va chorraha oldida toʻxtab turish yoʻq (trotuar kengaytmasi)'},
  {id:'bus',t:'Yoʻnalishli transport boʻlagi chekkadagi oʻng boʻlakda yoki markazda ajratilgan'},
  {id:'bike',t:'Velosiped boʻlagida harakat yonidagi avtomobil oqimi bilan bir yoʻnalishda'},
  {id:'lanew',t:'Harakat boʻlagi kengligi belgilangan chegarada'},
];
function checkYHQ(){
  const ds=DS(),r={};const segs=ds.segs.map(s=>({s,lay:layOf(s)}));
  const bad={rh:[],bus:[],bike:[],lanew:[],cross:[]};
  segs.forEach(({s,lay})=>{
    const f=lay.road.filter(x=>x.dir>0),b=lay.road.filter(x=>x.dir<0);
    if(f.length&&b.length&&Math.max(...f.map(x=>x.mid))>Math.min(...b.map(x=>x.mid)))bad.rh.push(s.id);
    lay.st.forEach((x,i)=>{
      if(x.k==='bus'){const side=lay.st.filter(y=>DK[y.k].road&&!isPk(y.k)&&Math.sign(y.mid)===Math.sign(x.mid));const outer=side.every(y=>Math.abs(y.mid)<=Math.abs(x.mid));const inner=side.every(y=>Math.abs(y.mid)>=Math.abs(x.mid));if(!outer&&!inner)bad.bus.push(s.id);}
      if(x.k==='bike'&&x.dir){if((x.dir>0&&x.mid>0)||(x.dir<0&&x.mid<0))bad.bike.push(s.id);}
      if(x.k==='lane'&&(x.w<ds.thr.laneMin||x.w>ds.thr.laneMax))bad.lanew.push(s.id);
    });
    [['a','cwA'],['b','cwB']].forEach(([e,f])=>{const k=nodeKind(nodeById(s[e]));if(isInter(k)&&s[f]===false&&lay.road.length)bad.cross.push(s.id);});
  });
  const u=a=>[...new Set(a)];
  r.rh=bad.rh.length?['bad',`${u(bad.rh).length} ta koʻchada teskari`]:['ok','avtomatik'];
  r.sep=['ok','chiziqlar avtomatik'];
  r.round=['ok',ds.nodes.some(n=>n.type==='round')?'avtomatik':'halqa yoʻq'];
  r.cross=bad.cross.length?['bad',`${u(bad.cross).length} ta yoʻlda yoʻq`]:['ok','avtomatik'];
  r.stop=['ok','avtomatik'];r.park=['ok',`${ds.thr.parkGap} m kengaytma`];
  r.bus=bad.bus.length?['bad',`${u(bad.bus).length} ta koʻcha`]:['ok',segs.some(x=>x.lay.st.some(y=>y.k==='bus'))?'mos':'avtobus boʻlagi yoʻq'];
  r.bike=bad.bike.length?['bad',`${u(bad.bike).length} ta koʻcha`]:['ok','mos'];
  r.lanew=bad.lanew.length?['bad',`${u(bad.lanew).length} ta koʻcha`]:['ok',`${f2(ds.thr.laneMin)}–${f2(ds.thr.laneMax)} m`];
  return r;
}

/* maydonlar: loyiha va mavjud holat */
function rasterDesign(grid){
  const {z,gx0,gy0,cw,ch}=grid,{sh}=buildShapes(),o=origin();
  const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const x=cv.getContext('2d',{willReadFrequently:true});
  const cats=Object.keys(DCAT),pal=cats.map((k,i)=>[40+i*40,200-i*30,(i*97)%255]);
  sh.filter(s=>s.t==='poly').sort((a,b)=>a.z-b.z).forEach(s=>{
    const ci=s.cat?cats.indexOf(s.cat):-1;
    x.fillStyle=ci<0?'rgba(0,0,0,0)':`rgb(${pal[ci].join(',')})`;if(ci<0)return;
    x.beginPath();s.ll.forEach((q,i)=>{const X=gxf(q[1],z)-gx0,Y=gyf(q[0],z)-gy0;i?x.lineTo(X,Y):x.moveTo(X,Y);});x.closePath();x.fill();});
  const d=x.getImageData(0,0,cw,ch).data,out=new Int8Array(cw*ch).fill(-1);
  for(let i=0;i<cw*ch;i++){if(d[i*4+3]<128)continue;let b=0,bd=1e9;for(let k=0;k<cats.length;k++){const q=pal[k],dd=(d[i*4]-q[0])**2+(d[i*4+1]-q[1])**2+(d[i*4+2]-q[2])**2;if(dd<bd){bd=dd;b=k;}}out[i]=b;}
  return {out,cats};
}
function designBBox(){const pts=[];DS().nodes.forEach(n=>pts.push(n.ll));DS().segs.forEach(s=>s.pts.forEach(p=>pts.push(p)));if(!pts.length)return null;
  const pad=40/110574,padL=40/(111320*Math.cos(pts[0][0]*R));
  return {s:Math.min(...pts.map(p=>p[0]))-pad,n:Math.max(...pts.map(p=>p[0]))+pad,w:Math.min(...pts.map(p=>p[1]))-padL,e:Math.max(...pts.map(p=>p[1]))+padL};}
function designStats(){
  const bb=designBBox();if(!bb)return null;const lat0=(bb.s+bb.n)/2;
  let z=20;const side=()=>Math.max((bb.e-bb.w)*111320*Math.cos(lat0*R),(bb.n-bb.s)*110574)/(156543.03392*Math.cos(lat0*R)/2**z);
  while(side()>2200&&z>12)z--;
  const gx0=Math.floor(gxf(bb.w,z)),gy0=Math.floor(gyf(bb.n,z)),cw=Math.ceil(gxf(bb.e,z))-gx0,ch=Math.ceil(gyf(bb.s,z))-gy0;
  const {out,cats}=rasterDesign({z,gx0,gy0,cw,ch}),px2=(156543.03392*Math.cos(lat0*R)/2**z)**2,cnt={};let tot=0;
  cats.forEach(c=>cnt[c]=0);for(let i=0;i<out.length;i++)if(out[i]>=0){cnt[cats[out[i]]]++;tot++;}
  return {cnt,tot,m2:tot*px2};
}
const EX2G={asph:'car',light:'ped',build:'build',road:'car',park:'car',rail:'pt',bike:'bike',ped:'ped',side:'ped',veg:'green',water:'green',soil:'other',paved:'other',shadow:'unk'};
async function compareExisting(){
  const bb=designBBox();if(!bb){toast('Avval koʻcha chizing.');return;}
  A.poly=[[bb.n,bb.w],[bb.n,bb.e],[bb.s,bb.e],[bb.s,bb.w]];
  const btn=document.getElementById('dCmp');if(btn){btn.disabled=true;btn.textContent='Sunʼiy yoʻldosh tahlil qilinmoqda…';}
  await analyze();
  if(!A.res||A.err){toast(A.err||'Tahlil boʻlmadi');renderDesignPanel();return;}
  const C=A.cache,{out,cats}=rasterDesign(C),ex={},de={};let n=0;
  for(let i=0;i<out.length;i++){if(out[i]<0)continue;const c=A.res.cls[i];if(c===255)continue;n++;const g=EX2G[AC[c].k]||'other';ex[g]=(ex[g]||0)+1;de[cats[out[i]]]=(de[cats[out[i]]]||0)+1;}
  DS().cmp={n,ex,de,m2:n*A.res.px2};renderDesignPanel();save();
}

function stripSVG(p,h=16){const lay=stripsLayout(p);let x=0;return `<svg viewBox="0 0 ${lay.W} 4" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;border-radius:3px">${lay.st.map(s=>{const r=`<rect x="${x}" y="0" width="${s.w}" height="4" fill="${DK[s.k].col}"/>`;x+=s.w;return r;}).join('')}</svg>`;}
function renderDesignPanel(){
  const el=document.getElementById('designPanel');if(!el)return;const ds=DS();
  if(typeof renderRail==='function'){renderRail();updateStatus();}
  const sel=ds.sel,selOk=sel&&((sel.t==='seg'&&segById(sel.id))||(sel.t==='node'&&nodeById(sel.id))||(sel.t==='sign'&&signById(sel.id))||((sel.t==='xw'||sel.t==='att')&&segById(sel.id))||((sel.t==='shape'||sel.t==='line')&&freeObj(sel)));
  const selKey=selOk?JSON.stringify([sel.t,sel.id,sel.i]):'';
  if(selKey&&selKey!==renderDesignPanel._last)ds.itab='prop';renderDesignPanel._last=selKey;
  const tab=ds.itab||'prop',ck=checkYHQ(),nbad=Object.values(ck).filter(x=>x[0]==='bad').length;
  let h=`<div class="itabs" role="tablist">${[['prop','Xususiyatlar'],['check','Tekshiruv'],['stats','Hisob'],['file','Fayl']].map(([k,n])=>`<button role="tab" data-it="${k}" aria-selected="${tab===k}">${n}${k==='check'&&nbad?`<span class="cnt">${nbad}</span>`:''}</button>`).join('')}</div>`;
  if(tab==='prop'){
    if(selOk){
      h+=`<div class="ihead"><div class="badge"><svg class="ic"><use href="#${SELICON[sel.t]||'i-select'}"/></svg></div><div style="flex:1"><h2>${SELNAME[sel.t]||'Obyekt'}</h2><p>Tanlangan · <button class="btn sm" id="selClr" style="margin-left:4px">Bekor qilish (Esc)</button></p></div></div>`;
      h+=selBarHTML();
      if(sel.t==='att')h+=attHTML(sel);
      if(sel.t==='seg'){const sg=segById(sel.id);h+=segEditorHTML(sg,sel.strip)+vertexHTML(sg,sel.v);}
      if(sel.t==='xw')h+=xwHTML(sel);
      if(sel.t==='sign')h+=signEditorHTML(signById(sel.id));
      if(sel.t==='node')h+=nodeHTML(nodeById(sel.id));
      if(sel.t==='shape'||sel.t==='line')h+=freeToolHTML();
      if(ds.tool==='sign')h+=signCatalogHTML();
    }else{
      const t=TOOLS.find(x=>x[0]===ds.tool)||TOOLS[0];
      h+=`<div class="ihead"><div class="badge"><svg class="ic"><use href="#${t[2]}"/></svg></div><div><h2>${t[1]}</h2><p>${t[4]}</p></div></div>`;
      if(!ds.segs.length)h+=`<div class="empty"><b style="color:var(--ink)">Boshlash</b><ol><li>Chapdagi <b>Koʻcha chizish</b> (S) asbobini tanlang.</li><li>Pastdagi roʻyxatdan koʻcha modulini tanlang.</li><li>Xaritada nuqtalarni bosing; Enter — tugatish.</li><li>Koʻchani bosib, elementlarni shu panelda tahrirlang.</li></ol><div style="margin-top:8px"><button class="btn sm" id="openHelp">Toʻliq qoʻllanma</button></div></div>`;
      else if(ds.tool==='select')h+=`<div class="empty">Hech narsa tanlanmagan. Xaritada koʻcha, tugun, belgi yoki shaklni bosing. Oʻng tugma — shu joy uchun menyu.</div>`;
      h+=toolOptionsHTML()+freeToolHTML()+objToolHTML();
      if(ds.tool==='sign')h+=signCatalogHTML();
    }
  }
  if(tab==='check'){
    h+=`<div class="ihead"><div class="badge"><svg class="ic"><use href="#i-sign"/></svg></div><div><h2>YHQ tekshiruvlari</h2><p>Qoida mazmuni YHQ ilovalari asosida umumlashtirilgan. Band raqamini oʻzingiz kiritib tasdiqlang.</p></div></div>
    <div class="checks">${YHQ.map(q=>`<div class="ck" style="grid-template-columns:1fr auto"><span>${q.t}<br><input data-src="${q.id}" value="${(ds.src[q.id]||'').replace(/"/g,'&quot;')}" placeholder="YHQ bandi…" style="width:100%;margin-top:4px;padding:4px 7px;border:1px solid var(--line2);border-radius:6px;background:var(--panel);font-size:11.5px"></span><span class="chip ${ck[q.id][0]}">${ck[q.id][1]}</span></div>`).join('')}</div>
    <div class="sec-h">Chegaralar (namuna, normativ emas)</div>
    <div class="thr" style="margin-top:0"><div class="field"><label for="dLmin">Min. boʻlak eni, m</label><input id="dLmin" type="number" step="0.05" value="${ds.thr.laneMin}"></div><div class="field"><label for="dLmax">Maks. boʻlak eni, m</label><input id="dLmax" type="number" step="0.05" value="${ds.thr.laneMax}"></div>
    <div class="field"><label for="dCw">Oʻtish joyi eni, m</label><input id="dCw" type="number" step="0.5" value="${ds.thr.cw}"></div><div class="field"><label for="dPg">Toʻxtashsiz masofa, m</label><input id="dPg" type="number" step="0.5" value="${ds.thr.parkGap}"></div></div>
    <div class="sec-h">Yoʻl belgilari</div><div class="tools"><button class="btn primary" id="dAuto">Belgilarni avtomatik qoʻyish</button><span class="small">chorraha, halqa, oʻtish joyi, bekat, bir tomonlama</span></div>`;
  }
  if(tab==='stats'){
    const st=designStats(),{marks}=buildShapes();
    h+=`<div class="ihead"><div class="badge"><svg class="ic"><use href="#i-area"/></svg></div><div><h2>Hisob</h2><p>Loyiha maydonlari, chiziqlar va mavjud holat bilan taqqoslash.</p></div></div>`;
    if(st&&st.tot){h+=`<div><div class="sbar" style="height:18px">${Object.entries(DCAT).map(([k,[n,c]])=>st.cnt[k]?`<div style="width:${st.cnt[k]/st.tot*100}%;background:${c}" title="${n}"></div>`:'').join('')}</div>
      <table style="margin-top:8px"><tbody>${Object.entries(DCAT).map(([k,[n,c]])=>`<tr><td><i class="sw" style="display:inline-block;background:${c};vertical-align:-2px;margin-right:6px"></i>${n}</td><td class="d">${fi(st.cnt[k]/st.tot*st.m2)} m²</td><td class="d">${f1(st.cnt[k]/st.tot*100)}%</td></tr>`).join('')}<tr><td><b>Jami</b></td><td class="d"><b>${fi(st.m2)} m²</b></td><td></td></tr></tbody></table></div>
      <div class="sec-h">Chiziqlar va obyektlar</div><div class="tags">${Object.entries(marks).map(([k,v])=>`<span class="tag">${k} × ${v}</span>`).join('')||'<span class="small">—</span>'}</div>
      <div class="sec-h">Mavjud holat bilan</div><div><button class="btn primary" id="dCmp">Sunʼiy yoʻldosh bilan solishtirish</button></div>`;
      if(ds.cmp){const G=[['car','Avto yoʻl'],['pt','Jamoat transporti'],['bike','Velo'],['ped','Piyoda'],['green','Yashil'],['build','Binolar'],['other','Boshqa qattiq sirt/tuproq'],['unk','Aniqlanmagan']],c=ds.cmp;
        h+=`<div class="tscroll"><table><thead><tr><th>Loyiha izi ichida</th><th>Mavjud</th><th>Loyiha</th><th>Farq</th></tr></thead><tbody>${G.map(([k,n])=>{const a=(c.ex[k]||0)/c.n*100,b=(c.de[k]||0)/c.n*100,df=b-a;return `<tr><td>${n}</td><td class="d">${f1(a)}%</td><td class="d">${f1(b)}%</td><td class="d ${Math.abs(df)<.05?'eq':df>0?'up':'dn'}">${Math.abs(df)<.05?'—':(df>0?'+':'')+f1(df)}</td></tr>`;}).join('')}</tbody></table></div><p class="small">Maydon: ${fi(c.m2)} m². Mavjud holat — sunʼiy yoʻldosh + OSM tasnifi.</p>`;}
    }else h+=`<div class="empty">Hali koʻcha chizilmagan.</div>`;
  }
  if(tab==='file'){ds.fileOpen=true;h+=fileHTML()+`<div class="sec-h">Loyihani tozalash</div><div class="tools"><button class="btn" id="dClr" style="color:var(--bad)">Hammasini oʻchirish</button><span class="small">Ctrl+Z bilan qaytarish mumkin</span></div><button class="btn" id="dGeo" hidden></button>`;}
  el.innerHTML=h;const q=s=>el.querySelector(s);
  el.querySelectorAll('[data-it]').forEach(b=>b.onclick=()=>{ds.itab=b.dataset.it;renderDesignPanel();save();});
  el.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>{ds.preset=b.dataset.pre;if(ds.tool!=='draw')ds.tool='draw';afterDesign();});
  el.querySelectorAll('[data-src]').forEach(i=>i.onchange=()=>{ds.src[i.dataset.src]=i.value.trim();save();});
  const num=(id,fn)=>{const i=q(id);if(i)i.onchange=()=>{const v=parseFloat(i.value);if(v>0){fn(v);afterDesign();}};};
  num('#dLmin',v=>ds.thr.laneMin=v);num('#dLmax',v=>ds.thr.laneMax=v);num('#dCw',v=>ds.thr.cw=v);num('#dPg',v=>ds.thr.parkGap=v);
  if(tab==='prop'&&selOk){if(sel.t==='seg')bindSegEditor(el,segById(sel.id));if(sel.t==='sign')bindSignEditor(el,signById(sel.id));}
  if(tab==='prop'&&ds.tool==='sign')bindSignCatalog(el);
  bindDesignExtras(el,q,num);
  if(q('#selClr'))q('#selClr').onclick=()=>{ds.sel=null;afterDesign();};
  if(q('#openHelp'))q('#openHelp').onclick=openHelp;
  if(q('#dDel'))q('#dDel').onclick=delSel;
  if(q('#dCmp'))q('#dCmp').onclick=compareExisting;
  if(q('#dClr'))q('#dClr').onclick=()=>{ds.nodes=[];ds.segs=[];ds.signs=[];ds.shapes=[];ds.lines=[];ds.sel=null;ds.cmp=null;afterDesign();toast('Loyiha tozalandi. Ctrl+Z — qaytarish.');};
  if(q('#dGeo'))q('#dGeo').onclick=()=>{const {sh}=buildShapes();const fc={type:'FeatureCollection',features:[
      ...ds.segs.map(sg=>({type:'Feature',properties:{turi:'koʻcha',modul:sg.st?'Tahrirlangan':PRESETS[sg.p].n,kesim:segStrips(sg).map(([k,w,d])=>({element:DK[k].n,eni_m:w,yonalish:d}))},geometry:{type:'LineString',coordinates:[nodeById(sg.a).ll,...sg.pts,nodeById(sg.b).ll].map(p=>[p[1],p[0]])}})),
      ...ds.nodes.map(n=>({type:'Feature',properties:{turi:nodeKind(n),r_orol:n.type==='round'?n.ri:null,halqa_eni:n.type==='round'?n.rw:null},geometry:{type:'Point',coordinates:[n.ll[1],n.ll[0]]}})),
      ...sh.filter(s=>s.t==='poly'&&s.cat).map(s=>({type:'Feature',properties:{turi:'maydon',toifa:DCAT[s.cat][0]},geometry:{type:'Polygon',coordinates:[[...s.ll,s.ll[0]].map(p=>[p[1],p[0]])]}}))]};
    dl(`${typeof fslug==='function'?fslug():'loyiha'}.geojson`,JSON.stringify(fc),'application/geo+json');};
}
{const _rh2=renderHint;renderHint=function(){if(!M.tool&&S.app==='design'){designHint(document.getElementById('hint'));return;}_rh2();};}

/* =====================================================================
   TAHRIRLASH: elementni bosib tanlash, chiziqlarni sudrash, shakl nuqtalari
   ===================================================================== */
const editL=L.layerGroup(), signL=L.layerGroup();
map.createPane('designEdit');map.getPane('designEdit').style.zIndex=640;
map.createPane('signs');map.getPane('signs').style.zIndex=630;
const ensureSt=sg=>{if(!sg.st)sg.st=clone(presetStrips(sg.p));};
function hitStrip(ll){
  const o=origin(),q=toXY([ll.lat,ll.lng],o);let best=null;
  DS().segs.forEach(sg=>{const xy=segXY(sg,o),c=cumLen(xy),T=c[c.length-1],pr=project(xy,q);if(pr.s<.3||pr.s>T-.3)return;
    const f=frameAt(xy,c,pr.s),d=(q[0]-f.p[0])*f.n[0]+(q[1]-f.p[1])*f.n[1],lay=layOf(sg);
    const i=lay.st.findIndex(x=>d<=x.d1&&d>=x.d2);if(i<0)return;const score=Math.abs(d-(lay.st[0].d1+lay.st[lay.st.length-1].d2)/2);
    const xi=(sg.xw||[]).findIndex(x=>Math.abs(x.f*T-pr.s)<=x.w/2+.5);const ai=(sg.att||[]).findIndex(a=>Math.abs(a.f*T-pr.s)<=a.len/2+1&&(a.t==='tramstop'?Math.abs(d-(a.d||0))<2:((d>=0?1:-1)===(a.side||-1)&&(!DK[lay.st[i].k].road||isPk(lay.st[i].k)))));
    if(!best||score<best.score)best={id:sg.id,strip:i,score,xw:xi,at:ai};});
  return best;
}
function selectAt(ll,h){
  const ds=DS();
  if(h&&h.t==='node'){ds.sel={t:'node',id:h.id};afterDesign();return;}
  const hf=hitFree(ll);if(hf){ds.sel=hf;afterDesign();return;}
  const hs=hitStrip(ll);
  if(hs&&hs.at>=0){ds.sel={t:'att',id:hs.id,i:hs.at};afterDesign();return;}
  if(hs&&hs.xw>=0){ds.sel={t:'xw',id:hs.id,i:hs.xw};afterDesign();return;}
  if(hs){ds.sel={t:'seg',id:hs.id,strip:hs.strip};afterDesign();return;}
  ds.sel=h&&h.t==='seg'?{t:'seg',id:h.id}:null;afterDesign();
}
let dragRAF=0;const coreRender=()=>{if(dragRAF)return;dragRAF=requestAnimationFrame(()=>{dragRAF=0;renderDesignCore();});};
const handleIcon=(shape,col='#fff',txt='')=>L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],html:`<div style="width:14px;height:14px;background:${col};border:2px solid #1c2628;border-radius:${shape==='c'?'50%':'2px'};box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:${shape==='c'?'move':'ew-resize'};font:700 8px/10px sans-serif;text-align:center;color:#1c2628">${txt}</div>`});
function renderEditHandles(){
  editL.clearLayers();const ds=DS(),sel=ds.sel;if(S.app!=='design')return;
  // chizish jarayonida: qoʻyilgan nuqtalarni sudrab tuzatish
  if(D.start){const st=nodeById(D.start);
    [st.ll,...D.pts].forEach((p,i)=>{const m=L.marker(p,{pane:'designEdit',draggable:true,icon:handleIcon('c',i?'#fff':'#f4c542'),title:'Sudrab tuzating'}).addTo(editL);
      m.on('drag',e=>{const q=e.target.getLatLng(),v=[q.lat,q.lng];if(i===0)st.ll=v;else D.pts[i-1]=v;coreRender();});m.on('dragend',()=>afterDesign());});
    return;}
  if(!sel)return;
  const o=origin();
  if(sel.t==='node'){const n=nodeById(sel.id);if(!n)return;const m=L.marker(n.ll,{pane:'designEdit',draggable:true,icon:handleIcon('c','#f4c542'),title:'Tugunni sudrang'}).addTo(editL);
    m.on('drag',e=>{const p=e.target.getLatLng();n.ll=[p.lat,p.lng];coreRender();});m.on('dragend',()=>{const m2=snapEnd(n);if(m2){DS().sel={t:'node',id:m2.id};toast('Koʻchaga ulandi — chorraha hosil boʻldi.');}afterDesign();});return;}
  if(sel.t==='xw'){const sg=segById(sel.id);if(!sg||!sg.xw||!sg.xw[sel.i])return;const x=sg.xw[sel.i],xy=segXY(sg,o),c=cumLen(xy),T=c[c.length-1];
    const m=L.marker(toLL(pointAt(xy,c,x.f*T),o),{pane:'designEdit',draggable:true,icon:handleIcon('c','#f4c542'),title:'Oʻtish joyini koʻcha boʻylab sudrang'}).addTo(editL);
    m.on('drag',e=>{const g=e.target.getLatLng(),pr=project(xy,toXY([g.lat,g.lng],o));x.f=Math.max(.02,Math.min(.98,pr.s/T));e.target.setLatLng(toLL(pointAt(xy,c,x.f*T),o));coreRender();});
    m.on('dragend',()=>afterDesign());return;}
  if(sel.t==='shape'||sel.t==='line'){freeHandles(sel);return;}
  if(sel.t!=='seg')return;const sg=segById(sel.id);if(!sg)return;
  {const xy0=segXY(sg,o),c0=cumLen(xy0),T0=c0[c0.length-1],f0=frameAt(xy0,c0,T0/2);L.polygon(arrowShape(f0.p,f0.t,Math.min(12,T0/3),o),{pane:'designEdit',interactive:false,color:'#1c2628',weight:1,fillColor:'#f4c542',fillOpacity:1}).addTo(editL);}
  const ll=segLL(sg),xy=segXY(sg,o),c=cumLen(xy),T=c[c.length-1],lay=layOf(sg);
  if(sel.strip!=null&&lay.st[sel.strip]){const st=lay.st[sel.strip];L.polygon([...offsetLine(xy,st.d1),...offsetLine(xy,st.d2).reverse()].map(q=>toLL(q,o)),{pane:'designEdit',interactive:false,color:'#f4c542',weight:3,fill:false}).addTo(editL);}
  // shakl nuqtalari (bosish — radiusni tanlash, sudrash — koʻchirish, oʻng tugma — oʻchirish)
  ll.forEach((p,i)=>{const isNode=i===0||i===ll.length-1,vi=i-1,on=sel.v===vi&&!isNode;
    const m=L.marker(p,{pane:'designEdit',draggable:true,icon:handleIcon('c',isNode?'#f4c542':on?'#f4c542':'#fff',isNode?'':'R'),title:isNode?'Tugun':`Burilish nuqtasi · radius ${f1(effRad(sg,vi))} m (bosing — oʻzgartirish)`}).addTo(editL);
    m.on('drag',e=>{const q=e.target.getLatLng(),v=[q.lat,q.lng];if(i===0)nodeById(sg.a).ll=v;else if(i===ll.length-1)nodeById(sg.b).ll=v;else sg.pts[vi]=v;coreRender();});
    m.on('dragend',()=>{if(isNode&&snapEnd(nodeById(i===0?sg.a:sg.b)))toast('Koʻchaga ulandi — chorraha hosil boʻldi.');afterDesign();});
    if(!isNode){m.on('click',()=>{ds.sel.v=vi;afterDesign();});m.on('contextmenu',e=>openVertexMenu(e,sg,vi));}});
  for(let i=0;i<ll.length-1;i++){const mp=mid(ll[i],ll[i+1]);const m=L.marker(mp,{pane:'designEdit',icon:L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],html:'<div style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.6);border:1px dashed #1c2628;font:700 11px/12px sans-serif;text-align:center;color:#1c2628;cursor:copy">+</div>'}),title:'Burilish nuqtasi qoʻshish'}).addTo(editL);
    m.on('click',()=>{sg.pts.splice(i,0,mp);sg.rad=sg.rad||[];while(sg.rad.length<sg.pts.length-1)sg.rad.push(0);sg.rad.splice(i,0,ds.drawR||0);ds.sel.v=i;afterDesign();});}
  const f=frameAt(xy,c,T/2),P=d=>toLL([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d],o);
  const bounds=[lay.st[0].d1,...lay.st.map(x=>x.d2)];
  bounds.forEach((d0,b)=>{let dOld=d0;const m=L.marker(P(d0),{pane:'designEdit',draggable:true,icon:handleIcon('s'),title:'Chegarani sudrang'}).addTo(editL);
    const tipB=b=>{const st=segStrips(sg);return (b>0?`${DK[st[b-1][0]].n}: ${f2(st[b-1][1])} m`:'')+(b>0&&b<st.length?' | ':'')+(b<st.length?`${DK[st[b][0]].n}: ${f2(st[b][1])} m`:'');};
    m.bindTooltip(tipB(b),{direction:'top',offset:[0,-8]});
    m.on('drag',e=>{const g=e.target.getLatLng(),q=toXY([g.lat,g.lng],o),dNew=(q[0]-f.p[0])*f.n[0]+(q[1]-f.p[1])*f.n[1];ensureSt(sg);const st=sg.st,n=st.length;
      const r2=v=>Math.round(v*20)/20;
      if(b===0){const w=r2(st[0][1]+dNew-dOld);if(w<.3)return;const real=w-st[0][1];st[0][1]=w;sg.off=(sg.off||0)+real/2;dOld+=real;}
      else if(b===n){const w=r2(st[n-1][1]+dOld-dNew);if(w<.3)return;const real=w-st[n-1][1];st[n-1][1]=w;sg.off=(sg.off||0)-real/2;dOld-=real;}
      else{const dl=r2(dOld-dNew);if(!dl||st[b-1][1]+dl<.3||st[b][1]-dl<.3)return;st[b-1][1]=r2(st[b-1][1]+dl);st[b][1]=r2(st[b][1]-dl);dOld-=dl;}
      e.target.setLatLng(P(dOld));e.target.setTooltipContent(tipB(b));coreRender();});
    m.on('dragend',()=>afterDesign());});
}
let renderDesignCore=null;
{const _rd=renderDesign;renderDesignCore=()=>{_rd();renderSigns();};renderDesign=function(){_rd();renderEditHandles();renderSigns();};}

/* koʻcha kesimi tahrirlovchisi (panel) */
const MK_OPTS=[['','avto'],['none','chiziqsiz'],['1.1','1.1 uzluksiz'],['1.2','1.2 chekka'],['1.3','1.3 qoʻsh uzluksiz'],['1.5','1.5 uzuq'],['1.6','1.6 yaqinlashish'],['1.11','1.11 aralash']];
function segEditorHTML(sg,si){
  const lay=layOf(sg),len=lineLen(segLL(sg)),st=segStrips(sg),tm=trafficMode(sg);
  let h=`<div class="kv"><span>${sg.name?sg.name:'Koʻcha'}</span><b class="num">${fmtD(len)}</b><span>kenglik</span><b class="num">${f2(lay.W)} m</b><span>boʻlaklar</span><b class="num">${lay.lanes}</b></div>
  <div class="sec-h">Koʻndalang kesim — elementni bosing</div>
  <div class="xbar">${lay.st.map((x,i)=>`<button data-spick="${i}" title="${DK[x.k].n} · ${f2(x.w)} m" style="flex:${x.w} 1 0;background:${DK[x.k].col};${i===si?'box-shadow:inset 0 0 0 3px var(--hl)':''}" class="${DK[x.k].road||x.k==='bike'?'dk':''}">${x.w>=1.6?f1(x.w):''}${DK[x.k].road&&x.dir?`<i>${x.dir>0?'↓':'↑'}</i>`:''}</button>`).join('')}</div>
  <div class="small">Chapdan oʻngga — sariq strelka yoʻnalishiga qarab. ↓ strelka boʻylab, ↑ qarshi.</div>
  <div class="sec-h">Harakat</div>
  <div class="segc">${[['two','⇄ Ikki tomonlama'],['fwd','→ Bir tomonlama'],['back','← Teskari']].map(([k,n])=>`<button data-tm="${k}" aria-pressed="${tm===k}">${n}</button>`).join('')}</div>`;
  if(si!=null&&st[si]){const [k,w,dir]=st[si],mv=DK[k].road||k==='bike';
    h+=`<div class="panelbox"><div class="pb-h"><b>Element ${si+1} / ${st.length}</b><span class="sw" style="background:${DK[k].col}"></span></div>
    <div class="fgrid"><label for="eK">Turi</label><select id="eK">${Object.entries(DK).map(([kk,d])=>`<option value="${kk}" ${kk===k?'selected':''}>${d.n}</option>`).join('')}</select>
    <label for="eW">Eni, m</label><input id="eW" type="number" step="0.05" min="0.3" value="${w}" class="num">
    ${mv?`<label for="eD">Yoʻnalish</label><select id="eD"><option value="1" ${dir>0?'selected':''}>↓ strelka boʻylab</option><option value="-1" ${dir<0?'selected':''}>↑ qarshi</option>${k==='bike'||k==='bus'?`<option value="0" ${!dir?'selected':''}>⇅ ikki tomonlama</option>`:''}</select>`:''}
    ${si<st.length-1?`<label for="eMk">Oʻngdagi chiziq</label><select id="eMk">${MK_OPTS.map(([v,n])=>`<option value="${v}" ${(sg.mk&&sg.mk[si]||'')===v?'selected':''}>${n}</option>`).join('')}</select>`:''}</div>
    <div class="tools"><button class="btn sm" data-ea="left" title="Chapga surish">◀ Chapga</button><button class="btn sm" data-ea="right" title="Oʻngga surish">Oʻngga ▶</button><button class="btn sm" data-ea="dup">Nusxa</button><button class="btn sm" data-ea="del" style="color:var(--bad)">Oʻchirish</button></div></div>`;}
  h+=`<div class="sec-h">Element qoʻshish</div><div class="addrow"><select id="eAddK">${Object.entries(DK).map(([kk,d])=>`<option value="${kk}">${d.n}</option>`).join('')}</select><button class="btn sm primary" id="eAdd">+ Qoʻshish</button></div>
  <div class="sec-h">Koʻcha</div>
  <div class="fgrid"><label for="dSegP">Modul</label><select id="dSegP"><option value="">Modul bilan almashtirish…</option>${Object.entries(PRESETS).map(([k,p])=>`<option value="${k}">${p.n}</option>`).join('')}</select>
  <span class="lbl">Oʻtish joylari</span><span class="tools"><label class="small"><input type="checkbox" id="dCwA" ${sg.cwA!==false?'checked':''}> boshida</label><label class="small"><input type="checkbox" id="dCwB" ${sg.cwB!==false?'checked':''}> oxirida</label></span></div>
  <div class="tools"><button class="btn sm" id="dRev">Oʻqni teskari qilish</button><button class="btn sm" id="dDel" style="color:var(--bad)">Koʻchani oʻchirish</button></div>
  <p class="small" style="margin:0">Xaritada: oq kvadrat — chegarani sudrang; doira — shakl nuqtasi; «+» — nuqta qoʻshish; oʻng tugma — menyu.</p>`;
  return h;
}
function bindSegEditor(el,sg){
  const q=s=>el.querySelector(s),ds=DS(),si=ds.sel.strip;
  el.querySelectorAll('[data-spick]').forEach(b=>b.onclick=()=>{ds.sel.strip=+b.dataset.spick;afterDesign();});
  const edit=fn=>{ensureSt(sg);fn(sg.st);afterDesign();};
  if(q('#eK'))q('#eK').onchange=e=>edit(st=>{const k=e.target.value;st[si][0]=k;if(!(DK[k].road||k==='bike'))st[si][2]=0;else if(!st[si][2])st[si][2]=layOf(sg).st[si].mid>0?-1:1;});
  if(q('#eW'))q('#eW').onchange=e=>{const v=parseFloat(e.target.value);if(v>=.3)edit(st=>st[si][1]=+v.toFixed(2));};
  if(q('#eD'))q('#eD').onchange=e=>edit(st=>st[si][2]=+e.target.value);
  if(q('#eMk'))q('#eMk').onchange=e=>{sg.mk=sg.mk||{};if(e.target.value)sg.mk[si]=e.target.value;else delete sg.mk[si];afterDesign();};
  el.querySelectorAll('[data-ea]').forEach(b=>b.onclick=()=>edit(st=>{const a=b.dataset.ea;
    if(a==='left'&&si>0){[st[si-1],st[si]]=[st[si],st[si-1]];ds.sel.strip=si-1;}
    if(a==='right'&&si<st.length-1){[st[si+1],st[si]]=[st[si],st[si+1]];ds.sel.strip=si+1;}
    if(a==='dup'){st.splice(si+1,0,st[si].slice());ds.sel.strip=si+1;}
    if(a==='del'&&st.length>1){st.splice(si,1);ds.sel.strip=null;}}));
  q('#eAdd').onclick=()=>edit(st=>{const k=q('#eAddK').value,i=si!=null?si+1:st.length,lay=layOf(sg);const w={lane:3.25,bus:3.5,tram:3.2,park:2.3,bike:1.8,walk:2.5,green:1.5,median:2,buffer:.6}[k]||1.5;
    const dir=(DK[k].road||k==='bike')?((si!=null?lay.st[si].mid:0)>0?-1:1):0;st.splice(i,0,[k,w,dir]);ds.sel.strip=i;});
  el.querySelectorAll('[data-tm]').forEach(b=>b.onclick=()=>{setTraffic(sg,b.dataset.tm);afterDesign();});
  q('#dSegP').onchange=e=>{if(!e.target.value)return;sg.p=e.target.value;delete sg.st;delete sg.off;delete sg.mk;ds.sel.strip=null;afterDesign();};
  q('#dRev').onclick=()=>{ensureSt(sg);[sg.a,sg.b]=[sg.b,sg.a];sg.pts.reverse();sg.st.reverse();sg.off=-(sg.off||0);[sg.cwA,sg.cwB]=[sg.cwB,sg.cwA];
    if(sg.mk){const n=sg.st.length,m={};Object.entries(sg.mk).forEach(([i,v])=>m[n-2-i]=v);sg.mk=m;}if(ds.sel.strip!=null)ds.sel.strip=sg.st.length-1-ds.sel.strip;afterDesign();};
  q('#dCwA').onchange=e=>{sg.cwA=e.target.checked;afterDesign();};q('#dCwB').onchange=e=>{sg.cwB=e.target.checked;afterDesign();};
}

/* =====================================================================
   YOʻL BELGILARI
   Raqamlash Vena konvensiyasi asosidagi tizim boʻyicha; YHQ ilovasi bilan
   solishtirib tekshirilishi kerak (katalogda kod va nomni tahrirlash mumkin).
   ===================================================================== */
const SIGNS=[
  ['1.8','Svetofor bilan tartibga solish','warn','signal'],['1.11.1','Xavfli burilish','warn','curve'],['1.17','Sunʼiy notekislik','warn','bump'],
  ['1.20.1','Yoʻlning torayishi','warn','narrow'],['1.22','Piyodalar oʻtish joyi','warn','ped'],['1.23','Bolalar','warn','kids'],
  ['1.24','Velosiped yoʻlkasi bilan kesishish','warn','bike'],['1.25','Yoʻl taʼmirlash ishlari','warn','work'],['2.3.1','Ikkinchi darajali yoʻl bilan kesishish','warn','cross'],['1.33','Boshqa xavflar','warn','excl'],
  ['2.1','Asosiy yoʻl','main',''],['2.2','Asosiy yoʻl oxiri','mainEnd',''],['2.4','Yoʻl bering','yield',''],['2.5','Toʻxtamasdan harakatlanish taqiqlanadi','stop',''],
  ['3.1','Kirish taqiqlangan','noentry',''],['3.2','Harakatlanish taqiqlangan','proh',''],['3.4','Yuk avtomobillari harakati taqiqlangan','proh','truck'],
  ['3.9','Velosipedda harakatlanish taqiqlangan','proh','bike'],['3.10','Piyodalar harakati taqiqlangan','proh','ped'],
  ['3.18.1','Oʻngga burilish taqiqlangan','proh','arrowR',1],['3.18.2','Chapga burilish taqiqlangan','proh','arrowL',1],['3.19','Qayrilish taqiqlangan','proh','uturn',1],
  ['3.20','Quvib oʻtish taqiqlangan','proh','car2'],['3.24','Maksimal tezlik cheklovi','proh','speed'],['3.27','Toʻxtash taqiqlangan','nostop',''],['3.28','Toʻxtab turish taqiqlangan','nopark',''],
  ['4.1.1','Toʻgʻriga harakatlanish','mand','arrowU'],['4.1.2','Oʻngga harakatlanish','mand','arrowR'],['4.1.3','Chapga harakatlanish','mand','arrowL'],
  ['4.1.4','Toʻgʻriga yoki oʻngga','mand','arrowUR'],['4.1.5','Toʻgʻriga yoki chapga','mand','arrowUL'],['4.2.1','Toʻsiqni oʻngdan aylanib oʻtish','mand','keepR'],
  ['4.3','Aylanma harakat','mand','round'],['4.4.1','Velosiped yoʻlkasi','mand','bike'],['4.5.1','Piyodalar yoʻlkasi','mand','ped'],
  ['5.5','Bir tomonlama harakatli yoʻl','info','oneway'],['5.14','Yoʻnalishli transport vositalari uchun boʻlak','info','bus'],['5.15.1','Boʻlaklar boʻyicha harakat yoʻnalishlari','info','lanes'],
  ['5.16','Avtobus toʻxtash joyi','info','bus'],['5.17','Tramvay toʻxtash joyi','info','tram'],['5.19.1','Piyodalar oʻtish joyi','infoTri','ped'],
  ['5.20','Sunʼiy notekislik','infoTri','bump'],['5.21','Turar joy zonasi','info','house'],['6.4','Avtoturargoh','info','P'],
  ['TL','Svetofor','light',''],
];
const signDef=c=>{const d=SIGNS.find(x=>x[0]===c);if(d)return d;const u=(DS().customSigns||[]).find(x=>x.c===c);return u?[u.c,u.n,'img',u.img]:[c,'Belgi '+c,'info','txt'];};
function glyph(g,col,val){
  const S2=`stroke="${col}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"`,F=`fill="${col}"`;
  const arrow=(path,heads)=>`<path d="${path}" ${S2}/>`+heads.map(([x,y,a])=>`<path d="M${x} ${y} l${-9*Math.cos(a-0.5)} ${-9*Math.sin(a-0.5)} M${x} ${y} l${-9*Math.cos(a+0.5)} ${-9*Math.sin(a+0.5)}" ${S2}/>`).join('');
  const U=-Math.PI/2;
  switch(g){
    case 'ped':return `<circle cx="52" cy="32" r="6" ${F}/><path d="M50 40 L46 60 L38 76 M46 60 L56 76 M49 46 L60 54 M49 46 L38 54" ${S2}/>`;
    case 'kids':return `<circle cx="40" cy="38" r="5" ${F}/><circle cx="60" cy="44" r="4.5" ${F}/><path d="M40 44 L38 60 L32 74 M38 60 L44 74 M60 50 L59 62 L54 74 M59 62 L64 74" ${S2}/>`;
    case 'bike':return `<circle cx="34" cy="62" r="11" ${S2}/><circle cx="68" cy="62" r="11" ${S2}/><path d="M34 62 L46 44 L62 44 L68 62 M46 44 L54 62 L62 44 M44 38 L52 38" ${S2}/>`;
    case 'bump':return `<path d="M22 70 Q50 40 78 70" ${S2}/><path d="M18 72 L82 72" ${S2}/>`;
    case 'signal':return `<rect x="42" y="30" width="16" height="42" rx="4" fill="#1c2628"/><circle cx="50" cy="38" r="4.5" fill="#e03b2e"/><circle cx="50" cy="51" r="4.5" fill="#f2b632"/><circle cx="50" cy="64" r="4.5" fill="#2f9a50"/>`;
    case 'curve':return arrow('M40 76 L40 52 Q40 40 56 40 L64 40',[[66,40,0]]);
    case 'narrow':return `<path d="M36 76 L36 58 L44 42 L44 30 M64 76 L64 58 L56 42 L56 30" ${S2}/>`;
    case 'work':return `<circle cx="44" cy="34" r="5" ${F}/><path d="M44 40 L48 56 L40 72 M48 56 L58 70 M46 46 L60 40 M60 36 L66 64" ${S2}/><path d="M62 72 L80 72 L72 62 Z" ${F}/>`;
    case 'cross':return `<path d="M50 30 L50 76" stroke="${col}" stroke-width="10"/><path d="M36 58 L64 58" stroke="${col}" stroke-width="5"/>`;
    case 'excl':return `<path d="M50 34 L50 60" stroke="${col}" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="72" r="5" ${F}/>`;
    case 'truck':return `<rect x="24" y="40" width="34" height="22" ${F}/><path d="M60 46 L70 46 L78 54 L78 62 L60 62 Z" ${F}/><circle cx="34" cy="66" r="5" ${F}/><circle cx="70" cy="66" r="5" ${F}/>`;
    case 'car2':return `<rect x="24" y="34" width="20" height="32" rx="5" fill="#d01c2a"/><rect x="56" y="34" width="20" height="32" rx="5" fill="#1c2628"/>`;
    case 'speed':return `<text x="50" y="${String(val||40).length>2?62:64}" font-family="Arial, sans-serif" font-weight="700" font-size="${String(val||40).length>2?32:40}" text-anchor="middle" fill="#1c2628">${val||40}</text>`;
    case 'arrowU':return arrow('M50 76 L50 26',[[50,26,U]]);
    case 'arrowR':return arrow('M34 76 L34 50 Q34 40 44 40 L70 40',[[70,40,0]]);
    case 'arrowL':return arrow('M66 76 L66 50 Q66 40 56 40 L30 40',[[30,40,Math.PI]]);
    case 'arrowUR':return arrow('M44 78 L44 26 M44 58 Q44 48 54 48 L72 48',[[44,26,U],[72,48,0]]);
    case 'arrowUL':return arrow('M56 78 L56 26 M56 58 Q56 48 46 48 L28 48',[[56,26,U],[28,48,Math.PI]]);
    case 'keepR':return arrow('M34 30 L66 70',[[66,70,Math.atan2(40,32)]]);
    case 'round':return [0,1,2].map(i=>{const a0=i*2.094+.3,a1=a0+1.5,R0=22,x0=50+R0*Math.cos(a0),y0=52+R0*Math.sin(a0),x1=50+R0*Math.cos(a1),y1=52+R0*Math.sin(a1);return arrow(`M${x0} ${y0} A${R0} ${R0} 0 0 1 ${x1} ${y1}`,[[x1,y1,a1+Math.PI/2]]);}).join('');
    case 'uturn':return arrow('M62 78 L62 44 Q62 28 48 28 Q34 28 34 44 L34 60',[[34,62,Math.PI/2]]);
    case 'oneway':return arrow('M50 80 L50 22',[[50,22,U]]);
    case 'bus':return `<rect x="26" y="30" width="48" height="36" rx="5" ${F}/><rect x="31" y="36" width="38" height="12" fill="#1f5fa8"/><circle cx="36" cy="70" r="5" ${F}/><circle cx="64" cy="70" r="5" ${F}/>`;
    case 'tram':return `<path d="M42 22 L50 30 L58 22" ${S2}/><rect x="30" y="30" width="40" height="40" rx="6" ${F}/><rect x="35" y="36" width="30" height="12" fill="#1f5fa8"/>`;
    case 'lanes':return arrow('M30 80 L30 50 Q30 42 22 42',[[20,42,Math.PI]])+arrow('M50 80 L50 26',[[50,26,U]])+arrow('M70 80 L70 50 Q70 42 78 42',[[80,42,0]]);
    case 'house':return `<path d="M28 52 L50 30 L72 52 M34 48 L34 74 L66 74 L66 48" ${S2}/><rect x="45" y="58" width="10" height="16" ${F}/>`;
    case 'P':return `<text x="50" y="72" font-family="Arial, sans-serif" font-weight="700" font-size="58" text-anchor="middle" fill="${col}">P</text>`;
    case 'txt':return `<text x="50" y="58" font-family="Arial, sans-serif" font-weight="700" font-size="18" text-anchor="middle" fill="${col}">?</text>`;
  }
  return '';
}
function signSVG(code,val){
  const [c,n,k,g,slash]=signDef(code);let b='';
  const red='#d01c2a',blue='#1f5fa8';
  if(k==='img')return `<img src="${g}" alt="" style="width:100%;height:100%;object-fit:contain">`;
  if(k==='warn')b=`<path d="M50 6 L95 88 Q96 92 92 92 L8 92 Q4 92 5 88 Z" fill="#fff" stroke="${red}" stroke-width="9" stroke-linejoin="round"/><g transform="translate(15 22) scale(.7)">${glyph(g,'#1c2628')}</g>`;
  if(k==='yield')b=`<path d="M6 10 L94 10 L50 94 Z" fill="#fff" stroke="${red}" stroke-width="9" stroke-linejoin="round"/>`;
  if(k==='stop')b=`<path d="M30 3 L70 3 L97 30 L97 70 L70 97 L30 97 L3 70 L3 30 Z" fill="${red}" stroke="#fff" stroke-width="3"/><text x="50" y="61" font-family="Arial, sans-serif" font-weight="700" font-size="28" text-anchor="middle" fill="#fff">STOP</text>`;
  if(k==='main'||k==='mainEnd')b=`<path d="M50 3 L97 50 L50 97 L3 50 Z" fill="#fff" stroke="#1c2628" stroke-width="2"/><path d="M50 16 L84 50 L50 84 L16 50 Z" fill="${k==='main'?'#f5c400':'#f5c400'}"/>`+(k==='mainEnd'?`<path d="M26 74 L74 26" stroke="#1c2628" stroke-width="5"/><path d="M34 80 L80 34 M20 66 L66 20" stroke="#1c2628" stroke-width="3"/>`:'');
  if(k==='proh')b=`<circle cx="50" cy="50" r="44" fill="#fff" stroke="${red}" stroke-width="10"/>${g?glyph(g,'#1c2628',val):''}${slash?`<path d="M20 80 L80 20" stroke="${red}" stroke-width="8"/>`:''}`;
  if(k==='noentry')b=`<circle cx="50" cy="50" r="47" fill="${red}"/><rect x="18" y="42" width="64" height="16" fill="#fff"/>`;
  if(k==='nostop'||k==='nopark')b=`<circle cx="50" cy="50" r="44" fill="${blue}" stroke="${red}" stroke-width="10"/><path d="M20 80 L80 20${k==='nostop'?' M20 20 L80 80':''}" stroke="${red}" stroke-width="9"/>`;
  if(k==='mand')b=`<circle cx="50" cy="50" r="47" fill="${blue}"/>${glyph(g,'#fff')}`;
  if(k==='info')b=`<rect x="4" y="4" width="92" height="92" rx="8" fill="${blue}"/>${glyph(g,'#fff')}`;
  if(k==='infoTri')b=`<rect x="4" y="4" width="92" height="92" rx="8" fill="${blue}"/><path d="M50 12 L90 84 L10 84 Z" fill="#fff"/><g transform="translate(20 26) scale(.6)">${glyph(g,'#1c2628')}</g>`;
  if(k==='light')b=`<rect x="30" y="4" width="40" height="92" rx="10" fill="#1c2628"/><circle cx="50" cy="24" r="11" fill="#e03b2e"/><circle cx="50" cy="50" r="11" fill="#f2b632"/><circle cx="50" cy="76" r="11" fill="#2f9a50"/>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">${b}</svg>`;
}
const signById=id=>(DS().signs||[]).find(x=>x.id===id);
function placeSign(ll){const ds=DS();ds.signs=ds.signs||[];ds.sid2=ds.sid2||1;
  const sn={id:ds.sid2++,c:ds.signSel||'5.19.1',ll:[ll.lat,ll.lng],rot:0,val:ds.signSel==='3.24'?40:null,st:'new'};ds.signs.push(sn);ds.sel={t:'sign',id:sn.id};afterDesign();}
const ST_LBL={exist:'Mavjud',new:'Yangi (loyiha)',remove:'Olib tashlanadi'};
function renderSigns(){
  signL.clearLayers();const ds=DS();if(S.app!=='design')return;
  const z=map.getZoom(),sz=Math.max(14,Math.min(44,Math.round(34*Math.pow(2,z-19))));
  (ds.signs||[]).forEach(sn=>{const on=ds.sel&&ds.sel.t==='sign'&&ds.sel.id===sn.id;
    const ring=on?'outline:3px solid #f4c542;outline-offset:2px;border-radius:4px;':'';
    const badge=sn.st==='exist'?`<span style="position:absolute;left:-4px;bottom:-4px;background:#1c2628;color:#fff;font:700 8px sans-serif;border-radius:3px;padding:0 2px">M</span>`:sn.st==='remove'?`<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#d01c2a;font:900 ${sz}px sans-serif;line-height:1">×</span>`:'';
    const m=L.marker(sn.ll,{pane:'signs',draggable:true,title:`${sn.c} ${signDef(sn.c)[1]}`,icon:L.divIcon({className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],
      html:`<div style="position:relative;width:${sz}px;height:${sz}px;${ring}filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));${sn.st==='remove'?'opacity:.6;':''}"><div style="width:100%;height:100%;transform:rotate(${sn.rot||0}deg)">${signSVG(sn.c,sn.val)}</div>${badge}</div>`})}).addTo(signL);
    m.on('click',()=>{ds.sel={t:'sign',id:sn.id};afterDesign();});
    m.on('contextmenu',e=>openSignMenu(e,sn));
    m.on('dragend',e=>{const p=e.target.getLatLng();sn.ll=[p.lat,p.lng];save();});
  });
}
map.on('zoomend',()=>{if(S.app==='design'){renderDesign();}});
function signCatalogHTML(){const ds=DS(),groups=[['1.','Ogohlantiruvchi'],['2.','Imtiyoz'],['3.','Taqiqlovchi'],['4.','Buyuruvchi'],['5.','Axborot-koʻrsatkich'],['6.','Servis'],['TL','Svetofor']];
  const all=[...SIGNS,...(ds.customSigns||[]).map(u=>[u.c,u.n,'img',u.img])];
  return `<div class="card" style="padding:10px"><h3>Yoʻl belgilari katalogi</h3>
  <p class="small" style="margin:0 0 8px">Raqamlash Vena konvensiyasi asosidagi tizim boʻyicha. YHQ ilovasidagi rasmiy raqam va nomlar bilan solishtirib tekshiring; kerakli belgi yoʻq boʻlsa — rasmini yuklang.</p>
  ${groups.map(([p,n])=>{const it=all.filter(x=>p==='TL'?x[0]==='TL':x[0].startsWith(p)&&x[0]!=='TL');if(!it.length)return '';
    return `<div class="pal-h" style="margin-top:6px">${n}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px">${it.map(x=>`<button data-sgn="${x[0]}" title="${x[0]} ${x[1]}" style="border:1px solid ${ds.signSel===x[0]?'var(--acc)':'var(--line)'};${ds.signSel===x[0]?'box-shadow:inset 0 0 0 2px var(--acc);':''}background:var(--bg);border-radius:6px;padding:4px 2px;display:flex;flex-direction:column;align-items:center;gap:2px"><span style="width:28px;height:28px">${signSVG(x[0],x[0]==='3.24'?40:null)}</span><span class="num" style="font-size:9px">${x[0]}</span></button>`).join('')}</div>`;}).join('')}
  <div class="tools" style="margin-top:8px"><label class="btn sm" for="sgUp">Belgi rasmini yuklash…</label><input id="sgUp" type="file" accept="image/png,image/svg+xml,image/jpeg" hidden>
  <button class="btn sm" id="sgOsm">OSMdagi mavjud belgilarni yuklash (ekrandagi hudud)</button></div>
  ${ds.signSel?`<div class="small" style="margin-top:6px">Tanlangan: <b>${ds.signSel}</b> ${signDef(ds.signSel)[1]} — xaritaga bosing.</div>`:''}
  ${(ds.signs||[]).length?`<div class="small" style="margin-top:6px">Xaritada: ${Object.entries((ds.signs||[]).reduce((a,x)=>{a[ST_LBL[x.st]]=(a[ST_LBL[x.st]]||0)+1;return a;},{})).map(([k,v])=>`${k} ${v}`).join(' · ')}</div>`:''}</div>`;}
function bindSignCatalog(el){const ds=DS();
  el.querySelectorAll('[data-sgn]').forEach(b=>b.onclick=()=>{ds.signSel=b.dataset.sgn;renderDesignPanel();save();});
  const up=el.querySelector('#sgUp');if(up)up.onchange=ev=>{const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const nm=f.name.replace(/\.[^.]+$/,'');ds.customSigns=ds.customSigns||[];
    const code=(nm.match(/\d+(?:\.\d+)+/)||['U'+(ds.customSigns.length+1)])[0];ds.customSigns.push({c:code,n:nm,img:r.result});ds.signSel=code;afterDesign();toast(`Belgi qoʻshildi: ${code}. Nomini fayl nomidan oldim — kerak boʻlsa belgini tanlab tahrirlang.`);};r.readAsDataURL(f);ev.target.value='';};
  const ob=el.querySelector('#sgOsm');if(ob)ob.onclick=()=>loadOsmSigns(map.getBounds());}
function signEditorHTML(sn){const d=signDef(sn.c);
  return `<div class="card" style="padding:10px"><div style="display:flex;gap:10px;align-items:center"><span style="width:48px;height:48px;flex:none">${signSVG(sn.c,sn.val)}</span><div><h3 style="margin:0">${sn.c} · ${d[1]}</h3><div class="small">${sn.osm?'OSM: '+sn.osm:'Qoʻlda qoʻyilgan'}</div></div></div>
  <div class="selbox" style="margin-top:8px"><select id="snC">${[...SIGNS,...(DS().customSigns||[]).map(u=>[u.c,u.n])].map(x=>`<option value="${x[0]}" ${x[0]===sn.c?'selected':''}>${x[0]} ${x[1]}</option>`).join('')}</select>
  <select id="snS">${Object.entries(ST_LBL).map(([k,n])=>`<option value="${k}" ${sn.st===k?'selected':''}>${n}</option>`).join('')}</select>
  ${sn.c==='3.24'?`<label class="small">Tezlik <input id="snV" type="number" step="10" value="${sn.val||40}" style="width:60px"> km/soat</label>`:''}
  <label class="small" style="flex-basis:100%">Burilish ${sn.rot||0}° <input id="snR" type="range" min="-180" max="180" step="5" value="${sn.rot||0}" style="width:100%"></label>
  <button class="btn sm" id="dDel" style="color:var(--bad)">Oʻchirish</button></div></div>`;}
function bindSignEditor(el,sn){const q=s=>el.querySelector(s);
  q('#snC').onchange=e=>{sn.c=e.target.value;if(sn.c==='3.24'&&!sn.val)sn.val=40;afterDesign();};q('#snS').onchange=e=>{sn.st=e.target.value;afterDesign();};
  if(q('#snV'))q('#snV').onchange=e=>{sn.val=parseInt(e.target.value)||40;afterDesign();};
  q('#snR').oninput=e=>{sn.rot=+e.target.value;renderSigns();};q('#snR').onchange=()=>afterDesign();}
async function loadOsmSigns(b){
  const ds=DS();ds.signs=ds.signs||[];ds.sid2=ds.sid2||1;
  const side=b.getNorthEast().distanceTo(b.getSouthWest());if(side>3000){toast('Hudud katta — xaritani yaqinlashtiring (≈2 km gacha).');return;}
  toast('OSMdan mavjud belgilar yuklanmoqda…');
  const bb=`(${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()})`;
  let els;try{els=await overpassRaw(`(node["traffic_sign"]${bb};node["highway"~"^(traffic_signals|stop|give_way|crossing|bus_stop)$"]${bb};node["railway"="tram_stop"]${bb};node["traffic_calming"~"^(bump|hump|table|cushion)$"]${bb};);out;`);}catch(e){toast('OSM bilan bogʻlanib boʻlmadi: '+e.message);return;}
  let n=0;const seen=new Set(ds.signs.filter(x=>x.osm).map(x=>x.osm));
  els.filter(e=>e.type==='node').forEach(e=>{const t=e.tags||{},add=(c,val)=>{const key=e.id+':'+c;if(seen.has(key))return;seen.add(key);ds.signs.push({id:ds.sid2++,c,ll:[e.lat,e.lon],rot:0,val:val||null,st:'exist',osm:key});n++;};
    if(t.traffic_sign){String(t.traffic_sign).split(/[;,]/).forEach(v=>{const m=v.match(/(\d+(?:\.\d+){1,2})(?:\[(\d+)\])?/);if(m)add(m[1],m[2]?+m[2]:null);});}
    if(t.highway==='traffic_signals')add('TL');if(t.highway==='stop')add('2.5');if(t.highway==='give_way')add('2.4');
    if(t.highway==='crossing'&&!/unmarked|no/.test(t.crossing||''))add('5.19.1');if(t.highway==='bus_stop')add('5.16');if(t.railway==='tram_stop')add('5.17');if(t.traffic_calming)add('5.20');});
  afterDesign();toast(n?`OSMdan ${n} ta mavjud belgi/obyekt qoʻshildi («M» belgisi bilan).`:'Bu hududda OSMda belgilar kiritilmagan. Mavjud belgilarni qoʻlda qoʻying (holati: Mavjud).');
}

/* Koʻcha profili → xaritada tahrirlanadigan modul */
function profileToDesign(){
  const ax=clippedAxis();if(!ax){toast('Avval koʻchani tanlang.');return;}
  const ll=ax.xy.map(q=>toLL(q,ax.o)),ds=DS(),p=S.prof[S.active],tot=sum(p);let cum=0;
  const st=p.map(e=>{const m=cum+e.w/2;cum+=e.w;const k=LIB2DK[e.k]||'walk';const dir=(DK[k].road||k==='bike')?(e.k==='bike2'?0:(m<tot/2?-1:1)):0;return [k,+e.w.toFixed(2),dir];});
  const a=newNode(ll[0]),b=newNode(ll[ll.length-1]);
  const sg={id:ds.sid++,a:a.id,b:b.id,pts:ll.slice(1,-1),p:'custom',st,off:S.site?.off||0,name:S.site?.name||'Koʻcha'};ds.segs.push(sg);
  ds.tool='select';ds.sel={t:'seg',id:sg.id,strip:null};
  setApp('design');map.fitBounds(L.latLngBounds(ll).pad(.3));afterDesign();
  loadOsmSigns(L.latLngBounds(ll).pad(.5));
  toast('Koʻcha xaritada tahrirlanadigan modulga aylandi. Istalgan elementni bosing yoki chegaralarni sudrang.');
}
{const _rs=renderSite;renderSite=function(){_rs();const el=document.getElementById('site');if(!S.site||!S.site.full)return;
  const b=document.createElement('button');b.className='btn primary';b.style.marginTop='8px';b.textContent='Xaritada tahrirlash (chiziqlar, elementlar, belgilar) →';b.onclick=profileToDesign;el.appendChild(b);};}
{const _sa=setApp;setApp=function(a){_sa(a);[editL,signL].forEach(l=>a==='design'?l.addTo(map):map.removeLayer(l));if(a==='design')renderDesign();};}

/* =====================================================================
   PANEL: modullar kutubxonasi, konstruktor, radius, halqa turlari, oʻtish joylari
   ===================================================================== */
const RQ=[0,10,15,25,50,100,200];
function toolOptionsHTML(){
  const ds=DS();let h='';
  if(ds.tool==='draw'){
    h+=`<div class="card" style="padding:10px"><label class="small" style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><input type="checkbox" id="dKeep" ${ds.keepDraw?'checked':''}> Tugatgach ham chizishni davom ettirish (aks holda «Tanlash»ga oʻtadi)</label><div class="pal-h">Harakat (yangi chiziladigan koʻcha)</div><div class="tools" style="margin-bottom:8px"><button class="btn sm ${!ds.drawOne?'primary':''}" data-one="0">⇄ Ikki tomonlama</button><button class="btn sm ${ds.drawOne?'primary':''}" data-one="1">→ Bir tomonlama (chizish yoʻnalishida)</button></div><div class="pal-h">Burilish radiusi (yangi nuqtalar uchun)</div><div class="tools">${RQ.map(r=>`<button class="btn sm ${(ds.drawR||0)===r?'primary':''}" data-rr="${r}">${r?r+' m':'oʻtkir'}</button>`).join('')}<input id="dR" type="number" min="0" step="1" value="${ds.drawR||0}" class="num" style="width:70px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"></div>
    <p class="small" style="margin:6px 0 0">Koʻcha yarim enidan kichik radius avtomatik kattalashtiriladi (aks holda chetlar oʻzaro kesishadi). Tayyor nuqtaning radiusini «Tanlash» rejimida nuqtani bosib oʻzgartirasiz.</p></div>`;
    const groups=[...new Set(Object.values(PRESETS).map(p=>p.g))];
    h+=`<div><div class="pal-h">Koʻcha modullari · ${Object.keys(PRESETS).length} ta</div>${groups.map(g=>{const it=Object.entries(PRESETS).filter(([,p])=>p.g===g);const open=it.some(([k])=>k===ds.preset);
      return `<details ${open?'open':''} style="margin-bottom:6px"><summary>${g} <span class="small">(${it.length})</span></summary><div style="display:grid;gap:5px;margin-top:6px">${it.map(([k,p])=>{let lay;try{lay=stripsLayout(k);}catch(e){return '';}
        return `<button class="btn sm" data-pre="${k}" style="text-align:left;${ds.preset===k?'border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)':''}"><div style="display:flex;justify-content:space-between;gap:8px"><span>${p.n}</span><span class="num small">${f1(lay.W)} m · ${lay.lanes} boʻlak</span></div>${stripSVG(k,10)}</button>`;}).join('')}</div>
        ${g==='Konstruktor'?konHTML():''}</details>`;}).join('')}</div>`;
  }
  if(ds.tool==='round')h+=`<div class="card" style="padding:10px"><div class="pal-h">Aylanma harakat turi</div><div style="display:grid;gap:5px">${Object.entries(RTYPES).map(([k,r])=>`<button class="btn sm" data-rt="${k}" style="text-align:left;${(ds.rtype||'r2')===k?'border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)':''}">${r.n} <span class="small num">· orol r ${r.ri} m · halqa ${r.rw} m</span></button>`).join('')}</div></div>`;
  h+=freeToolHTML()+objToolHTML();
  if(ds.tool==='xwalk')h+=`<div class="card" style="padding:10px"><div class="pal-h">Oʻtish joyi turi</div><div class="tools">${XWT.map(([k,n])=>`<button class="btn sm ${(ds.xwType||'zebra')===k?'primary':''}" data-xt="${k}">${n}</button>`).join('')}</div><p class="small" style="margin:6px 0 0">Oʻtish joyi atrofida parkovka avtomatik olib tashlanadi (trotuar kengaytmasi); ajratuvchi polosada piyoda oʻtish yoʻli ochiladi.</p></div>`;
  return h;
}
const XWT=[['zebra','Tartibga solinmagan (zebra)'],['signal','Svetoforli'],['raised','Koʻtarilgan (sunʼiy notekislik)'],['refuge','Xavfsizlik orolchasi bilan']];
const KON_F=[['oneway','Harakat',[[0,'Ikki tomonlama'],[1,'Bir tomonlama']]],['f','Boʻlaklar (oʻq boʻylab)',[1,2,3,4,5].map(v=>[v,v])],['b','Boʻlaklar (qarshi)',[0,1,2,3,4,5].map(v=>[v,v])],
  ['lw','Boʻlak eni, m',[[3,'3,00'],[3.25,'3,25'],[3.5,'3,50'],[3.75,'3,75']]],['med','Oʻrta qism',[['none','Yoʻq'],['hatch','Chiziqli ajratuvchi'],['green','Koʻkalamzor ajratuvchi'],['turn','Markaziy burilish boʻlagi'],['brt','BRT (markazda)'],['brtst','BRT bekati (platforma)'],['tram','Tramvay (ajratilgan)'],['boul','Bulvar (xiyobon)'],['island','Xavfsizlik orolchasi'],['rain','Yomgʻir bogʻi (markazda)']]],
  ['mw','Oʻrta qism eni, m',[[1,1],[2,2],[3,3],[4,4],[6,6],[8,8],[12,12]]],['bus','Avtobus boʻlagi',[['none','Yoʻq'],['curb','Chetda'],['center','Markazda (aralash)']]],['tram','Tramvay',[['none','Yoʻq'],['center','Markazda (aralash)'],['side','Chetda']]],
  ['bike','Velo',[['none','Yoʻq'],['lane','Boʻlak'],['prot','Himoyalangan boʻlak'],['track','Trek (trotuar yonida)'],['track2','Ikki yoʻnalishli trek']]],['park','Parkovka',[['none','Yoʻq'],['right','Bir tomonda'],['both','Ikki tomonda']]],['pang','Parkovka turi',[[0,'Parallel'],[30,'30° burchakli'],[45,'45° burchakli'],[90,'Perpendikulyar']]],
  ['service','Dublyor (har tomonda)',[[0,'Yoʻq'],[1,'1 boʻlak'],[2,'2 boʻlak']]],['rain','Yomgʻir bogʻi (chetda)',[[0,'Yoʻq'],[1,'Bor']]],['furn','Jihozlar zonasi',[[0,'Yoʻq'],[1,'Bor']]],['green','Koʻkalamzor eni, m',[[0,0],[1.2,'1,2'],[2,2],[3,3],[5,5]]],['walk','Trotuar eni, m',[[2,2],[2.5,'2,5'],[3,3],[4,4],[6,6]]]];
function konHTML(){const k=Object.assign({},KON0,DS().kon||{});
  return `<div class="card" style="padding:10px;margin-top:6px"><div class="pal-h">Konstruktor — istalgan kombinatsiya</div><div class="thr" style="margin-top:0">${KON_F.map(([key,n,opts])=>`<div class="field"><label for="kon_${key}">${n}</label><select id="kon_${key}" data-kon="${key}">${opts.map(([v,t])=>`<option value="${v}" ${String(k[key])===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`).join('')}</div>
  <div style="margin-top:6px">${stripSVG('kon',16)}</div><div class="small num">${f2(stripsLayout('kon').W)} m</div></div>`;}
function vertexHTML(sg,v){if(v==null||v<0||v>=sg.pts.length)return '';const cur=sg.rad&&sg.rad[v]!=null?sg.rad[v]:0,eff=effRad(sg,v);
  return `<div class="card" style="padding:10px"><h3>Burilish nuqtasi ${v+1} · samarali radius <span class="num">${f1(eff)} m</span></h3><div class="tools">${RQ.map(r=>`<button class="btn sm ${cur===r?'primary':''}" data-vr="${r}">${r?r+' m':'min'}</button>`).join('')}<input id="vR" type="number" min="0" step="1" value="${cur}" class="num" style="width:70px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"></div>
  <p class="small" style="margin:6px 0 0">Minimal radius bu koʻcha uchun ${f1(layOf(sg).outer+1)} m. Nuqtani oʻchirish — xaritada oʻng tugma.</p></div>`;}
function xwHTML(sel){const sg=segById(sel.id);if(!sg||!sg.xw||!sg.xw[sel.i])return '';const x=sg.xw[sel.i];
  return `<div class="card" style="padding:10px"><h3>Piyoda oʻtish joyi</h3><div class="selbox"><select id="xwT">${XWT.map(([k,n])=>`<option value="${k}" ${x.type===k?'selected':''}>${n}</option>`).join('')}</select>
  <label class="small">Eni, m <input id="xwW" type="number" min="2" step="0.5" value="${x.w}" style="width:64px"></label><button class="btn sm" id="dDel" style="color:var(--bad)">Oʻchirish</button></div><p class="small" style="margin:6px 0 0">Xaritadagi sariq doirani sudrab koʻcha boʻylab koʻchiring.</p></div>`;}
function nodeHTML(n){const k=nodeKind(n),rt=RTYPES[n.rtype||'r2'];
  return `<div class="card" style="padding:10px"><h3>Tugun · ${{end:'uch',join:'burilish/ulanish',x:'tartibga solinmagan chorraha',sig:'svetoforli chorraha',round:'aylanma halqa'}[k]} (${degree(n)} yoʻl)</h3>
  <div class="selbox"><select id="dNT">${[['auto','Avto (yoʻllar soniga koʻra)'],['x','Tartibga solinmagan chorraha'],['sig','Svetoforli chorraha'],['round','Aylanma halqa']].map(([v,t])=>`<option value="${v}" ${n.type===v?'selected':''}>${t}</option>`).join('')}</select>
  ${k==='x'||k==='sig'?`<label class="small">Bordyur radiusi, m <input id="dKr" type="number" min="1" step="1" value="${n.kr??6}" style="width:60px"></label>`:''}
  ${n.type==='round'?`<select id="dRt">${Object.entries(RTYPES).map(([kk,r])=>`<option value="${kk}" ${(n.rtype||'r2')===kk?'selected':''}>${r.n}</option>`).join('')}</select>
    <label class="small">Orol r, m <input id="dRi" type="number" step="0.5" min="1" value="${n.ri}" style="width:58px"></label><label class="small">Halqa eni, m <input id="dRw" type="number" step="0.5" min="4" value="${n.rw}" style="width:58px"></label>
    <label class="small">Boʻlaklar <input id="dLn" type="number" step="1" min="1" max="4" value="${n.lanes||rt.lanes}" style="width:48px"></label>${rt.turbo?`<label class="small" style="flex-basis:100%">Spiral burchagi ${n.rot||0}° <input id="dRot" type="range" min="0" max="355" step="5" value="${n.rot||0}" style="width:100%"></label>`:''}`:''}
  <button class="btn sm" id="dDel" style="color:var(--bad)">Oʻchirish</button></div>
  ${k==='x'?`<p class="small" style="margin:6px 0 0">Asosiy yoʻl — eng koʻp boʻlakli ikki yoʻl; qolganlarida «Yoʻl bering» chizigʻi (1.13) va belgisi.</p>`:''}</div>`;}
function bindDesignExtras(el,q,num){const ds=DS(),sel=ds.sel;
  el.querySelectorAll('[data-rr]').forEach(b=>b.onclick=()=>{ds.drawR=+b.dataset.rr;afterDesign();});
  if(q('#dR'))q('#dR').onchange=e=>{ds.drawR=Math.max(0,+e.target.value||0);afterDesign();};
  el.querySelectorAll('[data-kon]').forEach(i=>i.onchange=()=>{ds.kon=Object.assign({},KON0,ds.kon||{});const v=i.value;ds.kon[i.dataset.kon]=isNaN(+v)?v:+v;ds.preset='kon';afterDesign();});
  el.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{ds.rtype=b.dataset.rt;afterDesign();});
  el.querySelectorAll('[data-xt]').forEach(b=>b.onclick=()=>{ds.xwType=b.dataset.xt;afterDesign();});
  if(sel&&sel.t==='seg'){const sg=segById(sel.id);if(sg){const setR=r=>{sg.rad=sg.rad||[];while(sg.rad.length<sg.pts.length)sg.rad.push(0);sg.rad[sel.v]=r;afterDesign();};
    el.querySelectorAll('[data-vr]').forEach(b=>b.onclick=()=>setR(+b.dataset.vr));if(q('#vR'))q('#vR').onchange=e=>setR(Math.max(0,+e.target.value||0));}}
  if(sel&&sel.t==='xw'){const sg=segById(sel.id),x=sg&&sg.xw&&sg.xw[sel.i];if(x&&q('#xwT')){q('#xwT').onchange=e=>{x.type=e.target.value;afterDesign();};num('#xwW',v=>x.w=v);}}
  if(sel&&sel.t==='node'){const n=nodeById(sel.id);if(n&&q('#dNT')){
    q('#dNT').onchange=e=>{n.type=e.target.value;if(n.type==='round'&&!n.rtype)n.rtype='r2';if(n.type==='round'){const r=RTYPES[n.rtype];n.ri=n.ri||r.ri;n.rw=n.rw||r.rw;}afterDesign();};
    num('#dKr',v=>n.kr=v);num('#dRi',v=>n.ri=v);num('#dRw',v=>n.rw=v);num('#dLn',v=>n.lanes=Math.round(v));
    if(q('#dRt'))q('#dRt').onchange=e=>{n.rtype=e.target.value;const r=RTYPES[n.rtype];n.ri=r.ri;n.rw=r.rw;n.lanes=r.lanes;afterDesign();};
    if(q('#dRot')){q('#dRot').oninput=e=>{n.rot=+e.target.value;renderDesignCore();};q('#dRot').onchange=()=>afterDesign();}}}
  if(q('#dAuto'))q('#dAuto').onclick=autoSigns;
  bindFree(el,q);bindObj(el,q,num);
}
function autoSigns(){
  const ds=DS(),o=origin(),cw=ds.thr.cw;ds.signs=(ds.signs||[]).filter(x=>!x.auto);ds.sid2=ds.sid2||1;
  const add=(c,ll,val)=>ds.signs.push({id:ds.sid2++,c,ll,rot:0,val:val||null,st:'new',auto:1});
  ds.segs.forEach(sg=>{const A1=nodeById(sg.a),B1=nodeById(sg.b);if(!A1||!B1)return;const lay=layOf(sg),xy=segXY(sg,o),c=cumLen(xy),T=c[c.length-1];
    const trim=n=>{const R0=nodeR(n);return nodeKind(n)==='round'&&lay.half<R0-1?Math.sqrt(R0*R0-lay.half*lay.half):R0;};
    const ra=trim(A1),rb=trim(B1);if(T-ra-rb<6)return;
    const rightD=dir=>dir>0?lay.st[lay.st.length-1].d2+.8:lay.st[0].d1-.8;
    const at=(s,d)=>{const f=frameAt(xy,c,Math.max(0,Math.min(T,s)));return toLL([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d],o);};
    const hasDir=dir=>lay.road.some(x=>!isPk(x.k)&&x.dir===dir);
    [[B1,1,T-rb],[A1,-1,ra]].forEach(([n,dir,sEdge])=>{if(!hasDir(dir))return;const k=nodeKind(n);if(!isInter(k))return;
      const off=(k==='round'?5:.5)+cw+3,s=dir>0?sEdge-off:sEdge+off;if(s<1||s>T-1)return;const p=at(s,rightD(dir)),p2=at(dir>0?s-3:s+3,rightD(dir));
      if(k==='sig')add('TL',p);else if(k==='x')add(majorArms(n).has(sg.id)?'2.1':'2.4',p);
      else{add('4.3',p);add('2.4',p2);if(RTYPES[n.rtype||'r2'].sig)add('TL',at(dir>0?s-6:s+6,rightD(dir)));}
      if(k!=='round'&&(sg.cwA!==false||sg.cwB!==false))add('5.19.1',at(dir>0?sEdge-.5:sEdge+.5,rightD(dir)));});
    (sg.xw||[]).forEach(x=>{const sc=x.f*T;[1,-1].forEach(dir=>{if(!hasDir(dir))return;const s=dir>0?sc-x.w/2-1:sc+x.w/2+1;
      add(x.type==='signal'?'TL':'5.19.1',at(s,rightD(dir)));if(x.type==='raised')add('5.20',at(dir>0?s-3:s+3,rightD(dir)));});});
    (sg.att||[]).forEach(a=>{if(!['bus','bay','tramstop'].includes(a.t))return;const sc=a.f*T,dd=a.t==='tramstop'?(a.d||0):(a.side>0?lay.st[0].d1-.8:lay.st[lay.st.length-1].d2+.8);add(a.t==='tramstop'?'5.17':'5.16',at(sc-a.len/2+2,dd));});
    [1,-1].forEach(dir=>{if(lay.st.some(x=>x.k==='bus'&&x.dir===dir)){const s=dir>0?ra+cw+12:T-rb-cw-12;if(s>1&&s<T-1)add('5.14',at(s,rightD(dir)));}});
    const dirs=[...new Set(lay.road.filter(x=>x.k==='lane').map(x=>x.dir))];
    if(dirs.length===1&&dirs[0]){const dir=dirs[0];add('5.5',at(dir>0?ra+cw+8:T-rb-cw-8,rightD(dir)));add('3.1',at(dir>0?T-rb-1:ra+1,rightD(-dir)));}
  });
  afterDesign();toast(`${ds.signs.filter(x=>x.auto).length} ta belgi qoʻyildi. Keraksizini oʻchiring yoki sudrab joylashtiring; holati — «Yangi (loyiha)».`);
}

/* =====================================================================
   ERKIN SHAKLLAR va YOʻL CHIZIQLARI, BIR TOMONLAMA HARAKAT, QOʻLLANMA
   ===================================================================== */
const SHP={asphalt:{n:'Asfalt (qatnov qismi)',col:'#3c3e43',cat:'car'},walk:{n:'Trotuar / piyoda yoʻli',col:'#d6c3a2',cat:'ped'},plaza:{n:'Maydon (plitka)',col:'#cbb48d',cat:'ped'},
  green:{n:'Koʻkalamzor',col:'#6f8f4e',cat:'green'},island:{n:'Orolcha (bordyurli)',col:'#bdb39e',cat:'ped'},bike:{n:'Velo yoʻlak',col:'#2f8f58',cat:'bike'},
  bus:{n:'Avtobus boʻlagi / bekat',col:'#9e3a32',cat:'pt'},park:{n:'Parkovka maydoni',col:'#505259',cat:'car'},water:{n:'Suv / ariq',col:'#3f86c6',cat:'green'},
  rain:{n:'Yomgʻir bogʻi (bioswale)',col:'#6aa07f',cat:'green'},refuge:{n:'Xavfsizlik orolchasi',col:'#bdb39e',cat:'ped'},parklet:{n:'Parklet (dam olish joyi)',col:'#b08a5a',cat:'ped'},
  furn:{n:'Jihozlar / skameykalar zonasi',col:'#aea58f',cat:'ped'},play:{n:'Bolalar maydonchasi',col:'#d9a441',cat:'ped'},bikepark:{n:'Velo turargoh',col:'#3f9a6a',cat:'bike'}};
const LNT=[['1.1','1.1 uzluksiz'],['1.2','1.2 chekka'],['1.3','1.3 qoʻsh uzluksiz'],['1.5','1.5 uzuq'],['1.6','1.6 yaqinlashish'],['1.11','1.11 aralash'],['1.12','1.12 toʻxtash chizigʻi'],['1.13','1.13 yoʻl berish'],['1.16','1.16 shtrixlangan orolcha'],['zebra','1.14.1 zebra'],['arrowS','1.18 toʻgʻriga'],['arrowL','1.18 chapga'],['arrowR','1.18 oʻngga'],['arrowSR','1.18 toʻgʻri + oʻng'],['arrowSL','1.18 toʻgʻri + chap']];
const TWO_PT=new Set(['zebra','arrowS','arrowL','arrowR','arrowSR','arrowSL']);
const F={pts:[],cur:null};
function trafficMode(sg){const r=layOf(sg).road.filter(x=>x.k==='lane'||x.k==='bus');if(!r.length)return '';const d=[...new Set(r.map(x=>x.dir))];return d.length>1?'two':d[0]>0?'fwd':d[0]<0?'back':'';}
function setTraffic(sg,mode){ensureSt(sg);const lay=stripsLayout(sg.st,sg.off||0);
  sg.st.forEach((x,i)=>{if(!(['lane','bus','tram','turn'].includes(x[0])||isPk(x[0])))return;if(x[0]==='turn'){if(mode!=='two'){x[0]='lane';}else return;}
    x[2]=mode==='fwd'?1:mode==='back'?-1:(lay.st[i].mid>0?-1:1);});
  if(mode!=='two'){const dir=mode==='fwd'?1:-1;sg.st.forEach(x=>{if(x[0]==='bike'&&x[2])x[2]=dir;});}
  if(sg.mk)sg.mk={};}
function freeClick(ll){const ds=DS(),p=[ll.lat,ll.lng];
  if(ds.tool==='shape'&&F.pts.length>2){const a=map.latLngToContainerPoint(F.pts[0]),b=map.latLngToContainerPoint(ll);if(a.distanceTo(b)<12){finishFree();return;}}
  F.pts.push(p);
  if(ds.tool==='line'&&TWO_PT.has(ds.lineType||'1.1')&&F.pts.length===2){finishFree();return;}
  renderDesign();renderHint();}
function finishFree(){const ds=DS();
  if(ds.tool==='shape'){if(F.pts.length<3){toast('Shakl uchun kamida 3 nuqta kerak.');return;}ds.shapes=ds.shapes||[];ds.fid=ds.fid||1;const s={id:ds.fid++,k:ds.shapeType||'asphalt',pts:F.pts.slice()};ds.shapes.push(s);ds.sel={t:'shape',id:s.id};}
  else{if(F.pts.length<2){toast('Chiziq uchun kamida 2 nuqta kerak.');return;}ds.lines=ds.lines||[];ds.fid=ds.fid||1;const l={id:ds.fid++,k:ds.lineType||'1.1',pts:F.pts.slice()};ds.lines.push(l);ds.sel={t:'line',id:l.id};}
  F.pts=[];F.cur=null;afterDesign();}
map.on('mousemove',e=>{if(S.app==='design'&&F.pts.length&&!M.tool){F.cur=[e.latlng.lat,e.latlng.lng];previewSoon();}});
map.on('dblclick',()=>{if(S.app==='design'&&F.pts.length&&!M.tool){F.pts.pop();finishFree();}});
function freePreview(){if(!F.pts.length)return;const ds=DS(),pts=[...F.pts,...(F.cur?[F.cur]:[])];
  if(ds.tool==='shape'&&pts.length>2)L.polygon(pts,{pane:'designEdit',interactive:false,color:'#f4c542',weight:2,dashArray:'5 4',fillColor:SHP[ds.shapeType||'asphalt'].col,fillOpacity:.6}).addTo(previewL);
  else L.polyline(pts,{pane:'designEdit',interactive:false,color:'#f4c542',weight:3,dashArray:'5 4'}).addTo(previewL);
  F.pts.forEach(p=>L.circleMarker(p,{pane:'designEdit',interactive:false,radius:4,color:'#1c2628',weight:1,fillColor:'#f4c542',fillOpacity:1}).addTo(previewL));
  if(F.cur&&pts.length>1)lab(F.cur,fmtD(lineLen(pts))).addTo(previewL);}
function freeShapes(ds,o,poly,line,mark){
  (ds.shapes||[]).forEach(s=>{const k=SHP[s.k]||SHP.asphalt;poly(s.pts,k.col,k.cat,4);if(['island','walk','plaza','refuge','parklet','furn','play'].includes(s.k))line([...s.pts,s.pts[0]],{color:'#8d8574',weight:1},null,4.5);
    if(s.k==='rain'){line([...s.pts,s.pts[0]],{color:'#6fb3d9',weight:1.5,dashArray:'4 3'},null,4.5);mark('yomgʻir bogʻi');}
    if(s.k==='refuge'){line([...s.pts,s.pts[0]],{color:'#fff',weight:1.5},null,6.5);mark('xavfsizlik orolchasi');}});
  (ds.lines||[]).forEach(l=>{const xy=l.pts.map(q=>toXY(q,o)),LL=e=>offsetLine(xy,e).map(q=>toLL(q,o)),W={color:'#fff',weight:1.3};
    switch(l.k){
      case '1.1':line(l.pts,{color:'#fff',weight:2},'1.1',6);break;case '1.2':line(l.pts,{color:'#fff',weight:2.5},'1.2',6);break;
      case '1.3':line(LL(.12),W,null,6);line(LL(-.12),W,null,6);mark('1.3');break;
      case '1.5':line(l.pts,{color:'#fff',weight:1.5,dashArray:'8 10'},'1.5',6);break;case '1.6':line(l.pts,{color:'#fff',weight:1.5,dashArray:'20 6'},'1.6',6);break;
      case '1.11':line(LL(.12),W,null,6);line(LL(-.12),Object.assign({dashArray:'8 10'},W),null,6);mark('1.11');break;
      case '1.12':line(l.pts,{color:'#fff',weight:4},'1.12',6);break;case '1.13':line(l.pts,{color:'#fff',weight:3,dashArray:'4 4'},'1.13',6);break;
      case '1.16':{if(xy.length<3)break;const lat=l.pts;line([...lat,lat[0]],{color:'#fff',weight:1.5},'1.16',6);const bx=xy.reduce((a,p)=>[Math.min(a[0],p[0]),Math.min(a[1],p[1]),Math.max(a[2],p[0]),Math.max(a[3],p[1])],[1e9,1e9,-1e9,-1e9]);
        const inside=(x,y)=>{let c=false;for(let i=0,j=xy.length-1;i<xy.length;j=i++){const a=xy[i],b=xy[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
        for(let t=bx[0]-(bx[3]-bx[1]);t<bx[2];t+=2.5){const seg=[];for(let u=0;u<=1;u+=.02){const x=t+u*(bx[3]-bx[1]),y=bx[1]+u*(bx[3]-bx[1]);if(inside(x,y))seg.push(toLL([x,y],o));else if(seg.length){break;}}if(seg.length>1)line([seg[0],seg[seg.length-1]],{color:'#fff',weight:1},null,6);}break;}
      case 'zebra':{const a=xy[0],b=xy[xy.length-1],L2=Math.hypot(b[0]-a[0],b[1]-a[1])||1,u=[(b[0]-a[0])/L2,(b[1]-a[1])/L2],n=[-u[1],u[0]],w=ds.thr.cw/2;
        for(let t=.25;t<L2-.2;t+=1){const t2=Math.min(t+.5,L2),P=(tt,s)=>toLL([a[0]+u[0]*tt+n[0]*s,a[1]+u[1]*tt+n[1]*s],o);poly([P(t,-w),P(t2,-w),P(t2,w),P(t,w)],'#f2f2ee',null,7);}mark('1.14.1');break;}
      default:{if(!l.k.startsWith('arrow'))break;const a=xy[0],b=xy[xy.length-1],L2=Math.hypot(b[0]-a[0],b[1]-a[1])||1,u=[(b[0]-a[0])/L2,(b[1]-a[1])/L2],m=[(a[0]+b[0])/2,(a[1]+b[1])/2],nL=[-u[1],u[0]];
        const turn=side=>{const s0=[m[0]-u[0]*1.5,m[1]-u[1]*1.5];const p=[s0,[m[0]+u[0]*.5,m[1]+u[1]*.5],[m[0]+u[0]*.5+nL[0]*side*1.2,m[1]+u[1]*.5+nL[1]*side*1.2]];line(p.map(q=>toLL(q,o)),{color:'#f4f4f0',weight:2.5},null,7);poly(arrowShape([p[2][0]+nL[0]*side*.4,p[2][1]+nL[1]*side*.4],[nL[0]*side,nL[1]*side],1.8,o),'#f4f4f0',null,7);};
        if(l.k==='arrowS'||l.k==='arrowSR'||l.k==='arrowSL')poly(arrowShape(m,u,5,o),'#f4f4f0',null,7);
        if(l.k==='arrowL'||l.k==='arrowSL')turn(1);if(l.k==='arrowR'||l.k==='arrowSR')turn(-1);mark('1.18');}
    }});
}
function hitFree(ll){const ds=DS(),P=map.latLngToContainerPoint(ll);
  for(const l of (ds.lines||[]).slice().reverse()){const pp=l.pts.map(q=>map.latLngToContainerPoint(q));for(let i=0;i<pp.length-1;i++){const a=pp[i],b=pp[i+1],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;let t=((P.x-a.x)*dx+(P.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));if(Math.hypot(a.x+t*dx-P.x,a.y+t*dy-P.y)<8)return {t:'line',id:l.id};}}
  for(const s of (ds.shapes||[]).slice().reverse()){const pp=s.pts.map(q=>map.latLngToContainerPoint(q));let c=false;for(let i=0,j=pp.length-1;i<pp.length;j=i++){const a=pp[i],b=pp[j];if((a.y>P.y)!==(b.y>P.y)&&P.x<(b.x-a.x)*(P.y-a.y)/(b.y-a.y)+a.x)c=!c;}if(c)return {t:'shape',id:s.id};}
  return null;}
function freeObj(sel){const ds=DS();return (sel.t==='shape'?ds.shapes:ds.lines||[]).find(x=>x.id===sel.id);}
function freeHandles(sel){const ob=freeObj(sel);if(!ob)return;const closed=sel.t==='shape';
  ob.pts.forEach((p,i)=>{const m=L.marker(p,{pane:'designEdit',draggable:true,icon:handleIcon('c','#fff'),title:'Sudrang · oʻng tugma — oʻchirish'}).addTo(editL);
    m.on('drag',e=>{const q=e.target.getLatLng();ob.pts[i]=[q.lat,q.lng];coreRender();});m.on('dragend',()=>afterDesign());
    m.on('contextmenu',()=>{if(ob.pts.length>(closed?3:2)){ob.pts.splice(i,1);afterDesign();}});});
  const n=ob.pts.length;for(let i=0;i<(closed?n:n-1);i++){const a=ob.pts[i],b=ob.pts[(i+1)%n],mp=mid(a,b);
    const m=L.marker(mp,{pane:'designEdit',icon:L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],html:'<div style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.6);border:1px dashed #1c2628;font:700 11px/12px sans-serif;text-align:center;color:#1c2628;cursor:copy">+</div>'}),title:'Nuqta qoʻshish'}).addTo(editL);
    m.on('click',()=>{ob.pts.splice(i+1,0,mp);afterDesign();});}}
function freeHint(h,t){const ds=DS(),n=F.pts.length;
  const what=t==='shape'?`<b>Erkin shakl</b> (${SHP[ds.shapeType||'asphalt'].n}). Chegarani nuqtama-nuqta bosing; birinchi nuqtani bosib yoki Enter bilan yoping.`
    :TWO_PT.has(ds.lineType||'1.1')?`<b>${LNT.find(x=>x[0]===(ds.lineType||'1.1'))[1]}.</b> ${ds.lineType==='zebra'?'Yoʻlning bir chetini, soʻng qarshi chetini bosing (koʻndalang).':'Strelka boshlanishini, soʻng harakat yoʻnalishini bosing.'}`
    :`<b>Yoʻl chizigʻi</b> (${LNT.find(x=>x[0]===(ds.lineType||'1.1'))[1]}). Nuqtalarni bosing; Enter — tugatish.`;
  h.innerHTML=what+(n?`<div class="row"><button class="btn sm primary" id="fFin">Tugatish (Enter)</button><button class="btn sm" id="fUndo">Oxirgi nuqta (⌫)</button><button class="btn sm" id="fEsc">Bekor (Esc)</button></div>`:'');
  const q=id=>h.querySelector(id);if(q('#fFin'))q('#fFin').onclick=finishFree;if(q('#fUndo'))q('#fUndo').onclick=()=>{F.pts.pop();renderDesign();renderHint();};if(q('#fEsc'))q('#fEsc').onclick=()=>{F.pts=[];renderDesign();renderHint();};}
function freeToolHTML(){const ds=DS(),sel=ds.sel;let h='';
  if(ds.tool==='shape')h+=`<div class="card" style="padding:10px"><div class="pal-h">Shakl sirti</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px">${Object.entries(SHP).map(([k,v])=>`<button class="btn sm" data-shp="${k}" style="display:flex;gap:7px;align-items:center;text-align:left;${(ds.shapeType||'asphalt')===k?'border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)':''}"><span class="sw" style="background:${v.col}"></span>${v.n}</button>`).join('')}</div>
    <p class="small" style="margin:6px 0 0">Burilish choʻntagi, avtobus bekati joyi, kengaytirilgan trotuar, maydon, orolcha — modul bilan chizib boʻlmaydigan har qanday shakl. Shakl koʻchalar ustidan chiziladi.</p></div>`;
  if(ds.tool==='line')h+=`<div class="card" style="padding:10px"><div class="pal-h">Chiziq turi</div><div class="tools">${LNT.map(([k,n])=>`<button class="btn sm ${(ds.lineType||'1.1')===k?'primary':''}" data-lnt="${k}">${n}</button>`).join('')}</div>
    <p class="small" style="margin:6px 0 0">Avtomatik chiziqlar ustidan qoʻshimcha chiziq, strelka yoki zebra chizasiz. Avtomatik chiziqni olib tashlash — koʻchani tanlab, chegara chizigʻini «chiziqsiz» qiling.</p></div>`;
  if(sel&&(sel.t==='shape'||sel.t==='line')){const ob=freeObj(sel);if(ob){
    h+=`<div class="card" style="padding:10px"><h3>${sel.t==='shape'?'Erkin shakl':'Yoʻl chizigʻi'}</h3><div class="selbox"><select id="frK">${(sel.t==='shape'?Object.entries(SHP).map(([k,v])=>[k,v.n]):LNT).map(([k,n])=>`<option value="${k}" ${ob.k===k?'selected':''}>${n}</option>`).join('')}</select>
    <button class="btn sm" id="dDel" style="color:var(--bad)">Oʻchirish</button></div><p class="small" style="margin:6px 0 0">Doiralarni sudrang, «+» — nuqta qoʻshish, oʻng tugma — nuqtani oʻchirish.${sel.t==='shape'?` Maydon: <b class="num">${fmtA(polyArea(ob.pts))}</b>`:` Uzunlik: <b class="num">${fmtD(lineLen(ob.pts))}</b>`}</p></div>`;}}
  return h;}
function bindFree(el,q){const ds=DS();
  el.querySelectorAll('[data-shp]').forEach(b=>b.onclick=()=>{ds.shapeType=b.dataset.shp;afterDesign();});
  el.querySelectorAll('[data-lnt]').forEach(b=>b.onclick=()=>{ds.lineType=b.dataset.lnt;F.pts=[];afterDesign();});
  el.querySelectorAll('[data-one]').forEach(b=>b.onclick=()=>{ds.drawOne=b.dataset.one==='1';afterDesign();});
  {const k=el.querySelector('#dKeep');if(k)k.onchange=()=>{ds.keepDraw=k.checked;save();};}
  if(q('#frK'))q('#frK').onchange=e=>{const ob=freeObj(ds.sel);if(ob){ob.k=e.target.value;afterDesign();}};
  el.querySelectorAll('[data-dt]').forEach(b=>b.addEventListener('click',()=>{F.pts=[];}));
  const g=el.querySelector('#guide');if(g)g.addEventListener('toggle',()=>{ds.guideOpen=g.open;save();});}
function guideHTML(){const ds=DS(),open=ds.guideOpen??true;
  const sec=(t,items)=>`<div style="margin-top:10px"><b>${t}</b><ol style="margin:4px 0 0;padding-left:20px;display:grid;gap:3px">${items.map(x=>`<li>${x}</li>`).join('')}</ol></div>`;
  return `<details id="guide" class="card" style="padding:10px 12px" ${open?'open':''}><summary style="font-size:14px">Qoʻllanma — qanday ishlatiladi</summary><div class="small" style="color:var(--ink);font-size:12.5px;line-height:1.5">
  ${sec('Koʻcha chizish',['«Koʻcha chizish» asbobini tanlang.','Pastdagi roʻyxatdan modulni tanlang (guruhni bosib oching) yoki «Konstruktor»da oʻzingiz tuzing.','Kerak boʻlsa burilish radiusini va «Bir tomonlama» rejimini tanlang.','Xaritada boshlanish nuqtasini, soʻng burilish nuqtalarini bosing. Qoʻyilgan nuqtalarni sudrab tuzatish mumkin.','Mavjud koʻcha yoki tugunni bossangiz — ulanadi va chorraha hosil boʻladi. Boʻsh joyda tugatish — Enter yoki ikki marta bosish.'])}
  ${sec('Bir tomonlama harakat',['Yangi koʻcha uchun: chizishdan oldin «→ Bir tomonlama» ni tanlang — harakat siz chizgan yoʻnalishda boʻladi.','Mavjud koʻcha uchun: «Tanlash / tahrirlash» → koʻchani bosing → «Harakat» qatoridan tanlang. Sariq strelka oʻq yoʻnalishini koʻrsatadi; teskari kerak boʻlsa «← teskari».'])}
  ${sec('Tahrirlash',['«Tanlash / tahrirlash» bilan koʻchaning istalgan qismini bosing — oʻsha element (boʻlak, trotuar, yashil…) tanlanadi, turini panelda almashtirasiz.','Oq kvadratlar — elementlar chegarasi: sudrab enini oʻzgartirasiz.','«R» doiralar — burilish nuqtalari: sudrang yoki bosib radiusini tanlang; «+» — yangi nuqta; oʻng tugma — nuqtani oʻchirish.','Delete — tanlanganni oʻchirish; Esc — bekor qilish.'])}
  ${sec('Chorraha va aylanma halqa (turbo-halqa ham)',['Koʻchalar ulangan nuqtada chorraha avtomatik paydo boʻladi.','Tugunni bosing: turi — tartibga solinmagan, svetoforli yoki aylanma halqa; bordyur radiusini ham shu yerda berasiz.','Halqa: «Aylanma halqa (7 tur)» asbobini tanlang → panelda turini tanlang (masalan «Turbo-halqa (spiral)») → xaritada chorraha tugunini bosing.','Qoʻyilgan halqani bosib orol radiusi, halqa eni, boʻlaklar soni va turbo spiralining burchagini oʻzgartirasiz.'])}
  ${sec('Piyoda oʻtish joyi, erkin shakl, chiziqlar',['«Piyoda oʻtish joyi»: turini tanlab koʻchaga bosing; keyin sudrab koʻchiring.','«Erkin shakl»: burilish choʻntagi, bekat, kengaytirilgan trotuar, maydon — sirt turini tanlab chegarasini chizing.','«Yoʻl chizigʻi»: 1.1–1.18 chiziqlar, zebra va strelkalarni qoʻlda chizasiz.'])}
  ${sec('Bekat, parklet, veloparkovka, parkovka turlari',['«Bekat / parklet / velo» asbobi: turini tanlang va koʻchaning kerakli tomoniga bosing (bordyur yonidagi yoki choʻntakli bekat, orol platforma, parklet, veloparkovka).','Parkovka turlari: parallel, 30°, 45°, perpendikulyar — modullar roʻyxatida, Konstruktorda («Parkovka turi») yoki koʻcha elementini bosib turini almashtirib.'])}
  ${sec('Nusxa, koʻchirish, oʻchirish',['Obyektni tanlang (koʻcha, shakl, chiziq, belgi).','Ctrl+C — nusxa, Ctrl+V — sichqoncha turgan joyga qoʻyish, Ctrl+D — dublikat, Delete — oʻchirish. Xuddi shu tugmalar panelda va oʻng tugma menyusida bor.','Sariq ✥ belgisini sudrab butun obyektni koʻchirasiz.','Ctrl+Z / Ctrl+Y — orqaga / oldinga.'])}
  ${sec('Fayl, eksport, 3D',['«Fayl» boʻlimi: loyihani .json faylga yoki brauzerga saqlash va ochish.','PNG (masshtab va sunʼiy yoʻldosh fon bilan), SVG (qatlamli vektor), DXF (ArchiCAD/AutoCAD/QGIS — mahalliy yoki UTM 42N koordinatalarda), GeoJSON, hisob-kitob CSV.','«3D koʻrinish» — daraxtlar, mashinalar, bekatlar, belgilar va OSM binolari bilan; u yerdan PNG va OBJ+MTL eksport.'])}
  ${sec('Belgilar va natija',['«Belgilarni avtomatik qoʻyish» — chorraha, halqa, oʻtish joylari va bir tomonlama koʻchalarga belgilar qoʻyadi; «Yoʻl belgilari» asbobida qoʻlda qoʻyasiz.','Pastda loyiha maydonlari (%) va «Mavjud holat bilan solishtirish»; GeoJSON eksport.'])}
  </div></details>`;}

/* =====================================================================
   ORQAGA/OLDINGA, HAR DOIM SUDRALADIGAN NUQTALAR, OʻNG TUGMA MENYUSI
   ===================================================================== */
const HK=['nodes','segs','signs','shapes','lines','nid','sid','sid2','fid'];
const hist={a:[],i:-1,lock:false};
function snapD(){const d=DS(),o={};HK.forEach(k=>o[k]=d[k]);return JSON.stringify(o);}
function pushHist(){if(hist.lock)return;const s=snapD();if(hist.a[hist.i]===s)return;hist.a=hist.a.slice(0,hist.i+1);hist.a.push(s);if(hist.a.length>80)hist.a.shift();hist.i=hist.a.length-1;}
function restoreHist(i){if(i<0||i>=hist.a.length)return false;const o=JSON.parse(hist.a[i]),d=DS();HK.forEach(k=>{if(o[k]===undefined)delete d[k];else d[k]=o[k];});
  d.sel=null;D.start=null;D.pts=[];F.pts=[];hist.i=i;hist.lock=true;afterDesign();hist.lock=false;return true;}
function undo(){if(!restoreHist(hist.i-1))toast('Orqaga qaytadigan qadam yoʻq.');}
function redo(){if(!restoreHist(hist.i+1))toast('Oldinga qadam yoʻq.');}
document.addEventListener('keydown',e=>{if(S.app!=='design'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  const k=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&k==='z'&&!e.shiftKey){e.preventDefault();undo();}else if((e.ctrlKey||e.metaKey)&&(k==='y'||(k==='z'&&e.shiftKey))){e.preventDefault();redo();}});

/* barcha tugunlar har doim sudraladi (chizish va tanlash rejimida) */
function globalHandles(){
  const ds=DS();if(S.app!=='design'||D.start||F.pts.length||!['draw','select','xwalk','round'].includes(ds.tool))return;
  const sel=ds.sel,skip=new Set();
  if(sel&&sel.t==='node')skip.add(sel.id);
  if(sel&&sel.t==='seg'){const sg=segById(sel.id);if(sg){skip.add(sg.a);skip.add(sg.b);}}
  ds.nodes.forEach(n=>{if(skip.has(n.id))return;const k=nodeKind(n);
    const m=L.marker(n.ll,{pane:'designEdit',draggable:true,title:'Sudrab koʻchiring · bosing · oʻng tugma — menyu',icon:L.divIcon({className:'',iconSize:[12,12],iconAnchor:[6,6],
      html:`<div style="width:12px;height:12px;border-radius:50%;background:${k==='round'?'#6f8f4e':k==='sig'?'#e03b2e':'#fff'};border:2px solid #1c2628;cursor:move;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`})}).addTo(editL);
    m.on('drag',e=>{const p=e.target.getLatLng();n.ll=[p.lat,p.lng];coreRender();});
    m.on('dragend',()=>{if(snapEnd(n))toast('Koʻchaga ulandi — chorraha hosil boʻldi.');afterDesign();});
    m.on('click',()=>{if(ds.tool==='select'){ds.sel={t:'node',id:n.id};afterDesign();}else designClick(L.latLng(n.ll[0],n.ll[1]));});
    m.on('contextmenu',e=>{stopE(e);openNodeMenu(e.containerPoint||map.latLngToContainerPoint(n.ll),n);});
  });
  // tanlanmagan koʻchalarning burilish nuqtalari ham sudraladi
  ds.segs.forEach(sg=>{if(sel&&sel.t==='seg'&&sel.id===sg.id)return;sg.pts.forEach((p,i)=>{
    const m=L.marker(p,{pane:'designEdit',draggable:true,title:'Burilish nuqtasi · sudrang · oʻng tugma — menyu',icon:L.divIcon({className:'',iconSize:[10,10],iconAnchor:[5,5],html:'<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:1.5px solid #1c2628;opacity:.85;cursor:move"></div>'})}).addTo(editL);
    m.on('drag',e=>{const q=e.target.getLatLng();sg.pts[i]=[q.lat,q.lng];coreRender();});m.on('dragend',()=>afterDesign());
    m.on('click',()=>{ds.tool='select';ds.sel={t:'seg',id:sg.id,strip:null,v:i};afterDesign();});
    m.on('contextmenu',e=>openVertexMenu(e,sg,i));});});
}
{const _re=renderEditHandles;renderEditHandles=function(){_re();globalHandles();};}

/* oʻng tugma menyusi */
const stopE=e=>{const o=e&&e.originalEvent;if(o){o.preventDefault();o.stopPropagation();}};
const ctxEl=document.getElementById('ctx');
function closeMenu(){ctxEl.hidden=true;}
document.addEventListener('mousedown',e=>{if(!ctxEl.hidden&&!ctxEl.contains(e.target))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
map.on('movestart zoomstart',closeMenu);
function openMenu(pt,items){
  const acts=[];let h='';
  items.forEach(it=>{if(!it)return;if(it==='-'){h+='<hr>';return;}if(it.h){h+=`<div class="ctx-h">${it.h}</div>`;return;}
    if(it.row){h+=`<div class="ctx-row">${it.row.map(([t,f,on])=>{acts.push(f);return `<button data-a="${acts.length-1}" style="${on?'border-color:var(--acc);color:var(--acc)':''}">${t}</button>`;}).join('')}</div>`;return;}
    acts.push(it.f);h+=`<button data-a="${acts.length-1}" class="${it.danger?'danger':''}">${it.t}${it.k?`<span>${it.k}</span>`:''}</button>`;});
  ctxEl.innerHTML=h;ctxEl.hidden=false;
  const W=ctxEl.parentElement.clientWidth,H=ctxEl.parentElement.clientHeight;
  ctxEl.style.left=Math.min(pt.x+4,W-ctxEl.offsetWidth-6)+'px';ctxEl.style.top=Math.min(pt.y+4,Math.max(6,H-ctxEl.offsetHeight-6))+'px';
  ctxEl.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{closeMenu();const f=acts[+b.dataset.a];if(f)f();});
}
const tail=ll=>['-',{t:'Orqaga',k:'Ctrl+Z',f:undo},{t:'Oldinga',k:'Ctrl+Y',f:redo},ll?{t:'Koordinatani nusxalash',f:async()=>{const t=`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;try{await navigator.clipboard.writeText(t);toast('Nusxalandi: '+t);}catch(e){toast(t);}}}:null];
const KN={end:'uch',join:'burilish/ulanish',x:'tartibga solinmagan chorraha',sig:'svetoforli chorraha',round:'aylanma halqa'};
function openNodeMenu(pt,n){const ds=DS(),k=nodeKind(n),set=f=>()=>{f();ds.sel={t:'node',id:n.id};afterDesign();};
  openMenu(pt,[{h:`Tugun · ${KN[k]} · ${degree(n)} yoʻl`},
    {t:'Shu tugundan yangi koʻcha boshlash',f:()=>{ds.tool='draw';D.start=n.id;D.pts=[];afterDesign();}},
    degree(n)===1?{t:'Yonidagi koʻchaga ulash (T-chorraha)',f:()=>{const m2=snapEnd(n);if(m2){ds.sel={t:'node',id:m2.id};toast('Ulandi.');}else toast('Uch boshqa koʻcha ustida emas — uni koʻcha ustiga sudrang.');afterDesign();}}:null,
    '-',{h:'Chorraha turi'},
    {row:[['Avto',set(()=>n.type='auto'),n.type==='auto'],['Tartibga solinmagan',set(()=>n.type='x'),n.type==='x'],['Svetoforli',set(()=>n.type='sig'),n.type==='sig']]},
    {h:'Aylanma halqa'},{row:Object.entries(RTYPES).map(([rk,r])=>[r.n.replace(/ \(.+\)/,''),set(()=>{n.type='round';n.rtype=rk;n.ri=r.ri;n.rw=r.rw;n.lanes=r.lanes;}),n.type==='round'&&n.rtype===rk])},
    (k==='x'||k==='sig')?{h:'Bordyur radiusi'}:null,(k==='x'||k==='sig')?{row:[3,6,10,15,20].map(r=>[r+' m',set(()=>n.kr=r),(n.kr??6)===r])}:null,
    '-',{t:'Tanlash va xususiyatlar',f:set(()=>{})},{t:'Tugunni oʻchirish (ulangan koʻchalar bilan)',danger:1,f:()=>{ds.sel={t:'node',id:n.id};delSel();}},
    ...tail(L.latLng(n.ll[0],n.ll[1]))]);}
function openVertexMenu(e,sg,vi){stopE(e);const ds=DS(),cur=sg.rad&&sg.rad[vi]!=null?sg.rad[vi]:0;
  const setR=r=>()=>{sg.rad=sg.rad||[];while(sg.rad.length<sg.pts.length)sg.rad.push(0);sg.rad[vi]=r;ds.sel={t:'seg',id:sg.id,strip:null,v:vi};afterDesign();};
  openMenu(e.containerPoint,[{h:`Burilish nuqtasi · samarali radius ${f1(effRad(sg,vi))} m`},{row:[0,10,15,25,50,100,200].map(r=>[r?r+' m':'min',setR(r),cur===r])},
    {t:'Shu nuqtada koʻchani boʻlish (tugun qilish)',f:()=>{const ll=sg.pts[vi],n=newNode(ll);sg.pts.splice(vi,1);if(sg.rad)sg.rad.splice(vi,1);splitSegAt(sg,vi,ll,n);ds.sel={t:'node',id:n.id};afterDesign();}},
    {t:'Nuqtani oʻchirish',danger:1,f:()=>{sg.pts.splice(vi,1);if(sg.rad)sg.rad.splice(vi,1);ds.sel={t:'seg',id:sg.id,strip:null};afterDesign();}},...tail(e.latlng)]);}
function openSignMenu(e,sn){stopE(e);const ds=DS(),set=f=>()=>{f();ds.sel={t:'sign',id:sn.id};afterDesign();};
  openMenu(e.containerPoint,[{h:`Belgi ${sn.c} · ${signDef(sn.c)[1]}`},{row:Object.entries(ST_LBL).map(([k,n])=>[n,set(()=>sn.st=k),sn.st===k])},
    {row:[['↺ 45°',set(()=>sn.rot=((sn.rot||0)-45+540)%360-180)],['↻ 45°',set(()=>sn.rot=((sn.rot||0)+45+540)%360-180)],['0°',set(()=>sn.rot=0)]]},
    sn.c==='3.24'?{row:[20,30,40,50,60,70].map(v=>[v+' km/soat',set(()=>sn.val=v),sn.val===v])}:null,
    {t:'Nusxa (yoniga)',f:()=>{ds.signs.push({...sn,id:ds.sid2++,ll:[sn.ll[0]+.00003,sn.ll[1]+.00003],auto:0});afterDesign();}},
    {t:'Oʻchirish',danger:1,f:()=>{ds.sel={t:'sign',id:sn.id};delSel();}},...tail(e.latlng)]);}
const QUICK_PRE=['r2','r4','r4m','r6m','one1','one2','r4b','r4pb','r4bus','r4brt','res','r2rain','ped'];
const QUICK_K=['lane','bus','bike','park','park45','park90','walk','green','median','rain','island','buffer','furn','tram','turn','hatch'];
map.on('contextmenu',e=>{
  if(S.app!=='design'||M.tool)return;
  const ds=DS(),ll=e.latlng,pt=e.containerPoint;
  if(D.start||F.pts.length){const fr=F.pts.length;openMenu(pt,[{h:'Chizish'},{t:'Tugatish',k:'Enter',f:()=>fr?finishFree():finishSeg(null)},{t:'Shu yerga nuqta qoʻshib tugatish',f:()=>{if(fr){F.pts.push([ll.lat,ll.lng]);finishFree();}else{D.pts.push([ll.lat,ll.lng]);finishSeg(null);}}},
    {t:'Oxirgi nuqtani oʻchirish',k:'⌫',f:()=>{fr?F.pts.pop():D.pts.pop();renderDesign();renderHint();}},{t:'Bekor qilish',k:'Esc',danger:1,f:()=>{D.start=null;D.pts=[];F.pts=[];afterDesign();}},...tail(ll)]);return;}
  const h=hitTest(ll);
  if(h&&h.t==='node'){openNodeMenu(pt,nodeById(h.id));return;}
  const hf=hitFree(ll);
  if(hf){const ob=freeObj(hf),isS=hf.t==='shape';const set=f=>()=>{f();ds.sel=hf;afterDesign();};
    openMenu(pt,[{h:isS?`Erkin shakl · ${SHP[ob.k].n}`:`Yoʻl chizigʻi · ${(LNT.find(x=>x[0]===ob.k)||[0,ob.k])[1]}`},
      isS?{row:Object.entries(SHP).map(([k,v])=>[v.n.replace(/ \(.+\)/,''),set(()=>ob.k=k),ob.k===k])}:{row:LNT.map(([k,n])=>[n.split(' ')[0],set(()=>ob.k=k),ob.k===k])},
      {t:'Tanlash va nuqtalarini tahrirlash',f:set(()=>{ds.tool='select';})},
      {t:'Nusxa (5 m siljitib)',f:()=>{const key=isS?'shapes':'lines',c={...ob,id:ds.fid++,pts:ob.pts.map(p=>[p[0]-.000045,p[1]+.00006])};ds[key].push(c);ds.sel={t:hf.t,id:c.id};afterDesign();}},
      {t:'Oʻchirish',danger:1,f:()=>{ds.sel=hf;delSel();}},...tail(ll)]);return;}
  const hs=hitStrip(ll);
  if(hs){const sg=segById(hs.id),lay=layOf(sg),st=lay.st[hs.strip],set=f=>()=>{f();ds.sel={t:'seg',id:sg.id,strip:hs.strip};afterDesign();};
    if(hs.at>=0){const a=sg.att[hs.at];openMenu(pt,[{h:ATT[a.t].n},{row:Object.entries(ATT).map(([k,v])=>[v.n.replace(/ — .+| \(.+\)/,''),()=>{a.t=k;ds.sel={t:'att',id:sg.id,i:hs.at};afterDesign();},a.t===k])},{row:[8,10,15,20,25,30].map(v=>[v+' m',()=>{a.len=v;afterDesign();},a.len===v])},{t:'Boshqa tomonga',f:()=>{a.side=-(a.side||-1);afterDesign();}},{t:'Oʻchirish',danger:1,f:()=>{ds.sel={t:'att',id:sg.id,i:hs.at};delSel();}},...tail(ll)]);return;}
    if(hs.xw>=0){const x=sg.xw[hs.xw];openMenu(pt,[{h:'Piyoda oʻtish joyi'},{row:XWT.map(([k,n])=>[n.replace(/ \(.+\)/,''),()=>{x.type=k;ds.sel={t:'xw',id:sg.id,i:hs.xw};afterDesign();},x.type===k])},
      {row:[3,4,5,6,8].map(w=>[w+' m',()=>{x.w=w;afterDesign();},x.w===w])},{t:'Oʻchirish',danger:1,f:()=>{ds.sel={t:'xw',id:sg.id,i:hs.xw};delSel();}},...tail(ll)]);return;}
    const o=origin(),xy=segXY(sg,o),q=toXY([ll.lat,ll.lng],o),pr=project(xy,q),T=cumLen(xy).pop();
    const tm=trafficMode(sg);
    openMenu(pt,[{h:`${sg.name?sg.name+' · ':''}koʻcha · ${f1(lay.W)} m`},
      {row:[['⇄ Ikki tomonlama',set(()=>setTraffic(sg,'two')),tm==='two'],['→ Bir tomonlama',set(()=>setTraffic(sg,'fwd')),tm==='fwd'],['← Teskari',set(()=>setTraffic(sg,'back')),tm==='back']]},
      {t:'Shu yerga piyoda oʻtish joyi',f:()=>{sg.xw=sg.xw||[];sg.xw.push({f:pr.s/T,w:ds.thr.cw,type:ds.xwType||'zebra'});ds.sel={t:'xw',id:sg.id,i:sg.xw.length-1};afterDesign();}},
      {t:'Shu yerga burilish nuqtasi qoʻshish',f:()=>{const ll2=segLL(sg),Pp=ll2.map(x=>toXY(x,o));let bi=0,bd=1e9;for(let i=0;i<Pp.length-1;i++){const d=project([Pp[i],Pp[i+1]],q).d;if(d<bd){bd=d;bi=i;}}
        sg.pts.splice(bi,0,[ll.lat,ll.lng]);sg.rad=sg.rad||[];while(sg.rad.length<sg.pts.length-1)sg.rad.push(0);sg.rad.splice(bi,0,ds.drawR||0);ds.tool='select';ds.sel={t:'seg',id:sg.id,strip:null,v:bi};afterDesign();}},
      {t:'Shu yerda boʻlish (tugun qoʻshish)',f:()=>{const hh=hitTest(ll);if(hh&&hh.t==='seg'){const n=splitSeg(hh);ds.sel={t:'node',id:n.id};afterDesign();}else toast('Koʻcha oʻqiga yaqinroq bosing.');}},
      {t:'Shu yerdan yangi koʻcha boshlash (ulanadi)',f:()=>{const hh=hitTest(ll);const n=hh&&hh.t==='seg'?splitSeg(hh):newNode([ll.lat,ll.lng]);ds.tool='draw';D.start=n.id;D.pts=[];afterDesign();}},
      {t:'Harakat yoʻnalishini almashtirish (oʻqni teskari)',f:set(()=>{ensureSt(sg);[sg.a,sg.b]=[sg.b,sg.a];sg.pts.reverse();if(sg.rad)sg.rad.reverse();sg.st.reverse();sg.off=-(sg.off||0);[sg.cwA,sg.cwB]=[sg.cwB,sg.cwA];if(sg.xw)sg.xw.forEach(x=>x.f=1-x.f);sg.mk={};})},
      '-',{h:`Element: ${DK[st.k].n} · ${f2(st.w)} m`},
      {row:QUICK_K.map(k=>[DK[k].n.replace(/ \(.+\)|\/.+/,''),set(()=>{ensureSt(sg);const x=sg.st[hs.strip];x[0]=k;if(DK[k].road||k==='bike'){if(!x[2])x[2]=st.mid>0?-1:1;}else x[2]=0;}),st.k===k])},
      {row:[['Eni −0,25',set(()=>{ensureSt(sg);sg.st[hs.strip][1]=Math.max(.3,+(sg.st[hs.strip][1]-.25).toFixed(2));})],['+0,25',set(()=>{ensureSt(sg);sg.st[hs.strip][1]=+(sg.st[hs.strip][1]+.25).toFixed(2);})],
        ['Nusxa',set(()=>{ensureSt(sg);sg.st.splice(hs.strip+1,0,sg.st[hs.strip].slice());})],['Oʻchirish',set(()=>{ensureSt(sg);if(sg.st.length>1)sg.st.splice(hs.strip,1);})]]},
      '-',{h:'Modulni almashtirish'},{row:QUICK_PRE.map(k=>[PRESETS[k].n,()=>{sg.p=k;delete sg.st;delete sg.off;delete sg.mk;ds.sel={t:'seg',id:sg.id,strip:null};afterDesign();},!sg.st&&sg.p===k])},
      '-',{t:'Nusxa olish',k:'Ctrl+C',f:()=>{ds.sel={t:'seg',id:sg.id};copySel();}},{t:'Dublikat',k:'Ctrl+D',f:()=>{ds.sel={t:'seg',id:sg.id};dupSel();}},CB?{t:'Shu yerga qoʻyish',k:'Ctrl+V',f:()=>pasteAt(ll)}:null,
      {t:'Shu yerga obyekt: '+ATT[ds.attType||'bus'].n,f:()=>placeAtt(ll)},{t:'Koʻchani oʻchirish',danger:1,f:()=>{ds.sel={t:'seg',id:sg.id};delSel();}},...tail(ll)]);return;}
  openMenu(pt,[{h:'Xarita'},
    {t:'Shu yerdan koʻcha boshlash',k:PRESETS[ds.preset]?.n||'',f:()=>{ds.tool='draw';const n=newNode([ll.lat,ll.lng]);D.start=n.id;D.pts=[];afterDesign();}},
    {t:'Shu yerdan erkin shakl boshlash',f:()=>{ds.tool='shape';F.pts=[[ll.lat,ll.lng]];afterDesign();}},
    {t:'Shu yerdan yoʻl chizigʻi boshlash',f:()=>{ds.tool='line';F.pts=[[ll.lat,ll.lng]];afterDesign();}},
    {t:`Shu yerga belgi qoʻyish (${ds.signSel||'5.19.1'})`,f:()=>{placeSign(ll);}},
    CB?{t:'Shu yerga qoʻyish (bufer)',k:'Ctrl+V',f:()=>pasteAt(ll)}:null,
    ...tail(ll)]);
});
setTimeout(()=>{pushHist();},0);
/* =====================================================================
   OBYEKTLAR: bekat, parklet, veloparkovka (koʻcha yonida)
   ===================================================================== */
const ATT={bus:{n:'Avtobus bekati — bordyur yonida',len:20},bay:{n:'Avtobus bekati — choʻntakli',len:25},tramstop:{n:'Tramvay/BRT orol platformasi',len:30},
  parklet:{n:'Parklet',len:10},bikepark:{n:'Veloparkovka',len:8}};
function attEdges(lay,side,d){const rd=lay.road.filter(x=>side>0?x.mid>0:x.mid<0);const all=lay.road.length?lay.road:lay.st;
  const curb=rd.length?(side>0?Math.max(...rd.map(x=>x.d1)):Math.min(...rd.map(x=>x.d2))):(side>0?Math.max(...all.map(x=>x.d1)):Math.min(...all.map(x=>x.d2)));
  const edge=side>0?lay.st[0].d1:lay.st[lay.st.length-1].d2;const pk=lay.st.filter(x=>isPk(x.k)&&(side>0?x.mid>0:x.mid<0)).sort((a,b)=>Math.abs(b.mid)-Math.abs(a.mid))[0];return {curb,edge,pk};}
function drawAtts(atts,lay,xy,c,T,band,poly,line,mark,sh,o){
  const P=(s,d)=>{const f=frameAt(xy,c,s);return toLL([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d],o);},AN=s=>{const f=frameAt(xy,c,s);return Math.atan2(f.t[1],f.t[0]);};
  atts.forEach(a=>{const sd=a.side||-1,{curb,edge,pk}=attEdges(lay,sd,0),S0=Math.max(0,a.s-a.len/2),S1=Math.min(T,a.s+a.len/2),out=v=>curb+sd*v;
    const zig=(dIn,dOut)=>{const pts=[];let k=0;for(let s=S0;s<=S1;s+=2,k++)pts.push(P(s,k%2?dOut:dIn));line(pts,{color:'#f2c230',weight:2},'1.17',6);};
    const shelter=(dd,s)=>{poly(band(dd,dd+sd*1.6,s-4,s+4),'#5a6b7a',null,6);sh.push({t:'box',ll:P(s,dd+sd*.8),w:8,d:1.6,h:2.8,col:'#8ea3b5',ang:AN(s),z:0});};
    const pkIn=pk?(Math.abs(pk.d1)<Math.abs(pk.d2)?pk.d1:pk.d2):null;
    if(a.t==='bus'){if(pk){poly(band(pk.d1,pk.d2,S0-5,S1+5),DK.lane.col,'car',3);zig(pkIn+sd*.3,pkIn+sd*1.6);}else zig(curb-sd*.3,curb-sd*1.6);poly(band(curb,out(3),S0,S1),'#cfc2a4','ped',3);shelter(out(1.4),a.s);sh.push({t:'label',ll:P(a.s,curb-sd*1.7),txt:'A',z:8});mark('bekat');}
    if(a.t==='bay'){const dep=3.2,pts=[],pts2=[];for(let s=S0-12;s<=S1+12;s+=1){const k=s<S0?(s-(S0-12))/12:s>S1?1-(s-S1)/12:1;pts.push(P(s,curb));pts2.push(P(s,out(dep*Math.max(0,Math.min(1,k)))));}
      poly([...pts,...pts2.reverse()],DK.lane.col,'car',3.2);if(pk)poly(band(pk.d1,pk.d2,S0-12,S1+12),DK.lane.col,'car',3.1);poly(band(out(dep),out(dep+2.5),S0,S1),'#cfc2a4','ped',3.3);zig(out(.3),out(dep-.3));shelter(out(dep+.8),a.s);sh.push({t:'label',ll:P(a.s,out(dep/2)),txt:'A',z:8});mark('bekat (choʻntak)');}
    if(a.t==='tramstop'){const d0=a.d!=null?a.d:(curb-sd*1.8);poly(band(d0+1.5,d0-1.5,S0,S1),'#cfc2a4','ped',5);line([P(S0,d0+1.5),P(S1,d0+1.5)],{color:'#fff',weight:1.5},null,6);line([P(S0,d0-1.5),P(S1,d0-1.5)],{color:'#fff',weight:1.5},null,6);
      sh.push({t:'box',ll:P(a.s,d0),w:Math.min(12,a.len*.4),d:2,h:3,col:'#8ea3b5',ang:AN(a.s),z:0});mark('orol platforma');}
    if(a.t==='parklet'){const dIn=pk?(Math.abs(pk.d1)<Math.abs(pk.d2)?pk.d1:pk.d2):curb-sd*2.1,dOut=pk?(dIn===pk.d1?pk.d2:pk.d1):curb;
      poly(band(dIn,dOut,S0,S1),'#b08a5a','ped',5);line([P(S0,dIn),P(S1,dIn)],{color:'#7a5a33',weight:2},null,6);
      for(let s=S0+1;s<S1;s+=3)poly(circleLL(toXY(P(s,dIn-sd*.0),o),.45,o,10),'#5e9a4c',null,6);sh.push({t:'box',ll:P(a.s,(dIn+dOut)/2),w:a.len,d:Math.abs(dOut-dIn),h:.3,col:'#b08a5a',ang:AN(a.s),z:0});mark('parklet');}
    if(a.t==='bikepark'){let dA,dB;if(pk){dA=pk.d1;dB=pk.d2;}else{dA=out(.4);dB=out(2.2);}poly(band(dA,dB,S0,S1),'#cfc9bb','ped',5);
      for(let s=S0+.5;s<S1;s+=1){line([P(s,dA),P(s,dB)],{color:'#2f3b44',weight:2},null,6);}mark('veloparkovka');}
  });
}
function placeAtt(ll){const ds=DS(),o=origin(),q=toXY([ll.lat,ll.lng],o);let best=null;
  ds.segs.forEach(sg=>{const xy=segXY(sg,o),c=cumLen(xy),pr=project(xy,q),T=c[c.length-1];if(pr.d<layOf(sg).outer+3&&(!best||pr.d<best.d)){const f=frameAt(xy,c,pr.s),d=(q[0]-f.p[0])*f.n[0]+(q[1]-f.p[1])*f.n[1];best={sg,s:pr.s,T,d,dd:d};}});
  if(!best){toast('Obyektni koʻcha yoniga bosing.');return;}
  const t=ds.attType||'bus',sg=best.sg;sg.att=sg.att||[];const a={t,f:best.s/best.T,side:best.d>=0?1:-1,len:ATT[t].len};if(t==='tramstop')a.d=best.d;
  sg.att.push(a);ds.sel={t:'att',id:sg.id,i:sg.att.length-1};afterDesign();}
function attHTML(sel){const sg=segById(sel.id),a=sg&&sg.att&&sg.att[sel.i];if(!a)return '';
  return `<div class="card" style="padding:10px"><h3>${ATT[a.t].n}</h3><div class="selbox"><select id="atT">${Object.entries(ATT).map(([k,v])=>`<option value="${k}" ${a.t===k?'selected':''}>${v.n}</option>`).join('')}</select>
  <label class="small">Uzunligi, m <input id="atL" type="number" min="4" step="1" value="${a.len}" style="width:60px"></label><button class="btn sm" id="atS">Boshqa tomonga</button><button class="btn sm" id="dDel" style="color:var(--bad)">Oʻchirish</button></div>
  <p class="small" style="margin:6px 0 0">Sariq doirani sudrab koʻcha boʻylab koʻchiring. Bekat atrofida parkovka avtomatik olib tashlanadi.</p></div>`;}

/* =====================================================================
   NUSXA / QOʻYISH / KOʻCHIRISH
   ===================================================================== */
let CB=null,lastMouse=null;
map.on('mousemove',e=>{lastMouse=e.latlng;});
const shiftLL=(p,dLat,dLng)=>[p[0]+dLat,p[1]+dLng];
function selObjCenter(sel){const ds=DS();
  if(sel.t==='seg'){const sg=segById(sel.id);const l=segLL(sg);return l.reduce((a,p)=>[a[0]+p[0]/l.length,a[1]+p[1]/l.length],[0,0]);}
  if(sel.t==='shape'||sel.t==='line'){const ob=freeObj(sel);return ob.pts.reduce((a,p)=>[a[0]+p[0]/ob.pts.length,a[1]+p[1]/ob.pts.length],[0,0]);}
  if(sel.t==='sign')return signById(sel.id).ll;return null;}
function copySel(){const ds=DS(),sel=ds.sel;if(!sel){toast('Avval obyektni tanlang.');return false;}
  if(sel.t==='seg'){const sg=segById(sel.id);CB={t:'seg',sg:clone(sg),a:nodeById(sg.a).ll,b:nodeById(sg.b).ll,c:selObjCenter(sel)};}
  else if(sel.t==='shape'||sel.t==='line'){CB={t:sel.t,ob:clone(freeObj(sel)),c:selObjCenter(sel)};}
  else if(sel.t==='sign'){CB={t:'sign',ob:clone(signById(sel.id)),c:signById(sel.id).ll};}
  else{toast('Bu obyektni nusxalab boʻlmaydi — koʻcha, shakl, chiziq yoki belgini tanlang.');return false;}
  toast('Nusxa olindi. Ctrl+V — sichqoncha turgan joyga qoʻyish.');return true;}
function pasteAt(ll){const ds=DS();if(!CB){toast('Bufer boʻsh — avval Ctrl+C.');return;}
  const tgt=ll?[ll.lat,ll.lng]:[CB.c[0]+.00006,CB.c[1]+.00008],dLat=tgt[0]-CB.c[0],dLng=tgt[1]-CB.c[1],mv=p=>shiftLL(p,dLat,dLng);
  if(CB.t==='seg'){const a=newNode(mv(CB.a)),b=newNode(mv(CB.b)),sg={...clone(CB.sg),id:ds.sid++,a:a.id,b:b.id,pts:CB.sg.pts.map(mv)};ds.segs.push(sg);ds.sel={t:'seg',id:sg.id,strip:null};}
  if(CB.t==='shape'||CB.t==='line'){ds.fid=ds.fid||1;const key=CB.t==='shape'?'shapes':'lines';ds[key]=ds[key]||[];const ob={...clone(CB.ob),id:ds.fid++,pts:CB.ob.pts.map(mv)};ds[key].push(ob);ds.sel={t:CB.t,id:ob.id};}
  if(CB.t==='sign'){ds.signs=ds.signs||[];ds.sid2=ds.sid2||1;const ob={...clone(CB.ob),id:ds.sid2++,ll:mv(CB.ob.ll),auto:0};ds.signs.push(ob);ds.sel={t:'sign',id:ob.id};}
  afterDesign();}
function dupSel(){if(copySel())pasteAt(null);}
function moveHandle(){const ds=DS(),sel=ds.sel;if(!sel||!['seg','shape','line'].includes(sel.t))return;const c0=selObjCenter(sel);if(!c0)return;
  let last=c0;const m=L.marker(c0,{pane:'designEdit',draggable:true,title:'Butun obyektni sudrab koʻchiring',icon:L.divIcon({className:'',iconSize:[24,24],iconAnchor:[12,12],
    html:'<div style="width:24px;height:24px;border-radius:50%;background:#f4c542;border:2px solid #1c2628;display:flex;align-items:center;justify-content:center;cursor:move;box-shadow:0 1px 4px rgba(0,0,0,.4)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1v14M1 8h14M8 1l-2.5 2.5M8 1l2.5 2.5M8 15l-2.5-2.5M8 15l2.5-2.5M1 8l2.5-2.5M1 8l2.5 2.5M15 8l-2.5-2.5M15 8l-2.5 2.5" stroke="#1c2628" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></div>'})}).addTo(editL);
  m.on('drag',e=>{const g=e.target.getLatLng(),dLat=g.lat-last[0],dLng=g.lng-last[1];last=[g.lat,g.lng];const mv=p=>shiftLL(p,dLat,dLng);
    if(sel.t==='seg'){const sg=segById(sel.id);sg.pts=sg.pts.map(mv);[sg.a,sg.b].forEach(id=>{const n=nodeById(id);n.ll=mv(n.ll);});}
    else{const ob=freeObj(sel);ob.pts=ob.pts.map(mv);}coreRender();});
  m.on('dragend',()=>afterDesign());}
{const _re=renderEditHandles;renderEditHandles=function(){_re();moveHandle();attHandle();};}
function attHandle(){const ds=DS(),sel=ds.sel;if(!sel||sel.t!=='att')return;const sg=segById(sel.id),a=sg&&sg.att&&sg.att[sel.i];if(!a)return;
  const o=origin(),xy=segXY(sg,o),c=cumLen(xy),T=c[c.length-1];
  const m=L.marker(toLL(pointAt(xy,c,a.f*T),o),{pane:'designEdit',draggable:true,icon:handleIcon('c','#f4c542'),title:'Koʻcha boʻylab sudrang'}).addTo(editL);
  m.on('drag',e=>{const g=e.target.getLatLng(),pr=project(xy,toXY([g.lat,g.lng],o));a.f=Math.max(.02,Math.min(.98,pr.s/T));e.target.setLatLng(toLL(pointAt(xy,c,a.f*T),o));coreRender();});
  m.on('dragend',()=>afterDesign());}
document.addEventListener('keydown',e=>{if(S.app!=='design'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='c'){e.preventDefault();copySel();}
  else if((e.ctrlKey||e.metaKey)&&k==='v'){e.preventDefault();pasteAt(lastMouse);}
  else if((e.ctrlKey||e.metaKey)&&k==='d'){e.preventDefault();dupSel();}});
function selBarHTML(){const sel=DS().sel;if(!sel||!['seg','shape','line','sign','att','xw','node'].includes(sel.t))return '';const cp=['seg','shape','line','sign'].includes(sel.t);
  return `<div class="tools" style="padding:6px 8px;background:var(--panel2);border-radius:8px">${cp?`<button class="btn sm" id="sbC" title="Ctrl+C">Nusxa olish</button><button class="btn sm" id="sbV" title="Ctrl+V — sichqoncha turgan joyga" ${CB?'':'disabled'}>Qoʻyish</button><button class="btn sm" id="sbD" title="Ctrl+D">Dublikat</button>`:''}<button class="btn sm" id="sbX" style="color:var(--bad)" title="Delete">Oʻchirish</button>${cp&&sel.t!=='sign'?'<span class="small">Sariq ✥ belgisini sudrab butun obyektni koʻchiring.</span>':''}</div>`;}

/* =====================================================================
   FAYL: saqlash, ochish, brauzerdagi saqlanganlar
   ===================================================================== */
const projName=()=>(DS().name||S.site?.name||'loyiha').trim();
const fslug=()=>projName().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').toLowerCase()||'loyiha';
function saveProjectFile(){dl(`${fslug()}.kps.json`,JSON.stringify(Object.assign({format:'kocha-profili-studiyasi/2',saved:new Date().toISOString()},S)),'application/json');}
function readSaves(){try{return JSON.parse(localStorage.getItem('kps_saves')||'{}');}catch(e){return {};}}
function saveInBrowser(){const all=readSaves(),n=projName();all[n]={t:new Date().toISOString(),d:JSON.stringify(S)};try{localStorage.setItem('kps_saves',JSON.stringify(all));toast(`«${n}» brauzerda saqlandi.`);}catch(e){toast('Brauzer xotirasi toʻldi — faylga saqlang.');}renderDesignPanel();}
function loadState(j){S=Object.assign(sample(),j);if(!S.design)S.design=sample().design;_id=Math.max(0,...S.prof.ex.map(e=>e.id),...S.prof.pr.map(e=>e.id));hist.a=[];hist.i=-1;renderAll();setApp(S.app||'design');pushHist();
  const n=S.design.nodes[0];if(n)map.setView(n.ll,17);else if(S.site?.center)map.setView(S.site.center,17);}
function fileHTML(){const saves=readSaves(),keys=Object.keys(saves).sort((a,b)=>saves[b].t.localeCompare(saves[a].t));
  return `<details class="card" style="padding:10px" ${DS().fileOpen?'open':''} id="fileBox"><summary>Fayl: saqlash, ochish, eksport</summary>
  <div class="field" style="margin-top:8px"><label for="pName">Loyiha nomi</label><input id="pName" value="${projName().replace(/"/g,'&quot;')}"></div>
  <div class="pal-h" style="margin-top:10px">Loyiha</div><div class="tools"><button class="btn sm primary" id="fSave">Faylga saqlash (.json)</button><label class="btn sm" for="fOpen">Fayldan ochish…</label><input id="fOpen" type="file" accept=".json" hidden><button class="btn sm" id="fBrow">Brauzerda saqlash</button></div>
  ${keys.length?`<div style="margin-top:6px;display:grid;gap:4px">${keys.map(k=>`<div style="display:flex;gap:6px;align-items:center;font-size:12px"><span style="flex:1">${k} <span class="small">${saves[k].t.slice(0,16).replace('T',' ')}</span></span><button class="btn sm" data-lo="${k.replace(/"/g,'&quot;')}">Ochish</button><button class="btn sm" data-rm="${k.replace(/"/g,'&quot;')}" style="color:var(--bad)">✕</button></div>`).join('')}</div>`:''}
  <div class="pal-h" style="margin-top:10px">Rasm</div><div class="tools"><select id="eScale" class="btn sm">${[[2,'2 px/m'],[4,'4 px/m'],[8,'8 px/m (yuqori)'],[12,'12 px/m']].map(([v,n])=>`<option value="${v}" ${v===4?'selected':''}>${n}</option>`).join('')}</select>
    <label class="small"><input type="checkbox" id="eSat" checked> Sunʼiy yoʻldosh fonda</label><button class="btn sm" id="ePng">PNG</button><button class="btn sm" id="eSvg">SVG (vektor, qatlamli)</button></div>
  <div class="pal-h" style="margin-top:10px">CAD / GIS (ArchiCAD, AutoCAD, QGIS)</div><div class="tools"><select id="eCrs" class="btn sm"><option value="local">Mahalliy koordinata (0,0 — birinchi tugun), metr</option><option value="utm">UTM WGS84 (Toshkent — 42N), metr</option></select>
    <button class="btn sm" id="eDxf">DXF (qatlamlar bilan)</button><button class="btn sm" id="dGeo2">GeoJSON</button><button class="btn sm" id="eCsv">Hisob-kitob (.csv)</button></div>
  <p class="small" style="margin:6px 0 0">ArchiCAD: <i>Fayl → Qoʻshimcha fayl → DXF/DWG</i> orqali; qatlamlar (ROAD, SIDEWALK, GREEN, MARKINGS, SIGNS…) saqlanadi. 3D model — «3D koʻrinish»dan OBJ.</p></details>`;}
function bindFile(el){const q=s=>el.querySelector(s),ds=DS();if(!q('#fileBox'))return;
  q('#fileBox').addEventListener('toggle',()=>{ds.fileOpen=q('#fileBox').open;save();});
  q('#pName').onchange=e=>{ds.name=e.target.value.trim();save();};
  q('#fSave').onclick=saveProjectFile;q('#fBrow').onclick=saveInBrowser;
  q('#fOpen').onchange=ev=>{const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!j.prof&&!j.design)throw 0;loadState(j);toast('Loyiha ochildi.');}catch(e){toast('Fayl oʻqilmadi: bu Koʻcha Profili Studiyasi loyihasi emas.');}};r.readAsText(f);ev.target.value='';};
  el.querySelectorAll('[data-lo]').forEach(b=>b.onclick=()=>{const v=readSaves()[b.dataset.lo];if(v){loadState(JSON.parse(v.d));toast(`«${b.dataset.lo}» ochildi.`);}});
  el.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const all=readSaves();delete all[b.dataset.rm];try{localStorage.setItem('kps_saves',JSON.stringify(all));}catch(e){}renderDesignPanel();});
  q('#ePng').onclick=()=>exportPNG(+q('#eScale').value,q('#eSat').checked);q('#eSvg').onclick=()=>exportSVG(q('#eSat').checked);
  q('#eDxf').onclick=()=>exportDXF(q('#eCrs').value);q('#eCsv').onclick=exportCSV;q('#dGeo2').onclick=()=>{const b=document.getElementById('dGeo');if(b)b.click();};}

/* =====================================================================
   EKSPORT: PNG, SVG, DXF, CSV
   ===================================================================== */
function exportGeom(){const {sh,marks}=buildShapes(),o=origin(),signs=(DS().signs||[]).filter(x=>x.st!=='remove'||true);
  const items=sh.filter(x=>x.t==='poly'||x.t==='line'||x.t==='label').sort((a,b)=>a.z-b.z).map(x=>({...x,xy:x.t==='label'?[toXY(x.ll,o)]:x.ll.map(q=>toXY(q,o))}));
  const pts=items.flatMap(x=>x.xy).concat(signs.map(s=>toXY(s.ll,o)));if(!pts.length)return null;
  const bb=pts.reduce((a,p)=>[Math.min(a[0],p[0]),Math.min(a[1],p[1]),Math.max(a[2],p[0]),Math.max(a[3],p[1])],[1e9,1e9,-1e9,-1e9]);
  const pad=15;bb[0]-=pad;bb[1]-=pad;bb[2]+=pad;bb[3]+=pad;return {items,signs,marks,bb,o,sh};}
const dashM=d=>d?d.split(' ').map(v=>+v*.3):null,widthM=w=>Math.max(.08,(w||1.5)*.075);
async function signImg(code,val){return new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(signSVG(code,val).replace('<svg ','<svg width="100" height="100" '));});}
async function satForBBox(g){const o=g.o,sw=toLL([g.bb[0],g.bb[1]],o),ne=toLL([g.bb[2],g.bb[3]],o),bb={s:sw[0],w:sw[1],n:ne[0],e:ne[1]};
  const side=Math.max(g.bb[2]-g.bb[0],g.bb[3]-g.bb[1]);const z=side<500?19:side<1000?18:side<2500?17:16;
  try{const im=await loadImagery(bb,z);return {im,z,bb};}catch(e){return null;}}
async function exportPNG(ppm,withSat){const g=exportGeom();if(!g){toast('Loyiha boʻsh.');return;}toast('PNG tayyorlanmoqda…');
  let W=(g.bb[2]-g.bb[0])*ppm,H=(g.bb[3]-g.bb[1])*ppm;const k=Math.min(1,8000/Math.max(W,H));ppm*=k;W=Math.round(W*k);H=Math.round(H*k);
  const cv=document.createElement('canvas');cv.width=W;cv.height=H+60;const x=cv.getContext('2d');x.fillStyle='#ece7dc';x.fillRect(0,0,W,H+60);
  const X=p=>[(p[0]-g.bb[0])*ppm,(g.bb[3]-p[1])*ppm];
  if(withSat){const s=await satForBBox(g);if(s){const {im,z,bb}=s;const p0=X(toXY([bb.n,bb.w],g.o)),p1=X(toXY([bb.s,bb.e],g.o));
    const sx=gxf(bb.w,z)-im.ox,sy=gyf(bb.n,z)-im.oy,sw=gxf(bb.e,z)-gxf(bb.w,z),shh=gyf(bb.s,z)-gyf(bb.n,z);x.drawImage(im.cv,sx,sy,sw,shh,p0[0],p0[1],p1[0]-p0[0],p1[1]-p0[1]);}}
  g.items.forEach(it=>{if(it.t==='poly'){x.fillStyle=it.col;x.beginPath();it.xy.forEach((p,i)=>{const q=X(p);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.closePath();x.fill();}
    else if(it.t==='line'){x.strokeStyle=it.opt.color;x.lineWidth=widthM(it.opt.weight)*ppm;x.setLineDash((dashM(it.opt.dashArray)||[]).map(v=>v*ppm));x.beginPath();it.xy.forEach((p,i)=>{const q=X(p);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.stroke();}
    else{const q=X(it.xy[0]);x.fillStyle='#fff';x.font=`700 ${Math.max(9,1.6*ppm)}px Arial`;x.textAlign='center';x.fillText(it.txt,q[0],q[1]+.6*ppm);}});
  x.setLineDash([]);
  const cache={};for(const sn of g.signs){const key=sn.c+'|'+(sn.val||'');if(!(key in cache))cache[key]=await signImg(sn.c,sn.val);const im=cache[key];if(!im)continue;const q=X(toXY(sn.ll,g.o)),sz=Math.max(12,2.6*ppm);
    x.save();x.translate(q[0],q[1]);x.rotate((sn.rot||0)*Math.PI/180);x.globalAlpha=sn.st==='remove'?.45:1;x.drawImage(im,-sz/2,-sz/2,sz,sz);x.restore();
    if(sn.st==='remove'){x.strokeStyle='#d01c2a';x.lineWidth=2;x.beginPath();x.moveTo(q[0]-sz/2,q[1]-sz/2);x.lineTo(q[0]+sz/2,q[1]+sz/2);x.moveTo(q[0]+sz/2,q[1]-sz/2);x.lineTo(q[0]-sz/2,q[1]+sz/2);x.stroke();}}
  // sarlavha, masshtab, shimol
  x.fillStyle='#fff';x.fillRect(0,H,W,60);x.fillStyle='#1c2628';x.font='600 16px Arial';x.textAlign='left';x.fillText(projName(),16,H+26);x.font='12px Arial';x.fillText(`Koʻcha Profili Studiyasi · ${new Date().toLocaleDateString('ru-RU')} · 1 m = ${f1(ppm)} px`,16,H+46);
  const sb=[10,20,50,100,200].find(v=>v*ppm>80)||200;x.fillRect(W-40-sb*ppm,H+30,sb*ppm,6);x.textAlign='right';x.fillText(sb+' m',W-40,H+24);
  x.beginPath();x.moveTo(W-20,H+12);x.lineTo(W-26,H+32);x.lineTo(W-14,H+32);x.closePath();x.fill();x.fillText('N',W-15,H+48);
  cv.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${fslug()}.png`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);},'image/png');}
async function exportSVG(withSat){const g=exportGeom();if(!g){toast('Loyiha boʻsh.');return;}
  const W=g.bb[2]-g.bb[0],H=g.bb[3]-g.bb[1],X=p=>`${(p[0]-g.bb[0]).toFixed(2)},${(g.bb[3]-p[1]).toFixed(2)}`;
  const LAY={car:'Avto_yol',pt:'Jamoat_transporti',bike:'Velo',ped:'Piyoda',green:'Yashil'};const groups={};
  const add=(k,s)=>{(groups[k]=groups[k]||[]).push(s);};
  g.items.forEach(it=>{if(it.t==='poly')add(it.cat?LAY[it.cat]:'Chiziqlar_va_belgilar',`<polygon points="${it.xy.map(X).join(' ')}" fill="${it.col}"/>`);
    else if(it.t==='line')add('Chiziqlar_va_belgilar',`<polyline points="${it.xy.map(X).join(' ')}" fill="none" stroke="${it.opt.color}" stroke-width="${widthM(it.opt.weight).toFixed(2)}"${it.opt.dashArray?` stroke-dasharray="${dashM(it.opt.dashArray).join(' ')}"`:''}/>`);
    else add('Chiziqlar_va_belgilar',`<text x="${X(it.xy[0]).split(',')[0]}" y="${+X(it.xy[0]).split(',')[1]+.6}" font-size="1.6" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">${it.txt}</text>`);});
  g.signs.forEach(sn=>{const [px,py]=X(toXY(sn.ll,g.o)).split(',').map(Number),sz=2.6;add('Yol_belgilari',`<g transform="translate(${px} ${py}) rotate(${sn.rot||0})"${sn.st==='remove'?' opacity=".45"':''}><title>${sn.c} ${signDef(sn.c)[1]} (${ST_LBL[sn.st]})</title>${signSVG(sn.c,sn.val).replace('<svg ',`<svg x="${-sz/2}" y="${-sz/2}" width="${sz}" height="${sz}" `).replace(/ style="[^"]*"/,'')}</g>`);});
  let bg='';if(withSat){const s=await satForBBox(g);if(s){const {im,z,bb}=s;const c2=document.createElement('canvas'),sw=gxf(bb.e,z)-gxf(bb.w,z),shh=gyf(bb.s,z)-gyf(bb.n,z);c2.width=Math.round(sw);c2.height=Math.round(shh);c2.getContext('2d').drawImage(im.cv,gxf(bb.w,z)-im.ox,gyf(bb.n,z)-im.oy,sw,shh,0,0,c2.width,c2.height);
    const p0=X(toXY([bb.n,bb.w],g.o)).split(',').map(Number),p1=X(toXY([bb.s,bb.e],g.o)).split(',').map(Number);bg=`<g id="Sunʼiy_yoʻldosh" inkscape:groupmode="layer" inkscape:label="Sunʼiy yoʻldosh"><image x="${p0[0]}" y="${p0[1]}" width="${p1[0]-p0[0]}" height="${p1[1]-p0[1]}" href="${c2.toDataURL('image/jpeg',.85)}"/></g>`;}}
  const order=['Piyoda','Yashil','Avto_yol','Jamoat_transporti','Velo','Chiziqlar_va_belgilar','Yol_belgilari'];
  const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${W.toFixed(1)}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}">\n<!-- ${projName()} · 1 birlik = 1 m (1:1000 da mm) · Koʻcha Profili Studiyasi -->\n<rect width="100%" height="100%" fill="#ece7dc"/>${bg}\n`+
    order.filter(k=>groups[k]).map(k=>`<g id="${k}" inkscape:groupmode="layer" inkscape:label="${k.replace(/_/g,' ')}">\n${groups[k].join('\n')}\n</g>`).join('\n')+'\n</svg>';
  dl(`${fslug()}.svg`,svg,'image/svg+xml');}
/* UTM (WGS84) */
function toUTM(lat,lon){const a=6378137,f=1/298.257223563,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2),zone=Math.floor((lon+180)/6)+1,lon0=((zone-1)*6-180+3)*R,ph=lat*R,la=lon*R;
  const N=a/Math.sqrt(1-e2*Math.sin(ph)**2),T=Math.tan(ph)**2,C=ep2*Math.cos(ph)**2,A2=Math.cos(ph)*(la-lon0);
  const M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*ph-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*ph)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*ph)-(35*e2**3/3072)*Math.sin(6*ph));
  const E=k0*N*(A2+(1-T+C)*A2**3/6+(5-18*T+T*T+72*C-58*ep2)*A2**5/120)+500000;
  let Nn=k0*(M+N*Math.tan(ph)*(A2*A2/2+(5-T+9*C+4*C*C)*A2**4/24+(61-58*T+T*T+600*C-330*ep2)*A2**6/720));if(lat<0)Nn+=1e7;return {E,N:Nn,zone};}
function exportDXF(crs){const g=exportGeom();if(!g){toast('Loyiha boʻsh.');return;}
  const tr=crs==='utm'?(p=>{const ll=toLL(p,g.o),u=toUTM(ll[0],ll[1]);return [u.E,u.N];}):(p=>p);
  const LY={car:['ROAD',8],pt:['TRANSIT',1],bike:['BIKE',3],ped:['SIDEWALK',41],green:['GREEN',94],null:['MARKINGS',7]};
  const layers=[['ROAD',8],['TRANSIT',1],['BIKE',3],['SIDEWALK',41],['GREEN',94],['MARKINGS',7],['SIGNS',5],['AXIS',6],['NODES',2],['INFO',7]];
  const out=[];const w=(c,v)=>out.push(c,v);const f=v=>(+v).toFixed(3);
  w(0,'SECTION');w(2,'HEADER');w(9,'$ACADVER');w(1,'AC1009');w(9,'$INSUNITS');w(70,6);w(0,'ENDSEC');
  w(0,'SECTION');w(2,'TABLES');w(0,'TABLE');w(2,'LAYER');w(70,layers.length);layers.forEach(([n,c])=>{w(0,'LAYER');w(2,n);w(70,0);w(62,c);w(6,'CONTINUOUS');});w(0,'ENDTAB');w(0,'ENDSEC');
  w(0,'SECTION');w(2,'ENTITIES');
  const pl=(pts,layer,closed)=>{w(0,'POLYLINE');w(8,layer);w(66,1);w(70,closed?1:0);w(10,0);w(20,0);w(30,0);pts.forEach(p=>{const q=tr(p);w(0,'VERTEX');w(8,layer);w(10,f(q[0]));w(20,f(q[1]));w(30,0);});w(0,'SEQEND');w(8,layer);};
  const txt=(p,h,s,layer)=>{const q=tr(p);w(0,'TEXT');w(8,layer);w(10,f(q[0]));w(20,f(q[1]));w(30,0);w(40,h);w(1,s);};
  g.items.forEach(it=>{if(it.t==='poly')pl(it.xy,(LY[it.cat]||LY.null)[0],true);else if(it.t==='line')pl(it.xy,'MARKINGS',false);else txt(it.xy[0],1.2,it.txt,'MARKINGS');});
  DS().segs.forEach(sg=>{pl(segXY(sg,g.o),'AXIS',false);});
  DS().nodes.forEach(n=>{const q=tr(toXY(n.ll,g.o));w(0,'CIRCLE');w(8,'NODES');w(10,f(q[0]));w(20,f(q[1]));w(30,0);w(40,.5);});
  g.signs.forEach(sn=>{const p=toXY(sn.ll,g.o),q=tr(p);w(0,'CIRCLE');w(8,'SIGNS');w(10,f(q[0]));w(20,f(q[1]));w(30,0);w(40,.4);txt([p[0]+.6,p[1]+.3],.8,`${sn.c}${sn.val?' ['+sn.val+']':''} ${sn.st==='exist'?'(M)':sn.st==='remove'?'(X)':''}`.trim(),'SIGNS');});
  const u=toUTM(g.o[0],g.o[1]);txt([g.bb[0],g.bb[1]-3],1.5,`${projName()} | ${crs==='utm'?'UTM WGS84 zona '+u.zone+'N':'mahalliy koordinata: 0,0 = '+g.o[0].toFixed(6)+', '+g.o[1].toFixed(6)+' (WGS84)'} | metr`,'INFO');
  w(0,'ENDSEC');w(0,'EOF');
  dl(`${fslug()}${crs==='utm'?'-utm':''}.dxf`,out.join('\r\n')+'\r\n','application/dxf');toast(crs==='utm'?`DXF: UTM zona ${u.zone}N koordinatalarida.`:'DXF: mahalliy koordinatalarda (metr).');}
function exportCSV(){const ds=DS(),o=origin(),st=designStats(),{marks}=buildShapes(),rows=[];const r=(...a)=>rows.push(a.join(';'));
  r('Koʻcha Profili Studiyasi',projName(),new Date().toLocaleDateString('ru-RU'));r('');
  r('MAYDONLAR','m2','%');if(st&&st.tot)Object.entries(DCAT).forEach(([k,[n]])=>r(n,Math.round(st.cnt[k]/st.tot*st.m2),(st.cnt[k]/st.tot*100).toFixed(1)));r('Jami',st?Math.round(st.m2):0,100);r('');
  r('KOʻCHALAR','Modul','Uzunlik, m','Eni, m','Boʻlaklar','Harakat','Oʻtish joylari','Obyektlar');
  ds.segs.forEach((sg,i)=>{const lay=layOf(sg);r(sg.name||('Koʻcha '+(i+1)),sg.st?'Tahrirlangan':(PRESETS[sg.p]?.n||sg.p),lineLen(segLL(sg)).toFixed(1),lay.W.toFixed(2),lay.lanes,{two:'ikki tomonlama',fwd:'bir tomonlama',back:'bir tomonlama'}[trafficMode(sg)]||'-',(sg.xw||[]).length,(sg.att||[]).map(a=>ATT[a.t].n).join(', '));});r('');
  r('TUGUNLAR','Turi','Yoʻllar');ds.nodes.filter(n=>isInter(nodeKind(n))).forEach(n=>r(`${n.ll[0].toFixed(6)}, ${n.ll[1].toFixed(6)}`,KN[nodeKind(n)]+(n.type==='round'?' — '+RTYPES[n.rtype||'r2'].n:''),degree(n)));r('');
  r('YOʻL CHIZIQLARI VA OBYEKTLAR','Soni');Object.entries(marks).forEach(([k,v])=>r(k,v));r('');
  r('YOʻL BELGILARI','Nomi','Mavjud','Yangi','Olib tashlanadi');const sg2={};(ds.signs||[]).forEach(x=>{sg2[x.c]=sg2[x.c]||{exist:0,new:0,remove:0};sg2[x.c][x.st]++;});Object.entries(sg2).forEach(([c,v])=>r(c,signDef(c)[1],v.exist,v.new,v.remove));
  dl(`${fslug()}-hisob.csv`,'﻿'+rows.join('\n'),'text/csv');}
/* =====================================================================
   3D KOʻRINISH (three.js) va OBJ/MTL eksport
   ===================================================================== */
function loadScript(src){return new Promise((res,rej)=>{if([...document.scripts].some(s=>s.src===src)){res();return;}const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('yuklanmadi: '+src));document.head.appendChild(s);});}
let V3=null;
async function open3D(){
  const g=exportGeom();if(!g){toast('Loyiha boʻsh — avval koʻcha chizing.');return;}
  let ov=document.getElementById('v3d');
  if(!ov){ov=document.createElement('div');ov.id='v3d';ov.style.cssText='position:fixed;inset:0;z-index:3000;background:#c9d3d8;display:flex;flex-direction:column';
    ov.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:var(--panel);border-bottom:1px solid var(--line)">
      <b style="margin-right:8px">3D koʻrinish</b><span class="small" id="v3i">Yuklanmoqda…</span><span style="flex:1"></span>
      <label class="small"><input type="checkbox" id="v3sat" checked> Sunʼiy yoʻldosh</label><button class="btn sm" id="v3b">Binolar (OSM)</button><button class="btn sm" id="v3p">PNG</button>
      <button class="btn sm" id="v3o">OBJ + MTL (ArchiCAD, SketchUp, Blender)</button><button class="btn sm primary" id="v3x">Yopish (Esc)</button></div><div id="v3c" style="flex:1;position:relative"></div>`;
    document.body.appendChild(ov);}
  ov.hidden=false;const info=ov.querySelector('#v3i');
  try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');}
  catch(e){info.textContent='3D kutubxonasi yuklanmadi — internet aloqasini tekshiring.';return;}
  if(V3){V3.stop();}
  const host=ov.querySelector('#v3c');host.innerHTML='';
  const W=host.clientWidth,H=host.clientHeight,TH=THREE;
  const ren=new TH.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setPixelRatio(Math.min(2,devicePixelRatio));ren.setSize(W,H);ren.shadowMap.enabled=true;host.appendChild(ren.domElement);
  const scene=new TH.Scene();scene.background=new TH.Color('#cfdbe3');scene.fog=new TH.Fog('#cfdbe3',600,2500);
  const cx=(g.bb[0]+g.bb[2])/2,cy=(g.bb[1]+g.bb[3])/2,span=Math.max(g.bb[2]-g.bb[0],g.bb[3]-g.bb[1]);
  const cam=new TH.PerspectiveCamera(45,W/H,.3,6000);cam.position.set(cx+span*.35,span*.55,-(cy)+span*.75);
  const ctl=new TH.OrbitControls(cam,ren.domElement);ctl.target.set(cx,0,-cy);ctl.maxPolarAngle=Math.PI/2.05;ctl.enableDamping=true;ctl.update();
  scene.add(new TH.HemisphereLight('#ffffff','#8a8272',.75));const sun=new TH.DirectionalLight('#fff6e8',.85);sun.position.set(cx-span*.4,span*.9,-cy+span*.5);sun.target.position.set(cx,0,-cy);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-span*.8;sc.right=span*.8;sc.top=span*.8;sc.bottom=-span*.8;sc.far=span*4;scene.add(sun,sun.target);
  const model=new TH.Group();model.name='loyiha';scene.add(model);
  const mats={};const mat=(col,opt={})=>{const k=col+JSON.stringify(opt);return mats[k]||(mats[k]=new TH.MeshLambertMaterial(Object.assign({color:col},opt)));};
  // yer
  const gw=(g.bb[2]-g.bb[0])+80,gh=(g.bb[3]-g.bb[1])+80;const ground=new TH.Mesh(new TH.PlaneGeometry(gw,gh),mat('#d8d1c1'));ground.rotation.x=-Math.PI/2;ground.position.set(cx,-.02,-cy);ground.receiveShadow=true;ground.name='yer';scene.add(ground);
  (async()=>{const s=await satForBBox({...g,bb:[g.bb[0]-40,g.bb[1]-40,g.bb[2]+40,g.bb[3]+40]});if(!s)return;const {im,z,bb}=s,c2=document.createElement('canvas'),sw=gxf(bb.e,z)-gxf(bb.w,z),shh=gyf(bb.s,z)-gyf(bb.n,z);
    c2.width=Math.round(sw);c2.height=Math.round(shh);c2.getContext('2d').drawImage(im.cv,gxf(bb.w,z)-im.ox,gyf(bb.n,z)-im.oy,sw,shh,0,0,c2.width,c2.height);
    const tex=new TH.CanvasTexture(c2);const p0=toXY([bb.n,bb.w],g.o),p1=toXY([bb.s,bb.e],g.o);const sat=new TH.Mesh(new TH.PlaneGeometry(p1[0]-p0[0],p0[1]-p1[1]),new TH.MeshBasicMaterial({map:tex}));
    sat.rotation.x=-Math.PI/2;sat.position.set((p0[0]+p1[0])/2,-.01,-(p0[1]+p1[1])/2);sat.name='sputnik';scene.add(sat);ground.visible=false;
    ov.querySelector('#v3sat').onchange=e=>{sat.visible=e.target.checked;ground.visible=!e.target.checked;};})();
  // sirtlar (tekis qatlamlar), chiziqlar lenta sifatida
  let lvl=0;const flat=(xy,col,y,name)=>{if(xy.length<3)return;const sh2=new TH.Shape(xy.map(p=>new TH.Vector2(p[0],p[1])));const geo=new TH.ShapeGeometry(sh2);geo.rotateX(-Math.PI/2);const m=new TH.Mesh(geo,mat(col));m.position.y=y;m.receiveShadow=true;m.name=name;model.add(m);};
    g.items.forEach(it=>{lvl++;const y=.01+it.z*.012+lvl*.00001;if(it.t==='poly')flat(it.xy,it.col,y,it.cat||'belgi');
    else if(it.t==='line'){const wM=widthM(it.opt.weight),dash=dashM(it.opt.dashArray);ribbon(it.xy,wM,dash,it.opt.color,y+.01);}});
  function ribbon(pts,wM,dash,col,y){const segs=[];if(dash){let on=true,rem=dash[0],cur=[pts[0]];for(let i=1;i<pts.length;i++){let a=pts[i-1];const b=pts[i];let L2=Math.hypot(b[0]-a[0],b[1]-a[1]);
      while(L2>1e-6){const st=Math.min(rem,L2),t=st/L2,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(on)cur.push(p);L2-=st;rem-=st;a=p;if(rem<=1e-6){if(on&&cur.length>1)segs.push(cur);on=!on;rem=on?dash[0]:dash[1];cur=[p];}}
      }if(on&&cur.length>1)segs.push(cur);}else segs.push(pts);
    segs.forEach(p=>{if(p.length<2)return;const A=offsetLine(p,wM/2),B=offsetLine(p,-wM/2).reverse();flat([...A,...B],col,y,'chiziq');});}
  // daraxtlar, mashinalar, pavilonlar
  const trunkG=new TH.CylinderGeometry(.12,.18,3,6),crownG=new TH.IcosahedronGeometry(1,1),carG=new TH.BoxGeometry(4.3,1.45,1.8),carTop=new TH.BoxGeometry(2.2,.7,1.6);
  const carCols=['#e5e5e5','#2b2f36','#9aa3ab','#b8352c','#1f4e8c','#d9d2c3','#555'];let ci=0;
  g.sh.forEach(x=>{const p=toXY(x.ll,g.o);
    if(x.t==='tree'){const tr=new TH.Mesh(trunkG,mat('#6b4f35'));tr.position.set(p[0],1.6,-p[1]);tr.castShadow=true;tr.name='daraxt';model.add(tr);
      const cr=new TH.Mesh(crownG,mat('#4f7d3a'));const r=Math.max(1.4,x.r);cr.scale.set(r,r*.9,r);cr.position.set(p[0],3+r*.7,-p[1]);cr.castShadow=true;cr.name='daraxt';model.add(cr);}
    if(x.t==='car'){const grp=new TH.Group();const col=carCols[ci++%carCols.length];const b=new TH.Mesh(carG,mat(col));b.position.y=.8;const t=new TH.Mesh(carTop,mat('#2c3d4a'));t.position.set(-.2,1.8,0);b.castShadow=t.castShadow=true;grp.add(b,t);grp.position.set(p[0],0,-p[1]);grp.rotation.y=x.h;grp.name='mashina';model.add(grp);}
    if(x.t==='box'){const b=new TH.Mesh(new TH.BoxGeometry(x.w,x.h,x.d),mat(x.col,x.h>1?{transparent:true,opacity:.75}:{}));b.position.set(p[0],x.h/2+.14,-p[1]);b.rotation.y=x.ang||0;b.castShadow=true;b.name='pavilon';model.add(b);}
  });
  // belgilar: ustun + belgi (har doim kameraga qaragan)
  const loader=new TH.TextureLoader(),poleG=new TH.CylinderGeometry(.04,.04,2.6,6);
  (DS().signs||[]).filter(s=>s.st!=='remove').forEach(sn=>{const p=toXY(sn.ll,g.o);const pole=new TH.Mesh(poleG,mat('#9aa0a6'));pole.position.set(p[0],1.3+.14,-p[1]);pole.name='belgi ustuni';model.add(pole);
    const tex=loader.load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(signSVG(sn.c,sn.val).replace('<svg ','<svg width="128" height="128" ')));const sp=new TH.Sprite(new TH.SpriteMaterial({map:tex}));sp.scale.set(.8,.8,.8);sp.position.set(p[0],2.6+.14,-p[1]);scene.add(sp);});
  info.textContent='Sichqoncha: chap — aylantirish, oʻng — surish, gʻildirak — yaqinlashtirish. Sirtlar tekis qatlamlar; daraxt, mashina, pavilon, belgilar — 3D.';
  // binolar
  ov.querySelector('#v3b').onclick=async()=>{const b=ov.querySelector('#v3b');b.disabled=true;b.textContent='Yuklanmoqda…';
    const sw=toLL([g.bb[0]-60,g.bb[1]-60],g.o),ne=toLL([g.bb[2]+60,g.bb[3]+60],g.o);
    try{const els=await overpassRaw(`(way["building"](${sw[0]},${sw[1]},${ne[0]},${ne[1]}););out geom;`);let n=0;
      els.forEach(e=>{if(!e.geometry||e.geometry.length<4)return;const t=e.tags||{};const h=parseFloat(t.height)||(parseFloat(t['building:levels'])||3)*3.2;
        const shp=new TH.Shape(e.geometry.map(q=>{const p=toXY([q.lat,q.lon],g.o);return new TH.Vector2(p[0],p[1]);}));const geo=new TH.ExtrudeGeometry(shp,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);
        const m=new TH.Mesh(geo,mat('#e9e4da'));m.castShadow=m.receiveShadow=true;m.name='bino';model.add(m);n++;});
      b.textContent=`Binolar: ${n}`;}catch(e){b.textContent='Binolar yuklanmadi';b.disabled=false;}};
  ov.querySelector('#v3p').onclick=()=>{ren.render(scene,cam);ren.domElement.toBlob(bl=>{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=`${fslug()}-3d.png`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);});};
  ov.querySelector('#v3o').onclick=()=>exportOBJ(model);
  const close=()=>{ov.hidden=true;V3&&V3.stop();};ov.querySelector('#v3x').onclick=close;
  const onKey=e=>{if(e.key==='Escape'&&!ov.hidden)close();};document.addEventListener('keydown',onKey);
  const onRes=()=>{const w2=host.clientWidth,h2=host.clientHeight;ren.setSize(w2,h2);cam.aspect=w2/h2;cam.updateProjectionMatrix();};window.addEventListener('resize',onRes);
  let run=true;(function loop(){if(!run)return;ctl.update();ren.render(scene,cam);requestAnimationFrame(loop);})();
  V3={stop(){run=false;document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onRes);ren.dispose();}};
}
function exportOBJ(root){
  const TH=THREE,v=new TH.Vector3();let obj=`# Koʻcha Profili Studiyasi — ${projName()}\n# birlik: metr; Y — yuqoriga, X — sharq, -Z — shimol\nmtllib ${fslug()}.mtl\n`,mtl='# Koʻcha Profili Studiyasi\n',vo=1;const used={};
  root.updateMatrixWorld(true);
  root.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry,pos=geo.attributes.position,col='#'+m.material.color.getHexString(),mn='m_'+col.slice(1);
    if(!used[mn]){used[mn]=1;const c=m.material.color;mtl+=`newmtl ${mn}\nKd ${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)}\nKa 0 0 0\nd ${m.material.opacity??1}\n\n`;}
    obj+=`o ${(m.name||'obyekt').replace(/\s+/g,'_')}_${vo}\nusemtl ${mn}\n`;
    for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);obj+=`v ${v.x.toFixed(3)} ${v.y.toFixed(3)} ${v.z.toFixed(3)}\n`;}
    const idx=geo.index;if(idx){for(let i=0;i<idx.count;i+=3)obj+=`f ${idx.getX(i)+vo} ${idx.getX(i+1)+vo} ${idx.getX(i+2)+vo}\n`;}else{for(let i=0;i<pos.count;i+=3)obj+=`f ${i+vo} ${i+1+vo} ${i+2+vo}\n`;}
    vo+=pos.count;});
  dl(`${fslug()}.obj`,obj,'text/plain');setTimeout(()=>dl(`${fslug()}.mtl`,mtl,'text/plain'),400);toast('OBJ va MTL fayllari yuklab olindi (ikkalasini bitta papkada saqlang).');}

function objToolHTML(){const ds=DS();if(ds.tool!=='obj')return '';
  return `<div class="card" style="padding:10px"><div class="pal-h">Obyekt turi</div><div style="display:grid;gap:5px">${Object.entries(ATT).map(([k,v])=>`<button class="btn sm" data-att="${k}" style="text-align:left;${(ds.attType||'bus')===k?'border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)':''}">${v.n} <span class="small num">· ${v.len} m</span></button>`).join('')}</div>
  <p class="small" style="margin:6px 0 0">Koʻchaning qaysi tomoniga bossangiz, obyekt oʻsha tomonga qoʻyiladi. Parklet va veloparkovka shu tomondagi parkovka boʻlagiga, parkovka boʻlmasa — trotuar yoniga joylashadi.</p></div>`;}
function bindObj(el,q,num){const ds=DS(),sel=ds.sel;
  el.querySelectorAll('[data-att]').forEach(b=>b.onclick=()=>{ds.attType=b.dataset.att;afterDesign();});
  if(sel&&sel.t==='att'){const sg=segById(sel.id),a=sg&&sg.att&&sg.att[sel.i];if(a&&q('#atT')){q('#atT').onchange=e=>{a.t=e.target.value;afterDesign();};num('#atL',v=>a.len=v);q('#atS').onclick=()=>{a.side=-(a.side||-1);afterDesign();};}}
  if(q('#sbC'))q('#sbC').onclick=()=>{copySel();renderDesignPanel();};if(q('#sbV'))q('#sbV').onclick=()=>pasteAt(null);if(q('#sbD'))q('#sbD').onclick=dupSel;if(q('#sbX'))q('#sbX').onclick=delSel;
  if(q('#d3'))q('#d3').onclick=open3D;
  bindFile(el);}

/* =====================================================================
   INTERFEYS: asboblar paneli, maslahatlar, tugmalar, holat qatori, qoʻllanma
   ===================================================================== */
const TOOLS=[
  ['select','Tanlash / tahrirlash','i-select','V','Obyektni bosing — xususiyatlari shu yerda chiqadi. Nuqtalarni sudrang, oʻng tugma — menyu.'],
  ['draw','Koʻcha chizish','i-street','S','Modulni tanlang va xaritada nuqtalarni bosing. Mavjud koʻcha yoki tugunni bossangiz — ulanadi.'],
  ['xwalk','Piyoda oʻtish joyi','i-cross','P','Turini tanlang va koʻcha ustiga bosing. Qoʻyilganini sudrab koʻchiring.'],
  ['round','Aylanma halqa','i-round','R','Turini tanlang (turbo-halqa ham bor) va chorraha tugunini bosing.'],
  ['obj','Bekat, parklet, velo','i-obj','O','Turini tanlang va koʻchaning kerakli tomoniga bosing.'],
  ['shape','Erkin shakl','i-shape','F','Sirt turini tanlang va chegarasini nuqtama-nuqta chizing.'],
  ['line','Yoʻl chizigʻi','i-line','L','Chiziq turini tanlang va nuqtalarni bosing.'],
  ['sign','Yoʻl belgisi','i-sign','B','Belgini tanlang va xaritaga bosing.'],
];
const SELNAME={seg:'Koʻcha',node:'Tugun / chorraha',sign:'Yoʻl belgisi',xw:'Piyoda oʻtish joyi',att:'Koʻcha obyekti',shape:'Erkin shakl',line:'Yoʻl chizigʻi'};
const SELICON={seg:'i-street',node:'i-round',sign:'i-sign',xw:'i-cross',att:'i-obj',shape:'i-shape',line:'i-line'};
const APPNAME={area:'Hudud tahlili',prof:'Koʻcha profili',design:'Loyiha chizish'};
function renderRail(){
  const el=document.getElementById('railTools');if(!el)return;
  if(S.app==='design'){const ds=DS();
    el.innerHTML=TOOLS.map(([k,n,ic,key])=>`<button class="rbtn" data-dt="${k}" aria-pressed="${ds.tool===k}" data-tip="${n}" data-key="${key}" aria-label="${n}"><svg class="ic"><use href="#${ic}"/></svg><span class="k">${key}</span></button>`).join('');
    el.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>pickTool(b.dataset.dt));}
  else if(S.app==='area'){
    el.innerHTML=[['rect','Toʻrtburchak hudud','i-rect'],['poly','Koʻpburchak hudud','i-poly'],['view','Ekrandagi hududni tahlil qilish','i-view']].map(([k,n,ic])=>`<button class="rbtn" data-at="${k}" aria-pressed="${k!=='view'&&A.tool===k}" data-tip="${n}" aria-label="${n}"><svg class="ic"><use href="#${ic}"/></svg></button>`).join('');
    el.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{const k=b.dataset.at;
      if(k==='view'){const bb=map.getBounds();A.poly=[[bb.getNorth(),bb.getWest()],[bb.getNorth(),bb.getEast()],[bb.getSouth(),bb.getEast()],[bb.getSouth(),bb.getWest()]];A.pts=[];drawArea();analyze();return;}
      A.tool=k;A.pts=[];drawArea();renderHint();renderAreaPanel();renderRail();});}
  else el.innerHTML='';
}
function pickTool(k){const ds=DS();ds.tool=k;D.start=null;D.pts=[];F.pts=[];if(k!=='select'&&ds.sel&&!['seg'].includes(ds.sel.t))ds.sel=null;afterDesign();}
{const _ra=renderAreaPanel;renderAreaPanel=function(){_ra();if(S.app==='area')renderRail();};}
/* maslahat (tooltip) */
const tipEl=document.createElement('div');tipEl.className='tipbox';tipEl.hidden=true;document.body.appendChild(tipEl);
document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tipEl.hidden=true;return;}
  tipEl.innerHTML=t.dataset.tip+(t.dataset.key?`<kbd>${t.dataset.key}</kbd>`:'');tipEl.hidden=false;const r=t.getBoundingClientRect();tipEl.style.left=(r.right+8)+'px';tipEl.style.top=(r.top+r.height/2-tipEl.offsetHeight/2)+'px';});
document.addEventListener('mousedown',()=>{tipEl.hidden=true;});
/* klaviatura: asboblar */
document.addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='?'){e.preventDefault();openHelp();return;}
  if(S.app!=='design')return;
  const k=e.key.toUpperCase(),t=TOOLS.find(x=>x[3]===k);
  if(t&&!D.start&&!F.pts.length){e.preventDefault();pickTool(t[0]);return;}
  if(k==='M'){e.preventDefault();setTool('dist');}
  if(e.key==='Escape'&&DS().sel&&!D.start&&!F.pts.length){DS().sel=null;afterDesign();}
});
/* holat qatori */
function updateStatus(){const m=document.getElementById('stMode'),z=document.getElementById('stZoom');if(!m)return;
  let t=APPNAME[S.app]||'';if(S.app==='design'){const tl=TOOLS.find(x=>x[0]===DS().tool);if(tl)t+=' · '+tl[1];const n=DS().segs.length;t+=` · ${n} koʻcha`;}
  m.textContent=t;if(z)z.textContent='zoom '+map.getZoom();}
map.on('zoomend',updateStatus);
/* yuqori panel tugmalari */
document.getElementById('tUndo').onclick=()=>undo();document.getElementById('tRedo').onclick=()=>redo();document.getElementById('t3d').onclick=()=>open3D();
{const _sa=setApp;setApp=function(a){_sa(a);document.getElementById('topActs').hidden=a!=='design';renderRail();updateStatus();setTimeout(()=>map.invalidateSize(),50);};}
/* qoʻllanma oynasi */
const KEYS=[['V','Tanlash'],['S','Koʻcha chizish'],['P','Piyoda oʻtish joyi'],['R','Aylanma halqa'],['O','Bekat / parklet / velo'],['F','Erkin shakl'],['L','Yoʻl chizigʻi'],['B','Yoʻl belgisi'],['M','Lineyka'],
  ['Enter','Chizishni tugatish'],['Esc','Bekor qilish / tanlovni olib tashlash'],['⌫','Oxirgi nuqtani oʻchirish'],['Delete','Tanlanganni oʻchirish'],['Ctrl+Z / Ctrl+Y','Orqaga / oldinga'],['Ctrl+C / Ctrl+V','Nusxa / qoʻyish'],['Ctrl+D','Dublikat'],['Oʻng tugma','Shu joy uchun menyu'],['?','Shu qoʻllanma']];
function openHelp(){const m=document.getElementById('helpModal');const g=guideHTML().replace(/^[\s\S]*?<\/summary>/,'').replace(/<\/details>\s*$/,'');
  document.getElementById('helpBody').innerHTML=`<div class="gsec"><h3>Uchta boʻlim</h3><ol><li><b>Hudud tahlili</b> — xaritada hududni belgilang: sunʼiy yoʻldosh va OSM boʻyicha yoʻl, trotuar, yashil va boshqa funksiyalar foizi.</li><li><b>Koʻcha profili</b> — koʻchani bosing: mavjud kesim avtomatik aniqlanadi; loyiha kesimini tuzib, farqlarni koʻrasiz.</li><li><b>Loyiha chizish</b> — koʻchalar, chorrahalar, halqalar, belgilarni modullardan chizasiz; eksport va 3D.</li></ol></div>
    <div class="gsec"><h3>Tugmalar</h3><div class="kbd-grid">${KEYS.map(([k,v])=>`<div><span>${v}</span><span>${k.split(' / ').map(x=>`<kbd>${x}</kbd>`).join(' / ')}</span></div>`).join('')}</div></div>
    <div class="gsec">${g.replace(/<div style="margin-top:10px"><b>/g,'<div class="gsec"><h3>').replace(/<\/b><ol/g,'</h3><ol')}</div>`;
  m.hidden=false;document.getElementById('helpClose').focus();}
document.getElementById('helpBtn').onclick=openHelp;document.getElementById('helpClose').onclick=()=>document.getElementById('helpModal').hidden=true;
document.getElementById('helpModal').addEventListener('mousedown',e=>{if(e.target.id==='helpModal')e.currentTarget.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('helpModal').hidden=true;});
if(!S.helpSeen){S.helpSeen=1;save();setTimeout(openHelp,600);}


{const _ree=renderEditor;renderEditor=function(){_ree();if(stripsG&&S.app==='prof')drawPlanStrips(stripsG);};}
/* ===== v11: barqaror boshqaruv ===== */
/* chizib boʻlgach — Tanlash rejimi (yangi obyekt tanlangan, darhol sudrash/oʻchirish mumkin) */
{const _fs=finishSeg;finishSeg=function(n){const had=!!D.start;_fs(n);if(had&&!D.start&&DS().tool==='draw'&&!DS().keepDraw){DS().tool='select';renderRail&&renderRail();renderDesignPanel();renderHint();}};}
{const _ff=finishFree;finishFree=function(){_ff();const ds=DS();if((ds.tool==='shape'||ds.tool==='line')&&!ds.keepDraw){ds.tool='select';renderRail();renderDesignPanel();renderHint();}};}
/* oʻng panel: qayta chizilganda aylantirish (scroll) joyi saqlanadi */
{const _rp=renderDesignPanel;let lastKey='';renderDesignPanel=function(){const sc=document.getElementById('side'),t=sc?sc.scrollTop:0,ds=DS(),k=JSON.stringify([ds.sel&&[ds.sel.t,ds.sel.id],ds.itab,ds.tool]);_rp();if(sc&&k===lastKey)sc.scrollTop=t;lastKey=k;};}
/* tanlangan obyektni tanasidan ushlab sudrash */
(function(){const cont=map.getContainer();let dr=null;
  const onSel=(ll)=>{const ds=DS(),sel=ds.sel;if(!sel)return false;
    if(sel.t==='seg'){const hs=hitStrip(ll);return !!(hs&&hs.id===sel.id&&!(hs.at>=0)&&!(hs.xw>=0));}
    if(sel.t==='shape'||sel.t==='line'){const hf=hitFree(ll);return !!(hf&&hf.t===sel.t&&hf.id===sel.id);}
    return false;};
  const ok=e=>S.app==='design'&&!M.tool&&DS().tool==='select'&&!D.start&&!F.pts.length&&!e.target.closest('.leaflet-marker-icon,.leaflet-control,.ctx,.hint,.viewtog,.basemap,.mtool');
  cont.addEventListener('mousedown',e=>{if(e.button!==0||!ok(e))return;const ll=map.mouseEventToLatLng(e);if(!onSel(ll))return;
    e.stopPropagation();e.preventDefault();dr={x:e.clientX,y:e.clientY,last:[ll.lat,ll.lng],moved:false};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);},true);
  function mv(e){if(!dr)return;if(!dr.moved&&Math.hypot(e.clientX-dr.x,e.clientY-dr.y)<4)return;dr.moved=true;cont.style.cursor='grabbing';
    const g=map.mouseEventToLatLng(e),dLat=g.lat-dr.last[0],dLng=g.lng-dr.last[1];dr.last=[g.lat,g.lng];const m=p=>[p[0]+dLat,p[1]+dLng],sel=DS().sel;
    if(sel.t==='seg'){const sg=segById(sel.id);sg.pts=sg.pts.map(m);[sg.a,sg.b].forEach(id=>{const n=nodeById(id);n.ll=m(n.ll);});}
    else{const ob=freeObj(sel);ob.pts=ob.pts.map(m);}coreRender();}
  function up(e){document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);cont.style.cursor='';
    if(dr&&dr.moved){const kill=ev=>{ev.stopPropagation();ev.preventDefault();};cont.addEventListener('click',kill,{capture:true,once:true});setTimeout(()=>cont.removeEventListener('click',kill,true),50);afterDesign();}
    else if(dr){const ll=map.mouseEventToLatLng(e);selectAt(ll,hitTest(ll));}
    dr=null;}
  let hvRAF=0;cont.addEventListener('mousemove',e=>{if(dr||hvRAF)return;hvRAF=requestAnimationFrame(()=>{hvRAF=0;
    if(!ok(e)){if(cont.style.cursor==='move')cont.style.cursor='';return;}cont.style.cursor=onSel(map.mouseEventToLatLng(e))?'move':'';});});
})();
{const _sa2=setApp;setApp=function(a){_sa2(a);if(a!=='design'){previewL.clearLayers();D.cur=null;}};}


/* ===== 3D shahar: MapLibre GL + OpenFreeMap (OSM vektor) — binolar hajmda ===== */
const ML_V='4.7.1';
function loadMapLibre(){if(window.maplibregl)return Promise.resolve();
  return new Promise((res,rej)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=`https://cdn.jsdelivr.net/npm/maplibre-gl@${ML_V}/dist/maplibre-gl.css`;document.head.appendChild(l);
    const sc=document.createElement('script');sc.src=`https://cdn.jsdelivr.net/npm/maplibre-gl@${ML_V}/dist/maplibre-gl.js`;sc.onload=res;sc.onerror=()=>rej(new Error('MapLibre yuklanmadi'));document.head.appendChild(sc);});}
let ML3=null;
function designGeoJSON(){const fs=[];if(!S.design||!S.design.segs.length)return {type:'FeatureCollection',features:fs};
  try{const {sh}=buildShapes();sh.forEach(x=>{if(x.t==='poly'&&x.ll&&x.ll.length>2){const r=x.ll.map(p=>[p[1],p[0]]);r.push(r[0]);fs.push({type:'Feature',properties:{col:x.col,z:x.z||0},geometry:{type:'Polygon',coordinates:[r]}});}
    else if(x.t==='line'&&x.ll&&x.opt)fs.push({type:'Feature',properties:{col:x.opt.color||'#fff',w:x.opt.weight||1,z:x.z||0},geometry:{type:'LineString',coordinates:x.ll.map(p=>[p[1],p[0]])}});});}catch(e){}
  fs.sort((a,b)=>a.properties.z-b.properties.z);return {type:'FeatureCollection',features:fs};}
async function openCity3D(){
  const wrap=document.querySelector('.mapwrap');let box=document.getElementById('ml3d');
  if(!box){box=document.createElement('div');box.id='ml3d';box.className='ml3d';box.innerHTML=`<div class="mlmap" id="mlmap"></div>
    <div class="mlbar"><b>3D shahar</b><label><input type="checkbox" id="mlSat" checked> Sunʼiy yoʻldosh</label><label><input type="checkbox" id="mlBld" checked> Binolar</label><label><input type="checkbox" id="mlDes" checked> Loyiha</label>
    <label>Balandlik ×<input type="range" id="mlH" min="0.5" max="3" step="0.25" value="1" style="width:80px"></label><button class="btn sm" id="mlClose">✕ Yopish</button></div>
    <div class="mlnote">Oʻng tugma (yoki Ctrl) bilan sudrang — aylantirish va qiyalik. Bino balandligi OSM dagi <i>height</i> / <i>building:levels</i> teglaridan; teg yoʻq binolar past koʻrinadi. Manba: © OpenStreetMap, OpenFreeMap.</div>`;
    wrap.appendChild(box);}
  box.hidden=false;
  try{await loadMapLibre();}catch(e){box.hidden=true;toast(e.message+' — internetni tekshiring.');return;}
  const c=map.getCenter(),z=Math.max(13,map.getZoom()-1);
  if(ML3){ML3.jumpTo({center:[c.lng,c.lat],zoom:z});ML3.resize();refreshDesign3();return;}
  ML3=new maplibregl.Map({container:'mlmap',style:'https://tiles.openfreemap.org/styles/liberty',center:[c.lng,c.lat],zoom:z,pitch:58,bearing:-18,maxPitch:80,antialias:true});
  ML3.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
  ML3.on('load',()=>{
    const firstSym=(ML3.getStyle().layers.find(l=>l.type==='symbol')||{}).id;
    ML3.addSource('esri',{type:'raster',tiles:[ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Esri World Imagery'});
    ML3.addLayer({id:'esri',type:'raster',source:'esri'},firstSym);
    ML3.getStyle().layers.forEach(l=>{if(l.type==='fill-extrusion')ML3.setLayoutProperty(l.id,'visibility','none');});
    ML3.addLayer({id:'kps-bld',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:13,
      paint:{'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],6],0,'#e9e2d6',15,'#d9cbb5',40,'#c3a98a',100,'#9c7d5f'],
        'fill-extrusion-height':['coalesce',['get','render_height'],6],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.92}});
    ML3.addSource('kps-des',{type:'geojson',data:designGeoJSON()});
    ML3.addLayer({id:'kps-des-f',type:'fill',source:'kps-des',filter:['==','$type','Polygon'],paint:{'fill-color':['get','col'],'fill-opacity':.95}},'kps-bld');
    ML3.addLayer({id:'kps-des-l',type:'line',source:'kps-des',filter:['==','$type','LineString'],paint:{'line-color':['get','col'],'line-width':['get','w']}},'kps-bld');
    const q=id=>document.getElementById(id),vis=(ids,on)=>ids.forEach(i=>ML3.getLayer(i)&&ML3.setLayoutProperty(i,'visibility',on?'visible':'none'));
    q('mlSat').onchange=e=>vis(['esri'],e.target.checked);q('mlBld').onchange=e=>vis(['kps-bld'],e.target.checked);q('mlDes').onchange=e=>vis(['kps-des-f','kps-des-l'],e.target.checked);
    q('mlH').oninput=e=>{const k=+e.target.value;ML3.setPaintProperty('kps-bld','fill-extrusion-height',['*',k,['coalesce',['get','render_height'],6]]);ML3.setPaintProperty('kps-bld','fill-extrusion-base',['*',k,['coalesce',['get','render_min_height'],0]]);};
  });
  let mlWarn=0;ML3.on('error',e=>{if(!mlWarn&&!ML3.isStyleLoaded()){mlWarn=1;toast('3D xarita uslubi ochilmadi (OpenFreeMap): '+((e&&e.error&&e.error.message)||''));}});
  document.getElementById('mlClose').onclick=()=>{const cc=ML3.getCenter();map.setView([cc.lat,cc.lng],Math.round(ML3.getZoom()+1));box.hidden=true;};
}
function refreshDesign3(){if(ML3&&ML3.getSource&&ML3.getSource('kps-des'))ML3.getSource('kps-des').setData(designGeoJSON());}
document.getElementById('map3d').onclick=openCity3D;

/* =====================================================================
   KONSEPTUAL 3D: koʻcha kesimining izometrik taqdimot koʻrinishi
   ===================================================================== */
const C3={L:60,floors:(S.c3&&S.c3.floors)||5,ppl:(S.c3&&S.c3.ppl)??2,dims:(S.c3&&S.c3.dims)??true,bL:(S.c3&&S.c3.bL)??true,bR:(S.c3&&S.c3.bR)??'wire',src:null,ren:null,raf:0};
const C3COL={asph:'#cfcddb',walk:'#eeedf1',facade:'#e6e4ec',furn:'#e2e0e8',green:'#d3e6c6',trees:'#d3e6c6',median:'#d3e6c6',rain:'#c4dcb8',bike:'#bfe0bd',bus:'#f1c9c4',tram:'#dcd6cc',park:'#d6d4e0',buffer:'#dedde4',island:'#e4e2e9',shared:'#ecebe6',hatch:'#cfcddb',water:'#bcd6e6',
  side:'#d9d6e2',edge:'#7d7b8c',wall:'#f3f0f5',win:'#d3def0',glass:'#dbe6f4',awn:'#ffffff',tree:'rgba(206,228,192,.78)',treeE:'#8fb07f',body:'#3f444c'};
/* profil yoki loyiha koʻchasidan bir xil kesim roʻyxati: [{c,w,dir,k}] chapdan oʻngga */
function c3FromProfile(p){const tot=sum(p);let cum=0;return p.map(e=>{const m=cum+e.w/2;cum+=e.w;const L2=LIB[e.k]||{};
  const c={walk:'walk',facade:'facade',shared:'shared',furn:'furn',trees:'trees',ariq:'trees',lawn:'green',bike1:'bike',bike2:'bike',bikeprot:'bike',buffer:'buffer',park:'park',park30:'park',park45:'park',park90:'park',loading:'park',lane:'lane',mixed:'lane',turn:'lane',hatch:'hatch',bus:'bus',brt:'bus',tram:'tram',median:'median',island:'island',rain:'rain',water:'water',parklet:'facade',busstop:'walk',kiosk:'furn',bikepark:'furn',parkkerb:'walk',shoulder:'buffer',barrier:'buffer'}[e.k]||'walk';
  const ang={park30:30,park45:45,park90:90}[e.k]||0;
  return {c,w:e.w,dir:(L2.road&&!['hatch'].includes(e.k))||c==='bike'?(e.k==='bike2'?0:(m<tot/2?1:-1)):0,k:e.k,ang};});}
function c3FromSeg(sg){return stripsLayout(segStrips(sg),0).st.map(x=>{const k=x.k,d=DK[k]||{};
  let c={walk:'walk',shared:'shared',green:'trees',median:'median',buffer:'buffer',lane:'lane',turn:'lane',hatch:'hatch',bus:'bus',tram:'tram',bike:'bike',rain:'rain',island:'island',furn:'furn'}[k];
  if(isPk(k))c='park';return {c:c||'walk',w:x.w,dir:x.dir||0,k,ang:d.ang||0};});}
function c3Sprite(TH,draw,wm,hm,ax=.5,ay=0){const cv=document.createElement('canvas');cv.width=256;cv.height=Math.round(256*hm/wm);const g=cv.getContext('2d');draw(g,cv.width,cv.height);
  const t=new TH.CanvasTexture(cv);t.anisotropy=4;const s=new TH.Sprite(new TH.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(wm,hm,1);s.center.set(ax,ay);return s;}
function c3Person(g,w,h,bike){g.fillStyle=C3COL.body;const cx=w/2;
  if(bike){g.strokeStyle=C3COL.body;g.lineWidth=w*.035;[w*.25,w*.75].forEach(x=>{g.beginPath();g.arc(x,h*.8,w*.17,0,7);g.stroke();});g.beginPath();g.moveTo(w*.25,h*.8);g.lineTo(w*.45,h*.55);g.lineTo(w*.7,h*.55);g.lineTo(w*.75,h*.8);g.stroke();
    g.beginPath();g.arc(w*.5,h*.12,w*.09,0,7);g.fill();g.beginPath();g.moveTo(w*.42,h*.2);g.lineTo(w*.58,h*.2);g.lineTo(w*.62,h*.5);g.lineTo(w*.4,h*.55);g.fill();return;}
  g.beginPath();g.arc(cx,h*.075,w*.13,0,7);g.fill();
  g.beginPath();g.moveTo(cx-w*.2,h*.16);g.lineTo(cx+w*.2,h*.16);g.lineTo(cx+w*.22,h*.55);g.lineTo(cx+w*.12,h*.55);g.lineTo(cx+w*.11,h);g.lineTo(cx+w*.01,h);g.lineTo(cx,h*.6);g.lineTo(cx-w*.01,h);g.lineTo(cx-w*.11,h);g.lineTo(cx-w*.12,h*.55);g.lineTo(cx-w*.22,h*.55);g.closePath();g.fill();}
function c3Text(TH,txt,size=1){const cv=document.createElement('canvas'),g=cv.getContext('2d');g.font='600 64px sans-serif';const tw=g.measureText(txt).width;cv.width=Math.ceil(tw+20);cv.height=84;
  g.font='600 64px sans-serif';g.fillStyle='#4a4957';g.textBaseline='middle';g.fillText(txt,10,44);const t=new TH.CanvasTexture(cv);
  const m=new TH.Mesh(new TH.PlaneGeometry(size*cv.width/84,size),new TH.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));return m;}
function c3Build(TH,strips,label){
  const sc=new TH.Group(),L=C3.L,W=strips.reduce((a,s)=>a+s.w,0);let rnd=7;const R=()=>{rnd=(rnd*16807)%2147483647;return (rnd-1)/2147483646;};
  const eM=new TH.LineBasicMaterial({color:C3COL.edge}),mat={};const M=c=>mat[c]||(mat[c]=new TH.MeshLambertMaterial({color:c}));
  const box=(w,h,d,x,y,z,col,edges=true,parent=sc)=>{const g=new TH.BoxGeometry(w,h,d),m=new TH.Mesh(g,M(col));m.position.set(x,y,z);parent.add(m);if(edges){const e=new TH.LineSegments(new TH.EdgesGeometry(g),eM);e.position.copy(m.position);parent.add(e);}return m;};
  const flat=(w,d,x,z,y,col,rot=0)=>{const m=new TH.Mesh(new TH.PlaneGeometry(w,d),new TH.MeshBasicMaterial({color:col,transparent:col==='#ffffff'?false:false}));m.rotation.x=-Math.PI/2;m.rotation.z=rot;m.position.set(x,y,z);sc.add(m);return m;};
  const line=(pts,col=C3COL.edge)=>{const g=new TH.BufferGeometry().setFromPoints(pts.map(p=>new TH.Vector3(...p)));const l=new TH.Line(g,new TH.LineBasicMaterial({color:col}));sc.add(l);return l;};
  const H={lane:.15,bus:.15,tram:.15,hatch:.15,park:.17,bike:.3,walk:.3,facade:.3,furn:.3,shared:.25,buffer:.3,island:.35,trees:.35,green:.35,median:.35,rain:.1,water:.05};
  // asosiy plita
  const base=1.2;box(W+(C3.bL?0:0),base,L,W/2,-base/2,0,C3COL.side);
  let x=0;const S2=[];
  strips.forEach(s=>{const h=H[s.c]??.3,col=s.c==='lane'?C3COL.asph:(C3COL[s.c]||C3COL.walk);box(s.w,h,L,x+s.w/2,h/2,0,col);S2.push(Object.assign({x0:x,x1:x+s.w,xm:x+s.w/2,h},s));x+=s.w;});
  const top=s=>s.h+.012;
  // chiziqlar, yoʻl belgilari
  const dash=(xx,y,len=3,gap=6,col='#ffffff',wid=.15)=>{for(let z=-L/2+2;z<L/2-2;z+=len+gap)flat(wid,len,xx,z+len/2,y,col);};
  const solid=(xx,y,col='#ffffff',wid=.15,z0=-L/2,z1=L/2)=>flat(wid,z1-z0,xx,(z0+z1)/2,y,col);
  const zebraZ=L/2-7;
  S2.forEach((s,i)=>{const n=S2[i+1];
    if(['lane','bus','tram','hatch','park'].includes(s.c)&&n&&['lane','bus','tram','hatch','park'].includes(n.c)){const y=Math.max(top(s),top(n));
      if(s.dir&&n.dir&&s.dir!==n.dir)solid(s.x1,y,'#ffffff',.3);else if(s.c==='park'||n.c==='park')solid(s.x1,y,'#ffffff',.12);else if(s.c==='bus'||n.c==='bus')solid(s.x1,y,'#ffffff',.25);else dash(s.x1,y);}
    if(s.c==='bike'){dash(s.xm,top(s),1.5,6,'#ffffff',.12);}
    if(s.c==='hatch'){for(let z=-L/2+1;z<L/2;z+=3){const m=flat(.25,Math.hypot(s.w,2),s.xm,z,top(s),'#ffffff',Math.atan2(s.w,2));}}
    if(s.c==='bus'){for(let z=-L/2+10;z<L/2-10;z+=20){const t=c3Text(TH,'BUS',1.4);t.rotation.x=-Math.PI/2;if(s.dir<0)t.rotation.z=Math.PI;t.position.set(s.xm,top(s)+.01,z);sc.add(t);}}
    if(s.c==='tram'){[-.72,.72].forEach(o=>{box(.08,.06,L,s.xm+o,top(s)+.03,0,'#9a938a',false);});for(let z=-L/2;z<L/2;z+=1.2)flat(s.w*.8,.25,s.xm,z,top(s)+.001,'#cfc7ba');}
    if(s.c==='lane'&&s.dir){for(let z=-L/2+14;z<L/2-12;z+=26){const a=new TH.Shape();a.moveTo(-.25,-1.6);a.lineTo(.25,-1.6);a.lineTo(.25,.2);a.lineTo(.6,.2);a.lineTo(0,1.2);a.lineTo(-.6,.2);a.lineTo(-.25,.2);a.closePath();
      const m=new TH.Mesh(new TH.ShapeGeometry(a),new TH.MeshBasicMaterial({color:'#ffffff'}));m.rotation.x=-Math.PI/2;m.rotation.z=s.dir>0?0:Math.PI;m.position.set(s.xm,top(s)+.01,z);sc.add(m);}}
    if(s.c==='park'){const ang=s.ang||0,sp=ang===0?6:ang===90?2.5:ang===45?3.5:5;for(let z=-L/2+1;z<L/2-10;z+=sp){if(ang===0)flat(s.w*.9,.12,s.xm,z,top(s),'#ffffff');else{const len=s.w/Math.sin(ang*Math.PI/180);flat(.12,Math.min(len,s.w*1.6),s.xm,z,top(s),'#ffffff',(90-ang)*Math.PI/180);}}}
  });
  // piyoda oʻtish joyi (zebra) — barcha qatnov va velo polosalari boʻylab
  S2.forEach(s=>{if(['lane','bus','tram','park','hatch'].includes(s.c)){for(let xx=s.x0+.35;xx<s.x1-.3;xx+=1)flat(.5,4,xx+.25,zebraZ,top(s)+.011,'#ffffff');flat(s.w,.3,s.xm,zebraZ-2.9,top(s)+.011,'#ffffff');}
    if(s.c==='bike')flat(s.w,4,s.xm,zebraZ,top(s)+.011,'#a9d3a6');});
  // ---- teksturalar keshi (yuqori aniqlikda) ----
  const TX=C3.tx||(C3.tx={});
  const tex=(key,wpx,hpx,draw)=>{if(TX[key])return TX[key];const cv=document.createElement('canvas');cv.width=wpx;cv.height=hpx;const g=cv.getContext('2d');g.lineCap='round';g.lineJoin='round';draw(g,wpx,hpx);
    const t=new TH.CanvasTexture(cv);t.anisotropy=8;t.minFilter=TH.LinearMipmapLinearFilter;return TX[key]=t;};
  const spr=(t,wm,hm,ax=.5,ay=0)=>{const s2=new TH.Sprite(new TH.SpriteMaterial({map:t,transparent:true,depthWrite:false,alphaTest:.02}));s2.scale.set(wm,hm,1);s2.center.set(ax,ay);return s2;};
  // daraxt tojlari: dumaloq va choʻziq (ustunsimon), ichki soya bilan
  const crownTex=(v)=>tex('crown'+v,512,v===1?768:512,(g,w,h)=>{const cx=w/2,cy=h/2,rx=w/2-8,ry=h/2-8;
    g.fillStyle='rgba(196,222,178,.86)';g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7);g.fill();
    g.fillStyle='rgba(222,238,210,.7)';g.beginPath();g.ellipse(cx-rx*.22,cy-ry*.25,rx*.55,ry*.5,0,0,7);g.fill();
    g.strokeStyle='rgba(120,160,105,.35)';g.lineWidth=5;for(let i=0;i<5;i++){const a2=i*1.3+.4;g.beginPath();g.arc(cx+Math.cos(a2)*rx*.35,cy+Math.sin(a2)*ry*.35,Math.min(rx,ry)*.28,a2,a2+1.6);g.stroke();}
    g.strokeStyle='#86a877';g.lineWidth=7;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7);g.stroke();});
  const trunkM=new TH.MeshLambertMaterial({color:'#9c9a8e'});
  const tree=(xx,y0,z,r,v)=>{const h=4.3+R()*1.1,tr=new TH.Mesh(new TH.CylinderGeometry(.09,.13,h,8),trunkM);tr.position.set(xx,y0+h/2,z);sc.add(tr);
    const cr=spr(crownTex(v),r*2,v===1?r*3:r*2,.5,.5);cr.position.set(xx,y0+h+(v===1?r*1.3:r*.85),z);sc.add(cr);};
  const treeSp=S.set&&S.set.treeSp?S.set.treeSp:8;
  const grass=tex('grass',256,256,(g,w,h)=>{g.strokeStyle='#8fb07f';g.lineWidth=5;[[.15,.1],[.3,.25],[.45,.05],[.6,.2],[.78,.12],[.9,.3]].forEach(([x0,t])=>{g.beginPath();g.moveTo(w*x0,h);g.quadraticCurveTo(w*(x0+.03),h*.5,w*(x0+.08),h*t);g.stroke();});});
  S2.forEach(s=>{const tr=s.c==='trees'||(s.c==='median'&&s.w>=1.5)||(s.c==='green'&&s.w>=2);
    if(tr){const v=s.c==='median'&&s.w<3?1:(R()<.25?1:0);for(let z=-L/2+treeSp/2;z<L/2;z+=treeSp){if(Math.abs(z-zebraZ)<3)continue;tree(s.xm,top(s),z,Math.min(3,1.7+s.w*.35)*(v?.75:1),v);}}
    if(s.c==='green'&&!tr||s.c==='rain'||s.c==='trees'){for(let z=-L/2+1;z<L/2;z+=s.c==='rain'?1.1:1.8){const b2=spr(grass,.7,.75);b2.position.set(s.x0+.25+R()*Math.max(.1,s.w-.5),top(s),z+R()*.6);sc.add(b2);}}
  });
  // ---- odamlar va velosipedchilar: silliq siluetlar, bir necha xil ----
  const INK='#40454d';
  const personTex=(v)=>tex('p'+v,256,640,(g,w,h)=>{g.fillStyle=v%3===1?'#545a63':INK;g.strokeStyle=g.fillStyle;const cx=w/2,sw=v%2?1:-1,kid=v===5;
    const H=h*(kid?.62:1),top0=h-H,U=H/10;
    g.beginPath();g.arc(cx,top0+U*.62,U*.58,0,7);g.fill();// bosh
    g.beginPath();g.moveTo(cx-U*.95,top0+U*1.55);g.quadraticCurveTo(cx,top0+U*1.2,cx+U*.95,top0+U*1.55);g.lineTo(cx+U*.8,top0+U*5.2);g.lineTo(cx-U*.8,top0+U*5.2);g.closePath();g.fill();// tana
    g.lineWidth=U*.62;g.beginPath();g.moveTo(cx-U*.85,top0+U*1.8);g.lineTo(cx-U*1.05-sw*U*.25,top0+U*4.6);g.moveTo(cx+U*.85,top0+U*1.8);g.lineTo(cx+U*1.05-sw*U*.25,top0+U*4.6);g.stroke();// qoʻllar
    g.lineWidth=U*.78;g.beginPath();g.moveTo(cx-U*.38,top0+U*5);g.lineTo(cx-U*.45+sw*U*.7,h-U*.2);g.moveTo(cx+U*.38,top0+U*5);g.lineTo(cx+U*.45-sw*U*.5,h-U*.2);g.stroke();// oyoqlar
    if(v===2){g.fillRect(cx+U*1.05,top0+U*3.7,U*.9,U*1.2);}// sumka
    if(v===4){g.beginPath();g.moveTo(cx-U*.95,top0+U*1.6);g.lineTo(cx-U*1.45,top0+U*5.8);g.lineTo(cx+U*1.45,top0+U*5.8);g.lineTo(cx+U*.95,top0+U*1.6);g.fill();}// koʻylak
  });
  const bikeTex=tex('bike',640,560,(g,w,h)=>{const r=w*.17,y=h-r-6,x1=w*.22,x2=w*.78;g.strokeStyle=INK;g.fillStyle=INK;g.lineWidth=12;
    [x1,x2].forEach(x=>{g.beginPath();g.arc(x,y,r,0,7);g.stroke();});g.lineWidth=11;
    const px=w*.46,py=y,sx=w*.4,sy=y-r*1.25,hx=w*.7,hy=y-r*1.4;g.beginPath();g.moveTo(x1,y);g.lineTo(px,py);g.lineTo(sx,sy);g.lineTo(x1,y);g.moveTo(px,py);g.lineTo(hx-8,hy+18);g.lineTo(sx,sy);g.moveTo(hx-8,hy+18);g.lineTo(x2,y);g.moveTo(hx-8,hy+18);g.lineTo(hx+14,hy);g.stroke();
    g.lineWidth=26;g.beginPath();g.moveTo(sx,sy-8);g.lineTo(sx+w*.12,h*.22);g.stroke();// tana
    g.beginPath();g.arc(sx+w*.16,h*.12,30,0,7);g.fill();// bosh
    g.lineWidth=16;g.beginPath();g.moveTo(sx+w*.1,h*.26);g.lineTo(hx+10,hy-2);g.stroke();// qoʻl
    g.lineWidth=18;g.beginPath();g.moveTo(sx,sy-6);g.lineTo(px+30,y-r*.55);g.lineTo(px,py);g.stroke();});// oyoq
  const dens=[0,.05,.12,.25][C3.ppl]||0;
  S2.forEach(s=>{const ped=['walk','shared','facade','island'].includes(s.c);
    if(ped&&dens){const n=Math.round(L*s.w*dens*.35);for(let i=0;i<n;i++){const v=Math.floor(R()*6),hh=(1.62+R()*.25);const p2=spr(personTex(v),hh*.4,hh);p2.position.set(s.x0+.3+R()*(s.w-.6),top(s),-L/2+2+R()*(L-4));sc.add(p2);}}
    if(s.c==='bike'&&dens){const n=Math.max(1,Math.round(L*dens*.12));for(let i=0;i<n;i++){const p2=spr(bikeTex,1.85,1.62);p2.position.set(s.xm,top(s),-L/2+3+R()*(L-6));sc.add(p2);}}
  });
  // ---- transport: silliq kuzov (profil ekstruziyasi), oynalar, gʻildiraklar ----
  const white=M('#fbfbfa'),glassM=new TH.MeshLambertMaterial({color:'#c9d6e6'}),tyreM=new TH.MeshLambertMaterial({color:'#5b5f66'}),eM2=new TH.LineBasicMaterial({color:'#8d8b9a'});
  const extr=(pts,depth)=>{const sh2=new TH.Shape();pts.forEach(([u,v],i)=>i?sh2.lineTo(u,v):sh2.moveTo(u,v));sh2.closePath();const g2=new TH.ExtrudeGeometry(sh2,{depth,bevelEnabled:true,bevelThickness:.06,bevelSize:.05,bevelSegments:2,steps:1});g2.translate(0,0,-depth/2);return g2;};
  const CARB=extr([[-2.2,.32],[-2.22,.72],[-1.95,.88],[-1.05,.95],[-.55,1.42],[.75,1.44],[1.25,.98],[2.08,.86],[2.22,.62],[2.18,.32]],1.62);
  const CARW=extr([[-.95,.98],[-.5,1.36],[.7,1.38],[1.12,.98]],1.66);
  const WHEEL=new TH.CylinderGeometry(.31,.31,.22,16);WHEEL.rotateX(Math.PI/2);const BWHEEL=new TH.CylinderGeometry(.48,.48,.3,18);BWHEEL.rotateX(Math.PI/2);
  const car=(xx,y,z,rot=0,col)=>{const g=new TH.Group();const bdy=new TH.Mesh(CARB,col?M(col):white);g.add(bdy);const ed=new TH.LineSegments(new TH.EdgesGeometry(CARB,25),eM2);g.add(ed);
    g.add(new TH.Mesh(CARW,glassM));[[-1.35,.83],[1.35,.83],[-1.35,-.83],[1.35,-.83]].forEach(([u,w2])=>{const wh=new TH.Mesh(WHEEL,tyreM);wh.position.set(u,.31,w2);g.add(wh);});
    g.rotation.y=Math.PI/2+rot;g.position.set(xx,y,z);sc.add(g);};
  const longV=(xx,y,z,len,hgt,col,winCol)=>{const g=new TH.Group(),r2=.35;const pts=[[-len/2,.35],[-len/2,hgt-r2],[-len/2+r2,hgt],[len/2-r2*2,hgt],[len/2,hgt-r2*2],[len/2,.35]];const B=extr(pts,2.5);
    g.add(new TH.Mesh(B,M(col)));g.add(new TH.LineSegments(new TH.EdgesGeometry(B,25),eM2));const Wg=extr([[-len/2+.6,hgt*.52],[-len/2+.6,hgt-.35],[len/2-.9,hgt-.35],[len/2-.4,hgt*.52]],2.54);g.add(new TH.Mesh(Wg,M(winCol)));
    for(let u=-len/2+2;u<len/2-1;u+=len>11?len-4.5:len-4)[1.18,-1.18].forEach(w2=>{const wh=new TH.Mesh(BWHEEL,tyreM);wh.position.set(u,.48,w2);g.add(wh);});
    g.rotation.y=Math.PI/2;g.position.set(xx,y,z);sc.add(g);return g;};
  const vehDens=[0,.6,1,1.5][C3.ppl]||.6,carCols=[null,null,null,'#e9ecef','#dfe3e8',null,'#f1ede6'];
  S2.forEach(s=>{const y=top(s);
    if(s.c==='lane'){let z=-L/2+4+R()*8;while(z<L/2-12){if(Math.abs(z-zebraZ)>5)car(s.xm,y,z,s.dir<0?Math.PI:0,carCols[Math.floor(R()*carCols.length)]);z+=(10+R()*22)/vehDens;}}
    if(s.c==='bus'){const z=-L/2+12+R()*(L-30);longV(s.xm,y,z,12,3.1,'#fbfbfa',C3COL.glass);}
    if(s.c==='tram'&&s.dir>=0){for(let k=0;k<3;k++)longV(s.xm,y+.05,-L/2+14+k*9.8,9.4,3.3,'#fbfbfa','#c9d6e6');}
    if(s.c==='park'){for(let z=-L/2+3;z<L/2-10;z+=(s.ang===0?6:s.ang===90?2.5:4)*(R()<.35?2:1)){const rot=s.ang?(90-s.ang)*Math.PI/180:0;car(s.xm,y,z,rot,carCols[Math.floor(R()*carCols.length)]);}}
  });
  // jihozlar: skameykalar, chiroqlar, kafe stollari
  const bench=(xx,y,z)=>box(.5,.45,1.8,xx,y+.225,z,'#ffffff');
  const lamp=(xx,y,z)=>{line([[xx,y,z],[xx,y+6.5,z]]);box(.25,.12,.7,xx,y+6.5,z,'#ffffff');};
  const cafe=(xx,y,z)=>{box(.8,.75,.8,xx,y+.38,z,'#ffffff');box(.4,.45,.4,xx-.6,y+.23,z,'#ffffff');box(.4,.45,.4,xx+.6,y+.23,z,'#ffffff');};
  S2.forEach((s,i)=>{const y=top(s);
    if(s.c==='furn'||(s.c==='walk'&&s.w>=3.5)){for(let z=-L/2+5;z<L/2-4;z+=12)bench(s.c==='furn'?s.xm:s.x1-.5,y,z);for(let z=-L/2+9;z<L/2;z+=24)lamp(s.c==='furn'?s.xm:s.x1-.3,y,z);}
    if(s.c==='buffer'||s.c==='median'){for(let z=-L/2+9;z<L/2;z+=24)lamp(s.xm,y,z);}
    if(s.c==='facade'||(s.c==='shared')){for(let z=-L/2+3;z<L/2-2;z+=(s.c==='shared'?6:3.2)){if(R()<.7)cafe(s.xm,y,z);}}
  });
  // bekat pavilon (avtobus boʻlagi yonidagi trotuarda)
  S2.forEach((s,i)=>{if(s.c!=='bus')return;const nb=[S2[i-1],S2[i+1]].find(q=>q&&['walk','furn','buffer','island','trees','green'].includes(q.c));if(!nb)return;
    const g=new TH.Group();box(1.6,.12,8,0,2.6,0,'#ffffff',true,g);box(.08,2.5,8,nb.x0<s.x0?-.7:.7,1.3,0,C3COL.glass,true,g);g.position.set(nb.xm,top(nb),-L/2+22);sc.add(g);});
  // binolar
  const fl=C3.floors,fh=3.1,BH=fl*fh+.6,Bd=12;
  if(C3.bL){const bx=-Bd/2;box(Bd,BH,L,bx,BH/2,0,C3COL.wall);
    const shop=S2[0]&&['facade','walk','shared'].includes(S2[0].c);
    for(let z=-L/2+2.5;z<L/2-2;z+=4){for(let f=shop?1:0;f<fl;f++){const m=new TH.Mesh(new TH.PlaneGeometry(1.6,1.7),new TH.MeshBasicMaterial({color:C3COL.win}));m.rotation.y=Math.PI/2;m.position.set(.02,f*fh+1.9,z);sc.add(m);}
      if(shop){const m=new TH.Mesh(new TH.PlaneGeometry(3.4,2.6),new TH.MeshBasicMaterial({color:C3COL.glass}));m.rotation.y=Math.PI/2;m.position.set(.02,1.4,z);sc.add(m);box(1.2,.12,3.4,.6,3,z,C3COL.awn);}}}
  if(C3.bR){const bx=W+Bd/2,g=new TH.BoxGeometry(Bd,BH,L);if(C3.bR==='wire'){const e=new TH.LineSegments(new TH.EdgesGeometry(g),new TH.LineBasicMaterial({color:'#b9b7c6'}));e.position.set(bx,BH/2,0);sc.add(e);}else box(Bd,BH,L,bx,BH/2,0,C3COL.wall);}
  // oʻlchamlar
  if(C3.dims){const zf=L/2+2.2;line([[0,0,zf],[W,0,zf]],'#4a4957');[0,W].forEach(xx=>line([[xx,0,L/2+.4],[xx,0,zf+.8]],'#4a4957'));
    const t=c3Text(TH,f2(W)+' m',2.2);t.rotation.x=-Math.PI/2;t.position.set(W/2,0,zf+1.3);sc.add(t);
    S2.forEach(s=>{if(s.w<1.2)return;const t2=c3Text(TH,f1(s.w),.75);t2.position.set(s.xm,-base/2,L/2+.02);sc.add(t2);line([[s.x1,0,L/2+.01],[s.x1,-base,L/2+.01]],'#9b99aa');});}
  if(label){const t=c3Text(TH,label,1.6);t.rotation.x=-Math.PI/2;t.position.set(W/2,0,-L/2-3);sc.add(t);}
  return {sc,W,BH};
}
async function openConcept3D(src){
  const strips=src==='seg'?(()=>{const sel=DS().sel;const sg=sel&&sel.t==='seg'&&segById(sel.id);return sg?c3FromSeg(sg):null;})():(S.prof[src||S.active]&&S.prof[src||S.active].length?c3FromProfile(S.prof[src||S.active]):null);
  if(!strips||!strips.length){toast(src==='seg'?'Avval koʻchani tanlang.':'Profil boʻsh.');return;}
  C3.src=src;
  let ov=document.getElementById('c3d');
  if(!ov){ov=document.createElement('div');ov.id='c3d';ov.style.cssText='position:fixed;inset:0;z-index:3000;background:#ffffff;display:flex;flex-direction:column';
    ov.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;background:var(--panel);border-bottom:1px solid var(--line);font-size:12.5px">
      <b style="margin-right:6px">Konseptual 3D</b><span id="c3src"></span>
      <label>Qavatlar <input type="range" id="c3f" min="1" max="16" step="1" style="width:90px"> <b id="c3fv"></b></label>
      <label>Odamlar/transport <select id="c3p"><option value="0">yoʻq</option><option value="1">kam</option><option value="2">oʻrta</option><option value="3">koʻp</option></select></label>
      <label><input type="checkbox" id="c3dm"> Oʻlchamlar</label>
      <label>Chap bino <input type="checkbox" id="c3bl"></label>
      <label>Oʻng bino <select id="c3br"><option value="">yoʻq</option><option value="wire">kontur</option><option value="solid">toʻliq</option></select></label>
      <span style="flex:1"></span><button class="btn sm" id="c3iso">Izometriya</button><button class="btn sm" id="c3png">PNG (yuqori sifat)</button><button class="btn sm primary" id="c3x">Yopish (Esc)</button></div>
      <div id="c3c" style="flex:1;position:relative"></div><div style="position:absolute;left:12px;bottom:10px;font-size:11.5px;color:#777">Sichqoncha: chap — aylantirish, oʻng — surish, gʻildirak — kattalashtirish. Konseptual tasvir, oʻlchamlar kesim boʻyicha.</div>`;
    document.body.appendChild(ov);
    ov.querySelector('#c3x').onclick=()=>{ov.hidden=true;cancelAnimationFrame(C3.raf);};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden){ov.hidden=true;cancelAnimationFrame(C3.raf);}});}
  ov.hidden=false;
  const srcTxt=src==='seg'?('Loyiha koʻchasi'+(segById(DS().sel.id).name?' · '+segById(DS().sel.id).name:'')):((src||S.active)==='ex'?'Mavjud holat':'Loyiha profili')+(S.site&&S.site.name?' · '+S.site.name:'');
  ov.querySelector('#c3src').textContent=srcTxt;
  try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');}
  catch(e){toast('3D kutubxonasi yuklanmadi — internetni tekshiring.');ov.hidden=true;return;}
  const TH=THREE,host=ov.querySelector('#c3c');
  const q=id=>ov.querySelector(id);
  q('#c3f').value=C3.floors;q('#c3fv').textContent=C3.floors;q('#c3p').value=C3.ppl;q('#c3dm').checked=C3.dims;q('#c3bl').checked=!!C3.bL;q('#c3br').value=C3.bR||'';
  let ren=C3.ren;if(!ren){ren=new TH.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setClearColor(0xffffff,1);C3.ren=ren;}
  host.innerHTML='';host.appendChild(ren.domElement);
  const Wp=host.clientWidth,Hp=host.clientHeight;ren.setPixelRatio(Math.min(2,devicePixelRatio));ren.setSize(Wp,Hp);
  const scene=new TH.Scene();scene.add(new TH.AmbientLight(0xffffff,.82));const dl=new TH.DirectionalLight(0xffffff,.3);dl.position.set(40,70,25);scene.add(dl);
  let built=null;
  const cam=new TH.OrthographicCamera(-1,1,1,-1,-1000,2000);
  const ctl=new TH.OrbitControls(cam,ren.domElement);ctl.enableDamping=true;ctl.maxPolarAngle=Math.PI/2.1;
  const iso=()=>{const bb=new TH.Box3().setFromObject(built.sc),c=bb.getCenter(new TH.Vector3());ctl.target.copy(c);cam.position.set(c.x+90,c.y+80,c.z+105);cam.up.set(0,1,0);cam.lookAt(c);cam.zoom=1;cam.updateMatrixWorld();
    const inv=cam.matrixWorldInverse;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;[bb.min.x,bb.max.x].forEach(x=>[bb.min.y,bb.max.y].forEach(y=>[bb.min.z,bb.max.z].forEach(z=>{const v=new TH.Vector3(x,y,z).applyMatrix4(inv);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);})));
    let w=(x1-x0)*1.06,h=(y1-y0)*1.08;const asp=Wp/Hp;if(w/h>asp)h=w/asp;else w=h*asp;const cx=(x0+x1)/2,cy=(y0+y1)/2;
    cam.left=cx-w/2;cam.right=cx+w/2;cam.top=cy+h/2;cam.bottom=cy-h/2;cam.updateProjectionMatrix();ctl.update();};
  const rebuild=(keepCam)=>{if(built)scene.remove(built.sc);built=c3Build(TH,strips,null);scene.add(built.sc);if(!keepCam)iso();
    S.c3={floors:C3.floors,ppl:C3.ppl,dims:C3.dims,bL:C3.bL,bR:C3.bR};save();};
  rebuild();
  q('#c3f').oninput=e=>{C3.floors=+e.target.value;q('#c3fv').textContent=C3.floors;rebuild(true);};
  q('#c3p').onchange=e=>{C3.ppl=+e.target.value;rebuild(true);};
  q('#c3dm').onchange=e=>{C3.dims=e.target.checked;rebuild(true);};
  q('#c3bl').onchange=e=>{C3.bL=e.target.checked;rebuild(true);};
  q('#c3br').onchange=e=>{C3.bR=e.target.value||false;rebuild(true);};
  q('#c3iso').onclick=()=>iso();
  q('#c3png').onclick=()=>{const pr=ren.getPixelRatio();ren.setPixelRatio(3);ren.render(scene,cam);const u=ren.domElement.toDataURL('image/png');ren.setPixelRatio(pr);ren.render(scene,cam);
    const a=document.createElement('a');a.href=u;a.download=(typeof slug==='function'?slug():'kocha')+'-konsept-3d.png';a.click();toast('PNG saqlandi');};
  cancelAnimationFrame(C3.raf);const loop=()=>{C3.raf=requestAnimationFrame(loop);ctl.update();ren.render(scene,cam);};loop();
  window.__C3={scene,cam,ren,built};
}
/* tugmalar: profil paneli, koʻcha muharriri, oʻng tugma menyusi */
{const _rs2=renderSite;renderSite=function(){_rs2();const el=document.getElementById('site');if(!el||!S.prof)return;
  const r=document.createElement('div');r.style.cssText='display:flex;gap:6px;margin-top:6px;flex-wrap:wrap';
  r.innerHTML='<button class="btn" data-c3="ex">3D konsept — mavjud</button><button class="btn" data-c3="pr">3D konsept — loyiha</button>';
  r.querySelectorAll('[data-c3]').forEach(b=>b.onclick=()=>openConcept3D(b.dataset.c3));el.appendChild(r);};}
{const _rdp=renderDesignPanel;renderDesignPanel=function(){_rdp();const ds=DS();if(!(ds.sel&&ds.sel.t==='seg'&&(ds.itab||'prop')==='prop'))return;
  const h=document.getElementById('designPanel');if(!h||h.querySelector('#c3seg'))return;const b=document.createElement('button');b.id='c3seg';b.className='btn';b.style.cssText='width:100%;margin:8px 0';b.textContent='3D konsept (izometrik kesim) →';b.onclick=()=>openConcept3D('seg');
  const anchor=h.querySelector('.kv')||h.firstElementChild;if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling);else h.appendChild(b);};}

setMode('pick'); renderAll(); setApp(S.app||'area');
