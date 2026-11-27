# Ish holati — Meʼyorlar toʻplami va 1-qadam akkordeoni (11.11.2026, 19:50)

Oldingi chatdan topshirildi. Asosiy hujjat: `claude/normalar-toplamlar-inventar-11-11.md` (53 qoida A/B/C/D tasnifi, cheklovlar xorijda). Maket: Design kanvas «Me'yorlar to'plami — interfeys maketi» — https://claude.ai/artifact/Q879hsH9TGvZypYPWuvnw8 (1–4: toʻplam, shartlar formasi, reyestr, konsepsiya rejimi; 5–6: 1-qadam akkordeoni va inventar).

## Egasining qarorlari
- Qoidalar tasnifi (A fizik/xavfsizlik — xorijda tavsiya; B mintaqaviy — xorijda oʻchiq; C konvert — uchastka shartlaridan; D cheklovlar) — tasdiqlangan.
- Xalqaro andoza masofalari — NSW ADG 3F-1 (asl PDF bilan tekshirilgan).
- 1-qadam tartibi: 1 Joy · 2 Chegara · 3 Kirish va yoʻllar · **4 Meʼyorlar toʻplami** · **5 Mavjud holat va cheklovlar** (bufer toʻplamga bogʻliq).
- 1-qadam — yigʻiladigan boʻlimlar (bitta ochiq), maket maʼqul.
- **Parallel ishlarga zarar yetmasin:** boshqa chatning PR i navbatda oldin boʻlsa — kutiladi; birlashtirishdan oldin har safar ochiq PR lar va fayl kesishuvi tekshiriladi; boshqa chatning branchiga tegilmaydi.
- 3-bosqich («Uchastka shartlari» formasi, reyestrda daraja belgilari va «Oʻchiq» filtri, Oʻzbekistonda «Konsepsiya rejimi», varaq shtampi) — **egasi tasdiqlamaguncha boshlanmaydi**.

## PR holati (19:50)
| PR | Branch | Holat |
|---|---|---|
| #506 | normalar-toplami-1 | **birlashgan** (75e5089) |
| #508 | c78-kamera-dropdown-pr | **boshqa chatniki**, ochiq, CI ishlayapti. Uning `app/` i #506 dan keyin eskirgan — oʻsha chat `main` olib `npm run build` qilishi kerak. Tegilmaydi. |
| #509 | normalar-toplami-2 | 4 · Meʼyorlar toʻplami bloki, `settings.normSet`. CI: test ✓; e2e 4 oqimi CI serverida Playwright oʻrnatish (apt, code 100) yiqilgani uchun qizil edi — **kod xatosi emas**, 19:50 da qayta ishga tushirildi. Lokal: 954 unit ✓, e2e ✓. |
| #510 | birinchi-qadam-akkordeon | 1-qadam akkordeoni. **Base = normalar-toplami-2** (#509 ustida). CI ishlayapti. |

## Navbat (bajarish tartibi)
1. #508 birlashishini kutish (har ~30 daqiqada `gh api repos/IskandarArchemistryUz/kocha-profili-studiyasi/pulls/508 --jq '.state,.merged'`).
2. #508 birlashgach — #509 ni `main` ga koʻchirish: `git fetch origin main; git checkout normalar-toplami-2; git rebase origin/main`. «build: app» commiti toʻqnashsa: `git reset --hard HEAD && git rebase --skip`. i18n JSON toʻqnashsa — pastdagi skript. Keyin `cd mr && npx tsc --noEmit && npx vitest run tests/unit/normalar_toplami.test.ts tests/unit/i18n.test.ts tests/unit/i18n_tillar.test.ts && npm run build`, `git add -A app css`, «build: app» commit, `git push --force-with-lease=normalar-toplami-2:<remote sha>`. Birlashtirishdan oldin ochiq PR larni yana tekshirish. CI toʻliq yashil → squash-merge.
3. #509 birlashgach — #510 ni `main` ga koʻchirish (base ni `main` ga oʻzgartirish: `gh api -X PATCH repos/.../pulls/510 -f base=main`), `git rebase --onto origin/main normalar-toplami-2 birinchi-qadam-akkordeon` (yoki interaktiv emas: #509 commitlari squash boʻlgani uchun faqat akkordeon commiti koʻchiriladi), qayta build, CI yashil → squash-merge.
4. Egasiga natija; 3-bosqichni faqat tasdiqdan keyin.

## i18n JSON toʻqnashuvi uchun skript (`merge_i18n.py`, repo ildizidan, rebase toʻqnashuvi paytida)
```python
import json, subprocess
files = ['mr/src/i18n/strings.json'] + [f'mr/src/i18n/lang/{l}.json' for l in ['es','pt','fr','az','uk','tr','kk']]
for f in files:
    try: base = json.loads(subprocess.check_output(['git', 'show', f':2:{f}']))
    except subprocess.CalledProcessError: continue   # bu faylda toʻqnashuv yoʻq
    mine = json.loads(subprocess.check_output(['git', 'show', f':3:{f}']))
    if f.endswith('strings.json'):
        for k, v in mine['strings'].items(): base['strings'].setdefault(k, v)
    else:
        for k, v in mine.items(): base.setdefault(k, v)
    json.dump(base, open(f, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    subprocess.check_call(['git', 'add', f])
```
Fayllar bitta qatorli — git ularni oʻzi qoʻsha olmaydi; skript ikkala tomon kalitlarini saqlaydi (rebase da :2 = main, :3 = oʻz commit). `editor.ts` import qatori toʻqnashsa — ikkala importni qoldirish.

## Texnik eslatmalar
- Kod: `mr/src/norms/sets.ts` (RULE_KIND, levelOf, ADG), `core/generator.ts`, `core/genfix.ts`, `core/setback.ts`, `norms/rules.ts` (`abroadRules` B → «na»), `ui/editor.ts` (`normSet()`, `normsBlock()`, `uchAccordion()`, `accOn()`), `ui/style.css` (`.acc*`).
- Akkordeon testlarda oʻchiq: `tests/e2e/fx.ts` `mr-acc=0` qoʻyadi (mavjud va parallel testlar eski koʻrinishda); oʻz testi `akkordeon.spec.ts` yoqadi.
- Oʻzbekiston uchun generator natijasi #506 da 1440 holatda main bilan baytma-bayt solishtirilgan.
- Maʼlum kamchilik: oʻzbekcha interfeysda davlat nomi inglizcha («Uzbekistan», «France») — `core/place.ts placeLabel` (brauzerda uz-Latn yoʻq). Egasi xohlasa tuzatiladi (Chizmadon dagi 241 davlat oʻzbekcha nomlaridan).
- Ish uslubi: har bosqich — alohida PR, skrinshot 1024 tungi va 1440 kunduzgi, matn 10 tilda, CI yashil boʻlmaguncha birlashtirilmaydi.
