export type Place = 'grocer'|'clinic'|'workshop'|'garden'|'hall'|'square'|'ada-home'|'ben-home'|'cleo-home'|'dev-home'|'emi-home'|'finn-home';
export type Kind = 'move'|'buy'|'work'|'eat'|'rest'|'talk'|'give'|'wait';
export type Topic = 'food'|'supplies'|'budget'|'shipment'|'storm'|'donation'|'harvest'|'fridge';
export interface Belief {id:string; text:string; tick:number; provenance:'observation'|'testimony'|'inference'; source:string; eventId:string; topic?:Topic; amount?:number; incident?:string; parts?:number; observedTick?:number}
export interface Resident {id:string; name:string; role:string; trait:string; goal:string; color:string; home:Place; job:Place; location:Place; money:number; food:number; hunger:number; energy:number; health:number; busyUntil:number; pending:Action|null; status:string; beliefs:Belief[]; relationships:Record<string,number>; sharedFacts?:string[]; lastDecision?:string; lastTalkTick?:number}
export interface Action {actor:string; kind:Kind; target?:string; fact?:string; duration:number}
export interface Refrigerator {id:string; startedTick:number; progress:number; parts:number; spoiled:number; nextSpoilTick:number; resolvedTick?:number}
export interface World {tick:number; rng:number; treasury:number; shopFood:number; reserve:number; supplies:number; repaired:number; stormUntil:number; shipmentDue:number; wagesPaused?:boolean; fridge?:Refrigerator; residents:Resident[]}
export interface Event {id:string; tick:number; actor:string; type:string; text:string; recipients:string[]; effects:{money:number; food:number; supplies:number; source?:string}; after:World}
export interface Game {schemaVersion:1; initial:World; world:World; events:Event[]}
export const scenario={price:3,wage:2,shipment:24,harvest:3,startingTreasury:240,startingFood:18,startingSupplies:20,opening:32,closing:76,bufferMeals:3,trustToRelease:2,wagePauseAt:40,wageResumeAt:60,supplyCost:12,supplyBatch:6,fridgeCost:18,fridgeParts:3,fridgeRepairStep:34,spoilInterval:4,spoilBatch:2};
export const places:Record<Place,{name:string;x:number;y:number;icon:string}>={grocer:{name:'Ada’s Market',x:24,y:28,icon:'🥕'},clinic:{name:'Cleo’s Clinic',x:76,y:27,icon:'✚'},workshop:{name:'The Workshop',x:78,y:67,icon:'⚒'},garden:{name:'Community Garden',x:23,y:68,icon:'🌱'},hall:{name:'Town Hall',x:50,y:18,icon:'⚑'},square:{name:'Village Square',x:50,y:49,icon:'⛲'},'ada-home':{name:'Ada’s home',x:12,y:12,icon:'⌂'},'ben-home':{name:'Ben’s home',x:88,y:84,icon:'⌂'},'cleo-home':{name:'Cleo’s home',x:88,y:12,icon:'⌂'},'dev-home':{name:'Dev’s home',x:55,y:84,icon:'⌂'},'emi-home':{name:'Emi’s home',x:12,y:84,icon:'⌂'},'finn-home':{name:'Finn’s home',x:38,y:8,icon:'⌂'}};
export function create(seed=42):Game {
 const cast=[['ada','Ada','Grocer','Cautious','Keep food available','grocer','#d48348'],['ben','Ben','Mechanic','Practical','Repair workshop equipment','workshop','#607da6'],['cleo','Cleo','Clinician','Generous','Keep residents healthy','clinic','#b8798a'],['dev','Dev','Courier','Sociable','Deliver supplies reliably','square','#a48c43'],['emi','Emi','Gardener','Independent','Grow a food reserve','garden','#729361'],['finn','Finn','Clerk','Orderly','Balance the town budget','hall','#8c78aa']];
 const world:World={tick:28,rng:seed>>>0,treasury:scenario.startingTreasury,shopFood:scenario.startingFood,reserve:6,supplies:scenario.startingSupplies,repaired:0,stormUntil:0,shipmentDue:40,wagesPaused:false,residents:cast.map(([id,name,role,trait,goal,job,color])=>({id,name,role,trait,goal,color,home:`${id}-home` as Place,job:job as Place,location:`${id}-home` as Place,money:24,food:2,hunger:20,energy:90,health:100,busyUntil:0,pending:null,status:'Starting the morning',beliefs:[],relationships:{},sharedFacts:[],lastDecision:'A new morning. Time to see what the day brings.'}))};
 return {schemaVersion:1,initial:structuredClone(world),world,events:[]};
}
const total=(w:World)=>({money:w.treasury+w.residents.reduce((n,r)=>n+r.money,0),food:w.shopFood+w.reserve+w.residents.reduce((n,r)=>n+r.food,0),supplies:w.supplies+(w.fridge?.parts??0)});
function emit(g:Game,before:World,actor:string,type:string,text:string,recipients:string[],source?:string, fact?:Pick<Belief,'topic'|'amount'|'incident'|'parts'|'observedTick'>){
 const a=total(before), b=total(g.world),id=`e${g.events.length+1}`;
 for(const r of g.world.residents.filter(r=>recipients.includes(r.id))) r.beliefs.push({id:`${id}-${r.id}`,text,tick:g.world.tick,provenance:'observation',source:actor,eventId:id,observedTick:g.world.tick,...fact});
 g.events.push({id,tick:g.world.tick,actor,type,text,recipients,effects:{money:b.money-a.money,food:b.food-a.food,supplies:b.supplies-a.supplies,...(source?{source}:{})},after:{...g.world,...(g.world.fridge?{fridge:{...g.world.fridge}}:{}),residents:g.world.residents.map(r=>({...r,pending:r.pending?{...r.pending}:null,beliefs:r.beliefs.slice(),relationships:{...r.relationships}}))}});
}
export function fridgeKnowledge(r:Resident):Belief|undefined {
 return r.beliefs.filter(b=>b.topic==='fridge').reduce<Belief|undefined>((latest,b)=>!latest||(b.observedTick??b.tick)>=(latest.observedTick??latest.tick)?b:latest,undefined);
}
const emergency=(r:Resident)=>{const b=fridgeKnowledge(r);return !!b&&(b.amount??100)<100;};
function fridgeFact(w:World):Pick<Belief,'topic'|'amount'|'incident'|'parts'> {
 return {topic:'fridge',amount:w.fridge!.progress,incident:w.fridge!.id,parts:w.fridge!.parts};
}
function noticeFridge(g:Game,r:Resident){
 const f=g.world.fridge;if(!f||!['grocer','workshop'].includes(r.location))return;
 const previous=fridgeKnowledge(r);
 if(previous?.incident===f.id&&previous.amount===f.progress&&previous.parts===f.parts)return;
 const before=structuredClone(g.world);
 emit(g,before,'world','crisis',`${r.name} checked the cold-store ${r.location==='grocer'?'alarm display':'refrigerator'}: ${f.progress===100?'repaired':'broken; market food is at risk'}. Repair ${f.progress}%; ${f.parts} spare parts.`,[r.id],undefined,fridgeFact(g.world));
}
export function legal(w:World,r:Resident):Action[]{
 if(r.pending)return [];
 const actions:Action[]=[{actor:r.id,kind:'wait',duration:1},{actor:r.id,kind:'rest',duration:2}];
 for(const p of Object.keys(places))if(p!==r.location)actions.push({actor:r.id,kind:'move',target:p,duration:2});
 if(r.food>0) actions.push({actor:r.id,kind:'eat',duration:1});
 if(r.location==='grocer'&&w.tick%96>=scenario.opening&&w.tick%96<scenario.closing&&w.shopFood>0&&r.money>=scenario.price)actions.push({actor:r.id,kind:'buy',duration:1});
 const open=w.tick%96>=scenario.opening&&w.tick%96<scenario.closing;
 if(open&&r.location===r.job)actions.push({actor:r.id,kind:'work',duration:2});
 if(open&&r.id==='finn'&&r.location==='hall'){
  if((!w.wagesPaused&&w.treasury<scenario.wagePauseAt)||(w.wagesPaused&&w.treasury>=scenario.wageResumeAt))actions.push({actor:r.id,kind:'work',target:'budget-review',duration:1});
  if(w.supplies===0&&(w.repaired<100||(w.fridge?.progress??100)<100)&&w.treasury>=scenario.wagePauseAt+scenario.supplyCost&&r.beliefs.some(b=>b.topic==='supplies'&&b.amount===0&&w.tick-b.tick<=32))actions.push({actor:r.id,kind:'work',target:'fund-supplies',duration:2});
 }
 if(open&&r.id==='finn'&&r.location==='hall'&&w.fridge&&w.fridge.progress<100&&w.fridge.parts<Math.ceil((100-w.fridge.progress)/scenario.fridgeRepairStep)&&w.treasury>=scenario.wagePauseAt+scenario.fridgeCost&&emergency(r))actions.push({actor:r.id,kind:'work',target:'fund-fridge',duration:2});
 if(r.id==='ben'&&r.location==='workshop'&&w.fridge&&w.fridge.progress<100&&w.fridge.parts>0&&w.supplies>0)actions.push({actor:r.id,kind:'work',target:'repair-fridge',duration:2});
 if(r.id==='cleo'&&r.location==='grocer'&&emergency(r)&&w.residents.some(o=>o.location===r.location&&o.health<100))actions.push({actor:r.id,kind:'work',target:'triage',duration:2});
 if(open&&r.id==='dev'){
  const gardener=w.residents.find(o=>o.id==='emi'&&o.location===r.location);
  if(r.location==='garden'&&gardener&&(gardener.relationships[r.id]??0)>=(emergency(gardener)?1:scenario.trustToRelease)&&w.reserve>0&&r.food<=2)actions.push({actor:r.id,kind:'work',target:'collect',duration:2});
  if(r.location==='grocer'&&r.food>2)actions.push({actor:r.id,kind:'work',target:'deliver',duration:2});
 }
 for(const other of w.residents.filter(o=>o.id!==r.id&&o.location===r.location)){
  if(r.food>0)actions.push({actor:r.id,kind:'give',target:other.id,duration:1});
  const shareable=r.beliefs.filter(b=>(b.topic!==undefined||!b.text.includes(' told '))&&b.text.length<300&&!(r.sharedFacts??[]).includes(`${other.id}:${b.eventId}`));
  const facts=shareable.slice(-12),cold=fridgeKnowledge(r);if(cold&&shareable.includes(cold)&&!facts.includes(cold))facts.push(cold);
  for(const fact of facts)actions.push({actor:r.id,kind:'talk',target:other.id,fact:fact.id,duration:1});
 }
 return actions;
}
export function act(g:Game,a:Action,reason?:string):boolean{
 if(!a||!g.world.residents.some(r=>r.id===a.actor))return false;
 const r=g.world.residents.find(r=>r.id===a.actor)!;
 if(!legal(g.world,r).some(x=>JSON.stringify(x)===JSON.stringify(a)))return false;
 const before=structuredClone(g.world);r.pending=structuredClone(a);r.busyUntil=g.world.tick+a.duration;r.status=a.kind==='move'?`Walking to ${places[a.target as Place].name}`:`${a.kind[0].toUpperCase()+a.kind.slice(1)}ing`;
 if(reason)r.lastDecision=reason;
 emit(g,before,r.id,'decision',`${r.name} chose to ${a.kind}${a.target?` → ${places[a.target as Place]?.name??a.target}`:''}.${reason?` ${reason}`:''}`,[],undefined);return true;
}
export interface View {
 self:Resident;
 nearby:Pick<Resident,'id'|'name'|'location'|'hunger'|'food'|'health'>[];
 legalActions:Action[]; tick:number;
 local:{marketFood?:number;reserve?:number;supplies?:number;repaired?:number;budget?:number;wagesPaused?:boolean;storm:boolean;fridge?:{progress:number;parts:number}};
}
export function view(w:World,r:Resident):View{
 const local:View['local']={storm:w.stormUntil>w.tick};
 if(r.location==='grocer')local.marketFood=w.shopFood;
 if(r.location==='garden')local.reserve=w.reserve;
 if(r.location==='workshop'){local.supplies=w.supplies;local.repaired=w.repaired;}
 if(w.fridge&&['grocer','workshop'].includes(r.location))local.fridge={progress:w.fridge.progress,parts:w.fridge.parts};
 if(r.location==='hall'){local.budget=w.treasury;local.wagesPaused=w.wagesPaused??false;}
 return {self:structuredClone(r),nearby:w.residents.filter(o=>o.id!==r.id&&o.location===r.location).map(o=>({id:o.id,name:o.name,location:o.location,hunger:o.hunger,food:o.food,health:o.health})),legalActions:legal(w,r),tick:w.tick,local};
}
export interface Decision {action:Action;reason:string}
export function decide(v:View):Decision{
 const r=v.self,pick=(kind:Kind,target?:string)=>v.legalActions.find(a=>a.kind===kind&&a.target===target);
 const d=(action:Action,reason:string):Decision=>({action,reason});
 const move=(target:Place,reason:string)=>d(pick('move',target)!,reason);
 const talk=(target?:string,topic?:Topic)=>v.tick-(r.lastTalkTick??-100)<4?undefined:v.legalActions.find(a=>a.kind==='talk'&&(!target||a.target===target)&&(!topic||r.beliefs.find(b=>b.id===a.fact)?.topic===topic));
 const hungry=v.nearby.find(o=>o.food===0&&o.hunger>40);
 // Generosity is a real tradeoff: Cleo may give away her last meal before feeding herself.
 if(r.id==='cleo'&&hungry&&r.food>0&&r.hunger<85&&pick('give',hungry.id))return d(pick('give',hungry.id)!,`${hungry.name} has no food. I can spare my meal.`);
 if(r.hunger>=38&&pick('eat'))return d(pick('eat')!,'I need a meal before I can help anyone else.');
 if(r.energy<28)return d(pick('rest')!,'I need to recover my energy.');
 const hour=v.tick%96;
 if(hour<28||hour>=80)return r.location===r.home?d(pick('rest')!,'The day is over. Time to rest.'):move(r.home,'Time to head home.');
 const crisis=fridgeKnowledge(r),active=emergency(r);
 const crisisTalk=(target?:string)=>{if(!crisis||v.tick-(r.lastTalkTick??-100)<4)return undefined;return v.legalActions.find(a=>a.kind==='talk'&&(!target||a.target===target)&&r.beliefs.find(b=>b.id===a.fact)?.eventId===crisis.eventId);};
 if(active&&r.id==='ben'){
  if(pick('work','repair-fridge'))return d(pick('work','repair-fridge')!,'Repair the refrigerator before more market food spoils.');
  if(r.location==='workshop'&&(v.local.supplies===0||(v.local.fridge?.parts??0)===0))return move('hall','The cold store needs parts and supplies. Take the repair request to Finn.');
  if(r.location==='hall'){
   if((crisis?.parts??0)>0){const supplies=talk('finn','supplies');if(supplies)return d(supplies,'The parts are funded, but Finn also needs my supply report.');return move('workshop','The parts were funded. Return to the refrigerator.');}
   const request=crisisTalk('finn');if(request)return d(request,'Tell Finn about the broken refrigerator and food at risk.');
   return d(pick('wait')!,'Wait for Finn to fund refrigerator parts.');
  }
  return move('workshop','I heard about the refrigerator. Inspect it and start repairs.');
 }
 if(active&&r.id==='finn'&&pick('work','fund-fridge'))return d(pick('work','fund-fridge')!,'The food is at risk. Fund refrigerator parts while protecting the town reserve.');
 if(r.id==='dev'&&r.food>2){if(pick('work','deliver'))return d(pick('work','deliver')!,'Deliver these reserve meals before carrying more news.');if(r.location!=='grocer')return move('grocer','Take the emergency meals to the market.');}
 if(active&&r.id==='dev'&&pick('work','collect')&&(r.sharedFacts??[]).includes(`emi:fridge:${crisis?.incident}:broken`))return d(pick('work','collect')!,'Emi heard the news and agreed to release emergency reserve meals.');
 if(crisis&&r.id==='dev'){
  const phase=active?'broken':'resolved';
  for(const [id,place] of [['ben','workshop'],['finn','hall'],['emi','garden'],['cleo','clinic']] as const){
   if((r.sharedFacts??[]).includes(`${id}:fridge:${crisis.incident}:${phase}`))continue;
   const news=crisisTalk(id);if(news)return d(news,active?`Tell ${id} what I learned about the cold-store failure.`:`Tell ${id} that the refrigerator is repaired.`);
   if(v.nearby.some(o=>o.id===id))return d(pick('wait')!,'Give my neighbor a moment before passing on the news.');
   if(r.location===place){if(id==='ben')return move('hall','Ben may have gone to Finn. Look for him at town hall.');if(id==='cleo')return move('grocer','Cleo may be helping at the market. Check there.');return d(pick('wait')!,`Wait for ${id} so the news reaches them.`);}
   // Ben often visits town hall for funding; check there rather than chasing his unseen location.
   if(id==='cleo'&&r.location==='grocer')return move('clinic','Check the clinic for Cleo.');
   if(id==='ben'&&r.location==='hall')return move('workshop','Check the workshop for Ben.');
   return move(place,active?'Carry the cold-store news to the next neighbor.':'Carry the repair news to the next neighbor.');
  }
 }
 if(active&&r.id==='ada'){
  const warning=crisisTalk('dev')??crisisTalk();if(warning)return d(warning,`Warn a neighbor: ${v.local.marketFood??'the'} market meals may spoil.`);
  if(hungry&&r.food>1&&pick('give',hungry.id))return d(pick('give',hungry.id)!,'Use my food buffer to help a hungry neighbor during the outage.');
 }
 if(active&&r.id==='cleo'){
  if(pick('work','triage'))return d(pick('work','triage')!,'Check on neighbors affected by the food shortage.');
  if(r.location!=='grocer')return move('grocer','People may be hungry at the market. Go where I can help.');
 }
 if(r.id==='finn'&&r.location==='hall'){
  if(pick('work','budget-review'))return d(pick('work','budget-review')!,v.local.wagesPaused?'The budget has recovered. Resume wages.':'The budget is thin. Pause wages so the town can keep a reserve.');
  if(pick('work','fund-supplies'))return d(pick('work','fund-supplies')!,'I heard the workshop needs supplies, and we can afford a small order.');
 }
 if(r.id==='dev'&&pick('work','deliver'))return d(pick('work','deliver')!,'These reserve meals belong on the market shelves.');
 if(r.id==='dev'&&r.food>2&&r.location!=='grocer')return move('grocer','I have reserve meals to deliver.');
 if(r.id==='dev'&&pick('work','collect'))return d(pick('work','collect')!,'Emi trusts me to carry a small batch to the market.');
 // A cautious grocer stocks a larger personal buffer without exhausting a nearly empty shop.
 const buffer=r.id==='ada'?scenario.bufferMeals:2;
 if(r.food<buffer&&(r.id!=='ada'||v.local.marketFood===undefined||v.local.marketFood>2||r.food===0)){
  if(pick('buy'))return d(pick('buy')!,r.id==='ada'?'Keep a small food buffer while there is enough to go around.':'I need food for the day.');
  if(r.location!=='grocer'&&r.money>=scenario.price)return move('grocer',r.id==='ada'?'Check the shelves and build a cautious food buffer.':'I should visit the market for food.');
 }
 if(hungry&&pick('give',hungry.id)){
  const keep=r.id==='ada'?scenario.bufferMeals:1;
  const trusted=r.id!=='emi'||(r.relationships[hungry.id]??0)>=scenario.trustToRelease;
  if(trusted&&r.food>keep)return d(pick('give',hungry.id)!,r.id==='emi'?'We have built some trust. I can share a spare meal.':'I have enough to share a spare meal.');
 }
 if(r.id==='ben'){
  if(r.location==='workshop'&&v.local.supplies===0&&(v.local.repaired??100)<100)return move('hall','The workshop is out of supplies. I need to ask Finn for help.');
  if(r.location==='hall'){
   const request=talk('finn','supplies');
   if(request)return d(request,'Tell Finn what I observed at the workshop.');
   if(!v.nearby.some(o=>o.id==='finn'))return d(pick('wait')!,'Wait for Finn to discuss the missing supplies.');
   if(!r.beliefs.some(b=>b.topic==='supplies'&&(b.amount??0)>0&&v.tick-b.tick<16))return d(pick('wait')!,'Give Finn time to consider the supply request.');
  }
  if(r.location==='workshop'&&(v.local.repaired??0)>=100)return d(pick('rest')!,'The workshop is repaired. Save supplies for another day.');
 }
 if(r.id==='dev'){
  const news=talk(undefined,'shipment')??talk(undefined,'supplies')??talk(undefined,'food')??talk();
  if(news)return d(news,'Pass along something I personally learned, naming its source.');
  if(r.location==='garden')return move('grocer','I will check the market and return when Emi is ready.');
  return move('garden','Visit Emi, build trust, and check for a reserve delivery.');
 }
 if(r.id==='ada'&&(v.local.marketFood??100)<6){const warning=talk(undefined,'food')??talk(undefined,'shipment');if(warning)return d(warning,'The shelves are low. Let a neighbor know what I have seen.');}
 if(r.id==='emi'&&v.nearby.some(o=>o.id==='dev')&&(r.relationships.dev??0)<scenario.trustToRelease){const conversation=talk('dev');if(conversation)return d(conversation,'Get to know Dev before letting the reserve leave the garden.');}
 if(r.id==='emi'&&v.local.storm)return d(pick('rest')!,'Rain will spoil the harvest. Protect the garden and wait.');
 if(r.id==='finn'&&r.location==='hall'&&(v.local.budget??0)<scenario.wageResumeAt)return d(pick('wait')!,'Keep an eye on the town budget instead of drawing another wage.');
 if((v.tick+r.id.length)%7===0&&talk())return d(talk()!,'Make time to connect with a neighbor.');
 if(r.location!==r.job)return move(r.job,'Head to work and look after my part of the village.');
 return d(pick('work')??pick('rest')!,'Make steady progress on my goal.');
}
function complete(g:Game,r:Resident){
 const w=g.world,a=r.pending!,before=structuredClone(w);r.pending=null;r.status='Watching the village';let text='',source:string|undefined,fact:Pick<Belief,'topic'|'amount'|'incident'|'parts'|'observedTick'>|undefined;
 if(a.kind==='move'){r.location=a.target as Place;text=`${r.name} arrived at ${places[r.location].name}.`;
 if(r.location==='workshop'){text+=` Workshop supplies: ${w.supplies}.`;fact={topic:'supplies',amount:w.supplies};}
 if(r.location==='grocer'){text+=` Market shelves hold ${w.shopFood} meals.`;fact={topic:'food',amount:w.shopFood};}
 if(r.location==='hall'){text+=` Town budget: ${w.treasury} coins.`;fact={topic:'budget',amount:w.treasury};}
 if(r.location==='garden'){text+=` The garden reserve holds ${w.reserve} meals.`;fact={topic:'harvest',amount:w.reserve};}}
 if(a.kind==='buy'){if(w.shopFood>0&&r.money>=scenario.price){w.shopFood--;r.food++;r.money-=scenario.price;w.treasury+=scenario.price;text=`${r.name} bought a meal for ${scenario.price} coins.`;}else text=`${r.name} found no food available and will try again.`;}
 if(a.kind==='eat'&&r.food>0){r.food--;r.hunger=Math.max(0,r.hunger-45);text=`${r.name} ate a meal.`;source='Meal consumed';}
 if(a.kind==='rest'){r.energy=Math.min(100,r.energy+28);r.health=Math.min(100,r.health+2);text=`${r.name} took a little time to rest.`;}
 if(a.kind==='work'){
  if(a.target==='repair-fridge'){
   const f=w.fridge;
   if(r.id==='ben'&&r.location==='workshop'&&f&&f.progress<100&&f.parts>0&&w.supplies>0){
    f.parts--;w.supplies--;f.progress=Math.min(100,f.progress+scenario.fridgeRepairStep);source='Refrigerator repair materials consumed';
    if(f.progress===100)f.resolvedTick=w.tick;
    text=f.progress===100?'Ben repaired the cold-store refrigerator. Market food is safe from further outage spoilage.':`Ben repaired the cold-store refrigerator to ${f.progress}%.`;
    fact=fridgeFact(w);
   }
  }else if(a.target==='fund-fridge'){
   const f=w.fridge;
   if(r.id==='finn'&&r.location==='hall'&&f&&f.progress<100&&w.treasury>=scenario.wagePauseAt+scenario.fridgeCost&&f.parts<Math.ceil((100-f.progress)/scenario.fridgeRepairStep)){
    w.treasury-=scenario.fridgeCost;f.parts+=scenario.fridgeParts;source='External refrigerator parts purchase';
    text=`Finn funded ${scenario.fridgeParts} refrigerator parts for ${scenario.fridgeCost} coins after hearing the repair request.`;fact=fridgeFact(w);
   }
  }else if(a.target==='triage'){
   if(r.id==='cleo'&&r.location==='grocer'){for(const other of w.residents.filter(o=>o.location==='grocer'))other.health=Math.min(100,other.health+8);text='Cleo checked on neighbors at the market and helped them recover.';}
  }else if(a.target==='budget-review'){
   w.wagesPaused=w.treasury<scenario.wageResumeAt;
   text=`Finn reviewed the budget: wages ${w.wagesPaused?'paused to protect the reserve':'resumed after the budget recovered'}.`;
   fact={topic:'budget',amount:w.treasury};
  }else if(a.target==='fund-supplies'){
   if(w.supplies===0&&(w.repaired<100||(w.fridge?.progress??100)<100)&&w.treasury>=scenario.wagePauseAt+scenario.supplyCost){
    w.treasury-=scenario.supplyCost;w.supplies+=scenario.supplyBatch;
    text=`Finn ordered ${scenario.supplyBatch} workshop supplies for ${scenario.supplyCost} coins from an outside supplier.`;
    source='External supply purchase';fact={topic:'supplies',amount:w.supplies};
   }
  }else if(a.target==='collect'){
   const gardener=w.residents.find(o=>o.id==='emi'&&o.location===r.location);
   if(r.location==='garden'&&gardener&&(gardener.relationships[r.id]??0)>=(emergency(gardener)?1:scenario.trustToRelease)&&r.food<=2){
    const amount=Math.min(3,w.reserve);w.reserve-=amount;r.food+=amount;
    text=`Emi entrusted Dev with ${amount} reserve meals for the market.`;fact={topic:'harvest',amount:w.reserve};
   }
  }else if(a.target==='deliver'){
   if(r.location==='grocer'&&r.food>2){const amount=r.food-2;r.food-=amount;w.shopFood+=amount;
    text=`Dev delivered ${amount} reserve meals to the market.`;fact={topic:'food',amount:w.shopFood};
    if(!w.wagesPaused&&w.treasury>=scenario.wage){w.treasury-=scenario.wage;r.money+=scenario.wage;}
   }
  }else{
   const paid=!w.wagesPaused&&w.treasury>=scenario.wage;
   if(paid){w.treasury-=scenario.wage;r.money+=scenario.wage;}
   r.energy=Math.max(0,r.energy-6);text=`${r.name} worked${paid?` and earned ${scenario.wage} coins`:' without a wage while the town saves funds'}.`;
   if(r.id==='ada'){text+=` Market shelves hold ${w.shopFood} meals.`;fact={topic:'food',amount:w.shopFood};}
   if(r.id==='emi'&&w.stormUntil<=w.tick){w.reserve+=scenario.harvest;source='Garden harvest';text+=' Harvested 3 meals for the reserve.';fact={topic:'harvest',amount:w.reserve};}
   if(r.id==='ben'&&w.supplies>0&&w.repaired<100){w.supplies--;w.repaired=Math.min(100,w.repaired+5);source='Repair supplies consumed';text+=' Repaired workshop equipment.';fact={topic:'supplies',amount:w.supplies};}
   if(r.id==='cleo')for(const o of w.residents.filter(o=>o.location==='clinic'))o.health=Math.min(100,o.health+4);
  }
 }
 if(a.kind==='give'||a.kind==='talk'){
 const other=w.residents.find(o=>o.id===a.target&&o.location===r.location);
 if(other){if(a.kind==='give'&&r.food>0){r.food--;other.food++;text=`${r.name} gave ${other.name} a meal.`;}
 if(a.kind==='talk'){const fact=r.beliefs.find(b=>b.id===a.fact);if(fact){other.beliefs.push({id:`b${g.events.length+1}-${other.id}`,text:fact.text,tick:w.tick,provenance:'testimony',source:r.id,eventId:fact.eventId,...(fact.topic?{topic:fact.topic}:{}),...(fact.amount!==undefined?{amount:fact.amount}:{}),...(fact.incident?{incident:fact.incident}:{}),...(fact.parts!==undefined?{parts:fact.parts}:{}),observedTick:fact.observedTick??fact.tick});r.sharedFacts=[...(r.sharedFacts??[]),`${other.id}:${fact.eventId}`];if(fact.topic==='fridge')r.sharedFacts.push(`${other.id}:fridge:${fact.incident}:${(fact.amount??100)<100?'broken':'resolved'}`);r.lastTalkTick=w.tick;text=`${r.name} told ${other.name}: “${fact.text}”`;}}
 if(text){r.relationships[other.id]=(r.relationships[other.id]??0)+1;other.relationships[r.id]=(other.relationships[r.id]??0)+1;}}
 }
 if(!text)text=`${r.name} waited a moment.`;
 const recipients=w.residents.filter(o=>o.location===r.location).map(o=>o.id);emit(g,before,r.id,a.kind,text,recipients,source,fact);
}
function* advanceDecisions(g:Game):Generator<View,void,Decision|undefined>{
 let before=structuredClone(g.world);const w=g.world;w.tick++;w.rng=(Math.imul(w.rng,1664525)+1013904223)>>>0;
 for(const r of w.residents){r.hunger=Math.min(100,r.hunger+1);if(r.hunger>85)r.health=Math.max(30,r.health-1);}
 emit(g,before,'world','clock','Fifteen minutes pass.',[]);
 if(w.tick>=w.shipmentDue){before=structuredClone(w);w.shopFood+=scenario.shipment;w.shipmentDue+=96;emit(g,before,'world','shipment','A shipment brought 24 meals to the market.',w.residents.filter(r=>r.location==='grocer'||r.id==='dev').map(r=>r.id),'External food shipment',{topic:'shipment',amount:scenario.shipment});}
 const f=w.fridge;
 if(f&&f.progress<100&&w.tick>=f.nextSpoilTick){
  before=structuredClone(w);const lost=Math.min(scenario.spoilBatch,w.shopFood);w.shopFood-=lost;f.spoiled+=lost;f.nextSpoilTick=w.tick+scenario.spoilInterval;
  emit(g,before,'world','spoilage',lost?`${lost} market meals spoiled while the cold-store refrigerator was broken.`:'The cold store is still broken; no market meals remain to spoil.',w.residents.filter(r=>['grocer','workshop'].includes(r.location)).map(r=>r.id),lost?'Outage food spoilage':undefined,fridgeFact(w));
 }
 for(const r of w.residents){if(r.pending&&r.busyUntil<=w.tick)complete(g,r);if(!r.pending){noticeFridge(g,r);const v=view(w,r),decision=(yield v)??decide(v);if(!act(g,decision.action,decision.reason)){const fallback=decide(view(w,r));act(g,fallback.action,fallback.reason);}}}
}
export function step(g:Game){
 const iterator=advanceDecisions(g);let next=iterator.next();while(!next.done)next=iterator.next(decide(next.value));
}
export interface HostedReply {ok:boolean;actionIndex?:number;reason?:string;dialogue?:string;model?:string}
export async function stepHosted(g:Game,propose:(v:View)=>Promise<unknown>){
 const iterator=advanceDecisions(g);let next=iterator.next();
 while(!next.done){
  const v=next.value;let decision=decide(v),record:{text:string}|undefined;
  if(v.self.id==='dev'){
   try{
    const raw=await propose(structuredClone(v));
    const reply=raw as HostedReply;
    if(reply?.ok===true&&Number.isInteger(reply.actionIndex)&&reply.actionIndex!>=0&&reply.actionIndex!<v.legalActions.length&&typeof reply.reason==='string'&&reply.reason.length>0&&reply.reason.length<=240&&typeof reply.dialogue==='string'&&reply.dialogue.length<=160&&typeof reply.model==='string'&&/^[a-zA-Z0-9._-]{1,80}$/.test(reply.model)){
     decision={action:v.legalActions[reply.actionIndex!],reason:`Hosted ${reply.model}: ${reply.reason}`};
     record={text:`Dev used ${reply.model} to choose legal action ${reply.actionIndex}. ${reply.dialogue?`In-character flavor (not new evidence): “${reply.dialogue}”`:''}`};
    }else if(reply?.ok===false&&reply.reason==='cadence'){
     // Between model turns, the offline policy keeps the village moving.
    }else{
     const safe=['disabled','missing-key','budget','timeout','provider-error','malformed','busy','not-ready','cancelled'].includes(reply?.reason??'')?reply.reason:'malformed';
     decision.reason=`Offline fallback (${safe}). ${decision.reason}`;record={text:`Dev used the offline policy: ${safe}.`};
    }
   }catch{decision.reason=`Offline fallback (provider-error). ${decision.reason}`;record={text:'Dev used the offline policy: provider-error.'};}
  }
  if(record)emit(g,structuredClone(g.world),'dev','ai',record.text,[]);
  next=iterator.next(decision);
 }
}
export function intervene(g:Game,kind:'storm'|'delay'|'donation'){
 const before=structuredClone(g.world),w=g.world;let text='';
 if(kind==='storm'){w.stormUntil=Math.max(w.tick,w.stormUntil)+16;text='A storm rolls in. Garden harvests pause for four hours.';}
 if(kind==='delay'){w.shipmentDue+=32;text='The food shipment is delayed by eight hours.';}
 if(kind==='donation'){w.treasury+=100;text='An anonymous donor added 100 coins to the town budget.';}
 emit(g,before,'player',kind,text,kind==='storm'?w.residents.map(r=>r.id):w.residents.filter(r=>r.location===(kind==='delay'?'grocer':'hall')).map(r=>r.id),kind==='donation'?'External anonymous donation':undefined,{topic:kind==='delay'?'shipment':kind,amount:kind==='donation'?100:kind==='delay'?w.shipmentDue:w.stormUntil});
 if(kind==='storm'&&(!w.fridge||w.fridge.progress===100)){
  const previous=structuredClone(w);w.fridge={id:`cold-${g.events.length+1}`,startedTick:w.tick,progress:0,parts:w.fridge?.parts??0,spoiled:0,nextSpoilTick:w.tick+scenario.spoilInterval};
  emit(g,previous,'world','crisis','A storm damaged the workshop refrigerator that protects the market food. Parts and repairs are needed.',w.residents.filter(r=>['grocer','workshop'].includes(r.location)).map(r=>r.id),undefined,fridgeFact(w));
 }

}
export function replay(g:Game,count=g.events.length):World{return structuredClone(count?g.events[count-1].after:g.initial);}
function assertWorld(w:World){
 if(w?.fridge){const f=w.fridge;if(typeof f.id!=='string'||!f.id.startsWith('cold-'))throw Error('Invalid refrigerator incident.');for(const k of ['startedTick','progress','parts','spoiled','nextSpoilTick'] as const)if(!Number.isSafeInteger(f[k])||f[k]<0)throw Error('Invalid refrigerator state.');if(f.progress>100||f.startedTick>w.tick||(f.resolvedTick!==undefined&&(!Number.isSafeInteger(f.resolvedTick)||f.resolvedTick<f.startedTick||f.resolvedTick>w.tick||f.progress!==100)))throw Error('Invalid refrigerator repair.');}
 if(w?.wagesPaused!==undefined&&typeof w.wagesPaused!=='boolean')throw Error('Invalid wage policy.');
 if(!w||!Number.isSafeInteger(w.tick)||w.tick<0||!Number.isSafeInteger(w.rng)||w.rng<0||w.rng>4294967295)throw Error('Invalid clock or random state.');
 for(const k of ['treasury','shopFood','reserve','supplies','repaired','stormUntil','shipmentDue'] as const)if(!Number.isSafeInteger(w[k])||w[k]<0)throw Error(`Invalid ${k}.`);
 if(!Array.isArray(w.residents)||w.residents.length!==6||new Set(w.residents.map(r=>r.id)).size!==6)throw Error('Save must contain six unique residents.');
 const original=create().world;
 for(const r of w.residents){const known=original.residents.find(o=>o.id===r.id);if(!known||(['name','role','trait','goal','color'] as const).some(k=>r[k]!==known[k])||!Object.hasOwn(places,r.location)||r.home!==known.home||r.job!==known.job)throw Error('Invalid resident or location.');
 for(const k of ['money','food','hunger','energy','health','busyUntil'] as const)if(!Number.isSafeInteger(r[k])||r[k]<0)throw Error(`Invalid resident ${k}.`);
 if(r.hunger>100||r.energy>100||r.health>100||typeof r.status!=='string'||!Array.isArray(r.beliefs)||!r.relationships||typeof r.relationships!=='object')throw Error('Invalid resident needs or memories.');
 for(const b of r.beliefs)if(!b||typeof b.id!=='string'||typeof b.text!=='string'||typeof b.source!=='string'||typeof b.eventId!=='string'||!Number.isSafeInteger(b.tick)||!['observation','testimony','inference'].includes(b.provenance))throw Error('Invalid belief provenance.');
 for(const b of r.beliefs){if(b.topic!==undefined&&!['food','supplies','budget','shipment','storm','donation','harvest','fridge'].includes(b.topic))throw Error('Invalid memory topic.');if(b.incident!==undefined&&typeof b.incident!=='string')throw Error('Invalid incident reference.');for(const k of ['parts','observedTick'] as const)if(b[k]!==undefined&&(!Number.isSafeInteger(b[k])||b[k]!<0))throw Error('Invalid observation metadata.');if(b.amount!==undefined&&(!Number.isSafeInteger(b.amount)||b.amount<0))throw Error('Invalid observed amount.');}
 for(const [id,value] of Object.entries(r.relationships))if(!original.residents.some(o=>o.id===id)||!Number.isSafeInteger(value)||value<0)throw Error('Invalid relationship.');
 if(r.lastTalkTick!==undefined&&(!Number.isSafeInteger(r.lastTalkTick)||r.lastTalkTick<0))throw Error('Invalid conversation time.');
 if(r.lastDecision!==undefined&&typeof r.lastDecision!=='string')throw Error('Invalid decision explanation.');
 if(r.sharedFacts!==undefined&&(!Array.isArray(r.sharedFacts)||!r.sharedFacts.every(f=>typeof f==='string')))throw Error('Invalid conversation history.');
 if(r.pending){const a=r.pending;if(a.actor!==r.id||!['move','buy','work','eat','rest','talk','give','wait'].includes(a.kind)||![1,2].includes(a.duration)||r.busyUntil<w.tick)throw Error('Invalid pending action.');if(a.kind==='move'&&!Object.hasOwn(places,a.target!))throw Error('Invalid movement target.');}
 }
}
export function save(g:Game):string {
 const pool:Belief[]=[],ids=new Map<string,number>();
 function snapshot(w:World){return {...w,residents:w.residents.map(r=>({...r,beliefs:r.beliefs.map(b=>{let id=ids.get(b.id);if(id===undefined){id=pool.length;pool.push(b);ids.set(b.id,id);}return id;})}))};}
 const initial=snapshot(g.initial),events=g.events.map(e=>({...e,after:snapshot(e.after)})),world=snapshot(g.world);
 return JSON.stringify({schemaVersion:1,encoding:'belief-pool-v1',initial,events,world,beliefPool:pool});
}
export function load(text:string):Game{
 if(text.length>40_000_000)throw Error('Save is too large (maximum 40 MB).');
 let raw:any;try{raw=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Choose a Little World save.');}
 if(raw?.encoding==='belief-pool-v1'){
  if(!Array.isArray(raw.beliefPool)||raw.beliefPool.length>50000||!Array.isArray(raw.events)||raw.events.length>12000)throw Error('Invalid memory pool or event limit.');
  const restore=(w:any)=>{if(!w||!Array.isArray(w.residents))throw Error('Invalid snapshot.');for(const r of w.residents){if(!Array.isArray(r.beliefs)||r.beliefs.length>5000)throw Error('Invalid memory list.');r.beliefs=r.beliefs.map((i:number)=>{if(!Number.isSafeInteger(i)||i<0||i>=raw.beliefPool.length)throw Error('Invalid memory reference.');return raw.beliefPool[i];});}};
  restore(raw.initial);restore(raw.world);for(const e of raw.events)restore(e.after);delete raw.encoding;delete raw.beliefPool;
 }else if(raw?.encoding)throw Error('Unsupported save encoding.');
 const g=raw as Game;
 if(!g||g.schemaVersion!==1||!Array.isArray(g.events)||g.events.length>12000)throw Error('Unsupported save version or event limit.');
 assertWorld(g.initial);assertWorld(g.world);
 for(let i=0;i<g.events.length;i++){const e=g.events[i];if(!e||e.id!==`e${i+1}`||typeof e.text!=='string'||typeof e.type!=='string'||typeof e.actor!=='string'||!Array.isArray(e.recipients)||!e.effects)throw Error('Invalid event log.');assertWorld(e.after);if(e.tick!==e.after.tick||(i&&e.tick<g.events[i-1].tick))throw Error('Invalid event order.');const before=i?g.events[i-1].after:g.initial,a=total(before),b=total(e.after);for(const key of ['money','food','supplies'] as const)if(!Number.isSafeInteger(e.effects[key])||e.effects[key]!==b[key]-a[key])throw Error('Event accounting does not balance.');if((e.effects.money||e.effects.food||e.effects.supplies)&&typeof e.effects.source!=='string')throw Error('Resource changes need a recorded source.');if(!e.recipients.every(id=>g.initial.residents.some(r=>r.id===id)))throw Error('Invalid observation recipients.');}
 if(JSON.stringify(replay(g))!==JSON.stringify(g.world))throw Error('Save state does not match its event log.');return g;
}
export function time(tick:number){return `Day ${Math.floor(tick/96)+1} · ${String(Math.floor(tick%96/4)).padStart(2,'0')}:${String(tick%4*15).padStart(2,'0')}`;}

export interface MorningSummary {marketFood:number; budget:number; mealsEaten:number; mealsShared:number; conversations:number; hungryHours:number; repaired:number; gifts:Record<string,number>}
export function compareMornings(initial:World,scarce=false):{normal:MorningSummary;delayed:MorningSummary}{
 const start=structuredClone(initial);
 if(scarce){start.shopFood=2;start.reserve=0;for(const r of start.residents){r.food=0;r.hunger=60;}}
 function run(delayed:boolean):MorningSummary{
  const g:Game={schemaVersion:1,initial:structuredClone(start),world:structuredClone(start),events:[]};
  if(delayed)intervene(g,'delay');
  for(let i=0;i<96;i++)step(g);
  const gifts=Object.fromEntries(g.world.residents.map(r=>[r.id,0]));
  for(const e of g.events)if(e.type==='give'&&e.text.includes(' gave '))gifts[e.actor]++;
  return {marketFood:g.world.shopFood,budget:g.world.treasury,repaired:g.world.repaired,
   mealsEaten:g.events.filter(e=>e.type==='eat'&&e.effects.food===-1).length,
   mealsShared:Object.values(gifts).reduce((n,v)=>n+v,0),gifts,
   conversations:g.events.filter(e=>e.type==='talk'&&e.text.includes(' told ')).length,
   hungryHours:g.events.filter(e=>e.type==='clock').reduce((n,e)=>n+e.after.residents.filter(r=>r.hunger>=70).length/4,0)};
 }
 return {normal:run(false),delayed:run(true)};
}
