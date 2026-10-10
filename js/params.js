/* Archemistry Lab — yagona loyiha parametrlari.
   Har bir faraz bitta joyda: qiymat + manba. Barcha modullar shu yerdan oʻqiydi.
   Saqlash: localStorage 'kps_params' (loyiha snapshotiga kiradi, loyiha almashganda alohida).
   Faqat foydalanuvchi oʻzgartirgan qiymatlar saqlanadi; qolgani — standart.
   API: KP.get(k) · KP.set(k,v) · KP.reset(k) · KP.isDefault(k) · KP.meta(k) · KP.list() · KP.on(fn) · KP.migrate(k,v,oldDef) */
(function(){
  var KEY='kps_params';
  var DEF={
    hh:{v:3.54,u:'kishi',l:'Kishi / xonadon',src:'Mahalla pasportlari oʻrtacha koʻrsatkichi',use:'1-qadam xonadonlar soni, Joylashtirish aholisi, Master reja'},
    netGross:{v:0.7,u:'',l:'Sotiladigan (netto) / brutto koeffitsienti',src:'G8 zichlik modeli, TAS District, 2026-09-01',use:'Joylashtirish: sotiladigan turar joy'},
    park:{v:0.7,u:'joy / kvartira',l:'Avtoturargoh talabi',src:'Urbanizatsiya qoʻmitasi master-reja shabloni (ShNQ 2.07.01-23, §416)',use:'Joylashtirish: avtoturargoh talabi'},
    lvUnknown:{v:2,u:'qavat',l:'Qavati nomaʼlum bino',src:'Taxmin, loyiha muallifi tasdiqlagan (2026-10-10)',use:'1-qadam aholi bahosi, GIS zichlik, Joylashtirish insolyatsiyasi'},
    mppGross:{v:27,u:'m² / kishi',l:'Mavjud fondda brutto maydon kishiga',src:'Oʻzbekistonda 1 kishiga 19,2 m² yashash maydoni → brutto ≈ 27 m²',use:'1-qadam: mavjud aholi bahosi'},
    speed:{v:5,u:'km / soat',l:'Piyoda yurish tezligi',src:'Namuna',use:'1-qadam: 15 daqiqalik qamrov'}
  };
  var ORDER=['hh','netGross','park','lvUnknown','mppGross','speed'];
  function read(){try{var o=JSON.parse(localStorage.getItem(KEY)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
  function write(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}
  var subs=[];
  function emit(k){subs.forEach(function(f){try{f(k);}catch(e){}});}
  function num(v){if(v===''||v==null)return null;var n=+String(v).replace(',','.');return isFinite(n)?n:null;}
  var KP={
    keys:ORDER.slice(),
    get:function(k){var o=read(),v=num(o[k]);return v!=null?v:(DEF[k]?DEF[k].v:null);},
    set:function(k,v){if(!DEF[k])return;var o=read(),n=num(v);if(n==null||n===DEF[k].v)delete o[k];else o[k]=n;write(o);emit(k);},
    reset:function(k){var o=read();if(k)delete o[k];else ORDER.forEach(function(x){delete o[x];});write(o);emit(k||null);},
    isDefault:function(k){return num(read()[k])==null;},
    meta:function(k){var d=DEF[k];return d?{k:k,v:KP.get(k),def:d.v,u:d.u,l:d.l,src:KP.isDefault(k)?d.src:'Loyiha uchun oʻzgartirilgan (standart: '+String(d.v).replace('.',',')+' — '+d.src+')',use:d.use,custom:!KP.isDefault(k)}:null;},
    list:function(){return ORDER.map(KP.meta);},
    on:function(f){subs.push(f);},
    /* Eski modul qiymatini bir marta koʻchirish: agar u eski standartdan farq qilsa — foydalanuvchi tanlagan deb hisoblanadi. */
    migrate:function(k,v,oldDef){if(!DEF[k])return;var o=read();if(o['_m_'+k])return;o['_m_'+k]=1;var n=num(v);if(n!=null&&n!==oldDef&&n!==DEF[k].v&&num(o[k])==null)o[k]=n;write(o);},
    fmt:function(v){return v==null?'—':String(v).replace('.',',');}
  };
  /* boshqa oyna yoki iframe oʻzgartirsa */
  window.addEventListener('storage',function(e){if(e.key===KEY||e.key===null)emit(null);});
  window.KP=KP;
})();
