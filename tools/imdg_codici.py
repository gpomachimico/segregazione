# Fase 6 (22/11/2026): tabelle di decodifica dal Codice IMDG 42-24 (PDF MSC 108/20/Add.2)
# - 3.3.1 disposizioni speciali (colonna 6), 3.5.1.2 codici E (colonna 7b)
# - 7.1.3 categorie di stivaggio, 7.1.5 codici SW, 7.1.6 codici H (colonna 16a)
# - 7.2.5.2 gruppi SGG, 7.2.8 codici SG (colonna 16b), 7.2.4 tabella di segregazione
import subprocess, re, json, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/5fa493c6-MSC_108-20-Add.2_-_IMDG_42-24.pdf'
def testo(a, b): return subprocess.run(['pdftotext', '-layout', '-f', str(a), '-l', str(b), P, '-'], capture_output=True, text=True).stdout
RUM = re.compile(r'(MSC 108/20/Add\.2|Annex 8, page|IMDG Code \(Amendment 42-24\)|^\s*\d{1,4}\s*$|^\s*[37]\s*$|Chapter 3\.3 – |Chapter 7\.[12] – |Part 7 – |Part 3 – )')
def codici(txt, pref):
    out, cur = {}, None
    for l in txt.split('\n'):
        if RUM.search(l): continue
        m = re.match(r'^\s*[■△▲]?\s*(' + pref + r'\d+)\s{2,}(.*\S)', l)
        if m: cur = m.group(1); out[cur] = m.group(2).strip(); continue
        if cur and l.strip() and re.match(r'^\s{12,}\S', l) and not re.search(r'Description|code$|Stowage$|Handling$|Segregation$', l.strip()):
            out[cur] += ' ' + l.strip()
        elif not l.strip(): pass
    return out
ch7 = testo(488, 506)
sw = codici(ch7[ch7.index('7.1.5       Stowage codes'):ch7.index('7.1.6       Handling codes')], 'SW')
hh = codici(ch7[ch7.index('7.1.6       Handling codes'):ch7.index('Chapter 7.2\n')], 'H')
sgg = {}
for m in re.finditer(r'^\s*(SGG\d+)\s+\d+\s+(.+)$', ch7[ch7.index('7.2.5.2'):ch7.index('7.2.5.3')], re.M): sgg[m.group(1)] = m.group(2).strip()
sgg['SGG7'] += ' compounds)'   # riga a capo nel PDF: "heavy metals and their salts (including their organometallic / compounds)"
i8 = ch7.index('7.2.8       Segregation codes'); sg = codici(ch7[i8:ch7.index('Segregation flow chart')], 'SG')
# tabella di segregazione 7.2.4
COLS = ['1.1', '1.3', '1.4', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '7', '8', '9']
RIGHE = {'1.1, 1.2, 1.5': '1.1', '1.3, 1.6': '1.3', '1.4': '1.4'}
tab = {}
blk = ch7[ch7.index('7.2.4     Segregation table'):ch7.index('The numbers and symbols in the table')]
for l in blk.split('\n'):
    m = re.search(r'(1\.1, 1\.2, 1\.5|1\.3, 1\.6|1\.4|2\.1|2\.2|2\.3|4\.1|4\.2|4\.3|5\.1|5\.2|6\.1|6\.2|\s3|\s7|\s8|\s9)\s+((?:[X1-4\*]\s+){13,16}[X1-4])\s*$', l)
    if not m: continue
    k = RIGHE.get(m.group(1).strip(), m.group(1).strip()); v = m.group(2).split()
    if len(v) == 14: v = ['*', '*', '*'] + v   # righe della classe 1: le tre colonne esplosivi sono "*" (7.2.7.1)
    tab[k] = dict(zip(COLS, v))
assert len(tab) == 17 and all(len(r) == 17 for r in tab.values()), (len(tab), tab.keys())
# disposizioni speciali 3.3.1: parole con le coordinate (pdfplumber); il numero della SP sta nella colonna a sinistra
# (x0 circa 97 sulle pagine dispari e 125 sulle pari, impaginazione a specchio), il testo parte circa 30 punti più a destra
import pdfplumber
sp, cur = {}, None
with pdfplumber.open(P) as pdf:
    for pn in range(767, 802):
        pg = pdf.pages[pn - 1]
        w = [x for x in pg.extract_words(x_tolerance=1.5) if 60 < x['top'] < pg.height - 45 and 30 < x['x0'] < 555]
        num = [x for x in w if re.fullmatch(r'\d{1,3}', x['text']) and (88 < x['x0'] < 106 or 118 < x['x0'] < 134)]
        if not num: continue
        xn = min(x['x0'] for x in num)
        righe = []
        for x in sorted(w, key=lambda x: (round(x['top']), x['x0'])):
            if righe and abs(x['top'] - righe[-1][0]) <= 3: righe[-1][1].append(x)
            else: righe.append([x['top'], [x]])
        for _, L in righe:
            L.sort(key=lambda x: x['x0'])
            testo_l = [x for x in L if x['x0'] > xn + 18 and x['text'] not in ('△', '■', '▲')]
            n = [x for x in L if abs(x['x0'] - xn) < 6 and re.fullmatch(r'\d{1,3}', x['text'])]
            if pn == 767 and L[0]['top'] < 280: continue      # testo introduttivo del 3.3.1
            if 'Chapter' in ' '.join(x['text'] for x in L) and pn == 801: break
            if n and int(n[0]['text']) >= 16:
                cur = n[0]['text']; sp[cur] = ''
            if cur is None or not testo_l: continue
            t = ' '.join(x['text'] for x in testo_l)
            sp[cur] += ('\n' if sp[cur] and re.match(r'^(\.\d+|\(\w\)|[a-z]\))\s', t) else (' ' if sp[cur] else '')) + t
# codici E (3.5.1.2)
ecod = {'E0': 'Non ammesso come quantità esente', 'E1': '30 g o mL per imballaggio interno, 1000 per imballaggio esterno',
        'E2': '30 per imballaggio interno, 500 per imballaggio esterno', 'E3': '30 per imballaggio interno, 300 per imballaggio esterno',
        'E4': '1 per imballaggio interno, 500 per imballaggio esterno', 'E5': '1 per imballaggio interno, 300 per imballaggio esterno'}
out = {'SW': sw, 'H': hh, 'SGG': sgg, 'SG': sg, 'SEGR': tab, 'SP': sp, 'E': ecod}
json.dump(out, open('/home/claude/work/f6/imdg_codici.json', 'w'), ensure_ascii=False, indent=0)
print({k: len(v) for k, v in out.items()})
