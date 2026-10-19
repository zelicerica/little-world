export const scenario = { price: 3, wage: 2, shipment: 24, harvest: 3, startingTreasury: 240, startingFood: 18, startingSupplies: 20, opening: 32, closing: 76 };
export const places = { grocer: { name: 'Ada’s Market', x: 24, y: 28, icon: '🥕' }, clinic: { name: 'Cleo’s Clinic', x: 76, y: 27, icon: '✚' }, workshop: { name: 'The Workshop', x: 78, y: 67, icon: '⚒' }, garden: { name: 'Community Garden', x: 23, y: 68, icon: '🌱' }, hall: { name: 'Town Hall', x: 50, y: 18, icon: '⚑' }, square: { name: 'Village Square', x: 50, y: 49, icon: '⛲' }, 'ada-home': { name: 'Ada’s home', x: 12, y: 12, icon: '⌂' }, 'ben-home': { name: 'Ben’s home', x: 88, y: 84, icon: '⌂' }, 'cleo-home': { name: 'Cleo’s home', x: 88, y: 12, icon: '⌂' }, 'dev-home': { name: 'Dev’s home', x: 55, y: 84, icon: '⌂' }, 'emi-home': { name: 'Emi’s home', x: 12, y: 84, icon: '⌂' }, 'finn-home': { name: 'Finn’s home', x: 38, y: 8, icon: '⌂' } };
export function create(seed = 42) {
    const cast = [['ada', 'Ada', 'Grocer', 'Cautious', 'Keep food available', 'grocer', '#d48348'], ['ben', 'Ben', 'Mechanic', 'Practical', 'Repair workshop equipment', 'workshop', '#607da6'], ['cleo', 'Cleo', 'Clinician', 'Generous', 'Keep residents healthy', 'clinic', '#b8798a'], ['dev', 'Dev', 'Courier', 'Sociable', 'Deliver supplies reliably', 'square', '#a48c43'], ['emi', 'Emi', 'Gardener', 'Independent', 'Grow a food reserve', 'garden', '#729361'], ['finn', 'Finn', 'Clerk', 'Orderly', 'Balance the town budget', 'hall', '#8c78aa']];
    const world = { tick: 28, rng: seed >>> 0, treasury: scenario.startingTreasury, shopFood: scenario.startingFood, reserve: 6, supplies: scenario.startingSupplies, repaired: 0, stormUntil: 0, shipmentDue: 40, residents: cast.map(([id, name, role, trait, goal, job, color]) => ({ id, name, role, trait, goal, color, home: `${id}-home`, job: job, location: `${id}-home`, money: 24, food: 2, hunger: 20, energy: 90, health: 100, busyUntil: 0, pending: null, status: 'Starting the morning', beliefs: [], relationships: {} })) };
    return { schemaVersion: 1, initial: structuredClone(world), world, events: [] };
}
const total = (w) => ({ money: w.treasury + w.residents.reduce((n, r) => n + r.money, 0), food: w.shopFood + w.reserve + w.residents.reduce((n, r) => n + r.food, 0), supplies: w.supplies });
function emit(g, before, actor, type, text, recipients, source) {
    const a = total(before), b = total(g.world), id = `e${g.events.length + 1}`;
    for (const r of g.world.residents.filter(r => recipients.includes(r.id)))
        r.beliefs.push({ id: `${id}-${r.id}`, text, tick: g.world.tick, provenance: 'observation', source: actor, eventId: id });
    g.events.push({ id, tick: g.world.tick, actor, type, text, recipients, effects: { money: b.money - a.money, food: b.food - a.food, supplies: b.supplies - a.supplies, ...(source ? { source } : {}) }, after: { ...g.world, residents: g.world.residents.map(r => ({ ...r, pending: r.pending ? { ...r.pending } : null, beliefs: r.beliefs.slice(), relationships: { ...r.relationships } })) } });
}
export function legal(w, r) {
    if (r.pending)
        return [];
    const actions = [{ actor: r.id, kind: 'wait', duration: 1 }, { actor: r.id, kind: 'rest', duration: 2 }];
    for (const p of Object.keys(places))
        if (p !== r.location)
            actions.push({ actor: r.id, kind: 'move', target: p, duration: 2 });
    if (r.food > 0)
        actions.push({ actor: r.id, kind: 'eat', duration: 1 });
    if (r.location === 'grocer' && w.tick % 96 >= scenario.opening && w.tick % 96 < scenario.closing && w.shopFood > 0 && r.money >= scenario.price)
        actions.push({ actor: r.id, kind: 'buy', duration: 1 });
    if (r.location === r.job && w.treasury >= scenario.wage && w.tick % 96 >= scenario.opening && w.tick % 96 < scenario.closing)
        actions.push({ actor: r.id, kind: 'work', duration: 2 });
    for (const other of w.residents.filter(o => o.id !== r.id && o.location === r.location)) {
        if (r.food > 0)
            actions.push({ actor: r.id, kind: 'give', target: other.id, duration: 1 });
        for (const fact of r.beliefs.slice(-8))
            actions.push({ actor: r.id, kind: 'talk', target: other.id, fact: fact.id, duration: 1 });
    }
    return actions;
}
export function act(g, a) {
    if (!a || !g.world.residents.some(r => r.id === a.actor))
        return false;
    const r = g.world.residents.find(r => r.id === a.actor);
    if (!legal(g.world, r).some(x => JSON.stringify(x) === JSON.stringify(a)))
        return false;
    const before = structuredClone(g.world);
    r.pending = structuredClone(a);
    r.busyUntil = g.world.tick + a.duration;
    r.status = a.kind === 'move' ? `Walking to ${places[a.target].name}` : `${a.kind[0].toUpperCase() + a.kind.slice(1)}ing`;
    emit(g, before, r.id, 'decision', `${r.name} chose to ${a.kind}${a.target ? ` → ${places[a.target]?.name ?? a.target}` : ''}.`, [], undefined);
    return true;
}
export function view(w, r) { return { self: structuredClone(r), nearby: w.residents.filter(o => o.id !== r.id && o.location === r.location).map(o => ({ id: o.id, name: o.name, location: o.location, hunger: o.hunger, food: o.food })), legalActions: legal(w, r), tick: w.tick }; }
function choose(v) {
    const r = v.self, opts = v.legalActions, pick = (kind, target) => opts.find(a => a.kind === kind && (!target || a.target === target));
    if (r.hunger >= 38 && pick('eat'))
        return pick('eat');
    if (r.energy < 28)
        return pick('rest');
    const hour = v.tick % 96;
    if (hour < 28 || hour >= 80)
        return r.location === r.home ? pick('rest') : pick('move', r.home);
    if (r.food < 2) {
        if (pick('buy'))
            return pick('buy');
        if (r.location !== 'grocer')
            return pick('move', 'grocer');
    }
    const hungry = v.nearby.find(o => o.food === 0 && o.hunger > 40);
    if (hungry && r.food > 1)
        return pick('give', hungry.id);
    if ((v.tick + r.id.length) % 7 === 0 && pick('talk'))
        return opts.filter(a => a.kind === 'talk').at(-1);
    if (r.location !== r.job)
        return pick('move', r.job);
    return pick('work') ?? pick('rest');
}
function complete(g, r) {
    const w = g.world, a = r.pending, before = structuredClone(w);
    r.pending = null;
    r.status = 'Watching the village';
    let text = '', source;
    if (a.kind === 'move') {
        r.location = a.target;
        text = `${r.name} arrived at ${places[r.location].name}.`;
    }
    if (a.kind === 'buy') {
        if (w.shopFood > 0 && r.money >= scenario.price) {
            w.shopFood--;
            r.food++;
            r.money -= scenario.price;
            w.treasury += scenario.price;
            text = `${r.name} bought a meal for ${scenario.price} coins.`;
        }
        else
            text = `${r.name} found no food available and will try again.`;
    }
    if (a.kind === 'eat' && r.food > 0) {
        r.food--;
        r.hunger = Math.max(0, r.hunger - 45);
        text = `${r.name} ate a meal.`;
        source = 'Meal consumed';
    }
    if (a.kind === 'rest') {
        r.energy = Math.min(100, r.energy + 28);
        r.health = Math.min(100, r.health + 2);
        text = `${r.name} took a little time to rest.`;
    }
    if (a.kind === 'work') {
        if (w.treasury >= scenario.wage) {
            w.treasury -= scenario.wage;
            r.money += scenario.wage;
            r.energy = Math.max(0, r.energy - 6);
            text = `${r.name} worked and earned ${scenario.wage} coins.`;
            if (r.id === 'emi' && w.stormUntil <= w.tick) {
                w.reserve += scenario.harvest;
                source = 'Garden harvest';
                text += ' Harvested 3 meals for the reserve.';
            }
            if (r.id === 'ben' && w.supplies > 0 && w.repaired < 100) {
                w.supplies--;
                w.repaired = Math.min(100, w.repaired + 5);
                source = 'Repair supplies consumed';
                text += ' Repaired workshop equipment.';
            }
            if (r.id === 'dev' && w.reserve > 0) {
                const amount = Math.min(3, w.reserve);
                w.reserve -= amount;
                w.shopFood += amount;
                text += ` Delivered ${amount} reserve meals to the market.`;
            }
            if (r.id === 'cleo')
                for (const o of w.residents.filter(o => o.location === 'clinic'))
                    o.health = Math.min(100, o.health + 4);
        }
        else
            text = `${r.name} could not work: the wage fund is empty.`;
    }
    if (a.kind === 'give' || a.kind === 'talk') {
        const other = w.residents.find(o => o.id === a.target && o.location === r.location);
        if (other) {
            if (a.kind === 'give' && r.food > 0) {
                r.food--;
                other.food++;
                text = `${r.name} gave ${other.name} a meal.`;
            }
            if (a.kind === 'talk') {
                const fact = r.beliefs.find(b => b.id === a.fact);
                if (fact) {
                    other.beliefs.push({ id: `b${g.events.length + 1}-${other.id}`, text: fact.text, tick: w.tick, provenance: 'testimony', source: r.id, eventId: fact.eventId });
                    text = `${r.name} told ${other.name}: “${fact.text}”`;
                }
            }
            if (text) {
                r.relationships[other.id] = (r.relationships[other.id] ?? 0) + 1;
                other.relationships[r.id] = (other.relationships[r.id] ?? 0) + 1;
            }
        }
    }
    if (!text)
        text = `${r.name} waited a moment.`;
    const recipients = w.residents.filter(o => o.location === r.location).map(o => o.id);
    emit(g, before, r.id, a.kind, text, recipients, source);
}
export function step(g) {
    let before = structuredClone(g.world);
    const w = g.world;
    w.tick++;
    w.rng = (Math.imul(w.rng, 1664525) + 1013904223) >>> 0;
    for (const r of w.residents) {
        r.hunger = Math.min(100, r.hunger + 1);
        if (r.hunger > 85)
            r.health = Math.max(30, r.health - 1);
    }
    emit(g, before, 'world', 'clock', 'Fifteen minutes pass.', []);
    if (w.tick >= w.shipmentDue) {
        before = structuredClone(w);
        w.shopFood += scenario.shipment;
        w.shipmentDue += 96;
        emit(g, before, 'world', 'shipment', 'A shipment brought 24 meals to the market.', w.residents.filter(r => r.location === 'grocer' || r.id === 'dev').map(r => r.id), 'External food shipment');
    }
    for (const r of w.residents) {
        if (r.pending && r.busyUntil <= w.tick)
            complete(g, r);
        if (!r.pending)
            act(g, choose(view(w, r)));
    }
}
export function intervene(g, kind) {
    const before = structuredClone(g.world), w = g.world;
    let text = '';
    if (kind === 'storm') {
        w.stormUntil = Math.max(w.tick, w.stormUntil) + 16;
        text = 'A storm rolls in. Garden harvests pause for four hours.';
    }
    if (kind === 'delay') {
        w.shipmentDue += 32;
        text = 'The food shipment is delayed by eight hours.';
    }
    if (kind === 'donation') {
        w.treasury += 100;
        text = 'An anonymous donor added 100 coins to the town budget.';
    }
    emit(g, before, 'player', kind, text, kind === 'storm' ? w.residents.map(r => r.id) : w.residents.filter(r => r.location === (kind === 'delay' ? 'grocer' : 'hall')).map(r => r.id), kind === 'donation' ? 'External anonymous donation' : undefined);
}
export function replay(g, count = g.events.length) { return structuredClone(count ? g.events[count - 1].after : g.initial); }
function assertWorld(w) {
    if (!w || !Number.isSafeInteger(w.tick) || w.tick < 0 || !Number.isSafeInteger(w.rng) || w.rng < 0 || w.rng > 4294967295)
        throw Error('Invalid clock or random state.');
    for (const k of ['treasury', 'shopFood', 'reserve', 'supplies', 'repaired', 'stormUntil', 'shipmentDue'])
        if (!Number.isSafeInteger(w[k]) || w[k] < 0)
            throw Error(`Invalid ${k}.`);
    if (!Array.isArray(w.residents) || w.residents.length !== 6 || new Set(w.residents.map(r => r.id)).size !== 6)
        throw Error('Save must contain six unique residents.');
    const original = create().world;
    for (const r of w.residents) {
        const known = original.residents.find(o => o.id === r.id);
        if (!known || ['name', 'role', 'trait', 'goal', 'color'].some(k => r[k] !== known[k]) || !Object.hasOwn(places, r.location) || r.home !== known.home || r.job !== known.job)
            throw Error('Invalid resident or location.');
        for (const k of ['money', 'food', 'hunger', 'energy', 'health', 'busyUntil'])
            if (!Number.isSafeInteger(r[k]) || r[k] < 0)
                throw Error(`Invalid resident ${k}.`);
        if (r.hunger > 100 || r.energy > 100 || r.health > 100 || typeof r.status !== 'string' || !Array.isArray(r.beliefs) || !r.relationships || typeof r.relationships !== 'object')
            throw Error('Invalid resident needs or memories.');
        for (const b of r.beliefs)
            if (!b || typeof b.id !== 'string' || typeof b.text !== 'string' || typeof b.source !== 'string' || typeof b.eventId !== 'string' || !Number.isSafeInteger(b.tick) || !['observation', 'testimony', 'inference'].includes(b.provenance))
                throw Error('Invalid belief provenance.');
        for (const [id, value] of Object.entries(r.relationships))
            if (!original.residents.some(o => o.id === id) || !Number.isSafeInteger(value) || value < 0)
                throw Error('Invalid relationship.');
        if (r.pending) {
            const a = r.pending;
            if (a.actor !== r.id || !['move', 'buy', 'work', 'eat', 'rest', 'talk', 'give', 'wait'].includes(a.kind) || ![1, 2].includes(a.duration) || r.busyUntil < w.tick)
                throw Error('Invalid pending action.');
            if (a.kind === 'move' && !Object.hasOwn(places, a.target))
                throw Error('Invalid movement target.');
        }
    }
}
export function save(g) {
    const pool = [], ids = new Map();
    function snapshot(w) { return { ...w, residents: w.residents.map(r => ({ ...r, beliefs: r.beliefs.map(b => { let id = ids.get(b.id); if (id === undefined) {
                id = pool.length;
                pool.push(b);
                ids.set(b.id, id);
            } return id; }) })) }; }
    const initial = snapshot(g.initial), events = g.events.map(e => ({ ...e, after: snapshot(e.after) })), world = snapshot(g.world);
    return JSON.stringify({ schemaVersion: 1, encoding: 'belief-pool-v1', initial, events, world, beliefPool: pool });
}
export function load(text) {
    if (text.length > 40_000_000)
        throw Error('Save is too large (maximum 40 MB).');
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        throw Error('This file is not valid JSON. Choose a Little World save.');
    }
    if (raw?.encoding === 'belief-pool-v1') {
        if (!Array.isArray(raw.beliefPool) || raw.beliefPool.length > 50000 || !Array.isArray(raw.events) || raw.events.length > 12000)
            throw Error('Invalid memory pool or event limit.');
        const restore = (w) => { if (!w || !Array.isArray(w.residents))
            throw Error('Invalid snapshot.'); for (const r of w.residents) {
            if (!Array.isArray(r.beliefs) || r.beliefs.length > 5000)
                throw Error('Invalid memory list.');
            r.beliefs = r.beliefs.map((i) => { if (!Number.isSafeInteger(i) || i < 0 || i >= raw.beliefPool.length)
                throw Error('Invalid memory reference.'); return raw.beliefPool[i]; });
        } };
        restore(raw.initial);
        restore(raw.world);
        for (const e of raw.events)
            restore(e.after);
        delete raw.encoding;
        delete raw.beliefPool;
    }
    else if (raw?.encoding)
        throw Error('Unsupported save encoding.');
    const g = raw;
    if (!g || g.schemaVersion !== 1 || !Array.isArray(g.events) || g.events.length > 12000)
        throw Error('Unsupported save version or event limit.');
    assertWorld(g.initial);
    assertWorld(g.world);
    for (let i = 0; i < g.events.length; i++) {
        const e = g.events[i];
        if (!e || e.id !== `e${i + 1}` || typeof e.text !== 'string' || typeof e.type !== 'string' || typeof e.actor !== 'string' || !Array.isArray(e.recipients) || !e.effects)
            throw Error('Invalid event log.');
        assertWorld(e.after);
        if (e.tick !== e.after.tick || (i && e.tick < g.events[i - 1].tick))
            throw Error('Invalid event order.');
        const before = i ? g.events[i - 1].after : g.initial, a = total(before), b = total(e.after);
        for (const key of ['money', 'food', 'supplies'])
            if (!Number.isSafeInteger(e.effects[key]) || e.effects[key] !== b[key] - a[key])
                throw Error('Event accounting does not balance.');
        if ((e.effects.money || e.effects.food || e.effects.supplies) && typeof e.effects.source !== 'string')
            throw Error('Resource changes need a recorded source.');
        if (!e.recipients.every(id => g.initial.residents.some(r => r.id === id)))
            throw Error('Invalid observation recipients.');
    }
    if (JSON.stringify(replay(g)) !== JSON.stringify(g.world))
        throw Error('Save state does not match its event log.');
    return g;
}
export function time(tick) { return `Day ${Math.floor(tick / 96) + 1} · ${String(Math.floor(tick % 96 / 4)).padStart(2, '0')}:${String(tick % 4 * 15).padStart(2, '0')}`; }
