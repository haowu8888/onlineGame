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

- [ ] **Step 1: 定义阶段2版本常量**

Add:
```js
const PHASE2_SAVE_VERSION = 2;
const PHASE2_RESET_GAMES = ['cultivation', 'cardtower', 'guigu'];
```
Expected: 共享层和三个游戏都能读到统一的阶段2版本号。

- [ ] **Step 2: 增加一次性清档确认**

Add:
```js
{
  version: PHASE2_SAVE_VERSION,
  confirmedAt: Date.now()
}
```
Action: 首次进入三个目标游戏前，检查确认标记；未确认时弹出明确提示“阶段2会清空旧档”。
Expected: 用户确认后再删除旧档键，不能静默清空。

- [ ] **Step 3: 清理目标旧档与遗留联动键**

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

- [ ] **Step 4: 回归验证清档行为**

Action: 预置旧档 -> 进入游戏 -> 确认清档 -> 重载再进。
Expected: 首次会提示并清空；二次进入不再重复提示；三个目标玩法以新版初始态启动。

- [ ] **Step 5: 提交共享层改动**

Run: `git add js/shared.js js/cultivation.js js/cardtower.js js/guigu.js`
Run: `git commit -m "feat: reset phase2 saves for reworked games"`
Expected: 清档逻辑单独可追踪。

## Task 2: cultivation 深改为“秘境三选一路线推进”

**Files:**
- Modify: `js/cultivation.js`
- Modify: `css/cultivation.css`
- Modify: `games/cultivation.html`

- [ ] **Step 1: 给存档增加新版秘境推进状态**

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

- [ ] **Step 2: 实现三选一路线生成器**

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

- [ ] **Step 3: 接入路线偏好与显式随机提示**

Add route bias options:
```js
['steady', 'greedy', 'gamble']
```
Action: 开始历练前选择“稳修 / 夺宝 / 赌命”路线，影响战斗、事件、资源节点权重；界面显示当前气运倾向与下一步预兆。
Expected: 策略分支至少 3 条，随机变化有文字提示，不是黑箱。

- [ ] **Step 4: 增加战后/事件后祝福三选一**

Add draft shape:
```js
{ id: 'blood_forge', name: '血战淬体', bonus: { atkPct: 0.12, loseHpPct: 0.05 } }
```
Action: 完成战斗或高风险事件后，弹出 3 选 1 的短局增益。
Expected: 玩家能围绕暴击、续航、掉宝等方向构筑当次历练。

- [ ] **Step 5: 提升战斗结算反馈**

Action: 在日志与结算卡里拆开显示“路线选择 -> 遭遇 -> 伤益 -> 祝福变化 -> 下一步预兆”。
Expected: 输赢与收益来源说清楚，别再让人靠猜。

- [ ] **Step 6: 手工验证 cultivation 新循环**

Action: 新建存档 -> 选择路线倾向 -> 连续推进 5 步 -> 至少经历 1 战斗、1 随机事件、1 祝福选择 -> 保存/重载。
Expected: 路线权重、祝福效果、读档一致；无 `console.error`。

- [ ] **Step 7: 提交 cultivation 深改**

Run: `git add games/cultivation.html css/cultivation.css js/cultivation.js`
Run: `git commit -m "feat: deepen cultivation route strategy"`
Expected: cultivation 改动独立成提交。

## Task 3: cardtower 深改为“分岔塔路 + 敌人词缀 + 流派遗物”

**Files:**
- Modify: `js/cardtower.js`
- Modify: `css/cardtower.css`
- Modify: `games/cardtower.html`

- [ ] **Step 1: 扩展塔图节点数据**

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

- [ ] **Step 2: 增加双分岔/三分岔路径选择**

Action: 每层至少出现 2 条可选路径，提前显示未来 1 层节点类型。
Expected: 玩家可以为了回血、商店、精英或事件做路线规划。

- [ ] **Step 3: 引入敌人词缀系统**

Add affix examples:
```js
[
  { id: 'berserk', name: '狂暴', effect: '敌人每回合攻击成长' },
  { id: 'thorns', name: '反刺', effect: '受到攻击时反伤' },
  { id: 'frail_open', name: '破绽', effect: '开局首回合更脆弱' }
]
```
Expected: 每场战斗有可见差异，且在开战前展示。

- [ ] **Step 4: 重做奖励为“卡牌 / 遗物 / 恢复”三选一**

