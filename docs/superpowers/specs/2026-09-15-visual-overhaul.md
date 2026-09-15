# 七款游戏的美术改造

目标：让七款仙侠游戏拥有完整的场景氛围、可辨认的人物与卡牌、清晰的战斗信息；保留真实 Three.js 交互和现有存档。

## 美术方向

青绿山水与工笔人物。远景呈现山川、云雾和建筑，中景由 Three.js 呈现可操作的地形、人物与卡牌，近景只放本局需要的信息。场景成为主体，控制按钮与说明收进画面边缘。

- 霁青 `#0b2837`：场景暗部与顶栏。
- 石青 `#326d81`：远山、湖水与冷色光。
- 松绿 `#487464`：植被与修仙主题。
- 绢白 `#e6e9de`：正文与明亮面板。
- 赤金 `#cba96e`：可操作目标与细节。
- 朱砂 `#b75f52`：敌方、危险与火焰。
- 标题使用现有霞鹜文楷，正文使用系统中文字体，资源数值使用等宽数字。

布局以完整画幅、简洁信息栏和大面积美术为主。舍弃把所有画面塞进相同小盒子的做法，各游戏通过地貌、季节、光照与人物身份区分。

## 场景分工

| 游戏 | 场景 | 人物与交互重点 |
| --- | --- | --- |
| 修仙之路 | 云海青峰、临崖道场、苍松 | 主角比例、境界光环、修炼状态 |
| 仙途模拟器 | 春日竹溪、村落与石桥 | 人生阶段、事件路径与手札 |
| 鬼谷八荒 | 青绿山川、江河与仙门 | 已探索地块、地貌、目的地 |
| 斩仙塔 | 雨夜赤塔、山间云桥 | 分支路线、敌方意图、手牌 |
| 灵卡对决 | 湖上玉台、残荷与远山 | 双方阵地、费用、选中目标 |
| 仙卡录 | 月下仙宫、星河与花树 | 人物立绘、阵容、血量与大招 |
| 转转刀 | 秋林古道、苔石与红枫 | 敌我轮廓、地面层次、攻击反馈 |

## 图片素材方案

生成方式待确认：当前会话未提供内置 `image_gen` 工具，API 方式需要显式确认及本机 `OPENAI_API_KEY`。未生成前不将任何代码图形或截图标记为生成图片。

所有场景图共用提示词：

> Original Chinese xianxia game environment illustration, meticulous gongbi linework combined with layered blue-green shanshui mineral painting, sophisticated painterly game key art, rich material detail, atmospheric depth, softly luminous clouds, restrained antique gold accents. Wide landscape composition, foreground and midground arranged for a playable scene overlay, generous quiet center, no characters, no text, no letters, no UI, no borders, no watermark. Keep a consistent art direction across the game collection.

| 文件名 | 追加提示词 |
| --- | --- |
| cultivation.webp | Dawn above an immense sea of clouds, steep jade mountains, a secluded cliffside cultivation terrace, ancient windswept pine, pale turquoise light and warm sunlight. |
| lifesim.webp | Lush spring valley, bamboo grove around a winding stream, a small ancient village, an arched stone bridge, peach blossoms, poetic everyday warmth, muted celadon greens. |
| guigu.webp | Grand blue-green wilderness panorama, layered mountain ranges, a winding river, waterfalls and tiny distant sect temples, an open world awaiting exploration, light traveling across the valley. |
| cardtower.webp | A formidable ancient vermilion pagoda rising from misty mountain cliffs at dusk, hanging bridges, rain-wet dark stone, ember lanterns, dramatic yet readable indigo and cinnabar lighting. |
| cardbattle.webp | A sacred jade dueling terrace beside a mirror lake, balanced symmetrical distant pavilions, lotus leaves and mountain reflections, contemplative teal light, an elegant tactical battlefield. |
| cardcollect.webp | Moonlit celestial palace garden above the clouds, flowering plum trees, flowing pale silk, distant stars reflected in a pool, refined indigo and pearl palette, luminous but restrained. |
| knife.webp | Ancient forest arena in autumn, red maple canopy, roots, weathered stone lanterns, mossy ruins and warm shafts of sunlight, rich earthy and jade tones, open central ground. |

人物图：一组八名不同身份的修仙人物半身立绘，分别为白衣剑修、青衣灵医、赤甲武者、紫衣术士、金冠仙君、狐耳女修、布衣少年、玄衣妖将。面部与服饰细致、轮廓分明；统一工笔彩绘风格。每位人物单独成图，不把多人的面孔压缩成一张低清大图。

卡牌图：御剑、护体、灵兽、火法、冰法、雷法六种主题插画，按玩法复用；场景图、人物图及卡牌图均保存为本地 WebP 并加入离线预缓存。

## 实施与验收

1. 调整共享场景构图、光照、人物几何和信息标签，让手机画面清楚可点。
2. 更新七款游戏的主题界面、场景装饰与卡牌表现。
3. 生成确认后的素材，检查每张输出后接入；不使用缺失图片路径。
4. 更新资源版本与预缓存，验证七款游戏的桌面、手机、实际操作及离线表现。
