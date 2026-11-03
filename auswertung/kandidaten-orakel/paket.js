// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Ein Paket des Hauptversuchs Kandidaten-Orakel (docs/kandidaten-orakel.md §12) spielen, mit
   Fortsetzen: Jede Partie läuft als eigener Prozess (auswertung/komponenten/spielen.sh mit genau einer
   Partie) und wird sofort an die Paketdatei angehängt. Liegt die Paketdatei schon vor (aus einem
   früheren, abgebrochenen oder fertigen Lauf), werden nur die fehlenden Partienummern gespielt; fertige
   Partien werden nie neu gerechnet. Eine abgeschnittene letzte Zeile (Abbruch beim Schreiben) wird
   verworfen und die Partie neu gespielt.

   Damit fortgesetzte und neue Partien zum selben Stand gehören, legt das Paket eine Begleitdatei
   <aus>.meta.json an: Gegner, Arm, Seed, Bereich, Vorgabe, Datei der Arme und SHA-256 der Quellen,
   die eine Partie bestimmen. Weicht beim Fortsetzen etwas davon ab, bricht das Paket mit Exit 3 ab,
   statt Partien verschiedener Stände zu mischen. Fehlt die Begleitdatei zu einer vorhandenen
   Paketdatei, ebenso.

   Aufruf:  node auswertung/kandidaten-orakel/paket.js --gegner g|f --arm A|S|ZS --von N --anzahl K
                 --seed S --aus paket.jsonl [--nur-pruefen]
   Umgebung wie spielen.sh (ARME, VORGABE, GNUGO, FUEGO); DUELL_ZUSATZ setzt das Paket selbst.
   --nur-pruefen  spielt nichts, gibt nur "fehlen=<Zahl>" aus (Exit 0, oder 3 bei abweichendem Stand).
   Exit: 0 alle Partien des Bereichs vorhanden, 2 falscher Aufruf, 3 Stand weicht ab oder Datei
   beschädigt, sonst der Status von spielen.sh. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {spawnSync} = require('child_process');

const WURZEL = path.join(__dirname, '..', '..');
/* KANDIDATEN_SPIELEN ersetzt spielen.sh, nur für die Tests (Attrappe, die sofort einen Datensatz schreibt) */
const SPIELEN = process.env.KANDIDATEN_SPIELEN || path.join(WURZEL, 'auswertung/komponenten/spielen.sh');
/* Quellen, die den Verlauf einer Partie bestimmen (ohne dieses Skript: es spielt nur ab) */
const QUELLEN = ['index.html', 'gnugo-duell.js', 'auswertung/komponenten/spielen.sh', 'auswertung/lebensurteil.js'];

function optionen(argv) {
  const o = {nurPruefen: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    if (a === '--nur-pruefen') { o.nurPruefen = true; continue; }
    if (!a.startsWith('--') || v === undefined) return null;
    o[a.slice(2)] = v; i++;
  }
  for (const k of ['von', 'anzahl', 'seed']) { if (!/^\d+$/.test(o[k] || '')) return null; o[k] = +o[k]; }
  if (!['g', 'f'].includes(o.gegner) || !['A', 'S', 'ZS'].includes(o.arm) || !o.aus || o.von < 1 || o.anzahl < 1) return null;
  return o;
}

const sha = d => crypto.createHash('sha256').update(fs.readFileSync(d)).digest('hex');
function meta(o) {
  const arme = process.env.ARME || path.join(WURZEL, 'auswertung/komponenten/arme.sh');
  const quellen = {};
  for (const q of QUELLEN) quellen[q] = sha(path.join(WURZEL, q));
  quellen.arme = sha(path.isAbsolute(arme) ? arme : path.join(process.cwd(), arme));
  /* Umgebung, die spielen.sh liest und die den Verlauf ändert (leer = Standard von spielen.sh) */
  const umgebung = {};
  for (const k of ['VORGABE', 'SIMS', 'SCHAETZUNG', 'FUEGO_SPIELE']) umgebung[k] = process.env[k] || null;
  return {gegner: o.gegner, arm: o.arm, seed: o.seed, von: o.von, anzahl: o.anzahl,
          arme: path.basename(arme), umgebung, quellen};
}

/* Vorhandene Paketdatei lesen: vollständige Zeilen behalten, eine abgeschnittene LETZTE Zeile
   verwerfen; alles andere (kaputte Zeile mittendrin, Nummer außerhalb, doppelt) ist ein Fehler. */