Action: 非精英战后给牌池三选一；精英/事件后给遗物三选一；营地提供恢复或删牌。
Expected: 至少形成进攻、叠甲、连击等 2-3 条稳定流派。

- [ ] **Step 5: 增加随机事件节点**

Action: 实装宝箱、黑市、祭坛、赌徒四类事件，所有收益/代价必须明牌。
Expected: 随机有刺激，但不是暗扣数值。

- [ ] **Step 6: 手工验证 cardtower 新循环**

Action: 新开局 -> 走两条不同路线各 1 次 -> 至少触发 1 个词缀战与 1 个事件节点 -> 通关或死亡结算。
Expected: 路线差异、奖励构筑、词缀效果都可见；无 `console.error`。

- [ ] **Step 7: 提交 cardtower 深改**

Run: `git add games/cardtower.html css/cardtower.css js/cardtower.js`
Run: `git commit -m "feat: deepen cardtower pathing and relic play"`
Expected: cardtower 改动独立成提交。

## Task 4: guigu 深改为“月度主修策略 + 地图机缘牌堆 + 宗门压力”

**Files:**
- Modify: `js/guigu.js`
- Modify: `css/guigu.css`
- Modify: `games/guigu.html`

- [ ] **Step 1: 给角色增加月度策略状态**

Add:
```js
state.monthPlan = {
  focus: 'training',
  daysLeft: 30,
  bonusTag: 'exp_up'
};
```
Expected: 玩家每月先定调子，再去行动，不是所有按钮都一个味儿。

- [ ] **Step 2: 实装四类月度主修方向**

Add focus set:
```js
['training', 'adventure', 'sect', 'social']
```
Action: 月初选择“闭关修行 / 外出历练 / 宗门差事 / 经营人脉”，分别强化经验、战利品、宗门贡献、NPC 好感相关收益。
Expected: 至少 4 条主修分支，且 UI 能看到当前加成和剩余天数。

- [ ] **Step 3: 重做历练为地图机缘牌堆**

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

- [ ] **Step 4: 增加宗门压力与竞争目标**

Action: 每月刷新 1 条宗门法令或竞争目标，例如“本月猎妖 3 次”“本月捐献 300 灵石”；失败有轻惩罚，成功给稀有资源。
Expected: 宗门线不再只是摆设，能逼玩家在资源之间做取舍。

- [ ] **Step 5: 提升结算与世界日志可读性**

Action: 月末结算拆成“本月主修收益 / 机缘结果 / 宗门评价 / 下月风险提示”。
Expected: 成长路径清楚，世界变化能看懂。

- [ ] **Step 6: 手工验证 guigu 新循环**

Action: 新建存档 -> 连续经历 2 个月度计划 -> 至少触发 2 种机缘牌 -> 完成或失败 1 条宗门目标 -> 保存/重载。
Expected: 月度加成、机缘结果、宗门压力与存档一致；无 `console.error`。

- [ ] **Step 7: 提交 guigu 深改**

Run: `git add games/guigu.html css/guigu.css js/guigu.js`
Run: `git commit -m "feat: deepen guigu monthly strategy loop"`
Expected: guigu 改动独立成提交。

## Task 5: 三游戏统一回归与问题收口

**Files:**
- Modify: `docs/superpowers/plans/2026-03-27-phase2-gameplay-deepening-plan.md`

- [ ] **Step 1: 逐个跑新档主循环**

Action: `cultivation`、`cardtower`、`guigu` 全部从清档后的新档开始，完整跑一遍最短可验证主循环。
Expected: 三个游戏都能在 Chrome 最新版 PC 端顺畅进入与推进。

- [ ] **Step 2: 核对策略分支数量**

Action: 记录每个游戏至少 2 个可控策略分支与 1 套随机提示链路。
Expected: 达到阶段2最低基线，不搞“只是数值大一点”的假优化。

- [ ] **Step 3: 核对等待与反馈**

Action: 观察核心动作是否在 200ms 内给反馈，且无操作等待不超过 10 秒。
Expected: 体感明显比阶段1更利索。

- [ ] **Step 4: 记录问题 + 修复摘要**

Action: 按“问题 / 影响 / 修复 / 回归结果”更新本计划文档底部执行记录。
Expected: 收口信息够硬，不写空话。

- [ ] **Step 5: 提交阶段2收口记录**

Run: `git add docs/superpowers/plans/2026-03-27-phase2-gameplay-deepening-plan.md`
Run: `git commit -m "docs: record phase2 gameplay overhaul verification"`
Expected: 阶段2验证结果可追踪。
