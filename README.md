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

Prerequisites: Node.js 22.9 or newer and npm. A dependency download is needed for a fresh developer install; playing the bundled file requires none.

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
- `tests/*.test.mjs`: 52 tests covering determinism, accounting, private knowledge, invalid actions, persistence, replay, shipment consequences, and malicious/malformed input.
- `scripts/build.mjs`: static asset copying and standalone HTML packaging.

Actions take one or two ticks. The engine queues and completes them in stable resident order. Money transfers between residents and the town; meals and supplies have recorded external sources or consumption. Workshop repair uses supplies. Garden harvests stop during storms. The courier visits the garden, earns Emi’s trust through conversations, loads up to three reserve meals, then travels to the market and unloads them. Those meals remain in his inventory during travel and can be eaten if he gets hungry. Residents become uncomfortable when hungry; health bottoms out at 30 and nobody dies.

A resident policy receives only their own state, the visible needs and food of co-located neighbors, time, and legal action choices. It does not receive town state or other residents' memories. Role-specific policies now use local resource observations, trust, and personal conversation history. New observations record a structured topic and numeric amount where relevant. Private shipment-delay information is initially visible to residents at the market; a donation is visible at town hall. Storms are public. Co-located testimony preserves the speaker and original event reference.

Saves are schema version 1. The compact belief pool deduplicates repeated memories. Replay uses recorded state snapshots and never reruns decisions or invokes a model. Imported HTML-sensitive text is escaped; fixed resident metadata and state fields are validated before use.

## Validation and limits

TypeScript checks, static build, all 45 automated tests, and a full simulated day passed. Automated checks cover core simulation behavior. The user confirmed that browser appearance and interaction work on October 18, 2026. Automated browser interaction and visual QA were not run: the environment did not expose the Sites browser-control skill.

The default simulation uses transparent offline rules; optional hosted decisions use an LLM. Personalities affect priorities, but policies do not yet negotiate prices, invent plans, or generate free-form dialogue. The seeded random state is persisted for future richer policies; current decisions use stable rules. The player sees an omniscient view.

Replay retains snapshots in memory and is intended for short stories. The interface stops before 12,000 events; imported saves are limited to 40 MB. Save, then reset for a fresh story. No automatic background persistence, undo branching, or cloud deployment is implemented. An opt-in hosted provider for all six residents is available through the local server. The user confirmed live hosted Dev requests in version 1.3; version 1.4 is tested here with mocks.

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

## Version 1.2 — the cold-store crisis

Open the latest standalone HTML and click **Storm & cold-store outage**, then **Play**. The storm pauses garden harvests and damages the workshop refrigerator that protects the market’s inventory. The crisis panel shows repair progress, spoiled meals, spare parts, and each resident’s current knowledge. Filter the journal to **Cold-store crisis** to follow the story.

- The market alarm display and workshop reveal the failure locally. Elsewhere, residents must receive testimony. Knowing about the weather does not reveal the equipment failure.
- Ada warns neighbors about food at risk and shares her buffer. Dev routes learned news to Ben, Finn, Emi, and Cleo. He can carry emergency food while repairs are pending.
- Ben requests funding at town hall. Finn buys three refrigerator parts for 18 coins only after learning of the failure and while preserving a 40-coin reserve. If the budget is too low, a donation can help.
- Ben performs three repair actions at the workshop (34%, 68%, then 100%). Each consumes one refrigerator part and one general workshop supply. Ordinary supply procurement still works if needed.
- Emi releases emergency reserve meals to Dev after learning of the failure and at least one shared moment, instead of the usual two. Both must be at the garden.
- Cleo visits the market after hearing the news, shares food with hungry neighbors, and can help co-located residents recover health.
- Every simulated hour, up to two market meals spoil while the refrigerator is broken. The spoilage check happens before action completions for that tick. Personal meals and the garden reserve are outside this simplified spoilage mechanic. Losses never exceed market stock.
- Repairs stop further spoilage; earlier losses remain. Repeated storms during an unresolved outage extend the weather without resetting repair progress. A new storm after repairs starts a distinct incident and retains unused parts.

The panel is explicitly the player’s all-seeing view. Repair news spreads through observation and conversation; testimony retains the original observation time, preventing late reports from replacing newer knowledge. Critical outage reports remain shareable even when routine memories push them out of the recent-message window.

Version 1.2 passes 33 tests, TypeScript checking, and the standalone build. Tests cover the full repair sequence, balanced purchases/consumption, privacy, stalled funding and donation recovery, spoilage, repeated storms, invalid actions, save/replay, memory retention, and stale testimony. Earlier standalone versions were user-confirmed in the browser; this new UI has not received automated browser/visual QA.

Existing version-1 saves still load and do not gain an outage spontaneously. New storms use the new mechanics; old event history replays unchanged. This is a deterministic story mechanic: procurement is immediate, funding uses a fixed reserve rule, trust counts shared moments, and health recovery is simplified. No model calls or paid services are involved.

## Version 1.4 — optional hosted API for all six residents

The standalone HTML still runs entirely offline. **Hosted AI runs through the local Node server**, with the browser opening http://127.0.0.1:4173. The API key stays on your computer in an ignored environment file. The model service itself is hosted by OpenAI; no website deployment is needed.

