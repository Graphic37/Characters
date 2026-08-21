src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('quests',
"""/* ---- the state machine -------------------------------------------------- */
function autoTick(dt){""",
"""/* ===========================================================================
   QUESTS  (v219)
   ---------------------------------------------------------------------------
   One board, top-left, and Adenah — the third NPC — hands them out and takes
   them back. His rule, and it is the interesting one: **turning in requires the
   player**. Auto fights the dungeon; a quest is the thing it cannot do for you,
   so the loop is "Auto earns it, you go collect it".

   ⚠ VAULTED COIN IS THE REWARD BECAUSE IT IS CURRENTLY UNREACHABLE. The item
   exists (`cu_vault`, "Accepted by every merchant in the Pale") with art and a
   stack cap — but it is in no drop table and no vendor sells it. Making quests
   its ONLY source gives the currency a reason to exist and the quest a reward
   that is not just more gold.

   Progress is counted from the kill hook, not polled: a quest that samples
   state every frame drifts, and one that counts events cannot.
   ========================================================================= */
const QUEST_DEFS = [
  { id:'q_cull',    n:'Culling',        verb:'Kill', unit:'enemies', goal:120,  coin:1 },
  { id:'q_purge',   n:'Purge the Deep', verb:'Kill', unit:'enemies', goal:400,  coin:3 },
  { id:'q_harvest', n:'Grim Harvest',   verb:'Kill', unit:'enemies', goal:1000, coin:8 }
];
window.QUEST_DEFS = QUEST_DEFS;

const QUESTS = { active:null, done:0, el:null, lastN:-1 };
window.QUESTS = QUESTS;

function questSave(){
  try{ localStorage.setItem('ashenQuest_v1',
    JSON.stringify({ active:QUESTS.active, done:QUESTS.done })); }
  catch(e){ window.ahErr&&window.ahErr(e,'questSave'); }
}
function questLoad(){
  try{
    const d=JSON.parse(localStorage.getItem('ashenQuest_v1')||'null');
    if(d){ QUESTS.active=d.active||null; QUESTS.done=d.done||0; }
  }catch(e){ window.ahErr&&window.ahErr(e,'questLoad'); }
}

/* the next quest in the ladder, or the last one repeated forever */
function questNextDef(){
  const i=Math.min(QUESTS.done, QUEST_DEFS.length-1);
  return QUEST_DEFS[i];
}
function questAccept(){
  if(QUESTS.active) return { ok:false, why:'busy' };
  const d=questNextDef();
  QUESTS.active={ id:d.id, n:d.n, verb:d.verb, unit:d.unit,
                  goal:d.goal, have:0, coin:d.coin };
  questSave(); questRender();
  try{ toast('Quest accepted: '+d.n); }catch(e){}
  return { ok:true, quest:QUESTS.active };
}
function questComplete(){ const q=QUESTS.active; return !!(q && q.have>=q.goal); }
function questTurnIn(){
  const q=QUESTS.active;
  if(!q) return { ok:false, why:'none' };
  if(q.have < q.goal) return { ok:false, why:'incomplete', left:q.goal-q.have };
  let paid=0;
  try{
    /* mint the reward through the SAME factory everything else uses, so it
       stacks, shows its art and reads its own tooltip with no special case */
    const it=makeCurrency('cu_vault', q.coin);
    if(it && window.put ? put(it) : (window.addItem && addItem(CONT.inv,it)!==false))
      paid=q.coin;
  }catch(e){ window.ahErr&&window.ahErr(e,'questTurnIn:pay'); }
  QUESTS.active=null; QUESTS.done++;
  questSave(); questRender();
  try{ toast('Quest complete \\u2014 '+paid+' Vaulted Coin'); }catch(e){}
  return { ok:true, coin:paid, done:QUESTS.done };
}
/* the kill hook feeds this; nothing polls */
function questNoteKill(){
  const q=QUESTS.active;
  if(!q || q.have>=q.goal) return;
  q.have++;
  if(q.have>=q.goal){
    q.have=q.goal;
    try{ toast(q.n+' complete \\u2014 return to Adenah'); }catch(e){}
  }
  /* saving every kill would hammer localStorage at 200 mobs a floor */
  if(q.have % 25 === 0 || q.have===q.goal) questSave();
  questRender();
}
window.questAccept=questAccept;
window.questTurnIn=questTurnIn;
window.questNoteKill=questNoteKill;
window.questComplete=questComplete;

function questEl(){
  if(QUESTS.el && QUESTS.el.parentNode) return QUESTS.el;
  const el=document.createElement('div');
  el.id='questBoard';
  document.body.appendChild(el);
  QUESTS.el=el;
  return el;
}
function questRender(){
  try{
    const el=questEl();
    const q=QUESTS.active;
    if(!q){
      /* ⚠ AN EMPTY BOARD STILL SAYS SOMETHING. A panel that vanishes when you
         have no quest leaves the player with no idea the system exists or who
         to see about it. */
      el.innerHTML='<div class="qTitle idle">No Contract</div>'+
                   '<div class="qLine">See Adenah in town</div>';
      el.classList.add('on');
      QUESTS.lastN=-1;
      return;
    }
    const done=q.have>=q.goal;
    /* repaint only when the NUMBER changes — this is called from the kill hook */
    if(QUESTS.lastN===q.have && el.dataset.q===q.id) return;
    QUESTS.lastN=q.have; el.dataset.q=q.id;
    const pct=Math.max(0, Math.min(100, q.have/q.goal*100));
    el.innerHTML=
      '<div class="qTitle'+(done?' done':'')+'">'+q.n+'</div>'+
      '<div class="qLine">'+q.verb+' '+fmt(q.goal)+' '+q.unit+
        ' <b class="'+(done?'qOk':'qNum')+'">('+fmt(q.have)+'/'+fmt(q.goal)+')</b></div>'+
      '<div class="qTrack"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
      '<div class="qFoot">'+(done ? 'Return to Adenah'
                                  : ('Reward: '+q.coin+' Vaulted Coin'))+'</div>';
    el.classList.add('on');
  }catch(e){ window.ahErr&&window.ahErr(e,'questRender'); }
}
window.questRender=questRender;
questLoad();

/* ---- the state machine -------------------------------------------------- */
function autoTick(dt){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
