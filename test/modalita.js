// Verifica delle modalità di trasporto per tutte le voci della DGL (v1.11-beta):
// l'app non deve proporre modalità che il Codice non ammette; ogni voce deve avere almeno una modalità.
global.DATA = {}; const fs = require('fs'), path = require('path');
eval(fs.readFileSync(path.join(__dirname, '../js/imdg.js'), 'utf8'));
const R = require(path.join(__dirname, '../js/regole.js'));
const TIPI = ['chiuse', 'senza', 'roro', 'generale'], cont = {}, nessuna = [], incoer = [], casi = {};
let voci = 0, prove = 0;
for (const [u, V] of Object.entries(DATA.dgl)) V.forEach((r, i) => {
  voci++;
  for (const tipo of TIPI) {
    const base = R.cgDati({ u, i });
    const off = R.modiOfferti(Object.assign({}, base, { unita: null }), tipo);
    if (!off.length && !R.vietata(base)) nessuna.push(`UN ${u} voce ${i + 1} (${tipo})`);
    if (off.length && R.vietata(base)) incoer.push(`UN ${u} voce ${i + 1}: voce vietata con modalità proposte`);
    for (const m of off) {
      const d = R.cgDati({ u, i, opz: { unita: m } }); prove++;
      const err = R.verificaModalita(d, { tipo }).filter(v => v.liv === 'errore');
      if (err.length) incoer.push(`UN ${u} voce ${i + 1}, ${m}, ${tipo}: ${err.map(e => e.txt).join('; ')}`);
      cont[tipo + ' ' + m] = (cont[tipo + ' ' + m] || 0) + 1;
    }
    if (R.haImballaggio(r)) for (const lqeq of ['lq', 'eq']) { // quantità limitate ed esenti solo in imballaggi
      const d = R.cgDati({ u, i, [lqeq]: true }), err = R.verificaModalita(d, { tipo }).filter(v => v.liv === 'errore');
      const ammessa = (lqeq === 'lq' ? R.lqAmmessa(r) : R.eqAmmessa(r)) && !R.vietata(d);
      if (ammessa === (err.length > 0)) incoer.push(`UN ${u} voce ${i + 1} ${lqeq}: incoerenza con la colonna ${lqeq === 'lq' ? '7a' : '7b'}`);
    }
  }
  const b = R.cgDati({ u, i });
  const k = R.vietata(b) ? 'vietata al trasporto via mare (SP900 senza imballaggi, SP968)' : R.nonSoggetta(b) ? 'non soggetta al Codice o solo a 5.5.2 (SP960, SP302): esclusa dalla segregazione' : b.cl1 ? 'classe 1 (solo unità chiusa o colli)' : !R.haImballaggio(r) && R.haCisterna(r) ? 'solo cisterna (nessun imballaggio)' : !R.haImballaggio(r) ? 'senza istruzioni di imballaggio né cisterna (oggetti, veicoli, unità)' : /TEMPERATURE CONTROLLED/.test(b.nome) ? 'temperatura controllata (solo unità chiusa)' : null;
  if (k) (casi[k] = casi[k] || []).push(u);
});
console.log(voci, 'voci DGL;', prove, 'combinazioni voce/modalità/nave proposte dall\'app');
console.log('Modalità proposte non ammesse dal Codice:', incoer.length); incoer.slice(0, 20).forEach(x => console.log('  ' + x));
console.log('Voci senza alcuna modalità:', nessuna.length); nessuna.slice(0, 10).forEach(x => console.log('  ' + x));
for (const [k, v] of Object.entries(casi)) console.log(`${k}: ${v.length} voci (es. UN ${[...new Set(v)].slice(0, 8).join(', ')})`);
for (const t of TIPI) console.log(t, R.MODI.map(m => `${m} ${cont[t + ' ' + m] || 0}`).join(' · '));
if (incoer.length || nessuna.length) process.exitCode = 1;
