# Master reja — tanishtiruv (onboarding) ssenariysi va tugmalar xaritasi

Sana: 06.11.2026 · Asos: kod (origin/main, be725da) + yangi foydalanuvchi ko'zi bilan tekshiruv
Maqsad: birinchi kelgan odam adashmasin. Ikki qatlam:
- **A — izohlar (tooltip):** har tugmaga sichqoncha 0,4 s tursa — 1 gap izoh + narx (tanga) + kerak bo'lsa qisqa animatsiya. 10 til.
- **B — yo'lboshlovchi (tur):** birinchi kirishda interfeys xiralashadi, kerakli joy yoritiladi, yonida batafsil tushuntirish. "O'tkazib yuborish", "?" bilan qayta ochish, prefers-reduced-motion.

---

## 1. Yangi odam qayerda adashadi (kod va sinovdan)

| # | Muammo | Tur/izoh qanday hal qiladi |
|---|---|---|
| 1 | Chap qatordagi 11 qadam faqat raqam va belgicha — nomi ko'rinmaydi | Tur 2-qadami: qatorni yoritib, 4 bosqichga guruhlab tushuntiradi; har ikonkaga izoh |
| 2 | 2–9-qadamlar uchastka chizilmaguncha qulf — bosilsa faqat "Avval uchastkani chizing" chiqadi | Turda aytiladi; qulf ikonkasining izohida sabab |
| 3 | Kirish (login) 2-qadamdan talab qilinadi (kod izohlarida "3-qadamdan" deb eskirgan yozilgan) | Tur oxirida: "1-qadam bepul va kirishsiz, keyingisi uchun kirish kerak" |
| 4 | 1-qadam uzun (4 bo'lim); "Atrofni yuklash" **ekran markazi** atrofini yuklaydi — avval joyni topish kerak | Tur 3–4-qadamlari aynan shu ketma-ketlikni ko'rsatadi |
| 5 | "Dahani bosib aniqlash" faqat atrof yuklangandan keyin paydo bo'ladi | Turda va 1-qadam ichki maslahatida aytiladi |
| 6 | Generatsiya qayerda — 5-qadam; avval daha tanlanmasa "Variant taklif qil" o'chiq | 5-qadamga birinchi kirishda mini-maslahat |
| 7 | Dahalar ko'chalardan hosil bo'ladi (2-qadam "To'r" → "To'rni qo'llash"), funksiya 3-qadamda | Tur 7-qadami: ish oqimi sxemasi |
| 8 | Me'yorlar pastki o'ngda ("Me'yorlar" + raqam) — ko'p odam 10-qadamni qidiradi | Tur 6-qadami |
| 9 | Og'ir hisoblar (insolyatsiya, shamol, xonadon derazalari) pullik; haftada 1 marta bepul. `#aptGo`da narx belgisi yo'q | Izohda narx; kodda narx belgisini qo'shish |
| 10 | Har yuklab olishda "belgi bilan bepul / toza — N tanga" oynasi; DXF/IFC/GLB/XLSX faqat pullik | Tur 8-qadami + eksport tugmalari izohida |
| 11 | Loyihalar **faqat shu brauzerda** saqlanadi | Tur 5-qadami: "saqlandi" belgisi + JSON zaxira |
| 12 | Panel yo'qolib qoladi (faol qadamni bosish yoki Tab) | Izoh + tur 2-qadamida aytiladi |
| 13 | 5-qadamda bino tanlansa panel o'rnini bino inspektori egallaydi | 5-qadam mini-maslahati: "← N-qadam" yoki Esc |
| 14 | Chizishda ko'rinish majburan "Reja"ga o'tadi; Enter/ikki marta bosish — tugatish, Backspace — oxirgi nuqta, Esc — bekor | Tur 4-qadami (pastki asboblar) |
| 15 | Taqdimot → "Varaqlar" darhol oyna ochmaydi, avval xaritaga ramka qo'yadi | Izohda aytiladi |
| 16 | Tahlil natijalari avtomatik yangilanmaydi (shamol, insolyatsiya, xizmatlar) | 6/9-qadam mini-maslahati |
| 17 | Muhim amallar o'ng tugma menyusida (loyiha markazini ko'chirish, OSM binosiga funksiya) | Tur 4-qadamida eslatiladi |
| 18 | 3 ga dan katta uchastkada 7–11-qadamlar "Loyihani ochish" to'lovini so'raydi | Qulf izohida + tur 8-qadami |

