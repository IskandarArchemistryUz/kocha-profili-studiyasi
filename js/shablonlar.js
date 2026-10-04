/* Albom: varaq maketlari (shablonlar). Faqat bo'sh ramkalar va matn joylari — rasm qo'yilmaydi.
   Birliklar: mm. fs — pt. Har bir shablon fn(W,H) element ro'yxatini qaytaradi; id lar maket.html da beriladi. */
window.KPS_TPL=(function(){
'use strict';
const T=[];
const add=(cat,name,fmt,orient,tb,desc,fn)=>T.push({id:'t'+(T.length+1),cat,name,fmt,orient,tb,desc,fn});
const PT=0.3528;
/* yordamchilar */
const I=(x,y,w,h,name)=>({t:'image',x,y,w,h,name,frame:true,fsw:.2,ph:true});
const Tx=(x,y,w,text,fs,o={})=>{const n=String(text).split('\n').length,lh=o.lh||1.3;return {t:'text',x,y,w,h:+(fs*PT*(1+(n-1)*lh)+fs*PT*.35).toFixed(2),text,ff:o.ff||'Archivo',fs,col:o.col||'#141414',b:!!o.b,i:!!o.i,al:o.al||'l',lh,bg:o.bg};};
const M=(x,y,w,text,fs=8,o={})=>Tx(x,y,w,text,fs,Object.assign({ff:'IBM Plex Mono',col:'#3c3c3c'},o));
const R=(x,y,w,h,fill,o={})=>({t:'rect',x,y,w,h,fill:fill||'none',stroke:o.stroke||'none',sw:o.sw||0});
const L=(x1,y1,x2,y2,sw=.3,col='#141414')=>({t:'line',pts:[[x1,y1],[x2,y2]],stroke:col,sw});
const N=(x,y,s=12)=>({t:'icon',g:'north',style:'bare',col:'#141414',fg:'#ffffff',x,y,w:s,h:s});
const LG=(x,y,w,title,labels,fs=8)=>{const C=['#E7A750','#9BC48A','#6E8FB3','#D9D4CB','#C4553F','#8E7CC3','#3c3c3c'];
  return {t:'legend',title,entries:labels.map((l,i)=>({col:C[i%C.length],label:l,kind:i===labels.length-1&&/chiziq/i.test(l)?'line':'fill',on:true})),fs,cols:1,x,y,w,h:0};};
/* jadval: ramka + sarlavha qatori + chiziqlar */
const TB=(x,y,w,h,rows,cols,head=true,hdr)=>{const out=[R(x,y,w,h,'none',{stroke:'#141414',sw:.3})],rh=h/rows,cw=w/cols;
  if(head)out.push(R(x,y,w,rh,'#ECEBE7'));
  for(let r=1;r<rows;r++)out.push(L(x,y+r*rh,x+w,y+r*rh,r===1&&head?.3:.15,r===1&&head?'#141414':'#9a9893'));
  for(let c=1;c<cols;c++)out.push(L(x+c*cw,y,x+c*cw,y+h,.15,'#9a9893'));
  if(hdr)hdr.slice(0,cols).forEach((t,c)=>out.push(M(x+c*cw+1.5,y+rh/2-1.6,cw-3,t,Math.min(7.5,rh*1.6),{col:'#141414',b:true})));
  return out;};
const BODY=(n,w)=>{const s=['Matn joyi: loyiha haqida qisqa tavsif.','Asosiy gʻoya va maqsad.','Raqamlar va manbalar bilan.','Har bir xatboshi — bitta fikr.','Qisqa xulosa yoki keyingi qadam.'];
  return Array.from({length:n},(_,i)=>s[i%s.length]).join('\n');};
const KPI=(x,y,w,h,lab)=>[R(x,y,w,h,'#F4F3F1'),Tx(x+3,y+3,w-6,'00 %',18,{b:true}),M(x+3,y+h-7,w-6,lab,7)];
const footer=(W,H,m,left)=>[L(m,H-m+2,W-m,H-m+2,.2,'#9a9893'),M(m,H-m+3.5,W*.6,left,7,{col:'#696969'}),M(W-m-20,H-m+3.5,20,'| 1',7,{al:'r',col:'#696969'})];
const header=(W,m,text)=>[M(m,m-6,W-2*m,text,7,{col:'#696969'}),L(m,m-1.5,W-m,m-1.5,.2,'#9a9893')];

/* ================= 1. MASTER REJA ALBOMI (A3 albom) ================= */
const MR='Master reja albomi';
add(MR,'Muqova','A3','L',false,'Chapda katta render, oʻngda loyiha nomi',(W,H)=>{const m=18,x=W*.6;return [
  I(0,0,W*.56,H,'Asosiy render yoki aerofoto'),
  M(x,m,W-x-m,'MASTER REJA · 2026',9,{col:'#696969'}),
  Tx(x,H*.32,W-x-m,'Loyiha nomi\nikkinchi qator',34,{b:true,lh:1.1}),
  Tx(x,H*.32+32,W-x-m,'Hudud, tuman, shahar',14,{col:'#3c3c3c'}),
  L(x,H-m-22,W-m,H-m-22,.4),
  M(x,H-m-18,W-x-m,'Buyurtmachi: ______\nIshlab chiquvchi: ______\nToshkent, 2026',8,{lh:1.5})];});
add(MR,'Mundarija','A3','L',true,'Ikki ustunli mundarija va tor rasm tasmasi',(W,H)=>{const m=18,cw=(W*.62-m)/2;const col=(a,b)=>Array.from({length:b-a+1},(_,i)=>String(a+i).padStart(2,'0')+'   Boʻlim nomi').join('\n');return [
  Tx(m,m,W*.5,'Mundarija',30,{b:true}),
  M(m,m+24,cw,col(1,8),10,{lh:2,col:'#141414'}),M(m+cw+10,m+24,cw,col(9,16),10,{lh:2,col:'#141414'}),
  I(W*.68,0,W*.32,H,'Tasma rasm')];});
add(MR,'Boʻlim ajratgichi','A3','L',false,'Katta raqam, boʻlim nomi va yarim varaqli rasm',(W,H)=>{const m=18;return [
  Tx(m,H*.18,W*.4,'01',120,{b:true,lh:1}),
  Tx(m,H*.62,W*.42,'Boʻlim nomi',28,{b:true}),
  M(m,H*.62+16,W*.4,BODY(3),9,{lh:1.6}),
  I(W*.5,0,W*.5,H,'Boʻlim rasmi')];});
add(MR,'Bosh reja + shartli belgilar','A3','L',true,'Katta xarita, oʻngda belgilar, shimol va masshtab',(W,H)=>{const m=12,cx=W*.73;return [
  I(m,m,cx-m-6,H-2*m,'Bosh reja xaritasi'),
  Tx(cx,m,W-cx-m,'Bosh reja',20,{b:true}),
  M(cx,m+11,W-cx-m,'M 1:2000',9),
  LG(cx,m+22,W-cx-m,'Shartli belgilar',['Turar joy','Jamoat binolari','Yashil hudud','Koʻchalar','Qizil chiziq'],8),
  N(cx,H-m-56,12),
  M(cx,H-m-40,W-cx-m,'Izoh:\n— matn joyi',8,{lh:1.5})];});
add(MR,'Tahlil: 4 xarita','A3','L',true,'2×2 xarita, har biri izoh bilan',(W,H)=>{const m=14,g=8,top=m+16,cw=(W-2*m-g)/2,ch=(H-top-m-30-g)/2-9;const out=[Tx(m,m,W*.6,'Hudud tahlili',20,{b:true})];
  [[0,0,'Funksional zonalash'],[1,0,'Transport va piyoda'],[0,1,'Yashil va ochiq joylar'],[1,1,'Qavatlilik']].forEach(([c,r,t])=>{const x=m+c*(cw+g),y=top+r*(ch+g+9);out.push(I(x,y,cw,ch,t),M(x,y+ch+2,cw,t+' — qisqa xulosa',8));});return out;});
add(MR,'TEP jadvali + diagramma','A3','L',true,'Texnik-iqtisodiy koʻrsatkichlar jadvali va grafik',(W,H)=>{const m=16,tw=W*.5;return [
  Tx(m,m,W*.6,'Texnik-iqtisodiy koʻrsatkichlar',20,{b:true}),
  ...TB(m,m+18,tw,120,12,4,true,['Koʻrsatkich','Birlik','Mavjud','Loyiha']),
  M(m,m+142,tw,'Manba: ______',7.5,{col:'#696969'}),
  I(m+tw+12,m+18,W-tw-2*m-12,90,'Diagramma'),
  M(m+tw+12,m+112,W-tw-2*m-12,BODY(3),8.5,{lh:1.6})];});
add(MR,'Bosqichlar (3 bosqich)','A3','L',true,'Uchta teng rasm va bosqich izohlari',(W,H)=>{const m=16,g=8,cw=(W-2*m-2*g)/3,top=m+18,ch=H*.5;const out=[Tx(m,m,W*.6,'Amalga oshirish bosqichlari',20,{b:true})];
  ['1-bosqich · 2027–2029','2-bosqich · 2030–2033','3-bosqich · 2034–2040'].forEach((t,i)=>{const x=m+i*(cw+g);out.push(I(x,top,cw,ch,t),Tx(x,top+ch+4,cw,t,11,{b:true}),M(x,top+ch+12,cw,BODY(3),8,{lh:1.5}));});return out;});

/* ================= 2. APZ (A4 portret, asosiy yozuv bilan) ================= */
const AP='APZ';
const apzHead=(W,m,sub)=>[R(m,m,W-2*m,22,'none',{stroke:'#141414',sw:.4}),Tx(m+4,m+4,W-2*m-8,'ARXITEKTURA-REJALASHTIRISH TOPSHIRIGʻI',11,{b:true}),M(m+4,m+12,W-2*m-8,'№ ______   sana ______   '+sub,8)];
add(AP,'Situatsion reja','A4','P',true,'Sarlavha bloki, situatsion reja va uchastka maʼlumotlari',(W,H)=>{const m=14;return [
  ...apzHead(W,m,'1-varaq'),
  I(m,m+28,W-2*m,120,'Situatsion reja, M 1:2000'),
  Tx(m,m+152,W-2*m,'Uchastka maʼlumotlari',10,{b:true}),
  ...TB(m,m+160,W-2*m,56,7,2,true,['Koʻrsatkich','Qiymat'])];});
add(AP,'Topshiriq shartlari','A4','P',true,'Raqamlangan boʻlimlar: talablar matni',(W,H)=>{const m=14,out=[...apzHead(W,m,'2-varaq')];let y=m+30;
  ['1. Umumiy maʼlumot','2. Shaharsozlik talablari','3. Arxitektura talablari','4. Muhandislik taʼminoti','5. Obodonlashtirish','6. Maxsus shartlar'].forEach(t=>{out.push(Tx(m,y,W-2*m,t,10,{b:true}),M(m+4,y+6,W-2*m-4,BODY(3),8,{lh:1.5}));y+=34;});return out;});
add(AP,'Uchastka rejasi (qizil chiziqlar)','A4','P',true,'Reja, chiziqlar belgilari va cheklovlar jadvali',(W,H)=>{const m=14;return [
  ...apzHead(W,m,'3-varaq'),
  I(m,m+28,W-2*m,130,'Uchastka rejasi, M 1:500'),
  LG(m,m+162,(W-2*m)/2-4,'Belgilar',['Uchastka chegarasi','Qurilish zonasi','Qizil chiziq'],7.5),
  ...TB(m+(W-2*m)/2+4,m+162,(W-2*m)/2-4,40,5,2,true,['Cheklov','Qiymat'])];});

/* ================= 3. PLANSHET ================= */
const PL='Planshet';
add(PL,'A1 albom: render + diagrammalar','A1','L',false,'Sarlavha tasmasi, katta render, matn ustuni, 4 diagramma',(W,H)=>{const m=30,g=14,band=60,cx=W*.68,bot=H*.27;return [
  Tx(m,m,W*.6,'Loyiha nomi',60,{b:true}),M(m,m+30,W*.6,'Hudud · yil · muallif',14),L(m,m+band-6,W-m,m+band-6,.8),
  I(m,m+band,cx-m-g,H-2*m-band-bot-g,'Asosiy render'),
  Tx(cx,m+band,W-cx-m,'Konsepsiya',24,{b:true}),M(cx,m+band+16,W-cx-m,BODY(10),12,{lh:1.6}),
  ...[0,1,2,3].map(i=>{const w=(W-2*m-3*g)/4;return I(m+i*(w+g),H-m-bot,w,bot,(i+1)+'-diagramma');})];});
add(PL,'A0 portret: master reja','A0','P',false,'Sarlavha, katta reja, 3 kesim, matn',(W,H)=>{const m=36,g=16,top=110,ph=H*.5,sh=110,cw=(W-2*m-2*g)/3;return [
  Tx(m,m,W-2*m,'Master reja',90,{b:true}),M(m,m+44,W-2*m,'Hudud · shahar · 2026',18),L(m,top-14,W-m,top-14,1),
  I(m,top,W-2*m,ph,'Bosh reja'),
  ...[0,1,2].map(i=>I(m+i*(cw+g),top+ph+g,cw,sh,(i+1)+'-kesim')),
  Tx(m,top+ph+sh+2*g,W*.3,'Gʻoya',28,{b:true}),M(m,top+ph+sh+2*g+20,W*.42,BODY(8),14,{lh:1.6}),
  I(W*.52,top+ph+sh+2*g,W*.48-m,H-(top+ph+sh+2*g)-m,'Koʻz koʻrinishi')];});
add(PL,'Konkurs plansheti A1 (shifr bilan)','A1','P',false,'3 ustunli toʻr, anonim shifr qutisi',(W,H)=>{const m=26,g=12,cw=(W-2*m-2*g)/3,top=70;const out=[Tx(m,m,W*.7,'Konkurs loyihasi',44,{b:true}),R(W-m-60,m,60,28,'none',{stroke:'#141414',sw:.8}),M(W-m-56,m+4,52,'SHIFR\n______',12,{lh:1.6}),L(m,top-10,W-m,top-10,.8)];
  const rowsH=[(H-top-m-2*g)*.45,(H-top-m-2*g)*.3,(H-top-m-2*g)*.25];let y=top;
  out.push(I(m,y,2*cw+g,rowsH[0],'Asosiy reja'),I(m+2*(cw+g),y,cw,rowsH[0]*.6,'Render'),M(m+2*(cw+g),y+rowsH[0]*.6+6,cw,BODY(6),11,{lh:1.6}));y+=rowsH[0]+g;
  [0,1,2].forEach(i=>out.push(I(m+i*(cw+g),y,cw,rowsH[1],['Kesim A–A','Kesim B–B','Fasad'][i])));y+=rowsH[1]+g;
  [0,1,2].forEach(i=>out.push(I(m+i*(cw+g),y,cw,rowsH[2]-16,(i+1)+'-diagramma'),M(m+i*(cw+g),y+rowsH[2]-12,cw,'Izoh',10)));return out;});

/* ================= 4. PORTFOLIO (A4 albom) ================= */
const PF='Portfolio';
add(PF,'Muqova','A4','L',false,'Katta sarlavha, rasm, ism va yil',(W,H)=>{const m=14;return [
  Tx(W*.45,m+4,W*.55-m,'PORTFOLIO',44,{b:true,al:'r'}),M(W*.45,m+24,W*.55-m,'ARXITEKTURA VA URBANISTIKA',9,{al:'r'}),
  I(m,H*.36,W*.62,H*.64-m,'Muqova rasmi'),
  M(W*.68,H-m-16,W*.32-m,'Ism Familiya\n2026',10,{lh:1.5,col:'#141414'})];});
add(PF,'Loyiha: katta rasm + matn','A4','L',false,'Chapda rasm, oʻngda loyiha maʼlumotlari',(W,H)=>{const m=14,cx=W*.66;return [
  I(0,0,cx-8,H,'Loyiha rasmi'),
  M(cx,m,W-cx-m,'01',9,{col:'#696969'}),Tx(cx,m+8,W-cx-m,'Loyiha nomi',18,{b:true}),
  M(cx,m+22,W-cx-m,'Joy: ______\nYil: ______\nMaydon: ______\nRol: ______',8,{lh:1.6,col:'#141414'}),
  L(cx,m+50,W-m,m+50,.2,'#9a9893'),M(cx,m+54,W-cx-m,BODY(6),8,{lh:1.6})];});
add(PF,'Loyiha: 4 rasm toʻri','A4','L',false,'Sarlavha ustuni va 2×2 rasm',(W,H)=>{const m=14,g=5,lx=W*.26,cw=(W-lx-m-g)/2,ch=(H-2*m-g)/2;return [
  Tx(m,m,lx-m-8,'Loyiha\nnomi',18,{b:true,lh:1.1}),M(m,m+20,lx-m-8,BODY(5),7.5,{lh:1.6}),
  ...[0,1,2,3].map(i=>I(lx+(i%2)*(cw+g),m+Math.floor(i/2)*(ch+g),cw,ch,(i+1)+'-rasm'))];});
add(PF,'Toʻliq rasm (yoyma)','A4','L',false,'Butun varaqli rasm va kichik izoh',(W,H)=>{const m=12;return [I(0,0,W,H,'Toʻliq varaqli rasm'),R(m,H-m-14,70,14,'#ffffff'),M(m+3,H-m-11,64,'Loyiha nomi · 2026',8,{col:'#141414'})];});
add(PF,'Men haqimda','A4','L',false,'Portret, biografiya, koʻnikmalar, aloqa',(W,H)=>{const m=14,cx=W*.38;return [
  I(m,m,cx-m-10,H-2*m,'Portret'),
  Tx(cx,m,W-cx-m,'Ism Familiya',22,{b:true}),M(cx,m+11,W-cx-m,'Arxitektor-urbanist · Toshkent',9),
  M(cx,m+24,W-cx-m-10,BODY(6),8.5,{lh:1.6}),
  Tx(cx,H*.62,(W-cx-m)/2,'Koʻnikmalar',11,{b:true}),M(cx,H*.62+7,(W-cx-m)/2-6,'— ______\n— ______\n— ______',8,{lh:1.6}),
  Tx(cx+(W-cx-m)/2,H*.62,(W-cx-m)/2,'Aloqa',11,{b:true}),M(cx+(W-cx-m)/2,H*.62+7,(W-cx-m)/2,'pochta@____\n+998 __ ___ __ __\nTelegram: @____',8,{lh:1.6})];});

/* ================= 5. XALQARO FOND HISOBOTI (ADB, Jahon banki uslubi; A4 portret) ================= */
const FD='Xalqaro fond hisoboti';
add(FD,'Muqova','A4','P',false,'Rangli tasma, logotip joylari, hisobot turi, loyiha raqami',(W,H)=>{const m=18;return [
  R(0,0,W,78,'#1F3A4D'),
  R(m,m,34,14,'#ffffff'),M(m+2,m+4,30,'Fond logotipi',6.5,{col:'#696969'}),R(W-m-34,m,34,14,'#ffffff'),M(W-m-32,m+4,30,'Hukumat logotipi',6.5,{col:'#696969'}),
  M(m,46,W-2*m,'MASLAHATCHI HISOBOTI · TEXNIK YORDAM',8,{col:'#ffffff'}),
  Tx(m,90,W-2*m,'Hisobot nomi:\nloyiha va hudud',24,{b:true,lh:1.15}),
  M(m,120,W-2*m,'Loyiha raqami: ______\nSana: ______ 2026\nTayyorlagan: ______',8.5,{lh:1.6,col:'#141414'}),
  I(0,150,W,H-150-34,'Muqova rasmi'),
  M(m,H-28,W-2*m,'Ushbu hisobot maslahatchi tomonidan tayyorlangan. Undagi fikrlar fondning\nrasmiy pozitsiyasini aks ettirmasligi mumkin.',6.5,{lh:1.5,col:'#696969'})];});
add(FD,'Mundarija va qisqartmalar','A4','P',false,'Mundarija, qisqartmalar roʻyxati',(W,H)=>{const m=20;const toc=['I. Kirish','II. Mavjud holat','III. Muammolar va imkoniyatlar','IV. Strategiya va tavsiyalar','V. Investitsiya dasturi','VI. Amalga oshirish','Ilovalar'];return [
  ...header(W,m,'Loyiha nomi · Hisobot turi'),
  Tx(m,m+4,W-2*m,'Mundarija',18,{b:true}),
  M(m,m+18,W-2*m-20,toc.join('\n'),9.5,{lh:2.1,col:'#141414'}),M(W-m-20,m+18,20,toc.map((_,i)=>String(1+i*6)).join('\n'),9.5,{lh:2.1,al:'r',col:'#141414'}),
  Tx(m,H*.55,W-2*m,'Qisqartmalar',14,{b:true}),
  M(m,H*.55+12,30,'ABB\nJB\nTIK\nKPI',8,{lh:1.8,b:true,col:'#141414'}),M(m+32,H*.55+12,W-2*m-32,'– toʻliq nomi\n– toʻliq nomi\n– toʻliq nomi\n– toʻliq nomi',8,{lh:1.8}),
  ...footer(W,H,m,'Loyiha nomi')];});
add(FD,'Asosiy xulosa','A4','P',false,'Matn va «asosiy raqamlar» yon paneli',(W,H)=>{const m=20,sx=W*.66,kw=W-sx-m;return [
  ...header(W,m,'Loyiha nomi · Hisobot turi'),
  Tx(m,m+4,sx-m-8,'Asosiy xulosa',18,{b:true}),
  M(m,m+18,sx-m-10,BODY(25),8.5,{lh:1.7,col:'#141414'}),
  Tx(sx,m+4,kw,'Asosiy raqamlar',10,{b:true}),
  ...KPI(sx,m+14,kw,24,'Aholi, ming kishi'),...KPI(sx,m+42,kw,24,'Maydon, ga'),...KPI(sx,m+70,kw,24,'Investitsiya, mln $'),...KPI(sx,m+98,kw,24,'Ish oʻrinlari'),
  ...footer(W,H,m,'Loyiha nomi')];});
add(FD,'Bob boshlanishi + rasm','A4','P',false,'Bob raqami, matn, «1-rasm» va «Manba» qatori',(W,H)=>{const m=20;return [
  ...header(W,m,'Loyiha nomi · Hisobot turi'),
  Tx(m,m+4,W-2*m,'II.',28,{b:true,col:'#1F3A4D'}),Tx(m,m+18,W-2*m,'Bob nomi',18,{b:true}),
  M(m,m+30,W-2*m,BODY(8),8.5,{lh:1.7,col:'#141414'}),
  Tx(m,m+78,W-2*m,'1-rasm: Rasm nomi',9,{b:true}),
  I(m,m+86,W-2*m,100,'Rasm, xarita yoki grafik'),
  M(m,m+188,W-2*m,'Manba: ______',7,{col:'#696969'}),
  M(m,m+198,W-2*m,BODY(6),8.5,{lh:1.7,col:'#141414'}),
  ...footer(W,H,m,'Loyiha nomi')];});
add(FD,'Jadval sahifasi','A4','P',false,'«1-jadval», jadval, izoh va manba',(W,H)=>{const m=20;return [
  ...header(W,m,'Loyiha nomi · Hisobot turi'),
  M(m,m+4,W-2*m,BODY(4),8.5,{lh:1.7,col:'#141414'}),
  Tx(m,m+32,W-2*m,'1-jadval: Jadval nomi',9,{b:true}),
  ...TB(m,m+40,W-2*m,120,12,5,true,['Koʻrsatkich','2020','2025','2030','2040']),
  M(m,m+164,W-2*m,'Izoh: ______\nManba: ______',7,{lh:1.5,col:'#696969'}),
  ...footer(W,H,m,'Loyiha nomi')];});
add(FD,'Xarita sahifasi','A3','L',false,'Xarita, belgilar, shimol, masshtab va chegaralar izohi',(W,H)=>{const m=16,cx=W*.74;return [
  ...header(W,m,'Loyiha nomi · Hisobot turi'),
  Tx(m,m+2,W*.6,'1-xarita: Xarita nomi',12,{b:true}),
  I(m,m+12,cx-m-8,H-2*m-14,'Xarita'),
  LG(cx,m+12,W-cx-m,'Shartli belgilar',['Toifa 1','Toifa 2','Toifa 3','Toifa 4','Chegara chiziq'],8),
  N(cx,H*.56,12),M(cx+16,H*.56+3,W-cx-m-16,'0   500   1000 m',7.5),
  R(cx,H*.66,W-cx-m,H*.34-m-8,'#F4F3F1'),
  M(cx+3,H*.66+3,W-cx-m-6,'Chegaralar, ranglar va nomlar faqat\ntasviriy maqsadda koʻrsatilgan;\nular hech qanday hududning huquqiy\nmaqomi haqida fikr bildirmaydi.\n\nManba: ______',7,{lh:1.5})];});

return T;})();
