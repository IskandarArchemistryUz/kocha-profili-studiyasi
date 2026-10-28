/* Archemistry Lab — bosh sahifa (maket «Sayt v2»): til (uz · en · ru), tungi rejim, jonli model, loyihalar.
   Til va mavzu kalitlari ilova bilan umumiy: mr-lang (+ eski sahifalar uchun kps_lang), mr-theme. */
(function(){'use strict';
var D={
"Asosiy menyu":["Main menu","Главное меню"],"Master reja":["Master plan","Мастер-план"],"Asboblar":["Tools","Инструменты"],"Loyihalar":["Projects","Проекты"],"Atamalar":["Glossary","Глоссарий"],
"Til":["Language","Язык"],"Tungi rejim":["Dark mode","Тёмная тема"],"Loyihalarim":["My projects","Мои проекты"],"Bepul boshlash":["Start free","Начать бесплатно"],
"Master reja · shahar loyihasi uchun":["Master plan · for urban projects","Мастер-план · для городских проектов"],
"Bir qavat qoʻshing — maktab yetadimi, koʻrasiz.":["Add a floor — see whether the school still fits.","Добавьте этаж — и увидите, хватит ли школы."],
"Uchastkani chizing, binolarni qoʻying. Aholi, maktab va bogʻcha oʻrni, avtoturargoh har oʻzgarishda oʻzi qayta hisoblanadi — meʼyor bandi bilan.":["Draw the site, place the buildings. Population, school and kindergarten places and parking recalculate on every change — with the code clause.","Нарисуйте участок, поставьте здания. Население, места в школе и детсаду, машино-места пересчитываются при каждом изменении — с пунктом нормы."],
"Namuna loyiha":["Sample project","Пример проекта"],"Roʻyxatdan oʻtish shart emas · loyihalar brauzeringizda saqlanadi":["No sign-up needed · projects are stored in your browser","Регистрация не нужна · проекты хранятся в вашем браузере"],
"Sinab koʻring — qavatlar soni":["Try it — number of floors","Попробуйте — этажность"],"Qavatlar soni":["Number of floors","Этажность"],"Qavatlar":["Floors","Этажи"],"Uchastka aksonometriyasi":["Site axonometric","Аксонометрия участка"],
"Aholi":["Population","Население"],"Maktab oʻrni kerak":["School places needed","Нужно мест в школе"],"165 / 1000 aholi":["165 per 1,000 residents","165 на 1000 жителей"],"Bogʻcha oʻrni":["Kindergarten places","Места в детсаду"],"70 / 1000 aholi":["70 per 1,000 residents","70 на 1000 жителей"],
"Avtoturargoh":["Parking","Машино-места"],"1 joy / xonadon (Toshkent)":["1 space per apartment (Tashkent)","1 место на квартиру (Ташкент)"],
"Bitta loyiha — bir nechta asbob":["One project — several tools","Один проект — несколько инструментов"],"Master reja markazda. Qolganlari unga ulanadi.":["The master plan is at the center. Everything else connects to it.","В центре — мастер-план. Остальное подключается к нему."],
"Har bir asbobni alohida ham ochish mumkin — maʼlumot baribir bitta loyihada qoladi.":["Each tool also works on its own — the data still stays in one project.","Каждый инструмент работает и отдельно — данные всё равно остаются в одном проекте."],
"Asosiy asbob":["Core tool","Основной инструмент"],"Hududdan natijagacha: uchastka, koʻchalar, zonalar, hajmlar, quyosh, xonadonlar, xizmatlar va meʼyoriy tekshiruv — bitta 3D modelda.":["From area to result: site, streets, zones, massing, sun, apartments, amenities and code check — in one 3D model.","От территории до результата: участок, улицы, зоны, объёмы, солнце, квартиры, обслуживание и нормативная проверка — в одной 3D-модели."],
"Ochish →":["Open →","Открыть →"],"Transport va koʻcha":["Transport and streets","Транспорт и улицы"],"Joy va muhit tahlili":["Site and environment analysis","Анализ места и среды"],"Joyshunos":["Joyshunos","Joyshunos"],"Xaritada nuqtani tanlang: relyef, shamol, xizmatlar va raqobatchilar — joy pasportida. Manbalar ochiq: OSM, AWS Terrain, EPW.":["Pick a point on the map: terrain, wind, services and competitors in a site passport. Open sources: OSM, AWS Terrain, EPW.","Выберите точку на карте: рельеф, ветер, сервисы и конкуренты — в паспорте места. Открытые источники: OSM, AWS Terrain, EPW."],"Koʻchasoz":["Koʻchasoz","Koʻchasoz"],
"Koʻcha kesimi va rejasi: ShNQ va Dizayn-kod zonalari, muhandislik tarmoqlari, albom varagʻi. Master rejadagi har bir koʻcha shu yerda ochiladi.":["Street section and plan: norm (ShNQ) and Design Code zones, utilities, album sheet. Every master-plan street opens here.","Профиль и план улицы: зоны по ШНК и дизайн-коду, инженерные сети, лист альбома. Каждая улица мастер-плана открывается здесь."],
"Fasad va muhit qoidalari":["Facade and streetscape rules","Правила фасадов и среды"],"Dizayn-kod":["Design code","Дизайн-код"],
"Material, rang, balandlik va reklama qoidalari — peshlavha va joy tipi boʻyicha tekshiruv.":["Material, color, height and advertising rules — checks for signage and place type.","Правила материалов, цвета, высоты и рекламы — проверка вывесок и типа места."],
"Barcha chizmalar bir joyda":["All drawings in one place","Все чертежи в одном месте"],"Istalgan asbobdan «Chizmadonga yuborish» — varaqlar, shtamp, 24 namuna, PDF, PPTX va SVG.":["“Send to Chizmadon” from any tool — sheets, title block, 24 templates, PDF, PPTX and SVG.","«Отправить в Chizmadon» из любого инструмента — листы, штамп, 24 шаблона, PDF, PPTX и SVG."],
"Ochiq lugʻat":["Open glossary","Открытый словарь"],"Shaharsozlik atamalari: taʼrif, meʼyor bandi, chizma. Hamma uchun bepul.":["Urban planning terms: definition, code clause, diagram. Free for everyone.","Термины градостроительства: определение, пункт нормы, схема. Бесплатно для всех."],
"Qanday ulanadi":["How it connects","Как это связано"],"koʻchani bosing":["click a street","нажмите на улицу"],"kesim tayyor":["section ready","профиль готов"],"Chizmadonga yuborish":["Send to Chizmadon","Отправить в Chizmadon"],
"Asosiy ish — bepul.":["The core work is free.","Основная работа — бесплатно."],
"Chizish, tahrirlash, aholi, maktab va avtoturargoh hisobi, quyosh va shamol tahlili, varaqlar va eksport — hammasi brauzerda ishlaydi.":["Drawing, editing, population, school and parking calculations, sun and wind analysis, sheets and export — all run in the browser.","Рисование, редактирование, расчёт населения, школ и машино-мест, анализ солнца и ветра, листы и экспорт — всё работает в браузере."],
"Karta shart emas":["No card needed","Карта не нужна"],"Roʻyxatdan oʻtish shart emas":["No sign-up","Без регистрации"],"Loyiha faylga saqlanadi":["Projects save to a file","Проект сохраняется в файл"],
"Loyihalaringiz":["Your projects","Ваши проекты"],"shu brauzerda saqlanadi":["stored in this browser","хранятся в этом браузере"],"Avvalgi versiya loyihalari":["Previous-version projects","Проекты предыдущей версии"],"Hammasini zaxiralash":["Back up all","Сохранить все"],
"Barcha asboblar (oʻtish davri)":["All tools (transition period)","Все инструменты (переходный период)"],"yangi dizaynga koʻchirilmoqda":["moving to the new design","переносятся в новый дизайн"],
"Transport infratuzilmasi":["Transport infrastructure","Транспортная инфраструктура"],"koʻcha profili, tarmoq, chorrahalar":["street profile, network, intersections","профиль улицы, сеть, перекрёстки"],
"Koʻcha kesimi":["Street cross-section","Поперечный профиль улицы"],"profil va YHQ tekshiruvi":["profile and traffic-rules check","профиль и проверка ПДД"],
"Dizayn-kod: peshlavha":["Design code: signage","Дизайн-код: вывески"],"reklama va peshlavha qoidalari":["advertising and signage rules","правила рекламы и вывесок"],"Dizayn-kod: joy tipi":["Design code: place type","Дизайн-код: тип места"],"joy tipi boʻyicha qoidalar":["rules by place type","правила по типу места"],
"GIS tahlil":["GIS analysis","ГИС-анализ"],"hudud qatlamlari, relyef, issiqlik":["area layers, terrain, heat","слои территории, рельеф, жара"],"Shamol tahlili":["Wind analysis","Анализ ветра"],"shamol guli va oqim":["wind rose and flow","роза ветров и поток"],
"Hudud bahosi va AI":["Area assessment and AI","Оценка территории и ИИ"],"baho va AI render":["assessment and AI render","оценка и ИИ-рендер"],"Bino studiyasi":["Building studio","Студия здания"],"hajm, fasad, AI render":["massing, facade, AI render","объём, фасад, ИИ-рендер"],
"Joylashtirish":["Placement","Посадка"],"joylashtirish, masofalar, narx":["placement, distances, cost","посадка, расстояния, стоимость"],"Maʼlumotlar":["Data","Данные"],
"Master reja muharriri (eski)":["Master plan editor (old)","Редактор мастер-плана (старый)"],"avvalgi versiya":["previous version","предыдущая версия"],"Master reja kartalari (eski)":["Master plan cards (old)","Карточки мастер-плана (старые)"],
"Albom (eski)":["Album (old)","Альбом (старый)"],"oʻrnini Chizmadon egallaydi":["replaced by Chizmadon","заменяется Chizmadon"],"Loyiha (eski)":["Project (old)","Проект (старый)"],"avvalgi versiya loyihalari":["previous-version projects","проекты предыдущей версии"],
"Barcha asboblar":["All tools","Все инструменты"],"Til:":["Language:","Язык:"],
"Hali loyiha yoʻq. Yangi loyiha oching yoki namunani koʻring.":["No projects yet. Start a new one or open the sample.","Проектов пока нет. Начните новый или откройте пример."],"Yangi loyiha":["New project","Новый проект"],"Namuna":["Sample","Пример"],
"uchastka bor":["site drawn","участок есть"],"uchastka yoʻq":["no site","участка нет"],"bino":["buildings","зданий"],"ta":["",""],
"kishi/ga":["people/ha","чел./га"],"meʼyor ≤ 400 (84-band)":["code ≤ 400 (cl. 84)","норма ≤ 400 (п. 84)"],
"xonadon":["apartments","квартир"],"seksiya":["sections","секции"],"uchastka":["site","участок"],"ga":["ha","га"],"qavat":["fl.","эт."],
"Hisob: 1 xonadonga 3,54 kishi; maktab — ShNQ 2.07.01-23, 5-ilova (165–280 / 1000, quyi chegara); bogʻcha — 5-ilova (70–125 / 1000); avtoturargoh — 29-jadval (Toshkent).":["Calculation: 3.54 people per apartment; school — ShNQ 2.07.01-23, annex 5 (165–280 / 1,000, lower bound); kindergarten — annex 5 (70–125 / 1,000); parking — table 29 (Tashkent).","Расчёт: 3,54 чел. на квартиру; школа — ШНК 2.07.01-23, прил. 5 (165–280 / 1000, нижняя граница); детсад — прил. 5 (70–125 / 1000); машино-места — табл. 29 (Ташкент)."]
};
if(window.HOME_D){for(var hk in window.HOME_D)D[hk]=window.HOME_D[hk];}
var LANGS=['uz','en','ru','es','pt','fr','az','uk','tr','kk'],lang='en';try{lang=localStorage.getItem('mr-lang')||localStorage.getItem('kps_lang')||'en';}catch(e){}if(LANGS.indexOf(lang)<0)lang='en';   // sukut — inglizcha
/* 10 til: uz/en/ru — shu faylda; qolgan 7 tasi — js/i18n/<til>.json («t» — matnlar, «rx» — HOME_RX shablonlari), yoʻq satr — inglizcha */
var NAT={uz:'Oʻzbekcha',en:'English',ru:'Русский',es:'Español',pt:'Português (BR)',fr:'Français',az:'Azərbaycanca',uk:'Українська',tr:'Türkçe',kk:'Қазақша'},EXT={es:1,pt:1,fr:1,az:1,uk:1,tr:1,kk:1},X=null;
function loadX(l){if(!EXT[l]||(X&&X.l===l))return Promise.resolve();return fetch('js/i18n/'+l+'.json?v=3').then(function(r){return r.json();}).catch(function(){return {t:{},rx:[]};}).then(function(j){X=j;X.l=l;});}
/* xizmat nomlari inglizcha va ruscha (mr/src/i18n/index.ts dagi BRAND bilan bir xil) */
var BRAND={en:[[/Koʻchasoz\w*/g,'Street Designer'],[/Joyshunos\w*/g,'Site Explorer'],[/Chizmadon\w*/g,'Sheet Studio']],ru:[[/Koʻchasoz\w*/g,'Конструктор улиц'],[/Joyshunos\w*/g,'Анализ места'],[/Chizmadon\w*/g,'Студия листов']],es:[[/Koʻchasoz\w*/g,'Diseñador de calles'],[/Joyshunos\w*/g,'Explorador del sitio'],[/Chizmadon\w*/g,'Estudio de láminas']],pt:[[/Koʻchasoz\w*/g,'Designer de Ruas'],[/Joyshunos\w*/g,'Explorador do Terreno'],[/Chizmadon\w*/g,'Estúdio de Pranchas']],fr:[[/Koʻchasoz\w*/g,'Concepteur de rues'],[/Joyshunos\w*/g,'Explorateur de site'],[/Chizmadon\w*/g,'Studio de planches']],az:[[/Koʻchasoz\w*/g,'Küçə konstruktoru'],[/Joyshunos\w*/g,'Ərazi təhlili'],[/Chizmadon\w*/g,'Vərəq studiyası']],uk:[[/Koʻchasoz\w*/g,'Конструктор вулиць'],[/Joyshunos\w*/g,'Аналіз місця'],[/Chizmadon\w*/g,'Студія аркушів']],tr:[[/Koʻchasoz\w*/g,'Sokak Tasarımcısı'],[/Joyshunos\w*/g,'Alan Analizi'],[/Chizmadon\w*/g,'Pafta Stüdyosu']],kk:[[/Koʻchasoz\w*/g,'Көше конструкторы'],[/Joyshunos\w*/g,'Орын талдауы'],[/Chizmadon\w*/g,'Парақтар студиясы']]};
function brand(x){var b=BRAND[lang];if(!b||!x)return x;for(var i=0;i<b.length;i++)x=x.replace(b[i][0],b[i][1]);return x;}
window.ALT_BRAND=brand;
function t(s){if(lang==='uz')return s;var v=D[s];if(EXT[lang]){var x=X&&X.t&&X.t[s];return brand(x||(v&&v[0])||s);}return brand(v?(v[lang==='en'?0:1]||s):s);}
function rxv(r){if(EXT[lang]){var i=(window.HOME_RX||[]).indexOf(r);return (X&&X.rx&&X.rx[i])||r[1];}return r[lang==='en'?1:2];}
window.ALT=t;
/* matn tugunlari: asl oʻzbekcha matn tugunning oʻzida saqlanadi (__uz), boʻshliqlar oʻz joyida qoladi */
var SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,INPUT:1,svg:0};
function walk(root){var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentNode;if(!p||SKIP[p.nodeName]||p.closest('[data-t],[data-noi18n]'))return NodeFilter.FILTER_REJECT;return /\S/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}}),n,L=[];
  while((n=w.nextNode()))L.push(n);
  L.forEach(function(n){if(n.__uz===undefined){var k=n.nodeValue.replace(/\s+/g,' ').trim(),rx=null;
      if(!D[k]){(window.HOME_RX||[]).some(function(r){if(r[0].test(k)){rx=r;return true;}return false;});if(!rx&&!/Koʻchasoz|Joyshunos|Chizmadon/.test(k))return;}
      n.__uz=n.nodeValue;n.__k=k;n.__rx=rx;}
    var m=n.__uz.match(/^(\s*)[\s\S]*?(\s*)$/),v=lang==='uz'?null:n.__rx?n.__k.replace(n.__rx[0],rxv(n.__rx)):t(n.__k);
    if(v&&lang==='en'&&n.__rx)v=v.replace(/(\d) (\d{3})/g,'$1,$2').replace(/(\d),(\d{1,2})(?!\d)/g,'$1.$2');
    n.nodeValue=lang==='uz'?n.__uz:m[1]+v+m[2];});}
