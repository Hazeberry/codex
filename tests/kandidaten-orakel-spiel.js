// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Kandidaten-Orakel (docs/kandidaten-orakel.md) in echten Stellungen, ohne GNU Go:
     1. Replay einer Archivpartie (Schwarz und Weiß): Arm A mit beliebigem Orakelzug ist bitgleich
        zum Default (Züge, Kinder, Listen); ohne `extra` bleibt alles wie bisher.
     2. Arm S/ZS am ersten Eingriff: Fall d, 17 Kinder, die ersten 16 wie im Default.
     3. Harness mit GTP-Attrappe: A bitgleich zu „ohne Option“, S/ZS gleicher Auslöser,
        Präfix vor dem ersten Eingriff identisch, Option-Validierung.
   Aufruf:  node tests/kandidaten-orakel-spiel.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {execFileSync, spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich} = require('./rahmen');
const R = require('../auswertung/diagnose/wurzel-replay.js');
const wurzel = path.join(__dirname, '..');
const HTML = path.join(wurzel, 'index.html');
const ARCH = path.join(wurzel, 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz');
const rows = () => R.lies(ARCH);
let _E = null; const engine = () => _E || (_E = R.ladeEngine(HTML));
const BIS = 92;

/* Orakelzug g: der Zug, den die KI im Default an dieser Stelle auf Rang 30 der Liste nach dem Netz sieht */
function ohne(nr) { return R.replay(engine(), rows().find(x => x.nr === nr), {bis: BIS}); }
function mitArm(nr, arm, gAus) {
  return R.replay(engine(), rows().find(x => x.nr === nr), {bis: BIS, extra: (mc) => mc >= 80 ? {kandidatenOrakel: {arm, g: gAus(mc)}} : undefined});
}
const gRang30 = ref => mc => { const z = ref.zuege.find(q => q.mc === mc); return z && z.nach ? z.nach[29] : -1; };
const gleichZuege = (a, b, txt) => {
  pruefeGleich(a.zuege.length, b.zuege.length, txt + ': Zahl der Züge');
  a.zuege.forEach((z, k) => {
    const y = b.zuege[k];
    pruefeGleich(z.gewaehlt, y.gewaehlt, `${txt}: Zug mc ${z.mc}`);
    pruefeGleich(JSON.stringify(z.kids), JSON.stringify(y.kids), `${txt}: Kinder mc ${z.mc}`);
    pruefeGleich(JSON.stringify(z.nach), JSON.stringify(y.nach), `${txt}: Liste mc ${z.mc}`);
  });
};

for (const nr of [2, 1]) {
  test(`Replay Partie ${nr} (${nr === 2 ? 'KI Schwarz' : 'KI Weiß'}): Arm A bitgleich zum Default, ohne extra kein Protokoll`, () => {
    const d = ohne(nr);
    pruefe(!d.abweichung, 'Default reproduziert das Archiv: ' + JSON.stringify(d.abweichung));
    pruefe(d.zuege.some(z => z.mc >= 80 && z.netz), 'Netz im Fenster');
    pruefe(d.zuege.every(z => z.prot === null), 'ohne extra: kein Protokoll');
    const a = mitArm(nr, 'A', gRang30(d));
    gleichZuege(a, d, 'A');
    pruefe(a.zuege.filter(z => z.mc >= 80).every(z => z.prot && z.prot.arm === 'A'), 'A: Protokoll im Fenster');
  });
}

test('Replay Partie 2: S und ZS am ersten Eingriff: Fall d, 17 Kinder, erste 16 wie im Default', () => {
  const d = ohne(2), g = gRang30(d);
  for (const arm of ['S', 'ZS']) {
    const x = mitArm(2, arm, g), e = x.zuege.find(z => z.prot && z.prot.fall === 'd');
    pruefe(!!e, arm + ': ein Fall d tritt auf');
    const ref = d.zuege.find(z => z.mc === e.mc);
    pruefeGleich(e.kids.length, 17, arm + ': 17 Kinder');
    pruefeGleich(JSON.stringify(e.kids.slice(0, 16)), JSON.stringify(ref.kids), arm + ': erste 16 Kinder wie Default');
    pruefeGleich(JSON.stringify(e.vor), JSON.stringify(ref.vor), arm + ': Liste vor dem Netz unverändert');
    pruefeGleich(JSON.stringify(e.nach), JSON.stringify(ref.nach), arm + ': Liste nach dem Netz unverändert');
    pruefeGleich(e.kids[16], arm === 'S' ? g(e.mc) : ref.nach[30], arm + ': 17. Kind');
    pruefeGleich(e.prot.r, 30, arm + ': Rang'); pruefe(e.prot.aufgenommen, arm + ': aufgenommen');
    /* bis zum ersten Eingriff identisch zum Default */
    for (const z of x.zuege) { if (z.mc >= e.mc) break; pruefeGleich(z.gewaehlt, d.zuege.find(q => q.mc === z.mc).gewaehlt, `${arm}: Präfix mc ${z.mc}`); }
  }
});

/* ---- Harness mit GTP-Attrappe ---- */
const WERKZEUG = path.join(wurzel, 'gnugo-duell.js'), ATTRAPPE = path.join(__dirname, 'gtp-attrappe.js');
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kand-orakel-')), programm = path.join(ordner, 'attrappe');
fs.writeFileSync(programm, `#!/bin/sh\nexec "${process.execPath}" "${ATTRAPPE}" "$@"\n`, {mode: 0o755});
let zaehler = 0;
const BASIS = ['--partien', '1', '--seed', '5', '--stufe', '1', '--maxzuege', '30', '--ki', 'mctsFixedSims=20', '--gnugo', programm];
function lauf(extra) {
  const aus = path.join(ordner, `roh-${++zaehler}.jsonl`);
  execFileSync(process.execPath, [WERKZEUG, ...BASIS, '--roh', aus, ...extra], {stdio: 'pipe', timeout: 240000});
  return JSON.parse(fs.readFileSync(aus, 'utf8').trim());
}

test('Harness: Arm A bitgleich zu „ohne Option“, Protokoll vorhanden, Orakel wird gefragt', () => {
  const o = lauf([]), a = lauf(['--kandidaten-orakel', 'A', '--kandidaten-ab', '4']);
  pruefeGleich(JSON.stringify(a.zuege), JSON.stringify(o.zuege), 'Züge');
  pruefeGleich(a.endstand, o.endstand, 'Endstand');
  const k = a.kandidatenOrakel;
  pruefe(k && k.arm === 'A' && k.ab === 4 && k.abfragen >= 5, 'Ergebnisfeld: ' + JSON.stringify(k && {arm: k.arm, ab: k.ab, abfragen: k.abfragen}));
  pruefeGleich(k.ereignisse.length, k.abfragen, 'ein Eintrag je Abfrage');
  pruefe(o.kandidatenOrakel === undefined, 'ohne Option kein Ergebnisfeld');
});

test('Harness: S und ZS haben denselben ersten Auslöser, vorher dieselben Züge wie A', () => {
  const a = lauf(['--kandidaten-orakel', 'A', '--kandidaten-ab', '4']);
  const ers = r => r.kandidatenOrakel.ereignisse.find(e => ['d', 'd1', 'c'].includes(e.fall));
  const ea = ers(a); pruefe(!!ea, 'A: ein Auslöser vorhanden: ' + a.kandidatenOrakel.ereignisse.map(e => e.fall).join(','));
  for (const arm of ['S', 'ZS']) {
    const x = lauf(['--kandidaten-orakel', arm, '--kandidaten-ab', '4']), ex = ers(x);
    pruefeGleich(JSON.stringify([ex.mc, ex.fall, ex.r, ex.rn]), JSON.stringify([ea.mc, ea.fall, ea.r, ea.rn]), arm + ': gleicher erster Auslöser');
    pruefeGleich(JSON.stringify(x.zuege.slice(0, ea.mc)), JSON.stringify(a.zuege.slice(0, ea.mc)), arm + ': Präfix vor dem ersten Eingriff');
  }
});

test('Harness: ungültige Optionen → Exit 2', () => {
  for (const extra of [['--kandidaten-orakel', 'X'], ['--kandidaten-orakel', 'A', '--orakel-zug', '80'], ['--kandidaten-orakel', 'A', '--kandidaten-ab', '-1']]) {
    const r = spawnSync(process.execPath, [WERKZEUG, '--partien', '1', '--gnugo', programm, ...extra], {encoding: 'utf8', timeout: 30000});
    pruefeGleich(r.status, 2, extra.join(' '));
  }
});

test('Default ohne extra: Protokoll bleibt leer', () => {
  ohne(2); pruefe(engine().kandidatenProtokoll() === null, 'Protokoll null nach Zügen ohne extra');
});

/* ---- Bericht und Workflow der Laufzeitprobe ---- */
const B = require('../auswertung/kandidaten-orakel/probe-bericht.js');
function baue(dir, opt = {}) {
  const ev = (mc, f, fall, r, rn) => ({mc, f, g: 1, fall, r, rn, i: 1});
  const partie = (nr, arm, f, e) => ({nr, wirFarbe: f, endstand: nr, zuege: ['D4'], kandidatenOrakel: {arm, abfragen: 10, ohneAntwort: opt.ohneAntwort || 0, abfrageMs: 100, partieMs: 1000 * nr, ereignisse: e}});
  for (const [o, n] of [['g', 8], ['f', 4]]) for (const arm of ['A', 'S', 'ZS']) {
    const l = [];
    for (let nr = 1; nr <= n; nr++) {
      const f = nr % 2 ? 'W' : 'S';
      const e = [ev(80, f, 'a', null, null), ev(82, f, 'd', 30, 31)];
      if (opt.abweichung && arm === 'ZS' && nr === 1) e[1] = ev(82, f, 'd', 30, 32);
      l.push(JSON.stringify(partie(nr, arm, f, e)));
    }
    fs.writeFileSync(path.join(dir, `${o}-${arm}.jsonl`), l.join('\n') + '\n');
  }
  const arch = rows().filter(r => r.nr >= 1 && r.nr <= 4);
  fs.writeFileSync(path.join(dir, 'kontrolle.jsonl'), arch.map(r => JSON.stringify(opt.kontrolleKaputt && r.nr === 3 ? {...r, zuege: r.zuege.slice(1)} : r)).join('\n') + '\n');
}
test('Probe-Bericht: gültig mit gebauten Daten; verletzte Bedingungen → KEIN URTEIL mit Grund', () => {
  const mk = o => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-')); baue(d, o); return B.bewerte(d, ARCH); };
  const ok = mk({}); pruefe(ok.gueltig, 'gültig: ' + ok.gruende.join(' | '));
  pruefe(/ms je Abfrage/.test(B.bericht(ok)) && !/Mittelwert der Differenz/.test(B.bericht(ok)), 'Bericht ohne Effekthöhe');
  pruefe(mk({ohneAntwort: 1}).gruende.some(g => /Antwortquote/.test(g)), 'Antwortquote unter 98 %');
  pruefe(mk({abweichung: true}).gruende.some(g => /Bedingung 4/.test(g)), 'Auslöser weichen ab');
  pruefe(mk({kontrolleKaputt: true}).gruende.some(g => /Bedingung 1/.test(g)), 'Kontrolle nicht bitgleich');
  const leer = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-')), r = B.bewerte(leer, ARCH);
  pruefe(!r.gueltig && r.gruende.some(g => /Partien/.test(g)), 'leere Daten sind ungültig');
});

test('Probe-Workflow: nur von Hand, Schritt-Zeitlimit < Job-Zeitlimit, Upload mit always(), Seed 230, Arme A S ZS, nur ergebnis schreibt', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/kandidaten-orakel-probe.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y) && !/^\s*(push|pull_request|schedule):/m.test(y), 'nur workflow_dispatch');
  pruefe(/SEED: '230'/.test(y) && /arm: \[A, S, ZS\]/.test(y) && /ubuntu-24\.04/.test(y) && !/ubuntu-latest/.test(y), 'Seed, Arme, Runner');
  pruefe((y.match(/^      contents: write/gm) || []).length === 1 && /^  ergebnis:/m.test(y), 'Schreibrecht nur im Ergebnis-Job');
  for (const job of ['gnugo', 'fuego', 'kontrolle']) {
    const kopf = new RegExp('^  ' + job + ':\\n([\\s\\S]*?)(?=^  \\w+:\\n|$(?![\\s\\S]))', 'm').exec(y)[1];
    const jobMin = +/^    timeout-minutes: (\d+)/m.exec(kopf)[1], schrittMin = +/^        timeout-minutes: (\d+)/m.exec(kopf)[1];
    pruefe(schrittMin < jobMin, `${job}: ${schrittMin} < ${jobMin}`);
    pruefe(/if: always\(\)\n        uses: actions\/upload-artifact@v7/.test(kopf), job + ': Upload mit always()');
    pruefe(/\|\| status=\$\?/.test(kopf), job + ': Status abgefangen');
  }
  pruefe(!/--force|push -f|push origin main/.test(y), 'kein Force, kein Push auf main');
});

require('./rahmen').laufeTests('Kandidaten-Orakel im Spiel').then(ok => process.exit(ok ? 0 : 1));
