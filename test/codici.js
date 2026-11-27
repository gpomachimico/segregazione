// Codici SG della colonna 16b (7.2.8): ogni codice usato nella DGL deve essere interpretato dalle regole
// in modo coerente con il testo della definizione (livello, classi, gruppi SGG, sostanze nominate).
global.DATA = {}; const fs = require('fs'), path = require('path');
eval(fs.readFileSync(path.join(__dirname, '../js/imdg.js'), 'utf8'));
const R = require(path.join(__dirname, '../js/regole.js'));
const S = DATA.imdgCod.SG, src = fs.readFileSync(path.join(__dirname, '../js/regole.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('ERRORE', m); } };
const LIV = { 1: '“away from”', 2: '“separated from”', 3: '“separated by a complete compartment or hold from”', 4: '“separated longitudinally by an intervening complete compartment or hold from”' };
// "come per la classe"
for (const [k, c] of Object.entries(R.SG_COME)) ok(new RegExp('as for (class |)' + c.replace('.', '\\.') + '|as for class ' + c[0]).test(S[k]) || (k === 'SG2' && /1\.2G/.test(S[k])), `${k} come ${c}: ${S[k]}`);
// classi
for (const [k, [l, cls]] of Object.entries(R.SG_CLASSE)) ok(S[k].includes(LIV[l]) && cls.every(c => S[k].includes(c)), `${k} livello ${l} classi ${cls}: ${S[k]}`);
// gruppi SGG (SG34b è la seconda parte di SG34)
for (const [k, [l, g]] of Object.entries(R.SG_GRUPPO)) { const t = S[k.replace(/b$/, '')]; ok(t.includes(LIV[l]) && (t.includes(g) || ['SG22', 'SG55'].includes(k)), `${k} livello ${l} ${g}: ${t}`); }
// sostanze nominate: il nome inglese della voce DGL deve comparire nella definizione
const NOMI = { SG37: /ammonia/i, SG43: /bromine/i, SG44: /CARBON TETRACHLORIDE/, SG46: /chlorine/i, SG52: /iron oxide/i, SG62: /sulphur/i };
for (const [k, [l, uu]] of Object.entries(R.SG_NOME)) {
  ok(S[k].includes(LIV[l]) && NOMI[k].test(S[k]), `${k} definizione: ${S[k]}`);
  for (const u of uu) ok(DATA.dgl[u] && DATA.dgl[u].some(r => NOMI[k].test(r['2'])), `${k}: UN ${u} non è ${NOMI[k]}`);
}
// codici trattati in modo specifico nel codice sorgente o come note per la merce
const SPEC = ['SG1', 'SG26', 'SG27', 'SG28', 'SG34', 'SG48', 'SG53', 'SG67', 'SG68', 'SG69', 'SG77', 'SG72', 'SG23', 'SG41', 'SG57', 'SG71', 'SG29', 'SG50'];
const gestiti = new Set([...Object.keys(R.SG_COME), ...Object.keys(R.SG_CLASSE), ...Object.keys(R.SG_GRUPPO), ...Object.keys(R.SG_NOME), ...SPEC]);
const usati = new Set(); for (const V of Object.values(DATA.dgl)) for (const r of V) for (const c of (r['16b'] || '').match(/\bSG\d+\b/g) || []) usati.add(c);
for (const c of usati) ok(gestiti.has(c), `${c} usato nella DGL ma non interpretato dalle regole: ${S[c]}`);
for (const c of SPEC) ok(src.includes(`'${c}'`), `${c} indicato come trattato ma assente dal codice`);
// SG77: nessuna segregazione dalla classe 7
ok(R.coppia(R.cgDati({ u: '3507', i: 0 }), R.cgDati({ u: '2915', i: 0 })).lev === 0, 'SG77 con la classe 7');
// SG72: le voci con SG72 sono nelle tabelle 7.2.6.3
const t72 = new Set([...R.ESENTI.flat(), ...R.ESENTI4]);
for (const [u, V] of Object.entries(DATA.dgl)) if (V.some(r => /\bSG72\b/.test(r['16b'] || ''))) ok(t72.has(u), `UN ${u} ha SG72 ma non è nelle tabelle 7.2.6.3 dell'app`);
console.log(usati.size, 'codici SG usati nella DGL, tutti interpretati; errori', bad);
if (bad) process.exitCode = 1;
