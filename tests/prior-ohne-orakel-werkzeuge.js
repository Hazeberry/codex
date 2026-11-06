// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const {execFileSync, spawnSync} = require('child_process');
const {test, pruefe, laufeTests, ladeKI} = require('./rahmen');
const V = require('../auswertung/prior-ohne-orakel/vergleich'), P = require('../auswertung/prior-ohne-orakel/vorpruefung');
const {BASELINE} = require('../auswertung/prior-ohne-orakel/bericht');
const E = ladeKI({mitNetz: false}), root = path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prior-werkzeuge-'));
function dumps() {
  return ['alt', 'neu', 'A'].flatMap(variante => [1, 2].map(nr => {
    const o = {arm: 'A', seed: 222, gegner: 'g', nr, mc: nr === 1 ? 81 : 80};
    const kids = [{idx: 10, P: 0.6, N: 80, W: 2}, {idx: 20, P: 0.4, N: 40, W: 1}];
    const prior = {...o, version: 1, farbe: nr === 1 ? 'W' : 'S', hash: 42, fenster: true,
      suche: true, neu: true, wieder: false, ...E._priorAnwenden(kids, [0, 8], o), gespielt: 10};
    prior.kinder.forEach((k, i) => { k.n = kids[i].N; k.w = kids[i].W; });
    return {variante, nr, sha: variante === 'alt' ? BASELINE : 'a'.repeat(40), indexSHA256: 'b'.repeat(64),
      werkzeugSHA256: 'c'.repeat(64), replaySHA256: 'd'.repeat(64), archivSHA256: 'e'.repeat(64),
      replay: {abweichung: null, zuege: [{mc: o.mc, gewaehlt: 10, kids: [10, 20], priors: [0.6, 0.4],
        statistik: kids.map(k => [k.idx, k.N, k.W, k.P]), zufall: 40, prior: variante === 'A' ? prior : null}]}};
  }));
}
test('Engine-Vergleich an gebauten Dumps: Priors, Statistik, Zufall, beide Farben verpflichtend', () => {
  const result = V.vergleiche(dumps()); assert(result.gueltig, result.gruende.join('; '));
  for (const mutate of [d => d.pop(), d => { d[0].replay.zuege[0].zufall++; },
    d => { d[1].replay.zuege[0].priors[0] = null; }, d => { d[3].replay.zuege[0].statistik[0] = null; },
    d => { d[4].replay.zuege[0].prior.kinder = null; }, d => { d[5].sha = 'f'.repeat(40); }]) {
    const d = dumps(); mutate(d); const r = V.vergleiche(d); pruefe(!r.gueltig && r.ergebnis === 'KEIN URTEIL', 'Fehler sperrt Gleichheitsurteil');
  }
  const run = {event: 'workflow_dispatch', status: 'completed', conclusion: 'success', path: '.github/workflows/prior-ohne-orakel-vergleich.yml'};
  const hashes = {'index.html': 'b'.repeat(64), 'auswertung/prior-ohne-orakel/vergleich.js': 'c'.repeat(64), 'auswertung/diagnose/wurzel-replay.js': 'd'.repeat(64)};
  assert.deepStrictEqual(P.pruefe(run, result, hashes), []);
  pruefe(P.pruefe({...run, conclusion: 'failure'}, result, hashes).length > 0, 'roter Vergleich gesperrt');
  pruefe(P.pruefe(run, result, {...hashes, 'index.html': 'f'.repeat(64)}).length > 0, 'andere Engine gesperrt');
});
test('CLI: vier Züge gegen GTP-Attrappe, Pflichtprotokolle und Ausschluss des Orakels', () => {
  const prog = path.join(dir, 'attrappe');
  fs.writeFileSync(prog, `#!/bin/sh\nexec "${process.execPath}" "${path.join(__dirname, 'gtp-attrappe.js')}" "$@"\n`, {mode: 0o755});
  const raw = path.join(dir, 'roh.jsonl'), stream = raw + '.prior.jsonl';
  const args = ['gnugo-duell.js', '--partien', '1', '--von', '2', '--seed', '236', '--maxzuege', '4', '--schaetzung', '2',
    '--vorgabe', '0', '--ki', 'mctsFixedSims=2,resignEnabled=0', '--gnugo', prog, '--prior-ohne-orakel', 'H', '--roh', raw];
  execFileSync(process.execPath, args, {cwd: root, timeout: 15000, stdio: 'pipe'});
  const row = JSON.parse(fs.readFileSync(raw, 'utf8')), events = fs.readFileSync(stream, 'utf8').trim().split('\n').map(JSON.parse);
  pruefe(row.zuegeAnzahl === 4 && row.priorOhneOrakel.ereignisse.length === 2, 'ein Pflichtprotokoll pro KI-Zug');
  pruefe(events.filter(e => e.typ === 'ki-zug').length === 2 && events.filter(e => e.typ === 'prozess-start').length === 1
    && events.some(e => e.typ === 'prozess-ende'), 'nur Gegnerprozess, Lebenszyklus gesichert');
  pruefe(!events.some(e => /^reg_genmove/.test(e.befehl || '')), 'keine Orakelabfrage');
  for (const extra of [['--orakel', '1'], ['--kandidaten-orakel', 'A'], ['--partien', '2']]) {
    const r = spawnSync(process.execPath, [...args, ...extra], {cwd: root, timeout: 5000, encoding: 'utf8'});
    pruefe(r.status === 2, 'unzulässige Kombination abgelehnt: ' + extra.join(' '));
  }
});
test('Zeitwächter mit künstlichem Prozess; Quellenlisten und manuelle Workflows', () => {
  const code = `import importlib.util, pathlib, sys, json, os
s=importlib.util.spec_from_file_location('paket','auswertung/prior-ohne-orakel/paket.py')
p=importlib.util.module_from_spec(s); s.loader.exec_module(p)
r=p.bounded([sys.executable,'-c','import time; time.sleep(10)'], pathlib.Path(sys.argv[1]), 0.05)
assert r['timeout'] and r['code']==-9 and r['dauerMs'] >= 50
print(json.dumps(p.FILES))`;
  const files = JSON.parse(execFileSync('python3', ['-c', code, path.join(dir, 'timeout.log')], {cwd: root, encoding: 'utf8', timeout: 5000}));
  assert.deepStrictEqual(files, require('../auswertung/prior-ohne-orakel/regel').SOURCE_FILES);
  for (const f of files) pruefe(fs.existsSync(path.join(root, f)), 'Quelle vorhanden: ' + f);
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/prior-ohne-orakel-probe.yml'), 'utf8');
  const times = [...workflow.matchAll(/^    timeout-minutes: (\d+)$/gm)].map(m => +m[1]);
  assert.deepStrictEqual(times, [20, 30, 45, 85, 20, 15]);
  pruefe(times.reduce((s, t, i) => s + t * ([2, 3].includes(i) ? 3 : 1), 0) === 475, 'maximale Joblimitsumme 475 Minuten');
  pruefe(3 * (8 + 4) + 3 * 3 * 2 + 4 === 58, '58 angesetzte Partien');
  for (const name of ['probe', 'vergleich']) {
    const t = fs.readFileSync(path.join(root, `.github/workflows/prior-ohne-orakel-${name}.yml`), 'utf8');
    pruefe(t.includes('workflow_dispatch:') && !/^  (push|pull_request|schedule|workflow_run):/m.test(t), 'nur manuell: ' + name);
  }
});
laufeTests('Prior ohne Orakel: Werkzeuge').then(ok => { fs.rmSync(dir, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
