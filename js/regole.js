// Verifica di segregazione fra le merci pericolose di un carico – motore delle regole (senza interfaccia).
// Origine: app aree di danno, ramo "segregazione" (commit 5c7dfcd, 22/11/2026); app separata dal 24/11/2026.
// Regole del Codice IMDG 42-24: 3.4.4.2 e 3.5.8 (quantità limitate ed esenti), 7.2.2.2 (classe comprende i rischi sussidiari),
// 7.2.3 (tabella e colonna 16b, prescrizione più severa), 7.2.4 (tabella), 7.2.5 (gruppi), 7.2.6 (esenzioni), 7.2.7 (classe 1),
// 7.2.8 (codici SG), 7.3.4 (stessa unità di trasporto, alimenti), 7.4.3.2 (portacontainer con stive chiuse).
const CG = (() => { // 7.2.7.1.4: coppie di gruppi di compatibilità ammesse insieme, con il numero della nota
  const m = {}, s = (a, b, n = 0) => { m[a + b] = n; m[b + a] = n; };
  'ABCDEFGHJKNS'.split('').forEach(g => s(g, g)); delete m.LL; s('L', 'L', 2);
  s('C', 'D', 6); s('C', 'E', 6); s('D', 'E', 6); s('C', 'G', 1); s('D', 'G', 1); s('E', 'G', 1);
  s('C', 'N', 4); s('D', 'N', 4); s('E', 'N', 4); s('N', 'N', 3); s('N', 'S', 5);
  'BCDEFGHJK'.split('').forEach(g => s(g, 'S'));
  return m;
})();
const CG_NOTE = {
  1: 'nota 1: gli articoli del gruppo G (diversi dai fuochi d\'artificio) possono stare con gli articoli dei gruppi C, D ed E purché nello stesso compartimento, stiva o unità chiusa non vi siano materie esplosive',
  2: 'nota 2: una spedizione del gruppo L può stare solo con una spedizione dello stesso tipo del gruppo L',
  3: 'nota 3: articoli di tipo diverso della divisione 1.6 N solo se è provato che non c\'è rischio aggiuntivo di detonazione per simpatia; altrimenti si trattano come divisione 1.1',
  4: 'nota 4: con i gruppi C, D o E gli articoli del gruppo N si trattano come gruppo D',
  5: 'nota 5: con il gruppo S l\'intero carico si tratta come gruppo N',
  6: 'nota 6: combinazioni di articoli dei gruppi C, D ed E si trattano come gruppo E; combinazioni di materie dei gruppi C e D secondo 2.1.2.3, con il codice di classificazione complessivo su etichette e placche (5.2.2.2.2)'
};
// 7.2.8: codici "come per la classe" (sostituiscono la riga della classe principale; 7.2.6.2)
const SG_COME = { SG2: '1.1', SG3: '1.3', SG74: '1.4', SG4: '2.1', SG5: '3', SG6: '5.1', SG76: '7', SG77: '8' };
// codici riferiti a classi: [livello, classi o divisioni, eccezione]
const SG_CLASSE = {
  SG7: [1, ['3']], SG8: [1, ['4.1']], SG9: [1, ['4.3']], SG10: [1, ['5.1']], SG11: [1, ['6.2']], SG12: [1, ['7']], SG13: [1, ['8']],
  SG14: [2, ['1'], d => d.cl === '1.4S'], SG15: [2, ['3']], SG16: [2, ['4.1']], SG17: [2, ['5.1']], SG18: [2, ['6.2']], SG19: [2, ['7']],
  SG25: [2, ['2.1', '3']], SG63: [4, ['1']], SG65: [3, ['1'], d => d.div === '1.4'], SG78: [4, ['1.1', '1.2', '1.5']]
};
// codici riferiti ai gruppi di segregazione: [livello, gruppo, eccezione, condizione]
const SG_GRUPPO = {
  SG20: [1, 'SGG1'], SG21: [1, 'SGG18'], SG24: [1, 'SGG17'], SG28: [2, 'SGG2'], SG30: [1, 'SGG7'], SG31: [1, 'SGG9'],
  SG32: [1, 'SGG10'], SG33: [1, 'SGG15'], SG35: [2, 'SGG1'], SG36: [2, 'SGG18'], SG38: [2, 'SGG2'],
  SG39: [2, 'SGG2', d => d.u === '1444'], SG40: [2, 'SGG2', d => /PERSULPHATE/.test(d.nome)],
  SG42: [2, 'SGG3'], SG45: [2, 'SGG4'], SG47: [2, 'SGG5'], SG49: [2, 'SGG6'], SG51: [2, 'SGG8'], SG54: [2, 'SGG11'],
  SG56: [2, 'SGG12'], SG58: [2, 'SGG13'], SG59: [2, 'SGG14'], SG60: [2, 'SGG16'], SG61: [2, 'SGG15'],
  SG22: [1, 'SGG2', null, 'se l\'altra merce è un sale di ammonio (SG22 indica i sali di ammonio, il gruppo SGG2 i composti di ammonio)'],
  SG55: [2, 'SGG11', null, 'se l\'altra merce è un sale di mercurio'],
  SG70: [2, 'SGG1', null, 'se la merce è un solfuro di arsenico'],
  SG34: [2, 'SGG4', null, 'se la merce contiene composti di ammonio'], SG34b: [2, 'SGG13', null, 'se la merce contiene composti di ammonio']
};
// codici riferiti a sostanze nominate: [livello, numeri ONU, nome]
const SG_NOME = { SG37: [2, ['1005', '2073', '2672', '3318'], 'ammoniaca'], SG43: [2, ['1744'], 'bromo'], SG44: [2, ['1846'], 'tetracloruro di carbonio'],
  SG46: [2, ['1017'], 'cloro'], SG52: [2, ['1376'], 'ossido di ferro'], SG62: [2, ['1350', '2448'], 'zolfo'] };
