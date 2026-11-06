# 50 项接入学习页面实施计划

> **For agentic workers:** Use superpowers:executing-plans；业务规则使用 test-driven-development，完成后独立审查。

**Goal:** 将用户已听审的50项/100段接入本地学习页面，按5个10项单元学习并保留旧5项记录。
**Architecture:** 审核绑定校验后导出 public/content/eju-50-v1.json 和哈希音频；current.json 指向新版本。沿用 IndexedDB 数据库，在不同键保存新单元进度，原 current 键与原内容文件不迁移、不覆盖。复用播放器和保存闭环。
**Tech Stack:** 当前 React、TypeScript、Vitest、Playwright、IndexedDB；不增加依赖。
**Spec:** ../specs/2026-11-05-eju-ai-first-design.md；本次用户明确授权接入已听审内容。

## Global Constraints
- 不部署、不调用语音API、不加云端、每日配额、复习日期或考试功能。
- 人工听审只标 human_accepted，不声称AI听审或iPhone真机通过。
- 原 eju-wordtest-phase1 / progress / current 原样保留；旧5项仍可访问。新评分不混入旧记录。
- 新组使用 content:eju-50-v1:u01…u05 键，单元内可继续、完成与重听；重听不改变评分。
- 单元入口按已确认顺序展示，推荐首个未完成单元；学习时通过URL unit参数保留当前选择，刷新恢复该单元，不自动跳组。
- 保持例句大按钮、音频失败不放行评分、保存失败不假显示成功。

## Review Focus
1. 审核文本/音频哈希失效：导出拒绝，既有已用包不被覆盖。
2. 单元重复/遗漏/乱序引用：内容解析拒绝，不能悄悄丢词。
3. 旧记录或其他单元被新写入覆盖：以真实IndexedDB测试隔离键与同库并发。
4. 单元完成/切换/刷新/重听：真实浏览器验证边界、记录数和播放器停止。
5. 大量词条导致手机溢出/请求全部音频：只渲染当前卡，音频按点击加载；模拟不冒充实机。

### Task 1：受审核约束的静态导出
Files: scripts/content/export-reviewed.ts、src/domain/contracts.ts、src/content/loader.ts、tests/content/loader.test.ts、tests/content/export-reviewed.test.ts。
- [x] 先写并观察审核失效、引用错位、无效单元及指针加载失败测试。
- [x] 校验文本审核、用户听审摘要、实际文件sha；导出必要内容和100段静态音频，最后写current指针。
- [x] 运行测试及导出检查，确认50项5单元100音频，旧development.json不变。

### Task 2：单元进度隔离
Files: src/sync/storage.ts、tests/sync/local-progress.test.ts。
- [x] 写同库旧键/两个新单元互不覆盖、重开恢复、同单元冲突仍受保护的失败测试。
- [x] 为存储器添加可选progressKey（默认current），复用原事务，不改变schema。
- [x] 运行全套单测与类型检查。

### Task 3：单元首页与学习闭环
Files: src/app/App.tsx、src/learning/StudySession.tsx、src/app/styles.css、tests/e2e/unit-learning.spec.ts。
- [x] 新首页显示50项/5单元、各组进度及旧5项入口；复用原卡片，每组10项。
- [x] 完成后可重听本单元、进入下一单元或返回列表；切换和离开时停止音频。
- [x] 原浏览器套件明确在旧包入口运行；新套件用真正导出的音频测试保存、刷新、完成、跨组、旧记录兼容和手机点击。

### Task 4：独立审查与交付
- [x] 独立审查审核门槛、记录隔离与跨组逻辑；修复问题。
- [x] npm test、typecheck、build、check:content、全部浏览器检查；检查手机截图。
- [x] README与报告说明新入口、原记录保留方式、实际验证及限制。

## 裁定
- 现有旧记录绑定内容版本，强行覆盖会引发冲突或错误迁移。选择保留旧组，并独立保存5个新单元，而不是把原“分析”评分自动认作新单元进度。
- 用户已授权接入，沿用已确认设计及审核结果直接实施，不再次请求设计批准。
- 原目录没有可用Git工作流，本次在用户指定目录实现，不接受Xcode协议、不初始化或提交Git。

## 执行结果
- 四个任务完成：66单测、类型和构建通过；浏览器39通过1跳过。
- 50项/100音频已默认接入；旧记录独立保留，真实浏览器已验证继续访问及不被新组覆盖。
- 独立审查无阻断问题；新50项另行校验公开与构建文件哈希，不将旧check:content命令冒称覆盖新包。
- 仅展示层过滤内部编辑说明，不修改已审核内容或音频；未新增API调用或部署。
