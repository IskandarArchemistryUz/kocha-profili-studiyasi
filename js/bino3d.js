/* Archemistry Lab — binolarning 3D modeli (fasad bilan): Bino studiyasi va Master reja vizualizatsiyasi uchun umumiy.
   Bino: {f yoki cs, fl, nr, tiers, sty, fc, roof, slope, rc} (Master reja hujjati). Koordinatalar — setK(markaz) dan metrda: X — sharq, Z — janub, Y — yuqoriga.
   Fasad elementlari — konseptual taqdimot, ishchi chizma emas. */
(function(){
'use strict';
const FH=3.3;
/* ---------- uslublar: rang, tom va fasad toʻplami (Master rejadagi STY bilan bir xil kalitlar) ---------- */
const BASE={ww:1.6,wh:1.6,bay:3.0,sill:.85,arch:0,sh:0,bal:'none',bn:2,bf:2,gf:'door',cor:0,mat:'plaster',frame:'#ffffff'};
const STY={
  zamonaviy:{n:'Zamonaviy',wall:'#f2f0ea',roof:'#9c9a94',rf:'parapet',fc:{ww:2.4,wh:2.2,bay:3.3,sill:.5,bal:'glass',bn:2,gf:'shop',frame:'#2f3336'}},
  sovet:{n:'Sovet modernizmi',wall:'#e2e0da',roof:'#8a8984',rf:'flat',fc:{ww:1.5,wh:1.5,bay:3.0,sill:.9,bal:'loggia',bn:2,gf:'door',mat:'panel',frame:'#f4f4f0'}},
  neoklassik:{n:'Neoklassik',wall:'#efe2c4',roof:'#6f7f86',rf:'mansard',fc:{ww:1.2,wh:2.2,bay:2.7,sill:.6,bal:'french',bn:1,bf:2,gf:'shop',cor:1,mat:'stone',frame:'#ffffff'}},
  milliy:{n:'Milliy (sharqona)',wall:'#e8d3ad',roof:'#2e7f8e',rf:'dome',fc:{ww:1.4,wh:2.0,bay:3.0,sill:.7,arch:1,gf:'ayvon',cor:1,mat:'brick',frame:'#6b4a2e'}},
  yevropa:{n:'Anʼanaviy yevropa',wall:'#efe7da',roof:'#a5533b',rf:'gable',slope:35,fc:{ww:1.1,wh:1.7,bay:2.6,sill:.8,sh:1,bal:'open',bn:3,gf:'door',cor:1,frame:'#ffffff'}},
  skandinav:{n:'Skandinav',wall:'#d8d0c2',roof:'#3a3a3a',rf:'gable',slope:42,fc:{ww:1.0,wh:1.5,bay:2.4,sill:.8,gf:'door',mat:'timber',frame:'#ffffff'}},
  paxsa:{n:'Paxsa / guvala (Xorazm, Buxoro)',wall:'#d6bf94',roof:'#b9a27a',rf:'flat',fc:{ww:.8,wh:1.0,bay:3.2,sill:1.1,gf:'door',frame:'#6b4a2e'}},
  ayvon:{n:'Ayvonli hovli (Fargʻona)',wall:'#efe6d2',roof:'#8a6a4a',rf:'hip',slope:18,fc:{ww:1.2,wh:1.6,bay:3.0,sill:.8,gf:'ayvon',frame:'#6b4a2e'}},
  ortayer:{n:'Oʻrta yer dengizi',wall:'#f6f3ec',roof:'#b5583a',rf:'hip',slope:22,fc:{ww:1.0,wh:1.6,bay:2.6,sill:.8,sh:1,bal:'open',bn:2,gf:'door',frame:'#2f5d4f'}},
  machiya:{n:'Machiya (Kioto)',wall:'#e8e0d0',roof:'#4b4b4b',rf:'gable',slope:25,fc:{ww:1.6,wh:1.4,bay:2.0,sill:.8,gf:'shop',mat:'timber',frame:'#3a2a1e'}},
  qishloq:{n:'Kirpich mahalla uyi',wall:'#c9876a',roof:'#7a7f86',rf:'gable',slope:20,fc:{ww:1.2,wh:1.4,bay:3.0,sill:.9,gf:'door',mat:'brick',frame:'#ffffff'}}};
const ROOF={flat:'Tekis',parapet:'Parapet',gable:'Ikki nishabli',hip:'Toʻrt nishabli',mansard:'Mansard',dome:'Gumbaz'};
const BAL={none:'Yoʻq',open:'Ochiq',glass:'Shisha',loggia:'Lodjiya',french:'Fransuz'};
const GF={plain:'Oddiy',door:'Kirish',shop:'Vitrina',ayvon:'Ayvon'};
const MAT={plaster:'Suvoq',brick:'Gʻisht',panel:'Panel',stone:'Tosh',timber:'Yogʻoch'};
const fcOf=x=>Object.assign({},BASE,(STY[x.sty]||{}).fc||{},x.fc||{});
const roofOf=x=>{const st=STY[x.sty]||{};return {rf:x.roof||st.rf||'flat',slope:x.slope||st.slope||30,rc:x.rc||st.roof||'#8f8d88',wall:(x.fc&&x.fc.wall)||st.wall||'#f2f0ea'};};
function mass(x){const fl=x.fl,base=x.f||turf.polygon(x.cs),nr=Math.max(0,Math.min(fl,x.nr||0));
  const TT=(x.tiers||[]).filter(t=>t.from>1&&t.from<=fl&&(t.in>0||t.cs)).sort((a,b)=>a.from-b.from);
  const cuts=[0,...TT.map(t=>t.from-1),fl].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
  if(nr>0&&nr<fl&&!cuts.includes(nr)){cuts.push(nr);cuts.sort((a,b)=>a-b);}
  const seg=[];let gfa=0,res=0;
  for(let i=0;i<cuts.length-1;i++){const f0=cuts[i],f1=cuts[i+1];if(f1<=f0)continue;const t=TT.filter(t=>t.from-1<=f0).pop();let poly=base;
    if(t&&t.cs){try{poly=turf.polygon(t.cs);}catch(_){}}
    else if(t){try{const q=turf.buffer(base,-t.in,{units:'meters'});if(q&&q.geometry&&turf.area(q)>20)poly=q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]);}catch(_){}}
    const a=turf.area(poly),n=f1-f0;gfa+=a*n;const isNr=f1<=nr;if(!isNr)res+=a*n;seg.push({f0,f1,poly,nr:isNr,a});}
  return {seg,gfa,res};}
