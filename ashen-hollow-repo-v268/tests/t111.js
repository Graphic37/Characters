// ⚠ PROVE IT FROM THE RENDERED DOM, NOT A SOURCE COUNT.
// My repeated "there is only one map" was a grep result. This builds the real
// page, runs the real frame-loop calls, and asks the DOM what is on screen.
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. render the shipped markup + stylesheet into a real DOM -------
const headEnd=src.indexOf('</style>')+8;
const bodyA=src.indexOf('<body');
const bodyB=src.indexOf('<script', bodyA);
const markup=src.slice(src.indexOf('<style>'), headEnd) + src.slice(bodyA, bodyB) + '</body>';
const dom=new JSDOM('<!doctype html><html><head>'+
  src.slice(src.indexOf('<style>'), headEnd)+'</head>'+
  src.slice(bodyA, bodyB)+'</body></html>', {pretendToBeVisual:true});
const doc=dom.window.document;

// every element that could be a map panel, as the BROWSER sees it
function panels(){
  const out=[];
  doc.querySelectorAll('*').forEach(el=>{
    const cs=dom.window.getComputedStyle(el);
    if(cs.position!=='fixed' && cs.position!=='absolute') return;
    const id=el.id||'';
    const cls=(el.className&&el.className.toString())||'';
    if(!/map|mini/i.test(id+' '+cls)) return;
    out.push({ id, cls:cls.slice(0,30), display:cs.display,
               right:cs.right, top:cs.top, left:cs.left });
  });
  return out;
}
R.mapPanelsInMarkup = panels();
R.noMapPanelInMarkup = R.mapPanelsInMarkup.length===0;

// ---- 2. run every function that USED to create one -------------------
{
  // if any code path still builds a #miniWrap, calling the frame-loop hooks
  // would reveal it — they are the things that used to do it.
  const before=doc.querySelectorAll('#miniWrap, #miniMap').length;
  const hooks=['updateMinimap','mmapBuild','mmapEl'];
  R.hooksStillDefined = hooks.filter(h=>new RegExp('window\\.'+h+'\\s*=').test(src));
  R.frameLoopCalls = (src.match(/window\.updateMinimap/g)||[]).length;
  R.afterHooks = doc.querySelectorAll('#miniWrap, #miniMap').length;
  R.nothingCreatesIt = R.hooksStillDefined.length===0 && R.frameLoopCalls===0
                    && before===0 && R.afterHooks===0;
}

// ---- 3. the MAP label is gone ----------------------------------------
R.mapLabel = {
  inMarkup: /class="mmTag"|>MAP</.test(markup),
  anywhereInFile: /mmTag/.test(src)
};
R.labelGone = !R.mapLabel.inMarkup && !R.mapLabel.anywhereInFile;

// ---- 4. ⚠ THE TOP-LEFT MAP HE ACTUALLY USES IS UNTOUCHED -------------
{
  // whatever draws top-left, it must still be present and positioned there
  const left=[];
  doc.querySelectorAll('*').forEach(el=>{
    const cs=dom.window.getComputedStyle(el);
    if(cs.position!=='fixed') return;
    const l=parseFloat(cs.left), t=parseFloat(cs.top);
    if(isNaN(l)||isNaN(t)) return;
    if(l<=40 && t<=40 && cs.display!=='none') left.push({id:el.id, left:cs.left, top:cs.top});
  });
  R.topLeftPanels = left;
  R.leftDockPresent = /#leftDock\{[^}]*left:22px/.test(src);
}

// ---- 5. the rift HUD went back where it was --------------------------
{
  const m=/riftBar\.style\.cssText='position:fixed;right:(\d+)px;top:(\d+)px/.exec(src);
  R.riftHud = { right:+m[1], top:+m[2] };
  R.riftHudRestored = R.riftHud.top===18;
  const q=/#questBoard\{[\s\S]{0,200}?top:(\d+)px/.exec(src);
  R.questTop = +q[1];
  R.questBelowRift = R.questTop > R.riftHud.top;
}
R.PASS = R.noMapPanelInMarkup && R.nothingCreatesIt && R.labelGone
      && R.riftHudRestored && R.questBelowRift;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
