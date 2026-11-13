# Meʼyor band matnlari kutubxonasi

Agent «Maslahatchi» (`get_norm_clause`) band matnini shu yerdan soʻzma-soʻz oladi: `server/src/data/norms.json` → `GET /agent/clause?doc=&clause=`.

```
# lex.uz «Word» eksporti (.doc = HTML) → matn
python3 tools/normlib/html2txt.py "ShNQ 2.08.01-24.doc" tools/normlib/src/ShNQ-2.08.01-24.txt
# kutubxonani yigʻish
python3 tools/normlib/build_norms.py tools/normlib/src
```

| Hujjat | Manba | Qamrov |
|---|---|---|
| ShNQ 2.07.01-23 (joriy tahrir) | loyiha hujjati `claude/normalar-txt` | 692 band, 57 jadval, 6 ilova |
| SHNQ 2.05.07-24 (01/2-32 tahriri bilan) | `D:\Work\normalar` (lex.uz .doc) | 265 band (107 — kuchini yoʻqotgan), 2 ilova |
| SanQvaN 0103-25 | lex.uz .doc | 17 band, 4 ilova (1-ilova — obyektlar xavflilik sinflari) |
| ShNQ 2.07.06-24 | lex.uz .doc | 128 band, 13 ilova |
| ShNQ 2.08.01-24 (№ 376, 384, 398 oʻzgartirishlari bilan) | lex.uz .doc | 349 band (165 — kuchini yoʻqotgan), 9 ilova |
| SanQvaN 0102-25 | PDF matni (`_txt`) | 125 band, 10 ilova |
| ShNQ 2.08.02-23 | PDF matni (`_txt`), kirill | 903 band |
| VMQ № 1050 (26.12.2018) | lex.uz .doc, kirill | 56 band |
| OʻRQ-1149 (Shaharsozlik renovatsiyasi toʻgʻrisida) | lex.uz .doc | 61 modda |
| VM 101 (04.04.2011), 1-ilova | loyiha hujjati | 50-band |

Matn oʻzgartirilmaydi. PDF matnida qatorlar xatboshiga yigʻiladi (`unwrap`); jadvallar qator boʻyicha (`|` bilan).
Yangi hujjat: matnni `src/` ga qoʻying, `build_norms.py` dagi `DOCS` roʻyxatiga yozing, skriptni ishga tushiring, `server/test/normlib.test.js` ga uzluksizlik tekshiruvini qoʻshing.
