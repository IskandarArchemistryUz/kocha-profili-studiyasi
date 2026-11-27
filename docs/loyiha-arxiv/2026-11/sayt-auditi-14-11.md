# Sayt auditi — 14.11.2026

Hisobot (Docs): https://claude.ai/artifact/ETX2XynxDskvb2vpEF7R6b
Yechimlar kanvasi (Design): https://claude.ai/artifact/9cx3pUsRacF1XSUCW5KEFV — 10 doska: Main (10 topilma), Narx, Qadam, Meyor, Kontekst, Eksport, Hajm, Loyihalar, Bosh, Matn (33 matn). Egasi: «Hammasi ok».

## YANGI CHAT UCHUN — qayerda toʻxtadik (14.11, 22:30)
Birlashgan PR lar: #645 #646 #650 #651 #653 #660 #663 #665 #668 #671 #672 #674 #676 **#680 #681 #685**. Ochiq audit PR yoʻq. Navbatdagi 3 ish (Hajm, Eksport, tarjima tozalash) — hammasi bajarildi.
Qolgan kichik ishlar (egasi soʻrasa): kichik daha ogohlantirishi (Hajm), yuqoridagi «Taqdimot» menyusi takrori (Eksport), «Tanga sotib olish» ↔ «Tanga olish».
Ishni boshlashdan oldin: origin/main va ochiq PR larni tekshirish (parallel chatlar).

