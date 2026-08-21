src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ==================================================== 1. FIVE MINUTES
rep('timer-cfg',
"""  timerSeconds: 900,              // 15:00, locked""",
"""  /* 5:00. His call. NOTE THE KNOCK-ON: killTarget is `14 + tier*0.9`, so a
     tier-50 Challenge Rift still asks for ~59 kills — in a third of the time
     D3 allows. The timer is tuning data; the kill target is the other half of
     the same dial and will need to move with it. */
  timerSeconds: 300,""")

# every hardcoded "15:00" now derives from the config
rep('timer-fmt',
"""function enterGreaterRift(tier){""",
"""/* one formatter, so a timer change cannot leave a stale string on screen —
   there were three hardcoded "15:00"s in the file */
function grClock(sec){
  sec=Math.max(0, Math.round(sec));
  return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
}
window.grClock=grClock;

function enterGreaterRift(tier){""")

rep('timer-toast',
"""  toastRift('Challenge Rift '+GR.tier+' — 15:00');""",
"""  toastRift('Challenge Rift '+GR.tier+' — '+grClock(GR_CFG.timerSeconds));""")

rep('timer-panel',
"""    '<div class="strow"><span class="k">Timer</span><span class="v">15:00</span></div>'+""",
"""    '<div class="strow"><span class="k">Timer</span><span class="v">'+
      (window.grClock?grClock(GR_CFG.timerSeconds):'5:00')+'</span></div>'+""")

rep('timer-sub',
"""                      (_isG ? ' \\u00b7 15:00' : '');""",
"""                      (_isG ? ' \\u00b7 '+(window.grClock?grClock(GR_CFG.timerSeconds):'5:00') : '');""")

rep('timer-comment',
"""   Key -> tier -> 15:00 -> boss -> exactly 3 upgrade attempts on success only.""",
"""   Key -> tier -> timer -> boss -> exactly 3 upgrade attempts on success only.""")

