/* Archemistry Studio · Joylashtirish — 3D massing muharriri (three.js r128).
   Bino hajmlari, fasad modullari, quyosh va soya, AI render. Maʼlumot posadka.html dagi window.PZ orqali. */
(function(){'use strict';
const R=Math.PI/180,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T=s=>(window.kpsT||String)(s);
/* ===================== MODULLAR KUTUBXONASI ===================== */
const LIB={
 wall:{plaster:['Suvoq (oq)','#efebe4',null],brick_y:['Gʻisht (sariq, mahalliy)','#d6b483','brick'],brick_r:['Gʻisht (qizil klinker)','#a65a3e','brick'],travertine:['Travertin / tosh plita','#e3d8c3','stone'],
   panel:['Beton panel (seriya)','#cdc8bd','panel'],concrete:['Ochiq beton','#b7b4ad','panel'],terracotta:['Terrakota / ganch','#cf9f78','stone'],wood:['Yogʻoch panel','#ad7b4c','wood'],metal:['Metall kasseta','#83878c','panel'],glass:['Shisha devor (vitraj)','#8fa9bb','glassw']},
 win:{std:['Oddiy (1,5 × 1,5 m)',1.5,1.5,'rect'],tall:['Fransuzcha (1,2 × 2,4 m)',1.2,2.4,'rect'],pano:['Panorama (lenta)',0,1.9,'band'],arch:['Ravoqli (anʼanaviy)',1.3,2.2,'arch'],slit:['Tor vertikal (0,6 × 2,2 m)',.6,2.2,'rect'],small:['Kichik kvadrat (0,9 m)',.9,.9,'rect'],none:['Derazasiz',0,0,'none']},
 bal:{none:['Yoʻq'],open:['Ochiq balkon'],loggia:['Lojiya (ichkariga)'],glazed:['Oynalangan lojiya'],french:['Fransuz balkoni'],ayvon:['Ayvon (ustunli chuqur terrasa)'],cont:['Uzluksiz terrasa (yarus)']},
 shade:{none:['Yoʻq'],panjara:['Panjara / girih toʻr'],fins:['Vertikal lamellar'],louver:['Gorizontal soyabon'],canopy:['Har qavatda kozirek'],green:['Vertikal koʻkalamzor']},
 gf:{same:['Boshqa qavatlar kabi'],retail:['Savdo vitrinasi'],arcade:['Ravoq (galereya)'],pilotis:['Ustunlar (ochiq birinchi qavat)'],lobby:['Baland vestibyul']},
 roof:{flat:['Tekis'],parapet:['Parapetli'],garden:['Tom bogʻi'],pitched:['Qiya tom (shiypon)'],solar:['Quyosh panellari'],terrace:['Pogʻonali terrasa']}};
const STYLES={
 tsh:['Toshkent zamonaviy',{wall:'plaster',win:'std',bal:'loggia',balN:1,shade:'louver',gf:'retail',roof:'parapet',pitch:3.6}],
 bux:['Anʼanaviy (Buxoro, Xiva motivlari)',{wall:'brick_y',win:'arch',bal:'ayvon',balN:1,shade:'panjara',gf:'arcade',roof:'flat',pitch:3.9}],
 sov:['Sovet paneli (seriya)',{wall:'panel',win:'std',bal:'glazed',balN:1,shade:'none',gf:'same',roof:'flat',pitch:3.0}],
 pas:['Issiq iqlim · passiv',{wall:'travertine',win:'tall',bal:'loggia',balN:1,shade:'fins',gf:'arcade',roof:'garden',pitch:3.3}],
 klk:['Yevropa klinker',{wall:'brick_r',win:'tall',bal:'french',balN:1,shade:'none',gf:'retail',roof:'parapet',pitch:3.0}],
 scn:['Skandinaviya',{wall:'wood',win:'tall',bal:'glazed',balN:2,shade:'none',gf:'lobby',roof:'pitched',pitch:3.4}],
 med:['Oʻrta yer dengizi',{wall:'plaster',win:'tall',bal:'open',balN:1,shade:'louver',gf:'arcade',roof:'terrace',pitch:3.2}],
 off:['Biznes markaz / ofis',{wall:'glass',win:'pano',bal:'none',balN:1,shade:'fins',gf:'retail',roof:'solar',pitch:1.5}],
 mass:['Faqat hajm (modulsiz)',{wall:'plaster',win:'none',bal:'none',balN:1,shade:'none',gf:'same',roof:'flat',pitch:3.6}]};
const TIPS={panjara:'Panjara janubiy va gʻarbiy fasadlarda yozgi quyosh issiqligini kamaytiradi, yorugʻlik va shamollatishni saqlaydi.',fins:'Vertikal lamellar sharqiy va gʻarbiy fasadlarda past quyoshdan himoya qiladi.',
 louver:'Gorizontal soyabon janubiy fasadda yozda yuqori quyoshni toʻsadi, qishda past quyoshni oʻtkazadi.',ayvon:'Ayvon — chuqur soyali yarim ochiq makon; issiq iqlimda kunduzgi dam olish joyi.',
 arcade:'Ravoq piyodalar uchun soyali yoʻlak beradi va savdo qavatini quyoshdan himoya qiladi.',garden:'Tom bogʻi tom isishini va yomgʻir oqimini kamaytiradi.',glass:'Shisha devor issiq iqlimda yozgi issiqlik va sovutish yukini oshiradi — soyabon bilan qoʻllang.',pano:'Panorama derazalar janubiy va gʻarbiy tomonda soyasiz qizib ketadi.',pilotis:'Ochiq birinchi qavat hovlini shamollatadi va soyali jamoat makoni beradi.'};
window.M3D_LIB={LIB,STYLES,TIPS};
const facOf=b=>Object.assign({},STYLES[(window.PZ&&PZ.P().p.fac0)||'tsh'][1],b.fac||{});
/* ===================== HOLAT ===================== */
let THREE,ren,scene,cam,root,ctxG,prjG,fxG,hlG,sun,amb,hemi,ground,ok=false,raf=0,dirty=true;
let O=[0,0],Rad=300;const camS={tx:0,ty:0,tz:0,th:-0.6,ph:0.9,r:420};
let nav='arch';try{nav=localStorage.getItem('kps_nav')||'';}catch(e){}
let tool='sel',addType='sek',sunOn=true,sunT=13,sunD='06-22',heat=null,facMap=null,playT=0;
const loadScript=src=>new Promise((res,rej)=>{if([...document.scripts].some(s=>s.src===src))return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error(T('kutubxona yuklanmadi')));document.head.appendChild(s);});
const P=()=>PZ.P();
function origin(){const p=P();const pts=p.site||p.blds.flatMap(b=>b.poly)||[];if(!pts.length){const c=PZ.center();return PZ.xy(c);}const q=pts.map(PZ.xy);return [q.reduce((a,v)=>a+v[0],0)/q.length,q.reduce((a,v)=>a+v[1],0)/q.length];}
const W=ll=>{const q=PZ.xy(ll);return [q[0]-O[0],q[1]-O[1]];};      // dunyo: [sharq, shimol]
const LL=en=>PZ.ll([en[0]+O[0],en[1]+O[1]]);
/* ===================== OCHISH ===================== */
async function open(){const box=$('#map3');if(!window.THREE){try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');}catch(e){PZ.toast(T('3D kutubxonasi yuklanmadi — internetni tekshiring.'));return;}}
  THREE=window.THREE;try{if(!ok)init(box);O=origin();resize();rebuild(true);frame();setTimeout(()=>{resize();dirty=true;},120);if(!nav)navDlg();}
  catch(e){console.error(e);ok=false;box.innerHTML=`<div style="position:absolute;inset:0;display:grid;place-items:center;background:#f4f3f1"><div style="max-width:440px;font:14.5px Archivo,sans-serif;text-align:center"><b style="font-size:16px;font-weight:500">${T('3D ochilmadi')}</b><p class="note">${esc(e.message||e)}</p><p class="note">${T('Brauzeringizda WebGL yoqilganini tekshiring (chrome://gpu). Sahifani yangilab, qayta urinib koʻring.')}</p><button class="btn sm dark" id="m3Retry">${T('Qayta urinish')}</button></div></div>`;const r=$('#m3Retry');if(r)r.onclick=()=>open();}}
function init(box){box.innerHTML='';box.style.position='absolute';
  ren=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setPixelRatio(Math.min(2,devicePixelRatio));ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.outputEncoding=THREE.sRGBEncoding;
  ren.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;outline:none';ren.domElement.tabIndex=0;box.appendChild(ren.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#eceae6');scene.fog=new THREE.Fog('#eceae6',900,2600);
  cam=new THREE.PerspectiveCamera(38,1,1,6000);
  hemi=new THREE.HemisphereLight('#ffffff','#a9a49a',.42);scene.add(hemi);amb=new THREE.AmbientLight('#ffffff',.08);scene.add(amb);
  sun=new THREE.DirectionalLight('#fff6e6',1.05);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.bias=-.0004;sun.shadow.normalBias=.4;scene.add(sun);scene.add(sun.target);
  root=new THREE.Group();scene.add(root);ctxG=new THREE.Group();prjG=new THREE.Group();fxG=new THREE.Group();hlG=new THREE.Group();root.add(ctxG,prjG,fxG,hlG);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({color:'#f4f3f0',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.userData.ground=1;scene.add(ground);
  ui(box);events();new ResizeObserver(resize).observe(box);ok=true;}
function resize(){if(!ren)return;const b=$('#map3').getBoundingClientRect();if(!b.width)return;ren.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();dirty=true;}
function frame(){cancelAnimationFrame(raf);const loop=()=>{raf=requestAnimationFrame(loop);if($('#map3').style.display==='none')return;if(playT){sunT+=.04;if(sunT>20)sunT=4.5;setSun();const s=$('#m3T');if(s)s.value=sunT;}if(!dirty)return;dirty=false;placeCam();ren.render(scene,cam);};loop();}
function placeCam(){const s=camS,x=s.tx+s.r*Math.sin(s.ph)*Math.sin(s.th),y=s.ty+s.r*Math.cos(s.ph),z=s.tz+s.r*Math.sin(s.ph)*Math.cos(s.th);cam.position.set(x,Math.max(1.5,y),z);cam.lookAt(s.tx,s.ty,s.tz);}
/* ===================== TEKSTURALAR ===================== */
const TEX={};
function tex(kind){if(TEX[kind])return TEX[kind];const c=document.createElement('canvas'),S=256;c.width=c.height=S;const g=c.getContext('2d');let rep=1;
  if(kind==='brick'){g.fillStyle='#fff';g.fillRect(0,0,S,S);g.fillStyle='#d9d4cc';const rh=S/13.5,bw=S/4;for(let r=0;r<14;r++){g.fillRect(0,r*rh,S,1.6);const off=r%2?bw/2:0;for(let x=-bw;x<S+bw;x+=bw)g.fillRect(x+off,r*rh,1.6,rh);}rep=1;}
  else if(kind==='panel'){g.fillStyle='#fff';g.fillRect(0,0,S,S);g.fillStyle='#bdb8ae';g.fillRect(0,0,S,3);g.fillRect(0,0,3,S);rep=1/3;}
  else if(kind==='stone'){g.fillStyle='#fff';g.fillRect(0,0,S,S);g.fillStyle='#d5cfc4';for(let y=0;y<S;y+=S/4){g.fillRect(0,y,S,2);for(let x=(y/(S/4))%2?S/4:0;x<S;x+=S/2)g.fillRect(x,y,2,S/4);}rep=1/1.2;}
  else if(kind==='wood'){g.fillStyle='#fff';g.fillRect(0,0,S,S);g.fillStyle='#d8cbbb';for(let x=0;x<S;x+=S/8)g.fillRect(x,0,2,S);rep=1/1.2;}
  else if(kind==='glassw'){g.fillStyle='#fff';g.fillRect(0,0,S,S);g.fillStyle='#55606a';g.fillRect(0,0,S,4);g.fillRect(0,0,4,S);rep=1/1.5;}
  else if(kind==='panjara'){g.clearRect(0,0,S,S);g.strokeStyle='#fff';g.lineWidth=7;const n=4,s=S/n;for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const cx=i*s,cy=j*s;g.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/8,r=s*.42;g.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}g.closePath();g.stroke();g.beginPath();g.moveTo(cx-s/2,cy);g.lineTo(cx+s/2,cy);g.moveTo(cx,cy-s/2);g.lineTo(cx,cy+s/2);g.stroke();}rep=1;}
  else if(kind==='leaf'){g.fillStyle='#3f6b35';g.fillRect(0,0,S,S);for(let i=0;i<900;i++){g.fillStyle=`hsl(${95+Math.random()*30},${35+Math.random()*25}%,${25+Math.random()*25}%)`;g.beginPath();g.arc(Math.random()*S,Math.random()*S,3+Math.random()*6,0,7);g.fill();}rep=1/2;}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=4;TEX[kind]=t;return t;}
const MAT={};const mat=(k,o)=>MAT[k]||(MAT[k]=new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},o)));
/* ===================== QURISH ===================== */
function poly2(b){let q=b.poly.map(W);let s=0;for(let i=0;i<q.length;i++){const j=(i+1)%q.length;s+=q[i][0]*q[j][1]-q[j][0]*q[i][1];}if(s<0)q=q.slice().reverse();return q;} // CCW (sharq, shimol)
function prism(q,h,base,m){const sh=new THREE.Shape(q.map(p=>new THREE.Vector2(p[0],p[1])));const g=new THREE.ExtrudeGeometry(sh,{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,base,0);const me=new THREE.Mesh(g,m);me.castShadow=me.receiveShadow=true;return me;}
const toV=(p,y)=>new THREE.Vector3(p[0],y,-p[1]);
function rebuild(fit){if(!ok)return;O=origin();[ctxG,prjG,fxG,hlG].forEach(g=>{while(g.children.length){const c=g.children.pop();if(c.geometry)c.geometry.dispose();}});
  const p=P();let ext=[];
  // kontekst
  const cm=mat('ctx',{color:'#e9e7e2'});(p.ctx||[]).forEach(x=>{const q=x.poly.map(W);if(q.length<3||q.some(v=>!isFinite(v[0])||!isFinite(v[1])))return;let s=0;for(let i=0;i<q.length;i++){const j=(i+1)%q.length;s+=q[i][0]*q[j][1]-q[j][0]*q[i][1];}const qq=s<0?q.slice().reverse():q;ctxG.add(prism(qq,Math.max(3,+x.h||6),0,cm));ext.push(...q);});
  (p.ctxRd||[]).forEach(r=>{const q=r.pts.map(W);for(let i=1;i<q.length;i++){const a=q[i-1],c=q[i],L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L<.5)continue;const m=new THREE.Mesh(new THREE.BoxGeometry(L,.06,r.w),mat(r.w<3?'rdF':'rd',{color:r.w<3?'#dedbd5':'#9c9a96'}));m.position.set((a[0]+c[0])/2,.03,-(a[1]+c[1])/2);m.rotation.y=Math.atan2(c[1]-a[1],c[0]-a[0]);m.receiveShadow=true;ctxG.add(m);}});
  // uchastka, yashil, avtoturargoh
  if(p.site){const q=p.site.map(W);ext.push(...q);const pts=q.concat([q[0]]).map(v=>toV(v,.25));const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:'#e8775f',dashSize:4,gapSize:2.5}));l.computeLineDistances();prjG.add(l);}
  p.greens.forEach(gr=>{const q=gr.poly.map(W);const m=prism(q.length>2?ccw(q):q,.15,0,mat('grn',{color:'#a9cf8f'}));m.castShadow=false;prjG.add(m);trees(q);});
  p.parks.forEach(pk=>{const m=prism(ccw(pk.poly.map(W)),.08,0,mat('prk',{color:'#cfccc5'}));m.castShadow=false;prjG.add(m);});
  // loyiha binolari
  p.blds.forEach(b=>{const g=bldGroup(b);prjG.add(g);ext.push(...poly2(b));});
  const xs=ext.map(v=>v[0]),ys=ext.map(v=>v[1]);Rad=ext.length?Math.min(3000,Math.max(120,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))*.75):300;if(!isFinite(Rad))Rad=300;
  ground.scale.set(Rad*12,Rad*12,1);sun.shadow.camera.left=sun.shadow.camera.bottom=-Rad*1.3;sun.shadow.camera.right=sun.shadow.camera.top=Rad*1.3;sun.shadow.camera.near=1;sun.shadow.camera.far=Rad*8;sun.shadow.camera.updateProjectionMatrix();
  if(fit){camS.tx=camS.tz=0;camS.ty=0;camS.r=Rad*2.4;}setSun();highlight();if(heat)heatMap();if(facMap)facadeHeat(facMap.id);dirty=true;}