## Tarjima tozalash (#685, egasi (b) variantni tanladi)
- strings.json + 7 til: 291 kalit olib tashlandi (7325 → ~7034), 7 til fayllaridagi 5 yetim kalit ham.
- Qoidasi: kalit reponing hech bir faylida (kod, data, testlar; i18n/ va app/ dan tashqari) uchramasa — oʻchadi. **Qoladi:** `${…}` shablonlar va ish vaqtida yigʻiladigan kalitlar — boʻlaklari (` · `, `; `, ` ≥ `, `: `, `, ` boʻyicha) manbada bor boʻlsa.
- Sabab: birinchi urinishda (643 kalit) i18n.test.ts yiqildi («Kvartirografiya · 3-bino» — shablon), ikkinchisida (361) e2e `til_qoldiq` va `hisobot_til` yiqildi — meʼyor manbasi `${doc} · ${clause}` bilan yigʻiladi (norms/rules.ts). Uchinchisi — CI toʻliq yashil.
- Ildiz sahifalari (js/i18n/*.json): yetim kalit amalda yoʻq — tegilmadi.

## Hajm doskasi (#680)
- 21 tipologiya 3 guruhda: Past qavatli 5 (yakka, juft, taunhaus, hovli, klaster) · Koʻp qavatli turar joy 7 (avto, perimetr, qatorlar, blok+minora, minora, villa, blok+villa) · Noturar 9. Villa past qavatli emas (maxF cheklanmagan) — shuning uchun koʻp qavatlida.
- Mos kelmaydigan plitka koʻrsatilmaydi (oldin oʻchiq turardi); guruh yorligʻida «N ta».
- Nomlar: villa uz nusxasi «Hovlili uylar» → «Shahar villalari», «Blok + villalar» («Hovli uylar» bilan adashardi). Qisqa: Berk koʻcha klasteri, Perimetral blok, Mehmonxona korpusi / minorasi.
- Daha: «Daha» yorligʻi, «Dahani tanlang», «yoki xaritada daha ichini bosing».
- Qilinmadi: kichik daha ogohlantirishi («Qoʻshni dahaga qoʻshish · Yashil hudud qilish») — yangi funksiya.

## Eksport doskasi (#681)
- Taqdimot (Varaqlar, Chizmadon albomi, Meʼyoriy hisobot, Illustrator) · Chizma va BIM (DXF, IFC4, GLB, OBJ, atrof bilan) · Maʼlumot (XLSX, PNG, JSON). id lar oʻzgarmagan.
- Narx tugmada: `itemTag(id)` (pay.ts) — /prices × k; shift toʻlsa «bepul»; hisobot va JSON «bepul»; egasi rejimida koʻrinmaydi. `onPrices` da `[data-itag]` yangilanadi.
- «Boshqa xizmatda davom ettirish»: Koʻchasoz (#exKs), Joyshunos (#exJoy), Dizayn-kod (#exDk), Render (#exRen).
- Qilinmadi: yuqoridagi «Taqdimot» menyusi (presPop) qoldi; bepul belgili variant havolasi tugma yonida yoʻq (yuklash oynasida bor).

## Asosiy 10 ta — hammasi yopildi
1. Sayt «12 qadam», ilova 11; narxlar qadam raqamlari notoʻgʻri. — **#645**
2. narxlar ↔ narxlar-batafsil ziddiyatlari. — **#646**
3. Render — «oʻz API kalit» eskirgan. — **#645**
4. Xalqaro loyihada Oʻzbekiston maʼlumoti. — **#650**, seysmiklik **#651 / #653 / #660**, qadam izohlari va berk uchlar **#668** (`StepDef.leadIntl`), koʻcha profillari «andoza ✓» **#671**
5. Joyshunos konteksti — #641 (parallel chat); **#663** Master reja menyusida Dizayn-kod
6. 9-qadam: maʼlumot yoʻq paytda xulosa — **#665**
7. Oferta manzili → Shota Rustaveli 1-tor, 8-uy — **#645**
8. «Shu brauzerda saqlanadi» eskirgan — **#645**
9. Kirish usuli → Google + pochta kodi — **#645**
10. Oferta «3-qadamdan hisob» → «Joy va uchastka»dan keyin — **#645**

## Matn doskasi — toʻliq yopildi
- Ilova (#672): Nega mos emas? · qurilish izi · pastki belgi «N mos emas / N koʻrib chiqish / ✓» · Koʻchasoz «Chizmadon varagʻi», A/B/C/D harflarsiz (marshrut `data-k`) · Joyshunos fon «Xarita», «Muhit» guruhi (Shovqin) · Chizmadon «9 soat 01 daq» · Render «Qoʻshimcha tavsif (ixtiyoriy)»
- Dizayn-kod (#674): ASCII ' → ʻ/ʼ (~320 joy), sarlavha «Dizayn-kod · Peshlavha», «Chizmadonga yuborish»; js/i18n.js `uq()` — lugʻat kalitlarining ʻ/ʼ nusxasi; kesh `?v=20261114`

## Loyihalar doskasi (#676)
- 6 tadan koʻp loyihada qidiruv (#projQ) va saralash: Hammasi · Bulutda · Brauzerda · Boʻsh N (bino/uchastka yoʻq, 7 kundan eski)
- «Oʻchirish» — «⋯» (.card-more) ortida
- Namuna takrorlanmaydi (localStorage `mr-namuna-id`)
- Sukut nom joy qidiruvdan tanlanganda «joy, dd.mm» (`isDefaultName` editor.ts)
- «Tarix» → «Tanga tarixi». Qilinmadi: «Tanga sotib olish» ↔ Narxlardagi «Tanga olish»

## Narx qarorlari (egasi, 14.11)
- Haftalik bepul ogʻir hisob: 3 ta · Xonadonlar hisobi 4 × k · Qavat rejalari 8 t (#646, deploy oʻtdi)

## Seysmiklik qarorlari (egasi, 14.11)
- Xorijda sukut ≤ 6, foydalanuvchi tanlaydi (#651); PGA → taxminiy ball (#653); GSHAP 1999 taklifi, faqat «Qabul qilish» bilan (#660, `data/seis/gshap-ball-05.bin`, Giardini va boshq. 1999). GEM 2023 ishlatilmadi (CC BY-NC-SA)

## Ish usuli (eslatma)
- Har ish: origin/main dan yangi tarmoq → PR → CI (test + e2e 1–4) hammasi yashil → squash-merge (`gh api -X PUT …/pulls/N/merge -f merge_method=squash`). GraphQL yoʻq — faqat REST.
- Workspace har yangi sessiyada boʻsh: repo `IskandarArchemistryUz/kocha-profili-studiyasi` ni add_repo + `git clone --depth 1`, `cd mr && npm ci`. Toʻliq vitest ~15 daqiqa — fon rejimida yoki faqat kerakli testlar.
- strings.json va lang/*.json bitta qatorli — ikki PR da oʻzgarsa toʻqnashadi. Usul: ikkinchi PR ni yangi main dan qayta yigʻish — manba patchi `git diff --binary <eski base> <tarmoq> -- . ':(exclude)app' ':(exclude)css/ds2.css' ':(exclude)mr/src/i18n'` → `git apply --3way`, i18n oʻzgarishlarini skript bilan qayta qoʻllash, `npm run build`, force-push. PR «dirty» boʻlsa CI umuman ishga tushmaydi — mergeable_state ni tekshirish.
- CI PR ni main bilan birlashtirib tekshiradi: main da mr/ oʻzgarsa «app/ eskirgan» xatosi — yuqoridagi usul.
- i18n: mr/src/i18n/strings.json ([uz nusxa, en, ru]; uz '' — kalitning oʻzi) + lang/*.json (7 til, i18n_tillar testi kalitlar toʻliqligini tekshiradi); ildiz sahifalari — js/i18n.js DICT + js/i18n/*.json ({t, rx, atam}).
- Kalitni oʻchirishdan oldin: shablonlar va yigʻma kalitlar (meʼyor manbasi `hujjat · band`) koddagi literalda koʻrinmaydi — e2e `til_qoldiq`, `hisobot_til` tutadi.
- E2E: workspaceda brauzer yoʻq — faqat CI; vite preview `/data/` ni bermaydi → `page.route`; #regSet ikki joyda → `:visible`.
- Matnni oʻzgartirishdan oldin u kodda kalit sifatida oʻqilmasligini tekshirish (Koʻchasoz `<b>` harfi; js/i18n.js lugʻat kalitlari; e2e `#typoPick summary` TYPO_NAME matnini kutadi).
- Parallel chatlar shu repoda ishlaydi — boshlashdan oldin origin/main va ochiq PR larni tekshirish.
