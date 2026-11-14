/* =====================================================================
   Koʻchasoz · Loyiha albomi (14.11.2026)
   Tarmoq loyihasidan A3 varaqlar toʻplami: titul, umumiy maʼlumot, umumiy reja, har chorraha rejasi,
   koʻcha kesimlari, razmetka/belgilar vedomosti, bekat va oʻtish joylari (norma tekshiruvi), harakat modeli, YHQ tekshiruvi.
   Har varaq — SVG (mm), ramka va asosiy yozuv (shtamp) bilan. Chop etish → PDF; Chizmadonga ham yuboriladi.
   Global funksiyalar app.js dan: DS, origin, exportGeom, layOf, segXY, segLL, lineLen, nodeKind, isInter, JNET, checkYHQ, ckOrder, YHQ, signSVG, signDef, projName, DK, PRESETS, KN.
   ===================================================================== */
(function(){
const PW=420,PH=297,FR={x:20,y:5,w:395,h:287},STW=185,STH=40;
const SCALES=[100,200,250,500,1000,2000,2500,5000,10000,20000];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f1=v=>(+v).toFixed(1),f2=v=>(+v).toFixed(2);
const KSN=s=>String(s||'').replace(/\s+(shoh\s+)?(koʻchasi|ko'chasi|ko‘chasi|yoʻli|yo'li|yo‘li|prospekti|улица|проспект)$/i,'').trim();
const T=(x,y,s,o={})=>`<text x="${f2(x)}" y="${f2(y)}" font-size="${o.s||3}" font-family="Arial, Helvetica, sans-serif"${o.w?` font-weight="${o.w}"`:''}${o.a?` text-anchor="${o.a}"`:''} fill="${o.c||'#141414'}"${o.r!=null?` transform="rotate(${f1(o.r)} ${f2(x)} ${f2(y)})"`:''}>${esc(s)}</text>`;
const R=(x,y,w,h,o={})=>`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${o.f||'none'}" stroke="${o.s||'#141414'}" stroke-width="${o.sw??.35}"/>`;
const L=(x1,y1,x2,y2,o={})=>`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${o.s||'#141414'}" stroke-width="${o.sw??.25}"${o.d?` stroke-dasharray="${o.d}"`:''}/>`;

/* ---------- maʼlumot ---------- */
function junctions(){const ds=DS();return ds.nodes.filter(n=>isInter(nodeKind(n))).map(n=>{
  const segs=ds.segs.filter(s=>s.a===n.id||s.b===n.id),names=[...new Set(segs.map(s=>KSN(sgName(s))).filter(Boolean))];
  return {n,names,title:names.length>=2?names.join(' × '):(names[0]||'Chorraha')+' (tugun '+n.id+')',kind:nodeKind(n)};});}
const sgName=sg=>sg.name||('Koʻcha '+(DS().segs.indexOf(sg)+1));/* nomsiz koʻchalar bir-biriga qoʻshilib ketmasin */
function streets(){const ds=DS(),g={};ds.segs.forEach(sg=>{const k=sgName(sg)+'|'+(sg.st?'custom':sg.p);(g[k]=g[k]||[]).push(sg);});
  return Object.entries(g).map(([k,ss])=>{const sg=ss[0],lay=layOf(sg);return {name:sgName(sg),mod:sg.st?'Tahrirlangan kesim':(PRESETS[sg.p]?.n||sg.p),p:sg.p,len:ss.reduce((a,s)=>a+lineLen(segLL(s)),0),W:lay.W,lanes:lay.lanes,xw:ss.reduce((a,s)=>a+(s.xw||[]).length,0),stops:ss.reduce((a,s)=>a+(s.att||[]).filter(x=>['bus','bay','tramstop'].includes(x.t)).length,0),segs:ss,lay};});}
const MK={'1.1':'Yaxlit chiziq','1.3':'Qoʻsh yaxlit chiziq','1.5':'Uzuq chiziq','1.6':'Yaqinlashish chizigʻi','1.11':'Qoʻshma chiziq (bir tomoni uzuq)','1.12':'Toʻxtash chizigʻi','1.13':'Yoʻl berish chizigʻi',
  '1.14.1':'Piyodalar oʻtish joyi («zebra»)','1.16':'Yoʻnaltiruvchi orolcha (shtrix)','1.16.1':'Yoʻnaltiruvchi orolcha (shtrix)','1.17':'Bekat zigzagi','1.18':'Yoʻnalish strelkalari','1.23':'Avtobus boʻlagi «A»',
  taktil:'Taktil ogohlantiruvchi qoplama',pandus:'Pandus («konvert»)',bekat:'Avtobus bekati',svetofor:'Svetofor','orol platforma':'BRT/tramvay platformasi','Avtoturargoh joyi':'Avtoturargoh joyi'};
const MKSRC={'1.1':'GOST R 52289-2019, 6.2.3','1.11':'6.2.13','1.12':'6.2.14','1.14.1':'6.2.17','1.16':'6.2.19; GOST R 51256-2018','1.16.1':'6.2.19; GOST R 51256-2018','1.17':'6.2.20','1.18':'6.2.21','1.23':'6.2.26',taktil:'ShNQ 2.07.02-24, 12-ilova',pandus:'ShNQ 2.07.02-24, 17, 18, 42-b.'};

/* ---------- varaq ramkasi va shtamp ---------- */
function frame(no,total,title,scale,body){
  const sx=FR.x+FR.w-STW,sy=FR.y+FR.h-STH,d=new Date().toLocaleDateString('ru-RU');
  const stamp=R(sx,sy,STW,STH,{sw:.5,f:'#fff'})+L(sx,sy+8,sx+STW,sy+8)+L(sx,sy+18,sx+STW,sy+18)+L(sx,sy+28,sx+STW,sy+28)+L(sx+65,sy,sx+65,sy+STH)+L(sx+135,sy+18,sx+135,sy+STH)+L(sx+160,sy+18,sx+160,sy+STH)
    +T(sx+2,sy+5.5,'Archemistry Lab · Koʻchasoz',{s:2.6,w:700})+T(sx+67,sy+5.5,projName(),{s:3,w:700})
    +T(sx+2,sy+13.5,'Bosqich: Konsepsiya (P)',{s:2.4})+T(sx+67,sy+13.5,(DS().place||'Toshkent sh.'),{s:2.6})
    +T(sx+2,sy+23.5,'Ishlab chiqdi: ____________',{s:2.4})+T(sx+67,sy+23.5,title,{s:2.8,w:700})
    +T(sx+2,sy+33.5,'Tekshirdi: ______________',{s:2.4})+T(sx+67,sy+36.5,scale?('Masshtab '+scale):'',{s:2.4})
    +T(sx+137,sy+22,'Varaq',{s:2})+T(sx+147.5,sy+33,String(no),{s:5,w:700,a:'middle'})+T(sx+162,sy+22,'Varaqlar',{s:2})+T(sx+172.5,sy+33,String(total),{s:5,w:700,a:'middle'})
    +T(sx+2,sy+STH-1.5,d,{s:2,c:'#666'});
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}"><rect width="${PW}" height="${PH}" fill="#fff"/>${body}${R(FR.x,FR.y,FR.w,FR.h,{sw:.6})}${stamp}</svg>`;}
const WORK={x:FR.x+6,y:FR.y+12,w:FR.w-12,h:FR.h-12-STH-6};
const head=t=>T(FR.x+6,FR.y+8.5,t,{s:5,w:700});

/* ---------- reja (geometriya → mm) ---------- */
function fitScale(bw,bh,w,h){const need=Math.max(bw/w,bh/h)*1000;return SCALES.find(s=>s>=need)||Math.ceil(need/1000)*1000;}
/* chorraha varagʻi: markaz — chorraha va qoʻllar (kesish masofasi + 15 m) chegarasi oʻrtasi; masshtab — 1:500, sigʻmasa 1:1000 */
function jFit(j,G,area){const n=j.n,c0=toXY(n.ll,G.o);let x0=c0[0],y0=c0[1],x1=x0,y1=y0;
  try{DS().segs.filter(sg=>sg.a===n.id||sg.b===n.id).forEach(sg=>{let xy=segXY(sg,G.o);if(sg.b===n.id)xy=xy.slice().reverse();const lay=layOf(sg),D=(typeof nodeR==='function'?nodeR(n,sg):20)+15;
    let acc=0,pt=xy[xy.length-1];for(let k=1;k<xy.length;k++){const l=Math.hypot(xy[k][0]-xy[k-1][0],xy[k][1]-xy[k-1][1]);if(acc+l>=D){const t=(D-acc)/(l||1);pt=[xy[k-1][0]+(xy[k][0]-xy[k-1][0])*t,xy[k-1][1]+(xy[k][1]-xy[k-1][1])*t];break;}acc+=l;}
    const o=lay.outer||10;x0=Math.min(x0,pt[0]-o);x1=Math.max(x1,pt[0]+o);y0=Math.min(y0,pt[1]-o);y1=Math.max(y1,pt[1]+o);});}catch(e){}
  const c=[(x0+x1)/2,(y0+y1)/2],fit=N=>(x1-x0)<=area.w*N/1000&&(y1-y0)<=area.h*N/1000;return {c,N:fit(500)?500:1000};}
function planGroup(G,bb,rect,N,opt={}){const k=1000/N,cx=(bb[0]+bb[2])/2,cy=(bb[1]+bb[3])/2,ox=rect.x+rect.w/2,oy=rect.y+rect.h/2;
  const X=p=>[ox+(p[0]-cx)*k,oy-(p[1]-cy)*k],P=xy=>xy.map(p=>{const q=X(p);return f2(q[0])+','+f2(q[1]);}).join(' ');
  const vis=it=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const p of it.xy){if(p[0]<a)a=p[0];if(p[1]<b)b=p[1];if(p[0]>c)c=p[0];if(p[1]>d)d=p[1];}const hw=rect.w/2/k,hh=rect.h/2/k;return c>=cx-hw&&a<=cx+hw&&d>=cy-hh&&b<=cy+hh;};
  const id='c'+Math.random().toString(36).slice(2,8);let s=`<defs><clipPath id="${id}"><rect x="${f2(rect.x)}" y="${f2(rect.y)}" width="${f2(rect.w)}" height="${f2(rect.h)}"/></clipPath></defs><g clip-path="url(#${id})"><rect x="${f2(rect.x)}" y="${f2(rect.y)}" width="${f2(rect.w)}" height="${f2(rect.h)}" fill="#f1eee6"/>`;
  for(const it of G.items){if(!vis(it))continue;
    if(it.t==='poly')s+=`<polygon points="${P(it.xy)}" fill="${it.col}"${it.op!=null&&it.op<1?` fill-opacity="${it.op}"`:''}/>`;
    else if(it.t==='line'){const w=Math.max(.06,widthM2(it.opt.weight)*k);if(w<.05&&!opt.thin)continue;s+=`<polyline points="${P(it.xy)}" fill="none" stroke="${it.opt.color}" stroke-width="${f2(w)}"${it.opt.dashArray?` stroke-dasharray="${String(it.opt.dashArray).split(/[ ,]+/).map(v=>f2(+v*.3*k)).join(' ')}"`:''}/>`;}
    else if(it.t==='label'&&N<=1000){const q=X(it.xy[0]);s+=T(q[0],q[1]+.6*k,it.txt,{s:Math.max(1.2,1.6*k),w:700,c:'#fff',a:'middle',r:it.rot!=null?it.rot*180/Math.PI:null});}}
  for(const sn of G.signs){const q=X(toXY(sn.ll,G.o));if(q[0]<rect.x||q[0]>rect.x+rect.w||q[1]<rect.y||q[1]>rect.y+rect.h)continue;const z=Math.max(3,2.6*k);
    s+=signSVG(sn.c,sn.val).replace('<svg ',`<svg x="${f2(q[0]-z/2)}" y="${f2(q[1]-z/2)}" width="${f2(z)}" height="${f2(z)}" `).replace(/ style="[^"]*"/,'');}
  return {svg:s+'</g>'+R(rect.x,rect.y,rect.w,rect.h,{sw:.3}),X,k};}
const widthM2=w=>Math.max(.08,(w||1.5)*.075);
function scaleBar(x,y,N){const k=1000/N,m=[5,10,20,25,50,100,200,250,500,1000].find(v=>v*k>=25)||1000,w=m*k;
  return R(x,y,w/2,1.6,{f:'#141414',sw:.2})+R(x+w/2,y,w/2,1.6,{f:'#fff',sw:.2})+T(x,y-1.2,'0',{s:2.2})+T(x+w/2,y-1.2,String(m/2),{s:2.2,a:'middle'})+T(x+w,y-1.2,m+' m',{s:2.2,a:'middle'})+T(x,y+5.5,'Masshtab 1:'+N,{s:2.4});}
const north=(x,y)=>`<path d="M${x} ${y-6} L${x-3} ${y+4} L${x} ${y+2} L${x+3} ${y+4} Z" fill="#141414"/>`+T(x,y+9,'Sh',{s:3,w:700,a:'middle'});
function legend(x,y){const it=[[DK.lane.col,'Qatnov qismi'],[DK.bus.col,'Avtobus boʻlagi'],[DK.walk.col,'Trotuar, piyoda zonasi'],[DK.green.col,'Koʻkalamzor'],[DK.median.col,'Ajratuvchi polosa'],['#cfc2a4','Bekat maydonchasi'],['#e3b23c','Taktil qoplama']];
  let s=T(x,y,'Shartli belgilar',{s:2.8,w:700});it.forEach(([c,t],i)=>{s+=R(x,y+3+i*5.2,8,3.4,{f:c,sw:.15})+T(x+10,y+5.8+i*5.2,t,{s:2.4});});
  const yy=y+3+it.length*5.2;s+=L(x,yy+2,x+8,yy+2,{s:'#141414',sw:.35,d:'1.5 1.5'})+T(x+10,yy+3,'1.5 / 1.1 yoʻl chiziqlari (oq)',{s:2.4})+L(x,yy+7,x+8,yy+7,{s:'#f2c230',sw:.6})+T(x+10,yy+8,'1.17 bekat zigzagi',{s:2.4});return s;}
function table(x,y,cols,rows,o={}){const rh=o.rh||5.4,fs=o.fs||2.5;let s='',cx=x;const W=cols.reduce((a,c)=>a+c[1],0);
  s+=R(x,y,W,rh,{f:'#efece6',sw:.25});cols.forEach(([h,w,al])=>{s+=T(al==='r'?cx+w-1.2:cx+1.2,y+rh-1.6,h,{s:fs,w:700,a:al==='r'?'end':null});cx+=w;});
  rows.forEach((r,i)=>{const yy=y+rh*(i+1);cx=x;s+=R(x,yy,W,rh,{sw:.15,s:'#999'});r.forEach((v,j)=>{const [,w,al]=cols[j];s+=T(al==='r'?cx+w-1.2:cx+1.2,yy+rh-1.6,String(v).slice(0,Math.floor(w/(fs*.5))),{s:fs,a:al==='r'?'end':null,c:o.col&&o.col(i,j,v)||'#141414'});cx+=w;});});
  return {svg:s,h:rh*(rows.length+1),W};}

/* ---------- kesim ---------- */
function sectionDraw(lay,x,y,wMax,title,N0){const W=lay.W,N=N0||[50,100,200,250,500].find(n=>W*1000/n<=wMax)||500,k=1000/N,hh=14;let s=T(x,y-13,title,{s:3.2,w:700})+T(x,y-9,`Eni ${f2(W)} m · ${lay.lanes} boʻlak · 1:${N}`,{s:2.4,c:'#555'});let cx=x;
  lay.st.forEach(st=>{const w=st.w*k,c=(DK[st.k]||{}).col||'#ccc',road=DK[st.k]&&DK[st.k].road,yt=y+(road?4:2);
    s+=R(cx,yt,w,hh-(road?4:2)+4,{f:c,sw:.15,s:'#666'});
    if(road&&st.dir)s+=T(cx+w/2,yt+7,st.dir>0?'↑':'↓',{s:5,a:'middle',c:'#fff',w:700});
    if((st.k==='green'||st.k==='median')&&st.w>=1.4)s+=`<circle cx="${f2(cx+w/2)}" cy="${f2(y-.5)}" r="${f2(Math.min(5,st.w*k*.45))}" fill="#7da35c" fill-opacity=".8"/>`;
    s+=L(cx,y+hh+5,cx,y+hh+9,{sw:.15})+T(cx+w/2,y+hh+6.6,f2(st.w),{s:w<5?1.5:2,a:'middle'});
    if(w>9)s+=T(cx+w/2,y+hh+13,(DK[st.k]||{n:st.k}).n.split(/[ (—/]/)[0],{s:1.9,a:'middle',c:'#555'});cx+=st.w*k;});
  s+=L(cx,y+hh+5,cx,y+hh+9,{sw:.15})+L(x,y+hh+7.6,cx,y+hh+7.6,{sw:.2})+L(x,y+hh+18,cx,y+hh+18,{sw:.25})+T((x+cx)/2,y+hh+17,f2(W)+' m',{s:2.6,w:700,a:'middle'});
  return {svg:s,h:hh+24};}

/* ---------- varaqlar ---------- */
/* ---------- kesish joylari (foydalanuvchi ✂ yoki avtomatik) ---------- */
const DK2LIB={walk:'walk',shared:'shared',green:'trees',median:'median',buffer:'buffer',lane:'lane',turn:'turn',hatch:'hatch',park:'park',park30:'park30',park45:'park45',park90:'park90',
  bus:'bus',tram:'tram',bike:'bike1',rain:'rain',island:'island',furn:'furn'};
function nearestOn(xy,P){const c=cumLen(xy);let best={d:1e18,s:0};for(let i=1;i<xy.length;i++){const a=xy[i-1],b=xy[i],vx=b[0]-a[0],vy=b[1]-a[1],L2=vx*vx+vy*vy||1;let t=((P[0]-a[0])*vx+(P[1]-a[1])*vy)/L2;t=Math.max(0,Math.min(1,t));
  const q=[a[0]+vx*t,a[1]+vy*t],d=(q[0]-P[0])**2+(q[1]-P[1])**2;if(d<best.d)best={d,s:c[i-1]+Math.sqrt(L2)*t};}return {...best,T:c[c.length-1]};}
function cuts(){const ds=DS(),o=origin();let C=(ds.cuts||[]).filter(c=>ds.segs.some(s=>s.id===c.sg));
  if(!C.length){/* avtomatik: har koʻcha (nom) eng uzun boʻlagining oʻrtasi + har bekat */const by={};ds.segs.forEach(sg=>{const k=sg.name||sg.id,L=lineLen(segLL(sg));if(!by[k]||by[k].L<L)by[k]={sg,L};});
    C=Object.values(by).filter(x=>x.L>60).map(x=>({sg:x.sg.id,f:.5,auto:1}));
    ds.segs.forEach(sg=>(sg.att||[]).forEach(a=>{if(['bus','bay','tramstop'].includes(a.t))C.push({sg:sg.id,f:a.f,auto:1,stop:1});}));}
  return C.map((c,i)=>{const sg=ds.segs.find(s=>s.id===c.sg),xy=segXY(sg,o),cl=cumLen(xy),T0=cl[cl.length-1],P=pointAt(xy,cl,c.f*T0);
    const st=withVirtual(()=>{const vs=DS().segs.filter(v=>(v._real??v.id)===c.sg);let b=null;vs.forEach(v=>{const r=nearestOn(segXY(v,o),P);if(!b||r.d<b.d)b={d:r.d,v};});const v=b?b.v:sg;const L=layOf(v);return {st:L.st.map(x=>({k:x.k,w:x.w,dir:x.dir,d1:x.d1,d2:x.d2})),W:L.W,lanes:L.lanes};});
    const i1=Math.max(1,cl.findIndex(v=>v>=c.f*T0)),a=xy[i1-1],b=xy[i1],u=[b[0]-a[0],b[1]-a[1]],ul=Math.hypot(...u)||1;
    return {no:i+1,sg,P,u:[u[0]/ul,u[1]/ul],s:c.f*T0,...st,stop:!!c.stop,auto:!!c.auto};});}
function cutSection(c,x,y,maxW){/* Koʻchasoz kesim grafikasi (sectionSVG) — 1:200: 20 px/m, 4 px = 1 mm */
  const p=c.st.map(e=>({k:DK2LIB[e.k]||'walk',w:+e.w.toFixed(2)})).filter(e=>e.w>.05),tot=p.reduce((a,e)=>a+e.w,0);
  let N=200;while(tot*1000/N>maxW-12)N=N===200?250:N===250?500:1000;const sc=20,k=sc*N/1000,Wpx=tot*sc+48,svg=sectionSVG(p,sc,Wpx,{x0:24}),Hpx=(16+9.5*sc)+50;
  const inner=svg.replace(/^<svg[^>]*>/,`<svg x="${f2(x)}" y="${f2(y)}" width="${f2(Wpx/k)}" height="${f2(Hpx/k)}" viewBox="0 0 ${Wpx} ${Hpx}" font-family="Arial, Helvetica, sans-serif" style="color:#141414" overflow="visible">`);
  return {svg:inner,w:Wpx/k,h:Hpx/k,N};}
function pickCut(sgId){toast('✂ Koʻchaning kesim olinadigan joyini xaritada bosing (Esc — bekor).');
  const on=e=>{map.off('click',on);const ds=DS(),o=origin(),P=toXY([e.latlng.lat,e.latlng.lng],o);let b=null;
    ds.segs.forEach(sg=>{const r=nearestOn(segXY(sg,o),P);const pen=sg.id===sgId?0:25;if(!b||r.d+pen<b.d)b={...r,d:r.d+pen,sg};});
    if(!b||Math.sqrt(b.d)>60){toast('Koʻcha topilmadi.');return;}ds.cuts=ds.cuts||[];ds.cuts.push({sg:b.sg.id,f:+(b.s/b.T).toFixed(4)});afterDesign();drawCutMarks();
    toast(`${ds.cuts.length}-kesim qoʻshildi — albomda «Koʻndalang kesimlar» varagʻida chiqadi.`,()=>{ds.cuts.pop();afterDesign();drawCutMarks();},'Bekor qilish');};
  setTimeout(()=>map.on('click',on),50);document.addEventListener('keydown',function k(ev){if(ev.key==='Escape'){map.off('click',on);document.removeEventListener('keydown',k);}});}
let cutL=null;function drawCutMarks(){try{if(!cutL)cutL=L.layerGroup().addTo(map);cutL.clearLayers();const ds=DS();if(!(ds.cuts||[]).length)return;const o=origin();
  cuts().forEach(c=>{const n=[-c.u[1],c.u[0]],h=c.W/2+3,A=[c.P[0]+n[0]*h,c.P[1]+n[1]*h],B=[c.P[0]-n[0]*h,c.P[1]-n[1]*h];
    L.polyline([toLL(A,o),toLL(B,o)],{color:'#b2342a',weight:2,dashArray:'10 4 2 4'}).addTo(cutL);
    [A,B].forEach(q=>L.marker(toLL(q,o),{icon:L.divIcon({className:'',html:`<div style="font:700 12px Archivo,sans-serif;color:#b2342a;background:#fff;border:1.5px solid #b2342a;border-radius:10px;padding:0 5px;transform:translate(-50%,-50%);white-space:nowrap">${c.no}</div>`}),interactive:true})
      .on('contextmenu',()=>{ds.cuts.splice(c.no-1,1);afterDesign();drawCutMarks();toast('Kesim oʻchirildi.');}).addTo(cutL));});}catch(e){}}
if(typeof renderDesign==='function'){const _rd=renderDesign;window.renderDesign=function(){const r=_rd.apply(this,arguments);drawCutMarks();return r;};}

/* ---------- razmetka hajmi (uzunlik, m; maydon, m²) ---------- */
const MW={'1.12':.4,'1.13':.4,'1.3':.1,'1.17':.1,'1.11':.1};
function markQty(G){const Q={};const add=(k,l,a)=>{Q[k]=Q[k]||{l:0,a:0,n:0};Q[k].l+=l;Q[k].a+=a;Q[k].n++;};
  const len=xy=>{let s=0;for(let i=1;i<xy.length;i++)s+=Math.hypot(xy[i][0]-xy[i-1][0],xy[i][1]-xy[i-1][1]);return s;};
  const area=xy=>{let s=0;for(let i=0;i<xy.length;i++){const a=xy[i],b=xy[(i+1)%xy.length];s+=a[0]*b[1]-b[0]*a[1];}return Math.abs(s)/2;};
  G.items.forEach(it=>{if(it.t==='line'&&it.code){const l=len(it.xy),ds=it.opt.dashArray?String(it.opt.dashArray).split(/[ ,]+/).map(Number):null,r=ds?ds[0]/(ds[0]+ds[1]):1;add(it.code,l,l*r*(MW[it.code]||.1));}
    else if(it.t==='poly'&&it.code)add(it.code,0,area(it.xy));});
  /* chiziq kodisiz oq poligonlar: strelkalar (1.18), shtrix (1.16) — rang boʻyicha */
  G.items.forEach(it=>{if(it.t==='poly'&&!it.code&&(it.col==='#f4f4f0'))add('1.18',0,area(it.xy));if(it.t==='poly'&&!it.code&&it.col==='#fff'&&it.z>=3.1&&it.z<3.2)add('1.16',0,area(it.xy));
    if(it.t==='poly'&&it.col==='#e3b23c')add('taktil',0,area(it.xy));});
  return Q;}

/* ---------- harakat sxemalari ---------- */
const DN=e=>['sharqdan','shimoli-sharqdan','shimoldan','shimoli-gʻarbdan','gʻarbdan','janubi-gʻarbdan','janubdan','janubi-sharqdan'][((Math.round(Math.atan2(e.out[1],e.out[0])/(Math.PI/4))%8)+8)%8];
const TURN=(e,E,m)=>{/* harakat yoʻnalishiga koʻra chiqish qoʻli: kirish -out, L — chapga */const inc=[-e.out[0],-e.out[1]];let best=null;
  E.forEach(x=>{if(x===e||!x.exits||!x.exits.length)return;const cr=inc[0]*x.out[1]-inc[1]*x.out[0],dt=inc[0]*x.out[0]+inc[1]*x.out[1],ang=Math.atan2(cr,dt);
    const want=m==='L'?Math.PI/2:m==='R'?-Math.PI/2:m==='U'?Math.PI:0,sc=Math.abs(Math.atan2(Math.sin(ang-want),Math.cos(ang-want)));if(!best||sc<best.sc)best={sc,x};});return best?best.x:null;};
function turnDiagram(J,arms,cx,cy,R0){/* sxematik: markaz, har qoʻl yoʻnalishi, egri strelkalar eni ~ hajm */
  const E=J.E.filter(e=>e.lanes.length||e.exits.length),k=v=>Math.max(.5,Math.min(7,v/180));let s=`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(R0*.18)}" fill="#efece6" stroke="#999" stroke-width=".2"/>`;
  E.forEach(e=>{const d=[e.out[0],-e.out[1]];s+=L(cx+d[0]*R0*.18,cy+d[1]*R0*.18,cx+d[0]*R0,cy+d[1]*R0,{s:'#bbb',sw:5})+T(cx+d[0]*(R0+7),cy+d[1]*(R0+7)+1,KSN(e.name)||'',{s:2.4,w:700,a:'middle'});});
  E.forEach(e=>{const a=arms[`n${J.id}a${e.ai}`];if(!a||!a.mv)return;const d=[e.out[0],-e.out[1]],rt=[-d[1],d[0]],off=2.6;/* kirish oʻng tomonda (oʻng tomonlama harakat) */
    const p0=[cx+d[0]*R0*.85-rt[0]*off,cy+d[1]*R0*.85-rt[1]*off];let tot=0;
    Object.entries(a.mv).forEach(([m,v])=>{if(!v)return;tot+=v;const x=TURN(e,E,m);if(!x)return;const dx=[x.out[0],-x.out[1]],rx=[-dx[1],dx[0]],p2=[cx+dx[0]*R0*.85+rx[0]*off,cy+dx[1]*R0*.85+rx[1]*off];
      const col=m==='L'?'#b2342a':m==='R'?'#2b7449':m==='U'?'#7a5aa0':'#2a6fb0';
      s+=`<path d="M${f2(p0[0])} ${f2(p0[1])} Q${f2(cx)} ${f2(cy)} ${f2(p2[0])} ${f2(p2[1])}" fill="none" stroke="${col}" stroke-opacity=".55" stroke-width="${f2(k(v))}"/>`;});
    const lb=[cx+d[0]*R0*.62-rt[0]*9,cy+d[1]*R0*.62-rt[1]*9];
    s+=`<rect x="${f2(lb[0]-12)}" y="${f2(lb[1]-6.5)}" width="24" height="${(Object.keys(a.mv).length+1)*3.2+2}" fill="#fff" fill-opacity=".9" stroke="#999" stroke-width=".15"/>`;
    s+=T(lb[0],lb[1]-3.6,`${tot} avt/s`,{s:2.2,w:700,a:'middle'});Object.entries(a.mv).forEach(([m,v],i)=>{s+=T(lb[0],lb[1]-.4+i*3.2,`${{L:'↰ chap',S:'↑ toʻgʻri',R:'↱ oʻng',U:'↶ qayr.'}[m]||m} ${v}`,{s:2,a:'middle',c:m==='L'?'#b2342a':m==='R'?'#2b7449':'#2a6fb0'});});});
  return s;}
function phaseBox(J,ph,x,y,w,i,C){const cx=x+w/2,cy=y+w/2,R0=w*.42,E=J.E.filter(e=>e.lanes.length||e.exits.length);let s=R(x,y,w,w,{sw:.25})+T(x+1.5,y+4,`${i+1}-faza · ${ph.g} s`,{s:2.4,w:700});
  E.forEach(e=>{const d=[e.out[0],-e.out[1]];s+=L(cx+d[0]*R0*.2,cy+d[1]*R0*.2,cx+d[0]*R0,cy+d[1]*R0,{s:'#ccc',sw:3.4});});
  (ph.arms||[]).forEach(id=>{const e=E.find(e=>`n${J.id}a${e.ai}`===id);if(!e)return;const d=[e.out[0],-e.out[1]],rt=[-d[1],d[0]],p0=[cx+d[0]*R0-rt[0]*1.3,cy+d[1]*R0-rt[1]*1.3];
    const codes=new Set(e.lanes.flatMap(l=>String(l.code||'S').split('')));const mv=ph.left?['L','U'].filter(m=>codes.has(m)):[...codes].filter(m=>'LSR'.includes(m));
    mv.forEach(m=>{const t=TURN(e,E,m);if(!t)return;const dx=[t.out[0],-t.out[1]],rx=[-dx[1],dx[0]],p2=[cx+dx[0]*R0*.75+rx[0]*1.3,cy+dx[1]*R0*.75+rx[1]*1.3];
      s+=`<path d="M${f2(p0[0])} ${f2(p0[1])} Q${f2(cx)} ${f2(cy)} ${f2(p2[0])} ${f2(p2[1])}" fill="none" stroke="${m==='L'?'#b2342a':m==='R'?'#2b7449':'#141414'}" stroke-width=".7" marker-end="url(#ar)"/>`;});});
  return s;}
const ARDEF=`<defs><marker id="ak" viewBox="0 0 10 10" refX="6" refY="5" markerUnits="userSpaceOnUse" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
function cyclogram(sig,J,x,y,w){const C=sig.C,n=sig.ph.length,G=sig.ph.reduce((a,p)=>a+p.g,0),I=Math.max(3,(C-G)/Math.max(1,n)),Y=3,kx=w/C;let s=T(x,y-3,`Siklogramma: sikl ${C} s · oraliq vaqt ${I.toFixed(0)} s (sariq ${Y} s + qizil) · siljish ${sig.off||0} s`,{s:2.5,w:700});
  let t=0;const rows=sig.ph.map((p,i)=>{const r={i,g0:t,g1:t+p.g};t+=p.g+I;return r;});
  rows.forEach((r,i)=>{const yy=y+i*6,lab=`${i+1}-faza`+(sig.ph[i].left?' (chap)':'');s+=T(x-1,yy+3.6,lab,{s:2.2,a:'end'});
    s+=R(x,yy,w,4.4,{f:'#d9534f',sw:.1,s:'#999'})+R(x+r.g0*kx,yy,(r.g1-r.g0)*kx,4.4,{f:'#3f9a5c',sw:.1})+R(x+r.g1*kx,yy,Y*kx,4.4,{f:'#f0c040',sw:.1});});
  const yb=y+rows.length*6+1;for(let tt=0;tt<=C;tt+=10){s+=L(x+tt*kx,yb,x+tt*kx,yb+1.5,{sw:.15})+T(x+tt*kx,yb+4.2,String(tt),{s:1.8,a:'middle'});}
  s+=T(x+w,yb+8,'t, s',{s:2,a:'end',c:'#555'});return s;}

/* ===================== Albom 3: qoʻshimcha varaqlar (14.11.2026) ===================== */
const SSTOP={30:45,40:55,50:75,60:85,80:150}; /* ShNQ 2.07.06-24, 13-ilova, 1-jadval: toʻxtash uchun eng kichik koʻrish masofasi */
const vOf=lay=>lay.lanes>=6?60:lay.lanes>=4?50:40;   /* ANDOZA: hisobiy tezlik boʻlaklar soniga koʻra */
const roadW=lay=>lay.st.filter(x=>DK[x.k]&&DK[x.k].road&&!/^park/.test(x.k)).reduce((a,x)=>a+x.w,0);
const inTri=(p,a,b,c)=>{const d=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]);const d1=d(p,a,b),d2=d(p,b,c),d3=d(p,c,a);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));};
function armInfo(j){const o=origin(),c=toXY(j.n.ll,o);return DS().segs.filter(s=>s.a===j.n.id||s.b===j.n.id).map(sg=>{const xy=segXY(sg,o),q=sg.a===j.n.id?xy[1]:xy[xy.length-2],v=[q[0]-c[0],q[1]-c[1]],l=Math.hypot(...v)||1,lay=layOf(sg);
  return {sg,u:[v[0]/l,v[1]/l],ang:Math.atan2(v[1],v[0]),lay,h:roadW(lay)/2,v:vOf(lay)};}).sort((a,b)=>a.ang-b.ang);}
function sightTris(j){const o=origin(),c=toXY(j.n.ll,o),A=armInfo(j),T=[];
  for(let i=0;i<A.length;i++){const a=A[i],b=A[(i+1)%A.length];let th=b.ang-a.ang;if(th<=0)th+=2*Math.PI;if(th>Math.PI*.95)continue;
    /* toʻqnashuv nuqtasi: ikki koʻchaning yaqin boʻlak oʻqlari kesishmasi */
    const na=[-a.u[1],a.u[0]],nb=[b.u[1],-b.u[0]],ha=a.h*.5,hb=b.h*.5,Pa=[c[0]+na[0]*ha,c[1]+na[1]*ha],Pb=[c[0]+nb[0]*hb,c[1]+nb[1]*hb];
    const det=a.u[0]*(-b.u[1])-a.u[1]*(-b.u[0]);if(Math.abs(det)<1e-6)continue;const dx=Pb[0]-Pa[0],dy=Pb[1]-Pa[1],t=(dx*(-b.u[1])-dy*(-b.u[0]))/det,X=[Pa[0]+a.u[0]*t,Pa[1]+a.u[1]*t];
    const Sa=SSTOP[a.v]||75,Sb=SSTOP[b.v]||75,P1=[X[0]+a.u[0]*Sa,X[1]+a.u[1]*Sa],P2=[X[0]+b.u[0]*Sb,X[1]+b.u[1]*Sb];T.push({a,b,X,P1,P2,Sa,Sb});}
  return T;}
function pedCross(j,JN){/* svetoforli chorraha: har qoʻl boʻylab oʻtish uzunligi va talab qilinadigan yashil */
  return JN.E.filter(e=>e.lanes.length||e.exits.length).map(e=>{const L=[...e.lanes,...e.exits].reduce((a,l)=>a+((l.x&&l.x.w)||3.5),0);
    return {e,L,G:Math.ceil(5+L/1.0)};});}  /* ANDOZA: 5 s boshlangʻich + L / 1,0 m/s (keksa va nogironligi boʻlgan piyoda) */
async function tileMosaic(bbLL,z,src){/* Esri koʻcha xaritasi plitkalari → dataURL (internet boʻlsa) */
  const x0=Math.floor(gxf(bbLL.w,z)/TS),x1=Math.floor(gxf(bbLL.e,z)/TS),y0=Math.floor(gyf(bbLL.n,z)/TS),y1=Math.floor(gyf(bbLL.s,z)/TS);if((x1-x0+1)*(y1-y0+1)>64)return null;
  const cv=document.createElement('canvas');cv.width=(x1-x0+1)*TS;cv.height=(y1-y0+1)*TS;const cx=cv.getContext('2d');let ok=0;const jobs=[];
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)jobs.push(loadTile(`${ESRI}${src||'World_Street_Map'}/MapServer/tile/${z}/${y}/${x}`).then(im=>{if(im){cx.drawImage(im,(x-x0)*TS,(y-y0)*TS);ok++;}}));
  await Promise.race([Promise.all(jobs),new Promise(r=>setTimeout(r,15000))]);if(!ok)return null;
  try{return {url:cv.toDataURL('image/jpeg',.82),px0:x0*TS,py0:y0*TS,z,W:cv.width,H:cv.height};}catch(e){return null;}}
let SIT=null;
async function prepAlbum(){SIT=null;try{const G=exportGeom();if(!G)return;const sw=toLL([G.bb[0],G.bb[1]],G.o),ne=toLL([G.bb[2],G.bb[3]],G.o),cLat=(sw[0]+ne[0])/2,cLon=(sw[1]+ne[1])/2,dLat=2500/111320,dLon=2500/(111320*Math.cos(cLat*Math.PI/180));
  SIT=await tileMosaic({s:cLat-dLat,n:cLat+dLat,w:cLon-dLon*1.4,e:cLon+dLon*1.4},14);if(SIT)SIT.c=[cLat,cLon];}catch(e){SIT=null;}}
function sitSheet(G,J){let s=head('Vaziyat sxemasi');const area={x:WORK.x,y:WORK.y,w:WORK.w-70,h:WORK.h};
  const sw=toLL([G.bb[0],G.bb[1]],G.o),ne=toLL([G.bb[2],G.bb[3]],G.o);
  if(SIT){const z=SIT.z,X=ll=>[gxf(ll[1],z)-SIT.px0,gyf(ll[0],z)-SIT.py0],c=X(SIT.c),mpp0=156543.03392*Math.cos(SIT.c[0]*Math.PI/180)/2**z,k0=Math.max(area.w/SIT.W,area.h/SIT.H)*1.05,N0=mpp0/k0*1000,NS=[5000,10000,15000,20000,25000,50000,100000],NN=NS.filter(v=>v<=N0).pop()||NS[0],k=mpp0*1000/NN,ox=area.x+area.w/2-c[0]*k,oy=area.y+area.h/2-c[1]*k,P=ll=>{const q=X(ll);return [ox+q[0]*k,oy+q[1]*k];};
    const id='sitc';s+=`<defs><clipPath id="${id}"><rect x="${f2(area.x)}" y="${f2(area.y)}" width="${f2(area.w)}" height="${f2(area.h)}"/></clipPath></defs><g clip-path="url(#${id})"><image href="${SIT.url}" x="${f2(ox)}" y="${f2(oy)}" width="${f2(SIT.W*k)}" height="${f2(SIT.H*k)}" opacity=".9"/>`;
    const a=P([ne[0],sw[1]]),b=P([sw[0],ne[1]]);s+=R(a[0],a[1],b[0]-a[0],b[1]-a[1],{s:'#b2342a',sw:1.2})+'</g>'+R(area.x,area.y,area.w,area.h,{sw:.3});
    s+=T(area.x+2,area.y+area.h+4,`Masshtab 1:${NN} (varaq markazida; Web Mercator) · asos: Esri World Street Map`,{s:2.3,c:'#555'});}
  else s+=R(area.x,area.y,area.w,area.h,{sw:.3,f:'#f1eee6'})+T(area.x+area.w/2,area.y+area.h/2,'Shahar xaritasi faqat internetga ulangan brauzerda yuklanadi',{s:3.2,a:'middle',c:'#777'});
  const lx=WORK.x+WORK.w-62;s+=north(lx+50,WORK.y+12)+T(lx,WORK.y+30,'Loyiha hududi',{s:2.8,w:700})+R(lx,WORK.y+33,8,5,{s:'#b2342a',sw:1.2})+T(lx+10,WORK.y+37,'Loyiha chegarasi',{s:2.4});
  s+=T(lx,WORK.y+50,`Markaz: ${((sw[0]+ne[0])/2).toFixed(5)}° N`,{s:2.3})+T(lx,WORK.y+55,`${((sw[1]+ne[1])/2).toFixed(5)}° E`,{s:2.3});
  s+=T(lx,WORK.y+66,'Koʻchalar:',{s:2.6,w:700});[...new Set(DS().segs.map(x=>x.name).filter(Boolean))].forEach((n,i)=>{s+=T(lx,WORK.y+72+i*4.6,'— '+n,{s:2.3});});
  return s;}
function sightSheet(G,J){let s=head('Chorrahalarda koʻrinish uchburchaklari');const cw=(WORK.w-70)/2,ch=WORK.h/2,N=1500,rows=[];
  const trees=(G.sh||[]).filter(x=>x.t==='tree').map(x=>toXY(x.ll,G.o));
  J.slice(0,4).forEach((j,i)=>{const r={x:WORK.x+(i%2)*cw,y:WORK.y+Math.floor(i/2)*ch,w:cw-2,h:ch-2},c=toXY(j.n.ll,G.o),hw=r.w/2*N/1000,hh=r.h/2*N/1000;
    const pg=planGroup(G,[c[0]-hw,c[1]-hh,c[0]+hw,c[1]+hh],r,N);s+=pg.svg;const TT=sightTris(j);let bad=0;
    TT.forEach(t=>{const P=[t.X,t.P1,t.P2].map(pg.X);s+=`<polygon points="${P.map(q=>f2(q[0])+','+f2(q[1])).join(' ')}" fill="#e3a21a" fill-opacity=".18" stroke="#c88a1a" stroke-width=".4" stroke-dasharray="1.5 .8"/>`;
      const inside=trees.filter(p=>inTri(p,t.X,t.P1,t.P2)).length;bad+=inside;rows.push([`${i+1}. ${j.title}`,`${KSN(t.a.sg.name)} × ${KSN(t.b.sg.name)}`,`${t.a.v} / ${t.b.v}`,`${t.Sa} / ${t.Sb}`,inside,inside?'tekshirish':'ochiq']);});
    s+=T(r.x+2,r.y+5,`${i+1}. ${j.title}`,{s:2.8,w:700});});
  const lx=WORK.x+WORK.w-66;const t=table(lx-2,WORK.y+4,[['Juftlik',30],['v, km/s',14,'r'],['S, m',16,'r'],['Daraxt',10,'r']],rows.map(r=>[r[1].slice(0,22),r[2],r[3],r[4]]),{rh:4.4,fs:2,col:(i,j2,v)=>j2===3&&v>0?'#b2342a':null});s+=t.svg;
  let y=WORK.y+t.h+10;['Uchburchak tomonlari — toʻxtash uchun eng kichik koʻrish masofasi','(ShNQ 2.07.06-24, 118-band; 13-ilova 1-jadval: 40 km/s — 55 m,','50 — 75 m, 60 — 85 m). Uni uchburchak tomoniga qoʻllash — TALQIN.','Hisobiy tezlik — boʻlaklar soniga koʻra (ANDOZA).','Uchburchak ichida 0,5 m dan baland toʻsiq boʻlmasin (ANDOZA):','daraxt tanasi va shox ostidagi boʻshliq tekshirilsin.','Piyoda oʻtish joylarida — ShNQ 2.07.01-23, 328-band','(O‘z DSt 3644:2023).','Masshtab 1:'+N].forEach(l=>{s+=T(lx,y,l,{s:2.1,c:'#333'});y+=4;});
  return s;}
function pedTable(j,JN,sig){if(!sig)return {svg:'',h:0};const P=pedCross(j,JN),rows=P.map(p=>{const id=`n${j.n.id}a${p.e.ai}`;let G0=0;sig.ph.forEach(ph=>{if(!(ph.arms||[]).includes(id))G0+=ph.g;});
    /* oʻz qoʻli harakatlanmaydigan fazalar yigʻindisi — piyoda uchun mumkin boʻlgan yashil (burilib kiruvchilar bilan konflikt hisobga olinmagan) */
    return [`${KSN(p.e.name)||'—'} (${DN(p.e)})`,f1(p.L),p.G,G0,G0>=p.G?'yetadi':'yetmaydi'];});
  return table(0,0,[['Oʻtish joyi (qoʻl)',60],['L, m',14,'r'],['Kerak, s',16,'r'],['Mumkin, s',18,'r'],['Natija',20]],rows,{rh:4.6,fs:2.2,col:(i,c,v)=>c===4&&v==='yetmaydi'?'#b2342a':c===4?'#2b7449':null});}
function veloSheet(G,ST){const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-150,h:WORK.h},N=fitScale(bw,bh,area.w,area.h);
  const G2={...G,items:G.items.filter(it=>it.t==='poly'&&it.cat).map(it=>({...it,col:it.cat==='bike'?'#2f8f58':it.cat==='car'||it.cat==='pt'?'#d6d3cc':it.col===DK.lane.col?'#d6d3cc':'#efece6'})),signs:[]};
  const pg=planGroup(G2,G.bb,area,N);let s=head('Velosiped infratuzilmasi va avtoturargoh balansi')+pg.svg;
  /* velo yoʻlakli koʻchalar — 1:10000 da 2 m yoʻlak koʻrinmaydi, shuning uchun oʻq boʻylab qalin yashil chiziq */
  ST.forEach(st=>{if(!st.lay.st.some(x=>x.k==='bike'))return;st.segs.forEach(sg=>{const P=segXY(sg,G.o).map(pg.X);s+=`<polyline points="${P.map(q=>f2(q[0])+','+f2(q[1])).join(' ')}" fill="none" stroke="#2f8f58" stroke-width="1.4" stroke-linecap="round" stroke-opacity=".85"/>`;});});
  const rows=ST.map(st=>{const b=st.lay.st.filter(x=>x.k==='bike'),p=st.lay.st.filter(x=>/^park/.test(x.k));return [st.name,b.length?b.map(x=>x.w+' m').join(' + '):'—',b.length?f1(st.len):'—',b.length?f1(st.len*b.length):'0',p.length?p.length+' qator':'—'];});
  const lx=WORK.x+WORK.w-145;let t=table(lx,WORK.y+4,[['Koʻcha',44],['Velo yoʻlak',22],['Koʻcha, m',20,'r'],['Velo jami, m',22,'r'],['Avtoturargoh',30]],rows,{rh:5});s+=t.svg;let y=WORK.y+t.h+10;
  s+=L(lx,y,lx+8,y,{s:'#2f8f58',sw:1.4})+T(lx+10,y+1,'Velo yoʻlakli koʻcha (velo jami — ikki tomon yigʻindisi)',{s:2.2});y+=7;
  const ex=DS().exist,pn=(G.marks||{})['Avtoturargoh joyi']||0;let pe=null;if(ex&&ex.marks)pe=ex.marks['Avtoturargoh joyi']||0;
  t=table(lx,y,[['Avtoturargoh joylari',70],['Mavjud',24,'r'],['Loyiha',24,'r'],['Farq',20,'r']],[['Koʻcha boʻyida (chizmadan)',pe==null?'—':pe,pn,pe==null?'—':(pn-pe>0?'+':'')+(pn-pe)]],{rh:5});s+=t.svg;y+=t.h+8;
  ['Velo yoʻlaklar uzluksizligi: chorrahalarda velo oʻtish joyi (1.15) va velosipedchilar','uchun yondashuv (toʻxtash chizigʻi oldidagi «velo-cho‘ntak») keyingi bosqichda.','Velosipedchilar svetoforda parallel avtomobil fazasi bilan oʻtadi; chapga burilish —','ikki bosqichda (piyoda oʻtish joyi orqali), ANDOZA.','Mavjud avtoturargoh soni — «Mavjud holat» saqlangan boʻlsa.'].forEach(l=>{s+=T(lx,y,l,{s:2.1,c:'#333'});y+=4;});
  s+=north(lx+130,WORK.y+WORK.h-30)+scaleBar(lx,WORK.y+WORK.h-12,N);return s;}
function utilSheet(G,J,ST){/* yoritish, svetofor ustunlari, belgi tayanchlari, drenaj */
  const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-150,h:WORK.h},N=fitScale(bw,bh,area.w,area.h);
  const G2={...G,items:G.items.filter(it=>it.t==='poly'&&it.cat).map(it=>({...it,col:it.cat==='car'||it.cat==='pt'?'#d6d3cc':'#efece6'})),signs:[]};
  const pg=planGroup(G2,G.bb,area,N);let s=head('Yoritish, svetofor ustunlari, belgi tayanchlari va yomgʻir suvi qabul qilgichlari')+pg.svg;const o=G.o,ds=DS();let nLamp=0,nIn=0,lampKm=0;
  ds.segs.forEach(sg=>{const lay=layOf(sg),xy=segXY(sg,o),c=cumLen(xy),T0=c[c.length-1],Wc=roadW(lay),rd=lay.st.filter(x=>DK[x.k]&&DK[x.k].road),dL=Math.max(...rd.map(x=>x.d1)),dR=Math.min(...rd.map(x=>x.d2)),S=30;
    const med=lay.st.filter(x=>x.k==='median'&&x.w>=2).sort((a,b)=>b.w-a.w)[0];
    const rows=Wc<=12?[[dL+.8,0]]:Wc<=18?[[(dL+dR)/2,0]]:med&&Wc>24?[[dL+.8,0],[dR-.8,S/2],[med.mid,0]]:[[dL+.8,0],[dR-.8,S/2]];
    rows.forEach(([d,sh])=>{for(let t=15+sh;t<T0-10;t+=S){const f=frameAt(xy,c,t),q=pg.X([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d]);s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r=".55" fill="#e3b23c" stroke="#7a5a10" stroke-width=".15"/>`;nLamp++;}});
    lampKm+=T0;[dL,dR].forEach(d=>{for(let t=25;t<T0-10;t+=50){const f=frameAt(xy,c,t),q=pg.X([f.p[0]+f.n[0]*d,f.p[1]+f.n[1]*d]);s+=R(q[0]-.45,q[1]-.45,.9,.9,{f:'#2a6fb0',s:'none',sw:0});nIn++;}});});
  let nT1=0,nT7=0,nG=0;J.forEach(j=>{if(j.kind!=='sig')return;const JN=JNET.get(j.n.id);if(!JN)return;const E=JN.E.filter(e=>e.lanes.length);nT1+=E.length*2;nG+=E.filter(e=>e.lanes.length>=3).length;nT7+=JN.E.filter(e=>e.lanes.length||e.exits.length).length*2;
    const q=pg.X(toXY(j.n.ll,o));s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="2.4" fill="none" stroke="#b2342a" stroke-width=".6"/>`;});
  ds.segs.forEach(sg=>(sg.xw||[]).forEach(x=>{if(x.type==='signal'){nT1+=2;nT7+=2;}}));
  const sp=[];(ds.signs||[]).forEach(sn=>{const p=toXY(sn.ll,o);const g=sp.find(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<3);if(g)g[2]++;else sp.push([p[0],p[1],1]);});
  sp.forEach(p=>{const q=pg.X(p);s+=`<path d="M${f2(q[0])} ${f2(q[1]-.8)} L${f2(q[0]+.7)} ${f2(q[1]+.5)} L${f2(q[0]-.7)} ${f2(q[1]+.5)} Z" fill="#141414"/>`;});
  const lx=WORK.x+WORK.w-145;const rows=[['Yoritgich tayanchlari (10 m, ANDOZA qadam 30 m)','dona',nLamp],['Svetofor T.1 (asosiy + takroriy), har kirishda 2 ta','dona',nT1],['Shu jumladan G-simon konsolli tayanch (≥ 3 boʻlak)','dona',nG],['Piyoda svetofori T.7 (har oʻtish joyi uchiga)','dona',nT7],['Yoʻl belgisi tayanchlari (3 m ichidagi belgilar bitta)','dona',sp.length],['Yoʻl belgilari (tayanchlarda)','dona',(ds.signs||[]).length],['Yomgʻir suvi qabul qilgichlari (har 50 m, ANDOZA)','dona',nIn],['Ovozli signal moslamasi (ShNQ 2.07.02-24, 27-band)','dona',nT7]];
  const t=table(lx,WORK.y+4,[['Element',100],['Birlik',14],['Soni',16,'r']],rows,{rh:5});s+=t.svg;let y=WORK.y+t.h+10;
  [['#e3b23c','●','Yoritgich tayanchi'],['#2a6fb0','■','Yomgʻir suvi qabul qilgichi'],['#141414','▲','Yoʻl belgisi tayanchi'],['#b2342a','○','Svetoforli chorraha']].forEach(([c,g,t2])=>{s+=T(lx,y,g,{s:3,c})+T(lx+6,y,t2,{s:2.3});y+=5;});y+=3;
  ['Yoritish sxemasi qatnov qismi eniga koʻra: ≤ 12 m — bir tomonlama, 12–18 m — oʻq boʻylab,','24–36 m — ikki qator shaxmat (ShNQ 2.04.18-22, 22-band). Tayanch qatnov qismi chetidan','≥ 0,8 m (50 km/s; 25-band, 2-ilova). Bir sathli piyoda oʻtish joyi yoritilganligi qatnov qismidan','≥ 1,5 baravar (29-band). Qadam va quvvat yoritish hisobi bilan aniqlansin.','Drenaj: yopiq tarmoq boʻylama qiyaligi ≥ 4 ‰ (ShNQ 2.07.06-24, 114-band);','qabul qilgichlar oraligʻi va joyi boʻylama profil asosida aniqlansin (ANDOZA 50 m).'].forEach(l=>{s+=T(lx,y,l,{s:2.1,c:'#333'});y+=4;});
  s+=north(lx+130,WORK.y+WORK.h-30)+scaleBar(lx,WORK.y+WORK.h-12,N);return s;}
function tmStage(st,x,y,w,stage){/* qurilish davrida harakatni vaqtinchalik tashkil etish — sxematik (masshtabsiz) */
  const lay=st.lay,road=lay.st.filter(e=>DK[e.k]&&DK[e.k].road),half=road.filter(e=>(e.dir||0)===(stage===1?1:-1)),Lm=230,kx=w/Lm,ky=Math.min(1.6,(WORK.h-150)/2/lay.W),H=lay.W*ky;let s='',yy=y;
  const YE=new Map();lay.st.forEach((e,i)=>{const h=e.w*ky,col=(DK[e.k]||{}).col||'#ccc';s+=R(x,yy,w,h,{f:col,sw:0,s:'none'});YE.set(e,[yy,yy+h]);
    /* boʻlak chiziqlari: bir yoʻnalish orasida uzuq, qarama-qarshi orasida yaxlit */
    const nx=lay.st[i+1];if(nx&&DK[e.k]&&DK[e.k].road&&DK[nx.k]&&DK[nx.k].road)s+=L(x,yy+h,x+w,yy+h,{s:'#fff',sw:.3,d:(e.dir||0)===(nx.dir||0)?'3 3':null});yy+=h;});
  /* ish zonasi: tashqi 1–2 boʻlak (shu yoʻnalish) */
  const close=half.filter(e=>e.k!=='hatch').slice(stage===1?-Math.max(1,Math.floor(half.length/2)):0,stage===1?undefined:Math.max(1,Math.floor(half.length/2)));
  if(!close.length)return {svg:s,h:H};
  const xs=v=>x+v*kx,W0=60,TP=20,BF=10,WZ=90;/* ogohlantirish 60, taper 20, bufer 10, ish zonasi 90 (ANDOZA) */
  const dir=stage===1?1:-1,x0=dir>0?0:Lm,at=v=>dir>0?x0+v:x0-v;
  const yTop=Math.min(...close.map(e=>YE.get(e)[0])),yBot=Math.max(...close.map(e=>YE.get(e)[1])),below=(yTop+yBot)/2>y+H/2;s+=`<polygon points="${f2(xs(at(W0)))},${f2(dir>0?yBot:yTop)} ${f2(xs(at(W0+TP)))},${f2(yTop)} ${f2(xs(at(W0+TP+BF+WZ)))},${f2(yTop)} ${f2(xs(at(W0+TP+BF+WZ)))},${f2(yBot)} ${f2(xs(at(W0+TP)))},${f2(yBot)}" fill="#f08a1a" fill-opacity=".25" stroke="#f08a1a" stroke-width=".4"/>`;
  s+=`<rect x="${f2(Math.min(xs(at(W0+TP+BF)),xs(at(W0+TP+BF+WZ))))}" y="${f2(Math.min(yTop,yBot))}" width="${f2(WZ*kx)}" height="${f2(Math.abs(yBot-yTop))}" fill="url(#hz)" stroke="#b2342a" stroke-width=".4"/>`;
  for(let v=W0;v<=W0+TP+BF+WZ;v+=5){const yc=v<W0+TP?(dir>0?yBot+(yTop-yBot)*(v-W0)/TP:yTop+(yBot-yTop)*(1-(v-W0)/TP)):(dir>0?yTop:yBot);s+=`<circle cx="${f2(xs(at(v)))}" cy="${f2(yc)}" r=".5" fill="#f08a1a"/>`;}
  const sg=(v,code,lbl)=>{const xx=xs(at(v)),yy2=below?y+H+4:y-4;s+=`<circle cx="${f2(xx)}" cy="${f2(yy2)}" r="2.2" fill="#fff" stroke="#b2342a" stroke-width=".5"/>`+T(xx,yy2+.8,code,{s:1.6,w:700,a:'middle'})+T(xx,yy2+(below?4.8:-3.2),lbl,{s:1.6,a:'middle',c:'#555'});};
  sg(0,'1.25','Yoʻl ishlari');sg(15,'3.24','40 km/s');sg(35,'1.20','Torayish');sg(W0,'4.2','Aylanib oʻtish');sg(W0+TP+BF+WZ+10,'3.25','Cheklov tugadi');
  s+=T(xs(at(W0+TP+BF+WZ/2)),(yTop+yBot)/2+1,'ISH ZONASI',{s:2.2,w:700,a:'middle',c:'#b2342a'});
  [[0,W0,'ogohlantirish 60 m'],[W0,W0+TP,'taper 20 m'],[W0+TP,W0+TP+BF,'bufer 10'],[W0+TP+BF,W0+TP+BF+WZ,'ish zonasi 90 m']].forEach(([a,b,t])=>{const xa=xs(at(a)),xb=xs(at(b));s+=L(xa,y+H+15,xb,y+H+15,{sw:.2})+L(xa,y+H+14,xa,y+H+16,{sw:.2})+T((xa+xb)/2,y+H+18.5,t,{s:1.8,a:'middle'});});
  return {svg:s,h:H+20};}
function tmSheet(st){let s=`<defs><pattern id="hz" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="3" fill="#b2342a" fill-opacity=".35"/></pattern></defs>`+head(`Qurilish davrida harakatni vaqtinchalik tashkil etish: ${st.name}`);let y=WORK.y+10;
  [1,2].forEach(k=>{s+=T(WORK.x,y,`${k}-bosqich: ${k===1?'bir yoʻnalishning tashqi boʻlaklari yopiladi':'qarama-qarshi yoʻnalish, tashqi boʻlaklar'} (sxematik, masshtabsiz)`,{s:2.8,w:700});const r=tmStage(st,WORK.x,y+14,WORK.w-10,k);s+=r.svg;y+=r.h+24;});
  ['Sxema namunaviy: ogohlantirish zonasi 60 m, taper 20 m, bufer 10 m, ish zonasi 90 m (ANDOZA; ODM 218.6.019-2016 «Yoʻl ishlari joylarida harakatni tashkil etish» maʼlumot uchun).','Vaqtinchalik razmetka — toʻq sariq rang (GOST R 51256-2018, 5.1.1). Belgilar YHQ 1-ilovasi boʻyicha; ish tugagach olib tashlanadi.',
   'Piyodalar: yopilgan trotuar uchun kamida 1,5 m vaqtinchalik yoʻlak, toʻsiq bilan; bekatlar vaqtincha koʻchiriladi. Har bosqich YHXBB bilan kelishiladi.','Qolgan boʻlaklar soni bilan oʻtkazish qobiliyati harakat modelida qayta tekshirilsin (bosqich → «Sinash»).'].forEach(l=>{s+=T(WORK.x,y,l,{s:2.2,c:'#333'});y+=4.6;});
  return s;}
function existSheets(G){const ds=DS(),ex=ds.exist;if(!ex||!ex.segs)return [];const keep={segs:ds.segs,nodes:ds.nodes,signs:ds.signs};let GE=null,STE=null;
  try{ds.segs=JSON.parse(JSON.stringify(ex.segs));ds.segs.forEach(e=>{if(!e.name){const q=keep.segs.find(x=>x.id===e.id);if(q&&q.name)e.name=q.name;}});/* nom keyin berilgan boʻlsa — mavjud holatda ham shu nom */ds.nodes=JSON.parse(JSON.stringify(ex.nodes));ds.signs=JSON.parse(JSON.stringify(ex.signs||[]));try{renderDesign();}catch(e){}GE=exportGeom();STE=streets();}finally{ds.segs=keep.segs;ds.nodes=keep.nodes;ds.signs=keep.signs;try{renderDesign();}catch(e){}} /* afterDesign emas: tarix va saqlashga mavjud holat tushmasin */
  if(!GE)return [];const out=[];
  {const bw=GE.bb[2]-GE.bb[0],bh=GE.bb[3]-GE.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-70,h:WORK.h},N=fitScale(bw,bh,area.w,area.h);const pg=planGroup(GE,GE.bb,area,N);
    let s=head('Mavjud holat sxemasi')+pg.svg;const lx=WORK.x+WORK.w-62;s+=legend(lx,WORK.y+4)+north(lx+50,WORK.y+70)+scaleBar(lx,WORK.y+90,N)+T(lx,WORK.y+104,`Saqlangan: ${new Date(ex.t||Date.now()).toLocaleDateString('ru-RU')}`,{s:2.3})+T(lx,WORK.y+109,ex.src||'manba: foydalanuvchi chizmasi / syomka',{s:2.1,c:'#555'});
    out.push({title:'Mavjud holat',scale:'1:'+N,body:s});}
  {let s=head('Mavjud holat ↔ loyiha: taqqoslash');const ST=streets(),names=[...new Set([...STE.map(x=>x.name),...ST.map(x=>x.name)])];
    const rows=names.map(n=>{const a=STE.find(x=>x.name===n),b=ST.find(x=>x.name===n),c=(x,f)=>x?f(x):'—';return [n,c(a,x=>x.lanes),c(b,x=>x.lanes),c(a,x=>f1(x.W)),c(b,x=>f1(x.W)),c(a,x=>x.xw),c(b,x=>x.xw),c(a,x=>x.stops),c(b,x=>x.stops),c(a,x=>x.lay.st.some(e=>e.k==='bike')?'bor':'yoʻq'),c(b,x=>x.lay.st.some(e=>e.k==='bike')?'bor':'yoʻq'),c(a,x=>x.lay.st.some(e=>e.k==='bus')?'bor':'yoʻq'),c(b,x=>x.lay.st.some(e=>e.k==='bus')?'bor':'yoʻq')];});
    let t=table(WORK.x,WORK.y+12,[['Koʻcha',62],['Boʻlak M',16,'r'],['L',12,'r'],['Eni M',16,'r'],['L',14,'r'],['Oʻtish M',16,'r'],['L',12,'r'],['Bekat M',16,'r'],['L',12,'r'],['Velo M',16],['L',14],['A-boʻlak M',20],['L',14]],rows,{rh:5});
    s+=T(WORK.x,WORK.y+8,'M — mavjud, L — loyiha',{s:2.4,c:'#555'})+t.svg;let y=WORK.y+t.h+22;
    const sa=ex.sim,sb=ds.simAlb;const dem=x=>{const q=x&&(x.rows||[]).find(r=>/^Jami/.test(r[0]));return q?+q[1]||0:null;},dA=dem(sa),dB=dem(sb),same=dA!=null&&dB!=null&&Math.abs(dA-dB)<=Math.max(1,dA*.02);if(sa||sb){const r=[['Talab jami, avt/s',dA??'—',dB??'—'],['Tarmoq LOS',sa?sa.TL:'—',sb?sb.TL:'—'],['Oʻrtacha kechikish, s',sa?f1(sa.T):'—',sb?f1(sb.T):'—'],['Avtobus kechikishi, s',sa&&sa.bus?f1(sa.busD):'—',sb&&sb.bus?f1(sb.busD):'—'],['Piyoda kutishi, s',sa&&sa.ped?f1(sa.pedW):'—',sb&&sb.ped?f1(sb.pedW):'—']];
      Object.keys((sb||sa).juncs||{}).forEach(k=>{const A=sa&&sa.juncs&&sa.juncs[k],B=sb&&sb.juncs&&sb.juncs[k];r.push([((B||A)||{}).label||k,A?`${A.los} · ${A.d} s`:'—',B?`${B.los} · ${B.d} s`:'—']);});
      t=table(WORK.x,y,[['Harakat modeli',120],['Mavjud',40],['Loyiha',40]],r,{rh:5});s+=T(WORK.x,y-4,same?'Harakat modeli (bir xil talab bilan)':'Harakat modeli',{s:3,w:700})+t.svg;if(!same&&dA!=null&&dB!=null)s+=T(WORK.x,y+t.h+5,'Diqqat: talab har xil — andoza talab boʻlaklar soniga qarab olinadi. Toʻgʻri taqqoslash uchun «Sinash» oynasida ikkala holatga bir xil talab (sanoq) kiriting.',{s:2.3,c:'#b2342a'});}
    out.push({title:'Mavjud ↔ loyiha',scale:'',body:s});}
  return out;}

function buildSheets(){const ds=DS(),G=exportGeom();if(!G)return [];const sheets=[],J=junctions(),ST=streets(),SA=ds.simAlb||null;
  const NOTES=[];
  /* umumiy reja + kesish chiziqlari */
  const CUTS=cuts();
  sheets.push({title:'Vaziyat sxemasi',scale:'',body:sitSheet(G,J)});
  existSheets(G).forEach(x=>sheets.push(x));
  {const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-70,h:WORK.h},N=fitScale(bw,bh,area.w,area.h);
    const pg=planGroup(G,G.bb,area,N);let s=head('Umumiy reja (loyiha holati)')+pg.svg;
    ds.segs.forEach(sg=>{if(!sg.name)return;const xy=segXY(sg,G.o),c=cumLen(xy);if(c[c.length-1]<80)return;const m=pointAt(xy,c,c[c.length-1]/2),i=Math.max(1,c.findIndex(v=>v>=c[c.length-1]/2)),a=xy[i],b=xy[i-1],q=pg.X(m);let ang=Math.atan2(-(a[1]-b[1]),a[0]-b[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
      s+=T(q[0],q[1]-4,KSN(sg.name),{s:3,w:700,a:'middle',r:ang});});
    CUTS.forEach(c=>{const n=[-c.u[1],c.u[0]],h=c.W/2+12,A=pg.X([c.P[0]+n[0]*h,c.P[1]+n[1]*h]),B=pg.X([c.P[0]-n[0]*h,c.P[1]-n[1]*h]);
      s+=L(A[0],A[1],B[0],B[1],{s:'#b2342a',sw:.5,d:'3 1 .6 1'})+T(A[0],A[1]-1,String(c.no),{s:2.8,w:700,c:'#b2342a',a:'middle'})+T(B[0],B[1]+3,String(c.no),{s:2.8,w:700,c:'#b2342a',a:'middle'});});
    J.forEach((j,i)=>{const q=pg.X(toXY(j.n.ll,G.o));s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="3.4" fill="#fff" stroke="#141414" stroke-width=".6"/>`+T(q[0],q[1]+1.2,String(i+1),{s:3.4,w:700,a:'middle'});});
    const lx=WORK.x+WORK.w-62;s+=legend(lx,WORK.y+4)+north(lx+50,WORK.y+70)+scaleBar(lx,WORK.y+90,N);
    s+=T(lx,WORK.y+104,'Chorrahalar',{s:2.8,w:700});J.forEach((j,i)=>{s+=T(lx,WORK.y+110+i*5,`${i+1}. ${j.title}`,{s:2.3});});
    const yk=WORK.y+116+J.length*5;s+=L(lx,yk,lx+8,yk,{s:'#b2342a',sw:.5,d:'3 1 .6 1'})+T(lx+10,yk+1,'Koʻndalang kesim joyi va raqami',{s:2.3});
    sheets.push({title:'Umumiy reja',scale:'1:'+N,body:s});}
  /* har chorraha 1:500 — razmetka va belgilar */
  J.forEach((j,i)=>{const area={x:WORK.x,y:WORK.y,w:WORK.w-80,h:WORK.h},F=jFit(j,G,area),c=F.c,N=F.N,hw=area.w/2*N/1000,hh=area.h/2*N/1000,bb=[c[0]-hw,c[1]-hh,c[0]+hw,c[1]+hh];
    const pg=planGroup(G,bb,area,N);let s=head(`${i+1}. Chorraha: ${j.title} — razmetka va yoʻl belgilari`)+pg.svg;const lx=WORK.x+WORK.w-72;
    CUTS.forEach(cu=>{const n=[-cu.u[1],cu.u[0]],h=cu.W/2+4,A=pg.X([cu.P[0]+n[0]*h,cu.P[1]+n[1]*h]),B=pg.X([cu.P[0]-n[0]*h,cu.P[1]-n[1]*h]);if(A[0]<area.x||A[0]>area.x+area.w||A[1]<area.y||A[1]>area.y+area.h)return;
      s+=L(A[0],A[1],B[0],B[1],{s:'#b2342a',sw:.5,d:'3 1 .6 1'})+T(A[0],A[1]-1,String(cu.no),{s:3,w:700,c:'#b2342a',a:'middle'});});
    s+=T(lx,WORK.y+4,'Turi: '+(KN[j.kind]||j.kind),{s:2.6,w:700});
    const JN=JNET.get(j.n.id);let yy=WORK.y+12;
    if(JN){s+=T(lx,yy,'Kirishlar va boʻlaklar (1.18):',{s:2.5,w:700});yy+=5;
      JN.E.forEach(e=>{if(!e.lanes.length)return;s+=T(lx,yy,`${KSN(e.name)||'—'} (${DN(e)}) → ${e.lanes.length} boʻlak`,{s:2.3});yy+=4;s+=T(lx+3,yy,e.lanes.map(l=>l.code||'S').join('  '),{s:2.3,c:'#555'});yy+=5;});}
    yy+=3;s+=T(lx,yy,'L — chapga, S — toʻgʻri, R — oʻngga, U — qayrilish',{s:2,c:'#666'});
    s+=north(lx+55,WORK.y+150)+scaleBar(lx,WORK.y+172,N)+legend(lx,WORK.y+185);
    sheets.push({title:`Chorraha ${i+1}: razmetka`,scale:'1:'+N,body:s});});
  if(J.length)sheets.push({title:'Koʻrinish uchburchaklari',scale:'1:1500',body:sightSheet(G,J)});
  /* koʻndalang kesimlar — Koʻchasoz kesim grafikasi */
  {let s=null,y=0,page=0;const flush=()=>{if(s){sheets.push({title:'Koʻndalang kesimlar'+(page>1?' ('+page+')':''),scale:'1:200',body:s});s=null;}};
    CUTS.forEach(c=>{const pr=cutSection(c,0,0,WORK.w);if(!s||y+pr.h+16>WORK.y+WORK.h+STH-4){flush();page++;s=head('Koʻndalang kesimlar')+T(WORK.x+WORK.w-4,FR.y+8.5,(CUTS.some(x=>x.auto)?'joylar avtomatik (koʻcha oʻrtasi, bekatlar); ✂ bilan oʻzingiz tanlang':'joylar ✂ bilan tanlangan'),{s:2.4,a:'end',c:'#555'});y=WORK.y+8;}
      const lab=`${c.no}–${c.no}. ${c.sg.name||'Koʻcha'}${c.stop?' (bekat)':''} — eni ${f2(c.W)} m, ${c.lanes} boʻlak · 1:${pr.N}`;
      s+=T(WORK.x+2,y+4,lab,{s:3,w:700});const cs=cutSection(c,WORK.x+2,y+6,WORK.w);s+=cs.svg;y+=cs.h+12;});
    flush();}
  /* tarmoq kartogrammasi */
  {const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-70,h:WORK.h},N=fitScale(bw,bh,area.w,area.h),k=1000/N;
    let s=head('Harakat jadalligi kartogrammasi (tigʻiz soat, avt/soat)');
    const G2={...G,items:G.items.filter(it=>it.t==='poly'&&(it.cat==='car'||it.cat==='pt'||it.cat==='ped'||it.cat==='green')).map(it=>({...it,col:it.cat==='car'||it.cat==='pt'?'#d6d3cc':'#efece6'})),signs:[]};
    const pg=planGroup(G2,G.bb,area,N);s+=pg.svg;
    if(!SA||!SA.arms){s+=T(area.x+6,area.y+10,'Harakat modeli hisoblanmagan: chorrahani tanlang → «Sinash» → «Hisoblash».',{s:3,c:'#b2342a'});}
    else{let mx=1;Object.values(SA.arms).forEach(a=>mx=Math.max(mx,a.flow||0));
      Object.entries(SA.arms).forEach(([id,a])=>{const JN=JNET.get(a.node),e=JN&&JN.E.find(e=>e.ai===a.ai);if(!e||!a.flow)return;const n=DS().nodes.find(n=>n.id===a.node);if(!n)return;
        const w=Math.max(.5,a.flow/mx*4.5);let P0,P1;
        /* strelka — kirish boʻlaklari oʻrtasidagi chiziq boʻylab: toʻxtash chizigʻidan 60 m orqadan 15 m gacha */
        const ln=e.lanes[Math.floor(e.lanes.length/2)];if(ln&&ln.pts&&ln.pts.length>1){const xy=ln.pts.map(p=>toXY(toLL(p,JN.o),G.o)),cc=cumLen(xy),TT=cc[cc.length-1];P0=pg.X(pointAt(xy,cc,Math.max(0,TT-60)));P1=pg.X(pointAt(xy,cc,Math.max(0,TT-12)));}
        else{const c=toXY(n.ll,G.o),out=e.out;P0=pg.X([c[0]+out[0]*70,c[1]+out[1]*70]);P1=pg.X([c[0]+out[0]*25,c[1]+out[1]*25]);}
        const col=a.los&&'EF'.includes(a.los)?'#b2342a':a.los&&'CD'.includes(a.los)?'#c88a1a':'#2a6fb0';
        s+=`<line x1="${f2(P0[0])}" y1="${f2(P0[1])}" x2="${f2(P1[0])}" y2="${f2(P1[1])}" stroke="${col}" stroke-width="${f2(w)}" stroke-opacity=".8" marker-end="url(#ak)"/>`;
        s+=T((P0[0]+P1[0])/2+2,(P0[1]+P1[1])/2,String(a.flow),{s:2.4,w:700,c:col});});
      J.forEach((j,i)=>{const q=pg.X(toXY(j.n.ll,G.o)),r=SA.juncs&&SA.juncs[j.n.id];s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="4" fill="#fff" stroke="#141414" stroke-width=".5"/>`+T(q[0],q[1]+1.2,r&&r.los||String(i+1),{s:3.4,w:700,a:'middle',c:r&&'EF'.includes(r.los)?'#b2342a':'#141414'});});}
    const lx=WORK.x+WORK.w-62;s+=north(lx+50,WORK.y+12)+scaleBar(lx,WORK.y+30,N);
    s+=T(lx,WORK.y+44,'Strelka eni ~ jadallik (oʻtgan, avt/s)',{s:2.3,w:700});[['#2a6fb0','LOS A–B'],['#c88a1a','LOS C–D'],['#b2342a','LOS E–F']].forEach(([c,t],i)=>{s+=L(lx,WORK.y+50+i*5,lx+10,WORK.y+50+i*5,{s:c,sw:2})+T(lx+12,WORK.y+51+i*5,t,{s:2.3});});
    s+=T(lx,WORK.y+70,'Doiradagi harf — chorrahaning LOS',{s:2.3});
    if(SA){s+=T(lx,WORK.y+80,`Talab: ${SA.lvl}`,{s:2.3})+T(lx,WORK.y+85,'Manba: harakat modeli (ANDOZA talab,',{s:2.1,c:'#555'})+T(lx,WORK.y+89,'real sanoq bilan tasdiqlansin)',{s:2.1,c:'#555'});}
    sheets.push({title:'Kartogramma',scale:'1:'+N,body:ARDEF+s});}
  /* har svetoforli chorraha: burilish oqimlari + faza sxemasi + siklogramma */
  J.forEach((j,i)=>{const JN=JNET.get(j.n.id);if(!JN)return;const sig=SA&&SA.sigs&&SA.sigs.find(x=>x.node===j.n.id);
    let s=ARDEF+head(`${i+1}. ${j.title}: oqimlar${j.kind==='sig'?', svetofor fazalari va siklogramma':''}`);
    s+=T(WORK.x,WORK.y+4,'Burilish oqimlari, avt/soat (harakat modeli)',{s:3,w:700});
    if(SA&&SA.arms)s+=turnDiagram(JN,SA.arms,WORK.x+75,WORK.y+95,62);else s+=T(WORK.x,WORK.y+14,'Harakat modeli hisoblanmagan.',{s:2.8,c:'#b2342a'});
    if(j.kind==='sig'){s+=T(WORK.x+175,WORK.y+4,'Fazalar sxemasi',{s:3,w:700});
      if(sig){const n=sig.ph.length,bw=Math.min(52,(WORK.w-180)/Math.max(n,1)-4);sig.ph.forEach((p,k2)=>{s+=phaseBox(JN,p,WORK.x+175+k2*(bw+4),WORK.y+8,bw,k2,sig.C);});
        s+=cyclogram(sig,JN,WORK.x+195,WORK.y+8+bw+18,WORK.w-205);
        const r=SA.juncs&&SA.juncs[j.n.id];if(r)s+=T(WORK.x+175,WORK.y+8+bw+18+n*6+18,`Chorraha: oʻrtacha kechikish ${r.d} s · LOS ${r.los}`,{s:2.8,w:700,c:'EF'.includes(r.los)?'#b2342a':'#141414'});
        s+=T(WORK.x+175,WORK.y+8+bw+18+n*6+25,'Piyodalar: har faza davomida harakat kesib oʻtmaydigan qoʻllarda yashil (parallel).',{s:2.2,c:'#555'});}
      else s+=T(WORK.x+175,WORK.y+14,'Svetofor rejasi hisoblanmagan.',{s:2.8,c:'#b2342a'});}
    /* qoʻllar boʻyicha jadval */
    if(SA&&SA.arms){const rows=JN.E.filter(e=>e.lanes.length).map(e=>{const a=SA.arms[`n${j.n.id}a${e.ai}`]||{};return [`${KSN(e.name)||'—'} (${DN(e)})`,e.lanes.length,a.demand??'ichki',a.flow??'',(a.mv&&a.mv.L)||0,(a.mv&&a.mv.S)||0,(a.mv&&a.mv.R)||0,a.delay??'',a.q??'',a.los||''];});
      const t=table(WORK.x,WORK.y+172,[['Kirish',58],['Boʻlak',12,'r'],['Talab',14,'r'],['Oʻtdi',14,'r'],['↰',12,'r'],['↑',12,'r'],['↱',12,'r'],['Kech., s',16,'r'],['Navbat',14,'r'],['LOS',10]],rows,{col:(r,c,v)=>c===9&&'EF'.includes(v)?'#b2342a':null,rh:5});s+=t.svg+T(WORK.x,WORK.y+172+t.h+4,'«ichki» — bu kirishga oqim qoʻshni chorrahadan keladi (tarmoq chegarasidagi talab emas).',{s:1.9,c:'#555'});}
    if(j.kind==='sig'&&sig){const pt=pedTable(j,JN,sig);s+=T(WORK.x+230,WORK.y+168,'Piyoda svetofori: oʻtish vaqti',{s:2.8,w:700})+`<g transform="translate(${f2(WORK.x+230)} ${f2(WORK.y+172)})">${pt.svg}</g>`+T(WORK.x+230,WORK.y+172+pt.h+5,'Kerak = 5 s + L / 1,0 m/s (ANDOZA, keksa piyoda). Mumkin — oʻz qoʻli harakatlanmaydigan',{s:1.9,c:'#555'})+T(WORK.x+230,WORK.y+172+pt.h+8.5,'fazalar yigʻindisi; burilib kiruvchilar bilan konflikt alohida tekshirilsin. Velosipedchilar — parallel faza bilan.',{s:1.9,c:'#555'});}
    sheets.push({title:`Oqim va fazalar ${i+1}`,scale:'',body:s});});
  /* harakat modeli umumiy natija */
  {let s=head('Harakat modeli: xizmat darajasi (LOS)');const R0=SA;
    if(!R0){s+=T(WORK.x,WORK.y+10,'Harakat modeli hali hisoblanmagan: chorrahani tanlang → «Sinash» → «Hisoblash». Natija shu varaqqa avtomatik tushadi.',{s:3});}
    else{let y=WORK.y+6;s+=T(WORK.x,y,`${R0.verdict}`.slice(0,230),{s:2.6,w:700,c:R0.TL&&'EF'.includes(R0.TL)?'#b2342a':'#141414'});y+=6;
      s+=T(WORK.x,y,`Talab darajasi: ${R0.lvl} · hisob: ${new Date(R0.t).toLocaleString('ru-RU')}${R0.bus?` · avtobus ${Math.round(R0.bus)} avt/s, kechikish ${(R0.busD||0).toFixed(0)} s`:''}${R0.ped?` · piyoda ${Math.round(R0.ped)} kishi/s, kutish ${(R0.pedW||0).toFixed(0)} s`:''}`,{s:2.4,c:'#555'});y+=7;
      const t=table(WORK.x,y,[['Chorraha / kirish',190],['Talab, avt/s',26,'r'],['Oʻtdi',22,'r'],['Kechikish, s',26,'r'],['LOS',14]],R0.rows,{col:(i,j,v)=>j===4&&'EF'.includes(v)?'#b2342a':j===4&&'AB'.includes(v)?'#2b7449':null,rh:5});s+=t.svg;y+=t.h+6;
      ['Model: IDM ergashish, svetofor fazalari, piyoda va avtobus; 3 tasodifiy takror × 15 daq. (2 daq. isinish). LOS — HCM chegaralari (svetoforli 10/20/35/55/80 s, svetoforsiz 10/15/25/35/50 s).',
       (R0.man?'Talab — foydalanuvchi kiritgan (sanoq).':'Talab — modeldagi andoza (ANDOZA): «Sinash» oynasida har kirish uchun real sanoqni kiriting.')].forEach(l=>{s+=T(WORK.x,y,l,{s:2.2,c:'#555'});y+=4.5;});}
    sheets.push({title:'Harakat modeli (LOS)',scale:'',body:s});}
  /* jamoat transporti va piyodalar */
  {const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-150,h:WORK.h},N=fitScale(bw,bh,area.w,area.h),k=1000/N;
    const G2={...G,items:G.items.filter(it=>it.t==='poly'&&it.cat).map(it=>({...it,col:it.cat==='car'?'#d6d3cc':it.cat==='pt'?'#e8b4ad':'#efece6'})),signs:[]};
    const pg=planGroup(G2,G.bb,area,N);let s=head('Jamoat transporti va piyoda harakati sxemasi')+pg.svg;const stops=[],xws=[];
    DS().segs.forEach(sg=>{const xy=segXY(sg,G.o),c=cumLen(xy),T0=c[c.length-1];(sg.att||[]).forEach(a=>{if(!['bus','bay','tramstop'].includes(a.t))return;stops.push({sg,a,P:pointAt(xy,c,a.f*T0),s:a.f*T0});});
      (sg.xw||[]).forEach(x=>xws.push({sg,x,P:pointAt(xy,c,x.f*T0)}));});
    stops.forEach((st,i)=>{const q=pg.X(st.P),r=400*k;s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="${f2(r)}" fill="#2a6fb0" fill-opacity=".05" stroke="#2a6fb0" stroke-width=".2" stroke-dasharray="1 1"/>`;});
    stops.forEach((st,i)=>{const q=pg.X(st.P);s+=R(q[0]-2,q[1]-2,4,4,{f:'#2a6fb0',s:'#fff',sw:.3})+T(q[0],q[1]+1,String(i+1),{s:2.4,w:700,c:'#fff',a:'middle'});});
    J.forEach(j=>{const q=pg.X(toXY(j.n.ll,G.o));s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="2.2" fill="#fff" stroke="#141414" stroke-width=".5"/>`;});
    xws.forEach(x=>{const q=pg.X(x.P);s+=R(q[0]-1.5,q[1]-1.5,3,3,{f:'#fff',s:'#141414',sw:.4})+T(q[0],q[1]+.9,'P',{s:2,w:700,a:'middle'});});
    /* bekatlar oraligʻi: bir koʻcha, bir tomon */
    const byS={};stops.forEach((st,i)=>{const key=(st.sg.name||st.sg.id)+'|'+(st.a.side||st.a.pd||0);(byS[key]=byS[key]||[]).push({...st,i});});
    const rows=[];Object.values(byS).forEach(L2=>{L2.sort((a,b)=>a.s-b.s);L2.forEach((st,k2)=>{const nx=L2[k2+1];const dd=nx?Math.hypot(nx.P[0]-st.P[0],nx.P[1]-st.P[1]):null;
      rows.push([st.i+1,KSN(st.sg.name)||'—',{bus:'chetda',bay:'choʻntakli',tramstop:'oʻrtada (BRT)'}[st.a.t],st.a.len,dd?Math.round(dd):'—',dd?(dd>=400&&dd<=600?'mos':dd<400?'yaqin':'uzoq'):'']);});});
    const lx=WORK.x+WORK.w-145;const t=table(lx,WORK.y+4,[['№',8,'r'],['Koʻcha',42],['Turi',26],['L, m',12,'r'],['Keyingisigacha, m',30,'r'],['400–600',18]],rows.sort((a,b)=>a[0]-b[0]),{rh:5,col:(r,c,v)=>c===5&&v!=='mos'&&v?'#b2342a':null});s+=t.svg;
    let y=WORK.y+t.h+12;[['■','Bekat (raqami)'],['○','400 m piyoda yetish radiusi (ShNQ 2.07.01-23, 382-band)'],['P','Piyodalar oʻtish joyi (koʻcha oʻrtasida)'],['●','Chorraha (oʻtish joylari bilan)']].forEach(([a,b])=>{s+=T(lx,y,a,{s:3,w:700,c:'#2a6fb0'})+T(lx+6,y,b,{s:2.3});y+=5;});
    s+=T(lx,y+2,'Bekatlar oraligʻi: avtobus/trolleybus 400–600 m (ShNQ 2.07.01-23, 384-band;',{s:2.1,c:'#555'})+T(lx,y+6,'ShNQ 2.07.06-24, 26-band). Masofa toʻgʻri chiziq boʻyicha.',{s:2.1,c:'#555'});
    if(SA&&SA.ped)s+=T(lx,y+13,`Model: piyodalar ${Math.round(SA.ped)} kishi/soat, oʻrtacha kutish ${(SA.pedW||0).toFixed(0)} s.`,{s:2.3});
    s+=north(lx+130,WORK.y+WORK.h-30)+scaleBar(lx,WORK.y+WORK.h-12,N);
    sheets.push({title:'Jamoat transporti va piyodalar',scale:'1:'+N,body:s});}
  sheets.push({title:'Velo va avtoturargoh',scale:'',body:veloSheet(G,ST)});
  sheets.push({title:'Yoritish, svetofor, drenaj',scale:'',body:utilSheet(G,J,ST)});
  /* bekat va oʻtish joylari normalari */
  {let s=head('Bekatlar va piyoda oʻtish joylari — normalar boʻyicha tekshiruv'),rows=[],rx=[];
    ds.segs.forEach(sg=>{const T0=lineLen(segLL(sg)),A=DS().nodes.find(n=>n.id===sg.a),B=DS().nodes.find(n=>n.id===sg.b),ia=A&&isInter(nodeKind(A)),ib=B&&isInter(nodeKind(B));
      (sg.att||[]).filter(a=>['bus','bay','tramstop'].includes(a.t)).forEach(a=>{const s0=a.f*T0,dA=s0-a.len/2,dB=T0-s0-a.len/2,dmin=Math.min(ia?dA:1e9,ib?dB:1e9);
        rows.push([KSN(sg.name)||'—',{bus:'Chetda',bay:'Choʻntakli',tramstop:'Oʻrtada (BRT)'}[a.t],f1(s0),a.len,a.len>=20?'ha':'yoʻq',dmin>9e8?'—':f1(dmin),dmin>9e8?'—':dmin>=20?'ha':'yoʻq',a.t==='tramstop'?(a.xsig?'svetoforli':'svetoforsiz'):'']);});
      (sg.xw||[]).forEach(x=>{rx.push([KSN(sg.name)||'—',{zebra:'Oddiy (1.14.1)',signal:'Svetoforli',raised:'Koʻtarilgan',refuge:'Orolchali'}[x.type]||x.type,f1(x.f*T0),x.w||DS().thr.cw,(x.w||4)>=4?'ha':'yoʻq']);});});
    let y=WORK.y+6;const t1=table(WORK.x,y,[['Koʻcha',55],['Turi',34],['Koʻcha boshidan, m',34,'r'],['Uzunlik, m',22,'r'],['≥ 20 m (394-b.)',28],['Chorrahagacha, m',30,'r'],['≥ 20 m (393-b.)',28],['Oʻtish joyi',30]],rows,{col:(i,j,v)=>v==='yoʻq'?'#b2342a':null});
    s+=rows.length?t1.svg:T(WORK.x,y+4,'Bekat yoʻq.',{s:2.6});y+=(rows.length?t1.h:6)+10;
    const t2=table(WORK.x,y,[['Koʻcha',55],['Turi',40],['Koʻcha boshidan, m',34,'r'],['Eni, m',20,'r'],['≥ 4 m (6.2.17)',26]],rx);s+=rx.length?t2.svg:'';y+=(rx.length?t2.h:0)+10;
    ['ShNQ 2.07.01-23: 382-band (bekatgacha ≤ 400 m), 384-band (bekatlar oraligʻi 400–600 m), 393-band (bekat chorrahadan keyin ≥ 20 m), 394-band (platforma 20 / ≥ 30 m, eni ≥ 1,5 m), 395-band (qatnov qismini toraytirmaslik).',
     'ShNQ 2.07.02-24: 192-band (platforma 1,8×12 / 2,5×24 / 2,5×36 m), 193-band (≤ 0,20 m), 17-band (oʻtish ≤ 1:10), 18-band (bordyur ≤ 2 sm), 12-ilova (taktil 0,6 m, chetdan 0,3 m).',
     'GOST R 52289-2019: 6.2.3 (oʻtish joyidan 20 m oldin 1.1), 6.2.14 (1.12 ≥ 1 m oldin), 6.2.17 (1.14.1 eni ≥ 4 m), 6.2.20 (1.17), 6.2.26 (1.23). GOST R 51256-2018: 1.16.1 45°, 0,40/1,20 m.',
     'Bekat kengayishi (taper) ≥ 30 m — ShNQ 2.07.01-23, 333-band (talqin).'].forEach((t,i)=>{s+=T(WORK.x,y+i*5.5,t,{s:2.3,c:'#333'});});
    sheets.push({title:'Bekatlar va oʻtish joylari: normalar',scale:'',body:s});}
  /* vedomostlar: koʻchalar, razmetka hajmi, belgilar */
  {let s=head('Vedomostlar: koʻchalar, yoʻl razmetkasi, yoʻl belgilari'),y=WORK.y+6;
    const t1=table(WORK.x,y,[['Koʻcha',62],['Modul',62],['Uzunlik, m',22,'r'],['Eni, m',18,'r'],['Boʻlak',14,'r'],['Oʻtish j.',16,'r'],['Bekat',14,'r']],ST.map(st=>[st.name,st.mod,f1(st.len),f2(st.W),st.lanes,st.xw,st.stops]));s+=t1.svg;y+=t1.h+8;
    const MQ=markQty(G),mrows=Object.entries(MQ).filter(([k])=>MK[k]).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([k,v])=>[k,MK[k]||k,v.l?f1(v.l):'—',f1(v.a),MKSRC[k]||'']);
    const tot=mrows.reduce((a,r)=>a+(+r[3]||0),0);mrows.push(['','Jami boʻyoq maydoni','',f1(tot),'']);
    const t3=table(WORK.x,y,[['Kod',18],['Nomi',72],['Uzunlik, m',24,'r'],['Maydon, m²',24,'r'],['Qoida',70]],mrows,{rh:5});s+=t3.svg;
    s+=T(WORK.x,y+t3.h+5,'Uzunlik — chiziq oʻqi boʻyicha; maydon — boʻyalgan qism (uzuq chiziqda shtrix ulushi, eni 0,10 m; 1.12/1.13 — 0,40 m). Zebra, strelka, shtrix, taktil — poligon maydoni.',{s:2.1,c:'#555'});
    const sg2={};(ds.signs||[]).forEach(x=>{sg2[x.c]=sg2[x.c]||{exist:0,new:0,remove:0};sg2[x.c][x.st||'new']++;});
    /* «Mavjud holat» saqlangan boʻlsa — kod boʻyicha soni taqqoslanadi: qoladi = min(M, L), yangi = L − M, olinadi = M − L (joyi boʻyicha emas) */
    const exS=ds.exist&&ds.exist.signs;if(exS&&exS.length){const M={},Lc={};exS.forEach(x=>{if(x.st!=='remove')M[x.c]=(M[x.c]||0)+1;});(ds.signs||[]).forEach(x=>{if(x.st!=='remove')Lc[x.c]=(Lc[x.c]||0)+1;});
      Object.keys(sg2).forEach(k=>delete sg2[k]);[...new Set([...Object.keys(M),...Object.keys(Lc)])].sort().forEach(c=>{const m=M[c]||0,l=Lc[c]||0;sg2[c]={new:Math.max(0,l-m),exist:Math.min(l,m),remove:Math.max(0,m-l)};});}
    const t4=table(WORK.x+250,WORK.y+6,[['Belgi',16],['Nomi',62],['Yangi',13,'r'],['Mavjud',13,'r'],['Olinadi',13,'r']],Object.entries(sg2).map(([c,v])=>[c,(signDef(c)||[])[1]||'',v.new,v.exist,v.remove]),{rh:5});
    s+=Object.keys(sg2).length?t4.svg+(exS&&exS.length?T(WORK.x+250,WORK.y+6+t4.h+4,'Mavjud holat bilan kod boʻyicha soni taqqoslangan (joyi boʻyicha emas) — joyda tasdiqlansin.',{s:2,c:'#555'}):''):T(WORK.x+250,WORK.y+10,'Yoʻl belgilari qoʻyilmagan.',{s:2.4});
    sheets.push({title:'Vedomostlar',scale:'',body:s});}
  /* ishlar hajmi */
  {let s=head('Asosiy ishlar hajmi (taxminiy, rejadan)');let st=null;try{st=designStats();}catch(e){}
    const rows=[];if(st&&st.tot)Object.entries(DCAT).forEach(([k,[n]])=>{const m2=st.cnt[k]/st.tot*st.m2;if(m2>1)rows.push([n,Math.round(m2),(st.cnt[k]/st.tot*100).toFixed(1)]);});
    const trees=(G.sh||[]).filter(x=>x.t==='tree').length,curb=G.items.filter(it=>it.t==='line'&&it.opt&&(it.opt.color==='#f7f5ef'||it.opt.color==='#9a917f')).reduce((a,it)=>{let l=0;for(let i=1;i<it.xy.length;i++)l+=Math.hypot(it.xy[i][0]-it.xy[i-1][0],it.xy[i][1]-it.xy[i-1][1]);return a+l;},0);
    rows.push(['Daraxtlar (koʻkalamzor tasmalarida), dona',trees,''],['Yoʻl belgilari, dona',(ds.signs||[]).length,''],['Bekatlar, dona',ST.reduce((a,x)=>a+x.stops,0),''],['Piyodalar oʻtish joylari (koʻcha oʻrtasida), dona',ST.reduce((a,x)=>a+x.xw,0),''],['Svetoforli chorrahalar, dona',J.filter(j=>j.kind==='sig').length,'']);
    const t=table(WORK.x,WORK.y+6,[['Element',120],['Miqdori (m² / m / dona)',40,'r'],['Ulush, %',22,'r']],rows,{rh:5.4});s+=t.svg;
    s+=T(WORK.x,WORK.y+t.h+12,'Maydonlar loyiha rejasining rastr tahlilidan (ustma-ust qatlamlar hisobga olinmaydi). Smeta uchun DXF asosida aniqlashtiring.',{s:2.2,c:'#555'});
    sheets.push({title:'Ishlar hajmi',scale:'',body:s});}
  ST.filter(st=>st.lanes>=4&&st.len>150).forEach(st=>sheets.push({title:'Vaqtinchalik TT: '+KSN(st.name),scale:'sxematik',body:tmSheet(st)}));
  /* YHQ */
  {let s=head('Yoʻl harakati qoidalari (YHQ) boʻyicha avtomatik tekshiruv');let ck={};try{ck=checkYHQ();}catch(e){}
    const rows=[];try{ckOrder(ck).forEach(q=>{const c=ck[q.id];rows.push([q.t,{ok:'mos',bad:'muammo',auto:'avtomatik',na:'tegishli emas',warn:'diqqat'}[c[0]]||c[0],(c[2]||[]).length?(()=>{const w=[...new Set((c[2]||[]).map(x=>x.why))],t0=w.slice(0,2).join('; ');return (t0.length>150?t0.slice(0,147)+'…':t0)+(w.length>2?` (+${w.length-2})`:'');})():(c[1]||'')]);/* izoh jadvaldan chiqmasin */});}catch(e){}
    const t=table(WORK.x,WORK.y+6,[['Qoida',120],['Holat',22],['Izoh',240]],rows.slice(0,40),{col:(i,j,v)=>j===1&&v==='muammo'?'#b2342a':j===1&&v==='mos'?'#2b7449':null,rh:5});s+=rows.length?t.svg:T(WORK.x,WORK.y+10,'Tekshiruv natijasi yoʻq.',{s:2.6});
    s+=T(WORK.x,WORK.y+WORK.h+STH-4,'Qoida mazmuni YHQ ilovalari asosida umumlashtirilgan; band raqamlarini tasdiqlang.',{s:2.2,c:'#555'});
    sheets.push({title:'YHQ tekshiruvi',scale:'',body:s});}
  /* umumiy maʼlumotlar (oldiga) */
  const total=sheets.length+2;
  {let s=head('Umumiy maʼlumotlar');
    const list=[['1','Titul'],['2','Umumiy maʼlumotlar'],...sheets.map((x,i)=>[String(i+3),x.title,x.scale])];
    const t=table(WORK.x,WORK.y+6,[['Varaq',14,'r'],['Nomi',110],['Masshtab',26]],list.map(r=>[r[0],r[1],r[2]||'']),{rh:4.6,fs:2.3});s+=T(WORK.x,WORK.y+3,'Chizmalar vedomosti',{s:3,w:700})+t.svg;
    const gx=WORK.x+165;let y=WORK.y+3;s+=T(gx,y,'Umumiy koʻrsatmalar',{s:3,w:700});y+=6;
    const NT=[`Loyiha: ${projName()}. Joy: ${DS().place||'Toshkent sh.'}. Bosqich — konsepsiya (P).`,
      'Asos: OpenStreetMap geometriyasi (koʻcha oʻqlari, boʻlaklar soni). Geodezik syomka boʻyicha aniqlashtirilsin.',
      'Koʻcha kesimlari — Koʻchasoz modullari; ShNQ 2.07.06-24 namunaviy kesimlariga muvofiqligi tekshirilsin.',
      'Yoʻl razmetkasi YHQ 2-ilovasi (VM 12.04.2022 172-son qarori) va GOST R 51256-2018, GOST R 52289-2019 qoidalari boʻyicha joylashtirilgan.',
      'Yoʻl belgilari avtomatik joylashtirilgan (YHQ 1-ilova); har biri joyda tasdiqlansin.',
      'Piyoda oʻtish joylari: zebra, taktil qoplama, pandus — ShNQ 2.07.02-24 (17, 18, 42-bandlar, 12-ilova).',
      'Bekatlar: ShNQ 2.07.01-23 (382–395-bandlar), ShNQ 2.07.02-24 (190–197-bandlar).',
      'Harakat modeli (mikromodel): IDM, svetofor fazalari Webster usulida avto tanlangan; talab — andoza (ANDOZA), real sanoq bilan tasdiqlansin.',
      (DS().exist?'Mavjud holat — foydalanuvchi saqlagan chizma (4–5-varaqlar); geodezik syomka va real sanoq bilan tasdiqlansin.':'Mavjud holat (hozirgi razmetka, belgilar, svetofor rejimi) syomkasi bu albomga kirmagan.'),
      'Belgilar: ANDOZA — norma qiymati emas, dastur andozasi; TALQIN — normani bu holatga qoʻllash talqini.'];
    NT.forEach((t2,i)=>{const lines=t2.match(/.{1,105}(\s|$)/g)||[t2];lines.forEach((ln,k2)=>{s+=T(gx+(k2?4:0),y,(k2?'':(i+1)+'. ')+ln.trim(),{s:2.3});y+=4;});y+=1;});
    y+=4;s+=T(gx,y,'Normativ hujjatlar',{s:3,w:700});y+=6;
    ['YHQ — VM 2022-yil 12-apreldagi 172-son qarori bilan tasdiqlangan Yoʻl harakati qoidalari','ShNQ 2.07.01-23 Aholi punktlari hududlarini rejalashtirish','ShNQ 2.07.06-24 Shahar koʻcha-yoʻllari. Loyihalash talablari','ShNQ 2.07.02-24 Nogironligi boʻlgan shaxslar va keksalar ehtiyojlari','ShNQ 2.04.18-22 Shaharlar va qishloq aholi yashaydigan joylarni tashqi yoritish','GOST R 52289-2019, GOST R 51256-2018 (maʼlumot uchun; Oʻzbekistonda mos standart topilmagan)']
      .forEach(t2=>{s+=T(gx,y,'— '+t2,{s:2.3});y+=4.5;});
    y+=4;s+=legend(gx,y);
    sheets.unshift({title:'Umumiy maʼlumotlar',scale:'',body:s});}
  {let s=T(PW/2,80,projName(),{s:10,w:700,a:'middle'})+T(PW/2,95,'Koʻcha va chorrahalar loyihasi · Harakatni tashkil etish sxemasi',{s:5,a:'middle',c:'#444'})+T(PW/2,106,(ds.place||'Toshkent shahri'),{s:4,a:'middle',c:'#444'})
      +T(PW/2,125,'Bosqich: Konsepsiya',{s:4,a:'middle'})+T(PW/2,PH-70,`Archemistry Lab · Koʻchasoz · ${new Date().getFullYear()}`,{s:3.4,a:'middle',c:'#555'})+T(PW/2,PH-63,`${total} varaq · A3`,{s:3,a:'middle',c:'#555'});
    sheets.unshift({title:'Titul',scale:'',body:s});}
  return sheets.map((x,i)=>({title:x.title,svg:frame(i+1,sheets.length,x.title,x.scale,x.body)}));}

function albumHTML(){const sh=buildSheets();return `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><title>${esc(projName())} — albom</title>
<style>@page{size:420mm 297mm;margin:0}html,body{margin:0;background:#888}section{width:420mm;height:297mm;margin:0 auto 8mm;background:#fff;page-break-after:always;box-shadow:0 2px 12px rgba(0,0,0,.25)}section svg{display:block;width:420mm;height:297mm}
.bar{position:sticky;top:0;z-index:2;background:#141414;color:#fff;font:600 14px Arial;padding:10px 16px;display:flex;gap:10px;align-items:center}.bar button{font:600 13px Arial;padding:6px 12px;border-radius:8px;border:0;cursor:pointer}
@media print{.bar{display:none}html,body{background:#fff}section{margin:0;box-shadow:none}}</style></head><body>
<div class="bar"><span>${esc(projName())} · ${sh.length} varaq · A3</span><span style="flex:1"></span><button onclick="print()">PDF / Chop etish</button></div>
${sh.map(x=>`<section>${x.svg}</section>`).join('\n')}</body></html>`;}

/* albomdan oldin: loyiha nomi, joyi va nomsiz koʻchalar soʻraladi (aks holda varaqlarda «loyiha», «Nomsiz koʻcha», «Chorraha (tugun 5)»).
   Davom etish tugmasi — yangi foydalanuvchi bosishi: popup bloklanmaydi. */
function needInfo(){const ds=DS();return !ds.name||!ds.place||ds.segs.some(sg=>!sg.name);}
function infoForm(go){const ds=DS(),un=ds.segs.filter(sg=>!sg.name);let hl=null;const old=document.getElementById('ks-alb-info');if(old)old.remove();
  const el=document.createElement('div');el.id='ks-alb-info';el.className='kt-ui kt-card';el.style.cssText='position:fixed;left:50%;top:80px;transform:translateX(-50%);z-index:1300;width:420px;max-height:75vh;overflow:auto;padding:16px;font:13px Archivo,sans-serif';
  const inp='style="width:100%;height:34px;border:0;border-radius:10px;box-shadow:inset 0 0 0 1px #ebe8e2;padding:0 10px;font:13px Archivo,sans-serif;margin:4px 0 10px"';
  el.innerHTML=`<div style="font-weight:700;font-size:15px;margin-bottom:6px">Albom uchun maʼlumot</div><div class="small" style="color:#666;margin-bottom:10px">Varaqlarning asosiy yozuvi va sarlavhalarida shu nomlar chiqadi.</div>
    <label>Loyiha nomi<input data-n="name" ${inp} value="${esc(ds.name||'')}" placeholder="masalan: Shota Rustaveli koʻchasi rekonstruksiyasi"></label>
    <label>Joyi<input data-n="place" ${inp} value="${esc(ds.place||'')}" placeholder="masalan: Toshkent sh., Yakkasaroy tumani"></label>
    ${un.length?`<div style="font-weight:700;margin:4px 0">Nomsiz koʻchalar (${un.length})</div><div class="small" style="color:#666;margin-bottom:6px">Maydonni bossangiz — koʻcha xaritada belgilanadi.</div>`+un.map(sg=>`<label>Koʻcha ${ds.segs.indexOf(sg)+1} · ${Math.round(lineLen(segLL(sg)))} m<input data-sg="${sg.id}" ${inp} placeholder="koʻcha nomi"></label>`).join(''):''}
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px"><button class="btn" data-skip>Nomsiz davom etish</button><button class="btn pri" data-go style="background:#1c2628;color:#fff">Saqlash va albomni yaratish</button></div>`;
  document.body.appendChild(el);['mousedown','dblclick','wheel','click','keydown'].forEach(ev=>el.addEventListener(ev,e=>e.stopPropagation()));
  const unhl=()=>{if(hl){hl.remove();hl=null;}};
  el.querySelectorAll('[data-sg]').forEach(i=>i.addEventListener('focus',()=>{unhl();const sg=ds.segs.find(x=>x.id===+i.dataset.sg);if(!sg)return;const ll=segLL(sg);hl=window.L.polyline(ll,{color:'#f08a1a',weight:10,opacity:.8}).addTo(map);try{map.fitBounds(window.L.latLngBounds(ll).pad(.6),{animate:false});}catch(e){}}));
  const fin=save=>{if(save){const v=k=>(el.querySelector(`[data-n="${k}"]`).value||'').trim();if(v('name'))ds.name=v('name');if(v('place'))ds.place=v('place');
      el.querySelectorAll('[data-sg]').forEach(i=>{const t=i.value.trim();if(!t)return;const sg=ds.segs.find(x=>x.id===+i.dataset.sg);if(sg)sg.name=t;});try{afterDesign();}catch(e){}}
    unhl();el.remove();go();};
  el.querySelector('[data-go]').onclick=()=>fin(true);el.querySelector('[data-skip]').onclick=()=>fin(false);
  setTimeout(()=>{const f=el.querySelector('input');if(f)f.focus();},50);}
async function openAlbum(force){if(!DS().segs.length){toast('Loyiha boʻsh.');return;}if(!force&&needInfo()){infoForm(()=>openAlbum(true));return;}const w0=open('','_blank');if(w0)w0.document.write('<p style="font:16px Arial;padding:20px">Albom tayyorlanmoqda (shahar xaritasi yuklanmoqda)…</p>');await prepAlbum();const html=albumHTML(),w=w0;if(!w){toast('Brauzer yangi oynani bloklad.');return;}w.document.open();w.document.write(html);w.document.close();}
async function albumToChz(force){if(!force&&needInfo()){infoForm(()=>albumToChz(true));return;}await prepAlbum();const sh=buildSheets();let n=0;const t=new Date().toISOString();for(const x of sh){const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x.svg);await kpsMatPut({id:'alb'+Date.now().toString(36)+n,kind:'svg',name:x.title,src,thumb:src,aspect:PW/PH,sub:projName(),t});n++;}
  toast(`${n} ta varaq Chizmadonga yuborildi.`,()=>window.open('app/#/chizmadon','_blank'),'Chizmadonni ochish');}
window.KSALB={prepAlbum,buildSheets,albumHTML,openAlbum,albumToChz,pickCut,cuts,drawCutMarks};
})();
