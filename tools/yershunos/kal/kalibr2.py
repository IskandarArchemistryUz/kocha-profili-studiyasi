# Yershunos · rasmiy aholi (SIAT 246) × GHS-POP (OSM chegaralar) — kalibrlash, 2-talqin
# Kirish:  rasmiy_246.json, uzb_birliklar_osm.csv   Chiqish: uzb_kalibrlangan2.csv/json, uzb_dinamika.csv, uzb_shahar_atrofi.csv
import json, csv, re, difflib, statistics as st
from collections import defaultdict

D = json.load(open('rasmiy_246.json', encoding='utf-8'))[0]['data']
YIL = [str(y) for y in range(2010, 2027)]
VIL = {'1703': 'Andijon', '1706': 'Buxoro', '1708': 'Jizzax', '1710': 'Qashqadaryo', '1712': 'Navoiy', '1714': 'Namangan',
       '1718': 'Samarqand', '1722': 'Surxondaryo', '1724': 'Sirdaryo', '1726': 'Toshkent sh', '1727': 'Toshkent vil',
       '1730': "Farg'ona", '1733': 'Xorazm', '1735': "Qoraqalpog'iston"}
QOSHILUVCHI = ['km2', 'aholi_1980', 'aholi_1990', 'aholi_2000', 'aholi_2010', 'aholi_2020', 'aholi_2030', 'wup_2020', 'wup_2050', 'wup_2100']


def norm(s):
    s = s.lower()
    for a in "‘’ʻʼ`'ʹ":
        s = s.replace(a, "")
    s = s.replace("ı", "i").replace("w", "v")
    s = re.sub(r"\(.*?\)", "", s).replace("sergeli", "sirgali")
    s = re.sub(r"\b(tumani|tuman|shahri|shahar|hokimiyati|rayoni|rayon|viloyati)\b", "", s)
    s = re.sub(r"[^a-z]", "", s)
    return re.sub(r"(shahri|tumani)$", "", s)


def tur(s):
    s = s.lower()
    return 't' if ('tuman' in s or 'rayon' in s) else 'sh'


def vkey(v):
    vil = 'viloyat' in v.lower()
    n = norm(v)
    if n == 'toshkent':
        return 'Toshkent vil' if vil else 'Toshkent sh'
    for k in VIL.values():
        if norm(k.replace(' sh', '').replace(' vil', '')) == n:
            return k
    return "Qoraqalpog'iston" if not n else n


def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


R = [r for r in D if len(str(r['Code'])) == 7]
RV = {VIL[str(r['Code'])]: r for r in D if str(r['Code']) in VIL}
OSM = list(csv.DictReader(open('uzb_birliklar_osm.csv', encoding='utf-8-sig')))
O = [o for o in OSM if o['tur'] == 'county']
OV = {vkey(o['nom']): o for o in OSM if o['tur'] == 'region'}
for o in O:
    o['_v'] = vkey(o['vil']); o['_n'] = norm(o['nom']); o['_t'] = tur(o['nom'])


def yig(lst, nom):
    """OSM birliklarini qo'shib, bitta sun'iy birlik qaytaradi."""
    z = {'nom': nom, '_az': [a for o in lst for a in o.get('_az', [[o.get('vil', ''), o['nom']]])]}
    for k in QOSHILUVCHI:
        z[k] = sum(f(o.get(k)) for o in lst)
    return z


def qoldiq(v):
    """Viloyat poligoni minus shu viloyatdagi barcha tuman poligonlari (OSMda alohida chegarasi yo'q shahar)."""
    z = {'nom': 'qoldiq', '_az': [['__qoldiq__', v]]}
    for k in QOSHILUVCHI:
        z[k] = f(OV[v].get(k)) - sum(f(o.get(k)) for o in O if o['_v'] == v)
    return z


def osm(v, n, t):
    m = [o for o in O if o['_v'] == v and o['_n'] == n and o['_t'] == t]
    return m[0] if m else None


def ras(v, n, t):
    m = [r for r in R if VIL[str(r['Code'])[:4]] == v and norm(r['Klassifikator']) == n and tur(r['Klassifikator']) == t]
    return m[0] if m else None


