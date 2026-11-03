// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des Hauptversuchs Kandidaten-Orakel, Stufe 1 (docs/kandidaten-orakel.md §5, §9, §12).

   Eingabe (Ordner): g-A.jsonl, g-S.jsonl, g-ZS.jsonl (GNU Go, Seed 231), f-A.jsonl, f-S.jsonl,
   f-ZS.jsonl (Fuego, Seed 232), je Partien 1 bis n; kontrolle.jsonl (Arm A, Seed 222, Nr. 1 bis 4);
   wiederholung-<g|f>-<Arm>.jsonl (Partien 1 bis 3 noch einmal gespielt). Dazu das Archiv für die
   Kontrolle (docs/daten/leeres-brett/lauf1/g-D.jsonl.gz).

   Gültigkeit: zwei Zustände. Ungültig = „KEIN URTEIL“ mit Grund, Exit 1; dann wird KEIN Effekt
   ausgegeben. Unvollständig (Partienummern fehlen) ist ungültig und wird als fortsetzbar gekennzeichnet.
   Die Gültigkeit hängt nicht vom Ausgang ab.

   Auswertung nur bei Gültigkeit:
   - primär je Gegner: Endstand S − A, gepaart nach Partienummer, zweiseitiger gepaarter t-Test,
     α = 0,025, Intervall zu 97,5 % (t-Verteilung). Ausgewertet werden nur vollständige Paare:
     Partienummern, die in allen drei Armen ausgewertet sind; alle Vergleiche nutzen dieselben Nummern.
     Ausfälle stehen je Arm, Gegner und Farbe im Bericht.
   - ergänzend, ohne Signifikanzurteil: S − ZS und ZS − A (95 %), Vorzeichentest, Siege (Clopper-Pearson
     95 %, exakter McNemar), alles auch nach Farbe getrennt; Fälle, Auslöser, Eingriffe, Dauer.

   Aufruf:  node haupt-bericht.js <ordner> <archiv.jsonl.gz> [--n 480] [--bericht bericht.md] [--json aus.json] */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const {vorzeichenP} = require('../messung-zusatz.js');

const ARME = ['A', 'S', 'ZS'], GEGNER = {g: 'GNU Go', f: 'Fuego'};
const AUSLOESER = ['c', 'd', 'd1'];
const FAELLE = ['a', 'b', 'c', 'c0', 'c1', 'd', 'd0', 'd1', 'e', 'x', 'kein-protokoll'];
const PRIOR_TOL = 1e-9, ALPHA_PRIMAER = 0.025, ALPHA_ERG = 0.05, MIN_ANTEIL = 0.98, WIEDERHOLT = [1, 2, 3];

