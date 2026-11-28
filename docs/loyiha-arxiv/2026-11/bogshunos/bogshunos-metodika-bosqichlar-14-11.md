# Bogʻshunos — metodika va bosqichlar: tahlil, gʻoya, loyiha, muhandislik, narx, TIK, varaqlar (14.11.2026)

Holat (14.11, 08:00):
- **Tasdiqlangan:** 14 qadam va 4 blok — hozircha shunday qoladi, keyin qayta koʻriladi. Master reja ichidagi parkda muhandislik Master reja bilan **bitta modul**; alohida loyihada oʻz TIK i. 10-boʻlim (grafika va varaqlar) maʼqullangan.
- **Kanvas:** A, B (yangi 14 qadamli panel; A da 464 → 501 tuzatildi), C (4-qadam «Imkoniyat va cheklovlar»), D (6-qadam «Balans va narx»), E (L-03 landshaft kesimi A–A, A3 1:200, 5 qoʻshimcha bilan) — https://claude.ai/artifact/UR136Yfv15SzhjqktTDRMU, «Interfeyslar».
- Kod faqat ekranlar va metodika tasdiqlangandan keyin.

Bogʻliq: `claude/topshiriq-bogshunos-14-11.md`, `claude/binokor-bogshunos-2-bosqich-14-11.md` (3-boʻlim), `claude/master-reja-muhandislik-narx-arxitektura.md`, `claude/cheklovlar-navbat-narx-arxitektura.md` (narx mediana usuli), `claude/kesim-fasad-referenslar-13-11.md` (K-00…K-08), `claude/chizmadon-bitta-oyna.md`, `claude/chizmadon-shablonlar.md`.
Belgilar: **N** — norma (band asl matndan oʻqilgan), **P** — parametr yoki norma, hali asl matndan oʻqilmagan («tekshirilsin»), **A** — xalqaro orientir, **TALQIN** — mening taklifim.
Norma matnlari: ShNQ 2.07.01-23 joriy tahrir (`claude/normalar-txt/ShNQ-2.07.01-23-joriy-tahrir.txt`); ShNQ 2.04.02-19, 2.04.18-22, 2.04.01-22, 2.01.05-24, 2.01.01-22 — `D:\Work\normalar` (14.11 da oʻqildi); SanQvaN 0339-16 — lex.uz.

---

## 0. Tamoyillar
1. **Avval tahlil, keyin gʻoya.** Atrof → joy → «qayerda nima mumkin» xaritasi → dastur → gʻoya. SITES v2 da ham loyihalashdan oldingi joy tahlili majburiy shart (2.2).
2. **Bitta tashrif modeli.** Suv, kanalizatsiya, hojatxona, kafe, chiqindi, avtoturargoh — hammasi bitta tashrif sonidan hisoblanadi. Bu Mirobod auditidagi «5 xil aholi soni» xatosiga qarshi.
3. **Bitta formulalar toʻplami Master reja bilan.** `loads.ts` va `cost.ts` umumiy. Master reja rejimida Bogʻshunos qatorlari Master reja TEP iga qoʻshiladi; alohida rejimda oʻzining TIK i chiqadi.
4. **Ikki daraja — bitta qator.** Konsepsiyada kattalashtirilgan koʻrsatkich (ga, kishi, zona turi) ishlatiladi. Loyihada xuddi shu qator element boʻyicha aniqlashadi (vedomost × norma). Konsepsiya va loyiha natijalari orasidagi farq koʻrinib turadi.
5. **Har qatorda:** formula, manba (hujjat va band), «P» yoki «TALQIN» belgisi. Manbasiz son yozilmaydi.
6. **Normalar qatlami mamlakatga qarab almashadi.** Sifat qatlami (PSD, Gehl, PPS, 3-30-300, BAF/UGF) universal.
7. **Grafika xizmatda yaratiladi, varaq Chizmadonda yigʻiladi.** Material modelga bogʻlangan (rasm emas) — model oʻzgarsa varaq ham yangilanadi (10-boʻlim).

---

## 1. Bosqichlar — 4 blok, 14 qadam

| Blok | № | Qadam | Nima qilinadi | Muhandislik va narx qismi |
|---|---|---|---|---|
| **I. Tahlil** | 1 | Hudud va topshiriq | Chegara, rejim (alohida / Master reja ichida), bogʻ turi (501 va 464-bandlar uchun), mamlakat normalari | — |
| | 2 | Atrof tahlili | 300 m / 10 daqiqa / 1 km: aholi, mavjud yashil hududlar va tanqislik, kirishlar, bekatlar, maktab va bogʻchalar, shovqin, issiqlik (Joyshunosdan) | Atrofdagi tarmoqlar: TP, suv, kanalizatsiya, ariq va kanallar — ulanish imkoniyati |
| | 3 | Joy tahlili | Relyef, nishablik, D8 oqim, tuproq, mavjud daraxtlar (480-band: saqlanadi), quyosh va soya, shamol, koʻrinishlar, meros, landshaft xarakteri | **Mavjud tarmoqlar** (import yoki chizish) + himoya zonalari + texnik shartlar (TU) |
| | 4 | Imkoniyat va cheklov xaritasi | Qizil / sariq / yashil + har faoliyat uchun moslik xaritasi (S = Σ wᵢ·Lᵢ) — kanvas C | Tarmoq zonalari: 35-jadval, 199-band, ELU zonalari → «qizil» va «sariq» |
| **II. Dastur va gʻoya** | 5 | Tashrif modeli va dastur | 2-boʻlim formulalari → sigʻim, kunlik tashrif → dastur (33, 36-jadvallar; 489-band) | Barcha yuklamalarning kirish soni shu yerda paydo boʻladi |
| | 6 | Konsepsiya | Ikki boʻlim: «Zonalar» (aralash muharrir + «Taklif qil», kanvas A) va «Balans va narx» (kanvas D) | **Kattalashtirilgan balans:** suv, elektr, oqova, yomgʻir; CAPEX va OPEX; konsepsiya TIK |
| **III. Loyiha** | 7 | Relyef va yomgʻir suvi | Vertikal reja (601-band: nolli balans), nishabliklar (55-jadval), yomgʻir bogʻi va bioariqlar | Yomgʻir oqimi hajmi, drenaj, yer ishlari m³ |
| | 8 | Yoʻlaklar va qoplamalar | Ierarxiya, materiallar, universal dizayn (1:20 / 1:12) | Texnik zonalar yoʻlaklar ostida (TALQIN), qoplama m² → narx |
| | 9 | Koʻkalamzorlashtirish | Daraxt, buta, gulzor, maysa; masofalar (35-jadval) — kanvas B | **Gidrozonalar** (suv sinfi) → sugʻorish |
| | 10 | Suv va sugʻorish | Hovuz, favvora, ariq; sugʻorish tizimi | Sugʻorish m³ (sutka, mavsum), manba, usul, nasos kVt, quvur uzunligi |
| | 11 | Jihozlar, MAF, binolar, yoritish | Oʻyin, sport, oʻrindiq, pavilion, kafe, hojatxona, yoritish | Elektr yuklamasi, ichimlik suvi, oqova, chiqindi |
| | 12 | Muhandislik tarmoqlari | Yuklamalar → ulanish (TU sigʻimi) → sxematik trassa → uzunlik va diametr | Tarmoqlar vedomosti |
| **IV. Hisob va hujjat** | 13 | Narx va parvarish | CAPEX (vedomost × narx kitobi), OPEX (yillik), 20 yillik hayot sikli | — |
| | 14 | Tekshiruv, TIK, varaqlar | Normalar reyestri, TIK; texnik varaqlar (avtomatik), Chizmadonga «Landshaft albomi», Excel, DXF | — |

Interfeys: qadamlar paneli 4 blokka ajratilgan (I–IV), 14 belgi. Konsepsiya darajasida 7–12-qadamlar xira; ularning kattalashtirilgan hisobi 6-qadamning «Balans va narx» boʻlimida. Har qadamda «Reja / Akso / Kesim» va «Chizmadonga →» (10-boʻlim).

---

## 2. Tashrif modeli — barcha yuklamalar manbai

