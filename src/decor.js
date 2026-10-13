// Room-level styling: floor finish, two-layer window dressing, cushions and vase bouquets. Pure data and geometry, no THREE.
export const FLOORS=Object.freeze({tile:{name:'現況磁磚'},oak:{name:'橡木紋木地板'}});
// layer 'sheer' filters daylight and hangs nearer the glass; layer 'main' is the curtain or blind for privacy or darkness and hangs on the room side (a main blind sits against the glass with the sheer in front of it).
export const WINDOW_PRODUCTS=Object.freeze({none:{name:'不裝',kind:'none'},
 matilda:{name:'IKEA MATILDA 白色紗簾',layer:'sheer',kind:'drape',color:'#f4f2ec',sheer:true,note:'2 件裝 145 × 250 cm，透光；需改短'},
 hallebracka:{name:'IKEA HÄLLEBRÄCKA 淺米色紗簾',layer:'sheer',kind:'drape',color:'#ece2d2',sheer:true,note:'2 件裝 145 × 250 cm，透光；需改短'},
 stenfro:{name:'IKEA STENFRÖ 粉紅色紗簾',layer:'sheer',kind:'drape',color:'#efd6d3',sheer:true,note:'2 件裝 145 × 250 cm，透光；需改短'},
 kalamondin:{name:'IKEA KALAMONDIN 米色遮光窗簾（左右拉開）',layer:'main',kind:'drape',color:'#d6c6ae',blackout:true,note:'2 件裝 145 × 250 cm，高度遮光；需改短'},
 vilborgPink:{name:'IKEA VILBORG 粉紅色遮光窗簾（左右拉開）',layer:'main',kind:'drape',color:'#e3c4c1',blackout:true,note:'2 件裝 145 × 250 cm，高度遮光；需改短'},
 majgull:{name:'IKEA MAJGULL 淺灰遮光窗簾（左右拉開）',layer:'main',kind:'drape',color:'#c9c9c6',blackout:true,note:'2 件裝 145 × 250 cm，高度遮光；需改短'},
 dytag:{name:'IKEA DYTÅG 米色亞麻窗簾（左右拉開）',layer:'main',kind:'drape',color:'#d8c8b0',note:'2 件裝 145 × 250 cm，濾光不遮光；需改短'},
 moalisa:{name:'IKEA MOALISA 淺粉窗簾（左右拉開）',layer:'main',kind:'drape',color:'#ecd3d0',note:'2 件裝 145 × 250 cm，不遮光；需改短'},
 fridansWhite:{name:'IKEA FRIDANS 白色遮光捲簾（往上拉）',layer:'main',kind:'roller',color:'#f1f0ec',blackout:true,note:'大窗 120 × 195 cm 兩幅、小窗 80 × 195 cm'},
 fridansGrey:{name:'IKEA FRIDANS 灰色遮光捲簾（往上拉）',layer:'main',kind:'roller',color:'#9a9c9c',blackout:true,note:'大窗 120 × 195 cm 兩幅、小窗 80 × 195 cm'},
 ringblomma:{name:'IKEA RINGBLOMMA 米色羅馬簾（往上拉）',layer:'main',kind:'roman',color:'#d9cdb8',note:'大窗 120 × 160 cm 兩幅、小窗 80 × 160 cm，濾光不遮光'}});
