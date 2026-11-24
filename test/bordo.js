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
