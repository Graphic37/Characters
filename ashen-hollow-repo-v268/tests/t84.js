// ⚠ TOWN INTERACTION AUDIT — every interactable, one pass.
// Garrick and Veyra both being unreachable pointed at the SHARED path, so this
// tests the shared path once and every station against it.
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// every station as the game registers it
const STATIONS=[...src.matchAll(/stations\.push\(\{([\s\S]{0,460}?)\}\);/g)].map(m=>{
  const b=m[1].replace(/\s+/g,' ');
  const g=(re)=>{ const x=re.exec(b); return x?x[1]:null; };
  return { name:g(/name:'(\w+)'/), prompt:g(/prompt:'([^']*)'/),
           key2:g(/key2:'(\w+)'/), prompt2:g(/prompt2:'([^']*)'/),
           noE:/noE:\s*true/.test(b), noPrompt:/noPrompt:\s*true/.test(b) };
}).filter(x=>x.name);
R.stations=STATIONS.map(s=>s.name);

// ---- STEP 1: the picker must CONSIDER every station that has a prompt ---
{
  const a=src.indexOf('let best=null, bestD=1e9;');
  const b=src.indexOf('  nearStation=best;');
  const loop=src.slice(a,b);
  R.picker = { skipsByFlagOnly: /if\(s\.noPrompt\) continue;/.test(loop),
               namesNoNpc: !/s\.name===/.test(loop) };
  function pick(list, at){
    const sb={ console, Math, stations:list, player:{position:{x:at[0],z:at[1]}} };
    sb.window=sb; vm.createContext(sb);
    vm.runInContext(loop+'\nthis.B=best;', sb, {filename:'p.js'});
    return sb.B && sb.B.name;
  }
  R.eachReachable={};
  STATIONS.forEach((st,i)=>{
    // place every station far apart, stand on this one
    const list=STATIONS.map((x,j)=>({ ...x, pos:{x:j*100, z:0}, r:3.8 }));
    R.eachReachable[st.name]= pick(list,[i*100+1,0]) === st.name;
  });
  R.everyStationSelectable = Object.values(R.eachReachable).every(Boolean);
}

// ---- STEP 2: nearStation is PUBLISHED, or gates outside cannot read it --
R.publish = {
  assignedOnTown: /nearStation=best;\s*\n[\s\S]{0,420}?window\.nearStation=best;/.test(src),
  assignedOnRift: /nearStation=near; window\.nearStation=near;/.test(src),
  clearedWhenNone: /nearStation=null; window\.nearStation=null;/.test(src)
};
R.published = Object.values(R.publish).every(Boolean);

// ---- STEP 3: the quest gate can now actually PASS ----------------------
{
  const qa=src.indexOf('const QUEST_DEFS = [');
  const a=src.indexOf('function questAtVeyra(){');
  const b=src.indexOf('function questEl(){');
  function world(station, mode, rift){
    const store={};
    const sb={ console, Math, WORLD:{mode}, RIFT:{active:rift},
      nearStation:station,
      localStorage:{getItem:()=>null,setItem:()=>{}},
      document:{createElement:()=>({classList:{add(){},remove(){},toggle(){}},
        querySelector:()=>({textContent:'',style:{}}),style:{},dataset:{},appendChild(){}}),
        body:{appendChild(){}}},
      fmt:String, toast:()=>{}, makeCurrency:(id,q)=>({baseId:id,qty:q}),
      put:()=>true, ahErr:()=>{} };
    sb.window=sb; sb.window.RIFT=sb.RIFT; sb.window.nearStation=station;
    vm.createContext(sb);
    vm.runInContext(src.slice(qa,a)+src.slice(a,b)+'\nfunction questRender(){}\n'+
      'this.A=questAccept; this.T=questTurnIn; this.G=questAtVeyra; this.Q=QUESTS;',
      sb, {filename:'q.js'});
    return sb;
  }
  const V={name:'Veyra'};
  R.gate = {
    atVeyra:  world(V,'TOWN',false).G(),
    atGarrick:world({name:'Garrick'},'TOWN',false).G(),
    inRift:   world(V,'RIFT',true).G(),
    nowhere:  world(null,'TOWN',false).G()
  };
  R.gateCorrect = R.gate.atVeyra===true && R.gate.atGarrick===false
               && R.gate.inRift===false && R.gate.nowhere===false;

  // full quest lifecycle THROUGH the gate
  const w=world(V,'TOWN',false);
  const acc=w.A();
  const goal=w.Q.active && w.Q.active.goal;
  for(let i=0;i<goal;i++) w.Q.active.have++;
  const paid=w.T();
  const next=w.A();
  R.lifecycle={ accepted:acc.ok, goal, paid:paid.ok, coin:paid.coin,
                nextAvailable:next.ok, done:w.Q.done };
  R.lifecycleWorks = acc.ok && paid.ok && paid.coin>0 && next.ok;
}

// ---- STEP 4: E dispatches for every station that should have a panel ---
{
  const a=src.indexOf('function tryInteract(){');
  const b=src.indexOf("document.getElementById('winTitle').textContent=nearStation.title;");
  function press(name){
    const calls=[];
    const sb={ console, WORLD:{mode:'TOWN'}, RIFT:{active:false}, winOpen:false,
      nearStation:{name, title:'t', body:'b', acts:[]},
      openRiftPanel:()=>calls.push('rift'), questPanel:()=>calls.push('quest'),
      vendorPanel:()=>calls.push('vendor'), garrickPanel:(t)=>calls.push('garrick:'+t),
      exitToTown:()=>calls.push('exit'), closeWin:()=>calls.push('close'),
      AH:{onStation:(n)=>{ calls.push('AH:'+n); return n==='Stash'; }},
      ahErr:()=>{} };
    sb.window=sb;
    Object.assign(sb.window,{openRiftPanel:sb.openRiftPanel,questPanel:sb.questPanel,
      vendorPanel:sb.vendorPanel,garrickPanel:sb.garrickPanel});
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\n}\nthis.T=tryInteract;', sb, {filename:'i.js'});
    sb.T();
    return calls;
  }
  R.dispatch={};
  STATIONS.forEach(s=>{ R.dispatch[s.name]=press(s.name); });
  R.everyStationDispatches = STATIONS.every(s=>R.dispatch[s.name].length>0);
}

// ---- STEP 5: prompts are consistent -----------------------------------
R.prompts = Object.fromEntries(STATIONS.map(s=>[s.name, s.prompt]));
console.log(JSON.stringify(R,null,1));
