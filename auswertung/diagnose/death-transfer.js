// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process'), crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../..');
const INPUT=path.join(ROOT,'docs/daten/death-transfer/eingaben.json');
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function once(s,a,b){if(s.split(a).length!==2)throw Error('Messanker fehlt oder mehrfach: '+a);return s.replace(a,()=>b);}
function source(html,measure){
 const ex=id=>{const m=new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);if(!m)throw Error('Block fehlt '+id);return m[1];};
 let w=ex('worker-ai');
 if(measure){
  const start=w.indexOf('function evaluateBoard('),end=w.indexOf('const _emptyHashes',start);
  if(start<0||end<0)throw Error('Bewertungsfunktion fehlt');
  let f=w.slice(start,end);
  f=once(f,'  let s = gefangen;','  let s = gefangen; let __dt = 0;');
  f=once(f,'        v -= _dt;','        v -= _dt; __dt += c === color ? -_dt : _dt;');
  f=once(f,'  return s;','  globalThis.__leaves.push({raw:s,capture:gefangen,transfer:__dt,rest:s-gefangen-__dt});\n  return s;');
  w=w.slice(0,start)+f+w.slice(end);
  w=once(w,'    root.N++;','    const __leaf=globalThis.__leaves.at(-1); if(!__leaf)throw Error("Blatt fehlt");\n    __leaf.child=path[0]?.kid.idx ?? null; __leaf.value=v;\n    root.N++;');
 }
 w=once(w,'  return {m: {x: bm.x, y: bm.y, idx: bm.idx}, sims,','  globalThis.__root=root;\n  return {m: {x: bm.x, y: bm.y, idx: bm.idx}, sims,');
 return ex('shared-go-logic')+'\n'+w+'\n;globalThis.__E={PARAMS,getAIMove,evaluateBoard,computeZobrist,removeDeadGroups,floodFill,getLegalMoves};';
}
function load(measure){
 Math.random=rng(99);globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};globalThis.document={getElementById:()=>null};globalThis.__leaves=[];globalThis.__root=null;
 (0,eval)(source(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),measure));return globalThis.__E;
}
function replay(E,p,n,mirror=false){
 const board=new Uint8Array(361),captures={1:0,2:0},hist=new Set([E.computeZobrist(board)]);let ko=null,last=null;
 for(let j=0;j<n;j++){
  const m=p.moves[j];if(!m||m.color!==j%2+1)throw Error('Zugfolge/Farbe falsch');const c=mirror?3-m.color:m.color;
  if(m.idx<0){ko=null;continue;}
  const i=m.idx;if(i>=361||board[i]||i===ko)throw Error('Illegaler Archivzug');
  board[i]=c;const cap=E.removeDeadGroups(board,3-c,i);if(!E.floodFill(board,i).liberties.length)throw Error('Suizid im Archiv');captures[c]+=cap;ko=null;
  if(cap===1){const f=E.floodFill(board,i);if(f.group.length===1&&f.liberties.length===1)ko=f.liberties[0];}
  const h=E.computeZobrist(board);if(hist.has(h))throw Error('Superko im Archiv');hist.add(h);last=i;
 }
 return {board,captures,hist:[...hist],ko,last};
}
function fixtures(){return JSON.parse(fs.readFileSync(INPUT,'utf8'));}
function validate(E){for(const p of fixtures()){
 const r=replay(E,p,p.moves.length);if(JSON.stringify([...r.board])!==JSON.stringify(p.board)||r.captures[1]!==p.captures['1']||r.captures[2]!==p.captures['2'])throw Error('Archiv-Endzustand falsch: '+p.id);
}return true;}
function plan(){return fixtures().flatMap(p=>p.points.flatMap(mc=>[false,true].flatMap(mirror=>[120,3000].map(sims=>({id:`${p.id}-${mc}-${mirror?'S':'W'}-${sims}`,game:p.id,mc,mirror,sims})))));}
function query(config){
 const E=load(config.measure);const p=fixtures().find(p=>p.id===config.game);if(!p)throw Error('Unbekannte Partie');
 const r=replay(E,p,config.mc,config.mirror),color=config.mirror?1:2;
 Object.assign(E.PARAMS,p.params,{deathTransfer:config.dose,resignEnabled:0,adaptiveBudgetEnabled:0,mctsFixedSims:config.sims,mctsTreeReuse:0});
 if(E.PARAMS.mctsValueScale!==200)throw Error('Unerwartete Q-Skalierung');
 const rootRaw=E.evaluateBoard(r.board,color,r.captures),rootEvaluation=config.measure?globalThis.__leaves.pop():{raw:rootRaw};
 let draws=0;const random=rng(config.seed);Math.random=()=>{draws++;return random();};
 const move=E.getAIMove(r.board,color,r.hist,r.captures,config.mc,'hard',1,r.ko,r.last);
 const root=globalThis.__root;if(!root||!root.kids.length||move.type!=='stone')throw Error('Keine vollständige MCTS-Abfrage');
 const chosen=move.y*19+move.x,child=root.kids.find(k=>k.idx===chosen);if(!child||!child.N)throw Error('Gewählter Zug fehlt');
 const fingerprint={rootRaw,move,q:child.W/child.N,draws,rootN:root.N,kids:root.kids.map(k=>[k.idx,k.N,k.W,k.P])};
 if(config.measure){
  if(globalThis.__leaves.length!==config.sims)throw Error('Blattzahl entspricht nicht Simulationszahl');
  const selected=globalThis.__leaves.filter(l=>l.child===chosen);
  if(!selected.length||Math.abs(selected.reduce((s,l)=>s+l.value,0)/selected.length-fingerprint.q)>1e-12)throw Error('Q lässt sich nicht aus Blättern rekonstruieren');
  for(const l of globalThis.__leaves)if(!['raw','capture','transfer','rest','value'].every(k=>Number.isFinite(l[k]))||Math.abs(l.raw-l.capture-l.transfer-l.rest)>1e-8||Math.abs(Math.tanh(l.raw/E.PARAMS.mctsValueScale)-l.value)>1e-12)throw Error('Ungültige Blattzerlegung');
 }
 return {config,rootEvaluation,fingerprint,leaves:config.measure?globalThis.__leaves:undefined};
}
function child(c){const r=cp.spawnSync(process.execPath,[__filename,'worker',JSON.stringify(c)],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});if(r.error)throw r.error;if(r.status!==0)throw Error((r.stderr||'')+' Worker fehlgeschlagen');return JSON.parse(r.stdout);}
function run(id,dir){
 const task=plan().find(p=>p.id===id);if(!task)throw Error('Unbekanntes Paket');fs.mkdirSync(dir,{recursive:true});
 const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 const meta={task,sha,inputSha256:crypto.createHash('sha256').update(fs.readFileSync(INPUT)).digest('hex'),engineSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex')};
 fs.writeFileSync(path.join(dir,'herkunft.json'),JSON.stringify(meta,null,2));
 const rows=[];
 for(const seed of [741,742])for(const dose of [0,.5,1]){
  const c={...task,seed,dose},plain=child({...c,measure:false}),measured=child({...c,measure:true});
  if(JSON.stringify(plain.fingerprint)!==JSON.stringify(measured.fingerprint))throw Error('Instrumentierung verändert Suche');
  rows.push(measured);fs.appendFileSync(path.join(dir,'queries.jsonl'),JSON.stringify(measured)+'\n');
 }
 fs.writeFileSync(path.join(dir,'gueltig.json'),JSON.stringify({gueltig:true,queries:rows.length,task,sha}));
}
function report(dir){
 const expected=plan(), rows=[];let provenance=null;
 for(const task of expected){const sub=path.join(dir,task.id),g=JSON.parse(fs.readFileSync(path.join(sub,'gueltig.json'),'utf8'));if(!g.gueltig||g.queries!==6||JSON.stringify(g.task)!==JSON.stringify(task))throw Error('Pflichtpaket ungültig');
  const meta=JSON.parse(fs.readFileSync(path.join(sub,'herkunft.json'),'utf8'));if(g.sha!==meta.sha)throw Error('Quellenbeleg widersprüchlich');const signature=JSON.stringify([meta.sha,meta.inputSha256,meta.engineSha256]);if(provenance&&signature!==provenance)throw Error('Gemischte Quellen');provenance=signature;
  const q=fs.readFileSync(path.join(sub,'queries.jsonl'),'utf8').trim().split('\n').map(JSON.parse);if(q.length!==6)throw Error('Paket unvollständig');
  for(const entry of q){for(const k of ['game','mc','mirror','sims'])if(entry.config[k]!==task[k])throw Error('Falsche Abfrage im Paket');if(entry.config.measure!==true)throw Error('Messdaten fehlen');}
  for(const seed of [741,742]){
   const arms=[0,.5,1].map(dose=>q.find(x=>x.config.seed===seed&&x.config.dose===dose));if(arms.some(x=>!x))throw Error('Arm fehlt');
   const data=arms.map(a=>{const l=a.leaves,selected=l.filter(x=>x.child===a.fingerprint.move.y*19+a.fingerprint.move.x),avg=f=>l.reduce((s,x)=>s+f(x),0)/l.length;
    if(l.length!==task.sims||!Number.isFinite(a.fingerprint.q)||!selected.length||Math.abs(selected.reduce((s,x)=>s+x.value,0)/selected.length-a.fingerprint.q)>1e-12)throw Error('Blatt/Q-Prüfung fehlgeschlagen');
    const selAvg=f=>selected.reduce((s,x)=>s+f(x),0)/selected.length;return {dose:a.config.dose,rootEvaluation:a.rootEvaluation,q:a.fingerprint.q,move:a.fingerprint.move,
    captureMean:avg(x=>x.capture),transferMean:avg(x=>x.transfer),restMean:avg(x=>x.rest),
    valueMean:avg(x=>x.value),sameLeavesWithoutTransfer:avg(x=>Math.tanh((x.raw-x.transfer)/200)),
    selected:{leaves:selected.length,rawMean:selAvg(x=>x.raw),captureMean:selAvg(x=>x.capture),transferMean:selAvg(x=>x.transfer),restMean:selAvg(x=>x.rest),valueMean:selAvg(x=>x.value),sameLeavesWithoutTransfer:selAvg(x=>Math.tanh((x.raw-x.transfer)/200))}};});
   rows.push({task,seed,arms:data,deltaQ0minus1:data[0].q-data[2].q});
  }
 }
 const summary={gueltig:true,pakete:expected.length,queries:expected.length*6,paare:rows};fs.writeFileSync(path.join(dir,'bericht.json'),JSON.stringify(summary,null,2));
 console.log(`Gültig: ${summary.pakete} Pakete, ${summary.queries} gepaarte Abfragen. Einzelfall-Diagnose; kein Spielstärkeurteil. Details in bericht.json.`);
}
module.exports={source,load,replay,validate,plan,query,child,report};
if(require.main===module){try{const [mode,a,b]=process.argv.slice(2);
 if(mode==='plan')console.log(JSON.stringify({include:plan()}));else if(mode==='worker')console.log(JSON.stringify(query(JSON.parse(a))));else if(mode==='run')run(a,b);else if(mode==='report')report(a);else if(mode==='validate'){validate(load(false));console.log('Alle Archive stimmen.');}else throw Error('Modus fehlt');
}catch(e){console.error('KEIN URTEIL: '+e.stack);process.exitCode=1;}}
