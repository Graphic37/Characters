src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠⚠⚠ THE TOWN IS BUILT FROM THE AUTHORED LAYOUT, WHICH PLACES `npc_occultist`
# -> `spawnStandaloneNPC('occultist')`. THIS is the factory that creates the
# real Veyra station. The `stations.push({name:'Veyra'...})` inside the crafting
# BUILDING — the one I have been editing since v220 — belongs to a procedural
# town that this save does not use. Every prompt and act I "fixed" was fixed on
# a station that is never created.
#
# `noE:true` here is why E did nothing at her: the guard in `tryInteract` reads
# `nearStation.noE` and returns before any dispatch. My v223 fix removed the
# NAME list and kept the flag — correctly — but her flag was still set, in the
# definition I never looked at.
#
# THE LESSON, AND IT IS THE SAME ONE AS v223/v226/v227: I kept fixing the LINK
# I could see instead of finding which one the game actually runs. The factory
# even carries a comment saying it enumerates fields and silently drops
# anything not listed — "3rd time this has bitten" — and I still did not check
# whether it was the live path.
rep('veyra',
"""    occultist:{name:'Veyra',prompt:'', noE:true, key2:'F', prompt2:'Bank findings',title:'Veyra, Occultist',r:2.7,
      body:'Reagents, patience and a little risk. She will reshape what you already carry — for a price you may not like.',acts:['Enchant','Reroll','Socket','Craft']}""",
"""    occultist:{name:'Veyra',prompt:'Contracts',title:'Veyra, the Pale Keeper',r:3.2,
      body:'She keeps a ledger of things that need killing, and pays in coin the '+
           'Pale still honours. Bring her a finished contract.',acts:['Contracts']}""")

# and the other two, so the live stations match what the panels actually are
rep('smith',
"""    smith:{name:'Garrick',prompt:'Speak to Garrick',title:'Garrick, Blacksmith',r:2.7,
      body:'Fire, hammer, patience. Bring what is worth saving and he will make it stronger — and break down what is not.',acts:['Upgrade','Repair','Salvage']},""",
"""    /* ⚠ these strings are the ones the player actually sees — the procedural
       town's copies are dead. Salvage and Repair are gone from Garrick, so his
       acts must not still advertise them. */
    smith:{name:'Garrick',prompt:'Support Slots',title:'Garrick, Blacksmith',r:3.2,
      body:'Fire, hammer, patience. He fits support gems into a skill \\u2014 '+
           'permanently, for gold.',acts:['Support Slots']},""")

rep('merchant',
"""    merchant:{name:'Mara',prompt:'Trade with Mara',title:'Mara, Quartermaster',r:2.7,
      body:'Whatever you dragged back out of the dark, she will put a price on it — and sell you what you should have brought.',acts:['Buy','Sell','Consumables']},""",
"""    merchant:{name:'Mara',prompt:'Trade',title:'Mara, Quartermaster',r:3.2,
      body:'Whatever you dragged back out of the dark, she will put a price on '+
           'it \\u2014 and sell you what you should have brought.',acts:['Buy','Sell']},""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
