# Landsat yozgi sirt harorati — Joyshunos uchun ixcham to'rlar

Faqat ma'lumot branchi (sayt kodi yo'q). Joyshunos `mr/src/joyshunos/heat.ts` bu yerdan o'qiydi:
`https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/lst-data/data/lst/<hudud>_index.json`

- Quvur: `landsat_yoz_harorat.py` (Archemistry Lab loyihasi, `claude/joyshunos-quvur/`), chiqishi `natija/web/`.
- Kodlash: uint16 LE, `(°C + 50) * 100`, 0 = ma'lumot yo'q; 0-qator — shimol; qadam 0.001°. Hudud: 69.00–69.55 E, 41.12–41.50 N (550×380). Yillar: 2013–2026.
- Manba: USGS Landsat 8/9 Collection 2 Level-2 ST_B10, Microsoft Planetary Computer. Iyun–avgust medianasi, haqiqiy piksel 100 m.
- Yangi yil qo'shish: `.bin` faylini va yangilangan `<hudud>_index.json` ni shu papkaga commit qiling.
