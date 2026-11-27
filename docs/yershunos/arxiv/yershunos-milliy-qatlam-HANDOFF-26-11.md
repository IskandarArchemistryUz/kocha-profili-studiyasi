# Yershunos · milliy qatlam va PDF hisobotni saytga chiqarish — HANDOFF (26.11.2026)

**Kim uchun:** `IskandarArchemistryUz/kocha-profili-studiyasi` repo ulangan sessiya. Bu sessiyada repo ulanmaydi (ruxsat rad etildi), shuning uchun bugungi ish faqat artefaktda.

## Holat
- Jonli sahifa `archemistry.uz/app/yershunos/` (78 KB) — bugungi ishning **hech biri yo'q** (`uzClim`, `uzb_birliklar` 0 marta).
- Artefakt (https://claude.ai/artifact/XcUMMPMnHP5hSgCCgBaQaW, versiya `1795710685-0b20`) — 25.11 dagi ESKI asosda. Jonli sahifa undan yangiroq (global DEM `ysdem`, "istalgan hudud" `hbHisob`, Nominatim). **Artefakt faylini sayt fayli ustiga yozib bo'lmaydi** — faqat quyidagi bloklar ko'chiriladi.
- Deploy: `sayt.yml` (PR #788) — `main` ga push → Pages. Qarang: `claude/sayt-actions-deploy-holat-26-11.md`.

## Manbalar (loyihada)
- `claude/yershunos-src/index-artefakt-26-11.html` — artefaktning to'liq sahifasi (manba sifatida).
- `claude/yershunos-src/uzb_birliklar.geojson` — 197 birlik, ~640 KB. Sayt papkasiga `app/yershunos/uzb_birliklar.geojson` (yoki manba papkasi — repo tuzilishiga qarab).
- `claude/yershunos-src/hisobot.js` — PDF hisobot moduli (alohida o'qish uchun; sahifaga ichki joylangan).
- Ma'lumot yasash zanjiri: `claude/yershunos-src/kal/{kalibr2,iqlim_birlik,yer_birlik,su_birlik,zaif_birlik,birlik}.py`.

## Ko'chiriladigan bloklar (artefakt faylidagi qatorlar, 26.11 holati)
1. **CSS** `.uzx`, `.uzcmp`, `#uzw…` (≈130–147-qatorlar) va `/* ===== Hisobot (A4, chop etish) ===== */` bloki (≈205-qatordan `</style>` gacha).
2. **HTML** — panelda `<details class="acc">…O'zbekiston: tumanlar kesimi…</details>` (≈442–467) va tanadagi `<div id="uzw">` (jadval qoplamasi, ≈207-qator atrofida).
3. **JS** — `// ---------- O'zbekiston: tumanlar kesimi` dan `// ===== Lab qobig'i` gacha (≈708–923): `UZ` yuklash, `uzExpr`, `UZM` (o, z, k, h, t, q, x, ey, eg, sv, sw, zi, zs, zk, zh, r), `uzClim` (reyting), `uzDraw`, `uzPick`, `uzTab`, CSV.
4. **JS** — `// ===== Hisobot: …` bloki (≈945-qatordan oxirigacha, `// logotip` izohidan oldin).
5. `kpi()` dagi `keng:` qatori — `uzK` nomlari ro'yxati (sv, sw, zi, zs, zk, zh).
6. Sarlavha belgisi: `KO'RGAZMALI` → `SKRINING` (title o'sha). "istalgan hudud" natijasidagi `· KO'RGAZMALI` → `· DASTLABKI BAHO`.

## Bog'liqliklar va xavflar
- `uzVis` xaritaning `maxBounds`/`minZoom` ini o'zgartiradi — yangi sahifadagi global DEM rejimi bilan to'qnashmasligini tekshirish.
- Hisobot `#hb` ni `body` ning to'g'ridan-to'g'ri bolasi qiladi; `@media print` `body>*:not(#hb)` ni yashiradi. Yangi sahifada `body` ostida boshqa qatlam bo'lsa ham ishlaydi.
- Hisobot logotipida `data-lab-logo` bor — sayt nusxasidagi logotip almashtiruvchi skript uni ham almashtiradi (tekshirish).
- Nomlar tekshirildi (26.11): jonli sahifada `hb` prefiksli faqat `hbHisob` bor, `id="hb…"` yo'q — hisobot moduli (`hbQur`, `hbF`, `HBS`, `#hb`, `#hbd` …) to'qnashmaydi. `hbHisob` ni o'zgartirmang.
- CSV tugmasi artefakt ko'rgichida ishlamaydi, saytda ishlaydi.

## Qabul tekshiruvi (Playwright, `tests-e2e`)
- "Kengayish" → "Tumanlar qatlami" yoqiladi → 197 poligon, xato 0.
- "Hisobot" → Tuman / Viloyat / Respublika: har bir `.pg` da oxirgi blok pastki kolontituldan yuqorida (toshish yo'q). Artefaktda sinalgan: respublika 11 bet, Jizzax 5, Toshkent vil. 6, Toshkent sh. 5, Qoraqalpog'iston 6, Baxmal 3, Zomin 3.
- `page.pdf({format:'A4', printBackground:true, preferCSSPageSize:true})` — A4, ranglar saqlanadi.
- Mavjud test "Yershunos · istalgan hudud" (sayt.spec.ts:233) buzilmaganini tekshirish.
