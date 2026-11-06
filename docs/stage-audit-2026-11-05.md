# 当前阶段独立审查与实际验证

> 后续状态：本报告保留审查时发现的问题；P2随后已按systematic-debugging复现、修复并完成回归，见[修复证据](p2-audio-fix.md)。

日期：2026-11-05（Asia/Tokyo）。范围：S0—S4本地最小闭环，加上用户确认的5项/10段人工听审音频、手机大例句按钮和只读重听。

**结论：发现1项P2媒体失败恢复问题，没有发现P0/P1问题。现有自动检查全部通过，但不能据此宣称完整每日学习系统、云端或iPhone真机验收通过。建议修复P2后再扩大词库。** 本轮仅审查与验证，没有修改产品源码、修复问题、扩充词库或部署。

## 独立性与依据

按照Superpowers requesting-code-review，使用全新上下文的独立审查代理读取规格、最新阶段计划、源码和测试；审查者没有参与本轮实现，没有写文件或运行会覆盖产物的测试。主代理另运行实际命令、对审查发现做真实浏览器故障注入复现，并汇总结果。

无Git仓库，无法提供BASE/HEAD提交范围；审查当前文件快照，见[文件哈希](../artifacts/verification/stage-audit/review-snapshot.json)。不接受系统Xcode协议、不构造虚假提交。用户的5173开发预览保留；现有E2E使用5174，本轮额外构建预览使用5175并已停止。测试浏览器与数据库均隔离。

依据：[最新执行与验收计划](superpowers/plans/2026-11-05-eju-review-execution-order.md)、[规格及用户后续确认](superpowers/specs/2026-11-05-eju-ai-first-design.md)、[重听增量范围](relisten-update.md)。

## 按严重程度的问题

### P0 / P1

本次审查范围内未发现。此结论不是安全认证，也不覆盖尚未实现的云服务。

### P2：音频报错后的重试尚未成功，评分已被重新启用

