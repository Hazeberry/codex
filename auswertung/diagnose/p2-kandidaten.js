// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* P2: Kandidatenabdeckung gegenüber GNU Go (docs/diagnose-p1p2.md §5).

   Frage: Steht GNU Gos Zug in der Stellung unter den Wurzelkindern, mit denen
   die Suche der KI tatsächlich lief? Das ist eine Aussage über die Abdeckung
   der Kandidatenliste gegenüber GNU Go als Referenz, nicht über die Qualität
   der Züge: Ein Zug, den GNU Go nicht wählt, kann gleichwertig oder besser sein.

   Rekonstruktion: wurzel-replay.js spielt die archivierte Partie mit demselben
   Zufall nach und liefert die Kandidatenlisten vor und nach dem Endspiel-Netz
   und die Wurzelkinder. Danach fragt GNU Go (Stufe 10, reg_genmove, fester
   Seed) in denselben Stellungen nach seinem Zug.

   Aufruf (ein Archiv):
     node auswertung/diagnose/p2-kandidaten.js --archiv NAME=datei.jsonl.gz --aus p2-NAME.jsonl
          [--partien 40] [--wiederhole 3] [--gnugo /usr/games/gnugo] [--stufe 10] [--fortsetzen]
     node auswertung/diagnose/p2-kandidaten.js --bericht p2-*.jsonl */
'use strict';
const fs = require('fs'), path = require('path'), {spawn} = require('child_process');
const R = require('./wurzel-replay.js');
const EW = require('./erwartet.js');

const VON = 80, BIS = 199, KINDER = 16;      /* mc der KI-Züge: Zug 81 bis 200; 16 = mctsRootChildren */
const GUELTIG = {reproduktion: 0.95, gnugoAntworten: 0.98, partienJeArchiv: 36};

/* ── Auswahl (vorab festgelegt) ───────────────────────────────────────── */
function waehleSpiele(rows, ziel = 40) {
  const geeignet = rows.filter(p => !(p.vorgabe >= 2) && !p.abgebrochen && p.zuege && p.zuege.length >= BIS + 1).sort((a, b) => a.nr - b.nr);
  const jede = Math.max(1, Math.floor(geeignet.length / ziel));
  return geeignet.filter(p => p.nr % jede === 0).slice(0, ziel);
}
/* Jeder zweite KI-Zug im Fenster mc 80..199, beginnend mit dem ersten */
function waehleStellungen(p) {
  const wir = p.wirFarbe === 'S' ? 0 : 1, mcs = [];
  for (let mc = VON; mc <= BIS; mc++) if (mc % 2 === wir) mcs.push(mc);
  return mcs.filter((_, i) => i % 2 === 0);
}

