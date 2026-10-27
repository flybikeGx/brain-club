import type { Session } from '@/domain/types';

/** Elapsed times are rounded to the nearest millisecond, without rounding whole seconds up. */
export const timeWithMilliseconds = (seconds: number) => {
  const milliseconds = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 1000));
  const minutes = Math.floor(milliseconds / 60000);
  const wholeSeconds = Math.floor((milliseconds % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
};

export const sessionDuration = (session: Pick<Session, 'taskId' | 'duration'>) =>
  session.taskId === 'schulte' ? timeWithMilliseconds(session.duration) : time(session.duration);

export const time = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};
export const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
export const taskNames: Record<string, string> = {
  schulte: '舒尔特方格',
  'digit-training': '数字记忆训练',
  'spatial-rotation': '二维空间旋转',
  'digit-forward': '顺序数字广度',
  'digit-backward': '倒序数字广度',
  corsi: '空间序列广度',
  pvt: '简短警觉性任务',
  reading: '阅读理解',
  mindfulness: '正念练习',
};
export const locale = { 'zh-CN': { appName: '健脑房', localOnly: '数据仅保存在本机' } } as const;
