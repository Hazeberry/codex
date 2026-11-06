// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const {ladeKI, test, pruefe, laufeTests} = require('./rahmen');
const E = ladeKI({mitNetz: false}), B = require('../auswertung/prior-ohne-orakel/bericht'), R = require('../auswertung/prior-ohne-orakel/regel');
const write = (p, x) => { fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, JSON.stringify(x)); };
const rowFile = (p, rows) => fs.writeFileSync(p, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const coord = i => 'ABCDEFGHJKLMNOPQRST'[i % 19] + (19 - Math.floor(i / 19));
function fixture(probe = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prior-bericht-'));
  const q = {sourceSHA: 'a'.repeat(40), hashes: Object.fromEntries(R.SOURCE_FILES.map(k => [k, 'b'.repeat(64)]))};
  write(path.join(dir, 'quellen.json'), q);
  write(path.join(dir, 'enginevergleich.json'), {gueltig: true, ergebnis: 'GLEICH', baseline: B.BASELINE,
    neuIndexSHA256: q.hashes['index.html'], zufallGeprueft: true, priorGeprueft: true, coverage: {S: 1, W: 1}});
  function row(nr, arm, gegner, seed, name, repeat = false) {
    const color = nr % 2 ? 'W' : 'S', last = color === 'S' ? 80 : 81;
    const moves = Array.from({length: 82}, (_, i) => coord(i)); moves[last] = coord(300);
    const events = [];
    for (let mc = color === 'S' ? 0 : 1; mc < 82; mc += 2) {
      const o = {arm, gegner, seed, nr, mc};
      const e = {...o, version: 1, farbe: color, hash: 1, fenster: mc >= 80, suche: false, neu: false, wieder: false,
        grund: 'keine-suche', gelegenheit: false, angehoben: false, auswahl: null, ziel: null, rSeed: null,
        verworfen: 0, kinder: null, summe: null, fehler: [], gespielt: mc, dauerMs: repeat ? 3 : 1};
      if (mc === last) {
        const kids = [300, 310, 320].map((idx, i) => ({idx, P: [0.6, 0.3, 0.1][i], N: 40, W: 2}));
        Object.assign(e, E._priorAnwenden(kids, [0, 4, 8], o), {suche: true, neu: true, gespielt: 300});
        e.kinder.forEach(k => { k.n = 40; k.w = 2; });
      }
      events.push(e);
    }
    const score = 20 + (arm === 'H' ? 6 : arm === 'R' ? -2 : 0), partSeed = seed * 100000 + nr;
    const protokoll = `einzeln/${name}-${nr}/protokoll.jsonl`, log = `einzeln/${name}-${nr}/partie.log`;
    const stream = [{nr, typ: 'prozess-start', pid: 1, name: 'GNU Go', argumente: ['--level', '1', '--seed', String(partSeed)]}];
    if (gegner === 'f') {
      stream.push({nr, typ: 'prozess-start', pid: 2, name: 'Fuego', argumente: ['--srand', String(partSeed)]});
      for (const befehl of ['uct_param_player max_games 100', 'uct_param_player ponder 0', 'uct_param_player resign_threshold 0', 'deterministic_mode', 'set_random_seed ' + partSeed]) stream.push({nr, typ: 'gtp-frage', name: 'Fuego', pid: 2, befehl});
    }
    stream.push(...events.map(e => ({nr, typ: 'ki-zug', protokoll: e})),
      {nr, typ: 'gtp-antwort', pid: 1, name: 'GNU Go', befehl: 'final_score', antwort: '= ' + (color === 'S' ? 'B' : 'W') + '+' + score},
      {nr, typ: 'prozess-ende', pid: 1, name: 'GNU Go', code: 0, sig: null});
    if (gegner === 'f') stream.push({nr, typ: 'prozess-ende', pid: 2, name: 'Fuego', code: 0, sig: null});
    fs.mkdirSync(path.dirname(path.join(dir, protokoll)), {recursive: true});
    rowFile(path.join(dir, protokoll), stream); fs.writeFileSync(path.join(dir, log), 'gebauter Testdatensatz\n');
    return {nr, seed: partSeed, stufe: 1, wirFarbe: color, vorgabe: 0, komi: 7.5,
      ki: {mctsFixedSims: 120, resignEnabled: 0}, simsMittel: 120, gewonnen: true, endstand: score, zuegeAnzahl: 82, zuege: moves,
      priorOhneOrakel: {version: 1, arm, seed, gegner, nr, ereignisse: events},
      priorLauf: {status: 'ok', timeout: false, code: 0, dauerMs: 1000, quelle: q.sourceSHA, protokoll, log}};
  }
  for (const name of ['g-A', 'g-H', 'g-R', 'f-A', 'f-H', 'f-R', 'kontrolle']) {
    const control = name === 'kontrolle', [gegner, arm] = control ? ['g', 'A'] : name.split('-');
    const seed = control ? 222 : probe ? 236 : gegner === 'g' ? 237 : 238;
    write(path.join(dir, name + '.meta.json'), {...q, version: 1, art: name, gegner, arm, seed, n: 4,
      wiederholungen: control ? [] : [1, 2, 3], versions: {gnugoSHA256: 'c'.repeat(64), ...(gegner === 'f' ? {fuegoSHA256: 'd'.repeat(64)} : {})},
      konfiguration: {sims: 120, komi: 7.5, vorgabe: 0, resign: 0, gegnerStufe: 1, fuegoSpiele: 100, maxZuege: 600}});
    const rows = [1, 2, 3, 4].map(nr => row(nr, arm, gegner, seed, name));
    rowFile(path.join(dir, name + '.jsonl'), rows);
    if (control) rowFile(path.join(dir, 'archiv.jsonl'), rows);
    else rowFile(path.join(dir, 'wiederholung-' + name + '.jsonl'), [1, 2, 3].map(nr => row(nr, arm, gegner, seed, 'wiederholung-' + name, true)));
  }
  return dir;
}
const evaluate = (dir, probe = true) => B.bewerte(dir, {probe, nJe: {g: 4, f: 4}, archiv: path.join(dir, 'archiv.jsonl')});
function changeRows(dir, name, f) {
  const p = path.join(dir, name + '.jsonl'), rows = fs.readFileSync(p, 'utf8').trim().split('\n').map(JSON.parse);
  f(rows); rowFile(p, rows);
}
test('Probe gültig mit gebauten Daten; keine Effektauswertung, Zeiten separat', () => {
  const d = fixture(); try {
    const e = evaluate(d);
    assert(e.gueltig, JSON.stringify(e.pruefungen.filter(p => !p.ok)));
    pruefe(e.auswertung === null && e.vollstaendigeGruppen.g === 4 && e.vollstaendigeGruppen.f === 4, 'nur technische Angaben');
    pruefe(!B.bericht(e).includes('## Hauptvergleiche'), 'keine Endstand-Differenzen im Probebericht');
  } finally { fs.rmSync(d, {recursive: true, force: true}); }
});
test('Pflichtverletzungen ergeben KEIN URTEIL ohne Effekte, auch bei endlichen Endständen', () => {
  for (const mutate of [
    d => fs.unlinkSync(path.join(d, 'enginevergleich.json')),
    d => changeRows(d, 'g-A', r => r.push(r[0])),
    d => changeRows(d, 'g-H', r => { r[0].priorOhneOrakel.ereignisse.at(-1).kinder[0].pNach += 0.1; }),
    d => changeRows(d, 'g-R', r => { r[0].priorOhneOrakel.ereignisse = []; }),
    d => changeRows(d, 'f-A', r => { r[0].priorLauf.status = 'timeout'; r[0].priorLauf.timeout = true; }),
    d => changeRows(d, 'wiederholung-g-A', r => { r[0].priorLauf.quelle = 'f'.repeat(40); }),
    d => changeRows(d, 'g-A', r => { r[0].priorOhneOrakel.ereignisse[0] = null; })]) {
    const d = fixture(); try {
      mutate(d); const e = evaluate(d);
      pruefe(!e.gueltig && e.auswertung === null && B.bericht(e).includes('KEIN URTEIL'), 'verletzte Pflicht erkannt');
    } finally { fs.rmSync(d, {recursive: true, force: true}); }
  }
});
test('Vorbereitete Hauptauswertung: vier Tests mit α=0,05/4; gültige Dreiergruppen', () => {
  const d = fixture(false); try {
    const e = evaluate(d, false); assert(e.gueltig, JSON.stringify(e.pruefungen.filter(p => !p.ok)));
    pruefe(e.alpha === 0.0125 && e.auswertung.g.haupt.length === 2 && e.auswertung.f.haupt.length === 2, 'vier Tests');
    for (const o of ['g', 'f']) {
      pruefe(e.auswertung[o].haupt[0].mittel === 6 && e.auswertung[o].haupt[1].mittel === 8, 'bekannte Paardifferenzen');
      pruefe(e.auswertung[o].haupt.every(v => v.n === 4) && e.auswertung[o].farben.S.every(v => v.n === 2), 'gleiche vollständige Gruppen und Farbaufteilung');
    }
  } finally { fs.rmSync(d, {recursive: true, force: true}); }
});
laufeTests('Prior ohne Orakel: Bericht').then(ok => process.exit(ok ? 0 : 1));
