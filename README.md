# Treasure-Island Bridge Safety Map

A small local web app for festival volunteers. It draws an island-and-footbridge map,
replays a **low-link depth-first search** one event at a time, and reveals which single
**bridge** or **articulation island** would split the festival if it closed.
Every result is explained with the exact numbers (`discovery`, `low`) that prove it.

> Built for the AI-assisted coding interview problem **SPR26_D2_P01**. It was developed
> with an AI coding assistant (Claude); see `docs/prompts.md` and `docs/plan-vs-actual.md`
> for the honest account of what was asked, generated, changed and verified.

## Run it

Requires Node 18+ (developed on Node 22).

```bash
npm install
npm run dev          # opens the app (Vite dev server, http://localhost:5173)
npm test             # 159 tests (Vitest)
npm run typecheck
npm run build        # dist/index.html: ONE self-contained file, also opens by double-click
npm run report       # prints adjacency, table, results and all 62 events as text
```

Optional extras (not needed for the app):

```bash
python3 scripts/oracle_check.py   # independent cross-check of docs/oracle.md (definition-based)
bash scripts/mutation-check.sh    # breaks 7 rules on purpose; the tests must fail each time
npm run build && node scripts/e2e.cjs   # real-browser run + screenshots (needs Playwright)
```

## Using the app

| Control | What it does |
|---|---|
| **Load My Archipelago** | Validates and analyses the selected island plan (default: the main demo, "Tidewater Isles") and shows the map in its pre-traversal state. |
| **Step** | Advances **exactly one** recorded event. |
| **Run to End** | Walks the **same** event list to the end; the whole history stays visible. |
| **Reset** | Restores the originally loaded graph and the pre-traversal state exactly. |

The *Island plan* drop-down also contains the required test graphs (ring-only; root with two
children + second component + isolated island) and five deliberately **invalid** graphs, so
validation can be demonstrated in the UI. Invalid input shows an error panel naming the
offending node/edge/endpoint and clears every earlier replay and result.

One screen shows together: the island map with legend, the current event with its numerical
proof, the component count, the sorted critical bridges and articulation islands (final summary
at the end), the node table (ID, parent, discovery, low) and the full event history.

## How it is built

```
src/engine/    pure calculation engine (no UI imports)
  validate.ts    full-graph validation, errors name the node / edge / endpoint
  analyze.ts     sorted adjacency + low-link DFS + event recording
  replay.ts      folds events[0..index) into map / table / summary state
  describe.ts    plain-language text and exact formulas for each event
src/app/controller.ts   Load / Step / Run to End / Reset state machine (UI-independent)
src/ui/        SVG map, panels, styling (vanilla TypeScript, no framework)
src/data/      the main archipelago and the sample / invalid graphs
tests/         Vitest suites + hand-typed oracle + independent reference implementations
docs/          plan, oracle, event schema, design, prompts, plan-vs-actual, requirements matrix, evidence
```

Stack: TypeScript, Vite, Vitest, inline SVG. No backend, database, map service or graph library.

## Where to read next

- `docs/plan.md` the 5-step plan with checkpoints (written before coding)
- `docs/oracle.md` expected results derived **by hand**, never read by the app
- `docs/event-schema.md` the event types and emission order
- `docs/requirements-matrix.md` every requirement mapped to code and tests
- `docs/design.md` architecture, trade-offs, a code walkthrough for the interview
- `docs/plan-vs-actual.md` what changed from the plan and why
- `docs/prompts.md` prompt history and constraints given to the AI
- `docs/live-modification-guide.md` where to change things for likely small requests
- `docs/test-evidence/` captured test output, mutation check, oracle check, e2e result
- `docs/screenshots/` browser screenshots of key moments
"# treasure-island-bridge-map" 
