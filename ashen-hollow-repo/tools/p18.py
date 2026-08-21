src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================================== MARKUP
# Every data hook is preserved verbatim — data-skill, data-toggle, data-sock,
# data-uid, and the classes update() patches (.skDot .skLvl b .skDmg b/span
# .skStat .skSock). update() queries them ROW-SCOPED, so moving the status
# light down into the socket line is safe and nothing else has to change.
rep('row-markup',
"""      var lock = isLocked(id);
      return '<div class="skRow'+(on?' on':'')+(ult?' ult':'')+(lock?' locked':'')+'" data-skill="'+id+'">'+
        '<div class="skTop">'+
          '<button class="skDot'+(on?' on':'')+(lock?' locked':'')+'" data-toggle="'+id+'" '+
            'title="'+(lock ? (id===LOCKED_PRIMARY?'Always your primary':'Always your ultimate')
                            : (on?'Active — click to disable':'Inactive — click to enable'))+'"></button>'+
          '<div class="skArt">'+art+'</div>'+
          '<div class="skMain">'+
            '<div class="skName">'+sk.n+'<span class="skTag">'+D.tag+'</span></div>'+
            '<div class="skStat">'+costLine(id)+
              (D.hits>1 ? '<em>'+D.hits+' hits · '+D.hit.toLocaleString()+' ea</em>' : '')+
            '</div>'+
          '</div>'+
          '<div class="skLvl">LEVEL <b>'+lvl+'</b></div>'+
          '<div class="skDmg" title="weapon x skill x gem x supports x gear x crit">'+
            '<b>'+headline.toLocaleString()+'</b><span>'+headLbl+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="skBot">'+sockHTML+'</div>'+
      '</div>';""",
"""      var lock = isLocked(id);
      /* PoE2 COMPACT LAYOUT (v163): a header line of aligned columns — chevron,
         gem, name, level, a recessed damage field — over a socket rail carrying
         the status light and the support rings. */
      return '<div class="skRow'+(on?' on':'')+(ult?' ult':'')+(lock?' locked':'')+'" data-skill="'+id+'">'+
        '<div class="skTop">'+
          '<button class="skCollapse" data-collapse="'+id+'" title="Collapse">\\u25B2</button>'+
          '<div class="skArt">'+art+'</div>'+
          '<div class="skMain">'+
            '<div class="skName">'+sk.n+'<span class="skTag">'+D.tag+'</span></div>'+
            '<div class="skStat">'+costLine(id)+
              (D.hits>1 ? '<em>'+D.hits+' hits · '+D.hit.toLocaleString()+' ea</em>' : '')+
            '</div>'+
          '</div>'+
          '<div class="skLvl">LEVEL <b>'+lvl+'</b></div>'+
          '<div class="skDmg" title="weapon x skill x gem x supports x gear x crit">'+
            '<b>'+headline.toLocaleString()+'</b><span>'+headLbl+'</span>'+
          '</div>'+
          '<div class="skArrow">\\u25B6</div>'+
        '</div>'+
        '<div class="skBot">'+
          '<button class="skDot'+(on?' on':'')+(lock?' locked':'')+'" data-toggle="'+id+'" '+
            'title="'+(lock ? (id===LOCKED_PRIMARY?'Always your primary':'Always your ultimate')
                            : (on?'Active — click to disable':'Inactive — click to enable'))+'"></button>'+
          sockHTML+
          '<div class="skHint">supports</div>'+
        '</div>'+
      '</div>';""")

# the collapse chevron must actually collapse, or it is another dead control
rep('collapse-handler',
"""    var dot = t && t.closest && t.closest('[data-toggle]');
    if(dot){ e.preventDefault(); e.stopPropagation(); toggle(dot.dataset.toggle); return; }""",
"""    var dot = t && t.closest && t.closest('[data-toggle]');
    if(dot){ e.preventDefault(); e.stopPropagation(); toggle(dot.dataset.toggle); return; }

    /* the chevron folds the socket rail away. update() only ever patches
       VALUES, so the inline display it sets here survives a refresh. */
    var col = t && t.closest && t.closest('[data-collapse]');
    if(col){
      e.preventDefault(); e.stopPropagation();
      var rw = col.closest('.skRow'), bot = rw && rw.querySelector('.skBot');
      if(bot){
        var hidden = bot.style.display === 'none';
        bot.style.display = hidden ? '' : 'none';
        col.textContent = hidden ? '\\u25B2' : '\\u25BC';
      }
      return;
    }""")

