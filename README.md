# EJU 日语听词

当前默认学习包：**50 项、5 个单元、100 段 Azure 日语音频**。每单元 10 项：听词 → 听懂/没听懂 → 词义和例句 → 本机保存 → 刷新恢复。

## 代码管理

仓库：[blacksuki/EJU_word](https://github.com/blacksuki/EJU_word)。使用 main 分支，SSH 地址为 `git@github.com:blacksuki/EJU_word.git`。提交范围、忽略文件及本机 Git 使用方式见[代码管理说明](docs/version-control.md)。

## 本地运行

环境：Node 22.23.2、npm 10.9.8；固定版本见 package-lock.json。

```sh
cd /Users/huoward/Workspace/EJU/WordTest
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Studio 适配后的默认 `npm run dev` 使用 3000 端口；上面的显式参数用于本地学习，保留原 5173 来源下的记录。打开 http://127.0.0.1:5173 。已有开发服务运行时刷新页面即可；无需删除浏览器记录。

- 首页直接展示 5 个单元的列表，点击任意单元即可学习。“开始/继续学习”推荐首个未完成单元。
- 学习页顶部的“选择学习单元”可随时切换，分别保留各单元进度。保存中或反馈未确认保存时，先重试保存再切换。
- 各单元分别保存进度；刷新学习页会恢复当前单元和卡片。完成后可重听、进入下一单元或返回列表。
- 学习页合并导航、精简说明；常见手机尺寸下，词义、例句和操作按钮一屏显示，极短屏幕或放大文字时可自然滚动。
- 例句使用整行大按钮；重听不重复评分、不清空记录。离开学习卡时停止音频。
- 仅点击播放时请求音频，不进入首页就下载全部 100 段。

## 原 5 项记录

已有原练习记录时，首页底部显示“原5项记录”，可查看和继续原练习，也可访问 http://127.0.0.1:5173/?pack=legacy 。原数据、原内容版本与音频均保留，新组不会覆盖旧记录。即使“分析”同时出现在两个包中，也不自动继承原评分。

继续使用同一浏览器和地址；域名、端口或浏览器不同不会共享记录。隐私窗口关闭、清除网站数据或浏览器回收存储可能移除本地记录；尚无云端备份。

## 开发检查

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run check:content
```

`check:content` 只检查旧 5 项/10 段及只读原笔记；新 50 项的审核、映射和实际文件摘要另有[接入验证报告](docs/learning-50-report.md)。浏览器测试使用独立 5174 端口和隔离数据，不删除个人记录、不占用日常预览的 5173；可用 EJU_TEST_PORT 指定测试端口。WebKit 手机尺寸测试不代表 iPhone 实机。

## 内容和音频

- [50 项词库、分类与编排](docs/content-pilot-50.md)
- [50 项试听索引](artifacts/audio/eju-50-v1/试听索引.md)
- [用户人工听审记录](content/reviews/eju-50-human-listening-2026-11-06.json)
- [50 项生成验证报告](docs/azure-50-report.md)

`npm run content:audio:50` 预览 50 项音频任务；`npm run content:audio` 默认仍为 20 项。两者默认不合成。真实生成方式与预算见上述内容说明，凭据不进入网页。

`npm run content:export` 从审核通过的源文件导出当前 50 项静态包，校验文本、听审绑定、真实音频哈希和解码后，最后更新本地 current 指针；不联网、不部署。同版本内容不可静默覆盖，内容变更应使用新版本并重新审核。

目前没有每日新词配额、复习日期调度、分类筛选界面、云端/PIN 或考试功能。现有站点由用户发布在 https://eju-tango.ai.studio/ 。本次一屏布局和明亮配色更新仅在本地完成，尚未发布至该站点。

## 实施与证据

- [学习页一屏布局与配色验证](docs/compact-learning-report.md)

- [单元选择与正式界面更新](docs/release-ui-report.md)

- [50 项学习页面接入报告](docs/learning-50-report.md)
- [本阶段实施计划](docs/superpowers/plans/2026-11-06-eju-50-learning-integration.md)
- [P2 音频重试修复](docs/p2-audio-fix.md)
- [第一阶段报告](docs/phase1-report.md)
- [环境和版本依据](docs/environment.md)
- [需求规格与历史规划](docs/superpowers/specs/2026-11-05-eju-ai-first-design.md)

根目录三份 EJU日语*.pages 为只读原始笔记。原始词库、审核和生成证据在 content 与 artifacts；网页静态内容和音频在 public。Git 管理不包含原笔记及 artifacts 中的本机资料；没有代为接受 Xcode 协议；本轮未执行部署。
