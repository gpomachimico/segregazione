# Verifica indipendente dei codici della DGL (colonne 15 EmS, 16a SW/H, 16b SG/SGG) e delle tabelle di decodifica:
# confronta js/imdg.js (estratto con pdfplumber dalle coordinate del PDF) con un'estrazione testuale diversa del Codice
# (testo del PDF MSC 108/20/Add.2 del progetto, senza coordinate). Uso: python3 tools/verifica_codici.py testo.txt js/imdg.js
import re, json, sys, subprocess, collections
T = open(sys.argv[1], encoding='utf-8').read().split('\n')
dati = json.loads(subprocess.run(['node', '-e', "global.DATA={};eval(require('fs').readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify(DATA))", sys.argv[2]], capture_output=True, text=True).stdout)
DGL, COD = dati['dgl'], dati['imdgCod']
# ---- righe della DGL nel testo: da "UN nome" a una riga che termina con lo stesso UN ----
a = next(i for i, l in enumerate(T) if l.startswith('0004 AMMONIUM PICRATE dry or'))
b = max(i for i, l in enumerate(T) if re.match(r'^3559\b', l))
righe, cur = collections.defaultdict(list), None
for l in T[a:b + 40]:
    if re.search(r'MSC 108/20/Add\.2|Annex 8, page|IMDG Code \(Amendment 42-24\)|^Part 3 – |^Chapter 3\.2 – ', l): continue
    m = re.match(r'^[△■▲]?\s*(\d{4})\b(.*)$', l)
    if cur is None and m:
        e = re.match(r'^(.*?)\s*\b(\d{4})\s*[△■▲]?\s*$', m.group(2))
        if e and e.group(2) == m.group(1): righe[m.group(1)].append(e.group(1)); continue
        cur = [m.group(1), [m.group(2)]]; continue
    if cur is not None:
        e = re.match(r'^(.*?)\s*\b(\d{4})\s*[△■▲]?\s*$', l)
        if e and e.group(2) == cur[0]:
            cur[1].append(e.group(1)); righe[cur[0]].append(' '.join(cur[1])); cur = None
        else: cur[1].append(l)
TOK = re.compile(r'^(Category|[A-E]|0[1-5]|SW\d+|H\d+|SGG\d+[ab]?|SG\d+|–|-|,)$')
def codici_riga(s):
    m = re.search(r'\b(F-[A-J]|–)\s*,\s*(S-[A-Z]|–)', s)
    if not m: return None
    ems = m.group(1) + ', ' + m.group(2); a16, b16 = [], []
    for t in s[m.end():].replace(',', ' , ').split():
        if not TOK.match(t): break
        if re.match(r'^(SW|H)\d+$', t): a16.append(t)
        elif re.match(r'^SGG?\d', t): b16.append(t)
    cat = re.search(r'Category\s+([A-E]|0[1-5])\b', s[m.end():m.end() + 40])
    return ems, (cat.group(1) if cat else None), a16, b16
diff, ok, nonconfr = [], 0, []
for u, V in DGL.items():
    R = righe.get(u, [])
    if len(R) != len(V): nonconfr.append(f'UN {u}: {len(V)} voci in imdg.js, {len(R)} righe nel testo'); continue
    for i, (r, s) in enumerate(zip(V, R)):
        if (r.get('15') or '').strip() == '*' and re.search(r'–\s+\*\s', s):   # EmS con asterisco e nota nella voce (UN 3166, 3542): confronto manuale
            nonconfr.append(f'UN {u} voce {i+1}: EmS "*" con nota nella voce (controllo manuale)'); continue
        c = codici_riga(s)
        if not c: nonconfr.append(f'UN {u} voce {i+1}: EmS non trovata nel testo'); continue
        ems, cat, a16, b16 = c
        e1 = (r.get('15') or '').replace(' ', '')
        q1 = re.findall(r'\b(?:SW|H)\d+\b', r.get('16a') or ''); q2 = re.findall(r'\bSGG?\d+[ab]?\b', r.get('16b') or '')
        c1 = (re.search(r'Category\s+(\w+)', r.get('16a') or '') or [None, None])[1]
        err = []
        if e1 != ems.replace(' ', ''): err.append(f'EmS {r.get("15")} ≠ {ems}')
        if sorted(q1) != sorted(a16): err.append(f'16a {q1} ≠ {a16}')
        if sorted(q2) != sorted(b16): err.append(f'16b {q2} ≠ {b16}')
        if (c1 or None) != cat: err.append(f'categoria {c1} ≠ {cat}')
        if err: diff.append(f'UN {u} voce {i+1}: ' + '; '.join(err))
        else: ok += 1
