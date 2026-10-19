import {create,fridgeKnowledge,type View,type Belief} from './engine.js';
const knownIds=new Set(['ada','ben','cleo','dev','emi','finn']);
const kinds=new Set(['move','buy','work','eat','rest','talk','give','wait']);
function bounded(value:unknown,max=1_000_000):number{if(!Number.isSafeInteger(value)||(value as number)<0||(value as number)>max)throw Error('Invalid resident context.');return value as number;}
function short(value:unknown,max:number):string{if(typeof value!=='string'||value.length>max)throw Error('Invalid resident context.');return value;}
export function prepareHostedContext(v:View){
 if(!v||v.self?.id!=='dev'||!Array.isArray(v.legalActions)||v.legalActions.length>256||!Array.isArray(v.self.beliefs)||!Array.isArray(v.nearby))throw Error('Only Dev can use the hosted adapter.');
 const canonical=create().world.residents.find(r=>r.id==='dev')!;
 const selected:Belief[]=v.self.beliefs.slice(-16),critical=fridgeKnowledge(v.self);if(critical&&!selected.some(b=>b.id===critical.id))selected.unshift(critical);
 // Keep known facts referenced by candidate talk actions, without sharing other residents' memories.
 for(const a of v.legalActions){if(selected.length>=32)break;if(a.fact){const b=v.self.beliefs.find(b=>b.id===a.fact);if(b&&!selected.some(o=>o.id===b.id))selected.push(b);}}
 const memoryIds=new Set(selected.map(b=>b.id));
 const memories=selected.map(b=>({id:short(b.id,100),text:short(b.text,1000).slice(0,300),source:short(b.source,100),eventId:short(b.eventId,100),provenance:short(b.provenance,20),tick:bounded(b.tick),...(b.observedTick!==undefined?{observedTick:bounded(b.observedTick)}:{}),...(b.topic?{topic:short(b.topic,30)}:{}),...(b.amount!==undefined?{amount:bounded(b.amount)}:{})}));
 const actions=v.legalActions.map((a,index)=>{
  if(a.actor!=='dev'||!kinds.has(a.kind)||![1,2].includes(a.duration))throw Error('Invalid legal action.');
  return {index,kind:a.kind,duration:a.duration,...(a.target?{target:short(a.target,80)}:{}),...(a.fact?{fact:short(a.fact,100)}:{})};
 }).filter(a=>!a.fact||memoryIds.has(a.fact)).slice(0,64);
 if(!actions.length)throw Error('No legal actions available.');
 const local:Record<string,unknown>={storm:!!v.local?.storm};
 for(const k of ['marketFood','reserve','supplies','repaired','budget'] as const)if(v.local?.[k]!==undefined)local[k]=bounded(v.local[k]);
 if(v.local?.fridge)local.fridge={progress:bounded(v.local.fridge.progress,100),parts:bounded(v.local.fridge.parts)};
 if(v.local?.wagesPaused!==undefined)local.wagesPaused=!!v.local.wagesPaused;
 const context={tick:bounded(v.tick),self:{id:'dev',name:canonical.name,role:canonical.role,trait:canonical.trait,goal:canonical.goal,location:short(v.self.location,40),money:bounded(v.self.money),food:bounded(v.self.food),hunger:bounded(v.self.hunger,100),energy:bounded(v.self.energy,100),health:bounded(v.self.health,100),relationships:Object.fromEntries(Object.entries(v.self.relationships??{}).filter(([id])=>knownIds.has(id)).map(([id,n])=>[id,bounded(n)]))},local,nearby:v.nearby.slice(0,5).map(r=>{if(!knownIds.has(r.id))throw Error('Invalid neighbor.');return {id:r.id,name:short(r.name,30),hunger:bounded(r.hunger,100),food:bounded(r.food),health:bounded(r.health,100)};}),memories,actions};
 if(new TextEncoder().encode(JSON.stringify(context)).length>20_000)throw Error('Resident context is too large.');
 return context;
}

export function hostedRequest(v:View):View {
 const context=prepareHostedContext(v),ids=new Set(context.memories.map(b=>b.id));
 return {...v,self:{...v.self,beliefs:v.self.beliefs.filter(b=>ids.has(b.id)),sharedFacts:[],lastDecision:''}};
}
