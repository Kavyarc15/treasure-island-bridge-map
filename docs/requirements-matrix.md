# Requirements matrix

Every requirement from the problem statement and the Student Guide, mapped to where it is
implemented and how it is verified. Test files are in `tests/`.

## Application and demonstration graph

| Requirement | Implementation | Verified by |
|---|---|---|
| One coherent local app; no backend, DB, map service, account | `src/` (Vite, vanilla TS, SVG) | runs from `dist/index.html` via `file://` (`scripts/e2e.cjs`) |
| Controls `Load My Archipelago`, `Step`, `Run to End`, `Reset` | `src/ui/app.ts` + `src/app/controller.ts` | `controller.test.ts`, `e2e.cjs` |
| Main demo: 6-9 islands, 6-13 bridges | `src/data/archipelago.ts` (9 islands, 10 bridges) | `engine.main.test.ts` "meets the size and shape rules" |
| Connected; has a cycle, a bridge, a non-root articulation point, a non-bridge edge inside a cycle | Tidewater Isles: loops ANCHOR-MANGO-REEF and SHELL-TIDE-WAVE; bridges BR01, BR02, BR06, BR10; non-root articulation HARBOR, REEF, SHELL, TIDE | `engine.main.test.ts` (shape test), `docs/oracle.md` |
| Own island names and layout | names + x/y in `archipelago.ts` | review |
| Independently documented adjacency, discovery order, table, component count, bridges, articulation points | `docs/oracle.md` (hand trace), `tests/oracle.ts` (hand-typed), `scripts/oracle_check.py` (definition-based, Python) | `engine.main.test.ts` oracle block; `docs/test-evidence/oracle-check-output.txt` |
| App calculates and never reads the oracle | engine has no import of `tests/` or oracle | `engine.main.test.ts` "the application never reads the oracle" (scans every `src/` file) |

## Graph and validation contract

| Requirement | Implementation | Verified by |
|---|---|---|
| 1-12 nodes, 0-20 edges | `MIN_NODES..MAX_EDGES` in `validate.ts` | `validation.test.ts`: 0 nodes, 13 nodes, 21 edges (invalid); 1 node/0 edges and 12 nodes/20 edges (valid, `lowlink.rules.test.ts`) |
| Node ID `[A-Z][A-Z0-9_-]{0,15}`, unique | `ID_PATTERN`, duplicate set | lowercase, 17 chars, digit-first IDs, duplicate ID, boundary 16-char valid IDs |
| Non-empty display name | `EMPTY_NODE_NAME` | empty and whitespace-only names |
| Finite x, y in 0..100 | `NON_FINITE_COORDINATE`, `COORDINATE_OUT_OF_RANGE` | NaN, Infinity, string, -1, 101, 140; 0 and 100 valid |
| Edge ID same format, unique | `BAD_EDGE_ID`, `DUPLICATE_EDGE_ID` | bad and duplicate edge IDs |
| Two existing, different endpoints; no self-loop; no duplicate pair (either direction) | `UNKNOWN_ENDPOINT`, `SELF_LOOP`, `DUPLICATE_CONNECTION` | unknown endpoint (either side), self-loop, same-direction and reversed duplicates |
| Validate whole graph first; errors identify node / edge / endpoint | `validateGraph` returns all errors (nodes first, then edges) with `nodeId` / `edgeId` / `endpointId` | `validation.test.ts` table (25 invalid inputs) |
| Invalid input: clear stale replay and results, no partial analysis | `analyzeGraph` returns `{ok:false, errors}` only; `Controller.load` wipes graph, analysis, index | `validation.test.ts` (key set is exactly `ok, errors`; controller wipes after a half-run); `e2e.cjs` (no map, table, summary or history after invalid load) |
| Adjacency from IDs, roots and neighbours in ascending ASCII order, independent of array order and map position | `buildAdjacency`, `compareIds` (code-unit compare, never `localeCompare`) | `engine.main.test.ts` shuffle tests (50 seeded shuffles with swapped endpoints and random coordinates give identical events); `lowlink.rules.test.ts` ASCII ordering |

## Low-link traversal

