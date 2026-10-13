import {CATALOG,findPlacement,validPlacement,validateState,standingHeight,snapWallPlacement,pillowPoint} from './model.js';
import {surfaces,pointOn} from './surfaces.js';
// A proposal fills every soft-furnishing layer at once: bed textiles, window, floor, light, wall, small objects and storage.
// Table pieces: `on` lists surfaces in order of preference ('desk' is the first desk in the room), `at` is the spot as
// fractions of that surface's width and depth, `turn` faces a piece into the room, `bedside` keeps it within reach of the pillow.
// Wall pieces: `over` names the furniture they hang above and `shift` moves them along that wall in cm.
// Shared by every proposal: the bedside tray, a plant on the desk, the basket and boxes that hold clutter by the window,
// and the wall pieces. Each proposal adds its own lamp at the bed head and its own vase beside the basket.
const BEDSIDE_TRAY={type:'aptitlig',on:['cab:counter'],at:[.5,.85],bedside:true},lamp=(type,extra={})=>({type,on:['cab:counter'],at:[.5,.3],bedside:true,...extra}),vase=(type,bouquet)=>({type,bouquet,on:['cab:leftTop','desk'],at:[.5,.25]});
const SHARED=[BEDSIDE_TRAY,{type:'fladis',on:['cab:leftTop','cab:left72'],at:[.5,.75]},{type:'fejka',on:['desk','cab:leftTop'],at:[.12,.15]},{type:'kvarnvik',on:['cab:left72'],at:[.5,.22]},{type:'kvarnvik',on:['cab:left72'],at:[.5,.68]},{type:'bekna',on:['cab:left40'],at:[.5,.22]},{type:'bekna',on:['cab:left40'],at:[.5,.68]},{type:'smarra',on:['cab:left9'],at:[.5,.25]},{type:'pegboard',over:'desk',shift:-28,mountHeight:110},{type:'kaffetrad',over:'desk',shift:32,mountHeight:105},{type:'rodalm',over:'bed',shift:0,mountHeight:125}];
const look=(sheer,sheerOpen,main,mainOpen,floor='oak')=>({floor,window:{sheer:{product:sheer,open:sheerOpen},main:{product:main,open:mainOpen}}}),bed=(duvetColor,pillowColor,...cushions)=>({duvetColor,pillowColor,cushions,throwOn:false});
export const PROPOSALS=Object.freeze([
 {id:'milktea',name:'奶茶層次',source:'IKEA「如何為白色的居家空間增添暖意」',summary:'同一個奶茶色用深淺和材質疊出層次：紗簾加遮光簾、奶茶被套配棉絨與緹花靠枕，床頭一盞甜甜圈燈，窗邊矮櫃用附蓋盒和編織籃收雜物。',palette:['#f1e9dc','#ece2d2','#cdb9a2','#f08a2c'],
  decor:look('hallebracka',.15,'kalamondin',.85),bedding:bed('#cdb9a2','#f1e9dc','sanelaBeige','svarthoBeige'),accents:[lamp('varmblixt',{turn:270}),vase('parlhagg','branchBeige'),...SHARED]},
 {id:'sheer',name:'晨光白紗',source:'IKEA「明亮通風的臥室 是一處靜謐的綠洲」',summary:'白紗簾濾過的日光，後面一道白色遮光捲簾；純白棉被配米色與乳白靠枕，床頭一盞乳白的蘑菇燈，透明瓶裡幾枝滿天星。',palette:['#f4f2ec','#f1ece2','#e6dccb','#d7c39e'],
  decor:look('matilda',.15,'fridansWhite',.9),bedding:bed('#f4f1ea','#efe6d8','hedsavWhite','sanelaBeige'),accents:[lamp('dejsa'),vase('berakna','babysWhite'),...SHARED]},
 {id:'blush',name:'霧粉清晨',source:'IKEA「Rest and recharge in style」「Back to beautiful basics」',summary:'霧粉配白與原木：粉紅紗簾加粉紅遮光簾、霧粉被套配粉色棉絨與乳白靠枕，床頭一盞粉色無線小燈，粉紅直紋瓶插白花。',palette:['#efd6d3','#e8cfcb','#f6f1ec','#e6c3c0'],
  decor:look('stenfro',.15,'vilborgPink',.85),bedding:bed('#e8cfcb','#f6f1ec','sanelaPink','hedsavWhite'),accents:[lamp('nodmast'),vase('gradvis','babysWhite'),...SHARED]},
 {id:'butter',name:'奶油暖黃',source:'IKEA「閒適的舒眠臥室」',summary:'很淡的奶油黃配淺木色，把相近的顏色放在一起：白紗加米色遮光簾、奶油被套配米色與乳白靠枕，床頭一盞黃色小燈，白瓶插黃色小菊。',palette:['#f1e7c4','#f7f4ea','#d6c6ae','#e9b93a'],
  decor:look('matilda',.15,'kalamondin',.85),bedding:bed('#f1e7c4','#f7f4ea','sanelaBeige','hedsavWhite'),accents:[lamp('spetsboj',{color:'#e9b93a'}),vase('stilren','daisyYellow'),...SHARED]},
 {id:'mist',name:'淺灰靜謐',source:'IKEA「打造寧靜舒適臥室的創意」「灰色靜謐的親子臥室」',summary:'淺灰與白當底、保留磁磚：白紗加淺灰遮光簾、淺灰被套，用一顆粉色棉絨靠枕和幾朵淺粉牡丹帶一點暖，床頭一盞白色小燈。',palette:['#d5d6d3','#f4f2ee','#c9c9c6','#e6c3c0'],
  decor:look('matilda',.15,'majgull',.85,'tile'),bedding:bed('#d5d6d3','#f4f2ee','sanelaPink','hedsavWhite'),accents:[lamp('spetsboj',{color:'#f1efe9'}),vase('berakna','peonyPink'),...SHARED]}]);
