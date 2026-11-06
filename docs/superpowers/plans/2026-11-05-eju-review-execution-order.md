# EJU Minimum Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 先以少量真实音频证明“听音→标记→答案→保存→恢复”可用，再扩展到复习、云端和部署。

**Architecture:** 复用WordTest既有目录与两份计划的合同，先完成浏览器IndexedDB本地闭环，不等待FSRS或云端。后续在同一个storage模块加入同步，不另建第二套持久化服务。内容先5项、后20项与50项，所有真实样本保持同样的AI音频审核门槛。

**Tech Stack:** 现场Node v22.23.2、npm 10.9.8；React/TypeScript/Vite及后续依赖尚未安装。执行时核实所选版本的官方兼容要求、固定锁文件；仅在有兼容性依据时升级运行环境。

**Spec:** [修订后的需求规格](../specs/2026-11-05-eju-ai-first-design.md)。详细模块定义继续使用[应用计划](2026-11-05-eju-learning-app.md)与[内容计划](2026-11-05-eju-content-audio.md)。本文件是最新执行顺序与验收入口；与旧任务顺序冲突时以本文件为准。

## Global Constraints

- 项目根目录固定为 /Users/huoward/Workspace/EJU/WordTest；复用已有目录，不另建eju-trainer。
- 根目录三份Pages只读；每次内容处理前后比对哈希。
- V1不做面向学习者的模拟考试、限时答题、自动评分或分数预测。
- 单元测试、端到端测试、故障注入是开发验证，不是学习者功能，不出现在应用导航中。
- 日常学习不调用在线AI/TTS；真实音频必须通过内容计划规定的技术检查和两次独立AI听审。
- 首个可用里程碑必须包含保存和重开恢复；只展示网页或播放按钮不算闭环完成。
- 开发由AI执行，只有账号、费用及公开发布等必要决策由用户提供。

## Review Focus

1. 测试夹具被误当真实学习样本：S1标来源，音频验收拒绝无真实音频证据的通过结论。
2. 看到答案却实际未保存：S3写入失败测试，保存确认前不得显示“已记录”。
3. 刷新丢进度或双击重复：S3/S4持久化与重开浏览器测试。
4. 模拟器/WebKit通过冒充真实服务或iPhone：V2/V3单列环境和证据。
5. 500MB被误认为零费用、付费生成失控：V4分别计算生成、存储、下载、运行与数据库成本。

---

## 现场审查结果与修订理由

2026-11-05实际只读检查：21个预留目录、三份原始Pages、README/AGENTS/.gitignore及三份设计文档；src/server/scripts/content/public/tests均为0个文件。package.json、任何锁文件、node_modules与.git均不存在。Node v22.23.2，npm 10.9.8。没有实际依赖版本可沿用，不能把计划里的库名当作已安装版本。

| 原计划缺口 | 修订 |
|---|---|
| 固定Node24但没有兼容证据 | 先用现有运行时评估，记录依赖engines和验证结果后再决定升级 |
| A1只验证交互；恢复晚到A4 | 在A1之后新增本地保存与恢复S3/S4，先于A2/A3 |
| A4端到端先于A5组装完整页面 | 将App与loader最小实现提前到S2，A5仅扩展和复用 |
| 音频批量建设可能阻塞闭环 | 先5项已核验真实样本；20/50扩充在闭环以后 |
| 费用、设备与真实云端结果混在综合验收 | 设置V1—V4独立证据单，不以其他测试替代 |
| 请求授权分散 | 将需决策事项合并到本文末尾，等待不阻塞独立开发 |

不安装依赖、不生成音频、不初始化Git、不部署；本次只修订计划。

## 执行顺序与证明

每行是一项可独立验收的小交付。已有C/A任务编号代表原计划对应模块，不要求先执行该模块的全部批量步骤。

