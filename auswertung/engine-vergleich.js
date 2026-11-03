// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Engine-Vergleich: zwei Stände von index.html an denselben Archivstellungen nachspielen und Züge,
   Wurzelkinder (mit Priors) und Protokollfälle vergleichen. Läuft in GitHub Actions
   (.github/workflows/engine-vergleich.yml), je Stand in einem EIGENEN Prozess: ladeEngine lädt die
   Engine per globalem eval, zwei Stände im selben Node-Prozess können sich gegenseitig überschreiben.

   Schritt 1, je Stand ein eigener Aufruf:
     node auswertung/engine-vergleich.js --dump --html <index.html> --aus <stand.json>
          [--archiv docs/daten/leeres-brett/lauf1/g-D.jsonl.gz] [--partien 1,2] [--bis 130]
          [--raenge 5,16,17,30] [--arme A,S,ZS] [--ab 80]
     Verglichen werden je KI-Zug: gewählter Zug, Wurzelkinder, deren Priors und Protokollfelder. Das
     Nachspielen folgt dem Archiv und fragt die KI je Lauf nur bis zu ihrer ersten Abweichung.
     Ohne Arm wird nur der Default nachgespielt (Arm „-“, ohne extra); mit Arm bekommt die Engine ab Zug
     ab+1 extra.kandidatenOrakel = {arm, g}, g = der Zug auf Rang r der Liste nach dem Netz im Default.
   Schritt 2:
     node auswertung/engine-vergleich.js --vergleich <alt.json> <neu.json> [--bericht bericht.md]
     Vor „gleich“: Priors je Wurzelkind vorhanden und endlich, Abdeckung der Arme und Fälle (--faelle c,d).
     Exit 0 GLEICH, 1 VERSCHIEDEN, 3 KEIN URTEIL (Vorprüfung oder Abdeckung nicht erfüllt), 2 falscher Aufruf. */
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./diagnose/wurzel-replay.js');

function optionen(a) {
  const o = {archiv: path.join(__dirname, '..', 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz'), partien: [1, 2], bis: 130,
             raenge: [5, 16, 17, 30], arme: ['A', 'S', 'ZS'], ab: 80, faelle: ['c', 'd']};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) {
      case '--html': o.html = v; i++; break;
      case '--aus': o.aus = v; i++; break;
      case '--archiv': o.archiv = v; i++; break;
      case '--partien': o.partien = v.split(',').map(Number); i++; break;
      case '--bis': o.bis = +v; i++; break;
      case '--raenge': o.raenge = v.split(',').map(Number); i++; break;
      case '--arme': o.arme = v.split(',').filter(Boolean); i++; break;
      case '--ab': o.ab = +v; i++; break;
      case '--faelle': o.faelle = v.split(',').filter(Boolean); i++; break;
      case '--bericht': o.bericht = v; i++; break;
      default: break;
    }
  }
  return o;
}

/* Protokollfelder, die beide Stände führen (Stufe 1 und später); fehlende bleiben weg */
const PROT = ['fall', 'r', 'rn', 'nIdx', 'pG', 'pN', 'aufgenommen', 'angehoben', 'kinder', 'priorSumme'];
const prot = p => p ? Object.fromEntries(PROT.filter(k => p[k] !== undefined).map(k => [k, p[k]])) : null;

function dump(o) {
  const E = R.ladeEngine(o.html), rows = R.lies(o.archiv), laeufe = [];
  for (const nr of o.partien) {
    const row = rows.find(x => x.nr === nr);
    if (!row) throw new Error(`Partie ${nr} fehlt im Archiv`);
    const ref = R.replay(E, row, {bis: o.bis});
    const zeile = (arm, rang, r) => ({nr, arm, rang, abweichung: r.abweichung || null,
      zuege: r.zuege.map(z => [z.mc, z.gewaehlt, z.kids, z.priors, prot(z.prot)])});
    laeufe.push(zeile('-', 0, ref));
    for (const rang of o.raenge) for (const arm of o.arme) {
      const g = mc => { const z = ref.zuege.find(q => q.mc === mc); return z && z.nach && z.nach[rang - 1] !== undefined ? z.nach[rang - 1] : -1; };
      laeufe.push(zeile(arm, rang, R.replay(E, row, {bis: o.bis, extra: mc => mc >= o.ab ? {kandidatenOrakel: {arm, g: g(mc)}} : undefined})));
    }
  }
  const {html, aus, bericht, ...einstellungen} = o;
  return {einstellungen: {...einstellungen, archiv: path.basename(o.archiv)}, laeufe};
}

/* Vorprüfung eines Dumps: je KI-Abfrage mit Wurzelkindern ein Prior je Kind, alle endlich; ohne Kinder
   (Pass vor der Suche) auch keine Priors. Liefert die Liste der nicht prüfbaren Stellen. */
