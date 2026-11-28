// Prove delle unità con carico misto (v1.16-beta)
global.DATA = {}; const fs = require('fs'), path = require('path');
eval(fs.readFileSync(path.join(__dirname, '../js/imdg.js'), 'utf8'));
const R = require(path.join(__dirname, '../js/regole.js'));
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('ERRORE', m); } };
const it = (u, sigla, unita = 'chiusa', i = 0) => ({ u, i, opz: { sigla, unita } });
const PP = D => { const P = {}; for (let a = 0; a < D.length; a++) for (let b = a + 1; b < D.length; b++) P[a + '-' + b] = R.coppiaCarico(D[a], D[b]); return P; };
// 1. raggruppamento: stessa sigla, maiuscole e spazi non contano
let D = [it('1993', 'mscu 123'), it('1830', ''), it('2794', 'MSCU 123'), it('1203', 'TRK1', 'cisterna'), it('1170', 'TRK1', 'cisterna')].map(R.cgDati);
let G = R.raggruppa(D);
ok(JSON.stringify(G.E) === '[[0,2],[1],[3],[4]]', 'gruppi ' + JSON.stringify(G.E));
ok(G.err.length === 1 && /TRK1/.test(G.err[0].txt), 'cisterne con la stessa sigla segnalate');
// 2. tipo di unità diverso
D = [it('1993', 'A'), it('2794', 'A', 'aperta')].map(R.cgDati); G = R.raggruppa(D);
ok(G.E.length === 2 && G.err.length === 1, 'chiusa e aperta con la stessa sigla');
// 3. fra unità prevale la coppia più severa; esempio: unità con classe 3 e 8 contro classe 5.1
D = [it('1993', 'U1'), it('1830', 'U1'), it('1942', '')].map(R.cgDati); let P = PP(D); G = R.raggruppa(D);
let q = R.coppiaUnita(D, G.E[0], G.E[1], P);
ok(q.lev === Math.max(P['0-2'].lev, P['1-2'].lev), 'massimo delle coppie');
ok(q.coppie.length === 2 && q.motivi.every(m => /^\d–\d \(/.test(m.txt)), 'coppie e motivi con prefisso');
ok(R.coppiaUnita(D, [2], [0], P) === P['0-2'], 'due unità singole: coppia invariata');
// 4. verifica interna 7.3.4.1
const V = R.verificaUnita(D, G.E[0], P), l01 = P['0-1'].lev;
ok(l01 === 0 ? V.filter(v => v.liv === 'errore').length === 0 : V.length > 0, 'classe 3 / classe 8: ' + l01);
D = [it('1993', 'U1'), it('1942', 'U1')].map(R.cgDati); P = PP(D);
ok(P['0-1'].lev >= 2 && R.verificaUnita(D, [0, 1], P).some(v => v.liv === 'errore'), '3 / 5.1 nella stessa unità: errore');
// livello 1 ("away from"): approvazione dell'autorità
const tutti = Object.keys(DATA.dgl); let trov = 0;
for (let a = 0; a < 400 && !trov; a++) for (let b = a + 1; b < 400; b++) {
  const X = [it(tutti[a], 'Z'), it(tutti[b], 'Z')].map(R.cgDati); if (X.some(d => !R.MISTA.includes(d.unita))) continue;
  const p = { '0-1': R.coppiaCarico(X[0], X[1]) };
  if (p['0-1'].lev === 1 && (p['0-1'].levCond ?? 1) === 1) { const v = R.verificaUnita(X, [0, 1], p); ok(v.length === 1 && v[0].liv === 'avviso' && /autorità competente/.test(v[0].txt), 'away from: avviso'); trov++; break; }
}
ok(trov, 'trovata una coppia away from');
// 5. prova a caso: unità di 2–4 merci, simmetria e massimo
let n = 0;
for (let k = 0; k < 3000; k++) {
  const m = 2 + (k % 4), X = [];
  for (let j = 0; j < m; j++) { const u = tutti[Math.floor(Math.random() * tutti.length)]; X.push(it(u, j < m - 1 ? 'G' : 'S' + j)); }
  const Dx = X.map(R.cgDati), Px = PP(Dx), Gx = R.raggruppa(Dx);
  if (Gx.E.length < 2) continue;
  for (let a = 0; a < Gx.E.length; a++) for (let b = a + 1; b < Gx.E.length; b++) {
    const q1 = R.coppiaUnita(Dx, Gx.E[a], Gx.E[b], Px), q2 = R.coppiaUnita(Dx, Gx.E[b], Gx.E[a], Px);
    let mx = 0; for (const i of Gx.E[a]) for (const j of Gx.E[b]) mx = Math.max(mx, Px[Math.min(i, j) + '-' + Math.max(i, j)].lev);
    ok(q1.lev === mx && q2.lev === mx && q1.levDer <= q1.lev + 0 || q1.levDer === undefined, 'massimo ' + k); n++;
  }
  R.verificaUnita(Dx, Gx.E.find(g => g.length > 1) || [0], Px);
}
console.log(`unità con carico misto: ${n} coppie di unità provate; errori: ${bad}`); process.exit(bad ? 1 : 0);
