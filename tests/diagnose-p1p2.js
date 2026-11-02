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
  const erg = await P2.lauf('test', path.join(wurzel, ARCH), {html: HTML, partien: 1, wiederhole: 1, gnugo: stub, stufe: 10, bis: 100, aus: path.join(tmp, 'p2.jsonl')});
  pruefeGleich(erg.length, 1, 'Partien'); const p = erg[0];
  pruefe(p.reproduziert, 'reproduziert'); pruefeGleich(p.wiederholung, 'gleich', 'Wiederholung');
  pruefe(p.stellungen.length >= 4 && p.stellungen.every(s => s.mc >= 80 && s.mc <= 100), 'Stellungen im Fenster bis Zug 100: ' + p.stellungen.length);
  pruefe(p.stellungen.some(s => s.g === R.vonGtp('D4')) && p.stellungen.some(s => s.g === -1), 'Antworten durchgereicht, Pass erkennbar');
  pruefeGleich(fs.readFileSync(path.join(tmp, 'p2.jsonl'), 'utf8').trim().split('\n').length, 1, 'JSONL-Zeilen');
});

test('Workflow: nur von Hand, Matrix = Dokument, ohne Eingaben, ubuntu-24.04', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagnose-p1p2.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs/diagnose-p1p2.md'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y), 'nur workflow_dispatch');
  pruefe(!/^\s*(push|pull_request|schedule):/m.test(y), 'kein Auslöser außer von Hand');
  pruefe(!/inputs:/.test(y), 'keine Eingaben');
  pruefe(!/ubuntu-latest/.test(y) && /ubuntu-24\.04/.test(y), 'Runner ubuntu-24.04');
  const namen = [...y.matchAll(/\{name: ([\w-]+), datei: ([^}]+)\}/g)];
  pruefeGleich(namen.length, 4, 'vier Archive');
  for (const [, n, d] of namen) {
    pruefe(doc.includes('`' + n + '`') && doc.includes(d.trim()), 'Doc nennt ' + n);
    pruefe(fs.existsSync(path.join(wurzel, d.trim())), 'Archiv vorhanden: ' + d);
  }
  pruefe(/--partien 40 --wiederhole 3/.test(y), 'P2-Umfang wie im Dokument');
});

test('Belege im Repo: Abgleich nennt die drei Commits; Reproduktion vollständig und ohne Abweichung', () => {
  const ab = fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/abgleich.txt'), 'utf8');
  for (const sha of ['443724e6831677ab15a64e909bfec072a253f7ef', 'e40d82eb140099701d7fc4f275be275e06c374d6', '0a03266149fad3833cc254f3b08b547f4ff4b07e'])
    pruefe(ab.includes(sha), 'abgleich.txt nennt ' + sha);
  const rp = fs.readFileSync(path.join(wurzel, 'docs/daten/diagnose-p1p2/reproduktion.txt'), 'utf8');
  pruefe(/Gesamt: 20 von 20 Partien, 2000 von 2000 KI-Zügen, Wurzelkinder = erste 16 nach dem Netz in 1200 von 1200 Netzzügen/.test(rp), 'Reproduktion vollständig');
  pruefe(!/ABWEICHUNGEN/.test(rp), 'keine Abweichungen');
});

laufeTests('Diagnose P1/P2').then(ok => process.exit(ok ? 0 : 1));