function priorPruefung(d) {
  const fehler = []; let mitKindern = 0;
  for (const x of d.laeufe) for (const z of x.zuege) {
    const [mc, , kids, priors] = z;
    if (!Array.isArray(kids)) { if (priors !== null && priors !== undefined) fehler.push({nr: x.nr, arm: x.arm, rang: x.rang, mc, grund: 'Priors ohne Kinder'}); continue; }
    mitKindern++;
    if (!Array.isArray(priors) || priors.length !== kids.length) fehler.push({nr: x.nr, arm: x.arm, rang: x.rang, mc, grund: 'Priors fehlen oder Zahl passt nicht zu den Kindern'});
    else if (!priors.every(p => typeof p === 'number' && Number.isFinite(p))) fehler.push({nr: x.nr, arm: x.arm, rang: x.rang, mc, grund: 'Prior nicht endlich'});
  }
  return {fehler, mitKindern};
}

/* Kennzahlen je Lauf: KI-Abfragen, davon im Eingriffsfenster (ab Zug ab+1), Fälle, erste Archivabweichung */
function lauf(x, ab) {
  const faelle = {};
  for (const z of x.zuege) if (z[4] && z[4].fall) faelle[z[4].fall] = (faelle[z[4].fall] || 0) + 1;
  return {abfragen: x.zuege.length, fenster: x.zuege.filter(z => z[0] >= ab).length, faelle, abweichung: x.abweichung};
}

/* Ergebnis: GLEICH, VERSCHIEDEN oder KEIN URTEIL (Vorprüfung oder Abdeckung nicht erfüllt) */
function vergleiche(a, b) {
  const vor = [], abw = [], laeufe = [];
  if (JSON.stringify(a.einstellungen) !== JSON.stringify(b.einstellungen)) vor.push('Einstellungen der beiden Stände verschieden');
  const struktur = x => x.laeufe.map(l => `${l.nr}/${l.arm}/${l.rang}`).join(',');
  if (struktur(a) !== struktur(b)) vor.push('Läufe der beiden Stände passen nicht zueinander (Partie, Arm, Rang)');
  const pa = priorPruefung(a), pb = priorPruefung(b);
  for (const [name, p] of [['alt', pa], ['neu', pb]]) if (p.fehler.length) vor.push(`Stand ${name}: ${p.fehler.length} KI-Abfragen ohne vorhandene, endliche Priors je Wurzelkind (z. B. Partie ${p.fehler[0].nr}, Arm ${p.fehler[0].arm}, Zug ${p.fehler[0].mc + 1}: ${p.fehler[0].grund})`);
  if (!pa.mitKindern) vor.push('keine KI-Abfrage mit Wurzelkindern: nichts zu vergleichen');
  const e = a.einstellungen, ab = e.ab;
  a.laeufe.forEach((x, i) => {
    const y = b.laeufe[i], kx = lauf(x, ab), ky = y ? lauf(y, ab) : null;
    let ergebnis, mc = null;
    if (!y || x.nr !== y.nr || x.arm !== y.arm || x.rang !== y.rang) ergebnis = 'nicht prüfbar (kein Gegenstück)';
    else {
      const k = x.zuege.findIndex((z, j) => JSON.stringify(z) !== JSON.stringify(y.zuege[j]));
      const verschieden = k >= 0 || x.zuege.length !== y.zuege.length || JSON.stringify(x.abweichung) !== JSON.stringify(y.abweichung);
      if (verschieden) { mc = k >= 0 ? x.zuege[k][0] : null; abw.push({nr: x.nr, arm: x.arm, rang: x.rang, mc}); ergebnis = 'verschieden'; }
      else ergebnis = x.arm !== '-' && kx.fenster === 0 ? 'gleich, aber ohne Abfrage im Eingriffsfenster' : 'gleich';
    }
    laeufe.push({nr: x.nr, arm: x.arm, rang: x.rang, alt: kx, neu: ky, ergebnis, mc});
  });
  /* Abdeckung: jeder verlangte Arm mit mindestens einer Abfrage im Fenster und jedem verlangten Fall */
  const abdeckung = [];
  for (const arm of e.arme) {
    const ls = laeufe.filter(l => l.arm === arm), f = {};
    for (const l of ls) for (const [k, n] of Object.entries(l.alt.faelle)) f[k] = (f[k] || 0) + n;
    const fenster = ls.reduce((s, l) => s + l.alt.fenster, 0), fehlt = (e.faelle || []).filter(k => !(f[k] > 0));
    abdeckung.push({arm, laeufe: ls.length, mitFenster: ls.filter(l => l.alt.fenster > 0).length, fenster, faelle: f, fehlt, ok: fenster > 0 && !fehlt.length});
  }
  const nichtPruefbar = laeufe.filter(l => /nicht prüfbar|ohne Abfrage im Eingriffsfenster/.test(l.ergebnis));
  const abdeckungOk = abdeckung.every(x => x.ok) && laeufe.some(l => l.arm === '-' && l.alt.abfragen > 0);
  const urteil = vor.length ? 'KEIN URTEIL' : abw.length ? 'VERSCHIEDEN' : !abdeckungOk ? 'KEIN URTEIL' : 'GLEICH';
  return {urteil, gleich: urteil === 'GLEICH', vor, abw, laeufe, abdeckung, abdeckungOk, nichtPruefbar,
          priorStellen: pa.mitKindern, zuege: a.laeufe.reduce((s, x) => s + x.zuege.length, 0)};
}

