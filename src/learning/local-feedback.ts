export type Rating = 'again'|'good';
export type LocalFeedback = {eventId:string;itemId:string;mode:'listen';rating:Rating;occurredAt:string;contentVersion:string;replacesEventId?:string};
export type LocalProgress = {schemaVersion:1;contentVersion:string;cursorItemId:string|null;feedback:LocalFeedback[]};
export function effectiveFeedback(events:LocalFeedback[]):LocalFeedback[]{
 const replaced=new Set(events.map(e=>e.replacesEventId).filter(Boolean));
 return events.filter(e=>!replaced.has(e.eventId));
}
export function validFeedback(e:unknown):e is LocalFeedback {
 if(!e||typeof e!=='object')return false;
 const x=e as LocalFeedback;
 return ['eventId','itemId','contentVersion'].every(k=>typeof x[k as keyof LocalFeedback]==='string'&&String(x[k as keyof LocalFeedback]).trim().length>0)&&x.mode==='listen'&&['again','good'].includes(x.rating)&&typeof x.occurredAt==='string'&&Number.isFinite(Date.parse(x.occurredAt))&&(x.replacesEventId===undefined||typeof x.replacesEventId==='string');
}
export function parseProgress(value:unknown):LocalProgress|null {
 if(value===undefined||value===null)return null;
 const p=value as LocalProgress;
 if(p.schemaVersion!==1||typeof p.contentVersion!=='string'||!(p.cursorItemId===null||typeof p.cursorItemId==='string')||!Array.isArray(p.feedback)||!p.feedback.every(validFeedback))throw new Error('INVALID_STORED_PROGRESS');
 return p;
}
