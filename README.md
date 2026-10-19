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
- `tests/engine.test.mjs`: 21 tests covering determinism, accounting, private knowledge, invalid actions, persistence, replay, shipment consequences, and malicious/malformed input.
- `scripts/build.mjs`: static asset copying and standalone HTML packaging.

Actions take one or two ticks. The engine queues and completes them in stable resident order. Money transfers between residents and the town; meals and supplies have recorded external sources or consumption. Workshop repair uses supplies. Garden harvests stop during storms. The courier visits the garden, earns Emi’s trust through conversations, loads up to three reserve meals, then travels to the market and unloads them. Those meals remain in his inventory during travel and can be eaten if he gets hungry. Residents become uncomfortable when hungry; health bottoms out at 30 and nobody dies.

A resident policy receives only their own state, the visible needs and food of co-located neighbors, time, and legal action choices. It does not receive town state or other residents' memories. Role-specific policies now use local resource observations, trust, and personal conversation history. New observations record a structured topic and numeric amount where relevant. Private shipment-delay information is initially visible to residents at the market; a donation is visible at town hall. Storms are public. Co-located testimony preserves the speaker and original event reference.

Saves are schema version 1. The compact belief pool deduplicates repeated memories. Replay uses recorded state snapshots and never reruns decisions or invokes a model. Imported HTML-sensitive text is escaped; fixed resident metadata and state fields are validated before use.

## Validation and limits

TypeScript checks, static build, all 21 engine tests, and a full simulated day passed. Automated checks cover core simulation behavior. The user confirmed that browser appearance and interaction work on October 18, 2026. Automated browser interaction and visual QA were not run: the environment did not expose the Sites browser-control skill.

This prototype uses transparent offline rules, not an LLM. Personalities affect priorities, but policies do not yet negotiate prices, invent plans, or generate free-form dialogue. The seeded random state is persisted for future richer policies; current decisions use stable rules. The player sees an omniscient view.

Replay retains snapshots in memory and is intended for short stories. The interface stops before 12,000 events; imported saves are limited to 40 MB. Save, then reset for a fresh story. No automatic background persistence, undo branching, live model provider, or cloud deployment is implemented.

Next useful extension: longer-term schedules and richer negotiation, then an optional server-side model adapter after explicitly choosing a provider and spending budget.

## Version 1.1 — personalities that change decisions

The resident inspector now shows **Why this choice?**. Enable **Decisions** in the journal to see recorded explanations beside actions. These are short rule explanations, not model reasoning.

| Resident | Behavior |
| --- | --- |
| Ada | Tries to keep three personal meals, but stops building that buffer when only two market meals remain. Shares shortage news with nearby neighbors. |
| Cleo | May give her last meal to a hungry neighbor before eating herself, unless her own hunger is at least 85. |
| Emi | Shares personal spare meals only with trusted neighbors. Releases garden reserves to Dev only after two shared moments, while both are at the garden. Waits out storms. |
| Dev | Visits Emi, builds trust, carries reserve meals to the market, and shares learned information with its source preserved. An hourly conversation cooldown leaves time for deliveries. |
| Ben | When he observes an unfinished workshop without supplies, goes to town hall and tells Finn. Waits for the funding decision, then returns to repairs. Stops consuming supplies when repairs are complete. |
| Finn | Pauses town wages below 40 coins and resumes at 60. After hearing a recent supply-shortage report, may buy six supplies for 12 coins while preserving the 40-coin reserve. |

Pausing wages allows productive work to continue without pay; normal wages remain two coins per completed work action. Outside supply purchases explicitly record coins leaving the town and supplies entering. Procurement is immediate in this prototype. Trust currently counts shared conversations and gifts, rather than modeling nuanced reputation. Residents do not receive distant residents’ memories or global balances in their decision views.

**Compare two days** runs two isolated 24-hour trials from the original world snapshot. One receives an eight-hour shipment delay. By default both start with two market meals, an empty reserve, and hungry residents carrying no meals. Turn off the shortage option to use the original supplies. The live world and its history are unchanged. The table reports meals eaten/shared, conversations, market food, budget, repair progress, and resident-hours at hunger 70 or above.

Existing schema-version-1 saves remain loadable. Old recorded history replays as saved; future ticks use the new policies. Version 1.1’s build, TypeScript checks, and all 21 tests pass. Browser appearance and interaction of version 1.0 were user-confirmed; version 1.1 visual/browser interaction has not been verified here.