function sunDir(lat,lng,mon,hr){const rad=Math.PI/180,dt=Date.UTC(2026,mon,21,0,0)+((hr-5)*3600e3),d=(dt-Date.UTC(2000,0,1,12))/864e5;
  const g=(357.529+.98560028*d)*rad,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*rad,e=(23.439-.00000036*d)*rad;
  const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L)),gmst=((18.697374558+24.06570982441908*d)%24+24)%24,H=(gmst*15+lng)*rad-ra;
  const alt=Math.asin(Math.sin(lat*rad)*Math.sin(dec)+Math.cos(lat*rad)*Math.cos(dec)*Math.cos(H)),az=Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(lat*rad)-Math.sin(lat*rad)*Math.cos(H));
  return {alt,az,v:new THREE.Vector3(Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt))};}
function tex(kind,wall){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=wall;x.fillRect(0,0,256,256);
  const dk='rgba(0,0,0,.16)',lt='rgba(255,255,255,.18)';
  if(kind==='brick'){x.fillStyle=dk;for(let r=0;r<16;r++){x.fillRect(0,r*16,256,2);for(let k=0;k<5;k++)x.fillRect(((k*64+(r%2)*32)%256),r*16,2,16);}for(let i=0;i<180;i++){x.fillStyle=Math.random()<.5?dk:lt;x.globalAlpha=.25;x.fillRect(Math.random()*256,Math.random()*256,22,8);}x.globalAlpha=1;}
  else if(kind==='panel'){x.fillStyle=dk;x.fillRect(0,0,256,3);x.fillRect(0,0,3,256);}
  else if(kind==='stone'){x.fillStyle=dk;for(let r=0;r<4;r++)x.fillRect(0,r*64,256,3);x.fillRect(0,0,2,64);x.fillRect(128,64,2,64);}
  else if(kind==='timber'){x.fillStyle=dk;for(let k=0;k<8;k++)x.fillRect(k*32,0,2,256);}
  else return null;
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;
  const rep={brick:1/2.4,panel:1/3.3,stone:1/3.3,timber:1/2.4}[kind];t.repeat.set(rep,rep);t.anisotropy=4;return t;}
