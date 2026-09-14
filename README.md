# 仙界游坊

七款修仙题材在线小游戏的合集门户。纯前端、免登录，进度保存在浏览器本地，支持 PWA 安装与离线游玩。转转刀使用本地托管的 Three.js 呈现 3D 演武场，其余游戏使用浏览器原生 API。

| 游戏 | 入口 | 玩法 |
|---|---|---|
| 修仙之路 | `games/cultivation.html` | 放置养成 RPG：灵根、宗门、修炼、突破、炼丹、秘境战斗 |
| 仙途模拟器 | `games/lifesim.html` | 文字人生模拟：逐年推进，随机事件抉择，追求飞升 |
| 鬼谷八荒 | `games/guigu.html` | 开放世界 RPG：探索、悟道、心魔试炼、宗门 |
| 转转刀 | `games/knife.html` | 3D 肉鸽动作：方向闪避、旋转刀阵、八大武学、首领挑战、永久强化 |
| 斩仙塔 | `games/cardtower.html` | 肉鸽卡牌爬塔：牌组构筑、逐层挑战 |
| 灵卡对决 | `games/cardbattle.html` | 回合制卡牌对战：召唤弟子、施放法术、击败 AI 仙师 |
| 仙卡录 | `games/cardcollect.html` | 抽卡收集：五人阵容自动战斗、升级突破、秘境闯关 |

门户首页支持搜索、玩法筛选和最近游玩，还提供跨游戏的仙榜（本地排行榜）、修仙档案（统计）、每日仙令（任务）、仙缘兑换（道具商店）与仙道成就。所有游戏通过共享的本地统计数据互相联动。

## 本地运行

