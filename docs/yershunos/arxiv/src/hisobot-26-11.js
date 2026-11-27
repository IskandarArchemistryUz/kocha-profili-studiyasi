// ===== Hisobot: chop etish / PDF uchun A4 sahifalar (tuman · viloyat · respublika) =====
let HBS='v', HBF=null;
const HBC=['#d6e6eb','#9cc7d3','#f2c75c','#ee8a3f','#d33a6c'], HBB=[20,40,60,80];
const hbE=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const hbCl=(v,b)=>{let i=0; while(i<b.length&&v>=b[i]) i++; return i;};
const hbF=(v,d)=>v==null||!isFinite(v)?'—':uzF(v,d);
const hbN=v=>v==null||!isFinite(v)?'—':uzN(v);
const hbQ=n=>{n=n.replace(/ tumani/g,' t.').replace(/ shahri/g,' sh.').replace(/ viloyati/g,' vil.').replace(' Respublikasi',' Resp.'); return n.length>34?n.slice(0,33)+'…':n;};
const hbP=(v,s)=>(v>0&&s!==false?'+':'')+hbF(v,1).replace('-','−');
function hbW(set,g){let s=0,w=0; set.forEach(p=>{const v=g(p); if(v!=null&&isFinite(v)){s+=v*p.r26;w+=p.r26;}}); return w?s/w:null;}
function hbSh(set,f){const t=set.reduce((a,p)=>a+p.r26,0); return t?set.filter(f).reduce((a,p)=>a+p.r26,0)/t*100:0;}
function hbSum(set,g){return set.reduce((a,p)=>a+(g(p)||0),0);}
function hbSana(){const d=new Date(); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();}
function hbPl(u){if(!HBF) HBF=Object.fromEntries(UZ.features.map(f=>[f.properties.n,f])); const g=HBF[u.n].geometry; return g.type==='Polygon'?[g.coordinates]:g.coordinates;}
function hbMarkaz(pl){let best=null,ba=0; pl.forEach(p=>{const r=p[0]; let a=0,cx=0,cy=0; for(let i=0,j=r.length-1;i<r.length;j=i++){const f=r[j][0]*r[i][1]-r[i][0]*r[j][1]; a+=f; cx+=(r[j][0]+r[i][0])*f; cy+=(r[j][1]+r[i][1])*f;} if(Math.abs(a)>ba){ba=Math.abs(a); best=[cx/(3*a),cy/(3*a)];}}); return best;}

