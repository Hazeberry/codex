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
     Exit 0 gleich, 1 verschieden oder Einstellungen verschieden, 2 falscher Aufruf. */
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./diagnose/wurzel-replay.js');

function optionen(a) {
  const o = {archiv: path.join(__dirname, '..', 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz'), partien: [1, 2], bis: 130,
             raenge: [5, 16, 17, 30], arme: ['A', 'S', 'ZS'], ab: 80};
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

function vergleiche(a, b) {
  const gruende = [], abw = [];
  if (JSON.stringify(a.einstellungen) !== JSON.stringify(b.einstellungen)) gruende.push('Einstellungen der beiden Stände verschieden');
  if (a.laeufe.length !== b.laeufe.length) gruende.push(`Zahl der Läufe verschieden (${a.laeufe.length} gegen ${b.laeufe.length})`);
  const faelle = {};
  a.laeufe.forEach((x, i) => {
    const y = b.laeufe[i];
    for (const z of x.zuege) if (z[4] && z[4].fall) faelle[z[4].fall] = (faelle[z[4].fall] || 0) + 1;
    if (!y || x.nr !== y.nr || x.arm !== y.arm || x.rang !== y.rang) { abw.push({nr: x.nr, arm: x.arm, rang: x.rang, mc: null}); return; }
    const k = x.zuege.findIndex((z, j) => JSON.stringify(z) !== JSON.stringify(y.zuege[j]));
    if (k >= 0 || x.zuege.length !== y.zuege.length) abw.push({nr: x.nr, arm: x.arm, rang: x.rang, mc: k >= 0 ? x.zuege[k][0] : null});
  });
  return {gleich: !gruende.length && !abw.length, gruende, abw, laeufe: a.laeufe.length, faelle,
          zuege: a.laeufe.reduce((s, x) => s + x.zuege.length, 0)};
}

function bericht(v, a) {
  const L = ['# Engine-Vergleich (getrennte Prozesse)', ''];
  L.push(v.gleich ? `**Gleich.** ${v.laeufe} Läufe, ${v.zuege} KI-Züge: gewählter Zug, Wurzelkinder, Priors der Wurzelkinder und Protokollfelder (${PROT.join(', ')}) identisch.`
                  : `**VERSCHIEDEN.** ${v.abw.length} von ${v.laeufe} Läufen weichen ab.`, '');
  for (const g of v.gruende) L.push(`- ${g}`);
  if (v.abw.length) { L.push('', '| Partie | Arm | Rang | erster abweichender Zug |', '|---:|---|---:|---:|'); for (const x of v.abw.slice(0, 50)) L.push(`| ${x.nr} | ${x.arm} | ${x.rang} | ${x.mc === null ? '–' : x.mc + 1} |`); }
  const e = a.einstellungen;
  L.push('', 'Das Nachspielen folgt den Archivzügen; ein Lauf fragt die KI nur bis zu ihrer ersten Abweichung vom Archivzug (danach endet er). Verglichen werden also die KI-Züge bis dahin, je Lauf verschieden viele.');
  L.push('', `Einstellungen: Archiv ${e.archiv}, Partien ${e.partien.join(', ')}, bis Zug ${e.bis}, Ränge ${e.raenge.join(', ')}, Arme ${e.arme.join(', ') || '–'}, Eingriff ab Zug ${e.ab + 1}.`);
  L.push(`Protokollfälle (Stand alt, alle Läufe): ${Object.entries(v.faelle).map(([k, n]) => `${k} ${n}`).join(', ') || '–'}.`, '');
  return L.join('\n') + '\n';
}

module.exports = {dump, vergleiche, bericht, optionen};

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
  process.exit(v.gleich ? 0 : 1);
}
