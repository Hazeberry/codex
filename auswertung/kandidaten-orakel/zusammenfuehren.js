// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Pakete des Hauptversuchs Kandidaten-Orakel (docs/kandidaten-orakel.md §12) zusammenführen.

   Eingabe: Ordner mit den Paketdateien aus den Artefakten haupt-*: <g|f>-<Arm>-<von>.jsonl,
   wiederholung-<g|f>-<Arm>.jsonl, kontrolle.jsonl, je mit Begleitdatei *.meta.json (paket.js).
   Ausgabe: <roh>/<g|f>-<Arm>.jsonl (alle Pakete eines Arms, nach Partienummer sortiert), die
   Wiederholungs- und Kontrolldateien unverändert, die Begleitdateien nach <meta>/.

   Exit 3, wenn die Begleitdateien nicht denselben Stand der Quellen nennen (Partien verschiedener
   Stände dürfen nicht in einen Bericht), eine Paketdatei keine Begleitdatei hat oder eine Zeile kein
   JSON ist. Ob alle Partienummern vorhanden sind, prüft erst haupt-bericht.js.
   Aufruf:  node zusammenfuehren.js <stand> <roh> <meta> */
'use strict';
const fs = require('fs'), path = require('path');

function fuehreZusammen(stand, roh, metaZiel) {
  const fehler = [];
  const dateien = fs.existsSync(stand) ? fs.readdirSync(stand) : [];
  const pakete = dateien.filter(d => /\.jsonl$/.test(d));
  const metas = dateien.filter(d => /\.jsonl\.meta\.json$/.test(d));
  fs.mkdirSync(roh, {recursive: true}); fs.mkdirSync(metaZiel, {recursive: true});
  let quellen = null;
  for (const m of metas) {
    const j = JSON.parse(fs.readFileSync(path.join(stand, m), 'utf8')), q = JSON.stringify(j.quellen);
    if (quellen === null) quellen = q; else if (q !== quellen) fehler.push(`${m}: anderer Stand der Quellen als die übrigen Pakete`);
    fs.copyFileSync(path.join(stand, m), path.join(metaZiel, m));
  }
  const arme = {};
  for (const p of pakete) {
    if (!metas.includes(p + '.meta.json')) { fehler.push(`${p}: Begleitdatei fehlt`); continue; }
    const zeilen = fs.readFileSync(path.join(stand, p), 'utf8').split('\n').filter(z => z.trim());
    let recs;
    try { recs = zeilen.map(z => JSON.parse(z)); } catch (e) { fehler.push(`${p}: Zeile ist kein JSON`); continue; }
    const m = /^([gf])-(A|N|P|S|ZS)-(\d+)\.jsonl$/.exec(p);
    if (m) (arme[`${m[1]}-${m[2]}`] = arme[`${m[1]}-${m[2]}`] || []).push(...recs.map((r, k) => ({nr: r.nr, z: zeilen[k]})));
    else if (/^(wiederholung-[gf]-(A|N|P|S|ZS)|kontrolle)\.jsonl$/.test(p)) fs.copyFileSync(path.join(stand, p), path.join(roh, p));
    else fehler.push(`${p}: unbekannter Dateiname`);
  }
  for (const [name, l] of Object.entries(arme)) {
    l.sort((a, b) => a.nr - b.nr);
    fs.writeFileSync(path.join(roh, name + '.jsonl'), l.map(x => x.z + '\n').join(''));
  }
  return {fehler, pakete: pakete.length, arme: Object.keys(arme).sort()};
}

module.exports = {fuehreZusammen};
if (require.main === module) {
  const [stand, roh, meta] = process.argv.slice(2);
  if (!stand || !roh || !meta) { console.error('Aufruf: node zusammenfuehren.js <stand> <roh> <meta>'); process.exit(2); }
  const r = fuehreZusammen(stand, roh, meta);
  console.log(`${r.pakete} Paketdateien, Arme: ${r.arme.join(' ')}`);
  for (const f of r.fehler) console.error(f);
  process.exit(r.fehler.length ? 3 : 0);
}
