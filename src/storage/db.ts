import Dexie, { type EntityTable } from 'dexie';
import type { Session, UserPreferences } from '@/domain/types';
export interface Draft {
  id: string;
  value: unknown;
  updatedAt: string;
}
export class MindGymDB extends Dexie {
  sessions!: EntityTable<Session, 'sessionId'>;
  preferences!: EntityTable<UserPreferences, 'id'>;
  drafts!: EntityTable<Draft, 'id'>;
  constructor(name = 'mindgym-local') {
    super(name);
    this.version(1).stores({
      sessions: 'sessionId,taskId,kind,startedAt',
      preferences: 'id',
      drafts: 'id',
    });
    this.version(2)
      .stores({
        sessions: 'sessionId,taskId,kind,startedAt,dimension',
        preferences: 'id',
        drafts: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('sessions')
          .toCollection()
          .modify((row) => {
            row.schemaVersion = 2;
            row.difficultyHistory ??= [];
            row.attempts ??= [];
          }),
      );
  }
}
export const db = new MindGymDB();
export async function saveSession(session: Session) {
  await db.sessions.put(session);
}
export interface Backup {
  format: 'mindgym';
  schemaVersion: 2;
  exportedAt: string;
  sessions: Session[];
  preferences: UserPreferences[];
}
export async function exportData(): Promise<Backup> {
  return {
    format: 'mindgym',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    sessions: await db.sessions.toArray(),
    preferences: await db.preferences.toArray(),
  };
}
export function validateBackup(input: unknown): Backup {
  if (!input || typeof input !== 'object') throw new Error('备份文件格式不正确');
  const b = input as Record<string, unknown>;
  if (
    b.format !== 'mindgym' ||
    ![1, 2].includes(Number(b.schemaVersion)) ||
    !Array.isArray(b.sessions) ||
    !Array.isArray(b.preferences)
  )
    throw new Error('不支持的备份格式或版本');
  if (b.sessions.length > 50000) throw new Error('备份超过 50,000 条记录限制');
  const sessions = b.sessions.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('记录格式不正确');
    const r = raw as Record<string, unknown>;
    for (const key of [
      'sessionId',
      'taskId',
      'title',
      'generatorId',
      'generatorVersion',
      'seed',
      'taskVariant',
      'startedAt',
      'endedAt',
    ])
      if (typeof r[key] !== 'string' || (r[key] as string).length > 1000)
        throw new Error(`记录字段无效：${key}`);
    if (
      !Number.isFinite(Date.parse(String(r.startedAt))) ||
      !Number.isFinite(Date.parse(String(r.endedAt)))
    )
      throw new Error('记录日期无效');
    if (
      !['training', 'assessment', 'mindfulness'].includes(String(r.kind)) ||
      !['attention', 'memory', 'spatial', 'reading', 'mindfulness'].includes(String(r.dimension))
    )
      throw new Error('记录类别无效');
    if (
      typeof r.duration !== 'number' ||
      !Number.isFinite(r.duration) ||
      r.duration < 0 ||
      r.duration > 86400
    )
      throw new Error('记录时长无效');
    if (
      r.accuracy !== null &&
      (typeof r.accuracy !== 'number' ||
        !Number.isFinite(r.accuracy) ||
        r.accuracy < 0 ||
        r.accuracy > 1)
    )
      throw new Error('正确率无效');
    if (r.score !== null && (typeof r.score !== 'number' || !Number.isFinite(r.score)))
      throw new Error('成绩无效');
    if (
      typeof r.valid !== 'boolean' ||
      typeof r.completed !== 'boolean' ||
      !Array.isArray(r.eventLog) ||
      r.eventLog.length > 100000 ||
      !r.metrics ||
      typeof r.metrics !== 'object' ||
      !r.difficulty ||
      typeof r.difficulty !== 'object'
    )
      throw new Error('记录缺少必要字段');
    if (!Object.values(r.metrics).every((v) => typeof v === 'number' && Number.isFinite(v)))
      throw new Error('指标无效');
    if (
      !r.eventLog.every(
        (e: unknown) =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as Record<string, unknown>).type === 'string' &&
          typeof (e as Record<string, unknown>).at === 'number' &&
          Number.isFinite((e as Record<string, unknown>).at),
      )
    )
      throw new Error('事件日志无效');
    if (
      !Object.values(r.difficulty).every(
        (v) =>
          typeof v === 'string' ||
          typeof v === 'boolean' ||
          (typeof v === 'number' && Number.isFinite(v)),
      )
    )
      throw new Error('难度参数无效');
    if (
      r.attempts !== undefined &&
      (!Array.isArray(r.attempts) ||
        !r.attempts.every((a: unknown) => {
          if (!a || typeof a !== 'object') return false;
          const item = a as Record<string, unknown>;
          return (
            ['id', 'problemId', 'seed', 'taskVariant'].every((k) => typeof item[k] === 'string') &&
            typeof item.correct === 'boolean' &&
            typeof item.responseMs === 'number' &&
            Number.isFinite(item.responseMs) &&
            item.responseMs >= 0 &&
            Boolean(item.difficulty) &&
            typeof item.difficulty === 'object'
          );
        }))
    )
      throw new Error('逐题记录无效');
    if (
      r.difficultyHistory !== undefined &&
      (!Array.isArray(r.difficultyHistory) ||
        !r.difficultyHistory.every((h: unknown) => {
          if (!h || typeof h !== 'object') return false;
          const item = h as Record<string, unknown>;
          return (
            ['at', 'from', 'to'].every(
              (k) => typeof item[k] === 'number' && Number.isFinite(item[k]),
            ) && typeof item.reason === 'string'
          );
        }))
    )
      throw new Error('难度历史无效');
    if (r.assessment) {
      const a = r.assessment as Record<string, unknown>;
      if (
        typeof a.testId !== 'string' ||
        typeof a.testVersion !== 'string' ||
        typeof a.practiceTrials !== 'number' ||
        !Array.isArray(a.limitations) ||
        !a.limitations.every((v) => typeof v === 'string')
      )
        throw new Error('测评记录无效');
    }
    if (r.mindfulness) {
      const m = r.mindfulness as Record<string, unknown>;
      if (
        !['breath', 'body'].includes(String(m.anchor)) ||
        !['guided', 'quiet'].includes(String(m.mode)) ||
        typeof m.awarenessCount !== 'number' ||
        typeof m.plannedSeconds !== 'number' ||
        typeof m.before !== 'number' ||
        typeof m.after !== 'number' ||
        typeof m.stage !== 'number' ||
        typeof m.reflection !== 'string' ||
        typeof m.comfortable !== 'boolean'
      )
        throw new Error('正念记录无效');
    }
    return {
      ...r,
      schemaVersion: 2,
      attempts: Array.isArray(r.attempts) ? r.attempts : [],
      difficultyHistory: Array.isArray(r.difficultyHistory) ? r.difficultyHistory : [],
    } as unknown as Session;
  });
  const preferences = b.preferences.map((p: unknown) => {
    const r = p as UserPreferences;
    if (
      !r ||
      r.id !== 'user' ||
      !['light', 'dark', 'system'].includes(r.theme) ||
      r.locale !== 'zh-CN' ||
      !Number.isInteger(r.mindfulnessStage) ||
      r.mindfulnessStage < 1 ||
      r.mindfulnessStage > 4
    )
      throw new Error('设置格式无效');
    return { ...r, schemaVersion: 2 as const };
  });
  return {
    format: 'mindgym',
    schemaVersion: 2,
    exportedAt: String(b.exportedAt),
    sessions,
    preferences,
  };
}
export async function importData(input: unknown) {
  const backup = validateBackup(input);
  await db.transaction('rw', db.sessions, db.preferences, async () => {
    await db.sessions.bulkPut(backup.sessions);
    await db.preferences.bulkPut(backup.preferences);
  });
  return backup.sessions.length;
}
export async function clearData() {
  await db.transaction('rw', db.sessions, db.preferences, db.drafts, async () => {
    await db.sessions.clear();
    await db.preferences.clear();
    await db.drafts.clear();
  });
}
