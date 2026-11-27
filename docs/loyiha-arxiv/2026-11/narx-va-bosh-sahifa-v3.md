# Bosh sahifa va narxlar v3 — Planimetric tahlili asosida (2026-10-18, QORALAMA)

Maketlar: kanvas «Ekotizim, sayt, xizmatlar» → **Bosh-v3**, **Narxlar-v3**. Oldingi variant (obunalar): `claude/archemistry-tariflar-qoralama.md`, maketlar Sayt-v2, Narxlar.

## Tahlil
**Planimetric bosh sahifasi** (planimetric.ildar.space):
- 2 qatorli katta sarlavha, bitta jumla, 2 tugma, darhol haqiqiy ilova videosi yoki surati.
- 12 qadam pill tarzida.
- «Built on real rules» — rasm va matn almashib turadigan 3 qator, har birida 3 ta aniq raqamli punkt.
- Chizmalar galereyasi (3 surat), 4 qisqa kartochka, yakuniy chaqiriq.
- Pastda maʼlumot manbalari, huquqiy havolalar va yakka tadbirkor nomi.
- Ortiqcha matn yoʻq — har boʻlim bitta fikr.

**Planimetric narxlari** (15.10.2026):
- Obuna yoʻq. Bepul: hamma narsa brauzerda, 5 km² gacha, PNG suv belgisi bilan.
- Kredit: 10 — $5 … 200 — $50, muddati tugamaydi, qardosh xizmat bilan bitta hisob.
- Faqat yuklab olishga toʻlanadi: PNG 1, SVG/PDF 5, DXF 8, IFC 10, hamma format 60. Toʻlangan holatni qayta yuklash — bepul.

**Boshqalar:**
- TestFit — $175/oy dan; Site Solver — $10 000/yil dan.
- Giraffe — Free; Core $1 000, Create $3 000 kishi/yil.
- Autodesk Forma — obuna (oylik, 1 yoki 3 yil, yillikda −33 %), 30 kun sinov, Flex tokenlar.

**Xulosa:** loyiha epizodik boʻlgan kichik bozorda «natijaga toʻlash» modeli eng sodda va kirish toʻsigʻi eng past.

## Bosh sahifa v3
1. Navigatsiya: Master reja · Koʻchasoz · Joyshunos · Chizmadon · Narxlar · UZ · Kirish · «Ochish».
2. Hero: «Master reja. Meʼyor bilan.» + bitta jumla + «Loyihani boshlash» / «Namunani koʻrish ›» + ilova surati (xarita, yozuvlar, koʻrsatkichlar paneli).
3. «Uchastkadan albomgacha.» — 12 qadam.
4. «Haqiqiy meʼyorlar asosida.» — 3 qator: koʻcha (kesim + ShNQ), maktab va bogʻcha (aholiga qarab, stat.uz), har raqamning bandi bor (meʼyoriy jadval).
5. «Chizmalar — taqdimotga tayyor.» — 4 surat: varaq, diagramma, yozuvlar, kichik masshtab.
6. «Bitta loyiha — bir nechta xizmat.» — Koʻchasoz, Joyshunos, Chizmadon, Dizayn-kod.
7. «Loyihani boshlang.» + tugma.
8. Footer: maʼlumot manbalari (OSM, stat.uz, AWS, Esri, ShNQ), huquqiy havolalar, xizmat koʻrsatuvchi (YaTT — rasmiylashtirilmoqda).

## Narxlar v3 — «Bepul + Tanga»
- **Bepul:** 12 qadam, meʼyoriy tekshiruv ekranda, atrof 3 km² gacha, PNG suv belgisi bilan, loyiha — .json fayl.
- **Tanga** (1 tanga ≈ 2 300–3 900 soʻm):

  | Toʻplam | Soʻm | USD |
  |---|---|---|
  | 10 tanga | 39 000 | $4 |
  | 30 tanga | 99 000 | $10 |
  | 100 tanga | 290 000 | $25 |
  | 300 tanga | 690 000 | $59 |

  Muddati tugamaydi; bitta hisob — hamma xizmatlarda; telefon yoki pochta bilan, parolsiz kirish.