# ==================================================== 2. THE BAR
rep('hud-markup',
"""  '<div id="riftFrame" style="position:relative;height:24px;border:1px solid #6b5a33;'+
    'border-radius:3px;background:linear-gradient(180deg,#241f18,#14110c);'+
    'box-shadow:0 2px 10px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.7)">'+
    '<div style="position:absolute;inset:3px;background:#0a0908;border:1px solid #000;overflow:hidden">'+
      '<i id="riftFill" style="display:block;height:100%;width:0%;'+
        'background:linear-gradient(180deg,#f0d488,#c8912e 55%,#7d5714);'+
        'box-shadow:0 0 10px rgba(232,200,119,.35);transition:width .18s linear"></i>'+
    '</div>'+
    '<span id="riftPct" style="position:absolute;inset:0;display:flex;align-items:center;'+
      'justify-content:center;font:600 12px \\'Trebuchet MS\\',sans-serif;letter-spacing:.06em;'+
      'color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000">0%</span>'+
    '<span id="riftClock" style="position:absolute;right:-2px;top:26px;font:10px \\'Trebuchet MS\\',sans-serif;'+
      'letter-spacing:.14em;color:#b9ae95;text-shadow:0 1px 3px #000"></span>'+
  '</div>';""",
"""  /* TWO RACES ON ONE TRACK (his D3 reference): the purple fill and its skull
     are clearing progress; the hourglass rides the elapsed-time fraction. The
     gap between them IS the message — no one has to read "6:42 remaining" and
     do arithmetic. A plain Rift has no timer, so it shows neither marker. */
  '<div id="riftFrame" class="rf" style="position:relative;height:30px;border:1px solid #6b5a33;'+
    'border-radius:3px;background:linear-gradient(180deg,#241f18,#14110c);'+
    'box-shadow:0 2px 10px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.7)">'+
    '<div id="riftWell" style="position:absolute;inset:4px;background:#070607;'+
      'border:1px solid #000;overflow:visible;'+
      'box-shadow:inset 0 2px 8px rgba(0,0,0,.95)">'+
      '<i id="riftFill" style="display:block;height:100%;width:0%;'+
        'background:linear-gradient(180deg,#f0d488,#c8912e 55%,#7d5714);'+
        'box-shadow:0 0 10px rgba(232,200,119,.35);transition:width .18s linear"></i>'+
      /* the pace marker sits UNDER the skull, so a tie reads as the skull on
         the line rather than the line cutting the skull in half */
      '<i id="riftPace" style="display:none;position:absolute;top:-2px;bottom:-2px;left:0;'+
        'width:2px;margin-left:-1px;background:linear-gradient(180deg,#ffd08a,#e8791f);'+
        'box-shadow:0 0 7px rgba(240,150,40,.85);z-index:2"></i>'+
      '<span id="riftHour" style="display:none;position:absolute;left:0;top:-15px;'+
        'transform:translateX(-50%);z-index:3;line-height:1;font-size:12px;'+
        'filter:drop-shadow(0 1px 2px #000)">\\u231B</span>'+
      '<span id="riftSkull" style="display:none;position:absolute;left:0;top:50%;'+
        'transform:translate(-50%,-50%);z-index:4;line-height:1;'+
        'filter:drop-shadow(0 1px 3px #000)">'+ SKULL_SVG +'</span>'+
    '</div>'+
    '<span id="riftPct" style="position:absolute;inset:0;display:flex;align-items:center;'+
      'justify-content:center;font:600 12px \\'Trebuchet MS\\',sans-serif;letter-spacing:.06em;'+
      'color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000;pointer-events:none;z-index:5">0%</span>'+
    '<span id="riftClock" style="position:absolute;right:-2px;top:32px;font:10px \\'Trebuchet MS\\',sans-serif;'+
      'letter-spacing:.14em;color:#b9ae95;text-shadow:0 1px 3px #000"></span>'+
    '<span id="riftPaceTxt" style="position:absolute;left:-2px;top:32px;font:600 9px \\'Trebuchet MS\\',sans-serif;'+
      'letter-spacing:.16em;text-shadow:0 1px 3px #000"></span>'+
  '</div>';""")

rep('skull-svg',
"""/* ---- HUD: progress bar + tier + repeat state --------------------------- */
const riftBar=document.createElement('div');""",
"""/* ---- HUD: progress bar + tier + repeat state --------------------------- */
/* A demonic skull, drawn rather than loaded: the HUD must not depend on a file
   that may not be in the repo yet, and at 14px an emoji renders differently on
   every platform. */
const SKULL_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" style="display:block">'+
    '<path d="M12 1.5c-5 0-8.4 3.3-8.4 7.9 0 2.6 1.1 4.3 2.4 5.4.5.4.8.9.8 1.5v1.4c0 .9.7 1.6 1.6 1.6h7.2c.9 0 1.6-.7 1.6-1.6v-1.4c0-.6.3-1.1.8-1.5 1.3-1.1 2.4-2.8 2.4-5.4 0-4.6-3.4-7.9-8.4-7.9z" '+
      'fill="#e8e2d2" stroke="#0a0808" stroke-width="1.1"/>'+
    '<ellipse cx="8.4" cy="10" rx="2.5" ry="2.9" fill="#120d10"/>'+
    '<ellipse cx="15.6" cy="10" rx="2.5" ry="2.9" fill="#120d10"/>'+
    '<path d="M12 12.4l-1.5 3h3z" fill="#120d10"/>'+
    '<path d="M9 19.6v2.2M12 19.6v2.4M15 19.6v2.2" stroke="#0a0808" stroke-width="1.2"/>'+
    '<path d="M3.4 6.5c1.6-2 3.4-1.6 3.4-1.6M20.6 6.5c-1.6-2-3.4-1.6-3.4-1.6" '+
      'stroke="#c9bda6" stroke-width="1.3" fill="none" stroke-linecap="round"/>'+
  '</svg>';
const riftBar=document.createElement('div');""")

