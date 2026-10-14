/* Archemistry Lab — Master reja muharriri: binolar generatori (3-bosqich).
   Kirish: kvartal poligoni (GeoJSON Feature, [lng,lat]) va parametrlar {typ, far, fl, sb}.
   Chiqish: {blds:[{f, fl}], fp, gfa, far, flAvg, capped}.
   Hamma oʻlchamlar metrda; burilish — kvartalning eng uzun qirrasi boʻylab (qatorlar shu qirraga parallel).
   Oraliqlar — TAXMIN (insolyatsiya va yongʻinga qarshi masofalar 5-bosqichda tekshiriladi). */
window.MRGEN=(function(){
'use strict';
const FH=3.3;   // qavat balandligi, m (Joylashtirish boʻlimi bilan bir xil)
const TYP={
  hovli:  {n:'Hovli uylar',     far:.35, fl:2,  sb:3, w:12,d:10, px:24,py:30},
  seksiya:{n:'Seksiyali qatorlar',far:2.5,fl:9,  sb:6, d:14, maxLen:80, secGap:12, gapMin:20, gapK:1.0},
  perimetr:{n:'Perimetral kvartal',far:2.5,fl:9,sb:6, d:14},
  minora: {n:'Minoralar',       far:3,  fl:16, sb:8, a:24, gapMin:30, gapK:.6}};
const sq=x=>x*x;
const dm=lat=>({x:1/(111320*Math.cos(lat*Math.PI/180)),y:1/110540});   // metr → gradus
function mainBearing(f){const c=f.geometry.coordinates[0];let best=0,b=90;for(let i=0;i<c.length-1;i++){const d=sq(c[i+1][0]-c[i][0])*Math.cos(c[i][1]*Math.PI/180)**2+sq(c[i+1][1]-c[i][1]);if(d>best){best=d;b=turf.bearing(c[i],c[i+1]);}}return b;}
const area=f=>{try{return turf.area(f);}catch(_){return 0;}};
function inter(a,b){try{return turf.intersect(turf.featureCollection([a,b]));}catch(_){return null;}}
function parts(f){const o=[];if(f)turf.flattenEach(f,p=>{if(p.geometry.type==='Polygon')o.push(p);});return o;}
function inset(f,m){if(!m)return f;try{const r=turf.buffer(f,-m,{units:'meters'});return r&&area(r)>1?r:null;}catch(_){return null;}}
function within(sqF,poly){const i=inter(sqF,poly);return i&&area(i)>=area(sqF)*.98;}

/* qatorlar: aylantirilgan kvartalda gorizontal polosalar, uzunlari seksiyalarga boʻlinadi */
function rows(rot,k,d,gap,maxLen,secGap){const bb=turf.bbox(rot),out=[];
  for(let y=bb[1]+gap*k.y*.5;y+d*k.y<=bb[3];y+=(d+gap)*k.y){
    const band=turf.bboxPolygon([bb[0]-1e-4,y,bb[2]+1e-4,y+d*k.y]);
    parts(inter(band,rot)).forEach(p=>{if(area(p)<d*12)return;const pb=turf.bbox(p),L=(pb[2]-pb[0])/k.x;
      if(!maxLen||L<=maxLen){out.push(p);return;}
      const n=Math.ceil((L+secGap)/(maxLen+secGap)),seg=(L-secGap*(n-1))/n;
      for(let i=0;i<n;i++){const x0=pb[0]+i*(seg+secGap)*k.x;parts(inter(turf.bboxPolygon([x0,pb[1]-1e-6,x0+seg*k.x,pb[3]+1e-6]),p)).forEach(q=>{if(area(q)>=d*12)out.push(q);});}});}
  return out;}
/* toʻr: toʻliq kvartal ichiga sigʻadigan toʻrtburchaklar */
function grid(rot,k,w,h,px,py){const bb=turf.bbox(rot),out=[];const W=(bb[2]-bb[0])/k.x,H=(bb[3]-bb[1])/k.y;
  const nx=Math.max(1,Math.floor((W+px-w)/px)),ny=Math.max(1,Math.floor((H+py-h)/py)),ox=(W-((nx-1)*px+w))/2,oy=(H-((ny-1)*py+h))/2;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const x=bb[0]+(ox+i*px)*k.x,y=bb[1]+(oy+j*py)*k.y,r=turf.bboxPolygon([x,y,x+w*k.x,y+h*k.y]);if(within(r,rot))out.push(r);}
  return out;}

function generate(block,g){
  const T=TYP[g.typ];if(!T)return null;
  const A=area(block);if(A<300)return null;
  const inner=inset(block,g.sb??T.sb);if(!inner)return {blds:[],fp:0,gfa:0,far:0,flAvg:0,capped:false,note:'chekinish juda katta'};
  const c=turf.centroid(block).geometry.coordinates,k=dm(c[1]),rotA=90-mainBearing(block);
  const rot=turf.transformRotate(inner,rotA,{pivot:c});
  const back=f=>turf.transformRotate(f,-rotA,{pivot:c});
  const maxFl=Math.max(1,Math.round(g.fl??T.fl)),far=Math.max(.05,g.far??T.far),target=far*A;
  let polys=[],fl=1;
  if(g.typ==='hovli'){polys=grid(rot,k,T.w,T.d,T.px,T.py).map(back);fl=Math.min(maxFl,Math.max(1,Math.round(target/Math.max(1,polys.reduce((a,p)=>a+area(p),0)))));}
  else if(g.typ==='perimetr'){const hole=inset(inner,T.d);let ring=inner;if(hole){try{ring=turf.difference(turf.featureCollection([inner,hole]));}catch(_){ring=inner;}}polys=parts(ring);}
  else{ // seksiya / minora: oraliq balandlikka bogʻliq — 3 marta aniqlashtiriladi
    fl=maxFl;for(let it=0;it<3;it++){const gap=Math.max(T.gapMin,T.gapK*fl*FH);
      polys=g.typ==='seksiya'?rows(rot,k,T.d,gap,T.maxLen,T.secGap):grid(rot,k,T.a,T.a,T.a+gap,T.a+gap);
      const F=polys.reduce((a,p)=>a+area(p),0);if(!F)break;const nf=Math.min(maxFl,Math.max(1,Math.round(target/F)));if(nf===fl)break;fl=nf;}
    polys=polys.map(back);}
  const fp=polys.reduce((a,p)=>a+area(p),0);
  if(g.typ==='perimetr')fl=Math.min(maxFl,Math.max(1,Math.round(target/Math.max(1,fp))));
  const blds=polys.map(p=>({f:turf.truncate(p,{precision:7}),fl}));
  const gfa=fp*fl;
  return {blds,fp,gfa,far:gfa/A,flAvg:blds.length?fl:0,capped:gfa<target*.95&&fl>=maxFl,A};}

const cache=new Map();
function gen(block,g){const key=JSON.stringify([block.geometry.coordinates,g]);if(cache.has(key))return cache.get(key);
  let r=null;try{r=generate(block,g);}catch(e){console.warn('[MR] gen',e);}
  cache.set(key,r);if(cache.size>400)cache.delete(cache.keys().next().value);return r;}
/* qoʻlda tahrirlangan binolar uchun bir xil koʻrsatkichlar */
function stats(block,blds){const A=area(block),fp=blds.reduce((a,x)=>a+area(x.f),0),gfa=blds.reduce((a,x)=>a+area(x.f)*x.fl,0);return {blds,fp,gfa,far:A?gfa/A:0,flAvg:fp?gfa/fp:0,capped:false,A};}
return {gen,TYP,FH,stats,mainBearing};
})();
