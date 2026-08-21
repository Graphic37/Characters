src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE ORBIT CHORD
rep('chord',
"""          /* chain the orbit around itself — adjacent slots only, so the chord
             never reaches across the group through other nodes */
          if(placed.length > 2)
            for(var p=0; p<placed.length; p++)
              link(placed[p], placed[(p+1) % placed.length]);""",
"""          /* ⚠ THE COMMENT HERE WAS FALSE. It claimed "adjacent slots only, so
             the chord never reaches across the group" — but nodes are RANDOMLY
             SKIPPED a few lines above (`rnd() < 0.22`), so array-adjacent stops
             meaning angle-adjacent the moment two slots in a row are dropped.
             The chain then spans a wide arc and draws a line straight through
             the middle of the group, which is the tangle he screenshotted.
             Measured: 21 within-group edges over 3x the median length.
             Link only when the two really are neighbours — at most ~1.6 slot
             widths apart. A wider gap simply gets no chord; the radial spokes
             below still keep the orbit connected. */
          if(placed.length > 2){
            var slotArc = (Math.PI * 2) / orb.slots;
            var maxArc  = slotArc * 1.6;
            for(var p=0; p<placed.length; p++){
              var nA = placed[p], nB = placed[(p+1) % placed.length];
              var arc = Math.abs(placed[(p+1) % placed.length].__slot - nA.__slot);
              if(arc > orb.slots/2) arc = orb.slots - arc;   /* wrap */
              if(arc * slotArc <= maxArc) link(nA, nB);
            }
          }""")

# the chord test needs each node to remember its slot
rep('slot',
"""            placed.push(addNode(nx, ny, kind, nm, grp.idx));""",
"""            var __n = addNode(nx, ny, kind, nm, grp.idx);
            __n.__slot = k;          /* which angular slot, for the chord test */
            placed.push(__n);""")

# ============================================ 2. THE GROUP BRIDGE
rep('bridge',
"""        var flat = [].concat.apply([], ringNodes);
        var bestA=null, bestB=null, bestD=1e9;
        for(var a1=0; a1<prevBoundary.length; a1++)
          for(var b1=0; b1<flat.length; b1++){
            var qx = prevBoundary[a1].x - flat[b1].x, qy = prevBoundary[a1].y - flat[b1].y;
            var q2 = qx*qx + qy*qy;
            if(q2 < bestD){ bestD = q2; bestA = prevBoundary[a1]; bestB = flat[b1]; }
          }
        link(bestA, bestB);
        prevBoundary = flat;""",
"""        var flat = [].concat.apply([], ringNodes);
        /* ⚠ BRIDGE TO THE NEAREST GROUP ALREADY PLACED, NOT THE PREVIOUS ONE
           IN ARRAY ORDER. `list` walks ring 0, then both fans of ring 1, then
           three fans of ring 2 — so "the previous entry" jumps between fans and
           the bridge became a long diagonal across the whole spoke. Measured:
           74 group-to-group edges over 3x the median, the worst at 711px
           between two groups that merely have consecutive indices.
           Searching every node placed so far on this spoke costs nothing at
           build time and always yields a short, sane connector. */
        var bestA=null, bestB=null, bestD=1e9;
        for(var a1=0; a1<spokePool.length; a1++){
          var pa = spokePool[a1];
          for(var b1=0; b1<flat.length; b1++){
            var qx = pa.x - flat[b1].x, qy = pa.y - flat[b1].y;
            var q2 = qx*qx + qy*qy;
            if(q2 < bestD){ bestD = q2; bestA = pa; bestB = flat[b1]; }
          }
        }
        link(bestA, bestB);
        /* a second connector to a DIFFERENT nearby node keeps the tree
           navigable without the long chords the old chain produced */
        var secA=null, secB=null, secD=1e9;
        for(var a2=0; a2<spokePool.length; a2++){
          var pb = spokePool[a2];
          if(pb === bestA) continue;
          for(var b2=0; b2<flat.length; b2++){
            if(flat[b2] === bestB) continue;
            var rx = pb.x - flat[b2].x, ry = pb.y - flat[b2].y;
            var r2 = rx*rx + ry*ry;
            if(r2 < secD){ secD = r2; secA = pb; secB = flat[b2]; }
          }
        }
        if(secA && secD < bestD * 3.2) link(secA, secB);
        spokePool = spokePool.concat(flat);""")

rep('pool',
"""      var prevBoundary = [hubRing[sg]];""",
"""      var spokePool = [hubRing[sg]];""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
