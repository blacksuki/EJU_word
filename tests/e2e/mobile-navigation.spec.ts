import {test,expect,type Page} from '@playwright/test';
async function progress(page:Page){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{const q=indexedDB.open('eju-wordtest-phase1',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result;const tx=db.transaction('progress');const get=tx.objectStore('progress').get('content:eju-50-v1:u01');get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>db.close();};}));}
async function swipe(page:Page,dx:number,dy=0,target='.study-card',cancel=false,startX=180){const node=page.locator(target);await node.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:startX,clientY:200});await node.dispatchEvent('pointermove',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:startX+dx,clientY:200+dy});await node.dispatchEvent(cancel?'pointercancel':'pointerup',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:startX+dx,clientY:200+dy});}
async function mark(page:Page){await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();}
test.beforeEach(async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/?unit=u01');await expect(page.getByRole('button',{name:'播放词语',exact:true})).toBeVisible();});

test('right swipe skips without rating, left swipe goes back, and refresh restores the chosen word',async({page})=>{
 await page.getByRole('button',{name:'播放词语',exact:true}).click();const audio=await page.locator('audio').elementHandle();await expect.poll(()=>audio!.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('2');expect((await progress(page)).feedback).toEqual([]);expect(await audio!.evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await page.reload();await expect(page.locator('.progress-heading strong')).toHaveText('2');await swipe(page,-100);await expect(page.locator('.progress-heading strong')).toHaveText('1');await page.reload();await expect(page.locator('.progress-heading strong')).toHaveText('1');
 await expect(page.getByRole('button',{name:'前一个',exact:true})).toBeDisabled();await swipe(page,-100);await expect(page.locator('.progress-heading strong')).toHaveText('1');
 await page.getByRole('button',{name:'回到学习单元',exact:true}).click();await expect(page.getByRole('heading',{name:'选择学习单元'})).toBeVisible();
});

test('all-skipped round stays incomplete and can be filled later; completed replay stays read-only',async({page})=>{
 for(let n=0;n<10;n++){await expect(page.locator('.progress-heading strong')).toHaveText(String(n+1));await swipe(page,100);}
 await expect(page.getByRole('heading',{name:'还有 10 项待标记'})).toBeVisible();const skipped=await progress(page);expect(skipped.feedback).toEqual([]);expect(skipped.cursorItemId).not.toBeNull();
 await page.getByRole('button',{name:'回到学习单元',exact:true}).click();await expect(page.getByRole('button',{name:'学习第1单元'})).toContainText('待标记 10 项');await page.getByRole('button',{name:'学习第1单元'}).click();
 for(let n=0;n<10;n++){await mark(page);await page.getByRole('button',{name:'下一项',exact:true}).click();}
 await expect(page.getByRole('heading',{name:'本单元已完成'})).toBeVisible();const completed=await progress(page);expect(completed.cursorItemId).toBeNull();expect(completed.feedback).toHaveLength(10);
 await page.getByRole('button',{name:'重新听一遍',exact:true}).click();await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('2');await swipe(page,-100);await expect(page.locator('.progress-heading strong')).toHaveText('1');expect(await progress(page)).toEqual(completed);
});

test('vertical, short, edge, cancelled and control-originated gestures do not turn cards',async({page})=>{
 await swipe(page,15);await swipe(page,80,120);await swipe(page,100,0,'.study-card',true);await swipe(page,100,0,'.study-card',false,5);await swipe(page,100,0,'.play');
 await expect(page.locator('.progress-heading strong')).toHaveText('1');expect(await progress(page)).toBeUndefined();
});

test('an unconfirmed rating blocks swiping and the bottom return until retry succeeds',async({page})=>{
 await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();
 await page.evaluate(()=>{const old=IDBDatabase.prototype.transaction;(window as any).restore=()=>IDBDatabase.prototype.transaction=old;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('full','QuotaExceededError');return old.apply(this,args as any);};});
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未能确认保存');await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('1');await expect(page.getByRole('button',{name:'回到学习单元',exact:true})).toBeDisabled();
 await page.evaluate(()=>(window as any).restore());await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('2');expect((await progress(page)).feedback).toHaveLength(1);
});

test('a second finger outside the card cancels the pending turn',async({page})=>{
 await page.locator('.study-card').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:100,clientY:200});
 await page.locator('body').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:false,clientX:300,clientY:600});
 await page.locator('.study-card').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:220,clientY:200});
 await expect(page.locator('.progress-heading strong')).toHaveText('1');await expect(page.getByRole('button',{name:'下一项',exact:true})).toBeEnabled();expect(await progress(page)).toBeUndefined();
});

