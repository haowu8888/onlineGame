(function(){
'use strict';

let _npcUid = 0;

const Effects={
  particleBurst(x,y,color,n=8){const frag=document.createDocumentFragment();const els=[];for(let i=0;i<n;i++){const p=document.createElement('div');p.className='effect-particle';Object.assign(p.style,{left:x+'px',top:y+'px',width:'6px',height:'6px',background:color,'--tx':(Math.random()-.5)*120+'px','--ty':(Math.random()-.5)*120+'px'});frag.appendChild(p);els.push(p)}document.body.appendChild(frag);setTimeout(()=>els.forEach(p=>p.remove()),800)},
  screenFlash(c){const f=document.createElement('div');f.className='screen-flash';f.style.background=c;document.body.appendChild(f);setTimeout(()=>f.remove(),500)},
  floatingText(t,x,y,c){const e=document.createElement('div');e.className='float-text';e.textContent=t;Object.assign(e.style,{left:x+'px',top:y+'px',color:c||'#d4a44a'});document.body.appendChild(e);setTimeout(()=>e.remove(),1000)},
  screenShake(){const g=document.querySelector('.game-container');if(g){g.classList.add('screen-shake');setTimeout(()=>g.classList.remove('screen-shake'),300)}},
  realmBreakthrough(){this.screenFlash('rgba(212,164,74,0.4)');this.particleBurst(window.innerWidth/2,window.innerHeight/2,'#d4a44a',20)},
  dropCard(item){const e=document.createElement('div');e.className='drop-card';const nm=document.createElement('div');nm.className='drop-card-name';nm.textContent=item.name;const ds=document.createElement('div');ds.className='drop-card-desc';ds.textContent=item.desc||'';e.appendChild(nm);e.appendChild(ds);document.body.appendChild(e);setTimeout(()=>e.remove(),2500)}
};

const REALMS=[
  {name:'凡人',expReq:0,baseAtk:10,baseDef:5,baseHp:100,baseSpi:50,lifespan:80,breakRate:1},
  {name:'练气',expReq:420,baseAtk:25,baseDef:12,baseHp:250,baseSpi:120,lifespan:150,breakRate:.82},
  {name:'筑基',expReq:1600,baseAtk:60,baseDef:30,baseHp:600,baseSpi:300,lifespan:300,breakRate:.62},
  {name:'金丹',expReq:8000,baseAtk:150,baseDef:75,baseHp:1500,baseSpi:750,lifespan:500,breakRate:.45},
  {name:'元婴',expReq:30000,baseAtk:400,baseDef:200,baseHp:4000,baseSpi:2000,lifespan:800,breakRate:.3},
  {name:'化神',expReq:100000,baseAtk:1000,baseDef:500,baseHp:10000,baseSpi:5000,lifespan:1500,breakRate:.2},
  {name:'渡劫',expReq:500000,baseAtk:3000,baseDef:1500,baseHp:30000,baseSpi:15000,lifespan:3000,breakRate:.1},
  {name:'大乘',expReq:2000000,baseAtk:10000,baseDef:5000,baseHp:100000,baseSpi:50000,lifespan:10000,breakRate:.05}
];

const SPIRIT_ROOTS=[
  {id:'gold',name:'金灵根',desc:'锐利如剑，攻击超群',icon:'🗡️',atkMul:1.2,defMul:1.1,hpMul:1.0,spiMul:.9},
  {id:'wood',name:'木灵根',desc:'生生不息，气血充沛',icon:'🌿',atkMul:.9,defMul:1.0,hpMul:1.3,spiMul:1.0},
  {id:'water',name:'水灵根',desc:'灵动如水，灵力深厚',icon:'💧',atkMul:1.0,defMul:.9,hpMul:1.0,spiMul:1.3},
  {id:'fire',name:'火灵根',desc:'烈焰焚天，攻强守弱',icon:'🔥',atkMul:1.35,defMul:.8,hpMul:.9,spiMul:1.0},
  {id:'earth',name:'土灵根',desc:'厚重如山，防御无双',icon:'⛰️',atkMul:.9,defMul:1.3,hpMul:1.2,spiMul:.9},
  {id:'chaos',name:'混沌灵根',desc:'万法归一，均衡之体',icon:'☯️',atkMul:1.1,defMul:1.1,hpMul:1.1,spiMul:1.1}
];
const SPIRIT_ROOTS_MAP=Object.fromEntries(SPIRIT_ROOTS.map(x=>[x.id,x]));

const SECTS=[
  {id:'sword',name:'剑宗',desc:'以剑入道，攻伐天下',icon:'⚔️',atkMul:1.2,defMul:1.0,expMul:1.0,craftMul:.9},
  {id:'alchemy',name:'丹宗',desc:'炼丹制药，济世修行',icon:'⚗️',atkMul:.9,defMul:1.0,expMul:1.0,craftMul:1.4},
  {id:'body',name:'体修宗',desc:'千锤百炼，金刚不坏',icon:'💪',atkMul:1.0,defMul:1.3,expMul:.9,craftMul:.9},
  {id:'myriad',name:'万法宗',desc:'博采众长，悟道为先',icon:'📖',atkMul:1.0,defMul:1.0,expMul:1.3,craftMul:1.1}
];
const SECTS_MAP=Object.fromEntries(SECTS.map(x=>[x.id,x]));

const TALENTS=[
  {id:'luck',name:'气运之子',desc:'天选之人，遇难成祥',effect:{luck:.2}},
  {id:'iron',name:'铜皮铁骨',desc:'天生异体，刀枪不入',effect:{defMul:1.3}},
  {id:'genius',name:'天纵奇才',desc:'修炼速度远超常人',effect:{expMul:1.3}},
  {id:'beauty',name:'仙姿玉骨',desc:'天生亲和，人见人爱',effect:{npcRelMul:1.5}},
  {id:'alchemist',name:'丹道天赋',desc:'炼丹成功率大增',effect:{craftRate:.3}},
  {id:'swordbone',name:'剑骨',desc:'天生剑体，攻击暴增',effect:{atkMul:1.25}},
  {id:'daobody',name:'先天道体',desc:'万中无一的修炼奇才',effect:{allStats:1.1}},
  {id:'longevity',name:'长生体质',desc:'寿元绵长，从容修行',effect:{lifeMul:1.3}},
  {id:'calm',name:'心如止水',desc:'心魔难侵，道心稳固',effect:{heartDemonResist:.5}},
  {id:'rich',name:'天生富贵',desc:'财运亨通，灵石不断',effect:{goldMul:2.0}}
];
const TALENTS_MAP=Object.fromEntries(TALENTS.map(x=>[x.id,x]));

const PERSONALITIES=[
  {id:'justice',name:'正义凛然',desc:'嫉恶如仇，正道之光',npcRelMul:1.1,shopDiscount:0,expMul:1.0,combatMul:1.0,alignShift:1},
  {id:'ruthless',name:'心狠手辣',desc:'不择手段，唯利是图',npcRelMul:.9,shopDiscount:0,expMul:1.0,combatMul:1.15,alignShift:-1},
  {id:'scholar',name:'博学多才',desc:'学富五车，触类旁通',npcRelMul:1.0,shopDiscount:0,expMul:1.1,combatMul:1.0,alignShift:0},
  {id:'merchant',name:'精明商贾',desc:'善于经商，低买高卖',npcRelMul:1.0,shopDiscount:.2,expMul:1.0,combatMul:1.0,alignShift:0},
  {id:'hermit',name:'隐世修行',desc:'独善其身，潜心悟道',npcRelMul:.8,shopDiscount:0,expMul:1.2,combatMul:1.0,alignShift:0}
];
const PERSONALITIES_MAP=Object.fromEntries(PERSONALITIES.map(x=>[x.id,x]));

const TERRAIN=[
  {name:'灵山',icon:'⛰️',cls:'mountain',danger:2,res:['mat001','mat007']},
  {name:'密林',icon:'🌲',cls:'forest',danger:1,res:['mat001','mat002']},
  {name:'废墟',icon:'🏚️',cls:'ruins',danger:3,res:['mat005','mat006']},
  {name:'城镇',icon:'🏘️',cls:'town',danger:0,res:[]},
  {name:'宗门',icon:'🏯',cls:'sect',danger:0,res:[]},
  {name:'水域',icon:'🌊',cls:'water',danger:2,res:['mat004','mat010']},
  {name:'荒漠',icon:'🏜️',cls:'desert',danger:3,res:['mat006','mat003']},
  {name:'禁地',icon:'⛩️',cls:'forbidden',danger:5,res:['mat009','mat008']},
  {name:'迷雾',icon:'🌫️',cls:'mist',danger:2,res:['mat010','mat011']},
  {name:'平原',icon:'🌿',cls:'plains',danger:1,res:['mat001','mat002']}
];

const TIME_COSTS={meditate:30,explore:7,battle:1,craft:15,breakthrough:90,rest:3,trade:1,npcInteract:1};

const MATERIALS=[
  {id:'mat001',name:'灵草',tier:0,desc:'普通灵草'},
  {id:'mat002',name:'铁矿石',tier:0,desc:'常见矿石'},
  {id:'mat003',name:'火灵石',tier:1,desc:'蕴含火灵力'},
  {id:'mat004',name:'冰灵石',tier:1,desc:'蕴含冰灵力'},
  {id:'mat005',name:'雷灵石',tier:2,desc:'蕴含雷灵力'},
  {id:'mat006',name:'金灵砂',tier:2,desc:'珍贵金属粉末'},
  {id:'mat007',name:'千年灵芝',tier:3,desc:'千年灵药'},
  {id:'mat008',name:'龙血草',tier:3,desc:'沾染龙血的灵草'},
  {id:'mat009',name:'凤凰羽',tier:4,desc:'凤凰遗落的羽毛'},
  {id:'mat010',name:'玄冰玉',tier:2,desc:'千年寒冰凝结'},
  {id:'mat011',name:'迷雾花',tier:1,desc:'迷雾中生长'},
  {id:'mat012',name:'紫金矿',tier:3,desc:'稀有矿石'},
  {id:'mat013',name:'蛇胆',tier:1,desc:'灵蛇胆囊'},
  {id:'mat014',name:'虎骨',tier:2,desc:'灵虎骨骼'},
  {id:'mat015',name:'月华露',tier:2,desc:'月光凝结灵露'},
  {id:'mat016',name:'星辰砂',tier:4,desc:'星辰陨落精华'},
  {id:'mat017',name:'青莲子',tier:1,desc:'水中灵莲种子'},
  {id:'mat018',name:'朱果',tier:2,desc:'万年一熟灵果'},
  {id:'mat019',name:'天雷木',tier:3,desc:'被天雷劈中灵木'},
  {id:'mat020',name:'混沌石',tier:5,desc:'混沌之力凝结'}
];
const MATERIALS_MAP=Object.fromEntries(MATERIALS.map(x=>[x.id,x]));

const EQUIPMENT=[
  {id:'eq001',name:'铁剑',type:'weapon',tier:0,atk:5,def:0,hp:0,spi:0,quality:'common',desc:'普通铁剑'},
  {id:'eq002',name:'布衣',type:'armor',tier:0,atk:0,def:3,hp:20,spi:0,quality:'common',desc:'普通布衣'},
  {id:'eq003',name:'木戒',type:'accessory',tier:0,atk:0,def:0,hp:0,spi:10,quality:'common',desc:'木制戒指'},
  {id:'eq004',name:'精铁剑',type:'weapon',tier:1,atk:12,def:0,hp:0,spi:0,quality:'common',desc:'精铁锻造'},
  {id:'eq005',name:'皮甲',type:'armor',tier:1,atk:0,def:8,hp:40,spi:0,quality:'common',desc:'灵兽皮甲'},
  {id:'eq006',name:'灵石戒',type:'accessory',tier:1,atk:2,def:0,hp:0,spi:25,quality:'uncommon',desc:'嵌灵石戒指'},
  {id:'eq007',name:'青锋剑',type:'weapon',tier:2,atk:25,def:0,hp:0,spi:10,quality:'uncommon',desc:'青色长剑'},
  {id:'eq008',name:'玄铁甲',type:'armor',tier:2,atk:0,def:18,hp:80,spi:0,quality:'uncommon',desc:'玄铁锻造'},
  {id:'eq009',name:'聚灵佩',type:'accessory',tier:2,atk:0,def:5,hp:0,spi:50,quality:'uncommon',desc:'聚灵玉佩'},
  {id:'eq010',name:'赤炎刀',type:'weapon',tier:2,atk:30,def:0,hp:0,spi:5,quality:'rare',desc:'火焰之刀'},
  {id:'eq011',name:'寒冰扇',type:'weapon',tier:2,atk:22,def:5,hp:0,spi:20,quality:'rare',desc:'寒冰折扇'},
  {id:'eq012',name:'灵蚕丝袍',type:'armor',tier:2,atk:0,def:22,hp:100,spi:15,quality:'rare',desc:'灵蚕编织'},
  {id:'eq013',name:'龙鳞剑',type:'weapon',tier:3,atk:55,def:10,hp:0,spi:15,quality:'rare',desc:'镶嵌龙鳞'},
  {id:'eq014',name:'金丝甲',type:'armor',tier:3,atk:0,def:40,hp:200,spi:10,quality:'rare',desc:'金丝编织'},
  {id:'eq015',name:'通灵玉',type:'accessory',tier:3,atk:10,def:10,hp:50,spi:100,quality:'rare',desc:'通灵宝玉'},
  {id:'eq016',name:'天星剑',type:'weapon',tier:3,atk:70,def:0,hp:0,spi:30,quality:'epic',desc:'蕴含星力'},
  {id:'eq017',name:'紫金战甲',type:'armor',tier:3,atk:10,def:55,hp:300,spi:0,quality:'epic',desc:'紫金打造'},
  {id:'eq018',name:'凤血坠',type:'accessory',tier:3,atk:15,def:15,hp:100,spi:120,quality:'epic',desc:'凤血淬炼'},
  {id:'eq019',name:'灭魔剑',type:'weapon',tier:4,atk:120,def:0,hp:0,spi:40,quality:'epic',desc:'专克魔道'},
  {id:'eq020',name:'天蚕甲',type:'armor',tier:4,atk:0,def:80,hp:500,spi:30,quality:'epic',desc:'天蚕丝编'},
  {id:'eq021',name:'轮回戒',type:'accessory',tier:4,atk:25,def:25,hp:200,spi:180,quality:'epic',desc:'轮回之力'},
  {id:'eq022',name:'破天剑',type:'weapon',tier:4,atk:160,def:10,hp:0,spi:50,quality:'legendary',desc:'可斩破天'},
  {id:'eq023',name:'混元袍',type:'armor',tier:4,atk:0,def:110,hp:800,spi:50,quality:'legendary',desc:'混元护体'},
  {id:'eq024',name:'太极玉',type:'accessory',tier:4,atk:30,def:30,hp:300,spi:250,quality:'legendary',desc:'太极之力'},
  {id:'eq025',name:'诛仙剑',type:'weapon',tier:5,atk:300,def:20,hp:0,spi:80,quality:'legendary',desc:'上古诛仙'},
  {id:'eq026',name:'星辰战甲',type:'armor',tier:5,atk:20,def:180,hp:1200,spi:60,quality:'legendary',desc:'星辰凝聚'},
  {id:'eq027',name:'鸿蒙珠',type:'accessory',tier:5,atk:50,def:50,hp:500,spi:400,quality:'legendary',desc:'开天辟地'},
  {id:'eq028',name:'天道剑',type:'weapon',tier:6,atk:500,def:30,hp:0,spi:120,quality:'mythic',desc:'天道化剑'},
  {id:'eq029',name:'混沌神甲',type:'armor',tier:6,atk:30,def:300,hp:2000,spi:100,quality:'mythic',desc:'混沌铸就'},
  {id:'eq030',name:'造化玉碟',type:'accessory',tier:6,atk:80,def:80,hp:800,spi:600,quality:'mythic',desc:'造化之力'},
  {id:'eq031',name:'灵木杖',type:'weapon',tier:1,atk:8,def:0,hp:10,spi:15,quality:'common',desc:'灵木法杖'},
  {id:'eq032',name:'藤甲',type:'armor',tier:1,atk:0,def:6,hp:50,spi:5,quality:'common',desc:'灵藤编织'},
  {id:'eq033',name:'骨戒',type:'accessory',tier:1,atk:3,def:0,hp:0,spi:20,quality:'common',desc:'灵兽骨制'},
  {id:'eq034',name:'紫电剑',type:'weapon',tier:3,atk:65,def:5,hp:0,spi:25,quality:'epic',desc:'雷电加持'},
  {id:'eq035',name:'玄武盾甲',type:'armor',tier:3,atk:0,def:50,hp:250,spi:20,quality:'epic',desc:'玄武神力'},
  {id:'eq036',name:'朱雀羽扇',type:'weapon',tier:4,atk:140,def:0,hp:0,spi:60,quality:'legendary',desc:'朱雀之焰'},
  {id:'eq037',name:'白虎爪',type:'weapon',tier:5,atk:280,def:40,hp:0,spi:70,quality:'legendary',desc:'白虎之威'},
  {id:'eq038',name:'青龙铠',type:'armor',tier:5,atk:15,def:200,hp:1500,spi:80,quality:'legendary',desc:'青龙之护'},
  {id:'eq039',name:'仙人披风',type:'armor',tier:6,atk:50,def:250,hp:1800,spi:150,quality:'mythic',desc:'仙人遗物'},
  {id:'eq040',name:'盘古斧',type:'weapon',tier:7,atk:800,def:50,hp:500,spi:200,quality:'mythic',desc:'开天辟地'}
];
const EQUIPMENT_MAP=Object.fromEntries(EQUIPMENT.map(x=>[x.id,x]));

/* ---- 坐骑系统 ---- */
const MOUNTS=[
  {id:'mnt_horse',name:'踏云驹',icon:'🐴',tier:0,speedBonus:0.3,atkBonus:0,defBonus:0,cost:500,realmReq:0,desc:'行走如风，探索耗时-30%'},
  {id:'mnt_wolf',name:'苍狼',icon:'🐺',tier:1,speedBonus:0.2,atkBonus:8,defBonus:3,cost:1200,realmReq:1,desc:'凶猛灵兽，攻击+8 防御+3'},
  {id:'mnt_crane',name:'仙鹤',icon:'🦢',tier:1,speedBonus:0.4,atkBonus:0,defBonus:5,cost:1500,realmReq:2,desc:'御风飞行，探索耗时-40%'},
  {id:'mnt_tiger',name:'白虎',icon:'🐅',tier:2,speedBonus:0.25,atkBonus:20,defBonus:10,cost:3000,realmReq:3,desc:'上古灵兽，攻防大幅提升'},
  {id:'mnt_dragon',name:'幼龙',icon:'🐉',tier:3,speedBonus:0.5,atkBonus:35,defBonus:20,cost:8000,realmReq:5,desc:'龙族幼崽，探索耗时-50%，攻防极强'},
  {id:'mnt_phoenix',name:'赤焰凤凰',icon:'🔥',tier:4,speedBonus:0.5,atkBonus:50,defBonus:30,cost:15000,realmReq:7,desc:'不死神鸟，全属性极大提升'},
];
const MOUNTS_MAP=Object.fromEntries(MOUNTS.map(x=>[x.id,x]));

const MONSTERS=[
  {id:'mon01',name:'妖兔',realmMin:0,realmMax:1,terrain:'plains',hp:60,atk:8,def:3,exp:20,element:'earth',drops:[{id:'mat001',rate:.5}]},
  {id:'mon02',name:'灵蛇',realmMin:0,realmMax:1,terrain:'forest',hp:80,atk:12,def:4,exp:30,element:'wood',drops:[{id:'mat013',rate:.4}]},
  {id:'mon03',name:'石魔',realmMin:0,realmMax:2,terrain:'mountain',hp:120,atk:10,def:10,exp:40,element:'earth',drops:[{id:'mat002',rate:.5}]},
  {id:'mon04',name:'森林狼',realmMin:0,realmMax:1,terrain:'forest',hp:90,atk:15,def:5,exp:35,element:'wood',drops:[{id:'mat001',rate:.3}]},
  {id:'mon05',name:'毒蝎',realmMin:1,realmMax:2,terrain:'desert',hp:150,atk:25,def:12,exp:60,element:'fire',drops:[{id:'mat003',rate:.3}]},
  {id:'mon06',name:'水鬼',realmMin:1,realmMax:2,terrain:'water',hp:180,atk:20,def:15,exp:55,element:'water',drops:[{id:'mat004',rate:.3}]},
  {id:'mon07',name:'赤焰虎',realmMin:2,realmMax:3,terrain:'mountain',hp:400,atk:55,def:28,exp:150,element:'fire',drops:[{id:'mat014',rate:.3},{id:'eq010',rate:.05}]},
  {id:'mon08',name:'玄冰蟒',realmMin:2,realmMax:3,terrain:'water',hp:450,atk:50,def:35,exp:160,element:'water',drops:[{id:'mat010',rate:.3},{id:'eq011',rate:.05}]},
  {id:'mon09',name:'九尾妖狐',realmMin:2,realmMax:4,terrain:'mist',hp:350,atk:60,def:20,exp:180,element:'fire',drops:[{id:'mat015',rate:.3},{id:'eq012',rate:.04}]},
  {id:'mon10',name:'雷翼鹰',realmMin:2,realmMax:3,terrain:'mountain',hp:300,atk:65,def:15,exp:140,element:'metal',drops:[{id:'mat005',rate:.3}]},
  {id:'mon11',name:'地裂熊',realmMin:3,realmMax:4,terrain:'forest',hp:800,atk:100,def:60,exp:300,element:'earth',drops:[{id:'mat014',rate:.4},{id:'eq014',rate:.04}]},
  {id:'mon12',name:'幽冥鬼修',realmMin:3,realmMax:4,terrain:'ruins',hp:700,atk:120,def:40,exp:350,element:'water',drops:[{id:'mat005',rate:.3},{id:'eq016',rate:.03}]},
  {id:'mon13',name:'蛟龙',realmMin:4,realmMax:5,terrain:'water',hp:2000,atk:300,def:150,exp:800,element:'water',drops:[{id:'mat008',rate:.3},{id:'eq019',rate:.03}]},
  {id:'mon14',name:'凤凰幼雏',realmMin:4,realmMax:5,terrain:'forbidden',hp:1800,atk:350,def:120,exp:900,element:'fire',drops:[{id:'mat009',rate:.2},{id:'eq022',rate:.02}]},
  {id:'mon15',name:'天魔',realmMin:5,realmMax:6,terrain:'forbidden',hp:5000,atk:700,def:350,exp:2000,element:'metal',drops:[{id:'mat016',rate:.2},{id:'eq025',rate:.02}]},
  {id:'mon16',name:'上古凶兽',realmMin:5,realmMax:6,terrain:'forbidden',hp:6000,atk:600,def:400,exp:2500,element:'earth',drops:[{id:'mat019',rate:.3},{id:'eq026',rate:.02}]},
  {id:'mon17',name:'堕仙',realmMin:6,realmMax:7,terrain:'ruins',hp:15000,atk:2000,def:1000,exp:8000,element:'metal',drops:[{id:'mat020',rate:.1},{id:'eq028',rate:.01}]},
  {id:'mon18',name:'混沌兽',realmMin:6,realmMax:7,terrain:'forbidden',hp:20000,atk:2500,def:1200,exp:10000,element:'earth',drops:[{id:'mat020',rate:.15},{id:'eq029',rate:.01}]},
  {id:'mon19',name:'妖皇',realmMin:5,realmMax:7,terrain:'mountain',hp:10000,atk:1500,def:800,exp:5000,element:'fire',drops:[{id:'mat012',rate:.3},{id:'eq037',rate:.02}]},
  {id:'mon20',name:'魔尊',realmMin:6,realmMax:7,terrain:'ruins',hp:25000,atk:3000,def:1500,exp:15000,element:'fire',drops:[{id:'mat020',rate:.2},{id:'eq040',rate:.005}]},
  // Spirit beasts (特定地形灵兽)
  {id:'mon_sb1',name:'青鸾',realmMin:2,realmMax:5,terrain:'mountain',hp:1200,atk:200,def:80,exp:600,element:'metal',spiritBeast:true,drops:[{id:'mat009',rate:.25},{id:'mat007',rate:.4},{id:'eq016',rate:.06}]},
  {id:'mon_sb2',name:'蛟龙',realmMin:3,realmMax:6,terrain:'water',hp:2500,atk:350,def:180,exp:1000,element:'water',spiritBeast:true,drops:[{id:'mat008',rate:.3},{id:'mat010',rate:.5},{id:'eq019',rate:.05}]},
  {id:'mon_sb3',name:'灵猿',realmMin:1,realmMax:4,terrain:'forest',hp:800,atk:150,def:50,exp:400,element:'wood',spiritBeast:true,drops:[{id:'mat007',rate:.3},{id:'mat018',rate:.4},{id:'eq013',rate:.06}]}
];
const MONSTERS_MAP=Object.fromEntries(MONSTERS.map(x=>[x.id,x]));

const RECIPES=[
  {id:'rec01',name:'回灵丹',tier:0,materials:[{id:'mat001',count:3}],rate:.9,effect:{type:'healHp',value:50},desc:'恢复50气血'},
  {id:'rec02',name:'聚气丹',tier:0,materials:[{id:'mat001',count:2},{id:'mat017',count:1}],rate:.85,effect:{type:'healSp',value:40},desc:'恢复40灵力'},
  {id:'rec03',name:'破境丹',tier:1,materials:[{id:'mat003',count:2},{id:'mat001',count:3}],rate:.6,effect:{type:'breakBonus',value:.1},desc:'突破成功率+10%'},
  {id:'rec04',name:'洗髓丹',tier:1,materials:[{id:'mat004',count:2},{id:'mat011',count:2}],rate:.55,effect:{type:'expBoost',value:100},desc:'获得100经验'},
  {id:'rec05',name:'续命丹',tier:2,materials:[{id:'mat007',count:1},{id:'mat015',count:2}],rate:.4,effect:{type:'addLife',value:20},desc:'增加20年寿命'},
  {id:'rec06',name:'解毒丹',tier:0,materials:[{id:'mat001',count:2},{id:'mat011',count:1}],rate:.9,effect:{type:'cure',value:1},desc:'解除中毒'},
  {id:'rec07',name:'铁壁丹',tier:1,materials:[{id:'mat002',count:3},{id:'mat006',count:1}],rate:.65,effect:{type:'buffDef',value:20},desc:'战斗防御+20'},
  {id:'rec08',name:'狂暴丹',tier:1,materials:[{id:'mat003',count:2},{id:'mat013',count:2}],rate:.6,effect:{type:'buffAtk',value:30},desc:'战斗攻击+30'},
  {id:'rec09',name:'凝神丹',tier:1,materials:[{id:'mat015',count:2},{id:'mat017',count:2}],rate:.55,effect:{type:'healSp',value:150},desc:'恢复150灵力'},
  {id:'rec10',name:'化毒丹',tier:2,materials:[{id:'mat013',count:3},{id:'mat011',count:2}],rate:.5,effect:{type:'dmgPoison',value:50},desc:'对敌施加毒伤'},
  {id:'rec11',name:'金丹',tier:3,materials:[{id:'mat007',count:2},{id:'mat012',count:1},{id:'mat006',count:3}],rate:.3,effect:{type:'breakBonus',value:.2},desc:'突破成功率+20%'},
  {id:'rec12',name:'元婴丹',tier:4,materials:[{id:'mat008',count:2},{id:'mat016',count:1}],rate:.2,effect:{type:'breakBonus',value:.25},desc:'突破成功率+25%'},
  {id:'rec13',name:'天劫丹',tier:5,materials:[{id:'mat019',count:2},{id:'mat009',count:1}],rate:.15,effect:{type:'breakBonus',value:.3},desc:'突破成功率+30%'},
  {id:'rec14',name:'不死丹',tier:4,materials:[{id:'mat008',count:2},{id:'mat007',count:3}],rate:.15,effect:{type:'addLife',value:100},desc:'增加100年寿命'},
  {id:'rec15',name:'混沌丹',tier:5,materials:[{id:'mat020',count:1},{id:'mat016',count:2}],rate:.1,effect:{type:'allStats',value:50},desc:'全属性+50'}
];
const RECIPES_MAP=Object.fromEntries(RECIPES.map(x=>[x.id,x]));

const SKILLS={
  sword:[
    {id:'sk_s1',name:'剑气斩',desc:'释放剑气攻击',reqLevel:25,cost:20,dmg:1.5,cd:0,path:'sword'},
    {id:'sk_s2',name:'万剑归宗',desc:'召唤剑雨',reqLevel:50,cost:40,dmg:2.5,cd:2,path:'sword'},
    {id:'sk_s3',name:'剑意无形',desc:'无形剑气必中',reqLevel:75,cost:60,dmg:3.5,cd:3,path:'sword'},
    {id:'sk_s4',name:'一剑破万法',desc:'无视防御的终极一剑',reqLevel:100,cost:100,dmg:6.0,cd:5,path:'sword'}
  ],
  alchemy:[
    {id:'sk_a1',name:'丹毒术',desc:'以丹毒伤敌',reqLevel:25,cost:15,dmg:1.2,cd:0,path:'alchemy'},
    {id:'sk_a2',name:'药王诀',desc:'战斗中炼丹回血',reqLevel:50,cost:30,dmg:0,cd:2,path:'alchemy',heal:true},
    {id:'sk_a3',name:'百毒不侵',desc:'免疫负面状态',reqLevel:75,cost:50,dmg:0,cd:4,path:'alchemy',shield:true},
    {id:'sk_a4',name:'造化丹术',desc:'将敌人生命转化为己用',reqLevel:100,cost:80,dmg:4.0,cd:5,path:'alchemy',lifesteal:true}
  ],
  formation:[
    {id:'sk_f1',name:'困阵',desc:'减速敌人',reqLevel:25,cost:20,dmg:1.0,cd:0,path:'formation'},
    {id:'sk_f2',name:'杀阵',desc:'阵法攻击',reqLevel:50,cost:40,dmg:2.8,cd:2,path:'formation'},
    {id:'sk_f3',name:'护阵',desc:'阵法护盾',reqLevel:75,cost:50,dmg:0,cd:3,path:'formation',shield:true},
    {id:'sk_f4',name:'九宫八卦阵',desc:'天地之力攻击',reqLevel:100,cost:90,dmg:5.5,cd:5,path:'formation'}
  ],
  body:[
    {id:'sk_b1',name:'金钟罩',desc:'减伤护体',reqLevel:25,cost:15,dmg:0,cd:0,path:'body',shield:true},
    {id:'sk_b2',name:'铁拳',desc:'肉身重击',reqLevel:50,cost:30,dmg:2.2,cd:1,path:'body'},
    {id:'sk_b3',name:'不动明王',desc:'大幅减伤',reqLevel:75,cost:50,dmg:0,cd:3,path:'body',shield:true},
    {id:'sk_b4',name:'肉身成圣',desc:'全属性暴增一回合',reqLevel:100,cost:80,dmg:5.0,cd:5,path:'body'}
  ],
  beast:[
    {id:'sk_v1',name:'灵兽冲击',desc:'召唤灵兽攻击',reqLevel:25,cost:20,dmg:1.5,cd:0,path:'beast'},
    {id:'sk_v2',name:'百兽齐鸣',desc:'群兽围攻',reqLevel:50,cost:40,dmg:2.5,cd:2,path:'beast'},
    {id:'sk_v3',name:'兽王护体',desc:'灵兽护盾',reqLevel:75,cost:50,dmg:0,cd:3,path:'beast',shield:true},
    {id:'sk_v4',name:'万兽朝凰',desc:'召唤万兽之王',reqLevel:100,cost:90,dmg:5.8,cd:5,path:'beast'}
  ]
};

const HEART_DEMON_SCENARIOS=[
  {id:1,text:'突破之际，眼前浮现过去杀戮的场景，鲜血染红了你的双手...',choices:[{text:'直面过去，坦然接受',correct:true,hd:-5,desc:'你坦然面对，心魔消退'},{text:'逃避现实，拒绝回忆',correct:false,hd:5,desc:'逃避使心魔更加强大'}]},
  {id:2,text:'一个声音在耳边低语："接受我的力量，你将无敌于世..."',choices:[{text:'坚定道心，拒绝诱惑',correct:true,hd:-5,desc:'你的道心更加坚定'},{text:'接受力量，管他后果',correct:false,hd:10,desc:'黑暗力量侵蚀了你'}]},
  {id:3,text:'你看到最珍视的人在受苦，一个声音说只要放弃修为就能救他...',choices:[{text:'识破幻象，保持清醒',correct:true,hd:-5,desc:'幻象消散，心魔退去'},{text:'放弃修为，冲向幻象',correct:false,hd:8,desc:'你被幻象所困'}]},
  {id:4,text:'镜中出现另一个你，充满杀意和疯狂...',choices:[{text:'与之对话，理解自己的阴暗面',correct:true,hd:-8,desc:'你接纳了完整的自己'},{text:'试图消灭镜中的自己',correct:false,hd:5,desc:'你无法消灭自己的一部分'}]},
  {id:5,text:'你站在悬崖边，脚下是无尽深渊，身后是来时的路...',choices:[{text:'纵身一跃，相信自己',correct:true,hd:-5,desc:'你跨越了恐惧'},{text:'退回安全的地方',correct:false,hd:3,desc:'你的道心产生了裂痕'}]},
  {id:6,text:'无数冤魂围绕着你，诉说着你曾经犯下的过错...',choices:[{text:'诚心忏悔，放下执念',correct:true,hd:-10,desc:'冤魂散去，你获得了解脱'},{text:'无视一切，强行突破',correct:false,hd:8,desc:'冤魂的怨气侵入了你的心神'}]},
  {id:7,text:'你回到了凡人时期的家，父母在等你回来吃饭...',choices:[{text:'含泪告别，继续前行',correct:true,hd:-5,desc:'你更加坚定了求道之心'},{text:'留在这里，不再修行',correct:false,hd:5,desc:'沉溺于幻象使你迷失'}]},
  {id:8,text:'你看到自己突破成功后，却变成了一个冷血无情的人...',choices:[{text:'我会保持本心',correct:true,hd:-5,desc:'你对自己有了更清醒的认识'},{text:'力量就是一切',correct:false,hd:8,desc:'你的心被力量所蒙蔽'}]},
  {id:9,text:'天道之声告诉你：修仙逆天，必遭天谴...',choices:[{text:'我命由我不由天',correct:true,hd:-8,desc:'你的意志坚如磐石'},{text:'也许我不该修仙...',correct:false,hd:5,desc:'你的道心动摇了'}]},
  {id:10,text:'你最强大的敌人出现在面前，实力远超于你...',choices:[{text:'即使必败也要战斗',correct:true,hd:-5,desc:'勇气战胜了恐惧'},{text:'跪地求饶',correct:false,hd:10,desc:'你的尊严碎了一地'}]},
  {id:11,text:'你看到了自己的死亡：孤独地死在一个无人知晓的角落...',choices:[{text:'接受终有一死的命运',correct:true,hd:-5,desc:'你对生死看淡了'},{text:'我不要死！我不能死！',correct:false,hd:5,desc:'对死亡的恐惧成为你的枷锁'}]},
  {id:12,text:'你的师父出现在面前，说你的天赋太差，不配修仙...',choices:[{text:'天赋不够，努力来凑',correct:true,hd:-5,desc:'你证明了自己的决心'},{text:'也许师父说得对...',correct:false,hd:5,desc:'自我怀疑削弱了你的道心'}]},
  {id:13,text:'无尽的寂寞笼罩着你，仿佛整个世界只剩你一人...',choices:[{text:'独行也是一种修行',correct:true,hd:-5,desc:'你在孤独中找到了宁静'},{text:'我受不了这种孤独...',correct:false,hd:5,desc:'孤独感侵蚀了你的心智'}]},
  {id:14,text:'一个绝美女子向你伸出手："跟我走，我给你一切..."',choices:[{text:'美色不过是幻象',correct:true,hd:-5,desc:'你戳破了幻象'},{text:'握住她的手',correct:false,hd:8,desc:'你沉溺于温柔乡'}]},
  {id:15,text:'你面前有两条路，一条通向光明但充满荆棘，一条平坦但黑暗...',choices:[{text:'选择荆棘之路',correct:true,hd:-8,desc:'你选择了正确的道路'},{text:'选择平坦之路',correct:false,hd:5,desc:'捷径往往是陷阱'}]},
  {id:16,text:'你曾经的挚友站在对面，手中持剑指向你...',choices:[{text:'放下武器，以诚相待',correct:true,hd:-5,desc:'友情化解了敌意'},{text:'先下手为强',correct:false,hd:8,desc:'冲动让你失去了朋友'}]},
  {id:17,text:'你看到无数修仙者在争夺一件宝物，自相残杀...',choices:[{text:'转身离去，宝物非我所求',correct:true,hd:-8,desc:'你超脱了贪欲'},{text:'加入争夺',correct:false,hd:5,desc:'贪念蒙蔽了你的心'}]},
  {id:18,text:'你的肉身开始腐朽，灵魂在剥离...',choices:[{text:'以道心凝聚自身',correct:true,hd:-5,desc:'你的存在不依赖肉身'},{text:'疯狂挣扎',correct:false,hd:10,desc:'恐惧将你吞噬'}]},
  {id:19,text:'一面巨镜映出你修仙路上所有的牺牲...',choices:[{text:'每一步都是我的选择，无悔',correct:true,hd:-10,desc:'你接纳了一切因果'},{text:'如果重来我不会修仙',correct:false,hd:8,desc:'后悔动摇了道基'}]},
  {id:20,text:'你被困在永恒轮回中，每次都死在同一刻...',choices:[{text:'寻找细微差异打破轮回',correct:true,hd:-5,desc:'智慧让你超越了宿命'},{text:'放弃抵抗接受命运',correct:false,hd:5,desc:'你屈服于命运'}]},
  {id:21,text:'你的道侣背叛了你，投靠魔道...',choices:[{text:'审视自己是否有过失',correct:true,hd:-5,desc:'反思让你心境更上层楼'},{text:'誓要将叛徒碎尸万段',correct:false,hd:8,desc:'仇恨蒙蔽了双眼'}]},
  {id:22,text:'天劫雷电劈中了你最爱之人...',choices:[{text:'悲痛但不迷失自我',correct:true,hd:-5,desc:'你学会了在悲伤中前行'},{text:'对天怒吼发誓毁天灭地',correct:false,hd:10,desc:'极端情绪化为心魔'}]},
  {id:23,text:'你发现自己修炼的功法有巨大副作用...',choices:[{text:'正视缺陷，逐步修正',correct:true,hd:-8,desc:'你完善了自己的道路'},{text:'不管了继续修炼',correct:false,hd:5,desc:'逃避问题只会让问题更大'}]},
  {id:24,text:'你站在功成名就的巅峰，却感到无比空虚...',choices:[{text:'放下执念，重新出发',correct:true,hd:-8,desc:'放下也是一种力量'},{text:'追求更多力量来填补空虚',correct:false,hd:8,desc:'贪婪永无止境'}]},
  {id:25,text:'你看到了大道的尽头，发现一切修行不过是镜花水月...',choices:[{text:'即使虚幻也要走自己的路',correct:true,hd:-10,desc:'你参透了道的真谛'},{text:'那修行还有什么意义',correct:false,hd:10,desc:'虚无主义吞噬了你的道心'}]},
];
const HEART_DEMON_SCENARIOS_MAP=Object.fromEntries(HEART_DEMON_SCENARIOS.map(x=>[x.id,x]));

const ENLIGHTENMENT_EVENTS=[
  {id:1,text:'修炼中，你感受到天地间剑意流转...',choices:[{text:'以身合剑，感悟剑道',path:'sword',prog:10,desc:'剑道感悟+10'},{text:'以意驭剑，体悟万法',path:'formation',prog:5,desc:'阵道感悟+5'}]},
  {id:2,text:'你发现一株千年灵药正在散发灵光...',choices:[{text:'研究其药性',path:'alchemy',prog:10,desc:'丹道感悟+10'},{text:'吸收灵气淬体',path:'body',prog:5,desc:'体道感悟+5'}]},
  {id:3,text:'一只灵兽在远处注视着你，眼中有灵性...',choices:[{text:'尝试与之沟通',path:'beast',prog:10,desc:'御兽道感悟+10'},{text:'观察其行为',path:'formation',prog:5,desc:'阵道感悟+5'}]},
  {id:4,text:'你感到体内灵力在以某种规律运转...',choices:[{text:'顺势引导，强化肉身',path:'body',prog:10,desc:'体道感悟+10'},{text:'感悟灵力运行的规律',path:'formation',prog:8,desc:'阵道感悟+8'}]},
  {id:5,text:'天空中星辰排列成奇特阵法...',choices:[{text:'参悟星辰阵法',path:'formation',prog:10,desc:'阵道感悟+10'},{text:'借星辰之力修炼',path:'sword',prog:5,desc:'剑道感悟+5'}]},
  {id:6,text:'你在古籍中发现一段关于剑道的记载...',choices:[{text:'深入研究剑法',path:'sword',prog:8,desc:'剑道感悟+8'},{text:'研究古籍的炼丹篇',path:'alchemy',prog:8,desc:'丹道感悟+8'}]},
  {id:7,text:'你遇到了一位垂死的炼丹大师...',choices:[{text:'聆听他的丹道心得',path:'alchemy',prog:12,desc:'丹道感悟+12'},{text:'为他疗伤，感悟体道',path:'body',prog:5,desc:'体道感悟+5'}]},
  {id:8,text:'山林中传来阵阵兽吼，似有深意...',choices:[{text:'前往寻找声音源头',path:'beast',prog:8,desc:'御兽道感悟+8'},{text:'聆听其中蕴含的道韵',path:'sword',prog:5,desc:'剑道感悟+5'}]},
  {id:9,text:'你在瀑布下打坐，感受水流冲击...',choices:[{text:'借水势淬炼肉身',path:'body',prog:8,desc:'体道感悟+8'},{text:'感悟水之柔韧',path:'sword',prog:5,desc:'剑道感悟+5'}]},
  {id:10,text:'你发现一处天然阵法遗迹...',choices:[{text:'研究阵法原理',path:'formation',prog:12,desc:'阵道感悟+12'},{text:'利用阵法修炼',path:'alchemy',prog:5,desc:'丹道感悟+5'}]},
  {id:11,text:'一只受伤的灵兽倒在路边...',choices:[{text:'救治灵兽，建立联系',path:'beast',prog:12,desc:'御兽道感悟+12'},{text:'研究灵兽的伤势',path:'alchemy',prog:5,desc:'丹道感悟+5'}]},
  {id:12,text:'你梦中进入了一个剑冢...',choices:[{text:'逐一感受每把剑的剑意',path:'sword',prog:12,desc:'剑道感悟+12'},{text:'研究剑冢的布局',path:'formation',prog:8,desc:'阵道感悟+8'}]},
  {id:13,text:'你发现自己的身体对灵气有独特反应...',choices:[{text:'深入感悟身体变化',path:'body',prog:12,desc:'体道感悟+12'},{text:'记录下来研究',path:'alchemy',prog:5,desc:'丹道感悟+5'}]},
  {id:14,text:'你遇到一群灵兽在进行某种仪式...',choices:[{text:'观察学习兽族秘法',path:'beast',prog:10,desc:'御兽道感悟+10'},{text:'感悟仪式中的天地之力',path:'formation',prog:8,desc:'阵道感悟+8'}]},
  {id:15,text:'你在闭关中突然灵光一闪...',choices:[{text:'顺势突破，感悟大道',path:'sword',prog:8,desc:'剑道感悟+8'},{text:'稳固境界，夯实基础',path:'body',prog:8,desc:'体道感悟+8'}]}
];
const ENLIGHTENMENT_EVENTS_MAP=Object.fromEntries(ENLIGHTENMENT_EVENTS.map(x=>[x.id,x]));

const ACHIEVEMENTS=[
  {id:'a01',name:'初入修途',desc:'创建角色',type:'start',check:'realm>=0'},
  {id:'a02',name:'踏入修行',desc:'突破到练气期',type:'realm',check:'realm>=1'},
  {id:'a03',name:'筑基成功',desc:'突破到筑基期',type:'realm',check:'realm>=2'},
  {id:'a04',name:'结成金丹',desc:'突破到金丹期',type:'realm',check:'realm>=3'},
  {id:'a05',name:'元婴出窍',desc:'突破到元婴期',type:'realm',check:'realm>=4'},
  {id:'a06',name:'化神境',desc:'突破到化神期',type:'realm',check:'realm>=5'},
  {id:'a07',name:'渡劫成功',desc:'突破到渡劫期',type:'realm',check:'realm>=6'},
  {id:'a08',name:'大乘圆满',desc:'突破到大乘期',type:'realm',check:'realm>=7'},
  {id:'a09',name:'初战告捷',desc:'赢得第一场战斗',type:'battle',check:'kills>=1'},
  {id:'a10',name:'百战勇士',desc:'赢得100场战斗',type:'battle',check:'kills>=100'},
  {id:'a11',name:'屠龙勇者',desc:'击败蛟龙',type:'battle',check:'bossKills>=1'},
  {id:'a12',name:'炼丹入门',desc:'成功炼制第一颗丹药',type:'craft',check:'crafts>=1'},
  {id:'a13',name:'丹道宗师',desc:'成功炼制50颗丹药',type:'craft',check:'crafts>=50'},
  {id:'a14',name:'探索先锋',desc:'探索10个地图格子',type:'explore',check:'explored>=10'},
  {id:'a15',name:'地图大师',desc:'探索100个格子',type:'explore',check:'explored>=100'},
  {id:'a16',name:'交友广泛',desc:'认识10个NPC',type:'social',check:'knownNpcs>=10'},
  {id:'a17',name:'人缘极佳',desc:'与一个NPC好感度达到80',type:'social',check:'maxRelation>=80'},
  {id:'a18',name:'富甲一方',desc:'拥有10000灵石',type:'gold',check:'gold>=10000'},
  {id:'a19',name:'家财万贯',desc:'拥有100000灵石',type:'gold',check:'gold>=100000'},
  {id:'a20',name:'长命百岁',desc:'活过100岁',type:'age',check:'age>=100'},
  {id:'a21',name:'千年老妖',desc:'活过1000岁',type:'age',check:'age>=1000'},
  {id:'a22',name:'洞天福地',desc:'购买洞府',type:'cave',check:'hasCave'},
  {id:'a23',name:'悟道初成',desc:'任意悟道达到25',type:'enlighten',check:'maxEnlighten>=25'},
  {id:'a24',name:'大道三千',desc:'任意悟道达到100',type:'enlighten',check:'maxEnlighten>=100'},
  {id:'a25',name:'宗门栋梁',desc:'成为核心弟子',type:'sect',check:'sectRank>=3'},
  {id:'a26',name:'剑道巅峰',desc:'剑道悟道达到100',type:'path',check:'swordPath>=100'},
  {id:'a27',name:'丹道巅峰',desc:'丹道悟道达到100',type:'path',check:'alchemyPath>=100'},
  {id:'a28',name:'心如明镜',desc:'心魔值降为0',type:'demon',check:'heartDemon<=0'},
  {id:'a29',name:'装备齐全',desc:'三个装备槽都有装备',type:'equip',check:'fullEquip'},
  {id:'a30',name:'传奇猎手',desc:'获得一件传奇品质装备',type:'equip',check:'hasLegendary'}
];

const NPC_SURNAMES=['张','李','王','赵','刘','陈','杨','黄','周','吴','林','萧','叶','楚','慕容','上官','司马','诸葛'];
const NPC_NAMES=['逸风','清婉','天行','剑心','玄霜','紫烟','云飞','若水','傲天','幽兰','星辰','月华','凌波','飞雪','青云','含烟','无极','破军','红药','素心'];

const NPC_DIALOGUES=[
  '道友，修行之路漫漫，且行且珍惜。',
  '最近山中妖兽频繁出没，道友小心。',
  '我正在研究一种新的丹方，进展不错。',
  '你可曾去过那片禁地？据说那里有上古遗宝。',
  '宗门大比快到了，道友可要好好准备。',
  '这附近的灵气最近变浓了，适合修炼。',
  '我听说有人在废墟中发现了古修士的洞府。',
  '修行讲究心境，不可操之过急。',
  '道友实力精进不少啊，佩服佩服。',
  '最近坊市来了一批好货，要不要去看看？'
];

const CAVE_FACILITIES=[
  {id:'gather',name:'聚灵阵',desc:'提高修炼速度',maxLv:5,costs:[500,2000,8000,30000,100000],bonus:[{expMul:1.1},{expMul:1.2},{expMul:1.35},{expMul:1.5},{expMul:1.8}]},
  {id:'garden',name:'药园',desc:'自动产出灵草',maxLv:5,costs:[800,3000,10000,35000,120000],bonus:[{herbs:1},{herbs:2},{herbs:3},{herbs:5},{herbs:8}]},
  {id:'alchemy_room',name:'炼丹室',desc:'提高炼丹成功率',maxLv:5,costs:[1000,4000,15000,50000,150000],bonus:[{craftMul:1.1},{craftMul:1.2},{craftMul:1.35},{craftMul:1.5},{craftMul:1.8}]},
  {id:'library',name:'藏书阁',desc:'提高悟道速度',maxLv:5,costs:[600,2500,9000,32000,110000],bonus:[{enlightMul:1.1},{enlightMul:1.2},{enlightMul:1.35},{enlightMul:1.5},{enlightMul:1.8}]},
  {id:'arena',name:'练武场',desc:'提高战斗属性',maxLv:5,costs:[700,3000,12000,40000,130000],bonus:[{combatMul:1.05},{combatMul:1.1},{combatMul:1.2},{combatMul:1.3},{combatMul:1.5}]}
];
const CAVE_FACILITIES_MAP=Object.fromEntries(CAVE_FACILITIES.map(x=>[x.id,x]));

const AUCTION_ITEMS=[
  {id:'auc01',name:'九转还魂丹',quality:'mythic',basePrice:50000,desc:'起死回生',stats:{addLife:200}},
  {id:'auc02',name:'天外飞仙剑',quality:'mythic',basePrice:80000,desc:'天外之剑',stats:{atk:600}},
  {id:'auc03',name:'混沌灵甲',quality:'mythic',basePrice:70000,desc:'混沌之力护体',stats:{def:400}},
  {id:'auc04',name:'时光沙漏',quality:'legendary',basePrice:40000,desc:'减缓衰老',stats:{addLife:100}},
  {id:'auc05',name:'万兽令',quality:'legendary',basePrice:35000,desc:'召唤灵兽',stats:{beastPath:20}},
  {id:'auc06',name:'天机图',quality:'legendary',basePrice:30000,desc:'参悟天机',stats:{allPath:10}},
  {id:'auc07',name:'龙血玉',quality:'epic',basePrice:20000,desc:'龙族之血凝结',stats:{hpBonus:2000}},
  {id:'auc08',name:'凤凰涅槃丹',quality:'legendary',basePrice:45000,desc:'浴火重生',stats:{healFull:true}},
  {id:'auc09',name:'上古阵盘',quality:'epic',basePrice:25000,desc:'上古阵法',stats:{formationPath:20}},
  {id:'auc10',name:'剑道石碑拓本',quality:'epic',basePrice:22000,desc:'剑道秘法',stats:{swordPath:20}},
  {id:'auc11',name:'太上丹经',quality:'legendary',basePrice:38000,desc:'丹道至宝',stats:{alchemyPath:20}},
  {id:'auc12',name:'肉身圣药',quality:'epic',basePrice:28000,desc:'淬炼肉身',stats:{bodyPath:20}}
];

const SECT_EVENTS=[
  {id:'se1',text:'宗门遭到妖兽袭击！',effect:{type:'battle',danger:2}},
  {id:'se2',text:'宗门发现了一处秘境入口！',effect:{type:'bonus',exp:200}},
  {id:'se3',text:'宗门大比即将开始！',effect:{type:'tournament'}},
  {id:'se4',text:'一位长老闭关突破成功！',effect:{type:'buff',expMul:1.1,duration:1}},
  {id:'se5',text:'宗门收到了一批珍贵药材！',effect:{type:'gift',items:['mat007']}},
  {id:'se6',text:'敌对宗门来犯！',effect:{type:'war'}},
  {id:'se7',text:'宗门举办论道大会！',effect:{type:'bonus',enlighten:5}},
  {id:'se8',text:'有新弟子入门！',effect:{type:'newNpc'}}
];

// --- 悬赏令模板 (Phase 3G) ---
const BOUNTY_TEMPLATES_GG=[
  {id:'gb_kill_5',name:'除魔令',desc:'击杀5只妖兽',type:'kill',target:5,rewardGold:300,rewardExp:200,realmReq:0},
  {id:'gb_kill_15',name:'净世令',desc:'击杀15只妖兽',type:'kill',target:15,rewardGold:800,rewardExp:600,realmReq:1},
  {id:'gb_kill_boss',name:'诛魔令',desc:'击杀1只灵兽Boss',type:'boss_kill',target:1,rewardGold:1500,rewardExp:1000,realmReq:2},
  {id:'gb_explore_10',name:'探索令',desc:'探索10个地格',type:'explore',target:10,rewardGold:500,rewardExp:300,realmReq:0},
  {id:'gb_craft_3',name:'炼丹令',desc:'成功炼制3颗丹药',type:'craft',target:3,rewardGold:600,rewardExp:400,realmReq:1},
  {id:'gb_gold_3000',name:'聚财令',desc:'持有3000灵石',type:'gold',target:3000,rewardGold:500,rewardExp:300,realmReq:1},
  {id:'gb_npc_talk_5',name:'交友令',desc:'与NPC交谈5次',type:'npc_talk',target:5,rewardGold:400,rewardExp:300,realmReq:0},
  {id:'gb_enlighten_20',name:'悟道令',desc:'某项感悟达到20',type:'enlighten',target:20,rewardGold:1000,rewardExp:800,realmReq:2},
  {id:'gb_cave_upgrade',name:'筑基令',desc:'升级洞府1次',type:'cave_upgrade',target:1,rewardGold:500,rewardExp:400,realmReq:1},
  {id:'gb_kill_30',name:'屠魔令',desc:'击杀30只妖兽',type:'kill',target:30,rewardGold:2000,rewardExp:1500,realmReq:3},
  {id:'gb_break',name:'破境令',desc:'突破1次境界',type:'breakthrough',target:1,rewardGold:2500,rewardExp:2000,realmReq:1},
  {id:'gb_npc_favor_50',name:'交好令',desc:'某NPC好感达到50',type:'npc_favor',target:50,rewardGold:800,rewardExp:600,realmReq:1},
  {id:'gb_spar_3',name:'比武令',desc:'切磋3次',type:'spar',target:3,rewardGold:600,rewardExp:500,realmReq:1},
  {id:'gb_collect_herbs',name:'采药令',desc:'收集5份灵草',type:'collect_herb',target:5,rewardGold:400,rewardExp:200,realmReq:0},
  {id:'gb_kill_element',name:'五行猎手',desc:'击杀3种不同五行的怪物',type:'element_kills',target:3,rewardGold:1200,rewardExp:900,realmReq:2},
];

// NPC委托模板
const NPC_QUEST_TEMPLATES=[
  {id:'nq_herb',name:'采药委托',desc:'帮我采集3份灵草',type:'collect_herb',target:3,favorReq:20,rewardGold:200,favorGain:15},
  {id:'nq_spar',name:'切磋较量',desc:'与我切磋一场',type:'spar_with',target:1,favorReq:30,rewardGold:300,favorGain:20},
  {id:'nq_kill',name:'除害委托',desc:'帮忙清除5只妖兽',type:'kill',target:5,favorReq:20,rewardGold:400,favorGain:15},
  {id:'nq_craft',name:'炼丹委托',desc:'帮我炼制2颗丹药',type:'craft',target:2,favorReq:40,rewardGold:500,favorGain:20},
  {id:'nq_explore',name:'探路委托',desc:'探索5个未知地格',type:'explore',target:5,favorReq:30,rewardGold:350,favorGain:15},
  {id:'nq_gold',name:'筹资委托',desc:'帮我筹集1000灵石',type:'gold',target:1000,favorReq:50,rewardGold:300,favorGain:25},
];

const SHOP_ITEMS=[
  {id:'shop01',name:'回灵丹',price:40,type:'potion',effect:{healHp:50},desc:'恢复50气血'},
  {id:'shop02',name:'聚气丹',price:50,type:'potion',effect:{healSp:40},desc:'恢复40灵力'},
  {id:'shop03',name:'灵草',price:20,type:'material',matId:'mat001',desc:'基础灵草'},
  {id:'shop04',name:'铁矿石',price:25,type:'material',matId:'mat002',desc:'基础矿石'},
  {id:'shop05',name:'火灵石',price:80,type:'material',matId:'mat003',desc:'火灵力之石'},
  {id:'shop06',name:'冰灵石',price:80,type:'material',matId:'mat004',desc:'冰灵力之石'},
  {id:'shop07',name:'铁剑',price:100,type:'equipment',eqId:'eq001',desc:'基础武器'},
  {id:'shop08',name:'布衣',price:80,type:'equipment',eqId:'eq002',desc:'基础护甲'},
  {id:'shop09',name:'木戒',price:60,type:'equipment',eqId:'eq003',desc:'基础饰品'},
  {id:'shop10',name:'大回灵丹',price:180,type:'potion',effect:{healHp:200},desc:'恢复200气血'},
  {id:'shop11',name:'大聚气丹',price:220,type:'potion',effect:{healSp:180},desc:'恢复180灵力'},
  {id:'shop12',name:'悟道露',price:120,type:'potion',effect:{expBoost:120},desc:'立刻获得120经验'}
];


/* ==================== GuiguGame 类 ==================== */
class GuiguGame {
  constructor(){this.state=null;this.slotIndex=0;this.listeners={}}

  on(e,fn){(this.listeners[e]=this.listeners[e]||[]).push(fn)}
  emit(e,d){(this.listeners[e]||[]).forEach(fn=>fn(d))}

  getSaveSlots(){
    const slots=[];
    for(let i=0;i<3;i++){
      const d=Storage.get('guigu_save_'+i);
      if(d) slots.push({exists:true,name:d.name,realm:REALMS[d.realm].name,age:d.age,lifespan:REALMS[d.realm].lifespan*(d.talents.some(t=>t==='longevity')?1.3:1)});
      else slots.push({exists:false});
    }
    return slots;
  }

  createCharacter(cfg){
    const sr=SPIRIT_ROOTS_MAP[cfg.spiritRoot];
    const sect=SECTS_MAP[cfg.sect];
    const r=REALMS[0];
    const lifeMul=cfg.talents.includes('longevity')?1.3:1;
    this.slotIndex=cfg.slotIndex;
    this.state={
      name:cfg.name,spiritRoot:cfg.spiritRoot,sect:cfg.sect,
      talents:cfg.talents,personality:cfg.personality,
      sex:cfg.sex||'male',
      realm:0,exp:0,year:1,month:1,day:1,age:16,
      dualCultivation:{partnerId:null,daysLeft:0},
      hp:Math.floor(r.baseHp*sr.hpMul),maxHp:Math.floor(r.baseHp*sr.hpMul),
      sp:Math.floor(r.baseSpi*sr.spiMul),maxSp:Math.floor(r.baseSpi*sr.spiMul),
      atk:Math.floor(r.baseAtk*sr.atkMul),def:Math.floor(r.baseDef*sr.defMul),
      gold:100,inventory:[],
      equipment:{weapon:null,armor:null,accessory:null},
      activeSkills:[null,null,null,null],
      enlightenment:{sword:0,alchemy:0,formation:0,body:0,beast:0},
      knownNPCs:[],relations:{},heartDemon:0,alignment:0,
      map:null,fog:null,position:{x:7,y:7},
      cave:{owned:false,facilities:{}},
      sect_data:{contribution:0,rank:0},
      achievements:[],worldLog:[],battleState:null,
      npcs:[],cultLog:[],dead:false,
      kills:0,bossKills:0,crafts:0,explored:0,
      lifespan:Math.floor(r.lifespan*lifeMul),
      potions:[],buffAtk:0,buffDef:0,breakBonus:0,
      lastOnline:Date.now(),
      // 悬赏令 + NPC委托 (Phase 3G)
      activeBounties:[],bountyBoard:[],bountyRefreshDay:0,
      activeNpcQuests:[],completedNpcQuests:[],
      // 坐骑系统 (Phase 4H)
      ownedMounts:[],activeMount:null,
      mountFeed:0,mountRides:0,bountiesDone:0
    };

    const ggBonuses = Storage.get('xianyuan_guigu_bonuses', { mountFeed: 0 });
    if ((ggBonuses.mountFeed || 0) > 0) {
      this.state.mountFeed += ggBonuses.mountFeed;
      ggBonuses.mountFeed = 0;
      Storage.set('xianyuan_guigu_bonuses', ggBonuses);
    }

    this.generateMap();
    this.generateNPCs();
    this.revealFog(7,7,2);
    this.recalcStats();
    this.addWorldLog('你踏入了鬼谷世界，开始了修行之路。');
    this.saveGame();
  }

  loadGame(idx){
    this.slotIndex=idx;
    this.state=Storage.get('guigu_save_'+idx);
    if(this.state){
      // Backward compatibility for old saves
      this.state.sex=this.state.sex||'male';
      this.state.dualCultivation=this.state.dualCultivation||{partnerId:null,daysLeft:0};
      if(!this.state.lastOnline) this.state.lastOnline=Date.now();
      // Ensure NPCs have sex field
      (this.state.npcs||[]).forEach(npc=>{
        if(!npc.sex) npc.sex=Math.random()<0.5?'male':'female';
      });
      // Phase 3G backward compat
      if(!this.state.activeBounties) this.state.activeBounties=[];
      if(!this.state.bountyBoard) this.state.bountyBoard=[];
      if(!this.state.bountyRefreshDay) this.state.bountyRefreshDay=0;
      if(!this.state.activeNpcQuests) this.state.activeNpcQuests=[];
      if(!this.state.completedNpcQuests) this.state.completedNpcQuests=[];
      if(this.state.mountFeed===undefined) this.state.mountFeed=0;
      if(this.state.mountRides===undefined) this.state.mountRides=0;
      if(this.state.bountiesDone===undefined) this.state.bountiesDone=0;

      const ggBonuses = Storage.get('xianyuan_guigu_bonuses', { mountFeed: 0 });
      if ((ggBonuses.mountFeed || 0) > 0) {
        this.state.mountFeed += ggBonuses.mountFeed;
        ggBonuses.mountFeed = 0;
        Storage.set('xianyuan_guigu_bonuses', ggBonuses);
        showToast('仙缘兑换生效：坐骑亲密度提升！', 'success', 2000);
      }
      this.recalcStats();return true;
    }
    return false;
  }

  saveGame(){
    if(this.state){this.state.lastOnline=Date.now();Storage.setImmediate('guigu_save_'+this.slotIndex,this.state)}
  }

  _getDayKey(){
    const s=this.state;
    if(!s)return 0;
    return (s.day||1)+(s.month||1)*30+(s.year||1)*360;
  }

  _ensureNpcDaily(){
    const s=this.state;if(!s)return;
    const k=this._getDayKey();
    if(!s.npcDaily||s.npcDaily.dayKey!==k){
      s.npcDaily={dayKey:k,gift:{},rumor:{},invite:{}};
    }
  }

  getNpcDailyCount(npcId,kind){
    const s=this.state;if(!s)return 0;
    this._ensureNpcDaily();
    const d=s.npcDaily&&s.npcDaily[kind];
    if(!d)return 0;
    return d[npcId]||0;
  }

  deleteSave(idx){Storage.remove('guigu_save_'+idx)}

  addWorldLog(msg){
    if(!this.state) return;
    this.state.worldLog.unshift({text:msg,year:this.state.year,month:this.state.month});
    if(this.state.worldLog.length>50)this.state.worldLog.length=50;
  }

  addCultLog(msg){
    if(!this.state) return;
    this.state.cultLog.unshift(msg);
    if(this.state.cultLog.length>30)this.state.cultLog.length=30;
  }

  recalcStats(){
    const s=this.state;if(!s)return;
    const r=REALMS[s.realm];
    const sr=SPIRIT_ROOTS_MAP[s.spiritRoot];
    const sect=SECTS_MAP[s.sect];
    let atkMul=sr.atkMul*sect.atkMul;
    let defMul=sr.defMul*sect.defMul;
    let hpMul=sr.hpMul;
    let spiMul=sr.spiMul;
    // Talents
    s.talents.forEach(tid=>{
      const t=TALENTS_MAP[tid];
      if(!t)return;
      if(t.effect.atkMul)atkMul*=t.effect.atkMul;
      if(t.effect.defMul)defMul*=t.effect.defMul;
      if(t.effect.allStats){atkMul*=t.effect.allStats;defMul*=t.effect.allStats;hpMul*=t.effect.allStats;spiMul*=t.effect.allStats}
    });
    // Equipment
    let eqAtk=0,eqDef=0,eqHp=0,eqSpi=0;
    ['weapon','armor','accessory'].forEach(slot=>{
      const eq=s.equipment[slot];
      if(eq){eqAtk+=eq.atk;eqDef+=eq.def;eqHp+=eq.hp;eqSpi+=eq.spi}
    });
    // Cave
    const cave=this.getCaveBonuses();

    // Mount bonuses
    let mountAtk=0,mountDef=0;
    if(s.activeMount){const mt=MOUNTS_MAP[s.activeMount];if(mt){mountAtk=mt.atkBonus;mountDef=mt.defBonus;}}

    s.maxHp=Math.floor(r.baseHp*hpMul+eqHp);
    s.maxSp=Math.floor(r.baseSpi*spiMul+eqSpi);
    s.atk=Math.floor(r.baseAtk*atkMul*(cave.combatMul||1)+eqAtk+mountAtk+s.buffAtk);
    s.def=Math.floor(r.baseDef*defMul*(cave.combatMul||1)+eqDef+mountDef+s.buffDef);
    // Heart demon combat debuff: 41-60: -5% atk/def, 61-80: -10%, 81+: -20%
    const hd=s.heartDemon||0;
    if(hd>80){s.atk=Math.floor(s.atk*0.80);s.def=Math.floor(s.def*0.80);}
    else if(hd>60){s.atk=Math.floor(s.atk*0.90);s.def=Math.floor(s.def*0.90);}
    else if(hd>40){s.atk=Math.floor(s.atk*0.95);s.def=Math.floor(s.def*0.95);}
    s.hp=Math.min(s.hp,s.maxHp);
    s.sp=Math.min(s.sp,s.maxSp);
  }

  getExpPerDay(){
    const s=this.state;if(!s)return 0;
    const base=5*Math.pow(s.realm+1,2);
    const sr=SPIRIT_ROOTS_MAP[s.spiritRoot];
    const sect=SECTS_MAP[s.sect];
    const pers=PERSONALITIES_MAP[s.personality];
    let mul=sr.spiMul*sect.expMul*(pers.expMul||1);
    s.talents.forEach(tid=>{const t=TALENTS_MAP[tid];if(t&&t.effect.expMul)mul*=t.effect.expMul});
    const cave=this.getCaveBonuses();
    if(cave.expMul)mul*=cave.expMul;
    if(s.expBonus)mul*=(1+s.expBonus);
    // Heart demon debuff: 21-40: -5%, 41-60: -10%, 61-80: -20%, 81+: -35%
    const hd=s.heartDemon||0;
    if(hd>80)mul*=0.65;
    else if(hd>60)mul*=0.80;
    else if(hd>40)mul*=0.90;
    else if(hd>20)mul*=0.95;
    return Math.floor(base*mul);
  }

  processOfflineGains(){
    const s=this.state;if(!s||s.dead)return null;
    const now=Date.now();
    const elapsed=(now-s.lastOnline)/1000;
    if(elapsed<60)return null;// at least 1 minute
    // 1 real hour = 30 game days, cap 360 days (12 real hours)
    const days=Math.min(Math.floor(elapsed/120),360);
    if(days<1)return null;
    const expPerDay=this.getExpPerDay();
    const expGain=Math.floor(expPerDay*days*0.3);
    const goldGain=Math.floor(days*(s.realm+1)*5*0.2);
    if(expGain>0)s.exp+=expGain;
    if(goldGain>0)s.gold+=goldGain;
    this.saveGame();
    return {elapsed,days,expGain,goldGain};
  }

  advanceDays(n){
    const s=this.state;if(!s||s.dead)return;
    for(let i=0;i<n;i++){
      s.day++;
      // Decrement dual cultivation days
      const dc=s.dualCultivation||{partnerId:null,daysLeft:0};
      if(dc.daysLeft>0){
        dc.daysLeft--;
        if(dc.daysLeft<=0){
          const partner=s.npcs.find(np=>np.id===dc.partnerId);
          this.addCultLog('与'+(partner?partner.name:'道侣')+'的双修效果已结束');
          dc.partnerId=null;
        }
      }
      if(s.day>30){
        s.day=1;s.month++;
        if(s.month>12){
          s.month=1;s.year++;
          this._onYearChange();
        }
        this._onMonthChange();
      }
    }
    this.saveGame();
    this.emit('timeAdvanced');
  }

  _onMonthChange(){
    const s=this.state;
    // NPC monthly exp
    s.npcs.forEach(npc=>{
      if(!npc.alive)return;
      npc.exp+=randomInt(5,20)*(npc.realm+1);
    });
    // Cave herb production
    const cave=this.getCaveBonuses();
    if(cave.herbs){
      for(let i=0;i<cave.herbs;i++){
        this.addItem({id:'mat001',name:'灵草',type:'material',count:1});
      }
    }
  }

  _onYearChange(){
    const s=this.state;
    s.age++;
    // Check player death by age
    if(s.age>s.lifespan){
      this.playerDeath('寿元耗尽');
      return;
    }
    // Gold from talent
    if(s.talents.includes('rich')){
      const bonus=randomInt(50,200)*(s.realm+1);
      s.gold+=bonus;
    }
    // NPC yearly update
    this.npcYearlyUpdate();
    // Random sect event
    if(Math.random()<0.15){
      const evt=pick(SECT_EVENTS);
      this.addWorldLog('【宗门】'+evt.text);
    }
    this.emit('yearChanged');
  }

  meditate(){
    const s=this.state;if(!s||s.dead)return;
    const days=TIME_COSTS.meditate;
    let expGain=this.getExpPerDay()*days;
    // Dual cultivation bonus
    const dc=s.dualCultivation||{partnerId:null,daysLeft:0};
    if(dc.partnerId&&dc.daysLeft>0){
      expGain=Math.floor(expGain*1.5);
    }
    s.exp+=expGain;
    // Meditation reduces heart demon
    const hdReduce=s.talents.includes('calm')?6:4;
    if(s.heartDemon>0){s.heartDemon=Math.max(0,s.heartDemon-hdReduce);this.addCultLog('心神宁静，心魔-'+hdReduce);this.recalcStats();}
    this.addCultLog('修炼'+days+'天，获得'+formatNumber(expGain)+'经验'+(dc.partnerId&&dc.daysLeft>0?' (双修加成×1.5)':''));
    // Enlightenment check
    const evt=this.checkEnlightenment();
    this.advanceDays(days);
    this.updateBountyProgress('gold',0);this.updateNpcQuestProgress('gold',0);
    this.checkAchievements();
    this.emit('meditated',{expGain,enlightenEvent:evt});
    return {expGain,enlightenEvent:evt};
  }

  wudaoTrain(){
    // Active enlightenment training: costs 30 days, returns interactive choices
    const s=this.state;if(!s||s.dead)return null;
    const paths=['sword','alchemy','formation','body','beast'];
    const pathNames={sword:'剑道',alchemy:'丹道',formation:'阵道',body:'体道',beast:'御兽道'};
    // Generate 3 rounds of path choices
    const rounds=[];
    for(let i=0;i<3;i++){
      const shuffled=[...paths].sort(()=>Math.random()-0.5);
      const p1=shuffled[0],p2=shuffled[1];
      const baseGain=5+Math.floor(s.realm*2);
      const isCrit=Math.random()<0.15; // 15% chance double progress
      rounds.push({
        text:this._getWudaoFlavorText(p1,p2,i),
        choices:[
          {path:p1,name:pathNames[p1],gain:isCrit?baseGain*2:baseGain,isCrit},
          {path:p2,name:pathNames[p2],gain:baseGain,isCrit:false},
        ]
      });
    }
    return {rounds,pathNames};
  }

  applyWudaoResult(chosenPaths){
    const s=this.state;if(!s||s.dead)return;
    for(const cp of chosenPaths){
      s.enlightenment[cp.path]=(s.enlightenment[cp.path]||0)+cp.gain;
    }
    this.advanceDays(30);
    this.checkAchievements();
    this.emit('wudaoComplete');
  }

  _getWudaoFlavorText(p1,p2,round){
    const texts=[
      [`你在静坐中感受到两股气息交织...`,`灵台中浮现两条道路的影像...`,`天地间传来若有若无的道韵...`],
      [`更深层的感悟涌来，你需要选择方向...`,`你的识海中出现了分叉...`,`两种大道的碎片同时向你涌来...`],
      [`最后一丝灵感将要消散，你必须把握...`,`你感到即将顿悟，但方向有二...`,`悟道的最后一关，选择你的道...`],
    ];
    return texts[round][Math.floor(Math.random()*3)];
  }

  canBreakthrough(){
    const s=this.state;if(!s)return false;
    return s.realm<7&&s.exp>=REALMS[s.realm+1].expReq;
  }

  tryBreakthrough(){
    const s=this.state;if(!s||s.dead)return null;
    if(!this.canBreakthrough())return{success:false,msg:'经验不足'};
    // Check heart demon
    if(s.heartDemon>30){
      return{needTrial:true,scenarios:this.getHeartDemonTrial()};
    }
    return this._doBreakthrough();
  }

  _doBreakthrough(){
    const s=this.state;
    const nextRealm=s.realm+1;
    let rate=REALMS[nextRealm].breakRate;
    // Talent bonuses
    if(s.talents.includes('luck'))rate+=0.15;
    rate*=(1-s.heartDemon/200);
    rate+=s.breakBonus;
    rate=Math.min(rate,0.99);
    this.advanceDays(TIME_COSTS.breakthrough);

    if(Math.random()<rate){
      s.realm=nextRealm;
      const r=REALMS[s.realm];
      const lifeMul=s.talents.includes('longevity')?1.3:1;
      s.lifespan=Math.floor(r.lifespan*lifeMul);
      this.recalcStats();
      s.hp=s.maxHp;s.sp=s.maxSp;
      s.breakBonus=0;
      this.addWorldLog(s.name+'突破至'+r.name+'！');
      this.addCultLog('突破成功！达到'+r.name+'！');
      this.updateBountyProgress('breakthrough',1);
      this.checkAchievements();
      this.emit('breakthrough',{realm:s.realm});
      if(typeof CrossGameAchievements!=='undefined'){
        CrossGameAchievements.trackStat('guigu_max_realm',s.realm);
      }
      return{success:true,realm:r.name};
    }else{
      s.heartDemon=Math.min(100,s.heartDemon+5);
    s.exp=Math.floor(s.exp*0.85);
      s.breakBonus=0;
      this.addCultLog('突破失败...心魔+5');
      this.emit('breakthroughFailed');
      return{success:false,msg:'突破失败'};
    }
  }

  addHeartDemon(n){if(this.state)this.state.heartDemon=clamp(this.state.heartDemon+n,0,100)}

  getHeartDemonTrial(){
    const pool=[...HEART_DEMON_SCENARIOS];
    const picked=[];
    for(let i=0;i<3&&pool.length;i++){
      const idx=randomInt(0,pool.length-1);
      picked.push(pool.splice(idx,1)[0]);
    }
    return picked;
  }

  resolveHeartDemonChoice(scenarioId,choiceIdx){
    const sc=HEART_DEMON_SCENARIOS_MAP[scenarioId];
    if(!sc)return null;
    const choice=sc.choices[choiceIdx];
    if(!choice)return null;
    if(choice.correct){
      this.addHeartDemon(choice.hd);
      return{correct:true,desc:choice.desc,hd:choice.hd};
    }else{
      this.addHeartDemon(choice.hd);
      return{correct:false,desc:choice.desc,hd:choice.hd};
    }
  }

  checkEnlightenment(){
    if(Math.random()>0.05)return null;
    return pick(ENLIGHTENMENT_EVENTS);
  }

  resolveEnlightenment(eventId,choiceIdx){
    const evt=ENLIGHTENMENT_EVENTS_MAP[eventId];
    if(!evt)return null;
    const ch=evt.choices[choiceIdx];
    if(!ch)return null;
    const s=this.state;
    const cave=this.getCaveBonuses();
    const mul=cave.enlightMul||1;
    const gain=Math.floor(ch.prog*mul);
    s.enlightenment[ch.path]=Math.min(100,s.enlightenment[ch.path]+gain);
    this.updateBountyProgress('enlighten',s.enlightenment[ch.path]);
    this.addCultLog(ch.desc);
    // Check skill unlocks
    const pathSkills=SKILLS[ch.path]||[];
    pathSkills.forEach(sk=>{
      if(s.enlightenment[ch.path]>=sk.reqLevel){
        // skill available
      }
    });
    return{path:ch.path,gain,desc:ch.desc};
  }

  getEnlightenmentLevel(val){
    if(val>=80)return'登峰';if(val>=60)return'圆满';if(val>=40)return'大成';if(val>=20)return'小成';if(val>0)return'入门';return'未悟';
  }

  getUnlockedSkills(){
    const s=this.state;if(!s)return[];
    const skills=[];
    Object.keys(SKILLS).forEach(path=>{
      SKILLS[path].forEach(sk=>{
        if(s.enlightenment[path]>=sk.reqLevel)skills.push(sk);
      });
    });
    return skills;
  }

  generateMap(){
    const s=this.state;
    const size=15;
    s.map=[];
    s.fog=[];
    for(let y=0;y<size;y++){
      s.map[y]=[];
      s.fog[y]=[];
      for(let x=0;x<size;x++){
        s.fog[y][x]=false;
        // Default random terrain
        const weights=[1,2,1,0,0,1,1,0,1,3];// mountain,forest,ruins,town,sect,water,desert,forbidden,mist,plains
        let total=weights.reduce((a,b)=>a+b,0);
        let r=Math.random()*total;
        let ti=0;
        for(let w=0;w<weights.length;w++){r-=weights[w];if(r<=0){ti=w;break;}}
        s.map[y][x]={terrain:ti};
      }
    }
    // Fixed locations
    s.map[7][7]={terrain:3,locName:'天元城'};// center town
    s.map[0][0]={terrain:3,locName:'北冥镇'};s.map[0][14]={terrain:3,locName:'东海城'};
    s.map[14][0]={terrain:3,locName:'南荒集'};s.map[14][14]={terrain:3,locName:'西域坊'};
    // Sects
    s.map[3][3]={terrain:4,locName:'剑宗'};s.map[3][11]={terrain:4,locName:'丹宗'};
    s.map[11][3]={terrain:4,locName:'体修宗'};s.map[11][11]={terrain:4,locName:'万法宗'};
    // Forbidden zones on edges
    s.map[0][7]={terrain:7,locName:'幽冥禁地'};s.map[14][7]={terrain:7,locName:'炎魔禁地'};s.map[7][0]={terrain:7,locName:'万妖禁地'};
  }

  revealFog(cx,cy,r){
    const s=this.state;if(!s)return;
    for(let dy=-r;dy<=r;dy++){
      for(let dx=-r;dx<=r;dx++){
        const ny=cy+dy,nx=cx+dx;
        if(ny>=0&&ny<15&&nx>=0&&nx<15){
          if(!s.fog[ny][nx]){s.fog[ny][nx]=true;s.explored=(s.explored||0)+1;
            if(typeof CrossGameAchievements!=='undefined') CrossGameAchievements.trackStat('guigu_explored',s.explored);
          }
        }
      }
    }
  }

  moveTo(x,y){
    const s=this.state;if(!s||s.dead)return null;
    const dx=Math.abs(x-s.position.x),dy=Math.abs(y-s.position.y);
    if(dx>1||dy>1||(!dx&&!dy))return{error:'只能移动到相邻格子'};
    if(!s.fog[y][x]&&TERRAIN[s.map[y][x].terrain].danger>3)return{error:'未探索的危险区域'};

    s.position={x,y};
    this.revealFog(x,y,1);
    this.updateBountyProgress('explore',1);
    this.updateNpcQuestProgress('explore',1);
    let exploreDays=TIME_COSTS.explore;
    if(s.activeMount){
      const mt=MOUNTS_MAP[s.activeMount];
      if(mt){
        // mountFeed: each 10 adds ~1.5% speed (cap 15%)
        const extra=Math.min(0.15,(s.mountFeed||0)*0.0015);
        const spd=Math.min(0.7,mt.speedBonus+extra);
        exploreDays=Math.max(1,Math.round(exploreDays*(1-spd)));

        s.mountRides=(s.mountRides||0)+1;
        if(typeof CrossGameAchievements!=='undefined') CrossGameAchievements.trackStat('guigu_mount_rides',s.mountRides);
      }
    }
    this.advanceDays(exploreDays);
    const cell=s.map[y][x];
    const terrain=TERRAIN[cell.terrain];
    let encounter=null;

    // Monster encounter (exclude spirit beasts from normal spawns)
    if(terrain.danger>0&&Math.random()<0.3){
      const possibleMonsters=MONSTERS.filter(m=>
        !m.spiritBeast&&m.realmMin<=s.realm&&m.realmMax>=s.realm&&
        (m.terrain===terrain.cls||Math.random()<0.1)
      );
      if(possibleMonsters.length){
        encounter={type:'monster',monster:pick(possibleMonsters)};
      }
    }
    // Material find
    if(terrain.res.length&&Math.random()<0.15){
      const matId=pick(terrain.res);
      const mat=MATERIALS_MAP[matId];
      if(mat){
        this.addItem({id:mat.id,name:mat.name,type:'material',count:1});
        this.updateBountyProgress('collect_herb',1);
        this.updateNpcQuestProgress('collect_herb',1);
        encounter=encounter||{};encounter.material=mat;
      }
    }
    // Spirit Beast encounter (terrain-specific)
    const spiritBeastTerrains={mountain:'mon_sb1',water:'mon_sb2',forest:'mon_sb3'};
    const sbId=spiritBeastTerrains[terrain.cls];
    if(sbId&&Math.random()<0.08){
      const sb=MONSTERS_MAP[sbId];
      if(sb&&sb.realmMin<=s.realm&&sb.realmMax>=s.realm){
        encounter=encounter||{};
        encounter.spiritBeast={type:'monster',monster:sb};
      }
    }
    // Random exploration encounters (15% chance, bonus events)
    if(Math.random()<0.15){
      const randType=Math.random();
      if(randType<0.33){
        // NPC conversation - small buff
        const buffExp=randomInt(10,50)*(s.realm+1);
        s.exp+=buffExp;
        encounter=encounter||{};
        encounter.randomEvent={type:'npcChat',text:'一位路过的修士与你交流心得，你获得了'+buffExp+'点经验',exp:buffExp};
        this.addCultLog('偶遇修士交流，获得'+buffExp+'经验');
      }else if(randType<0.66){
        // Treasure chest - random gold or material
        if(Math.random()<0.5){
          const goldGain=randomInt(20,200)*(s.realm+1);
          s.gold+=goldGain;
          encounter=encounter||{};
          encounter.randomEvent={type:'treasure',text:'发现一个宝箱，获得'+goldGain+'灵石！',gold:goldGain};
          this.addCultLog('探索中发现宝箱，获得'+goldGain+'灵石');
        }else{
          const allMats=MATERIALS.filter(m=>m.tier<=s.realm+1);
          if(allMats.length){
            const mat=pick(allMats);
            this.addItem({id:mat.id,name:mat.name,type:'material',count:1});
            encounter=encounter||{};
            encounter.randomEvent={type:'treasure',text:'发现一个宝箱，获得'+mat.name+'！',material:mat};
            this.addCultLog('探索中发现宝箱，获得'+mat.name);
          }
        }
      }else{
        // Ambush - start combat with a random enemy
        const ambushMonsters=MONSTERS.filter(m=>!m.spiritBeast&&m.realmMin<=s.realm&&m.realmMax>=s.realm);
        if(ambushMonsters.length){
          const ambushMon=pick(ambushMonsters);
          encounter=encounter||{};
          encounter.ambush={type:'monster',monster:ambushMon};
          this.addCultLog('探索中遭遇伏击！'+ambushMon.name+'突然出现！');
        }
      }
    }
    this.emit('moved',{x,y,encounter});
    return{terrain,encounter};
  }

  getAdjacentCells(){
    const s=this.state;if(!s)return[];
    const adj=[];
    for(let dy=-1;dy<=1;dy++){
      for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=s.position.x+dx,ny=s.position.y+dy;
        if(nx>=0&&nx<15&&ny>=0&&ny<15)adj.push({x:nx,y:ny});
      }
    }
    return adj;
  }

  fastTravel(x,y){
    const s=this.state;if(!s||s.dead)return{error:'无法传送'};
    // Validate target is an explored town
    if(!s.fog[y][x])return{error:'目标未探索'};
    const cell=s.map[y][x];
    const terrain=TERRAIN[cell.terrain];
    if(terrain.cls!=='town')return{error:'只能传送到城镇'};
    // Check not already there
    if(s.position.x===x&&s.position.y===y)return{error:'你已在此处'};
    // Calculate distance (Manhattan)
    const dist=Math.abs(x-s.position.x)+Math.abs(y-s.position.y);
    const cost=dist*50;
    if(s.gold<cost)return{error:'灵石不足，需要'+cost+'灵石'};
    // Execute teleport
    s.gold-=cost;
    s.position={x,y};
    this.revealFog(x,y,2);
    this.advanceDays(Math.max(1,Math.floor(dist/2)));
    this.addCultLog('传送至'+(cell.locName||terrain.name)+'，花费'+cost+'灵石');
    this.emit('moved',{x,y});
    return{success:true,cost,locName:cell.locName||terrain.name};
  }

  startBattle(monsterDef){
    const s=this.state;if(!s)return;
    const playerEl=s.spiritRoot==='chaos'?null:s.spiritRoot;
    const monEl=monsterDef.element||null;
    const elBonusP=elementBonus(playerEl,monEl);
    const elBonusM=elementBonus(monEl,playerEl);
    s.battleState={
      monster:{...monsterDef,currentHp:monsterDef.hp},
      turn:1,log:[],active:true,
      playerStartHp:s.hp,rewards:null,skillCooldowns:{},
      playerElement:playerEl,monsterElement:monEl,
      elBonusPlayer:elBonusP,elBonusMonster:elBonusM,
      combo:0,maxCombo:0
    };
    let elHint='';
    if(elBonusP>1)elHint=' (五行克制！+30%)';
    else if(elBonusP<1)elHint=' (五行被克！-30%)';
    s.battleState.log.push({type:'system',text:'遭遇'+monsterDef.name+'！战斗开始！'+elHint});
    this.emit('battleStart',monsterDef);
  }

  processBattleTurn(action,skillId){
    const s=this.state;if(!s||!s.battleState||!s.battleState.active)return null;
    const bs=s.battleState;const mon=bs.monster;
    let result={log:[],ended:false};

    // Player action
    const elP=bs.elBonusPlayer||1;
    const elM=bs.elBonusMonster||1;
    // 连击加成: 3连=1.1x, 5连=1.2x, 7连=1.5x
    const comboMul=bs.combo>=7?1.5:bs.combo>=5?1.2:bs.combo>=3?1.1:1.0;
    if(action==='attack'){
      let dmg=Math.max(1,Math.floor((s.atk-mon.def*0.3)*(0.9+Math.random()*0.2)*elP*comboMul));
      const crit=Math.random()<0.1;
      if(crit)dmg*=2;
      mon.currentHp-=dmg;
      let msg=crit?'暴击！你造成'+dmg+'点伤害！':'你造成'+dmg+'点伤害';
      if(comboMul>1)msg+=' ('+bs.combo+'连击 x'+comboMul+')';
      result.log.push({type:crit?'crit':'player',text:msg});
      bs.combo++;
      if(bs.combo>bs.maxCombo)bs.maxCombo=bs.combo;
    }else if(action==='skill'&&skillId){
      const sk=this.getUnlockedSkills().find(s=>s.id===skillId);
      if(sk&&s.sp>=sk.cost&&!(bs.skillCooldowns[sk.id]>0)){
        s.sp-=sk.cost;
        if(sk.dmg){
          let dmg=Math.floor(s.atk*sk.dmg*elP*comboMul);
          mon.currentHp-=dmg;
          let msg='施展'+sk.name+'，造成'+dmg+'点伤害！';
          if(comboMul>1)msg+=' ('+bs.combo+'连击)';
          result.log.push({type:'player',text:msg});
          bs.combo++;
          if(bs.combo>bs.maxCombo)bs.maxCombo=bs.combo;
        }
        if(sk.shield){
          s.buffDef=Math.floor(s.def*0.5);
          result.log.push({type:'player',text:sk.name+'：防御提升！'});
        }
        if(sk.heal){
          const heal=Math.floor(s.maxHp*0.3);
          s.hp=Math.min(s.maxHp,s.hp+heal);
          result.log.push({type:'player',text:sk.name+'：恢复'+heal+'气血！'});
        }
        if(sk.lifesteal){
          const heal=Math.floor(s.atk*sk.dmg*0.3);
          s.hp=Math.min(s.maxHp,s.hp+heal);
        }
        bs.skillCooldowns[sk.id]=sk.cd;
      }else{
        result.log.push({type:'system',text:'技能无法使用'});
      }
    }else if(action==='potion'){
      const potion=s.potions&&s.potions.length?s.potions[0]:null;
      if(!potion){
        // Try inventory
        const idx=s.inventory.findIndex(it=>it.type==='potion'&&it.effect);
        if(idx>=0){
          const p=s.inventory[idx];
          if(p.effect.healHp){s.hp=Math.min(s.maxHp,s.hp+p.effect.healHp);result.log.push({type:'player',text:'使用'+p.name+'，恢复'+p.effect.healHp+'气血'})}
          if(p.effect.healSp){s.sp=Math.min(s.maxSp,s.sp+p.effect.healSp);result.log.push({type:'player',text:'使用'+p.name+'，恢复'+p.effect.healSp+'灵力'})}
          s.inventory.splice(idx,1);
        }else{
          result.log.push({type:'system',text:'没有可用丹药'});
        }
      }
    }else if(action==='flee'){
      const fleeChance=0.5+(s.realm-Math.floor(mon.hp/500))*0.1;
      if(Math.random()<Math.max(0.1,fleeChance)){
        result.log.push({type:'system',text:'逃跑成功！'});
        bs.active=false;result.ended=true;result.fled=true;
        this.advanceDays(bs.turn);
        return result;
      }else{
        result.log.push({type:'system',text:'逃跑失败！'});
      }
    }

    // Check monster death
    if(mon.currentHp<=0){
      mon.currentHp=0;bs.active=false;result.ended=true;result.victory=true;
      this.endBattle(true);
      return result;
    }

    // Monster attacks
    let monDmg=Math.max(1,Math.floor((mon.atk-s.def*0.3)*(0.9+Math.random()*0.2)*elM));
    s.hp-=monDmg;
    result.log.push({type:'monster',text:mon.name+'造成'+monDmg+'点伤害'});
    // 被击中则连击中断
    bs.combo=0;

    // Check player death
    if(s.hp<=0){
      s.hp=0;bs.active=false;result.ended=true;result.victory=false;
      this.endBattle(false);
      return result;
    }

    // Reduce cooldowns
    Object.keys(bs.skillCooldowns).forEach(k=>{if(bs.skillCooldowns[k]>0)bs.skillCooldowns[k]--});
    bs.turn++;
    bs.log.push(...result.log);
    return result;
  }

  endBattle(victory){
    const s=this.state;if(!s||!s.battleState)return;
    const bs=s.battleState;const mon=bs.monster;
    if(victory){
      s.exp+=mon.exp;
      const goldGain=randomInt(mon.exp/5,mon.exp/2);
      s.gold+=goldGain;
      s.kills=(s.kills||0)+1;
      // Killing increases heart demon slightly
      if(Math.random()<0.3)this.addHeartDemon(1);
      if(mon.realmMin>=5)s.bossKills=(s.bossKills||0)+1;
      if(typeof CrossGameAchievements!=='undefined') CrossGameAchievements.trackStat('guigu_kills',s.kills);
      this.updateBountyProgress('kill',1);
      this.updateNpcQuestProgress('kill',1);
      if(mon.realmMin>=5){this.updateBountyProgress('boss_kill',1);}
      if(mon.element){this.updateBountyProgress('element_kills',1,mon.element);}
      this.updateBountyProgress('gold',0);this.updateNpcQuestProgress('gold',0);
      // Alignment shift from personality
      const pers=PERSONALITIES_MAP[s.personality];
      if(pers)s.alignment+=pers.alignShift;
      // Drop items
      const drops=[];
      (mon.drops||[]).forEach(d=>{
        if(Math.random()<d.rate){
          const eq=EQUIPMENT_MAP[d.id];
          const mat=MATERIALS_MAP[d.id];
          if(eq){
            const item={...eq,type:'equipment'};
            this.addItem(item);
            drops.push(item);
          }else if(mat){
            this.addItem({id:mat.id,name:mat.name,type:'material',count:1});
            drops.push(mat);
          }
        }
      });
      bs.rewards={exp:mon.exp,gold:goldGain,drops};
      this.addCultLog('击败'+mon.name+'，获得'+mon.exp+'经验');
    }else{
      s.gold=Math.floor(s.gold*0.9);
      s.hp=1;
      // Move to nearest town
      s.position={x:7,y:7};
      this.addCultLog('战败...被传送回城镇');
    }
    s.buffAtk=0;s.buffDef=0;
    this.recalcStats();
    this.advanceDays(bs.turn);
    this.checkAchievements();
    s.battleState=null;
  }

  generateNPCs(){
    const s=this.state;
    s.npcs=[];
    for(let i=0;i<25;i++){
      const realm=randomInt(0,3);
      const r=REALMS[realm];
      const lifeMul=Math.random()<0.1?1.3:1;
      s.npcs.push({
        id:'npc_'+i,
        name:pick(NPC_SURNAMES)+pick(NPC_NAMES),
        sex:Math.random()<0.5?'male':'female',
        realm:realm,exp:randomInt(0,r.expReq||100),
        age:randomInt(16,Math.floor(r.lifespan*lifeMul*0.5)),
        lifespan:Math.floor(r.lifespan*lifeMul),
        personality:pick(PERSONALITIES).id,
        position:{x:randomInt(0,14),y:randomInt(0,14)},
        alive:true,faction:pick(SECTS).id,
        gold:randomInt(100,1000)*(realm+1)
      });
    }
  }

  npcYearlyUpdate(){
    const s=this.state;
    s.npcs.forEach(npc=>{
      if(!npc.alive)return;
      npc.age++;
      npc.exp+=randomInt(50,200)*(npc.realm+1);
      // Breakthrough attempt
      if(npc.realm<7){
        const nextReq=REALMS[npc.realm+1].expReq;
        if(npc.exp>=nextReq&&Math.random()<0.3){
          const rate=REALMS[npc.realm+1].breakRate;
          if(Math.random()<rate){
            npc.realm++;
            npc.lifespan=REALMS[npc.realm].lifespan;
            npc.exp=0;
            this.addWorldLog(npc.name+'突破至'+REALMS[npc.realm].name+'！');
          }
        }
      }
      // Death check
      if(npc.age>npc.lifespan){
        npc.alive=false;
        this.addWorldLog(npc.name+'仙逝，享年'+npc.age+'岁');
      }
    });
    // Spawn new NPC
    if(s.npcs.filter(n=>n.alive).length<30&&Math.random()<0.1){
      const id='npc_'+(++_npcUid)+'_'+Date.now();
      s.npcs.push({
        id,name:pick(NPC_SURNAMES)+pick(NPC_NAMES),
        sex:Math.random()<0.5?'male':'female',
        realm:0,exp:0,age:16,lifespan:REALMS[0].lifespan,
        personality:pick(PERSONALITIES).id,
        position:{x:randomInt(0,14),y:randomInt(0,14)},
        alive:true,faction:pick(SECTS).id,gold:randomInt(50,200)
      });
      this.addWorldLog('新修士'+s.npcs[s.npcs.length-1].name+'初入鬼谷');
    }
    // Remove dead NPCs to prevent list from growing unbounded
    s.npcs=s.npcs.filter(n=>n.alive);
  }

  interactNPC(npcId,action,giftIdx){
    const s=this.state;if(!s)return null;
    const npc=s.npcs.find(n=>n.id===npcId);
    if(!npc||!npc.alive)return null;
    this._ensureNpcDaily();
    const rel=s.relations[npcId]||0;
    const pers=PERSONALITIES_MAP[s.personality];
    const relMul=pers?pers.npcRelMul:1;
    let result={};

    if(action==='talk'){
      const gain=Math.floor(5*relMul);
      s.relations[npcId]=(rel+gain);
      result={type:'talk',text:pick(NPC_DIALOGUES),gain};
      if(!s.knownNPCs.includes(npcId))s.knownNPCs.push(npcId);
      this.updateBountyProgress('npc_talk',1);
      this.updateBountyProgress('npc_favor',s.relations[npcId]);
      this.updateNpcQuestProgress('npc_talk',1);
    }else if(action==='gift'&&giftIdx!==undefined){
      const giftUsed=this.getNpcDailyCount(npcId,'gift');
      if(giftUsed>=1){
        result={type:'gift',success:false,msg:'今日已赠礼'};
      }else{
        const item=s.inventory[giftIdx];
        if(item){
          const val=item.tier?item.tier*10:5;
          const gain=Math.floor((10+val)*relMul);
          s.relations[npcId]=(rel+gain);
          s.inventory.splice(giftIdx,1);
          s.npcDaily.gift[npcId]=1;
          result={type:'gift',gain,itemName:item.name};
        }else{
          result={type:'gift',success:false,msg:'无效的礼物'};
        }
      }
    }else if(action==='spar'){
      // Simple spar - compare realms
      const win=s.realm>npc.realm||(s.realm===npc.realm&&Math.random()<0.5);
      if(win){
        s.relations[npcId]=rel+10;
        s.exp+=Math.floor(50*(npc.realm+1));
        result={type:'spar',win:true,exp:Math.floor(50*(npc.realm+1))};
        this.updateBountyProgress('spar',1);
        this.updateNpcQuestProgress('spar_with',1);
      }else{
        s.relations[npcId]=rel-5;
        result={type:'spar',win:false};
      }
    }else if(action==='apprentice'){
      if(rel>=80&&npc.realm>s.realm){
        // Learn a random skill path from NPC
        const paths=Object.keys(s.enlightenment);
        const p=pick(paths);
        s.enlightenment[p]=Math.min(100,s.enlightenment[p]+15);
        result={type:'apprentice',success:true,path:p,gain:15};
        this.addCultLog(npc.name+'传授你'+p+'之道，感悟+15');
      }else{
        result={type:'apprentice',success:false,msg:rel<80?'好感度不足':'对方境界不高于你'};
      }
    }else if(action==='dualCultivate'){
      const dc=s.dualCultivation=s.dualCultivation||{partnerId:null,daysLeft:0};
      const npcSex=npc.sex||'female';
      const playerSex=s.sex||'male';
      if(rel<60){
        result={type:'dualCultivate',success:false,msg:'好感度不足（需≥60）'};
      }else if(npcSex===playerSex){
        result={type:'dualCultivate',success:false,msg:'需要异性方可双修'};
      }else if(dc.partnerId&&dc.daysLeft>0){
        result={type:'dualCultivate',success:false,msg:'已有双修对象，请等待效果结束'};
      }else{
        dc.partnerId=npc.id;dc.daysLeft=30;
        s.relations[npcId]=(rel+15);
        this.addCultLog('与'+npc.name+'开始双修，修炼经验×1.5，持续30天');
        result={type:'dualCultivate',success:true,partner:npc.name};
      }
    }else if(action==='rumor'){
      const used=this.getNpcDailyCount(npcId,'rumor');
      if(rel<20){
        result={type:'rumor',success:false,msg:'好感度不足（需≥20）'};
      }else if(used>=2){
        result={type:'rumor',success:false,msg:'今日已打听得够多了'};
      }else if(s.gold<20){
        result={type:'rumor',success:false,msg:'灵石不足（需20）'};
      }else{
        s.gold-=20;
        s.npcDaily.rumor[npcId]=used+1;
        const px=s.position.x,py=s.position.y;
        const tx=clamp(px+randomInt(-4,4),0,14);
        const ty=clamp(py+randomInt(-4,4),0,14);
        this.revealFog(tx,ty,2);
        const hint=pick([
          '村子附近可能有灵草出没',
          '山谷中敌人增多，小心为上',
          '坊市商人最近进了新货',
          '传闻有异兽窟出现在这片区域',
        ]);
        result={type:'rumor',success:true,text:hint};
      }
    }else if(action==='invite'){
      const used=this.getNpcDailyCount(npcId,'invite');
      if(rel<40){
        result={type:'invite',success:false,msg:'好感度不足（需≥40）'};
      }else if(used>=1){
        result={type:'invite',success:false,msg:'今日已结伴一次'};
      }else if(s.sp<20){
        result={type:'invite',success:false,msg:'灵力不足（需20）'};
      }else{
        s.sp-=20;
        s.npcDaily.invite[npcId]=1;
        const expGain=Math.floor(80*(npc.realm+1));
        s.exp+=expGain;
        let loot='';
        if(Math.random()<0.35){
          this.addItem({name:'灵草',type:'material',matId:'mat001',count:1,tier:1});
          loot='灵草';
        }
        this.addCultLog('与'+npc.name+'结伴历练，经验+'+expGain+(loot?'，获得'+loot:''));
        result={type:'invite',success:true,exp:expGain,loot};
      }
    }
    this.advanceDays(TIME_COSTS.npcInteract);
    return result;
  }

  getNPCRelationLabel(npcId){
    const rel=this.state.relations[npcId]||0;
    if(rel<0)return{label:'仇敌',cls:'enemy'};
    if(rel<20)return{label:'陌生人',cls:'neutral'};
    if(rel<50)return{label:'点头之交',cls:'neutral'};
    if(rel<80)return{label:'友人',cls:'friend'};
    return{label:'挚友',cls:'friend'};
  }

  // --- 悬赏令系统 (Phase 3G) ---
  refreshBountyBoard(){
    const s=this.state;
    const eligible=BOUNTY_TEMPLATES_GG.filter(b=>s.realm>=b.realmReq);
    const shuffled=[...eligible].sort(()=>Math.random()-0.5);
    s.bountyBoard=shuffled.slice(0,5).map(b=>b.id);
    s.bountyRefreshDay=s.day+s.month*30+s.year*360;
    this.saveGame();
  }
  getBountyBoard(){
    const s=this.state;
    const currentDay=s.day+s.month*30+s.year*360;
    if(currentDay>=s.bountyRefreshDay+30||!s.bountyBoard.length){
      this.refreshBountyBoard();
    }
    return s.bountyBoard.map(id=>BOUNTY_TEMPLATES_GG.find(b=>b.id===id)).filter(Boolean);
  }
  acceptBounty(bountyId){
    const s=this.state;
    if(s.activeBounties.length>=3)return false;
    if(s.activeBounties.some(b=>b.id===bountyId))return false;
    s.activeBounties.push({id:bountyId,progress:0,elementKills:[]});
    this.saveGame();return true;
  }
  updateBountyProgress(type,amount,extra){
    const s=this.state;
    s.activeBounties.forEach(ab=>{
      const tmpl=BOUNTY_TEMPLATES_GG.find(b=>b.id===ab.id);
      if(!tmpl)return;
      if(tmpl.type==='gold'&&type==='gold'){ab.progress=s.gold;return;}
      if(tmpl.type==='enlighten'&&type==='enlighten'){ab.progress=Math.max(ab.progress,amount);return;}
      if(tmpl.type==='npc_favor'&&type==='npc_favor'){ab.progress=Math.max(ab.progress,amount);return;}
      if(tmpl.type==='element_kills'&&type==='element_kills'){
        if(extra&&!ab.elementKills.includes(extra)){ab.elementKills.push(extra);ab.progress=ab.elementKills.length;}
        return;
      }
      if(tmpl.type===type)ab.progress+=amount;
    });
  }
  claimBounty(bountyId){
    const s=this.state;
    const idx=s.activeBounties.findIndex(b=>b.id===bountyId);
    if(idx===-1)return false;
    const ab=s.activeBounties[idx];
    const tmpl=BOUNTY_TEMPLATES_GG.find(b=>b.id===bountyId);
    if(!tmpl||ab.progress<tmpl.target)return false;
    s.gold+=tmpl.rewardGold;
    s.exp+=tmpl.rewardExp;
    s.activeBounties.splice(idx,1);
    this.addCultLog('完成悬赏"'+tmpl.name+'"！获得'+tmpl.rewardGold+'灵石');
    this.saveGame();return true;
  }
  abandonBounty(bountyId){
    const s=this.state;
    s.activeBounties=s.activeBounties.filter(b=>b.id!==bountyId);
    this.saveGame();
  }

  // NPC委托
  getNpcQuests(npcId){
    const s=this.state;
    const rel=s.relations[npcId]||0;
    return NPC_QUEST_TEMPLATES.filter(q=>rel>=q.favorReq&&!s.activeNpcQuests.some(aq=>aq.templateId===q.id&&aq.npcId===npcId)&&!s.completedNpcQuests.includes(npcId+'_'+q.id));
  }
  acceptNpcQuest(npcId,templateId){
    const s=this.state;
    if(s.activeNpcQuests.length>=3)return false;
    const tmpl=NPC_QUEST_TEMPLATES.find(q=>q.id===templateId);
    if(!tmpl)return false;
    s.activeNpcQuests.push({npcId,templateId,progress:0});
    this.saveGame();return true;
  }
  updateNpcQuestProgress(type,amount){
    const s=this.state;
    s.activeNpcQuests.forEach(aq=>{
      const tmpl=NPC_QUEST_TEMPLATES.find(q=>q.id===aq.templateId);
      if(!tmpl)return;
      if(tmpl.type==='gold'&&type==='gold'){aq.progress=s.gold;return;}
      if(tmpl.type===type)aq.progress+=amount;
    });
  }
  claimNpcQuest(npcId,templateId){
    const s=this.state;
    const idx=s.activeNpcQuests.findIndex(q=>q.npcId===npcId&&q.templateId===templateId);
    if(idx===-1)return false;
    const aq=s.activeNpcQuests[idx];
    const tmpl=NPC_QUEST_TEMPLATES.find(q=>q.id===templateId);
    if(!tmpl||aq.progress<tmpl.target)return false;
    s.gold+=tmpl.rewardGold;
    s.relations[npcId]=(s.relations[npcId]||0)+tmpl.favorGain;
    s.activeNpcQuests.splice(idx,1);
    s.completedNpcQuests.push(npcId+'_'+templateId);
    const npc=s.npcs.find(n=>n.id===npcId);
    this.addCultLog('完成'+( npc?npc.name:'NPC')+'的委托"'+tmpl.name+'"！好感+'+tmpl.favorGain);
    this.saveGame();return true;
  }

  acquireCave(){
    const s=this.state;if(!s)return false;
    if(s.cave.owned)return false;
    if(s.realm<3){showToast('需要金丹期以上','error');return false}
    if(s.gold<5000){showToast('灵石不足','error');return false}
    s.gold-=5000;s.cave.owned=true;
    this.addWorldLog(s.name+'购置了洞府！');
    this.checkAchievements();
    return true;
  }

  upgradeFacility(facId){
    const s=this.state;if(!s||!s.cave.owned)return false;
    const fac=CAVE_FACILITIES_MAP[facId];
    if(!fac)return false;
    const lv=s.cave.facilities[facId]||0;
    if(lv>=fac.maxLv)return false;
    const cost=fac.costs[lv];
    if(s.gold<cost){showToast('灵石不足','error');return false}
    s.gold-=cost;
    s.cave.facilities[facId]=lv+1;
    this.updateBountyProgress('cave_upgrade',1);
    this.recalcStats();
    this.saveGame();
    return true;
  }

  getCaveBonuses(){
    const s=this.state;if(!s||!s.cave.owned)return{};
    const b={};
    CAVE_FACILITIES.forEach(fac=>{
      const lv=s.cave.facilities[fac.id]||0;
      if(lv>0){
        const bonus=fac.bonus[lv-1];
        Object.keys(bonus).forEach(k=>{
          if(typeof bonus[k]==='number'){
            if(k==='herbs'){b[k]=(b[k]||0)+bonus[k]}// additive for herbs
            else{b[k]=(b[k]||1)*bonus[k]}
          }
        });
      }
    });
    return b;
  }

  craftItem(recipeId){
    const s=this.state;if(!s)return null;
    const recipe=RECIPES_MAP[recipeId];
    if(!recipe)return null;
    // Check materials
    for(const req of recipe.materials){
      const count=s.inventory.filter(it=>it.id===req.id).reduce((sum,it)=>sum+(it.count||1),0);
      if(count<req.count)return{success:false,msg:'材料不足'};
    }
    // Remove materials
    recipe.materials.forEach(req=>{
      let need=req.count;
      while(need>0){
        const idx=s.inventory.findIndex(it=>it.id===req.id);
        if(idx<0)break;
        const it=s.inventory[idx];
        const take=Math.min(need,it.count||1);
        it.count=(it.count||1)-take;
        if(it.count<=0)s.inventory.splice(idx,1);
        need-=take;
      }
    });
    // Calc success
    let rate=recipe.rate;
    if(s.talents.includes('alchemist'))rate+=0.3;
    const sect=SECTS_MAP[s.sect];
    rate*=sect.craftMul;
    const cave=this.getCaveBonuses();
    if(cave.craftMul)rate*=cave.craftMul;
    rate=Math.min(rate,0.99);
    this.advanceDays(TIME_COSTS.craft);
    s.crafts=(s.crafts||0)+1;

    if(Math.random()<rate){
      // Create potion item
      const item={id:recipe.id,name:recipe.name,type:'potion',effect:recipe.effect,desc:recipe.desc,count:1};
      this.addItem(item);
      this.addCultLog('炼制'+recipe.name+'成功！');
      this.updateBountyProgress('craft',1);
      this.updateNpcQuestProgress('craft',1);
      this.checkAchievements();
      return{success:true,item};
    }else{
      this.addCultLog('炼制'+recipe.name+'失败...');
      return{success:false,msg:'炼制失败'};
    }
  }

  addItem(item){
    const s=this.state;if(!s)return;
    // Stack materials and potions
    if(item.type==='material'||item.type==='potion'){
      const existing=s.inventory.find(it=>it.id===item.id&&it.type===item.type);
      if(existing){existing.count=(existing.count||1)+(item.count||1);return}
    }
    s.inventory.push({...item,count:item.count||1});
  }

  removeItem(idx){
    const s=this.state;if(!s)return;
    s.inventory.splice(idx,1);
  }

  equipItem(idx){
    const s=this.state;if(!s)return;
    const item=s.inventory[idx];
    if(!item||item.type==='material'||item.type==='potion')return;
    const slot=item.type==='weapon'?'weapon':item.type==='armor'?'armor':'accessory';
    // Unequip current
    if(s.equipment[slot]){
      s.inventory.push(s.equipment[slot]);
    }
    s.equipment[slot]=item;
    s.inventory.splice(idx,1);
    this.recalcStats();
    this.saveGame();
  }

  unequipItem(slot){
    const s=this.state;if(!s)return;
    if(s.equipment[slot]){
      s.inventory.push(s.equipment[slot]);
      s.equipment[slot]=null;
      this.recalcStats();
      this.saveGame();
    }
  }

  useItem(idx){
    const s=this.state;if(!s)return null;
    const item=s.inventory[idx];
    if(!item)return null;
    if(item.effect){
      if(item.effect.healHp){s.hp=Math.min(s.maxHp,s.hp+item.effect.healHp)}
      if(item.effect.healSp){s.sp=Math.min(s.maxSp,s.sp+item.effect.healSp)}
      if(item.effect.addLife){s.lifespan+=item.effect.addLife}
      if(item.effect.breakBonus){s.breakBonus=(s.breakBonus||0)+item.effect.breakBonus}
      if(item.effect.buffAtk){s.buffAtk=(s.buffAtk||0)+item.effect.buffAtk}
      if(item.effect.buffDef){s.buffDef=(s.buffDef||0)+item.effect.buffDef}
      if(item.effect.expBoost){s.exp+=item.effect.expBoost}
      if(item.effect.allStats){s.buffAtk+=item.effect.allStats;s.buffDef+=item.effect.allStats}
      item.count=(item.count||1)-1;
      if(item.count<=0)s.inventory.splice(idx,1);
      this.recalcStats();
      showToast('使用了'+item.name,'success');
      return{used:true};
    }
    return null;
  }

  buyItem(shopIdx){
    const s=this.state;if(!s)return null;
    const si=SHOP_ITEMS[shopIdx];
    if(!si)return null;
    const pers=PERSONALITIES_MAP[s.personality];
    const discount=pers?pers.shopDiscount:0;
    const price=Math.floor(si.price*(1-discount));
    if(s.gold<price){showToast('灵石不足','error');return null}
    s.gold-=price;
    if(si.type==='material'){
      const mat=MATERIALS_MAP[si.matId];
      this.addItem({id:mat.id,name:mat.name,type:'material',count:1});
    }else if(si.type==='equipment'){
      const eq=EQUIPMENT_MAP[si.eqId];
      this.addItem({...eq,type:'equipment'});
    }else{
      this.addItem({id:si.id,name:si.name,type:'potion',effect:si.effect,desc:si.desc,count:1});
    }
    this.saveGame();
    return{bought:si.name,price};
  }

  sellItem(invIdx){
    const s=this.state;if(!s)return null;
    const item=s.inventory[invIdx];
    if(!item)return null;
    const value=Math.max(5,(item.tier||0)*50+(item.atk||0)+(item.def||0));
    const gain=Math.floor(value*0.5);
    s.gold+=gain;
    s.inventory.splice(invIdx,1);
    this.saveGame();
    return{sold:item.name,gain};
  }

  donateSect(amount){
    const s=this.state;if(!s)return false;
    if(s.gold<amount)return false;
    s.gold-=amount;
    s.sect_data.contribution+=amount;
    // Update rank
    const c=s.sect_data.contribution;
    if(c>=50000)s.sect_data.rank=4;
    else if(c>=20000)s.sect_data.rank=3;
    else if(c>=5000)s.sect_data.rank=2;
    else if(c>=1000)s.sect_data.rank=1;
    this.saveGame();
    return true;
  }

  getSectRankName(){
    const ranks=['外门弟子','内门弟子','核心弟子','长老','太上长老'];
    return ranks[this.state?this.state.sect_data.rank:0];
  }

  checkAchievements(){
    const s=this.state;if(!s)return;
    ACHIEVEMENTS.forEach(a=>{
      if(s.achievements.includes(a.id))return;
      let unlocked=false;
      const chk=a.check;
      if(chk.startsWith('realm>='))unlocked=s.realm>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('kills>='))unlocked=(s.kills||0)>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('bossKills>='))unlocked=(s.bossKills||0)>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('crafts>='))unlocked=(s.crafts||0)>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('explored>='))unlocked=(s.explored||0)>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('knownNpcs>='))unlocked=s.knownNPCs.length>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('gold>='))unlocked=s.gold>=parseInt(chk.split('>=')[1]);
      else if(chk.startsWith('age>='))unlocked=s.age>=parseInt(chk.split('>=')[1]);
      else if(chk==='hasCave')unlocked=s.cave.owned;
      else if(chk.startsWith('maxRelation>=')){const max=Math.max(0,...Object.values(s.relations));unlocked=max>=parseInt(chk.split('>=')[1])}
      else if(chk.startsWith('maxEnlighten>=')){const max=Math.max(...Object.values(s.enlightenment));unlocked=max>=parseInt(chk.split('>=')[1])}
      else if(chk.startsWith('sectRank>=')){unlocked=s.sect_data.rank>=parseInt(chk.split('>=')[1])}
      else if(chk.startsWith('swordPath>=')){unlocked=s.enlightenment.sword>=parseInt(chk.split('>=')[1])}
      else if(chk.startsWith('alchemyPath>=')){unlocked=s.enlightenment.alchemy>=parseInt(chk.split('>=')[1])}
      else if(chk==='heartDemon<=0')unlocked=s.heartDemon<=0;
      else if(chk==='fullEquip')unlocked=!!(s.equipment.weapon&&s.equipment.armor&&s.equipment.accessory);
      else if(chk==='hasLegendary')unlocked=s.inventory.some(it=>it.quality==='legendary')||Object.values(s.equipment).some(e=>e&&e.quality==='legendary');
      if(unlocked){
        s.achievements.push(a.id);
        showToast('成就解锁：'+a.name,'success');
        this.addWorldLog('获得成就【'+a.name+'】');
      }
    });
  }

  playerDeath(cause){
    const s=this.state;if(!s)return;
    s.dead=true;
    const score=s.realm*1000+s.age*10+s.achievements.length*50+(s.kills||0)*5;
    updateLeaderboard('guigu',score,{name:s.name,realm:REALMS[s.realm].name,age:s.age,cause});
    this.addWorldLog(s.name+'陨落，'+cause);
    this.emit('playerDied',{cause,score});
  }
}


