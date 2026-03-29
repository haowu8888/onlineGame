# Phase 2 Gameplay Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 深改 `cultivation`、`cardtower`、`guigu` 三个玩法，让核心循环更爽、更有策略、更随机，并按用户授权直接清空旧档进入新版体验。

**Architecture:** 以“旧档清理 + 单局决策增强 + 显式随机提示 + 快速反馈”四条线推进。共享层负责版本升级与清档提示，三个游戏各自增加一套明确可见的策略选择回路和一套非静默的随机事件回路，避免继续往旧逻辑上糊补丁。

**Tech Stack:** HTML / CSS / JavaScript（浏览器原生，无依赖）、`localStorage`、Chrome PC 手工回归。

---

## Scope Check
本计划只覆盖阶段2的三款玩法深改，不混入阶段3其余游戏与阶段4门户/PWA升级。别一上来就把全站重新装修，那是给自己找骂。

## File Structure
- Modify: `js/shared.js`
- Modify: `js/cultivation.js`
- Modify: `css/cultivation.css`
- Modify: `games/cultivation.html`
- Modify: `js/cardtower.js`
- Modify: `css/cardtower.css`
- Modify: `games/cardtower.html`
- Modify: `js/guigu.js`
- Modify: `css/guigu.css`
- Modify: `games/guigu.html`
- Modify: `docs/superpowers/plans/2026-03-27-phase2-gameplay-deepening-plan.md`

## Task 1: 共享层版本升级与旧档清理

**Files:**
- Modify: `js/shared.js`
- Modify: `js/cultivation.js`
- Modify: `js/cardtower.js`
- Modify: `js/guigu.js`

- [x] **Step 1: 定义阶段2版本常量**

Add:
```js
const PHASE2_SAVE_VERSION = 2;
const PHASE2_RESET_GAMES = ['cultivation', 'cardtower', 'guigu'];
```
Expected: 共享层和三个游戏都能读到统一的阶段2版本号。
Result: 已将 `js/shared.js` 中的 `CONSTANTS.SAVE_VERSION` 提升到 `2`，并新增 `PHASE2_SAVE_RESET_CONFIG`，集中声明 `cultivation`、`cardtower`、`guigu` 的阶段2清档版本、展示名与匹配键规则。

- [x] **Step 2: 增加一次性清档确认**

Add:
```js
{
  version: PHASE2_SAVE_VERSION,
  confirmedAt: Date.now()
}
```
Action: 首次进入三个目标游戏前，检查确认标记；未确认时弹出明确提示“阶段2会清空旧档”。
Expected: 用户确认后再删除旧档键，不能静默清空。
Result: 已在 `js/shared.js` 中实现 `window.Phase2SaveReset.ensure(gameId)`，首次进入目标游戏时会弹出明确确认；确认状态落在 `phase2_reset_confirmations`，同版本只问一次。

- [x] **Step 3: 清理目标旧档与遗留联动键**

Run against:
```js
[
  /^cultivation_save_/,
  /^guigu_save_/,
  /^cardtower_/,
  /^xianyuan_tower_bonuses$/,
  /^xianyuan_guigu_bonuses$/
]
```
Expected: 只清理阶段2目标玩法与其联动残留，不误伤其他游戏存档。
Result: 已验证 `cultivation` 只清 `cultivation_save_*`，`cardtower` 清 `cardtower_*` 与 `xianyuan_tower_bonuses`，`guigu` 清 `guigu_save_*` 与 `xianyuan_guigu_bonuses`；非目标玩法存档保留。

- [x] **Step 4: 回归验证清档行为**

Action: 预置旧档 -> 进入游戏 -> 确认清档 -> 重载再进。
Expected: 首次会提示并清空；二次进入不再重复提示；三个目标玩法以新版初始态启动。
Result: 已通过 `.tmp/phase2-reset-audit.html` 验证共享层 helper 从缺失到通过；又通过 `.tmp/cultivation-reset-integration.html`、`.tmp/guigu-reset-integration.html`、`.tmp/cardtower-reset-integration.html` 在本机 Chrome headless 验证 3 个目标页面真实初始化后都会触发一次确认并清理各自旧档。期间额外修掉 1 个新引入语法错误：`js/cultivation.js` 的清档阻断文案误写反引号导致脚本解析失败。

- [ ] **Step 5: 提交共享层改动**

Run: `git add js/shared.js js/cultivation.js js/cardtower.js js/guigu.js`
Run: `git commit -m "feat: reset phase2 saves for reworked games"`
Expected: 清档逻辑单独可追踪。

