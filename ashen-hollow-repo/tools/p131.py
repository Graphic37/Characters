src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('marker',
"""function vaultDoorAnchor(x, z){
  /* a bare group: it owns the station, so `removePlaced` can still clean up */
  const g=new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);""",
"""function vaultDoorAnchor(x, z){
  const g=new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  /* ⚠ AN INVISIBLE OBJECT CANNOT BE CLICKED. The anchor was a bare group, so
     the F2 editor had nothing to raycast and he could not drag it to the door
     even though it is a placed prefab like any other. A small marker fixes
     that — and it is hidden whenever the editor is closed, so it never shows
     up in play. This is what makes "put it exactly where I want" a ten-second
     job instead of another round of me guessing coordinates. */
  try{
    const mk=new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20),
      new THREE.MeshBasicMaterial({ color:0xc8a24a, transparent:true, opacity:0.55 }));
    mk.position.y=0.07;
    mk.userData.editorOnly=1;
    g.add(mk);
    const post=new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8),
      new THREE.MeshBasicMaterial({ color:0xc8a24a, transparent:true, opacity:0.45 }));
    post.position.y=0.8;
    post.userData.editorOnly=1;
    g.add(post);
    g.userData.vaultMarker=1;
    /* hidden unless the editor is on; `edToggle` flips these */
    mk.visible=post.visible=!!(window.ED && ED.on);
  }catch(e){ window.ahErr&&window.ahErr(e,'vaultDoorAnchor:marker'); }""")

# and the editor toggle must show/hide them
rep('toggle',
"""window.ahSetVault=function(x, z){""",
"""/* editor-only helpers appear with the editor and vanish with it */
window.refreshEditorOnly=function(on){
  try{
    scene.traverse(o=>{ if(o.userData && o.userData.editorOnly) o.visible=!!on; });
  }catch(e){}
};

window.ahSetVault=function(x, z){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