function bestand(datei, o) {
  if (!fs.existsSync(datei)) return {zeilen: [], nummern: new Set(), verworfen: 0};
  const roh = fs.readFileSync(datei, 'utf8'), teile = roh.split('\n');
  const zeilen = [], nummern = new Set();
  let verworfen = 0;
  for (let k = 0; k < teile.length; k++) {
    const z = teile[k];
    if (!z.trim()) continue;
    let r;
    try { r = JSON.parse(z); } catch (e) {
      const letzte = teile.slice(k + 1).every(x => !x.trim());
      if (letzte) { verworfen++; continue; }
      throw new Error(`Zeile ${k + 1} ist kein JSON und nicht die letzte`);
    }
    if (!Number.isInteger(r.nr) || r.nr < o.von || r.nr >= o.von + o.anzahl) throw new Error(`Partie ${r.nr} liegt außerhalb ${o.von} bis ${o.von + o.anzahl - 1}`);
    if (nummern.has(r.nr)) throw new Error(`Partie ${r.nr} doppelt`);
    nummern.add(r.nr); zeilen.push(z);
  }
  return {zeilen, nummern, verworfen};
}

function main() {
  const o = optionen(process.argv.slice(2));
  if (!o) {
    console.error('Aufruf: node paket.js --gegner g|f --arm A|S|ZS --von N --anzahl K --seed S --aus paket.jsonl [--nur-pruefen]');
    return 2;
  }
  const metaDatei = o.aus + '.meta.json', soll = meta(o);
  let b;
  try { b = bestand(o.aus, o); } catch (e) { console.error(`Paketdatei ${o.aus} beschädigt: ${e.message}`); return 3; }
  if (fs.existsSync(o.aus) || fs.existsSync(metaDatei)) {
    if (!fs.existsSync(metaDatei)) { if (b.zeilen.length) { console.error(`Fortsetzen abgelehnt: ${o.aus} ohne Begleitdatei ${metaDatei}`); return 3; } }
    else {
      const ist = JSON.parse(fs.readFileSync(metaDatei, 'utf8'));
      if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        console.error('Fortsetzen abgelehnt: Stand oder Einstellungen weichen ab.');
        console.error('  vorhanden: ' + JSON.stringify(ist));
        console.error('  jetzt:     ' + JSON.stringify(soll));
        return 3;
      }
    }
  }
  const fehlend = [];
  for (let nr = o.von; nr < o.von + o.anzahl; nr++) if (!b.nummern.has(nr)) fehlend.push(nr);
  if (o.nurPruefen) { console.log(`fehlen=${fehlend.length}`); return 0; }

  fs.mkdirSync(path.dirname(path.resolve(o.aus)), {recursive: true});
  fs.writeFileSync(metaDatei, JSON.stringify(soll));
  /* bereinigt zurückschreiben (ohne abgeschnittene letzte Zeile) */
  fs.writeFileSync(o.aus, b.zeilen.map(z => z + '\n').join(''));
  console.log(`Paket ${o.gegner}-${o.arm} ab ${o.von}: ${b.zeilen.length} von ${o.anzahl} Partien vorhanden` +
              (b.verworfen ? `, ${b.verworfen} abgeschnittene Zeile verworfen` : '') + `, ${fehlend.length} zu spielen`);
  const tmp = o.aus + '.partie';
  for (const nr of fehlend) {
    const t0 = Date.now();
    const r = spawnSync('bash', [SPIELEN, o.gegner, 'D', String(nr), '1', String(o.seed), tmp],
      {stdio: 'inherit', env: {...process.env, DUELL_ZUSATZ: `--kandidaten-orakel ${o.arm}`}});
    if (r.status !== 0) { console.error(`Partie ${nr}: spielen.sh endete mit Status ${r.status}${r.signal ? ' (' + r.signal + ')' : ''}`); return r.status || 1; }
    const z = fs.readFileSync(tmp, 'utf8').split('\n').filter(x => x.trim());
    let rec = null;
    try { rec = z.length === 1 ? JSON.parse(z[0]) : null; } catch (e) { rec = null; }
    if (!rec || rec.nr !== nr) { console.error(`Partie ${nr}: Ausgabe von spielen.sh unerwartet (${z.length} Zeilen)`); return 3; }
    const fd = fs.openSync(o.aus, 'a'); fs.writeSync(fd, z[0] + '\n'); fs.fsyncSync(fd); fs.closeSync(fd);
    fs.rmSync(tmp, {force: true});
    console.log(`Partie ${nr} gesichert (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  return 0;
}

module.exports = {optionen, bestand, meta, QUELLEN};
if (require.main === module) process.exit(main());
