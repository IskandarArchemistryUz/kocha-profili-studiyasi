# Yershunos — sayt holati (27.11.2026)

## PR #791 — birlashtirildi (27.11, egasi tasdig'i bilan; main `d7c1b40`)
Manba endi **repo** (`mr/public/yershunos/`). Artefakt (XcUMMPMnHP5hSgCCgBaQaW) eskirdi — undan qayta yig'ilmasin. `yershunos-milliy-qatlam-HANDOFF-26-11.md` bajarildi.

### Nima kirdi
- **«Mamlakat» rejimi** (`data-v="uz"`, relsda birinchi, kirishdagi rejim; `body.uz-on`, `.m-uz`). Xarita O'zbekistonda ochiladi; `map.once('load',()=>rejim('uz'))`; `uzOch()` qatlamni ochadi. Chorvoq rejimlari — namuna hudud.
- Milliy qatlam: `uzb_birliklar.geojson` (197 birlik; `c` iqlim, `e` yer, `w` suv, `j` zaiflik), reyting `R = bosim^0,5 × xavf^0,25 × zaiflik^0,25`.
- **Hisobot** `uzHisobot(sc)`: `t` tuman, `v` viloyat, `r` respublika, `h` chizilgan hudud; orientatsiya `HBO` = `pt` / `al`. `hbBloklar(al)` → bloklar (`{h, full}`), `hbQur()` o'lchab sahifalaydi (albomda 2 ustun). Vizuallar: `hbXarita`, `hbMini`, `hbNuqta`, `hbChiziq`, `hbAholi`, `hbIssiq`, `hbInfra`, `hbReyting`, `hbIqlimT`, `hbGips`, `hbQiya`.
- **«Hudud» rejimi**: `hbHisob` → `window.HBR` (sxema-xarita, balandlik kvantillari, qiyalik sinflari) → «Hisobot (PDF)».
- Belgi: KO'RGAZMALI → SKRINING.
- e2e (`sayt.spec.ts`): 7 rejim, kirishda `uz`; hisobot sahifalari toshmasligi.

## Istalgan joy: hozir nima bor
| Tahlil | Qamrov |
|---|---|
| Relyef, qiyalik, soy tarmog'i, vodiy tubi (HAND ≤ 5 m) | istalgan joy, brauzerda |
| Iqlim, suv stressi, aholi, zaiflik, yer | O'zbekiston, tuman aniqligida |
| Toshqin chuqurligi, ko'priklar, kasalxonagacha vaqt | faqat Pskem |
| Jala (rain-on-grid) | faqat Chimyon |
| Qurilish yillari × xavf | Chorvoq bo'yi, Angren |

## Kengaytirish rejasi (egasi 27.11 so'radi: uchalasini respublikaga)
1. **Qurilish yillari × vodiy tubi — butun respublika** (eng oson): GHS-BUILT-S 1980/2000/2020 (ThinkPadda bor) × HAND vodiy tubi (DEM z11) → har tuman uchun «soy bo'yidagi qurilgan maydon va aholi, yillar bo'yicha». Reytingning «xavf» qismiga toshqin ta'siri sifatida kiradi.
2. **Jala skriningi — istalgan joy**: SCS-CN + Kirpich + uchburchak gidrograf (`jala_skrining.py`, Baxmalda sinalgan) brauzerga; CCKP dan rx1day/rx5day; soy havzalari bo'yicha pik sarf. 2D model emas; Baxmalda 2D modeldan ~3 marta past chiqqan — kalibrlash kerak.
3. **Toshqin chuqurligi (2D)**: butun respublikaga emas — ustuvor hududlarga buyurtma asosida (har hudud: DEM 30 m, ThinkPadda soatlar). Avval 1-qadamdagi ro'yxatdan eng xavfli 10–20 vodiy tanlanadi.
