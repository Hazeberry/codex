// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Auswertung der gesicherten P2-Rohdaten nach Rang (docs/diagnose-p2-rang.md). Nur gebaute Daten:
   die echten Rohdaten werden hier NICHT ausgewertet (das ist dem Actions-Lauf vorbehalten); von ihnen
   wird nur die Form der ersten zwei Zeilen geprüft.
   Geprüft: Rangklassen und ihre Grenzen (>32 und „nicht gelistet“ getrennt); Nenner (Pässe, fehlende
   Referenzzüge, N_gültig) mit Summenkontrolle; Netzwirkung; Phasen; Mittel je Partie gegen gepoolt;
   gespielter Zug mit eigenem Nenner; Kontrollen und „KEIN URTEIL“; Bericht und Abgleich; Workflow.
   Aufruf:  node tests/diagnose-p2-rang.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const R = require('../auswertung/diagnose/p2-rang.js');
const EW = require('../auswertung/diagnose/erwartet.js');
const wurzel = path.join(__dirname, '..');

/* Liste aus den Zügen 100..299, in die g an Rang r eingefügt wird (r = 0: g steht nicht in der Liste) */
function liste(g, r) {
  const a = []; for (let i = 100; i < 300; i++) if (i !== g) a.push(i);
  if (r > 0) a.splice(r - 1, 0, g);
  return a;
}
function st(mc, g, rv, rn, gespielt = 7) {
  const vor = liste(g, rv), nach = liste(g, rn);
  return {mc, gespielt, g, vor, nach, kids: nach.slice(0, 16), netz: true};
}
const partie = (archiv, nr, stellungen, farbe = 'S') => ({archiv, nr, wirFarbe: farbe, reproduziert: true, stellungen});

test('Rangklassen: Grenzen 1, 4, 5, 8, 9, 16, 17, 24, 25, 32, 33; „nicht gelistet“ ist etwas anderes als „> 32“', () => {
  const soll = {1: '1', 2: '2–4', 4: '2–4', 5: '5–8', 8: '5–8', 9: '9–16', 16: '9–16', 17: '17–24', 24: '17–24', 25: '25–32', 32: '25–32', 33: '>32', 200: '>32', 0: 'nicht gelistet'};
  for (const [r, k] of Object.entries(soll)) pruefeGleich(R.klasse(+r), k, 'Rang ' + r);
  pruefe(R.klasse(0) !== R.klasse(33), 'nicht gelistet ≠ >32');
  pruefeGleich(R.rangVon([5, 6, 7], 7), 3, 'Rang = Position + 1'); pruefeGleich(R.rangVon([5, 6, 7], 9), 0, 'nicht gelistet = 0');
  pruefeGleich(R.SPALTEN.length, 8, 'sieben Klassen und „nicht gelistet“');
});

test('Phasen: Zug 81–120 = mc 80–119, 121–160 = 120–159, 161–200 = 160–199; außerhalb keine Phase', () => {
  for (const [mc, ph] of [[80, 'Zug 81–120'], [119, 'Zug 81–120'], [120, 'Zug 121–160'], [159, 'Zug 121–160'], [160, 'Zug 161–200'], [199, 'Zug 161–200'], [79, null], [200, null]])
    pruefeGleich(R.phaseVon(mc), ph, 'mc ' + mc);
});

test('Nenner: Pässe, fehlende Referenzzüge und gültige Stellungen getrennt; die Summen gehen auf', () => {
  const fehlt = st(96, 13, 40, 40); delete fehlt.g;
  const ps = [partie('A', 1, [st(80, 11, 1, 1), st(84, 12, 20, 12), Object.assign(st(88, 5, 3, 3), {g: -1}), Object.assign(st(92, 5, 3, 3), {g: null}), fehlt])];
  const z = R.auswerten({A: ps}).zellen['A|alle'];
  pruefeGleich(z.stellungen, 5, 'Stellungen'); pruefeGleich(z.paesse, 1, 'Pässe'); pruefeGleich(z.fehlend, 2, 'fehlend (null und nicht vorhanden)'); pruefeGleich(z.gueltig, 2, 'N_gültig');
  pruefeGleich(R.SPALTEN.reduce((s, k) => s + z.vor[k], 0), 2, 'Klassen vor = N_gültig'); pruefeGleich(R.SPALTEN.reduce((s, k) => s + z.nach[k], 0), 2, 'Klassen nach = N_gültig');
  pruefeGleich(z.vor['1'], 1, 'Rang 1 vor'); pruefeGleich(z.vor['17–24'], 1, 'Rang 20 vor'); pruefeGleich(z.nach['9–16'], 1, 'Rang 12 nach');
});

