// Tabelle 7.4.3.2 e 7.4.3.3 in italiano: confronto con la trascrizione dell'edizione italiana del Codice
// (immagini fornite da Luca il 27/11/2026, verificate cella per cella; le celle "Come per aperto contro aperto"
// riportano fra parentesi il testo della colonna aperto contro aperto, aggiunta dell'app).
global.DATA = {}; const fs = require('fs'), path = require('path');
eval(fs.readFileSync(path.join(__dirname, '../js/imdg.js'), 'utf8'));
const R = require(path.join(__dirname, '../js/regole.js'));
const atteso = JSON.parse(fs.readFileSync(path.join(__dirname, 'tabelle_it.json'), 'utf8'));
let bad = 0;
for (const [k, v] of Object.entries(atteso)) {
  const [t, l, c] = k.split(' '), b = R.bordo(+l, c, t);
  const x = ['v', 'faOn', 'faUnder', 'atOn', 'atUnder'].map(q => R.trad(b[q]));
  x.forEach((y, i) => { if (y !== v[i]) { bad++; console.log('DIVERSO', k, i, y, '≠', v[i]); } });
}
console.log(Object.keys(atteso).length * 5, 'celle confrontate; differenze', bad);