function ccw(q){let s=0;for(let i=0;i<q.length;i++){const j=(i+1)%q.length;s+=q[i][0]*q[j][1]-q[j][0]*q[i][1];}return s<0?q.slice().reverse():q;}
function trees(q){if(q.length<3)return;const xs=q.map(v=>v[0]),ys=q.map(v=>v[1]);const inP=(x,y)=>{let c=false;for(let i=0,j=q.length-1;i<q.length;j=i++){if(((q[i][1]>y)!==(q[j][1]>y))&&(x<(q[j][0]-q[i][0])*(y-q[i][1])/(q[j][1]-q[i][1])+q[i][0]))c=!c;}return c;};
  const tk=mat('trk',{color:'#7a5c3e'}),cr=mat('crown',{color:'#6f9a55',roughness:.95});let n=0;for(let x=Math.min(...xs)+4;x<Math.max(...xs);x+=9)for(let y=Math.min(...ys)+4;y<Math.max(...ys);y+=9){if(n>160||!inP(x,y))continue;n++;const h=5+((x*7+y*13)%3);
    const t=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,h*.45,6),tk);t.position.set(x,h*.22,-y);t.castShadow=true;prjG.add(t);const c=new THREE.Mesh(new THREE.IcosahedronGeometry(h*.32,1),cr);c.position.set(x,h*.62,-y);c.castShadow=true;prjG.add(c);}}
