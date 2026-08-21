src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('global',
"""        var bestA=null, bestB=null, bestD=1e9;
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
        spokePool = spokePool.concat(flat);""",
"""        /* ⚠ SEARCH EVERY NODE PLACED SO FAR, NOT JUST THIS SPOKE. A group at
           the edge of one spoke is often nearest to a group on the NEIGHBOURING
           spoke, and restricting the search to its own spoke forced a long
           diagonal back to its own chain. Measured: spoke-local search left 122
           bridges over 3x median with the worst at 790px.
           ⚠ AND EXACTLY ONE CONNECTOR. I added a second "for navigability" and
           it simply doubled the long edges — the thing I was fixing. The tree
           is a tree; one short link per group is what keeps it readable, and
           `pruneAndRepair` below restores connectivity if anything is stranded. */
        var bestA=null, bestB=null, bestD=1e9;
        for(var a1=0; a1<globalPool.length; a1++){
          var pa = globalPool[a1];
          for(var b1=0; b1<flat.length; b1++){
            var qx = pa.x - flat[b1].x, qy = pa.y - flat[b1].y;
            var q2 = qx*qx + qy*qy;
            if(q2 < bestD){ bestD = q2; bestA = pa; bestB = flat[b1]; }
          }
        }
        link(bestA, bestB);
        globalPool = globalPool.concat(flat);""")

rep('pool',
"""      var spokePool = [hubRing[sg]];""",
"""      /* every gate is reachable from the start, so seed with all of them */
      if(!globalPool.length) globalPool = hubRing.slice();""")

rep('decl',
"""    /* fill each accepted centre with its orbits */
    for(var sg=0; sg<spokeGroups.length; sg++){""",
"""    /* fill each accepted centre with its orbits */
    var globalPool = [];
    for(var sg=0; sg<spokeGroups.length; sg++){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
