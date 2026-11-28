# Bogʻshunos — yoʻl tarmogʻi: yaxlit tizim (usul + test)

14.11.2026. Kanvas: «Bogʻshunos I» taxtasi (Interfeyslar sahifasi, H yonida). Kod: `claude/bogshunos-src/yol-tarmogi-net.py` (+ `net_eval`, `board_i` lokal).

## 0. Muammo
Oldingi testda (H) yoʻllar «shakl»dan chizildi: perimetr halqa + bezak S-diagonal. Tarmoq sifatida tekshirilganda (§4) — favvora orol boʻlib qolgan, oqimning 65 % i qattiq yoʻl bilan ulanmagan, 69 % i maysani kesadi. Yechim: **avval oqim → tarmoq, keyin hujayralarga dastur.**

## 1. Jahon usullari — nima olindi
| Manba | Asosiy gʻoya | Bogʻshunosdagi qoida |
|---|---|---|
| Alexander, *A Pattern Language* (1977): 120 Paths and Goals, 121 Path Shape, 124 Activity Pockets, 126 Something Roughly in the Middle | yoʻl odam yurishiga mos boʻlsa «toʻgʻri» tuyuladi; maqsadlar orasidagi chiziq; tugun chetida faollik choʻntaklari; markazda nimadir | R1, R5; favvora = markaziy maqsad |
| Lynch, *The Image of the City* (1960) | paths, edges, districts, nodes, landmarks — oʻqiluvchanlik | tugunlar shaklan aniq (halqa), darvozalar koʻrinadigan |
| Olmsted / Central Park | «separation of ways» — harakat turlarini ajratish | oʻyin, sport, tranzit alohida; oʻyin yoʻl bilan kesilmaydi (R6) |
| Auckland Design Manual (tracks and paths) | atrofdagi koʻcha/transportga ulash; relyefga mos, nishab chizigʻi boʻylab emas; yoʻllar sonini ratsionallash | darvozalarni klasterlash (§2.3), R7 |
| Desire lines: UNSW (M. Harris), Dorato & Lobosco «Designing Desire» (Grasshopper) | soʻqmoqlar — rejalashtirish xatosi belgisi; yoʻlni ular boʻyicha qurish; parametrik bundling | xohish chiziqlari + bundling (§2.2–2.4) |
| Space syntax: Zhai & Baran 2016 (Pekin, 75 segment); IIETA 2026 skoping sharhi | yoʻl segmentining global integratsiyasi va «control» qiymati keksalar yurishi bilan musbat bogʻliq; yaxshi ulangan tarmoq, halqa yoʻllar, taqsimlangan kirishlar — koʻproq faollik | integratsiya — keyingi bosqich metrikasi (P) |
| Walking loops (PMC5289910, AQSh milliy tadqiqot) | halqa yoʻllar uzoq, toʻxtovsiz yurishni qoʻllaydi | halqa — agar perimetr trotuari yoʻq boʻlsa (R4) |
| Gehl, *Life Between Buildings* | 400–500 m qabul qilinadigan masofa; marshrut ochiq joy chetida — har xil taassurot | chet zonalarda oʻrindiq choʻntaklari |
| Dill 2004 (Portland State), Ewing 1996 | link–node ≥ 1,4 — rejalashtirish maqsadi (A); CNR maks. 1,0; γ, α indekslari; marshrut toʻgʻriligi | §3 metrikalar |

## 2. Algoritm (8 qadam)
1. **Manba–maqsad (OD):** tashqi nuqtalar (metro kirishi, bekat, piyoda oʻtish, bino eshigi, parking) — OSM; ichki maqsadlar (favvora, oʻyin, supa). Vazn wᵢ — P (keyin sanoq/mobil maʼlumot bilan).
2. **Xohish chiziqlari:** har juftlik toʻgʻri chiziq; f = wₐ·w_b / d (gravitatsiya, P). Tranzit — chiziq uchastkani kesib oʻtsa; manzil — har nuqta → ichki maqsad.
3. **Darvozalarni ratsionallash:** chegarada ≤ 14 m oraliqdagi kirishlar bitta; oqimi < 6 % boʻlgan darvoza qoʻshnisiga qoʻshiladi (P).
4. **Bundling:** 1,5 m setka, 16 qoʻshni; oqim kamayish tartibida Dijkstra; ishlatilgan qirra narxi −50 % → chiziqlar birlashadi. Mavjud yoʻl (favvora halqasi) oldindan «ishlatilgan».
5. **Ierarxiya oqimdan:** ≥ 45 % maks. → asosiy 3,0 m (P); ≥ 15 % → ikkinchi 2,4 m; qolgan → 2,0 m (ShNQ 2.07.02-24 min). Silliqlash: Douglas–Peucker 2 m + Chaikin ×2.
6. **Tugun = joy:** kirish choʻntagi r 3 m, radial oʻrtasida faollik choʻntagi (P), markaziy halqa.
7. **Hujayra → dastur:** yoʻllar orasidagi eng katta hujayraga oʻyin (yoʻldan ≥ 2,5 m, P); daraxt — qolgan koʻkalamzorga.
8. **Tekshiruv:** §3.

