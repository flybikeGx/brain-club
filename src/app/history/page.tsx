'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ArrowDownToLine, Clock3, X } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/storage/db';
import { CardTitle, Empty, metricNames, Notice, PageHeading, Stat } from '@/components/ui';
import { lastWeek, LineChart, WeekChart } from '@/components/charts';
import { dateLabel, taskNames, time, sessionDuration } from '@/lib/format';
import type { Session } from '@/domain/types';
const configurationKey = (s: Session) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries({
        generatorVersion: s.generatorVersion,
        taskVariant: s.taskVariant,
        ...s.difficulty,
        ...(s.taskId === 'schulte' ? { dimCompleted: s.difficulty.dimCompleted ?? true } : {}),
      }).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
function HistoryContent() {
  const params = useSearchParams(),
    sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []) ?? [];
  const [filter, setFilter] = useState('all'),
    [task, setTask] = useState('schulte'),
    [configuration, setConfiguration] = useState(''),
    [selected, setSelected] = useState<string | null>(params.get('session')),
    [limit, setLimit] = useState(20);
  const detailRef = useRef<HTMLElement>(null),
    available = sessions.filter((s) => s.taskId === task && s.valid && s.completed),
    configs = Array.from(new Map(available.map((s) => [configurationKey(s), s])).entries());
  useEffect(() => {
    setConfiguration('');
  }, [task]);
  const currentConfiguration = configuration || configs[0]?.[0] || '',
    comparable = available.filter((s) => configurationKey(s) === currentConfiguration).reverse(),
    tableSessions = sessions.filter((s) => filter === 'all' || s.kind === filter),
    detail = sessions.find((s) => s.sessionId === selected),
    week = lastWeek(sessions);
  const accuracyPoints = comparable
    .filter((s) => s.accuracy !== null)
    .slice(-20)
    .map((s) => ({ label: dateLabel(s.startedAt), value: Math.round(s.accuracy! * 100) }));
  const speedKey = task === 'pvt' ? 'medianRtMs' : task === 'schulte' ? 'duration' : 'meanRtMs',
    unit = speedKey === 'duration' ? ' 秒' : ' ms';
  const speedPoints = comparable
    .filter((s) => speedKey === 'duration' || s.metrics[speedKey] !== undefined)
    .slice(-20)
    .map((s) => ({
      label: dateLabel(s.startedAt),
      value: speedKey === 'duration' ? s.duration : s.metrics[speedKey],
    }));
  const recent = speedPoints.slice(-3),
    baseline = speedPoints.slice(0, -3),
    average = (p: { value: number }[]) => p.reduce((a, b) => a + b.value, 0) / p.length;
  const difficultyPoints = comparable
    .flatMap((s) =>
      s.attempts.map((a, i) => ({
        label: `${dateLabel(s.startedAt)} #${i + 1}`,
        value: Number(a.difficulty.length ?? a.difficulty.complexity ?? s.difficulty.size ?? 0),
      })),
    )
    .filter((p) => p.value > 0)
    .slice(-30);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PROGRESS"
        title="记录练习，看见过程。"
        description="在相同任务和条件下，观察属于自己的变化。"
        action={
          <Link className="button secondary" href="/settings">
            <ArrowDownToLine size={14} />
            导出与管理数据
          </Link>
        }
      />
      <div className="stats-grid">
        <Stat
          label="本周有效练习"
          value={Math.round(week.reduce((a, b) => a + b, 0))}
          unit="分钟"
          icon={<Clock3 />}
        />
        <Stat
          label="训练记录"
          value={sessions.filter((s) => s.kind === 'training').length}
          unit="次"
        />
        <Stat
          label="体测记录"
          value={sessions.filter((s) => s.kind === 'assessment').length}
          unit="次"
        />
        <Stat
          label="正念记录"
          value={sessions.filter((s) => s.kind === 'mindfulness').length}
          unit="次"
        />
      </div>
      <section className="card">
        <div className="filter-row">
          <CardTitle title="专项表现趋势" subtitle="只比较相同版本、变式与初始配置的完整有效记录" />
          <div className="history-controls">
            <select aria-label="趋势任务" value={task} onChange={(e) => setTask(e.target.value)}>
              {Object.entries(taskNames)
                .filter(([id]) => id !== 'mindfulness')
                .map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {configs.length > 0 && (
          <label className="form-field">
            <span>比较条件</span>
            <select
              aria-label="比较条件"
              value={currentConfiguration}
              onChange={(e) => setConfiguration(e.target.value)}
            >
              {configs.map(([key, s]) => (
                <option key={key} value={key}>
                  v{s.generatorVersion} · {s.taskVariant} ·{' '}
                  {Object.entries(s.difficulty)
                    .map(
                      ([k, v]) =>
                        `${difficultyLabels[k] ?? k} ${typeof v === 'boolean' ? (v ? '开' : '关') : v}`,
                    )
                    .join(' / ')}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="metric-pair">
          <div>
            <h3>正确率 · %</h3>
            <LineChart label="正确率" points={accuracyPoints} unit="%" />
          </div>
          <div>
            <h3>{speedKey === 'duration' ? '完成时间 · 秒' : '反应时间 · ms'} · 越低表示更快</h3>
            <LineChart label="速度" points={speedPoints} unit={unit} />
          </div>
        </div>
        <div className="chart-note">
          <span>近期状态 / 个人长期基线</span>
          <span>
            {recent.length >= 3 && baseline.length >= 3
              ? `最近 3 次均值 ${average(recent).toFixed(1)}${unit} · 此前 ${baseline.length} 次均值 ${average(baseline).toFixed(1)}${unit}`
              : '至少需要同条件下 6 次含速度指标的记录'}
          </span>
        </div>
        <div className="section-gap">
          <Notice>
            速度与正确率分别呈现，存在权衡关系。自适应训练还会改变每题难度：挑战更难的题后，准确率下降不等于退步。单次变化也可能来自状态波动与练习效应。
          </Notice>
        </div>
      </section>
      <div className="two-columns section-gap">
        <section className="card">
          <CardTitle title="每周练习时长" subtitle="近七日 · 全部有效任务" />
          <WeekChart values={week} />
        </section>
        <section className="card">
          <CardTitle title="逐题难度轨迹" subtitle="同一初始条件下的序列长度或形状复杂度" />
          <LineChart label="逐题难度" points={difficultyPoints} />
        </section>
      </div>
      <section className="card section-gap">
        <div className="filter-row">
          <CardTitle title="全部练习记录" subtitle="无效与提前结束的记录也会保留" />
          <select
            aria-label="记录类型"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setLimit(20);
            }}
          >
            <option value="all">全部类型</option>
            <option value="training">认知训练</option>
            <option value="assessment">认知体测</option>
            <option value="mindfulness">正念练习</option>
          </select>
        </div>
        {!tableSessions.length ? (
          <Empty />
        ) : (
          <>
            <div className="table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>任务</th>
                    <th>时间</th>
                    <th>有效时长</th>
                    <th>正确率</th>
                    <th>状态</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {tableSessions.slice(0, limit).map((s) => (
                    <tr key={s.sessionId}>
                      <td>{s.title}</td>
                      <td>{dateLabel(s.startedAt)}</td>
                      <td>{sessionDuration(s)}</td>
                      <td>{s.accuracy !== null ? `${Math.round(s.accuracy * 100)}%` : '—'}</td>
                      <td>
                        <span className={`badge ${s.valid && s.completed ? '' : 'neutral'}`}>
                          {!s.valid ? '无效' : !s.completed ? '提前结束' : '已完成'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => {
                            setSelected(s.sessionId);
                            setTimeout(() => detailRef.current?.focus(), 0);
                          }}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableSessions.length > limit && (
              <button
                className="button secondary section-gap"
                onClick={() => setLimit((n) => n + 20)}
              >
                载入更多记录
              </button>
            )}
          </>
        )}
      </section>
      {detail && (
        <section className="card section-gap" tabIndex={-1} ref={detailRef}>
          <CardTitle
            title={detail.title + ' · 本次记录'}
            subtitle={dateLabel(detail.startedAt)}
            action={
              <button
                className="icon-button"
                aria-label="关闭记录详情"
                onClick={() => setSelected(null)}
              >
                <X size={17} />
              </button>
            }
          />
          {!detail.valid && <Notice>{detail.invalidReason}</Notice>}
          <div className="result-stats">
            {Object.entries(detail.metrics).map(([k, v]) => (
              <Stat
                key={k}
                label={metricNames[k] ?? k}
                value={Number.isInteger(v) ? v : v.toFixed(1)}
              />
            ))}
          </div>
          {detail.mindfulness && (
            <div className="result-detail">
              <p>
                主观状态：{detail.mindfulness.before} → {detail.mindfulness.after} / 5 · 总体
                {detail.mindfulness.comfortable ? '舒适' : '不舒适'}
              </p>
              <p>
                练习锚点：{detail.mindfulness.anchor === 'breath' ? '呼吸' : '身体感觉'} · 计划{' '}
                {detail.mindfulness.plannedSeconds / 60} 分钟，实际 {time(detail.duration)}
              </p>
              <p>复盘：{detail.mindfulness.reflection || '未填写'}</p>
              <p>主动觉察点击次数不等于真实走神次数，不计算注意力百分比。</p>
            </div>
          )}
          {detail.assessment && (
            <Notice>
              本次仅测量指定任务表现。历史变化受测量波动、状态与练习效应影响，尚不能确定一般认知能力。
              {detail.assessment.limitations.join(' ')}
            </Notice>
          )}
          {detail.attempts.length > 0 && (
            <details className="info-detail">
              <summary>逐题表现与阶段</summary>
              <div className="table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>正式试次</th>
                      <th>题目条件</th>
                      <th>表现</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.attempts.map((a, i) => (
                      <tr key={a.id}>
                        <td>{i + 1}</td>
                        <td>
                          {a.taskVariant} · {JSON.stringify(a.difficulty)}
                        </td>
                        <td>{a.correct ? '正确' : '错误'}</td>
                        <td>{Math.round(a.responseMs)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          <details className="info-detail">
            <summary>重建信息、难度调整与原始操作日志</summary>
            <p>会话 ID：{detail.sessionId}</p>
            <p>
              生成器：{detail.generatorId} @ {detail.generatorVersion}
            </p>
            <p>种子：{detail.seed}</p>
            <p>配置：{JSON.stringify(detail.difficulty)}</p>
            <pre>
              {JSON.stringify(
                { difficultyHistory: detail.difficultyHistory, eventLog: detail.eventLog },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      )}
    </>
  );
}
const difficultyLabels: Record<string, string> = {
  size: '网格',
  fontSize: '字体',
  perNumber: '逐个计时',
  dimCompleted: '已点击数字变灰',
  initialLength: '初始长度',
  speed: '间隔 ms',
  variant: '方式',
  complexity: '复杂度',
  options: '选项',
  seconds: '时长秒',
  minInterval: '最短间隔',
  maxInterval: '最长间隔',
  timeoutMs: '超时',
  materialId: '材料',
  bankVersion: '题库版本',
  questions: '题数',
};
export default function History() {
  return (
    <Suspense fallback={<p>正在读取本机记录…</p>}>
      <HistoryContent />
    </Suspense>
  );
}
