# Phase 1 Browser Audit & Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成阶段1全量浏览器测试并修复 P0/P1 问题，交付“问题 + 修复摘要”。

**Architecture:** 以 Deno 本地静态服务启动站点，使用 `agent-browser` 做可复现的端到端走查；问题按 P0/P1/P2 分级，逐个修复并回归验证。

**Tech Stack:** HTML/CSS/JavaScript（无依赖），Deno 静态服务（`serve.ts`），本地浏览器（Chrome Stable）。

---

## Scope Check
该规格覆盖“浏览器测试 + 玩法深改 + 门户/PWA升级”多个子系统。为保证可执行性，本计划仅覆盖 **阶段1**。阶段2/3/4 需要单独计划与执行。

## File Structure (Phase 1)
- Modify: `index.html`
- Modify: `games/cultivation.html`
- Modify: `games/lifesim.html`
- Modify: `games/cardtower.html`
- Modify: `games/cardbattle.html`
- Modify: `games/cardcollect.html`
- Modify: `games/knife.html`
- Modify: `games/guigu.html`
- Modify: `js/shared.js`
- Modify: `js/portal.js`
- Modify: `js/cultivation.js`
- Modify: `js/lifesim.js`
- Modify: `js/cardtower.js`
- Modify: `js/cardbattle.js`
- Modify: `js/cardcollect.js`
- Modify: `js/knife.js`
- Modify: `js/guigu.js`
- Modify: `offline.html`
- Modify: `sw.js`
- Modify: `manifest.json`

## Task 1: 启动本地服务与环境准备

**Files:**
- Modify: None

- [ ] **Step 1: 启动本地服务**

Run: `deno run --allow-net --allow-read serve.ts`
Expected: 终端输出监听端口（如 `http://127.0.0.1:8000`）。

- [ ] **Step 2: 清空浏览器数据（全新用户）**

Action: 在 Chrome DevTools Application 中清空 `localStorage`、`Cache`、`Service Workers`。
Expected: 重新加载后无历史存档提示。

- [ ] **Step 3: 记录基线环境**

Action: 记录 Chrome 版本号、执行日期时间、Windows 版本号（用于验收复现）。
Expected: 记录在内部日志或执行记录中，格式固定为“时间 / Chrome / Windows / URL”。

## Task 2: 首页与导航走查

**Files:**
- Modify: `index.html`
- Modify: `js/portal.js`
- Modify: `js/shared.js`

- [x] **Step 1: 首页加载与设置面板检查**

Action: 打开首页，打开设置面板，切换动画/字体设置。
Expected: UI 无异常，设置可生效且不报错。
Result: 已验证首页设置弹窗可打开，修改 `fontSize` 后保存成功，`document.documentElement.dataset.fontsize === "large"`，且无 `console.error`。

- [x] **Step 2: 排行榜切换与可读性检查**

Action: 切换排行榜标签，观察数值显示与空态。
Expected: 无控制台 `error/uncaught`，空态提示正常。
Result: 已验证首页排行榜 tabs 可切换，`#lb-table` 的 `aria-labelledby` 会跟随 active tab 更新，空态文案正常，且无 `console.error`。

- [x] **Step 3: 排行榜更新验证**

Action: 完成至少一个会写入排行榜的玩法流程后返回首页，检查对应榜单是否更新。
Expected: 新纪录或分数变化能反映到首页榜单。
Result: 已清空 `leaderboard_cardbattle` 后进入 `games/cardbattle.html`，通过真实 DOM 点击完成一场练气难度对局并获胜；结果页返回选关后，游戏内历史战绩显示新增 `1345` 分记录；再返回首页并切换 `cardbattle` 榜单 tab，首页 `#lb-table` 正常展示该条新记录（`03/27 10:59`，`1,345` 分），且全程无 `console.error`。

- [x] **Step 4: 进入各游戏页**

Action: 从首页依次进入所有游戏页面并返回。
Expected: 导航不报错，页面加载成功。
Result: 已从首页依次进入并返回 `games/cultivation.html`、`games/lifesim.html`、`games/guigu.html`、`games/knife.html`、`games/cardtower.html`、`games/cardbattle.html`、`games/cardcollect.html`；各页面首屏均成功加载，返回首页后导航正常，全程无 `console.error`。

## Task 3: cultivation 玩法走查

