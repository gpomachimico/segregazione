/* Verifica di segregazione del carico – interfaccia, impostazioni, report stampabile, uso offline */
'use strict';
const VERSIONE = '1.11-beta';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- impostazioni del report (solo su questo dispositivo) ----------
const FIRMATARIO_DEFAULT = { nome: 'Dott. Gianluca POMA', qualifica: 'Consulente Chimico di Porto' };
function leggiImpostazioni() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('impostazioni') || '{}'); } catch (e) { s = {}; }
  return { nome: s.nome || FIRMATARIO_DEFAULT.nome, qualifica: s.qualifica || FIRMATARIO_DEFAULT.qualifica, carta: s.carta !== false };
}
function salvaImpostazioni(o) { try { localStorage.setItem('impostazioni', JSON.stringify(o)); return true; } catch (e) { return false; } }
(function initImpostazioni() {
  const s = leggiImpostazioni();
  $('sNome').value = s.nome; $('sQual').value = s.qualifica; $('sCarta').checked = s.carta;
  $('btnSet').onclick = () => $('setbox').classList.toggle('hide');
  $('sSave').onclick = () => {
    const ok = salvaImpostazioni({ nome: $('sNome').value.trim(), qualifica: $('sQual').value.trim(), carta: $('sCarta').checked });
    $('setbox').classList.add('hide');
    if (!ok) $('cgMsg').textContent = 'Impossibile salvare le impostazioni su questo dispositivo.';
  };
})();

// carta intestata dello Studio (dal modello Word fornito da Luca il 19/11/2026; uguale all'app aree di danno)
const STUDIO = {
  nome: 'Studio Professionale Associato Consulenti Chimici di Porto',
  soci: 'Dr. Poma Gianluca e Dr. Mameli Pier Luca',
  sede: 'Sede legale: Viale Diaz, 40 – 09125 Cagliari',
  fisc: 'Tel/fax +39 070303350 C.F./P. Iva 03231430921',
  sx: ['Dott. Gianluca POMA', 'Mobile: +39 333-5780697'],
  dx: ['Dott. Pier Luca MAMELI', 'Mobile: +39 393-9936321']
};
const cartaHTML = () => `<div class="carta"><img src="img/logo-scp.jpg" alt="Servizio Chimico di Porto – Cagliari"><div class="carta-t">
  <div class="c1">${STUDIO.nome}</div><div class="c2">${STUDIO.soci}</div><div class="c3">${STUDIO.sede}<br>${STUDIO.fisc}</div>
  <div class="c4"><span>${STUDIO.sx.join('<br>')}</span><span class="dx">${STUDIO.dx.join('<br>')}</span></div></div></div>`;

// ---------- carico ----------
let carico = [];
try { carico = JSON.parse(localStorage.getItem('carico') || '[]'); } catch (e) { carico = []; }
const salvaCarico = () => { try { localStorage.setItem('carico', JSON.stringify(carico)); localStorage.setItem('nave', JSON.stringify(nave)); } catch (e) { } };
// nave (v1.1): tipo di portacontainer, coperchi delle boccaporte, nave costruita prima delle date di 7.4.2.3.1 e 7.4.2.4.1
let nave = { tipo: 'chiuse', copert: 'stagni', vecchia: false, pax: 'carico' };
let tabBordo = false, tabCoppie = false;
try { tabBordo = localStorage.getItem('tabBordo') === '1'; tabCoppie = localStorage.getItem('tabCoppie') === '1'; } catch (e) { }
try { nave = Object.assign(nave, JSON.parse(localStorage.getItem('nave') || '{}')); } catch (e) { }
const NAVE_TIPO = { chiuse: 'portacontainer con stive chiuse (7.4.3.2)', senza: 'portacontainer senza boccaporti (hatchless, 7.4.3.3)', roro: 'nave ro-ro (7.5.3.2)', generale: 'nave da carico generale, stivaggio convenzionale (7.6.3)' };
const PAX = { carico: 'nave da carico o passeggeri entro 25 (o 1 ogni 3 m di lunghezza; per la classe 1 entro 12)', pax: 'nave passeggeri oltre tale numero' };
const COPERT = { stagni: 'coperchi delle boccaporte stagni', gutter: 'coperchi parzialmente stagni con gutterbar efficaci (7.4.2.2.1)', nogutter: 'coperchi parzialmente stagni senza gutterbar efficaci (7.4.2.2.2)' };
// 7.2.3.4: due o più rischi sussidiari e nessun codice che fissi la riga della tabella 7.2.4
const piuSussidiari = d => d.sub.length > 1 && !d.sg.some(k => SG_COME[k] || k === 'SG69') && !(d.sg.includes('SG68') && d.o.pf60);

