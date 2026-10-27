import type { ExerciseDefinition } from '@/domain/types';
const taskEvidence = {
  level: 'task-specific' as const,
  summary: '练习可以改善受训任务上的表现，迁移到日常能力的程度尚不确定。',
  limitations: ['成绩受策略学习和练习效应影响', '不能据此推断一般智力改善'],
  references: ['simons2016'],
};
export const exercises: ExerciseDefinition[] = [
  {
    id: 'schulte',
    version: '1.0.0',
    title: '舒尔特方格',
    dimension: 'attention',
    description: '在有序的目标与随机的空间之间，练习视觉搜索。',
    evidence: taskEvidence,
    available: true,
  },
  {
    id: 'digit-training',
    version: '1.0.0',
    title: '数字记忆',
    dimension: 'memory',
    description: '记住、逆转或更新一串数字，挑战你的记忆跨度。',
    evidence: taskEvidence,
    available: true,
  },
  {
    id: 'spatial-rotation',
    version: '1.0.0',
    title: '二维空间旋转',
    dimension: 'spatial',
    description: '在心中转动图形，分辨旋转与镜像。',
    evidence: taskEvidence,
    available: true,
  },
  ...[
    { id: 'rotation-3d', title: '三维心理旋转', dimension: 'spatial' },
    { id: 'spatial-cut', title: '空间切割', dimension: 'spatial' },
    { id: 'memory-update', title: '工作记忆更新', dimension: 'memory' },
    { id: 'retrieval', title: '主动提取与间隔复习', dimension: 'memory' },
    { id: 'language', title: '语言逻辑重建', dimension: 'reading' },
    { id: 'probability', title: '概率判断与决策', dimension: 'attention' },
    { id: 'tracking', title: '多目标追踪', dimension: 'attention' },
    { id: 'sustained', title: '持续注意力训练', dimension: 'attention' },
  ].map((x) => ({
    ...x,
    dimension: x.dimension as ExerciseDefinition['dimension'],
    version: '0.0.0',
    description: '插件接口已预留，尚未开放训练。',
    evidence: taskEvidence,
    available: false,
  })),
];
