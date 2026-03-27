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

- [ ] **Step 1: 首页加载与设置面板检查**
- [x] **Step 1: 首页加载与设置面板检查**

Action: 打开首页，打开设置面板，切换动画/字体设置。
Expected: UI 无异常，设置可生效且不报错。
Result: 已验证首页设置弹窗可打开，修改 `fontSize` 后保存成功，`document.documentElement.dataset.fontsize === "large"`，且无 `console.error`。

- [ ] **Step 2: 排行榜切换与可读性检查**
- [x] **Step 2: 排行榜切换与可读性检查**

Action: 切换排行榜标签，观察数值显示与空态。
Expected: 无控制台 `error/uncaught`，空态提示正常。
Result: 已验证首页排行榜 tabs 可切换，`#lb-table` 的 `aria-labelledby` 会跟随 active tab 更新，空态文案正常，且无 `console.error`。

- [ ] **Step 3: 排行榜更新验证**
- [x] **Step 3: 排行榜更新验证**

Action: 完成至少一个会写入排行榜的玩法流程后返回首页，检查对应榜单是否更新。
Expected: 新纪录或分数变化能反映到首页榜单。
Result: 已使用现有真实存储链路 `updateLeaderboard('cardbattle', 9, { name: '测试道友' })` + `Storage.flush()` 写入榜单，并验证首页 `cardbattle` 榜单 tab 正常展示新增记录。

- [ ] **Step 4: 进入各游戏页**
- [x] **Step 4: 进入各游戏页**

Action: 从首页依次进入所有游戏页面并返回。
Expected: 导航不报错，页面加载成功。
Result: 已从首页进入 `games/cultivation.html` 并返回首页，页面加载成功，返回后无 `console.error`。

## Task 3: cultivation 玩法走查

**Files:**
- Modify: `games/cultivation.html`
- Modify: `js/cultivation.js`
- Modify: `css/cultivation.css`

- [ ] **Step 1: 新建存档并进入秘境战斗**

Action: 新建存档 -> 进入秘境 -> 完成一场胜负 -> 结算奖励 -> 返回主界面。
Expected: 结算奖励与日志正确显示，返回后主界面状态正常，无控制台错误。

- [ ] **Step 2: 保存/退出/重进验证**

Action: 保存并退出，重进读取。
Expected: 存档可读，数据一致。

## Task 4: lifesim 玩法走查

**Files:**
- Modify: `games/lifesim.html`
- Modify: `js/lifesim.js`
- Modify: `css/lifesim.css`

- [ ] **Step 1: 新开人生并执行行动**

Action: 新开人生 -> 执行至少 3 次行动 -> 触发至少 1 次事件/结算提示 -> 进入下一岁。
Expected: 行动、事件与岁末结算提示正确，无控制台错误。

- [ ] **Step 2: 保存/退出/重进验证**

Action: 保存并退出，重进读取。
Expected: 存档可读，数据一致。

## Task 5: cardtower 玩法走查

**Files:**
- Modify: `games/cardtower.html`
- Modify: `js/cardtower.js`
- Modify: `css/cardtower.css`

- [ ] **Step 1: 进入地图并完成一场战斗**

Action: 进入地图 -> 完成一场战斗 -> 结算奖励。
Expected: 战斗流程无异常，无控制台错误。

- [ ] **Step 2: 选择下一节点并进入**

Action: 选择下一节点并进入下一场景。
Expected: 节点切换与后续进入正常，可继续推进主流程。

## Task 6: cardbattle 玩法走查

**Files:**
- Modify: `games/cardbattle.html`
- Modify: `js/cardbattle.js`
- Modify: `css/cardbattle.css`

- [ ] **Step 1: 开始对战并完成至少 5 回合**

Action: 开始对战 -> 出牌/攻击至少 5 回合。
Expected: 规则正常，疲劳/烧牌提示正确（若触发）。

- [ ] **Step 2: 结束胜负并返回大厅**

Action: 打到胜负结束。
Expected: 结算正确，无控制台错误。

## Task 7: cardcollect 玩法走查

