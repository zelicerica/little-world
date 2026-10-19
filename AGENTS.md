# Engineering instructions

## Goal

Deliver the playable prototype described in PROJECT_BRIEF.md. Prefer completing one coherent simulation loop before expanding scope. Keep TASKS.md accurate as milestones finish.

## Boundaries

- The engine owns time, money, inventory, movement, and state transitions.
- Policies, dialogue, and models may propose actions but never mutate state.
- Keep resident observations distinct from global truth and player inspection.
- Preserve belief provenance: direct observation, testimony, or inference.
- No credentials in source, browser bundles, logs, or exported saves.
- Work offline by default; do not provision paid services or publish without authorization.
- Do not infer authorization to run parallel coding agents from the fictional residents.

## Implementation

Use typed actions and events, stable IDs, schema-versioned saves, a seeded random generator, and deterministic ordering. Treat imported saves and model responses as untrusted input. Reject malformed input with an actionable error. Implement accessible keyboard controls, visible focus, readable text, and responsive layout.

Start with simple map shapes and expressive resident markers. Add polished spacing, colors, movement, and status indicators after the simulation loop works.

## Verification

Test meaningful invariants from PROJECT_BRIEF.md, especially accounting, knowledge isolation, invalid actions, and replay. Run the available type checks and build. Exercise the complete browser flow if browser tooling is available; otherwise explicitly report that visual interaction remains unverified. Do not claim tests or model integration ran unless they actually did.

## Handoff

Document actual install/run commands in README.md after selecting the scaffold. Record completed work, known limitations, and the next useful action in TASKS.md. Do not leave speculative commands presented as verified instructions.
