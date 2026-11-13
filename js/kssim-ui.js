/* Koʻchasoz — chorrahada harakatni sinash (simulyatsiya) oynasi.
 * Tarmoq: app.js dagi JNET (boʻlaklar + boʻlak ulagichlari). Model: js/kssim-graph.js (ES modul).
 * app.js dan keyin yuklanadi: map, toLL, JNET, nodeById, nodeKind, afterDesign — app.js ning global nomlari.
 */
(function(){
'use strict';
if(typeof JNET==='undefined'||typeof map==='undefined')return;
let mod=null,box=null,cv=null,raf=0,st=null;
const MCOL={L:'#4c5bd4',S:'#1c2628',R:'#c0643a'};
const DIRS=['sharqdan','shimoli-sharqdan','shimoldan','shimoli-gʻarbdan','gʻarbdan','janubi-gʻarbdan','janubdan','janubi-sharqdan'];
const armName=e=>{const a=Math.atan2(e.out[1],e.out[0]),k=((Math.round(a/(Math.PI/4))%8)+8)%8;return (e.name?e.name+' · ':'')+DIRS[k];};
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function loadMod(){if(!mod)mod=await import(new URL('js/kssim-graph.js?v=6',document.baseURI).href);return mod;}

/* JNET → model tarmogʻi */
function buildNet(J,cycle){
  const arms=J.E.map(e=>({id:'q'+e.ai,hin:e.hin,cross:e.cross||undefined,
    lanes:e.lanes.map((l,i)=>({id:`q${e.ai}i${i}`,pts:l.pts,codes:J.ring&&l.x.k!=='bus'?'LSR':l.code,bus:l.x.k==='bus'})),
    exits:e.exits.map((x,i)=>({id:`q${e.ai}o${i}`,pts:x.pts,bus:x.x.k==='bus'}))}));
  const conns=J.C.map((c,k)=>({id:'c'+k,from:`q${c.from.ai}i${c.from.lanes.indexOf(c.s)}`,to:`q${c.to.ai}o${c.to.exits.indexOf(c.d)}`,m:c.m,pts:c.pts}));
  if(J.ring)return {arms,conns:mod.ringConnect(arms,J.ring,true),ring:J.ring,signal:null};
  return {arms,conns,signal:J.sig?{cycle,phases:mod.autoPhases(arms)}:null};}

function close(){cancelAnimationFrame(raf);raf=0;if(box)box.remove();if(cv)cv.remove();box=cv=st=null;map.off('move zoom resize',draw);}

window.openSim=async function(nodeId){
  close();await loadMod();
  const J=JNET.get(nodeId);if(!J||!J.C.length){if(typeof toast==='function')toast('Bu chorrahada boʻlak ulanishlari yoʻq — koʻchalarni tekshiring.');return;}
  const host=map.getContainer();
  cv=document.createElement('canvas');cv.className='kssim-cv';cv.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:640';host.appendChild(cv);
  box=document.createElement('div');box.className='kssim';
  box.style.cssText='position:absolute;left:12px;top:12px;z-index:650;width:min(430px,calc(100% - 24px));max-height:70%;overflow:auto;background:#fff;border:1px solid #d8d5ce;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.14);padding:12px 14px;font:13px/1.4 Archivo,system-ui,sans-serif;color:#141414';
  const rows=J.E.filter(e=>e.lanes.length).map(e=>`<tr><td>${esc(armName(e))}</td><td><input type="number" data-q="${e.ai}" min="0" max="3000" step="50" value="500" style="width:72px"> <span class="small">avt/soat</span></td></tr>`).join('');
  box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>Harakatni sinash · ${J.ring?'aylanma halqa':J.sig?'svetoforli chorraha':'tartibga solinmagan chorraha'}</b><span style="display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;background:#4c5bd4;color:#fff;font:600 10px/16px IBM Plex Mono,monospace;letter-spacing:.04em;vertical-align:middle">BETA</span><button data-x style="border:0;background:none;font-size:18px;cursor:pointer">×</button></div>
    <table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:center">
      <span class="small">Ulush, %:</span> ↰ <input type="number" data-s="L" value="20" min="0" max="100" style="width:48px"> ↑ <input type="number" data-s="S" value="65" min="0" max="100" style="width:48px"> ↱ <input type="number" data-s="R" value="15" min="0" max="100" style="width:48px">
      <span class="small">Avtobus, avt/soat</span> <input type="number" data-b value="0" min="0" max="200" step="5" style="width:52px" title="Avtobus boʻlagi bor yoʻnalishlarga, boʻlmasa — hammasiga">
      <span class="small">Piyoda, kishi/soat</span> <input type="number" data-p value="100" min="0" max="2000" step="50" style="width:60px">
      ${J.sig?`<span class="small">Sikl</span> <input type="number" data-c value="90" min="40" max="180" step="5" style="width:56px"> <span class="small">s</span>`:''}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px"><button data-run class="btn">Hisoblash (15 daq.)</button><button data-play class="btn">▶ Koʻrsatish</button></div>
    <div data-out class="small" style="color:#555">Talabni kiriting va «Hisoblash»ni bosing. Beta: natijalar taxminiy, loyiha qarori uchun tasdiqlangan model emas. Model: IDM ergashish, svetofor fazalari, ulagichlar kesishuvida yoʻl berish (YHQ: chapga buriluvchi qarshidagiga, svetoforsizda oʻngdan kelayotganga), burilishda piyodaga yoʻl berish.</div>`;
  host.appendChild(box);
  ['mousedown','dblclick','wheel','click','contextmenu'].forEach(ev=>box.addEventListener(ev,e=>e.stopPropagation()));
  box.querySelector('[data-x]').onclick=close;
  const opts=()=>{const demand={},sh={};box.querySelectorAll('[data-q]').forEach(i=>demand['q'+i.dataset.q]=Math.max(0,+i.value||0));
    box.querySelectorAll('[data-s]').forEach(i=>sh[i.dataset.s]=Math.max(0,+i.value||0)/100);const c=box.querySelector('[data-c]');
    const pp=box.querySelector('[data-p]'),bb=box.querySelector('[data-b]');return {demand,shares:sh,cycle:c?Math.max(40,+c.value||90):90,ped:Math.max(0,+(pp&&pp.value)||0),bus:Math.max(0,+(bb&&bb.value)||0)};};
  const mk=(seed)=>{const o=opts(),N=buildNet(J,o.cycle),hasBL=N.arms.some(a=>a.lanes.some(l=>l.bus)),bus={};
    N.arms.forEach(a=>{if(!hasBL||a.lanes.some(l=>l.bus))bus[a.id]=o.bus;});return new mod.GraphSim(N,{demand:o.demand,shares:o.shares,seed,ped:o.ped,bus});};
  box.querySelector('[data-run]').onclick=()=>{cancelAnimationFrame(raf);raf=0;st=null;draw();
    const out=box.querySelector('[data-out]');out.textContent='Hisoblanmoqda…';
    setTimeout(()=>{const R=[1,2,3].map(s=>mk(s).run(1020,.1).result(120));show(R);},20);};
  box.querySelector('[data-play]').onclick=()=>{const b=box.querySelector('[data-play]');
    if(raf){cancelAnimationFrame(raf);raf=0;b.textContent='▶ Koʻrsatish';return;}
    if(!st)st={sim:mk(1),J,last:performance.now()};b.textContent='⏸ Toʻxtatish';st.last=performance.now();loop();};
  map.on('move zoom resize',draw);
  function show(R){const J2=J,avg=f=>R.reduce((s,r)=>s+f(r),0)/R.length,los=(d,F)=>{if(F)return 'F';const th=J2.sig?[10,20,35,55,80]:[10,15,25,35,50];return 'ABCDE'[th.findIndex(x=>d<=x)]||'F';};
    const col=l=>({A:'#2b7449',B:'#2b7449',C:'#95620f',D:'#95620f',E:'#b23a2e',F:'#b23a2e'}[l]||'#555');
    const line=(name,get)=>{const d=avg(r=>get(r).delay),fl=avg(r=>get(r).flow),dm=get(R[0]).demand,F=R.filter(r=>get(r).los==='F').length>=2,l=los(d,F);
      return `<tr><td>${esc(name)}</td><td class="num">${Math.round(dm)}</td><td class="num">${Math.round(fl)}</td><td class="num">${d.toFixed(1)}</td><td><b style="color:${col(l)}">${l}</b></td></tr>`;};
    const pw=avg(r=>r.ped.wait),pf=avg(r=>r.ped.flow),bf=avg(r=>r.bus.flow);
    const body=J2.E.filter(e=>e.lanes.length).map(e=>line(armName(e),r=>r.arms['q'+e.ai])).join('')+line('Jami',r=>r.total)+(bf>0?`<tr><td>Avtobuslar</td><td></td><td class="num">${Math.round(bf)}</td><td class="num">${avg(r=>r.bus.delay).toFixed(1)}</td><td></td></tr><tr><td>Odam boshiga</td><td></td><td></td><td class="num">${avg(r=>r.person).toFixed(1)}</td><td class="small">kechikish</td></tr>`:'')+(pf>0?`<tr><td>Piyodalar</td><td></td><td class="num">${Math.round(pf)}</td><td class="num">${pw.toFixed(1)}</td><td class="small">kutish</td></tr>`:'');
    box.querySelector('[data-out]').innerHTML=`<table style="width:100%;border-collapse:collapse;color:#141414"><thead><tr style="text-align:left;color:#777"><th>Qoʻl</th><th>Talab</th><th>Oʻtdi</th><th>Kechikish, s</th><th>LOS</th></tr></thead><tbody>${body}</tbody></table>
      <div style="margin-top:6px">3 ta tasodifiy takror × 15 daq. (birinchi 2 daq. — isinish). Kechikish — erkin harakatga nisbatan, navbatda qolganlar ham hisobga olingan. LOS — HCM (${J2.sig?'svetoforli: 10/20/35/55/80 s':'svetoforsiz: 10/15/25/35/50 s'}); talab bajarilmasa — F.</div>`;}
  function loop(){raf=requestAnimationFrame(loop);const now=performance.now(),dt=Math.min(.1,(now-st.last)/1000)*4;st.last=now;
    for(let k=0;k<Math.max(1,Math.round(dt/.1));k++)st.sim.step(Math.min(.1,dt));draw();
    if(Math.floor(st.sim.t)%2===0){const r=st.sim.result(0),q=st.sim.queues();box.querySelector('[data-out]').innerHTML=`t = ${Math.floor(st.sim.t)} s · mashina: ${st.sim.V.length} · oʻtdi: ${r.total.n} · oʻrtacha kechikish: ${r.total.delay} s · navbat: ${Object.values(q).reduce((a,b)=>a+b,0)}`;}}
};

function draw(){if(!cv)return;const host=map.getContainer(),W=host.clientWidth,H=host.clientHeight,dpr=window.devicePixelRatio||1;
  if(cv.width!==W*dpr||cv.height!==H*dpr){cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';}
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);if(!st)return;
  const o=st.J.o,P=q=>{const p=map.latLngToContainerPoint(toLL(q,o));return [p.x,p.y];};
  const a=P([0,0]),b=P([1,0]),ppm=Math.hypot(b[0]-a[0],b[1]-a[1]);
  /* svetofor chiroqlari — toʻxtash chizigʻida */
  if(st.sim.sig)st.J.E.forEach(e=>{if(!e.lanes.length)return;const l=st.sim.light('q'+e.ai),c=l==='G'?'#2b9a5a':l==='A'?'#e0a526':'#d23c2e';
    e.lanes.forEach(ln=>{const p=P(ln.P);g.fillStyle=c;g.fillRect(p[0]-ppm*1.6,p[1]-ppm*1.6,ppm*3.2,ppm*.6+1);});});
  st.sim.peds().forEach(p=>{const c=P([p.x,p.y]);g.fillStyle=p.walk?'#95620f':'#c9a35a';g.beginPath();g.arc(c[0],c[1],Math.max(1.8,ppm*.45),0,7);g.fill();});
  g.lineCap='butt';
  st.sim.snapshot().forEach(v=>{const f=P([v.x,v.y]),r=P([v.x-Math.cos(v.h)*v.len,v.y-Math.sin(v.h)*v.len]);  // oldingi uchidan orqaga
    g.strokeStyle=v.bus?'#2a5a9a':(MCOL[v.m]||'#1c2628');g.lineWidth=Math.max(2,ppm*(v.bus?2.5:1.9));g.beginPath();g.moveTo(r[0],r[1]);g.lineTo(f[0],f[1]);g.stroke();
    if(ppm>3){g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=Math.max(1,ppm*.5);g.beginPath();const t=[f[0]+(r[0]-f[0])*.2,f[1]+(r[1]-f[1])*.2];g.moveTo(f[0],f[1]);g.lineTo(t[0],t[1]);g.stroke();}});
}
})();
