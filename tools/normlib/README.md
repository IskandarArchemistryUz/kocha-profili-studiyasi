# Meʼyor band matnlari kutubxonasi

Agent «Maslahatchi» (`get_norm_clause`) band matnini shu yerdan soʻzma-soʻz oladi: `server/src/data/norms.json` → `GET /agent/clause?doc=&clause=`.

```
python3 tools/normlib/build_norms.py tools/normlib/src
```

| Hujjat | Fayl | Qamrov |
|---|---|---|
| ShNQ 2.07.01-23 (joriy tahrir) | `ShNQ-2.07.01-23.txt` | toʻliq: 692 band, jadvallar, ilovalar |
| SHNQ 2.05.07-24 (01/2-32 tahriri bilan) | `SHNQ-2.05.07-24.txt` | qoidalarda keltirilgan bandlar: 9, 29, 34, 37, 41, 137, 164, 171, 171¹, 171², 180, 255, 1-ilova |
| SanQvaN 0103-25 | `SanQvaN-0103-25.txt` | 1–17-bandlar, 3-ilova (1-ilova — obyektlar roʻyxati — hali yoʻq) |
| VM 101-son qarori (04.04.2011), 1-ilova | `VM-101-2011.txt` | 50-band (kirill yozuvida, asl matn) |

Manba matnlar — loyiha hujjatlari `claude/normalar-txt/*.txt` (lex.uz). Jadvallar qator boʻyicha (`|` bilan) yozilgan — hujayra matni oʻzgartirilmagan.
Yangi hujjat qoʻshish: matnni `src/` ga qoʻying, `build_norms.py` dagi `DOCS` roʻyxatiga yozing, skriptni ishga tushiring.