## 3. Metrikalar va chegaralar
| Metrika | Hisob | Chegara | Holat |
|---|---|---|---|
| PRD (toʻliq safar) | (A→kirish + ichki tarmoq + chiqish→B) / toʻgʻri A–B, oqim vaznli | ≤ 1,3 | P |
| Oqim ulushi PRD ≤ 1,3 | Σf (PRD ≤ 1,3) / Σf | ≥ 90 % | P |
| Uzilgan oqim | maqsadga qattiq yoʻl yoʻq | 0 % | qoida R3 |
| Qattiq yoʻl qismlari | poligon komponentlari | 1 | qoida |
| Link–node | qirralar / tugunlar (tashqi trotuar bilan) | ≥ 1,4 | A — Ewing 1996 (Dill 2004) |
| CNR | chorrahalar / (chorraha + boshi berk) | maks. 1,0, yuqori yaxshi | A — Dill 2004 |
| γ, α | e/3(v−2); (e−v+1)/(2v−5) | yuqori = koʻp halqa | nazariy |
| Ichki boshi berk | daraja-1 tugun (darvozalarsiz) | 0 | R2 |

## 4. Test natijasi — Tashkent City, 0,44 ga
Tashqi nuqtalar (OSM Overpass, 14.11.2026): Oʻzbekiston metrosi kirishlari (104,−63), (149,−79); Uqchi/Olmazor oʻtishlari (144…160, 115); Yangi Toshkent oʻtishlari (−99,−24), (−87,102); Davlat konservatoriyasi bekati (169,203). Perimetrda shimol, sharq, janubda footway bor.

| | Qatʼiy | Muvozanat | Erkin | **Tizimli** |
|---|---|---|---|---|
| Koʻkalamzor | 48 % | 70 % | 70 % | **75 %** |
| Oʻrtacha PRD (vaznli) | 1,79 | 1,19* | 1,18* | **1,13** |
| Oqim PRD ≤ 1,3 | 31 % | 31 % | 31 % | **94 %** |
| Uzilgan oqim | 0 % | 65 % | 65 % | **0 %** |
| Qattiq yoʻl qismlari | 3 | 3 | 3 | **1** |
| Link–node / CNR | — | — | — | **1,50 / 1,00** |
| γ / α | — | — | — | **0,62 / 0,40** |
| Ichki boshi berk | — | — | — | **0** |
| Darvozalar | 4 | 4 | 4 | 5 |

\* faqat ulangan juftliklar. Tizimli: oʻq uzunligi 201 m, oʻyin 103 m², eng yomon juftlik — gʻarbiy bino → favvora, PRD 1,39.

Tekshiruv: model mavjud OSM ichki yoʻllarini (janub, gʻarb, sharq radiallari) ~6–9 m aniqlikda takrorladi va 2 ta diagonal (shimoli-sharq — Paxtakor/Hotel, shimoli-gʻarb — parking/oʻtish) qoʻshdi.

Xulosa: halqa + kirish topologiyasi hamma variantda oʻxshash; farqni **toʻgʻrilik (PRD) va uzilish** beradi — generator ularni majburiy tekshiradi.

