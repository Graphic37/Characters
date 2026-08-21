// one thousands separator, everywhere, and it is a comma
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. fmt itself ----------------------------------------------------
{
  // ⚠ `[^}]*` stops at the `{3}` INSIDE the regex literal, cutting the
  // function in half. Take the whole line instead.
  const m=/function fmt\(n\)\{.*\}/.exec(code);
  const sb={}; vm.createContext(sb);
  vm.runInContext(m[0]+'\nthis.F=fmt;', sb, {filename:'f.js'});
  R.fmt = { n120:sb.F(120), n1000:sb.F(1000), n120000:sb.F(120000),
            n13897101:sb.F(13897101), n0:sb.F(0), n999:sb.F(999) };
  R.commas = R.fmt.n1000==='1,000' && R.fmt.n13897101==='13,897,101'
          && R.fmt.n999==='999' && R.fmt.n120==='120';
}
// ---- 2. ⚠ NO SECOND FORMATTER LEFT ON A DIFFERENT CONVENTION ---------
{
  const seps=[...code.matchAll(/\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)\/g,\s*'([^']*)'/g)]
    .map(m=>m[1]);
  R.allSeparators = seps;
  R.oneConvention = seps.length>0 && seps.every(s=>s===',');
  R.noThinSpaceLeft = !code.includes('\u2009') && !code.includes('\\u2009');
}
// ---- 3. the quest board actually uses it -----------------------------
{
  const qa=src.indexOf('const QUEST_DEFS = [');
  const defs=/const QUEST_DEFS = \[([\s\S]*?)\n\];/.exec(src)[1];
  R.goals=[...defs.matchAll(/goal:(\d+)/g)].map(m=>+m[1]);
  // ⚠ `[^}]*` stops at the `{3}` INSIDE the regex literal, cutting the
  // function in half. Take the whole line instead.
  const m=/function fmt\(n\)\{.*\}/.exec(code);
  const sb={}; vm.createContext(sb);
  vm.runInContext(m[0]+'\nthis.F=fmt;', sb, {filename:'f.js'});
  R.questGoalsRendered = R.goals.map(g=>sb.F(g));
  R.thousandGoalHasComma = R.questGoalsRendered.includes('1,000');
  // the board and tracker both route through fmt
  R.boardUsesFmt = /fmt\(q\.goal\)/.test(code) && /fmt\(x\.goal\)/.test(code);
  R.trackerUsesFmt = /fmt\(q\.goal\)\+' '\+q\.unit/.test(code);
}
// ---- 4. toLocaleString sites agree (they are locale commas) ----------
R.localeSites = (code.match(/toLocaleString/g)||[]).length;
R.mixedApiButSameLook = R.localeSites>0;   // en-* renders commas too
console.log(JSON.stringify(R,null,1));
