/* Koʻchasoz — svetofor rejasi va hisob (asosiy oqimda ham, Web Worker'da ham ishlaydi).
 * base = {N: model tarmogʻi (JSON), bound: [chetki qoʻl id], o: {demand, shares, ped, bus, off, auto, pl, cycle}, nl: {armId: ekvivalent boʻlak}, bus: {armId: avt/soat}, anySig}
 * ch   = {prot: alohida chap faza, cycle: son | null (Webster), eq: fazalarga teng yashil, gw: '0'|'f'|'b' yashil toʻlqin yoʻnalishi} */
import * as M from './kssim-graph.js?v=16';

const clone=x=>JSON.parse(JSON.stringify(x));
/* chorraha markazi: kiruvchi boʻlaklar toʻxtash nuqtalarining oʻrtachasi */
const center=(N,jid)=>{const P=[];N.arms.filter(a=>a.j===jid).forEach(a=>a.lanes.forEach(l=>P.push(l.pts[l.pts.length-1])));return P.length?[P.reduce((s,p)=>s+p[0],0)/P.length,P.reduce((s,p)=>s+p[1],0)/P.length]:[0,0];};
/* yashil toʻlqin: svetoforlar eng uzoq juftlik oʻqi boʻyicha tartiblanadi, siljish = masofa / 11 m/s (≈40 km/soat) */
function waveOffsets(N,C,dir){const S=N.juncs.filter(j=>j.signal).map(j=>({j,c:center(N,j.id)}));if(S.length<2)return {};
  let A=S[0],B=S[1],m=-1;S.forEach(x=>S.forEach(y=>{const d=Math.hypot(x.c[0]-y.c[0],x.c[1]-y.c[1]);if(d>m){m=d;A=x;B=y;}}));
  const ux=(B.c[0]-A.c[0])/(m||1),uy=(B.c[1]-A.c[1])/(m||1),out={};
  S.forEach(x=>{const s=(x.c[0]-A.c[0])*ux+(x.c[1]-A.c[1])*uy,t=(dir==='b'?m-s:s)/11;out[x.j.id]=((t%C)+C)%C;});return out;}

export function planSignals(N,base,ch){const {bound,o,nl}=base,lanes=id=>nl[id]||1;
  const tot=bound.reduce((s,id)=>s+(o.demand[id]||0),0),eq=bound.reduce((s,id)=>s+lanes(id),0)||1,perL=tot/eq,flows={};
  N.arms.forEach(a=>flows[a.id]=bound.includes(a.id)?(o.demand[a.id]||0):perL*lanes(a.id));
  const sh=o.shares,info=[],W={};
  N.juncs.forEach(j=>{if(!j.signal)return;const A=N.arms.filter(a=>a.j===j.id),ph=M.autoPhases(A,{protLeft:!!ch.prot});j.signal.phases=ph;W[j.id]=M.webster(A,ph,flows,sh,{armShares:o.armShares});});
  const Cc=ch.cycle||Math.max(40,...Object.values(W).map(w=>w.cycle),40);let k=0;const wave=ch.gw&&ch.gw!=='0'?waveOffsets(N,Cc,ch.gw):null;
  N.juncs.forEach(j=>{if(!j.signal)return;const A=N.arms.filter(a=>a.j===j.id);j.signal.cycle=Cc;
    j.signal.split=ch.eq?j.signal.phases.map(()=>1/j.signal.phases.length):M.webster(A,j.signal.phases,flows,sh,{min:Cc,max:Cc,armShares:o.armShares}).split;
    j.signal.offset=wave?Math.round(wave[j.id]||0):((o.off||0)*k)%Cc;k++;const G=Cc-j.signal.phases.length*5;
    info.push({j:j.id,C:Cc,Y:W[j.id].Y,off:j.signal.offset,gw:ch.gw||'0',ph:j.signal.phases.map((p,i)=>({left:!Array.isArray(p),arms:Array.isArray(p)?p:p.arms,g:Math.round(G*j.signal.split[i])}))});});
  return info;}

export function makeSim(base,ch,seed){const N=clone(base.N),info=planSignals(N,base,ch),o=base.o;
  const sim=new M.GraphSim(N,{demand:o.demand,shares:o.shares,armShares:o.armShares,seed,ped:o.ped,bus:base.bus,par:o.par});sim.info=info;return sim;}

export function defaultCh(base){const o=base.o;return {prot:o.pl==='y',cycle:o.auto?null:o.cycle,eq:false};}

/* toʻliq hisob. Avto svetofor: 1) 16 reja (Webster/60/90/120 s × Webster yoki teng boʻlinish × chap faza) 12 daqiqalik qisqa sinovda;
   2) eng yaxshi 3 tasi 3 takror × 15 daqiqa; eng kam kechikish tanlanadi. progress(0..1) */
export function evaluate(base,progress=()=>{}){const o=base.o,full=ch=>[1,2,3].map(s=>makeSim(base,ch,s).run(1020,.1).result(120));
  if(!base.anySig||!o.auto){const ch=defaultCh(base);progress(.1);const R=full(ch);return {R,ch,tried:[],info:makeSim(base,ch,1).info};}
  const nSig=base.N.juncs.filter(j=>j.signal).length,multi=nSig>1,wave=multi&&!(o.off>0);
  const P=o.pl==='y'?[true]:o.pl==='n'||multi?[false]:[false,true],cand=[];P.forEach(pr=>[null,60,90,120].forEach(c=>[false,true].forEach(eq=>cand.push({prot:pr,cycle:c,eq,gw:'0'}))));
  const tot=cand.length+(wave?4:0)+9;let done=0;const tried=[];
  const probe=ch=>{const sm=makeSim(base,ch,7).run(720,.1),r=sm.result(120);tried.push({...ch,C:sm.info.length?sm.info[0].C:ch.cycle,d:r.total.delay});progress(++done/tot);};
  cand.forEach(probe);
  /* koridor: eng yaxshi 2 reja uchun yashil toʻlqin (oldinga / orqaga) */
  if(wave){[...tried].sort((a,b)=>a.d-b.d).slice(0,2).forEach(t=>['f','b'].forEach(g=>probe({prot:t.prot,cycle:t.C,eq:t.eq,gw:g})));}
  tried.sort((a,b)=>a.d-b.d);const seen=new Set(),top=tried.filter(t=>{const k=t.prot+'|'+t.C+'|'+t.eq+'|'+t.gw;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,3);let best=null;
  top.forEach(t=>{const ch={prot:t.prot,cycle:t.C,eq:t.eq,gw:t.gw},R=[1,2,3].map(s=>{const r=makeSim(base,ch,s).run(1020,.1).result(120);progress(++done/tot);return r;}),d=R.reduce((x,r)=>x+r.total.delay,0)/3;t.full=d;if(!best||d<best.d)best={d,R,ch};});
  tried.sort((a,b)=>(a.full??1e9)-(b.full??1e9));return {R:best.R,ch:best.ch,tried,info:makeSim(base,best.ch,1).info};}
