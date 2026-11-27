# Yershunos · «istalgan hudud» testi yiqilishi — tashxis (26.11.2026)

Kimga: Lab reposi ulangan sessiya (PR #784 ni yuritayotgan Binokor chati yoki Yershunos PR sessiyasi). Bu hujjat repo ulanmagan sessiyada yozildi: repo kodi va test matni ko'rilmagan, faqat saytdagi jonli sahifa (`https://archemistry.uz/app/yershunos/`, 78 KB, 26.11 11:58) o'qildi.

## Holat
- PR #784 (faqat Binokor fayllari) CI da e2e (4) uch marta yiqildi: «Yershunos · istalgan hudud», `sayt.spec.ts:233`. Ertalabki #783 da yashil edi.
- Jonli sahifa ochiladi (HTTP 200). Brauzerda sinab bo'lmadi: sandbox proksisi `s3.amazonaws.com` ni bloklaydi, Iskandarning Chrome'i ulanmagan.

## Ehtimoliy sabab (koddan, tasdiqlanmagan)
«Istalgan hudud» relyefni brauzerda tashqi serverdan oladi: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (Chorvoq atrofidan tashqarida). `hbHisob` hudud uchun barcha plitkalarni **bir vaqtda** so'raydi (1600×1600 px gacha, ya'ni ~49 plitkagacha) va `Promise.all` bilan kutadi; `demTile` da **qayta urinish ham, vaqt chegarasi ham yo'q**. Bitta plitka uzilsa yoki sekin kelsa, butun hisob «Relyef ma'lumotini yuklab bo'lmadi» bilan tugaydi yoki test kutish vaqtidan o'tib ketadi. CI mashinasidan S3 ga 49 parallel so'rov — beqarorlikning tabiiy manbai. Bu faqat test muammosi emas: sekin internetda foydalanuvchida ham shunday bo'ladi.

Tekshirish kerak (repo sessiyasida): yiqilgan qadamning ekran rasmi va trace'dagi tarmoq so'rovlari — `elevation-tiles-prod` so'rovlaridan qaysi biri xato/kutishda; test tayl so'rovlarini soxtalashtiradimi (`page.route`) yoki haqiqiy S3 ga chiqadimi.