export const CUSHIONS=Object.freeze({match:{name:'同被套色小靠枕',fabric:'cotton'},sanelaBeige:{name:'IKEA SANELA 淺米色棉絨 50 × 50',color:'#e6dccb',fabric:'velvet'},svarthoBeige:{name:'IKEA SVARTHÖ 米色緹花 50 × 50',color:'#d9ccb6',fabric:'jacquard'},sanelaPink:{name:'IKEA SANELA 粉紅色棉絨 50 × 50',color:'#e6c3c0',fabric:'velvet'},hedsavWhite:{name:'IKEA HEDSÄV 淺乳白色棉質 50 × 50',color:'#f1ece2',fabric:'cotton'}});
export const BOUQUETS=Object.freeze({none:{name:'不插花',rise:0},branchBeige:{name:'米色人造枝（IKEA SMYCKA，需修剪）',rise:30,color:'#d9c9ae',head:'branch'},babysWhite:{name:'白色滿天星',rise:14,color:'#f7f5ee',head:'spray'},peonyPink:{name:'淺粉牡丹',rise:15,color:'#efb9bd',head:'ball'},daisyYellow:{name:'黃色小菊',rise:16,color:'#f2c63c',head:'daisy'},tulipOrange:{name:'橘色鬱金香',rise:18,color:'#ee7d2f',head:'tulip'},pampas:{name:'奶茶色蘆葦',rise:30,color:'#d9c4a3',head:'plume'}});
const layerOf=(raw,layer,fallback)=>{const product=typeof raw?.product==='string'&&Object.hasOwn(WINDOW_PRODUCTS,raw.product)&&(raw.product==='none'||WINDOW_PRODUCTS[raw.product].layer===layer)?raw.product:'none',open=Number.isFinite(raw?.open)?Math.min(1,Math.max(0,raw.open)):fallback,tinted=product!=='none'&&typeof raw?.color==='string'&&/^#[0-9a-f]{6}$/i.test(raw.color);return {product,open,...(tinted?{color:raw.color}:{})};};
export function validateDecor(raw){const floor=typeof raw?.floor==='string'&&Object.hasOwn(FLOORS,raw.floor)?raw.floor:'tile';return {floor,window:{sheer:layerOf(raw?.window?.sheer,'sheer',.2),main:layerOf(raw?.window?.main,'main',.8)}};}
export function validateCushions(raw){return Array.isArray(raw)?raw.filter(id=>typeof id==='string'&&Object.hasOwn(CUSHIONS,id)).slice(0,3):['match'];}
// A window can be darkened for sleep when either layer is a blackout product.
export const hasBlackout=decor=>['sheer','main'].some(k=>!!WINDOW_PRODUCTS[decor.window[k].product].blackout);
// Where the window air conditioner starts along the right wall (see the AC box in scene.js).
export const airConditionerStart=r=>110*r.depth/333;
const lerp=(a,b,t)=>a+(b-a)*t;
function layerLayout(r,{product,open,color},offset){const p=WINDOW_PRODUCTS[product],base={product,kind:p.kind,color:color||p.color,sheer:!!p.sheer,open,offset,rods:[],panels:[]};if(p.kind==='none')return null;const c=r.width/2;if(p.kind==='drape'){const half=Math.min(r.windowWidth/2+15,c-7),cover=lerp(half,30,open),top=r.highHeight-12,bottom=r.windowSill-15;
  // The small window sits between the joinery and the air conditioner, so its pair is short and gathers into narrow stacks.
  const s=r.highDepth*.5,sh=Math.min(r.smallWindowWidth/2+6,airConditionerStart(r)-1-s),scover=lerp(sh,10,open),stop=Math.min(r.smallWindowSill+r.smallWindowHeight+8,r.highHeight-4),sbottom=r.smallWindowSill-6;
  return {...base,rods:[{wall:'front',a0:c-half-5,a1:c+half+5,y:r.highHeight-10},{wall:'right',a0:s-sh-2,a1:s+sh+2,y:stop+2}],panels:[{wall:'front',a0:c-half,a1:c-half+cover,top,bottom},{wall:'front',a0:c+half-cover,a1:c+half,top,bottom},{wall:'right',a0:s-sh,a1:s-sh+scover,top:stop,bottom:sbottom},{wall:'right',a0:s+sh-scover,a1:s+sh,top:stop,bottom:sbottom}]};}
 const blind=(wall,a0,a1,sill,height)=>{const top=Math.min(sill+height+8,r.highHeight-1);return {wall,a0,a1,top,bottom:lerp(sill+1,top-14,open)}},half=r.windowWidth/2+8,s=r.highDepth*.5,sh=Math.min(r.smallWindowWidth/2+3,airConditionerStart(r)-1-s);return {...base,panels:[blind('front',c-half,c,r.windowSill,r.windowHeight),blind('front',c,c+half,r.windowSill,r.windowHeight),blind('right',s-sh,s+sh,r.smallWindowSill,r.smallWindowHeight)]};}
// Returns the dressed layers, window side first. Panels are given along their wall: a0..a1 is x on the front (large window)
// wall and z on the right (small window) wall; `offset` is the distance from the wall in cm.
export function dressingLayout(r,decor){const main=decor.window.main,blindMain=['roller','roman'].includes(WINDOW_PRODUCTS[main.product].kind);return [blindMain?layerLayout(r,main,6.5):null,layerLayout(r,decor.window.sheer,blindMain?14:12),blindMain?null:layerLayout(r,main,19)].filter(Boolean);}
