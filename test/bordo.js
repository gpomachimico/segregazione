// Prove del capitolo 7.4 (v1.1-beta): tabelle 7.4.3.2 e 7.4.3.3, stivaggio di tutte le voci della DGL
global.DATA = {}; const fs = require('fs'), path = require('path');
eval(fs.readFileSync(path.join(__dirname, '../js/imdg.js'), 'utf8'));
const R = require(path.join(__dirname, '../js/regole.js'));
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('ERRORE', m); } };
// valori controllati sul testo del Codice (MSC 108/20/Add.2, Annex 8, pagine 515–516)
const B = (l, c, t) => R.bordo(l, c, t);
ok(B(2, 'CO', 'chiuse').atUnder === 'Two container spaces', '7.4.3.2 .2 CO athwartships under deck');
ok(B(2, 'OO', 'chiuse').faUnder === 'One bulkhead', '7.4.3.2 .2 OO fore and aft under deck');
ok(B(3, 'OO', 'chiuse').atOn === 'Three container spaces', '7.4.3.2 .3 OO athwartships on deck');
ok(B(4, 'CC', 'chiuse').faUnder === 'One bulkhead and minimum horizontal distance of 24 m*', '7.4.3.2 .4 CC fore and aft under deck');
ok(B(4, 'CO', 'chiuse').faUnder === 'Two bulkheads', '7.4.3.2 .4 CO fore and aft under deck');
ok(B(1, 'OO', 'chiuse').v === 'Not in the same vertical line unless segregated by a deck', '7.4.3.2 .1 OO vertical');
ok(B(1, 'OO', 'senza').v === 'Not in the same vertical line', '7.4.3.3 .1 OO vertical');
ok(B(2, 'CO', 'senza').atOn === 'Two container spaces', '7.4.3.3 .2 CO athwartships on deck');
ok(B(2, 'OO', 'senza').faOn === 'One container space and not in or above same hold', '7.4.3.3 .2 OO fore and aft on deck');
ok(B(3, 'CC', 'senza').atOn === 'Two container spaces and not in or above same hold', '7.4.3.3 .3 CC athwartships on deck');
ok(B(4, 'OO', 'senza').faOn === 'Minimum horizontal distance of 24 m and not in or above same hold', '7.4.3.3 .4 OO fore and aft on deck');
for (const t of ['chiuse', 'senza']) for (const l of [1, 2, 3, 4]) for (const c of ['CC', 'CO', 'OO']) {
  const b = B(l, c, t); ok(Object.values(b).every(x => typeof x === 'string' && x.length > 1), `${t} ${l} ${c} cella vuota`);
}
ok(R.combo({ aperto: true }, {}) === 'CO' && R.combo({}, { aperto: true }) === 'CO' && R.combo({ aperto: true }, { aperto: true }) === 'OO' && R.combo({}, {}) === 'CC', 'combo');
// stivaggio di tutte le voci, con tutte le opzioni della nave
let n = 0;
for (const [u, V] of Object.entries(DATA.dgl)) V.forEach((r, i) => {
  for (const opz of [{}, { aperto: true }]) for (const nave of [{ tipo: 'chiuse' }, { tipo: 'senza', vecchia: true }]) {
    const S = R.stivaggio(R.cgDati({ u, i, opz }), nave); n++;
    ok(S.every(x => x.txt && !/undefined|NaN/.test(x.txt + x.par)), `stivaggio UN ${u} voce ${i + 1}`);
  }
});
const T = (u, i = 0, opz = {}, nave = {}) => R.stivaggio(R.cgDati({ u, i, opz }), nave).map(x => x.par + ' ' + (x.cond ? '* ' : '') + x.txt);
console.log('UN 1203 hatchless, nave vecchia:', T('1203', 0, {}, { tipo: 'senza', vecchia: true }));
console.log('UN 0081 container aperto:', T('0081', 0, { aperto: true }));
console.log('UN 1942:', T('1942'));
console.log(n, 'combinazioni di stivaggio; errori', bad);
// v1.3: traduzione italiana di tutte le celle, senza parole inglesi residue
for (const t of ['chiuse', 'senza']) for (const l of [1, 2, 3, 4]) for (const c of ['CC', 'CO', 'OO']) {
  const b = R.bordo(l, c, t); for (const k of ['v', 'faOn', 'faUnder', 'atOn', 'atUnder']) ok(!/\b(container space|bulkhead|deck|hold|vertical|open|closed|Prohibited|restriction|Minimum)\b/i.test(R.trad(b[k])), `traduzione ${t} ${l} ${c} ${k}: ${R.trad(b[k])}`);
}
console.log('traduzione: errori', bad);
// v1.8: navi ro-ro (7.5.3.2) e da carico generale (7.6.3)
const RR = (l, c, k) => R.bordoRoro(l, c)[k];
ok(RR(2, 'OO', 'faUnder') === 'At least 12 m or one bulkhead', '7.5.3.2 .2 OO fore and aft under deck');
ok(RR(2, 'CO', 'atUnder') === 'At least 6 m or one bulkhead', '7.5.3.2 .2 CO athwartships under deck');
ok(RR(3, 'OO', 'faUnder') === 'Two decks or two bulkheads', '7.5.3.2 .3 OO fore and aft under deck');
ok(RR(3, 'OO', 'atOn') === 'Prohibited', '7.5.3.2 .3 OO athwartships on deck');
ok(RR(4, 'CC', 'faUnder') === 'Two bulkheads or at least 36 m + two decks', '7.5.3.2 .4 CC fore and aft under deck');
ok(RR(4, 'CO', 'faUnder') === 'At least 48 m including two bulkheads', '7.5.3.2 .4 CO fore and aft under deck');
ok(RR(4, 'OO', 'faUnder') === 'Prohibited', '7.5.3.2 .4 OO fore and aft under deck');
const G = (l, a, b) => R.livelloGen(l, a, b);
const colli = { colli: true }, chiusa = {}, aperta = { aperto: true };
ok(G(1, colli, chiusa).lev === 0 && G(2, colli, chiusa).lev === 1 && G(3, colli, chiusa).lev === 3, '7.6.3.3.2 colli/unità chiusa');
ok(G(1, chiusa, chiusa).lev === 0 && G(2, chiusa, chiusa).lev === 1 && G(4, chiusa, chiusa).lev === 4, '7.6.3.4.1 unità chiuse');
ok(G(1, colli, aperta).lev === 1 && G(2, colli, aperta).par === '7.6.3.3.1', '7.6.3.3.1 colli/unità aperta');
ok(G(2, colli, colli).lev === 2 && G(2, colli, colli).par === '7.6.3.2', '7.6.3.2 colli/colli');
let m = 0;
for (const [u, V] of Object.entries(DATA.dgl)) V.forEach((r, i) => {
  for (const unita of ['chiusa', 'aperta', 'colli']) for (const nave of [{ tipo: 'roro', pax: 'pax', vecchia: true }, { tipo: 'generale' }, { tipo: 'generale', pax: 'pax', vecchia: true }]) {
    const d = R.cgDati({ u, i, opz: { unita } }), S = R.stivaggio(d, nave); m++;
    ok(S.every(x => x.txt && !/undefined|NaN/.test(x.txt + x.par + (x.cond || ''))) && !/undefined/.test(R.alimentiGen(d)), `stivaggio 7.5/7.6 UN ${u} voce ${i + 1}`);
  }
});
console.log(m, 'combinazioni di stivaggio 7.5/7.6; errori', bad);
console.log('UN 1203 colli, generale, nave vecchia:', T('1203', 0, { unita: 'colli' }, { tipo: 'generale', vecchia: true }));
console.log('UN 0081 ro-ro passeggeri:', T('0081', 0, {}, { tipo: 'roro', pax: 'pax' }));
// v1.9: rinfuse con rischi chimici (7.6.3.5.2), trascrizione dell'immagine dell'edizione italiana (27/11/2026)
const IT_BULK = {
  '4.1': '4 3 2 2 2 2 X 1 X 1 2 X 3 2 1 X', '4.2': '4 3 2 2 2 2 1 X 1 2 2 1 3 2 1 X', '4.3': '4 4 2 2 X 2 X 1 X 2 2 X 2 2 1 X',
  '5.1': '4 4 2 2 X 2 1 2 2 X 2 1 3 1 2 X', '6.1': '2 2 X X X X X 1 X 1 1 X 1 X X X', '7': '2 2 2 2 2 2 2 2 2 1 2 X 3 X 2 X',
  '8': '4 2 2 1 X 1 1 1 1 2 2 X 3 2 X X', '9': 'X X X X X X X X X X X X X X X X', MHB: 'X X X X X X X X X X X X 3 X X X' };