/* ---- bitta bino: hajm + fasad modullari ---- */
function bldGroup(b){const p=P(),fh=+p.p.fh||3.3,F=facOf(b),q=poly2(b),g=new THREE.Group();g.userData.bid=b.id;const fl=Math.max(1,b.fl|0),H=fl*fh;
  const wl=LIB.wall[F.wall]||LIB.wall.plaster,wm=mat('w_'+F.wall,{color:wl[1],map:wl[2]?tex(wl[2]):null,roughness:F.wall==='glass'?.25:.9,metalness:F.wall==='glass'?.3:0});
  const useCol=new THREE.Color((PZ.USES[b.use]||PZ.USES.res)[1]);
  const gfH=fh;let base=0;
  // birinchi qavat
  if(F.gf==='pilotis'){const core=prism(inset(q,2.2),gfH,0,mat('dark',{color:'#5b5e63'}));core.userData.bid=b.id;g.add(core);cols(g,q,0,gfH,b.id,.45);base=gfH;}
  else if(F.gf==='arcade'){const core=prism(inset(q,2.5),gfH,0,mat('gfglass',{color:'#3d4d58',roughness:.2,metalness:.4}));core.userData.bid=b.id;g.add(core);cols(g,q,0,gfH,b.id,.55,true);base=gfH;}
  // asosiy hajm
  let topQ=q,mainH=H-base;if(F.roof==='terrace'&&fl>=5){const tf=Math.min(3,Math.floor(fl/4));const m1=prism(q,(fl-tf)*fh-base,base,wm);m1.userData.bid=b.id;g.add(m1);topQ=inset(q,3);const m2=prism(topQ,tf*fh,(fl-tf)*fh,wm);m2.userData.bid=b.id;g.add(m2);}
  else{const m=prism(q,mainH,base,wm);m.userData.bid=b.id;g.add(m);}
  // funksiya rangi — tepada yupqa chiziq (reja rangi)
  const band=prism(topQ,.25,H+.01,mat('use_'+b.use,{color:useCol}));band.castShadow=false;band.userData.bid=b.id;g.add(band);
  roof(g,topQ,H,F,b.id);
  if(F.gf==='retail'||F.gf==='lobby')edges(q,(a,u,n,L)=>{inst(g,'gfwin',[{a,u,n,s:L/2,y:gfH*.5-.1,w:L-1.2,h:gfH-.9,d:.05,o:.04}],{color:'#3a4a55',roughness:.15,metalness:.5});});
  // qavatlar boʻyicha modullar
  const win=LIB.win[F.win]||LIB.win.std,pitch=Math.max(1,+F.pitch||3.6),rec={glass:[],arch:[],slab:[],rail:[],fin:[],louver:[],col:[],frame:[],grn:[]},pan=[];
  const f0=base>0||F.gf==='retail'||F.gf==='lobby'?1:0,fTop=F.roof==='terrace'&&fl>=5?fl-Math.min(3,Math.floor(fl/4)):fl;
  edges(q,(a,u,n,L)=>{if(L<2)return;const nW=win[3]==='band'?1:Math.max(1,Math.floor((L-1)/pitch)),gap=L/nW;
    for(let f=f0;f<fl;f++){if(f>=fTop)continue;const fy=f*fh,flH=fh,cy=fy+flH*.55;
      const balF=F.bal!=='none'&&f>=1&&((f-1)%Math.max(1,F.balN|0))===0;
      if(win[3]==='band'){rec.glass.push({a,u,n,s:L/2,y:cy,w:L-.4,h:win[2],d:.04,o:.03});}
      else if(win[3]!=='none')for(let i=0;i<nW;i++){const s=gap*(i+.5),ww=Math.min(win[1],gap-.4);if(win[3]==='arch')rec.arch.push({a,u,n,s,y:cy-win[2]*.5+.1,w:ww,h:win[2],d:.05,o:.03});else rec.glass.push({a,u,n,s,y:cy,w:ww,h:win[2],d:.04,o:.03});
        if(F.wall!=='glass'&&win[3]!=='arch')rec.frame.push({a,u,n,s,y:cy-win[2]/2-.06,w:ww+.2,h:.1,d:.18,o:.09});}
      if(balF){const D=F.bal==='ayvon'?2.2:F.bal==='cont'?1.8:F.bal==='open'?1.3:F.bal==='french'?.35:1.1;
        if(F.bal==='cont'){rec.slab.push({a,u,n,s:L/2,y:fy,w:L,h:.18,d:D,o:D/2});rec.rail.push({a,u,n,s:L/2,y:fy+.6,w:L,h:1.0,d:.04,o:D});}
        else for(let i=0;i<nW;i+=(F.bal==='ayvon'?1:2)){const s=gap*(i+.5),bw=F.bal==='ayvon'?gap:Math.min(gap*1.6,Math.max(2.6,win[1]+1.4));
          if(F.bal==='loggia'||F.bal==='glazed'){rec.frame.push({a,u,n,s:s-bw/2,y:fy+flH/2,w:.2,h:flH,d:.6,o:.3});rec.frame.push({a,u,n,s:s+bw/2,y:fy+flH/2,w:.2,h:flH,d:.6,o:.3});rec.slab.push({a,u,n,s,y:fy,w:bw,h:.16,d:.6,o:.3});
            if(F.bal==='glazed')rec.glass.push({a,u,n,s,y:fy+flH*.55,w:bw-.2,h:flH*.62,d:.04,o:.58});else rec.rail.push({a,u,n,s,y:fy+.55,w:bw-.2,h:.95,d:.04,o:.58});}
          else if(F.bal==='ayvon'){rec.slab.push({a,u,n,s,y:fy+flH-.2,w:bw,h:.22,d:D,o:D/2});rec.col.push({a,u,n,s:s-bw/2+.2,y:fy+flH/2,w:.28,h:flH,d:.28,o:D-.2});rec.rail.push({a,u,n,s,y:fy+.5,w:bw,h:.9,d:.05,o:D-.05});}
          else{rec.slab.push({a,u,n,s,y:fy,w:bw,h:.16,d:D,o:D/2});rec.rail.push({a,u,n,s,y:fy+.6,w:bw,h:1.0,d:.04,o:D});}}}
      if(F.shade==='louver'||F.shade==='canopy'){const D=F.shade==='canopy'?1.0:.7;if(F.shade==='canopy')rec.louver.push({a,u,n,s:L/2,y:fy+flH-.1,w:L,h:.12,d:D,o:D/2});else for(let i=0;i<nW;i++)rec.louver.push({a,u,n,s:gap*(i+.5),y:cy+win[2]/2+.15,w:Math.min(win[1]||gap,gap)+.4,h:.08,d:D,o:D/2});}
      if(F.shade==='fins')for(let i=0;i<=nW;i++)rec.fin.push({a,u,n,s:Math.min(L-.05,Math.max(.05,gap*i)),y:fy+flH/2,w:.08,h:flH,d:.55,o:.3});
      if(F.shade==='green')for(let i=0;i<nW;i+=2)rec.grn.push({a,u,n,s:gap*(i+.5),y:fy+.35,w:Math.min(gap,2.4),h:.7,d:.5,o:.3});}
    if(F.shade==='panjara'&&fTop>f0){const y0=f0===0?0:gfH,yh=(fTop-f0)*fh;pan.push({a,u,n,L,y0,yh});}});
  inst(g,'glass',rec.glass,{color:F.wall==='glass'?'#2c3a44':'#33414c',roughness:.12,metalness:.6});inst(g,'frame',rec.frame,{color:'#f6f4ef'});
  instArch(g,rec.arch);inst(g,'slab',rec.slab,{color:'#e9e6df'});inst(g,'rail',rec.rail,{color:'#9fb2bd',transparent:true,opacity:.55,roughness:.2});
  inst(g,'fin',rec.fin,{color:'#d9d2c3'});inst(g,'louver',rec.louver,{color:'#cfc8b8'});inst(g,'col',rec.col,{color:'#a6825a'});inst(g,'grn',rec.grn,{color:'#5f8f4a',map:tex('leaf')});
  pan.forEach(P2=>{const pm=new THREE.Mesh(new THREE.PlaneGeometry(P2.L,P2.yh),mat('panj',{color:'#c8b08a',map:tex('panjara'),alphaTest:.5,transparent:false,side:THREE.DoubleSide}));
    const t=pm.material.map;t.repeat.set(1,1);pm.geometry.attributes.uv.array.forEach((v,i,arr)=>{arr[i]=v*(i%2?P2.yh:P2.L)/1.4;});pm.geometry.attributes.uv.needsUpdate=true;
    const c=[P2.a[0]+P2.u[0]*P2.L/2+P2.n[0]*.55,P2.a[1]+P2.u[1]*P2.L/2+P2.n[1]*.55];pm.position.set(c[0],P2.y0+P2.yh/2,-c[1]);pm.rotation.y=Math.atan2(P2.n[0],-P2.n[1]);pm.castShadow=true;pm.userData.bid=b.id;g.add(pm);});
  g.traverse(o=>{if(o.isMesh&&o.userData.bid==null)o.userData.bid=b.id;});return g;}