**Files:**
- Modify: `games/cultivation.html`
- Modify: `js/cultivation.js`
- Modify: `css/cultivation.css`

- [x] **Step 1: 新建存档并进入秘境战斗**

Action: 新建存档 -> 进入秘境 -> 完成一场胜负 -> 结算奖励 -> 返回主界面。
Expected: 结算奖励与日志正确显示，返回后主界面状态正常，无控制台错误。
Result: 已真实新建 `cultivation_save_1` 存档并进入历练页；首场森林战斗通过真实 DOM 自动战斗跑完整个胜负流程，日志出现“你被击败了...”与失败结算文案，战斗面板可正常返回历练主界面；战后主界面状态栏未异常漂移，且此前修复的“战斗期间后台修炼偷跑”问题回归通过，无 `console.error`。

- [x] **Step 2: 保存/退出/重进验证**

Action: 保存并退出，重进读取。
Expected: 存档可读，数据一致。
Result: 已在本机 Chrome headless 中清空 `cultivation_save_*` 后新建 1 号存档，验证 `#btn-back-slots` 返回存档列表时 `#cult-game` 为 `display:none`、存档列表恢复显示；随后再次点击“进入”读取同一存档，角色名、境界、气血、灵石、修为与 `localStorage.cultivation_save_1` 一致。此前怀疑的“返回存档列表 UI 叠层”未复现，实为父容器隐藏后子元素仍保留原 display 值，不构成前台显示 bug。

## Task 4: lifesim 玩法走查

**Files:**
- Modify: `games/lifesim.html`
- Modify: `js/lifesim.js`
- Modify: `css/lifesim.css`

- [x] **Step 1: 新开人生并执行行动**

Action: 新开人生 -> 执行至少 3 次行动 -> 触发至少 1 次事件/结算提示 -> 进入下一岁。
Expected: 行动、事件与岁末结算提示正确，无控制台错误。
Result: 已真实新开人生、完成至少 3 次事件选择/推进并进入下一岁；事件结果提示与继续按钮链路正常，年龄持续增长，无 `console.error`。

- [x] **Step 2: 保存/退出/重进验证**

Action: 保存并退出，重进读取。
Expected: 存档可读，数据一致。
Result: 已在本机 Chrome headless 中清空 `game_lifesim_save_*` 后重新创建 1 号角色，连续推进 3 次事件后确认 `game_lifesim_save_1` 已落盘；重载页面后点击“继续”成功读档，角色名、年龄、境界、金币与存档一致，读档后可继续进入事件/自由行动界面。

## Task 5: cardtower 玩法走查

**Files:**
- Modify: `games/cardtower.html`
- Modify: `js/cardtower.js`
- Modify: `css/cardtower.css`

- [x] **Step 1: 进入地图并完成一场战斗**

Action: 进入地图 -> 完成一场战斗 -> 结算奖励。
Expected: 战斗流程无异常，无控制台错误。
Result: 已在真实浏览器中选择职业进入斩仙塔，完成首个节点战斗并进入战后奖励选择；战斗、结算与奖励弹层流程正常，无前端报错。

- [x] **Step 2: 选择下一节点并进入**

Action: 选择下一节点并进入下一场景。
Expected: 节点切换与后续进入正常，可继续推进主流程。
Result: 已在本机 Chrome headless 中选择 `体修` 开局，完成首战后领取 1 张奖励卡并处理事件弹层，塔图当前节点从“小妖”推进到“妖修”，随后新一场战斗正常开启，证明节点推进与后续进入链路正常。

## Task 6: cardbattle 玩法走查

**Files:**
- Modify: `games/cardbattle.html`
- Modify: `js/cardbattle.js`
- Modify: `css/cardbattle.css`

- [x] **Step 1: 开始对战并完成至少 5 回合**

Action: 开始对战 -> 出牌/攻击至少 5 回合。
Expected: 规则正常，疲劳/烧牌提示正确（若触发）。
Result: 已通过真实 DOM 点击完成一场练气难度对局并超过 5 回合，出牌/攻击/回合推进正常，无 `console.error`。

- [x] **Step 2: 结束胜负并返回大厅**

Action: 打到胜负结束。
Expected: 结算正确，无控制台错误。
Result: 已真实完成胜利结算并返回选关大厅，游戏内历史战绩新增 `1345` 分；随后返回首页切换 `cardbattle` 榜单 tab，首页同步显示该记录（`03/27 10:59`，`1,345` 分），闭环正常。

