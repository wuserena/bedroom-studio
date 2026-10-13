import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {DEFAULT_ROOM as room} from '../src/model.js';
const base=process.env.BASE_URL||'http://localhost:4173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/home/serena/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const layout={version:1,layoutRevision:2,room,items:[{id:'bed',type:'nordli',x:200,z:233,w:120,d:202,h:30,angle:90,beddingSide:1,duvetColor:'#87958b',pillowColor:'#f2efe7'}]};
try{
await page.addInitScript(s=>{if(!localStorage.getItem('bedroom-studio-v1'))localStorage.setItem('bedroom-studio-v1',s)},JSON.stringify(layout));
await page.goto(base+'/room-simulator.html');await page.waitForSelector('#loading',{state:'detached'});
await page.getByRole('button',{name:'俯視配置',exact:true}).click();await page.waitForTimeout(600);
const rect=await page.locator('#viewport').boundingBox(),scale=rect.height/(2*(Math.max(room.depth+room.recess,room.width)/200+.8))/100,point=(x,z)=>[rect.x+rect.width/2+(x-room.width/2)*scale,rect.y+rect.height/2+(z-room.depth/2)*scale];
// A rebuilt NORDLI must stay at its saved position: grabbing its centre selects it and it follows the pointer without jumping.
await page.mouse.move(...point(200,233));await page.mouse.down();assert.equal(await page.locator('#selectedName').innerText(),'IKEA NORDLI');
const from=point(200,233),to=point(180,213);for(let i=1;i<=10;i++){await page.mouse.move(from[0]+(to[0]-from[0])*i/10,from[1]+(to[1]-from[1])*i/10);const [x,z]=(await page.locator('#position').innerText()).match(/(-?\d+) \/ (-?\d+)/).slice(1).map(Number);assert.ok(Math.abs(x-(200-2*i))<=1&&Math.abs(z-(233-2*i))<=1,`step ${i}: bed at ${x}/${z}`)}
await page.mouse.up();await page.waitForTimeout(600);const bed=(await page.evaluate(()=>JSON.parse(localStorage.getItem('bedroom-studio-v1')))).items[0];assert.ok(Math.abs(bed.x-180)<1&&Math.abs(bed.z-213)<1,`bed saved at ${bed.x}/${bed.z}`);
console.log('PASS: NORDLI follows the pointer from its saved position');
}finally{await browser.close()}
