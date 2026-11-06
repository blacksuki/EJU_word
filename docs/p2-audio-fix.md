# P2 音频重试评分状态：复现、根因与修复

结果：原审查的P2已修复，相关失败测试先红后绿，全套回归通过。只修改了播放器的一处状态更新，新增长期浏览器回归测试；未修改数据库、音频文件、内容版本或后续功能。

## 1. 先复现

实施前对比上轮审查文件哈希，src没有变化，确认仍是被审查的代码。把复现场景纳入 [audio-retry.spec.ts](../tests/e2e/audio-retry.spec.ts)：

- 首次词语播放成功 → 媒体error → 重试HTTP请求挂起 → 两个评分按钮必须禁用、数据库没有记录 → 请求404仍禁用 → 真正播放成功后允许评分。
- 同一卡第一次播放已成功，再次播放请求挂起，也不能复用上次成功来启用新评价。
- 例句失败/重试等待期间，已保存评价、可更正状态和审计关系保留。

先运行新增测试：两个浏览器各有2项评分保护断言失败，2项例句保护测试通过。失败明确是“Expected disabled / Received enabled”，不是环境无法启动。[确认的RED日志](../artifacts/verification/p2-audio-fix/red-confirmed.log)

初次测试还有一个测试拦截问题：WebKit先请求bytes=0-1，再请求完整音频，原拦截器挂起了后续Range请求，导致例句播放等待超时。读取网络trace确认后，仅挂起一次请求并放行后续请求；在未改产品代码时重新得到稳定的4失败/2通过。初始日志保留在 [red.log](../artifacts/verification/p2-audio-fix/red.log)，不把测试夹具故障冒充产品缺陷。

## 2. 定位根因

评分按钮原条件为 `!heard || audioError || busy`。

- 首播：heard初始false，在当前play成功后变true，行为正常。
- 重试：play开始就清除audioError，却没有清除上次成功遗留的heard。
- 所以新请求仍在等待时，heard=true且audioError为空，按钮提前解锁。

保存模块只收到合法的用户评分事件，本次问题发生在播放器的状态边界，不是IndexedDB写入或复习规则错误。

## 3. 最小修复

在 [StudyCard.tsx](../src/learning/StudyCard.tsx) 的每次词语播放开始处执行 `if(role==='listen')setHeard(false)`，再由原有当前attempt校验和play成功回调恢复heard。

这样评分资格属于当前播放尝试；等待或失败不会恢复。例句播放不清除词语状态，不触碰已经保存的评价。不要求必须播放至ended，正常开始成功后仍可自评。

对比审查快照，已有源码/配置/测试文件中只有StudyCard改变；另新增audio-retry.spec.ts和本轮说明及日志。没有新增依赖。

## 4. 实际回归结果

| 检查 | 结果 | 证据 |
|---|---|---|
| 新增定向浏览器测试 | Chromium/WebKit合计6/6通过，原4个失败转绿 | [green.log](../artifacts/verification/p2-audio-fix/green.log) |
| npm run test:e2e | 29通过、1既有跳过、0失败 | [browser-full.log](../artifacts/verification/p2-audio-fix/browser-full.log) |
| npm test | 23/23通过 | [unit.log](../artifacts/verification/p2-audio-fix/unit.log) |
| npm run typecheck | 退出0 | [typecheck.log](../artifacts/verification/p2-audio-fix/typecheck.log) |
| npm run build | 退出0，20模块 | [build.log](../artifacts/verification/p2-audio-fix/build.log) |

1项跳过仍是Chromium专用持久浏览器重启测试在WebKit项目中的跳过；Chromium本轮通过，WebKit刷新恢复通过。既有NO_COLOR/FORCE_COLOR提示仍存在，不影响结果。

复现的媒体error由测试主动派发，挂起/404和恢复使用浏览器实际请求，成功恢复使用项目真实MP3。没有把故障注入说成实际iPhone网络中断。iPhone真机、后台/锁屏、云端和部署仍未验证；本轮不部署，也不扩大阶段范围。
