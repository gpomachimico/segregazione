# Genera js/ems.js dalle schede EmS di MSC.1/Circ.1588/Rev.4 (PDF del Segretariato IMO, 14/07/2026)
# Uso: python3 tools/build_ems.py <pdf> js/ems.js
import pdfplumber, re, json, sys
pdf = pdfplumber.open(sys.argv[1])

def righe(words, tol=3):
    L = []
    for w in sorted(words, key=lambda w: (round(w['top']), w['x0'])):
        if L and abs(L[-1]['top'] - w['top']) < tol: L[-1]['w'].append(w); L[-1]['bottom'] = max(L[-1]['bottom'], w['bottom'])
        else: L.append({'top': w['top'], 'bottom': w['bottom'], 'w': [w]})
    for l in L: l['t'] = ' '.join(x['text'] for x in sorted(l['w'], key=lambda x: x['x0']))
    return L
def unisci(ls):
    s = ''
    for t in ls:
        if re.search(r'[a-z]-$', s): s = s + t
        else: s = (s + ' ' + t).strip()
    return s
def paragrafi(p, bb, gap=6):
    if not bb: return []
    B = []
    for l in righe(p.crop(bb).extract_words()):
        if B and l['top'] - B[-1][-1]['bottom'] < gap: B[-1].append(l)
        else: B.append([l])
    return [unisci([l['t'] for l in b]) for b in B]
def testo(p, bb):
    return re.sub(r'\s+', ' ', (p.crop(bb).extract_text() or '')).strip() if bb else ''

S = {}; ordine = []; cur = None; spec = {}
for pi, p in enumerate(pdf.pages):
    txt = p.extract_text() or ''
    if re.search(r'^Index\b', txt, re.M): cur = None
    m = re.search(r'^([FS])[–-]([A-Z])\s*$', txt, re.M)
    if m and re.search(r'(FIRE|SPILLAGE) SCHEDULE', txt):
        cod = m.group(1) + '-' + m.group(2)
        if cod not in S:
            lines = txt.split('\n'); j = [i for i, l in enumerate(lines) if re.match(r'^[FS][–-][A-Z]\s*$', l)][0]
            S[cod] = {'t': lines[j + 1].strip(), 'r': [], 'pag': pi + 1}; ordine.append(cod); spec[cod] = []
        cur = S[cod]; ccod = cod
    if not cur: continue
    for tb in p.find_tables():
        for row in tb.rows:
            c = row.cells
            if len(c) < 2:
                continue  # "Special cases: None."
            a = testo(p, c[0]).replace('Temperat ure', 'Temperature'); b = testo(p, c[1]) if len(c) > 2 else ''
            dx = c[-1]; par = paragrafi(p, dx) if dx else []
            if a.startswith('Special cases') or re.match(r'^UN \d{4}', a):
                spec[ccod] += par; cur['spec'] = True; continue
            if not a and not b and cur.get('spec') and par:
                spec[ccod] += par; continue  # casi speciali che proseguono nella pagina successiva
            prev = cur['r'][-1] if cur['r'] else None
            if not a and not b:
                if prev: prev['p'] += par
                continue
            if not a and prev: a = prev['l'][-1][0]
            if dx is None and prev:
                prev['l'].append([a, b]); continue  # stessa cella di testo della riga precedente
            cur['r'].append({'l': [[a, b]], 'p': par})