/* ==================== GuiguUI 类 ==================== */
class GuiguUI {
  constructor(){
    this.game=new GuiguGame();
    this.currentTab='overview';
    this.currentInvTab='equipment';
    this.currentMarketTab='buy';
    this.npcFilter='all';
    this.createStep=0;
    this.createConfig={};
    this._domCache={};
    this._createOptionListenerBound=false;
    this._overviewQuickActionsBound=false;
    this.init();
  }

  _getEl(id){
    let el=this._domCache[id];
    if(!el||!el.isConnected){el=document.getElementById(id);this._domCache[id]=el}
    return el;
  }

  init(){
    initNav('guigu');
    initParticles('#particles');
    new SettingsModal([
      {key:'autoSave',label:'自动保存',type:'checkbox',default:true,checkLabel:'每分钟自动保存'},
      {key:'effects',label:'特效',type:'checkbox',default:true,checkLabel:'启用战斗特效'}
    ],'guigu_settings',()=>{});
    this.renderSlotSelection();
    this._bindHotkeys();
    // Bind game events
    this.game.on('timeAdvanced',()=>this.refreshUI());
    this.game.on('meditated',()=>this.renderCultivatePanel());
    this.game.on('breakthrough',()=>{Effects.realmBreakthrough();this.refreshUI()});
    this.game.on('breakthroughFailed',()=>{Effects.screenShake();this.refreshUI()});
    this.game.on('moved',()=>this.refreshUI());
    this.game.on('playerDied',(d)=>this.showDeathModal(d));
    this.game.on('yearChanged',()=>this.renderNewsTicker());
    // Auto-save
    if(this._autoSaveTimer)clearInterval(this._autoSaveTimer);
    this._autoSaveTimer=setInterval(()=>{if(this.game.state&&!this.game.state.dead)this.game.saveGame()},60000);
  }

