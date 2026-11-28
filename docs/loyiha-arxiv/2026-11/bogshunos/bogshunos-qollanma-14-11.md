# Bogʻshunos — qoʻllanma va metodika (14.11.2026)

Bogʻshunos — bogʻ va xiyobonlar uchun landshaft master reja xizmati (`mr/bogshunos.html`). Xarita toʻliq ekranda, chapda 7 bosqich. Ogʻir hisob worker'da, natija Bogʻshunosning oʻz «Varaqlar» boʻlimida A3 albom (20 varaq) va PDF.

**Teglar** (har raqam yonida):
- N — norma, asl matndan;
- P — taxmin, tekshirilsin;
- A — xorijiy orientir;
- T — talqin, ya'ni loyiha qoidasi.

**Doimiy qoidalar:**
- Chegara har doim qizil.
- Maʼlumotsiz varaq chiqmaydi.
- Reyestr atributsiyasi: «Toshkent shahri daraxtlar reyestri — green.tashkent.uz (Zamin fondi, Ekologiya vazirligi, Toshkent shahar hokimligi)».
- Reyestrdan shaxsiy maydonlar (`volunteer_id`, `dendrologist_id`) olinmaydi.

## 1. Bosqichlar (interfeys)

| № | Bosqich | Nima qilinadi | Natija |
|---|---|---|---|
| 1 | Hudud | Manzil qidirish yoki xaritada bogʻ ichini bosish (OSM chegarasi taklif qilinadi). Chegarani qoʻlda chizish ham mumkin: ikki marta bosish yoki Enter. Bogʻ turi va rekonstruksiya belgilanadi. | Chegara, maydon |
| 2 | Maʼlumot | 4 manba yuklanadi, holat chiplari bilan: OSM, daraxtlar reyestri, relyef (Terrarium, P), aholi (GHS-POP, A). | Keshlanadi (IndexedDB) |
| 3 | Tahlil | Qatlamlar: cheklovlar, nishab, daraxtlar. Mintaqa kengliklari (kanal, qirgʻoq, shovqin) — foydalanuvchi qiymati (P). | Imkoniyat/cheklov xaritasi |
| 4 | Dastur | Tashrif modeli: N₁ = min(A·q; P·s/k) (501-band, 34-jadval) va xizmatlar (33-jadval). | Dastur |
| 5 | Variantlar | Uch konsepsiya: A, B, C. Yoʻllar — manba–manzil oqimidan. | Variant tanlanadi |
| 6 | Loyiha | 5 modul: Ekish, Kesimlar, Fauna, Tarmoqlar, Narx (pastda batafsil). | Modul natijalari xaritada |
| 7 | Varaqlar | Muallif (shtamp), albomni ochish: toʻliq ekran, ← → tugmalari, PDF. | 20 varaq A3 |

## 2. Loyiha modullari — mantiq va texnologiya

### 2.1 Ekish (`planting.ts`)

**Mavjud daraxtlar boʻyicha qaror.** Daraxt yangi qattiq qoplama, sport yoki amfiteatr ostida qolsa:
- dbh < 40 sm — koʻchiriladi (T);
- dbh ≥ 40 sm — saqlanadi, yoʻl suriladi (480-band, N).

Ailanthus — kesiladi (invaziv, T).

**Yangi daraxtlar uchun joy:**
- bino devoridan ≥ 5 m (35-jadval, N);
- yoʻldan ≥ 1,5 m (T).

Zonalar ustuvorligi:
1. soya (yoʻl chetidan 2–6 m);
2. bolalar maydoni ≤ 15 m;
3. suv ≤ 20 m;
4. qiyalik > 12 %;
5. ochiq joy.

**Tur tanlash.** Zona filtri, keyin R22 xilma-xillik qoidasi: tur ≤ 5 %, turkum ≤ 10 %, oila ≤ 20 %. Teng boʻlsa — mahalliy va kam suv talab qiladigan tur.

