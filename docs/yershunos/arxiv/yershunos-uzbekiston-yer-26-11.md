# Yershunos · O'zbekiston: qurilish va ekin yeri (26.11.2026)

Holat: KO'RGAZMALI, sahifaga ulangan («Tumanlar qatlami» → «Yer»: Ekin yeri yo'qolishi, Qurilgan yer / kishi).

## Manba
- **GHS-BUILT-S R2023A**, 1 km, Mollweide: qurilgan maydon (tom va qattiq qoplama), m²/katak; 1980, 2000, 2020; 6 plitka × 3 davr. JRC ochiq ma'lumoti (GHS-POP bilan bir xil shartlar).
- **ESA WorldCover 2021 v200** (10 m, CC BY 4.0): 28 ta 3°×3° plitkadan faqat 16× kichraytirilgan ko'rinish (~160 m, eng yaqin qo'shni) o'qilgan — to'liq fayllar yuklanmagan. Sinflar: 40 = ekin yeri, 50 = qurilgan.
- Yuklash: `claude/yershunos-src/zanjir/yer_ol.py` (ThinkPad, 79 s, ~15 MB). Hisob: `claude/yershunos-src/kal/yer_birlik.py` (sandbox) → `yer_birlik.json` → `birlik.py` uni geojson'ga `e` maydoni qilib qo'shadi.

## Usul
Har 1 km katak uchun: yangi qurilgan maydon dB = max(B2020 − B2000, 0); shu katakdagi **qurilmagan yerning ekin ulushi** (WorldCover 2021) q = ekin / (1 − qurilgan). Ekin yeridan olingan maydon bahosi = dB × q. Faraz: yangi qurilish o'z katagidagi qolgan yer tarkibiga mutanosib ravishda yer olgan (2000-yilgi yer qoplami xaritasi yo'q).
Yo'qotish, % = olingan / (ekin 2021 + olingan).

## Natija
- Qurilgan maydon: 1 557 km² (1980) → 2 764 (2000) → 3 790 km² (2020); 2000–2020 da +1 025 km² (+37 %).
- Shundan **taxminan 674 km² (66 %) ekin yeri hisobiga** — mavjud ekin yerining 1,15 %.
- Ekin yeri (WorldCover 2021): 57 806 km², kishi boshiga 1 482 m² (2026 aholisi). Qurilgan maydon kishi boshiga 109 m² (2020).
- Nisbiy yo'qotish eng yuqori (ekin > 20 km² birliklar): Farg'ona sh. 10,2 %; Sirg'ali + Yashnobod 9,8 %; Toshkent t. 6,6 %; Buxoro sh. 5,7 %; Zangiota 5,3 %; Asaka 4,9 %; To'raqo'rg'on 3,9 %; O'zbekiston t. 3,6 %; G'ijduvon 3,3 %; Uchko'prik 3,2 %.
- Mutlaq: Ko'kdala + Chiroqchi 16,5 km²; Kattaqo'rg'on 11,5; Ishtixon 11,1; Payariq 10,5; G'ijduvon 10,4; Pastdarg'om 10,0; Shofirkon 9,7.
- Geografiya: Toshkent atrofi, Farg'ona vodiysi va Zarafshon vohasi — aynan shahar atrofi tumanlari (aholi o'sishi halqada yig'ilayotgani bilan mos: `claude/yershunos-shahar-halqa-26-11.md`).

## Cheklovlar
1. **Quyi chegara.** GHS-BUILT-S faqat tom va qattiq qoplamani o'lchaydi (jami 3 790 km²); WorldCover «qurilgan» sinfi 9 035 km² — 2,4 baravar ko'p, chunki hovli va tomorqa bilan birga. Haqiqiy yer ajratish (uchastka) 674 km² dan bir necha baravar katta bo'lishi mumkin; aniq koeffitsiyent tekshirilmagan.
2. Ekin yeri 2021-yil holati bo'yicha; 2000-yilda o'sha joyda nima bo'lgani bilvosita taxmin. Bo'z yer yoki bog'dan qurilishga o'tgan yer ham «ekin» deb sanalishi yoki aksincha bo'lishi mumkin.
3. WorldCover «ekin yeri» sug'oriladigan va lalmi yerni ajratmaydi (rasmiy sug'oriladigan maydon bundan kichik). «Sug'oriladigan yer yo'qolishi» deyish uchun sug'orish xaritasi kerak.
4. 16× kichraytirish: kichik uchastkalar sinfi tasodifiy tanlanadi; tuman yig'indisida xato kichik, 1 km katakda sezilarli.
5. Kadastr yoki rasmiy yer balansi bilan solishtirilmagan.

## Sahifa
Artefakt https://claude.ai/artifact/XcUMMPMnHP5hSgCCgBaQaW — kartochkada «Yer» bloki (qurilgan maydon 1980 · 2000 · 2020, yangi qurilgan, ekin yeridan olingan, ekin yeri va kishi boshiga), CSV da 7 ustun. Sinov: kompyuter o'lchami, sahifa xatosiz.

## Keyingi
- Haqiqiy suv tanqisligi (WRI Aqueduct yoki mahalliy suv balansi); zaiflik (SIAT tuman ko'rsatkichlari); reytingga yer va suv qo'shish.
- GHS-BUILT-S 100 m va WorldCover to'liq aniqlikda — shahar atrofi halqalari uchun (5–10 km bufer).
