src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('density',
"""    const g=MMAP.baseCtx;
    g.clearRect(0,0,N,N);
    g.fillStyle='rgba(150,168,196,0.40)';
    const b=MMAP.bounds, r=Math.max(1.5, N/span*2.2);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      const ix=((p.x-b.minX)/span)*N, iy=((p.z-b.minZ)/span)*N;
      g.beginPath(); g.arc(ix,iy,r,0,6.283); g.fill();
    }""",
"""    /* ⚠ THE DOTS VANISH ON A BIG MAP. Radius was `N/span*2.2`, which is 7px on
       a 40m map but 1.5px on a 220m one — and at 40% alpha that reads as an
       empty box with a few faint scratches, which is exactly what he saw.
       Nav points sit ~2m apart, so the dot only has to cover that gap in
       SCREEN pixels: derive it from the spacing, floor it at something you can
       actually see, and draw opaque. Overlap is fine — it is what makes a
       corridor read as a corridor instead of a dotted line. */
    const g=MMAP.baseCtx;
    g.clearRect(0,0,N,N);
    g.fillStyle='rgba(168,186,214,0.92)';
    const b=MMAP.bounds;
    const r=Math.max(2.6, (N/span)*2.6);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      const ix=((p.x-b.minX)/span)*N, iy=((p.z-b.minZ)/span)*N;
      g.beginPath(); g.arc(ix,iy,r,0,6.283); g.fill();
    }
    /* one blur-free pass of "join the dots": a short line between neighbours
       closes the gaps a big map opens up */
    g.strokeStyle='rgba(168,186,214,0.55)';
    g.lineWidth=Math.max(1.6, r*0.8);
    g.beginPath();
    for(let i=1;i<pts.length;i++){
      const a2=pts[i-1], c2=pts[i];
      if(Math.hypot(c2.x-a2.x, c2.z-a2.z) > 4) continue;   /* not neighbours */
      g.moveTo(((a2.x-b.minX)/span)*N, ((a2.z-b.minZ)/span)*N);
      g.lineTo(((c2.x-b.minX)/span)*N, ((c2.z-b.minZ)/span)*N);
    }
    g.stroke();""")

# label it, so "which box is the minimap" is never a question again
rep('label',
"""  const c=document.createElement('canvas');
  c.id='miniMap'; c.width=MMAP.size; c.height=MMAP.size;
  wrap.appendChild(c);""",
"""  const c=document.createElement('canvas');
  c.id='miniMap'; c.width=MMAP.size; c.height=MMAP.size;
  wrap.appendChild(c);
  /* ⚠ NAMED ON PURPOSE. He could not tell which of two boxes on screen was the
     minimap; an unlabelled dark rectangle is indistinguishable from any other
     dark rectangle a dev panel might leave behind. */
  const tag=document.createElement('div');
  tag.className='mmTag'; tag.textContent='MAP';
  wrap.appendChild(tag);""")

CSS = """
#miniWrap .mmTag{
  position:absolute; left:5px; top:3px;
  font:600 8.5px "Trebuchet MS",sans-serif; letter-spacing:.18em;
  color:#7f8a99; text-shadow:0 1px 2px #000; pointer-events:none;
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
