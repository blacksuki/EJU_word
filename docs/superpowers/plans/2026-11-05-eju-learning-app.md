# EJU Learning App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 由AI完成可持续使用的EJU个人词汇与表达PWA，包括盲听、看词、间隔复习、可靠记录和最低PIN访问能力。

**Architecture:** React前端消费固定版本的ContentBundle；纯函数学习状态与FSRS适配器由浏览器和服务端共用。Node服务用Firestore事务保存不可变评价及版本化快照，浏览器IndexedDB保存待同步事件；静态音频按需缓存。可先用标明的测试内容独立验收应用，正式交付再接入内容计划C4产物。

**Tech Stack:** React、TypeScript、Vite、Node（先检查现有22.23.2兼容性）、Express、Firestore/firebase-admin、ts-fsrs、IndexedDB、Vitest、Testing Library、Playwright；实施前查官方文档、锁具体版本。不增加运行时LLM依赖。

**Spec:** [2026-11-05-eju-ai-first-design.md](../specs/2026-11-05-eju-ai-first-design.md)。共享内容合同见[内容计划C1](2026-11-05-eju-content-audio.md)。执行者读取两者，所有工程路径相对于 `/Users/huoward/Workspace/EJU/WordTest`。

**审查修订：** 先执行[最小闭环与独立验收计划](2026-11-05-eju-review-execution-order.md)。该文规定当前执行顺序、前置盘点、授权清单和V1—V4验收；本文件保留详细模块合同，不能按旧编号顺序推迟保存/恢复。

## Global Constraints

- 运行形态：iPhone Safari / 主屏幕 PWA。默认盲听，另提供看词回忆。
- 每组10项；新学默认50项，可选20、30、50；漏学顺延，不累加到第二天。
- FSRS 初始目标保持率0.9，Again/Good 两档；listen/read 两种模式状态独立。
- 记录采用 Asia/Tokyo 日期。
- 无评价的播放失败、跳过均不改变记忆状态。
- 固定PIN服务端验证，生产环境使用HTTPS、安全HttpOnly会话。
- 客户端乐观更新和持久化待同步队列使用同一调度适配器。
- 核心学习不调用在线AI/TTS；模拟结果不能写成真实iPhone验收。
- V1不开发模拟考试、作文批改、实时AI对话、录音评分、复杂用户管理或后台。

## Review Focus

1. iPhone拒绝自动播放、音频404或中途切后台：有重试入口，不能产生错误评价；A1/A5测试。
2. 双击反馈、网络超时后重发、纠正上一条：保持一次有效计数，纠正从评价前状态重算；A3/A4测试。
3. 东京午夜、长时间离线、另一设备先更新：日期正确，冲突保留不静默覆盖；A2/A4测试。
4. 新版本内容遇到旧缓存/词义改变：会话固定版本，不配错文本与声音、不继承不同义项状态；A5测试。
5. 页面恢复或PIN过期时还有待提交评价：恢复队列，重新登录后继续，数据不会因401丢失；A4/A6测试。

---

## 执行、时间与里程碑

| 任务 | AI有效工作时间 | 依赖 | 独立可验收结果 |
|---|---:|---|---|
| A1 学习状态和交互 | 45—75分钟 | C1合同；可用夹具 | 一组卡片可完整学习 |
| A2 调度与每日任务 | 45—75分钟 | A1合同 | 两种模式独立调度、按日计划 |
| A3 PIN与云端事务 | 60—120分钟 | A2 | 授权、去重、纠正和快照接口 |
| A4 离线保存与同步 | 60—120分钟 | A3接口 | 中断/重试/冲突不丢记录 |
| A5 手机PWA和内容更新 | 45—75分钟 | A1/A4；C4可延后接入 | 手机布局、资源缓存和版本切换 |
| A6 集成、AI审核和交付 | 45—75分钟 | A1—A5/C4 | 有验证证据的部署候选 |

合计5—9小时。与内容计划2.5—5小时合计7.5—14小时；加约25%返工余量，按10—18小时排程。这里不保证连续运行、模型速度或服务可用性。完成C1/A1后记录真实用时并重估。

