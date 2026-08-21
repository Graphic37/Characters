// the shield must READ as blue over the red globe
const fs=require('fs');
const src=fs.readFileSync('work.html','utf8');
// ⚠ strip CSS comments first: my own comment explains the bug and contains the
// literal `mix-blend-mode:screen`, which the assertion then "found".
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
             .replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
// last matching rule wins (the cascade lesson)
let m,rule=null; const re=/\.orb-fill\.es\{([^}]*)\}/g;
while((m=re.exec(css))) rule=m[1];
R.noScreenBlend = !/mix-blend-mode:\s*screen/.test(rule);
R.blendIsNormal = /mix-blend-mode:\s*normal/.test(rule);

// pull the gradient stops and composite each over the life globe
const stops=[...rule.matchAll(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g)]
  .map(x=>({r:+x[1]/255,g:+x[2]/255,b:+x[3]/255,a:+x[4]}));
const grad=stops.slice(0,3);          // the background gradient, not the shadows
const RED={r:0.85,g:0.30,b:0.28};     // the life globe underneath
const over=(c)=>({ r:c.r*c.a+RED.r*(1-c.a), g:c.g*c.a+RED.g*(1-c.a), b:c.b*c.a+RED.b*(1-c.a) });
R.composited = grad.map(c=>{
  const o=over(c);
  return { alpha:c.a, rgb:[o.r,o.g,o.b].map(v=>+v.toFixed(2)),
           readsBlue: o.b > o.r && o.g > o.r*0.85 };
});
R.everyStopReadsBlue = R.composited.every(c=>c.readsBlue);
R.minAlpha = Math.min(...grad.map(c=>c.a));
R.opaqueEnough = R.minAlpha >= 0.85;

// and what the OLD rule produced, for the record
const screen=(a,b)=>1-(1-a)*(1-b);
const old={r:200/255,g:240/255,b:255/255}, oa=0.52;
R.oldScreenResult = { rgb:[screen(RED.r,old.r*oa),screen(RED.g,old.g*oa),screen(RED.b,old.b*oa)]
  .map(v=>+v.toFixed(2)), readsBlue:false, note:'near-white, pink cast' };
console.log(JSON.stringify(R,null,1));
