# Yershunos · O'zbekiston tumanlari bo'yicha iqlim ko'rsatkichlari (26.11.2026)

Oldingi: `claude/yershunos-uzbekiston-kalibrlash-2-26-11.md` (§7, 1-band: "suv tanqisligi va issiqlik"). Holat: KO'RGAZMALI, sahifaga ulangan.

## Manba
World Bank CCKP, CMIP6 0,25° (bias-tuzatilgan, downscaled), ko'p modelli ansambl medianasi, 20 yillik klimatologiya.
Ochiq S3: `https://wbg-cckp.s3.amazonaws.com/data/cmip6-x0.25/{var}/ensemble-all-{ssenariy}/climatology-{var}-annual-mean_cmip6-x0.25_ensemble-all-{ssenariy}_climatology_median_{davr}.nc`
- ssenariy/davr: `historical` 1995-2014; `ssp245` va `ssp585` 2040-2059.
- o'zgaruvchilar: hd35, hd40, tr, cdd, spei12, rx5day, pr, tas — 24 fayl, butun dunyo, jami ~75 MB; ThinkPad'da 137 soniyada yuklandi (`cckp_ol.py`, `kesh\cckp\`).
- Litsenziya: World Bank Open Data Policy, portal aniq litsenziya nomini ko'rsatmaydi → pullik xizmatda ishlatishdan oldin tekshirish kerak (ochiq qolgan).
- Open-Meteo ko'rib chiqildi va rad etildi: bepul API faqat notijoriy; 197 nuqta × 30 yil bepul limitdan oshadi.

## Usul (`claude/yershunos-src/kal/iqlim_birlik.py`)
Har birlik uchun qiymat = shu birlik ichidagi GHS-POP 2020 1 km kataklari bo'yicha **aholi bilan tortilgan o'rtacha** (har 1 km katak eng yaqin 0,25° iqlim katagidan qiymat oladi). Sabab: cho'l va tog' tumanlarida maydon o'rtachasi odam yashaydigan joy iqlimini bermaydi (Mo'ynoq: maydon bo'yicha 23 issiq kun, aholi bo'yicha 41).
Chiqish: `iqlim_birlik.json` → `birlik.py` uni `uzb_birliklar.geojson` ga `c` maydoni sifatida qo'shadi (`c.hd35 = [tarix, ssp245, ssp585]` va h.k.). `birlik.py` ga ikki qator qo'shildi (IQ o'qish va `'c': ...`); loyihadagi nusxada bu hali yo'q.

Nazorat: Toshkent (Chilonzor) hd35 = 32,5 → 62,0 → 71,7; 23.11 dagi mustaqil hisob (THREDDS orqali): 32 → 62. Mos.

## Natijalar
Aholi bilan tortilgan respublika o'rtachasi (bugungi aholi joylashuvi bo'yicha):

| Ko'rsatkich | 1995–2014 | 2040–2059, SSP2-4.5 | 2040–2059, SSP5-8.5 |
|---|---|---|---|
| Issiq kunlar (Tmax > 35 °C), kun/yil | 43 | 68 | 77 |
| Tropik tunlar (Tmin > 20 °C), tun/yil | 44 | 71 | 81 |
| SPEI-12, tumanlar medianasi | −0,17 | −0,74 | −0,84 |

- Yiliga 60 kundan ko'p issiq kun bo'ladigan tumanlarda yashovchilar: **28 % → 66 % → 77 %** (10,9 → 25,8 → 30,0 mln; aholi 2026-yil soni bo'yicha, o'sish hisobga olinmagan).
- 90 kundan ko'p issiq kun: 6 → 48 → 73 birlik.
- **Tez o'sayotgan va jazirama** (2010–2026 o'sishi respublikadan yuqori va 2050 da 90+ issiq kun, SSP2-4.5): 33 birlik, 5,8 mln kishi. Aholisi eng ko'plari: Shahrixon, Termiz (tuman + shahar), Koson, Uchko'prik, Qumqo'rg'on, Jarqo'rg'on. Geografiya: Surxondaryo, Qashqadaryo va Buxoro janubi, Farg'ona vodiysi markazi.
- Eng qurg'oqchil (SPEI-12, SSP5-8.5): Xorazm va Qoraqalpog'iston janubi (≈ −1,95…−2,0).
- Buxoro shahri: issiq kunlar 77 → 104 / 112; 40 °C dan issiq kunlar 14 → 38 / 48; tropik tunlar 80 → 104 / 112.

## Cheklovlar (sahifada ham yozilgan)
1. Katak ~25 km. Tog'li tumanlarda katak o'rtachasi vodiy tubidagi haqiqiy haroratdan past: Angren shahri uchun hd35 = 0 chiqadi — bu noto'g'ri. 6 birlik (tarixiy o'rtacha harorat < 11 °C) kartochkada ogohlantirish bilan belgilanadi. Tuzatish yo'li: balandlik bo'yicha gradient (DEM) yoki ERA5-Land 9 km.
2. Yog'in miqdori ishonchsiz: Toshkent 617 mm, Farg'ona shahri 410 mm (kuzatilgandan ancha yuqori). Shuning uchun `pr` mutlaq qiymati ko'rsatilmaydi, faqat rx5day ning nisbiy o'zgarishi.
3. SPEI-12 — iqlimiy qurg'oqchillik; daryo, kanal va yer osti suvi ta'minotini bildirmaydi. Haqiqiy suv tanqisligi (suv stressi, sug'orishga bog'liqlik) hali qilinmagan: WRI Aqueduct 4.0 yoki mahalliy suv balansi kerak.
4. Bu shahar issiqlik oroli emas: 25 km katak shahar ichidagi farqni ko'rmaydi. Shahar miqyosi uchun Landsat LST (Joyshunos quvuri).
5. Ansambl medianasi; p10–p90 oralig'i yuklanmagan.

## Sahifa
"Kengayish" → "Tumanlar qatlami": "Iqlim" guruhi — Issiq kunlar, Tropik tunlar, Qurg'oqchillik, O'sish × jazirama; davr/ssenariy tanlovi (1995–2014, 2050 SSP2-4.5, 2050 SSP5-8.5). Kartochkada iqlim bloki, mamlakat/viloyat xulosasida jazirama jumlasi, jadval va CSV da issiq kunlar ustunlari.
Artefakt: https://claude.ai/artifact/XcUMMPMnHP5hSgCCgBaQaW (26.11 dagi oxirgi nashr). Sinov: kompyuter va telefon o'lchami, sahifa xatosiz.

## Ustuvorlik reytingi (26.11, qo'shimcha)
Yangi ma'lumotsiz, sahifa ichida hisoblanadi. Reyting 0–100 = uch ko'rsatkichning 197 birlik ichidagi o'rni (foiz) o'rtachasi, teng vazn: (1) aholi o'sishining yillik sur'ati (chegarasi o'zgarganlarda o'z barqaror davri), (2) issiq kunlar, (3) qurg'oqchillik (SPEI-12, teskari). Iqlim qismi tanlangan davr/ssenariyga bog'liq.
2050, SSP2-4.5: 80 va undan yuqori — 10 birlik, 1,6 mln kishi; shundan 6 tasi Surxondaryoda (Muzrabot, Angor, Bandixon, Qiziriq, Jarqo'rg'on, Termiz), 2 tasi Buxoroda (Buxoro tumani — 90, eng yuqori; Qorovulbozor), Mirishkor (Qashqadaryo), Mingbuloq (Namangan).
**Vazn o'zgardi (Iskandar qarori, 26.11): o'sish 50 %, issiq kunlar 25 %, qurg'oqchillik 25 %.** Yangi ro'yxat (2050, SSP2-4.5), 80+: 10 birlik, 1,5 mln kishi — Buxoro t. 91, Bandixon 91, Muzrabot 89, Angor 87, Qiziriq 87, Qorovulbozor 86, Qarshi t. 83, Nishon 82, Mirishkor 81, Mingbuloq 80. Qarshi t. va Nishon kirdi; Jarqo'rg'on (79) va Termiz chiqdi. Yuqoridagi teng vaznli ro'yxat eskirgan.
Cheklov: toshqin, seysmik xavf, zaiflik va suv ta'minoti kirmagan; nisbiy o'rin — mutlaq xavf darajasi emas. Sahifada "ko'rgazmali" deb yozilgan.

## Ochiq qolgani
- OSM'dan Shirin, Termiz, Urganch, Xiva chegaralari: Overpass 406 / 429 qaytardi, olinmadi.
- Keyingi: sug'oriladigan yerning qurilishga o'tishi → zaiflik (SIAT) → tumanlar reytingi; haqiqiy suv tanqisligi (Aqueduct).
