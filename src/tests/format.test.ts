import { describe, expect, it } from 'vitest';
import { sessionDuration, timeWithMilliseconds } from '@/lib/format';

describe('毫秒用时显示', () => {
  it('保留三位毫秒，处理分钟进位和边界', () => {
    expect(timeWithMilliseconds(0)).toBe('00:00.000');
    expect(timeWithMilliseconds(1.234)).toBe('00:01.234');
    expect(timeWithMilliseconds(61.007)).toBe('01:01.007');
    expect(timeWithMilliseconds(59.9996)).toBe('01:00.000');
    expect(timeWithMilliseconds(6000.123)).toBe('100:00.123');
    expect(timeWithMilliseconds(-1)).toBe('00:00.000');
    expect(timeWithMilliseconds(Number.NaN)).toBe('00:00.000');
  });
  it('舒尔特的结果与历史保留毫秒，正念仍按原时长格式显示', () => {
    expect(sessionDuration({ taskId: 'schulte', duration: 12.345 })).toBe('00:12.345');
    expect(sessionDuration({ taskId: 'mindfulness', duration: 180 })).toBe('03:00');
  });
});