function apply(){document.documentElement.lang=lang;walk(document.body);
  [].forEach.call(document.querySelectorAll('[data-t]'),function(el){var k=el.getAttribute('data-t');el.textContent=t(k);});
  /* aria-label va title (asl oʻzbekcha matn elementda saqlanadi) */
  [].forEach.call(document.querySelectorAll('[aria-label],[title]'),function(el){if(el.closest('[data-noi18n],[data-ta]'))return;['aria-label','title'].forEach(function(a){var v=el.getAttribute(a);if(!v)return;var o=el['__'+a];if(o===undefined)o=el['__'+a]=v;var r=lang==='uz'?o:t(o);if(r!==v)el.setAttribute(a,r);});});
  [].forEach.call(document.querySelectorAll('[data-ta]'),function(el){el.getAttribute('data-ta').split(';').forEach(function(p){var i=p.indexOf(':');el.setAttribute(p.slice(0,i),t(p.slice(i+1)));});});
  var lc=document.getElementById('langCode');if(lc)lc.textContent=lang.toUpperCase();
  [].forEach.call(document.querySelectorAll('[data-lang]'),function(b){var on=b.getAttribute('data-lang')===lang;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-checked',String(on));var s=b.querySelector('span');if(s)s.textContent=on?'✓':'';});
  model();document.documentElement.classList.remove('i18n');}
function setLang(l){if(LANGS.indexOf(l)<0)return;loadX(l).then(function(){lang=l;try{localStorage.setItem('mr-lang',l);localStorage.setItem('kps_lang',l);}catch(e){}apply();renderProjects();});}
/* til menyusi va futerdagi tillar — 10 til roʻyxatidan */
(function(){var lm=document.getElementById('langMenu');if(lm)lm.innerHTML=LANGS.map(function(k){return '<button data-lang="'+k+'" role="menuitemradio" lang="'+k+'">'+NAT[k]+'<span></span></button>';}).join('');
  [].forEach.call(document.querySelectorAll('.flang'),function(f){[].forEach.call(f.querySelectorAll('[data-lang]'),function(b){b.remove();});LANGS.forEach(function(k){var b=document.createElement('button');b.type='button';b.setAttribute('data-lang',k);b.setAttribute('lang',k);b.textContent=NAT[k];f.appendChild(b);});});})();
var lb=document.getElementById('langBtn'),lm=document.getElementById('langMenu');
if(lb&&lm){lb.onclick=function(e){e.stopPropagation();lm.hidden=!lm.hidden;lb.setAttribute('aria-expanded',String(!lm.hidden));};
document.addEventListener('click',function(){lm.hidden=true;lb.setAttribute('aria-expanded','false');});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){lm.hidden=true;}});}
[].forEach.call(document.querySelectorAll('[data-lang]'),function(b){b.addEventListener('click',function(){setLang(b.getAttribute('data-lang'));});});
/* tungi rejim */
var tb=document.getElementById('themeBtn');
var MOON='<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',SUN='<path d="M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
function syncTheme(){if(!tb||tb.querySelector('.moon'))return;var d=document.documentElement.dataset.theme==='dark';tb.querySelector('svg').innerHTML=d?SUN:MOON;}
if(tb)tb.onclick=function(){var d=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=d?'dark':'light';try{localStorage.setItem('mr-theme',d?'dark':'light');}catch(e){}syncTheme();model();};
syncTheme();

