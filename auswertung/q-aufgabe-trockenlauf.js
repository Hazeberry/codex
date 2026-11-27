// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert = require('node:assert/strict');
const {clopperPearson} = require('./kandidaten-orakel/haupt-bericht');

// Bildet die Default-Regel auf der Folge aufgezeichneter Aufrufe nach.
// null kennzeichnet einen belegten Pfad ohne Auswertung des Q-Zweigs.
function ersterAlarm(aufrufe) {
  let serie = 0;
  let vorher = -1;
  for (const {mc, q} of aufrufe) {
    assert(Number.isInteger(mc) && mc > vorher);
    vorher = mc;
    if (q === null) continue;
    assert(Number.isFinite(q) && Math.abs(q) <= 1);
    serie = mc >= 60 && q <= -0.95 ? serie + 1 : 0;
    if (serie === 5) return mc;
  }
  return null;
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

const folge = (werte, anfang = 60) => werte.map((q, i) => ({mc: anfang + 2*i, q}));
const tief = Array(5).fill(-0.95);
assert.equal(ersterAlarm(folge(tief)), 68);
assert.equal(ersterAlarm(folge(tief, 58)), null);
assert.equal(ersterAlarm(folge([-1,-1,-1,-1,-0.9499,-1])), null);
assert.equal(ersterAlarm(folge([-1,-1,null,-1,-1,-1])), 70);
assert.throws(() => ersterAlarm(folge([NaN])));
assert.equal(urteil('W', [-1, -2]), 'voreilig');
assert.equal(urteil('S', [-1, -2]), 'berechtigt');
assert.equal(urteil('S', [1, -2]), 'unklar');
assert.equal(urteil('W', [0, -2]), 'unklar');
assert.throws(() => urteil('W', [NaN, -2]));
const [lo, hi] = clopperPearson(0, 100, 0.05);
assert.equal(lo, 0);
assert(Math.abs(hi - (1 - 0.025 ** 0.01)) < 1e-9);
console.log('Synthetische Prüfungen für Q-Serie, Farbsicht, Urteilsgrenzen und Intervall bestanden.');
