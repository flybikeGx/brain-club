export type SessionKind = 'training' | 'assessment' | 'mindfulness';
export type Dimension = 'attention' | 'memory' | 'spatial' | 'reading' | 'mindfulness';
export type Difficulty = Record<string, number | string | boolean>;
export interface RawEvent {
  type: string;
  at: number;
  value?: number | string | boolean;
}
export interface EvidenceMetadata {
  level: 'task-specific' | 'limited' | 'practice';
  summary: string;
  limitations: string[];
  references: string[];
}
export interface GeneratedProblem {
  id: string;
  generatorId: string;
  generatorVersion: string;
  seed: string;
  difficulty: Difficulty;
  taskVariant: string;
}
export interface ExerciseGenerator<P extends GeneratedProblem, A> {
  id: string;
  version: string;
  generate(seed: string, difficulty: Difficulty, constraints?: Record<string, number>): P;
  validate(problem: P): boolean;
  solve(problem: P): A;
  score(problem: P, answer: A): number;
  serialize(problem: P): string;
}
export interface ExerciseScorer {
  (events: RawEvent[], difficulty: Difficulty): Record<string, number>;
}
export interface DifficultyController {
  (current: number, accuracy: number, min: number, max: number): number;
}
export interface ExerciseDefinition {
  id: string;
  version: string;
  title: string;
  dimension: Dimension;
  description: string;
  evidence: EvidenceMetadata;
  available: boolean;
}
export interface ExerciseAttempt {
  id: string;
  problemId: string;
  seed: string;
  difficulty: Difficulty;
  taskVariant: string;
  correct: boolean;
  responseMs: number;
}
export interface AssessmentResult {
  testId: string;
  testVersion: string;
  practiceTrials: number;
  metrics: Record<string, number>;
  limitations: string[];
}
export interface MindfulnessSession {
  anchor: 'breath' | 'body';
  mode: 'guided' | 'quiet';
  plannedSeconds: number;
  awarenessCount: number;
  before: number;
  after: number;
  comfortable: boolean;
  reflection: string;
  stage: number;
}
export interface DifficultyHistory {
  at: number;
  from: number;
  to: number;
  reason: string;
}
export interface Session {
  schemaVersion: 2;
  sessionId: string;
  kind: SessionKind;
  taskId: string;
  title: string;
  dimension: Dimension;
  generatorId: string;
  generatorVersion: string;
  seed: string;
  difficulty: Difficulty;
  taskVariant: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  accuracy: number | null;
  score: number | null;
  valid: boolean;
  invalidReason?: string;
  completed: boolean;
  eventLog: RawEvent[];
  metrics: Record<string, number>;
  attempts: ExerciseAttempt[];
  difficultyHistory: DifficultyHistory[];
  assessment?: AssessmentResult;
  mindfulness?: MindfulnessSession;
}
export interface UserPreferences {
  id: 'user';
  schemaVersion: 2;
  theme: 'light' | 'dark' | 'system';
  locale: 'zh-CN';
  mindfulnessStage: number;
}
export interface EvidenceReference {
  id: string;
  title: string;
  authors: string;
  year: number;
  url: string;
  note: string;
}
export interface ExerciseSession {
  sessionId: string;
  seed: string;
  startedAt: string;
  eventLog: RawEvent[];
}
export type ExerciseResult = Session;
export interface ExercisePlugin<P extends GeneratedProblem, A> {
  definition: ExerciseDefinition;
  generator: ExerciseGenerator<P, A>;
  adapt: (current: Difficulty, recent: ExerciseAttempt[]) => Difficulty;
  defaultDifficulty: Difficulty;
}