- **Jamoa va tashkilot** — kelishiladi: umumiy hisob, shartnoma, hisob-faktura, oʻz meʼyorlari, oʻqitish.
- **Sarf (tanga):**
  - Rasm va varaq: PNG suv belgisiz 1 · varaq PDF/SVG 5 · aksonometriya SVG 5 · albom PDF 12 · Chizmadon albomi 10 · qavat rejalari 10.
  - Chizma va model: DXF reja 8 · DXF 3D 8 · GLB/OBJ 8 · IFC4 10.
  - Maʼlumot: TIK Excel 3 · meʼyoriy hisobot PDF 5 · GeoJSON/KML 3.
  - Aqlli yordamchi: aqlli xulosa 1 · aqlli hisobot 3 · aniq shamol 3D 10 (keyinroq).
  - Boshqa: hamma format 50 · atrof hududi 3 km² dan katta — har 3 km² uchun 4 (bir marta).
- **Odatiy topshiriq:** albom 12 + DXF 8 + TIK 3 + hisobot 5 = **28 tanga ≈ 99 000 soʻm**.
- **Zararsizlik:** server 250–450 ming soʻm/oy → oyiga ≈ 3–5 ta topshiriq.

## Ochiq savollar
- Obunani butunlay olib tashlaymizmi yoki faqat jamoalar uchun qoldiramizmi? Obunaning afzalligi — daromad oldindan maʼlum.
- Tanga narxi: Oʻzbekiston uchun 1 tanga ≈ 3 000 soʻm toʻgʻrimi? Chet el uchun narx Planimetric darajasida ($0,25–0,50) boʻlishi mumkin.
- «Toʻlangan holatni qayta yuklash bepul» qoidasini hisobda qanday saqlaymiz (loyiha holati xeshi).
- Talaba va oʻqituvchi uchun bepul tanga (masalan, oyiga 10).

## v4 — oʻzimizga xos (2026-10-18, Iskandar: «birga bir koʻchirmaylik»)
Maketlar: **Bosh-v4** (eko, x 10 640), **Narxlar-v4** (x 12 160). Planimetricdan faqat tamoyil olindi: ortiqcha matn yoʻq, bir boʻlimda bitta fikr. Qolgani — bizniki.

**Bosh sahifa v4 — farqlovchi elementlar:**
1. Hero rasmi skrinshot emas — **yoyilgan aksonometriya, 4 qatlam**: 01 Atrof · 02 Koʻchalar (qizil chegara) · 03 Yer uchastkalari (K-1.n) · 04 Hajmlar. Ranglar — ekotizim xizmat ranglari.
2. **«Bir qavat qoʻshing — maktab yetadimi?»** — sahifadagi jonli sinov: 5/7/9/12 qavat → aholi, maktab, bogʻcha, avtoturargoh, zichlik (andoza raqamlar).
3. **4 qatlam = 12 qadam:** Joy · Tarmoq · Hajm · Topshiriq.
4. **Meʼyor kartalari — band soʻzma-soʻz:** ShNQ 2.07.01-23, 382-band (bekatgacha 400 m), 86-band (koʻp kvartirali zonalarda koʻkalamzorlashtirish ≥ 30 %, 01/2-15 oʻzgartishi, 06.04.2026), UMN taʼrifi + «Ilovada» qatori.
5. **Oʻzbekiston raqamlari tasmasi (qora):** 221 tuman · 55 kesim · 19 tekshiruv · 12 daraxt turi · 3 til · 0 soʻm (boshlash).
6. Varaq namunasi, **ekotizim markazi** (Master reja + 4 xizmat), Atamalar va Archemistry Urban kartalari, «Mahallangizni oching.»

**Narxlar v4:**
- Sarlavha: «Chizish — bepul. Natija — tanga bilan.» + «Bepul — doim» roʻyxati.
- **Kalkulyator:** tayyor toʻplamlar — Qoʻmitaga topshirish 28 · Taqdimot 11 · BIM 18 · Hammasi 50; belgilash roʻyxati; qora yigʻindi paneli (28 tanga ≈ 99 000 soʻm); logotipli tanga.
- Tanga ustunlari 10/30/100/300 (39 000 / 99 000 / 290 000 / 690 000 soʻm); Jamoa — kelishiladi; talabalar — oyiga 10 tanga; 3 ustunli toʻliq narxlar roʻyxati.

