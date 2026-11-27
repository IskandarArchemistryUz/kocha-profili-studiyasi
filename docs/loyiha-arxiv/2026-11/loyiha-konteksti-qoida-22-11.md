# Loyiha konteksti — servislar o'rtasida qoida (22.11.2026, PR #739)

Muammo (egasi): Master rejadan boshqa servislarga o'tganda boshqa loyiha ochilib ketardi.

## Qoida (har yangi servis / havola uchun)
- Loyiha faqat URL dagi `?p=<id>` orqali uzatiladi (`core/projctx.ts` → `ctxProject()`).
- Xizmat havolalari faqat `svcLinks(p)` dan: Master reja → `./#/p/<id>`, Chizmadon → `./#/p/<id>/chizmadon`, qolganlari `svcHref(url, p)` (`?p=`). `./` yoki `./#/chizmadon` ni qo'lda yozmang — ular oxirgi o'zgartirilgan loyihani ochadi.
- Loyihaga tegishli localStorage kalitlari — `scoped(key, p)` (`key@<id>`); umumiy kalit faqat loyihasiz rejimda.
- Eski sahifalar (`js/eko.js`, `js/ks-tarmoq.js`): `?p=` bo'lsa havolalar shu loyihaga (o'z `href()`/`KP()` yordamchisi).
- Tarmoq (`js/app.js`): holat `kps_v1@<id>`; eski umumiy `kps_v1` shu loyihaniki bo'lsa (`design.mrPid`) bir marta ko'chiriladi.

## Ochiq
- Dizayn-kod sahifasi loyiha ma'lumotini hali ishlatmaydi — faqat `?p=` saqlanadi va qaytishda shu loyiha ochiladi.

## Shu kuni birlashtirilganlar
#735 bosh sahifa xizmatlar qatori · #736 Bogʻshunos nomi 9 tilda · #737 MR → Koʻchasoz Tarmoq/Chorraha (bitta OSM so'rovi, hudud doim uzatiladi) · #738 kesim va «Koʻcha profili A–A» Koʻchasoz grafikasi bilan (`kochasoz/kssection.ts`) · #739 loyiha konteksti.
