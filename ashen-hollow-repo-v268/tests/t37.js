// Phase 3: gold buys slots, per skill, permanently
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const SUPPORT_SLOT_COST = {');
const b=src.indexOf('window.buySupportSlot = buySupportSlot;');
const code=src.slice(a,b)+'\nwindow.buySupportSlot=buySupportSlot;';

function world(gold){
  const RANGER_GEMS={};
  const sb={ console, S:{gold},
    gemFor:(id)=>RANGER_GEMS[id]||(RANGER_GEMS[id]={skillId:id,sockets:[null,null,null]}),
    markStatsDirty:()=>{}, refreshAll:()=>{}, updateSkillsPanel:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.M={buySupportSlot,nextSlotCost,supportSlots,SUPPORT_SLOT_COST};', sb, {filename:'g.js'});
  return {sb, M:sb.M, G:RANGER_GEMS};
}
// 1. every skill starts at 1/3
{
  const w=world(0);
  R.startsAtOne = w.M.supportSlots('multishot');
  R.firstCost = w.M.nextSlotCost('multishot');
}
// 2. costs are by SLOT NUMBER, identical across skills
{
  const w=world(999999999);
  const a1=w.M.nextSlotCost('multishot'), b1=w.M.nextSlotCost('rapid');
  w.M.buySupportSlot('multishot');
  const a2=w.M.nextSlotCost('multishot'), b2=w.M.nextSlotCost('rapid');
  R.costsBySlotNotSkill = { slot2_multishot:a1, slot2_rapid:b1, sameSlot2:a1===b1,
    slot3_multishot:a2, stillSlot2_rapid:b2, slot3MuchMore: a2 > a1*3 };
}
// 3. NOT global: buying for one leaves the other alone
{
  const w=world(999999999);
  w.M.buySupportSlot('multishot');
  R.notGlobal = { multishot:w.M.supportSlots('multishot'), rapid:w.M.supportSlots('rapid') };
}
// 4. refuses cleanly when short, and takes NO gold
{
  const w=world(100);
  const r=w.M.buySupportSlot('multishot');
  R.poor = { ...r, goldAfter:w.sb.S.gold, slotsAfter:w.M.supportSlots('multishot') };
}
// 5. maxes out at 3 and then refuses
{
  const w=world(999999999);
  const r1=w.M.buySupportSlot('multishot');
  const r2=w.M.buySupportSlot('multishot');
  const r3=w.M.buySupportSlot('multishot');
  // ⚠ the cap is FIVE now (v218), so three purchases no longer max it out.
  // Buy the rest and assert the real ceiling instead of the old one.
  const r4=w.M.buySupportSlot('multishot');
  const r5=w.M.buySupportSlot('multishot');
  const refused=w.M.buySupportSlot('multishot');
  R.maxing = { after1:r1.have, after2:r2.have, after4:r4.have, after5:r5.have,
               refusedAtCap:refused, cost1:r1.cost, cost5:r5.cost,
               nextWhenMaxed:w.M.nextSlotCost('multishot') };
  R.capIsFive = r5.have===5 && refused.why==='maxed'
             && w.M.nextSlotCost('multishot')===null;
}
// 6. gold is actually deducted, exactly once, for the right amount
{
  const w=world(200000);
  const before=w.sb.S.gold;
  const r=w.M.buySupportSlot('multishot');
  R.spend = { before, after:w.sb.S.gold, cost:r.cost, exact: before-w.sb.S.gold===r.cost };
}
// ---------- the panel renders and never buries a price ------------------
// ---- the PANEL half retired in v228 -------------------------------------
// garSlotsBody is master/detail now; the flat `.slrow` ladder this asserted
// is gone, and t85 covers the replacement in full. The MODEL tests above
// (costs, caps, per-skill isolation, clean refusal) are what this suite is
// actually for, and they still run.
R.panelRedesigned = /class="gsWrap"/.test(src);

R.costsInConfig = /const SUPPORT_SLOT_COST = \{ 2: \d+, 3: \d+ \};/.test(src);
R.noGemConsumption = !/makeSupport|kind==='support'.*consume/.test(src.slice(a,b));
console.log(JSON.stringify(R,null,1));
