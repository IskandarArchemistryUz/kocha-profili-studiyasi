# Yershunos — ta'sir moduli (binolar + aholi): holat (25.11.2026, kechqurun)

Reja: `claude/yershunos-takomillashtirish-reja-25-11.md`. Iskandar qarorlari (25.11): boshlash; asosiy foydalanuvchi — **hokimiyat yoki donor loyihasi**; tanga narxi — keyin o'ylanadi; eski kadastr va kanal fayllarisiz ishlash, ochiq va yangiroq manbalarni topib qo'shish; **urbanizatsiya o'sishi (o'tgan yillar, shahar/qishloq) va prognozni** kengayish moduliga va pasportga qo'shish — tasdiqlangan. Iskandar xizmat safarida (telefon + ThinkPad).

## Bajarildi
- `claude/yershunos-src/zanjir/tasir.py` — ta'sir moduli: `aholi_xavfda`, `birliklar_boyicha`, `binolar_xavfda`, `bino_manbasi_qamrovi`. Sintetik sinov (`test_tasir.py`) o'tdi.
- **Birinchi haqiqiy sinov — Angren** (ThinkPad, `C:\Work\Yershunos`: `ishga_tushir.bat`, `angren_sinov.py`, `kesh/`, `natija.json`). Uzilishga chidamli yuklash (Range bilan davom etish, 6 urinish), bo'sh/buzuq keshni qayta yuklash qo'shildi.

## Angren natijasi (bbox 69,95–70,55 E / 40,95–41,30 N, 1 941 km²) — SKRINING
**Aholi (GHS-POP R2023A, 100 m):**
| Yil | Hududda | Vodiy tubida | Ulush |
|---|---|---|---|
| 1980 | 64 795 | 1 096 | 1,7 % |
| 1990 | 83 909 | 1 516 | 1,8 % |
| 2000 | 82 257 | 1 479 | 1,8 % |
| 2010 | 88 373 | 1 623 | 1,8 % |
| 2020 | 113 057 | 2 177 | 1,9 % |
| 2030 (proyeksiya) | 135 571 | 2 755 | 2,0 % |
- O'rtacha yillik o'sish 1980–2030: 1,49 %. 1990–2010 deyarli turg'unlik (shu davrda qurilish o'sgan).
- SDG 11.3.1 taxminiy: LCR 0,0153, PGR 0,0026 → **LCRPGR ≈ 5,9** (yer aholidan ~6 baravar tez o'zlashtirilgan). Davrlar mos emas (qurilish 1985–2015 WSF, aholi 1990–2010) — faqat yo'nalish.
- Ehtiyot: 2020 dagi 113 ming past ko'rinadi — bbox Angren shahrini to'liq qamramasligi mumkin, GHS-POP model. Statistika agentligi sonlari bilan solishtirilmaguncha hisobotda ishlatilmaydi.

**Binolar (Overture Maps):** 45 734 ta — Microsoft ML 43 014 (94 %), OSM 2 720 (6 %).
- Vodiy tubida: 1 866 bino (4,1 %) — aholi ulushidan (1,9 %) ikki baravar yuqori: vodiy tubida noturar binolar (omborlar, sanoat, dacha) ko'p bo'lishi mumkin — tekshiriladi.
- WSF qurilgan kataklarining 46,5 % ida bino bor (OSM bilan ~40 % edi) — yaxshilanish kichik; MS ML Markaziy Osiyoda to'liq emas.
- Jala 80 mm, suv izidagi binolar: Saridala 18 (oldingi OSM hisobi 7), Bayaul 2 (oldin 0). Raqamlar to'g'ridan-to'g'ri solishtirilmaydi: yangi hisob sahifa PNG'idagi suv izi bo'yicha, chuqurlik chegarasisiz.

## Cheklovlar va keyingi qadamlar
- Vodiy tubi va jala qatlamlari sahifa PNG'laridan olindi (ko'rinish aniqligi). To'g'ri yo'l — zanjirdagi hisob rastrlari (uy kompyuterida `D:\Work\Claude_Archemistry_Lab\yershunos-zanjir`).
- Bino qamrovi pastligi sababli: Google Open Buildings v3 / 2.5D Temporal Markaziy Osiyoni qamraydimi — tekshiriladi; WSF/GHS-BUILT bilan «binosiz qurilgan maydon» bayrog'i qoldiriladi.
- GHS-SMOD (shahar / shaharcha / qishloq, 1975–2030) va GHS-WUP-POP (2100 gacha, 1 km) — urbanizatsiya moduli uchun keyingi qadam.
- Mahalla/tuman chegaralari kerak (`birliklar_boyicha`) — ochiq manba (geoBoundaries / OSM admin_level) qidiriladi.

## Navbat (hokimiyat/donor uchun)
1. Urbanizatsiya moduli (GHS-SMOD + aholi davrlari + prognoz) + tuman/mahalla jadvali.
2. Ko'p xavfli xulosa + hudud pasporti (PDF / Chizmadon).
3. Seysmik × bino yoshi, ko'chki.
4. GloFAS; tekislik rejimi.
5. Huquqiy buferlar (VMQ 981 23.06.2026 dan kuchini yo'qotgan — amaldagi hujjat aniqlangach).
6. Server va tanga — narx qaroridan keyin.

## Manbalar
GHS-POP R2023A (JRC, CC BY 4.0); Overture Maps buildings (ODbL; Microsoft ML Building Footprints, OSM); WSF Evolution (DLR, CC BY 4.0).
