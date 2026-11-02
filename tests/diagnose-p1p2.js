// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagnose P1/P2 (docs/diagnose-p1p2.md). Geprüft, ohne GNU Go:
     1. Messanker im Quelltext kommen genau einmal vor; fehlt einer, bricht das Laden ab.
     2. Nachspielen einer Archivpartie bis Zug 100: keine Abweichung, Netz ab Zug 81,
        Wurzelkinder = erste 16 der Liste nach dem Netz; falscher Seed → Abweichung.
     3. Auswahlregeln P2 (40 Partien je Archiv, 30 Stellungen je Partie).
     4. P2-Auswertung und Gültigkeit (inkl. „keine Zusatzkandidaten bleibt gültig“).
     5. P1-Buchung, Identität und Gültigkeit mit gebauten Daten.
     6. Ende-zu-Ende `lauf` mit eigenem GTP-Ersatz (kein GNU Go) bis Zug 100.
     7. Workflow nur von Hand; Matrix = Dokument; vorhandene Belege im Repo.
   Aufruf:  node tests/diagnose-p1p2.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const R = require('../auswertung/diagnose/wurzel-replay.js');
const P2 = require('../auswertung/diagnose/p2-kandidaten.js');
const P1 = require('../auswertung/diagnose/p1-buchung.js');
const EW = require('../auswertung/diagnose/erwartet.js');
const {plan} = require('../auswertung/diagnose/plan.js');
const wurzel = path.join(__dirname, '..');
const HTML = path.join(wurzel, 'index.html');
const ARCH = 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz';
const rows = () => R.lies(path.join(wurzel, ARCH));
let _E = null; const engine = () => _E || (_E = R.ladeEngine(HTML));
const sortiert = a => a.slice().sort((x, y) => x - y).join(',');

test('Messanker: jeder kommt im heutigen Quelltext genau einmal vor, fehlender Anker bricht ab', () => {
  const html = fs.readFileSync(HTML, 'utf8'), w = new RegExp('<script id="worker-ai">([\\s\\S]*?)</script>').exec(html)[1];
  for (const [alt] of R.ANKER) pruefeGleich(w.split(alt).length - 1, 1, 'Anker ' + alt.trim().slice(0, 40));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anker-')), f = path.join(tmp, 'index.html');
  fs.writeFileSync(f, html.replace(R.ANKER[0][0], '      /* weg */'));
  let fehler = null; try { R.ladeEngine(f); } catch (e) { fehler = e.message; }
  pruefe(fehler && /Messanker 0× statt 1×/.test(fehler), 'fehlender Anker muss das Laden abbrechen: ' + fehler);
});

test('Nachspielen bis Zug 100: keine Abweichung, Netz ab Zug 81, Wurzelkinder = erste 16 nach dem Netz', () => {
  const p = rows().find(x => x.nr === 2), r = R.replay(engine(), p, {bis: 100});
  pruefe(!r.abweichung, 'Abweichung: ' + JSON.stringify(r.abweichung));
  pruefe(r.zuege.length >= 49, 'zu wenige KI-Züge: ' + r.zuege.length);
  pruefe(r.zuege.every(z => z.gleich), 'alle KI-Züge gleich dem Archiv');
  const spaet = r.zuege.filter(z => z.mc >= 80), frueh = r.zuege.filter(z => z.mc < 80);
  pruefe(spaet.length > 0 && spaet.every(z => z.netz), 'Netz ab Zug 81 an');
  pruefe(frueh.every(z => !z.netz), 'Netz vor Zug 81 aus');
  for (const z of spaet) pruefeGleich(sortiert(z.kids), sortiert(z.nach.slice(0, 16)), 'Kinder = erste 16 nach dem Netz (mc ' + z.mc + ')');
});

test('Falscher Seed → Abweichung wird erkannt (Partie zählt dann nicht)', () => {
  const p = Object.assign({}, rows().find(x => x.nr === 2), {seed: 12345}), r = R.replay(engine(), p, {bis: 100});
  pruefe(!!r.abweichung, 'Abweichung fehlt trotz falschem Seed');
});

test('P2-Auswahl: 40 Partien je Archiv, 30 Stellungen je Partie im Fenster Zug 81..200, jeder zweite KI-Zug', () => {
  for (const [datei, erste] of [['docs/daten/leeres-brett/lauf1/g-D.jsonl.gz', 12], ['docs/daten/fuego-siege/lauf1/D.jsonl.gz', 24]]) {
    const s = P2.waehleSpiele(R.lies(path.join(wurzel, datei)));
    pruefeGleich(s.length, 40, datei + ': Partien');
    pruefeGleich(s[0].nr, erste, datei + ': erste Partie');
    for (const p of s.slice(0, 4)) {
      const m = P2.waehleStellungen(p);
      pruefeGleich(m.length, 30, 'Stellungen');
      pruefe(m.every(mc => mc >= 80 && mc <= 199), 'Fenster');
      pruefe(m.every(mc => mc % 2 === (p.wirFarbe === 'S' ? 0 : 1)), 'nur KI-Züge');
      pruefe(m.every((mc, i) => i === 0 || mc - m[i - 1] === 4), 'jeder zweite KI-Zug');
    }
  }
});

