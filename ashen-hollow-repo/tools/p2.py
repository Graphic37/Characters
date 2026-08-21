src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ------------------------------------------------------------------ CSS
CSS = """
/* ============================ RIFT PICKER (v149) ==========================
   Built to his mockup: two sigil cards, a level plate with its derived
   sub-line, an auto-run row and an info row. Every piece of ART is an <img>
   layered OVER a CSS fallback, so the panel looks finished with no files
   present and looks like the mockup once the PNGs land in the repo. An image
   that 404s removes itself and the fallback shows through. */
#ahWin.riftWin{ width:520px !important; }
.rfHead{ text-align:center; font:11px 'Trebuchet MS',sans-serif; letter-spacing:.26em;
  color:#8b8272; margin:2px 0 14px; }
.rfCards{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.rfCard{ position:relative; cursor:pointer; padding:16px 10px 10px; text-align:center;
  border:1px solid #3a3226; border-radius:2px;
  background:linear-gradient(180deg,#141210,#0c0a08);
  box-shadow:inset 0 0 34px rgba(0,0,0,.75); transition:border-color .15s, box-shadow .15s; }
.rfCard:hover{ border-color:#6d5c36; }
.rfCard.sel{ border-color:#c8a24a;
  background:linear-gradient(180deg,#241c10,#151009);
  box-shadow:0 0 0 1px rgba(200,162,74,.30) inset, 0 0 22px rgba(200,162,74,.16); }
.rfCard.dim{ opacity:.45; cursor:default; }
.rfCard.dim:hover{ border-color:#3a3226; }
.rfSigil{ position:relative; width:118px; height:118px; margin:0 auto 12px; }
.rfSigil .fb{ position:absolute; inset:0; border-radius:50%; }
.rfSigil.neph .fb{ background:
  radial-gradient(circle at 50% 44%, #ffe9ac 0%, #e0a93c 22%, #7a4f14 46%, rgba(20,14,8,.9) 66%, transparent 74%),
  conic-gradient(from 20deg, rgba(255,214,130,.35), rgba(0,0,0,0) 40%, rgba(255,214,130,.35) 80%, rgba(0,0,0,0)); }
.rfSigil.greater .fb{ background:
  radial-gradient(circle at 50% 44%, #e4d2ff 0%, #8a63d8 20%, #3a2a66 46%, rgba(14,10,22,.9) 66%, transparent 74%),
  conic-gradient(from 200deg, rgba(180,140,255,.35), rgba(0,0,0,0) 40%, rgba(180,140,255,.35) 80%, rgba(0,0,0,0)); }
.rfSigil img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.rfName{ position:relative; font:13px 'Trebuchet MS',sans-serif; letter-spacing:.20em;
  color:#8b8272; }
.rfCard.sel .rfName{ color:#f0e2c0; }
.rfName:before, .rfName:after{ content:'\\2666'; font-size:8px; opacity:.55; margin:0 8px;
  vertical-align:middle; }
.rfKeys{ position:absolute; left:50%; transform:translateX(-50%); bottom:34px;
  display:flex; align-items:center; gap:6px; padding:3px 12px;
  background:linear-gradient(180deg,#191512,#0d0b09); border:1px solid #4a3e2b;
  font:10px 'Trebuchet MS',sans-serif; letter-spacing:.12em; color:#cdbf9b; white-space:nowrap; }
.rfKeys img{ width:13px; height:13px; object-fit:contain; }
.rfBlock{ margin-top:12px; padding:12px 14px; border:1px solid #2e281f;
  background:linear-gradient(180deg,rgba(20,18,14,.85),rgba(9,8,6,.85)); text-align:left; }
.rfLabel{ font:10px 'Trebuchet MS',sans-serif; letter-spacing:.24em; color:#8b8272;
  margin-bottom:7px; }
.rfPlate{ position:relative; }
.rfPlate select{ width:100%; -webkit-appearance:none; appearance:none;
  background:linear-gradient(180deg,#100e0b,#191510); color:#e6d5a6;
  border:1px solid #4a3e2b; padding:9px 30px 9px 12px;
  font:14px 'Trebuchet MS',sans-serif; letter-spacing:.04em; cursor:pointer; }
.rfPlate:after{ content:'\\25BE'; position:absolute; right:11px; top:50%;
  transform:translateY(-50%); color:#c8a24a; pointer-events:none; font-size:11px; }
.rfSub{ margin-top:7px; font:11px 'Trebuchet MS',sans-serif; letter-spacing:.10em;
  color:#8b8272; text-align:center; }
.rfRow{ display:flex; align-items:center; gap:13px; }
.rfMedal{ position:relative; width:34px; height:34px; flex:none; }
.rfMedal .fb{ position:absolute; inset:0; border-radius:50%;
  background:radial-gradient(circle at 50% 38%, #2a2419, #100d09 70%);
  border:1px solid #6d5c36; }
.rfMedal img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.rfMedal .gl{ position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; color:#c8a24a; font:13px 'Trebuchet MS',sans-serif; }
.rfRow.off .rfMedal .gl{ color:#5c5346; }
.rfRow.off .rfMedal .fb{ border-color:#3a3226; }
.rfTiny{ font:9px 'Trebuchet MS',sans-serif; letter-spacing:.24em; color:#8b8272; }
.rfTitle{ font:14px 'Trebuchet MS',sans-serif; color:#e6d5a6; margin:2px 0 1px; }
.rfNote{ font:11px 'Trebuchet MS',sans-serif; color:#8b8272; line-height:1.55; }
#ahWin.riftWin .acts button#riftGo{ position:relative; color:#f6e6b6;
  border-color:#8a6f31;
  background:linear-gradient(180deg,#6b5321,#3a2b10 60%,#241a09);
  box-shadow:0 0 0 1px rgba(200,162,74,.30) inset, 0 0 18px rgba(200,162,74,.14);
  font-size:12px; letter-spacing:.22em; }
#ahWin.riftWin .acts button#riftGo:hover{ color:#fff4cf;
  background:linear-gradient(180deg,#7d6127,#452f11 60%,#2a1d0a); }
"""
rep('rift-css', "\n</style>", "\n" + CSS + "\n</style>")

