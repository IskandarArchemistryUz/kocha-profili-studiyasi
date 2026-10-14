/* Archemistry Lab — Master reja muharriri: tekshiruv linzalari (5-bosqich).
   Quyosh holati, soyalar, fasad insolyatsiyasi va binolar orasidagi masofalar — faqat geometriya.
   Meʼyoriy qiymatlar (soat, metr) bu yerda YOʻQ: ularni foydalanuvchi ShNQ dan kiritadi
   (Joylashtirish boʻlimidagi kabi) — modul faqat oʻlchaydi va kiritilgan talab bilan solishtiradi.
   Koordinatalar: kirishda [lng, lat]; hisob ichida mahalliy metr tekisligi (x — sharq, y — shimol). */
window.MRCHK=(function(){
'use strict';
const R=Math.PI/180;
const TZ=5;   // Toshkent vaqti, UTC+5 (yozgi vaqt yoʻq)

/* Quyosh holati — NOAA soddalashtirilgan algoritmi (Astronomical Almanac, aniqlik ~0,01°).
   md: 'MM-DD', h: mahalliy soat (UTC+5). Qaytaradi: alt (balandlik, rad), az (shimoldan soat yoʻnalishida, rad). */
function sun(md,h,lat,lng){const [m,d]=md.split('-').map(Number);
  const ms=Date.UTC(2026,m-1,d)+(h-TZ)*3600e3,n=ms/864e5+2440587.5-2451545;
  const g=(357.529+0.98560028*n)*R,q=280.459+0.98564736*n,L=(q+1.915*Math.sin(g)+0.020*Math.sin(2*g))*R,e=(23.439-0.00000036*n)*R;
  const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L));
  const gmst=((18.697374558+24.06570982441908*n)%24+24)%24,H=(gmst*15+lng)*R-ra,la=lat*R;
  const alt=Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(H));
  const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(la)-Math.tan(dec)*Math.cos(la))+Math.PI;
  return {alt,az};}
/* quyosh chiqishi/botishi (mahalliy soat) — 1 daqiqa aniqlikda qidirish */
function dayLen(md,lat,lng){let a=null,b=null;for(let h=3;h<=22;h+=1/60){const s=sun(md,h,lat,lng);if(s.alt>0){if(a==null)a=h;b=h;}}return [a,b];}

/* mahalliy metr tekisligi */
function frame(lat0,lng0){const kx=111320*Math.cos(lat0*R),ky=110540;
  return {xy:p=>[(p[0]-lng0)*kx,(p[1]-lat0)*ky],ll:p=>[lng0+p[0]/kx,lat0+p[1]/ky]};}

/* ---------- soyalar ---------- */
/* bino: {cs:[[ [lng,lat]… ]], h}. Har qirra uchun «qirra + uning soyasi» toʻrtburchagi; bino ichi ham qoʻshiladi.
   Birlashtirish — turf.union (bir chaqiruvda); xato boʻlsa — birlashtirilmagan toʻplam. */
function shadows(blds,s,F){if(!(s.alt>0.01))return null;const L0=1/Math.tan(s.alt),ux=-Math.sin(s.az),uy=-Math.cos(s.az),out=[];
  blds.forEach(b=>{const L=Math.min(b.h*L0,600),dx=ux*L,dy=uy*L;
    b.cs.forEach((ring,ri)=>{const P=ring.map(F.xy);for(let i=0;i<P.length-1;i++){const a=P[i],c=P[i+1];
      out.push(turf.polygon([[a,c,[c[0]+dx,c[1]+dy],[a[0]+dx,a[1]+dy],a].map(F.ll)]));}});
    out.push(turf.polygon(b.cs));});
  if(!out.length)return null;
  try{const u=turf.union(turf.featureCollection(out.map(f=>turf.truncate(f,{precision:7}))));if(u)return turf.featureCollection([u]);}catch(e){console.warn('[MR] soya union',e);}
  return turf.featureCollection(out);}

/* ---------- geometriya ---------- */
function segPt(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));const q=[a[0]+t*dx,a[1]+t*dy];return [Math.hypot(p[0]-q[0],p[1]-q[1]),q];}
/* ikki halqa orasidagi eng qisqa masofa (kesishmasa) */
function ringDist(A,B){let best=[Infinity,null,null];for(let i=0;i<A.length-1;i++)for(let j=0;j<B.length-1;j++){let [d,q]=segPt(A[i],B[j],B[j+1]);if(d<best[0])best=[d,A[i],q];[d,q]=segPt(B[j],A[i],A[i+1]);if(d<best[0])best=[d,q,B[j]];}return best;}
function bbox(P){let a=[Infinity,Infinity,-Infinity,-Infinity];P.forEach(p=>{a[0]=Math.min(a[0],p[0]);a[1]=Math.min(a[1],p[1]);a[2]=Math.max(a[2],p[0]);a[3]=Math.max(a[3],p[1]);});return a;}
const bbGap=(a,b)=>Math.hypot(Math.max(0,a[0]-b[2],b[0]-a[2]),Math.max(0,a[1]-b[3],b[1]-a[3]));