const stell = (o) => Object.assign({mc: 100, gespielt: 5, g: 7, vor: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], nach: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], kids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], netz: true}, o);
test('P2-Kennzahlen je Stellung: in Kindern, nur durch das Netz, verloren, Pass, keine Antwort', () => {
  let a = P2.stellungAuswerten(stell({}));
  pruefe(a.inKids && a.inKidsOhneNetz && !a.nurDurchNetz && !a.verlorenDurchNetz && a.rangVor === 7 && !a.gleichGespielt, 'im Normalfall');
  a = P2.stellungAuswerten(stell({g: 20, vor: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20], nach: [20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], kids: [20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]}));
  pruefe(a.inKids && a.nurDurchNetz && !a.inKidsOhneNetz && a.netzAenderteKinder, 'nur durch das Netz');
  a = P2.stellungAuswerten(stell({g: 3, kids: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 30]}));
  pruefe(!a.inKids && a.inKidsOhneNetz && a.verlorenDurchNetz, 'durch das Netz verloren');
  a = P2.stellungAuswerten(stell({g: -1})); pruefe(a.antwort && a.pass, 'Pass');
  a = P2.stellungAuswerten(stell({g: null})); pruefe(a.antwort === false, 'keine Antwort');
});

function partieRec(archiv, nr, o = {}) {
  return Object.assign({archiv, nr, reproduziert: true, stellungen: [stell({}), stell({g: 3}), stell({g: -1})]}, o);
}
const archivMit = (name, n, o) => Array.from({length: n}, (_, i) => partieRec(name, i, o));

test('P2-Auswertung: Mittel je Partie, Pass nicht gezählt; Bericht nennt Pässe', () => {
  const ps = archivMit('A', 40), a = P2.auswerten(ps);
  pruefeGleich(a.partien, 40, 'Partien'); pruefeGleich(a.stellungen, 80, 'Stellungen (ohne Pass)');
  pruefeGleich(a.inKids.proPartie, 1, 'Anteil in Kindern');
  const b = P2.bericht(ps);
  pruefe(b.gueltig, 'gültig: ' + b.gruende.join('; '));
  pruefe(/GNU Go passt in 40 Stellungen/.test(b.text), 'Passfälle getrennt ausgewiesen');
});

test('P2-Gültigkeit: zweiwertig; zu wenig Reproduktion, kein Netz, GNU-Go-Ausfälle, Wiederholung → KEIN URTEIL', () => {
  pruefe(P2.gueltigkeit(archivMit('A', 40), {A: archivMit('A', 40)}).gueltig, 'Grundfall gültig');
  const nurWenige = archivMit('A', 35), g1 = P2.gueltigkeit(nurWenige, {A: nurWenige});
  pruefe(!g1.gueltig && /nur 35 Partien/.test(g1.gruende.join()), 'zu wenige Partien');
  const rep = archivMit('A', 40).map((p, i) => i < 3 ? Object.assign(p, {reproduziert: false}) : p), g2 = P2.gueltigkeit(rep, {A: rep});
  pruefe(!g2.gueltig && /exakt reproduziert/.test(g2.gruende.join()), 'unter 95 % reproduziert');
  const ohneNetz = archivMit('A', 40); ohneNetz[0].stellungen[0].netz = false;
  pruefe(!P2.gueltigkeit(ohneNetz, {A: ohneNetz}).gueltig, 'Netz nicht ausgeführt');
  const ausfall = archivMit('A', 40).map(p => Object.assign(p, {stellungen: p.stellungen.map(s => Object.assign({}, s, {g: null}))}));
  pruefe(!P2.gueltigkeit(ausfall, {A: ausfall}).gueltig, 'GNU Go antwortet nicht');
  const wdh = archivMit('A', 40); wdh[0].wiederholung = 'anders';
  pruefe(!P2.gueltigkeit(wdh, {A: wdh}).gueltig, 'Wiederholung anders');
  const b = P2.bericht(wdh); pruefe(/KEIN URTEIL/.test(b.text) && !b.gueltig, 'Bericht: KEIN URTEIL');
});

test('P2: null Zusatzkandidaten durch das Netz macht den Lauf nicht ungültig', () => {
  const ps = archivMit('A', 40, {stellungen: [stell({}), stell({g: 3})]});
  const a = P2.auswerten(ps);
  pruefeGleich(a.nurDurchNetz.gepoolt, 0, 'keine Zusatzkandidaten'); pruefeGleich(a.netzAenderteKinder.gepoolt, 0, 'Kinder unverändert');
  pruefe(P2.gueltigkeit(ps, {A: ps}).gueltig, 'bleibt gültig');
});

