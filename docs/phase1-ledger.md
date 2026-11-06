# SDD ledger — plan: docs/superpowers/plans/2026-11-05-eju-review-execution-order.md

范围：仅S0—S4；S5—S9不执行。使用executing-plans及test-driven-development。

- Ruling: Git被Xcode许可阻断，用户指定WordTest且无已有代码；原位开发，不接受协议、不新建其他目录，提交/worktree检查未执行。风险：本阶段无Git恢复点，以文件和测试证据替代。
- Ruling: 没有OpenAI密钥或音频工具；按已批准计划的开发夹具路径完成S2—S4，使用本机静态日语合成文件且明确标记未听审。风险：不证明正式声音自然标准，S1正式验收仍待接入。
- Pre-flight: S2消费内容ID/音频URL；S3原子保存评价与游标；S4从同一数据库恢复，不能用内存冒充。
- Pre-flight: 评价后先保存当前卡而不是下一卡，避免刷新丢失尚未看的答案；点击下一项才更新游标。这是对旧saveFeedback(nextItemId)的细化，需单独advance接口和测试。
- S0: 完成现场与官方包兼容核查；未安装后续功能依赖。

- S3 storage: 11 tests observed RED then GREEN (artifacts/verification/storage-red.log and storage-green.log). Atomic IDB persistence implemented; no FSRS or cloud state.
- S1: five sourced draft entries and ten static macOS Kyoko development audio fixtures prepared; formal AI audio reviews unavailable, no approved status claimed.
- 用户确认：先完成开发样本闭环，正式音频另行接入；无需继续等待API授权，本阶段无付费调用。
- S2: 6项内容加载测试中5项先RED，随后与保存测试合计17项GREEN；首轮浏览器9通过/1明确跳过，截图已检查。
- Ruling: S2不另建无状态价值的session.ts，也不用组件mock代替实际播放器；当前App/StudyCard配合真实Chromium/WebKit验收。风险：后续增加调度时需提取会话逻辑，本阶段没有该扩展成本。
- Ruling: 评价时保留当前卡，点击下一项才advance；写事务将直接返回已提交快照，避免第二次读失败造成UI/数据库游标失配。风险：后续同步接口须保留这一已确认提交的边界。
- 调试：系统python3同样被Xcode许可阻断，未执行文件生成；改用shell/Node完成，不接受系统许可。
- 独立只读审查：发现跨标签页重复有效评价、advance写成读败后的重试卡住、失败pending复用错误三项Important。无Critical/Minor。新增2项单元与4项跨浏览器场景先复现，随后修复。
- Final: fixed 跨标签页不同eventId重复评价 — 新单元测试RED→GREEN，双标签页浏览器RED→GREEN。
- Final: fixed advance提交后独立读取失败 — 提交快照单元与浏览器故障注入RED→GREEN。
- Final: fixed pending错误复用 — 改选评分与失败更正跨卡场景在两浏览器RED→GREEN。
- S2/S3/S4（用户认可的开发夹具范围）complete: npm test 19/19；npm run test:e2e 17 passed/1明确跳过；npm run build退出0；npm run check:content通过。正式S1未完成。
- Final: 独立审查无Minor；审查后一次修复、以回归证据确认，不进行重复审查。审查暂不判断的音频/后续功能/真机云成本/Git按原范围保持NOT_RUN；文档及CLI已补齐，见phase1-report.md。
- Finish: 已读取finishing-a-development-branch；无Git仓库，不能提供虚构分支选项或提交。用户要求不部署，原位保留全部工作与证据。
