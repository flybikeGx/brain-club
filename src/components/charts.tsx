'use client';
import { Empty } from './ui';
export function LineChart({
  points,
  label,
  unit = '',
}: {
  points: { label: string; value: number }[];
  label: string;
  unit?: string;
}) {
  if (!points.length)
    return <Empty title="等待第一次记录" text="完成训练后，这里将呈现真实的个人变化。" />;
  const min = Math.min(...points.map((p) => p.value)),
    max = Math.max(...points.map((p) => p.value)),
    range = Math.max(1, max - min),
    w = 600,
    h = 145;
  const xy = points.map((p, i) => ({
    x: points.length === 1 ? 300 : 40 + (i * (w - 80)) / (points.length - 1),
    y: 115 - ((p.value - min) / range) * 85,
  }));
  return (
    <figure
      className="line-chart"
      aria-label={`${label}，${points.map((p) => `${p.label} ${p.value}${unit}`).join('；')}`}
    >
      <svg viewBox={`0 0 ${w} ${h}`} role="img">
        <title>{label}</title>
        {[30, 72, 115].map((y) => (
          <line key={y} x1="25" x2="575" y1={y} y2={y} stroke="var(--line)" strokeDasharray="4 5" />
        ))}
        {xy.length > 1 && (
          <polyline
            points={xy.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth="2.5"
          />
        )}
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--accent-ink)" />
            <title>
              {points[i].label}: {points[i].value}
              {unit}
            </title>
          </g>
        ))}
      </svg>
      <figcaption>
        <span>{points[0].label}</span>
        <span>
          {min.toFixed(1)}–{max.toFixed(1)}
          {unit}
        </span>
        <span>{points.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}
export function WeekChart({ values }: { values: number[] }) {
  const max = Math.max(5, ...values);
  return (
    <div
      className="week-chart"
      role="img"
      aria-label={`近七日练习分钟：${values.map((x) => x.toFixed(1)).join('、')}`}
    >
      {values.map((v, i) => (
        <div key={i} className={`week-column ${i === 6 ? 'today' : ''}`}>
          <span className="bar-value">{v > 0 ? `${Math.round(v)}m` : ''}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: `${v > 0 ? Math.max(3, (v / max) * 100) : 0}%` }}
            />
          </div>
          <span>{['一', '二', '三', '四', '五', '六', '日'][(new Date().getDay() + i) % 7]}</span>
        </div>
      ))}
    </div>
  );
}
export function lastWeek(sessions: { startedAt: string; duration: number; valid: boolean }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() - 6 + i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return sessions
      .filter((s) => s.valid && new Date(s.startedAt) >= start && new Date(s.startedAt) < end)
      .reduce((a, s) => a + s.duration / 60, 0);
  });
}
