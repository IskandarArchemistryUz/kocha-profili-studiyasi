# Joyshunos quvuri — Landsat yozgi sirt harorati

Joyshunos «Issiqlik oroli» qatlamining maʼlumoti shu skript bilan hisoblanadi va `lst-data` branchiga (`data/lst/`) qoʻyiladi. Ilova (`mr/src/joyshunos/heat.ts`) uni server nusxasi (`/data/file/lst/…`) yoki GitHub orqali oʻqiydi.

```
pip install -r tools/joyshunos/talablar.txt
python tools/joyshunos/landsat_yoz_harorat.py --yillar 2013-2026 --bbox 69.00,41.12,69.55,41.50
python -m pytest tools/joyshunos        # tarmoqsiz unit testlar (numpy + xarray)
```

- Manba: USGS Landsat 8/9 Collection 2 Level-2, ST_B10 (`lwir11`) + `qa_pixel`, Microsoft Planetary Computer STAC `landsat-c2-l2`, faqat T1, sahna bulutliligi < 60 %.
- Davr: har yil 1-iyun – 31-avgust, bulutsiz piksellar medianasi. Haqiqiy piksel ≈ 100 m (TIRS), hisob 30 m da (EPSG:32642).
- Chiqish: `natija/lst_yoz_<yil>.tif` (°C, COG), `_soni.tif` (kuzatuvlar soni), `.json` (sahnalar, statistika), `natija/web/<hudud>_<yil>.bin` + `<hudud>_index.json`.
- Web toʻr kodlashi: EPSG:4326, qadam 0,001°, uint16 LE = round((°C + 50) · 100), 0 = yoʻq, 0-qator — shimol.
- Standart bbox skriptda — 69.10–69.50 / 41.15–41.45. `lst-data` dagi fayllar **69.00–69.55 / 41.12–41.50** (550 × 380) bilan hisoblangan — `--bbox` ni shunday bering.

## Versiyalar
Bu — loyiha hujjatidagi asl skript (`claude/joyshunos-quvur/landsat_yoz_harorat.py`, 12.11.2026). 2013–2026 arxivi egasining kompyuteridagi `landsat_yoz_harorat_v2.py` bilan hisoblangan (`D:\Work\Claude_Archemistry_Lab\joyshunos-quvur`, ishga tushirish `ishga_tushir_arxiv.bat`, `talablar_v2.txt`). v2 va `.bat` hali repoda yoʻq — qoʻshilsa, shu papkaga.

## Har yili (oktyabr)
1. Yangi yilni hisoblash (`--yillar <yil>`, yuqoridagi bbox).
2. `natija/web/toshkent_<yil>.bin` va yangilangan `toshkent_index.json` → `lst-data` branchi, `data/lst/`.
3. Server nusxasi: repo ochiq boʻlsa 1 kunda oʻzi yangilanadi; yopiq boʻlsa — faylni serverdagi `server/files/lst/` ga qoʻlda qoʻyish.