| Requirement | Implementation | Verified by |
|---|---|---|
| One zero-based clock across all components; parent null for roots | `analyze.ts` | `lowlink.rules.test.ts` root/disconnected/isolated block |
| Tree edge: low[u] = min(low[u], low[v]) after finishing v | `RETURN_FROM_CHILD` | back-connection propagation tests |
| Visited non-parent neighbour: low[u] = min(low[u], discovery[neighbour]) | `INSPECT_EDGE` kind `visited` | "uses discovery[neighbour], NOT low[neighbour]"; mutation M4 |
| Bridge iff low[v] > discovery[u] (strict) | `CLASSIFY_EDGE` | strict-inequality tests (equality is not a bridge); mutation M1 |
| Non-root articulation iff some child has low[v] >= discovery[u] | `ARTICULATION` non-root | non-root `>=` tests; mutation M2 |
| Root articulation iff at least 2 DFS-tree children | `ARTICULATION` root | root child-count tests; mutation M3 |
| Sorted ASCII bridge and articulation IDs | `sortedIds` | oracle test; 500 random graphs vs brute force |
| Correct beyond the demo graph | none needed | `events.test.ts`: iterative reference implementation and brute-force "remove it and count components" agree with the engine on 500 seeded random graphs |

## Replay and visual explanation

| Requirement | Implementation | Verified by |
|---|---|---|
| Events: discovery; edge inspection as tree / parent / visited; return with old and new low; classification; articulation; node and component completion | `ReplayEvent` union in `types.ts` | `events.test.ts` ordering and kind tests; event type counts |
| Documented schema and emission order (edge recorded once or twice; order of return / classification / articulation) | `docs/event-schema.md` (edges twice, once per adjacency entry) | `events.test.ts` "inspected exactly twice", ordering tests |
| Step = exactly one event; Run to End = same sequence; history stays | `Controller.step/runToEnd` | `controller.test.ts` |
| Current event highlights node / edge and states the numerical change | `describeEvent` + `replayStateAt` (`currentNode`, `currentEdge`) | `events.test.ts` "describeEvent states the numerical change"; screenshots |
| Six states distinguishable without colour: unvisited, current, DFS-tree, inspected non-tree, bridge, articulation | `mapView.ts`, `style.css`, legend: dashed ring + "not visited"; thick ring + "▶ NOW"; solid line; dotted line; thick red dashes + "⚠"; double ring + "◆ CUT" | screenshots; `e2e.cjs` class checks |
| Compact node table; component count; sorted critical summaries | `panels.ts` | `e2e.cjs` reads the table and summary from the DOM |
| Reset restores the original graph and pre-traversal state exactly | `Controller.reset` re-loads the frozen pristine copy | `controller.test.ts` Reset block; `e2e.cjs` compares the whole screen HTML after Load vs after Reset |

## Acceptance criteria

| Criterion | Evidence |
|---|---|
| Load main archipelago in one action; reproduce documented results | `engine.main.test.ts`; `e2e.cjs` table assertions; `docs/test-evidence/report-output.txt` |
| Step and Run to End use the same sequence; visible low updates and classifications agree with the final result | `engine.main.test.ts` "every visible low update ... agrees"; `controller.test.ts`; `e2e.cjs` (Step x62 and Run to End give identical screen HTML) |
| Reverse / shuffle source arrays gives the same result | `engine.main.test.ts` |
| Cycle-only test; root with >= 2 children + disconnected component + isolated node | `lowlink.rules.test.ts` (ring `CYCLE_ONLY`, `ROOT_TWO_CHILDREN_DISCONNECTED`) |
| At least two materially different invalid cases without stale output | `validation.test.ts` (25 invalid inputs; 5 of them drive the controller after a half-finished run) |
| Whole picture on one screen, explainable without logs | `docs/screenshots/07-final-run-to-end.png`; summary shows "If it closes, this part is cut off: ..." |
| Reset exact; repeated stepped and complete runs identical | `controller.test.ts` "repeated stepped and complete runs..." |
| Focused tests: back-connection low, strict bridge, non-root `>=`, root child count, component/root ordering, validation, event ordering, reset | `lowlink.rules.test.ts`, `validation.test.ts`, `events.test.ts`, `controller.test.ts`; mutation check proves they bite |
| Optional: gentle animation or printable summary without changing the event model | Basic print stylesheet (`@media print` in `style.css`: hides controls, legend and history). No animation (deferred). The event model is untouched. |

## Student Guide deliverables

| Deliverable | Where |
|---|---|
| 1. Implementation plan (3-5 steps, checkpoints, changes) | `docs/plan.md`, `docs/plan-vs-actual.md` |
| 2. Working solution, run instructions, sample data | `README.md`, `src/data/` |
| 3. AI interaction documentation | `docs/prompts.md` |
| 4. Design summary (architecture, AI influence, trade-offs) | `docs/design.md` |
| 5. Test evidence (plan, edge cases) | `docs/test-evidence/`, `docs/screenshots/`, this matrix |
| 6. Development environment ready for live modification | `docs/live-modification-guide.md`; `npm run dev` + `npm test` |
