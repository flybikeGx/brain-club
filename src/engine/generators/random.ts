/** xoshiro128** with four independently mixed 32-bit state words. Seed strings are stable across platforms. */
export function rng(seed: string) {
  const state = [2166136261, 2246822519, 3266489917, 668265263];
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < seed.length; i++)
      state[j] = Math.imul(state[j] ^ seed.charCodeAt(i), 16777619 + j * 2) >>> 0;
  if ((state[0] | state[1] | state[2] | state[3]) === 0) state[0] = 1;
  const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));
  return () => {
    const result = Math.imul(rotl(Math.imul(state[1], 5), 7), 9) >>> 0;
    const t = state[1] << 9;
    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= t;
    state[3] = rotl(state[3], 11);
    return result / 4294967296;
  };
}
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function newSeed(namespace: 'assessment' | 'training' | 'mindfulness') {
  const values = crypto.getRandomValues(new Uint32Array(4));
  return `${namespace}:${Array.from(values, (x) => x.toString(16).padStart(8, '0')).join('')}`;
}
export const integer = (value: unknown, min: number, max: number, fallback: number) =>
  Math.max(
    min,
    Math.min(
      max,
      Math.round(typeof value === 'number' && Number.isFinite(value) ? value : fallback),
    ),
  );
export class RepeatGuard {
  private seen = new Set<string>();
  accept(serializedContent: string) {
    if (this.seen.has(serializedContent)) return false;
    this.seen.add(serializedContent);
    return true;
  }
}