---

## 2. B — yo'lboshlovchi tur (birinchi kirish)

**Qachon:** foydalanuvchi muharrirni birinchi marta ochganda (localStorage `mr-tour-v1`). Yuqori paneldagi **"?"** tugmasi bilan istalgan payt qayta boshlanadi.
**Ikki holat:** bo'sh loyiha (uchastka yo'q) — to'liq tur; tayyor loyiha ("Namuna" yoki ochilgan fayl) — 3–4-qadamlar "uchastka allaqachon bor" matni bilan.
**Har kartochkada:** sarlavha, 2–4 gap tushuntirish, "Batafsil" ochiladigan qism, qadam raqami (3 / 9), "Orqaga · Keyingi", "O'tkazib yuborish". Klaviatura: → / ← / Esc.
**Animatsiya:** yoritilgan joy atrofida yumshoq puls; ba'zi qadamlarda kursor animatsiyasi (sichqoncha qayerni bosishini ko'rsatadi). reduced-motion yoqilgan bo'lsa — faqat statik ramka.

### 0 · Xush kelibsiz (markazda, yoritishsiz)
**Sarlavha:** Master reja — kvartaldan mikrorayongacha
**Matn:** Bu yerda joyni tanlab, ko'chalar, dahalar va binolarni loyihalaysiz; dastur har o'zgarishda TEP va O'zbekiston me'yorlarini (ShNQ, QMQ, SanQvaN) tekshirib boradi. Ish 11 qadamdan iborat. Tanishtiruv 2 daqiqa oladi.
**Tugmalar:** "Boshlash" · "O'tkazib yuborish" · (kichik) "Namuna loyihani ochish"

### 1 · Chap qator — 11 qadam
**Yoritiladi:** `nav.rail`
**Matn:** Ish chapdan — yuqoridan pastga boradi. Qadamlar 4 guruhga ajratilgan:
- **Joy (1–2):** joy va uchastka chegarasi, ko'chalar
- **Reja (3–6):** dahalar va funksiyalar, yashil karkas, binolar hajmi, quyosh va shamol
- **Detal (7–10):** fasad, xonadonlar, xizmatlar, me'yoriy tekshiruv
- **Natija (11):** taqdimot va eksport
**Batafsil:** Uchastka chizilmaguncha 2–9-qadamlar qulf. Tartibni buzish mumkin — masalan, 10-qadamga istalgan payt qaytasiz. Faol qadamni yana bossangiz yoki Tab tugmasini bossangiz panel yig'iladi — sahna kengayadi; yana bossangiz qaytadi. Har qadam pastida "Oldingi / Keyingi".
**Animatsiya:** ikonkalar ketma-ket yonadi, guruh nomlari chiqadi.

### 2 · Joyni topish
**Yoritiladi:** `#q` qidiruv
**Matn:** Manzil, mahalla yoki koordinatani yozing — xarita o'sha joyga uchadi. Yoki xaritani sichqoncha bilan suring va g'ildirak bilan yaqinlashtiring.
**Batafsil:** Juda uzoqlashsangiz dunyo xaritasi ochiladi — u yerdan "Shu yerda ochish". Loyiha markazini keyin ham o'ng tugma → "Loyiha markazini shu yerga ko'chirish" bilan o'zgartirasiz.

### 3 · Atrofni yuklash
**Yoritiladi:** `#ctxLoad` + radius tugmalari
**Matn:** Mavjud binolar, yo'llar, suv, yashil hududlar, relyef va sun'iy yo'ldosh suratini yuklaydi (OpenStreetMap). Bepul. **Ekran markazi** atrofida yuklanadi — shuning uchun avval joyni toping.
**Batafsil:** Radius 300 m – 4 km; kattasi sekinroq. Atrof yuklangach me'yorlar (kirish yo'llari, xizmatlar, cheklovlar) avtomatik hisoblanadi. Qatlamlarni yuqori o'ngdagi "Qatlamlar"da yoqib-o'chirasiz.