function cgVoceHTML(it, n) {
  if (it.mhb) return `<div class="cgv"><div><b>${n}. MHB</b> – ${esc(it.nome || 'materiale pericoloso solo alla rinfusa')} <span class="small">(materiale pericoloso solo alla rinfusa, Codice IMSBC; tabella 7.6.3.5.2)</span></div><div class="row"><button type="button" class="sec mini" data-k="via" data-n="${n - 1}">Togli</button></div></div>`;
  const R = DATA.dgl[it.u], d = cgDati(it), o = it.opz || {};
  let h = `<div class="cgv"><div><b>${n}. UN ${esc(it.u)}</b> – ${esc(d.nome.length > 90 ? d.nome.slice(0, 90) + '…' : d.nome)} <span class="small">(classe ${esc(d.cl)}${d.sub.length ? ', sussidiari ' + esc(d.sub.join('/')) : ''}${d.pg && d.pg !== '–' ? ', GI ' + esc(d.pg) : ''}${d.r['16b'] && d.r['16b'] !== '–' ? ', 16b ' + esc(d.r['16b']) : ''})</span></div><div class="row">`;
  if (R.length > 1) h += `<select data-k="i" data-n="${n - 1}">${R.map((r, j) => `<option value="${j}"${j === (it.i || 0) ? ' selected' : ''}>voce ${j + 1}: ${esc(r['2'].slice(0, 60))}${r['5'] && r['5'] !== '–' ? ' – GI ' + esc(r['5']) : ''}</option>`).join('')}</select>`;
  h += `${d.rinfusa || d.bk ? '' : `${lqAmmessa(d.r) || it.lq ? `<label class="ck"><input type="checkbox" data-k="lq" data-n="${n - 1}"${it.lq ? ' checked' : ''}> quantità limitate (${esc(d.r['7a'])})</label>` : ''}${eqAmmessa(d.r) || it.eq ? `<label class="ck"><input type="checkbox" data-k="eq" data-n="${n - 1}"${it.eq ? ' checked' : ''}> quantità esenti (${esc(d.r['7b'])})</label>` : ''}`}<select data-k="unita" data-n="${n - 1}" aria-label="Unità di trasporto">${unitaAmmesse(d).map(k => [k, UNITA[k]]).map(([k, v]) => `<option value="${k}"${k === d.unita ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
  if (d.r['3'] === '2') h += `<select data-k="div2" data-n="${n - 1}">${['2.1', '2.2', '2.3'].map(x => `<option${x === (o.div2 || '2.2') ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
  if (d.sg.includes('SG69')) h += `<label class="ck"><input type="checkbox" data-k="aer1L" data-n="${n - 1}"${o.aer1L !== false ? ' checked' : ''}> capacità fino a 1 L</label>`;
  if (d.sg.includes('SG68')) h += `<label class="ck"><input type="checkbox" data-k="pf60" data-n="${n - 1}"${o.pf60 ? ' checked' : ''}> punto di infiammabilità ≤ 60 °C</label>`;
  if (/See/.test(d.r['4'] || '')) h += `<input type="text" data-k="sub" data-n="${n - 1}" value="${esc(o.sub || '')}" placeholder="rischi sussidiari (${esc(d.r['4'].replace(/^–\s*/, ''))})" style="width:12em">`;
  if (d.nos) h += `<input type="text" data-k="sgg" data-n="${n - 1}" value="${esc(o.sgg || '')}" placeholder="gruppo SGG dal documento di trasporto" style="width:15em">`;
  h += `<button type="button" class="sec mini" data-k="via" data-n="${n - 1}">Togli</button></div>`;
  if (piuSussidiari(d)) h += `<div class="warn">Due o più rischi sussidiari (${esc(d.sub.join(', '))}): secondo 7.2.3.4 le prescrizioni sono quelle della colonna 16b; la tabella 7.2.4 si applica solo alla classe principale.<label class="ck"><input type="checkbox" data-k="subTab" data-n="${n - 1}"${o.subTab ? ' checked' : ''}> considera anche i rischi sussidiari nella tabella 7.2.4 (scelta oltre il testo del Codice, indicata nel report)</label></div>`;
  const VM = verificaModalita(d, nave);
  if (VM.length) h += VM.map(v => `<p class="${v.liv === 'errore' ? 'err' : 'warn'}">${v.liv === 'errore' ? 'Non ammesso' : 'Attenzione'}: ${esc(v.txt)} <span class="small">(${esc(v.par)})</span></p>`).join('');
  const al = d.rinfusa || (d.colli && nave.tipo === 'generale') ? '' : alimenti(d), ag = nave.tipo === 'generale' && !d.rinfusa ? alimentiGen(d) : '', fl = [al && 'Alimenti: ' + al, ag && 'Alimenti a bordo: ' + ag];
  for (const k of d.sg) if (['SG23', 'SG41', 'SG57', 'SG71', 'SG72', 'SG29', 'SG50'].includes(k)) fl.push(`${k}: ${DATA.imdgCod.SG[k]}`);
  if (fl.filter(Boolean).length) h += `<p class="small">${fl.filter(Boolean).map(esc).join(' · ')}</p>`;
  if (d.cl === '1' && d.u === '0190') h += '<p class="small">Campioni di esplosivo: divisione e gruppo di compatibilità non indicati nella DGL; si usa la divisione 1.1, la più severa, e nessuna compatibilità con altre merci della classe 1.</p>';
  return h + '</div>';
}
const UNITA = { chiusa: 'unità chiusa', aperta: 'unità aperta', cisterna: 'cisterna (colonna 13)', colli: 'colli, stivaggio convenzionale', bk2: 'bulk container chiuso (BK2)', bk1: 'bulk container telonato (BK1)', bk3: 'bulk container flessibile (BK3)', rinfusa: 'solido alla rinfusa sciolto in stiva (IMSBC)' };
const UNITA_TXT = { aperta: 'unità aperta', cisterna: 'in cisterna', colli: 'colli in stivaggio convenzionale', bk1: 'bulk container telonato BK1', bk2: 'bulk container chiuso BK2', bk3: 'bulk container flessibile BK3', rinfusa: 'solido alla rinfusa sciolto in stiva' };
// unità proposte per una voce: bulk container solo se previsti dalla colonna 13; rinfusa sciolta e BK3 solo su nave da carico generale
const unitaAmmesse = d => modiOfferti(d, nave.tipo);
const cella = p => p.imsbc ? '<td class="n cgl0" title="segregazione fra rinfuse: Codice IMSBC">R</td>' : `<td class="n cgl${p.lev}">${p.lev ? p.lev : '–'}${p.levDer < p.lev ? '<sup>d</sup>' : ''}${p.levCond > p.lev ? '*' : ''}${p.motivi.some(m => m.opz && m.lev === p.lev && p.lev) ? '<sup>u</sup>' : ''}</td>`;
// prescrizioni a bordo di una coppia secondo il tipo di nave: celle in italiano (it) e testo originale (en)
function bordoCoppia(A, B, l) {
  const t = nave.tipo;
  if (A.rinfusa || B.rinfusa) { const g = bordoBulk(l); return { par: '7.6.3.5.3', lev: l, rid: false, bulk: true, it: [g.on, g.under], en: `${l ? TERMINE[l] : 'no segregation'} (7.6.3.5.3): ${g.en}` }; }
  if (t === 'generale') {
    const g = bordoGen(l, A, B), rid = g.lev !== l;
    return { par: g.par, lev: g.lev, rid, it: [g.on, g.under], en: `${g.lev ? TERMINE[g.lev] : 'no segregation'}${rid ? ` instead of ${TERMINE[l]} (${g.par})` : ''}: ${g.en}` };
  }
  const cm = combo(A, B, t);
  if (t === 'roro') { const b = bordoRoro(l, cm); const x = [b.faOn, b.faUnder, b.atOn, b.atUnder];
    return { par: b.par, cm, lev: l, it: x.map(trad), en: `${b.par}, ${COMBO[cm][1]}: fore and aft – on deck: ${x[0]}, under deck: ${x[1]}; athwartships – on deck: ${x[2]}, under deck: ${x[3]}` }; }
  const b = bordo(l, cm, t), x = [b.v, b.faOn, b.faUnder, b.atOn, b.atUnder];
  return { par: b.par, cm, lev: l, it: x.map(trad), en: `${b.par}, ${COMBO[cm][1]}: vertical – ${x[0]}; fore and aft – on deck: ${x[1]}, under deck: ${x[2]}; athwartships – on deck: ${x[3]}, under deck: ${x[4]}` };
}
const TAB_TIPO = () => nave.tipo === 'roro' ? { par: '7.5.3.2', nome: TAB_RORO.nome } : nave.tipo === 'generale' ? { par: '7.6.3.2', nome: 'segregation of packages containing dangerous goods and stowed in the conventional way' } : TAB_CNT[nave.tipo];
function bordoHTML(D, P, cls, perStampa) { // tabella a bordo: 7.4.3.2, 7.4.3.3, 7.5.3.2 o 7.6.3.2
  const righe = [];
  for (const [k, p] of Object.entries(P)) {
    const [a, b] = k.split('-').map(Number), lv = [p.lev, p.levCond > p.lev ? p.levCond : 0].filter(Boolean);
    lv.forEach((l, j) => righe.push([a, b, l, j > 0]));
  }
  const T = TAB_TIPO(), t = nave.tipo;
  if (!righe.length) return `<h3>A bordo: ${esc(NAVE_TIPO[t])}</h3><p class="${cls}">Nessuna coppia del carico richiede segregazione: nessuna prescrizione di ${T.par}.</p>`;
  // tabella delle coppie: sullo schermo solo a richiesta, nel report solo se attivata (richiesta di Luca, v1.4)
  let h = `<h3>A bordo: ${esc(NAVE_TIPO[t])}</h3>`;
  if (!perStampa) h += `<button type="button" class="sec mini" id="btnBordo" aria-pressed="${tabBordo}">${tabBordo ? 'Nascondi la tabella delle coppie' : 'Mostra la tabella delle coppie (sarà riportata anche nel report)'}</button>`;
  if (!tabBordo) h += `<p class="${cls}">${perStampa ? '' : 'Tabella non attiva. '}${tabCoppie ? `Le prescrizioni a bordo di ogni coppia (${T.par}, testo originale) sono nel dettaglio per coppia.` : `Prescrizioni a bordo di ${T.par} per ${righe.length === 1 ? 'una coppia' : righe.length + ' coppie'}: ${perStampa ? 'non riportate in questo report' : 'attivare la tabella o il dettaglio per coppia'}.`}</p>`;
  else {
    const th = t === 'generale' ? '<th>Coppia</th><th>Sul ponte</th><th>Sotto il ponte</th>'
      : `<th>Coppia</th>${t === 'roro' ? '' : '<th>Verticale</th>'}<th>Longitudinale<br>sul ponte</th><th>Longitudinale<br>sotto il ponte</th><th>Trasversale<br>sul ponte</th><th>Trasversale<br>sotto il ponte</th>`;
    h += `<div class="scroll"><table class="segr bordo"><tr>${th}</tr>`;
    for (const [a, b, l, cond] of righe) {
      if (t !== 'generale' && (D[a].rinfusa || D[b].rinfusa)) continue;
      const bc = bordoCoppia(D[a], D[b], l);
      const et = t === 'generale' ? `${esc(bc.lev ? TERMINE_IT[bc.lev] : TERMINE_IT[0])}${bc.bulk ? ' (rinfusa, 7.6.3.5.3)' : ''}${bc.rid ? ` invece di ${esc(TERMINE_IT[l])} (${bc.par})` : ''}` : `${esc(TERMINE_IT[l])}; ${COMBO_IT[bc.cm]}`;
      h += `<tr><td>${a + 1}–${b + 1}${cond ? ' *' : ''}<br><span class="small">${et}</span></td>${bc.it.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`;
    }
    const nota = t === 'generale'
      ? `Sintesi delle definizioni di 7.6.3.2 (edizione italiana del Codice), con le eccezioni di 7.6.3.3 (colli con unità di trasporto) e 7.6.3.4 (unità chiuse in stive non attrezzate per container); fa fede il testo inglese, riportato nel dettaglio di ogni coppia. Per “separato mediante un compartimento completo o una stiva da”: uno dei due ponti deve essere resistente al fuoco e ai liquidi (nota della figura di 7.6.3.2).`
      : t === 'roro' ? `Tabella 7.5.3.2 (“${T.nome}”), testo dell'edizione italiana del Codice; fa fede il testo inglese, riportato nel dettaglio di ogni coppia. Nota: tutte le paratie e ponti devono essere resistenti al fuoco e ai liquidi. Più container sullo stesso chassis: fra loro si applica il capitolo 7.4 (7.5.1.4).`
      : `Tabella ${T.par} (“${T.nome}”), testo dell'edizione italiana del Codice; fa fede il testo inglese, riportato nel dettaglio di ogni coppia. Spazio container: almeno 6 m in senso longitudinale o almeno 2,4 m in senso trasversale (7.4.3.1.1). * Container a non meno di 6 m dalla paratia intermedia. Nota: tutte le paratie e ponti devono essere resistenti al fuoco e ai liquidi.`;
    h += `</table></div><p class="${cls}">${nota} Righe con * a sinistra: valgono se ricorrono le condizioni indicate per la coppia. Unità aperta: unità che non è chiusa, cioè che non racchiude interamente il contenuto con strutture permanenti a pareti complete e rigide; le unità con pareti o tetto in telone non sono chiuse (definizioni del capitolo 1.2; per la classe 1, 7.1.2).${t !== 'generale' && D.some(d => d.colli) ? ' Colli indicati come stivaggio convenzionale: considerati come unità aperte (scelta prudente dell\'app; per i colli si applica il capitolo 7.6).' : ''}</p>`;
  }
  const vert = righe.some(r => r[2] >= 2) || righe.some(r => r[2] === 1 && combo(D[r[0]], D[r[1]], t) !== 'CC');
  if (t === 'chiuse' && nave.copert === 'gutter') h += `<p class="${cls}">Coperchi parzialmente stagni con gutterbar efficaci: considerati “resistant to fire and liquid” (7.4.2.2.1.1)${vert ? '; dove è richiesto “not in the same vertical line unless separated by a deck”, i container con merci pericolose non nei tier direttamente sopra un clear gap, salvo stiva conforme a SOLAS II-2/19 (II-2/54), e container con merci incompatibili non entro le relevant sensitive vertical lines sotto il ponte (7.4.2.2.1.2; definizioni in MSC/Circ.1087)' : ''}.</p>`;
  if (t === 'chiuse' && nave.copert === 'nogutter') h += `<p class="${cls}">Coperchi parzialmente stagni senza gutterbar efficaci: container con merci pericolose non sui coperchi, salvo stiva conforme a SOLAS II-2/19 (II-2/54) (7.4.2.2.2.1); container con merci incompatibili non entro le relevant sensitive vertical lines dei clear gap, sia con merci sul ponte sia con merci sotto il ponte (7.4.2.2.2.2–7.4.2.2.2.4; definizioni in MSC/Circ.1087).</p>`;
  if (D.some(d => d.rinfusa)) h += `<p class="${cls}">${t === 'generale' ? 'Coppie con una rinfusa: definizioni di 7.6.3.5.3 (testo originale nel dettaglio per coppia; sintesi in italiano come traduzione di lavoro). Fra due rinfuse: Codice IMSBC.' : 'Materiali alla rinfusa nel carico: la segregazione rinfusa–merci imballate (7.6.3.5) riguarda le navi da carico generale; scegliere questo tipo di nave per le prescrizioni a bordo.'}</p>`;
  if (t === 'roro' && nave.vecchia) h += `<p class="${cls}">Nave con chiglia impostata prima del 1/9/1984: negli spazi ro-ro chiusi a cui non si applicano SOLAS II-2/20 (o II-2/37 e 38) ventilazione meccanica a giudizio dell'Amministrazione, sempre in funzione con veicoli a bordo (7.5.2.11).</p>`;
  if (t === 'generale' && righe.some(r => D[r[0]].cl1 && D[r[1]].cl1)) h += `<p class="${cls}">Classe 1 sul ponte: gruppi di compatibilità diversi ad almeno 6 m, salvo stivaggio misto ammesso da 7.2.7 (7.6.2.4.3); nelle navi a stiva unica eccezioni per i gruppi B e D (7.6.2.4.4).</p>`;
  return h;
}
function stivaggioHTML(D, perStampa) { // prescrizioni di stivaggio per merce (7.1.3, 3.4.3, 3.5.7, colonna 16a, 7.4.1, 7.4.2)
  let h = `<h3>Stivaggio delle merci: ${esc(NAVE_TIPO[nave.tipo].replace(/ \(.*$/, ''))}</h3>`;
  D.forEach((d, j) => {
    const S = stivaggio(d, nave);
    const li = S.map(x => `<li>${x.cond ? '* ' : ''}${esc(x.txt)} <span class="small">(${esc(x.par)})</span>${x.cond ? ` – <i>${esc(x.cond)}</i>` : ''}</li>`).join('');
    h += perStampa ? `<p class="coppia">${j + 1}. ${esc(lab(d))}${UNITA_TXT[d.unita] ? ', ' + UNITA_TXT[d.unita] : ''}</p><ul>${li}</ul>` : `<details><summary>${j + 1}. ${esc(lab(d))}${UNITA_TXT[d.unita] ? ' (' + UNITA_TXT[d.unita] + ')' : ''}</summary><ul class="ip">${li}</ul></details>`;
  });
  return h;
}
function segnalateHTML(D, P, cls) { // elenco fisso delle coppie con *, d o u, sempre sullo schermo e nel report (richiesta di Luca, v1.7)
  const R = [];
  for (const [k, p] of Object.entries(P)) {
    const [a, b] = k.split('-').map(Number), voci = [];
    const fmt = l => l ? `${TERMINE[l]} (${TERMINE_IT[l]})` : TERMINE_IT[0];
    for (const m of p.motivi.filter(m => m.cond && m.lev > p.lev)) voci.push(`<b>*</b> ${esc(fmt(m.lev))} ${/^se\b/.test(m.cond) ? '' : 'se: '}${esc(m.cond)} <span class="small">(${esc(m.txt)})</span>`);
    if (p.levDer < p.lev) {
      const der = p.motivi.filter(m => m.der && !m.cond && m.lev > p.levDer);
      voci.push(`<b><sup>d</sup></b> ${esc(fmt(p.levDer))} invece di ${esc(TERMINE[p.lev])}: ${esc([...new Set(der.map(m => typeof m.der === 'string' ? m.der : 'deroga secondo 7.2.6.1 se le merci non reagiscono pericolosamente fra loro'))].join('; '))}`);
    }
    if (p.lev && p.motivi.some(m => m.opz && m.lev === p.lev)) voci.push(`<b><sup>u</sup></b> ${esc(fmt(p.lev))} per la scelta dell'utente di applicare la tabella 7.2.4 ai rischi sussidiari (oltre 7.2.3.4)`);
    if (voci.length) R.push(`<li><b>${a + 1}–${b + 1}</b>: ${esc(lab(D[a]))} / ${esc(lab(D[b]))} → ${esc(p.lev ? TERMINE[p.lev] : TERMINE_IT[0])}<ul>${voci.map(v => `<li>${v}</li>`).join('')}</ul></li>`);
  }
  return R.length ? `<h3>Coppie con condizioni o deroghe</h3><ul class="segnalate">${R.join('')}</ul>` : '';
}
function caricoRisHTML(perStampa = false) {
  const D = carico.map(cgDati), n = D.length, cls = perStampa ? 'nota' : 'small';
  if (n < 2) return `<p class="${cls}">Aggiungere almeno due merci.</p>`;
  const P = {};
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) P[a + '-' + b] = coppiaCarico(D[a], D[b]);
  const nErr = D.filter(d => verificaModalita(d, nave).some(v => v.liv === 'errore')).length;
  let h = nErr ? `<p class="err">${nErr === 1 ? 'Una merce ha' : nErr + ' merci hanno'} una modalità di trasporto non ammessa dal Codice: vedere ${perStampa ? 'l\'elenco delle merci' : 'la voce nella lista'}.</p>` : '';
  h += `<h3>Matrice di segregazione</h3><div class="scroll"><table class="segr cgm"><tr><th></th>${D.map((d, j) => `<th>${j + 1}</th>`).join('')}</tr>`;
  D.forEach((d, a) => { h += `<tr><td>${a + 1}. ${esc(lab(d))}${d.rinfusa ? ' <span class="small">(rinfusa)</span>' : ''}</td>${D.map((e, b) => a === b ? '<td class="n">·</td>' : cella(P[Math.min(a, b) + '-' + Math.max(a, b)])).join('')}</tr>`; });
  // legenda: una voce per riga (richiesta di Luca, v1.7)
  const leg = [0, 1, 2, 3, 4].map(l => `<b>${l || '–'}</b> = ${l ? esc(TERMINE[l]) + ' (' + esc(TERMINE_IT[l]) + ')' : esc(TERMINE_IT[0])}`);
  leg.push('<b><sup>d</sup></b> = deroga possibile (7.2.6.1 o 7.2.6.5) se ne ricorrono le condizioni',
    '<b>*</b> = prescrizione più severa se ricorrono condizioni da verificare sulla merce',
    '<b><sup>u</sup></b> = livello dovuto alla scelta dell\'utente di considerare i rischi sussidiari oltre 7.2.3.4');
  if (Object.values(P).some(p => p.imsbc)) leg.push('<b>R</b> = due materiali alla rinfusa: segregazione secondo il Codice IMSBC, non calcolata');
  if (Object.values(P).some(p => p.rinfusa && !p.imsbc)) leg.push('rinfusa con merce imballata: tabella 7.6.3.5.2');
  h += `</table></div><ul class="leg ${cls}">${leg.map(x => `<li>${x}</li>`).join('')}</ul>`;
  h += segnalateHTML(D, P, cls);
  h += bordoHTML(D, P, cls, perStampa);
  // dettaglio per coppia: sullo schermo solo a richiesta, nel report solo se attivato (richiesta di Luca, v1.5)
  if (!perStampa || tabCoppie) h += '<h3>Dettaglio per coppia</h3>';
  if (!perStampa) h += `<button type="button" class="sec mini" id="btnCoppie" aria-pressed="${tabCoppie}">${tabCoppie ? 'Nascondi il dettaglio per coppia' : 'Mostra il dettaglio per coppia (sarà riportato anche nel report)'}</button>`;
  if (!tabCoppie && !perStampa) h += `<p class="${cls}">Dettaglio non attivo: paragrafi del Codice, unità di trasporto e prescrizioni a bordo (testo originale) di ogni coppia.</p>`;
  if (tabCoppie) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const p = P[a + '-' + b], cond = p.motivi.filter(m => m.cond && m.lev > p.lev), der = p.motivi.filter(m => m.der && !m.cond && m.lev > p.levDer);
    const titolo = `${a + 1}–${b + 1}: ${esc(lab(D[a]))} / ${esc(lab(D[b]))} → <b>${p.lev ? TERMINE[p.lev] : TERMINE_IT[0]}</b>${p.levDer < p.lev ? ` (deroga possibile: ${p.levDer ? TERMINE[p.levDer] : TERMINE_IT[0]})` : ''}${cond.length ? ' *' : ''}`;
    const ctu = p.lev === 0 ? (p.ctu ? 'ammesse nella stessa unità di trasporto' : 'non nella stessa unità di trasporto') : p.lev === 1 ? 'non nella stessa unità di trasporto, salvo approvazione dell\'autorità competente con un livello di sicurezza equivalente (7.3.4.1); non nello stesso imballaggio esterno (7.2.3.2)' : 'non nella stessa unità di trasporto né nello stesso imballaggio esterno (7.2.3.2, 7.3.4.1)';
    let c = `<ul class="${perStampa ? '' : 'ip'}">${p.motivi.filter(m => !m.cond && !(m.der && m.lev > p.levDer)).map(m => `<li>${esc(m.txt)}</li>`).join('')}`;
    c += der.map(m => `<li>${esc(m.txt)} – <i>${esc(typeof m.der === 'string' ? m.der : 'derogabile secondo 7.2.6.1 se le merci non reagiscono pericolosamente fra loro')}</i></li>`).join('');
    c += cond.map(m => `<li>* ${esc(m.txt)} – <i>${esc(m.cond)}</i></li>`).join('');
    c += p.note.map(t => `<li class="${cls}">${esc(t)}</li>`).join('');
    if (!p.rinfusa) c += `<li><b>Unità di trasporto</b>: ${esc(ctu)}</li>`;
    if (p.lev) { const bc = bordoCoppia(D[a], D[b], p.lev); c += `<li><b>A bordo</b> (testo originale): ${esc(bc.en)}</li>`; }
    c += '</ul>';
    h += perStampa ? `<p class="coppia">${titolo}</p>${c}` : `<details${p.lev || cond.length ? ' open' : ''}><summary>${titolo}</summary>${c}</details>`;
  }
  h += stivaggioHTML(D, perStampa);
  const scelte = D.filter(d => piuSussidiari(d) && d.o.subTab).map(d => 'UN ' + d.u);
  h += `<p class="${cls}">Ipotesi della verifica: tabella 7.2.4 con la classe principale e, se la DGL indica un solo rischio sussidiario, anche con quello (7.2.3.3); con due o più rischi sussidiari valgono le prescrizioni della colonna 16b (7.2.3.4)${scelte.length ? `; per ${scelte.join(', ')} l'utente ha scelto di applicare la tabella 7.2.4 anche ai rischi sussidiari, oltre quanto previsto da 7.2.3.4` : ''}; i codici “come per la classe” sostituiscono la riga della classe principale (7.2.6.2); nei codici “classe …” della colonna 16b la classe comprende i rischi sussidiari (7.2.2.2); prevale la prescrizione più severa e la colonna 16b prevale sulla tabella (7.2.3.1). A bordo: tabella 7.4.3.2, 7.4.3.3 o 7.5.3.2, oppure definizioni di 7.6.3.2 con 7.6.3.3 e 7.6.3.4, secondo il tipo di nave e l'unità indicata per ogni merce (chiusa, aperta, colli). Solidi in bulk container (BK2 chiuso, BK1 telonato = unità aperta, BK3 flessibile = come colli in stiva): segregazione delle unità di trasporto. Solidi alla rinfusa sciolti in stiva: tabella 7.6.3.5.2 con la classe principale e la colonna 16b; fra due rinfuse vale il Codice IMSBC, non calcolato. Rinfuse liquide non considerate. Non sono riportate le prescrizioni per le chiatte (7.7). Verifica di supporto tecnico: la responsabilità della segregazione resta di chi prepara il carico.</p>`;
  return h;
}
function mostraCarico() {
  carico = carico.filter(it => it.mhb || DATA.dgl[it.u]);
  $('cgLista').innerHTML = carico.length ? carico.map((it, j) => cgVoceHTML(it, j + 1)).join('') : '<p class="small">Nessuna merce nel carico.</p>';
  $('cgRis').innerHTML = caricoRisHTML();
  $('cgN').textContent = carico.length ? ` (${carico.length})` : '';
  salvaCarico();
}
function aggiungi(u, i = 0) {
  u = String(u || '').replace(/\D/g, '').padStart(4, '0');
  if (!DATA.dgl[u]) { $('cgMsg').textContent = `UN ${u} non è nella Dangerous Goods List.`; return false; }
  $('cgMsg').textContent = ''; carico.push({ u, i, opz: {} }); return true;
}

// ---------- ricerca per numero ONU o per nome ----------
const norma = s => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
let indice = null;
function cerca(q) {
  const box = $('cgRes'); box.innerHTML = '';
  const t = q.trim(); if (!t) return;
  if (/^\d{1,4}$/.test(t)) {
    const u = t.padStart(4, '0'), R = DATA.dgl[u];
    if (t.length < 4 || !R) { box.innerHTML = t.length === 4 ? '<p class="small">Numero non presente nella DGL.</p>' : ''; return; }
    box.innerHTML = R.map((r, j) => `<button type="button" class="res" data-u="${u}" data-i="${j}"><b>UN ${u}</b>${R.length > 1 ? `voce ${j + 1}: ` : ''}${esc(r['2'].slice(0, 110))} <span class="small">– classe ${esc(r['3'])}${r['5'] && r['5'] !== '–' ? ', GI ' + esc(r['5']) : ''}</span></button>`).join('');
    return;
  }
  const p = norma(t).split(' ').filter(Boolean); if (!p.length || p.join('').length < 3) return;
  if (!indice) { indice = []; for (const [u, R] of Object.entries(DATA.dgl)) R.forEach((r, j) => indice.push([u, j, norma(r['2']), r])); }
  const hit = indice.filter(x => p.every(w => x[2].includes(w)));
  hit.sort((a, b) => (b[2].startsWith(p[0]) - a[2].startsWith(p[0])) || a[2].length - b[2].length);
  box.innerHTML = hit.slice(0, 30).map(([u, j, , r]) => `<button type="button" class="res" data-u="${u}" data-i="${j}"><b>UN ${u}</b>${esc(r['2'].slice(0, 110))} <span class="small">– classe ${esc(r['3'])}${r['5'] && r['5'] !== '–' ? ', GI ' + esc(r['5']) : ''}</span></button>`).join('')
    + (hit.length > 30 ? `<p class="small">Altre ${hit.length - 30} voci: precisare la ricerca.</p>` : '') + (hit.length ? '' : '<p class="small">Nessuna voce trovata.</p>');
}
$('cgU').addEventListener('input', () => cerca($('cgU').value));
$('cgU').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return; e.preventDefault();
  const r = $('cgRes').querySelectorAll('.res'); if (r.length === 1) r[0].click();
});
$('cgRes').addEventListener('click', e => {
  const b = e.target.closest('.res'); if (!b) return;
  if (aggiungi(b.dataset.u, +b.dataset.i)) { $('cgU').value = ''; $('cgRes').innerHTML = ''; mostraCarico(); $('cgU').focus(); }
});
$('cgMhbAdd').onclick = () => {
  const nome = $('cgMhb').value.trim();
  if (!nome) { $('cgMsg').textContent = 'Indicare il nome del materiale MHB (come nel Codice IMSBC).'; $('cgMhb').focus(); return; }
  carico.push({ mhb: true, nome, u: 'MHB' }); $('cgMhb').value = ''; $('cgMsg').textContent = ''; mostraCarico();
};
$('cgVuota').onclick = () => { if (!carico.length || confirm('Togliere tutte le merci dal carico?')) { carico = []; mostraCarico(); } };
$('cgLista').addEventListener('change', e => {
  const t = e.target, n = +t.dataset.n, k = t.dataset.k; if (!k || !carico[n]) return;
  const it = carico[n]; it.opz = it.opz || {};
  if (k === 'i') it.i = +t.value; else if (k === 'lq' || k === 'eq') it[k] = t.checked;
  else if (['aer1L', 'pf60', 'subTab', 'aperto'].includes(k)) it.opz[k] = t.checked; else it.opz[k] = t.value;
  mostraCarico();
});
$('cgRis').addEventListener('click', e => {
  const id = e.target.id;
  if (id === 'btnBordo') tabBordo = !tabBordo; else if (id === 'btnCoppie') tabCoppie = !tabCoppie; else return;
  try { localStorage.setItem('tabBordo', tabBordo ? '1' : '0'); localStorage.setItem('tabCoppie', tabCoppie ? '1' : '0'); } catch (er) { }
  mostraCarico(); const b = $(id); if (b) b.focus();
});
$('cgLista').addEventListener('click', e => { const t = e.target; if (t.dataset.k === 'via') { carico.splice(+t.dataset.n, 1); mostraCarico(); } });

// ---------- report stampabile ----------
$('cgPrint').onclick = () => {
  if (carico.length < 2) { $('cgMsg').textContent = 'Aggiungere almeno due merci.'; return; }
  const s = leggiImpostazioni(), quando = new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' }), rif = $('cgRif').value.trim();
  let h = s.carta ? cartaHTML() : '';
  h += `<div class="intest"><h1>Verifica di segregazione del carico</h1><table class="dati"><tr><td>Data di redazione</td><td>${esc(quando)}</td></tr>${rif ? `<tr><td>Carico</td><td>${esc(rif)}</td></tr>` : ''}<tr><td>Riferimenti</td><td>IMDG Code, Emendamento 42-24 (Ris. MSC.556(108)), capitoli 3.4, 3.5, 7.1, 7.2, 7.3 e 7.4</td></tr></table></div>`;
  h += '<h3>Merci del carico</h3><table class="dati merci">' + carico.map((it, j) => { const d = cgDati(it); return `<tr><td>${j + 1}. ${esc(lab(d))}</td><td>${esc(d.nome)} – ${d.mhb ? 'materiale pericoloso solo alla rinfusa (MHB)' : 'classe ' + esc(d.cl)}${UNITA_TXT[d.unita] ? '; ' + UNITA_TXT[d.unita] : ''}${d.sub.length ? ', rischi sussidiari ' + esc(d.sub.join('/')) : ''}${d.pg && d.pg !== '–' ? ', GI ' + esc(d.pg) : ''}; 16b: ${esc(d.r['16b'] || '–')}${d.sgg.length && d.o.sgg ? '; gruppo dichiarato ' + esc(d.o.sgg) : ''}${it.lq ? '; quantità limitate' : ''}${it.eq ? '; quantità esenti' : ''}${piuSussidiari(d) && d.o.subTab ? '; tabella 7.2.4 applicata anche ai rischi sussidiari per scelta dell\'utente' : ''}${alimenti(d) ? '; alimenti: ' + esc(alimenti(d)) : ''}${verificaModalita(d, nave).map(v => `<br><b>${v.liv === 'errore' ? 'Non ammesso' : 'Attenzione'}</b>: ${esc(v.txt)} (${esc(v.par)})`).join('')}</td></tr>`; }).join('') + '</table>';
  h += `<table class="dati"><tr><td>Nave</td><td>${esc(NAVE_TIPO[nave.tipo])}${nave.tipo === 'chiuse' ? '; ' + esc(COPERT[nave.copert]) : ''}${['roro', 'generale'].includes(nave.tipo) ? '; ' + esc(PAX[nave.pax || 'carico']) : ''}${nave.vecchia ? '; costruita prima del 1/9/1984 (≥ 500 GT) o del 1/2/1992 (< 500 GT)' : ''}</td></tr></table>`;
  h += caricoRisHTML(true);
  h += `<p class="nota">Parere tecnico di supporto redatto con l'app Verifica di segregazione v${VERSIONE}: non è un atto amministrativo e non sostituisce la consultazione del testo ufficiale del Codice IMDG.</p>`;
  h += `<div class="firma"><div class="firmatario">${esc(s.nome)}</div><div>${esc(s.qualifica)}</div><div class="linea">Firma ____________________________</div></div>`;
  $('report').innerHTML = h; window.print();
};