**Diqqat — meʼyor nomuvofiqligi:** ilova 86-band boʻyicha koʻkalamzorlashtirishni ≥ 25 % deb tekshiradi. 01/2-15 (06.04.2026) oʻzgartishidan keyin koʻp kvartirali turar joy zonalarida **≥ 30 %**. 25 % — 474-banddagi umumiy talab. Ilovadagi tekshiruvni tuzatish kerak.

### v4 tuzatishlari (2026-10-18, Iskandar izohlari)
- **Bosh sahifa:**
  - Hero oʻngida endi **misol loyiha videosi** turadi (≈ 70 s, ovozsiz, avtomatik, takrorlanadi). Yoyilgan qatlamlar «Toʻrt qatlam — bitta model» boʻlimiga koʻchdi.
  - «Hammasi brauzerda» iborasi olib tashlandi: hisob serverda bajariladi, loyihalar hisobda saqlanadi.
  - «Namuna: Mirobod namunaviy mahalla» havolasi olib tashlandi — namuna loyiha qoʻshilmaydi.
  - Raqamlar tasmasi: «12 Toshkent daraxti» va «19 tekshiruv» olib tashlandi, «8 km² atrof eksporti» qoʻshildi. Sarlavha «Mahalliy maʼlumot bilan.»; tasma meʼyor boʻlimidan ajratildi, toʻgʻridan-toʻgʻri sinov kartochkasidan keyin turadi.
  - «Chizma — shtampi bilan» → **«Chizma — taqdimotga tayyor.»** Rasm joyiga misol loyihaning haqiqiy varagʻi qoʻyiladi (2–3 rasm, almashinib turadi).
  - **Ekotizim animatsiyasi:** Master reja → 4 xizmat; chiziqlar boʻylab nuqta oqadi, har 3 soniyada bitta xizmat va uning kartochkasi yonadi (12 s sikl).
  - **Aloqa:** Iskandar Soliyev, archemistry.uzbekistan@gmail.com, Telegram — kartochkada va footerda.
- **Narxlar:**
  - Sarlavha: «Chizish — bepul. Toza fayl — tanga bilan.»
  - **Belgi:** dastlabki 3 ta yuklash belgisiz. Keyin bepul yuklashlarning hammasi Archemistry belgisi bilan chiqadi: rasm va PDF da burchakda, DXF va IFC da shtamp qatlamida. Belgisiz fayl — tanga bilan.
  - **Xizmatlar jadvali:**

    | Xizmat | Bepul | Kunlik limit | Tanga bilan |
    |---|---|---|---|
    | Master reja | hamma narsa | 3 ta yangi hudud (umumiy) | belgisiz fayllar |
    | Koʻchasoz | hamma narsa | cheklovsiz | kesim varagʻi 3 · A3 varaq 5 · DXF 5 |
    | Joyshunos | pasport ekranda | 3 ta yangi hudud (umumiy) | pasport PDF 5 · aksonometriya SVG 5 |
    | Chizmadon | muharrir | cheklovsiz | albom PDF yoki PPTX 10 |
    | Dizayn-kod, Atamalar | toʻliq | cheklovsiz | — |

  - **Atrof eksporti (yangi):**
    - 1 km² gacha — kuniga 3 ta bepul; 4-hududdan boshlab har biri 1 t.
    - 4 km² gacha — 2 t.; 8 km² gacha — 4 t.
    - Qayta yuklash bepul. Formatlar: DXF, SVG, GLB, GeoJSON, PNG.
  - **«Qisqa javoblar» — 10 ta savol:** Joyshunos va Koʻchasoz bepulmi, kunlik limit, belgi, atrof eksporti, tanga muddati, qayta yuklash, saqlash joyi, talabalar, jamoa.
  - Barcha raqamlar — andoza (tasdiq kutadi).
