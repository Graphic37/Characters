// measure the tree's actual geometry — how bad are the connections?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
// pull the whole IIFE that owns buildTree
// take the function ALONE, plus the constants above it — slicing to the return
// left the closing braces behind.
const fnA=src.indexOf('function buildTree(){');
const decl=src.lastIndexOf('var ORBITS', 0, fnA);
const head=src.lastIndexOf('var MINOR', 0, fnA);
const start=Math.min(decl>0?decl:fnA, head>0?head:fnA);
// end: the line after the return, then its closing brace
// balance braces from the function start — anchoring on the return left the
// closing braces behind and the sandbox saw an unterminated function.
let d=0, b=fnA;
for(let k=fnA;k<src.length;k++){
  if(src[k]==='{') d++;
  else if(src[k]==='}'){ d--; if(!d){ b=k+1; break; } }
}
const a=start;
const sb={ console, Math, document:{ getElementById:()=>null, createElement:()=>({
  getContext:()=>({}), style:{}, classList:{add(){},remove(){}}, appendChild(){} }) },
  addEventListener(){}, requestAnimationFrame(){}, window:{} };
sb.window=sb;
vm.createContext(sb);
// the helpers the generator uses live above it in the same IIFE
const pre=[];
// ⚠ the constants form a DEPENDENCY CHAIN (GROUP_GAP needs GROUP_REACH which
// needs the radii). Cherry-picking declarations by name was always going to
// miss one — take the whole prologue from the IIFE up to buildTree instead.
const iifeA=src.lastIndexOf('(function(){', fnA);
pre.push(src.slice(src.indexOf('{', iifeA)+1, fnA));
['function mulberry','function pruneAndRepair','function segmentClear',
 'function buildGrid'].forEach(tok=>{
  const i=src.indexOf(tok); if(i<0) return;
  let dd=0, e=i;
  for(let k=i;k<src.length;k++){
    if(src[k]==='{') dd++;
    else if(src[k]==='}'){ dd--; if(!dd){ e=k+1; break; } }
  }
  if(i>fnA) pre.push(src.slice(i,e));   // only if it sits AFTER buildTree
});
vm.runInContext(pre.join('\n')+'\n'+src.slice(a,b)+'\nthis.T=buildTree();',
  sb, {filename:'tree.js'});
const T=sb.T;
const N=T.nodes, E=T.edges;
const byId={}; N.forEach(n=>byId[n.id]=n);
const len=(e)=>{ const p=byId[e[0]], q=byId[e[1]];
  return Math.hypot(p.x-q.x, p.y-q.y); };

R.counts={ nodes:N.length, edges:E.length, groups:T.groups.length };
const L=E.map(len).sort((x,y)=>x-y);
const pct=(p)=>+L[Math.floor(L.length*p)].toFixed(1);
R.edgeLengths={ min:+L[0].toFixed(1), p50:pct(.5), p90:pct(.9),
                p99:pct(.99), max:+L[L.length-1].toFixed(1) };

// ⚠ THE SUSPECT: an orbit chord that spans the group instead of one step
const median=pct(.5);
R.longEdges = E.map((e,i)=>({e, d:len(e)}))
  .filter(x=>x.d > median*3)
  .map(x=>({ from:byId[x.e[0]].name, to:byId[x.e[1]].name,
             sameGroup:byId[x.e[0]].grp===byId[x.e[1]].grp,
             grp:byId[x.e[0]].grp, d:+x.d.toFixed(0) }));
R.longEdgeCount = R.longEdges.length;
R.longWithinOneGroup = R.longEdges.filter(x=>x.sameGroup && x.grp>=0).length;

// duplicate edges (a<->b twice, or a->b and b->a)
const seen=new Set(); let dup=0;
E.forEach(e=>{ const k=Math.min(e[0],e[1])+'-'+Math.max(e[0],e[1]);
  if(seen.has(k)) dup++; else seen.add(k); });
R.duplicateEdges=dup;

// self loops
R.selfLoops = E.filter(e=>e[0]===e[1]).length;

// ⚠ CROSSINGS: the visual tangle he screenshotted
function seg(e){ const p=byId[e[0]], q=byId[e[1]]; return [p.x,p.y,q.x,q.y]; }
function cross(A,B){
  const [x1,y1,x2,y2]=A, [x3,y3,x4,y4]=B;
  const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);
  if(Math.abs(d)<1e-9) return false;
  const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d;
  const u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;
  return t>0.001 && t<0.999 && u>0.001 && u<0.999;
}
let crossings=0;
const segs=E.map(seg);
for(let i=0;i<segs.length;i++)
  for(let j=i+1;j<segs.length;j++){
    // skip edges sharing an endpoint
    if(E[i][0]===E[j][0]||E[i][0]===E[j][1]||E[i][1]===E[j][0]||E[i][1]===E[j][1]) continue;
    if(cross(segs[i],segs[j])) crossings++;
  }
R.crossings = crossings;

// connectivity: everything reachable from the hub?
const adj={}; N.forEach(n=>adj[n.id]=[]);
E.forEach(e=>{ adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
const seenN=new Set([T.hub.id]); const stack=[T.hub.id];
while(stack.length){ const c=stack.pop();
  adj[c].forEach(n=>{ if(!seenN.has(n)){ seenN.add(n); stack.push(n); } }); }
R.reachable = seenN.size;
R.orphans = N.length - seenN.size;

// node overlap
let overlap=0;
for(let i=0;i<N.length;i++) for(let j=i+1;j<N.length;j++){
  const d=Math.hypot(N[i].x-N[j].x, N[i].y-N[j].y);
  if(d < (N[i].r+N[j].r)*0.9) overlap++;
}
R.overlappingNodes = overlap;
// ⚠ WHAT KIND of edge is long? within-orbit chord, group-to-group, or hub?
R.longByKind={};
E.forEach(e=>{
  const p=byId[e[0]], q=byId[e[1]], d=len(e);
  if(d <= median*3) return;
  const k = (p.grp===q.grp && p.grp>=0) ? 'within-group'
          : (p.grp<0 || q.grp<0) ? 'hub-or-gate' : 'group-to-group';
  R.longByKind[k]=(R.longByKind[k]||0)+1;
});
// the very worst
R.worst = E.map(e=>({d:len(e), p:byId[e[0]], q:byId[e[1]]}))
  .sort((x,y)=>y.d-x.d).slice(0,6)
  .map(x=>({ d:+x.d.toFixed(0), a:x.p.name, ag:x.p.grp, ak:x.p.kind,
             b:x.q.name, bg:x.q.grp, bk:x.q.kind }));
/* ---- the assertions, so this cannot silently regress ------------------- */
R.PASS = {
  noChordAcrossAGroup: R.longWithinOneGroup===0,
  noCrossings:         R.crossings===0,
  noOrphans:           R.orphans===0,
  noDuplicates:        R.duplicateEdges===0,
  noSelfLoops:         R.selfLoops===0,
  noOverlaps:          R.overlappingNodes===0,
  /* the shape of the distribution: nine in ten edges are a short hop */
  p90IsShort:          R.edgeLengths.p90 <= 70,
  noRunawayEdge:       R.edgeLengths.max <= 450,
  everythingReachable: R.reachable===R.counts.nodes
};
R.OK = Object.keys(R.PASS).every(k=>R.PASS[k]);
console.log(JSON.stringify(R,null,1));
if(!R.OK) process.exit(1);