function inset(q,d){const c=[q.reduce((a,v)=>a+v[0],0)/q.length,q.reduce((a,v)=>a+v[1],0)/q.length];const r=Math.max(...q.map(v=>Math.hypot(v[0]-c[0],v[1]-c[1])));const k=Math.max(.2,(r-d)/r);return q.map(v=>[c[0]+(v[0]-c[0])*k,c[1]+(v[1]-c[1])*k]);}
function edges(q,fn){for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length],L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L<.5)continue;const u=[(c[0]-a[0])/L,(c[1]-a[1])/L],n=[u[1],-u[0]];fn(a,u,n,L,i);}}
const DUM={};function inst(g,key,list,mo){if(!list.length)return;const geo=DUM.box||(DUM.box=new THREE.BoxGeometry(1,1,1));const m=new THREE.InstancedMesh(geo,mat('i_'+key+JSON.stringify(mo),mo),list.length);const o=new THREE.Object3D();
  list.forEach((e,i)=>{const px=e.a[0]+e.u[0]*e.s+e.n[0]*e.o,py=e.a[1]+e.u[1]*e.s+e.n[1]*e.o;o.position.set(px,e.y,-py);o.rotation.set(0,Math.atan2(e.u[1],e.u[0]),0);o.scale.set(Math.max(.01,e.w),Math.max(.01,e.h),Math.max(.01,e.d));o.updateMatrix();m.setMatrixAt(i,o.matrix);});
  m.castShadow=key!=='glass'&&key!=='rail';m.receiveShadow=true;g.add(m);}
function instArch(g,list){if(!list.length)return;if(!DUM.arch){const s=new THREE.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(.5,.72);s.absarc(0,.72,.5,0,Math.PI,false);s.lineTo(-.5,0);const ge=new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:10});ge.translate(0,0,-.5);DUM.arch=ge;}
  const m=new THREE.InstancedMesh(DUM.arch,mat('archg',{color:'#2f3d47',roughness:.15,metalness:.55}),list.length),o=new THREE.Object3D();
  list.forEach((e,i)=>{const px=e.a[0]+e.u[0]*e.s+e.n[0]*e.o,py=e.a[1]+e.u[1]*e.s+e.n[1]*e.o;o.position.set(px,e.y,-py);o.rotation.set(0,Math.atan2(e.u[1],e.u[0]),0);o.scale.set(e.w,e.h/1.22,e.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});g.add(m);}
function cols(g,q,y,h,id,sz,front){const list=[];edges(q,(a,u,n,L)=>{const k=Math.max(1,Math.round(L/4.5));for(let i=0;i<=k;i++)list.push({a,u,n,s:L*i/k,y:y+h/2,w:sz,h,d:sz,o:front?-.2:-1.6});});inst(g,'col'+(front?'a':'p'),list,{color:'#ece8e0'});
  if(front){const sl=[];edges(q,(a,u,n,L)=>sl.push({a,u,n,s:L/2,y:h-.15,w:L,h:.3,d:2.5,o:-1.25}));}}
function roof(g,q,H,F,id){const rm=mat('roofc',{color:'#dcd8d0'});
  if(F.roof==='parapet'||F.roof==='garden'||F.roof==='solar'||F.roof==='terrace'){const l=[];edges(q,(a,u,n,L)=>l.push({a,u,n,s:L/2,y:H+.55,w:L,h:1.1,d:.25,o:-.12}));inst(g,'parapet',l,{color:'#e6e2da'});}
  if(F.roof==='garden'){const m=prism(inset(q,1),.4,H,mat('rgreen',{color:'#8fbf73',map:tex('leaf')}));g.add(m);}
  if(F.roof==='solar'){const l=[];const iq=inset(q,2);edges(iq,(a,u,n,L)=>{for(let s=2;s<L-2;s+=2.2)l.push({a,u,n,s,y:H+.7,w:1.9,h:.06,d:1.1,o:-3});});inst(g,'pv',l,{color:'#1e2a3a',roughness:.3,metalness:.5});}
  if(F.roof==='pitched'&&q.length===4){const a=q[0],b=q[1],c=q[2],d=q[3],L1=Math.hypot(b[0]-a[0],b[1]-a[1]),L2=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const [p0,p1,p2,p3]=L1>=L2?[a,b,c,d]:[b,c,d,a],w=Math.min(L1,L2),rh=Math.min(6,w*.35),m1=[(p0[0]+p3[0])/2,(p0[1]+p3[1])/2],m2=[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2];
    const v=[p0,p1,p2,p3].map(p=>toV(p,H)),r1=toV(m1,H+rh),r2=toV(m2,H+rh);const pos=[];const tri=(A,B,C)=>pos.push(A.x,A.y,A.z,B.x,B.y,B.z,C.x,C.y,C.z);
    tri(v[0],v[1],r2);tri(v[0],r2,r1);tri(v[2],v[3],r1);tri(v[2],r1,r2);tri(v[1],v[2],r2);tri(v[3],v[0],r1);const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));ge.computeVertexNormals();
    const m=new THREE.Mesh(ge,mat('pitch',{color:'#7d6a5a',side:THREE.DoubleSide}));m.castShadow=m.receiveShadow=true;m.userData.bid=id;g.add(m);}}
/* ===================== QUYOSH ===================== */
function sunVec(h){const s=PZ.sunPos(PZ.doy(sunD),h,PZ.lat0());return {alt:s.alt,az:s.az,v:new THREE.Vector3(Math.sin(s.az)*Math.cos(s.alt),Math.sin(s.alt),-Math.cos(s.az)*Math.cos(s.alt))};}
function setSun(){if(!ok)return;const s=sunVec(sunT);const up=s.alt>0;sun.visible=sunOn&&up;sun.intensity=up?.5+.9*Math.min(1,Math.sin(s.alt)*1.6):0;sun.position.copy(s.v.clone().multiplyScalar(Rad*4));sun.target.position.set(0,0,0);
  hemi.intensity=up?.42:.3;const lbl=$('#m3TL');if(lbl){const m=Math.round(sunT*60);lbl.textContent=`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')} · ${up?Math.round(s.alt/R)+'°':T('quyosh botgan')}`;}dirty=true;}
function obstacles(){const p=P(),fh=+p.p.fh||3.3;return p.blds.map(b=>({q:poly2(b),h:Math.max(1,b.fl)*fh,id:b.id})).concat((p.ctx||[]).map(x=>({q:x.poly.map(W),h:x.h})));}
function rayHit(p,u,Q){let t0=Infinity;for(let i=0;i<Q.length;i++){const a=Q[i],b=Q[(i+1)%Q.length],ex=b[0]-a[0],ey=b[1]-a[1],den=u[0]*ey-u[1]*ex;if(Math.abs(den)<1e-12)continue;const t=((a[0]-p[0])*ey-(a[1]-p[1])*ex)/den,s=((a[0]-p[0])*u[1]-(a[1]-p[1])*u[0])/den;if(t>.05&&s>=0&&s<=1&&t<t0)t0=t;}return t0;}
function suns(stepMin){const n=PZ.N(),t0=n.t0!==''&&n.t0!=null?+n.t0:4,t1=n.t1!==''&&n.t1!=null?+n.t1:20,out=[],st=stepMin/60;for(let h=t0;h<=t1;h+=st){const s=PZ.sunPos(PZ.doy(sunD),h,PZ.lat0());if(s.alt>.01)out.push({h,u:[Math.sin(s.az),Math.cos(s.az)],ta:Math.tan(s.alt)});}return {list:out,st};}
function near(OB,cx,cy,r){return OB.filter(o=>o.q.some(v=>Math.abs(v[0]-cx)<r&&Math.abs(v[1]-cy)<r));}
function litAt(p,z,nrm,S,OB,skip){OB=OB.filter(o=>o.h>z);return S.list.map(sv=>{if(nrm&&sv.u[0]*nrm[0]+sv.u[1]*nrm[1]<=0)return false;for(const o of OB){if(o.id===skip&&!nrm)continue;const t=rayHit(p,sv.u,o.q);if(t<Infinity&&z+t*sv.ta<o.h)return false;}return true;});}
function runs(arr,S){let best=0,cur=0,tot=0,iv=[],st=null;arr.forEach((v,i)=>{if(v){if(!cur)st=S.list[i].h;cur+=S.st;tot+=S.st;if(cur>best)best=cur;}else{if(cur)iv.push([st,S.list[i-1].h+S.st]);cur=0;}});if(cur)iv.push([st,S.list[arr.length-1].h+S.st]);return {best,tot,iv};}
const hcol=(h,mx)=>{const t=Math.min(1,h/(mx||7));return new THREE.Color().setHSL(.0+t*.14,.85,.32+t*.28);};
function heatMap(){fxG.children.filter(c=>c.userData.heat).forEach(c=>fxG.remove(c));const p=P();const pts=(p.site||p.blds.flatMap(b=>b.poly)).map(W);if(!pts.length)return;
  const xs=pts.map(v=>v[0]),ys=pts.map(v=>v[1]),x0=Math.min(...xs)-15,x1=Math.max(...xs)+15,y0=Math.min(...ys)-15,y1=Math.max(...ys)+15,cs=Math.max(2.5,Math.sqrt((x1-x0)*(y1-y0)/4000));
  const OB=near(obstacles(),(x0+x1)/2,(y0+y1)/2,Math.max(x1-x0,y1-y0)/2+250),S=suns(10),nx=Math.ceil((x1-x0)/cs),ny=Math.ceil((y1-y0)/cs),c=document.createElement('canvas');c.width=nx;c.height=ny;const g=c.getContext('2d');let mx=0;
  const inside=(q,x,y)=>{let cc=false;for(let i=0,j=q.length-1;i<q.length;j=i++){if(((q[i][1]>y)!==(q[j][1]>y))&&(x<(q[j][0]-q[i][0])*(y-q[i][1])/(q[j][1]-q[i][1])+q[i][0]))cc=!cc;}return cc;};
  const vals=[];for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const x=x0+(i+.5)*cs,y=y0+(j+.5)*cs;if(OB.some(o=>inside(o.q,x,y)))continue;const r=runs(litAt([x,y],.2,null,S,OB),S);mx=Math.max(mx,r.tot);vals.push([i,j,r.tot]);}
  vals.forEach(([i,j,h])=>{const col=hcol(h,mx);g.fillStyle=`rgba(${col.r*255|0},${col.g*255|0},${col.b*255|0},.8)`;g.fillRect(i,ny-1-j,1,1);});
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;const m=new THREE.Mesh(new THREE.PlaneGeometry(nx*cs,ny*cs),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x0+nx*cs/2,.35,-(y0+ny*cs/2));m.userData.heat=1;fxG.add(m);
  heat={mx};legend();dirty=true;}
