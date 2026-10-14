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

/* ---------- meʼyoriy minimumlar: ShNQ 2.07.01-23 ----------
   79-band, 2-jadval (3 va undan yuqori qavatli turar joy binolari orasidagi masofalar; H — yer sathidan eng yuqori qavat
   tomyopmasigacha):
     deraza bor uzun tomon ↔ deraza bor uzun tomon ........ Hmax · kй (kй — 2-ilova diagrammasi)
     deraza bor uzun tomon ↔ ён тарз (torets) .............. 2 · Hmax · 0,3
     derazali torets ↔ derazali torets ...................... (H1+H2) · 0,3*    (* — I–II oʻtga chidamlilik, ≥ 6 m)
     derazali ↔ derazasiz torets ............................ (H1+H2) · 0,25*;  derazasiz ↔ derazasiz — (H1+H2) · 0,15*
     yoʻl tarafdagi hudud chegarasigacha ..................... H · 0,25
     qoʻshni hudud chegarasigacha: uzun tomon H · kй/2, torets H · 0,25*
   Izohlar: 3 — yopiq ichki hovli fasadlari orasi Hmax · 2,3; 6 — koʻp qavatli bino ↔ yakka uy ≥ H; 8 — seysmik 8+ ball:
   uzun (parallel) tomonlar orasi ≥ 2 · Hmax. 18-bob, 56-jadval: I–III daraja, C0 binolar orasi ≥ 6 m (yongʻin).
   75-band: yakka uy-joy uchastkasi 400 m²; 66-band: UMN ≤ 4,5. 56-band: daha — koʻchalar bilan boʻlinmagan ≤ 10 ga. */
const SRC={
  t2:'ShNQ 2.07.01-23, 79-band, 2-jadval',
  ky:'ShNQ 2.07.01-23, 2-ilova (kй diagrammasi, 10° sektorlar — oʻqilishi tekshirilsin)',
  court:'ShNQ 2.07.01-23, 2-jadval, 3-izoh: yopiq ichki hovli fasadlari orasi Hmax · 2,3',
  road:'ShNQ 2.07.01-23, 2-jadval: yoʻl tarafdagi hudud chegarasigacha H · 0,25',
  seis:'ShNQ 2.07.01-23, 2-jadval, 8-izoh: seysmik 8 ball va undan yuqori — uzun tomonlar orasi ≥ 2 · Hmax',
  fire:'ShNQ 2.07.01-23, 641-band, 56-jadval: I–III daraja, C0 — kamida 6 m',
  fireHi:'ShNQ 2.01.02-04, 1-son oʻzgartirish, 1-ilova 3.10: 50 m dan baland binolarda yongʻin yoʻli ≥ 6 m, devordan 8–10 m; 3.12: front boʻylab har 100 m da oʻtish',
  ijs:'ShNQ 2.07.01-23, 75-band: yakka tartibdagi uy-joy uchastkasi 400 m²; 74-band: tomorqa ≥ 200 m²',
  umn:'ShNQ 2.07.01-23, 66-band: UMN (umumiy maydon / uchastka) 4,5 dan oshmasin',
  ins:'ShNQ 2.07.01-23, 78-band: masofalar SanQvaN 0331-16 insolyatsiya talablari bilan ham tekshiriladi (linza — T)'};
/* kй: fasad (deraza tomoni) normalining shimoldan burchagi; eng yaqin asosiy yoʻnalishdan ogʻish d (0–45°):
   d<5 → 1,2; <15 → 1,5; <25 → 1,7; <35 → 1,9; aks holda 2,3 (diagrammada har chorakda 9 ta 10° sektor). */
function ky(az){const a=((az%90)+90)%90,d=Math.min(a,90-a);return d<5?1.2:d<15?1.5:d<25?1.7:d<35?1.9:2.3;}
const fireMin=h=>h>=50?{w:6,off:8}:{w:0,off:0};
/* uzun tomonlar orasi: max(Hmax·kй, seysmik 2·Hmax, yongʻin) */
function normGap(fl,seis,az){const H=fl*FH,k=ky(az??0);let g=H*k,why='Hmax · kй ('+k+')',src='ky';
  if(fl<3){g=Math.max(6,g);}
  if(seis&&2*H>g){g=2*H;why='seysmik: 2 · Hmax';src='seis';}
  const f=fireMin(H);if(f.w&&2*f.off+f.w>g){g=2*f.off+f.w;why='yongʻin yoʻli (H ≥ 50 m)';src='fireHi';}
  if(g<6){g=6;why='yongʻin: ≥ 6 m';src='fire';}
  return {g:Math.round(g*10)/10,why,src,k};}