test('„> 32“ und „nicht gelistet“ stehen getrennt; „in der Liste“ ist 1 − nicht gelistet', () => {
  const z = R.auswerten({A: [partie('A', 1, [st(80, 11, 50, 50), st(84, 12, 0, 0), st(88, 13, 5, 5), st(92, 14, 40, 40)])]}).zellen['A|alle'];
  pruefeGleich(z.vor['>32'], 2, 'Rang 50 und 40'); pruefeGleich(z.vor['nicht gelistet'], 1, 'nicht gelistet'); pruefeGleich(z.vor['5–8'], 1, 'Rang 5');
  pruefeGleich(z.gueltig, 4, 'alle vier haben einen Referenzzug');
});

test('Netzwirkung: besser/gleich/schlechter, hinein/hinaus und die Kontrolle „Wurzelkinder = erste 16 nach dem Netz“', () => {
  const ps = [partie('A', 1, [st(80, 11, 30, 3), st(84, 12, 3, 30), st(88, 13, 9, 9), st(92, 14, 16, 17), st(96, 15, 17, 16), st(100, 16, 0, 4)])];
  const n = R.auswerten({A: ps}).zellen['A|alle'].netz;
  pruefeGleich(n.besser, 3, 'besser (30→3, 17→16, nicht gelistet→4)'); pruefeGleich(n.schlechter, 2, 'schlechter (3→30, 16→17)'); pruefeGleich(n.gleich, 1, 'gleich (9→9)');
  pruefeGleich(n.hinein, 3, 'hinein'); pruefeGleich(n.hinaus, 2, 'hinaus'); pruefeGleich(n.inKidsOhneNetz, 3, 'in Kindern ohne Netz'); pruefeGleich(n.inKids, 4, 'in Kindern mit Netz');
  pruefeGleich(n.kidsAbweichung, 0, 'Kinder = erste 16');
  const kaputt = st(80, 11, 3, 3); kaputt.kids = kaputt.nach.slice(1, 17);
  pruefeGleich(R.auswerten({A: [partie('A', 1, [kaputt])]}).zellen['A|alle'].netz.kidsAbweichung, 1, 'Abweichung erkannt');
});

test('Mittel je Partie gegen gepoolt: jede Partie zählt gleich', () => {
  const p1 = partie('A', 1, [st(80, 11, 1, 1), st(84, 12, 1, 1)]);
  const p2 = partie('A', 2, Array.from({length: 8}, (_, i) => st(80 + 4 * i, 11 + i, 40, 40)));
  const z = R.auswerten({A: [p1, p2]}).zellen['A|alle'];
  pruefeGleich(z.gueltig, 10, 'N_gültig'); pruefeGleich(z.vor['1'], 2, 'gepoolt zwei Rang-1-Stellungen');
  pruefeGleich(z.je.vor['1'], 0.5, 'Mittel je Partie: (1 + 0) / 2'); pruefeGleich(z.je.vor.bis16, 0.5, 'Rang ≤ 16 je Partie'); pruefeGleich(z.je.vor.bis16Gepoolt, 0.2, 'gepoolt 2 / 10');
});

