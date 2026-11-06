import {afterEach, describe, expect, it} from 'vitest';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {speechUrls, makeSsml, requestKey, buildRequests, runBatch, checkAudio, type AudioRequest} from '../../scripts/content/azure-audio.ts';
const dirs:string[]=[];
async function dir(){const d=await mkdtemp(join(tmpdir(),'eju-audio-'));dirs.push(d);return d;}
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true})));});
const request:AudioRequest={text:'調査の結果を分析します。',voice:'ja-JP-NanamiNeural',rate:'0%',format:'audio-24khz-96kbitrate-mono-mp3'};
const fixture=()=>readFile(new URL('../../public/audio/eju-03-004-a-listen.mp3',import.meta.url));
// Removing allowlisting, escaping, atomic budget writes or cache integrity checks must break these tests.
describe('Azure request boundary',()=>{
 it('normalizes supported Azure endpoint forms',()=>{
 expect(speechUrls('https://japaneast.api.cognitive.microsoft.com/').synthesis).toBe('https://japaneast.tts.speech.microsoft.com/cognitiveservices/v1');
 expect(speechUrls('https://my-speech.cognitiveservices.azure.com/').voices).toBe('https://my-speech.cognitiveservices.azure.com/tts/cognitiveservices/voices/list');
 expect(speechUrls('https://japaneast.tts.speech.microsoft.com/cognitiveservices/v1').synthesis).toBe('https://japaneast.tts.speech.microsoft.com/cognitiveservices/v1');
 });
 it.each(['https://evil.example','http://japaneast.tts.speech.microsoft.com','https://japaneast.tts.speech.microsoft.com.evil.test','https://user:pass@japaneast.tts.speech.microsoft.com','https://japaneast.tts.speech.microsoft.com/?key=secret','https://japaneast.tts.speech.microsoft.com/unexpected'])('rejects unsafe endpoint %s',(url)=>expect(()=>speechUrls(url)).toThrow('AZURE_ENDPOINT_INVALID'));
 it('treats authored text as text rather than SSML markup',()=>expect(makeSsml({...request,text:'A&B <break/> "はい"'})).toContain('A&amp;B &lt;break/&gt; &quot;はい&quot;'));
 it('reuses text across item roles but invalidates changed voice or text',()=>{
 expect(requestKey({...request})).toBe(requestKey(request));
 expect(requestKey({...request,text:'分析'})).not.toBe(requestKey(request));
 expect(requestKey({...request,voice:'ja-JP-KeitaNeural'})).not.toBe(requestKey(request));
 });
 it('creates two roles per unique item and rejects duplicate identity',()=>{
 const item={id:'a',listenText:'分析',exampleJa:'結果を分析します。',textStatus:'ai_passed'};
 expect(buildRequests({items:[item]}).map(x=>x.role)).toEqual(['listen','example']);
 expect(()=>buildRequests({items:[item,item]})).toThrow('DUPLICATE_ITEM');
 });
});
describe('bounded generation and real audio integrity',()=>{
 it('dry run needs no key and makes no synthesis request',async()=>{
 const d=await dir();const result=await runBatch([request],{dir:d});
 expect(result).toMatchObject({mode:'dry-run',requests:1,missing:1,cached:0});
 });
 it('rejects exhausted budget before contacting provider',async()=>{
 await expect(runBatch([request],{dir:await dir(),generate:true,maxCalls:0,maxChars:1000,provider:async()=>{throw Error('SHOULD_NOT_CALL');}})).rejects.toThrow('BUDGET_EXHAUSTED');
 });
 it('persists a failed attempt and prevents a restart from spending again',async()=>{
 const d=await dir();const options={dir:d,generate:true,maxCalls:1,maxChars:1000,provider:async()=>{throw Error('provider secret detail');}};
 await expect(runBatch([request],options)).rejects.toThrow('SYNTHESIS_FAILED');
 const ledger=JSON.parse(await readFile(join(d,'run-ledger.json'),'utf8'));expect(ledger.calls).toBe(1);
 await expect(runBatch([request],options)).rejects.toThrow('BUDGET_EXHAUSTED');
 });
 it('enforces character budget as well as call budget',async()=>{
 await expect(runBatch([request],{dir:await dir(),generate:true,maxCalls:2,maxChars:1,provider:fixture})).rejects.toThrow('BUDGET_EXHAUSTED');
 });
 it('decodes actual audio, caches duplicate text and regenerates a corrupt asset',async()=>{
 const d=await dir();const options={dir:d,generate:true,maxCalls:2,maxChars:1000,provider:fixture};
 const first=await runBatch([request,request],options);expect(first).toMatchObject({generated:1,cached:1});
 const again=await runBatch([request],options);expect(again).toMatchObject({generated:0,cached:1});
 const manifest=JSON.parse(await readFile(join(d,'candidate-manifest.json'),'utf8'));
 expect(manifest.assets[0].status).toBe('pending_listening_review');
 await writeFile(join(d,manifest.assets[0].file),'corrupt');
 expect(await runBatch([request],options)).toMatchObject({generated:1,cached:0});
 });
 it('prevents concurrent batches sharing a ledger',async()=>{
 const d=await dir();let release!:(x:Uint8Array)=>void;let started!:()=>void;
 const ready=new Promise<void>(r=>started=r);const audio=new Promise<Uint8Array>(r=>release=r);
 const options={dir:d,generate:true,maxCalls:2,maxChars:1000,provider:async()=>{started();return audio;}};
 const first=runBatch([request],options);await Promise.race([ready,first]);
 await expect(runBatch([request],options)).rejects.toThrow('BATCH_LOCKED');
 release(await fixture());await first;
 });
 it('rejects empty and malformed bytes but decodes an actual existing MP3',async()=>{
 await expect(checkAudio(new Uint8Array())).rejects.toThrow('AUDIO_INVALID');
 await expect(checkAudio(new TextEncoder().encode('not audio'))).rejects.toThrow('AUDIO_INVALID');
 expect((await checkAudio(await fixture())).durationMs).toBeGreaterThan(200);
 });
});

