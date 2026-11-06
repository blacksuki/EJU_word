# 学习单元列表与正式界面实施计划

> 使用 superpowers:executing-plans；业务交互先测试，视觉调整结合真实浏览器截图；最后独立审查。

**Goal:** 学生可直接选单元，界面只呈现学习所需信息，配色参考 EJU 官方页面。
**Architecture:** 保留 App 单元与进度映射，StudySession 增加 onSelectUnit(id:string)，原生 select 使用现有 busy/pending 保护。CSS 与文案更新不改变内容/音频/存储。
**Tech Stack:** 现有 React、TypeScript、Playwright；不新增依赖。
**Spec:** ../specs/2026-11-06-release-ui-design.md

## Global Constraints
- 不部署、不调用收费 API、不改审核文件及原笔记，不迁移或清除记录。
- 继续在用户指定目录完成；沿用已知无可用 Git 的现状，以文件备份和执行日志记录，不接受 Xcode 协议。
- 当前用户已明确授权三项改进，沿用既有设计直接实施；不另设批准流程。

## Review Focus
- 切换中旧音频是否停止，未评分项是否错误沿用上一单元听过状态。
- 保存中和失败后是否能离开造成反馈丢失。
- 新用户没有旧记录时是否仍被历史入口干扰，旧用户能否继续访问。
- 手机窄屏、长标题、下拉框和例句按钮是否溢出或难点。
- 文案是否把本地保存误称云端、是否残留内部听审信息。

### Task 1：选择与恢复
Files: src/app/App.tsx、src/learning/StudySession.tsx、tests/e2e/unit-learning.spec.ts。
- [x] 先写单元下拉切换/返回恢复/刷新/旧音频停止及保存失败禁用测试，运行 Chromium 确认缺少下拉框而失败。
- [x] 增加受保护的单元选择；将首页直接呈现单元列表，已有学习顺序保持。
- [x] 运行相关浏览器测试，Expected: 通过。

### Task 2：正式界面与配色
Files: src/app/App.tsx、src/app/styles.css、index.html、README.md。
- [x] 移除内部提示，压缩首页，使用官网参考配色；保留本地保存与有旧记录时的入口。
- [x] Chromium/WebKit 验证手机布局、直接选单元、播放和恢复；桌面/窄屏截图实际查看。

### Task 3：回归与报告
- [x] npm test、npm run typecheck、npm run build、npm run test:e2e、npm run check:content，以及原50项公开包完整性检查，Expected: 全部成功，既有 WebKit 跨进程检查仍明确跳过。
- [x] 独立审查，记录实际问题与验证限制；更新 README 和交付报告。

## 执行记录
- 初始快照保存于 artifacts/verification/release-ui/；未更改内容包及生成资料。

- Task 1 选择器：2 个 Chromium 用例先因缺少选择器失败（red.log），实现后 2/2 通过（selection-green.log）；验证直接切换、旧音频停止、独立记录、刷新与失败重试保护。

- Task 2 布局：Chromium/WebKit 的 320/390/1280 宽度检查通过（layout-green.log）。截图发现 WebKit 原生外观忽略 min-height，仅 23px；layout-red.log 复现后设置 appearance:none 和 height:52px，原生选择行为仍保留。
- 首次文案写入脚本因嵌套模板引号失败，未写入 App；改用原样文本文件完成，最终页面重新跑 14 项单元用例通过。

- Final review: 独立 reviewer 发现 1 项原有 P2：品牌链接绕过保存保护。实际浏览器复现保存中/失败后点击品牌会导航首页（brand-red.log，两项失败）。学习中品牌改为静态标识，返回统一使用已有受保护按钮，不增加状态同步或新弹窗。
- Final: Ruling: 关闭浏览器/强制刷新不扩展为全局离开确认；本轮处理应用内导航。用户强制离开仍可能丢失未确认反馈，不影响已成功保存记录。
- Final: Ruling: FSRS/云端/PIN/部署仍属后续阶段，不能据“正式界面”推断已实现；审核资料保留内部信息，学生界面隐藏。

- Final: fixed 品牌绕过保存保护 — 两项 Chromium 先失败，Chromium/WebKit 四项回归通过；最终完整浏览器47通过1跳过，单测67通过，类型/构建通过。
- Task 3 complete：正式dist包在Chromium/WebKit各通过播放/保存/刷新/切换；旧5项检查和新50项100音频完整性均通过。最终报告 docs/release-ui-report.md。独立审查没有其他待修复项。
