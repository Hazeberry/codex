// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {schneide, STANDARD_HTML} = require('../../tests/rahmen');
const {instrumentiere} = require('./beobachter');
const html = fs.readFileSync(STANDARD_HTML, 'utf8');
function kontrolle(messen, farbe) {
  const worker = schneide(html, 'worker-ai');
  const ctx = vm.createContext({});
  vm.runInContext(schneide(html, 'shared-go-logic') + '\n' + (messen ? instrumentiere(worker) : worker), ctx);
  vm.runInContext('let zustand=719; Math.random=()=>((zustand=Math.imul(zustand,1664525)+1013904223>>>0)/4294967296)', ctx);
  Object.assign(ctx.PARAMS, {mctsFixedSims:120, adaptiveBudgetEnabled:0});
  const board = new Uint8Array(361);
  board[180] = 1; board[181] = 2;
  const r = ctx.getAIMove(board, farbe, [], {1:0,2:0}, 84, 'hard', 1, null, 181);
  if (messen) {
    assert.equal(ctx.__qSuchwert.sims,120);
    assert(ctx.__qSuchwert.n > 0);
    assert.equal(ctx.__qSuchwert.q, ctx.__qSuchwert.w / ctx.__qSuchwert.n);
  }
  return [r.type,r.x,r.y,r.info,vm.runInContext('zustand',ctx)];
}
for (const farbe of [1,2]) assert.deepEqual(kontrolle(true,farbe),kontrolle(false,farbe));
