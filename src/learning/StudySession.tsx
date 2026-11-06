import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {ContentBundle,StudyUnit} from '../domain/contracts';
import {effectiveFeedback,type LocalFeedback,type LocalProgress,type Rating} from './local-feedback';
import {createLocalProgressStore} from '../sync/storage';
import {StudyCard} from './StudyCard';
import {swipeDirection} from './swipe';
type Store=ReturnType<typeof createLocalProgressStore>;
export function StudySession({bundle,unit,progress,store,legacy,onProgress,onBack,onSelectUnit,onNextUnit}:{bundle:ContentBundle;unit:StudyUnit;progress:LocalProgress|null;store:Store;legacy:boolean;onProgress:(p:LocalProgress|null)=>void;onBack:()=>void;onSelectUnit:(id:string)=>void;onNextUnit?:()=>void}){
 const [error,setError]=useState(''),[fatal,setFatal]=useState(''),[busy,setBusy]=useState(false),[replayIndex,setReplayIndex]=useState<number|null>(null),[roundEnded,setRoundEnded]=useState(false);
 const lock=useRef(false),pending=useRef<LocalFeedback|null>(null);
 const gesture=useRef<{id:number;x:number;y:number;time:number}|null>(null);
 useEffect(()=>{const cancel=(event:globalThis.PointerEvent)=>{if(event.pointerType==='touch'&&!event.isPrimary)gesture.current=null;};document.addEventListener('pointerdown',cancel);return()=>document.removeEventListener('pointerdown',cancel);},[]);
 const items=unit.itemIds.map(id=>bundle.items.find(i=>i.id===id)!);
 const effective=effectiveFeedback(progress?.feedback||[]);
 const remaining=items.filter(i=>!effective.some(e=>e.itemId===i.id));
 const finished=progress!==null&&progress.cursorItemId===null;
 const item=replayIndex!==null?items[replayIndex]:items.find(i=>i.id===(progress?.cursorItemId||items[0].id));
 const index=item?items.indexOf(item):0;
 const answer=effective.find(e=>e.itemId===item?.id);
 const blocked=busy||pending.current!==null;
 const summary=(finished||roundEnded)&&replayIndex===null;
 async function recoverConflict(cause:unknown){
  if(!(cause instanceof Error)||!['ALREADY_REVIEWED','CURSOR_CONFLICT','INVALID_CORRECTION','NOT_REVIEWED'].includes(cause.message))return false;
  try{onProgress(await store.read());pending.current=null;setRoundEnded(false);setError('记录已在另一页面更新，已重新读取当前进度。');}
  catch{setFatal('另一页面已更新记录，但暂时无法重新读取。请重新读取，已有记录不会被清除。');}return true;
 }
 async function rate(rating:Rating){
  if(replayIndex!==null||lock.current||!item)return;lock.current=true;setBusy(true);setError('');
  const retry=pending.current?.itemId===item.id&&pending.current.rating===rating?pending.current:null;
  const event=retry||{eventId:crypto.randomUUID(),itemId:item.id,mode:'listen' as const,rating,occurredAt:new Date().toISOString(),contentVersion:bundle.version,...(answer?{replacesEventId:answer.eventId}:{})};pending.current=event;
  try{onProgress(await store.saveFeedback(event,item.id));pending.current=null;}catch(cause){if(!await recoverConflict(cause))setError('未能确认保存，请重试。本项还没有离开，已有记录会保留。');}finally{lock.current=false;setBusy(false);}
 }
 async function navigate(direction:'previous'|'next'){
  if(lock.current||pending.current||!item||summary)return;
  const target=index+(direction==='next'?1:-1);if(target<0)return;
  gesture.current=null;
  if(replayIndex!==null){setError('');setReplayIndex(target<items.length?target:null);return;}
  lock.current=true;setBusy(true);setError('');
  try{
   const saved=await store.navigate(bundle.version,item.id,items[target]?.id||null,unit.itemIds);
   onProgress(saved);setRoundEnded(target>=items.length&&saved.cursorItemId!==null);
  }catch(cause){if(!await recoverConflict(cause))setError('未能保存学习位置，请重试。');}finally{lock.current=false;setBusy(false);}
 }
 function pointerDown(event:PointerEvent<HTMLElement>){
  gesture.current=null;
  if(event.pointerType!=='touch'||!event.isPrimary||lock.current||pending.current||!matchMedia('(max-width: 600px)').matches)return;
  if(event.clientX<24||event.clientX>innerWidth-24||(event.target as Element).closest('button,a,input,select,textarea,[role="button"]'))return;
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp};
 }
 function pointerMove(event:PointerEvent<HTMLElement>){
  const start=gesture.current;if(!start||start.id!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx))gesture.current=null;
 }
 function pointerUp(event:PointerEvent<HTMLElement>){
  const start=gesture.current;gesture.current=null;if(!start||start.id!==event.pointerId)return;
  const direction=swipeDirection(event.clientX-start.x,event.clientY-start.y,event.timeStamp-start.time);
  if(direction)void navigate(direction);
 }
 function back(){if(!lock.current&&!pending.current)onBack();}
 if(fatal)return <section className="study-card"><p role="alert">{fatal}</p><button onClick={()=>location.reload()}>重新读取</button></section>;
 return <div className="study-session">
  {!legacy&&<section className="unit-navigation" aria-label="单元导航"><h1 className="sr-only">{unit.title}</h1><label className="unit-picker"><span className="sr-only">选择学习单元</span><select value={unit.id} disabled={blocked} onChange={event=>{if(!lock.current&&!pending.current)onSelectUnit(event.target.value);}}>{bundle.units!.map((u,n)=><option key={u.id} value={u.id}>{String(n+1).padStart(2,'0')} · {u.title}</option>)}</select></label></section>}
  {summary?<section className="study-card complete">
   <div className="complete-mark" aria-hidden="true">{finished?'✓':'↺'}</div><h1>{finished?(legacy?'本组已完成':'本单元已完成'):`还有 ${remaining.length} 项待标记`}</h1>
   <ul className="record-list">{items.map(i=>{const marked=effective.find(e=>e.itemId===i.id);return <li key={i.id}><span lang="ja">{i.surface}</span><span>{marked?(marked.rating==='good'?'听懂了':'没听懂'):'待标记'}</span></li>;})}</ul>
   <div className="complete-actions">{finished?<>{onNextUnit&&<button className="primary" onClick={onNextUnit}>进入下一单元</button>}<button className={onNextUnit?'secondary':'primary'} onClick={()=>{setError('');setReplayIndex(0);}}>重新听一遍</button></>:<button className="primary" onClick={()=>{setRoundEnded(false);setError('');}}>补学未标记</button>}</div>
  </section>:item?<>
   <div className="progress-heading"><span>{replayIndex!==null?'本组重听':'本组练习'} <strong>{index+1}</strong> / {items.length}</span><span>{replayIndex!==null?'原有记录不变':`待标记 ${remaining.length} 项`}</span></div>
   <div className="progress-track"><div style={{width:(replayIndex!==null?replayIndex+1:effective.length)/items.length*100+'%'}}/></div>
   <div className="swipe-surface" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{gesture.current=null;}}>
    <StudyCard key={`${replayIndex!==null?'replay':'study'}-${item.id}`} replaying={replayIndex!==null} item={item} answer={answer} busy={busy} error={error} onRate={rate} audioUrls={{listen:bundle.assets.find(a=>a.id===item.audio.listen)!.url,example:bundle.assets.find(a=>a.id===item.audio.example)!.url}}/>
   </div>
   <div className="card-navigation" aria-label="词条导航"><button disabled={blocked||index===0} onClick={()=>navigate('previous')}>前一个</button><button className="primary next" disabled={blocked} onClick={()=>navigate('next')}>{replayIndex===items.length-1?'完成重听':'下一项'} <span aria-hidden="true">→</span></button></div>
   <p className="swipe-hint">左滑前一个 · 右滑下一个</p>
  </>:null}
  <nav className="session-bottom" aria-label="学习操作">
   {replayIndex!==null&&<button className="text-button" onClick={()=>setReplayIndex(null)}>返回本组记录</button>}
   <button className="unit-return" disabled={blocked} onClick={back}>{legacy?'返回首页':'回到学习单元'}</button>
  </nav>
 </div>;
}
