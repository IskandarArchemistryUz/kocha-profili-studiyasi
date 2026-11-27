# Yershunos · O'zbekiston bo'yicha kalibrlash — 2-bosqich (26.11.2026)

Oldingi hujjat: `claude/yershunos-uzbekiston-kalibrlash-26-11.md`. Bu bosqichda moslik xatolari tuzatildi, chegara o'zgarishlari hisobga olindi, shahar atrofi ko'rsatkichi chiqarildi. Hammasi sandbox'da, ThinkPad'siz bajarildi.

Kod: `claude/yershunos-src/kal/kalibr2.py`. Kirish: `rasmiy_246.json` (SIAT 2.01.02.0001, 2010–2026, 2026-yil 15-yanvar ro'yxati bo'yicha qayta hisoblangan), `uzb_birliklar_osm.csv` (GHS-POP R2023A 1 km × OSM chegaralar).
Chiqish: `uzb_kalibrlangan2.csv` (197 qator), `uzb_dinamika.csv` (188 barqaror birlik), `uzb_shahar_atrofi.csv` (21 juftlik).

## 1. Moslik: 206 rasmiy birlikdan 205 tasi

| Muammo | Yechim | Tekshiruv |
|---|---|---|
| Namangan shahri | Davlatobod t. + Yangi Namangan t. + viloyat qoldig'i (viloyat poligoni − barcha tumanlar; 47,7 km², OSMda chegarasi yo'q o'zak) | GHS 608,5 ming, rasmiy 618,0 ming → k = 1,02 |
| Jizzax shahri | viloyat qoldig'i (55,4 km²) | GHS 195,5 ming, rasmiy 188,5 ming → k = 0,96 |
| Yangi Toshkent tumani | rasmiy qatorda yo'q; Yuqorichirchiq + O'rtachirchiq + Yangi Toshkent bitta birlik | tuman 2024-yilda shu ikki tumandan ajratilgan (19 729 ga) |
| Qoraqalpog'iston | viloyat poligoni yo'q; 17 tuman yig'indisi (166 082 km²) | k = 1,11 |
| Shirin shahri | **hal bo'lmadi**: Sirdaryo viloyatida qoldiq yo'q, demak shahar qaysidir tuman poligoni ichida. Qaysi ekanini bilish uchun geometriya kerak (ThinkPad) | 19,1 ming kishi |

"Qoldiq" usuli: OSMda shahar alohida chegaraga ega bo'lmasa, viloyat poligonidagi aholi − tumanlar yig'indisi. Qolgan 11 viloyatda qoldiq 0 ga teng (±2 kishi), ya'ni usul faqat Jizzax va Namanganda ishlaydi.

## 2. Chegara o'zgarishlari

Rasmiy qatorda bir yilda bir viloyat ichida ham keskin kamaygan, ham keskin ko'paygan (yoki noldan boshlangan) birliklar bitta barqaror guruhga birlashtirildi. 11 guruh topildi:

Taxiatosh + Xo'jayli (2018) · Bo'zatov + Kegeyli (2020) · Zomin + Zarbdor (2018) · Shahrisabz sh. + t. (2018) · Ko'kdala + Chiroqchi (2023) · G'ozg'on + Nurota (2020) · Bandixon + Qiziriq (2020) · Xiva sh. + t. (2018) · Tuproqqal'a + Xazorasp (2021) · Sirg'ali + Yashnobod + Yangihayot (2021) · Nurafshon + Ohangaron sh. + Yangiyo'l sh. + Ohangaron t. + Zangiota + O'rtachirchiq + Yangiyo'l t. + Toshkent t. (2018).

Oldingi hujjatdagi tuzatish: **Zarbdor +76 % noto'g'ri edi** — 2018-yilda Zomindan hudud o'tgan; Zomin + Zarbdor birga +41,6 %.

2020-yildan keyin chegarasi o'zgargan uch guruhda k faqat guruh bo'yicha berilgan.

## 3. Natijalar

