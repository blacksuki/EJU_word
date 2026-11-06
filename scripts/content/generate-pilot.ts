import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';
import {availableVoices,azureProvider,buildRequests,runBatch} from './azure-audio.ts';
export function parseArgs(args:string[]){
 const options={pilotSize:20,generate:false,pilot:'content/pilots/eju-20-v1.json',out:'artifacts/audio/eju-20-v1',review:'content/reviews/eju-20-text.json',limitItems:20,voice:'ja-JP-NanamiNeural',envFile:undefined as string|undefined,maxCalls:undefined as number|undefined,maxChars:undefined as number|undefined};
 const seen=new Set<string>();
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(seen.has(flag))throw Error('INVALID_ARGUMENT');seen.add(flag);
  if(flag==='--generate'){options.generate=true;continue;}if(flag==='--dry-run')continue;
  const value=args[++i];if(!value||value.startsWith('--'))throw Error('INVALID_ARGUMENT');
  switch(flag){
   case '--pilot':options.pilot=value;break;case '--out':options.out=value;break;case '--review':options.review=value;break;case '--env-file':options.envFile=value;break;case '--voice':options.voice=value;break;
   case '--pilot-size':options.pilotSize=Number(value);break;
   case '--limit-items':options.limitItems=Number(value);break;case '--max-calls':options.maxCalls=Number(value);break;case '--max-chars':options.maxChars=Number(value);break;
   default:throw Error('INVALID_ARGUMENT');
  }
 }
 if(![20,50].includes(options.pilotSize))throw Error('INVALID_ARGUMENT');
 if(!seen.has('--pilot'))options.pilot=`content/pilots/eju-${options.pilotSize}-v1.json`;
 if(!seen.has('--out'))options.out=`artifacts/audio/eju-${options.pilotSize}-v1`;
 if(!seen.has('--review'))options.review=`content/reviews/eju-${options.pilotSize}-text.json`;
 if(!seen.has('--limit-items'))options.limitItems=options.pilotSize;
 if((seen.has('--generate')&&seen.has('--dry-run'))||!Number.isInteger(options.limitItems)||options.limitItems<1||options.limitItems>options.pilotSize||!/^ja-JP-[A-Za-z]+Neural$/.test(options.voice))throw Error('INVALID_ARGUMENT');
 if(options.generate&&(!Number.isSafeInteger(options.maxCalls)||options.maxCalls!<0||!Number.isSafeInteger(options.maxChars)||options.maxChars!<0))throw Error('EXPLICIT_BUDGET_REQUIRED');
 return options;
}
export function requireTextReview(items:{textStatus:string}[],review:{itemsSha256:string;verdict:string}){
 if(items.some(i=>i.textStatus!=='ai_passed')||review.verdict!=='pass')throw Error('TEXT_REVIEW_REQUIRED');
 if(createHash('sha256').update(JSON.stringify(items)).digest('hex')!==review.itemsSha256)throw Error('TEXT_REVIEW_STALE');
}
export async function main(args:string[],env:NodeJS.ProcessEnv=process.env){
 const options=parseArgs(args);const pilot=JSON.parse(await readFile(options.pilot,'utf8'));
 if(!Array.isArray(pilot.items)||pilot.items.length!==options.pilotSize)throw Error('PILOT_SIZE_MISMATCH');
 const requests=buildRequests({items:pilot.items.slice(0,options.limitItems)}).map(r=>({...r,voice:options.voice}));
 if(!options.generate)return runBatch(requests,{dir:options.out});
 const review=JSON.parse(await readFile(options.review,'utf8'));requireTextReview(pilot.items,review);
 // Read only the two required keys; never execute a shell configuration file.
 const fromFile=options.envFile?parseEnv(await readFile(options.envFile,'utf8')):{};
 const endpoint=fromFile.AZURE_ENDPOINT??env.AZURE_ENDPOINT;const key=fromFile.AZURE_KEY??env.AZURE_KEY;
 if(!endpoint||!key)throw Error('AZURE_CREDENTIALS_MISSING');
 const provider=azureProvider(endpoint,key);const voices=await availableVoices(endpoint,key);
 if(!voices.includes(options.voice))throw Error('AZURE_VOICE_UNAVAILABLE');
 return runBatch(requests,{dir:options.out,generate:true,maxCalls:options.maxCalls,maxChars:options.maxChars,provider});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
  // Never print provider response bodies, URLs, env content or a raw stack trace.
  const message=error instanceof Error&&/^[A-Z][A-Z_]+$/.test(error.message)?error.message:'CONTENT_BUILD_FAILED';
  console.error(message);process.exitCode=1;
 });
}
