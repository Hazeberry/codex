// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des Vierarm-Versuchs Kandidaten-Orakel (docs/kandidaten-orakel-vierarm.md), Probe und Hauptlauf.

   Eingabe (Ordner): <g|f>-<A|N|P|S>.jsonl (alle Pakete eines Arms zusammengeführt), kontrolle.jsonl
   (Arm A, Seed 222, Nr. 1 bis 4), im Hauptlauf dazu wiederholung-<g|f>-<Arm>.jsonl (Nr. 1 bis 3).
   Dazu das Archiv für die Kontrolle (docs/daten/leeres-brett/lauf1/g-D.jsonl.gz).

   Gültigkeit (§7): zwei Zustände; ungültig = „KEIN URTEIL“ mit Grund, Exit 1, kein Effekt im Bericht.
   Probe (--probe, §9): Vollständigkeit der gespielten Nummern und die Bedingungen 3, 4, 5, 7, 8, 10, 11;
   ausgegeben werden nur Technik, Laufzeit, Fälle, Aufnahme und Anhebung, KEINE Endstand-Unterschiede.
   Hauptlauf: alle Bedingungen 1 bis 11 (9 prüft zusammenfuehren.js vorher); Auswertung nur bei Gültigkeit:
   - primär (§5): N − A, S − N, P − A je Gegner, gepaarter t-Test, α = 0,05/6, Intervall 1 − α;
   - ergänzend (95 %): S − A (Replikation), S − P, Vorzeichentest, Siege, alles auch nach Farbe;
   - nur vollständige Vierergruppen (Nummern, die in allen vier Armen ausgewertet sind);
   - Protokoll getrennt nach „schon Kind“ (Fall c) und „neu aufgenommen“ (Fall d, d1), §8.

   Aufruf:  node vierarm-bericht.js <ordner> <archiv.jsonl.gz> [--probe] [--n 480 | --n g=8,f=4]
                 [--bericht bericht.md] [--json aus.json] */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const {vorzeichenP} = require('../messung-zusatz.js');
const {gepaart, clopperPearson, kiAmZug} = require('./haupt-bericht.js');

const ARME = ['A', 'N', 'P', 'S'], GEGNER = {g: 'GNU Go', f: 'Fuego (100 Spiele je Zug)'};
const AUSLOESER = ['c', 'd', 'd1'];
const FAELLE = ['a', 'b', 'c', 'c0', 'c1', 'd', 'd0', 'd1', 'e', 'x', 'kein-protokoll'];
const HAUPT = [['N', 'A'], ['S', 'N'], ['P', 'A']], ERG = [['S', 'A'], ['S', 'P']];
const ALPHA_PRIMAER = 0.05 / 6, ALPHA_ERG = 0.05, MIN_ANTEIL = 0.98, PRIOR_TOL = 1e-9, WIEDERHOLT = [1, 2, 3];
const PHASEN = [['81–160', 80, 159], ['161–240', 160, 239], ['ab 241', 240, Infinity]];

