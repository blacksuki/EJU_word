# 词义页两侧箭头

用户实机反馈要求：取消底部双按钮，改为左右两侧居中的箭头；只有标记听懂/没听懂后的词义页支持滑动，播放页不滑动。

实现：词义卡片左右留出独立区域，箭头居中对齐卡片，图标24px、点击区域至少44×52px，使用可访问按钮（前一个/下一项/完成重听），同时支持滑动；首项左箭头禁用。按钮不遮挡正文，保留清晰焦点样式和原保存保护。播放页不显示箭头、不响应滑动，保留显式“暂时跳过”，兼容用户此前允许跳过后补学的要求。底部继续回到学习单元。

沿用用户明确指定的左滑前一个、右滑下一个，不声称这是所有平台统一的手势方向。重听属于显示答案的页面，也支持侧边箭头与滑动，记录只读。

依据：Apple Gestures (https://developer.apple.com/design/human-interface-guidelines/gestures) 的易用手势与替代操作原则；Apple Buttons (https://developer.apple.com/design/human-interface-guidelines/buttons) 的44×44pt触控区；Material Accessibility (https://m1.material.io/usability/accessibility.html) 的小图标配大触控区。这是网页适配（CSS像素），不将pt/dp直接当作物理尺寸保证。

验收：先验证播放页禁止滑动与侧边布局的失败，再实现；更新原跳过测试为显式跳过，保留数据断言；全部50项、首尾、重听、保存失败、左右点击、手势与触控区域回归；检查窄屏正文不遮挡及原生Chromium触摸。无新依赖，不改变存储规则，不部署。
