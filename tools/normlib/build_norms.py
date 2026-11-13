#!/usr/bin/env python3
"""
Meʼyor band matnlari kutubxonasi (agent «Maslahatchi» — get_norm_clause) → server/src/data/norms.json

Manba: loyiha hujjatlari claude/normalar-txt/*.txt (lex.uz dan olingan joriy tahrirlar).
Ishlatish: python3 tools/normlib/build_norms.py <manba_papka>
  <manba_papka> ichida: ShNQ-2.07.01-23.txt, SHNQ-2.05.07-24.txt, SanQvaN-0103-25.txt, VM-101-2011.txt

Qoidalar:
- band — «N. matn» bilan boshlanadigan qator; keyingi bandgacha boʻlgan hamma qatorlar (xatboshilar, jadval, izoh) shu bandga.
- lex.uz matnida yuqori indeks yoʻqolgan: «61.» = 6¹, «1081.» = 108¹. Ketma-ketlikdan aniqlanadi
  (oldingi band p: N = p+1…p+3 — oddiy; N oldingi bandning raqamidan boshlansa va undan katta boʻlsa — yuqori indeks).
- «(N-band … tahririda / kiritilgan / toʻldirilgan)» qatorlari — tahrir izohi (amend).
- «N-bob», «N-§» sarlavhalari bandga qoʻshilmaydi; «N-ILOVA» — ilova matni alohida.
- Matn oʻzgartirilmaydi (soʻzma-soʻz). Faqat qator boshidagi/oxiridagi boʻshliq olinadi.
"""
import json, re, sys
from pathlib import Path

SUP = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')
DOCS = [
    dict(id='shnq-2.07.01-23', file='ShNQ-2.07.01-23.txt', doc='ShNQ 2.07.01-23',
         title='Aholi punktlarining hududlarini rivojlantirish va qurishni shaharsozlik jihatidan rejalashtirish',
         edition='joriy tahrir (01/2-42, 01/2-3, 01/2-14, 01/2-15, 01/2-24 buyruqlari bilan)', source='https://lex.uz', coverage='full', sparse=False),
    dict(id='shnq-2.05.07-24', file='SHNQ-2.05.07-24.txt', doc='SHNQ 2.05.07-24', title='Avtoturargohlar',
         edition='01/2-6 (24.01.2025), 01/2-32 (06.08.2026) tahriri bilan', source='https://lex.uz', coverage='partial', sparse=True),
    dict(id='sanqvan-0103-25', file='SanQvaN-0103-25.txt', doc='SanQvaN 0103-25', title='Sanitariya-muhofaza zonasiga doir sanitariya qoidalari, normalari va gigiyena normativlari',
         edition='2025 (SEO qoʻmitasi 15.08.2025 dagi 24-son qarori)', source='https://lex.uz', coverage='partial (1–17-bandlar, 3-ilova)', sparse=False),
    dict(id='vm-101-2011', file='VM-101-2011.txt', doc='VM 101-son qarori (04.04.2011)', title='Дафн этиш жойларини сақлаш … низом (1-илова)',
         edition='amaldagi tahrir (VM 153, 04.04.2022 bilan)', source='https://lex.uz/acts/1763518', coverage='partial (1-ilova, 50-band)', sparse=True),
]
CLAUSE = re.compile(r'^(\d+)\.\s+(\S.*)$')
HEAD = re.compile(r'^(\d+-bob\.|\d+-§\.|\d+¹?-bob\.)', re.I)
ANNEX = re.compile(r'^(\d+)-ILOVA$', re.I)
TABLE = re.compile(r'^[|\s]*(\d+)-jadva[lnb]\b', re.I)
AMEND = re.compile(r'^\((.+)(tahririda|kiritilgan|toʻldirilgan|oʻz kuchini yoʻqotgan|таҳририда)\)?\s*$')


def key_of(n: int, prev: int, sparse: bool):
    """(asosiy raqam, yuqori indeks yoki None) yoki None — band emas (jadval izohi va h.k.)"""
    s, ps = str(n), str(prev)
    if prev and s.startswith(ps) and len(s) > len(ps) and n > prev + 3 and s[len(ps)] != '0':
        r = int(s[len(ps):])
        if 1 <= r <= 20:
            return prev, r
    if sparse:
        return (n, None) if n > prev else None
    return (n, None) if prev < n <= prev + 3 else None


def parse(text: str, sparse: bool):
    lines = [l.strip() for l in text.replace('﻿', '').splitlines()]
    try:
        start = next(i for i, l in enumerate(lines) if l.upper() == 'ILOVA' or ANNEX.match(l))
    except StopIteration:
        start = 0
    clauses, tables, annexes = {}, {}, {}
    cur, base, prev, annex = None, 0, 0, None
    for l in lines[start + 1:]:
        if not l or l == '|':
            continue
        m = ANNEX.match(l)
        if m and (clauses or annexes):
            annex = m.group(1); annexes.setdefault(annex, []); cur = None; continue
        if annex is not None:
            annexes[annex].append(l); continue
        if HEAD.match(l):
            cur = None; continue
        m = CLAUSE.match(l)
        if m:
            k = key_of(int(m.group(1)), base, sparse)
            if k:
                n, sup = k
                key = f'{n}{str(sup).translate(SUP)}' if sup else str(n)
                if not sup:
                    base = n
                cur = clauses.setdefault(key, {'text': [], 'amend': []})
                cur['text'].append(re.sub(r'^\d+\.', key + '.', l, count=1) if sup else l); prev = n; continue
        a = AMEND.match(l)
        if a:
            ref = re.match(r'\((\d+)-band', l)
            tgt = clauses.get(ref.group(1)) if ref else None
            (tgt or cur or {'amend': []})['amend'].append(l.strip('()'))
            continue
        t = TABLE.match(l)
        if t and cur is not None:
            tables.setdefault(t.group(1), next(k for k, v in clauses.items() if v is cur))
        if cur is not None:
            cur['text'].append(l)
    out = {k: {'text': '\n'.join(v['text']), **({'amend': v['amend']} if v['amend'] else {})} for k, v in clauses.items()}
    return out, tables, {k: '\n'.join(v) for k, v in annexes.items() if v}


def main(src: str) -> None:
    res = []
    for d in DOCS:
        p = Path(src) / d['file']
        if not p.exists():
            print('yoʻq:', p); continue
        cl, tb, an = parse(p.read_text(encoding='utf-8'), d['sparse'])
        meta = {k: v for k, v in d.items() if k not in ('file', 'sparse')}
        res.append({**meta, 'clauses': cl, 'tables': tb, 'annexes': an})
        print(f"{d['doc']}: {len(cl)} band, {len(tb)} jadval, {len(an)} ilova")
    dst = Path(__file__).resolve().parents[2] / 'server' / 'src' / 'data' / 'norms.json'
    dst.write_text(json.dumps({'built': 'tools/normlib/build_norms.py', 'docs': res}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('→', dst, dst.stat().st_size, 'bayt')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