const lies = d => {
  if (!fs.existsSync(d)) return [];
  const roh = fs.readFileSync(d);
  return (/\.gz$/.test(d) ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
};
/* Status einer Partie: ok (ausgewertet), ausfall (zulässiger Partieausfall: abgebrochen, zählt gegen die
   98 %), technisch (Pflichtprotokoll oder Endstand fehlt ohne Abbruch: technischer Fehler, macht den Lauf
   ungültig), fehlt (Nummer nicht gespielt: unvollständig). */
const status = r => !r ? 'fehlt' : r.abgebrochen ? 'ausfall' : (!r.kandidatenOrakel || !Number.isFinite(r.endstand)) ? 'technisch' : 'ok';
const ausfallGrund = r => !r ? 'fehlt' : r.abgebrochen ? 'abgebrochen: ' + String(r.abgebrochen).slice(0, 80)
  : !r.kandidatenOrakel ? 'Pflichtprotokoll fehlt' : !Number.isFinite(r.endstand) ? 'kein Endstand' : null;
const ausgewertet = r => status(r) === 'ok';
const gleichePartie = (a, b) => JSON.stringify(a.zuege) === JSON.stringify(b.zuege) && a.endstand === b.endstand;
const ersterAusloeser = r => r.kandidatenOrakel.ereignisse.find(e => AUSLOESER.includes(e.fall));

/* §7 Punkt 11: Eingriffsart je Arm an einem Protokolleintrag */
function eingriffOk(arm, e) {
  const auf = !!e.auf, ang = !!e.ang, d = e.fall === 'd' || e.fall === 'd1';
  if (arm === 'A') return !auf && !ang;
  if (arm === 'N') return !ang && auf === d;
  if (arm === 'P') return !auf && ang === (e.fall === 'c');
  if (arm === 'S') return auf === d && ang === (e.fall === 'c' || e.fall === 'd');
  return false;
}

/* Jede technische Prüfung: Nummer, Name, geprüfte Einheiten, nicht prüfbare Einheiten (mit Grund), Ergebnis,
   Gründe bei Nichtbestehen. Zulässige Partieausfälle stehen getrennt (ausfaelle) und nie unter „bestanden“. */
function bewerte(ordner, archivPfad, nJe, probe) {
  const pruefungen = [], daten = {}, karten = {};
  const pr = (nr, name, geprueft, nichtPruefbar, fehler) => pruefungen.push({nr, name, geprueft, nichtPruefbar, ok: fehler.length === 0, fehler});
  let vollstaendig = true;
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    daten[o + a] = lies(path.join(ordner, `${o}-${a}.jsonl`));
    karten[o + a] = new Map(daten[o + a].map(r => [r.nr, r]));
  }
  const alle = Object.keys(GEGNER).flatMap(o => ARME.flatMap(a => daten[o + a].map(r => ({o, a, r}))));

  /* zulässige Partieausfälle (getrennt berichtet) */
  const ausfaelle = alle.filter(x => status(x.r) === 'ausfall').map(x => ({gegner: x.o, arm: x.a, nr: x.r.nr, farbe: x.r.nr % 2 === 0 ? 'S' : 'W', grund: ausfallGrund(x.r)}));

  /* 1. Vollständigkeit */
  { const f = [];
    for (const o of Object.keys(GEGNER)) for (const a of ARME) {
      const n = nJe[o], d = daten[o + a], m = new Set(d.map(r => r.nr));
      const fehlt = []; for (let nr = 1; nr <= n; nr++) if (!m.has(nr)) fehlt.push(nr);
      if (fehlt.length) { vollstaendig = false; f.push(`${GEGNER[o]} Arm ${a}: ${fehlt.length} von ${n} Partien fehlen (unvollständig, fortsetzbar)`); }
      if (d.some(r => !(r.nr >= 1 && r.nr <= n)) || m.size !== d.length) f.push(`${GEGNER[o]} Arm ${a}: Partien außerhalb 1 bis ${n} oder doppelt`);
      if (d.some(r => r.wirFarbe && r.wirFarbe !== (r.nr % 2 === 0 ? 'S' : 'W'))) f.push(`${GEGNER[o]} Arm ${a}: Farbe passt nicht zur Partienummer`);
      if (d.some(r => r.kandidatenOrakel && r.kandidatenOrakel.arm !== a)) f.push(`${GEGNER[o]} Arm ${a}: Partie eines anderen Arms in der Datei`);
    }
    pr('1', 'Vollständigkeit (jede Nummer genau einmal, Farbe nach Nummer)', `${alle.length} Partien`, '–', f); }

  /* Pflichtprotokoll: jede nicht abgebrochene Partie mit Protokoll des Orakels und Endstand */
  { const t = alle.filter(x => status(x.r) === 'technisch');
    pr('P', 'Pflichtprotokoll und Endstand je nicht abgebrochener Partie', `${alle.length - ausfaelle.length} Partien`, ausfaelle.length ? `${ausfaelle.length} (zulässiger Ausfall)` : '–',
       t.map(x => `${GEGNER[x.o]} Arm ${x.a} Nr. ${x.r.nr}: ${ausfallGrund(x.r)} (technischer Fehler, kein zulässiger Ausfall)`)); }

  /* 2. mindestens 98 % ausgewertet je Arm (nur Hauptlauf) */
  if (!probe) { const f = [];
    for (const o of Object.keys(GEGNER)) for (const a of ARME) {
      const n = nJe[o], aus = daten[o + a].filter(ausgewertet).length;
      if (aus < Math.ceil(MIN_ANTEIL * n)) f.push(`${GEGNER[o]} Arm ${a}: ${aus} von ${n} Partien ausgewertet (verlangt ≥ ${Math.ceil(MIN_ANTEIL * n)})`);
    }
    pr('2', 'mindestens 98 % je Arm und Gegner ausgewertet', `${Object.keys(GEGNER).length * ARME.length} Arme`, '–', f); }

  /* 3. Kontrolle gegen das Archiv */
  const kontrolle = lies(path.join(ordner, 'kontrolle.jsonl'));
  const arch = archivPfad ? lies(archivPfad).filter(r => r.nr >= 1 && r.nr <= 4) : [];
  const kontrolleOk = arch.length === 4 && kontrolle.length === 4 && arch.every(r => { const k = kontrolle.find(x => x.nr === r.nr); return k && gleichePartie(k, r); });
  pr('3', 'Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4)', `${kontrolle.length} Partien`, '–', kontrolleOk ? [] : ['Arm A reproduziert die vier archivierten Partien nicht bitgleich (oder sie fehlen)']);

  /* 4. Antwortquote je Arm und Gegner */
  const quoten = {};
  { const f = [];
    for (const o of Object.keys(GEGNER)) for (const a of ARME) {
      const d = daten[o + a].filter(r => r.kandidatenOrakel);
      const abf = d.reduce((x, r) => x + r.kandidatenOrakel.abfragen, 0), ohne = d.reduce((x, r) => x + r.kandidatenOrakel.ohneAntwort, 0);
      quoten[o + a] = {abf, ohne, quote: abf ? 1 - ohne / abf : null};
      if (!abf || 1 - ohne / abf < MIN_ANTEIL) f.push(`${GEGNER[o]} Arm ${a}: Antwortquote ${abf ? ((1 - ohne / abf) * 100).toFixed(1) : '–'} % (verlangt ≥ 98 %)`);
    }
    const abf = Object.values(quoten).reduce((x, q) => x + q.abf, 0);
    pr('4', 'Antwortquote des Orakels ≥ 98 % je Arm und Gegner', `${abf} Abfragen`, '–', f); }

  /* 5, 7, 8, 11: Fälle, Zählersummen, Prior-Summe, Eingriffsart — an Partien mit Pflichtprotokoll */
  let zaehlGeprueft = 0, artGeprueft = 0, priorGeprueft = 0, priorMax = 0;
  const faelle = {}, priorFehler = [], artFehler = [], zaehlFehler = [];
  for (const o of Object.keys(GEGNER)) {
    faelle[o] = {S: {}, W: {}};
    for (const a of ARME) for (const r of daten[o + a]) {
      if (!ausgewertet(r)) continue;
      const k = r.kandidatenOrakel, ev = k.ereignisse;
      zaehlGeprueft++;
      if (ev.length !== k.abfragen || JSON.stringify(ev.map(e => e.mc)) !== JSON.stringify(kiAmZug(r, k.ab))
          || ev.filter(e => e.fall === 'x').length !== k.ohneAntwort || ev.some(e => !FAELLE.includes(e.fall))) zaehlFehler.push(`${GEGNER[o]} Arm ${a} Nr. ${r.nr}`);
      for (const e of ev) {
        const t = faelle[o][e.f]; if (t) t[e.fall] = (t[e.fall] || 0) + 1;
        artGeprueft++;
        if (!eingriffOk(a, e)) artFehler.push({gegner: o, arm: a, nr: r.nr, mc: e.mc, fall: e.fall, auf: e.auf || 0, ang: e.ang || 0});
        const eingriff = !!(e.auf || e.ang), hat = Number.isFinite(e.ps);
        if (hat) { priorGeprueft++; priorMax = Math.max(priorMax, Math.abs(e.ps - 1)); }
        if ((eingriff && !hat) || (hat && Math.abs(e.ps - 1) > PRIOR_TOL) || e.pf)
          priorFehler.push({gegner: o, arm: a, nr: r.nr, farbe: e.f, mc: e.mc, fall: e.fall, eingriff, summe: hat ? e.ps : null, priors: e.pf || null});
      }
    }
  }
  const nAusf = ausfaelle.length ? `${ausfaelle.length} Partien (zulässiger Ausfall)` : '–';
  { const f = []; for (const o of Object.keys(GEGNER)) for (const c of ['S', 'W']) if (!(faelle[o][c].d > 0)) f.push(`${GEGNER[o]}: Fall d tritt mit der KI als ${c === 'S' ? 'Schwarz' : 'Weiß'} nicht auf`);
    pr('5', 'Fall d je Gegner in beiden Farben', `${zaehlGeprueft} Partien`, nAusf, f); }
  pr('7', 'Zählersummen (Eintrag je Abfrage, Abfrage je KI-Zug ab Zug 81, Fälle bekannt)', `${zaehlGeprueft} Partien`, nAusf,
     zaehlFehler.length ? [`Zählersummen gehen in ${zaehlFehler.length} Partien nicht auf: ${zaehlFehler.slice(0, 10).join('; ')}`] : []);
  const priorFehlerEingriff = priorFehler.filter(x => x.eingriff).length;
  pr('8', 'Prior-Summe 1 je Eingriff (Abweichung ≤ 1e-9)', `${priorGeprueft} Einträge`, nAusf, priorFehlerEingriff ? [`${priorFehlerEingriff} Eingriffe ohne Summe oder mit Abweichung > 1e-9`] : []);
  pr('11', 'Eingriffsart je Arm an jedem Protokolleintrag', `${artGeprueft} Einträge`, nAusf, artFehler.length ? [`${artFehler.length} Einträge mit falscher Eingriffsart`] : []);

  /* 10. erste Auslösestelle in allen vier Armen gleich; Gruppen mit einem zulässigen Ausfall sind nicht prüfbar */
  const ausl = {};
  { const f = [];
    for (const o of Object.keys(GEGNER)) {
      let gruppen = 0, abw = 0, ohne = 0; const nichtPruefbar = [];
      for (let nr = 1; nr <= nJe[o]; nr++) {
        const rs = ARME.map(a => karten[o + a].get(nr));
        if (rs.some(r => !r)) continue;                         /* fehlt: unter 1 */
        if (rs.some(r => !ausgewertet(r))) { nichtPruefbar.push(nr); continue; }
        gruppen++;
        const es = rs.map(ersterAusloeser);
        if (es.every(e => !e)) { ohne++; continue; }
        const e0 = es[0];
        const gleich = es.every(e => e && e0 && e.mc === e0.mc && e.g === e0.g && e.fall === e0.fall && e.r === e0.r && e.rn === e0.rn)
          && rs.every(r => JSON.stringify(r.zuege.slice(0, e0.mc)) === JSON.stringify(rs[0].zuege.slice(0, e0.mc)));
        if (!gleich) abw++;
      }
      ausl[o] = {gruppen, abw, ohne, nichtPruefbar};
      if (abw) f.push(`${GEGNER[o]}: erste Auslösestelle in ${abw} von ${gruppen} Vierergruppen nicht gleich`);
      if (!gruppen) f.push(`${GEGNER[o]}: keine prüfbare Vierergruppe`);
    }
    const np = Object.keys(GEGNER).flatMap(o => ausl[o].nichtPruefbar.map(nr => `${o}${nr}`));
    pr('10', 'erste Auslösestelle in allen vier Armen gleich', `${Object.keys(GEGNER).reduce((x, o) => x + ausl[o].gruppen, 0)} Vierergruppen`,
       np.length ? `${np.length} Vierergruppen (Ausfall in einem Arm): ${np.join(', ')}` : '–', f); }

  /* 6. Wiederholungskontrolle (nur Hauptlauf); abgebrochen = nicht prüfbar = nicht bestanden (§7) */
  const wiederholung = {};
  if (!probe) { const f = [], np = [];
    for (const o of Object.keys(GEGNER)) for (const a of ARME) {
      const w = new Map(lies(path.join(ordner, `wiederholung-${o}-${a}.jsonl`)).map(r => [r.nr, r]));
      let ok = true;
      for (const nr of WIEDERHOLT) {
        const x = karten[o + a].get(nr), y = w.get(nr);
        if (!ausgewertet(x) || !ausgewertet(y)) { ok = false; np.push(`${GEGNER[o]} Arm ${a} Nr. ${nr}`); continue; }
        if (!gleichePartie(x, y)) ok = false;
      }
      wiederholung[o + a] = ok;
      if (!ok) f.push(`${GEGNER[o]} Arm ${a}: Partien 1 bis 3 beim zweiten Spielen nicht identisch oder nicht prüfbar`);
    }
    pr('6', 'Wiederholungskontrolle (Partien 1 bis 3 je Arm und Gegner)', `${Object.keys(GEGNER).length * ARME.length * WIEDERHOLT.length} Partienpaare`,
       np.length ? `${np.length} (fehlt oder abgebrochen; zählt als nicht bestanden): ${np.join('; ')}` : '–', f); }

  pruefungen.sort((x, y) => (x.nr === 'P' ? 1.5 : +x.nr) - (y.nr === 'P' ? 1.5 : +y.nr));
  const gruende = pruefungen.filter(x => !x.ok).flatMap(x => x.fehler.map(t => `Bedingung ${x.nr}: ${t}`));
  /* vollständige Vierergruppen */
  const voll = {};
  for (const o of Object.keys(GEGNER)) { voll[o] = new Set(); for (let nr = 1; nr <= nJe[o]; nr++) if (ARME.every(a => ausgewertet(karten[o + a].get(nr)))) voll[o].add(nr); }
  return {gruende, gueltig: gruende.length === 0, vollstaendig, probe, nJe, daten, karten, quoten, faelle, ausl, wiederholung, kontrolleOk,
          pruefungen, ausfaelle, artFehler, artBeispiele: artFehler.slice(0, 20), priorFehler, priorMax, priorGeprueft, voll};
}

