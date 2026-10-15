import {CATALOG,findPlacement,validPlacement,validateState,standingHeight,snapWallPlacement,pillowPoint,wallFaces,corners} from './model.js';
import {surfaces,pointOn} from './surfaces.js';
// A proposal fills every soft-furnishing layer at once: bed textiles, window, floor, light, wall, small objects and storage.
// Table pieces: `on` lists surfaces in order of preference ('desk' is the first desk in the room), `at` is the spot as
// fractions of that surface's width and depth, `turn` faces a piece into the room, `bedside` keeps it within reach of the pillow.
// Wall pieces: `over` names the furniture they hang above and `shift` moves them along that wall in cm.
// Wall pieces may instead name a wall `face` to hang in the middle of, and `floor:'front'` stands a unit against the window wall
// just past the desk.
// Shared by every proposal: the bedside tray, a plant on the desk, the basket and boxes that hold clutter by the window
// and the pegboard. Each proposal adds its own lamp at the bed head, its own vase beside the basket and its own wall pieces.
const BEDSIDE_TRAY={type:'aptitlig',on:['cab:counter'],at:[.5,.85],bedside:true},lamp=(type,extra={})=>({type,on:['cab:counter'],at:[.5,.3],bedside:true,...extra}),vase=(type,bouquet)=>({type,bouquet,on:['cab:leftTop','desk'],at:[.5,.25]});
const STORAGE=[BEDSIDE_TRAY,{type:'fladis',on:['cab:leftTop','cab:left72'],at:[.5,.75]},{type:'fejka',on:['desk','cab:leftTop'],at:[.12,.15]},{type:'kvarnvik',on:['cab:left72'],at:[.5,.22]},{type:'kvarnvik',on:['cab:left72'],at:[.5,.68]},{type:'bekna',on:['cab:left40'],at:[.5,.22]},{type:'bekna',on:['cab:left40'],at:[.5,.68]},{type:'smarra',on:['cab:left9'],at:[.5,.1]},{type:'pegboard',over:'desk',shift:-28,mountHeight:110},
 // What the user asked to put away: skincare by the mirror, bags on hooks and in the shelf, papers in a locked box, souvenirs on show.
 {type:'mujiShelf',floor:'front'},{type:'hookRail',face:'column-window',mountHeight:95},{type:'skincareCaddy',on:['desk'],at:[.35,.2]},{type:'docBox',on:['cab:left9'],at:[.5,1]},{type:'souvenirs',on:['cab:shelf140','cab:shelf173'],at:[.5,.5]}];
