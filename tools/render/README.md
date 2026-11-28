# Render — lokal skriptlar

Tizim personajlari varaqlarini fal orqali yasash. Natija (WebP) — `mr/public/personajlar/` (39 varaq, #733).
Holat va ochiq qarorlar: loyiha hujjati `claude/render-holat.md`.

| Fayl | Nima qiladi | Model |
|---|---|---|
| `persona_sheets.mjs` | 13 personajning asl (bahor/kuz) varagʻi, 2048×1024, 4 rakurs | `openai/gpt-image-2` |
| `persona_fasl.mjs` | `<id>.png` dan `<id>_yoz.png`, `<id>_qish.png` | `openai/gpt-image-2/edit` |

```bash
# kalit faqat muhit oʻzgaruvchisida — repoga ham, chatga ham emas
FAL_KEY=... node tools/render/persona_sheets.mjs ./personajlar          # hammasi
FAL_KEY=... node tools/render/persona_sheets.mjs ./personajlar erkak ayol
FAL_KEY=... node tools/render/persona_fasl.mjs ./personajlar             # bor fasl fayllari oʻtkazib yuboriladi
```

- Node 18+. fal kaliti «All models» boʻlishi kerak (standart MODELS (6) da gpt-image-2 yoʻq → 403).
- `persona_sheets.mjs` dagi `image_size` / `quality` parametr nomlari fal `llms.txt` bilan tekshirilmagan.
- Egasining lokal papkasi: `D:\Work\Archemistry Lab Test\personajlar\` (asl PNG, `web\` — WebP, `eski\`), ishga tushirish `ishga_tushir*.bat`.