| 步骤 | 涉及文件（均相对项目根） | 依赖 | 完成后如何证明可用 |
|---|---|---|---|
| S0 盘点与版本决策 | docs/environment.md；package.json/锁文件仅在实施时创建 | 无 | 记录现有文件、Node/npm、已装/拟选库版本与官方兼容依据；已有文件不被覆盖 |
| S1 五项真实样本 | src/domain/contracts.ts；content/entries.json；content/reviews/；public/content/；public/audio/ | S0、C1合同、相关生成授权 | 5项文本/音频逐项对应，含单词/搭配/活用/句型；每份真实音频有两次听审证据；build --check-only退出0 |
| S2 播放与答案 | src/learning/session.ts、StudyCard.tsx；src/app/App.tsx、main.tsx；src/content/loader.ts；tests/learning/card.test.tsx | S1合同；音频等待时允许明确的开发夹具 | 点击播放→听懂/没听懂→显示对应词义、例句→例句播放；之前不泄露答案；失败播放不产生评价 |
| S3 本地保存 | src/sync/storage.ts；src/learning/local-feedback.ts；tests/sync/local-progress.test.ts；修改App/StudyCard | S2 | 对同一eventId写两次仍只有一条；模拟IndexedDB失败不显示已记录、不跳下一项 |
| S4 重开恢复 | tests/e2e/minimum-loop.spec.ts；playwright.config.ts；修改App/storage | S3、真实S1样本 | 学习两项→关闭页面→以同一浏览器持久配置重开→两项记录仍在、下一项正确；修改评分后仍仅一条有效记录 |
| S5 音频扩样 | C2—C4既定文件；artifacts/verification/audio-samples.md | S4、V1小样通过 | 扩为20再50项；逐项结果、隔离项、调用数与耗时可追溯；不足50不虚报 |
| S6 调度和看词 | A2既定文件；扩展A1组件；修改local-feedback | S4 | 用固定时钟验证Again/Good、东京日期、每日额度；listen/read独立；原本地事件迁移不丢失 |
| S7 云端保存 | A3既定服务文件；src/sync/client.ts、runner.ts | S6、账号授权 | 模拟器事务测试通过；真实云端按V3验证，干净浏览器可读取相同记录 |
| S8 同步与手机完善 | A4/A5既定文件；扩展同一storage/loader/App | S7 | 断网→保存→刷新→联网仅提交一次；401保留数据；409不静默覆盖；V2独立记录 |
| S9 发布候选 | A6既定文件；docs/cost-validation.md；docs/runbook.md | S5—S8 | 自动验证通过、V1—V4分项状态明确、目标资源及费用可审阅；获授权后才部署 |

S1允许先校订和核验5项，不等待85条全部整理；所有源编号最终仍由C1完整核对。这里不降低音频门槛。缺API时S2—S4可用开发夹具验证逻辑，但不得宣称真实声音闭环已完成。

## S0：不重复建设的前置检查

- [ ] 读取根AGENTS.md、目录清单、package/锁文件、Git状态（如有）、Node/npm版本；写docs/environment.md。证明：现场命令输出和文件清单可核对。
- [ ] 为当前任务拟用依赖记录“版本、engines要求、官方来源、是否已安装、复用/新增理由”；只准备本任务需要的依赖。证明：兼容矩阵没有未知项被标成兼容。
- [ ] 若无仓库可在WordTest初始化；若属于已有上级仓库先确认边界，不嵌套初始化。证明：实际Git根目录与计划一致，原Pages哈希不变。
- [ ] 已有package/锁文件时增量编辑；版本或运行时升级必须有兼容检查依据，不机械追新。证明：差异仅含本任务必要项。

## S3/S4：提前持久化的具体合同与测试

**Files:** 新建src/learning/local-feedback.ts、tests/sync/local-progress.test.ts、tests/e2e/minimum-loop.spec.ts；提前建立src/sync/storage.ts、playwright.config.ts；修改App.tsx、StudyCard.tsx。后续A4不得覆盖重建这些文件。

**Interfaces:** 新增 LocalFeedback = {eventId:string;itemId:string;mode:'listen'|'read';rating:'again'|'good';occurredAt:string;contentVersion:string;replacesEventId?:string}；LocalProgress = {schemaVersion:1;contentVersion:string;cursorItemId:string|null;feedback:LocalFeedback[]}；createLocalProgressStore(dbName:string): {read():Promise<LocalProgress|null>;saveFeedback(event:LocalFeedback,nextItemId:string|null):Promise<void>}。此时不伪造FSRS状态或云端revision。