const ESENTI = [['2014', '2984', '3105', '3107', '3109', '3149'], ['1295', '1818', '2189'], ['3391', '3392', '3393', '3394', '3395', '3396', '3397', '3398', '3399', '3400']];
const ESENTI4 = ['1325', '3101', '3102', '3103', '3104', '3105', '3106', '3107', '3108', '3109', '3110', '3111', '3112', '3113', '3114', '3115', '3116', '3117', '3118', '3119', '3120'];
const NITRATI = ['1942', '2067', '1451', '2722', '1486', '1477', '1498', '1446', '2464', '1454', '1474', '1507'];
const ESPL_MINA = ['0081', '0082', '0084', '0241', '0331', '0332']; // esplosivi da mina (EXPLOSIVE, BLASTING), escluso 0083
const TERMINE = { 0: 'nessuna segregazione', 1: '“away from”', 2: '“separated from”', 3: '“separated by a complete compartment or hold from”', 4: '“separated longitudinally by an intervening complete compartment or hold from”' };
const TERMINE_IT = { 0: 'nessuna segregazione richiesta', 1: 'a distanza da', 2: 'separato da', 3: 'separato da un compartimento o una stiva completa', 4: 'separato longitudinalmente da un compartimento o una stiva completa intermedia' };
// 7.4.3.2, colonna "closed versus closed": [verticale, longitudinale in coperta, longitudinale sotto coperta, trasversale in coperta, trasversale sotto coperta]
const NAVE = {
  1: ['uno sopra l\'altro ammesso', 'nessuna restrizione', 'nessuna restrizione', 'nessuna restrizione', 'nessuna restrizione'],
  2: ['non sulla stessa verticale, salvo separazione con un ponte', 'uno spazio container', 'uno spazio container o una paratia', 'uno spazio container', 'uno spazio container'],
  3: ['non sulla stessa verticale, salvo separazione con un ponte', 'uno spazio container', 'una paratia', 'due spazi container', 'una paratia'],
  4: ['vietato', 'distanza orizzontale minima 24 m', 'una paratia e distanza orizzontale minima 24 m (container ad almeno 6 m dalla paratia)', 'vietato', 'vietato']
};