## 5. Generator qoidalari (PR-7 ga qoʻshiladi)
- R1 Yoʻl faqat OD oqimidan; bezak egri chiziq — keyin, PRD ni buzmasa.
- R2 Har darvoza ulangan; ichki boshi berk = 0 (ataylab tinch burchakdan tashqari).
- R3 Har maqsad (favvora, oʻyin, supa) qattiq qoplama bilan ulangan.
- R4 Perimetrda trotuar ≤ 5 m boʻlsa, ichki halqa takrorlanmaydi.
- R5 Tugunlarda choʻntak — oʻrindiq, soya yoʻl yonida.
- R6 Oʻyin yoʻl bilan kesilmaydi; hujayra ichida, yoʻldan ≥ 2 m (P).
- R7 Nishab ≤ 5 %, koʻndalang 2 % (ShNQ 2.07.02-24) — relyef bilan keyingi bosqich.

Referens rejimida: grammatikadagi yoʻl shakli (halqa, S) **R1–R3 dan keyin** qoʻllanadi — ya'ni referens uslubni beradi, tarmoqni emas.

## 5a. Iskandar qarorlari (14.11, 11:31)
- OD vaznlari — oqim bilan bogʻliq, sanoq/mobil maʼlumot bilan tekshiriladi (P qoladi).
- PRD ≤ 1,3 va ≥ 90 % — «balkim»: P qoladi, sinovlarda kuzatiladi.
- Asosiy yoʻl eni 3,0 m — **tasdiqlandi**.