function art(a100, a200, uebergaenge) { return {uebergaenge: {'100-200': uebergaenge}, stand: {100: {arten: a100, zaehlung: 0}, 200: {arten: a200, zaehlung: 0}}}; }
test('P1-Buchung: sieben Posten, Summe = Veränderung der Zählung (Identität)', () => {
  const a100 = {'KI-Stein': 100, 'KI-Gebiet': 60, 'neutral': 40, 'GG-Stein': 90, 'GG-Gebiet': 71};
  const a200 = {'KI-Stein': 70, 'KI-Gebiet': 50, 'neutral': 40, 'GG-Stein': 100, 'GG-Gebiet': 101};
  const b = P1.buchen(art(a100, a200, {'KI-Stein>GG-Gebiet': 20, 'KI-Stein>neutral': 10, 'KI-Gebiet>GG-Gebiet': 10, 'neutral>GG-Stein': 10, 'KI-Stein>KI-Stein': 70}));
  pruefeGleich(b.sonstige, 0, 'keine sonstigen'); pruefeGleich(b.summe, b.delta, 'Identität');
  pruefeGleich(b.posten.eigeneSteineSterben, -40 - 10, 'Posten eigene Steine');
  pruefeGleich(b.posten.eigenesGebietVerloren, -20, 'Posten eigenes Gebiet');
  pruefeGleich(b.posten.neutralAnGG, -10, 'Posten neutral an GNU Go');
  pruefeGleich(b.felder100, 361, 'Felder 100'); pruefeGleich(b.felder200, 361, 'Felder 200'); pruefeGleich(b.delta, -80, 'Veränderung der Zählung');
});

test('P1-Gültigkeit: Identität, sonstige Wechsel, unvollständige Zählung, Auswertungsquote, Wiederholung', () => {
  const gut = {buchung: {posten: {}, sonstige: 0, summe: -5, delta: -5, felder100: 361, felder200: 361}, archiv: 'A', geeignet: 10};
  const ps = n => Array.from({length: n}, () => Object.assign({}, gut));
  pruefe(P1.gueltigkeit(ps(10)).gueltig, 'Grundfall');
  const a = ps(10); a[0] = Object.assign({}, gut, {buchung: Object.assign({}, gut.buchung, {summe: -4})});
  pruefe(!P1.gueltigkeit(a).gueltig, 'Identität verletzt');
  const b = ps(10); b[0] = Object.assign({}, gut, {buchung: Object.assign({}, gut.buchung, {sonstige: 2})});
  pruefe(!P1.gueltigkeit(b).gueltig, 'sonstige Wechsel');
  const c = ps(10); c[0] = Object.assign({}, gut, {buchung: Object.assign({}, gut.buchung, {felder200: 360})});
  pruefe(!P1.gueltigkeit(c).gueltig, 'unvollständig');
  const d = ps(10); d[0] = Object.assign({}, gut, {buchung: null});
  pruefe(!P1.gueltigkeit(d).gueltig, 'weniger als 98 % ausgewertet');
  const e = ps(10); e[0].wiederholung = 'anders';
  pruefe(!P1.gueltigkeit(e).gueltig, 'Wiederholung');
  pruefe(/KEIN URTEIL/.test(P1.bericht(e).text), 'Bericht: KEIN URTEIL');
});

