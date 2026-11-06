import type {ContentBundle} from '../domain/contracts';
export function parseBundle(data:unknown):ContentBundle{
 const b=data as ContentBundle;const bad=()=>{throw new Error('INVALID_CONTENT');};
 if(!b||b.schemaVersion!==1||!['development_only','personal_study'].includes(b.purpose)||typeof b.version!=='string'||!Array.isArray(b.items)||!b.items.length||!Array.isArray(b.assets))return bad();
 if(b.items.some(i=>!i)||b.assets.some(a=>!a))return bad();
 if(new Set(b.items.map(i=>i.id)).size!==b.items.length||new Set(b.assets.map(a=>a.id)).size!==b.assets.length)return bad();
 const humanAccepted=b.purpose==='personal_study';
 if(humanAccepted){
  const r=b.humanAudioReview;
  if(!r||typeof r.id!=='string'||!r.id||r.method!=='human_listening'||r.reviewer!=='user'||typeof r.statement!=='string'||!r.statement.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(r.reviewedOn)||!Array.isArray(r.assets))return bad();
  if(r.assets.length!==b.assets.length||new Set(r.assets.map(a=>a?.id)).size!==r.assets.length)return bad();
  for(const a of b.assets){
   if(a.status!=='human_accepted'||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256)||!r.assets.some(e=>e?.id===a.id&&e.sha256===a.sha256))return bad();
  }
 }
 for(const i of b.items){
  if(!['id','surface','reading','meaningZh','exampleJa','exampleZh','topic'].every(k=>typeof (i as unknown as Record<string,unknown>)[k]==='string')||!i.audio||!Array.isArray(i.sources))return bad();
  for(const role of ['listen','example'] as const){const a=b.assets.find(x=>x.id===i.audio[role]);if(!a||a.itemId!==i.id||a.role!==role||a.status!==(humanAccepted?'human_accepted':'development_only')||typeof a.url!=='string'||!a.url.startsWith('/audio/'))return bad();}
 }
 if(b.units!==undefined){
  if(!Array.isArray(b.units)||!b.units.length||new Set(b.units.map(u=>u?.id)).size!==b.units.length)return bad();
  for(const u of b.units)if(!u||![u.id,u.title,u.goal].every(v=>typeof v==='string'&&v.trim())||!Array.isArray(u.itemIds)||!u.itemIds.length)return bad();
  const ids=b.units.flatMap(u=>u.itemIds);if(ids.length!==b.items.length||ids.some((id,n)=>id!==b.items[n].id))return bad();
 }
 return b;
}
export async function loadBundle(selection:'current'|'legacy'='current'):Promise<ContentBundle>{
 async function get(url:string){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('CONTENT_UNAVAILABLE');return response.json();}
 if(selection==='legacy')return parseBundle(await get('/content/development.json'));
 const pointer=await get('/content/current.json');
 if(!pointer||typeof pointer.version!=='string'||typeof pointer.manifestUrl!=='string'||!/^\/content\/[a-z0-9-]+\.json$/.test(pointer.manifestUrl))throw Error('INVALID_CONTENT_POINTER');
 const bundle=parseBundle(await get(pointer.manifestUrl));if(bundle.version!==pointer.version)throw Error('CONTENT_VERSION_CONFLICT');return bundle;
}
