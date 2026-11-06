import {it,expect} from 'vitest';import fs from 'node:fs';import {parseBundle} from '../../src/content/loader';
const bundle=()=>{const b=JSON.parse(fs.readFileSync('public/content/development.json','utf8'));b.purpose='development_only';delete b.humanAudioReview;for(const a of b.assets)a.status='development_only';return b;};
it('accepts the development sample with honest quality status',()=>{expect(parseBundle(bundle()).purpose).toBe('development_only');});
it('rejects incompatible schema before rendering',()=>{expect(()=>parseBundle({...bundle(),schemaVersion:2})).toThrow('INVALID_CONTENT');});
it('rejects a missing audio reference',()=>{const b=bundle();b.assets.pop();expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');});
it('rejects audio assigned to a different item',()=>{const b=bundle();b.assets[0].itemId='different';expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');});
it('rejects duplicate learning IDs',()=>{const b=bundle();b.items[1].id=b.items[0].id;expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');});
it('does not label an unreviewed fixture as approved',()=>{const b=bundle();b.assets[0].status='ai_passed';expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');});

function humanAcceptedBundle(){
 const b=bundle();b.purpose='personal_study';for(const a of b.assets)a.status='human_accepted';
 b.humanAudioReview={id:'user-listening-2026-11-05',method:'human_listening',reviewer:'user',reviewedOn:'2026-11-05',statement:'包含词语和例句，共10段音频，效果可以接受',assets:b.assets.map((a:any)=>({id:a.id,sha256:a.sha256}))};
 return b;
}
it('accepts personal-study audio only with matching human listening evidence',()=>{
 expect(parseBundle(humanAcceptedBundle()).purpose).toBe('personal_study');
});
it('rejects human-approved audio without the actual review record',()=>{
 const b=humanAcceptedBundle();delete b.humanAudioReview;expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');
});
it('rejects a replaced audio file whose hash no longer matches the human review',()=>{
 const b=humanAcceptedBundle();b.assets[0].sha256='0'.repeat(64);expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');
});
it('rejects a personal-study pack when one example has not been included in listening review',()=>{
 const b=humanAcceptedBundle();b.humanAudioReview.assets.pop();expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');
});

it('rejects units that duplicate, omit or reorder learning items',()=>{
 for(const kind of ['duplicate','missing','reordered','empty']){
  const b=bundle();b.units=[{id:'u1',title:'单元',goal:'理解',itemIds:b.items.map((i:any)=>i.id)}];
  if(kind==='duplicate')b.units[0].itemIds[1]=b.units[0].itemIds[0];
  if(kind==='missing')b.units[0].itemIds.pop();
  if(kind==='reordered')b.units[0].itemIds.reverse();
  if(kind==='empty')b.units=[];
  expect(()=>parseBundle(b)).toThrow('INVALID_CONTENT');
 }
});
it('accepts a complete ordered partition into units',()=>{
 const b=bundle();b.units=[{id:'u1',title:'一',goal:'理解',itemIds:b.items.slice(0,2).map((i:any)=>i.id)},{id:'u2',title:'二',goal:'理解',itemIds:b.items.slice(2).map((i:any)=>i.id)}];expect(parseBundle(b).items).toHaveLength(5);
});
it('loads the current version through a local manifest pointer and refuses mismatch',async()=>{
 const {vi}=await import('vitest');const {loadBundle}=await import('../../src/content/loader');const b=humanAcceptedBundle();
 const fetcher=vi.fn(async(url:RequestInfo|URL)=>new Response(JSON.stringify(String(url)==='/content/current.json'?{version:b.version,manifestUrl:'/content/current-test.json'}:b),{status:200}));vi.stubGlobal('fetch',fetcher);
 try{expect((await loadBundle()).version).toBe(b.version);expect(fetcher.mock.calls.map(c=>c[0])).toEqual(['/content/current.json','/content/current-test.json']);
  fetcher.mockImplementation(async(url)=>new Response(JSON.stringify(String(url)==='/content/current.json'?{version:'wrong',manifestUrl:'/content/current-test.json'}:b)));await expect(loadBundle()).rejects.toThrow('CONTENT_VERSION_CONFLICT');
 }finally{vi.unstubAllGlobals();}
});
