// stashPut must never overflow into a BOARD tab
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const a=src.indexOf('const STASH_RULES={');
const b=src.indexOf('/* DEPOSIT ALL');
const code=src.slice(a,b);
const CONT={inv:{id:'inv',w:10,h:6,items:[]}};
for(let i=0;i<12;i++) CONT['st'+i]={id:'st'+i,w:10,h:10,items:[],full:false};
const sb={console,CONT,STASH_TAB_COUNT:12,
  addItem:(c,it)=>{ if(c.full) return false; c.items.push(it); return c.id; }};
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.OUT={stashPut,stashTabFor};',sb,{filename:'s.js'});
const {stashPut,stashTabFor}=sb.OUT;
const R={};
R.homes={ gear:stashTabFor({kind:'gear'}), currency:stashTabFor({kind:'currency'}),
          support:stashTabFor({kind:'support'}), rune:stashTabFor({kind:'rune'}),
          flask:stashTabFor({kind:'flask'}) };
// a rune still goes to its board home
R.runeHome = stashPut({kind:'rune'});
// now fill DUMP and GEAR and push a flask through: it must land in a PLAYER tab,
// never in the gems or runes board
CONT.st3.full=true; CONT.st0.full=true;
R.flaskOverflow = stashPut({kind:'flask'});
// fill every player tab too: it must give up rather than hide it in a board
['st5','st6','st7','st8','st9','st10','st11'].forEach(k=>CONT[k].full=true);
R.flaskNowhere = stashPut({kind:'flask'});
R.boardsUntouched = { st2:CONT.st2.items.length, st4:CONT.st4.items.filter(i=>i.kind!=='rune').length,
                      st1:CONT.st1.items.length };
console.log(JSON.stringify(R,null,1));
