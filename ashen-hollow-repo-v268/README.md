# ASHEN HOLLOW

A dark-fantasy ARPG that ships as **one HTML file**. No build step is required
to play it — `src/ashen_hollow.html` opens in a browser and runs.

    src/ashen_hollow.html      the game. This is the canonical artifact.
    dist/ashen_hollow.min.html an optional smaller build (see "Size" below)
    tests/                     ~112 suites that run the real code in node
    tools/                     the patch scripts and the build

## Running it

Open `src/ashen_hollow.html`. It fetches three.js from a CDN on first load and
caches it after that.

## Tests

    npm install jsdom
    cp src/ashen_hollow.html work.html
    for t in tests/t*.js; do node "$t" >/dev/null || echo "FAIL $t"; done

The suites do not use a browser. They **slice the real code out of the shipped
file** and run it in `node:vm` against stubs — never a retyped copy, because a
retyped copy tests the copy. That is also why they only work against `src/`:
they anchor on exact source text, which minification destroys.

`tools/check.py` runs `node --check` over every script block.

## What is committed, and what is not

    src/          the game. This is the product.
    tests/        116 suites. They only work against src/ (see below).
    tools/        build, verify, check, run_tests — four small files.

**Not committed** (see `.gitignore`):

| | why |
|---|---|
| `dist/` | regenerable from `src/` with `python3 tools/build.py`. A committed build is a second copy of the game that goes stale the moment `src/` changes. Attach it to a **Release** instead — that is what Releases are for. |
| `tools/p*.py` | 154 one-shot patch scripts, 669 KB. Each was applied to `src/` once, and the reasoning already lives in the comments it inserted. Git tracks the history; the scripts are a second, worse copy of it. |

That is **3815 KB down to 2026 KB, a 47% cut**, with nothing lost that cannot be
regenerated or read out of git history.

## Size

**Size is mostly the wrong thing to optimise here.** Git stores deltas and
GitHub serves gzipped: `src/` is 1615 KB raw but **574 KB gzipped**, and a
1.6 MB text file is unremarkable in a repository. Clone time will not notice it.

What *is* worth avoiding is committing things that duplicate other things — a
build that duplicates the source, and patch scripts that duplicate git history.
That is what the `.gitignore` above is for, and it is a hygiene argument rather
than a disk-space one.

If you want the smaller file anyway:

    npm install terser
    python3 tools/build.py        # -31% raw, -31% gzipped
    python3 tools/verify_build.py

`build.py` uses **terser — a real JavaScript parser**. An earlier version
tokenized by hand, mistook a `/` for a regex literal, swallowed a comment opener
and produced a file that looked fine and would have booted to a black screen. A
single-file game with no build step has nothing downstream to catch that, so the
script now refuses to write at all if a parser is unavailable.

**What `verify_build.py` does and does not prove.** It checks that every script
block parses and that no element id went missing. It does **not** prove the
built game plays identically. Load `dist/` once before relying on it.

### Where the bytes are

| | KB | % |
|---|---|---|
| block comments | 336 | 21% |
| leading indentation | 92 | 6% |
| authored town JSON | 68 | 4% |
| base64 images | 45 | 3% |

The base64 is only two PNGs (the UI frames) and is **not** worth extracting —
splitting them into files trades 45 KB for a network request and breaks the
single-file property that makes this thing easy to ship.

## Structure

One HTML file, 18 script blocks. Three scoping rules apply and they look
identical at the call site:

- a **classic** block's top-level `const`/`let` is *script-scoped*
- a **module**'s top level is *private*
- `window.X = …` is *global*

**Eleven bugs have come from mixing these up**, including a click handler that
threw and blacked out the game. New shared helpers should go through the `AH`
namespace (`AH.def` / `AH.need`), where `AH.need('x')` throws at wire-up time
instead of failing silently on first use.

## Tools

`tools/p*.py` are the patch scripts, in order. Each asserts its anchor matches
exactly once, so a stale anchor fails loudly rather than silently doing nothing.

⚠ **A patch script that raises is all-or-nothing** — it dies before writing, and
the hunks that already matched are discarded with it. Verify the file, never the
script's output.
