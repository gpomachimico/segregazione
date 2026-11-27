# Genera js/imballaggi.js: istruzioni di imballaggio P, IBC e LP (IMDG 42-24, 4.1.4) come riproduzione vettoriale
# delle pagine del PDF ufficiale (testo e riquadri nelle posizioni originali), più le istruzioni per cisterne mobili
# (4.2.5.2.6) e le disposizioni speciali TP (4.2.5.3).
# Uso: python3 tools/build_imballaggi.py <PDF IMDG 42-24> js/imballaggi.js
import pdfplumber, re, json, sys
pdf = pdfplumber.open(sys.argv[1])
Y0, Y1, X0, X1 = 80, 795, 30, 566          # area utile della pagina (senza testata, piè di pagina e linguetta)
TIT = re.compile(r'^(?:[4△]\s+)?((?:P\d{3}|LP\d{2,3}|IBC\d{2,3})(?:\([a-c]\))?)\s+PACKING INSTRUCTION\b.*\s\1$')
SEZ = re.compile(r'^4\.1\.(4\.[1-4]|5)\b')
CODICE = re.compile(r'^(PP\d+|B\d+|L\d+|T\d+)$')

TIT_T = re.compile(r'^(?:[4△]\s+)?(T1 – T22|T23|T50|T75)\s+PORTABLE TANK INSTRUCTIONS?\b')
SEZ_T = re.compile(r'^4\.2\.5\.(2\.5|2\.6|3)\b')
def segmenti(n0=172, n1=250, tit=TIT, sez=SEZ, xs=100):
    """[(codice, pagina, y_inizio, y_fine)] dalle righe di titolo; un'istruzione prosegue fino al titolo successivo."""
    eventi = []
    for n in range(n0, n1):
        p = pdf.pages[n - 1]
        for l in p.extract_text_lines():
            if not (Y0 < l['top'] < Y1): continue
            tx = l['text'].strip(); m = tit.match(tx)
            if m and '(continued)' not in tx: eventi.append((n, l['top'] - 3, m.group(1)))
            elif sez.match(tx) and l['x0'] < xs:
                eventi.append((n, l['top'] - 3, 'T-ALT' if tx.startswith('4.2.5.2.5') else None))
    out = []
    for i, (n, y, cod) in enumerate(eventi):
        if not cod: continue
        n2, y2, _ = eventi[i + 1] if i + 1 < len(eventi) else (n1, Y0, None)
        for pg in range(n, n2 + 1):
            a = y if pg == n else Y0
            b = y2 if pg == n2 else Y1
            if b - a > 8: out.append((cod, pg, a, b))
    return out

def regione(pg, a, b):
    p = pdf.pages[pg - 1]
    W = [w for w in p.extract_words(extra_attrs=['size', 'fontname'], keep_blank_chars=False)
         if a <= w['top'] < b and X0 <= w['x0'] and w['x1'] <= X1]
    if not W: return None
    # parole vicine sulla stessa riga e con lo stesso carattere -> un solo tratto di testo
    W.sort(key=lambda w: (round(w['bottom']), w['x0']))
    T = []
    for w in W:
        f = ('b' if 'Bold' in w['fontname'] else '') + ('i' if 'Italic' in w['fontname'] or 'Oblique' in w['fontname'] else '')
        s = round(w['size'], 1)
        if T and abs(T[-1]['bottom'] - w['bottom']) < 1 and T[-1]['f'] == f and T[-1]['s'] == s and 0 <= w['x0'] - T[-1]['x1'] < s * 0.6 \
                and not CODICE.match(T[-1]['t']):
            T[-1]['t'] += ' ' + w['text']; T[-1]['x1'] = w['x1']
        else:
            T.append({'x0': w['x0'], 'x1': w['x1'], 'bottom': w['bottom'], 's': s, 'f': f, 't': w['text']})
    E = []
    for e in p.edges:
        x0, x1, t0, t1 = e['x0'], e['x1'], e['top'], e['bottom']
        if t1 < a - 1 or t0 > b + 1 or x1 < X0 or x0 > X1: continue
        t0, t1 = max(t0, a), min(t1, b)
        E.append([round(x0, 1), round(t0, 1), round(x1, 1), round(t1, 1)])
    xs = [t['x0'] for t in T] + [e[0] for e in E]; xe = [t['x1'] for t in T] + [e[2] for e in E]
    yb = max([t['bottom'] for t in T] + [e[3] for e in E])
    return {'pg': pg, 'vb': [round(min(xs) - 2, 1), round(a, 1), round(max(xe) - min(xs) + 4, 1), round(min(b, yb + 3) - a, 1)],
            'e': E, 't': [[round(t['x0'], 1), round(t['bottom'] - 0.2 * t['s'], 1), t['s'], round(t['x1'] - t['x0'], 1), t['f'], t['t']] for t in T]}

ISTR = {}
for cod, pg, a, b in segmenti():
    r = regione(pg, a, b)
    if r: ISTR.setdefault(cod, []).append(r)

# ---------- cisterne mobili: 4.2.5.2.5 (alternative), 4.2.5.2.6 (T1–T22, T23, T50, T75) e disposizioni TP (4.2.5.3) ----------
CIST = {}
for cod, pg, a, b in segmenti(265, 274, TIT_T, SEZ_T, 110):
    r = regione(pg, a, b)
    if r: CIST.setdefault(cod.replace(' – ', '-'), []).append(r)
def testo_pagine(n0, n1):
    s = ''
    for n in range(n0, n1 + 1):
        p = pdf.pages[n - 1]
        s += '\n'.join(l['text'] for l in p.extract_text_lines() if Y0 < l['top'] < Y1 and l['x0'] >= X0) + '\n'
    return s
TP = {}
TIT_TP = re.compile(r'^(TP\d+)\s')
SEZ_TP = re.compile(r'^4\.2\.6\b')
for cod, pg, a, b in segmenti(273, 277, TIT_TP, SEZ_TP, 110):
    if pg == 273 and cod == 'TP1' and False: pass
    r = regione(pg, a, b)
    if r: TP.setdefault(cod, []).append(r)
json.dump({'istr': ISTR, 'cist': CIST, 'tp': TP}, open('/tmp/imb_raw.json', 'w'))
out = {'fonte': 'IMDG Code 42-24 (MSC 108/20/Add.2), 4.1.4 e 4.2.5', 'istr': ISTR, 'cist': CIST, 'tp': TP}
open(sys.argv[2], 'w').write('// Istruzioni di imballaggio e cisterne – generato da tools/build_imballaggi.py, non modificare a mano\nDATA.imb = '
                             + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(ISTR), 'istruzioni;', {k: [r['pg'] for r in v] for k, v in CIST.items()}, sum(len(v) for v in ISTR.values()), 'regioni;', len(TP), 'TP')
