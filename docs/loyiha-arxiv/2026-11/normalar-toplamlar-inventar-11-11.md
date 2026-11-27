# Meʼyorlar toʻplamlari — koddagi ShNQ qoidalari inventari (11.11.2026)

Asos: `main` e6e12c5 (#503), `mr/src`. Maqsad: Lab xorijda ham ishlashi uchun qoidalarni turlarga ajratish; tekshiruv kodi bitta qoladi, qiymat va daraja toʻplamdan oʻqiladi. Tasnif egasi tasdiqlagan (11.11).

## Bosqichlar holati
- **1-bosqich — PR #506** (branch `normalar-toplami-1`, CI yashil, egasining birlashtirish tasdigʻini kutmoqda): `norms/sets.ts` (RULE_KIND, levelOf, ADG 3F-1), generator (qarshidagi bino, hovli, qatorlar — xorijda ADG 12/18/24 m; parkovka talabi xorijda yoʻq), `genfix.avoidObstacles` (mavjud binolar atrofida xorijda ADG: ikkala binoning ulushlari yigʻindisi 6/9/12 m), chekinish (xorijda koʻcha — qoʻlda, qoʻshni — ADG yarmi), reyestr (B xorijda «baholanmadi», «Tuzat»siz), 10 tilda matn. Oʻzbekiston: 1440 generator holati (675 tasi mavjud binolar bilan) main bilan baytma-bayt bir xil.
- ADG manbasi: NSW Apartment Design Guide (2015), Part 3 «Siting the development», 3F-1 design criteria 1 va izohi (bir uchastkadagi binolar orasi — talablar yigʻindisi) — asl PDF (planning.nsw.gov.au) bilan solishtirildi, mos.
- **2-bosqich — interfeys maketi:** Design kanvas «Me'yorlar to'plami — interfeys maketi» (https://claude.ai/artifact/Q879hsH9TGvZypYPWuvnw8): 1) 1-qadamda «5 · Meʼyorlar toʻplami» (Xalqaro andoza / Uchastka shartlari / Oʻzbekiston · ShNQ / Mahalliy toʻplam — ulanmagan; majburiy·tavsiya·oʻchiq soni); 2) «Uchastka shartlari» formasi (UMN, zichlik, balandlik, chekinishlar, binolar orasi, parkovka min/max, yashil ulush, manba); 3) Meʼyorlar roʻyxati — daraja belgisi (Shart / Tavsiya / Oʻchiq), «Oʻchiq» filtri, B qoidani «tahlil sifatida yoqish»; 4) Oʻzbekistonda «Konsepsiya rejimi (erkin)» va varaq shtampida «ShNQ tekshiruvidan oʻtmagan — konsepsiya». Egasining koʻrib chiqishini kutmoqda.
- Qolgan: interfeys kodi (maket tasdiqlangach), «Mening zonam» cheklov turi, cheklovlar buferi toʻplamdan.

## Hozirgi holat (1-bosqichgacha)
- `core/place.ts`: `norms: country === 'UZ' ? 'UZ' : 'intl'` — mamlakat aniqlanadi.
- `norms/rules.ts` → `abroadRules()`: xorijda faqat **hisobot** yumshatilardi (fail → review + «Andoza: Oʻzbekiston meʼyori — bu hududda majburiy emas»). `joyshunos/street.ts`, `joyshunos/blocks.ts` — faqat manba yozuvi almashadi.
- **Asosiy muammo:** generator, joylashtirish va cheklovlar xorijda ham ShNQ qiymatlari bilan qurardi. ShNQ qiymatlari yozilgan fayllar: `core/generator.ts` (79-band 2-jadval masofalari, 2·Hmax, kʏ, SanQvaN 0102-25 boʻyicha qatorlar yoʻnalishi, seysmik boʻlma, 29/30-jadval parkovka, arka), `core/spacing.ts`, `core/limits.ts` (SMZ, qabriston, ELU, suv, temir yoʻl), `core/landscape.ts` (maydonchalar), `core/parking.ts`, `core/mlpark.ts`, `core/seysmik.ts`, `core/axes.ts`, `core/aptplan.ts`, `core/sectionplan.ts`, `core/lowrise.ts`, `core/derive.ts`, `kochasoz/boards/b.ts`, `scene/streets3d.ts`.

## Qoidalar turlari (53 ta qoida, `norms/rules.ts`)
**A — Fizik va xavfsizlik** (hamma joyda bor, qiymat farq qiladi) → xorijda *tavsiya*, xalqaro andoza qiymati bilan. 13 ta:
street-profiles, park-413, park-411, park-20507, park-414, street-overlap, seismic-blocks, seismic-height, fire-56, arch-159, dead-end-57, fire-666, fire-podium.

**B — Mintaqaviy siyosat** (UZ/MDH merosi) → xorijda *sukut boʻyicha oʻchiq*, «tahlil» sifatida yoqish mumkin. 22 ta:
pop-61, school, mtm, school-plot, mtm-plot, park-30, ug-park-415, velo-88, tp-257, red-line-39, west-facing, renov-green-7, green-86, green-474, trees-474, green-36, spacing-79, hovli-79-3, waste-346, play-89, play-91, low-green-96.

**C — Loyiha konverti** (zonalash) → xorijda *foydalanuvchining uchastka shartlaridan*. 6 ta:
density-84, umn-66, housing-82, parking (koeffitsiyent), redline-79, qoshni-79.
Qoʻshiladigan konvert parametrlari: FAR, qurilish zichligi %, maks. balandlik / qavat, chekinishlar (koʻcha / yon / orqa), binolar orasi minimum, parkovka koeffitsiyenti (min va max), yashil ulush.

**D — Cheklovlar** (zona va bufer). 12 ta:
szz-217, qab-szz, qab-100, elu-1050, elu-251, water-981, szz-manual, szz-219, szz-belt, prod-146, prod-147, logi-174.

## Cheklovlar xorijda (taklif)
1. **Obyekt va bufer ajratiladi.** Obyektning oʻzi (qabriston, suv, temir yoʻl, ELU koridori) hamma joyda *qattiq* — uning ustiga qurilmaydi. Bufer kengligi — toʻplamdan.
2. **Xorijda bufer:** toʻplamda qiymat boʻlsa — NORMA; boʻlmasa — foydalanuvchi kiritadi, yonida «MDH andozasi: N m» maʼlumot uchun koʻrsatiladi; sukut boʻyicha *yumshoq* (ogohlantirish), foydalanuvchi «qattiq» qilishi mumkin. Raqam toʻqib chiqarilmaydi.
3. **Yangi tur — «Mening zonam»:** foydalanuvchi poligon chizadi yoki GeoJSON/KML yuklaydi va unga qoida beradi: taqiq / balandlik chegarasi / ruxsat etilgan funksiyalar / chekinish. Xorijdagi oddiy cheklovlarni (suv bosish zonasi, meros hududi, aeroport balandlik chegarasi, servitut) shu qoplaydi.
4. **Ochiq maʼlumot adapterlari** (`global-ochiq-malumot.md`, 5–6-bosqich): NYC, NL va boshqalarning zonalash va cheklov qatlamlari keyin. Har manbaning litsenziyasi alohida tekshiriladi (ayrim global qatlamlar tijoriy foydalanishni cheklaydi).

## Mexanizm (keyingi bosqichlar uchun)
- Toʻplam qavatlari: dunyo → oila → mamlakat → shahar → **loyiha** (foydalanuvchi qoidani oʻzgartiradi yoki oʻchiradi; albomda koʻrsatiladi).
- Generator va cheklovlar qiymatni toʻplamdan oʻqiydi, qattiq yozilgan raqamlar bosqichma-bosqich olib tashlanadi.
- Oʻzbekistonda ham «Konsepsiya (erkin)» rejimi; Chizmadon varagʻiga avtomatik «ShNQ tekshiruvidan oʻtmagan — konsepsiya».
