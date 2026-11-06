import {useRef,useState} from 'react';
import type {ContentBundle,StudyUnit} from '../domain/contracts';
import {effectiveFeedback,type LocalFeedback,type LocalProgress,type Rating} from './local-feedback';
import {createLocalProgressStore} from '../sync/storage';
import {StudyCard} from './StudyCard';
type Store=ReturnType<typeof createLocalProgressStore>;
export function StudySession({bundle,unit,progress,store,legacy,onProgress,onBack,onSelectUnit,onNextUnit}:{bundle:ContentBundle;unit:StudyUnit;progress:LocalProgress|null;store:Store;legacy:boolean;onProgress:(p:LocalProgress|null)=>void;onBack:()=>void;onSelectUnit:(id:string)=>void;onNextUnit?:()=>void}){
 const [error,setError]=useState(''),[fatal,setFatal]=useState(''),[busy,setBusy]=useState(false),[replayIndex,setReplayIndex]=useState<number|null>(null);
 const lock=useRef(false),pending=useRef<LocalFeedback|null>(null);
 const items=unit.itemIds.map(id=>bundle.items.find(i=>i.id===id)!);const effective=effectiveFeedback(progress?.feedback||[]);
 const finished=progress!==null&&progress.cursorItemId===null;
 const item=replayIndex!==null?items[replayIndex]:items.find(i=>i.id===(progress?.cursorItemId||items[0].id));const answer=effective.find(e=>e.itemId===item?.id);
 async function recoverConflict(cause:unknown){
  if(!(cause instanceof Error)||!['ALREADY_REVIEWED','CURSOR_CONFLICT','INVALID_CORRECTION','NOT_REVIEWED'].includes(cause.message))return false;
  try{onProgress(await store.read());pending.current=null;setError('记录已在另一页面更新，已重新读取当前进度。');}
  catch{setFatal('另一页面已更新记录，但暂时无法重新读取。请重新读取，已有记录不会被清除。');}return true;
 }
 async function rate(rating:Rating){
  if(replayIndex!==null||lock.current||!item)return;lock.current=true;setBusy(true);setError('');
  const retry=pending.current?.itemId===item.id&&pending.current.rating===rating?pending.current:null;
  const event=retry||{eventId:crypto.randomUUID(),itemId:item.id,mode:'listen' as const,rating,occurredAt:new Date().toISOString(),contentVersion:bundle.version,...(answer?{replacesEventId:answer.eventId}:{})};pending.current=event;
  try{onProgress(await store.saveFeedback(event,item.id));pending.current=null;}catch(cause){if(!await recoverConflict(cause))setError('未能确认保存，请重试。本项还没有离开，已有记录会保留。');}finally{lock.current=false;setBusy(false);}
 }
 async function next(){
  if(lock.current||pending.current||!item)return;lock.current=true;setBusy(true);setError('');
  try{onProgress(await store.advance(item.id,items[items.indexOf(item)+1]?.id||null));}catch(cause){if(!await recoverConflict(cause))setError('未能保存学习位置，请重试。');}finally{lock.current=false;setBusy(false);}
 }
 if(fatal)return <section className="study-card"><p role="alert">{fatal}</p><button onClick={()=>location.reload()}>重新读取</button></section>;
 return <>
 {!legacy&&<section className="unit-navigation" aria-label="单元导航"><label className="unit-picker">选择学习单元<select value={unit.id} disabled={busy||pending.current!==null} onChange={event=>{if(!lock.current&&!pending.current)onSelectUnit(event.target.value);}}>{bundle.units!.map((u,n)=><option key={u.id} value={u.id}>{String(n+1).padStart(2,'0')} · {u.title}</option>)}</select></label><div className="unit-nav"><div><div className="eyebrow">单元 {bundle.units!.indexOf(unit)+1} / {bundle.units!.length}</div><h1>{unit.title}</h1></div><button className="text-button" disabled={busy||pending.current!==null} onClick={onBack}>返回单元列表</button></div></section>}
 {finished&&replayIndex===null?<section className="study-card complete"><div className="complete-mark" aria-hidden="true">✓</div><h1>{legacy?'本组已完成':'本单元已完成'}</h1><p>已记录 {effective.length} 项。关闭页面后，记录仍保存在此浏览器。</p><ul className="record-list">{items.map(i=><li key={i.id}><span lang="ja">{i.surface}</span><span>{effective.find(e=>e.itemId===i.id)?.rating==='good'?'听懂了':'没听懂'}</span></li>)}</ul><div className="complete-actions">{onNextUnit&&<button className="primary" onClick={onNextUnit}>进入下一单元</button>}<button className={onNextUnit?'secondary':'primary'} onClick={()=>{setError('');setReplayIndex(0);}}>重新听一遍</button><p className="quiet">从第一项开始重听，保留原有学习记录。</p><button className="secondary" onClick={onBack}>{legacy?'返回首页':'返回单元列表'}</button></div></section>:item?<><div className="progress-heading"><span>{replayIndex!==null?'本组重听':'本组练习'} <strong>{items.indexOf(item)+1}</strong> / {items.length}</span><span>{replayIndex!==null?'原有记录不变':`已记录 ${effective.length} 项`}</span></div><div className="progress-track"><div style={{width:(replayIndex!==null?replayIndex+1:effective.length)/items.length*100+'%'}}/></div><StudyCard key={`${replayIndex!==null?'replay':'study'}-${item.id}`} replaying={replayIndex!==null} nextLabel={replayIndex===items.length-1?'完成重听':'下一项'} item={item} answer={answer} busy={busy} hasPendingFeedback={pending.current!==null} error={error} onRate={rate} onNext={replayIndex===null?next:()=>setReplayIndex(replayIndex+1<items.length?replayIndex+1:null)} audioUrls={{listen:bundle.assets.find(a=>a.id===item.audio.listen)!.url,example:bundle.assets.find(a=>a.id===item.audio.example)!.url}}/>{replayIndex!==null&&<button className="replay-exit" onClick={()=>setReplayIndex(null)}>返回本组记录</button>}</>:null}
 </>;
}
