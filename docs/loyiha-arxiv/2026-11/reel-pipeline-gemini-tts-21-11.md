# Reel pipeline — Higgsfield hook + Gemini TTS (21-11)

Sinov: AL_01 «Maktabga joy yetadimi?» → D:\Work\Archemistry Lab Test\higgsfield\v4\AL_01_maktab_v5_orus_9x16.mp4 (34 s).

## Iskandar tanlovlari
- Diktor: **Gemini TTS, gemini-3.8-flash-tts, ovoz `orus`** (Sardor/edge-tts o'rniga — Gemini ancha tabiiy). Algenib ham yoqdi (zaxira).
- Style (speech_metadata.style): "Confident Uzbek documentary narrator… Brisk, energetic pace, ~15% faster…" — tez variant tanlandi.
- Fon: **musiqasiz** (faqat diktor + SFX) tanlandi. Faqat musiqali v1 yoqmadi; musiqa bo'lsa diktordan 20 dB past bo'lishi shart (v3 tajribasi: 5 dB farq — «musiqa bosib ketyapti»).
- Har gap ekrandagi subtitr matni bilan so'zma-so'z mos bo'lishi kerak; raqamlar so'z bilan yoziladi.

## Texnik
- Gemini API: generativelanguage.googleapis.com (Capabilities'ga qo'shilgan), bepul Tier 1 — 10 so'rov/daqiqa (6.5 s pauza bilan ketma-ket yuborish). Javob WAV 24 kHz mono.
- Request: contents[].parts[] = {text, speech_metadata:{style}}; generationConfig.responseModalities=["AUDIO"], speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName.
- O'zbekcha native ovoz yo'q (`/v1beta/voices` da uz-UZ yo'q), lekin prebuilt ovozlar o'zbekcha gapiradi («Northern Uzbek» qo'llanadi).
- Montaj: segment uzunligi = gap + 0.45 s (musiqali bo'lsa bitga kvantlanadi); hook t2 yozuvi VAD bo'yicha eng katta pauzadan; SFX: ochilish zarbi, kesimlarda vush, raqamlarda pop, asosiy dalilda («loyihada: 0») zarb, «Archemistry Lab» da ding. Loudness −14 LUFS.
- Higgsfield: hook uchun Seedance 2.5 (1080p, 80 kr) Kling 3.0 dan (720p, 10 kr) aniqroq; tayyor videolar d8j0ntlcm91z4.cloudfront.net dan (Capabilities'ga qo'shilgan), upload.higgsfield.ai ham ochiq.
- Ish fayllari sessiyada: /home/claude/reel (v4.py), /home/claude/gem (g.py) — yangi sessiyada qayta yozish kerak.
