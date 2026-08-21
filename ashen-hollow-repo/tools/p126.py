src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('pips',
"""      const rs=it.runes||[];
      let pips='';
      for(let i=0;i<scap;i++) pips+='<span class="sockpip'+(rs[i]?' full':'')+'"></span>';
      b+='<hr><div class="prop">Sockets: <b>'+pips+'</b></div>';""",
"""      /* ⚠ A COLOURED DOT SAYS "FULL", NOT "WHAT". The socket row showed a
         solid pip per socket, so a filled one told him a rune was in there and
         nothing else — he had to read the grant lines below and match them up
         himself. `RUNE_ART` is keyed by rune TYPE and a socketed rune stores
         its `runeType`, so the actual art is already available. */
      const rs=it.runes||[];
      let pips='';
      for(let i=0;i<scap;i++){
        const r=rs[i];
        const art=(r && window.RUNE_ART && RUNE_ART[r.runeType]) || '';
        pips += '<span class="sockpip'+(r?' full':'')+'"'+
                (r? ' title="'+(r.name||'')+(r.tier?' (T'+r.tier+')':'')+'"':'')+'>'+
                (art? '<img src="'+art+'" alt="" draggable="false">' : '')+
                (r && !art ? '<i class="sockTier">T'+r.tier+'</i>' : '')+
                '</span>';
      }
      b+='<hr><div class="prop sockRow">Sockets: <b>'+pips+'</b></div>';""")

CSS = """
/* ---- sockets that show the rune, not a dot (v244) ------------------------ */
#tipwrap .tip .sockRow .sockpip{
  width:26px; height:26px; vertical-align:middle; margin-right:5px;
  border-radius:50%; position:relative; overflow:hidden;
  display:inline-flex; align-items:center; justify-content:center;
  border:1px solid #4a4335;
  background:radial-gradient(circle at 42% 34%, #1c1f18, #0a0c08);
  box-shadow:inset 0 1px 3px rgba(0,0,0,.8);
}
#tipwrap .tip .sockRow .sockpip.full{ border-color:#6b5a33 }
#tipwrap .tip .sockRow .sockpip img{
  width:88%; height:88%; object-fit:contain; pointer-events:none;
}
#tipwrap .tip .sockRow .sockTier{
  font:700 10px "Trebuchet MS",sans-serif; font-style:normal; color:#c0abe6;
}

/* ---- PoE2-style sockets ON the item art (v244) ---------------------------
   Big circles centred on the icon, not a row of dots beside it. The grid cell
   already positions the art; these sit over it. */
.item .sockOverlay{
  position:absolute; inset:0; display:flex; flex-wrap:wrap;
  align-items:center; justify-content:center; gap:4px;
  pointer-events:none; padding:12%;
}
.item .sockOverlay .os{
  width:min(34%, 22px); aspect-ratio:1; border-radius:50%;
  border:2px solid rgba(0,0,0,.75);
  background:radial-gradient(circle at 40% 32%, rgba(30,34,26,.94), rgba(6,8,5,.96));
  box-shadow:0 1px 3px rgba(0,0,0,.9), inset 0 1px 2px rgba(0,0,0,.8);
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.item .sockOverlay .os.full{ border-color:rgba(200,162,74,.85) }
.item .sockOverlay .os img{ width:92%; height:92%; object-fit:contain }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
