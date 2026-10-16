# Narx monitoringi (sinov)

Archemistry Lab «Master reja» uchun koʻchirish xarajatini baholashga tayyorgarlik.
Har kuni rejalashtirilgan vazifa uybor.uz ochiq eʼlonlaridan **Mirobod tumani** boʻyicha kvartira va hovli uylar narxini oʻqiydi
va `data/narx/mirobod_uybor.csv` ga jamlangan qator qoʻshadi (`tools/narx_stats.py`).

- Bu **soʻralgan narx** (eʼlon), sotilgan narx emas; odatda bitim narxidan baland. Auksion boshlangʻich narxlari chiqariladi.
- Takror joylangan eʼlonlar (bir xil narx, maydon, koordinata) va chetki qiymatlar (< 150 yoki > 15 000 $/m²) chiqariladi.
- «atrof_1500m» — Abdurauf Fitrat loyihasi markazidan (41.26936, 69.29678) 1,5 km ichidagi eʼlonlar; koordinata koʻpincha koʻcha markaziga geokodlangan.
- Hovli uylarda maydon — eʼlondagi «umumiy maydon» (yer uchastkasi emas).
- Xom eʼlonlar saqlanmaydi — faqat jamlanma.
- Huquqiy asos (kompensatsiya — bozor qiymati, baholovchi xulosasi): OʻRQ-781 (29.06.2022); OʻRQ-1149 «Shaharsozlik renovatsiyasi toʻgʻrisida» (10.06.2026, kuchga kirishi 12.12.2026).
