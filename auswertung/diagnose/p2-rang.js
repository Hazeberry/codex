// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Rangverteilung von GNU Gos Zug in den gesicherten P2-Rohdaten (docs/diagnose-p2-rang.md).

   Eingabe  <rohdaten>/<archiv>/p2.jsonl.gz (gesichert aus dem Diagnose-Lauf 41480291668)
   Ausgabe  p2-rang.md und p2-rang.json im Ausgabeordner. Nichts wird neu gespielt, GNU Go läuft nicht.

   Nenner (eindeutig, jede Zelle):
     Stellungen        alle Stellungen der Partien in der Zelle
     Pässe             GNU Go passt (g < 0); werden nicht gezählt
     fehlend           kein Referenzzug (g fehlt oder null); werden nicht gezählt
     N_gültig          Stellungen − Pässe − fehlend
   Auf N_gültig verteilt sich jede Rangverteilung vollständig auf: Rang 1, 2–4, 5–8, 9–16, 17–24,
   25–32, > 32 (jeweils in der Liste) und „nicht gelistet“ (der Zug steht nicht in der Liste).
   „Rang > 32“ und „nicht gelistet“ sind verschieden. Für den gespielten Zug der KI gilt dasselbe mit
   eigenem N_gültig (gespielt ≥ 0). Mittel je Partie zählt jede Partie gleich, gepoolt steht daneben.

   Aufruf:  node auswertung/diagnose/p2-rang.js --roh docs/daten/diagnose-p1p2/rohdaten --aus ordner */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const EW = require('./erwartet.js');

const KINDER = 16;
const BUCKETS = [['1', 1, 1], ['2–4', 2, 4], ['5–8', 5, 8], ['9–16', 9, 16], ['17–24', 17, 24], ['25–32', 25, 32], ['>32', 33, Infinity]];
const NICHT = 'nicht gelistet';
const SPALTEN = [...BUCKETS.map(b => b[0]), NICHT];
const PHASEN = [['Zug 81–120', 80, 119], ['Zug 121–160', 120, 159], ['Zug 161–200', 160, 199]];
/* Veröffentlichte Werte des P2-Berichts (docs/daten/diagnose-p1p2/p2.md) als Kontrolle */
const KONTROLL = {
  'fuego-siege-D':           {stellungen: 1200, gueltig: 1200, inKids: 38.4, ohneNetz: 37.6, nurNetz: 2.9, verloren: 2.1, inListe: 98.8},
  'leeres-brett-g-D':        {stellungen: 1200, gueltig: 1184, inKids: 42.4, ohneNetz: 34.8, nurNetz: 9.3, verloren: 1.7, inListe: 99.6},
  'muster-ohne-vorgabe-f-D': {stellungen: 1200, gueltig: 1200, inKids: 31.6, ohneNetz: 26.4, nurNetz: 6.4, verloren: 1.3, inListe: 99.1},
  'muster-ohne-vorgabe-g-D': {stellungen: 1200, gueltig: 1170, inKids: 42.8, ohneNetz: 38.5, nurNetz: 7.2, verloren: 2.9, inListe: 100.0},
};
const ALT = {rang1: 20, bis16: 70, median: 7, stellungen: 1354};   /* punktverlust-muster.md §5 */

const rangVon = (liste, i) => { const k = liste.indexOf(i); return k < 0 ? 0 : k + 1; };
function klasse(rang) {
  if (rang === 0) return NICHT;
  for (const [n, lo, hi] of BUCKETS) if (rang >= lo && rang <= hi) return n;
  return '>32';
}
const phaseVon = mc => { const p = PHASEN.find(([, lo, hi]) => mc >= lo && mc <= hi); return p ? p[0] : null; };
const art = z => (z === null || z === undefined) ? 'fehlend' : (z < 0 ? 'pass' : 'gueltig');

