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
  const segs=ds.segs.filter(s=>s.a===n.id||s.b===n.id),names=[...new Set(segs.map(s=>KSN(s.name)).filter(Boolean))];
  return {n,names,title:names.length>=2?names.join(' × '):(names[0]||'Chorraha')+' (tugun '+n.id+')',kind:nodeKind(n)};});}
function streets(){const ds=DS(),g={};ds.segs.forEach(sg=>{const k=(sg.name||'Nomsiz koʻcha')+'|'+(sg.st?'custom':sg.p);(g[k]=g[k]||[]).push(sg);});
  return Object.entries(g).map(([k,ss])=>{const sg=ss[0],lay=layOf(sg);return {name:sg.name||'Nomsiz koʻcha',mod:sg.st?'Tahrirlangan kesim':(PRESETS[sg.p]?.n||sg.p),p:sg.p,len:ss.reduce((a,s)=>a+lineLen(segLL(s)),0),W:lay.W,lanes:lay.lanes,xw:ss.reduce((a,s)=>a+(s.xw||[]).length,0),stops:ss.reduce((a,s)=>a+(s.att||[]).filter(x=>['bus','bay','tramstop'].includes(x.t)).length,0),segs:ss,lay};});}
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
function buildSheets(){const ds=DS(),G=exportGeom();if(!G)return [];const sheets=[],J=junctions(),ST=streets();
  /* umumiy reja */
  {const bw=G.bb[2]-G.bb[0],bh=G.bb[3]-G.bb[1],area={x:WORK.x,y:WORK.y,w:WORK.w-70,h:WORK.h},N=fitScale(bw,bh,area.w,area.h);
    const pg=planGroup(G,G.bb,area,N);let s=head('Umumiy reja')+pg.svg;
    ds.segs.forEach(sg=>{if(!sg.name)return;const xy=segXY(sg,G.o),c=cumLen(xy),m=pointAt(xy,c,c[c.length-1]/2),i=Math.max(1,c.findIndex(v=>v>=c[c.length-1]/2)),a=xy[i],b=xy[i-1],q=pg.X(m);let ang=Math.atan2(-(a[1]-b[1]),a[0]-b[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
      s+=`<g>${T(q[0],q[1]-4,KSN(sg.name),{s:3,w:700,a:'middle',r:ang,c:'#141414'})}</g>`;});
    J.forEach((j,i)=>{const q=pg.X(toXY(j.n.ll,G.o));s+=`<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="3.4" fill="#fff" stroke="#b2342a" stroke-width=".6"/>`+T(q[0],q[1]+1.2,String(i+1),{s:3.4,w:700,a:'middle',c:'#b2342a'});});
    const lx=WORK.x+WORK.w-62;s+=legend(lx,WORK.y+4)+north(lx+50,WORK.y+70)+scaleBar(lx,WORK.y+90,N);
    s+=T(lx,WORK.y+104,'Chorrahalar',{s:2.8,w:700});J.forEach((j,i)=>{s+=T(lx,WORK.y+110+i*5,`${i+1}. ${j.title}`,{s:2.3});});
    sheets.push({title:'Umumiy reja',scale:'1:'+N,body:s});}
  /* har chorraha */
  J.forEach((j,i)=>{const c=toXY(j.n.ll,G.o),area={x:WORK.x,y:WORK.y,w:WORK.w-80,h:WORK.h},N=500,hw=area.w/2*N/1000,hh=area.h/2*N/1000,bb=[c[0]-hw,c[1]-hh,c[0]+hw,c[1]+hh];
    const pg=planGroup(G,bb,area,N);let s=head(`${i+1}. Chorraha: ${j.title}`)+pg.svg;const lx=WORK.x+WORK.w-72;
    s+=T(lx,WORK.y+4,'Turi: '+(KN[j.kind]||j.kind),{s:2.6,w:700});
    const JN=JNET.get(j.n.id);let yy=WORK.y+12;
    if(JN){s+=T(lx,yy,'Kirishlar va boʻlaklar (1.18):',{s:2.5,w:700});yy+=5;
      JN.E.forEach(e=>{if(!e.lanes.length)return;s+=T(lx,yy,`${KSN(e.name)||'—'}${e.dir?' · '+e.dir:''} → ${e.lanes.length} boʻlak`,{s:2.3});yy+=4;s+=T(lx+3,yy,e.lanes.map(l=>l.code||'S').join('  '),{s:2.3,c:'#555'});yy+=5;});}
    yy+=3;s+=T(lx,yy,'L — chapga, S — toʻgʻri, R — oʻngga, U — qayrilish',{s:2,c:'#666'});
    s+=north(lx+55,WORK.y+150)+scaleBar(lx,WORK.y+172,N)+legend(lx,WORK.y+185);
    sheets.push({title:`Chorraha ${i+1}`,scale:'1:'+N,body:s});});
  /* koʻcha kesimlari */
  {const per=4,Wmax=Math.max(...ST.map(st=>st.lay.W)),NS=[50,100,200,250,500].find(n=>Wmax*1000/n<=WORK.w-20)||500;for(let p=0;p<ST.length;p+=per){let s=head('Koʻchalarning koʻndalang kesimlari')+T(WORK.x+WORK.w-4,FR.y+8.5,'Masshtab 1:'+NS,{s:3,a:'end'}),y=WORK.y+20;
    ST.slice(p,p+per).forEach(st=>{const d=sectionDraw(st.lay,WORK.x+4,y+6,WORK.w-20,`${st.name} — ${st.mod}`,NS);s+=d.svg;y+=d.h+22;});
    s+=T(WORK.x+4,WORK.y+WORK.h+STH-4,'↑ / ↓ — harakat yoʻnalishi (koʻcha oʻqi boʻyicha). Oʻlchamlar metrda.',{s:2.2,c:'#555'});
    sheets.push({title:'Kesimlar'+(ST.length>per?' '+(p/per+1):''),scale:'1:'+NS,body:s});}}
  /* umumiy maʼlumot jadvali + razmetka */
  {let s=head('Koʻchalar va tugunlar. Razmetka vedomosti'),y=WORK.y+6;
    const t1=table(WORK.x,y,[['Koʻcha',70],['Modul',70],['Uzunlik, m',22,'r'],['Eni, m',18,'r'],['Boʻlak',14,'r'],['Oʻtish j.',16,'r'],['Bekat',14,'r']],ST.map(st=>[st.name,st.mod,f1(st.len),f2(st.W),st.lanes,st.xw,st.stops]));
    s+=t1.svg;y+=t1.h+8;
    const t2=table(WORK.x,y,[['№',8,'r'],['Chorraha',96],['Turi',60]],J.map((j,i)=>[i+1,j.title,KN[j.kind]||j.kind]));s+=t2.svg;
    const mk=Object.entries(G.marks||{}).filter(([k])=>k!=='1.16.1'||!(G.marks||{})['1.16']);
    const t3=table(WORK.x+230,WORK.y+6,[['Kod',18],['Nomi',62],['Soni',14,'r'],['Qoida',50]],mk.map(([k,v])=>[k,MK[k]||k,v,MKSRC[k]||'']));s+=t3.svg;
    s+=T(WORK.x+230,WORK.y+t3.h+12,'«Soni» — chizmadagi elementlar (chiziq boʻlaklari, strelkalar, belgilar) soni; uzunlik hisobi keyingi bosqichda.',{s:2.1,c:'#555'});
    const sg2={};(ds.signs||[]).forEach(x=>{sg2[x.c]=sg2[x.c]||{exist:0,new:0,remove:0};sg2[x.c][x.st||'new']++;});
    const t4=table(WORK.x+230,WORK.y+t3.h+18,[['Belgi',18],['Nomi',72],['Yangi',13,'r'],['Mavjud',13,'r'],['Olinadi',13,'r']],Object.entries(sg2).map(([c,v])=>[c,(signDef(c)||[])[1]||'',v.new,v.exist,v.remove]));
    s+=Object.keys(sg2).length?t4.svg:T(WORK.x+230,WORK.y+t3.h+22,'Yoʻl belgilari qoʻyilmagan.',{s:2.4});
    sheets.push({title:'Vedomostlar',scale:'',body:s});}
  /* bekatlar va oʻtish joylari: normalar */
  {let s=head('Bekatlar va piyoda oʻtish joylari — normalar boʻyicha tekshiruv'),rows=[],rx=[];
    ds.segs.forEach(sg=>{const T0=lineLen(segLL(sg)),A=DS().nodes.find(n=>n.id===sg.a),B=DS().nodes.find(n=>n.id===sg.b),ia=A&&isInter(nodeKind(A)),ib=B&&isInter(nodeKind(B));
      (sg.att||[]).filter(a=>['bus','bay','tramstop'].includes(a.t)).forEach(a=>{const s0=a.f*T0,dA=s0-a.len/2,dB=T0-s0-a.len/2,dmin=Math.min(ia?dA:1e9,ib?dB:1e9);
        const okL=a.len>=20,okD=dmin>=20;rows.push([KSN(sg.name)||'—',{bus:'Chetda',bay:'Choʻntakli',tramstop:'Oʻrtada (BRT)'}[a.t],f1(s0),a.len,okL?'ha':'yoʻq',dmin>9e8?'—':f1(dmin),dmin>9e8?'—':okD?'ha':'yoʻq',a.t==='tramstop'?(a.xsig?'svetoforli':'svetoforsiz'):'']);});
      (sg.xw||[]).forEach(x=>{const s0=x.f*T0;rx.push([KSN(sg.name)||'—',{zebra:'Oddiy (1.14.1)',signal:'Svetoforli',raised:'Koʻtarilgan',refuge:'Orolchali'}[x.type]||x.type,f1(s0),x.w||DS().thr.cw]);});});
    let y=WORK.y+6;const t1=table(WORK.x,y,[['Koʻcha',55],['Turi',34],['Koʻcha boshidan, m',34,'r'],['Uzunlik, m',22,'r'],['≥ 20 m (394-b.)',28],['Chorrahagacha, m',30,'r'],['≥ 20 m (393-b.)',28],['Oʻtish joyi',30]],rows,{col:(i,j,v)=>v==='yoʻq'?'#b2342a':null});
    s+=rows.length?t1.svg:T(WORK.x,y+4,'Bekat yoʻq.',{s:2.6});y+=(rows.length?t1.h:6)+10;
    const t2=table(WORK.x,y,[['Koʻcha',55],['Turi',40],['Koʻcha boshidan, m',34,'r'],['Eni, m',20,'r']],rx);s+=rx.length?t2.svg:'';y+=(rx.length?t2.h:0)+10;
    const notes=['Normalar: ShNQ 2.07.01-23 — 393-band (bekat chorrahadan keyin ≥ 20 m), 394-band (platforma 20 m bir yoʻnalish / ≥ 30 m bir necha yoʻnalish, eni ≥ 1,5 m), 395-band (qatnov qismini toraytirmaslik).',
      'ShNQ 2.07.02-24 — 192-band (platforma 1,8×12 m / 2,5×24 m / 2,5×36 m), 193-band (≤ 0,20 m baland), 18-band (oʻtish joyida bordyur ≤ 2 sm), 12-ilova (taktil 0,6 m, chetdan 0,3 m).',
      'GOST R 52289-2019 — 6.2.3 (oʻtish joyidan 20 m oldin 1.1), 6.2.14 (svetoforli oʻtish joyida 1.12 ≥ 1 m oldin), 6.2.20 (1.17 platformadan qisqa emas), 6.2.26 (1.23 bekatdan 15 m keyin).',
      'Bekat kengayishi (taper) ≥ 30 m — ShNQ 2.07.01-23, 333-band (talqin). 1.16.1: 45°, 0,40/1,20 m — GOST R 51256-2018.'];
    notes.forEach((t,i)=>{s+=T(WORK.x,y+i*5.5,t,{s:2.3,c:'#333'});});
    sheets.push({title:'Bekatlar va oʻtish joylari',scale:'',body:s});}
  /* harakat modeli */
  {let s=head('Harakat modeli: svetofor rejasi va xizmat darajasi (LOS)');const R0=ds.simAlb;
    if(!R0){s+=T(WORK.x,WORK.y+10,'Harakat modeli hali hisoblanmagan: chorrahani tanlang → «Sinash» → «Hisoblash». Natija shu varaqqa avtomatik tushadi.',{s:3});}
    else{let y=WORK.y+6;s+=T(WORK.x,y,`${R0.verdict}`,{s:2.8,w:700,c:R0.TL&&'EF'.includes(R0.TL)?'#b2342a':'#141414'});y+=6;
      s+=T(WORK.x,y,`Talab darajasi: ${R0.lvl} · ${new Date(R0.t).toLocaleString('ru-RU')}`,{s:2.4,c:'#555'});y+=5;
      (R0.sig||'').match(/.{1,170}(\s|$)/g)?.forEach(line=>{s+=T(WORK.x,y,line.trim(),{s:2.2,c:'#333'});y+=4.2;});y+=3;
      const t=table(WORK.x,y,[['Chorraha / kirish',190],['Talab, avt/s',26,'r'],['Oʻtdi',22,'r'],['Kechikish, s',26,'r'],['LOS',14]],R0.rows,{col:(i,j,v)=>j===4&&'EF'.includes(v)?'#b2342a':j===4&&'AB'.includes(v)?'#2b7449':null,rh:5});s+=t.svg;y+=t.h+6;
      ['Model: IDM ergashish, svetofor fazalari, piyoda va avtobus; 3 tasodifiy takror × 15 daq. LOS — HCM chegaralari (svetoforli 10/20/35/55/80 s).','Talab — modeldagi andoza yoki foydalanuvchi kiritgan; real sanoq boʻlmasa natija taxminiy (ANDOZA). Loyiha qarori uchun sanoq bilan tasdiqlang.'].forEach(l=>{s+=T(WORK.x,y,l,{s:2.2,c:'#555'});y+=4.5;});}
    sheets.push({title:'Harakat modeli',scale:'',body:s});}
  /* YHQ tekshiruvi */
  {let s=head('Yoʻl harakati qoidalari (YHQ) boʻyicha avtomatik tekshiruv');let ck={};try{ck=checkYHQ();}catch(e){}
    const rows=[];try{ckOrder(ck).forEach(q=>{const c=ck[q.id];rows.push([q.t,{ok:'mos',bad:'muammo',auto:'avtomatik',na:'tegishli emas',warn:'diqqat'}[c[0]]||c[0],(c[2]||[]).length?(c[2]||[]).map(x=>x.why).join('; '):(c[1]||'')]);});}catch(e){}
    const t=table(WORK.x,WORK.y+6,[['Qoida',120],['Holat',22],['Izoh',240]],rows.slice(0,40),{col:(i,j,v)=>j===1&&v==='muammo'?'#b2342a':j===1&&v==='mos'?'#2b7449':null,rh:5});s+=rows.length?t.svg:T(WORK.x,WORK.y+10,'Tekshiruv natijasi yoʻq.',{s:2.6});
    s+=T(WORK.x,WORK.y+WORK.h+STH-4,'Qoida mazmuni YHQ ilovalari asosida umumlashtirilgan; band raqamlarini tasdiqlang.',{s:2.2,c:'#555'});
    sheets.push({title:'YHQ tekshiruvi',scale:'',body:s});}
  /* titul va mundarija (oldiga) */
  const total=sheets.length+1;
  {let s=T(PW/2,70,projName(),{s:11,w:700,a:'middle'})+T(PW/2,84,'Koʻcha va chorrahalar loyihasi · Konsepsiya',{s:5,a:'middle',c:'#444'})+T(PW/2,94,(ds.place||'Toshkent shahri'),{s:4,a:'middle',c:'#444'});
    s+=T(FR.x+40,118,'Mundarija',{s:4,w:700});[['1','Titul. Mundarija'],...sheets.map((x,i)=>[String(i+2),x.title+(x.scale&&x.scale!=='koʻrsatilgan'?' · '+x.scale:'')])].forEach(([n,t],i)=>{s+=T(FR.x+40,127+i*6,n,{s:3})+T(FR.x+52,127+i*6,t,{s:3});});
    s+=T(FR.x+40,PH-60,'Archemistry Lab · Koʻchasoz · '+new Date().getFullYear(),{s:3,c:'#555'});
    sheets.unshift({title:'Titul',scale:'',body:s});}
  return sheets.map((x,i)=>({title:x.title,svg:frame(i+1,total,x.title,x.scale,x.body)}));}

function albumHTML(){const sh=buildSheets();return `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><title>${esc(projName())} — albom</title>
<style>@page{size:420mm 297mm;margin:0}html,body{margin:0;background:#888}section{width:420mm;height:297mm;margin:0 auto 8mm;background:#fff;page-break-after:always;box-shadow:0 2px 12px rgba(0,0,0,.25)}section svg{display:block;width:420mm;height:297mm}
.bar{position:sticky;top:0;z-index:2;background:#141414;color:#fff;font:600 14px Arial;padding:10px 16px;display:flex;gap:10px;align-items:center}.bar button{font:600 13px Arial;padding:6px 12px;border-radius:8px;border:0;cursor:pointer}
@media print{.bar{display:none}html,body{background:#fff}section{margin:0;box-shadow:none}}</style></head><body>
<div class="bar"><span>${esc(projName())} · ${sh.length} varaq · A3</span><span style="flex:1"></span><button onclick="print()">PDF / Chop etish</button></div>
${sh.map(x=>`<section>${x.svg}</section>`).join('\n')}</body></html>`;}

async function openAlbum(){if(!DS().segs.length){toast('Loyiha boʻsh.');return;}const html=albumHTML(),w=open('','_blank');if(!w){toast('Brauzer yangi oynani bloklad.');return;}w.document.open();w.document.write(html);w.document.close();}
async function albumToChz(){const sh=buildSheets();let n=0;const t=new Date().toISOString();for(const x of sh){const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x.svg);await kpsMatPut({id:'alb'+Date.now().toString(36)+n,kind:'svg',name:x.title,src,thumb:src,aspect:PW/PH,sub:projName(),t});n++;}
  toast(`${n} ta varaq Chizmadonga yuborildi.`,()=>window.open('app/#/chizmadon','_blank'),'Chizmadonni ochish');}
window.KSALB={buildSheets,albumHTML,openAlbum,albumToChz};
})();
