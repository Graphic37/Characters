import re, subprocess, sys, os
src = open('work.html', encoding='utf-8').read()
blocks = []
for m in re.finditer(r'<script([^>]*)>(.*?)</script>', src, re.S):
    attrs, body = m.group(1), m.group(2)
    if 'src=' in attrs or 'json' in attrs or 'importmap' in attrs: continue
    line = src[:m.start()].count('\n')+1
    blocks.append((line, 'module' in attrs, body))
os.makedirs('chk', exist_ok=True)
bad = 0
for i,(line, is_mod, body) in enumerate(blocks):
    ext = 'mjs' if is_mod else 'js'
    p = f'chk/b{i}.{ext}'
    open(p,'w',encoding='utf-8').write(body)
    r = subprocess.run(['node','--check',p], capture_output=True, text=True)
    status = 'OK ' if r.returncode==0 else 'FAIL'
    if r.returncode: bad += 1
    print(f'{status} block {i} (html line {line}, {"module" if is_mod else "classic"}, {len(body)} bytes)')
    if r.returncode:
        print(r.stderr[:1200])
print('blocks:', len(blocks), 'failures:', bad)
sys.exit(1 if bad else 0)
