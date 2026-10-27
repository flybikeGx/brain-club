import type { Dimension, Difficulty, GeneratedProblem, ExerciseGenerator } from '@/domain/types';
import { digitGenerator, type DigitProblem } from '@/exercises/digit-span/generator';
import { integer, rng, shuffle } from '@/engine/generators/random';
export interface AssessmentDefinition {
  id: string;
  version: string;
  dimension: Dimension;
  title: string;
  instructions: string[];
  practiceTrials: number;
  formalTrials: number;
  initialDifficulty: Difficulty;
  scoring: string;
  repeatControl: string;
  limitations: string[];
}
export interface AssessmentPlugin<P extends GeneratedProblem, A> {
  definition: AssessmentDefinition;
  generator: ExerciseGenerator<P, A>;
}
const spanLimit = [
  '本测验没有人群常模，不提供百分位或诊断。',
  '重复测评存在练习效应；相同设备与设置下的多次结果才具有有限可比性。',
];
export const assessments: AssessmentDefinition[] = [
  {
    id: 'digit-forward',
    version: '1.0.0',
    dimension: 'memory',
    title: '顺序数字广度',
    instructions: [
      '每次依次呈现一个数字，请按原顺序输入。',
      '先完成 1 次练习，再进行 8 次正式测评。',
      '初始长度为 3；同长度连续正确 2 次升一级，连续错误 2 次降一级。正式阶段不显示答案。',
    ],
    practiceTrials: 1,
    formalTrials: 8,
    initialDifficulty: { length: 3, variant: 'forward', speed: 900 },
    scoring: '整串完全正确记为正确；最大广度为正式阶段正确复现的最长序列。',
    repeatControl: '每次从长度 3 开始，8 次正式试次，展示速度固定 900ms；结果应按方向分别比较。',
    limitations: spanLimit,
  },
  {
    id: 'digit-backward',
    version: '1.0.0',
    dimension: 'memory',
    title: '倒序数字广度',
    instructions: [
      '依次记住数字，再按照相反顺序输入。',
      '先完成 1 次练习，再进行 8 次正式测评。',
      '同长度连续正确 2 次升一级，连续错误 2 次降一级。正式阶段不显示答案。',
    ],
    practiceTrials: 1,
    formalTrials: 8,
    initialDifficulty: { length: 3, variant: 'backward', speed: 900 },
    scoring: '整串完全正确记为正确；报告最大成功广度和整串正确率。',
    repeatControl: '长度 3 起步，固定速度与试次数；与顺序广度分别报告。',
    limitations: spanLimit,
  },
  {
    id: 'corsi',
    version: '1.0.0',
    dimension: 'spatial',
    title: '空间序列广度',
    instructions: [
      '观察 9 个方块依次高亮，之后点击复现顺序。',
      '每个试次布局随机变化，请同时记住位置与顺序。',
      '1 次练习、8 次正式试次；同长度连续正确或错误 2 次调整广度。',
    ],
    practiceTrials: 1,
    formalTrials: 8,
    initialDifficulty: { length: 3, speed: 900 },
    scoring: '完整顺序正确才计为正确；报告最大成功广度与整串正确率。',
    repeatControl: '固定九宫格区域内抖动布局，初始广度 3，固定呈现速度。',
    limitations: [...spanLimit, '这是 Corsi-like 网页任务，不等同于标准 Corsi 量表。'],
  },
  {
    id: 'pvt',
    version: '1.0.0',
    dimension: 'attention',
    title: '简短警觉性任务',
    instructions: [
      '看到中央信号变绿时，尽快按空格键或点击反应区。',
      '信号间隔随机为 2–5 秒；信号出现前反应记为抢答。',
      '先完成 3 个练习刺激，再进行默认 3 分钟正式任务；1.5 秒未反应记为遗漏。',
    ],
    practiceTrials: 3,
    formalTrials: 0,
    initialDifficulty: { seconds: 180, minInterval: 2000, maxInterval: 5000 },
    scoring:
      '报告有效反应时中位数、反应时分布、>500ms 的迟缓次数、遗漏与抢答；<100ms 记为预期性反应。',
    repeatControl: '比较时应使用相同设备、时长、刺激间隔与输入方式。',
    limitations: [
      '这是 PVT-like 浏览器短任务，不是临床标准 PVT。',
      '显示器刷新、触屏、键盘、系统调度均引入延迟，不能声称实验室硬件精度。',
      '短测的可靠性和对睡眠不足的敏感性有限。',
    ],
  },
  {
    id: 'reading',
    version: '1.0.0',
    dimension: 'reading',
    title: '阅读理解',
    instructions: [
      '阅读一篇原创短文，回答 3 道理解题。',
      '先完成独立的示例练习题。正式阶段可回看原文。',
      '正式提交后显示总正确率，不在测评阶段泄露答案。',
    ],
    practiceTrials: 1,
    formalTrials: 3,
    initialDifficulty: { bankVersion: 'original-1' },
    scoring: '每题等权；报告正确题数、正确率与答题时长。',
    repeatControl: '材料来自有限原创样本，重复阅读会明显影响结果；记录材料 ID。',
    limitations: [
      '仅有 2 篇原创示例，未经过标准化、信度和效度验证。',
      '不能代表总体阅读水平，也不构成无限题库。',
    ],
  },
];
export const assessmentDigitGenerator: ExerciseGenerator<DigitProblem, number[]> = {
  ...digitGenerator,
  id: 'assessment-digit',
  version: '1.0.0',
};
export interface CorsiProblem extends GeneratedProblem {
  sequence: number[];
  positions: { x: number; y: number }[];
}
export const corsiGenerator: ExerciseGenerator<CorsiProblem, number[]> = {
  id: 'assessment-corsi',
  version: '1.0.0',
  generate(seed, difficulty, constraints) {
    const random = rng(seed),
      length = integer(difficulty.length, 2, integer(constraints?.maxSpan, 2, 9, 9), 3);
    return {
      id: `corsi:${seed}`,
      generatorId: this.id,
      generatorVersion: this.version,
      seed,
      difficulty: { length },
      taskVariant: 'spatial-forward',
      sequence: shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], random).slice(0, length),
      positions: Array.from({ length: 9 }, (_, i) => ({
        x: 10 + (i % 3) * 33 + random() * 8,
        y: 10 + Math.floor(i / 3) * 33 + random() * 8,
      })),
    };
  },
  validate(p) {
    return (
      p.sequence.length >= 2 &&
      p.sequence.length <= 9 &&
      new Set(p.sequence).size === p.sequence.length &&
      p.sequence.every((x) => x >= 0 && x < 9) &&
      p.positions.length === 9
    );
  },
  solve(p) {
    return [...p.sequence];
  },
  score(p, a) {
    return Number(a.length === p.sequence.length && a.every((v, i) => v === p.sequence[i]));
  },
  serialize(p) {
    return JSON.stringify(p);
  },
};
export function advanceSpan(length: number, streak: number, correct: boolean, max = 12) {
  const nextStreak = correct ? Math.max(0, streak) + 1 : Math.min(0, streak) - 1;
  if (Math.abs(nextStreak) < 2) return { length, streak: nextStreak };
  return { length: Math.max(2, Math.min(max, length + (correct ? 1 : -1))), streak: 0 };
}