/* jonli model: namuna uchastka 2,71 ga, 3 seksiya; 7 qavatda 267 xonadon (bir qavatga ≈ 38,14) */
var fl=document.getElementById('fl'),SITE=2.71,PER=267/7,HH=3.54;
var B=[[260,112],[352,158],[168,158]];
function nf(v){return Math.round(v).toLocaleString(lang==='en'?'en-US':'ru-RU');}
function box(x,y,w,d,h,dark){var c=dark?['#3a3937','#2c2c2a','#4a4945']:['#e7e3dc','#d6d1c7','#ffffff'],s='#9e978c';
  var p=function(a){return a.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ');};
  var L=[[x-w,y],[x,y+d],[x,y+d-h],[x-w,y-h]],R=[[x,y+d],[x+w,y],[x+w,y-h],[x,y+d-h]],T=[[x-w,y-h],[x,y+d-h],[x+w,y-h],[x,y-d-h]];
  var fls='';for(var i=1;i<h/7;i++){var yy=i*7;fls+='<path d="M'+(x-w)+' '+(y-yy)+'L'+x+' '+(y+d-yy)+'L'+(x+w)+' '+(y-yy)+'" fill="none" stroke="'+s+'" stroke-width=".5" opacity=".5"/>';}
  return '<g class="bl"><polygon points="'+p(L)+'" fill="'+c[0]+'" stroke="'+s+'"/><polygon points="'+p(R)+'" fill="'+c[1]+'" stroke="'+s+'"/>'+fls+'<polygon points="'+p(T)+'" fill="'+c[2]+'" stroke="'+s+'"/></g>';}
function $(id){return document.getElementById(id);}
function model(){if(!fl)return;var n=Math.max(2,Math.min(16,Math.round(+fl.value||7)));fl.value=n;
  var dark=document.documentElement.dataset.theme==='dark';
  $('blds').innerHTML=B.map(function(b){return box(b[0],b[1],46,24,n*7,dark);}).join('');
  /* aholi — yuqoriga yaxlitlanadi; maktab — 5-ilova 165/1000, yuqoriga; bogʻcha — 70/1000; avtoturargoh — xonadonga 1 (416-band, 29-jadval) */
  var flats=Math.round(PER*n),pop=Math.ceil(flats*HH),dens=pop/SITE,sch=Math.ceil(pop*0.165),mtm=Math.round(pop*0.07),pk=flats;
  $('vPop').textContent=nf(pop);$('vFlats').textContent=nf(flats)+' '+t('xonadon');
  var sd=$('sDens');sd.innerHTML='<i></i>'+nf(dens)+' '+t('kishi/ga');sd.className='chip '+(dens>400?'bad':'ok');sd.title=t('meʼyor ≤ 400 (84-band)');
  $('kPop').classList.toggle('bad',dens>400);
  $('vSch').textContent=nf(sch);$('vMtm').textContent=nf(mtm);$('vPk').textContent=nf(pk);
  [].forEach.call(document.querySelectorAll('#flSeg [data-fl]'),function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-fl')===n));});}
if(fl){$('flMinus').onclick=function(){fl.value=+fl.value-1;model();};
  $('flPlus').onclick=function(){fl.value=+fl.value+1;model();};
  fl.addEventListener('change',model);
  [].forEach.call(document.querySelectorAll('#flSeg [data-fl]'),function(b){b.addEventListener('click',function(){fl.value=b.getAttribute('data-fl');model();});});}

/* Master reja loyihalari (IndexedDB «archemistry-mr», ilova bilan bir manba) */
var box2=document.getElementById('plist'),esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});},PL=null;
function thumbP(p){var r=p.site&&p.site.rings&&p.site.rings[0];if(!r||r.length<3)return '<svg class="ic" viewBox="0 0 24 24" style="color:var(--faint)"><path d="M5 8l10-4 5 11-12 5z" stroke-dasharray="3 2"/></svg>';
  var xs=r.map(function(q){return q[0];}),ys=r.map(function(q){return q[1];}),x0=Math.min.apply(0,xs),x1=Math.max.apply(0,xs),y0=Math.min.apply(0,ys),y1=Math.max.apply(0,ys),k=Math.cos((y0+y1)/2*Math.PI/180),w=(x1-x0)*k||1e-6,h=(y1-y0)||1e-6,s=44/Math.max(w,h),ox=(56-w*s)/2,oy=(56-h*s)/2;
  var d=r.map(function(q,i){return (i?'L':'M')+(ox+(q[0]-x0)*k*s).toFixed(1)+' '+(oy+(y1-q[1])*s).toFixed(1);}).join('')+'Z';
  return '<svg viewBox="0 0 56 56" width="56" height="56"><path d="'+d+'" fill="var(--surface)" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 2"/></svg>';}
