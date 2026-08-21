src = open('work.html', encoding='utf-8').read()
CSS = """
/* ---- support categories (v224) ------------------------------------------- */
.gmFilter{
  display:flex; flex-wrap:wrap; gap:5px; align-items:center;
  padding:0 0 9px; margin-bottom:4px; border-bottom:1px solid #2a2e26;
}
.gmChip{
  font:600 10.5px "Trebuchet MS",sans-serif; letter-spacing:.04em;
  padding:4px 9px; cursor:pointer; color:#9aa08e;
  border:1px solid #34382e; background:linear-gradient(180deg,#171a12,#0e100b);
}
.gmChip i{ font-style:normal; opacity:.62; margin-left:3px; font-size:9.5px }
.gmChip:hover{ border-color:#5a6150; color:#cfc7a8 }
.gmChip.on{ border-color:#2fa39a; color:#bff0ea;
  background:linear-gradient(180deg,#132320,#0b1614) }
.gmSearch{
  flex:1 1 120px; min-width:110px; padding:4px 8px;
  font:11px "Trebuchet MS",sans-serif; color:#d8d2c0;
  border:1px solid #34382e; background:#0b0d09; outline:none;
}
.gmSearch:focus{ border-color:#2fa39a }
.gmSearch::placeholder{ color:#5f6874 }
.gmGroup{ margin-bottom:10px }
.gmGroupHead{
  font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.16em;
  text-transform:uppercase; color:#7d8a76; margin:6px 0 5px;
  display:flex; align-items:center; gap:7px;
}
.gmGroupHead::after{ content:''; flex:1; height:1px; background:#252a22 }
.gmGroupHead span{ color:#4f574a; font-size:9.5px; letter-spacing:.06em; order:3 }
.gmNone{
  font:italic 11.5px "Trebuchet MS",sans-serif; color:#6f695c;
  padding:14px 4px; text-align:center;
}
"""
assert src.count("\n</style>") >= 1
src = src.replace("\n</style>", "\n" + CSS + "\n</style>", 1)
open('work.html','w',encoding='utf-8').write(src)
print('css added')
