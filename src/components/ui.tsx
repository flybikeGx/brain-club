'use client';
import Link from 'next/link';
import { ArrowRight, Check, CircleAlert, Clock3, Inbox, RotateCcw } from 'lucide-react';
import type { Session } from '@/domain/types';
import { dateLabel, time, sessionDuration } from '@/lib/format';
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function CardTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = '还没有训练记录',
  text = '完成第一次练习，开始了解自己的节奏。',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox size={24} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <CircleAlert size={17} />
      <div>{children}</div>
    </div>
  );
}
export function Stat({
  label,
  value,
  unit,
  detail,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
        {icon}
      </div>
      <div className="stat-number">
        {value}
        <span>{unit}</span>
      </div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}
export function SessionList({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) return <Empty />;
  return (
    <div className="session-list">
      {sessions.map((s) => (
        <Link href={`/history?session=${s.sessionId}`} key={s.sessionId} className="session-row">
          <span className={`session-symbol ${s.kind}`}>
            <Check size={17} />
          </span>
          <div className="session-name">
            <strong>{s.title}</strong>
            <small>
              {dateLabel(s.startedAt)} ·{' '}
              {s.kind === 'assessment' ? '体测' : s.kind === 'mindfulness' ? '正念' : '训练'}
              {!s.valid ? ' · 无效' : ''}
              {!s.completed ? ' · 提前结束' : ''}
            </small>
          </div>
          <div className="session-result">
            <strong>
              {s.accuracy !== null ? `${Math.round(s.accuracy * 100)}%` : time(s.duration)}
            </strong>
            <small>{s.accuracy !== null ? '正确率' : '练习时长'}</small>
          </div>
          <ArrowRight size={15} />
        </Link>
      ))}
    </div>
  );
}
export function Result({
  session,
  onAgain,
  error,
}: {
  session: Session;
  onAgain: () => void;
  error?: string;
}) {
  return (
    <section className="card result-panel">
      <div className="completion-icon">
        <Check size={26} />
      </div>
      <div className="eyebrow">SESSION COMPLETE</div>
      <h2>{session.valid ? '本次练习已完成' : '本次测评已标记无效'}</h2>
      <p>{session.valid ? '每一次有意识的练习，都是记录的起点。' : session.invalidReason}</p>
      {error ? (
        <Notice>{error}</Notice>
      ) : (
        <span className="badge">
          <Check size={12} />
          已保存到本机
        </span>
      )}
      <div className="result-stats">
        <Stat label="有效用时" value={sessionDuration(session)} />
        {session.accuracy !== null && (
          <Stat label="本次正确率" value={Math.round(session.accuracy * 100)} unit="%" />
        )}
        {Object.entries(session.metrics).map(([key, value]) => (
          <Stat
            key={key}
            label={metricNames[key] ?? key}
            value={Number.isInteger(value) ? value : value.toFixed(1)}
            unit={key.toLowerCase().includes('ms') ? 'ms' : undefined}
          />
        ))}
      </div>
      {session.assessment && (
        <Notice>
          本次测得的是该任务在当前状态下的表现。历史变化可能来自测量波动、策略与练习效应；尚不能确定一般认知能力或远迁移效果。无常模，不提供人群排名。
        </Notice>
      )}
      <div className="button-row">
        <button className="button primary" onClick={onAgain}>
          <RotateCcw size={16} />
          再练一次
        </button>
        <Link className="button secondary" href="/history">
          查看历史变化 <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
export const metricNames: Record<string, string> = {
  maxSpan: '最大成功广度',
  errors: '错误次数',
  medianRtMs: '反应时中位数',
  meanRtMs: '平均反应时',
  omissions: '遗漏次数',
  censored: '结束时截断的刺激',
  falseStarts: '抢答次数',
  lapses: '反应迟缓 >500ms',
  anticipations: '预期性反应 <100ms',
  trials: '正式试次',
  correct: '正确试次',
  awarenessCount: '主动觉察记录',
  length: '结束序列长度',
};
export function DurationChip({ minutes }: { minutes: number }) {
  return (
    <span className="duration-chip">
      <Clock3 size={12} />
      {minutes} 分钟
    </span>
  );
}
