// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Plan für den Workflow diagnose-p1p2.yml (docs/diagnose-p1p2.md §8): welche Archive neu gerechnet
   werden und in welche P1-Pakete sie zerfallen. Ausgabe: eine Zeile JSON
     {"p1":[{"name","datei","paket","pakete","dateiname"}...],"p2":[{"name","datei"}...],"alt":["name"...]}
   `alt` sind die Archive, deren Ergebnisse aus einem früheren Lauf übernommen werden.
   Aufruf:  node auswertung/diagnose/plan.js [--neu alle|name1,name2] [--paketgroesse 120] */
'use strict';
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const EW = require('./erwartet.js');
const wurzel = path.join(__dirname, '..', '..');

function plan(neu, groesse = EW.PAKET, lies) {
  const waehl = (!neu || neu === 'alle') ? EW.NAMEN : neu.split(',').map(s => s.trim()).filter(Boolean);
  for (const n of waehl) if (!EW.NAMEN.includes(n)) throw new Error(`Unbekanntes Archiv: ${n} (erwartet: ${EW.NAMEN.join(', ')})`);
  const p1 = [], p2 = [];
  for (const a of EW.ARCHIVE.filter(x => waehl.includes(x.name))) {
    const n = EW.geeignete(lies(a.datei)).length, k = EW.anzahlPakete(n, groesse);
    for (let i = 1; i <= k; i++) p1.push({name: a.name, datei: a.datei, paket: i, pakete: k, dateiname: `p1-${a.name}-${String(i).padStart(2, '0')}`});
    p2.push({name: a.name, datei: a.datei});
  }
  return {p1, p2, alt: EW.NAMEN.filter(n => !waehl.includes(n))};
}
module.exports = {plan};

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const lies = d => zlib.gunzipSync(fs.readFileSync(path.join(wurzel, d))).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  try { console.log(JSON.stringify(plan(opt('--neu'), +(opt('--paketgroesse') || EW.PAKET), lies))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
