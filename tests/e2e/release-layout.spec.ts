import {test,expect} from '@playwright/test';

test('unit list and learning controls fit narrow phones and desktop with usable touch targets',async({page})=>{
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});await page.goto('/');
  const list=page.getByRole('list',{name:'学习单元'});await expect(list.getByRole('listitem')).toHaveCount(5);
  const first=await page.getByRole('button',{name:'学习第1单元'}).boundingBox();expect(first!.y+first!.height).toBeLessThan(844);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByText(/人工听审|效果可接受|开发验证|未接入云端/)).toHaveCount(0);
  await page.screenshot({path:`artifacts/verification/release-ui/home-${width}-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'学习第5单元'}).click();const picker=page.getByRole('combobox',{name:'选择学习单元'});await expect(picker).toHaveValue('u05');
  const bounds=await picker.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(48);expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
  if(await page.getByRole('button',{name:'播放词语',exact:true}).count()){
   await page.getByRole('button',{name:'播放词语',exact:true}).click();await expect(page.getByRole('button',{name:'听懂了',exact:true})).toBeEnabled();await page.getByRole('button',{name:'听懂了',exact:true}).click();
  }
  const example=page.getByRole('button',{name:'听例句',exact:true});await expect(example).toBeVisible();expect((await example.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/verification/release-ui/study-${width}-${test.info().project.name}.png`,fullPage:true});
 }
});
