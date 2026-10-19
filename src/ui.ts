import {hostedRequest} from './hosted.js';
import {create,step,stepHosted,intervene,places,time,load,save,replay,compareMornings,compareCrisis,hostedSchedule,fridgeKnowledge,type Game,type Place,type World,type View,type CrisisComparison} from './engine.js';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let aiBusy=false,aiReady=false,aiNonce='',aiModel='',aiAttempts=0,aiMax=20;
let schedule=hostedSchedule(),lastRequestAt=0,experimentAbort:AbortController|undefined,crisisResult:CrisisComparison|undefined;
let game:Game=create(),selected='ada',playing=false,timer:ReturnType<typeof setInterval>|undefined,replayAt:number|null=null;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function message(s:string){el('message').textContent=s;el('message').style.display='block';setTimeout(()=>el('message').style.display='none',4500);}
function pause(){playing=false;clearInterval(timer);el('play').textContent='▶ Play';}
function aiStatus(){el('ai-status').textContent=aiBusy?'Waiting for a resident’s decision…':aiReady?`${aiModel} · ${aiAttempts}/${aiMax} requests used this server run. Hosted calls may incur API charges.`:'Offline mode. Start the local server and configure .env.local for hosted AI.';}
function applyLocks(){
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-intervention],#step,#save,#load,#reset,#replay,#return,#compare,#crisis-compare,#crisis-limit,#download-offline,#download-hosted,#download-comparison'))b.disabled=aiBusy||(replayAt!==null&&(b.matches('[data-intervention],#step')));
 el<HTMLButtonElement>('crisis-compare').disabled=aiBusy||!aiReady;
 el<HTMLInputElement>('ai-enabled').disabled=!aiReady||aiBusy||replayAt!==null;el<HTMLButtonElement>('play').disabled=replayAt!==null;aiStatus();
}
async function refreshAI(){
 if(!['localhost','127.0.0.1'].includes(location.hostname)||location.protocol!=='http:')return;
 try{const r=await fetch('/api/status');if(!r.ok)return;const data=await r.json();aiReady=data.ready===true;aiNonce=typeof data.nonce==='string'?data.nonce:'';aiModel=String(data.model??'');aiAttempts=Number(data.attempts??0);aiMax=Number(data.maxRequests??20);}catch{aiReady=false;}applyLocks();
}
async function tick(){
 if(aiBusy)return;
 if(game.events.length>11000){pause();message('This story has reached its event limit. Save it and start a new world.');return;}
 aiBusy=true;applyLocks();
 try{
  if(el<HTMLInputElement>('ai-enabled').checked&&aiReady){
   await stepHosted(game,requestDecision,schedule(game));
  }else step(game);
 }catch{pause();message('The step could not finish. The village is paused.');}
 finally{aiBusy=false;render();if(el<HTMLInputElement>('ai-enabled').checked)void refreshAI();}
}
function current():World{return replayAt===null?game.world:replay(game,replayAt);}
function render(){
 const w=current(),r=w.residents.find(r=>r.id===selected)!;
 el('clock').textContent=time(w.tick);el('day-label').textContent=replayAt===null?'VILLAGE · LIVE':'RECORDED HISTORY';
 document.body.classList.toggle('storm',w.stormUntil>w.tick);el('weather').innerHTML=w.stormUntil>w.tick?'☁ <span>Rain over the village<small>The garden is waiting for clear skies</small></span>':'☀ <span>A little world, unfolding<small>There’s always another story around the corner</small></span>';
 const cold=w.fridge;el('crisis').hidden=!cold;
 if(cold){
  const fixed=cold.progress===100;el('crisis').classList.toggle('resolved',fixed);
  el('crisis').innerHTML=`<div class="crisis-heading"><div><p class="eyebrow">A SHARED PROBLEM · PLAYER’S ALL-SEEING VIEW</p><h2>${fixed?'The cold store is working again.':'The refrigerator is broken.'}</h2></div><strong>${cold.progress}% repaired</strong></div><p>${fixed?`Ben finished at ${time(cold.resolvedTick??w.tick)}. No further meals will spoil from this outage.`:`The workshop refrigerator protects the market’s food. Two meals can spoil each simulated hour until repairs finish. Next check: ${time(cold.nextSpoilTick)}.`}</p><div class="crisis-numbers"><span>${cold.spoiled} meals spoiled</span><span>${cold.parts} spare parts available</span><span>${w.shopFood} market meals left</span></div><div class="bar"><span style="width:${cold.progress}%"></span></div><p class="knowledge-note">Repairs need Finn’s funding, refrigerator parts, workshop supplies, and Ben on site. The market alarm display also reveals the outage. News elsewhere travels through conversations.</p><div class="crisis-knowledge">${w.residents.map(person=>{const belief=fridgeKnowledge(person),aware=belief?.incident===cold.id;return `<span><strong>${person.name}</strong> ${!aware?'hasn’t heard':belief?.amount===100?'knows it’s fixed':'knows about the failure'}</span>`;}).join('')}</div>`;
 }
 el('residents').innerHTML=w.residents.map((o,i)=>{let p=places[o.location],x=p.x+((i%3)-1)*3,y=p.y+9+Math.floor(i/3)*3;if(o.pending?.kind==='move'){const dest=places[o.pending.target as Place];x=(p.x+dest.x)/2+((i%3)-1)*2;y=(p.y+dest.y)/2+6;}return `<button class="resident ${o.id===selected?'selected':''}" data-resident="${o.id}" style="left:${x}%;top:${y}%;--resident-color:${o.color}" data-name="${o.name}" aria-label="Inspect ${o.name}, ${esc(o.status)}">${o.name[0]}</button>`;}).join('');
 el('cast').innerHTML=w.residents.map(o=>`<button class="${o.id===selected?'active':''}" data-resident="${o.id}" aria-label="Inspect ${o.name}" aria-pressed="${o.id===selected}"><span class="avatar" style="--resident-color:${o.color}">${o.name[0]}</span>${o.name}</button>`).join('');
 el('stats').innerHTML=[[w.wagesPaused?'BUDGET · WAGES PAUSED':'TOWN BUDGET',w.treasury,'coins'],['MARKET FOOD',w.shopFood,'meals'],['FOOD RESERVE',w.reserve,'meals'],['WORKSHOP',w.repaired,'% fixed']].map(([label,value,unit])=>`<div class="stat"><small>${label}</small><strong>${value}<em>${unit}</em></strong></div>`).join('');
 el('inspector-content').innerHTML=`<div class="profile"><div class="profile-top"><div><h3>${r.name}</h3><span class="role">The ${r.role.toLowerCase()}</span></div><span class="avatar large-avatar" style="--resident-color:${r.color}">${r.name[0]}</span></div><span class="trait">${r.trait} · shapes decisions</span><p class="location">⌖ ${places[r.location].name}</p><div class="status">${esc(r.status)}</div><p class="section-label">WHY THIS CHOICE?</p><p class="decision-reason">${esc(r.lastDecision??'A new morning. Time to see what the day brings.')}</p><div class="needs">${[['Fullness',100-r.hunger],['Energy',r.energy],['Health',r.health]].map(([n,v])=>`<div class="need"><span>${n}</span><div class="bar"><span style="width:${v}%"></span></div><span>${v}%</span></div>`).join('')}</div><div class="pockets"><span>◈ ${r.money} coins</span><span>♧ ${r.food} meals</span></div><p class="section-label">A LITTLE AMBITION</p><p class="goal">“${r.goal}.”</p><p class="section-label">WHAT ${r.name.toUpperCase()} KNOWS</p><p class="knowledge-note">Personal memories, not the town’s complete story. Testimony records who told them.</p><ul class="memories">${r.beliefs.slice(-15).reverse().map(b=>`<li><small>${esc(b.provenance.toUpperCase())} · ${esc(b.source)} · ${time(b.tick)}${b.observedTick!==undefined&&b.observedTick!==b.tick?` · first observed ${time(b.observedTick)}`:''} · ${esc(b.eventId)}</small>${esc(b.text)}</li>`).join('')||'<li>No memories yet. Press play to start the day.</li>'}</ul><p class="section-label">CONNECTIONS</p><div class="relationships">${Object.entries(r.relationships).map(([id,v])=>`${esc(id)} · ${v} shared moment${v===1?'':'s'}`).join('<br>')||'Friendships grow through conversations and kindness.'}</div></div>`;
 const rf=el<HTMLSelectElement>('resident-filter').value,tf=el<HTMLSelectElement>('type-filter').value,decisions=el<HTMLInputElement>('decisions').checked;
 const events=(replayAt===null?game.events:game.events.slice(0,replayAt)).filter(e=>e.type!=='clock'&&(decisions||e.type!=='decision')&&(rf==='all'||e.actor===rf||e.recipients.includes(rf))&&(tf==='all'||(tf==='intervention'?['storm','delay','donation'].includes(e.type):tf==='crisis'?e.type==='crisis'||e.type==='spoilage'||e.text.includes('refrigerator')||e.text.includes('cold-store'):e.type===tf))).slice(-60).reverse();
 el('feed').innerHTML=events.map(e=>`<div class="entry"><time>${time(e.tick)}</time><span class="event-icon">${({talk:'☏',work:'⚒',buy:'♧',storm:'☁',donation:'♡',shipment:'▣',delay:'◷'} as Record<string,string>)[e.type]??'·'}</span><div>${esc(e.text)}<span class="sr-only">Event ${e.id}</span></div></div>`).join('')||'<div class="empty">The journal is waiting for its first little moment. Press Play or Step.</div>';
 el<HTMLInputElement>('scrub').max=String(game.events.length);el<HTMLInputElement>('scrub').value=String(replayAt??game.events.length);el<HTMLInputElement>('scrub').disabled=replayAt===null;el('replay-label').textContent=replayAt===null?'Live':`${replayAt} / ${game.events.length}`;el('return').hidden=replayAt===null;
 applyLocks();
}
el('buildings').innerHTML=Object.entries(places).map(([id,p])=>`<div class="building ${id.includes('home')?'home':id}" style="left:${p.x}%;top:${p.y}%"><span class="structure"></span><small>${p.name}</small></div>`).join('');
for(const r of game.world.residents)el('resident-filter').insertAdjacentHTML('beforeend',`<option value="${r.id}">${r.name}</option>`);
document.addEventListener('click',e=>{const target=(e.target as HTMLElement).closest<HTMLElement>('[data-resident],[data-intervention]');if(target?.dataset.resident){selected=target.dataset.resident;render();}if(target?.dataset.intervention&&replayAt===null&&!aiBusy){intervene(game,target.dataset.intervention as 'storm'|'delay'|'donation');render();message('Your nudge is now part of the story.');}});
el('play').onclick=()=>{if(playing){pause();return;}playing=true;el('play').textContent='Ⅱ Pause';timer=setInterval(tick,Number(el<HTMLSelectElement>('speed').value));};
el('step').onclick=()=>{pause();tick();};el('speed').onchange=()=>{if(playing){pause();el('play').click();}};
el('reset').onclick=()=>{pause();if(game.events.length&&!confirm('Start a fresh village? Save first if you want to keep this story.'))return;game=create();replayAt=null;schedule=hostedSchedule();render();};
el('save').onclick=()=>{pause();const blob=new Blob([save(game)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`little-world-day-${Math.floor(game.world.tick/96)+1}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('World saved. Keep the JSON file to revisit this story.');};
el('load').onclick=()=>{pause();el<HTMLInputElement>('file').click();};el('file').onchange=async()=>{const input=el<HTMLInputElement>('file'),file=input.files?.[0];if(!file)return;if(aiBusy){message('Wait for the current decision before loading a world.');input.value='';return;}try{if(file.size>40_000_000)throw Error('Choose a save smaller than 40 MB.');const next=load(await file.text());game=next;replayAt=null;schedule=hostedSchedule();render();message('Your village is back, just as you left it.');}catch(e){message(`Could not load: ${(e as Error).message}`);}input.value='';};
el('replay').onclick=()=>{pause();replayAt=0;render();};el('scrub').oninput=()=>{replayAt=Number(el<HTMLInputElement>('scrub').value);render();};el('return').onclick=()=>{replayAt=null;render();};
for(const id of ['resident-filter','type-filter','decisions'])el(id).onchange=render;
render();

el('compare').onclick=()=>{
 pause();const b=el<HTMLButtonElement>('compare');b.disabled=true;b.textContent='Watching two days…';
 setTimeout(()=>{try{
  const scarce=el<HTMLInputElement>('scarce').checked,{normal,delayed}=compareMornings(game.initial,scarce);
  const rows:[string,number,number][]=[['Meals eaten',normal.mealsEaten,delayed.mealsEaten],['Meals shared',normal.mealsShared,delayed.mealsShared],['Conversations',normal.conversations,delayed.conversations],['Hours hungry, all neighbors combined',normal.hungryHours,delayed.hungryHours],['Market meals left',normal.marketFood,delayed.marketFood],['Town coins left',normal.budget,delayed.budget],['Workshop repaired (%)',normal.repaired,delayed.repaired]];
  el('comparison-result').innerHTML=`<p class="knowledge-note">Two separate 24-hour runs from your world’s original snapshot, using the same random state and rules. ${scarce?'Both start with 2 market meals, an empty reserve, and hungry residents carrying no food.':'Both use the original food supplies.'} Only the second run gets an eight-hour shipment delay. Your live village is unchanged. “Hungry” means hunger of 70 or higher.</p><div class="table-scroll"><table><caption class="sr-only">Two mornings comparison</caption><thead><tr><th scope="col">What happened</th><th scope="col">Normal delivery</th><th scope="col">8-hour delay</th></tr></thead><tbody>${rows.map(([label,a,b])=>`<tr><th scope="row">${label}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div><p class="knowledge-note">Meals shared by neighbor (normal / delayed): ${game.initial.residents.map(r=>`${r.name} ${normal.gifts[r.id]} / ${delayed.gifts[r.id]}`).join(' · ')}.</p>`;
 }catch(error){message(`Comparison failed: ${(error as Error).message}`);}finally{b.disabled=false;b.textContent='Compare two days →';}},30);
};

el('ai-enabled').onchange=()=>{schedule=hostedSchedule();message(el<HTMLInputElement>('ai-enabled').checked?'All six residents can take turns using hosted AI. They share one request budget.':'All six residents are back on offline rules.');};
void refreshAI();

async function requestDecision(v:View,signal?:AbortSignal):Promise<unknown>{
 const signals=[AbortSignal.timeout(20000),...(signal?[signal]:[])],combined=AbortSignal.any(signals);
 const delay=Math.max(0,1050-(Date.now()-lastRequestAt));
 if(delay)await new Promise<void>((resolve,reject)=>{
  combined.throwIfAborted();
  const abort=()=>{clearTimeout(timer);reject(combined.reason);};
  const timer=setTimeout(()=>{combined.removeEventListener('abort',abort);resolve();},delay);
  combined.addEventListener('abort',abort,{once:true});
 });
 combined.throwIfAborted();lastRequestAt=Date.now();
 const response=await fetch('/api/decide',{method:'POST',headers:{'Content-Type':'application/json','X-Little-World-Token':aiNonce},body:JSON.stringify(hostedRequest(v)),signal:combined});
 if(!response.ok)return {ok:false,reason:'provider-error'};
 return response.json();
}
function downloadJson(value:unknown,name:string){
 const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
el('crisis-cancel').onclick=()=>experimentAbort?.abort();
el('crisis-compare').onclick=async()=>{
 if(aiBusy||!aiReady)return;pause();aiBusy=true;experimentAbort=new AbortController();applyLocks();
 el('crisis-cancel').hidden=false;el('crisis-result').textContent='Running two separate days… Hosted requests may take a few minutes.';
 try{
  await refreshAI();const limit=Number(el<HTMLInputElement>('crisis-limit').value);
  if(!Number.isSafeInteger(limit)||limit<1||limit>20)throw Error('Choose 1–20 requests.');
  if(aiAttempts>=aiMax)throw Error('The shared server request budget is exhausted.');
  let used=0;
  crisisResult=await compareCrisis(game.initial,async v=>{
   el('crisis-result').textContent=`Hosted opportunity ${++used}/${Math.min(limit,aiMax-aiAttempts)}: ${v.self.name}. The live village is unchanged.`;
   return requestDecision(v,experimentAbort!.signal);
  },Math.min(limit,aiMax-aiAttempts),experimentAbort.signal);
  const a=crisisResult.offline.metrics,b=crisisResult.hosted.metrics;
  const rows:[string,string|number,string|number][]=[['Minutes until refrigerator repaired',a.repairMinutes??'Not within 24 hours',b.repairMinutes??'Not within 24 hours'],['Meals spoiled',a.spoiled,b.spoiled],['Combined hours hungry (hunger ≥70)',a.hungryHours,b.hungryHours],['Meals shared',a.mealsShared,b.mealsShared],['Conversations',a.conversations,b.conversations],['Town coins left',a.budget,b.budget],['Hosted opportunities / accepted choices','0 / 0',`${b.attempts} / ${b.accepted}`]];
  el('crisis-result').innerHTML=`<p class="knowledge-note">Same original snapshot and random state, same storm, 24 hours each. The hosted run rotates among six residents, with rules between model turns and on failures. One trial cannot establish which policy is better. Your live village is unchanged.</p><div class="table-scroll"><table><thead><tr><th>What happened</th><th>Offline rules</th><th>Hosted + rules</th></tr></thead><tbody>${rows.map(([label,a,b])=>`<tr><th scope="row">${label}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div>`;
  el('crisis-downloads').hidden=false;
 }catch(error){crisisResult=undefined;el('crisis-downloads').hidden=true;el('crisis-result').textContent=experimentAbort.signal.aborted?'Comparison cancelled. Completed API requests still count toward your shared budget. Your live village is unchanged.':`Comparison stopped: ${(error as Error).message}`;}
 finally{experimentAbort=undefined;aiBusy=false;el('crisis-cancel').hidden=true;render();void refreshAI();}
};
el('download-offline').onclick=()=>{if(crisisResult)downloadJson(save(crisisResult.offline.game),'little-world-crisis-offline.json');};
el('download-hosted').onclick=()=>{if(crisisResult)downloadJson(save(crisisResult.hosted.game),'little-world-crisis-hosted.json');};
el('download-comparison').onclick=()=>{if(crisisResult)downloadJson({...crisisResult,offline:{...crisisResult.offline,game:JSON.parse(save(crisisResult.offline.game))},hosted:{...crisisResult.hosted,game:JSON.parse(save(crisisResult.hosted.game))}},'little-world-crisis-comparison.json');};
