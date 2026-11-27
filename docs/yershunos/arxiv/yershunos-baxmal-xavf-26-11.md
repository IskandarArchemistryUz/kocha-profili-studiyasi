# Yershunos · Baxmal tumani — relyef asosidagi xavf skriningi (26.11.2026)

Holat: KO'RGAZMALI skrining. Iskandar so'rovi: Baxmalni batafsil tekshirish; keyingi maqsad — daryo bo'yidagi master reja takliflarini xavf bo'yicha baholash.

## Usul
Skript: `claude/yershunos-src/zanjir/hudud_xavf.py` (istalgan tuman uchun: `python hudud_xavf.py <nom>`; kirish `hudud/<nom>/chegara.geojson` + `sozlama.json` {nom, k}). ThinkPad'da 816 s (shundan ~12 daqiqa — Overture binolarini yuklash).
- Relyef: Terrain Tiles (Terrarium) z11, ~59 m katak, 24 plitka. Priority-flood → D8 → oqim to'planishi → o'zandan balandlik (HAND).
- Ikki o'zan tarmog'i: asosiy daryolar (havzasi ≥ 10 km², 570 km) va barcha soylar (≥ 1 km², 1 532 km).
- Aholi: GHS-POP R2023A 100 m, 1980–2030, tuman chegarasi ichida; zona niqobi aholi to'riga ulush sifatida o'tkaziladi (`tasir.py`). Rasmiy songa tuzatish k = 1,39.
- Binolar: Overture Maps, 54 675 ta (98 % Microsoft ML, 2 % OSM). Aholi punktlari: OSM place=* nuqtalari (181 ta); har bino eng yaqin nuqtaga (≤ 2 km) biriktirilgan.

## Natijalar
Tuman: 1 852 km², 758–3 411 m (mediana 1 467 m). Tik (>15°) 629 km² (34 %), juda tik (>30°) 107 km². Qurishga qulay (<5°) 705 km² (38 %); shuning 20 % i soy bo'yida (≤ 5 m).

| Zona | Maydon, km² | Aholi 2020 (×1,39) | Ulush | Binolar | Ulush |
|---|---|---|---|---|---|
| Soydan ≤ 5 m | 180,8 | 33 659 | 21,7 % | 11 508 | 21,0 % |
| Soydan ≤ 3 m | 136,8 | 23 805 | 15,3 % | 8 181 | 15,0 % |
| Asosiy daryodan ≤ 10 m | 146,5 | 36 710 | 23,6 % | 12 373 | 22,6 % |
| Asosiy daryodan ≤ 5 m | 90,9 | 22 774 | 14,7 % | 7 295 | 13,3 % |
| Asosiy daryodan ≤ 2 m | 53,8 | 12 618 | 8,1 % | 3 987 | 7,3 % |
| Tik yonbag'ir > 15° | 628,6 | 659 | 0,4 % | 286 | 0,5 % |

Ikki mustaqil manba (aholi rastri va bino izlari) deyarli bir xil ulush beradi (21,7 % va 21,0 %) — natija barqaror.

Dinamika (model, tuzatilmagan): soy ≤ 5 m dagi aholi 8 870 (1980) → 13 004 → 15 082 → 18 227 → 24 215 (2020) → 28 771 (2030); ulushi 25,5 % → 21,7 %. Nisbatan kamaymoqda, mutlaq son 2,7 baravar oshgan.

Soy bo'yidagi binolar soni bo'yicha birinchi qishloqlar (bino jami · soy ≤ 5 m · asosiy daryo ≤ 2 m):
Yangibog' 571 · 487 (85 %) · 319; Loyqa-O'roy 469 · 457 (97 %) · 275; Loyqa 617 · 428 · 269; Mo'g'ol 522 · 423 (81 %) · 217; Qoraqursoq 1 044 · 406 · 182; Saroy 785 · 390 · 171; Bog'ishamol 432 · 317 (73 %) · 100; Toypoqsoy 503 · 314 · 138; Tengali 629 · 312 · 78; Novqa-1 1 823 · 288 · 17; Gulbuloq 435 · 273 · 62; Gultepa 655 · 266 · 137.
To'liq ro'yxat (115 punkt): ThinkPad `C:\Work\Yershunos\natija_baxmal.json`.

## Cheklovlar
1. HAND — geometrik belgi, toshqin chegarasi emas; sarf, qaytalanish davri, chuqurlik yo'q.
2. **G'arbiy tekislik (Yangibog', Loyqa, Mo'g'ol atrofi):** yoyilma konus/tekislikda HAND keng maydonni «soy bo'yi» deb belgilaydi — bu yerda ulushlar oshirib ko'rsatilgan bo'lishi mumkin; aksincha Sangzor vodiysidagi tor tub ishonchliroq. Tekislikda kanal va ariqlar hisobga olinmagan.
3. Relyef 59 m: «≤ 2 m» zonasi taxminiy (DEM vertikal xatosi shu tartibda); GLO-30 (30 m) bilan qayta hisoblash kerak.
4. Binolar asosan ML: molxona, omborlar ham «bino»; turar/noturar ajratilmagan.
5. Qishloq nomlari OSM nuqtalaridan, chegaralarsiz; bitta nomsiz nuqta («?») bor.
6. Tik yonbag'irda aholi kam (0,4 %), lekin ko'chki xavfi yonbag'ir ostidagi uylarga taalluqli — bu hisobga kirmagan.

