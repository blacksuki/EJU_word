# EJU Content and Audio Implementation Plan

> 2026-11-06 执行更新：当前 20 项与 Azure 生成以 [Azure pilot 计划](2026-11-06-eju-azure-pilot.md)为准。原文中的未建工程、OpenAI 提供者、统一标注 AI 听审等不再代表当前状态；20 项文本及 40 段 Azure 候选已生成，真实听审仍待完成，见[本批报告](../../azure-pilot-report.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将85个编号的学生笔记转换为可追溯、面向EJU、经过AI文本和音频检查的版本化内容包。

**Architecture:** 原始内容、规范内容、审核证据与音频文件分别保存。构建命令执行资料校验、受预算控制的语音生成、独立AI听审和静态包导出；学习应用只消费通过门槛的包。此工具可脱离网页独立运行和验收。

**Tech Stack:** TypeScript、Node（先检查现有22.23.2兼容性）、Zod、Vitest、OpenAI语音/音频输入适配器、可用音频解码分析工具；依赖执行时核实官方文档并锁版本。

**Spec:** [2026-11-05-eju-ai-first-design.md](../specs/2026-11-05-eju-ai-first-design.md)；执行者先读规格，再读本计划。所有工程路径相对于 `/Users/huoward/Workspace/EJU/WordTest`；目录与文档已建立，尚未初始化Git或实现产品。

**审查修订：** 先执行[最小闭环与独立验收计划](2026-11-05-eju-review-execution-order.md)。该文规定当前执行顺序、前置盘点、授权清单和V1—V4验收；本文件保留详细模块合同，不能按旧编号顺序推迟保存/恢复。

## Global Constraints

- 原始笔记和聊天项目的 `sources/` 均只读；不得在原文件内校订。
- 学习项类型：word、phrase、form、pattern。
- 规范化、选词、例句、文本核查、语音生成、音频检查、程序开发与代码审核全部由AI执行。
- 两次结论均 pass 且技术检查通过才可标记 `ai_passed`；任一 uncertain/fail 均隔离。
- 单项自动重生成最多2次；仍失败则暂缓。
- 先5项验证最小闭环，再20项声音试验，通过后扩至50项。
- 总发布音频不超过500,000,000字节；按需加载。
- 界面统一标注“AI生成音频，已通过AI检查”。

## Review Focus

1. 同一编号有多个词形、或一个词重复摘录：保留全部出处，不误合并不同义项；C1测试。
2. 汉字读音/语法片段无法确定：进入needs_context，不能猜测后发布；C2测试。
3. 生成服务成功但文件为空/被截断，或审核服务只看到了转写：不得通过音频门槛；C3测试。
4. 一个AI评审通过、另一个不确定：不以多数或平均分掩盖问题；C4测试。
5. 内容重生成后沿用旧缓存地址、孤儿引用或容量超限：构建失败并给出条目编号；C4测试。

---

## 执行与时间

本计划是一个可独立运行的内容构建子项目；另一份学习应用计划依赖C1合同及C4产物。默认当前AI执行，不在规划阶段派代理。执行方法由用户审阅后确定；所有内容评审均为AI任务，非教师工单。

| 任务 | AI有效工作时间 | 依赖 | 独立可验收结果 |
|---|---:|---|---|
| C1 原始数据与合同 | 30—60分钟 | 可读原文件 | 85个原编号无遗漏、规范数据校验器 |
| C2 EJU整理与文本审核 | 30—60分钟 | C1 | 校订库、待核对清单、候选学习包 |
| C3 生成与技术检查 | 45—90分钟 | C1；真实生成等C2 | 可恢复、限预算的音频构建命令 |
| C4 AI听审与发布包 | 45—90分钟 | C2、C3 | 有证据的20→50项静态内容包 |

总计2.5—5小时；API等待/无授权额度单列。先实测20项，再用“生成+两次评审”的实测时长与失败率估算剩余条目，不能承诺几千词同一时限完成。

## 文件结构与共享合同

```text
package.json / package-lock.json / tsconfig.json / vitest.config.ts
src/domain/contracts.ts          # 两个子项目唯一共享的内容类型与校验
content/raw/                     # 原始文本快照，不覆写源Pages文件
content/entries.json             # 规范内容，含未通过条目
content/reviews/                 # 文本/音频审核JSON及来源
scripts/content/normalize.ts     # 原编号展开、校验
scripts/content/editorial.ts     # 审核门槛、EJU选取与编排
scripts/content/generate.ts      # 缓存、预算、重试和生成调度
scripts/content/openai-audio.ts  # 外部服务适配，版本变更止于此
scripts/content/audio-check.ts   # 解码与音频信号检查
scripts/content/review.ts        # 独立音频评审调度
scripts/content/export.ts        # 最终包导出与引用校验
scripts/content/cli.ts           # normalize/editorial/audio/review/build入口
tests/content/                  # 下列任务中指定测试与夹具
artifacts/audio/                # 母版、候选音频；不进入代码提交
public/content/ / public/audio/ # 通过审核的发布资源
```

C1定义这些确切合同，之后不得私自重命名：

```ts
type ItemKind = 'word' | 'phrase' | 'form' | 'pattern';
type ExamUse = 'listening' | 'listening_reading' | 'reading' | 'writing';
type SourceRef = { file: string; number: number; raw: string };
type Evidence = { url: string; checkedAt: string; claim: string };
type StudyItem = {
  id: string; version: number; kind: ItemKind; sources: SourceRef[];
  surface: string; reading: string; baseForm?: string; sense: string;
  meaningZh: string; originalSentence?: string; originalSource?: string;
  exampleJa: string; exampleZh: string; exampleOrigin: 'authored' | 'source';
  collocations: string[]; noteZh: string; relatedIds: string[];
  examUses: ExamUse[]; topic: string; packId: string; priority: 1|2|3|4|5;
  priorityReason: string; sequence: number; evidence: Evidence[];
  textStatus: 'draft' | 'needs_context' | 'ai_passed'; listenText: string;
};
type AudioAsset = {
  id: string; itemId: string; role: 'listen'|'example'; text: string;
  url: string; sha256: string; bytes: number; durationMs: number;
  generation: { model: string; voice: string; promptHash: string; generatedAt: string };
  reviewIds: [string,string]; status: 'ai_passed';
};
type PublishedItem = StudyItem & { audio: { listen: string; example: string } };
type ContentBundle = {
  schemaVersion: 1; version: string; publishedAt: string;
  items: PublishedItem[]; assets: AudioAsset[];
};
```

字符串时间统一ISO-8601 UTC；编号如`eju-01-001-a`，不能用内容哈希作为itemId。audio字段引用AudioAsset.id。候选音频类型在C3定义，不使用已发布类型冒充审核通过。测试公共夹具在`tests/content/fixtures.ts`提供`item(overrides?: Partial<StudyItem>): StudyItem`、`raw85: SourceRef[]`，不得把虚构文本混进实际原始快照。

### Task C1: 原始记录与内容合同

**Files:** Create `src/domain/contracts.ts`, `scripts/content/normalize.ts`, `scripts/content/cli.ts`, `content/raw/eju-01.txt`, `content/raw/eju-02.txt`, `content/raw/eju-03.txt`, `tests/content/fixtures.ts`, `tests/content/normalize.test.ts`；创建本节文件结构列出的根构建配置。

**Interfaces:** Consumes原始Pages正文；Produces `parseNotes(files: {file:string;text:string}[]): SourceRef[]`、`expandCandidates(raw: SourceRef[]): StudyItem[]`（初始textStatus=draft）、`parseBundle(input: unknown): ContentBundle`（运行时校验，失败抛可定位错误）。类型位于`src/domain/contracts.ts`。

- [ ] **Step 1:** 先完成最新计划S0，复用WordTest已有目录与配置；若无仓库且不属于上级仓库则在WordTest建立仓库，已有仓库需要隔离时用using-git-worktrees。核实Node与官方依赖文档，创建运行本任务测试所需的最小配置。`npm test -- --help`可运行；不得代用户接受Xcode协议。
- [ ] **Step 2:** 通过可用的只读Pages读取方式导出三份原始文本快照，逐编号对照来源；在`content/raw/README.md`记录文件路径、提取日期和40/11/34计数。
- [ ] **Step 3:** 写`tests/content/normalize.test.ts`失败测试：
  ```ts
  expect(raw85).toHaveLength(85);
  expect(expandCandidates(raw85)).toHaveLength(87);
  expect(expandCandidates(raw85).filter(x => x.sources.some(s => s.file === 'EJU日语3.pages' && s.number === 1)).map(x => x.surface)).toEqual(['楽しむ','楽しい','楽しみ']);
  expect(() => parseBundle({schemaVersion: 2})).toThrow();
  ```
  同测试文件加入重复摘录夹具：相同surface且不同sense不得合并，两个SourceRef均保留。按来源+子项产生ID，归并只在C2有证据时进行。
- [ ] **Step 4:** 运行`npm test -- tests/content/normalize.test.ts`，预期因缺少实现或断言失败而红；依赖无法启动不算有效红测。
- [ ] **Step 5:** 实现上述合同、解析/展开和Zod结构校验。CLI `normalize`只写`content/entries.json`及审计输出，不覆写原始快照。
- [ ] **Step 6:** 运行`npm test -- tests/content/normalize.test.ts`与`npm run content -- normalize`，预期PASS，原始85、候选87；如实际文本与此前观察不符，先报告差异，不修改计数迎合测试。
- [ ] **Step 7:** 执行`git add package.json package-lock.json tsconfig.json vitest.config.ts src/domain scripts/content content/raw content/entries.json tests/content`，提交`feat: add traceable EJU content contracts`，排除凭据及音频母版。

### Task C2: EJU选词、语境校订与文本审核

**Files:** Create `scripts/content/editorial.ts`, `content/reviews/text.json`, `content/reviews/needs-context.md`, `tests/content/editorial.test.ts`; Modify `content/entries.json`, `scripts/content/cli.ts`。

**Interfaces:** Consumes StudyItem；Produces `TextReview = {itemId:string;verdict:'pass'|'needs_context'|'fail';issues:string[];evidence:Evidence[]}`、`applyTextReview(item: StudyItem, review: TextReview): StudyItem`、`selectPilot(items: StudyItem[], limit: 20|50): StudyItem[]`。

- [ ] **Step 1:** 写`tests/content/editorial.test.ts`失败断言：
  ```ts
  expect(applyTextReview(item(), {itemId:item().id, verdict:'needs_context', issues:['缺原句'], evidence:[]}).textStatus).toBe('needs_context');
  expect(selectPilot([item({textStatus:'needs_context'}), item({id:'ok', textStatus:'ai_passed'})],20).map(x=>x.id)).toEqual(['ok']);
  expect(selectPilot([item({id:'b',priority:4,textStatus:'ai_passed'}),item({id:'a',priority:1,textStatus:'ai_passed'})],20)[0].id).toBe('a');
  ```
  加入句型空listenText、同一id不同义项、source例句无出处的拒绝测试。
- [ ] **Step 2:** 运行`npm test -- tests/content/editorial.test.ts`，确认缺实现导致FAIL。
- [ ] **Step 3:** 实现editorial函数：只有证据与解释齐备、无未决问题的pass可成为ai_passed；句型短句由AI编辑审核确认，不能只靠“有句号”判断。候选按priority、sequence、id排序，先覆盖四种kind各至少一项，再补至上限；不足时返回实际数量。
- [ ] **Step 4:** AI逐条整理全部候选：校订已知问题、查可信辞典/教材、补自编EJU语境例句、建立来源关系与用途；不确定项写入needs-context清单。优先级理由须引用实际薄弱记录或可解释考试用途。
- [ ] **Step 5:** AI以单独审核上下文审查规范文本，输出TextReview；保存具体证据与未决项。无可靠出处的音调标注不写入正文，不靠同模型自我确认宣称权威。
- [ ] **Step 6:** 运行`npm test -- tests/content/editorial.test.ts`与`npm run content -- editorial`，预期PASS；输出四类分布、用途分布、已审核/待核对数量、20项/50项候选，不把待核对计为正式内容。
- [ ] **Step 7:** `git add scripts/content content tests/content/editorial.test.ts`；提交`feat: curate EJU expressions and text review gates`。

### Task C3: 受控音频生成和技术检查

**Files:** Create `scripts/content/generate.ts`, `scripts/content/openai-audio.ts`, `scripts/content/audio-check.ts`, `scripts/content/audio-config.ts`, `tests/content/generate.test.ts`, `tests/content/audio-check.test.ts`, `.env.example`; Modify `.gitignore`, `scripts/content/cli.ts`, `package.json`。

**Interfaces:** Consumes StudyItem；Produces `AudioRequest = {itemId:string;role:'listen'|'example';text:string;model:string;voice:string;prompt:string}`、`CandidateAudio = {request:AudioRequest;file:string;sha256:string;bytes:number;durationMs:number}`、`AudioProvider.generate(request: AudioRequest): Promise<Uint8Array>`、`generateCached(request:AudioRequest, provider:AudioProvider, options:{budgetCalls:number;cacheDir:string}): Promise<CandidateAudio>`、`checkAudio(file:string): Promise<{pass:boolean;issues:string[]}>`。

- [ ] **Step 1:** 写两份失败测试；测试使用本地合法MP3夹具和mock服务，不调用付费API：
  ```ts
  expect(providerCallCountAfterIdenticalRequests).toBe(1);
  await expect(generateWithBudgetZero()).rejects.toThrow('BUDGET_EXHAUSTED');
  expect((await checkAudio(emptyFile)).pass).toBe(false);
  expect((await checkAudio(truncatedFile)).pass).toBe(false);
  expect(cacheKeyForChangedText).not.toBe(cacheKeyForOriginalText);
  ```
  上述测试局部变量/辅助函数在各测试文件内建立，分别调用generateCached/checkAudio；添加合法MP3通过测试，避免“全部拒绝”实现。
- [ ] **Step 2:** `npm test -- tests/content/generate.test.ts tests/content/audio-check.test.ts`，预期FAIL。
- [ ] **Step 3:** 实现生成和技术检查；缓存键含文本、模型、声音、提示哈希；临时文件成功解码后原子改名。候选少于0.2秒、超过30秒、全静音或首尾静音超2秒标异常；按10毫秒窗口RMS<-50dBFS计静音，连续三个采样达到满幅标削波。阈值仅是排查规则，不证明发音正确。
- [ ] **Step 4:** 实现OpenAI适配器：执行时使用openai-docs核查当前文件输出/音频输入能力及SDK，使用可用密钥工具；模型/声音从配置读取。不可用返回明确错误。CLI默认dry-run；真实生成需明确budgetCalls且服务额度已授权，未配置时不得产生付费请求。budgetCalls为本次批次累计调用上限，不是每词重置；计数持久化在cacheDir下的run-ledger.json，失败重试同样计数。CLI另设reviewBudgetCalls约束C4两次评审，不能让审核请求绕过预算。
- [ ] **Step 5:** 运行同组单测，预期PASS；`npm run content -- audio --pilot 20 --dry-run`输出请求数、缓存命中数、所需服务和估算依据，不暴露密钥。服务未接通时交付工具和mock测试结果，保留真实生成未执行标志。
- [ ] **Step 6:** 在现有授权覆盖额度时运行真实20项生成，记录实际耗时、调用数、失败项；不足授权只暂停该步，继续应用开发。MP3母版和报告写artifacts，不自动公开上传。
- [ ] **Step 7:** `git add scripts/content tests/content package.json package-lock.json .env.example .gitignore`；提交`feat: add budgeted reusable audio generation`。

### Task C4: 独立AI听审与版本化发布包

**Files:** Create `scripts/content/review.ts`, `scripts/content/export.ts`, `content/reviews/audio.json`, `tests/content/review.test.ts`, `tests/content/export.test.ts`; Modify `scripts/content/openai-audio.ts`, `scripts/content/cli.ts`。

**Interfaces:** Consumes C3 CandidateAudio、C2已审核StudyItem；Produces `AudioReview = {id:string;candidateHash:string;verdict:'pass'|'uncertain'|'fail'|'unavailable';inputModality:'audio'|'text';reviewerRunId:string;issues:string[]}`、`AudioReviewer.review(candidate:CandidateAudio, item:StudyItem): Promise<AudioReview>`、`approveAudio(candidate:CandidateAudio, reviews:[AudioReview,AudioReview], technicalPass:boolean): boolean`、`buildBundle(items:StudyItem[], assets:AudioAsset[], version:string, publishedAt:string): ContentBundle`。

- [ ] **Step 1:** 写失败测试：
  ```ts
  expect(approveAudio(candidate,[passReview,uncertainReview],true)).toBe(false);
  expect(approveAudio(candidate,[passReview,{...otherPassReview,inputModality:'text'}],true)).toBe(false);
  expect(approveAudio(candidate,[passReview,otherPassReview],true)).toBe(true);
  expect(()=>buildBundle(items,[assetWithMissingItem],version,time)).toThrow('ORPHAN_ASSET');
  expect(()=>buildBundle(items,over500MBAssets,version,time)).toThrow('AUDIO_BUDGET');
  ```
  同文件构造完整夹具；添加相同reviewerRunId、过期candidateHash、缺例句资源、重复编号拒绝测试，新增哈希生成不同URL测试。
- [ ] **Step 2:** `npm test -- tests/content/review.test.ts tests/content/export.test.ts`，预期FAIL。
- [ ] **Step 3:** 实现独立评审两次请求，直接发送真实音频且隔离相互结论。approveAudio校验不同runId、两份audio输入、匹配哈希与技术通过。服务不可听音返回unavailable；禁止生成伪评审JSON兜底。
- [ ] **Step 4:** 实现导出：只纳入textStatus=ai_passed且两个角色音频均通过的条目，assets按文件哈希去重，引用用assetId；容量按不同发布文件计；URL为`/audio/<sha256>.mp3`。生成`public/content/<version>.json`及`public/content/current.json`（仅version与manifestUrl），最后切换current指针。
- [ ] **Step 5:** 运行上述测试和`npm run content -- build --check-only`，预期PASS、0孤儿/缺失、总音频字节≤500000000；未通过数据应返回逐项原因，不输出空包冒充发布成功。
- [ ] **Step 6:** 对20项执行真实听审，不通过的最多重生成2次；门槛通过后扩至50项，随后覆盖全部已审核样例。输出条目数、角色音频数、技术结果、两次评审证据、隔离项、实际调用与时间。若受服务限制，此步保持未勾选。
- [ ] **Step 7:** `git add scripts/content content/reviews tests/content`；提交`feat: gate and export AI-reviewed EJU audio bundles`。发布文件依实际托管方案上传，不把大音频和凭据直接加入代码提交。

## 自审记录（计划自审，非实现测试）

- 规格覆盖：85源记录/词形/来源C1；EJU编排、疑义和例句C2；音频配置/费用/缓存C3；独立听审、容量、版本C4。
- 类型一致：共享类型仅在C1定义；CandidateAudio与AudioReview在各自产生任务定义；PublishedItem.audio始终引用assetId。
- 五项Review Focus已分别落实到C1—C4的失败测试；未增加验证低风险文案格式的测试。
- 当前没有真实音频或测试运行结果；所有任务复选框保持未完成。

## 交接

应用执行者读取本计划C1合同与C4 ContentBundle；不必等待全部真实音频才能做交互、同步测试。两份计划一同审阅后选择执行方式；不要将计划编写误当实现授权。
