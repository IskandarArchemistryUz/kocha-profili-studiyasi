# Binokor — prototip va oʻlchov vositalari (arxiv)

**Ishlaydigan manba bu yerda emas:** saytdagi Binokor — `mr/public/binokor*` (CLAUDE.md, 7-boʻlim). Bu papka — claude.ai «Archemistry Lab» loyihasidagi `claude/binokor-src/` dan koʻchirilgan, saytga chiqmaydigan vositalar (`sayt.yml` `tools/` ni chiqarmaydi). Holat va ochiq qarorlar — loyiha hujjati `claude/binokor-holat.md`.

| Fayl | Nima | Manba (loyihada) |
|---|---|---|
| `core2.js` | Yadro v3.33 (14.11.2026) — `planCleanup`, `build`, MODS, MATLIB. `mr/public/binokor-yadro.js` ning oldingi holati; agent oʻlchovi va `test2.js` shunga tayanadi | `claude/binokor-src/core2.js`, sha256 `aa7cd02eaa3a336e…` (bayt-bayt) |
| `editor-kernel.js` | Muharrir yadrosi v1 (o‘qqa qulflangan, sm) — `test2.js` v1↔v2 solishtiruvi uchun | `claude/binokor-src/editor-kernel.js` |
| `test2.js` | Yadro sinovlari: v1 bilan moslik, analitik maydonlar, burish invariantligi, fuzz 1 500, tutashuvlar, plita/to‘sin/poydevor/yoy | `claude/binokor-src/test2.js` |
| `ifcv.py` | IFC eksportini IfcOpenShell bilan tekshirish (sxema, hajmlar yadro bilan) | `claude/binokor-src/ifcv.py` |
| `agent-bench/render_ifc.py` | IFC qavatidan reja rasmi (PNG) + aniq javob (GT JSON) | `claude/binokor-src/agent-bench/` |
| `agent-bench/predict.js` | Agent javobi (`P(x,y)` piksel) → `core2.js` → devorlar, teshiklar, xonalar | 〃 |
| `agent-bench/score.py` | Devor F1, qalinlik, teshik va xona (IoU ≥ 0,5) moslik baholari | 〃 |

## Ishga tushirish
```bash
cd tools/binokor && node test2.js          # 46 PASS, 0 FAIL (27.11.2026 da tekshirildi)
python3 ifcv.py                             # /tmp/{toliq,seksiya}.ifc va .json kerak
python3 agent-bench/render_ifc.py MODEL.ifc "Qavat nomi" out 25
node agent-bench/predict.js out.agent.txt 25 out.pred.json [raw|clean|ink]
python3 agent-bench/score.py out.json out.pred.json
```
- `predict.js` da yadro yoʻli `B = '/home/claude/binokor/'` — ishlatishdan oldin `tools/binokor/` ga oʻzgartiring.
- Python: `ifcopenshell`, `shapely`, `numpy`, `Pillow`.

## Koʻchirilmaganlar
`views2.js`, `ifc2.js`, `gl3d.js`, `chz.js`, `param.js`, `det.js`, `bal.js`, `binokor.template.html`, `plan2.template.html`, `editor.template.html` — muharrir UI prototiplari; yangi holati `mr/public/binokor-{korinish,ifc-gl,muharrir,param}.js` da. `build4.js`, `build_chz.py`, `yol-sinovi*.js` — artifaktdan qayta yigʻish va eski `index_new.html` ga yoʻl sinovi (CLAUDE.md: artifaktdan qayta yigʻish toʻxtatilgan). `binokor-safe.js`, `binokor-loyiha.js` — repoda bor (`mr/public/`).
