/* Archemistry Lab — loyiha binolarining yagona manbasi.
 * Asosiy oyna (Master reja muharriri) binolari va TEP «kps_mr_blds» / «kps_mr_tep» ga yoziladi
 * (format «Uchastkada joylashtirish» — kps_posadka / kps_posadka_sum bilan bir xil).
 * Boshqa boʻlimlar (Master reja koʻrsatkichlari, Shamol taʼsiri, Hudud bahosi) binolarni shu yerdan oladi:
 * asosiy oynada bino boʻlsa — oʻsha, boʻlmasa — «Uchastkada joylashtirish» binolari.
 */
(function(){
'use strict';
if(window.KPSPRJ)return;
const J=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
const KEYS=['kps_mr_blds','kps_mr_tep','kps_posadka','kps_posadka_sum'];
function buildings(){
  const M=J('kps_mr_blds');if(M&&M.blds&&M.blds.length)return {src:'mr',name:'Master reja',P:M};
  const P=J('kps_posadka');if(P&&P.blds&&P.blds.length)return {src:'posadka',name:'Uchastkada joylashtirish',P};
  return {src:null,name:null,P:M||P||null};
}
function summary(){
  const M=J('kps_mr_tep');if(M&&M.blds>0)return M;
  return J('kps_posadka_sum')||(M||null);
}
function publishMr(blds,tep){
  try{localStorage.setItem('kps_mr_blds',JSON.stringify(blds));localStorage.setItem('kps_mr_tep',JSON.stringify(tep));}catch(e){}
}
/* boshqa oynadan oʻzgarish kelganda */
function onChange(f){window.addEventListener('storage',e=>{if(KEYS.includes(e.key))f(e.key);});}
window.KPSPRJ={buildings,summary,publishMr,onChange,KEYS};
})();