**Maqsad:** toj qoplami 30 % (3-30-300, A).

### 2.2 Kesimlar va qirgʻoqlar (`kesim.ts`)

**Kesim chiziqlari** qoidalar bilan quriladi:
- A–A — amfiteatrdan koʻl markazi orqali;
- B–B — unga perpendikulyar.

**Profil** 1 m qadamda olinadi; vertikal masshtab = gorizontal. Unda koʻrinadi:
- yuza turi;
- chiziqdan ≤ 6 m dagi daraxtlar;
- quyosh balandligi tush paytida: 90° − φ ± 23,44°.

Koʻl chuqurligi 1,4 m (P).

**Qirgʻoq tipologiyalari** har 6 m boʻlakka qoidalar bilan beriladi: amfiteatr, terrasa, botqoq, promenada, tik, kanal, tabiiy.

### 2.3 Yashash muhitlari va fauna (`fauna.ts`)

**Muhitlar** (bir katakka bitta muhit, ustuvorlik tartibida):
1. suv;
2. botqoq yoki yomgʻir bogʻi;
3. daraxt toji (saqlanadigan + yangi);
4. buta;
5. oʻtloq;
6. maysa;
7. boshqa yashil.

Qattiq qoplama, sport va bolalar maydonlari muhit hisoblanmaydi.

**Koʻrsatkichlar:**
- Shennon H′ va tekislik J (T).
- Sokin hudud: yoʻl va maydondan ≥ 30 m (T). Xorijiy orientir — ≤ 100 m (Dertien va b., 2021, A).
- Keksa daraxtlar: dbh ≥ 40 sm.
- Uya qutilari: oraliq 30 m, yoʻldan ≥ 10 m.
- Koʻrshapalak qutilari: suvga ≤ 50 m.
- Ozuqa kalendari: gullash va meva oylari boʻyicha (P).
- Yumshoq qirgʻoq ulushi.

**7 fauna guruhi** — muhit va loyiha chorasi bilan. Turlar soni bashorat qilinmaydi.

**Mahalliy manbalar:**
- Ganiev va b. (2024): Toshkent viloyatida bahorda 205 qush turi.
- Bykova va b. (2022): Toshkentda 32 sut emizuvchi turi.
- Toshkent ornitologi bilan suhbat (podrobno.uz).

### 2.4 Muhandislik tarmoqlari (`nets.ts`)

**Isteʼmolchilar** qoidalar bilan joylanadi:
- hojatxonalar — har 500 bir vaqtdagi tashrifchiga 1 ta, darvoza yonida, oraliq ≥ 150 m;
- kafe terrasasi;
- sahna;
- ichimlik favvoralari — bolalar va sport maydonlarida;
- kameralar — bosh darvozalarda;
- sugʻorish klapanlari — maysada 40 m qadam bilan.

**Trassa.** TU nuqtasidan isteʼmolchilarga 3 m toʻrda eng arzon yoʻl (Dijkstra) qidiriladi. Katak narxi:

| Katak | Narx |
|---|---|
| Yoʻl boʻyi | 1 |
| Yashil yuza | 3 |
| Ildiz zonasi (RPA) | 12 |
| Bino yaqinida (8-jadval masofasidan kam) | +20 |
| Suv | oʻtib boʻlmaydi (koʻprikdan tashqari) |

TU kiritilmagan boʻlsa — eng yaqin katta koʻcha tomonidagi chegara nuqtasi olinadi (P).

**Tekshiruv:**
- daraxt oʻqigacha masofa (35-jadval, N): suv, kabel 2,0 m; kanalizatsiya 1,5 m; ustun 4,0 m;
- bino poydevorigacha masofa (8-jadval, N): suv 5 m, kanalizatsiya 3 m, kabel 0,6 m.

**Yoritish:**
- Norma (SNiP 23-05-95, A): shahar bogʻi — kirish 6/2, xiyobon 4/2 lk; tuman bogʻi — 4/1, 2/1 lk.
- Ustun oraligʻi: s = min(Φ·η·MF / (E·w), 5h) (P).
- Soʻqmoqlar yoritilmaydi — qorongʻi ekologik yoʻlak (T).