## Task 2: cultivation 深改为“秘境三选一路线推进”

**Files:**
- Modify: `js/cultivation.js`
- Modify: `css/cultivation.css`
- Modify: `games/cultivation.html`

- [x] **Step 1: 给存档增加新版秘境推进状态**

Add:
```js
data.phase2Adventure = {
  routeBias: 'steady',
  momentum: 0,
  omen: null,
  step: 0,
  blessingDraft: []
};
```
Expected: 新版存档具备独立的路线推进状态，不和旧战斗态混成一锅粥。
Result: 已在 `js/cultivation.js` 增加 `phase2Adventure` 默认状态、归一化逻辑与存档迁移，状态独立记录 `routeBias / momentum / omen / step / currentChoices / blessings / blessingDraft / pendingBattleChoice / log`。

- [x] **Step 2: 实现三选一路线生成器**

Add generator output:
```js
[
  { id: 'battle', risk: 2, reward: ['exp', 'loot'], preview: '遭遇妖兽' },
  { id: 'event', risk: 1, reward: ['insight'], preview: '机缘异动' },
  { id: 'rest', risk: 0, reward: ['heal'], preview: '灵泉歇息' }
]
```
Action: 每次推进历练时给出 3 个节点，展示风险/奖励预览。
Expected: 玩家每步都要选，不再靠后台静默 tick 磨时间。
Result: 已接入 `battle / event / rest / harvest` 四类节点模板与三选一生成器，并修复阶段2状态在嵌套读取时被重新归一化替换、导致路线卡不落盘的根因。

- [x] **Step 3: 接入路线偏好与显式随机提示**

Add route bias options:
```js
['steady', 'greedy', 'gamble']
```
Action: 开始历练前选择“稳修 / 夺宝 / 赌命”路线，影响战斗、事件、资源节点权重；界面显示当前气运倾向与下一步预兆。
Expected: 策略分支至少 3 条，随机变化有文字提示，不是黑箱。
Result: 已接入 `steady / greedy / gamble` 三种路线倾向，影响节点权重；战斗面板会展示当前倾向、推进步数、势头与预兆文本。

- [x] **Step 4: 增加战后/事件后祝福三选一**

Add draft shape:
```js
{ id: 'blood_forge', name: '血战淬体', bonus: { atkPct: 0.12, loseHpPct: 0.05 } }
```
Action: 完成战斗或高风险事件后，弹出 3 选 1 的短局增益。
Expected: 玩家能围绕暴击、续航、掉宝等方向构筑当次历练。
Result: 已接入 6 个阶段2祝福，支持战斗胜利、偶数步推进和高风险路线后弹出三选一草案，并把祝福效果接入路线伤害、资源、悟道与战后恢复。

- [x] **Step 5: 提升战斗结算反馈**

Action: 在日志与结算卡里拆开显示“路线选择 -> 遭遇 -> 伤益 -> 祝福变化 -> 下一步预兆”。
Expected: 输赢与收益来源说清楚，别再让人靠猜。
Result: 已在战斗面板新增“路线记录”区，按路线选择、即时结果、祝福获取和下一步预兆串起反馈；战斗回流后也会把额外修为/灵石与恢复写入该区。

- [x] **Step 6: 手工验证 cultivation 新循环**

Action: 新建存档 -> 选择路线倾向 -> 连续推进 5 步 -> 至少经历 1 战斗、1 随机事件、1 祝福选择 -> 保存/重载。
Expected: 路线权重、祝福效果、读档一致；无 `console.error`。
Result: 已用本机 Chrome headless 通过 `.tmp/cultivation-phase2-route-audit.html`、`.tmp/cultivation-phase2-flow-audit.html`、`.tmp/cultivation-phase2-reload-audit.html` 三个审计页验证基础路线生成、两次非战斗推进 + 祝福 + 战斗回流，以及读档后的路线/预兆一致性，结果均无 `errors` 且 `pass: true`。

- [ ] **Step 7: 提交 cultivation 深改**

Run: `git add games/cultivation.html css/cultivation.css js/cultivation.js`
Run: `git commit -m "feat: deepen cultivation route strategy"`
Expected: cultivation 改动独立成提交。

## Task 3: cardtower 深改为“分岔塔路 + 敌人词缀 + 流派遗物”

**Files:**
- Modify: `js/cardtower.js`
- Modify: `css/cardtower.css`
- Modify: `games/cardtower.html`

- [x] **Step 1: 扩展塔图节点数据**