/* uzun tomon ↔ torets: 0,6 · Hmax; derazali toretslar: (H1+H2)·0,3 ≥ 6 */
function gapEnd(fl){const H=fl*FH;return Math.max(6,Math.round(2*H*.3*10)/10);}
function gapEndEnd(fl){const H=fl*FH;return Math.max(6,Math.round(2*H*.3*10)/10);}
const gapLong=(fl,az)=>normGap(fl,false,az).g;
const fire=h=>fireMin(h);

/* ---------- tipologiyalar: analoglardan olingan boshlangʻich parametrlar ---------- */
const TYP={
  hovli:   {n:'Hovli uylar', far:.25, fl:2, sb:3, plotW:16, plotD:25, w:12, d:10, edge:3,
            an:'Mahalla tipidagi yakka uy: uchastka 16 × 25 = 400 m² (ShNQ 2.07.01-23, 75-band); uyning oʻlchami — loyiha parametri'},
  ichki:   {n:'Ichki hovlili uy (mahalla)', far:.45, fl:2, sb:0, plotW:16, plotD:25, front:8, wing:4, side:3,
            an:'Vernakular hovli uy: koʻchaga qaragan old qanot + yon qanot, ichkarida hovli. Uchastka 400 m² (ShNQ 2.07.01-23, 75-band); uylar juft-juft (653-band), juftlar orasi ≥ 6 m (56-jadval). Qanot oʻlchamlari — loyiha taxmini'},
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
function layout(typ,T,rot,inner,k,fl,seis,az){
  const ng=normGap(fl,seis,az);
  if(typ==='hovli'){   // uchastkalar toʻri; uy uchastkaning koʻcha tomonida, chegaralardan ≥ edge
    const plots=grid(rot,k,T.plotW,T.plotD,T.plotW,T.plotD,false);
    return {polys:plots.map(p=>{const b=turf.bbox(p),w=Math.min(T.w,T.plotW-2*T.edge),d=Math.min(T.d,T.plotD-2*T.edge);return rect(b[0]+((T.plotW-w)/2)*k.x,b[1]+T.edge*k.y,w,d,k);}),gap:T.edge*2,why:'uchastka '+T.plotW+'×'+T.plotD+' m',src:'ijs'};}
  if(typ==='ichki'){   // juft uylar: umumiy devor bir tomonda, ikkinchi tomonda chegaradan T.side (juftlar orasi 2·side ≥ 6 m)
    const plots=grid(rot,k,T.plotW,T.plotD,T.plotW,T.plotD,false).sort((a,b)=>turf.bbox(a)[1]-turf.bbox(b)[1]||turf.bbox(a)[0]-turf.bbox(b)[0]);
    const rowKey=p=>Math.round(turf.bbox(p)[1]/(T.plotD*k.y));let prevRow=null,i=0;const out=[];
    plots.forEach(p=>{const r=rowKey(p);if(r!==prevRow){prevRow=r;i=0;}const b=turf.bbox(p),shL=(i%2)===1,x0=b[0]+(shL?0:T.side)*k.x,W=T.plotW-T.side,y0=b[1];i++;
      const wx=shL?x0:x0+(W-T.wing)*k.x;   // yon qanot umumiy devor tomonida
      const pts=shL?[[x0,y0],[x0+W*k.x,y0],[x0+W*k.x,y0+T.front*k.y],[x0+T.wing*k.x,y0+T.front*k.y],[x0+T.wing*k.x,y0+(T.plotD-6)*k.y],[x0,y0+(T.plotD-6)*k.y],[x0,y0]]
                   :[[x0,y0],[x0+W*k.x,y0],[x0+W*k.x,y0+(T.plotD-6)*k.y],[wx,y0+(T.plotD-6)*k.y],[wx,y0+T.front*k.y],[x0,y0+T.front*k.y],[x0,y0]];
      out.push(turf.polygon([pts]));});
    return {polys:out,gap:2*T.side,why:'juftlar orasi '+(2*T.side)+' m',src:'fire'};}
  if(typ==='taunhaus'){const p=rows(rot,k,T.d,ng.g,T.maxLen,Math.max(T.endGap,6),T.unit*2);return {polys:p,gap:ng.g,why:ng.why,src:ng.src};}
  if(typ==='seksiya'){const p=rows(rot,k,T.d,ng.g,T.maxLen,gapEndEnd(fl),T.d*1.5);return {polys:p,gap:ng.g,why:ng.why,src:ng.src,end:gapEndEnd(fl)};}
  if(typ==='minora'){const s=T.a+ng.g;/* toʻgʻri toʻr: har ikki yoʻnalishda fasadlar orasi ≥ meʼyoriy masofa (diagonal yaqinlashuv yoʻq) */ return {polys:grid(rot,k,T.a,T.a,s,s,false),gap:ng.g,why:ng.why,src:ng.src};}
  if(typ==='perimetr'){
    const hole=inset(rot,T.d);if(!hole)return {polys:[],gap:ng.g,why:ng.why,note:'kvartal perimetral binoga juda tor'};
    // hovli: qarama-qarshi ichki fasadlar orasi meʼyoriy masofadan kam boʻlmasin
    const hb=turf.bbox(hole),cw=(hb[2]-hb[0])/k.x,ch=(hb[3]-hb[1])/k.y,court=Math.min(cw,ch);
    const need=Math.round(fl*FH*2.3*10)/10;if(court<need)return {polys:[],gap:need,why:'yopiq hovli: Hmax · 2,3',src:'court',court,note:`hovli ${Math.round(court)} m — ${fl} qavat uchun kamida ${need} m kerak (Hmax · 2,3)`};
    let ring=diff(rot,hole);
    // uzun fasadlar o'tish joylari bilan bo'linadi (yongʻin, shamol oqimi — ShNQ 2.07.01-23, 49¹-band)
    const ib=turf.bbox(rot),W=(ib[2]-ib[0])/k.x,Hh=(ib[3]-ib[1])/k.y;
    const pass=Math.max(T.pass,gapEndEnd(fl));   // toretslar orasi (H1+H2) · 0,3
    const cut=(L,along)=>{const n=Math.ceil(L/T.maxLen)-1;for(let i=1;i<=n;i++){const t=i/(n+1);
      const r=along==='x'?turf.bboxPolygon([ib[0]+(t*W-pass/2)*k.x,ib[1]-1e-4,ib[0]+(t*W+pass/2)*k.x,ib[3]+1e-4])
                         :turf.bboxPolygon([ib[0]-1e-4,ib[1]+(t*Hh-pass/2)*k.y,ib[2]+1e-4,ib[1]+(t*Hh+pass/2)*k.y]);
      ring=diff(ring,r)||ring;}};
    if(W>T.maxLen)cut(W,'x');if(Hh>T.maxLen)cut(Hh,'y');
    return {polys:parts(ring).filter(p=>area(p)>T.d*T.d),gap:need,why:'yopiq hovli: Hmax · 2,3',src:'court',court};}
  return {polys:[],gap:0,why:''};}

function generate(block,g){
  const T=Object.assign({},TYP[g.typ]);if(!T.n)return null;
  const A=area(block);if(A<300)return null;
  const seis=g.seis!==false,sbU=g.sb??T.sb;
  const c=turf.centroid(block).geometry.coordinates,k=dm(c[1]),brg=mainBearing(block),rotA=90-brg,az=brg+90;   // uzun fasad kvartal yoʻnalishida, derazalar normal boʻyicha
  const back=f=>turf.transformRotate(f,-rotA,{pivot:c});
  /* qizil chiziqdan chekinish: foydalanuvchi qiymati va H · 0,25 dan kattasi (2-jadval, yoʻl tarafdagi chegara) */
  const ins={};const innerFor=fl=>{const sb=Math.max(sbU,Math.round(fl*FH*.25*10)/10);if(!(sb in ins)){const inn=inset(block,sb);ins[sb]=inn?{inner:inn,rot:turf.transformRotate(inn,rotA,{pivot:c}),sb}:null;}return ins[sb];};
  const maxFl=Math.max(1,Math.round(g.fl??T.fl)),far=Math.max(.05,g.far??T.far),target=far*A;
  /* qavat soni: maqsadli FAR ga yetadigan eng past qavat; har qavatda masofa va chekinish qayta hisoblanadi */
  let best=null;
  const lo=Math.min(maxFl,g.typ==='hovli'||g.typ==='ichki'?1:g.typ==='taunhaus'?2:g.typ==='minora'?9:3);
  for(let fl=lo;fl<=maxFl;fl++){const I=innerFor(fl);if(!I)break;const L=layout(g.typ,T,I.rot,I.inner,k,fl,seis,az);const fp=L.polys.reduce((a,p)=>a+area(p),0);
    const r={fl,L,fp,gfa:fp*fl,sb:I.sb};if(!best||r.gfa>best.gfa*1.001)best=r;if(r.gfa>=target){best=r;break;}}
  if(!best)return {blds:[],fp:0,gfa:0,far:0,flAvg:0,capped:false,A,note:'chekinish juda katta',rules:[],warn:['Qizil chiziqdan chekinish kvartalga sigʻmaydi']};
  const L=best.L,fl=best.fl,polys=L.polys.map(back);
  const fp=polys.reduce((a,p)=>a+area(p),0),gfa=fp*fl,H=fl*FH;
  const blds=polys.map(p=>({f:turf.truncate(p,{precision:7}),fl}));
  const rules=[
    {t:'Qizil chiziqdan chekinish',v:best.sb+' m'+(best.sb>sbU?' (H · 0,25)':''),src:SRC.road},
    g.typ==='hovli'?{t:'Yakka uy uchastkasi',v:L.why,src:SRC.ijs}
      :g.typ==='ichki'?{t:'Uylar orasi',v:L.why,src:'ShNQ 2.07.01-23, 653-band (juft uylar) va 56-jadval (≥ 6 m)'}
      :{t:'Binolar orasi (uzun tomonlar)',v:L.gap+' m · '+L.why,src:SRC[L.src]||SRC.t2},
    L.end?{t:'Derazali toretslar orasi',v:L.end+' m · (H1+H2) · 0,3, ≥ 6',src:SRC.t2}:null,
    L.court!=null?{t:'Hovli (ichki fasadlar orasi)',v:Math.round(L.court)+' m',src:SRC.court}:null,
    H>=50?{t:'Yongʻin yoʻli',v:'≥ 6 m kenglik, devordan 8–10 m; har 100 m da oʻtish',src:SRC.fireHi}:{t:'Yongʻin masofasi',v:'≥ 6 m',src:SRC.fire},
    {t:'UMN',v:'≤ 4,5',src:SRC.umn},
    {t:'Insolyatsiya',v:'linzada tekshiriladi (T)',src:SRC.ins},
    {t:'Tipologiya',v:T.n,src:T.an}].filter(Boolean);
  const warn=[];if(L.note)warn.push(L.note);
  if(gfa<target*.95)warn.push(fl>=maxFl?'Maks. qavat va meʼyoriy masofalar bilan maqsadli FAR ga yetib boʻlmaydi — FAR ni pasaytiring yoki tipologiyani almashtiring.':'Meʼyoriy masofalar bilan maqsadli FAR ga yetib boʻlmaydi.');
  if(gfa/A>4.5)warn.push('UMN 4,5 dan oshdi (ShNQ 2.07.01-23, 66-band).');
  if(seis&&g.typ!=='hovli'&&g.typ!=='ichki')warn.push('Seysmik hudud (8+ ball): uzun tomonlar orasi ≥ 2 · Hmax (2-jadval, 8-izoh).');
  return {blds,fp,gfa,far:gfa/A,flAvg:blds.length?fl:0,capped:gfa<target*.95&&fl>=maxFl,A,rules,warn,note:L.note||''};}

const cache=new Map();
function gen(block,g){const key=JSON.stringify([block.geometry.coordinates,g]);if(cache.has(key))return cache.get(key);
  let r=null;try{r=generate(block,g);}catch(e){console.warn('[MR] gen',e);}
  cache.set(key,r);if(cache.size>400)cache.delete(cache.keys().next().value);return r;}
/* qoʻlda tahrirlangan binolar uchun bir xil koʻrsatkichlar */
function stats(block,blds){const A=area(block),fp=blds.reduce((a,x)=>a+area(x.f),0),gfa=blds.reduce((a,x)=>a+area(x.f)*x.fl,0);return {blds,fp,gfa,far:A?gfa/A:0,flAvg:fp?gfa/fp:0,capped:false,A};}
return {gen,TYP,FH,stats,mainBearing,NORM:{ky,gapLong,gapEnd,gapEndEnd,fire,normGap,SRC}};
})();