function cgDati(it) { // classe, divisione, gruppo di compatibilità, rischi sussidiari della voce del carico
  const r = DATA.dgl[it.u][it.i || 0], o = it.opz || {};
  let cl = r['3'], div = (cl.match(/^\d(\.\d)?/) || [cl])[0];
  if (div === '2') div = o.div2 || '2.2'; if (div === '1') div = '1.1';
  const cg = (cl.match(/^1\.\d([A-S])$/) || [])[1] || null;
  let sub = (r['4'] || '').split(/[\/\s]+/).filter(x => /^\d(\.\d)?$/.test(x));
  if (/See/.test(r['4'] || '') && o.sub) sub = sub.concat(o.sub.split(/[\/\s,;]+/).filter(x => /^\d(\.\d)?$/.test(x)));
  const b16 = (r['16b'] || '').split(/\s+/).filter(x => /^SGG?\d+$/.test(x));
  const sgg = [...new Set(b16.filter(x => /^SGG/.test(x)).concat((o.sgg || '').toUpperCase().match(/SGG\d+/g) || []))];
  return { u: it.u, r, cl, div, cg, sub, sg: b16.filter(x => /^SG\d/.test(x)), sgg, nome: r['2'], pg: r['5'], lq: !!it.lq, eq: !!it.eq, o,
    nos: /N\.O\.S\./.test(r['2']), cl1: /^1/.test(cl) };
}
const rigaTab = div => { const m = div.match(/^1\.(\d)/); return m ? { 1: '1.1', 2: '1.1', 5: '1.1', 3: '1.3', 6: '1.3', 4: '1.4' }[m[1]] : div; };
function righeTab(d, altro) { // righe della tabella 7.2.4 da usare per la merce d: [riga, origine]
  const come = d.sg.find(k => SG_COME[k]);
  if (d.sg.includes('SG69')) return d.o.aer1L !== false ? [['9', 'SG69: aerosol fino a 1 L, come per la classe 9']] : [[d.div, 'SG69: aerosol oltre 1 L, come per la divisione ' + d.div]];
  if (d.sg.includes('SG68') && d.o.pf60) return [['3', 'SG68: punto di infiammabilità fino a 60 °C, come per la classe 3']];
  if (come) return [[SG_COME[come], come + ': come per la classe ' + SG_COME[come]]];
  const R = [[rigaTab(d.div), 'classe ' + d.cl]];
  // 7.2.3.3: un solo rischio sussidiario. Con due o più (7.2.3.4) solo la colonna 16b, salvo scelta dell'utente (opzione subTab)
  const opz = d.sub.length > 1 && d.o.subTab;
  if (d.sub.length === 1 || opz) for (const s of d.sub) {
    if (s === '1' && altro.cl1) { /* SG1: rispetto alla classe 1 vale la classe principale */ }
    else R.push([s === '1' ? '1.3' : rigaTab(s), 'rischio sussidiario ' + s + (s === '1' ? ' (come per la divisione 1.3' + (opz ? '; scelta dell\'utente oltre 7.2.3.4)' : ', 7.2.3.3)') : (opz ? ' (scelta dell\'utente oltre 7.2.3.4)' : ' (7.2.3.3)')), true, opz]);
  }
  return R;
}
const haClasse = (d, c) => [d.div, ...d.sub].some(x => c === '1' ? /^1(\.|$)/.test(x) : x === c || (c.length === 3 && x === c));
function coppia(A, B) { // ritorna { lev, motivi: [{lev, txt, cond, der}], note: [] }
  const M = [], N = [], stessaCl = A.div === B.div || (A.cl1 && B.cl1);
  const add = (lev, txt, cond, der, noctu) => M.push({ lev, txt, cond, der, noctu });
  // esenzioni
  if (A.u === B.u && A.r === B.r) return { lev: 0, motivi: [{ lev: 0, txt: 'stessa voce della DGL' }], note: N, ctu: true };
  if (A.lq || B.lq) {
    const sA = A.lq && A.cl === '1.4S' && ['A', 'L'].includes(B.cg), sB = B.lq && B.cl === '1.4S' && ['A', 'L'].includes(A.cg);
    if (sA || sB) return { lev: 0, motivi: [{ lev: 0, txt: 'quantità limitate: esenti dalla segregazione, ma gli articoli 1.4S non stanno nello stesso compartimento, stiva o unità con la classe 1 dei gruppi A e L (3.4.4.2)' }], note: N, ctu: false };
    return { lev: 0, motivi: [{ lev: 0, txt: 'merce in quantità limitate: la segregazione dei capitoli 7.2–7.7 e della colonna 16b non si applica (3.4.4.2); nello stesso imballaggio esterno vale 3.4.4.1' }], note: N, ctu: true };
  }
  if (A.eq || B.eq) return { lev: 0, motivi: [{ lev: 0, txt: 'merce in quantità esenti: la segregazione dei capitoli 7.2–7.7 e della colonna 16b non si applica (3.5.8.1)' }], note: N, ctu: true };
  for (const T of ESENTI) if (T.includes(A.u) && T.includes(B.u)) return { lev: 0, motivi: [{ lev: 0, txt: 'stessa tabella delle merci compatibili (7.2.6.3.2): nessuna segregazione' }], note: N, ctu: true };
  if (ESENTI4.includes(A.u) && ESENTI4.includes(B.u)) return { lev: 0, motivi: [{ lev: 0, txt: 'entrambe nella tabella 7.2.6.3.4: nessuna segregazione, tenendo conto delle reazioni pericolose di 7.2.6.1.1–7.2.6.1.4 (7.2.6.4); non vale per i perossidi con nome tecnico PEROXYACETIC ACID' }], note: N, ctu: true };
  // classe 1 con classe 1 (7.2.7.1)
  if (A.cl1 && B.cl1) {
    const k = A.cg && B.cg ? CG[A.cg + B.cg] : undefined;
    if (k === undefined) add(2, `gruppi di compatibilità ${A.cg || '?'} e ${B.cg || '?'} non ammessi insieme (7.2.7.1.4): compartimenti o stive diversi, o unità di trasporto chiuse diverse “separated from” fra loro (7.2.7.1.1, 7.2.7.1.5)`);
    else {
      add(0, `gruppi di compatibilità ${A.cg} e ${B.cg} ammessi nello stesso compartimento, stiva o unità chiusa (7.2.7.1.4)${A.div !== B.div ? '; il carico misto si tratta come la divisione più pericolosa, nell\'ordine 1.1, 1.5, 1.2, 1.3, 1.6, 1.4 (7.2.7.1.3)' : ''}`);
      if (k) N.push(CG_NOTE[k]);
    }
  } else {
    // tabella 7.2.4 con le righe di ciascuna merce
    for (const [ra, oa, sa, pa] of righeTab(A, B)) for (const [rb, ob, sb, pb] of righeTab(B, A)) {
      const v = DATA.imdgCod.SEGR[ra] && DATA.imdgCod.SEGR[ra][rb];
      if (/^[1-4]$/.test(v)) { add(+v, `tabella 7.2.4: ${oa} con ${ob}`, null, (sa || sb || /^SG/.test(oa + ob)) && A.div === B.div); if (pa || pb) M[M.length - 1].opz = true; }
      else if (v === 'X') add(0, `tabella 7.2.4: ${oa} con ${ob}: X, nessuna prescrizione generale`);
    }
  }
  // colonna 16b, in entrambi i versi (7.2.3.1: prevale sulla tabella)
  for (const [P, Q] of [[A, B], [B, A]]) {
    const chi = `UN ${P.u}`;
    for (const k of P.sg) {
      if (SG_CLASSE[k]) {
        const [lev, cls, ecc] = SG_CLASSE[k];
        const c = cls.find(c => haClasse(Q, c));
        if (c && !(ecc && ecc(Q))) add(lev, `${chi}, ${k}: ${TERMINE[lev]} classe ${cls.join(' e ')}${Q.div === c || (c === '1' && Q.cl1) ? '' : ' (UN ' + Q.u + ' ha il rischio sussidiario ' + c + ', 7.2.2.2)'}`, null, P.div === Q.div);
        if (c && k === 'SG25' && P.sg.includes('SG26')) N.push(`${chi}, SG26: in coperta su portacontainer almeno due spazi container in senso trasversale dalle merci delle classi 2.1 e 3; su navi ro-ro 6 m in senso trasversale`);
      }
      if (k === 'SG67' && Q.cl1 && Q.cg !== 'J') add(Q.div === '1.4' ? 2 : 4, `${chi}, SG67: ${Q.div === '1.4' ? TERMINE[2] + ' divisione 1.4' : TERMINE[4] + ' divisioni 1.1, 1.2, 1.3, 1.5 e 1.6'}`);
      if (k === 'SG69' && P.o.aer1L !== false && Q.cl1 && Q.div !== '1.4') add(2, `${chi}, SG69: aerosol fino a 1 L ${TERMINE[2]} classe 1, salvo la divisione 1.4`);
      if (k === 'SG68' && P.o.pf60 && haClasse(Q, '4.1')) add(1, `${chi}, SG68: punto di infiammabilità fino a 60 °C, ${TERMINE[1]} classe 4.1`);
      if (k === 'SG68' && !P.o.pf60) N.push(`${chi}, SG68: se il punto di infiammabilità è fino a 60 °C (vaso chiuso) segregazione come per la classe 3 e “away from” classe 4.1; indicarlo nella voce del carico`);
      for (const kk of [k, k + 'b']) if (SG_GRUPPO[kk]) {
        const [lev, g, ecc, cond] = SG_GRUPPO[kk];
        if (Q.sgg.includes(g) && !(ecc && ecc(Q))) add(lev, `${chi}, ${k}: ${TERMINE[lev]} ${g} – ${DATA.imdgCod.SGG[g] || ''} (UN ${Q.u} appartiene al gruppo)`, cond);
      }
      if (SG_NOME[k] && SG_NOME[k][1].includes(Q.u)) add(SG_NOME[k][0], `${chi}, ${k}: ${TERMINE[SG_NOME[k][0]]} ${SG_NOME[k][2]}`);
      if (k === 'SG27' && Q.cl1) add(2, `${chi}, SG27: ${TERMINE[2]} esplosivi contenenti clorati o perclorati`, `se UN ${Q.u} contiene clorati o perclorati`);
      if (k === 'SG28' && Q.cl1) add(2, `${chi}, SG28: ${TERMINE[2]} esplosivi contenenti composti o sali di ammonio`, `se UN ${Q.u} contiene composti o sali di ammonio`);
      if (k === 'SG34' && Q.cl1) add(2, `${chi}, SG34: ${TERMINE[2]} esplosivi contenenti clorati o perclorati`, `se UN ${P.u} contiene composti di ammonio e UN ${Q.u} clorati o perclorati`);
      if ((k === 'SG48' || k === 'SG53') && ['2.1', '3', '4.1', '4.2'].some(c => haClasse(Q, c)))
        add(k === 'SG48' ? 2 : 0, `${chi}, ${k}: ${k === 'SG48' ? TERMINE[2] + ' materiale combustibile (in particolare liquidi)' : 'non nella stessa unità di trasporto del materiale combustibile'}`, `se UN ${Q.u} è materiale combustibile`, false, k === 'SG53');
      if (k === 'SG1' && P.sub.includes('1') && Q.cl1) N.push(`${chi}, SG1: rispetto alle merci della classe 1 si applica la segregazione della classe principale ${P.div}`);
    }
    if (P.nos && !P.sgg.length && Q.sg.some(k => SG_GRUPPO[k])) N.push(`UN ${P.u} è una voce n.o.s.: se lo speditore la assegna a un gruppo di segregazione, il gruppo è indicato nel documento di trasporto (7.2.5.3, 5.4.1.5.11); inserirlo nella voce del carico`);
  }
  // 7.2.6.5: classe 8 PG II o III con acidi o alcali
  if (A.div === '8' && B.div === '8' && ['II', 'III'].includes(A.pg) && ['II', 'III'].includes(B.pg)) {
    const ga = M.filter(m => /SGG1 |SGG18 /.test(m.txt + ' ') && !m.cond);
    if (ga.length) ga.forEach(m => { m.der = '7.2.6.5: ammesse nella stessa unità, anche nello stesso imballaggio, se non reagiscono pericolosamente (7.2.6.1), colli fino a 30 L o 30 kg, dichiarazione 5.4.1.5.11.3 nel documento di trasporto e rapporto di prova su richiesta'; });
  }
  // 7.2.7.2.1 nitrati con esplosivi da mina
  if ((NITRATI.includes(A.u) && ESPL_MINA.includes(B.u)) || (NITRATI.includes(B.u) && ESPL_MINA.includes(A.u)))
    N.push('7.2.7.2.1: il nitrato può essere stivato con gli esplosivi da mina se l\'insieme è trattato come esplosivo da mina della classe 1');
  const mx = L => Math.max(0, ...L.map(m => m.lev));
  const lev = mx(M.filter(m => !m.cond)), levDer = mx(M.filter(m => !m.cond && !m.der)), levCond = mx(M);
  return { lev, levDer, levCond, motivi: M, note: [...new Set(N)], ctu: lev === 0 && !M.some(m => m.noctu && !m.cond) };
}

function alimenti(d) { // 7.3.4.2
  const cls = [d.div, ...d.sub], gr = d.pg;
  const vieta = cls.some(c => ['2.3', '6.1', '6.2', '8'].includes(c)) || (cls.includes('7') && !['2908', '2909', '2910', '2911'].includes(d.u)) || d.sg.includes('SG29') || d.sg.includes('SG50');
  if (!vieta) return '';
  const tre = !d.sg.includes('SG50') && ((['6.1', '8'].includes(d.div) && gr === 'III') || (d.div === '8' && gr === 'II') || (gr === 'III' && d.sub.some(c => ['6.1', '8'].includes(c))) || d.sg.includes('SG29'));
  return tre ? 'con alimenti solo ad almeno 3 m (7.3.4.2.2)' : 'non nella stessa unità di trasporto con alimenti (7.3.4.2.1)';
}
if (typeof module !== 'undefined') module.exports = { cgDati, coppia, alimenti, TERMINE, TERMINE_IT, NAVE };