# --- 1. Qo'lda belgilangan moslik (sababi izohda) ---------------------------------------------------------------
used_o, used_r, M = set(), set(), []   # M: (rasmiy qatorlar ro'yxati, osm-birlik, izoh)
# Namangan shahri: OSMda shahar ikki tumanga bo'lingan (Davlatobod 2020, Yangi Namangan 2021) + chegarasiz qoldiq o'zak
q = qoldiq('Namangan'); dv = osm('Namangan', 'davlatobod', 't'); yn = osm('Namangan', 'yanginamangan', 't')
M.append(([ras('Namangan', 'namangan', 'sh')], yig([dv, yn, q], 'Davlatobod t. + Yangi Namangan t. + viloyat qoldig\'i'),
          'shahar = ikki shahar tumani + OSMda chegarasi yo\'q o\'zak (viloyat − tumanlar)'))
used_o |= {id(dv), id(yn)}; used_r.add('1714401')
# Jizzax shahri: OSMda alohida chegara yo'q, viloyat qoldig'i sifatida olinadi
M.append(([ras('Jizzax', 'jizzax', 'sh')], yig([qoldiq('Jizzax')], 'viloyat qoldig\'i (Jizzax viloyati − tumanlar)'),
          'shahar chegarasi OSMda yo\'q; viloyat poligonidan tumanlar ayirildi'))
used_r.add('1708401')
# Yangi Toshkent tumani (2024): rasmiy qatorda yo'q, aholisi hali Yuqorichirchiq va O'rtachirchiq hisobida
yt = osm('Toshkent sh', 'yangitoshkent', 't'); yu = osm('Toshkent vil', 'yuqorichirchiq', 't'); ur = osm('Toshkent vil', 'ortachirchiq', 't')
ryu = ras('Toshkent vil', 'yuqorichirchiq', 't'); rur = ras('Toshkent vil', 'ortachirchiq', 't')
if yt and yu and ur and ryu and rur:
    M.append(([ryu, rur], yig([yu, ur, yt], "Yuqorichirchiq t. + O'rtachirchiq t. + Yangi Toshkent t."),
              "Yangi Toshkent tumani rasmiy qatorda yo'q; uch poligon bitta birlik sifatida"))
    used_o |= {id(yt), id(yu), id(ur)}; used_r |= {ryu['Code'], rur['Code']}

# --- 2. Avtomatik moslik: avval nom+tur aynan, keyin o'xshashlik ≥ 0.8 -----------------------------------------
def top(r, qatiy):
    v = VIL[str(r['Code'])[:4]]; n = norm(r['Klassifikator']); t = tur(r['Klassifikator'])
    c = [o for o in O if o['_v'] == v and id(o) not in used_o]
    for o in c:
        if o['_n'] == n and o['_t'] == t:
            return o
    if qatiy:
        return None
    sc = sorted(((difflib.SequenceMatcher(None, n, o['_n']).ratio(), o) for o in c if o['_t'] == t), key=lambda x: -x[0])
    return sc[0][1] if sc and sc[0][0] >= 0.8 else None


qolgan = []
for r in R:
    if r['Code'] in used_r:
        continue
    o = top(r, True)
    if o:
        used_o.add(id(o)); used_r.add(r['Code']); M.append(([r], o, ''))
    else:
        qolgan.append(r)
yoq = []
for r in qolgan:
    o = top(r, False)
    if o:
        used_o.add(id(o)); used_r.add(r['Code']); M.append(([r], o, "nom o'xshashligi bo'yicha"))
        continue
    # shahar poligoni OSMda yo'q va viloyatda qoldiq ham yo'q -> shu nomli tuman poligoni ichida
    v = VIL[str(r['Code'])[:4]]; n = norm(r['Klassifikator'])
    m = [x for x in M if len(x[0]) >= 1 and VIL[str(x[0][0]['Code'])[:4]] == v and norm(x[0][0]['Klassifikator']) == n]
    if m:
        m[0][0].append(r); used_r.add(r['Code'])
    else:
        yoq.append((v, r['Klassifikator'], r['2026']))
osm_ortiq = [(o['_v'], o['nom']) for o in O if id(o) not in used_o]

# --- 3. Chegara o'zgarishlari: rasmiy qatordagi sakrashlardan barqaror guruhlar ---------------------------------
def osish(r):
    return [(b, r[b] / r[a] - 1) if r[a] > 0 else (b, None) for a, b in zip(YIL, YIL[1:])]


