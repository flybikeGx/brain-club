import type { ExerciseGenerator, GeneratedProblem } from '@/domain/types';
import { integer, rng } from '@/engine/generators/random';
export type DigitVariant = 'forward' | 'backward' | 'updating';
export interface DigitProblem extends GeneratedProblem {
  sequence: number[];
  recallLength: number;
  taskVariant: DigitVariant;
}
export const digitGenerator: ExerciseGenerator<DigitProblem, number[]> = {
  id: 'digit-training',
  version: '1.0.0',
  generate(seed, difficulty, constraints) {
    const length = integer(difficulty.length, 2, integer(constraints?.maxLength, 2, 12, 12), 3),
      random = rng(seed);
    const taskVariant: DigitVariant =
      difficulty.variant === 'backward' || difficulty.variant === 'updating'
        ? difficulty.variant
        : 'forward';
    const count = taskVariant === 'updating' ? length + integer(difficulty.extra, 2, 6, 3) : length;
    return {
      id: `digits:${seed}:${length}:${taskVariant}`,
      generatorId: this.id,
      generatorVersion: this.version,
      seed,
      difficulty: { ...difficulty, length, variant: taskVariant },
      taskVariant,
      sequence: Array.from({ length: count }, () => Math.floor(random() * 10)),
      recallLength: length,
    };
  },
  validate(p) {
    return (
      p.recallLength >= 2 &&
      p.recallLength <= 12 &&
      p.sequence.length >= p.recallLength &&
      p.sequence.every((x) => Number.isInteger(x) && x >= 0 && x <= 9)
    );
  },
  solve(p) {
    return p.taskVariant === 'backward'
      ? [...p.sequence].reverse()
      : p.sequence.slice(-p.recallLength);
  },
  score(p, a) {
    const b = this.solve(p);
    return a.length === b.length && a.every((v, i) => v === b[i]) ? 1 : 0;
  },
  serialize(p) {
    return JSON.stringify(p);
  },
};
export const parseDigits = (text: string) =>
  text
    .trim()
    .replace(/[\s,，]/g, '')
    .split('')
    .map(Number);
