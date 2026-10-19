import test from 'node:test';
import assert from 'node:assert/strict';
import {create,step,act,decide,view,legal,intervene,compareMornings,save,load,replay} from '../dist/engine.js';
const fixture=()=>{const g=create();g.world.tick=40;return g;};
const resident=(g,id)=>g.world.residents.find(r=>r.id===id);
const proposal=(g,id)=>decide(view(g.world,resident(g,id)));

test('Cleo sacrifices her last meal while Emi protects hers',()=>{
 const g=fixture(),cleo=resident(g,'cleo'),emi=resident(g,'emi'),ben=resident(g,'ben');
 for(const r of [cleo,emi,ben])r.location='garden';cleo.food=emi.food=1;cleo.hunger=emi.hunger=50;ben.food=0;ben.hunger=70;
 assert.equal(proposal(g,'cleo').action.kind,'give');assert.equal(proposal(g,'cleo').action.target,'ben');
 assert.equal(proposal(g,'emi').action.kind,'eat');
 const before=cleo.food+ben.food;act(g,proposal(g,'cleo').action);step(g);assert.equal(cleo.food,0);assert.equal(ben.food,1);assert.equal(cleo.food+ben.food,before);
});
test('Ada keeps a buffer but leaves the last market meals for others',()=>{
 const g=fixture(),ada=resident(g,'ada');ada.location='grocer';ada.food=2;
 assert.equal(proposal(g,'ada').action.kind,'buy');g.world.shopFood=1;
 assert.notEqual(proposal(g,'ada').action.kind,'buy');assert.equal(ada.food,2);
});
test('Emi shares spare food only after trust is established',()=>{
 const g=fixture(),emi=resident(g,'emi'),ben=resident(g,'ben');emi.location=ben.location='garden';emi.food=2;ben.food=0;ben.hunger=60;
 assert.notEqual(proposal(g,'emi').action.kind,'give');emi.relationships.ben=2;
 assert.equal(proposal(g,'emi').action.kind,'give');assert.equal(proposal(g,'emi').action.target,'ben');
});
test('reserve delivery requires a trusted courier and conserves meals',()=>{
 const g=fixture(),dev=resident(g,'dev'),emi=resident(g,'emi');dev.location=emi.location='garden';dev.food=2;
 assert.equal(legal(g.world,dev).some(a=>a.target==='collect'),false);
 assert.equal(act(g,{actor:'dev',kind:'work',target:'collect',duration:2}),false);
 emi.relationships.dev=2;const before=g.world.reserve+dev.food;
 assert.equal(proposal(g,'dev').action.target,'collect');act(g,proposal(g,'dev').action);step(g);step(g);
 assert.equal(g.world.reserve+dev.food,before);assert.equal(dev.food,5);
 // Check the complete default route as well: trust grows through actual conversations.
 const route=create();for(let i=0;i<96;i++)step(route);
 assert.ok(route.events.some(e=>e.type==='work'&&e.text.includes('entrusted Dev')));
 assert.ok(route.events.some(e=>e.type==='work'&&e.text.includes('Dev delivered')));
});
test('Ben reports a witnessed shortage and Finn funds a balanced outside purchase',()=>{
 const g=fixture(),ben=resident(g,'ben'),finn=resident(g,'finn');g.world.supplies=0;ben.location='square';finn.location='hall';
 act(g,legal(g.world,ben).find(a=>a.kind==='move'&&a.target==='workshop'));step(g);step(g);
 assert.ok(ben.beliefs.some(b=>b.topic==='supplies'&&b.amount===0));assert.equal(ben.pending?.target,'hall');
 for(let i=0;i<10;i++)step(g);
 const report=g.events.find(e=>e.actor==='ben'&&e.type==='talk');assert.ok(report);
 const purchase=g.events.find(e=>e.text.includes('Finn ordered'));assert.ok(purchase);
 assert.equal(purchase.effects.money,-12);assert.equal(purchase.effects.supplies,6);assert.equal(purchase.effects.source,'External supply purchase');
 assert.ok(finn.beliefs.some(b=>b.provenance==='testimony'&&b.source==='ben'&&b.topic==='supplies'));
});
test('Finn pauses wages when funds are low and resumes after a known recovery',()=>{
 const g=fixture(),finn=resident(g,'finn');finn.location='hall';g.world.treasury=25;
 assert.equal(proposal(g,'finn').action.target,'budget-review');act(g,proposal(g,'finn').action);step(g);assert.equal(g.world.wagesPaused,true);
 intervene(g,'donation');finn.pending=null;assert.equal(proposal(g,'finn').action.target,'budget-review');act(g,proposal(g,'finn').action);step(g);assert.equal(g.world.wagesPaused,false);
});
test('private remote changes cannot change an isolated resident policy input',()=>{
 const g=fixture(),ada=resident(g,'ada');const before=view(g.world,ada),decision=decide(before);
 g.world.treasury=5;g.world.supplies=0;g.world.shopFood=0;intervene(g,'delay');
 const after=view(g.world,ada);assert.deepEqual(after,before);assert.deepEqual(decide(after),decision);
 assert.equal('budget' in after.local,false);assert.equal('beliefs' in (after.nearby[0]??{}),false);
});
test('Dev shares the source once per recipient and retains testimony provenance',()=>{
 const g=fixture(),dev=resident(g,'dev'),ada=resident(g,'ada');dev.location=ada.location='grocer';intervene(g,'delay');
 const decision=proposal(g,'dev');assert.equal(decision.action.kind,'talk');const original=dev.beliefs.find(b=>b.id===decision.action.fact);
 act(g,decision.action,decision.reason);step(g);
 assert.ok(ada.beliefs.some(b=>b.provenance==='testimony'&&b.source==='dev'&&b.eventId===original.eventId&&b.topic==='shipment'));
 dev.pending=null;assert.equal(legal(g.world,dev).some(a=>a.kind==='talk'&&a.target==='ada'&&dev.beliefs.find(b=>b.id===a.fact)?.eventId===original.eventId),false);
 assert.ok(dev.lastDecision);assert.ok(dev.sharedFacts.includes(`ada:${original.eventId}`));
});
test('personality state survives compact save, replay, and continuation',()=>{
 const g=create();for(let i=0;i<60;i++)step(g);const copy=load(save(g));assert.deepEqual(copy,g);assert.deepEqual(replay(copy),g.world);
 for(let i=0;i<12;i++){step(g);step(copy);}assert.deepEqual(copy,g);
});
test('legacy version-one saves without personality fields remain loadable',()=>{
 const g=create();for(const w of [g.initial,g.world]){delete w.wagesPaused;for(const r of w.residents){delete r.sharedFacts;delete r.lastDecision;}}
 const legacy=load(JSON.stringify(g));step(legacy);assert.ok(legacy.events.length>0);assert.ok(legacy.world.residents.every(r=>r.lastDecision));
});
test('comparison isolates both trials and exposes the cost of a delayed shipment',()=>{
 const initial=create().initial,before=structuredClone(initial),results=compareMornings(initial,true);
 assert.deepEqual(initial,before);assert.ok(results.delayed.hungryHours>results.normal.hungryHours);
 assert.ok(results.normal.mealsEaten>0);assert.ok(results.delayed.conversations>0);
 assert.deepEqual(compareMornings(initial,true),results);
});
