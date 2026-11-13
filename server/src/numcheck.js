// «Manbasiz raqam» filtri (agent qoidasi 1): javobdagi har bir raqam shu yurishdagi
// buyruq natijalaridan, foydalanuvchi savolidan yoki ulardan oddiy hisob (farq, nisbat, ogʻish %) bilan olinishi kerak.
// Hujjat va band raqamlari (ShNQ 2.07.01-23, 84-band, 3-jadval, 5-ilova, № 376), roʻyxat raqamlari va 0–10 butun sonlar tekshirilmaydi.

const REF_AFTER = /^\s*-?\s*(band|bandi|bandga|bandda|modda|moddasi|jadval|jadvali|ilova|ilovasi|bob|bobi|qism|qismi|boʻlim|bo'lim|punkt|пункт|статья|таблиц|приложен|глав|clause|table|annex|article|section|chapter)/i;
const REF_BEFORE = /(№|N°|#|band|bandi|modda|jadval|ilova|bob|пункт|п\.|табл\.|прил\.|ст\.|clause|table|annex|article|section|step|qadam)\s*$/i;
const DOC_CODE = /\b(?:ShNQ|SHNQ|ШНК|QMQ|ҚМҚ|KMK|SanQvaN|СанҚваН|SNiP|СНиП|GOST|ГОСТ|VMQ|VM|ВМ|OʻRQ|O'RQ|ЎРҚ|PQ|ПҚ|PF|ПФ|UP|РД|SP|СП)[\s.№-]*[\d.\-–/]+/gi;
const NUM = /\d{1,3}(?:[    ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;

/** matndan raqamlar: [{ s: koʻrinishi, v: qiymat, d: kasr xonalari }] */
export function numbersIn(text) {
  const t = String(text ?? '')
    .replace(DOC_CODE, (m) => ' '.repeat(m.length))
    .replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, (m) => ' '.repeat(m.length)) // sanalar
    .replace(/\b\d{1,2}:\d{2}\b/g, (m) => ' '.repeat(m.length)) // soat
    .replace(/#[0-9a-f]{3,8}\b/gi, (m) => ' '.repeat(m.length)); // rang kodlari (#1a3d61)
  const out = [];
  for (const m of t.matchAll(NUM)) {
    const s = m[0], i = m.index, before = t.slice(Math.max(0, i - 12), i), after = t.slice(i + s.length, i + s.length + 14);
    if (REF_AFTER.test(after) || REF_BEFORE.test(before)) continue;
    // roʻyxat raqami: qator boshida «1.» yoki «1)»
    const lineStart = t.lastIndexOf('\n', i - 1) + 1;
    if (/^[\s>*#-]*$/.test(t.slice(lineStart, i)) && /^[.)]\s/.test(after)) continue;
    // 1.2.3 kabi boʻlim raqamlari
    if (/^\.\d/.test(after) || /\d\.$/.test(before)) continue;
    const norm = s.replace(/[    ]/g, '');
    // vergul: oʻzbek/rus kasr belgisi; nuqta ham kasr (en)
    const v = Number(norm.replace(',', '.'));
    if (!Number.isFinite(v)) continue;
    const d = (norm.split(/[.,]/)[1] ?? '').length;
    if (d === 0 && v <= 10) continue;
    out.push({ s, v, d });
  }
  return out;
}

/** manbalar: buyruq natijalari va foydalanuvchi matnidagi raqamlar */
export function sourceNumbers(messages) {
  const vals = [];
  for (const m of messages ?? []) {
    if (m.role !== 'user') continue;
    for (const b of m.content ?? []) {
      const txt = b.type === 'tool_result' ? b.content : b.type === 'text' ? b.text : '';
      if (!txt) continue;
      // JSON dagi sonlar (eksponent bilan ham) + matndagi oʻzbekcha yozuvlar
      for (const x of String(txt).matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)) { const v = Number(x[0]); if (Number.isFinite(v)) vals.push(Math.abs(v)); }
      for (const n of numbersIn(txt)) vals.push(n.v);
    }
  }
  return [...new Set(vals)];
}

function fits(v, d, x) {
  // koʻrsatilgan kasr xonalarigacha yaxlitlangan qiymat mos keladimi (0,5 birlik chekka bilan)
  const unit = 10 ** -d;
  return Math.abs(Math.abs(x) - v) <= unit * 0.5 + 1e-9 * Math.max(1, v);
}

/** manbasi topilmagan raqamlar (takrorsiz koʻrinishlar).
 *  Hisoblangan son (farq, yigʻindi, nisbat %, ogʻish %) faqat javobning oʻzida keltirilgan va manbasi bor sonlardan qabul qilinadi —
 *  masalan «499,44 kishi/ga, talab ≤ 400, ogʻish 24,9 %». Shunday qilib, tasodifiy moslik juda kam. */
export function unsourced(text, sources) {
  const nums = numbersIn(text);
  if (!nums.length) return [];
  const S = sources.slice(0, 2000);
  const ok = nums.filter((n) => S.some((x) => fits(n.v, n.d, x))).map((n) => n.v);
  const derived = [];
  for (let i = 0; i < ok.length; i++) for (let j = 0; j < ok.length; j++) {
    const a = ok[i], b = ok[j]; if (i === j) continue;
    derived.push(a - b, a + b);
    if (b) derived.push(a / b, (a / b) * 100, (a / b - 1) * 100, (1 - a / b) * 100);
  }
  const bad = [];
  for (const n of nums) {
    if (S.some((x) => fits(n.v, n.d, x)) || derived.some((x) => fits(n.v, n.d, x))) continue;
    if (!bad.includes(n.s)) bad.push(n.s);
  }
  return bad;
}
