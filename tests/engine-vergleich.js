// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Engine-Vergleich (auswertung/engine-vergleich.js, .github/workflows/engine-vergleich.yml), kurz:
   ein Stand gegen sich selbst ist gleich; eine geänderte Priorität, ein anderer Zug und andere
   Einstellungen werden erkannt; der Workflow ist nur von Hand, je Stand ein eigener Job, ohne
   Schreibrecht.
   Aufruf:  node tests/engine-vergleich.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const V = require('../auswertung/engine-vergleich.js');
const wurzel = path.join(__dirname, '..');
const SKRIPT = path.join(wurzel, 'auswertung/engine-vergleich.js');

test('Stand gegen sich selbst gleich (eigene Prozesse); Abweichungen und andere Einstellungen erkannt', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'engvgl-'));
  const args = aus => [SKRIPT, '--dump', '--html', path.join(wurzel, 'index.html'), '--aus', aus, '--partien', '2', '--bis', '84', '--raenge', '30', '--arme', 'A,S'];
  for (const s of ['a', 'b']) pruefeGleich(spawnSync(process.execPath, args(path.join(d, s + '.json')), {encoding: 'utf8', timeout: 240000}).status, 0, 'Dump ' + s);
  const a = JSON.parse(fs.readFileSync(path.join(d, 'a.json'), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(d, 'b.json'), 'utf8'));
  pruefeGleich(a.laeufe.length, 3, 'Default plus zwei Arme');
  const v = V.vergleiche(a, b);
  pruefe(v.gleich && /\*\*Gleich\.\*\*/.test(V.bericht(v, a)), 'gleich');
  pruefe(a.laeufe.every(x => x.zuege.every(z => !z[2] || (Array.isArray(z[3]) && z[3].length === z[2].length))), 'Priors je Wurzelkind erfasst');
  const c = JSON.parse(JSON.stringify(b)), l = c.laeufe[2], k = l.zuege.findIndex(z => z[3] && z[3].length);
  l.zuege[k][3][0] += 1e-15;
  const vc = V.vergleiche(a, c);
  pruefe(!vc.gleich && vc.abw.length === 1 && vc.abw[0].arm === 'S' && vc.abw[0].mc === l.zuege[k][0], 'geänderter Prior erkannt');
  const z = JSON.parse(JSON.stringify(b)); z.laeufe[0].zuege[0][1] = -7;
  pruefe(!V.vergleiche(a, z).gleich, 'anderer Zug erkannt');
  const e = JSON.parse(JSON.stringify(b)); e.einstellungen.bis = 90;
  pruefe(V.vergleiche(a, e).gruende.some(g => /Einstellungen/.test(g)), 'andere Einstellungen erkannt');
  const r = spawnSync(process.execPath, [SKRIPT, '--vergleich', path.join(d, 'a.json'), path.join(d, 'b.json')], {encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Exit 0 bei Gleichheit');
});

test('Workflow: nur von Hand, je Stand ein eigener Job, Index aus dem Stand, Werkzeug aus dem Lauf, kein Schreibrecht', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/engine-vergleich.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y) && !/^\s*(push|pull_request|schedule):/m.test(y), 'nur workflow_dispatch');
  pruefe(/seite: \[alt, neu\]/.test(y) && /--html stand\/index\.html/.test(y) && /node auswertung\/engine-vergleich\.js --dump/.test(y), 'je Stand ein Job, Index aus dem Stand');
  pruefe(/^permissions:\n  contents: read/m.test(y) && !/contents: write/.test(y) && !/git push/.test(y), 'kein Schreibrecht');
  pruefe(/ubuntu-24\.04/.test(y) && /if: always\(\)\n        uses: actions\/upload-artifact@v7/.test(y) && /\|\| status=\$\?/.test(y), 'Runner, Sicherung, Status');
});

laufeTests('Engine-Vergleich').then(ok => process.exit(ok ? 0 : 1));
