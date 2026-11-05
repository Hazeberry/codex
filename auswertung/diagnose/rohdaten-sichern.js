// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Sicherung der Rohdaten der Diagnose P1/P2 im Repo (docs/diagnose-p1p2.md §9). Keine Neuberechnung:
   Die Ergebniszeilen der Artefakte eines früheren Laufs werden verlustfrei komprimiert abgelegt und
   beschrieben. Dokumentiert werden dabei die Partien, die in P1 nicht gebucht wurden.

   Eingabe  roh/<archiv>/p1-<archiv>.jsonl, roh/<archiv>/p2-<archiv>.jsonl (aus den Artefakten
            diagnose-<archiv>); roh/artifacts.json (Antwort der Artefakt-Liste des Laufs, optional)
   Ausgabe  <aus>/<archiv>/p1.jsonl.gz, p2.jsonl.gz, <aus>/manifest.json, <aus>/fehlgeschlagen-p1.md

   Aufruf:  node auswertung/diagnose/rohdaten-sichern.js --roh roh --aus docs/daten/diagnose-p1p2/rohdaten --run 41480291668 [--archivdaten WURZEL]
   Exit 1, wenn eine Datei fehlt oder ein erwartetes Archiv nicht vollständig vorliegt. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const EW = require('./erwartet.js');

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const zeilen = buf => buf.toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const lies = d => { const b = fs.readFileSync(d); return /\.gz$/.test(d) ? zlib.gunzipSync(b) : b; };
const kuerze = (s, n = 300) => String(s).replace(/\s+/g, ' ').slice(0, n);

