// three NPCs, gated quests, no nameplate, a baked minimap
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');   // ⚠ strip comments first
const R={};

// ---- 1. Adenah is GONE, Veyra is the quest giver ----------------------
R.npcs = {
  townsfolkKeys:[...(/const TOWNSFOLK=\{([\s\S]*?)\n\};/.exec(src)[1]
    .matchAll(/^\s*(\w+)\s*:\{/gm))].map(m=>m[1]),
  adenahStationGone:!/name:'Adenah'/.test(code),
  adenahDispatchGone:!/nearStation\.name==='Adenah'/.test(code),
  veyraOpensQuests:/nearStation\.name==='Veyra'\)\{ winOpen=true; window\.questPanel/.test(code),
  veyraRole:(/title:'Veyra the Pale Keeper',\s*role:'([^']+)'/.exec(src)||[])[1],
  veyraPrompt:/name:'Veyra', prompt:'Contracts'/.test(code)
};
R.threeNpcs = R.npcs.townsfolkKeys.length===3 && R.npcs.adenahStationGone
           && R.npcs.adenahDispatchGone && R.npcs.veyraOpensQuests;

// ---- 2. ⚠ HIS CATCH: accept/claim must REFUSE away from Veyra ---------
{
  const a=src.indexOf('function questAtVeyra(){');
  const b=src.indexOf('function questEl(){');
  function world(mode, riftActive, station){
    const store={};
    const sb={ console, Math,
      WORLD:{mode}, RIFT:{active:riftActive}, nearStation:station,
      localStorage:{getItem:()=>null, setItem:()=>{}},
      document:{ createElement:()=>({classList:{add(){},remove(){},toggle(){}},
        querySelector:()=>({textContent:'',style:{}}), style:{}, dataset:{},
        appendChild(){} }), body:{appendChild(){}} },
      fmt:String, toast:()=>{}, makeCurrency:(id,q)=>({baseId:id,qty:q}),
      put:()=>true, ahErr:()=>{} };
    sb.window=sb; sb.window.RIFT=sb.RIFT; sb.window.nearStation=station;
    vm.createContext(sb);
    // QUESTS/defs live above questAtVeyra; pull them in
    const qa=src.indexOf('const QUEST_DEFS = [');
    // ⚠ the slice stops before questRender, which questAccept calls. Stub it
    // rather than dragging the whole render path (and its DOM) into a test
    // about GATING.
    vm.runInContext(src.slice(qa,a)+src.slice(a,b)+
      '\nfunction questRender(){}\n'+
      '\nthis.A=questAccept; this.T=questTurnIn; this.Q=QUESTS;', sb, {filename:'q.js'});
    return sb;
  }
  const AT={name:'Veyra'};
  R.gate = {
    inRift:        world('RIFT', true,  AT).A(),
    inTownAway:    world('TOWN', false, {name:'Mara'}).A(),
    inTownNoStation:world('TOWN',false, null).A(),
    atVeyra:       world('TOWN', false, AT).A()
  };
  R.acceptGated = R.gate.inRift.why==='away' && R.gate.inTownAway.why==='away'
               && R.gate.inTownNoStation.why==='away' && R.gate.atVeyra.ok===true;
  // and turn-in is gated the same way
  const w=world('TOWN', false, AT);
  w.A(); for(let i=0;i<w.Q.active.goal;i++) w.Q.active.have++;
  const good=w.T();
  const w2=world('RIFT', true, AT);
  R.turnInGated = { atVeyra:good.ok, inRift:w2.T().why==='away' };
}

// ---- 3. the ASHVEIL nameplate is gone, and nothing writes to it -------
R.nameplate = {
  markupGone:!/<div id="nameplate">/.test(src),
  writerGone:!/\$\('#npLvl'\)/.test(code),
  cssHarmless:/#nameplate\{/.test(src)   // orphan CSS is inert
};
R.nameplateRemoved = R.nameplate.markupGone && R.nameplate.writerGone;

// ---- 4. the right-side minimap was REMOVED in v254 --------------------
// Gone entirely — element, canvas, bake, frame tick, and the Rift HUD offset
// that existed only to clear it. t111 proves its absence from the RENDERED DOM
// rather than a source count; counting was the mistake that let it survive
// four rounds of "there is only one map".
R.minimap = { removed: !/miniWrap/.test(code) && !/updateMinimap/.test(code) };
R.minimapSound = R.minimap.removed;
R.layout = { questTop:+(/#questBoard\{[\s\S]{0,200}?top:(\d+)px/.exec(src)||[])[1] };
R.questBelowMap = R.layout.questTop >= 100;

// ---- 5. the trees near the smith are gone -----------------------------
{
  const i=src.indexOf('const DEFAULT_TOWN_LAYOUT=');
  const blob=src.slice(i+'const DEFAULT_TOWN_LAYOUT='.length);
  let depth=0,end=0;
  for(let k=0;k<blob.length;k++){ const c=blob[k];
    if(c==='{')depth++; else if(c==='}'){depth--; if(!depth){end=k+1;break;}} }
  const d=JSON.parse(blob.slice(0,end));
  const smith=d.placed.find(x=>x.prefab==='bld_smith');
  const near=d.placed.filter(x=>x.prefab.startsWith('tree_') &&
    Math.hypot(x.p[0]-smith.p[0], x.p[2]-smith.p[2])<6.5);
  R.trees={ total:d.placed.length,
            treesLeft:d.placed.filter(x=>x.prefab.startsWith('tree_')).length,
            withinSmith:near.length,
            edKeyBumped:/ashenHollowEdits_v42_layout_20260820_smithclear/.test(src) };
  R.smithClear = near.length===0 && R.trees.edKeyBumped;
}
console.log(JSON.stringify(R,null,1));