hodisa = defaultdict(list)      # (makro-viloyat, yil) -> [(kod, belgi)]
for r in R:
    g = osish(r); med = st.median([x for _, x in g if x is not None] or [0])
    mv = 'Toshkent' if str(r['Code'])[:4] in ('1726', '1727') else str(r['Code'])[:4]
    for (y, x), a in zip(g, YIL):
        if x is None:
            if r[y] > 0:
                hodisa[(mv, y)].append((r['Code'], +1))
        elif abs(x - med) > 0.05:
            hodisa[(mv, y)].append((r['Code'], 1 if x > med else -1))
ota = {r['Code']: r['Code'] for r in R}


def top_ota(k):
    while ota[k] != k:
        k = ota[k]
    return k


ozg = {}                         # kod -> oxirgi chegara o'zgarishi yili
for (mv, y), lst in hodisa.items():
    if {b for _, b in lst} == {1, -1}:           # bir yilda ham beruvchi, ham oluvchi bor -> chegara o'zgarishi
        k0 = top_ota(lst[0][0])
        for k, _ in lst:
            ota[top_ota(k)] = k0; ozg[k] = max(ozg.get(k, '0'), y)
guruh = defaultdict(list)
for r in R:
    guruh[top_ota(r['Code'])].append(r)

# 2020-yildan keyin chegarasi o'zgargan birliklar: k faqat guruh darajasida ma'noli (2020 rasmiy soni eski chegarada)
kech = defaultdict(list); M2 = []
for rs, o, izoh in M:
    ky = [top_ota(r['Code']) for r in rs if ozg.get(r['Code'], '0') > '2020']
    (kech[ky[0]] if ky else M2).append((rs, o, izoh)) if ky else M2.append((rs, o, izoh))
for k0, lst in kech.items():
    M2.append(([r for rs, _, _ in lst for r in rs], yig([o for _, o, _ in lst], ' + '.join(o['nom'] for _, o, _ in lst)),
               "chegara 2020-yildan keyin o'zgargan; k guruh bo'yicha"))
M = M2

# --- 4. Chiqish: kalibrlash jadvali -----------------------------------------------------------------------------
RK = {r['Code']: r for r in R}
out = []
for rs, o, izoh in M:
    r20 = sum((r['2020'] + r['2021']) / 2 for r in rs) * 1000
    r10 = sum(r['2010'] for r in rs) * 1000; r26 = sum(r['2026'] for r in rs) * 1000
    g20, g10, km = f(o['aholi_2020']), f(o['aholi_2010']), f(o['km2'])
    barqaror = all(r['Code'] not in ozg for r in rs)
    out.append({
        'kod': '+'.join(r['Code'] for r in rs), 'vil': VIL[str(rs[0]['Code'])[:4]],
        'rasmiy_nom': ' + '.join(r['Klassifikator'].replace('‘', "'").replace('’', "'") for r in rs), 'osm_birlik': o['nom'],
        'km2': round(km, 1), 'rasmiy_2010': round(r10), 'rasmiy_2020': round(r20), 'rasmiy_2026': round(r26),
        'ghs_2010': round(g10), 'ghs_2020': round(g20),
        'k_2020': round(r20 / g20, 3) if g20 > 0 else '',
        'k_2010': round(r10 / g10, 3) if (g10 > 0 and r10 > 0 and barqaror) else '',
        'zichlik_2026_kishi_km2': round(r26 / km) if km > 0 else '',
        'chegara_ozgargan_yil': max((ozg.get(r['Code'], '') for r in rs), default=''),
        'wup_2020': round(f(o.get('wup_2020'))), 'wup_2050': round(f(o.get('wup_2050'))), 'wup_2100': round(f(o.get('wup_2100'))),
        'izoh': izoh, '_az': o.get('_az', [[o.get('vil', ''), o['nom']]]), '_kodlar': [r['Code'] for r in rs]})