  refreshUI(){
    this.renderStatusBar();
    this.renderCalendarBar();
    this.renderNewsTicker();
    this.renderCurrentPanel();
  }

  runMeditateBatch(times){
    if(!this.game.state||this.game.state.dead)return;
    let totalExp=0;
    let actual=0;
    let enlightenEvent=null;
    for(let i=0;i<times;i++){
      const r=this.game.meditate();
      if(!r)break;
      actual++;
      totalExp+=r.expGain||0;
      if(r.enlightenEvent&&!enlightenEvent)enlightenEvent=r.enlightenEvent;
      if(this.game.state&&this.game.state.dead)break;
    }
    if(actual>0){
      showToast(`闭关${actual*TIME_COSTS.meditate}天，经验+${formatNumber(totalExp)}`, 'success');
    }
    if(enlightenEvent)this.showEnlightenmentModal(enlightenEvent);
    this.refreshUI();
  }

  runQuickExplore(){
    const s=this.game.state;
    if(!s||s.dead)return;
    const curTerrain=TERRAIN[s.map[s.position.y][s.position.x].terrain];
    if(curTerrain.res.length&&Math.random()<0.4){
      const matId=curTerrain.res[Math.floor(Math.random()*curTerrain.res.length)];
      const mat=MATERIALS_MAP[matId];
      if(mat){
        this.game.addItem({id:mat.id,name:mat.name,type:'material',count:1});
        showToast('快速探索发现了'+mat.name+'！','success');
      }
    }else if(Math.random()<0.3){
      const goldFind=randomInt(10,100)*(s.realm+1);
      s.gold+=goldFind;
      showToast('快速探索获得了'+goldFind+'灵石！','success');
    }else{
      showToast('快速探索暂无收获','info');
    }
    this.game.advanceDays(TIME_COSTS.explore);
    this.refreshUI();
  }