// Keep the entry-right wall completely clear for the projected picture.
const CINEMA_STORAGE=STORAGE.filter(a=>!['pegboard','mujiShelf'].includes(a.type));
const RARERAW_STORAGE=CINEMA_STORAGE.filter(a=>a.type!=='fejka');
const mirror=(extra={})=>({type:'kaffetrad',over:'desk',shift:32,mountHeight:105,...extra}),picture=(art,extra={})=>({type:'rodalm',art,over:'bed',shift:0,mountHeight:125,...extra});
const look=(sheer,sheerOpen,main,mainOpen,floor='oak')=>({floor,window:{sheer:{product:sheer,open:sheerOpen},main:{product:main,open:mainOpen}}}),bed=(duvetColor,pillowColor,...cushions)=>({duvetColor,pillowColor,cushions,throwOn:false});
// Milk tea came from IKEA's own room ideas. The other three follow styles the user picked from Pinterest searches, so they
// differ in the kind of lamp, window dressing, cushion fabric and picture rather than only in colour; pieces marked 示意 are not products.
export const PROPOSALS=Object.freeze([
 {id:'milktea',name:'奶茶層次',source:'IKEA「如何為白色的居家空間增添暖意」',summary:'同一個奶茶色用深淺和材質疊出層次：紗簾加遮光簾、奶茶被套配棉絨與緹花靠枕，床頭一盞甜甜圈燈，窗邊矮櫃用附蓋盒和編織籃收雜物。',palette:['#f1e9dc','#ece2d2','#cdb9a2','#f08a2c'],
  decor:look('hallebracka',.15,'kalamondin',.85),bedding:bed('#cdb9a2','#f1e9dc','sanelaBeige','svarthoBeige'),accents:[lamp('varmblixt',{turn:270}),vase('parlhagg','branchBeige'),...STORAGE,mirror(),picture('blocks')]},
 {id:'muji',name:'無印日系',source:'Pinterest 搜尋「japandi muji small bedroom wood linen」',summary:'木色、白與亞麻，東西少、留白多：白紗後面一道往上拉的亞麻色羅馬簾，燕麥色寢具配亞麻靠枕，床頭一盞和紙圓球燈，牆上只掛一幅植物線稿，白瓶插一枝枯枝。',palette:['#f6f3ec','#ddd2bd','#cfc0a4','#c9a777'],
  decor:look('matilda',.15,'linenRoman',.85),bedding:bed('#ddd2bd','#f6f3ec','linenOat','hedsavWhite'),accents:[lamp('paperGlobe'),vase('stilren','branchBeige'),...STORAGE,picture('botanical')]},
 {id:'retro',name:'復古暖橘',source:'Pinterest 搜尋「retro 70s orange bedroom mushroom lamp cozy」',summary:'七〇年代的暖橘：奶油色寢具上放鏽橘與芥末黃的棉絨靠枕，焦糖色遮光簾，床頭一盞橘色蘑菇燈，牆上一幅橘色拱形與太陽的海報，黃玻璃瓶插橘色鬱金香。',palette:['#ead9bf','#b98456','#c4602f','#d6a23a'],
  decor:look('hallebracka',.15,'caramelDrape',.85),bedding:bed('#ead9bf','#f4ead8','velvetRust','velvetMustard'),accents:[lamp('mushroomOrange'),vase('kallarhals','tulipOrange'),...STORAGE,mirror(),picture('retroSun')]},
 {id:'nordic',name:'灰白北歐',source:'Pinterest 搜尋「scandinavian grey white black bedroom wood minimal cozy」',summary:'灰白當底、黑色只當點綴，保留磁磚：白紗加灰色遮光捲簾，白被套配炭黑與中灰靠枕，黑框抽象畫、黑框圓鏡，床頭一盞露出燈泡的黑色小燈，透明瓶插尤加利葉。',palette:['#f2f1ee','#dcdcd9','#a3a5a4','#333332'],
  decor:look('matilda',.15,'fridansGrey',.9,'tile'),bedding:bed('#f2f1ee','#dcdcd9','cottonCharcoal','cottonGrey'),accents:[lamp('tarnaby',{color:'#2b2b2a'}),vase('berakna','eucalyptus'),...STORAGE,mirror({color:'#2b2b2a'}),picture('abstractBlack',{color:'#2b2b2a'})]},
 {id:'cinema',name:'橘灰木質放映室',source:'Pinterest 小房間整合書桌、Japandi 收納床與橘灰北歐軟裝案例',rearrange:true,summary:'不是換色，而是換一套家具：圓角直紋木收納桌、米白曲木工作椅、暖橘燈芯絨懶骨頭、橘灰有機圖案厚織地毯與窗下直紋門矮櫃。NORDLI 收納床繼續當衣櫃，拱形化妝鏡與和紙燈增加材質層次；懶骨頭正對一進門右手的大白投影牆，牆面完全留空。',palette:['#f2eadb','#c99968','#b95f38','#8f918e'],
  decor:look('matilda',.14,'linenRoman',.9),bedding:bed('#ded9d0','#f5f0e7','checkerClay','boucleCream'),accents:[lamp('paperColumnLamp'),{type:'miniProjector',on:['cab:shelf140'],at:[.5,.5],turn:270},vase('stockholmVase','eucalyptus'),...CINEMA_STORAGE,{type:'tambourShelf',floor:'front'},{type:'archedMirror',on:['desk'],at:[.76,.22]},picture('warmGrid')]},
 {id:'rareraw',name:'暖橘彩鋼工作室',source:'Instagram MARAIS 瑪黑家居選物「Colorful Home Vibe with rareraw」與 rareraw 官方尺寸',rearrange:true,summary:'保留 rareraw 鋼件像積木般清楚的輪廓，但不使用綠色：奶油白鋼構書桌安定大面積，暖橘 POLES 立鏡、鈷藍 CITY BOYS 網籃、芥末黃桌燈與橘紅懶骨頭分散成小色塊，再用原木、銀灰與暖白織品把色彩接回房間。NORDLI 收納床與投影白牆繼續保留。',palette:['#eeeae0','#cda46f','#aeb4b5','#ef6b32','#4e86c5'],
  decor:look('matilda',.14,'fridansGrey',.9),bedding:bed('#e7e3dc','#f6f2e9','cottonGrey','velvetRust'),accents:[lamp('spetsboj',{color:'#e9b93a'}),{type:'miniProjector',on:['cab:shelf140'],at:[.5,.5],turn:270},vase('berakna','babysWhite'),...RARERAW_STORAGE,picture('warmGrid')]}]);
