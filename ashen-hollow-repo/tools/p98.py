src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('wire',
"""  document.querySelectorAll('#winBody [data-buyslot]').forEach(el=>""",
"""  /* ⚠ WIDE ONLY ON THIS TAB. A 640px window would make the salvage and vendor
     lists look thin and empty; they are lists and read fine at 440. */
  garWide(GAR.tab==='slots');
  /* selecting a skill repaints the detail — and GAR.slotSel survives it, so
     the panel does not jump back to the first skill after every purchase */
  document.querySelectorAll('#winBody [data-slotsel]').forEach(el=>
    garSafeClick(el, ()=>{ GAR.slotSel=el.dataset.slotsel; garrickPanel('slots'); }));
  document.querySelectorAll('#winBody [data-buyslot]').forEach(el=>""")

rep('maxed-toast',
"""        try{ toast('That skill already has all three support slots.'); }catch(e){}""",
"""        /* ⚠ said "three" — the cap has been five since v218 */
        try{ toast('That skill already has every support slot.'); }catch(e){}""")

# the other Garrick tabs must drop the wide class
rep('narrow',
"""  stationPanel('Garrick · Workshop', garTabBar(GAR.tab)+body, [
    {id:'garClose', label:'Close', onClick:()=>closeWin()}
  ]);
  garWireTabs();""",
"""  stationPanel('Garrick · Workshop', garTabBar(GAR.tab)+body, [
    {id:'garClose', label:'Close', onClick:()=>closeWin()}
  ]);
  garWireTabs();
  garWide(GAR.tab==='slots');""")

