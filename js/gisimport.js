/* Archemistry Lab — GIS import: Shapefile (alohida fayllar yoki papka, zip shart emas) va GeoPackage.
   Katta fayllar boʻlaklab oʻqiladi va faqat tanlangan hududga tushgan obyektlar olinadi.
   Natija — WGS84 dagi GeoJSON FeatureCollection.
   window.GISIMP.read(files, {region:[w,s,e,n]|null, crs:'auto'|'EPSG:…', dx, dy, onProgress}) → [{name, gj, crs, kept, total, note}] */
(function(){
"use strict";
const CDN={proj4:"https://cdn.jsdelivr.net/npm/proj4@2.22.0/dist/proj4.js",sqljs:"https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js",sqlwasm:"https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm"};
const loaded={};
function load(src){ return loaded[src]||(loaded[src]=new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Kutubxona yuklanmadi: "+src.split("/").pop()));document.head.appendChild(s);})); }

/* ---------- koordinata tizimlari ---------- */
const PULKOVO_TOWGS="+towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12";
const DEFS={
  "EPSG:4326":"+proj=longlat +datum=WGS84 +no_defs",
  "EPSG:3857":"+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs",
  "EPSG:32641":"+proj=utm +zone=41 +datum=WGS84 +units=m +no_defs",
  "EPSG:32642":"+proj=utm +zone=42 +datum=WGS84 +units=m +no_defs",
  "EPSG:32643":"+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs",
  "EPSG:28412":"+proj=tmerc +lat_0=0 +lon_0=69 +k=1 +x_0=12500000 +y_0=0 +ellps=krass "+PULKOVO_TOWGS+" +units=m +no_defs",
  "EPSG:28413":"+proj=tmerc +lat_0=0 +lon_0=75 +k=1 +x_0=13500000 +y_0=0 +ellps=krass "+PULKOVO_TOWGS+" +units=m +no_defs",
  // Toshkent shahar mahalliy tizimi (Shahar bazasi .prj fayllarida): TM, Krassovskiy, CM 69°
  "TOSHKENT-MSK":"+proj=tmerc +lat_0=0 +lon_0=69 +k=1 +x_0=-182.2698 +y_0=-4500719.7668 +ellps=krass "+PULKOVO_TOWGS+" +units=m +no_defs"
};
const NAMES={"EPSG:4326":"WGS 84","EPSG:3857":"Web Mercator","EPSG:32641":"UTM 41N","EPSG:32642":"UTM 42N","EPSG:32643":"UTM 43N","EPSG:28412":"Pulkovo 1942 / GK 12","EPSG:28413":"Pulkovo 1942 / GK 13","TOSHKENT-MSK":"Toshkent mahalliy (MSK)"};
const num=(w,k)=>{ const m=w.match(new RegExp('PARAMETER\\["'+k+'",\\s*([-0-9.eE+]+)\\]',"i")); return m?+m[1]:null; };
/* .prj (ESRI WKT) → proj4 satri */
function prjToDef(w){
  if(!w) return null; w=String(w).trim();
  if(/^GEOGCS/i.test(w)&&!/PROJCS/i.test(w)) return {key:"EPSG:4326",def:DEFS["EPSG:4326"]};
  if(/Mercator_Auxiliary_Sphere|Web_Mercator|Pseudo_Mercator|3857/i.test(w)) return {key:"EPSG:3857",def:DEFS["EPSG:3857"]};
  const um=w.match(/UTM_Zone_(\d+)N/i); if(um&&/WGS_?84/i.test(w)) return {key:"EPSG:326"+um[1].padStart(2,"0"),def:"+proj=utm +zone="+(+um[1])+" +datum=WGS84 +units=m +no_defs"};
  if(/Transverse_Mercator|Gauss_Kruger/i.test(w)){
    const krass=/Krass|Pulkovo|SK_?42|1942/i.test(w);
    const p={x0:num(w,"False_Easting")||0,y0:num(w,"False_Northing")||0,lon0:num(w,"Central_Meridian")||0,k:num(w,"Scale_Factor")??1,lat0:num(w,"Latitude_Of_Origin")||0};
    const def=`+proj=tmerc +lat_0=${p.lat0} +lon_0=${p.lon0} +k=${p.k} +x_0=${p.x0} +y_0=${p.y0} ${krass?"+ellps=krass "+PULKOVO_TOWGS:"+datum=WGS84"} +units=m +no_defs`;
    const key=(krass&&p.lon0===69&&Math.abs(p.x0+182.2698)<0.01&&Math.abs(p.y0+4500719.7668)<0.01)?"TOSHKENT-MSK":"WKT-TM";
    return {key,def:key==="TOSHKENT-MSK"?DEFS[key]:def};
  }
  return {key:"WKT",def:w};   // proj4 oʻzi WKT ni oʻqishga harakat qiladi
}
/* .prj boʻlmasa — koordinata oraligʻidan taxmin */
function guessCRS(bb){
  const [x0,y0,x1,y1]=bb;
  if(Math.abs(x0)<=180&&Math.abs(x1)<=180&&Math.abs(y0)<=90&&Math.abs(y1)<=90) return "EPSG:4326";
  if(x0>-60000&&x1<120000&&y0>-20000&&y1<200000) return "TOSHKENT-MSK";
  if(x0>100000&&x1<900000&&y0>3800000&&y1<5300000) return "EPSG:32642";
  if(x0>12000000&&x1<13000000) return "EPSG:28412";
  if(Math.abs(x0)>5e6&&Math.abs(y0)>3e6) return "EPSG:3857";
  return null;
}
async function transformer(def){
  await load(CDN.proj4);
  const fwd=def===DEFS["EPSG:4326"]?null:proj4(def,DEFS["EPSG:4326"]);
  return { fwd:fwd?(p=>fwd.forward([p[0],p[1]])):(p=>[p[0],p[1]]), inv:fwd?(p=>fwd.inverse([p[0],p[1]])):(p=>[p[0],p[1]]) };
}
/* WGS84 hudud → manba tizimidagi bbox (chetlarini namunalash) */
function regionInSrc(region,tr){
  if(!region) return null; const [w,s,e,n]=region; let a=[Infinity,Infinity,-Infinity,-Infinity];
  for(let i=0;i<=8;i++) for(let j=0;j<=8;j++){ const p=tr.inv([w+(e-w)*i/8, s+(n-s)*j/8]); if(!isFinite(p[0])) continue; a[0]=Math.min(a[0],p[0]);a[1]=Math.min(a[1],p[1]);a[2]=Math.max(a[2],p[0]);a[3]=Math.max(a[3],p[1]); }
  return a;
}
const hit=(b,r)=>!r||!(b[2]<r[0]||b[0]>r[2]||b[3]<r[1]||b[1]>r[3]);

/* ---------- fayllarni guruhlash (bir xil nomli .shp/.dbf/.shx/.prj/.cpg) ---------- */
function groups(files){
  const g={}, other=[];
  files.forEach(f=>{ const n=f.name, m=n.match(/^(.*)\.(shp|dbf|shx|prj|cpg|gpkg)$/i);
    if(!m){ if(!/\.(sbn|sbx|qix|qmd|xml|ini|qgs|png|lock|cpg)$/i.test(n)) other.push(f); return; }
    const dir=(f.webkitRelativePath||"").split("/").slice(0,-1).join("/");
    const k=(dir+"/"+m[1]).toLowerCase(); (g[k]=g[k]||{name:m[1],dir})[m[2].toLowerCase()]=f; });
  return {sets:Object.values(g).filter(s=>s.shp||s.gpkg), lone:Object.values(g).filter(s=>!s.shp&&!s.gpkg&&s.dbf), other};
}

/* ---------- Shapefile: boʻlaklab oʻqish ---------- */
const CHUNK=48*1024*1024;
async function buf(file,a,b){ return await file.slice(a,b).arrayBuffer(); }
function readGeom(dv,o,type){
  const base=type%10, t=type;
  if(t===0) return null;
  if(base===1){ return {type:"Point",coordinates:[dv.getFloat64(o+4,true),dv.getFloat64(o+12,true)]}; }
  if(base===8){ const n=dv.getInt32(o+36,true), pts=[]; for(let i=0;i<n;i++) pts.push([dv.getFloat64(o+40+i*16,true),dv.getFloat64(o+48+i*16,true)]); return {type:"MultiPoint",coordinates:pts}; }
  if(base===3||base===5){
    const np=dv.getInt32(o+36,true), nn=dv.getInt32(o+40,true), parts=[]; for(let i=0;i<np;i++) parts.push(dv.getInt32(o+44+i*4,true));
    const p0=o+44+np*4, rings=[];
    for(let i=0;i<np;i++){ const a=parts[i], b=i+1<np?parts[i+1]:nn, r=[]; for(let k=a;k<b;k++) r.push([dv.getFloat64(p0+k*16,true),dv.getFloat64(p0+k*16+8,true)]); rings.push(r); }
    if(base===3) return rings.length===1?{type:"LineString",coordinates:rings[0]}:{type:"MultiLineString",coordinates:rings};
    // tashqi halqa — soat yoʻnalishida (shapefile qoidasi), ichki — teskari
    const polys=[]; rings.forEach(r=>{ let s=0; for(let i=0,j=r.length-1;i<r.length;j=i++) s+=(r[j][0]-r[i][0])*(r[j][1]+r[i][1]);
      if(s>=0||!polys.length) polys.push([r]); else polys[polys.length-1].push(r); });
    return polys.length===1?{type:"Polygon",coordinates:polys[0]}:{type:"MultiPolygon",coordinates:polys};
  }
  return null;
}
function recBBox(dv,o,type){ const base=type%10; if(base===1){ const x=dv.getFloat64(o+4,true),y=dv.getFloat64(o+12,true); return [x,y,x,y]; }
  return [dv.getFloat64(o+4,true),dv.getFloat64(o+12,true),dv.getFloat64(o+20,true),dv.getFloat64(o+28,true)]; }
async function dbfHeader(f){ const h=new DataView(await buf(f,0,32)); const n=h.getUint32(4,true), hl=h.getUint16(8,true), rl=h.getUint16(10,true);
  const fd=new DataView(await buf(f,32,hl)), fields=[]; let off=1;
  for(let p=0;p+32<=fd.byteLength&&fd.getUint8(p)!==0x0D;p+=32){ let nm=""; for(let i=0;i<11;i++){ const c=fd.getUint8(p+i); if(!c) break; nm+=String.fromCharCode(c); }
    const ty=String.fromCharCode(fd.getUint8(p+11)), len=fd.getUint8(p+16), dec=fd.getUint8(p+17); fields.push({nm,ty,len,dec,off}); off+=len; }
  return {n,hl,rl,fields}; }
function encodingOf(cpgText,dbfLangByte){
  const c=String(cpgText||"").trim().toUpperCase();
  if(/UTF-?8/.test(c)) return "utf-8"; if(/1251/.test(c)) return "windows-1251"; if(/866/.test(c)) return "ibm866"; if(/1252|LATIN1|8859-1/.test(c)) return "windows-1252";
  if(dbfLangByte===0xC9) return "windows-1251"; if(dbfLangByte===0x65||dbfLangByte===0x26) return "ibm866";
  return "utf-8";
}
async function readShpSet(s,opt){
  const shp=s.shp, shx=s.shx, dbf=s.dbf, prog=opt.onProgress||(()=>{});
  // koordinata tizimi
  let prjTxt=s.prj?await s.prj.text():null, cpgTxt=s.cpg?await s.cpg.text():null;
  const hd=new DataView(await buf(shp,0,100)), type=hd.getInt32(32,true), bb=[hd.getFloat64(36,true),hd.getFloat64(44,true),hd.getFloat64(52,true),hd.getFloat64(60,true)];
  let crs=prjToDef(prjTxt), note="";
  if(!crs){ const key=(opt.crs&&opt.crs!=="auto")?opt.crs:(opt.siblingCRS||guessCRS(bb));
    if(!key) throw new Error(s.name+": .prj yoʻq va koordinata tizimini aniqlab boʻlmadi. Roʻyxatdan tizimni tanlang.");
    crs={key,def:DEFS[key]}; note=".prj yoʻq — "+(NAMES[key]||key)+(opt.crs&&opt.crs!=="auto"?" (tanlangan)":" (taxmin)"); }
  const tr=await transformer(crs.def), reg=regionInSrc(opt.region,tr);
  // yozuvlar roʻyxati (.shx), boʻlmasa .shp ketma-ket
  let offs=null;
  if(shx){ const b=new DataView(await shx.arrayBuffer()), n=(b.byteLength-100)/8; offs=new Int32Array(n*2); for(let i=0;i<n;i++){ offs[i*2]=b.getInt32(100+i*8,false)*2; offs[i*2+1]=b.getInt32(104+i*8,false)*2+8; } }
  const total=offs?offs.length/2:null, keep=[], geoms=[];
  // .shp ni boʻlaklab oʻqish
  let pos=100, idx=0, chunkStart=-1, chunk=null, dv=null;
  const size=shp.size;
  async function ensure(a,b){ if(chunk&&a>=chunkStart&&b<=chunkStart+chunk.byteLength) return; chunkStart=a; chunk=await buf(shp,a,Math.min(size,Math.max(b,a+CHUNK))); dv=new DataView(chunk); }
  const maxKeep=opt.maxFeatures||250000;
  while(true){
    let o,len;
    if(offs){ if(idx>=offs.length/2) break; o=offs[idx*2]; len=offs[idx*2+1]; }
    else { if(pos+8>size) break; await ensure(pos,pos+8); len=dv.getInt32(pos-chunkStart+4,false)*2+8; o=pos; pos+=len; }
    await ensure(o,o+len);
    const co=o-chunkStart+8, st=len>8?dv.getInt32(co,true):0;
    if(st!==0){ const rb=recBBox(dv,co,st);
      if(hit(rb,reg)){ const g=readGeom(dv,co,st); if(g){ keep.push(idx); geoms.push(g); if(keep.length>maxKeep) throw new Error(`${s.name}: hududda ${maxKeep.toLocaleString("ru-RU")} dan ortiq obyekt. Kichikroq hudud tanlang.`); } } }
    idx++; if(idx%20000===0){ prog(`${s.name}: ${idx.toLocaleString("ru-RU")}${total?" / "+total.toLocaleString("ru-RU"):""} yozuv koʻrildi, ${keep.length.toLocaleString("ru-RU")} tasi hududda`); await new Promise(r=>setTimeout(r,0)); }
  }
  // atributlar — faqat olingan yozuvlar uchun
  const props=keep.map(()=>({}));
  if(dbf&&keep.length){
    const h=await dbfHeader(dbf), lang=new Uint8Array(await buf(dbf,29,30))[0], dec=new TextDecoder(encodingOf(cpgTxt,lang));
    let cs=-1, cb=null;
    for(let k=0;k<keep.length;k++){
      const r=keep[k]; if(r>=h.n) continue; const a=h.hl+r*h.rl;
      if(!cb||a<cs||a+h.rl>cs+cb.length){ cs=a; cb=new Uint8Array(await buf(dbf,a,Math.min(dbf.size,a+Math.max(CHUNK,h.rl)))); }
      const row=cb.subarray(a-cs,a-cs+h.rl), o={};
      h.fields.forEach(f=>{ let v=dec.decode(row.subarray(f.off,f.off+f.len)).replace(/\0/g,"").trim();
        if(f.ty==="N"||f.ty==="F"){ v=v===""||/^\*+$/.test(v)?null:+v; } else if(f.ty==="L"){ v=/[YyTt]/.test(v); } else if(f.ty==="D"&&v.length===8){ v=v.slice(0,4)+"-"+v.slice(4,6)+"-"+v.slice(6); }
        o[f.nm]=v; });
      props[k]=o; if(k%20000===0&&k){ prog(`${s.name}: atributlar ${k.toLocaleString("ru-RU")} / ${keep.length.toLocaleString("ru-RU")}`); await new Promise(r=>setTimeout(r,0)); }
    }
  }
  // WGS84 ga oʻtkazish (+ ixtiyoriy siljitish, metr)
  const dx=+opt.dx||0, dy=+opt.dy||0;
  const proj=p=>{ const q=tr.fwd(p); if(dx||dy){ q[0]+=dx/(111320*Math.cos(q[1]*Math.PI/180)); q[1]+=dy/110540; } return [Math.round(q[0]*1e7)/1e7,Math.round(q[1]*1e7)/1e7]; };
  const walk=a=>typeof a[0]==="number"?proj(a):a.map(walk);
  const feats=geoms.map((g,i)=>({type:"Feature",properties:props[i],geometry:{type:g.type,coordinates:walk(g.coordinates)}}));
  return {name:s.name+".shp",gj:{type:"FeatureCollection",features:feats},crs:NAMES[crs.key]||crs.key,crsKey:crs.key,kept:feats.length,total,note};
}

/* ---------- GeoPackage ---------- */
function wkb(dv,o){
  const le=dv.getUint8(o)===1; let t=dv.getUint32(o+1,le); o+=5;
  let hasZ=false,hasM=false; if(t&0x80000000){hasZ=true;} if(t&0x40000000){hasM=true;} t&=0x0fffffff;
  if(t>=3000){hasZ=hasM=true;t-=3000;} else if(t>=2000){hasM=true;t-=2000;} else if(t>=1000){hasZ=true;t-=1000;}
  const dim=2+(hasZ?1:0)+(hasM?1:0);
  const pt=()=>{ const p=[dv.getFloat64(o,le),dv.getFloat64(o+8,le)]; o+=8*dim; return p; };
  const line=()=>{ const n=dv.getUint32(o,le); o+=4; const a=[]; for(let i=0;i<n;i++) a.push(pt()); return a; };
  const poly=()=>{ const n=dv.getUint32(o,le); o+=4; const a=[]; for(let i=0;i<n;i++) a.push(line()); return a; };
  const multi=()=>{ const n=dv.getUint32(o,le); o+=4; const a=[]; for(let i=0;i<n;i++){ const r=wkb(dv,o); o=r.o; a.push(r.g); } return a; };
  let g;
  if(t===1) g={type:"Point",coordinates:pt()};
  else if(t===2) g={type:"LineString",coordinates:line()};
  else if(t===3) g={type:"Polygon",coordinates:poly()};
  else if(t===4) g={type:"MultiPoint",coordinates:multi().map(x=>x.coordinates)};
  else if(t===5) g={type:"MultiLineString",coordinates:multi().map(x=>x.coordinates)};
  else if(t===6) g={type:"MultiPolygon",coordinates:multi().map(x=>x.coordinates)};
  else if(t===7) g={type:"GeometryCollection",geometries:multi()};
  else throw new Error("WKB turi qoʻllab-quvvatlanmaydi: "+t);
  return {g,o};
}
function gbbox(g){ let a=[Infinity,Infinity,-Infinity,-Infinity]; const w=c=>{ if(typeof c[0]==="number"){a[0]=Math.min(a[0],c[0]);a[1]=Math.min(a[1],c[1]);a[2]=Math.max(a[2],c[0]);a[3]=Math.max(a[3],c[1]);} else c.forEach(w); };
  if(g.type==="GeometryCollection") g.geometries.forEach(x=>w(x.coordinates)); else w(g.coordinates); return a; }
async function readGpkg(f,opt){
  await load(CDN.sqljs); const SQL=await initSqlJs({locateFile:()=>CDN.sqlwasm});
  const db=new SQL.Database(new Uint8Array(await f.arrayBuffer())), out=[];
  const q=(s)=>{ const r=db.exec(s); return r.length?r[0].values.map(v=>Object.fromEntries(r[0].columns.map((c,i)=>[c,v[i]]))):[]; };
  const cols=q("SELECT table_name, column_name, srs_id FROM gpkg_geometry_columns");
  for(const c of cols){
    const srs=q(`SELECT definition, organization, organization_coordsys_id FROM gpkg_spatial_ref_sys WHERE srs_id=${+c.srs_id}`)[0]||{};
    let crs=null; const code=srs.organization&&String(srs.organization).toUpperCase()==="EPSG"?"EPSG:"+srs.organization_coordsys_id:null;
    if(code&&DEFS[code]) crs={key:code,def:DEFS[code]}; else crs=prjToDef(srs.definition)||(code?{key:code,def:DEFS["EPSG:4326"]}:null);
    if(!crs) crs={key:"EPSG:4326",def:DEFS["EPSG:4326"]};
    const tr=await transformer(crs.def), reg=regionInSrc(opt.region,tr);
    const stmt=db.prepare(`SELECT * FROM "${c.table_name.replace(/"/g,'""')}"`), feats=[]; let total=0;
    while(stmt.step()){ total++; const row=stmt.getAsObject(), blob=row[c.column_name]; if(!blob||blob.length<8) continue;
      const dv=new DataView(blob.buffer,blob.byteOffset,blob.byteLength), flags=dv.getUint8(3), env=(flags>>1)&7, el=[0,32,48,48,64][env]||0, le=(flags&1)===1;
      if(env&&reg){ const e=[dv.getFloat64(8,le),dv.getFloat64(24,le),dv.getFloat64(16,le),dv.getFloat64(32,le)]; if(!hit(e,reg)) continue; }
      let g; try{ g=wkb(dv,8+el).g; }catch(e){ continue; }
      if(!env&&reg&&!hit(gbbox(g),reg)) continue;
      const p={}; Object.keys(row).forEach(k=>{ if(k!==c.column_name&&!(row[k] instanceof Uint8Array)) p[k]=row[k]; });
      const walk=a=>typeof a[0]==="number"?tr.fwd(a).map(v=>Math.round(v*1e7)/1e7):a.map(walk);
      if(g.type==="GeometryCollection") g.geometries.forEach(x=>x.coordinates=walk(x.coordinates)); else g.coordinates=walk(g.coordinates);
      feats.push({type:"Feature",properties:p,geometry:g}); }
    stmt.free();
    out.push({name:f.name.replace(/\.gpkg$/i,"")+" · "+c.table_name,gj:{type:"FeatureCollection",features:feats},crs:NAMES[crs.key]||crs.key,crsKey:crs.key,kept:feats.length,total,note:""});
  }
  db.close(); return out;
}

/* ---------- umumiy kirish ---------- */
async function read(files,opt){
  opt=opt||{}; const {sets,lone,other}=groups(files), res=[], errs=[];
  // bir papkadagi .prj si yoʻq qatlamlar uchun qoʻshni .prj dagi tizim
  const dirCRS={}; for(const s of sets) if(s.prj){ const c=prjToDef(await s.prj.text()); if(c&&c.def&&c.key!=="WKT") dirCRS[s.dir]=dirCRS[s.dir]||c.key; }
  for(const s of sets){
    try{
      if(s.gpkg){ res.push(...await readGpkg(s.gpkg,opt)); continue; }
      if(!s.dbf) errs.push(s.name+": .dbf topilmadi — atributlarsiz yuklanadi.");
      res.push(await readShpSet(s,Object.assign({},opt,{siblingCRS:s.prj?null:(dirCRS[s.dir]||null)})));
    }catch(e){ errs.push(e.message||String(e)); }
  }
  lone.forEach(s=>errs.push(s.name+": .shp fayli tanlanmagan."));
  return {layers:res,other,errors:errs};
}
window.GISIMP={read,groups,DEFS,NAMES};
})();