const LC=c=>new THREE.Color(c).convertSRGBToLinear();
function M(mode,col,o){const p=Object.assign({color:LC(col)},o||{});
  if(mode==='render')return new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},p));
  delete p.roughness;delete p.metalness;return new THREE.MeshLambertMaterial(p);}
/* geometriya yordamchilari */
let K=null;   // lng/lat → metr (sahna markazi atrofida)
const setK=c=>{K={c,kx:111320*Math.cos(c[1]*Math.PI/180),ky:110540};return K;};
const toL=p=>[(p[0]-K.c[0])*K.kx,(p[1]-K.c[1])*K.ky];
const sArea=r=>{let a=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
function ringsL(poly){const cs=poly.geometry.coordinates;return cs.map((r,i)=>{let q=r.slice(0,-1).map(toL);const a=sArea(q);if((i===0&&a<0)||(i>0&&a>0))q=q.reverse();return q;});}
function shapeOf(rings){const s=new THREE.Shape(rings[0].map(p=>new THREE.Vector2(p[0],p[1])));rings.slice(1).forEach(h=>s.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],p[1])))));return s;}
function extr(rings,h,y0,mat,cast){const g=new THREE.ExtrudeGeometry(shapeOf(rings),{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y0;m.castShadow=cast!==false;m.receiveShadow=true;return m;}
function offsetRings(poly,d){try{const q=turf.buffer(poly,d,{units:'meters',steps:2});if(!q)return null;const p=q.geometry.type==='Polygon'?q:turf.polygon(q.geometry.coordinates[0]);return ringsL(p);}catch(_){return null;}}
function edges(mesh,col){const e=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,25),new THREE.LineBasicMaterial({color:col||0x3c3c3c,transparent:true,opacity:.55}));e.position.copy(mesh.position);e.rotation.copy(mesh.rotation);return e;}
/* instanslar: bir xil element koʻp marta (deraza, rom, balkon) */
function IB(){const S={};const q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),m4=new THREE.Matrix4(),sc=new THREE.Vector3();
  return {add(key,geo,mat,arr){if(!S[key])S[key]={geo,mat,arr:[]};return S[key];},
    put(key,px,py,nx,ny,lx,ly,lz,sx,sy,sz){const th=Math.atan2(nx,-ny);q.setFromAxisAngle(Y,th);v.set(lx,ly,lz).applyQuaternion(q);v.x+=px;v.z+=-py;sc.set(sx,sy,sz);m4.compose(v,q,sc);S[key].arr.push(m4.clone());},
    flush(root,cast){Object.values(S).forEach(s=>{if(!s.arr.length)return;const im=new THREE.InstancedMesh(s.geo,s.mat,s.arr.length);s.arr.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=cast!==false&&!s.mat.transparent;im.receiveShadow=true;root.add(im);});}};}