const lies = d => {
  if (!fs.existsSync(d)) return [];
  const roh = fs.readFileSync(d);
  return (/\.gz$/.test(d) ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
};

/* ---- Statistik: t-Verteilung und Beta über die unvollständige Beta-Funktion (wie gnugo-vergleich.js) ---- */
function betacf(x, a, b) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}
function lgamma(z) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const c of g) s += c / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(x, a, b) / a : 1 - bt * betacf(1 - x, b, a) / b;
}
const pZweiseitig = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
/* t-Quantil: das t mit zweiseitigem p = alpha (Bisektion) */
function tQuantil(alpha, df) {
  let lo = 0, hi = 1000;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (pZweiseitig(m, df) > alpha) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/* Beta-Quantil (Bisektion) und Clopper-Pearson */
function betaQuantil(p, a, b) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (ibeta(m, a, b) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function clopperPearson(k, n, alpha) {
  if (!n) return [NaN, NaN];
  return [k === 0 ? 0 : betaQuantil(alpha / 2, k, n - k + 1), k === n ? 1 : betaQuantil(1 - alpha / 2, k + 1, n - k)];
}
function gepaart(diffs, alpha) {
  const n = diffs.length;
  if (n < 2) return {n, mittel: NaN, sd: NaN, t: NaN, p: NaN, lo: NaN, hi: NaN};
  const m = diffs.reduce((x, y) => x + y, 0) / n;
  const sd = Math.sqrt(diffs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)), se = sd / Math.sqrt(n);
  const t = se > 0 ? m / se : (m === 0 ? 0 : Infinity), p = se > 0 ? pZweiseitig(t, n - 1) : (m === 0 ? 1 : 0);
  const q = tQuantil(alpha, n - 1);
  return {n, mittel: m, sd, t, p, lo: m - q * se, hi: m + q * se, q};
}

/* ---- Hilfen ---- */
/* Grund, warum eine Partie nicht ausgewertet ist (null = ausgewertet) */
const ausfallGrund = r => !r ? 'fehlt' : r.abgebrochen ? 'abgebrochen: ' + String(r.abgebrochen).slice(0, 80)
  : !Number.isFinite(r.endstand) ? 'kein Endstand' : !r.kandidatenOrakel ? 'ohne Protokoll des Orakels' : null;
const ausgewertet = r => r && !r.abgebrochen && Number.isFinite(r.endstand) && !!r.kandidatenOrakel;
const kiAmZug = (r, ab) => { const s = []; for (let mc = ab; mc < r.zuegeAnzahl; mc++) if ((mc % 2 === 0) === (r.wirFarbe === 'S')) s.push(mc); return s; };
const ersterAusloeser = r => r.kandidatenOrakel.ereignisse.find(e => AUSLOESER.includes(e.fall));
const gleichePartie = (a, b) => JSON.stringify(a.zuege) === JSON.stringify(b.zuege) && a.endstand === b.endstand;

function bewerte(ordner, archivPfad, n = 480) {
  const gruende = [], daten = {}, karten = {};
  let vollstaendig = true;
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    const d = lies(path.join(ordner, `${o}-${a}.jsonl`));
    daten[o + a] = d;
    karten[o + a] = new Map(d.map(r => [r.nr, r]));
  }

  /* 1. Vollständigkeit: jede Nummer 1..n genau einmal je Arm und Gegner (damit auch gleich viele je Farbe) */
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    const d = daten[o + a], nummern = d.map(r => r.nr), m = new Set(nummern);
    const fehlt = []; for (let nr = 1; nr <= n; nr++) if (!m.has(nr)) fehlt.push(nr);
    const fremd = nummern.filter(nr => !(nr >= 1 && nr <= n)), doppelt = nummern.length - m.size;
    if (fehlt.length) { vollstaendig = false; gruende.push(`${GEGNER[o]} Arm ${a}: ${fehlt.length} von ${n} Partien fehlen (unvollständig, fortsetzbar)`); }
    if (fremd.length || doppelt) gruende.push(`${GEGNER[o]} Arm ${a}: ${fremd.length} Partien außerhalb 1 bis ${n}, ${doppelt} doppelt`);
    if (d.some(r => r.wirFarbe && r.wirFarbe !== (r.nr % 2 === 0 ? 'S' : 'W'))) gruende.push(`${GEGNER[o]} Arm ${a}: Farbe passt nicht zur Partienummer`);
    if (d.some(r => r.kandidatenOrakel && r.kandidatenOrakel.arm !== a)) gruende.push(`${GEGNER[o]} Arm ${a}: Partie eines anderen Arms in der Datei`);
    /* 2. mindestens 98 % ausgewertet */
    const aus = d.filter(ausgewertet).length;
    if (aus < Math.ceil(MIN_ANTEIL * n)) gruende.push(`${GEGNER[o]} Arm ${a}: ${aus} von ${n} Partien ausgewertet (verlangt ≥ ${Math.ceil(MIN_ANTEIL * n)})`);
  }

  /* 3. Kontrolle gegen das Archiv (Bedingung 1) */
  const kontrolle = lies(path.join(ordner, 'kontrolle.jsonl'));
  const arch = archivPfad ? lies(archivPfad).filter(r => r.nr >= 1 && r.nr <= 4) : [];
  const kontrolleOk = arch.length === 4 && kontrolle.length === 4 && arch.every(r => { const k = kontrolle.find(x => x.nr === r.nr); return k && gleichePartie(k, r); });
  if (!kontrolleOk) gruende.push('Bedingung 1: Arm A reproduziert die vier archivierten Partien (Seed 222, Nr. 1 bis 4) nicht bitgleich');

  /* 4. Antwortquote je Arm und Gegner (Bedingung 2) */
  const quoten = {};
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    const d = daten[o + a].filter(r => r.kandidatenOrakel);
    const abf = d.reduce((x, r) => x + r.kandidatenOrakel.abfragen, 0), ohne = d.reduce((x, r) => x + r.kandidatenOrakel.ohneAntwort, 0);
    quoten[o + a] = {abf, ohne, quote: abf ? 1 - ohne / abf : null};
    if (!abf || 1 - ohne / abf < MIN_ANTEIL) gruende.push(`${GEGNER[o]} Arm ${a}: Antwortquote des Orakels ${abf ? ((1 - ohne / abf) * 100).toFixed(1) : '–'} % (verlangt ≥ 98 %)`);
  }

  /* 5. Zählersummen: ein Eintrag je Abfrage, eine Abfrage je KI-Zug ab Zug ab+1, Fälle bekannt */
  let zaehlFehler = 0;
  const faelle = {};
  for (const o of Object.keys(GEGNER)) {
    faelle[o] = {S: {}, W: {}};
    for (const a of ARME) for (const r of daten[o + a].filter(ausgewertet)) {
      const k = r.kandidatenOrakel, ev = k.ereignisse;
      const soll = kiAmZug(r, k.ab);
      if (ev.length !== k.abfragen || JSON.stringify(ev.map(e => e.mc)) !== JSON.stringify(soll)
          || ev.filter(e => e.fall === 'x').length !== k.ohneAntwort || ev.some(e => !FAELLE.includes(e.fall))) { zaehlFehler++; continue; }
      for (const e of ev) { const t = faelle[o][e.f]; t[e.fall] = (t[e.fall] || 0) + 1; }
    }
    /* 6. Fall d in beiden Farben (Bedingung 3) */
    for (const f of ['S', 'W']) if (!(faelle[o][f].d > 0)) gruende.push(`Bedingung 3: ${GEGNER[o]}: Fall d tritt mit der KI als ${f === 'S' ? 'Schwarz' : 'Weiß'} nicht auf`);
  }
  if (zaehlFehler) gruende.push(`Zählersummen gehen in ${zaehlFehler} Partien nicht auf (Einträge, Abfragen, KI-Züge oder Fälle)`);

  /* 5b. Prior-Summe zur Laufzeit (§9): jeder Eingriff mit protokollierter Summe, Abweichung ≤ 1e-9.
     Fehlerprotokoll: jede Abweichung (auch ohne Eingriff) und jeder Eingriff ohne Summe. */
  const priorFehler = [];
  let priorMax = 0, priorGeprueft = 0;
  for (const o of Object.keys(GEGNER)) for (const a of ARME) for (const r of daten[o + a]) {
    if (!r.kandidatenOrakel) continue;
    for (const e of r.kandidatenOrakel.ereignisse) {
      const eingriff = !!(e.auf || e.ang), hat = Number.isFinite(e.ps);
      if (hat) { priorGeprueft++; priorMax = Math.max(priorMax, Math.abs(e.ps - 1)); }
      if ((eingriff && !hat) || (hat && Math.abs(e.ps - 1) > PRIOR_TOL) || e.pf)
        priorFehler.push({gegner: o, arm: a, nr: r.nr, farbe: e.f, mc: e.mc, fall: e.fall, eingriff, summe: hat ? e.ps : null, priors: e.pf || null});
    }
  }
  const priorFehlerEingriff = priorFehler.filter(x => x.eingriff).length;
  if (priorFehlerEingriff) gruende.push(`Prior-Summe: ${priorFehlerEingriff} Eingriffe ohne Summe oder mit Abweichung > 1e-9 (Fehlerprotokoll im Bericht)`);

  /* 7. Erster Auslöser S gegen ZS (Bedingung 4) */
  const ausl = {};
  for (const o of Object.keys(GEGNER)) {
    let paare = 0, abw = 0, ohne = 0, nichtPruefbar = 0;
    for (const s of daten[o + 'S']) {
      const z = karten[o + 'ZS'].get(s.nr);
      if (!z) continue;
      if (!s.kandidatenOrakel || !z.kandidatenOrakel) { nichtPruefbar++; continue; }
      paare++;
      const es = ersterAusloeser(s), ez = ersterAusloeser(z);
      if (!es && !ez) { ohne++; continue; }
      if (!es || !ez || es.mc !== ez.mc || es.fall !== ez.fall || es.r !== ez.r || es.rn !== ez.rn) abw++;
    }
    ausl[o] = {paare, abw, ohne, nichtPruefbar};
    if (abw > 0) gruende.push(`Bedingung 4: ${GEGNER[o]}: erster Auslöser von S und ZS weicht in ${abw} von ${paare} Paaren ab (verlangt: 0)`);
  }

  /* 8. Wiederholungskontrolle: Partien 1 bis 3 je Arm und Gegner noch einmal, identisch */
  const wiederholung = {};
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    const w = new Map(lies(path.join(ordner, `wiederholung-${o}-${a}.jsonl`)).map(r => [r.nr, r]));
    const ok = WIEDERHOLT.every(nr => { const x = karten[o + a].get(nr), y = w.get(nr); return ausgewertet(x) && ausgewertet(y) && gleichePartie(x, y); });
    wiederholung[o + a] = ok;
    if (!ok) gruende.push(`Wiederholungskontrolle: ${GEGNER[o]} Arm ${a}: Partien 1 bis 3 beim zweiten Spielen nicht identisch (oder fehlen, oder abgebrochen)`);
  }

    /* Vollständige Paare: Nummern, die in allen drei Armen eines Gegners ausgewertet sind */
  const voll = {};
  for (const o of Object.keys(GEGNER)) {
    voll[o] = new Set();
    for (let nr = 1; nr <= n; nr++) if (ARME.every(a => ausgewertet(karten[o + a].get(nr)))) voll[o].add(nr);
  }
  return {gruende, gueltig: gruende.length === 0, vollstaendig, n, daten, karten, quoten, faelle, ausl, wiederholung, kontrolleOk, zaehlFehler,
          priorFehler, priorMax, priorGeprueft, voll};
}

