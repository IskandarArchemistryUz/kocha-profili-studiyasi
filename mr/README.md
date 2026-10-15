# Archemistry Lab · Master reja (yangi yadro)

Manba — shu papka; yigʻilgan natija — repozitoriy ildizidagi `app/` (GitHub Pages shu yerdan beradi).
Arxitektura va bosqichlar: «Archemistry Lab — yadro arxitekturasi va mahsulot strategiyasi» hujjati.

| Papka | Vazifasi |
| --- | --- |
| `src/core` | Loyiha hujjati (sxema, migratsiya), buyruqlar, undo/redo ombori, yagona geometriya, hosilaviy koʻrsatkichlar (aholi — bitta formula) |
| `src/norms` | Meʼyorlar dvigateli: har bir ShNQ bandi — manba + chegara + baholash |
| `src/storage` | Bitta IndexedDB (`archemistry-mr`), avtosaqlash, `.json` eksport/import |
| `src/scene` | Yagona three.js sahna; reja — shu sahnaning yuqoridan kamerasi |
| `src/workers` | Hisob yadrosi (Web Worker) |
| `src/ui` | Qobiq: qadamlar qatori, qadam paneli, koʻrsatkichlar paneli, dizayn tokenlari |

Qoidalar: hujjat faqat buyruq orqali oʻzgaradi; hosilalar hujjatga yozilmaydi; har bir yangi modul testi bilan keladi.

```
npm ci
npm test          # birlik testlari
npm run build     # tur tekshiruvi + ../app ga yigʻish
npm run e2e       # brauzer testlari (yigʻilgan ilova ustida)
```
Oʻzgarishdan keyin `npm run build` natijasi (`app/`) ham commit qilinadi — CI ikkalasi mosligini tekshiradi.
