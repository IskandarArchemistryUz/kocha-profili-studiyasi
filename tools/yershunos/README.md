# Yershunos — maʼlumot tayyorlash skriptlari

Saytdagi sahifa (`mr/public/yershunos/`) uchun milliy qatlam va hudud skriningini hisoblaydigan Python skriptlari. Sahifaning oʻzi bu papkadan foydalanmaydi; bu yerda faqat qayta hisoblash uchun manba saqlanadi. `tools/` saytga chiqarilmaydi (`sayt.yml` istisnosi).

Fayllar claude.ai «Archemistry Lab» loyihasidagi `claude/yershunos-src/` dan oʻzgarishsiz koʻchirilgan (27.11.2026). Holat va ochiq qarorlar — loyiha hujjati `claude/yershunos-holat.md`.

## Tuzilish
| Papka | Nima | Qayerda ishlagan |
|---|---|---|
| `zanjir/` | Yuklovchilar va hudud skriningi | ThinkPad, `C:\Work\Yershunos` |
| `kal/` | Milliy qatlam: kalibrlash va 197 birlik boʻyicha yigʻish → `uzb_birliklar.geojson` | sandbox |

### zanjir/
| Fayl | Vazifa | Chiqish |
|---|---|---|
| `tasir.py` | Xavf zonasidagi aholi va binolar (`aholi_xavfda`, `birliklar_boyicha`, `binolar_xavfda`, `bino_manbasi_qamrovi`) | funksiyalar |
| `test_tasir.py` | `tasir.py` ning sintetik sinovi (`python test_tasir.py` → `OK`) | — |
| `hudud_xavf.py` | Tuman uchun relyef skriningi: HAND, tik yonbagʻir × aholi 1980–2030, Overture binolari, qishloqlar. `python hudud_xavf.py baxmal`; kirish `hudud/<nom>/chegara.geojson`, `sozlama.json {"nom", "k"}` | `natija_<nom>.json` |
| `jala_skrining.py` | Har soy uchun havza, yetib kelish vaqti, SCS-CN pik sarf (2D model emas) | `jala_<nom>.csv` |
| `cckp_ol.py` | World Bank CCKP CMIP6 0,25° klimatologiyalari (8 koʻrsatkich × 3 ssenariy) | `kesh/cckp/` |
| `aq_ol.py` | WRI Aqueduct 4.0, Oʻzbekiston qismi | `kesh/aqueduct/` |
| `siat_ol.py` | stat.uz SIAT toʻplamlari (zaiflik), tuman kesimi borligini tekshiradi | `kesh/stat/` |
| `yer_ol.py` | GHS-BUILT-S 1 km (1980/2000/2020) + WorldCover 2021 kichraytirilgan koʻrinish | `kesh/`, `kesh/worldcover/` |
| `toshqin_ol.py` | JRC GloFAS toshqin xaritalari v2.1 (RP10/100/500) + Terrarium z10 relyef; uzilishga chidamli | `kesh/jrc/`, `kesh/dem10/` |

### kal/
| Fayl | Vazifa | Chiqish → GeoJSON maydoni |
|---|---|---|
| `kalibr.py` | Rasmiy aholi (SIAT 246) ↔ OSM poligonlar, k = rasmiy / GHS-POP (1-bosqich) | `uzb_kalibrlangan.csv` (shu yerda) |
| `kalibr2.py` | Moslik tuzatishlari, chegara oʻzgarishi guruhlari, dinamika, shahar atrofi | `uzb_kalibrlangan2.csv`, `uzb_dinamika.csv`, `uzb_shahar_atrofi.csv`, `osm_moslik.json` |
| `halqa.py` | Shahar atrofi — toʻliq halqa (chegaradosh barcha tumanlar) | `uzb_shahar_halqa.csv` |
| `iqlim_birlik.py` | CCKP → aholi bilan tortilgan iqlim | `iqlim_birlik.json` → `c` |
| `yer_birlik.py` | Qurilgan maydon va ekin yeri yoʻqolishi | `yer_birlik.json` → `e` |
| `su_birlik.py` | Aqueduct suv stressi | `su_birlik.json` → `w` |
| `zaif_birlik.py` | SIAT zaiflik indeksi | `zaif_birlik.json` → `j` |
| `toshqin_birlik.py` | JRC daryo toshqini × aholi × qurilish | `toshqin_birlik.json` → `tq` |
| `hand_uzb.py` | Butun respublika HAND (dem10 ~118 m), soy boʻyi zonasi | `hand_zona.tif` |
| `hand_birlik.py` | Soy boʻyi zonasi × aholi × qurilish | `hand_birlik.json` → `sb` |
| `birlik.py` | Hammasini sahifa uchun soddalashtirilgan GeoJSON ga yigʻadi | `uzb_birliklar.geojson` |

## Repoda yoʻq bogʻliqliklar (ThinkPad yoki sandbox da qolgan)
- `angren_sinov.py` — `aq_ol.py`, `yer_ol.py`, `hudud_xavf.py` undan `yukla()` va yordamchilarni oladi. Loyihaga yuklanmagan; `C:\Work\Yershunos` da.
- `stat_ol.py`, `uzb_sinov.py`, `urban_sinov.py`, `dem10_yig.py`, `*.bat` — `C:\Work\Yershunos`.
- `kalibr_jala.py` (jala skriningini 2D bilan solishtirish, 27.11) — faqat sandbox da edi, saqlanmagan.
- Kirish maʼlumotlari (`kesh/`, `osm_chegaralar_uzb.json`, `rasmiy_246.json`, GHS rastrlari) repoga qoʻyilmaydi — hajmi katta; yuklovchilar ularni qayta oladi.
- `jala_skrining.py` da sandbox yoʻllari qattiq yozilgan (`/home/claude/ys/zanjir`, `/mnt/user-data/uploads/Work/Yershunos/kesh`) — boshqa joyda ishlatishdan oldin `H.KESH`, `H.HUD` ni oʻzgartiring.

## Muhit
Python 3.10+, `numpy`, `scipy`, `numba`, `rasterio`, `geopandas`, `shapely`, `pyproj`, `netCDF4`, `osm2geojson`, `requests`.

## Halollik qoidasi
Hamma natija — skrining. Har natijada belgi, farazlar va «hisoblanmadi — sababi» saqlanadi.
