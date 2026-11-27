# Bogʻshunos → Chizmadon: tayyor landshaft master reja albomi — Bobur nomidagi eko bogʻi (14.11.2026)

Albom (artifakt): https://claude.ai/artifact/2oiixuRuvk7Z8gMY4RsxiP — 18 varaq, A3; PDF ham chatda yuborildi (Landshaft_albomi_Bobur_eko_bogi.pdf).
Oldingi sinov (tahlil xaritasi): https://claude.ai/artifact/JKhp629JvydRtHVKLneqtM, `claude/bogshunos-sinov-bobur-eko-bogi-14-11.md`.

## Topshiriq (Iskandar, 18:49)
Saytga chiqarishdan oldin: Bogʻshunos ichidagi Chizmadonda yigʻilgandek tayyor master reja albomi. Albom «la» oilasi (`claude/chizmadon-src/landshaft-albomi-la.js`): A3, 12 × 8 toʻr, «album» ramkasi (sarlavha chap-yuqorida + boʻlim yorligʻi, pastda loyiha nomi va bet raqami), Archemistry palitrasi — `mr/src/chizmadon/sheet.ts` dagi frame()/chrome mantigʻi Python da takrorlandi.
Iskandar eʼtirozi (18:47): avvalgi natijada papkadagi referenslar ishlatilmagan → 94 ta referens koʻrildi; ulardan: qirgʻoq tipologiyalari (6, 59, 73), suv kesimlari (27, 46, 60), fasllar jadvali (45, 72), yashash muhitlari/fauna (43, 91), akvarel uslubidagi bosh rejalar (19, 32, 42, 79).

## Varaqlar
1 Muqova · 2 Mundarija · 3 Atrof tahlili · 4 Joy tahlili (6 modul: relyef, nishab, suv, daraxtlar, turlar/R22, yoʻllar) · 5 Imkoniyat va cheklovlar · 6 Tashrif va dastur · 7 Konsepsiya: 3 variant (A Saqlovchi, B Koʻl halqasi, C Ekologik qirgʻoq) · 8 Zonalar va oqimlar · 9 Bosh reja + eksplikatsiya (20 band) · 10 Qirgʻoq tipologiyalari (6) · 11 Kesim A–A (haqiqiy profil, y = 226 m) va B–B · 12 Daraxtlarni saqlash rejasi · 13 Ekish rejasi + vedomost · 14 Assortiment va fasllar · 15 Yashash muhitlari va fauna (tavsiya, referenslardan) · 16 Suv va sugʻorish · 17 Muhandislik va yoritish · 18 TIK, balans, normalar reyestri.
«la» oilasidan farq: la-site modullari 3 (quyosh) va 4 (shamol) oʻrniga «suv» va «turlar/R22» (maʼlumot yoʻq edi); qoʻshildi: 3 variant, qirgʻoq tipologiyalari, saqlash rejasi, fauna. Boʻlim ajratgichlar (la-chapter) va render varaqlari — render yoʻq, qoʻyilmadi.

## Generator (`claude/bogshunos-src/konsepsiya-generator-bobur.py`)
OD (metro, 15 bekat, gʻarbiy turar joy — GHS-POP, TashMU; ichki manzillar) → 3 m toʻr, narx: koʻl/bino/kanal yopiq, daraxt ildiz zonasi va > 8 % nishab qimmat, mavjud yoʻl arzon → bundling → ierarxiya (asosiy ≥ 35 %, ikkinchi ≥ 10 % oqim) → qamrov qoidasi (≤ 35 m; yetmagan joyda mavjud yoʻl soʻqmoq) → sport maydoni tekis, daraxtsiz joyga → oʻtloq yoʻldan 8 m ichkarida → daraxt toʻqnashuvlari.
**Qoʻlda joylashtirilgan:** amfiteatr, kafe terrasasi, 3 koʻprik, qushxona (koordinatalar kodda). Bu — keyingi qoida: «suvga qaragan joy» va «koʻprik nomzodlari» generatorga oʻtkazilishi kerak.

| | A | B | C (tavsiya) |
|---|---|---|---|
| Qattiq yuza, m² | 16 360 | 16 371 | 13 922 |
| Koʻkalamzor | 74,3 % | 74,3 % | 77,1 % |
| PRD oʻrtacha | 1,22 | 1,31 | 1,36 |
| Oʻtloq, m² | 0 | 10 106 | 16 471 |
| Daraxt toʻqnashuvi (≥ 40 sm) | 17 (0) | 55 (5) | 34 (3) |
| Sugʻorish, m³/sut | 661–881 | 539–719 | 470–627 |

C: 199 yangi daraxt (9 tur, 1979 II-A + POWO), toj 19,1 → 29,5 %; saqlanadi 1 358, koʻchiriladi 31, yoʻl suriladi 3, kesiladi 52 (aylant, T); 85 yoritgich (asosiy, ikkinchi va sohil yoʻllarida, P).

## Ochiq (albomda belgilangan)
Relyef (SRTM, P) → topo-syomka; koʻl chuqurligi 1,4 m (P); tarmoqlar va TU yoʻq; CAPEX/OPEX — narx kitobi yoʻq; fenologiya — umumiy maʼlumot (P); 494-band 8 ‰ ziddiyati.
Kod (rendering): `/home/claude/bgsrc` dagi core.py, album.py, pages1–6.py — Chizmadon «la» oilasi uchun namunaviy toʻldirish; kod chatiga topshirilsa, layouts.js + sheet.ts ga koʻchiriladi.