### 4 · Uchastka chegarasini chizish
**Yoritiladi:** "Chegara" bo'limi (`#drawSite`, `#pickBlock`, `#rectSite`, `#siteMore`)
**Matn:** Uch usul:
1. **Sahnada chizish** — nuqtama-nuqta bosing; Enter yoki ikki marta bosish — tugatish, Backspace — oxirgi nuqtani o'chirish, Esc — bekor.
2. **Dahani bosib aniqlash** — ko'chalar bilan o'ralgan dahani bir bosishda oladi (atrof yuklangandan keyin chiqadi).
3. **To'rtburchak** — eni × bo'yi kiritib "Qo'yish".
Fayldan ham yuklash mumkin (KML/KMZ, GeoJSON, DXF) — "Boshqa usullar".
**Batafsil:** Chizilgach dastur kirish yo'llarini va cheklovlarni (qabriston, ELU, suv, sanoat SMZ) aniqlaydi — "Mavjud holat va cheklovlar" bo'limida yaroqli maydon ko'rsatiladi. Chegara burchaklarini keyin sudrab tahrirlaysiz.
**Kursor animatsiyasi:** 4 nuqta bosiladi, poligon yopiladi.

### 5 · Pastki asboblar va o'ng tugma
**Yoritiladi:** `.tb`
**Matn:** Tanlash (V), Qo'l — surish (H), Chizg'ich (M), Kesim (S), Uslub nusxasi (I), Bekor qilish (Ctrl+Z) va Qaytarish (Ctrl+Shift+Z).
**Batafsil:** Ko'p amallar **o'ng tugma** menyusida: binoga qavat qo'shish/olish, nusxa, o'chirish, dahani izolyatsiya qilish, sahna rasmi. Chizish paytida ko'rinish avtomatik "Reja"ga o'tadi. Pastda paydo bo'ladigan sariq satr — joriy amal bo'yicha maslahat.

