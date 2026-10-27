# 推送到 GitHub

本地仓库使用 `main` 分支，首次提交包含源码、pnpm 锁文件、配置、测试、说明文档与项目截图。依赖目录、构建产物、测试报告、环境文件和本地训练备份不会纳入版本控制。

## 第一次推送

1. 在 GitHub 创建一个空仓库，名称可选 `mindgym` 或 `brain-club`。先不要勾选自动生成 README、`.gitignore` 或许可证，避免与本地首次提交产生独立历史。
2. 在本机终端进入项目目录：

   ```sh
   cd /Users/flybike/code/brain-club
   ```

3. 将示例中的 `YOUR_USERNAME` 与 `YOUR_REPOSITORY` 替换成实际账号和仓库名，再执行：

   ```sh
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

也可使用 GitHub 仓库页面提供的 SSH 地址；认证使用你本机已有的 GitHub 凭据或 SSH 密钥。

如果此前已配置 `origin`，先运行 `git remote -v` 核对；需要更换地址时使用 `git remote set-url origin`，无需再次执行 `remote add`。远程仓库不是空仓库时，应先检查远程历史再合并，不要直接强制覆盖。

## 后续更新

```sh
pnpm check
git status
git add src tests docs README.md package.json pnpm-lock.yaml
git diff --cached
git commit -m "Describe the change"
git push
```

新增配置文件时也应显式加入暂存区。训练记录实际保存在浏览器 IndexedDB 中，不会因推送代码自动备份；请通过应用设置页单独导出 JSON。
