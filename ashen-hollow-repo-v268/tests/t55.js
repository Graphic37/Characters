// both readouts must be BARE: no panel, no border, no chip boxes
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
// ⚠ strip comments — my own prose describes the thing being removed
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
             .replace(/\/\*[\s\S]*?\*\//g,'');
const last=(sel)=>{ const re=new RegExp('\\n'+sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+
  '\\{([^}]*)\\}','g'); let m,v=null; while((m=re.exec(css))) v=m[1]; return (v||'').replace(/\s+/g,' '); };

// 1. exactly ONE rule per element — the old blocks are gone, not shadowed
R.ruleCounts = { packBar:(css.match(/\n#packBar\{/g)||[]).length,
                 headPlate:(css.match(/\n#headPlate\{/g)||[]).length };
R.noDuplicates = R.ruleCounts.packBar===1 && R.ruleCounts.headPlate===1;

// 2. no panel chrome on either container
for(const [k,sel] of [['packBar','#packBar'],['headPlate','#headPlate']]){
  const r=last(sel);
  R[k+'Bare']={ background:/background:none/.test(r), border:/border:0/.test(r),
                shadow:/box-shadow:none/.test(r),
                bare: /background:none/.test(r)&&/border:0/.test(r)&&/box-shadow:none/.test(r) };
}
// 3. the affix chips are TEXT, not boxes
for(const [k,sel] of [['packBar','#packBar .pbMod'],['headPlate','#headPlate .hpMods span']]){
  const r=last(sel);
  R[k+'Chips']={ noBox:/background:none/.test(r)&&/border:0/.test(r),
                 hasShadow:/text-shadow/.test(r) };
}
// 4. thin bars
R.barHeights={ pack:(last('#packBar .pbTrack').match(/height:(\d+)px/)||[])[1],
               head:(last('#headPlate .hpTrack').match(/height:(\d+)px/)||[])[1] };
R.thin = +R.barHeights.pack <= 8 && +R.barHeights.head <= 6;

// 5. rarity colours still present on BOTH
R.rarity = { packMagic:/#9dc0f0/.test(last('#packBar.magic .pbName')),
             packRare:/#f0d488/.test(last('#packBar.rare .pbName')),
             headMagic:/#9dc0f0/.test(last('#headPlate.magic .hpName')),
             headRare:/#f0d488/.test(last('#headPlate.rare .hpName')) };
R.rarityOnBoth = Object.values(R.rarity).every(Boolean);

// 6. the CSS still parses and the markup still fills
const dom=new JSDOM('<style>'+css.slice(7)+'</style>');
R.rulesParsed = dom.window.document.styleSheets[0].cssRules.length;
// the JS that builds them is untouched
R.markupIntact = /class="pbName"/.test(src) && /class="hpName"/.test(src)
              && /pbFill/.test(src) && /hpFill/.test(src);
console.log(JSON.stringify(R,null,1));