# ==================================================== 3. THE LOGIC
rep('hud-update',
"""  pctEl.textContent = RIFT.bossSpawned ? (GR.active?'GUARDIAN':'BOSS') : pct.toFixed(1)+'%';
  if(GR.active){
    const mm=Math.floor(Math.max(0,GR.timeLeft)/60), ss=Math.floor(Math.max(0,GR.timeLeft)%60);
    clock.textContent='\\u23F3 '+mm+':'+String(ss).padStart(2,'0');
    clock.style.color = GR.timeLeft<60 ? '#e08a6a' : '#b9ae95';
  } else clock.textContent='';""",
"""  pctEl.textContent = RIFT.bossSpawned ? (GR.active?'GUARDIAN':'BOSS') : pct.toFixed(1)+'%';

  /* ---- the two racers ---------------------------------------------------
     progress% vs elapsed-time%. Their ORDER is the whole readout: skull right
     of the hourglass means ahead of pace, and the frame turns against you as
     the hourglass closes in. */
  const skull=document.getElementById('riftSkull');
  const pace =document.getElementById('riftPace');
  const hour =document.getElementById('riftHour');
  const paceTxt=document.getElementById('riftPaceTxt');
  const frame=document.getElementById('riftFrame');
  if(GR.active){
    const total=GR_CFG.timerSeconds||300;
    const timePct=Math.min(100, Math.max(0, (total-GR.timeLeft)/total*100));
    if(skull){ skull.style.display='block'; skull.style.left=pct+'%'; }
    if(pace){ pace.style.display='block'; pace.style.left=timePct+'%'; }
    if(hour){ hour.style.display='block'; hour.style.left=timePct+'%'; }
    /* the lead, in points of the bar. Positive = ahead. */
    const lead=pct-timePct;
    const state = lead >= 8 ? 'ahead' : (lead >= -3 ? 'close' : 'behind');
    if(paceTxt){
      paceTxt.textContent = RIFT.bossSpawned ? '' :
        (state==='ahead' ? 'AHEAD +'+Math.round(lead)
       : state==='close' ? 'ON PACE'
       : 'BEHIND '+Math.round(lead));
      paceTxt.style.color = state==='ahead' ? '#8fe06a'
                          : state==='close' ? '#e8c46a' : '#e8705a';
    }
    if(frame){
      /* subtly more threatening as the hourglass catches the skull */
      frame.style.borderColor = state==='behind' ? '#8a3a34'
                              : state==='close'  ? '#8a7a3a' : '#6a4a9a';
      frame.style.boxShadow = state==='behind'
        ? '0 2px 10px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.7), 0 0 14px rgba(190,60,45,.45)'
        : '0 2px 10px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.7)';
    }
    const mm=Math.floor(Math.max(0,GR.timeLeft)/60), ss=Math.floor(Math.max(0,GR.timeLeft)%60);
    clock.textContent='\\u231B '+mm+':'+String(ss).padStart(2,'0');
    clock.style.color = GR.timeLeft<60 ? '#e08a6a' : '#b9ae95';
  } else {
    /* a plain Rift has no clock, so it must show no pace furniture either —
       a marker with nothing racing it would just be a mystery */
    if(skull) skull.style.display='none';
    if(pace) pace.style.display='none';
    if(hour) hour.style.display='none';
    if(paceTxt) paceTxt.textContent='';
    clock.textContent='';
  }""")

# the old borderColor line now fights the pace state; drop it for GR
rep('border-line',
"""  document.getElementById('riftFrame').style.borderColor = GR.active ? '#6a4a9a' : '#6b5a33';""",
"""  /* the Challenge frame's colour is owned by the pace state below */
  if(!GR.active) document.getElementById('riftFrame').style.borderColor = '#6b5a33';""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