### 2.1 Hisobiy (normativ) model — loyihalash uchun
**Bir vaqtdagi tashrifchilar:** `N₁ = min( A × q ;  P_atrof × s / k )` — TALQIN (ikki chegaradan kichigi).
- `A` — park maydoni, ga.
- `q` — eng koʻp yuklama, kishi/ga:
  - **N, 501-band** (shahar ichi): shahar istirohat bogʻi 100; dam olish zonasi istirohat bogʻi 70; kurort bogʻi 50; oʻrmon bogʻi (oʻtloq, gidrobogʻ) 10; shahar oʻrmoni 1–3.
  - **N, 464-band** (shahar tashqarisi): shahar tashqarisidagi bogʻ 50; yaylov bogʻi 15; oʻrmon bogʻi 10.
- `P_atrof` — park xizmat qiladigan aholi (2-qadam, Joyshunos; Master reja rejimida `derive.ts`).
- `s` — yozgi yakshanba kuni shahar ichida dam oladigan aholi ulushi. **N, 34-jadval** (1-izoh: ulush shahar aholisiga nisbatan, yozgi yakshanba, qisqa muddatli dam olish).
- `k` — almashish koeffitsiyenti. **N, 34-jadval 3-izoh**: shahar ichida ≤ 2, shahar tashqarisida 1.

**Hisobiy kunlik tashrif (yozgi yakshanba):** `N_kun = min( P_atrof × s ;  A × q × k )` — TALQIN. Bu 34-jadvalning oʻz mantigʻi: `P × s` — kun davomida dam oluvchilar, `k` marta almashadi; park sigʻimi bilan chegaralanadi. (Avvalgi `N₁ × k` yozuvi shu ifodaning xususiy holi — `N₁` sigʻim bilan cheklanganda.)

**Qayerda ishlatiladi:**
- choʻqqi qiymat (`N₁`, `N_kun`) — tarmoq va xizmatlarni oʻlchash uchun: ichimlik suvi, oqova, hojatxonalar, kafe, chiqindi konteynerlari;
- oʻrtacha qiymat (2.2) — OPEX uchun (suv va elektr yillik, chiqindi).

**Avtomatik ogohlantirishlar — N, 502-band:**
- 10–15 kishi/ga → yoʻl-soʻqmoq tarmogʻi va tuproqni himoyalovchi ekinlar kerak;
- ≥ 50 kishi/ga → oʻrmon landshaftini bogʻ landshaftiga aylantirish kerak.

### 2.2 Haqiqiy foydalanish — kalibrlash (dunyo amaliyoti, A)
Normativ model loyihalash uchun yetadi, lekin haqiqiy tashrifni oʻlchab tekshirish kerak (mavjud park rekonstruksiyasi yoki oʻxshash park).
- **Kirishlarda namunaviy sanash** (Minneapolis Metropolitan Council): yozda 2 soatlik namunaviy sanashlar, kirishlar va vaqtlar tasodifiy tanlanadi; bir necha yil maʼlumoti birlashtiriladi (≥ 25 nuqta). Natija — yillik tashriflar.
- **Avtomatik hisoblagichlar** (Eco-Counter va boshqalar) — soatlik, kunlik, oylik egri chiziq; dam olish kuni choʻqqisi ertalab, ish kunlari kechqurun.
- **SOPARC** (RAND, McKenzie va Cohen) — park zonalarga boʻlinib, belgilangan vaqtlarda kim, nechta, qanday faollikda ekanligi kuzatiladi. Bogʻshunosda zonalar boʻyicha haqiqiy yuklama va PSD balansini tekshirish uchun.
- **Bogʻshunosda (TALQIN):** 3-qadamga «Sanash maʼlumoti» importi (CSV: vaqt, kirish, son) → choʻqqi soat ulushi va kunlik egri chiziq → 2.1 dagi `s` va `k` ni kalibrlash. Maʼlumot boʻlmasa — normativ qiymatlar, «P» belgisi bilan.

### 2.3 Dastur — N
- 33-jadval: 1 000 dam oluvchiga xizmatlar (kafe oʻrinlari, sport maydoni va boshqalar);
- 36-jadval: m²/kishi;
- 481 va 490-bandlar: minimal maydonlar (shahar bogʻi 15 ga, rejaviy tuman 10, turar joy tumani 3, xiyobon 0,5);
- 489-band: bolalar bogʻi 0,5 m²/kishi;
- 491-band: koʻkalamzor ≥ 70 %;
- 463-band: yoʻl-soʻqmoq ulushi 8–12 % — **faqat shahar tashqarisidagi bogʻlar uchun**. Shahar parki uchun ulush normasi topilmagan.

### 2.4 Tashrif va sigʻim normalari — mamlakatlar boʻyicha (14.11)
Bogʻshunosda **Oʻzbekiston normasi asosiy**; boshqa mamlakatlar normasi faqat **taqqoslash ustuni** (A) — tekshiruv natijasini oʻzgartirmaydi. Oʻzbekistonda norma boʻlmagan joyda (masalan, hojatxona soni) xorijiy qiymat «A, proksi» belgisi bilan ishlatiladi.

| Mamlakat | Hujjat | Yuklama, kishi/ga | Boshqa koʻrsatkichlar | Holat |
|---|---|---|---|---|
| **Oʻzbekiston** | ShNQ 2.07.01-23, 501, 464, 502-bandlar; 34-jadval | shahar istirohat bogʻi 100; dam olish zonasi bogʻi 70; kurort bogʻi 50; oʻrmon bogʻi 10; shahar oʻrmoni 1–3; shahar tashqarisi 50 / 15 / 10 | 491: koʻkalamzor ≥ 70 %; 481/490: minimal maydonlar; `k` ≤ 2 | **N, oʻqildi** |
| **Rossiya** | SP 475.1325800.2020 «Parki» | ommaviy tadbirlar zonasi > 100; tinch dam olish < 50; qolgan zonalar 50–100 | bogʻ ≥ 2 ga; koʻkalamzor: koʻp funksiyali ≥ 50 %, tabiiy bogʻ ≥ 70 %; bekat kirishdan ≤ 150 m, avtoturargoh ≤ 250 m; piyoda 15 daqiqa / transport 60 daqiqa; hojatxona: 1 asbob / 500 tashrifchi (SanPiN 2.1.3684 havolasi) | **A** |
| Rossiya (eski) | SNiP 2.07.01-89, 4.1-band | — | koʻkalamzor: shahar hududining ≥ 40 %, turar joy tumani ≥ 25 % | A, tarixiy |
| Aniqlanmagan (UA yoki RU) | dnaop.com, 5.6-band | shahar bogʻlari 100; uzoq dam olish bogʻlari 70 | — | **P** — qaysi norma ekanligi aniqlansin |
| **Xitoy** | GB 51192-2016 «Code for design of parks» (CJJ 48-92 oʻrniga) | — | eski CJJ 48-92: kichik bogʻlarda ≥ 30 m²/kishi (≈ 333 kishi/ga); GB 51192 joriy qiymatlari | **P** — tasdiqlanmadi |
| **AQSh (Florida)** | Florida DEP Recreational Carrying Capacity Guidelines | faollik turi boʻyicha | sigʻim avtoturargoh, hojatxona va xizmat obyektlarini belgilaydi | A |
| **Qozogʻiston** | SN RK 3.01-01-2013 (2018 oʻzg., papkada oʻqildi); SP RK 3.01-101-2013 | SN RK da yuklama normasi **yoʻq** | 8.3: ixtisoslashgan parklar — topshiriq boʻyicha; 8.7: yoritgichlar — yoritilganlik normasi boʻyicha | A; SP RK — **P** |

**Bogʻshunosda (TALQIN):** Sozlamalar → Normalar → «Taqqoslash: RU / CN / US» belgichasi. Yoqilganda 2.1 natijasi yonida kulrang ustun chiqadi: masalan, 14,20 ga bogʻ — UZ 1 420 kishi; RU zonalar boʻyicha oraliq.

---

## 3. Muhandislik boʻlimlari — metodika

Har boʻlim uchun: **haydovchi** → **formula** → **norma** → **konsepsiya / loyiha** → **chiqish**.

### 3.1 Sugʻorish — Oʻrta Osiyoda eng ogʻir boʻlim
- **Haydovchi:** koʻkalamzor maydonlari turlar boʻyicha (gidrozonalar — suv sinfi bir xil boʻlgan oʻsimliklar guruhi).
- **Formula:** `Q_sut = Σ Aᵢ × nᵢ × m` (m — sutkadagi sugʻorishlar soni; 4-jadval 2-izohi: 1). Mavsumiy hajm — sugʻorish kunlari boʻyicha.
- **N, ShNQ 2.04.02-19, 2.3-band → 4-jadval «Sugʻorishga ketgan suv sarfi, l/m²»:**

