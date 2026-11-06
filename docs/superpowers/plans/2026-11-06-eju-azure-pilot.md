# EJU 20 项词库与 Azure 音频实施计划

> **For agentic workers:** Use superpowers:executing-plans；在当前用户指定目录实施，逐任务验证，最后独立审核。

**Goal:** 先整理有公开试题依据的 20 项及原创例句，再生成 40 段候选音频；核验后才扩至 50 项。
**Architecture:** 编辑内容、来源统计、候选音频和已验收应用内容分离。词语/完整表达和例句各一文件；单元是清单，不合并长音轨。请求哈希用于缓存，文件 SHA-256 用于资源地址；审核绑定文件哈希。
**Tech Stack:** 复用现有 Node 22、TypeScript、Vitest、ffmpeg；Azure Speech REST，避免为离线小批量构建增加浏览器依赖。
**Spec:** ../specs/2026-11-05-eju-ai-first-design.md；本次用户明确将语音提供者改为 Azure，批次先 20 后 50。

## Global Constraints
- 不修改原始 Pages、当前 5 项/10 段已听审包及既有学习记录，不部署。
- 频度仅称“所列公开样本的出现覆盖”，不冒充完整历年考频；优先级与频度分开。
- 分类采用稳定标签；编排按理解任务和先备关系，穿插用途，避免易混词连续堆叠。
- 本批编排不等于实现每日配额或间隔复习算法。
- 密钥仅构建进程读取；不进入网页、内容包、日志；默认 dry-run，真实生成必须显式限调用/字符总量。
- API 失败也占预算，预算账本持久化，最多初次加两次重试，禁止无限自动重试。
- 技术解码通过不等于听审通过；无直接音频评审能力就标记 unavailable，不能发布为已审核。

## Review Focus
1. 公开 PDF 的注音和缺题导致统计误差：记录语料边界、字面匹配方法与定位，零命中不等于没考过。
2. 同文本跨条目复用、文本或声音变更：复用对应请求，变更生成不同缓存键。
3. 失败后重跑/并发执行：失败计费计数持久化，独占锁避免同时绕过上限。
4. 音频为空/截断/静音：真实解码检测；损坏缓存不能当成功。
5. endpoint 被误填外部网址：只接受明确的 Azure HTTPS 主机形式，不跟随携密钥的跳转。

### Task 1：20 项内容与来源
**Files:** content/pilots/eju-20-v1.json、content/evidence/jasso-public-sample.json、docs/content-pilot-20.md。
**Interfaces:** Pilot 含 items（稳定 id、读音、义项、例句、listenText、分类、优先级、sequence、来源计数）、units（有序 itemIds）；例句为原创。
- [x] 下载并核对官方公开资料；实际统计 2016-2、2017-1、2017-2 题册，排除不可可靠抽取的 2018-1 和脚本，保存来源、哈希和页码。
- [x] 按字面匹配及人工语境核对计数，编写 20 项和单元。
- [x] 独立 AI 文本审核，修复语义、读音、翻译、编排或来源问题。
**证明:** 20 个唯一 ID、40 条非空发音文本、明确来源覆盖，独立审阅有具体结果。

### Task 2：Azure 受控生成工具
**Files:** scripts/content/azure-audio.ts、scripts/content/generate-pilot.ts、tests/content/azure-audio.test.ts；更新 package.json、tsconfig.json、.env.example。
**Interfaces:** buildRequests(pilot)、requestKey(request)、speechUrls(endpoint)、makeSsml(request)、runBatch(requests, options)；产物为候选 manifest、audio/<sha256>.mp3、run-ledger.json，不写 public。
- [x] 先写失败测试：非法 endpoint、SSML 转义、稳定缓存键、零预算、失败后重跑、并发锁、损坏缓存、空/截断音频。
- [x] 运行并记录红测；实现最小工具，默认 dry-run，显式 generate 才请求 Azure。
- [x] 运行相关测试到绿；dry-run 给出 40 请求、字符量、声音、缓存数和待配置条件。
**证明:** 无凭据可完成 dry-run；测试证明预算/缓存不能误报，真实 ffmpeg 检查合法与异常样本。

### Task 3：真实生成与验收（依赖凭据位置）
- [x] 在用户提供的位置只读取必要变量，查询声音可用性；先少量样本再整批。
- [x] 明确本批调用/字符上限后生成，保留候选哈希、技术报告和真实费用限制。
- [ ] 进行真实听审；无法听审保持待审核，不能用文本检查替代。
**证明:** 40 段实际文件、解码报告和对应哈希的真实听审结果。已从用户指定 ~/.zshrc 读取凭据，生成及技术校验完成；听审工具不可用，最后一项不勾选。

### Task 4：回归与交接
- [x] 独立审核本批工具和文本；修复重要问题。
- [x] npm test、npm run typecheck、npm run build、npm run check:content；运行现有浏览器回归。
- [x] README 写明命令、产物、边界及 20→50 门槛。
**证明:** 实际退出码及日志；区分 mock、桌面浏览器模拟与真实 Azure/iPhone 未验收项。

## 执行裁定与进度
- Ruling：原计划“未建工程”“OpenAI 适配器”已过时；复用现有工程，仅新增 Azure 工具。无 Git/Xcode 授权，不初始化或提交仓库。
- Ruling：本批从公开 EJU 试题扩展选词，不将尚未提取的 85 条学生笔记伪称已全部整理；现有 5 项保持兼容。
- Ruling：本批先交付候选库与生成流水线，音频审核通过后再接入学习应用；避免把无音频/未审核内容切入现用包。

## 最终执行状态
- Task 1：完成，20 项独立文本审核通过；没有声称已覆盖全部学生笔记。
- Task 2：完成，默认 dry-run、缓存、预算和审核门槛验证通过。
- Task 3：40 段已真实生成、技术通过；真实听审未完成，不切换当前包。
- Task 4：完成，52 单测、类型/构建/原包检查通过；现有浏览器 29 通过 1 跳过，新音频实际播放 80 通过。
- Ruling：合法 CBR 音频被时长估算警告误拒绝，先本地复现再按 TDD 修复。保留首次已消耗调用，将本批上限按补齐 40 段所需修订为 41 次，未清零账本。
- Ruling：无可用直接听审能力，交付待审核文件和试听索引，不伪造音频评审。下一步核验后再接入与扩至 50 项。
