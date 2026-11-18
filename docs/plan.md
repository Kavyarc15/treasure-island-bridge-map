# Implementation Plan: Treasure-Island Bridge Safety Map

Written **before** any code (as the problem statement requires). Changes made
while building are recorded in `plan-vs-actual.md`.

**Stack (kept deliberately small):** TypeScript + Vite + Vitest, vanilla DOM and
inline SVG for the map. No UI framework, no graph library, no backend, no
database. The algorithm lives in a pure engine module (`src/engine`) that
imports nothing from the UI.

| # | Step | Checkpoint (working evidence that completes the step) |
|---|------|-------------------------------------------------------|
| 1 | **Design + oracle.** Fix the data model, event schema, ordering rules, Load/Step/Run/Reset semantics, error format. Design the main archipelago and derive its expected answers **by hand**. | `docs/event-schema.md` and `docs/oracle.md` exist. The oracle is cross-checked by an independent Python script that the app never reads. |
| 2 | **Engine.** Validation, ASCII-sorted adjacency, low-link DFS with one shared clock, event recording, event-fold replay state. | The main graph reproduces the oracle (discovery order, table, component count, bridge IDs, articulation IDs). |
| 3 | **Engine tests.** Boundary tests (strict `>`, non-root `>=`, root child count), back-edge propagation, shuffle test, cycle-only graph, combined graph, validation matrix, event ordering, determinism, reset. | `npm test` is fully green **before any UI work starts**. |
| 4 | **UI.** SVG map with six visibly distinct states (colour + symbol/line style) and a legend, node table, current-event proof panel, component count, critical summaries, event history, error panel, four controls. The UI only replays events. | One screen shows everything. Step and Run to End end in the same state. Reset restores the start. Screenshots captured. |
| 5 | **Docs + prep.** README, design summary, prompt log, plan-vs-actual, screenshots, test output, live-modification practice. | A fresh clone runs with `npm install && npm run dev`; `npm test` passes. |

## Verification per stage
- Stage 1: hand trace compared to an independent implementation.
- Stage 2: oracle test.
- Stage 3: full test suite, every acceptance bullet mapped to a test (see `docs/requirements-matrix.md`).
- Stage 4: browser run through Playwright, stepped and complete runs compared.
- Stage 5: clean install and test run.
