// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const D = require('./death-transfer');
const ROOT = path.resolve(__dirname, '../..');
const INPUT = path.join(ROOT, 'docs/daten/death-transfer/eingaben.json');
const POINTS = {partie113:[101,103,105,107,109,111,113], partie127:[117,119,121,123,125,127], alt494:[85,87,89,91,93]};
const ARMS = {
 A:{captureCap:0, rollout:true}, B:{captureCap:200, rollout:true},
 C:{captureCap:0, rollout:false}, D:{captureCap:200, rollout:false}
};
const SEEDS = [741,742];
function random(seed) { let s=seed>>>0; return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;}; }
function once(s,a,b) { if(s.split(a).length!==2) throw Error('Messanker fehlt oder mehrfach: '+a); return s.replace(a,()=>b); }
function fixtures() { return JSON.parse(fs.readFileSync(INPUT,'utf8')); }
function plan() {
 return Object.entries(POINTS).flatMap(([game,points])=>points.flatMap(mc=>[false,true].flatMap(mirror=>[120,3000].map(sims=>({id:`${game}-${mc}-${mirror?'S':'W'}-${sims}`,game,mc,mirror,sims})))));
}
function source(html,measure) {
 let s=D.source(html,measure);
 if(!measure) return s;
 s=once(s,'{raw:s,capture:gefangen,transfer:__dt,rest:s-gefangen-__dt}',
  '{raw:s,capture:gefangen,transfer:__dt,rest:s-gefangen-__dt,caps:{1:captures[1]||0,2:captures[2]||0}}');
 s=once(s,'    _mctsScratch.set(board);','    _mctsScratch.set(board); globalThis.__beforeRollout=null;');
 const start=s.indexOf('function rollout('), end=s.indexOf('/* ═══ MCTS',start);
 if(start<0||end<0) throw Error('Rollout-Grenzen fehlen');
 let part=s.slice(start,end);
 part=once(part,'  let color = startColor, passes = 0;',
  '  evaluateBoard(_rolloutScratch, rootColor, simCap);\n  globalThis.__beforeRollout=globalThis.__leaves.pop();\n  let color = startColor, passes = 0;');
 s=s.slice(0,start)+part+s.slice(end);
 return once(s,'__leaf.child=path[0]?.kid.idx ?? null; __leaf.value=v;',
  '__leaf.child=path[0]?.kid.idx ?? null; __leaf.value=v; __leaf.beforeRollout=globalThis.__beforeRollout;');
}
function load(measure) {
 Math.random=random(99); globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 globalThis.document={getElementById:()=>null}; globalThis.__leaves=[]; globalThis.__root=null;
 (0,eval)(source(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),measure));
 return globalThis.__E;
}
function decomposition(row,rootCaps,color,weight=20,cap=0) {
 const net=c=>(c[color]||0)-(c[3-color]||0);
 const before=row.beforeRollout||row;
 const initial=net(rootCaps)*weight, tree=(net(before.caps)-net(rootCaps))*weight;
 const rollout=(net(row.caps)-net(before.caps))*weight, rawCapture=net(row.caps)*weight;
 const correction=row.capture-rawCapture;
 const clip=v=>cap>0?Math.max(-cap,Math.min(cap,v)):v;
 return {initial,tree,rollout,rawCapture,correction,
  noRolloutCaptureValue:Math.tanh((row.raw-row.capture+clip(rawCapture-rollout))/200),
  noInitialCaptureValue:Math.tanh((row.raw-row.capture+clip(rawCapture-initial))/200),
  beforeRolloutValue:Math.tanh(before.raw/200)};
}
function query(config) {
 const arm=ARMS[config.arm]; if(!arm) throw Error('Unbekannter Arm');
 const E=load(config.measure), p=fixtures().find(p=>p.id===config.game);
 if(!p) throw Error('Unbekannte Partie');
 const r=D.replay(E,p,config.mc,config.mirror), color=config.mirror?1:2;
 Object.assign(E.PARAMS,p.params,{mctsRolloutDepth:arm.rollout?p.params.mctsRolloutDepth:0,
  captureCap:arm.captureCap,deathTransfer:1,resignEnabled:0,adaptiveBudgetEnabled:0,mctsFixedSims:config.sims,mctsTreeReuse:0});
 if(E.PARAMS.captureWeight!==20||E.PARAMS.mctsValueScale!==200) throw Error('Unerwartete Skala');
 const rootRaw=E.evaluateBoard(r.board,color,r.captures);
 const rootEvaluation=config.measure?globalThis.__leaves.pop():{raw:rootRaw};
 let draws=0;const rng=random(config.seed);Math.random=()=>{draws++;return rng();};
 const move=E.getAIMove(r.board,color,r.hist,r.captures,config.mc,'hard',1,r.ko,r.last);
 const root=globalThis.__root, idx=move.y*19+move.x;
 if(move.type!=='stone'||!root) throw Error('Keine vollständige MCTS-Abfrage');
 const selected=root.kids.find(k=>k.idx===idx); if(!selected?.N) throw Error('Zug fehlt');
 const fingerprint={rootRaw,move,q:selected.W/selected.N,draws,rootN:root.N,kids:root.kids.map(k=>[k.idx,k.N,k.W,k.P])};
 if(config.measure) {
  if(globalThis.__leaves.length!==config.sims) throw Error('Blattzahl falsch');
  for(const l of globalThis.__leaves) {
   l.captureSources=decomposition(l,r.captures,color,20,arm.captureCap);
   checkLeaf(l);
   if(config.arm==='C'||config.arm==='D') {
    if(l.beforeRollout&&(l.beforeRollout.raw!==l.raw||JSON.stringify(l.beforeRollout.caps)!==JSON.stringify(l.caps))) throw Error('Tiefe 0 hat Rollout-Veränderung');
   }
  }
  checkQ({config,fingerprint,leaves:globalThis.__leaves});
 }
 return {config,rootEvaluation,rootCaps:r.captures,expectedMove:p.moves[config.mc]?.idx??null,fingerprint,
  leaves:config.measure?globalThis.__leaves:undefined};
}
function checkLeaf(l) {
 if(l.beforeRollout){const b=l.beforeRollout;if(![b.raw,b.capture,b.transfer,b.rest].every(Number.isFinite)||Math.abs(b.raw-b.capture-b.transfer-b.rest)>1e-8)throw Error('Vor-Rollout-Zerlegung inkonsistent');}
 const finite=o=>Object.values(o).every(Number.isFinite);
 if(!finite({raw:l.raw,capture:l.capture,transfer:l.transfer,rest:l.rest,value:l.value})||!finite(l.captureSources)) throw Error('Nicht endlicher Messwert');
 const c=l.captureSources;
 if(Math.abs(l.raw-l.capture-l.transfer-l.rest)>1e-8||Math.abs(c.initial+c.tree+c.rollout-c.rawCapture)>1e-8||Math.abs(c.rawCapture+c.correction-l.capture)>1e-8||Math.abs(Math.tanh(l.raw/200)-l.value)>1e-12) throw Error('Zerlegung inkonsistent');
}
function checkQ(q) {
 const idx=q.fingerprint.move.y*19+q.fingerprint.move.x;
 const s=q.leaves.filter(l=>l.child===idx);
 if(!s.length||q.leaves.length!==q.config.sims||!Number.isFinite(q.fingerprint.q)||Math.abs(s.reduce((a,l)=>a+l.value,0)/s.length-q.fingerprint.q)>1e-12) throw Error('Q nicht rekonstruierbar');
 return s;
}
function child(config) {
 const r=cp.spawnSync(process.execPath,[__filename,'worker',JSON.stringify(config)],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});
 if(r.error) throw r.error;
 if(r.status!==0) throw Error(r.stderr||'Worker fehlgeschlagen');
 return JSON.parse(r.stdout);
}
function run(id,dir) {
 const task=plan().find(t=>t.id===id);if(!task) throw Error('Unbekanntes Paket');
 fs.mkdirSync(dir,{recursive:true});
 const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const meta={task,sha,inputSha256:hash(INPUT),engineSha256:hash(path.join(ROOT,'index.html'))};
 fs.writeFileSync(path.join(dir,'herkunft.json'),JSON.stringify(meta,null,2));
 for(const seed of SEEDS) for(const arm of Object.keys(ARMS)) {
  const c={...task,seed,arm}, plain=child({...c,measure:false}), measured=child({...c,measure:true});
  if(JSON.stringify(plain.fingerprint)!==JSON.stringify(measured.fingerprint)) throw Error('Messung verändert Suche');
  fs.appendFileSync(path.join(dir,'queries.jsonl'),JSON.stringify(measured)+'\n');
 }
 fs.writeFileSync(path.join(dir,'gueltig.json'),JSON.stringify({gueltig:true,queries:8,task,sha}));
}
function resignationProbe(series,enabled=true) {
 let streak=0, previous=null;
 return [...series].sort((a,b)=>a.mc-b.mc).map(s=>{
  if(previous===null||s.mc!==previous+2) streak=0;
  streak=enabled&&s.mc>=60&&s.q<=-.95?streak+1:0;previous=s.mc;
  return {...s,streak,resign:enabled&&streak>=5};
 });
}
function report(dir,expected=plan()) {
 const queries=[];let signature=null;
 for(const task of expected) {
  const sub=path.join(dir,task.id),read=n=>JSON.parse(fs.readFileSync(path.join(sub,n),'utf8'));
  const g=read('gueltig.json'),meta=read('herkunft.json');
  if(!g.gueltig||g.queries!==8||g.sha!==meta.sha||JSON.stringify(g.task)!==JSON.stringify(task)||JSON.stringify(meta.task)!==JSON.stringify(task)) throw Error('Pflichtpaket ungültig');
  const sig=JSON.stringify([meta.sha,meta.inputSha256,meta.engineSha256]);if(signature&&sig!==signature) throw Error('Gemischte Quellen');signature=sig;
  const q=fs.readFileSync(path.join(sub,'queries.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  if(q.length!==8) throw Error('Pflichtabfragen fehlen');
  for(const seed of SEEDS) for(const arm of Object.keys(ARMS)) {
   const found=q.filter(a=>a.config.seed===seed&&a.config.arm===arm);if(found.length!==1) throw Error('Arm/Seed fehlt oder doppelt');
   const a=found[0];for(const k of ['game','mc','mirror','sims']) if(a.config[k]!==task[k]) throw Error('Falsche Abfrage');
   if(!a.config.measure) throw Error('Messdaten fehlen');
   a.leaves.forEach(checkLeaf); const sel=checkQ(a), avg=f=>sel.reduce((s,l)=>s+f(l),0)/sel.length;
   queries.push({task,seed,arm,q:a.fingerprint.q,move:a.fingerprint.move,expectedMove:a.expectedMove,
    root:a.rootEvaluation,selectedLeaves:sel.length,
    means:{initialCapture:avg(l=>l.captureSources.initial),treeCapture:avg(l=>l.captureSources.tree),rolloutCapture:avg(l=>l.captureSources.rollout),capCorrection:avg(l=>l.captureSources.correction),
     transfer:avg(l=>l.transfer),rest:avg(l=>l.rest),noRolloutCaptureQ:avg(l=>l.captureSources.noRolloutCaptureValue),noInitialCaptureQ:avg(l=>l.captureSources.noInitialCaptureValue),beforeRolloutQ:avg(l=>l.captureSources.beforeRolloutValue)}});
  }
 }
 const probes=[];
 for(const game of Object.keys(POINTS)) for(const mirror of [false,true]) for(const sims of [120,3000]) for(const seed of SEEDS) for(const arm of Object.keys(ARMS)) {
  const values=queries.filter(q=>q.task.game===game&&q.task.mirror===mirror&&q.task.sims===sims&&q.seed===seed&&q.arm===arm);
  const series=values.map(v=>({mc:v.task.mc,q:v.q,archiveMoveMatches:v.expectedMove===v.move.y*19+v.move.x}));
  probes.push({game,mirror,sims,seed,arm,on:resignationProbe(series),off:resignationProbe(series,false)});
 }
 const pairs=expected.flatMap(task=>SEEDS.map(seed=>{
  const arms=Object.fromEntries(Object.keys(ARMS).map(arm=>[arm,queries.find(q=>q.task.id===task.id&&q.seed===seed&&q.arm===arm)]));
  return {task,seed,capDelta:arms.B.q-arms.A.q,rolloutDelta:arms.C.q-arms.A.q,interaction:arms.D.q-arms.C.q-arms.B.q+arms.A.q,arms};
 }));
 const result={gueltig:true,pakete:expected.length,queries:queries.length,einzeln:queries,paare:pairs,aufgabeSonden:probes};
 fs.writeFileSync(path.join(dir,'bericht.json'),JSON.stringify(result,null,2));
 console.log(`Gültig: ${result.pakete} Pakete, ${result.queries} Abfragen plus bestandene Messkontrollen. Archivgebundene Diagnose, keine neuen Partien.`);
}
module.exports={ARMS,POINTS,plan,source,load,decomposition,checkLeaf,checkQ,child,resignationProbe,report};
if(require.main===module) {
 try {
  const [mode,a,b]=process.argv.slice(2);
  if(mode==='plan') console.log(JSON.stringify({include:plan()}));
  else if(mode==='worker') console.log(JSON.stringify(query(JSON.parse(a))));
  else if(mode==='run') run(a,b);
  else if(mode==='report') report(a);
  else throw Error('Modus fehlt');
 } catch(e) { console.error('KEIN URTEIL: '+e.stack);process.exitCode=1; }
}
