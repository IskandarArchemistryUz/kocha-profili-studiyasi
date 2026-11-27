# Narx simulyatsiyasi — 6 oy (28.10.2026) va tanlangan model D

Egasi soʻradi: tizimni yarim yillik simulyatsiya qilib koʻrish, keyin fikr. Monte-Karlo, har model 300 marta. Skript: sessiya scratchpad `sim/sim.py` (taxminlar shu yerda takrorlangan).

## Taxminlar (haqiqiy maʼlumot yoʻq — hammasi faraz)
- Yangi roʻyxatdan oʻtganlar: 30, 45, 60, 80, 100, 120 / oy. Segmentlar: talaba 50 %, loyihachi 38 %, kompaniya 12 %.
- Oyiga loyiha: 0,5 / 0,6 / 0,8. Uchastka (lognormal median): 2 / 6 / 15 ga.
- Loyiha uchun toʻlashga tayyorlik: 2 % / 15 % / 35 %. Byudjet (median): 60 ming / 700 ming / 3 mln soʻm. Oylik qolish: 35 / 60 / 75 %.
- Byudjetga urilsa — toʻxtaydi va 50 % ehtimol bilan butunlay ketadi. Narxni oldindan bilmaslik (B): boshlash ehtimoli ×0,85.
- 1 tanga ≈ 3 000 soʻm; komissiya 2,5 %; doimiy xarajat 350 ming / oy.

## Natija (6 oy, oʻrtacha)
| Model | 6 oyda | 6-oy | Bir loyiha median / p90 | Byudjetga urilgan |
|---|---|---|---|---|
| A — har fayl (eski narxlar) | 27 mln | 8,6 mln | 336 / 490 ming | 9 % |
| C — loyiha paketi | 33 mln | 10,2 mln | 490 / 990 ming | 19 % |
| B — har amal × √(ga/3) | 50 mln | 15,8 mln | 775 ming / 1,74 mln | 34 % |
| **D — B + loyiha shifti** | **50 mln** | **15,7 mln** | 735 ming / 1,49 mln | 29 % |

Xulosa: sarfga qarab toʻlash tushumni ~1,8 baravar oshiradi; «sezdirmasdan» (shiftsiz) — xavfli (uchdan biri kutilmagan summaga urinadi, yarmi ketadi). D — tushum B bilan bir xil, toʻlangan loyihalar koʻproq, «oxiri qayerda» qoʻrquvi yoʻq. Loyihachilar uchun asosiy narxlar biroz baland boʻlishi mumkin (29 %) — 1–2 oylik haqiqiy maʼlumot bilan qayta hisoblash.

## Model D (egasi tasdiqladi 28.10, 00:19)
- Har Master reja amali = asosiy narx × k, k = max(1, √(ga/3)) (0,1 gacha).
- Asosiy narxlar (tanga): albom 20, DXF 12, DXF 3D 12, IFC 15, GLB 8, TIK 6, hisobot 5, varaq 4, aksonometriya 4, qavat rejalari 8, PNG 2, Chizmadon albomi 15, katta uchastkani ochish 10. Shamol 5, insolyatsiya 4, xonadonlar 6, generatsiya 1, yangi hudud 1. Koʻchasoz va Joyshunos — koeffitsiyentsiz (oldingidek).
- Bepul: haftasiga 1 ta ogʻir hisob; har loyihada 3 ta generatsiya; 3 ga gacha uchastka; ekrandagi hamma natija; belgili PNG/PDF/SVG.
- Loyiha shifti (tanga): ≤3 ga 195 · ≤10 ga 245 · ≤25 ga 345 · ≤60 ga 495 · ≤150 ga 745 · kattasi 1000; shiftdan keyin — bepul.
- Narx har tugmada koʻrinadi; «Bu loyihada soʻramasdan yechilsin» — ixtiyoriy, har yechish xabarda va tarixda.
- Toʻplamlar: 10 / 30 / 100 / 300 / 1000 tanga (39 000 / 99 000 / 290 000 / 690 000 / 2 000 000 soʻm).
- Kod: server/src/prices.js (ITEMS, TRIALS, projectCap, areaK), server/src/wallet.js (project_spend), mr/src/account/pay.ts.