## Master reja takliflarini xavf bo'yicha baholash — nima mumkin (Iskandar savoli)
| Xavf | Mavjud usul | Yetishmaydi |
|---|---|---|
| Jala / sel (soylar) | rain-on-grid 2D (Chimgansoyda qilingan) | mahalliy IDF; sel reologiyasi |
| Daryo toshqini (Sangzor) | 2D + ko'priklar (Pskemda qilingan) | sarf: Gidromet posti yoki GloFAS (kichik daryoda qo'pol) |
| Qor erishi | qor modeli + «qor ustiga yomg'ir» | qor qoplami bilan tekshirish (MODIS) |
| Muzlik | RGI bilan tekshiriladi; asosiy xavf emas deb taxmin | — |
| Ko'chki / tosh qulashi | moyillik skriningi | hodisalar ro'yxati |
| O'zan siljishi | mobillik koridori | eski suratlar |
Natija shakli: taklif chegaralari × xavf qatlamlari → har zona uchun daraja, aholi/bino, «mumkin / shart bilan / mumkin emas». Daraja: tezkor xavf bahosi; muhandislik qidiruvi o'rnini bosmaydi.

## Jala skriningi: har qishloq ustidagi soy (26.11, 2-qism)
Skript: `claude/yershunos-src/zanjir/jala_skrining.py` (sandbox'da, ThinkPad'dan ko'chirilgan relyef plitkalari va binolar bilan; tarmoq kerak emas). Bu **gidrologik baho, 2D model emas**: suv qayerga yoyilishini bermaydi.
- Usul: SCS-CN oqim qatlami (CN = 75, oraliq 65–85) + SCS uchburchak gidrografi Qp = 0,208·A·Pe/Tp, Tp = D/2 + 0,6·Tc; Tc — Kirpich, eng uzun oqim yo'li bo'yicha. Jala ssenariylari 30 / 50 / 80 mm, 3 soat, butun havzaga bir tekis. 80 mm da samarali qatlam 26,9 mm.
- Soy bo'yidagi binolar (markaz nuqtasi bo'yicha 10 217 ta) ular quyiladigan o'zan havzasi bo'yicha: 1–10 km² — 4 591; 10–50 — 2 563; 50–300 — 2 177; > 300 km² (Sangzor va yirik daryolar) — 886.
- **Suv yetib kelish vaqti bo'yicha: < 30 daqiqa — 1 034 bino; 30–60 daqiqa — 3 152; 1–3 soat — 4 892; > 3 soat — 1 139.** Ya'ni 4 186 bino (41 %) uchun ogohlantirish vaqti bir soatdan kam.
- Tez (≤ 60 daq) soylar ostidagi qishloqlar (soy binolari · havza · vaqt · Q50 · Q80 m³/s): Novqa-1 241 · 15,7 km² · 53 daq · 15 · 43; Olamon 156 · 3,7 · 48 · 4 · 10; Uyas 120 · 18,0 · 56 · 17 · 49; Quyi Novqa 114 · 18,1 · 51 · 17 · 51; Jarbuloq 111 · 10,3 · 43 · 10 · 30; Muzbel 82 · 5,7 · 57 · 5 · 16; Tangatopdi 57 · 26,2 · 57 · 24 · 71.
- Yirik havzali soylar (Mo'g'ol 153 km², Qoraqursoq 103, Saroy 92, Toypoqsoy 222): Q80 = 180–440 m³/s chiqadi, lekin bu **yuqori chegara** — 80 mm jala 100–270 km² ga bir tekis yog'ishi real emas (maydon bo'yicha kamaytirish qo'llanmagan).
- Noaniqlik: CN oralig'ining o'zi Q ni ±60 % o'zgartiradi. Solishtirish: 23.11 dagi 2D rain-on-grid (Saridala, 25 km², 80 mm) 156 m³/s bergan; bu usul 25 km² havzaga 54 m³/s (29–86) beradi — ~3 baravar past. Sabab tekshirilmagan (CN, jala davomiyligi, Tc formulasi). Shuning uchun sonlar tartib uchun, loyihalash uchun emas; nisbiy tartib (qaysi qishloq, qaysi soy, qancha vaqt) ishonchliroq.
- To'liq jadval: `jala_baxmal.csv` (94 qishloq).

## Keyingi
- Iskandardan: master reja takliflari chegaralari (GeoJSON/DXF/rasm) va qaysi soylar.
- O'sha soylar uchun jala modeli; GLO-30 bilan HAND; qatlamlarni sahifaga chiqarish (`hudud\baxmal\vb_soy5.png`, `vb_daryo2.png`, `oqim.png`, burchaklar `natija_baxmal.json` da).