// --- xarita: birliklar reyting bo'yicha bo'yalgan, raqamli belgilar bilan ---
function hbXarita(units,hl,lab,W,H){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  units.forEach(u=>hbPl(u).forEach(pl=>pl[0].forEach(([x,y])=>{if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;})));
  const k=Math.cos((y0+y1)/2*Math.PI/180), sw=(x1-x0)*k, sh=y1-y0, s=Math.min((W-20)/sw,(H-20)/sh), ox=(W-sw*s)/2, oy=(H-sh*s)/2;
  const P=([x,y])=>[ox+(x-x0)*k*s, oy+(y1-y)*s], ps=c=>{const q=P(c); return q[0].toFixed(1)+' '+q[1].toFixed(1);};
  const path=u=>hbPl(u).map(pl=>pl.map(r=>'M'+r.map(ps).join('L')+'Z').join('')).join('');
  let o='<svg viewBox="0 0 '+W+' '+H+'" class="hb-svg">';
  units.forEach(u=>{o+='<path d="'+path(u)+'" fill="'+(u.r==null?'#eef1f2':HBC[hbCl(u.r,HBB)])+'" stroke="#fff" stroke-width="'+(units.length>60?.4:.9)+'" fill-rule="evenodd"/>';});
  if(hl){const u=units.find(x=>x.n===hl); if(u) o+='<path d="'+path(u)+'" fill="none" stroke="#10222b" stroke-width="2.4" stroke-linejoin="round"/>';}
  (lab||[]).forEach((u,i)=>{const [x,y]=P(hbMarkaz(hbPl(u))); o+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="8.5" fill="#10222b" stroke="#fff" stroke-width="1.2"/><text x="'+x.toFixed(1)+'" y="'+(y+3.3).toFixed(1)+'" font-size="9.5" font-weight="700" fill="#fff" text-anchor="middle">'+(i+1)+'</text>';});
  return o+'</svg>';}
const hbLeg=()=>'<div class="hb-leg">'+UZM.r.l.map((t,i)=>'<span><i style="background:'+HBC[i]+'"></i>'+t+'</span>').join('')+'</div>';

// --- reyting ustunlari ---
function hbReyting(rows,W){
  const rh=15, H=rows.length*rh+24, L=158, R=92, X=v=>L+v/100*(W-L-R);
  let o='<svg viewBox="0 0 '+W+' '+H+'" class="hb-svg">';
  [0,20,40,60,80,100].forEach(t=>o+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="2" y2="'+(H-16)+'" stroke="#e4eaed"/><text x="'+X(t)+'" y="'+(H-5)+'" font-size="8" fill="#6b7a83" text-anchor="middle">'+t+'</text>');
  o+='<text x="'+(W-2)+'" y="'+(H-5)+'" font-size="7.5" fill="#6b7a83" text-anchor="end">bosim · xavf · zaiflik</text>';
  rows.forEach((p,i)=>{const y=4+i*rh; o+='<text x="'+(L-6)+'" y="'+(y+9.5)+'" font-size="8.6" text-anchor="end" fill="#16222a">'+hbE(hbQ(p.n))+'</text>'+
    '<rect x="'+L+'" y="'+(y+1.5)+'" width="'+Math.max(1,X(p.r)-L).toFixed(1)+'" height="'+(rh-5)+'" rx="2" fill="'+HBC[hbCl(p.r,HBB)]+'"/>'+
    '<text x="'+(X(p.r)+4).toFixed(1)+'" y="'+(y+9.5)+'" font-size="8.6" font-weight="600" fill="#16222a">'+p.r+'</text>'+
    '<text x="'+(W-2)+'" y="'+(y+9.5)+'" font-size="7.8" fill="#55656e" text-anchor="end" font-family="IBM Plex Mono,monospace">'+p.ro+' · '+p.rx+' · '+p.rz+'</text>';});
  return o+'</svg>';}

// --- aholi dinamikasi ---
function hbAholi(q,p50,W,H,y0){
  y0=y0||2010; const y1=p50?2050:2026, L=46,R=14,T=14,B=22, e=q[q.length-1], vals=q.concat(p50?[p50/1000]:[]);
  let mn=Math.min(...vals), mx=Math.max(...vals); const r0=(mx-mn)/4||mx*.05, e10=Math.pow(10,Math.floor(Math.log10(r0))), stp=[1,2,2.5,5,10].map(k=>k*e10).find(k=>k>=r0); mn=Math.max(0,Math.floor(mn/stp)*stp); mx=Math.ceil(mx/stp)*stp; if(mx-mn<stp*3) mx=mn+stp*4;
  const X=y=>L+(y-y0)/(y1-y0)*(W-L-R), Y=v=>T+(1-(v-mn)/(mx-mn))*(H-T-B), st=stp, nt=Math.round((mx-mn)/stp);
  let o='<svg viewBox="0 0 '+W+' '+H+'" class="hb-svg">';
  for(let i=0;i<=nt;i++){const v=mn+st*i; o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="#e4eaed"/><text x="'+(L-5)+'" y="'+(Y(v)+3).toFixed(1)+'" font-size="8" fill="#6b7a83" text-anchor="end">'+(mx>=1000?uzF(v/1000,stp>=1000?0:1)+' mln':uzN(v)+' ming')+'</text>';}
  const yrs=p50?[y0,2015,2020,2026,2035,2050]:[y0,2014,2018,2022,2026]; yrs.filter((y,i,a)=>y>=y0&&a.indexOf(y)===i).forEach(y=>o+='<text x="'+X(y).toFixed(1)+'" y="'+(H-6)+'" font-size="8" fill="#6b7a83" text-anchor="middle">'+y+'</text>');
  const d=q.map((v,i)=>(i?'L':'M')+X(y0+i).toFixed(1)+' '+Y(v).toFixed(1)).join('');
  o+='<path d="'+d+'L'+X(2026).toFixed(1)+' '+(H-B)+'L'+X(y0).toFixed(1)+' '+(H-B)+'Z" fill="#1f8fa3" opacity=".13"/><path d="'+d+'" fill="none" stroke="#1f8fa3" stroke-width="2.2"/>';
  o+='<circle cx="'+X(2026).toFixed(1)+'" cy="'+Y(e).toFixed(1)+'" r="3.2" fill="#1f8fa3"/><text x="'+(X(2026)-5).toFixed(1)+'" y="'+(Y(e)-7).toFixed(1)+'" font-size="8.5" font-weight="600" fill="#16222a" text-anchor="end">'+(e>=1000?uzF(e/1000,2)+' mln':uzN(e)+' ming')+'</text>';
  o+='<text x="'+(X(y0)+3)+'" y="'+(Y(q[0])-7).toFixed(1)+'" font-size="8.5" fill="#16222a">'+(q[0]>=1000?uzF(q[0]/1000,2)+' mln':uzN(q[0])+' ming')+'</text>';
  if(p50){const v=p50/1000; o+='<path d="M'+X(2026).toFixed(1)+' '+Y(e).toFixed(1)+'L'+X(2050).toFixed(1)+' '+Y(v).toFixed(1)+'" fill="none" stroke="#1f8fa3" stroke-width="1.8" stroke-dasharray="4 4"/><circle cx="'+X(2050).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3.2" fill="#fff" stroke="#1f8fa3" stroke-width="1.8"/><text x="'+(X(2050)-5).toFixed(1)+'" y="'+(Y(v)-7).toFixed(1)+'" font-size="8.5" font-weight="600" fill="#16222a" text-anchor="end">'+(v>=1000?uzF(v/1000,2)+' mln':uzN(v)+' ming')+' (model)</text>';}
  return o+'</svg>';}

// --- issiq kunlar: 1995–2014 → 2050 (ikki ssenariy) ---
function hbIssiq(rows,W){
  const rh=14, T=18, H=rows.length*rh+T+18, L=158, R=34, mx=Math.max(...rows.map(r=>r.c))*1.05||1, X=v=>L+v/mx*(W-L-R);
  let o='<svg viewBox="0 0 '+W+' '+H+'" class="hb-svg">';
  o+='<circle cx="'+L+'" cy="7" r="3.5" fill="#9cc7d3"/><text x="'+(L+7)+'" y="10" font-size="8" fill="#55656e">1995–2014</text><circle cx="'+(L+70)+'" cy="7" r="3.5" fill="#ee8a3f"/><text x="'+(L+77)+'" y="10" font-size="8" fill="#55656e">2040–2059, SSP2-4.5</text><rect x="'+(L+172)+'" y="2" width="2" height="10" fill="#d33a6c"/><text x="'+(L+178)+'" y="10" font-size="8" fill="#55656e">SSP5-8.5</text>';
  const tk=mx>120?[0,30,60,90,120]:mx>60?[0,20,40,60,80,100].filter(t=>t<=mx):[0,10,20,30,40,50].filter(t=>t<=mx);
  tk.forEach(t=>o+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+T+'" y2="'+(H-16)+'" stroke="#e4eaed"/><text x="'+X(t).toFixed(1)+'" y="'+(H-5)+'" font-size="8" fill="#6b7a83" text-anchor="middle">'+t+'</text>');
  rows.forEach((r,i)=>{const y=T+i*rh+7; o+='<text x="'+(L-6)+'" y="'+(y+3)+'" font-size="8.6" text-anchor="end" fill="#16222a">'+hbE(hbQ(r.n))+'</text>'+
    '<line x1="'+X(r.a).toFixed(1)+'" x2="'+X(r.b).toFixed(1)+'" y1="'+y+'" y2="'+y+'" stroke="#c9d6dc" stroke-width="3"/>'+
    '<rect x="'+(X(r.c)-1).toFixed(1)+'" y="'+(y-5)+'" width="2" height="10" fill="#d33a6c"/><circle cx="'+X(r.a).toFixed(1)+'" cy="'+y+'" r="3.5" fill="#9cc7d3"/><circle cx="'+X(r.b).toFixed(1)+'" cy="'+y+'" r="3.5" fill="#ee8a3f"/>'+
    '<text x="'+(W-2)+'" y="'+(y+3)+'" font-size="8.2" font-weight="600" fill="#16222a" text-anchor="end" font-family="IBM Plex Mono,monospace">'+Math.round(r.b)+'</text>';});
  return o+'</svg>';}

// --- kommunal ta'minot matritsasi (respublika qiymati — qora chiziq) ---
function hbInfra(rows,ref){
  const c=(v,r,col)=>'<td><div class="hb-bc"><div><i style="width:'+Math.min(100,v||0)+'%;background:'+col+'"></i><b style="left:'+r+'%"></b></div><span>'+hbF(v,0)+'</span></div></td>';
  return '<table class="hb-t hb-inf"><thead><tr><th>Hudud</th><th>Ichimlik suvi, %</th><th>Kanalizatsiya, %</th><th>Tabiiy gaz, %</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+hbE(hbQ(r.n))+'</td>'+c(r.suv,ref.suv,'#1f8fa3')+c(r.kan,ref.kan,'#5aa9bd')+c(r.gaz,ref.gaz,'#9cc7d3')+'</tr>').join('')+'</tbody></table>'+
    '<div class="hb-note">Qora chiziq — respublika o\'rtachasi: ichimlik suvi '+hbF(ref.suv,0)+' %, kanalizatsiya '+hbF(ref.kan,0)+' %, tabiiy gaz '+hbF(ref.gaz,0)+' %. Kvartira (uy)larning ulushi, 2025-yil oxiri.</div>';}

// --- asosiy jadval ---
function hbJadval(rows){
  return '<table class="hb-t"><thead><tr><th>Hudud</th><th>Aholi 2026</th><th>O\'sish 2010–26, %</th><th>Issiq kun 2050</th><th>Suv stressi</th><th>Ichimlik suvi, %</th><th>Zaiflik</th><th>Reyting</th></tr></thead><tbody>'+
    rows.map(p=>'<tr><td>'+hbE(hbQ(p.n))+'</td><td>'+hbN(p.r26)+'</td><td>'+hbP(p.o)+'</td><td>'+hbF(p.c&&p.c.hd35?p.c.hd35[1]:p.h1,0)+'</td><td>'+hbF(p.w?p.w.bws:p.bws,1)+'</td><td>'+hbF(p.j?p.j.suv:p.suv,0)+'</td><td>'+(p.j?(p.j.z==null?'—':p.j.z):hbF(p.zi,0))+'</td><td><span class="hb-r" style="background:'+HBC[hbCl(p.r,HBB)]+'">'+Math.round(p.r)+'</span></td></tr>').join('')+'</tbody></table>';}

// --- yig'ma ko'rsatkichlar (viloyat / respublika) ---
function hbAgg(set,q){
  const a={n:set.length, pop:hbSum(set,p=>p.r26), g:q?uzG(q):null, h0:hbW(set,p=>p.c.hd35[0]), h1:hbW(set,p=>p.c.hd35[1]), h2:hbW(set,p=>p.c.hd35[2]),
    t0:hbW(set,p=>p.c.tr[0]), t1:hbW(set,p=>p.c.tr[1]), s0:hbSh(set,p=>p.c.hd35[0]>=60), s1:hbSh(set,p=>p.c.hd35[1]>=60),
    bws:hbW(set,p=>p.w.bws), ws50:hbW(set,p=>p.w.ws50), jy:hbW(set,p=>p.w.juda_yuqori),
    suv:hbW(set,p=>p.j.suv), kan:hbW(set,p=>p.j.kan), gaz:hbW(set,p=>p.j.gaz), haq_n:hbW(set,p=>p.j.haq_n), zi:hbW(set,p=>p.j.z),
    yangi:hbSum(set,p=>p.e.yangi), olingan:hbSum(set,p=>p.e.olingan), b20:hbSum(set,p=>p.e.b20), r:hbW(set,p=>p.r)};
  a.p50=set.every(p=>p.p50)?hbSum(set,p=>p.p50):null; return a;}

function hbKpi(t){return '<div class="hb-kp">'+t.map(([l,v,s])=>'<div><span>'+l+'</span><b>'+v+'</b><em>'+s+'</em></div>').join('')+'</div>';}
function hbKpiAgg(a){return hbKpi([
  ['Aholi, 2026',(a.pop>=1e6?uzF(a.pop/1e6,2)+' mln':uzN(a.pop)),a.g==null?'':hbP(a.g)+' % (2010–2026)'],
  ['Issiq kunlar, Tmax > 35 °C',hbF(a.h0,0)+' → '+hbF(a.h1,0),'yiliga; 1995–2014 → 2050, SSP2-4.5'],
  ['Suv stressi, 0–5',hbF(a.bws,1)+' → '+hbF(a.ws50,1),'aholining '+hbF(a.jy,0)+' % i juda yuqori stressda'],
  ['Ichimlik suvi',hbF(a.suv,0)+' %','kanalizatsiya '+hbF(a.kan,0)+' %, gaz '+hbF(a.gaz,0)+' %'],
  ['O\'rtacha ish haqi',hbF(a.haq_n,0)+' %','respublika o\'rtachasiga nisbatan, 2025'],
  ['Yangi qurilgan maydon','+'+hbF(a.yangi,0)+' km²','2000–2020; ~'+hbF(a.olingan,0)+' km² ekin yeri hisobiga']]);}

function hbXulosaAgg(set,a,nom,rep){
  const R=hbAgg(UZ.features.map(f=>f.properties),REP), tez=set.filter(p=>p.yy!=null).sort((x,y)=>y.yy-x.yy).slice(0,3),
    pastS=set.filter(p=>p.j.suv!=null).sort((x,y)=>x.j.suv-y.j.suv).slice(0,3), top=set.slice().sort((x,y)=>y.r-x.r).slice(0,3),
    all=UZ.features.map(f=>f.properties), t30=all.slice().sort((x,y)=>y.r-x.r).slice(0,30), k30=set.filter(p=>t30.includes(p)).length,
    omil=p=>{const m=Math.max(p.ro,p.rx,p.rz); return m===p.ro?'tez o\'sish':m===p.rx?'iqlim va suv xavfi':'xizmatlar bilan kam ta\'minlanganlik';};
  const b=[];
  b.push('<b>O\'sish.</b> Aholi 2010–2026 yillarda '+hbP(a.g)+' % o\'zgardi'+(rep?'':' (respublika: '+hbP(R.g)+' %)')+'. Eng tez o\'sayotganlar: '+tez.map(p=>hbE(hbQ(p.n))+' (yiliga '+hbF(p.yy,1)+' %)').join(', ')+'.'+(a.p50?' Model bo\'yicha 2050-yilga '+uzF(a.p50/1e6,2)+' mln kishi.':''));
  b.push('<b>Jazirama.</b> Aholi yashaydigan joylarda yiliga Tmax > 35 °C bo\'lgan kunlar o\'rtacha '+hbF(a.h0,0)+' dan 2040–2059 yillarda '+hbF(a.h1,0)+' ga, keskin ssenariyda '+hbF(a.h2,0)+' ga yetadi. Yiliga 60 kundan ko\'p issiq kun bo\'ladigan hududlarda yashovchilar ulushi '+hbF(a.s0,0)+' % → '+hbF(a.s1,0)+' %.');
  b.push('<b>Suv.</b> Havza bo\'yicha suv stressi '+hbF(a.bws,1)+' / 5 ('+uzSvN(a.bws)+'), 2050-yilda '+hbF(a.ws50,1)+'. Aholining '+hbF(a.jy,0)+' % i olinadigan suv mavjud suvning 80 % idan oshadigan havzada yashaydi.');
  b.push('<b>Xizmatlar.</b> Ichimlik suvi bilan ta\'minlanganlik '+hbF(a.suv,0)+' %, kanalizatsiya '+hbF(a.kan,0)+' %'+(rep?'':' (respublika: '+hbF(UZ.ij.suv,0)+' va '+hbF(UZ.ij.kan,0)+' %)')+'. Ichimlik suvi eng past: '+pastS.map(p=>hbE(hbQ(p.n))+' '+hbF(p.j.suv,0)+' %').join(', ')+'.');
  b.push('<b>Yer.</b> 2000–2020 yillarda qurilgan maydon '+hbF(a.yangi,0)+' km² ga kengaydi; taxminan '+hbF(a.olingan,0)+' km² i ekin yeri hisobiga (faqat tom va qattiq qoplama — pastki baho).');
  b.push('<b>Ustuvorlik.</b> Eng yuqori ball: '+top.map(p=>hbE(hbQ(p.n))+' — '+p.r+' ('+omil(p)+')').join('; ')+'.'+(rep?'':' Respublikaning birinchi 30 taligida bu hududdan '+k30+' ta birlik bor.'));
  if(nom==='Toshkent shahri') b.push('<b>Eslatma.</b> Toshkent shahri ichida suv stressi tumanlar bo\'yicha solishtirilmaydi: havza chegarasi shahar o\'rtasidan o\'tadi, shahar esa yagona tizimdan suv oladi.');
  return '<ul class="hb-xl">'+b.map(x=>'<li>'+x+'</li>').join('')+'</ul>';}

function hbXulosaT(p,vs,all){
  const rk=(k,arr)=>uzRank(p,k,arr), v=p.v, Rv=hbAgg(vs,UZ.vil[v]), R=hbAgg(all,REP);
  const om=[['tez o\'sish',p.ro],['iqlim va suv xavfi',p.rx],['xizmatlar bilan kam ta\'minlanganlik',p.rz]].sort((a,b)=>b[1]-a[1]);
  const b=[];
  b.push('<b>O\'sish.</b> Aholi 2010–2026 yillarda '+hbP(p.o)+' % o\'zgardi (yiliga '+hbF(p.yy,1)+' %)'+(p.ob?', chegara o\'zgargani uchun guruh bo\'yicha: '+hbE(p.ob):'')+'. Sur\'at bo\'yicha viloyatda '+rk('yy',vs)[0]+'/'+vs.length+', respublikada '+rk('yy',all)[0]+'/'+all.length+'-o\'rin.'+(p.p50?' Model bo\'yicha 2050-yilga '+uzN(p.p50)+' kishi.':''));
  b.push('<b>Jazirama.</b> Yiliga Tmax > 35 °C bo\'lgan kunlar '+hbF(p.c.hd35[0],0)+' → '+hbF(p.c.hd35[1],0)+' (2050, SSP2-4.5) → '+hbF(p.c.hd35[2],0)+' (SSP5-8.5); tropik tunlar '+hbF(p.c.tr[0],0)+' → '+hbF(p.c.tr[1],0)+'. Viloyat o\'rtachasi 2050-yilda '+hbF(Rv.h1,0)+' kun.'+(p.c.tas[0]<11?' Tog\'li hudud: tuman markazidagi haqiqiy jazirama yuqoriroq bo\'lishi mumkin.':''));
  b.push('<b>Suv.</b> Havza bo\'yicha suv stressi '+hbF(p.w.bws,1)+' / 5 ('+uzSvN(p.w.bws)+'), 2050-yilda '+hbF(p.w.ws50,1)+'. Qurg\'oqchillik xavfi '+hbF(p.w.drr,1)+' / 5.');
  b.push('<b>Xizmatlar.</b> Ichimlik suvi '+hbF(p.j.suv,0)+' %, kanalizatsiya '+hbF(p.j.kan,0)+' %, tabiiy gaz '+hbF(p.j.gaz,0)+' % (respublika: '+hbF(UZ.ij.suv,0)+', '+hbF(UZ.ij.kan,0)+', '+hbF(UZ.ij.gaz,0)+' %). O\'rtacha ish haqi respublikaning '+hbF(p.j.haq_n,0)+' %. Aholining '+hbF(p.j.bol,0)+' % i 0–15 yoshda.');
  b.push('<b>Yer.</b> Qurilgan maydon '+hbF(p.e.b00,1)+' → '+hbF(p.e.b20,1)+' km² (2000 → 2020)'+(p.e.olingan!=null?', yangi qurilishning taxminan '+hbF(p.e.olingan,1)+' km² i ekin yeri hisobiga':'')+'. Kishi boshiga qurilgan yer '+hbN(p.e.qur_kishi)+' m².');
  b.push('<b>Ustuvorlik.</b> Reyting '+p.r+' / 100: viloyatda '+rk('r',vs)[0]+'/'+vs.length+', respublikada '+rk('r',all)[0]+'/'+all.length+'-o\'rin. Ballni eng ko\'p ko\'targan omil — '+om[0][0]+' ('+om[0][1]+'), eng past — '+om[2][0]+' ('+om[2][1]+').');
  return '<ul class="hb-xl">'+b.map(x=>'<li>'+x+'</li>').join('')+'</ul>';}

// --- tuman: solishtirma jadval ---
function hbSol(p,vs,all){
  const Rv=hbAgg(vs,UZ.vil[p.v]), R=hbAgg(all,REP), rk=(k,arr)=>{const r=uzRank(p,k,arr); return r[0]+'/'+r[1];};
  const t=[['Aholi 2026',hbN(p.r26),hbN(Rv.pop),hbN(R.pop),'—'],
    ['O\'sish sur\'ati, yiliga %',hbF(p.yy,2),'','',rk('yy',vs)+' · '+rk('yy',all)],
    ['Zichlik, kishi/km²',hbN(p.z),hbN(Rv.pop/hbSum(vs,x=>+x.km)),hbN(R.pop/hbSum(all,x=>+x.km)),rk('z',vs)+' · '+rk('z',all)],
    ['Issiq kunlar, 2050',hbF(p.c.hd35[1],0),hbF(Rv.h1,0),hbF(R.h1,0),rk('h',vs)+' · '+rk('h',all)],
    ['Tropik tunlar, 2050',hbF(p.c.tr[1],0),hbF(Rv.t1,0),hbF(R.t1,0),''],
    ['Suv stressi, 0–5',hbF(p.w.bws,1),hbF(Rv.bws,1),hbF(R.bws,1),rk('sv',vs)+' · '+rk('sv',all)],
    ['Ichimlik suvi, %',hbF(p.j.suv,0),hbF(Rv.suv,0),hbF(UZ.ij.suv,0),''],
    ['Kanalizatsiya, %',hbF(p.j.kan,0),hbF(Rv.kan,0),hbF(UZ.ij.kan,0),''],
    ['Ish haqi, respublikaga %',hbF(p.j.haq_n,0),hbF(Rv.haq_n,0),'100',''],
    ['Zaiflik indeksi',p.j.z==null?'—':String(p.j.z),hbF(Rv.zi,0),hbF(R.zi,0),rk('zi',vs)+' · '+rk('zi',all)],
    ['Ustuvorlik reytingi',String(p.r),hbF(Rv.r,0),hbF(R.r,0),rk('r',vs)+' · '+rk('r',all)]];
  return '<table class="hb-t"><thead><tr><th>Ko\'rsatkich</th><th>'+hbE(hbQ(p.n))+'</th><th>Viloyat</th><th>Respublika</th><th>O\'rni: viloyat · resp.</th></tr></thead><tbody>'+
    t.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i===1?' class="hb-b"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table><div class="hb-note">Viloyat va respublika qiymatlari — aholi bo\'yicha tortilgan o\'rtacha. "O\'rni" — kattadan kichikka.</div>';}

function hbOmil(p){
  const r=[['Bosim: aholi o\'sishi','ro','#1f8fa3'],['Xavf: issiq, qurg\'oqchillik, suv','rx','#ee8a3f'],['Zaiflik: xizmatlar va daromad','rz','#d33a6c']];
  return '<div class="hb-om">'+r.map(([n,k,c])=>'<div><span>'+n+'</span><div class="hb-bc"><div><i style="width:'+p[k]+'%;background:'+c+'"></i></div><span>'+p[k]+'</span></div></div>').join('')+'</div>';}

function hbIqlimT(p){
  const g=[['Issiq kunlar (Tmax > 35 °C)','hd35'],['Tropik tunlar (Tmin > 20 °C)','tr'],['O\'ta issiq kunlar (Tmax > 40 °C)','hd40']], mx=Math.max(...g.map(([,k])=>Math.max(...p.c[k])))||1;
  const W=520, rh=12, H=g.length*(3*rh+14)+6; let o='<svg viewBox="0 0 '+W+' '+H+'" class="hb-svg">', y=4, C=['#9cc7d3','#ee8a3f','#d33a6c'], N=['1995–2014','2050 · SSP2-4.5','2050 · SSP5-8.5'];
  g.forEach(([n,k])=>{o+='<text x="0" y="'+(y+8)+'" font-size="8.8" font-weight="600" fill="#16222a">'+n+'</text>'; y+=12;
    p.c[k].forEach((v,i)=>{const w=v/mx*(W-210); o+='<text x="106" y="'+(y+8)+'" font-size="8" fill="#55656e" text-anchor="end">'+N[i]+'</text><rect x="112" y="'+y+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(rh-3)+'" rx="2" fill="'+C[i]+'"/><text x="'+(116+w).toFixed(1)+'" y="'+(y+8)+'" font-size="8.4" font-weight="600" fill="#16222a" font-family="IBM Plex Mono,monospace">'+Math.round(v)+'</text>'; y+=rh;}); y+=4;});
  return o+'</svg>';}

const hbMetod=()=>'<h2>Metodika va manbalar</h2><div class="hb-2c">'+
  '<p><b>Hududiy birliklar.</b> 197 birlik: tuman va shaharlar; chegarasi o\'zgargan yoki OSM da alohida chegarasi yo\'q birliklar birlashtirilgan (masalan, "Ko\'kdala + Chiroqchi"). Chegaralar: OpenStreetMap.</p>'+
  '<p><b>Aholi.</b> Doimiy aholi soni 2010–2026, O\'zbekiston statistika qo\'mitasi (stat.uz, SIAT 246): 2026-yil aholini ro\'yxatga olish asosida qayta hisoblangan. 2050-yil — GHS-WUP prognozi kalibrlangan nisbat bilan (model, rasmiy prognoz emas).</p>'+
  '<p><b>Iqlim.</b> World Bank Climate Change Knowledge Portal, CMIP6 ansambl medianasi, 0,25°. Bazaviy davr 1995–2014; kelajak 2040–2059, SSP2-4.5 va SSP5-8.5. Har birlik uchun aholi bo\'yicha tortilgan (GHS-POP 2020, 1 km). Tog\'li kataklarda tuman markazidagi jazirama kam ko\'rsatilishi mumkin.</p>'+
  '<p><b>Suv.</b> WRI Aqueduct 4.0 (2023), HydroBASINS 6-daraja havzalari: olinadigan suvning mavjud qayta tiklanadigan suvga nisbati, 0–5 ball; 2050 — "odatdagidek" ssenariy (SSP3 RCP7.0). Havzalararo kanallar va davlatlararo suv taqsimoti to\'liq aks etmaydi.</p>'+
  '<p><b>Yer.</b> GHS-BUILT-S (1980, 2000, 2020) qurilgan maydon; ESA WorldCover 2021 ekin yeri. Faqat tom va qattiq qoplama: hovli va tomorqa bilan haqiqiy yer ajratish kattaroq.</p>'+
  '<p><b>Zaiflik.</b> stat.uz (SIAT), 2025: ichimlik suvi (2631), kanalizatsiya (1242), tabiiy gaz (1243), o\'rtacha ish haqi (500), ishsizlik (1875), yosh tarkibi (561, 2838, 589, 600, 1190, 1191), shifokorlar (2846). Indeks — olti tarkibning birliklar ichidagi o\'rni, teng vazn. Ish haqi faqat rasmiy sektor; kambag\'allik tuman kesimida e\'lon qilinmagan.</p>'+
  '<p><b>Ustuvorlik reytingi.</b> R = bosim<sup>0,5</sup> × xavf<sup>0,25</sup> × zaiflik<sup>0,25</sup>, 0–100. Bosim — aholining yillik o\'sish sur\'ati; xavf — issiq kunlar, qurg\'oqchillik (SPEI-12) va suv stressi o\'rtachasi; zaiflik — yuqoridagi indeks. Har biri 197 birlik ichidagi o\'rni (foiz-rang). Ssenariy: '+UZSN[uzSc]+'.</p>'+
  '<p><b>Cheklovlar.</b> Bu dastlabki baho (skrining): muhandislik izlanishlari, gidrologik va seysmik tadqiqotlar o\'rnini bosmaydi. Toshqin va seysmik xavf respublika reytingiga hali kirmagan. Ballar nisbiy: hudud boshqalarga nisbatan qayerda turganini ko\'rsatadi, mutlaq xavf darajasini emas.</p>'+
  '</div><div class="hb-src">Manbalar: stat.uz (SIAT) · World Bank CCKP · WRI Aqueduct 4.0 · European Commission JRC, GHSL · ESA WorldCover 2021 · © OpenStreetMap hissadorlari. Hisob-kitob: Archemistry Lab, Yershunos.</div>';

function hbBosh(nom,sub){return '<div class="hb-h"><div class="hb-brand"><span class="hb-logo" data-lab-logo>A</span><b>Archemistry Lab</b><i>Yershunos</i></div><div class="hb-meta">'+hbSana()+'<br>Dastlabki baho (skrining)</div></div><h1>'+hbE(nom)+'</h1><div class="hb-sub">'+sub+'</div>';}

function hbQur(){
  const all=UZ.features.map(f=>f.properties), sel=uzSel?all.find(p=>p.n===uzSel):null, vil=sel?sel.v:uzV;
  if(HBS==='t'&&!sel) HBS=vil?'v':'r'; if(HBS==='v'&&!vil) HBS='r';
  document.querySelectorAll('#hbs button').forEach(b=>{b.disabled=b.dataset.s==='t'?!sel:b.dataset.s==='v'?!vil:false; b.classList.toggle('on',b.dataset.s===HBS);});
  const pg=[];
  if(HBS==='t'){
    const p=sel, vs=all.filter(x=>x.v===p.v), q=p.oz&&p.oz.s?p.oz.s:p.s, y0=p.oz&&p.oz.s?p.oz.y0:2010;
    pg.push(hbBosh(p.n,hbE(p.v)+' · shahar o\'sishi, iqlim xavfi va aholi zaifligi')+
      hbKpi([['Aholi, 2026',hbN(p.r26),hbP(p.o)+' % (2010–2026)'],['Issiq kunlar, Tmax > 35 °C',hbF(p.c.hd35[0],0)+' → '+hbF(p.c.hd35[1],0),'yiliga; 1995–2014 → 2050'],['Suv stressi, 0–5',hbF(p.w.bws,1)+' → '+hbF(p.w.ws50,1),uzSvN(p.w.bws)],
        ['Ichimlik suvi',hbF(p.j.suv,0)+' %','kanalizatsiya '+hbF(p.j.kan,0)+' %'],['Zaiflik indeksi',p.j.z==null?'—':p.j.z+' / 100','respublikada '+uzRank(p,'zi',all)[0]+'/'+all.length],['Ustuvorlik reytingi',p.r+' / 100','respublikada '+uzRank(p,'r',all)[0]+'/'+all.length]])+
      '<div class="hb-row"><div class="hb-c6"><h2>'+hbE(p.v)+': tumanning o\'rni</h2>'+hbXarita(vs,p.n,null,420,330)+hbLeg()+'</div><div class="hb-c4"><h2>Bosim, xavf, zaiflik</h2>'+hbOmil(p)+'<div class="hb-note">Har omil — 197 birlik ichidagi o\'rni, 0–100.</div></div></div>'+
      '<h2>Asosiy xulosalar</h2>'+hbXulosaT(p,vs,all));
    pg.push('<h2>Aholi soni, '+y0+'–2026'+(p.p50?' va 2050 prognozi':'')+'</h2>'+hbAholi(q,p.p50,520,190,y0)+'<div class="hb-note">Rasmiy doimiy aholi (stat.uz), yil boshiga. Uzuq chiziq — model prognozi.</div>'+
      '<h2>Viloyat va respublika bilan solishtirish</h2>'+hbSol(p,vs,all)+'<h2>Iqlim: hozir va 2050</h2>'+hbIqlimT(p)+
      '<div class="hb-note">5 kunlik eng ko\'p yog\'in: '+(p.c.rx5day[1]>=p.c.rx5day[0]?'+':'')+hbF((p.c.rx5day[1]/p.c.rx5day[0]-1)*100,0)+' % (SSP2-4.5), '+(p.c.rx5day[2]>=p.c.rx5day[0]?'+':'')+hbF((p.c.rx5day[2]/p.c.rx5day[0]-1)*100,0)+' % (SSP5-8.5). O\'rtacha harorat +'+hbF(p.c.tas[1]-p.c.tas[0],1)+' / +'+hbF(p.c.tas[2]-p.c.tas[0],1)+' °C.</div>');
    pg.push(hbMetod());
  } else {
    const rep=HBS==='r', nom=rep?'O\'zbekiston Respublikasi':vil, set=rep?all:all.filter(p=>p.v===vil), q=rep?REP:UZ.vil[vil], a=hbAgg(set,q);
    const srt=set.slice().sort((x,y)=>y.r-x.r), top5=srt.slice(0,5);
    pg.push(hbBosh(nom,(rep?'197 tuman va shahar':set.length+' tuman va shahar')+' kesimida: shahar o\'sishi, iqlim xavfi va aholi zaifligi')+hbKpiAgg(a)+
      '<div class="hb-row"><div class="hb-c6"><h2>Ustuvorlik reytingi</h2>'+hbXarita(set,null,top5,420,rep?300:305)+hbLeg()+'</div><div class="hb-c4"><h2>Eng yuqori ball</h2><ol class="hb-top">'+top5.map(p=>'<li><b>'+hbE(hbQ(p.n))+'</b>'+(rep?'<em>'+hbE(p.v.replace(' viloyati',''))+'</em>':'')+'<span>'+p.r+'</span></li>').join('')+'</ol><div class="hb-note">Ball — bosim, xavf va zaiflikning ko\'paytmasi; yuqori ball uchala omil ham yuqori bo\'lishini talab qiladi.</div></div></div>'+
      '<h2>Asosiy xulosalar</h2>'+hbXulosaAgg(set,a,nom,rep));
    if(rep){
      const vl=[...new Set(all.map(p=>p.v))], vr=vl.map(v=>{const s=all.filter(p=>p.v===v), g=hbAgg(s,UZ.vil[v]); return {n:v,r26:g.pop,o:g.g,h1:g.h1,bws:g.bws,suv:g.suv,kan:g.kan,gaz:g.gaz,zi:g.zi,r:g.r,a:g.h0,b:g.h1,c:g.h2};}).sort((x,y)=>y.r-x.r);
      pg.push('<h2>Birinchi 25 birlik: reyting va uning tarkibi</h2>'+hbReyting(srt.slice(0,25),520)+'<h2>Aholi soni, 2010–2026'+(a.p50?' va 2050 prognozi':'')+'</h2>'+hbAholi(q,a.p50,520,170));
      pg.push('<h2>Viloyatlar: yig\'ma ko\'rsatkichlar</h2>'+hbJadval(vr)+'<div class="hb-note">Aholi bo\'yicha tortilgan o\'rtacha; reyting — viloyat tumanlari ballining o\'rtachasi.</div><h2>Jazirama: issiq kunlar soni, viloyatlar</h2>'+hbIssiq(vr.slice().sort((x,y)=>y.b-x.b),520));
      pg.push('<h2>Kommunal xizmatlar bilan ta\'minlanganlik, viloyatlar</h2>'+hbInfra(vr.slice().sort((x,y)=>x.suv-y.suv),UZ.ij));
      for(let i=0;i<srt.length;i+=35) pg.push('<h2>Barcha birliklar'+(i?' (davomi)':'')+'</h2>'+hbJadval(srt.slice(i,i+35)));
    } else {
      pg.push('<h2>Ustuvorlik reytingi va uning tarkibi</h2>'+hbReyting(srt,520)+'<h2>Aholi soni, 2010–2026'+(a.p50?' va 2050 prognozi':'')+'</h2>'+hbAholi(q,a.p50,520,170)+'<div class="hb-note">Rasmiy doimiy aholi (stat.uz), yil boshiga. Uzuq chiziq — model prognozi.</div>');
      const hI='<h2>Jazirama: yiliga issiq kunlar soni</h2>'+hbIssiq(set.map(p=>({n:p.n,a:p.c.hd35[0],b:p.c.hd35[1],c:p.c.hd35[2]})).sort((x,y)=>y.b-x.b),520), hK='<h2>Kommunal xizmatlar bilan ta\'minlanganlik</h2>'+hbInfra(set.map(p=>({n:p.n,suv:p.j.suv,kan:p.j.kan,gaz:p.j.gaz})).sort((x,y)=>(x.suv??0)-(y.suv??0)),UZ.ij); if(set.length>15){pg.push(hI); pg.push(hK);} else pg.push(hI+hK);
      pg.push('<h2>Barcha birliklar</h2>'+hbJadval(srt));
    }
    pg.push(hbMetod());
  }
  const nm=HBS==='t'?sel.n:HBS==='v'?vil:'O\'zbekiston';
  document.getElementById('hbd').innerHTML=pg.map((h,i)=>'<section class="pg">'+h+'<div class="hb-ft"><span>Archemistry Lab · Yershunos — '+hbE(nm)+'</span><span>'+(i+1)+' / '+pg.length+'</span></div></section>').join('');
  document.title='Yershunos — '+nm+' — hisobot';}
function uzHisobot(){
  if(!UZ) return; let w=document.getElementById('hb');
  if(!w){w=document.createElement('div'); w.id='hb'; w.hidden=true;
    w.innerHTML='<div class="hb-bar"><b>Hisobot</b><div class="seg sm" id="hbs"><button data-s="t">Tuman</button><button data-s="v">Viloyat</button><button data-s="r">Respublika</button></div><span style="flex:1"></span><button class="play" id="hbp">Chop etish / PDF</button><button class="play" id="hbx" style="background:var(--fill);color:var(--ink)">Yopish</button></div><div id="hbd"></div>';
    document.body.appendChild(w);
    w.querySelectorAll('#hbs button').forEach(b=>b.onclick=()=>{HBS=b.dataset.s; hbQur(); w.scrollTop=0;});
    document.getElementById('hbx').onclick=()=>{w.hidden=true; document.title='Yershunos — Archemistry Lab';};
    document.getElementById('hbp').onclick=()=>{try{window.print();}catch(e){}};}
  HBS=uzSel?'t':uzV?'v':'r'; hbQur(); w.hidden=false; w.scrollTop=0;}
document.getElementById('uzh').onclick=uzHisobot;
