# Little World

A cozy, offline village simulation with six residents, private memories, limited resources, and a story you can change.

## Play — no installation required

1. Extract `Little_World.zip` using **Extract All** on Windows.
2. Double-click **Little_World.html**. It opens in Edge, Chrome, or another modern browser.
3. Press **Play**. Click a resident to inspect their goals, needs, possessions, and memories.

Use **Step** to advance fifteen minutes. Try **Delay a shipment** and watch the market. Use **Save world** to download your story as JSON. **Load** restores it. **Replay** and the slider revisit recorded history; **Return to live** resumes the current world. Replay cannot change history.

Everything runs in your browser. No network requests, account, API key, paid service, or model are required. Closing the tab discards unsaved progress. Save before leaving. The New day button resets the entire world, not only the clock.

## Develop

The application uses TypeScript, DOM APIs, and CSS. The engine is independent of the interface. `dist/` and the standalone HTML are already compiled.

Prerequisites: Node.js 22 or newer and npm. A dependency download is needed for a fresh developer install; playing the bundled file requires none.

```sh
npm ci
npm run check
npm test
npm run build
```

`npm run build` compiles modules into `dist/` and generates the self-contained `Little_World.html`. These commands were verified with Node 24.19.0 and npm 11.9.0. `npm test` builds first and runs Node's test runner.

For local HTTP serving, Python 3 is an optional convenience:

```sh
python -m http.server 4173 --directory dist
```

Then visit http://localhost:4173. This serving command is provided for local use and was not exercised in this environment.

## Architecture

- `src/engine.ts`: types, scenario constants, seeded clock, legal actions, offline decisions, events, knowledge views, validation, compact saves, and replay.
- `src/ui.ts`: map, resident inspector, journal filters, controls, interventions, and file handling.
- `src/style.css`: responsive illustrated map and interface; reduced-motion support.
- `tests/engine.test.mjs`: ten tests covering determinism, accounting, private knowledge, invalid actions, persistence, replay, shipment consequences, and malicious/malformed input.
- `scripts/build.mjs`: static asset copying and standalone HTML packaging.

Actions take one or two ticks. The engine queues and completes them in stable resident order. Money transfers between residents and the town; meals and supplies have recorded external sources or consumption. Workshop repair uses supplies. Garden harvests stop during storms. The courier moves reserve meals into the market. Residents become uncomfortable when hungry; health bottoms out at 30 and nobody dies.

A resident policy receives only their own state, the visible needs and food of co-located neighbors, time, and legal action choices. It does not receive town state or other residents' memories. Private shipment-delay information is initially visible to residents at the market; a donation is visible at town hall. Storms are public. Co-located testimony preserves the speaker and original event reference.

Saves are schema version 1. The compact belief pool deduplicates repeated memories. Replay uses recorded state snapshots and never reruns decisions or invokes a model. Imported HTML-sensitive text is escaped; fixed resident metadata and state fields are validated before use.

## Validation and limits

TypeScript checks, static build, all ten engine tests, and a full simulated day passed. Automated checks cover core simulation behavior. The user confirmed that browser appearance and interaction work on October 18, 2026. Automated browser interaction and visual QA were not run: the environment did not expose the Sites browser-control skill.

This prototype uses transparent offline rules, not an LLM. Behavior is deliberately simple. Policies do not yet negotiate prices, invent plans, or generate free-form dialogue. The seeded random state is persisted for future richer policies; current decisions use stable rules. The player sees an omniscient view.

Replay retains snapshots in memory and is intended for short stories. The interface stops before 12,000 events; imported saves are limited to 40 MB. Save, then reset for a fresh story. No automatic background persistence, undo branching, live model provider, or cloud deployment is implemented.

Next useful extension: improve resident schedules and decision variety, then add an optional server-side model adapter after explicitly choosing a provider and spending budget.
