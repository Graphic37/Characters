// the vault door banks; Veyra keeps only contracts; tooltips grew again
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. F deposits AT THE VAULT, not at Veyra -------------------------
{
  const a=src.indexOf('function veyraStation(){');
  const b=src.indexOf('window.nearVeyra=nearVeyra;');
  function run(stationName, heroAt, mode){
    const st={ name:stationName, pos:{x:0,z:0}, r:2.8 };
    const sb={ console, Math, WORLD:{mode},
      AH_WORLD:{ stations:[ {name:'Veyra', pos:{x:40,z:0}, r:3.6}, st ],
                 player:{position:{x:heroAt[0], z:heroAt[1]}} },
      ahErr:()=>{} };
    sb.window=sb;
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\nthis.N=nearVeyra; this.S=veyraStation;', sb, {filename:'v.js'});
    return { station:sb.S() && sb.S().name, near:sb.N() };
  }
  R.gate = {
    atVault:    run('Stash', [1,1], 'TOWN'),
    awayFromIt: run('Stash', [20,0], 'TOWN'),
    inRift:     run('Stash', [1,1], 'RIFT')
  };
  R.banksAtTheVault = R.gate.atVault.station==='Stash' && R.gate.atVault.near===true
                   && R.gate.awayFromIt.near===false && R.gate.inRift.near===false;
  R.toastNamesVault = /toast\('Bank at the Vault'\)/.test(code);
  R.autoWalksToVault = /autoWalkToStation\('Stash', once\)/.test(code);
  R.helpUpdated = /Deposit all at the Vault/.test(code);
}

// ---- 2. the station advertises BOTH keys ------------------------------
{
  const m=/stations\.push\(\{name:'Stash',([\s\S]{0,320}?)\}\);/.exec(code);
  const s=m[1].replace(/\s+/g,' ');
  R.station = { prompt:/prompt:'Open Vault'/.test(s),
                key2:/key2:'F'/.test(s),
                prompt2:/prompt2:'Deposit all'/.test(s),
                title:/title:'The Vault'/.test(s) };
  R.stationAdvertisesBoth = Object.values(R.station).every(Boolean);
  // E on the Stash still opens both panels
  R.eOpensBoth = /if\(name==='Stash'\)\{ open\('stashPanel'\); open\('invPanel'\); return true; \}/.test(code);
}

// ---- 3. Veyra no longer banks --------------------------------------------
// ⚠ v238: the `crafting()` building no longer pushes a Veyra station at all —
// the ONE definition lives in `spawnStandaloneNPC`, which is what the authored
// town calls. Assert against THAT, not against a dead procedural push.
{
  const f=/occultist:\{name:'Veyra',([\s\S]{0,400}?)\}\n/.exec(code);
  const s=(f?f[1]:'').replace(/\s+/g,' ');
  R.veyra = { noKey2:!/key2:/.test(s), noBankPrompt:!/Bank/.test(s),
              role:'Contracts',
              actsContractsOnly:/acts:\['Contracts'\]/.test(s) };
  R.veyraContractsOnly = R.veyra.noKey2 && R.veyra.noBankPrompt
                      && R.veyra.actsContractsOnly;
}

// ---- 4. tooltips grew, and WIDTH kept pace ----------------------------
{
  const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
               .replace(/\/\*[\s\S]*?\*\//g,'');
  const last=(sel)=>{ const re=new RegExp(sel+'\\{([^}]*)\\}','g');
    let m,v=null; while((m=re.exec(css))) v=m[1]; return (v||'').replace(/\s+/g,' '); };
  const num=(r,p)=>{ const m=new RegExp(p+':([\\d.]+)px').exec(r); return m?+m[1]:null; };
  R.tip = {
    width: num(last('body\\[data-skin="forged"\\] #tipwrap \\.tip'), 'width'),
    name:  num(last('body\\[data-skin="forged"\\] #tipwrap \\.tip-name'), 'font-size'),
    mod:   num(last('#tipwrap \\.tip \\.mod'), 'font-size'),
    rune:  num(last('#tipwrap \\.tip \\.runeline'), 'font-size')
  };
  R.biggerThanV217 = R.tip.width>356 && R.tip.mod>13 && R.tip.name>16.5;
  // ⚠ same rule as v217: width must grow at least as fast as the type, or
  // affixes wrap and it reads WORSE despite being bigger
  R.widthKeptPace = (R.tip.width/356) >= (R.tip.mod/13) - 0.01;
  R.runeMatchesAffix = R.tip.rune===R.tip.mod;
}
console.log(JSON.stringify(R,null,1));