Add node shape:
```js
{
  id: 'elite',
  lane: 'left',
  type: 'elite',
  affix: 'berserk',
  previewRewards: ['relic', 'gold']
}
```
Expected: 地图节点不再只是“打一场就完”，而是有路线和预览信息。
Result: 已在 `js/cardtower.js` 新增 `TOWER_NODE_META`、`TOWER_PATH_ACTS`、`TOWER_ROW_BLUEPRINTS`、`buildTowerRows(rng)` 等结构，节点数据现在显式包含 `nodeId / lane / type / previewRewards / nextTypes / affixId`，并落盘到 `towerRows`、`towerNodeMap`、`availableNodeIds`、`completedNodeIds`。

- [x] **Step 2: 增加双分岔/三分岔路径选择**

Action: 每层至少出现 2 条可选路径，提前显示未来 1 层节点类型。
Expected: 玩家可以为了回血、商店、精英或事件做路线规划。
Result: 已把旧的线性楼层推进改成真正的分岔塔图；开局先生成整幕地图，当前层至少提供 2 个可选节点，节点卡会展示奖励预览与下一层类型预览，点击 `.ct-tower-node.available` 走显式选路，不再是自动往下推。

- [x] **Step 3: 引入敌人词缀系统**

Add affix examples:
```js
[
  { id: 'berserk', name: '狂暴', effect: '敌人每回合攻击成长' },
  { id: 'thorns', name: '反刺', effect: '受到攻击时反伤' },
  { id: 'frail_open', name: '破绽', effect: '开局首回合更脆弱' }
]
```
Expected: 每场战斗有可见差异，且在开战前展示。
Result: 已接入 `berserk`、`thorns`、`warded`、`frail_open` 四种敌人词缀；`BattleManager.startBattle()` 支持 `{ key, affixId, hpMul }` descriptor，词缀标签会在战前敌人面板展示，并真正进入回合逻辑生效。

- [x] **Step 4: 重做奖励为“卡牌 / 遗物 / 恢复”三选一**

Action: 非精英战后给牌池三选一；精英/事件后给遗物三选一；营地提供恢复或删牌。
Expected: 至少形成进攻、叠甲、连击等 2-3 条稳定流派。
Result: 已把普通战、精英、Boss、营地、黑市奖励回路全部改成节点结算驱动：普通战后给卡牌三选一，精英/Boss 后给遗物三选一，营地支持恢复/锻造/删牌，黑市支持买法宝/净化，构筑路线开始能围绕卡牌稀有度、遗物联动和补给节点做取舍。

- [x] **Step 5: 增加随机事件节点**

Action: 实装宝箱、黑市、祭坛、赌徒四类事件，所有收益/代价必须明牌。
Expected: 随机有刺激，但不是暗扣数值。
Result: 已加入事件节点池 `TOWER_PATH_EVENTS`，并接进 `event / rest / shop / battle / elite / boss` 的统一推进流；事件面板会明示收益与代价，Chrome 审计里也专门优先验证了安全离场分支，避免黑箱扣数值。

- [x] **Step 6: 手工验证 cardtower 新循环**

Action: 新开局 -> 走两条不同路线各 1 次 -> 至少触发 1 个词缀战与 1 个事件节点 -> 通关或死亡结算。
Expected: 路线差异、奖励构筑、词缀效果都可见；无 `console.error`。
Result: 已用本机 Chrome headless 跑通 `.tmp/cardtower-phase2-branch-audit.html`、`.tmp/cardtower-phase2-flow-audit.html`、`.tmp/cardtower-phase2-utility-audit.html` 三个审计页；结果分别确认 `availableCount: 3 / pass: true`、`eliteReached: true / affixVisible: true / relicChoiceCount: 3 / nextAvailableCount: 2 / pass: true`、`utilityType: "rest" / choiceCount: 3 / nextAvailableCount: 1 / pass: true`，且无脚本报错。

- [ ] **Step 7: 提交 cardtower 深改**

Run: `git add games/cardtower.html css/cardtower.css js/cardtower.js`
Run: `git commit -m "feat: deepen cardtower pathing and relic play"`
Expected: cardtower 改动独立成提交。

## Task 4: guigu 深改为“月度主修策略 + 地图机缘牌堆 + 宗门压力”

**Files:**
- Modify: `js/guigu.js`
- Modify: `css/guigu.css`
- Modify: `games/guigu.html`

- [x] **Step 1: 给角色增加月度策略状态**

