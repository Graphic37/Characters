// the support model: tier direction, unlocks, drops, migration
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const SUPPORT_TIERS = 5;');
const b=src.indexOf('setTimeout(function(){\n  const r=migrateSupports();');
const code=src.slice(a,b);

function fresh(){
  const CONT={inv:{items:[]},st2:{items:[]},st3:{items:[]}};
  const RANGER_GEMS={};
  const sb={console, CONT, RANGER_GEMS, Math,
    removeItem:(c,it)=>{const i=c.items.indexOf(it); if(i>=0)c.items.splice(i,1);},
    gemFor:(id)=>RANGER_GEMS[id]||(RANGER_GEMS[id]={skillId:id,level:1,sockets:[null,null,null]})};
  sb.window=sb; sb.window.RANGER_GEMS=RANGER_GEMS;
  vm.createContext(sb);
  vm.runInContext(code+'\nthis.M={SUPPORT_DEFS,SUPPORT_UNLOCKS,unlockSupport,supportTier,supportMore,socketSupport,migrateSupports,supportTierForArea,supportSlots};', sb, {filename:'s.js'});
  return {sb, M:sb.M, CONT, RANGER_GEMS};
}

// ---- 1. TIER DIRECTION: lower is stronger, and never downgrades ---------
{
  const {M}=fresh();
  const seq=[];
  seq.push(M.unlockSupport('s_chain',5));   // new
  seq.push(M.unlockSupport('s_chain',3));   // upgrade
  seq.push(M.unlockSupport('s_chain',4));   // weaker -> duplicate
  seq.push(M.unlockSupport('s_chain',3));   // equal   -> duplicate
  seq.push(M.unlockSupport('s_chain',1));   // upgrade to max
  R.forkStory = seq.map(s=>s.result+(s.from!==null&&s.from!==undefined?'('+s.from+'->'+s.tier+')':'('+s.tier+')'));
  R.forkFinal = M.supportTier('s_chain');
  R.neverDowngraded = R.forkFinal===1;
  R.strongerIsLower = M.supportMore('s_chain')===M.SUPPORT_DEFS.s_chain.more[1];
  R.unknownIdSafe = M.unlockSupport('s_nope',3).result;
  R.lockedIsNull = M.supportTier('s_brut')===null && M.supportMore('s_brut')===1;
}

// ---- 2. one unlock serves many skills, and upgrades reach them all ------
{
  const {M, RANGER_GEMS}=fresh();
  M.unlockSupport('s_chain',4);
  RANGER_GEMS.multishot={sockets:['s_chain',null,null]};
  RANGER_GEMS.rapid    ={sockets:['s_chain','s_brut',null]};
  const before=M.socketSupport('s_chain').more;
  M.unlockSupport('s_chain',1);
  const after=M.socketSupport('s_chain').more;
  R.sharedUnlock={ before:+before.toFixed(3), after:+after.toFixed(3),
    upgradeReachesEverySkillWithoutResocketing: after>before,
    socketsUnchanged: RANGER_GEMS.multishot.sockets[0]==='s_chain' };
}

// ---- 3. area level gates the tiers -------------------------------------
{
  const {M}=fresh();
  const sample=(area)=>{ const c={}; for(let i=0;i<4000;i++){const t=M.supportTierForArea(area); c[t]=(c[t]||0)+1;} 
    return Object.keys(c).sort().map(k=>'T'+k+':'+Math.round(c[k]/40)+'%').join(' '); };
  R.tierByArea={ area1:sample(1), area20:sample(20), area40:sample(40), area60:sample(60), area90:sample(90) };
  R.lowRiftsNeverDropT1 = !/T1/.test(sample(1)) && !/T1/.test(sample(20)) && !/T1/.test(sample(40));
}

// ---- 4. the compatibility seam reads BOTH shapes ------------------------
{
  const {M}=fresh();
  M.unlockSupport('s_tempo',2);
  const byId=M.socketSupport('s_tempo');
  const byObj=M.socketSupport({baseId:'s_tempo', more:1.18, name:'Swift Cadence'});
  R.seam={ idWorks:!!byId, objWorks:!!byObj,
           bothGiveCurrentTier: byId.more===byObj.more,
           tierFromAccountNotObject: byObj.more===M.SUPPORT_DEFS.s_tempo.more[2],
           speedTagged: byId.kindOf==='speed' };
  R.nullSafe = M.socketSupport(null)===null && M.socketSupport('s_nope')===null;
}

// ---- 5. migration: idempotent, preserves assignment, retires items ------
{
  const {M, CONT, RANGER_GEMS, sb}=fresh();
  CONT.inv.items.push({kind:'support',baseId:'s_cruel',level:14},
                      {kind:'gear',baseId:'b_helm'},
                      {kind:'support',baseId:'s_chain',level:9});
  CONT.st2.items.push({kind:'support',baseId:'s_cruel',level:17});
  RANGER_GEMS.multishot={sockets:[{kind:'support',baseId:'s_brut',level:12},null,null]};
  const r1=M.migrateSupports();
  const r2=M.migrateSupports();            // must be a no-op
  R.migration={ first:r1, secondIsNull:r2===null,
    gearUntouched: CONT.inv.items.length===1 && CONT.inv.items[0].kind==='gear',
    supportsGone: CONT.inv.items.concat(CONT.st2.items).filter(i=>i.kind==='support').length===0,
    socketNowId: RANGER_GEMS.multishot.sockets[0]==='s_brut',
    assignmentPreserved: RANGER_GEMS.multishot.sockets[0]==='s_brut',
    allAtT5: Object.values(M.SUPPORT_UNLOCKS).every(t=>t===5),
    slotsDefaulted: RANGER_GEMS.multishot.supportSlots===1 };
}

// ---- 6. slots default to 1 and cap at 3 --------------------------------
{
  const {M, RANGER_GEMS}=fresh();
  R.slots={ fresh:M.supportSlots('rapid') };
  RANGER_GEMS.rapid.supportSlots=9;  R.slots.capped=M.supportSlots('rapid');
  RANGER_GEMS.rapid.supportSlots=0;  R.slots.floored=M.supportSlots('rapid');
}
console.log(JSON.stringify(R,null,1));
