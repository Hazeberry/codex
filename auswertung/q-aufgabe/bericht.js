// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {clopperPearson} = require('../kandidaten-orakel/haupt-bericht');
const nrListe = Array.from({length:400}, (_,i) => i+1);
assert.equal(fs.readdirSync('bewertet').length, nrListe.length);
const partien = nrListe.map(nr => {
  const r = JSON.parse(fs.readFileSync('bewertet/'+nr+'/urteil.json'));
  assert.equal(r.nr, nr);
  assert.equal(r.seed, 641900000+nr);
  assert.equal(r.farbe, nr%2===0?'S':'W');
  assert.equal(r.quelle, process.env.GITHUB_SHA);
  assert(['Q','Benson','zwei Pässe','Zuglimit'].includes(r.ende));
  if (r.ende==='Q') {
    assert.equal(r.margen.length,2);
    assert(r.margen.every(x => x===null || Number.isFinite(x)));
    if (r.margen.every(x=>x!==null && x>0)) r.klasse='voreilig';
    else if (r.margen.every(x=>x!==null && x<0)) r.klasse='berechtigt';
    else r.klasse='unklar';
  } else assert.deepEqual(r.margen,[]);
  return r;
});
assert.equal(new Set(partien.map(r=>r.gnugo)).size,1);
function anteil(k,n) {
  return {k,n,rate:n?k/n:null,ci95:n?clopperPearson(k,n,.05):null};
}
function auswerten(rows) {
  const q = rows.filter(r=>r.ende==='Q');
  const raten = {};
  for (const art of ['voreilig','berechtigt','unklar']) {
    const n = q.filter(r=>r.klasse===art).length;
    raten[art] = {jePartie:anteil(n,rows.length),jeAufgabe:anteil(n,q.length)};
  }
  return {partien:rows.length,q:q.length,raten,
    spannweite:[raten.voreilig.jePartie.rate,(raten.voreilig.jePartie.k+raten.unklar.jePartie.k)/rows.length],
    enden:Object.fromEntries(['Q','Benson','zwei Pässe','Zuglimit'].map(k=>[k,rows.filter(r=>r.ende===k).length]))};
}
const gruppen = new Map();
for (const r of partien) {
  const key = [r.farbe,r.verlauf,r.ende].join('/');
  if (!gruppen.has(key)) gruppen.set(key,[]);
  gruppen.get(key).push(r);
}
// Bei gleicher Stellung können verschiedene Fortsetzungsseeds zu verschiedenen Urteilen führen.
const eindeutig = [...gruppen.values()].map(g => {
  const first = {...g[0]};
  if (new Set(g.map(r=>r.klasse)).size>1) first.klasse='unklar';
  return first;
});
const bericht = {gueltig:true,quelle:process.env.GITHUB_SHA,gesamt:auswerten(partien),
  schwarz:auswerten(partien.filter(r=>r.farbe==='S')),weiss:auswerten(partien.filter(r=>r.farbe==='W')),
  jeEindeutigemVerlauf:auswerten(eindeutig),
  duplikate:[...gruppen.values()].filter(g=>g.length>1).map(g=>g.map(r=>r.nr))};
fs.writeFileSync('bericht.json',JSON.stringify(bericht,null,2));
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Q-Aufgabe\n\nGültige Auswertung von 400 Partien. Vollständige Raten und Intervalle im Artefakt q-bericht.\n');
