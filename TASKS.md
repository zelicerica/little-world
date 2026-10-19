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
- [x] Full simulated day; 21 engine tests pass.
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

21 automated tests pass, including a low-food shipment scenario, private donation testimony, balanced transfers, and continued deterministic execution after save/load. Hosted integration code has been added for Dev; no live model request or deployment was performed. Browser appearance and interaction were confirmed by the user; automated browser QA remains unperformed.

Known limits: offline rules are simple; there is no free-form dialogue or branching replay. Snapshot history is intended for short runs. The UI stops near 12,000 events; saves above 40 MB are rejected. No autosave.

Next useful action: user opens the standalone file and plays the first morning; then perform browser visual QA in an environment that supports it and improve resident decision variety.

## 5. Personalities — version 1.1

- [x] Distinct food-buffer, generosity, trust, courier, supply-request, and budget priorities.
- [x] Local resource views and structured observations; no global state in resident decisions.
- [x] Decision explanations in inspector and journal.
- [x] Prevent repeated fact sharing to the same recipient; conversation cooldown.
- [x] Actual reserve carrying between garden and market, gated by trust.
- [x] Ben → Finn shortage testimony, external supply purchase, and wage pause/resume.
- [x] Same-start normal/delayed-shipment comparison with optional food shortage.
- [x] Preserve schema-version-1 saves, personality state, and recorded replay.
- [x] Eleven new tests; all 21 tests pass.
- [ ] User/browser visual interaction check of version 1.1.

Known limits: offline dialogue remains templated, trust counts shared moments, and supply purchases arrive immediately. The original version was user-verified in a browser; this update has passed automated engine and build checks only.

## 6. Cold-store crisis — version 1.2

- [x] Storm damage, distinct incident identity, three repair stages, parts, and bounded spoilage.
- [x] Funding after testimony; parts and repair supplies have balanced accounting and explicit sources.
- [x] Resident cooperation: Ada’s warning, Dev’s news/deliveries, Ben’s request/repairs, Finn’s funding, Emi’s emergency release, Cleo’s market support.
- [x] Local alarm visibility; private knowledge outside market/workshop.
- [x] Keep essential news shareable and preserve original observation time through testimony.
- [x] Crisis status panel, knowledge badges, and crisis journal filter.
- [x] Old saves, mid-repair saves, deterministic continuation, and immutable replay snapshots.
- [x] Twelve new tests; all 33 tests pass.
- [ ] Browser/visual interaction check of version 1.2.

Next user action: open the updated HTML, trigger Storm & cold-store outage, press Play, and inspect Ben/Finn and the journal. The baseline scenario repairs automatically; lack of funds can delay it. Previous versions were user-confirmed working; this update’s browser UI remains unverified here.

## 7. Hosted API — version 1.3

- [x] OpenAI Responses via installed AI SDK 7 / OpenAI provider; configurable model (default gpt-5.4-mini).
- [x] Private bounded resident context, structured legal-action selection, decorative dialogue, and offline fallbacks.
- [x] Local Node server; server-side key, same-origin/Host checks, session token, and static-file allowlist.
- [x] Shared 20-attempt run limit, output/context limits, timeout, one active request, and no retries.
- [x] Opt-in hosted Dev controls; offline standalone remains functional.
- [x] Record hosted decisions and fallbacks in saves/replay; no model calls for replay.
- [x] Windows launcher and local environment example (no credentials).
- [x] Twelve new automated tests; all 45 tests pass, including loopback HTTP and mocked real-SDK transport.
- [ ] User API account, local key, and spending configuration.
- [ ] One live observed request and provider billing verification.
- [ ] Browser/visual check of hosted mode and Windows launcher execution.

No live or paid model call was made. Request limits are not a dollar budget and reset when the server restarts. Hosted mode requires the local Node server and full project; the standalone HTML uses offline rules. Next action: walk the user through API account/key configuration locally, one step at a time.


## 8. Six hosted residents and paired crisis experiment — version 1.4

- [x] Canonical role/personality prompts for all six residents; own bounded memories and location-gated resources only.
- [x] Fair rotating opportunities, one per simulated hour at most, one shared unchanged server cap.
- [x] Readable action labels in model choices and journals; engine remains authoritative.
- [x] Explicit paid comparison button, bounded request limit, cancellation, same initial snapshot/storm/horizon, and outcome metrics.
- [x] Separate replayable trial saves and paired report; live world remains unchanged.
- [x] Seven additional tests; all 52 tests pass, including six-resident loopback shared-budget enforcement and mocked SDK transport.
- [x] Type checks and standalone script syntax check.
- [ ] User visual/interaction verification of version 1.4.
- [ ] User-observed hosted crisis comparison.

The user confirmed version 1.3 live hosted requests locally. No paid model call was made here. Version 1.4 browser visual QA remains unverified. Next action: update the full project while preserving the user's private environment file, restart, and inspect six-resident hosted journal entries before choosing a bounded comparison.
