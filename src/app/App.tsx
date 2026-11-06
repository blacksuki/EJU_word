import {useEffect,useState} from 'react';
import {loadBundle} from '../content/loader';
import type {ContentBundle,StudyUnit} from '../domain/contracts';
import {effectiveFeedback,type LocalProgress} from '../learning/local-feedback';
import {createLocalProgressStore} from '../sync/storage';
import {StudySession} from '../learning/StudySession';
const DB='eju-wordtest-phase1';
const keyFor=(bundle:ContentBundle,unit:StudyUnit,legacy:boolean)=>legacy?'current':`content:${bundle.version}:${unit.id}`;
export function App(){
 const legacy=new URLSearchParams(location.search).get('pack')==='legacy';
 const [bundle,setBundle]=useState<ContentBundle|null>(null),[units,setUnits]=useState<StudyUnit[]>([]),[progresses,setProgresses]=useState<Record<string,LocalProgress|null>>({}),[oldCount,setOldCount]=useState<number|null>(0),[activeId,setActiveId]=useState<string|null>(null),[fatal,setFatal]=useState('');
 useEffect(()=>{let active=true;(async()=>{
  const b=await loadBundle(legacy?'legacy':'current');const groups=b.units||[{id:'legacy',title:'原5项练习',goal:'熟悉声音与词义',itemIds:b.items.map(i=>i.id)}];
  const loaded:Record<string,LocalProgress|null>={};
  await Promise.all(groups.map(async u=>{const p=await createLocalProgressStore(DB,keyFor(b,u,legacy)).read();if(p&&(p.contentVersion!==b.version||(p.cursorItemId!==null&&!u.itemIds.includes(p.cursorItemId))||p.feedback.some(e=>!u.itemIds.includes(e.itemId)||e.contentVersion!==b.version)))throw Error('CONTENT_VERSION_CONFLICT');loaded[u.id]=p;}));
  let old:number|null=0;if(!legacy){try{old=effectiveFeedback((await createLocalProgressStore(DB).read())?.feedback||[]).length;}catch{old=null;}}
  if(active){setBundle(b);setUnits(groups);setProgresses(loaded);setOldCount(old);const requested=new URLSearchParams(location.search).get('unit');if(!legacy&&groups.some(u=>u.id===requested))setActiveId(requested);}
 })().catch(()=>{if(active)setFatal('学习内容或本机记录暂时无法读取。已有记录不会被清除，请重新读取。');});return()=>{active=false;};},[legacy]);
 function selectUnit(id:string|null){setActiveId(id);if(!legacy){const url=new URL(location.href);if(id)url.searchParams.set('unit',id);else url.searchParams.delete('unit');history.replaceState(null,'',url.pathname+url.search);}}
 const count=(id:string)=>effectiveFeedback(progresses[id]?.feedback||[]).length;
 const finished=(id:string)=>!!progresses[id]&&progresses[id]!.cursorItemId===null;
 const total=units.reduce((n,u)=>n+count(u.id),0);const recommended=units.find(u=>!finished(u.id))||units[0];const unit=units.find(u=>u.id===activeId);
 const brandContent=<><span className="brand-mark">言</span><span>EJU <span className="brand-light">听词</span></span></>;
 return <div className="shell">
 <header>{unit?<div className="brand">{brandContent}</div>:<a className="brand" href="/" aria-label="EJU 听词首页">{brandContent}</a>}<span className="header-label">日本語学習 · 日语词汇与表达</span></header>
 <main>
 {fatal?<section className="study-card"><h1>暂时无法开始</h1><p role="alert" className="error">{fatal}</p><button className="primary" onClick={()=>location.reload()}>重新读取</button></section>:!bundle?<p role="status">正在读取学习内容和本机记录…</p>:unit?<StudySession key={`${bundle.version}:${unit.id}`} bundle={bundle} unit={unit} legacy={legacy} progress={progresses[unit.id]} store={createLocalProgressStore(DB,keyFor(bundle,unit,legacy))} onProgress={p=>setProgresses(previous=>({...previous,[unit.id]:p}))} onBack={()=>selectUnit(null)} onSelectUnit={selectUnit} onNextUnit={!legacy&&units.indexOf(unit)<units.length-1?()=>selectUnit(units[units.indexOf(unit)+1].id):undefined}/>:<>
 <section className="intro">
  <div className="eyebrow">EJU · 日本語</div><h1>{legacy?'原5项练习':'选择学习单元'}</h1>
  <p className="intro-copy">{legacy?'继续熟悉的练习，找回声音与词义的联系。':'从想学的单元开始，先听声音，再理解词义。'}</p>
  <div className="session-meta"><span>{bundle.items.length} 个学习项</span>{!legacy&&<span>{units.length} 个单元</span>}<span>已记录 <strong>{total}</strong> 项</span></div>
 </section>
 <div className="start-row"><span>{legacy?'每次一点，积累进步。':'每单元 10 项 · 可自由选择'}</span><button className="primary start" onClick={()=>selectUnit(recommended.id)}>{legacy&&finished(recommended.id)?'查看本组记录':units.every(u=>finished(u.id))?'查看学习记录':total?'继续学习':'开始学习'} <span aria-hidden="true">→</span></button></div>
 {!legacy?<>
 <ol className="unit-list" aria-label="学习单元">{units.map((u,n)=><li key={u.id}><button className="unit-option" aria-label={`学习第${n+1}单元`} onClick={()=>selectUnit(u.id)}><span className="unit-number">{String(n+1).padStart(2,'0')}</span><span className="unit-copy"><strong>{u.title}</strong><small>{u.goal}</small><span className={`unit-status${finished(u.id)?' is-complete':''}`}>{finished(u.id)?'已完成 · 可重听':count(u.id)?`已记录 ${count(u.id)} / ${u.itemIds.length} 项`:`${u.itemIds.length} 项 · 未开始`}</span></span><span className="unit-arrow" aria-hidden="true">→</span></button></li>)}</ol>
 {oldCount!==0&&<section className="legacy-entry"><a href="/?pack=legacy">原5项记录 <span aria-hidden="true">↗</span></a><p>{oldCount===null?'原记录暂时无法读取，可进入原组重试。':`已记录 ${oldCount} / 5 项，原记录单独保留。`}</p></section>}
 </>:<p className="legacy-entry"><a href="/">进入50项学习 →</a></p>}
 </>}
 </main><footer><span>EJU 听词 · 日语学习</span><span>进度保存在当前浏览器</span></footer></div>;
}