out.sort(key=lambda x: x['kod'])
for x in out:                                    # chegaradan tozalangan o'sish: qator tegib o'tgan barcha guruhlar birlashmasi
    gs = {top_ota(k) for k in x['_kodlar']}
    rs = [r for g in gs for r in guruh[g]]
    a, b = sum(r['2010'] for r in rs), sum(r['2026'] for r in rs)
    x['osish_2010_2026_%'] = round((b / a - 1) * 100, 1); x['yillik_%'] = round(((b / a) ** (1 / 16) - 1) * 100, 2)
    x['_s'] = [round(sum(r[y] for r in rs), 1) for y in YIL]          # yillik qator (ming kishi), guruh bo'yicha
    w20, w50 = x['wup_2020'], x['wup_2050']
    x['prognoz_2050'] = round(x['rasmiy_2020'] * w50 / w20) if w20 > 0 else ''   # GHS-WUP o'sish sur'ati × rasmiy son
    if len(rs) != len(x['_kodlar']):                 # guruh a'zosi: o'z chegarasidagi barqaror davr (oxirgi o'zgarishdan keyin)
        own = [RK[k] for k in x['_kodlar']]; y0 = max(ozg.get(k, '2010') for k in x['_kodlar'])
        q = [round(sum(r[y] for r in own), 1) for y in YIL if y >= y0]
        x['_oz'] = {'y0': int(y0), 's': q, 'y': round(((q[-1] / q[0]) ** (1 / (2026 - int(y0))) - 1) * 100, 2)}
    x['osish_birligi'] = '' if len(rs) == len(x['_kodlar']) else ' + '.join(r['Klassifikator'].replace('‘', "'").replace('’', "'") for r in rs)
json.dump(out, open('osm_moslik.json', 'w', encoding='utf-8'), ensure_ascii=False)
VN = {v: (v + ' viloyati') for v in VIL.values()}; VN.update({'Toshkent sh': 'Toshkent shahri', 'Toshkent vil': 'Toshkent viloyati', "Qoraqalpog'iston": "Qoraqalpog'iston Respublikasi"})
vj = {VN[v]: [RV[v][y] for y in YIL] for v in VIL.values()}; vj["O'zbekiston"] = [D[0][y] for y in YIL]
json.dump({'nom': VN, 'qator': vj}, open('vil.json', 'w', encoding='utf-8'), ensure_ascii=False)
for x in out:
    x.pop('_az'); x.pop('_kodlar'); x.pop('_s'); x.pop('_oz', None)