/* ---- Beschreibung des Protokolls (§8): getrennt nach schon Kind (c) und neu aufgenommen (d, d1) ---- */
const quartile = a => { if (!a.length) return [NaN, NaN, NaN]; const s = a.slice().sort((x, y) => x - y), q = p => { const i = (s.length - 1) * p, l = Math.floor(i); return s[l] + (s[Math.min(l + 1, s.length - 1)] - s[l]) * (i - l); }; return [q(0.25), q(0.5), q(0.75)]; };
function protokoll(e) {
  const zeilen = [], phasen = [];
  for (const o of Object.keys(GEGNER)) for (const a of ARME) for (const [gruppe, faelle] of [['schon Kind (c)', ['c']], ['neu (d, d1)', ['d', 'd1']]]) {
    const ev = e.daten[o + a].filter(ausgewertet).flatMap(r => r.kandidatenOrakel.ereignisse).filter(x => faelle.includes(x.fall));
    const kind = ev.filter(x => x.b && x.b.g !== null && x.b.g !== undefined);
    const z = {o, a, gruppe, n: ev.length, pG: quartile(ev.map(x => x.pG).filter(Number.isFinite)), pE: quartile(ev.map(x => x.pE).filter(Number.isFinite)),
      auf: ev.filter(x => x.auf).length, ang: ev.filter(x => x.ang).length, kind: kind.length, null: kind.filter(x => x.b.g === 0).length,
      besuche: quartile(kind.map(x => x.b.g)), gespielt: ev.filter(x => x.gl).length};
    zeilen.push(z);
    for (const f of ['S', 'W']) for (const [ph, von, bis] of PHASEN) {
      const t = ev.filter(x => x.f === f && x.mc >= von && x.mc <= bis), tk = t.filter(x => x.b && x.b.g !== null && x.b.g !== undefined);
      phasen.push({o, a, gruppe, f, ph, n: t.length, auf: t.filter(x => x.auf).length, ang: t.filter(x => x.ang).length,
        pG: quartile(t.map(x => x.pG).filter(Number.isFinite)), pE: quartile(t.map(x => x.pE).filter(Number.isFinite)),
        kind: tk.length, null: tk.filter(x => x.b.g === 0).length, besuche: quartile(tk.map(x => x.b.g)), gespielt: t.filter(x => x.gl).length});
    }
  }
  return {zeilen, phasen};
}

