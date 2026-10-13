import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/home/serena/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SITE_URL||'http://localhost:4173/room-simulator.html');await page.waitForSelector('#loading',{state:'detached'});
 await page.getByRole('button',{name:'俯視配置',exact:true}).click();await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/entrance-plan.png'});
 await page.getByRole('button',{name:'門口',exact:true}).click();await page.waitForFunction(()=>{const source=document.querySelector('#viewport canvas'),sample=document.createElement('canvas');sample.width=sample.height=16;const ctx=sample.getContext('2d');ctx.drawImage(source,0,0,16,16);const rgba=ctx.getImageData(0,0,16,16).data;let lo=255,hi=0;for(let i=0;i<rgba.length;i+=4){const value=(rgba[i]+rgba[i+1]+rgba[i+2])/3;lo=Math.min(lo,value);hi=Math.max(hi,value)}return hi-lo>30;});await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/entrance-corrected.png'});
 await page.getByRole('button',{name:'加入床頭櫃',exact:true}).click();assert.equal(await page.locator('[data-view="orbit"]').getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'門口',exact:true}).click();await page.getByRole('button',{name:'☾ 夜晚',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
 const b=await page.locator('#mobileCatalog').boundingBox();assert.ok(b.x+b.width<=390,'mobile furniture button remains visible');
 await page.getByRole('button',{name:'☀ 白天',exact:true}).click();await page.screenshot({path:'artifacts/entrance-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: entrance view, day/night, adding furniture exits entrance view, mobile toolbar, no runtime errors');
}finally{await browser.close()}
