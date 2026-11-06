// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const Regel = require('./regel');
const {gepaart, clopperPearson, kiAmZug} = require('../kandidaten-orakel/haupt-bericht');
const {vorzeichenP} = require('../messung-zusatz');
const BASELINE = '1bf2ff3cc5258038697b91a79224c70e25761d87';
const ARME = Regel.ARME, ALPHA = 0.05 / 4;
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const spielgleich = (a, b) => a && b && gleich(a.zuege, b.zuege) && a.endstand === b.endstand;
const stabil = r => r && r.priorOhneOrakel && r.priorOhneOrakel.ereignisse.map(({dauerMs, ...e}) => e);
const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return !n ? null : n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };

function bewerte(dir, {probe = true, nJe = probe ? {g: 8, f: 4} : {g: 480, f: 480}, archiv} = {}) {
  const pruefungen = [], ausfaelle = [], daten = {}, gruppen = {}, zeiten = {}, abdeckung = {};
  function pr(name, anzahl, fehler, nichtPruefbar = []) {
    pruefungen.push({name, anzahl, nichtPruefbar, ok: fehler.length === 0, anzahlFehler: fehler.length, fehler: fehler.slice(0, 30)});
  }
  function json(file, many = false) {
    try {
      const b = fs.readFileSync(file), text = (/\.gz$/.test(file) ? zlib.gunzipSync(b) : b).toString('utf8');
      if (!many) return JSON.parse(text);
      const rows = text.split('\n').filter(Boolean).map(l => JSON.parse(l));
      if (rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('Objektzeilen erwartet');
      return rows;
    } catch (e) { pr('Datei ' + path.basename(file), 0, [e.message]); return many ? [] : null; }
  }
  const q = json(path.join(dir, 'quellen.json'));
  const proof = json(path.join(dir, 'enginevergleich.json'));
  pr('Vorprüfung Engine-Vergleich', 1, q && /^[0-9a-f]{40}$/.test(q.sourceSHA || '') && q.hashes
    && Regel.SOURCE_FILES.every(file => /^[0-9a-f]{64}$/.test(q.hashes[file] || ''))
    && proof && proof.gueltig === true && proof.ergebnis === 'GLEICH' && proof.baseline === BASELINE
    && proof.neuIndexSHA256 === q.hashes['index.html'] && proof.zufallGeprueft === true && proof.priorGeprueft === true
    && proof.coverage && proof.coverage.S > 0 && proof.coverage.W > 0 ? [] : ['gültiger passender Vergleich einschließlich beider Farben fehlt']);
  let gnugoVersion = null, fuegoVersion = null;
  function inspect(name, gegner, arm, seed, n, control = false, metaName = name) {
    const meta = json(path.join(dir, metaName + '.meta.json'));
    const mf = [];
    if (!meta || !q || meta.sourceSHA !== q.sourceSHA || !gleich(meta.hashes, q.hashes)
        || Object.values(meta.hashes || {}).some(h => !/^[0-9a-f]{64}$/.test(h))
        || meta.version !== 1 || meta.art !== metaName || meta.gegner !== gegner || meta.arm !== arm || meta.seed !== seed || meta.n !== (control ? n : nJe[gegner])
        || !gleich(meta.wiederholungen, control ? [] : [1, 2, 3])
        || !gleich(meta.konfiguration, {sims: 120, komi: 7.5, vorgabe: 0, resign: 0, gegnerStufe: 1, fuegoSpiele: 100, maxZuege: 600})) mf.push('Quelle, Konfiguration oder Metadaten weichen ab');
    if (meta) {
      const v = meta.versions || {};
      if (!/^[0-9a-f]{64}$/.test(v.gnugoSHA256 || '')) mf.push('GNU-Go-Binary-Hash fehlt');
      else if (gnugoVersion && gnugoVersion !== v.gnugoSHA256) mf.push('GNU-Go-Binaries verschieden');
      else gnugoVersion = v.gnugoSHA256;
      if (gegner === 'f') {
        if (!/^[0-9a-f]{64}$/.test(v.fuegoSHA256 || '')) mf.push('Fuego-Binary-Hash fehlt');
        else if (fuegoVersion && fuegoVersion !== v.fuegoSHA256) mf.push('Fuego-Binaries verschieden');
        else fuegoVersion = v.fuegoSHA256;
      }
    }
    pr(name + ': Quelle und Konfiguration', 1, mf);
    const data = json(path.join(dir, name + '.jsonl'), true);
    const numbers = data.map(r => r.nr), vf = [];
    if (data.length !== n || new Set(numbers).size !== n || numbers.some(nr => !Number.isInteger(nr) || nr < 1 || nr > n)) vf.push('Nummern nicht genau einmal vollständig');
    pr(name + ': Vollständigkeit', data.length, vf);
    const context = nr => ({arm, seed, gegner, nr});
    let events = 0;
    const ef = [], pf = [], nichtPruefbar = [];
    const color = nr => nr % 2 === 0 ? 'S' : 'W';
    const ok = new Map();
    for (const r of data) {
      const vorherPf = pf.length, vorherEf = ef.length;
      const prefix = name + '/' + r.nr, lauf = r.priorLauf || {}, p = r.priorOhneOrakel;
      if (lauf.quelle !== q?.sourceSHA || !Number.isFinite(lauf.dauerMs) || lauf.dauerMs < 0) pf.push(prefix + ': Lauf-Metadaten fehlen');
      const rel = lauf.protokoll;
      if (typeof lauf.log !== 'string' || path.isAbsolute(lauf.log)
          || path.relative(path.resolve(dir), path.resolve(dir, lauf.log)).startsWith('..') || !fs.existsSync(path.resolve(dir, lauf.log)))
        pf.push(prefix + ': Partielog fehlt oder Pfad ungültig');
      let stream = [];
      if (typeof rel !== 'string' || path.isAbsolute(rel) || path.relative(path.resolve(dir), path.resolve(dir, rel)).startsWith('..'))
        pf.push(prefix + ': Protokollpfad ungültig');
      else stream = json(path.join(dir, rel), true);
      if (!stream.length || stream.some(e => e.nr !== r.nr)) pf.push(prefix + ': GTP-Protokoll fehlt oder enthält fremde Nummer');
      const starts = stream.filter(e => e.typ === 'prozess-start'), ends = stream.filter(e => e.typ === 'prozess-ende');
      const gs = starts.filter(e => e.name === 'GNU Go'), fs_ = starts.filter(e => e.name === 'Fuego');
      if (gs.length < 1 || gs.length > 2 || fs_.length !== (gegner === 'f' ? 1 : 0)
          || gs.some(e => !Array.isArray(e.argumente) || e.argumente[e.argumente.indexOf('--level') + 1] !== '1')
          || starts.some(e => !['GNU Go', 'Fuego'].includes(e.name)) || starts.some(e => !ends.some(x => x.pid === e.pid))) pf.push(prefix + ': Prozessstatus oder Orakelfreiheit nicht belegt');
      const partieSeed = seed * 100000 + r.nr;
      if (gs.some((e, i) => !Array.isArray(e.argumente) || e.argumente[e.argumente.indexOf('--seed') + 1] !== String(partieSeed + 7919 * i))
          || fs_.some(e => !Array.isArray(e.argumente) || e.argumente[e.argumente.indexOf('--srand') + 1] !== String(partieSeed))) pf.push(prefix + ': Prozess-Seed stimmt nicht');
      const fragen = stream.filter(e => e.typ === 'gtp-frage');
      if (fragen.some(e => /^reg_genmove\b/.test(e.befehl)) || ['orakel', 'orakelZug', 'kandidatenOrakel'].some(k => k in r)) pf.push(prefix + ': Orakel verwendet');
      if (gegner === 'f' && !['uct_param_player max_games 100', 'uct_param_player ponder 0', 'uct_param_player resign_threshold 0', 'deterministic_mode', 'set_random_seed ' + Math.max(1, partieSeed % 2147483647)].every(b => fragen.some(e => e.name === 'Fuego' && e.befehl === b))) pf.push(prefix + ': Fuego-Konfiguration nicht belegt');
      if (!p || p.version !== 1 || p.arm !== arm || p.seed !== seed || p.nr !== r.nr || p.gegner !== gegner || !Array.isArray(p.ereignisse)) {
        pf.push(prefix + ': Pflichtprotokoll fehlt'); continue;
      }
      if (p.ereignisse.some(e => !e || typeof e !== 'object' || Array.isArray(e))) { pf.push(prefix + ': Ereignisobjekt fehlt'); continue; }
      if (!gleich(stream.filter(e => e.typ === 'ki-zug').map(e => e.protokoll), p.ereignisse)) pf.push(prefix + ': Seitenprotokoll und Ergebnis stimmen nicht überein');
      const eventNumbers = p.ereignisse.map(e => e.mc);
      if (new Set(eventNumbers).size !== eventNumbers.length || eventNumbers.some((mc, i) => i && mc <= eventNumbers[i - 1])) ef.push(prefix + ': doppelte oder ungeordnete KI-Züge');
      for (const e of p.ereignisse) {
        events++;
        try { ef.push(...Regel.pruefe(e, context(r.nr)).map(f => prefix + ': ' + f)); }
        catch (error) { ef.push(prefix + ': unlesbares Ereignis: ' + error.message); }
        if (e.farbe !== color(r.nr) || (e.mc % 2 === 0) !== (color(r.nr) === 'S') || !Number.isFinite(e.dauerMs) || e.dauerMs < 0) ef.push(prefix + ': Farbe, Zugnummer oder Dauer ungültig');
      }
      if (lauf.status === 'gegner-absturz') {
        const expected = gegner === 'g' ? 'GNU Go' : 'Fuego';
        if (!r.abgebrochen || !r.abgebrochen.includes(expected + ': genmove ') || !ends.some(e => e.name === expected && (e.sig && e.sig !== 'SIGTERM' || Number.isInteger(e.code) && e.code !== 0))) pf.push(prefix + ': Gegnerabsturz nicht belegt');
        else { ausfaelle.push({name, nr: r.nr, farbe: color(r.nr), grund: r.abgebrochen}); nichtPruefbar.push(r.nr); }
        continue;
      }
      if (lauf.status === 'timeout' && !probe && lauf.timeout === true && lauf.code === -9 && lauf.dauerMs >= (gegner === 'g' ? 600000 : 1800000)) {
        ausfaelle.push({name, nr: r.nr, farbe: color(r.nr), grund: 'vorab begrenzte Partiezeit überschritten'}); nichtPruefbar.push(r.nr); continue;
      }
      if (lauf.status !== 'ok' || lauf.timeout || lauf.code !== 0 || r.abgebrochen) { pf.push(prefix + ': Zeitüberschreitung oder technischer Fehler'); continue; }
      if (r.seed !== seed * 100000 + r.nr || r.wirFarbe !== color(r.nr) || r.vorgabe !== 0 || r.komi !== 7.5 || r.stufe !== 1
          || !gleich(r.ki, {mctsFixedSims: 120, resignEnabled: 0}) || !Number.isFinite(r.endstand)
          || (p.ereignisse.some(e => e.suche && e.kinder?.length) && r.simsMittel !== 120)
          || !Array.isArray(r.zuege) || r.zuegeAnzahl !== r.zuege.length) { pf.push(prefix + ': Ergebnis oder Partiebedingungen fehlen'); continue; }
      if (!gleich(eventNumbers, kiAmZug(r, 0))) pf.push(prefix + ': nicht genau ein Protokoll je KI-Zug');
      for (const e of p.ereignisse) {
        const zug = e.gespielt < 0 ? 'pass' : 'ABCDEFGHJKLMNOPQRST'[e.gespielt % 19] + (19 - Math.floor(e.gespielt / 19));
        if (r.zuege[e.mc] !== zug) pf.push(prefix + ': Protokollzug weicht von Partie ab');
      }
      const final = stream.filter(e => e.typ === 'gtp-antwort' && e.name === 'GNU Go' && e.befehl === 'final_score').at(-1);
      const text = final?.antwort?.replace(/^=\s*/, '').trim(), match = /^([BW])\+([\d.]+)$/.exec(text || '');
      const score = match ? ((match[1] === (color(r.nr) === 'S' ? 'B' : 'W') ? 1 : -1) * +match[2]) : text === '0' ? 0 : NaN;
      if (!Number.isFinite(score) || score !== r.endstand) pf.push(prefix + ': Endwertung nicht belegt');
      if (pf.length === vorherPf && ef.length === vorherEf) ok.set(r.nr, r);
    }
    pr(name + ': Pflichtdaten und Prozessstatus', data.length - nichtPruefbar.length, pf, nichtPruefbar);
    pr(name + ': Eingriffsregeln, Priors und Zählersummen', events, ef);
    return {data, ok};
  }
  for (const o of ['g', 'f']) for (const a of ARME) {
    const name = o + '-' + a, seed = probe ? 236 : o === 'g' ? 237 : 238;
    const x = inspect(name, o, a, seed, nJe[o]); daten[name] = x;
    const repeated = inspect('wiederholung-' + name, o, a, seed, 3, false, name);
    const f = [];
    for (const nr of [1, 2, 3]) {
      const r = repeated.ok.get(nr), first = x.ok.get(nr);
      if (!r || r.priorLauf?.status !== 'ok' || !first || !spielgleich(r, first) || !gleich(stabil(r), stabil(first))) f.push('Nr. ' + nr + ': nicht identisch oder nicht prüfbar');
    }
    pr(name + ': Wiederholungskontrolle', 3, f);
    if (!probe) pr(name + ': mindestens 98 % ausgewertet', nJe[o], x.ok.size >= Math.ceil(0.98 * nJe[o]) ? [] : ['zu viele Ausfälle']);
    const durations = x.data.map(r => r.priorLauf?.dauerMs).filter(Number.isFinite);
    zeiten[name] = {n: durations.length, medianMs: median(durations), maximumMs: durations.length ? Math.max(...durations) : null};
    abdeckung[name] = {};
    for (const color of ['S', 'W']) {
      const ev = x.data.flatMap(r => Array.isArray(r.priorOhneOrakel?.ereignisse) ? r.priorOhneOrakel.ereignisse : []).filter(e => e && e.farbe === color);
      const ang = ev.filter(e => e.angehoben).length;
      abdeckung[name][color] = {kiZuege: ev.length, frischeWurzeln: ev.filter(e => e.neu).length,
        gelegenheiten: ev.filter(e => e.gelegenheit).length, anhebungen: ang};
      if (a !== 'A') pr(name + ': tatsächliche Anhebung ' + color, ev.length, ang ? [] : ['Mechanismus in dieser Farbe nicht geprüft']);
    }
  }
  const c = inspect('kontrolle', 'g', 'A', 222, 4, true);
  const reference = archiv ? json(archiv, true).filter(r => r.nr >= 1 && r.nr <= 4) : [];
  pr('Kontrolle Seed 222', c.data.length, c.ok.size === 4 && reference.length === 4 && reference.every(r => spielgleich(c.ok.get(r.nr), r)) ? [] : ['Kontrolle nicht bitgleich zum Archiv']);
  for (const o of ['g', 'f']) {
    const full = [];
    const f = [], unpruefbar = [];
    let tested = 0;
    for (let nr = 1; nr <= nJe[o]; nr++) {
      const rows = ARME.map(a => daten[o + '-' + a].ok.get(nr));
      if (rows.some(r => !r)) { unpruefbar.push(nr); continue; }
      full.push(nr);
      const first = rows.map(r => r.priorOhneOrakel.ereignisse.find(e => e.gelegenheit));
      if (first.every(e => !e)) { unpruefbar.push(nr + ': keine Gelegenheit'); continue; }
      if (first.some(e => !e)) { f.push(nr + ': erste Gelegenheit fehlt in einem Arm'); continue; }
      const e = first[0], sig = x => [x.mc, x.hash, x.auswahl, x.kinder.map(k => [k.idx, k.pVor, k.wert])];
      if (first.some(x => !gleich(sig(e), sig(x))) || rows.some(r => !gleich(rows[0].zuege.slice(0, e.mc), r.zuege.slice(0, e.mc)))) f.push(nr + ': Verlauf oder erste Gelegenheit verschieden');
      tested++;
    }
    gruppen[o] = full;
    if (!tested) f.push('keine prüfbare Dreiergruppe mit Gelegenheit');
    pr(o + ': gleiche erste Gelegenheit', tested, f, unpruefbar);
    if (!probe) pr(o + ': mindestens 95 % vollständige Dreiergruppen', full.length, full.length >= Math.ceil(0.95 * nJe[o]) ? [] : ['zu wenige vollständige Dreiergruppen']);
  }
  const gueltig = pruefungen.every(p => p.ok), auswertung = {};
  if (gueltig && !probe) for (const o of ['g', 'f']) {
    const sieg = r => r.endstand === 0 ? false : typeof r.gewonnen === 'boolean' ? r.gewonnen : null;
    const pairs = (a, b, alpha) => {
      const rows = gruppen[o].map(nr => [daten[o + '-' + a].ok.get(nr), daten[o + '-' + b].ok.get(nr)]);
      const known = rows.filter(([x, y]) => sieg(x) !== null && sieg(y) !== null);
      const nurA = known.filter(([x, y]) => sieg(x) && !sieg(y)).length, nurB = known.filter(([x, y]) => sieg(y) && !sieg(x)).length;
      return {a, b, ...gepaart(rows.map(([x, y]) => x.endstand - y.endstand), alpha),
        siege: {n: known.length, nichtPruefbar: rows.length - known.length, nurA, nurB, p: vorzeichenP(nurA, nurB)}};
    };
    auswertung[o] = {haupt: [pairs('H', 'A', ALPHA), pairs('H', 'R', ALPHA)], ergaenzend: pairs('R', 'A', 0.05), siege: {}, farben: {}};
    for (const v of auswertung[o].haupt) v.urteil = v.lo > 0 ? `${v.a} besser als ${v.b}` : v.hi < 0 ? `${v.a} schlechter als ${v.b}` : 'kein nachgewiesener Unterschied';
    for (const color of ['S', 'W']) auswertung[o].farben[color] = [['H', 'A'], ['H', 'R'], ['R', 'A']].map(([a, b]) => ({a, b,
      ...gepaart(gruppen[o].filter(nr => (nr % 2 === 0 ? 'S' : 'W') === color).map(nr => daten[o + '-' + a].ok.get(nr).endstand - daten[o + '-' + b].ok.get(nr).endstand), 0.05)}));
    for (const a of ARME) {
      const rows = gruppen[o].map(nr => daten[o + '-' + a].ok.get(nr)).filter(r => sieg(r) !== null);
      const k = rows.filter(r => sieg(r)).length;
      auswertung[o].siege[a] = {k, n: rows.length, remis: rows.filter(r => r.endstand === 0).length,
        ci: clopperPearson(k, rows.length, 0.05), nichtPruefbar: gruppen[o].length - rows.length};
    }
  }
  return {version: 1, probe, gueltig, nJe, pruefungen, ausfaelle, zeiten, abdeckung,
    vollstaendigeGruppen: Object.fromEntries(Object.entries(gruppen).map(([o, a]) => [o, a.length])),
    alpha: ALPHA, auswertung: gueltig && !probe ? auswertung : null};
}

function bericht(e) {
  const L = ['# Prior-Anhebung ohne Orakel', '', e.gueltig ? '**GÜLTIG**' : '**KEIN URTEIL**', '',
    e.probe ? 'Technische Probe: keine Endstand-Unterschiede und keine Siegquoten ausgewertet.' : 'Hauptvergleiche H − A und H − R je Gegner; vier Tests, α = 0,05/4.', '',
    '| Prüfung | geprüft | nicht prüfbar | Ergebnis |', '|---|---:|---|---|'];
  for (const p of e.pruefungen) L.push(`| ${p.name} | ${p.anzahl} | ${p.nichtPruefbar.join(', ') || '–'} | ${p.ok ? 'bestanden' : 'nicht bestanden'} |`);
  L.push('', '## Zulässige Partieausfälle', '');
  if (!e.ausfaelle.length) L.push('Keine.');
  for (const a of e.ausfaelle) L.push(`- ${a.name} Nr. ${a.nr}, KI ${a.farbe}: ${a.grund}`);
  L.push('', '## Fehler', '');
  for (const p of e.pruefungen.filter(p => !p.ok)) L.push(`- ${p.name}: ${p.fehler.join('; ')}`);
  if (e.gueltig) L.push('Keine technischen Fehler.');
  L.push('', '## Technik und Laufzeit', '', '| Arm/Gegner | Partien | Median s | Maximum s |', '|---|---:|---:|---:|');
  for (const [name, t] of Object.entries(e.zeiten)) L.push(`| ${name} | ${t.n} | ${t.medianMs === null ? '–' : (t.medianMs / 1000).toFixed(1)} | ${t.maximumMs === null ? '–' : (t.maximumMs / 1000).toFixed(1)} |`);
  L.push('', '| Arm/Gegner | KI | Gelegenheiten | tatsächliche Anhebungen |', '|---|---|---:|---:|');
  for (const [name, cs] of Object.entries(e.abdeckung)) for (const [color, a] of Object.entries(cs)) L.push(`| ${name} | ${color} | ${a.gelegenheiten} | ${a.anhebungen} |`);
  if (e.auswertung) {
    const f = x => Number.isFinite(x) ? x.toFixed(2) : '–';
    L.push('', '## Hauptvergleiche (98,75 %)', '', '| Gegner | Vergleich | Paare | Mittelwert | Intervall | p | Urteil |', '|---|---|---:|---:|---|---:|---|');
    for (const [o, a] of Object.entries(e.auswertung)) for (const v of a.haupt) L.push(`| ${o} | ${v.a} − ${v.b} | ${v.n} | ${f(v.mittel)} | [${f(v.lo)}; ${f(v.hi)}] | ${v.p} | ${v.urteil} |`);
    L.push('', '## Ergänzend, beschreibend (95 %)', '', '| Gegner | R − A | Intervall |', '|---|---:|---|');
    for (const [o, a] of Object.entries(e.auswertung)) { const v = a.ergaenzend; L.push(`| ${o} | ${f(v.mittel)} | [${f(v.lo)}; ${f(v.hi)}] |`); }
    L.push('', '| Gegner | KI | Vergleich | Paare | Mittelwert [95 %] |', '|---|---|---|---:|---|');
    for (const [o, a] of Object.entries(e.auswertung)) for (const [color, vs] of Object.entries(a.farben)) for (const v of vs)
      L.push(`| ${o} | ${color} | ${v.a} − ${v.b} | ${v.n} | ${f(v.mittel)} [${f(v.lo)}; ${f(v.hi)}] |`);
    L.push('', '| Gegner | Arm | Siege / Entscheidungen | Remis | Clopper-Pearson 95 % | nicht entscheidbar |', '|---|---|---|---:|---|---:|');
    for (const [o, a] of Object.entries(e.auswertung)) for (const [arm, s] of Object.entries(a.siege)) L.push(`| ${o} | ${arm} | ${s.k}/${s.n} | ${s.remis} | [${f(s.ci[0])}; ${f(s.ci[1])}] | ${s.nichtPruefbar} |`);
    L.push('', '| Gegner | Vergleich | Entscheidbare Paare | Siege nur erster / nur zweiter | McNemar p | nicht entscheidbar |', '|---|---|---:|---|---:|---:|');
    for (const [o, a] of Object.entries(e.auswertung)) for (const v of [...a.haupt, a.ergaenzend]) L.push(`| ${o} | ${v.a} − ${v.b} | ${v.siege.n} | ${v.siege.nurA}/${v.siege.nurB} | ${v.siege.p} | ${v.siege.nichtPruefbar} |`);
    L.push('', 'Remis zählen als Nichtsieg. Ohne Siegentscheidung keine binäre Wertung; Anzahl separat. Ergänzende p-Werte begründen kein weiteres Signifikanzurteil. Keine Gleichwertigkeit aus fehlender Signifikanz ableiten.');
  }
  return L.join('\n') + '\n';
}
module.exports = {bewerte, bericht, BASELINE, ALPHA};
if (require.main === module) {
  const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
  if (!args[0]) { console.error('Aufruf: bericht.js ORDNER [--haupt] [--archiv ARCHIV] [--bericht DATEI] [--json DATEI]'); process.exit(2); }
  const e = bewerte(args[0], {probe: !args.includes('--haupt'), archiv: get('--archiv') || 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz'});
  const text = bericht(e);
  if (get('--bericht')) fs.writeFileSync(get('--bericht'), text); else process.stdout.write(text);
  if (get('--json')) fs.writeFileSync(get('--json'), JSON.stringify(e, null, 2) + '\n');
  process.exit(e.gueltig ? 0 : 1);
}