- 约1—2小时：可点击骨架（可能使用测试夹具，不称为正式内容）。
- 约3—6小时：接入少量真实AI已检查音频的本地学习版，尚未完成全部云端验收。
- 约10—18小时：首批内容+复习+同步+自动验证的完整候选版，前提是API及运行环境可用。
- 七天学习观察不是开发阻塞门槛，单独记录；不能通过模拟时钟代替人的跨天学习。

执行建议采用当前主代理连续实施，因状态、调度、事件和同步接口紧密关联；最后进行独立AI整体审查。可选逐任务子代理实施+审查，交接更多、上下文成本更高。未选择前不启动实现；不因为使用多代理就把估时除以代理数量。

## 文件结构

```text
src/domain/contracts.ts           # C1已有内容合同，只引用
src/learning/types.ts             # 两模式、事件、快照、会话合同
src/learning/session.ts           # 显示/播放/反馈阶段状态机
src/learning/StudyCard.tsx         # 单卡UI
src/learning/scheduler.ts         # FSRS唯一适配器，序列化转换
src/learning/queue.ts             # 任务编排、当日短间隔
src/learning/stats.ts             # 东京日期、分模式统计
src/learning/reviews.ts           # 评价去重/纠正规则
src/sync/storage.ts               # IndexedDB进度、不可变事件队列
src/sync/client.ts                # HTTP调用和401/409处理
src/sync/runner.ts                # 顺序同步、确认后出队
src/content/loader.ts             # manifest校验、版本固定
src/app/App.tsx / Today.tsx / Records.tsx / Settings.tsx
src/app/main.tsx / styles.css     # 手机布局与启动
server/auth.ts / routes.ts / index.ts
server/review-store.ts            # 云端与测试实现共同接口
server/firestore-store.ts         # Firestore事务
public/sw.js / manifest.webmanifest / icons/
tests/learning/ tests/server/ tests/sync/ tests/e2e/
Dockerfile / firebase.json / firestore.rules / .env.example
docs/runbook.md / artifacts/verification/  # 交付及实测证据
```

没有现成源文件可修改行号。A1建立根前端和测试配置；若内容任务已建同名配置则增量复用，不覆盖。只安装本任务需要的依赖。每任务先红测再最小实现，过相关测试再提交；综合检查放A6，不在每一步全量重跑。

## 共享学习合同（A1建立，其余任务复用）

```ts
type StudyMode = 'listen' | 'read';
type Rating = 'again' | 'good';
type MemoryState = { due: string; fsrs: Record<string, string|number|null> };
type ReviewEvent = {
  eventId: string; itemId: string; mode: StudyMode; rating: Rating;
  occurredAt: string; expectedRevision: number; contentVersion: string;
  replacesEventId?: string;
};
type TrackState = {
  itemId: string; mode: StudyMode; revision: number; memory: MemoryState;
  beforeLatest?: MemoryState; latestEvent?: ReviewEvent;
};
type ReviewReceipt = { eventId: string; track: TrackState; duplicate: boolean };
type StudySnapshot = { tracks: TrackState[]; events: ReviewEvent[] };
type QueueEntry = { itemId: string; mode: StudyMode; reason: 'due'|'new'|'relearn' };
type DailyStats = {
  date: string; newItems: number; reviews: number; pending: number;
  selfRecall: Record<StudyMode,{good:number;total:number}>;
};
```

时间均ISO-8601 UTC，展示时转换东京日期。fsrs内部字段只由scheduler读写和校验；首次适配固定库版本后记录完整字段映射及序列化版本，避免其他模块猜测SDK对象。track键为`itemId + ':' + mode`。ReviewReceipt为服务端权威结果。

### Task A1: 可独立运行的学习交互

**新顺序：** 先只完成listen入口，App与loader骨架从A5提前到此任务；紧接最新计划S3/S4实现本地保存/恢复。read入口、更正完善、FSRS及云端随后完成。A1夹具通过不等于真实闭环通过。