const TAG='proposal:',REACH=80,BEDS=new Set(['nordli','bed','single']),DESKS=new Set(['mittzon','storageDesk','flutedDesk','rarerawDesk','desk']);

function cinemaFurniture(state,p){const old=state.items,room=state.room,prior=type=>old.find(a=>a.type===type),make=(type,id,x,z,angle,extra={})=>{const c=CATALOG[type];return {id,type,x,z,w:c.w,d:c.d,h:c.h,angle,color:c.color,...extra}},bedOld=old.find(a=>BEDS.has(a.type)),chairOld=old.find(a=>['kangaroo','chair','dyvlinge'].includes(a.type)),podOld=prior('yogiboPod'),rugOld=old.find(a=>CATALOG[a.type]?.floorCovering),items=[
 make('graphicRug',rugOld?.id||'cinema-rug',230,105,0),
 make('nordli',bedOld?.id||'cinema-bed',200,233,90,{beddingSide:1,...p.bedding,cushions:[...p.bedding.cushions]}),
 make('flutedDesk',prior('mittzon')?.id||prior('desk')?.id||'cinema-desk',85,36,0),
 make('bentwoodChair',chairOld?.id||'cinema-chair',85,116,180),
 make('corduroyBeanbag',podOld?.id||'cinema-pod',230,110,270)
 ];for(const a of items){const v=validPlacement(a,items,room);if(!v.ok)throw Error(`影院配置的${CATALOG[a.type].name}放不下：${v.reason}`)}const dogOld=prior('gosigGolden');if(dogOld){const dog=findPlacement({...dogOld,supportId:undefined,mountHeight:undefined},items,room);if(dog)items.push(dog)}return items;}
function rarerawFurniture(state,p){const old=state.items,room=state.room,prior=type=>old.find(a=>a.type===type),make=(type,id,x,z,angle,extra={})=>{const c=CATALOG[type];return {id,type,x,z,w:c.w,d:c.d,h:c.h,angle,color:c.color,...extra}},bedOld=old.find(a=>BEDS.has(a.type)),chairOld=old.find(a=>['kangaroo','chair','dyvlinge','bentwoodChair','alterChair'].includes(a.type)),podOld=old.find(a=>['yogiboPod','corduroyBeanbag'].includes(a.type)),rugOld=old.find(a=>CATALOG[a.type]?.floorCovering),items=[
 make('signalRug',rugOld?.id||'rareraw-rug',230,105,0),
 make('nordli',bedOld?.id||'rareraw-bed',200,233,90,{beddingSide:1,...p.bedding,cushions:[...p.bedding.cushions]}),
 make('rarerawDesk',prior('flutedDesk')?.id||prior('mittzon')?.id||prior('desk')?.id||'rareraw-desk',85,36,0,{color:'#e9e5d8'}),
 make('alterChair',chairOld?.id||'rareraw-chair',85,101,180),
 make('corduroyBeanbag',podOld?.id||'rareraw-pod',215,105,270,{color:'#b95f38'}),
 make('flitTable',prior('flitTable')?.id||prior('nightstand')?.id||'rareraw-flit',75,150,0,{color:'#ef6b32'}),
 make('polesMirror',prior('polesMirror')?.id||'rareraw-mirror',282,140,90,{color:'#ef6b32'}),
 make('cityboysBasket',prior('cityboysBasket')?.id||'rareraw-basket',165,22.5,0,{color:'#4e86c5'})
 ];for(const a of items){const v=validPlacement(a,items,room);if(!v.ok)throw Error(`彩鋼配置的${CATALOG[a.type].name}放不下：${v.reason}`)}const dogOld=prior('gosigGolden');if(dogOld){const dog=findPlacement({...dogOld,supportId:undefined,mountHeight:undefined},items,room);if(dog)items.push(dog)}return items;}
