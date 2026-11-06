import {it,expect} from 'vitest';import {learnerNote} from '../../src/learning/display-note';
it('removes editorial frequency and internal ID notes while retaining usage guidance',()=>{
 expect(learnerNote('也写作締切／締切り；本次频次仅统计指定表记，不自动合并。')).toBe('也写作締切／締切り；');
 expect(learnerNote('样本命中为复合词“分析力”；保留学生原有分析条目的 ID。')).toBe('');
 expect(learnerNote('常用形：申し込みます、申し込んで；只统计原题动词形，名词“申し込み”单独排除。')).toBe('常用形：申し込みます、申し込んで；');
});
it('keeps meaningful sense boundaries rather than hiding every mention of exclusion',()=>{
 expect(learnerNote('本项仅数量阈值用法；排除必要以上这类非数值表达。')).toBe('本项仅数量阈值用法；排除必要以上这类非数值表达。');
});
it('hides production and counting instructions without removing the adjacent learning explanation',()=>{
 expect(learnerNote('社会学等主题复合词保留；书目名称中出现的不计入。')).toBe('');
 expect(learnerNote('搭配：AとBを比較する；比較的（相对地）是另一用法，未计入本词频次。')).toBe('搭配：AとBを比較する；比較的（相对地）是另一用法。');
 expect(learnerNote('需与否定表达搭配；不是“绝对不”。短音频使用完整句，不读波浪号。')).toBe('需与否定表达搭配；不是“绝对不”。');
 expect(learnerNote('人数が増える；增加某物用他动词増やす，不混成同一掌握记录。')).toBe('人数が増える；增加某物用他动词増やす。');
 expect(learnerNote('与以前间隔学习；不能把今后的计划误当成当前事实。')).toBe('不能把今后的计划误当成当前事实。');
 expect(learnerNote('搭配：高く評価する、評価を受ける；与判断错开学习。')).toBe('搭配：高く評価する、評価を受ける；');
 expect(learnerNote('不能解读为“肯定不”；与此前必ずしも〜ない隔单元联系。')).toBe('不能解读为“肯定不”；');
});