**Files:** Create `src/learning/types.ts`, `src/learning/session.ts`, `src/learning/StudyCard.tsx`, `tests/learning/fixtures.ts`, `tests/learning/session.test.ts`, `tests/learning/card.test.tsx`, `index.html`, `src/app/main.tsx`；创建/复用根package.json、锁文件、TS、Vite和Vitest配置。

**Interfaces:** Consumes PublishedItem（C1）；Produces `SessionState = {item:PublishedItem;mode:StudyMode;phase:'question'|'answer';audioState:'idle'|'playing'|'error';hasPlayed:boolean;feedback:Rating|null}`、`SessionAction = {type:'audio';state:SessionState['audioState']}|{type:'rate';rating:Rating}|{type:'correct';rating:Rating}`、`createSession(item:PublishedItem, mode:StudyMode):SessionState`、`reduceSession(state:SessionState, action:SessionAction):SessionState`、`StudyCard({state,audioUrls,dispatch,onNext,onFeedback}: {state:SessionState;audioUrls:{listen:string;example:string};dispatch:(a:SessionAction)=>void;onNext:()=>void;onFeedback:(rating:Rating,correcting:boolean)=>Promise<void>}):ReactElement`。调用者将assetId解析为URL传入；测试使用本地音频夹具URL，不把assetId误当文件地址。

- [ ] **Step 1:** 如C1未建环境，执行C1 Step1的环境准备并复用合同；查官方版本安装最小前端测试依赖。添加明确标记的测试夹具`sampleItem`，只用于测试/开发，不进入正式词库。
- [ ] **Step 2:** 写状态与组件失败测试：
  ```ts
  expect(createSession(sampleItem,'listen').phase).toBe('question');
  expect(reduceSession(createSession(sampleItem,'listen'),{type:'audio',state:'error'}).feedback).toBeNull();
  expect(screen.queryByText(sampleItem.meaningZh)).not.toBeInTheDocument();
  expect(screen.queryByText(sampleItem.surface)).not.toBeInTheDocument();
  ```
  在相应测试内render StudyCard；点击“听懂了”后才显示答案和“听例句”。read模式仅提前显示surface。更正只在answer阶段可用，下一卡不能继续改上一卡。
- [ ] **Step 3:** `npm test -- tests/learning/session.test.ts tests/learning/card.test.tsx`，确认FAIL。
- [ ] **Step 4:** 实现状态机和StudyCard。自动播放被拒绝显示“点击播放”，失败显示“音频暂不可用，重试”；hasPlayed初始false，真实playing事件置true，播放结束仍保留；listen模式hasPlayed=true且当前不是error才允许反馈。播放/跳过不调用onFeedback，用户反馈成功入本地队列后才显示已记录。
- [ ] **Step 5:** 运行同组测试，预期PASS；`npm run dev`打开开发页面，使用夹具完成一张卡。记录它是功能原型，不宣称真实音频验收。
- [ ] **Step 6:** `git add src/learning src/app/main.tsx tests/learning index.html package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts`；提交`feat: add audio-first and reading recall cards`。

### Task A2: FSRS、东京日期与每日任务

**Files:** Create `src/learning/scheduler.ts`, `src/learning/queue.ts`, `src/learning/stats.ts`, `tests/learning/scheduler.test.ts`, `tests/learning/queue.test.ts`, `tests/learning/stats.test.ts`；Modify package.json/锁文件。

**Interfaces:** Consumes A1 types；Produces `initialMemory(now:string):MemoryState`、`scheduleReview(memory:MemoryState,rating:Rating,at:string):MemoryState`、`buildQueue(items:PublishedItem[],snapshot:StudySnapshot,mode:StudyMode,newLimit:20|30|50,now:string):QueueEntry[]`、`tokyoDate(at:string):string`、`summarize(snapshot:StudySnapshot,items:PublishedItem[],now:string):DailyStats`。FSRS适配只在scheduler导入外部库。

