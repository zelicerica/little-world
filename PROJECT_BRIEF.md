# Little World: prototype brief

## Experience

A cozy illustrated village with six residents. The player watches their daily lives and changes circumstances. Characters should be understandable and occasionally surprising. Their decisions have visible resource and relationship consequences.

## Tonight's scope

- Six residents, homes, grocery store, clinic, workshop, and town hall on a compact 2D map.
- Play, pause, step, and simulation-speed controls.
- Resident inspector: goals, inventory, relationships, observations, and memories.
- Event feed with filters for resident and event type.
- Three interventions: storm, delayed food shipment, anonymous donation.
- JSON save/load and event-log replay.
- Offline decision policy enabled by default; optional model provider later.

Defer multiplayer, authentication, cloud deployment, vector databases, real payments, voice, and elaborate art pipelines.

## Starting cast

| Resident | Role | Goal | Trait |
| --- | --- | --- | --- |
| Ada | Grocer | Keep food available | Cautious |
| Ben | Mechanic | Repair workshop equipment | Practical |
| Cleo | Clinician | Keep residents healthy | Generous |
| Dev | Courier | Deliver supplies reliably | Sociable |
| Emi | Gardener | Grow a food reserve | Independent |
| Finn | Clerk | Balance the town budget | Orderly |

## Mechanics

One tick is 15 simulated minutes. Use integer currency units and integer item quantities. Define starting supplies, prices, wages, and opening hours in one scenario configuration. Income, harvests, and shipments must have explicit sources recorded in events. Define what happens when needs cannot be met; avoid unexplained deaths in this prototype.

Supported actions: move, buy, work, eat, rest, talk, give, wait. Each action has a validated actor, target, duration, preconditions, and effects. Talking requires co-location and can only convey information known to the speaker. A recipient records testimony as a belief with provenance, not automatically as objective truth.

Each resident receives their own observations, memories, visible nearby state, and legal action options. Never pass the complete town state into a resident's decision prompt. The player may inspect an omniscient view, clearly distinguished from resident knowledge.

## Architecture defaults

Use TypeScript and a lightweight web interface; select a supported scaffold during implementation. Keep the simulation engine independent of the UI. Use local JSON persistence initially. Suggested boundaries: engine, scenarios, resident policies, provider adapters, persistence, and interface.

The authoritative engine validates actions and applies all changes. Policies propose actions; they cannot edit state. Each event has a stable ID, tick, actor, type, structured effects, and relevant observation recipients. Use a seeded random generator and stable ordering. Record accepted model decisions so replay applies recorded events rather than asking a model to reproduce its answer.

## Optional model integration

Keep credentials server-side. Select provider and model explicitly when implementing the adapter. Validate structured decisions against legal actions. Bound context, calls per tick, concurrency, output length, retries, and run budget. On timeout or malformed output, use the offline policy and record the fallback. Keep in-character dialogue separate from concise decision explanations; do not request hidden chain-of-thought.

## Acceptance checks

1. Same seed and offline inputs produce the same event log.
2. Money and inventory never become negative; transfers balance and resource creation has recorded sources.
3. An isolated resident cannot act on a private event until they observe it or receive testimony.
4. Invalid actions leave authoritative state unchanged.
5. Save/load restores state, simulation clock, random-generator state, and pending work.
6. Replaying a saved event log reaches the same state without model calls.
7. Shipment delay changes resource availability and produces visible resident responses.
8. The interface can pause, inspect, intervene, save, and reload.
