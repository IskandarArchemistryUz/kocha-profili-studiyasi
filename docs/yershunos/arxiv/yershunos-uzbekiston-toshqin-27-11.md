# Yershunos · O'zbekiston: daryo toshqini ta'siri (27.11.2026)

## Nima qilindi
- Manba: JRC CEMS-GloFAS global daryo toshqini xaritalari v2.1 (3 yoy soniyasi ≈ 90 m; suv chuqurligi; qaytalanish 10 / 100 / 500 yil). Litsenziya hali tekshirilmagan (JRC ochiq ma'lumotlari odatda cheklovsiz) — pullik xizmatdan oldin README ni o'qish.
- ThinkPad: `toshqin_ol.py` / `toshqin.bat` — uzilishga chidamli (Range bilan davom, 12 soatgacha kutadi). Plitkalar: ID168 N40_E50, ID177 N40_E60, ID183 N40_E70, ID167 N50_E50, ID176 N50_E60, ID182 N50_E70 → `kesh\jrc\uzb_RP{10,100,500}_*.tif` (uint8, dm). Ikkinchi qism: `kesh\dem10\{x}_{y}.png` — butun respublika relyefi z10 (1700 plitka), kichik soylar (HAND) bosqichi uchun.
- `kal/toshqin_birlik.py`: doimiy suv (ESA WorldCover 80-sinf) chiqariladi; toshqin ulushi 1 km Mollweide to'riga o'rtachalanadi; × GHS-POP 2020, × GHS-BUILT-S 1980/2000/2020 → `toshqin_birlik.json` → GeoJSON `tq` xossasi (`t` band — tropik tunlar).
- `tq` kalitlari: `a10`, `a100`, `a500` — zonadagi aholi ulushi, %; `a100_05`, `a100_1` — suv ≥ 0,5 m / ≥ 1 m; `k100`, `k100_05` — kishi (rasmiy 2026 ga keltirilgan); `z100`, `zk100` — zona maydoni (%, km²); `q80`, `q00`, `q20` — zonadagi qurilgan maydon, km²; `qu` — qurilgan maydonning zonadagi ulushi, %; `qy` — 2000-yildan keyingi yangi qurilishning zonadagi ulushi, %.
- Sahifa (PR #792): «Daryo toshqini» guruhi (`#uzs7`: `ta` aholi, `tb` qurilish), tuman kartasi, CSV, hisobot xulosalari, solishtirish jadvali, metodika.

## Natija
- 100 yillik toshqin zonasida aholining 10,7 % i ≈ 4,18 mln kishi; suv ≥ 0,5 m — 2,81 mln. 10 yillikda 7,7 %, 500 yillikda 12,4 %.
- Zonadagi qurilgan maydon: 199 → 344 → 459 km² (1980 → 2000 → 2020); jami qurilgan maydonga nisbatan 12,8 → 12,5 → 12,1 % — ya'ni qurilish toshqin zonasida umumiy sur'at bilan bir xil o'sgan, undan qochilmagan.
- Eng ko'p kishi: Nukus sh. 307 ming (86 %), Amudaryo t. 192 ming (86 %), Urganch 144 ming, Beruniy 125 ming, Gurlan 115 ming, Xo'jayli 103 ming, Tuproqqal'a 93 ming, Jondor 90 ming, Shahrixon 89 ming, Qarshi t. 77 ming.
- Eng katta ulush: Qorao'zak 93 %, Nukus sh. 86 %, Amudaryo 86 %, Nukus t. 79 %, Kegeyli 77 %, Yangibozor 74 %, Gurlan 70 %.
- Baxmal: 1,2 % (2 080 kishi). HAND usuli bilan (soy bo'yidan 5 m gacha) — 21,7 %. Farq sababi: global model havzasi 500 km² dan kichik soylarni ko'rmaydi.

## Cheklovlar (muhim)
- **Himoyasiz model**: dambalar, to'g'onlar, suv omborlari boshqaruvi hisobga olinmagan (model xususiyati; manba hujjatidan qayta tasdiqlash kerak). Amudaryo quyi oqimi (Xorazm, Qoraqalpog'iston) Tuyamo'yin bilan tartibga solinadi va suv olish tufayli oqim keskin kamaygan — u yerda natija yuqori chegara, haqiqiy xavf emas.
- Havzasi 500 km² dan kichik daryolar yo'q → tog'oldi va tog' tumanlari kam baholanadi (Baxmal misoli). Sel, jala toshqini, kanal o'pirilishi kirmagan.
- 1 km katak ichida aholi va qurilish bir tekis deb olingan: daryo bo'yidagi kataklarda ortiqcha yoki kam chiqishi mumkin.
- Kanal va sug'orish tarmog'i WorldCover da suv deb belgilanmagan joylarda toshqin zonasi sifatida qoladi.
- Shu sabablarga ko'ra **ustuvorlik reytingiga qo'shilmagan**. Reytingga toshqin ikki qism tayyor bo'lgach kiradi: yirik daryolar (bu qatlam) + kichik soylar (HAND, dem10).

## Keyingi
1. HAND butun respublika (dem10, ~118 m): soy bo'yidan 5 m gacha zonadagi aholi va qurilish — tog'oldi tumanlari uchun.
2. Ikki qatlamni birlashtirib reytingning «xavf» qismiga qo'shish (egasi qarori bilan).
3. Chizilgan hudud hisobotiga JRC chuqurligini to'g'ridan-to'g'ri berish (rastrni saytga joylash usuli: PMTiles yoki tumanlar bo'yicha kichik PNG).
4. Ustuvor vodiylar ro'yxati → to'liq 2D model.