- [ ] **Step 1:** 写失败测试：
  ```ts
  expect(tokyoDate('2026-11-05T14:59:59Z')).toBe('2026-11-05');
  expect(tokyoDate('2026-11-05T15:00:00Z')).toBe('2026-11-06');
  expect(queue.filter(x=>x.reason==='new')).toHaveLength(20);
  expect(queue[0].reason).toBe('due');
  expect(afterListening.tracks.find(x=>x.mode==='read')).toEqual(beforeReadingTrack);
  ```
  测试局部夹具明确提供≥20个新项、1个到期项；加入遗漏日不累加、同项两模式不重复计新学、同日三次Again不再自动重排、纠正事件不增加统计测试。
- [ ] **Step 2:** `npm test -- tests/learning/scheduler.test.ts tests/learning/queue.test.ts tests/learning/stats.test.ts`，预期FAIL。
- [ ] **Step 3:** 实现FSRS适配，保持率0.9；SDK日期对象与JSON集中转换。不手写替代遗忘算法；固定时钟测试相同初始状态下Again比Good更早进入复习，并测试序列化恢复后结果一致。10分钟短间隔与三次暂停在queue实现，不修改基础FSRS状态。
- [ ] **Step 4:** 实现队列和统计：新项priority/sequence/id排序；到期项due/id排序；每组最多10项。当天再次出现需已过10分钟且至少有3个其他项完成；不足3项时等到后续会话，避免即时记忆。三个Again后的暂停随东京日期切换解除。统计排除被replacesEventId替换的旧事件，并按itemId计算新学去重。
- [ ] **Step 5:** 运行同组测试，预期PASS，打印固定夹具的东京日期、队列与两模式状态供核对；不要求随机浮动的FSRS具体天数必须某个常量，测试时关闭随机抖动。
- [ ] **Step 6:** `git add src/learning tests/learning package.json package-lock.json`；提交`feat: schedule independent EJU recall tracks`。

### Task A3: 服务端PIN、幂等评价与Firestore

**Files:** Create `src/learning/reviews.ts`, `server/auth.ts`, `server/routes.ts`, `server/index.ts`, `server/review-store.ts`, `server/firestore-store.ts`, `tests/server/memory-store.ts`, `tests/server/auth.test.ts`, `tests/server/reviews.test.ts`, `tests/server/firestore.test.ts`, `firebase.json`, `firestore.rules`；Modify .env.example/package.json/锁文件。

**Interfaces:** Consumes A1事件与A2调度；Produces `decideReview(current:TrackState,event:ReviewEvent,priorReceipt?:ReviewReceipt):ReviewReceipt`；`ReviewStore = {apply(event:ReviewEvent):Promise<ReviewReceipt>;snapshot():Promise<StudySnapshot>}`；`createServer({store,pinHash,sessionSecret}:{store:ReviewStore;pinHash:string;sessionSecret:string}):Application`。所有profileId在服务端固定为owner。

HTTP合同：`POST /api/session {pin}`→204及cookie；错误401。`GET /api/study`→StudySnapshot；`POST /api/reviews`→ReviewReceipt。未登录401，非法载荷400，版本/事件载荷冲突409；不提供公开进度读写端点。

- [ ] **Step 1:** 写auth/reviews失败测试；memory-store作为测试夹具实现同一接口：
  ```ts
  expect(unauthenticatedRead.status).toBe(401);
  expect(wrongPin.status).toBe(401);
  expect(first.track.revision).toBe(1);
  expect(retry.track.revision).toBe(1);
  expect(retry.duplicate).toBe(true);
  expect(correctedStats.reviews).toBe(firstStats.reviews);
  ```
  加入同eventId不同payload=409、过期expectedRevision=409、修正非最近事件=409、相同事件并发提交只一次、两个不同事件同时竞争版本仅一个成功；HTTP会话测试检查HttpOnly/SameSite及生产Secure。