/* ---- Vergleiche (nur Hauptlauf, nur bei Gültigkeit) ---- */
function vergleich(X, Y, alpha, filter) {
  const diffs = [], vz = {besser: 0, schlechter: 0};
  let b = 0, c = 0;
  for (const [nr, x] of X) {
    const y = Y.get(nr);
    if (!ausgewertet(x) || !ausgewertet(y) || !filter(x)) continue;
    const d = x.endstand - y.endstand; diffs.push(d);
    if (d > 0) vz.besser++; else if (d < 0) vz.schlechter++;
    if (typeof x.gewonnen === 'boolean' && typeof y.gewonnen === 'boolean') { if (x.gewonnen && !y.gewonnen) b++; else if (!x.gewonnen && y.gewonnen) c++; }
  }
  return {...gepaart(diffs, alpha), vz: {...vz, p: vorzeichenP(vz.besser, vz.schlechter)}, siege: {nurX: b, nurY: c, p: vorzeichenP(b, c)}};
}
function auswerten(e) {
  const aus = {};
  for (const o of Object.keys(GEGNER)) {
    const K = a => e.karten[o + a], V = r => e.voll[o].has(r.nr);
    const haupt = HAUPT.map(([x, y]) => { const v = vergleich(K(x), K(y), ALPHA_PRIMAER, V);
      return {x, y, ...v, urteil: !(v.p < ALPHA_PRIMAER) ? 'kein nachgewiesener Unterschied' : v.mittel > 0 ? `${x} besser als ${y}` : `${x} schlechter als ${y}`}; });
    const erg = [...HAUPT, ...ERG].map(([x, y]) => ({x, y, ...vergleich(K(x), K(y), ALPHA_ERG, V)}));
    const farben = [];
    for (const f of ['S', 'W']) for (const [x, y] of [...HAUPT, ...ERG]) farben.push({f, x, y, ...vergleich(K(x), K(y), ALPHA_ERG, r => V(r) && r.wirFarbe === f)});
    const siege = {}, arme = {};
    for (const a of ARME) {
      const r = [...K(a).values()].filter(x => V(x) && typeof x.gewonnen === 'boolean'), k = r.filter(x => x.gewonnen).length;
      siege[a] = {k, n: r.length, ci: clopperPearson(k, r.length, ALPHA_ERG)};
    }
    const ausfaelle = [];
    for (const a of ARME) for (const f of ['S', 'W']) {
      const nummern = []; for (let nr = 1; nr <= e.nJe[o]; nr++) if ((nr % 2 === 0 ? 'S' : 'W') === f) nummern.push(nr);
      const eigen = nummern.filter(nr => !ausgewertet(K(a).get(nr))), fremd = nummern.filter(nr => ausgewertet(K(a).get(nr)) && !e.voll[o].has(nr));
      const gr = {}; for (const nr of eigen) { const g = ausfallGrund(K(a).get(nr)); gr[g] = (gr[g] || 0) + 1; }
      ausfaelle.push({a, f, gespielt: nummern.filter(nr => K(a).has(nr)).length, soll: nummern.length, eigen, fremd: fremd.length, gruende: gr});
    }
    /* Additivität der Mittelwerte auf denselben Vierergruppen (§3): (N − A) + (S − N) = S − A */
    const m = (x, y) => erg.find(v => v.x === x && v.y === y).mittel;
    aus[o] = {haupt, erg, farben, siege, ausfaelle, vollePaare: e.voll[o].size, additiv: {NA: m('N', 'A'), SN: m('S', 'N'), SA: m('S', 'A')}};
  }
  return aus;
}