| Vazifa | Oʻlchagich | l/m² |
|---|---|---|
| Takomillashgan qoplamali yuza va yoʻllarni mexanizm bilan yuvish | 1 yuvish | 1,2–1,5 |
| Takomillashgan qoplamali oʻtish yoʻllari va maydonlarni mexanizm bilan yuvish | 1 yuvish | 0,3–0,4 |
| Takomillashgan qoplamali trotuar va oʻtish yoʻllariga qoʻlda (shlang) sepish | 1 sepish | 2,0–2,5 |
| Shaharning yashil ekinlarini sugʻorish | 1 sugʻorish | 3–4 |
| Maysazor va gulzorlarni sugʻorish | 1 sugʻorish | 15–20 |
| Qishki issiqxonalardagi ekinlar | 1 sutkada | 15 |
| Qishki ayvon va issiqxonalar, bahorgi tuproqqa ekilgan ekinlar, isitilgan tuproq | 1 sutkada | 6 |
| Tomorqalardagi ekinlar | 1 sutkada | 3–15 |
| Mevali daraxtlar | 1 sutkada | 10–15 |
| Sport inshootlarining oʻtli qoplamalari | 1 sutkada | 15–25 |

  - 1-izoh: hudud turlari haqida maʼlumot boʻlmasa, sugʻorish uchun suv mavsumdagi oʻrtacha sutkalik iste'moldan 1 yashovchiga 50–60 l/sut hisobida olinadi.
  - 2-izoh: sugʻorish-sepishlar soni sutkada bitta deb olinadi.
  - Mustaqil nazorat: `ET_L = ET₀ × K_L` (WUCOLS, **A**); ET₀ — iqlim faylidan (EPW `D:\Work\normalar\EPW`).
  - **N, SanQvaN 0339-16 (21.12.2016; lex.uz, oʻzbekcha matn), 65-band:** koʻchalarni yuvish va koʻkalamzorlarni sugʻorish uchun suv sarfi har bir aholiga sutkasiga 50–60 l (yirik shaharlarda 65–70 l/sut) yoki maydonlar maʼlum boʻlsa — 65.1-jadval boʻyicha. **65.1-jadval, l/m²:** shahar koʻkalamzorlari — 3–4; **maysazor va gulzorlar — 6**; yoʻlak va trotuarni qoʻlda (shlang) sugʻorish — 0,4–0,5; mexanik yuvish — 1,2–1,5; mexanik sugʻorish — 0,3–0,4; tomorqa (sabzavot, mevali daraxt) — «3–15» va «10–15» (sahifa matnida ajratilmagan).
  - **ZIDDIYAT:** maysazor va gulzor uchun ShNQ 2.04.02-19 — **15–20 l/m²**, SanQvaN 0339-16 — **6 l/m²**; qoʻlda sepish ham farq qiladi (2,0–2,5 va 0,4–0,5). **Qoida (Iskandar tasdiqladi, 14.11):** tarmoq va nasosni oʻlchashda kattasi (ShNQ 2.04.02-19), OPEX va suv byudjetida ikkalasi oraliq sifatida koʻrsatiladi; reyestrda ikkala manba yonma-yon.
  - **N, ShNQ 2.04.01-22, 3-ilova, 26-qator (sugʻorish):** oʻt qoplami 3 l/m²; futbol maydoni 0,5; boshqa sport inshootlari 1,5; takomillashgan yoʻlaklar 0,4–0,5; **yashil maydonlar, maysazor va gulzorlar 3–6**.
  - **UCHINCHI ZIDDIYAT:** maysazor va gulzor uchun endi uchta qiymat: 15–20 (ShNQ 2.04.02-19), 6 (SanQvaN 0339-16), 3–6 (ShNQ 2.04.01-22). Qoida oʻsha — tarmoqni oʻlchashda kattasi, OPEX da oraliq; reyestrda uchala manba.
  - Kanvas D: SanQvaN boʻyicha 16 000 × 6 + 86 000 × 3–4 = 354–440 m³/sut; ShNQ boʻyicha 498–664 m³/sut.
- **Usul — N, ShNQ 2.07.01-23:** 595 (markaz va magistral yoʻllar boʻylab — bosimli statsionar tarmoq orqali tomchilatib); 596 («quyish» faqat ihota daraxtzorlarda va SMZ larda); 597 (taqchil joyda — tomchilatib yoki joʻyakdan infiltratsiya); 594 (katta shaharlarda — betonli ariqlar).
- **Manba — N, 598:** kanal, daryo, koʻl, yer osti suvi, tozalangan oqova; taqchil joyda yomgʻir suvini toʻplash.
- **Loyihalash normalari — N, 599:** SHNQ 2.02.02-20, 2.04.02-19, 2.05.03-22, 2.06.01-24, 2.06.03-21. **Diqqat:** 01/2-42 (09.12.2025) oʻzgartirishidagi roʻyxatda shu norma «ШНҚ 2.06.03-12 Суғориш тизимлари. Лойиҳалаштириш талаблари» deb yozilgan — belgisi tekshirilsin; matni internetda topilmadi. U asosan qishloq xoʻjaligi sugʻorish tizimlari uchun; park sugʻorishida asosiy manba — ShNQ 2.04.02-19 va SanQvaN 0339-16. Qurilish bosqichi uchun — QR 07.03-23 «Sugʻorish tizimlari» qurilish reglamenti (5.01.2024, QMQ 3.07.03-97 oʻrniga; lex.uz).
- **Chiqish:** m³/sutka (choʻqqi oy), m³/mavsum, gidrozonalar xaritasi, quvur va ariq uzunligi, rezervuar hajmi, nasos quvvati (→ 3.5), kserofit ulushi.
- **Kanvas D namunasi:** 16 000 m² × 15–20 l + 86 000 m² × 3–4 l = 498–664 m³/sut.

### 3.2 Xoʻjalik-ichimlik suvi
- **Haydovchi:** `N_kun` (ichimlik favvorachalari, hojatxonalar), kafe oʻrinlari; vodoprovoddan sugʻorilsa — 12-jadval satri.
- **Formula:** `Q = N_kun × q_tashrif + kafe + sugʻorish (agar vodoprovoddan)`.
  - `q_tashrif` — park tashrifchisi uchun norma ShNQ 2.04.02-19 ning boshlangʻich jadvallarida yoʻq (2-jadval — «umumiy binolarda 1 yashovchiga» 40–70 l/sut, park uchun emas). ShNQ 2.04.01-22 da ham yoʻq (pastda) → proksi.
- **N, ShNQ 2.04.02-19:** sutkalik notekislik `K_sut.max = 1,1–1,3`; soatlik `K_ch.max = α_max × β_max` (α_max = 1,2–1,4; β — 3-jadval).
- **N, ShNQ 2.07.01-23, 12-jadval:** suv balansi — koʻkalamzorni sugʻorish «suv quvurlari tarmogʻidan» va «irrigatsiya tarmogʻidan» alohida satrlar; sifat — OʻzMSt 133:2024.
- **Chiqish:** m³/sutka, l/s, ulanish nuqtasi, quvur uzunligi.
- **N, ShNQ 2.04.01-22, 3-ilova (14.11 oʻqildi):** park tashrifchisi va jamoat hojatxonasi uchun **norma yoʻq**. Yaqin qatorlar: stadion tomoshabini 3 l/oʻrin (3 / 1 / 0,3 / 0,1 ustunlar); kinoteatr 4; umumiy ovqatlanish 12 l / shartli taom.
- **Proksi (P, Iskandar tasdiqlaydi):** tashrifchi = stadion tomoshabini, 3 l/kishi; kafe — 12 l × taomlar soni. Hojatxona asboblari soni — RU 1 / 500 tashrifchi (2.4, A).

### 3.3 Maishiy oqova (kanalizatsiya)
- **Formula:** `Q_oqova ≈ Q_ichimlik − sugʻorish` (TALQIN).
- **Yechimlar:** markaziy tarmoqqa ulanish yoki mahalliy tozalash.
  - **N, ShNQ 2.07.01-23, 240-band 2-izohi:** mahalliy tozalash inshootlari — «SHNQ 2.04.13-24» va SanQvaN 0103-25.
  - **Diqqat:** shu ShNQ ning 1-bandidagi roʻyxatda SHNQ 2.04.13-24 — «Qozonxonalar», tashqi oqova esa SHNQ 2.04.03-24. Havola xatosi boʻlishi mumkin — **tekshirilsin**. SanQvaN 0103-25 papkada bor.
