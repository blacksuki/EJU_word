# 第一阶段环境记录

实测Node v22.23.2、npm 10.9.8。此前src/server/scripts/content/public/tests均无文件，无package或锁文件。复用WordTest目录。

官方包元数据：Vite8.3.6要求Node ^20.19.0或>=22.12；Vitest5.1.0要求^22.12或^24或>=26；Playwright1.64.1要求>=20；当前Node满足。React19.3.1。具体解析版本见package-lock.json。

来源：https://vite.dev/guide/ 、https://vitest.dev/guide/ 、npm view官方注册表。仅安装首阶段前端、IndexedDB测试、浏览器测试依赖；不安装Firestore或FSRS。

Git检测受系统Xcode未接受协议阻断；未接受协议，未建Git仓库或worktree。按照用户指定工作根目录原位执行，保留文件级证据，不声称已提交。
