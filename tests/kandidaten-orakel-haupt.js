// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Hauptversuch Kandidaten-Orakel (docs/kandidaten-orakel.md §12), ohne GNU Go:
     1. paket.js: Fortsetzen ohne erneutes Rechnen fertiger Partien (Ersatz für spielen.sh),
        abgeschnittene letzte Zeile, Abbruch mitten im Paket, abweichender Stand → Exit 3.
     2. paket.js mit dem echten spielen.sh und der GTP-Attrappe: eine Partie je Prozess ergibt
        dieselbe Partie wie im durchlaufenden Prozess (Voraussetzung für das Fortsetzen).
     3. zusammenfuehren.js: Pakete sortiert zusammen, uneinheitlicher Stand → Fehler.
     4. haupt-bericht.js: Statistik gegen Tabellenwerte, Gültigkeit mit gebauten Daten, jede
        Verletzung → KEIN URTEIL ohne Effekt.
     5. Workflow: nur von Hand, Pakete decken 1 bis 480 ab, Zeitlimits, Sicherung, Schreibrecht.
   Aufruf:  node tests/kandidaten-orakel-haupt.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich} = require('./rahmen');
const wurzel = path.join(__dirname, '..');
const PAKET = path.join(wurzel, 'auswertung/kandidaten-orakel/paket.js');
const B = require('../auswertung/kandidaten-orakel/haupt-bericht.js');
const Z = require('../auswertung/kandidaten-orakel/zusammenfuehren.js');
const ARCH = path.join(wurzel, 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kand-haupt-'));
const zeilen = d => fs.existsSync(d) ? fs.readFileSync(d, 'utf8').split('\n').filter(z => z.trim()) : [];

/* ---- 1. Fortsetzen mit einem Ersatz für spielen.sh ---- */
const ersatzOrdner = temp(), ERSATZ = path.join(ersatzOrdner, 'ersatz.js');
fs.writeFileSync(ERSATZ, `'use strict';
const fs = require('fs');
const [skript, gegner, arm, nr, anzahl, seed, aus] = process.argv.slice(1);
fs.appendFileSync(process.env.ERSATZ_LOG, nr + '\\n');
if (process.env.ERSATZ_FEHLER === nr) process.exit(7);
fs.writeFileSync(aus, JSON.stringify({nr: +nr, seed: +seed, gegner, arm, anzahl: +anzahl, zusatz: process.env.DUELL_ZUSATZ}) + '\\n');
`);
/* paket.js ruft "bash <SPIELEN> ..." auf; ein kleines Shell-Skript leitet an den Ersatz weiter */
const ERSATZ_SH = path.join(ersatzOrdner, 'ersatz.sh');
fs.writeFileSync(ERSATZ_SH, `exec "${process.execPath}" "${ERSATZ}" "$@"\n`);
function paket(args, env = {}) {
  return spawnSync(process.execPath, [PAKET, ...args], {encoding: 'utf8', timeout: 60000,
    env: {...process.env, KANDIDATEN_SPIELEN: ERSATZ_SH, ARME: path.join(wurzel, 'auswertung/komponenten/arme-o.sh'), VORGABE: '0', ...env}});
}
const STD = aus => ['--gegner', 'g', '--arm', 'S', '--von', '31', '--anzahl', '5', '--seed', '231', '--aus', aus];

test('paket.js: frisch alle Partien, einzeln, mit --kandidaten-orakel; zweiter Aufruf rechnet nichts', () => {
  const d = temp(), aus = path.join(d, 'g-S-31.jsonl'), log = path.join(d, 'log');
  const r = paket(STD(aus), {ERSATZ_LOG: log});
  pruefeGleich(r.status, 0, 'Exit: ' + r.stderr);
  pruefeGleich(zeilen(log).join(','), '31,32,33,34,35', 'je Partie ein Aufruf');
  const recs = zeilen(aus).map(z => JSON.parse(z));
  pruefeGleich(recs.map(x => x.nr).join(','), '31,32,33,34,35', 'Partien in der Datei');
  pruefe(recs.every(x => x.anzahl === 1 && x.seed === 231 && x.arm === 'D' && x.gegner === 'g' && x.zusatz === '--kandidaten-orakel S'), 'Aufruf: eine Partie, Arm D, Seed, DUELL_ZUSATZ');
  pruefe(fs.existsSync(aus + '.meta.json'), 'Begleitdatei');
  const n = paket(STD(aus), {ERSATZ_LOG: log});
  pruefeGleich(n.status, 0, 'zweiter Aufruf');
  pruefeGleich(zeilen(log).length, 5, 'keine Partie neu gerechnet');
  const p = paket([...STD(aus), '--nur-pruefen'], {ERSATZ_LOG: log});
  pruefeGleich(p.stdout.trim(), 'fehlen=0', 'nur prüfen');
});

test('paket.js: Abbruch mitten im Paket, abgeschnittene Zeile; Fortsetzen spielt nur Fehlendes', () => {
  const d = temp(), aus = path.join(d, 'g-S-31.jsonl'), log = path.join(d, 'log');
  const r = paket(STD(aus), {ERSATZ_LOG: log, ERSATZ_FEHLER: '33'});
  pruefeGleich(r.status, 7, 'Status des Spielers wird weitergegeben');
  pruefeGleich(zeilen(aus).map(z => JSON.parse(z).nr).join(','), '31,32', 'fertige Partien gesichert');
  fs.appendFileSync(aus, '{"nr":33,"abgeschn');   /* Abbruch beim Schreiben simulieren */
  pruefeGleich(paket([...STD(aus), '--nur-pruefen'], {ERSATZ_LOG: log}).stdout.trim(), 'fehlen=3', 'abgeschnittene Zeile zählt nicht');
  const w = paket(STD(aus), {ERSATZ_LOG: log});
  pruefeGleich(w.status, 0, 'Fortsetzen: ' + w.stderr);
  pruefeGleich(zeilen(log).join(','), '31,32,33,33,34,35', 'nur 33 bis 35 gespielt');
  pruefeGleich(zeilen(aus).map(z => JSON.parse(z).nr).join(','), '31,32,33,34,35', 'Datei vollständig, ohne Rest');
});

test('paket.js: abweichender Stand, fehlende Begleitdatei, kaputte Zeile, fremde Nummer → Exit 3; falscher Aufruf → 2', () => {
  const d = temp(), aus = path.join(d, 'g-S-31.jsonl'), log = path.join(d, 'log');
  paket(STD(aus), {ERSATZ_LOG: log, ERSATZ_FEHLER: '32'});
  pruefeGleich(paket(STD(aus), {ERSATZ_LOG: log, VORGABE: '6'}).status, 3, 'andere Vorgabe');
  pruefeGleich(paket(STD(aus), {ERSATZ_LOG: log, SIMS: '600'}).status, 3, 'andere Simulationszahl');
  pruefeGleich(paket(STD(aus).map(x => x === '231' ? '232' : x), {ERSATZ_LOG: log}).status, 3, 'anderer Seed');
  const m = JSON.parse(fs.readFileSync(aus + '.meta.json', 'utf8')); m.quellen['index.html'] = '0'.repeat(64);
  fs.writeFileSync(aus + '.meta.json', JSON.stringify(m));
  const x = paket(STD(aus), {ERSATZ_LOG: log});
  pruefeGleich(x.status, 3, 'anderer Stand von index.html'); pruefe(/Fortsetzen abgelehnt/.test(x.stderr), 'Meldung');
  fs.rmSync(aus + '.meta.json');
  pruefeGleich(paket(STD(aus), {ERSATZ_LOG: log}).status, 3, 'Begleitdatei fehlt');
  const d2 = temp(), a2 = path.join(d2, 'p.jsonl');
  paket(STD(a2), {ERSATZ_LOG: log});
  const z = zeilen(a2); z[1] = '{kaputt'; fs.writeFileSync(a2, z.join('\n') + '\n');
  pruefeGleich(paket(STD(a2), {ERSATZ_LOG: log}).status, 3, 'kaputte Zeile mittendrin');
  fs.writeFileSync(a2, '{"nr":99}\n');
  pruefeGleich(paket(STD(a2), {ERSATZ_LOG: log}).status, 3, 'Nummer außerhalb des Pakets');
  pruefeGleich(paket(['--gegner', 'g', '--arm', 'X', '--von', '1', '--anzahl', '1', '--seed', '1', '--aus', a2]).status, 2, 'unbekannter Arm');
});

/* ---- 2. Echtes spielen.sh mit Attrappe: eigener Prozess je Partie = durchlaufender Prozess ---- */
test('paket.js mit spielen.sh und Attrappe: Partie 2 im eigenen Prozess gleich wie nach Partie 1 im selben Prozess', () => {
  const d = temp(), prog = path.join(d, 'attrappe');
  fs.writeFileSync(prog, `#!/bin/sh\nexec "${process.execPath}" "${path.join(__dirname, 'gtp-attrappe.js')}" "$@"\n`, {mode: 0o755});
  const env = {...process.env, GNUGO: prog, SIMS: '5', ARME: path.join(wurzel, 'auswertung/komponenten/arme-o.sh'), VORGABE: '0'};
  delete env.KANDIDATEN_SPIELEN;
  const einzeln = path.join(d, 'einzeln.jsonl');
  const r = spawnSync(process.execPath, [PAKET, '--gegner', 'g', '--arm', 'S', '--von', '2', '--anzahl', '1', '--seed', '231', '--aus', einzeln], {encoding: 'utf8', env, timeout: 240000});
  pruefeGleich(r.status, 0, 'paket.js: ' + r.stderr.slice(-300));
  const durch = path.join(d, 'durch.jsonl');
  const s = spawnSync('bash', [path.join(wurzel, 'auswertung/komponenten/spielen.sh'), 'g', 'D', '1', '2', '231', durch],
    {encoding: 'utf8', env: {...env, DUELL_ZUSATZ: '--kandidaten-orakel S'}, timeout: 240000});
  pruefeGleich(s.status, 0, 'spielen.sh: ' + s.stderr.slice(-300));
  const a = JSON.parse(zeilen(einzeln)[0]), b = zeilen(durch).map(z => JSON.parse(z)).find(x => x.nr === 2);
  pruefe(a.kandidatenOrakel && a.kandidatenOrakel.arm === 'S' && a.kandidatenOrakel.ereignisse.length > 0, 'Protokoll des Kandidaten-Orakels vorhanden');
  const mitProt = a.kandidatenOrakel.ereignisse.filter(e => e.fall !== 'kein-protokoll');
  pruefe(mitProt.length > 0 && mitProt.every(e => Number.isFinite(e.ps) && Math.abs(e.ps - 1) <= 1e-9 && !e.pf), 'Harness: Prior-Summe je Zug protokolliert, überall 1');
  pruefeGleich(JSON.stringify(a.zuege), JSON.stringify(b.zuege), 'gleiche Züge');
  pruefeGleich(a.endstand, b.endstand, 'gleicher Endstand');
  pruefeGleich(JSON.stringify(a.kandidatenOrakel.ereignisse), JSON.stringify(b.kandidatenOrakel.ereignisse), 'gleiches Protokoll');
});

/* ---- 3. Zusammenführen ---- */
test('zusammenfuehren.js: Pakete nach Nummer sortiert, Kontrollen kopiert; uneinheitlicher Stand oder fehlende Begleitdatei → Fehler', () => {
  const s = temp(), roh = temp(), meta = temp();
  const m = q => JSON.stringify({quellen: {a: q}});
  fs.writeFileSync(path.join(s, 'g-A-31.jsonl'), '{"nr":31}\n{"nr":32}\n'); fs.writeFileSync(path.join(s, 'g-A-31.jsonl.meta.json'), m('1'));
  fs.writeFileSync(path.join(s, 'g-A-1.jsonl'), '{"nr":2}\n{"nr":1}\n'); fs.writeFileSync(path.join(s, 'g-A-1.jsonl.meta.json'), m('1'));
  fs.writeFileSync(path.join(s, 'kontrolle.jsonl'), '{"nr":1}\n'); fs.writeFileSync(path.join(s, 'kontrolle.jsonl.meta.json'), m('1'));
  fs.writeFileSync(path.join(s, 'g-A-31.jsonl.partie'), 'Rest');
  const r = Z.fuehreZusammen(s, roh, meta);
  pruefeGleich(r.fehler.length, 0, 'keine Fehler: ' + r.fehler.join(' | '));
  pruefeGleich(zeilen(path.join(roh, 'g-A.jsonl')).map(z => JSON.parse(z).nr).join(','), '1,2,31,32', 'sortiert');
  pruefe(fs.existsSync(path.join(roh, 'kontrolle.jsonl')) && fs.readdirSync(meta).length === 3, 'Kontrolle und Begleitdateien kopiert');
  fs.writeFileSync(path.join(s, 'g-A-1.jsonl.meta.json'), m('2'));
  pruefe(Z.fuehreZusammen(s, temp(), temp()).fehler.some(f => /Stand/.test(f)), 'anderer Stand erkannt');
  fs.writeFileSync(path.join(s, 'g-A-1.jsonl.meta.json'), m('1')); fs.rmSync(path.join(s, 'kontrolle.jsonl.meta.json'));
  pruefe(Z.fuehreZusammen(s, temp(), temp()).fehler.some(f => /Begleitdatei/.test(f)), 'fehlende Begleitdatei erkannt');
});

/* ---- 4. Bericht ---- */
test('Statistik: t-Quantil, zweiseitiges p, Clopper-Pearson gegen Tabellenwerte', () => {
  const nah = (x, y, e = 1e-3) => Math.abs(x - y) < e;
  pruefe(nah(B.tQuantil(0.05, 10), 2.2281), 't(0,975; 10) = 2,2281');
  pruefe(nah(B.tQuantil(0.025, 479), 2.2485, 2e-3), 't(0,9875; 479) ≈ 2,248');
  pruefe(nah(B.tQuantil(0.05, 1e6), 1.9600), 't → z');
  pruefe(nah(B.pZweiseitig(2.2281, 10), 0.05), 'p zu t = 2,2281');
  const cp = B.clopperPearson(5, 10, 0.05); pruefe(nah(cp[0], 0.1871) && nah(cp[1], 0.8129), 'CP 5/10');
  const c0 = B.clopperPearson(0, 10, 0.05); pruefe(c0[0] === 0 && nah(c0[1], 0.3085), 'CP 0/10');
  const g = B.gepaart([1, 2, 3, 4, 5], 0.05);
  pruefe(nah(g.mittel, 3) && nah(g.sd, Math.sqrt(2.5)) && nah(g.lo, 3 - 2.7764 * Math.sqrt(2.5) / Math.sqrt(5)), 'gepaartes Intervall');
});

const N = 4;
function partie(nr, arm, opt = {}) {
  const f = nr % 2 === 0 ? 'S' : 'W', mcs = f === 'S' ? [80, 82] : [81, 83];
  const ev = mcs.map((mc, k) => ({mc, f, g: 5, fall: k === 0 ? 'd' : 'a', r: k === 0 ? 30 : null, rn: k === 0 ? 31 : null,
    auf: k === 0 && arm !== 'A' ? 1 : 0, ang: k === 0 && arm !== 'A' ? 1 : 0, i: 5, gl: 1, ps: 1}));
  if (opt.ausloeser) ev[0].rn = 32;
  if (opt.priorFehler) { ev[0].ps = 1 + 1e-6; ev[0].pf = [[5, 0.5], [6, 0.500001]]; }
  if (opt.priorFehlt) delete ev[0].ps;
  if (opt.priorOhneEingriff) ev[1].ps = 1 + 1e-6;
  if (opt.zaehl) ev.pop();
  const zuege = Array.from({length: 84}, (_, k) => 'D' + (k % 19 + 1));
  return {nr, wirFarbe: f, endstand: (arm === 'S' ? 3 : 0) + nr, gewonnen: nr % 3 === 0, zuegeAnzahl: 84, zuege,
    ...(opt.abgebrochen ? {abgebrochen: 'GNU Go beendet', endstand: undefined} : {}),
    kandidatenOrakel: {arm, ab: 80, abfragen: opt.zaehl ? 2 : ev.length, ohneAntwort: opt.ohneAntwort ? 1 : 0, abfrageMs: 10, partieMs: 1000 * nr, ereignisse: ev}};
}
function baue(opt = {}, n = N) {
  const d = temp();
  for (const o of ['g', 'f']) for (const arm of ['A', 'S', 'ZS']) {
    const l = [];
    for (let nr = 1; nr <= n; nr++) {
      if (opt.fehlt && o === 'g' && arm === 'S' && nr === 4) continue;
      l.push(partie(nr, arm, {
        ausloeser: opt.ausloeser && arm === 'ZS' && nr === 2, zaehl: opt.zaehl && o === 'f' && arm === 'A' && nr === 1,
        ohneAntwort: opt.ohneAntwort && o === 'g' && arm === 'A', abgebrochen: opt.abgebrochen && o === 'f' && arm === 'S' && nr === 4,
        priorFehler: opt.priorFehler && o === 'g' && arm === 'S' && nr === 2, priorFehlt: opt.priorFehlt && o === 'f' && arm === 'ZS' && nr === 3,
        priorOhneEingriff: opt.priorOhneEingriff && o === 'g' && arm === 'A' && nr === 1}));
    }
    fs.writeFileSync(path.join(d, `${o}-${arm}.jsonl`), l.map(x => JSON.stringify(x) + '\n').join(''));
    const w = l.filter(x => x.nr <= 3).map(x => opt.wiederholung && o === 'g' && arm === 'S' && x.nr === 2 ? {...x, endstand: x.endstand + 1} : x);
    fs.writeFileSync(path.join(d, `wiederholung-${o}-${arm}.jsonl`), w.map(x => JSON.stringify(x) + '\n').join(''));
  }
  const arch = zeilenGz(ARCH).filter(r => r.nr >= 1 && r.nr <= 4);
  fs.writeFileSync(path.join(d, 'kontrolle.jsonl'), arch.map(r => JSON.stringify(opt.kontrolle && r.nr === 3 ? {...r, endstand: r.endstand + 1} : r) + '\n').join(''));
  return d;
}
function zeilenGz(d) { return require('zlib').gunzipSync(fs.readFileSync(d)).toString('utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)); }

test('Bericht: gültig mit gebauten Daten; primärer Endpunkt S − A mit 97,5 %', () => {
  const e = B.bewerte(baue(), ARCH, N);
  pruefe(e.gueltig && e.vollstaendig, 'gültig: ' + e.gruende.join(' | '));
  const a = B.beschreibe(e);
  pruefeGleich(a.g.primaer.n, N, 'Paare'); pruefeGleich(a.g.primaer.mittel, 3, 'S − A = 3 (gebaut)');
  pruefeGleich(a.g.urteil, 'S besser als A', 'Urteil bei konstanter Differenz');
  pruefeGleich(a.g.arme.A.eingriffe, 0, 'Arm A ohne Eingriffe'); pruefeGleich(a.g.arme.S.ausloeser, 1, 'Auslöser je Partie');
  const t = B.bericht(e, a);
  pruefe(/\*\*Gültig\.\*\*/.test(t) && /Primärer Endpunkt: Endstand S − A/.test(t) && /97,5 %/.test(t), 'Bericht mit Primärteil');
  pruefe(/Auslöser je Partie \(c, d, d1\)/.test(t) && /Prior-Summe 1/.test(t), 'Beschriftung und Hinweis zur Prior-Summe');
});

test('Bericht: Prior-Summe zur Laufzeit; Abweichung ohne Eingriff wird protokolliert, macht aber nicht ungültig', () => {
  const ok = B.bewerte(baue(), ARCH, N);
  pruefe(ok.priorGeprueft > 0 && ok.priorMax === 0 && ok.priorFehler.length === 0, 'gebaute Daten: alle Summen 1');
  const f = B.bewerte(baue({priorFehler: true}), ARCH, N);
  pruefe(!f.gueltig && f.priorFehler.length === 1 && f.priorFehler[0].priors.length === 2 && f.priorFehler[0].nr === 2, 'Fehlerprotokoll mit Priors, ungültig');
  pruefe(/Fehlerprotokoll: 1 Einträge, davon 1 bei einem Eingriff/.test(B.bericht(f, null)) && /\| GNU Go \| S \| 2 \|/.test(B.bericht(f, null)), 'Fehlerprotokoll im Bericht');
  const o = B.bewerte(baue({priorOhneEingriff: true}), ARCH, N);
  pruefe(o.gueltig && o.priorFehler.length === 1 && !o.priorFehler[0].eingriff, 'ohne Eingriff: protokolliert, gültig');
});

test('Bericht: nur vollständige Paare; Ausfälle nach Arm, Gegner und Farbe', () => {
  const e = B.bewerte(baue({abgebrochen: true}, 100), ARCH, 100);
  pruefe(e.gueltig, 'ein Ausfall von 100 bleibt gültig: ' + e.gruende.join(' | '));
  const a = B.beschreibe(e);
  pruefeGleich(a.f.vollePaare, 99, 'Fuego: 99 vollständige Paare'); pruefeGleich(a.g.vollePaare, 100, 'GNU Go: 100');
  pruefeGleich(a.f.primaer.n, 99, 'S − A auf 99'); pruefeGleich(a.f.ZSA.n, 99, 'ZS − A auch auf 99 (Partie 4 fehlt nur in S)'); pruefeGleich(a.f.SZS.n, 99, 'S − ZS auf 99');
  pruefeGleich(a.f.ausfaelle.SS.ausgefallen, 1, 'S, KI Schwarz: 1 Ausfall'); pruefeGleich(a.f.ausfaelle.SS.abgebrochen, 1, 'davon abgebrochen');
  pruefeGleich(a.f.ausfaelle.SW.ausgefallen, 0, 'S, KI Weiß: 0');
  pruefeGleich(a.f.ausfaelle.AS.nurAnderer, 1, 'A, Schwarz: 1 Partie nur wegen S nicht im Paar'); pruefeGleich(a.f.ausfaelle.ZSS.nurAnderer, 1, 'ZS ebenso');
  pruefeGleich(a.f.arme.A.siege.n, 99, 'Siege nur in vollständigen Paaren');
  const t = B.bericht(e, a);
  pruefe(/## Ausfälle und vollständige Paare/.test(t) && /Fuego: 99 vollständige Paare von 100/.test(t) && /\| Fuego \| S \| Schwarz \| 50\/50 \| 1 \(1\) \| 0 \| 4 \|/.test(t), 'Ausfalltabelle im Bericht');
});

test('Bericht: jede Verletzung → KEIN URTEIL mit Grund und ohne Effekt', () => {
  const faelle = [
    ['fehlt', /fehlen \(unvollständig, fortsetzbar\)/], ['ausloeser', /Bedingung 4/], ['zaehl', /Zählersummen/],
    ['ohneAntwort', /Antwortquote/], ['wiederholung', /Wiederholungskontrolle/], ['kontrolle', /Bedingung 1/], ['abgebrochen', /ausgewertet/],
    ['priorFehler', /Prior-Summe: 1 Eingriffe/], ['priorFehlt', /Prior-Summe: 1 Eingriffe/]];
  for (const [k, re] of faelle) {
    const e = B.bewerte(baue({[k]: true}), ARCH, N);
    pruefe(!e.gueltig && e.gruende.some(g => re.test(g)), `${k}: ${e.gruende.join(' | ')}`);
    const t = B.bericht(e, null);
    pruefe(/KEIN URTEIL/.test(t) && !/Primärer Endpunkt/.test(t), `${k}: kein Effekt im Bericht`);
    if (k === 'fehlt') pruefe(!e.vollstaendig && /fortsetzen_aus/.test(t), 'unvollständig mit Hinweis auf Fortsetzen');
  }
  const leer = B.bewerte(temp(), ARCH, N);
  pruefe(!leer.gueltig && !leer.vollstaendig, 'leere Daten');
});

/* ---- 5. Workflow ---- */
test('Workflow Hauptversuch: nur von Hand, Pakete 1 bis 480, Zeitlimits, Sicherung, Fortsetzen, Schreibrecht nur im Ergebnis', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/kandidaten-orakel-haupt.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:\n/m.test(y) && !/^\s*(push|pull_request|schedule):/m.test(y), 'nur workflow_dispatch');
  pruefe(/SEED_G: '231'/.test(y) && /SEED_F: '232'/.test(y) && /PAARE: '480'/.test(y) && /VORGABE: '0'/.test(y), 'Seeds, Paare, ohne Vorgabe');
  pruefe(/ubuntu-24\.04/.test(y) && !/ubuntu-latest/.test(y), 'Runner');
  const job = name => new RegExp('^  ' + name + ':\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|$(?![\\s\\S]))', 'm').exec(y)[1];
  const vonListe = j => /^        von: \[([^\]]+)\]/m.exec(job(j))[1].split(',').map(Number);
  for (const [j, anz] of [['gnugo', 30], ['fuego', 20]]) {
    const v = vonListe(j), abgedeckt = new Set();
    for (const s of v) for (let nr = s; nr < s + anz; nr++) abgedeckt.add(nr);
    pruefe(abgedeckt.size === 480 && Math.min(...abgedeckt) === 1 && Math.max(...abgedeckt) === 480 && v.length * anz === 480, `${j}: Pakete zu ${anz} decken 1 bis 480 genau ab`);
    pruefe(v.every(s => s % 2 === 1), `${j}: jedes Paket beginnt ungerade (gleich viele je Farbe)`);
    pruefe(new RegExp(`--anzahl ${anz} `).test(job(j)) && /arm: \[A, S, ZS\]/.test(job(j)), `${j}: Paketgröße und Arme`);
  }
  for (const j of ['gnugo', 'fuego', 'wiederholung', 'kontrolle']) {
    const k = job(j);
    const jobMin = +/^    timeout-minutes: (\d+)/m.exec(k)[1], schritt = [...k.matchAll(/^        timeout-minutes: (\d+)/gm)].map(m => +m[1]);
    pruefe(schritt.length >= 1 && schritt.every(s => s < jobMin) && jobMin <= 360, `${j}: Schritt ${schritt} < Job ${jobMin} ≤ 360`);
    pruefe(/if: always\(\)\n        uses: actions\/upload-artifact@v7/.test(k) && /overwrite: true/.test(k), j + ': Upload mit always() und overwrite');
    pruefe(/gh run download "\$VORLAUF"/.test(k) && /--nur-pruefen/.test(k) && /steps\.stand\.outputs\.fehlen != '0'/.test(k), j + ': Fortsetzen und Überspringen fertiger Pakete');
    pruefe(/\|\| status=\$\?/.test(k) && /paket\.js/.test(k), j + ': über paket.js, Status abgefangen');
    pruefe(/needs: (pruefen|\[pruefen)/.test(k), j + ': hängt am Job Prüfen');
  }
  pruefe(/tests\/\$t/.test(job('pruefen')) && /kandidaten-orakel\.js kandidaten-orakel-spiel\.js kandidaten-orakel-haupt\.js/.test(job('pruefen')), 'Prüfen führt die drei Testdateien aus');
  pruefe(/--seed 222/.test(job('kontrolle')) && /--anzahl 4/.test(job('kontrolle')), 'Kontrolle Seed 222, 4 Partien');
  pruefe(/--von 1 --anzahl 3/.test(job('wiederholung')), 'Wiederholung Partien 1 bis 3');
  pruefe((y.match(/^      contents: write/gm) || []).length === 1 && /contents: write/.test(job('ergebnis')), 'Schreibrecht nur im Ergebnis-Job');
  pruefe(/needs\.pruefen\.result == 'success'/.test(job('ergebnis')) && /VOLLSTAENDIG == '1'/.test(job('ergebnis')), 'Ergebnisbranch nur bei vollständigen Daten');
  pruefe(/exit 1/.test(job('ergebnis')) && /KEIN URTEIL/.test(job('ergebnis')), 'rot bei KEIN URTEIL');
  pruefe(!/--force|push -f|push origin main|refs\/heads\/main/.test(y), 'kein Force, kein Push auf main');
});

require('./rahmen').laufeTests('Kandidaten-Orakel Hauptversuch').then(ok => process.exit(ok ? 0 : 1));