function facadeHeat(id){fxG.children.filter(c=>c.userData.fac).forEach(c=>fxG.remove(c));const p=P(),b=p.blds.find(x=>x.id===id);if(!b){facMap=null;return;}const fh=+p.p.fh||3.3,q=poly2(b),qc=q.reduce((a,v)=>[a[0]+v[0]/q.length,a[1]+v[1]/q.length],[0,0]),OB=near(obstacles(),qc[0],qc[1],320),S=suns(10),n=PZ.N(),wz=+n.wz||1,samples=[],pos=[],col=[];
  edges(q,(a,u,nn,L)=>{const k=Math.max(1,Math.round(L/3));for(let f=0;f<b.fl;f++)for(let i=0;i<k;i++){const s0=L*i/k,s1=L*(i+1)/k,sm=(s0+s1)/2,pt=[a[0]+u[0]*sm+nn[0]*.12,a[1]+u[1]*sm+nn[1]*.12],z=f*fh+wz;const arr=litAt(pt,z,nn,S,OB,b.id),r=runs(arr,S);samples.push({pt,z,nn,r,f:f+1});
      const c=hcol(r.best),A=[a[0]+u[0]*s0+nn[0]*.08,a[1]+u[1]*s0+nn[1]*.08],B=[a[0]+u[0]*s1+nn[0]*.08,a[1]+u[1]*s1+nn[1]*.08],y0=f*fh+.15,y1=(f+1)*fh-.15;
      const v=[[A[0],y0,-A[1]],[B[0],y0,-B[1]],[B[0],y1,-B[1]],[A[0],y0,-A[1]],[B[0],y1,-B[1]],[A[0],y1,-A[1]]];v.forEach(w=>{pos.push(...w);col.push(c.r,c.g,c.b);});}});
  const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));ge.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const m=new THREE.Mesh(ge,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.92}));m.userData.fac=1;m.userData.samples=samples;fxG.add(m);facMap={id,samples};
  const thr=+PZ.N().ins;const bad=thr?samples.filter(s=>s.r.best<thr).length:null;info(`<b>${T('Fasad insolyatsiyasi')}</b> · ${samples.length} ${T('nuqta')} · ${T('eng kam uzluksiz')}: ${fmtH(Math.min(...samples.map(s=>s.r.best)))}${bad!=null?` · ${T('talabdan kam')}: <b style="color:#b3261e">${bad}</b>`:''}<br><span style="opacity:.75">${T('Fasaddagi katakni bosing — quyosh qaysi soatlarda tushishini koʻrasiz.')}</span>`);legend();dirty=true;}
const fmtH=h=>{const m=Math.round(h*60);return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');};
function timeline(s){const S=suns(5),arr=litAt(s.pt,s.z,s.nn,S,obstacles(),null),r=runs(arr,S);const W=360,x=h=>(h-4)/16*W;
  let svg=`<svg viewBox="0 0 ${W} 46" width="100%" style="display:block;margin-top:6px"><rect x="0" y="10" width="${W}" height="14" fill="#3b3f46"/>${r.iv.map(v=>`<rect x="${x(v[0])}" y="10" width="${Math.max(1,x(v[1])-x(v[0]))}" height="14" fill="#f0b429"/>`).join('')}${[4,6,8,10,12,14,16,18,20].map(h=>`<line x1="${x(h)}" x2="${x(h)}" y1="24" y2="28" stroke="#cfccc5"/><text x="${x(h)}" y="40" font-size="9" fill="#cfccc5" text-anchor="middle">${h}</text>`).join('')}</svg>`;
  info(`<b>${s.f}-${T('qavat')}</b> · ${T('uzluksiz')}: <b>${fmtH(r.best)}</b> · ${T('jami')}: ${fmtH(r.tot)}<br>${r.iv.length?r.iv.map(v=>fmtH(v[0])+'–'+fmtH(v[1])).join(', '):T('quyosh tushmaydi')}${svg}`);}
function legend(){const el=$('#m3Leg');if(!el)return;el.hidden=!(heat||facMap);const mx=facMap?7:heat?Math.max(1,Math.round(heat.mx)):7;el.innerHTML=`<span>0 ${T('soat')}</span><i style="background:linear-gradient(90deg,${[0,.25,.5,.75,1].map(k=>'#'+hcol(k*mx,mx).getHexString()).join(',')})"></i><span>${mx}${facMap?'+':''} ${T('soat')}</span><span style="opacity:.6">${facMap?T('uzluksiz'):T('jami, yer sathida')}</span>`;}
function info(h){const el=$('#m3Info');if(!el)return;el.hidden=!h;el.innerHTML=h?h+'<button class="x" aria-label="Yopish">✕</button>':'';const x=el.querySelector('.x');if(x)x.onclick=()=>{el.hidden=true;};}
/* ===================== TANLASH VA TAHRIRLASH ===================== */
function selId(){const s=PZ.sel();return s&&s.t==='b'?s.id:null;}
function highlight(){while(hlG.children.length)hlG.remove(hlG.children[0]);const id=selId();const lb=$('#m3Sel');if(!id){if(lb)lb.hidden=true;dirty=true;return;}const b=P().blds.find(x=>x.id===id);if(!b)return;const fh=+P().p.fh||3.3,q=poly2(b),H=b.fl*fh;
  const pts=[];q.forEach((v,i)=>{const w=q[(i+1)%q.length];pts.push(toV(v,H+.4),toV(w,H+.4),toV(v,.3),toV(w,.3),toV(v,.3),toV(v,H+.4));});hlG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#2f6feb'})));
  const c=q.reduce((a,v)=>[a[0]+v[0]/q.length,a[1]+v[1]/q.length],[0,0]),hs=Math.max(1.6,Rad/90);
  const hh=new THREE.Mesh(new THREE.SphereGeometry(hs,16,12),new THREE.MeshBasicMaterial({color:'#2f6feb'}));hh.position.set(c[0],H+hs*2.2,-c[1]);hh.userData.handle='h';hlG.add(hh);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(hs*.18,hs*.18,hs*2.2,8),new THREE.MeshBasicMaterial({color:'#2f6feb'}));st.position.set(c[0],H+hs*1.1,-c[1]);hlG.add(st);
  const far=q.reduce((m,v)=>Math.hypot(v[0]-c[0],v[1]-c[1])>Math.hypot(m[0]-c[0],m[1]-c[1])?v:m,q[0]),dir=[far[0]-c[0],far[1]-c[1]],dl=Math.hypot(...dir)||1,rp=[far[0]+dir[0]/dl*hs*3,far[1]+dir[1]/dl*hs*3];
  const rh=new THREE.Mesh(new THREE.TorusGeometry(hs*.9,hs*.28,8,20),new THREE.MeshBasicMaterial({color:'#f0b429'}));rh.rotation.x=Math.PI/2;rh.position.set(rp[0],1,-rp[1]);rh.userData.handle='r';hlG.add(rh);
  const lab=$('#m3Sel');if(lab){lab.hidden=false;lab.innerHTML=`${b.fl} ${T('qav.')} · ${(H).toFixed(1).replace('.',',')} m · <span style="opacity:.7">${T('koʻk shar — balandlik, sariq halqa — burish, binoni sudrang — koʻchirish')}</span>`;}dirty=true;}