function building(bt,x){const F=fcOf(x),RF=roofOf(x),m=mass(x),REN=bt.mode==='render';
  const mm=(k,f)=>bt.mats[k]||(bt.mats[k]=f());
  const MW=REN?mm('w'+F.mat+RF.wall,()=>{const t=tex(F.mat,RF.wall);return M(bt.mode,t?'#ffffff':RF.wall,t?{map:t}:{});}):mm('w',()=>M(bt.mode,'#f3f1ec'));
  const MP=mm('p',()=>M(bt.mode,REN?'#8c877d':'#dcd9d2')),MR=mm('r'+RF.rc,()=>M(bt.mode,REN?RF.rc:'#e6e3dc',{side:THREE.DoubleSide})),MC=mm('c'+RF.wall,()=>M(bt.mode,REN?shade(RF.wall,.93):'#ecebe6'));
  const MG=mm('g',()=>REN?new THREE.MeshStandardMaterial({color:0x5f7d92,roughness:.12,metalness:.55}):new THREE.MeshLambertMaterial({color:0xa9bac6}));
  const MF=mm('f'+F.frame,()=>M(bt.mode,REN?F.frame:'#ffffff')),MS=mm('s',()=>M(bt.mode,REN?'#d9d6cf':'#f1efea')),MSH=mm('sh'+F.frame,()=>M(bt.mode,REN?shade(F.frame==='#ffffff'?'#5f7d6a':F.frame,1):'#d7d4cc'));
  const MRAIL=mm('rl',()=>REN?new THREE.MeshStandardMaterial({color:0x2c2f33,roughness:.5,metalness:.4,transparent:true,opacity:.55}):new THREE.MeshLambertMaterial({color:0x8d8a84,transparent:true,opacity:.5}));
  const MBG=mm('bg',()=>REN?new THREE.MeshStandardMaterial({color:0xbfd3df,roughness:.05,metalness:.2,transparent:true,opacity:.35}):new THREE.MeshLambertMaterial({color:0xc9d6de,transparent:true,opacity:.45}));
  const MDOOR=mm('d',()=>M(bt.mode,REN?'#3b2f27':'#b9b4aa'));
  const B=bt.B,G0=bt.geo,ad=(k,geo,mat)=>{const key=k+'|'+mat.uuid;B.add(key,geo,mat);return key;};
  const kG=ad('glass',G0.PL,MG),kA=ad('arch',G0.ARC,MG),kF=ad('frame',G0.BOX,MF),kSh=ad('shut',G0.BOX,MSH),kS=ad('slab',G0.BOX,MS),kR=ad('rail',G0.BOX,MRAIL),kBG=ad('bglass',G0.BOX,MBG),kL=ad('logg',G0.BOX,MC),kD=ad('door',G0.BOX,MDOOR),kC=ad('col',G0.CYL,MF);
  const KEYS={glass:kG,arch:kA,frame:kF,shut:kSh,slab:kS,rail:kR,bglass:kBG,logg:kL,door:kD,col:kC};const put=(k,...a)=>B.put(KEYS[k],...a);
  const ROOT=bt.root;
  let glassA=0,wallA=0,balN=0;
  /* hajm boʻlaklari */
  m.seg.forEach((g,si)=>{const rings=ringsL(g.poly),h=(g.f1-g.f0)*FH,y0=g.f0*FH;
    const mesh=extr(rings,h,y0,MW);ROOT.add(mesh);if(!REN&&bt.edges!==false)ROOT.add(edges(mesh));
    /* poydevor (sokol) va karniz */
    if(g.f0===0){const pr=offsetRings(g.poly,.06);if(pr)ROOT.add(extr(pr,.6,0,MP,false));}
    const top=m.seg[si+1];
    if(F.cor){const cr=offsetRings(g.poly,.32);if(cr)ROOT.add(extr(cr,.38,g.f1*FH-.42,MC));}
    else if(top&&g.nr){const cr=offsetRings(g.poly,.15);if(cr)ROOT.add(extr(cr,.25,g.f1*FH-.25,MC));}
    /* fasad elementlari */
    const longest=(()=>{let bi=0,bl=0;rings[0].forEach((p,i)=>{const q=rings[0][(i+1)%rings[0].length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>bl){bl=L;bi=i;}});return bi;})();
    rings.forEach((ring,ri)=>ring.forEach((A,ei)=>{const Bp=ring[(ei+1)%ring.length],dx=Bp[0]-A[0],dy=Bp[1]-A[1],L=Math.hypot(dx,dy);if(L<1.2)return;
      const ux=dx/L,uy=dy/L,nx=uy,ny=-ux;wallA+=L*h;
      const isMain=ri===0&&ei===longest;
      for(let f=g.f0;f<g.f1;f++){const y=f*FH,gnd=f===0,shopF=f<Math.max(x.nr||0,gnd&&F.gf==='shop'?1:0);
        /* 1-qavat: vitrina */
        if(shopF){const n=Math.max(1,Math.round(L/Math.max(3,F.bay*1.4))),bw=L/n,w=Math.min(bw-.5,6),hh=FH-1.0;if(w<.8)continue;
          for(let k=0;k<n;k++){const s=(k+.5)*bw,px=A[0]+ux*s,py=A[1]+uy*s;put('glass',px,py,nx,ny,0,y+.35+hh/2,.03,w,hh,1);glassA+=w*hh;
            put('frame',px,py,nx,ny,0,y+.35+hh+.05,.05,w+.2,.1,.12);put('frame',px,py,nx,ny,-w/2-.05,y+.35+hh/2,.05,.1,hh,.12);put('frame',px,py,nx,ny,w/2+.05,y+.35+hh/2,.05,.1,hh,.12);}
          if(gnd&&L>4)put('slab',A[0]+ux*L/2,A[1]+uy*L/2,nx,ny,0,FH-.45,.6,L-.6,.12,1.2);
          continue;}
        const n=Math.max(1,Math.floor(L/F.bay));if(L<F.ww+.8)continue;const bw=L/n;
        /* 1-qavat: ayvon (eng uzun tomonda) */
        if(gnd&&F.gf==='ayvon'&&isMain){const cn=Math.max(2,Math.round(L/3)+1);for(let k=0;k<cn;k++){const s=.3+(L-.6)*k/(cn-1);put('col',A[0]+ux*s,A[1]+uy*s,nx,ny,0,FH/2-.15,2.55,.3,FH-.3,.3);}
          put('slab',A[0]+ux*L/2,A[1]+uy*L/2,nx,ny,0,FH-.1,1.4,L,.28,2.95);put('slab',A[0]+ux*L/2,A[1]+uy*L/2,nx,ny,0,.08,1.4,L,.16,2.9);}
        const doors=gnd&&(F.gf==='door'||F.gf==='ayvon')&&ri===0&&L>=8?Math.max(1,Math.round(L/24)):0;
        for(let k=0;k<n;k++){const s=(k+.5)*bw,px=A[0]+ux*s,py=A[1]+uy*s;
          /* kirish eshigi */
          if(doors&&isMain&&doors>0&&(k===Math.floor(n/2)||(doors>1&&n>2&&k%Math.max(2,Math.round(n/doors))===Math.floor(n/doors/2)))){const dw=Math.min(1.8,bw-.4),dh=2.45;
            put('door',px,py,nx,ny,0,dh/2,.04,dw,dh,.08);put('frame',px,py,nx,ny,0,dh+.06,.06,dw+.2,.12,.14);put('slab',px,py,nx,ny,0,2.95,.75,dw+1.2,.14,1.5);continue;}
          const bal=!gnd&&F.bal!=='none'&&f+1>=F.bf&&L>=F.bay*2-.01&&ri===0&&(k%Math.max(1,F.bn)===0);
          let w=Math.min(F.ww,bw-.5),hh=Math.min(F.wh,FH-.6),sill=Math.min(F.sill,FH-hh-.25);
          if(bal&&F.bal!=='loggia'){hh=Math.min(FH-.6,Math.max(hh,2.2));sill=.05;}
          if(w<.4)continue;
          const yc=y+sill+hh/2;
          put('glass',px,py,nx,ny,0,yc,.03,w,hh,1);glassA+=w*hh;
          if(F.arch&&!bal){put('arch',px,py,nx,ny,0,yc+hh/2,.03,w,w,1);glassA+=Math.PI*w*w/8;}
          const ft=.08;put('frame',px,py,nx,ny,0,yc+hh/2+ft/2+(F.arch&&!bal?w/2:0),.05,w+2*ft,ft,.12);put('frame',px,py,nx,ny,0,yc-hh/2-ft/2,.08,w+.24,ft,.2);
          put('frame',px,py,nx,ny,-w/2-ft/2,yc,.05,ft,hh,.12);put('frame',px,py,nx,ny,w/2+ft/2,yc,.05,ft,hh,.12);
          if(w>1.5)put('frame',px,py,nx,ny,0,yc,.05,.06,hh,.08);
          if(F.sh&&!bal){put('shut',px,py,nx,ny,-w/2-w/4-.08,yc,.06,w/2,hh,.05);put('shut',px,py,nx,ny,w/2+w/4+.08,yc,.06,w/2,hh,.05);}
          if(bal){balN++;const bwid=Math.min(bw-.3,w+1.0);
            if(F.bal==='french'){put('slab',px,py,nx,ny,0,y+.06,.2,w+.4,.12,.4);put('rail',px,py,nx,ny,0,y+.55,.38,w+.4,.95,.03);}
            else if(F.bal==='loggia'){put('logg',px,py,nx,ny,0,y+FH/2,.65,bwid,FH-.04,1.3);put('glass',px,py,nx,ny,0,y+1.0+(FH-1.35)/2,1.31,bwid-.3,FH-1.35,1);}
            else{put('slab',px,py,nx,ny,0,y+.08,.7,bwid,.16,1.4);const RK=F.bal==='glass'?'bglass':'rail';
              put(RK,px,py,nx,ny,0,y+.6,1.38,bwid,1.0,.03);put(RK,px,py,nx,ny,-bwid/2,y+.6,.7,.03,1.0,1.4);put(RK,px,py,nx,ny,bwid/2,y+.6,.7,.03,1.0,1.4);}}}}}));
  });
  /* tom */
  const topSeg=m.seg[m.seg.length-1],H0=topSeg.f1*FH;let rH=0;
  if(RF.rf==='parapet'){const inn=offsetRings(topSeg.poly,-.3);const out=ringsL(topSeg.poly);if(inn){const r=[out[0]].concat(inn.slice(0,1).map(q=>q.slice().reverse()));const pm=extr(r,1.0,H0,MC);ROOT.add(pm);if(!REN&&bt.edges!==false)ROOT.add(edges(pm));rH=1;}}
  else if(RF.rf!=='flat'){const g=roofGeo(ringsL(topSeg.poly)[0],RF,H0);if(g){const rm=new THREE.Mesh(g.geo,MR);rm.castShadow=rm.receiveShadow=true;ROOT.add(rm);if(!REN&&bt.edges!==false)ROOT.add(edges(rm,0x555555));rH=g.h;
    if(g.gab){const gm=new THREE.Mesh(g.gab,MW);gm.castShadow=true;ROOT.add(gm);}}}
  return {m,rH,glassA,wallA,balN};}
