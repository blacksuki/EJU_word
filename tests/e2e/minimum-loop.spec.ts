import {test,expect,chromium,type Page} from '@playwright/test';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
async function start(page:Page){await page.goto('/?pack=legacy');await page.getByRole('button',{name:/开始学习|继续学习/}).click();}
async function hear(page:Page){await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();}
async function snapshot(page:Page){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{const q=indexedDB.open('eju-wordtest-phase1',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result;const tx=db.transaction('progress');const get=tx.objectStore('progress').get('current');get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>db.close();};}));}

test('actual audio -> mark -> meaning/example -> save and reload',async({page})=>{
 await start(page);await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeDisabled();await expect(page.getByText('分析',{exact:true})).toHaveCount(0);
 await hear(page);await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('heading',{name:'分析',exact:true})).toBeVisible();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();
 await page.getByRole('button',{name:'听例句'}).click();await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentSrc)).toContain('example.mp3');await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await page.screenshot({path:'artifacts/verification/answer-'+test.info().project.name+'.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'继续学习'}).click();await expect(page.getByRole('heading',{name:'分析',exact:true})).toBeVisible();expect((await snapshot(page)).feedback).toHaveLength(1);
 await page.getByRole('button',{name:'改为没听懂'}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^没听懂$/})).toBeVisible();expect((await snapshot(page)).feedback).toHaveLength(2);
 await page.getByRole('button',{name:'下一项'}).click();await expect(page.getByText('这个声音，你听懂了吗？')).toBeVisible();expect((await snapshot(page)).cursorItemId).toBe('eju-02-004-a');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('failed media is retryable and never becomes a learning answer',async({page})=>{
 await page.route('**/*-listen.mp3',r=>r.abort());await start(page);await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('alert')).toContainText('音频暂不可用');await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeDisabled();expect(await snapshot(page)).toBeUndefined();await page.unroute('**/*-listen.mp3');await hear(page);
});

test('storage failure keeps answer hidden and allows retry without false saved status',async({page})=>{
 await start(page);await hear(page);
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).restoreTransaction=()=>IDBDatabase.prototype.transaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('Disk full','QuotaExceededError');return original.apply(this,args as any);};});
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未能确认保存');await expect(page.getByRole('heading',{name:'分析',exact:true})).toHaveCount(0);await expect(page.getByRole('status',{name:'当前标记'})).toHaveCount(0);
 await page.evaluate(()=>(window as any).restoreTransaction());await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();expect((await snapshot(page)).feedback).toHaveLength(1);
});

test('a complete five-item group remains complete after reload',async({page})=>{
 await start(page);for(let i=0;i<5;i++){await hear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();await page.getByRole('button',{name:'下一项'}).click();}
 await expect(page.getByRole('heading',{name:'本组已完成'})).toBeVisible();await page.reload();await page.getByRole('button',{name:'查看本组记录'}).click();await expect(page.getByRole('heading',{name:'本组已完成'})).toBeVisible();expect((await snapshot(page)).cursorItemId).toBeNull();expect((await snapshot(page)).feedback).toHaveLength(5);
});

test('closing and relaunching persistent Chromium preserves two answers and next position',async({},info)=>{
 test.skip(info.project.name!=='chromium','Persistent Chromium verification; WebKit reload verified separately');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'eju-phase1-'));
 let context=await chromium.launchPersistentContext(dir,{headless:true,viewport:{width:390,height:844},baseURL:`http://127.0.0.1:${process.env.EJU_TEST_PORT||5174}`});
 try{let page=await context.newPage();await start(page);for(let i=0;i<2;i++){await hear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();await page.getByRole('button',{name:'下一项'}).click();}await context.close();context=await chromium.launchPersistentContext(dir,{headless:true,viewport:{width:390,height:844},baseURL:`http://127.0.0.1:${process.env.EJU_TEST_PORT||5174}`});page=await context.newPage();await start(page);const p=await snapshot(page);expect(p.feedback).toHaveLength(2);expect(p.cursorItemId).toBe('eju-01-031-a');await page.screenshot({path:'artifacts/verification/reopened-chromium.png',fullPage:true});}finally{await context.close();}
});

async function failWrites(page:Page){await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).restoreTransaction=()=>IDBDatabase.prototype.transaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('Disk full','QuotaExceededError');return original.apply(this,args as any);};});}
async function restoreWrites(page:Page){await page.evaluate(()=>(window as any).restoreTransaction());}