function when(x){try{return new Date(x).toLocaleString(lang==='en'?'en-US':'ru-RU',{dateStyle:'short',timeStyle:'short'});}catch(e){return '';}}
function renderProjects(){if(PL===null||!box2)return;var empty='<div class="pempty"><span>'+t('Hali loyiha yoʻq. Yangi loyiha oching yoki namunani koʻring.')+'</span><a class="btn btn-sm btn-primary" href="app/#/yangi">'+t('Yangi loyiha')+'</a><a class="btn btn-sm" href="app/#/namuna">'+t('Namuna')+'</a></div>';
  box2.innerHTML=PL.length?PL.slice(0,9).map(function(p){var nb=(p.buildings||[]).length;return '<a class="pcard" href="app/#/p/'+encodeURIComponent(p.id)+'" data-pid="'+esc(p.id)+'"><span class="th">'+thumbP(p)+'</span><span class="tx"><span class="nm">'+esc(p.name||'Loyiha')+'</span><span class="sb">'+esc(when(p.updated))+'</span><span class="sb">'+t(p.site?'uchastka bor':'uchastka yoʻq')+' · '+nb+' '+t('bino')+'</span></span><svg class="ic sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a>';}).join(''):empty;
  document.getElementById('pcnt').textContent=(PL.length?PL.length+' · ':'')+t('shu brauzerda saqlanadi');}