for (const [k, v] of Object.entries(IT_BULK)) ok(R.TAB_BULK[k] === v && v.split(' ').length === 16, `7.6.3.5.2 riga ${k}`);
const B1 = (a, b) => R.coppiaCarico(R.cgDati(a), R.cgDati(b));
ok(B1({ u: '1942', opz: { unita: 'rinfusa' } }, { u: '0081' }).lev === 4, 'rinfusa 5.1 con 1.1D: 4');
ok(B1({ u: '0336' }, { u: '1408', opz: { unita: 'rinfusa' } }).lev === 2, '1.4 imballata con rinfusa 4.3: 2');
ok(B1({ mhb: true, nome: 'COAL' }, { u: '3373' }).lev === 3, 'MHB con 6.2: 3');
ok(B1({ u: '1350', opz: { unita: 'rinfusa' } }, { u: '2448', opz: { unita: 'rinfusa' } }).imsbc === true, 'due rinfuse: IMSBC');
let nb = 0; const U = Object.keys(DATA.dgl);
for (let k = 0; k < U.length; k++) {
  const a = { u: U[k], i: 0, opz: { unita: 'rinfusa' } }, b = { u: U[(k * 37 + 11) % U.length], i: 0 }, m = { mhb: true, nome: 'X' };
  for (const [x, y] of [[a, b], [m, b], [b, m]]) {
    const p = B1(x, y), q = B1(y, x); nb++;
    ok(p.lev === q.lev && p.motivi.every(z => !/undefined|NaN/.test(z.txt)), `rinfusa UN ${U[k]} con ${y.u || 'MHB'}`);
  }
}
console.log(nb, 'coppie con rinfuse; errori', bad);
// v1.10: rinfusa solo per i solidi; bulk container come unità di trasporto
let liq = 0, nbk = 0;
for (const [u, V] of Object.entries(DATA.dgl)) V.forEach((r, i) => {
  if (/^[23]/.test(r['3']) && (R.rinfusaStivaAmmessa(u, r) || R.bkAmmessi(u, r).length)) liq++;
  for (const k of R.bkAmmessi(u, r)) for (const tipo of ['chiuse', 'generale', 'roro']) {
    const d = R.cgDati({ u, i, opz: { unita: k.toLowerCase() } }), S = R.stivaggio(d, { tipo }); nbk++;
    ok(d.bk === k && S.every(x => x.txt && !/undefined|NaN/.test(x.txt + x.par)), `bulk container UN ${u} ${k}`);
    ok(!R.coppiaCarico(d, R.cgDati({ u: '1203', i: 0 })).rinfusa, `bulk container UN ${u}: segregazione come unità di trasporto`);
  }
});
ok(liq === 0, 'nessuna voce di classe 2 o 3 ammessa alla rinfusa');
ok(R.cgDati({ u: '3077', i: 0, opz: { unita: 'bk1' } }).aperto === true && R.cgDati({ u: '1408', i: 0, opz: { unita: 'bk2' } }).aperto === false, 'BK1 aperto, BK2 chiuso');
console.log(nbk, 'casi di bulk container; errori', bad);
