// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Reproduktionsprüfung (docs/diagnose-p1p2.md §3): Spielt feste Partien aus den
   vier Archiven mit dem heutigen index.html bis Zug 200 nach und vergleicht
   jeden KI-Zug mit dem archivierten. Nur wenn alle KI-Züge übereinstimmen, ist
   die rekonstruierte Wurzelkandidatenliste die der damaligen Partie. Dazu:
   Grösse der Wurzelkinder gegen die ersten 16 der Liste nach dem Endspiel-Netz.

   Aufruf:  node auswertung/diagnose/reproduktion-pruefung.js [--partien 2,3,100,101,240] [--html index.html] */
'use strict';
const path = require('path');
const R = require('./wurzel-replay.js');
const wurzel = path.join(__dirname, '..', '..');
const ARCHIVE = [
  ['leeres-brett g-D (Seed 222, GNU Go)', 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz'],
  ['muster-ohne-vorgabe g-D (Seed 226, GNU Go)', 'docs/daten/muster-ohne-vorgabe/lauf1/g-D.jsonl.gz'],
  ['muster-ohne-vorgabe f-D (Seed 226, Fuego 100 Spiele)', 'docs/daten/muster-ohne-vorgabe/lauf1/f-D.jsonl.gz'],
  ['fuego-siege D (Seed 228, Fuego 50 Spiele)', 'docs/daten/fuego-siege/lauf1/D.jsonl.gz'],
];
function pruefen(E, rows, nrs, bis = 200) {
  const aus = {partien: 0, ohneAbweichung: 0, kiZuege: 0, gleich: 0, netzAn: 0, kidsGleichErste16: 0, abweichungen: []};
  for (const nr of nrs) {
    const p = rows.find(x => x.nr === nr); if (!p) throw new Error(`Partie ${nr} fehlt`);
    const r = R.replay(E, p, {bis}); aus.partien++;
    if (!r.abweichung) aus.ohneAbweichung++; else aus.abweichungen.push({nr, ...r.abweichung});
    for (const z of r.zuege) {
      aus.kiZuege++; if (z.gleich) aus.gleich++;
      if (z.netz) {
        aus.netzAn++;
        const a = z.kids.slice().sort((x, y) => x - y).join(','), b = z.nach.slice(0, 16).sort((x, y) => x - y).join(',');
        if (a === b) aus.kidsGleichErste16++;
      }
    }
  }
  return aus;
}
module.exports = {ARCHIVE, pruefen};
if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const nrs = (opt('--partien') || '2,3,100,101,240').split(',').map(Number);
  const E = R.ladeEngine(opt('--html') || path.join(wurzel, 'index.html'));
  let tp = 0, to = 0, tk = 0, tg = 0, tn = 0, tkg = 0;
  console.log(`Reproduktionsprüfung bis Zug 200, Partien ${nrs.join(', ')} je Archiv`);
  for (const [name, datei] of ARCHIVE) {
    const r = pruefen(E, R.lies(path.join(wurzel, datei)), nrs);
    tp += r.partien; to += r.ohneAbweichung; tk += r.kiZuege; tg += r.gleich; tn += r.netzAn; tkg += r.kidsGleichErste16;
    console.log(`${name}: ${r.ohneAbweichung} von ${r.partien} Partien ohne Abweichung, ${r.gleich} von ${r.kiZuege} KI-Zügen gleich, Netz an ${r.netzAn}×, Wurzelkinder = erste 16 nach dem Netz in ${r.kidsGleichErste16} von ${r.netzAn}`
      + (r.abweichungen.length ? ' | ABWEICHUNGEN: ' + JSON.stringify(r.abweichungen) : ''));
  }
  console.log(`Gesamt: ${to} von ${tp} Partien, ${tg} von ${tk} KI-Zügen, Wurzelkinder = erste 16 nach dem Netz in ${tkg} von ${tn} Netzzügen`);
  process.exit(to === tp && tg === tk ? 0 : 1);
}
