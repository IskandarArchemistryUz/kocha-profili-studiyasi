/* Archemistry Lab — shahar bloklari: tarixiy va zamonaviy koʻcha toʻrlari analoglari.
   Har bir yozuv: blok oʻlchami (qizil chiziqlar orasidagi kvartal, m), koʻcha kengligi (qizil chiziqlar orasi, m),
   manba. Qiymat manbada boʻlmasa — yozilmaydi; hisoblangani «hisob» deb belgilanadi.
   Toʻr: koʻcha oʻqlari orasidagi qadam = blok + koʻcha kengligi. */
window.MRBLOK=(function(){
'use strict';
const L=[
  {id:'portland',n:'Portlend',bx:61,by:61,w:18,
   src:'Wikipedia, «Grid plan»: Portland bloki 200 × 200 fut (61 m); koʻcha kengligi manbada yoʻq — 18 m taxmin',
   note:'Eng kichik bloklar: koʻp chorraha, piyoda uchun qulay'},
  {id:'barselona',n:'Barselona — Eixample',bx:113,by:113,w:20,cham:20,
   src:'Wikipedia, «Grid plan»: 113 × 113 m, koʻchalar 20 m, katta koʻchalar 50 m; geographyfieldwork.com: tomoni 113,3 m, burchak 45° ga kesilgan',
   note:'Perimetral kvartal, ichki hovli; burchaklari kesilgan (chanfra)'},
  {id:'kioto',n:'Kioto — Heian-kyō',bx:120,by:120,w:12,
   src:'Okamoto Kimono, Kyoto shahar tarixi: bloklar «taxminan 120 m» tomonli; koʻcha kengligi manbada yoʻq — 12 m taxmin',
   note:'Machiya: tor va chuqur uchastkalar, blok ichida oʻtish yoʻllari'},
  {id:'manhattan',n:'Nyu-York — Manhattan',bx:274,by:61,w:18.3,
   src:'MCNY «The Greatest Grid»: barcha bloklar shimoldan janubga 200 fut (61 m); sharqdan gʻarbga 620–920 fut; koʻndalang koʻcha 60 fut (18,3 m), avenyu 100 fut (30,5 m). Wikipedia «City block»: standart 264 × 900 fut (80 × 274 m)',
   note:'Uzun ingichka bloklar: avenyular orasi katta, koʻchalar tez-tez'},
  {id:'chikago',n:'Chikago',bx:200,by:100,w:20,
   src:'Wikipedia, «City block»: odatiy blok 330 × 660 fut (100 × 200 m); koʻcha kengligi manbada yoʻq — 20 m taxmin',
   note:'Blok oʻrtasida xizmat yoʻlagi (alley) — Chikago tipik'},
  {id:'melburn',n:'Melburn — Hoddle Grid',bx:200,by:200,w:30,mid:10,
   src:'Wikipedia, «Hoddle Grid»: blok 10 chain (200 m) kvadrat; asosiy koʻchalar 1,5 chain (30 m); kichik koʻchalar 0,5 chain (10 m) bloklarni oʻrtasidan boʻladi',
   note:'Katta blok + oʻrtadan kichik koʻcha va laynlar (laneways)'},
  {id:'soltleyk',n:'Solt-Leyk-Siti — Plat of Zion',bx:201,by:201,w:40.2,
   src:'99% Invisible, «Plat of Zion»: bloklar 660 fut (201 m), koʻchalar 132 fut (40,2 m)',
   note:'Juda katta bloklar va keng koʻchalar — avtomobilga moʻljallangan'},
  {id:'savanna',n:'Savanna — Oglethorpe vardi',bx:200,by:200,w:23,
   src:'Wikipedia, «Oglethorpe Plan»: vard ≈ 10 akr (4 ga), vardlar orasidagi koʻchalar 45–120 fut (13,7–36,6 m). 200 m — 4 ga dan hisob; vard ichidagi bloklar oʻlchami manbada yoʻq',
   note:'Vard: markazda skver, atrofida 8 ta blok'},
  {id:'superilla',n:'Barselona — Superilla',bx:400,by:400,w:20,
   src:'Naider, «The first superblock in Barcelona»: 400 × 400 m superbloklar tizimi; ichkarida tezlik 10 km/soat; 9 ta Eixample bloki',
   note:'Tranzit faqat perimetrda, ichki koʻchalar piyoda/velo'},
  {id:'daha',n:'ShNQ — daha (≤ 10 ga)',bx:316,by:316,w:25,
   src:'ShNQ 2.07.01-23, 56-band: daha — koʻchalar bilan boʻlinmagan, maydoni 10 ga gacha; 316 m — 10 ga dan hisob; koʻcha kengligi — loyiha qiymati',
   note:'Meʼyordagi eng katta boʻlinmagan birlik'},
  {id:'mikrorayon',n:'Sovet mikrorayoni',bx:500,by:500,w:40,
   src:'Wikipedia, «Microdistrict»: 10–60 ga (baʼzan 80 ga gacha); kirishlar oraligʻi ≤ 300 m; xizmatlar ≤ 500 m. 500 m (25 ga) — oraliqdan tanlangan misol',
   note:'Chilonzor kabi: katta superblok, ichida erkin turuvchi binolar'}];
const byId=id=>L.find(x=>x.id===id)||null;
/* uchastka ichida toʻr: oʻqlar orasi blok+koʻcha. ang — koʻchalar yoʻnalishi (shimoldan, °).
   Qaytadi: [[ [lng,lat],[lng,lat] ], …] — uchastka bilan kesilgan koʻcha oʻqlari; mid — oʻrta kichik koʻchalar alohida */
function grid(poly,t,ang,opt){opt=opt||{};const c=turf.centroid(poly).geometry.coordinates,rot=turf.transformRotate(poly,-ang,{pivot:c}),bb=turf.bbox(rot);
  const kx=1/(111320*Math.cos(c[1]*Math.PI/180)),ky=1/110540,sx=(t.bx+t.w)*kx,sy=(t.by+t.w)*ky,pad=1e-3;
  const out={main:[],mid:[]};
  /* toʻr uchastka markaziga nisbatan joylashadi: kvartal markazi = uchastka markazi */
  const x0=c[0]-Math.ceil((c[0]-bb[0])/sx+1)*sx+sx/2,y0=c[1]-Math.ceil((c[1]-bb[1])/sy+1)*sy+sy/2;
  const clip=(a,b,key)=>{const ln=turf.transformRotate(turf.lineString([a,b]),ang,{pivot:c});
    let segs=[];try{const sp=turf.lineSplit(ln,turf.polygonToLine(poly));segs=(sp.features.length?sp.features:[ln]);}catch(_){segs=[ln];}
    segs.forEach(s=>{const cs=s.geometry.coordinates;if(cs.length<2)return;const m=turf.along(s,turf.length(s)/2).geometry.coordinates;
      if(turf.booleanPointInPolygon(turf.point(m),poly)&&turf.length(s,{units:'meters'})>8)out[key].push([cs[0],cs[cs.length-1]]);});};
  for(let x=x0;x<=bb[2]+sx;x+=sx){if(x<bb[0]-sx)continue;clip([x,bb[1]-pad],[x,bb[3]+pad],'main');}
  for(let y=y0;y<=bb[3]+sy;y+=sy){if(y<bb[1]-sy)continue;clip([bb[0]-pad,y],[bb[2]+pad,y],'main');
    if(t.mid&&opt.mid!==false){const ym=y+sy/2;clip([bb[0]-pad,ym],[bb[2]+pad,ym],'mid');}}
  return out;}
return {L,byId,grid};
})();