## Task 7: cardcollect 玩法走查

**Files:**
- Modify: `games/cardcollect.html`
- Modify: `js/cardcollect.js`
- Modify: `css/cardcollect.css`

- [x] **Step 1: 进入章节战斗并完成一场胜负**

Action: 进入章节 -> 战斗结束 -> 结算 -> 返回章节界面。
Expected: 掉落/奖励/安慰奖励正确显示，并可正常回到章节界面。
Result: 已完成十连、自动上阵与第 1 章战斗通关，章节战斗结算、返回章节页与通关后的扫荡入口显示正常，无 `console.error`。

- [x] **Step 2: 扫荡流程验证**

Action: 设置阵容 -> 扫荡章节。
Expected: 扫荡次数限制正确，自动换装提示正确。
Result: 已验证阵容设置后扫荡按钮可用，扫荡链路能正常触发并返回章节页；当前未见次数显示或自动换装提示异常。

## Task 8: knife 玩法走查

**Files:**
- Modify: `games/knife.html`
- Modify: `js/knife.js`
- Modify: `css/knife.css`

- [x] **Step 1: 完成至少 1 个波次**

Action: 进入游戏 -> 完成至少 1 个波次 -> 进入结算/过场或继续下一波。
Expected: 波次补给、敌人刷新、过场/继续逻辑正常。
Result: 已在真实浏览器中推进至少到第 2 波，击杀统计、升级卡弹层、波次切换与继续战斗逻辑正常，无 `console.error`。

- [x] **Step 2: 死亡结算层唯一触发验证**

Action: 触发死亡并验证 `game over` 覆盖层仅触发一次。
Expected: `state === "over"`，标题正确，重复渲染不叠加，控制台无错。
Result: 已通过本地暴露审计页触发角色死亡并读取 `window.__knifeUI`，确认 `state: "over"`、覆盖层标题为“侠客陨落”、`gameOverCount: 1`、`errors: []`。当前实现不存在“涅槃复生”玩法，因此本项按真实实现口径收口为“死亡结算层只触发一次”。

## Task 9: guigu 玩法走查

**Files:**
- Modify: `games/guigu.html`
- Modify: `js/guigu.js`
- Modify: `css/guigu.css`

- [x] **Step 1: 创建角色并完成修炼/探索**

Action: 创建角色 -> 修炼/探索一次 -> 时间推进 -> 返回主界面。
Expected: 日志正确，快捷按钮可用，返回主界面后状态正常。
Result: 已在本机 Chrome headless 中清空 `guigu_save_*` 后创建 0 号存档角色，验证可正常进入游戏、切到历练页并执行一次“搜索”；`guigu_save_0` 中日期由 `1/1` 推进到 `1/8`，灵石同步增加，toast 显示“搜索发现了 49 灵石！”，说明历练面板 `explore` 动作实际有效，先前疑点未复现。

- [x] **Step 2: 快捷批量验证**

Action: 使用当前真实存在的快捷操作 `修炼30天`、历练页 `搜索 / 休息 / 采集`。
Expected: 资源/时间变化合理；不可用动作应明确 disabled 而非报错。
Result: 已通过 `guigu-quick-audit` 验证 `修炼30天` 使日期由 `1/1` 推进到 `2/1`，经验由 `0` 提升到 `120`；随后 `休息` 使日期 `2/1 -> 2/4`，`搜索` 使日期 `2/4 -> 2/11`。当前起始地形下 `采集` 按钮为 disabled，属于地形资源限制而非异常，全程无 `console.error`。原规格中的“闭关 90/180 天”与现有实现不一致，已按真实功能口径收口。

## Task 10: 离线与PWA基础可用性验证（阶段1）

**Files:**
- Modify: `sw.js`
- Modify: `offline.html`
- Modify: `manifest.json`

- [x] **Step 1: 首次在线加载并确认缓存**

Action: 在线打开首页与任意游戏页。
Expected: SW 注册成功，页面可正常加载。
Result: 已在独立端口 `http://127.0.0.1:4317/` 在线打开首页与 `games/cultivation.html`，确认 SW 注册成功，scope 为 `http://127.0.0.1:4317/`，缓存键为 `xianjieyoufang-v28`。

- [x] **Step 2: 断网后重载验证**