### 6 · Yuqori panel — ko'rinish, saqlash, taqdimot
**Yoritiladi:** ko'rinish tugmalari, "saqlandi", Kamera, Taqdimot, "?"
**Matn:** Reja / Aksonometriya / Perspektiva — kamera turi. Sodda / To'liq — og'ir sahnada tezlik uchun (eksportga ta'sir qilmaydi). Kamera — ko'z sathi, 2 nuqtali perspektiva, saqlangan ko'rinishlar. Taqdimot — varaqlar va albom.
**Muhim:** "saqlandi" — loyiha avtomatik saqlanadi, lekin **faqat shu brauzerda**. Boshqa kompyuterga o'tish yoki zaxira uchun 11-qadamda "Loyiha fayli (JSON)" (bepul).
**Oxirida:** "?" tugmasi — shu tanishtiruvni qayta ochadi.

### 7 · Ko'rsatkichlar va me'yorlar
**Yoritiladi:** `.kpibar` + `#kMore`
**Matn:** Har o'zgarishda yangilanadi: uchastka (ga), umumiy maydon (GFA), UMN (KPZ), aholi. "Barcha ko'rsatkichlar" — FAR, zichlik, o'rtacha qavat, ish o'rinlari. **"Me'yorlar"** belgisi: ✓ — hammasi joyida, qizil raqam — buzilgan me'yorlar soni.
**Batafsil:** Bosilsa me'yorlar ro'yxati ochiladi (10-qadam bilan bir xil): band, qiymat, chegara, natija. "Qayerda" belgisi muammoni sahnada ko'rsatadi; ayrim qatorlarda "Tuzatish" tugmasi bor (masalan, antiseysmik chok).

### 8 · Ish oqimi — loyihani qanday qurasiz
**Yoritiladi:** ketma-ket 2 → 3 → 5 → 10 → 11 ikonkalari (strelka bilan)
**Matn:**
1. **Ko'chalar (2):** "To'r" yorlig'ida modulni tanlab "To'rni qo'llash" — yoki ko'chalarni qo'lda chizing. Ko'chalar uchastkani dahalarga bo'ladi.
2. **Dahalar (3):** dahani bosing — kursor yonida funksiyalar chiqadi (turar, aralash, ofis, maktab, park…). Mavjud binolarni saqlash yoki buzishni shu yerda belgilaysiz.
3. **Hajmlar (5):** dahani tanlab, tipologiya va maqsadli UMN → **"Variant taklif qil"** (yoki "Hammasi"). Seksiyalar me'yorlar asosida (chekinishlar, insolyatsiya, yong'in yo'llari) joylashadi. Bino tanlansa — inspektor: qavat, funksiya, stilobat, terrasa.
4. **Tekshiruv (10)** va **Eksport (11).**
**Batafsil:** 4 (yashil), 6 (quyosh/shamol), 7 (fasad), 8 (xonadonlar), 9 (xizmatlar) — chuqurlashtirish uchun, tartib majburiy emas.

### 9 · Tangalar va kirish (yakun) — do'stona ohang (06.11 tasdiqlangan yo'nalish)
**Yoritiladi:** hisob tugmasi
**Sarlavha:** Asosiy ish — bepul
**Matn:** Loyihalash, chizish va tekshirish uchun hech narsa to'lamaysiz. Tanga faqat chuqur hisoblar va toza fayllar uchun kerak bo'ladi.
- **Bepul:** uchastka, ko'chalar, dahalar · me'yoriy tekshiruv va TEP · har loyihada 3 ta generatsiya · belgili rasm va PDF · loyiha fayli (zaxira).
- **Tanga bilan:** insolyatsiya va shamol hisobi (haftada 1 tasi sovg'a) · belgisiz (toza) fayllar · DXF, IFC, 3D model, Excel.
- **Ishonch qatori:** "Hech narsa so'ramasdan yechilmaydi. Narx tugmaning o'zida oldindan ko'rinadi va har safar tasdiqlaysiz. Bitta loyiha uchun umumiy yuqori chegara bor — undan keyin hammasi bepul."
- **Kirish:** "1-qadam kirishsiz ishlaydi. Davom etish uchun pochta orqali kiring — parol kerak emas, 6 xonali kod keladi."
- Aniq raqamlar turda yo'q — ular tugma izohlarida.
**Tugmalar:** "Boshlash" · "Namunani ochish"
**Kichik yozuv:** "Tanishtiruvni yuqoridagi ? tugmasi bilan qayta ochasiz."

---

## 3. Qadamga birinchi kirishdagi mini-maslahatlar (1 kartochka, yoritishsiz)
Tur tugagach, har qadam birinchi marta ochilganda panel tepasida bir marta chiqadi ("Tushunarli" bilan yopiladi).

| Qadam | Maslahat |
|---|---|
| 2 Ko'chalar | Tez yo'l — "To'r" yorlig'i → modul → "To'rni qo'llash". Profilni almashtirish: ko'chani tanlab "Profillar"dan karta bosing. OSM yo'lini bosib "Loyihaga olish" mumkin. |
| 3 Dahalar | Dahani bosing — funksiya kursor yonida chiqadi. Mavjud binoni ikki marta bosish — saqlash/buzish. Dahani parsellarga bo'lish — "Parsellar" bo'limi. |
| 4 Yashil | Me'yor — kamida 25 % (ShNQ 2.07.01-23 §86). "Hovlilarni avtomatik obodonlashtirish" o'yin/sport maydonchalarini hisoblaydi. |
| 5 Hajmlar | Avval dahani tanlang (ro'yxat yoki sahnada bosish) — keyin "Variant taklif qil". Bino tanlansa panel inspektorga aylanadi: qaytish — "← 5-qadam" yoki Esc. Qavat: PgUp/PgDn yoki + / −. |
| 6 Quyosh/shamol | Soyalar bepul va jonli. "Insolyatsiya xaritasi" va "Shamol oqimi" — og'ir hisob (haftada 1 bepul). Loyiha o'zgarsa natija qayta hisoblanmaydi — qayta bosing. |
| 7 Fasad | Avval "Qaysi binolarga": tanlangan / funksiya bo'yicha / hammasi. Ko'rinishga ta'sir qiladi, TEPga emas. |
| 8 Xonadonlar | Kvartirografiya sliderlari → seksiyalar xonadonlarga bo'linadi. "Qavat rejalarida ochish" — poetaj rejalar albomi. "Derazalar insolyatsiyasi" — og'ir hisob. |
| 9 Xizmatlar | Bog'cha, maktab, poliklinika va boshqalargacha piyoda masofa ShNQ radiuslari bilan. Xaritada yo'q obyektni "Qo'lda qo'shish" bilan belgilang. |
| 10 Tekshiruv | "Mos emas" filtri — faqat buzilganlar. Seysmiklik, rekonstruksiya, uy-joy normasi — "Qo'shimcha" ichida. |
| 11 Eksport | Rasm va PDF — belgi bilan bepul yoki toza (tanga). Varaqlar oynasida bosh reja, zonalash, aksonometriya varaqlari va albom. "Loyiha fayli (JSON)" — bepul zaxira. |

---

## 4. A — izohlar (tooltip) jadvali

Format: **izoh matni** · narx (bazaviy; real narx = baza × k, k = max(1, √(ga/3)), masalan 4 ga → 1,2; 30 ga → 3,2) · animatsiya (A = bor).
Shortcut bo'lsa izohda kulrang ko'rsatiladi.

### 4.1 Yuqori panel
| Element | Izoh | Narx | Anim. |
|---|---|---|---|
| ← Loyihalar | Loyihalar ro'yxatiga qaytish. Loyiha avtomatik saqlangan. | — | |
| Loyiha nomi | Nomni o'zgartirish uchun bosing, Enter bilan saqlang. | — | |
| saqlandi | Loyiha shu brauzerda avtomatik saqlanadi. Zaxira — 11-qadam, JSON. | — | |
| Reja | Yuqoridan ortogonal ko'rinish; chizish shu rejimda. | — | |
| Aksonometriya | Hajmlarni burchakdan, perspektivasiz ko'rish. | — | |
| Perspektiva | Inson ko'zi kabi; Kamera menyusida ko'z sathi. | — | |
| Sodda / To'liq | Sodda — uzoqdagi derazalar va daraxtlarni yashiradi, tezroq. Eksport doim to'liq. | — | |
| Kamera | Obyektiv, ko'z sathi, 2 nuqtali perspektiva, kadr, saqlangan ko'rinishlar. | Kadr PNG: 2 yoki belgi bilan bepul | |
| Taqdimot | Varaq ramkasini xaritaga qo'yish va Chizmadon albomi. | — | |
| ⚙ Sozlamalar | Til (10 ta) va tungi rejim. | — | |
| Hisob | Kirish, tanga balansi, xarid, tarix. | — | |
| ? (yangi) | Tanishtiruvni qayta ochish. | — | |

### 4.2 Xarita tugmalari (yuqori o'ng)
| Element | Izoh | Narx |
|---|---|---|
| Xarita | Fon (maket, sxema, sun'iy yo'ldosh), sahna uslubi, qog'oz teksturasi, portlatilgan qatlamlar. Hisobga ta'sir qilmaydi. | — |
| Qatlamlar | Atrof qatlamlari, yozuvlar, o'z GeoJSON qatlamlaringiz va yer sathi xaritalari (qizish, suv bosish, namlik). | — |
| Dunyo | Butun dunyo xaritasi — boshqa shaharga tez o'tish. | — |

### 4.3 Chap qator (har ikonka)
Izoh = qadam nomi + 1 gap + (qulf bo'lsa) sabab:
1. **Joy va uchastka** — joyni topish, atrofni yuklash, chegara chizish. Bepul, kirishsiz.
2. **Ko'chalar** — ko'cha o'qlari va profillari; qizil chiziq, trotuar, daraxtlar avtomatik.
3. **Yer uchastkalari va zonalar** — dahalarga funksiya, mavjud binolarni saqlash/buzish.
4. **Yashil karkas** — ko'kalamzorlik balansi (≥25 %), hovli va maydonchalar.
5. **Hajmlar** — binolarni generatsiya qilish yoki qo'lda chizish. 3 ta generatsiya bepul.
6. **Quyosh va shamol** — soyalar, insolyatsiya xaritasi, shamol oqimi.
7. **Fasad va tom** — material, derazalar, balkonlar, tom.
8. **Xonadonlar** — kvartirografiya, poetaj rejalar, deraza insolyatsiyasi.
9. **Xizmatlar va piyoda** — bog'cha, maktab, poliklinika va bekatlargacha masofa.
10. **Me'yoriy tekshiruv** — barcha me'yorlar bir jadvalda.
11. **Taqdimot va eksport** — varaqlar, PDF, DXF, 3D, IFC.
Qulf matnlari: "Avval uchastkani chizing (1-qadam)" · "Kirish kerak" · "Uchastka 3 ga dan katta — loyihani ochish: N tanga".

### 4.4 Pastki asboblar
| Element | Izoh | Anim. |
|---|---|---|
| Tanlash (V) | Bino, ko'cha yoki dahani tanlash; Shift — bir nechtasini. | |
| Qo'l (H) | Xaritani surish. Bo'sh joyda sudrash ham suradi. | |
| Chizg'ich (M) | Masofa va maydonni o'lchash. | A |
| Kesim (S) | Gorizontal yoki chizilgan vertikal kesim. | A |
| Uslub nusxasi (I) | Bir binoning fasad uslubini boshqasiga ko'chirish. | A |
| Bekor qilish | Oxirgi amalni bekor qilish (Ctrl+Z). | |
| Qaytarish | Bekor qilinganni qaytarish (Ctrl+Shift+Z). | |

### 4.5 Ko'rsatkichlar satri
| Element | Izoh |
|---|---|
| Uchastka, ga | Chegara ichidagi umumiy maydon. |
| Yaroqli, ga | Cheklovlar (SMZ, qabriston, ELU) chiqarilgandan keyingi maydon. |
| GFA | Barcha binolarning umumiy qavat maydoni. |
| UMN (KPZ) | Umumiy maydon / uchastka. Rang — me'yor holati. |
| Aholi | Turar maydon va uy-joy normasidan hisoblangan aholi. |
| Barcha ko'rsatkichlar | FAR, qurilish zichligi, o'rtacha qavat, zichlik, ish o'rinlari. |
| Me'yorlar | ✓ — hammasi joyida; raqam — buzilgan me'yorlar. Bosing — ro'yxat. |
| ≈ 1:N | Ekrandagi taxminiy masshtab. |

### 4.6 Qadam ichidagi asosiy tugmalar (narxli va adashtiradiganlari)
| Qadam | Element | Izoh | Narx | Anim. |
|---|---|---|---|---|
| 1 | Qidirish | Manzil, joy nomi yoki koordinata. | — | |
| 1 | Atrofni yuklash | Ekran markazi atrofidagi binolar, yo'llar, relyef, sun'iy yo'ldosh. | bepul | A |
| 1 | Sahnada chizish | Nuqtalarni bosing; Enter — tugatish, Backspace — orqaga, Esc — bekor. | bepul | A |
| 1 | Dahani bosib aniqlash | Ko'chalar bilan o'ralgan dahani bir bosishda chegara qilish. | bepul | A |
| 1 | Qo'yish (eni × bo'yi) | Ekran markaziga to'rtburchak uchastka. | bepul | |
| 1 | Chegarani fayldan | KML/KMZ, GeoJSON yoki DXF. | bepul | |
| 1 | OSM dan aniqlash | Uchastkadagi cheklovlarni (qabriston, ELU, suv…) aniqlash. | bepul | |
| 1 | Qo'lda chizish (cheklov) | OSMda yo'q cheklovni chizish; bufer avtomatik. | bepul | |
| 2 | To'rni qo'llash | Tanlangan modul bo'yicha ko'cha to'ri. | bepul | A |
| 2 | Insolyatsiya bo'yicha eng maqbul burchak | To'rni quyoshga eng yaxshi burchakka buradi. | bepul | |
| 2 | Ko'cha chizish | Ko'cha o'qini chizing; profil tanlangan kartadan. | bepul | A |
| 2 | Loyihaga olish | OSM yo'lini loyiha ko'chasiga aylantirish. | bepul | |
| 2 | Ko'chasozda ochish | Ko'cha kesimini Ko'chasoz vositasida batafsil. | — | |
| 3 | Hammasini saqlash / buzish | Uchastkadagi mavjud binolar holati; buzish — ko'chirish xarajatiga ta'sir. | bepul | |
| 3 | Funksiya chiplari | Dahaning vazifasi — me'yorlar va generatsiya shunga bog'liq. | bepul | |
| 3 | Dahani parsellarga bo'lish | O'lcham va burchak bo'yicha yer uchastkalariga bo'lish. | bepul | A |
| 3 | Dahani izolyatsiya qilish | Faqat shu dahani ko'rsatish. | — | |
| 4 | Hovlilarni avtomatik obodonlashtirish | O'yin, sport, dam olish maydonchalari §90 bo'yicha. | bepul | |
| 4 | Dahalarni park qilish | Tanlangan dahani park/bog'ga aylantirish. | bepul | |
| 5 | Variant taklif qil | Tanlangan dahaga me'yorlar asosida seksiyalar joylashtirish. | 3 ta bepul, keyin 1 | A |
| 5 | Hammasi | Barcha dahalarni bir martada generatsiya (1 hisob). | 3 ta bepul, keyin 1 | |
| 5 | Tozalash | Dahadagi binolarni olib tashlash. | bepul | |
| 5 | Qo'lda bino chizish | O'q bo'ylab, to'rtburchak, erkin shakl, chiziq bo'ylab. | bepul | A |
| 5 | Maqsadli UMN | Generatsiya shu zichlikka intiladi. | — | |
| 5 | Inspektor: Stilobat ustida / Antiseysmik chok | Binoni stilobatga qo'yish; chok sxemasi seysmik blok uzunligi bo'yicha. | — | |
| 6 | Insolyatsiya xaritasi | SanQvaN 0102-25 bo'yicha uchastka insolyatsiyasi. | 4 (haftada 1 bepul) | A |
| 6 | Shamol oqimi | Piyoda sathida shamol qulayligi (Lawson). | 5 (haftada 1 bepul) | A |
| 6 | Vaqt slayderi | Soyalarni kun davomida ko'rish. | bepul | |
| 7 | Qaysi binolarga | Tanlangan / funksiya bo'yicha / hammasi. | bepul | |
| 8 | Derazalar insolyatsiyasi | Har derazaning insolyatsiya davomiyligi. | 6 (haftada 1 bepul) | A |
| 8 | Qavat rejalarida ochish | Poetaj rejalar albomi. | — | |
| 9 | Qo'lda qo'shish | Xaritada yo'q xizmat obyektini belgilash. | bepul | |
| 10 | Mos emas | Faqat buzilgan me'yorlar. | bepul | |
| 10 | Tuzatish | Avtomatik tuzatish (masalan, antiseysmik chok). | bepul | |
| 11 | Hisobot (PDF) | Brauzer chop etish oynasi orqali PDF. | bepul | |
| 11 | Loyiha fayli (JSON) | To'liq zaxira; boshqa kompyuterda ochish uchun. | bepul | |
| 11 | TEP va reyestr (XLSX) | Excel jadval. | 6 | |
| 11 | Sahna rasmi (PNG) | Joriy ko'rinish. | 2 yoki belgi bilan bepul | |
| 11 | Varaqlar | Bosh reja, zonalash, aksonometriya varaqlari va albom. | ochish bepul | |
| 11 | Illustrator (SVG) | Qatlamli bosh reja. | 4 yoki belgi bilan | |
| 11 | DXF | Reja va hajmlar AutoCAD uchun. | 12 | |
| 11 | 3D (GLB / OBJ) | 3D model. | 8 | |
| 11 | BIM (IFC4) | IFC model. | 15 | |
| 11 | Joyshunosga yuborish | Diagramma uchun Joyshunos vositasiga. | bepul | |
| 11 | Render studiyasiga | Joriy kadrni renderga. | — | |
| Varaqlar | Albom — PDF | Barcha varaqlar bitta PDF. | 20 | |
| Varaqlar | PDF / SVG / PNG varaq | Bitta varaq. | 4 yoki belgi bilan | |

### 4.7 Uy sahifasi va hisob
| Element | Izoh |
|---|---|
| Yangi loyiha | Bo'sh loyiha — 1-qadamdan boshlaysiz. |
| Fayldan ochish | Avval saqlangan JSON loyiha. |
| O'chirish | Loyihani butunlay o'chirish — qaytarib bo'lmaydi. |
| Tanga sotib olish | 10 ta — 39 000 so'm … 1000 ta — 2 mln so'm (Payme, Click, Multicard). |
| Tarix | Tanga sarfi va bu haftaning bepul og'ir hisobi. |
| (yangi) Namuna loyiha | Tayyor misolni ochib ko'rish — o'rganish uchun eng tez yo'l. |

---

## 5. Kodda yo'lakay tuzatiladigan kamchiliklar
1. `#aptGo` (Derazalar insolyatsiyasi) — narx belgisi yo'q, lekin tanga yechadi → `.ptag` qo'shish.
2. "Asosiy ko'rsatkichlar" (`#kAll`) — strings.json'da tarjima yo'q.
3. Kod izohlari "3-qadamdan login" deb eskirgan (E:216, G:1) — haqiqatda 2-qadamdan.
4. Katta uchastka narx guruhi: klient (≤15/≤60/>60 ga) va server (√(ga/3)) farqli tavsiflaydi — tekshirish.
5. Uy sahifasiga "Namuna loyiha" tugmasi (`#/namuna` yo'li bor, lekin ko'rinadigan tugma yo'q) — tur tugmalari unga olib boradi.

## 6. Texnik eslatmalar (A va B uchun)
- Izoh: `data-tip` atributi (i18n kaliti) + `data-price` (item kaliti) → narx jonli hisoblanadi (k va loyiha chegarasi bilan). 0,4 s kechikish, fokusda ham chiqadi (klaviatura), planshetda (1024 px) uzoq bosish.
- Animatsiya: kichik inline SVG/CSS (GIF emas), reduced-motion'da o'chadi.
- Tur: bitta overlay (SVG maska yoki box-shadow "teshik"), kartochka avtomatik joylashadi, ekran o'lchami o'zgarsa qayta hisoblanadi. Holat — localStorage `mr-tour-v1` + qadamlar uchun `mr-tip-step-N`.
- Tungi rejim va 10 til majburiy. Owner panel (`#/egasi`) turga kirmaydi.

---

## 7. Animatsiyalar — tanlov (06.11, kanvas «Master reja — tanishtiruv maketi»)
A = natija, B = kursor harakati, A+B = bitta animatsiyada avval B, keyin A.
- 1 Qadamlar qatori — **B** · 2 Yoritish — **A** (puls) · 3 Atrofni yuklash — **A** (sichqoncha tugmani bosadi + radius) · 4 Sahnada chizish — **B** · 5 Dahani bosib aniqlash — **B** · 6 Chizg'ich — **B**
- 7 Kesim — **B** · 8 Uslub nusxasi — **A+B** · 9 To'rni qo'llash — **A+B** · 10 Ko'cha chizish — **A+B** · 11 Parsellarga bo'lish — **B** · 12 Qo'lda bino — **A+B**
- 13 Variant taklif qil — **A** · 14 Insolyatsiya — **A+B** · 15 Shamol — **A+B** · 16 Derazalar — **A+B**
- 17–27 (yashirin harakatlar, bitta A+B variant): funksiya popup, saqlash/buzish (2× bosish), o'ng tugma menyusi, Me'yorlar→Qayerda→Tuzatish, bino inspektori va ortga, panelni yig'ish (Tab), chegarani tahrirlash, belgili/toza yuklash, varaq ramkasi, natija eskirdi→qayta hisoblash, Reja/Akso/Persp — ko'rib chiqish kutilmoqda.

## 8. Holat (06.11 kechqurun)
- A — tugma izohlari: PR #483 (matn, narx, 10 til), PR #485 (animatsiyalar) — main'da.
- B — yoʻlboshlovchi tur: PR #488 — main'da. 10 kartochka, «?» xarita tugmalari qatorida (Dunyo yonida; yuqori panel 1024 px da sigʻmagani uchun). localStorage `mr-tour-v1`; webdriver (testlar)da oʻzi ochilmaydi.
- Qadamga birinchi kirishdagi mini-maslahatlar (3-boʻlim) va 17–27 animatsiyalarning turdan tashqari joylari — hali qilinmagan.
- Navbatda: real joyda yangi namuna loyiha.
