// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Kandidaten-Orakel, Stufe 1 (docs/kandidaten-orakel.md): die Wurzelkinder mit Eingriff, an gebauten
   Kandidatenlisten. Die Randfälle aus §2 werden ausdrücklich gegen das Default-Verhalten geprüft:
   ohne Eingriff (Arm A, Fälle a, x, b, c1, d0, e) ist jedes Kind und jeder Prior bitgleich wie in
   _mctsKids; bei Aufnahme sind die Priors der 16 Basiskinder genau die Default-Priors, nur mit der
   Normierung über 17; gleiche Scores, gleicher Prior und Zusatzkind mit höchstem Prior (d1) verhalten
   sich wie festgelegt.
   Aufruf:  node tests/kandidaten-orakel.js */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const KI = ladeKI({mitNetz: false});
const P = KI.PARAMS, K = 16;

const eintrag = (v, i) => ({m: {idx: 100 + i, x: (100 + i) % 19, y: Math.floor((100 + i) / 19)}, score: v});
function liste(scores, netz = null, lambda = 0.8) {
  const l = scores.map(eintrag);
  if (netz) { l.__pNetz = netz; l.__lambda = lambda; }
  return l;
}
const absteigend = n => Array.from({length: n}, (_, i) => 1000 - 7 * i);
const summe = a => a.reduce((x, y) => x + y, 0);
const nah = (a, b, t = 1e-12) => Math.abs(a - b) <= t;
const prior = kids => kids.map(k => k.P);
const standardKinder = l => KI.mctsKids(l, K);
const mit = async (wert, f) => { const alt = P.mctsPriorSharp; P.mctsPriorSharp = wert; try { return await f(); } finally { P.mctsPriorSharp = alt; } };

test('Rechenbeispiel aus §2 (K = 3, σ = 3): Basisprior, Aufnahme, Spitzenprior', () => {
  const alt = P.mctsPriorSharp; P.mctsPriorSharp = 3;
  try {
    const l = liste([10, 8, 4, 2]);
    const p0 = KI._kandSoftmax(l, 3, null), pa = KI._kandSoftmax(l, 3, l[3]);
    [0.7054, 0.2595, 0.0351].forEach((v, i) => pruefe(nah(p0[i], v, 5e-5), `Basisprior ${i}: ${p0[i]}`));
    [0.6964, 0.2562, 0.0347, 0.0128].forEach((v, i) => pruefe(nah(pa[i], v, 5e-5), `Aufnahme ${i}: ${pa[i]}`));
    pruefe(nah(summe(pa), 1), 'Summe 1');
    const q = KI._kandAnheben(pa, 3);
    [0.4136, 0.1522, 0.0206, 0.4136].forEach((v, i) => pruefe(nah(q[i], v, 5e-5), `Spitzenprior ${i}: ${q[i]}`));
    pruefe(nah(summe(q), 1), 'Summe 1 nach Anhebung');
  } finally { P.mctsPriorSharp = alt; }
});

test('Ohne Zusatz ist _kandSoftmax Bit für Bit der Prior von _mctsKids (verschiedene Listen, auch gleiche Scores, NaN, Netz)', () => {
  const faelle = {
    absteigend: liste(absteigend(40)),
    alleGleich: liste(new Array(40).fill(500)),
    gleichstaende: liste([900, 900, 800, 800, 800, 700, 700, 600, 600, 600, 500, 500, 400, 400, 300, 300, 200, 200, 100, 100]),
    mitNaN: liste(absteigend(40).map((v, i) => (i === 3 || i === 20 ? NaN : v))),
    mitNetz: liste(absteigend(40), {100: 0.2, 103: 0.3, 125: 0.4, 130: 0.1}),
    ungeordnet: liste([300, 1000, 20, 800, 750, 5, 640, 630, 420, 410, 300, 250, 100, 90, 80, 70, 60, 50, 40]),
  };
  for (const [name, l] of Object.entries(faelle)) {
    const p = KI._kandSoftmax(l, K, null), d = prior(standardKinder(l));
    pruefeGleich(p.length, d.length, name + ': Länge');
    pruefe(p.every((v, i) => Object.is(v, d[i])), name + ': bitgleich zum Default');
  }
});

