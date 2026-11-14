/* Koʻchasoz — chorraha harakat modeli (istalgan geometriya).
 * Kirish: muharrirdagi boʻlaklar va boʻlak ulagichlari (laneConnections) — metrlarda, x sharq, y shimol.
 * Mikro: IDM (ergashish), svetofor fazalari, ulagichlar kesishgan nuqtalarda yoʻl berish:
 *   - chapga buriluvchi qarshidan kelayotgan toʻgʻri/oʻngga ketuvchiga yoʻl beradi (YHQ 99-band);
 *   - svetoforsiz chorrahada oʻngdan kelayotganga yoʻl beriladi (teng ahamiyatli chorraha);
 *   - chorrahaga avval kirgan / kesishuvni egallab turgan oʻtadi (103-band); qoʻshilish nuqtasi ham kesishuv.
 * Brauzerda ham (muharrir), Node'da ham (vitest) ishlaydi — tashqi bogʻliqlik yoʻq.
 *
 * net = {
 *   arms:  [{id, sig?:bool, hin:[x,y], lanes:[{id, pts:[[x,y]..], codes:'LS'}], exits:[{id, pts}]}],
 *   conns: [{id, from:laneId, to:exitId, m:'L'|'S'|'R', pts:[[x,y]..]}],
 *   signal?: {cycle, phases:[[armId..],..]}   // yoʻq boʻlsa — svetoforsiz
 * }
 */
const IDM={a:1.5,b:2.0,T:1.3,s0:2.0,d:4},LEN=4.6,V0=13.9,ALAT=2.2,AMBER=3,ALLRED=2;

function mulberry(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]),unit2=(a,b)=>{const d=dist(a,b)||1;return [(b[0]-a[0])/d,(b[1]-a[1])/d];};
function cum(pts){const c=[0];for(let i=1;i<pts.length;i++)c.push(c[i-1]+dist(pts[i-1],pts[i]));return c;}
export function pointAt(pts,c,s){if(s<=0)return pts[0];const L=c[c.length-1];if(s>=L)return pts[pts.length-1];
  let i=1;while(c[i]<s)i++;const t=(s-c[i-1])/(c[i]-c[i-1]||1),a=pts[i-1],b=pts[i];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[1]-a[1],b[0]-a[0])];}
/* ikki siniq chiziq kesishuvlari: [{sa,sb}] */
function crossings(P,cP,Q,cQ){const out=[];
  for(let i=1;i<P.length;i++)for(let j=1;j<Q.length;j++){const a=P[i-1],b=P[i],c=Q[j-1],d=Q[j];
    const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)continue;
    const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;
    if(t>=0&&t<=1&&u>=0&&u<=1)out.push({sa:cP[i-1]+t*(cP[i]-cP[i-1]),sb:cQ[j-1]+u*(cQ[j]-cQ[j-1])});}
  return out;}
/* egrilik boʻyicha xavfsiz tezlik: v = sqrt(a_lat · R) */
function curveSpeed(pts){let rmin=1e9;for(let i=1;i<pts.length-1;i++){const a=pts[i-1],b=pts[i],c=pts[i+1];
  const A=dist(a,b),B=dist(b,c),C=dist(a,c),ar=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;if(ar<1e-6)continue;rmin=Math.min(rmin,A*B*C/(4*ar));}
  return Math.min(V0,Math.sqrt(ALAT*rmin));}

/* 4 va undan koʻp qoʻlli chorrahada qarama-qarshi qoʻllar bitta fazada; qolganlari alohida.
   opt.protLeft: true | Set(juftlik kaliti 'a|b') — qarama-qarshi juftlikka avval himoyalangan chap faza (faqat ↰), keyin umumiy faza (chap ruxsat etilgan holda ham oʻtadi).
   Faza: [armId..] yoki {arms:[..], mv:{armId:'L'}} — mv boʻlsa, faqat shu harakatlarga yashil. */
export function autoPhases(arms,opt={}){const used=new Set(),ph=[];
  const hasL=a=>a.lanes.some(l=>!l.bus&&(!l.codes||l.codes.includes('L')));
  arms.forEach(a=>{if(used.has(a.id))return;used.add(a.id);let best=null,bc=-.6;
    arms.forEach(b=>{if(used.has(b.id))return;const c=a.hin[0]*b.hin[0]+a.hin[1]*b.hin[1];if(c<bc){bc=c;best=b;}});
    if(best){used.add(best.id);const pl=opt.protLeft===true||(opt.protLeft instanceof Set&&(opt.protLeft.has(a.id+'|'+best.id)||opt.protLeft.has(best.id+'|'+a.id)));
      if(pl&&(hasL(a)||hasL(best))){const mv={};[a,best].forEach(x=>{if(hasL(x))mv[x.id]='LU';});ph.push({arms:Object.keys(mv),mv});}
      ph.push([a.id,best.id]);}else ph.push([a.id]);});
  return ph;}
/* qarama-qarshi juftliklar: [[a,b],..] (autoPhases bilan bir xil tartib) */
export function opposingPairs(arms){const used=new Set(),out=[];
  arms.forEach(a=>{if(used.has(a.id))return;used.add(a.id);let best=null,bc=-.6;
    arms.forEach(b=>{if(used.has(b.id))return;const c=a.hin[0]*b.hin[0]+a.hin[1]*b.hin[1];if(c<bc){bc=c;best=b;}});
    if(best){used.add(best.id);out.push([a,best]);}});return out;}
/* Webster (1958): optimal sikl C0=(1.5·L+5)/(1−Y), yashil Y_i ulushiga mutanosib.
   flows: {armId: avt/soat}, shares: {L,S,R}; toʻyinish oqimi 1400 avt/soat/boʻlak va fazaga 7 s yoʻqotish (sariq+qizil+start) — model ichidagi siklni aylantirib tekshirilgan qiymatlar; piyoda uchun eng kam yashil 7 s + oʻtish uzunligi/1,2 m/s. Qaytaradi {cycle, split:[..], Y} */
