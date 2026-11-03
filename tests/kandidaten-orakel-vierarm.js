// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Vierarm-Versuch Kandidaten-Orakel (docs/kandidaten-orakel-vierarm.md):
     1. Engine an gebauten Listen: N und P je Fall gegen die Tabelle in §2; Stelle für Stelle
        S = N in d/d1 plus Anhebung (außer d1) und S = P in c; A unverändert; Prior-Summe 1; pEnd.
     2. Replay echter Stellungen (Schwarz und Weiß): N mit einem Orakelzug, der schon Kind ist, und P mit
        einem, der fehlt, sind bitgleich zum Default; N nimmt am ersten Fall d auf, ohne anzuheben.
     3. Bericht mit gebauten Daten: Probe ohne Endstand-Unterschiede, Hauptlauf mit sechs Tests;
        Bedingungen 10 und 11 und jede andere Verletzung → KEIN URTEIL.
     4. Workflows: nur von Hand, Arme A N P S, Seeds 233/234/235, Pakete decken 1 bis 480 ab.
   Aufruf:  node tests/kandidaten-orakel-vierarm.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const KI = ladeKI({mitNetz: false});
const P = KI.PARAMS, K = 16;
const wurzel = path.join(__dirname, '..');

const eintrag = (v, i) => ({m: {idx: 100 + i, x: (100 + i) % 19, y: Math.floor((100 + i) / 19)}, score: v});
function liste(scores, netz = null, lambda = 0.8) { const l = scores.map(eintrag); if (netz) { l.__pNetz = netz; l.__lambda = lambda; } return l; }
const absteigend = n => Array.from({length: n}, (_, i) => 1000 - 7 * i);
const prior = kids => kids.map(k => k.P);
const standard = l => JSON.stringify(KI.mctsKids(l, K));
const lauf = (l, arm, g) => { const kids = KI._mctsKidsOrakel(l, K, {arm, g}); return {kids, prot: {...KI.leseKandidatenOrakel()}}; };
const mit = (wert, f) => { const alt = P.mctsPriorSharp; P.mctsPriorSharp = wert; try { return f(); } finally { P.mctsPriorSharp = alt; } };

/* gebaute Fälle: Liste, Orakelzug, erwarteter Fall */
function faelle() {
  const l = liste(absteigend(60)), netzG = liste(absteigend(60), {[100 + 29]: 1}, 0.9);
  const kurz = liste(absteigend(17)), gleich = liste([...new Array(16).fill(500), ...new Array(14).fill(400)]), alle = liste(new Array(30).fill(500));
  return [
    [l, -1, 'a'], [l, null, 'x'], [l, 9999, 'b'], [l, 100, 'c1'], [l, 104, 'c'], [l, 115, 'c'], [l, 129, 'd'], [l, 159, 'd'],
    [netzG, 129, 'd1'], [kurz, 116, 'd0'], [gleich, 119, 'd'], [alle, 119, 'd1'],
  ];
}

test('N und P je Fall gegen die Tabelle (§2): wo kein Eingriff vorgesehen ist, bitgleich zum Default', () => {
  for (const [l, g, fall] of faelle()) {
    const n = lauf(l, 'N', g), p = lauf(l, 'P', g), a = lauf(l, 'A', g);
    pruefeGleich(n.prot.fall, fall, `N, g = ${g}: Fall`); pruefeGleich(p.prot.fall, fall, `P, g = ${g}: Fall`);
    pruefeGleich(JSON.stringify(a.kids), standard(l), `A, Fall ${fall}: bitgleich`);
    const d = fall === 'd' || fall === 'd1';
    if (d) {
      pruefe(n.prot.aufgenommen && !n.prot.angehoben && n.kids.length === 17, `N, Fall ${fall}: aufgenommen, nicht angehoben, 17 Kinder`);
      pruefe(Object.is(n.kids[16].P, KI._kandSoftmax(l, K, l.find(e => e.m.idx === g))[16]), `N, Fall ${fall}: natürlicher Prior P′`);
      pruefeGleich(n.kids[16].idx, g, `N, Fall ${fall}: 17. Kind ist g`);
    } else pruefeGleich(JSON.stringify(n.kids), standard(l), `N, Fall ${fall}: bitgleich zum Default`);
    if (fall === 'c') {
      pruefe(p.prot.angehoben && !p.prot.aufgenommen && p.kids.length === 16, `P, Fall c: angehoben, nicht aufgenommen`);
      const r = l.findIndex(e => e.m.idx === g);
      pruefe(p.kids.every((k, i) => Object.is(k.P, KI._kandAnheben(KI._kandSoftmax(l, K, null), r)[i])), 'P, Fall c: Spitzenprior wie Stufe 1');
    } else pruefeGleich(JSON.stringify(p.kids), standard(l), `P, Fall ${fall}: bitgleich zum Default`);
  }
});