test('Arm A und alle Fälle ohne Eingriff liefern genau die Default-Kinder (Pass, keine Antwort, nicht gelistet, c1, d0, entartet)', () => {
  const l = liste(absteigend(60)), standard = JSON.stringify(standardKinder(l));
  const fall = (o, erwartet, liste_ = l) => {
    const kids = KI._mctsKidsOrakel(liste_, K, o), prot = KI.leseKandidatenOrakel();
    pruefeGleich(prot.fall, erwartet, `Fall ${JSON.stringify(o)}`);
    pruefeGleich(JSON.stringify(kids), JSON.stringify(standardKinder(liste_)), `Kinder ${erwartet} unverändert`);
    pruefe(!prot.aufgenommen && !prot.angehoben, `${erwartet}: weder aufgenommen noch angehoben`);
  };
  fall({arm: 'S', g: -1}, 'a'); fall({arm: 'ZS', g: -1}, 'a');
  fall({arm: 'S', g: null}, 'x'); fall({arm: 'S'}, 'x'); fall({arm: 'S', g: NaN}, 'x');   /* null ≥ 0 wäre in JavaScript wahr: darf nicht als Zug 0 gelten */
  fall({arm: 'S', g: 9999}, 'b'); fall({arm: 'ZS', g: 9999}, 'b');
  for (const g of [-1, 9999, 100, 104, 129, 140]) {      /* Rang 1, 5, 30, 41 und nicht gelistet */
    const kids = KI._mctsKidsOrakel(l, K, {arm: 'A', g});
    pruefeGleich(JSON.stringify(kids), standard, `Arm A, g = ${g}: bitgleich zum Default`);
  }
  const kurz = liste(absteigend(17));
  fall({arm: 'S', g: kurz[16].m.idx}, 'd0', kurz); fall({arm: 'ZS', g: kurz[16].m.idx}, 'd0', kurz);
  return mit(0, () => {
    const kids = KI._mctsKidsOrakel(l, K, {arm: 'S', g: 129}), prot = KI.leseKandidatenOrakel();
    pruefeGleich(prot.fall, 'e', 'entartete Rechnung (σ = 0)');
    pruefeGleich(JSON.stringify(kids), JSON.stringify(standardKinder(l)), 'Rang-Prior unverändert');
  });
});

test('Fall (d), Arm S: g als 17. Kind, Spitzenprior gleichauf mit dem größten, Summe 1; Basispriors = Default × Normierung', () => {
  const l = liste(absteigend(60)), g = l[29].m.idx;       /* Rang 30 */
  const kids = KI._mctsKidsOrakel(l, K, {arm: 'S', g}), prot = KI.leseKandidatenOrakel();
  pruefeGleich(prot.fall, 'd', 'Fall'); pruefeGleich(prot.r, 30, 'Rang'); pruefeGleich(prot.rn, 31, 'Nachbar-Rang'); pruefeGleich(prot.nIdx, l[30].m.idx, 'Nachbar');
  pruefe(prot.aufgenommen && prot.angehoben && prot.kinder === 17, 'aufgenommen, angehoben, 17 Kinder');
  pruefeGleich(kids.length, 17, '17 Kinder'); pruefeGleich(kids[16].idx, g, 'Kind 17 ist g'); pruefe(kids[16].N === 0 && kids[16].W === 0 && kids[16].kids === null, 'frisches Kind');
  pruefe(nah(summe(prior(kids)), 1), 'Summe 1');
  pruefe(Object.is(kids[16].P, Math.max(...prior(kids.slice(0, 16)))), 'Spitzenprior gleichauf mit dem größten anderen');
  /* natürlicher Prior und Verhältnis zu den Default-Priors */
  const pg = KI._kandSoftmax(l, K, l[29]), p0 = KI._kandSoftmax(l, K, null);
  pruefeGleich(prot.pG, pg[16], 'natürlicher Prior im Protokoll');
  const verh = pg.slice(0, 16).map((v, i) => v / p0[i]);
  pruefe(verh.every(v => nah(v, verh[0], 1e-12)) && verh[0] < 1, 'Basispriors = Default × gemeinsamer Faktor < 1 (Temperatur der ersten 16 festgehalten)');
});