test('Ende-zu-Ende lauf mit GTP-Ersatz bis Zug 100: Stellungen, Wiederholung, Passantwort getrennt', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gtp-')), stub = path.join(tmp, 'gnugo');
  fs.writeFileSync(stub, '#!/usr/bin/env node\nlet n=0;process.stdin.on("data",d=>{for(const z of d.toString().split("\\n").filter(Boolean)){if(z==="quit")process.exit(0);let a="=";if(z.startsWith("reg_genmove"))a="= "+(++n%5===0?"PASS":"D4");process.stdout.write(a+"\\n\\n");}});\n', {mode: 0o755});
  const meld = [];
  const erg = await P2.lauf('test', path.join(wurzel, ARCH), {html: HTML, partien: 1, wiederhole: 1, gnugo: stub, stufe: 10, bis: 100, aus: path.join(tmp, 'p2.jsonl'), log: t => meld.push(t)});
  pruefe(meld.some(t => /Fortschritt P2 test: 1 von 1 Partien erledigt, 0 verbleibend/.test(t)), 'Fortschrittszeile P2: ' + meld.join(' | '));
  pruefeGleich(erg.length, 1, 'Partien'); const p = erg[0];
  pruefe(p.reproduziert, 'reproduziert'); pruefeGleich(p.wiederholung, 'gleich', 'Wiederholung');
  pruefe(p.stellungen.length >= 4 && p.stellungen.every(s => s.mc >= 80 && s.mc <= 100), 'Stellungen im Fenster bis Zug 100: ' + p.stellungen.length);
  pruefe(p.stellungen.some(s => s.g === R.vonGtp('D4')) && p.stellungen.some(s => s.g === -1), 'Antworten durchgereicht, Pass erkennbar');
  pruefeGleich(fs.readFileSync(path.join(tmp, 'p2.jsonl'), 'utf8').trim().split('\n').length, 1, 'JSONL-Zeilen');
  /* Fortsetzen: die erfasste Partie wird nicht noch einmal nachgespielt */
  const t0 = Date.now(), meld2 = [];
  const erg2 = await P2.lauf('test', path.join(wurzel, ARCH), {html: HTML, partien: 1, wiederhole: 1, gnugo: '/gibt/es/nicht', stufe: 10, bis: 100, aus: path.join(tmp, 'p2.jsonl'), fortsetzen: true, log: t => meld2.push(t)});
  pruefeGleich(erg2.length, 1, 'Fortsetzen: eine Partie'); pruefe(meld2[0].includes('1 schon erfasst'), 'Fortsetzen meldet schon erfasst'); pruefe(Date.now() - t0 < 4000, 'nicht neu gerechnet');
  pruefeGleich(fs.readFileSync(path.join(tmp, 'p2.jsonl'), 'utf8').trim().split('\n').length, 1, 'JSONL-Zeilen nach Fortsetzen');
});

test('Workflow: nur von Hand, Eingaben neu/vorlauf/fortsetzen_aus, Schritt-Zeitlimit kürzer als Job, Upload mit always()', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagnose-p1p2.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y), 'nur workflow_dispatch');
  pruefe(!/^\s*(push|pull_request|schedule):/m.test(y), 'kein Auslöser außer von Hand');
  for (const e of ['neu', 'vorlauf', 'fortsetzen_aus']) pruefe(new RegExp('^      ' + e + ':', 'm').test(y), 'Eingabe ' + e);
  pruefe(!/ubuntu-latest/.test(y) && /ubuntu-24\.04/.test(y), 'Runner ubuntu-24.04');
  pruefe(/actions: read/.test(y), 'actions: read für den Abruf früherer Läufe');
  /* Rechenschritte: eigenes Zeitlimit, kürzer als das des Jobs; danach Upload mit always() */
  for (const job of ['p1', 'p2']) {
    const kopf = new RegExp('^  ' + job + ':\\n([\\s\\S]*?)(?=^  \\w+:\\n|$(?![\\s\\S]))', 'm').exec(y)[1];
    const jobMin = +/^    timeout-minutes: (\d+)/m.exec(kopf)[1], schrittMin = +/^        timeout-minutes: (\d+)/m.exec(kopf)[1];
    pruefe(schrittMin < jobMin, `${job}: Schritt-Zeitlimit ${schrittMin} < Job-Zeitlimit ${jobMin}`);
    pruefe(/upload-artifact@v7\n        if: always\(\)/.test(kopf), job + ': Upload mit always()');
    pruefe(kopf.indexOf('timeout-minutes: ' + schrittMin) < kopf.indexOf('upload-artifact'), job + ': Upload nach dem Rechenschritt');
    pruefe(/--fortsetzen/.test(kopf), job + ': Rechenschritt mit --fortsetzen');
  }
  pruefe(/--partien 40 --wiederhole 3/.test(y), 'P2-Umfang wie im Dokument');
  const probe = fs.readFileSync(path.join(wurzel, '.github/workflows/diagnose-timeout-probe.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(probe) && /timeout-minutes: 1\n/.test(probe) && /if: always\(\)/.test(probe), 'Probe: von Hand, Schritt mit Zeitlimit, Upload always()');
});

test('Erwartete Archive: vier, Doc nennt Namen und Pfade, Dateien vorhanden', () => {
  const doc = fs.readFileSync(path.join(wurzel, 'docs/diagnose-p1p2.md'), 'utf8');
  pruefeGleich(EW.ARCHIVE.length, 4, 'vier Archive');
  for (const a of EW.ARCHIVE) {
    pruefe(doc.includes('`' + a.name + '`') && doc.includes(a.datei), 'Doc nennt ' + a.name);
    pruefe(fs.existsSync(path.join(wurzel, a.datei)), 'Archiv vorhanden: ' + a.datei);
  }
});

