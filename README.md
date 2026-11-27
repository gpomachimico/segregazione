# Verifica di segregazione del carico – IMDG 7.2

Web app installabile (PWA), utilizzabile offline, per la verifica della segregazione delle merci pericolose in un carico secondo il Codice IMDG, Emendamento 42-24 (capitoli 3.4, 3.5, 7.1.3, 7.2, 7.3.4, 7.4 portacontainer, 7.5 navi ro-ro, 7.6 navi da carico generale e rinfuse con rischi chimici 7.6.3.5). I risultati sono pareri tecnici di supporto, non atti amministrativi.

Indirizzo: https://gpomachimico.github.io/segregazione/

## Contenuto
- `index.html`, `css/app.css` – interfaccia
- `js/imdg.js` – Dangerous Goods List e tabelle di decodifica del Codice IMDG 42-24, generato dagli script in `tools/` (stesso file dell'app aree di danno)
- `js/regole.js` – regole di segregazione (senza interfaccia, usabile anche con Node)
- `js/app.js` – inserimento delle merci, matrice, dettaglio per coppia, report stampabile, impostazioni
- `sw.js`, `manifest.webmanifest`, `icons/` – installazione e uso offline
- `test/` – `esempi.js` (esempi del Codice), `coppie.js` (200 000 coppie casuali), `bordo.js` (tabelle 7.4.3.2 e 7.4.3.3, stivaggio di tutte le voci), `browser.py` (prova nel browser)

## Collegamento da altre app
`https://gpomachimico.github.io/segregazione/?u=1017,1005` apre l'app con le merci indicate già nel carico.

## Aggiornamenti
A ogni rilascio cambiare la versione in `js/app.js`, `index.html` e `sw.js` (costante VERSIONE), perché i dispositivi scarichino i file nuovi.
