# Topshiriq: generator SMZ bor dahalarda 0 bino beradi, 5-qadam xabari va tarjima qilinmagan qatorlar (11.11.2026, video chatidan)

Egasi tasdiqlagan: alohida chatda tuzatilsin (odatdagi quvur: build, `git add app/` yangi fayllar bilan, CI yashil → squash).

## 1. Generator: daha qisman SMZ ichida bo'lsa «All» 0 bino beradi (ustuvor)
Ikki Toshkent dahasida takrorlandi:
- p_04490f62c1f6 — Olmazor, 3,29 ga; 2 qabriston, 300 m SMZ; yaroqli 0,77 ga → 0 bino. Xabar: «narrowest part of the block is ≈ 168 m … Block too narrow».
- p_16e2ec1567b9 — Yunusobod, 4,91 ga; 4 SMZ obyekti + 7 sanoat korxonasi; SMZ 1,95 ga, **yaroqli 2,94 ga** → baribir 0 bino. Xabar: «narrowest part ≈ 248 m … Block too narrow». Uchastka ichida OSM servis yo'llari bor; 3-qadamda «Demolish all» qilingan.
- Qayta tiklash: loyihani ochish → 5-qadam → «All».
- Kutilgan: yaroqli qismga (2,94 ga — katta maydon) seksiyalar joylashishi; SMZ qismi bo'sh qoladi yoki unda ruxsat etilgan funksiyalar.
- Gumon: SMZ ayirilgandan keyingi yaroqli poligon (yoki servis yo'llar bilan bo'lingan qismlar) bo'yicha emas, butun daha bo'yicha «eng tor joy» o'lchanmoqda va/yoki yaroqli qism juda ko'p bo'laklarga bo'linib, har biri tor deb hisoblanmoqda. Xabar matni haqiqiy sababni ko'rsatmayapti.
- Xabar matni ham tuzatilsin: sabab aniq aytilsin (masalan «Turar joy uchun yaroqli maydon 0,77 ga — qolgan qismi qabriston SMZ ichida (SanQvaN 0103-25, 12-band); yaroqli qismda chekinishlardan keyin seksiya sig'maydi»), eng tor joy o'lchovi yaroqli qism bo'yicha.
- G'oya (egasidan so'rab): SMZ ichida ruxsat etilgan funksiyalarni (garaj, avtoturargoh, ombor va h.k.) taklif qilish.

## 2. Ingliz (va boshqa) tillarida tarjima qilinmagan qatorlar
3-qadam «Resettlement cost» blokida (EN interfeys):
- «1149: renovatsiya» (yonida «781: expropriation» tarjima qilingan)
- «$/xon.» (ko'chish, xonadon boshiga)
- «$/m²·oy», «$/m²·yil»
- «Source: uybor.uz, Tashkent, … — shahar median (soʻralgan narx)»
Barcha 10 til uchun strings.json + lang/*.json ga kalitlar qo'shish; boshqa bloklarda ham shunga o'xshash qattiq yozilgan o'zbekcha birliklarni tekshirish.
