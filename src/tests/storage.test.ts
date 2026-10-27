import { afterEach, describe, expect, it } from 'vitest';
import { db, MindGymDB, importData, exportData, clearData, validateBackup } from '@/storage/db';
import { createSession } from '@/storage/session';
function fixture() {
  return createSession({
    kind: 'training',
    taskId: 'schulte',
    title: '舒尔特方格',
    dimension: 'attention',
    seed: 'training:seed',
    generatorId: 'schulte-grid',
    generatorVersion: '1.0.0',
    taskVariant: 'ascending',
    difficulty: { size: 3 },
  });
}
afterEach(async () => {
  await clearData();
});
describe('IndexedDB 持久化', () => {
  it('关闭并重新打开连接后能恢复会话', async () => {
    const s = fixture();
    await db.sessions.put(s);
    db.close();
    await db.open();
    expect(await db.sessions.get(s.sessionId)).toEqual(s);
  });
  it('导出、删除、导入和同 ID 合并', async () => {
    const s = fixture();
    s.duration = 10;
    await db.sessions.put(s);
    const backup = await exportData();
    await clearData();
    expect(await db.sessions.count()).toBe(0);
    expect(await importData(backup)).toBe(1);
    expect(await db.sessions.get(s.sessionId)).toEqual(s);
    await importData(backup);
    expect(await db.sessions.count()).toBe(1);
  });
  it('整个备份先校验，坏数据不产生部分写入', async () => {
    const s = fixture(),
      b = {
        format: 'mindgym',
        schemaVersion: 2,
        sessions: [s, { ...fixture(), duration: -1 }],
        preferences: [],
      };
    await expect(importData(b)).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
    expect(() => validateBackup({ ...b, schemaVersion: 999 })).toThrow();
  });
  it('损坏事件、NaN、无效偏好被拒绝', () => {
    const s = fixture(),
      base = { format: 'mindgym', schemaVersion: 2, sessions: [s], preferences: [] };
    for (const bad of [
      { ...s, accuracy: 2 },
      { ...s, metrics: { x: NaN } },
      { ...s, eventLog: [{ type: 'click', at: 'bad' }] },
    ])
      expect(() => validateBackup({ ...base, sessions: [bad] })).toThrow();
    expect(() =>
      validateBackup({ ...base, preferences: [{ id: 'user', theme: 'bad' }] }),
    ).toThrow();
  });
  it('v1 数据库升级到 v2 保留记录并补齐新字段', async () => {
    const name = `migration-${crypto.randomUUID()}`,
      old = new (await import('dexie')).default(name);
    old
      .version(1)
      .stores({ sessions: 'sessionId,taskId,kind,startedAt', preferences: 'id', drafts: 'id' });
    const s = fixture();
    await old
      .table('sessions')
      .put({ ...s, schemaVersion: 1, attempts: undefined, difficultyHistory: undefined });
    old.close();
    const upgraded = new MindGymDB(name);
    const restored = await upgraded.sessions.get(s.sessionId);
    expect(restored?.schemaVersion).toBe(2);
    expect(restored?.attempts).toEqual([]);
    expect(restored?.difficultyHistory).toEqual([]);
    await upgraded.delete();
  });
  it('正念恢复草稿在连接重开后保留', async () => {
    const value = { elapsed: 12, phase: 'running', awareness: 2 };
    await db.drafts.put({ id: 'mindfulness', value, updatedAt: new Date().toISOString() });
    db.close();
    await db.open();
    expect((await db.drafts.get('mindfulness'))?.value).toEqual(value);
  });
});
