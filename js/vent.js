/* Archemistry Lab — shamol (ventilyatsiya) indeksi: soddalashtirilgan oqim modeli.
   Shamol boʻlimidagi (shamol.html) model bilan bir xil formulalar: har yoʻnalish uchun katak toʻri shamol
   tomondan pastga qarab aylanib chiqiladi; binolarning frontal maydoni zichligi (λf) havoni soʻndiradi,
   bino ortida havo masofa va toʻsiq balandligiga qarab tiklanadi. Natija — 0…1 indeks (1 = ochiq joydagi oqim).
   Bu CFD emas: koʻchalar va hovlilarda havo qayerda turib qolishini nisbiy taqqoslash uchun.
   Kirish/chiqish — mahalliy metr tekisligi (x — sharq, y — shimol). */
window.VENT=(function(){
'use strict';
const DIRS=16,DEG=Math.PI/180;
const NAMES=['Sh','ShShSh','ShSh','ShShQ','Q','JShQ','JSh','JJSh','J','JJG','JG','GJG','G','GShG','ShG','ShShG'];
const DEF={beta:1.0,lr:150};   // shamol.html dagi standart qiymatlar
function polyArea(p){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return Math.abs(a/2);}
function inPoly(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
/* toʻr: [x0,y0,x1,y1] chegarasi, katak — avto (10–40 m, ≤ 160 000 katak) */
function makeGrid(bb,cell){const W=bb[2]-bb[0],H=bb[3]-bb[1];let dx=cell||Math.max(10,Math.min(40,Math.round(Math.max(W,H)/300)));
  while((W/dx)*(H/dx)>160000)dx*=1.25;
  const nx=Math.ceil(W/dx),ny=Math.ceil(H/dx),g={x0:bb[0],y0:bb[1],dx,nx,ny,N:nx*ny,orders:[]};
  for(let k=0;k<DIRS;k++){const th=k*22.5*DEG,ux=-Math.sin(th),uy=-Math.cos(th),s=new Float32Array(g.N),idx=new Uint32Array(g.N);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const q=j*nx+i;s[q]=i*ux+j*uy;idx[q]=q;}
    g.orders.push(idx.sort((a,b)=>s[a]-s[b]));}
  return g;}
/* bino: {pts:[[x,y]…] (yopilmagan halqa), h} */
function frac(b,g){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;b.pts.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);});
  const st=Math.max(1.5,Math.min(g.dx/3,Math.max(x1-x0,y1-y0)/4)),m=new Map();let tot=0;
  for(let y=y0+st/2;y<y1;y+=st)for(let x=x0+st/2;x<x1;x+=st){if(!inPoly(x,y,b.pts))continue;
    const i=Math.floor((x-g.x0)/g.dx),j=Math.floor((y-g.y0)/g.dx);if(i<0||j<0||i>=g.nx||j>=g.ny)continue;const q=j*g.nx+i;m.set(q,(m.get(q)||0)+1);tot++;}
  if(!tot){const cx=(x0+x1)/2,cy=(y0+y1)/2,i=Math.floor((cx-g.x0)/g.dx),j=Math.floor((cy-g.y0)/g.dx);if(i>=0&&j>=0&&i<g.nx&&j<g.ny){m.set(j*g.nx+i,1);tot=1;}}
  return {m,tot};}
function geometry(list,g){const lf=[];for(let k=0;k<DIRS;k++)lf.push(new Float32Array(g.N));const lp=new Float32Array(g.N),hmax=new Float32Array(g.N),A=g.dx*g.dx;
  for(const b of list){const {m,tot}=frac(b,g);if(!tot)continue;const area=polyArea(b.pts);
    const w=[];for(let k=0;k<DIRS;k++){const th=k*22.5*DEG,nx=Math.cos(th),ny=-Math.sin(th);let lo=Infinity,hi=-Infinity;for(const [x,y] of b.pts){const v=x*nx+y*ny;if(v<lo)lo=v;if(v>hi)hi=v;}w.push(hi-lo);}
    for(const [q,c] of m){const f=c/tot;for(let k=0;k<DIRS;k++)lf[k][q]+=w[k]*b.h*f/A;lp[q]+=area*f/A;if(b.h>hmax[q])hmax[q]=b.h;}}
  return {lf,lp,hmax};}
