import {test,expect,type Page} from '@playwright/test';
async function swipe(page:Page,dx:number){const card=page.getByRole('region',{name:'学习卡片'});await card.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:180,clientY:240});await card.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:180+dx,clientY:240});}
async function mark(page:Page){await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await page.getByRole('button',{name:'听懂了',exact:true}).click();await expect(page.getByRole('status',{name:'当前标记'})).toBeVisible();}
test('listen screen ignores horizontal gestures and exposes only an explicit skip',async({page})=>{
 await page.goto('/?unit=u01');await expect(page.getByRole('button',{name:'播放词语',exact:true})).toBeVisible();await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('1');await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('1');await expect(page.getByRole('button',{name:'前一个',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'下一项',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'暂时跳过',exact:true}).click();await expect(page.locator('.progress-heading strong')).toHaveText('2');await swipe(page,-100);await expect(page.locator('.progress-heading strong')).toHaveText('2');
});
test('answer screen has clickable side arrows at card mid-height and accepts swipe',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?unit=u01');await mark(page);
 const card=(await page.getByRole('region',{name:'学习卡片'}).boundingBox())!;
 for(const name of ['前一个','下一项']){const arrow=page.getByRole('button',{name,exact:true});const rect=(await arrow.boundingBox())!;expect(rect.width).toBeGreaterThanOrEqual(44);expect(rect.height).toBeGreaterThanOrEqual(44);expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(390);
 const meaning=(await page.locator('.meaning').boundingBox())!;if(name==='前一个')expect(rect.x+rect.width).toBeLessThanOrEqual(meaning.x);else expect(rect.x).toBeGreaterThanOrEqual(meaning.x+meaning.width);
 expect(await arrow.evaluate(el=>{const r=el.getBoundingClientRect();return [2,r.width/2,r.width-2].every(x=>el.contains(document.elementFromPoint(r.x+x,r.y+r.height/2)));})).toBe(true);expect(Math.abs(rect.y+rect.height/2-card.y-card.height/2)).toBeLessThanOrEqual(1);}
 await expect(page.locator('.card-navigation')).toHaveCount(0);await expect(page.getByRole('button',{name:'前一个',exact:true})).toBeDisabled();
 await swipe(page,100);await expect(page.locator('.progress-heading strong')).toHaveText('2');await expect(page.getByRole('button',{name:'下一项',exact:true})).toHaveCount(0);await mark(page);
 await page.getByRole('button',{name:'前一个',exact:true}).click();await expect(page.locator('.progress-heading strong')).toHaveText('1');await page.getByRole('button',{name:'下一项',exact:true}).click();await expect(page.locator('.progress-heading strong')).toHaveText('2');await swipe(page,-100);await expect(page.locator('.progress-heading strong')).toHaveText('1');
});
