import type { Difficulty, GeneratedProblem } from '@/domain/types';
import { integer, rng } from '@/engine/generators/random';
export interface PvtSchedule extends GeneratedProblem {
  intervals: number[];
  seconds: number;
  minInterval: number;
  maxInterval: number;
}
/** Timing tasks generate stimulus schedules; they have no static answer to solve. */
export const pvtScheduleGenerator = {
  id: 'assessment-pvt',
  version: '1.0.0',
  generate(seed: string, difficulty: Difficulty): PvtSchedule {
    const seconds = integer(difficulty.seconds, 60, 600, 180);
    const minInterval = integer(difficulty.minInterval, 1000, 5000, 2000);
    const maxInterval = integer(difficulty.maxInterval, minInterval, 10000, 5000);
    const random = rng(`${seed}:intervals`);
    // Includes enough intervals even if every stimulus receives an immediate response.
    const intervals = Array.from(
      { length: Math.ceil((seconds * 1000) / minInterval) + 4 },
      () => minInterval + Math.floor(random() * (maxInterval - minInterval + 1)),
    );
    return {
      id: `pvt:${seed}`,
      generatorId: this.id,
      generatorVersion: this.version,
      seed,
      difficulty: { seconds, minInterval, maxInterval, timeoutMs: 1500 },
      taskVariant: 'short-pvt',
      intervals,
      seconds,
      minInterval,
      maxInterval,
    };
  },
  validate(p: PvtSchedule) {
    return (
      p.intervals.length >= Math.ceil((p.seconds * 1000) / p.minInterval) &&
      p.intervals.every((ms) => Number.isInteger(ms) && ms >= p.minInterval && ms <= p.maxInterval)
    );
  },
  serialize(p: PvtSchedule) {
    return JSON.stringify(p);
  },
};
