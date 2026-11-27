# Sayt: Binokor va Bogʻshunos — bosh sahifa xizmatlari (PR #683, 14.11.2026)

Birlashtirildi (squash, commit c948584). GitHub Pages deploy muvaffaqiyatli o'tdi. Tekshiruvlar: `test` va `e2e` 1–4 — hammasi yashil.

## O'zgarishlar
- `index.html`, `narxlar.html` — «Xizmatlar» ro'yxati:
  - **Binokor** — anor `#c2416b`, havola `app/binokor.html`;
  - **Bogʻshunos** — yashil `#4f8a3a`; `span.d.bg`, havolasiz, «tez kunda» (sahifasi hali yo'q).
  - Tartib: Koʻchasoz, Joyshunos, Binokor, Bogʻshunos, Chizmadon, Dizayn-kod, Render.
- `css/min.css` — xizmatga xos animatsiyalar, faqat hover, ~1,6 s:
  - **Binokor:** o'qlar → devor pastdan ko'tariladi (scaleY) → yuqori hajm → derazalar;
  - **Bogʻshunos:** chegara va yo'laklar chiziladi → 7 ta daraxt birin-ketin o'sadi;
  - `prefers-reduced-motion` — animatsiyasiz;
  - kesh: `min.css?v=20261114b` (5 sahifa).
- **Binokor saytda:** `mr/public/binokor.html` (manba) → `app/binokor.html`. Vite `emptyOutDir` bo'lgani uchun fayl `mr/public` da turishi shart.
  - Sayt nusxasi `/home/claude/bk/site_variant.py` bilan artifaktdan olinadi: `claude.use` bo'lmasa yuklab olish Blob + `<a download>` orqali; title/description saytga moslangan.
- **i18n:**
  - tavsiflar: en/ru — `js/home-i18n.js`; uk, fr, tr, kk, pt, az, es — `js/i18n/*.json`;
  - xizmat nomlari (Binokor, Bogʻshunos) hozircha tarjima qilinmagan (brend sifatida). Boshqa xizmatlar nomi lokallashtirilgan (`js/site.js` BRAND, `js/eko.js` NM, `mr/src/i18n/index.ts`) — kerak bo'lsa uchala joyga qo'shish kerak.
- **E2E:** `mr/tests/e2e/sayt.spec.ts` — xizmatlar havolalari va inglizcha nomlar ro'yxati yangilandi; Bogʻshunos uchun `aria-disabled` tekshiruvi qo'shildi.

## Ochiq
- Inglizcha sahifada «Xizmatlar» sarlavhasi «Amenities» deb chiqadi. Bu eski lug'at kaliti (15 daqiqalik shahar kontekstidan) — tegilmadi.
- Bogʻshunos sahifasi tayyor bo'lgach: `span.d.bg` → `<a class="d bg" href="...">` qilish va E2E ni yangilash kerak.
- Binokor yangilansa: `site_variant.py` → `mr/public/binokor.html` va `app/binokor.html` ikkalasini ham yangilash kerak.