test('Fall (d), Arm ZS: der Rang-Nachbar statt g, gleiche Priorbehandlung', () => {
  const l = liste(absteigend(60)), g = l[29].m.idx, n = l[30].m.idx;
  const s = KI._mctsKidsOrakel(l, K, {arm: 'S', g}), ps = KI.leseKandidatenOrakel();
  const z = KI._mctsKidsOrakel(l, K, {arm: 'ZS', g}), pz = KI.leseKandidatenOrakel();
  pruefeGleich(z.length, 17, '17 Kinder'); pruefeGleich(z[16].idx, n, 'Kind 17 ist der Nachbar');
  pruefeGleich(pz.fall, ps.fall, 'gleicher Fall'); pruefeGleich(pz.r, ps.r, 'gleicher Rang'); pruefeGleich(pz.rn, ps.rn, 'gleicher Nachbar-Rang');
  pruefeGleich(pz.pG, ps.pG, 'beide natürlichen Priors im Protokoll'); pruefeGleich(pz.pN, ps.pN, 'beide natürlichen Priors im Protokoll');
  pruefe(Object.is(z[16].P, Math.max(...prior(z.slice(0, 16)))), 'Spitzenprior gleichauf');
  pruefe(nah(summe(prior(z)), 1), 'Summe 1');
  /* beide Arme: dieselben Kinder 1 bis 16 (Idx) */
  pruefeGleich(s.slice(0, 16).map(k => k.idx).join(), z.slice(0, 16).map(k => k.idx).join(), 'dieselben 16 Basiskinder');
  /* Nachbar am Listenende: r − 1 */
  const ende = liste(absteigend(40)), gE = ende[39].m.idx;
  KI._mctsKidsOrakel(ende, K, {arm: 'ZS', g: gE});
  pruefeGleich(KI.leseKandidatenOrakel().rn, 39, 'g am Listenende: Nachbar ist r − 1');
});

test('Fall (c): g ist schon Kind; Spitzenprior für g (S) beziehungsweise den Nachbarn (ZS), 16 Kinder, Summe 1', () => {
  const l = liste(absteigend(60)), g = l[4].m.idx;        /* Rang 5 */
  const s = KI._mctsKidsOrakel(l, K, {arm: 'S', g}), ps = KI.leseKandidatenOrakel();
  pruefeGleich(ps.fall, 'c', 'Fall'); pruefe(ps.angehoben && !ps.aufgenommen && s.length === 16, 'angehoben, nicht aufgenommen, 16 Kinder');
  pruefe(nah(summe(prior(s)), 1), 'Summe 1'); pruefe(Object.is(s[4].P, Math.max(...prior(s.filter((k, i) => i !== 4)))), 'g gleichauf mit dem größten anderen');
  const z = KI._mctsKidsOrakel(l, K, {arm: 'ZS', g}), pz = KI.leseKandidatenOrakel();
  pruefeGleich(pz.rn, 6, 'Nachbar Rang 6'); pruefe(Object.is(z[5].P, Math.max(...prior(z.filter((k, i) => i !== 5)))), 'Nachbar gleichauf mit dem größten anderen');
  pruefeGleich(pz.pG, ps.pG, 'natürliche Priors gleich im Protokoll');
  /* Nachbar bei Rang 16: Rang 15 */
  KI._mctsKidsOrakel(l, K, {arm: 'ZS', g: l[15].m.idx});
  pruefeGleich(KI.leseKandidatenOrakel().rn, 15, 'g bei Rang 16: Nachbar Rang 15');
});