test('Phasen-Zellen: jede Stellung nur in ihrer Phase, „alle“ enthält auch Stellungen außerhalb', () => {
  const ps = [partie('A', 1, [st(80, 11, 1, 1), st(130, 12, 1, 1), st(170, 13, 1, 1), st(200, 14, 1, 1)])];
  const e = R.auswerten({A: ps});
  pruefeGleich(e.zellen['A|Zug 81–120'].stellungen, 1, 'Phase 1'); pruefeGleich(e.zellen['A|Zug 121–160'].stellungen, 1, 'Phase 2'); pruefeGleich(e.zellen['A|Zug 161–200'].stellungen, 1, 'Phase 3');
  pruefeGleich(e.zellen['A|alle'].stellungen, 4, 'alle'); pruefeGleich(e.zellen['alle|alle'].stellungen, 4, 'alle Archive');
});

test('Gespielter Zug: eigener Nenner (KI-Pass und fehlend getrennt), Rang in der Liste nach dem Netz', () => {
  const a = st(80, 11, 3, 3, 11), b = st(84, 12, 3, 3, 299), c = st(88, 13, 3, 3, -1), d = st(92, 14, 3, 3, null), f = st(96, 15, 3, 3); delete f.gespielt;
  const z = R.auswerten({A: [partie('A', 1, [a, b, c, d, f])]}).zellen['A|alle'].gespielt;
  pruefeGleich(z.gueltig, 2, 'gespielt gültig'); pruefeGleich(z.paesse, 1, 'KI-Pässe'); pruefeGleich(z.fehlend, 2, 'fehlend'); pruefeGleich(z.gleichRef, 1, 'gleich dem Referenzzug');
  pruefeGleich(z.nach['2–4'], 1, 'Rang 3 (= Referenzzug)'); pruefeGleich(z.nach['>32'], 1, 'Zug 299 steht weit hinten');
});

function vier(anzahlProPartie = 2) {
  const out = {};
  for (const n of EW.NAMEN) out[n] = Array.from({length: 40}, (_, i) => partie(n, i, Array.from({length: anzahlProPartie}, (_, k) => st(80 + 4 * k, 11 + k, 3 + k, 5 + k))));
  return out;
}
function kontrollwerte(erg) {
  const o = {};
  for (const n of EW.NAMEN) { const z = erg.zellen[n + '|alle'], r1 = x => Number((100 * x).toFixed(1)); o[n] = {stellungen: z.stellungen, gueltig: z.gueltig, inKids: r1(z.netz.inKids / z.gueltig), ohneNetz: r1(z.netz.inKidsOhneNetz / z.gueltig), nurNetz: r1(z.netz.hinein / z.gueltig), verloren: r1(z.netz.hinaus / z.gueltig), inListe: r1(1 - z.nach['nicht gelistet'] / z.gueltig)}; }
  return o;
}
test('Kontrollen: stimmen die Zahlen mit dem P2-Bericht überein, ist der Lauf gültig; jede Abweichung macht ihn zu „KEIN URTEIL“', () => {
  const sicher = JSON.parse(JSON.stringify(R.KONTROLL));
  try {
    const arch = vier(), erg = R.auswerten(arch);
    Object.assign(R.KONTROLL, kontrollwerte(erg));
    let k = R.kontrolle(erg, arch); pruefe(k.gueltig, 'Grundfall gültig: ' + k.gruende.join('; '));
    pruefe(/Lauf gültig/.test(R.bericht(erg, k)), 'Bericht: gültig');
    const fehlt = Object.assign({}, arch); delete fehlt['fuego-siege-D'];
    k = R.kontrolle(R.auswerten(fehlt), fehlt); pruefe(!k.gueltig && /fuego-siege-D: Rohdaten fehlen/.test(k.gruende.join()), 'fehlendes Archiv');
    const wenige = vier(); wenige['leeres-brett-g-D'].pop(); k = R.kontrolle(R.auswerten(wenige), wenige); pruefe(!k.gueltig && /39 Partien statt 40/.test(k.gruende.join()), 'weniger als 40 Partien');
    const nichtRep = vier(); nichtRep['muster-ohne-vorgabe-g-D'][0].reproduziert = false; k = R.kontrolle(R.auswerten(nichtRep), nichtRep); pruefe(!k.gueltig, 'nicht reproduziert');
    const pass = vier(); pass['muster-ohne-vorgabe-f-D'][0].stellungen[0].g = -1; k = R.kontrolle(R.auswerten(pass), pass); pruefe(!k.gueltig && /N_gültig/.test(k.gruende.join()), 'zusätzlicher Pass ändert N_gültig gegenüber dem Bericht');
    R.KONTROLL['fuego-siege-D'].inKids += 0.1; k = R.kontrolle(erg, arch); pruefe(!k.gueltig && /inKids/.test(k.gruende.join()), 'Abweichung gegen den P2-Bericht');
    const bericht = R.bericht(erg, k); pruefe(/KEIN URTEIL/.test(bericht), 'Bericht: KEIN URTEIL');
  } finally { for (const n of Object.keys(sicher)) R.KONTROLL[n] = sicher[n]; }
});