# ======================================================================== CSS
CSS = """
/* =============== SKILLS PANEL — PoE2 COMPACT LAYOUT (v163) ================
   Rebuilt to his reference. The change that does the work is COLUMNS: the
   header line is a grid, so the name, level and damage of every skill land on
   the same x across all eleven rows. The old flex row let each one sit
   wherever its neighbour's width left it, which is why it read as a list of
   unrelated blocks rather than a table you can scan down. */
.skRow{
  display:block; padding:0 !important; margin-bottom:6px;
  border:1px solid #34382e; border-radius:2px; overflow:hidden;
  background:linear-gradient(90deg,#111410,#0d100e 65%,#111410);
  box-shadow:0 0 0 1px #050605, inset 0 1px rgba(255,255,255,.025);
}
.skTop{
  display:grid !important;
  grid-template-columns:20px 34px minmax(0,1fr) 62px 74px 14px;
  gap:6px; align-items:center; padding:5px 7px;
  background:
    linear-gradient(90deg,rgba(255,255,255,.025),transparent 18%,transparent 80%,rgba(255,255,255,.014)),
    linear-gradient(#191c18,#0d100d);
  border-bottom:1px solid #2a2d25;
}
.skCollapse{
  width:20px; height:26px; padding:0; cursor:pointer; font-size:9px; line-height:1;
  display:flex; align-items:center; justify-content:center;
  border:1px solid #45483a; color:#aaa17e;
  background:linear-gradient(#25291f,#0e110e);
  box-shadow:inset 0 0 0 1px #090b08;
}
.skCollapse:hover{ border-color:#817955; color:#fff4c5 }
/* the gem sits in a recessed tile rather than floating on the row */
.skArt{
  width:34px !important; height:34px !important; border-radius:3px;
  border:1px solid #596052; background:#0c1415; overflow:hidden;
  display:flex; align-items:center; justify-content:center; position:relative;
  box-shadow:inset 0 0 8px #000, 0 0 0 1px #060706;
}
.skArt::after{ content:''; position:absolute; inset:1px;
  border:1px solid rgba(255,255,255,.06); pointer-events:none }
.skArt svg, .skArt img{ width:31px; height:31px; object-fit:contain }
.skName{ font:600 12px var(--f-disp,Georgia); letter-spacing:.045em;
  text-transform:uppercase; color:#c5bb98;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.skTag{ font:600 7.5px "Trebuchet MS",sans-serif; letter-spacing:.12em;
  color:#77715c; margin-left:7px; vertical-align:2px }
.skLvl{ font:600 8.5px "Trebuchet MS",sans-serif; letter-spacing:.10em;
  color:#8f896e; text-align:right; white-space:nowrap; text-transform:uppercase }
.skLvl b{ font:400 12px "Trebuchet MS",sans-serif; color:#d1c59a; margin-left:5px }
/* the headline number, in a recessed field — the thing the panel exists for */
.skDmg{
  height:26px; min-width:0 !important; position:relative;
  display:flex; align-items:center; justify-content:flex-end; gap:5px;
  padding:0 7px; border:1px solid #36392e;
  background:linear-gradient(#0b0d0b,#070807); box-shadow:inset 0 0 8px #000;
}
.skDmg b{ display:inline !important; font:600 12px "Trebuchet MS",sans-serif !important;
  color:#e6e1c9 !important; line-height:1 }
.skDmg span{ font:600 6.5px "Trebuchet MS",sans-serif; letter-spacing:.14em; color:#6e6a58 }
.skArrow{ color:#d0c69d; font-size:11px; text-align:center }
/* the socket rail */
.skBot{
  display:grid !important;
  grid-template-columns:20px minmax(0,1fr) auto;
  gap:6px; align-items:center; margin:0 !important; padding:5px 7px 6px;
  background:
    linear-gradient(90deg,rgba(0,0,0,.18),transparent 18%,transparent 80%,rgba(0,0,0,.2)),
    #0b0d0b;
}
.skDot{ justify-self:center }
.skHint{ font:600 7.5px "Trebuchet MS",sans-serif; letter-spacing:.08em;
  color:#5f6254; text-transform:uppercase; text-align:right }
.skSocks{ display:flex; align-items:center; gap:5px; min-width:0; overflow:hidden }
/* the concentric stone ring from the reference, drawn in one gradient */
.skSock{
  width:28px !important; height:28px !important; flex:0 0 auto;
  border:0 !important; border-radius:50%; position:relative; cursor:pointer;
  background:radial-gradient(circle at 50% 50%,
    #090b09 0 49%, #23271f 51% 55%, #5b5d4b 56% 58%, #1d211b 60% 66%, #080a08 68%) !important;
  box-shadow:inset 0 0 8px #000, 0 0 0 1px #070807;
  overflow:visible !important;
}
.skSock::before{ content:''; position:absolute; inset:4px; border-radius:50%;
  border:1px solid #30352b; box-shadow:inset 0 0 5px #000; pointer-events:none }
.skSock.filled{ box-shadow:inset 0 0 8px #000, 0 0 0 1px #070807,
  0 0 7px rgba(120,190,255,.28) }
.skSock:hover{ box-shadow:inset 0 0 8px #000, 0 0 0 1px #86b7df,
  0 0 9px rgba(140,200,255,.45) }
.skSock .skSockArt{ inset:5px !important }
/* the ULTIMATE divider, with rules running out from the word */
.skHead{ display:flex; align-items:center; gap:10px }
.skHead::before, .skHead::after{ content:''; height:1px; flex:1;
  background:linear-gradient(90deg,transparent,#6a6042,#2d3027) }
.skHead::after{ background:linear-gradient(90deg,#2d3027,#6a6042,transparent) }
.skHead span{ flex:0 0 auto }
.skRow.ult .skTop{ background:linear-gradient(#1d1a11,#0f0e0a) }
.skRow.ult .skName{ color:#e1d49d }
/* paired mode gets the extra room the reference assumes */
body.pairOpen .skRow{ padding:0 !important }
body.pairOpen .skTop{ grid-template-columns:22px 38px minmax(0,1fr) 78px 88px 16px;
  padding:6px 9px }
body.pairOpen .skBot{ grid-template-columns:22px minmax(0,1fr) auto; padding:6px 9px 7px }
body.pairOpen .skName{ font-size:13.5px }
body.pairOpen .skDmg{ height:28px }
body.pairOpen .skDmg b{ font-size:14px !important }
body.pairOpen .skSock{ width:34px !important; height:34px !important }
body.pairOpen .skArt{ width:38px !important; height:38px !important }
body.pairOpen .skArt svg, body.pairOpen .skArt img{ width:35px; height:35px }
"""
rep('skills-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
