# 第一阶段交付报告：开发样本本地最小闭环

日期：2026-11-05。项目：/Users/huoward/Workspace/EJU/WordTest。

**结果：按用户明确选择，开发样本的本地最小闭环已完成并通过下列检查。正式音频S1没有通过，也没有部署。**

## 改了什么

- 在原有空工程目录建立 React/TypeScript/Vite 应用，固定 package-lock.json，沿用现有 Node22。
- 5项学生笔记来源的草稿，包含单词、搭配、可能形和句型；10个本机 Kyoko 静态MP3。页面明确说明开发验证、音频待审核。例句标明自编。
- 先点击听音，再选听懂/没听懂；成功保存后展示假名、词义、例句及例句播放。
- IndexedDB事务保存评价与当前位置。当前卡可更正，保留审计历史但只计一条有效评价；点击下一项再推进位置。
- 支持刷新、关闭重开、完成整组后的恢复；播放失败不产生评价，保存失败不假报成功；修复双标签页冲突和失败重试。
- 没有引入复习规则、日期调度、看词模式、云端、用户系统、考试、PWA离线或发布功能。

## 实际执行的检查

| 检查 | 观察结果 | 证据 |
|---|---|---|
| 保存逻辑TDD | 最初11项先失败后通过；独立审查新增2项先失败后通过 | [最初RED](../artifacts/verification/storage-red.log)、[最初GREEN](../artifacts/verification/storage-green.log)、[审查RED](../artifacts/verification/review-unit-red.log) |
| npm test | 最终19/19通过：13保存/恢复业务逻辑，6内容加载校验 | [最终单元日志](../artifacts/verification/review-unit-green.log) |
| npm run test:e2e | 17通过、1跳过；Chromium与WebKit真浏览器交互，不是播放器mock | [最终浏览器日志](../artifacts/verification/browser-final.log) |
| 关闭重开 | Chromium持久profile记录两项，关闭后重新启动，仍为两项且下一项正确 | [恢复截图](../artifacts/verification/reopened-chromium.png) |
| 浏览器错误路径 | 音频中断后可重试；保存失败不展示答案；失败后新选择生效；更正失败不能跨卡污染；提交成功无需第二次读取；双标签页冲突与双击不重复 | [先失败的8项浏览器用例](../artifacts/verification/review-browser-red.log)、最终浏览器日志 |
| npm run build | TypeScript检查与Vite生产构建退出0；20模块 | [构建日志](../artifacts/verification/build-final.log) |
| npm run check:content | 5项/10文件对应、字节/哈希、ffprobe时长与ffmpeg全文件解码通过；267,992字节 | [完整性日志](../artifacts/verification/content-check.log) |
| 原笔记保护 | 三个Pages的SHA-256与实施前记录完全一致 | [实施前哈希](../artifacts/verification/original-files.json)、完整性日志 |
| 界面观察 | 查看390像素宽的Chromium/WebKit实际答案页截图，未见内容重叠；自动断言无横向溢出 | [Chromium](../artifacts/verification/answer-chromium.png)、[WebKit](../artifacts/verification/answer-webkit.png) |

浏览器环境：Playwright1.64.1；Chromium156.0.8078.4；WebKit27.2。WebKit使用iPhone13参数、390×664视口，是模拟，不是真机。明确跳过的1项是Chromium专用持久浏览器重启场景在WebKit项目中的重复执行；WebKit的刷新恢复已实际通过。

## 独立审查与修复

审查者只读检查源码，另在内存复现保存边界；没有代替实际运行证据。3项Important均在本轮修复，0项Critical，未遗留Minor。采用一次修复流程，每个问题新增先失败的测试，随后全套相关检查通过；没有声称做了第二次独立审查。

1. 不同标签页生成不同eventId时，同一卡可能有两条有效评价：事务内拒绝第二条原始评价；UI读取最新记录并说明冲突。
2. advance提交后read失败造成旧卡重试卡住：写事务仅在提交完成后返回快照，UI直接使用；陈旧游标会恢复最新记录。
3. 失败pending忽略新选择或流入下一卡：重试绑定当前项及评分；新选择替换未提交操作；更正未保存前禁用下一项。

## 计划差异与裁决

- Git受Xcode许可阻断：在用户指定WordTest原位完成，未接受系统协议、未建worktree、未提交。代价：没有Git恢复点，保留本次文件和日志。
- 正式音频缺服务/额度：用户明确授权先用开发样本。代价：不能证明自然度、标准发音或正式EJU学习效果；正式S1继续待验收。
- S2复用App/StudyCard，未额外建立session.ts或组件mock：真实播放器由浏览器交互验证。代价：以后增加复习调度时需要提取会话逻辑。
- 旧saveFeedback(nextItemId)调整为保存当前卡，另用advance推进，二者均返回已提交快照。理由：刷新后仍能查看答案，且消除写成读败窗口。代价：后续同步必须沿用这一事务边界，不得照旧接口覆盖。
- 当前合同只支持listen，read及FSRS字段留给S6，不伪造后续能力。系统Python也因Xcode许可不可用，文件工作使用现有shell/Node完成。

## 尚未验证／实施

- [V1正式音频](../artifacts/verification/audio-samples.md)：未进行OpenAI生成和两次直接音频AI听审，也未验证文本准确性、音调与自然度。解码通过不代表发音标准。
- [V2真机iPhone](../artifacts/verification/iphone-safari.md)：未连接真机；真实Safari后台切换、主屏幕启动、真机关闭重开未验证。未进行桌面大屏和完整无障碍审计。
- [V3云端保存](../artifacts/verification/cloud-save.md)：未实现或调用云服务，没有跨设备恢复能力。
- [V4费用](cost-validation.md)：未核实云账号、实际价格与额度；没有付费API调用或部署。
- 未运行生产构建产物的单独浏览器场景（浏览器验证运行在本地Vite开发服务器）；不将构建成功等同上线验证。
- 没有日期规则或复习调度，故没有声称执行这些逻辑测试。
- 没有Git提交/合并/PR；按照finishing-a-development-branch核对后，当前无仓库可执行分支收尾，文件原位保留，不清理唯一工作成果。

审查中暂不判断的正式音频、后续功能、真机/云/成本、Git及当时尚在编写的文档，分别以上述限制处理；文档及内容校验脚本现已补齐。风险分别是音质未知、没有后续能力、不能作真机或费用承诺、没有版本恢复点；这些限制均未隐藏。

## 下一阶段

先接入正式5项音频及两次独立听审，满足S1/V1后再考虑S5的20/50项扩充。其后才是S6复习规则及日期逻辑。iPhone真实体验单独安排；云端与费用按既定S7—S9验证，不提前实现，不部署。

本地启动方式见 [README](../README.md)。记录只保存在同一地址和浏览器中，清除网站数据、隐私窗口结束或浏览器回收存储可能使其丢失。