const TAG='proposal:',REACH=80,BEDS=new Set(['nordli','bed','single']),DESKS=new Set(['mittzon','desk']);
function placeAt(base,s,accent,items,room){for(const turn of accent.turn?[accent.turn,0]:[0,90]){const ew=turn?base.d:base.w,ed=turn?base.w:base.d;if(ew>s.w||ed>s.d)continue;const candidate={...base,...pointOn(s,accent.at[0],accent.at[1],ew,ed),angle:(s.angle+turn)%360,supportId:s.id,mountHeight:s.y};if(validPlacement(candidate,items,room).ok)return candidate;}return findPlacement(base,items,room,s.id);}
function hangOver(base,target,accent,items,room){if(target){const snapped=snapWallPlacement(base,target.x,target.z,room),candidate=snapped.angle===90?{...snapped,z:snapped.z+accent.shift}:{...snapped,x:snapped.x+accent.shift};if(validPlacement(candidate,items,room).ok)return candidate;}return findPlacement(base,items,room);}
// Swaps the room's soft furnishing for the proposal's. Large furniture and rugs stay exactly where the user put them;
// pieces with no valid spot are listed in `skipped` with the reason and the rest is still applied.
export function applyProposal(state,id){const p=PROPOSALS.find(v=>v.id===id);if(!p)throw Error('找不到這個佈置提案');const items=state.items.filter(a=>!CATALOG[a.type]?.tabletop&&!a.id.startsWith(TAG)).map(a=>a.type==='nordli'?{...a,...p.bedding,cushions:[...p.bedding.cushions]}:{...a}),skipped=[],bed=items.find(b=>BEDS.has(b.type)),desk=items.find(b=>DESKS.has(b.type)),head=bed&&pillowPoint(bed);
 p.accents.forEach((accent,i)=>{const c=CATALOG[accent.type],base={id:`${TAG}${p.id}-${i+1}`,type:accent.type,w:c.w,d:c.d,h:c.h,angle:0,color:accent.color||c.color,...(c.lamp?{lightOn:true}:{}),...(c.vase?{bouquet:accent.bouquet||c.bouquet}:{}),...(c.wallMounted?{mountHeight:accent.mountHeight}:{})};let placed=null;
  if(c.wallMounted){if(items.some(b=>b.type===accent.type))return;placed=hangOver(base,accent.over==='bed'?bed:desk,accent,items,state.room);if(!placed)return skipped.push(`${c.name}（牆面沒有空位）`);}
  else{const all=surfaces(items,state.room);for(const target of accent.on){const sid=target==='desk'?desk?.id:target,s=all.find(v=>v.id===sid);if(!s||standingHeight(base)>s.clear)continue;placed=placeAt(base,s,accent,items,state.room);if(placed)break;}
   if(!placed)return skipped.push(`${c.name}（檯面沒有空位）`);if(accent.bedside&&(!head||Math.hypot(placed.x-head.x,placed.z-head.z)>REACH))return skipped.push(`${c.name}（${head?'離枕頭太遠':'房間沒有床'}）`);}
  items.push(placed);});
 return {state:validateState({...state,decor:p.decor,items}),skipped};}
