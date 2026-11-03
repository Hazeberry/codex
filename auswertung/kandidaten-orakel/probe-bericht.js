// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Laufzeitprobe des Kandidaten-Orakels (docs/kandidaten-orakel.md §7).

   Eingabe (Ordner mit den Rohdaten): g-A.jsonl, g-S.jsonl, g-ZS.jsonl (GNU Go),
   f-A.jsonl, f-S.jsonl, f-ZS.jsonl (Fuego), kontrolle.jsonl (Arm A, Seed 222, Nr. 1 bis 4).
   Ausgewertet werden NUR: Dauer, Antwortquote, Fallanteile, Auslösergleichheit S/ZS, Kontrolle gegen
   das Archiv und die Streuung der Paardifferenz. Die HÖHE der Endstand-Unterschiede zwischen den Armen
   wird weder berechnet noch ausgegeben (§7: sie geht in keine Entscheidung ein).

   Gültigkeit: zwei Zustände. Ungültig = „KEIN URTEIL" mit Grund, Exit 1. Die technische Bedingung 5
   (Hochrechnung gegen das Budget) kann erst Hazeberry mit dem Budget prüfen; der Bericht liefert dafür
   das Maximum der Partiedauer.
   Aufruf:  node probe-bericht.js <ordner> [<archiv.jsonl.gz>] [--bericht bericht.md] */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const lies = d => {
  if (!fs.existsSync(d)) return [];
  const roh = fs.readFileSync(d);
  return (/\.gz$/.test(d) ? zlib.gunzipSync(roh).toString('utf8') : roh.toString('utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l));
};
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sd = a => { if (a.length < 2) return null; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const f1 = x => x === null || x === undefined ? '–' : (Math.round(x * 10) / 10).toString().replace('.', ',');
const ERSTE = ['c', 'd', 'd1'];
const ARME = ['A', 'S', 'ZS'], GEGNER = {g: 'GNU Go', f: 'Fuego'};
const SOLL = {g: 8, f: 4};

function bewerte(ordner, archivPfad) {
  const gruende = [], zeilen = [], daten = {};
  for (const o of ['g', 'f']) for (const a of ARME) daten[o + a] = lies(path.join(ordner, `${o}-${a}.jsonl`));
  const kontrolle = lies(path.join(ordner, 'kontrolle.jsonl'));
  const alle = Object.values(daten).flat();

  /* Vollständigkeit der Arme */
  for (const o of ['g', 'f']) for (const a of ARME) {
    const d = daten[o + a], w = d.filter(r => r.wirFarbe === 'W').length, s = d.length - w;
    if (d.length !== SOLL[o] || s !== w) gruende.push(`${GEGNER[o]} Arm ${a}: ${d.length} Partien (${s} Schwarz, ${w} Weiß) statt ${SOLL[o]} mit gleich vielen je Farbe`);
    if (d.some(r => !r.kandidatenOrakel || r.kandidatenOrakel.arm !== a)) gruende.push(`${GEGNER[o]} Arm ${a}: Partie ohne passendes Ergebnisfeld kandidatenOrakel`);
  }

  /* Bedingung 1: Kontrolle gegen das Archiv */
  let kontrolleOk = null;
  if (archivPfad) {
    const arch = lies(archivPfad).filter(r => r.nr >= 1 && r.nr <= 4);
    kontrolleOk = arch.length === 4 && kontrolle.length === 4 && arch.every(r => { const k = kontrolle.find(x => x.nr === r.nr); return k && JSON.stringify(k.zuege) === JSON.stringify(r.zuege) && k.endstand === r.endstand; });
    if (!kontrolleOk) gruende.push('Bedingung 1: Arm A reproduziert die vier archivierten Partien (Seed 222, Nr. 1 bis 4) nicht bitgleich');
  } else gruende.push('Bedingung 1: kein Archiv zum Vergleich angegeben');

  /* Bedingung 2: Antwortquote */
  const abf = alle.reduce((x, r) => x + (r.kandidatenOrakel ? r.kandidatenOrakel.abfragen : 0), 0);
  const ohne = alle.reduce((x, r) => x + (r.kandidatenOrakel ? r.kandidatenOrakel.ohneAntwort : 0), 0);
  const quote = abf ? 1 - ohne / abf : null;
  if (quote === null || quote < 0.98) gruende.push(`Bedingung 2: Antwortquote ${quote === null ? 'unbekannt' : f1(quote * 100) + ' %'} (verlangt ≥ 98 %)`);

  /* Bedingung 3: Fall d in beiden Farben; Fallzähler */
  const faelle = {S: {}, W: {}};
  for (const r of alle) for (const e of (r.kandidatenOrakel ? r.kandidatenOrakel.ereignisse : [])) { const t = faelle[e.f] || (faelle[e.f] = {}); t[e.fall] = (t[e.fall] || 0) + 1; }
  for (const f of ['S', 'W']) if (!(faelle[f].d > 0)) gruende.push(`Bedingung 3: Fall d tritt in der Farbe ${f === 'S' ? 'Schwarz' : 'Weiß'} nicht auf`);

  /* Bedingung 4: erster Auslöser S gegen ZS je Partie */
  let paare = 0, abw = 0, ohneAusloeser = 0;
  for (const o of ['g', 'f']) for (const s of daten[o + 'S']) {
    const z = daten[o + 'ZS'].find(r => r.nr === s.nr); if (!z) continue;
    paare++;
    const es = s.kandidatenOrakel.ereignisse.find(e => ERSTE.includes(e.fall)), ez = z.kandidatenOrakel.ereignisse.find(e => ERSTE.includes(e.fall));
    if (!es && !ez) { ohneAusloeser++; continue; }
    if (!es || !ez || es.mc !== ez.mc || es.fall !== ez.fall || es.r !== ez.r || es.rn !== ez.rn) abw++;
  }
  if (abw > 0) gruende.push(`Bedingung 4: erster Auslöser von S und ZS weicht in ${abw} von ${paare} Paaren ab (verlangt: 0)`);

  /* Zeilen für den Bericht (nur Dauer, Quoten, Fälle, Streuung) */
  const dauer = [];
  for (const o of ['g', 'f']) for (const a of ARME) {
    const d = daten[o + a], ms = d.map(r => r.kandidatenOrakel && r.kandidatenOrakel.partieMs).filter(Number.isFinite);
    const q = d.reduce((x, r) => x + (r.kandidatenOrakel ? r.kandidatenOrakel.abfragen : 0), 0), qm = d.reduce((x, r) => x + (r.kandidatenOrakel ? r.kandidatenOrakel.abfrageMs : 0), 0);
    dauer.push({o, a, n: d.length, med: median(ms), max: ms.length ? Math.max(...ms) : null, proAbfrage: q ? qm / q : null, eingriffe: d.length ? d.reduce((x, r) => x + r.kandidatenOrakel.ereignisse.filter(e => ERSTE.includes(e.fall)).length, 0) / d.length : null});
  }
  /* Streuung der Paardifferenz S − A je Gegner (nur die Streuung, nicht der Mittelwert) */
  const streu = {};
  for (const o of ['g', 'f']) {
    const dif = [];
    for (const s of daten[o + 'S']) { const a = daten[o + 'A'].find(r => r.nr === s.nr); if (a && Number.isFinite(s.endstand) && Number.isFinite(a.endstand)) dif.push(s.endstand - a.endstand); }
    streu[o] = {n: dif.length, sd: sd(dif)};
  }
  const maxMs = Math.max(0, ...dauer.map(x => x.max || 0));
  return {gruende, gueltig: gruende.length === 0, dauer, quote, abf, ohne, faelle, paare, abw, ohneAusloeser, streu, kontrolleOk, maxMs};
}

function bericht(e) {
  const L = [];
  L.push('# Laufzeitprobe Kandidaten-Orakel (Stufe 0)', '');
  L.push(e.gueltig ? '**Gültig** (technische Bedingungen 1 bis 4 erfüllt; Bedingung 5 prüft Hazeberry mit dem Budget).' : '**KEIN URTEIL** – ungültig:', '');
  for (const g of e.gruende) L.push(`- ${g}`);
  if (!e.gueltig) L.push('');
  L.push('## Dauer (Partie, Millisekunden) und Orakelabfragen', '', '| Gegner | Arm | Partien | Median | Maximum | ms je Abfrage | Eingriffe je Partie |', '|---|---|---:|---:|---:|---:|---:|');
  for (const x of e.dauer) L.push(`| ${GEGNER[x.o]} | ${x.a} | ${x.n} | ${f1(x.med)} | ${f1(x.max)} | ${f1(x.proAbfrage)} | ${f1(x.eingriffe)} |`);
  L.push('', `Größte Partiedauer der Probe: ${f1(e.maxMs)} ms (Grundlage für Bedingung 5: Maximum, nicht Mittel, plus 50 % Reserve).`, '');
  L.push(`Orakelantwort: ${e.abf - e.ohne} von ${e.abf} Abfragen beantwortet (${e.quote === null ? '–' : f1(e.quote * 100)} %).`, '');
  L.push('## Fälle nach Farbe (alle Arme, alle Abfragen)', '', '| Farbe | ' + [...new Set([...Object.keys(e.faelle.S), ...Object.keys(e.faelle.W)])].sort().join(' | ') + ' |');
  const ks = [...new Set([...Object.keys(e.faelle.S), ...Object.keys(e.faelle.W)])].sort();
  L.push('|---|' + ks.map(() => '---:').join('|') + '|');
  for (const f of ['S', 'W']) L.push(`| KI ${f === 'S' ? 'Schwarz' : 'Weiß'} | ` + ks.map(k => e.faelle[f][k] || 0).join(' | ') + ' |');
  L.push('', `Erster Auslöser S gegen ZS: ${e.paare} Paare, ${e.abw} abweichend, ${e.ohneAusloeser} ohne Auslöser in beiden.`, '');
  L.push(`Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4): ${e.kontrolleOk === null ? 'nicht geprüft' : e.kontrolleOk ? 'bitgleich' : 'NICHT bitgleich'}.`, '');
  L.push('## Streuung der Paardifferenz des Endstands (S − A), nur zur Planung', '');
  for (const o of ['g', 'f']) L.push(`- ${GEGNER[o]}: SD ${f1(e.streu[o].sd)} Punkte bei ${e.streu[o].n} Paaren (zu wenige Paare für mehr als eine grobe Größenordnung; Mittelwerte werden nicht ausgegeben).`);
  return L.join('\n') + '\n';
}

module.exports = {bewerte, bericht, median, sd};

if (require.main === module) {
  const a = process.argv.slice(2), pos = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--bericht');
  if (!pos[0]) { console.error('Aufruf: node probe-bericht.js <ordner> [<archiv.jsonl.gz>] [--bericht bericht.md]'); process.exit(2); }
  const e = bewerte(pos[0], pos[1]), t = bericht(e), i = a.indexOf('--bericht');
  if (i >= 0) fs.writeFileSync(a[i + 1], t); else process.stdout.write(t);
  process.exit(e.gueltig ? 0 : 1);
}
