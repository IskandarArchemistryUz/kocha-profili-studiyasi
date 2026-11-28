# Bogʻshunos — manba maʼlumotlari va prototiplar arxivi

Bu papka Bogʻshunos xizmatining loyiha hujjatlaridagi (claude.ai «Archemistry Lab» loyihasi, `claude/bogshunos-src/`) kod va maʼlumotlarni repoda saqlash uchun (27.11.2026). Ishlayotgan xizmat kodi — `mr/src/bogshunos/`; bu yerdagilar saytga yigʻilmaydi.

## data/ — manba maʼlumotlari

| Fayl | Nima | Kim ishlatadi |
|---|---|---|
| `assortiment-1979-II-A-boyitilgan.csv` | 1979-yilgi tavsiya assortimenti (153 qator: igna, barg, buta), POWO (Kew) boʻyicha qabul nomi, maqomi, Oʻrta Osiyoda tabiiy / kiritilgan, Toshkent reyestridagi soni va ulushi (14.11.2026). Birinchi 12 ustun — asl 1979 jadvali (`assortiment-1979-II-A.csv` shu ustunlarning aynan nusxasi edi, alohida saqlanmadi). | `mr/src/bogshunos/assort.ts` — `BASE` (faqat II-A da «+», aylantsiz 55 tur) |
| `green-tashkent-turlar-14-11.tsv` | green.tashkent.uz reyestridagi 226 tur: nomi · jami daraxtlar · 3-ustun (dendrolog tasdiqlagan son deb taxmin qilinadi — P) (14.11.2026). Manba: Toshkent shahri daraxtlar reyestri — green.tashkent.uz (Zamin fondi, Ekologiya vazirligi, Toshkent shahar hokimligi). | `mr/src/bogshunos/species.ts` (nom → lotincha), `assort.ts` `reg` |
| `odamlar-siluetlar-10.json` | Kesim uchun 10 odam silueti, foydalanuvchi kutubxonasi AUTOCAD_Library.dwg (PEOPLE) dan; normallangan (balandlik 1). | `mr/src/bogshunos/odamlar.ts` hozircha 2 tasini (nogiron, it_sayr) ishlatadi |

`mr/tests/unit/bogshunos_manba.test.ts` kod shu manbalar bilan mosligini tekshiradi.

## prototip/ — 14.11.2026 dagi tadqiqot skriptlari (ishlab chiqarishda ishlatilmaydi)

| Papka / fayl | Nima | Holat |
|---|---|---|
| `yol_tarmogi/` (`test_tc.py`, `net_tc.py`, `net_eval.py`) | Yoʻl tarmogʻi «yaxlit tizim» usuli: OD → xohish chiziqlari → darvozalarni birlashtirish → bundling → ierarxiya; metrikalar PRD, link–node, CNR, γ/α. Test — Tashkent City, 0,44 ga. | Oʻzi yetarli: `cd yol_tarmogi && python3 net_eval.py` (shapely, networkx). 27.11 da qayta ishga tushirildi — hujjatdagi natija aynan chiqdi: koʻkalamzor 75,4 %, PRD 1,13, oqimning 94 % PRD ≤ 1,3, link–node 1,50, CNR 1,00. |
| `sohil/` (`bsite.py`, `bank_net.py`, `variants.py`) | Test J: sohil referensi → Bozsuv boʻyi parki (Qatʼiy / Tizimli). | Kirish fayllari (`ctx_bozsu.json`, `dem.json`, `tz.pkl`) saqlanmagan — qayta ishlatish uchun OSM va SRTM qayta olinadi. |
| `bobur/konsepsiya_generator.py` | Bobur eko bogʻi: 3 konsepsiya varianti (A Saqlovchi, B Koʻl halqasi, C Ekologik qirgʻoq), OD → 3 m toʻr → bundling. | Kirish pickle fayllari saqlanmagan. Mantiq `mr/src/bogshunos/od.ts`, `design.ts` ga koʻchirilgan. |
| `kernel-v0.js` | Birinchi yadro prototipi (sintetik hudud): zonalarni oʻstirish, MST + halqa yoʻllar, Poisson-disk ekish, BAF, kanopi, tekshiruvlar. | Oʻzi yetarli (`node -e "require('./kernel-v0.js').generatePark()"`). «Taklif qil» uchun gʻoyalar manbai. |

Belgilar (Bogʻshunos qoidasi): **N** — norma asl matndan, **P** — taxmin, tekshirilsin, **A** — xorijiy orientir, **T** — talqin (loyiha qoidasi).

## eski-testlar/ — 14.11.2026 dagi Bobur testlari (ishga tushirilmaydi)
`albom.test.ts.txt`, `run.test.ts.txt` — eskirgan, fixture talab qiladi; tafsilot — `eski-testlar/README.md`.
