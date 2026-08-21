src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ SALVAGE GETS ITS OWN PANEL
rep('salvage',
"""window.vendorPanel=vendorPanel; window.smithPanel=smithPanel;""",
"""/* ⚠ SALVAGE AND CRAFT ARE NOT DELETED, THEY ARE REHOMED. Both are real
   screens, and Garrick's tab bar was their only route — dropping the bar
   without giving them a door would have silently removed two working features,
   which is exactly the class of bug this project has spent a dozen versions
   digging out of. Mara is the goods NPC, so both hang off her panel. */
function salvagePanel(){
  stationPanel('Mara \\u00b7 Salvage', garSalvageBody(), [
    {id:'svBack', label:'Back to Mara', onClick:()=>vendorPanel()}
  ]);
}
window.salvagePanel=salvagePanel;

window.vendorPanel=vendorPanel; window.smithPanel=smithPanel;""")

rep('mara-acts',
"""  stationPanel('Mara · Quartermaster', html, [
    {id:'vInv', label:'Open inventory', primary:1, onClick:()=>{ closeWin();
      if(window.AH&&AH.onStation) AH.onStation('Mara','Buy'); }},
    {id:'vClose', label:'Close', onClick:()=>closeWin()}
  ]);""",
"""  stationPanel('Mara · Quartermaster', html, [
    {id:'vInv', label:'Open inventory', primary:1, onClick:()=>{ closeWin();
      if(window.AH&&AH.onStation) AH.onStation('Mara','Buy'); }},
    /* the two screens that used to live under Garrick's tabs */
    {id:'vSalv', label:'Salvage', onClick:()=>salvagePanel()},
    {id:'vCraft', label:'Crafting bench', onClick:()=>{ if(window.craftPanel) craftPanel(); }}
  ]);""")

# craftPanel titled as Garrick's is now wrong, and its Clear-bench reopens
# through garrickPanel('craft') which would bounce
rep('craft-title',
"""  stationPanel('Garrick · Workshop', (window.garTabBarHTML?garTabBarHTML('craft'):'')+html, [
    {id:'craftClear', label:'Clear bench', onClick:()=>{ window.CRAFT.target=null; garrickPanel('craft'); }},""",
"""  /* ⚠ RETITLED AND RE-ROUTED (v231). It said "Garrick · Workshop" and its
     Clear button reopened via `garrickPanel('craft')` — which now routes here,
     so that still works, but calling it directly is one hop shorter and does
     not depend on the router keeping that alias. */
  stationPanel('Mara \\u00b7 Crafting Bench', html, [
    {id:'craftClear', label:'Clear bench', onClick:()=>{ window.CRAFT.target=null; craftPanel(); }},""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
