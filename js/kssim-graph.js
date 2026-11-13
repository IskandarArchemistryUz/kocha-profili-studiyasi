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
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
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

/* 4 va undan koʻp qoʻlli chorrahada qarama-qarshi qoʻllar bitta fazada; qolganlari alohida */
export function autoPhases(arms){const used=new Set(),ph=[];
  arms.forEach(a=>{if(used.has(a.id))return;used.add(a.id);let best=null,bc=-.6;
    arms.forEach(b=>{if(used.has(b.id))return;const c=a.hin[0]*b.hin[0]+a.hin[1]*b.hin[1];if(c<bc){bc=c;best=b;}});
    if(best){used.add(best.id);ph.push([a.id,best.id]);}else ph.push([a.id]);});
  return ph;}

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
      pairs.forEach(([l,d])=>{const A=l.pts[l.pts.length-1],B=d.pts[0];conns.push({id:'c'+conns.length,from:l.id,to:d.id,m,pts:connPath(A,e.hin,B,[-T.f.hin[0],-T.f.hin[1]])});});});});
  return conns;}
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

export class GraphSim{
  constructor(net,opt={}){
    this.o={demand:{},shares:{L:.2,S:.65,R:.15},seed:1,...opt};this.rnd=mulberry(this.o.seed);this.t=0;this.V=[];this.nid=1;this.done=[];this.pend={};
    this.sig=net.signal||null;this.main=new Set(net.main||[]);this.yUp=net.yUp!==false;
    this.arms=net.arms;this.armById={};net.arms.forEach(a=>this.armById[a.id]=a);
    this.link={};const add=(id,pts,kind,arm,extra)=>{const c=cum(pts);this.link[id]={id,pts,c,len:c[c.length-1],kind,arm,...extra};};
    net.arms.forEach(a=>{a.lanes.forEach(l=>add(l.id,l.pts,'in',a.id,{codes:l.codes,bus:!!l.bus}));a.exits.forEach(x=>add(x.id,x.pts,'out',a.id,{bus:!!x.bus}));});
    this.conns=net.conns.map(c=>{const fr=this.link[c.from],arm=fr.arm;add(c.id,c.pts,'conn',arm,{m:c.m,vmax:c.ring&&net.ring?Math.min(V0,Math.sqrt(ALAT*net.ring.r*1.3)):curveSpeed(c.pts)});return {...c,arm};});
    /* kesishuvlar va qoʻshilishlar */
    this.cf={};this.conns.forEach(c=>this.cf[c.id]=[]);
    const rank=(a,b)=>{ // a b ga yoʻl beradimi
      if(a.arm===b.arm)return false;const A=this.armById[a.arm],B=this.armById[b.arm];
      const opp=A.hin[0]*B.hin[0]+A.hin[1]*B.hin[1]<-.6;
      if(a.m==='L'&&opp&&b.m!=='L')return true;if(b.m==='L'&&opp&&a.m!=='L')return false;
      if(!this.sig){const pa=this.main.has(a.arm),pb=this.main.has(b.arm);if(pa!==pb)return pb;          // ikkinchi darajali yoʻl asosiy yoʻlga yoʻl beradi (2.4 belgisi)
        const cr=A.hin[0]*B.hin[1]-A.hin[1]*B.hin[0];return this.yUp?cr>0:cr<0;}                              // teng ahamiyatli: oʻngdan kelayotganga
      return null;};
    this.ring=net.ring||null;
    if(this.ring){/* halqa: kirish nuqtasi — halqada aylanayotganlarga yoʻl beriladi (kiruvchi — yield) */
      const near=(Lk,P)=>{let bi=0,bd=1e9;for(let i=0;i<Lk.pts.length;i++){const d=dist(Lk.pts[i],P);if(d<bd){bd=d;bi=i;}}return [Lk.c[bi],bd];};
      this.conns.forEach(a=>{const La=this.link[a.id],E=[this.ring.c[0]+this.ring.r*Math.cos(a.ring.aE),this.ring.c[1]+this.ring.r*Math.sin(a.ring.aE)],[sa]=near(La,E);
        this.conns.forEach(b=>{if(b===a||b.arm===a.arm)return;const Lb=this.link[b.id],[sb,d]=near(Lb,E);if(d>1.6||sb<6||sb>Lb.len-4)return;
          this.cf[a.id].push({s:sa,o:b.id,os:sb,yield:true,pri:false,ring:1});this.cf[b.id].push({s:sb,o:a.id,os:sa,yield:false,pri:true,ring:1});});});}
    else for(let i=0;i<this.conns.length;i++)for(let j=i+1;j<this.conns.length;j++){const a=this.conns[i],b=this.conns[j];if(a.from===b.from)continue;
      const La=this.link[a.id],Lb=this.link[b.id];let pts=a.arm===b.arm?[]:crossings(La.pts,La.c,Lb.pts,Lb.c);
      if(a.to===b.to)pts.push({sa:La.len,sb:Lb.len,merge:1});
      pts=pts.filter((p,k)=>!pts.some((q,m)=>m<k&&Math.abs(q.sa-p.sa)<2));
      pts.forEach(p=>{const r=rank(a,b);this.cf[a.id].push({s:p.sa,o:b.id,os:p.sb,yield:r===true,pri:r===false});this.cf[b.id].push({s:p.sb,o:a.id,os:p.sa,yield:r===false,pri:r===true});});}
    Object.values(this.cf).forEach(l=>l.sort((x,y)=>x.s-y.s));
    this.byFrom={};this.conns.forEach(c=>(this.byFrom[c.from]=this.byFrom[c.from]||[]).push(c));
    /* piyoda oʻtish joylari: arms[].cross = [[x,y],[x,y]] (qatnov qismi boʻylab); ulagich bilan kesishgan nuqtalar */
    this.X=[];this.P=[];this.pdone=[];this.pid=1;
    net.arms.forEach(a=>{if(!a.cross)return;const A=a.cross[0],B=a.cross[1],L=dist(A,B);if(L<2)return;this.X.push({arm:a.id,A,B,L,u:[(B[0]-A[0])/L,(B[1]-A[1])/L]});});
    this.pc={};this.conns.forEach(c=>{const Lk=this.link[c.id],out=[];
      this.X.forEach((x,k)=>{crossings(Lk.pts,Lk.c,[x.A,x.B],[0,x.L]).forEach(q=>out.push({k,s:q.sa,u:q.sb}));});
      this.pc[c.id]=out.sort((p,q)=>p.s-q.s);});
    if(this.sig){const ph=this.sig.phases,C=this.sig.cycle,n=ph.length,g=Math.max(5,(C-n*(AMBER+ALLRED))/n);this.plan=ph.map((arms,k)=>({arms,t0:k*(g+AMBER+ALLRED),g}));}
  }
  /* svetofor holati: 'G' | 'A' (sariq) | 'R' */
  light(arm,t=this.t){if(!this.sig)return 'G';const C=this.sig.cycle,tt=((t%C)+C)%C;
    for(const p of this.plan)if(p.arms.includes(arm)){const d=tt-p.t0;if(d>=0&&d<p.g)return 'G';if(d>=p.g&&d<p.g+AMBER)return 'A';}return 'R';}
  /* yangi mashina: harakat (L/S/R) ulushlar boʻyicha, boʻlak — shu harakatga ruxsat bergan, eng boʻshi */
  spawn(arm,bus){const A=this.armById[arm],isB=l=>!!this.link[l.id].bus;
    if(bus){/* avtobus: toʻgʻriga; avtobus boʻlagi boʻlsa — undan, boʻlmasa oʻng chetdagi toʻgʻri boʻlakdan */
      let cands=A.lanes.filter(l=>isB(l)&&(this.byFrom[l.id]||[]).some(c=>c.m==='S'));
      if(!cands.length)cands=A.lanes.filter(l=>!isB(l)&&(this.byFrom[l.id]||[]).some(c=>c.m==='S')).slice(-1);if(!cands.length)return;
      const lane=cands[0],opts=this.byFrom[lane.id].filter(c=>c.m==='S'),c=opts[opts.length-1];
      const route=[lane.id,c.id,c.to],ff=route.reduce((s,id,k)=>s+this.link[id].len/(k===1?Math.min(this.link[id].vmax,11):11),0);
      (this.pend[arm]=this.pend[arm]||[]).push({route,m:'S',arm,t0:this.t,ff,bus:1});return;}
    const gen=A.lanes.filter(l=>!isB(l)),avail=['L','S','R'].filter(m=>gen.some(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m)));if(!avail.length)return;
    const sh=this.o.shares,tot=avail.reduce((s,m)=>s+(sh[m]||0),0)||1;let r=this.rnd()*tot,m=avail[avail.length-1];for(const x of avail){r-=sh[x]||0;if(r<=0){m=x;break;}}
    const cands=gen.filter(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m));
    const load=l=>this.V.filter(v=>v.route[0]===l.id&&v.li===0).length;cands.sort((p,q)=>load(p)-load(q));const lane=cands[0];
    const opts=this.byFrom[lane.id].filter(c=>c.m===m),c=opts[Math.floor(this.rnd()*opts.length)];
    const route=[lane.id,c.id,c.to],ff=route.reduce((s,id,k)=>s+this.link[id].len/(k===1?this.link[id].vmax:V0),0);
    (this.pend[arm]=this.pend[arm]||[]).push({route,m,arm,t0:this.t,ff});}
  /* kirish navbati: har boʻlak oʻz navbatida (avtobus boʻlagi umumiy boʻlak navbatini kutmaydi) */
  admit(){Object.keys(this.pend).forEach(arm=>{const q=this.pend[arm],busy=new Set();
    for(let i=0;i<q.length;i++){const p=q[i],ln=p.route[0];if(busy.has(ln))continue;
      if(this.V.some(v=>v.route[0]===ln&&v.li===0&&v.s<v.len+IDM.s0+2)){busy.add(ln);continue;}
      q.splice(i,1);i--;busy.add(ln);
      this.V.push({id:this.nid++,...p,li:0,s:0,v:Math.min(V0,10),stopped:0,len:p.bus?12:LEN,occ:p.bus?this.o.busOcc??40:1.3});}});}
  /* mashinaning oldidagi toʻsiq: [masofa, toʻsiq tezligi] */
  ahead(v){let best=[1e9,V0];const R=v.route,look=80;
    let off=0;for(let k=v.li;k<R.length&&off<look;k++){const id=R[k],base=k===v.li?v.s:0;
      for(const u of this.V){if(u===v)continue;let us=null;
        if(u.route[u.li]===id)us=u.s;if(us==null)continue;const gap=off+us-base-u.len;if(us>base-1e-6&&gap<best[0])best=[gap,u.v];}
      off+=this.link[id].len-base;}
    /* shu boʻlakdan chiqqan boshqa ulagichdagi (ajralishgacha bir yoʻl) mashina ham yetakchi */
    if(v.li<=1){const sib=this.byFrom[R[0]]||[],b0=v.li===0?-(this.link[R[0]].len-v.s):v.s;
      for(const u of this.V){if(u===v||u.li!==1||u.route[1]===R[1]||u.route[0]!==R[0])continue;if(u.s>12)continue;
        const g=u.s-b0-u.len;if(u.s>b0-.1&&g<best[0])best=[g,u.v];}}
    /* halqada: boshqa ulagichdagi, lekin shu yoʻlning oʻzida oldinda ketayotgan mashina ham yetakchi */
    if(this.ring&&v.li<=1){const Lk=this.link[R[1]],b0=v.li===0?-(this.link[R[0]].len-v.s):v.s;
      for(const u of this.V){if(u===v||u.li!==1||u.route[1]===R[1])continue;const Lu=this.link[u.route[1]],up=pointAt(Lu.pts,Lu.c,u.s);
        let bi=-1,bd=2.0;for(let i=0;i<Lk.pts.length;i++){const d=Math.hypot(Lk.pts[i][0]-up[0],Lk.pts[i][1]-up[1]);if(d<bd){bd=d;bi=i;}}if(bi<0)continue;
        const ps=Lk.c[bi];if(ps<b0+.5||ps-b0>40)continue;const hv=pointAt(Lk.pts,Lk.c,ps);if(Math.cos((hv[2]||0)-(up[2]||0))<.9)continue;
        const g=ps-b0-u.len;if(g<best[0])best=[g,u.v];}}
    return best;}
  /* svetofor va yoʻl berish: toʻxtash nuqtasigacha masofa.
     Chorrahaga faqat toʻxtash chizigʻidan, yoʻli boʻsh boʻlsa kiriladi: ichkaridagi mashina oʻtib ketmagan kesishuv —
     band (bron); yaqinlashayotganlar bilan — ustunlik qoidasi. Ichkaridagi mashina kesishuv uchun toʻxtamaydi
     (u kirganda yoʻl boʻsh edi) — shu sababli aylanma tiqilish va ustma-ust tushish boʻlmaydi. */
  stopDist(v){const R=v.route,L0=this.link[R[0]],cid=R[1],gap=this.sig?3.5:2.0;
    /* svetoforli chorrahada chapga buriluvchi: chorrahaga kirib, qarshi oqimdagi boʻshliqni kesishuv oldida kutadi
       (sariq/qizilda chiqib ketadi — «chorrahadan chiqib ulgurmaganga yoʻl berish», 103-band) */
    const permL=this.sig&&v.m==='L';
    if(this.ring&&v.li===1){/* halqaga kirish: kirish nuqtasidan oldin aylanayotganlarga yoʻl berish (kritik interval 4 s) */
      for(const c of this.cf[cid]){if(!c.ring||!c.yield)continue;const myD=c.s-v.s;if(myD<-.5)continue;if(myD<v.v*v.v/(2*IDM.b)-1)continue;
        for(const u of this.V){if(u===v||u.li!==1||u.route[1]!==c.o)continue;const uD=c.os-u.s;if(uD<-(u.len+5))continue;
          if(uD<1.5||uD/Math.max(u.v,2)<4.0)return Math.max(0,myD-3);}}
      return 1e9;}
    if(v.li===1){if(!permL)return 1e9;
      for(const c of this.cf[cid]){if(!c.yield)continue;const myD=c.s-v.s;if(myD<-.5)continue;if(myD<v.v*v.v/(2*IDM.b)-1)continue;
        const myT=myD/Math.max(v.v,2.5);
        for(const u of this.V){if(u===v||u.route[1]!==c.o||u.li>1)continue;
          if(u.li===1){if(u.s<c.os+u.len+.5)return Math.max(0,myD-2);continue;}
          if(this.light(u.arm)==='R')continue;const uS=this.link[u.route[0]].len-u.s;if(uS>60)continue;
          if(this.light(u.arm)==='A'&&uS>u.v*u.v/(2*3.5)+1)continue;   // sariqda toʻxtay oladi
          if((uS+c.os)/Math.max(u.v,3)<myT+gap)return Math.max(0,myD-2);}}
      return 1e9;}
    if(v.li!==0)return 1e9;
    const toStop=L0.len-v.s,lt=this.light(v.arm);
    if(lt!=='G'&&toStop>0.3){const need=v.v*v.v/(2*3.5);if(lt==='R'||toStop>need)return toStop;}
    if(toStop>Math.max(12,v.v*v.v/(2*IDM.b)+6))return 1e9;
    const ex=R[2];if(this.V.some(u=>u.route[u.li]===ex&&u.s<u.len+3&&u.v<1))return toStop;   // chiqish toʻla
    if(permL&&this.V.some(u=>u.li===1&&u.route[0]===R[0]&&u.m==='L'&&u.v<1))return toStop; // ichkarida bitta kutuvchi yetarli
    if(this.ring)return 1e9;                                                                  // halqada yoʻl berish — kirish nuqtasida (pastda)
    const myV=Math.max(v.v,3);
    for(const c of this.cf[cid]){const myT=(toStop+c.s)/myV;
      for(const u of this.V){if(u===v||u.route[1]!==c.o||u.li>1)continue;
        if(u.li===1){if(c.pri&&u.m==='L'&&u.s<c.os-1.5)continue;                              // u — kutib turgan chapga buriluvchi
          if(c.ring){const uD=c.os-u.s;if(uD<-(u.len+.5))continue;if(uD<1||uD/Math.max(u.v,3)<myT+2.5)return toStop;continue;} // halqada aylanayotgan yaqinlashmoqda
          if(u.s<c.os+u.len+.5)return toStop;continue;}                                          // kesishuv band
        if(u.commit){if(!v.commit)return toStop;continue;}                                     // u yoʻlga chiqdi — band
        if(v.commit)continue;
        if(permL&&c.yield)continue;                                                            // qarshi oqim — ichkarida kutiladi
        if(this.light(u.arm)==='R')continue;const uS=this.link[u.route[0]].len-u.s;if(uS>60)continue;
        const lead=w=>!this.V.some(x=>x!==w&&x.li===0&&x.route[0]===w.route[0]&&x.s>w.s);
        const uT=(uS+c.os)/Math.max(u.v,3),uStop=u.v<1&&uS<6&&lead(u),vStop=v.v<1&&toStop<6;
        if(u.v<1&&!lead(u))continue;                                                           // navbatda turgan (oldida mashina bor) — hozir kirmaydi
        /* svetoforsiz, ikkalasi ham turibdi (asosiy yoʻl farqi boʻlmasa): koʻp kutgan oʻtadi — aylanma kutish boʻlmaydi */
        if(!this.sig&&uStop&&vStop&&this.main.has(u.arm)===this.main.has(v.arm)){if(u.stopped>v.stopped+.05||(Math.abs(u.stopped-v.stopped)<=.05&&u.id<v.id))return toStop;continue;}
        if(c.yield){if(u.v>2?uT<myT+gap:uS<12)return toStop;continue;}                          // yoʻl berish (oʻngdan / asosiy yoʻl)
        if(c.pri)continue;
        if(uStop&&vStop){if(u.stopped>v.stopped+.05||(Math.abs(u.stopped-v.stopped)<=.05&&u.id<v.id))return toStop;continue;}
        if(uT<myT-.05||(Math.abs(uT-myT)<=.05&&u.id<v.id))return toStop;}}
    if(!this.sig&&toStop<6)v.commit=1;                                                                 // qaror qabul qilindi — endi toʻxtamaydi
    return 1e9;}
  /* piyoda: svetoforda — oʻtish joyi kesadigan qoʻl qizil boʻlsa va yashilga chiqishiga ulgursa; zebra — har doim (mashina yaqin boʻlmasa) */
  pedGo(x){if(!this.sig)return true;if(this.light(x.arm)!=='R')return false;
    const C=this.sig.cycle,tt=((this.t%C)+C)%C,p=this.plan.find(q=>q.arms.includes(x.arm));if(!p)return true;
    const toG=((p.t0-tt)%C+C)%C;return toG>x.L/1.3+2;}
  pedStep(dt){const q=(this.o.ped||0)/3600;
    this.X.forEach((x,k)=>{if(q>0&&this.rnd()<q*dt){const d=this.rnd()<.5?1:-1;this.P.push({id:this.pid++,k,d,pos:d>0?0:x.L,walk:0,t0:this.t});}});
    const keep=[];
    for(const p of this.P){const x=this.X[p.k];
      if(!p.walk){let ok=this.pedGo(x);
        if(ok)for(const v of this.V){const R=v.route,k2=v.li<=1?R[1]:null;if(!k2)continue;const pts=this.pc[k2]||[];
          for(const c of pts){if(c.k!==p.k||Math.abs(c.u-p.pos)>5)continue;const dv=(v.li===0?this.link[R[0]].len-v.s:-v.s)+c.s;
            if(dv>-(v.len+1)&&dv<Math.max(5,v.v*v.v/(2*IDM.b)+v.v*1.5+2)&&(v.v>.3||dv<1)){ok=false;break;}}if(!ok)break;}
        if(ok){p.walk=1;p.ts=this.t;}}
      if(p.walk){p.pos+=p.d*1.3*dt;if(p.pos<0||p.pos>x.L){this.pdone.push({wait:p.ts-p.t0,t:this.t});continue;}}
      keep.push(p);}
    this.P=keep;}
  /* mashina oldidagi oʻtish joyi: piyoda boʻlsa yoki kirmoqchi boʻlsa — toʻxtaydi (YHQ: burilishda piyodaga yoʻl berish) */
  pedStop(v){const R=v.route;if(v.li>1||!this.X.length)return 1e9;const pts=this.pc[R[1]]||[];const base=v.li===0?this.link[R[0]].len-v.s:-v.s;
    for(const c of pts){const myD=base+c.s;if(myD<-.5)continue;if(myD>30)break;if(myD<v.v*v.v/(2*4)-.5)continue;
      for(const p of this.P){if(p.k!==c.k)continue;if(!p.walk){if(Math.abs(p.pos-c.u)<1.5&&this.pedGo(this.X[p.k]))return Math.max(0,myD-3);continue;}
        const ahead=(c.u-p.pos)*p.d;if(ahead>-2.5&&ahead<6)return Math.max(0,myD-3);}}
    return 1e9;}
  step(dt){this.t+=dt;
    this.pedStep(dt);
    this.arms.forEach(a=>{const q=(this.o.demand[a.id]??500)/3600;if(this.rnd()<q*dt)this.spawn(a.id);const qb=((this.o.bus||{})[a.id]||0)/3600;if(qb>0&&this.rnd()<qb*dt)this.spawn(a.id,1);});
    this.admit();
    const acc=new Map();
    for(const v of this.V){const lk=this.link[v.route[v.li]],vmax=lk.kind==='conn'?lk.vmax:V0;
      let [gap,vl]=this.ahead(v);const sd=Math.min(this.stopDist(v),this.pedStop(v));if(sd<gap){gap=sd;vl=0;}
      const v0=Math.min(vmax,V0),ss=IDM.s0+Math.max(0,v.v*IDM.T+v.v*(v.v-vl)/(2*Math.sqrt(IDM.a*IDM.b)));
      const aM=v.bus?1.0:IDM.a,v0b=v.bus?Math.min(v0,11):v0;let a=aM*(1-Math.pow(v.v/v0b,IDM.d)-Math.pow(ss/Math.max(gap,.1),2));
      if(v.li===0&&v.route[1]){const c=this.link[v.route[1]],dc=this.link[v.route[0]].len-v.s,vc=!this.sig&&!this.main.has(v.arm)?Math.min(c.vmax,8):c.vmax; // svetoforsizda ikkinchi darajali/teng yoʻlda sekinlashib yaqinlashadi
        if(dc<40&&v.v>vc)a=Math.min(a,(vc*vc-v.v*v.v)/(2*Math.max(dc,1)));}
      acc.set(v,Math.max(-8,a));}
    const keep=[];
    for(const v of this.V){const a=acc.get(v);let nv=Math.max(0,v.v+a*dt);v.s+=Math.max(0,v.v*dt+.5*a*dt*dt);v.v=nv;if(v.v<.5)v.stopped+=dt;
      while(v.li<v.route.length&&v.s>=this.link[v.route[v.li]].len){v.s-=this.link[v.route[v.li]].len;v.li++;if(v.li===1)v.tIn=this.t;}
      if(v.li>=v.route.length){this.done.push({arm:v.arm,m:v.m,tt:this.t-v.t0,ff:v.ff,stopped:v.stopped,t:this.t,bus:v.bus?1:0,occ:v.occ});continue;}
      keep.push(v);}
    this.V=keep;}
  run(sec,dt=.1){const n=Math.round(sec/dt);for(let i=0;i<n;i++)this.step(dt);return this;}
  /* holat (chizish uchun): [{x,y,h,m,v}] */
  snapshot(){return this.V.map(v=>{const L=this.link[v.route[v.li]],p=pointAt(L.pts,L.c,v.s);return {id:v.id,x:p[0],y:p[1],h:p[2]||0,m:v.m,v:v.v,len:v.len,bus:v.bus?1:0};});}
  peds(){return this.P.map(p=>{const x=this.X[p.k];return {x:x.A[0]+x.u[0]*p.pos,y:x.A[1]+x.u[1]*p.pos,walk:p.walk};});}
  queues(){const q={};this.arms.forEach(a=>{q[a.id]=this.V.filter(v=>v.arm===a.id&&v.li===0&&v.v<2).length+(this.pend[a.id]||[]).length;});return q;}
  /* natija: qoʻl va jami boʻyicha oʻrtacha kechikish (s/mashina; tizimda qolgan va kirish navbatidagilar ham hisobga olinadi),
     oʻtkazish (mashina/soat), talabning bajarilishi va LOS (HCM: svetoforli 10/20/35/55/80, svetoforsiz 10/15/25/35/50) */
  result(from=0){const T=Math.max(1,this.t-from),th=this.sig?[10,20,35,55,80]:[10,15,25,35,50],los=d=>'ABCDE'[th.findIndex(x=>d<=x)]||'F';
    const trav=v=>{let x=v.s;for(let k=0;k<v.li;k++)x+=this.link[v.route[k]].len;return x;};
    const agg=arm=>{const D=this.done.filter(d=>d.t>=from&&!d.bus&&(arm==null||d.arm===arm));let sum=D.reduce((s,d)=>s+Math.max(0,d.tt-d.ff),0),n=D.length;
      this.V.filter(v=>!v.bus&&(arm==null||v.arm===arm)).forEach(v=>{sum+=Math.max(0,this.t-v.t0-trav(v)/V0);n++;});
      Object.entries(this.pend).forEach(([a,q])=>{if(arm!=null&&a!==arm)return;q.forEach(p=>{if(p.bus)return;sum+=this.t-p.t0;n++;});});
      const dem=arm==null?this.arms.reduce((s,a)=>s+(this.o.demand[a.id]??500),0):(this.o.demand[arm]??500);
      const flow=Math.round(D.length*3600/T),dl=n?sum/n:0,back=n-D.length,ok=back<=Math.max(12*(arm==null?this.arms.length:1),.1*dem*T/3600);
      return {n:D.length,flow,demand:dem,backlog:back,delay:+dl.toFixed(1),los:n?(ok?los(dl):'F'):'—',queue:arm==null?0:(this.pend[arm]||[]).length+this.V.filter(v=>v.arm===arm&&v.li===0&&v.v<2).length};};
    const by={};this.arms.forEach(a=>by[a.id]=agg(a.id));
    /* avtobus va odam-kechikish (yoʻlovchi soni bilan tortilgan) */
    const DA=this.done.filter(d=>d.t>=from),DB=DA.filter(d=>d.bus),dly=d=>Math.max(0,d.tt-d.ff),occ=d=>d.occ||1.3;
    const bus={n:DB.length,flow:Math.round(DB.length*3600/T),delay:DB.length?+(DB.reduce((s,d)=>s+dly(d),0)/DB.length).toFixed(1):0};
    const po=DA.reduce((s,d)=>s+occ(d),0),person=po?+(DA.reduce((s,d)=>s+dly(d)*occ(d),0)/po).toFixed(1):0;
    const PD=this.pdone.filter(d=>d.t>=from),pw=this.P.filter(p=>!p.walk).map(p=>this.t-p.t0),pn=PD.length+pw.length;
    return {arms:by,total:agg(null),bus,person,ped:{n:PD.length,flow:Math.round(PD.length*3600/T),wait:pn?+((PD.reduce((s,d)=>s+d.wait,0)+pw.reduce((s,w)=>s+w,0))/pn).toFixed(1):0}};}
}