/* ---- Auswertung (nur bei Gültigkeit aufgerufen) ---- */
function vergleich(X, Y, alpha, filter = () => true) {
  /* Differenz X − Y je Partienummer, beide ausgewertet; der Aufrufer schränkt über filter auf die
     vollständigen Paare ein (alle drei Arme ausgewertet) */
  const diffs = [], vz = {besser: 0, schlechter: 0};
  let b = 0, c = 0, nS = 0;
  for (const [nr, x] of X) {
    const y = Y.get(nr);
    if (!ausgewertet(x) || !ausgewertet(y) || !filter(x)) continue;
    const d = x.endstand - y.endstand; diffs.push(d);
    if (d > 0) vz.besser++; else if (d < 0) vz.schlechter++;
    if (typeof x.gewonnen === 'boolean' && typeof y.gewonnen === 'boolean') { nS++; if (x.gewonnen && !y.gewonnen) b++; else if (!x.gewonnen && y.gewonnen) c++; }
  }
  return {...gepaart(diffs, alpha), vz: {...vz, p: vorzeichenP(vz.besser, vz.schlechter)}, siege: {n: nS, nurX: b, nurY: c, p: vorzeichenP(b, c)}};
}
function siegrate(M, filter = () => true) {
  const r = [...M.values()].filter(x => ausgewertet(x) && typeof x.gewonnen === 'boolean' && filter(x));
  const k = r.filter(x => x.gewonnen).length;
  return {k, n: r.length, ci: clopperPearson(k, r.length, ALPHA_ERG)};
}
function beschreibe(e) {
  const aus = {};
  for (const o of Object.keys(GEGNER)) {
    const K = a => e.karten[o + a], V = r => e.voll[o].has(r.nr);
    const primaer = vergleich(K('S'), K('A'), ALPHA_PRIMAER, V);
    const urteil = !(primaer.p < ALPHA_PRIMAER) ? 'kein nachgewiesener Unterschied' : primaer.mittel > 0 ? 'S besser als A' : 'S schlechter als A';
    const farben = {};
    for (const f of ['S', 'W']) {
      const fl = r => r.wirFarbe === f && V(r);
      farben[f] = {SA: vergleich(K('S'), K('A'), ALPHA_ERG, fl), SZS: vergleich(K('S'), K('ZS'), ALPHA_ERG, fl), ZSA: vergleich(K('ZS'), K('A'), ALPHA_ERG, fl),
                   siege: Object.fromEntries(ARME.map(a => [a, siegrate(K(a), fl)]))};
    }
    const arme = {};
    for (const a of ARME) {
      const d = e.daten[o + a].filter(ausgewertet), ev = d.flatMap(r => r.kandidatenOrakel.ereignisse);
      const ms = d.map(r => r.kandidatenOrakel.partieMs).filter(Number.isFinite).sort((x, y) => x - y);
      const trig = ev.filter(x => AUSLOESER.includes(x.fall));
      arme[a] = {partien: d.length, abgebrochen: e.daten[o + a].filter(r => r.abgebrochen).length,
        ausloeser: d.length ? trig.length / d.length : NaN, eingriffe: d.length ? ev.filter(x => x.auf || x.ang).length / d.length : NaN,
        gleichG: trig.length ? trig.filter(x => x.gl).length / trig.length : NaN,
        ohneProt: ev.filter(x => x.fall === 'kein-protokoll').length, ohneProtMitZug: ev.filter(x => x.fall === 'kein-protokoll' && x.g !== null && x.g >= 0).length,
        zuege: d.length ? d.reduce((x, r) => x + r.zuegeAnzahl, 0) / d.length : NaN,
        medianS: ms.length ? (ms.length % 2 ? ms[ms.length >> 1] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2) / 1000 : NaN, maxS: ms.length ? ms[ms.length - 1] / 1000 : NaN, summeH: ms.reduce((x, y) => x + y, 0) / 3600000,
        siege: siegrate(K(a), V)};
    }
    /* Ausfälle je Arm und Farbe: nicht ausgewertet (abgebrochen oder ohne Endstand) und Partien, die
       nur wegen eines Ausfalls in einem anderen Arm nicht in die Paare eingehen */
    const ausfaelle = {};
    for (const a of ARME) for (const f of ['S', 'W']) {
      const nummern = []; for (let nr = 1; nr <= e.n; nr++) if ((nr % 2 === 0 ? 'S' : 'W') === f) nummern.push(nr);
      const eigen = nummern.filter(nr => !ausgewertet(K(a).get(nr)));
      const fremd = nummern.filter(nr => ausgewertet(K(a).get(nr)) && !e.voll[o].has(nr));
      const gruende = {};
      for (const nr of eigen) { const g = ausfallGrund(K(a).get(nr)); gruende[g] = (gruende[g] || 0) + 1; }
      ausfaelle[a + f] = {gespielt: nummern.filter(nr => K(a).has(nr)).length, soll: nummern.length,
        abgebrochen: eigen.filter(nr => K(a).get(nr) && K(a).get(nr).abgebrochen).length, ausgefallen: eigen.length, nurAnderer: fremd.length, nummern: eigen, gruende};
    }
    aus[o] = {primaer, urteil, SZS: vergleich(K('S'), K('ZS'), ALPHA_ERG, V), ZSA: vergleich(K('ZS'), K('A'), ALPHA_ERG, V), farben, arme,
              vollePaare: e.voll[o].size, ausfaelle};
  }
  return aus;
}

