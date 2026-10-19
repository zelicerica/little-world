import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prepareHostedContext} from '../dist/hosted.js';
import {makeOpenAIProvider,validateChoice} from './provider.mjs';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
export function readConfig(env=process.env){
 const number=(name,fallback,min,max)=>{const v=Number(env[name]??fallback);if(!Number.isInteger(v)||v<min||v>max)throw Error(`Invalid ${name}.`);return v;};
 const model=env.LITTLE_WORLD_MODEL??'gpt-5.4-mini';if(!/^[a-zA-Z0-9._-]{1,80}$/.test(model))throw Error('Invalid LITTLE_WORLD_MODEL.');
 return {enabled:env.LITTLE_WORLD_AI_ENABLED==='true',apiKey:env.OPENAI_API_KEY??'',model,maxRequests:number('LITTLE_WORLD_MAX_REQUESTS',20,1,100),maxOutputTokens:number('LITTLE_WORLD_MAX_OUTPUT_TOKENS',256,64,512),timeoutMs:number('LITTLE_WORLD_TIMEOUT_MS',8000,1000,15000),port:number('PORT',4173,1024,65535)};
}
export function createApp({config=readConfig(),provider,clock=()=>Date.now()}={}){
 const nonce=randomBytes(32).toString('hex');
 const stats={attempts:0,accepted:0,fallbacks:0,inputTokens:0,outputTokens:0};let busy=false,lastCall=-Infinity;
 const generate=provider??makeOpenAIProvider(config);
 const status=()=>({provider:'OpenAI',model:config.model,ready:config.enabled&&!!config.apiKey,maxRequests:config.maxRequests,...stats,nonce});
 const server=createServer(async(req,res)=>{
  const host=req.headers.host??'',origin=req.headers.origin;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
  const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  if(!/^(localhost|127\.0\.0\.1):\d+$/.test(host)||(origin&&origin!==`http://${host}`)){send(403,{error:'Local same-origin requests only.'});return;}
  const path=new URL(req.url??'/',`http://${host}`).pathname;
  if(req.method==='GET'&&path==='/api/status'){send(200,status());return;}
  if(req.method==='POST'&&path==='/api/decide'){
   const token=req.headers['x-little-world-token'];
   if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(token),Buffer.from(nonce))){send(403,{error:'Missing local session token.'});return;}
   if(req.headers['content-type']!=='application/json'){send(415,{error:'JSON required.'});return;}
   const fallback=reason=>{stats.fallbacks++;send(200,{ok:false,reason});};
   if(!config.enabled){fallback('disabled');return;}if(!config.apiKey){fallback('missing-key');return;}
   if(stats.attempts>=config.maxRequests){fallback('budget');return;}if(busy){fallback('busy');return;}if(clock()-lastCall<1000){fallback('cadence');return;}
   let context;try{
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>100_000)throw Error('oversized');chunks.push(chunk);}
    context=prepareHostedContext(JSON.parse(Buffer.concat(chunks).toString('utf8')));
   }catch{send(400,{error:'Invalid or oversized resident context.'});return;}
   // Recheck after awaiting the body: concurrent requests share one budget and one provider slot.
   if(stats.attempts>=config.maxRequests){fallback('budget');return;}if(busy){fallback('busy');return;}if(clock()-lastCall<1000){fallback('cadence');return;}
   busy=true;lastCall=clock();stats.attempts++;
   const controller=new AbortController();let timeout;
   try{
    const timedOut=new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new Error('timeout'));},config.timeoutMs);});
    const result=await Promise.race([generate(context,controller.signal),timedOut]);
    if(!validateChoice(result?.choice,context.actions.map(a=>a.index))){fallback('malformed');return;}
    stats.inputTokens+=Number.isSafeInteger(result.usage?.inputTokens)?Math.max(0,result.usage.inputTokens):0;stats.outputTokens+=Number.isSafeInteger(result.usage?.outputTokens)?Math.max(0,result.usage.outputTokens):0;
    stats.accepted++;send(200,{ok:true,...result.choice,model:config.model});
   }catch{fallback(controller.signal.aborted?'timeout':'provider-error');}finally{clearTimeout(timeout);busy=false;}
   return;
  }
  const files={'/':'index.html','/index.html':'index.html','/engine.js':'engine.js','/hosted.js':'hosted.js','/ui.js':'ui.js','/style.css':'style.css'};
  if(req.method==='GET'&&files[path]){try{const file=files[path],bytes=await readFile(dist+file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(bytes);}catch{send(500,{error:'Build the application with npm run build first.'});}return;}
  send(404,{error:'Not found.'});
 });
 server.requestTimeout=20000;server.headersTimeout=20000;
 return {server,status};
}
