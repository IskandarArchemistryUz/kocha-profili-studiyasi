# Topshiriq: tugma va varaqlarda matn sigʻmaydi / vertikal turib qoladi (14.11)

> **HOLAT: BAJARILDI (14.11).** Hammasini bitta chat tuzatdi va merge qildi — boshqa chatlar qayta qilmasin:
> - #628 — Joyshunos sarlavhasi (xizmatlar menyusi va Xarita/Akson. ustma-ust)
> - #634 — Master reja: Varaqlar oynasi (1-band), Varaq ramkasi (2), Quyosh KPI (3)
> - #635 — Koʻchasoz: Albom varagʻi asboblar qatori (4), kesim lentasi (5) va kesim kartasi sarlavhasidagi «Kesim · Reja · Aksonometriya» segmenti
> - #636 — Chizmadon sarlavhasi (6): sabab format segmenti ~450 px egallab, belgili «Bitta varaq / Hamma varaqlar» tugmalarini 18 px ga siqqani edi
> Quyidagi matn — dastlabki audit (tarix uchun).

Manba: foydalanuvchi noutbuk va planshetdan kirganda «koʻp joyda tekstlar tugmalar ichiga sigʻmayapti va vertikaliga joylashib qolyapti», «varaqdayam vertikal turib qolgan tekstlar bor».
Tekshiruv: Playwright, 1280×720 va 1024×768, namuna loyiha (`#/namuna`), app/ = main 55cf22a.

---

## 1. Master reja — «Varaqlar» oynasi (Taqdimot → Grafika → Varaqni ochish)
Fayl: `mr/src/ui/sheets.ts` (`openGraphics`), `mr/src/ui/style.css`.
1. Namuna kartalari (2 ustun) — tavsif soʻzma-soʻz ustun (1024 da 5–7 qator). → ≤1366 px 2 qatorgacha, ≤1180 px yashirin, toʻliq matn `title` da.
2. «Reja · Qavatlar · Shaxmatka · Aksonometriya» 3+1 boʻlib tushardi. → 2×2.
3. «Chizmadonga» tugmasi panel chetidan chiqardi. → `min-width:0`, ixcham padding.
4. MR-01 ogohlantirish belgisi yozuvni yopardi. → burchakka.

## 2. Master reja — «Varaq ramkasi» paneli
Fayl: `mr/src/ui/editor.ts` (`startFrame`, `#frKind`).
- Nomlar soʻz oʻrtasidan uzilardi («Avtoturargohl / ar»). → `overflow-wrap:normal`, 11,5 px; «Varaqni ochish» tugmasi sigʻadi.

## 3. Master reja — 6-qadam «Quyosh», shamol KPI
- «shimoli-sharq–sharq» 79 px da 3 qator. → yoʻnalish KPI alohida toʻliq qatorda.

## 4. Koʻchasoz — «Albom varagʻi» (`kochasoz.html#/varaq`)
- Shablon chiplari «Rangli / Chizma» ustiga tushardi. → chiplar qatori aylanadi (oʻngda xiralashish), qolganlari `flex:none`; ≤1366 px izoh qatori, ≤1100 px «Render studiyasiga» yashirin.

## 5. Koʻchasoz — kesim lentasi (B, `.blk`)
- Tor boʻlakda nom «B…» boʻlib kesilardi. → container query: < 46 px nom yashirin, < 24 px belgi ham, < 12 px en ham; toʻliq nom va en — `title` da.

## 6. Chizmadon — sarlavha
- «Bitta varaq» / «Hamma varaqlar» (belgili) 18×28 px, «Kataklar» / «Panellar» 22 px. → `#chFmt` ustunlari max-content, `#chView` 2×36 px, tugmalar kamida 36 px.

---

### Umumiy qoida (keyingi ishlar uchun)
- `.seg button` va `.btn` da `white-space:nowrap` bor — tugma eni yetmasa matn chiqib ketadi yoki siqiladi. Tor joyda: (a) qisqa yorliq + `title`; (b) `flex-wrap` bilan 2 qator; (c) belgi; (d) gorizontal aylanuvchi qator. Soʻz oʻrtasidan uzish (`word-break:break-all/anywhere`) — yoʻq.
- `.seg` grid boʻlgani uchun `flex:none` bilan birga `grid-auto-columns:max-content` bermasa, segment juda keng boʻlib, qoʻshnilarini siqadi.
- `tr('Akso')` lugʻatda avtomatik «Aksonometriya» ga kengayadi (`i18n/index.ts`) — qisqa yorliq uchun `'Akson.'` kaliti bor.
- Tekshirish: 1440 / 1280 / 1024 / 820 px. Matn elementi 3+ qator va har qatorda < 7 belgi boʻlsa — xato.