/* Eine Stellung auswerten: Rang des Referenzzugs und des gespielten Zugs in vor und nach */
function stellung(s) {
  const o = {mc: s.mc, phase: phaseVon(s.mc), ref: art(s.g), gesp: art(s.gespielt), netz: !!s.netz};
  if (o.ref === 'gueltig') {
    o.rVor = rangVon(s.vor, s.g); o.rNach = rangVon(s.nach, s.g);
    o.klVor = klasse(o.rVor); o.klNach = klasse(o.rNach);
    o.inKids = s.kids.includes(s.g); o.inKidsOhneNetz = s.vor.slice(0, KINDER).includes(s.g);
    const bessern = r => r === 0 ? Infinity : r;
    o.netzWirkung = bessern(o.rNach) < bessern(o.rVor) ? 'besser' : bessern(o.rNach) > bessern(o.rVor) ? 'schlechter' : 'gleich';
    o.hinein = o.inKids && !o.inKidsOhneNetz; o.hinaus = !o.inKids && o.inKidsOhneNetz;
  }
  if (o.gesp === 'gueltig') { o.gVor = rangVon(s.vor, s.gespielt); o.gNach = rangVon(s.nach, s.gespielt); o.glKlNach = klasse(o.gNach); o.glKlVor = klasse(o.gVor); o.gleich = s.gespielt === s.g; }
  o.kidsGleichErste16 = s.kids.slice().sort((a, b) => a - b).join() === s.nach.slice(0, KINDER).sort((a, b) => a - b).join();
  return o;
}

const mittel = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sd = a => { if (a.length < 2) return null; const m = mittel(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
const ci = a => { const m = mittel(a), s = sd(a); return (m === null || s === null) ? null : [m - 1.96 * s / Math.sqrt(a.length), m + 1.96 * s / Math.sqrt(a.length)]; };
const wilson = (k, n) => { const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - w) / d, (c + w) / d]; };
function quantil(a, q) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }

/* Zelle: Stellungen (mit Partie-Nr.) → alle Kennzahlen mit eindeutigen Nennern */
function zelle(items) {
  const z = {stellungen: items.length, paesse: 0, fehlend: 0, gueltig: 0, vor: {}, nach: {}, partien: new Set(items.map(i => i.partie)).size};
  for (const k of SPALTEN) { z.vor[k] = 0; z.nach[k] = 0; }
  const ger = items.filter(i => i.o.ref === 'gueltig');
  z.paesse = items.filter(i => i.o.ref === 'pass').length; z.fehlend = items.filter(i => i.o.ref === 'fehlend').length; z.gueltig = ger.length;
  for (const i of ger) { z.vor[i.o.klVor]++; z.nach[i.o.klNach]++; }
  const jePartie = {};
  for (const i of ger) (jePartie[i.partie] = jePartie[i.partie] || []).push(i.o);
  const anteil = (f) => Object.values(jePartie).map(os => os.filter(f).length / os.length);
  z.partienMitStellung = Object.keys(jePartie).length;
  z.je = {};
  for (const liste of ['vor', 'nach']) {
    z.je[liste] = {};
    const kl = liste === 'vor' ? 'klVor' : 'klNach';
    for (const k of SPALTEN) z.je[liste][k] = mittel(anteil(o => o[kl] === k));
    const bis16 = o => { const r = liste === 'vor' ? o.rVor : o.rNach; return r >= 1 && r <= KINDER; };
    z.je[liste].bis16 = mittel(anteil(bis16)); z.je[liste].bis16Ci = ci(anteil(bis16));
    z.je[liste].rang1Ci = ci(anteil(o => (liste === 'vor' ? o.rVor : o.rNach) === 1));
    z.je[liste].bis16Gepoolt = z.gueltig ? ger.filter(i => bis16(i.o)).length / z.gueltig : null;
    const ranks = ger.map(i => liste === 'vor' ? i.o.rVor : i.o.rNach).filter(r => r > 0);
    z.je[liste].gelistet = ranks.length; z.je[liste].median = quantil(ranks, 0.5); z.je[liste].q25 = quantil(ranks, 0.25); z.je[liste].q75 = quantil(ranks, 0.75);
  }
  z.netz = {besser: 0, gleich: 0, schlechter: 0, hinein: 0, hinaus: 0, inKids: 0, inKidsOhneNetz: 0};
  for (const i of ger) { z.netz[i.o.netzWirkung]++; if (i.o.hinein) z.netz.hinein++; if (i.o.hinaus) z.netz.hinaus++; if (i.o.inKids) z.netz.inKids++; if (i.o.inKidsOhneNetz) z.netz.inKidsOhneNetz++; }
  z.netz.kidsAbweichung = items.filter(i => !i.o.kidsGleichErste16).length;
  /* gespielter Zug der KI, Liste nach dem Netz; eigener Nenner */
  const gs = items.filter(i => i.o.gesp === 'gueltig');
  z.gespielt = {gueltig: gs.length, paesse: items.filter(i => i.o.gesp === 'pass').length, fehlend: items.filter(i => i.o.gesp === 'fehlend').length, nach: {}, gleichRef: gs.filter(i => i.o.gleich).length};
  for (const k of SPALTEN) z.gespielt.nach[k] = gs.filter(i => i.o.glKlNach === k).length;
  return z;
}