export function webster(arms,phases,flows,shares,opt={}){const S0=opt.sat||1400,lost=AMBER+ALLRED+2,byId={};arms.forEach(a=>byId[a.id]=a);
  const P=phases.map(p=>Array.isArray(p)?{arms:p,mv:null}:p),prot=new Set();P.forEach(p=>{if(p.mv)Object.keys(p.mv).forEach(k=>prot.add(k));});
  const gen=a=>a.lanes.filter(l=>!l.bus),has=(l,m)=>!l.codes||l.codes.includes(m);
  /* ruxsat etilgan chap: qarshi oqim Vo dagi boʻshliqlardan oʻtish sigʻimi (tc=4,5 s, tf=2,5 s), yashil soatiga */
  const capL=Vo=>{const v=Vo/3600;return v<1e-6?S0:Math.min(S0,3600*v*Math.exp(-v*4.5)/(1-Math.exp(-v*2.5)));};
  const shOf=id=>(opt.armShares&&opt.armShares[id])||shares;
  const yOf=(p,id)=>{const a=byId[id];if(!a)return 0;const q=flows[id]||0,L=gen(a),mv=p.mv?p.mv[id]:null,shares=shOf(id);
    if(mv)return q*(shares.L||0)/(S0*.95*(L.filter(l=>has(l,'L')).length||1));                     // himoyalangan chap
    const qL=prot.has(id)?0:q*(shares.L||0),qT=q*((shares.S||0)+(shares.R||0));
    const opp=p.arms.filter(o=>o!==id).map(o=>byId[o]).find(o=>o&&o.hin[0]*a.hin[0]+o.hin[1]*a.hin[1]<-.6);
    const so=shOf(opp?opp.id:id),Vo=opp?(flows[opp.id]||0)*((so.S||0)+(so.R||0)):0,cL=capL(Vo),dL=L.filter(l=>l.codes==='L'),oth=L.filter(l=>l.codes!=='L');
    if(dL.length&&oth.length)return Math.max(qL/(cL*dL.length),qT/(S0*oth.length));                  // alohida chap boʻlak
    return (qT+qL*S0/Math.max(60,cL))/(S0*(L.length||1));};                                       // umumiy boʻlak: chap ekvivalenti
  const ys=P.map(p=>Math.max(0,...p.arms.map(id=>yOf(p,id))));
  /* piyoda: faza davomida yopiq qoʻllar boʻylab oʻtadi → eng kam yashil */
  const xl=a=>a&&a.cross?Math.hypot(a.cross[1][0]-a.cross[0][0],a.cross[1][1]-a.cross[0][1]):0;
  const gmin=P.map(p=>p.mv?(opt.minG||8):Math.max(opt.minG||8,...arms.filter(a=>!p.arms.includes(a.id)).map(a=>xl(a)?7+xl(a)/1.2:0)));
  const Y=ys.reduce((s,y)=>s+y,0),Lt=phases.length*(AMBER+ALLRED),raw=Y<.92?(1.5*phases.length*lost+5)/(1-Y):150,need=gmin.reduce((s,g)=>s+g,0)+Lt;
  const cycle=Math.round(Math.min(opt.max||150,Math.max(opt.min||(phases.length>2?60:40),raw,need))/5)*5,G=cycle-Lt;
  let split=ys.map(y=>Y>0?y/Y:1/ys.length);split=split.map((w,i)=>Math.max(gmin[i]/G,w));const sw=split.reduce((s,w)=>s+w,0);split=split.map(w=>w/sw);
  return {cycle,split,Y:+Y.toFixed(3)};}

/* Boʻlak ulagichlari (muharrirdagi laneConnections bilan bir xil qoida):
   kiruvchi boʻlak strelkasi (codes) boʻyicha; chapga — chap chetga, oʻngga — oʻng chetga, toʻgʻri — koʻndalang siljish eng kam.
   arms[].lanes va arms[].exits chapdan oʻngga tartiblangan; boʻlak oxiri — toʻxtash chizigʻi, chiqish boshi — pts[0].
   yUp: koordinata oʻqi y yuqoriga (xarita) yoki pastga (SVG). */
export function autoConnect(arms,yUp=true){const conns=[],cr=(h,v)=>(h[0]*v[1]-h[1]*v[0])*(yUp?1:-1),th=(h,v)=>Math.atan2(cr(h,v),h[0]*v[0]+h[1]*v[1]);
  arms.forEach(e=>{if(!e.lanes.length)return;const tg={};
    arms.forEach(f=>{if(f===e||!f.exits.length)return;const out=[-f.hin[0],-f.hin[1]],t=th(e.hin,out),c=Math.abs(t)<=.61?'S':t>0?'L':'R';
      const sc=c==='S'?-Math.abs(t):c==='L'?-Math.abs(t-Math.PI/2):-Math.abs(t+Math.PI/2);if(!tg[c]||sc>tg[c].sc)tg[c]={f,sc};});
    ['L','S','R'].forEach(m=>{const T=tg[m];if(!T)return;const all=e.lanes.filter(l=>(l.codes||'').includes(m)),ED=T.f.exits;if(!all.length||!ED.length)return;
      const gD=ED.filter(d=>!d.bus),bD=ED.filter(d=>d.bus),pairs=[];
      const map2=(src,D)=>{if(!src.length||!D.length)return;const ns=src.length,nd=D.length;
        if(m==='L')src.forEach((l,i)=>pairs.push([l,D[Math.min(i,nd-1)]]));
        else if(m==='R')src.forEach((l,i)=>pairs.push([l,D[Math.max(0,nd-ns+i)]]));
        else{let best=null;for(let sh=Math.min(0,nd-ns);sh<=Math.max(0,nd-ns);sh++){let c=0;src.forEach((l,i)=>{c+=Math.abs(Math.abs(l.mid||0)-Math.abs(D[Math.max(0,Math.min(nd-1,i+sh))].mid||0));});if(!best||c<best.c-1e-9)best={c,sh};}
          src.forEach((l,i)=>pairs.push([l,D[Math.max(0,Math.min(nd-1,i+best.sh))]]));}};
      map2(all.filter(l=>!l.bus),gD.length?gD:ED);                                  // umumiy boʻlaklar avtobus boʻlagiga tushmaydi
      if(m==='S')map2(all.filter(l=>l.bus),bD.length?bD:gD.slice(-1));             // avtobus boʻlagi — avtobus boʻlagiga (boʻlmasa oʻng chetga)
      pairs.forEach(([l,d])=>{const A=l.pts[l.pts.length-1],B=d.pts[0];conns.push({id:'c'+conns.length,from:l.id,to:d.id,m,pts:connPath(A,e.hin,B,[-T.f.hin[0],-T.f.hin[1]])});});});
    /* qayrilish (↶, YHQ 99/107): «U» strelkali eng chap boʻlakdan oʻz koʻchasining chiqishiga; burilish diametri ≥ 7 m boʻladigan eng yaqin chiqish boʻlagi */
    const uL=e.lanes.filter(l=>!l.bus&&(l.codes||'').includes('U'))[0],uD=e.exits.filter(d=>!d.bus);
    if(uL&&uD.length){const A=uL.pts[uL.pts.length-1],h=e.hin,n=[-h[1],h[0]],w=d=>(d.pts[0][0]-A[0])*n[0]+(d.pts[0][1]-A[1])*n[1];
      const D=[...uD].sort((p,q)=>Math.abs(w(p))-Math.abs(w(q))),d=D.find(x=>Math.abs(w(x))>=7)||D[D.length-1];
      conns.push({id:'c'+conns.length,from:uL.id,to:d.id,m:'U',pts:uPath(A,h,d.pts[0])});}});
  return conns;}
/* qayrilish yoʻli: chorraha ichiga toʻgʻri kirish + yarim aylana (diametr = boʻlaklar orasidagi koʻndalang masofa) + chiqish boʻlagiga qaytish */
export function uPath(A,h,B){const n0=[-h[1],h[0]],w=(B[0]-A[0])*n0[0]+(B[1]-A[1])*n0[1],sg=w<0?-1:1,n=[n0[0]*sg,n0[1]*sg],W=Math.abs(w),R=Math.max(W/2,.5);
  const da=(B[0]-A[0])*h[0]+(B[1]-A[1])*h[1],d1=Math.max(da,0)+3,P1=[A[0]+h[0]*d1,A[1]+h[1]*d1],C=[P1[0]+n[0]*R,P1[1]+n[1]*R],P=[A];
  for(let k=0;k<=18;k++){const t=Math.PI*k/18,c=Math.cos(t),si=Math.sin(t);P.push([C[0]-n[0]*R*c+h[0]*R*si,C[1]-n[1]*R*c+h[1]*R*si]);}
  P.push(B);return P;}
