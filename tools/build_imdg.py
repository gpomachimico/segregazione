# Fase 6 (22/11/2026): scrive js/imdg.js per la "Scheda merce": tutte le colonne della DGL IMDG 42-24 e le tabelle di decodifica
import json
W = '/home/claude/work/'
dgl = json.load(open(W + 'dgl_pdf.json')); cod = json.load(open(W + 'f6/imdg_codici.json'))
K = ['2', '3', '4', '5', '6', '7a', '7b', '8', '9', '10', '11', '13', '14', '15', '16a', '16b', '17']
out = {}
for e in dgl:
    r = {k: e['c'].get(k, '') for k in K}
    if e['c'].get('1'): r['seg'] = e['c']['1']          # segni di modifica nella colonna 1 (△, ■)
    r['pag'] = e['pag']
    L = out.setdefault(e['un'], [])
    if not any({k: v for k, v in x.items() if k != 'pag'} == {k: v for k, v in r.items() if k != 'pag'} for x in L): L.append(r)
js = ('// Scheda merce (Fase 6, 22/11/2026): Dangerous Goods List completa del Codice IMDG, Emendamento 42-24 (Ris. MSC.556(108),\n'
      '// doc. MSC 108/20/Add.2), colonne (2)–(17), e tabelle di decodifica dei capitoli 3.3, 3.5, 7.1 e 7.2, nel testo originale inglese.\n'
      '// Generato da tools/dgl_pdf.py, tools/imdg_codici.py e tools/build_imdg.py.\n'
      'DATA.dgl = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
      'DATA.imdgCod = ' + json.dumps(cod, ensure_ascii=False, separators=(',', ':')) + ';\n')
open('js/imdg.js', 'w').write(js)
print(len(out), sum(len(v) for v in out.values()), len(js))