- [ ] 写local-progress.test.ts：await store.saveFeedback(e,next); await store.saveFeedback(e,next); expect((await store.read()).feedback).toHaveLength(1)。新建同dbName实例后应仍读到e；同ID不同载荷抛EVENT_ID_CONFLICT。测试中e/next是固定具名夹具。
- [ ] 运行npm test -- tests/sync/local-progress.test.ts，确认因缺实现/行为不符而FAIL；无法启动测试环境不算红测。
- [ ] 实现同一IndexedDB库内事件写入与游标更新的单事务；只在成功后展示已记录。更正使用独立eventId+replacesEventId保留审计，列表/数量排除被替换评价。写入失败保留当前卡并可重试。
- [ ] 运行同组测试，预期PASS；增加更正、写入失败、最后一项cursor=null三个断言场景。
- [ ] 建立Playwright脚本与minimum-loop.spec.ts，运行npm run test:e2e -- tests/e2e/minimum-loop.spec.ts；必须验证真实持久浏览器上下文关闭重开，不仅内存组件重新渲染。保留逐步截图和事件数量。
- [ ] 将read/saveFeedback接入App启动与评价回调，重复运行上一场景直到PASS。明确显示“已保存到本机”，不得显示已云同步。
- [ ] 仅提交本任务文件，提交信息feat: persist and restore the minimum learning loop；记录结果到artifacts/verification/minimum-loop.md。

S6新增 migrateLocalFeedback(progress:LocalProgress):StudySnapshot 于local-feedback.ts，按时间和原顺序使用A2调度，eventId/itemId/mode/时间不变，每个track的expectedRevision连续递增；测试迁移两次结果一致。S7/S8仅发送未获服务器receipt的原事件，不能重建ID导致重复；迁移在同一个IndexedDB升级事务完成，保留原快照用于失败恢复。云端返回409沿用A4冲突处理，不能静默覆盖。

## 四项单独验收

全部证据至少包含时间、内容版本、实际环境、操作、预期、观察值、PASS/FAIL/NOT_RUN。下列为待执行标准，当前均NOT_RUN。

| 验收 | 方法与明确门槛 | 证据文件 | 不通过的影响 |
|---|---|---|---|
| V1 音频样本 | 首5项、再20/50项；文本和两角色音频对应；全部技术检查及两次直接音频AI评审pass；uncertain隔离 | artifacts/verification/audio-samples.md及逐项reviewId/哈希 | 阻止对应条目正式入库，不阻塞UI测试 |
| V2 iPhone Safari | 记录实际iPhone型号、iOS/Safari版本；检查首次点击播放、重播、例句、切后台返回、关闭重开、主屏幕启动、断网提示；无横向溢出、无丢记录或重复评价 | artifacts/verification/iphone-safari.md，实机操作截图/记录 | 无设备则NOT_RUN；WebKit模拟另列，候选交付注明未真机验证 |
| V3 云端保存 | 用隔离测试profile/数据库真实写2条，重发相同eventId仍2条；在无本地缓存的新浏览器会话登录读取同2条；纠正后一条有效数仍2；401禁止访问 | artifacts/verification/cloud-save.md，实际请求回执与脱敏云端记录 | 仅模拟器通过时只能交付本地版本；不得宣称云端完成 |
| V4 部署成本 | 核查目标账号、项目、区域及实际服务；列单次生成/评审、存储、音频下载、运行、Firestore读写、构建镜像成本；提供官方价格页、核查日期、用量公式、正常/高用量估计 | docs/cost-validation.md | 未核实/未授权不得付费部署；本地开发可继续 |

V3测试profile仅由测试环境服务端配置，生产仍固定owner，不能由请求参数选择他人profile。测试数据与个人记录分离，不为验证删除现有个人数据。

