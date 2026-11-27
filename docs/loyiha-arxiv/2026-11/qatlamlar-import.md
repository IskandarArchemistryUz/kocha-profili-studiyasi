# Mening qatlamlarim — import, chegaralar, yerdan foydalanish (TZ va holat)

Sana: 2026-10-19. Birinchi sinov hududi — Qorashina shaharchasi (Dehqonobod t.).

## Maʼlumot (Qorashina)
- Papka: `D:\OneDrive\Work\54_ADB_Group_Huit\04_working_files\Qorashina\20261009_Archicad_base\_archemistry_lab_export\`
- Archicad modeli mahalliy koordinatada: mahalliy = UTM 42N − (286000, 4246000), burilishsiz (`_scripts\qor_ac_base.py`).
- Fayllar (WGS84 GeoJSON):
  - `QOR_buildings_archicad_WGS84.geojson` — 12 077 bino (Tapir skripti `_scripts\QOR_export_archemistry_lab.py`, Archicad ochiq holda): guid, floors, height_m, base_m, landuse (QOR_MASS_EX_<kod>), mahalla, area_m2. 1 qavat 10 408, 2 qavat 1 669. Microsoft konturlari bilan siljish 0 m.
  - `QOR_mahalla_boundaries_WGS84.geojson` — 14 mahalla (3 ta nomsiz boʻlak 0,7 / 6,25 / 0,39 ga olib tashlangan).
  - `QOR_settlement_boundary_WGS84.geojson` — aholi punkti chegarasi (13 boʻlak).
  - `QOR_landuse_cadastre_WGS84.geojson` — 2 517 kadastr uchastkasi (Land_Use).
  - `QOR_roads_WGS84.geojson` — 571 yoʻl chizigʻi (toifa).
- Ochiq maʼlumot boʻshligʻi: binolarning 76 % (9 245) hech qaysi kadastr uchastkasiga tushmaydi → «Aniqlanmagan» (NOP).
- Xoʻjamahmud, Yangiobod, Yashnobod ichida bino yoʻq (binolar olingan hududdan tashqarida). Ayridevol (1 768 ga) va Oʻzbekiston (2 720 ga) qishloq xoʻjaligi yerlarini ham oʻz ichiga oladi — zichlik aholi punkti ichidagi qismi boʻyicha.

## TZ (kelishilgan bandlar)
1. Import: GeoJSON (keyin KML/KMZ, SHP.zip, DXF). Koordinata tizimi: WGS84, UTM 41N/42N (Pulkovo-42 — keyin). Qatlam turi: binolar / chegaralar / yerdan foydalanish / chiziqlar. Maydonlarni tanlash: toifa, nom, balandlik, qavatlar. OSM bilan dublikat — foydalanuvchi binosi ustun.
   - 1.3 Tayanch nuqtalar boʻyicha bogʻlash (affin) — oxirga surilgan (Qorashina uchun kerak emas).
   - 1.7 Har import — alohida qatlam; toifalar boʻyicha yoqish/oʻchirish; holat loyiha bilan saqlanadi va Chizmadonga shu holatda uzatiladi.
2. Chegaralar: aholi punkti → MFY → Daha. Asboblar: import, chiziq bilan boʻlish, umumiy chegara (topologiya), yopishish, tugunlarni tahrirlash. Mahalla koʻrsatkichlari: toʻliq maydon va aholi punkti ichidagi qismi (zichlik shu boʻyicha), 10 ga dan kichik nomsiz poligon — «boʻlak», ichida bino boʻlmasa — «maʼlumot yoʻq».
3. «Yerdan foydalanish» uslubi: funksional zonalar (aniq roʻyxat — ShNQ matnidan tekshiriladi), uch koʻrinish (uchastkalar / binolar / ikkalasi), legenda Chizmadonga.
4. Katta hudud: Bepul ≤ 2 km² / 2 000 obyekt, Pro ≤ 25 km² / 20 000, Max ≤ 150 km² (server plitkalari). Raqamlar foydalanish statistikasidan keyin aniqlashtiriladi.
5. Chizmadon: «Land use rejasi», «Mahallalar chegarasi va koʻrsatkichlari», «Mavjud holat» varaqlari; mahallalar jadvali; legenda va chegara uslublari.
6. Xato: «Aholi yosh tarkibi» loyiha markaziga qarab avtomatik tanlanmaydi (Qorashina uchun «Toshkent shahri» chiqadi).

## Holat
- 1-bosqich (branch `qatlamlar-import`, kod: `mr/src/core/userlayers.ts`, `mr/src/scene/userlayers3d.ts`, `mr/src/ui/userlayersui.ts`): GeoJSON import (WGS84/UTM 41-42N), turni va maydonlarni taxmin qilish, toifa ranglari va yoqish/oʻchirish, shaffoflik, chegara nomlari, mahalla koʻrsatkichlari jadvali (aholi punkti ichidagi maydon bilan), OSM dublikatlarini yashirish, katta hudud ogohlantirishi (hali bloklamaydi — obuna server bosqichida), boʻsh loyiha markazini qatlamga koʻchirish, loyiha fayli qatlamlarni olib yuradi. Obyektlar IndexedDB `assets` da, hujjatda faqat tavsif.
- Qolgani: 2-band asboblari (boʻlish, topologiya, tahrirlash), 3-band uch koʻrinish va ShNQ zonalari, 5-band (Chizmadon varaqlari), 6-band, KML/SHP/DXF import, 1.3.