  runQuickGather(){
    const s=this.game.state;
    if(!s||s.dead)return;
    const curTerrain=TERRAIN[s.map[s.position.y][s.position.x].terrain];
    if(!curTerrain.res.length){
      showToast('此地暂无可采集资源', 'info');
      return;
    }
    if(Math.random()<0.7){
      const matId=curTerrain.res[Math.floor(Math.random()*curTerrain.res.length)];
      const mat=MATERIALS_MAP[matId];
      if(mat){
        this.game.addItem({id:mat.id,name:mat.name,type:'material',count:1});
        this.game.updateBountyProgress('collect_herb',1);
        this.game.updateNpcQuestProgress('collect_herb',1);
        showToast('快速采集获得 '+mat.name,'success');
      }
    }else{
      showToast('快速采集未获得材料','info');
    }
    this.game.advanceDays(TIME_COSTS.explore);
    this.refreshUI();
  }

  runQuickRest(times=2){
    const s=this.game.state;
    if(!s||s.dead)return;
    let totalHp=0;
    let totalSp=0;
    let actual=0;
    for(let i=0;i<times;i++){
      if(s.hp>=s.maxHp*0.95&&s.sp>=s.maxSp*0.95)break;
      const hpBefore=s.hp;
      const spBefore=s.sp;
      const hpRecover=Math.floor(s.maxHp*0.38);
      const spRecover=Math.floor(s.maxSp*0.28);
      s.hp=Math.min(s.maxHp,s.hp+hpRecover);
      s.sp=Math.min(s.maxSp,s.sp+spRecover);
      totalHp+=s.hp-hpBefore;
      totalSp+=s.sp-spBefore;
      this.game.advanceDays(TIME_COSTS.rest);
      actual++;
    }
    if(actual>0){
      showToast(`快速休息${actual}次，恢复${totalHp}气血、${totalSp}灵力`, 'success');
    }else{
      showToast('气血与灵力已充盈', 'info');
    }
    this.refreshUI();
  }