function ventilate(geo,g,p,only){p=Object.assign({},DEF,p||{});
  const out=[],nx=g.nx,ny=g.ny,done=new Uint8Array(g.N),att=Math.exp(-p.beta*g.dx/100),dx=g.dx;
  for(let k=0;k<DIRS;k++){if(only&&!only.includes(k)){out.push(null);continue;}
    const th=k*22.5*DEG,ux=-Math.sin(th),uy=-Math.cos(th),px_=-uy,py_=ux;
    const lf=geo.lf[k],hm=geo.hmax,v=new Float32Array(g.N),hs=new Float32Array(g.N),ord=g.orders[k];done.fill(0);
    const samp=(fx,fy,arr,def)=>{const i0=Math.floor(fx),j0=Math.floor(fy),ax=fx-i0,ay=fy-j0;let s=0,w=0;
      const add=(ii,jj,ww)=>{if(ww<=0)return;if(ii<0||jj<0||ii>=nx||jj>=ny){s+=def*ww;w+=ww;}else{const m=jj*nx+ii;if(done[m]){s+=arr[m]*ww;w+=ww;}}};
      add(i0,j0,(1-ax)*(1-ay));add(i0+1,j0,ax*(1-ay));add(i0,j0+1,(1-ax)*ay);add(i0+1,j0+1,ax*ay);return w>0?s/w:def;};
    for(let qq=0;qq<g.N;qq++){const q=ord[qq],i=q%nx,j=(q-i)/nx,fx=i-ux,fy=j-uy;
      let pv=0.8*samp(fx,fy,v,1)+0.1*samp(fx+px_*0.7,fy+py_*0.7,v,1)+0.1*samp(fx-px_*0.7,fy-py_*0.7,v,1);
      let h=samp(fx,fy,hs,0);const L=lf[q];
      pv*=Math.pow(att,L)*(1-0.9*Math.min(1,geo.lp[q]));
      h=Math.max(h*Math.exp(-dx/(10*h+1)),hm[q]);
      const Lr=p.lr+5*h;pv+=(1-pv)*(1-Math.exp(-dx/Lr))*Math.exp(-L/0.12);
      v[q]=pv;hs[q]=h;done[q]=1;}
    out.push(v);}
  return out;}
/* ERA5 soatlik maʼlumotidan shamol gullari (shamol.html dagi bilan bir xil boʻlinish) */
const SLICES=[['sutka','Sutka'],['tun','Tun'],['tong','Tong'],['kunduz','Kun'],['kech','Kech']];
const SEASONS=[['yil','Yil'],['yoz','Yoz'],['qish','Qish']];
function buildRoses(time,sp,dir){const acc={};SEASONS.forEach(([s])=>{acc[s]={};SLICES.forEach(([k])=>acc[s][k]={cnt:new Array(DIRS).fill(0),sp:new Array(DIRS).fill(0),calm:0,n:0});});
  for(let i=0;i<time.length;i++){const v=sp[i],d=dir[i];if(v==null||d==null)continue;const t=time[i],hr=+t.slice(11,13),mo=+t.slice(5,7);
    const sl=(hr>=22||hr<6)?'tun':hr<10?'tong':hr<18?'kunduz':'kech';const ss=['yil'];if(mo>=6&&mo<=8)ss.push('yoz');if(mo===12||mo<=2)ss.push('qish');
    const sec=Math.round(((d%360)+360)%360/22.5)%DIRS;
    for(const s of ss)for(const k of ['sutka',sl]){const a=acc[s][k];a.n++;if(v<0.5)a.calm++;else{a.cnt[sec]++;a.sp[sec]+=v;}}}
  const out={};SEASONS.forEach(([s])=>{out[s]={};SLICES.forEach(([k])=>{const a=acc[s][k],m=a.n-a.calm;
    out[s][k]={freq:a.cnt.map(c=>m?c/m:0),speed:a.cnt.map((c,i)=>c?a.sp[i]/c:0),calm:a.n?a.calm/a.n:0,n:a.n};});});
  out.hours=time.length;return out;}
/* Open-Meteo arxivi (ERA5, 2015–2024); natija 0,05° katakka localStorage da saqlanadi */
async function loadRoses(lat,lon){const key='kps_wind_rose:'+lat.toFixed(2)+','+lon.toFixed(2);
  try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.yil)return c;}catch(_){}
  const url=`https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&start_date=2015-01-01&end_date=2024-12-31&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Asia%2FTashkent`;
  const res=await fetch(url);if(!res.ok)throw new Error('Open-Meteo: '+res.status);
  const h=(await res.json()).hourly;const r=buildRoses(h.time,h.wind_speed_10m,h.wind_direction_10m);
  try{localStorage.setItem(key,JSON.stringify(r));}catch(_){}
  return r;}
return {DIRS,NAMES,DEF,SLICES,SEASONS,makeGrid,geometry,ventilate,buildRoses,loadRoses};
})();
