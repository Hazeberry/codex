// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gezielte Browserdiagnose, kein Spielstärkeversuch. Startanleitung: docs/bughunt-browser.md.
   Exit 0: vollständig und nicht reproduziert; 1: mindestens ein Befund reproduziert;
   2: Browser fehlt, Vorbedingung fehlt oder Testfehler. Kein stilles Überspringen. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../..');
const IDS = ['UI-1', 'TRAIN-1.pass', 'TRAIN-1.resign', 'UI-2', 'UI-3', 'TRAIN-2', 'NET-1'];
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
function classify(e) {
  if (!e || e.pruefbar !== true || typeof e.defekt !== 'boolean') return 'nicht_pruefbar';
  return e.defekt ? 'reproduziert' : 'nicht_reproduziert';
}
function exitCode(rows) {
  if (rows.length !== IDS.length || new Set(rows.map(r => r.id)).size !== IDS.length || IDS.some(id => !rows.some(r => r.id === id))
      || rows.some(r => !['reproduziert', 'nicht_reproduziert'].includes(r.status))) return 2;
  return rows.some(r => r.status === 'reproduziert') ? 1 : 0;
}
function selftest() {
  const a = require('assert');
  a.equal(classify(null), 'nicht_pruefbar'); a.equal(classify({pruefbar: false, defekt: false}), 'nicht_pruefbar');
  a.equal(classify({pruefbar: true, defekt: true}), 'reproduziert');
  a.equal(classify({pruefbar: true, defekt: false}), 'nicht_reproduziert');
  const rows = IDS.map(id => ({id, status: 'nicht_reproduziert'}));
  a.equal(exitCode(rows), 0); a.equal(exitCode([...rows.slice(1)]), 2);
  a.equal(exitCode(rows.map((r,i) => i ? r : {...r, status:'reproduziert'})), 1);
  a.equal(exitCode(rows.map((r,i) => i ? r : {...r, status:'testfehler'})), 2);
  a.equal(exitCode(rows.map((r,i) => i ? r : {...r, id:IDS[1]})), 2);
  console.log('Berichtslogik: 9 Prüfungen bestanden (kein Browser gestartet).');
}
function markdown(report) {
  const rows = ['# Gezielte Bughunt-Browserdiagnose', '', `Zeit: ${report.zeit}`,
    `index.html SHA-256: ${report.quelle.sha256}`, `Node: ${report.node}; Browser: ${report.browser || 'nicht gestartet'}`,
    '', '**Diagnose, keine Spielstärkemessung.** Ein grüner Abschluss gilt nur für diese Abläufe.', '',
    '| ID | Status |', '|---|---|'];
  for (const r of report.tests) rows.push(`| ${r.id} | ${r.status} |`);
  if (report.startfehler) rows.push('', `Startfehler: ${report.startfehler}`);
  for (const r of report.tests) rows.push('', `## ${r.id}`, '', '```json', JSON.stringify(r, null, 2), '```');
  rows.push('', 'Testdaten und instrumentierte Antworten sind im Aufbau beschrieben. Browserzustände stammen aus frischen',
    'Kontexten; es wird kein persönliches Profil und kein vorhandener Nutzerspeicher geöffnet.');
  return rows.join('\n') + '\n';
}
async function main() {
  if (process.argv.includes('--selftest')) { selftest(); return; }
  const args = process.argv.slice(2), opt = {html: path.join(ROOT,'index.html'), aus: path.join(ROOT,'bughunt-browser-ergebnis')};
  for (let i=0;i<args.length;i++) {
    if (args[i] === '--html') opt.html=path.resolve(args[++i]);
    else if (args[i] === '--aus') opt.aus=path.resolve(args[++i]);
    else throw new Error('Unbekannte Option: '+args[i]);
  }
  fs.mkdirSync(opt.aus, {recursive:true});
  const report={zeit:new Date().toISOString(),node:process.version,quelle:{datei:opt.html,sha256:hash(fs.readFileSync(opt.html))},tests:[]};
  let browser, server;
  try {
    const {ladePlaywright,sucheChromium,starteServer}=require(path.join(ROOT,'tests/browser-rahmen.js'));
    const pw=ladePlaywright();
    if (!pw) throw new Error('Playwright fehlt. Siehe docs/bughunt-browser.md.');
    const executablePath=process.env.CHROMIUM_PATH||sucheChromium(pw);
    if (!executablePath || !fs.existsSync(executablePath)) throw new Error('Chromium fehlt. Browserdiagnose NICHT ausgeführt; kein grünes Überspringen.');
    browser=await pw.chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    report.browser=browser.version();
    const serving=await starteServer(opt.html);server=serving.server;
    async function scenario(id, fn, init) {
      const ctx=await browser.newContext({viewport:{width:1100,height:1000}}),p=await ctx.newPage(),pageErrors=[];
      p.setDefaultTimeout(10000);p.setDefaultNavigationTimeout(15000);
      p.on('pageerror',e=>pageErrors.push(e.message));
      let row;
      try {
        // Externe Schrift-/Netzaufrufe sind für diese Prüfungen unnötig.
        await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
        if(init)await p.addInitScript(init);
        await p.goto(`http://127.0.0.1:${serving.port}/spiel.html`,{waitUntil:'load'});
        await p.waitForFunction(()=>typeof state!=='undefined'&&typeof policyNet!=='undefined');
        await p.evaluate(()=>{state.aiEnabled=false;});
        if(pageErrors.length)throw new Error('Seitenfehler beim Laden: '+pageErrors.join(' | '));
        const evidence=await fn(p);
        if(pageErrors.length)throw new Error('Unerwartete Seitenfehler: '+pageErrors.join(' | '));
        row={id,status:classify(evidence),evidence};
      } catch(e) {row={id,status:'testfehler',fehler:e.stack||String(e),pageErrors};}
      try {await p.screenshot({path:path.join(opt.aus,id+'.png'),fullPage:true,timeout:5000});}
      catch(e){row.screenshotFehler=e.message;}
      report.tests.push(row);console.log(id+': '+row.status);
      await ctx.close();
    }

    // Echter Browser-Worker, aber kontrollierter Antwortinhalt und kontrollierte Freigabe.
    // Die App erzeugt/anfragt/verarbeitet ihn über ihre originalen Funktionen; keine MCTS-Suche.
    await scenario('UI-1',async p=>{
      await p.evaluate(()=>{state.aiColor=1;state.aiDifficulty='hard';state.aiEnabled=true;triggerAIMove();});
      await p.waitForFunction(()=>state.aiThinking&&!!window.__bhRequest);
      const before=await p.evaluate(()=>({id:state.aiRequestId,mc:state.moveCount,hash:state.currentHash}));
      await p.click('#btn-ai-toggle');
      const disabled=await p.evaluate(()=>({enabled:state.aiEnabled,thinking:state.aiThinking,id:state.aiRequestId}));
      await p.evaluate(()=>window.__bhRelease());
      await p.waitForTimeout(300);
      const after=await p.evaluate(()=>({enabled:state.aiEnabled,thinking:state.aiThinking,mc:state.moveCount,
        board:Array.from(state.board),delivered:!!window.__bhDelivered,workerDead:!!state.workerDead}));
      return {pruefbar:disabled.enabled===false&&!after.workerDead,defekt:after.mc!==before.mc||after.thinking,
        before,disabled,after,hinweis:'Kontrollierter echter Worker; fehlende Zustellung nach terminate ist erlaubte Abbruchstrategie.'};
    },()=>{
      const Native=window.Worker;
      const code=`let req;onmessage=e=>{if(e.data.release){if(req)postMessage({type:'stone',x:3,y:3,reqId:req.reqId});}else req=e.data;};`;
      const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
      window.Worker=function(){const w=new Native(url),send=w.postMessage.bind(w);window.__bhDelivered=false;
        w.addEventListener('message',()=>{window.__bhDelivered=true;});
        w.postMessage=function(d,...rest){window.__bhRequest={reqId:d.reqId};return send(d,...rest);};
        window.__bhRelease=()=>send({release:true});return w;};
    });

    for(const finish of ['pass','resign'])await scenario('TRAIN-1.'+finish,async p=>{
      const r=await p.evaluate(finish=>{
        state.aiEnabled=false;state.aiColor=1;state.aiDifficulty='hard';
        // Kurze synthetische Trainingspartie. Echter forward/backward/trainGame, keine Suche.
        const inp=policyNet.boardToInput(state.board,1,null,null),{probs,hidden}=policyNet.forward(inp);
        state.aiRequestId=7;applyAIResult({type:'stone',x:3,y:3},7,inp,probs,hidden);
        state.aiColor=1;
        const snapshot=()=>({games:policyNet.gamesPlayed,trained:policyNet._trained,buf:policyNet._gameBuffer.length,
          weights:[...policyNet.W1,...policyNet.b1,...policyNet.W2,...policyNet.b2],stored:localStorage.getItem('go_pnet')});
        const before=snapshot();
        if(finish==='pass'){document.getElementById('btn-pass').click();document.getElementById('btn-pass').click();}
        else {state.currentPlayer=1;state.aiRequestId=8;applyAIResult({type:'resign'},8,null,null,null);}
        const ended=snapshot(),wasOver=state.gameOver;
        document.getElementById('btn-undo').click();
        const undone=snapshot(),reopened=!state.gameOver;
        const eq=(a,b)=>JSON.stringify(a.weights)===JSON.stringify(b.weights);
        const stale=ended.games>before.games&&reopened&&undone.trained&&eq(undone,ended)
          &&undone.games===ended.games&&undone.stored===ended.stored;
        return {pruefbar:wasOver&&reopened&&before.buf>0,defekt:stale,finish,
          before:{games:before.games,trained:before.trained,buf:before.buf},
          ended:{games:ended.games,trained:ended.trained},undone:{games:undone.games,trained:undone.trained,buf:undone.buf},
          changedByTraining:!eq(before,ended),unchangedByUndo:eq(ended,undone),persistedUnchangedByUndo:ended.stored===undone.stored};
      },finish);
      return r;
    });

    await scenario('UI-2',async p=>{
      await p.evaluate(()=>{
        // Lebende Schwarzgruppe mit zwei Augen, damit die Schlussauflösung die Fixture nicht entfernt.
        state.aiEnabled=false;state.board.fill(1);state.board[idx(3,3)]=0;state.board[idx(15,15)]=0;
        state.currentHash=computeZobrist(state.board);state.boardHistory=new Set([state.currentHash]);
        state.currentPlayer=2;state.consecutivePasses=0;drawStateToCache();pass();pass();render();updateUI();
      });
      const before=await p.locator('#final-score').textContent();
      await p.click('.scoring-btn[data-scoring="territory"]');
      return p.evaluate(before=>{
        const displayed=document.getElementById('final-score').textContent,t=finalTerritoryScore(),a=finalAreaScore();
        const sb=t[1],sw=t[2]+KOMI,expected=(sb>sw?'Schwarz':'Weiß')+' +'+Math.abs(sb-sw).toFixed(1);
        const sgf=buildSGF().match(/RE\[([^\]]+)\]/);
        return {pruefbar:state.gameOver&&state.scoringMode==='territory'&&!!sgf&&a[1]-a[2]!==t[1]-t[2],
          defekt:displayed!==expected,before,displayed,expected,sgf:sgf&&sgf[1],area:a,territory:t};
      },before);
    });

    await scenario('UI-3',async p=>{
      const txt=fs.readFileSync(path.join(ROOT,'tests/stellungen/zaehlung-358.sgf'),'utf8'),moves=[];
      for(const m of txt.matchAll(/;([BW])\[([a-s]{2})\]/g))moves.push([(m[2].charCodeAt(1)-97)*19+m[2].charCodeAt(0)-97,m[1]==='B'?1:2]);
      if(!moves.length)throw new Error('Overlay-Teststellung enthält keine Züge.');
      await p.evaluate(moves=>{
        state.aiEnabled=false;for(const [i,c]of moves){state.board[i]=c;removeDeadGroups(state.board,3-c,i);}
        state.currentPlayer=1;state.moveCount=moves.length;state.consecutivePasses=0;state.lastMove=null;
        state.currentHash=computeZobrist(state.board);state.boardHistory=new Set([state.currentHash]);
        drawStateToCache();render();updateUI();window.__bhClean=canvas.toDataURL();
      },moves);
      await p.click('#btn-zaehlvorschau');
      const marked=await p.evaluate(()=>({count:state.vorschau.v.anzahl.geschaetztTot+state.vorschau.v.anzahl.bewiesenTot,
        changed:canvas.toDataURL()!==window.__bhClean}));
      await p.screenshot({path:path.join(opt.aus,'UI-3.vorschau.png'),fullPage:true});
      await p.click('#btn-pass');
      const r=await p.evaluate(()=>{
        const displayed=canvas.toDataURL(),cached=stateCache.toDataURL(),preview=state.vorschau,
          panel=document.getElementById('zv-panel').style.display;
        // Kontrollbild: dieselbe Stellung, nur der vom Passhandler ausgelassene Cache-Neuaufbau.
        drawStateToCache();render();const clean=canvas.toDataURL();
        return {previewNull:preview===null,panelHidden:panel==='none',displayed,cached,clean};
      });
      for(const [name,data]of [['nach-pass',r.displayed],['nach-neuzeichnen',r.clean]])
        fs.writeFileSync(path.join(opt.aus,'UI-3.'+name+'.png'),Buffer.from(data.split(',')[1],'base64'));
      return {pruefbar:marked.count>0&&marked.changed&&r.previewNull&&r.panelHidden,
        defekt:r.displayed!==r.clean,marked,previewNull:r.previewNull,panelHidden:r.panelHidden,
        screenshotHash:hash(r.displayed),cleanHash:hash(r.clean),cachedHash:hash(r.cached)};
    });

    await scenario('TRAIN-2',async p=>{
      await p.evaluate(()=>{
        state.aiEnabled=false;state.aiColor=2;state.currentPlayer=2;state.aiDifficulty='hard';
        window.__bhTags=new WeakMap();window.__bhRewards=[];
        const backward=policyNet._backward;
        policyNet._backward=function(inp,h,probs,move,advantage){window.__bhRewards.push({color:window.__bhTags.get(inp),advantage});return backward.call(this,inp,h,probs,move,advantage);};
        const inp=policyNet.boardToInput(state.board,2,null,null),{probs,hidden}=policyNet.forward(inp);window.__bhTags.set(inp,2);
        state.aiRequestId=1;applyAIResult({type:'stone',x:3,y:3},1,inp,probs,hidden);
        window.__bhWhiteBuffered=policyNet._gameBuffer.length;
      });
      await p.click('.color-btn[data-color="1"]');
      return p.evaluate(()=>{
        const color=state.aiColor,afterSwitch=policyNet._gameBuffer.length;
        const inp=policyNet.boardToInput(state.board,1,null,null),{probs,hidden}=policyNet.forward(inp);window.__bhTags.set(inp,1);
        state.currentPlayer=1;state.aiRequestId=2;applyAIResult({type:'stone',x:4,y:4},2,inp,probs,hidden);
        // Kontrollierter Schwarzsieg als Endzustand, keine Aussage über Partiequalität.
        state.board.fill(1);state.gameOver=true;showFinalScore();
        return {pruefbar:color===1&&window.__bhWhiteBuffered===1&&window.__bhRewards.some(r=>r.color===1),
          defekt:window.__bhRewards.some(r=>r.color===2&&r.advantage>0),afterSwitch,rewards:window.__bhRewards,
          hinweis:'Synthetischer Endzustand; echter trainGame/backward, Wrapper zeichnet nur Eingangsreward auf.'};
      });
    });

    await scenario('NET-1',async p=>p.evaluate(()=>{
      const sample=()=>({games:policyNet.gamesPlayed,trained:policyNet._trained,healthy:policyNet._healthy});
      policyNet.gamesPlayed=17;policyNet._trained=true;policyNet._healthy=false;const weights=policyNet.W1,before=sample();
      const descriptor=Object.getOwnPropertyDescriptor(Storage.prototype,'removeItem');
      let err=null;
      try {
        Object.defineProperty(Storage.prototype,'removeItem',{configurable:true,value(){throw new DOMException('Test: Storage verweigert','SecurityError');}});
        try{policyNet.reset();}catch(e){err={name:e.name,message:e.message};}
      } finally {Object.defineProperty(Storage.prototype,'removeItem',descriptor);}
      const after=sample(),sameWeights=weights===policyNet.W1;
      return {pruefbar:true,defekt:!!err||after.games!==0||sameWeights||after.trained||!after.healthy,before,after,sameWeights,err,
        hinweis:'Storage-Verweigerung nach Seitenstart injiziert; kein fremdes Browserprofil.'};
    }));
  } catch(e) {report.startfehler=e.stack||String(e);}
  finally {if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
  // Fehlende oder abgebrochene Szenarien bleiben ausdrücklich ungeprüft.
  for(const id of IDS)if(!report.tests.some(r=>r.id===id))report.tests.push({id,status:'nicht_pruefbar',grund:report.startfehler||'Szenario nicht ausgeführt'});
  report.exitCode=exitCode(report.tests);
  fs.writeFileSync(path.join(opt.aus,'bericht.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(opt.aus,'bericht.md'),markdown(report));
  console.log('Bericht: '+path.join(opt.aus,'bericht.md')+'; Exit '+report.exitCode);
  process.exitCode=report.exitCode;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=2;});
module.exports={classify,exitCode,IDS};
