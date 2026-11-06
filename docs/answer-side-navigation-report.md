# 词义页侧边箭头改进

2026-11-07。根据用户手机实测反馈调整，尚未提交、推送或部署。

## 最终交互

- 标记“听懂／没听懂”后的词义页：取消底部前后双按钮，卡片左右两侧居中显示箭头。箭头可点击，手机也可左滑前一个、右滑下一个。重听页同样适用，保持记录只读。
- 播放语音页：不显示左右箭头，不响应横滑，包括语音已经开始播放但尚未标记的状态。仍保留“暂时跳过”，延续用户此前允许以后补学的要求。
- 底部保留“回到学习单元”。首项左箭头禁用；末项按原逻辑进入完成/待补学页。保存中和评分未确认时不能绕过导航保护。
- 24px箭头图标配44×52px触控区，侧边独立留白，不遮挡正文或例句按钮；保留可访问名称、焦点样式和禁用状态。没有引入新依赖，也未改变评分/存储算法。

## 设计依据

参考 [Apple手势指南](https://developer.apple.com/design/human-interface-guidelines/gestures) 与 [按钮指南](https://developer.apple.com/design/human-interface-guidelines/buttons)，以及 [Material触控区指南](https://m1.material.io/usability/accessibility.html)：手势有可见点击替代，小图标保留足够触控区域，避免复杂手势。网页使用CSS像素适配，不能将44pt/48dp直接当作物理尺寸保证。

左右箭头居中是本项目根据用户反馈的布局选择；左滑前一个、右滑下一个沿用用户明确指定的方向，不声称这是所有移动应用统一的约定。

## 实际检查

- 先写浏览器失败测试，确认原版播放页会滑动且按钮位于底部，然后实施改动。
- `npm test`：75通过；`npm run typecheck`、`npm run build`通过。
- 新页面状态与全部50项布局专项：12通过。未作答、词义、重听和完成页在390×844、375×667、320×740、1280×800无页面溢出；极短屏和放大字号保留滚动可访问性。
- 完整浏览器回归：78通过、2跳过、0失败。跳过为既有WebKit跨进程持久化和Chromium专用CDP触摸用例的WebKit分支；对应Chromium测试已执行通过。日志为 `artifacts/verification/answer-navigation/browser-full.log`。
- 新测试验证箭头垂直中心、44px以上触控尺寸、视口边界、与正文间隔，以及中心和两侧内缘的实际elementFromPoint命中。并验证点击箭头、词义页滑动、播放前/播放中均不滑动。
- Chromium/CDP触摸输入与WebKit事件模拟、重复点击、补学、旧词修正、保存失败、刷新恢复及只读重听回归继续保留。
- 生产构建在Chromium/WebKit中播放、保存、刷新、单元切换、显式跳过、侧边前后导航和底部返回通过，无页面异常。

独立只读审查未发现新增产品流程问题；指出旧连续滑动测试先评分后仍断言空记录，已改成比较滑动前后的原评分完全一致。初轮失败日志保留为browser-first.log，最终结果另存。没有通过删除持久化断言规避失败。

## 证据与限制

证据目录：`artifacts/verification/answer-navigation/`，含red.log、layout-first.log、browser-first.log、browser-full.log、unit.log、typecheck.log、build.log、dist-smoke.log及answer-webkit.png。

未验证真实iPhone Safari系统返回手势、动态工具栏、VoiceOver和系统字号；WebKit模拟及Chromium CDP均不等于物理手机。本轮未推送GitHub或发布网站，线上不会自动变化。
