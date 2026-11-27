// Scheda merce (v1.15-beta, richiesta di Luca 27/11/2026): portata dall'app aree di danno (js/app.scheda.js, v1.28-beta)
// come parte indipendente di questa app. Dati: js/imdg.js (DGL e codici), js/ems.js (guida EmS MSC.1/Circ.1588/Rev.4),
// js/imballaggi.js (4.1.4 e 4.2.5, caricato solo quando serve), js/onu.js (ERG 2024). Si apre con il pulsante "Scheda"
// di ogni merce del carico e mostra la voce DGL scelta per quella merce.
'use strict';
let schedaAperta = null; // { u, i }
function caricaScript(src) { return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(src)); document.head.appendChild(s); }); }
let ergPronto = null, emsPronto = null;
const caricaERG = () => window.ONU_OK ? Promise.resolve() : (ergPronto = ergPronto || caricaScript('js/onu.js').then(() => { window.ONU_OK = true; }).catch(e => { ergPronto = null; throw e; }));
const caricaEMS = () => DATA.ems ? Promise.resolve() : (emsPronto = emsPronto || caricaScript('js/ems.js').catch(e => { emsPronto = null; throw e; }));
// 7.1.3 categorie di stivaggio (sintesi in italiano con i termini dell'edizione italiana)
const CAT_STIVA = {
  A: ['sul ponte o sotto il ponte', 'sul ponte o sotto il ponte'], B: ['sul ponte o sotto il ponte', 'solo sul ponte'],
  C: ['solo sul ponte', 'solo sul ponte'], D: ['solo sul ponte', 'proibito'], E: ['sul ponte o sotto il ponte', 'proibito']
};
const CAT_STIVA1 = {
  '01': ['sul ponte in unità di trasporto chiusa o sotto il ponte', 'sul ponte in unità di trasporto chiusa o sotto il ponte'],
  '02': ['sul ponte in unità di trasporto chiusa o sotto il ponte', 'sul ponte in unità di trasporto chiusa o sotto il ponte in unità di trasporto chiusa secondo 7.1.4.4.6'],
  '03': ['sul ponte in unità di trasporto chiusa o sotto il ponte', 'proibito, salvo 7.1.4.4.6'],
  '04': ['sul ponte in unità di trasporto chiusa o sotto il ponte in unità di trasporto chiusa', 'proibito, salvo 7.1.4.4.6'],
  '05': ['solo sul ponte in unità di trasporto chiusa', 'proibito, salvo 7.1.4.4.6']
};
const SEGR_TERMINI = { 1: '“away from” – lontano da', 2: '“separated from” – separato da', 3: '“separated by a complete compartment or hold from” – separato mediante un compartimento completo o una stiva da', 4: '“separated longitudinally by an intervening complete compartment or hold from” – separato longitudinalmente mediante un compartimento completo intermedio o una stiva da', X: 'consultare la DGL per eventuali prescrizioni specifiche', '*': 'tra merci della classe 1 vedere 7.2.7.1' };
const SEGR_COL = ['1.1', '1.3', '1.4', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '7', '8', '9'];
const SEGR_NOMI = { '1.1': 'esplosivi 1.1, 1.2, 1.5', '1.3': 'esplosivi 1.3, 1.6', '1.4': 'esplosivi 1.4', '2.1': 'gas infiammabili', '2.2': 'gas non infiammabili, non tossici', '2.3': 'gas tossici', 3: 'liquidi infiammabili', '4.1': 'solidi infiammabili', '4.2': 'materie soggette ad accensione spontanea', '4.3': 'materie che con l\'acqua sviluppano gas infiammabili', '5.1': 'comburenti', '5.2': 'perossidi organici', '6.1': 'tossiche', '6.2': 'infettive', 7: 'radioattive', 8: 'corrosive', 9: 'varie' };
function rigaSegr(cl) {
  const c = String(cl).trim(), m = c.match(/^1\.(\d)/);
  if (c === '1') return '1.1'; if (c === '2') return null;
  if (m) return { 1: '1.1', 2: '1.1', 5: '1.1', 3: '1.3', 6: '1.3', 4: '1.4' }[m[1]];
  const k = c.match(/^\d(\.\d)?/); return k ? k[0] : null;
}
const lista = s => (s || '').split(/[\s,]+/).filter(Boolean);
function codiciTesto(campo, pref) {
  const C = DATA.imdgCod[pref];
  return [...new Set((campo.match(new RegExp('\\b' + pref + '\\d+\\b', 'g')) || []))].map(k => [k, C[k] || '(codice non trovato nel capitolo 7)']);
}
function schedaDati(riga) {
  const C = DATA.imdgCod, sp = [...new Set((riga['6'] || '').match(/\d+/g) || [])];
  const cat = (riga['16a'].match(/Category\s+(\w+)/) || [])[1];
  const prim = rigaSegr(riga['3']);
  const sub = (riga['4'] || '').split(/[\/\s]+/).filter(x => /^\d(\.\d)?$/.test(x)).map(rigaSegr).filter(Boolean);
  return { sp: sp.map(n => [n, C.SP[n] || '(testo non trovato nel capitolo 3.3)']), cat,
    catTxt: cat ? (CAT_STIVA[cat] || CAT_STIVA1[cat]) : null,
    sw: codiciTesto(riga['16a'], 'SW'), h: codiciTesto(riga['16a'], 'H'),
    sg: codiciTesto(riga['16b'], 'SG'), sgg: codiciTesto(riga['16b'], 'SGG'),
    segr: [prim, ...sub].filter(Boolean).map(k => [k, C.SEGR[k]]),
    e: C.E[riga['7b']] || '' };
}
// ---------- Schede EmS (23/11/2026): MSC.1/Circ.1588/Rev.4, testo originale; dati in js/ems.js (tools/build_ems.py) ----------
function emsCodici(u, r) { // codici F e S della voce; per 3166 e 3542 ("*") quelli indicati nell'indice della guida
  const s = r['15'] || '', n = DATA.ems && DATA.ems.note[u];
  return [...new Set(((s === '*' && n ? n : s).match(/[FS]-[A-Z]/g) || []))];
}
function emsCasoVale(x, u, r) { // il caso speciale riguarda questa voce?
  if (x.un.length) return x.un.includes(u);
  const sub = (r['4'] || '').split(/[\/\s]+/);
  if (/^Class 4\.3, packing group I$/.test(x.c)) return r['3'] === '4.3' && r['5'] === 'I';
  if (/^Subsidiary hazard label/.test(x.c)) return sub.includes('4.2') || sub.includes('4.3');
  if (/^Marine pollutant mark/.test(x.c)) return sub.includes('P');
  return false;
}
const EMS_NOMI = { F: 'Incendio (FIRE)', S: 'Spandimento (SPILLAGE)' };
function emsHTML(u, righe, esc, perStampa) {
  const E = DATA.ems; if (!E) return '';
  const cod = [...new Set(righe.flatMap(r => emsCodici(u, r)))].sort((a, b) => a[0] === b[0] ? 0 : a[0] === 'F' ? -1 : 1);
  if (!cod.length) return '';
  const cls = perStampa ? 'nota' : 'small';
  let h = `<h4>Schede EmS (${esc(cod.join(', '))})</h4><p class="${cls}">Fonte: guida IMO EmS, MSC.1/Circ.1588/Rev.4 del 14/07/2026 (allineata all'emendamento 43-26, applicazione volontaria dal 1/1/2027), testo originale inglese. I codici EmS di tutte le voci della DGL 42-24 coincidono con l'indice della Rev.4.${E.note[u] ? ' Codici dall\'indice della guida: ' + esc(E.note[u]) : ''}</p>`;
  if (perStampa && !stampaTesti.ems) {
    h += `<ul>${cod.map(c => { const s = E.sched[c]; if (!s) return ''; const casi = s.sc.filter(x => righe.some(r => emsCasoVale(x, u, r)));
      return `<li><b>${esc(c)}</b> – ${EMS_NOMI[c[0]]}: ${esc(s.t)}${casi.length ? ' – la scheda contiene un caso speciale per questa merce' : ''}</li>`; }).join('')}</ul><p class="nota">Testi delle schede non riportati in questa stampa: vedere la guida EmS (MSC.1/Circ.1588/Rev.4).</p>`;
    return h;
  }
  for (const c of cod) {
    const s = E.sched[c]; if (!s) continue;
    const casi = s.sc.filter(x => righe.some(r => emsCasoVale(x, u, r)));
    let b = '';
    if (casi.length) b += `<div class="emsSc"><b>Caso speciale per questa merce</b>${casi.map(x => `<p>${x.c ? '<i>' + esc(x.c) + '</i>: ' : ''}${x.p.map(esc).join('<br>')}${x.amb ? ` <span class="${cls}">(nel documento il testo vale per UN ${esc(x.un.join(' e '))} senza una ripartizione certa fra i due numeri; riportato per intero)</span>` : ''}</p>`).join('')}</div>`;
    b += '<table class="ems">' + s.r.map(r => `<tr><td>${r.l.map(l => esc(l.filter(Boolean).join(' – '))).join('<br>')}</td><td>${r.p.map(esc).join('<br>')}</td></tr>`).join('');
    if (s.sc.length) b += `<tr><td>Special cases</td><td>${s.sc.map(x => `<p${casi.includes(x) ? ' class="emsQ"' : ''}><b>${esc([x.c, x.un.map(n => 'UN ' + n).join(', ')].filter(Boolean).join(' '))}</b>: ${x.p.map(esc).join(' ')}</p>`).join('')}</td></tr>`;
    else b += '<tr><td>Special cases</td><td>None.</td></tr>';
    b += '</table>';
    const tit = `${esc(c)} – ${EMS_NOMI[c[0]]}: ${esc(s.t)}`;
    h += perStampa ? `<p class="nota"><b>${tit}</b></p>${b}` : `<details${casi.length ? ' open' : ''}><summary><b>${tit}</b>${casi.length ? ' – caso speciale' : ''}</summary>${b}</details>`;
  }
  for (const k of ['F', 'S']) if (cod.some(c => c[0] === k)) {
    const g = E.lg[k], b = `<ul class="${perStampa ? '' : 'ip'}">${g.punti.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="${cls}">${esc(g.prec)}</p>`;
    const tit = `General guidelines for ${k === 'F' ? 'FIRE' : 'SPILLAGE'}`;
    h += perStampa ? `<p class="nota"><b>${tit}</b></p>${b}` : `<details><summary>${tit}</summary>${b}</details>`;
  }
  return h;
}
// ---------- Istruzioni di imballaggio e cisterne (23/11/2026): IMDG 42-24, 4.1.4 e 4.2.5, riproduzione vettoriale
// delle pagine del PDF ufficiale (js/imballaggi.js, circa 1 MB, generato da tools/build_imballaggi.py e caricato solo
// quando si apre un'istruzione). In stampa solo i codici, salvo l'opzione "testi completi".
let imbPronto = null; const imbAperti = new Set();
const stampaTesti = { imb: false, ems: false }; // scelta di Luca (23/11/2026): in stampa solo i riferimenti, testi a richiesta
function caricaImb() {
  if (DATA.imb) return Promise.resolve();
  if (!imbPronto) imbPronto = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'js/imballaggi.js'; s.onload = ok; s.onerror = () => { imbPronto = null; ko(new Error('istruzioni non disponibili')); }; document.head.appendChild(s); });
  return imbPronto;
}
const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function svgRegione(r, evid = []) {
  const [x, y, w, h] = r.vb, ev = new Set(evid);
  const d = r.e.map(e => `M${e[0]} ${e[1]}L${e[2]} ${e[3]}`).join('');
  const T = r.t.map(([tx, ty, s, l, f, s0]) => {
    const hl = ev.has(s0) || evid.some(k => /^\d{4}$/.test(k) && s0.startsWith(k + ' '));
    return `<text x="${tx}" y="${ty}" font-size="${s}" textLength="${l}" lengthAdjust="spacingAndGlyphs"${f.includes('b') ? ' font-weight="bold"' : ''}${f.includes('i') ? ' font-style="italic"' : ''}${hl ? ' class="hl"' : ''}>${xmlEsc(s0)}</text>`;
  }).join('');
  return `<div class="imbw"><svg class="imbsvg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w * 1.5)}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" stroke="currentColor" stroke-width="0.5" fill="none"/>${T}</svg></div>`;
}
function imbCodici(r) { // codici delle colonne 8, 10 e 13, con le varianti (a)(b)(c) e le disposizioni delle colonne 9, 11 e 14
  const istr = [], s8 = ((r['8'] || '') + ' ' + (r['10'] || ''));
  for (const m of s8.matchAll(/\b(P\d{3}|LP\d{2,3}|IBC\d{2,3})((?:\s*\([a-c]\)\s*(?:,|or)?)*)/g)) {
    const v = [...(m[2] || '').matchAll(/\(([a-c])\)/g)].map(x => `${m[1]}(${x[1]})`);
    istr.push(...(v.length ? v : [m[1]]));
  }
  const cist = ((r['13'] || '').match(/\bT\d+\b/g) || []), bk = ((r['13'] || '').match(/\bBK\d\b/g) || []);
  const disp = [...new Set(((r['9'] || '') + ' ' + (r['11'] || '')).match(/\b(PP\d+|B\d+|L\d+)\b/g) || [])];
  const tp = ((r['14'] || '').match(/\bTP\d+\b/g) || []);
  return { istr, cist, bk, disp, tp };
}
const BK_DESCR = { BK1: 'sheeted bulk container (4.3.3)', BK2: 'closed bulk container', BK3: 'flexible bulk container (4.3.4)' };
function imbBlocco(chiave, u, disp) { // contenuto di un'istruzione: SVG delle regioni
  const I = DATA.imb;
  if (/^TP\d+$/.test(chiave)) return (I.tp[chiave] || []).map(r => svgRegione(r)).join('');
  if (/^T\d+$/.test(chiave)) {
    const n = +chiave.slice(1);
    if (n <= 22) return `<p class="small">4.2.5.2.5 – istruzioni ammesse in alternativa:</p>${I.cist['T-ALT'].map(r => svgRegione(r, [chiave])).join('')}<p class="small">4.2.5.2.6 – istruzione ${chiave}:</p>${I.cist['T1-T22'].map(r => svgRegione(r, [chiave])).join('')}`;
    return (I.cist[chiave] || []).map(r => svgRegione(r, [u])).join('');
  }
  const R = I.istr[chiave];
  return R ? R.map(r => svgRegione(r, disp)).join('') : '<p class="small">Istruzione non trovata nel testo del Codice.</p>';
}
function imbHTML(u, righe, esc, perStampa) {
  const C = righe.map(imbCodici), cls = perStampa ? 'nota' : 'small';
  const istr = [...new Set(C.flatMap(c => c.istr))], cist = [...new Set(C.flatMap(c => c.cist))], bk = [...new Set(C.flatMap(c => c.bk))];
  const disp = [...new Set(C.flatMap(c => c.disp))], tp = [...new Set(C.flatMap(c => c.tp))];
  if (!istr.length && !cist.length && !bk.length) return '';
  const voci = [...istr.map(k => [k, /^IBC/.test(k) ? 'istruzione di imballaggio per IBC (4.1.4.2)' : /^LP/.test(k) ? 'istruzione per grandi imballaggi (4.1.4.3)' : 'istruzione di imballaggio (4.1.4.1)']),
    ...cist.map(k => [k, 'istruzione per cisterne mobili (4.2.5.2)']), ...tp.map(k => [k, 'disposizione speciale per cisterne mobili (4.2.5.3)'])];
  let h = `<h4>Imballaggi, IBC e cisterne mobili (4.1.4, 4.2.5)</h4><p class="${cls}">Testo e tabelle riprodotti dalle pagine del PDF ufficiale IMDG 42-24 nella posizione originale${disp.length ? `; in rosso le disposizioni della voce (${esc(disp.join(', '))})` : ''}${cist.length ? '; per le cisterne è evidenziata la riga del codice o del numero ONU' : ''}. ${perStampa ? '' : 'Aprire una voce per vederne il testo; scorrere in orizzontale le tabelle larghe. In stampa compaiono solo i codici, salvo la casella sotto il pulsante di stampa.'}</p>`;
  if (bk.length) h += `<p class="${cls}">Contenitori per rinfuse (colonna 13): ${bk.map(k => `<b>${esc(k)}</b> – ${esc(BK_DESCR[k])}`).join('; ')}; vedere il capitolo 4.3.</p>`;
  if (perStampa) {
    if (stampaTesti.imb && DATA.imb) { for (const [k, d] of voci) h += `<p class="nota"><b>${esc(k)}</b> – ${esc(d)}</p>${imbBlocco(k, u, disp)}`; return h; }
    h += `<ul>${voci.map(([k, d]) => `<li><b>${esc(k)}</b> – ${esc(d)}</li>`).join('')}</ul>${disp.length ? `<p class="nota">Disposizioni della voce nelle istruzioni: ${esc(disp.join(', '))}.</p>` : ''}<p class="nota">Testi non riportati in questa stampa: vedere IMDG Code 42-24, 4.1.4 e 4.2.5.</p>`;
    return h;
  }
  for (const [k, d] of voci) {
    const ap = imbAperti.has(u + '|' + k);
    h += `<details class="imbd" data-k="${esc(k)}" data-u="${esc(u)}"${ap ? ' open' : ''}><summary><b>${esc(k)}</b> – ${esc(d)}</summary><div class="imbc">${ap && DATA.imb ? imbBlocco(k, u, disp) : ''}</div></details>`;
  }
  return h;
}