- [ ] **Step 2:** `npm test -- tests/server/auth.test.ts tests/server/reviews.test.ts`，预期FAIL。
- [ ] **Step 3:** 实现decideReview与服务接口；事件校验包括条目存在、mode/rating合法、时间可解析、内容版本匹配已知包。普通事件保存beforeLatest；纠正从beforeLatest以原评价时间重新调度，保留新事件时间作审计。已存在相同eventId应在版本冲突判断前返回原receipt。
- [ ] **Step 4:** 实现PIN哈希验证和签名会话：8位数字PIN由安全环境提供，不能提交实际PIN；会话30天，登录失败按IP每15分钟最多10次；只接受同源JSON修改请求。生产配置缺失则启动失败，不启用默认PIN。权限规则拒绝浏览器直连Firestore，Admin SDK凭服务身份访问。
- [ ] **Step 5:** 实现Firestore ReviewStore，用事务原子写`profiles/owner/tracks/{itemId_mode}`与`profiles/owner/events/{eventId}`；事件内保存receipt便于重试。查询返回快照和事件，不把事件堆进单个不断增长的文档。
- [ ] **Step 6:** 写/运行模拟器竞争测试：`npm run test:firestore`（firebase emulators:exec只启动Firestore后运行firestore.test.ts），预期两个并发相同eventId只一条事件，竞争revision仅一次递增。再运行auth/reviews单测，预期PASS；模拟器不可用时该验证保留未执行，不能用memory-store结果代替。
- [ ] **Step 7:** `git add src/learning/reviews.ts server tests/server firebase.json firestore.rules .env.example package.json package-lock.json`；提交`feat: persist authenticated idempotent study reviews`。

### Task A4: 断网、恢复与冲突处理

**复用要求：** S3/S4已创建storage、Playwright和本地事件存储；本任务增量扩展为云端同步，禁止覆盖重建。使用最新计划规定的迁移测试保留原事件ID。

**Files:** Create `src/sync/storage.ts`, `src/sync/client.ts`, `src/sync/runner.ts`, `tests/sync/storage.test.ts`, `tests/sync/runner.test.ts`, `tests/e2e/recovery.spec.ts`, `playwright.config.ts`; Modify `package.json`, `package-lock.json`。

**Interfaces:** Consumes ReviewEvent/Receipt/Snapshot；Produces `LocalStore = {read():Promise<{snapshot:StudySnapshot;pending:ReviewEvent[];conflicts:ReviewEvent[]}>;enqueue(event:ReviewEvent):Promise<void>;ack(receipt:ReviewReceipt):Promise<void>;markConflict(eventId:string):Promise<void>;replaceSnapshot(snapshot:StudySnapshot):Promise<void>}`、`StudyApi = {submit(event:ReviewEvent):Promise<ReviewReceipt>;snapshot():Promise<StudySnapshot>}`、`syncPending(store:LocalStore,api:StudyApi):Promise<'synced'|'offline'|'auth_required'|'conflict'>`。

- [ ] **Step 1:** 写失败测试（fixture在各测试文件定义，fake-indexeddb用于单测）：
  ```ts
  expect((await reopened.read()).pending[0].eventId).toBe(event.eventId);
  expect(await syncPending(store,api401)).toBe('auth_required');
  expect((await store.read()).pending).toHaveLength(1);
  expect(await syncPending(store,api409)).toBe('conflict');
  expect((await store.read()).conflicts[0].eventId).toBe(event.eventId);
  ```
  加入服务端已提交但响应丢失、连续离线同项评价顺序、更正先于原事件同步的顺序约束、配额写入失败不得显示已记录测试。
- [ ] **Step 2:** `npm test -- tests/sync/storage.test.ts tests/sync/runner.test.ts`，预期FAIL。
- [ ] **Step 3:** 实现IndexedDB原子持久化：原事件和纠正事件均不可变；保存成功才更新UI。ack在一个事务内更新快照并移除对应pending；恢复时用已确认快照+待提交事件重放乐观状态，防止重复应用。
- [ ] **Step 4:** 实现顺序发送，原样重发eventId/occurredAt/expectedRevision；网络失败暂停，401保留并提示登录；409拉新快照，冲突项及依赖它的同track后续事件放conflicts、不自动改版本重发，其他track可继续。提供“重新复习此条”行为创建新评价，不删除冲突审计。
- [ ] **Step 5:** 运行上述单测，预期PASS；建立Playwright配置和`test:e2e`脚本，编写`tests/e2e/recovery.spec.ts`场景：离线回答→刷新→恢复网络→云端仅一次→退出后仍恢复。`npm run test:e2e -- tests/e2e/recovery.spec.ts`通过；此时可用测试服务，A6再覆盖云端候选。
- [ ] **Step 6:** `git add src/sync tests/sync tests/e2e/recovery.spec.ts playwright.config.ts package.json package-lock.json`；提交`feat: recover offline reviews without duplicate progress`。

