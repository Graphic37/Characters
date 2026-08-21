// AUDIT: is there ANY path from a player input to a cast that Auto did not make?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// 1. every useSkill call site, with its context classified
const sites=[];
const re=/useSkill\(/g; let m;
while((m=re.exec(src))){
  const line=src.slice(0,m.index).split('\n').length;
  const ctx=src.slice(Math.max(0,m.index-260), m.index+90);
  if(/function useSkill\(/.test(src.slice(m.index-9,m.index+40))) continue;   // the definition
  let kind='UNKNOWN';
  if(/viaAuto|,\s*true\)/.test(src.slice(m.index,m.index+60))) kind='auto';
  if(/^\s*\*|\/\*[^*]*$/.test(ctx.split('\n').pop())) kind='comment';
  sites.push({line, kind, snippet:src.slice(m.index-40,m.index+50).replace(/\n/g,' ').trim()});
}
R.useSkillSites=sites;

// 2. the specific input paths that used to cast
R.rmbCasts = /button===2\)\{[^}]*useSkill/.test(src);
R.lmbCasts = /button===0\)\{[^}]*useSkill/.test(src);
R.fireSkillCasts = /function fireSkill\(i\)\{[\s\S]{0,400}?window\.useSkill\(id\)/.test(src);
R.numberKeysBound = /'123'\.indexOf\(k\)>=0/.test(src);          // still bound...
R.numberKeysCast  = R.fireSkillCasts;                            // ...but harmless now

// 3. the orb refill
R.orbRefillGated = /if\(window\.AH_DEBUG\)\{ if\(orb\.classList\.contains\('hp'\)\) S\.life=1/.test(src);
R.orbRefillUngated = /if\(orb\)\{ if\(orb\.classList\.contains\('hp'\)\) S\.life=1/.test(src);

// 4. run fireSkill for real: it must not reach useSkill
const a=src.indexOf('let _autoHinted=false;');
const b=src.indexOf('function setSlotCd(el,left,max){');
const code=src.slice(a, src.indexOf('\n}', src.indexOf('function fireSkill(i){')) + 2);
let casts=0, toasts=[];
const sb={console, LOADOUT:{actives:['basic','multishot','rapid']},
  toast:(t)=>toasts.push(t), $$:()=>[], SKILLBAR:[], S:{mana:1}, clamp:(v)=>v};
sb.window={LOADOUT:sb.LOADOUT, useSkill:(id)=>{casts++;}};
sb.window.window=sb.window;
vm.createContext(sb);
vm.runInContext(code+'\nthis.F=fireSkill;', sb, {filename:'fs.js'});
sb.F(1); sb.F(1); sb.F(2);
R.fireSkillRun={ castsMade:casts, hints:toasts.length, hintText:toasts[0]||null };
console.log(JSON.stringify(R,null,2));
