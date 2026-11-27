/* Verifica di segregazione del carico – interfaccia, impostazioni, report stampabile, uso offline */
'use strict';
const VERSIONE = '1.7-beta';
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
let nave = { tipo: 'chiuse', copert: 'stagni', vecchia: false };
let tabBordo = false, tabCoppie = false;
try { tabBordo = localStorage.getItem('tabBordo') === '1'; tabCoppie = localStorage.getItem('tabCoppie') === '1'; } catch (e) { }
try { nave = Object.assign(nave, JSON.parse(localStorage.getItem('nave') || '{}')); } catch (e) { }
const NAVE_TIPO = { chiuse: 'portacontainer con stive chiuse (7.4.3.2)', senza: 'portacontainer senza boccaporti (hatchless, 7.4.3.3)' };
const COPERT = { stagni: 'coperchi delle boccaporte stagni', gutter: 'coperchi parzialmente stagni con gutterbar efficaci (7.4.2.2.1)', nogutter: 'coperchi parzialmente stagni senza gutterbar efficaci (7.4.2.2.2)' };
// 7.2.3.4: due o più rischi sussidiari e nessun codice che fissi la riga della tabella 7.2.4
const piuSussidiari = d => d.sub.length > 1 && !d.sg.some(k => SG_COME[k] || k === 'SG69') && !(d.sg.includes('SG68') && d.o.pf60);

