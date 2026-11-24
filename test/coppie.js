global.DATA = {}; const fs = require('fs');
eval(fs.readFileSync(require('path').join(__dirname, '../js/imdg.js'), 'utf8'));
const path = require('path'), R = require(path.join(__dirname, '../js/regole.js'));
const { cgDati, coppia } = R;
const V = []; for (const [u, R] of Object.entries(DATA.dgl)) R.forEach((r, i) => V.push({ u, i }));
let n = 0, bad = 0, ist = {}; const S = 7;
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let k = 0; k < 200000; k++) { const a = V[Math.floor(rnd() * V.length)], b = V[Math.floor(rnd() * V.length)];
  try { const p = coppia(cgDati(a), cgDati(b)), q = coppia(cgDati(b), cgDati(a)); n++; ist[p.lev] = (ist[p.lev] || 0) + 1;
    if (p.lev !== q.lev || ![0,1,2,3,4].includes(p.lev) || p.motivi.some(m => /undefined|NaN/.test(m.txt))) { bad++; if (bad < 6) console.log('BAD', a, b, p.lev, q.lev); } }
  catch (e) { bad++; if (bad < 6) console.log('ERR', a, b, e.message); } }
console.log(n, 'bad', bad, JSON.stringify(ist));