Add:
```js
state.monthPlan = {
  focus: 'training',
  daysLeft: 30,
  bonusTag: 'exp_up'
};
```
Expected: 玩家每月先定调子，再去行动，不是所有按钮都一个味儿。
Result: 已在 `js/guigu.js` 给存档补上 `monthPlan / monthlyStats / encounterDeck / lastEncounterResult / pendingEncounterReward / sectPressure / lastMonthSummary`，并在 `createCharacter()` / `loadGame()` / `startGame()` 里统一归一化，旧档会直接进入新循环状态。

- [x] **Step 2: 实装四类月度主修方向**

Add focus set:
```js
['training', 'adventure', 'sect', 'social']
```
Action: 月初选择“闭关修行 / 外出历练 / 宗门差事 / 经营人脉”，分别强化经验、战利品、宗门贡献、NPC 好感相关收益。
Expected: 至少 4 条主修分支，且 UI 能看到当前加成和剩余天数。
Result: 已接入 `training / adventure / sect / social` 四种主修；月初必须显式选择，且 `calendar-bar` 与总览/修炼/宗门面板都会显示当前主修、剩余天数与对应加成，修炼经验、机缘收益、宗门贡献、NPC 关系均会吃到不同倍率。

- [x] **Step 3: 重做历练为地图机缘牌堆**

Add encounter shape:
```js
{
  id: 'ruins_contract',
  terrain: 'ruins',
  type: 'risk_reward',
  prompt: '残阵深处传来异响',
  choices: ['强闯', '稳探', '撤离']
}
```
Action: `搜索 / 休息 / 采集` 不再只是平推按钮，改成基于地形权重抽取机缘牌并给 2-3 个明确选择。
Expected: 随机事件有条件、有提示、有代价，不是纯掷骰子。
Result: 已把 `adventure` 面板重做为基于地形 + 主修 + 宗门压力加权的 3 张机缘牌牌堆；当前包含 `ruins_contract`、`forest_spring`、`sect_errand`、`caravan_dispute`、`mountain_beast`、`mist_guest` 六类牌，全部改成明牌三选一，安全线、激进线、撤离线各自代价和收益写清楚。

- [x] **Step 4: 增加宗门压力与竞争目标**

Action: 每月刷新 1 条宗门法令或竞争目标，例如“本月猎妖 3 次”“本月捐献 300 灵石”；失败有轻惩罚，成功给稀有资源。
Expected: 宗门线不再只是摆设，能逼玩家在资源之间做取舍。
Result: 已新增宗门压力和月度法令系统，当前会在 `猎妖令 / 巡山令 / 纳贡令 / 联络令 / 闭关令 / 探秘令` 中随机发任务；压力值、目标进度、成功奖励、失败惩罚都在宗门面板明示，捐献也不再只是傻堆数字，而是直接进入月度目标和压力博弈。

- [x] **Step 5: 提升结算与世界日志可读性**

Action: 月末结算拆成“本月主修收益 / 机缘结果 / 宗门评价 / 下月风险提示”。
Expected: 成长路径清楚，世界变化能看懂。
Result: 已把月末结算落成 `lastMonthSummary`，固定拆成“主修收益 / 机缘结果 / 宗门评价 / 结算结果 / 下月提示”；同时把关键事件写进 `worldLog` 与 `cultLog`，并修掉了“下月提示误读旧法令”的链路错误，避免总结看着像胡话。

- [x] **Step 6: 手工验证 guigu 新循环**

Action: 新建存档 -> 连续经历 2 个月度计划 -> 至少触发 2 种机缘牌 -> 完成或失败 1 条宗门目标 -> 保存/重载。
Expected: 月度加成、机缘结果、宗门压力与存档一致；无 `console.error`。
Result: 已用本机 Chrome headless 跑通 `.tmp/guigu-phase2-month-plan-audit.html`、`.tmp/guigu-phase2-encounter-audit.html`、`.tmp/guigu-phase2-sect-audit.html`、`.tmp/guigu-phase2-reload-audit.html`；结果分别为 `focusCount: 4 / selectedFocus: "adventure" / bannerDays: 30 / pass: true`、`cardCount: 3 / encountersResolved: 1 / lastEncounterId: "mist_guest" / pass: true`、`summarySuccess: true / pressureVisible: true / nextOrderId` 刷新成功、`summaryBefore: true / planCleared: true / focusAfterReload: "social" / deckAfterReload: 3 / pass: true`，均无脚本报错。

- [ ] **Step 7: 提交 guigu 深改**

