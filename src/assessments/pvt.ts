import type { RawEvent } from '@/domain/types';
export function scorePvt(events: RawEvent[]) {
  const times = events
    .filter(
      (e) =>
        e.type === 'response' && typeof e.value === 'number' && e.value >= 100 && e.value <= 1500,
    )
    .map((e) => Number(e.value))
    .sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  return {
    trials: events.filter((e) => e.type === 'stimulus').length,
    censored: events.filter((e) => e.type === 'censored').length,
    omissions: events.filter((e) => e.type === 'omission').length,
    falseStarts: events.filter((e) => e.type === 'false-start').length,
    anticipations: events.filter((e) => e.type === 'anticipation').length,
    lapses: times.filter((t) => t > 500).length,
    ...(times.length
      ? {
          medianRtMs: times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2,
          meanRtMs: times.reduce((a, b) => a + b, 0) / times.length,
        }
      : {}),
  };
}
