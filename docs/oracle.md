# Oracle for the main archipelago (derived by hand, before the app existed)

These values are **documentation and test expectations only**. The application
never reads this file or the constants copied into the tests; it calculates
everything from the graph.

## The archipelago ("Tidewater Isles")

9 islands, 10 undirected bridges, connected.

| ID | Name | x | y |
|---|---|---|---|
| ANCHOR | Anchor Cove (main gate) | 22 | 52 |
| HARBOR | Harbour Market (food) | 7 | 28 |
| KELP | Kelp Karaoke Stage | 27 | 8 |
| MANGO | Mango Mooring | 42 | 30 |
| PEARL | Pearl Point (first aid) | 92 | 10 |
| REEF | Reef Rotunda (games) | 42 | 74 |
| SHELL | Shell Square | 62 | 56 |
| TIDE | Tidewater Terrace (music) | 78 | 32 |
| WAVE | Wave Walk | 86 | 74 |

| Edge | Endpoints (as written in the source) |
|---|---|
| BR01 | ANCHOR - HARBOR |
| BR02 | HARBOR - KELP |
| BR03 | ANCHOR - MANGO |
| BR04 | MANGO - REEF |
| BR05 | REEF - ANCHOR |
| BR06 | REEF - SHELL |
| BR07 | SHELL - TIDE |
| BR08 | TIDE - WAVE |
| BR09 | WAVE - SHELL |
| BR10 | TIDE - PEARL |

Shape: loop ANCHOR-MANGO-REEF, loop SHELL-TIDE-WAVE, joined by bridge BR06;
exposed branches HARBOR-KELP (off ANCHOR) and PEARL (off TIDE).

## Sorted adjacency lists (neighbour via edge)

```
ANCHOR : HARBOR(BR01) MANGO(BR03) REEF(BR05)
HARBOR : ANCHOR(BR01) KELP(BR02)
KELP   : HARBOR(BR02)
MANGO  : ANCHOR(BR03) REEF(BR04)
PEARL  : TIDE(BR10)
REEF   : ANCHOR(BR05) MANGO(BR04) SHELL(BR06)
SHELL  : REEF(BR06) TIDE(BR07) WAVE(BR09)
TIDE   : PEARL(BR10) SHELL(BR07) WAVE(BR08)
WAVE   : SHELL(BR09) TIDE(BR08)
```

## Hand trace summary

Root = ANCHOR (smallest ID). Clock starts at 0.

ANCHOR(0) -> HARBOR(1) -> KELP(2); back up. -> MANGO(3) -> REEF(4):
REEF sees visited ANCHOR, low[REEF] = 0. -> SHELL(5) -> TIDE(6) -> PEARL(7); back up.
TIDE -> WAVE(8): WAVE sees visited SHELL, low[WAVE] = 5. Back up: low[TIDE] = 5,
low[SHELL] = 5, low[REEF] = 0, low[MANGO] = 0, low[ANCHOR] = 0.

## Discovery order

`ANCHOR, HARBOR, KELP, MANGO, REEF, SHELL, TIDE, PEARL, WAVE`

## Parent / discovery / low table

| Node | Parent | Discovery | Low |
|---|---|---|---|
| ANCHOR | null | 22 | 52 |
| HARBOR | ANCHOR | 7 | 28 |
| KELP | HARBOR | 27 | 8 |
| MANGO | ANCHOR | 42 | 30 |
| REEF | MANGO | 42 | 74 |
| SHELL | REEF | 62 | 56 |
| TIDE | SHELL | 78 | 32 |
| PEARL | TIDE | 92 | 10 |
| WAVE | TIDE | 86 | 74 |

## Component count

**1**

## Bridges (low[child] > discovery[parent])

| Edge | Test | Bridge? |
|---|---|---|
| BR01 | low[HARBOR]=1 > disc[ANCHOR]=0 | yes |
| BR02 | low[KELP]=2 > disc[HARBOR]=1 | yes |
| BR03 | low[MANGO]=0 > disc[ANCHOR]=0 | no |
| BR04 | low[REEF]=0 > disc[MANGO]=3 | no |
| BR06 | low[SHELL]=5 > disc[REEF]=4 | yes |
| BR07 | low[TIDE]=5 > disc[SHELL]=5 | **no (equal, strict test)** |
| BR08 | low[WAVE]=5 > disc[TIDE]=6 | no |
| BR10 | low[PEARL]=7 > disc[TIDE]=6 | yes |

BR05 and BR09 are non-tree edges, so they can never be bridges.

**Bridge IDs (sorted): `BR01, BR02, BR06, BR10`**

## Articulation points

| Node | Rule | Result |
|---|---|---|
| ANCHOR | root with 2 tree children (HARBOR, MANGO) | yes |
| HARBOR | non-root, low[KELP]=2 >= disc[HARBOR]=1 | yes |
| KELP | no children | no |
| MANGO | low[REEF]=0 >= 3? | no |
| REEF | low[SHELL]=5 >= disc[REEF]=4 | yes |
| SHELL | low[TIDE]=5 >= disc[SHELL]=5 | **yes (equal, non-strict)** |
| TIDE | low[PEARL]=7 >= 6 | yes |
| PEARL | no children | no |
| WAVE | no children | no |

**Articulation IDs (sorted): `ANCHOR, HARBOR, REEF, SHELL, TIDE`**

## Why this graph is a good demonstration
- SHELL/TIDE (BR07) shows the **strict vs non-strict** difference: not a bridge, but SHELL is still critical.
- ANCHOR is a **root** articulation point (two tree children).
- BR03/BR04/BR05 and BR08/BR09 are edges **inside cycles** that are not bridges.
- Non-root articulation points: HARBOR, REEF, SHELL, TIDE.

## Expected event counts
62 events: 1 COMPONENT_START, 9 DISCOVER, 20 INSPECT_EDGE (2 per bridge),
8 RETURN_FROM_CHILD, 8 CLASSIFY_EDGE, 5 ARTICULATION, 9 NODE_COMPLETE,
1 COMPONENT_COMPLETE, 1 FINISH.

## Independent cross-check
`scripts/oracle_check.py` (Python, not part of the app) recomputes bridges and
articulation points by the **definition** (remove an edge or node and count
components) and recomputes discovery/low with its own DFS. Run:
`python3 scripts/oracle_check.py`.
