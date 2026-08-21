src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('suspend-guard',
"""addEventListener('keydown', e=>{
  /* F IS THE BANK KEY. It used to toggle Auto as well, so pressing it with the
     inventory open said "auto travel" instead of depositing. Auto is locked on
     in Rifts anyway (v114), so this binding only ever surprised. */
  /* any movement key is a manual takeover — Auto goes quiet, it does not fight */
  if('wasd'.indexOf(e.key.toLowerCase())>=0 && AUTO.on)
    AUTO.suspendUntil=performance.now()/1000+AUTO_CFG.manualSuspend;
});
renderer.domElement.addEventListener('pointerdown', e=>{
  if(e.button===0 && AUTO.on) AUTO.suspendUntil=performance.now()/1000+AUTO_CFG.manualSuspend;
});""",
"""/* ⚠ A TAKEOVER THAT TAKES NOTHING OVER.
   These two listeners silence Auto for 2.5s on any WASD press or any left click
   in the world. That is right in TOWN, where he can walk. Inside a Rift it is
   not: `idleOnly` (frame loop) throws WASD away entirely, and since v162 a
   click no longer casts either — it only picks a target for the camera. So the
   input did nothing AND stopped the only thing that moves him. He pressed a
   key, the hero stood still for two and a half seconds, then carried on: which
   is exactly "pressing buttons stops my guy from moving", and why it looked
   intermittent rather than broken.
   Suspend only where manual control actually exists. */
function manualControlAvailable(){
  try{ return !!window.MANUAL_MOVE || !(window.RIFT && RIFT.active); }
  catch(e){ return true; }
}
window.manualControlAvailable=manualControlAvailable;
addEventListener('keydown', e=>{
  /* F IS THE BANK KEY. It used to toggle Auto as well, so pressing it with the
     inventory open said "auto travel" instead of depositing. Auto is locked on
     in Rifts anyway (v114), so this binding only ever surprised. */
  /* any movement key is a manual takeover — Auto goes quiet, it does not fight */
  if(!manualControlAvailable()) return;
  if('wasd'.indexOf(e.key.toLowerCase())>=0 && AUTO.on)
    AUTO.suspendUntil=performance.now()/1000+AUTO_CFG.manualSuspend;
});
renderer.domElement.addEventListener('pointerdown', e=>{
  if(!manualControlAvailable()) return;
  if(e.button===0 && AUTO.on) AUTO.suspendUntil=performance.now()/1000+AUTO_CFG.manualSuspend;
});""")

# a suspension already banked by an older build (or by town play) must not
# follow him into the rift
rep('clear-on-entry',
"""    /* a run left open (a reload mid-rift) must not be attributed to this one */""",
"""    AUTO.suspendUntil=0;    /* never carry a town takeover into the rift */
    /* a run left open (a reload mid-rift) must not be attributed to this one */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
