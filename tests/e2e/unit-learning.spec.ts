import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const bundle=JSON.parse(fs.readFileSync('public/content/eju-50-v1.json','utf8'));
const key=(unit:string)=>`content:eju-50-v1:${unit}`;
async function snapshot(page:Page,key:string){return page.evaluate(key=>new Promise<any>((resolve,reject)=>{const q=indexedDB.open('eju-wordtest-phase1',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result;const tx=db.transaction('progress');const get=tx.objectStore('progress').get(key);get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>db.close();};}),key);}
async function hear(page:Page){await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();}
async function rate(page:Page,rating='听懂了'){await hear(page);await page.getByRole('button',{name:rating,exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();}

test('50-item home loads no audio until a tap; a unit saves, corrects, returns and resumes on refresh',async({page})=>{
 const requested:string[]=[];page.on('request',r=>{if(r.url().endsWith('.mp3'))requested.push(r.url());});
 await page.goto('/');await expect(page.getByRole('heading',{name:'选择学习单元'})).toBeVisible();await expect(page.getByRole('link',{name:/原5项记录/})).toHaveCount(0);await expect(page.getByRole('button',{name:/学习第[1-5]单元/})).toHaveCount(5);expect(requested).toHaveLength(0);
 await page.screenshot({path:`artifacts/verification/release-ui/home-${test.info().project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'开始学习'}).click();expect(requested).toHaveLength(0);await expect(page.getByRole('heading',{name:'一方',exact:true})).toHaveCount(0);await rate(page);
 await page.getByRole('heading',{name:'一方',exact:true}).waitFor();await page.getByRole('button',{name:'改为没听懂'}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^没听懂$/})).toBeVisible();
 const example=page.getByRole('button',{name:'听例句',exact:true});const bounds=await example.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(56);expect(bounds!.width).toBeGreaterThanOrEqual(240);
 if(test.info().project.name==='webkit')await example.tap();else await example.click();
 const url=bundle.assets.find((a:any)=>a.id===bundle.items[0].audio.example).url;
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentSrc)).toContain(url);await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await page.screenshot({path:`artifacts/verification/release-ui/answer-${test.info().project.name}.png`,fullPage:true});
 const before=await snapshot(page,key('u01'));expect(before.feedback).toHaveLength(2);
 await page.getByRole('button',{name:'回到学习单元'}).click();expect(await page.locator('audio').count()).toBe(0);expect(await snapshot(page,key('u01'))).toEqual(before);
 await page.getByRole('button',{name:'学习第1单元'}).click();await page.reload();await expect(page.getByRole('heading',{name:'一方',exact:true})).toBeVisible();expect(await snapshot(page,key('u01'))).toEqual(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('unit completion and replay preserve records; next unit starts independently and resumes there',async({page})=>{
 await page.goto('/?unit=u01');await page.getByText('这个声音，你听懂了吗？').waitFor();
 for(let n=0;n<10;n++){await rate(page,n===0?'没听懂':'听懂了');await page.getByRole('button',{name:'下一项',exact:true}).click();}
 await expect(page.getByRole('heading',{name:'本单元已完成'})).toBeVisible();const first=await snapshot(page,key('u01'));expect(first.feedback).toHaveLength(10);expect(first.cursorItemId).toBeNull();
 await page.getByRole('button',{name:'重新听一遍',exact:true}).click();
 for(let n=0;n<10;n++){await expect(page.getByRole('heading',{name:bundle.items[n].surface,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/改为/})).toHaveCount(0);await page.getByRole('button',{name:n===9?'完成重听':'下一项',exact:true}).click();}
 expect(await snapshot(page,key('u01'))).toEqual(first);await page.getByRole('button',{name:'进入下一单元'}).click();await expect(page).toHaveURL(/unit=u02/);await rate(page,'没听懂');await expect(page.getByRole('heading',{name:'結果',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'結果',exact:true})).toBeVisible();expect((await snapshot(page,key('u02'))).feedback).toHaveLength(1);expect(await snapshot(page,key('u01'))).toEqual(first);
});

test('old five-item feedback remains byte-equivalent and accessible after learning a new unit',async({page})=>{
 await page.goto('/?pack=legacy');await page.getByRole('button',{name:'开始学习'}).click();await rate(page);await expect(page.getByRole('heading',{name:'分析',exact:true})).toBeVisible();const old=await snapshot(page,'current');
 await page.goto('/');await expect(page.getByText('已记录 1 / 5 项，原记录单独保留。')).toBeVisible();await page.getByRole('button',{name:'学习第2单元'}).click();await rate(page);expect(await snapshot(page,'current')).toEqual(old);expect((await snapshot(page,key('u02'))).feedback).toHaveLength(1);
 await page.getByRole('button',{name:'回到学习单元'}).click();await page.getByRole('link',{name:/原5项记录/}).click();await page.getByRole('button',{name:'继续学习'}).click();await expect(page.getByRole('heading',{name:'分析',exact:true})).toBeVisible();expect(await snapshot(page,'current')).toEqual(old);
});

test('later units save in their own slots without marking earlier units',async({page})=>{
 await page.goto('/');for(const n of [3,4,5]){await page.getByRole('button',{name:`学习第${n}单元`}).click();await rate(page);await expect(page.getByRole('heading',{name:bundle.items[(n-1)*10].surface,exact:true})).toBeVisible();expect((await snapshot(page,key(`u0${n}`))).feedback).toHaveLength(1);await page.getByRole('button',{name:'回到学习单元'}).click();}
 expect(await snapshot(page,key('u01'))).toBeUndefined();expect(await snapshot(page,'current')).toBeUndefined();
});

test('new audio network and save failures never create a false learning record',async({page})=>{
 const url=bundle.assets.find((a:any)=>a.id===bundle.items[0].audio.listen).url;await page.route('**'+url,r=>r.abort());await page.goto('/?unit=u01');await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('alert')).toContainText('音频暂不可用');await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeDisabled();expect(await snapshot(page,key('u01'))).toBeUndefined();
 await page.unroute('**'+url);await hear(page);
 await page.evaluate(()=>{const old=IDBDatabase.prototype.transaction;(window as any).restore=()=>IDBDatabase.prototype.transaction=old;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('full','QuotaExceededError');return old.apply(this,args as any);};});
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未能确认保存');await expect(page.getByRole('heading',{name:'一方',exact:true})).toHaveCount(0);await page.evaluate(()=>(window as any).restore());await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('heading',{name:'一方',exact:true})).toBeVisible();expect((await snapshot(page,key('u01'))).feedback).toHaveLength(1);
 const before=await snapshot(page,key('u01'));await page.route('**/content/eju-50-v1.json',r=>r.fulfill({status:503,body:'unavailable'}));await page.reload();await expect(page.getByRole('heading',{name:'暂时无法开始'})).toBeVisible();expect(await snapshot(page,key('u01'))).toEqual(before);await page.unroute('**/content/eju-50-v1.json');await page.getByRole('button',{name:'重新读取'}).click();await expect(page.getByRole('heading',{name:'一方',exact:true})).toBeVisible();
});

test('unit picker switches directly, stops old audio and restores each saved position',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'学习第3单元'}).click();
 const picker=page.getByRole('combobox',{name:'选择学习单元'});await expect(picker).toHaveValue('u03');
 await rate(page,'没听懂');const third=await snapshot(page,key('u03'));
 await page.getByRole('button',{name:'听例句',exact:true}).click();
 const oldAudio=await page.locator('audio').elementHandle();await expect.poll(()=>oldAudio!.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await picker.selectOption('u02');await expect(page).toHaveURL(/unit=u02/);
 expect(await oldAudio!.evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeDisabled();
 expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentSrc)).toBe('');
 await rate(page);await page.getByRole('button',{name:'下一项',exact:true}).click();const second=await snapshot(page,key('u02'));
 await picker.selectOption('u03');await expect(page.getByRole('heading',{name:bundle.items[20].surface,exact:true})).toBeVisible();
 expect(await snapshot(page,key('u03'))).toEqual(third);
 await picker.selectOption('u02');await page.reload();await expect(picker).toHaveValue('u02');
 await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeDisabled();await rate(page);
 await expect(page.getByRole('heading',{name:bundle.items[11].surface,exact:true})).toBeVisible();
 expect((await snapshot(page,key('u02'))).feedback).toHaveLength(second.feedback.length+1);expect(await snapshot(page,key('u03'))).toEqual(third);
});

test('unit picker cannot discard an unconfirmed rating and unlocks after retry',async({page})=>{
 await page.goto('/?unit=u01');const picker=page.getByRole('combobox',{name:'选择学习单元'});await expect(picker).toBeEnabled();await hear(page);
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).restore=()=>IDBDatabase.prototype.transaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('full','QuotaExceededError');return original.apply(this,args as any);};});
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未能确认保存');
 await expect(picker).toBeDisabled();await expect(page.getByRole('button',{name:'回到学习单元'})).toBeDisabled();expect(await snapshot(page,key('u01'))).toBeUndefined();
 await page.setViewportSize({width:1280,height:800});await page.locator('.brand').click();await expect(page.getByRole('alert')).toContainText('未能确认保存');await expect(page).toHaveURL(/unit=u01/);
 await page.evaluate(()=>(window as any).restore());await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();
 await expect(picker).toBeEnabled();await picker.selectOption('u05');await expect(page).toHaveURL(/unit=u05/);expect((await snapshot(page,key('u01'))).feedback).toHaveLength(1);expect(await snapshot(page,key('u05'))).toBeUndefined();
});

test('brand cannot leave while a rating is waiting for commit acknowledgement',async({page})=>{
 await page.goto('/?unit=u01');await hear(page);
 // The real transaction commits; hold only its completion notification to the app.
 await page.evaluate(()=>{
  const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;
  (window as any).restore=()=>Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);
  Object.defineProperty(IDBTransaction.prototype,'oncomplete',{configurable:true,get:descriptor.get,set(this:IDBTransaction,callback:Function){
   descriptor.set!.call(this,this.mode==='readwrite'?function(this:IDBTransaction,event:Event){(window as any).releaseCommit=()=>callback.call(this,event);}:callback);
  }});
 });
 await page.getByRole('button',{name:'听懂了',exact:true}).click();const picker=page.getByRole('combobox',{name:'选择学习单元'});await expect(picker).toBeDisabled();
 await page.setViewportSize({width:1280,height:800});await page.locator('.brand').click();await expect(page).toHaveURL(/unit=u01/);await expect(picker).toBeDisabled();await expect(page.getByRole('button',{name:'保存中…',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseCommit)).toBe('function');
 await page.evaluate(()=>{(window as any).restore();(window as any).releaseCommit();});
 await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();await expect(picker).toBeEnabled();expect((await snapshot(page,key('u01'))).feedback).toHaveLength(1);
});
