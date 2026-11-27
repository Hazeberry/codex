// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert = require('node:assert/strict');
const {clopperPearson} = require('./kandidaten-orakel/haupt-bericht');

const fs = require('node:fs');
const vm = require('node:vm');
const {schneide, STANDARD_HTML} = require('../tests/rahmen');
const html = fs.readFileSync(STANDARD_HTML, 'utf8');
const worker = new vm.Script(['shared-go-logic', 'worker-ai'].map(id => schneide(html, id)).join('\n'));

// Pro Fall ein frischer Worker-Zustand. Nur das Ergebnis der MCTS-Suche ist vorgegeben.
function entscheidungen(werte, anfang = 60, parameter = {}) {
  const kontext = vm.createContext({});
  worker.runInContext(kontext);
  Object.assign(kontext.PARAMS, parameter);
  const brett = new Uint8Array(361);
  return werte.map((q, i) => {
    let suchen = 0;
    kontext.mctsPUCT = (board, farbe, gefangene, kandidaten) => {
      suchen++;
      return q === null ? null : {m: kandidaten[0].m, q, sims: 120, share: 100};
    };
    const zug = kontext.getAIMove(brett, 1, [], {1: 0, 2: 0}, anfang + 2*i, 'hard', i, null, -1);
    assert.equal(suchen, 1, 'Vorgegebene Suche muss genau einmal erreicht werden');
    if (zug.type === 'resign') assert.match(zug.info, /^Q /);
    return zug.type;
  });
}

function urteil(farbe, schwarzMinusWeiss) {
  assert(['S', 'W'].includes(farbe));
  assert.equal(schwarzMinusWeiss.length, 2);
  assert(schwarzMinusWeiss.every(Number.isFinite));
  const werte = schwarzMinusWeiss.map(x => farbe === 'S' ? x : -x);
  if (werte.every(x => x > 0)) return 'voreilig';
  if (werte.every(x => x < 0)) return 'berechtigt';
  return 'unklar';
}

const tief = Array(5).fill(-0.95);
const steine = n => Array(n).fill('stone');
assert.deepEqual(entscheidungen(tief), [...steine(4), 'resign']);
assert.deepEqual(entscheidungen([...tief,-1], 58), [...steine(5), 'resign']);
assert.deepEqual(entscheidungen([-1,-1,-1,-1,-0.9499,...tief]), [...steine(9), 'resign']);
assert.deepEqual(entscheidungen([-1,-1,null,-1,-1,-1]), ['stone','stone','pass','stone','stone','resign']);
assert.deepEqual(entscheidungen(tief, 60, {resignEnabled: 0}), steine(5));
assert.deepEqual(entscheidungen(tief, 60, {resignAreaMargin: 0}), steine(5));
assert.equal(urteil('W', [-1, -2]), 'voreilig');
assert.equal(urteil('S', [-1, -2]), 'berechtigt');
assert.equal(urteil('S', [1, -2]), 'unklar');
assert.equal(urteil('W', [0, -2]), 'unklar');
assert.throws(() => urteil('W', [NaN, -2]));
// R stats::binom.test(k, 100, conf.level=0.95)$conf.int, auf 12 Stellen gerundet.
for (const [k, unten, oben] of [
  [0, 0, 0.036216692645],
  [50, 0.398321129503, 0.601678870497],
  [100, 0.963783307355, 1],
]) {
  const [lo, hi] = clopperPearson(k, 100, 0.05);
  assert(Math.abs(lo - unten) < 1e-9 && Math.abs(hi - oben) < 1e-9, 'Intervall bei k=' + k);
}
assert.deepEqual(clopperPearson(0, 0, 0.05), [NaN, NaN]);
console.log('Worker-Entscheidungen, Farbsicht, Urteilsgrenzen und vier Intervallfälle bestanden.');
