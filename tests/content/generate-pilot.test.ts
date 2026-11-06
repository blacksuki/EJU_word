import {describe,it,expect} from 'vitest';
import {parseArgs,requireTextReview} from '../../scripts/content/generate-pilot.ts';
import {createHash} from 'node:crypto';
describe('generation entry point',()=>{
 it('defaults to a plan and never defaults to paid generation',()=>expect(parseArgs([])).toMatchObject({generate:false,limitItems:20}));
 it('requires explicit call and character ceilings for generation',()=>expect(()=>parseArgs(['--generate'])).toThrow('EXPLICIT_BUDGET_REQUIRED'));
 it('rejects unknown or ambiguous switches',()=>{
 expect(()=>parseArgs(['--genrate'])).toThrow('INVALID_ARGUMENT');
 expect(()=>parseArgs(['--generate','--dry-run','--max-calls','40','--max-chars','20000'])).toThrow('INVALID_ARGUMENT');
 expect(()=>parseArgs(['--limit-items','50'])).toThrow('INVALID_ARGUMENT');
 });
 it('accepts an explicitly bounded two-item sample',()=>expect(parseArgs(['--generate','--limit-items','2','--max-calls','4','--max-chars','3000'])).toMatchObject({generate:true,limitItems:2,maxCalls:4,maxChars:3000}));
 it('blocks draft and changed text even if a previous review passed',()=>{
 const items=[{id:'one',textStatus:'draft',exampleJa:'調査します。'}];
 const sha=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 expect(()=>requireTextReview(items,{itemsSha256:sha(items),verdict:'pass'})).toThrow('TEXT_REVIEW_REQUIRED');
 items[0].textStatus='ai_passed';const review={itemsSha256:sha(items),verdict:'pass'};
 expect(()=>requireTextReview(items,review)).not.toThrow();
 items[0].exampleJa='変更しました。';expect(()=>requireTextReview(items,review)).toThrow('TEXT_REVIEW_STALE');
 });
});

describe('explicit 50-item expansion',()=>{
 it('selects all 50 items and their own output and review paths regardless of argument order',()=>{
  expect(parseArgs(['--pilot-size','50'])).toMatchObject({limitItems:50,pilot:'content/pilots/eju-50-v1.json',out:'artifacts/audio/eju-50-v1',review:'content/reviews/eju-50-text.json',generate:false});
  expect(parseArgs(['--limit-items','30','--pilot-size','50'])).toEqual(parseArgs(['--pilot-size','50','--limit-items','30']));
 });
 it('keeps custom paths while rejecting unsupported sizes and out-of-batch limits',()=>{
  expect(parseArgs(['--pilot-size','50','--out','custom-cache'])).toMatchObject({out:'custom-cache'});
  expect(()=>parseArgs(['--pilot-size','30'])).toThrow('INVALID_ARGUMENT');
  expect(()=>parseArgs(['--pilot-size','50','--limit-items','51'])).toThrow('INVALID_ARGUMENT');
 });
 it('previews 100 requests through the actual entry point without credentials',async()=>{
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {main}=await import('../../scripts/content/generate-pilot.ts');
  const dir=await mkdtemp(join(tmpdir(),'eju-50-cli-'));try{
   const file=join(dir,'pilot.json');await writeFile(file,JSON.stringify({items:Array.from({length:50},(_,i)=>({id:`item-${i}`,listenText:`単語${i}`,exampleJa:`例文${i}です。`,textStatus:'draft'}))}));
   expect(await main(['--pilot-size','50','--pilot',file,'--out',join(dir,'cache')],{})).toMatchObject({mode:'dry-run',requests:100,uniqueRequests:100,missing:100,generated:0});
   await expect(main(['--pilot',file,'--out',join(dir,'cache')],{})).rejects.toThrow('PILOT_SIZE_MISMATCH');
  }finally{await rm(dir,{recursive:true,force:true});}
 });
});