CSS = """
/* ---- Garrick's workshop board (v228) -------------------------------------
   ⚠ THE WINDOW IS THE CONSTRAINT, NOT THE ROWS. At 440px every element in a
   five-slot ladder gets ~70px and cannot be anything but a chip. This class is
   applied ONLY while the Support Slots tab is open. */
#ahWin.wide{ width:660px }

.gsHelp{
  font:12px "Trebuchet MS",sans-serif; color:#8a8471; line-height:1.55;
  margin-bottom:12px; max-width:56ch;
}
.gsWrap{ display:grid; grid-template-columns:196px minmax(0,1fr); gap:14px }

/* left: the skill list */
.gsList{
  max-height:330px; overflow-y:auto;
  border:1px solid #2a2e26; background:rgba(6,8,6,.5); padding:5px;
}
.gsRow{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  width:100%; padding:9px 10px; margin-bottom:3px; cursor:pointer; text-align:left;
  border:1px solid transparent; background:transparent;
  font:600 13px "Trebuchet MS",sans-serif; color:#a9a191;
}
.gsRow:hover{ border-color:#3d4234; color:#cfc7a8 }
.gsRow.on{
  border-color:#c8a24a; color:#f0e3c2;
  background:linear-gradient(180deg,rgba(60,46,18,.55),rgba(24,19,10,.55));
}
.gsRowSlots{ font:600 11px "Trebuchet MS",sans-serif; color:#7d7768; flex:none }
.gsRow.on .gsRowSlots{ color:#e0c07a }
.gsRowSlots.full{ color:#2fa39a }

/* right: the selected skill */
.gsDetail{
  border:1px solid #34382e; padding:15px 17px 16px;
  background:linear-gradient(180deg,rgba(24,20,12,.72),rgba(10,10,8,.72));
}
.gsHead{ border-bottom:1px solid #2a2e26; padding-bottom:11px; margin-bottom:14px }
.gsName{
  font:700 21px "Cinzel",Georgia,serif; letter-spacing:.04em; color:#f0e3c2;
  text-shadow:0 2px 6px #000;
}
.gsSub{ font:12px "Trebuchet MS",sans-serif; color:#8a8471; margin-top:4px }
.gsSub b{ color:#e0c07a; font-size:13.5px; margin-left:3px }

/* the socket ladder, at a size worth reading */
.gsSocks{ display:flex; gap:9px; margin-bottom:16px }
.gsSock{ flex:1; text-align:center }
.gsSockDot{
  height:38px; display:flex; align-items:center; justify-content:center;
  border:1px solid #34382e; background:radial-gradient(circle at 50% 42%,#14170f,#080a06);
  margin-bottom:5px;
}
.gsSockDot i{
  display:block; width:15px; height:15px; border-radius:50%;
  background:radial-gradient(circle at 38% 32%,#cfe8dd,#2fa39a 62%,#0a0c08);
  box-shadow:0 0 9px rgba(47,163,154,.65);
}
.gsSock.next .gsSockDot{
  border-color:#c8a24a; box-shadow:0 0 11px rgba(200,162,74,.35) inset;
}
.gsSock.far .gsSockDot{ opacity:.5 }
.gsSockNo{ font:600 9.5px "Trebuchet MS",sans-serif; letter-spacing:.1em;
  text-transform:uppercase; color:#6f695c }
.gsSockCost{ font:600 11.5px "Trebuchet MS",sans-serif; margin-top:2px; color:#5f6874 }
.gsSock.own .gsSockCost{ color:#2fa39a }
.gsSock.own .gsSockNo{ color:#8a9a86 }
.gsSock.next .gsSockCost{ color:#f0d488 }
.gsSock.next .gsSockNo{ color:#c8a24a }

/* the purchase box — the biggest thing on the panel, deliberately */
.gsAct{
  border:1px solid #6b5a33; padding:14px 16px;
  background:linear-gradient(180deg,rgba(42,35,19,.75),rgba(18,15,9,.75));
}
.gsAct.maxed{ border-color:#2f6b64;
  background:linear-gradient(180deg,rgba(18,40,37,.6),rgba(9,18,17,.6)) }
.gsActLabel{
  font:600 9.5px "Trebuchet MS",sans-serif; letter-spacing:.2em;
  text-transform:uppercase; color:#8a8471; margin-bottom:5px;
}
.gsActBig{ font:700 17px "Trebuchet MS",sans-serif; color:#f0e3c2 }
.gsAct.maxed .gsActBig{ color:#8fe0d6 }
.gsActCost{
  font:700 25px "Cinzel",Georgia,serif; color:#f0d488; margin:7px 0 12px;
  text-shadow:0 2px 6px #000;
}
.gsActCost span{ font:600 12px "Trebuchet MS",sans-serif; color:#8a8471;
  letter-spacing:.12em; margin-left:5px }
.gsActNote{ font:12px "Trebuchet MS",sans-serif; color:#7d8a86 }
.gsBuy{
  display:block; width:100%; padding:11px; cursor:pointer;
  font:700 13px "Trebuchet MS",sans-serif; letter-spacing:.16em;
  text-transform:uppercase; color:#1a1206;
  border:1px solid #e0c07a;
  background:linear-gradient(180deg,#f0d488,#c8a24a 55%,#8a6a1c);
}
.gsBuy:hover{ background:linear-gradient(180deg,#fbe6a6,#dcb85e 55%,#a07f27) }
.gsShort{
  padding:10px; text-align:center; color:#c06a58;
  font:600 12px "Trebuchet MS",sans-serif; letter-spacing:.06em;
  border:1px dashed #5a3a32;
}

/* the gold bar — this is a gold sink, so gold gets stated properly */
.gsFoot{
  display:flex; align-items:center; justify-content:space-between;
  margin-top:14px; padding-top:12px; border-top:1px solid #2a2e26;
}
.gsGold{ display:flex; align-items:center; gap:9px }
.gsGold span{ font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.18em;
  text-transform:uppercase; color:#8a8471 }
.gsGold b{ font:700 21px "Cinzel",Georgia,serif; color:#f0d488;
  text-shadow:0 2px 6px #000 }
.gsCoin{
  width:17px; height:17px; border-radius:50%; flex:none;
  background:radial-gradient(circle at 36% 30%,#f6e3a8,#c8a24a 58%,#6f5320);
  box-shadow:0 1px 3px rgba(0,0,0,.7), inset 0 0 0 1px rgba(0,0,0,.35);
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