/* ---------- masofalar ---------- */
/* opts: {dmin, dk} — talab = max(dmin, dk × balandroq bino balandligi). Ikkalasi boʻsh boʻlsa talab yoʻq (ok=null).
   Natija: har bino uchun eng yaqin qoʻshni + talabni buzgan barcha juftlar. */
function distances(blds,F,opts){const M=blds.map(b=>{const P=b.cs[0].map(F.xy);return {P,bb:bbox(P)};}),all=[];
  const reqOf=(i,j)=>{let r=0;if(+opts.dmin)r=+opts.dmin;if(+opts.dk)r=Math.max(r,+opts.dk*Math.max(blds[i].h,blds[j].h));return r;};
  for(let i=0;i<blds.length;i++)for(let j=i+1;j<blds.length;j++){if(bbGap(M[i].bb,M[j].bb)>120)continue;
    const [d,a,c]=ringDist(M[i].P,M[j].P),req=reqOf(i,j);all.push({i,j,d,a:F.ll(a),c:F.ll(c),req,ok:req?d>=req:null});}
  const keep=new Set();blds.forEach((_,k)=>{let m=null;all.forEach(o=>{if((o.i===k||o.j===k)&&(!m||o.d<m.d))m=o;});if(m)keep.add(m);});
  all.forEach(o=>{if(o.ok===false)keep.add(o);});
  return {pairs:[...keep],all};}

/* ---------- fasad insolyatsiyasi ---------- */
/* Turar joy binolari fasadlari boʻylab nuqtalar (qadam opts.step m, birinchi qavat deraza sathi opts.wz m),
   har 10 daqiqada quyosh: fasad quyoshga qaraganmi va nur boshqa binoga (shu jumladan oʻziga) toʻsilmaydimi.
   Natija: har nuqta uchun eng uzun uzluksiz va jami quyoshli vaqt (soat). */
function rayHit(p,u,P){let tmin=Infinity;for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],ex=b[0]-a[0],ey=b[1]-a[1],den=u[0]*ey-u[1]*ex;if(Math.abs(den)<1e-12)continue;
  const t=((a[0]-p[0])*ey-(a[1]-p[1])*ex)/den,s2=((a[0]-p[0])*u[1]-(a[1]-p[1])*u[0])/den;if(t>.05&&s2>=0&&s2<=1&&t<tmin)tmin=t;}return tmin;}
function insolation(blds,F,o){const step=10/60,wz=+o.wz||0,sp=Math.max(3,+o.step||8);
  const [sr,ss]=dayLen(o.md,o.lat,o.lng);if(sr==null)return {pts:[],sr,ss};
  const suns=[];for(let h=sr;h<=ss;h+=step){const s=sun(o.md,h+step/2,o.lat,o.lng);if(s.alt>0)suns.push({h,u:[Math.sin(s.az),Math.cos(s.az)],ta:Math.tan(s.alt)});}
  const OB=blds.map(b=>{const P=b.cs.map(r=>r.map(F.xy));const bb=bbox(P[0]);return {P,h:b.h,bb,c:[(bb[0]+bb[2])/2,(bb[1]+bb[3])/2],r:Math.hypot(bb[2]-bb[0],bb[3]-bb[1])/2};});
  const pts=[];
  blds.forEach((b,bi)=>{if(!b.res)return;const near=OB.filter(x=>bbGap(x.bb,OB[bi].bb)<400);
    OB[bi].P.forEach((ring,ri)=>{let sa=0;for(let i=0;i<ring.length-1;i++)sa+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
      const outCcw=ri===0?sa>0:sa<0;   // tashqi halqada tashqariga, ichki halqada (hovli) — hovliga qarab
      for(let e=0;e<ring.length-1;e++){const a=ring[e],c=ring[e+1],ex=c[0]-a[0],ey=c[1]-a[1],Le=Math.hypot(ex,ey);if(Le<3)continue;
        const nx=(outCcw?ey:-ey)/Le,ny=(outCcw?-ex:ex)/Le,k=Math.max(1,Math.round(Le/sp));
        for(let s=0;s<k;s++){const f=(s+.5)/k,p=[a[0]+ex*f+nx*.2,a[1]+ey*f+ny*.2];let run=0,best=0,tot=0,st0=null,bs=null,be=null;
          suns.forEach(S=>{let lit=S.u[0]*nx+S.u[1]*ny>0.02;
            if(lit)for(const x of near){if((x.c[0]-p[0])*S.u[0]+(x.c[1]-p[1])*S.u[1]<-x.r)continue;let t=Infinity;for(const r of x.P){const q=rayHit(p,S.u,r);if(q<t)t=q;}
              if(t<Infinity&&wz+t*S.ta<x.h){lit=false;break;}}
            if(lit){if(!run)st0=S.h;run+=step;tot+=step;if(run>best){best=run;bs=st0;be=S.h+step;}}else run=0;});
          pts.push({bi,ll:F.ll(p),best,tot,bs,be});}}});});
  return {pts,sr,ss};}

const hm=h=>{if(h==null)return '—';const m=Math.round(h*60);return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');};
return {sun,dayLen,frame,shadows,distances,insolation,hm,TZ};
})();