V4估算必须记录：独立音频总字节；每次学习实际下载字节×每日会话×30天（再说明缓存假设）；每次评价数据库读写次数×每日评价数×30天；生成与两次评审的实际计费单位。免费额度资格与自动收费条件分别核查。预算告警不等于硬停止；无硬上限服务需说明限制和可行限额/停用措施。不得以500MB或“个人使用”推导零费用。

## 自动化测试与学习功能边界

npm test、test:e2e、test:firestore等只供开发执行；测试数据不混入正式词库，测试页面不部署到学习者导航。学习者看到的仅是听懂/没听懂或认识/不认识自评，不加入模拟考试、限时考试、拼写测验、AI打分或EJU成绩预测。技术测试的通过率与学习者自评比例分别表述。

## 需要用户决策或授权的事项

| 事项 | 何时需要 | 用户需决定什么 | 等待期间可继续 |
|---|---|---|---|
| API生成/听审费用 | 首次真实收费调用前 | 使用的服务账号、一次性预算上限及可用额度；密钥通过安全配置，不粘贴进文档 | 文本校订、接口mock、本地闭环 |
| 云端目标与月度费用 | 真实云端接入前 | Google项目/账号、月度预算；需要计费绑定时单独授权 | 本地持久化、模拟器和容器验证 |
| 公开部署 | 候选可审阅、费用明确后 | 具体地址/项目、发布动作；词库和音频公开访问的偏好已确定，无需重问 | 所有本地验证和部署准备 |
| 执行方式 | 启动实现前 | 默认建议当前AI连续实施，最后独立AI审核；若明确选择逐任务代理则按选择执行 | 本次计划审查不依赖此回答 |
| 真机访问（条件项） | V2执行时 | 仅在无已授权连接时确认是否接入可控制iPhone；不要求用户承担开发/听审 | WebKit验证，实机项保留NOT_RUN |

不需要重新决策：工作目录、EJU目标、原笔记只读、听力优先、固定PIN单人、V1不做考试、全部开发由AI完成。缺失原句先隔离，不为单条疑义中断全部任务。PIN值在实施时安全配置，不在计划中收集。

## 时间与验收汇报

沿用AI有效工作小时口径，之前10—18小时仅是完整候选的未校准估算。本次新增核验和重排后不承诺同一固定时限；先测S0—S4实际耗时，分别记录编码、生成/听审、工具等待及返工，再重估S5—S9。最小闭环优先于全词库、复习算法和部署；每一步没有证据则不勾选完成。

交付报告必须回答：完成了什么、用什么验证、观察到什么、证据在哪、什么未执行。不得把“预计通过”写成“已通过”。

## 2026-11-05 首阶段实施记录（不改变后续授权范围）

用户已明确确认：先完成开发样本闭环，正式音频另行接入。

| 步骤 | 实际状态 | 证据/差异 |
|---|---|---|
| S0 | 现场/依赖核查完成，Git初始化未执行 | Git受Xcode许可阻断；见docs/environment.md |
| S1 | 开发样本完成，正式验收NOT_RUN | 5项草稿/10个本机静态MP3，不能声称自然标准或AI听审通过 |
| S2 | 开发夹具范围PASS | 真浏览器音频→自评→答案和例句；App/StudyCard复用，无独立session.ts |
| S3 | PASS | 保存失败、同ID重试、更正、双标签页冲突；写事务返回提交快照；先存当前卡再advance |
| S4 | 开发夹具范围PASS | Chromium持久profile关闭重开；WebKit刷新恢复；正式音频/真机未通过 |
| S5—S9 | 未开始 | 本阶段没有复习调度、云端、PWA或部署 |

详见[第一阶段交付报告](../../phase1-report.md)与[证据](../../../artifacts/verification/minimum-loop.md)。原任务中的正式S1、Git提交和V1—V4后续门槛不能因本地流程测试通过而勾选。

## 后续确认：人工验收与重听

用户确认当前5项词语及例句共10段音频人工听审可接受，授权继续使用本批。按本轮明确要求记录为human_accepted，双AI审核仍NOT_RUN，不伪造原S1流程已全部执行。已扩大例句按钮、增加完成后只读重听；未执行S5扩样或S6—S9。见[本轮报告](../../relisten-update.md)。
