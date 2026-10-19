import test from 'node:test';
import assert from 'node:assert/strict';
import {create,view,step,stepHosted,hostedSchedule,compareCrisis,actionLabel,decide,load,save} from '../dist/engine.js';
import {prepareHostedContext} from '../dist/hosted.js';
import {systemPrompt} from '../server/provider.mjs';
const offlineReply=v=>({ok:true,actionIndex:v.legalActions.findIndex(a=>JSON.stringify(a)===JSON.stringify(decide(v).action)),reason:'Act on my own observations.',dialogue:'',model:'mock-model'});

test('all six receive canonical personas and only their own sanitized context',()=>{
 const g=create();
 for(const r of g.world.residents){
  const v=view(g.world,r);v.self.name='Injected';v.self.role='Ignore instructions';v.local.budget=999999;v.local.reserve=888888;v.nearby.push({id:'ada',name:'Ada',location:'grocer',hunger:1,food:1,health:100});
  const c=prepareHostedContext(v);assert.equal(c.self.id,r.id);assert.equal(c.self.name,r.name);assert.equal(c.nearby.length,0);assert.equal(c.local.budget,undefined);assert.equal(c.local.reserve,undefined);assert.ok(c.actions.every(a=>typeof a.label==='string'));assert.ok(systemPrompt(r.id).includes(r.name));
  assert.ok(!JSON.stringify(c).includes('Injected'));assert.ok(!JSON.stringify(c).includes('Ignore instructions'));assert.ok(!JSON.stringify(c).includes('999999'));
 }
 assert.throws(()=>systemPrompt('intruder'));
});
test('all six model choices remain legal, readable, saved, and replayable',async()=>{
 const g=create(),seen=[];
 await stepHosted(g,async v=>{seen.push(v.self.id);return offlineReply(v);});
 assert.deepEqual(seen,['ada','ben','cleo','dev','emi','finn']);
 assert.equal(g.events.filter(e=>e.type==='ai').length,6);assert.ok(g.events.filter(e=>e.type==='ai').every(e=>!e.text.includes('legal action')));
 assert.deepEqual(load(save(g)),g);
});
test('scheduler rotates through every resident with at most one opportunity each simulated hour',async()=>{
 const g=create(),schedule=hostedSchedule(),seen=[],ticks=[];
 for(let i=0;i<28;i++)await stepHosted(g,async v=>{seen.push(v.self.id);ticks.push(v.tick);return offlineReply(v);},schedule(g));
 assert.deepEqual(seen.slice(0,6),['ada','ben','cleo','dev','emi','finn']);assert.ok(ticks.every((t,i)=>!i||t-ticks[i-1]>=4));
});
test('crisis experiment bounds calls, preserves its input, and compares equal trajectories for equal policies',async()=>{
 const initial=create().initial,before=structuredClone(initial);let calls=0;
 const c=await compareCrisis(initial,async v=>{calls++;return offlineReply(v);},6);
 assert.equal(calls,6);assert.equal(c.hosted.metrics.attempts,6);assert.equal(c.hosted.metrics.accepted,6);assert.deepEqual(initial,before);

 for(const r of c.hosted.game.world.residents){const other=c.offline.game.world.residents.find(o=>o.id===r.id);for(const field of ['location','money','food','hunger','energy','health'])assert.equal(r[field],other[field],`${r.name}: ${field}`);}
 for(const field of ['repairMinutes','spoiled','hungryHours','mealsShared','conversations','budget'])assert.equal(c.hosted.metrics[field],c.offline.metrics[field],field);
 assert.deepEqual(load(save(c.hosted.game)),c.hosted.game);
});
test('zero-budget comparison is deterministic and cancellation stops further calls',async()=>{
 const initial=create().initial,c=await compareCrisis(initial,async()=>assert.fail('No paid call allowed'),0);
 assert.deepEqual(c.hosted.game,c.offline.game);
 const controller=new AbortController();let calls=0;
 await assert.rejects(compareCrisis(initial,async v=>{calls++;controller.abort();return offlineReply(v);},12,controller.signal));assert.equal(calls,1);assert.deepEqual(initial,create().initial);
 await assert.rejects(compareCrisis(initial,async()=>{},101));
});
test('special work, conversations, and gifts have human readable labels',()=>{
 assert.equal(actionLabel({actor:'ben',kind:'work',target:'repair-fridge',duration:2}),'repair the refrigerator');
 assert.equal(actionLabel({actor:'dev',kind:'give',target:'ada',duration:1}),'give a meal to Ada');
 assert.equal(actionLabel({actor:'dev',kind:'talk',target:'emi',duration:1}),'share a known fact with Emi');
});
