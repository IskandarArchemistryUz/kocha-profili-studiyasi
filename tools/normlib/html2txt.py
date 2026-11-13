#!/usr/bin/env python3
"""lex.uz «Word» eksporti (.doc = HTML) → oddiy matn: har xatboshi alohida qatorda, jadval kataklari « | » bilan.
Ishlatish: python3 html2txt.py kirish.doc chiqish.txt"""
import html, re, sys
from html.parser import HTMLParser

BLOCK = {'p', 'div', 'br', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'table'}


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.cur, self.skip, self.cells = [], [], 0, None

    def flush(self):
        t = re.sub(r'\s+', ' ', ''.join(self.cur)).strip()
        self.cur = []
        if t:
            if self.cells is not None: self.cells.append(t)
            else: self.out.append(t)

    def handle_starttag(self, tag, a):
        if tag in ('style', 'script', 'xml', 'head'): self.skip += 1
        elif tag == 'tr': self.flush(); self.cells = []
        elif tag in ('td', 'th'): self.flush()
        elif tag in BLOCK: self.flush()

    def handle_endtag(self, tag):
        if tag in ('style', 'script', 'xml', 'head'): self.skip = max(0, self.skip - 1)
        elif tag in ('td', 'th'): self.flush()
        elif tag == 'tr':
            self.flush()
            if self.cells: self.out.append(' | '.join(self.cells))
            self.cells = None
        elif tag in BLOCK: self.flush()

    def handle_data(self, d):
        if not self.skip: self.cur.append(d)


def main(src, dst):
    raw = open(src, encoding='utf-8', errors='replace').read()
    raw = re.sub(r'<!--.*?-->', '', raw, flags=re.S)
    p = P(); p.feed(raw); p.flush()
    open(dst, 'w', encoding='utf-8').write('\n'.join(p.out) + '\n')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
