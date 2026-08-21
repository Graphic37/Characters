// rarity must read on the BODY: blue for magic, gold for rare
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const LOOK = {');
const b=src.indexOf('function buildMaterialLibrary() {');
const sb={ console, THREE:{ Color:function(hex){
  if(typeof hex==='number'){ this.r=(hex>>16&255)/255; this.g=(hex>>8&255)/255; this.b=(hex&255)/255; }
  else { this.r=this.g=this.b=0; } } } };
sb.window=sb; vm.createContext(sb);
vm.runInContext(src.slice(a,b)+'\nthis.B=lookBrighten; this.T=lookRarity; this.L=LOOK;',
  sb, {filename:'l.js'});
const hex=(c)=>'#'+[c.r,c.g,c.b].map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
const sat=(c)=>+(Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b)).toFixed(3);
const lum=(c)=>+(0.2126*c.r+0.7152*c.g+0.0722*c.b).toFixed(3);

// ---- 1. ⚠ brightening no longer desaturates ---------------------------
const TINTS={normal:0xe4dccc, magic:0xacc0e0, rare:0xdfb87c};
R.brighten={};
for(const k in TINTS){
  const before=new sb.THREE.Color(TINTS[k]);
  const after=sb.B(TINTS[k], sb.L.enemyTint);
  R.brighten[k]={ from:hex(before), to:hex(after),
                  satBefore:sat(before), satAfter:sat(after),
                  brighter: lum(after) >= lum(before) };
}
R.noDesaturation = Object.values(R.brighten).every(v=>v.satAfter >= v.satBefore - 0.001);
R.noneClipToWhite = Object.values(R.brighten).every(v=>v.to !== '#ffffff');
R.stillBrightens = Object.values(R.brighten).every(v=>v.brighter);

// ---- 2. rarity actually shifts the hue ---------------------------------
const chain=(hexv,rar)=>sb.T(sb.B(hexv, sb.L.enemyTint), rar);
R.bodies={};
for(const k in TINTS){
  const c=chain(TINTS[k], k);
  R.bodies[k]={ colour:hex(c), r:+c.r.toFixed(2), g:+c.g.toFixed(2), b:+c.b.toFixed(2) };
}
R.magicIsBlue = R.bodies.magic.b > R.bodies.magic.r + 0.12;
R.rareIsGold  = R.bodies.rare.r > R.bodies.rare.b + 0.12;
R.normalUntinted = (()=>{ const n=sb.B(TINTS.normal, sb.L.enemyTint);
  const t=sb.T(sb.B(TINTS.normal, sb.L.enemyTint),'normal');
  return hex(n)===hex(t); })();
R.threeAreDistinct = new Set(Object.values(R.bodies).map(v=>v.colour)).size===3;

// ---- 3. it costs nothing — the material is already per rarity ----------
R.materialKeyedByRarity = /const key = kind \+ '\|' \+ rarity;/.test(src);
R.tintAppliedAtMaterial = /color: lookRarity\(lookBrighten\(baseTint, LOOK\.enemyTint\), rarity\)/.test(src);

// ---- 4. the dials exist and are wired ---------------------------------
R.dials = ['magicTint','rareTint','magicHue','rareHue']
  .filter(k=>new RegExp('LOOK\\.'+k).test(src) || new RegExp('L\\.'+k).test(src));
R.allDialsWired = R.dials.length===4;
console.log(JSON.stringify(R,null,1));
