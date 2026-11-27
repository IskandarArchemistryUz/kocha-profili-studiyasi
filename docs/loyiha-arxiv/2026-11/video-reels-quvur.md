# Archemistry Lab qisqa videolari — ishlab chiqarish quvuri (11.11.2026)

Tarkib: Claude Docs «Archemistry Lab — 30 ta qisqa video tarkibi» (https://claude.ai/artifact/X63NjhaVvmGZDfeU8A1ih5).

## Qarorlar (egasi)
- Xalqaro seriya — ingliz tili (hook, izoh, diktor, CTA). O'zbekiston seriyasi U1–U24 — o'zbekcha, ShNQ bo'yicha.
- Lab interfeysi tili — ingliz (EN02 dan boshlab; Sozlamalar → English).
- Diktor: sifatli ingliz ovozi (sintez). Har video 9:16 va 16:9 nusxada (Shorts/Reels + LinkedIn/YouTube).
- Logo: brandpack asl fayllari (D:\OneDrive\Work\brandpack\brandpack\logo, motion/archemistry-lab — intro/outro 9x16 va 16x9, Remotion manbasi).
- Namuna joy: OSM boy shahar. EN01–EN03, EN05, EN08, EN11, EN13, EN14, EN19–EN25, EN28: Nyu-York, Long Island City, «Yangi loyiha» (p_9f800f818f9e), 7,26 ga. EN04: Barselona (p_a7dab0e87e87), Berlin (p_d21f8d54855a), Parij (p_b48d1be57a39). EN12 (qayta): noto'g'ri shakldagi 20,3 ga uchastka (p_f7359fda0805); eski Berlin loyihasi p_dda31e4a8041 45° to'rdan keyin buzilgan. EN06–EN07: Toshkent, Olmazor (p_04490f62c1f6, 3,29 ga; 2 qabriston, 300 m SMZ → yaroqli 0,77 ga). EN09, EN15: Lab namunasi «Yangi Toshkent, 80A lot» nusxasi (p_806fe9435ae6; 3,95 ga, 13 seksiya, 32 042 m², 677 aholi).
- **Xalqaro videolarda shahar nomi aytilmaydi va me'yoriy da'vo qilinmaydi.** Sabab: Lab'da O'zbekiston me'yorlari ishlaydi, xorijiy shaharda ular boshqacha. Panel insetlarida ham O'zbekiston normalari matni ko'rinmasligi kerak — kesib olinadi. Me'yorga tayanadigan mavzular — O'zbekistondagi uchastkada (EN06, EN07, EN09, EN15).
- **Narxlar videolarda ko'rsatilmaydi** (11.11): «biz hozir lab nima qila olishini ko'rsatyapmiz, nech pul yechishini emas».
- Og'ir hisoblar egasining tangasini yechadi; deraza insolyatsiyasi EN20 uchun egasi ruxsati bilan ishga tushirildi (1- va 19-binolar). Yer sathi xaritalari (Layers → Ground-level map: Surface heating, Flood risk, Wetness) tanga so'ramadi.
- Egasi bilan muloqot — o'zbekcha (11.11 kechqurun eslatdi).

## Yozib olish (egasining Chrome'ida, archemistry.uz)
- Ishchi muhitdan xarita/OSM serverlariga ulanib bo'lmaydi — yozuv faqat Chrome'da. Overpass 11.11 kechqurun deyarli ishlamadi («OSM tags not loaded») — yangi uchastkalarda maktab/bog'cha/daraxt yo'q; OpenFreeMap zaxirasi faqat binolar va yo'llarni beradi.
- `window.__mr.scene` (three.js: renderer, scene, cam, ctl, invalidate). Canvas `preserveDrawingBuffer: true`. Ko'rinish oynasi 2560×1215, dpr 1.
- **Vkladka yozuvi:** sahifaga «REC» tugmasi qo'shiladi → `getDisplayMedia({preferCurrentTab:true})`; egasi «Share this tab» ni bosadi (bir marta). `__T.start(name)/stop()` MediaRecorder 30 Mbit (2560×1214). Soxta kursor `#__cur` (transform translate). Sahifa qayta yuklansa oqim tugaydi (va barcha `__` yordamchilar yo'qoladi — qayta kiritish kerak). Qizil ramka — chetdan 8 px qoldiriladi.
- **Skriptli namoyish (EN22):** `__demo()` — kursor silliq harakatlanadi, qator foni yoritiladi (#e8efff) va halqa chiziladi, haqiqiy bosish yo'q (fayl yuklanmaydi).
- **Kadrma-kadr yozuvchilar:** `__rec2(name, deg, N, zoom, target?)` (orbita); `__walk(name, N, p0, p1, t0, t1, fov)` (perspektiv yurish/kran, EN24); `__orb(name, N, deg, dist, elev)` (ctl.target atrofida orbita, EN28); `__dayrec(name, N, t0, t1, camf)` + `__setT(soat)` (6-qadam vaqt slayderi, EN27). `captureStream(0)` + `requestFrame()`; keyin `ffmpeg -fps_mode passthrough -f rawvideo | ffmpeg -r 30`.
- Yuklab olishda Saqlash oynasi kutib turganda Chrome `Downloads\*.tmp` ni to'liq yozib qo'yadi; egasi saqlagach fayl `test video\video namunalar` da, keyin `yozuvlar` ga ko'chiriladi.
- 8-qadam slayderlari: `input[type=range][aria-label="1 -room, %"]` …; 3-qadam «Plot size» slayderi, «Subdivide block into plots»; 2-qadam modul va joylashuv; 6-qadam sana tugmalari (Mar 22 … Dec 22) va `input[type=range][aria-label^="Time"]` (5–20); 11-qadam «Presentation and export» — `nav.rail button` [10].

## Montaj (ishchi muhit)
- Remotion `Reel.tsx` + `reels.ts`; `wide: true` — 16:9. Kadrda `cx: [a,b]`, `cy: son` (massiv emas!), `scale: [a,b]`. Birinchi (hook) kadrida `step` qo'yilmaydi — sarlavha bilan ustma-ust tushadi. Chiplarda ✓ belgisi bor — legenda uchun ishlatilmaydi.
- Render: `--concurrency=1 --offthreadvideo-cache-size-in-bytes=400000000` (aks holda compositor SIGKILL).
- Diktor: kokoro-onnx `af_heart`, 1.08. Musiqa: numpy sintez; −14 LUFS. Outro ovozi: `e25_3.wav` («Archemistry Lab. Try it free at archemistry.uz»).

## Holat (hammasi `D:\Work\Archemistry Lab Test\tayyor`, 9:16 + 16:9)
- EN01–EN09, EN11, EN13–EN15 — oldingi holat (diktor/musiqa, 17–34 s).
- EN12 «A street grid. In one click.» — qayta yozildi, noto'g'ri shakldagi uchastkada.
- EN19, EN20 (19-bino muammosini topish — burchak seksiya ishlatilmadi), EN21, EN23, EN25 — tayyor.
- EN24 «See it at eye level.» — 21,3 s, diktor; ko'cha bo'ylab yurish → tepaga ko'tarilish.
- EN22 «Take it anywhere.» — 21,8 s, diktor; 11-qadam eksport paneli: JSON/XLSX/PNG → SVG/DXF → GLB/OBJ/IFC4. Narx ko'rsatilmaydi.
- EN28 «Which street is the hottest?» — 24 s, diktor; Surface heating → Flood risk (HAND) → Wetness (TWI), orbita.
- Qoldirilganlar (Lab tuzatilishini kutadi, topshiriq: claude/topshiriq-video-xatolar-11-11.md): EN10 (Target FAR), EN16 (yong'in yo'llari), EN17 (Overpass), EN18 (yashil karkas 0), EN27 (jonli soyalar ko'rinmaydi — 9-bo'lim; yozuvlar `alab_en27_dec/jun.webm` yaroqsiz), EN26 (shamol — xorijda ma'lumot yo'q, 10-bo'lim; Olmazor loyihasida yozish uchun egasining tanga ruxsati kerak — so'raldi, javob yo'q).
- **Keyingi qadam (12.11):** EN29 Ko'chasoz (ko'cha kesimi), EN30 kelgan master rejani tekshirish (davlat), keyin U seriya (o'zbekcha).

## Yo'l-yo'lakay topilgan Lab kamchiliklari (11.11)
- To'liq ro'yxat va tuzatish topshirig'i: claude/topshiriq-video-xatolar-11-11.md (1–10 bo'limlar).
- 5-qadam xabari ziddiyatli: claude/topshiriq-generator-xabar-tarjima-11-11.md.
- Sheet Studio: «No place found…», bo'sh kvartira varaqlari, «SAMPLE — ERA5 not connected»; oyna bosh sahifada ochiq qolishi mumkin.
- ShNQ 2.07.01-23 joriy tahrir matnida 01/2-42 buyruqning ro'yxat sanasi «17.12.2026» (buyruq 09.12.2025) — tekshirish kerak.
- Ingliz interfeysida tarjima qilinmagan: «1149: renovatsiya», «$/xon.», «$/m²·oy», «shahar median (soʻralgan narx)», «UMN», «o'quvchi», «Me'yorga moslash…», «Asosiy ko'rsatkichlar», qavat panelida «q», «umumiy yo'lakning tabiiy yoritilishi», «MTM».
