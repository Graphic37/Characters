// control: the SAME sequence against the pre-fix togglePanel
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
let src=fs.readFileSync('work.html','utf8');
// strip the v157 additions to recreate v156 behaviour
src=src.replace(/  if\(!open && id==='skillPanel' && window\.__skillsOpenedStash\)\{[\s\S]*?\n  \}\n  \/\* he closed the stash himself: skills no longer owns it \*\/\n  if\(!open && id==='stashPanel'\) window\.__skillsOpenedStash = false;\n/, '');
const a=src.indexOf('function togglePanel(id,force){');
const b=src.indexOf('function refreshMenu(){');
const code=src.slice(a,b);
const dom=new JSDOM('<body>'+['invPanel','charPanel','skillPanel','stashPanel'].map(id=>'<div id="'+id+'"></div>').join('')+'</body>');
const doc=dom.window.document;
const sb={console,document:doc,$:(s)=>doc.querySelector(s),scheduleFit:()=>{},refreshMenu:()=>{},
 drawSkills:()=>{},drawStash:()=>{},drawInv:()=>{},drawChar:()=>{},refreshStashTabs:()=>{},
 stashTab:'st0',setTimeout:(fn)=>fn()};
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.T=togglePanel;',sb,{filename:'t.js'});
const st=()=>({skills:doc.getElementById('skillPanel').classList.contains('open'),
 stash:doc.getElementById('stashPanel').classList.contains('open'),
 pair:doc.body.classList.contains('pairOpen')});
sb.T('skillPanel'); const one=st();
sb.T('skillPanel'); const two=st();
console.log('CONTROL (v156)  press once:', JSON.stringify(one));
console.log('CONTROL (v156)  press twice:', JSON.stringify(two),
            two.stash && !two.skills ? '  <-- one orphaned panel left, no pairOpen (small)' : '');
