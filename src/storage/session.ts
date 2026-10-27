import type { Session, SessionKind, Dimension } from '@/domain/types';
export function createSession(input: {
  kind: SessionKind;
  taskId: string;
  title: string;
  dimension: Dimension;
  seed: string;
  generatorId: string;
  generatorVersion: string;
  taskVariant: string;
  difficulty: Session['difficulty'];
}): Session {
  const timestamp = new Date().toISOString();
  return {
    schemaVersion: 2,
    sessionId: crypto.randomUUID(),
    ...input,
    startedAt: timestamp,
    endedAt: timestamp,
    duration: 0,
    accuracy: null,
    score: null,
    valid: true,
    completed: true,
    eventLog: [],
    metrics: {},
    attempts: [],
    difficultyHistory: [],
  };
}