# ------------------------------------------------------------------ PANEL
old_start = """  window.__riftDungeonBlockLast=true;"""
i = src.index(old_start)
j = src.index("""  const acts=document.getElementById('winActs');
  acts.innerHTML='<button id="riftGo">Enter Rift</button>'+
                 '<button id="autoCfg">Automation</button>';""")
old_body = src[i:j]
assert "_card('rtNeph'" in old_body and len(old_body) < 4200, len(old_body)

new_body = """  window.__riftDungeonBlockLast=true;
  /* THE PICKER, BUILT TO HIS MOCKUP (v149).
     Art is loaded from his repo by NAME, so dropping the generated PNGs in
     upgrades the panel with no code change; anything missing removes itself
     and the CSS fallback underneath is what shows. */
  const _keys = (typeof keyCount==='function') ? keyCount() : 0;
  const _maxT = RIFT_CFG.maxTier, _maxG = (typeof GR_CFG!=='undefined') ? GR_CFG.maxTier : _maxT;
  window.__riftKind = window.__riftKind || 'neph';
  if(window.__riftKind==='greater' && _keys<1) window.__riftKind='neph';
  const A = window.RIFT_ART || {};
  const _img = (u, cls) => u ? ('<img class="'+(cls||'')+'" src="'+u+'" alt="" '+
    'onerror="this.remove()">') : '';
  const _card = (id,label,kind,sel,dim,keys) =>
    '<div id="'+id+'" class="rfCard'+(sel?' sel':'')+(dim?' dim':'')+'">'+
      '<div class="rfSigil '+kind+'"><span class="fb"></span>'+_img(A[kind])+'</div>'+
      (keys!==null ? '<div class="rfKeys">'+_img(A.key)+'<span>'+keys+' KEYS</span></div>' : '')+
      '<div class="rfName">'+label+'</div>'+
    '</div>';
  const _lvlNow = Math.min(RIFT.tier||1, _maxT);
  let _lvl='';
  for(let t=1;t<=_maxT;t++) _lvl+='<option value="'+t+'"'+(t===_lvlNow?' selected':'')+'>Level '+t+'</option>';
  const _sub = (t) => 'Area Level '+RIFT_CFG.areaLevel(t)+' \\u00b7 Item Level Cap '+RIFT_CFG.areaLevel(t);
  body.innerHTML =
    '<div class="rfHead">SELECT A RIFT TYPE</div>'+
    '<div class="rfCards">'+
      _card('rtNeph','NEPHALEM','neph', window.__riftKind==='neph', false, null)+
      _card('rtGreater','GREATER','greater', window.__riftKind==='greater', _keys<1, _keys)+
    '</div>'+
    '<div class="rfBlock">'+
      '<div class="rfLabel">RIFT LEVEL</div>'+
      '<div class="rfPlate"><select id="riftLevel">'+_lvl+'</select></div>'+
      '<div class="rfSub" id="riftSub">'+_sub(_lvlNow)+'</div>'+
    '</div>'+
    '<div class="rfBlock"><div class="rfRow'+(RIFT.repeat?'':' off')+'" id="riftRepeatRow" '+
      'style="cursor:pointer">'+
      '<div class="rfMedal"><span class="fb"></span>'+_img(A.check)+
        '<span class="gl" id="riftRepeatTick">'+(RIFT.repeat?'\\u2714':'')+'</span></div>'+
      '<div><div class="rfTiny">AUTO-RUN</div>'+
        '<div class="rfTitle">Repeat Rift</div>'+
        '<div class="rfNote">Continues after boss kills</div></div>'+
    '</div></div>'+
    '<div class="rfBlock"><div class="rfRow">'+
      '<div class="rfMedal"><span class="fb"></span>'+_img(A.info)+
        '<span class="gl">i</span></div>'+
      '<div class="rfNote">Rift level determines area level and maximum dropped '+
        'item level. Each run generates a new map.</div>'+
    '</div></div>';
  document.getElementById('winTitle').textContent='Nephalem Rifts';
  const _win=document.getElementById('ahWin'); if(_win) _win.classList.add('riftWin');
"""
rep('rift-body', old_body, new_body)

