import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/home/serena/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
async function visibleRoom(){await page.screenshot();await page.waitForFunction(()=>{const source=document.querySelector('#viewport canvas');if(!source)return false;const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d');ctx.drawImage(source,0,0,32,32);const p=ctx.getImageData(0,0,32,32).data;let min=255,max=0;for(let i=0;i<p.length;i+=4){const v=(p[i]+p[i+1]+p[i+2])/3;min=Math.min(min,v);max=Math.max(max,v)}return max-min>40;},{},{timeout:30000,polling:500});await page.waitForTimeout(500);}
await page.goto('http://localhost:4173/room-simulator.html');await page.waitForSelector('#loading',{state:'detached'});await visibleRoom();await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/day-overview.png'});
await page.evaluate(()=>{const canvas=document.querySelector('#viewport canvas');const ext=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');ext.loseContext();setTimeout(()=>ext.restoreContext(),300);});await page.waitForTimeout(700);await visibleRoom();
await page.getByRole('button',{name:'室內視角',exact:true}).click();await visibleRoom();await page.screenshot({path:'artifacts/day-interior.png'});
await page.mouse.move(780,550);await page.mouse.down();await page.mouse.move(1100,550,{steps:12});await page.mouse.up();await visibleRoom();await page.screenshot({path:'artifacts/cabinet-detail.png'});
await page.getByRole('button',{name:'☾ 夜晚',exact:true}).click();await visibleRoom();await page.screenshot({path:'artifacts/night-interior.png'});
await page.goto('http://localhost:4173/');await page.waitForSelector('#loading',{state:'detached'});assert.deepEqual(errors,[]);await browser.close();console.log('PASS: day/night rendering screenshots');
