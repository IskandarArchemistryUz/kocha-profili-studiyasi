# Mavjud daraxtlar — huquqiy rejim va Master reja tahlili (Toshkent) · 23.11.2026

**Talab (Iskandar, 23.11):** Bogʻshunosdagi daraxt reyestri Master reja hudud tahliliga ham chiqsin: nechta daraxt kesiladi, qaysi biri saqlanadi yoki koʻchiriladi. Kompensatsiya va moratoriy faqat normadan olinadi, oʻylab topilmaydi. Hozircha faqat Toshkent; xorij keyin.

**Kod:** `mr/src/core/treelaw.ts` (huquqiy qaror), `mr/src/core/trees.ts` (`loadRegistry`), «Daraxtlar xaritasi» varagʻi — `mr/src/core/sheet.ts` (`treeSum`, `treeRows`), tugma — `mr/src/ui/sheets.ts`. Test: `mr/tests/unit/daraxt_huquq.test.ts`.

Barcha matnlar lex.uz dan 23.11.2026 da toʻliq oʻqildi.

## 1. Manbalar va bandlar

| Hujjat | Nima beradi |
|---|---|
| **PF-5863**, 30.10.2019 | Davlat oʻrmon fondiga kirmaydigan qimmatbaho navlarni kesishga moratoriy joriy etdi |
| **PF-46**, 30.12.2021, 2-band | Moratoriy **muddatsiz** uzaytirildi; jarimalar 5 baravar, zarar undirish 2 baravar oshirildi |
| **VMQ-464**, 22.08.2022, 1-ilova (Nizom) | 3-band — tushunchalar. «Shikastlantirish» = ildiz boʻgʻzidan koʻpi bilan 20 sm masofagacha beton yoki asfalt qoplama. 4-band — shahar daraxtlari oʻrmon fondiga kirmaydi. **5-band** — moratoriy davrida qimmatbaho navlarni kesishga yoʻl qoʻyilmaydi. 23-band — 100 yoshdan oshgan daraxtlar tabiat yodgorligi sifatida alohida reyestrga olinadi. **31-band** — qurilish va rekonstruksiyada kesishga yoʻl qoʻyiladi, bundan 5-banddagi qimmatbaho navlar mustasno; kesish va koʻchirish toʻlov asosida. **32 «a»** — Ekologiya boʻlinmasi joyiga chiqadi, jamoatchilik eshituvi oʻtkazadi, avval saqlab qolish va koʻchirish imkonini koʻradi. **32 «b»** — har bir kesilgan daraxt uchun 10 tup yirik koʻchat (daraxt 5 yillik, buta 3 yillik), kamida 2 yil parvarish; toʻlov bu majburiyatdan ozod qilmaydi. **33** — koʻchirish dalolatnomasi, 3 kun oldin xabar. **37** — ish mavsumi |
| **VMQ-93**, 18.02.2020, ilova (**VMQ-342 tahririda**) | Qimmatbaho navlar roʻyxati, 130 band: I — yogʻochbop (1–32), II — manzarali (33–96), **III — Qizil kitob (97–102: Sharq chinori, Oʻrta Osiyo noki, Kavkaz xurmosi, chilonjiyda, Griffit argʻuvoni, totum)**, IV — butalar (103–130) |
| **VMQ-86**, 22.02.2022, Yagona nizom 15-ilova (**VMQ-342 tahririda**) | 6-band — arizani koʻrish yigʻimi 0,3 BHM. **7-band — toʻlov jadvali** (diametr boʻyicha BHM koeffitsiyenti, kam qimmatli / qimmatbaho ustunlari; **Qizil kitob turlari jadvaldan chiqarilgan**). 9 «b» — kompensatsiya 10 tup. 11 — ruxsatnoma yil oxirigacha amal qiladi. 12-izoh — kesish va koʻchirish taʼriflari; koʻchirish ≤ 15 sm. V — avval koʻchirish koʻriladi, imkoni boʻlmasa kesishga ruxsat beriladi |
| **VMQ-342**, 30.06.2026 (01.07.2026 dan kuchda), 2-band | Koʻchirish: daraxt ≤ 15 sm (1,3 m balandlikda), buta ≤ 10 sm (ildiz boʻgʻzida). Mavsum: vegetatsiya tugagandan 1-aprelgacha. Ildiz tuprogʻi bilan koʻchiriladi, 3 yil parvarish qilinadi. Davlat dasturi, transport, yirik investitsiya va davlat ahamiyatidagi loyihalarda kattaroq daraxtni koʻchirish **faqat Prezident hujjati bilan** |
| **ShNQ 2.07.01-23**, 485-band, **35-jadval** | Daraxt poyasigacha masofa: bino devori 5,0 m; tramvay 5,0; trotuar cheti 0,7; qatnov qismi yoki ariq 2,0; yoritish ustuni 4,0; tirgak devor 3,0; gaz va kanalizatsiya 1,5; issiqlik, suv va drenaj 2,0; kabel 2,0. **1-izoh:** bu qiymatlar toji ≤ 5 m daraxtlar uchun, kattalari uchun «oshirilishi kerak» |
| BHM | 01.09.2026 dan **440 000 soʻm** (buxgalter.uz, gov.uz). Sozlamada tahrirlanadi |

