src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# richer defs: flavour, an objective line, an icon glyph
rep('defs',
"""const QUEST_DEFS = [
  { id:'q_cull',    n:'Culling',        verb:'Kill', unit:'enemies', goal:120,  coin:1 },
  { id:'q_purge',   n:'Purge the Deep', verb:'Kill', unit:'enemies', goal:400,  coin:3 },
  { id:'q_harvest', n:'Grim Harvest',   verb:'Kill', unit:'enemies', goal:1000, coin:8 }
];""",
"""/* ⚠ THE BOARD NEEDS COPY, SO THE COPY LIVES ON THE DEF. A detail panel with a
   title and a number reads as a debug row; the flavour line and the objective
   phrasing are what make it a contract. Putting them here means a new contract
   arrives complete rather than needing a second edit in the renderer. */
const QUEST_DEFS = [
  { id:'q_cull',    n:'Culling the Deep', verb:'Kill', unit:'enemies', goal:120,  coin:1,
    ico:'skull',
    flavour:'The Pale is crawling with things that should have stayed buried. '+
            'Thin them, and I will not ask what you had to do about it.',
    obj:'Slay enemies in Rifts' },
  { id:'q_purge',   n:'Purge the Deep',   verb:'Kill', unit:'enemies', goal:400,  coin:3,
    ico:'blade',
    flavour:'Culling was a courtesy. This is the work. Go deep, stay long, and '+
            'come back heavier than you left.',
    obj:'Slay enemies in Rifts' },
  { id:'q_harvest', n:'Grim Harvest',     verb:'Kill', unit:'enemies', goal:1000, coin:8,
    ico:'reaper',
    flavour:'A thousand. I will not pretend it is reasonable. I will only '+
            'pretend to be surprised when you finish it.',
    obj:'Slay enemies in Rifts' }
];""")

rep('state',
"""const QUESTS = { active:null, done:0, el:null, lastN:-1 };""",
"""const QUESTS = { active:null, done:0, el:null, lastN:-1, sel:null, board:null };""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
