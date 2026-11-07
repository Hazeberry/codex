// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Einmalige Defektreproduktion am Stand 17117ae; keine Regressionstests für einen reparierten Stand.
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),assert=require('assert');
const path=require('path'),os=require('os'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'codex-bughunt-'));
const html=fs.readFileSync(root+'/index.html','utf8');
for(const [f,h] of [['index.html','7bf3158212700948deaef4616b9c95f83521b5fe2ac840ad601996de60b8bf0a'],['gtp-ki.js','51a82869e50a0cdd653ba611579f0dd4d5fdd8ab311b86efdf66f5379c5a241b']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'/'+f)).digest('hex'),h,'Quellenstand weicht ab: '+f);
const ex=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const out=[];
function test(id,fn){try{out.push({id,status:'reproduziert',evidence:fn()});}catch(e){out.push({id,status:'Prüfung fehlgeschlagen',error:e.stack});}}
function gtp(commands,fixture){const r=cp.spawnSync(process.execPath,[root+'/gtp-ki.js','--html',fixture||root+'/index.html'],{input:commands.join('\n')+'\n',encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);return {answers:r.stdout.split('\n\n').filter(Boolean),stderr:r.stderr};}
test('GTP-1',()=>{
 const suicide=gtp(['play W A2','play W B1','play B A1','list_stones B','quit']);assert.equal(suicide.answers[2],'= ');assert.equal(suicide.answers[3],'= A1');
 const setup=['play W B2','play W A3','play W C3','play W B4','play B A2','play B B1','play B C2','play B B3'];
 const ko=gtp([...setup,'play W B2','list_stones W','list_stones B','quit']);assert.equal(ko.answers[8],'= ');assert(ko.answers[9].includes('B2'));assert(!ko.answers[10].includes('B3'));
 const superko=gtp([...setup,'play W pass','play B pass','play W B2','list_stones W','quit']);assert.equal(superko.answers[10],'= ');
 return {suicideAccepted:suicide.answers.slice(2,4),immediateKoAccepted:ko.answers.slice(8,11),recaptureAfterPassesAccepted:superko.answers.slice(10,12)};
});
test('GTP-3',()=>{const r=gtp(['17 protocol_version','18 unknown','protocol_version','quit']);assert(r.answers[0].startsWith('? '));assert(!r.answers[0].startsWith('?17'));return r.answers;});
test('GTP-2',()=>{
 const marker='</script>',start=html.indexOf('<script id="worker-ai">'),end=html.indexOf(marker,start);
 const injected=html.slice(0,end)+`\ngetAIMove=function(...args){process.stderr.write(JSON.stringify({argc:args.length,enabled:PARAMS.passNachGegnerpass,extra:args[9]??null})+'\\n');return {type:'pass'};};\n`+html.slice(end);
 const file=tmp+'/instrumented.html';fs.writeFileSync(file,injected);
 const r=cp.spawnSync(process.execPath,[root+'/gtp-ki.js','--html',file,'--ki','passNachGegnerpass=1'],{input:'play W pass\ngenmove B\nquit\n',encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);const args=JSON.parse(r.stderr.trim());assert.equal(args.argc,9);assert.equal(args.enabled,1);assert.equal(args.extra,null);return {instrumentedAdapterArguments:args,scope:'Argumentübergabe instrumentiert; keine Suche und kein Auslösungsergebnis gemessen'};
});
function context(){
 const els=new Map(),handlers={};
 const el=id=>{if(!els.has(id))els.set(id,{style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(event,fn){handlers[id+':'+event]=fn;},appendChild(){},textContent:''});return els.get(id);};
 const colors=[el('color1'),el('color2')];colors[0].dataset.color='1';colors[1].dataset.color='2';
 const scoring=[el('area'),el('territory')];scoring[0].dataset.scoring='area';scoring[1].dataset.scoring='territory';
 const sandbox={console:{log(){},warn(){},error(){}},performance,Date,localStorage:{getItem(){return null},setItem(){},removeItem(){}},document:{getElementById:id=>id==='pn-games'?null:el(id),querySelectorAll:q=>q==='.color-btn'?colors:q==='.scoring-btn'?scoring:[],createElement:()=>el('created')},setTimeout(){},clearTimeout(){}};
 sandbox.window=sandbox;vm.createContext(sandbox);
 vm.runInContext(ex('shared-go-logic')+'\n'+ex('worker-ai')+'\n'+ex('policy-net'),sandbox);
 const source='const KOMI=7.5;\n'+cut('const state = {','/* Touch-Bedienung:')+'\nlet pendingTouch=null;\n'+
 cut('function humanTurn()','function placeStone(')+cut('function placeStone(','function resetGame()')+
 cut('function finalAreaScore()','/* ═══ Worker-Fallback-Kette')+
 cut('function buildSGF()','function downloadSGF()')+
 cut('function vorschauSchluessel()','function zeichneVorschauMarken(')+
 cut("document.getElementById('btn-ai-toggle').addEventListener",'document.querySelectorAll(\'.diff-btn\')')+
 cut("document.querySelectorAll('.color-btn').forEach",'document.getElementById(\'btn-undo\').addEventListener');
 vm.runInContext(`let cache='clean',shown='clean';function drawStateToCache(){cache='clean';}function render(){shown=cache;}function updateUI(){vorschauAbgleichen();}function updateAIStatus(){}function updateUndoButton(){}function triggerAIMove(){}function findAnyLegalMove(){return null;}function resolveLifeAndDeath(){}\n`+source,sandbox);
 sandbox.run=s=>vm.runInContext(s,sandbox);sandbox.click=(id)=>handlers[id+':click'].call(el(id));sandbox.els=els;return sandbox;
}
test('UI-1',()=>{const c=context();c.run('state.aiEnabled=true;state.aiColor=1;state.currentPlayer=1;state.aiThinking=true;state.aiRequestId=5;');c.click('btn-ai-toggle');const before=c.run('({enabled:state.aiEnabled,thinking:state.aiThinking,id:state.aiRequestId,count:state.moveCount})');c.run("applyAIResult({type:'stone',x:3,y:3},5,null,null,null)");const after=c.run('({enabled:state.aiEnabled,count:state.moveCount,stone:state.board[60]})');assert.equal(before.enabled,false);assert.equal(before.thinking,true);assert.equal(after.count,1);assert.equal(after.stone,1);return {beforeResponse:before,afterResponse:after,scope:'Originalhandler und applyAIResult, Antwort kontrolliert eingespeist; kein echter Worker'};});
test('TRAIN-1',()=>{const c=context();const r=c.run(`
state.aiColor=2;let calls=[];policyNet.trainGame=function(r){calls.push(r);this.W1[0]+=r;};
const w0=policyNet.W1[0];pass();pass();const first={calls:[...calls],trained:policyNet._trained,w:policyNet.W1[0]};undo();
const undone={gameOver:state.gameOver,trained:policyNet._trained,w:policyNet.W1[0]};state.board[0]=1;pass();
({w0,first,undone,last:{calls:[...calls],trained:policyNet._trained,w:policyNet.W1[0]}})`);
assert.equal(r.first.calls.length,1);assert.equal(r.undone.trained,true);assert.equal(r.undone.w,r.first.w);assert.equal(r.last.calls.length,1);return {...r,scope:'Original showFinalScore/pass/undo; Training durch aufrufzählende Gewichtsänderungs-Attrappe ersetzt; KI-Aufgabe nur statisch geprüft'};});
test('UI-2',()=>{const c=context();c.run('state.board[0]=1;state.gameOver=true;showFinalScore();');const before=c.els.get('final-score').textContent;c.click('territory');const r=c.run('({mode:state.scoringMode,sgf:buildSGF(),margin:state.finalMargin})');const after=c.els.get('final-score').textContent;assert.equal(before,after);assert(r.sgf.includes('RE[B+352.5]'));assert.equal(after,'Schwarz +353.5');return {before,after,mode:r.mode,sgfResult:r.sgf.match(/RE\[[^\]]+\]/)[0]};});
test('UI-3',()=>{const c=context();c.run(`state.board[0]=1;state.currentHash=computeZobrist(state.board);state.vorschau={schluessel:vorschauSchluessel(),v:{}};cache='preview marks';shown=cache;`);c.click('btn-pass');const r=c.run('({preview:state.vorschau,cache,shown,moveCount:state.moveCount})');assert.equal(r.preview,null);assert.equal(r.cache,'preview marks');assert.equal(r.shown,'preview marks');return {...r,scope:'Original Passhandler und Invalidierung, instrumentierter Canvas-Cache; Pixel-Reproduktion noch offen'};});
test('TRAIN-2',()=>{const c=context();const r=c.run(`
state.aiEnabled=false;state.aiColor=2;state.currentPlayer=2;state.aiRequestId=1;
applyAIResult({type:'stone',x:3,y:3},1,new Float32Array([2]),new Float32Array([1]),new Float32Array([0]));
globalThis.firstKeys=Object.keys(policyNet._gameBuffer[0]);`);c.click('color1');const result=c.run(`
state.currentPlayer=1;state.aiRequestId=2;applyAIResult({type:'stone',x:4,y:4},2,new Float32Array([1]),new Float32Array([1]),new Float32Array([0]));
const seen=[];policyNet._backward=function(inp,h,p,m,a){seen.push({tag:inp[0],advantage:a});return false;};
state.board.fill(1);state.gameOver=true;showFinalScore();({keys:firstKeys,seen,aiColor:state.aiColor})`);
assert.equal(result.seen.length,2);assert(result.seen.every(x=>x.advantage===1));assert(!result.keys.includes('color'));return {...result,scope:'Original Pufferaufnahme/Farbhandler/trainGame; _backward protokolliert den Reward statt Gewichte zu ändern'};});
test('NET-1',()=>{const c=context();const r=c.run(`policyNet.gamesPlayed=17;const old=policyNet.W1;localStorage.removeItem=()=>{throw new Error('storage denied')};let err;try{policyNet.reset()}catch(e){err=e.message}({err,games:policyNet.gamesPlayed,sameWeights:old===policyNet.W1})`);assert.equal(r.err,'storage denied');assert.equal(r.games,17);assert.equal(r.sameWeights,true);return r;});
fs.writeFileSync(process.argv[2]||tmp+'/results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));fs.rmSync(tmp,{recursive:true,force:true});if(out.some(x=>x.status!=='reproduziert'))process.exitCode=1;
