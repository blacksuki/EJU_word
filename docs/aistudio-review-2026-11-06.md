# Google AI Studio 适配改动审查

日期：2026-11-06（Asia/Tokyo）。结论：**本地验证未发现学习功能回归；建议修正4项运行配置后再同步，另需保留锁文件。** 本轮仅审查，没有修改应用代码、推送或部署。

## 审查对象

- 基线：GitHub main / 本机提交 `ee36193127b22a27c736da4eabbc63f1979c5096`。
- 实际来源：已打开的 EJU_word Google AI Studio 项目，其 GitHub 面板显示5个待同步文件；通过 Export → Download as .zip file 下载审查副本，没有点击 Push 或 Publish。
- ZIP：本机 Downloads/eju_word.zip，SHA256 `464d99303b24a21450c644b34bd37375f12cdfa01a294b55d848f795565f4e2b`。
- 独立副本：`/private/tmp/eju-studio-review.V49ilZ`。改动文件的持久审查副本位于 `artifacts/verification/studio-review/changed/`。
- 四个修改文件：.env.example、index.html、package.json、vite.config.ts；新增 metadata.json。ZIP另缺 package-lock.json，但Studio待同步清单没有显示其删除，不能将导出缺失等同仓库文件删除。
- 所有学习源码、测试、词库和110段音频与基线逐字节一致。构建后JS/CSS也与原版逐字节一致，HTML只增加Open Graph元信息。

## 按严重程度列出的问题

### P2：开发服务取消 Host 校验

位置：[vite.config.ts:7](../artifacts/verification/studio-review/changed/vite.config.ts)。`allowedHosts:true` 配合 `host:'0.0.0.0'`，扩大开发服务器访问范围。实际用仅绑定回环地址的隔离测试发送 `Host: untrusted.example`，得到HTTP 200及App源码。

影响：开发服务有DNS rebinding及不必要的网络暴露风险；不意味着静态构建包有同样风险，也没有证据显示凭据已泄露。[Vite官方明确建议使用受控主机名列表](https://vite.dev/config/server-options.html#server-allowedhosts)。建议Studio所需主机名显式配置；普通本地开发仍使用回环地址。

### P2：最低 Node 版本声明与固定依赖不符

位置：[package.json:7](../artifacts/verification/studio-review/changed/package.json)。从 `>=22.12.0` 降为 `>=22.0.0`。实际固定 Vite 8.3.6 声明 `^20.19.0 || >=22.12.0`，Vitest 5.1.0 声明 `^22.12.0 || ^24.0.0 || >=26.0.0`。

影响：选用Node 22.0—22.11的环境会被项目声明误认为支持，实际工具链不支持。建议恢复至少22.12；已用Node22.23.2完成本次测试，没有安装旧Node复现实行失败。

### P2：改变本地端口使原进度暂时不可见

位置：[package.json:10](../artifacts/verification/studio-review/changed/package.json)、[vite.config.ts:6](../artifacts/verification/studio-review/changed/vite.config.ts)。默认从5173变为3000，而README仍写5173。IndexedDB按来源隔离，端口属于来源的一部分。

实际验证：在同一隔离浏览器会话内，旧端口保存后换新端口显示0项，返回旧端口刷新仍显示已保存答案。Chromium/WebKit均通过，确认是隔离而非数据被删除。

建议普通本地命令继续用5173，Studio单独传入3000。部署到新域名也不会自动继承本机记录，这是现有本地保存架构的限制；当前没有云同步或导入功能。

### P2（端口冲突时）：删除 strictPort 导致自动换端口

位置：[vite.config.ts:4–8](../artifacts/verification/studio-review/changed/vite.config.ts)。原 `strictPort:true` 被删除，解析后的值为false。

实际验证：临时占用测试端口58090后，服务自动监听58091。若Studio代理固定访问3000，类似冲突会导致预览访问错误端口。建议恢复 `strictPort:true`，冲突时明确报错。端口空闲时不影响学习。

### 导出包问题：缺少依赖锁文件

直接从原始导出副本执行 `npm ci --ignore-scripts --offline`，实际失败：EUSAGE，要求已有 package-lock.json。建议保留GitHub原锁文件，不用ZIP覆盖删除它。仓库锁文件在本轮未被修改；此问题仅对本次导出副本得到实证。

## 其他改动

- index.html增加Open Graph标题/描述，无入口或界面行为改变。
- `lint` 是 `tsc --noEmit` 的别名，与typecheck相同，不是新增独立风格检查。
- metadata.json声明 `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`，应用没有Gemini调用。可删除无用声明；仅凭字段不能断言发生调用或费用。
- .env.example只剩空Azure变量，原说明注释被删除。网页使用预生成MP3，不需要Azure密钥；变量仅由本地离线生成脚本读取。Studio显示的填写Azure变量提示不代表现有学习页面必须依赖它们。建议恢复用途说明，不向网页添加凭据。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| 逐文件对比 | 学习源码/测试/词库及110音频与基线一致 |
| npm test | 67通过，6个文件 |
| npm run typecheck | 通过 |
| npm run lint | 通过，实际重复类型检查 |
| npm run build | 通过，safari16构建目标保留 |
| Chromium/WebKit完整回归 | 47通过、1跳过 |
| 正式构建版播放、保存、换端口、返回恢复 | 两个浏览器均通过 |
| 构建后内容、音频哈希及JS/CSS | 与基线一致 |
| 任意Host请求 | 复现200响应并返回源码 |
| 端口被占用 | 复现自动递增端口 |
| 原始ZIP执行npm ci | 失败，缺锁文件 |

证据：`artifacts/verification/studio-review/`，包含 inventory.json、unit.log、typecheck.log、lint.log、build.log、browser.log、config-check.json、origin-check.json、build-integrity.json、clean-install.log。

测试使用本机已安装且锁定的原依赖，复用node_modules；**不是对Studio内实际安装依赖的一次独立干净安装验证**。因默认监听扩大，本地浏览器测试只在临时配置中覆盖为127.0.0.1:5184；未改下载的原配置。47项覆盖播放失败、重复点击、保存失败、刷新恢复、单元切换、重听和手机尺寸；跳过的是既有WebKit跨进程持久化用例，Chromium该用例执行通过。

## 独立审查与边界

另一位独立 reviewer 只读审查了基线与副本，确认上述4项配置问题；未参与实现或运行测试。本次没有发现需要改写学习业务逻辑的证据。

Studio内嵌预览可见，但其地址在无登录请求下返回302，不能据本地副本测试声称线上部署已完整验收。未操作生产学习记录，未验证正式公网域名、平台代理配置、真实iPhone Safari及Studio运行时依赖版本。

建议先修正上述配置并保留锁文件，再同步GitHub；不需要重新生成音频。应用内的词语、例句、评分、重听及同来源保存逻辑可以保留。