/* toʻplam: bir sahnadagi barcha binolar uchun umumiy materiallar va instanslar */
function batch(mode,o){return Object.assign({mode,mats:{},B:IB(),root:new THREE.Group(),geo:{BOX:new THREE.BoxGeometry(1,1,1),PL:new THREE.PlaneGeometry(1,1),ARC:new THREE.CircleGeometry(.5,18,0,Math.PI),CYL:new THREE.CylinderGeometry(.5,.5,1,12)}},o||{});}
function finish(bt){bt.B.flush(bt.root);return bt.root;}
function shade(hex,k){const c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString();}
let SKY=null;function skyTex(){if(SKY)return SKY;const c=document.createElement('canvas');c.width=2;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#9fbfd8');g.addColorStop(.6,'#dbe6ec');g.addColorStop(1,'#eef0ee');x.fillStyle=g;x.fillRect(0,0,2,256);SKY=new THREE.CanvasTexture(c);SKY.encoding=THREE.sRGBEncoding;return SKY;}
/* yoʻnaltirilgan chegaralovchi toʻrtburchak: eng uzun tomon boʻylab */
function obb(ring){let bi=0,bl=0;ring.forEach((p,i)=>{const q=ring[(i+1)%ring.length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>bl){bl=L;bi=i;}});
  const p=ring[bi],q=ring[(bi+1)%ring.length],a=Math.atan2(q[1]-p[1],q[0]-p[0]),ca=Math.cos(a),sa=Math.sin(a);
  const loc=ring.map(r=>[r[0]*ca+r[1]*sa,-r[0]*sa+r[1]*ca]),xs=loc.map(r=>r[0]),ys=loc.map(r=>r[1]);
  return {a,x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),w:(u,v)=>[u*ca-v*sa,u*sa+v*ca]};}