- **«Xonadonlar va quyosh» boʻlimi (qoʻshildi, «Toʻrt qatlam» dan keyin):**
  - Seksiya rejasida xonadonlar turi boʻyicha rangda, derazalar insolyatsiya rangida; «Turi · Insolyatsiya · Gʻarb (9.2)» segmenti va «96 % xonadon mos» chipi.
  - Kvartirografiya kartochkasi: maqsad va natija, oʻrtacha m².
  - Uchastka insolyatsiyasi kartochkasi (7-qadam): 6 oraliq, ≥ 2 soat va ≥ 3 soat ulushi.
  - 4 punkt: kvartira miksi, derazalar insolyatsiyasi (SanQvaN 0331-16, 8.3–8.5), gʻarb qoidasi (9.2), qavat albomi.
  - Raqamlar — namuna.
  - Fon almashinuvi: Meʼyor va Ekotizim — kulrang; Chizma — oq.
- **Ochiq:** Telegram havolasi (kanal yoki shaxsiy?); misol loyiha nomi va videosi.

### Narxlar — 2-tuzatish (2026-10-18 kechqurun, Iskandar)
- **Limit — haftalik:** haftasiga 3 ta sinov, hamma xizmatda jami; har dushanba yangilanadi. Sinov — serverdagi ogʻir hisob:
  - yangi hudud (1 km² gacha) — keyin 1 t.;
  - xonadonlar hisobi (seksiyani boʻlish + derazalar insolyatsiyasi) — keyin 2 t.;
  - shamol oqimi — keyin 2 t.
  - Saqlangan hisobni qayta ochish va ekranda koʻrish hisoblanmaydi.
- **Kvartirografiya:** ekranda (miks, reja, natija) bepul; ogʻir hisob — haftalik sinov ichida, keyin 2 t.; toza qavat rejalari — 10 t.
- **Belgi — setkasimon:** bepul PNG, PDF va SVG butun varaq boʻylab «ARCHEMISTRY · BEPUL» toʻri bilan chiqadi. DXF, IFC va Excel — faqat tanga bilan (chizmadagi belgini oʻchirish oson). «Dastlabki 3 ta yuklash belgisiz» qoidasi olib tashlandi.
- **Master reja narxi uchastka maydoniga qarab** (koeffitsiyent toza fayllarga; chegaralar masshtab andozasi bilan bir xil): ≤ 15 ga ×1 · 15–60 ga ×1,5 · > 60 ga ×2. «Qoʻmitaga topshirish»: 28 / 42 / 56 tanga. Hisoblagichda «Uchastka maydoni» segmenti.
- **Pochta:** archemistry.uzbekistan@gmail.com (saytda shaxsiy pochta oʻrniga).
- Hamma raqamlar — andoza.

### Minimal variantlar (2026-10-18)
- Kanvasda Bosh-min-A/B/C. Iskandarga **A (oq varaq)** juda yoqdi.
- A ga «Bitta loyiha — yana beshta xizmat» qatori qoʻshildi: Koʻchasoz · Joyshunos · Chizmadon · Dizayn-kod · Render (beta), har birining oʻz rangli nuqtasi bilan.
- **Hover:**
  - nom ostida chiziq choʻziladi;
  - qolgan nomlar xiralashadi;
  - ostida xizmatning ingichka chiziqli rasmi ≈ 0,9 s ichida «chiziladi» (stroke-dashoffset), bitta jumla va «Ochish ›» chiqadi;
  - kirish: opacity va 8 px koʻtarilish, 240–320 ms.
- `prefers-reduced-motion` yoqilgan boʻlsa — animatsiyasiz.
- Sukut boʻyicha Koʻchasoz ochiq koʻrinadi.
- **Minimal A, 2-qadam (18:32):**
  - Tepada: «Narxlar», til tanlovi `UZ · RU · EN` va qora «Kirish» tugmasi; footerdan til olib tashlandi.
  - Oʻrtadagi maket sukut boʻyicha **yigʻilgan**. Sichqoncha yaqinlashsa 4 qatlamga ajraladi (har qatlam 62 px yuqoriga, 0,8 s, 40 ms kechikish bilan), yonida «01 Atrof … 04 Hajmlar» yozuvlari chiqadi; kulrang tonlarda.
  - **Yashirin chetlar:**
    - chap chetda «Aloqa» — pochta, Telegram, YouTube, shahar;
    - oʻng chetda «Fikr bildiring» — Xato topdim / Taklif / Hamkorlik, matn maydoni (sahifa va qadam oʻzi biriktiriladi), «Yuborish».
    - Faqat ingichka chiziq va vertikal yozuv koʻrinadi; chetga borilganda panel 24 px surilib chiqadi.
  - Saytda chetlar `position: fixed` boʻlishi kerak.
