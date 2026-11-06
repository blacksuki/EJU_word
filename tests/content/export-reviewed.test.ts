import {it,expect} from 'vitest';import {createHash} from 'node:crypto';import {buildRequests,requestKey} from '../../scripts/content/azure-audio.ts';import {buildStudyBundle} from '../../scripts/content/export-reviewed.ts';
const digest=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
function fixture(){
 const item={id:'one',kind:'word',surface:'分析',reading:'ぶんせき',baseForm:'分析',meaningZh:'分析',exampleJa:'結果を分析します。',exampleZh:'分析结果。',noteZh:'',sources:[],categoryIds:['research'],textStatus:'ai_passed',listenText:'分析'};
 const pilot={id:'test-v1',items:[item],units:[{id:'u01',title:'研究',goal:'理解',itemIds:['one']}],categories:[{id:'research',label:'研究'}]};
 const requests=buildRequests(pilot);const manifest={assets:requests.map((r,n)=>({requestKey:requestKey(r),request:{...r,provider:'azure-speech'},sha256:String(n+1).repeat(64),file:`audio/${String(n+1).repeat(64)}.mp3`})),references:requests.map(r=>({itemId:r.itemId,role:r.role,requestKey:requestKey(r)}))};const manifestBytes=Buffer.from(JSON.stringify(manifest));
 const humanReview={id:'human',method:'human_listening',reviewer:'user',reviewedOn:'2026-11-06',statement:'听审完成符合要求',status:'human_accepted',manifestSha256:digest(manifestBytes),itemsSha256:digest(JSON.stringify(pilot.items)),assets:manifest.assets.map(a=>({id:a.requestKey,sha256:a.sha256}))};
 const textReview={verdict:'pass',itemsSha256:digest(JSON.stringify(pilot.items))};return {pilot,manifestBytes,humanReview,textReview};
}
it('builds a browser bundle with ordered units and reviewed hash URLs',()=>{const b=buildStudyBundle(fixture());expect(b.version).toBe('test-v1');expect(b.items[0].topic).toBe('研究');expect(b.assets).toHaveLength(2);expect(b.assets[0].url).toBe('/audio/'+ '1'.repeat(64)+'.mp3');expect(b.purpose).toBe('personal_study');});
it('rejects changed text even if old human approval still says accepted',()=>{const f=fixture();f.pilot.items[0].exampleJa='別の例文です。';expect(()=>buildStudyBundle(f)).toThrow('TEXT_REVIEW_STALE');});
it('rejects a modified generation manifest without matching human approval',()=>{const f=fixture();f.manifestBytes=Buffer.from(f.manifestBytes.toString()+' ');expect(()=>buildStudyBundle(f)).toThrow('HUMAN_REVIEW_STALE');});
it('rejects a missing or changed reviewed audio hash',()=>{for(const mutation of ['missing','hash']){const f=fixture();if(mutation==='missing')f.humanReview.assets.pop();else f.humanReview.assets[0].sha256='0'.repeat(64);expect(()=>buildStudyBundle(f)).toThrow('HUMAN_REVIEW_INVALID');}});
it('does not accept unreviewed audio or a request referencing different text',()=>{
 const f=fixture();f.humanReview.status='pending_listening_review';expect(()=>buildStudyBundle(f)).toThrow('HUMAN_REVIEW_REQUIRED');
 const g=fixture();const m=JSON.parse(g.manifestBytes.toString());m.assets[0].request.text='別の単語';g.manifestBytes=Buffer.from(JSON.stringify(m));g.humanReview.manifestSha256=digest(g.manifestBytes);expect(()=>buildStudyBundle(g)).toThrow('AUDIO_MAPPING_INVALID');
});
