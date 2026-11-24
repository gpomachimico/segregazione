global.DATA = {}; const fs = require('fs');
eval(fs.readFileSync(require('path').join(__dirname, '../js/imdg.js'), 'utf8'));
const path = require('path'), R = require(path.join(__dirname, '../js/regole.js'));
const { cgDati, coppia } = R;
const T = (a, b, oa = {}, ob = {}) => { const p = coppia(cgDati({ u: a, i: 0, ...oa }), cgDati({ u: b, i: 0, ...ob }));
  console.log(a, b, '→', p.lev, '| ctu', p.ctu); p.motivi.forEach(m => console.log('   ', m.lev, m.cond ? '[cond]' : '', m.der ? '[der]' : '', m.txt)); p.note.forEach(n => console.log('    nota:', n)); };
T('2002', '2558'); // esempio 1: separated from
T('1489', '1653'); // esempio 2: separated from
T('1090', '1183'); // esempio 3: separated from + SG26
T('1133', '2464', { lq: true }); // esempio 4: nessuna
T('2965', '1183'); // 4.3 con 4.3: derogabile
T('0081', '0082'); T('0029', '0081'); T('1942', '0081'); T('1017', '1005'); T('1789', '1824'); T('3101', '3105'); T('1950', '0012');
// 7.2.3.4: due o più rischi sussidiari, lettura letterale e scelta dell'utente (subTab)
T('2683', '1203'); T('2683', '1203', { opz: { subTab: true } });
