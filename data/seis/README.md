# data/seis — seysmiklik taklifi uchun toʻr

`gshap-ball-05.bin` — GSHAP (Global Seismic Hazard Assessment Program, 1999) global PGA toʻridan olingan taxminiy ball toʻri.

- Manba: GFZ «Global Seismic Hazard Map Online», `gshap_pub.zip` → `GSHPUB.DAT` (lon, lat, PGA m/s²; 0,1° katak; 10 % / 50 yil, 475 yil; qattiq grunt). http://gmo.gfz.de/
- Iqtibos (GFZ talabi): Giardini, D., Grünthal, G., Shedlock, K. M. and Zhang, P.: The GSHAP Global Seismic Hazard Map. Annali di Geofisica 42 (6), 1225–1228, 1999. + yuqoridagi sahifaga havola.
- GFZ ogohlantirishi: xarita 1997–1999 yillar ilmiy holati; milliy seysmik baholash oʻrnini bosmaydi va rasmiy xarita maqomiga ega emas. Lab da faqat «taxmin» sifatida, foydalanuvchi qabul qilsagina qoʻllanadi.
- Format: 720 × 360 uint8, 0,5° katak; qator 0 — 90°…89,5° sh. k., ustun 0 — −180°…−179,5°. Qiymat: 0 — maʼlumot yoʻq (dengiz va boshq.), 6 — ≤ 6, 7, 8, 9, 10 — > 9.
- Katak qiymati — ichidagi 0,1° nuqtalarning eng katta PGA si (ehtiyotkor tomon); g = PGA / 9,80665; ball chegaralari 0,07 / 0,14 / 0,28 / 0,57 g (`mr/src/core/seismichint.ts` `pgaToBall`, `tools/gshap_build.py` bilan bir xil).
- Yigʻilgan: 14.11.2026, 3 630 028 nuqta; kataklar: 0 — 112 590, 6 — 94 182, 7 — 21 377, 8 — 20 392, 9 — 8 990, 10 — 1 669.
  Nazorat: Toshkent 9, Berlin 6, Santyago 9, Mexiko 8, Tokio 9. SHA-256 dca4ddd253c835bade8fbb824c6d5822d7a0836803ba7768f520e30c70b95ded.