function cgVoceHTML(it, n) {
  const R = DATA.dgl[it.u], d = cgDati(it), o = it.opz || {};
  let h = `<div class="cgv"><div><b>${n}. UN ${esc(it.u)}</b> – ${esc(d.nome.length > 90 ? d.nome.slice(0, 90) + '…' : d.nome)} <span class="small">(classe ${esc(d.cl)}${d.sub.length ? ', sussidiari ' + esc(d.sub.join('/')) : ''}${d.pg && d.pg !== '–' ? ', GI ' + esc(d.pg) : ''}${d.r['16b'] && d.r['16b'] !== '–' ? ', 16b ' + esc(d.r['16b']) : ''})</span></div><div class="row">`;
  if (R.length > 1) h += `<select data-k="i" data-n="${n - 1}">${R.map((r, j) => `<option value="${j}"${j === (it.i || 0) ? ' selected' : ''}>voce ${j + 1}: ${esc(r['2'].slice(0, 60))}${r['5'] && r['5'] !== '–' ? ' – GI ' + esc(r['5']) : ''}</option>`).join('')}</select>`;
  h += `<label class="ck"><input type="checkbox" data-k="lq" data-n="${n - 1}"${it.lq ? ' checked' : ''}> quantità limitate</label><label class="ck"><input type="checkbox" data-k="eq" data-n="${n - 1}"${it.eq ? ' checked' : ''}> quantità esenti</label><label class="ck"><input type="checkbox" data-k="aperto" data-n="${n - 1}"${o.aperto ? ' checked' : ''}> container aperto</label>`;
  if (d.r['3'] === '2') h += `<select data-k="div2" data-n="${n - 1}">${['2.1', '2.2', '2.3'].map(x => `<option${x === (o.div2 || '2.2') ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
  if (d.sg.includes('SG69')) h += `<label class="ck"><input type="checkbox" data-k="aer1L" data-n="${n - 1}"${o.aer1L !== false ? ' checked' : ''}> capacità fino a 1 L</label>`;
  if (d.sg.includes('SG68')) h += `<label class="ck"><input type="checkbox" data-k="pf60" data-n="${n - 1}"${o.pf60 ? ' checked' : ''}> punto di infiammabilità ≤ 60 °C</label>`;
  if (/See/.test(d.r['4'] || '')) h += `<input type="text" data-k="sub" data-n="${n - 1}" value="${esc(o.sub || '')}" placeholder="rischi sussidiari (${esc(d.r['4'].replace(/^–\s*/, ''))})" style="width:12em">`;
  if (d.nos) h += `<input type="text" data-k="sgg" data-n="${n - 1}" value="${esc(o.sgg || '')}" placeholder="gruppo SGG dal documento di trasporto" style="width:15em">`;
  h += `<button type="button" class="sec mini" data-k="via" data-n="${n - 1}">Togli</button></div>`;
  if (piuSussidiari(d)) h += `<div class="warn">Due o più rischi sussidiari (${esc(d.sub.join(', '))}): secondo 7.2.3.4 le prescrizioni sono quelle della colonna 16b; la tabella 7.2.4 si applica solo alla classe principale.<label class="ck"><input type="checkbox" data-k="subTab" data-n="${n - 1}"${o.subTab ? ' checked' : ''}> considera anche i rischi sussidiari nella tabella 7.2.4 (scelta oltre il testo del Codice, indicata nel report)</label></div>`;
  const al = alimenti(d), fl = [al && 'Alimenti: ' + al];
  for (const k of d.sg) if (['SG23', 'SG41', 'SG57', 'SG71', 'SG72', 'SG29', 'SG50'].includes(k)) fl.push(`${k}: ${DATA.imdgCod.SG[k]}`);
  if (fl.filter(Boolean).length) h += `<p class="small">${fl.filter(Boolean).map(esc).join(' · ')}</p>`;
  if (d.cl === '1' && d.u === '0190') h += '<p class="small">Campioni di esplosivo: divisione e gruppo di compatibilità non indicati nella DGL; si usa la divisione 1.1, la più severa, e nessuna compatibilità con altre merci della classe 1.</p>';
  return h + '</div>';
}
const cella = p => `<td class="n cgl${p.lev}">${p.lev ? p.lev : '–'}${p.levDer < p.lev ? '<sup>d</sup>' : ''}${p.levCond > p.lev ? '*' : ''}${p.motivi.some(m => m.opz && m.lev === p.lev && p.lev) ? '<sup>u</sup>' : ''}</td>`;
function bordoHTML(D, P, cls, perStampa) { // 7.4.3.2 / 7.4.3.3 per le coppie con segregazione, secondo container chiusi o aperti
  const righe = [];
  for (const [k, p] of Object.entries(P)) {
    const [a, b] = k.split('-').map(Number), lv = [p.lev, p.levCond > p.lev ? p.levCond : 0].filter(Boolean);
    lv.forEach((l, j) => righe.push([a, b, l, j > 0]));
  }
  const T = TAB_CNT[nave.tipo];
  if (!righe.length) return `<h3>A bordo: ${esc(NAVE_TIPO[nave.tipo])}</h3><p class="${cls}">Nessuna coppia del carico richiede segregazione: nessuna prescrizione della tabella ${T.par}.</p>`;
  // tabella delle coppie: sullo schermo solo a richiesta, nel report solo se attivata (richiesta di Luca, v1.4)
  let h = `<h3>A bordo: ${esc(NAVE_TIPO[nave.tipo])}</h3>`;
  if (!perStampa) h += `<button type="button" class="sec mini" id="btnBordo" aria-pressed="${tabBordo}">${tabBordo ? 'Nascondi la tabella delle coppie' : 'Mostra la tabella delle coppie (sarà riportata anche nel report)'}</button>`;
  if (!tabBordo) h += `<p class="${cls}">${perStampa ? '' : 'Tabella non attiva. '}${tabCoppie ? `Le prescrizioni a bordo di ogni coppia (tabella ${T.par}, testo originale) sono nel dettaglio per coppia.` : `Prescrizioni a bordo della tabella ${T.par} per ${righe.length === 1 ? 'una coppia' : righe.length + ' coppie'}: ${perStampa ? 'non riportate in questo report' : 'attivare la tabella o il dettaglio per coppia'}.`}</p>`;
  else h += `<div class="scroll"><table class="segr bordo"><tr><th>Coppia</th><th>Verticale</th><th>Longitudinale<br>sul ponte</th><th>Longitudinale<br>sotto il ponte</th><th>Trasversale<br>sul ponte</th><th>Trasversale<br>sotto il ponte</th></tr>`;
  if (tabBordo) for (const [a, b, l, cond] of righe) {
    const cm = combo(D[a], D[b]), bo = bordo(l, cm, nave.tipo);
    h += `<tr><td>${a + 1}–${b + 1}${cond ? ' *' : ''}<br><span class="small">${esc(TERMINE_IT[l])}; ${COMBO_IT[cm]}</span></td>${[bo.v, bo.faOn, bo.faUnder, bo.atOn, bo.atUnder].map(x => `<td title="${esc(x)}">${esc(trad(x))}</td>`).join('')}</tr>`;
  }
  if (tabBordo) h += `</table></div><p class="${cls}">Tabella ${T.par} (“${T.nome}”), testo dell'edizione italiana del Codice; fa fede il testo inglese, riportato nel dettaglio di ogni coppia. Spazio container: almeno 6 m in senso longitudinale o almeno 2,4 m in senso trasversale (7.4.3.1.1). * Container a non meno di 6 m dalla paratia intermedia. Nota: tutte le paratie e ponti devono essere resistenti al fuoco e ai liquidi. Righe con * a sinistra: valgono se ricorrono le condizioni indicate nel dettaglio della coppia. Container aperto: unità che non è chiusa, cioè che non racchiude interamente il contenuto con strutture permanenti a pareti complete e rigide; le unità con pareti o tetto in telone non sono chiuse (definizioni del capitolo 1.2; per la classe 1, 7.1.2).</p>`;
  const vert = righe.some(r => r[2] >= 2) || righe.some(r => r[2] === 1 && combo(D[r[0]], D[r[1]]) !== 'CC');
  if (nave.tipo === 'chiuse' && nave.copert === 'gutter') h += `<p class="${cls}">Coperchi parzialmente stagni con gutterbar efficaci: considerati “resistant to fire and liquid” (7.4.2.2.1.1)${vert ? '; dove è richiesto “not in the same vertical line unless separated by a deck”, i container con merci pericolose non nei tier direttamente sopra un clear gap, salvo stiva conforme a SOLAS II-2/19 (II-2/54), e container con merci incompatibili non entro le relevant sensitive vertical lines sotto coperta (7.4.2.2.1.2; definizioni in MSC/Circ.1087)' : ''}.</p>`;
  if (nave.tipo === 'chiuse' && nave.copert === 'nogutter') h += `<p class="${cls}">Coperchi parzialmente stagni senza gutterbar efficaci: container con merci pericolose non sui coperchi, salvo stiva conforme a SOLAS II-2/19 (II-2/54) (7.4.2.2.2.1); container con merci incompatibili non entro le relevant sensitive vertical lines dei clear gap, sia con merci in coperta sia con merci sotto coperta (7.4.2.2.2.2–7.4.2.2.2.4; definizioni in MSC/Circ.1087).</p>`;
  return h;
}
function stivaggioHTML(D, perStampa) { // prescrizioni di stivaggio per merce (7.1.3, 3.4.3, 3.5.7, colonna 16a, 7.4.1, 7.4.2)
  let h = '<h3>Stivaggio delle merci su portacontainer</h3>';
  D.forEach((d, j) => {
    const S = stivaggio(d, nave);
    const li = S.map(x => `<li>${x.cond ? '* ' : ''}${esc(x.txt)} <span class="small">(${esc(x.par)})</span>${x.cond ? ` – <i>${esc(x.cond)}</i>` : ''}</li>`).join('');
    h += perStampa ? `<p class="coppia">${j + 1}. UN ${esc(d.u)}${d.aperto ? ', container aperto' : ''}</p><ul>${li}</ul>` : `<details><summary>${j + 1}. UN ${esc(d.u)}${d.aperto ? ' (container aperto)' : ''}</summary><ul class="ip">${li}</ul></details>`;
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
    if (voci.length) R.push(`<li><b>${a + 1}–${b + 1}</b>: UN ${esc(D[a].u)} / UN ${esc(D[b].u)} → ${esc(p.lev ? TERMINE[p.lev] : TERMINE_IT[0])}<ul>${voci.map(v => `<li>${v}</li>`).join('')}</ul></li>`);
  }
  return R.length ? `<h3>Coppie con condizioni o deroghe</h3><ul class="segnalate">${R.join('')}</ul>` : '';
}
function caricoRisHTML(perStampa = false) {
  const D = carico.map(cgDati), n = D.length, cls = perStampa ? 'nota' : 'small';
  if (n < 2) return `<p class="${cls}">Aggiungere almeno due merci.</p>`;
  const P = {};
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) P[a + '-' + b] = coppia(D[a], D[b]);
  let h = `<h3>Matrice di segregazione</h3><div class="scroll"><table class="segr cgm"><tr><th></th>${D.map((d, j) => `<th>${j + 1}</th>`).join('')}</tr>`;
  D.forEach((d, a) => { h += `<tr><td>${a + 1}. UN ${esc(d.u)}</td>${D.map((e, b) => a === b ? '<td class="n">·</td>' : cella(P[Math.min(a, b) + '-' + Math.max(a, b)])).join('')}</tr>`; });
  // legenda: una voce per riga (richiesta di Luca, v1.7)
  const leg = [0, 1, 2, 3, 4].map(l => `<b>${l || '–'}</b> = ${l ? esc(TERMINE[l]) + ' (' + esc(TERMINE_IT[l]) + ')' : esc(TERMINE_IT[0])}`);
  leg.push('<b><sup>d</sup></b> = deroga possibile (7.2.6.1 o 7.2.6.5) se ne ricorrono le condizioni',
    '<b>*</b> = prescrizione più severa se ricorrono condizioni da verificare sulla merce',
    '<b><sup>u</sup></b> = livello dovuto alla scelta dell\'utente di considerare i rischi sussidiari oltre 7.2.3.4');
  h += `</table></div><ul class="leg ${cls}">${leg.map(x => `<li>${x}</li>`).join('')}</ul>`;
  h += segnalateHTML(D, P, cls);
  h += bordoHTML(D, P, cls, perStampa);
  // dettaglio per coppia: sullo schermo solo a richiesta, nel report solo se attivato (richiesta di Luca, v1.5)
  if (!perStampa || tabCoppie) h += '<h3>Dettaglio per coppia</h3>';
  if (!perStampa) h += `<button type="button" class="sec mini" id="btnCoppie" aria-pressed="${tabCoppie}">${tabCoppie ? 'Nascondi il dettaglio per coppia' : 'Mostra il dettaglio per coppia (sarà riportato anche nel report)'}</button>`;
  if (!tabCoppie && !perStampa) h += `<p class="${cls}">Dettaglio non attivo: paragrafi del Codice, unità di trasporto e prescrizioni a bordo (testo originale) di ogni coppia.</p>`;
  if (tabCoppie) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const p = P[a + '-' + b], cond = p.motivi.filter(m => m.cond && m.lev > p.lev), der = p.motivi.filter(m => m.der && !m.cond && m.lev > p.levDer);
    const titolo = `${a + 1}–${b + 1}: UN ${D[a].u} / UN ${D[b].u} → <b>${p.lev ? TERMINE[p.lev] : TERMINE_IT[0]}</b>${p.levDer < p.lev ? ` (deroga possibile: ${p.levDer ? TERMINE[p.levDer] : TERMINE_IT[0]})` : ''}${cond.length ? ' *' : ''}`;
    const ctu = p.lev === 0 ? (p.ctu ? 'ammesse nella stessa unità di trasporto' : 'non nella stessa unità di trasporto') : p.lev === 1 ? 'non nella stessa unità di trasporto, salvo approvazione dell\'autorità competente con un livello di sicurezza equivalente (7.3.4.1); non nello stesso imballaggio esterno (7.2.3.2)' : 'non nella stessa unità di trasporto né nello stesso imballaggio esterno (7.2.3.2, 7.3.4.1)';
    let c = `<ul class="${perStampa ? '' : 'ip'}">${p.motivi.filter(m => !m.cond && !(m.der && m.lev > p.levDer)).map(m => `<li>${esc(m.txt)}</li>`).join('')}`;
    c += der.map(m => `<li>${esc(m.txt)} – <i>${esc(typeof m.der === 'string' ? m.der : 'derogabile secondo 7.2.6.1 se le merci non reagiscono pericolosamente fra loro')}</i></li>`).join('');
    c += cond.map(m => `<li>* ${esc(m.txt)} – <i>${esc(m.cond)}</i></li>`).join('');
    c += p.note.map(t => `<li class="${cls}">${esc(t)}</li>`).join('');
    c += `<li><b>Unità di trasporto</b>: ${esc(ctu)}</li>`;
    if (p.lev) { const cm = combo(D[a], D[b]), bo = bordo(p.lev, cm, nave.tipo); c += `<li><b>A bordo</b> (${bo.par}, ${COMBO[cm][1]}): vertical – ${esc(bo.v)}; fore and aft – on deck: ${esc(bo.faOn)}, under deck: ${esc(bo.faUnder)}; athwartships – on deck: ${esc(bo.atOn)}, under deck: ${esc(bo.atUnder)}</li>`; }
    c += '</ul>';
    h += perStampa ? `<p class="coppia">${titolo}</p>${c}` : `<details${p.lev || cond.length ? ' open' : ''}><summary>${titolo}</summary>${c}</details>`;
  }
  h += stivaggioHTML(D, perStampa);
  const scelte = D.filter(d => piuSussidiari(d) && d.o.subTab).map(d => 'UN ' + d.u);
  h += `<p class="${cls}">Ipotesi della verifica: tabella 7.2.4 con la classe principale e, se la DGL indica un solo rischio sussidiario, anche con quello (7.2.3.3); con due o più rischi sussidiari valgono le prescrizioni della colonna 16b (7.2.3.4)${scelte.length ? `; per ${scelte.join(', ')} l'utente ha scelto di applicare la tabella 7.2.4 anche ai rischi sussidiari, oltre quanto previsto da 7.2.3.4` : ''}; i codici “come per la classe” sostituiscono la riga della classe principale (7.2.6.2); nei codici “classe …” della colonna 16b la classe comprende i rischi sussidiari (7.2.2.2); prevale la prescrizione più severa e la colonna 16b prevale sulla tabella (7.2.3.1). A bordo: tabella 7.4.3.2 o 7.4.3.3 secondo il tipo di nave, con container chiusi o aperti come indicato per ogni merce. Le prescrizioni per le navi ro-ro (7.5), da carico generale (7.6) e le chiatte (7.7) non sono riportate. Verifica di supporto tecnico: la responsabilità della segregazione resta di chi prepara il carico.</p>`;
  return h;
}
function mostraCarico() {
  carico = carico.filter(it => DATA.dgl[it.u]);
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
  h += '<h3>Merci del carico</h3><table class="dati merci">' + carico.map((it, j) => { const d = cgDati(it); return `<tr><td>${j + 1}. UN ${esc(d.u)}</td><td>${esc(d.nome)} – classe ${esc(d.cl)}${d.sub.length ? ', rischi sussidiari ' + esc(d.sub.join('/')) : ''}${d.pg && d.pg !== '–' ? ', GI ' + esc(d.pg) : ''}; 16b: ${esc(d.r['16b'] || '–')}${d.sgg.length && d.o.sgg ? '; gruppo dichiarato ' + esc(d.o.sgg) : ''}${it.lq ? '; quantità limitate' : ''}${it.eq ? '; quantità esenti' : ''}${piuSussidiari(d) && d.o.subTab ? '; tabella 7.2.4 applicata anche ai rischi sussidiari per scelta dell\'utente' : ''}${alimenti(d) ? '; alimenti: ' + esc(alimenti(d)) : ''}</td></tr>`; }).join('') + '</table>';
  h += `<table class="dati"><tr><td>Nave</td><td>${esc(NAVE_TIPO[nave.tipo])}${nave.tipo === 'chiuse' ? '; ' + esc(COPERT[nave.copert]) : ''}${nave.vecchia ? '; costruita prima delle date di 7.4.2.3.1 e 7.4.2.4.1' : ''}</td></tr></table>`;
  h += caricoRisHTML(true);
  h += `<p class="nota">Parere tecnico di supporto redatto con l'app Verifica di segregazione v${VERSIONE}: non è un atto amministrativo e non sostituisce la consultazione del testo ufficiale del Codice IMDG.</p>`;
  h += `<div class="firma"><div class="firmatario">${esc(s.nome)}</div><div>${esc(s.qualifica)}</div><div class="linea">Firma ____________________________</div></div>`;
  $('report').innerHTML = h; window.print();
};

// ---------- avvio ----------
(function initNave() {
  $('nvTipo').value = nave.tipo; $('nvCop').value = nave.copert; $('nvVecchia').checked = nave.vecchia;
  const agg = () => { nave = { tipo: $('nvTipo').value, copert: $('nvCop').value, vecchia: $('nvVecchia').checked }; $('nvCopBox').classList.toggle('hide', nave.tipo !== 'chiuse'); mostraCarico(); };
  ['nvTipo', 'nvCop', 'nvVecchia'].forEach(id => $(id).addEventListener('change', agg));
  $('nvCopBox').classList.toggle('hide', nave.tipo !== 'chiuse');
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
