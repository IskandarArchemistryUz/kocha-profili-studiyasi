/* Koʻchasoz — chorraha(lar)da harakatni sinash (simulyatsiya) oynasi.
 * Tarmoq: app.js dagi JNET (boʻlaklar + boʻlak ulagichlari). Model: js/kssim-graph.js (ES modul).
 * Bir koʻcha bilan bogʻlangan chorrahalar birga hisoblanadi (koridor / tarmoq): chiqish boʻlagi keyingi chorrahaga ulanadi.
 * app.js dan keyin yuklanadi: map, toLL, JNET, nodeById, nodeKind — app.js ning global nomlari.
 */
(function(){
'use strict';
if(typeof JNET==='undefined'||typeof map==='undefined')return;
let mod=null,box=null,cv=null,raf=0,st=null,res=null,WK=null;
/* talab darajasi: bitta umumiy boʻlakka avt/soat (yaqinlashish) */
const LV=[['past','Past (tun, dam olish)',150],['orta','Oʻrtacha (kunduz)',300],['tigiz','Tigʻiz soat',450],['eng','Eng tigʻiz',600]];
const LCOL={A:'#2b7449',B:'#2b7449',C:'#95620f',D:'#95620f',E:'#b23a2e',F:'#b23a2e'};
const MCOL={L:'#4c5bd4',S:'#1c2628',R:'#c0643a'};
const DIRS=['sharqdan','shimoli-sharqdan','shimoldan','shimoli-gʻarbdan','gʻarbdan','janubi-gʻarbdan','janubdan','janubi-sharqdan'];
const dirName=e=>{const a=Math.atan2(e.out[1],e.out[0]),k=((Math.round(a/(Math.PI/4))%8)+8)%8;return DIRS[k];};
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KT=J=>J.ring?'halqa':J.sig?'svetofor':'belgisiz';
let plan=null;
async function loadMod(){if(!mod)mod=await import(new URL('js/kssim-graph.js?v=11',document.baseURI).href);if(!plan)plan=await import(new URL('js/kssim-plan.js?v=2',document.baseURI).href);return mod;}

/* tugundan boshlab koʻcha orqali bogʻlangan chorrahalar (JNET) */
function component(nodeId){const all=[...JNET.values()],byReal=new Map();
  all.forEach(J=>J.E.forEach(e=>{const k=e.real;if(!byReal.has(k))byReal.set(k,[]);byReal.get(k).push([J,e]);}));
  const seen=new Set([nodeId]),q=[nodeId];
  while(q.length){const J=JNET.get(q.shift());if(!J)continue;J.E.forEach(e=>(byReal.get(e.real)||[]).forEach(([K])=>{if(!seen.has(K.id)){seen.add(K.id);q.push(K.id);}}));}
  const list=[...seen].map(id=>JNET.get(id)).filter(Boolean);
  /* juftliklar: bitta koʻcha ikki chorrahani bogʻlasa */
  const pairs=[];byReal.forEach(v=>{const w=v.filter(([J])=>seen.has(J.id));if(w.length===2&&w[0][0]!==w[1][0])pairs.push(w);});
  return {list,pairs};}

/* JNET → model tarmogʻi (bir yoki bir nechta chorraha) */
function buildNet(C,cycle){const arms=[],conns=[],juncs=[],links=[],names={},bound=[];
  const aid=(J,e)=>`n${J.id}a${e.ai}`,lid=(J,e,i)=>`n${J.id}a${e.ai}i${i}`,xid=(J,e,i)=>`n${J.id}a${e.ai}o${i}`;
  const linked=new Set();C.pairs.forEach(([[J1,e1],[J2,e2]])=>{linked.add(aid(J1,e1));linked.add(aid(J2,e2));
    e1.exits.forEach((x,i)=>links.push({from:xid(J1,e1,i),to:e2.lanes.map((_,k)=>lid(J2,e2,k))}));
    e2.exits.forEach((x,i)=>links.push({from:xid(J2,e2,i),to:e1.lanes.map((_,k)=>lid(J1,e1,k))}));});
  C.list.forEach((J,ji)=>{const jid='n'+J.id,A=J.E.map(e=>({id:aid(J,e),j:jid,hin:e.hin,cross:e.cross||undefined,
      lanes:e.lanes.map((l,i)=>({id:lid(J,e,i),pts:l.pts,codes:J.ring&&l.x.k!=='bus'?'LSR':l.code,bus:l.x.k==='bus'})),
      exits:e.exits.map((x,i)=>({id:xid(J,e,i),pts:x.pts,bus:x.x.k==='bus'}))}));
    arms.push(...A);J.E.forEach(e=>{names[aid(J,e)]=(C.list.length>1?`${ji+1}-tugun · `:'')+(e.name?e.name+' · ':'')+dirName(e);if(!linked.has(aid(J,e))&&e.lanes.length)bound.push(aid(J,e));});
    let cs;if(J.ring)cs=mod.ringConnect(A,J.ring,true).map(c=>({...c,id:jid+c.id}));
    else cs=J.C.map((c,k)=>({id:`${jid}c${k}`,from:lid(J,c.from,c.from.lanes.indexOf(c.s)),to:xid(J,c.to,c.to.exits.indexOf(c.d)),m:c.m,pts:c.pts}));
    conns.push(...cs);
    juncs.push({id:jid,ring:J.ring||null,signal:J.ring||!J.sig?null:{cycle,phases:mod.autoPhases(A),offset:0}});});
  return {net:{arms,conns,juncs,links,yUp:true},names,bound};}

function close(){cancelAnimationFrame(raf);raf=0;if(WK){WK.terminate();WK=null;}if(box)box.remove();if(cv)cv.remove();box=cv=st=res=null;map.off('move zoom resize',draw);}

window.openSim=async function(nodeId){
  close();await loadMod();
  const C=component(nodeId);
  if(!C.list.length||!C.list.some(J=>J.C.length||J.ring)){if(typeof toast==='function')toast('Bu chorrahada boʻlak ulanishlari yoʻq — koʻchalarni tekshiring.');return;}
  const probe=buildNet(C,90),multi=C.list.length>1;
  const host=map.getContainer();
  cv=document.createElement('canvas');cv.className='kssim-cv';cv.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:640';host.appendChild(cv);
  box=document.createElement('div');box.className='kssim';
  box.style.cssText='position:absolute;left:12px;top:12px;z-index:650;width:min(440px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;background:#fff;border:1px solid #d8d5ce;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.14);padding:12px 14px;font:13px/1.4 Archivo,system-ui,sans-serif;color:#141414';
  /* ekvivalent boʻlak: toʻgʻriga yuradigan boʻlak — 1, faqat burilish (choʻntak) — 0,5 */
  const nLanes=id=>{const a=probe.net.arms.find(x=>x.id===id);if(!a)return 1;const L=a.lanes.filter(l=>!l.bus);return Math.max(1,L.reduce((s,l)=>s+(!l.codes||l.codes.includes('S')?1:.5),0));};
  const rows=probe.bound.map(id=>`<tr><td>${esc(probe.names[id])} <span class="small" style="color:#777">· ${probe.net.arms.find(x=>x.id===id).lanes.filter(l=>!l.bus).length} boʻlak</span></td><td><input type="number" data-q="${id}" min="0" max="3000" step="50" value="${Math.round(nLanes(id)*LV[1][2]/50)*50}" style="width:72px"> <span class="small">avt/soat</span></td></tr>`).join('');
  const anySig=C.list.some(J=>J.sig&&!J.ring);
  const title=multi?`${C.list.length} ta chorraha (${C.list.map(KT).join(', ')})`:(C.list[0].ring?'aylanma halqa':C.list[0].sig?'svetoforli chorraha':'tartibga solinmagan chorraha');
  box.innerHTML=`<div style="display:flex;align-items:center;margin-bottom:6px"><b>Harakatni sinash · ${esc(title)}</b><span style="display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;background:#4c5bd4;color:#fff;font:600 10px/16px IBM Plex Mono,monospace;letter-spacing:.04em">BETA</span><span style="flex:1"></span><button data-x style="border:0;background:none;font-size:18px;cursor:pointer">×</button></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 8px"><span class="small">Vaqt:</span><select data-lv style="flex:1;min-width:150px">${LV.map((l,i)=>`<option value="${i}"${i===1?' selected':''}>${l[1]}</option>`).join('')}</select><button data-run class="btn" style="background:#141414;color:#fff;border-color:#141414">Hisoblash</button><button data-play class="btn">▶ Koʻrsatish</button></div>
    <div class="small" data-lvh style="color:#555;margin:-4px 0 6px"></div>
    <details style="margin-bottom:8px"><summary class="small" style="cursor:pointer;color:#555">Batafsil: har kirish talabi, burilish, avtobus, piyoda${anySig?', svetofor':''}</summary>
    ${multi?'<div class="small" style="color:#555;margin:6px 0">Koʻcha bilan bogʻlangan chorrahalar birga hisoblanadi: bir chorrahadan chiqqan mashina keyingisiga yetib boradi. Talab — faqat chetki kirishlarga.</div>':''}
    <table style="width:100%;border-collapse:collapse;margin-top:4px"><tbody>${rows}</tbody></table>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:center">
      <span class="small">Ulush, %:</span> ↰ <input type="number" data-s="L" value="20" min="0" max="100" style="width:48px"> ↑ <input type="number" data-s="S" value="65" min="0" max="100" style="width:48px"> ↱ <input type="number" data-s="R" value="15" min="0" max="100" style="width:48px">
      <span class="small">Avtobus, avt/soat</span> <input type="number" data-b value="0" min="0" max="200" step="5" style="width:52px" title="Avtobus boʻlagi bor kirishlarga, boʻlmasa — hammasiga">
      <span class="small">Piyoda, kishi/soat</span> <input type="number" data-p value="100" min="0" max="2000" step="50" style="width:60px">
      ${anySig?`<span class="small">Sikl</span> <select data-cm title="Webster (1958): C=(1,5L+5)/(1−Y), yashil talabga mutanosib"><option value="a" selected>Avto (Webster)</option><option value="m">Qoʻlda</option></select> <input type="number" data-c value="90" min="40" max="180" step="5" style="width:56px" disabled> <span class="small">s</span>
      <span class="small">Chap faza</span> <select data-pl title="Avto: oddiy 2 fazali sxema toʻyinsa (Y>0,85) va alohida chap faza yengilroq boʻlsa"><option value="a" selected>Avto</option><option value="y">Har doim alohida</option><option value="n">Yoʻq (ruxsat etilgan)</option></select>`:''}
      ${anySig&&multi?`<span class="small">Yashil toʻlqin, s</span> <input type="number" data-o value="0" min="0" max="180" step="5" style="width:56px" title="Har keyingi svetoforning siljishi (offset)">`:''}
    </div></details>
    <div data-out class="small" style="color:#555">Vaqtni tanlang va «Hisoblash»ni bosing — natija xaritada rang bilan chiqadi. Beta: natijalar taxminiy, loyiha qarori uchun tasdiqlangan model emas. Model: IDM ergashish, svetofor fazalari, ulagichlar kesishuvida yoʻl berish (YHQ: chapga buriluvchi qarshidagiga, svetoforsizda oʻngdan kelayotganga, halqada — aylanayotganlarga), burilishda piyodaga yoʻl berish.</div>`;
  host.appendChild(box);
  ['mousedown','dblclick','wheel','click','contextmenu'].forEach(ev=>box.addEventListener(ev,e=>e.stopPropagation()));
  box.querySelector('[data-x]').onclick=close;
  const lvSel=box.querySelector('[data-lv]'),lvH=()=>{const v=LV[+lvSel.value][2];box.querySelector('[data-lvh]').textContent=`≈ ${v} avt/soat toʻgʻri boʻlakka (burilish choʻntagi — yarmi); kirishlar boʻlak soniga qarab (qoʻlda oʻzgartirish — «Batafsil»da).`;};
  box.querySelectorAll('[data-q]').forEach(i=>i.addEventListener('input',()=>i.dataset.man='1'));
  box.addEventListener('change',()=>{chosen=null;});box.addEventListener('input',()=>{chosen=null;});
  lvSel.onchange=()=>{const v=LV[+lvSel.value][2];box.querySelectorAll('[data-q]').forEach(i=>{if(!i.dataset.man)i.value=Math.round(nLanes(i.dataset.q)*v/50)*50;});lvH();};lvH();
  const num=(sel,d)=>{const i=box.querySelector(sel);return i?Math.max(0,+i.value||0):d;};
  const opts=()=>{const demand={},sh={};box.querySelectorAll('[data-q]').forEach(i=>demand[i.dataset.q]=Math.max(0,+i.value||0));
    box.querySelectorAll('[data-s]').forEach(i=>sh[i.dataset.s]=Math.max(0,+i.value||0)/100);
    const cm=box.querySelector('[data-cm]'),pl=box.querySelector('[data-pl]');
    return {demand,shares:sh,cycle:Math.max(40,num('[data-c]',90)||90),auto:!cm||cm.value==='a',pl:pl?pl.value:'a',ped:num('[data-p]',0),bus:num('[data-b]',0),off:num('[data-o]',0)};};
  if(box.querySelector('[data-cm]'))box.querySelector('[data-cm]').onchange=e=>{box.querySelector('[data-c]').disabled=e.target.value==='a';};
  /* svetofor rejasi: chap faza qarori (koʻpaytma mezoni) + Webster sikli; koridorda umumiy sikl (yashil toʻlqin uchun) */

  /* svetofor rejasi. ch={prot:bool, cycle:son|null(Webster)}; yashil boʻlinishi — Webster (talabga mutanosib); koridorda umumiy sikl */
  /* hisob asosi (JSON): tarmoq, chetki qoʻllar, talab, ekvivalent boʻlaklar — worker'ga ham shu yuboriladi */
  let chosen=null,sigInfo=[],tried=[],job=0;
  const baseOf=()=>{const o=opts(),B=buildNet(C,o.cycle),N=B.net,nl={},bus={};N.arms.forEach(a=>nl[a.id]=nLanes(a.id));
    const hasBL=N.arms.some(a=>B.bound.includes(a.id)&&a.lanes.some(l=>l.bus));B.bound.forEach(id=>{const a=N.arms.find(x=>x.id===id);if(!hasBL||a.lanes.some(l=>l.bus))bus[id]=o.bus;});
    return {N,bound:B.bound,o,nl,bus,anySig};};
  const mk=seed=>{const b=baseOf(),sim=plan.makeSim(b,chosen||plan.defaultCh(b),seed);sigInfo=sim.info;return sim;};
  const runJob=(base,onP)=>new Promise((ok,bad)=>{
    try{if(!WK){WK=new Worker(new URL('js/kssim-worker.js?v=2',document.baseURI),{type:'module'});}}catch(e){WK=null;}
    if(!WK){setTimeout(()=>{try{ok(plan.evaluate(base,onP));}catch(e){bad(e);}},20);return;}
    const id=++job;WK.onmessage=e=>{const d=e.data;if(d.id!==job)return;if(d.p!=null)onP(d.p);if(d.done)ok(d.done);if(d.err)bad(new Error(d.err));};
    WK.onerror=e=>{WK.terminate();WK=null;try{ok(plan.evaluate(base,onP));}catch(x){bad(x);}};WK.postMessage({id,base});});
  box.querySelector('[data-run]').onclick=()=>{cancelAnimationFrame(raf);raf=0;st=null;res=null;draw();
    const out=box.querySelector('[data-out]'),btn=box.querySelector('[data-run]'),auto=anySig&&opts().auto;box.querySelector('[data-play]').textContent='▶ Koʻrsatish';
    out.innerHTML=`<div class="small" style="color:#555">${auto?'Svetofor rejalari sinalmoqda va hisoblanmoqda':'Hisoblanmoqda'}… <span data-pc>0</span>%</div><div style="height:4px;background:#eee;border-radius:2px;margin-top:4px"><div data-pb style="height:4px;width:0;background:#4c5bd4;border-radius:2px;transition:width .2s"></div></div>`;
    btn.disabled=true;const t0=performance.now();
    const base=baseOf();window.__ksLastBase=base;runJob(base,p=>{const pc=Math.round(p*100);const a=out.querySelector('[data-pc]'),b=out.querySelector('[data-pb]');if(a)a.textContent=pc;if(b)b.style.width=pc+'%';})
      .then(r=>{btn.disabled=false;chosen=r.ch;tried=r.tried;sigInfo=r.info;show(r.R);})
      .catch(e=>{btn.disabled=false;out.textContent='Xato: '+(e&&e.message||e);console.error(e);});};
  box.querySelector('[data-play]').onclick=()=>{const b=box.querySelector('[data-play]');
    if(raf){cancelAnimationFrame(raf);raf=0;b.textContent='▶ Koʻrsatish';return;}
    if(!st)st={sim:mk(1),C,last:performance.now()};res=null;b.textContent='⏸ Toʻxtatish';st.last=performance.now();loop();};
  map.on('move zoom resize',draw);
  function show(R){const avg=f=>R.reduce((s,r)=>s+f(r),0)/R.length,LS=[10,20,35,55,80],LU=[10,15,25,35,50],los=(d,sg,F)=>F?'F':('ABCDE'[(sg?LS:LU).findIndex(x=>d<=x)]||'F');
    const col=l=>({A:'#2b7449',B:'#2b7449',C:'#95620f',D:'#95620f',E:'#b23a2e',F:'#b23a2e'}[l]||'#555');
    const row=(name,get,sg,dem=true)=>{const d=avg(r=>get(r).delay),fl=avg(r=>get(r).flow),dm=get(R[0]).demand,F=R.filter(r=>get(r).los==='F').length>=2,l=los(d,sg,F);
      return `<tr><td>${esc(name)}</td><td class="num">${dem&&dm!=null?Math.round(dm):''}</td><td class="num">${Math.round(fl)}</td><td class="num">${d.toFixed(1)}</td><td><b style="color:${col(l)}">${l}</b></td></tr>`;};
    let body='';
    if(multi){C.list.forEach((J,i)=>{const jid='n'+J.id;body+=row(`${i+1}-tugun · ${KT(J)}`,r=>({...r.juncs[jid],demand:null}),J.sig&&!J.ring,false);});
      body+=`<tr><td colspan="5" class="small" style="color:#777;padding-top:4px">Chetki kirishlar</td></tr>`;}
    const JbyA=id=>C.list.find(J=>id.startsWith('n'+J.id+'a'));
    probe.bound.forEach(id=>{const J=JbyA(id);body+=row(probe.names[id],r=>r.arms[id],J&&J.sig&&!J.ring);});
    body+=row(multi?'Jami (sayohat boʻyicha)':'Jami',r=>r.total,!multi&&C.list[0].sig&&!C.list[0].ring);
    const pw=avg(r=>r.ped.wait),pf=avg(r=>r.ped.flow),bf=avg(r=>r.bus.flow);
    body+=(bf>0?`<tr><td>Avtobuslar</td><td></td><td class="num">${Math.round(bf)}</td><td class="num">${avg(r=>r.bus.delay).toFixed(1)}</td><td></td></tr><tr><td>Odam boshiga</td><td></td><td></td><td class="num">${avg(r=>r.person).toFixed(1)}</td><td class="small">kechikish</td></tr>`:'')
      +(pf>0?`<tr><td>Piyodalar</td><td></td><td class="num">${Math.round(pf)}</td><td class="num">${pw.toFixed(1)}</td><td class="small">kutish</td></tr>`:'');
    /* xaritaga: har kirish LOS + navbat (95-persentil) */
    const A={};probe.bound.forEach(id=>{const J=JbyA(id),sg=J&&J.sig&&!J.ring,d=avg(r=>r.arms[id].delay),F=R.filter(r=>r.arms[id].los==='F').length>=2;
      A[id]={los:los(d,sg,F),d,q:avg(r=>r.arms[id].q95||0),J,e:J&&J.E.find(e=>`n${J.id}a${e.ai}`===id)};});
    const Jr={};C.list.forEach(J=>{const t=multi?r=>r.juncs['n'+J.id]:r=>r.total,sg=J.sig&&!J.ring,d=avg(r=>t(r).delay),F=R.filter(r=>t(r).los==='F').length>=2;Jr[J.id]={los:los(d,sg,F),d};});
    res={C,A,J:Jr};draw();
    const worst=Object.entries(A).sort((x,y)=>y[1].d-x[1].d)[0],T=avg(r=>r.total.delay),TF=R.filter(r=>r.total.los==='F').length>=2,TL=los(T,!multi&&C.list[0].sig&&!C.list[0].ring,TF);
    const nm=id=>probe.names[id].replace(/^\d+-tugun · /,''),good='AB'.includes(TL),bad='EF'.includes(TL);
    const verdict=`<div style="padding:8px 10px;border-radius:8px;margin-bottom:8px;background:${good?'#e8f2ec':bad?'#f6e6e3':'#f6efe2'};color:#141414"><b style="color:${LCOL[TL]};font-size:16px">${TL}</b> · ${multi?'Tarmoq':'Chorraha'} ${good?'bemalol ishlaydi':bad?'yuklamani koʻtarmaydi':'ishlaydi, lekin navbat bor'} (oʻrtacha ${T.toFixed(0)} s).${worst&&worst[1].d>T+3?` Eng qiyini — ${esc(nm(worst[0]))}: ${worst[1].los}, ${worst[1].d.toFixed(0)} s, navbat ~${Math.round(worst[1].q)} mashina.`:''}${bad?(anySig?' Svetofor rejasi eng yaxshisi tanlangan — demak geometriya yetmaydi: boʻlak/choʻntak qoʻshish, chap burilishni cheklash yoki halqa bilan solishtiring.':' Svetofor, halqa yoki qoʻshimcha boʻlakni sinab koʻring.'):''}</div>`;
    const dn=id=>{const n=probe.names[id]||id;return esc(n.replace(/^\d+-tugun · /,'').split(' · ').pop());};
    const sigTxt=sigInfo.length?`<div class="small" style="color:#555;margin:-2px 0 8px">Svetofor: sikl <b>${sigInfo[0].C} s</b>${opts().auto?` (avto, ${tried.length} reja sinaldi${tried.some(t=>t.full!=null)?': '+tried.filter(t=>t.full!=null).map(t=>(t.prot?'↰+':'')+t.C+' s'+(t.eq?' teng':'')+' → '+t.full.toFixed(0)+' s').join(', '):''})`:' (qoʻlda)'}${sigInfo.map(x=>' · '+(sigInfo.length>1?x.j.replace(/^n/,'#')+': ':'')+x.ph.map(p=>(p.left?'↰ ':'')+p.arms.map(dn).join('–')+' '+p.g+' s').join(', ')).join('')}</div>`:'';
    box.querySelector('[data-out]').innerHTML=verdict+sigTxt+`<table style="width:100%;border-collapse:collapse;color:#141414"><thead><tr style="text-align:left;color:#777"><th></th><th>Talab</th><th>Oʻtdi</th><th>Kechikish, s</th><th>LOS</th></tr></thead><tbody>${body}</tbody></table>
      <div style="margin-top:6px">3 ta tasodifiy takror × 15 daq. (birinchi 2 daq. — isinish). Kechikish — erkin harakatga nisbatan, navbatda qolganlar ham hisobga olingan${multi?'; tugun boʻyicha — shu chorrahaga yaqinlashish va undan oʻtish, jami — butun sayohat':''}. LOS — HCM (svetoforli: 10/20/35/55/80 s, svetoforsiz va halqa: 10/15/25/35/50 s); talab bajarilmasa — F.</div>`;}
  function loop(){raf=requestAnimationFrame(loop);const now=performance.now(),dt=Math.min(.1,(now-st.last)/1000)*4;st.last=now;
    for(let k=0;k<Math.max(1,Math.round(dt/.1));k++)st.sim.step(Math.min(.1,dt));draw();
    if(Math.floor(st.sim.t)%2===0){const r=st.sim.result(0),q=st.sim.queues();box.querySelector('[data-out]').innerHTML=`t = ${Math.floor(st.sim.t)} s · mashina: ${st.sim.V.length} · oʻtdi: ${r.total.n} · oʻrtacha kechikish: ${r.total.delay} s · navbat: ${Object.values(q).reduce((a,b)=>a+b,0)}`;}}
};

function draw(){if(!cv)return;const host=map.getContainer(),W=host.clientWidth,H=host.clientHeight,dpr=window.devicePixelRatio||1;
  if(cv.width!==W*dpr||cv.height!==H*dpr){cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';}
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);if(!st&&!res)return;
  const o=(st||res).C.list[0].o,P=q=>{const p=map.latLngToContainerPoint(toLL(q,o));return [p.x,p.y];};
  const a=P([0,0]),b=P([1,0]),ppm=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(res){drawRes(g,P,ppm);return;}
  /* svetofor chiroqlari — toʻxtash chizigʻida */
  st.C.list.forEach(J=>{if(!J.sig||J.ring)return;J.E.forEach(e=>{if(!e.lanes.length)return;const l=st.sim.light(`n${J.id}a${e.ai}`),c=l==='G'?'#2b9a5a':l==='A'?'#e0a526':'#d23c2e';
    e.lanes.forEach(ln=>{const p=P(ln.P);g.fillStyle=c;g.fillRect(p[0]-ppm*1.6,p[1]-ppm*1.6,ppm*3.2,ppm*.6+1);});});});
  st.sim.peds().forEach(p=>{const c=P([p.x,p.y]);g.fillStyle=p.walk?'#95620f':'#c9a35a';g.beginPath();g.arc(c[0],c[1],Math.max(1.8,ppm*.45),0,7);g.fill();});
  g.lineCap='butt';
  st.sim.snapshot().forEach(v=>{const f=P([v.x,v.y]),r=P([v.x-Math.cos(v.h)*v.len,v.y-Math.sin(v.h)*v.len]);  // oldingi uchidan orqaga
    g.strokeStyle=v.bus?'#2a5a9a':(MCOL[v.m]||'#1c2628');g.lineWidth=Math.max(2,ppm*(v.bus?2.5:1.9));g.beginPath();g.moveTo(r[0],r[1]);g.lineTo(f[0],f[1]);g.stroke();
    if(ppm>3){g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=Math.max(1,ppm*.5);g.beginPath();const t=[f[0]+(r[0]-f[0])*.2,f[1]+(r[1]-f[1])*.2];g.moveTo(f[0],f[1]);g.lineTo(t[0],t[1]);g.stroke();}});
}
/* natija xaritada: navbat chizigʻi (kirish boʻlaklari boʻylab) + LOS belgisi */
function drawRes(g,P,ppm){
  const badge=(c,txt,col,r)=>{g.fillStyle='#fff';g.beginPath();g.arc(c[0],c[1],r+2,0,7);g.fill();g.fillStyle=col;g.beginPath();g.arc(c[0],c[1],r,0,7);g.fill();
    g.fillStyle='#fff';g.font=`600 ${Math.round(r*1.15)}px Archivo,system-ui,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(txt,c[0],c[1]+.5);};
  const along=(pts,from,len)=>{/* pts: uzoqdan toʻxtash chizigʻiga; oxiridan orqaga len m */const out=[pts[pts.length-1]];let rem=len;
    for(let i=pts.length-1;i>0&&rem>0;i--){const p=pts[i],q=pts[i-1],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d>=rem){const t=rem/d;out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);rem=0;}else{out.push(q);rem-=d;}}return out;};
  Object.values(res.A).forEach(x=>{if(!x.e)return;const L=x.e.lanes.filter(l=>l.x.k!=='bus'),n=Math.max(1,L.length),qm=Math.max(0,x.q/n*7);
    g.lineCap='round';g.strokeStyle=LCOL[x.los]||'#555';g.globalAlpha=.55;g.lineWidth=Math.max(3,ppm*2.6);
    L.forEach(l=>{if(qm<1)return;const s=along(l.pts,0,qm).map(P);g.beginPath();s.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();});g.globalAlpha=1;
    const m=x.e.lanes.reduce((s,l)=>[s[0]+l.P[0]/x.e.lanes.length,s[1]+l.P[1]/x.e.lanes.length],[0,0]),c=P([m[0]+x.e.out[0]*14,m[1]+x.e.out[1]*14]);
    /* belgi: LOS + navbat (mashina) — toʻxtash chizigʻidan 14 m orqada */
    const txt=`${x.los} · ${Math.round(x.d)} s · navbat ${Math.round(x.q)}`;g.font='600 12px Archivo,system-ui,sans-serif';const w=g.measureText(txt).width+14;
    g.fillStyle='#fff';g.beginPath();g.roundRect(c[0]-w/2-2,c[1]-12,w+4,24,12);g.fill();g.fillStyle=LCOL[x.los]||'#555';g.beginPath();g.roundRect(c[0]-w/2,c[1]-10,w,20,10);g.fill();
    g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,c[0],c[1]+.5);});
  res.C.list.forEach(J=>{const r=res.J[J.id];if(!r)return;const all=J.E.flatMap(e=>e.lanes.map(l=>l.P)),c=J.ring?J.ring.c:all.reduce((s,p)=>[s[0]+p[0]/all.length,s[1]+p[1]/all.length],[0,0]);
    badge(P(c),r.los,LCOL[r.los]||'#555',15);});
}
})();
