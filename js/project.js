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
/* loyihaga tegishli maʼlumot — loyiha almashtirilganda nusxalanadi, oʻchirilganda tozalanadi (loyiha.html, bosh sahifa) */
const LS_KEYS=['kps_project','kps_params','kps_mr_doc','kps_mr_vars','kps_mr_blds','kps_mr_tep','kps_tx','kps_view','kps_v1','kps_saves','kps_posadka','kps_posadka_sum','kps_area_sum','kps_ai_sites','kps_official','kps_mrp','kps_mrp_ext','kps_site','kps_site_seen_studio'];
// albom, albom materiallari, yuklangan qatlamlar, tahlil qatlamlari, saqlangan tahlillar va foydalanuvchi 3D modellari
const IDB_ALL=[['kps_maket','docs'],['kps_mat','mats'],['kps_data','layers'],['kps_layers','g'],['kps_ai_runs','runs'],['kps_assets','a']];
const IDB_OPT={kps_assets:{keyPath:'id',autoIncrement:true}};
window.KPSPRJ={buildings,summary,publishMr,onChange,KEYS,LS_KEYS,IDB_ALL,IDB_OPT};
})();
