/* Archemistry Lab — Master reja muharriri: binolar generatori (3-bosqich), 2-versiya.
   Kirish: kvartal poligoni (GeoJSON Feature, [lng,lat]) va parametrlar {typ, far, fl, sb, seis}.
   Chiqish: {blds:[{f, fl}], fp, gfa, far, flAvg, capped, rules:[{t,v,src}], warn:[…]}.

   Ikki manba qatlami:
   1) NORM — meʼyoriy minimumlar (masofa, chekinish). Har biri manbasi bilan; generator ulardan kam masofa qoʻymaydi.
   2) TYP — tipologiya analoglardan (bino chuqurligi, seksiya/qator uzunligi, uchastka oʻlchami). Bu loyiha
      parametrlari, meʼyor emas: panelda oʻzgartiriladi.

   MUHIM: masofalar ShNQ 2.07.01-03* (2009) 21.1-bandidan. Amaldagi ShNQ 2.07.01-23 masofani yoʻnalish
   koeffitsiyenti (k_y) formulasi bilan beradi — uning matni hali kutubxonaga kiritilmagan, shuning uchun
   har bir natija «tekshirilsin» belgisi bilan chiqadi. Yongʻin qiymatlari — RF SP 4.13130.2013 (ShNQ 2.01.02-04 bilan solishtirilsin). */