位置：[StudyCard.tsx:9](../src/learning/StudyCard.tsx#L9)、[媒体错误处理](../src/learning/StudyCard.tsx#L13)、[评分按钮](../src/learning/StudyCard.tsx#L18)。

触发顺序：

1. 词语首次成功开始播放，`heard=true`。
2. 媒体发生error；错误提示出现，评分按钮禁用。
3. 用户点击重试；`play()`先清空`audioError`，但保留旧`heard`。
4. 新音频请求仍未返回、`readyState=0`、`currentTime=0`时，评分已启用，点击后可以保存新评价。

独立审查者先对实际组件进行内存媒体时序复现；主代理随后在生产构建的Chromium和WebKit中复现，均成功保存了评价。浏览器复现使用**主动派发媒体错误事件+挂起重试HTTP响应**，不声称已复现真实iPhone流式网络中断。证据：[复现日志](../artifacts/verification/stage-audit/media-retry.log)、[可重复运行的探针](../artifacts/verification/stage-audit/media-retry-probe.mjs)。

建议：词语播放失败时撤销可评分状态，重试成功后再启用；例句失败不要改写已经保存的评价。增加“已开始→error→重试pending/reject→仍禁用→成功后启用”的回归测试。正常开始播放即可自评不属于问题，不要求必须听到`ended`。

**状态：已复现，未修复。** 现有测试缺少这个组合，所以23项浏览器测试通过没有排除该问题。

### P3 / 测试改进

没有另外确认的P3产品缺陷。以下属于验证缺口，不包装为已经发生的数据损坏：

- 退出重听测试只断言音频元素卸载，未保留引用断言其`paused`；真正后台/返回音频行为仍待验证。
- 现有失败测试主要覆盖创建事务时报错；本轮已额外在fake-indexeddb验证“put已排队后abort仍保留旧快照”，通过。该探针尚未纳入长期测试套件，也没有模拟Safari硬盘空间耗尽。
- 快速词语重播已额外验证；所有词语/例句切换时序、蓝牙/电话/锁屏等硬件中断没有穷尽。

## 五项重点逐项结论

| 重点 | 当前实现及观察 | 判定 |
|---|---|---|
| 每日新词与复习顺序 | 按内容数组固定遍历5项；没有每日额度、到期→新词→短间隔队列、Again三次延后、FSRS或东京日期分日规则 | S6未实现；不符合完整设计的该项能力，但不是已授权S0—S4的遗漏回归 |
| 听懂/没听懂与复习日期保存 | good/again、原始ISO事件时间、稳定ID、更正关系、当前位置写入同一IndexedDB事务；重试去重、双标签冲突、恢复、只读重听测试通过。没有due/下一次复习日期字段 | 已验收原始评价保存；复习日期未实现，occurredAt不能当作due |
| 音频缺失、断网、重复点击、刷新 | 词语/例句404恢复、加载后断网保存、在线刷新恢复、快速重播、双击和记录去重通过；P2的媒体错误后pending重试例外。完全断网刷新无法加载页面 | 本地数据保护有实测；不具备S8离线外壳和缓存能力 |
| 手机及Safari | 390px宽Chromium/WebKit实际播放与触摸测试通过，例句按钮实测308×57.1875px，无横向溢出；查看了构建页面截图 | 引擎/视口模拟通过；实际iPhone、Safari硬件后台行为未验收 |
| PIN与云端访问 | server目录无实现，无PIN登录、会话、Firestore或个人进度HTTP接口；运行时请求仅本地同源内容/音频。开发服务默认127.0.0.1；同一浏览器用户可直接查看本机记录 | 没有发现已存在的匿名云端记录接口；目前也没有PIN保护。S7/S8未实施，不能宣称云端鉴权安全通过 |

PIN后续需验证服务端会话、401/409、固定owner以及跨浏览器恢复；这些目前无服务可测。当前边界是本机浏览器和系统账户，不是应用级身份验证。本轮只观察了测试路径的网络请求，没有进行完整依赖漏洞审计、浏览器扩展审计或渗透测试。

## 本轮实际运行结果

| 命令/检查 | 结果 | 证据 |
|---|---|---|
| npm test | 23/23通过（13保存逻辑+10内容校验） | [unit.log](../artifacts/verification/stage-audit/unit.log) |
| npm run test:e2e | 23通过，1明确跳过，0失败 | [browser.log](../artifacts/verification/stage-audit/browser.log) |
| npm run typecheck | 退出0 | [typecheck.log](../artifacts/verification/stage-audit/typecheck.log) |
| npm run build | 退出0，20模块 | [build.log](../artifacts/verification/stage-audit/build.log) |
| npm run check:content | 5项/10段；267,992字节；哈希、解码和人工记录对应通过；三份原笔记未变 | [content.log](../artifacts/verification/stage-audit/content.log) |
| 生产构建浏览器补查 | Chromium/WebKit均通过：断网保存、断网例句恢复、404恢复、快速重播、在线恢复保留记录；两引擎断网刷新均失败，记录联网后仍在 | [probes.log](../artifacts/verification/stage-audit/probes.log) |
| put后事务abort | Promise拒绝，旧good评价与游标未变；fake-indexeddb模拟 | [transaction-abort.log](../artifacts/verification/stage-audit/transaction-abort.log) |
| P2定向复现 | 两引擎均复现；探针执行退出0表示成功复现问题，不代表该功能通过 | [media-retry.log](../artifacts/verification/stage-audit/media-retry.log) |

1项跳过：Chromium专用持久浏览器关闭重启场景在WebKit项目中跳过；Chromium本轮实际通过，WebKit刷新恢复已通过。保留了既有NO_COLOR/FORCE_COLOR环境警告，不是测试失败。没有项目lint脚本，未声称执行lint。

当前工具版本沿用项目锁文件；测试为桌面上运行的Chromium/WebKit，不是真机Safari。[生产WebKit截图](../artifacts/verification/stage-audit/production-webkit.png)。

## 未验证或未实现

- S6每日额度、复习优先级、日期与时区计算、FSRS迁移：未实现、未执行相应测试。
- 真机iPhone首次播放、锁屏、后台切换/恢复、蓝牙与主屏幕启动：NOT_RUN。
- S7/S8 PIN鉴权、云端持久化、权限隔离、网络同步与离线缓存：未实现。
- 用户人工听审10段的确认有效；本轮不重复判定发音、不声称独立AI听审已运行，文本全面权威核查仍未执行。
- 本次只是本地审查，未核查部署成本、远端账号或公网访问状态，未部署。

建议下一步先以TDD修复P2媒体状态问题，再继续原定阶段；每日规则和PIN/云端分别按S6、S7验收，不能以本次绿色测试代替。