# ---- codici EmS ben formati ----
cattivi = [f'UN {u} voce {i+1}: "{r.get("15")}"' for u, V in DGL.items() for i, r in enumerate(V) if not re.fullmatch(r'(F-[A-J]|–), (S-[A-Z]|–)', (r.get('15') or '').strip())]
# ---- codici usati e definiti ----
usati = collections.Counter(c for V in DGL.values() for r in V for c in re.findall(r'\b(?:SW|H|SGG|SG)\d+[ab]?\b', (r.get('16a') or '') + ' ' + (r.get('16b') or '')))
nondef = sorted(c for c in usati if not COD.get(re.match(r'[A-Z]+', c).group(0) if not c.startswith('SGG') else 'SGG', {}).get(re.sub(r'[ab]$', '', c)))
# ---- testi delle definizioni (7.1.5, 7.1.6, 7.2.5.2, 7.2.8) ----
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
txt = norm(' '.join(T))
deff = [f'{k}' for tab in ('SW', 'H', 'SG') for k, v in COD[tab].items() if norm(v)[:60] not in txt]
# ---- gruppi SGG: elenchi di 3.1.4.4 contro colonna 16b ----
i0 = next(i for i, l in enumerate(T) if l.startswith('3.1.4.4 The following segregation groups'))
i1 = next(i for i in range(i0, len(T)) if T[i].startswith('3.1.5') or T[i].startswith('Chapter 3.2'))
gr, g = collections.defaultdict(set), None
for l in T[i0:i1]:
    if re.search(r'MSC 108/20/Add\.2|Annex 8, page|IMDG Code \(Amendment 42-24\)|EDITION', l): continue
    m = re.search(r'\(SGG(\d+[ab]?)\)', l)
    if m and re.match(r'^\d+[ab]?\s', l): g = 'SGG' + m.group(1); continue
    if g:
        for u in re.findall(r'\b(\d{4})\b', l): gr[g].add(u)
inc = []
for G, S in gr.items():
    nodgl = sorted(u for u in S if u in DGL and not any(G in (r.get('16b') or '').split() for r in DGL[u]))
    extra = sorted(u for u, V in DGL.items() if any(G in (r.get('16b') or '').split() for r in V) and u not in S)
    if nodgl: inc.append(f'{G}: in 3.1.4.4 ma senza {G} nella colonna 16b: {", ".join(nodgl)}')
    if extra: inc.append(f'{G}: {G} nella colonna 16b ma non in 3.1.4.4: {", ".join(extra)}')
voci = sum(len(V) for V in DGL.values())
print(f'Voci DGL: {voci}; confrontate riga per riga: {ok + len(diff)}; uguali: {ok}; diverse: {len(diff)}; non confrontabili: {len(nonconfr)}')
for x in diff: print('  DIVERSA', x)
for x in nonconfr: print('  NON CONFRONTABILE', x)
print('EmS non ben formate:', len(cattivi)); [print('  ', x) for x in cattivi[:20]]
print('Codici usati:', len(usati), '; senza definizione:', nondef)
print('Definizioni SW/H/SG non ritrovate nel testo:', deff)
print('Gruppi SGG negli elenchi di 3.1.4.4:', len(gr), '; incongruenze:', len(inc)); [print('  ', x) for x in inc]