/* toʻgʻri kesma + aylana yoyi + toʻgʻri kesma (boʻlaklarga urinma); deyarli parallel boʻlsa — kubik egri */
export function connPath(A,ha,B,hb){const den=ha[0]*(-hb[1])-ha[1]*(-hb[0]);
  if(Math.abs(den)>1e-6){const dx=B[0]-A[0],dy=B[1]-A[1],t1=(dx*(-hb[1])-dy*(-hb[0]))/den,t2=(dx*ha[1]-dy*ha[0])/den;
    if(t1>.3&&t2>.3){const X=[A[0]+ha[0]*t1,A[1]+ha[1]*t1],u1=[-ha[0],-ha[1]],u2=hb,phi=Math.acos(Math.max(-1,Math.min(1,u1[0]*u2[0]+u1[1]*u2[1])));
      if(phi>Math.PI-.03)return [A,B];
      const td=Math.min(t1,t2),r=td*Math.tan(phi/2),T1=[X[0]+u1[0]*td,X[1]+u1[1]*td],T2=[X[0]+u2[0]*td,X[1]+u2[1]*td];
      const bx=u1[0]+u2[0],by=u1[1]+u2[1],bl=Math.hypot(bx,by)||1,dc=r/Math.sin(phi/2),C=[X[0]+bx/bl*dc,X[1]+by/bl*dc];
      const a1=Math.atan2(T1[1]-C[1],T1[0]-C[0]);let da=Math.atan2(T2[1]-C[1],T2[0]-C[0])-a1;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
      const P=[A,T1],nn=Math.max(6,Math.ceil(Math.abs(da)/.08));for(let k=1;k<nn;k++){const t=a1+da*k/nn;P.push([C[0]+r*Math.cos(t),C[1]+r*Math.sin(t)]);}P.push(T2,B);return P;}}
  const D=Math.hypot(B[0]-A[0],B[1]-A[1])*.42,c1=[A[0]+ha[0]*D,A[1]+ha[1]*D],c2=[B[0]-hb[0]*D,B[1]-hb[1]*D],P=[];
  for(let k=0;k<=24;k++){const t=k/24,m=1-t;P.push([m*m*m*A[0]+3*m*m*t*c1[0]+3*m*t*t*c2[0]+t*t*t*B[0],m*m*m*A[1]+3*m*m*t*c1[1]+3*m*t*t*c2[1]+t*t*t*B[1]]);}return P;}

/* Aylanma halqa: har harakat — kirish egri + halqa yoyi + chiqish egri (bitta ulagich).
   Oʻng tomonlama harakat — soat miliga qarshi (dunyo koordinatasida); y pastga boʻlsa burchak kamayadi.
   ring = {c:[x,y], r: halqa oʻqi radiusi}. Qaytariladi: conns (+ har biriga ring: {a0, sweep, sE, sX} — kirish/chiqish burchagi va yoyi). */
export function ringConnect(arms,ring,yUp=true){const base=autoConnect(arms,yUp),dir=yUp?1:-1,C=ring.c,R=ring.r,off=0.42;
  const ang=p=>Math.atan2(p[1]-C[1],p[0]-C[0]),at=a=>[C[0]+R*Math.cos(a),C[1]+R*Math.sin(a)];
  const byId={};arms.forEach(a=>{a.lanes.forEach(l=>byId[l.id]=l);a.exits.forEach(x=>byId[x.id]=x);});
  return base.map(c=>{const A=byId[c.from].pts[byId[c.from].pts.length-1],B=byId[c.to].pts[0];
    const aE=ang(A)+dir*off,aX=ang(B)-dir*off;let sw=(aX-aE)*dir;while(sw<=0.05)sw+=2*Math.PI;while(sw>2*Math.PI)sw-=2*Math.PI;
    const n=Math.max(4,Math.ceil(sw/0.12)),arc=[];for(let k=0;k<=n;k++)arc.push(at(aE+dir*sw*k/n));
    let P=[A].concat(arc,[B]);for(let it=0;it<3;it++){const q=[P[0]];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];q.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);}q.push(P[P.length-1]);P=q;}
    return {...c,pts:P,ring:{aE,sw}};});}

/* Tarmoq: bir yoki bir nechta chorraha.
   net = { arms, conns, juncs?: [{id, signal?, ring?, main?:[armId]}], links?: [{from: chiqishId, to: [boʻlakId..]}], yUp }
   arms[].j — chorraha id (yoʻq boʻlsa — yagona 'J', net.signal/net.ring/net.main bilan).
   links: J1 ning chiqish boʻlagi → J2 ning kiruvchi boʻlaklari (boʻlak almashtirish oraligʻi bilan); shunday qoʻllarga tashqi talab berilmaydi. */
