# Qisqa video uslub namunalari (A–D)

Loyiha hujjatlaridagi `claude/video-uslub-src/` dan koʻchirildi (27.11.2026). 15.11.2026 da egasiga yuborilgan 4 ta namuna (7–8 s, 9:16) shu skriptlar bilan yasalgan:

| Skript | Natija | Uslub |
|---|---|---|
| `a_tez.py` | `A_tez_montaj.mp4` | tez montaj + kinetik matn (ritmga kesish, oq flash, punch-in, slam-soʻzlar, raqam sanash, glitch) |
| `b_kino.py` | `B_kinematografik.mp4` | kinematografik (sekin push, grade, vinyetka, grain, light leak, letterbox) |
| `c_explainer.py` | `C_explainer.mp4` | explainer (1-2-3 qadam chiplari, halqa/strelka, oldin/keyin pardasi, split-screen, natija kartasi) |
| `d_aralash.py` | `D_aralash.mp4` | aralash (hook → kino → infografika) |

`fx.py` — umumiy yordamchilar: kadr, zoom, matn, effektlar, ovoz sintezi (numpy), ffmpeg render.

## Ishga tushirish
Kerak: Python 3, `numpy`, `Pillow`, `ffmpeg`, Inter Display shriftlari.

1. Lab ekran yozuvlaridan kadrlar (1080×1920):
   `ffmpeg -i <yozuv> -vf "fps=30,crop=683:1214:X:0,scale=1080:1920" <SRC>/<nom>/%04d.jpg`
   Nomlar va manbalar (15.11): `orbit` = alab_06_hero_orbit (cx 0.45), `gen` = alab_05_generatsiya (0.55), `bcn` = alab_en04_bcn_gen (0.50), `sun` = alab_en02_s6_sun (0.55), `spz` = alab_en06_spz (0.33).
2. `cd tools/video && VIDEO_SRC=<SRC> VIDEO_OUT=<OUT> python3 a_tez.py`

Oʻzgaruvchilar (sukut): `VIDEO_SRC=/home/claude/sty/src`, `VIDEO_OUT=/home/claude/sty/out`, `VIDEO_FONTS=/usr/share/fonts/opentype/inter/`. Koʻchirishda faqat shu uchta yoʻl oʻzgaruvchiga aylantirildi.

Ovoz va musiqa — sintez (namuna uchun). Haqiqiy videoda litsenziyali musiqa/SFX yoki Gemini TTS diktor (holat: loyiha hujjati `claude/video-holat.md`).
