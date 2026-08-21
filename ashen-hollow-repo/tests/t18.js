// the skills panel: new shape, and every hook update() needs still present
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// 1. the row markup carries every data hook and class update() queries
const a=src.indexOf("      /* PoE2 COMPACT LAYOUT (v163)");
const b=src.indexOf("    rows += '<div class=\"skHead\">SKILL GEMS");
const rowSrc=src.slice(a,b);
R.hooks={};
['data-skill=','data-toggle=','data-sock=','data-uid=','skDot','skLvl','skDmg','skStat','skSock','skName','skTag']
  .forEach(h=>{ R.hooks[h] = rowSrc.includes(h) || src.slice(a-1400,b).includes(h); });
R.newParts={ collapse:/data-collapse=/.test(rowSrc), arrow:/skArrow/.test(rowSrc),
             hint:/skHint/.test(rowSrc), dotMovedToBot:/skBot[\s\S]*skDot/.test(rowSrc) };

// 2. update() only uses row-scoped queries, so moving the dot is safe
const ua=src.indexOf('  function update(){');
const ub=src.indexOf('  window.updateSkillsPanel = update;');
const upd=src.slice(ua,ub);
R.updateUsesScopedQueries = !/document\.querySelector\('\.skDot'\)/.test(upd)
                          && /el\.querySelector\('\.skDot'\)/.test(upd);
R.updateStillPatches = ['.skDot','.skLvl b','.skDmg b','.skStat','.skSock']
  .filter(s=>upd.includes(s));

// 3. the collapse handler exists and toggles .skBot
R.collapseHandler = /closest\('\[data-collapse\]'\)/.test(src)
                 && /bot\.style\.display = hidden \? '' : 'none'/.test(src);

// 4. CSS: columns, not flex
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
// the CASCADE uses the LAST matching rule, so the test must too — the first
// match is the pre-v163 rule that my later block overrides
const rule=(sel)=>{ const re=new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}','g');
  let m,last=null; while((m=re.exec(css))) last=m[1];
  return last?last.replace(/\s+/g,' ').trim():null; };
const top=rule('\n.skTop');
R.skTopIsGrid = /display:grid/.test(top||'');
R.skTopColumns = (top||'').match(/grid-template-columns:([^;]+)/)?.[1].trim();
const bot=rule('\n.skBot');
R.skBotIsGrid = /display:grid/.test(bot||'');
R.socketSize = (rule('\n.skSock')||'').match(/width:([^;]+)/)?.[1].trim();
R.pairSocketOverridden = /body\.pairOpen \.skSock\{ width:34px/.test(css);
// the OLD 22px pairOpen rule must not win — check ours comes later
const oldIdx=css.indexOf('body.pairOpen .skSock{ width:22px');
const newIdx=css.indexOf('body.pairOpen .skSock{ width:34px');
R.newPairRuleWinsByOrder = newIdx > oldIdx && newIdx>0;

// 5. jsdom: the CSS parses and later rules survive
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<style>'+css.slice(7)+'</style>');
R.rulesParsed = dom.window.document.styleSheets[0].cssRules.length;
console.log(JSON.stringify(R,null,1));