/* tom geometriyasi (OBB boʻyicha): ikki nishabli, toʻrt nishabli, mansard, gumbaz */
function roofGeo(ring,RF,H0){const o=obb(ring),ov=RF.rf==='dome'?0:.45,x0=o.x0-ov,x1=o.x1+ov,y0=o.y0-ov,y1=o.y1+ov,W=y1-y0,L=x1-x0,tn=Math.tan(Math.max(5,Math.min(60,RF.slope))*Math.PI/180);
  const P=[],G=[];const W3=(u,v,z)=>{const p=o.w(u,v);return [p[0],z,-p[1]];};
  const tri=(A,a,b,c)=>{A.push(...W3(...a),...W3(...b),...W3(...c));};const quad=(A,a,b,c,d)=>{tri(A,a,b,c);tri(A,a,c,d);};
  const hip=(A,x0,x1,y0,y1,z,t)=>{const w=y1-y0,l=x1-x0,h=Math.min(w,l)/2*t,ym=(y0+y1)/2;
    if(l>=w){const rx0=x0+w/2,rx1=x1-w/2;quad(A,[x0,y0,z],[x1,y0,z],[rx1,ym,z+h],[rx0,ym,z+h]);quad(A,[x1,y1,z],[x0,y1,z],[rx0,ym,z+h],[rx1,ym,z+h]);tri(A,[x1,y0,z],[x1,y1,z],[rx1,ym,z+h]);tri(A,[x0,y1,z],[x0,y0,z],[rx0,ym,z+h]);}
    else{const xm=(x0+x1)/2,ry0=y0+l/2,ry1=y1-l/2;quad(A,[x1,y0,z],[x1,y1,z],[xm,ry1,z+h],[xm,ry0,z+h]);quad(A,[x0,y1,z],[x0,y0,z],[xm,ry0,z+h],[xm,ry1,z+h]);tri(A,[x0,y0,z],[x1,y0,z],[xm,ry0,z+h]);tri(A,[x1,y1,z],[x0,y1,z],[xm,ry1,z+h]);}
    return h;};
  let h=0;
  if(RF.rf==='gable'){h=W/2*tn;const ym=(y0+y1)/2;quad(P,[x0,y0,H0],[x1,y0,H0],[x1,ym,H0+h],[x0,ym,H0+h]);quad(P,[x1,y1,H0],[x0,y1,H0],[x0,ym,H0+h],[x1,ym,H0+h]);
    const gx0=o.x0,gx1=o.x1;tri(G,[gx1,o.y0,H0],[gx1,o.y1,H0],[gx1,ym,H0+(W/2-ov)*tn]);tri(G,[gx0,o.y1,H0],[gx0,o.y0,H0],[gx0,ym,H0+(W/2-ov)*tn]);}
  else if(RF.rf==='hip')h=hip(P,x0,x1,y0,y1,H0,tn);
  else if(RF.rf==='mansard'){const d=1.1,z1=H0+2.7;quad(P,[x0,y0,H0],[x1,y0,H0],[x1-d,y0+d,z1],[x0+d,y0+d,z1]);quad(P,[x1,y0,H0],[x1,y1,H0],[x1-d,y1-d,z1],[x1-d,y0+d,z1]);quad(P,[x1,y1,H0],[x0,y1,H0],[x0+d,y1-d,z1],[x1-d,y1-d,z1]);quad(P,[x0,y1,H0],[x0,y0,H0],[x0+d,y0+d,z1],[x0+d,y1-d,z1]);
    h=2.7+hip(P,x0+d,x1-d,y0+d,y1-d,z1,Math.tan(18*Math.PI/180));}
  else if(RF.rf==='dome'){const r=Math.max(2,Math.min(W*.42,12)),dr=Math.max(.8,r*.3),cu=(o.x0+o.x1)/2,cv=(o.y0+o.y1)/2,cp=o.w(cu,cv);
    const geo=new THREE.Group();const dg=new THREE.CylinderGeometry(r*1.04,r*1.04,dr,32);dg.translate(cp[0],H0+dr/2,-cp[1]);const sg=new THREE.SphereGeometry(r,32,16,0,Math.PI*2,0,Math.PI/2);sg.translate(cp[0],H0+dr,-cp[1]);
    const merged=mergeGeo([dg,sg]);void geo;return {geo:merged,h:dr+r};}
  else return null;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.computeVertexNormals();
  let gab=null;if(G.length){gab=new THREE.BufferGeometry();gab.setAttribute('position',new THREE.Float32BufferAttribute(G,3));gab.computeVertexNormals();}
  return {geo,gab,h};}
function mergeGeo(gs){const P=[],N=[];gs.forEach(g=>{const n=g.index?g.toNonIndexed():g;P.push(...n.attributes.position.array);N.push(...n.attributes.normal.array);});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));return g;}
window.BINO3D={FH,STY,BASE,ROOF,BAL,GF,MAT,fcOf,roofOf,mass,sunDir,tex,LC,M,setK,toL:p=>toL(p),ringsL,extr,offsetRings,edges,IB,batch,building,finish,obb,roofGeo,shade,skyTex};
})();