test('Fall (c1): größter Prior bei g oder beim Nachbarn → in beiden Armen kein Eingriff', () => {
  const l = liste(absteigend(60));
  const standard = JSON.stringify(standardKinder(l));
  for (const arm of ['S', 'ZS']) {
    pruefeGleich(JSON.stringify(KI._mctsKidsOrakel(l, K, {arm, g: l[0].m.idx})), standard, `${arm}: g = Rang 1 (größter Prior)`);
    pruefeGleich(KI.leseKandidatenOrakel().fall, 'c1', `${arm}: Fall c1`);
  }
  /* Nachbar hat den größten Prior: Listenposition 1 hat Score 5, Position 2 hat den höchsten */
  const u = liste([5, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30]);
  for (const arm of ['S', 'ZS']) {
    pruefeGleich(JSON.stringify(KI._mctsKidsOrakel(u, K, {arm, g: u[0].m.idx})), JSON.stringify(standardKinder(u)), `${arm}: Nachbar mit größtem Prior`);
    pruefeGleich(KI.leseKandidatenOrakel().fall, 'c1', `${arm}: Fall c1 über den Nachbarn`);
  }
});

test('Randfall d1: Zusatzkind schon mit höchstem Prior (Netz-Anteil) → Aufnahme ohne Anhebung, in S und ZS', () => {
  const g0 = liste(absteigend(60)), g = g0[29].m.idx, n = g0[30].m.idx;
  for (const [name, netz] of [['g', {[g]: 1}], ['Nachbar', {[n]: 1}]]) {
    const l = liste(absteigend(60), netz, 0.9);
    const s = KI._mctsKidsOrakel(l, K, {arm: 'S', g}), ps = KI.leseKandidatenOrakel();
    const z = KI._mctsKidsOrakel(l, K, {arm: 'ZS', g}), pz = KI.leseKandidatenOrakel();
    pruefeGleich(ps.fall, 'd1', `${name}: Fall S`); pruefeGleich(pz.fall, 'd1', `${name}: Fall ZS`);
    pruefe(ps.aufgenommen && pz.aufgenommen && !ps.angehoben && !pz.angehoben, `${name}: beide Arme nehmen auf, keiner hebt an`);
    pruefeGleich(s.length, 17, `${name}: 17 Kinder`); pruefeGleich(z.length, 17, `${name}: 17 Kinder`);
    pruefe(Object.is(s[16].P, KI._kandSoftmax(l, K, l[29])[16]), `${name}: S behält den natürlichen Prior`);
    pruefe(Object.is(z[16].P, KI._kandSoftmax(l, K, l[30])[16]), `${name}: ZS behält den natürlichen Prior`);
    pruefe(nah(summe(prior(s)), 1) && nah(summe(prior(z)), 1), `${name}: Summe 1`);
  }
});

test('Randfall gleiche Scores: Zusatz mit schlechterem Score hat den natürlichen Prior 0, Basispriors bleiben Default, Anhebung auf 1/17; Zusatz mit gleichem Score → d1', () => {
  const l = liste([...new Array(16).fill(500), ...new Array(14).fill(400)]);     /* g auf Rang 20, Score 400 < hi */
  const g = l[19].m.idx, p0 = KI._kandSoftmax(l, K, null), pg = KI._kandSoftmax(l, K, l[19]);
  pruefe(p0.every(v => v === 1 / 16), 'Default: gleichverteilt (1/16)');
  pruefeGleich(pg[16], 0, 'natürlicher Prior des schlechteren Zusatzes ist 0'); pruefe(pg.slice(0, 16).every((v, i) => v === p0[i]), 'Basispriors bleiben exakt der Default');
  const s = KI._mctsKidsOrakel(l, K, {arm: 'S', g}), prot = KI.leseKandidatenOrakel();
  pruefeGleich(prot.fall, 'd', 'Fall d'); pruefeGleich(prot.pG, 0, 'Protokoll: natürlicher Prior 0');
  pruefe(prior(s).every(v => nah(v, 1 / 17, 1e-15)), 'nach der Anhebung alle 1/17');
  /* alle gleich, g gleich */
  const e = liste(new Array(30).fill(500)), ge = e[19].m.idx;
  const sE = KI._mctsKidsOrakel(e, K, {arm: 'S', g: ge}), pE = KI.leseKandidatenOrakel();
  pruefeGleich(pE.fall, 'd1', 'gleicher Score wie die anderen: Prior gleichauf → d1 (≥)'); pruefe(pE.aufgenommen && !pE.angehoben, 'Aufnahme ohne Anhebung');
  pruefe(prior(sE).every(v => nah(v, 1 / 17, 1e-15)), 'alle 1/17');
});

