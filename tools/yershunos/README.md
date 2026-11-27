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

## `uzb_birliklar.geojson` — maydonlar lugʻati
Yuqori daraja: `vil` — viloyat va respublika rasmiy qatorlari (ming kishi, 2010–2026, 17 qiymat); `ij` — respublika zaiflik qiymatlari. Har feature (197 birlik) `properties`:

| Kalit | Maʼno |
|---|---|
| `n`, `v` | birlik nomi (rasmiy), viloyat |
| `s` | rasmiy aholi, ming kishi, 2010–2026 (SIAT 246, 2026 roʻyxati boʻyicha qayta hisoblangan) |
| `oz` | chegarasi oʻzgargan birlik: oʻz barqaror davri (`s`, `y0`, `y`) — boʻlmasa `null` |
| `r10`, `r20`, `r26` | rasmiy aholi 2010 / 2020 / 2026 |
| `g20`, `k` | GHS-POP 2020 va k = rasmiy / GHS-POP |
| `p50` | prognoz 2050 = rasmiy 2020 × (GHS-WUP 2050 / 2020) |
| `km`, `z` | maydon, km²; zichlik 2026, kishi/km² |
| `o`, `y` | oʻsish 2010–2026, %; yillik sur'at, % |
| `ob`, `ch`, `iz` | oʻsish hisoblangan guruh (chegara oʻzgarishi), oʻzgargan yil, izoh |
| `c.<v>` = `[tarix 1995–2014, SSP2-4.5 2040–59, SSP5-8.5 2040–59]` | CCKP, aholi bilan tortilgan: `hd35`, `hd40` issiq kunlar; `tr` tropik tunlar; `cdd` quruq kunlar; `spei12`; `rx5day`; `pr` (ishonchsiz, koʻrsatilmaydi); `tas` |
| `e` | `b80`/`b00`/`b20` qurilgan maydon km² (GHS-BUILT-S); `yangi` 2000–20 yangi qurilgan km²; `olingan` shundan ekin yeridan km²; `olingan_ulush` %; `ekin` ekin yeri 2021 km²; `ekin_ulush` birlik maydonidagi ulushi %; `yoqotish` ekin yeri yoʻqolishi %; `ekin_kishi`, `qur_kishi` m²/kishi; `wc_qurilgan` WorldCover qurilgan km² |
| `w` | Aqueduct 4.0, 0–5 ball: `bws` suv stressi, `bwd` zaxira sarfi, `iav` yillararo oʻzgaruvchanlik, `drr` qurgʻoqchilik xavfi, `gtd` yer osti suvi pasayishi (25 birlikda), `ws50`/`ws50p` 2050 odatdagidek/pessimistik; `juda_yuqori`, `yuqori`, `arid` — aholi ulushi % |
| `j` | SIAT zaiflik: `suv`, `kan`, `gaz`, `isuv`, `isq` (kvartiralar %), `uy` m²/kishi (`uy_y` yili), `haq` ish haqi soʻm (`haq_n` respublikaga %), `ishs` %, `bol` 0–15 yosh %, `kek` 60+ %, `qaram` bol+kek, `mig` 1000 kishiga, `shahar` %, `shf`, `orn` 10 000 kishiga, `tug`; `z` indeks 0–100, `zt` tarkiblar |
| `tq` | JRC daryo toshqini: `a10`/`a100`/`a500` zonadagi aholi %; `a100_05`/`a100_1` suv ≥ 0,5 / ≥ 1 m; `k100`, `k100_05` kishi (rasmiy 2026 ga keltirilgan); `z100` zona % , `zk100` km²; `q80`/`q00`/`q20` zonadagi qurilgan km²; `qu` qurilgan maydonning zonadagi ulushi %; `qy` 2000-yildan keyingi yangi qurilishning ulushi % |
| `sb` | Soy boʻyi HAND ≤ 5 m (PR #793): `a` kichik soy boʻyidagi aholi % (tekis emas); `a1`/`a2` atrof qiyaligi ≥ 1° / ≥ 2° (`a1` — asosiy); `ak` havzasi ≤ 50 km²; `ad` yirik daryo boʻyi; `tekis` tekislikdagilar %; `k`, `k1` kishi; `q80/q00/q20`, `qu`, `qy` — `a` zonasi boʻyicha |

Sahifada hisoblanadigan (faylda yoʻq): `uzClim()` → `h`, `t`, `q`, `ro`/`rx`/`rz`, `r` (reyting `bosim^0,5 × xavf^0,25 × zaiflik^0,25`).

## Eski loyiha hujjatlari
16–27.11 dagi Yershunos hujjatlarining toʻliq matni — `docs/yershunos/arxiv/` (loyihadan oʻchirilgan; amaldagi holat — loyihadagi `claude/yershunos-holat.md`).

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
