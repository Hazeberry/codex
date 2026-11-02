// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Engine-Abgleich der Archive (docs/diagnose-p1p2.md §3): Welcher Commit hat die
   Archivpartien gespielt, und worin unterscheidet sich seine Engine von der
   heutigen? Verglichen werden (1) die Standardwerte aller Parameter und (2) der
   Code der Blöcke shared-go-logic und worker-ai ohne Kommentare und Leerzeilen.
   Braucht die volle Git-Historie (git show COMMIT:index.html); die Ausgabe
   steht archiviert in docs/daten/diagnose-p1p2/abgleich.txt.

   Aufruf:  node auswertung/diagnose/engine-abgleich.js [--aus datei.txt] */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const {execFileSync} = require('child_process');
const {ladeKI} = require('../../tests/rahmen');
const wurzel = path.join(__dirname, '..', '..');

/* Läufe aus GitHub Actions (list_workflow_runs): Commit, auf dem die Archive gespielt wurden */
const LAEUFE = [
  {name: 'Leeres Brett', archiv: 'docs/daten/leeres-brett/lauf1', run: 40943994425, datum: '2026-10-29', sha: '443724e6831677ab15a64e909bfec072a253f7ef', pr: '#215'},
  {name: 'Muster ohne Vorgabe', archiv: 'docs/daten/muster-ohne-vorgabe/lauf1', run: 41022192878, datum: '2026-10-30', sha: 'e40d82eb140099701d7fc4f275be275e06c374d6', pr: '#219'},
  {name: 'Siege gegen Fuego ohne Vorgabe', archiv: 'docs/daten/fuego-siege/lauf1', run: 41200615724, datum: '2026-10-31', sha: '0a03266149fad3833cc254f3b08b547f4ff4b07e', pr: '#225'},
];
const block = (html, id) => (new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`).exec(html) || [, ''])[1];
const ohneKommentar = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/\/\/.*$/, '').replace(/\s+$/, '')).filter(l => l.trim());

function abgleichen(lauf, heutigPfad) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abgleich-')), alt = path.join(tmp, 'index.html');
  fs.writeFileSync(alt, execFileSync('git', ['show', `${lauf.sha}:index.html`], {cwd: wurzel, maxBuffer: 1 << 28}));
  const pa = ladeKI({htmlPfad: alt, mitNetz: false}).PARAMS, pn = ladeKI({htmlPfad: heutigPfad, mitNetz: false}).PARAMS;
  const params = [...new Set([...Object.keys(pa), ...Object.keys(pn)])].filter(k => pa[k] !== pn[k]).map(k => `${k}: ${pa[k]} → ${pn[k]}`);
  const html = {alt: fs.readFileSync(alt, 'utf8'), neu: fs.readFileSync(heutigPfad, 'utf8')};
  const code = {};
  for (const id of ['shared-go-logic', 'worker-ai']) {
    const a = ohneKommentar(block(html.alt, id)), n = ohneKommentar(block(html.neu, id)), sa = new Set(a), sn = new Set(n);
    code[id] = {zeilenAlt: a.length, zeilenNeu: n.length, nurAlt: a.filter(l => !sn.has(l)).map(l => l.trim()), nurNeu: n.filter(l => !sa.has(l)).map(l => l.trim())};
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  return {params, code};
}
module.exports = {LAEUFE, abgleichen};

if (require.main === module) {
  const heutig = path.join(wurzel, 'index.html'), aus = [];
  const log = s => { aus.push(s); console.log(s); };
  log(`Engine-Abgleich der Archive gegen den heutigen index.html (${execFileSync('git', ['rev-parse', 'HEAD'], {cwd: wurzel}).toString().trim()})`);
  for (const l of LAEUFE) {
    const r = abgleichen(l, heutig);
    log(`\n== ${l.name}: Actions-Lauf ${l.run} (${l.datum}), Commit ${l.sha} (PR ${l.pr}), Archiv ${l.archiv}`);
    log(`Standardwerte, die sich unterscheiden (alt → heute): ${r.params.length ? r.params.join(' | ') : 'keine'}`);
    for (const [id, c] of Object.entries(r.code)) {
      log(`${id}: ${c.zeilenAlt} Zeilen damals, ${c.zeilenNeu} heute; nur damals: ${c.nurAlt.length}, nur heute: ${c.nurNeu.length}`);
      for (const z of c.nurAlt) log(`   nur damals: ${z.slice(0, 150)}`);
      for (const z of c.nurNeu) log(`   nur heute:  ${z.slice(0, 150)}`);
    }
  }
  const i = process.argv.indexOf('--aus'); if (i >= 0) fs.writeFileSync(process.argv[i + 1], aus.join('\n') + '\n');
}