test('Stelle für Stelle: S = P in Fall c; S = N in d/d1, in d zusätzlich angehoben; Eingriffsart je Arm (Bedingung 11)', () => {
  const B = require('../auswertung/kandidaten-orakel/vierarm-bericht.js');
  for (const [l, g, fall] of faelle()) {
    const s = lauf(l, 'S', g), n = lauf(l, 'N', g), p = lauf(l, 'P', g);
    if (fall === 'c') pruefeGleich(JSON.stringify(s.kids), JSON.stringify(p.kids), 'S = P in c');
    if (fall === 'd1') pruefeGleich(JSON.stringify(s.kids), JSON.stringify(n.kids), 'S = N in d1');
    if (fall === 'd') {
      const Q = KI._kandAnheben(prior(n.kids), 16);
      pruefe(s.kids.every((k, i) => k.idx === n.kids[i].idx && Object.is(k.P, Q[i])), 'S = N plus Anhebung in d');
    }
    for (const [arm, x] of [['A', lauf(l, 'A', g)], ['N', n], ['P', p], ['S', s]])
      pruefe(B.eingriffOk(arm, {fall: x.prot.fall, auf: x.prot.aufgenommen ? 1 : 0, ang: x.prot.angehoben ? 1 : 0}), `${arm}, Fall ${fall}: Eingriffsart`);
  }
  pruefe(!B.eingriffOk('N', {fall: 'd', auf: 1, ang: 1}) && !B.eingriffOk('P', {fall: 'd', auf: 1, ang: 0}) && !B.eingriffOk('A', {fall: 'c', ang: 1}) && !B.eingriffOk('S', {fall: 'd1', auf: 1, ang: 1}), 'falsche Eingriffsarten erkannt');
});

test('Prior-Summe 1 und pEnd = Prior des Orakelkindes (null, wenn g kein Kind ist), in allen Armen', () => {
  for (const [l, g, fall] of faelle()) for (const arm of ['A', 'N', 'P', 'S', 'ZS']) {
    const {kids, prot} = lauf(l, arm, g);
    pruefe(Math.abs(prot.priorSumme - 1) <= 1e-9 && prot.priorFehler === null, `${arm}, Fall ${fall}: Summe 1`);
    const kg = kids.find(k => k.idx === g);
    pruefe(kg ? Object.is(prot.pEnd, kg.P) : prot.pEnd === null, `${arm}, Fall ${fall}: pEnd`);
  }
  mit(0, () => { const {prot} = lauf(liste(absteigend(60)), 'N', 129); pruefe(prot.fall === 'e' && !prot.aufgenommen, 'entartete Rechnung: N greift nicht ein'); });
});

