import { create, step, intervene, places, time, load, save, replay } from './engine.js';
const el = (id) => document.getElementById(id);
let game = create(), selected = 'ada', playing = false, timer, replayAt = null;
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function message(s) { el('message').textContent = s; el('message').style.display = 'block'; setTimeout(() => el('message').style.display = 'none', 4500); }
function pause() { playing = false; clearInterval(timer); el('play').textContent = '▶ Play'; }
function tick() { if (game.events.length > 11000) {
    pause();
    message('This story has reached its event limit. Save it and start a new world.');
    return;
} step(game); render(); }
function current() { return replayAt === null ? game.world : replay(game, replayAt); }
function render() {
    const w = current(), r = w.residents.find(r => r.id === selected);
    el('clock').textContent = time(w.tick);
    el('day-label').textContent = replayAt === null ? 'SEED 42 · LIVE' : 'RECORDED HISTORY';
    document.body.classList.toggle('storm', w.stormUntil > w.tick);
    el('weather').innerHTML = w.stormUntil > w.tick ? '☁ <span>Rain over the village<small>The garden is waiting for clear skies</small></span>' : '☀ <span>A little world, unfolding<small>There’s always another story around the corner</small></span>';
    el('residents').innerHTML = w.residents.map((o, i) => { let p = places[o.location], x = p.x + ((i % 3) - 1) * 3, y = p.y + 9 + Math.floor(i / 3) * 3; if (o.pending?.kind === 'move') {
        const dest = places[o.pending.target];
        x = (p.x + dest.x) / 2 + ((i % 3) - 1) * 2;
        y = (p.y + dest.y) / 2 + 6;
    } return `<button class="resident ${o.id === selected ? 'selected' : ''}" data-resident="${o.id}" style="left:${x}%;top:${y}%;--resident-color:${o.color}" data-name="${o.name}" aria-label="Inspect ${o.name}, ${esc(o.status)}">${o.name[0]}</button>`; }).join('');
    el('cast').innerHTML = w.residents.map(o => `<button class="${o.id === selected ? 'active' : ''}" data-resident="${o.id}" aria-label="Inspect ${o.name}" aria-pressed="${o.id === selected}"><span class="avatar" style="--resident-color:${o.color}">${o.name[0]}</span>${o.name}</button>`).join('');
    el('stats').innerHTML = [['TOWN BUDGET', w.treasury, 'coins'], ['MARKET FOOD', w.shopFood, 'meals'], ['FOOD RESERVE', w.reserve, 'meals'], ['WORKSHOP', w.repaired, '% fixed']].map(([label, value, unit]) => `<div class="stat"><small>${label}</small><strong>${value}<em>${unit}</em></strong></div>`).join('');
    el('inspector-content').innerHTML = `<div class="profile"><div class="profile-top"><div><h3>${r.name}</h3><span class="role">The ${r.role.toLowerCase()}</span></div><span class="avatar large-avatar" style="--resident-color:${r.color}">${r.name[0]}</span></div><span class="trait">${r.trait}</span><p class="location">⌖ ${places[r.location].name}</p><div class="status">${esc(r.status)}</div><div class="needs">${[['Fullness', 100 - r.hunger], ['Energy', r.energy], ['Health', r.health]].map(([n, v]) => `<div class="need"><span>${n}</span><div class="bar"><span style="width:${v}%"></span></div><span>${v}%</span></div>`).join('')}</div><div class="pockets"><span>◈ ${r.money} coins</span><span>♧ ${r.food} meals</span></div><p class="section-label">A LITTLE AMBITION</p><p class="goal">“${r.goal}.”</p><p class="section-label">WHAT ${r.name.toUpperCase()} KNOWS</p><p class="knowledge-note">Personal memories, not the town’s complete story. Testimony records who told them.</p><ul class="memories">${r.beliefs.slice(-15).reverse().map(b => `<li><small>${esc(b.provenance.toUpperCase())} · ${esc(b.source)} · ${time(b.tick)} · ${esc(b.eventId)}</small>${esc(b.text)}</li>`).join('') || '<li>No memories yet. Press play to start the day.</li>'}</ul><p class="section-label">CONNECTIONS</p><div class="relationships">${Object.entries(r.relationships).map(([id, v]) => `${esc(id)} · ${v} shared moment${v === 1 ? '' : 's'}`).join('<br>') || 'Friendships grow through conversations and kindness.'}</div></div>`;
    const rf = el('resident-filter').value, tf = el('type-filter').value, decisions = el('decisions').checked;
    const events = (replayAt === null ? game.events : game.events.slice(0, replayAt)).filter(e => e.type !== 'clock' && (decisions || e.type !== 'decision') && (rf === 'all' || e.actor === rf || e.recipients.includes(rf)) && (tf === 'all' || (tf === 'intervention' ? ['storm', 'delay', 'donation'].includes(e.type) : e.type === tf))).slice(-60).reverse();
    el('feed').innerHTML = events.map(e => `<div class="entry"><time>${time(e.tick)}</time><span class="event-icon">${{ talk: '☏', work: '⚒', buy: '♧', storm: '☁', donation: '♡', shipment: '▣', delay: '◷' }[e.type] ?? '·'}</span><div>${esc(e.text)}<span class="sr-only">Event ${e.id}</span></div></div>`).join('') || '<div class="empty">The journal is waiting for its first little moment. Press Play or Step.</div>';
    el('scrub').max = String(game.events.length);
    el('scrub').value = String(replayAt ?? game.events.length);
    el('scrub').disabled = replayAt === null;
    el('replay-label').textContent = replayAt === null ? 'Live' : `${replayAt} / ${game.events.length}`;
    el('return').hidden = replayAt === null;
    for (const b of document.querySelectorAll('[data-intervention],#play,#step'))
        b.disabled = replayAt !== null;
}
el('buildings').innerHTML = Object.entries(places).map(([id, p]) => `<div class="building ${id.includes('home') ? 'home' : id}" style="left:${p.x}%;top:${p.y}%"><span class="structure"></span><small>${p.name}</small></div>`).join('');
for (const r of game.world.residents)
    el('resident-filter').insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.name}</option>`);
document.addEventListener('click', e => { const target = e.target.closest('[data-resident],[data-intervention]'); if (target?.dataset.resident) {
    selected = target.dataset.resident;
    render();
} if (target?.dataset.intervention && replayAt === null) {
    intervene(game, target.dataset.intervention);
    render();
    message('Your nudge is now part of the story.');
} });
el('play').onclick = () => { if (playing) {
    pause();
    return;
} playing = true; el('play').textContent = 'Ⅱ Pause'; timer = setInterval(tick, Number(el('speed').value)); };
el('step').onclick = () => { pause(); tick(); };
el('speed').onchange = () => { if (playing) {
    pause();
    el('play').click();
} };
el('reset').onclick = () => { pause(); if (game.events.length && !confirm('Start a fresh village? Save first if you want to keep this story.'))
    return; game = create(); replayAt = null; render(); };
el('save').onclick = () => { pause(); const blob = new Blob([save(game)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `little-world-day-${Math.floor(game.world.tick / 96) + 1}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('World saved. Keep the JSON file to revisit this story.'); };
el('load').onclick = () => { pause(); el('file').click(); };
el('file').onchange = async () => { const input = el('file'), file = input.files?.[0]; if (!file)
    return; try {
    if (file.size > 40_000_000)
        throw Error('Choose a save smaller than 40 MB.');
    const next = load(await file.text());
    game = next;
    replayAt = null;
    render();
    message('Your village is back, just as you left it.');
}
catch (e) {
    message(`Could not load: ${e.message}`);
} input.value = ''; };
el('replay').onclick = () => { pause(); replayAt = 0; render(); };
el('scrub').oninput = () => { replayAt = Number(el('scrub').value); render(); };
el('return').onclick = () => { replayAt = null; render(); };
for (const id of ['resident-filter', 'type-filter', 'decisions'])
    el(id).onchange = render;
render();