**Yuklamalar (P):**
- elektr — yoritish, nasos, kafe;
- ichimlik suvi — 3 l/tashrifchi;
- yomgʻir — V = 0,9 · 20 mm · A_qattiq, yomgʻir bogʻlari sigʻimi bilan solishtiriladi.

**UI.** «Tarmoqlar» modulida TU nuqtasi qoʻyiladi: tarmoq turi, quvvat, «Nuqta qoʻyish» → xaritani bosish. Ulanish «P» dan «TU» ga oʻtadi.

### 2.5 Narx kitobi va smeta (`cost.ts`)

**Usul:** hajm × birlik narxi.
- Hajmlar loyihadan avtomatik olinadi: yoʻl = uzunlik × en; koʻchatlar — vedomostdan; tarmoqlar — trassadan; jihozlar — modullardan.
- Narx kitobida 32 band; har bandda narx, manba, sana va teg.
- Narxi yoʻq band smetada «—» boʻlib qoladi. Jami «toʻliq emas» deb qizil belgilanadi — raqam oʻylab topilmaydi.

**Boshlangʻich bozor kuzatuvi (P, 2026):**

| Band | Narx | Manba |
|---|---|---|
| Rulonli maysa | 40–45 ming soʻm/m² | prom.uz |
| Urugʻ ekish | 40 ming soʻm/m² | prom.uz |
| Bruschatka | 22–98,5 ming soʻm | olx.uz eʼlonlari (birligi tekshirilsin) |
| Koʻchat | eʼlon narxi topilmadi | pitomnikdan soʻralsin |

**UI.** «Narx» modulida har bandga narx va manba kiritiladi. Jami darhol qayta hisoblanadi, albom yangilanadi.

Rasmiy smeta (resurs usuli) — ishchi loyiha bosqichida.

## 3. Albom (20 varaq)

1. Titul (illyustrativ render: soyali tojlar, gradientli suv)
2. Umumiy maʼlumotlar
3. Atrof tahlili
4. Joy tahlili
5. Imkoniyat va cheklovlar
6. Tashrif modeli va dastur
7. Uch variant
8. Zonalar va oqimlar
9. Bosh reja
10. Daraxtlarni saqlash
11. Ekish rejasi va vedomost
12. Assortiment va fasllar
13. Kesimlar A–A, B–B
14. Qirgʻoq tipologiyalari
15. Yashash muhitlari va fauna
16. Suv va sugʻorish
17. Muhandislik tarmoqlari
18. TIK va hudud balansi
19. Yiriklashtirilgan smeta
20. Normalar reyestri

Bobur fixture natijalari (C varianti):

| Koʻrsatkich | Qiymat |
|---|---|
| Maydon | 8,95 ga |
| Bir vaqtdagi tashrifchilar (N₁) | 895 |
| Toj qoplami | 18,9 → 30 % |
| Muhitlar H′ / J | 1,60 / 0,89 |
| Sokin hudud | 2 799 m² |
| Uya qutilari | 24 + 6 |
| Yumshoq qirgʻoq | 72 % |
| Elektr | 27,2 kVt |
| Yomgʻir bogʻlari qamrovi | 94 % |

## 4. Maʼlum cheklovlar

- UI haqiqiy brauzerda hali sinovdan oʻtmagan; worker yoʻli testlar bilan tekshirilgan.
- Topo-syomka (DXF) importi va mavjud tarmoqlar syomkasini kiritish — keyingi qadam. `BgData.nets` maydoni tayyor, albomda kulrang chiziq bilan chiziladi.
- R22 mavjud tarkib (Juniperus virginiana ~18 %) sababli bajarilmaydi — albomda ochiq aytilgan.
- Park masterplan referenslari (94 ta) hali tahlil qilinmagan.
