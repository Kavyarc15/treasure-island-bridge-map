# Plan vs actual

Original plan: `docs/plan.md` (5 steps). This file records what was reordered, added,
corrected or deferred, and why.

| Step | Planned | What actually happened |
|---|---|---|
| 1. Design + oracle | Schema, ordering rules, archipelago, hand-derived oracle | Done as planned. Added `scripts/oracle_check.py`, which finds bridges and articulation points **by definition** (remove it, count components) so the oracle does not depend on the same low-link rules as the app. Hand trace and script agreed. |
| 2. Engine | validate, adjacency, DFS, events, fold | Done. Added a small UI-independent `Controller` (not in the original plan) so Load / Step / Run to End / Reset and "invalid input clears everything" are testable without a browser. |
| 3. Engine tests | Boundary, shuffle, cycle-only, combined, validation, order, determinism, reset | Done, then extended: an iterative reference implementation and a brute-force definition check run on 500 seeded random graphs; a mutation check breaks 7 rules and confirms the tests fail. Added after the first green run, to be sure the tests are not vacuous. |
| 4. UI | Map, table, event panel, controls, legend, error panel | Done. Layout revised twice after looking at screenshots (see below). |
| 5. Docs + prep | README, design, prompts, screenshots, practice | Done. Added a requirements matrix and a live-modification guide. |

## Corrections made along the way

1. **Sample graph flaw (found while writing tests).** In the first "root with two children" sample the
   hub was *not* the smallest ID, so it would never have been the DFS root. IDs were renamed
   (`ATOLL` hub; `DELTA` isolated between components; `EBB-FJORD-GULF` triangle) and the test now
   asserts the roots are `ATOLL, DELTA, EBB`.
2. **Wrong test assumption.** I assumed the event after `CLASSIFY_EDGE` was always a non-root
   articulation event. For a root's last child it is the *root* articulation event. The test was
   fixed to assert the real order (root rule is emitted just before `NODE_COMPLETE(root)`).
3. **Under-tested rule.** The mutation check showed "back connection uses `low[neighbour]` instead
   of `discovery[neighbour]`" was caught by only one (random) test. A deterministic test was added
   (`N0..N4` graph in `lowlink.rules.test.ts`).
4. **Off-by-one in the browser script.** After N clicks the screen shows `events[N-1]`; the script's
   step counts were corrected.
5. **Headline wording.** "Harbour Market (food stalls) (HARBOR)" had double brackets; headlines now
   use the short name: "Harbour Market (HARBOR)".
6. **Map layout.** First version left empty space and hid some bridge labels behind island labels.
   Labels are now drawn last (on top), state pills are one line unless an island is the current
   focus or a cut island, and coordinates are spread.
7. **Clipping bug.** An island at y=88 was cut off. The map now auto-fits any 0..100 coordinates, with
   unit tests including the extreme corners, a single node and a straight line.
8. **Stale-looking progress bar.** A CSS transition could show the old width for a moment after an
   invalid load; the transition was removed so nothing stale can flash.

## Deferred / not done (and why)

- Gentle animation and a designed printable page (optional; a basic print stylesheet exists).
- Back-step / scrubber / Pause (explicitly not required).
- Graph editor (explicitly not required; validation is shown through sample graphs and tests).