### Task A5: 手机页面、缓存与内容版本

**复用要求：** App.tsx/main.tsx与loader最小实现已在S2创建，此处仅修改扩展。Safari真机验收按最新计划V2单列。

**Files:** Create `src/app/App.tsx`, `src/app/Today.tsx`, `src/app/Records.tsx`, `src/app/Settings.tsx`, `src/app/styles.css`, `src/content/loader.ts`, `public/sw.js`, `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `tests/e2e/mobile.spec.ts`, `tests/e2e/content-update.spec.ts`；Modify `src/app/main.tsx`, `src/learning/StudyCard.tsx`。

**Interfaces:** Consumes A1—A4；Produces `loadBundle(manifestUrl:string):Promise<ContentBundle>`、`ContentSession = {bundle:ContentBundle;version:string}`、`startContentSession(bundle:ContentBundle):ContentSession`。静态内容由C4供给，测试使用schemaVersion=1且标为fixture的包。

- [ ] **Step 1:** 写移动端失败场景：
  ```ts
  await expect(page.getByRole('button',{name:'开始今日学习'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText('AI生成音频，已通过AI检查')).toBeVisible();
  ```
  添加375×812布局/触控按钮、拒绝autoplay后的手动播放、切后台返回无重复评价、缓存音频离线播放、未缓存音频不记成绩、旧会话v1/新current=v2时文本音频不混用测试。
- [ ] **Step 2:** `npm run test:e2e -- tests/e2e/mobile.spec.ts tests/e2e/content-update.spec.ts`，预期关键断言FAIL；浏览器安装缺失不是有效红测。
- [ ] **Step 3:** 组装今日/词库浏览/学习记录/设置入口，主操作最小44px触控区域。设置仅新学20/30/50、看词回忆入口及PIN会话；记录页明确“自评”。显示词库、例句、基础词形和待同步状态。词库浏览不更新记忆状态；内容问题按钮写本地反馈（itemId/version/类型/备注），不发送外部消息。
- [ ] **Step 4:** 实现loader/schema检查与Service Worker：缓存应用外壳和按哈希资源，不缓存`/api/*`；会话固定bundle，下一组前验证并切换新包。联网时检查current指针；离线使用已验证缓存。目标义项新id自然成为新学习项，不复制旧track。
- [ ] **Step 5:** 运行同组端到端测试，预期PASS；检查安装清单、图标和无横向溢出。用浏览器/WebKit实测播放能力；如果只能模拟，证据标注浏览器版本与模拟视口，不能写“iPhone真机通过”。
- [ ] **Step 6:** `git add src/app src/content src/learning/StudyCard.tsx public/sw.js public/manifest.webmanifest public/icons tests/e2e`；提交`feat: deliver mobile PWA with versioned learning content`。

### Task A6: 集成、AI整体审查与交付

**Files:** Create `Dockerfile`, `.dockerignore`, `docs/runbook.md`, `tests/e2e/acceptance.spec.ts`, `eslint.config.js`; Modify `playwright.config.ts`, `package.json`, `package-lock.json`, `server/index.ts`；输出`artifacts/verification/summary.md`、测试报告、实测截图、内容验收清单。

**Interfaces:** Consumes C4正式ContentBundle和A1—A5；Produces单容器候选（同源前端/API，可选外部静态音频URL）；`GET /healthz`→200 `{status:'ok'}`；配置PORT、PIN_HASH、SESSION_SECRET、GOOGLE_CLOUD_PROJECT及服务身份，密钥不写镜像。

- [ ] **Step 1:** 写集成失败场景：首次PIN→今日任务→盲听→反馈→答案→听例句→下一项→退出恢复→复习→看词独立状态→离线恢复；断言两模式状态不串、修正不重复计数、未审核条目不出现、真实包引用无404。安装并配置Playwright所需浏览器仅在授权允许的正常软件来源内进行。
- [ ] **Step 2:** `npm run test:e2e -- tests/e2e/acceptance.spec.ts`，确认集成尚缺之处导致FAIL。
- [ ] **Step 3:** 补齐启动/健康检查、容器、端到端环境及正式包接入。根scripts固定：`typecheck`、`lint`、`test`、`test:firestore`、`test:e2e`、`build`、`content`。错误日志去除PIN、会话和服务密钥；生产静态/API同源。
- [ ] **Step 4:** 依次运行`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:firestore`、`npm run build`、`npm run test:e2e`、`npm run content -- build --check-only`；预期均退出0。无API密钥时不得以mock听审替代C4真实门槛；记录“应用通过/真实音频未完成”的分项状态。
- [ ] **Step 5:** 用requesting-code-review技能进行独立AI整体验证，审查焦点为五项Review Focus和规格覆盖；实施方法决定逐任务审查或最终审查，不设置人工代码审查队列。修复有效问题后只重跑受影响检查，最后汇总证据。不能仅凭审查者说通过就标记完成。
- [ ] **Step 6:** 核查当前Google官方部署政策、账号可用服务、存储和流量预算，写runbook中实际可执行的部署/回滚步骤。无公开发布授权时只构建候选并列出具体目标，不新建付费资源；有明确授权才执行部署并验证实际URL、健康检查、PIN和资源加载。
- [ ] **Step 7:** 输出summary，逐项写明真实内容数量、被隔离项、AI音频审核状态、自动化通过结果、真机状态、部署状态、实际AI工作时间/等待/费用（不可获知则标未知）。不将工具受限写成成功；将可选七天学习观察与已完成开发验收分开。
- [ ] **Step 8:** `git add Dockerfile .dockerignore docs/runbook.md tests/e2e/acceptance.spec.ts playwright.config.ts eslint.config.js package.json package-lock.json server/index.ts`；提交`feat: verify and package EJU learning app`。完成分支时使用finishing-a-development-branch技能；不自动合并/发布超出已有授权的变更。

## 依赖失败时的继续策略

| 阻碍 | 继续完成 | 不可声称 |
|---|---|---|
| OpenAI语音或音频评审不可用 | 交互、调度、同步、mock适配器验证 | 正式声音自然标准、音频审核通过 |
| 样例缺原句 | 明确部分校订、其他已核实条目 | 猜测内容已确认 |
| Google账号/部署权限缺失 | 本地完整版本、容器和运行说明 | 云端部署完成 |
| 无可控制iPhone | WebKit/移动视口自动化 | iPhone真机验收通过 |
| 无跨天学习数据 | 模拟时间检验算法 | 实际保持率或提分效果已证实 |

账号登录、必要额度授权可能需要用户动作，但不把编码、校订、测试、听审或部署操作安排成人工作业。不因等待一项服务而停止独立任务。

## 计划自审记录

- 规格覆盖：两种学习模式A1；每日量、复习、日期、统计A2；PIN/去重/纠正A3；断网/恢复/冲突A4；PWA/内容版本/报告问题A5；验证、运行、部署边界A6。内容完整性由C1—C4提供。
- 类型一致：StudyMode与Rating仅在types定义；HTTP与LocalStore始终使用ReviewEvent/ReviewReceipt/StudySnapshot；内容引用使用C1的assetId，不另设wordId。
- Review Focus：五类都有对应失败场景，现场无法执行的真机检查保留明确限制，不自动勾选。
- 时间按AI任务总量估算，首批实测后重估；未承诺固定日历交付时间或零费用。
- 当前仅计划与规格完成；实现、自动测试、AI音频审核、独立代码审查均未执行。

## 审阅与执行交接

先审阅这份计划和内容计划是否准确，再选择当前主代理连续执行（建议）或逐任务子代理实施/审查。两种均为AI开发；前者接口交接少，后者检查点更多。选定后保留该方法，不重复询问。
