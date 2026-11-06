# 手机导航实施计划

> 使用 superpowers:executing-plans 按任务执行，业务逻辑先测后写。

**Goal:** 手机左右滑动切词、允许跳过后补学、底部回单元。
**Architecture:** IndexedDB 原子导航独立于评分；现有 schema 不变。StudySession 管理浏览与单元末尾状态，StudyCard 只保留学习内容和评分。纯函数识别横滑；原生 Pointer Events 接入。
**Tech Stack:** 现有 React / TypeScript / IndexedDB / Vitest / Playwright，无新依赖。
**Spec:** ../specs/2026-11-07-mobile-navigation-design.md

## 约束和审查重点

原始资料只读、不改音频。保存失败和并发冲突必须阻止离开或重新读取。未标记不能假完成。已完成重听不得更改记录。纵向滚动、多指、边缘和按钮点击不得误翻页。手机按钮至少44px，例句56px。

- [x] 1. tests/sync/navigation.test.ts：先验证新 navigate(version,current,next,ids) 缺失；src/sync/storage.ts 实现原子移动、首个遗漏恢复、全标记完成、跨单元/旧游标拒绝；跑全部单测。
- [x] 2. tests/learning/swipe.test.ts：先验证方向和短移/斜移/长按拒绝；src/learning/swipe.ts 实现识别，再跑单测。
- [x] 3. tests/e2e/mobile-navigation.spec.ts 先覆盖移动、跳过补学、刷新、音频停止、失败保护、重听只读；修改 StudySession.tsx / StudyCard.tsx / App.tsx / styles.css 接入，逐项回归。
- [x] 4. 既有50项布局测试增加底部按钮与待补学状态；修复实际浏览器发现的问题，完整单测/类型/构建/浏览器验证；独立审查与报告。

验收：单测75通过；完整浏览器66通过2跳过；追加最终导航专项19通过1跳过；类型、构建及生产构建smoke通过。独立审查无阻断项。详见 docs/mobile-navigation-report.md。
