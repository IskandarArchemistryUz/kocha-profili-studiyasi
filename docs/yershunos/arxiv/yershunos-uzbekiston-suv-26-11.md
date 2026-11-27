# Yershunos · O'zbekiston: suv tanqisligi (26.11.2026)

## Nima qilindi
- Manba: WRI Aqueduct 4.0 (2023), HydroBASINS 6-daraja havzalari; bazaviy davr 1979–2019, kelajak 2050 ("odatdagidek": SSP3 RCP7.0; pessimistik: SSP5 RCP8.5). Litsenziya CC BY 4.0.
- ThinkPad: `aq_ol.py` / `aq.bat` → `C:\Work\Yershunos\kesh\aqueduct\aq_uzb_*.parquet` (O'zbekiston qamrovi).
- `kal/su_birlik.py`: havza poligonlari 1 km to'rga tushiriladi, har 197 birlik uchun GHS-POP 2020 aholisi bo'yicha tortilgan o'rtacha → `su_birlik.json` → `birlik.py` da `w` xossasi.
- Ko'rsatkichlar (0–5 ball): `bws` suv stressi (olinadigan suv / mavjud qayta tiklanadigan suv), `bwd` suv zaxirasining sarflanishi, `iav` yillararo o'zgaruvchanlik, `drr` qurg'oqchillik xavfi, `gtd` yer osti suvi sathi pasayishi (faqat 25 birlikda bor), `ws50`/`ws50p` 2050 suv stressi; `juda_yuqori`, `yuqori`, `arid` — aholining toifalar bo'yicha ulushi, %.
- Sahifa: "Suv" guruhi (`#uzs5`): "Suv stressi" (`sv`), "Suv stressi 2050" (`sw`); kartada "Suv tanqisligi" bloki; CSV ga ikki ustun. Artefakt versiyasi `1795709106-f1a2`.

## Natija
- Aholi bo'yicha tortilgan suv stressi: 3,42 → 2050-yilda 3,59 (pessimistik 3,54).
- Juda yuqori stress (4–5 ball): 92 birlik, 17,4 mln kishi (44,6 %). Yuqori (3–4): 14 birlik, 2,6 mln. O'rta–yuqori (2–3): 62 birlik, 11,6 mln. Past (0–2): 29 birlik, 7,4 mln.
- Viloyat (hozir → 2050): Samarqand 4,9 → 5,0; Navoiy 4,9 → 4,9; Buxoro 4,6 → 4,7; Jizzax 4,6 → 4,8; Qashqadaryo 4,3 → 4,3; Surxondaryo 3,8 → 3,8; Farg'ona 3,7 → 3,8; Andijon 3,2 → 3,6; Sirdaryo 3,0 → 3,1; Xorazm 3,0 → 2,9; Qoraqalpog'iston 3,0 → 2,9; Toshkent vil. 2,7 → 3,0; Namangan 1,5 → 1,9; Toshkent sh. 1,4 → 1,8.
- Aholisi respublikadan tez o'sayotgan va stressi 4+ bo'lgan birliklar: 55 ta, 11,35 mln kishi (Urgut, Ko'kdala+Chiroqchi, Denov, Pastdarg'om, Samarqand t., Koson, Kattaqo'rg'on, Yakkabog', Qamashi …).
- Toshkent: stress past–o'rta, lekin yer osti suvi sathi pasayishi 4,9 / 5; shaharning sharqiy qismi kirgan havzada stress 2,7 → 3,4 (mamlakatdagi eng katta o'sish).
- Baxmal: 4,8 → 4,9, aholining 100 % juda yuqori stressli havzada.

## Cheklovlar
- Havza darajasidagi global model (PCR-GLOBWB 2). Tuman ichidagi farqni ko'rsatmaydi.
- Havzalararo kanal orqali suv uzatish (Amu–Buxoro, Qarshi magistral kanali, Katta Farg'ona kanali va b.) va davlatlararo suv taqsimoti to'liq aks etmaydi: Buxoro, Qashqadaryo, Xorazm, Qoraqalpog'iston uchun haqiqiy ta'minot modeldagidan boshqacha bo'lishi mumkin. Xorazm va Qoraqalpog'iston uchun 3,0 ball quyi Amudaryodagi haqiqiy tanqislikni kam ko'rsatayotgan bo'lishi ehtimoli bor — tekshirilmagan.
- Toshkent shahri ichida tumanlar orasidagi farq (Uchtepa 0,0; Mirobod 2,7) havza chegarasi shahar o'rtasidan o'tgani uchun; shahar yagona vodoprovod tizimidan ichadi, shuning uchun shahar ichida tumanlarni solishtirmaslik kerak.
- Stress ≠ ichimlik suvi ta'minoti: olinadigan suvning asosiy qismi sug'orishga ketadi. Shahar uchun ma'nosi: sug'orma yer bilan raqobat, yashil hududlarni sug'orish narxi, yer osti suviga bosim.
- Reytingga hali qo'shilmagan (qaror kutilmoqda). Sinov: suv 20 % vazn bilan qo'shilsa (o'sish 40 %, issiq 20 %, qurg'oqchillik 20 %) yetakchilar: Buxoro t. 91, Qorovulbozor 86, Karmana 79, Bog'dod 78, Koson 77, Yozyovon 77, Sho'rchi 77, Kogon 76, Jarqo'rg'on 76, Mirishkor 75; Surxondaryo janubi (Bandixon, Muzrabot, Angor) tushib ketadi.

## Keyingi
- Rasmiy ma'lumot bilan solishtirish: Suv xo'jaligi vazirligi limitlari / haqiqiy suv olish, tumanlar kesimida ichimlik suvi bilan ta'minlanganlik (SIAT).
- Yer osti suvi: GRACE yoki Gidrogeologiya ma'lumoti.