The default model is `gpt-5.4-mini`, selected after checking the official model documentation on October 18, 2026. Its documented structured-output support and no-reasoning setting fit short resident action choices. The model is configurable. Access and billing depend on your API account; a ChatGPT subscription is not treated as API credentials or credits.

### Set up on Windows

1. Download the complete current GitHub repository as a ZIP and extract it. Hosted mode needs the repository, not just the standalone HTML.
2. Install Node.js 22.9 or newer if it is not already installed.
3. Copy `.env.example` to `.env.local` in the project folder. Edit `.env.local` locally with a text editor. Put your API key in `OPENAI_API_KEY`, set `LITTLE_WORLD_AI_ENABLED=true`, and review the model and limits. Do not paste keys into chat or commit `.env.local`.
4. Double-click `Start_Little_World.cmd`. It installs dependencies if they are missing and starts the local server. This Windows launcher has not been exercised in Windows here.
5. Open the printed local URL. Turn on **Let all six use hosted AI**, then press Play or Step. API calls start only after that opt-in and a simulation step. Close the terminal or press Ctrl+C to stop the server.

The equivalent terminal commands, from the extracted project directory, are:

```sh
npm ci
npm start
```

`npm start` loads `.env.local` when it exists. An absent file or disabled AI keeps the server in offline mode. The built assets are included; after changing source, run `npm run build` before starting. The HTTP application and real SDK request construction were verified in automated tests with mocked provider transport; an actual credentialed startup/request was not run here.

### Boundaries and limits

- All six residents use the hosted adapter when enabled, rotating in cast order. A busy resident keeps their place until ready. At most one request is attempted every four simulated ticks, across the whole village. Everyone uses offline rules between model turns. The request cap remains shared, not multiplied by six.
- The provider receives only the deciding resident’s bounded memories, personal state, relationships, legal action choices, local resources, and visible nearby residents. Neighbor memories and town-wide state are omitted. Memory text is explicitly treated as untrusted story data.
- The model returns an index from the legal list, a public reason, and optional short dialogue. The engine validates the index and applies the selected action. Creative dialogue is labeled flavor, never inserted as new evidence into resident beliefs. Actual talk actions still transmit only known facts with provenance.
- Default limits: 20 provider attempts per server run shared by all tabs, one concurrent request, no retries, 256 output tokens, an 8-second provider deadline, and a 20 KB model-context limit. Failed calls consume an attempt. These are request/output bounds, **not a dollar spending cap**. Configure provider-side spending controls separately; usage is charged by your provider. Restarting the server resets the local counter.
- The page shows model and attempt counts. Token totals, where available, reflect successful validated responses; failed requests can still incur provider charges without reported token counts.
- Bad JSON, invalid choices, provider errors, missing configuration, timeouts, and exhausted attempts use offline fallback, with a record in the journal. Cadence-only offline turns do not add failure events.
- The server binds to `127.0.0.1`. Same-origin/Host checks and a per-process session token protect requests. No public hosting or multi-user authentication is configured. Only an explicit static-file allowlist is served; environment and server source files are excluded.
- Requests are stateless with `store:false`, no previous-response ID, no model tools, and no shared conversation. This option is not a claim of zero data retention; provider policies still apply.
- Accepted actions, model labels, dialogue, explanations, and fallbacks are recorded. Save/replay never calls a model.

Code: `src/hosted.ts` bounds context; `server/provider.mjs` uses the version-matched AI SDK/OpenAI provider; `server/app.mjs` implements local serving, validation, limits, and redacted errors; `server/start.mjs` starts the listener. No API key is present in source, bundles, example environment files, saves, or logs.

All **52 tests pass**, including actual loopback HTTP tests and a mocked transport through the real installed AI SDK. No paid/live model request, API account setup, Windows launcher run, or new browser visual check was performed. Existing saves remain compatible. Optional hosted behavior is not deterministic; recorded replay remains deterministic.

Official references checked during implementation:
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/guides/structured-outputs

### Compare the same refrigerator crisis

Click **Run crisis comparison (uses API)** to run two isolated 24-hour trials from the original snapshot and random state. Both receive the same storm/outage. One uses offline rules; the other rotates hosted opportunities among all six residents, with rules between those turns and on failures. The local comparison limit defaults to 12 and can be 1–20; it also respects the server’s remaining shared budget. This button explicitly opts into paid calls even if live hosted mode is unchecked. No experiment runs automatically.

The table reports repair time, spoiled meals, combined hours with hunger at least 70, successful gifts/conversations, budget, and hosted opportunities/accepted choices. These are observations from one mixed-policy trial, not evidence of general model superiority. Download each trial as a normal save to load and replay without more calls, or download the paired report. Cancel stops further requests; completed provider requests still count. Your live village remains unchanged.

### Update an existing Windows installation

Stop the old server. Download and extract the current full repository into a new folder, copy your existing private `.env.local` into that folder locally, then run `Start_Little_World.cmd` there. Keep the old folder until the new version works. A fresh folder installs the updated dependencies automatically. If updating the old folder in place, run `npm ci` before restarting. Your existing request limit remains shared by all six residents; there is no need to increase it. Refresh the local page and enable **Let all six use hosted AI**.

Version 1.4 received type checks, 52 automated tests, loopback HTTP integration checks, and standalone script syntax validation. No paid model calls or browser visual/interaction check of version 1.4 were run here.
