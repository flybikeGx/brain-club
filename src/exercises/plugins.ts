import type { ExercisePlugin, ExerciseAttempt } from '@/domain/types';
import { exercises } from './catalog';
import { schulteGenerator, type SchulteProblem } from './schulte/generator';
import { digitGenerator, type DigitProblem } from './digit-span/generator';
import { rotationGenerator, type RotationProblem } from './spatial-rotation/generator';
import { adaptDifficulty, suggestSchulteSize } from '@/engine/adaptation';
const accuracy = (recent: ExerciseAttempt[]) =>
  recent.length ? recent.filter((a) => a.correct).length / recent.length : 0.5;
export const schultePlugin: ExercisePlugin<SchulteProblem, number[]> = {
  definition: exercises[0],
  generator: schulteGenerator,
  defaultDifficulty: { size: 4, fontSize: 26, perNumber: true, dimCompleted: false },
  adapt: (current, recent) => ({
    ...current,
    size: recent.length
      ? suggestSchulteSize(
          Number(current.size),
          accuracy(recent),
          recent.reduce((sum, a) => sum + a.responseMs, 0) / 1000,
        )
      : Number(current.size),
  }),
};
export const digitPlugin: ExercisePlugin<DigitProblem, number[]> = {
  definition: exercises[1],
  generator: digitGenerator,
  defaultDifficulty: { length: 3, speed: 900, variant: 'forward' },
  adapt: (current, recent) => ({
    ...current,
    length: adaptDifficulty(Number(current.length), accuracy(recent), 2, 12),
  }),
};
export const rotationPlugin: ExercisePlugin<RotationProblem, number> = {
  definition: exercises[2],
  generator: rotationGenerator,
  defaultDifficulty: { complexity: 6, options: 3 },
  adapt: (current, recent) => ({
    ...current,
    complexity: adaptDifficulty(Number(current.complexity), accuracy(recent), 5, 12),
  }),
};