test('Veröffentlichte Kontrollwerte im Code stimmen mit docs/daten/diagnose-p1p2/p2.md überein', () => {
  const md = fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/p2.md'), 'utf8');
  for (const [n, soll] of Object.entries(R.KONTROLL)) {
    const zeile = md.split('\n').find(l => l.startsWith('| ' + n + ' |')); pruefe(!!zeile, 'Zeile ' + n);
    const c = zeile.split('|').map(x => x.trim());
    pruefeGleich(+c[3], soll.gueltig, n + ': N_gültig'); pruefeGleich(+/gepoolt ([\d.]+) %/.exec(c[4])[1], soll.inKids, n + ': in Kindern');
    pruefeGleich(+/gepoolt ([\d.]+) %/.exec(c[5])[1], soll.ohneNetz, n + ': ohne Netz'); pruefeGleich(+/\(([\d.]+) %\)/.exec(c[6])[1], soll.nurNetz, n + ': nur durch das Netz');
    pruefeGleich(+/\(([\d.]+) %\)/.exec(c[7])[1], soll.verloren, n + ': verloren'); pruefeGleich(+/\(([\d.]+) %\)/.exec(c[8])[1], soll.inListe, n + ': in der Liste');
  }
});

test('Bericht: getrennte Nenner, alle Rangklassen, beide Listen, Abgleich mit den 70 % samt „nicht prüfbar“', () => {
  const arch = vier(), erg = R.auswerten(arch), text = R.bericht(erg, R.kontrolle(erg, arch));
  for (const s of ['Pässe', 'fehlend', 'N_gültig', '>32', 'nicht gelistet', 'VOR dem Endspiel-Netz', 'NACH dem Endspiel-Netz', 'Wirkung des Netzes', 'Rang des gespielten Zugs', 'Nach Farbe der KI', 'Methodischer Abgleich', '70'])
    pruefe(text.includes(s), 'Bericht enthält: ' + s);
  for (const s of ['Vorgabe', 'Referenz', 'Zufall der Liste', 'Engine-Stand']) pruefe(new RegExp('\\| ' + s + '[^\\n]*\\*\\*nein\\*\\*').test(text), s + ' als nicht prüfbar');
  for (const s of ['Spielphase', 'Gegner', 'Farbe der KI', 'Netz (früher keins)']) pruefe(text.includes('| ' + s), s + ' als Zeile');
  pruefe(!/Code- und Parameterliste|engine-abgleich/.test(text), 'keine Liste der Standardwerte');
  for (const ph of ['Zug 81–120', 'Zug 121–160', 'Zug 161–200']) pruefe(text.includes('| ' + ph + ' |'), 'Phase ' + ph);
});

