# HANDOFF — Yershunos'ni saytga chiqarish (25.11.2026)

Bu hujjat Lab reposi (IskandarArchemistryUz/kocha-profili-studiyasi) ulangan sessiya uchun yozilgan. 25.11 dagi chatda repoga ulanishni sessiyaning avtomatik xavfsizlik filtri to'xtatgan, shu sabab PR qilinmagan.

## Tayyor (25.11)
- **Yangi interfeys** — Lab qobig'i (Master reja kabi): yuqori panel (‹, Lab logotipi + «● Yershunos», hudud nomi, «KO'RGAZMALI» belgisi, 2D/3D, Kiber/Stilistik); chapda rejimlar relsi (Relyef · Toshqin · Jala · Iqlim · Kengayish · Hudud); yonida 340 px yig'iladigan panel, ichida akkordeonlar (sozlamalar → natija → «Qanday hisoblanadi»); o'ngda relyef balandligi va zoom; pastda o'ng tomonda rejimga mos ko'rsatkichlar qatori (MutationObserver bilan yangilanadi). Kiber = tungi tokenlar, Stilistik = kunduzgi. Brauzer checkbox va range'lari ds2 uslubida qayta chizilgan. Telefonda rels pastda, panel pastki varaq.
- Hisob mantiqi va barcha ID'lar o'zgarmagan; qo'shimcha: `rejim()` xarita yuklanmaguncha kutadi (`map.once('idle')`), bir xil rejimga qayta bosish panelni yig'adi.
- Manba: loyiha hujjati `claude/yershunos-src/index.html` (64 KB). Ishlayotgan nusxa — artifakt https://claude.ai/artifact/XcUMMPMnHP5hSgCCgBaQaW (slug f7e60c1e-0378-4b23-bbd3-c713f2c9ac3b, versiya 1795596700-12e1). Ma'lumot fayllari o'sha artifaktda (378 fayl, ~47 MB).
- Tekshiruv: Playwright + Chrome, 1440×860 va 390×844, 6 rejim, ikkala fon — JS xatosi yo'q.

## Saytga qo'yish qadamlari (bitta PR)
1. **Fayllar** → `mr/public/yershunos/` (Vite `emptyOutDir` sabab public ichida bo'lishi shart) → yig'ilgach `app/yershunos/`:
   - `index.html` (yuqoridagi manba), `lab-map.css`, JSON'lar, `toshqin_*`, `keng_*`, `jala/`, `hudud/`, `tiles/` (z8–11, 225 ta, 25 MB).
   - Artifakt fayllarini olish: `list_files` + `read_file paths` (32 ta / 4 MB chaqiruv) yoki Iskandarning `D:\Work\Claude_Archemistry_Lab\yershunos-chorvoq-havza\yershunos_tayllar_z8-11.zip` va `yershunos_sahifa_vektor.zip`.
   - **Hajm:** `funksional.geojson` (6,3 MB) va `vodiy_tubi.geojson` (6,5 MB) — koordinatalarni 5 xonagacha yaxlitlash (~1 m) va keraksiz xossalarni olib tashlash; maqsad ≤ 2 MB har biri. Raqamlar hisobdan, shakl faqat ko'rinish uchun.
   - Tayllar repoda 25 MB — maqbul emas bo'lsa, serverga (R2 / api.archemistry.uz) qo'yib, `TL` manzilini o'zgartirish (Joyshunos audit D bandi: raw.githubusercontent'ga tayanmaslik).
2. **Logotip:** `<span class="logo" data-lab-logo>A</span>` o'rniga Lab'ning asl logotipi (boshqa xizmat sahifalaridagi kabi). Qoida: faqat Master rejada «Archemistry Lab» yozuvi; Yershunos'da — faqat logotip + xizmat nomi.
3. **MapLibre:** hozir unpkg 4.7.1. Sayt boshqa sahifalarda o'z nusxasidan foydalansa — o'shanga ulash.
4. **Bosh sahifa «Xizmatlar»** (`index.html`, `narxlar.html`): Yershunos — rang #3ad1e8 (tungi) / #0f8aa0 (kunduzgi), havola `app/yershunos/`. Hover animatsiyasi ~1,6 s, faqat hover: relyef chiziqlari chiziladi → daryo bo'ylab muz moviy oqim → bitta magenta nuqta (xavf). `prefers-reduced-motion` — animatsiyasiz. Keshni yangilash: `min.css?v=...`.
5. **i18n:** tavsif en/ru — `js/home-i18n.js`; qolgan tillar — `js/i18n/*.json`. Sahifaning ichki matni hozir faqat o'zbekcha → keyingi PR (en, ru majburiy).
6. **E2E:** `mr/tests/e2e/sayt.spec.ts` ga Yershunos havolasi; sahifa ochilishi va 6 rejim tugmasi uchun oddiy test.
7. CI yashil → squash-merge → Pages deploy'ni tekshirish. Parallel chatlar bo'lsa — main bilan qayta birlashtirib, `app/` ni qayta yig'ish.

## Keyingi PR'lar (bittadan)
- Server: avtomat skrining zanjiri (`yershunos-zanjir`, `python -m yershunos.ishga --bbox W S E N --nom NOM`), bir vaqtda bitta hisob + navbat, tanga narxi maydon bo'yicha (masalan ≤ 500 km² — X, kattasi — 2X; narxni Iskandar beradi). Sahifadagi «Yangi hudud chizish» → API so'rov.
- Sputnik fon (server orqali, litsenziya tekshiruvi bilan).
- Tillar (en, ru), tungi/kunduzgi rejimni `mr-theme` bilan bog'lash.
