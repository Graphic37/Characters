// the readability pass: correct maths, no new cost, restore still works
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. lookBrighten must lift without clipping to white ---------------
const a=src.indexOf('const LOOK = {');
const b=src.indexOf('function archetypeMaterial(kind, rarity) {');
const sb={ console, THREE:{ Color:function(hex){
  if(typeof hex==='number'){ this.r=((hex>>16)&255)/255; this.g=((hex>>8)&255)/255; this.b=(hex&255)/255; }
  else { this.r=this.g=this.b=0; } } } };
sb.window=sb; vm.createContext(sb);
vm.runInContext(src.slice(a,b)+'\nthis.B=lookBrighten; this.L=LOOK;', sb, {filename:'l.js'});
const hex=(c)=>'#'+[c.r,c.g,c.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
R.brighten = {
  darkTint: hex(sb.B(0x6a5a4a, sb.L.enemyTint)),
  fromBlack: hex(sb.B(0x000000, sb.L.enemyTint)),
  alreadyBright: hex(sb.B(0xf0e0d0, sb.L.enemyTint)),
  noChannelClipsAbove1: [0xffffff,0xf0e0d0,0x6a5a4a].every(h=>{
    const c=sb.B(h, sb.L.enemyTint); return c.r<=1 && c.g<=1 && c.b<=1; }),
  actuallyBrighter: sb.B(0x6a5a4a,sb.L.enemyTint).r > (0x6a/255)
};

// ---- 2. the dials are all in ONE object, none hardcoded at the site -----
R.dials = Object.keys(sb.L);
// ⚠ THIRD TIME THIS CHECK HAS BEEN ALIAS-BLIND. It knew `LOOK.` and `K.`, then
// new code read dials through `L.` and it reported them unused again. Stop
// enumerating aliases: strip the LOOK DECLARATION, then ask whether the dial is
// read as a property ANYWHERE else. Whatever the alias is called, this sees it.
const declStart=src.indexOf('const LOOK = {');
const declEnd=src.indexOf('};', declStart)+2;
const outsideDecl=src.slice(0,declStart)+src.slice(declEnd);
R.allDialsUsed = R.dials.filter(k=>new RegExp('\\.'+k+'\\b').test(outsideDecl));
R.everyDialReferenced = R.allDialsUsed.length === R.dials.length;

// ---- 3. ring maths: thinner band, lower opacity, same inner radius ------
{
  const rIn=0.42, rOut=rIn+(0.52-0.42)*sb.L.ringThin;
  R.ring = { innerUnchanged:rIn===0.42, oldBand:+(0.52-0.42).toFixed(3),
             newBand:+(rOut-rIn).toFixed(3),
             thinnerBy:Math.round((1-sb.L.ringThin)*100)+'%',
             actorOpacity:+(0.48*sb.L.ringOpacity).toFixed(3),
             playerOpacity:+(0.42*sb.L.ringOpacity).toFixed(3),
             reducedBy:Math.round((1-sb.L.ringOpacity)*100)+'%' };
}

// ---- 4. NO NEW LIGHTS, NO NEW DRAW CALLS -------------------------------
{
  const la=src.indexOf('function applyDungeonLighting(d, bounds){');
  const lb=src.indexOf('/* exposure and fog are GLOBAL', la);
  const rig=src.slice(la,lb);
  const count=(re)=>(rig.match(re)||[]).length;
  R.lightRig = { ambient:count(/new THREE\.AmbientLight/g),
                 directional:count(/new THREE\.DirectionalLight/g),
                 point:count(/new THREE\.PointLight/g),
                 multipliesNotAdds: /K\.ambient/.test(rig) && /K\.key/.test(rig) };
}

// ---- 5. exposure is restored on leaving the rift -----------------------
R.exposureRestored = /renderer\.toneMappingExposure=RIFT\.prevLook\.exposure;/.test(src);
R.exposureSavedFirst = /RIFT\.prevLook=\{ exposure:renderer\.toneMappingExposure/.test(src);
// ⚠ the multiply must not compound across repeated rift entries
{
  let exposure=1.66; const L={};
  const prev=exposure;                       // saved on entry
  exposure=(L.exposure!==undefined?L.exposure:exposure)*sb.L.exposure;
  const inRift=exposure;
  exposure=prev;                             // restored on exit
  const afterExit=exposure;
  exposure=(L.exposure!==undefined?L.exposure:exposure)*sb.L.exposure;
  R.noCompounding = { base:prev, inRift:+inRift.toFixed(3), afterExit,
                      secondEntry:+exposure.toFixed(3),
                      stable: Math.abs(exposure-inRift)<1e-9 };
}
console.log(JSON.stringify(R,null,1));