function auswerten(archive) {
  /* archive: {name: [Partie, ...]} */
  const alle = [];
  for (const [name, ps] of Object.entries(archive)) for (const p of ps) for (const s of (p.stellungen || [])) alle.push({archiv: name, partie: name + '#' + p.nr, farbe: p.wirFarbe, o: stellung(s)});
  const namen = Object.keys(archive), zellen = {};
  for (const a of [...namen, 'alle']) for (const ph of [...PHASEN.map(p => p[0]), 'alle'])
    zellen[a + '|' + ph] = zelle(alle.filter(i => (a === 'alle' || i.archiv === a) && (ph === 'alle' || i.o.phase === ph)));
  const farben = {}; for (const f of ['S', 'W']) farben[f] = zelle(alle.filter(i => i.farbe === f));
  return {zellen, farben, namen, alle};
}

function kontrolle(erg, archive) {
  const gruende = [];
  for (const n of EW.NAMEN) if (!archive[n]) gruende.push(`${n}: Rohdaten fehlen`);
  for (const [n, ps] of Object.entries(archive)) {
    if (ps.length !== 40) gruende.push(`${n}: ${ps.length} Partien statt 40`);
    if (ps.some(p => !p.reproduziert)) gruende.push(`${n}: nicht alle Partien reproduziert`);
  }
  for (const [name, soll] of Object.entries(KONTROLL)) {
    const z = erg.zellen[name + '|alle']; if (!z) continue;
    const r1 = x => Number((100 * x).toFixed(1));   /* wie im P2-Bericht gerundet */
    if (z.stellungen !== soll.stellungen) gruende.push(`${name}: ${z.stellungen} Stellungen statt ${soll.stellungen}`);
    if (z.gueltig !== soll.gueltig) gruende.push(`${name}: N_gültig ${z.gueltig} statt ${soll.gueltig} (Bericht)`);
    if (z.gueltig) {
      const mine = {inKids: r1(z.netz.inKids / z.gueltig), ohneNetz: r1(z.netz.inKidsOhneNetz / z.gueltig), nurNetz: r1(z.netz.hinein / z.gueltig), verloren: r1(z.netz.hinaus / z.gueltig), inListe: r1(1 - z.nach[NICHT] / z.gueltig)};
      for (const k of Object.keys(mine)) if (Math.abs(mine[k] - soll[k]) > 1e-9) gruende.push(`${name}: ${k} ${mine[k]} % statt ${soll[k]} % (Bericht)`);
    }
  }
  for (const [k, z] of Object.entries(erg.zellen)) {
    if (z.paesse + z.fehlend + z.gueltig !== z.stellungen) gruende.push(`${k}: Nenner gehen nicht auf`);
    const sv = SPALTEN.reduce((s, c) => s + z.vor[c], 0), sn = SPALTEN.reduce((s, c) => s + z.nach[c], 0);
    if (sv !== z.gueltig || sn !== z.gueltig) gruende.push(`${k}: Rangklassen summieren sich nicht auf N_gültig`);
    if (z.netz.kidsAbweichung) gruende.push(`${k}: Wurzelkinder ≠ erste 16 der Liste nach dem Netz in ${z.netz.kidsAbweichung} Stellungen`);
  }
  return {gueltig: gruende.length === 0, gruende};
}

