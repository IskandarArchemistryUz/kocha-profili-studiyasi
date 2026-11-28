# Bogʻshunos — toʻliq sinov: Bobur nomidagi eko bogʻi (14.11.2026)

Xarita sahifasi: https://claude.ai/artifact/JKhp629JvydRtHVKLneqtM (14 qadam, har biri qatlamlar va sonlar bilan).
Uchastka: OSM way 1472538448 (sobiq hayvonot bogʻi), 8,94 ga, Salar kanali kesib oʻtadi, ichida koʻl (orolchali). Hisob — Python (shapely, UTM 42N), Lab saytida emas: Bogʻshunos kodda hali yoʻq (faqat `ProjectType 'bogshunos'`).

**Iskandar bahosi (18:42):** «juda xom — qani park master rejasi? faqat tahlil». Toʻgʻri: bu metodika va hisob sinovi, loyiha (bosh reja chizmasi) emas. Keyingi bosqich — konsepsiya variantlari va bosh reja chizmasi (javob kutilmoqda).

## Tuzatish (18:45) — koʻl
Birinchi hisobda koʻl tushib qolgan: u OSM da multipolygon relation 1561930 (natural=water, outer + inner/orolcha), Overpass soʻrovim faqat `way` larni olgan edi. Endi qoʻshildi: koʻl 6 583 m² (7,4 %). Saboq Bogʻshunos uchun: suv obyektlari relation lar bilan olinsin + Sentinel-2 suv indeksi bilan tekshiruv. Kanal maydoni ham relation 2960831.

## Maʼlumot manbalari
- Daraxtlar: green.tashkent.uz WFS `vw_tree_locations` — 1 444 daraxt uchastka ichida, 1 399 tasdiqlangan, 59 tur (3 nuqta koʻl ichida — joylashuv xatosi).
- OSM (Overpass, private.coffee oynasi; relation lar — osm.org API orqali), 1 km atrof.
- Aholi: GHS-POP R2023A (2025), brauzerda geotiff.js bilan: ≤300 m 2 331, ≤1 km 17 363.
- Relyef: AWS Terrain Tiles z15 (SRTM ~30 m, sirt modeli) — yaroqsiz (19 m farq, 46 % > 8 %).

## Qadamlar holati
Tayyor 1 (5 — tashrif modeli), qisman 10, past 1 (7 — relyef/yomgʻir), yoʻq 2 (12 — tarmoqlar, 13 — narx). Metodika ≈ 85 %, maʼlumot ≈ 55 %, sayt kodi 0 % (T).

## Asosiy sonlar (koʻl bilan)
- N₁ = min(8,94·100; 17 363·0,35/2) = 894; N kun = 1 787 (501-band, 34-jadval).
- 33-jadval: kafe 25 oʻrin, sport 3 395–3 574 m², hovuz 268 m² (koʻl 6 583 ✓), velo 179; hojatxona 2 (RU 1/500, A).
- Balans: yoʻlak 10 821 m² (kenglik P), bino 4 430, suv 6 583 (7,4 %), koʻkalamzor 67 520 = 75,6 % (491 ✓, zaxira 5,6 %).
- Saqlash tahlili: saqlanadi 1 353, koʻchiriladi 39 (sport/bolalar zonasida), kesiladi 52 (Ailanthus, T).
- R22 buzilgan: Virgin archasi 19,0 %, Juniperus 19 %, Cupressaceae 27,9 %; 167 yangi daraxtdan keyin ham Juniperus 17 %.
- Toj 20,7 → 29,8 % (3-30-300, A).
- Sugʻorish: 664–885 (ShNQ 2.04.02-19) / 318–347 (SanQvaN 0339-16) / 203–405 (ShNQ 2.04.01-22) m³/sut; manba kanal va koʻl.
- Yomgʻir: 1 485 m³ quruqlikdan (h 65,2 mm; ψ P). Yoritgich 237 (har 20 m, P), 14,2 kVt (P).
- Sport zonasi 2 989 m² < 3 395 m² — tekis daraxtsiz joy yetmadi.

## Topilmalar → metodikaga tuzatish
1. Mavjud maydonchalar (futbol 2 179 m², fitnes 422 m²) dasturga qoʻshilsin.
2. R22 uchun «almashtirish rejasi» (mavjud ortiqcha turni yillar boʻyicha kamaytirish) — ekish bilan tuzalmaydi.
3. Moslik vaznlari kalibrlanmagan (sport/bolalar uchun deyarli hamma katak ≥ 0,6).
4. **ZIDDIYAT:** ShNQ 2.07.01-23, 494-band — boʻylama nishab 8 ‰, koʻndalang 2 ‰; ShNQ 2.07.02-24 — 5 %. Asl matndan tekshirilsin (ehtimol ‰/% xatosi).
5. `green_latin.txt` faqat yirik turlarni qamraydi — uchastkadagi daraxtlarning 11,6 % i lotincha nomsiz (Majnun tol va boshq.). 226 turning hammasi kerak.
6. Suv obyektlari OSM relation lari bilan olinsin (koʻl xatosi).

## Toʻxtatadigan boʻshliqlar
Topo-syomka importi (DWG/DXF); mavjud tarmoqlar va TU; narx kitobi (≥ 3 kuzatuv); suv muhofaza zonasi nizomi yoʻq (kanal 12 m, koʻl qirgʻogʻi 10 m — P).
Yuklamalar papkasida «122 - Махтумқули - Абдулла Қодирий.dwg» bor — shu uchastkaga tegishli boʻlishi mumkin, tekshirilmagan.

## Taklif (T)
PR-1…PR-7 dan oldin uchta maʼlumot moduli: reyestr WFS proksi, topo-syomka importi, narx kitobi jadvali.