## Tuzatish taklifi
1. **`demTile`: 3 marta urinish, har biriga 15 s chegara** (404/403 da qayta urinmaydi):
```js
async function demTile(z,x,y,signal){ const n=2**z; x=((x%n)+n)%n;
  if(z>=8&&z<=11&&t2lon(x+1,z)>LB[0]&&t2lon(x,z)<LB[2]&&t2lat(y,z)>LB[1]&&t2lat(y+1,z)<LB[3]){
    try{const r=await fetch(new URL('tiles/'+z+'/'+x+'/'+y+'.png',location.href),{signal}); if(r.ok) return await r.arrayBuffer();}catch(e){if(signal&&signal.aborted)throw e;}}
  let err;
  for(let u=0;u<3;u++){
    const ac=new AbortController(), t=setTimeout(()=>ac.abort(),15000), ab=()=>ac.abort();
    if(signal){ if(signal.aborted) throw new DOMException('Aborted','AbortError'); signal.addEventListener('abort',ab,{once:true}); }
    try{ const r=await fetch(AWS+z+'/'+x+'/'+y+'.png',{signal:ac.signal});
      if(r.ok) return await r.arrayBuffer();
      err=new Error('DEM '+r.status); if(r.status===403||r.status===404) throw err;
    }catch(e){ if(signal&&signal.aborted) throw e; if(e===err&&/40[34]/.test(e.message)) throw e; err=e; }
    finally{ clearTimeout(t); if(signal) signal.removeEventListener('abort',ab); }
    await new Promise(r=>setTimeout(r,600*(u+1)));
  }
  throw err; }
```
2. **`hbHisob`: parallellikni 6 ta bilan cheklash** (`job` massivini navbat orqali; `Promise.all` o'rniga 6 ishchi).
3. **Test tashqi tarmoqqa bog'lanmasin**: `page.route('**/elevation-tiles-prod/**', …)` bilan repodagi bitta namunaviy Terrarium plitkasini qaytarish (yoki test hududini Chorvoq atrofida, z8–11 mahalliy plitkalar ichida tanlash — unda S3 ga umuman chiqmaydi). Haqiqiy S3 bilan alohida, CI ni to'smaydigan «tutun» testi qoldirilishi mumkin.
4. Uzoq muddatda: plitkalarni o'z serverga/R2 ga proksi qilish (Joyshunos auditi D bandi bilan bir xil saboq: uchinchi tomon xostiga to'g'ridan-to'g'ri tayanmaslik).

## Muhim: ikki nusxa ajralib ketgan
Saytdagi sahifa (global DEM, `ysdem` protokoli, «istalgan hudud», Nominatim qidiruvi) 25.11 dagi manbadan keyin o'zgargan. 26.11 da artefaktda (https://claude.ai/artifact/XcUMMPMnHP5hSgCCgBaQaW) qilingan ishlar — tumanlar qatlami, iqlim, reyting — **eski 25.11 asosida**. Saytga o'tkazishda artefaktdagi `index.html` ni to'liq ko'chirib bo'lmaydi: faqat `uz*` bloklari (CSS `.sel … #uzw`, «Kengayish» panelidagi 3-akkordeon, `#uzw` jadval oynasi, `// O'zbekiston: tumanlar kesimi` JS bloki, `K.keng` qatori) va `uzb_birliklar.geojson` saytdagi nusxaga qo'shilishi kerak. E'tibor: sayt nusxasida `maxBounds` boshqacha bo'lishi mumkin — `uzVis` dagi `setMaxBounds/setMinZoom` shunga moslansin.

---

## Qoʻshimcha: repo ulangan sessiyadagi tekshiruv (Binokor chati, 26.11, ~13:30)
Kod va test repoda oʻqildi (`mr/tests/e2e/sayt.spec.ts:233`, `mr/public/yershunos/index.html`). Yershunos fayllariga hech narsa yozilmadi.

**Yuqoridagi taxmin testga taalluqli emas.** Test S3 ga chiqmaydi: `page.route(/elevation-tiles-prod/)` repodagi `tiles/11/1426/760.png` ni qaytaradi, maplibre ham `node_modules` dan. Yiqiladigan qadam — hisob emas, undan oldingi: `#rejim button[data-v=hudud]` bosilgandan keyin 40 s ichida `#hlst button` (3 ta) chiqmaydi (Expected 3, Received 0). Hisob (`hbHisob`) bu qadamga yetib bormaydi.

`rejim(v)` boshida: `if(!map.getLayer('vodiy')){map.once('idle',()=>rejim(v));return;}`; `vodiy` qatlami `map.on('load')` ichida qoʻshiladi. Test `map.loaded() || .maplibregl-canvas` ni kutadi — canvas darhol paydo boʻladi, ya'ni tugma odatda xarita yuklanmasdan bosiladi va rejim keyingi «idle» ga qoldiriladi.

Lokal oʻlchovlar (Chrome, dasturiy GL, `--workers=1`):
| Holat | Natija |
|---|---|
| Asl test, 5 marta | 5/5 oʻtdi, ~20–23 s |
| CPU 4× va 8× sekinlashtirilgan | oʻtdi (31 s, 35 s) |
| Tugma ataylab `vodiy` qatlami yoʻqligida bosildi | oʻtdi (22 s) |
| Sinab koʻrilgan «tuzatish»: bosishdan oldin `map.loaded() && getLayer('vodiy')` kutish | **yiqildi** — `map.loaded()` 120 s ichida bir marta ham `true` boʻlmadi (relyef manbalari tinimsiz yuklanadi) |

Xulosa: CI dagi yiqilish lokal ravishda takrorlanmadi; sabab hali aniq emas. Eng shubhali joy — `rejim` ning «idle» ga bogʻliqligi: `map.loaded()` deyarli hech qachon `true` emas, demak «idle» ham kam keladi va CI yuklamasida 40 s ga ulgurmasligi mumkin. Agar shunday boʻlsa, foydalanuvchi ham sahifa ochilishi bilan «Istalgan hudud» ni bossa, rejim kechikib almashadi.

Tavsiya (Yershunos chatiga, oʻz PR ida):
1. `rejim` da `map.once('idle', …)` oʻrniga `map.once('load', …)` (yoki `vodiy` qatlami qoʻshilgan joyda kutib turgan rejimni chaqirish). Lokal ravishda asl test bu oʻzgarish bilan ham oʻtdi (2/2) — lekin CI yiqilishini takrorlay olmaganim uchun bu sabab ekani isbotlanmagan.
2. CI da yiqilganda trace/skrinshot artefaktini saqlash (playwright `trace: 'retain-on-failure'`), shunda keyingi safar sabab koʻrinadi.
3. Shu paytgacha: e2e (4) yiqilsa — faqat oʻsha ishni bir marta qayta ishga tushirish (26.11 da #784 va #786 da qayta ishga tushirilganda oʻtgan).