/* ---- Text ---- */
const k1 = x => !Number.isFinite(x) ? '–' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
const vz1 = x => !Number.isFinite(x) ? '–' : (x >= 0 ? '+' : '−') + k1(Math.abs(x));
const pz = x => !Number.isFinite(x) ? '–' : (100 * x).toFixed(1).replace('.', ',') + ' %';
const fp = p => !Number.isFinite(p) ? '–' : p < 1e-4 ? p.toExponential(1).replace('.', ',') : p.toFixed(4).replace('.', ',');
const iv = v => `${vz1(v.mittel)} [${vz1(v.lo)}; ${vz1(v.hi)}]`;

function bericht(e, a) {
  const L = ['# Hauptversuch Kandidaten-Orakel, Stufe 1 (Arme A, S, ZS)', ''];
  if (!e.gueltig) {
    L.push('**KEIN URTEIL** – ungültig:', '');
    for (const g of e.gruende) L.push(`- ${g}`);
    L.push('');
    if (!e.vollstaendig) L.push('Der Lauf ist **unvollständig**. Fortsetzen: Workflow erneut starten mit `fortsetzen_aus` = Nummer dieses Laufs; fertige Partien werden nicht neu gerechnet.', '');
    L.push('Bei ungültigem Lauf wird kein Effekt ausgegeben.', '');
  } else {
    L.push(`**Gültig.** ${e.n} Partienummern je Arm und Gegner gespielt; Kontrolle gegen das Archiv bitgleich; Wiederholungskontrolle identisch; Zählersummen stimmen; Prior-Summe 1 in jedem Eingriff; erster Auslöser S = ZS in allen Paaren.`, '');
  }
  L.push('## Technische Kennzahlen', '', '| Gegner | Arm | Antwortquote | Wiederholung | erster Auslöser S/ZS |', '|---|---|---:|---|---|');
  for (const o of Object.keys(GEGNER)) for (const x of ARME) {
    const q = e.quoten[o + x], au = e.ausl[o];
    L.push(`| ${GEGNER[o]} | ${x} | ${q.quote === null ? '–' : pz(q.quote)} (${q.abf - q.ohne}/${q.abf}) | ${e.wiederholung[o + x] ? 'identisch' : 'NICHT identisch'} | ${x === 'S' ? `${au.paare} Paare, ${au.abw} abweichend, ${au.ohne} ohne Auslöser` : ''} |`);
  }
  L.push('', `Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4): ${e.kontrolleOk ? 'bitgleich' : 'NICHT bitgleich'}.`, '');
  L.push('### Prior-Summe zur Laufzeit', '', `Geprüft: ${e.priorGeprueft} Protokolleinträge mit Summe; größte Abweichung von 1: ${e.priorMax.toExponential(2).replace('.', ',')} (Grenze 1e-9). Fehlerprotokoll: ${e.priorFehler.length} Einträge, davon ${e.priorFehler.filter(x => x.eingriff).length} bei einem Eingriff.`, '');
  if (e.priorFehler.length) {
    L.push('| Gegner | Arm | Partie | KI | Zug | Fall | Eingriff | Summe |', '|---|---|---:|---|---:|---|---|---|');
    for (const x of e.priorFehler.slice(0, 30)) L.push(`| ${GEGNER[x.gegner]} | ${x.arm} | ${x.nr} | ${x.farbe} | ${x.mc} | ${x.fall} | ${x.eingriff ? 'ja' : 'nein'} | ${x.summe === null ? 'fehlt' : String(x.summe)} |`);
    if (e.priorFehler.length > 30) L.push('', `… ${e.priorFehler.length - 30} weitere, vollständig in auswertung.json (mit allen Priors).`);
    L.push('');
  }
  L.push('### Fälle nach Farbe (alle Arme)', '');
  for (const o of Object.keys(GEGNER)) {
    const ks = FAELLE.filter(k => e.faelle[o].S[k] || e.faelle[o].W[k]);
    L.push(`${GEGNER[o]}:`, '', '| Farbe | ' + ks.join(' | ') + ' |', '|---|' + ks.map(() => '---:').join('|') + '|');
    for (const f of ['S', 'W']) L.push(`| KI ${f === 'S' ? 'Schwarz' : 'Weiß'} | ` + ks.map(k => e.faelle[o][f][k] || 0).join(' | ') + ' |');
    L.push('');
  }
  if (!e.gueltig) return L.join('\n') + '\n';

  L.push('## Ausfälle und vollständige Paare', '', 'Ausgewertet werden nur **vollständige Paare**: Partienummern, die in allen drei Armen eines Gegners ausgewertet sind. Alle Vergleiche nutzen dieselben Nummern.', '',
    '| Gegner | Arm | KI | gespielt | nicht ausgewertet (davon abgebrochen) | nur wegen Ausfall in anderem Arm nicht im Paar | Nummern der eigenen Ausfälle | Gründe |', '|---|---|---|---:|---:|---:|---|---|');
  for (const o of Object.keys(GEGNER)) for (const x of ARME) for (const f of ['S', 'W']) {
    const z = a[o].ausfaelle[x + f];
    const gr = Object.entries(z.gruende).map(([g, k]) => `${g.replace(/\|/g, '/')} (${k})`).join('; ') || '–';
    L.push(`| ${GEGNER[o]} | ${x} | ${f === 'S' ? 'Schwarz' : 'Weiß'} | ${z.gespielt}/${z.soll} | ${z.ausgefallen} (${z.abgebrochen}) | ${z.nurAnderer} | ${z.nummern.join(', ') || '–'} | ${gr} |`);
  }
  L.push('');
  for (const o of Object.keys(GEGNER)) L.push(`- ${GEGNER[o]}: **${a[o].vollePaare} vollständige Paare** von ${e.n} verwendet; alle Intervalle und Tests unten sind aus diesen Paaren berechnet.`);
  L.push('', 'Eine eigene Schwelle für vollständige Paare gibt es nicht: Für die Vollständigkeit gilt allein die 98-%-Regel je Arm; alle übrigen Gültigkeitsbedingungen gelten unverändert (Festlegung Hazeberry, 03.11.2026).');
  L.push('', '## Primärer Endpunkt: Endstand S − A (gepaart, α = 0,025 je Gegner, Intervall 97,5 %)', '',
    '| Gegner | verwendete Paare | Differenz S − A [97,5 %] | SD | t | p (zweiseitig) | Urteil |', '|---|---:|---|---:|---:|---:|---|');
  for (const o of Object.keys(GEGNER)) {
    const p = a[o].primaer;
    L.push(`| ${GEGNER[o]} | ${p.n} | ${iv(p)} | ${k1(p.sd)} | ${k1(p.t)} | ${fp(p.p)} | ${a[o].urteil} |`);
  }
  L.push('');
  for (const o of Object.keys(GEGNER)) if (a[o].urteil === 'kein nachgewiesener Unterschied')
    L.push(`- ${GEGNER[o]}: kein nachgewiesener Gewinn über ${vz1(a[o].primaer.hi)} Punkte (Obergrenze des 97,5-%-Intervalls). Das heißt nicht „kein Effekt“ (§6).`);
  L.push('', '## Ergänzend, ohne Signifikanzurteil (95 %)', '',
    '| Gegner | Vergleich | verwendete Paare | Differenz [95 %] | Vorzeichen (besser/schlechter, p) | Siege: nur erster / nur zweiter (McNemar p) |', '|---|---|---:|---|---|---|');
  for (const o of Object.keys(GEGNER)) for (const [txt, v] of [['S − ZS', a[o].SZS], ['ZS − A', a[o].ZSA], ['S − A', a[o].primaer]]) {
    const w = txt === 'S − A' ? vergleich(e.karten[o + 'S'], e.karten[o + 'A'], ALPHA_ERG, r => e.voll[o].has(r.nr)) : v;
    L.push(`| ${GEGNER[o]} | ${txt} | ${w.n} | ${iv(w)} | ${w.vz.besser}/${w.vz.schlechter}, ${fp(w.vz.p)} | ${w.siege.nurX}/${w.siege.nurY} (${fp(w.siege.p)}) |`);
  }
  L.push('', '### Nach Farbe der KI (95 %, beschreibend)', '', '| Gegner | KI | S − A | S − ZS | ZS − A | Siege A | Siege S | Siege ZS |', '|---|---|---|---|---|---|---|---|');
  for (const o of Object.keys(GEGNER)) for (const f of ['S', 'W']) {
    const x = a[o].farben[f], sg = s => `${pz(s.n ? s.k / s.n : NaN)} [${pz(s.ci[0])}; ${pz(s.ci[1])}]`;
    L.push(`| ${GEGNER[o]} | ${f === 'S' ? 'Schwarz' : 'Weiß'} | ${iv(x.SA)} (${x.SA.n}) | ${iv(x.SZS)} | ${iv(x.ZSA)} | ${sg(x.siege.A)} | ${sg(x.siege.S)} | ${sg(x.siege.ZS)} |`);
  }
  L.push('', '## Beschreibung je Arm', '',
    '| Gegner | Arm | ausgewertet | abgebrochen | Siege in vollständigen Paaren [95 %] | Züge Ø | Auslöser je Partie (c, d, d1) | Eingriffe je Partie | gespielt = Orakelzug bei Auslöser | kein-protokoll (davon Orakel mit Zug) | Dauer Median / Max (s) | Partiezeit (h) |',
    '|---|---|---:|---:|---|---:|---:|---:|---:|---|---|---:|');
  let summe = 0;
  for (const o of Object.keys(GEGNER)) for (const x of ARME) {
    const r = a[o].arme[x]; summe += r.summeH;
    L.push(`| ${GEGNER[o]} | ${x} | ${r.partien} | ${r.abgebrochen} | ${pz(r.siege.n ? r.siege.k / r.siege.n : NaN)} [${pz(r.siege.ci[0])}; ${pz(r.siege.ci[1])}] | ${k1(r.zuege)} | ${k1(r.ausloeser)} | ${k1(r.eingriffe)} | ${pz(r.gleichG)} | ${r.ohneProt} (${r.ohneProtMitZug}) | ${k1(r.medianS)} / ${k1(r.maxS)} | ${k1(r.summeH)} |`);
  }
  L.push('', `Summe der Partiezeit (ohne Einrichten der Jobs und Kontrollen): ${k1(summe)} h (Planungsbudget rund 160 h).`, '');
  return L.join('\n') + '\n';
}

module.exports = {bewerte, beschreibe, bericht, gepaart, tQuantil, clopperPearson, pZweiseitig, kiAmZug};

if (require.main === module) {
  const a = process.argv.slice(2), wert = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !['--n', '--bericht', '--json'].includes(a[i - 1]));
  if (!pos[0]) { console.error('Aufruf: node haupt-bericht.js <ordner> <archiv.jsonl.gz> [--n 480] [--bericht bericht.md] [--json aus.json]'); process.exit(2); }
  const n = wert('--n') ? +wert('--n') : 480;
  const e = bewerte(pos[0], pos[1], n), aus = e.gueltig ? beschreibe(e) : null, t = bericht(e, aus);
  if (wert('--bericht')) fs.writeFileSync(wert('--bericht'), t); else process.stdout.write(t);
  if (wert('--json')) fs.writeFileSync(wert('--json'), JSON.stringify({gueltig: e.gueltig, vollstaendig: e.vollstaendig, gruende: e.gruende,
    priorFehler: e.priorFehler, priorMax: e.priorMax, auswertung: aus}, (k, v) => v instanceof Set ? [...v] : v, 1));
  process.exit(e.gueltig ? 0 : 1);
}
