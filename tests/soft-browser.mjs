import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {PROPOSALS} from '../src/proposals.js';
// Applies the milk-tea proposal to the saved room, swaps one layer, undoes it, and keeps six shots for the visual review:
// day and night (mood lamps only), each from the overview, the interior turned toward the bed head, and lying in bed.
const base=process.env.BASE_URL||'http://localhost:4173',p=PROPOSALS[0];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/home/serena/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bedroom-studio-v1')));
const settle=()=>page.waitForTimeout(1500);
// Software rendering can hold the page for seconds, so saved state is polled instead of trusted after a fixed wait.
const eventually=async check=>{for(let i=0;;i++){try{return check(await read())}catch(error){if(i>=40)throw error;await page.waitForTimeout(500)}}};
const types=state=>state.items.map(a=>a.type).sort();
try{
await page.goto(base+'/room-simulator.html');await page.waitForSelector('#loading',{state:'detached'});await mkdir('artifacts',{recursive:true});
// With no furniture yet there is no bed to lie in: the view is refused and the button stays unpressed.
await page.getByRole('button',{name:'床上',exact:true}).click();assert.match(await page.locator('#toast').innerText(),/請先加入一張床/);assert.notEqual(await page.getByRole('button',{name:'床上',exact:true}).getAttribute('aria-pressed'),'true');
await page.locator('#importFile').setInputFiles({name:'layout.json',mimeType:'application/json',buffer:await readFile(new URL('./fixtures/current-layout.json',import.meta.url))});await settle();
const before=await read();
await page.getByRole('button',{name:`套用提案：${p.name}`,exact:true}).click();
const applied=await eventually(state=>{assert.deepEqual(state.decor,p.decor);assert.equal(state.items.length,before.items.length+p.accents.length);return state});
const bed=applied.items.find(a=>a.type==='nordli');assert.deepEqual(bed.cushions,p.bedding.cushions);assert.equal(bed.throwOn,false);assert.equal(await page.locator('#softThrow').isChecked(),false);
assert.equal(await page.getByLabel('紗簾',{exact:true}).inputValue(),'hallebracka');assert.equal(await page.getByLabel('主簾',{exact:true}).inputValue(),'kalamondin');
// Swap one layer on its own: the bedside lamp becomes a TÄRNABY, then undo brings the DEJSA back.
await page.getByLabel('更換IKEA DEJSA 桌燈',{exact:true}).selectOption('tarnaby');await eventually(state=>{assert.ok(types(state).includes('tarnaby'));assert.equal(types(state).includes('dejsa'),false)});
await page.getByRole('button',{name:'復原',exact:false}).click();await eventually(state=>assert.deepEqual(types(state),types(applied)));
await page.getByLabel('主簾',{exact:true}).focus();await page.getByLabel('主簾',{exact:true}).selectOption('ringblomma');await eventually(state=>assert.equal(state.decor.window.main.product,'ringblomma'));assert.match(await page.locator('#softPanel').innerText(),/目前沒有遮光層/);await eventually(()=>{});assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'主簾');
await page.getByRole('button',{name:'復原',exact:false}).click();await eventually(state=>assert.deepEqual(state.decor,p.decor));
for(const [light,label]of [['day','☀ 白天'],['night','☾ 夜晚']]){
 await page.getByRole('button',{name:label,exact:true}).click();if(light==='night')await page.locator('#ceilingLight').uncheck();
 await page.getByRole('button',{name:'立體全景',exact:true}).click();await settle();await page.screenshot({path:`artifacts/milktea-${light}-overview.png`});
 await page.getByRole('button',{name:'室內視角',exact:true}).click();await page.mouse.move(780,550);await page.mouse.down();await page.mouse.move(1100,550,{steps:12});await page.mouse.up();await settle();await page.screenshot({path:`artifacts/milktea-${light}-interior.png`});
 await page.getByRole('button',{name:'床上',exact:true}).click();await settle();assert.equal(await page.getByRole('button',{name:'床上',exact:true}).getAttribute('aria-pressed'),'true');await page.screenshot({path:`artifacts/milktea-${light}-bed.png`});
}
assert.deepEqual(errors,[]);console.log('PASS: milk tea applied, one layer swapped and undone, six screenshots in artifacts/');
}finally{await browser.close()}