  renderCurrentPanel(){
    const m={overview:'renderOverviewPanel',cultivate:'renderCultivatePanel',map:'renderMapPanel',adventure:'renderAdventurePanel',npc:'renderNPCPanel',craft:'renderCraftPanel',market:'renderMarketPanel',cave:'renderCavePanel',skill:'renderSkillPanel',sect:'renderSectPanel',inventory:'renderInventoryPanel',achievement:'renderAchievementPanel',bounty:'renderBountyPanel',mount:'renderMountPanel'};
    if(m[this.currentTab])this[m[this.currentTab]]();
  }

  /* === 存档选择 === */
  renderSlotSelection(){
    const el=this._getEl('char-create');
    const slots=this.game.getSaveSlots();
    let html='<h2>鬼谷八荒</h2><p style="text-align:center;color:var(--text-secondary);margin-bottom:20px">选择存档</p><div class="slot-grid">';
    slots.forEach((s,i)=>{
      if(s.exists){
        html+=`<div class="save-slot"><div class="slot-info"><div class="slot-name">${escapeHtml(s.name)}</div><div class="slot-realm">${escapeHtml(String(s.realm))}</div><div class="slot-details">年龄 ${s.age}</div></div><div class="slot-actions"><button class="btn btn-gold btn-sm" data-action="load" data-slot="${i}">继续</button><button class="btn btn-danger btn-sm" data-action="delete" data-slot="${i}">删除</button></div></div>`;
      }else{
        html+=`<div class="save-slot"><div class="slot-info"><span class="slot-empty">空存档 ${i+1}</span></div><div class="slot-actions"><button class="btn btn-outline btn-sm" data-action="new" data-slot="${i}">新游戏</button></div></div>`;
      }
    });
    html+='</div>';
    el.innerHTML=html;
    el.style.display='';
    this._getEl('guigu-game').style.display='none';
    if(!this._slotListenerBound){
      this._slotListenerBound=true;
      el.addEventListener('click',e=>{
        const btn=e.target.closest('[data-action]');
        if(!btn)return;
        const action=btn.dataset.action;
        const slot=parseInt(btn.dataset.slot);
        if(action==='load'){this.game.loadGame(slot);this.startGame()}
        else if(action==='new'){this.renderCharCreate(slot)}
        else if(action==='delete'){
          if(confirm('确定删除此存档？')){this.game.deleteSave(slot);this.renderSlotSelection()}
        }
      });
    }
  }

  /* === 角色创建 === */
  renderCharCreate(slotIdx){
    this.createConfig={slotIndex:slotIdx,name:'',spiritRoot:'',sect:'',talents:[],personality:'',sex:'male'};
    this.createStep=0;
    this._renderCreateStep();
  }

  _renderCreateStep(){
    const el=this._getEl('char-create');
    const step=this.createStep;
    const cfg=this.createConfig;
    const steps=['道号','灵根','宗门','天赋','性格','确认'];
    let dots=steps.map((s,i)=>`<div class="step-dot ${i<step?'done':''} ${i===step?'active':''}">${i+1}</div>`).join('');
    let body='';
    if(step===0){
      body=`<h3>起一个道号</h3><input class="form-input" id="create-name" placeholder="输入你的道号" value="${cfg.name}" maxlength="8"><div class="sex-select" style="margin-top:12px;text-align:center"><span style="color:var(--text-secondary);margin-right:8px">性别:</span><button class="btn btn-sm ${cfg.sex==='male'?'btn-gold':'btn-outline'}" id="sex-male" style="margin-right:4px">男</button><button class="btn btn-sm ${cfg.sex==='female'?'btn-gold':'btn-outline'}" id="sex-female">女</button></div>`;
    }else if(step===1){
      body='<h3>选择灵根</h3><div class="spirit-root-options">';
      SPIRIT_ROOTS.forEach(sr=>{
        body+=`<div class="spirit-root-option ${cfg.spiritRoot===sr.id?'selected':''}" data-id="${sr.id}"><div class="option-icon">${sr.icon}</div><div class="option-name">${sr.name}</div><div class="option-desc">${sr.desc}</div><div class="option-stats">攻×${sr.atkMul} 防×${sr.defMul} 血×${sr.hpMul} 灵×${sr.spiMul}</div></div>`;
      });
      body+='</div>';
    }else if(step===2){
      body='<h3>选择宗门</h3><div class="sect-options">';
      SECTS.forEach(s=>{
        body+=`<div class="sect-option ${cfg.sect===s.id?'selected':''}" data-id="${s.id}"><div class="option-icon">${s.icon}</div><div class="option-name">${s.name}</div><div class="option-desc">${s.desc}</div></div>`;
      });
      body+='</div>';
    }else if(step===3){
      body='<h3>选择天赋（选2个）</h3><div class="talent-options">';
      TALENTS.forEach(t=>{
        const sel=cfg.talents.includes(t.id);
        const dis=!sel&&cfg.talents.length>=2;
        body+=`<div class="talent-option ${sel?'selected':''} ${dis?'disabled':''}" data-id="${t.id}"><div class="option-name">${t.name}</div><div class="option-desc">${t.desc}</div></div>`;
      });
      body+='</div>';
    }else if(step===4){
      body='<h3>选择性格</h3><div class="personality-options">';
      PERSONALITIES.forEach(p=>{
        body+=`<div class="personality-option ${cfg.personality===p.id?'selected':''}" data-id="${p.id}"><div class="option-name">${p.name}</div><div class="option-desc">${p.desc}</div></div>`;
      });
      body+='</div>';
    }else if(step===5){
      const sr=SPIRIT_ROOTS_MAP[cfg.spiritRoot];
      const sect=SECTS_MAP[cfg.sect];
      const ts=cfg.talents.map(id=>TALENTS_MAP[id].name).join('、');
      const pers=PERSONALITIES_MAP[cfg.personality];
      body=`<h3>确认角色</h3><div class="create-confirm">
        <div class="confirm-row"><span class="label">道号</span><span class="value">${cfg.name}</span></div>
        <div class="confirm-row"><span class="label">性别</span><span class="value">${cfg.sex==='male'?'男':'女'}</span></div>
        <div class="confirm-row"><span class="label">灵根</span><span class="value">${sr?sr.name:''}</span></div>
        <div class="confirm-row"><span class="label">宗门</span><span class="value">${sect?sect.name:''}</span></div>
        <div class="confirm-row"><span class="label">天赋</span><span class="value">${ts}</span></div>
        <div class="confirm-row"><span class="label">性格</span><span class="value">${pers?pers.name:''}</span></div>
      </div>`;
    }
    let nav='<div class="create-nav">';
    if(step>0)nav+='<button class="btn btn-outline btn-sm" id="create-prev">上一步</button>';
    else nav+='<span></span>';
    if(step<5)nav+='<button class="btn btn-gold btn-sm" id="create-next">下一步</button>';
    else nav+='<button class="btn btn-gold" id="create-confirm">踏入鬼谷</button>';
    nav+='</div>';

    el.innerHTML=`<span class="back-to-slots" id="back-slots">← 返回存档</span><h2>创建角色</h2><div class="step-indicator">${dots}</div><div class="create-step active">${body}</div>${nav}`;
    this._bindCreateEvents();
  }

  _bindCreateEvents(){
    const el=this._getEl('char-create');
    const cfg=this.createConfig;
    document.getElementById('back-slots')?.addEventListener('click',()=>this.renderSlotSelection());
    document.getElementById('sex-male')?.addEventListener('click',()=>{cfg.sex='male';this._renderCreateStep()});
    document.getElementById('sex-female')?.addEventListener('click',()=>{cfg.sex='female';this._renderCreateStep()});
    document.getElementById('create-prev')?.addEventListener('click',()=>{this.createStep--;this._renderCreateStep()});
    document.getElementById('create-next')?.addEventListener('click',()=>{
      if(this.createStep===0){
        const name=document.getElementById('create-name')?.value.trim();
        if(!name){showToast('请输入道号','error');return}
        cfg.name=name;
      }else if(this.createStep===1&&!cfg.spiritRoot){showToast('请选择灵根','error');return}
      else if(this.createStep===2&&!cfg.sect){showToast('请选择宗门','error');return}
      else if(this.createStep===3&&cfg.talents.length<2){showToast('请选择2个天赋','error');return}
      else if(this.createStep===4&&!cfg.personality){showToast('请选择性格','error');return}
      this.createStep++;this._renderCreateStep();
    });
    document.getElementById('create-confirm')?.addEventListener('click',()=>{
      this.game.createCharacter(cfg);
      this.startGame();
    });
    // Option selection via event delegation (bind once to avoid duplicate toggles)
    if(!this._createOptionListenerBound){
      this._createOptionListenerBound=true;
      el.addEventListener('click',e=>{
        const curCfg=this.createConfig;
        const o=e.target.closest('.spirit-root-option');
        if(o){curCfg.spiritRoot=o.dataset.id;this._renderCreateStep();return}
        const so=e.target.closest('.sect-option');
        if(so){curCfg.sect=so.dataset.id;this._renderCreateStep();return}
        const to=e.target.closest('.talent-option');
        if(to){
          if(to.classList.contains('disabled')){showToast('只能选择2个天赋','info');return}
          const id=to.dataset.id;
          if(curCfg.talents.includes(id))curCfg.talents=curCfg.talents.filter(t=>t!==id);
          else if(curCfg.talents.length<2)curCfg.talents.push(id);
          this._renderCreateStep();return;
        }
        const po=e.target.closest('.personality-option');
        if(po){curCfg.personality=po.dataset.id;this._renderCreateStep();return}
      });
    }
  }

  /* === 开始游戏 === */
  startGame(){
    // Process offline gains before rendering
    const offlineResult=this.game.processOfflineGains();
    // Clear incremental map render caches so the grid is rebuilt for the new/loaded game
    this._mapCells=null;
    this._mapStates=null;
    this._getEl('char-create').style.display='none';
    this._getEl('guigu-game').style.display='';
    this.setupTabs();
    this.bindOverviewQuickActions();
    this.refreshUI();
    this.game.checkAchievements();
    if(typeof CrossGameAchievements!=='undefined'){
      CrossGameAchievements.trackStat('games_played_guigu',true);
      if(this.game.state){
        CrossGameAchievements.trackStat('guigu_max_realm',this.game.state.realm);
        if(this.game.state.sect)CrossGameAchievements.trackStat('guigu_joined_sect',true);
        if(this.game.state.kills)CrossGameAchievements.trackStat('guigu_kills',this.game.state.kills);
        if(this.game.state.explored)CrossGameAchievements.trackStat('guigu_explored',this.game.state.explored);
      }
    }
    // Show offline gains
    if(offlineResult){
      if(offlineResult.elapsed>=300){
        this._showOfflineModal(offlineResult);
      }else{
        showToast('离线收获 '+formatNumber(offlineResult.expGain)+' 经验','info');
      }
    }
    // 仙缘联动: 检查跨游戏奖励
    if(typeof CrossGameRewards!=='undefined'){
      var ggRewards=CrossGameRewards.checkAndClaim('guigu');
      var ggGame=this.game;
      ggRewards.forEach(function(r){
        if(r.reward.type==='exp_mult'&&ggGame.state){
          ggGame.state.expBonus=(ggGame.state.expBonus||0)+r.reward.value;
          ggGame.saveGame();
        }
        showToast('仙缘联动: '+r.name,'success');
      });
    }
  }

