import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {ContentBundle} from '../../src/domain/contracts.ts';
import {parseBundle} from '../../src/content/loader.ts';
import {buildRequests,requestKey,checkAudio} from './azure-audio.ts';
import {requireTextReview} from './generate-pilot.ts';
const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export function buildStudyBundle({pilot,manifestBytes,humanReview,textReview}:{pilot:any;manifestBytes:Uint8Array;humanReview:any;textReview:any}):ContentBundle{
 requireTextReview(pilot.items,textReview);
 if(humanReview?.status!=='human_accepted'||humanReview.method!=='human_listening'||humanReview.reviewer!=='user')throw Error('HUMAN_REVIEW_REQUIRED');
 if(humanReview.manifestSha256!==hash(manifestBytes)||humanReview.itemsSha256!==hash(JSON.stringify(pilot.items)))throw Error('HUMAN_REVIEW_STALE');
 const m=JSON.parse(Buffer.from(manifestBytes).toString());const requests=buildRequests(pilot);
 if(!Array.isArray(m.assets)||!Array.isArray(m.references)||m.assets.length!==requests.length||m.references.length!==requests.length)throw Error('AUDIO_MAPPING_INVALID');
 if(!Array.isArray(humanReview.assets)||humanReview.assets.length!==requests.length||new Set(humanReview.assets.map((a:any)=>a.id)).size!==requests.length)throw Error('HUMAN_REVIEW_INVALID');
 const assets=requests.map(r=>{
  const key=requestKey(r);const a=m.assets.find((a:any)=>a.requestKey===key);const ref=m.references.find((x:any)=>x.itemId===r.itemId&&x.role===r.role);
  if(!a||ref?.requestKey!==key||requestKey(a.request)!==key||a.file!==`audio/${a.sha256}.mp3`||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('AUDIO_MAPPING_INVALID');
  if(!humanReview.assets.some((h:any)=>h.id===key&&h.sha256===a.sha256))throw Error('HUMAN_REVIEW_INVALID');
  return {id:key,itemId:r.itemId!,role:r.role as 'listen'|'example',url:`/${a.file}`,sha256:a.sha256,status:'human_accepted' as const};
 });
 const items=pilot.items.map((i:any)=>({id:i.id,kind:i.kind,surface:i.surface,reading:i.reading,baseForm:i.baseForm,meaningZh:i.meaningZh,exampleJa:i.exampleJa,exampleZh:i.exampleZh,noteZh:i.noteZh,topic:i.categoryIds.map((id:string)=>pilot.categories.find((c:any)=>c.id===id)?.label||id).join(' / '),sources:i.sources,categoryIds:i.categoryIds,audio:{listen:assets.find(a=>a.itemId===i.id&&a.role==='listen')!.id,example:assets.find(a=>a.itemId===i.id&&a.role==='example')!.id}}));
 return parseBundle({schemaVersion:1,version:pilot.id,purpose:'personal_study',units:pilot.units,categories:pilot.categories,humanAudioReview:{id:humanReview.id,method:humanReview.method,reviewer:humanReview.reviewer,reviewedOn:humanReview.reviewedOn,statement:humanReview.statement,assets:humanReview.assets.map((a:any)=>({id:a.id,sha256:a.sha256}))},items,assets});
}
async function exportReviewed(){
 const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));const dir='artifacts/audio/eju-50-v1';
 const bundle=buildStudyBundle({pilot:await read('content/pilots/eju-50-v1.json'),manifestBytes:await readFile(`${dir}/candidate-manifest.json`),humanReview:await read('content/reviews/eju-50-human-listening-2026-11-06.json'),textReview:await read('content/reviews/eju-50-text.json')});
 if(bundle.version!=='eju-50-v1'||bundle.items.length!==50||bundle.units?.length!==5)throw Error('UNEXPECTED_BUNDLE');
 const contentPath=`public/content/${bundle.version}.json`,serialized=JSON.stringify(bundle,null,2)+'\n';
 try{if(await readFile(contentPath,'utf8')!==serialized)throw Error('CONTENT_VERSION_IMMUTABLE');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const files=[];for(const a of bundle.assets){const bytes=await readFile(`${dir}${a.url}`);if(hash(bytes)!==a.sha256)throw Error('AUDIO_HASH_MISMATCH');await checkAudio(bytes);files.push({url:a.url,bytes});}
 if(files.reduce((n,f)=>n+f.bytes.length,0)>500_000_000)throw Error('AUDIO_BUDGET');
 await mkdir('public/audio',{recursive:true});await mkdir('public/content',{recursive:true});
 for(const f of files){await writeFile(`public${f.url}.tmp`,f.bytes);await rename(`public${f.url}.tmp`,`public${f.url}`);}
 await writeFile(`${contentPath}.tmp`,serialized);await rename(`${contentPath}.tmp`,contentPath);
 await writeFile('public/content/current.json.tmp',JSON.stringify({version:bundle.version,manifestUrl:`/content/${bundle.version}.json`},null,2)+'\n');await rename('public/content/current.json.tmp','public/content/current.json');
 console.log(JSON.stringify({items:bundle.items.length,units:bundle.units.length,audioFiles:files.length,bytes:files.reduce((n,f)=>n+f.bytes.length,0),humanAudioReview:bundle.humanAudioReview?.id,deployed:false},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)exportReviewed().catch(e=>{console.error(e instanceof Error?e.message:'EXPORT_FAILED');process.exitCode=1;});