## 2. Qaror mantigʻi (har bir toʻqnashgan daraxt)

«Toʻqnashuv» deganda ikki holat tushuniladi: daraxt bino, yoʻl yoki qoplama dogʻi ostida qoladi yoki 35-jadval masofasidan yaqin turadi.

| Tur toifasi | d ≤ 15 sm | d > 15 sm |
|---|---|---|
| **Qizil kitob** (III) | **Loyiha oʻzgaradi.** Toʻlov jadvalidan chiqarilgan, oddiy ruxsatnoma yoʻli yoʻq | **Loyiha oʻzgaradi** |
| **Qimmatbaho** (I, II, IV) | Koʻchiriladi: ruxsatnoma, toʻlov (qimmatbaho ustuni), 3 yil parvarish | **Kesish taqiqlangan** (moratoriy) → loyiha oʻzgaradi. Davlat ahamiyatidagi loyihada — faqat Prezident hujjati |
| **Kam qimmatli** | Avval koʻchirish (12-izoh V) | **Kesiladi**: toʻlov (kam qimmatli ustuni) + 10 ta 5 yillik koʻchat, 2 yil parvarish |
| **Ziddiyat** (ikkala roʻyxatda) | Qimmatbaho deb olinadi + REVIEW | Qimmatbaho deb olinadi + REVIEW |
| **Nomaʼlum** (roʻyxatda nomi yoʻq) | REVIEW; toʻlov kam qimmatli ustuni boʻyicha (T) | REVIEW; «kesiladi» (T) |
| Diametr yoʻq | REVIEW — oʻlchash kerak | |

Barcha qarorlar **tavsiya**: yakuniy qarorni Ekologiya boʻlinmasi joyida chiqaradi (32 «a»). Har bir qaror qatorida band raqami koʻrsatiladi.

## 3. Reyestrda tekshirildi (23.11, 20 ta bbox, 74 527 daraxt, 168 tur)

| Toifa | Daraxt | Ulush |
|---|---|---|
| Qizil kitob | 2 191 | 2,9 % (asosan Sharq chinori) |
| Qimmatbaho | 33 124 | 44,4 % |
| Kam qimmatli | 27 492 | 36,9 % |
| Ziddiyat | 369 | 0,5 % |
| Nomaʼlum | 11 351 | 15,2 % |

Nomaʼlum toifadagi eng koʻp turlar: gilos, olcha, oddiy shumtol (*F. excelsior*), behi, manzarali tut, olxoʻri, **amerika zarangi (*Acer negundo*)**, shaftoli, yopishqoq robiniya, kashtan, anjir, olcha-olxoʻri, nok, anor. Bulardan faqat «oʻrik» va «olma» kam qimmatli roʻyxatda bor; qolgan mevali turlar roʻyxat oxiridagi «va boshqalar» ichiga kiradimi — matndan aniqlab boʻlmaydi.