# Special cases: abbinamenti verificati a mano sul PDF (ordine dei paragrafi e contenuto). [criterio, numeri ONU, indici dei paragrafi]
SC = {
 'F-A': [['', ['1381', '2447'], [0]]],
 'F-B': [['', ['0018', '0019', '0020', '0021', '0301'], [0]], ['', ['0248', '0249'], [1]], ['', ['3268'], [2]]],
 'F-C': [['', ['1003', '1070', '1072', '1073', '2201', '3156', '3157', '3513', '3515', '3518'], [0]]],
 'F-D': [['', ['1038', '1075', '1965', '1966', '1972', '3138', '3160', '3309', '3312'], [0]], ['', ['1001', '3374'], ['1+2']], ['', ['3501', '3504', '3505'], [3, 4]]],
 'F-E': [['', ['1162', '1250', '1298', '1717', '2985'], [0]]],
 'F-G': [['Class 4.3, packing group I', [], [0]]],
 'F-I': [['', ['2977', '2978', '3507'], [0, 1, 2]], ['', ['3332', '3333'], [3]], ['Subsidiary hazard label class 4.2 or class 4.3', [], [4, 5, 6, 7, 8, 9]]],
 'S-A': [['Marine pollutant mark', [], [0]], ['', ['3546'], [1, 2]]],
 'S-B': [['Marine pollutant mark', [], [0]], ['', ['2802', '2809', '3506'], [1]], ['', ['3554', '3547'], [2, 3], 'amb']],
 'S-C': [['Marine pollutant mark', [], [0]], ['', ['2029', '3484'], [1]]],
 'S-D': [['Marine pollutant mark', [], [0]], ['', ['2749'], [1]], ['', ['3359'], [2]], ['', ['3540'], [3, 4]]],
 'S-E': [['', ['1136', '1993'], [0]], ['', ['1139', '1263', '1866'], [1]]],
 'S-G': [['', ['3541'], [0, 1]]], 'S-J': [['', ['3542'], [0, 1]]], 'S-L': [['', ['2210', '2968'], [0]]], 'S-M': [['', ['3542'], [0, 1]]],
 'S-N': [['', ['3543'], [0, 1]]], 'S-O': [['', ['1295'], [0]]],
 'S-P': [['', ['3257', '3258'], [0]], ['', ['3316'], [1]], ['', ['3363', '3548'], [2, 3, 4]]],
 'S-Q': [['', ['3544'], [0, 1]]], 'S-R': [['', ['3545'], [0, 1]]],
 'S-S': [['', ['2977', '2978', '3507'], [0, 1, 2, 3]], ['', ['3332', '3333'], [4]], ['', ['2919', '3331'], [5]], ['Subsidiary hazard labels class 4.2 or class 4.3', [], [6]]],
 'S-U': [['', ['1001', '3374'], [0]], ['', ['1614'], [1]], ['', ['3501'], [2]], ['', ['3504'], [3]], ['', ['3505'], [4]], ['', ['3537', '3539'], [5, 6]]],
 'S-V': [['', ['2990', '3072'], [0]], ['', ['3502'], [1]], ['', ['3503'], [2]], ['', ['3538'], [3, 4]]],
 'S-W': [['', ['1072', '1073'], [0, 1]]],
}
for cod, L in SC.items():
    P = spec[cod]; out = []
    for crit, un, ii, *x in L:
        tx = []
        for i in ii:
            if isinstance(i, str): a, b = map(int, i.split('+')); tx.append(P[a] + ' ' + P[b])
            else: tx.append(P[i])
        out.append({'c': crit, 'un': un, 'p': tx, **({'amb': 1} if x else {})})
    usati = {i for _, _, ii, *x in L for k in ii for i in ([k] if isinstance(k, int) else map(int, k.split('+')))}
    assert usati == set(range(len(P))), (cod, len(P), usati)
    S[cod]['sc'] = out
for cod in S:
    if spec[cod] and cod not in SC: raise SystemExit('special cases non abbinati: ' + cod)
    S[cod].pop('spec', None)
    S[cod]['sc'] = S[cod].get('sc', [])

# linee guida generali
allt = '\n'.join((p.extract_text() or '') for p in pdf.pages[15:50])
def linee(tit):
    i = allt.index(tit + '\n'); s = allt[i + len(tit):]; s = s[:s.index('Precaution:') + 200]
    s = s[:s.index('\n', s.index('Precaution:') + 60)] if '\n' in s[s.index('Precaution:') + 60:] else s
    it = [x.strip().replace('\n', ' ') for x in re.split(r'•', s.split('Precaution:')[0]) if x.strip()]
    pr = re.sub(r'\s+', ' ', 'Precaution:' + s.split('Precaution:')[1]).split(' IMDG Code')[0].strip()
    return {'punti': [re.sub(r'\s+', ' ', x) for x in it], 'prec': pr}
LG = {'F': linee('General guidelines for FIRE'), 'S': linee('General guidelines for SPILLAGE')}
NOTE = {'3166': 'Index: F-D, S-U for gases; F-E, S-E for liquids.', '3542': 'Index: F-G, S-M for pyrophoric substances; F-A, S-J for self-heating substances.'}
out = {'fonte': 'MSC.1/Circ.1588/Rev.4 (14 July 2026), Revised EmS Guide, amendment 43-26', 'sched': S, 'ordine': ordine, 'lg': LG, 'note': NOTE}
open(sys.argv[2], 'w').write('// Schede EmS – generato da tools/build_ems.py, non modificare a mano\nDATA.ems = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(ordine), 'schede;', sum(len(v['r']) for v in S.values()), 'righe;', sum(len(v['sc']) for v in S.values()), 'casi speciali')