test('Randfall gleicher Rang bei gleichem Score: Rang ist die Position in der Liste, der Nachbar die Position r ± 1', () => {
  const l = liste(new Array(40).fill(100));
  KI._mctsKidsOrakel(l, K, {arm: 'ZS', g: l[24].m.idx});
  const prot = KI.leseKandidatenOrakel();
  pruefeGleich(prot.r, 25, 'Rang = Position'); pruefeGleich(prot.rn, 26, 'Nachbar = Position 26'); pruefeGleich(prot.nIdx, l[25].m.idx, 'Nachbar-Zug');
});

test('Randfall gleicher Prior beim Vergleich: R(c) ≥ M gilt auch bei Gleichheit (kein Eingriff)', () => {
  pruefe(KI._kandMax([0.5, 0.5, 0], 0).ok === false, 'Gleichstand mit dem größten anderen: nicht anhebbar');
  pruefe(KI._kandMax([0.4, 0.5, 0.1], 0).ok === true, 'darunter: anhebbar');
  pruefe(KI._kandMax([0.6, 0.3, 0.1], 0).ok === false, 'darüber: nicht anhebbar');
  pruefe(KI._kandMax([NaN, 0.5, 0], 0).ok === false, 'NaN: kein Eingriff');
});

test('Laufzeitprüfung der Prior-Summe: Protokoll führt die Summe der Kinder, Fehlerprotokoll nur bei Abweichung > 1e-9, Kinder unverändert', () => {
  const faelle = [
    [liste(absteigend(60)), [-1, null, 9999, 100, 104, 115, 129, 159]],
    [liste(absteigend(60), {100: 0.2, 103: 0.3, 125: 0.4, 130: 0.1}), [100, 104, 125, 129]],
    [liste([...new Array(16).fill(500), ...new Array(14).fill(400)]), [119]],
    [liste(new Array(30).fill(500)), [119]],
    [liste(absteigend(17)), [116]],
  ];
  let n = 0;
  for (const [l, gs] of faelle) for (const g of gs) for (const arm of ['A', 'S', 'ZS']) {
    const kids = KI._mctsKidsOrakel(l, K, {arm, g}), prot = KI.leseKandidatenOrakel();
    let soll = 0; for (const k of kids) soll += k.P;
    pruefe(Object.is(prot.priorSumme, soll), `${arm}, g = ${g}, Fall ${prot.fall}: Summe im Protokoll = Summe der Kinder`);
    pruefe(Math.abs(prot.priorSumme - 1) <= 1e-9 && prot.priorFehler === null, `${arm}, g = ${g}: Summe 1, kein Fehlereintrag`);
    n++;
  }
  pruefe(n >= 40, 'genug Fälle');
  const l = liste(absteigend(60));
  pruefeGleich(JSON.stringify(KI._mctsKidsOrakel(l, K, {arm: 'A', g: 129})), JSON.stringify(standardKinder(l)), 'Arm A mit Summenprüfung bitgleich zum Default');
  return mit(0, () => {
    KI._mctsKidsOrakel(l, K, {arm: 'S', g: 129});
    const p = KI.leseKandidatenOrakel();
    pruefe(p.fall === 'e' && Math.abs(p.priorSumme - 1) <= 1e-9, 'entartete Rechnung: Summe des Rang-Priors protokolliert');
  });
});

laufeTests('Kandidaten-Orakel').then(ok => process.exit(ok ? 0 : 1));
