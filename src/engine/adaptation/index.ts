import type { DifficultyController } from '@/domain/types';
export const adaptDifficulty: DifficultyController = (current, accuracy, min, max) => {
  const change = accuracy >= 0.8 ? 1 : accuracy < 0.5 ? -1 : 0;
  return Math.min(max, Math.max(min, current + change));
};
/** Conservative next-session suggestion; time thresholds are product settings, not population norms. */
export function suggestSchulteSize(size: number, accuracy: number, durationSeconds: number) {
  const step =
    accuracy < 0.8 ? -1 : accuracy >= 0.95 && durationSeconds / (size * size) < 1.5 ? 1 : 0;
  return Math.min(6, Math.max(3, size + step));
}