// ---------- avvio ----------
(function initNave() {
  $('nvTipo').value = nave.tipo; $('nvCop').value = nave.copert; $('nvVecchia').checked = nave.vecchia; $('nvPax').value = nave.pax || 'carico';
  const vis = () => { $('nvCopBox').classList.toggle('hide', nave.tipo !== 'chiuse'); $('nvPaxBox').classList.toggle('hide', !['roro', 'generale'].includes(nave.tipo)); };
  const agg = () => { nave = { tipo: $('nvTipo').value, copert: $('nvCop').value, vecchia: $('nvVecchia').checked, pax: $('nvPax').value }; vis(); mostraCarico(); };
  ['nvTipo', 'nvCop', 'nvVecchia', 'nvPax'].forEach(id => $(id).addEventListener('change', agg));
  vis();
})();
(function avvio() {
  // collegamento da altre app: ?u=1203,1090 aggiunge le merci al carico
  const q = new URLSearchParams(location.search).get('u');
  if (q) { q.split(/[,\s;]+/).filter(Boolean).forEach(u => aggiungi(u)); history.replaceState(null, '', location.pathname); }
  mostraCarico();
})();
function aggiornaRete() { $('netstato').textContent = navigator.onLine ? '' : ' · offline'; }
window.addEventListener('online', aggiornaRete); window.addEventListener('offline', aggiornaRete); aggiornaRete();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {}));
  // nuova versione installata: si ricarica una volta la pagina, così non restano in uso i file della versione precedente
  let ricaricata = false;
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => { if (!ricaricata) { ricaricata = true; location.reload(); } });
}
