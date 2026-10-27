import { describe, expect, it } from 'vitest';
import { rng, RepeatGuard } from '@/engine/generators/random';
import { schulteGenerator, scoreSchulte } from '@/exercises/schulte/generator';
import { digitGenerator, parseDigits } from '@/exercises/digit-span/generator';
import { rotationGenerator, signature, mirror, turn } from '@/exercises/spatial-rotation/generator';
import { corsiGenerator, assessmentDigitGenerator, advanceSpan } from '@/assessments/engine';
import { adaptDifficulty } from '@/engine/adaptation';
import { ActiveClock } from '@/engine/telemetry/clock';
import { scorePvt } from '@/assessments/pvt';
describe('种子与重复检测', () => {
  it('长种子可复现，使用末尾字符而非截断种子', () => {
    expect(Array.from({ length: 10 }, rng('abc'))).toEqual(Array.from({ length: 10 }, rng('abc')));
    expect(rng('a'.repeat(80) + '0')()).not.toBe(rng('a'.repeat(80) + '1')());
  });
  it('检测题目内容重复', () => {
    const g = new RepeatGuard();
    expect(g.accept('content')).toBe(true);
    expect(g.accept('content')).toBe(false);
  });
});
describe('舒尔特生成与评分', () => {
  for (const size of [3, 4, 5, 6])
    it(`${size}x${size} 多种子排列不变式`, () => {
      for (let i = 0; i < 150; i++) {
        const p = schulteGenerator.generate(`seed-${i}`, { size });
        expect(schulteGenerator.validate(p)).toBe(true);
        expect(schulteGenerator.generate(p.seed, { size })).toEqual(p);
        expect(schulteGenerator.solve(p)).toHaveLength(size * size);
      }
    });
  it('边界和非法参数约束', () => {
    for (const size of [-1, 0, 99, NaN])
      expect(schulteGenerator.validate(schulteGenerator.generate('s', { size }))).toBe(true);
  });
  it('完成判定、错误、总时长与逐数时间', () => {
    const p = schulteGenerator.generate('s', { size: 3 });
    const e = [
      { type: 'select', at: 50, value: 2 },
      ...Array.from({ length: 9 }, (_, i) => ({ type: 'select', at: 100 * (i + 1), value: i + 1 })),
    ];
    const r = scoreSchulte(p, e);
    expect(r.completed).toBe(true);
    expect(r.errors).toBe(1);
    expect(r.durationMs).toBe(900);
    expect(r.reactionTimes).toEqual(Array(9).fill(100));
    expect(scoreSchulte(p, e.slice(0, -1)).completed).toBe(false);
  });
});
describe('数字序列', () => {
  for (const variant of ['forward', 'backward', 'updating'])
    it(`${variant} 可复现，长度边界，答案唯一`, () => {
      for (let i = 0; i < 120; i++) {
        const p = digitGenerator.generate(`${i}`, { length: (i % 11) + 2, variant });
        expect(digitGenerator.validate(p)).toBe(true);
        expect(digitGenerator.generate(`${i}`, { length: (i % 11) + 2, variant })).toEqual(p);
        const a = digitGenerator.solve(p);
        expect(digitGenerator.score(p, a)).toBe(1);
        expect(digitGenerator.score(p, [...a, 0])).toBe(0);
        a[0] = (a[0] + 1) % 10;
        expect(digitGenerator.score(p, a)).toBe(0);
      }
    });
  it('正确处理前导零、倒序和更新规则', () => {
    const p = digitGenerator.generate('s', { length: 3 });
    p.sequence = [0, 2, 7];
    expect(digitGenerator.solve({ ...p, taskVariant: 'backward' })).toEqual([7, 2, 0]);
    expect(digitGenerator.score(p, parseDigits('0 2 7'))).toBe(1);
    expect(
      digitGenerator.solve({ ...p, taskVariant: 'updating', sequence: [3, 9, 0, 2, 7] }),
    ).toEqual([0, 2, 7]);
  });
  it('体测和训练独立的 ID 及种子', () => {
    const a = assessmentDigitGenerator.generate('assessment:abc', { length: 3 }),
      b = digitGenerator.generate('training:abc', { length: 3, speed: 700 });
    expect(a.generatorId).not.toBe(b.generatorId);
    expect(a.seed).not.toBe(b.seed);
  });
});
describe('空间生成', () => {
  it('多种子和难度下恰有一个正确答案，镜像永不与旋转等价', () => {
    for (let i = 0; i < 800; i++) {
      const d = { complexity: 5 + (i % 8), options: 2 + (i % 4) },
        p = rotationGenerator.generate(`large-seed-${i}`, d);
      expect(rotationGenerator.validate(p)).toBe(true);
      expect(rotationGenerator.generate(p.seed, d)).toEqual(p);
      expect(p.options.filter((_, j) => rotationGenerator.score(p, j) === 1)).toHaveLength(1);
      expect(signature(p.cells)).not.toBe(signature(mirror(p.cells)));
      expect(signature(turn(p.cells))).toBe(signature(p.cells));
      expect(rotationGenerator.solve(p)).toBeGreaterThanOrEqual(0);
    }
  });
  it('边界约束生成有效题', () => {
    for (const n of [-100, 0, 100, NaN])
      expect(
        rotationGenerator.validate(rotationGenerator.generate('s', { complexity: n, options: n })),
      ).toBe(true);
  });
  it('Corsi 位置不重叠、序列唯一且种子可复现', () => {
    for (let i = 0; i < 150; i++) {
      const p = corsiGenerator.generate(`${i}`, { length: (i % 8) + 2 });
      expect(corsiGenerator.validate(p)).toBe(true);
      expect(corsiGenerator.generate(`${i}`, { length: (i % 8) + 2 })).toEqual(p);
      expect(corsiGenerator.score(p, corsiGenerator.solve(p))).toBe(1);
      expect(corsiGenerator.score(p, [])).toBe(0);
      for (let a = 0; a < 9; a++)
        for (let b = a + 1; b < 9; b++)
          expect(
            Math.hypot(p.positions[a].x - p.positions[b].x, p.positions[a].y - p.positions[b].y),
          ).toBeGreaterThan(24);
    }
  });
});
describe('难度适应与时钟', () => {
  it('难度不会越界，准确率中段保持', () => {
    expect(adaptDifficulty(12, 1, 2, 12)).toBe(12);
    expect(adaptDifficulty(2, 0, 2, 12)).toBe(2);
    expect(adaptDifficulty(4, 0.7, 2, 12)).toBe(4);
    expect(advanceSpan(3, 1, true)).toEqual({ length: 4, streak: 0 });
    expect(advanceSpan(2, -1, false)).toEqual({ length: 2, streak: 0 });
    expect(advanceSpan(9, 1, true, 9).length).toBe(9);
  });
  it('暂停继续不累计暂停间隔，重复调用幂等，可从草稿恢复', () => {
    let now = 10;
    const c = new ActiveClock(() => now);
    c.start();
    c.start();
    now = 1010;
    expect(c.elapsed()).toBe(1000);
    c.pause();
    c.pause();
    now = 5010;
    expect(c.elapsed()).toBe(1000);
    c.start();
    now = 5510;
    expect(c.elapsed()).toBe(1500);
    const restored = new ActiveClock(() => now, c.elapsed());
    expect(restored.running).toBe(false);
    now += 10000;
    expect(restored.elapsed()).toBe(1500);
    restored.start();
    now += 500;
    expect(restored.elapsed()).toBe(2000);
  });
  it('PVT 中位数、迟缓、遗漏、抢答分开计数', () => {
    const metrics = scorePvt([
      { type: 'stimulus', at: 1 },
      { type: 'response', at: 300, value: 300 },
      { type: 'response', at: 600, value: 600 },
      { type: 'omission', at: 1800 },
      { type: 'false-start', at: 1801 },
      { type: 'anticipation', at: 1802, value: 30 },
    ]);
    expect(metrics.medianRtMs).toBe(450);
    expect(metrics.lapses).toBe(1);
    expect(metrics.omissions).toBe(1);
    expect(metrics.falseStarts).toBe(1);
    expect(metrics.anticipations).toBe(1);
    expect(scorePvt([]).medianRtMs).toBeUndefined();
  });
});
describe('生成器约束与内容序列化', () => {
  it('约束限制有效难度，同样的有效配置可复现', () => {
    const s = schulteGenerator.generate('constrained', { size: 6 }, { maxSize: 3 });
    expect(s.size).toBe(3);
    expect(schulteGenerator.generate('constrained', s.difficulty)).toEqual(s);
    const d = digitGenerator.generate('constrained', { length: 12 }, { maxLength: 2 });
    expect(d.recallLength).toBe(2);
    expect(JSON.parse(digitGenerator.serialize(d))).toEqual(d);
    const r = rotationGenerator.generate(
      'constrained',
      { complexity: 12, options: 5 },
      { maxComplexity: 5, maxOptions: 2 },
    );
    expect(r.cells).toHaveLength(5);
    expect(r.options).toHaveLength(2);
    expect(rotationGenerator.generate('constrained', r.difficulty)).toEqual(r);
    expect(
      corsiGenerator.generate('constrained', { length: 9 }, { maxSpan: 2 }).sequence,
    ).toHaveLength(2);
  });
  it('舒尔特下一次难度建议在边界内，速度阈值不覆盖错误', async () => {
    const { suggestSchulteSize } = await import('@/engine/adaptation');
    expect(suggestSchulteSize(6, 1, 10)).toBe(6);
    expect(suggestSchulteSize(3, 0.2, 10)).toBe(3);
    expect(suggestSchulteSize(4, 1, 20)).toBe(5);
    expect(suggestSchulteSize(4, 0.7, 20)).toBe(3);
    expect(suggestSchulteSize(4, 0.9, 20)).toBe(4);
  });
});
describe('警觉性刺激计划', () => {
  it('时间间隔可复现、满足边界并覆盖整个时长', async () => {
    const { pvtScheduleGenerator: g } = await import('@/assessments/pvt-generator');
    for (let i = 0; i < 150; i++) {
      const p = g.generate(`assessment:${i}`, {
        seconds: 180,
        minInterval: 2000,
        maxInterval: 5000,
      });
      expect(g.validate(p)).toBe(true);
      expect(g.generate(p.seed, p.difficulty)).toEqual(p);
      expect(JSON.parse(g.serialize(p))).toEqual(p);
    }
  });
});