- **Chiqish:** m³/sutka, ulanish yoki lokal inshoot, tarmoq uzunligi.

### 3.4 Yomgʻir suvi, drenaj, vertikal reja
- **Formula:** `V = Σ Aᵢ × ψᵢ × h`.
  - `ψᵢ` — qoplama oqim koeffitsiyenti (qoplama kutubxonasidan);
  - `h` — hisobiy yogʻin, **N, 244-band** → **ShNQ 2.01.01-22, 12-jadval:** Toshkent — yillik 444,7 mm, sutkalik maksimum 65,2 mm (1990-yil aprel), yogʻinli kunlar 112; Samarqand 365,4 / 54,9; Buxoro 135,0 / 42,4; Termiz 154,4 / 36,9; Nukus 107,1 / 40,7 mm.
  - Hisobiy jala (qisqa muddatli intensivlik, l/s·ga) — SHNQ 2.04.13-24 / SanQvaN 0083-24 (243-band) dan, **P**.
  - Qoplama z koeffitsiyenti (choʻqqi sarf) — **N, QMQ 2.04.03-19, 9-jadval**: maysazor 0,038; bogʻ shagʻal yoʻlkasi 0,09; asfalt 0,23–0,32; 2.18-band: kanalizatsiyasiz bogʻ hududi oqim yuzasiga qoʻshilmaydi. Hozircha konsepsiyada `h` = sutkalik maksimum (TALQIN).
- **N:** 242 (istirohat bogʻlari va xiyobonlarda ochiq tizim ruxsat etiladi); 243 (SHNQ 2.04.13-24 va SanQvaN 0083-24); 600 (zovurlar, katta shaharlarda yopiq); 601 (nolli balans, eroziyasiz oqim); 55-jadval (tuproq boʻyicha nishabliklar).
- **Yashil yechimlar (A):** yomgʻir bogʻi (≥ 4 % / 10–20 %), bioariq, «quruq daryo», botqoq; ABC Waters (Singapur) va SuDS amaliyoti.
- **Chiqish:** oqim m³, ushlab qolinadigan %, qazish va toʻkish m³ (balans), lotok yoki quvur uzunligi.

### 3.5 Elektr va yoritish
- **Haydovchi:** yoritgichlar, sugʻorish nasoslari, favvoralar, kafe va pavilionlar, sahna, CCTV va Wi-Fi, zaryad stansiyalari.
- **Formula:** `P_oʻrn = Σ nⱼ × pⱼ`; `P_hisob = Σ P × K_talab` (K — SHNQ 2.04.17-24 / QMQ 2.04.17-19 va EUQ, **P**); yillik `W = Σ P × soatlar`.
- **N, ShNQ 2.04.18-22 «Shaharlar va qishloq aholi yashaydigan joylarni tashqi yoritish»** (xiyobonlar va bogʻlarga ham tatbiq etiladi — 1-band):
  - 18-band: odamlar koʻp toʻplanadigan joylar (bolalar maydonchalari va boshqalar) — 4000–5000 K «neytral oq» yorugʻlik;
  - 19-band: velosiped yoʻllari — oʻrtacha gorizontal yoritilganlik ≥ 5 lx;
  - 30-band: xiyobon va piyoda yoʻllarida tayanchlar piyodalar yurish hududidan tashqarida;
  - 41-band: piyodalar joylarida toj koʻrinishidagi yoritgich balandligi ≥ 3 m;
  - 43-band: koʻcha va «barcha toifadagi yoʻllarda» oraliq/balandlik ≤ 5:1 (shaxmatda ≤ 7:1) — park yoʻlaklariga qoʻllash — TALQIN;
  - 54-band: xiyobonlar, sayr yoʻlkalari, istirohat bogʻlari kirishlari — sochuvchi yoki toʻgʻri tarqatuvchi yoritgichlar;
  - 59–60-bandlar: favvora yoritgichi ≤ 12 V, IP 68, avtomatik uzish;
  - 61-band: xiyobon va bogʻlardagi notekisliklar va zinapoyalarda oʻrtacha gorizontal yoritilganlik 5 lx;
  - 62-band: maysazor va obodonlashtirilgan maydonlarni yoritish uchun past yoritgichlar — himoya burchagi ≥ 10°, yorugʻlik oqimi ≤ 6000 lm;
  - 83-band: yashil maydonlarni pastdan yoritish — kabelli tarmoq;
  - **N, ShNQ 2.01.05-24, 18-jadval** (shahar istirohat bogʻi / tuman bogʻi, lx): asosiy kirishlar 6 / 4; yordamchi kirishlar 2 / 1; markaziy xiyobonlar 4 / 2; yon xiyobonlar 2 / 1; ommaviy dam olish joylari, ochiq sahna, stol oʻyinlari 10 / 10.
  - **N, 16-jadval:** bolalar maydonchalari 10 lx; koʻchaga tutash xiyobonlar 6 / 4 / 2; chiqindi maydonchalari 2 lx.
  - **N, 17-jadval** (sanatoriy va dam olish uylari): markaziy xiyobonlar 4, yon xiyobonlar 2, ommaviy dam olish joylari 10 lx.
  - Kanvas D dagi yoritgich soni (3 200 m ÷ 20 m = 160) — oraliq taxmin; loyihada yoritgich turi va 18-jadval lx boʻyicha fotometrik hisob (TALQIN).
- **N, ShNQ 2.07.01-23, 35-jadval:** yoritish tarmogʻidan daraxtgacha 4,0 m.
- **Variant:** quyosh panelli yoritgichlar (ShNQ 2.04.15-23 «Fotoelektrik stansiyalar» papkada bor) — narx va OPEX taqqoslanadi.
- **Chiqish:** kVt (oʻrnatilgan / hisobiy), kVt·soat/yil, TP sigʻimi tekshiruvi (TU), kabel uzunligi, yoritgichlar soni.

### 3.6 Gaz va issiqlik
- Odatda kerak emas. Kafe oshxonasi boʻlsa — ShNQ 2.04.08-22 (kutubxonada bor). TALQIN: parkda elektr oshxona afzal.
- Isitiladigan pavilion — SHNQ 2.04.07-22, **P**.

### 3.7 Kuchsiz tok
- CCTV, Wi-Fi, ovoz tizimi, navigatsiya; texnik shart boʻyicha (ShNQ 2.04.20-22 papkada bor). Chiqish: kabel uzunligi, nuqtalar soni.

### 3.8 Sanitariya tozalash
- Chiqindi: `N_kun × norma` (**P**); urnalar qadami, konteyner maydonchasi.
- Hojatxonalar soni: f(N₁). Oʻzbekiston normasi topilmadi → RU 1 asbob / 500 tashrifchi (2.4, A, proksi).

