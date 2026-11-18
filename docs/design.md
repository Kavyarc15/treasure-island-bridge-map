# Design summary

## The idea in one paragraph
A pure engine turns a validated graph into **one flat, ordered list of events**. Everything the
screen shows (map colours, node table, component count, summaries, the sentence in the
"Current event" card) is *folded* from the first N events, where N is the replay index.
`Step` adds 1 to N. `Run to End` sets N to the total. `Reset` re-loads the pristine graph and
sets N to 0. Because there is one source of truth, the map, table, current event and summary
cannot disagree with each other or with the final result.

```
Graph --validate--> errors | OK
OK --adjacency(sorted by ID)--> low-link DFS --> events[0..61] + final table/bridges/articulation
                                                          |
Controller{ pristine graph, analysis, index } --Step/Run/Reset--> index
                                                          |
replayStateAt(graph, events, index) --> nodes, edges, current focus, summaries --> SVG + panels
```

## Architecture decisions

| Decision | Why | Alternative rejected |
|---|---|---|
| Pure engine in `src/engine`, no UI imports | Easy to test, easy to explain; the live modification can usually be done and verified there. | Algorithm inside UI handlers (untestable, easy to desync). |
| Events recorded once, UI replays by folding | Guarantees Step and Run to End use the same sequence and that every visible number matches the final result. | Re-running the DFS partially per click (risk of divergence). |
| `Controller` class with no DOM | Load / Step / Run / Reset / "invalid input clears everything" can be unit-tested without a browser. | Logic in `app.ts` click handlers. |
| Vanilla TypeScript + inline SVG | 12 nodes and 20 edges need no framework; fewer moving parts to explain and debug in an interview. | React (you know it, but it adds nothing here); canvas (harder to label and test); graph/visualisation libraries (hide the algorithm). |
| Vite + `vite-plugin-singlefile` | `npm run dev` for development; `dist/index.html` is one file that opens by double-click for a demo. | Multi-file build that needs a server. |
| Vitest | Same toolchain as Vite, fast, TypeScript out of the box. | Jest (more config). |
| Recursive DFS | Max 12 nodes, so recursion depth is trivial and the code mirrors the textbook. Verified against an iterative reference in tests. | Iterative DFS in the engine (more bookkeeping; used only as test reference). |
| Edge recorded twice (once per adjacency entry) | The DFS inspects each adjacency entry anyway; the parent edge then shows as "parent", which teaches why it is skipped. | Once per edge (needs extra de-duplication state). |
| Code-unit ID comparison | Contract says ascending ASCII; `localeCompare` / natural sort would order `A10` and `A2` differently. | `localeCompare`. |
| Map auto-fits coordinates | Legal coordinates are 0..100; a fixed scale clipped an island once (found by screenshot). | Fixed scale. |
| Frozen deep copy of the loaded graph | Makes "Reset restores the exact graph" structural: nothing can mutate it. | Re-using the caller's object. |
| `describeEvent` returns text + exact formula | The current event must state the numerical change; the same function feeds the card and the history list. | Formatting strings in the UI. |

## How the rules map to code (read `src/engine/analyze.ts`)

- `discovery = low = clock; clock++` at the top of `visit` (one clock for all components).
- For each neighbour in sorted order:
  - `v === parentNode` -> `INSPECT_EDGE kind=parent` (skipped).
  - `v` unvisited -> tree edge: `visit(v)`, then `low[u] = min(low[u], low[v])`, then
    `isBridge = low[v] > discovery[u]`, then (non-root only) `low[v] >= discovery[u]` => articulation.
  - otherwise -> `low[u] = min(low[u], discovery[v])`.
- After the loop: root with `treeChildren >= 2` => articulation.

## AI influence (honest account)

- The assistant proposed the single-event-list + fold architecture and the stack; those were
  accepted because they directly satisfy "Step and Run to End use the same sequence" and
  "map, table, current event and summary stay synchronized".
- The assistant wrote the code and the tests. Review notes for the interview: read
  `analyze.ts` (about 150 lines) and `replay.ts` until you can redraw them without looking.
- Things the AI got wrong first and the checks caught (see `plan-vs-actual.md`):
  a sample graph whose "root with two children" was not actually the root; two off-by-one
  step counts in the browser script; a double-bracket wording bug in event headlines; the map
  clipping an island; a test assumption about the root articulation event position.

## Trade-offs

- **Prioritised:** correctness, determinism, explainability, test coverage, a single synchronized screen.
- **Deferred:** animated replay, scrubber/back-step, graph editor, parallel-edge analysis (all explicitly out of scope or optional).
- **Printable summary:** only a basic print stylesheet, not a designed view.
- **Accessibility:** states use text and symbols as well as colour; the map has a legend and per-element tooltips (`<title>`); the current event is in an `aria-live` region. Not audited with a screen reader.
- **Mobile:** the map keeps a minimum width and scrolls horizontally on very small screens; the layout is designed for a laptop screen.

## Walkthrough to practise for the interview (about 3 minutes)

1. Show the oracle doc: "I derived these by hand first, and cross-checked with a definition-based script."
2. Load, Step a few times: discovery, tree edge, back connection (`REEF -> ANCHOR` lowers `low`), return (`low[TIDE] = min(6, 5)`).
3. Show the equality moment: `BR07` is *not* a bridge (5 > 5 is false) but `SHELL` *is* an articulation island (5 >= 5).
4. Run to End: final summary with "If it closes, this part is cut off".
5. Reset, then load an invalid graph: errors name the offender and the screen is cleared.
6. `npm test`, then `bash scripts/mutation-check.sh`: "if I break a rule on purpose, the tests fail".
