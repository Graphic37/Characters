// ⚠ A KEYMAP AUDIT. Guessing a free key failed twice; assert it instead.
const fs=require('fs');
const src=fs.readFileSync('work.html','utf8');
const keys={};
for(const m of src.matchAll(/e\.key===['"](F\d+)['"]/g)){
  keys[m[1]]=(keys[m[1]]||0)+1;
}
const dupes=Object.entries(keys).filter(([,v])=>v>1).map(([k])=>k);
const R={ bindings:Object.fromEntries(Object.entries(keys).sort()),
          doubleBound:dupes, clean:dupes.length===0,
          perfOwns:/e\.key==='F3'\)\{ e\.preventDefault\(\); window\.perfToggle/.test(src) };
console.log(JSON.stringify(R,null,1));
if(!R.clean) process.exit(1);