# --- wire the new controls (repeat is a row now, and the sub-line is live) ---
rep('rift-wire',
"""  const _pick=(k)=>{ if(k==='greater' && _keys<1){ toastRift('You need a Greater Rift Key.'); return; }
    window.__riftKind=k; closeWin(); winOpen=true; window.openRiftPanel(); };
  document.getElementById('rtNeph').addEventListener('click',()=>_pick('neph'));
  document.getElementById('rtGreater').addEventListener('click',()=>_pick('greater'));
  document.getElementById('riftGo').addEventListener('click',()=>{
    const lvl=+document.getElementById('riftLevel').value;
    const rep=document.getElementById('riftRepeat').checked;
    closeWin();
    if(window.__riftKind==='greater') enterGreaterRift(Math.min(lvl,_maxG));
    else enterRift(Math.min(lvl,_maxT), rep);
  });""",
"""  const _pick=(k)=>{ if(k==='greater' && _keys<1){ toastRift('You need a Greater Rift Key.'); return; }
    window.__riftKind=k; closeWin(); winOpen=true; window.openRiftPanel(); };
  document.getElementById('rtNeph').addEventListener('click',()=>_pick('neph'));
  document.getElementById('rtGreater').addEventListener('click',()=>{
    if(_keys<1){ toastRift('You need a Greater Rift Key.'); return; } _pick('greater'); });
  /* the level plate drives its own sub-line, so the numbers he is choosing
     between are visible before he commits rather than after */
  const _sel=document.getElementById('riftLevel');
  _sel.addEventListener('change',()=>{
    RIFT.tier=+_sel.value;
    document.getElementById('riftSub').textContent=_sub(+_sel.value);
  });
  /* the whole row toggles: a 34px medallion beside a label that does nothing
     when clicked is the same trap as the dead skill dots in v136 */
  const _row=document.getElementById('riftRepeatRow');
  _row.addEventListener('click',()=>{
    RIFT.repeat=!RIFT.repeat;
    _row.classList.toggle('off', !RIFT.repeat);
    document.getElementById('riftRepeatTick').textContent = RIFT.repeat ? '\\u2714' : '';
  });
  document.getElementById('riftGo').addEventListener('click',()=>{
    const lvl=+document.getElementById('riftLevel').value;
    const rep=RIFT.repeat;
    closeWin();
    if(window.__riftKind==='greater') enterGreaterRift(Math.min(lvl,_maxG));
    else enterRift(Math.min(lvl,_maxT), rep);
  });""")

# the riftWin class must come off when the window closes / shows something else
rep('rift-unclass',
"""    document.getElementById('winTitle').textContent='Automation';""",
"""    const _w2=document.getElementById('ahWin'); if(_w2) _w2.classList.remove('riftWin');
    document.getElementById('winTitle').textContent='Automation';""")

# --- the art table, declared next to the panel so it is findable -----------
rep('rift-art-table',
"""window.openRiftPanel=function(){""",
"""/* Rift picker artwork. Same repo and the same raw base as the currency icons.
   Every entry is optional: a missing file leaves the CSS fallback in place.
   Retarget at runtime with RIFT_ART.neph = '<url>' and reopen the panel. */
window.RIFT_ART = {
  neph:    'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-sigil-nephalem.png',
  greater: 'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-sigil-greater.png',
  key:     'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-icon-key.png',
  check:   'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-icon-check.png',
  info:    'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-icon-info.png'
};
window.openRiftPanel=function(){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
