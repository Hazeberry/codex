// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert=require('assert'), fs=require('fs'), path=require('path'), os=require('os');
const G=require('../auswertung/diagnose/gefangene-rollout');
const {test,laufeTests}=require('./rahmen');
test('Vollständiger Faktorplan mit allen Farben',()=>{
 const p=G.plan();assert.equal(p.length,72);assert.equal(new Set(p.map(x=>x.id)).size,72);
 for(const t of p)assert(p.some(u=>u.game===t.game&&u.mc===t.mc&&u.sims===t.sims&&u.mirror!==t.mirror));
 assert.equal(p.length*2*Object.keys(G.ARMS).length,576);
});
test('Gefangenenherkunft additiv, Deckel bei Gegenrechnung korrekt',()=>{
 const row={raw:-180,capture:-200,caps:{1:22,2:2},beforeRollout:{raw:-50,caps:{1:12,2:2}}};
 const d=G.decomposition(row,{1:4,2:0},2,20,200);
 assert.equal(d.initial,-80);assert.equal(d.tree,-120);assert.equal(d.rollout,-200);assert.equal(d.rawCapture,-400);assert.equal(d.correction,200);
 // Nach Entfernung des Rollout-Saldos bleibt der Term an der Deckelgrenze -200.
 assert.equal(d.noRolloutCaptureValue,Math.tanh(-180/200));
});
test('Aufgabesonde zählt fünf, unterbricht bei Erholung und Datenlücke',()=>{
 const values=Array.from({length:6},(_,i)=>({mc:103+2*i,q:-.96}));
 assert.deepStrictEqual(G.resignationProbe(values).map(x=>x.resign),[false,false,false,false,true,true]);
 assert(G.resignationProbe(values,false).every(x=>!x.resign));
 const gap=values.filter((_,i)=>i!==2);assert(G.resignationProbe(gap).every(x=>!x.resign));
 const recovery=values.map((x,i)=>i===3?{...x,q:-.9}:x);assert(G.resignationProbe(recovery).every(x=>!x.resign));
});
test('Vier kurze Sucharme bleiben mit Messung bitgleich, Tiefe null verändert keinen Rollout',()=>{
 for(const arm of ['A','B','C','D']){
  const c={game:'partie113',mc:101,mirror:false,sims:4,seed:741,arm};
  const a=G.child({...c,measure:false}),b=G.child({...c,measure:true});assert.deepStrictEqual(a.fingerprint,b.fingerprint);
  assert.equal(b.leaves.length,4);
  if(arm==='C'||arm==='D')assert(b.leaves.every(x=>x.captureSources.rollout===0));
 }
});
test('Veränderter Rollout-Messanker wird abgelehnt',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.throws(()=>G.source(html.replace('  let color = startColor, passes = 0;','  let color = startColor; let passes = 0;'),true),/Messanker/);
});
test('Bericht bildet Faktorpaare und verwirft beschädigte Q-Daten',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capture-valid-'));
 try {
  const task={...G.plan()[0],sims:4},sub=path.join(dir,task.id);fs.mkdirSync(sub);
  fs.writeFileSync(path.join(sub,'herkunft.json'),JSON.stringify({task,sha:'source',inputSha256:'input',engineSha256:'engine'}));
  fs.writeFileSync(path.join(sub,'gueltig.json'),JSON.stringify({task,sha:'source',gueltig:true,queries:8}));
  const queries=[];
  for(const seed of [741,742])for(const arm of ['A','B','C','D']){
   const leaf={raw:0,capture:0,transfer:0,rest:0,value:0,child:0,caps:{1:0,2:0},beforeRollout:null};
   leaf.captureSources=G.decomposition(leaf,{1:0,2:0},2);
   queries.push({config:{...task,seed,arm,measure:true},expectedMove:0,rootEvaluation:{raw:0},rootCaps:{1:0,2:0},fingerprint:{q:0,move:{x:0,y:0}},leaves:Array.from({length:4},()=>({...leaf}))});
  }
  const file=path.join(sub,'queries.jsonl'),write=()=>fs.writeFileSync(file,queries.map(x=>JSON.stringify(x)).join('\n'));
  write();G.report(dir,[task]);const r=JSON.parse(fs.readFileSync(path.join(dir,'bericht.json')));assert.equal(r.queries,8);assert.equal(r.paare.length,2);assert.equal(r.paare[0].interaction,0);
  queries[0].fingerprint.q=.5;write();assert.throws(()=>G.report(dir,[task]),/Q nicht rekonstruierbar/);
 } finally {fs.rmSync(dir,{recursive:true});}
});
test('Fehlendes Pflichtpaket ergibt kein Urteil',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capture-report-'));try{assert.throws(()=>G.report(dir));}finally{fs.rmSync(dir,{recursive:true});}
});
laufeTests('Gefangenenwert, Rollouts und Aufgabe').then(ok=>{process.exitCode=ok?0:1;});
