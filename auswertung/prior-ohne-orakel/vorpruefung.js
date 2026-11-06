// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs'), crypto = require('crypto');
const {BASELINE} = require('./bericht');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function pruefe(run, proof, hashes) {
  const errors = [];
  if (!run || run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.conclusion !== 'success'
      || run.path !== '.github/workflows/prior-ohne-orakel-vergleich.yml') errors.push('kein erfolgreicher manueller Engine-Vergleich');
  if (!proof || proof.version !== 1 || proof.gueltig !== true || proof.ergebnis !== 'GLEICH' || proof.baseline !== BASELINE
      || !/^[0-9a-f]{40}$/.test(proof.neu || '') || proof.neuIndexSHA256 !== hashes['index.html']
      || proof.werkzeugSHA256 !== hashes['auswertung/prior-ohne-orakel/vergleich.js']
      || proof.replaySHA256 !== hashes['auswertung/diagnose/wurzel-replay.js']
      || proof.zufallGeprueft !== true || proof.priorGeprueft !== true || !(proof.coverage?.S > 0) || !(proof.coverage?.W > 0)
      || !Array.isArray(proof.gruende) || proof.gruende.length) errors.push('Vergleich unvollständig oder Quellen geändert');
  return errors;
}
module.exports = {pruefe};
if (require.main === module) {
  const [runFile, proofFile, out] = process.argv.slice(2);
  const run = JSON.parse(fs.readFileSync(runFile)), proof = JSON.parse(fs.readFileSync(proofFile));
  const files = ['index.html', 'auswertung/prior-ohne-orakel/vergleich.js', 'auswertung/diagnose/wurzel-replay.js'];
  const errors = pruefe(run, proof, Object.fromEntries(files.map(f => [f, hash(f)])));
  if (errors.length) throw new Error('KEIN URTEIL: ' + errors.join('; '));
  fs.writeFileSync(out, JSON.stringify({...proof, lauf: run.id, laufSHA: run.head_sha}, null, 2) + '\n');
}
