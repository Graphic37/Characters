#!/usr/bin/env python3
"""
Build dist/ashen_hollow.min.html from src/ashen_hollow.html.

⚠ THE SOURCE IS THE SOURCE. The comments in src/ are not decoration — they
record WHY each decision was made, and several are the only surviving account
of a bug that cost multiple sessions to find. They stay in src/ and are removed
only from the build artifact.

⚠ USES TERSER (a real JS parser), NOT A HAND-ROLLED STRIPPER. The first version
of this script tokenized by hand, mistook a `/` for a regex literal, swallowed a
comment opener and produced a file that looked fine and would have booted to a
black screen. A single-file game with no build step has nothing downstream to
catch that. If a parser is not available the script REFUSES to write rather than
shipping a guess.

⚠ NON-JS SCRIPT BLOCKS ARE LEFT ALONE. The page carries an importmap and two
JSON payloads (the authored town, the art atlas) inside <script> tags. They are
not JavaScript; minifying them is meaningless and parsing them as JS fails.

Usage:  python3 tools/build.py
Needs:  npm install terser
"""
import re, sys, json, subprocess, gzip, pathlib, tempfile, os, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / 'src' / 'ashen_hollow.html'
OUT  = ROOT / 'dist' / 'ashen_hollow.min.html'

def find_terser():
    for c in [ROOT.parent/'node_modules'/'.bin'/'terser',
              ROOT/'node_modules'/'.bin'/'terser',
              pathlib.Path.home()/'node_modules'/'.bin'/'terser']:
        if c.exists(): return str(c)
    return shutil.which('terser')

def _in_comment(s, pos):
    """⚠ A COMMENT CONTAINING THE TEXT "<script>" IS NOT A SCRIPT TAG.
    The source has one, and a naive regex split there — producing a phantom
    block whose body is prose. That cost a false parse failure and nearly a
    false 'source is broken' conclusion."""
    before=s[:pos]
    return before.rfind('/*') > before.rfind('*/')

def blocks(s):
    out=[]
    for m in re.finditer(r'<script([^>]*)>', s):
        if _in_comment(s, m.start()): continue
        a=m.end(); b=s.find('</script>', a)
        if b<0: continue
        out.append((m.start(), a, b, m.group(1)))
    return out

def is_js(attrs, body):
    """An importmap or a JSON payload is not JavaScript."""
    if 'importmap' in attrs or 'application/json' in attrs: return False
    t=body.lstrip()
    if t.startswith('{') and '"' in t[:80]: return False
    return True

def build():
    terser=find_terser()
    if not terser:
        print('terser not found — run:  npm install terser')
        print('REFUSING to write a build with a hand-rolled stripper.')
        return False
    s=SRC.read_text(encoding='utf-8')
    before=len(s)
    parts=[]; last=0; done=0; skipped=0
    for _, a, b, attrs in blocks(s):
        parts.append(s[last:a]); last=b
        body=s[a:b]
        if not body.strip() or not is_js(attrs, body):
            parts.append(body); skipped+=1; continue
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False,
                                          encoding='utf-8') as f:
            f.write(body); tmp=f.name
        cmd=[terser, tmp, '--comments', 'false']
        if 'module' in attrs: cmd += ['--module']
        r=subprocess.run(cmd, capture_output=True, text=True)
        os.unlink(tmp)
        if r.returncode!=0:
            print('  terser failed on a block — keeping it verbatim:')
            print('   ', (r.stderr or '').strip().split('\n')[0][:160])
            parts.append(body); skipped+=1; continue
        parts.append('\n'+r.stdout+'\n'); done+=1
    parts.append(s[last:])
    out=''.join(parts)
    # CSS comments too (the <style> block is not touched above)
    head, sep, tail = out.partition('<script')
    out = re.sub(r'/\*[\s\S]*?\*/','', head) + sep + tail
    out = re.sub(r'\n{3,}','\n\n', out)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(out, encoding='utf-8')

    after=len(out)
    gz_b=len(gzip.compress(s.encode(),9)); gz_a=len(gzip.compress(out.encode(),9))
    print('blocks minified: %d   left verbatim (json/importmap): %d' % (done, skipped))
    print('src  %8.1f KB   (gz %6.1f KB)' % (before/1024, gz_b/1024))
    print('dist %8.1f KB   (gz %6.1f KB)   -%.1f%% raw, -%.1f%% gz'
          % (after/1024, gz_a/1024, 100*(1-after/before), 100*(1-gz_a/gz_b)))
    return True

if __name__=='__main__':
    sys.exit(0 if build() else 1)
