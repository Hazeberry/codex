// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gemeinsame Festlegungen der Diagnose P1/P2 (docs/diagnose-p1p2.md §2, §8):
   die vier erwarteten Archive, die Paketgröße von P1 und die Hilfen für Pakete
   und doppelte Einträge. Die Berichte prüfen gegen diese Liste: Fehlt ein Archiv
   ganz oder zum Teil, ist der Lauf ungültig („kein Urteil“). */
'use strict';

const ARCHIVE = [
  {name: 'leeres-brett-g-D', datei: 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz'},
  {name: 'muster-ohne-vorgabe-g-D', datei: 'docs/daten/muster-ohne-vorgabe/lauf1/g-D.jsonl.gz'},
  {name: 'muster-ohne-vorgabe-f-D', datei: 'docs/daten/muster-ohne-vorgabe/lauf1/f-D.jsonl.gz'},
  {name: 'fuego-siege-D', datei: 'docs/daten/fuego-siege/lauf1/D.jsonl.gz'},
];
const NAMEN = ARCHIVE.map(a => a.name);
const PAKET = 120;        /* Partien je P1-Paket */
const MARKE_BIS = 200;    /* geeignet: mindestens so viele Züge */

/* geeignete Partien, nach Nr. sortiert (gleiche Regel wie in P1 und P2) */
const geeignete = rows => rows.filter(p => !(p.vorgabe >= 2) && !p.abgebrochen && p.zuege && p.zuege.length >= MARKE_BIS).sort((a, b) => a.nr - b.nr);
const anzahlPakete = (n, groesse = PAKET) => Math.max(1, Math.ceil(n / groesse));
const paketVon = (geeignet, k, groesse = PAKET) => geeignet.slice((k - 1) * groesse, k * groesse);

/* Doppelte Einträge (gleiches Archiv und gleiche Nr.): ein brauchbarer Eintrag geht vor einem fehlgeschlagenen */
function entdoppeln(recs) {
  const brauchbar = r => !r.fehler && (r.buchung || r.stellungen !== undefined);
  const karte = new Map();
  for (const r of recs) {
    const k = r.archiv + '|' + r.nr, alt = karte.get(k);
    if (!alt || (!brauchbar(alt) && brauchbar(r))) karte.set(k, r);
  }
  return [...karte.values()];
}

module.exports = {ARCHIVE, NAMEN, PAKET, MARKE_BIS, geeignete, anzahlPakete, paketVon, entdoppeln};
