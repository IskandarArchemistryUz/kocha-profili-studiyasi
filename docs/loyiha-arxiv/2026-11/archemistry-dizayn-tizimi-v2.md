# Archemistry Lab — dizayn tizimi v2 (2026-10-17)

Manba: Design kanvasi «Archemistry Lab — toʻliq maket», sahifa **«Dizayn tizimi v2 (yangi)»**. Kod uchun yagona fayl: `project/ds2.css` (tokenlar + komponentlar + piktogramma klasslari). Shu qiymatlar «Archemistry Lab» Design System artifaktida ham (v2) bor. Eski `ui.css` va «Arxiv» sahifasidagi doskalar endi namuna emas.

## Doskalar
- DS-00 Skaner — hozirgi Master reja (commit 5503a1a): 12 qadam va 5 asbobning skrinshotlari, 14 nomuvofiqlik va qaror.
- DS-01 Asoslar — rang, matn, balandlik/radius, oraliq, soya, harakat, 9 qoida.
- DS-02 Komponentlar.
- DS-03 Qobiq — Master reja ekrani.
- DS-04 Inventar — kodda bor har bir boʻlim → yangi dizaynda qaysi doskada.
- DS-05 Piktogrammalar — 83 ta: tipologiya, parkovka, ijtimoiy modul, parsel usuli, toʻr yoʻnalishi/varianti, tom, qoplama, parapet, deraza, deraza joylashuvi, balkon, balkon joylashuvi, quyosh himoyasi, material.
- MR-Q1…Q3 — 12 qadam paneli TOʻLIQ: har tugma, variant va shartli blok (kesik ramka = «agar: …» holatida chiqadi); tanlov plitkalarida piktogrammalar.
- MR-Kocha — 3-qadam Koʻchalar, tanlangan B uslub (yorliqlar): Toʻr · Profillar (6 asosiy + 49 shablon, kod maʼlumotidan haqiqiy kesimlar, guruh filtrlari, qidiruv) · Chizish.
- MR-Q4 — bino inspektori (2 tab), yuqori panel, kamera, xarita, qatlamlar, koʻrsatkichlar va pastki oyna, asbob paneli, kontekst menyu (5 holat), klaviatura.
- MR-Q5 — qavat albomi, eski grafika oynasi (yangisi — MR-Varaqlar), loyihalar roʻyxati.
- **MR-Yozuvlar (yangi)** — daha va yer uchastkasi yozuvlari: hozir/yangi, 3 masshtab, darajalar jadvali, joylashuv qoidalari, planshet (1024 × 720) + «Yer uchastkalari» jadvali, «Qatlamlar → Yozuvlar» sozlamasi, masshtab jadvali.
- **CH-Yagona (tanlangan)** — Chizmadon yagona muharriri: chap `Varaqlar · Qatlamlar · Kutubxona`, oʻng `Element · Tekshiruv`, header `Muharrir · Albom`; panellar chetga yigʻiladi, Tab — hammasi. Variantlar CH-A/B/C — tarix uchun. Eski Albom funksiyalari — `claude/chizmadon-eski-albom.md`.
- **MR-Varaqlar-V3 → V2 (tanlangan)** — varaq xaritada ramka bilan boshlanadi, keyin varaqlar toʻplamida sozlanadi.
- **MR-Varaqlar (yangi)** — Varaqlar oynasi (oldin «Grafika»): rejim + namunalar, boʻlimli chap panel, haqiqiy oʻlchamdagi varaq (shtamp, jadval, lupa), Yuklab olish menyusi, Varaq tekshiruvi, Qavat rejalari va Aksonometriya rejimlari, «hozir → yangi» jadvali, Planimetric tahlili.

