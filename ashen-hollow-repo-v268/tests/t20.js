// a keypress or a world click must not stop the hero inside a Rift
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

// the REAL listeners, verbatim
const a=src.indexOf('function manualControlAvailable(){');
const b=src.indexOf("const autoTag=document.createElement('div');");
const code=src.slice(a,b);

function run(inRift, manualMove){
  const listeners={keydown:[], pointerdown:[]};
  let t=100;
  const sb={ console,
    performance:{now:()=>t*1000},
    AUTO:{on:true, suspendUntil:0},
    AUTO_CFG:{manualSuspend:2.5},
    RIFT:{active:inRift},
    MANUAL_MOVE:manualMove,
    addEventListener:(k,fn)=>listeners[k]&&listeners[k].push(fn),
    renderer:{domElement:{addEventListener:(k,fn)=>listeners[k]&&listeners[k].push(fn)}},
    document:{createElement:()=>({style:{}, classList:{add(){}}})},
    setAuto:()=>{}, autoHud:()=>{},
  };
  sb.window=sb; sb.window.MANUAL_MOVE=manualMove; sb.window.RIFT=sb.RIFT;
  vm.createContext(sb);
  vm.runInContext(code, sb, {filename:'susp.js'});
  const press=(key)=>listeners.keydown.forEach(f=>f({key}));
  const click=()=>listeners.pointerdown.forEach(f=>f({button:0}));
  const suspended=()=> sb.AUTO.suspendUntil > t;
  const out={};
  press('a'); out.afterKeyA = suspended(); sb.AUTO.suspendUntil=0;
  press('w'); out.afterKeyW = suspended(); sb.AUTO.suspendUntil=0;
  press('k'); out.afterKeyK = suspended(); sb.AUTO.suspendUntil=0;
  click();    out.afterWorldClick = suspended(); sb.AUTO.suspendUntil=0;
  return out;
}
const R={
  inRift_idleOnly: run(true,false),      // his case
  inRift_manualOn: run(true,true),       // MANUAL_MOVE override still works
  inTown:          run(false,false),     // town takeover must still work
};
// and the control: the pre-v165 behaviour, for comparison
const old=src.slice(a,b)
  .replace('if(!manualControlAvailable()) return;\n  if(\'wasd\'','if(\'wasd\'')
  .replace('if(!manualControlAvailable()) return;\n  if(e.button===0','if(e.button===0');
{
  const listeners={keydown:[], pointerdown:[]};
  let t=100;
  const sb={ console, performance:{now:()=>t*1000},
    AUTO:{on:true, suspendUntil:0}, AUTO_CFG:{manualSuspend:2.5},
    RIFT:{active:true}, MANUAL_MOVE:false,
    addEventListener:(k,fn)=>listeners[k]&&listeners[k].push(fn),
    renderer:{domElement:{addEventListener:(k,fn)=>listeners[k]&&listeners[k].push(fn)}},
    document:{createElement:()=>({style:{}, classList:{add(){}}})} };
  sb.window=sb; vm.createContext(sb); vm.runInContext(old, sb, {filename:'old.js'});
  listeners.keydown.forEach(f=>f({key:'a'}));
  R.CONTROL_prev_inRift_afterKeyA = { suspendUntil:sb.AUTO.suspendUntil,
    frozenForSeconds: +(sb.AUTO.suspendUntil-t).toFixed(2) };
}
R.entryClears = /AUTO\.suspendUntil=0;\s*\/\* never carry a town takeover/.test(src);
console.log(JSON.stringify(R,null,1));
