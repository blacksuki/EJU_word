# Git 代码管理

代码仓库：https://github.com/blacksuki/EJU_word （公开仓库）

SSH remote：git@github.com:blacksuki/EJU_word.git；默认分支 main。

## 纳入与排除

纳入源码、测试、锁定依赖、文档、已审核词库，以及 public 中运行必需的110段音频（当前50项100段，加原5项10段）。克隆后可以安装依赖、运行页面、执行单元测试并构建。

不纳入密钥、.env、原始学生 Pages 笔记、content/raw、artifacts 中的下载试卷/生成缓存/截图/临时日志、node_modules、dist 和测试报告。原文件留在本机，忽略规则不会删除它们。只提交空值的 .env.example。

历史文档中的 artifacts 链接为本机证据路径，GitHub上不提供这些文件。npm run check:content 需要本机原笔记和原文件摘要；npm run content:export 需要本机音频生成缓存和审核清单，二者不属于干净克隆后的基础运行检查。已提交的 public 包无需重新生成即可学习。

## 日常使用

```sh
git status
git add <本次修改的文件>
git commit -m "简要说明改动"
git push origin main
```

提交前运行与改动相关的测试；功能开发至少执行 npm test、npm run typecheck 和 npm run build。多人协作或较大功能可使用独立分支及 Pull Request。不要上传真实凭据或强制覆盖远端历史。

本机 /usr/bin/git 受未接受的 Xcode 协议影响；已安装的 Command Line Tools Git 可正常使用。若当前终端的 git 命令仍报协议错误，可以仅在该终端临时选择它：

```sh
export PATH="/Library/Developer/CommandLineTools/usr/bin:$PATH"
```

本项目 Git 提交身份使用 blacksuki 和 GitHub noreply 地址，仅设置在此仓库，不改变全局配置，避免公开个人工作邮箱。未代为接受 Xcode 协议，也未修改系统 Git。

推送代码不会部署学习网站；本轮没有配置 GitHub Pages 或自动部署。