if(box2)try{var rq=indexedDB.open('archemistry-mr');
  rq.onupgradeneeded=function(){rq.transaction.abort();};
  rq.onerror=function(){PL=[];renderProjects();};
  rq.onsuccess=function(){var db=rq.result;if(!db.objectStoreNames.contains('projects')){db.close();PL=[];renderProjects();return;}
    var q=db.transaction('projects','readonly').objectStore('projects').getAll();
    q.onsuccess=function(){db.close();PL=(q.result||[]).sort(function(a,b){return String(b.updated).localeCompare(String(a.updated));});renderProjects();};
    q.onerror=function(){db.close();PL=[];renderProjects();};};}catch(e){PL=[];renderProjects();}
/* minimal sahifa: «Fikr» paneli — tanlov, pochta orqali yuborish, fikr paneli */
var fbK='Taklif';
[].forEach.call(document.querySelectorAll('[data-fb]'),function(c){c.addEventListener('click',function(){fbK=c.getAttribute('data-fb');
  [].forEach.call(document.querySelectorAll('[data-fb]'),function(x){x.setAttribute('aria-pressed',String(x===c));});});});
var fs=document.getElementById('fbSend');
if(fs)fs.onclick=function(){var tx=document.getElementById('fbTxt'),v=(tx&&tx.value||'').trim();
  location.href='mailto:info@archemistry.uz?subject='+encodeURIComponent('['+fbK+'] Archemistry Lab')+'&body='+encodeURIComponent(v+'\n\n— '+location.href);};