function sichern(opt) {
  const roh = opt.roh, aus = opt.aus, wurzel = opt.archivdaten || path.join(__dirname, '..', '..');
  const artefakte = fs.existsSync(path.join(roh, 'artifacts.json')) ? (JSON.parse(fs.readFileSync(path.join(roh, 'artifacts.json'), 'utf8')).artifacts || []) : [];
  const probleme = [], manifest = {lauf: opt.run, archive: {}}, fehl = [];
  fs.mkdirSync(aus, {recursive: true});
  for (const a of EW.ARCHIVE) {
    const n = a.name, q1 = path.join(roh, n, `p1-${n}.jsonl`), q2 = path.join(roh, n, `p2-${n}.jsonl`);
    if (!fs.existsSync(q1) || !fs.existsSync(q2)) { probleme.push(`${n}: Quelldatei fehlt (${!fs.existsSync(q1) ? q1 : q2})`); continue; }
    const b1 = fs.readFileSync(q1), b2 = fs.readFileSync(q2), p1 = zeilen(b1), p2 = zeilen(b2);
    fs.mkdirSync(path.join(aus, n), {recursive: true});
    const g1 = zlib.gzipSync(b1, {level: 9}), g2 = zlib.gzipSync(b2, {level: 9});
    fs.writeFileSync(path.join(aus, n, 'p1.jsonl.gz'), g1); fs.writeFileSync(path.join(aus, n, 'p2.jsonl.gz'), g2);
    /* Verlustfrei: gz entpackt wieder die Quelle */
    if (!zlib.gunzipSync(g1).equals(b1) || !zlib.gunzipSync(g2).equals(b2)) probleme.push(`${n}: Komprimierung nicht verlustfrei`);
    const geeignet = p1.length ? p1[0].geeignet : null, nrs = new Set(p1.map(r => r.nr));
    const gebucht = p1.filter(r => r.buchung), fehler = p1.filter(r => !r.buchung);
    if (nrs.size !== p1.length) probleme.push(`${n}: doppelte Nr. in P1`);
    let daten = null;
    try { daten = new Map(zeilen(lies(path.join(wurzel, a.datei))).map(r => [r.nr, r])); } catch (e) { /* Archivdaten nicht verfügbar: Felder bleiben leer */ }
    for (const r of fehler) {
      const d = daten && daten.get(r.nr);
      fehl.push({archiv: n, nr: r.nr, seed: d ? d.seed : null, zuege: d && d.zuege ? d.zuege.length : null, wirFarbe: d ? d.wirFarbe : null, fehler: kuerze(r.fehler === undefined ? '(kein Fehlerfeld, keine Buchung)' : r.fehler)});
    }
    const art = artefakte.find(x => x.name === `diagnose-${n}`);
    manifest.archive[n] = {
      artefakt: art ? {id: art.id, digest: art.digest, erstellt: art.created_at, laeuft_ab: art.expires_at} : null,
      p1: {zeilen: p1.length, geeignet, gebucht: gebucht.length, nicht_gebucht: fehler.map(r => r.nr), wiederholung_gleich: p1.filter(r => r.wiederholung === 'gleich').length, wiederholung_anders: p1.filter(r => r.wiederholung === 'anders').length, sha256_quelle: sha(b1), sha256_gz: sha(g1)},
      p2: {zeilen: p2.length, reproduziert: p2.filter(r => r.reproduziert).length, mit_fehler: p2.filter(r => r.fehler).length, stellungen: p2.reduce((s, r) => s + (r.stellungen || []).length, 0), sha256_quelle: sha(b2), sha256_gz: sha(g2)},
    };
    if (geeignet !== null && p1.length !== geeignet) probleme.push(`${n}: P1 hat ${p1.length} Zeilen, geeignet sind ${geeignet}`);
  }
  fs.writeFileSync(path.join(aus, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const md = [`# P1: Partien ohne Buchung (Actions-Lauf ${opt.run})`, '',
    'Erzeugt von `auswertung/diagnose/rohdaten-sichern.js` aus den Ergebniszeilen von P1. Eine Partie zählt hier, wenn ihre Zeile keine `buchung` trägt (Fehler beim Auswerten). Nichts wurde neu gerechnet.', '',
    `Gesamt: ${fehl.length} Partien.`, ''];
  if (fehl.length) {
    md.push('| Archiv | Nr. | Seed | Züge | Farbe der KI | Fehlermeldung |', '|---|---:|---:|---:|---|---|');
    for (const f of fehl) md.push(`| ${f.archiv} | ${f.nr} | ${f.seed === null ? '–' : f.seed} | ${f.zuege === null ? '–' : f.zuege} | ${f.wirFarbe || '–'} | ${f.fehler.replace(/\|/g, '/')} |`);
    md.push('', 'Diese Partien fehlen in P1. Ob sie die Aussage ändern würden, ist nicht untersucht. Die Schwelle der Vorabfestlegung (mindestens 98 % der geeigneten Partien je Archiv) beurteilt der Bericht.');
  } else md.push('Alle Partien wurden gebucht.');
  fs.writeFileSync(path.join(aus, 'fehlgeschlagen-p1.md'), md.join('\n') + '\n');
  return {probleme, fehlgeschlagen: fehl, manifest};
}
module.exports = {sichern};

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (!opt('--roh') || !opt('--aus') || !opt('--run')) { console.error('Aufruf: --roh DIR --aus DIR --run NR [--archivdaten WURZEL]'); process.exit(2); }
  const r = sichern({roh: opt('--roh'), aus: opt('--aus'), run: opt('--run'), archivdaten: opt('--archivdaten')});
  for (const [n, m] of Object.entries(r.manifest.archive)) console.log(`${n}: P1 ${m.p1.gebucht} von ${m.p1.geeignet} gebucht (nicht gebucht: ${m.p1.nicht_gebucht.join(', ') || 'keine'}), P2 ${m.p2.reproduziert}/${m.p2.zeilen} Partien, ${m.p2.stellungen} Stellungen`);
  console.log(`P1 ohne Buchung insgesamt: ${r.fehlgeschlagen.length}`);
  for (const f of r.fehlgeschlagen) console.log(`  ${f.archiv} Nr. ${f.nr}: ${f.fehler}`);
  if (r.probleme.length) { console.error('PROBLEME:\n  ' + r.probleme.join('\n  ')); process.exit(1); }
}
