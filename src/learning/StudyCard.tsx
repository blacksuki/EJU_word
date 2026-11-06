import {learnerNote} from './display-note';
import {useEffect,useRef,useState} from 'react';
import type {StudyItem} from '../domain/contracts';import type {LocalFeedback,Rating} from './local-feedback';
export function StudyCard({item,audioUrls,answer,busy,hasPendingFeedback,error,onRate,onNext,replaying=false,nextLabel='下一项'}:{replaying?:boolean;nextLabel?:string;item:StudyItem;audioUrls:{listen:string;example:string};answer?:LocalFeedback;busy:boolean;hasPendingFeedback:boolean;error:string;onRate:(r:Rating)=>void;onNext:()=>void}){
 const note=learnerNote(item.noteZh);
 const audio=useRef<HTMLAudioElement>(null);const attempt=useRef(0);
 const [heard,setHeard]=useState(false);const [playing,setPlaying]=useState<'listen'|'example'|null>(null);const [audioError,setAudioError]=useState('');
 useEffect(()=>{const element=audio.current;const pause=()=>{if(document.hidden){attempt.current++;element?.pause();setPlaying(null);}};document.addEventListener('visibilitychange',pause);return()=>{attempt.current++;element?.pause();document.removeEventListener('visibilitychange',pause);};},[]);
 async function play(role:'listen'|'example'){
  const element=audio.current;if(!element)return;
  // Each listen attempt must succeed before it can enable a new rating.
  if(role==='listen')setHeard(false);
  const id=++attempt.current;element.pause();element.src=audioUrls[role];setPlaying(role);setAudioError('');
  try{await element.play();if(id===attempt.current&&role==='listen')setHeard(true);}catch(e){if(id===attempt.current){setPlaying(null);setAudioError(e instanceof DOMException&&e.name==='NotAllowedError'?'浏览器暂未允许播放，请再次点击播放。':'音频暂不可用，请重试。');}}
 }
 const listenButton=<button className="play" onClick={()=>play('listen')} aria-label={heard||answer?'再听一次':'播放词语'}><span aria-hidden="true">▶</span> {playing==='listen'?'播放中…':heard||answer?'再听一次':'播放词语'}</button>;
 return <section className={`study-card${answer?' is-answered':''}`} aria-label="学习卡片">
 <audio ref={audio} preload="none" onEnded={()=>setPlaying(null)} onError={()=>{setPlaying(null);setAudioError('音频暂不可用，请重试。');}} />
 {!answer?<><div className="question"><div className="sound-art" aria-hidden="true">{[20,38,62,88,53,74,36,18].map((h,i)=><span key={i} style={{height:h}} />)}</div><h2>这个声音，你听懂了吗？</h2></div>{listenButton}</>:<div className="answer"><div className="word-row"><div className="word"><div className="reading" lang="ja">{item.reading}</div><h2 lang="ja">{item.surface}</h2></div>{listenButton}</div><p className="meaning">{item.meaningZh}</p>{note&&<p className="note">{note}</p>}</div>}
 {audioError&&<p className="error" role="alert">{audioError}</p>}
 {answer?<><div className="example"><button className="example-play" aria-label="听例句" onClick={()=>play('example')}> {playing==='example'?'例句播放中…':'听例句'} <span aria-hidden="true">▶</span></button><p className="japanese" lang="ja">{item.exampleJa}</p><p>{item.exampleZh}</p></div><div className="saved"><span role="status" aria-label="当前标记">{answer.rating==='good'?'听懂了':'没听懂'}</span>{!replaying&&<button className="text-button" disabled={busy} onClick={()=>onRate(answer.rating==='good'?'again':'good')}>改为{answer.rating==='good'?'没听懂':'听懂了'}</button>}</div><button className="primary next" disabled={busy||hasPendingFeedback} onClick={onNext}>{busy?'保存中…':nextLabel} <span aria-hidden="true">→</span></button></>:<div className="rating"><button disabled={!heard||!!audioError||busy} onClick={()=>onRate('again')}>没听懂</button><button className="primary" disabled={!heard||!!audioError||busy} onClick={()=>onRate('good')}>{busy?'保存中…':'听懂了'}</button></div>}
 {error&&<p role="alert" className="error">{error}</p>}
 </section>;
}