const zeilen = n => Array.from({length: n}, (_, i) => ({nr: i, zuege: new Array(200).fill('D4'), wirFarbe: 'S'}));
test('Plan: Pakete zu 120 Partien (480 → 4, 960 → 8), neu/alt getrennt, unbekanntes Archiv bricht ab', () => {
  const lies = d => zeilen(/fuego-siege/.test(d) ? 960 : 480);
  const p = plan('fuego-siege-D', 120, lies);
  pruefeGleich(p.p1.length, 8, 'Pakete fuego-siege-D'); pruefeGleich(p.p2.length, 1, 'P2-Jobs');
  pruefeGleich(p.p1[7].dateiname, 'p1-fuego-siege-D-08', 'Name des letzten Pakets'); pruefeGleich(p.alt.join(), 'leeres-brett-g-D,muster-ohne-vorgabe-g-D,muster-ohne-vorgabe-f-D', 'übernommen');
  const alle = plan('alle', 120, lies);
  pruefeGleich(alle.p1.length, 4 * 3 + 8, 'alle Pakete'); pruefeGleich(alle.alt.length, 0, 'nichts übernommen'); pruefeGleich(alle.p2.length, 4, 'vier P2-Jobs');
  let fehler = null; try { plan('gibts-nicht', 120, lies); } catch (e) { fehler = e.message; }
  pruefe(fehler && /Unbekanntes Archiv/.test(fehler), 'unbekanntes Archiv');
});

test('Doppelte Einträge: ein brauchbarer geht vor einem fehlgeschlagenen', () => {
  const r = EW.entdoppeln([{archiv: 'A', nr: 1, fehler: 'x'}, {archiv: 'A', nr: 1, buchung: {}}, {archiv: 'A', nr: 2, buchung: {}}, {archiv: 'A', nr: 2, buchung: {}}, {archiv: 'B', nr: 1, buchung: {}}]);
  pruefeGleich(r.length, 3, 'drei verschiedene Partien'); pruefe(!!r.find(x => x.archiv === 'A' && x.nr === 1).buchung, 'brauchbarer Eintrag bleibt');
});

