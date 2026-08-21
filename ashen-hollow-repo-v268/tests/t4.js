const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const a=src.indexOf('const STASH_FIXED = {');
const b=src.indexOf('/* the player\'s names, persisted with the save */');
const sb={console, STASH_TAB_COUNT:12};
sb.window=sb; vm.createContext(sb);
vm.runInContext(src.slice(a,b)+'\nthis.OUT=STASH_TABS;', sb, {filename:'tabs.js'});
console.log('TAB ORDER:', sb.OUT.map(t=>t.n).join(' | '));

// routing rules
const c=src.indexOf('const STASH_RULES={');
const d=src.indexOf('/* Try the item\'s home tab');
const sb2={console, STASH_TAB_COUNT:12, CONT:{}};
sb2.window=sb2; vm.createContext(sb2);
vm.runInContext(src.slice(c,d)+'\nthis.TF=stashTabFor;', sb2, {filename:'rules.js'});
const t=sb2.TF;
console.log('gear ->', t({kind:'gear'}));
console.log('currency ->', t({kind:'currency'}));
console.log('support ->', t({kind:'support'}));
console.log('rune ->', t({kind:'rune'}));
console.log('flask ->', t({kind:'flask'}));
