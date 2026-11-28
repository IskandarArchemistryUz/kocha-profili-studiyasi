# Bogʻshunos: yangi chatga oʻtish (14.11.2026, yangilangan 22:20)

## Talab (Iskandar)
- 19:28 — Python-albom qabul qilinmadi. Haqiqiy mahsulot kerak:
  - foydalanuvchi bosqichlarni oʻtadi;
  - albom **Bogʻshunosning oʻz Varaqlarida** yigʻiladi (Koʻchasoz `js/ks-albom.js` kabi), PDF bilan;
  - **Chizmadonga ulanmaydi** (21:04).
- 21:16 — «hammasini tayyorla: qirgʻoq tipologiyalari, kesimlar, ekish, fasllar, fauna, muhandislik tarmoqlari, narx, muqova renderi — mantiqlari, texnologiyasi, qoʻllanmalari; interfeysidan boshlab butunlay».

### Doimiy qoidalar
- Reyestrdan `volunteer_id`, `dendrologist_id` olinmaydi.
- Atributsiya: «Toshkent shahri daraxtlar reyestri — green.tashkent.uz (Zamin fondi, Ekologiya vazirligi, Toshkent shahar hokimligi)».
- Chegara doim qizil.
- Raqamlar faqat manbadan, N/P/A/T teglari bilan. Maʼlumotsiz varaq yoʻq.
- Chizmadon va `editor.ts` ga tegilmaydi.
- Faqat lokal `bogshunos-albom` tarmogʻi; push/deploy yoʻq.
- Javob oʻzbekcha.

## Kodni tiklash
Repo `iskandararchemistryuz/kocha-profili-studiyasi` → `mr/`: `npm ci`, keyin `git checkout -b bogshunos-albom`.

**Manba fayllari:**
- `claude/bogshunos-src/ts/*.ts` → `mr/src/bogshunos/`: types, grid, load, species, analyze, design, raw, od, albom, kesim, planting, assort, symbols, main, worker, geojson, pick, **fauna, nets, cost** + `bg.css`.
- `mr/bogshunos.html` = joyshunos.html nusxasi (`bg-body`, `id="bg"`, `/src/bogshunos/main.ts`).
- `vite.config.ts` input: `bogshunos: 'bogshunos.html'`.

**Server:**
- `claude/bogshunos-src/server-trees-routes.js` → `server/src/data/routes.js` (`/data/trees`).
- `sources.js` ga `trees` manbasi qoʻshiladi.
- Test: `server/test/trees.test.js`.

**Testlar** (`mr/tests/unit/bogshunos/`):
- bobur (`run.test.ts`), albom (20 varaq), planting, ui-pipeline (worker `modul` xabari, TU va narx bilan).
- Fixture: Downloads dagi `bogshunos_sinov_bobur.json`, `bg_kol_rel.json`, `bg_pop_cells.json` → `fromRaw` → `/home/claude/bgtest/bobur.json`.

**Lokal commitlar:**
- 2d7664f5
- eb38eefe (Chizmadon qaytarildi)
- 8e4efa4e
- 5572a68c (sahifa)
- 5ca4a382 (ekish)
- df658a8f (kesim)
- **74e9d3c5** (fauna, tarmoqlar, smeta, UI modullari, muqova, 20 varaq)

`vite build` toʻgʻri ishlaydi. U `app/` papkasini qayta yozadi — keyin `git checkout -- app && git clean -fdq app`.

## Holat (hammasi bajarildi)

### 1. Sahifa — 7 bosqich
Hudud → Maʼlumot → Tahlil → Dastur → Variantlar → **Loyiha** → Varaqlar.

«Loyiha» bosqichida 5 modul bor, hammasi ishlaydi:
- **Ekish**.
- **Kesimlar**: kesimlar jadvali va qirgʻoq tipologiyalari.
- **Fauna**: muhitlar, H′/J, sokin hudud, uya qutilari, ozuqa kalendari, guruhlar.
- **Tarmoqlar**:
  - TU kiritiladi: tur, quvvat, «Nuqta qoʻyish» → xaritani bosish;
  - trassa, yoritish, yuklama va isteʼmolchilar koʻrsatiladi.
- **Narx**: narx kitobi tahrirlanadi (narx + manba), jami darhol qayta hisoblanadi.

Xaritada `bg-mod` qatlami bor (fill/line/circle, rang `c` xossasidan).

Worker xabarlari: `analyze`, `design`, `plant`, `modul`, `albom` (`tu` va `prices` bilan).

### 2. Fauna (`fauna.ts`)
- 7 muhit; Shennon indeksi.
- Sokin hudud: ≥ 30 m (T); ≥ 100 m — Dertien 2021 (A).
- Uya qutilari: dbh ≥ 40 sm daraxtlarda.
- Fenologiya kalendari; 7 guruh.
- Manbalar: Ganiev 2024, Bykova 2022, podrobno.uz.

Bobur natijasi:

| Koʻrsatkich | Qiymat |
|---|---|
| H′ / J | 1,60 / 0,89 |
| Sokin hudud | 2 799 m² |
| Uya qutilari (qush + koʻrshapalak) | 24 + 6 |
| Yumshoq qirgʻoq | 72 % |

### 3. Tarmoqlar (`nets.ts`)
- Trassa: Dijkstra, 3 m toʻrda.
- Masofalar: 35-jadval (daraxt) va 8-jadval (bino).
- Yoritish normasi: SNiP 23-05-95 (A).
- TU yoʻq boʻlsa — ulanish taxminiy (P).

Bobur natijasi: elektr 27,2 kVt; yomgʻir bogʻlari qamrovi 94 %.

### 4. Smeta (`cost.ts`)
- Narx kitobida 32 band. Faqat maysa va oʻtloq narxi bor (prom.uz, P).
- Bruschatka narxi diapazon sifatida (olx.uz); koʻchat narxi yoʻq.
- Narxsiz band «—»; jami «toʻliq emas» deb qizil belgilanadi.

### 5. Albom — 20 varaq
1. titul (illyustrativ render)
2. umumiy
3. atrof
4. joy
5. cheklov
6. dastur
7. variantlar
8. zonalar
9. bosh reja
10. saqlash
11. ekish
12. fasllar
13. kesimlar
14. qirgʻoq
15. **fauna**
16. suv
17. **tarmoqlar**
18. TIK
19. **smeta**
20. normalar

### 6. Qoʻllanma
`claude/bogshunos-qollanma-14-11.md`.

## Qolgan ishlar
- UI haqiqiy brauzerda sinalmagan.
- Topo-syomka (DXF) importi va mavjud tarmoqlar syomkasi importi.
- 94 ta park referensi (`D:\Work\Claude_Archemistry_Lab\park masterplan`) tahlili.
- Koʻchat va qoplama narxlari — pitomnik va pudratchi takliflari bilan toʻldirilsin.
- Yoritilganlik meʼyori KMK 2.01.05 bilan solishtirilsin.
