// marking moved to SPACE; right-click belongs to equipping again
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. right-click no longer marks ----------------------------------
{
  const ctx=code.slice(code.indexOf("addEventListener('contextmenu'"));
  R.rightClick = {
    stillMarks:/closest\('\.item\[data-uid\]'\)[\s\S]{0,300}sellToggle/.test(code),
    equipPathIntact:/Right-click to equip/.test(code)
  };
  R.rightClickFreed = !R.rightClick.stillMarks && R.rightClick.equipPathIntact;
}
// ---- 2. SPACE marks the hovered item ---------------------------------
{
  const a=code.indexOf("addEventListener('keydown', e=>{\n  if(e.code!=='Space'");
  const b=code.indexOf('});', a)+3;
  const slice=code.slice(a,b);
  function press(opts){
    const marked=[];
    const o=Object.assign({ tag:'DIV', edOn:false, tipShown:true, uid:'7',
      ctrl:false, editable:false }, opts||{});
    let prevented=false;
    const sb={ console,
      TIP:{ style:{display:o.tipShown?'flex':'none'}, dataset:{item:o.uid} },
      ITEM_BY_UID:{ '7':{uid:7, kind:'gear'} },
      ED:{on:o.edOn},
      sellToggle:(it)=>marked.push(it.uid),
      addEventListener:(n,fn)=>{ sb.__fn=fn; } };
    sb.window=sb;
    Object.assign(sb.window,{TIP:sb.TIP, ITEM_BY_UID:sb.ITEM_BY_UID, ED:sb.ED});
    vm.createContext(sb);
    vm.runInContext(slice, sb, {filename:'k.js'});
    sb.__fn({ code:'Space', key:' ',
      target:{ tagName:o.tag, isContentEditable:o.editable },
      ctrlKey:o.ctrl, metaKey:false, altKey:false,
      preventDefault:()=>{prevented=true;}, stopPropagation:()=>{} });
    return { marked, prevented };
  }
  R.space = {
    hoveringItem:   press({}),
    noTooltip:      press({tipShown:false}),
    inTextField:    press({tag:'INPUT'}),
    onAButton:      press({tag:'BUTTON'}),
    contentEditable:press({editable:true}),
    editorOpen:     press({edOn:true}),
    withCtrl:       press({ctrl:true})
  };
  R.marksWhenHovering = R.space.hoveringItem.marked.length===1;
  R.ignoredOtherwise = ['noTooltip','inTextField','onAButton','contentEditable',
    'editorOpen','withCtrl'].every(k=>R.space[k].marked.length===0);
  // ⚠ and it must swallow the key so the page does not scroll
  R.preventsScroll = R.space.hoveringItem.prevented===true;
  R.doesNotSwallowOtherwise = R.space.inTextField.prevented===false
                           && R.space.editorOpen.prevented===false;
}
// ---- 3. the key is advertised, on gear only --------------------------
R.hint = {
  gearSaysSpace:/if\(it\.kind==='gear'\) return 'Right-click to equip \\u00b7 Space to mark for sale\.'/.test(code)
    || /Space to mark for sale/.test(code),
  flaskDoesNot:/if\(it\.kind==='flask'\|\|it\.kind==='charm'\) return 'Right-click to equip\.'/.test(code)
};
R.advertisedCorrectly = R.hint.gearSaysSpace && R.hint.flaskDoesNot;

// ---- 4. the rest of the sell flow is untouched -----------------------
R.flow = {
  sKeySells:/if\(e\.key!=='s' && e\.key!=='S'\) return;/.test(code),
  confirmExists:/function sellConfirm\(\)/.test(code),
  onlyGearMarkable:/function sellMarkable\(it\)/.test(code)
};
R.flowIntact = Object.values(R.flow).every(Boolean);
console.log(JSON.stringify(R,null,1));
