import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, open, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export type AudioRequest={text:string;voice:string;rate:string;format:string;itemId?:string;role?:string};
const FORMAT='audio-24khz-96kbitrate-mono-mp3';
const hash=(data:string|Uint8Array)=>createHash('sha256').update(data).digest('hex');
export function speechUrls(endpoint:string){
 let u:URL;try{u=new URL(endpoint);}catch{throw Error('AZURE_ENDPOINT_INVALID');}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port)throw Error('AZURE_ENDPOINT_INVALID');
 let base:string;let prefix='';
 if(/^[a-z0-9-]+\.api\.cognitive\.microsoft\.com$/.test(u.hostname)){
  if(u.pathname!=='/')throw Error('AZURE_ENDPOINT_INVALID');
  base=`https://${u.hostname.split('.')[0]}.tts.speech.microsoft.com`;
 }else if(/^[a-z0-9-]+\.tts\.speech\.microsoft\.com$/.test(u.hostname)){
  if(!['/','/cognitiveservices/v1'].includes(u.pathname))throw Error('AZURE_ENDPOINT_INVALID');
  base=u.origin;
 }else if(/^[a-z0-9-]+\.cognitiveservices\.azure\.com$/.test(u.hostname)){
  if(!['/','/tts/cognitiveservices/v1'].includes(u.pathname))throw Error('AZURE_ENDPOINT_INVALID');
  base=u.origin;prefix='/tts';
 }else throw Error('AZURE_ENDPOINT_INVALID');
 return {synthesis:`${base}${prefix}/cognitiveservices/v1`,voices:`${base}${prefix}/cognitiveservices/voices/list`};
}
const escapeXml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function validate(r:AudioRequest){
 if(!r.text?.trim()||r.text.length>2000||/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(r.text))throw Error('INVALID_TEXT');
 if(!/^ja-JP-[A-Za-z]+Neural$/.test(r.voice)||!['0%','-5%','-10%'].includes(r.rate)||r.format!==FORMAT)throw Error('INVALID_VOICE_CONFIG');
}
export function makeSsml(r:AudioRequest){validate(r);return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP"><voice name="${r.voice}"><prosody rate="${r.rate}">${escapeXml(r.text)}</prosody></voice></speak>`;}
export function requestKey(r:AudioRequest){return hash(JSON.stringify({provider:'azure-speech',ssml:makeSsml(r),format:r.format}));}
// Deliberately conservative budget units, not an invoice: count serialized SSML UTF-16 units twice.
export const budgetUnits=(r:AudioRequest)=>makeSsml(r).length*2;
export function buildRequests(pilot:unknown):AudioRequest[]{
 const p=pilot as {items?:{id:string;listenText:string;exampleJa:string;textStatus:string}[]};
 if(!Array.isArray(p.items)||!p.items.length)throw Error('EMPTY_PILOT');
 const ids=new Set<string>();return p.items.flatMap(i=>{
  if(!/^[a-z0-9-]+$/.test(i.id)||ids.has(i.id))throw Error('DUPLICATE_ITEM');ids.add(i.id);
  return (['listen','example'] as const).map(role=>{
   const request={itemId:i.id,role,text:role==='listen'?i.listenText:i.exampleJa,voice:'ja-JP-NanamiNeural',rate:'0%',format:FORMAT};validate(request);return request;
  });
 });
}
export async function checkAudio(bytes:Uint8Array){
 if(bytes.length<100)throw Error('AUDIO_INVALID');
 const dir=await mkdtemp(join(tmpdir(),'eju-check-'));
 try{
  const path=join(dir,'input.mp3');await writeFile(path,bytes);
  const {stdout,stderr}=await exec('ffmpeg',['-hide_banner','-v','warning','-xerror','-i',path,'-f','s16le','-ac','1','-ar','24000','pipe:1'],{encoding:'buffer',maxBuffer:4_000_000,timeout:15000});
  // Reject decoder warnings instead of accepting a partly decoded/truncated stream.
  const warnings=stderr.toString().split('\n').filter(line=>line.trim());
  if(warnings.some(line=>!/^\[(?:in#0\/)?mp3 @ 0x[0-9a-f]+\] Estimating duration from bitrate, this may be inaccurate$/.test(line)))throw Error('AUDIO_INVALID');
  const samples=stdout.length/2,durationMs=samples/24;let sum=0,clipped=0,peakRun=0;const windows:number[]=[];
  for(let start=0;start<samples;start+=240){let energy=0;let count=0;for(let i=start;i<Math.min(start+240,samples);i++){
   const x=stdout.readInt16LE(i*2)/32768;energy+=x*x;count++;sum+=x*x;
   clipped=Math.abs(x)>=32767/32768?clipped+1:0;peakRun=Math.max(peakRun,clipped);
  }windows.push(Math.sqrt(energy/count));}
  let leading=0,trailing=0;for(const w of windows){if(w>=.0031623)break;leading+=10;}for(const w of [...windows].reverse()){if(w>=.0031623)break;trailing+=10;}
  if(durationMs<200||durationMs>30000||Math.sqrt(sum/samples)<.0031623||leading>2000||trailing>2000||peakRun>=3)throw Error('AUDIO_INVALID');
  return {durationMs:Math.round(durationMs),leadingSilenceMs:leading,trailingSilenceMs:trailing};
 }catch{throw Error('AUDIO_INVALID');}finally{await rm(dir,{recursive:true,force:true});}
}
type Asset={request:AudioRequest & {provider:'azure-speech'};generatedAt:string;requestKey:string;file:string;sha256:string;bytes:number;durationMs:number;status:'pending_listening_review'};
type Ledger={schemaVersion:1;maxCalls:number;maxChars:number;calls:number;characters:number;attempts:Record<string,number>};
type BatchOptions={dir:string;generate?:boolean;maxCalls?:number;maxChars?:number;provider?:(r:AudioRequest)=>Promise<Uint8Array>};
async function json(path:string){return JSON.parse(await readFile(path,'utf8'));}
async function atomic(path:string,value:unknown){await writeFile(`${path}.tmp`,JSON.stringify(value,null,2)+'\n');await rename(`${path}.tmp`,path);}
async function cached(dir:string,key:string):Promise<Asset|null>{
 try{
  const a=await json(join(dir,'cache',`${key}.json`)) as Asset;
  if(!a.request||requestKey(a.request)!==key||!Number.isFinite(Date.parse(a.generatedAt))||a.requestKey!==key||!/^[a-f0-9]{64}$/.test(a.sha256)||a.file!==`audio/${a.sha256}.mp3`||a.status!=='pending_listening_review')return null;
  const b=await readFile(join(dir,a.file));if(hash(b)!==a.sha256||b.length!==a.bytes)return null;
  const technical=await checkAudio(b);return {...a,...technical};
 }catch{return null;}
}
export async function runBatch(requests:AudioRequest[],options:BatchOptions){
 if(!requests.length)throw Error('EMPTY_BATCH');requests.forEach(validate);
 const result={mode:options.generate?'generate':'dry-run',requests:requests.length,uniqueRequests:new Set(requests.map(requestKey)).size,cached:0,missing:0,generated:0,budgetUnits:0,spokenCharacters:requests.reduce((n,r)=>n+[...r.text].length,0)};
 if(!options.generate){
  const seen=new Set<string>();for(const r of requests){const key=requestKey(r);if(seen.has(key))continue;seen.add(key);
   if(await cached(options.dir,key))result.cached++;else{result.missing++;result.budgetUnits+=budgetUnits(r);}
  }return result;
 }
 if(!Number.isSafeInteger(options.maxCalls)||options.maxCalls!<0||!Number.isSafeInteger(options.maxChars)||options.maxChars!<0)throw Error('EXPLICIT_BUDGET_REQUIRED');
 if(!options.provider)throw Error('PROVIDER_REQUIRED');
 await mkdir(options.dir,{recursive:true});
 let lock;try{lock=await open(join(options.dir,'.lock'),'wx');}catch{throw Error('BATCH_LOCKED');}
 try{
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  await mkdir(join(options.dir,'audio'),{recursive:true});await mkdir(join(options.dir,'cache'),{recursive:true});
  const ledgerPath=join(options.dir,'run-ledger.json');let ledger:Ledger;
  try{ledger=await json(ledgerPath);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('LEDGER_INVALID');ledger={schemaVersion:1,maxCalls:options.maxCalls!,maxChars:options.maxChars!,calls:0,characters:0,attempts:{}};}
  if(ledger.schemaVersion!==1||!Number.isSafeInteger(ledger.calls)||ledger.calls<0||!Number.isSafeInteger(ledger.characters)||ledger.characters<0||!ledger.attempts||Object.values(ledger.attempts).some(x=>!Number.isSafeInteger(x)||x<0))throw Error('LEDGER_INVALID');
  if(ledger.maxCalls!==options.maxCalls||ledger.maxChars!==options.maxChars)throw Error('BUDGET_CHANGE_REQUIRES_REVIEW');
  const assets:Asset[]=[];
  for(const r of requests){
   const key=requestKey(r);let asset=await cached(options.dir,key);
   if(asset){result.cached++;assets.push(asset);continue;}
   result.missing++;const chars=budgetUnits(r);
   if(ledger.calls>=ledger.maxCalls||ledger.characters+chars>ledger.maxChars)throw Error('BUDGET_EXHAUSTED');
   if((ledger.attempts[key]||0)>=3)throw Error('RETRY_LIMIT');
   ledger.calls++;ledger.characters+=chars;result.budgetUnits+=chars;ledger.attempts[key]=(ledger.attempts[key]||0)+1;
   await atomic(ledgerPath,ledger); // Reserve before contacting Azure; ambiguous failures remain spent.
   let bytes:Uint8Array;try{bytes=await options.provider(r);}catch{throw Error('SYNTHESIS_FAILED');}
   let technical:Awaited<ReturnType<typeof checkAudio>>;
   try{technical=await checkAudio(bytes);}catch(error){
    await mkdir(join(options.dir,'rejected'),{recursive:true});
    const rejected=join(options.dir,'rejected',`${key}-${ledger.attempts[key]}`);
    await writeFile(`${rejected}.bin`,bytes);
    await atomic(`${rejected}.json`,{request:r,receivedAt:new Date().toISOString(),status:'technical_rejected',sha256:hash(bytes)});
    throw error;
   }
   const sha256=hash(bytes);const file=`audio/${sha256}.mp3`;
   await writeFile(join(options.dir,`${file}.tmp`),bytes);await rename(join(options.dir,`${file}.tmp`),join(options.dir,file));
   asset={request:{provider:'azure-speech',text:r.text,voice:r.voice,rate:r.rate,format:r.format},generatedAt:new Date().toISOString(),requestKey:key,file,sha256,bytes:bytes.length,...technical,status:'pending_listening_review'};
   await atomic(join(options.dir,'cache',`${key}.json`),asset);assets.push(asset);result.generated++;
  }
  await atomic(join(options.dir,'candidate-manifest.json'),{schemaVersion:1,status:'pending_listening_review',audioReview:'unavailable',assets:[...new Map(assets.map(a=>[a.requestKey,a])).values()],references:requests.map(r=>({itemId:r.itemId,role:r.role,requestKey:requestKey(r)}))});
  return result;
 }finally{await lock.close();await rm(join(options.dir,'.lock'),{force:true});}
}
export function azureProvider(endpoint:string,key:string){
 const urls=speechUrls(endpoint);if(!key?.trim())throw Error('AZURE_KEY_MISSING');
 return async(r:AudioRequest)=>{
  const response=await fetch(urls.synthesis,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':r.format,'User-Agent':'EJU-WordTest-ContentBuilder'},body:makeSsml(r)});
  if(!response.ok)throw Error('AZURE_SYNTHESIS_HTTP_ERROR');
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>2_000_000)throw Error('AUDIO_TOO_LARGE');return bytes;
 };
}
export async function availableVoices(endpoint:string,key:string):Promise<string[]>{
 const response=await fetch(speechUrls(endpoint).voices,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Ocp-Apim-Subscription-Key':key}});
 if(!response.ok)throw Error('AZURE_VOICE_LIST_FAILED');
 const voices=await response.json() as {ShortName:string;Locale:string}[];
 return voices.filter(v=>v.Locale==='ja-JP').map(v=>v.ShortName);
}