/* ---- Laufzeit, Fälle (Probe und Hauptlauf) ---- */
function laufzeit(e) {
  const z = [];
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    const d = e.daten[o + a].filter(r => r.kandidatenOrakel), ms = d.map(r => r.kandidatenOrakel.partieMs).filter(Number.isFinite).sort((x, y) => x - y);
    const q = d.reduce((x, r) => x + r.kandidatenOrakel.abfragen, 0), qm = d.reduce((x, r) => x + r.kandidatenOrakel.abfrageMs, 0);
    const ev = d.flatMap(r => r.kandidatenOrakel.ereignisse);
    z.push({o, a, n: d.length, med: quartile(ms)[1] / 1000, max: ms.length ? ms[ms.length - 1] / 1000 : NaN, summeH: ms.reduce((x, y) => x + y, 0) / 3600000,
      proAbfrage: q ? qm / q : NaN, ausloeser: d.length ? ev.filter(x => AUSLOESER.includes(x.fall)).length / d.length : NaN,
      auf: d.length ? ev.filter(x => x.auf).length / d.length : NaN, ang: d.length ? ev.filter(x => x.ang).length / d.length : NaN,
      ohneProt: ev.filter(x => x.fall === 'kein-protokoll').length, ohneProtZug: ev.filter(x => x.fall === 'kein-protokoll' && x.g !== null && x.g >= 0).length});
  }
  return z;
}

/* ---- Text ---- */
const k1 = x => !Number.isFinite(x) ? '–' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
const k3 = x => !Number.isFinite(x) ? '–' : x.toFixed(3).replace('.', ',');
const vz1 = x => !Number.isFinite(x) ? '–' : (x >= 0 ? '+' : '−') + k1(Math.abs(x));
const pz = (k, n) => !n ? '–' : (100 * k / n).toFixed(1).replace('.', ',') + ' %';
const fp = p => !Number.isFinite(p) ? '–' : p < 1e-4 ? p.toExponential(1).replace('.', ',') : p.toFixed(4).replace('.', ',');
const iv = v => `${vz1(v.mittel)} [${vz1(v.lo)}; ${vz1(v.hi)}]`;
const q3 = q => `${k3(q[1])} [${k3(q[0])}; ${k3(q[2])}]`;

