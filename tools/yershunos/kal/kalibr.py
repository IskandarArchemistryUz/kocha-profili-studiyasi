import json, csv, re, difflib, sys
D = json.load(open('rasmiy_246.json', encoding='utf-8'))[0]['data']
VIL = {'1703':'Andijon','1706':'Buxoro','1708':'Jizzax','1710':'Qashqadaryo','1712':'Navoiy','1714':'Namangan','1718':'Samarqand',
       '1722':'Surxondaryo','1724':'Sirdaryo','1726':'Toshkent sh','1727':'Toshkent vil','1730':"Farg'ona",'1733':'Xorazm','1735':"Qoraqalpog'iston"}
def norm(s):
    s = s.lower()
    for a in "‘’ʻʼ`'ʹ": s = s.replace(a, "")
    s = s.replace("ı","i").replace("w","v")
    s = re.sub(r"\(.*?\)", "", s).replace("sergeli", "sirgali")
    s = re.sub(r"\b(tumani|tuman|shahri|shahar|hokimiyati|rayoni|rayon|viloyati)\b", "", s)
    s = re.sub(r"[^a-z]", "", s)
    return re.sub(r"(shahri|tumani)$", "", s)
def tur(s):
    s = s.lower(); return 't' if ('tuman' in s or 'rayon' in s) else 'sh'
def vkey(v):
    vil = 'viloyat' in v.lower(); v = norm(v)
    if v == 'toshkent': return 'Toshkent vil' if vil else 'Toshkent sh'
    for k in VIL.values():
        if norm(k.replace(' sh','').replace(' vil','')) == v: return k
    return "Qoraqalpog'iston" if not v else v
R = [r for r in D if len(str(r['Code'])) == 7]
O = [r for r in csv.DictReader(open('uzb_birliklar_osm.csv', encoding='utf-8-sig')) if r['tur'] == 'county']
for o in O: o['_v'] = vkey(o['vil']); o['_n'] = norm(o['nom']); o['_t'] = tur(o['nom'])
used = set(); M = []; yoq = []; QOSH = {}
def top(r, qatiy):
    v = VIL[str(r['Code'])[:4]]; n = norm(r['Klassifikator']); t = tur(r['Klassifikator'])
    c = [o for o in O if o['_v'] == v and id(o) not in used]
    for o in c:
        if o['_n'] == n and o['_t'] == t: return o
    if qatiy: return None
    sc = sorted(((difflib.SequenceMatcher(None, n, o['_n']).ratio(), o) for o in c if o['_t'] == t), key=lambda x: -x[0])
    return sc[0][1] if sc and sc[0][0] >= 0.8 else None
qolgan = []
for r in R:
    o = top(r, True)
    if o: used.add(id(o)); M.append((r, o))
    else: qolgan.append(r)
for r in qolgan:
    o = top(r, False)
    if o: used.add(id(o)); M.append((r, o)); continue
    # shahar poligoni OSMda yo'q: shu nomli tuman poligoniga qo'shiladi
    v = VIL[str(r['Code'])[:4]]; n = norm(r['Klassifikator'])
    m = [(rr, oo) for rr, oo in M if oo['_v'] == v and oo['_n'] == n]
    if m: QOSH.setdefault(m[0][0]['Code'], []).append(r)
    else: yoq.append((v, r['Klassifikator']))
# OSMdagi yangi birlik (Davlatobod) — Namangan shahriga qo'shiladi
GQ = {}
for o in O:
    if id(o) not in used and o['_n'] == 'davlatobod':
        GQ['namangan'] = o; used.add(id(o))
for r, o in M:
    for q in QOSH.get(r['Code'], []):
        for y in map(str, range(2010, 2027)): r[y] = r[y] + q[y]
        r['Klassifikator'] += ' + ' + q['Klassifikator']
    if o['_n'] in GQ and o['_t'] == 'sh':
        g = GQ[o['_n']]
        for k in ('aholi_2020', 'km2', 'wup_2020', 'wup_2050', 'wup_2100'): o[k] = str(float(o[k] or 0) + float(g[k] or 0))
        o['nom'] += ' + ' + g['nom']
print('mos:', len(M), '/', len(R), '· rasmiyda bor, OSMda topilmadi:', yoq)
print('OSMda bor, rasmiyga mos kelmadi:', [(o['_v'], o['nom']) for o in O if id(o) not in used])
out = []
for r, o in M:
    g20 = float(o['aholi_2020'] or 0); r20 = (r['2020'] + r['2021']) / 2 * 1000
    out.append({'kod': r['Code'], 'vil': VIL[str(r['Code'])[:4]], 'rasmiy_nom': r['Klassifikator'], 'osm_nom': o['nom'], 'km2': o['km2'],
                'rasmiy_2010': round(r['2010']*1000), 'rasmiy_2020': round(r20), 'rasmiy_2026': round(r['2026']*1000),
                'ghs_2020': round(g20), 'k_2020': round(r20 / g20, 2) if g20 > 0 else '',
                'rasmiy_osish_2010_2026_%': round((r['2026']/r['2010']-1)*100, 1) if r['2010'] > 0 else '',
                'zichlik_2026_kishi_km2': round(r['2026']*1000/float(o['km2'])) if float(o['km2']) > 0 else '',
                'shahar_ulushi_smod_2020': o.get('shahar_ulushi_2020', ''), 'wup_2020': o.get('wup_2020', ''), 'wup_2050': o.get('wup_2050', ''), 'wup_2100': o.get('wup_2100', '')})
w = csv.DictWriter(open('uzb_kalibrlangan.csv', 'w', newline='', encoding='utf-8-sig'), fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
json.dump(out, open('uzb_kalibrlangan.json', 'w', encoding='utf-8'), ensure_ascii=False)
