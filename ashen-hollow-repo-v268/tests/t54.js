const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the tooltip refreshes in place ---------------------------------
{
  const a=src.indexOf('function refreshOpenTip(){');
  const b=src.indexOf('function showTip(it, ev, isEquipped){');
  const dom=new JSDOM('<div id="t"></div>');
  const TIP=dom.window.document.getElementById('t');
  TIP.style.display='flex'; TIP.dataset.item='7'; TIP.dataset.eq='0';
  TIP.dataset.key='i7';                      // the no-flicker cache
  let shown=0, keyAtCall=null;
  const sb={ console, TIP, ITEM_BY_UID:{7:{uid:7,name:'Helm'}},
    showTip:(it,ev,eq)=>{ shown++; keyAtCall=TIP.dataset.key; } };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.F=refreshOpenTip;', sb, {filename:'r.js'});
  sb.F();
  R.tipRefresh={ calledShowTip:shown===1,
    /* ⚠ the cache MUST be cleared first or showTip returns early and nothing
       redraws — that is precisely why the quality bump was invisible */
    clearedCacheFirst: keyAtCall==='' };
  // closed tooltip: must do nothing
  TIP.style.display='none'; shown=0; sb.F();
  R.tipRefresh.inertWhenClosed = shown===0;
  // missing item: must not throw
  TIP.style.display='flex'; TIP.dataset.item='999'; shown=0;
  let threw=false; try{ sb.F(); }catch(e){ threw=true; }
  R.tipRefresh.missingItemSafe = !threw && shown===0;
}
R.currencyRefreshes = /function consumeCurrency\(cur\)\{\s*refreshTipAfterCurrency\(\);/.test(src);

// ---- 2. the pack-bar chip cap was RETIRED WITH THE BAR (v208) -----------
// eliteHud owns the top of the screen and has its own affix caps. Testing the
// retired renderer would assert behaviour the game deliberately no longer has.
R.chipCapRetired = /function updatePackBar_retired/.test(src);

// ---- 3. the head plate ---------------------------------------------------
{
  const a=src.indexOf('const HEADPLATE = { el:null');
  const b=src.indexOf('function updatePackBar(){');
  const dom=new JSDOM('<body></body>');
  const V=function(x,y,z){ this.x=x;this.y=y;this.z=z;
    this.project=function(){ this.x=0.2; this.y=0.4; this.z=0.5; return this; }; };
  function world(e, t){
    const sb={console, document:dom.window.document, RIFT:{active:true},
      THREE:{Vector3:V}, camera:{}, innerWidth:1920, innerHeight:1080,
      performance:{now:()=>t*1000}};
    sb.window=sb; vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+
      '\nthis.N=window.notePlateTarget; this.U=updateHeadPlate; this.H=HEADPLATE;',
      sb, {filename:'h.js'});
    return sb;
  }
  const e={dead:false, elitePack:'rare', archName:'Siegemaster', hp:60, maxHp:100,
           mods:['Vampiric','Frozen','Shadow Enchanted','Extra'], bodyRadius:0.6,
           g:{position:{x:5,y:0,z:5}}};
  const w=world(e, 100);
  w.N(e); w.U();
  const el=dom.window.document.getElementById('headPlate');
  R.plate={ on:el.classList.contains('on'), rare:el.classList.contains('rare'),
    name:el.querySelector('.hpName').textContent,
    fill:el.querySelector('.hpFill').style.width,
    chips:[...el.querySelectorAll('.hpMods span')].map(x=>x.textContent),
    positionedByTransform:/translate\(/.test(el.style.transform) };
  R.plateChipsCapped = R.plate.chips.length===3;
  // a NON-elite must never claim the plate
  w.N({dead:false, archName:'Grunt', g:{position:{x:1,y:0,z:1}}});
  R.nonEliteIgnored = w.H.e===e;
  // death drops it
  e.dead=true; w.U();
  R.dropsOnDeath = !el.classList.contains('on') && w.H.e===null;
}
console.log(JSON.stringify(R,null,1));
