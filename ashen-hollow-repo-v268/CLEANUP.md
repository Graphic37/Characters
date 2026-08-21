# Pushing this over what is already there

The folder currently on GitHub is the **first** zip. It contains three things
that should not be in a repository, and an older build of the game.

## What to delete from the repo

```
ashen-hollow-repo/dist/          the built file — regenerable, and it goes
                                 stale the moment src/ changes
ashen-hollow-repo/tools/p*.py    154 one-shot patch scripts (~669 KB)
```

Deleting `dist/` matters more than the disk space: a committed build is a second
copy of the game with the same name and different behaviour, and there is no
mechanism keeping the two in step. Attach it to a **Release** instead.

The patch scripts each applied one change to `src/` once. Their reasoning
already lives in the comments they inserted, and git tracks the history — so
they are a second, worse copy of something the repo already has.

## What to replace

```
ashen-hollow-repo/src/ashen_hollow.html      was v260, this is v268
ashen-hollow-repo/tests/                     was ~113 suites, this is 119
```

The pushed `src/` is **v260** (sha `96a2ac02`). This one is **v268**
(sha `d1ad144f`) and adds: the contract/quest system (clock, periods,
deterministic offers, Veyra board, tracker), progress orbs, the enemy threat
curve, and the stash fixes.

Seven suites were retired along the way because they asserted screens the game
no longer has — `t1`, `t26`, `t76`, `t78`, `t82`, `t86`, `t100`. If they are
still in the repo they will fail; delete them.

## The `.gitignore`

Included here. It keeps `dist/` and `tools/p*.py` out from now on, so this is a
one-time cleanup rather than something to remember.

## Verify after pushing

```
npm install jsdom
cp src/ashen_hollow.html work.html
bash tools/run_tests.sh
```

Should read `suites: 119   failing: 0`.