需要 [Deno](https://deno.com/)：

```bash
deno run --allow-net --allow-read serve.ts
# 或
npm run serve
```

打开终端提示的地址（默认 `http://localhost:8000/`）。也可以用任意静态文件服务器托管项目根目录，`index.html` 即首页。

部署到 Deno Deploy 时入口为 `main.ts`。

## 测试

无需 `npm install`，仅依赖 Node.js 18+：

```bash
npm test            # 单元测试 + Service Worker 预缓存清单校验
npm run test:unit   # 仅单元测试（tests/*.test.js）
npm run check:sw    # 校验页面及其递归模块依赖已完整预缓存
```

GitHub Actions 会在 push / PR 时自动执行同样的检查。测试运行器为每个测试文件设置 60 秒硬超时，使用 Node 的 VM 模块加载实际 ES modules，不需要安装测试依赖。

## 3D 演武场

- 桌面使用 WASD / 方向键移动、空格闪避、1–8 释放武学、Esc 暂停；手机使用模拟摇杆、闪避和技能按钮。可从演武场右上角进入全屏。
- 闪避沿移动方向释放，静止时沿角色朝向；短暂无敌，冷却 4 秒。暂停和升级选择期间冷却也暂停。闪避遵守地形碰撞，轨迹记录实际移动路径；摇杆轻推可慢走。
- 敌人、侠客、刀光、掉落物与危险区域由 Three.js 渲染。战斗按固定 60 Hz 推进，不随屏幕刷新率改变速度；切换标签页或窗口会自动暂停。
- 青岚庭院采用白袍红巾游侠、不同武器轮廓的敌人、石板与红枫场景；近处树冠会渐淡避免遮挡。树干、石灯与岩石的碰撞位置共用场景数据，刀光跟随真实刀尖轨迹渐隐。
- 金币箱、回复药瓶和修为晶体有独立模型与拾取效果；金币箱增加本局金币。生成补给会避开障碍，金钟罩不会覆盖角色原色，真正受伤时才出现短促的衣物闪光。
- 战场铺满窗口；手机菜单单独取景，摇杆与已习得的武学贴边放置，连斩提示避开角色。首页封面来自项目实际画面，图库和档案区支持快速筛选与展开。
- 升级、祝福、挑战修饰符、首领进化和永久强化继续使用原有存档。菜单与永久强化商店显示实际本地进度。
- 需要支持 WebGL 2 的现代浏览器。图形初始化或运行失败会显示明确错误并停止战斗。
- Three.js 固定为 **0.186.0**，本地文件为 `js/vendor/three.module.js`，MIT 许可证保存在 `js/vendor/LICENSE.three`。官方 `build/three.module.js` 使用 esbuild **0.25.11** 的 `--bundle --minify --format=esm --legal-comments=inline` 打包；运行游戏无需 npm 安装或访问第三方脚本 CDN。

视觉设计参考了 [Soulstone Survivors](https://store.steampowered.com/app/2066020/Soulstone_Survivors/)、[Brotato](https://store.steampowered.com/app/1942280/Brotato/) 与 [Death Must Die](https://store.steampowered.com/app/2334730/Death_Must_Die/) 的官方画面，重点是敌我轮廓、战斗信息层级与连续刀光。镜头、地面和材质组织参考了 MIT 开源项目 [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019)。本站模型、场景与矢量图标由本项目代码生成，游戏封面为实际运行截图。

## 其他游戏的界面与操作

- **修仙之路**：山水修炼台集中显示下一境界、突破条件和预计时间；修炼进度、突破按钮和宗门任务奖励实时更新。
- **仙途模拟器**：按人生阶段组织事件，选择后立即保存并显示真实属性变化；手札可以按年龄阶段和关键词检索，结算后仍可翻阅。
- **鬼谷八荒**：地形地图支持附近与全图视野，点选已知地块预览路线、耗时和危险。每次只前进一格，沿途照常耗时和触发遭遇；可使用八向按钮和键盘选择地块。
- **斩仙塔**：路线对应实际的 15 层、60 场战斗，敌方意图和可出手牌数在战场直接显示。数字键出牌或选择奖励，E 结束回合；手机横滑查看手牌。
- **灵卡对决**：阵线、灵力、可出牌数和合法目标共同更新；组牌时显示费用曲线。数字键出牌、E 结束回合、H 释放灵技，Escape 取消目标选择；手机可横滑手牌。
- **仙卡录**：31 位角色使用本地矢量立绘，支持按品质、攻击或生命排序和一键上阵；换将前预览阵容属性增减。召唤概率直接读取实际抽取配置，秘境共 30 章。

仙卡录的角色立绘由 `scripts/create-card-portraits.js` 生成，运行 `node scripts/create-card-portraits.js` 可重新输出 `assets/cardcollect/portraits.svg`，角色编号与现有存档一致。六款游戏共用 `css/game-shell.css` 的导航、焦点和弹窗基础样式，各自保留独立的配色与布局。

仙卡录和灵卡对决共用 `js/cardcollect-catalog.js` 的只读角色目录。抽到的角色同步到灵卡对决时，会按真实姓名、定位、品质和等级生成对战卡牌；突破后的品质同样生效，重复同步不会增加副本。

## 项目结构

```
index.html            门户首页
games/*.html          各游戏入口页
js/shared*.js         按职责拆分的存储、设置、导航、音效、成就、每日任务等共享模块
js/portal*.js         首页、游戏检索、兑换、任务、档案、排行榜
js/knife.js           3D 游戏依赖组合与启动入口
js/knife-game.js      游戏模拟入口；其他 knife-* 模块负责战斗、输入、界面和渲染
js/vendor/            固定版本的本地 Three.js 及其许可证
js/<game>.js          各游戏逻辑
js/*-recovery.js      从游戏中抽出的纯逻辑模块（UMD 包装，可在 Node 中单测）
js/*-progression.js
css/shared.css        共享样式；css/<game>.css 各游戏样式
sw.js                 Service Worker 生命周期
sw-assets.js          PWA_ASSETS.core 预缓存清单
sw-runtime.js         页面/静态资源缓存策略与离线页面
js/pwa-updates.js     可取消的更新前保存与用户主动刷新
offline.html          离线兜底页
manifest.json         PWA 清单
tests/                Node 单元测试与运行器
scripts/              开发辅助脚本
docs/superpowers/     设计文档与分阶段计划
```

## 开发约定

详见 [AGENTS.md](AGENTS.md)。要点：

- 2 空格缩进；优先浏览器原生 API，3D 游戏使用固定版本、本地托管的 Three.js。
- 渲染用户可控文本时优先 `textContent`；必须用 `innerHTML` 时用 `escapeHtml()` 转义。
- 发布资源变更时同步更新 `CACHE_VERSION` 与 `sw-assets.js`；页面资源和 ES module 的间接依赖均须预缓存，URL 查询参数也是缓存键的一部分。
- JS 动态插入的角色、地形和牌纹 SVG 也必须显式加入预缓存；离线验收需进入实际玩法，验证这些资源已经加载。
- 共享纯逻辑沿用 UMD 包装，3D 游戏模块使用原生 ES modules；提取或修复核心逻辑时补对应的回归测试。

## 离线与更新

在联网状态下打开一次首页，等待 Service Worker 安装完成，即会预缓存所有游戏及其本地依赖。随后可以离线打开这些入口，字体加载不影响玩法。

更新只在所有必需资源缓存成功后进入待激活状态。出现更新提示后，点击“更新并刷新”会先保存待写入数据；保存失败会保留当前页面并显示错误。其他正在游戏的标签页不会被强制刷新。

## 存档

所有进度保存在浏览器 `localStorage`。设置弹窗中的“导出存档 / 导入存档”可以在设备之间迁移数据。导入先校验数据，并以事务方式覆盖存档；待写入的旧数据不会在刷新时覆盖新导入的进度。仙缘兑换同样在奖励实际写入成功后一起提交扣点与购买记录。
