import {effectiveFeedback,parseProgress,validFeedback,type LocalFeedback,type LocalProgress} from '../learning/local-feedback';
function sameEvent(a:LocalFeedback,b:LocalFeedback){return (['eventId','itemId','mode','rating','occurredAt','contentVersion','replacesEventId'] as const).every(k=>a[k]===b[k]);}
export function createLocalProgressStore(dbName:string,progressKey='current'){
 function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const req=indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('progress');
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  req.onblocked=()=>reject(new Error('DATABASE_BLOCKED'));
 });}
 async function transact(mode:IDBTransactionMode,update?:(p:LocalProgress|null)=>LocalProgress):Promise<LocalProgress|null>{
  const db=await open();
  return new Promise((resolve,reject)=>{
   let transaction:IDBTransaction;
   try{transaction=db.transaction('progress',mode);}catch(e){db.close();reject(e);return;}
   let result:LocalProgress|null=null;let failure:unknown;
   transaction.oncomplete=()=>{db.close();resolve(result);};
   transaction.onabort=()=>{db.close();reject(failure||transaction.error||new Error('SAVE_FAILED'));};
   const store=transaction.objectStore('progress');const request=store.get(progressKey);
   request.onsuccess=()=>{try{result=parseProgress(request.result);if(update){result=update(result);store.put(result,progressKey);}}catch(e){failure=e;transaction.abort();}};
  });
 }
 return {
  read:()=>transact('readonly'),
  async saveFeedback(event:LocalFeedback,cursorItemId:string|null):Promise<LocalProgress>{
   if(!validFeedback(event)||cursorItemId!==event.itemId)throw new Error('INVALID_FEEDBACK');
   const result=await transact('readwrite',current=>{
    const p=current||{schemaVersion:1 as const,contentVersion:event.contentVersion,cursorItemId,feedback:[]};
    const previous=p.feedback.find(e=>e.eventId===event.eventId);
    if(previous){if(!sameEvent(previous,event))throw new Error('EVENT_ID_CONFLICT');return p;}
    if(p.contentVersion!==event.contentVersion)throw new Error('CONTENT_VERSION_CONFLICT');
    const active=effectiveFeedback(p.feedback);
    if(event.replacesEventId){
     const target=active.find(e=>e.eventId===event.replacesEventId);
     if(!target||target.itemId!==event.itemId||target.mode!==event.mode||p.cursorItemId!==event.itemId)throw new Error('INVALID_CORRECTION');
    }else {
     if(current&&p.cursorItemId!==event.itemId)throw new Error('CURSOR_CONFLICT');
     if(active.some(e=>e.itemId===event.itemId&&e.mode===event.mode))throw new Error('ALREADY_REVIEWED');
    }
    return {...p,cursorItemId,feedback:[...p.feedback,event]};
   });
   return result!;
  },
  async advance(currentItemId:string,nextItemId:string|null):Promise<LocalProgress>{
   const result=await transact('readwrite',p=>{
    if(!p||p.cursorItemId!==currentItemId||!effectiveFeedback(p.feedback).some(e=>e.itemId===currentItemId))throw new Error('NOT_REVIEWED');
    return {...p,cursorItemId:nextItemId};
   });
   return result!;
  }
 };
}