/* ---- Replay echter Stellungen ---- */
const R = require('../auswertung/diagnose/wurzel-replay.js');
let _E = null; const engine = () => _E || (_E = R.ladeEngine(path.join(wurzel, 'index.html')));
const ARCH = path.join(wurzel, 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz');
const BIS = 92;
for (const nr of [2, 1]) {
  test(`Replay Partie ${nr} (${nr === 2 ? 'KI Schwarz' : 'KI Weiß'}): N mit vorhandenem und P mit fehlendem Orakelzug bitgleich; N nimmt am ersten d auf`, () => {
    const row = R.lies(ARCH).find(x => x.nr === nr), d = R.replay(engine(), row, {bis: BIS});
    const gRang = rang => mc => { const z = d.zuege.find(q => q.mc === mc); return z && z.nach ? z.nach[rang - 1] : -1; };
    const mitArm = (arm, g) => R.replay(engine(), row, {bis: BIS, extra: mc => mc >= 80 ? {kandidatenOrakel: {arm, g: g(mc)}} : undefined});
    const gleich = (x, txt) => x.zuege.forEach((z, k) => { pruefeGleich(z.gewaehlt, d.zuege[k].gewaehlt, `${txt}: Zug mc ${z.mc}`); pruefeGleich(JSON.stringify(z.kids), JSON.stringify(d.zuege[k].kids), `${txt}: Kinder mc ${z.mc}`); });
    gleich(mitArm('N', gRang(5)), 'N, g auf Rang 5');
    gleich(mitArm('P', gRang(30)), 'P, g auf Rang 30');
    const n = mitArm('N', gRang(30)), e = n.zuege.find(z => z.prot && z.prot.fall === 'd');
    pruefe(!!e && e.kids.length === 17 && e.prot.aufgenommen && !e.prot.angehoben, 'N: erster Fall d mit 17 Kindern, nicht angehoben');
    pruefeGleich(JSON.stringify(e.kids.slice(0, 16)), JSON.stringify(d.zuege.find(q => q.mc === e.mc).kids), 'N: erste 16 Kinder wie im Default');
  });
}

/* ---- Bericht mit gebauten Daten ---- */
const B = require('../auswertung/kandidaten-orakel/vierarm-bericht.js');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vierarm-'));
const zeilenGz = d => require('zlib').gunzipSync(fs.readFileSync(d)).toString('utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
function partie(nr, arm, opt = {}) {
  const f = nr % 2 === 0 ? 'S' : 'W', mcs = f === 'S' ? [80, 82, 84] : [81, 83, 85];
  /* Auslöser: erst c, dann d; Eingriffe je Arm nach der Tabelle */
  const ev = mcs.map((mc, k) => {
    const fall = ['c', 'd', 'a'][k], auf = fall === 'd' && (arm === 'N' || arm === 'S') ? 1 : 0, ang = (fall === 'c' && (arm === 'P' || arm === 'S')) || (fall === 'd' && arm === 'S') ? 1 : 0;
    return {mc, f, g: 5 + k, fall, r: fall === 'a' ? 0 : 10 + k, rn: fall === 'a' ? 0 : 11 + k, auf, ang, pG: 0.05, pE: auf || fall === 'c' ? 0.2 : null,
      b: {g: fall === 'c' || auf ? (k === 0 ? 0 : 3) : null}, i: 5, gl: k === 0 ? 1 : 0, ps: 1};
  });
  if (opt.art && arm === 'N') ev[0].ang = 1;
  if (opt.ausloeser && arm === 'P' && nr === 2) ev[0].rn = 99;
  const versatz = {A: 0, N: 2, P: 1, S: 4}[arm];
  return {nr, wirFarbe: f, endstand: versatz + (nr % 5), gewonnen: nr % 3 === 0, zuegeAnzahl: 86, zuege: Array.from({length: 86}, (_, k) => 'D' + (k % 19 + 1)),
    ...(opt.abgebrochen ? {abgebrochen: 'GNU Go beendet', endstand: undefined} : {}),
    ...(opt.ohneProt ? {} : {kandidatenOrakel: {arm, ab: 80, abfragen: 3, ohneAntwort: 0, abfrageMs: 10, partieMs: 1000 * nr, ereignisse: ev}})};
}
function baue(n, opt = {}) {
  const d = temp();
  for (const o of ['g', 'f']) for (const arm of B.ARME) {
    const l = []; for (let nr = 1; nr <= (typeof n === 'object' ? n[o] : n); nr++) l.push(partie(nr, arm, {...opt, abgebrochen: opt.abgebrochen && o === 'f' && arm === 'P' && nr === 4,
      ohneProt: opt.ohneProt && o === 'g' && arm === 'N' && nr === 3}));
    fs.writeFileSync(path.join(d, `${o}-${arm}.jsonl`), l.map(x => JSON.stringify(x) + '\n').join(''));
    fs.writeFileSync(path.join(d, `wiederholung-${o}-${arm}.jsonl`), l.filter(x => x.nr <= 3).map(x => JSON.stringify(x) + '\n').join(''));
  }
  fs.writeFileSync(path.join(d, 'kontrolle.jsonl'), zeilenGz(ARCH).filter(r => r.nr <= 4).map(r => JSON.stringify(r) + '\n').join(''));
  return d;
}

test('Bericht Probe: gültig, nur Technik, keine Endstand-Unterschiede; Protokoll getrennt nach c und d', () => {
  const e = B.bewerte(baue({g: 8, f: 4}), ARCH, {g: 8, f: 4}, true);
  pruefe(e.gueltig, 'gültig: ' + e.gruende.join(' | '));
  const t = B.bericht(e);
  pruefe(!/Hauptvergleiche/.test(t) && !/Ergänzend/.test(t) && /keine\*\* Endstand-Unterschiede/.test(t), 'keine Effekte in der Probe');
  pruefe(/schon Kind \(c\)/.test(t) && /neu \(d, d1\)/.test(t) && /Nach Farbe und Spielphase/.test(t), 'Protokoll getrennt');
  const ph = B.protokoll(e).phasen, z = ph.find(x => x.o === 'g' && x.a === 'S' && x.gruppe === 'neu (d, d1)' && x.f === 'S' && x.ph === '81–160');
  pruefe(z && z.n === 4 && z.pG[1] === 0.05 && z.pE[1] === 0.2 && z.besuche[1] === 3, 'Quartile von Prior und Besuchen je Farbe und Phase: ' + JSON.stringify(z));
  pruefe(/\| natürlicher Prior \| endgültiger Prior \| aufgenommen \| angehoben \| Kind \| null Besuche \(von Kind\) \| Besuche Median \[Quartile\] \| gespielt \|/.test(t.slice(t.indexOf('### Nach Farbe und Spielphase'))), 'Spalten in der Tabelle nach Farbe und Phase');
});

test('Bericht Hauptlauf: sechs Tests mit 99,17 %, Additivität der Mittelwerte, vollständige Vierergruppen', () => {
  const e = B.bewerte(baue(100, {abgebrochen: true}), ARCH, {g: 100, f: 100}, false);
  pruefe(e.gueltig, 'gültig: ' + e.gruende.join(' | '));
  const a = B.auswerten(e);
  pruefeGleich(a.g.haupt.length, 3, 'drei Hauptvergleiche je Gegner');
  pruefeGleich(a.g.haupt.map(v => v.x + '-' + v.y).join(','), 'N-A,S-N,P-A', 'Reihenfolge');
  pruefeGleich(a.g.haupt[0].mittel, 2, 'N − A = 2 (gebaut)'); pruefeGleich(a.g.haupt[2].mittel, 1, 'P − A = 1');
  pruefeGleich(a.f.vollePaare, 99, 'Fuego: ein Ausfall in P → 99 Vierergruppen');
  pruefe(a.f.haupt.every(v => v.n === 99) && a.f.erg.every(v => v.n === 99), 'alle Vergleiche auf denselben 99');
  pruefe(Math.abs(a.f.additiv.NA + a.f.additiv.SN - a.f.additiv.SA) < 1e-12, '(N − A) + (S − N) = S − A');
  const t = B.bericht(e);
  pruefe(/99,17 %/.test(t) && /keine Zerlegung in unabhängige Mechanismen/.test(t) && /\*\*99 vollständige Vierergruppen\*\*/.test(t), 'Bericht');
  pruefe(Math.abs(B.ALPHA_PRIMAER - 0.05 / 6) < 1e-15, 'α = 0,05/6');
});

test('Fehlendes Pflichtprotokoll → KEIN URTEIL (Probe und Hauptlauf); zulässige Ausfälle getrennt, nicht prüfbare Gruppen ausdrücklich', () => {
  for (const [probe, n] of [[true, {g: 8, f: 4}], [false, {g: 8, f: 8}]]) {
    const e = B.bewerte(baue(n, {ohneProt: true}), ARCH, n, probe);
    pruefe(!e.gueltig && e.gruende.some(g => /Bedingung P: .*Nr\. 3: Pflichtprotokoll fehlt/.test(g)), (probe ? 'Probe' : 'Hauptlauf') + ': ' + e.gruende.join(' | '));
    pruefe(e.ausfaelle.length === 0, 'fehlendes Protokoll ist kein zulässiger Ausfall');
  }
  const p = B.bewerte(baue({g: 8, f: 4}, {abgebrochen: true}), ARCH, {g: 8, f: 4}, true);
  pruefe(p.gueltig && p.ausfaelle.length === 1 && p.ausl.f.nichtPruefbar.join() === '4', 'Probe: Ausfall berichtet, Gruppe f4 nicht prüfbar: ' + p.gruende.join(' | '));
  const t = B.bericht(p), i = t.indexOf('## Technische Prüfungen'), j = t.indexOf('## Zulässige Partieausfälle');
  pruefe(i >= 0 && j > i && /\| 10 \| erste Auslösestelle.*\| 1 Vierergruppen \(Ausfall in einem Arm\): f4 \| bestanden \|/.test(t), 'Prüfung 10 mit nicht prüfbarer Gruppe');
  pruefe(/\| Fuego \(100 Spiele je Zug\) \| P \| 4 \| Schwarz \| abgebrochen: GNU Go beendet \|/.test(t.slice(j)), 'Ausfall im eigenen Abschnitt');
  const h = B.bewerte(baue(100, {abgebrochen: true}), ARCH, {g: 100, f: 100}, false);
  pruefe(h.gueltig && h.pruefungen.find(x => x.nr === '2').ok && h.pruefungen.find(x => x.nr === '10').nichtPruefbar.includes('f4'), 'Hauptlauf: zulässiger Ausfall getrennt von bestandenen Prüfungen');
  pruefe(h.pruefungen.every(x => x.ok) && h.pruefungen.map(x => x.nr).join() === '1,P,2,3,4,5,6,7,8,10,11', 'alle Prüfungen in fester Reihenfolge');
});

test('Bericht: Verletzungen → KEIN URTEIL ohne Effekt (Bedingung 10, 11, Ausfälle, Kontrolle)', () => {
  for (const [opt, re] of [[{art: true}, /Bedingung 11/], [{ausloeser: true}, /Bedingung 10/]]) {
    const e = B.bewerte(baue(8, opt), ARCH, {g: 8, f: 8}, false);
    pruefe(!e.gueltig && e.gruende.some(g => re.test(g)), JSON.stringify(opt) + ': ' + e.gruende.join(' | '));
    pruefe(!/Hauptvergleiche/.test(B.bericht(e)), 'kein Effekt');
  }
  const d = baue(8); fs.writeFileSync(path.join(d, 'kontrolle.jsonl'), '');
  pruefe(B.bewerte(d, ARCH, {g: 8, f: 8}, false).gruende.some(g => /Bedingung 3/.test(g)), 'Kontrolle fehlt');
  const v = baue(8); fs.writeFileSync(path.join(v, 'g-N.jsonl'), fs.readFileSync(path.join(v, 'g-N.jsonl'), 'utf8').split('\n').slice(1).join('\n'));
  const ev = B.bewerte(v, ARCH, {g: 8, f: 8}, false);
  pruefe(!ev.gueltig && !ev.vollstaendig, 'fehlende Partie: unvollständig');
});

/* ---- Workflows ---- */
test('Workflows: nur von Hand, Arme A N P S, Seeds 233/234/235, Pakete 1 bis 480, Zeitlimits, Sicherung', () => {
  const job = (y, name) => new RegExp('^  ' + name + ':\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|$(?![\\s\\S]))', 'm').exec(y)[1];
  for (const [datei, probe] of [['kandidaten-orakel-vierarm.yml', false], ['kandidaten-orakel-vierarm-probe.yml', true]]) {
    const y = fs.readFileSync(path.join(wurzel, '.github/workflows', datei), 'utf8');
    pruefe(/^on:\n  workflow_dispatch:\n/m.test(y) && !/^\s*(push|pull_request|schedule):/m.test(y), datei + ': nur workflow_dispatch');
    pruefe((y.match(/arm: \[A, N, P, S\]/g) || []).length === (probe ? 2 : 3) && !/ZS/.test(y), datei + ': Arme A N P S');
    pruefe(probe ? /SEED_G: '233'/.test(y) && /SEED_F: '233'/.test(y) : /SEED_G: '234'/.test(y) && /SEED_F: '235'/.test(y), datei + ': Seeds');
    pruefe(/kandidaten-orakel-vierarm\.js/.test(job(y, 'pruefen')) && /vierarm-bericht\.js/.test(job(y, 'ergebnis')), datei + ': Tests als Tor, Vierarm-Bericht');
    pruefe(probe ? /--probe/.test(job(y, 'ergebnis')) : !/--probe/.test(y), datei + ': Probe-Modus nur in der Probe');
    for (const j of probe ? ['gnugo', 'fuego', 'kontrolle'] : ['gnugo', 'fuego', 'wiederholung', 'kontrolle']) {
      const k = job(y, j), jobMin = +/^    timeout-minutes: (\d+)/m.exec(k)[1], schritt = [...k.matchAll(/^        timeout-minutes: (\d+)/gm)].map(m => +m[1]);
      pruefe(schritt.length && schritt.every(s => s < jobMin) && jobMin <= 360, `${datei} ${j}: Zeitlimits`);
      pruefe(/if: always\(\)\n        uses: actions\/upload-artifact@v7/.test(k) && /overwrite: true/.test(k) && /\|\| status=\$\?/.test(k), `${datei} ${j}: Sicherung`);
    }
    pruefe((y.match(/^      contents: write/gm) || []).length === 1 && !/--force|push -f|refs\/heads\/main/.test(y), datei + ': Schreibrecht nur im Ergebnis, kein Force');
    if (!probe) for (const [j, anz] of [['gnugo', 30], ['fuego', 20]]) {
      const v = /^        von: \[([^\]]+)\]/m.exec(job(y, j))[1].split(',').map(Number), s = new Set();
      for (const a of v) for (let nr = a; nr < a + anz; nr++) s.add(nr);
      pruefe(s.size === 480 && v.length * anz === 480 && v.every(a => a % 2 === 1), `${j}: Pakete zu ${anz} decken 1 bis 480`);
    }
  }
});

laufeTests('Kandidaten-Orakel Vierarm').then(ok => process.exit(ok ? 0 : 1));