test('Lauf und Kommandozeile: schreibt Bericht und JSON; fehlende Rohdaten → „KEIN URTEIL“ und Exit 1', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rang-')), aus = path.join(tmp, 'aus');
  const r = spawnSync(process.execPath, [path.join(wurzel, 'auswertung/diagnose/p2-rang.js'), '--roh', path.join(tmp, 'gibt-es-nicht'), '--aus', aus], {encoding: 'utf8'});
  pruefeGleich(r.status, 1, 'Exit 1: ' + r.stdout + r.stderr); pruefe(/KEIN URTEIL/.test(r.stdout) && /Rohdaten fehlen/.test(r.stdout), 'Meldung');
  pruefe(fs.existsSync(path.join(aus, 'p2-rang.md')) && fs.existsSync(path.join(aus, 'p2-rang.json')), 'Dateien geschrieben');
  pruefe(/KEIN URTEIL/.test(fs.readFileSync(path.join(aus, 'p2-rang.md'), 'utf8')), 'Bericht trägt KEIN URTEIL');
  pruefeGleich(spawnSync(process.execPath, [path.join(wurzel, 'auswertung/diagnose/p2-rang.js')], {encoding: 'utf8'}).status, 2, 'ohne Argumente Exit 2');
});

test('Form der echten Rohdaten (nur die ersten zwei Zeilen, keine Auswertung)', () => {
  const dir = path.join(wurzel, 'docs/daten/diagnose-p1p2/rohdaten');
  for (const n of EW.NAMEN) {
    const zeilen = zlib.gunzipSync(fs.readFileSync(path.join(dir, n, 'p2.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).slice(0, 2).map(l => JSON.parse(l));
    for (const p of zeilen) {
      pruefe(p.archiv === n && typeof p.nr === 'number' && (p.wirFarbe === 'S' || p.wirFarbe === 'W') && p.reproduziert === true && Array.isArray(p.stellungen) && p.stellungen.length > 0, n + ': Partie');
      const s = p.stellungen[0];
      pruefe(typeof s.mc === 'number' && Array.isArray(s.vor) && Array.isArray(s.nach) && Array.isArray(s.kids) && 'g' in s && 'gespielt' in s && 'netz' in s, n + ': Stellung');
    }
  }
});

test('Workflow: nur von Hand, schreibt auf einen neuen Ergebnisbranch (nie main, nie Force), kein GNU Go, Upload mit always()', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagnose-p2-rang.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y) && !/^\s*(push|pull_request|schedule):/m.test(y) && !/inputs:/.test(y), 'nur workflow_dispatch, ohne Eingaben');
  pruefe(/ubuntu-24\.04/.test(y) && !/ubuntu-latest/.test(y), 'Runner');
  pruefe(/contents: write/.test(y), 'Schreibrecht (freigegeben)');
  pruefe(/zweig="claude\/diagnose-p2-rang-ergebnis-\$GITHUB_RUN_ID"/.test(y) && /refs\/heads\/\$zweig/.test(y), 'neuer Ergebnisbranch je Lauf');
  pruefe(!/--force|git push -f|push origin main|refs\/heads\/main/.test(y), 'kein Force, kein main');
  pruefe(!/gnugo|apt-get|p1-buchung|p2-kandidaten|wurzel-replay/i.test(y), 'kein GNU Go, kein Replay');
  pruefe(/p2-rang\.js --roh docs\/daten\/diagnose-p1p2\/rohdaten/.test(y) && /if: always\(\)/.test(y), 'Auswertung und Upload');
  pruefe(/status=0/.test(y) && /exit 1/.test(y), 'Gültigkeit macht den Lauf rot (nach dem Sichern)');
});

test('Doc: Vorabfestlegung nennt Nenner, Rangklassen, Kontrollen und den Abgleich; keine Folgeentscheidung', () => {
  const d = fs.readFileSync(path.join(wurzel, 'docs/diagnose-p2-rang.md'), 'utf8');
  for (const s of ['N_gültig', 'Pässe', 'fehlend', '> 32', 'nicht gelistet', 'KEIN URTEIL', 'Kontrolle', '70 %', 'Vorgabe', 'top_moves', 'Go']) pruefe(d.includes(s), 'Doc enthält: ' + s);
  pruefe(/keine (automatische )?Folgeentscheidung/i.test(d), 'keine Folgeentscheidung');
  pruefe(/noch nicht gelaufen/i.test(d), 'Status: noch nicht gelaufen');
});

laufeTests('Diagnose P2-Rang').then(ok => process.exit(ok ? 0 : 1));