### 3.9 Mavjud tarmoqlar va cheklovlar (→ 4-qadam xaritasi, kanvas C)
- **N, 35-jadval** — daraxt va buta oʻqidan: gaz va kanalizatsiya — daraxt 1,5 m; issiqlik — daraxt 2,0 m, buta 1,0 m; suv va drenaj — daraxt 2,0 m; kuchlanish va aloqa kabellari — daraxt 2,0 m, buta 0,7 m; 1-izoh: qiymatlar toji 5 m gacha boʻlgan daraxtlar uchun.
- **N, 199-band:** texnik zonalarda piyoda yoʻlaklari, sport va bolalar maydonchalari mumkin — quduq va kameralardan kamida 3 m.
- **N, 203-band:** qizil chiziqdan tarmoqlar tartibi.
- **ZIDDIYAT — daraxt va trotuar:** ShNQ 2.07.01-23, 35-jadval — trotuar va bogʻ yoʻlkasi chetidan daraxt oʻqigacha **0,7 m**; SanQvaN 0339-16, 74.2-band — daraxtlar oʻqidan trotuar chetigacha **kamida 1,2 m**. Qoida (TALQIN): tekshiruvda qattiqrogʻi (1,2 m), ikkala manba koʻrsatiladi. Shu bandda: toʻsiq kengligi ≥ 0,4 m va ariqdan ≤ 0,6 m.
- **N, SanQvaN 0339-16:** 54.1-band — bogʻ va xiyobonlarda koʻkalamzor ≥ 70 % (ShNQ 491-band bilan mos); 53-band — yirik bogʻ va oʻrmon bogʻlari yashil hududlarning ≥ 10 %; shahar bogʻiga yetib borish ≤ 20 daqiqa, tuman bogʻiga ≤ 15 daqiqa (2-qadam, atrof tahlili); 54-band — bolalar bogʻi ~0,5 m²/kishi, sport bogʻi ~12 m²/kishi; 51-band — yashil hududlar shahar hududining ≥ 40 %, turar joy tumanlarida ≥ 25 %; 52.1-jadval — 1 kishiga yashil hudud iqlim sharoitiga qarab (qulay / cheklangan / noqulay).
- **N, SanQvaN 0339-16, 28.1-jadval — shovqindan himoya daraxt tasmalari:** bir qator shaxmat 10–15 m → 4–5 dBA; ikki qator (orasi 3–5 m) 21–25 m → 8–10 dBA; 2–3 qator (orasi 3 m) 26–30 m → 10–12 dBA. 24.1-jadval — mikrorayon dam olish joylari: kunduzgi ekvivalent 45 dBA, maksimal 60 dBA. → 4-qadamdagi «shovqindan uzoqlik» mezoni va 9-qadamdagi bufer ekish uchun.
- **N, SanQvaN 0339-16, 66.1-jadval:** koʻcha, maydon va parklarning qattiq qoplamalaridan supurindi — yiliga 5,5–16,5 kg/m² (8,8–22 l/m²) → 3.8 chiqindi hisobi.
- **N, VMQ 26.12.2018 dagi 1050-son «Elektr tarmogʻi xoʻjaligi obyektlarini muhofaza qilish qoidalari»** (oxirgi oʻzgartirishlar: VMQ 603, 25.09.2024; VMQ 791, 15.12.2025; lex.uz -4133978):
  - 14(a) havo liniyalari muhofaza zonasi, chetki simdan ikki tomonga: ≤ 1 kV — 2 m; 6–20 kV — 10 m (aholi punktlarida oʻzini oʻzi tutuvchi yoki izolyatsiyalangan simli liniyalar — 5 m); 35 kV — 15 m; 110 kV — 20 m; 220 kV — 25 m; 500 kV — 30 m;
  - 14(b) yer osti kabel liniyalari — chetki kabellardan 1 m (shaharda yoʻl ostida: binolar tomoniga 0,6 m, qatnov qismi tomoniga 1 m);
  - 14(d) podstansiyalar — toʻsiq yoki tashqi devordan, 14(a) masofalari birlamchi kuchlanish boʻyicha;
  - 15(g) havo liniyasi zonasida **bolalar va sport maydonchalari, stadionlar** joylashtirish va koʻp odam yigʻilishi taqiqlanadi (belgilangan tartibda ruxsat bundan mustasno) → 4-qadam xaritasida «qizil» bolalar va sport faoliyati uchun;
  - 17(v) zonada **daraxt va buta ekish va kesish** — tarmoq korxonasining yozma roziligisiz taqiqlanadi → «sariq» (kelishuv kerak);
  - 20-band: liniya istirohat bogʻlaridan oʻtsa, simga yaqin daraxtlarni tarmoq korxonasi kesadi;
  - toj va sim orasidagi eng kichik masofa — 14-bandning oxirgi xatboshisida «Elektr qurilmalarining tuzilishi qoidalari» (EUQ) ga havola; EUQ matni topilmadi → **P**.
- **Suvni muhofaza qilish zonalari — HUQUQIY BOʻSHLIQ (14.11 tekshiruvi):**
  - VMQ 174 (07.04.1992) — 12.12.2019 dan kuchini yoʻqotgan;
  - uning oʻrnidagi VMQ 981 (11.12.2019) ham **23.06.2026 dan kuchini yoʻqotgan** — VMQ 317 (22.06.2026), 2-ilova, 16-band; oʻrniga yangi hujjat nomi koʻrsatilmagan;
  - Suv kodeksi (30.07.2025; lex.uz -7655343) zonalarni taʼriflaydi (4-modda), lekin metrda oʻlcham bermaydi; lex.uz izohlari hali ham 981 ga havola qiladi;
  - **981 ning oxirgi qiymatlari — faqat orientir (P, kuchini yoʻqotgan):** daryolar suvni muhofaza qilish zonasi — yirik (> 100 m³/s) 300–500 m, oʻrta (5–100) 100–300 m, kichik (2–5) 50–100 m, juda kichik (< 2) 35–50 m (29-band); daryo sohil boʻyi mintaqasi — 25–55 m yer turiga qarab (30-band); suv havzalari sohil boʻyi mintaqasi ≥ 20 m (21-band); kanallar sohil boʻyi mintaqasi 6,5–9 m (chuqurligi 2–5 m) va 9,5–12 m (35-band); **aholi punktlarida** oʻlchamlar bosh reja hisobga olingan holda idoralar bilan kelishib belgilanadi (30, 33, 37-bandlar); sohil boʻyi mintaqasida har qanday bino va inshoot taqiqlangan, kanalizatsiyaga ulangan ommaviy dam olish hududlari bundan mustasno (61-band);
  - **Bogʻshunosda (TALQIN):** daryo yoki kanal boʻyi loyihasida 4-qadamda «suv muhofaza zonasi» qatlami foydalanuvchi kiritadigan kenglik bilan (masalan, hokimiyat qarori yoki tuman yer tuzish loyihasidan); standart qiymat yoʻq, ogohlantirish: «amaldagi nizom aniqlanmagan».

### 3.10 Ulanish va trassa
- Har tarmoq: yuklama ≤ texnik shart sigʻimi (`UtilNode.capacity`), aks holda «mos emas».
- Trassa yoʻlaklar grafi boʻylab; texnik zona yoʻlak ostida yoki yonida (199-band bilan mos — TALQIN).
- **N, 200-band:** samarali sxema variantlarni texnik-iqtisodiy taqqoslash bilan tanlanadi → 2–3 trassa varianti uzunlik va narx boʻyicha.
- **N, 201-band, 7-jadval:** tarmoq zichligi 1 000 m² ga (mavze uchun) — parkda orientir (TALQIN).

---

## 4. Narx — CAPEX (manbalar tahlili, 14.11)