let RC=null,drag=null,downP=null,camDrag=null;
function pick(e,objs){const r=ren.domElement.getBoundingClientRect(),m=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);RC=RC||new THREE.Raycaster();RC.setFromCamera(m,cam);return RC.intersectObjects(objs,true)[0]||null;}
function groundAt(e,y){const r=ren.domElement.getBoundingClientRect(),m=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);RC=RC||new THREE.Raycaster();RC.setFromCamera(m,cam);const pl=new THREE.Plane(new THREE.Vector3(0,1,0),-(y||0)),v=new THREE.Vector3();return RC.ray.intersectPlane(pl,v)?[v.x,-v.z]:null;}
const NAV={arch:['Archemistry','Chap tugma — aylantirish, oʻng — surish, gʻildirak — yaqinlashtirish. Binoni bosish — tanlash.'],archicad:['ArchiCAD','Shift + oʻrta tugma — aylantirish, oʻrta tugma — surish.'],revit:['Revit','Shift + oʻrta tugma — aylantirish, oʻrta tugma — surish.'],sketchup:['SketchUp','Oʻrta tugma — aylantirish, Shift + oʻrta — surish.'],rhino:['Rhino','Oʻng tugma — aylantirish, Shift + oʻng — surish.']};
function navMode(e){const sh=e.shiftKey,b=e.button;switch(nav||'arch'){case 'archicad':case 'revit':return b===1?(sh?'orbit':'pan'):b===2?'pan':null;case 'sketchup':return b===1?(sh?'pan':'orbit'):b===2?'pan':null;case 'rhino':return b===2?(sh?'pan':'orbit'):b===1?'pan':null;default:return b===0?'orbit':b===2||b===1?'pan':null;}}
function events(){const el=ren.domElement;el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointerdown',e=>{el.focus();downP=[e.clientX,e.clientY];el.setPointerCapture(e.pointerId);
    if(e.button===0&&!e.shiftKey){if(tool==='add'){const g=groundAt(e);if(g)addBuilding(g);return;}
      const hh=pick(e,hlG.children.filter(c=>c.userData.handle));if(hh){const b=P().blds.find(x=>x.id===selId());drag={k:hh.object.userData.handle,b,o:JSON.parse(JSON.stringify(b.poly)),fl:b.fl,y0:e.clientY,g:groundAt(e)};return;}
      const fm=fxG.children.find(c=>c.userData.fac);if(fm){const ht=pick(e,[fm]);if(ht){timeline(fm.userData.samples[Math.floor(ht.faceIndex/2)]);return;}}
      const hit=pick(e,prjG.children);const bid=hit&&(()=>{let o=hit.object;while(o&&o.userData.bid==null)o=o.parent;return o&&o.userData.bid;})();
      if(bid){if(selId()!==bid){PZ.setSel(bid);highlight();}const b=P().blds.find(x=>x.id===bid);drag={k:'m',b,o:JSON.parse(JSON.stringify(b.poly)),g:groundAt(e),moved:false};return;}
      if((nav||'arch')!=='arch'){PZ.setSel(null);highlight();const l=$('#m3Sel');if(l)l.hidden=true;return;}}
    const md=navMode(e);if(md)camDrag={md,x:e.clientX,y:e.clientY,s:Object.assign({},camS)};});
  el.addEventListener('pointermove',e=>{if(drag){const fh=+P().p.fh||3.3;
      if(drag.k==='h'){const dy=(drag.y0-e.clientY)*camS.r/700;drag.b.fl=Math.max(1,Math.min(80,Math.round(drag.fl+dy/fh)));liveRebuild(drag.b);}
      else if(drag.k==='m'){const g=groundAt(e);if(!g||!drag.g)return;const d=[g[0]-drag.g[0],g[1]-drag.g[1]],sd=[Math.round(d[0]*2)/2,Math.round(d[1]*2)/2];if(Math.hypot(...d)>.3)drag.moved=true;drag.b.poly=drag.o.map(ll=>{const w=W(ll);return LL([w[0]+sd[0],w[1]+sd[1]]);});liveRebuild(drag.b);}
      else if(drag.k==='r'){const g=groundAt(e);if(!g||!drag.g)return;const q=drag.o.map(W),c=q.reduce((a,v)=>[a[0]+v[0]/q.length,a[1]+v[1]/q.length],[0,0]);let an=Math.atan2(g[1]-c[1],g[0]-c[0])-Math.atan2(drag.g[1]-c[1],drag.g[0]-c[0]);if(!e.altKey)an=Math.round(an/(5*R))*5*R;
        const cs=Math.cos(an),sn=Math.sin(an);drag.b.poly=q.map(v=>LL([c[0]+(v[0]-c[0])*cs-(v[1]-c[1])*sn,c[1]+(v[0]-c[0])*sn+(v[1]-c[1])*cs]));liveRebuild(drag.b);}return;}
    if(camDrag){const dx=e.clientX-camDrag.x,dy=e.clientY-camDrag.y;if(camDrag.md==='orbit'){camS.th=camDrag.s.th-dx*.006;camS.ph=Math.max(.08,Math.min(1.52,camDrag.s.ph-dy*.006));}
      else{const k=camS.r/ren.domElement.clientHeight*1.1,cs=Math.cos(camDrag.s.th),sn=Math.sin(camDrag.s.th);camS.tx=camDrag.s.tx-cs*dx*k-sn*dy*k;camS.tz=camDrag.s.tz+sn*dx*k-Math.cos(camDrag.s.th)*dy*k;}dirty=true;}});
  const up=e=>{if(drag){const d=drag;drag=null;if(d.k!=='m'||d.moved){PZ.commit();}return;}if(camDrag&&downP&&Math.hypot(e.clientX-downP[0],e.clientY-downP[1])<4&&e.button===0&&selId()){PZ.setSel(null);highlight();}camDrag=null;};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',e=>{e.preventDefault();const k=Math.exp(e.deltaY*.0012);const g=groundAt(e);camS.r=Math.max(15,Math.min(Rad*10,camS.r*k));if(g&&k<1){camS.tx+=(g[0]-camS.tx)*(1-k)*.6;camS.tz+=(-g[1]-camS.tz)*(1-k)*.6;}dirty=true;},{passive:false});
  el.addEventListener('keydown',e=>{if(e.key==='Delete'&&selId()){PZ.delSel();}if(e.key==='Escape'){setTool('sel');}});}
function liveRebuild(b){const old=prjG.children.find(c=>c.userData&&c.userData.bid===b.id&&c.isGroup);if(old)prjG.remove(old);prjG.add(bldGroup(b));highlight();dirty=true;}
const TYPO={sek:['Seksiya 24×15 m · 9 qav.',24,15,9],sht:['Shtangali uy 60×12 m · 5 qav.',60,12,5],min:['Minora 24×24 m · 16 qav.',24,24,16],lsh:['L-shakl 36×36 m · 9 qav.','L',12,9],hov:['Perimetral kvartal 48×48 m · 7 qav.','P',12,7],ayv:['Ayvonli kam qavatli 18×10 m · 3 qav.',18,10,3],ofs:['Ofis bloki 40×20 m · 12 qav.',40,20,12],mkt:['Maktab / bogʻcha bloki 60×18 m · 3 qav.',60,18,3]};
function siteAng(){const p=P();if(!p.site)return 0;const q=p.site.map(W);let best=0,an=0;q.forEach((v,i)=>{const w=q[(i+1)%q.length],L=Math.hypot(w[0]-v[0],w[1]-v[1]);if(L>best){best=L;an=Math.atan2(w[1]-v[1],w[0]-v[0]);}});return an;}
function addBuilding(g){const t=TYPO[addType],an=siteAng(),cs=Math.cos(an),sn=Math.sin(an),rot=v=>LL([g[0]+v[0]*cs-v[1]*sn,g[1]+v[0]*sn+v[1]*cs]);const rect=(x0,y0,w,h)=>[[x0,y0],[x0+w,y0],[x0+w,y0+h],[x0,y0+h]].map(rot);const p=P(),style=addType==='ayv'?'bux':addType==='ofs'?'off':null;
  let polys=[];if(t[1]==='L'){polys=[[[-18,-18],[18,-18],[18,-6],[-6,-6],[-6,18],[-18,18]].map(rot)];}else if(t[1]==='P'){const d=t[2];polys=[rect(-24,-24,48,d),rect(-24,24-d,48,d),rect(-24,-24+d,d,48-2*d),rect(24-d,-24+d,d,48-2*d)];}else polys=[rect(-t[1]/2,-t[2]/2,t[1],t[2])];
  let last=null;polys.forEach(poly=>{const b={id:PZ.uid(),poly,fl:t[3],use:addType==='ofs'?'off':addType==='mkt'?'soc':'res',gf:addType==='sek'||addType==='min'?'com':'res'};if(style)b.fac={style,...STYLES[style][1]};p.blds.push(b);last=b;});
  PZ.setSel(last.id);setTool('sel');PZ.commit();}
