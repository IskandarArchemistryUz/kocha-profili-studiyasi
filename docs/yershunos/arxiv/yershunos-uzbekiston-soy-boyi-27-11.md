# Yershunos · O'zbekiston: soy bo'yi zonasi (HAND) va toshqin reytingda (27.11.2026)

## Nima qilindi
- Relyef: Terrain Tiles (Terrarium) z10, butun respublika — 1700 plitka, ThinkPad `kesh\dem10\` → `dem10_yig.py` bilan bitta fayl `kesh\dem10_uzb.tif` (int16, EPSG:3857, 12800×8704, yerda ~118 m, 61 MB).
- `kal/hand_uzb.py` (numba; 111 mln katak, 60 s): priority-flood (+0,01 m epsilon) → oqim yo'nalishi → havza maydoni (kenglik bo'yicha tuzatilgan) → o'zan (≥ 1 km²) → HAND. Zona: HAND ≤ 5 m; 1 = kichik soy (o'zan havzasi ≤ 500 km²), 2 = yirik daryo, 3 = tekis (3 km oynada o'rtacha qiyalik < 0,5°) — hisoblanmaydi.
- `kal/hand_birlik.py`: zona ulushi 1 km Mollweide to'riga o'rtachalanadi × GHS-POP 2020, GHS-BUILT 1980/2000/2020 → `hand_birlik.json` → GeoJSON `sb` xossasi.
- `sb` kalitlari: `a` — kichik soy bo'yidagi aholi ulushi (tekis emas), %; `a1` — shundan atrof qiyaligi ≥ 1° (asosiy ko'rsatkich); `a2` — ≥ 2°; `ak` — havzasi ≤ 50 km² soylar; `ad` — yirik daryo bo'yi; `tekis` — tekislikda yashovchilar, %; `k`, `k1` — kishi; `q80/q00/q20` — zonadagi (`a` zonasi) qurilgan maydon, km²; `qu`, `qy`.
- Sahifa (PR #793): «Toshqin» guruhi — Daryo (`ta`) / Soy bo'yi (`ts` = `sb.a1`) / Qurilish (`tb`); karta, CSV, hisobot xulosalari, solishtirish, metodika.

## Nazorat
Baxmal: `a` = 22,3 % (26.11 dagi z11, 59 m hisobida 21,7 %) — mos.

## Natija
- Respublika: tog' va tog'oldi soylari bo'yida (qiyalik ≥ 1°) aholining 6,9 % i ≈ 2,68 mln kishi; yotiq yoyilmalar bilan (≥ 0,5°) 21,3 % ≈ 8,32 mln; qiyalik ≥ 2° — 1,7 %. Aholining ~40 % i tekislikda (usul qo'llanmaydi).
- Zonadagi qurilgan maydon (`a` zonasi): 309 → 543 → 747 km² (1980 → 2000 → 2020).
- Eng ko'p kishi (≥ 1°): Toshkent tumani 128 ming (23,5 %), Samarqand sh. 97 ming, Shayxontohur 90 ming, Chust 84 ming (28,9 %), Yunusobod 76 ming, Namangan sh. 68 ming, Mirzo Ulug'bek 66 ming, Qumqo'rg'on 59 ming, Denov 56 ming, Urgut 56 ming, Kosonsoy 55 ming (23,5 %), Yangiqo'rg'on 54 ming.
- Tumanlar: Baxmal 18,3 %; Bo'stonliq 17,0; Angren 19,7; Boysun 17,1; Urgut 9,7; Zomin 4,1; Nukus 0.

## Reyting (3-tahrir)
Xavf = (issiq kunlar + qurg'oqchillik + suv stressi + **toshqin**) / 4, har biri foiz-rang. Toshqin = `tq.a100_05` (daryo toshqini zonasida suv ≥ 0,5 m bo'lgan aholi ulushi) + `sb.a1`. Formula qolgani o'zgarmagan: `R = bosim^0,5 × xavf^0,25 × zaiflik^0,25`.
- Yangi birinchi o'ntalik (2050, SSP2-4.5): Qarshi t. 81, Buxoro t. 80, Ko'kdala+Chiroqchi 80, Bandixon 80, Andijon t. 79, Oltinsoy 76, Mirishkor 75, Sho'rchi 75, Sherobod 74, Angor 73.
- Eng ko'tarilganlar: So'x 139 → 65, Kosonsoy 129 → 64, Toshkent t. 79 → 31, Yangiqo'rg'on 117 → 78, Chust 124 → 96, Samarqand t. 65 → 42, **Baxmal 52 → 30**, Sariosiyo 60 → 40.
- Eng tushganlar (tekis cho'l tumanlari): Paxtakor 66 → 87, Zarbdor 34 → 51, Mirzacho'l 33 → 48, Oltinko'l 24 → 39.

## Cheklovlar
- HAND — geometrik belgi: suv bosish chegarasi, sarf va qaytalanish davri yo'q. 118 m relyefda 5 m chegara taxminiy (vertikal xato shu tartibda).
- Yotiq yoyilma konuslarda (qiyalik 0,5–1°) zona keng chiqadi; shuning uchun asosiy ko'rsatkich `a1` (≥ 1°). Lekin sel aynan yoyilma konuslarda xavfli — `a` yuqori chegara sifatida saqlangan.
- Shahar ichida (Toshkent, Samarqand) relyefdan olingan o'zanlar yopiq quvur va kanallar bilan mos kelmasligi mumkin — shahar tumanlaridagi raqamlar taxminiy.
- 1 km katak ichida aholi bir tekis deb olingan.
- Kartadagi «soy bo'yidagi qurilgan maydon» `a` zonasi bo'yicha (kengroq), aholi ulushi esa `a1` bo'yicha — keyingi tahrirda bir xil qilinsin.
- Daryo toshqini qismi (JRC) dambalarni hisobga olmaydi — reytingda Amudaryo quyi oqimi tumanlari biroz ko'tarilgan bo'lishi mumkin (xavfning 1/4 qismi, umumiy ballda ~6 %).
