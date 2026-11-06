// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const {ladeKI, test, pruefe, laufeTests} = require('./rahmen');
const B=require('../auswertung/prior-ohne-orakel/bericht');
const {fixture,evaluate,changeRows}=require('./prior-ohne-orakel-fixture');
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
