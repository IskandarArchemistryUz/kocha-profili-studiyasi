# Egasi paneli tahlilidan tuzatishlar (16.11.2026)

Asos: egasi panelining 30 kunlik skrinshotlari (voronka, xatolar, qurilma, manba).

## Bajarildi — saytda (16.11, ~18:15 tekshirildi)
- **PR #695**: 3D boshqaruvidagi (`OrbitControls`) sensorli yoki aralash kiritish xatosi (`reading 'x'` / Safari `t.x`, 47 marta). `mr/src/scene/orbit.ts` → `SafeOrbitControls` (Master reja, Joyshunos axo, transport). Test: `tests/unit/orbit_safe.test.ts`.
- **PR #696**: ro'yxatdan o'tish sovg'asi, **15 tanga** bir marta (ledger reason `signup`, env `SIGNUP_BONUS`). API `/prices` → `signupBonus: 15`.
- **PR #697**: kirish 6-qadamdan. `FREE_STEPS` = hudud, uchastka, kocha, parsel, yashil, hajm. Server amallari (variant taklif, og'ir hisob, toza fayl, bulut, Chizmadon, agent) o'z `ensureLogin` bilan. Egasi tasdiqladi (16.11).
- **PR #698**: UTM. `js/site.js` (v=14) sessiyaga yozadi (`kps_utm`), `mr/src/core/stats.ts` o'qiydi.
- **PR #699** (16.11, ~19:20): sovg'a xabarlari + eski hisoblarga sovg'a. Egasi qarori: mavjud hisoblarga ham 15 tanga, foydalanuvchiga xabar bo'lib ko'rinsin.
  - Server: `users.notice_seen`; `/me` → `notices` (ledger dagi ko'rilmagan `signup`/`promo`, izohsiz); `POST /me/notices/seen`; `POST /owner/gift-signup` (egasidan tashqari hamma hisobga bir marta). Kod: `server/src/notices.js`.
  - Ilova: `mr/src/account/notices.ts` — kirganda pastki o'ngda karta «Sizga N tanga sovg'a!» + «Rahmat», hamma xizmatlarda. Egasi panelida, «Sinov kirishi» ostida «Eski hisoblarga sovg'a» tugmasi (ikki bosqichli).
  - Avvalgi sinov kirishlari (Francois, mbc.uz) ham bir marta xabar bo'lib chiqadi.
  - **Egasi qilishi kerak:** Panel → «Eski hisoblarga sovg'a» → «Tasdiqlash».

UTM havola: `https://archemistry.uz/?utm_source=telegram&utm_medium=post&utm_campaign=<mavzu_sana>` (youtube / linkedin / instagram).

## Navbatda
1. **Davlat ma'lumoti yo'q.** Sabab: `archemistry.uz` (GitHub Pages) va `api.archemistry.uz` (VPS 46.8.195.239) Cloudflare orqali o'tmaydi, `CF-IPCountry` sarlavhasi kelmaydi. Variantlar: (a) DNS'ni Cloudflare'ga o'tkazib, API'ni proxy qilish (egasi qiladi); (b) serverda bepul DB-IP Lite bazasi (mmdb, CC BY 4.0) bilan IP→davlat, IP saqlanmaydi. Egasi tanlashi kerak.
2. `calc/area` hodisasini siqish (709 hodisa / 16 brauzer).
3. Tanishtiruv turidagi eskirgan matnlar («1-qadam kirishsiz», «haftada 1 tasi sovg'a»): endi 1–5-qadamlar ochiq va haftada 3 ta. 10 tilda yangilash kerak.
4. Panel: voronkadagi «pullik harakat» (13.11 dan) va «pullik loyihalar» (butun baza) ta'riflarini ajratish; sinov kirishlariga «sarflangan / qolgan» ustuni.
5. Panel voronkasi endi boshqacha: «Hisobga kirdi» qadami 6-qadamdan yoki birinchi server amalidan keyin keladi. 16.11 dan oldingi va keyingi raqamlarni taqqoslaganda shuni hisobga olish kerak.
6. Sovg'a xabari hozircha faqat Lab ilovasi sahifalarida (`/app/…`) chiqadi, bosh sahifada emas.