function bericht(e) {
  const titel = e.probe ? '# Vierarm-Versuch Kandidaten-Orakel: technische Probe (Arme A, N, P, S)' : '# Vierarm-Versuch Kandidaten-Orakel: Hauptlauf (Arme A, N, P, S)';
  const L = [titel, ''];
  if (!e.gueltig) {
    L.push('**KEIN URTEIL** – ungültig:', ''); for (const g of e.gruende) L.push(`- ${g}`); L.push('');
    if (!e.vollstaendig) L.push('Der Lauf ist **unvollständig**. Fortsetzen: Workflow erneut starten mit `fortsetzen_aus` = Nummer dieses Laufs; fertige Partien werden nicht neu gerechnet.', '');
    L.push('Bei ungültigem Lauf wird kein Effekt ausgegeben.', '');
  } else L.push(e.probe ? '**Gültig**: alle technischen Prüfungen der Probe bestanden (Tabelle).' : '**Gültig**: alle technischen Prüfungen bestanden (Tabelle).', '');
  if (e.probe) L.push('Die Probe gibt **keine** Endstand-Unterschiede aus (§9).', '');

  L.push('## Technische Prüfungen', '', '„Bestanden“ gilt nur für die geprüften Einheiten. Nicht prüfbare Einheiten stehen in der eigenen Spalte; zulässige Partieausfälle folgen getrennt im nächsten Abschnitt.', '',
    '| Nr. | Prüfung | geprüft | nicht prüfbar | Ergebnis |', '|---|---|---|---|---|');
  for (const x of e.pruefungen) L.push(`| ${x.nr} | ${x.name} | ${x.geprueft} | ${x.nichtPruefbar} | ${x.ok ? 'bestanden' : '**NICHT bestanden**'} |`);
  L.push('', '## Zulässige Partieausfälle', '');
  if (!e.ausfaelle.length) L.push('Keine.', '');
  else {
    L.push(`${e.ausfaelle.length} Partien abgebrochen. Sie sind **keine** bestandene oder gescheiterte technische Prüfung, zählen ${e.probe ? 'in der Probe nur als Bericht' : 'gegen die 98 % je Arm (Prüfung 2)'} und machen die betroffenen Vierergruppen für Prüfung 10 nicht prüfbar.`, '',
      '| Gegner | Arm | Partie | KI | Grund |', '|---|---|---:|---|---|');
    for (const x of e.ausfaelle) L.push(`| ${GEGNER[x.gegner]} | ${x.arm} | ${x.nr} | ${x.farbe === 'S' ? 'Schwarz' : 'Weiß'} | ${x.grund.replace(/\|/g, '/')} |`);
    L.push('');
  }
  L.push('### Einzelheiten', '', '| Gegner | Arm | Antwortquote | erste Auslösestelle |' + (e.probe ? '' : ' Wiederholung |'), '|---|---|---:|---|' + (e.probe ? '' : '---|'));
  for (const o of Object.keys(GEGNER)) for (const a of ARME) {
    const q = e.quoten[o + a], au = e.ausl[o];
    L.push(`| ${GEGNER[o]} | ${a} | ${q.quote === null ? '–' : pz(q.abf - q.ohne, q.abf)} (${q.abf - q.ohne}/${q.abf}) | ${a === 'A' ? `${au.gruppen} geprüft, ${au.abw} abweichend, ${au.ohne} ohne Auslöser, ${au.nichtPruefbar.length} nicht prüfbar` : ''} |` + (e.probe ? '' : ` ${e.wiederholung[o + a] ? 'identisch' : 'NICHT identisch oder nicht prüfbar'} |`));
  }
  L.push('', `Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4): ${e.kontrolleOk ? 'bitgleich' : 'NICHT bitgleich'}.`, '');
  L.push(`Eingriffsart je Arm (Prüfung 11): ${e.artFehler.length} Abweichungen.` + (e.artBeispiele.length ? ' Beispiele: ' + e.artBeispiele.map(x => `${x.gegner}-${x.arm} Nr. ${x.nr} Zug ${x.mc} Fall ${x.fall} auf ${x.auf} ang ${x.ang}`).join('; ') : ''), '');
  L.push(`Prior-Summe zur Laufzeit: ${e.priorGeprueft} Einträge geprüft, größte Abweichung ${e.priorMax.toExponential(2).replace('.', ',')}; Fehlerprotokoll ${e.priorFehler.length} Einträge, davon ${e.priorFehler.filter(x => x.eingriff).length} bei einem Eingriff.`, '');
  if (e.priorFehler.length) {
    L.push('| Gegner | Arm | Partie | KI | Zug | Fall | Eingriff | Summe |', '|---|---|---:|---|---:|---|---|---|');
    for (const x of e.priorFehler.slice(0, 30)) L.push(`| ${GEGNER[x.gegner]} | ${x.arm} | ${x.nr} | ${x.farbe} | ${x.mc} | ${x.fall} | ${x.eingriff ? 'ja' : 'nein'} | ${x.summe === null ? 'fehlt' : String(x.summe)} |`);
    L.push('');
  }
  L.push('### Fälle nach Farbe (alle Arme)', '');
  for (const o of Object.keys(GEGNER)) {
    const ks = FAELLE.filter(k => e.faelle[o].S[k] || e.faelle[o].W[k]);
    L.push(`${GEGNER[o]}:`, '', '| Farbe | ' + ks.join(' | ') + ' |', '|---|' + ks.map(() => '---:').join('|') + '|');
    for (const f of ['S', 'W']) L.push(`| KI ${f === 'S' ? 'Schwarz' : 'Weiß'} | ` + ks.map(k => e.faelle[o][f][k] || 0).join(' | ') + ' |');
    L.push('');
  }
  L.push('### Laufzeit, Auslöser und Eingriffe je Arm', '', '| Gegner | Arm | Partien | Dauer Median / Max (s) | Partiezeit (h) | ms je Abfrage | Auslöser je Partie | Aufnahmen je Partie | Anhebungen je Partie | kein-protokoll (davon Orakel mit Zug) |', '|---|---|---:|---|---:|---:|---:|---:|---:|---|');
  let summe = 0;
  for (const z of laufzeit(e)) { summe += z.summeH; L.push(`| ${GEGNER[z.o]} | ${z.a} | ${z.n} | ${k1(z.med)} / ${k1(z.max)} | ${k1(z.summeH)} | ${k1(z.proAbfrage)} | ${k1(z.ausloeser)} | ${k1(z.auf)} | ${k1(z.ang)} | ${z.ohneProt} (${z.ohneProtZug}) |`); }
  L.push('', `Summe der Partiezeit: ${k1(summe)} h.`, '');

  if (!e.gueltig) return L.join('\n') + '\n';
  const p = protokoll(e);
  L.push('## Protokoll: Orakelzug schon Kind (Fall c) oder neu aufgenommen (Fall d, d1)', '', 'Beschreibend; ersetzt keinen kausalen Vergleich der Arme (§8). Priors als Median [Quartile]; Besuche nur, wo der Orakelzug Kind ist.', '',
    '| Gegner | Arm | Gruppe | Stellen | natürlicher Prior | endgültiger Prior | aufgenommen | angehoben | Kind | null Besuche (von Kind) | Besuche Median [Quartile] | gespielt |',
    '|---|---|---|---:|---|---|---:|---:|---:|---:|---|---:|');
  for (const z of p.zeilen) L.push(`| ${GEGNER[z.o]} | ${z.a} | ${z.gruppe} | ${z.n} | ${q3(z.pG)} | ${q3(z.pE)} | ${pz(z.auf, z.n)} | ${pz(z.ang, z.n)} | ${pz(z.kind, z.n)} | ${pz(z.null, z.kind)} | ${k1(z.besuche[1])} [${k1(z.besuche[0])}; ${k1(z.besuche[2])}] | ${pz(z.gespielt, z.n)} |`);
  L.push('', '### Nach Farbe und Spielphase', '', '| Gegner | Arm | Gruppe | KI | Zug | Stellen | natürlicher Prior | endgültiger Prior | aufgenommen | angehoben | Kind | null Besuche (von Kind) | Besuche Median [Quartile] | gespielt |', '|---|---|---|---|---|---:|---|---|---:|---:|---:|---:|---|---:|');
  for (const z of p.phasen) L.push(`| ${GEGNER[z.o]} | ${z.a} | ${z.gruppe} | ${z.f === 'S' ? 'Schwarz' : 'Weiß'} | ${z.ph} | ${z.n} | ${q3(z.pG)} | ${q3(z.pE)} | ${pz(z.auf, z.n)} | ${pz(z.ang, z.n)} | ${pz(z.kind, z.n)} | ${pz(z.null, z.kind)} | ${k1(z.besuche[1])} [${k1(z.besuche[0])}; ${k1(z.besuche[2])}] | ${pz(z.gespielt, z.n)} |`);
  L.push('');
  if (e.probe) return L.join('\n') + '\n';

  const a = auswerten(e);
  L.push('## Ausfälle und vollständige Vierergruppen', '', 'Alle Vergleiche verwenden nur Partienummern, die in **allen vier Armen** eines Gegners ausgewertet sind. Für die Vollständigkeit gilt allein die 98-%-Regel je Arm; alle übrigen Gültigkeitsbedingungen gelten unverändert.', '',
    '| Gegner | Arm | KI | gespielt | nicht ausgewertet | nur wegen Ausfall in anderem Arm nicht in der Gruppe | Nummern | Gründe |', '|---|---|---|---:|---:|---:|---|---|');
  for (const o of Object.keys(GEGNER)) for (const z of a[o].ausfaelle)
    L.push(`| ${GEGNER[o]} | ${z.a} | ${z.f === 'S' ? 'Schwarz' : 'Weiß'} | ${z.gespielt}/${z.soll} | ${z.eigen.length} | ${z.fremd} | ${z.eigen.join(', ') || '–'} | ${Object.entries(z.gruende).map(([g, k]) => `${g.replace(/\|/g, '/')} (${k})`).join('; ') || '–'} |`);
  L.push('');
  for (const o of Object.keys(GEGNER)) L.push(`- ${GEGNER[o]}: **${a[o].vollePaare} vollständige Vierergruppen** von ${e.nJe[o]} verwendet; alle Intervalle und Tests unten sind aus diesen Gruppen berechnet.`);
  L.push('', `## Hauptvergleiche (gepaart, α = 0,05/6 je Test, Intervall ${(100 * (1 - ALPHA_PRIMAER)).toFixed(2).replace('.', ',')} %)`, '',
    '| Gegner | Vergleich | verwendete Paare | Differenz [Intervall] | SD | t | p (zweiseitig) | Urteil |', '|---|---|---:|---|---:|---:|---:|---|');
  for (const o of Object.keys(GEGNER)) for (const v of a[o].haupt) L.push(`| ${GEGNER[o]} | ${v.x} − ${v.y} | ${v.n} | ${iv(v)} | ${k1(v.sd)} | ${k1(v.t)} | ${fp(v.p)} | ${v.urteil} |`);
  L.push('');
  for (const o of Object.keys(GEGNER)) for (const v of a[o].haupt) if (v.urteil === 'kein nachgewiesener Unterschied')
    L.push(`- ${GEGNER[o]}, ${v.x} − ${v.y}: kein nachgewiesener Unterschied; Intervall ${iv(v)}, kein nachgewiesener Gewinn über ${vz1(v.hi)} Punkte. Weder Wirkungslosigkeit noch Gleichwertigkeit (§6).`);
  L.push('', 'Grenze (§3): S − N umfasst die Anhebung neuer und schon vorhandener Kinder, P − A nur vorhandener; die beiden nicht voneinander abziehen. Für die Mittelwerte gilt auf denselben Gruppen exakt (N − A) + (S − N) = S − A; daraus folgt keine Zerlegung in unabhängige Mechanismen.', '');
  for (const o of Object.keys(GEGNER)) { const d = a[o].additiv; L.push(`- ${GEGNER[o]}: (N − A) ${vz1(d.NA)} + (S − N) ${vz1(d.SN)} = ${vz1(d.NA + d.SN)}; S − A ${vz1(d.SA)}.`); }
  L.push('', '## Ergänzend, ohne Signifikanzurteil (95 %)', '', '| Gegner | Vergleich | verwendete Paare | Differenz [95 %] | Vorzeichen besser/schlechter (p) | Siege nur erster / nur zweiter (McNemar p) |', '|---|---|---:|---|---|---|');
  for (const o of Object.keys(GEGNER)) for (const v of a[o].erg) L.push(`| ${GEGNER[o]} | ${v.x} − ${v.y} | ${v.n} | ${iv(v)} | ${v.vz.besser}/${v.vz.schlechter} (${fp(v.vz.p)}) | ${v.siege.nurX}/${v.siege.nurY} (${fp(v.siege.p)}) |`);
  L.push('', '### Nach Farbe der KI (95 %, beschreibend)', '', '| Gegner | KI | Vergleich | Paare | Differenz [95 %] |', '|---|---|---|---:|---|');
  for (const o of Object.keys(GEGNER)) for (const v of a[o].farben) L.push(`| ${GEGNER[o]} | ${v.f === 'S' ? 'Schwarz' : 'Weiß'} | ${v.x} − ${v.y} | ${v.n} | ${iv(v)} |`);
  L.push('', '### Siege in den vollständigen Vierergruppen (95 %, Clopper-Pearson)', '', '| Gegner | ' + ARME.join(' | ') + ' |', '|---|' + ARME.map(() => '---').join('|') + '|');
  for (const o of Object.keys(GEGNER)) L.push(`| ${GEGNER[o]} | ` + ARME.map(x => { const s = a[o].siege[x]; return `${pz(s.k, s.n)} [${pz(s.ci[0], 1)}; ${pz(s.ci[1], 1)}]`; }).join(' | ') + ' |');
  L.push('');
  return L.join('\n') + '\n';
}

