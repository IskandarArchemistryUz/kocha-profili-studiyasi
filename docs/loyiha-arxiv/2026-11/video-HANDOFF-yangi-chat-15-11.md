# HANDOFF — Archemistry Lab qisqa videolari: post jadvali va yangi uslub (15.11.2026)

Avval o'qi: `claude/reels-post-jadval.md` (matnlar, holat, usullar) va `claude/video-reels-quvur.md` (videolarni yozish/montaj quvuri).

## 1. Post jadvali — holat (15.11, 14:50)
- **YouTube (Archemistry Urban kanali):** HAMMASI TAYYOR. EN01–EN25 + EN22, EN24, EN28 — ikkala formatda (9x16 → Shorts, 16x9 → oddiy video), 12.11 → 3.12, har kuni 09:00 (GMT+5). Sarlavha «<hook> | Archemistry Lab», tavsif + https://archemistry.uz + 5 heshteg, «not made for kids».
- **Instagram + Facebook sahifa** (Meta Business Suite, «Archemistry Urban» FB sahifasi ↔ @archemistry_urban): 12.11 → 1.12 tayyor (20 ta Reels).
  - **QOLDI:** EN24 (2.12) va EN28 (3.12). MBS «Запланировать несколько публикаций» oynasi tayyorlab qo'yilgan (2 qator, matn + vaqt 09:00). Iskandar har qatorga `EN24_eye_level_9x16.mp4` va `EN28_heat_flood_9x16.mp4` ni qo'shishi, keyin tekshirib «Запланировать» bosiladi. Oldingi urinishda fayllar yuklanmay qolgan (bir sessiyada 10 ta videodan keyin Meta qabul qilmayapti — taxmin); qayta bo'lmasa, keyinroq urinish.
- **LinkedIn:** boshlanmagan (shaxsiy profil, 16x9 videolar).
- Videolar: `D:\Work\Archemistry Lab Test\tayyor` (9x16 + 16x9). Toza ekran yozuvlari: `D:\Work\Archemistry Lab Test\yozuvlar`.

## 2. Texnik usullar (Chrome orqali)
- Chrome kengaytmasi fayl yuklay olmaydi (3,8 MB limit) → Iskandar faylni o'zi tanlaydi; Claude «Select files»/«Добавить фото/видео» tugmasini bosib oynani ochib beradi.
- **MBS:** IDs — business_id 151216916184976, asset_id 1354117447795048. URL: `business.facebook.com/latest/bulk_post_composer/?asset_id=…&business_id=…`. «Массовая загрузка видео Reels» — faqat FB, ishlatilmaydi. Bir oynada ≤10 video. Matn klaviatura bilan yozilsa heshteg menyusi buzadi → `ClipboardEvent('paste')` bilan kiritiladi. Sana: date input'ni triple-click → `dd.mm.yyyy` → Tab; soat/minut — `input[aria-label="часы"/"минуты"]` focus + type; «Обновить». Har qator koordinatasi JS bilan olinib keyin bosiladi.
- **YouTube Studio:** Chrome'da shaxsiy kanal ochiq bo'lishi mumkin → avatar → «Сменить аккаунт» → Archemistry Urban. Edit draft → `#title-textarea #textbox`/`#description-textarea #textbox` (execCommand insertText) → `[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]` → `#step-badge-3` → `#second-container-expand-button` → sana: datepicker'ni bosish, Ctrl+A, «Nov 19, 2026», Enter → vaqt: inputni bosib ro'yxatdan «9:00 AM» elementini JS bilan click (Enter bilan yozish ishonchsiz) → Schedule → «Video scheduled» tekshiruvi. Ba'zan «checks» banneri maydonlarni pastga suradi — koordinatani qayta o'lchash.

## 3. Yangi uslub (asosiy keyingi ish)
- Iskandar: eski videolar effektsiz. **Jadvaldagilar o'z holicha qoladi, yangi videolar zamonaviy motion-grafika bilan qilinadi.**
- 4 ta namuna yuborildi (7–8 s, 9:16): **A** tez montaj + kinetik matn (ritmga kesish, oq flash, punch-in, slam-so'zlar, raqam sanash, glitch); **B** kinematografik (sekin 3D push, kino grade, vinyetka, grain, light leak, letterbox, keng harf oralig'i); **C** explainer (1-2-3 qadam chiplari, chiziladigan halqa/strelka, oldin/keyin pardasi, split-screen, natija bar-kartasi); **D** aralash (hook → kino → infografika).
- **Namuna videolar:** egasining kompyuterida `D:\Work\Archemistry Lab Test\yozuvlar\uslub-namunalar\` (A_tez_montaj.mp4, B_kinematografik.mp4, C_explainer.mp4, D_aralash.mp4). `yozuvlar` papkasini device_request_folder_access bilan so'rab, device_stage_files bilan oling.
- **Kod (loyihada):** `claude/video-uslub-src/` — `fx.py` (yordamchilar: kadr, zoom, matn, effektlar, ovoz sintezi, render), `a_tez.py`, `b_kino.py`, `c_explainer.py`, `d_aralash.py`. Ishga tushirish: manba yozuvlarni `/home/claude/sty/src/<nom>/%04d.jpg` ga 1080x1920 qilib chiqarish (ffmpeg: `fps=30,crop=683:1214:X:0,scale=1080:1920`; manbalar: orbit=alab_06_hero_orbit (cx 0.45), gen=alab_05_generatsiya (0.55), bcn=alab_en04_bcn_gen (0.50), sun=alab_en02_s6_sun (0.55), spz=alab_en06_spz (0.33)), shriftlar `/usr/share/fonts/opentype/inter/InterDisplay-*.otf`, keyin `python3 a_tez.py` → `/home/claude/sty/out/`. Ovoz sintez — haqiqiy videoda litsenziyali musiqa/SFX kerak. Mavjud skill'lar: it-reelsmaker, motion-reel, tweenkit:kinetic-cut-video, remotion.
- **Kutilmoqda:** Iskandar qaysi uslubni tanlashi + 3–5 referens video (manbasi bilan).
- Keyingi videolar: EN29 (Ko'chasoz, ko'cha kesimi), EN30 (kelgan master rejani tekshirish) — to'siqsiz. EN10, EN16, EN17, EN18, EN26 (tanga ruxsati kerak), EN27 — Lab xatolari tuzatilishini kutadi (`claude/topshiriq-video-xatolar-11-11.md`). Keyin U1–U24 (o'zbekcha, ShNQ).
- Qoida: xalqaro videolarda shahar nomi va xorij uchun me'yoriy da'vo yo'q; narx ko'rsatilmaydi; egasi bilan muloqot o'zbekcha.