document.addEventListener('toggle', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('imbd')) return;
  const k = el.dataset.k, u = el.dataset.u, key = u + '|' + k, box = el.querySelector('.imbc');
  if (!el.open) { imbAperti.delete(key); return; }
  imbAperti.add(key);
  if (box.innerHTML) return;
  box.innerHTML = '<p class="small">Caricamento del testo…</p>';
  caricaImb().then(() => {
    const R = DATA.dgl[u] || [], r = schedaAperta && schedaAperta.u === u ? [R[schedaAperta.i]] : R;
    box.innerHTML = imbBlocco(k, u, [...new Set(r.flatMap(x => imbCodici(x).disp))]);
  }).catch(() => { box.innerHTML = '<div class="warn">Testi non disponibili senza rete: riprovare con la connessione.</div>'; });
}, true);
// ---------- ERG 2024: guida, distanze iniziali, Tabelle 1, 2 e 3 (dati js/onu.js, come nell'app aree di danno) ----------
const TRAD_CONT_T3 = { 'Rail tank car': 'Carro cisterna ferroviario', 'Highway tank truck or trailer': 'Autocisterna o rimorchio cisterna', 'Agricultural nurse tank': 'Cisterna agricola', 'Multiple small cylinders or single ton cylinder': 'Più bombole piccole o un contenitore da una tonnellata', 'Multiple ton cylinders': 'Più contenitori da una tonnellata' };
function ergHTML(u, esc, perStampa) {
  if (typeof ONU === 'undefined' || !ONU.onu[u]) return '';
  const o = ONU.onu[u], cls = perStampa ? 'nota' : 'small', gg = o.g || [];
  if (!gg.length) return '';
  let h = `<h4>ERG 2024 – Guida ${esc(gg.join(', '))}</h4>`;
  for (const k of gg) {
    const g = ONU.guide[k]; if (!g) continue;
    const espl = k === '112' || k === '114';
    const iso = g.iso_liq ? `${g.iso_liq} m liquidi / ${g.iso_sol} m solidi` : g.iso ? `${g.iso} m` : '–';
    const R = [['Isolamento iniziale (misura immediata)', `${iso} in tutte le direzioni`],
      [espl ? 'Parte consistente del carico coinvolta, senza incendio (ERG "Large Spill")' : 'Grande spandimento', g.grande ? `valutare evacuazione iniziale ${g.grande} m ${espl ? 'in tutte le direzioni' : 'sottovento'}` : '–'],
      ['Incendio che coinvolge cisterna, carro o rimorchio', g.fuoco ? `isolare ${g.fuoco} m in tutte le direzioni` : '–']];
    h += `<p class="${cls}"><b>Guida ${esc(k)}</b> – ${esc(g.t)} (${esc(g.t_en)})</p><table class="scheda">${R.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>`;
  }
  const t1 = ONU.t1[u];
  if (t1 && t1.length) {
    h += `<p class="${cls}"><b>Sostanza tossica per inalazione (TIH), Tabella 1 ERG</b>: isolamento in tutte le direzioni e protezione sottovento (km), giorno e notte.</p><table class="scheda">` +
      t1.map(x => { const p = x.d.piccolo, g = x.d.grande; const gt = typeof g === 'string' ? g : g ? `isolamento ${g.isol_m} m; giorno ${g.giorno_km} km; notte ${g.notte_km} km` : '–';
        return `<tr><td>${esc(x.n)}</td><td>Piccolo spandimento: ${p ? `isolamento ${p.isol_m} m; giorno ${p.giorno_km} km; notte ${p.notte_km} km` : '–'}<br>Grande spandimento: ${esc(gt)}</td></tr>`; }).join('') + '</table>';
  }
  if (o.t2 || ONU.t2[u]) { const t2 = ONU.t2[u] || {}; h += `<p class="${cls}"><b>Reagisce con l'acqua (Tabella 2 ERG)</b>${t2.gas ? ': gas sviluppati ' + esc(t2.gas.join(', ')) : ''}.</p>`; }
  const t3 = ONU.t3[u];
  if (t3) h += `<p class="${cls}"><b>Tabella 3 ERG – ${esc(t3.nome)}</b> (grandi spandimenti; isolamento; protezione sottovento in km, vento debole/moderato/forte)</p><table class="scheda">` +
    t3.righe.map(r => `<tr><td>${esc(TRAD_CONT_T3[r.contenitore] || r.contenitore)}</td><td>isolamento ${r.isol_m} m; giorno ${['debole', 'moderato', 'forte'].map(v => r.giorno_km[v]).join(' / ')} km; notte ${['debole', 'moderato', 'forte'].map(v => r.notte_km[v]).join(' / ')} km${r.plus.length ? ' (+ in alcune condizioni la distanza può essere maggiore)' : ''}</td></tr>`).join('') + '</table>';
  h += `<p class="${cls}">Fonte: Emergency Response Guidebook 2024; distanze iniziali per la prima fase di un'emergenza, da adattare alla situazione.</p>`;
  return h;
}
// ---------- scheda della voce DGL ----------
function schedaHTML(u, iv, esc, perStampa = false) {
  const tutte = DATA.dgl[u] || [], r = tutte[iv || 0];
  if (!r) return '<div class="warn">Numero ONU non presente nella Dangerous Goods List dell\'IMDG Code 42-24.</div>';
  const cls = perStampa ? 'nota' : 'small', righe = [r];
  let h = `<p class="${cls}">Fonte: IMDG Code, Emendamento 42-24 (Ris. MSC.556(108)), Dangerous Goods List e capitoli 3.3, 3.5, 4.1, 4.2, 7.1 e 7.2, testo originale inglese; guida EmS MSC.1/Circ.1588/Rev.4; ERG 2024. Dati da estrazione automatica dal PDF ufficiale, verificati come descritto nella documentazione dell'app.${tutte.length > 1 ? ` Voce ${iv + 1} delle ${tutte.length} voci della DGL per UN ${esc(u)}, quella scelta per la merce nel carico.` : ''}</p>`;
  const x = schedaDati(r), mp = /\bP\b/.test(r['4']);
  h += `
    <table class="scheda">
      <tr><td>(1) Numero ONU</td><td><b>UN ${esc(u)}</b></td></tr>
      <tr><td>(2) Nome di spedizione</td><td><b>${esc(r['2'])}</b></td></tr>
      <tr><td>(3) Classe o divisione</td><td>${esc(r['3'])}</td></tr>
      <tr><td>(4) Rischi sussidiari</td><td>${esc(r['4'] || '–')}${mp ? ' – <b>inquinante marino</b> (P)' : ''}</td></tr>
      <tr><td>(5) Gruppo di imballaggio</td><td>${esc(r['5'] || '–')}</td></tr>
      <tr><td>(6) Disposizioni speciali</td><td>${esc(r['6'] || '–')}</td></tr>
      <tr><td>(7a) Quantità limitate</td><td>${esc(r['7a'] || '–')}${r['7a'] === '0' ? ' (non ammesse)' : ''}</td></tr>
      <tr><td>(7b) Quantità esenti</td><td>${esc(r['7b'] || '–')}${x.e ? ' – ' + esc(x.e) + (r['7b'] !== 'E0' ? ' (grammi per i solidi, mL per liquidi e gas; 3.5.1.2)' : '') : ''}</td></tr>
      <tr><td>(8)(9) Imballaggi: istruzioni e disposizioni</td><td>${esc(r['8'] || '–')} · ${esc(r['9'] || '–')}</td></tr>
      <tr><td>(10)(11) IBC: istruzioni e disposizioni</td><td>${esc(r['10'] || '–')} · ${esc(r['11'] || '–')}</td></tr>
      <tr><td>(13)(14) Cisterne mobili e contenitori per rinfuse: istruzioni e disposizioni</td><td>${esc(r['13'] || '–')} · ${esc(r['14'] || '–')}</td></tr>
      <tr><td>(15) EmS</td><td><b>${esc(r['15'] || '–')}</b>${ems(cgDati({ u, i: iv })) && r['15'] === '*' ? ' – ' + esc(ems(cgDati({ u, i: iv }))) : ''} <span class="${cls}">(F = incendio, S = spandimento)</span></td></tr>
      <tr><td>(16a) Stivaggio e movimentazione</td><td>${esc(r['16a'] || '–')}</td></tr>
      <tr><td>(16b) Segregazione</td><td>${esc(r['16b'] || '–')}</td></tr>
      <tr><td>(17) Proprietà e osservazioni</td><td>${esc(r['17'] || '–')}</td></tr>
    </table>`;
  if (x.sp.length) h += `<h4>Disposizioni speciali (3.3.1)</h4>${x.sp.map(([n, t]) => perStampa ? `<p class="nota"><b>SP ${esc(n)}</b> – ${esc(t).replace(/\n/g, '<br>')}</p>` : `<details><summary>SP ${esc(n)}</summary><p class="small">${esc(t).replace(/\n/g, '<br>')}</p></details>`).join('')}`;
  if (x.cat || x.sw.length || x.h.length) {
    h += '<h4>Stivaggio e movimentazione (7.1.3, 7.1.5, 7.1.6)</h4><ul class="' + (perStampa ? '' : 'ip') + '">';
    if (x.catTxt) h += `<li><b>Categoria ${esc(x.cat)}</b>: ${/^\d/.test(x.cat) ? 'navi da carico (fino a 12 passeggeri)' : 'navi da carico e navi passeggeri entro il limite di passeggeri'}: ${esc(x.catTxt[0])}; ${/^\d/.test(x.cat) ? 'navi passeggeri' : 'altre navi passeggeri'}: ${esc(x.catTxt[1])}</li>`;
    for (const [k, t] of [...x.sw, ...x.h]) h += `<li><b>${esc(k)}</b> – ${esc(t)}</li>`;
    h += '</ul>';
  }
  if (x.sg.length || x.sgg.length) h += `<h4>Segregazione particolare (7.2.5, 7.2.8)</h4><ul class="${perStampa ? '' : 'ip'}">${[...x.sgg.map(([k, t]) => [k, 'gruppo di segregazione: ' + t]), ...x.sg].map(([k, t]) => `<li><b>${esc(k)}</b> – ${esc(t)}</li>`).join('')}</ul>`;
  if (x.segr.length) {
    h += `<h4>Tabella di segregazione (7.2.4)</h4><p class="${cls}">Righe della classe ${x.segr.length > 1 ? 'e dei rischi sussidiari (si applica la prescrizione più severa, 7.2.3.3; con due o più rischi sussidiari vale 7.2.3.4)' : ''}; le prescrizioni della colonna 16b prevalgono (7.2.3.1).</p>
      <div class="scroll"><table class="segr"><tr><th>Classe</th>${x.segr.map(([k]) => `<th>${esc(k === '1.1' ? '1.1/1.2/1.5' : k === '1.3' ? '1.3/1.6' : k)}</th>`).join('')}</tr>
      ${SEGR_COL.map(c => `<tr><td>${esc(/^1\./.test(c) ? SEGR_NOMI[c] : c + ' ' + SEGR_NOMI[c])}</td>${x.segr.map(([, R]) => `<td class="n">${esc(R[c])}</td>`).join('')}</tr>`).join('')}</table></div>
      <p class="${cls}">${[1, 2, 3, 4, 'X', '*'].map(k => `${k} = ${esc(SEGR_TERMINI[k])}`).join(' · ')}.</p>`;
  }
  h += imbHTML(u, righe, esc, perStampa);
  h += emsHTML(u, righe, esc, perStampa);
  h += ergHTML(u, esc, perStampa);
  return h;
}
function apriScheda(n) {
  const it = carico[n]; if (!it || it.mhb) return;
  schedaAperta = { u: it.u, i: it.i || 0 };
  const card = $('schedacard'), box = $('schedabox');
  $('schedaTit').textContent = `Scheda merce – UN ${it.u}`;
  card.classList.remove('hide');
  box.innerHTML = '<p class="small">Caricamento dei dati…</p>';
  const u = it.u, i = it.i || 0;
  Promise.allSettled([caricaEMS(), caricaERG()]).then(() => { if (schedaAperta && schedaAperta.u === u) box.innerHTML = schedaHTML(u, i, esc); });
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('cgLista').addEventListener('click', e => { const t = e.target; if (t.dataset && t.dataset.k === 'scheda') apriScheda(+t.dataset.n); });
$('schedaChiudi').onclick = () => { $('schedacard').classList.add('hide'); schedaAperta = null; };
$('schedaPrint').onclick = async () => {
  if (!schedaAperta) return;
  stampaTesti.imb = $('stImb').checked; stampaTesti.ems = $('stEms').checked;
  if (stampaTesti.imb) { try { await caricaImb(); } catch (e) { stampaTesti.imb = false; } }
  await Promise.allSettled([caricaEMS(), caricaERG()]);
  const s = leggiImpostazioni(), quando = new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' }), { u, i } = schedaAperta;
  let h = s.carta ? cartaHTML() : '';
  h += `<div class="intest"><h1>Scheda merce pericolosa – UN ${esc(u)}</h1><table class="dati"><tr><td>Data di redazione</td><td>${esc(quando)}</td></tr><tr><td>Riferimenti</td><td>IMDG Code, Emendamento 42-24 (Ris. MSC.556(108)); guida EmS MSC.1/Circ.1588/Rev.4; ERG 2024</td></tr></table></div>`;
  h += schedaHTML(u, i, esc, true);
  h += `<p class="nota">Scheda di supporto tecnico redatta con l'app Verifica di segregazione v${VERSIONE}: non sostituisce il documento di trasporto né la consultazione del testo ufficiale del Codice IMDG; i testi delle disposizioni sono riportati nella lingua originale.</p>`;
  h += `<div class="firma"><div class="firmatario">${esc(s.nome)}</div><div>${esc(s.qualifica)}</div><div class="linea">Firma ____________________________</div></div>`;
  $('report').innerHTML = h;
  stampaTesti.imb = stampaTesti.ems = false;
  window.print();
};
if (typeof module !== 'undefined') module.exports = { schedaHTML, ergHTML };
