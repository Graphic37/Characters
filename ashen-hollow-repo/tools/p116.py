import re
src = open('work.html', encoding='utf-8').read()

# ⚠⚠⚠ ONE DEFINITION PER NPC. THE AUTHORED TOWN IS CANONICAL (v238).
# Two factories created "Garrick": `spawnStandaloneNPC('smith')`, which the
# authored layout uses, and the `blacksmith()` BUILDING, which pushes its own
# station when called without opts — as the LEGACY prefab ids do. Same for
# Mara/vendor and Veyra/crafting. That duplication is what let me spend v220
# through v236 fixing prompts, acts and gates on objects the shipped game never
# instantiates, and it is what the "three Garricks after two reloads" comment
# was already complaining about.
# The buildings are now PURE SCENERY. The legacy ids keep working by composing
# the building with the canonical factory, so an old save still gets its NPC —
# from the ONE definition.

NOTE = ("  /* \u26a0 SCENERY ONLY (v238). The NPC **and** the station come from\n"
        "     `spawnStandaloneNPC`, which is what the authored town actually calls.\n"
        "     This building used to push a SECOND, competing definition whenever it\n"
        "     was built without opts — the legacy prefab ids did exactly that — and\n"
        "     that duplicate is the reason interaction fixes kept landing on a dead\n"
        "     object. Do not reintroduce a station here. */\n")

# strip the npc() call and the whole stations.push(...) statement from each
for fn, npc_line in [
    ('blacksmith', "  if(opts.npc!==false) npc(...W(1.55,1.62), 0xa8703c, 'smith', rot);\n"),
    ('vendor',     "  if(opts.npc!==false) npc(...W(.15,-.10), 0x6a5a8c, 'merchant', rot);\n"),
    ('crafting',   "  if(opts.npc!==false) npc(...W(-.2,-1.05), 0x4a5a7a, 'occultist', rot);\n"),
]:
    assert src.count(npc_line) == 1, ('npc', fn, src.count(npc_line))
    i = src.index(npc_line)
    # the station push starts on the next line and ends at the matching ');'
    j = src.index("  if(opts.station!==false) stations.push({", i)
    k = src.index("});", j) + 3
    src = src[:i] + NOTE + src[k:].lstrip('\n').rjust(0) if False else src[:i] + NOTE + src[k+1:]

open('work.html', 'w', encoding='utf-8').write(src)
print('buildings stripped of npc + station')
