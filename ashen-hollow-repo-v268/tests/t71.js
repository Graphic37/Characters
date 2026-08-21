// the stash must not be SMALLER alone than it is beside skills
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('function dockFit(dockId, ids, vh, hudReserve){');
const b=src.indexOf("/* A panel's content is not laid out in the same tick");
const ra=src.indexOf('function relayout(){');
const rb=src.indexOf("st.setProperty('--uiR',");

// pull the clamp decision out of relayout as a standalone function
function scaleFor(open, vh, panelHeight){
  const dom=new JSDOM('<body><div id="leftDock" style="top:22px"></div>'+
    ['charPanel','skillPanel','stashPanel'].map(id=>
      '<div id="'+id+'"><div class="crown"></div><div class="pbody"></div></div>').join('')+
    '</body>');
  const doc=dom.window.document;
  open.forEach(id=>doc.getElementById(id).classList.add('open'));
  if(open.includes('skillPanel')&&open.includes('stashPanel'))
    doc.body.classList.add('pairOpen');
  // stub the measurements dockFit reads
  const sb={ console, document:doc,
    getComputedStyle:(el)=> el.id==='leftDock'
      ? {top:'22px'}
      : {borderTopWidth:'2px', borderBottomWidth:'2px'},
    clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),
    innerWidth:1600, innerHeight:vh };
  sb.window=sb;
  ['charPanel','skillPanel','stashPanel'].forEach(id=>{
    const p=doc.getElementById(id);
    Object.defineProperty(p.querySelector('.crown'),'offsetHeight',{get:()=>40});
    Object.defineProperty(p.querySelector('.pbody'),'offsetHeight',
      {get:()=>(id==='stashPanel'?panelHeight:panelHeight)});
  });
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.F=function(vh,res){ return dockFit("leftDock",["charPanel","skillPanel","stashPanel"],vh,res); };',
    sb, {filename:'d.js'});
  let fitL=sb.F(vh, 152);
  // the two clamps, exactly as relayout applies them
  if(doc.body.classList.contains('pairOpen')) fitL=Math.max(1, Math.min(fitL,1.25));
  else if(doc.getElementById('stashPanel') &&
          doc.getElementById('stashPanel').classList.contains('open'))
    fitL=Math.max(1, Math.min(fitL,1.25));
  return +Math.max(0.30, Math.min(1.42, Math.min(1600/1520, fitL))).toFixed(3);
}

// a SHORT window where dockFit would otherwise shrink below 1
const VH=700, TALL=620;
R.shortWindow = {
  stashAlone: scaleFor(['stashPanel'], VH, TALL),
  pairOpen:   scaleFor(['skillPanel','stashPanel'], VH, TALL),
  skillsOnly: scaleFor(['skillPanel'], VH, TALL),
  charOnly:   scaleFor(['charPanel'], VH, TALL)
};
R.stashNoLongerSmaller = R.shortWindow.stashAlone >= R.shortWindow.pairOpen;
R.stashAtLeastFull = R.shortWindow.stashAlone >= 1;

// ⚠ the character sheet is SHORT and must still be free to scale up
R.charStillFree = R.shortWindow.charOnly !== R.shortWindow.stashAlone
               || R.shortWindow.charOnly >= 1;

// a TALL window: nothing should be clamped down artificially
const R2=(id)=>scaleFor(id, 1400, 620);
R.tallWindow = { stashAlone:R2(['stashPanel']), pair:R2(['skillPanel','stashPanel']) };
R.tallUnaffectedByFloor = R.tallWindow.stashAlone >= 1;
console.log(JSON.stringify(R,null,1));
