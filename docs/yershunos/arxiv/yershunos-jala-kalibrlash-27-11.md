# Yershunos · jala skriningini 2D model bilan solishtirish (27.11.2026)

Savol: Baxmalda skrining (SCS-CN + uchburchak gidrograf) 25 km² havzaga 80 mm jalada 54 m³/s berdi, 2D rain-on-grid (Saridala, 25 km²) esa 156 m³/s. Nega 3 baravar?

## Sinov
Bir xil havzada solishtirildi: **Chimgansoy, 15,5 km²** (2D natijalari `mr/public/yershunos/jala.json`: 30 / 50 / 80 mm → Q 1,0 / 23,2 / 91,0 m³/s; samarali yog'in 3,2 / 12,1 / 31,2 mm). Relyef — repodagi `tiles/11`. Skript: sandbox `/home/claude/ys/bx/kalibr_jala.py`.
Havza: eng uzun oqim yo'li 8,3 km, nishab 20 %, Tc (Kirpich) 38 daqiqa.

| Usul | 30 mm | 50 mm | 80 mm |
|---|---|---|---|
| 2D model (etalon) | 1,0 | 23,2 | 91,0 |
| Eski skrining: CN 75, Tp = D/2 + 0,6·Tc, D = 3 soat | 3,0 | 15,9 | 46,2 |
| Eski formula, CN 79 | 5,6 | 22,0 | 56,6 |
| Konvolyutsiya (10 daq qadam, SCS birlik gidrografi), tekis jala, CN 75 | 7,5 | 28,7 | 69,4 |
| **Konvolyutsiya, tekis jala, CN 79** | 11,7 | 36,0 | **79,2** |
| Konvolyutsiya, cho'qqi 1-soatda (50/30/20), CN 79 | 8,0 | 26,6 | 62,7 |

## Xulosa
1. 2D modeldagi havza o'rtacha CN ≈ 79 (samarali yog'indan teskari hisob: 30 mm → 3,2 mm). Skrining CN 75 bilan samarali qatlamni ~20 % kam beradi.
2. Eski formula jalani 3 soatga bir tekis yoyadi (D/2 = 1,5 soat kechikish). SCS-CN da esa oqim jalaning oxiriga to'planadi — konvolyutsiya buni hisobga oladi va cho'qqini ~1,4 baravar oshiradi.
3. Ikkalasi tuzatilgach 80 mm da farq −13 % (79 vs 91). Demak usulning o'z xatosi ~1,6–2 baravar edi; Baxmal–Saridala orasidagi qolgan farq — havzalarning o'zi boshqa (Baxmaldagi 25 km² havza yotiqroq, Tc uzunroq), bu xato emas.
4. 2D model chiziqli emas: kichik jalada (30 mm) deyarli oqim yo'q (1 m³/s), chiziqli usullar 6–12 baravar oshirib yuboradi. 50 mm da +55 %. **Skrining 50 mm dan katta jalalar uchun yaroqli; kichik jalada ishonib bo'lmaydi (yuqori chegara).**

## Qaror (taklif)
Skrining usuli: 10 daqiqalik qadam bilan SCS-CN (kumulyativ) → SCS uchburchak birlik gidrografi (tp = Δt/2 + 0,6·Tc, tb = 2,67·tp) konvolyutsiyasi; tekis 3 soatlik jala; CN — yer qoplamidan (bo'lmasa 79); natija 50 va 80 mm uchun, «±50 %» belgisi bilan.

## Cheklov
- Bitta havzada kalibrlangan (tik, 20 % nishab). Yotiq va yirik (> 50 km²) havzalarda tekshirilmagan; maydon bo'yicha kamaytirish yo'q.
- 2D modelning o'zi kuzatuv bilan tekshirilmagan (toza suv, sel emas; mahalliy IDF yo'q). Bu «model modelga» solishtirish.
- 2D da jalaning vaqt bo'yicha taqsimoti («cho'qqi 1-soatda») aniq nisbatlari bu sessiyada topilmadi.