test('Chromium native touch input turns a card without a synthetic pointer dispatch',async({page,browserName})=>{
 test.skip(browserName!=='chromium','CDP touch input is Chromium-only; WebKit uses pointer-event regression tests.');
 const client=await page.context().newCDPSession(page);const box=(await page.locator('.question h2').boundingBox())!;const y=box.y+box.height/2;
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:170,y}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:240,y}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('.progress-heading strong')).toHaveText('2');expect((await progress(page)).feedback).toEqual([]);await client.detach();
});

test('the supplement action resumes the first skipped word and retains prior ratings',async({page})=>{
 await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('2');await mark(page);await page.getByRole('button',{name:'下一项',exact:true}).click();
 for(let n=2;n<10;n++){await expect(page.locator('.progress-heading strong')).toHaveText(String(n+1));await page.getByRole('button',{name:'下一项',exact:true}).click();}
 await expect(page.getByRole('heading',{name:'还有 9 项待标记'})).toBeVisible();
 await page.setViewportSize({width:375,height:667});expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 await page.screenshot({path:`artifacts/verification/mobile-navigation/pending-${test.info().project.name}.png`,fullPage:true});
 const before=await progress(page);await page.getByRole('button',{name:'补学未标记',exact:true}).click();await expect(page.locator('.progress-heading strong')).toHaveText('1');await mark(page);await page.getByRole('button',{name:'下一项',exact:true}).click();
 await expect(page.getByRole('heading',{name:'対象',exact:true})).toBeVisible();const after=await progress(page);expect(after.feedback).toHaveLength(2);expect(after.feedback[0]).toEqual(before.feedback[0]);expect(after.cursorItemId).not.toBeNull();
});

test('returning to a marked word allows correction without changing other words',async({page})=>{
 await mark(page);await page.getByRole('button',{name:'下一项',exact:true}).click();await expect(page.locator('.progress-heading strong')).toHaveText('2');await expect(page.getByRole('button',{name:'前一个',exact:true})).toBeEnabled();await swipe(page,-100);await expect(page.getByRole('heading',{name:'一方',exact:true})).toBeVisible();await page.getByRole('button',{name:'改为没听懂',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toHaveText('没听懂');
 const saved=await progress(page);expect(saved.feedback).toHaveLength(2);expect(saved.feedback[1].replacesEventId).toBe(saved.feedback[0].eventId);await page.reload();await expect(page.getByRole('status',{name:'当前标记'})).toHaveText('没听懂');expect(await progress(page)).toEqual(saved);
});

test('cursor save failure stays on the original word and retry never creates an answer',async({page})=>{
 await page.evaluate(()=>{const old=IDBDatabase.prototype.transaction;(window as any).restore=()=>IDBDatabase.prototype.transaction=old;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('full','QuotaExceededError');return old.apply(this,args as any);};});
 await swipe(page,100);await expect(page.getByRole('alert')).toContainText('未能保存学习位置');await expect(page.locator('.progress-heading strong')).toHaveText('1');expect(await progress(page)).toBeUndefined();
 await page.evaluate(()=>(window as any).restore());await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('2');expect((await progress(page)).feedback).toEqual([]);
});

test('repeated swipes during commit acknowledgement cannot jump over another word',async({page})=>{
 await page.evaluate(()=>{const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;(window as any).restore=()=>Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);Object.defineProperty(IDBTransaction.prototype,'oncomplete',{configurable:true,get:descriptor.get,set(this:IDBTransaction,callback:Function){descriptor.set!.call(this,this.mode==='readwrite'?function(this:IDBTransaction,event:Event){(window as any).release=()=>callback.call(this,event);}:callback);}});});
 await swipe(page,100);await expect(page.getByRole('button',{name:'下一项',exact:true})).toBeDisabled();await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('1');await expect(page.getByRole('button',{name:'回到学习单元',exact:true})).toBeDisabled();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).release)).toBe('function');await page.evaluate(()=>{(window as any).restore();(window as any).release();});await expect(page.locator('.progress-heading strong')).toHaveText('2');expect((await progress(page)).feedback).toEqual([]);
});
