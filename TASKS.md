# Build checklist

## 1. Simulation foundation

- [x] TypeScript + lightweight native browser interface; verified commands in README.
- [x] Typed world, residents, actions, memories, observations, and events.
- [x] Six-resident scenario with centralized starting supplies, prices, wages, and hours.
- [x] Seeded clock, stable ordering, queued action durations, validation, event application.
- [x] Offline policies and invariant tests.

## 2. Playable interface

- [x] Illustrated CSS/SVG map, buildings, residents, and movement.
- [x] Play/pause, step, speed, and reset controls.
- [x] Resident inspector, needs, inventories, goals, relationships, and provenance.
- [x] Journal filters for resident/event type and optional decision records.
- [x] Explicit player omniscience versus resident knowledge.
- [x] Responsive layouts, native keyboard controls, visible focus, reduced motion.

## 3. Consequences and persistence

- [x] Storm, shipment delay, and donation.
- [x] Co-located conversations with testimony provenance.
- [x] Schema-versioned compact JSON save/load with pending actions and RNG state.
- [x] Event snapshot replay and history slider without policy/model calls.
- [x] Full simulated day; ten engine tests pass.
- [x] TypeScript check and production static/standalone build pass.
- [x] User smoke check: browser appearance and interaction confirmed working on October 18, 2026.
- [ ] Automated browser visual/interaction QA: unavailable Sites browser-control skill.

## 4. Optional AI residents — deferred

- [ ] Choose provider/model, access, and explicit spending limits.
- [ ] Implement server-side credentials, structured decisions, legal-action validation, and budgets.
- [ ] Test malformed responses, timeouts, and offline fallback.
- [ ] Store accepted model decisions for replay.

## Handoff

Playable offline prototype delivered in `Little_World.html`; full source and compiled assets are included. Extract the ZIP, open that file, and press Play. Save before closing the tab.

Ten automated tests pass, including a low-food shipment scenario, private donation testimony, balanced transfers, and continued deterministic execution after save/load. No model integration or deployment was performed. Browser appearance and interaction were confirmed by the user; automated browser QA remains unperformed.

Known limits: offline rules are simple; there is no free-form dialogue or branching replay. Snapshot history is intended for short runs. The UI stops near 12,000 events; saves above 40 MB are rejected. No autosave.

Next useful action: user opens the standalone file and plays the first morning; then perform browser visual QA in an environment that supports it and improve resident decision variety.