### 4.1 Mavjud manbalar
| Manba | Nima beradi | Afzallik | Kamchilik |
|---|---|---|---|
| **Rasmiy resurs-smeta normalari — ShNK 4.02.xx toʻplamlari** (Qurilish vazirligi, mc.uz da PDF: masalan 4.02.31-04 «Aerodromlar», 4.02.41-06, 4.02.51-07 «Yer ishlari»; umumiy nizom — ShNQ 4.02.00-04) | Har ish birligiga resurs miqdori: mehnat, mashina, material | Rasmiy, ekspertiza qabul qiladi | Narx bermaydi — resurs × joriy narx kerak; koʻkalamzorlashtirish toʻplami (Rossiyada GESN 81-02-47 «Ozelenenie» analogi) Oʻzbekistonda borligi **tasdiqlanmadi**; mutaxassislar tizimni eskirgan deb baholaydi (buxgalter.uz, podrobno.uz tahliliy maqolasi) |
| **Resurslar joriy narxi** | Material, mashina-soat, mehnat narxi | Resurs usuli uchun shart | Rasmiy davriy nashr manbai **topilmadi**; stat.uz faqat qurilish hajmlari va indekslarni beradi |
| **Kompaniya / pudratchi narxlari** | Bevosita birlik narxi (m², dona) | Bozorga eng yaqin | Har foydalanuvchida har xil |
| **Koʻchatxona kataloglari** | Koʻchat narxi (tur, oʻlcham) | Aniq | Yigʻish kerak (Toshkentda ko'chatxona-kompleks GChS loyihasi e'lon qilingan — kelajakda manba) |
| **Real loyihalar** (hokimiyat qarorlari, GChS) | Umumiy summa / ga | Tekshirish uchun yaxshi | Tarkibi aralash (masalan, 1,3 ga avtoturargoh + obodonlashtirish GChS ≥ 10 mlrd soʻm — park narxi emas) |
| **Xalqaro narx kitoblari** (Spon's External Works & Landscape, RSMeans) | Element birligi narxi, tuzilma | Toʻliq kodlar tuzilmasi | Boshqa bozor narxi — faqat tuzilma va nisbatlar uchun |

### 4.2 Taklif (TALQIN)
- **Kod tuzilmasi** — ShNK 4.02 boʻlimlari boʻyicha (yer ishlari, qoplamalar, koʻkalamzorlashtirish, tarmoqlar…), rasmiy smetaga oʻtkazish oson boʻlsin.
- **Narx — mediana usuli** (`cheklovlar-navbat-narx-arxitektura.md` 7-boʻlim): har kodga bir nechta kuzatuv (kompaniya narxi, koʻchatxona katalogi, real loyiha); mediana va P25–P75; 3 tadan kam kuzatuv — «TAXMIN».
- **Konsepsiyada:** zona turi × soʻm/m² (kattalashtirilgan, kuzatuvlardan). **Loyihada:** vedomost × birlik narxi.
- **Birinchi qadam:** Iskandar yoki hamkor pudratchilardan 20–30 asosiy element narxi (daraxt koʻchati 3 oʻlchamda, maysa m², plitka m², granit bordyur m, tomchi sugʻorish m², yoritgich tayanchi dona, kabel m, oʻyin majmuasi dona…) — boshlangʻich kitob.
- Guruhlar: tayyorlov; yer ishlari; qoplamalar; koʻkalamzorlashtirish (koʻchat + ekish + kafolatli parvarish; tuproq V = 0,6·π·r²); sugʻorish; suv obyektlari; MAF; yoritish; tarmoqlar; ulanish toʻlovlari (TU); binolar; loyiha-qidiruv %, kutilmagan %.

### 4.3 Boshlangʻich narxlarni kimdan olamiz — maslahat (14.11)
Tartib: rasmiy → bozor → tekshiruv. Har kodga ≥ 3 kuzatuv boʻlsa mediana ishlaydi.

1. **Davlat xaridlari portali — narxlar moduli (eng kuchli rasmiy manba).** VMQ 8.09.2026 dagi 480-son qarori bilan oʻrtacha bozor va boshlangʻich narxni aniqlash vaqtinchalik nizomi tasdiqlangan: buyurtmachi oxirgi 90 kun bozor narxlaridan foydalanadi, natija manbalar va hisob bilan elektron maʼlumotnoma boʻladi; 2026-yil 1-oktabrdan barcha davlat buyurtmachilari uchun majburiy (PF-259, 26.12.2025). Bundan tashqari, xarid.uzex.uz va xt-xarid.uz da «obodonlashtirish va koʻkalamzorlashtirish ishlari» lotlari va smetalari bor. **Tekshirish kerak:** modul maʼlumoti ochiqmi yoki faqat buyurtmachiga. Ochiq boʻlsa — davlat loyihalari uchun asosiy manba.
2. **Koʻchatxonalar — 3 tadan yozma tijoriy taklif.** Masalan: Bahor Gullari (Toshkent viloyati, Hasanboy promzonasi; 700 dan ortiq tur, konteyner va grunt koʻchatlari); goldenpages.uz «Dekorativ oʻsimliklar» roʻyxatidagi Toshkent koʻchatxonalari; prom.uz katalogi. OLX dagi eʼlonlar (chinor 40 000–150 000 soʻm, oʻlchami koʻrsatilmagan) — faqat yoʻnaltiruvchi, kuzatuv sifatida olinmaydi.
3. **Hamkor pudratchilar — 2–3 ta.** Bir xil roʻyxat (20–30 element, 4.2) boʻyicha birlik narxi: ish + material alohida, QQS bilan / QQSsiz belgilanadi.
4. **Tuman va shahar obodonlashtirish boshqarmalari** — tasdiqlangan smetalar va bajarilgan ishlar dalolatnomalari (soʻrov xati orqali).
5. **Tekshiruv uchun real holatlar:** masalan, Yangi Avlod SIZ (Yangihayot) — 40 daraxtni koʻchirib oʻtqazish, boshlangʻich narx 976 mln soʻm QQS bilan, keyingi parvarish bilan (anhor.uz) → ≈ 24 mln soʻm / daraxt. Bu yirik daraxtni koʻchirish narxi, oddiy ekish emas.

**Amaliy birinchi qadam (TALQIN):** 20–30 element roʻyxati → 3 koʻchatxona + 2 pudratchiga bitta shablon xat → 2 hafta ichida 5 ta kuzatuv / kod → boshlangʻich narx kitobi. Har narx yonida: manba, sana, QQS, hudud.

## 5. Parvarish — OPEX va tariflar (14.11 holati)

| Resurs | Tarif | Manba |
|---|---|---|
| Elektr, yuridik shaxslar | **1 100 soʻm/kVt·soat** (QQS bilan), 1.06.2026 dan | VMQ (PKM) № 243, 15.05.2026 — buxgalter.uz jadvali. Diqqat: goldenpages.uz da II guruh uchun 1 000 soʻm koʻrsatilgan — farq, asl qarordan tekshirilsin |
| Gaz, yuridik shaxslar | 2 000 soʻm/m³, 1.06.2026 dan | xuddi shu qaror |
| Ichimlik suvi, Toshkent sh. | byudjet va ulgurji isteʼmolchilar 1 400 soʻm/m³; boshqa yuridik shaxslar 3 000 soʻm/m³ (QQSsiz), 15.12.2023 dan | Toshkent shahar Kengashi qarori (buxgalter.uz) |
| Kanalizatsiya, Toshkent sh. | 1 000 / 2 200 soʻm/m³ (QQSsiz) | xuddi shu |
| Toshkent viloyati suvi | viloyat Kengashi qarori, 1.10.2026 dan yangi tariflar (operatorga qarab) | spot.uz |
| Chiqindi (TKO), Toshkent sh. | 100 744,88 soʻm/m³ (QQS bilan), 1.04.2024 dan | «Maxsustrans» DUK |
| Ariq / kanal suvi (sugʻorish) | suv resurslaridan foydalanganlik soligʻi — 2026 da stavkalar oʻrtacha 7 % oshgan; park uchun aniq stavka **P** | Soliq kodeksi, ZRU-1108 (25.12.2025) — stavka jadvali oʻqilmagan |

- Tariflar tez-tez oʻzgaradi va hududga bogʻliq → Bogʻshunosda **tarif jadvali**: hudud, isteʼmolchi toifasi, qiymat, sana, manba; foydalanuvchi yangilaydi; eskirgan (> 12 oy) qator — ogohlantirish.
- Yillik OPEX: suv (sugʻorish m³ × tarif yoki soliq), elektr (kVt·soat × tarif), chiqindi (m³ × tarif), maysa oʻrish, butash, daraxt parvarishi, xodimlar, joriy taʼmir (CAPEX × %).
- 20 yillik hayot sikli: CAPEX + Σ OPEX (diskont ixtiyoriy) — variantlarni solishtirish (maysa yoki kserofit oʻtloq; vodoprovod yoki ariq suvi; oddiy yoki quyosh panelli yoritgich).

---

## 6. TIK — texnik-iqtisodiy koʻrsatkichlar

| Guruh | Koʻrsatkich | Birlik | Konsepsiya | Loyiha |
|---|---|---|---|---|
| Hudud | Maydon; balans: yashil / qattiq / suv / bino | ga, % | ✓ | ✓ |
| Koʻkalamzor | Koʻkalamzor ulushi (491); daraxtlar soni; kanopi 0 / 10 / 20 yilda; BAF / UGF | %, dona | ✓ (massiv) | ✓ |
| Foydalanish | Bir vaqtdagi sigʻim (501 / 464); hisobiy kunlik tashrif; 33-jadval xizmatlari | kishi | ✓ | ✓ |
| Suv | Sugʻorish m³/sut (choʻqqi) va m³/mavsum; ichimlik m³/sut; oqova m³/sut | m³ | kattalashtirilgan | ✓ |
| Yomgʻir | Hisobiy oqim; ushlab qolinadigan ulush | m³, % | ✓ | ✓ |
| Relyef | Qazish / toʻkish balansi | m³ | — | ✓ |
| Elektr | Oʻrnatilgan / hisobiy quvvat; yillik isteʼmol; yoritgichlar | kVt, kVt·soat, dona | kattalashtirilgan | ✓ |
| Tarmoqlar | Uzunlik tur boʻyicha; ulanishlar soni | m, dona | — | ✓ |
| Narx | CAPEX jami, soʻm/m², soʻm/ga ($ ixtiyoriy) | soʻm | ✓ (P25–P75) | ✓ |
| Parvarish | OPEX/yil, soʻm/m²/yil, 1 tashrifga | soʻm | ✓ | ✓ |
| Sifat | 3-30-300, PSD balansi, NbS cheklisti | ball | ✓ | ✓ |

---

## 7. Normalar holati (14.11)

| Hujjat | Nima uchun | Holat |
|---|---|---|
| ShNQ 2.07.01-23 (joriy tahrir) | 35, 36, 33, 34-jadvallar; 7-jadval; 199–203, 240–244, 463–464, 480–491, 501–502, 592–601-bandlar | **oʻqildi** |
| ShNQ 2.04.02-19 Suv taʼminoti. Tashqi tarmoqlar | 2.3-band, 4-jadval (sugʻorish), 2–3-jadvallar (koeffitsiyentlar) | **oʻqildi** (skaner, 6–7-betlar); qolgan boblari — kerak boʻlganda |
| ShNQ 2.04.18-22 Tashqi yoritish | 18, 19, 30, 41, 43, 54, 59–62, 83-bandlar | **oʻqildi** |
| ShNQ 2.04.08-22 Gaz | kafe oshxonasi | bor |
| ShNQ 2.01.01-22 Iqlim | hisobiy yogʻin (244), harorat | **oʻqildi** — 12-jadval (yogʻin) |
| ShNQ 2.01.05-24 Tabiiy va sunʼiy yoritish | yoritilganlik normalari | **oʻqildi** — 16, 17, 18-jadvallar |
| ShNQ 2.04.01-22 Binolarning ichki suv taʼminoti | tashrifchi / kafe / hojatxona suv normasi | **oʻqildi** — 3-ilova; park tashrifchisi normasi yoʻq; sugʻorish 26-qator (uchinchi ziddiyat) |
| QMQ 2.04.03-19 / SHNQ 2.04.03-24 Oqova | kanalizatsiya | papkada eski QMQ 2.04.03-19; yangisi yoʻq |
| QMQ 2.04.17-19 / SHNQ 2.04.17-24 Elektr jihozlari | K_talab | papkada eski QMQ; yangisi yoʻq |
| ShNQ 2.04.15-23 Fotoelektrik stansiyalar | quyosh panelli yoritish varianti | papkada bor |
| ShNQ 2.07.02-24 Nogironlar | qiyaliklar, yoʻlaklar, oʻrindiqlar | **oʻqildi** — 15–19, 23, 31, 33, 42-bandlar (`bogshunos-asboblar-kutubxona-14-11.md` 6.2) |
| QMQ 2.04.03-19 Kanalizatsiya. Tashqi tarmoqlar | qoplama z koeffitsiyenti | **oʻqildi** — 2.17–2.18, 9–10-jadvallar (6.1); yangi SHNQ 2.04.03-24 papkada yoʻq |
| GOST 24909-81 / 25769-83 (MDS 13-5.2000 orqali) | koʻchat oʻlchamlari | topildi (A) |
| USDA Urban Tree Database (2016) | daraxt oʻsishi | usul topildi (A); qiymatlar PR-2 da |
| SanQvaN 0103-25 SMZ | mahalliy tozalash inshootlari | papkada bor |
| **SanQvaN 0339-16** | sugʻorish (65-band, 65.1-jadval), bogʻlar (51–54.1), shovqin (24.1, 28.1), daraxtlar (74.1–74.2), supurindi (66.1) | **lex.uz da oʻqildi** (oʻzbekcha matn, -8465662); asosiy bandlar `claude/normalar-txt/SanQvaN-0339-16-parcha.md`; 100 000 belgidan keyingi qism oʻqilmagan |
| SHNQ 2.06.03-21 (yoki 2.06.03-12) Sugʻorish tizimlari | sugʻorish tarmogʻi (599) | internetda **topilmadi**; belgisi ham chalkash |
| QR 07.03-23 Sugʻorish tizimlari (qurilish reglamenti) | qurilish va qabul | lex.uz da bor (files/8436975.pdf) |
| SanQvaN 0329-16 Aholi punktlari hududlarini saqlash va obodonlashtirish | parvarish (OPEX) | roʻyxatda bor (gov.uz), oʻqilmagan |
| «Oʻzbekistonda kompleks obodonlashtirish boʻyicha namunaviy yechimlar albomi» (mc.uz, uslubiy tavsiya) | elementlar kutubxonasi va namunaviy yechimlar | topildi, oʻqilmagan |
| VMQ 1050 (26.12.2018) Elektr tarmogʻi xoʻjaligi obyektlarini muhofaza qilish qoidalari | ELU va kabel muhofaza zonalari, zonadagi taqiqlar | **oʻqildi** (lex.uz, 14, 15, 17, 20-bandlar) |
| EUQ (Elektr qurilmalarining tuzilishi qoidalari) | toj — sim masofasi | **yoʻq** |
| VMQ 174 (1992) → VMQ 981 (2019) | suvni muhofaza qilish zonalari | **ikkalasi kuchini yoʻqotgan** (981 — 23.06.2026, VMQ 317); yangi nizom topilmadi; Suv kodeksi (30.07.2025) metr bermaydi |
| SanQvaN 0267-20, 0198-06, 0083-24 | shovqin, rekreatsiya zonalari, suv obyektlari | **yoʻq** |
| VMQ 480 (8.09.2026) oʻrtacha bozor va boshlangʻich narx nizomi | CAPEX narx manbai | topildi (uza.uz, anhor.uz, norma.uz): 90 kunlik bozor narxlari, elektron maʼlumotnoma; 2028-yil 31-dekabrgacha amal qiladi; asl matn lex.uz da hali ochilmadi |
| Xorijiy tashrif normalari (RU SP 475, CN GB 51192, US Florida, KZ) | taqqoslash ustuni | 2.4; CN va KZ qiymatlari — **P** |
| Narx manbai | CAPEX | 4.3 — maslahat |

---

## 8. Savollar va javoblar (14.11, 03:37)
1. 14 qadam — **hozircha qoladi**, keyin koʻriladi.
2. Master reja ichida muhandislik — **bitta umumiy modul**; Iskandar asosan **alohida loyihalarni** nazarda tutgan → alohida rejim birinchi navbatda.
3. SHNQ 2.04.02-19 — papkada topildi va oʻqildi (4-jadval). SanQvaN 0339-16 — lex.uz da topildi va oʻqildi (14.11, 04:00); ShNQ bilan ikki joyda zid (maysazor sugʻorish 15–20 / 6 l/m²; daraxt — trotuar 0,7 / 1,2 m). SHNQ 2.06.03-21 — internetda topilmadi.
4. Narx va tariflar — 4 va 5-boʻlimlar. Boshlangʻich narx kimdan — **4.3** (portal narxlar moduli + koʻchatxonalar + pudratchilar).
5. Kunlik tashrif — Iskandar usul bilmaydi → 2.1 (normativ) + 2.2 (sanash bilan kalibrlash) taklif qilindi.
6. Kesim qoʻshimchalari — beshalasi maʼqullandi (10.3); kanvasda namuna navbatda.

## 9. Navbat (bittadan)
1. ~~Iskandar: ekranlar, ziddiyat qoidasi, 3 l/kishi~~ — **tasdiqlandi (14.11, 10:01)**.
2. Normalar — bajarildi (14.11): 2.04.01-22, 2.01.05-24, 2.01.01-22, SanQvaN 0339-16. 14.11, 08:00: VMQ 1050 (ELU zonalari) oʻqildi; suv muhofaza zonalari nizomi kuchini yoʻqotgani aniqlandi. Qolgan: yangi suv muhofaza nizomi (bormi?), EUQ, SHNQ 2.06.03-21, SanQvaN 0267/0198/0083.
3. Kanvas: landshaft kesimi namunasi — **bajarildi** (E, L-03). «Landshaft albomi» maketlari — **bajarildi** (F); qarorlar olindi; «la» oilasi `claude/chizmadon-src/landshaft-albomi-la.js` da — kod chatida layouts.js ga qoʻshiladi. Bogʻshunos ichidagi render — Master reja PR-3 (3D qatlamlar) bilan bitta modul.
4. Asboblar va kutubxona sxemasi — `claude/bogshunos-asboblar-kutubxona-14-11.md` (bajarildi). Keyin kod: PR-1…PR-6 (oʻsha hujjat, 5-boʻlim).

---

## 10. Grafika va varaqlar (Iskandar maʼqulladi, 14.11, 03:31)

### 10.1 Ish taqsimoti
- **Bogʻshunos grafikani yaratadi** — maʼlumot shu yerda (relyef, elementlar, oʻsimliklar, tarmoqlar). Har qadamda «Reja / Akso / Kesim» koʻrinishi va **«Chizmadonga →»** tugmasi.
- «Chizmadonga →» joriy koʻrinishni masshtab, qatlamlar va uslub bilan Chizmadonning **«Loyihadan»** paneliga yuboradi; u yerda maket katagiga avtomatik joylashadi (`chizmadon-bitta-oyna.md`).
- Yuborilgan narsa — **modelga bogʻlangan material**, rasm emas: daraxt surilsa, varaqdagi reja va kesim yangilanadi.
- **Ikki xil varaq:** texnik varaqlar (masshtabli, shtampli, avtomatik: ekish rejasi 1:500, razbivka, vertikal reja, tarmoqlar, vedomostlar) va taqdimot varaqlari (referenslardagi uslub — Chizmadon maketlarida).

### 10.2 Referenslardagi 17 tur + muhandislik — qaysi qadamda yaratiladi

| Varaq turi (referens, `binokor-bogshunos-2-bosqich` 3.2) | Qadam | Qanday |
|---|---|---|
| Kesim va razvyortka (A–A … E–E) | 3 (relyef kesimi), 6 (sxematik), 7–12 (loyiha) | «Kesim chizigʻi» asbobi istalgan qadamda; kesim DEM, daraxtlar (tanlangan yildagi balandlik), qoplama, suv sathi va Master reja binolaridan avtomatik |
| Bosh reja + raqamli eksplikatsiya | 6, 11 | Modeldan avtomatik; eksplikatsiya raqamlari oʻzi qoʻyiladi |
| Zonalash, yoʻllar ierarxiyasi | 6, 8 | Rejaning «diagramma» koʻrinishi |
| Qatlam diagrammalari | 6 | Akso koʻrinish, qatlamlarga ajratilgan |
| Chet va qirgʻoq tipologiyalari | 6 | Kutubxona modullaridan kartalar varagʻi |
| Umumiy va fragment aksolari | istalgan | «Akso» koʻrinishi; fragment — ramka bilan tanlanadi |
| Ekish rejasi (belgi + son) | 9 | Yorliq va son avtomatik (4c9bf9 uslubi) |
| Assortiment pasporti, fasllar jadvali | 9 | Oʻsimliklar bazasidan jadval (har tur — 12 oylik rang) |
| Qoplama, yoritish, mebel | 8, 11 | Vedomost bilan birga |
| Suv | 10 | Reja va kesim |
| Sport va oʻyin modullari | 11 | Jihoz kartasi, oʻlchamlari bilan |
| Hovli | Master reja rejimi | — |
| Zichlik tipologiyalari, tuman freymvorki (5 daqiqalik radius) | 2 | Atrof tahlili (Joyshunos) |
| Agrolandshaft, mavzuli bogʻ | 6 / 9 | — |
| Imkoniyat va cheklov xaritasi (yangi) | 4 | Moslik xaritasi + cheklovlar legendasi |
| Muhandislik (yangi) | 7, 10, 12, 13 | Vertikal reja, sugʻorish sxemasi (gidrozonalar), yoritish rejasi, tarmoqlar, TIK, smeta |

### 10.3 Kesim uslubi
- Asos — maʼqullangan **K-00…K-08** (`kesim-fasad-referenslar-13-11.md`).
- **Landshaft kesimi uchun qoʻshimchalar (Iskandar beshalasini maʼqulladi, 14.11):**
  1. **Oʻsish solishtirmasi:** bitta kesimda daraxtlar ekilgan yil, 10 va 20 yildan keyin (toj va balandlik bazadan) — uch xil chiziq yoki uchta kichik kesim yonma-yon.
  2. **Yer osti qatlami:** tuproq qatlamlari, daraxt ildiz hajmi (V = 0,6·π·r²), yer osti tarmoqlari va 35-jadval masofalari — kesimda oʻlcham chiziqlari bilan.
  3. **Suv sathlari:** hovuz, ariq, yomgʻir bogʻining yozgi va qishki sathi, toshqin chizigʻi (daryo boʻyi loyihalari uchun).
  4. **Soya va iqlim:** 21.06 va 22.12 da quyosh burchagi, yoʻlakka tushadigan soya uzunligi (K-07 dan landshaftga moslangan).
  5. **Odam faoliyati:** shtaffaj — oʻtirgan, yurgan, oʻynayotgan odamlar, velosiped; kesimning qaysi joyi qaysi faoliyatga moʻljallanganini koʻrsatish.
- Shtaffaj: odamlar — `mr/src/ui/silh.json` (bor); daraxtlar — CAD blok uslublari (`cad-bloklar-tanlash-13-11.md`, navbatda); transport — oʻsha hujjat.

### 10.4 Yetishmaydiganlar
1. **Chizmadonda landshaft maketi yoʻq** → yangi **«Landshaft albomi»** maket oilasi — kanvasda F (14.11, Iskandar koʻrib chiqadi). A3 landshaft, 12 × 8 toʻr, «album» sarlavhasi, 16 varaq turi: muqova; mundarija; boʻlim ajratgich; atrof tahlili (2-qadam); joy tahlili, 6 modul (3); imkoniyat va cheklovlar (4); tashrif modeli va dastur (5); konsepsiya zonalari (6); bosh reja + eksplikatsiya (6, 11); kesim A–A, L-03 uslubi (7–12); ekish rejasi (9); assortiment va fasllar (9); suv va sugʻorish (10); muhandislik tarmoqlari (12); TIK va narx (13–14); akso va render. Yangi rollar: kesim, detal, fasllar jadvali, tekshiruv. **Qarorlar (Iskandar, 14.11, 09:47):** render — Bogʻshunos ichida, Master rejadagidek (3D sahnadan kadr → render; muqova va akso shu tarixdan); til — albom butunlay tanlangan tilda (10 til), ikki tilli emas; format — A3, A2, A1, A0, toʻr 12 × 8 oʻzgarmaydi. Kodga tayyor oila: `claude/chizmadon-src/landshaft-albomi-la.js` (layouts.js ga qoʻshiladi; yangi: SRC «BG», table kind «season»).
2. **Daraxt shtaffaji** — CAD blok uslublari tayyor boʻlishini kutadi.

---

## Manbalar (14.11)
- ShNQ 2.04.02-19 (skaner PDF, 6–7-betlar: 2.3-band, 2–4-jadvallar); ShNQ 2.04.18-22 (Qurilish vazirining 23.06.2022 dagi 115-son buyrugʻi); ShNQ 2.07.01-23 joriy tahrir.
- SanQvaN 0339-16 — https://lex.uz/ru/docs/-8465662 (oʻzbekcha matn); roʻyxat — gov.uz/ru/ssv/sections/view/6381; ShNQ 2.07.01-23 ning 01/2-42 oʻzgartirishi — lex.uz/ru/acts/7954120; QR 07.03-23 — lex.uz/files/8436975.pdf.
- Tariflar: buxgalter.uz «Сколько платят за коммунальные услуги юридические лица» (15.05.2026; PKM № 243); goldenpages.uz elektr tariflari; spot.uz (Toshkent viloyati suvi, 17.09.2026); buxgalter.uz «Что меняется в налоге на воду в 2026 году».
- Smeta: mc.uz — ShNK 4.02.xx resurs-smeta normalari toʻplamlari; gov.uz/mc — ShNQ 4.02.00-04; buxgalter.uz / podrobno.uz — smeta narxlash tizimi tanqidi.
- Normalar (14.11): ShNQ 2.04.01-22 (3-ilova), ShNQ 2.01.05-24 (16–18-jadvallar), ShNQ 2.01.01-22 (12-jadval) — `D:\Work\normalar`.
- Xorijiy: SP 475.1325800.2020 «Parki»; SNiP 2.07.01-89; GB 51192-2016; Florida DEP Recreational Carrying Capacity Guidelines; SN RK 3.01-01-2013, SN RK 1.02-01-2016.
- Narx: uza.uz va anhor.uz — VMQ 480 (8.09.2026) vaqtinchalik nizomi; lex.uz/mact/-7952218 (PF-259 asosidagi modul); anhor.uz — Yangi Avlod SIZ 40 daraxt koʻchirish; afisha.uz — Bahor Gullari; goldenpages.uz, prom.uz, olx.uz.
- Tashrif: Metropolitan Council «Annual Park and Trail Use Estimates Methodology» (2023); NRPA / RAND — SOPARC (Cohen va boshq., 2014; McKenzie va boshq., 2006); Eco-Counter (Los-Anjeles parklari).