- **Minimal A, 3-qadam (18:38):**
  - Tepada **tungi rejim tugmasi** (oy/quyosh, til tanlovi yonida). Butun sahifa ranglari almashadi, maket ham tungi tonga oʻtadi. Saytda tanlov eslab qolinadi; birinchi kirishda tizim sozlamasi olinadi.
  - Chap chetdagi «Aloqa» olib tashlandi; oʻng chet endi **«Aloqa · fikr»** — fikr formasi + pochta, Telegram.
  - **5 xizmat** (Koʻchasoz, Joyshunos, Chizmadon, Dizayn-kod, Render) chap tepada — faqat rangli nuqtalar. Yaqinlashganda nomlar ketma-ket chiqadi (30 ms oraliq), nuqta kattalashadi, yonida chiziqli rasm chiziladi va bitta jumla chiqadi. Pastdagi xizmatlar qatori olib tashlandi.
  - Markaz (sarlavha va maket) ≈ 70 px oʻngga surildi.
- **Narxlar-min** (kanvas, Bosh-min-A ostida) — xuddi shu qobiq (tungi rejim, nuqtalar, oʻng chet). Tarkibi:
  - sarlavha;
  - 3 ustun: Bepul · Haftasiga 3 sinov · Tanga bilan;
  - tanga qatori 10 / 30 / 100 / 300 (30 — ajratilgan);
  - «Qoʻmitaga topshirish 28 · 42 · 56 tanga» (maydon boʻyicha);
  - 6 ta ochiladigan savol.
- **Minimal A, 4-qadam (18:41):** oʻng chetdagi yashirin panel sahifa chetiga yopishib, chiqib ketgandek koʻrinardi; planshetda «hover» ham ishlamaydi. Oʻrniga **oʻng pastda «Fikr» tugmasi** (`position: fixed`, chetdan 32 px): sichqoncha olib borilsa yoki bosilsa, ustida «Aloqa va fikr» paneli chiqadi (10 px koʻtarilish, 0,38 s). Xizmat nuqtalari nomlari tinch holatda toʻliq yashirin (`visibility: hidden`).
- **Minimal A, 5-qadam (18:44):**
  - Sarlavha 96 → 60 px, lead 17 px; Narxlar-min sarlavhasi ham 60 px.
  - **«Boshlash» — qora nuqta (14 px).** Sichqoncha sarlavha ustiga borsa, nuqta 0,42 s da tugmaga choʻziladi (150 × 46), soʻng «Boshlash» va «bepul» yozuvlari chiqadi. Klaviatura fokusida ham ochiladi. Sensorli ekranda (`hover: none`) doim tugma holatida.
  - Maket faqat oʻzining ustiga yaqinlashganda portlaydi (atrofida 40–60 px zona), butun qator boʻylab emas.
- **Minimal A, 6-qadam (18:46) — «oq varaq» tamoyili:** birinchi ekranda hamma narsa yashirin, faqat nuqtalar.
  - Sarlavha 40 px (600); lead 15 px.
  - Menyu matn: Narxlar · UZ · oy belgisi · Kirish — qora tugma yoʻq.
  - «Fikr» ham 12 px qora nuqta (oʻng past): yaqinlashsa «Fikr» tugmasiga choʻziladi va panel ochiladi; sensorli ekranda doim tugma.
  - Nuqtalar: chapda 5 xizmat, markazda «Boshlash», oʻng pastda «Fikr».
- **Minimal A, 7-qadam (18:49) — birinchi ekranda faqat nuqta:**
  - Markazda bitta qora nuqta, atrofida juda sekin «nafas» halqasi (3,2 s).
  - Nuqtaga yaqinlashilganda (≈ 320 px doira) ketma-ket chiqadi: sarlavha → nuqta «Boshlash» tugmasiga choʻziladi + «bepul» → maket (yigʻilgan; ustiga borilsa portlaydi).
  - Sichqoncha shu hududda qolsa, hammasi ochiq turadi; ketsa yana yashirinadi. Texnikasi: `.core{pointer-events:none}` + `.trig` doirasi + `.core:hover{pointer-events:auto}`.
  - Sensorli ekranda hammasi doim ochiq.
  - **3 qadam — bitta jim qator:** `01 Chizing — 02 Tekshiring — 03 Topshiring`, kulrang; ustiga borilsa soʻz qorayadi va ostida qisqa izoh chiqadi.