/* avvalgi versiya loyihalari bor boʻlsa — bosh sahifada eslatma (roʻyxat «Batafsil» sahifasida) */
var on=document.getElementById('oldNote');
if(on){try{var R0=JSON.parse(localStorage.getItem('kps_projects')||'null');var nn=R0&&Array.isArray(R0.list)?R0.list.length:0;
  if(nn){on.hidden=false;on.innerHTML=t('Avvalgi versiya loyihalari')+': '+nn+' — <a href="haqida.html#loyihalar">'+t('Batafsil sahifada')+'</a>';}}catch(e){}}
/* nuqtali fon: sichqoncha atrofida nuqtalar kattalashadi (kanvas «minimal A2»). Harakat kamaytirilgan rejimda va sensorli ekranda — oddiy fon. */
(function(){var root=document.querySelector('.st.dotfx'),cv=root&&root.querySelector('canvas.dotcv');if(!cv||!cv.getContext)return;
  if((window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)||(window.matchMedia&&matchMedia('(hover: none)').matches)){cv.remove();return;}
  var ctx=cv.getContext('2d'),G=22,R=150,W=0,H=0,mx=-9999,my=-9999,tx=-9999,ty=-9999,raf=0;
  function size(){var dpr=window.devicePixelRatio||1;W=root.offsetWidth;H=root.offsetHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);kick();}
  function draw(){raf=0;var moving=Math.abs(tx-mx)+Math.abs(ty-my)>.3;mx+=(tx-mx)*.2;my+=(ty-my)*.2;if(tx<-9000){mx=my=-9999;}
    ctx.clearRect(0,0,W,H);if(mx<-9000)return;
    ctx.fillStyle=getComputedStyle(root).getPropertyValue('--dot').trim()||'#dcd9d2';
    var x0=Math.max(G/2,Math.floor((mx-R)/G)*G+G/2),x1=Math.min(W,mx+R),y0=Math.max(G/2,Math.floor((my-R)/G)*G+G/2),y1=Math.min(H,my+R);
    for(var y=y0;y<y1;y+=G)for(var x=x0;x<x1;x+=G){var d=Math.sqrt((x-mx)*(x-mx)+(y-my)*(y-my));if(d>=R)continue;var k=1-d/R,r=1+2.4*k*k;ctx.globalAlpha=.7+.3*k;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill();}
    ctx.globalAlpha=1;if(moving)kick();}
  function kick(){if(!raf)raf=requestAnimationFrame(draw);}
  root.addEventListener('mousemove',function(e){var r=root.getBoundingClientRect();tx=e.clientX-r.left;ty=e.clientY-r.top;if(mx<-9000){mx=tx;my=ty;}kick();});
  root.addEventListener('mouseleave',function(){tx=ty=-9999;kick();});
  if(window.ResizeObserver)new ResizeObserver(size).observe(root);else window.addEventListener('resize',size);
  size();})();
loadX(lang).then(apply);
})();

/* Avvalgi versiya loyihalari (localStorage kps_projects, js/project.js) — eski bosh sahifadan oʻzgarishsiz */

