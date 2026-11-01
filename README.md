# Narx monitoringi

Archemistry Lab uchun uy narxlari: «Master reja» koʻchirish xarajati va Joyshunos «Uy narxlari» qatlami.
Har kuni rejalashtirilgan vazifa uybor.uz ochiq eʼlonlaridan **butun Toshkent shahri** boʻyicha kvartira va hovli uylar narxini oʻqiydi:

- `data/narx/toshkent_uybor.csv` — shahar va har tuman boʻyicha jamlanma (`tools/narx_stats.py --hudud Toshkent --tumanlar`);
- `data/narx/toshkent_hex_uybor.csv`, `toshkent_hex.geojson`, `toshkent_hex.json` — olti burchakli katakchalar (soti) boʻyicha median (`tools/narx_hex.py`); `toshkent_hex.json` ni ilova oʻqiydi.
- `data/narx/mirobod_uybor.csv` — 2026-10-16…31 dagi Mirobod sinov yozuvlari (arxiv, endi yangilanmaydi).

- Bu **soʻralgan narx** (eʼlon), sotilgan narx emas; odatda bitim narxidan baland. Auksion boshlangʻich narxlari chiqariladi.
- Takror joylangan eʼlonlar (bir xil narx, maydon, koordinata) va chetki qiymatlar (< 150 yoki > 15 000 $/m²) chiqariladi.
- «atrof_1500m» ustunlari faqat `--markaz LAT,LNG` berilganda toʻldiriladi (aks holda boʻsh).
- Hovli uylarda maydon — eʼlondagi «umumiy maydon» (yer uchastkasi emas).
- Xom eʼlonlar saqlanmaydi — faqat jamlanma. 5 tadan kam eʼlonli katakda narx yozilmaydi.
- Huquqiy asos (kompensatsiya — bozor qiymati, baholovchi xulosasi): OʻRQ-781 (29.06.2022); OʻRQ-1149 «Shaharsozlik renovatsiyasi toʻgʻrisida» (10.06.2026, kuchga kirishi 12.12.2026).