## 5b. Test 2 — sohil referensi (IMG_1571) → Bozsuv boʻyi parki (14.11, kanvas J)
Joy: OSM park (4,7 ga) + qirgʻoq polosasi = 5,5 ga; Koʻrgazma koʻchasi va Usta Shirin mahallasi bilan Bozsuv orasida, UzExpo qarshisi. Daraxtzor (OSM natural=wood) 3,2 ga — 59 %. Relyef SRTM 30 m (OpenTopoData): suvdan 100 m ichkariga ~+5 m, qirgʻoq polosasi deyarli tekis (P). Suv eni 16 m — P (OSM'da poligon yoʻq).

Referens grammatikasi: suvga parallel polosalar — parapet/promenada, qizil velo (2 tomonlama), daraxt polosasi, yurish yoʻli, yogʻoch terrasa (qiyalikda), oʻtli qiyalik.

| | Qatʼiy (polosalar butun sohil boʻylab) | **Tizimli** |
|---|---|---|
| Koʻkalamzor | 73 % | **85 %** |
| Qattiq qoplama | 14,9 ming m² | **8,4 ming m²** |
| Daraxtzor saqlanadi | 73 % (8,7 ming m² kesiladi) | **91 %** (3,0 ming m²) |
| PRD (vaznli) | 1,01 | 1,07 |
| Oqim PRD ≤ 1,3 | 88 % | 81 % |
| Nishab ≤ 5 % (yoʻl oʻqi, SRTM) | 79 % | 78 % |
| Velo ↔ promenada < 0,5 m | 319 m² (buzilish) | **0** |
| Velo eni | 3,0 m | 2,5 m |
| Velo × piyoda kesishmasi | 13 | **8** |
| Terrasa | 6 141 m² | 195 m² (2 past supa) |

Me'yorlar (ShNQ 2.07.01-23): 403-b. — dam olish zonalarida velo yoʻlaklari piyoda yoʻllaridan ajratiladi; velo chetidan trotuargacha ≥ 0,5 m, daraxtgacha ≥ 0,75 m. 404-b. — velo eni bir tomonlama ≥ 1,2 m, ikki tomonlama ≥ 1,5 m. 346-b. — trotuar boʻylama nishabi ≤ 60 ‰.

Sinov (daraxtzor narxi ×1…×8): kesish deyarli oʻzgarmaydi (~3 ming m², asosan promenada va velodan), toʻgʻrilik ×1 da eng yuqori (81 %) → ×1 tanlandi; ichki yoʻllarni daraxtlar orasidan oʻtkazish — dendroplan bilan (P).

Topilmalar: referens bu joyga toʻliq sigʻmaydi — Qatʼiy daraxtzorning 27 % ini kesadi; Qatʼiy toʻgʻriroq, lekin 2× koʻp qoplama hisobiga. Qirgʻoq polosasida Δz ≈ 0 (SRTM) → amfiteatr oʻrniga 2–3 pogʻonali past supa.

Yangi qoidalar:
- R8 Mavjud daraxtzor — narx omili; kesish m² va shartli daraxt soni bilan koʻrsatiladi.
- R9 Velo piyodadan ajratiladi (403-b.); kesishma — belgilangan oʻtish.
- R10 Referens elementi joy shartiga bogʻlanadi: terrasa ← Δz (relyef), keng promenada ← daraxtsiz polosa eni.

Ochiq (P): suv eni; suv muhofaza zonasi (amaldagi nizom yoʻq); dendroplan; geodeziya (SRTM yetarli emas); qisqa safarlarda PRD nisbati oshadi (+10 m — shimoli-sharq darvozasi).

Kod (lokal, `gen/j/`): `bsite.py` (joy), `bank_net.py` (tarmoq: nishab va daraxtzor narxi), `variants.py` (Qatʼiy/Tizimli + metrikalar), `sweep.py`, `board_j.py`.

## 5c. Test 3 — koʻcha boʻyi sohil referensi (IMG_1572) → Qoraqamish kanali (14.11, kanvas K)
Joy tanlash: OSM'da Toshkentdagi kanallar boʻylab 8–40 m da parallel koʻcha boʻlgan, oraligʻida bino yoʻq uchastkalar avtomatik qidirildi. Eng uzuni — Qoraqamish kanali + Yuqori Qoraqamish koʻchasi (840 m, oʻrtacha 26 m). Test segmenti: Uch Qahramon chorrahasidan Rixsiliy chorrahasigacha, 912 m. Bir tomonda mahalla, boshqa tomonda Qoraqamish massivi (4–9 qavat). Kanal ustida 3 ta piyoda koʻprik, mavjud trotuar 930 m. Polosa eni 9,9–14,9 m (oʻrtacha 13,0). Kanal eni 10 m va qatnov qismi 15 m — P.

Referens grammatikasi: koʻcha → parkovka → daraxt qatori → keng promenada (~8 m) → suvga tushuvchi pogʻonalar (bir uchastkada) → tabiiy qirgʻoq. Kerakli eni ≈ 18 m.

| | Qatʼiy | **Tizimli** |
|---|---|---|
| Sigʻadi (uzunlik ulushi) | 0 % (taqchil 3–4,9 m) | **100 %** |
| Kanalga chiqish | 1 259 m² (suv kesimining ~50 %) | **0** |
| Koʻkalamzor (polosa) | 30 % | **54 %** |
| Tabiiy qirgʻoq uzunligi | 69 % | **91 %** |
| Tugun oqimi pogʻonadan ≤ 25 m | 34 % | **66 %** |
| Velo yoʻlak | yoʻq | 2,5 m |
| Daraxt — qatnov chetidan | 1,0 m ✗ | 4,0 m ✓ |

Tizimli kesim (yoʻl chetidan suvgacha): 0,75 m xavfsizlik (403-b.) → velo 2,5 m (≥ 1,5 — 404-b.) → daraxt-ajratgich 1,5 m (35-jadval: qatnov chetidan ≥ 2,0 m, trotuardan ≥ 0,7 m) → promenada 3,0 m → qolgani tabiiy qirgʻoq. Oddiy uchastka uchun jami 9,75 m kerak. Tugunlar oqim boʻyicha (P) aniqlandi: NE va SW chorrahalarda (oʻtish + bekat + koʻprik) maydoncha va pogʻona; 72-maktab koʻprigi yonida faqat maydoncha (pogʻonasiz).

Bulvar normasi (ShNQ 2.07.01-23, 482-b.): bir tomondagi bulvar eni ≥ 10 m. Bu yerda minimum 9,9 m — chegarada; kanal va yoʻl eni oʻlchansin. Yuqori Qoraqamish tuman ahamiyatidagi magistral koʻcha boʻlsa, 402-b. boʻyicha ajratilgan velo yoʻlak kerak — maqomi aniqlansin (P).

Yangi qoidalar:
- R11 Kesim byudjeti: avval norma talab qiladigan polosalar joylanadi (velo, xavfsizlik masofasi, daraxt masofasi), qolgan eni — referens elementlariga.
- R12 Suvga tushish (pogʻona) quyidagilarga bogʻlanadi: oqim tezligi, chuqurlik, maktab yaqinligi. Sharoit toʻgʻri kelmasa — kuzatuv maydonchasi qoʻyiladi.

Ochiq (P): kanal va qatnov qismi eni; suv sathi va oqim tezligi (gidravlik hisob); toʻsiq balandligi; koʻchaning maqomi.

Kod (lokal, `gen/k/`): `ksite.py`, `kvariants.py`, `board_k.py`.

## 5d. Test 4 — hovli referensi (IMG_1575) → Qoraqamish massivi hovlisi (14.11, kanvas L)
Referens: DIPTIH (Pinterest), tasvirda «Изменено с помощью ИИ» belgisi bor — sunʼiy intellekt bilan oʻzgartirilgan, qurilgan obyekt emas. Grammatika: ortogonal toʻr, koʻtarilgan gulzorlar (devori — oʻtirish joyi), markaziy oʻq, pogʻonalar, 2 ta yogʻoch supa; gulzor ~55 %. Oʻyin, sport va xoʻjalik maydoni yoʻq.

Joy: 9 qavatli 4 blok orasidagi hovli (ichki yoʻllar halqasi ichida, yoʻl chetidan 3 m), 0,40 ga; ichida mavjud sport maydoni 904 m² (OSM leisure=pitch). Aholi N ≈ 1 551 (P: yalpi maydon × qavat × 0,8 / 60 m² × 3,6 kishi). Kirish eshiklari — P (har blokda 3 ta).

ShNQ 2.07.01-23, 4-jadval (m²/kishi; binogacha masofa): bolalar oʻyini 0,7 (10 m); kattalar dam olishi 0,1 (6 m); jismoniy tarbiya 2,0 (10–40 m); xoʻjalik 0,3 (20 m). 90-b.: ikki baravargacha kamaytirish mumkin. 91-b.: birlashtirish mumkin, ≥ 150 m². 87-b.: maydonchalar va yoʻllar (≤ 30 %) koʻkalamzorga qoʻshiladi. 47-jadval, 1-izoh: kattalar sport maydonchasi maktabniki bilan birlashtiriladi.

| | Qatʼiy | **Tizimli (90°)** | Tizimli (erkin) |
|---|---|---|---|
| Oʻyin (talab ÷2 = 543 m²) | 0 | **560** | 560 |
| Dam olish (÷2 = 78 m²) | 0 | **178** | 178 |
| Sport (÷2 = 1 551 m²) | 0 (mavjud maydon buziladi) | **904** (saqlanadi; qolgani maktab bilan — P) | 904 |
| Gulzor ulushi | 54 % | 33 % | 31 % |
| PRD ≤ 1,3 boʻlgan oqim | 95 % | 89 % | 100 % |

Topilmalar: referens — skver yoki maydon uchun; hovliga aynan qoʻyilsa normadan oʻtmaydi. Tizimli variantda avval normativ dastur joylanadi, keyin oqim yoʻllari, qolgan hujayralarga — referensdagi koʻtarilgan gulzorlar. Hovli tekis, shuning uchun pogʻonalar olib tashlandi (MGN uchun pandus kerak boʻlardi). 90° cheklovi oqimning 11 % iga PRD > 1,3 beradi — bitta diagonal yetarli.

Yangi qoidalar:
- R13 Hovlida avval normativ dastur joylanadi (4-jadval: m²/kishi va binogacha masofa), keyin yoʻl va gulzor.
- R14 Mavjud foydali obyekt (sport maydoni, daraxt) saqlanadi; buzilsa — oʻrnini qoplash koʻrsatiladi.
- R15 Uslub cheklovining (90°, faqat egri va h.k.) narxi PRD bilan oʻlchanadi; PRD ≤ 1,3 boʻlmasa — bitta istisno yoʻl.
- R16 Referens manbasi tekshiriladi: sunʼiy intellekt bilan yaratilgan yoki oʻzgartirilgan tasvir faqat uslub manbai, oʻlcham manbai emas.

Ochiq (P): aholi soni va podyezd eshiklari; mavjud daraxtlar; avtoturargoh talabi (0,8 m²/kishi, 29-jadval); oʻyin maydonchasi uchun insolyatsiya.

Kod (lokal, `gen/l/`): `court.py`, `design.py`, `board_l.py`.

## 6. Ochiq (P)
- OD vaznlari: piyoda sanoq yoki mobil maʼlumot (Koʻchasoz harakat modeli bilan bogʻlash).
- PRD ≤ 1,3 va ≥ 90 % chegaralari — mahalliy normada yoʻq; xorijiy manba topilsa «A» bilan almashtiriladi.
- Asosiy yoʻl 3,0 m — oqim sigʻimi (kishi/soat/m) bilan asoslash.
- Space syntax integratsiya/choice — 2-bosqich (katta park uchun).
- Relyef va nishab — PR keyin.
