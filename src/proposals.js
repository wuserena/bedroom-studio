import {CATALOG,findPlacement,validPlacement,validateState,standingHeight,snapWallPlacement,pillowPoint} from './model.js';
import {surfaces,pointOn} from './surfaces.js';
// A proposal fills every soft-furnishing layer at once: bed textiles, window, floor, light, wall, small objects and storage.
// Table pieces: `on` lists surfaces in order of preference ('desk' is the first desk in the room), `at` is the spot as
// fractions of that surface's width and depth, `turn` faces a piece into the room, `bedside` keeps it within reach of the pillow.
// Wall pieces: `over` names the furniture they hang above and `shift` moves them along that wall in cm.
export const PROPOSALS=Object.freeze([
 {id:'milktea',name:'奶茶層次',source:'IKEA「如何為白色的居家空間增添暖意」',summary:'同一個奶茶色用深淺和材質疊出層次：紗簾加遮光簾、奶茶被套配棉絨與緹花靠枕，床上方一盞甜甜圈燈，床頭一盞蘑菇燈。',palette:['#f1e9dc','#ece2d2','#cdb9a2','#f08a2c'],
  decor:{floor:'oak',window:{sheer:{product:'hallebracka',open:.15},main:{product:'kalamondin',open:.85}}},
  bedding:{duvetColor:'#cdb9a2',pillowColor:'#f1e9dc',cushions:['sanelaBeige','svarthoBeige'],throwOn:false},
  accents:[{type:'varmblixt',on:['cab:shelf140','cab:counter'],at:[.5,.5],turn:270},{type:'dejsa',on:['cab:counter'],at:[.5,.3],bedside:true},{type:'aptitlig',on:['cab:counter'],at:[.5,.85],bedside:true},{type:'parlhagg',bouquet:'branchBeige',on:['cab:leftTop','desk'],at:[.5,.25]},{type:'fladis',on:['cab:leftTop','cab:left72'],at:[.5,.75]},{type:'fejka',on:['desk','cab:leftTop'],at:[.12,.15]},{type:'pegboard',over:'desk',shift:-28,mountHeight:110},{type:'kaffetrad',over:'desk',shift:32,mountHeight:105},{type:'rodalm',over:'bed',shift:0,mountHeight:125}]}]);
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
