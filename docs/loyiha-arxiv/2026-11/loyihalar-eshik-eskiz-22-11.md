# Loyihalar eshigi, ajratish, «Loyihalarim» va karta eskizi (22–23.11.2026)

Egasi talabi: «qaysi servisni ochsa ham — avval oʻz loyihalar paneli; yangi loyiha — boʻsh sahna; eski sahnalar ochilmasin; bir-biriga aralashmasin». «Bosh sahifadan ish boshlaganda doim loyihalar paneli: mavjud loyihalar + yangi loyiha (xohlagan servis)». «Loyiha kartalarida loyihaning oʻz rasmi kichik». «Dizayn-kod: har peshlavha — alohida loyiha». Binokor — hali tayyor emas (qoʻshilmaydi).

## Qoida (yangi servis qoʻshilganda ham)
- Servis loyihasiz ochilsa (`?p=` yoʻq) — xizmat kodi yuklanmaydi; `src/<svc>/entry.ts` → `svcGate()` (ui/svcpick.ts) loyihalar panelini «eshik» rejimida ochadi (yopib boʻlmaydi, «← Archemistry Lab»).
- Eshik uslubi: ildizdagi `css/ds2.css?v=4` `<link>` bilan. ds2.css ni entry.ts ga import QILMANG — Vite umumiy CSS boʻlagi yaratib Master reja CSS tartibini buzadi (yol_nuqta 1024 px). `ui/ds2.css` oʻzgarsa — `css/ds2.css` (postbuild nusxasi) ham commit qilinsin.
- Oʻtish: `?p=<id>` · `?embed` (MR ichidagi ramka) · `?asosiy=1` (faqat testlar uchun yashirin).
- Har servis holati faqat loyiha kalitida (`kalit@<id>`); roʻyxat — `storage/svcprojects.ts` `SVC_STATE`. Yangi holat kaliti — `scoped()` bilan va SVC_STATE ga.
- Yangi servis qoʻshish roʻyxati: `SvcKind` + `SVC_STATE` (svcprojects), `SvcId/KIND/NAME/LEAD/SVC_KEYS` (svcpick), `NaqshId` + `naqsh/<id>.svg` (backdrop), `PAL` + `SVC_OF` (otish), `SVC` + `svcHrefOf` + roʻyxat/sanoq (main.ts), `--svc-<id>` (ds2.css), LEAD matni strings.json + lang/*.json.
- Eski loyihasiz ish: eshik birinchi ochilganda bir marta «<Xizmat> — eski ish» (legacy) loyihasiga nusxalanadi (`svcmig:<xizmat>`).
- Render: boshqa xizmatdan yuborilgan rasm `render-inbox` → `takeInbox()`. Server tarixidan faqat shu loyiha manbasiga bogʻliq ishlar (legacy — hammasi). `#/s/` dan keyin `?p=` saqlanadi.
- «Loyihalarim» (app/#/): barcha servis loyihalari bitta panjarada (`#cards`, `data-pid` — MR, `data-sid` — servis), servis belgisi, filtr `#svcF` (kamida 2 servisda loyiha boʻlsa chiqadi). «Yangi loyiha» `#newP` → `#newMenu` → `#newP-mr|ks|joy|bg|ren|dk|chz` (7 ta). Testlarda: `click('#newP').then(() => click('#newP-mr'))`.
- Sayt «Boshlash» havolalari → `app/#/`; `#/yangi` marshruti qoldi (testlar).
- Kartalar eskizi: MR — `core/projthumb.ts`; servislar — `storage/svcthumb.ts` (`svcthumb@<id>`, data:image ≤90 KB). Bogʻshunos — bogʻ chegarasi (qizil) `setSite` da.
- Dizayn-kod (ildiz sahifa, Vite emas): `js/dk-loyiha.js` — `dizaynkod.html` ichki `boot` → `window.dkBoot()`. Roʻyxat `svcp:dk` (SvcKind 'dk'), holat IndexedDB `archemistry-dk`/st/<id>. Namuna faqat `?asosiy=1`.

## Bogʻshunos (23.11)
- #756 — server `/data/trees` (birlashtirildi).
- #757 — sahifa `app/bogshunos.html` (mijoz kodi `mr/src/bogshunos/` — loyiha hujjatlari `claude/bogshunos-src/ts/*` dan), Variant turi yoʻl sozlamalari va jihozlar bilan, Render manbasi `bg` (chuqurlik/maska/tavsif), bosh sahifa va narxlar kartasi havola (birlashtirildi).
- #758 — eshik + Loyihalarim (tur `bg`, holat `bg:state@<id>`).
- Qarzlar: `shtaffaj.ts` — vaqtincha protsedural siluetlar (asl shtaffaj kutubxonasi loyiha hujjatlarida yoʻq); `odamlar.ts` — faqat kesimda ishlatiladigan 2 siluet (nogiron, it_sayr). `albom.test.ts`, `run.test.ts` repoga hali qoʻshilmagan.

## Holat
- main da: #751, #753, #754, #756, #757.
- PR #755 (`dk-loyiha`) — Dizayn-kod loyihalari, CI yashil; egasi tasdigʻini kutgan.
- CI tasodifiy testlar (main da ham): `kocha_regen` (8 dan 1).

## Keyingi navbat
- Bogʻshunos: asl shtaffaj kutubxonasini almashtirish; birlik testlarini qoʻshish.
- Binokor — tayyor boʻlgach.