/* ===================== AI RENDER ===================== */
const RPRE={day:'Kunduzgi yorugʻ, aniq osmon, yozgi Toshkent',eve:'Oltin soat, iliq kechki yorugʻlik, derazalarda chiroqlar',win:'Qishki kun, yumshoq bulutli yorugʻlik, yalangʻoch daraxtlar',spr:'Erta bahor, gullagan oʻriklar, yashil maysa',air:'Qush parvozidan koʻrinish, maket uslubi, yumshoq soyalar',street:'Piyoda koʻzi balandligidan koʻcha koʻrinishi, odamlar, velosipedchilar'};
function renderDlg(){if(!ok)return;hlG.visible=false;ren.render(scene,cam);const shot=ren.domElement.toDataURL('image/png');hlG.visible=true;dirty=true;let key='';try{key=localStorage.getItem('kps_gem_key')||'';}catch(e){}const model=localStorage.getItem('kps_gem_model')||'gemini-2.5-flash-image';
  const ov=document.createElement('div');ov.className='fpw';ov.innerHTML=`<div class="box" style="grid-template-columns:1fr 340px"><div class="hd"><b style="font-size:15px;font-weight:500">${T('AI render')}</b><span class="note">${T('joriy rakurs')}</span><span class="sp"></span><button class="btn sm ghost x">${T('Yopish')}</button></div>
    <div class="cv" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;background:#fff"><figure style="margin:0"><figcaption class="note">${T('Massing (kirish)')}</figcaption><img src="${shot}" style="width:100%;border:1px solid #dedcd7"></figure><figure style="margin:0"><figcaption class="note">${T('Render (natija)')}</figcaption><div id="rOut" style="aspect-ratio:${ren.domElement.width}/${ren.domElement.height};border:1px dashed #cfccc5;display:grid;place-items:center;color:#8a877f;font-size:13.5px">—</div></figure></div>
    <div class="pn"><div><div class="lbl">${T('Sahna')}</div><div class="ktyp">${Object.entries(RPRE).map(([k,v],i)=>`<button data-rp="${k}" aria-pressed="${i===0}">${esc(T(v).split(',')[0])}</button>`).join('')}</div></div>
      <div><div class="lbl">${T('Tavsif (ixtiyoriy)')}</div><textarea id="rTxt" rows="4" style="width:100%;border:1px solid #cfccc5;padding:6px;font:13.5px Archivo">${esc(T(RPRE.day))}</textarea></div>
      <div class="f"><label class="full">${T('Model')}<select id="rMod">${['gemini-2.5-flash-image','gemini-3-pro-image-preview'].concat([model]).filter((v,i,a)=>a.indexOf(v)===i).map(m=>`<option ${m===model?'selected':''}>${m}</option>`).join('')}</select></label>
        <label class="full">${T('Google AI Studio API kaliti')}<input id="rKey" type="password" value="${esc(key)}" placeholder="AIza…"></label></div>
      <div class="note">${T('«Nano Banana» — Google Gemini rasm modeli. Kalit faqat shu brauzerda saqlanadi; soʻrov toʻgʻridan-toʻgʻri Google API ga ketadi va kalit egasi hisobidan toʻlanadi. Kalit: aistudio.google.com → Get API key.')}</div>
      <button class="btn dark" id="rGo">${T('Render qilish')}</button><div id="rAct" style="display:flex;gap:6px;flex-wrap:wrap"></div></div></div>`;document.body.appendChild(ov);
  ov.querySelector('.x').onclick=()=>ov.remove();ov.querySelectorAll('[data-rp]').forEach(b=>b.onclick=()=>{ov.querySelectorAll('[data-rp]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#rTxt').value=T(RPRE[b.dataset.rp]);});
  $('#rGo').onclick=async()=>{const k=$('#rKey').value.trim(),m=$('#rMod').value;if(!k){PZ.toast(T('Google AI Studio API kalitini kiriting.'));return;}try{localStorage.setItem('kps_gem_key',k);localStorage.setItem('kps_gem_model',m);}catch(e){}
    const p=P(),styles=[...new Set(p.blds.map(b=>(STYLES[(b.fac&&b.fac.style)||p.p.fac0||'tsh']||STYLES.tsh)[0]))].join(', ');
    const prompt=`Photorealistic architectural visualization of this exact massing model. Keep the camera angle, building volumes, heights, footprints and positions exactly as in the input image — do not add or remove buildings. Turn the white context into realistic surroundings of a city in Uzbekistan (Tashkent): streets, plane trees and poplars, irrigation ditches (aryk), parked cars, people. Facade character: ${styles||'contemporary'}. Scene: ${$('#rTxt').value}. High quality, natural materials, realistic lighting, no text, no watermark.`;
    const btn=$('#rGo');btn.disabled=true;btn.textContent=T('Render qilinmoqda… (10–40 s)');
    try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':k},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:'image/png',data:shot.split(',')[1]}}]}],generationConfig:{responseModalities:['TEXT','IMAGE']}})});
      const j=await r.json();if(!r.ok)throw new Error((j.error&&j.error.message)||r.status);const part=((j.candidates||[])[0]||{}).content;const img=part&&part.parts.find(x=>x.inlineData||x.inline_data);if(!img)throw new Error(T('Model rasm qaytarmadi')+((part&&part.parts[0]&&part.parts[0].text)?': '+part.parts[0].text.slice(0,160):''));
      const d=img.inlineData||img.inline_data,src=`data:${d.mimeType||d.mime_type||'image/png'};base64,${d.data}`;$('#rOut').innerHTML=`<img src="${src}" style="width:100%;display:block">`;
      $('#rAct').innerHTML=`<a class="btn sm" download="render.png" href="${src}">${T('Yuklab olish')}</a><button class="btn sm ghost" id="rAlb">${T('Albomga →')}</button>`;
      $('#rAlb').onclick=async()=>{await PZ.putMat({id:'rnd'+PZ.uid(),kind:'png',name:T('AI render')+' · '+(p.name||''),src,thumb:src,aspect:ren.domElement.width/ren.domElement.height,sub:m,t:new Date().toISOString()});PZ.toast(T('Albomga yuborildi.'));};}
    catch(e){PZ.toast(T('Render bajarilmadi: ')+e.message);}btn.disabled=false;btn.textContent=T('Render qilish');};}