## v5 — «Varaq» (2026-10-18 19:02, Claude taklifi; «faqat nuqta» varianti rad etildi)
Maketlar: **Bosh-v5**, **Narxlar-v5** (eko, x 18 240 / 19 760). Sahifaning oʻzi — chizma varagʻi.
- **Varaq elementlari:**
  - qora ramka, chetlarida A–F va 1–5 koordinatalari;
  - pastda **shtamp** footer oʻrnida: Loyiha · Varaq N/2 · Aloqa (pochta, Telegram) · Toshkent 2026, maʼlumot manbalari.
- **Bosh:**
  - Hero: sarlavha 56 px, «Boshlash» + «Narxlar ›»; oʻngda yigʻilgan maket, yaqinlashsa portlaydi.
  - **Shartli belgilar** — 6 xizmat legenda koʻrinishida, har birining oʻz kartografik belgisi bor (toʻrtburchak, chiziq, shtrix, ramka, punktir, doira). Qatorga borilganda oʻngdagi oynada uning chiziqli rasmi chiziladi.
  - **Kesim A–A** — 3 qadam punktir chiziq ustida.
  - ShNQ 382-band iqtibosi.
- **Narxlar:** 4 ustunli spetsifikatsiya jadvali, har birida tugma:

  | Tarif | Narx | Tugma |
  |---|---|---|
  | Bepul | 0 | Boshlash |
  | Tanga | 99 000 soʻm / 30 tanga | Tanga olish |
  | **Pro (obuna, tavsiya)** | 149 000 soʻm / oy | Obuna boʻlish |
  | Jamoa | kelishiladi | Bogʻlanish |

  - **Pro tarkibi:** har oy 50 tanga (3 oygacha yigʻiladi), cheklovsiz sinov, navbatsiz hisob, loyiha tarixi.
  - Oylik / Yillik −20 % va Soʻm / USD tanlovlari; ostida tanga toʻplamlari, maydon qatori, savollar.
  - **Obuna haqida qaror:** asosiy model — Bepul + Tanga (obunasiz); Pro — ixtiyoriy obuna tez-tez ishlaydiganlar uchun. Pro narxi va tarkibi — andoza.
- Tungi rejim tugmasi va «Fikr» tugmasi (oʻng past) saqlangan.

### Minimal A — yakuniy yoʻnalish (2026-10-18 19:05, Iskandar)
- «Faqat nuqta» (hamma narsa yashirin) — rad etildi.
- **Bosh-min-A:**
  - doim koʻrinadi: sarlavha (40 px), bitta jumla, oddiy qora **«Boshlash»** tugmasi va maket (yaqinlashsa portlaydi);
  - chap tepada 5 xizmat nuqtasi;
  - 3 qadam — bitta jim qator;
  - «Fikr» — oʻng pastdagi nuqta;
  - menyuda tungi rejim.
- **Narxlar-min** shu uslubda:
  - 4 tarif tugmalari bilan: Bepul (Boshlash) · Tanga (Tanga olish) · **Pro 149 000 soʻm/oy (Obuna boʻlish, tavsiya)** · Jamoa (Bogʻlanish);
  - Oylik / Yillik −20 % va Soʻm / USD tanlovlari;
  - tanga qatori, maydon qatori, 7 savol (birinchisi — «Obuna shartmi?»).
- **Nuqtali fon (21:49):**
  - Bosh-min-A va Narxlar-min fonida koʻrinar-koʻrinmas nuqtali toʻr: 22 px qadam, 1 px nuqta, `#dcd9d2`; tungi rejimda oq 16 %. CSS `radial-gradient`.
  - **Bosh-min-A2** (variant): xuddi shu toʻr `canvas` da chiziladi. Sichqoncha atrofidagi 150 px radiusda nuqtalar 3,4 marta kattalashadi va toʻqlashadi; kursorga yumshoq ergashadi.
  - Faqat sichqoncha qimirlaganda qayta chiziladi.
  - `prefers-reduced-motion` yoqilgan boʻlsa — oddiy toʻr.
