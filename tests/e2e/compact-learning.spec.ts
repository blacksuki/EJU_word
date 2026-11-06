import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const bundle=JSON.parse(fs.readFileSync('public/content/eju-50-v1.json','utf8'));
const screens=[{width:390,height:844},{width:375,height:667},{width:320,height:740},{width:1280,height:800}];
async function fits(page:Page,label:string){
 const size=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,clipped:[...document.querySelectorAll('.study-card,.answer,.example,main,body')].some(el=>['hidden','clip'].includes(getComputedStyle(el).overflowY)),buttons:[...document.querySelectorAll('main button,main select')].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,top:r.top,bottom:r.bottom,height:r.height};})}));
 expect(size.scrollWidth,label).toBeLessThanOrEqual(size.width);expect(size.scrollHeight,label).toBeLessThanOrEqual(size.height);expect(size.clipped,label).toBe(false);
 for(const b of size.buttons){expect(b.top,label+': '+b.text).toBeGreaterThanOrEqual(0);expect(b.bottom,label+': '+b.text).toBeLessThanOrEqual(size.height);expect(b.height,label+': '+b.text).toBeGreaterThanOrEqual(44);}
}
test('all 50 learning cards, five completions and replay fit phone and desktop screens',async({page})=>{
 test.setTimeout(180000);
 await page.goto('/?unit=u01');
 for(const [u,unit] of bundle.units.entries()){
  if(u)await page.getByRole('button',{name:'进入下一单元'}).click();
  for(const [n,id] of unit.itemIds.entries()){
   const item=bundle.items.find((i:any)=>i.id===id);
   await expect(page.getByRole('button',{name:'播放词语',exact:true})).toBeVisible();
   for(const size of screens){await page.setViewportSize(size);await fits(page,`${item.surface}: question ${size.width}`);}
   await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await page.getByRole('button',{name:'听懂了',exact:true}).click();
   await expect(page.getByRole('heading',{name:item.surface,exact:true})).toBeVisible();await expect(page.getByRole('status',{name:'当前标记'})).toHaveText('听懂了');
   await expect(page.getByText(/理解声音里的意思|在句子里理解|教学例句|已保存到本机/)).toHaveCount(0);
   for(const size of screens){await page.setViewportSize(size);await fits(page,`${item.surface}: answer ${size.width}`);expect((await page.getByRole('button',{name:'听例句',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(56);}
   if(n===0&&u===0){await page.setViewportSize(screens[0]);await page.screenshot({path:`artifacts/verification/compact-ui/answer-${test.info().project.name}.png`,fullPage:true});}
   await page.getByRole('button',{name:'下一项',exact:true}).click();
  }
  await expect(page.getByRole('heading',{name:'本单元已完成'})).toBeVisible();
  for(const size of screens){await page.setViewportSize(size);await fits(page,`completion ${u+1} ${size.width}`);}
  await page.getByRole('button',{name:'重新听一遍',exact:true}).click();
  for(const [n,id] of unit.itemIds.entries()){
   const item=bundle.items.find((i:any)=>i.id===id);await expect(page.getByRole('heading',{name:item.surface,exact:true})).toBeVisible();
   for(const size of screens){await page.setViewportSize(size);await fits(page,`replay ${item.surface} ${size.width}`);}
   await page.getByRole('button',{name:n===unit.itemIds.length-1?'完成重听':'下一项',exact:true}).click();
  }
 }
 await page.setViewportSize(screens[1]);await page.screenshot({path:`artifacts/verification/compact-ui/complete-${test.info().project.name}.png`,fullPage:true});
});

test('playback failure stays visible and a short viewport keeps all controls reachable',async({page})=>{
 await page.route('**/*.mp3',r=>r.abort());await page.setViewportSize(screens[1]);await page.goto('/?unit=u01');await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('alert')).toContainText('音频暂不可用');await fits(page,'audio error');
 await page.setViewportSize({width:320,height:400});const rate=page.getByRole('button',{name:'听懂了',exact:true});await rate.scrollIntoViewIfNeeded();
 const rect=await rate.boundingBox();expect(rect!.y+rect!.height).toBeLessThanOrEqual(400);expect(await page.evaluate(()=>getComputedStyle(document.body).overflowY)).not.toMatch(/hidden|clip/);
});

test('word playback text keeps contrast in normal and hovered states',async({page})=>{
 await page.goto('/?unit=u01');const play=page.getByRole('button',{name:'播放词语',exact:true});await expect(play).toBeVisible();
 const contrast=()=>play.evaluate(el=>{const css=getComputedStyle(el);const luminance=(rgb:string)=>{const values=rgb.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};const a=luminance(css.color),b=luminance(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
 expect(await contrast()).toBeGreaterThanOrEqual(4.5);await play.hover();await expect(play).toHaveCSS('background-color','rgb(230, 244, 247)');expect(await contrast()).toBeGreaterThanOrEqual(4.5);
});

test('short screens and enlarged answer text retain reachable learning and completion controls',async({page})=>{
 await page.goto('/?unit=u01');
 for(let n=0;n<10;n++){
  await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();
  if(n===0){
   await page.setViewportSize({width:320,height:400});
   // Deliberately double rendered text sizes, not a claim about OS font scaling.
   await page.locator('.study-card h2,.study-card p,.study-card button,.reading').evaluateAll(els=>els.forEach(el=>{(el as HTMLElement).style.fontSize=parseFloat(getComputedStyle(el).fontSize)*2+'px';}));
   for(const selector of ['.example-play','.japanese','.next']){
    const element=page.locator(selector);await element.scrollIntoViewIfNeeded();const box=(await element.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(400);expect(box.y).toBeGreaterThanOrEqual(0);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(true);
  }
  await page.getByRole('button',{name:'下一项',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'本单元已完成'})).toBeVisible();
 await page.getByRole('button',{name:'重新听一遍',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'重新听一遍',exact:true}).click();await expect(page.getByRole('heading',{name:'一方',exact:true})).toBeVisible();
});
