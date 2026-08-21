src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE "NUMBERS" ARE THE COUNT BADGE
rep('badge',
"""#stashTabs .tab[data-count]::after{
  content:attr(data-count); margin-left:6px; opacity:.55; font-size:8px;
}""",
"""/* ⚠ THIS BADGE WAS READING AS PART OF THE NAME. The item count was appended
   inline at 8px/55% opacity with a 6px gap — so GEAR holding two items looked
   like "Gear 2", CURRENCY like "Currency 2", and a purchased STASH 1 became
   indistinguishable from a numbered name. He reported it as a naming bug and
   he was right about the symptom: the strip was showing numbers that are not
   names.
   The count is still useful, so it becomes a CORNER PIP rather than a suffix —
   detached from the text baseline, it reads as a badge instead of a numeral in
   the title. */
#stashTabs .tab{ position:relative }
#stashTabs .tab[data-count]::after{
  content:attr(data-count);
  position:absolute; top:2px; right:4px;
  font:600 8px "Trebuchet MS",sans-serif; letter-spacing:0;
  color:#8a8471; opacity:.7; pointer-events:none;
}
#stashTabs .tab.on[data-count]::after{ color:#c8a24a; opacity:.9 }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
