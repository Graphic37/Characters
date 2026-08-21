src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('brighten',
"""/* brighten a hex without letting any channel clip to white */
function lookBrighten(hex, mul){
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r*mul); c.g = Math.min(1, c.g*mul); c.b = Math.min(1, c.b*mul);
  return c;
}""",
"""/* ⚠ MY OWN COMMENT SAID "without letting any channel clip" AND THEN CLIPPED.
   `Math.min(1, c*mul)` per channel is exactly a clip: the brightest channel
   reaches 1.0 first and the others keep rising, so the colour DESATURATES.
   Measured on the real enemy tints at the v186 multiplier of 1.30:
     normal #e4dccc -> #ffffff   saturation -100%  (pure white)
     magic  #acc0e0 -> #e0faff   saturation  -40%
     rare   #dfb87c -> #ffefa1   saturation   -5%
   That is why the blue and gold rarity tints stopped reading — I washed them
   out myself while making enemies brighter.
   Scaling by the HEADROOM instead preserves the ratios between channels, so a
   colour gets brighter without getting greyer. */
function lookBrighten(hex, mul){
  const c = new THREE.Color(hex);
  const peak = Math.max(c.r, c.g, c.b) || 1;
  const safe = Math.min(mul, 1/peak);      /* the most we can scale un-clipped */
  c.r*=safe; c.g*=safe; c.b*=safe;
  return c;
}
/* Push a colour toward a rarity hue. Blending rather than replacing keeps each
   archetype distinguishable — a tinted skeleton still reads as a skeleton. */
function lookRarity(col, rarity){
  const L = window.LOOK || {};
  const amt = (rarity==='magic') ? (L.magicTint!==undefined?L.magicTint:0.45)
            : (rarity==='rare')  ? (L.rareTint !==undefined?L.rareTint :0.45)
            : 0;
  if(!amt) return col;
  const hue = new THREE.Color(rarity==='rare'
    ? ((L.rareHue !==undefined)?L.rareHue :0xffc24a)
    : ((L.magicHue!==undefined)?L.magicHue:0x5a90ff));
  col.r += (hue.r-col.r)*amt;
  col.g += (hue.g-col.g)*amt;
  col.b += (hue.b-col.b)*amt;
  return col;
}""")

rep('apply',
"""  const baseTint = (A.tint[rarity] || A.tint.normal);
  const m = stdMat(tex, { repeat: 2, env: 0.42,
                          color: lookBrighten(baseTint, LOOK.enemyTint) });""",
"""  /* ⚠ FREE, BECAUSE THE MATERIAL IS ALREADY KEYED `kind|rarity`. A magic and a
     rare legionnaire have had separate materials all along — the rarity tint
     costs no extra material, no extra draw call and nothing per enemy. */
  const baseTint = (A.tint[rarity] || A.tint.normal);
  const m = stdMat(tex, { repeat: 2, env: 0.42,
                          color: lookRarity(lookBrighten(baseTint, LOOK.enemyTint), rarity) });""")

rep('dials',
"""  enemyTint:     1.30,   // enemies 30% brighter than their current tint""",
"""  enemyTint:     1.30,   // enemies 30% brighter than their current tint
  /* D3's rarity read: magic monsters carry a blue cast, rares a gold one, on
     the BODY — not only on a bar or a ring. Blend strength, then the hues. */
  magicTint:     0.45,
  rareTint:      0.45,
  magicHue:      0x5a90ff,
  rareHue:       0xffc24a,""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