const pz = x => x === null || x === undefined ? '–' : (100 * x).toFixed(1) + ' %';
const pci = x => x ? `[${(100 * x[0]).toFixed(1)}; ${(100 * x[1]).toFixed(1)}]` : '–';
const f1 = x => x === null || x === undefined ? '–' : x.toFixed(1);
function bericht(erg, ktr) {
  const z = [], namen = [...erg.namen, 'alle'], phasen = [...PHASEN.map(p => p[0]), 'alle'];
  z.push('# P2-Rang: Rang von GNU Gos Zug in den gesicherten Rohdaten', '');
  z.push(ktr.gueltig ? 'Lauf gültig (Kontrollen bestanden: Nenner, Rangklassen, Wurzelkinder, Übereinstimmung mit dem P2-Bericht).' : '**KEIN URTEIL (ungültig).** Grund: ' + ktr.gruende.join('; '), '');
  z.push('Nenner jeder Zeile: **Stellungen** = **Pässe** (GNU Go passt) + **fehlend** (kein Referenzzug) + **N_gültig**. Die Rangklassen verteilen sich vollständig auf N_gültig; „>32“ (gelistet, Rang über 32) und „nicht gelistet“ (Zug steht nicht in der Liste) sind getrennt. Spaltenwerte: Mittel je Partie (jede Partie gleich).', '');
  for (const liste of ['vor', 'nach']) {
    z.push(`## Rang von GNU Gos Zug, Liste ${liste === 'vor' ? 'VOR' : 'NACH'} dem Endspiel-Netz`, '');
    z.push('| Archiv | Phase | Stellungen | Pässe | fehlend | N_gültig | ' + SPALTEN.join(' | ') + ' | Rang ≤ 16 [95 %] | Median (Q25–Q75) der gelisteten |', '|---|---|---:|---:|---:|---:|' + SPALTEN.map(() => '---:').join('|') + '|---|---|');
    for (const a of namen) for (const ph of phasen) {
      const c = erg.zellen[a + '|' + ph], j = c.je[liste];
      z.push(`| ${a} | ${ph} | ${c.stellungen} | ${c.paesse} | ${c.fehlend} | ${c.gueltig} | ` + SPALTEN.map(k => pz(j[k])).join(' | ') + ` | ${pz(j.bis16)} ${pci(j.bis16Ci)} | ${f1(j.median)} (${f1(j.q25)}–${f1(j.q75)}) |`);
    }
    z.push('');
  }
  z.push('## Wirkung des Netzes auf den Rang von GNU Gos Zug', '', 'Nenner: N_gültig. „besser/gleich/schlechter“ vergleicht den Rang NACH mit dem VOR dem Netz (nicht gelistet zählt als schlechter als jeder Rang). „hinein“: nur durch das Netz unter den 16 Wurzelkindern; „hinaus“: durch das Netz herausgefallen. Kontrolle: Wurzelkinder = erste 16 der Liste nach dem Netz.', '');
  z.push('| Archiv | Phase | N_gültig | besser | gleich | schlechter | hinein | hinaus | in Kindern ohne Netz | in Kindern mit Netz | Abweichung Kinder |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const a of namen) for (const ph of phasen) {
    const c = erg.zellen[a + '|' + ph], n = c.netz, g = c.gueltig, p = x => g ? pz(x / g) : '–';
    z.push(`| ${a} | ${ph} | ${g} | ${p(n.besser)} | ${p(n.gleich)} | ${p(n.schlechter)} | ${p(n.hinein)} | ${p(n.hinaus)} | ${p(n.inKidsOhneNetz)} | ${p(n.inKids)} | ${n.kidsAbweichung} |`);
  }
  z.push('', '## Rang des gespielten Zugs der KI (Liste nach dem Netz)', '', 'Eigener Nenner: Stellungen mit gespielten Zug (ohne KI-Pass und fehlende Angaben). Gepoolt (Anteile der Stellungen).', '');
  z.push('| Archiv | Phase | gespielt gültig | KI-Pässe | fehlend | ' + SPALTEN.join(' | ') + ' | KI spielt GNU Gos Zug |', '|---|---|---:|---:|---:|' + SPALTEN.map(() => '---:').join('|') + '|---:|');
  for (const a of namen) for (const ph of phasen) {
    const c = erg.zellen[a + '|' + ph], g = c.gespielt, p = x => g.gueltig ? pz(x / g.gueltig) : '–';
    z.push(`| ${a} | ${ph} | ${g.gueltig} | ${g.paesse} | ${g.fehlend} | ` + SPALTEN.map(k => p(g.nach[k])).join(' | ') + ` | ${p(g.gleichRef)} |`);
  }
  z.push('', '## Nach Farbe der KI', '', '| Farbe | N_gültig | Rang ≤ 16 vor [95 %] | Rang ≤ 16 nach [95 %] | Rang 1 vor | Rang 1 nach |', '|---|---:|---|---|---:|---:|');
  for (const f of ['S', 'W']) { const c = erg.farben[f]; z.push(`| ${f === 'S' ? 'Schwarz' : 'Weiß'} | ${c.gueltig} | ${pz(c.je.vor.bis16)} ${pci(c.je.vor.bis16Ci)} | ${pz(c.je.nach.bis16)} ${pci(c.je.nach.bis16Ci)} | ${pz(c.je.vor[ '1' ])} | ${pz(c.je.nach['1'])} |`); }
  /* Methodischer Abgleich */
  const a = erg.zellen['alle|alle'].je.vor, ab = wilson(ALT.bis16 / 100 * ALT.stellungen, ALT.stellungen);
  const prueffaelle = []; for (const n of erg.namen) for (const ph of PHASEN.map(p => p[0])) { const c = erg.zellen[n + '|' + ph]; if (c.gueltig >= 100) prueffaelle.push([n + ' / ' + ph, c.je.vor.bis16]); }
  for (const f of ['S', 'W']) prueffaelle.push(['Farbe ' + f, erg.farben[f].je.vor.bis16]);
  const werte = prueffaelle.map(p => p[1]).filter(x => x !== null), mn = werte.length ? Math.min(...werte) : null, mx = werte.length ? Math.max(...werte) : null;
  z.push('', '## Methodischer Abgleich mit den früheren 70 % (`punktverlust-muster.md` §5)', '');
  z.push(`Früher: Rang 1 = ${ALT.rang1} %, Rang ≤ 16 = ${ALT.bis16} % (95 %-Wilson [${(100 * ab[0]).toFixed(1)}; ${(100 * ab[1]).toFixed(1)}] bei n = ${ALT.stellungen}), Median ${ALT.median}; Liste vor der Suche, ohne Netz.`);
  z.push(`Jetzt, Liste VOR dem Netz, alle Archive und Phasen: Rang 1 = ${pz(a['1'])}, Rang ≤ 16 = ${pz(a.bis16)} ${pci(a.bis16Ci)}, Median ${f1(a.median)}.`, '');
  if (mn === null) z.push('**Spanne der prüfbaren Faktoren:** keine Zelle mit N_gültig ≥ 100.', '');
  else z.push(`**Spanne der mit den Rohdaten prüfbaren Faktoren** (Rang ≤ 16 vor dem Netz, Mittel je Partie, Zellen mit N_gültig ≥ 100: Archiv × Phase, Farbe): ${pz(mn)} bis ${pz(mx)}. Die früheren ${ALT.bis16} % liegen **${ALT.bis16 / 100 > mx ? 'oberhalb der gesamten Spanne' : (ALT.bis16 / 100 < mn ? 'unterhalb der gesamten Spanne' : 'innerhalb der Spanne')}**.`, '');
  z.push('| Unterschied zwischen früher und jetzt | prüfbar mit den Rohdaten? | Befund |', '|---|---|---|');
  const sp = (lo, hi) => (lo === Infinity || hi === -Infinity) ? '–' : `${pz(lo)} bis ${pz(hi)}`;
  const phW = PHASEN.map(p => erg.zellen['alle|' + p[0]].je.vor.bis16).filter(x => x !== null), gegn = erg.namen.map(n => erg.zellen[n + '|alle'].je.vor.bis16).filter(x => x !== null);
  z.push(`| Spielphase (früher: alle Züge ab 81 bis Partieende; jetzt Zug 81–200) | teilweise: nur innerhalb 81–200 | Rang ≤ 16 je Phase ${sp(Math.min(...phW), Math.max(...phW))}; die Phase nach Zug 200 steht nicht in den Daten |`);
  z.push(`| Gegner (früher GNU Go Stufe 1; jetzt GNU Go oder Fuego) | ja, innerhalb der vier Archive | Rang ≤ 16 je Archiv ${sp(Math.min(...gegn), Math.max(...gegn))} |`);
  z.push(`| Farbe der KI | ja | Schwarz ${pz(erg.farben.S.je.vor.bis16)}, Weiß ${pz(erg.farben.W.je.vor.bis16)} |`);
  z.push(`| Netz (früher keins) | ja | Liste vor dem Netz ist die vergleichbare; nach dem Netz Rang ≤ 16 = ${pz(erg.zellen['alle|alle'].je.nach.bis16)} |`);
  z.push('| Vorgabe (früher neun Steine, jetzt keine) | **nein**: die Rohdaten enthalten keine Partien mit Vorgabe | offen |');
  z.push('| Referenz (früher `top_moves` bester Zug, jetzt `reg_genmove`) | **nein**: `top_moves` steht nicht in den Rohdaten | offen |');
  z.push('| Zufall der Liste (früher auf 0, jetzt der echte Zufallsstrom mit Gleichständen im Endspiel) | **nein**: die Rohdaten haben nur Rangfolgen, keine Werte und keine zufallsfreie Liste | offen |');
  z.push('| Engine-Stand (Muster, Netz, frische Wurzel u. a. seit der alten Diagnose) | **nein**: nicht Teil dieser Auswertung | offen |');
  z.push(`| Stichprobe (früher ${ALT.stellungen} Stellungen aus 40 Partien, jetzt ${erg.zellen['alle|alle'].gueltig} aus 160) | nicht als Erklärung prüfbar | beide Stichproben sind groß genug, dass Zufallsstreuung allein keinen Abstand von der Größe erklärt (Intervalle oben) |`);
  z.push('', 'Lesart (nur Beschreibung): Erklären die prüfbaren Faktoren die Spanne zu den 70 % nicht, bleiben Vorgabe, Referenzart, Zufall der Liste und Engine-Stand als mögliche Ursachen; welche davon trägt, ist mit diesen Daten nicht entscheidbar.');
  return z.join('\n') + '\n';
}