export class GraphSim{
  constructor(net,opt={}){
    this.o={demand:{},shares:{L:.2,S:.65,R:.15},seed:1,...opt};this.rnd=mulberry(this.o.seed);this.t=0;this.V=[];this.nid=1;this.done=[];this.pend={};this.pass=[];
    this.yUp=net.yUp!==false;
    const JJ=net.juncs&&net.juncs.length?net.juncs:[{id:'J',signal:net.signal||null,ring:net.ring||null,main:net.main||[]}];
    this.J={};JJ.forEach(j=>{const J={id:j.id,sig:j.signal||null,ring:j.ring||null,main:new Set(j.main||[]),stop:new Set(j.stop||[]),rtor:!!j.rtor};
      if(J.sig){const ph=J.sig.phases.map(p=>Array.isArray(p)?{arms:p,mv:null}:{arms:p.arms,mv:p.mv||null}),C=J.sig.cycle,n=ph.length,G=C-n*(AMBER+ALLRED),
        sp=J.sig.split&&J.sig.split.length===n?J.sig.split:ph.map(()=>1/n),off=J.sig.offset||0;let t0=off;
        J.plan=ph.map((p,k)=>{const g=Math.max(5,G*sp[k]),r={...p,t0,g};t0+=g+AMBER+ALLRED;return r;});}
      this.J[j.id]=J;});
    const J0=JJ[0].id;
    this.arms=net.arms.map(a=>({...a,j:a.j||J0}));this.armById={};this.arms.forEach(a=>this.armById[a.id]=a);
    /* bitta chorrahali eski API uchun */
    const j0=this.J[J0];this.sig=j0.sig;this.plan=j0.plan;this.ring=Object.keys(this.J).length===1?j0.ring:null;this.main=j0.main;
    this.link={};const add=(id,pts,kind,arm,extra)=>{const c=cum(pts);this.link[id]={id,pts,c,len:c[c.length-1],kind,arm,j:arm?this.armById[arm].j:null,...extra};};
    this.arms.forEach(a=>{a.lanes.forEach(l=>add(l.id,l.pts,'in',a.id,{codes:l.codes,bus:!!l.bus}));a.exits.forEach(x=>add(x.id,x.pts,'out',a.id,{bus:!!x.bus}));});
    this.conns=net.conns.map(c=>{const fr=this.link[c.from],arm=fr.arm,J=this.J[fr.j];add(c.id,c.pts,'conn',arm,{m:c.m,to:c.to,vmax:c.ring&&J.ring?Math.min(V0,Math.sqrt(ALAT*J.ring.r*1.3)):curveSpeed(c.pts)});return {...c,arm,j:fr.j};});
    /* boʻlak almashtirish: chiqish → keyingi chorraha boʻlaklari */
    this.down={};this.fed=new Set();
    (net.links||[]).forEach(L=>{const ex=this.link[L.from];if(!ex)return;const A=ex.pts[ex.pts.length-1],ha=unit2(ex.pts[ex.pts.length-2],A);
      (L.to||[]).forEach(t=>{const ln=this.link[t];if(!ln)return;this.fed.add(ln.arm);const B=ln.pts[0],hb=unit2(B,ln.pts[1]),id=L.from+'>'+t;
        add(id,connPath(A,ha,B,hb),'tr',null,{to:t});(this.down[L.from]=this.down[L.from]||[]).push(id);});});
    /* kesishuvlar va qoʻshilishlar — har chorraha ichida */
    this.cf={};this.conns.forEach(c=>this.cf[c.id]=[]);
    const rank=(a,b,J)=>{ // a b ga yoʻl beradimi
      if(a.arm===b.arm)return false;const A=this.armById[a.arm],B=this.armById[b.arm];
      const opp=A.hin[0]*B.hin[0]+A.hin[1]*B.hin[1]<-.6;
      const lu=m=>m==='L'||m==='U';if(lu(a.m)&&opp&&!lu(b.m))return true;if(lu(b.m)&&opp&&!lu(a.m))return false;
      if(!J.sig){const pa=J.main.has(a.arm),pb=J.main.has(b.arm);if(pa!==pb)return pb;          // ikkinchi darajali yoʻl asosiy yoʻlga yoʻl beradi (2.4 belgisi)
        const cr=A.hin[0]*B.hin[1]-A.hin[1]*B.hin[0];return this.yUp?cr>0:cr<0;}                  // teng ahamiyatli: oʻngdan kelayotganga
      return null;};
    Object.values(this.J).forEach(J=>{const CS=this.conns.filter(c=>c.j===J.id);
      if(J.ring){/* halqa: kirish nuqtasi — halqada aylanayotganlarga yoʻl beriladi (kiruvchi — yield) */
        const near=(Lk,P)=>{let bi=0,bd=1e9;for(let i=0;i<Lk.pts.length;i++){const d=dist(Lk.pts[i],P);if(d<bd){bd=d;bi=i;}}return [Lk.c[bi],bd];};
        CS.forEach(a=>{const La=this.link[a.id],E=[J.ring.c[0]+J.ring.r*Math.cos(a.ring.aE),J.ring.c[1]+J.ring.r*Math.sin(a.ring.aE)],[sa]=near(La,E);
          CS.forEach(b=>{if(b===a||b.arm===a.arm)return;const Lb=this.link[b.id],[sb,d]=near(Lb,E);if(d>1.6||sb<6||sb>Lb.len-4)return;
            this.cf[a.id].push({s:sa,o:b.id,os:sb,yield:true,pri:false,ring:1});this.cf[b.id].push({s:sb,o:a.id,os:sa,yield:false,pri:true,ring:1});});});return;}
      for(let i=0;i<CS.length;i++)for(let k=i+1;k<CS.length;k++){const a=CS[i],b=CS[k];if(a.from===b.from)continue;
        const La=this.link[a.id],Lb=this.link[b.id];let pts=a.arm===b.arm?[]:crossings(La.pts,La.c,Lb.pts,Lb.c);
        if(a.to===b.to)pts.push({sa:La.len,sb:Lb.len,merge:1});
        pts=pts.filter((p,q)=>!pts.some((r,m)=>m<q&&Math.abs(r.sa-p.sa)<2));
        pts.forEach(p=>{const r=rank(a,b,J);this.cf[a.id].push({s:p.sa,o:b.id,os:p.sb,yield:r===true,pri:r===false});this.cf[b.id].push({s:p.sb,o:a.id,os:p.sa,yield:r===false,pri:r===true});});}});
    Object.values(this.cf).forEach(l=>l.sort((x,y)=>x.s-y.s));
    this.byFrom={};this.conns.forEach(c=>(this.byFrom[c.from]=this.byFrom[c.from]||[]).push(c));
    /* piyoda oʻtish joylari: arms[].cross = [[x,y],[x,y]]; ulagich bilan kesishgan nuqtalar */
    this.X=[];this.P=[];this.pdone=[];this.pid=1;
    this.arms.forEach(a=>{if(!a.cross)return;const A=a.cross[0],B=a.cross[1],L=dist(A,B);if(L<2)return;this.X.push({arm:a.id,j:a.j,A,B,L,u:[(B[0]-A[0])/L,(B[1]-A[1])/L]});});
    this.pc={};this.conns.forEach(c=>{const Lk=this.link[c.id],out=[];
      this.X.forEach((x,k)=>{if(x.j!==c.j)return;crossings(Lk.pts,Lk.c,[x.A,x.B],[0,x.L]).forEach(q=>out.push({k,s:q.sa,u:q.sb}));});
      this.pc[c.id]=out.sort((p,q)=>p.s-q.s);});
  }
  /* --- yordamchilar --- */
  jOf(arm){return this.J[this.armById[arm].j];}
  cur(v){return this.link[v.route[v.li]];}
  /* yaqinlashish holati: joriy boʻlak — kiruvchi, keyingisi — ulagich */
  ap(v){const L=this.cur(v),nx=this.link[v.route[v.li+1]];if(!L||L.kind!=='in'||!nx||nx.kind!=='conn')return null;return {L,cid:nx.id,ex:v.route[v.li+2],toStop:L.len-v.s,J:this.J[L.j],arm:L.arm,m:nx.m};}
  onConn(u,cid){return u.route[u.li]===cid;}
  /* svetofor holati: 'G' | 'A' (sariq) | 'R' */
  light(arm,t=this.t,m){const J=this.jOf(arm);if(!J.sig)return 'G';const C=J.sig.cycle,tt=((t%C)+C)%C;
    for(const p of J.plan)if(p.arms.includes(arm)&&(!p.mv||!m||(p.mv[arm]||'').includes(m))){const d=((tt-p.t0)%C+C)%C;if(d<p.g)return 'G';if(d<p.g+AMBER)return 'A';}return 'R';}
  /* harakat tanlash (ulushlar boʻyicha) — berilgan boʻlaklar orasida */
  pickMove(lanes,arm){const avail=['L','S','R','U'].filter(m=>lanes.some(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m)));if(!avail.length)return null;
    const sh=(this.o.armShares&&this.o.armShares[arm])||this.o.shares,tot=avail.reduce((s,m)=>s+(sh[m]||0),0)||1;let r=this.rnd()*tot,m=avail[avail.length-1];for(const x of avail){r-=sh[x]||0;if(r<=0){m=x;break;}}return m;}
  pickConn(lane,m){const opts=(this.byFrom[lane.id]||[]).filter(c=>c.m===m);return opts[Math.floor(this.rnd()*opts.length)];}
  load(id){return this.V.filter(v=>v.route[v.li]===id).length;}
  /* yangi mashina (faqat chetki qoʻllarda) */
  spawn(arm,bus){const A=this.armById[arm],isB=l=>!!this.link[l.id].bus;
    if(bus){/* avtobus: toʻgʻriga; avtobus boʻlagi boʻlsa — undan, boʻlmasa oʻng chetdagi toʻgʻri boʻlakdan */
      let cands=A.lanes.filter(l=>isB(l)&&(this.byFrom[l.id]||[]).some(c=>c.m==='S'));
      if(!cands.length)cands=A.lanes.filter(l=>!isB(l)&&(this.byFrom[l.id]||[]).some(c=>c.m==='S')).slice(-1);if(!cands.length)return;
      const lane=cands[0],opts=this.byFrom[lane.id].filter(c=>c.m==='S'),c=opts[opts.length-1];
      const route=[lane.id,c.id,c.to],ff=route.reduce((s,id,k)=>s+this.link[id].len/(k===1?Math.min(this.link[id].vmax,11):11),0);
      (this.pend[arm]=this.pend[arm]||[]).push({route,m:'S',arm,t0:this.t,ff,bus:1});return;}
    const gen=A.lanes.filter(l=>!isB(l)),m=this.pickMove(gen,arm);if(!m)return;
    const cands=gen.filter(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m));cands.sort((p,q)=>this.load(p.id)-this.load(q.id));const lane=cands[0],c=this.pickConn(lane,m);
    const route=[lane.id,c.id,c.to],ff=this.link[lane.id].len/V0+this.link[c.id].len/this.link[c.id].vmax+this.link[c.to].len/V0;
    (this.pend[arm]=this.pend[arm]||[]).push({route,m,arm,t0:this.t,ff});}
  /* chiqish boʻlagidan keyingi chorrahaga: harakat va boʻlak tanlash, yoʻnalishni uzaytirish */
  extend(v){const last=v.route[v.route.length-1],trs=this.down[last];if(!trs||!trs.length||v.route.length>40)return;
    const lanes=trs.map(id=>this.link[this.link[id].to]).filter(l=>v.bus?true:!l.bus);if(!lanes.length)return;
    let m,ln;if(v.bus){m='S';const bl=lanes.filter(l=>l.bus&&(this.byFrom[l.id]||[]).some(c=>c.m==='S'));ln=bl[0]||lanes.filter(l=>(this.byFrom[l.id]||[]).some(c=>c.m==='S')).slice(-1)[0];if(!ln)return;}
    else{m=this.pickMove(lanes,lanes[0].arm);if(!m)return;const cands=lanes.filter(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m));cands.sort((p,q)=>this.load(p.id)-this.load(q.id));ln=cands[0];}
    const c=v.bus?(this.byFrom[ln.id].filter(x=>x.m==='S').slice(-1)[0]):this.pickConn(ln,m);if(!c)return;const tr=last+'>'+ln.id;
    v.route.push(tr,ln.id,c.id,c.to);v.ff+=this.link[tr].len/V0+ln.len/V0+this.link[c.id].len/this.link[c.id].vmax+this.link[c.to].len/V0;}
  /* kirish navbati: har boʻlak oʻz navbatida (avtobus boʻlagi umumiy boʻlak navbatini kutmaydi) */
  admit(){Object.keys(this.pend).forEach(arm=>{const q=this.pend[arm],busy=new Set();
    for(let i=0;i<q.length;i++){const p=q[i],ln=p.route[0];if(busy.has(ln))continue;
      if(this.V.some(v=>v.li===0&&v.route[0]===ln&&v.s<v.len+IDM.s0+2)){busy.add(ln);continue;}
      q.splice(i,1);i--;busy.add(ln);
      const v={id:this.nid++,...p,li:0,s:0,v:Math.min(V0,10),stopped:0,wait:0,len:p.bus?12:LEN,occ:p.bus?this.o.busOcc??40:1.3,tA:p.t0};
      this.V.push(v);this.extend(v);}});}
  /* qadam boshida indeks: boʻlak → mashinalar (ahead() da hammani aylanmaslik uchun; tezlanish qadam boshidagi holatdan hisoblanadi, shuning uchun aniq) */
  index(){const byLink=new Map(),byPrev=new Map(),trTo=new Map(),ringJ=new Map(),apTo=new Map(),put=(M,k,v)=>{let a=M.get(k);if(!a)M.set(k,a=[]);a.push(v);};
    for(const u of this.V){const id=u.route[u.li],L=this.link[id];put(byLink,id,u);
      if(L.kind==='in'){const nx=this.link[u.route[u.li+1]];if(nx&&nx.kind==='conn')put(apTo,nx.id,u);}
      if(u.li>=1&&(L.kind==='conn'||L.kind==='tr'))put(byPrev,u.route[u.li-1],u);
      if(L.kind==='tr')put(trTo,L.to,u);
      if(L.kind==='conn'&&this.J[L.j]&&this.J[L.j].ring){u._up=pointAt(L.pts,L.c,u.s);put(ringJ,L.j,u);}}
    this.IX={byLink,byPrev,trTo,ringJ,apTo};}
  /* ulagich cid ga tegishli mashinalar: ustida turganlar + unga yaqinlashayotganlar (indeks boʻlmasa — hammasi) */
  near(cid){if(!this.IX)return this.V;const a=this.IX.byLink.get(cid),b=this.IX.apTo.get(cid);return a&&b?a.concat(b):a||b||[];}
  onLink(id){return this.IX?this.IX.byLink.get(id)||[]:this.V.filter(u=>u.route[u.li]===id);}
  /* mashinaning oldidagi toʻsiq: [masofa, toʻsiq tezligi] */
  ahead(v){let best=[1e9,V0];const R=v.route,look=80;
    let off=0;for(let k=v.li;k<R.length&&off<look;k++){const id=R[k],base=k===v.li?v.s:0;
      for(const u of (this.IX?this.IX.byLink.get(id)||[]:this.V)){if(u===v)continue;if(u.route[u.li]!==id)continue;const us=u.s,gap=off+us-base-u.len;if(us>base-1e-6&&gap<best[0])best=[gap,u.v];}
      off+=this.link[id].len-base;}
    const L=this.cur(v);
    /* shu boʻlakdan chiqqan boshqa ulagich/almashtirish yoʻlidagi (ajralishgacha bir yoʻl) mashina ham yetakchi */
    const from=L.kind==='in'||L.kind==='out'?R[v.li]:(L.kind==='conn'||L.kind==='tr')?R[v.li-1]:null;
    if(from){const b0=(L.kind==='in'||L.kind==='out')?-(L.len-v.s):v.s,nxt=(L.kind==='in'||L.kind==='out')?R[v.li+1]:R[v.li];
      for(const u of (this.IX?this.IX.byPrev.get(from)||[]:this.V)){if(u===v||u.li<1)continue;const uk=this.cur(u).kind;if((uk!=='conn'&&uk!=='tr')||u.route[u.li-1]!==from||u.route[u.li]===nxt)continue;if(u.s>12)continue;
        const g=u.s-b0-u.len;if(u.s>b0-.1&&g<best[0])best=[g,u.v];}}
    /* almashtirish yoʻlida: shu boʻlakka qoʻshilayotgan boshqa mashina oldinroq boʻlsa — yetakchi */
    if(L.kind==='tr'){const rem=L.len-v.s;for(const u of (this.IX?this.IX.trTo.get(L.to)||[]:this.V)){if(u===v)continue;const Lu=this.cur(u);if(Lu.kind!=='tr'||Lu.to!==L.to||Lu===L)continue;const ur=Lu.len-u.s;if(ur<rem){const g=rem-ur-u.len;if(g<best[0])best=[g,u.v];}}}
    /* halqada: boshqa ulagichdagi, lekin shu yoʻlning oʻzida oldinda ketayotgan mashina ham yetakchi */
    const ap=this.ap(v),cid=L.kind==='conn'?L.id:ap?ap.cid:null,J=cid?this.J[this.link[cid].j]:null;
    if(J&&J.ring){const Lk=this.link[cid],b0=L.kind==='conn'?v.s:-ap.toStop;
      for(const u of (this.IX?this.IX.ringJ.get(J.id)||[]:this.V)){if(u===v)continue;const Lu=this.cur(u);if(Lu.kind!=='conn'||Lu.id===cid||Lu.j!==J.id)continue;const up=this.IX&&u._up?u._up:pointAt(Lu.pts,Lu.c,u.s);
        /* u ning Lu dagi oʻrni → Lk dagi eng yaqin nuqta (0,5 m qadam bilan keshlanadi) */
        const MC=this._mc||(this._mc=new Map()),mk=Lu.id+'|'+cid+'|'+Math.round(u.s*2);let bi=MC.get(mk);
        if(bi===undefined){bi=-1;let bd=2.0;for(let i=0;i<Lk.pts.length;i++){const d=Math.hypot(Lk.pts[i][0]-up[0],Lk.pts[i][1]-up[1]);if(d<bd){bd=d;bi=i;}}MC.set(mk,bi);}
        if(bi<0)continue;
        const ps=Lk.c[bi];if(ps<b0+.5||ps-b0>40)continue;const hv=pointAt(Lk.pts,Lk.c,ps);if(Math.cos((hv[2]||0)-(up[2]||0))<.9)continue;
        const g=ps-b0-u.len;if(g<best[0])best=[g,u.v];}}
    return best;}
  /* svetofor va yoʻl berish: toʻxtash nuqtasigacha masofa (oldingi tamoyillar, har chorraha uchun alohida) */
  stopDist(v){const L=this.cur(v);
    if(L.kind==='conn'){const J=this.J[L.j],cid=L.id,gap=J.sig?3.5:2.0;
      if(J.ring){/* halqaga kirish: kirish nuqtasidan oldin aylanayotganlarga yoʻl berish (kritik interval 4 s) */
        for(const c of this.cf[cid]){if(!c.ring||!c.yield)continue;const myD=c.s-v.s;if(myD<-.5)continue;if(myD<v.v*v.v/(2*IDM.b)-1)continue;
          for(const u of this.onLink(c.o)){if(u===v||!this.onConn(u,c.o))continue;const uD=c.os-u.s;if(uD<-(u.len+5))continue;
            if(uD<1.5||uD/Math.max(u.v,2)<4.0)return Math.max(0,myD-3);}}
        return 1e9;}
      if(!(J.sig&&(L.m==='L'||L.m==='U')))return 1e9;
      /* svetoforli chorrahada chapga buriluvchi ichkarida qarshi oqimdagi boʻshliqni kutadi */
      for(const c of this.cf[cid]){if(!c.yield)continue;const myD=c.s-v.s;if(myD<-.5)continue;if(myD<v.v*v.v/(2*IDM.b)-1)continue;
        const myT=myD/Math.max(v.v,2.5);
        for(const u of this.near(c.o)){if(u===v)continue;
          if(this.onConn(u,c.o)){if(u.s<c.os+u.len+.5)return Math.max(0,myD-2);continue;}
          const ua=this.ap(u);if(!ua||ua.cid!==c.o)continue;
          if(this.light(ua.arm,this.t,ua.m)==='R')continue;if(ua.toStop>60)continue;
          if(this.light(ua.arm,this.t,ua.m)==='A'&&ua.toStop>u.v*u.v/(2*3.5)+1)continue;   // sariqda toʻxtay oladi
          if((ua.toStop+c.os)/Math.max(u.v,3)<myT+gap)return Math.max(0,myD-2);}}
      return 1e9;}
    const a=this.ap(v);if(!a)return 1e9;const J=a.J,cid=a.cid,toStop=a.toStop,gap=J.sig?3.5:2.0,permL=J.sig&&(a.m==='L'||a.m==='U');
    const lt=this.light(a.arm,this.t,a.m);
    /* qizilda oʻngga (qoʻshimcha seksiya strelkasi, J.rtor): toʻliq toʻxtab, yashil oqimga va piyodaga yoʻl berib buriladi */
    let rtor=false;
    if(lt==='R'&&a.m==='R'&&J.rtor){if(!v.stopDone){if(v.v<.3&&toStop<3)v.stopDone=1;else return toStop;}rtor=true;}
    else if(lt!=='G'&&toStop>0.3){const need=v.v*v.v/(2*3.5);if(lt==='R'||toStop>need)return toStop;}
    /* 2.5 «Toʻxtamasdan harakatlanish taqiqlanadi»: toʻxtash chizigʻida toʻliq toʻxtaydi, keyin yoʻl berish qoidasi */
    if(!J.sig&&J.stop.has(a.arm)&&!v.stopDone){if(v.v<.3&&toStop<3)v.stopDone=1;else if(!v.commit)return toStop;}
    if(toStop>Math.max(12,v.v*v.v/(2*IDM.b)+6))return 1e9;
    const ex=a.ex;if(ex&&this.onLink(ex).some(u=>u.route[u.li]===ex&&u.s<u.len+3&&u.v<1))return toStop;   // chiqish toʻla
    if(permL&&this.V.some(u=>u.li>0&&u.route[u.li-1]===a.L.id&&this.cur(u).kind==='conn'&&'LU'.includes(this.cur(u).m)&&u.v<1))return toStop; // ichkarida bitta kutuvchi yetarli
    if(J.ring)return 1e9;                                                                     // halqada yoʻl berish — kirish nuqtasida
    const myV=Math.max(v.v,3);
    for(const c of this.cf[cid]){const myT=(toStop+c.s)/myV;
      for(const u of this.near(c.o)){if(u===v)continue;
        if(this.onConn(u,c.o)){if(c.pri&&'LU'.includes(this.cur(u).m)&&u.s<c.os-1.5)continue;          // u — kutib turgan chapga buriluvchi
          if(u.s<c.os+u.len+.5)return toStop;continue;}                                        // kesishuv band
        const ua=this.ap(u);if(!ua||ua.cid!==c.o)continue;
        if(u.commit){if(!v.commit)return toStop;continue;}                                     // u yoʻlga chiqdi — band
        if(v.commit)continue;
        if(permL&&c.yield)continue;                                                            // qarshi oqim — ichkarida kutiladi
        if(this.light(ua.arm,this.t,ua.m)==='R')continue;const uS=ua.toStop;if(uS>60)continue;
        if(rtor){const uT2=(uS+c.os)/Math.max(u.v,3);if(u.v>2?uT2<myT+4:uS<12)return toStop;continue;}   // qizilda oʻngga — hammaga yoʻl beradi
        const lead=w=>{const lw=this.cur(w).id;return !this.onLink(lw).some(x=>x!==w&&x.route[x.li]===lw&&x.s>w.s);};
        const uT=(uS+c.os)/Math.max(u.v,3),uStop=u.v<1&&uS<6&&lead(u),vStop=v.v<1&&toStop<6;
        if(u.v<1&&!lead(u))continue;                                                           // navbatda turgan — hozir kirmaydi
        /* svetoforsiz, ikkalasi ham turibdi (asosiy yoʻl farqi boʻlmasa): koʻp kutgan oʻtadi — aylanma kutish boʻlmaydi */
        if(!J.sig&&uStop&&vStop&&J.main.has(ua.arm)===J.main.has(a.arm)){if(u.wait>v.wait+.05||(Math.abs(u.wait-v.wait)<=.05&&u.id<v.id))return toStop;continue;}
        if(c.yield){if(u.v>2?uT<myT+gap:uS<12)return toStop;continue;}                          // yoʻl berish (oʻngdan / asosiy yoʻl)
        if(c.pri)continue;
        if(uStop&&vStop){if(u.wait>v.wait+.05||(Math.abs(u.wait-v.wait)<=.05&&u.id<v.id))return toStop;continue;}
        if(uT<myT-.05||(Math.abs(uT-myT)<=.05&&u.id<v.id))return toStop;}}
    if(!J.sig&&toStop<6)v.commit=1;                                                            // qaror qabul qilindi — endi toʻxtamaydi
    return 1e9;}
  /* piyoda: svetoforda — oʻtish joyi kesadigan qoʻl qizil boʻlsa va yashilga chiqishiga ulgursa; zebra — har doim (mashina yaqin boʻlmasa) */
  pedGo(x){const J=this.J[x.j];if(!J.sig)return true;if(this.light(x.arm)!=='R')return false;
    const C=J.sig.cycle,tt=((this.t%C)+C)%C,p=J.plan.find(q=>q.arms.includes(x.arm));if(!p)return true;
    const toG=((p.t0-tt)%C+C)%C;return toG>x.L/1.3+2;}
  /* mashina uchun: oʻtish joyi nuqtalarigacha boʻlgan masofa asosi (joriy ulagich yoki keyingisi) */
  pedBase(v){const L=this.cur(v);if(L.kind==='conn')return [L.id,-v.s];const a=this.ap(v);if(a)return [a.cid,a.toStop];return null;}
  pedStep(dt){const q=(this.o.ped||0)/3600;
    this.X.forEach((x,k)=>{if(q>0&&this.rnd()<q*dt){const d=this.rnd()<.5?1:-1;this.P.push({id:this.pid++,k,d,pos:d>0?0:x.L,walk:0,t0:this.t});}});
    const keep=[];
    for(const p of this.P){const x=this.X[p.k];
      if(!p.walk){let ok=this.pedGo(x);
        if(ok)for(const v of this.V){const pb=this.pedBase(v);if(!pb)continue;const pts=this.pc[pb[0]]||[];
          for(const c of pts){if(c.k!==p.k||Math.abs(c.u-p.pos)>5)continue;const dv=pb[1]+c.s;
            if(dv>-(v.len+1)&&dv<Math.max(5,v.v*v.v/(2*IDM.b)+v.v*1.5+2)&&(v.v>.3||dv<1)){ok=false;break;}}if(!ok)break;}
        if(ok){p.walk=1;p.ts=this.t;}}
      if(p.walk){p.pos+=p.d*1.3*dt;if(p.pos<0||p.pos>x.L){this.pdone.push({wait:p.ts-p.t0,t:this.t,j:x.j});continue;}}
      keep.push(p);}
    this.P=keep;}
  /* mashina oldidagi oʻtish joyi: piyoda boʻlsa yoki kirmoqchi boʻlsa — toʻxtaydi (YHQ: burilishda piyodaga yoʻl berish) */
  pedStop(v,gA=1e9,vA=99){if(!this.X.length)return 1e9;const pb=this.pedBase(v);if(!pb)return 1e9;const pts=this.pc[pb[0]]||[];
    /* piyoda nuqtaga mashina uni toʻliq oʻtib ketguncha yetib keladimi (vaqt boʻyicha; kamida 6 m) */
    const busy=(c,myD)=>{const clr=Math.max(6,1.3*((Math.max(0,myD)+v.len+2)/Math.max(v.v,2)+1));
      for(const p of this.P){if(p.k!==c.k)continue;if(!p.walk){if(Math.abs(p.pos-c.u)<1.5&&this.pedGo(this.X[p.k]))return true;continue;}
      const ah=(c.u-p.pos)*p.d;if(ah>-2.5&&ah<clr)return true;}return false;};
    /* YHQ 96: burilishda piyodaga yoʻl beriladi. Oʻtish joyiga kirmaslik: keyingi oʻtish joyi band boʻlsa va oraliq mashinaga sigʻmasa — birinchisidan oldin toʻxtaydi */
    for(let i=0;i<pts.length;i++){const c=pts[i],myD=pb[1]+c.s;if(myD<-.5)continue;if(myD>30)break;if(myD<v.v*v.v/(2*4)-.5)continue;
      if(busy(c,myD))return Math.max(0,myD-3);
      if(vA<1.5&&gA<myD+v.len+2.5&&gA>myD-1)return Math.max(0,myD-3);                    // oldingi turibdi — oʻtish joyida qolib ketmaslik
      for(let k=i+1;k<pts.length&&pts[k].s-c.s<v.len+5;k++)if(pts[k].k!==c.k&&busy(pts[k],pb[1]+pts[k].s))return Math.max(0,myD-3);}
    return 1e9;}
  /* navbat namunasi (har 1 s): qoʻl boʻyicha toʻxtab turgan mashinalar soni */
  sampleQ(){this.QS=this.QS||{};const q=this.queues();for(const k in q){const r=this.QS[k]||(this.QS[k]={sum:0,n:0,max:0,t:[]});r.sum+=q[k];r.n++;r.max=Math.max(r.max,q[k]);r.t.push([this.t,q[k]]);}}
  step(dt){this.t+=dt;
    if(Math.floor(this.t)!==Math.floor(this.t-dt))this.sampleQ();
    this.pedStep(dt);
    this.arms.forEach(a=>{if(this.fed.has(a.id))return;const q=(this.o.demand[a.id]??500)/3600;if(this.rnd()<q*dt)this.spawn(a.id);const qb=((this.o.bus||{})[a.id]||0)/3600;if(qb>0&&this.rnd()<qb*dt)this.spawn(a.id,1);});
    this.admit();this.index();
    const acc=new Map();
    for(const v of this.V){const lk=this.cur(v),vmax=lk.kind==='conn'?lk.vmax:V0;
      let [gap,vl]=this.ahead(v);const sd=Math.min(this.stopDist(v),this.pedStop(v,gap,vl));if(sd<gap){gap=sd;vl=0;}
      const v0=Math.min(vmax,V0),ss=IDM.s0+Math.max(0,v.v*IDM.T+v.v*(v.v-vl)/(2*Math.sqrt(IDM.a*IDM.b)));
      const aM=v.bus?1.0:IDM.a,v0b=v.bus?Math.min(v0,11):v0;let a=aM*(1-Math.pow(v.v/v0b,IDM.d)-Math.pow(ss/Math.max(gap,.1),2));
      const ap=this.ap(v);if(ap){const c=this.link[ap.cid],dc=ap.toStop,vc=!ap.J.sig&&!ap.J.main.has(ap.arm)?Math.min(c.vmax,8):c.vmax; // svetoforsizda ikkinchi darajali/teng yoʻlda sekinlashib yaqinlashadi
        if(dc<40&&v.v>vc)a=Math.min(a,(vc*vc-v.v*v.v)/(2*Math.max(dc,1)));}
      acc.set(v,Math.max(-8,a));}
    const keep=[];
    for(const v of this.V){const a=acc.get(v);let nv=Math.max(0,v.v+a*dt);v.s+=Math.max(0,v.v*dt+.5*a*dt*dt);v.v=nv;if(v.v<.5){v.stopped+=dt;v.wait+=dt;}
      while(v.li<v.route.length&&v.s>=this.link[v.route[v.li]].len){const L=this.link[v.route[v.li]];v.s-=L.len;v.li++;
        if(L.kind==='conn'){/* chorrahadan chiqdi: shu yaqinlashish boʻyicha kechikish */
          const A=this.link[v.route[v.li-2]],ff=A.len/V0+L.len/L.vmax;this.pass.push({arm:L.arm,j:L.j,m:L.m,d:Math.max(0,this.t-v.tA-ff),t:this.t,bus:v.bus?1:0});}
        const N=this.link[v.route[v.li]];if(!N)break;
        if(N.kind==='conn')v.tIn=this.t;
        if(N.kind==='in'){v.tA=this.t;v.wait=0;v.commit=0;v.stopDone=0;}
        if(N.kind==='out')this.extend(v);}
      if(v.li>=v.route.length){this.done.push({arm:v.arm,m:v.m,tt:this.t-v.t0,ff:v.ff,stopped:v.stopped,t:this.t,bus:v.bus?1:0,occ:v.occ});continue;}
      keep.push(v);}
    this.V=keep;}
  run(sec,dt=.1){const n=Math.round(sec/dt);for(let i=0;i<n;i++)this.step(dt);return this;}
  /* holat (chizish uchun) */
  snapshot(){return this.V.map(v=>{const L=this.cur(v),p=pointAt(L.pts,L.c,v.s),m=L.kind==='conn'?L.m:(this.ap(v)||{}).m||v.m;return {id:v.id,x:p[0],y:p[1],h:p[2]||0,m,v:v.v,len:v.len,bus:v.bus?1:0};});}
  peds(){return this.P.map(p=>{const x=this.X[p.k];return {x:x.A[0]+x.u[0]*p.pos,y:x.A[1]+x.u[1]*p.pos,walk:p.walk};});}
  queues(){const q={};this.arms.forEach(a=>{q[a.id]=this.V.filter(v=>{const ap=this.ap(v);return ap&&ap.arm===a.id&&v.v<2;}).length+(this.pend[a.id]||[]).length;});return q;}
  /* natija: qoʻl (yaqinlashish) boʻyicha kechikish — har chorrahadan oʻtishda oʻlchanadi; jami — sayohat boʻyicha;
     LOS (HCM: svetoforli 10/20/35/55/80, svetoforsiz va aylanma 10/15/25/35/50); talab bajarilmasa — F */
  result(from=0){const T=Math.max(1,this.t-from),thS=[10,20,35,55,80],thU=[10,15,25,35,50],los=(d,sg)=>'ABCDE'[(sg?thS:thU).findIndex(x=>d<=x)]||'F';
    const trav=v=>{let x=v.s;for(let k=0;k<v.li;k++)x+=this.link[v.route[k]].len;return x;};
    const PS=this.pass.filter(p=>p.t>=from&&!p.bus);
    const agg=arm=>{const A=this.armById[arm],J=this.J[A.j],D=PS.filter(p=>p.arm===arm);let sum=D.reduce((s,p)=>s+p.d,0),n=D.length;
      this.V.filter(v=>!v.bus).forEach(v=>{const ap=this.ap(v);if(ap&&ap.arm===arm){sum+=Math.max(0,this.t-v.tA-(ap.L.len-ap.toStop)/V0);n++;}});
      (this.pend[arm]||[]).forEach(p=>{if(p.bus)return;sum+=this.t-p.t0;n++;});
      const fed=this.fed.has(arm),dem=fed?null:(this.o.demand[arm]??500),flow=Math.round(D.length*3600/T),dl=n?sum/n:0,back=n-D.length;
      const ok=back<=Math.max(12,.1*(fed?flow:dem)*T/3600);
      const QS=(this.QS||{})[arm],qs=QS?QS.t.filter(x=>x[0]>=from).map(x=>x[1]).sort((a,b)=>a-b):[],q95=qs.length?qs[Math.floor(qs.length*.95)]:0;
      return {n:D.length,flow,demand:dem,backlog:back,delay:+dl.toFixed(1),los:n?(ok?los(dl,!!J.sig):'F'):'—',q95,queue:(this.pend[arm]||[]).length+this.V.filter(v=>{const ap=this.ap(v);return ap&&ap.arm===arm&&v.v<2;}).length};};
    const by={};this.arms.forEach(a=>by[a.id]=agg(a.id));
    /* chorraha boʻyicha (yaqinlashishlar kechikishining oʻrtachasi) */
    const juncs={};Object.values(this.J).forEach(J=>{const ar=this.arms.filter(a=>a.j===J.id).map(a=>by[a.id]),n=ar.reduce((s,r)=>s+r.n,0),d=n?ar.reduce((s,r)=>s+r.delay*r.n,0)/n:0,F=ar.some(r=>r.los==='F');
      juncs[J.id]={n,flow:Math.round(n*3600/T),delay:+d.toFixed(1),los:n?(F&&d>(J.sig?55:35)?'F':los(d,!!J.sig)):'—'};});
    /* jami: tarmoqdan oʻtgan sayohatlar (oldingi bitta chorrahali hisob bilan bir xil) */
    const D=this.done.filter(d=>d.t>=from&&!d.bus);let sum=D.reduce((s,d)=>s+Math.max(0,d.tt-d.ff),0),n=D.length;
    this.V.filter(v=>!v.bus).forEach(v=>{sum+=Math.max(0,this.t-v.t0-trav(v)/V0);n++;});
    Object.values(this.pend).forEach(q=>q.forEach(p=>{if(p.bus)return;sum+=this.t-p.t0;n++;}));
    const ext=this.arms.filter(a=>!this.fed.has(a.id)),dem=ext.reduce((s,a)=>s+(this.o.demand[a.id]??500),0),dl=n?sum/n:0,back=n-D.length;
    const okT=back<=Math.max(12*ext.length,.1*dem*T/3600),sigAny=Object.values(this.J).some(J=>J.sig);
    const total={n:D.length,flow:Math.round(D.length*3600/T),demand:dem,backlog:back,delay:+dl.toFixed(1),los:n?(okT?los(dl,Object.keys(this.J).length===1?!!this.sig:sigAny):'F'):'—'};
    /* avtobus va odam-kechikish (yoʻlovchi soni bilan tortilgan) */
    const DA=this.done.filter(d=>d.t>=from),DB=DA.filter(d=>d.bus),dly=d=>Math.max(0,d.tt-d.ff),occ=d=>d.occ||1.3;
    const bus={n:DB.length,flow:Math.round(DB.length*3600/T),delay:DB.length?+(DB.reduce((s,d)=>s+dly(d),0)/DB.length).toFixed(1):0};
    const po=DA.reduce((s,d)=>s+occ(d),0),person=po?+(DA.reduce((s,d)=>s+dly(d)*occ(d),0)/po).toFixed(1):0;
    const PD=this.pdone.filter(d=>d.t>=from),pw=this.P.filter(p=>!p.walk).map(p=>this.t-p.t0),pn=PD.length+pw.length;
    return {arms:by,juncs,total,bus,person,ped:{n:PD.length,flow:Math.round(PD.length*3600/T),wait:pn?+((PD.reduce((s,d)=>s+d.wait,0)+pw.reduce((s,w)=>s+w,0))/pn).toFixed(1):0}};}
}
