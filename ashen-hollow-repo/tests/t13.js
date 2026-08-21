const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');

// the REAL togglePanel, verbatim
const a=src.indexOf('function togglePanel(id,force){');
const b=src.indexOf('function refreshMenu(){');
const code=src.slice(a,b);

let WIDE=true;
function build(){
  const dom=new JSDOM('<body><div id="leftDock"></div><div id="rightDock"></div>'+
    ['invPanel','charPanel','skillPanel','stashPanel']
      .map(id=>'<div id="'+id+'"></div>').join('')+'</body>');
  const doc=dom.window.document;
  const calls={drawSkills:0, drawStash:0, drawInv:0, drawChar:0, refreshStashTabs:0};
  const sb={
    console, document:doc,
    $:(s)=>doc.querySelector(s),
    scheduleFit:()=>{}, refreshMenu:()=>{},
    drawSkills:()=>calls.drawSkills++, drawStash:()=>calls.drawStash++,
    drawInv:()=>calls.drawInv++, drawChar:()=>calls.drawChar++,
    refreshStashTabs:()=>calls.refreshStashTabs++,
    stashTab:'st0', setTimeout:(fn)=>fn(),      // run the pairOpen work inline
    fitsAlongside:()=>WIDE,
  };
  sb.window=sb; sb.window.refreshStashTabs=sb.refreshStashTabs; sb.window.relayout=null;
  sb.window.fitsAlongside=sb.fitsAlongside;
  vm.createContext(sb);
  vm.runInContext(code+'\nthis.T=togglePanel;', sb, {filename:'toggle.js'});
  const state=()=>({
    skills:doc.getElementById('skillPanel').classList.contains('open'),
    stash:doc.getElementById('stashPanel').classList.contains('open'),
    inv:doc.getElementById('invPanel').classList.contains('open'),
    char:doc.getElementById('charPanel').classList.contains('open'),
    pair:doc.body.classList.contains('pairOpen'),
  });
  return {T:sb.T, state, doc, sb, calls};
}

const R={};

// ---------- 1. THE REPORTED SEQUENCE: press K, press K --------------------
{
  const {T,state}=build();
  T('skillPanel');           R.pressOnce = state();
  T('skillPanel');           R.pressTwice = state();
  R.backToWorld = !R.pressTwice.skills && !R.pressTwice.stash && !R.pressTwice.pair;
}
// ---------- 2. three presses = open again, unchanged ----------------------
{
  const {T,state}=build();
  T('skillPanel'); T('skillPanel'); T('skillPanel');
  R.pressThrice = state();
}
// ---------- 3. HIS REPORTED CASE: skills, then stash -> everything goes ---
{
  const {T,state}=build();
  T('skillPanel');           const pair=state();
  T('stashPanel');           const after=state();
  R.skillsThenStash = { pairOpened:pair.skills&&pair.stash,
                        skillsGone:!after.skills, stashGone:!after.stash,
                        pairFlagCleared:!after.pair,
                        nothingLeft: !after.skills && !after.stash };
}
// ---------- 4. the stash ALONE is untouched by the pair rule --------------
{
  const {T,state}=build();
  T('stashPanel');           const alone=state();
  T('stashPanel');           const closed=state();
  R.stashAlone = { opens:alone.stash, skillsUntouched:!alone.skills,
                   closes:!closed.stash };
}
// ---------- 4b. stash first, THEN skills -> still closes as a unit --------
{
  const {T,state}=build();
  T('stashPanel'); T('skillPanel');
  const both=state();
  T('stashPanel');
  R.stashFirstThenPair = { both:both.skills&&both.stash, after:state() };
}
// ---------- 4c. no infinite recursion -------------------------------------
{
  const {T,state}=build();
  T('skillPanel');
  let threw=null;
  try{ T('skillPanel'); }catch(e){ threw=e.message; }
  R.noRecursion = { threw, final:state() };
}
// ---------- 5. the bag is still mutually exclusive with the pair ----------
{
  const {T,state}=build();
  T('invPanel');  T('skillPanel');
  R.bagVsPair = state();
}
// ---------- 6. char panel still replaces the pair -------------------------
{
  const {T,state}=build();
  T('skillPanel'); T('charPanel');
  R.charReplacesPair = state();
}
// ---------- 7. THE BAG MAY NOW STAY OPEN BESIDE THE PAIR -----------------
{
  WIDE=true;
  const {T,state}=build();
  T('invPanel'); T('skillPanel');
  R.bagWithPair_wide = state();
}
// ---------- 8. ...but steps aside on a window too narrow for both --------
{
  WIDE=false;
  const {T,state}=build();
  T('invPanel'); T('skillPanel');
  R.bagWithPair_narrow = state();
  WIDE=true;
}
// ---------- 9. opening the bag never closes skills any more --------------
{
  WIDE=true;
  const {T,state}=build();
  T('skillPanel'); T('invPanel');
  R.pairThenBag = state();
}
console.log(JSON.stringify(R,null,1));
