// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* P1: Buchung der Punkte zwischen Zug 100 und Zug 200 (docs/diagnose-p1p2.md §4).

   Aus archivierten Partien: GNU Go (Stufe 1, wie besitz-verlauf.js) beurteilt die
   Stellung nach Zug 100 und nach Zug 200 (final_status_list); jeder Brettpunkt
   bekommt eine Art (KI-Stein, KI-Gebiet, GG-tot, neutral, GG-Stein, GG-Gebiet,
   KI-tot), jede Art einen Besitz (+1 KI, 0 neutral, −1 GNU Go). Die Punkte, die
   zwischen den beiden Stellungen die Art wechseln, werden auf sieben Posten
   gebucht (nur Wechsel, die Punkte ändern). Gebucht wird **in Punkten, über alle
   geeigneten Partien**; es gibt keine Auswahl nach Abstieg und keine Anteile.

   Kontrolle je Partie: Die Summe der sieben Posten ist exakt die Veränderung
   derselben Zählung (Besitz × Punkte der Arten) zwischen Zug 100 und Zug 200.

   Aufruf:
     node auswertung/diagnose/p1-buchung.js --archiv NAME=datei.jsonl.gz --aus p1-NAME.jsonl [--gnugo pfad]
     node auswertung/diagnose/p1-buchung.js --bericht p1-*.jsonl */
'use strict';
const fs = require('fs'), zlib = require('zlib');
const MARKEN = [100, 200];
const GUELTIG = {ausgewertet: 0.98, wiederholung: 5};
const BESITZ = {'KI-Stein': 1, 'KI-Gebiet': 1, 'GG-tot': 1, 'neutral': 0, 'GG-Stein': -1, 'GG-Gebiet': -1, 'KI-tot': -1};
const POSTEN = [
  ['eigeneSteineSterben', 'eigene Steine sterben (KI-Stein → weniger)', (a, b) => a === 'KI-Stein' && BESITZ[b] < 1],
  ['eigenesGebietVerloren', 'eigenes Gebiet geht verloren (KI-Gebiet → GNU Go oder neutral)', (a, b) => a === 'KI-Gebiet' && BESITZ[b] < 1],
  ['neutralAnGG', 'neutrales Gebiet an GNU Go', (a, b) => a === 'neutral' && BESITZ[b] < 0],
  ['neutralAnKI', 'neutrales Gebiet an die KI', (a, b) => a === 'neutral' && BESITZ[b] > 0],
  ['vonGGZurueck', 'von GNU Go zurückgewonnen (GG-Stein, GG-Gebiet → KI oder neutral)', (a, b) => (a === 'GG-Stein' || a === 'GG-Gebiet') && BESITZ[b] > BESITZ[a]],
  ['eigeneTotLebend', 'eigene tote Steine leben wieder (KI-tot → KI oder neutral)', (a, b) => a === 'KI-tot' && BESITZ[b] > BESITZ[a]],
  ['ggTotLebend', 'tote GNU-Go-Steine leben wieder (GG-tot → GNU Go oder neutral)', (a, b) => a === 'GG-tot' && BESITZ[b] < 1],
];

