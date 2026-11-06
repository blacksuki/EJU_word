import {test,expect,type Page,type Route} from '@playwright/test';
async function startAndHear(page:Page){
 await page.goto('/?pack=legacy');await page.getByRole('button',{name:'开始学习'}).click();
 await page.getByRole('button',{name:'播放词语',exact:true}).click();
 await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();
}
async function savedProgress(page:Page){
 return page.evaluate(()=>new Promise<any>((resolve,reject)=>{
  const request=indexedDB.open('eju-wordtest-phase1',1);request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;const tx=db.transaction('progress');const get=tx.objectStore('progress').get('current');get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>db.close();};
 }));
}
async function holdNextRequest(page:Page,pattern:string){
 let capture!:(route:Route)=>void;const request=new Promise<Route>(resolve=>{capture=resolve;});
 await page.route(pattern,route=>capture(route),{times:1});
 return {request};
}
async function expectRatingsDisabled(page:Page){
 await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'没听懂',exact:true})).toBeDisabled();
 expect(await savedProgress(page)).toBeUndefined();
}

test('P2 media error keeps ratings disabled through pending and failed retries until playback succeeds',async({page})=>{
 await startAndHear(page);
 // Simulated mid-play media error; the subsequent held/failed requests use real browser networking.
 await page.locator('audio').evaluate((audio:HTMLAudioElement)=>{audio.pause();audio.dispatchEvent(new Event('error'));});
 await expect(page.getByRole('alert')).toContainText('音频暂不可用');await expectRatingsDisabled(page);
 const {request:requested}=await holdNextRequest(page,'**/*-listen.mp3');
 await page.getByRole('button',{name:/播放词语|再听一次/,exact:true}).click();const held=await requested;
 try{
  await expect.poll(()=>page.locator('audio').evaluate((audio:HTMLAudioElement)=>audio.readyState)).toBe(0);
  await expectRatingsDisabled(page);
 }finally{await held.fulfill({status:404,body:'Not found'});}
 await expect(page.getByRole('alert')).toContainText('音频暂不可用');await expectRatingsDisabled(page);
 await page.unroute('**/*-listen.mp3');await page.getByRole('button',{name:/播放词语|再听一次/,exact:true}).click();
 await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByText('✓ 已保存到本机 · 听懂了')).toBeVisible();
 expect((await savedProgress(page)).feedback).toHaveLength(1);
});

test('P2 a fresh listen attempt cannot reuse a previous success while its request is pending',async({page})=>{
 await startAndHear(page);
 const {request:requested}=await holdNextRequest(page,'**/*-listen.mp3');
 await page.getByRole('button',{name:'再听一次',exact:true}).click();const held=await requested;
 try{await expectRatingsDisabled(page);}finally{await held.continue();}
 await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();
});

test('P2 example failure and pending retry preserve the saved rating and correction controls',async({page})=>{
 await startAndHear(page);await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByText('✓ 已保存到本机 · 听懂了')).toBeVisible();
 const before=await savedProgress(page);
 await page.route('**/*-example.mp3',route=>route.fulfill({status:404,body:'Not found'}));
 await page.getByRole('button',{name:'听例句',exact:true}).click();await expect(page.getByRole('alert')).toContainText('音频暂不可用');
 await page.unroute('**/*-example.mp3');
 const {request:requested}=await holdNextRequest(page,'**/*-example.mp3');
 await page.getByRole('button',{name:'听例句',exact:true}).click();const held=await requested;
 try{
  await expect(page.getByText('✓ 已保存到本机 · 听懂了')).toBeVisible();await expect(page.getByRole('button',{name:'改为没听懂'})).toBeEnabled();
  expect(await savedProgress(page)).toEqual(before);
 }finally{await held.continue();}
 await expect.poll(()=>page.locator('audio').evaluate((audio:HTMLAudioElement)=>audio.currentTime)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'改为没听懂'}).click();await expect(page.getByText('✓ 已保存到本机 · 没听懂')).toBeVisible();
 const after=await savedProgress(page);expect(after.feedback).toHaveLength(2);expect(after.feedback[1].replacesEventId).toBe(before.feedback[0].eventId);
});
