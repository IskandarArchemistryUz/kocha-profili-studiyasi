# Topshiriq: video yozishda topilgan Lab xatolari (11.11.2026)

Repo: IskandarArchemistryUz/kocha-profili-studiyasi, kod `mr/src`. Sayt: archemistry.uz/app. Har PR — CI yashil bo'lgachgina squash-merge; build-commitda yangi hash fayllar ham bo'lsin (#503 hodisasi).

## 1. 45° ko'cha to'ri loyihani buzadi (eng muhim)
- Takrorlash: yangi loyiha → 1-qadam 420×300 m uchastka (Place) → 2-qadam, Barcelona 113×113, «Along the long side» → Apply grid → «45°» → Reapply. To'r chiziladi, lekin keyin loyiha qayta ochilganda chap panel bo'sh, qadamlar yo'q (`nav.rail button` = 0), sahifani yangilash ham yordam bermaydi.
- Buzilgan loyiha: p_dda31e4a8041 (egasi brauzerida).
- Konsol (19:31): `TypeError: Cannot read properties of undefined (reading '0') at d (styles-G-9F4zeN.js:1:32175) at Ge (styles…:32736) at e.update (main-Ae6Eje8Z.js:8:68005) at e.onChange (main…:114:27993) … hm.dispatch`.
- Kerak: (a) 45° to'r kvartallarida undefined halqa/nuqta qayerdan chiqishini topish va tuzatish; (b) yuklashda bitta buzuq obyekt butun panelni o'ldirmasin — try/catch + «buzuq obyekt o'tkazib yuborildi» ogohlantirishi; (c) buzilgan loyihani ochadigan bo'lsin.

## 2. Yashil karkas (4-qadam) 0 ko'rsatadi
- Takrorlash: «Open the sample project» (Yangi Toshkent 80A, nusxa p_806fe9435ae6) → 4-qadam: Greening ratio 0 %, Parks 0, Courtyard lawn 0, Play areas 0, Trees courtyard / street 0 / 40. «Auto-landscape courtyards» yoqilgan. Sahnada esa hovli maysasi, park, maydonchalar, daraxtlar bor; 10-qadamda «Tashkent: tree and shrub planting» 58 ≥ 18 (o'tadi) — ikki qadam bir-biriga zid.
- Qadamlar orasida o'tib qaytish yordam bermaydi.
- Kod: `ui/editor.ts` `yashilPanel` → `this.last?.d.greenShareTotal`; `core/derive.ts:269` `doc.settings.yards ? landscape(doc) : []` → `greenBalance`; `core/landscape.ts:702`. Tekshirish: namunada `doc.settings.yards` yoki `landscape()` keshi (memo kaliti) / `computePlan` bloklari (use) — nega 0; 10-qadam daraxtlarni boshqa manbadan sanaydi.

## 3. Target FAR (5-qadam) — «ishlamaydi» bo'lib ko'rinadi
- NYC loyihasida: target 1,0 / 1,5 / 1,9 → hammasida Plot FAR 1,67; 3,0 → 1,93.
- Sabab (kod `core/generator.ts:986–1050`): qavat soni faqat `minF…maxF` oralig'ida tanlanadi; minimum 5 qavat bo'lganda 1,67 dan pastga tushib bo'lmaydi; yuqorisi oraliq/chekinish me'yori bilan cheklanadi. Pastga qarab yetmaganda hech qanday xabar yo'q (yuqoriga yetmaganda bor).
- Kerak: (a) maqsaddan oshib ketganda ham xabar: «UMN maqsadi X dan oshdi: minimal qavat N — pasaytiring yoki seksiyalarni kamaytiring»; (b) «All — each block with its own settings» yoqilgan bo'lsa panelda o'zgartirilgan Target FAR e'tiborsiz qoladi — buni tushunarli qilish (xabar yoki «All» panel qiymatini olsin); (c) slayder yonida taxminiy erishiladigan oraliq (min–max) ko'rsatilsa yaxshi.

## 4. Pastki KPI paneli yangilanmaydi
- Yig'ilgan (qisqa) KPI qatori generatsiya/qayta generatsiyadan keyin eski GFA, FAR, aholini ko'rsatib turadi (NYC: 65 640 m² bo'lgandan keyin ham 90 084). Kengaytirilgan qator to'g'ri. Sahifa qayta yuklanganda to'g'rilanadi.

## 5. Yong'in yo'llari tekshiruvi (EN16 uchun)
- Yangi Toshkent namunasida 10-qadamda yong'in proyezdi / o't o'chirish mashinasi kirishi bo'yicha qator yo'q (faqat «Number of evacuation stairs»). Hujjat claude/yongin-va-ota-yollar-normalar.md bor. Tekshiruv qaysi qadamda bo'lishi kerakligini aniqlash, kerak bo'lsa 10-qadamga qator qo'shish (sahnada «in scene» bilan).

## 6. Overpass ishonchsizligi (EN17 uchun)
- 11.11 kechqurun yangi uchastkalarda deyarli har safar «Not loaded: OSM tags (Overpass did not respond)»; 9-qadamda «OSM did not respond within 20 s». Natija: maktab, bog'cha, poliklinika, bekat 0 % — jadval qizil, «tuman yomon» bo'lib ko'rinadi.
- Kerak: zaxira Overpass serverlari (masalan overpass.kumi.systems, overpass.private.coffee, maps.mail.ru/osm/tools/overpass) navbat bilan; javob kelmasa 9-qadam jadvali qizil emas, kulrang «maʼlumot yuklanmadi» bo'lsin.

## 7. Tarjima qilinmagan matnlar (ingliz interfeysi)
- «UMN» (daha izohida, 3-qadam); «o'quvchi» (maktab qo'yilganda pastdagi xabar: «D-7: school — 98 o'quvchi»); «MTM» (bog'cha xabari).
- 5-qadam ogohlantirishi: «Plot FAR … Me'yorga moslash: N seksiyaning qavati pasaytirildi (cl. 79 table 2 …)».
- KPI panel yordami «Asosiy ko'rsatkichlar».
- 3-qadam: «1149: renovatsiya», «$/xon.», «$/m²·oy», «$/m²·yil», «shahar median (soʻralgan narx)».

## 8. Mayda
- 3-qadam: NYC loyihasida ham «Split along the SPZ boundary» tugmasi chiqadi.
- Sheet Studio, investorlar shabloni: «No place found: Building Apartment schedule…»; kvartira varaqlari bo'sh; «SAMPLE — ERA5 not connected»; bosh sahifaga qaytilganda Sheet Studio ochiq qolishi mumkin.
- ShNQ 2.07.01-23 joriy tahrir matnida 01/2-42 buyruq ro'yxat sanasi «17.12.2026» (buyruq 09.12.2025) — tekshirish.

## 9. Jonli soyalar ko'rinmaydi (EN27 uchun, 11.11 kechqurun)
- Takrorlash: NYC loyihasi (p_9f800f818f9e) → 6-qadam «Sun and wind» → Dec 22, vaqt 14:30 (balandlik 16°). Binolar soyasi yerga, hovliga, qo'shni binolarga umuman tushmaydi; faqat fasadlar yorug'/qorong'i bo'ladi. Jun 22 da ham shunday.
- Holat (konsoldan): `renderer.shadowMap.enabled = true`, `autoUpdate = false`, tur PCF, 4096; DirectionalLight `castShadow = true`, kamera ±500, far 4000, pozitsiya (−864, 422, 1151), target (0,0,0), lekin `light.target` sahnaga qo'shilmagan (`parent` yo'q). `shadowMap.needsUpdate = true` qo'lda berilsa ham soya chiqmadi. 73 mesh `receiveShadow`, 74 `castShadow`; ko'pchiligida material massiv.
- Tekshirish: vaqt/sana o'zgarganda `shadowMap.needsUpdate` qo'yiladimi; `light.target` sahnada bo'lishi (yoki `updateMatrixWorld`); hovli/yer qoplamasi materiallari soya qabul qiladimi (MeshBasic emas); soya xaritasi chegarasi uchastkani qamraydimi.

## 10. Shamol — xorijiy uchastkada ma'lumot yo'q (EN26 uchun)
- NYC loyihasida 6-qadam: «The nearest climate station (Karakalpakiya) is 10,985 km away — wind data is not reliable for this site. Global wind data (ERA5) is not available right now.» Ya'ni shamol tahlili faqat O'zbekiston stansiyalari yonida ishlaydi. EN26 O'zbekistondagi uchastkada yoziladi yoki ERA5 ulanishi kutiladi.
- Shu panelda xorijiy loyihada ham «SanQvaN 0102-25 · cl. 95» yorlig'i chiqadi.

Tuzatilgach: EN10, EN16, EN17, EN18, EN26, EN27 videolari qayta yoziladi (claude/video-reels-quvur.md).
