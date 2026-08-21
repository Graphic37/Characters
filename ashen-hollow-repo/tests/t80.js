// E must reach every NPC that has a panel
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the swallow-E guard names no NPCs any more --------------------
R.guard = {
  namesNoNpcs: !/nearStation\.name==='Garrick' \|\| nearStation\.name==='Mara'/.test(code),
  onlyNoE: /if\(nearStation && nearStation\.noE\) return;/.test(code)
};
R.guardFixed = R.guard.namesNoNpcs && R.guard.onlyNoE;

// ---- 2. run the REAL dispatcher for every station ---------------------
{
  const a=src.indexOf('function tryInteract(){');
  const b=src.indexOf('document.getElementById(\'winTitle\').textContent=nearStation.title;');
  function press(station){
    const calls=[];
    const sb={ console,
      WORLD:{mode:'TOWN'}, RIFT:{active:false}, winOpen:false,
      nearStation:station,
      exitToTown:()=>calls.push('exitToTown'),
      toastRift:()=>calls.push('toastRift'),
      closeWin:()=>calls.push('closeWin'),
      openRiftPanel:()=>calls.push('riftPanel'),
      questPanel:()=>calls.push('questPanel'),
      vendorPanel:()=>calls.push('vendorPanel'),
      garrickPanel:(t)=>calls.push('garrickPanel:'+t),
      AH:{ onStation:(n)=>{ calls.push('AH.onStation:'+n); return n==='Stash'; } },
      ahErr:()=>{} };
    sb.window=sb;
    Object.assign(sb.window,{openRiftPanel:sb.openRiftPanel, questPanel:sb.questPanel,
      vendorPanel:sb.vendorPanel, garrickPanel:sb.garrickPanel});
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\n}\nthis.T=tryInteract;', sb, {filename:'i.js'});
    try{ sb.T(); }catch(e){ calls.push('THREW'); }
    return calls;
  }
  const st=(n,extra)=>Object.assign({name:n, title:'t', body:'b', acts:[]}, extra||{});
  R.press = {
    Garrick: press(st('Garrick')),
    Mara:    press(st('Mara')),
    Veyra:   press(st('Veyra')),
    Stash:   press(st('Stash')),
    Travel:  press(st('Travel')),
    retired: press(st('OldNpc', {noE:true}))
  };
  R.everyPanelReachable =
       R.press.Garrick.some(c=>c.startsWith('garrickPanel'))
    && R.press.Mara.includes('vendorPanel')
    && R.press.Veyra.includes('questPanel')
    && R.press.Stash.some(c=>c.startsWith('AH.onStation'))
    && R.press.Travel.includes('riftPanel');
  R.noEStillSwallowed = R.press.retired.length===0;
}

// ---- 3. Garrick's panel really contains the slot shop -----------------
{
  const m=/\[\['salvage','SALVAGE'\],\['craft','CRAFT'\],\['repair','REPAIR'\],\['slots','SUPPORT SLOTS'\]\]/.exec(code);
  R.tabs = { hasSlotsTab: !!m,
             opensOn:(/garrickPanel\('(\w+)'\); return; \}/.exec(code)||[])[1],
             slotsBodyExists:/function garSlotsBody\(\)/.test(code),
             buyWired:/data-buyslot/.test(code) };
  R.slotShopReachable = R.tabs.hasSlotsTab && R.tabs.slotsBodyExists && R.tabs.buyWired;
}
console.log(JSON.stringify(R,null,1));
