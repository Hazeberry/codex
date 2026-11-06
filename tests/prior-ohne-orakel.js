// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert = require('assert');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const E = ladeKI({mitNetz: false}), B = require('../auswertung/prior-ohne-orakel/regel');
const opt = (arm, mc = 81) => ({arm, mc, seed: 236, gegner: 'g', nr: 1});
const kids = () => [30, 10, 20].map((idx, i) => ({idx, P: [0.6, 0.3, 0.1][i], N: 7, W: 2, kids: null}));

test('A identisch; H hebt vorhandenen Zug an; Gleichstand nach Brettindex', () => {
  const a = kids(), before = JSON.stringify(a), p = E._priorAnwenden(a, [5, 9, 9], opt('A'));
  pruefeGleich(JSON.stringify(a), before, 'A verändert keine Kinddaten');
  pruefe(p.gelegenheit && p.auswahl === 10 && p.ziel === null && !p.angehoben, 'Gelegenheit getrennt vom Eingriff');
  const h = kids(), refs = h.slice(), q = E._priorAnwenden(h, [5, 9, 9], opt('H'));
  pruefe(q.ziel === 10 && q.angehoben, 'kleinster Index beim Gleichstand');
  pruefe(h.every((k, i) => k === refs[i] && k.N === 7 && k.W === 2), 'Kinder, Reihenfolge, Statistik erhalten');
  pruefe(h[0].P === h[1].P && Math.abs(h.reduce((s, k) => s + k.P, 0) - 1) < 1e-12, 'Spitzenprior und Normierung');
});
test('Vor Zug 81, wenige Kinder, maximale Auswahl und ungültige Werte', () => {
  for (const arm of B.ARME) for (const [k, werte, mc, grund] of [
    [kids(), null, 79, 'vor-zug81'], [[], null, 81, 'weniger-als-zwei'],
    [[{idx: 10, P: 1, N: 0, W: 0}], null, 81, 'weniger-als-zwei'], [kids(), [10, 2, 3], 81, 'auswahl-schon-maximal']]) {
    const vor = JSON.stringify(k), p = E._priorAnwenden(k, werte, opt(arm, mc));
    pruefeGleich(p.grund, grund, 'Ausnahme bezeichnet'); pruefeGleich(JSON.stringify(k), vor, 'kein Eingriff');
  }
  for (const werte of [[NaN, 2, 3], [1, Infinity, 2], null]) {
    const p = E._priorAnwenden(kids(), werte, opt('H'));
    pruefe(p.fehler.length && !p.angehoben, 'ungültige Bewertung als Fehler');
  }
  const k = kids(); k[0].P = NaN;
  pruefe(E._priorAnwenden(k, [1, 2, 3], opt('H')).fehler.length > 0, 'ungültige Priors erkannt');
});
test('FNV/Mulberry-Testvektoren, verworfene Zufallswerte und unabhängige Auswahlprüfung', () => {
  for (const [o, s, u] of [[opt('R'), 2869826349, 3853687473], [{...opt('R', 80), gegner: 'f', nr: 2}, 2021768496, 2023999445]]) {
    pruefeGleich(E._priorSeed(o), s, 'FNV-Vektor');
    pruefeGleich(Math.floor(E._priorMulberry(s)() * 4294967296), u, 'Mulberry-Vektor');
    pruefeGleich(B.seed(o), s, 'unabhängiger Prüfer');
  }
  const seq = [4294967295 / 4294967296, 5 / 4294967296];
  const z = E._priorZieheIndex(3, () => seq.shift());
  pruefe(z.verworfen === 1 && z.index === 2, 'obersten Wert verworfen');
  for (let nr = 1; nr <= 16; nr++) {
    const o = {...opt('R'), nr}, p = E._priorAnwenden(kids(), [0, 8, 9], o);
    pruefeGleich(p.ziel, [10, 20][B.index(B.seed(o), 2).index], 'eigener Strom und sortierte Auswahl');
  }
});
test('quickEval erhält Brett, Suchzufall und Arbeitsfelder auch am Epochenüberlauf', () => {
  const board = new Uint8Array(361); board[180] = 1; board[181] = 2;
  const vorBrett = board.slice(), rng = Math.random;
  E.setzeFfEpoche(0x7ffffffe); const vor = E._priorArbeitsstand();
  let draws = 0; const stream = () => { draws++; return 0.5; }; Math.random = stream;
  try {
    const a = E._priorQuickWerte(board, 1, [{idx: 179}, {idx: 182}]);
    assert.deepStrictEqual(a, E._priorQuickWerte(board, 1, [{idx: 179}, {idx: 182}]));
    assert.deepStrictEqual(E._priorArbeitsstand(), vor); assert.deepStrictEqual(board, vorBrett);
    pruefe(draws === 0 && Math.random === stream && a.every(Number.isFinite), 'kein Suchzufall verbraucht');
    assert.throws(() => E._priorQuickWerte(board, 1, [{idx: 9999}]));
    assert.deepStrictEqual(E._priorArbeitsstand(), vor); pruefe(Math.random === stream, 'auch bei Fehler zurückgesetzt');
  } finally { Math.random = rng; E.setzeFfEpoche(0); }
});
test('Einzelstellung: A und ausgeschaltet mit gleicher Suche und gleichem Zufallsverbrauch', () => {
  const P = E.PARAMS, old = {...P}, random = Math.random;
  Object.assign(P, {mctsFixedSims: 8, mctsTreeReuse: 0, mctsRolloutDepth: 2, mctsMaxDepth: 2, resignEnabled: 0});
  const board = new Uint8Array(361); board[180] = 1; board[181] = 2;
  const run = arm => {
    let n = 0; const rng = E._priorMulberry(77); Math.random = () => { n++; return rng(); };
    const result = E.getAIMove(board, 1, [E.computeZobrist(board)], {1: 0, 2: 0}, 80, 'hard', 1, null, null,
      arm ? {priorOhneOrakel: opt(arm)} : undefined);
    return {result, n, prot: E.lesePriorOhneOrakel()};
  };
  try {
    const a = run(null), b = run('A'); assert.deepStrictEqual(a.result, b.result);
    pruefeGleich(a.n, b.n, 'Zufallsverbrauch identisch');
    pruefe(b.prot && b.prot.neu && b.prot.kinder.length > 1, 'Wurzel protokolliert');
    assert.deepStrictEqual(B.pruefe(b.prot, opt('A')), []);
    const bad = JSON.parse(JSON.stringify(b.prot)); bad.kinder[0].pNach += 0.1;
    pruefe(B.pruefe(bad, opt('A')).length > 0, 'beschädigte Priors erkannt');
  } finally { Object.assign(P, old); Math.random = random; }
});
laufeTests('Prior-Anhebung ohne Orakel').then(ok => process.exit(ok ? 0 : 1));