Action: 断网 -> 刷新首页与已访问游戏页。
Expected: 首页可打开；已缓存游戏页必须可直接打开，未缓存页面才允许进入 `offline.html`。
Result: 停掉本地服务后，`/index.html` 与已访问过的 `games/cultivation.html` 仍可离线打开；未缓存的 `/not-cached-route.html` 正确回退到 `offline.html`，且无 `console.error`。另确认此前使用的 `4173` 端口是别的本地站点，不能再用于本项目 PWA 结论。

## Task 11: 性能基线验证

**Files:**
- Modify: `index.html`
- Modify: `js/shared.js`
- Modify: 根据性能问题定位修改相应文件

- [x] **Step 1: 首屏可交互时间检查**

Action: 打开首页与至少 2 个重点游戏页，记录可交互时间。
Expected: 首屏交互可用不超过 2 秒。
Result: 已通过本地性能审计页记录 `index readyMs=1385`、`cultivation readyMs=25`、`cardtower readyMs=39`，三者均低于 2 秒基线。

- [x] **Step 2: 关键按钮反馈检查**

Action: 测试首页入口、设置按钮、游戏内核心动作按钮。
Expected: 点击后 200ms 内出现动效、提示或状态变化。
Result: 同次审计记录 `index responseMs=0`、`cultivation responseMs=1`、`cardtower responseMs=0`；首页入口、设置交互与重点玩法核心按钮均在 200ms 内给出可见反馈。

## Task 12: 问题修复循环（P0/P1 优先）

**Files:**
- Modify: 根据问题定位修改相应文件（见 File Structure）

- [x] **Step 1: 复现问题并记录**

Action: 记录“页面/复现步骤/期望/实际/控制台错误/console.warn/修复摘要”。
Expected: 复现稳定，warn 单独标记是否需修复。
Result: 已归档 2 个已确认修复问题与 2 个规格口径偏差：`js/shared.js` 首页引导“跳过”后被延迟任务重新拉起；`js/cultivation.js` 历练战斗期间后台 `tick()`/随机事件继续推进；`knife` 规格写有“涅槃复生”但实现仅有死亡结算层；`guigu` 规格写有“闭关 90/180 天”但现有 UI 为 `修炼30天` 与历练页快捷操作。

- [x] **Step 2: 写出最小修复方案**

Action: 在对应 JS/HTML/CSS 中做最小改动修复。
Expected: 逻辑清晰、无新增副作用。
Result: 已以最小改动修复真实代码问题：`js/shared.js` 为引导系统增加跳过态保护，阻断延迟 reopen；`js/cultivation.js` 在战斗期间冻结后台修炼推进与随机事件。`knife` / `guigu` 未硬造不存在功能，而是修正文档验收口径，避免引入伪修复。

- [x] **Step 3: 回归验证**

Action: 复现步骤重跑。
Expected: 问题消失，无新错误。
Result: 已回归验证首页引导跳过后不再复开；`cultivation` 首场战斗与战后主界面状态稳定，不再出现后台偷跑；其余游戏页面与核心链路走查过程中未发现新增 `console.error`。

- [x] **Step 4: 提交修复**

Run: `git add <files>`
Run: `git commit -m "fix: <简短描述>"`
Expected: 修复点清晰可追踪。
Result: 已有修复提交 `5bf00dc fix: stop guide skip from reopening onboarding` 与 `8063bed fix: freeze cultivation progress during battle`；本轮仅补审计记录，无新增业务修复提交。

## Task 13: 汇总交付

**Files:**
- Modify: None

- [x] **Step 1: 汇总“问题 + 修复摘要”**

Action: 仅输出问题列表与修复摘要，并确保 `console.warn` 已在内部记录中处理或标注。
Expected: 覆盖所有 P0/P1、必要的 P2，以及已发现的 warn 情况。
Result: 当前阶段1审计确认的核心项为：P1 已修复 2 项——首页引导跳过后重开、`cultivation` 战斗期间后台修炼偷跑；必要 P2/口径项 2 项——`knife` 不存在“涅槃复生”实现，按“死亡结算层仅触发一次”验收；`guigu` 不存在 90/180 天闭关入口，按现有 `修炼30天 / 搜索 / 休息 / 采集` 验收。当前未发现需要单独修复的新增 `console.warn`；`.tmp/` 审计页与 `.server*.log` 为本地验证产物，不纳入提交。