  _showOfflineModal(r){
    const hours=Math.floor(r.elapsed/3600);
    const mins=Math.floor((r.elapsed%3600)/60);
    const timeStr=hours>0?hours+'小时'+mins+'分钟':mins+'分钟';
    const overlay=document.createElement('div');
    overlay.className='modal-overlay active';
    overlay.innerHTML='<div class="modal" style="text-align:center;">'+
      '<div class="modal-header"><h3 class="modal-title">闭关结算</h3></div>'+
      '<p style="color:var(--text-secondary);margin-bottom:16px;">你闭关修炼了 <span style="color:var(--gold)">'+timeStr+'</span>，相当于 <span style="color:var(--cyan)">'+r.days+'</span> 天</p>'+
      '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:20px;">'+
        '<div class="stat-box"><div class="stat-label">经验</div><div class="stat-value">+'+formatNumber(r.expGain)+'</div></div>'+
        (r.goldGain>0?'<div class="stat-box"><div class="stat-label">灵石</div><div class="stat-value">+'+formatNumber(r.goldGain)+'</div></div>':'')+
      '</div>'+
      '<button class="btn btn-gold" id="guigu-offline-dismiss">收下</button>'+
    '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#guigu-offline-dismiss').addEventListener('click',function(){overlay.remove()});
    setTimeout(function(){if(overlay.parentNode)overlay.remove()},15000);
  }

  setupTabs(){
    if(this._tabListenerBound)return;
    this._tabListenerBound=true;
    const tabs=this._getEl('guigu-tabs');
    tabs.addEventListener('click',e=>{
      const btn=e.target.closest('.guigu-tab');
      if(!btn)return;
      this.currentTab=btn.dataset.tab;
      tabs.querySelectorAll('.guigu-tab').forEach(t=>t.classList.toggle('active',t===btn));
      document.querySelectorAll('.guigu-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===this.currentTab));
      this.renderCurrentPanel();
    });
  }

  bindOverviewQuickActions(){
    if(this._overviewQuickActionsBound)return;
    const panel=this._getEl('panel-overview');
    if(!panel)return;
    this._overviewQuickActionsBound=true;
    panel.addEventListener('click',e=>{
      const actionBtn=e.target.closest('[data-overview-action]');
      if(!actionBtn)return;
      this.handleOverviewQuickAction(actionBtn.dataset.overviewAction);
    });
  }

  handleOverviewQuickAction(action){
    if(!this.game.state||this.game.state.dead)return;
    switch(action){
      case 'meditate': {
        const r=this.game.meditate();
        if(r&&r.enlightenEvent)this.showEnlightenmentModal(r.enlightenEvent);
        this.refreshUI();
        return;
      }
      case 'meditate-90':
        this.runMeditateBatch(3);
        return;
      case 'meditate-180':
        this.runMeditateBatch(6);
        return;
      case 'explore':
        this.runQuickExplore();
        return;
      case 'gather':
        this.runQuickGather();
        return;
      case 'rest':
        this.runQuickRest();
        return;
      case 'wudao':
        this._showWudaoTraining();
        return;
      case 'map':
        this.currentTab='map';
        this._getEl('guigu-tabs').querySelectorAll('.guigu-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab==='map'));
        document.querySelectorAll('.guigu-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel==='map'));
        this.renderMapPanel();
        return;
      case 'save':
        this.game.saveGame();
        showToast('存档成功','success');
        return;
      case 'back':
        this.game.saveGame();
        this.renderSlotSelection();
        return;
      default:
        return;
    }
  }

  _bindHotkeys(){
    if(this._hotkeyBound)return;
    this._hotkeyBound=true;
    document.addEventListener('keydown',e=>{
      if(e.altKey||e.ctrlKey||e.metaKey)return;
      const activeTag=document.activeElement?document.activeElement.tagName:'';
      if(['INPUT','TEXTAREA','SELECT'].includes(activeTag))return;
      if(!this.game.state)return;
      const tabsEl=this._getEl('guigu-tabs');
      if(!tabsEl||this._getEl('guigu-game').style.display==='none')return;
      if(e.key!=='['&&e.key!==']')return;
      const tabs=[...tabsEl.querySelectorAll('.guigu-tab')];
      if(!tabs.length)return;
      const currentIdx=tabs.findIndex(t=>t.dataset.tab===this.currentTab);
      const dir=e.key===']'?1:-1;
      const nextIdx=(currentIdx+dir+tabs.length)%tabs.length;
      const nextTab=tabs[nextIdx];
      if(!nextTab)return;
      e.preventDefault();
      this.currentTab=nextTab.dataset.tab;
      tabs.forEach(t=>t.classList.toggle('active',t===nextTab));
      document.querySelectorAll('.guigu-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===this.currentTab));
      this.renderCurrentPanel();
    });
  }

  /* === 状态栏 === */
  _initStatusBarCache(){
    const el=this._getEl('status-bar');
    el.innerHTML=`
      <div class="stat-item"><span class="stat-label">道号</span><span class="stat-value" id="gsb-name"></span></div>
      <div class="stat-item"><span class="stat-label">境界</span><span class="stat-value" id="gsb-realm"></span></div>
      <div class="stat-item"><span class="stat-label" id="gsb-life-label">寿命</span><div class="bar bar-life"><div class="bar-fill" id="gsb-life-fill"></div></div></div>
      <div class="stat-item"><span class="stat-label" id="gsb-hp-label">气血</span><div class="bar bar-hp"><div class="bar-fill" id="gsb-hp-fill"></div></div></div>
      <div class="stat-item"><span class="stat-label" id="gsb-sp-label">灵力</span><div class="bar bar-sp"><div class="bar-fill" id="gsb-sp-fill"></div></div></div>
      <div class="stat-item"><span class="stat-label">灵石</span><span class="stat-value" id="gsb-gold"></span></div>`;
    this._gsbCache={
      name:document.getElementById('gsb-name'),
      realm:document.getElementById('gsb-realm'),
      lifeLabel:document.getElementById('gsb-life-label'),
      lifeFill:document.getElementById('gsb-life-fill'),
      hpLabel:document.getElementById('gsb-hp-label'),
      hpFill:document.getElementById('gsb-hp-fill'),
      spLabel:document.getElementById('gsb-sp-label'),
      spFill:document.getElementById('gsb-sp-fill'),
      gold:document.getElementById('gsb-gold'),
    };
  }
  renderStatusBar(){
    const s=this.game.state;if(!s)return;
    if(!this._gsbCache)this._initStatusBarCache();
    const c=this._gsbCache;
    const r=REALMS[s.realm];
    const lifeP=Math.floor((1-s.age/s.lifespan)*100);
    const hpP=Math.floor(s.hp/s.maxHp*100);
    const spP=Math.floor(s.sp/s.maxSp*100);
    c.name.textContent=s.name;
    c.realm.textContent=r.name;
    c.realm.style.color=this.getRealmColor(s.realm);
    c.lifeLabel.textContent='寿命 '+s.age+'/'+s.lifespan;
    c.lifeFill.style.width=lifeP+'%';
    c.hpLabel.textContent='气血 '+s.hp+'/'+s.maxHp;
    c.hpFill.style.width=hpP+'%';
    c.spLabel.textContent='灵力 '+s.sp+'/'+s.maxSp;
    c.spFill.style.width=spP+'%';
    c.gold.textContent=formatNumber(s.gold);
  }

  renderCalendarBar(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('calendar-bar');
    const hdP=s.heartDemon;
    const alignCls=s.alignment>0?'alignment-good':s.alignment<0?'alignment-evil':'alignment-neutral';
    const alignText=s.alignment>0?'正道+'+s.alignment:s.alignment<0?'魔道'+s.alignment:'中立';
    el.innerHTML=`
      <div class="calendar-item">📅 第${s.year}年 ${s.month}月</div>
      <div class="calendar-item">心魔: <div class="bar bar-demon" style="width:60px;display:inline-block;vertical-align:middle"><div class="bar-fill" style="width:${hdP}%"></div></div> ${hdP}/100</div>
      <div class="calendar-item ${alignCls}">阵营: ${alignText}</div>`;
  }

  renderNewsTicker(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('news-ticker');
    const msgs=s.worldLog.slice(0,15).map(w=>`<span class="news-item">【第${w.year}年】${escapeHtml(w.text)}</span>`).join('');
    el.innerHTML=`<div class="news-ticker-inner">${msgs||'<span class="news-item">天地初开，万物始生...</span>'}</div>`;
  }

  /* === 总览面板 === */
  renderOverviewPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-overview');
    const sr=SPIRIT_ROOTS_MAP[s.spiritRoot];
    const sect=SECTS_MAP[s.sect];
    const pers=PERSONALITIES_MAP[s.personality];
    const nextExp=s.realm<7?REALMS[s.realm+1].expReq:s.exp;
    const expP=Math.floor(s.exp/nextExp*100);
    const talentHtml=s.talents.map(tid=>{const t=TALENTS_MAP[tid];return`<span class="talent-tag">${t?t.name:tid}</span>`}).join('');

    el.innerHTML=`<div class="overview-grid">
      <div class="overview-card"><h3>角色信息</h3>
        <div class="info-row"><span class="label">道号</span><span class="value">${escapeHtml(s.name)}</span></div>
        <div class="info-row"><span class="label">境界</span><span class="value" style="color:${this.getRealmColor(s.realm)}">${REALMS[s.realm].name}</span></div>
        <div class="info-row"><span class="label">灵根</span><span class="value">${sr?sr.name:''}</span></div>
        <div class="info-row"><span class="label">宗门</span><span class="value">${sect?sect.name:''}</span></div>
        <div class="info-row"><span class="label">性格</span><span class="value">${pers?pers.name:''}</span></div>
        <div class="info-row"><span class="label">年龄</span><span class="value">${s.age}岁</span></div>
        <div style="margin-top:8px">${talentHtml}</div>
      </div>
      <div class="overview-card"><h3>属性</h3>
        <div class="info-row"><span class="label">攻击</span><span class="value">${s.atk}</span></div>
        <div class="info-row"><span class="label">防御</span><span class="value">${s.def}</span></div>
        <div class="info-row"><span class="label">气血</span><span class="value">${s.hp}/${s.maxHp}</span></div>
        <div class="info-row"><span class="label">灵力</span><span class="value">${s.sp}/${s.maxSp}</span></div>
        <div class="info-row"><span class="label">经验</span><span class="value">${formatNumber(s.exp)}/${formatNumber(nextExp)}</span></div>
        <div class="exp-bar-wrap"><div class="bar bar-exp"><div class="bar-fill" style="width:${expP}%"></div></div></div>
        <div class="info-row"><span class="label">修炼速度</span><span class="value">${this.game.getExpPerDay()}/天</span></div>
      </div>
      <div class="overview-card" style="grid-column:1/-1"><h3>快捷操作</h3>
        <div class="quick-actions">
          <button class="btn btn-outline btn-sm" data-overview-action="meditate-90">闭关90天</button>
          <button class="btn btn-outline btn-sm" data-overview-action="meditate-180">闭关180天</button>
          <button class="btn btn-gold btn-sm" data-overview-action="meditate">修炼30天</button>
          <button class="btn btn-outline btn-sm" data-overview-action="wudao">悟道修炼</button>
          <button class="btn btn-outline btn-sm" data-overview-action="map">查看地图</button>
          <button class="btn btn-outline btn-sm" data-overview-action="explore">快速探索</button>
          <button class="btn btn-outline btn-sm" data-overview-action="gather">快速采集</button>
          <button class="btn btn-outline btn-sm" data-overview-action="rest">快速休息</button>
          <button class="btn btn-outline btn-sm" data-overview-action="save">手动存档</button>
          <button class="btn btn-outline btn-sm" data-overview-action="back">返回存档</button>
        </div>
      </div>
    </div>`;
  }

  /* === 修炼面板 === */
  renderCultivatePanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-cultivate');
    const nextExp=s.realm<7?REALMS[s.realm+1].expReq:s.exp;
    const expP=Math.min(100,Math.floor(s.exp/nextExp*100));
    const canBreak=this.game.canBreakthrough();
    // Enlightenment paths
    let pathsHtml='';
    ['sword','alchemy','formation','body','beast'].forEach(p=>{
      const v=s.enlightenment[p];
      const lv=this.game.getEnlightenmentLevel(v);
      const names={sword:'剑道',alchemy:'丹道',formation:'阵道',body:'体道',beast:'御兽'};
      pathsHtml+=`<div class="path-row"><span class="path-name">${names[p]}</span><div class="path-bar path-${p}"><div class="path-fill" style="width:${v}%"></div><div class="path-markers"><div class="path-marker" style="left:25%"></div><div class="path-marker" style="left:50%"></div><div class="path-marker" style="left:75%"></div></div></div><span class="path-level">${lv} ${v}</span></div>`;
    });
    const logHtml=s.cultLog.slice(0,10).map(l=>`<div class="cult-log-entry">${l}</div>`).join('');
    // Dual cultivation status
    const dc=s.dualCultivation||{partnerId:null,daysLeft:0};
    const dcPartner=dc.partnerId?s.npcs.find(n=>n.id===dc.partnerId):null;
    const dcHtml=dc.partnerId&&dc.daysLeft>0?`<div style="margin-top:8px;padding:8px 12px;background:rgba(212,164,74,0.15);border:1px solid var(--gold-dim);border-radius:var(--radius-sm);font-size:0.85rem;color:var(--gold-light)">双修中: 与${dcPartner?dcPartner.name:'道侣'}双修，经验×1.5，剩余${dc.daysLeft}天</div>`:'';
    const expPreview=Math.floor(this.game.getExpPerDay()*30*(dc.partnerId&&dc.daysLeft>0?1.5:1));

    el.innerHTML=`
      <div class="meditate-section">
        <div class="meditate-circle" id="med-circle">🧘</div>
        <div class="meditate-info">每次修炼消耗30天，预计获得 ${formatNumber(expPreview)} 经验${dc.partnerId&&dc.daysLeft>0?' (含双修加成)':''}</div>
        ${dcHtml}
        <button class="btn btn-gold" id="btn-meditate">开始修炼</button>
        <button class="btn btn-outline" id="btn-wudao-cult" style="margin-top:8px;">悟道修炼 (30天)</button>
      </div>
      <div class="exp-section">
        <div class="exp-label"><span>经验 ${formatNumber(s.exp)}</span><span>${formatNumber(nextExp)}</span></div>
        <div class="exp-bar"><div class="bar-fill" style="width:${expP}%"></div></div>
      </div>
      <div class="breakthrough-section">
        <h3>突破 → ${s.realm<7?REALMS[s.realm+1].name:'已达巅峰'}</h3>
        ${canBreak?`<div class="breakthrough-info">成功率约 ${Math.floor(REALMS[s.realm+1].breakRate*100)}%（基础）${s.heartDemon>30?'<br>心魔过高，需通过心魔试炼':''}</div><button class="btn breakthrough-btn" id="btn-break">尝试突破</button>`:'<div class="breakthrough-info">经验不足，继续修炼</div><button class="btn breakthrough-btn" id="btn-break-disabled" aria-disabled="true" data-disabled-reason="经验不足">经验不足</button>'}
      </div>
      <div class="enlightenment-section"><h3>悟道</h3>${pathsHtml}</div>
      <div class="cult-log"><h4 style="color:var(--gold-light);margin-bottom:8px">修炼日志</h4>${logHtml}</div>`;

    const wudaoBtn=document.getElementById('btn-wudao-cult');
    if(wudaoBtn&&!document.getElementById('btn-meditate-90')){
      const batchWrap=document.createElement('div');
      batchWrap.style.cssText='margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
      batchWrap.innerHTML='<button class="btn btn-outline" id="btn-meditate-90">闭关90天</button><button class="btn btn-outline" id="btn-meditate-180">闭关180天</button>';
      wudaoBtn.parentNode.insertBefore(batchWrap,wudaoBtn);
    }

    document.getElementById('btn-meditate')?.addEventListener('click',()=>{
      const circle=document.getElementById('med-circle');
      circle?.classList.add('meditating');
      setTimeout(()=>circle?.classList.remove('meditating'),1500);
      const r=this.game.meditate();
      if(r&&r.enlightenEvent)this.showEnlightenmentModal(r.enlightenEvent);
      this.refreshUI();
    });
    document.getElementById('btn-meditate-90')?.addEventListener('click',()=>{this.runMeditateBatch(3)});
    document.getElementById('btn-meditate-180')?.addEventListener('click',()=>{this.runMeditateBatch(6)});
    document.getElementById('btn-wudao-cult')?.addEventListener('click',()=>{
      this._showWudaoTraining();
    });
    document.getElementById('btn-break')?.addEventListener('click',()=>{
      const r=this.game.tryBreakthrough();
      if(!r)return;
      if(r.needTrial){this.showHeartDemonModal(r.scenarios);return}
      if(r.success)showToast('突破成功！'+r.realm,'success');
      else showToast(r.msg||'突破失败','error');
      this.refreshUI();
    });
    document.getElementById('btn-break-disabled')?.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('经验不足，继续修炼', 'info');
    });
  }

  /* === 大地图面板 === */
  renderMapPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-map');
    const adj=this.game.getAdjacentCells();
    const adjSet=new Set(adj.map(a=>a.x+','+a.y));
    const mapSize=15;

    // Sect territory definitions: center positions and colors
    const sectTerritories=[
      {cx:3,cy:3,name:'剑宗',color:'rgba(100,180,255,0.12)'},
      {cx:11,cy:3,name:'丹宗',color:'rgba(180,100,255,0.12)'},
      {cx:3,cy:11,name:'体修宗',color:'rgba(255,160,80,0.12)'},
      {cx:11,cy:11,name:'万法宗',color:'rgba(80,220,160,0.12)'}
    ];
    // Build territory map: which cells belong to which sect (radius 3)
    const territoryMap={};
    sectTerritories.forEach(st=>{
      for(let dy=-3;dy<=3;dy++){
        for(let dx=-3;dx<=3;dx++){
          const tx=st.cx+dx,ty=st.cy+dy;
          if(tx>=0&&tx<mapSize&&ty>=0&&ty<mapSize){
            territoryMap[tx+','+ty]={name:st.name,color:st.color};
          }
        }
      }
    });

    // Initialize panel skeleton and cell cache on first render
    if(!this._mapCells){
      this._mapCells=[];
      this._mapStates=[];
      el.innerHTML='<div class="panel-title">大地图</div><div class="map-container"><div class="map-grid" id="map-grid-container"></div><div class="map-info" id="map-info-container"></div></div><div class="map-detail-sidebar empty" id="map-detail-sidebar"><span>点击已探索的格子查看详情</span></div>';
      const gridContainer=document.getElementById('map-grid-container');
      const frag=document.createDocumentFragment();
      for(let y=0;y<mapSize;y++){
        this._mapCells[y]=[];
        this._mapStates[y]=[];
        for(let x=0;x<mapSize;x++){
          const cell=document.createElement('div');
          cell.className='map-cell';
          cell.dataset.x=x;
          cell.dataset.y=y;
          frag.appendChild(cell);
          this._mapCells[y][x]=cell;
          this._mapStates[y][x]='';
        }
      }
      gridContainer.appendChild(frag);
      // Event delegation: bind click once on the grid container
      gridContainer.addEventListener('click',(e)=>{
        const cellEl=e.target.closest('.map-cell');
        if(!cellEl)return;
        const cx=parseInt(cellEl.dataset.x),cy=parseInt(cellEl.dataset.y);
        // Show detail for explored cells (not fog or fog-near)
        if(!cellEl.classList.contains('fog')&&!cellEl.classList.contains('fog-near')){
          this._showMapCellDetail(cx,cy,el,territoryMap);
        }
        // Handle movement for adjacent cells
        if(cellEl.classList.contains('adjacent')){
          const r=this.game.moveTo(cx,cy);
          if(r&&r.error){showToast(r.error,'error');return}
          if(r&&r.encounter){
            const enc=r.encounter;
            if(enc.type==='monster'){
              this.game.startBattle(enc.monster);
              this.showBattleModal();
            }
            if(enc.material){
              showToast('获得 '+enc.material.name,'success');
            }
            if(enc.spiritBeast){
              setTimeout(()=>{
                showToast('灵兽出没！发现'+enc.spiritBeast.monster.name+'！','success');
                this.game.startBattle(enc.spiritBeast.monster);
                this.showBattleModal();
              },enc.type==='monster'?0:300);
            }
            if(enc.randomEvent){
              showToast(enc.randomEvent.text,'success');
            }
            if(enc.ambush){
              setTimeout(()=>{
                showToast('遭遇伏击！'+enc.ambush.monster.name+'突然出现！','error');
                this.game.startBattle(enc.ambush.monster);
                this.showBattleModal();
              },enc.type==='monster'?0:300);
            }
          }
          this.refreshUI();
        }
      });
    }

    // Incrementally update only changed cells
    for(let y=0;y<mapSize;y++){
      for(let x=0;x<mapSize;x++){
        const cell=s.map[y][x];
        const t=TERRAIN[cell.terrain];
        const explored=s.fog[y][x];
        const isPlayer=s.position.x===x&&s.position.y===y;
        const isAdj=adjSet.has(x+','+y);
        const hasNpc=explored&&s.npcs.some(n=>n.alive&&n.position.x===x&&n.position.y===y);
        let fogState='';
        if(!explored){
          let nearExplored=false;
          if(y>0&&s.fog[y-1][x])nearExplored=true;
          if(y<mapSize-1&&s.fog[y+1][x])nearExplored=true;
          if(x>0&&s.fog[y][x-1])nearExplored=true;
          if(x<mapSize-1&&s.fog[y][x+1])nearExplored=true;
          fogState=nearExplored?'fog-near':'fog';
        }
        const territory=territoryMap[x+','+y];
        const territoryColor=territory&&explored?territory.color:'';
        const locName=explored&&cell.locName?cell.locName:'';
        const stateKey=`${explored?1:0}|${isPlayer?1:0}|${isAdj?1:0}|${hasNpc?1:0}|${fogState}|${territoryColor}|${t.cls}|${locName}`;

        if(stateKey!==this._mapStates[y][x]){
          this._mapStates[y][x]=stateKey;
          const cellEl=this._mapCells[y][x];
          // Rebuild class
          let cls=`map-cell terrain-${t.cls} ${t.cls}`;
          if(fogState)cls+=' '+fogState;
          if(isPlayer)cls+=' player player-cell';
          if(isAdj&&explored)cls+=' adjacent';
          cellEl.className=cls;
          // Rebuild style (territory overlay)
          cellEl.style.cssText=territoryColor?'background:'+territoryColor+';':'';
          // Rebuild innerHTML
          let innerHtml='';
          if(explored)innerHtml+=t.icon;
          if(hasNpc&&!isPlayer)innerHtml+='<div class="npc-dot"></div>';
          if(locName)innerHtml+='<span class="map-cell-label">'+locName+'</span>';
          cellEl.innerHTML=innerHtml;
        }
      }
    }

    // Update map info section (always update, it is small)
    const curTerrain=TERRAIN[s.map[s.position.y][s.position.x].terrain];
    const npcsHere=s.npcs.filter(n=>n.alive&&n.position.x===s.position.x&&n.position.y===s.position.y);
    const curTerritory=territoryMap[s.position.x+','+s.position.y];
    let infoHtml=`<div class="location-name">${curTerrain.icon} ${curTerrain.name}${curTerritory?' <span style="font-size:0.8rem;color:var(--text-muted)">（'+curTerritory.name+'领地）</span>':''}</div><div class="location-desc">坐标 (${s.position.x}, ${s.position.y}) | 危险等级 ${'★'.repeat(curTerrain.danger)||'安全'}</div>`;
    if(npcsHere.length)infoHtml+=`<div style="margin-top:8px;font-size:0.8rem;color:var(--text-secondary)">此处修士: ${npcsHere.map(n=>n.name).join('、')}</div>`;
    infoHtml+=`<div class="map-legend" style="margin-top:12px">${TERRAIN.map(t=>`<span class="legend-item"><span class="legend-color terrain-${t.cls}" style="display:inline-block;width:12px;height:12px;border-radius:2px"></span>${t.icon}${t.name}</span>`).join('')}</div>`;
    const infoEl=this._getEl('map-info-container');
    if(infoEl)infoEl.innerHTML=infoHtml;
  }

  /* === 地图格子详情侧边栏 === */
  _showMapCellDetail(cx,cy,el,territoryMap){
    const s=this.game.state;if(!s)return;
    const sidebar=this._getEl('map-detail-sidebar');
    if(!sidebar)return;
    const cell=s.map[cy][cx];
    const t=TERRAIN[cell.terrain];
    const territory=territoryMap[cx+','+cy];
    const dist=Math.abs(cx-s.position.x)+Math.abs(cy-s.position.y);
    const cellNpcs=s.npcs.filter(n=>n.alive&&n.position.x===cx&&n.position.y===cy);
    // Danger stars HTML
    let dangerHtml='';
    if(t.danger===0){
      dangerHtml='<span class="danger-safe">安全</span>';
    }else{
      for(let i=0;i<5;i++){
        dangerHtml+=`<span class="danger-star${i<t.danger?'':' dim'}">★</span>`;
      }
    }
    // Resources HTML
    let resHtml='';
    if(t.res.length){
      const resTags=t.res.map(rid=>{const m=MATERIALS_MAP[rid];return m?`<span class="resource-tag">${m.name}</span>`:''}).join('');
      resHtml=`<div class="map-detail-resources"><h4>可获取资源</h4><div class="resource-tags">${resTags}</div></div>`;
    }
    // NPCs HTML
    let npcHtml='';
    if(cellNpcs.length){
      const npcItems=cellNpcs.map(n=>`<div class="detail-npc-item"><span class="npc-indicator"></span><span>${n.name}</span><span style="color:var(--purple-light);font-size:0.72rem;margin-left:auto">${REALMS[n.realm].name}</span></div>`).join('');
      npcHtml=`<div class="map-detail-npcs"><h4>此处修士</h4>${npcItems}</div>`;
    }
    // Teleport button (town only)
    let teleportHtml='';
    if(t.cls==='town'&&dist>0){
      const cost=dist*50;
      const canAfford=s.gold>=cost;
      teleportHtml=`<div class="map-detail-actions"><button class="btn-teleport" id="btn-fast-travel" data-tx="${cx}" data-ty="${cy}" aria-disabled="${canAfford?'false':'true'}" ${canAfford?'':`data-disabled-reason="灵石不足"`}>传送至${cell.locName||t.name}<span class="teleport-cost">花费 ${cost} 灵石（距离 ${dist}）${canAfford?'':'- 灵石不足'}</span></button></div>`;
    }
    sidebar.className='map-detail-sidebar';
    sidebar.innerHTML=`
      <div class="map-detail-header">
        <div class="detail-icon">${t.icon}</div>
        <div>
          <div class="detail-title">${cell.locName||t.name}</div>
          <div class="detail-subtitle">${t.name}${territory?' - '+territory.name+'领地':''}</div>
        </div>
      </div>
      <div class="map-detail-row"><span class="label">坐标</span><span class="value">(${cx}, ${cy})</span></div>
      <div class="map-detail-row"><span class="label">危险等级</span><span class="value"><span class="danger-indicator">${dangerHtml}</span></span></div>
      <div class="map-detail-row"><span class="label">距离</span><span class="value">${dist===0?'当前位置':dist+'步'}</span></div>
      ${resHtml}${npcHtml}${teleportHtml}`;
    // Highlight selected cell
    el.querySelectorAll('.map-cell.detail-selected').forEach(c=>c.classList.remove('detail-selected'));
    const selCell=el.querySelector(`.map-cell[data-x="${cx}"][data-y="${cy}"]`);
    if(selCell)selCell.classList.add('detail-selected');
    // Bind teleport
    const tpBtn=document.getElementById('btn-fast-travel');
    if(tpBtn){
      tpBtn.addEventListener('click',()=>{
        if (tpBtn.getAttribute('aria-disabled') === 'true') {
          showToast(tpBtn.dataset.disabledReason || '灵石不足', 'warning');
          return;
        }
        const tx=parseInt(tpBtn.dataset.tx),ty=parseInt(tpBtn.dataset.ty);
        const r=this.game.fastTravel(tx,ty);
        if(r&&r.error){showToast(r.error,'error');return}
        if(r&&r.success){showToast('传送至'+r.locName+'，花费'+r.cost+'灵石','success');this.refreshUI()}
      });
    }
  }

  /* === 历练面板 === */
  renderAdventurePanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-adventure');
    const curTerrain=TERRAIN[s.map[s.position.y][s.position.x].terrain];
    const monsters=MONSTERS.filter(m=>!m.spiritBeast&&m.realmMin<=s.realm&&m.realmMax>=s.realm&&(m.terrain===curTerrain.cls||Math.random()<0.05));
    // Spirit beasts available in this terrain
    const spiritBeasts=MONSTERS.filter(m=>m.spiritBeast&&m.terrain===curTerrain.cls&&m.realmMin<=s.realm&&m.realmMax>=s.realm);

    // Difficulty calculation based on terrain danger vs player realm
    const getDifficulty=(danger)=>{
      if(danger===0)return{cls:'safe',label:'安全',badge:'badge-safe'};
      if(danger<=s.realm)return{cls:'easy',label:'容易',badge:'badge-easy'};
      if(danger<=s.realm+1)return{cls:'medium',label:'中等',badge:'badge-medium'};
      return{cls:'hard',label:'困难',badge:'badge-hard'};
    };
    const diff=getDifficulty(curTerrain.danger);

    // Action cards
    const actionCards=[
      {id:'battle',icon:'⚔️',name:'战斗',desc:'与此地的妖兽搏斗，获取经验和掉落',diff:diff,available:monsters.length>0||spiritBeasts.length>0},
      {id:'explore',icon:'🔍',name:'搜索',desc:'搜索周围环境，寻找隐藏的宝物和材料',diff:getDifficulty(Math.max(0,curTerrain.danger-1)),available:true},
      {id:'rest',icon:'💤',name:'休息',desc:'原地休息恢复气血和灵力',diff:{cls:'safe',label:'安全',badge:'badge-safe'},available:true},
      {id:'gather',icon:'🌿',name:'采集',desc:'采集此地的天然资源和灵材',diff:getDifficulty(Math.floor(curTerrain.danger/2)),available:curTerrain.res.length>0}
    ];

    let cardsHtml='<div class="action-card-grid">';
    actionCards.forEach(card=>{
      const disabledCls=card.available?'':'disabled';
      const disabledStyle=card.available?'':'opacity:0.4;';
      const disabledReason = card.available ? '' : (card.id==='battle'?'此处暂无可战斗的目标':card.id==='gather'?'此地暂无可采集资源':'当前不可用');
      cardsHtml+=`<div class="action-card diff-${card.diff.cls} ${disabledCls}" data-action="${card.id}" data-disabled="${card.available?'0':'1'}" data-disabled-reason="${disabledReason}" style="${disabledStyle}">
        <div class="action-card-icon">${card.icon}</div>
        <div class="action-card-name">${card.name}</div>
        <div class="action-card-desc">${card.desc}</div>
        <span class="action-card-badge ${card.diff.badge}">${card.diff.label}</span>
        ${!card.available?'<span style="font-size:0.7rem;color:var(--text-muted);margin-left:6px">不可用</span>':''}
      </div>`;
    });
    cardsHtml+='</div>';

    let monHtml=monsters.length?monsters.map(m=>`<div class="monster-card"><div class="monster-info"><div class="monster-name">${m.name}</div><div class="monster-level">${REALMS[m.realmMin].name}~${REALMS[m.realmMax].name}</div><div class="monster-stats">HP:${m.hp} ATK:${m.atk} DEF:${m.def}</div></div><button class="btn btn-danger btn-sm fight-btn" data-mid="${m.id}">战斗</button></div>`).join(''):'<p style="color:var(--text-muted);text-align:center;padding:20px">此处暂无可战斗的目标</p>';
    if(spiritBeasts.length){
      monHtml+='<h4 style="color:var(--gold-light);margin:12px 0 8px">灵兽出没</h4>';
      monHtml+=spiritBeasts.map(m=>`<div class="monster-card" style="border-color:var(--gold-dim)"><div class="monster-info"><div class="monster-name" style="color:var(--gold-light)">${m.name} <span style="font-size:0.75rem;color:var(--text-muted)">灵兽</span></div><div class="monster-level">${REALMS[m.realmMin].name}~${REALMS[m.realmMax].name}</div><div class="monster-stats">HP:${m.hp} ATK:${m.atk} DEF:${m.def}</div></div><button class="btn btn-gold btn-sm fight-btn" data-mid="${m.id}">挑战</button></div>`).join('');
    }

    el.innerHTML=`<div class="panel-title">历练</div><div class="location-header"><h3>${curTerrain.icon} ${curTerrain.name}</h3><p>危险等级: ${'★'.repeat(curTerrain.danger)||'安全'} <span class="action-card-badge ${diff.badge}" style="margin-left:8px">${diff.label}</span></p></div>${cardsHtml}<div class="monster-list" id="adventure-monster-list" style="display:none">${monHtml}</div>`;

    // Card action handlers (avoid duplicate listeners on re-render)
    el.onclick=(e)=>{
      const card=e.target.closest('.action-card[data-action]');
      if(card){
        if (card.dataset.disabled === '1') {
          showToast(card.dataset.disabledReason || '当前不可用', 'info');
          return;
        }
        const action=card.dataset.action;
        if(action==='battle'){
          // Show/toggle monster list
          const monList=document.getElementById('adventure-monster-list');
          if(monList)monList.style.display=monList.style.display==='none'?'block':'none';
        }else if(action==='explore'){
          // Search the area for hidden resources/encounters
          const terrain=curTerrain;
          if(terrain.res.length&&Math.random()<0.5){
            const matId=terrain.res[Math.floor(Math.random()*terrain.res.length)];
            const mat=MATERIALS_MAP[matId];
            if(mat){
              this.game.addItem({id:mat.id,name:mat.name,type:'material',count:1});
              showToast('搜索发现了 '+mat.name+'！','success');
            }
          }else if(Math.random()<0.38){
            const goldFind=randomInt(10,100)*(s.realm+1);
            s.gold+=goldFind;
            showToast('搜索发现了 '+goldFind+' 灵石！','success');
          }else{
            showToast('搜索未发现任何东西','info');
          }
          this.game.advanceDays(TIME_COSTS.explore);
          this.refreshUI();
        }else if(action==='rest'){
          const hpRecover=Math.floor(s.maxHp*0.38);
          const spRecover=Math.floor(s.maxSp*0.28);
          s.hp=Math.min(s.maxHp,s.hp+hpRecover);
          s.sp=Math.min(s.maxSp,s.sp+spRecover);
          this.game.advanceDays(TIME_COSTS.rest);
          showToast('休息恢复了 '+hpRecover+' 气血, '+spRecover+' 灵力','success');
          this.refreshUI();
        }else if(action==='gather'){
          const terrain=curTerrain;
          if(terrain.res.length){
            const matId=terrain.res[Math.floor(Math.random()*terrain.res.length)];
            const mat=MATERIALS_MAP[matId];
            if(mat&&Math.random()<0.7){
              this.game.addItem({id:mat.id,name:mat.name,type:'material',count:1});
              this.game.updateBountyProgress('collect_herb',1);
              this.game.updateNpcQuestProgress('collect_herb',1);
              showToast('采集获得 '+mat.name,'success');
            }else{
              showToast('采集未获得材料','info');
            }
          }
          this.game.advanceDays(TIME_COSTS.explore);
          this.refreshUI();
        }
        return;
      }
      const fBtn=e.target.closest('.fight-btn');
      if(fBtn){
        const mon=MONSTERS_MAP[fBtn.dataset.mid];
        if(mon){this.game.startBattle(mon);this.showBattleModal()}
      }
    };
  }

  /* === NPC面板 === */
  renderNPCPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-npc');
    const filters=[{id:'all',name:'全部'},{id:'known',name:'已知'},{id:'friend',name:'友人'},{id:'enemy',name:'仇敌'}];
    let npcs=s.npcs;
    if(this.npcFilter==='known')npcs=npcs.filter(n=>s.knownNPCs.includes(n.id));
    else if(this.npcFilter==='friend')npcs=npcs.filter(n=>(s.relations[n.id]||0)>=20);
    else if(this.npcFilter==='enemy')npcs=npcs.filter(n=>(s.relations[n.id]||0)<0);
    let filterHtml=filters.map(f=>`<button class="npc-filter-btn ${this.npcFilter===f.id?'active':''}" data-filter="${f.id}">${f.name}</button>`).join('');
    let listHtml=npcs.map(n=>{
      const rel=s.relations[n.id]||0;
      const relInfo=this.game.getNPCRelationLabel(n.id);
      const relP=Math.min(100,Math.max(0,(rel+100)/2));
      return`<div class="npc-card ${n.alive?'':'dead'}" data-nid="${n.id}"><div class="npc-name">${escapeHtml(n.name)} <span style="font-size:0.75rem;color:var(--text-muted)">${(n.sex||'male')==='male'?'♂':'♀'}</span></div><div class="npc-realm">${REALMS[n.realm].name}</div><div class="npc-age">年龄 ${n.age}</div><div class="npc-relation"><div class="relation-label"><span>${relInfo.label}</span><span>${rel}</span></div><div class="relation-bar relation-${relInfo.cls}"><div class="bar-fill" style="width:${relP}%"></div></div></div></div>`;
    }).join('');

    el.innerHTML=`<div class="panel-title">人物</div><div class="npc-filters">${filterHtml}</div><div class="npc-list">${listHtml||'<p style="color:var(--text-muted);text-align:center">暂未认识任何修士</p>'}</div>`;
    el.onclick=(e)=>{
      const fb=e.target.closest('.npc-filter-btn');
      if(fb){this.npcFilter=fb.dataset.filter;this.renderNPCPanel();return}
      const nc=e.target.closest('.npc-card');
      if(nc){
        const npc=s.npcs.find(n=>n.id===nc.dataset.nid);
        if(!npc) return;
        if(npc.alive) this.showNPCInteractionModal(npc.id);
        else showToast('此修士已陨落', 'info');
      }
    };
  }

  /* === 炼制面板 === */
  renderCraftPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-craft');
    let html='<div class="panel-title">炼制</div><div class="recipe-list">';
    RECIPES.forEach(r=>{
      const matsHtml=r.materials.map(m=>{
        const mat=MATERIALS_MAP[m.id];
        const owned=s.inventory.filter(it=>it.id===m.id).reduce((sum,it)=>sum+(it.count||1),0);
        const has=owned>=m.count;
        return`<span class="material-tag ${has?'has':'missing'}">${mat?mat.name:m.id} ${owned}/${m.count}</span>`;
      }).join('');
      html+=`<div class="recipe-card"><div class="recipe-name">${r.name}</div><div class="recipe-desc">${r.desc}</div><div class="recipe-materials">${matsHtml}</div><div class="recipe-footer"><span class="recipe-rate">成功率: ${Math.floor(r.rate*100)}%</span><button class="btn btn-gold btn-sm craft-btn" data-rid="${r.id}">炼制</button></div></div>`;
    });
    html+='</div>';
    el.innerHTML=html;
    // Avoid duplicate listeners on re-render
    el.onclick=(e)=>{
      const b=e.target.closest('.craft-btn');
      if(!b)return;
      const r=this.game.craftItem(b.dataset.rid);
      if(r&&r.success)showToast('炼制成功: '+r.item.name,'success');
      else showToast(r?r.msg:'炼制失败','error');
      this.refreshUI();
    };
  }

  /* === 坊市面板 === */
  renderMarketPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-market');
    const pers=PERSONALITIES_MAP[s.personality];
    const disc=pers?pers.shopDiscount:0;
    let tabs=`<div class="market-tabs"><button class="market-tab ${this.currentMarketTab==='buy'?'active':''}" data-mt="buy">购买</button><button class="market-tab ${this.currentMarketTab==='sell'?'active':''}" data-mt="sell">出售</button></div>`;
    let content='';
    if(this.currentMarketTab==='buy'){
      content='<div class="shop-grid">';
      SHOP_ITEMS.forEach((si,i)=>{
        const price=Math.floor(si.price*(1-disc));
        content+=`<div class="shop-item"><div class="item-name">${si.name}</div><div class="item-desc">${si.desc}</div><div class="item-price">${price} 灵石</div><button class="btn btn-gold btn-sm buy-btn" data-idx="${i}">购买</button></div>`;
      });
      content+='</div>';
    }else{
      content='<div class="shop-grid">';
      s.inventory.forEach((it,i)=>{
        const val=Math.max(5,(it.tier||0)*50+(it.atk||0)+(it.def||0));
        content+=`<div class="shop-item"><div class="item-name">${it.name}</div><div class="item-desc">${it.type} ×${it.count||1}</div><div class="item-price">${Math.floor(val*0.5)} 灵石</div><button class="btn btn-outline btn-sm sell-btn" data-idx="${i}">出售</button></div>`;
      });
      content+='</div>';
      if(!s.inventory.length)content='<p style="color:var(--text-muted);text-align:center;padding:20px">背包为空</p>';
    }
    el.innerHTML=`<div class="panel-title">坊市</div>${tabs}${content}`;
    el.onclick=(e)=>{
      const mt=e.target.closest('.market-tab');
      if(mt){this.currentMarketTab=mt.dataset.mt;this.renderMarketPanel();return}
      const bb=e.target.closest('.buy-btn');
      if(bb){
        const r=this.game.buyItem(parseInt(bb.dataset.idx));
        if(r)showToast('购买了 '+r.bought,'success');
        this.refreshUI();return;
      }
      const sb=e.target.closest('.sell-btn');
      if(sb){
        const r=this.game.sellItem(parseInt(sb.dataset.idx));
        if(r)showToast('出售了 '+r.sold+'，获得'+r.gain+'灵石','success');
        this.refreshUI();
      }
    };
  }

  /* === 洞府面板 === */
  renderCavePanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-cave');
    if(!s.cave.owned){
      el.innerHTML=`<div class="panel-title">洞府</div><div class="cave-locked"><p>你还没有洞府</p><p style="font-size:0.85rem;color:var(--text-muted)">需要金丹期以上，花费5000灵石购买</p><button class="btn btn-gold" id="buy-cave">购买洞府 (5000灵石)</button></div>`;
      document.getElementById('buy-cave')?.addEventListener('click',()=>{if(this.game.acquireCave()){showToast('获得洞府！','success');this.refreshUI()}});
      return;
    }
    let facHtml='<div class="cave-grid">';
    CAVE_FACILITIES.forEach(f=>{
      const lv=s.cave.facilities[f.id]||0;
      const maxed=lv>=f.maxLv;
      const cost=maxed?'-':f.costs[lv];
      const bonus=lv>0?JSON.stringify(f.bonus[lv-1]).replace(/[{}\"]/g,''):'无';
      facHtml+=`<div class="facility-card"><div class="facility-name">${f.name}</div><div class="facility-level">等级 ${lv}/${f.maxLv}</div><div class="facility-bonus">当前加成: ${bonus}</div><div class="facility-cost">${maxed?'已满级':'升级费用: '+formatNumber(cost)+' 灵石'}</div><button class="btn btn-gold btn-sm upgrade-btn" data-fid="${f.id}" ${maxed?'disabled':''}>升级</button></div>`;
    });
    facHtml+='</div>';
    el.innerHTML=`<div class="panel-title">洞府</div>${facHtml}`;
    el.onclick=(e)=>{
      const b=e.target.closest('.upgrade-btn');
      if(b&&this.game.upgradeFacility(b.dataset.fid)){showToast('升级成功','success');this.refreshUI()}
    };
  }

  /* === 功法面板 === */
  renderSkillPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-skill');
    const unlocked=this.game.getUnlockedSkills();
    const names={sword:'剑道',alchemy:'丹道',formation:'阵道',body:'体道',beast:'御兽道'};
    let pathsHtml='<div class="skill-paths">';
    Object.keys(SKILLS).forEach(path=>{
      const v=s.enlightenment[path];
      const skills=SKILLS[path];
      pathsHtml+=`<div class="skill-path"><div class="path-header"><h4>${names[path]} (${v}/100)</h4><span style="color:var(--text-muted);font-size:0.8rem">${this.game.getEnlightenmentLevel(v)}</span></div><div class="path-bar path-${path}"><div class="path-fill" style="width:${v}%"></div></div><div class="skill-nodes">${skills.map(sk=>{
        const ul=v>=sk.reqLevel;
        return`<div class="skill-node ${ul?'unlocked':'locked'}" data-path="${path}" data-req="${sk.reqLevel}"><div class="skill-icon">${ul?'✨':'🔒'}</div><div class="skill-name">${sk.name}</div><div class="skill-req">需${sk.reqLevel}</div></div>`;
      }).join('')}</div></div>`;
    });
    pathsHtml+='</div>';
    // Equipment
    let eqHtml='<div class="equipment-section"><h3>装备栏</h3><div class="equip-slots">';
    ['weapon','armor','accessory'].forEach(slot=>{
      const eq=s.equipment[slot];
      const slotNames={weapon:'武器',armor:'护甲',accessory:'饰品'};
      if(eq){
        eqHtml+=`<div class="equip-slot filled quality-${eq.quality}"><div class="slot-type">${slotNames[slot]}</div><div class="equip-name">${eq.name}</div><div class="equip-stats">攻+${eq.atk} 防+${eq.def} 血+${eq.hp}</div><button class="btn btn-outline btn-sm unequip-btn" data-slot="${slot}" style="margin-top:4px">卸下</button></div>`;
      }else{
        eqHtml+=`<div class="equip-slot"><div class="slot-type">${slotNames[slot]}</div><span class="equip-empty">空</span></div>`;
      }
    });
    eqHtml+='</div></div>';
    el.innerHTML=`<div class="panel-title">功法与装备</div>${pathsHtml}${eqHtml}`;
    el.onclick=(e)=>{
      const b=e.target.closest('.unequip-btn');
      if(b){this.game.unequipItem(b.dataset.slot);this.refreshUI()}
      const locked=e.target.closest('.skill-node.locked');
      if(locked){
        const path=locked.dataset.path||'';
        const req=parseInt(locked.dataset.req||'0');
        const cur=s.enlightenment[path]||0;
        showToast(`未解锁：悟道 ${cur}/${req}`,'info');
      }
    };
  }

  /* === 宗门面板 === */
  renderSectPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-sect');
    const sect=SECTS_MAP[s.sect];
    const rankName=this.game.getSectRankName();
    const members=s.npcs.filter(n=>n.alive&&n.faction===s.sect).slice(0,10);
    const logHtml=s.worldLog.filter(w=>w.text.includes('宗门')).slice(0,5).map(w=>`<div class="sect-log-entry">【${w.year}年】${escapeHtml(w.text)}</div>`).join('');

    el.innerHTML=`<div class="panel-title">宗门</div>
      <div class="sect-info-card"><h3>${sect?sect.icon+' '+sect.name:''}</h3><p style="color:var(--text-secondary);font-size:0.85rem">${sect?sect.desc:''}</p>
        <div class="sect-rank-info"><div class="sect-stat"><div class="sect-stat-label">职位</div><div class="sect-stat-value">${rankName}</div></div><div class="sect-stat"><div class="sect-stat-label">贡献</div><div class="sect-stat-value">${formatNumber(s.sect_data.contribution)}</div></div></div>
      </div>
      <div class="sect-actions">
        <button class="btn btn-gold btn-sm" id="donate-100">捐献100灵石</button>
        <button class="btn btn-gold btn-sm" id="donate-1000">捐献1000灵石</button>
      </div>
      <div class="sect-members"><h4 style="color:var(--gold-light);margin-bottom:8px">同门</h4>${members.map(n=>`<span style="display:inline-block;padding:4px 8px;margin:2px;background:var(--bg-primary);border-radius:var(--radius-sm);font-size:0.8rem">${escapeHtml(n.name)} (${REALMS[n.realm].name})</span>`).join('')}</div>
      <div class="sect-log" style="margin-top:16px">${logHtml||'<div class="sect-log-entry">暂无宗门消息</div>'}</div>`;
    document.getElementById('donate-100')?.addEventListener('click',()=>{if(this.game.donateSect(100)){showToast('捐献成功','success');this.refreshUI()}else showToast('灵石不足','error')});
    document.getElementById('donate-1000')?.addEventListener('click',()=>{if(this.game.donateSect(1000)){showToast('捐献成功','success');this.refreshUI()}else showToast('灵石不足','error')});
  }

  /* === 乾坤袋面板 === */
  renderInventoryPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-inventory');
    const tabs=[{id:'equipment',name:'装备'},{id:'material',name:'材料'},{id:'potion',name:'丹药'}];
    let tabHtml=tabs.map(t=>`<button class="inv-tab ${this.currentInvTab===t.id?'active':''}" data-it="${t.id}">${t.name}</button>`).join('');
    const items=s.inventory.filter(it=>{
      if(this.currentInvTab==='equipment')return it.type==='equipment';
      if(this.currentInvTab==='material')return it.type==='material';
      return it.type==='potion';
    });
    let gridHtml=items.length?'<div class="inv-grid">'+items.map((it,realIdx)=>{
      const idx=s.inventory.indexOf(it);
      return`<div class="inv-item ${it.quality?'quality-'+it.quality:''}" data-idx="${idx}"><div class="item-icon">${it.type==='weapon'?'⚔️':it.type==='armor'?'🛡️':it.type==='accessory'?'💎':it.type==='material'?'🌿':'💊'}</div><div class="item-name">${it.name}</div>${(it.count||1)>1?`<span class="item-count">×${it.count}</span>`:''}</div>`;
    }).join('')+'</div>':'<div class="inv-empty">空空如也</div>';

    el.innerHTML=`<div class="panel-title">乾坤袋</div><div class="inv-tabs">${tabHtml}</div>${gridHtml}`;
    el.onclick=(e)=>{
      const tab=e.target.closest('.inv-tab');
      if(tab){this.currentInvTab=tab.dataset.it;this.renderInventoryPanel();return}
      const it=e.target.closest('.inv-item');
      if(it){
        const idx=parseInt(it.dataset.idx);
        const item=s.inventory[idx];
        if(!item)return;
        if(item.type==='equipment'){this.game.equipItem(idx);showToast('装备了 '+item.name,'success');this.refreshUI()}
        else if(item.type==='potion'){this.game.useItem(idx);this.refreshUI()}
      }
    };
  }

  /* === 成就面板 === */
  renderAchievementPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-achievement');
    const count=s.achievements.length;
    let html=`<div class="panel-title">成就</div><div class="achievement-count">已解锁 ${count}/${ACHIEVEMENTS.length}</div><div class="achievement-grid">`;
    ACHIEVEMENTS.forEach(a=>{
      const unlocked=s.achievements.includes(a.id);
      html+=`<div class="achievement-card ${unlocked?'unlocked':'locked'}"><div class="achievement-icon">${unlocked?'🏆':'🔒'}</div><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div></div>`;
    });
    html+='</div>';
    el.innerHTML=html;
    el.onclick=(e)=>{
      const card=e.target.closest('.achievement-card');
      if(card&&card.classList.contains('locked')) showToast('未解锁：继续完成条件', 'info');
    };
  }

  /* === 悬赏榜面板 === */
  renderBountyPanel(){
    const s=this.game.state;if(!s)return;
    const el=this._getEl('panel-bounty');
    const board=this.game.getBountyBoard();
    const active=s.activeBounties||[];
    const npcQuests=s.activeNpcQuests||[];
    let html='<div class="panel-title">悬赏榜</div>';

    // Active bounties
    html+='<div class="section-title" style="margin-bottom:8px">进行中的悬赏 ('+active.length+'/3)</div>';
    if(active.length===0){
      html+='<p style="color:var(--text-muted);text-align:center;padding:12px">暂无进行中的悬赏</p>';
    }else{
      html+='<div class="quest-list">';
      active.forEach(ab=>{
        const tmpl=BOUNTY_TEMPLATES_GG.find(b=>b.id===ab.id);
        if(!tmpl)return;
        const pct=Math.min(100,Math.floor(ab.progress/tmpl.target*100));
        const done=ab.progress>=tmpl.target;
        html+=`<div class="quest-card ${done?'quest-complete':''}">
          <div class="quest-header"><span class="quest-name">📜 ${tmpl.name}</span><span class="quest-reward" style="color:var(--gold)">💰${tmpl.rewardGold} ✨${tmpl.rewardExp}</span></div>
          <div class="quest-desc">${tmpl.desc}${tmpl.realmReq?' (需'+REALMS[tmpl.realmReq].name+')':''}</div>
          <div class="progress-bar" style="margin:6px 0"><div class="progress-fill" style="width:${pct}%;background:${done?'var(--green)':'var(--cyan)'}"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.8rem;color:var(--text-muted)">${ab.progress}/${tmpl.target}</span>
            <div style="display:flex;gap:6px">
              ${done?'<button class="btn btn-gold btn-sm bounty-claim-btn" data-bid="'+tmpl.id+'">领取</button>':''}
              <button class="btn btn-outline btn-sm bounty-abandon-btn" data-bid="${tmpl.id}">放弃</button>
            </div>
          </div>
        </div>`;
      });
      html+='</div>';
    }

    // Available bounties
    html+='<div class="section-title" style="margin:16px 0 8px">悬赏榜 (每30天刷新)</div>';
    const available=board.filter(b=>!active.some(a=>a.id===b.id));
    if(available.length===0){
      html+='<p style="color:var(--text-muted);text-align:center;padding:12px">暂无可接取的悬赏</p>';
    }else{
      html+='<div class="quest-list">';
      available.forEach(b=>{
        const canAccept=active.length<3&&s.realm>=(b.realmReq||0);
        html+=`<div class="quest-card">
          <div class="quest-header"><span class="quest-name">📋 ${b.name}</span><span class="quest-reward" style="color:var(--gold)">💰${b.rewardGold} ✨${b.rewardExp}</span></div>
          <div class="quest-desc">${b.desc}${b.realmReq?' (需'+REALMS[b.realmReq].name+')':''}</div>
          <div style="text-align:right;margin-top:6px">
            <button class="btn ${canAccept?'btn-gold':'btn-outline'} btn-sm bounty-accept-btn" data-bid="${b.id}" ${canAccept?'':'disabled'}>${canAccept?'接取':active.length>=3?'已满':'境界不足'}</button>
          </div>
        </div>`;
      });
      html+='</div>';
    }

    // NPC quests section
    html+='<div class="section-title" style="margin:16px 0 8px">NPC委托 ('+npcQuests.length+'/3)</div>';
    if(npcQuests.length===0){
      html+='<p style="color:var(--text-muted);text-align:center;padding:12px">与NPC交谈提升好感后可接取委托</p>';
    }else{
      html+='<div class="quest-list">';
      npcQuests.forEach(aq=>{
        const tmpl=NPC_QUEST_TEMPLATES.find(q=>q.id===aq.templateId);
        if(!tmpl)return;
        const npc=s.npcs.find(n=>n.id===aq.npcId);
        const pct=Math.min(100,Math.floor(aq.progress/tmpl.target*100));
        const done=aq.progress>=tmpl.target;
        html+=`<div class="quest-card ${done?'quest-complete':''}">
          <div class="quest-header"><span class="quest-name">👤 ${npc?npc.name:'???'} - ${tmpl.name}</span><span class="quest-reward" style="color:var(--gold)">💰${tmpl.rewardGold} ❤️+${tmpl.favorGain}</span></div>
          <div class="quest-desc">${tmpl.desc}</div>
          <div class="progress-bar" style="margin:6px 0"><div class="progress-fill" style="width:${pct}%;background:${done?'var(--green)':'var(--purple)'}"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.8rem;color:var(--text-muted)">${aq.progress}/${tmpl.target}</span>
            ${done?'<button class="btn btn-gold btn-sm nq-claim-btn" data-nid="'+aq.npcId+'" data-tid="'+aq.templateId+'">交付</button>':''}
          </div>
        </div>`;
      });
      html+='</div>';
    }

    el.innerHTML=html;

    // Bind events
    el.querySelectorAll('.bounty-accept-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this.game.acceptBounty(btn.dataset.bid);
        this.renderBountyPanel();
      });
    });
    el.querySelectorAll('.bounty-claim-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(this.game.claimBounty(btn.dataset.bid)){
          const s=this.game.state;
          if(s){
            s.bountiesDone=(s.bountiesDone||0)+1;
            if(typeof CrossGameAchievements!=='undefined') CrossGameAchievements.trackStat('guigu_bounties_done',s.bountiesDone);
            this.game.saveGame();
          }
          showToast('悬赏完成！','success');
          this.renderBountyPanel();
        }
      });
    });
    el.querySelectorAll('.bounty-abandon-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(confirm('确定放弃此悬赏？')){
          this.game.abandonBounty(btn.dataset.bid);
          this.renderBountyPanel();
        }
      });
    });
    el.querySelectorAll('.nq-claim-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(this.game.claimNpcQuest(btn.dataset.nid,btn.dataset.tid)){
          const s=this.game.state;
          if(s){
            s.bountiesDone=(s.bountiesDone||0)+1;
            if(typeof CrossGameAchievements!=='undefined') CrossGameAchievements.trackStat('guigu_bounties_done',s.bountiesDone);
            this.game.saveGame();
          }
          showToast('委托完成！好感提升！','success');
          this.renderBountyPanel();
        }
      });
    });
  }

  /* === 坐骑面板 === */
  renderMountPanel(){
    const panel=this._getEl('panel-mount');if(!panel)return;
    const s=this.game.state;if(!s)return;
    if(!s.ownedMounts)s.ownedMounts=[];
    if(s.activeMount===undefined)s.activeMount=null;

    const activeMt=s.activeMount?MOUNTS_MAP[s.activeMount]:null;
    let html='<h3 style="margin-bottom:12px;">坐骑</h3>';

    // 当前坐骑
    if(activeMt){
      html+=`<div style="background:var(--bg-card);border:1px solid var(--gold);border-radius:10px;padding:14px;margin-bottom:16px;text-align:center;">
        <div style="font-size:3rem;">${activeMt.icon}</div>
        <div style="font-size:1.1rem;font-weight:bold;color:var(--gold);margin:4px 0;">${activeMt.name}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary);">${activeMt.desc}</div>
        <div style="font-size:0.75rem;margin-top:4px;color:#4adad4;">速度+${Math.round(activeMt.speedBonus*100)}% | 攻击+${activeMt.atkBonus} | 防御+${activeMt.defBonus}</div>
        <button class="btn btn-outline btn-sm mount-dismount" style="margin-top:8px;">下马</button>
      </div>`;
    }else{
      html+='<div style="text-align:center;color:var(--text-muted);margin-bottom:16px;">当前未骑乘坐骑</div>';
    }

    // 坐骑列表
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">';
    MOUNTS.forEach(mt=>{
      const owned=s.ownedMounts.includes(mt.id);
      const active=s.activeMount===mt.id;
      const canBuy=!owned&&s.gold>=mt.cost&&s.realm>=mt.realmReq;
      const realmLocked=s.realm<mt.realmReq;
      const borderColor=active?'var(--gold)':owned?'#4adad4':'var(--border-color)';

      html+=`<div style="background:var(--bg-card);border:2px solid ${borderColor};border-radius:8px;padding:12px;text-align:center;${realmLocked&&!owned?'opacity:0.5;':''}">
        <div style="font-size:2rem;">${mt.icon}</div>
        <div style="font-weight:bold;color:${active?'var(--gold)':owned?'#4adad4':'var(--text-primary)'};">${mt.name}${active?' (出战)':''}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin:4px 0;">${mt.desc}</div>
        <div style="font-size:0.7rem;color:#888;">速度+${Math.round(mt.speedBonus*100)}% 攻+${mt.atkBonus} 防+${mt.defBonus}</div>
        ${realmLocked&&!owned?`<div style="font-size:0.7rem;color:#ff6b6b;margin-top:4px;">需要境界: ${REALMS[mt.realmReq].name}</div>`:''}
        ${owned?(active?'<span style="font-size:0.75rem;color:var(--gold);">当前骑乘</span>':`<button class="btn btn-cyan btn-sm mount-ride" data-id="${mt.id}" style="margin-top:6px;">骑乘</button>`)
        :(canBuy?`<button class="btn btn-gold btn-sm mount-buy" data-id="${mt.id}" style="margin-top:6px;">购买 (${mt.cost}灵石)</button>`:`<div style="font-size:0.7rem;color:#888;margin-top:4px;">价格: ${mt.cost}灵石</div>`)}
      </div>`;
    });
    html+='</div>';
    panel.innerHTML=html;

    // Bind events
    panel.querySelectorAll('.mount-buy').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const mt=MOUNTS_MAP[btn.dataset.id];
        if(!mt||s.gold<mt.cost||s.realm<mt.realmReq)return;
        s.gold-=mt.cost;
        s.ownedMounts.push(mt.id);
        s.activeMount=mt.id;
        this.game.recalcStats();
        this.game.saveGame();
        showToast(`获得坐骑：${mt.name}！`,'success');
        this.renderMountPanel();
        this.renderStatusBar();
      });
    });
    panel.querySelectorAll('.mount-ride').forEach(btn=>{
      btn.addEventListener('click',()=>{
        s.activeMount=btn.dataset.id;
        this.game.recalcStats();
        this.game.saveGame();
        showToast(`骑乘${MOUNTS_MAP[btn.dataset.id].name}`,'success');
        this.renderMountPanel();
        this.renderStatusBar();
      });
    });
    const dismountBtn=panel.querySelector('.mount-dismount');
    if(dismountBtn){
      dismountBtn.addEventListener('click',()=>{
        s.activeMount=null;
        this.game.recalcStats();
        this.game.saveGame();
        showToast('已下马','info');
        this.renderMountPanel();
        this.renderStatusBar();
      });
    }
  }

  /* === 弹窗系统 === */
  showModal(title,bodyHtml,footerHtml){
    this.closeModal();
    const overlay=document.createElement('div');
    overlay.className='modal-overlay active';
    overlay.id='game-modal';
    overlay.innerHTML=`<div class="modal"><div class="modal-header"><span class="modal-title">${title}</span><button class="modal-close">&times;</button></div><div class="modal-body">${bodyHtml}</div>${footerHtml?`<div class="modal-footer">${footerHtml}</div>`:''}</div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click',()=>this.closeModal());
    overlay.addEventListener('click',e=>{if(e.target===overlay)this.closeModal()});
    return overlay;
  }

  closeModal(){
    document.getElementById('game-modal')?.remove();
    if(this._battleKeyHandler){
      document.removeEventListener('keydown',this._battleKeyHandler);
      this._battleKeyHandler=null;
    }
  }

  /* === 战斗弹窗 === */
  showBattleModal(){
    const s=this.game.state;if(!s||!s.battleState)return;
    const bs=s.battleState;const mon=bs.monster;
    const skills=this.game.getUnlockedSkills().slice(0,4);

    const render=()=>{
      const phP=Math.floor(s.hp/s.maxHp*100);
      const psP=Math.floor(s.sp/s.maxSp*100);
      const mhP=Math.floor(mon.currentHp/mon.hp*100);
      const logHtml=bs.log.slice(-8).map(l=>`<div class="log-entry log-${l.type}">${l.text}</div>`).join('');
      const skillBtns=skills.map(sk=>{
        const onCd=bs.skillCooldowns[sk.id]>0;
        return`<button class="battle-btn btn-skill" data-skill="${sk.id}" ${onCd||s.sp<sk.cost?'disabled':''}>${sk.name}${onCd?' (CD)':''}</button>`;
      }).join('')||'<button class="battle-btn btn-skill" disabled>无技能</button>';

      // 五行显示
      const pElDef=bs.playerElement&&FIVE_ELEMENTS[bs.playerElement]?FIVE_ELEMENTS[bs.playerElement]:null;
      const mElDef=bs.monsterElement&&FIVE_ELEMENTS[bs.monsterElement]?FIVE_ELEMENTS[bs.monsterElement]:null;
      const pElTag=pElDef?`<span style="color:${pElDef.color}">${pElDef.icon}${pElDef.name}</span>`:'';
      const mElTag=mElDef?`<span style="color:${mElDef.color}">${mElDef.icon}${mElDef.name}</span>`:'';
      const comboText=bs.combo>=3?`<div style="text-align:center;color:#f0c040;font-weight:bold">${bs.combo} 连击！x${bs.combo>=7?'1.5':bs.combo>=5?'1.2':'1.1'}</div>`:'';

      return`<div class="battle-field">
        <div class="battle-entity player-entity"><div class="entity-name">${escapeHtml(s.name)} ${pElTag}</div><div class="entity-realm">${REALMS[s.realm].name}</div><div class="entity-hp-text">HP: ${s.hp}/${s.maxHp}</div><div class="entity-hp-bar"><div class="bar-fill" style="width:${phP}%"></div></div><div class="entity-sp-text">SP: ${s.sp}/${s.maxSp}</div><div class="entity-sp-bar"><div class="bar-fill" style="width:${psP}%"></div></div><div class="entity-stats">ATK:${s.atk} DEF:${s.def}</div></div>
        <div class="battle-entity monster-entity"><div class="entity-name">${mon.name} ${mElTag}</div><div class="entity-realm">${REALMS[mon.realmMin].name}级</div><div class="entity-hp-text">HP: ${mon.currentHp}/${mon.hp}</div><div class="entity-hp-bar"><div class="bar-fill" style="width:${mhP}%"></div></div><div class="entity-stats">ATK:${mon.atk} DEF:${mon.def}</div></div>
      </div>
      ${comboText}
      <div class="battle-log">${logHtml}</div>
      <div class="battle-actions">
        <button class="battle-btn btn-attack" data-act="attack">普攻</button>
        ${skillBtns}
        <button class="battle-btn btn-potion" data-act="potion">丹药</button>
        <button class="battle-btn btn-flee" data-act="flee">逃跑</button>
      </div>`;
    };

    const overlay=this.showModal('战斗 - '+mon.name,render(),'');
    this._bindBattleHotkeys(overlay);
    const bindActions=()=>{
      overlay.querySelectorAll('.battle-btn[data-act],.battle-btn[data-skill]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const act=btn.dataset.act||'skill';
          const skillId=btn.dataset.skill;
          const result=this.game.processBattleTurn(act,skillId);
          if(!result)return;
          if(result.ended){
            if(result.victory){
              if(typeof SoundManager!=='undefined')SoundManager.play('coin');
              const rewards=s.battleState?null:bs.rewards;
              overlay.querySelector('.modal-body').innerHTML=`<div class="battle-result victory"><h3>战斗胜利！</h3><div class="battle-rewards"><div class="reward-item">经验 +${mon.exp}</div>${rewards&&rewards.drops.length?rewards.drops.map(d=>`<div class="reward-item">获得 ${d.name}</div>`).join(''):''}</div></div>`;
              overlay.querySelector('.modal-body').innerHTML+=`<div style="text-align:center;margin-top:16px"><button class="btn btn-gold" id="battle-close">确定</button></div>`;
            }else if(result.fled){
              overlay.querySelector('.modal-body').innerHTML=`<div class="battle-result"><h3>逃跑成功</h3></div><div style="text-align:center;margin-top:16px"><button class="btn btn-gold" id="battle-close">确定</button></div>`;
            }else{
              if(typeof SoundManager!=='undefined')SoundManager.play('defeat');
              const encourageMsg=typeof getEncouragement==='function'?getEncouragement():'';
              overlay.querySelector('.modal-body').innerHTML=`<div class="battle-result defeat"><h3>战斗失败</h3><p style="color:var(--text-secondary)">你被传送回了城镇</p>${encourageMsg?`<p style="color:var(--cyan);font-style:italic;font-size:0.85rem;margin-top:8px">${encourageMsg}</p>`:''}</div><div style="text-align:center;margin-top:16px"><button class="btn btn-gold" id="battle-close">确定</button></div>`;
            }
            document.getElementById('battle-close')?.addEventListener('click',()=>{this.closeModal();this.refreshUI()});
            return;
          }
          // Re-render battle
          overlay.querySelector('.modal-body').innerHTML=render();
          bindActions();
        });
      });
    };
    bindActions();
  }

  _bindBattleHotkeys(overlay){
    if(this._battleKeyHandler)document.removeEventListener('keydown',this._battleKeyHandler);
    this._battleKeyHandler=(e)=>{
      const activeTag=document.activeElement?document.activeElement.tagName:'';
      if(['INPUT','TEXTAREA','SELECT'].includes(activeTag))return;
      const modal=document.getElementById('game-modal');
      if(!modal||modal!==overlay)return;
      if(e.key==='Enter'||e.key===' '){
        const closeBtn=document.getElementById('battle-close');
        if(closeBtn){e.preventDefault();closeBtn.click();return;}
      }
      const key=e.key.toLowerCase();
      const actionMap={a:'attack',p:'potion',f:'flee'};
      if(actionMap[key]){
        const btn=overlay.querySelector(`[data-act="${actionMap[key]}"]`);
        if(btn&&!btn.disabled){e.preventDefault();btn.click();}
        return;
      }
      if(['1','2','3','4'].includes(key)){
        const idx=parseInt(key,10)-1;
        const skillBtns=overlay.querySelectorAll('.battle-btn[data-skill]');
        const btn=skillBtns[idx];
        if(btn&&!btn.disabled){e.preventDefault();btn.click();}
      }
    };
    document.addEventListener('keydown',this._battleKeyHandler);
  }

  /* === 心魔试炼弹窗 === */
  showHeartDemonModal(scenarios){
    let step=0;let results=[];
    const renderStep=()=>{
      if(step>=scenarios.length){
        const pass=results.filter(r=>r.correct).length>=2;
        const overlay=document.getElementById('game-modal');
        if(overlay){
          overlay.querySelector('.modal-body').innerHTML=`<div class="demon-result ${pass?'pass':'fail'}">${pass?'心魔试炼通过！道心更加坚定。':'心魔试炼失败...心魔侵蚀加深。'}</div><div style="text-align:center;margin-top:16px"><button class="btn btn-gold" id="demon-done">${pass?'继续突破':'返回'}</button></div>`;
          document.getElementById('demon-done')?.addEventListener('click',()=>{
            this.closeModal();
            if(pass){
              const r=this.game._doBreakthrough();
              if(r.success)showToast('突破成功！'+r.realm,'success');
              else showToast(r.msg||'突破失败','error');
            }
            this.refreshUI();
          });
        }
        return;
      }
      const sc=scenarios[step];
      const dotsHtml=scenarios.map((_,i)=>`<div class="demon-step ${i<step?(results[i]&&results[i].correct?'done':'fail'):(i===step?'current':'')}"></div>`).join('');
      const choicesHtml=sc.choices.map((c,ci)=>`<button class="demon-choice" data-ci="${ci}">${c.text}</button>`).join('');
      return`<div class="demon-progress">${dotsHtml}</div><div class="demon-scenario"><div class="demon-text">${sc.text}</div><div class="demon-choices">${choicesHtml}</div></div>`;
    };

    const overlay=this.showModal('心魔试炼',renderStep(),'');
    const bindChoices=()=>{
      overlay.querySelectorAll('.demon-choice').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const ci=parseInt(btn.dataset.ci);
          const r=this.game.resolveHeartDemonChoice(scenarios[step].id,ci);
          results.push(r);
          btn.classList.add(r.correct?'correct':'wrong');
          setTimeout(()=>{step++;overlay.querySelector('.modal-body').innerHTML=renderStep();bindChoices()},800);
        });
      });
    };
    bindChoices();
  }

  /* === 悟道弹窗 === */
  showEnlightenmentModal(evt){
    if(!evt)return;
    const names={sword:'剑道',alchemy:'丹道',formation:'阵道',body:'体道',beast:'御兽道'};
    const choicesHtml=evt.choices.map((c,ci)=>`<button class="enlighten-choice" data-ci="${ci}">${c.text}<div class="choice-path">${names[c.path]||c.path} +${c.prog}</div></button>`).join('');
    const overlay=this.showModal('悟道',`<div class="enlighten-body"><div class="enlighten-text">${evt.text}</div><div class="enlighten-choices">${choicesHtml}</div></div>`,'');
    overlay.querySelectorAll('.enlighten-choice').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const ci=parseInt(btn.dataset.ci);
        const r=this.game.resolveEnlightenment(evt.id,ci);
        if(r){
          overlay.querySelector('.modal-body').innerHTML=`<div class="enlighten-result">${r.desc}</div><div style="text-align:center;margin-top:16px"><button class="btn btn-gold" id="enlighten-done">确定</button></div>`;
          document.getElementById('enlighten-done')?.addEventListener('click',()=>{this.closeModal();this.refreshUI()});
        }
      });
    });
  }

  _showWudaoTraining(){
    const result=this.game.wudaoTrain();
    if(!result)return;
    const {rounds,pathNames}=result;
    let currentRound=0;
    const chosen=[];
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(overlay);

    const renderRound=()=>{
      if(currentRound>=rounds.length){
        // Apply results
        this.game.applyWudaoResult(chosen);
        const summary=chosen.map(c=>`${pathNames[c.path]} +${c.gain}${c.isCrit?' (暴击!)':''}`).join('<br>');
        overlay.innerHTML=`<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:380px;text-align:center;">
          <h3 style="color:var(--gold,#ffd700);margin-bottom:12px;">悟道完成</h3>
          <div style="font-size:2rem;margin-bottom:8px;">🧘</div>
          <div style="margin-bottom:12px;line-height:1.8">${summary}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">消耗30天</div>
          <button class="btn btn-gold btn-sm" id="wudao-done">确定</button>
        </div>`;
        document.getElementById('wudao-done').addEventListener('click',()=>{overlay.remove();this.refreshUI();});
        return;
      }
      const r=rounds[currentRound];
      overlay.innerHTML=`<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:400px;">
        <h3 style="text-align:center;color:var(--gold,#ffd700);margin-bottom:4px;">悟道修炼</h3>
        <div style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">第${currentRound+1}/3轮</div>
        <div style="text-align:center;margin-bottom:16px;font-size:0.95rem;">${r.text}</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          ${r.choices.map((c,i)=>`<button class="wudao-choice" data-ci="${i}" style="flex:1;padding:16px 12px;border-radius:10px;border:2px solid ${c.isCrit?'var(--gold)':'var(--border-color)'};background:var(--bg-darker,#0f172a);cursor:pointer;text-align:center;">
            <div style="font-size:1.2rem;margin-bottom:4px;">${c.name}</div>
            <div style="font-size:0.8rem;color:${c.isCrit?'var(--gold)':'#4adad4'};">+${c.gain}${c.isCrit?' 暴击!':''}</div>
          </button>`).join('')}
        </div>
      </div>`;
      overlay.querySelectorAll('.wudao-choice').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const ci=parseInt(btn.dataset.ci);
          chosen.push(r.choices[ci]);
          currentRound++;
          renderRound();
        });
      });
    };
    renderRound();
  }

  /* === NPC交互弹窗 === */
  showNPCInteractionModal(npcId){
    const s=this.game.state;if(!s)return;
    const npc=s.npcs.find(n=>n.id===npcId);
    if(!npc)return;
    const rel=s.relations[npcId]||0;
    const relInfo=this.game.getNPCRelationLabel(npcId);

    const render=()=>{
      const relNow=s.relations[npcId]||0;
      const relP=Math.min(100,Math.max(0,(relNow+100)/2));
      const npcSex=npc.sex||'female';
      const playerSex=s.sex||'male';
      const dc=s.dualCultivation||{partnerId:null,daysLeft:0};
      const canDual=relNow>=60&&npcSex!==playerSex&&!(dc.partnerId&&dc.daysLeft>0);
      const dualReason = relNow < 60 ? '好感度不足（需≥60）' : (npcSex===playerSex ? '需要异性方可双修' : (dc.partnerId&&dc.daysLeft>0 ? '已有双修对象' : ''));
      const canApprentice = relNow >= 80 && npc.realm > s.realm;
      const apprenticeReason = relNow < 80 ? '好感度不足（需≥80）' : (npc.realm <= s.realm ? '对方境界不高于你' : '');

      const giftUsed = this.game.getNpcDailyCount(npcId,'gift');
      const rumorUsed = this.game.getNpcDailyCount(npcId,'rumor');
      const inviteUsed = this.game.getNpcDailyCount(npcId,'invite');
      const hasGift = (s.inventory||[]).length > 0;
      const canGift = hasGift && giftUsed < 1;
      const giftReason = !hasGift ? '背包无可赠礼物品' : (giftUsed >= 1 ? '今日已赠礼' : '');
      const canRumor = relNow >= 20 && rumorUsed < 2 && s.gold >= 20;
      const rumorReason = relNow < 20 ? '好感度不足（需≥20）' : (rumorUsed >= 2 ? '今日已打听得够多了' : (s.gold < 20 ? '灵石不足（需20）' : ''));
      const canInvite = relNow >= 40 && inviteUsed < 1 && s.sp >= 20;
      const inviteReason = relNow < 40 ? '好感度不足（需≥40）' : (inviteUsed >= 1 ? '今日已结伴一次' : (s.sp < 20 ? '灵力不足（需20）' : ''));
      const sexLabel=npcSex==='male'?'男':'女';
      // NPC quests
      const availQuests=this.game.getNpcQuests(npcId);
      const activeQ=(s.activeNpcQuests||[]).filter(aq=>aq.npcId===npcId);
      let questHtml='';
      if(activeQ.length>0||availQuests.length>0){
        questHtml='<div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:10px"><div style="font-size:0.85rem;color:var(--gold);margin-bottom:6px;font-weight:bold">委托</div>';
        activeQ.forEach(aq=>{
          const qt=NPC_QUEST_TEMPLATES.find(q=>q.id===aq.templateId);
          if(!qt)return;
          const pct=Math.min(100,Math.floor(aq.progress/qt.target*100));
          const done=aq.progress>=qt.target;
          questHtml+=`<div style="background:var(--bg-primary);border-radius:8px;padding:8px;margin-bottom:6px"><div style="font-size:0.8rem;color:var(--text-primary)">${qt.name} ${done?'<span style="color:var(--green)">[完成]</span>':''}</div><div style="font-size:0.7rem;color:var(--text-muted)">${qt.desc} (${aq.progress}/${qt.target})</div><div class="progress-bar" style="margin:4px 0;height:4px"><div class="progress-fill" style="width:${pct}%;background:${done?'var(--green)':'var(--purple)'}"></div></div>${done?'<button class="btn btn-gold btn-sm npc-quest-claim" data-nid="'+npcId+'" data-tid="'+aq.templateId+'" style="font-size:0.7rem;padding:2px 8px;margin-top:2px">交付 (+'+qt.favorGain+'好感)</button>':''}</div>`;
        });
        availQuests.forEach(qt=>{
          questHtml+=`<div style="background:var(--bg-primary);border-radius:8px;padding:8px;margin-bottom:6px"><div style="font-size:0.8rem;color:var(--text-secondary)">${qt.name}</div><div style="font-size:0.7rem;color:var(--text-muted)">${qt.desc}</div><button class="btn btn-outline btn-sm npc-quest-accept" data-nid="${npcId}" data-tid="${qt.id}" style="font-size:0.7rem;padding:2px 8px;margin-top:4px" ${(s.activeNpcQuests||[]).length>=3?'disabled':''}>接取</button></div>`;
        });
        questHtml+='</div>';
      }
      const giftPicker = (this._giftPickNpcId === npcId) ? (() => {
        if (!hasGift) return '<div style="margin-top:10px;color:var(--text-muted);text-align:center">背包为空</div>';
        const items = (s.inventory||[]).slice(0, 12);
        let html = '<div style="margin-top:10px;border-top:1px solid var(--border-color);padding-top:10px">';
        html += '<div style="font-size:0.85rem;color:var(--gold);margin-bottom:6px;font-weight:bold">选择赠礼</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">';
        items.forEach((it, idx) => {
          html += `<button class="btn btn-outline btn-sm npc-gift-item" data-idx="${idx}" style="text-align:left;font-size:0.75rem;padding:6px 10px">${escapeHtml(it.name)}<span style="float:right;color:var(--text-muted)">x${it.count||1}</span></button>`;
        });
        html += '</div>';
        html += '<div style="text-align:center;margin-top:8px"><button class="btn btn-outline btn-sm npc-action-btn" data-act="giftCancel">取消</button></div>';
        html += '</div>';
        return html;
      })() : '';

      return`<div class="npc-profile"><div class="npc-avatar">👤</div><div class="npc-details"><div class="npc-detail-name">${npc.name} <span style="font-size:0.8rem;color:var(--text-muted)">(${sexLabel})</span></div><div class="npc-detail-realm">${REALMS[npc.realm].name}</div><div class="npc-detail-personality">${PERSONALITIES_MAP[npc.personality]?.name||''}</div></div></div>
        <div style="margin-bottom:12px"><div class="relation-label"><span>${this.game.getNPCRelationLabel(npcId).label}</span><span>${relNow}</span></div><div class="relation-bar"><div class="bar-fill bar-relation" style="width:${relP}%;background:${relNow>=0?'var(--green)':'var(--red)'}"></div></div></div>
        <div class="npc-dialogue-box" id="npc-dialogue">与${npc.name}交谈...</div>
        <div class="npc-modal-actions">
          <button class="npc-action-btn" data-act="talk">交谈</button>
          <button class="npc-action-btn" data-act="spar">切磋</button>
          <button class="npc-action-btn" data-act="giftPick" aria-disabled="${canGift?'false':'true'}" ${canGift?'':`data-disabled-reason="${escapeHtml(giftReason)}"`}><span>赠礼</span><span class="action-cost">每日1次</span></button>
          <button class="npc-action-btn" data-act="rumor" aria-disabled="${canRumor?'false':'true'}" ${canRumor?'':`data-disabled-reason="${escapeHtml(rumorReason)}"`}><span>打听消息</span><span class="action-cost">20灵石 / 每日2次</span></button>
          <button class="npc-action-btn" data-act="invite" aria-disabled="${canInvite?'false':'true'}" ${canInvite?'':`data-disabled-reason="${escapeHtml(inviteReason)}"`}><span>结伴历练</span><span class="action-cost">20灵力 / 每日1次</span></button>
          <button class="npc-action-btn" data-act="apprentice" aria-disabled="${canApprentice?'false':'true'}" ${canApprentice?'':`data-disabled-reason="${escapeHtml(apprenticeReason)}"`}><span>拜师</span><span class="action-cost">好感≥80且对方境界更高</span></button>
          <button class="npc-action-btn" data-act="dualCultivate" aria-disabled="${canDual?'false':'true'}" ${canDual?'':`data-disabled-reason="${escapeHtml(dualReason)}"`}><span>双修</span><span class="action-cost">好感≥60且异性</span></button>
          <button class="npc-action-btn" data-act="close">离开</button>
        </div>${giftPicker}${questHtml}`;
    };

    const overlay=this.showModal(npc.name,render(),'');
    const bindActs=()=>{
      overlay.querySelectorAll('.npc-action-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const act=btn.dataset.act;
          if(act==='close'){this.closeModal();this.refreshUI();return}
          if(act==='giftPick'){
            this._giftPickNpcId = npcId;
            const dlg=document.getElementById('npc-dialogue');
            overlay.querySelector('.modal-body').innerHTML=render();
            const newDlg=document.getElementById('npc-dialogue');
            if(newDlg&&dlg)newDlg.textContent=dlg.textContent;
            bindActs();
            return;
          }
          if(act==='giftCancel'){
            this._giftPickNpcId = null;
            const dlg=document.getElementById('npc-dialogue');
            overlay.querySelector('.modal-body').innerHTML=render();
            const newDlg=document.getElementById('npc-dialogue');
            if(newDlg&&dlg)newDlg.textContent=dlg.textContent;
            bindActs();
            return;
          }
          const r=this.game.interactNPC(npcId,act);
          if(!r)return;
          const dlg=document.getElementById('npc-dialogue');
          if(r.type==='talk'&&dlg){dlg.textContent=r.text+' (好感+'+r.gain+')'}
          else if(r.type==='spar'&&dlg){dlg.textContent=r.win?'切磋获胜！获得'+r.exp+'经验 (好感+10)':'切磋落败 (好感-5)'}
          else if(r.type==='gift'&&dlg){dlg.textContent=r.gain?('赠送'+r.itemName+'，好感+'+r.gain):(r.msg||'赠礼失败')}
          else if(r.type==='rumor'&&dlg){dlg.textContent=r.success?('你从'+npc.name+'处得知：'+r.text):(r.msg||'打听失败')}
          else if(r.type==='invite'&&dlg){dlg.textContent=r.success?('结伴历练，经验+'+r.exp+(r.loot?('，获得'+r.loot):'')):(r.msg||'邀请失败')}
          else if(r.type==='apprentice'&&dlg){
            const names={sword:'剑道',alchemy:'丹道',formation:'阵道',body:'体道',beast:'御兽'};
            dlg.textContent=r.success?('拜师成功！'+(names[r.path]||r.path)+'感悟+'+r.gain):(r.msg||'拜师失败');
          }
          else if(r.type==='dualCultivate'&&dlg){dlg.textContent=r.success?'与'+r.partner+'开始双修！修炼经验×1.5，持续30天':r.msg}
          // Re-render relation bar
          if(r.type==='gift') this._giftPickNpcId = null;
          overlay.querySelector('.modal-body').innerHTML=render();
          const newDlg=document.getElementById('npc-dialogue');
          if(newDlg&&dlg)newDlg.textContent=dlg.textContent;
          bindActs();
        });
      });
      overlay.querySelectorAll('.npc-gift-item').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const idx=parseInt(btn.dataset.idx);
          const r=this.game.interactNPC(npcId,'gift',idx);
          const dlg=document.getElementById('npc-dialogue');
          if(dlg){
            dlg.textContent=r&&r.gain?('赠送'+r.itemName+'，好感+'+r.gain):(r&&r.msg?r.msg:'赠礼失败');
          }
          this._giftPickNpcId = null;
          overlay.querySelector('.modal-body').innerHTML=render();
          const newDlg=document.getElementById('npc-dialogue');
          if(newDlg&&dlg)newDlg.textContent=dlg.textContent;
          bindActs();
        });
      });
      // NPC quest buttons
      overlay.querySelectorAll('.npc-quest-accept').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if(this.game.acceptNpcQuest(btn.dataset.nid,btn.dataset.tid)){
            showToast('接取委托成功','success');
            overlay.querySelector('.modal-body').innerHTML=render();
            bindActs();
          }
        });
      });
      overlay.querySelectorAll('.npc-quest-claim').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if(this.game.claimNpcQuest(btn.dataset.nid,btn.dataset.tid)){
            const s=this.game.state;
            if(s){
              s.bountiesDone=(s.bountiesDone||0)+1;
              if(typeof CrossGameAchievements!=='undefined') CrossGameAchievements.trackStat('guigu_bounties_done',s.bountiesDone);
              this.game.saveGame();
            }
            showToast('委托完成！好感提升！','success');
            overlay.querySelector('.modal-body').innerHTML=render();
            bindActs();
          }
        });
      });
    };
    bindActs();
  }

  /* === 死亡弹窗 === */
  showDeathModal(data){
    const s=this.game.state;if(!s)return;
    const lb=getLeaderboard('guigu').slice(0,5);
    const lbHtml=lb.map((e,i)=>`<div class="death-lb-entry"><span class="lb-rank">#${i+1}</span><span class="lb-name">${e.name||'无名'}</span><span class="lb-score">${e.score}</span></div>`).join('');
    const body=`<div class="death-modal">
      <div class="death-title">仙途终结</div>
      <div class="death-cause">${data.cause}</div>
      <div style="text-align:center;font-size:0.85rem;color:var(--cyan);font-style:italic;margin:8px 0">${typeof getEncouragement==='function'?getEncouragement():''}</div>
      <div class="death-stats">
        <div class="death-stat"><div class="death-stat-label">境界</div><div class="death-stat-value">${REALMS[s.realm].name}</div></div>
        <div class="death-stat"><div class="death-stat-label">年龄</div><div class="death-stat-value">${s.age}岁</div></div>
        <div class="death-stat"><div class="death-stat-label">击杀</div><div class="death-stat-value">${s.kills||0}</div></div>
        <div class="death-stat"><div class="death-stat-label">成就</div><div class="death-stat-value">${s.achievements.length}</div></div>
      </div>
      <div class="death-score-label">最终分数</div>
      <div class="death-score">${data.score}</div>
      <div class="death-leaderboard"><h4>仙榜</h4>${lbHtml}</div>
      <button class="btn btn-gold btn-lg restart-btn" id="restart-btn">重新开始</button>
    </div>`;
    const overlay=this.showModal('',body,'');
    document.getElementById('restart-btn')?.addEventListener('click',()=>{this.closeModal();this.renderSlotSelection()});
  }

  /* === 工具方法 === */
  getRealmColor(idx){
    const colors=['#aaa','#8f8','#4ef','#fd4','#f84','#f4f','#4ff','#ff4'];
    return colors[idx]||'#fff';
  }
}

/* ==================== 启动 ==================== */
document.addEventListener('DOMContentLoaded',()=>{
  new GuiguUI();
  // 新手引导
  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('guigu', [
      { title: '欢迎来到鬼谷八荒！', desc: '寿命有尽，大道无穷。探索鬼谷世界，悟道修行，踏上成仙之路。' },
      { title: '功能标签', desc: '切换总览、修炼、大地图等功能面板。', target: '#guigu-tabs' },
      { title: '大地图', desc: '探索世界地图，发现城镇、秘境、洞府等丰富内容。', target: '#panel-map' },
      { title: '角色总览', desc: '查看角色属性、境界、装备等信息。', target: '#panel-overview' }
    ]);
  }
});

})();