function placeAt(base,s,accent,items,room){for(const turn of accent.turn?[accent.turn,0]:[0,90]){const ew=turn?base.d:base.w,ed=turn?base.w:base.d;if(ew>s.w||ed>s.d)continue;const candidate={...base,...pointOn(s,accent.at[0],accent.at[1],ew,ed),angle:(s.angle+turn)%360,supportId:s.id,mountHeight:s.y};if(validPlacement(candidate,items,room).ok)return candidate;}return findPlacement(base,items,room,s.id);}
// The first free spot along the window wall, starting where the desk ends so the unit stands beside it rather than in the corner.
function standByWindow(base,desk,items,room){const start=desk?Math.max(...corners(desk).map(p=>p.x)):0;for(let x=start+base.w/2+1;x<=room.width-base.w/2;x+=1){const candidate={...base,x,z:base.d/2,angle:0};if(validPlacement(candidate,items,room).ok)return candidate;}return findPlacement(base,items,room);}
function hangOver(base,target,accent,items,room){if(accent.face){const f=wallFaces(room).find(v=>v.id===accent.face),candidate=f&&snapWallPlacement(base,(f.x0+f.x1)/2,(f.z0+f.z1)/2,room);if(candidate&&validPlacement(candidate,items,room).ok)return candidate;return findPlacement(base,items,room);}if(target){const snapped=snapWallPlacement(base,target.x,target.z,room),candidate=snapped.angle===90?{...snapped,z:snapped.z+accent.shift}:{...snapped,x:snapped.x+accent.shift};if(validPlacement(candidate,items,room).ok)return candidate;}return findPlacement(base,items,room);}
// Swaps the room's soft furnishing for the proposal's. Large furniture and rugs stay exactly where the user put them;
// pieces with no valid spot are listed in `skipped` with the reason and the rest is still applied.
export function applyProposal(state,id){const p=PROPOSALS.find(v=>v.id===id);if(!p)throw Error('找不到這個佈置提案');const source=p.rearrange?(p.id==='rareraw'?rarerawFurniture(state,p):cinemaFurniture(state,p)):state.items,items=source.filter(a=>!CATALOG[a.type]?.tabletop&&!a.id.startsWith(TAG)).map(a=>a.type==='nordli'?{...a,...p.bedding,cushions:[...p.bedding.cushions]}:{...a}),skipped=[],bed=items.find(b=>BEDS.has(b.type)),desk=items.find(b=>DESKS.has(b.type)),head=bed&&pillowPoint(bed);
 p.accents.forEach((accent,i)=>{const c=CATALOG[accent.type],base={id:`${TAG}${p.id}-${i+1}`,type:accent.type,w:c.w,d:c.d,h:c.h,angle:0,color:accent.color||c.color,...(c.lamp?{lightOn:true}:{}),...(c.vase?{bouquet:accent.bouquet||c.bouquet}:{}),...(c.wallMounted?{mountHeight:accent.mountHeight}:{}),...(accent.art?{art:accent.art}:{})};let placed=null;
  if(accent.floor){placed=standByWindow(base,desk,items,state.room);if(!placed)return skipped.push(`${c.name}（地面沒有空位）`);}
  else if(c.wallMounted){if(items.some(b=>b.type===accent.type))return;placed=hangOver(base,accent.over==='bed'?bed:desk,accent,items,state.room);if(!placed)return skipped.push(`${c.name}（牆面沒有空位）`);}
  else{const all=surfaces(items,state.room);for(const target of accent.on){const sid=target==='desk'?desk?.id:target,s=all.find(v=>v.id===sid);if(!s||standingHeight(base)>s.clear)continue;placed=placeAt(base,s,accent,items,state.room);if(placed)break;}
   if(!placed)return skipped.push(`${c.name}（檯面沒有空位）`);if(accent.bedside&&(!head||Math.hypot(placed.x-head.x,placed.z-head.z)>REACH))return skipped.push(`${c.name}（${head?'離枕頭太遠':'房間沒有床'}）`);}
  items.push(placed);});
 return {state:validateState({...state,decor:p.decor,items}),skipped};}