**Xulosa:** tasodifiy Toshkent uchastkasida toʻqnashgan daraxtlarning qariyb yarmini qonun kesishga yoʻl qoʻymaydi. Bu raqam masterplanni ilk eskizdanoq oʻzgartiradi.

## 4. Huquqiy ziddiyatlar (hujjatning oʻzida)

1. **Sovun daraxti** (*Koelreuteria paniculata*) — VMQ-93 ning 46-bandida qimmatbaho, 15-ilovada esa kam qimmatli.
2. **Qogʻoz daraxti** (*Broussonetia papyrifera*) — 48-bandda qimmatbaho, 15-ilovada kam qimmatli.
3. **Ipak akatsiya** (*Albizia julibrissin*) — 43-bandda «Lenkaran akatsiyasi» nomi bilan qimmatbaho, 15-ilovada kam qimmatli.
4. 55-band: nomi «Kedr, Gimalay kedri», lotincha nomi esa *Thuja plicata* — 95-band bilan takrorlanadi.
5. 100-band: Qizil kitobdagi yovvoyi chilonjiyda (*Ziziphus jujuba*). Shahardagi madaniy unabi ham shu lotincha nom ostiga tushadi. Modul uni Qizil kitob deb oladi va loyihani oʻzgartirishni talab qiladi.

Ziddiyatli 1–3 turlar qimmatbaho deb olinadi va REVIEW belgisini oladi. Bularni Ekologiya qoʻmitasidan yozma soʻrab aniqlash mumkin.

## 5. Avvalgi hujjatlardagi xato (23.11 da tuzatildi)

- Bogʻshunos (`planting.ts`, `albom.ts`, `main.ts`): «koʻchiriladi < 40 sm» va «yoʻl suriladi ≥ 40 sm (480-band)» chegarasi normada yoʻq edi. **ShNQ 480-band** bogʻ va xiyobonlarni joylashtirishda mavjud dov-daraxtlar va suv havzalarini saqlashni talab qiladi — Bogʻshunos uchun oʻrinli, lekin unda diametr chegarasi yoʻq. Endi qaror `core/treelaw` dan: qimmatbaho tur — moratoriy, ≤ 15 sm — koʻchirish (VMQ-342), kam qimmatli — ruxsatnoma va kompensatsiya.
- Ailanthus: «invaziv» — ekologik baho (T), huquqan **kam qimmatli** (15-ilova). Bogʻshunos uni ziddiyatsiz ham olib tashlashni taklif qiladi — toʻlov va 10 koʻchat bilan hisoblanadi.
- «Ziddiyat (≥ 40 sm)» koʻrsatkichi endi «kesish taqiqlangan» daraxtlar soni (`mustKeep`).
- `daraxt-reyestri-wfs-14-11.md` (loyiha hujjati), 2-band: «R14, ShNQ 2.07.01-23, 480-band» yoniga VMQ-464 5, 31, 32-bandlar; VMQ-86 15-ilova; ShNQ 35-jadval qoʻshilishi kerak.

## 6. Master rejada (bajarildi, 23.11)

1. «Daraxtlar xaritasi» varagʻi → «Toshkent reyestridan» tugmasi (uchastka Toshkent reyestri qamrovida boʻlsa). Uchastka ichidagi daraxtlar `/data/trees` orqali inventarga yoziladi (`src: 'reyestr'`, tur, diametr, toj, balandlik); fayldan yuklanganlari saqlanadi.
2. Bino yoki qatnov qismi ostidagi, turi maʼlum daraxt — `decide()`; toji > 5 m boʻlsa binogacha masofa oshiriladi (T).
3. Balans jadvalida: loyiha oʻzgaradi (qimmatbaho, moratoriy) / koʻchiriladi (≤ 15 sm) / kesiladi (kam qimmatli) / nomaʼlum, ruxsatnoma toʻlovi (soʻm, BHM), kompensatsiya koʻchatlari. Xaritada: binafsha halqa — saqlanadi, loyiha oʻzgaradi; jigarrang — koʻchiriladi; qizil × — kesiladi.

### Navbatda
- Variantlar panelida daraxtlar balansini koʻrsatish (sahnada, varaqdan tashqari).