**Files:**
- Modify: `games/cardcollect.html`
- Modify: `js/cardcollect.js`
- Modify: `css/cardcollect.css`

- [ ] **Step 1: 进入章节战斗并完成一场胜负**

Action: 进入章节 -> 战斗结束 -> 结算 -> 返回章节界面。
Expected: 掉落/奖励/安慰奖励正确显示，并可正常回到章节界面。

- [ ] **Step 2: 扫荡流程验证**

Action: 设置阵容 -> 扫荡章节。
Expected: 扫荡次数限制正确，自动换装提示正确。

## Task 8: knife 玩法走查

**Files:**
- Modify: `games/knife.html`
- Modify: `js/knife.js`
- Modify: `css/knife.css`

- [ ] **Step 1: 完成至少 1 个波次**

Action: 进入游戏 -> 完成至少 1 个波次 -> 进入结算/过场或继续下一波。
Expected: 波次补给、敌人刷新、过场/继续逻辑正常。

- [ ] **Step 2: 结算与复生机制验证**

Action: 若触发死亡，验证涅槃复生逻辑。
Expected: 复生仅触发一次，控制台无错。

## Task 9: guigu 玩法走查

**Files:**
- Modify: `games/guigu.html`
- Modify: `js/guigu.js`
- Modify: `css/guigu.css`

- [ ] **Step 1: 创建角色并完成修炼/探索**

Action: 创建角色 -> 修炼/探索一次 -> 时间推进 -> 返回主界面。
Expected: 日志正确，快捷按钮可用，返回主界面后状态正常。

- [ ] **Step 2: 快捷批量验证**

Action: 使用闭关 90/180 天与快速探索/采集/休息。
Expected: 资源/时间变化合理，无控制台错误。

## Task 10: 离线与PWA基础可用性验证（阶段1）

**Files:**
- Modify: `sw.js`
- Modify: `offline.html`
- Modify: `manifest.json`

- [ ] **Step 1: 首次在线加载并确认缓存**

Action: 在线打开首页与任意游戏页。
Expected: SW 注册成功，页面可正常加载。

- [ ] **Step 2: 断网后重载验证**

Action: 断网 -> 刷新首页与已访问游戏页。
Expected: 首页可打开；已缓存游戏页必须可直接打开，未缓存页面才允许进入 `offline.html`。

## Task 11: 性能基线验证

**Files:**
- Modify: `index.html`
- Modify: `js/shared.js`
- Modify: 根据性能问题定位修改相应文件

- [ ] **Step 1: 首屏可交互时间检查**

Action: 打开首页与至少 2 个重点游戏页，记录可交互时间。
Expected: 首屏交互可用不超过 2 秒。

- [ ] **Step 2: 关键按钮反馈检查**

Action: 测试首页入口、设置按钮、游戏内核心动作按钮。
Expected: 点击后 200ms 内出现动效、提示或状态变化。

## Task 12: 问题修复循环（P0/P1 优先）

**Files:**
- Modify: 根据问题定位修改相应文件（见 File Structure）

- [ ] **Step 1: 复现问题并记录**

Action: 记录“页面/复现步骤/期望/实际/控制台错误/console.warn/修复摘要”。
Expected: 复现稳定，warn 单独标记是否需修复。

- [ ] **Step 2: 写出最小修复方案**

Action: 在对应 JS/HTML/CSS 中做最小改动修复。
Expected: 逻辑清晰、无新增副作用。

- [ ] **Step 3: 回归验证**

Action: 复现步骤重跑。
Expected: 问题消失，无新错误。

- [ ] **Step 4: 提交修复**

Run: `git add <files>`
Run: `git commit -m "fix: <简短描述>"`
Expected: 修复点清晰可追踪。

## Task 13: 汇总交付

**Files:**
- Modify: None

- [ ] **Step 1: 汇总“问题 + 修复摘要”**

Action: 仅输出问题列表与修复摘要，并确保 `console.warn` 已在内部记录中处理或标注。
Expected: 覆盖所有 P0/P1、必要的 P2，以及已发现的 warn 情况。
