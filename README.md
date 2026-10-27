# MindGym · 健脑房

面向健康成年人的本地认知练习 Web 应用。以健身房为设计参照，提供认知体测、正念练习和专项训练。无需注册、付费 API 或远程数据库，训练记录仅保存在当前浏览器。

技术栈：Next.js App Router、React、strict TypeScript、Tailwind CSS、Dexie / IndexedDB、Vitest、Playwright，使用 pnpm 管理依赖。

## 快速启动

需要 Node.js 22.12+（22.x）、24.x 或 26+；`.nvmrc` 固定已验证的 Node.js 26.4.0。项目使用 pnpm 11.25.0。

如果终端提示 `pnpm: command not found`，先执行一次：

```sh
npm install --global pnpm@11.25.0
```

在项目根目录安装并启动：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

浏览器打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)，默认进入训练概览。

## 当前功能

- **认知体测**：顺序 / 倒序数字广度、空间序列广度、PVT-like 警觉性短测、有限原创材料的阅读理解。
- **正念跑步机**：可调时长与锚点、阶段提示、可选提示音及视觉引导、暂停继续、刷新恢复、状态记录与复盘。
- **三台可玩器械**：舒尔特方格、数字记忆、二维空间旋转。舒尔特支持毫秒计时与已点击数字显示选项；数字记忆有屏幕键盘；二维旋转答对自动切题，答错查看答案后继续。
- **本地数据**：训练历史、分任务趋势、难度轨迹、JSON 导入 / 导出 / 删除，以及深浅主题、响应式布局和键盘操作。

完整内容见[功能清单](docs/features.md)。界面截图：[首页](docs/screenshots/dashboard.png)、[数字记忆](docs/screenshots/digit-recall-desktop.png)、[二维旋转](docs/screenshots/rotation-desktop.png)、[移动端](docs/screenshots/rotation-mobile.png)、[深色模式](docs/screenshots/settings-dark.png)。

## 开发与验证

```sh
pnpm check                         # 类型检查、单元测试、生产构建
pnpm exec playwright install chromium
pnpm test:e2e                     # 浏览器交互测试
pnpm format:check                 # 检查代码与文档格式
```

开发阶段可单独运行 `pnpm typecheck`、`pnpm test`、`pnpm test:watch` 或 `pnpm build`。生产启动：

```sh
pnpm build
pnpm start
```

当前完整验证：30 个单元测试和 20 条 Chromium 交互测试通过，类型检查与生产构建通过。

`pnpm typecheck` 会自动生成 Next.js 类型，适用于全新克隆。`pnpm start` 需要已有生产构建。详见[测试说明](docs/testing.md)。

## 文档

- [架构、数据模型与插件规范](docs/architecture.md)：如何增加器械或测评。
- [测试范围与验证记录](docs/testing.md)。
- [未完成项与后续规划](docs/roadmap.md)。
- [科学证据与训练声明边界](docs/evidence.md)。
- [推送到 GitHub](docs/github.md)。

## 数据与训练边界

数据保存在当前浏览器的 IndexedDB 中，不上传、不跨浏览器同步；建议定期导出 JSON。`localhost`、`127.0.0.1` 和不同端口具有不同的数据空间，请固定访问入口。

题目与评分在客户端运行。已加载的训练可离线生成题目，完整 PWA 缓存尚未实现；断网后的新页面导航、冷启动和强制刷新可能不可用。阅读目前仅有两篇未标准化原创示例，八个扩展器械明确标记为“规划中”，真实知识提取与间隔复习尚未实现。

本产品不提供 IQ 或“脑力总分”，不诊断 ADHD、不治疗认知障碍，也不保证远迁移。浏览器任务没有完成实验室硬件计时校准。专项表现改善不能直接证明总体认知能力改善，详见[科学证据与声明边界](docs/evidence.md)。
