src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ DEFAULT TO THE SYSTEM THAT HAS EVIDENCE.
# The spine is the better IDEA — verified once at build time, nothing left to
# fail at runtime — but I have never seen it run correctly. Its generation was
# wrong at the root until v207 (straight lines between room centres, 119 of 180
# points inside walls) and v207 has not been played. The only observed spine run
# produced 4,583 stuck-recoveries and 0 rooms entered.
# The old pathfinder has real failures, but they are KNOWN failures with ~20
# versions of fixes behind them and a watchdog that recovers from them.
# Shipping an unobserved navigation system as the default would be choosing the
# thing I like over the thing that has been measured.
rep('default',
"""const SPINE_CFG = {
  on: true,           // ahSpine(false) reverts to the old pathfinder""",
"""const SPINE_CFG = {
  /* ⚠ OFF BY DEFAULT — deliberately, and not because the idea is wrong.
     The spine is verified once at build time, which is structurally better than
     pathing at runtime. But its generator was broken until v207 and v207 has
     never been played: the only spine run ever observed produced 4,583
     stuck-recoveries and entered zero rooms. The old pathfinder's failures are
     known, bounded and have a watchdog behind them.
     `ahSpine(true)` turns it on for a run; the A/B tooling is all still here.
     Flip this to `true` the moment a real run logs a clean [spine] line. */
  on: false,          // ahSpine(true) enables the spine follower""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
