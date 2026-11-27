# Yershunos — butun O'zbekiston: rasmiy statistika bilan kalibrlash (26.11.2026, 08:40)

Oldingi: `claude/yershunos-uzbekiston-urbanizatsiya-26-11.md`. Iskandar (26.11, 08:21): keyingi qadamni boshlash.

## Rasmiy manba topildi (mashina o'qiydigan)
SIAT (Milliy statistika qo'mitasi), to'plam **2.01.02.0001 «Doimiy aholi soni (jami)»**, yil boshiga, ming kishi, 2010–2026, MHOBT kodlari bilan: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_246.json` (shuningdek .csv, .xlsx, .xml, .pdf). 206 tuman/shahar + 14 hudud + respublika. Oxirgi o'zgarish 12.11.2026.
- **Muhim:** to'plam izohiga ko'ra 2010–2026 qatori **2026-yil 15-yanvar aholini ro'yxatga olish natijalari asosida qayta hisoblangan** (PF-173, 19.09.2025). Respublika 1.01.2026: **39 023,6 ming** (avval e'lon qilingan 38 236,7 ming edi). Tumanlar ham o'zgargan: Olmaliq sh. 165,9 (avval 151,0), Chirchiq sh. 193,5 (178,3), Toshkent tumani 547,0 (209,8). 25.11 dagi Angren kalibrlashi (k = 1,61) eski qatorga tayangan — Angren 188,2 o'zgarmagan, k kuchda.
- Yuklovchi: `C:\Work\Yershunos\stat_ol.py` (+ `stat.bat`); fayllar `kesh\stat\246.*`. Qayta foydalanish shartlari (litsenziya) to'plamda ko'rsatilmagan — pullik xizmat uchun tekshiriladi; manba ko'rsatiladi.

## Moslashtirish (rasmiy 206 ↔ OSM 203 poligon)
Kod: `claude/yershunos-src/kal/kalibr.py`; natija: `claude/yershunos-src/kal/uzb_kalibrlangan.csv` (200 birlik: MHOBT kodi, rasmiy 2010/2020/2026, GHS 2020, k, rasmiy o'sish, zichlik, SMOD shahar ulushi, WUP 2020/2050/2100).
- Mos keldi: 200 / 206. Shahar poligoni OSM'da yo'q bo'lsa, shu nomli tuman poligoniga qo'shildi (Termiz, Urganch, Xiva).
- **Hal qilinmagan:** Jizzax shahri va Shirin shahri (OSM'da admin_level 6 poligoni yo'q — aholisi qo'shni tumanga tushgan); Namangan shahri OSM'da ikki tumanga bo'lingan (Davlatobod, Yangi Namangan) — hozir noto'g'ri «Namangan tumani + shahri» bo'lib qo'shilgan, tuzatiladi; Yangi Toshkent tumani rasmiy qatorda yo'q; Qoraqalpog'iston viloyat poligoni yo'q.

## Natija: k = rasmiy 2020 / GHS-POP 2020
- Mamlakat: rasmiy 34,72 mln ↔ GHS 32,51 mln (200 birlik) → 1,07.
- Birliklar: median k 1,08; faqat **61 %** birlik 0,8–1,25 oralig'ida.
- Eng ko'p kam ko'rsatilgan: Zarafshon sh. 5,3 · Uchquduq 4,3 · Olmazor 3,8 · Shayxontohur 3,6 · Yuqorichirchiq 3,3 · Chilonzor 2,7 · Mirobod 2,7 · Uchtepa 2,6 · Chirchiq sh. 2,3.
- Eng ko'p ortiq ko'rsatilgan: Yangihayot 0,06 · Bektemir 0,18 · Sirg'ali 0,30 · Tuproqqal'a 0,52 · O'rtachirchiq 0,61 · Quyichirchiq 0,67.
- Qonuniyat: model aholini zich shahar yadrosidan chekka va shahar atrofi tumanlariga siljitgan (Toshkent: markaziy tumanlar 2,5–3,8 baravar kam, janubiy chekka 3–16 baravar ortiq); sanoat monoshaharlari (Zarafshon, Uchquduq) keskin kam.
- **Xulosa:** tuman darajasida kalibrlash majburiy; GHS-POP faqat tuman ichidagi taqsimot shakli uchun.

## Rasmiy dinamika 2010–2026 (ro'yxat asosida qayta hisoblangan qator)
Eng tez: Zarbdor +76 %, Bektemir +56 %, Qarshi tumani +53 %, Sharof Rashidov +51 %, Andijon tumani +50 %, Buxoro tumani +50 %, Guliston tumani +47 %. **Urbanistik o'qish:** eng tez o'sayotganlar — viloyat markazlarini o'rab turgan tumanlar (Qarshi, Andijon, Buxoro, Guliston, Sharof Rashidov/Jizzax, Karmana/Navoiy) — suburbanizatsiya, shahar chegarasidan tashqarida. Kamayganlar asosan chegara o'zgarishi (Zangiota −53 %, Xo'jayli −25 %, Shahrisabz −14 %: yangi tuman/shahar ajratilgan) — haqiqiy kamayish emas; chegara o'zgarishlari jadvali kerak.

## Keyingi
1. Moslashtirishdagi 6 holatni tuzatish (Namangan, Jizzax sh., Shirin, Yangi Toshkent, Qoraqalpog'iston poligoni).
2. Kalibrlangan 1 km rastr: har birlik × k → `uzb_aholi_2020_kal.tif`; 1980–2010 va prognoz uchun k qanday qo'llanishi (o'zgarmas k — faraz) alohida belgilanadi.
3. Chegara o'zgarishlarini hisobga olib dinamika (2010–2026 rasmiy) + suburbanizatsiya indikatori (markaz shahar ↔ atrof tuman o'sish farqi).
4. Sahifaga ulash (Kengayish rejimi: tuman xaritasi, k «model xatosi» qatlami, jadval).