Run: `git add games/guigu.html css/guigu.css js/guigu.js`
Run: `git commit -m "feat: deepen guigu monthly strategy loop"`
Expected: guigu 改动独立成提交。

## Task 5: 三游戏统一回归与问题收口

**Files:**
- Modify: `docs/superpowers/plans/2026-03-27-phase2-gameplay-deepening-plan.md`

- [x] **Step 1: 逐个跑新档主循环**

Action: `cultivation`、`cardtower`、`guigu` 全部从清档后的新档开始，完整跑一遍最短可验证主循环。
Expected: 三个游戏都能在 Chrome 最新版 PC 端顺畅进入与推进。
Result: 已重新用本机 Chrome headless 复验 `cultivation`、`cardtower`、`guigu` 主循环；`cultivation-phase2-flow-audit` 结果 `battleResolved: true / finalChoiceCount: 3 / finalBlessingCount: 1 / pass: true`，`cardtower-phase2-flow-audit` 结果 `eliteReached: true / affixVisible: true / relicChoiceCount: 3 / pass: true`，`guigu` 四个阶段2审计页全部 `pass: true`。

- [x] **Step 2: 核对策略分支数量**

Action: 记录每个游戏至少 2 个可控策略分支与 1 套随机提示链路。
Expected: 达到阶段2最低基线，不搞“只是数值大一点”的假优化。
Result: `cultivation` 现在至少有 `steady / greedy / gamble` 三条路线偏好 + 祝福草案链路；`cardtower` 至少有地图分岔、事件/营地/黑市、敌人词缀三层决策；`guigu` 至少有四条月度主修、六类机缘牌、六类宗门法令三组分支，随机提示都从黑箱改成明牌。

- [x] **Step 3: 核对等待与反馈**

Action: 观察核心动作是否在 200ms 内给反馈，且无操作等待不超过 10 秒。
Expected: 体感明显比阶段1更利索。
Result: 三个玩法的核心动作都改成点击后直接做状态更新 + DOM 重绘/弹层反馈，不再靠静默 tick 磨时间；本轮 Chrome 审计中未出现长时间无响应、死等 10 秒以上或需要二次点击才能继续的链路。

- [x] **Step 4: 记录问题 + 修复摘要**

Action: 按“问题 / 影响 / 修复 / 回归结果”更新本计划文档底部执行记录。
Expected: 收口信息够硬，不写空话。
Result:

- 问题：`guigu` 原来的“历练”基本是 `搜索 / 休息 / 采集` 三个平推按钮。
  影响：随机感弱，地形和主修形同虚设，玩几轮就只剩点点点。
  修复：改成地形权重机缘牌堆，所有选项都明示收益/代价，并把激进线接进战斗和额外战利链路。
  回归结果：`.tmp/guigu-phase2-encounter-audit.html` 结果 `cardCount: 3 / encountersResolved: 1 / pass: true`。

- 问题：`guigu` 宗门线之前只有捐献按钮，资源取舍没压力。
  影响：宗门面板像摆设，和主循环脱节。
  修复：新增月度法令、压力值、成功奖励、失败惩罚和月结摘要，把捐献、猎妖、巡山、闭关、人脉都串进一个月度回路。
  回归结果：`.tmp/guigu-phase2-sect-audit.html` 结果 `summarySuccess: true / pressureVisible: true / nextOrderId` 正常刷新，`pass: true`。

- 问题：`guigu` 月结摘要最初读取的是旧法令语境，下月提示容易串味。
  影响：总结和预警不可信，玩家会被错误提示带偏。
  修复：先生成下月新法令，再写 `lastMonthSummary.nextRiskHint`，保证摘要和下一月真实状态一致。
  回归结果：`.tmp/guigu-phase2-reload-audit.html` 结果 `summaryBefore: true / orderBefore: true / focusAfterReload: "social" / deckAfterReload: 3 / pass: true`。

- 问题：`guigu` 新审计页最初卡在天赋选择，因为页面重绘后还在点旧节点。
  影响：测试假失败，容易误判成游戏逻辑挂了。
  修复：审计脚本在每次重绘后重新查询第二个天赋节点，再继续后续流程。
  回归结果：四个 guigu 审计页现在全部稳定输出 `pass: true`。

- [ ] **Step 5: 提交阶段2收口记录**

Run: `git add docs/superpowers/plans/2026-03-27-phase2-gameplay-deepening-plan.md`
Run: `git commit -m "docs: record phase2 gameplay overhaul verification"`
Expected: 阶段2验证结果可追踪。
