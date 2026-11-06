/** Keep learner guidance while leaving the audited source and editorial evidence intact. */
export function learnerNote(note:string){
 const guidance=note.replace(/，未计入本词频次|，不混成同一掌握记录/gu,'');
 return (guidance.match(/[^。；]+[。；]?/gu)||[])
  .filter(part=>!/(样本|本批|本次频次|统计|命中|条目的 ID|仅书目标题|属于用途补充项|原题含|保留为同义复合词|主题复合词保留|书目名称中|短音频使用|错开学习|隔单元联系|间隔学习)/u.test(part))
  .join('').trim();
}