const einfach = () => art({'KI-Stein': 10, 'GG-Stein': 351}, {'KI-Stein': 10, 'GG-Stein': 351}, {'KI-Stein>KI-Stein': 10});
test('P1-Pakete und Fortsetzen: nur das eigene Paket, Fortschrittszeilen, Fortsetzen überspringt Gebuchtes und wiederholt Fehler', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-')), datei = path.join(tmp, 'a.jsonl'), aus = path.join(tmp, 'p1.jsonl');
  fs.writeFileSync(datei, zeilen(5).map(r => JSON.stringify(r)).join('\n') + '\n');
  const meldungen = [], aufrufe = []; const log = t => meldungen.push(t);
  const analysiere = async p => { aufrufe.push(p.nr); return einfach(); };
  const e1 = await P1.lauf('T', datei, {aus, paket: 2, groesse: 2, analysiere, log});
  pruefeGleich(e1.partien, 2, 'Paket 2 hat 2 Partien'); pruefeGleich(aufrufe.filter((n, i, a) => a.indexOf(n) === i).sort().join(), '2,3', 'nur Partien 2 und 3');
  pruefe(meldungen.some(t => /Fortschritt P1 T, Paket 2 von 3: 2 von 2 Partien erledigt, 0 verbleibend/.test(t)), 'Fortschrittszeile: ' + meldungen.join(' | '));
  pruefe(meldungen[0].includes('Archiv: 5 geeignet'), 'Kopfzeile nennt das Archiv');
  /* Abbruch: halbe letzte Zeile und ein fehlgeschlagener Eintrag, dann Fortsetzen */
  const recs = fs.readFileSync(aus, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  fs.writeFileSync(aus, JSON.stringify(recs[0]) + '\n' + JSON.stringify({archiv: 'T', nr: 3, geeignet: 5, fehler: 'abgebrochen'}) + '\n{"archiv":"T","nr":');
  aufrufe.length = 0;
  const e2 = await P1.lauf('T', datei, {aus, paket: 2, groesse: 2, analysiere, fortsetzen: true, log});
  pruefe(aufrufe.every(n => n === 3) && aufrufe.length >= 1, 'nur Partie 3 neu gerechnet: ' + aufrufe);
  pruefeGleich(e2.gebucht, 2, 'beide gebucht'); const zeilen2 = fs.readFileSync(aus, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  pruefeGleich(zeilen2.length, 2, 'zwei Zeilen, keine doppelten'); pruefe(zeilen2.every(r => r.buchung), 'alle mit Buchung');
  /* Ohne --fortsetzen wird neu geschrieben */
  const e3 = await P1.lauf('T', datei, {aus, paket: 3, groesse: 2, analysiere, log}); pruefeGleich(e3.partien, 1, 'Paket 3 hat 1 Partie');
});

test('P1: Abbruch mit SIGKILL mitten im Paket verliert höchstens die laufende Partie, Fortsetzen rechnet den Rest', async () => {
  const {spawn} = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p1k-')), datei = path.join(tmp, 'a.jsonl'), aus = path.join(tmp, 'p1.jsonl');
  fs.writeFileSync(datei, zeilen(8).map(r => JSON.stringify(r)).join('\n') + '\n');
  const skript = path.join(tmp, 'kind.js');
  fs.writeFileSync(skript, `const P1=require(${JSON.stringify(path.join(wurzel, 'auswertung/diagnose/p1-buchung.js'))});
const e={uebergaenge:{'100-200':{'KI-Stein>KI-Stein':10}},stand:{100:{arten:{'KI-Stein':10,'GG-Stein':351},zaehlung:0},200:{arten:{'KI-Stein':10,'GG-Stein':351},zaehlung:0}}};
P1.lauf('T',${JSON.stringify(datei)},{aus:${JSON.stringify(aus)},fortsetzen:true,log:()=>{},analysiere:()=>new Promise(r=>setTimeout(()=>r(e),150))});`);
  const kind = spawn(process.execPath, [skript], {stdio: 'ignore'});
  await new Promise(r => setTimeout(r, 1100)); kind.kill('SIGKILL'); await new Promise(r => kind.on('exit', r));
  const vorher = fs.readFileSync(aus, 'utf8').split('\n').filter(Boolean);
  pruefe(vorher.length >= 2 && vorher.length < 8, 'Teilstand gesichert: ' + vorher.length + ' von 8');
  const aufrufe = new Set();
  await P1.lauf('T', datei, {aus, fortsetzen: true, log: () => {}, analysiere: async p => { aufrufe.add(p.nr); return einfach(); }});
  const nachher = fs.readFileSync(aus, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  pruefeGleich(nachher.filter(r => r.buchung).length, 8, 'alle 8 gebucht'); pruefeGleich(aufrufe.size, 8 - vorher.length, 'nur der Rest neu gerechnet');
});

test('Vollständigkeit P1/P2: fehlendes Archiv oder fehlendes Paket macht den Bericht ungültig (Exit 1), vollständig ist gültig (Exit 0)', () => {
  const {spawnSync} = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voll-'));
  const p1rec = (a, nr) => ({archiv: a, nr, geeignet: 10, buchung: {posten: {}, sonstige: 0, summe: 0, delta: 0, felder100: 361, felder200: 361}});
  const schreib = (f, recs) => { fs.writeFileSync(f, recs.map(r => JSON.stringify(r)).join('\n') + '\n'); return f; };
  const lauf = (skript, ...a) => spawnSync(process.execPath, [path.join(wurzel, 'auswertung/diagnose', skript), '--bericht', ...a], {encoding: 'utf8'});
  const alle1 = EW.NAMEN.flatMap(a => Array.from({length: 10}, (_, i) => p1rec(a, i)));
  let r = lauf('p1-buchung.js', schreib(path.join(tmp, 'a.jsonl'), alle1), schreib(path.join(tmp, 'a2.jsonl'), alle1));   /* doppelte Zeilen: werden entdoppelt */
  pruefeGleich(r.status, 0, 'P1 vollständig: ' + r.stdout.slice(0, 300));
  r = lauf('p1-buchung.js', schreib(path.join(tmp, 'b.jsonl'), alle1.filter(x => x.archiv !== 'fuego-siege-D')));
  pruefe(r.status === 1 && /fuego-siege-D: Archiv fehlt vollständig/.test(r.stdout) && /KEIN URTEIL/.test(r.stdout), 'P1 ohne ein Archiv ungültig');
  r = lauf('p1-buchung.js', schreib(path.join(tmp, 'c.jsonl'), alle1.filter(x => !(x.archiv === 'fuego-siege-D' && x.nr >= 5))));
  pruefe(r.status === 1 && /nur 5 von 10 geeigneten Partien/.test(r.stdout), 'P1 mit fehlendem Teil ungültig');
  const alle2 = EW.NAMEN.flatMap(a => archivMit(a, 40));
  r = lauf('p2-kandidaten.js', schreib(path.join(tmp, 'd.jsonl'), alle2));
  pruefeGleich(r.status, 0, 'P2 vollständig: ' + r.stdout.slice(0, 300));
  r = lauf('p2-kandidaten.js', schreib(path.join(tmp, 'e.jsonl'), alle2.filter(x => x.archiv !== 'muster-ohne-vorgabe-f-D')));
  pruefe(r.status === 1 && /muster-ohne-vorgabe-f-D: Archiv fehlt vollständig/.test(r.stdout), 'P2 ohne ein Archiv ungültig');
  pruefe(!P2.gueltigkeit(archivMit('A', 40), {A: archivMit('A', 40)}, ['A', 'B']).gueltig, 'gueltigkeit() mit erwartet');
});

test('Belege im Repo: Abgleich nennt die drei Commits; Reproduktion vollständig und ohne Abweichung', () => {
  const ab = fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/abgleich.txt'), 'utf8');
  for (const sha of ['443724e6831677ab15a64e909bfec072a253f7ef', 'e40d82eb140099701d7fc4f275be275e06c374d6', '0a03266149fad3833cc254f3b08b547f4ff4b07e'])
    pruefe(ab.includes(sha), 'abgleich.txt nennt ' + sha);
  const rp = fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/reproduktion.txt'), 'utf8');
  pruefe(/Gesamt: 20 von 20 Partien, 2000 von 2000 KI-Zügen, Wurzelkinder = erste 16 nach dem Netz in 1200 von 1200 Netzzügen/.test(rp), 'Reproduktion vollständig');
  pruefe(!/ABWEICHUNGEN/.test(rp), 'keine Abweichungen');
  for (const f of ['p1.md', 'p2.md']) pruefe(/Lauf gültig/.test(fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2', f), 'utf8')), f + ': Ergebnis des Laufs 41480291668 gültig');
  pruefe(/p1=0 p2=0/.test(fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/status.txt'), 'utf8')), 'status.txt');
});

test('Rohdaten sichern: verlustfrei, nicht gebuchte Partien dokumentiert, Probleme führen zu Exit 1', () => {
  const {spawnSync} = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sich-')), roh = path.join(tmp, 'roh'), aus = path.join(tmp, 'aus');
  const rec = (a, nr, o = {}) => Object.assign({archiv: a, nr, geeignet: 4, buchung: {posten: {}}}, o);
  for (const n of EW.NAMEN) {
    fs.mkdirSync(path.join(roh, n), {recursive: true});
    const p1 = [rec(n, 1, {wiederholung: 'gleich'}), rec(n, 2), rec(n, 3), n === 'fuego-siege-D' ? {archiv: n, nr: 4, geeignet: 4, fehler: 'GNU Go beendet (1, null) | zweite Zeile'} : rec(n, 4)];
    fs.writeFileSync(path.join(roh, n, `p1-${n}.jsonl`), p1.map(r => JSON.stringify(r)).join('\n') + '\n');
    fs.writeFileSync(path.join(roh, n, `p2-${n}.jsonl`), [{archiv: n, nr: 12, reproduziert: true, stellungen: [{mc: 80}, {mc: 84}]}].map(r => JSON.stringify(r)).join('\n') + '\n');
  }
  fs.writeFileSync(path.join(roh, 'artifacts.json'), JSON.stringify({artifacts: [{name: 'diagnose-fuego-siege-D', id: 7, digest: 'sha256:abc', created_at: 'x', expires_at: 'y'}]}));
  const lauf = () => spawnSync(process.execPath, [path.join(wurzel, 'auswertung/diagnose/rohdaten-sichern.js'), '--roh', roh, '--aus', aus, '--run', '123'], {encoding: 'utf8'});
  let r = lauf(); pruefeGleich(r.status, 0, 'Exit 0: ' + r.stdout + r.stderr);
  const man = JSON.parse(fs.readFileSync(path.join(aus, 'manifest.json'), 'utf8'));
  pruefeGleich(man.archive['fuego-siege-D'].p1.nicht_gebucht.join(), '4', 'nicht gebuchte Nr.'); pruefeGleich(man.archive['fuego-siege-D'].artefakt.digest, 'sha256:abc', 'Digest');
  pruefeGleich(man.archive['leeres-brett-g-D'].p1.gebucht, 4, 'gebucht'); pruefeGleich(man.archive['leeres-brett-g-D'].p2.stellungen, 2, 'Stellungen');
  const quelle = fs.readFileSync(path.join(roh, 'fuego-siege-D', 'p1-fuego-siege-D.jsonl'));
  pruefe(require('zlib').gunzipSync(fs.readFileSync(path.join(aus, 'fuego-siege-D', 'p1.jsonl.gz'))).equals(quelle), 'verlustfrei');
  const md = fs.readFileSync(path.join(aus, 'fehlgeschlagen-p1.md'), 'utf8');
  pruefe(/Gesamt: 1 Partien/.test(md) && /fuego-siege-D \| 4 \|/.test(md) && md.includes('GNU Go beendet (1, null) / zweite Zeile'), 'Dokumentation der nicht gebuchten Partie: ' + md);
  fs.unlinkSync(path.join(roh, 'muster-ohne-vorgabe-f-D', 'p2-muster-ohne-vorgabe-f-D.jsonl'));
  r = lauf(); pruefe(r.status === 1 && /Quelldatei fehlt/.test(r.stderr), 'fehlende Quelle → Exit 1');
});

test('Sicherungs-Workflow: nur von Hand, schreibt nur auf neuen Zweig claude/, nie auf main, nie Force', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagnose-sichern.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y) && !/^\s*(push|pull_request|schedule):/m.test(y), 'nur workflow_dispatch');
  pruefe(/refs\/heads\/\$zweig/.test(y) && /zweig="claude\/diagnose-rohdaten-/.test(y), 'Zweig claude/diagnose-rohdaten-<lauf>');
  pruefe(!/--force|git push -f|push origin main|refs\/heads\/main/.test(y), 'kein Force, kein main');
  pruefe(/rohdaten-sichern\.js/.test(y) && !/p1-buchung\.js|p2-kandidaten\.js|gnugo/i.test(y), 'keine Neuberechnung, kein GNU Go');
  for (const f of ['diagnose-p1p2.yml', 'diagnose-timeout-probe.yml']) pruefe(!/contents: write/.test(fs.readFileSync(path.join(wurzel, '.github/workflows', f), 'utf8')), f + ' ohne Schreibrecht');
});

test('P1-Posten heißen „Gegner“, nicht „GNU Go“ (gilt auch für die Fuego-Archive); P2 behält GNU Go als Referenz', () => {
  for (const [k, titel] of P1.POSTEN.map(p => [p[0], p[1]])) pruefe(!/GNU/.test(titel), 'Posten ' + k + ': ' + titel);
  const md = fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/p1.md'), 'utf8'), doc = fs.readFileSync(path.join(wurzel, 'docs/diagnose-p1p2.md'), 'utf8');
  const p1Doc = doc.slice(doc.indexOf('### P1: Buchung zwischen Zug 100 und 200'), doc.indexOf('### P2: Kandidatenabdeckung'));
  pruefe(!/GNU-Go-Steine|an GNU Go −|von GNU Go zurück/.test(p1Doc + md.split('Quelle:')[0]), 'P1-Posten in Doc und Bericht ohne GNU Go');
  pruefe(/an den Gegner/.test(md) && /vom Gegner zurückgewonnen/.test(md) && /tote Gegner-Steine/.test(md), 'Gegner-Bezeichnungen im Bericht');
  pruefe(/GNU Go Stufe 10, `reg_genmove`/.test(doc), 'P2-Referenz bleibt GNU Go');
});

test('Gesicherte Rohdaten im Repo: alle vier Archive vollständig, die zwei nicht gebuchten P1-Partien dokumentiert', () => {
  const zlib = require('zlib'), dir = path.join(wurzel, 'docs/daten/diagnose-p1p2/rohdaten');
  const soll = {'leeres-brett-g-D': 480, 'muster-ohne-vorgabe-g-D': 480, 'muster-ohne-vorgabe-f-D': 480, 'fuego-siege-D': 960};
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  pruefeGleich(String(man.lauf), '41480291668', 'Lauf im Manifest');
  for (const [n, z] of Object.entries(soll)) {
    const p1 = zlib.gunzipSync(fs.readFileSync(path.join(dir, n, 'p1.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean), p2 = zlib.gunzipSync(fs.readFileSync(path.join(dir, n, 'p2.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean);
    pruefeGleich(p1.length, z, n + ': P1-Zeilen'); pruefeGleich(p2.length, 40, n + ': P2-Zeilen');
    pruefeGleich(man.archive[n].p1.geeignet, z, n + ': geeignet'); pruefeGleich(man.archive[n].p2.reproduziert, 40, n + ': P2 reproduziert');
    pruefeGleich(p1.filter(l => !JSON.parse(l).buchung).length, man.archive[n].p1.nicht_gebucht.length, n + ': nicht gebuchte Partien');
  }
  pruefeGleich(man.archive['fuego-siege-D'].p1.nicht_gebucht.join(), '450,585', 'nicht gebucht');
  const md = fs.readFileSync(path.join(dir, 'fehlgeschlagen-p1.md'), 'utf8'), doc = fs.readFileSync(path.join(wurzel, 'docs/diagnose-p1p2.md'), 'utf8');
  pruefe(/Gesamt: 2 Partien/.test(md) && /SIGSEGV/.test(md) && /\| 450 \|/.test(md) && /\| 585 \|/.test(md), 'Dokumentation der zwei Partien');
  pruefe(/Nr\. 450/.test(doc) && /Nr\. 585/.test(doc) && /SIGSEGV/.test(doc) && !/noch nicht bekannt/.test(doc), 'Doc nennt Nr. und Fehler');
});

test('Doc: Vergleiche nur beschreibend, Begünstigung durch GNU Go als Hypothese gekennzeichnet', () => {
  const doc = fs.readFileSync(path.join(wurzel, 'docs/diagnose-p1p2.md'), 'utf8');
  pruefe(/nur beschreibend, nicht kausal/.test(doc), 'nur beschreibend, nicht kausal');
  pruefe(!/Vergleich der Archive untereinander\s*\n?\s*\(Gegner/.test(doc) && !/nicht zulässig/.test(doc), 'kein „nicht zulässig“ mehr');
  pruefe(/\*\*Hypothese, nicht gemessen:\*\*/.test(doc) && !/nach oben verzerrt/.test(doc), 'Begünstigung als Hypothese');
});

laufeTests('Diagnose P1/P2').then(ok => process.exit(ok ? 0 : 1));
