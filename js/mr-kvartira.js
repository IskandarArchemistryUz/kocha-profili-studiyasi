/* Archemistry Lab — kvartirografiya (Kvartirografiya Studiyasi algoritmi, bino paneli uchun).
 *
 * Kirish: korpus uzunligi A va chuqurligi D (bino dogʻidan), rejalash tizimi, kvartira turlari nisbati.
 * Chiqish: tipik qavatdagi kvartiralar — bir nechta variant (nisbatga aniqlik ↔ kvartira soni).
 *
 * Model (Studiya bilan bir xil): korpus to'g'ri chiziqli; yadrolar (zina-lift, 6 m) orasi «maks.»dan oshmaydi;
 *  koridor — ikki qator kvartira + o'rtada koridor; seksiya — ikki qator + 1,4 m zina maydonchasi;
 *  galereya — bir qator + tashqi galereya. Kvartira eni ≥ 3,3 m; maydon oraliqlari — turlar jadvalidan.
 * Bu tezkor konseptual hisob — rasmiy reja emas.
 */
(function(){
'use strict';
const CORE=6,MINW=3.3;
const TYPES0=[
  {name:'Studiya', min:24,max:34, target:15, color:'#d4e98a'},
  {name:'1 xonali',min:36,max:48, target:30, color:'#8fd18a'},
  {name:'2 xonali',min:52,max:68, target:35, color:'#3fae98'},
  {name:'3 xonali',min:72,max:92, target:15, color:'#1a7fa8'},
  {name:'4 xonali',min:95,max:125,target:5,  color:'#2b4f8f'},
];
const SYS={corr:'Koridor',sec:'Seksiya',gal:'Galereya'};
const DEF={sys:'sec',corr:1.8,gal:1.6,span:40,sec:27,goal:.35,seed:1,pick:0};

function placeCores(len,cs,ce,span){
  for(let n=0;n<80;n++){
    if(n===0&&!cs&&!ce)continue;
    const free=len-n*CORE;if(free<0)return {free:[],cores:[[0,len]]};
    const segs=n+1,lim=[];
    for(let i=0;i<segs;i++)lim.push(((i===0&&!cs)||(i===segs-1&&!ce))?span/2:span);
    const sum=lim.reduce((a,b)=>a+b,0);
    if(free<=sum+1e-6){const f=[],c=[];let s=0;
      for(let i=0;i<segs;i++){const l=free*lim[i]/sum;f.push([s,s+l]);s+=l;if(i<segs-1){c.push([s,s+CORE]);s+=CORE;}}
      return {free:f.filter(x=>x[1]-x[0]>.5),cores:c};}
  }
  return {free:[],cores:[[0,len]]};
}
function geo(A,D,P){
  let rowsT,circT;
  if(P.sys==='gal'){rowsT=[[P.gal,D]];circT=[[0,P.gal]];}
  else{const c=P.sys==='sec'?1.4:P.corr,d=(D-c)/2;rowsT=[[0,d],[d+c,D]];circT=[[d,d+c]];}
  const span=P.sys==='sec'?Math.max(8,P.sec-CORE):P.span;
  const pc=placeCores(A,false,false,span),rows=[],circ=[];
  pc.free.forEach(([a,b])=>{rowsT.forEach(([t0,t1])=>rows.push({s0:a,s1:b,t0,t1,L:b-a,d:t1-t0}));circT.forEach(([t0,t1])=>circ.push({s0:a,s1:b,t0,t1}));});
  return {A,D,rows,circ,cores:pc.cores,ud:rowsT[0][1]-rowsT[0][0]};
}
function rng32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const typeW=(TY,d)=>TY.map((T,i)=>{const wmin=Math.max(T.min/d,MINW),wmax=T.max/d;return {i,wmin,wmax,ok:wmin<=wmax};});
function pickW(pool,wf,r){let s=0;const ws=pool.map(x=>{const v=wf(x);s+=v;return v;});let u=r()*s;for(let k=0;k<pool.length;k++){u-=ws[k];if(u<=0)return pool[k];}return pool[pool.length-1];}

/* bitta korpus (A×D) uchun variantlar */
function variants(A,D,P,TY){
  const G=geo(A,D,P);
  const ts=TY.reduce((a,t)=>a+t.target,0)||1,tgt=TY.map(t=>t.target/ts),r=rng32(P.seed*7919+13),avg=TY.map(t=>(t.min+t.max)/2),cands=[];
  for(let it=0;it<240;it++){
    const jit=TY.map(()=>.45+r()*1.1),counts=TY.map(()=>0);let n=0;const units=[];let techA=0;
    const order=G.rows.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    for(const ri of order){
      const row=G.rows[ri],W=typeW(TY,row.d);
      let pool=W.filter(x=>x.ok&&tgt[x.i]>0);if(!pool.length)pool=W.filter(x=>x.ok);
      const minW=pool.length?Math.min(...pool.map(x=>x.wmin)):Infinity;
      if(!pool.length||row.L<minW){units.push({...row,a:row.s0,b:row.s1,type:-1,area:row.L*row.d});techA+=row.L*row.d;continue;}
      let sel=null;
      for(let a=0;a<40&&!sel;a++){
        const lc=counts.slice();let ln=n;const s=[];let mn=0,mx=0;
        const wf=x=>{const sh=ln?lc[x.i]/ln:0;return (tgt[x.i]+.02)*Math.exp(5*(tgt[x.i]-sh))*Math.pow(55/avg[x.i],2.2*P.goal)*jit[x.i];};
        while(mx<row.L-1e-6){const x=pickW(pool,wf,r);s.push(x);lc[x.i]++;ln++;mn+=x.wmin;mx+=x.wmax;if(mn>row.L)break;}
        if(mn<=row.L+1e-6&&mx>=row.L-1e-6)sel={s,mn,mx};
      }
      let placed=[];
      if(sel){const sorted=sel.s.slice().sort((p,q)=>avg[q.i]-avg[p.i]),L=[],R=[];sorted.forEach((x,k)=>(k%2?R:L).push(x));
        const arr=L.concat(R.reverse()),tt=sel.mx-sel.mn>1e-9?Math.min(1,Math.max(0,(row.L-sel.mn)/(sel.mx-sel.mn))):0;
        placed=arr.map(x=>({i:x.i,w:x.wmin+tt*(x.wmax-x.wmin)}));}
      else{let rem=row.L;const ps=pool.slice().sort((p,q)=>p.wmin-q.wmin);
        while(rem>=ps[0].wmin){const opts=ps.filter(x=>x.wmin<=rem);const x=opts[Math.floor(r()*opts.length)];const w=Math.min(x.wmax,rem);placed.push({i:x.i,w});rem-=w;}
        if(rem>.05)placed.push({i:-1,w:rem});}
      let s0=row.s0;
      placed.forEach(p=>{const u={...row,a:s0,b:s0+p.w,type:p.i,area:p.w*row.d};s0+=p.w;units.push(u);if(p.i>=0){counts[p.i]++;n++;}else techA+=u.area;});
    }
    const share=counts.map(c=>n?c/n:0),err=share.reduce((a,s,i)=>a+Math.abs(s-tgt[i]),0)/2,net=units.reduce((a,u)=>a+(u.type>=0?u.area:0),0);
    cands.push({units,counts,n,share,err,net,techA});
  }
  const maxN=Math.max(1,...cands.map(c=>c.n));
  cands.forEach(c=>c.score=(1-P.goal)*c.err*4-P.goal*(c.n/maxN));
  cands.sort((a,b)=>a.score-b.score);
  const seen=new Set(),V=[];
  for(const c of cands){const k=c.counts.join('-');if(seen.has(k))continue;seen.add(k);V.push(c);if(V.length===6)break;}
  return {G,V,tgt};
}

/* bino: boʻlaklar [{A,D,floors}] — pogʻonalar har biri oʻz korpusi bilan */
const CACHE=new Map();
function building(parts,P,TY){
  P=Object.assign({},DEF,P||{});
  const key=JSON.stringify([parts.map(p=>[+p.A.toFixed(1),+p.D.toFixed(1),p.floors]),P.sys,P.corr,P.gal,P.span,P.sec,P.goal,P.seed,TY.map(t=>[t.min,t.max,t.target])]);
  let R=CACHE.get(key);
  if(!R){R=parts.filter(p=>p.floors>0&&p.A>=8&&p.D>=6).map(p=>Object.assign({},p,variants(p.A,p.D,P,TY)));CACHE.set(key,R);if(CACHE.size>400)CACHE.delete(CACHE.keys().next().value);}
  const pick=Math.max(0,P.pick||0);
  const counts=TY.map(()=>0);let n=0,net=0,techA=0,perFl=0;
  R.forEach(p=>{const v=p.V[Math.min(pick,p.V.length-1)];if(!v)return;v.counts.forEach((c,i)=>counts[i]+=c*p.floors);n+=v.n*p.floors;net+=v.net*p.floors;techA+=v.techA*p.floors;perFl=Math.max(perFl,v.n);});
  const share=counts.map(c=>n?c/n:0),ts=TY.reduce((a,t)=>a+t.target,0)||1,tgt=TY.map(t=>t.target/ts);
  const err=share.reduce((a,s,i)=>a+Math.abs(s-tgt[i]),0)/2;
  /* variant tanlovi uchun: asosiy (eng koʻp qavatli) boʻlakning variantlari */
  const main=R.slice().sort((a,b)=>b.floors-a.floors)[0]||null;
  return {parts:R,counts,n,net,techA,share,tgt,err,perFl,main,pick,P};
}

/* tipik qavat rejasi (SVG) */
function planSVG(part,pick,TY,maxW){
  if(!part)return '';const G=part.G,v=part.V[Math.min(pick,part.V.length-1)];if(!v)return '';
  const W=maxW||260,k=W/G.A,H=Math.max(24,G.D*k);
  const rc=(s0,s1,t0,t1,fill,st)=>`<rect x="${(s0*k).toFixed(1)}" y="${(t0*k).toFixed(1)}" width="${Math.max(.5,(s1-s0)*k).toFixed(1)}" height="${((t1-t0)*k).toFixed(1)}" fill="${fill}" ${st||''}/>`;
  return `<svg viewBox="-1 -1 ${W+2} ${H+2}" width="100%" style="display:block;max-width:${W}px" role="img" aria-label="Tipik qavat rejasi">`+
    G.circ.map(c=>rc(c.s0,c.s1,c.t0,c.t1,'#d9d7d2')).join('')+
    G.cores.map(([a,b])=>rc(a,b,0,G.D,'#58666c')).join('')+
    v.units.map(u=>rc(u.a,u.b,u.t0,u.t1,u.type>=0?TY[u.type].color:'#b9a98f','stroke="#fff" stroke-width=".8"')).join('')+
    `<rect x="0" y="0" width="${W}" height="${H.toFixed(1)}" fill="none" stroke="#141414" stroke-width="1"/></svg>`;
}
window.KVART={TYPES0,SYS,DEF,building,planSVG,variants};
})();
