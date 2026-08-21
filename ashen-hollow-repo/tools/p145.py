src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('err',
"""const err=document.getElementById('err');
addEventListener('error',e=>{ err.style.display='flex';
  err.textContent='Scene failed to start\\n\\n'+(e.message||e)+
    '\\n\\nThis page loads three.js from a CDN — it needs a connection the first time.'; });""",
"""const err=document.getElementById('err');
/* ===========================================================================
   ⚠⚠ THIS WAS A BOOT SCREEN CATCHING EVERY RUNTIME ERROR.
   Any uncaught error at any moment — a click handler, a stray undefined in a
   panel — replaced the whole game with "Scene failed to start ... it needs a
   connection the first time." That message is a LIE after boot: the scene
   started fine, something in a button threw, and the player is told their
   internet failed and left staring at a black screen with no way back.
   That is how a one-line bug in the stash presented as a total loss.
   A boot failure and a runtime error are different events and deserve
   different treatment: before the world exists, the overlay is the only thing
   that can speak. After it exists, the game keeps running and the error goes
   where errors go — the F6 console — so a bad click costs a log line, not the
   session.
   ========================================================================= */
let __booted=false;
window.markBooted=()=>{ __booted=true; };
addEventListener('error',e=>{
  const msg=(e && (e.message||e.error&&e.error.message)) || String(e);
  if(__booted){
    /* runtime: report it, keep playing */
    try{ window.ahErr && window.ahErr(e.error||new Error(msg), 'uncaught'); }catch(x){}
    try{ console.warn('[uncaught] '+msg); }catch(x){}
    try{ if(window.toast) toast('Something went wrong — press F6 for details'); }catch(x){}
    return;
  }
  err.style.display='flex';
  err.textContent='Scene failed to start\\n\\n'+msg+
    '\\n\\nThis page loads three.js from a CDN — it needs a connection the first time.';
});
/* an unhandled promise rejection is the same class of event */
addEventListener('unhandledrejection', e=>{
  if(!__booted) return;
  try{ console.warn('[unhandled] '+((e.reason&&e.reason.message)||e.reason)); }catch(x){}
});""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
