src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. FOUR SOCKETS ON A 3-SLOT SKILL
# ⚠ VISIBLE IN HIS SCREENSHOT. socketsFor() PADS up to the cap and never trims,
# so a save carrying a longer array (or a migration that mapped one) renders a
# fourth circle that can be filled and is then never read by anything.
rep('trim-sockets',
"""    if(!Array.isArray(st.sockets)) st.sockets = [null,null,null];
    while(st.sockets.length < SUPPORT_SLOTS) st.sockets.push(null);
    return st.sockets;""",
"""    if(!Array.isArray(st.sockets)) st.sockets = [null,null,null];
    while(st.sockets.length < SUPPORT_SLOTS) st.sockets.push(null);
    /* AND TRIM. Padding without trimming let a stale save render a fourth
       socket — fillable, and read by nothing. */
    if(st.sockets.length > SUPPORT_SLOTS) st.sockets.length = SUPPORT_SLOTS;
    return st.sockets;""")

# ============================================ 2. THE BREAKDOWN THE ARROW OPENS
rep('breakdown-fields',
"""    return { hit:Math.round(perHit), burst:Math.round(burst),
             dps:Math.round(burst*rate), hits:C.hits, tag:C.tag,
             supports:sup.names, gemMult:gem, supportMult:sup.more,
             speedMult:sup.speed };""",
"""    return { hit:Math.round(perHit), burst:Math.round(burst),
             dps:Math.round(burst*rate), hits:C.hits, tag:C.tag,
             supports:sup.names, gemMult:gem, supportMult:sup.more,
             speedMult:sup.speed,
             /* the inputs, so the drawer can show its working rather than
                recomputing them and drifting from the number above it */
             weaponAvg:w.avg, gearFlat:gearFlat(), coef:C.coef,
             gearMult:gearMult(), critAvg:critAvg, rate:rate,
             crit:w.crit, critMult:w.cm };""")

# ============================================ 3. THE ARROW DOES SOMETHING
rep('arrow-markup',
"""          '<div class="skArrow">\\u25B6</div>'+""",
"""          '<button class="skArrow" data-detail="'+id+'" '+
            'title="Show the damage breakdown">\\u25B6</button>'+""")

rep('arrow-drawer',
"""        '<div class="skBot">'+""",
"""        '<div class="skDetail" data-detailfor="'+id+'" style="display:none"></div>'+
        '<div class="skBot">'+""")

rep('arrow-handler',
"""    /* the chevron folds the socket rail away. update() only ever patches
       VALUES, so the inline display it sets here survives a refresh. */""",
"""    /* THE ARROW USED TO BE DECORATION. I added it in v163 to match his
       reference and never gave it a job — the exact "control that does
       nothing" trap this file has been bitten by before. It opens the damage
       breakdown: every number in it is already computed by skillDamage(), so
       the drawer shows the working behind the headline rather than a second
       calculation that can drift from it. */
    var det = t && t.closest && t.closest('[data-detail]');
    if(det){
      e.preventDefault(); e.stopPropagation();
      var did = det.dataset.detail;
      var panel = document.querySelector('[data-detailfor="'+did+'"]');
      if(panel){
        var open = panel.style.display !== 'none';
        if(open){ panel.style.display='none'; det.classList.remove('on'); }
        else {
          panel.innerHTML = detailHTML(did);
          panel.style.display='';
          det.classList.add('on');
        }
      }
      return;
    }

    /* the chevron folds the socket rail away. update() only ever patches
       VALUES, so the inline display it sets here survives a refresh. */""")