test('after a failed answer, choosing a different answer saves the new choice',async({page})=>{
 await start(page);await hear(page);await failWrites(page);
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未能确认保存');
 await restoreWrites(page);await page.getByRole('button',{name:'没听懂',exact:true}).click();
 await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^没听懂$/})).toBeVisible();expect((await snapshot(page)).feedback[0].rating).toBe('again');
});
test('failed correction must be resolved before advancing and cannot leak into the next card',async({page})=>{
 await start(page);await hear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();
 await failWrites(page);await page.getByRole('button',{name:'改为没听懂'}).click();await expect(page.getByRole('alert')).toContainText('未能确认保存');
 await expect(page.getByRole('button',{name:'下一项'})).toBeDisabled();await restoreWrites(page);
 await page.getByRole('button',{name:'改为没听懂'}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^没听懂$/})).toBeVisible();
 await page.getByRole('button',{name:'下一项'}).click();await hear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();
 await expect(page.getByRole('heading',{name:'課題',exact:true})).toBeVisible();expect((await snapshot(page)).feedback).toHaveLength(3);
});
test('advancing uses the committed snapshot even when subsequent readonly access is unavailable',async({page})=>{
 await start(page);await hear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;let committed=false;(window as any).restoreTransaction=()=>IDBDatabase.prototype.transaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(committed&&args[1]==='readonly')throw new DOMException('Temporary read error','UnknownError');const tx=original.apply(this,args as any);if(args[1]==='readwrite')tx.addEventListener('complete',()=>{committed=true;});return tx;};});
 await page.getByRole('button',{name:'下一项'}).click();await expect(page.getByText('这个声音，你听懂了吗？')).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 await restoreWrites(page);expect((await snapshot(page)).cursorItemId).toBe('eju-02-004-a');
});
test('two tabs reconcile conflicting answers and stale next actions without duplicates',async({page,context})=>{
 const other=await context.newPage();await start(page);await start(other);await hear(page);await hear(other);
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'}).filter({hasText:/^听懂了$/})).toBeVisible();
 await other.getByRole('button',{name:'没听懂',exact:true}).click();await expect(other.getByRole('alert')).toContainText('另一页面');expect((await snapshot(other)).feedback).toHaveLength(1);
 await page.getByRole('button',{name:'下一项'}).click();await expect(page.getByText('这个声音，你听懂了吗？')).toBeVisible();
 await other.getByRole('button',{name:'下一项'}).click();await expect(other.getByText('这个声音，你听懂了吗？')).toBeVisible();
 await hear(other);await other.getByRole('button',{name:'听懂了',exact:true}).dblclick();await expect(other.getByRole('heading',{name:'課題',exact:true})).toBeVisible();expect((await snapshot(other)).feedback).toHaveLength(2);
});

async function completeGroup(page:Page){
 await start(page);
 for(let i=0;i<5;i++){
  await hear(page);await page.getByRole('button',{name:i===0?'没听懂':'听懂了',exact:true}).click();
  await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();
  await page.getByRole('button',{name:'下一项'}).click();
 }
 await expect(page.getByRole('heading',{name:'本组已完成'})).toBeVisible();
}
test('relisten walks all five items without changing saved answers or completed cursor',async({page})=>{
 await completeGroup(page);const original=await snapshot(page);
 await page.getByRole('button',{name:'重新听一遍',exact:true}).click();
 const names=['分析','課題','手間をかける','探せる','〜わけではない'];
 for(let i=0;i<5;i++){
  await expect(page.getByRole('heading',{name:names[i],exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/改为/})).toHaveCount(0);
  await page.getByRole('button',{name:'再听一次',exact:true}).click();
  await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'听例句',exact:true}).click();
  await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentSrc)).toContain('example.mp3');
  await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
  if(i===0)await page.screenshot({path:'artifacts/verification/relisten-'+test.info().project.name+'.png',fullPage:true});
  await page.getByRole('button',{name:i===4?'完成重听':'下一项',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'本组已完成'})).toBeVisible();expect(await snapshot(page)).toEqual(original);
 await page.getByRole('button',{name:'重新听一遍',exact:true}).click();await expect(page.getByRole('heading',{name:'分析',exact:true})).toBeVisible();
});
test('leaving or refreshing a relisten keeps the completed group and stops playback',async({page})=>{
 await completeGroup(page);const original=await snapshot(page);
 await page.getByRole('button',{name:'重新听一遍',exact:true}).click();await page.getByRole('button',{name:'听例句',exact:true}).click();
 await page.getByRole('button',{name:'返回本组记录',exact:true}).click();await expect(page.locator('audio')).toHaveCount(0);expect(await snapshot(page)).toEqual(original);
 await page.getByRole('button',{name:'重新听一遍',exact:true}).click();await page.getByRole('button',{name:'下一项',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'查看本组记录'}).click();await expect(page.getByRole('heading',{name:'本组已完成'})).toBeVisible();expect(await snapshot(page)).toEqual(original);
});
test('example playback offers a large mobile tap target without horizontal overflow',async({page})=>{
 await start(page);await hear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();
 const button=page.getByRole('button',{name:'听例句',exact:true});await expect(button).toBeVisible();
 const bounds=await button.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(56);expect(bounds!.width).toBeGreaterThanOrEqual(240);
 if(test.info().project.name==='webkit')await button.tap();else await button.click();await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