- Respublika: rasmiy (2020–2021 o'rtachasi) 34,92 mln, GHS 33,50 mln → 1,04.
- k medianasi 1,08; birliklarning 62 % i 0,8–1,25 ichida (Toshkent shahri tumanlarisiz 66 %).
- **k barqaror**: chegarasi o'zgarmagan 173 birlikda 2010 → 2020 oralig'ida k medianada 4,4 % ga o'zgargan; 83 % birlikda 10 % dan kam. 25 % dan ko'p siljiganlar 7 ta: Forish, Dehqonobod, Karmana, Tomdi, Zarafshon, Qo'shrabot, So'x. Demak k ni 2020-yildan boshqa davrlarga ham doimiy deb qo'llash mumkin (shu 7 tadan tashqari).
- Viloyat darajasi: Toshkent viloyati 1,42 (GHS 1 mln kishini kam ko'rsatadi), Navoiy 1,21, Qoraqalpog'iston 1,11, Toshkent shahri 0,89; qolganlari 0,97–1,07.
- Sanoat shaharlari kam ko'rsatiladi: Zarafshon 5,3; Uchquduq 4,3; Chirchiq 2,3; Toshkent tumani 2,2; Olmaliq 2,0; Angren 1,66 (100 m hisobda 1,61 edi — ikki mustaqil hisob mos).

### Rasmiy o'sish 2010–2026 (chegaradan tozalangan)

Respublika +33,6 %. Eng tez: Bandixon + Qiziriq +60,5 %; Sirg'ali + Yashnobod + Yangihayot +60,1 %; Bektemir +56,3 %; Qarshi t. +53,4 %; Sharof Rashidov +50,7 %; Termiz t. +49,6 %; Andijon t. +49,5 %; Buxoro t. +49,5 %; Ko'kdala + Chiroqchi +49,0 %; Guliston t. +46,8 %; Namangan t. +45,9 %.
Eng sekin: Tomdi −1,3 %; Taxtako'pir −0,2 %; Konimex +3,8 %; Urganch sh. +9,8 %; Yakkasaroy +10,1 %; Buxoro sh. +10,7 %.
Mutlaq qo'shimcha aholi (jami 9,81 mln): Toshkent atrofi guruhi (Zangiota, Toshkent t., Yangiyo'l, Ohangaron va b.) +418 ming; Sirg'ali + Yashnobod + Yangihayot +273 ming; Namangan sh. +188 ming; Urgut +176 ming.

### Shahar atrofi ko'rsatkichi

Markaz shahar va uni o'rab turgan tuman yillik o'sishi (oxirgi chegara o'zgarishidan keyingi davr):

| Shahar | Halqa | Shahar, %/yil | Halqa, %/yil | O'simdagi halqa ulushi |
|---|---|---|---|---|
| Buxoro | Buxoro t. | 0,64 | 2,55 | 71 % |
| Urganch | Urganch t. | 0,58 | 2,37 | 84 % |
| Andijon | Andijon t. | 1,21 | 2,55 | 62 % |
| Qarshi | Qarshi t. | 1,46 | 2,71 | 68 % |
| Guliston | Guliston t. | 1,45 | 2,43 | 59 % |
| Navoiy | Karmana t. | 1,36 | 2,32 | 55 % |
| Termiz | Termiz t. | 1,64 | 2,55 | 52 % |
| Jizzax | Sharof Rashidov t. | 1,77 | 2,60 | 62 % |
| Samarqand | Samarqand t. | 1,47 | 2,24 | 48 % |
| Namangan | Namangan t. | 1,98 | 2,39 | 28 % |
| Nukus | Nukus t. | 1,50 | 1,65 | 20 % |
| Farg'ona | Farg'ona t. | 1,71 | 1,78 | 43 % |

21 juftlikning 20 tasida halqa shahardan tez o'sadi (istisno: Ohangaron). Toshkentda: shahar +27,9 %, viloyat +29,7 % (2010–2026).
Cheklov: halqa sifatida faqat shu nomli (yoki qo'lda belgilangan) bitta tuman olingan; qo'shnilik geometriyasi bo'yicha to'liq halqa keyingi bosqichda.

## 4. Tekshirilmagan va shubhali joylar

1. **Toshkent shahri ichki taqsimoti — tekshirildi (26.11, 2-qism).** 100 m GHS-POP bilan qayta hisob 1 km natijani tasdiqladi: Yangihayot 882 ming (1 km: 902 ming), Sirg'ali 808 ming (796 ming), Bektemir 379 ming (360 ming), markaziy tumanlar 53–148 ming. Poligon markazlari to'g'ri joyda. Demak bu hisob nuqsoni emas, GHS-POP R2023A modelining o'z xatosi: shahar aholisining yarmidan ko'pini janubiy tumanlarga joylashtiradi. Xulosa: Toshkent ichida GHS-POP taqsimotini kalibrlashsiz ishlatib bo'lmaydi; tuman bo'yicha k (0,18–3,8) shu xatoni tuzatadi, lekin tuman ichidagi taqsimot ham shubhali — Toshkent uchun bino hajmiga asoslangan muqobil taqsimot kerak.
2. Shirin shahri moslanmagan (OSMda admin_level 8 chegarasi kerak; ThinkPad'da Overpass so'rovi).
3. Qo'shilgan birliklar (Termiz t. + sh., Urganch t. + sh., Xiva t. + sh. — OSMda shahar chegarasi yo'q, tuman poligoni ichida) alohida ajratilmagan.
4. SIAT ma'lumotidan qayta foydalanish shartlari hanuz aniqlanmagan.

## 5. Sahifaga ulandi (26.11, 2-qism)

Yershunos sahifasi, "Kengayish" rejimi, yangi 3-bo'lim "O'zbekiston: tumanlar kesimi":
- "Tumanlar qatlami" yoqilganda xarita cheklovi (maxBounds, minZoom) ochiladi va mamlakat miqyosiga o'tadi; o'chirilganda yoki boshqa rejimga o'tilganda qaytadi.
- Uch ko'rsatkich: O'sish 2010–2026 (chegaradan tozalangan), Zichlik 2026, Model farqi (k).
- Xaritadan birlik tanlanadi: nom, o'sish, yillik sur'at, 2010 → 2026 soni, zichlik, k, izoh. Har ko'rsatkich bo'yicha eng yuqori 6 ta ro'yxat.
- Ma'lumot: `uzb_birliklar.geojson` (197 birlik, 454 KB; kalibrlash qatori bo'yicha birlashtirilgan, coverage_simplify 0,004°). Yasovchi: `claude/yershunos-src/kal/birlik.py` (kirish: `osm_chegaralar_uzb.json`, `osm_moslik.json` — ikkinchisini `kalibr2.py` chiqaradi).
- Sinov: kompyuter (1440×900) va telefon (390×844) o'lchamida, Kiber va Stilistik fonda, sahifa xatosiz. Haqiqiy telefonda sinalmagan.
- **Eng yangi `index.html` va `uzb_birliklar.geojson` artefaktda** (https://claude.ai/artifact/XcUMMPMnHP5hSgCCgBaQaW, versiya 1795665701-24f1). Loyihadagi `claude/yershunos-src/index.html` bu o'zgarishdan oldingi holat — PR uchun artefaktdagi nusxa olinsin.

## 6. Ma'lumot ko'rsatish kuchaytirildi (26.11, 3-qism)

Savol: bor tahlillar yetadimi va ularni qanday kuchliroq ko'rsatish kerak. Xulosa: yetmaydi (suv, issiqlik, zaiflik, xizmatlarga yetish, sug'oriladigan yer yo'qolishi, tumanlar reytingi yo'q), lekin avval interfeys. Iskandar: "boshla". Qilingani:

- **Taqqos**: tanlangan birlik uchun respublikada / viloyatda / zichlik bo'yicha o'rin; yillik sur'at respublika sur'ati bilan (shu davr uchun).
- **Vaqt chizig'i**: 2010–2026 yillik rasmiy qator (SVG), punktir bilan 2050 prognozi. Prognoz = rasmiy 2020 × (GHS-WUP 2050 / 2020); yig'indi 53,8 mln. Rasmiy prognoz bilan solishtirilmagan. Prognoz sur'ati joriy sur'atning yarmidan past bo'lsa (23 birlik) kartochkada ogohlantirish chiqadi.
- **Avtomat xulosa**: o'sish, zichlik, model farqi va prognoz bo'yicha 3–4 jumla; ishonch yorlig'i ("model rasmiy songa mos" / "model farqi katta").
- **Chegarasi o'zgargan 20 birlik**: kartochka o'z chegarasidagi barqaror davrni ko'rsatadi (masalan Toshkent tumani 2018–2026: +29,1 %, yiliga 3,25 %); xarita rangi guruh bo'yicha qoladi va bu yozib qo'yilgan.
- **Miqyos zinasi**: viloyat tanlovi (14 hudud) — xarita shu viloyatga o'tadi, qolganlari xiralashadi, ro'yxat va jadval shu viloyat bilan cheklanadi; hech narsa tanlanmaganda mamlakat yoki viloyat xulosasi (rasmiy viloyat qatori).
- **Jadval**: saralanadigan, nom bo'yicha qidiruv, qatorni bosganda xaritada ochiladi, CSV (nuqtali vergul, BOM — Excel uchun).
- **Afsona**: har sinfda nechta birlik borligi (kichik gistogramma).
- Ma'lumot: `uzb_birliklar.geojson` endi `s` (yillik qator), `oz` (o'z chegarasidagi davr), `p50`, yuqori darajada `vil` (viloyat va respublika qatorlari) maydonlariga ega; 484 KB.
- Sinov: kompyuter va telefon o'lchami, sahifa xatosiz, CSV yuklab olindi. Haqiqiy telefonda sinalmagan. **Artefakt ko'rinishida CSV tugmasi ishlamaydi** (ko'ruvchi yuklab olishga ruxsat bermaydi); saytda (archemistry.uz) oddiy havola sifatida ishlaydi. Artefaktda ham ishlashi uchun `downloads` imkoniyatini e'lon qilish kerak — sahifa shartnomasi o'zgarishi xavfi sabab qilinmadi.
- Artefakt versiyasi: 1795666763-d366; loyihadagi `index.html` hanuz eski — PR uchun artefaktdagi nusxa olinsin.

Qilinmagani: ikki ko'rsatkichli xarita (o'sish × xavf) — mamlakat miqyosida xavf qatlami yo'q; sahifaning mamlakatdan ochilishi; PDF pasport.

## 7. Keyingi qadamlar

1. Yangi tahlillar, navbat: suv tanqisligi va issiqlik → sug'oriladigan yerning qurilishga o'tishi → zaiflik (SIAT tuman ko'rsatkichlari) → tumanlar reytingi → seysmik va ko'chki.
2. Shirin, Termiz, Urganch, Xiva shahar chegaralari (ThinkPad, Overpass).
3. Kalibrlangan 1 km rastr (birlik × k) va uni `tasir.py` dagi xavf ostidagi aholi hisobiga ulash.
4. To'liq halqa (qo'shnilik geometriyasi bo'yicha) shahar atrofi ko'rsatkichi.
5. Toshkent uchun bino hajmiga asoslangan aholi taqsimoti.