rep('detail-html',
"""  /* ---- rendering --------------------------------------------------------- */""",
"""  /* The breakdown. Reads ONLY what skillDamage already returned, so the drawer
     and the headline can never disagree. */
  function detailHTML(id){
    try{
      var D = skillDamage(id) || {};
      var sk = has('SKILLS') ? SKILLS[id] : null;
      var n = function(v,d){ return (v===undefined||v===null) ? '—' :
                (typeof v==='number' ? v.toFixed(d===undefined?2:d) : v); };
      var row = function(k,v,note){
        return '<div class="sdRow"><i>'+k+'</i><b>'+v+'</b>'+
               (note?'<em>'+note+'</em>':'')+'</div>';
      };
      var base = (D.weaponAvg||0) + (D.gearFlat||0);
      var sups = (D.supports && D.supports.length) ? D.supports.join(', ') : 'none socketed';
      var html =
        '<div class="sdGrid">'+
          row('Weapon average', n(D.weaponAvg,1)) +
          row('Flat from gear', '+'+n(D.gearFlat,0)) +
          row('Base per hit', n(base,1)) +
          row('Skill coefficient', 'x'+n(D.coef)) +
          row('Gem level', 'x'+n(D.gemMult)) +
          row('Supports', 'x'+n(D.supportMult), sups) +
          row('Gear multipliers', 'x'+n(D.gearMult)) +
          row('Crit (expected)', 'x'+n(D.critAvg),
              n(D.crit,0)+'% at '+n(D.critMult,0)+'%') +
        '</div>'+
        '<div class="sdOut">'+
          '<span><i>PER HIT</i><b>'+(D.hit||0).toLocaleString()+'</b></span>'+
          '<span><i>HITS</i><b>'+(D.hits||1)+'</b></span>'+
          '<span><i>BURST</i><b>'+(D.burst||0).toLocaleString()+'</b></span>'+
          '<span><i>DPS</i><b>'+(D.dps||0).toLocaleString()+'</b></span>'+
        '</div>';
      if(D.speedMult && D.speedMult!==1)
        html += '<div class="sdNote">Attack speed x'+n(D.speedMult)+
                ' from supports — counted on the rate, not the hit.</div>';
      if(sk && sk.cd)
        html += '<div class="sdNote">On a '+sk.cd+'s cooldown, so it is judged '+
                'by the hit it lands rather than sustained damage.</div>';
      return html;
    }catch(e){
      window.ahErr&&window.ahErr(e,'detailHTML');
      return '<div class="sdNote">No breakdown available.</div>';
    }
  }
  window.skillDetailHTML = detailHTML;

  /* ---- rendering --------------------------------------------------------- */""")

CSS = """
/* ---- the skill damage breakdown (v178) -----------------------------------
   Opened by the arrow, which was decoration until now. Sits between the header
   and the socket rail so the row still reads top-to-bottom. */
#skillPanel .skArrow{
  width:14px; height:26px; padding:0; cursor:pointer; line-height:1;
  display:flex; align-items:center; justify-content:center;
  background:transparent; border:0; color:#8f8straight;
  color:#8f8straight; font-size:11px;
  transition:transform .15s ease, color .15s ease;
}
#skillPanel .skArrow{ color:#9a9membered; }
.skArrow{ color:#a89c76 !important; background:transparent !important; border:0 !important; }
.skArrow:hover{ color:#f2e3b4 !important; }
.skArrow.on{ transform:rotate(90deg); color:#f2e3b4 !important; }
.skDetail{
  padding:8px 9px 9px; border-bottom:1px solid #2a2d25;
  background:linear-gradient(#0b0d0b,#080a08);
}
.sdGrid{ display:grid; grid-template-columns:1fr auto; gap:2px 10px; }
.sdRow{ display:contents }
.sdRow i{ grid-column:1; font:11px "Trebuchet MS",sans-serif; font-style:normal;
  color:#8d876f; white-space:nowrap }
.sdRow b{ grid-column:2; font:600 11.5px "Trebuchet MS",sans-serif; color:#ddd3b2;
  text-align:right }
.sdRow em{ grid-column:1 / -1; font:10px "Trebuchet MS",sans-serif; font-style:normal;
  color:#6f695c; margin:-1px 0 3px; }
.sdOut{ display:flex; gap:6px; margin-top:8px; }
.sdOut span{ flex:1; text-align:center; padding:5px 2px;
  border:1px solid #36392e; background:linear-gradient(#0d100d,#070807); }
.sdOut i{ display:block; font:600 7.5px "Trebuchet MS",sans-serif; font-style:normal;
  letter-spacing:.14em; color:#6e6a58 }
.sdOut b{ display:block; font:600 13px "Trebuchet MS",sans-serif; color:#e9e2c6;
  margin-top:2px }
.sdNote{ margin-top:7px; font:10.5px "Trebuchet MS",sans-serif; color:#6f695c;
  line-height:1.5 }
"""
rep('detail-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
