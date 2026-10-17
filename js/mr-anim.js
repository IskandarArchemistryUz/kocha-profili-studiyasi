/* Archemistry Lab — Master reja muharriri: «Koʻrib tushunish» sahnalari (kanvasdagi Animatsiyalar doskasi asosida).
   Asbob birinchi tanlanganda xarita burchagida 4,5 soniyalik qisqa sahna chiqadi; panel sarlavhasidagi «?» bilan qayta ochiladi.
   Faqat chiziq va urgʻu rangi, ovozsiz. «Harakatni kamaytirish» yoqilgan boʻlsa — sahna oxirgi kadri rasm boʻlib turadi
   (har elementning asosiy uslubi = oxirgi kadr; harakat faqat keyframes da). */
window.MRANIM=(function(){
'use strict';
const T=s=>window.kpsT?window.kpsT(s):s;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SEEN_KEY='kps_mr_seen';
const CSS=`
.xa{position:absolute;right:16px;bottom:48px;width:320px;background:#fff;border:1px solid #141414;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:5;font-family:inherit}
.xa[hidden]{display:none}
.xa svg{display:block;width:100%;height:auto}
.xa figcaption{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px}
.xa .xk{font:500 10.5px var(--mono,monospace);letter-spacing:.12em;color:#5e5c58;text-transform:uppercase}
.xa .xt{font-size:15px;font-weight:500}
.xa .xd{font-size:13px;color:#5e5c58;line-height:1.45}
.xa .xx{position:absolute;top:6px;right:6px;width:28px;height:28px;border:0;background:rgba(255,255,255,.9);font-size:18px;cursor:pointer;line-height:1}
.xa .xb{display:flex;gap:8px;margin-top:6px}.xa .xb button{height:28px;padding:0 10px;border:1px solid #141414;background:#fff;font:500 11px var(--mono,monospace);letter-spacing:.06em;cursor:pointer}
.xa .fb{transform-box:fill-box;transform-origin:center}
.xa .fbb{transform-box:fill-box;transform-origin:center bottom}
.xa.pz *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.xa *{animation:none!important}}
@keyframes xdraw{0%{stroke-dashoffset:400}45%,100%{stroke-dashoffset:0}}
@keyframes xpop{0%,8%{transform:scale(0)}14%{transform:scale(1.4)}20%,100%{transform:scale(1)}}
@keyframes xshow{0%,48%{opacity:0}56%,100%{opacity:1}}
@keyframes xshowE{0%,70%{opacity:0}78%,100%{opacity:1}}
@keyframes xfill{0%,15%{fill:#ffffff}25%,100%{}}
@keyframes xrip{0%{transform:scale(0);opacity:0}5%{opacity:1}25%,100%{transform:scale(2.6);opacity:0}}
@keyframes xgrow{0%,20%{transform:scaleY(0)}55%,100%{transform:scaleY(1)}}
@keyframes xinset{0%{stroke-dashoffset:300;opacity:0}5%{opacity:1}25%,100%{stroke-dashoffset:0}}
@keyframes xmove{0%,20%{transform:translate(-34px,0)}50%,100%{transform:translate(0,0)}}
@keyframes xup{0%,55%{transform:scaleY(.82)}75%,100%{transform:scaleY(1)}}
@keyframes xsun{0%{transform:rotate(-70deg)}100%{transform:rotate(70deg)}}
@keyframes xshad{0%{transform:skewX(55deg)}100%{transform:skewX(-55deg)}}
.xa .a-draw{stroke-dasharray:400;animation:xdraw 4.5s ease-in-out infinite}
.xa .a-draw2{stroke-dasharray:400;animation:xdraw 4.5s ease-in-out infinite;animation-delay:.6s}
.xa .a-pop{animation:xpop 4.5s infinite}
.xa .a-show{animation:xshow 4.5s infinite}
.xa .a-showE{animation:xshowE 4.5s infinite}
.xa .a-rip{animation:xrip 4.5s ease-out infinite}
.xa .a-grow{animation:xgrow 4.5s cubic-bezier(.2,.8,.2,1) infinite}
.xa .a-inset{stroke-dasharray:300;animation:xinset 4.5s ease-out infinite}
.xa .a-move{animation:xmove 4.5s cubic-bezier(.4,0,.2,1) infinite}
.xa .a-up{animation:xup 4.5s cubic-bezier(.2,.8,.2,1) infinite}
.xa .a-sun{transform-origin:190px 205px;animation:xsun 4.5s ease-in-out infinite alternate}
.xa .a-shad{transform-box:fill-box;transform-origin:center top;animation:xshad 4.5s ease-in-out infinite alternate}
`;
const ROAD=(d,c)=>`<path d="${d}" fill="none" stroke="#55585c" stroke-width="20"${c?` class="${c}"`:''}/>`;
const RED=d=>`<path d="${d}" fill="none" stroke="#b23a2e" stroke-width="1.2" stroke-dasharray="8 2 2 2"/>`;
const TAG=(x,y,w,t,c)=>`<g class="${c||'a-show'}"><rect x="${x}" y="${y}" width="${w}" height="18" fill="#141414"/><text x="${x+w/2}" y="${y+13}" fill="#fff" font-family="IBM Plex Mono, monospace" font-size="10" text-anchor="middle">${t}</text></g>`;
const SC={
  street:{k:'2 · Koʻchalar · koʻcha chizish',t:'Nuqtalarni bosing, Enter — tugatish',d:'Mavjud koʻcha yoki tugunga bossangiz — ulanib, chorraha hosil boʻladi. Qizil chiziqlar tanlangan modul kengligidan.',
    svg:`<rect width="380" height="240" fill="#eceae4"/>
      <g fill="#dedbd3"><rect x="18" y="18" width="150" height="80"/><rect x="212" y="18" width="150" height="80"/><rect x="18" y="146" width="150" height="76"/><rect x="212" y="146" width="150" height="76"/></g>
      ${ROAD('M18 122H362','a-draw')}${ROAD('M190 18V222','a-draw2')}
      <g class="a-showE">${RED('M18 111H179M201 111H362M18 133H179M201 133H362M179 18V111M201 18V111M179 133V222M201 133V222')}</g>
      <circle class="fb a-pop" cx="18" cy="122" r="5" fill="#f0b323" stroke="#141414" stroke-width="1.5"/>
      <circle class="fb a-pop" style="animation-delay:.9s" cx="362" cy="122" r="5" fill="#fff" stroke="#141414" stroke-width="1.5"/>
      <circle class="fb a-pop" style="animation-delay:1.6s" cx="190" cy="18" r="5" fill="#fff" stroke="#141414" stroke-width="1.5"/>
      <circle class="fb a-pop" style="animation-delay:2.4s" cx="190" cy="122" r="6" fill="#141414" stroke="#fff" stroke-width="1.5"/>
      ${TAG(204,138,64,'chorraha','a-showE')}${TAG(222,58,78,'22 m modul')}`},
  zone:{k:'2 · Kvartallar · zonalash',t:'Kvartallar oʻzi chiqadi — zonani tanlab bosing',d:'Koʻchalar orasidagi har boʻlak — kvartal. Zona kvartal ichidagi nuqtaga bogʻlanadi: koʻcha surilsa ham joyida qoladi.',
    svg:`<rect width="380" height="240" fill="#eceae4"/>
      <rect class="zf" x="18" y="18" width="160" height="92" fill="#f1dca6" stroke="#141414" stroke-opacity=".45" style="animation:xfill 4.5s infinite"/>
      <rect x="202" y="18" width="160" height="92" fill="#9fcb88" stroke="#141414" stroke-opacity=".45" style="animation:xfill 4.5s infinite;animation-delay:.8s"/>
      <rect x="18" y="134" width="160" height="88" fill="#93b9dc" stroke="#141414" stroke-opacity=".45" style="animation:xfill 4.5s infinite;animation-delay:1.6s"/>
      <rect x="202" y="134" width="160" height="88" fill="#e6b483" stroke="#141414" stroke-opacity=".45" style="animation:xfill 4.5s infinite;animation-delay:2.4s"/>
      ${ROAD('M18 122H362')}${ROAD('M190 18V222')}${RED('M18 111H179M201 111H362M18 133H179M201 133H362')}
      ${[[98,64,0],[282,64,.8],[98,178,1.6],[282,178,2.4]].map(([x,y,d])=>`<circle class="fb a-rip" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="10" fill="none" stroke="#141414" stroke-width="2"/>`).join('')}
      ${TAG(52,56,92,'turar joy','a-showE')}${TAG(246,170,72,'aralash','a-showE')}`},
  gen:{k:'3 · Generatsiya',t:'Kvartalni bosing — tipologiya, FAR, qavat',d:'Binolar qizil chiziqdan chekinib, kvartal yoʻnalishi boʻylab oʻzi joylashadi. Aholi va zichlik darrov hisoblanadi.',
    svg:`<rect width="380" height="240" fill="#eceae4"/>
      <rect x="30" y="24" width="320" height="192" fill="#f1dca6" stroke="#141414" stroke-opacity=".5"/>
      <rect class="a-inset" x="48" y="42" width="284" height="156" fill="none" stroke="#b23a2e" stroke-width="1.2" stroke-dasharray="6 3"/>
      ${[0,1,2,3].map(i=>`<rect class="fbb a-grow" style="animation-delay:${.35*i}s" x="58" y="${52+i*38}" width="264" height="18" fill="#fbfaf7" stroke="#141414" stroke-width="1.2"/>`).join('')}
      ${TAG(140,4,100,'FAR 2,5 · 9 qav.')}${TAG(40,206,118,'aholi 6 596 kishi','a-showE')}`},
  bino:{k:'4 · Binolar',t:'Binoni sudrang, + / − qavat',d:'Birinchi qoʻlda oʻzgarishda kvartal qulflanadi: koʻcha surilsa ham binolar joyida qoladi, chegaradan chiqqani qizil.',
    svg:`<rect width="380" height="240" fill="#eceae4"/>
      <rect x="30" y="24" width="320" height="192" fill="#f1dca6" stroke="#141414" stroke-opacity=".5"/>
      <rect x="58" y="52" width="70" height="136" fill="#fbfaf7" stroke="#141414" stroke-width="1.2"/>
      <rect x="252" y="52" width="70" height="136" fill="#fbfaf7" stroke="#141414" stroke-width="1.2"/>
      <g class="a-move"><g class="fbb a-up"><rect x="160" y="52" width="60" height="136" fill="#7fb0e0" stroke="#141414" stroke-width="1.5"/><path d="M160 70h60M160 88h60M160 106h60M160 124h60M160 142h60M160 160h60" stroke="#fff" stroke-opacity=".7"/></g>
        <path d="M200 130l0 17 4.5-4.5 3.5 7.5 3-1.5-3.5-7.5h6.5z" fill="#141414" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></g>
      ${TAG(150,28,80,'9 → 11 qav.','a-showE')}
      <g class="a-showE"><rect x="36" y="196" width="84" height="16" fill="#fff"/><text x="44" y="208" font-family="IBM Plex Mono, monospace" font-size="10" fill="#141414">K-1</text><rect x="70" y="200" width="8" height="7" fill="#141414"/><path d="M71.5 200v-2a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="#141414" stroke-width="1.3"/></g>`},
  tek:{k:'Tekshiruv · linzalar',t:'Soya, insolyatsiya, shamol, 15 daqiqa',d:'Linzalar oʻng panelda, har qanday asbobda yoqiladi. Talablarni ShNQ dan kiritasiz — natija nuqta va ranglarda.',
    svg:`<rect width="380" height="240" fill="#eceae4"/>
      <path d="M40 205a150 150 0 0 1 300 0" fill="none" stroke="#d9d7d2" stroke-dasharray="4 4"/>
      <g class="a-sun"><circle cx="190" cy="65" r="11" fill="#f0b323" stroke="#141414"/></g>
      ${[90,170,250].map(x=>`<rect class="a-shad" x="${x}" y="205" width="40" height="26" fill="#1f2b3d" fill-opacity=".3"/><rect x="${x}" y="125" width="40" height="80" fill="#fbfaf7" stroke="#141414" stroke-width="1.2"/>`).join('')}
      ${[[96,215,'#2e7d4f'],[110,215,'#2e7d4f'],[176,215,'#b3261e'],[190,215,'#2e7d4f'],[256,215,'#2e7d4f'],[270,215,'#b3261e']].map(([x,y,c],i)=>`<circle class="a-showE" cx="${x}" cy="${y-80}" r="4" fill="${c}" stroke="#fff"/>`).join('')}
      ${TAG(12,12,96,'22 aprel 12:25','a-show')}`}
};
let el=null,cur=null,timer=0;
function seen(){try{return JSON.parse(localStorage.getItem(SEEN_KEY)||'{}')||{};}catch(_){return {};}}
function markSeen(k){try{const s=seen();s[k]=1;localStorage.setItem(SEEN_KEY,JSON.stringify(s));}catch(_){}}
function ensure(host){if(el)return el;const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  el=document.createElement('figure');el.className='xa';el.hidden=true;el.setAttribute('role','dialog');(host||document.body).appendChild(el);return el;}
function show(k,host){const s=SC[k];if(!s)return false;ensure(host);cur=k;clearTimeout(timer);
  el.innerHTML=`<button class="xx" aria-label="${esc(T('Yopish'))}">${KIC.i('x')}</button><svg viewBox="0 0 380 240" role="img" aria-label="${esc(T(s.t))}">${s.svg}</svg>
    <figcaption><span class="xk">${esc(T(s.k))}</span><span class="xt">${esc(T(s.t))}</span><span class="xd">${esc(T(s.d))}</span>
    <div class="xb"><button data-x="ok">${esc(T('Tushunarli'))}</button><button data-x="pz">${KIC.i('pause','b',14)}${esc(T('Toʻxtatish'))}</button></div></figcaption>`;
  el.classList.remove('pz');el.hidden=false;markSeen(k);
  el.querySelector('.xx').onclick=hide;el.querySelector('[data-x=ok]').onclick=hide;
  el.querySelector('[data-x=pz]').onclick=e=>{const p=el.classList.toggle('pz');e.currentTarget.innerHTML=KIC.i(p?'play':'pause','b',14)+esc(T(p?'Davom ettirish':'Toʻxtatish'));};
  timer=setTimeout(()=>{if(cur===k)hide();},14000);   // 3 marta koʻrsatib, oʻzi yopiladi
  return true;}
function hide(){if(el)el.hidden=true;cur=null;clearTimeout(timer);}
/* asbob birinchi marta tanlanganda */
function first(k,host){if(!SC[k]||seen()[k])return false;return show(k,host);}
return {show,hide,first,has:k=>!!SC[k],get open(){return !!(el&&!el.hidden);},get cur(){return cur;}};
})();
