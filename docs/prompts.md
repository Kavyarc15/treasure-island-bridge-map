# AI interaction log

Assistant used: Claude (via the Claude app with a coding workspace). Everything below is the
real sequence of requests made for this project, copied as typed (spelling kept). **Add your own
screenshots or later prompts here before the interview**: the interviewers ask to see yours.

## 1. Broad start: understand the problem (iteration 1)

> Analyse this entire file in detail...it contains a problem statement that i must devevlop into a complete project... all the requirements according to the document must be met...make sure to read the student guide also thoruoghly and make sure to that the project is made according to the guide and requirements given with the problem statement.....but first for now just explain the entire problem statement file to me in detail dont miss an point or requirement and explain it to me in simple words and give me an implementation plan for the same

*(attached: the problem statement .docx and the Student Guide .docx)*

Result: a plain-language explanation, every requirement and acceptance criterion listed, and a
first 5-step plan.

## 2. Verify before building (iteration 2: ask the AI to audit its own answer)

> analyse this problem statement and requirements carefully in detail and tell me if the above explanation and implementation plan covers all the requirements or not

Result: the audit found plan gaps, which became explicit requirements for the build:
boundary validation tests (0/13 nodes, 21 edges, ID format, empty name, NaN/Infinity, duplicate
edge ID, reversed duplicate pair), ASCII (not locale) ordering, shuffle test that also changes
coordinates, one-clock-across-components test, Load/Step/Reset semantics, an error panel for
invalid input, and the process deliverables (plan first, prompt log, plan-vs-actual).

## 3. Consolidate (iteration 3)

> ok now give full explanation like u did the first time but by adding these gaps u told now and make sure all needs requirements and problems are met and solved

Result: one merged explanation with a decision table that settles each ambiguous point
(for example: Load shows the pre-traversal state; edges are recorded once per adjacency entry;
root articulation is emitted when the root finishes), a concrete event schema, a full test plan
and the final 5-step plan.

## 4. Build (iteration 4)

> ok start bulding the project exactly as u said keeping in mind that all conditions and requirements are met...Use python , Typescript , vite , svg and css

## Constraints the assistant was held to (design constraints for the interview)

- Stack: TypeScript, Vite, Vitest, vanilla DOM and inline SVG. No framework, no graph library, no backend or database.
- The algorithm lives in a pure module (`src/engine`) with no UI imports.
- One recorded event list; Step and Run to End use it; the UI only folds events (never recomputes).
- Determinism: adjacency from IDs, ascending ASCII order for roots and neighbours, never `localeCompare`.
- The oracle (`docs/oracle.md`, `tests/oracle.ts`) is hand-derived first and never read by the app.
- Tests must be able to *fail*: a mutation script breaks seven rules on purpose.
- State uses text and symbols as well as colour.

## Problem-solving examples (AI helped debug)

| Problem | How it was found | Fix |
|---|---|---|
| "Root with two children" sample had the wrong root | Writing the root-ordering test | Renamed IDs; test asserts roots `ATOLL, DELTA, EBB` |
| Test assumed a non-root articulation event always follows `CLASSIFY_EDGE` | A failing test | Test now covers the root-rule position too |
| Headline "Harbour Market (food stalls) (HARBOR)" | Browser run asserted the headline text | Use the short name |
| Island clipped at the bottom of the map | Looking at the screenshot | Auto-fit projection + unit tests |
| One mutation survived most tests | Mutation check output | Added a deterministic back-connection test |

## Reusable prompt templates for the live modification

Turn the interviewer's request into a precise instruction, for example:

```
Context: TypeScript project, pure engine in src/engine, events folded in src/engine/replay.ts,
UI in src/ui. Tests in tests/ (Vitest). Do not change the event order or the contracted rules.
Request: <restate the user's request in one sentence>.
Constraints: keep Step / Run to End / Reset identical; keep the engine free of UI imports;
add or update a focused test; do not touch docs/oracle.md unless the main graph changes.
Show me the diff, then tell me which existing tests should still pass and which new test proves the change.
```

After the assistant answers: read the diff, say what you **accepted, changed or rejected** and why,
run `npm test`, and look at the screen once.