## Asosiy qoidalar
0. **Hech bir funksiya tushib qolmaydi.** Dizayn — joylashuv namunasi. Kodda bor har bir boshqaruv (≈ 506) va variant (≈ 600) yangi interfeysda ham boʻladi; toʻliq roʻyxat — `claude/master-reja-inventar.md` (4-boʻlim — 2026-10-17 dagi yangi talablar). Joy yetmasa — yigʻiladigan guruh, lekin oʻchirilmaydi; oʻchirish kerak boʻlsa, avval soʻraladi.
1. Tanlangan boshqaruv — qora (`--ink`). Koʻk (`--sel`) faqat xaritadagi obyekt, fokus, havola.
2. Balandlik: 28 / 36 / 44. Radius: boshqaruv 10, plitka 12, guruh 16, panel 22; pill — faqat chip va suzuvchi panel.
3. Matn: 22 / 15 / 13,5 / 12 / 11 (yorliq); mono — faqat raqam va meʼyor kodi.
4. Panelda bitta qora (asosiy) tugma; panel doim toʻliq balandlik, pastki tugmalar joyida.
5. Uzun tushuntirish — yopiq «Qanday hisoblanadi» ichida; meʼyor — `.norm` belgisi.
6. Brauzer checkbox/select/range ishlatilmaydi — `.check`, `.switch`, `.select`, `.range`.
7. Asboblar (Tanlash, Qoʻl, Chizgʻich, Kesim, Uslub nusxasi, Undo/Redo) railda emas — pastda markazda (xaritaning koʻrinadigan qismi markazida).
8. Xizmatlar faqat `--svc` rangi bilan farqlanadi: Master reja #141414, Koʻchasoz #4c5bd4, Joyshunos #c0643a, Dizayn-kod #0f8a7e, Chizmadon #8b4a9c.
9. Tungi rejim — `[data-theme=dark]` token qiymatlari.
10. **Piktogrammalar:** har rasmli tanlovda (bino, fasad, tom, parsel, toʻr, parkovka) — 40 × 40 piktogramma, plitkada 36 px. Ikki koʻrinish: reja (yuqoridan, kesik chegarali kvartal ichida) va fasad (oldidan, yer chizigʻi bilan). Chiziq currentColor 1,3 px; toʻldirish faqat `.f1 .f2 .f3` (past → baland), `.gl` shisha, `.gr` yashil, `.sun`. Tanlanganda klasslar orqali teskari rangga oʻtadi. Koʻcha profillari — haqiqiy tasmalar boʻyicha kichik kesim.
11. **Xarita yozuvlari (hamma xizmatda):** yozuv yer sathida (binolar uni yopadi), faqat bino dogʻidan 2 m nari boʻsh joyda, uchastka chegarasidan chiqmaydi. Daraja masshtab va joyga qarab: toʻliq → kod + maydon → kod → jadvalda. Ekranda 12 / 11 px, varaqda 3,5 / 2,5 mm. Kartochka faqat tanlangan obyektda. Sigʻmagani — «Yer uchastkalari» jadvali va shartli belgilarda. Masshtab chipi `≈ 1:N`.
13. **Yigʻiladigan panellar:** yon panellar chetga 48 px tasmaga yigʻiladi (yorliqlar ikonka, ogohlantirish soni koʻrinadi); Tab — hammasi; yigʻiq paneldan ochilgani suzib chiqadi va sahnani siljitmaydi. Chizmadondan boshlab — boshqa xizmatlarda ham shu qoida.
12. **Masshtab:** standart qator 1:500 · 1:1000 · 1:2000 · 1:5000 · 1:10 000; meʼyorda bori `.norm` bilan (ShNQ 2.07.06-24, 8–9-bandlar), yoʻgʻi `andoza` chipi bilan. Varaq va yuklab olingan fayl doim oq.

## Kutilayotgan qarorlar
- Hech qachon koʻrinmaydigan ikki element (Hajmlar «tanlangan seksiya» qatori, «N-bosqichda quriladi» xabari) — saqlansinmi, olib tashlansinmi.
- «Kvartal → Daha» bilan kod prefiksi: `K-1.23` qoladimi yoki `D-1.23`.
- Masshtab «andoza» qatorlari — manba bilan tasdiqlash (QMQ yoki Urbanizatsiya qoʻmitasi talabi boʻlsa).

## Keyingi
- Tillar: lugʻat (`claude/atamalar-lugat-uz-en-ru.md`) va uch tilli satrlar (`claude/i18n-master-reja.json`) tayyor — yangi interfeys shu fayldan oladi.
- Server (VPS + Cloudflare) — oxirgi bosqich.