/* ── GNU Go ───────────────────────────────────────────────────────────── */
function gtpStarten(gnugo, stufe, komi, seed) {
  const p = spawn(gnugo, ['--mode', 'gtp', '--level', String(stufe), '--chinese-rules', '--komi', String(komi), '--seed', String(seed)], {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = ''; const warte = [];
  p.on('exit', (c, s) => { for (const w of warte.splice(0)) w(`? GNU Go beendet (${c}, ${s})`); });
  p.stdout.on('data', d => { puffer += d.toString(); let k; while ((k = puffer.indexOf('\n\n')) >= 0) { const a = puffer.slice(0, k); puffer = puffer.slice(k + 2); const w = warte.shift(); if (w) w(a); } });
  const frage = b => new Promise((ok, fehler) => { warte.push(a => a.startsWith('=') ? ok(a.slice(1).trim()) : fehler(new Error(`${b} → ${a}`))); p.stdin.write(b + '\n'); });
  return {frage, ende: () => { try { p.stdin.write('quit\n'); } catch (e) { /* schon weg */ } p.kill(); }};
}

/* ── Reine Auswertung (ohne GNU Go, getestet) ─────────────────────────── */
function stellungAuswerten(s) {
  /* s: {gespielt, g (Index, -1 = Pass, null = keine Antwort), vor, nach, kids, netz} */
  if (s.g === null || s.g === undefined) return {antwort: false};
  const rang = (liste, i) => { const k = liste.indexOf(i); return k < 0 ? 0 : k + 1; };
  const erste = s.vor.slice(0, KINDER);
  const inKids = s.kids.includes(s.g), inKidsOhneNetz = erste.includes(s.g);
  return {
    antwort: true, pass: s.g < 0, netzAn: !!s.netz,
    inKids, inKidsOhneNetz, nurDurchNetz: inKids && !inKidsOhneNetz, verlorenDurchNetz: !inKids && inKidsOhneNetz,
    inListe: rang(s.nach, s.g) > 0, rangVor: rang(s.vor, s.g), rangNach: rang(s.nach, s.g),
    gleichGespielt: s.g === s.gespielt,
    netzAenderteKinder: s.kids.slice().sort((a, b) => a - b).join() !== erste.slice().sort((a, b) => a - b).join(),
  };
}
const mittel = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sd = a => { if (a.length < 2) return null; const m = mittel(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
const ci = a => { const m = mittel(a), s = sd(a); return (m === null || s === null) ? null : [m - 1.96 * s / Math.sqrt(a.length), m + 1.96 * s / Math.sqrt(a.length)]; };

/* Je Partie ein Anteil, dann Mittel über die Partien (jede Partie zählt gleich); daneben die gepoolte Zahl */
function auswerten(partien) {
  const ausg = partien.filter(p => p.reproduziert);
  const feld = ['inKids', 'inKidsOhneNetz', 'nurDurchNetz', 'verlorenDurchNetz', 'inListe', 'gleichGespielt', 'netzAenderteKinder'];
  const je = {}, pool = {}; let n = 0;
  for (const f of feld) { je[f] = []; pool[f] = 0; }
  for (const p of ausg) {
    const st = p.stellungen.map(stellungAuswerten).filter(x => x.antwort && !x.pass);
    if (!st.length) continue;
    n += st.length;
    for (const f of feld) { je[f].push(mittel(st.map(x => x[f] ? 1 : 0))); pool[f] += st.filter(x => x[f]).length; }
  }
  const aus = {partien: je.inKids.length, stellungen: n};
  for (const f of feld) aus[f] = {proPartie: mittel(je[f]), ci: ci(je[f]), gepoolt: n ? pool[f] / n : null};
  return aus;
}

function gueltigkeit(partien, archive, erwartet = []) {
  const gruende = [];
  for (const n of erwartet) if (!archive[n]) gruende.push(`${n}: Archiv fehlt vollständig (keine Ergebnisse)`);
  for (const [name, ps] of Object.entries(archive)) {
    const rep = ps.filter(p => p.reproduziert).length;
    if (ps.length < GUELTIG.partienJeArchiv) gruende.push(`${name}: nur ${ps.length} Partien ausgewählt (mindestens ${GUELTIG.partienJeArchiv})`);
    if (rep / ps.length < GUELTIG.reproduktion) gruende.push(`${name}: ${rep} von ${ps.length} Partien exakt reproduziert (mindestens ${Math.ceil(GUELTIG.reproduktion * 100)} %)`);
  }
  const st = partien.filter(p => p.reproduziert).flatMap(p => p.stellungen);
  const mitNetz = st.filter(s => s.mc >= 80);
  if (mitNetz.some(s => !s.netz)) gruende.push(`Endspiel-Netz in ${mitNetz.filter(s => !s.netz).length} Stellungen ab Zug 81 nicht ausgeführt`);
  const anfragen = st.length, antworten = st.filter(s => s.g !== null && s.g !== undefined).length;
  if (anfragen && antworten / anfragen < GUELTIG.gnugoAntworten) gruende.push(`GNU Go antwortete nur in ${antworten} von ${anfragen} Stellungen (mindestens ${Math.ceil(GUELTIG.gnugoAntworten * 100)} %)`);
  const wdh = partien.filter(p => p.wiederholung);
  if (wdh.some(p => p.wiederholung !== 'gleich')) gruende.push('Wiederholungskontrolle: ' + wdh.filter(p => p.wiederholung !== 'gleich').length + ' Partien beim zweiten Nachspielen anders');
  return {gueltig: gruende.length === 0, gruende};
}

const pc = x => x === null || x === undefined ? '–' : (100 * x).toFixed(1) + ' %';
const pci = x => x ? `[${(100 * x[0]).toFixed(1)}; ${(100 * x[1]).toFixed(1)}]` : '–';
function bericht(partien, erwartet = []) {
  const archive = {};
  for (const p of partien) (archive[p.archiv] = archive[p.archiv] || []).push(p);
  const g = gueltigkeit(partien, archive, erwartet), z = [];
  z.push('# P2: Kandidatenabdeckung gegenüber GNU Go (Stufe 10)', '');
  if (!g.gueltig) z.push('**KEIN URTEIL (ungültig).** Grund: ' + g.gruende.join('; '), '', 'Die folgenden Zahlen sind **vorläufig**.', '');
  else z.push('Lauf gültig (alle vorab festgelegten technischen Bedingungen erfüllt).', '');
  z.push('Anteil der Stellungen, in denen GNU Gos Zug unter den 16 Wurzelkindern steht. Mittel über die Partien (jede Partie zählt gleich) mit 95-%-Intervall über die Partien; daneben gepoolt über alle Stellungen. Das ist Abdeckung, keine Zugqualität.', '');
  z.push('| Archiv | Partien (reproduziert/ausgewählt) | Stellungen | in Kindern | ohne Netz in Kindern | nur durch das Netz | durch das Netz verloren | in der Liste (alle) | GNU Gos Zug gespielt | Netz änderte Kinder |', '|---|---|---:|---|---|---|---|---|---|---|');
  const zeile = (name, ps) => {
    const a = auswerten(ps), rep = ps.filter(p => p.reproduziert).length, c = f => `${pc(a[f].proPartie)} ${pci(a[f].ci)} (gepoolt ${pc(a[f].gepoolt)})`;
    return `| ${name} | ${rep}/${ps.length} | ${a.stellungen} | ${c('inKids')} | ${c('inKidsOhneNetz')} | ${pc(a.nurDurchNetz.proPartie)} (${pc(a.nurDurchNetz.gepoolt)}) | ${pc(a.verlorenDurchNetz.proPartie)} (${pc(a.verlorenDurchNetz.gepoolt)}) | ${pc(a.inListe.proPartie)} (${pc(a.inListe.gepoolt)}) | ${pc(a.gleichGespielt.proPartie)} (${pc(a.gleichGespielt.gepoolt)}) | ${pc(a.netzAenderteKinder.proPartie)} (${pc(a.netzAenderteKinder.gepoolt)}) |`;
  };
  for (const [name, ps] of Object.entries(archive)) z.push(zeile(name, ps));
  z.push(zeile('alle Archive', partien));
  const ausgeschl = partien.filter(p => !p.reproduziert);
  z.push('', `Ausgeschlossen (nicht exakt reproduziert): ${ausgeschl.length}` + (ausgeschl.length ? ' – ' + ausgeschl.map(p => `${p.archiv} #${p.nr} (Abweichung bei Zug ${p.abweichung ? p.abweichung.mc + 1 : '?'})`).join(', ') : ''));
  const ohne = partien.flatMap(p => p.stellungen).filter(s => s.g === null || s.g === undefined).length;
  z.push(`Stellungen ohne Antwort von GNU Go: ${ohne}`);
  const passt = partien.filter(p => p.reproduziert).flatMap(p => p.stellungen).map(stellungAuswerten).filter(x => x.pass).length;
  z.push(`GNU Go passt in ${passt} Stellungen (nicht gezählt)`);
  return {text: z.join('\n'), gueltig: g.gueltig, gruende: g.gruende};
}

module.exports = {VON, BIS, KINDER, GUELTIG, waehleSpiele, waehleStellungen, stellungAuswerten, auswerten, gueltigkeit, bericht, gtpStarten, lauf};

/* ── Lauf ─────────────────────────────────────────────────────────────── */
async function lauf(name, datei, opt) {
  const E = R.ladeEngine(opt.html), rows = R.lies(datei), ausgewaehlt = waehleSpiele(rows, opt.partien);
  const aus = opt.aus, log = opt.log || (t => console.log(t));
  /* Fortsetzen: vollständig erfasste Partien (ohne Fehler) bleiben stehen und werden nicht neu gerechnet */
  const fertig = new Map();
  if (aus && opt.fortsetzen && fs.existsSync(aus))
    for (const l of fs.readFileSync(aus, 'utf8').split('\n').filter(Boolean)) { try { const r = JSON.parse(l); if (!r.fehler && r.reproduziert !== undefined) fertig.set(r.nr, r); } catch (e) { /* halbe Zeile nach Abbruch */ } }
  if (aus) fs.writeFileSync(aus, [...fertig.values()].map(r => JSON.stringify(r) + '\n').join(''));
  const ergebnis = [...fertig.values()];
  log(`P2 ${name}: ${ausgewaehlt.length} Partien ausgewählt, davon ${fertig.size} schon erfasst`);
  for (const [index, p] of ausgewaehlt.entries()) {
    if (fertig.has(p.nr)) continue;
    const bis = opt.bis || BIS;
    const mcs = waehleStellungen(p).filter(mc => mc <= bis), mcSet = new Set(mcs);
    const r = R.replay(E, p, {bis: bis + 1});
    const rec = {archiv: name, nr: p.nr, seed: p.seed, wirFarbe: p.wirFarbe, reproduziert: !r.abweichung, abweichung: r.abweichung, stellungen: []};
    if (index < opt.wiederhole) {
      const r2 = R.replay(E, p, {bis: bis + 1});
      rec.wiederholung = JSON.stringify(r2.zuege.map(z => z.kids)) === JSON.stringify(r.zuege.map(z => z.kids)) ? 'gleich' : 'anders';
    }
    const nachMc = new Map(r.zuege.map(z => [z.mc, z]));
    let g = null, ausgefallen = false;
    try {
      g = gtpStarten(opt.gnugo, opt.stufe, 7.5, 20261100 + p.nr);
      await g.frage('boardsize 19'); await g.frage('clear_board'); await g.frage('komi 7.5');
      for (let mc = 0; mc <= bis; mc++) {
        if (mcSet.has(mc) && nachMc.has(mc) && rec.reproduziert) {
          const z = nachMc.get(mc), farbe = mc % 2 === 0 ? 'B' : 'W';
          let antwort = null;
          if (!ausgefallen) { try { antwort = R.vonGtp(await g.frage(`reg_genmove ${farbe}`)); } catch (e) { ausgefallen = true; } }
          rec.stellungen.push({mc, gespielt: z.gespielt, g: antwort, vor: z.vor, nach: z.nach, kids: z.kids, netz: z.netz});
        }
        if (!ausgefallen) { try { await g.frage(`play ${mc % 2 === 0 ? 'B' : 'W'} ${p.zuege[mc]}`); } catch (e) { ausgefallen = true; } }
      }
    } catch (e) { rec.fehler = String(e.message || e); } finally { if (g) g.ende(); }
    if (!rec.reproduziert) rec.stellungen = [];
    ergebnis.push(rec);
    if (aus) fs.appendFileSync(aus, JSON.stringify(rec) + '\n');
    log(`Fortschritt P2 ${name}: ${ergebnis.length} von ${ausgewaehlt.length} Partien erledigt, ${ausgewaehlt.length - ergebnis.length} verbleibend`);
  }
  return ergebnis;
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (a.includes('--bericht')) {
    const dateien = a.filter(x => !x.startsWith('--') && x !== opt('--bericht'));
    const ps = [opt('--bericht'), ...dateien].filter(Boolean).flatMap(f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)));
    const b = bericht(EW.entdoppeln(ps), opt('--erwartet') ? opt('--erwartet').split(',') : EW.NAMEN); console.log(b.text); process.exit(b.gueltig ? 0 : 1);
  }
  const ar = opt('--archiv'); if (!ar || !ar.includes('=')) { console.error('--archiv NAME=datei erwartet'); process.exit(2); }
  const name = ar.slice(0, ar.indexOf('=')), datei = ar.slice(ar.indexOf('=') + 1);
  lauf(name, datei, {html: opt('--html') || path.join(__dirname, '..', '..', 'index.html'), aus: opt('--aus'), partien: +(opt('--partien') || 40), wiederhole: +(opt('--wiederhole') || 3), fortsetzen: a.includes('--fortsetzen'),
    gnugo: opt('--gnugo') || '/usr/games/gnugo', stufe: +(opt('--stufe') || 10)}).then(e => console.log(`${name}: ${e.length} Partien, ${e.filter(p => p.reproduziert).length} reproduziert`))
    .catch(err => { console.error(err.stack || err.message); process.exit(1); });
}