w = csv.DictWriter(open('uzb_kalibrlangan2.csv', 'w', newline='', encoding='utf-8-sig'), fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
json.dump(out, open('uzb_kalibrlangan2.json', 'w', encoding='utf-8'), ensure_ascii=False)

# --- 5. Chiqish: chegara o'zgarishidan tozalangan dinamika ------------------------------------------------------
din = []
for k0, rs in guruh.items():
    s = {y: sum(r[y] for r in rs) for y in YIL}
    din.append({'kod': '+'.join(sorted(r['Code'] for r in rs)), 'vil': VIL[str(rs[0]['Code'])[:4]],
                'birlik': ' + '.join(r['Klassifikator'].replace('‘', "'").replace('’', "'") for r in rs), 'tarkib_soni': len(rs),
                'rasmiy_2010': round(s['2010'] * 1000), 'rasmiy_2018': round(s['2018'] * 1000), 'rasmiy_2026': round(s['2026'] * 1000),
                'osish_2010_2026_%': round((s['2026'] / s['2010'] - 1) * 100, 1), 'osish_2018_2026_%': round((s['2026'] / s['2018'] - 1) * 100, 1),
                'yillik_%': round(((s['2026'] / s['2010']) ** (1 / 16) - 1) * 100, 2),
                'qoshimcha_kishi_2010_2026': round((s['2026'] - s['2010']) * 1000)})
din.sort(key=lambda x: -x['osish_2010_2026_%'])
w = csv.DictWriter(open('uzb_dinamika.csv', 'w', newline='', encoding='utf-8-sig'), fieldnames=list(din[0])); w.writeheader(); w.writerows(din)

# --- 6. Shahar atrofi ko'rsatkichi: markaz shahar va uni o'rab turgan tuman ------------------------------------
JUFT = {('Navoiy', 'navoiy'): ['karmana'], ('Jizzax', 'jizzax'): ['sharofrashidov'], ('Buxoro', 'kogon'): ['kogon'],
        ('Farg\'ona', 'margilon'): ['fargona'], ('Farg\'ona', 'qoqon'): ['dangara', 'uchkoprik']}
sa = []
for r in R:
    if tur(r['Klassifikator']) != 'sh':
        continue
    v = VIL[str(r['Code'])[:4]]; n = norm(r['Klassifikator'])
    hal = [ras(v, x, 't') for x in JUFT.get((v, n), [n])]
    hal = [h for h in hal if h]
    if not hal or v == 'Toshkent sh':
        continue
    y0 = max([ozg.get(x['Code'], '2010') for x in [r] + hal])       # oxirgi chegara o'zgarishidan keyingi barqaror davr
    y0 = max(y0, '2010'); n_y = 2026 - int(y0)
    if n_y < 4:
        continue
    c0, c1 = r[y0], r['2026']; h0, h1 = sum(x[y0] for x in hal), sum(x['2026'] for x in hal)
    gc = ((c1 / c0) ** (1 / n_y) - 1) * 100; gh = ((h1 / h0) ** (1 / n_y) - 1) * 100
    sa.append({'vil': v, 'shahar': r['Klassifikator'].replace('‘', "'"), 'halqa': ' + '.join(x['Klassifikator'].replace('‘', "'") for x in hal),
               'davr': f'{y0}-2026', 'shahar_2026': round(c1 * 1000), 'halqa_2026': round(h1 * 1000),
               'shahar_yillik_%': round(gc, 2), 'halqa_yillik_%': round(gh, 2), 'farq_pp': round(gh - gc, 2),
               'osimdagi_halqa_ulushi_%': round((h1 - h0) / ((h1 - h0) + (c1 - c0)) * 100)})
sa.sort(key=lambda x: -x['farq_pp'])
w = csv.DictWriter(open('uzb_shahar_atrofi.csv', 'w', newline='', encoding='utf-8-sig'), fieldnames=list(sa[0])); w.writeheader(); w.writerows(sa)

# --- 7. Tekshiruv va xulosa --------------------------------------------------------------------------------------
print('rasmiy birlik:', len(R), '· moslangan:', len(used_r), '· topilmadi:', yoq, '· OSMda ortiqcha:', osm_ortiq)
print('rasmiy 2020 (mos birliklar yig\'indisi):', round(sum(x['rasmiy_2020'] for x in out)), '· respublika:', round((D[0]['2020'] + D[0]['2021']) / 2 * 1000))
print('GHS 2020 yig\'indisi:', sum(x['ghs_2020'] for x in out))
ks = [x['k_2020'] for x in out if x['k_2020'] != '']
print('k_2020: n', len(ks), 'mediana', round(st.median(ks), 2), '· 0.8–1.25 ichida', round(sum(0.8 <= k <= 1.25 for k in ks) / len(ks) * 100), '%')
pr = [(x['k_2010'], x['k_2020']) for x in out if x['k_2010'] != '' and x['k_2020'] != '']
d = [abs(b / a - 1) for a, b in pr]
print('k barqarorligi 2010→2020 (chegarasi o\'zgarmagan', len(pr), 'birlik): |Δk| medianasi', round(st.median(d) * 100, 1), '% · 10 % dan kam o\'zgargan',
      round(sum(x < 0.10 for x in d) / len(d) * 100), '% · 25 % dan ko\'p', sum(x > 0.25 for x in d))
print('chegara guruhlari:', [(g['birlik'], g['osish_2010_2026_%']) for g in din if g['tarkib_soni'] > 1])
print('eng tez o\'sgan 12:', [(g['birlik'], g['osish_2010_2026_%']) for g in din[:12]])
print('eng sekin 8:', [(g['birlik'], g['osish_2010_2026_%']) for g in din[-8:]])
print('shahar atrofi:'); [print('  ', x['shahar'], '|', x['halqa'], x['davr'], x['shahar_yillik_%'], x['halqa_yillik_%'], x['farq_pp'], x['osimdagi_halqa_ulushi_%']) for x in sa]
# viloyat darajasi (Qoraqalpog'iston: viloyat poligoni yo'q, tumanlar yig'indisi)
print('viloyatlar k:')
for kod, v in VIL.items():
    g = f(OV[v]['aholi_2020']) if v in OV else sum(f(o['aholi_2020']) for o in O if o['_v'] == v)
    r20 = (RV[v]['2020'] + RV[v]['2021']) / 2 * 1000
    print('  ', v, round(r20), round(g), round(r20 / g, 2), '' if v in OV else '(tumanlar yig\'indisi)')