window.MRGEN=(function(){
'use strict';
const FH=3.3;   // qavat balandligi, m (Joylashtirish boʻlimi bilan bir xil)

/* ---------- meʼyoriy minimumlar ---------- */
const SRC={
  d0321:'ShNQ 2.07.01-03*, 21.1-band (2009) — 2.07.01-23 dagi k_y formulasi bilan tekshirilsin',
  d0328:'ShNQ 2.07.01-03*, 28-band — birinchi qavatida kvartira boʻlgan turar joy, turar joy koʻchalari',
  ins:'ShNQ 2.07.01-03*, 26*-band: 22.03–22.09 da kamida 2,5 soat uzluksiz (bolalar muassasalari — 3 soat). Linzada (T) hisoblanadi',
  fire:'RF SP 4.13130.2013, 8.1.4 va 8.1.6-bandlar (ShNQ 2.01.02-04 bilan solishtirilsin)',
  seis:'ShNQ 2.07.01-03*, 21.1-band: 8 ball va undan yuqori seysmik hududda — eng baland binoning ikki balandligidan kam emas (aniq matni tekshirilsin)'};
/* uzun tomonlar orasidagi masofa (deraza—deraza): 2–3 qavat ≥15; 4–5 qavat ≥25–30; 9+ ≥40–45.
   Oraliq qavatlar uchun chiziqli oraliq qiymat (meʼyorda yoʻq — interpolyatsiya). */
function gapLong(fl){if(fl<=1)return 10;if(fl<=3)return 15;if(fl===4)return 25;if(fl===5)return 30;if(fl>=10)return 45;if(fl===9)return 40;return 30+(fl-5)*2.5;}
/* uzun tomon — derazali torets: ≥10; derazali toretslar orasi (9+ qavat): 20–25 */
function gapEnd(fl){return fl>=9?Math.min(25,20+(fl-9)):10;}
/* yongʻin mashinasi oʻtish yoʻli: kenglik va devorgacha masofa (balandlikka qarab) */
function fire(h){return {w:h<=13?3.5:h<=46?4.2:6,off:h<=28?5:8};}
function normGap(fl,seis){const h=fl*FH,f=fire(h);let g=gapLong(fl),why='ShNQ 21.1 (uzun tomonlar)';
  const gf=f.off*2+f.w;if(gf>g){g=gf;why='yongʻin oʻtish yoʻli';}
  if(seis&&2*h>g){g=2*h;why='seysmik: 2H';}
  return {g:Math.round(g*10)/10,why};}

/* ---------- tipologiyalar: analoglardan olingan boshlangʻich parametrlar ---------- */
const TYP={
  hovli:   {n:'Hovli uylar', far:.25, fl:2, sb:3, plotW:20, plotD:30, w:12, d:10, edge:3,
            an:'Mahalla tipidagi yakka uy: uchastka va uy oʻlchami — loyiha parametri; qoʻshni uchastka chegarasigacha ≥3 m (ShNQ 2.07.01-03*, 21.1)'},
  taunhaus:{n:'Taunhaus', far:.8, fl:3, sb:3, d:11, unit:6, maxLen:48, endGap:6,
            an:'Qatorli uylar: blok kengligi 4,5–6 m, ikki qavatli (Janubiy Avstraliya uy-joy trestining dizayn qoʻllanmasi, 2020); orqa bogʻ'},
  seksiya: {n:'Seksiyali qatorlar', far:1.6, fl:9, sb:6, d:13, maxLen:75,
            an:'Mikrorayon «strochka» qurilishi: korpus chuqurligi 12–14 m (taxmin, analoglar bilan tekshirilsin); orasi meʼyoriy masofa'},
  perimetr:{n:'Perimetral kvartal', far:2, fl:7, sb:3, d:14, maxLen:80, pass:10,
            an:'Perimetral kvartal: 3–6 qavatda hovli va ichki fasadlar yetarli yoritiladi (Allies and Morrison); Eixample kvartali 113,3 m, ichida ≥800 m² bogʻ (Cerdà rejasi)'},
  minora:  {n:'Minoralar', far:2.5, fl:16, sb:8, a:24,
            an:'Nuqtali minoralar shaxmat tartibida; orasi meʼyoriy masofa va yongʻin oʻtish yoʻli boʻyicha'}};

const sq=x=>x*x;
const dm=lat=>({x:1/(111320*Math.cos(lat*Math.PI/180)),y:1/110540});   // metr → gradus
function mainBearing(f){const c=f.geometry.coordinates[0];let best=0,b=90;for(let i=0;i<c.length-1;i++){const d=sq(c[i+1][0]-c[i][0])*Math.cos(c[i][1]*Math.PI/180)**2+sq(c[i+1][1]-c[i][1]);if(d>best){best=d;b=turf.bearing(c[i],c[i+1]);}}return b;}
const area=f=>{try{return turf.area(f);}catch(_){return 0;}};
function inter(a,b){try{return turf.intersect(turf.featureCollection([a,b]));}catch(_){return null;}}
function diff(a,b){try{return turf.difference(turf.featureCollection([a,b]));}catch(_){return a;}}
function parts(f){const o=[];if(f)turf.flattenEach(f,p=>{if(p.geometry.type==='Polygon')o.push(p);});return o;}
function inset(f,m){if(!m)return f;try{const r=turf.buffer(f,-m,{units:'meters'});return r&&area(r)>1?r:null;}catch(_){return null;}}
function within(sqF,poly){const i=inter(sqF,poly);return i&&area(i)>=area(sqF)*.98;}
const rect=(x,y,w,h,k)=>turf.bboxPolygon([x,y,x+w*k.x,y+h*k.y]);

/* qatorlar: aylantirilgan kvartalda gorizontal polosalar (chuqurlik d, orasi gap); uzun polosa binolarga boʻlinadi (≤maxLen, orasi endGap) */
function rows(rot,k,d,gap,maxLen,endGap,minLen){const bb=turf.bbox(rot),out=[],H=(bb[3]-bb[1])/k.y;
  const n=Math.max(1,Math.floor((H+gap)/(d+gap))),y0=bb[1]+((H-(n*d+(n-1)*gap))/2)*k.y;   // qatorlar kvartal ichida markazlashadi
  for(let r=0;r<n;r++){const y=y0+r*(d+gap)*k.y;
    const band=turf.bboxPolygon([bb[0]-1e-4,y,bb[2]+1e-4,y+d*k.y]);
    parts(inter(band,rot)).forEach(p=>{if(area(p)<d*minLen*.9)return;const pb=turf.bbox(p),L=(pb[2]-pb[0])/k.x;
      if(!maxLen||L<=maxLen){out.push(p);return;}
      const m=Math.ceil((L+endGap)/(maxLen+endGap)),seg=(L-endGap*(m-1))/m;
      for(let i=0;i<m;i++){const x0=pb[0]+i*(seg+endGap)*k.x;parts(inter(turf.bboxPolygon([x0,pb[1]-1e-6,x0+seg*k.x,pb[3]+1e-6]),p)).forEach(q=>{if(area(q)>=d*minLen*.9)out.push(q);});}});}
  return out;}
/* toʻr (stagger — har ikkinchi qator yarim qadamga suriladi) */
function grid(rot,k,w,h,px,py,stagger){const bb=turf.bbox(rot),out=[];const W=(bb[2]-bb[0])/k.x,H=(bb[3]-bb[1])/k.y;
  const nx=Math.max(1,Math.floor((W+px-w)/px)+1),ny=Math.max(1,Math.floor((H+py-h)/py)+1);
  const ox=(W-((Math.max(1,Math.floor((W+px-w)/px)))-1)*px-w)/2,oy=(H-((Math.max(1,Math.floor((H+py-h)/py)))-1)*py-h)/2;
  for(let j=-1;j<ny;j++)for(let i=-1;i<nx;i++){const s=stagger&&(j&1)?px/2:0,x=bb[0]+(ox+i*px+s)*k.x,y=bb[1]+(oy+j*py)*k.y,r=rect(x,y,w,h,k);if(within(r,rot))out.push(r);}
  return out;}

/* ---------- generatsiya ---------- */
function layout(typ,T,rot,inner,k,fl,seis){
  const ng=normGap(fl,seis);
  if(typ==='hovli'){   // uchastkalar toʻri; uy uchastkaning koʻcha tomonida, chegaralardan ≥ edge
    const plots=grid(rot,k,T.plotW,T.plotD,T.plotW,T.plotD,false);
    return {polys:plots.map(p=>{const b=turf.bbox(p),w=Math.min(T.w,T.plotW-2*T.edge),d=Math.min(T.d,T.plotD-2*T.edge);return rect(b[0]+((T.plotW-w)/2)*k.x,b[1]+T.edge*k.y,w,d,k);}),gap:T.edge*2,why:'qoʻshni uchastka chegarasidan 3 m'};}
  if(typ==='taunhaus'){const p=rows(rot,k,T.d,ng.g,T.maxLen,T.endGap,T.unit*2);return {polys:p,gap:ng.g,why:ng.why};}
  if(typ==='seksiya'){const p=rows(rot,k,T.d,ng.g,T.maxLen,gapEnd(fl),T.d*1.5);return {polys:p,gap:ng.g,why:ng.why,end:gapEnd(fl)};}
  if(typ==='minora'){const s=T.a+ng.g;/* toʻgʻri toʻr: har ikki yoʻnalishda fasadlar orasi ≥ meʼyoriy masofa (diagonal yaqinlashuv yoʻq) */ return {polys:grid(rot,k,T.a,T.a,s,s,false),gap:ng.g,why:ng.why};}
  if(typ==='perimetr'){
    const hole=inset(rot,T.d);if(!hole)return {polys:[],gap:ng.g,why:ng.why,note:'kvartal perimetral binoga juda tor'};
    // hovli: qarama-qarshi ichki fasadlar orasi meʼyoriy masofadan kam boʻlmasin
    const hb=turf.bbox(hole),cw=(hb[2]-hb[0])/k.x,ch=(hb[3]-hb[1])/k.y,court=Math.min(cw,ch);
    if(court<ng.g)return {polys:[],gap:ng.g,why:ng.why,court,note:`hovli ${Math.round(court)} m — ${fl} qavat uchun kamida ${ng.g} m kerak`};
    let ring=diff(rot,hole);
    // uzun fasadlar o'tish joylari bilan bo'linadi (yongʻin, shamol oqimi — ShNQ 2.07.01-23, 49¹-band)
    const ib=turf.bbox(rot),W=(ib[2]-ib[0])/k.x,Hh=(ib[3]-ib[1])/k.y;
    const cut=(L,along)=>{const n=Math.ceil(L/T.maxLen)-1;for(let i=1;i<=n;i++){const t=i/(n+1);
      const r=along==='x'?turf.bboxPolygon([ib[0]+(t*W-T.pass/2)*k.x,ib[1]-1e-4,ib[0]+(t*W+T.pass/2)*k.x,ib[3]+1e-4])
                         :turf.bboxPolygon([ib[0]-1e-4,ib[1]+(t*Hh-T.pass/2)*k.y,ib[2]+1e-4,ib[1]+(t*Hh+T.pass/2)*k.y]);
      ring=diff(ring,r)||ring;}};
    if(W>T.maxLen)cut(W,'x');if(Hh>T.maxLen)cut(Hh,'y');
    return {polys:parts(ring).filter(p=>area(p)>T.d*T.d),gap:ng.g,why:ng.why,court};}
  return {polys:[],gap:0,why:''};}

function generate(block,g){
  const T=Object.assign({},TYP[g.typ]);if(!T.n)return null;
  const A=area(block);if(A<300)return null;
  const seis=g.seis!==false;
  const sb=g.sb??T.sb,inner=inset(block,sb);if(!inner)return {blds:[],fp:0,gfa:0,far:0,flAvg:0,capped:false,A,note:'chekinish juda katta',rules:[],warn:['Qizil chiziqdan chekinish kvartalga sigʻmaydi']};
  const c=turf.centroid(block).geometry.coordinates,k=dm(c[1]),rotA=90-mainBearing(block);
  const rot=turf.transformRotate(inner,rotA,{pivot:c});
  const back=f=>turf.transformRotate(f,-rotA,{pivot:c});
  const maxFl=Math.max(1,Math.round(g.fl??T.fl)),far=Math.max(.05,g.far??T.far),target=far*A;
  /* qavat soni: maqsadli FAR ga yetadigan eng past qavat; har qavatda masofa qayta hisoblanadi (baland — kengroq oraliq) */
  let best=null;
  const lo=Math.min(maxFl,g.typ==='hovli'?1:g.typ==='taunhaus'?2:g.typ==='minora'?9:3);
  for(let fl=lo;fl<=maxFl;fl++){const L=layout(g.typ,T,rot,inner,k,fl,seis);const fp=L.polys.reduce((a,p)=>a+area(p),0);
    const r={fl,L,fp,gfa:fp*fl};if(!best||r.gfa>best.gfa*1.001)best=r;if(r.gfa>=target){best=r;break;}}
  const L=best.L,fl=best.fl,polys=L.polys.map(back);
  const fp=polys.reduce((a,p)=>a+area(p),0),gfa=fp*fl;
  const blds=polys.map(p=>({f:turf.truncate(p,{precision:7}),fl}));
  const h=fl*FH,f=fire(h);
  const rules=[
    {t:'Qizil chiziqdan chekinish',v:sb+' m',src:SRC.d0328+' — magistralda shovqin boʻyicha'},
    g.typ==='hovli'?{t:'Uy — uchastka chegarasi',v:T.edge+' m',src:SRC.d0321}
      :{t:'Binolar orasi (uzun tomonlar)',v:L.gap+' m · '+L.why,src:L.why.startsWith('yong')?SRC.fire:L.why.startsWith('seys')?SRC.seis:SRC.d0321},
    L.end?{t:'Toretslar orasi',v:L.end+' m',src:SRC.d0321}:null,
    L.court!=null?{t:'Hovli (ichki fasadlar orasi)',v:Math.round(L.court)+' m',src:SRC.d0321}:null,
    g.typ!=='hovli'?{t:'Yongʻin oʻtish yoʻli',v:f.w+' m kenglik, devordan '+f.off+'–'+(f.off+3)+' m',src:SRC.fire}:null,
    {t:'Insolyatsiya',v:'linzada tekshiriladi (T)',src:SRC.ins},
    {t:'Tipologiya',v:T.n,src:T.an}].filter(Boolean);
  const warn=[];if(L.note)warn.push(L.note);
  if(gfa<target*.95)warn.push(fl>=maxFl?'Maks. qavat va meʼyoriy masofalar bilan maqsadli FAR ga yetib boʻlmaydi — FAR ni pasaytiring yoki tipologiyani almashtiring.':'Meʼyoriy masofalar bilan maqsadli FAR ga yetib boʻlmaydi.');
  if(seis&&g.typ!=='hovli')warn.push('Seysmik talab (2H) yoqilgan — Toshkent 8–9 ball. Aniq band matni tekshirilsin.');
  return {blds,fp,gfa,far:gfa/A,flAvg:blds.length?fl:0,capped:gfa<target*.95&&fl>=maxFl,A,rules,warn,note:L.note||''};}

const cache=new Map();
function gen(block,g){const key=JSON.stringify([block.geometry.coordinates,g]);if(cache.has(key))return cache.get(key);
  let r=null;try{r=generate(block,g);}catch(e){console.warn('[MR] gen',e);}
  cache.set(key,r);if(cache.size>400)cache.delete(cache.keys().next().value);return r;}
/* qoʻlda tahrirlangan binolar uchun bir xil koʻrsatkichlar */
function stats(block,blds){const A=area(block),fp=blds.reduce((a,x)=>a+area(x.f),0),gfa=blds.reduce((a,x)=>a+area(x.f)*x.fl,0);return {blds,fp,gfa,far:A?gfa/A:0,flAvg:fp?gfa/fp:0,capped:false,A};}
return {gen,TYP,FH,stats,mainBearing,NORM:{gapLong,gapEnd,fire,normGap,SRC}};
})();
