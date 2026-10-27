import type { ExerciseGenerator, GeneratedProblem, RawEvent } from '@/domain/types';
import { integer, rng, shuffle } from '@/engine/generators/random';
export interface SchulteProblem extends GeneratedProblem {
  size: number;
  cells: number[];
}
export const schulteGenerator: ExerciseGenerator<SchulteProblem, number[]> = {
  id: 'schulte-grid',
  version: '1.0.0',
  generate(seed, difficulty, constraints) {
    const size = integer(difficulty.size, 3, integer(constraints?.maxSize, 3, 6, 6), 4);
    return {
      id: `schulte:${seed}:${size}`,
      generatorId: this.id,
      generatorVersion: this.version,
      seed,
      difficulty: { ...difficulty, size },
      taskVariant: 'ascending',
      size,
      cells: shuffle(
        Array.from({ length: size * size }, (_, i) => i + 1),
        rng(seed),
      ),
    };
  },
  validate(p) {
    return (
      p.size >= 3 &&
      p.size <= 6 &&
      p.cells.length === p.size ** 2 &&
      [...p.cells].sort((a, b) => a - b).every((v, i) => v === i + 1)
    );
  },
  solve(p) {
    return [...p.cells].sort((a, b) => a - b);
  },
  score(p, answer) {
    return answer.filter((v, i) => v === i + 1).length / p.size ** 2;
  },
  serialize(p) {
    return JSON.stringify(p);
  },
};
export function scoreSchulte(problem: SchulteProblem, events: RawEvent[]) {
  let next = 1,
    errors = 0,
    previous = 0;
  const reactionTimes: number[] = [];
  for (const e of events) {
    if (e.type !== 'select' || next > problem.size ** 2) continue;
    if (e.value === next) {
      reactionTimes.push(Math.max(0, e.at - previous));
      previous = e.at;
      next++;
    } else errors++;
  }
  return {
    completed: next === problem.size ** 2 + 1,
    errors,
    correct: next - 1,
    durationMs: previous,
    reactionTimes,
  };
}
