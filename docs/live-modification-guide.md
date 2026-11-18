# Live modification guide

Each live change should take about 10 minutes. Keep `npm run dev` and `npm test -- --watch`
(or `npx vitest`) running in two terminals, and your AI assistant open.

## Checklist for every request
1. Restate the outcome in one sentence.
2. Name the constraints (what must *not* change: event order, contract rules, Reset exactness).
3. Write the instruction for the assistant (template in `docs/prompts.md`).
4. Read the diff. Say what you accept, change or reject.
5. Verify: `npm test` (150+ tests) and look at the screen once.

## Where things live

| If the request is about... | Change this | Then check |
|---|---|---|
| Island names, layout, adding or removing a bridge in the demo | `src/data/archipelago.ts`; then **recompute `docs/oracle.md` and `tests/oracle.ts` by hand** | `engine.main.test.ts`; `python3 scripts/oracle_check.py` (edit its constants) |
| Wording of an event sentence or formula | `src/engine/describe.ts` | `events.test.ts` ("describeEvent ...") |
| A new line in the current-event card or summary | `src/ui/panels.ts` | screenshot / `scripts/e2e.cjs` |
| Colours, line styles, ring sizes, legend | `src/ui/style.css`, `src/ui/mapView.ts` (`renderLegend`) | look at the map; states must still differ by symbol / line style, not only colour |
| Show which islands a closed bridge or island cuts off | `cutOffByBridge` in `src/ui/panels.ts` (bridges exist already); for an articulation island, derive components after removing it from the folded `view` | add a test next to the summary logic |
| An extra counter (for example "bridges inspected so far") | derive it in `src/engine/replay.ts` from the events (it must be foldable), show it in `panels.ts` | `engine.main.test.ts` fold test |
| A new event type or different granularity | `types.ts`, `analyze.ts`, `replay.ts`, `describe.ts`, `docs/event-schema.md`, and the golden index checks in `engine.main.test.ts` and `events.test.ts` (event numbers shift) | all event tests |
| Step back / jump to event | add `back()` to `src/app/controller.ts` (index - 1); the fold already supports any index | `controller.test.ts` |
| A different island plan in the drop-down | `src/data/samples.ts` (`SAMPLE_OPTIONS`) | UI + a test using the same graph |
| New validation rule | `src/engine/validate.ts` + a row in the `cases` table in `tests/validation.test.ts` | validation tests |
| Tie-break or ordering change | `src/engine/order.ts` (single place) | `lowlink.rules.test.ts` ordering tests |

## Likely user-style requests and the idea behind each

- "Volunteers want to see which stalls are cut off if this bridge closes." -> already shown per bridge in the
  summary; extend it to the clicked bridge or to articulation islands.
- "Add a bridge between X and Y and tell me what changed." -> edit the data, re-run, then update oracle + tests.
- "Make the first-aid tent stand out." -> style change in `mapView.ts` / `style.css` keyed on node ID or name.
- "Show the number of loops (extra bridges beyond a tree)." -> `edges - nodes + components`, derived in the summary.
- "Let me go back one step." -> `Controller.back()`.
- "Highlight the island that would be cut off most people." -> compute subtree sizes from the folded parents.

## Safety nets
- `bash scripts/mutation-check.sh` proves the rule tests still bite after a refactor.
- `npm run report` prints the whole analysis as text, handy to compare before and after.
- `docs/test-evidence/` contains the reference outputs.
