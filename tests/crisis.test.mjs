import test from 'node:test';
import assert from 'node:assert/strict';
import {create,step,intervene,view,decide,legal,act,save,load,replay,fridgeKnowledge} from '../dist/engine.js';
const advance=(g,n)=>{for(let i=0;i<n;i++)step(g);return g;};
const find=(g,id)=>g.world.residents.find(r=>r.id===id);
const total=w=>({money:w.treasury+w.residents.reduce((n,r)=>n+r.money,0),food:w.shopFood+w.reserve+w.residents.reduce((n,r)=>n+r.food,0),supplies:w.supplies+(w.fridge?.parts??0)});
test('a storm starts a private cold-store incident; remote residents only know the weather',()=>{
 const g=create();intervene(g,'storm');assert.equal(g.world.fridge.progress,0);
 const finn=find(g,'finn'),before=view(g.world,finn),decision=decide(before);
 assert.equal(fridgeKnowledge(finn),undefined);assert.equal(before.local.fridge,undefined);assert.ok(finn.beliefs.some(b=>b.topic==='storm'));
 g.world.fridge.progress=34;g.world.fridge.parts=2;assert.deepEqual(view(g.world,finn),before);assert.deepEqual(decide(view(g.world,finn)),decision);
});
test('funding follows testimony, repairs consume materials, and the village learns the result',()=>{
 const g=create();intervene(g,'storm');advance(g,96);
 const purchase=g.events.find(e=>e.effects.source==='External refrigerator parts purchase');assert.ok(purchase);
 assert.equal(purchase.effects.money,-18);assert.equal(purchase.effects.supplies,3);
 assert.ok(purchase.after.residents.find(r=>r.id==='finn').beliefs.some(b=>b.topic==='fridge'&&b.provenance==='testimony'));
 const repairs=g.events.filter(e=>e.effects.source==='Refrigerator repair materials consumed');assert.equal(repairs.length,3);
 assert.deepEqual(repairs.map(e=>e.after.fridge.progress),[34,68,100]);for(const e of repairs)assert.equal(e.effects.supplies,-2);
 assert.equal(g.world.fridge.progress,100);assert.equal(g.world.fridge.spoiled,8);assert.ok(g.world.residents.every(r=>fridgeKnowledge(r)?.amount===100));
});
test('every crisis resource change balances against its event and identifies its source',()=>{
 const g=create();intervene(g,'storm');advance(g,96);let previous=g.initial;
 for(const e of g.events){const a=total(previous),b=total(e.after);for(const key of ['money','food','supplies']){assert.equal(b[key]-a[key],e.effects[key]);assert.ok(b[key]>=0);}
 if(e.effects.money||e.effects.food||e.effects.supplies)assert.ok(e.effects.source);previous=e.after;}
 assert.equal(total(g.world).money,total(g.initial).money-18);
});
test('funding can stall and a donation lets the residents recover',()=>{
 const g=create();g.world.treasury=40;g.initial=structuredClone(g.world);intervene(g,'storm');advance(g,35);
 assert.equal(g.world.fridge.progress,0);assert.ok(g.world.fridge.spoiled>0);assert.ok(!g.events.some(e=>e.effects.source==='External refrigerator parts purchase'));
 intervene(g,'donation');advance(g,80);assert.equal(g.world.fridge.progress,100);assert.ok(g.world.fridge.spoiled>8);
});
test('spoilage is bounded by market stock and stops after repairs',()=>{
 const g=create();g.world.shopFood=1;intervene(g,'storm');advance(g,4);assert.equal(g.world.shopFood,0);assert.equal(g.world.fridge.spoiled,1);
 advance(g,50);assert.equal(g.world.fridge.progress,100);const spoiled=g.world.fridge.spoiled;advance(g,20);assert.equal(g.world.fridge.spoiled,spoiled);
});
test('unauthorized repairs and unfunded parts cannot mutate the world',()=>{
 const g=create();intervene(g,'storm');const before=structuredClone(g);
 for(const a of [{actor:'finn',kind:'work',target:'repair-fridge',duration:2},{actor:'ben',kind:'work',target:'repair-fridge',duration:2},{actor:'ada',kind:'work',target:'fund-fridge',duration:2}]){assert.equal(act(g,a),false);assert.deepEqual(g,before);}
});
test('repeated rain does not reset an unresolved repair, and another outage has a new identity',()=>{
 const g=create();intervene(g,'storm');advance(g,15);assert.ok(g.world.fridge.progress>0&&g.world.fridge.progress<100);
 const state=structuredClone(g.world.fridge);intervene(g,'storm');assert.deepEqual(g.world.fridge,state);advance(g,15);assert.equal(g.world.fridge.progress,100);
 const id=g.world.fridge.id;intervene(g,'storm');assert.notEqual(g.world.fridge.id,id);assert.equal(g.world.fridge.progress,0);assert.equal(g.world.fridge.spoiled,0);
});
test('mid-repair saves resume deterministically and snapshots do not mutate retroactively',()=>{
 const g=create();intervene(g,'storm');advance(g,15);const first=JSON.stringify(g.events[1]);const copy=load(save(g));assert.deepEqual(copy,g);
 advance(g,30);advance(copy,30);assert.deepEqual(g,copy);assert.equal(JSON.stringify(g.events[1]),first);assert.deepEqual(replay(copy),g.world);
});
test('older saves have no invented outage and malformed crisis state is rejected',()=>{
 const g=create(),old=load(JSON.stringify(g));assert.equal(old.world.fridge,undefined);step(old);assert.equal(old.world.fridge,undefined);
 intervene(g,'storm');for(const key of ['progress','parts','spoiled']){const bad=JSON.parse(save(g));bad.world.fridge[key]=-1;assert.throws(()=>load(JSON.stringify(bad)),/refrigerator/);}
});
test('old essential crisis news stays shareable even after many unrelated memories',()=>{
 const g=create();find(g,'dev').location='workshop';intervene(g,'storm');const dev=find(g,'dev'),fact=fridgeKnowledge(dev);find(g,'emi').location='workshop';
 for(let i=0;i<25;i++)dev.beliefs.push({id:`extra-${i}`,eventId:`extra-${i}`,text:'An unrelated quiet moment.',tick:g.world.tick,source:'world',provenance:'observation'});
 assert.ok(legal(g.world,dev).some(a=>a.kind==='talk'&&a.target==='emi'&&a.fact===fact.id));
});
test('emergency reserve release requires Emi to hear the news; one shared moment alone is insufficient',()=>{
 const g=create(),dev=find(g,'dev'),emi=find(g,'emi');g.world.tick=40;dev.location=emi.location='garden';emi.relationships.dev=1;intervene(g,'storm');
 assert.equal(legal(g.world,dev).some(a=>a.target==='collect'),false);
 const cold=g.world.fridge;emi.beliefs.push({id:'report',eventId:'report',topic:'fridge',amount:0,parts:0,incident:cold.id,observedTick:40,text:'The refrigerator is broken.',tick:40,source:'dev',provenance:'testimony'});
 assert.ok(legal(g.world,dev).some(a=>a.target==='collect'));
});
test('late testimony cannot replace a newer observation of a completed repair',()=>{
 const r=find(create(),'emi');r.beliefs.push({id:'new',eventId:'new',text:'Repaired.',topic:'fridge',amount:100,incident:'cold-1',observedTick:50,tick:50,source:'ben',provenance:'observation'});
 r.beliefs.push({id:'old',eventId:'old',text:'Broken.',topic:'fridge',amount:0,incident:'cold-1',observedTick:30,tick:60,source:'dev',provenance:'testimony'});
 assert.equal(fridgeKnowledge(r).amount,100);
});