it('rejects a truncated MP3 instead of caching the decoded prefix',async()=>{
 const bytes=await fixture();await expect(checkAudio(bytes.subarray(0,Math.floor(bytes.length*.6)))).rejects.toThrow('AUDIO_INVALID');
});
it('does not allow a restart to silently raise approved budget',async()=>{
 const d=await dir();await runBatch([request],{dir:d,generate:true,maxCalls:1,maxChars:1000,provider:fixture});
 await expect(runBatch([request],{dir:d,generate:true,maxCalls:2,maxChars:1000,provider:fixture})).rejects.toThrow('BUDGET_CHANGE_REQUIRES_REVIEW');
});
it('stops after initial attempt and two retries even if total budget remains',async()=>{
 const d=await dir();const options={dir:d,generate:true,maxCalls:10,maxChars:10000,provider:async()=>{throw Error('fail');}};
 for(let i=0;i<3;i++)await expect(runBatch([request],options)).rejects.toThrow('SYNTHESIS_FAILED');
 await expect(runBatch([request],options)).rejects.toThrow('RETRY_LIMIT');
});
it('preserves the immutable synthesis request alongside the audio hash for listening audit',async()=>{
 const d=await dir();await runBatch([request],{dir:d,generate:true,maxCalls:1,maxChars:1000,provider:fixture});
 const manifest=JSON.parse(await readFile(join(d,'candidate-manifest.json'),'utf8'));
 expect(manifest.assets[0].request).toEqual({provider:'azure-speech',text:'調査の結果を分析します。',voice:'ja-JP-NanamiNeural',rate:'0%',format:'audio-24khz-96kbitrate-mono-mp3'});
 expect(Number.isFinite(Date.parse(manifest.assets[0].generatedAt))).toBe(true);
});
it('accepts a decodable constant-bitrate MP3 without a Xing duration header',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 const path=join(await dir(),'no-xing.mp3');
 await promisify(execFile)('ffmpeg',['-v','error','-i',new URL('../../public/audio/eju-03-004-a-listen.mp3',import.meta.url).pathname,'-c:a','libmp3lame','-ar','24000','-b:a','96k','-write_xing','0',path]);
 expect((await checkAudio(await readFile(path))).durationMs).toBeGreaterThan(200);
});
it('retains a rejected provider response for diagnosis without another paid request',async()=>{
 const d=await dir();const bytes=new TextEncoder().encode('bad response');
 await expect(runBatch([request],{dir:d,generate:true,maxCalls:1,maxChars:1000,provider:async()=>bytes})).rejects.toThrow('AUDIO_INVALID');
 expect(await readFile(join(d,'rejected',`${requestKey(request)}-1.bin`))).toEqual(Buffer.from(bytes));
});
it('reports spent budget for generation and zero for a fully cached rerun',async()=>{
 const options={dir:await dir(),generate:true,maxCalls:1,maxChars:1000,provider:fixture};
 expect((await runBatch([request],options)).budgetUnits).toBeGreaterThan(0);
 expect((await runBatch([request],options)).budgetUnits).toBe(0);
});
