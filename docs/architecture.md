# 架构与插件规范

```text
src/
  app/                  页面与 App Router 路由
  components/           导航、可复用界面、真实数据图表、序列任务界面
  domain/types.ts       Session / Attempt / Assessment / Mindfulness 等契约
  exercises/            训练生成器、器械界面、目录及插件定义
  assessments/          体测协议、空间生成器、阅读提供者与 PVT 评分
  mindfulness/          计时、阶段、状态记录与恢复逻辑
  engine/
    generators/         128 位种子、PRNG、排列、重复检测
    adaptation/         难度边界、阶梯规则、舒尔特难度建议
    telemetry/          单调活动时钟、事件、失焦处理与记录保存
  storage/              Dexie schema、迁移、备份校验与事务
  lib/                  格式、locale 预留、文献元数据
  tests/                生成器、计时、评分、存储与迁移单元测试
tests/e2e/              Playwright 用户流程
```

业务计算尽量使用纯函数，与 React 分离。`ExerciseDefinition` / `ExerciseGenerator` / `ExerciseSession` / `ExerciseResult` / `ExerciseScorer` / `DifficultyController` / `EvidenceMetadata` 在领域层定义。`exercises/plugins.ts` 展示三种强类型插件组合；具体界面负责呈现与交互，纯生成器不访问 DOM、时钟或数据库。

### 生成器规范与复现

```ts
interface ExerciseGenerator<P extends GeneratedProblem, A> {
  id: string;
  version: string;
  generate(seed: string, difficulty: Difficulty, constraints?: Record<string, number>): P;
  validate(problem: P): boolean;
  solve(problem: P): A;
  score(problem: P, answer: A): number;
  serialize(problem: P): string;
}
```

使用 xoshiro128**，以完整字符串种子混合四个 32 位状态。会话种子由 `crypto.getRandomValues` 提供 128 位随机值，再附加训练 / 体测 / 正念命名空间。相同生成器版本、种子、难度及约束可重建同一题。它是生成伪随机题目的工具，不是密码学随机源。改变算法时必须提升生成器版本，并保留旧版生成策略或提供明确迁移方案。

逐题种子由会话种子、阶段、试次和重试序号组成，正式答案事件、逐题配置与种子随记录保存。实际调用传入的约束会转成有效难度：支持 `maxSize`、`maxLength`、`maxSpan`、`maxComplexity` 和 `maxOptions`。

数字 / 空间训练的 `RepeatGuard` 对本次会话内的题目内容去重；旋转对标准化形状去重，数字对序列去重。舒尔特单次只生成一张无重复数字的排列。**没有跨会话的全题目永久去重，也不声称永不重复或数学意义上的无限题量**。有限长度数字串、网格排列和有限复杂度图形都具有有限状态空间。大种子空间、参数化生成与多策略扩展增加题目覆盖，但不消除学习固定技巧的可能。

### 增加一种器械

1. 在 `src/exercises/<id>/generator.ts` 定义题目与答案类型，实现上述六方法。正确答案由规则求解，不能靠随机标签制造。反应任务没有静态答案，使用独立的 `pvtScheduleGenerator` 生成和校验刺激计划，再通过事件评分器分析实际反应。
2. `generate` 必须无副作用，约束非法参数，记录有效参数。`validate` 检查题目不变式及正确答案唯一性。
3. 在 `catalog.ts` 增加 `ExerciseDefinition` 和 `EvidenceMetadata`，再提供 `ExercisePlugin`（含默认难度和自适应规则）。规划功能须保持 `available: false`。
4. 创建界面，通过 `useTask` 记录 `performance.now()` 相对毫秒事件；在合适时机调用 `finish` 保存规范化 `Session`，处理失焦暂停或作废。按版本 / 配置分开比较历史。
5. 在训练路由注册界面组件（目前是显式选择，不支持运行时加载第三方代码）。增加多种子、不变式、边界、可复现与标准答案测试，再添加一条完整交互测试。

### 增加一种测评

1. 在 `assessments/engine.ts` 注册 `AssessmentDefinition`，明确 ID、版本、维度、说明、练习 / 正式试次、计分、重复测试控制和限制。
2. 通过 `AssessmentPlugin<P, A>` 组合确定性生成器或材料提供者。训练和测评必须具有独立生成 ID / 版本配置 / 种子命名空间。
3. 实现先练习后正式的流程。正式阶段不能显示答案；记录 `AssessmentResult` 与原始指标，不合成“脑力总分”。失焦或后台节流时中断并作废。
4. 新阅读材料实现 `ReadingProvider`，提供稳定材料 ID / 版本与标准答案。导入前检查授权、题意及答案；不能仅替换随机数字充当新阅读材料。
5. 新测评初始只解释个人专项表现。只有经过真实常模与效度验证后，才能考虑额外解释；本项目没有这些数据。

### 存储与隐私

`MindGymDB` 使用 schema version 2，`Session` 和偏好包含 `schemaVersion: 2`。v1 升级会补齐 attempts 和 difficultyHistory；迁移有测试。备份接受 v1/v2 格式，验证完成后在同一 IndexedDB 事务中合并。

记录包含 Session、ExerciseAttempt、AssessmentResult、MindfulnessSession、DifficultyHistory；偏好独立存储；EvidenceReference 以静态文献元数据提供，无须复制进每条训练记录。记录时长单位为秒，事件和反应时为毫秒；日期是 ISO 时间戳，展示使用浏览器本地时区。

数据按浏览器来源隔离，因此 `localhost` 与 `127.0.0.1`、不同端口也可能看到不同记录。请固定入口。清除站点数据、隐私模式结束或浏览器清理可能丢失数据；本机备份也包含个人状态与复盘，请自行妥善保管。应用不发送训练遥测；Next.js 开发 / 构建工具自己的遥测可通过 `NEXT_TELEMETRY_DISABLED=1` 关闭。

`pnpm typecheck` 会先运行 `next typegen`，生成路由类型与 `next-env.d.ts`，再运行 strict TypeScript 检查。生成文件不提交到 Git。评分函数当前与对应生成器或测评协议同置。