/* Eine Partie buchen. r = Ausgabe von besitz-verlauf.analysiere (Marken 100 und 200) */
function buchen(r) {
  const uebergang = r.uebergaenge && r.uebergaenge['100-200'];
  const a100 = r.stand && r.stand[100] && r.stand[100].arten, a200 = r.stand && r.stand[200] && r.stand[200].arten;
  if (!uebergang || !a100 || !a200) return null;
  const posten = {}; for (const [k] of POSTEN) posten[k] = 0;
  let sonstige = 0;
  for (const [wechsel, anzahl] of Object.entries(uebergang)) {
    const [a, b] = wechsel.split('>'), punkte = (BESITZ[b] - BESITZ[a]) * anzahl;
    if (punkte === 0) continue;
    const treffer = POSTEN.filter(([, , f]) => f(a, b));
    if (treffer.length === 1) posten[treffer[0][0]] += punkte; else sonstige += punkte;
  }
  const flaeche = arten => Object.entries(arten).reduce((s, [k, v]) => s + BESITZ[k] * v, 0);
  const felder = arten => Object.values(arten).reduce((s, v) => s + v, 0);
  const summe = Object.values(posten).reduce((s, v) => s + v, 0) + sonstige;
  return {posten, sonstige, summe, delta: flaeche(a200) - flaeche(a100), felder100: felder(a100), felder200: felder(a200),
          zaehlung100: r.stand[100].zaehlung, zaehlung200: r.stand[200].zaehlung};
}
const mittel = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { if (a.length < 2) return null; const m = mittel(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const ci = a => { const s = sd(a); if (s === null) return null; const m = mittel(a), h = 1.96 * s / Math.sqrt(a.length); return [m - h, m + h]; };

function auswerten(partien) {
  const b = partien.map(p => p.buchung).filter(Boolean);
  if (!b.length) return null;
  const kenn = f => ({mittel: mittel(b.map(f)), median: median(b.map(f)), ci: ci(b.map(f))});
  const aus = {partien: b.length, delta: kenn(x => x.delta), anteilAbstieg: b.filter(x => x.delta < 0).length / b.length, posten: {}};
  for (const [k] of POSTEN) aus.posten[k] = kenn(x => x.posten[k]);
  aus.sonstige = kenn(x => x.sonstige);
  return aus;
}

function gueltigkeit(partien, geeignetJeArchiv) {
  const gruende = [];
  const archive = {}; for (const p of partien) (archive[p.archiv] = archive[p.archiv] || []).push(p);
  for (const [name, ps] of Object.entries(archive)) {
    const mit = ps.find(p => p.geeignet);
    const geeignet = geeignetJeArchiv && geeignetJeArchiv[name] ? geeignetJeArchiv[name] : (mit ? mit.geeignet : ps.length);
    const ok = ps.filter(p => p.buchung).length;
    if (ok / geeignet < GUELTIG.ausgewertet) gruende.push(`${name}: nur ${ok} von ${geeignet} geeigneten Partien ausgewertet (mindestens ${Math.ceil(GUELTIG.ausgewertet * 100)} %)`);
  }
  const bs = partien.map(p => p.buchung).filter(Boolean);
  const falsch = bs.filter(x => x.summe !== x.delta).length;
  if (falsch) gruende.push(`Buchungsidentität verletzt in ${falsch} Partien (Summe der Posten ≠ Veränderung der Zählung)`);
  const sonst = bs.filter(x => x.sonstige !== 0).length;
  if (sonst) gruende.push(`${sonst} Partien mit Wechseln, die keinem der sieben Posten gehören`);
  const felder = bs.filter(x => x.felder100 !== 361 || x.felder200 !== 361).length;
  if (felder) gruende.push(`${felder} Partien mit unvollständiger Zählung (nicht alle 361 Punkte vergeben)`);
  const wdh = partien.filter(p => p.wiederholung);
  if (wdh.some(p => p.wiederholung !== 'gleich')) gruende.push(`Wiederholungskontrolle: ${wdh.filter(p => p.wiederholung !== 'gleich').length} Partien beim zweiten Durchgang anders`);
  return {gueltig: gruende.length === 0, gruende};
}

const f1 = x => x === null || x === undefined ? '–' : (x >= 0 ? '+' : '') + x.toFixed(1);
const fci = x => x ? `[${x[0].toFixed(1)}; ${x[1].toFixed(1)}]` : '–';
function bericht(partien, geeignetJeArchiv) {
  const archive = {}; for (const p of partien) (archive[p.archiv] = archive[p.archiv] || []).push(p);
  const g = gueltigkeit(partien, geeignetJeArchiv), z = [];
  z.push('# P1: Buchung der Punkte zwischen Zug 100 und Zug 200 (Punkte je Partie, Sicht der KI)', '');
  if (!g.gueltig) z.push('**KEIN URTEIL (ungültig).** Grund: ' + g.gruende.join('; '), '', 'Die folgenden Zahlen sind **vorläufig**.', '');
  else z.push('Lauf gültig (alle vorab festgelegten technischen Bedingungen erfüllt).', '');
  z.push('Alle geeigneten Partien, keine Auswahl nach Abstieg. Je Zelle: Mittel [95-%-Intervall über die Partien], Median.', '');
  const namen = Object.keys(archive), alle = {'alle Archive': partien};
  const spalten = [...namen.map(n => [n, archive[n]]), ...Object.entries(alle)];
  z.push('| Posten | ' + spalten.map(([n]) => n).join(' | ') + ' |', '|---|' + spalten.map(() => '---').join('|') + '|');
  const aus = spalten.map(([, ps]) => auswerten(ps));
  const zelle = (a, f) => a ? `${f1(f(a).mittel)} ${fci(f(a).ci)}, Median ${f1(f(a).median)}` : '–';
  z.push('| Partien | ' + aus.map(a => a ? a.partien : 0).join(' | ') + ' |');
  z.push('| **Veränderung der Zählung (Summe)** | ' + aus.map(a => zelle(a, x => x.delta)).join(' | ') + ' |');
  for (const [k, titel] of POSTEN.map(p => [p[0], p[1]])) z.push(`| ${titel} | ` + aus.map(a => zelle(a, x => x.posten[k])).join(' | ') + ' |');
  z.push('| Anteil der Partien mit Abstieg (Summe < 0) | ' + aus.map(a => a ? (100 * a.anteilAbstieg).toFixed(1) + ' %' : '–').join(' | ') + ' |');
  z.push('', 'Die sieben Posten teilen alle Wechsel, die Punkte ändern; ihre Summe ist je Partie exakt die Veränderung der Zählung zwischen Zug 100 und Zug 200 (Kontrolle). Ein Wechsel KI → GNU Go kostet 2 Punkte, KI → neutral 1.');
  return {text: z.join('\n'), gueltig: g.gueltig, gruende: g.gruende};
}

module.exports = {MARKEN, GUELTIG, BESITZ, POSTEN, buchen, auswerten, gueltigkeit, bericht};

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const lies = d => (/\.gz$/.test(d) ? zlib.gunzipSync(fs.readFileSync(d)).toString('utf8') : fs.readFileSync(d, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l));
  if (a.includes('--bericht')) {
    const dateien = [opt('--bericht'), ...a.filter(x => !x.startsWith('--') && x !== opt('--bericht'))].filter(Boolean);
    const ps = dateien.flatMap(lies);
    const b = bericht(ps); console.log(b.text); process.exit(b.gueltig ? 0 : 1);
  }
  const ar = opt('--archiv'); if (!ar || !ar.includes('=')) { console.error('--archiv NAME=datei erwartet'); process.exit(2); }
  const name = ar.slice(0, ar.indexOf('=')), datei = ar.slice(ar.indexOf('=') + 1), aus = opt('--aus');
  const {analysiere} = require('../besitz-verlauf.js');
  (async () => {
    const rows = lies(datei).filter(p => !(p.vorgabe >= 2) && !p.abgebrochen && p.zuege && p.zuege.length >= Math.max(...MARKEN)).sort((x, y) => x.nr - y.nr);
    if (aus) fs.writeFileSync(aus, '');
    const optA = {marken: MARKEN, gnugo: opt('--gnugo') || '/usr/games/gnugo', karten: false};
    let n = 0;
    for (const [i, p] of rows.entries()) {
      const rec = {archiv: name, nr: p.nr, geeignet: rows.length};
      try {
        rec.buchung = buchen(await analysiere(p, optA));
        if (i < GUELTIG.wiederholung) { const w = buchen(await analysiere(p, optA)); rec.wiederholung = JSON.stringify(w) === JSON.stringify(rec.buchung) ? 'gleich' : 'anders'; }
      } catch (e) { rec.fehler = String(e.message || e); }
      if (rec.buchung) n++;
      if (aus) fs.appendFileSync(aus, JSON.stringify(rec) + '\n');
    }
    console.log(`${name}: ${n} von ${rows.length} geeigneten Partien gebucht`);
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}
