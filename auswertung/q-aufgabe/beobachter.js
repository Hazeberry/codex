// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
function instrumentiere(quelle) {
  const anker = 'return {m: {x: bm.x, y: bm.y, idx: bm.idx}, sims,';
  if (quelle.split(anker).length !== 2) throw Error('Messanker an der Suchrückgabe nicht eindeutig');
  return quelle.replace(anker, 'globalThis.__qSuchwert = {w: bm.W, n: bm.N, q: bm.N ? bm.W/bm.N : 0, sims};\n  ' + anker);
}
module.exports = {instrumentiere};