function laden(roh) {
  const archive = {};
  for (const n of EW.NAMEN) {
    const f = path.join(roh, n, 'p2.jsonl.gz');
    if (!fs.existsSync(f)) continue;
    archive[n] = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  }
  return archive;
}
function lauf(roh, aus) {
  const archive = laden(roh), erg = auswerten(archive), ktr = kontrolle(erg, archive);
  fs.mkdirSync(aus, {recursive: true});
  const text = bericht(erg, ktr);
  fs.writeFileSync(path.join(aus, 'p2-rang.md'), text);
  const json = {gueltig: ktr.gueltig, gruende: ktr.gruende, zellen: Object.fromEntries(Object.entries(erg.zellen).map(([k, c]) => [k, c])), farben: erg.farben};
  fs.writeFileSync(path.join(aus, 'p2-rang.json'), JSON.stringify(json, null, 1) + '\n');
  return {text, ktr, erg};
}
module.exports = {BUCKETS, SPALTEN, PHASEN, KONTROLL, rangVon, klasse, phaseVon, stellung, zelle, auswerten, kontrolle, bericht, laden, lauf};

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (!opt('--roh') || !opt('--aus')) { console.error('Aufruf: --roh ORDNER --aus ORDNER'); process.exit(2); }
  const r = lauf(opt('--roh'), opt('--aus'));
  console.log(r.ktr.gueltig ? 'gültig' : 'KEIN URTEIL: ' + r.ktr.gruende.join('; '));
  process.exit(r.ktr.gueltig ? 0 : 1);
}