(function(){
  var el=document.getElementById('rec');if(!el)return;var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var ST=['Uchastka','Tahlil','Yoʻllar','Binolar','Albom'],R=null,MON=['yan','fev','mar','apr','may','iyn','iyl','avg','sen','okt','noy','dek'];
  try{R=JSON.parse(localStorage.getItem('kps_projects')||'null');}catch(e){}
  if(!R||!Array.isArray(R.list))R={active:null,list:[]};
  function when(t){var d=new Date(t);if(isNaN(d))return '';var n=new Date(),hm=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2),day=864e5,
      d0=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime();
    if(d.getTime()>=d0)return 'bugun, '+hm;if(d.getTime()>=d0-day)return 'kecha, '+hm;
    return d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==n.getFullYear()?' '+d.getFullYear():'');}
  function bar(done){if(!done)return '<span class="bar"></span>';var n=done.filter(Boolean).length,nx=done.indexOf(false),h='';
    for(var i=0;i<5;i++)h+='<i class="'+(done[i]?'d':i===nx?'c':'')+'"></i>';
    return '<span class="bar" aria-label="5 dan '+n+' tasi bajarilgan">'+h+'<span>'+(n?n+'/5 · '+(nx<0?'tayyor':'keyingi: '+ST[nx]):'boshlanmagan')+'</span></span>';}
  var XI='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function render(){
    var list=R.list.slice().sort(function(a,b){return String(b.t).localeCompare(String(a.t));});
    document.getElementById('cnt').textContent=(list.length?'· '+list.length+' ta':'');
    el.innerHTML=list.length?list.map(function(x){return '<div class="prow" data-pid="'+esc(x.id)+'"><a href="loyiha.html?p='+encodeURIComponent(x.id)+'"><span class="th" aria-hidden="true"></span><span class="info"><span class="nm">'+esc(x.name)+'</span><span class="pl"></span>'+bar(null)+'</span><span class="rt"><b>Ochish <svg class="i" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></b><span>'+esc(when(x.t))+'</span></span></a><button class="del" type="button" data-del="'+esc(x.id)+'" aria-label="Oʻchirish: '+esc(x.name)+'" title="Loyihani oʻchirish">'+XI+'</button></div>';}).join(''):'<div class="empty">Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.</div>';
    var nz=list.filter(function(x){return !x.exp;}).length;
    document.getElementById('bk').hidden=!nz;
    document.getElementById('bkT').innerHTML='<b>'+nz+' ta loyiha zaxirasiz.</b> Ular faqat shu brauzerda — kesh tozalansa yoki boshqa kompyuterga oʻtsangiz yoʻqoladi.';
    return list;}
  var list=render();document.getElementById('oldBox').hidden=!list.length;
  /* oʻchirish: birinchi bosish — «Oʻchirilsinmi?», 4 soniya ichida ikkinchi bosish — oʻchiriladi */
  var armed=null,armT=0;
  function idb(name,store,fn){return new Promise(function(ok){try{var r=indexedDB.open(name,1);r.onupgradeneeded=function(){r.result.createObjectStore(store,(window.KPSPRJ&&KPSPRJ.IDB_OPT[name])||{keyPath:'id'});};
    r.onsuccess=function(){var db=r.result;if(!db.objectStoreNames.contains(store)){db.close();ok();return;}var t=db.transaction(store,'readwrite');fn(t.objectStore(store));t.oncomplete=function(){db.close();ok();};t.onerror=function(){db.close();ok();};};r.onerror=function(){ok();};}catch(e){ok();}});}
  async function delProject(id){
    if(R.active===id&&window.KPSPRJ){   /* ochiq turgan loyiha: uning jonli maʼlumoti tozalanadi */
      KPSPRJ.LS_KEYS.forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
      for(var i=0;i<KPSPRJ.IDB_ALL.length;i++){var a=KPSPRJ.IDB_ALL[i];await idb(a[0],a[1],function(os){os.clear();});}
      R.active=null;}
    await idb('kps_projects','snap',function(os){os.delete(id);});
    R.list=R.list.filter(function(x){return x.id!==id;});
    try{localStorage.setItem('kps_projects',JSON.stringify(R));}catch(e){}
    var row=el.querySelector('.prow[data-pid="'+id.replace(/"/g,'')+'"]');if(row)row.remove();
    var nz=R.list.filter(function(x){return !x.exp;}).length;document.getElementById('bk').hidden=!nz;document.getElementById('bkT').querySelector('b').textContent=nz+' ta loyiha zaxirasiz.';
    document.getElementById('cnt').textContent=(R.list.length?'· '+R.list.length+' ta':'');
    if(!el.querySelector('.prow'))el.innerHTML='<div class="empty">Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.</div>';}
  el.addEventListener('click',function(e){var b=e.target.closest('[data-del]');if(!b)return;e.preventDefault();var id=b.getAttribute('data-del');
    if(armed===b){clearTimeout(armT);armed=null;b.disabled=true;delProject(id);return;}
    if(armed){armed.classList.remove('arm');armed.innerHTML=XI;}
    armed=b;b.classList.add('arm');b.textContent='Oʻchi\u00adrilsinmi?';b.setAttribute('aria-label','Tasdiqlash: yana bosing');
    armT=setTimeout(function(){if(armed===b){b.classList.remove('arm');b.innerHTML=XI;b.setAttribute('aria-label','Oʻchirish');armed=null;}},4000);});
  /* har loyiha: hudud eskizi, joy nomi, shakl va maydon */
  function J(v){try{return v?JSON.parse(v):null;}catch(e){return null;}}
  function countIdb(name,store){return new Promise(function(ok){try{var r=indexedDB.open(name,1);r.onupgradeneeded=function(){r.result.createObjectStore(store,{keyPath:'id'});};r.onsuccess=function(){var db=r.result;if(!db.objectStoreNames.contains(store)){db.close();ok(0);return;}var q=db.transaction(store,'readonly').objectStore(store).count();q.onsuccess=function(){db.close();ok(q.result);};q.onerror=function(){db.close();ok(0);};};r.onerror=function(){ok(0);};}catch(e){ok(0);}});}
  /* loyiha maʼlumoti: ochiq loyiha — jonli, qolganlari — nusxadan */
  function dataOf(x){
    if(x.id===R.active){var g=function(k){return localStorage.getItem(k);};return countIdb('kps_maket','docs').then(function(n){return {g:g,album:n};});}
    return new Promise(function(ok){try{var r=indexedDB.open('kps_projects',1);r.onupgradeneeded=function(){r.result.createObjectStore('snap',{keyPath:'id'});};
      r.onsuccess=function(){var db=r.result;if(!db.objectStoreNames.contains('snap')){db.close();ok(null);return;}var q=db.transaction('snap','readonly').objectStore('snap').get(x.id);
        q.onsuccess=function(){db.close();var v=q.result;if(!v){ok(null);return;}var ls=v.ls||{};ok({g:function(k){return ls[k]||null;},album:((v.idb||{})['kps_maket/docs']||[]).length});};q.onerror=function(){db.close();ok(null);};};r.onerror=function(){ok(null);};}catch(e){ok(null);}});}
  function siteOf(x){if(x.id===R.active){try{return Promise.resolve(JSON.parse(localStorage.getItem('kps_site')||'null'));}catch(e){return Promise.resolve(null);}}
    return new Promise(function(ok){try{var r=indexedDB.open('kps_projects',1);r.onupgradeneeded=function(){r.result.createObjectStore('snap',{keyPath:'id'});};
      r.onsuccess=function(){var db=r.result;if(!db.objectStoreNames.contains('snap')){db.close();ok(null);return;}var q=db.transaction('snap','readonly').objectStore('snap').get(x.id);
        q.onsuccess=function(){db.close();var v=q.result;try{ok(v&&v.ls&&v.ls.kps_site?JSON.parse(v.ls.kps_site):null);}catch(e){ok(null);}};q.onerror=function(){db.close();ok(null);};};r.onerror=function(){ok(null);};}catch(e){ok(null);}});}
  function thumb(ring){var la=ring.map(function(p){return p[0];}),lo=ring.map(function(p){return p[1];}),a0=Math.min.apply(0,la),a1=Math.max.apply(0,la),o0=Math.min.apply(0,lo),o1=Math.max.apply(0,lo);
    var k=Math.cos((a0+a1)/2*Math.PI/180),w=(o1-o0)*k||1e-6,h=(a1-a0)||1e-6,sc=40/Math.max(w,h),ox=(56-w*sc)/2,oy=(56-h*sc)/2;
    var d=ring.map(function(p,i){return (i?'L':'M')+(ox+(p[1]-o0)*k*sc).toFixed(1)+' '+(oy+(a1-p[0])*sc).toFixed(1);}).join('')+'Z';
    return '<svg viewBox="0 0 56 56" width="56" height="56"><path d="'+d+'" fill="#fbfaf7" stroke="#141414" stroke-width="1" stroke-dasharray="3 2"/></svg>';}
  function areaOf(st){if(st.areaM2)return st.areaM2;var r=st.ring,lat=r.reduce(function(s,p){return s+p[0];},0)/r.length,mx=111320*Math.cos(lat*Math.PI/180),my=110574,s=0;
    for(var i=0;i<r.length;i++){var a=r[i],b=r[(i+1)%r.length];s+=a[1]*mx*b[0]*my-b[1]*mx*a[0]*my;}return Math.abs(s)/2;}
  function shape(st){var a=areaOf(st),A=a>=1e6?(a/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1})+' km²':(a/1e4).toLocaleString('ru-RU',{maximumFractionDigits:a<1e6?(a<1e5?2:1):0})+' ga';
    var f=st.mode==='radius'&&st.r?(st.r>=1000?(st.r/1000).toLocaleString('ru-RU')+' km':st.r+' m')+' doira':st.mode==='rect'?'toʻrtburchak':'erkin chegara';return f+' · '+A;}
  function place(c){var key='kps_geo_'+c[0].toFixed(3)+','+c[1].toFixed(3),v=null;try{v=localStorage.getItem(key);}catch(e){}if(v)return Promise.resolve(v);
    return fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=uz&lat='+c[0].toFixed(5)+'&lon='+c[1].toFixed(5)).then(function(r){return r.ok?r.json():null;}).then(function(j){
      var a=j&&j.address||{},n=[a.suburb||a.city_district||a.neighbourhood||a.quarter||a.village||a.town,a.city||a.county||a.state].filter(Boolean).filter(function(x,i,arr){return arr.indexOf(x)===i;}).join(', ');
      if(n){try{localStorage.setItem(key,n);}catch(e){}}return n;}).catch(function(){return '';});}
  var q=Promise.resolve();
  list.forEach(function(x){dataOf(x).then(function(d){if(!d)return;var row=el.querySelector('.prow[data-pid="'+x.id.replace(/"/g,'')+'"]');if(!row)return;
    var doc=J(d.g('kps_mr_doc'))||{},hud=J(d.g('kps_site')),mb=J(d.g('kps_mr_blds')),pz=J(d.g('kps_posadka')),plot=doc.plot&&doc.plot.ring&&doc.plot.ring.length>2?doc.plot:null,hs=hud&&hud.ring&&hud.ring.length>2?hud:null;
    var done=[!!plot,!!hs||!!d.g('kps_area_sum'),!!(doc.edges&&doc.edges.length),!!((mb&&mb.blds&&mb.blds.length)||(pz&&pz.blds&&pz.blds.length)),d.album>0];
    row.querySelector('.bar').outerHTML=bar(done);
    var st=plot||hs;if(!st)return;
    row.querySelector('.th').innerHTML=thumb(st.ring);var pl=row.querySelector('.pl'),sh=plot?'uchastka '+shape(plot).split(' · ').pop():'tahlil hududi · '+shape(st);pl.textContent=sh;
    var c=st.center||[st.ring.reduce(function(s,p){return s+p[0];},0)/st.ring.length,st.ring.reduce(function(s,p){return s+p[1];},0)/st.ring.length];
    q=q.then(function(){return place(c).then(function(n){pl.textContent=(n?n+' · ':'')+sh;return new Promise(function(r){setTimeout(r,1100);});});});});});   /* Nominatim: ≤ 1 soʻrov/soniya */
})();

/* sinov va eski asboblar — hozircha faqat egasiga (js/sinov.js) */
(function(){var own=false;try{own=localStorage.getItem('kps_owner')==='1';}catch(e){}var h=document.getElementById('hammasi');if(h&&own)h.hidden=false;if(!own)document.querySelectorAll('a[href$="#hammasi"]').forEach(function(a){a.hidden=true;});})();