const zugText = m => m ? `Zug ${m.mc + 1}: Archiv ${m.gespielt}, KI ${m.gewaehlt}` : 'keine (bis zum Ende)';
function bericht(v, a) {
  const e = a.einstellungen, L = ['# Engine-Vergleich (getrennte Prozesse)', ''];
  if (v.urteil === 'GLEICH') L.push(`**GLEICH.** ${v.laeufe.length} Läufe, ${v.zuege} KI-Abfragen, davon ${v.priorStellen} mit Wurzelkindern: gewählter Zug, Wurzelkinder, Priors je Wurzelkind und Protokollfelder (${PROT.join(', ')}) identisch; Priors vorhanden und endlich; Abdeckung erfüllt.`);
  else if (v.urteil === 'VERSCHIEDEN') L.push(`**VERSCHIEDEN.** ${v.abw.length} von ${v.laeufe.length} Läufen weichen ab.`);
  else L.push('**KEIN URTEIL.** Die Vorprüfung oder die verlangte Abdeckung ist nicht erfüllt; über Gleichheit wird nichts gesagt.');
  L.push('');
  for (const g of v.vor) L.push(`- Vorprüfung: ${g}`);
  if (!v.abdeckungOk) L.push('- Abdeckung nicht erfüllt (Tabelle unten).');
  L.push('', '## Abdeckung je Arm', '', `Verlangt: je Arm mindestens eine KI-Abfrage ab Zug ${e.ab + 1} und die Fälle ${(e.faelle || []).join(', ') || '–'}.`, '',
    '| Arm | Läufe | davon mit Abfrage im Fenster | Abfragen im Fenster | Fälle | fehlende Fälle | Ergebnis |', '|---|---:|---:|---:|---|---|---|');
  for (const x of v.abdeckung) L.push(`| ${x.arm} | ${x.laeufe} | ${x.mitFenster} | ${x.fenster} | ${Object.entries(x.faelle).map(([k, n]) => `${k} ${n}`).join(', ') || '–'} | ${x.fehlt.join(', ') || '–'} | ${x.ok ? 'erfüllt' : '**nicht erfüllt**'} |`);
  L.push('', '## Je Replay', '', 'Das Nachspielen folgt den Archivzügen und fragt die KI nur bis zu ihrer ersten Abweichung vom Archivzug. Verglichen werden die KI-Abfragen bis dahin.', '',
    '| Partie | Arm | Rang | KI-Abfragen alt / neu | davon ab Zug ' + (e.ab + 1) + ' | erste Archivabweichung (alt) | erste Archivabweichung (neu) | Ergebnis |', '|---:|---|---:|---|---:|---|---|---|');
  for (const l of v.laeufe) L.push(`| ${l.nr} | ${l.arm} | ${l.rang || '–'} | ${l.alt.abfragen} / ${l.neu ? l.neu.abfragen : '–'} | ${l.alt.fenster} | ${zugText(l.alt.abweichung)} | ${l.neu ? zugText(l.neu.abweichung) : '–'} | ${l.ergebnis}${l.mc !== null ? ` (ab Zug ${l.mc + 1})` : ''} |`);
  L.push('', `**Nicht prüfbare Läufe:** ${v.nichtPruefbar.length ? v.nichtPruefbar.map(l => `Partie ${l.nr} Arm ${l.arm} Rang ${l.rang}: ${l.ergebnis}`).join('; ') : 'keine'}. Sie zählen nicht zur Abdeckung; reicht die Abdeckung ohne sie nicht, lautet das Ergebnis KEIN URTEIL.`);
  L.push('', `Einstellungen: Archiv ${e.archiv}, Partien ${e.partien.join(', ')}, bis Zug ${e.bis}, Ränge ${e.raenge.join(', ')}, Arme ${e.arme.join(', ') || '–'}, Eingriff ab Zug ${e.ab + 1}.`, '');
  return L.join('\n') + '\n';
}

module.exports = {dump, vergleiche, bericht, optionen, priorPruefung};

if (require.main === module) {
  const a = process.argv.slice(2), o = optionen(a);
  if (a.includes('--dump')) {
    if (!o.html || !o.aus) { console.error('Aufruf: --dump --html <index.html> --aus <stand.json> [...]'); process.exit(2); }
    fs.writeFileSync(o.aus, JSON.stringify(dump(o)));
    process.exit(0);
  }
  const i = a.indexOf('--vergleich');
  if (i < 0 || !a[i + 1] || !a[i + 2]) { console.error('Aufruf: --vergleich <alt.json> <neu.json> [--bericht bericht.md]'); process.exit(2); }
  const A = JSON.parse(fs.readFileSync(a[i + 1], 'utf8')), B = JSON.parse(fs.readFileSync(a[i + 2], 'utf8'));
  const v = vergleiche(A, B), t = bericht(v, A);
  if (o.bericht) fs.writeFileSync(o.bericht, t); else process.stdout.write(t);
  process.exit(v.urteil === 'GLEICH' ? 0 : v.urteil === 'VERSCHIEDEN' ? 1 : 3);
}
