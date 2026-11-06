import 'fake-indexeddb/auto';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createLocalProgressStore} from '../../src/sync/storage';
import {effectiveFeedback,type LocalFeedback} from '../../src/learning/local-feedback';
const event:LocalFeedback={eventId:'event-1',itemId:'word-1',mode:'listen',rating:'good',occurredAt:'2026-11-05T13:00:00Z',contentVersion:'dev-1'};
const fresh=()=>{const name=crypto.randomUUID();return {name,store:createLocalProgressStore(name)}};
afterEach(()=>vi.restoreAllMocks());
describe('local progress transaction contract',()=>{
it('saves and recovers the same answer and current card from a new store',async()=>{const {name,store}=fresh();await store.saveFeedback(event,'word-1');expect(await createLocalProgressStore(name).read()).toEqual({schemaVersion:1,contentVersion:'dev-1',cursorItemId:'word-1',feedback:[event]});});
it('deduplicates concurrent clicks',async()=>{const {store}=fresh();await Promise.all([store.saveFeedback(event,'word-1'),store.saveFeedback(event,'word-1')]);expect((await store.read())?.feedback).toHaveLength(1);});
it('rejects a reused ID with changed answer without overwriting',async()=>{const {store}=fresh();await store.saveFeedback(event,'word-1');await expect(store.saveFeedback({...event,rating:'again'},'word-1')).rejects.toThrow('EVENT_ID_CONFLICT');expect((await store.read())?.feedback).toEqual([event]);});
it('advances only after saving and an old retry does not move the cursor back',async()=>{const {store}=fresh();await expect(store.advance('word-1','word-2')).rejects.toThrow('NOT_REVIEWED');await store.saveFeedback(event,'word-1');await store.advance('word-1','word-2');await store.saveFeedback(event,'word-1');expect((await store.read())?.cursorItemId).toBe('word-2');});
it('keeps correction audit but counts only its replacement',async()=>{const {store}=fresh();await store.saveFeedback(event,'word-1');const correction={...event,eventId:'correction',rating:'again' as const,replacesEventId:'event-1'};await store.saveFeedback(correction,'word-1');const p=(await store.read())!;expect(p.feedback).toHaveLength(2);expect(effectiveFeedback(p.feedback)).toEqual([correction]);});
it('rejects invalid or cross-item corrections',async()=>{const {store}=fresh();await store.saveFeedback(event,'word-1');await expect(store.saveFeedback({...event,eventId:'c',itemId:'word-2',replacesEventId:event.eventId},'word-2')).rejects.toThrow('INVALID_CORRECTION');expect((await store.read())?.feedback).toEqual([event]);});
it('rejects correction after leaving the card',async()=>{const {store}=fresh();await store.saveFeedback(event,'word-1');await store.advance('word-1','word-2');await expect(store.saveFeedback({...event,eventId:'c',replacesEventId:event.eventId},'word-1')).rejects.toThrow('INVALID_CORRECTION');});
it('persists a completed group as null cursor',async()=>{const {name,store}=fresh();await store.saveFeedback(event,'word-1');await store.advance('word-1',null);expect((await createLocalProgressStore(name).read())?.cursorItemId).toBeNull();});
it('propagates transaction failure and leaves prior data unchanged',async()=>{const {store}=fresh();await store.saveFeedback(event,'word-1');const spy=vi.spyOn(IDBDatabase.prototype,'transaction').mockImplementation(()=>{throw new DOMException('Disk full','QuotaExceededError')});await expect(store.advance('word-1',null)).rejects.toThrow('Disk full');spy.mockRestore();expect((await store.read())?.cursorItemId).toBe('word-1');});
it('does not mix different content versions',async()=>{const {store}=fresh();await store.saveFeedback(event,'word-1');await expect(store.saveFeedback({...event,eventId:'two',contentVersion:'dev-2'},'word-1')).rejects.toThrow('CONTENT_VERSION_CONFLICT');});
it('rejects malformed feedback without writing',async()=>{const {store}=fresh();await expect(store.saveFeedback({...event,occurredAt:'not a date'},'word-1')).rejects.toThrow('INVALID_FEEDBACK');expect(await store.read()).toBeNull();});
});

it('allows only one original answer when independent tabs submit different event IDs',async()=>{
 const {name,store}=fresh();const other=createLocalProgressStore(name);
 const results=await Promise.allSettled([store.saveFeedback(event,'word-1'),other.saveFeedback({...event,eventId:'tab-2',rating:'again'},'word-1')]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 expect(effectiveFeedback((await store.read())!.feedback)).toHaveLength(1);
});
it('returns the committed snapshot from save and advance without a separate read',async()=>{
 const {store}=fresh();const saved=await store.saveFeedback(event,'word-1');
 expect(saved).toMatchObject({cursorItemId:'word-1',feedback:[event]});
 const advanced=await store.advance('word-1','word-2');
 expect(advanced).toMatchObject({cursorItemId:'word-2',feedback:[event]});
});

it('isolates old progress and two new units in the same database and restores each independently',async()=>{
 const name=crypto.randomUUID();const old=createLocalProgressStore(name);const one=createLocalProgressStore(name,'content:new:u01');const two=createLocalProgressStore(name,'content:new:u02');
 await old.saveFeedback(event,event.itemId);const before=await old.read();
 await one.saveFeedback({...event,eventId:'new-1',contentVersion:'new'},event.itemId);
 await two.saveFeedback({...event,eventId:'new-2',itemId:'other',contentVersion:'new',rating:'again'},'other');
 await one.advance(event.itemId,null);
 expect(await old.read()).toEqual(before);
 expect(await createLocalProgressStore(name,'content:new:u01').read()).toMatchObject({contentVersion:'new',cursorItemId:null,feedback:[{eventId:'new-1'}]});
 expect(await createLocalProgressStore(name,'content:new:u02').read()).toMatchObject({cursorItemId:'other',feedback:[{eventId:'new-2',rating:'again'}]});
});