module.exports = {bewerte, bericht, auswerten, protokoll, eingriffOk, ARME, ALPHA_PRIMAER};

if (require.main === module) {
  const a = process.argv.slice(2), wert = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !['--n', '--bericht', '--json'].includes(a[i - 1]));
  if (!pos[0]) { console.error('Aufruf: node vierarm-bericht.js <ordner> <archiv.jsonl.gz> [--probe] [--n 480 | --n g=8,f=4] [--bericht bericht.md] [--json aus.json]'); process.exit(2); }
  const probe = a.includes('--probe'), nArg = wert('--n') || (probe ? 'g=8,f=4' : '480');
  const nJe = /=/.test(nArg) ? Object.fromEntries(nArg.split(',').map(x => x.split('=')).map(([k, v]) => [k, +v])) : {g: +nArg, f: +nArg};
  const e = bewerte(pos[0], pos[1], nJe, probe), t = bericht(e);
  if (wert('--bericht')) fs.writeFileSync(wert('--bericht'), t); else process.stdout.write(t);
  if (wert('--json')) fs.writeFileSync(wert('--json'), JSON.stringify({gueltig: e.gueltig, vollstaendig: e.vollstaendig, gruende: e.gruende, priorFehler: e.priorFehler,
    pruefungen: e.pruefungen, ausfaelle: e.ausfaelle, artBeispiele: e.artBeispiele, auswertung: e.gueltig && !probe ? auswerten(e) : null}, null, 1));
  process.exit(e.gueltig ? 0 : 1);
}
