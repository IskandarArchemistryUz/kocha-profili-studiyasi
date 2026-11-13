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

export class GraphSim{
  constructor(net,opt={}){
    this.o={demand:{},shares:{L:.2,S:.65,R:.15},seed:1,...opt};this.rnd=mulberry(this.o.seed);this.t=0;this.V=[];this.nid=1;this.done=[];this.pend={};
    this.arms=net.arms;this.armById={};net.arms.forEach(a=>this.armById[a.id]=a);
    this.link={};const add=(id,pts,kind,arm,extra)=>{const c=cum(pts);this.link[id]={id,pts,c,len:c[c.length-1],kind,arm,...extra};};
    net.arms.forEach(a=>{a.lanes.forEach(l=>add(l.id,l.pts,'in',a.id,{codes:l.codes}));a.exits.forEach(x=>add(x.id,x.pts,'out',a.id));});
    this.conns=net.conns.map(c=>{const fr=this.link[c.from],arm=fr.arm;add(c.id,c.pts,'conn',arm,{m:c.m,vmax:curveSpeed(c.pts)});return {...c,arm};});
    /* kesishuvlar va qoʻshilishlar */
    this.cf={};this.conns.forEach(c=>this.cf[c.id]=[]);
    const rank=(a,b)=>{ // a b ga yoʻl beradimi
      if(a.arm===b.arm)return false;const A=this.armById[a.arm],B=this.armById[b.arm];
      const opp=A.hin[0]*B.hin[0]+A.hin[1]*B.hin[1]<-.6;
      if(a.m==='L'&&opp&&b.m!=='L')return true;if(b.m==='L'&&opp&&a.m!=='L')return false;
      if(!this.sig){const cr=A.hin[0]*B.hin[1]-A.hin[1]*B.hin[0];return cr>0;} // B oʻngdan keladi (a ning yoʻnalishiga nisbatan)
      return null;};
    this.sig=net.signal||null;
    for(let i=0;i<this.conns.length;i++)for(let j=i+1;j<this.conns.length;j++){const a=this.conns[i],b=this.conns[j];if(a.from===b.from)continue;
      const La=this.link[a.id],Lb=this.link[b.id];let pts=a.arm===b.arm?[]:crossings(La.pts,La.c,Lb.pts,Lb.c);
      if(a.to===b.to)pts.push({sa:La.len,sb:Lb.len,merge:1});
      pts=pts.filter((p,k)=>!pts.some((q,m)=>m<k&&Math.abs(q.sa-p.sa)<2));
      pts.forEach(p=>{const r=rank(a,b);this.cf[a.id].push({s:p.sa,o:b.id,os:p.sb,yield:r===true,pri:r===false});this.cf[b.id].push({s:p.sb,o:a.id,os:p.sa,yield:r===false,pri:r===true});});}
    Object.values(this.cf).forEach(l=>l.sort((x,y)=>x.s-y.s));
    this.byFrom={};this.conns.forEach(c=>(this.byFrom[c.from]=this.byFrom[c.from]||[]).push(c));
    if(this.sig){const ph=this.sig.phases,C=this.sig.cycle,n=ph.length,g=Math.max(5,(C-n*(AMBER+ALLRED))/n);this.plan=ph.map((arms,k)=>({arms,t0:k*(g+AMBER+ALLRED),g}));}
  }
  /* svetofor holati: 'G' | 'A' (sariq) | 'R' */
  light(arm,t=this.t){if(!this.sig)return 'G';const C=this.sig.cycle,tt=((t%C)+C)%C;
    for(const p of this.plan)if(p.arms.includes(arm)){const d=tt-p.t0;if(d>=0&&d<p.g)return 'G';if(d>=p.g&&d<p.g+AMBER)return 'A';}return 'R';}
  /* yangi mashina: harakat (L/S/R) ulushlar boʻyicha, boʻlak — shu harakatga ruxsat bergan, eng boʻshi */
  spawn(arm){const A=this.armById[arm],avail=['L','S','R'].filter(m=>A.lanes.some(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m)));if(!avail.length)return;
    const sh=this.o.shares,tot=avail.reduce((s,m)=>s+(sh[m]||0),0)||1;let r=this.rnd()*tot,m=avail[avail.length-1];for(const x of avail){r-=sh[x]||0;if(r<=0){m=x;break;}}
    const cands=A.lanes.filter(l=>(this.byFrom[l.id]||[]).some(c=>c.m===m));
    const load=l=>this.V.filter(v=>v.route[0]===l.id&&v.li===0).length;cands.sort((p,q)=>load(p)-load(q));const lane=cands[0];
    const opts=this.byFrom[lane.id].filter(c=>c.m===m),c=opts[Math.floor(this.rnd()*opts.length)];
    const route=[lane.id,c.id,c.to],ff=route.reduce((s,id,k)=>s+this.link[id].len/(k===1?this.link[id].vmax:V0),0);
    (this.pend[arm]=this.pend[arm]||[]).push({route,m,arm,t0:this.t,ff});}
  admit(){Object.keys(this.pend).forEach(arm=>{const q=this.pend[arm];while(q.length){const p=q[0];
    const blocked=this.V.some(v=>v.route[0]===p.route[0]&&v.li===0&&v.s<LEN+IDM.s0+2);if(blocked)break;q.shift();
    this.V.push({id:this.nid++,...p,li:0,s:0,v:Math.min(V0,10),stopped:0});}});}
  /* mashinaning oldidagi toʻsiq: [masofa, toʻsiq tezligi] */
  ahead(v){let best=[1e9,V0];const R=v.route,look=80;
    let off=0;for(let k=v.li;k<R.length&&off<look;k++){const id=R[k],base=k===v.li?v.s:0;
      for(const u of this.V){if(u===v)continue;let us=null;
        if(u.route[u.li]===id)us=u.s;if(us==null)continue;const gap=off+us-base-LEN;if(us>base-1e-6&&gap<best[0])best=[gap,u.v];}
      off+=this.link[id].len-base;}
    return best;}
  /* svetofor va yoʻl berish: toʻxtash nuqtasigacha masofa.
     Chorrahaga kirish (toʻxtash chizigʻida) — yoʻl boʻsh boʻlsagina; ichkaridagi mashina faqat
     kesishuvni oʻzidan avval kirgan mashina egallab turgan boʻlsa toʻxtaydi (tiqilish boʻlmasligi uchun). */
  stopDist(v){let d=1e9;const R=v.route,L0=this.link[R[0]],cid=R[1];
    const occ=(c,u,k)=>u.li===k&&u.s>c.os-3&&u.s<c.os+LEN+1;
    if(v.li===0){const toStop=L0.len-v.s,lt=this.light(v.arm);
      if(lt!=='G'&&toStop>0.3){const need=v.v*v.v/(2*3.5);if(lt==='R'||toStop>need)d=Math.min(d,toStop);}
      if(d<1e9)return d;
      if(toStop<Math.max(12,v.v*v.v/(2*IDM.b)+6)){
        /* chiqish yoʻli toʻlib qolgan boʻlsa chorrahaga kirmaydi */
        const ex=R[2];if(this.V.some(u=>u.route[u.li]===ex&&u.s<LEN+3&&u.v<1))return toStop;
        const myV=Math.max(v.v,3);
        for(const c of this.cf[cid]){const myT=(toStop+c.s)/myV;
          for(const u of this.V){const k=u.route.indexOf(c.o);if(k!==1||u.li>1)continue;
            if(u.li===1){if(occ(c,u,1))return toStop;const uD=c.os-u.s;if(uD<0)continue;if(uD/Math.max(u.v,2)<myT+1.5)return toStop;continue;}
            if(this.light(u.arm)==='R')continue;const uD=this.link[u.route[0]].len-u.s+c.os,uT=uD/Math.max(u.v,3);if(uD>80)continue;
            if(c.yield&&(u.v>2||uD<15)&&uT<myT+3.5)return toStop;                        // yoʻl berish (99-band / oʻngdan)
            if(!c.pri&&!c.yield&&u.v>2&&uT<myT)return toStop;}}}
      return d;}
    if(v.li===1){for(const c of this.cf[cid]){const myD=c.s-v.s;if(myD<-1)continue;if(myD>25)break;
        for(const u of this.V){if(u===v||u.route[1]!==c.o)continue;if(occ(c,u,1)&&u.tIn<v.tIn){d=Math.min(d,myD-2);break;}}}}
    return d;}
  step(dt){this.t+=dt;
    this.arms.forEach(a=>{const q=(this.o.demand[a.id]??500)/3600;if(this.rnd()<q*dt)this.spawn(a.id);});
    this.admit();
    const acc=new Map();
    for(const v of this.V){const lk=this.link[v.route[v.li]],vmax=lk.kind==='conn'?lk.vmax:V0;
      let [gap,vl]=this.ahead(v);const sd=this.stopDist(v);if(sd<gap){gap=sd;vl=0;}
      const v0=Math.min(vmax,V0),ss=IDM.s0+Math.max(0,v.v*IDM.T+v.v*(v.v-vl)/(2*Math.sqrt(IDM.a*IDM.b)));
      let a=IDM.a*(1-Math.pow(v.v/v0,IDM.d)-Math.pow(ss/Math.max(gap,.1),2));
      if(v.li===0&&v.route[1]){const c=this.link[v.route[1]],dc=this.link[v.route[0]].len-v.s;if(dc<30&&v.v>c.vmax)a=Math.min(a,(c.vmax*c.vmax-v.v*v.v)/(2*Math.max(dc,1)));}
      acc.set(v,Math.max(-8,a));}
    const keep=[];
    for(const v of this.V){const a=acc.get(v);let nv=Math.max(0,v.v+a*dt);v.s+=Math.max(0,v.v*dt+.5*a*dt*dt);v.v=nv;if(v.v<.5)v.stopped+=dt;
      while(v.li<v.route.length&&v.s>=this.link[v.route[v.li]].len){v.s-=this.link[v.route[v.li]].len;v.li++;if(v.li===1)v.tIn=this.t;}
      if(v.li>=v.route.length){this.done.push({arm:v.arm,m:v.m,tt:this.t-v.t0,ff:v.ff,stopped:v.stopped,t:this.t});continue;}
      keep.push(v);}
    this.V=keep;}
  run(sec,dt=.1){const n=Math.round(sec/dt);for(let i=0;i<n;i++)this.step(dt);return this;}
  /* holat (chizish uchun): [{x,y,h,m,v}] */
  snapshot(){return this.V.map(v=>{const L=this.link[v.route[v.li]],p=pointAt(L.pts,L.c,v.s);return {id:v.id,x:p[0],y:p[1],h:p[2]||0,m:v.m,v:v.v};});}
  queues(){const q={};this.arms.forEach(a=>{q[a.id]=this.V.filter(v=>v.arm===a.id&&v.li===0&&v.v<2).length+(this.pend[a.id]||[]).length;});return q;}
  /* natija: qoʻl va jami boʻyicha oʻrtacha kechikish (s/mashina; tizimda qolgan va kirish navbatidagilar ham hisobga olinadi),
     oʻtkazish (mashina/soat), talabning bajarilishi va LOS (HCM: svetoforli 10/20/35/55/80, svetoforsiz 10/15/25/35/50) */
  result(from=0){const T=Math.max(1,this.t-from),th=this.sig?[10,20,35,55,80]:[10,15,25,35,50],los=d=>'ABCDE'[th.findIndex(x=>d<=x)]||'F';
    const trav=v=>{let x=v.s;for(let k=0;k<v.li;k++)x+=this.link[v.route[k]].len;return x;};
    const agg=arm=>{const D=this.done.filter(d=>d.t>=from&&(arm==null||d.arm===arm));let sum=D.reduce((s,d)=>s+Math.max(0,d.tt-d.ff),0),n=D.length;
      this.V.filter(v=>arm==null||v.arm===arm).forEach(v=>{sum+=Math.max(0,this.t-v.t0-trav(v)/V0);n++;});
      Object.entries(this.pend).forEach(([a,q])=>{if(arm!=null&&a!==arm)return;q.forEach(p=>{sum+=this.t-p.t0;n++;});});
      const dem=arm==null?this.arms.reduce((s,a)=>s+(this.o.demand[a.id]??500),0):(this.o.demand[arm]??500);
      const flow=Math.round(D.length*3600/T),dl=n?sum/n:0,back=n-D.length,ok=back<=Math.max(12*(arm==null?this.arms.length:1),.1*dem*T/3600);
      return {n:D.length,flow,demand:dem,backlog:back,delay:+dl.toFixed(1),los:n?(ok?los(dl):'F'):'—',queue:arm==null?0:(this.pend[arm]||[]).length+this.V.filter(v=>v.arm===arm&&v.li===0&&v.v<2).length};};
    const by={};this.arms.forEach(a=>by[a.id]=agg(a.id));return {arms:by,total:agg(null)};}
}