/* ===================== INTERFEYS ===================== */
function ui(box){const css=document.createElement('style');css.textContent=`
#m3Bar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:2px;background:#fff;border:1px solid #dedcd7;box-shadow:0 6px 20px rgba(0,0,0,.08);padding:4px;z-index:5}
#m3Bar button{border:0;background:none;height:34px;padding:0 10px;font:12.5px Archivo,sans-serif;letter-spacing:.06em;display:flex;align-items:center;gap:6px;color:#141414;cursor:pointer}#m3Bar button[aria-pressed=true]{background:#141414;color:#f4f3f1}#m3Bar .dv{width:1px;background:#dedcd7;margin:4px 3px}
#m3Bar svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.5}
#m3Sun{position:absolute;left:14px;top:14px;background:#fff;border:1px solid #dedcd7;padding:10px 12px;z-index:5;width:270px;font:13.5px Archivo,sans-serif;display:flex;flex-direction:column;gap:8px}
#m3Sun .r{display:flex;gap:6px;align-items:center}#m3Sun input[type=range]{flex:1}#m3Sun select{font:13.5px Archivo,sans-serif;border:1px solid #cfccc5;padding:3px}
#m3Sun .b{border:1px solid #cfccc5;background:#fff;padding:4px 8px;font:12px Archivo,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}#m3Sun .b[aria-pressed=true]{background:#141414;color:#fff;border-color:#141414}
#m3Info{position:absolute;right:14px;top:14px;max-width:390px;background:#141414;color:#f4f3f1;padding:10px 30px 10px 12px;font:13.5px/1.5 Archivo,sans-serif;z-index:6}#m3Info .x{position:absolute;right:6px;top:6px;border:0;background:none;color:#f4f3f1;cursor:pointer}
#m3Leg{position:absolute;left:14px;bottom:16px;display:flex;gap:8px;align-items:center;background:#fff;border:1px solid #dedcd7;padding:6px 10px;font:12.5px 'IBM Plex Mono',monospace;z-index:5}#m3Leg i{width:150px;height:10px;display:inline-block}
#m3Sel{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:#2f6feb;color:#fff;padding:6px 12px;font:13.5px Archivo,sans-serif;z-index:5}
#m3Add[hidden],#m3Info[hidden],#m3Leg[hidden],#m3Sel[hidden]{display:none!important}
#m3Add{position:absolute;bottom:62px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #141414;z-index:6;display:flex;flex-direction:column;min-width:290px}#m3Add button{border:0;background:none;text-align:left;padding:8px 12px;font:14px Archivo,sans-serif;cursor:pointer}#m3Add button:hover,#m3Add button[aria-pressed=true]{background:#141414;color:#fff}`;document.head.appendChild(css);
  const ic=d=>`<svg viewBox="0 0 24 24">${d}</svg>`;
  box.insertAdjacentHTML('beforeend',`<div id="m3Sun"><div class="r"><b style="font-weight:500">${T('Quyosh va soya')}</b><span style="flex:1"></span><button class="b" id="m3Play">▶</button></div>
    <div class="r"><select id="m3D">${[['03-22','22 mart'],['04-22','22 aprel'],['06-22','22 iyun'],['09-22','22 sentabr'],['12-22','22 dekabr']].map(([v,t])=>`<option value="${v}" ${v===sunD?'selected':''}>${T(t)}</option>`).join('')}</select><span id="m3TL" style="font-family:'IBM Plex Mono';font-size:12.5px"></span></div>
    <input type="range" id="m3T" min="4.5" max="20" step=".05" value="${sunT}">
    <div class="r" style="flex-wrap:wrap"><button class="b" id="m3Sh" aria-pressed="true">${T('Soyalar')}</button><button class="b" id="m3Heat">${T('Soya xaritasi')}</button><button class="b" id="m3Fac">${T('Fasad insolyatsiyasi')}</button></div>
    <div class="r"><span style="font-size:12.5px;color:#696969">${T('Navigatsiya')}</span><select id="m3Nav" style="flex:1">${Object.entries(NAV).map(([k,v])=>`<option value="${k}" ${k===(nav||'arch')?'selected':''}>${v[0]}</option>`).join('')}</select></div></div>
    <div id="m3Info" hidden></div><div id="m3Leg" hidden></div><div id="m3Sel" hidden></div><div id="m3Add" hidden>${Object.entries(TYPO).map(([k,v])=>`<button data-ty="${k}" aria-pressed="${k===addType}">${T(v[0])}</button>`).join('')}</div>
    <div id="m3Bar"><button data-m3="sel" aria-pressed="true" title="${T('Tanlash va tahrirlash')}">${ic('<path d="M5 3l12 7-5 1.5L10 17z"/>')}${T('Tanlash')}</button><button data-m3="add" title="${T('Bino qoʻshish')}">${ic('<path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5"/>')}${T('Bino qoʻshish')} ▾</button>
      <button id="m3Plan" title="${T('Tanlangan binoning qavat rejasi')}">${ic('<path d="M4 4h16v16H4zM4 12h9M13 4v16M13 15h7"/>')}${T('Qavat rejasi')}</button><span class="dv"></span><button id="m3Fit" title="${T('Butun loyiha')}">${ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button><button id="m3Top" title="${T('Yuqoridan')}">${ic('<rect x="5" y="5" width="14" height="14"/>')}</button><button id="m3Iso" title="${T('Aksonometriya')}">${ic('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5M12 12v9M12 12L4 7.5"/>')}</button>
      <span class="dv"></span><button id="m3Ctx" title="${T('Atrofdagi binolar va koʻchalarni yuklash (OSM)')}">${ic('<path d="M3 21V10l5-3v14M8 21V5l6-3v19M14 21v-9l7-3v12"/>')}OSM</button><button id="m3Png" title="PNG">${ic('<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>')}PNG</button><button id="m3Alb" title="${T('Joriy 3D koʻrinishni albomga yuborish')}">${ic('<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>')}${T('Albomga')}</button><button id="m3Rnd" title="${T('AI render')}">${ic('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>')}${T('AI render')}</button></div>`);
  $('#m3T').oninput=e=>{sunT=+e.target.value;setSun();};$('#m3D').onchange=e=>{sunD=e.target.value;setSun();if(heat)heatMap();if(facMap)facadeHeat(facMap.id);};
  $('#m3Play').onclick=e=>{playT=!playT;e.target.textContent=playT?'❚❚':'▶';};$('#m3Sh').onclick=e=>{sunOn=!sunOn;e.target.setAttribute('aria-pressed',sunOn);setSun();};
  $('#m3Heat').onclick=e=>{if(heat){heat=null;fxG.children.filter(c=>c.userData.heat).forEach(c=>fxG.remove(c));e.target.setAttribute('aria-pressed',false);legend();dirty=true;return;}e.target.textContent=T('Hisoblanmoqda…');setTimeout(()=>{heatMap();e.target.textContent=T('Soya xaritasi');e.target.setAttribute('aria-pressed',true);info(`<b>${T('Soya xaritasi')}</b> · ${T(sunDLabel())} · ${T('yer sathida quyosh tushadigan soatlar (atrofdagi va loyiha binolari soyasi bilan)')}`);},30);};
  $('#m3Fac').onclick=e=>{if(facMap){facMap=null;fxG.children.filter(c=>c.userData.fac).forEach(c=>fxG.remove(c));e.target.setAttribute('aria-pressed',false);legend();info('');dirty=true;return;}const id=selId();if(!id){PZ.toast(T('Avval binoni tanlang.'));return;}e.target.textContent=T('Hisoblanmoqda…');setTimeout(()=>{facadeHeat(id);e.target.textContent=T('Fasad insolyatsiyasi');e.target.setAttribute('aria-pressed',true);},30);};
  $('#m3Nav').onchange=e=>{nav=e.target.value;try{localStorage.setItem('kps_nav',nav);}catch(x){}PZ.toast(T(NAV[nav][1]));};
  document.querySelectorAll('[data-m3]').forEach(b=>b.onclick=()=>{if(b.dataset.m3==='add'){const a=$('#m3Add');a.hidden=!a.hidden;if(!a.hidden){setTool('add');PZ.toast(T('Tipologiyani tanlang va xaritada joyni bosing.'));}else setTool('sel');return;}setTool('sel');});
  document.querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>{addType=b.dataset.ty;document.querySelectorAll('[data-ty]').forEach(x=>x.setAttribute('aria-pressed',x===b));setTool('add');});
  $('#m3Fit').onclick=()=>{camS.tx=camS.tz=0;camS.r=Rad*2.4;camS.ph=.9;dirty=true;};$('#m3Top').onclick=()=>{camS.ph=.09;dirty=true;};$('#m3Iso').onclick=()=>{camS.ph=.95;camS.th=-.79;dirty=true;};
  $('#m3Ctx').onclick=()=>PZ.loadCtx();$('#m3Png').onclick=()=>{hlG.visible=false;ren.render(scene,cam);setTimeout(()=>{hlG.visible=true;dirty=true;},50);const a=document.createElement('a');a.href=ren.domElement.toDataURL('image/png');a.download=(P().name||'massing')+'-3d.png';a.click();};$('#m3Alb').onclick=async()=>{hlG.visible=false;ren.render(scene,cam);const src=ren.domElement.toDataURL('image/png');hlG.visible=true;dirty=true;const sub=[$('#m3TL')?$('#m3TL').textContent:'',$('#m3Heat')&&$('#m3Heat').getAttribute('aria-pressed')==='true'?T('soya xaritasi'):'',$('#m3Fac')&&$('#m3Fac').getAttribute('aria-pressed')==='true'?T('fasad insolyatsiyasi'):''].filter(Boolean).join(' · ');
    await PZ.putMat({id:'m3'+PZ.uid(),kind:'png',name:T('3D koʻrinish')+' · '+(P().name||''),src,thumb:src,aspect:ren.domElement.width/ren.domElement.height,sub,t:new Date().toISOString()});PZ.toast(T('Albomga yuborildi.'));};$('#m3Rnd').onclick=renderDlg;$('#m3Plan').onclick=()=>{const b=P().blds.find(x=>x.id===selId())||P().blds[0];if(!b){PZ.toast(T('Avval bino qoʻshing.'));return;}PZ.openPlan(b);};}
const sunDLabel=()=>({'03-22':'22 mart','04-22':'22 aprel','06-22':'22 iyun','09-22':'22 sentabr','12-22':'22 dekabr'}[sunD]);
function setTool(t){tool=t;document.querySelectorAll('[data-m3]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m3===t));if(t!=='add'){const a=$('#m3Add');if(a)a.hidden=true;}if(ren)ren.domElement.style.cursor=t==='add'?'crosshair':'default';}
function navDlg(){const ov=document.createElement('div');ov.className='fpw';ov.style.placeItems='center';ov.innerHTML=`<div style="background:#fff;border:1px solid #141414;max-width:520px;width:100%;margin:auto;padding:20px"><h3 style="margin:0 0 4px;font:500 20px Archivo">${T('Qaysi dasturdan kelyapsiz?')}</h3><div class="note" style="margin-bottom:12px">${T('3D da sichqoncha shu dasturdagidek ishlaydi. Keyin chap yuqoridagi panelda oʻzgartirish mumkin.')}</div>
  ${Object.entries(NAV).map(([k,v])=>`<label style="display:flex;gap:10px;align-items:flex-start;border:1px solid #dedcd7;padding:10px;margin-bottom:6px;cursor:pointer"><input type="radio" name="nv" value="${k}" ${k==='archicad'?'checked':''}><span><b style="font-weight:500">${v[0]}</b><br><span class="note">${T(v[1])}</span></span></label>`).join('')}
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn sm ghost" id="nvSkip">${T('Oʻtkazib yuborish')}</button><button class="btn sm dark" id="nvOk">${T('Davom ettirish')}</button></div></div>`;document.body.appendChild(ov);
  const done=v=>{nav=v;try{localStorage.setItem('kps_nav',v);}catch(e){}const s=$('#m3Nav');if(s)s.value=v;ov.remove();};$('#nvSkip').onclick=()=>done('arch');$('#nvOk').onclick=()=>done(ov.querySelector('[name=nv]:checked').value);}
if(window.PZ&&PZ.refresh)setTimeout(PZ.refresh,0);
window.M3D={open,update:()=>{if(ok)rebuild(false);},capture:()=>ok?(ren.render(scene,cam),ren.domElement.toDataURL('image/png')):null,_state:()=>({camS,tool,nav,Rad,n:prjG?prjG.children.length:0})};
})();
