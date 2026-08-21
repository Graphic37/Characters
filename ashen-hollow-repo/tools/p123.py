src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE CURVES
rep('curves',
"""const RUNE_MAG=[0,4,9,17,30,52];      // index by tier 5..1 -> magnitude
                                      // (still used by Wall/Fox/Veil/Warding)""",
"""const RUNE_MAG=[0,4,9,17,30,52];      // index by tier 5..1 -> magnitude
                                      // (Warding still reads it for nothing;
                                      //  kept so old saves parse)

/* ===========================================================================
   DEFENSIVE RUNE LOCK — 2026-08-20, HIS CORRECTION, MEASURED
   ---------------------------------------------------------------------------
   ⚠ THE FLAT VERSION WAS REGRESSIVE, and the numbers say so plainly. A T1
   Wall gave +52 armour per socket regardless of the base it sat in:
       Stalker Boots      76 ar, 2 sockets -> +104 = **+137% of base**
       Grave Warden Plate 612 ar, 3 sockets -> +156 = **+25% of base**
   So the rune was worth five times more in the WORST base than the best one —
   it rewarded finding bad gear. That is the opposite of the philosophy the
   offensive runes were locked on, where a % rune is only worth what the gear
   underneath it is worth.

   LOCAL % of the socketed item's own defence, T5 -> T1:  6 / 9 / 13 / 17 / 22
   Measured against the bases that actually ship:
       Rusted Sallet      76 ar, 1 socket, T1  ->   93  (+17)
       Ironscale Cuirass 246 ar, 2 sockets, T1 ->  354  (+108)
       Grave Warden Plate 612 ar, 3 sockets, T1 -> 1016 (+404, +66%)
   The endgame case he named lands at +66% local, which is a real investment
   without the rune supplying the defence by itself.

   ⚠ ADDITIVE WITH OTHER LOCAL % DEFENCE, never multiplicative after it — the
   same self-dilution that makes the offensive runes behave.
   ========================================================================= */
const RUNE_LOCAL_PCT=[0,22,17,13,9,6];   // index [6-tier]: 1=T5 .. 5=T1
/* Warding is the BROAD option and must stay worse per point than fixing one
   family: single-family resistance is 3/5/7/9/12, so all-four is 1/2/3/4/5. */
const RUNE_ALLRES=[0,5,4,3,2,1];         // index [6-tier]

/* which native defence a rune scales, and therefore which items accept it */
const RUNE_LOCAL_STAT={ rn_arm:'ar', rn_eva:'ev', rn_es:'es' };
window.RUNE_LOCAL_STAT=RUNE_LOCAL_STAT;

/* ⚠ A RUNE MAY NOT GIVE A MEANINGLESS EFFECT. Wall needs an item with Armour,
   Fox an Evasion base, Veil an Energy Shield base; a hybrid accepts either of
   the ones it actually has. Jewellery has no defensive base at all and takes
   none of the three — without this rule they would be global percentages
   stackable in every ring slot, and the values would have to shrink until an
   individual drop felt like nothing. */
function itemNativeDefence(it){
  const d={ar:0,ev:0,es:0};
  try{
    const base=(window.BASES||[]).filter(b=>b.id===(it&&it.baseId))[0];
    const def=(base&&base.def)||(it&&it.def)||null;
    if(def){ d.ar=def.ar||0; d.ev=def.ev||0; d.es=def.es||0; }
  }catch(e){}
  return d;
}
window.itemNativeDefence=itemNativeDefence;
window.runeFitsItem=function(runeType, it){
  const stat=RUNE_LOCAL_STAT[runeType];
  if(!stat) return { ok:true };                 /* not one of the three */
  if(!it || it.kind!=='gear') return { ok:false, why:'Only equipment can hold this rune.' };
  const d=itemNativeDefence(it);
  if(!d[stat]){
    const word={ar:'Armour', ev:'Evasion', es:'Energy Shield'}[stat];
    return { ok:false, why:'This item has no '+word+' to increase.' };
  }
  return { ok:true };
};""")

# ============================================ 2. THE DEFINITIONS
rep('defs',
""" /* these four are magnitude-based and slot-agnostic; unchanged this pass */
 {id:'rn_arm',  n:'Rune of the Wall',stat:'ar',  flatByMag:1, txt:v=>'+'+v+' to Armour'},
 {id:'rn_eva',  n:'Rune of the Fox', stat:'ev',  flatByMag:1, txt:v=>'+'+v+' to Evasion'},
 {id:'rn_es',   n:'Rune of the Veil',stat:'es',  flatByMag:1, txt:v=>'+'+v+' to Energy Shield'},
 {id:'rn_res',  n:'Rune of Warding', stat:'res', flatByMag:1, txt:v=>'+'+v+'% to all Resistances'}""",
""" /* ⚠ LOCAL PERCENTAGES, NOT FLAT (2026-08-20). Each scales the socketed
    item's OWN defence, so the base you found is what decides the rune's worth.
    `needs` states the component the item must actually have. */
 {id:'rn_arm',  n:'Rune of the Wall',stat:'ar', localPct:1, needs:'ar',
  txt:t=>RUNE_LOCAL_PCT[6-t]+'% increased Armour on this item'},
 {id:'rn_eva',  n:'Rune of the Fox', stat:'ev', localPct:1, needs:'ev',
  txt:t=>RUNE_LOCAL_PCT[6-t]+'% increased Evasion on this item'},
 {id:'rn_es',   n:'Rune of the Veil',stat:'es', localPct:1, needs:'es',
  txt:t=>RUNE_LOCAL_PCT[6-t]+'% increased Energy Shield on this item'},
 /* Warding stays GENERAL — broad cover, deliberately less efficient than
    fixing one family with Cinders/Frost/Storms/Blight. */
 {id:'rn_res',  n:'Rune of Warding', stat:'res', allRes:1,
  txt:t=>'+'+RUNE_ALLRES[6-t]+'% to all Resistances'}""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
