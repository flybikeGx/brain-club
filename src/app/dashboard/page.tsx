'use client';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CalendarDays,
  Clock3,
  Focus,
  Leaf,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { db } from '@/storage/db';
import { CardTitle, PageHeading, SessionList, Stat } from '@/components/ui';
import { lastWeek, WeekChart } from '@/components/charts';
import { exercises } from '@/exercises/catalog';
import { EquipmentCard } from '@/components/equipment';
export default function Dashboard() {
  const sessions =
    useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []) ?? [];
  const valid = sessions.filter((s) => s.valid),
    week = lastWeek(valid),
    minutes = week.reduce((a, b) => a + b, 0),
    completed = valid.filter((s) => s.completed).length;
  const mindfulness = valid.filter((s) => s.kind === 'mindfulness'),
    assessment = valid.filter((s) => s.kind === 'assessment');
  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = valid.filter((s) => new Date(s.startedAt) >= todayStart);
  const dimensions = [
    {
      id: 'memory',
      title: '数字记忆广度',
      task: 'digit-forward',
      icon: Brain,
      unit: '位数字',
      metric: 'maxSpan',
    },
    {
      id: 'spatial',
      title: '空间序列广度',
      task: 'corsi',
      icon: Focus,
      unit: '个位置',
      metric: 'maxSpan',
    },
    {
      id: 'attention',
      title: '警觉反应时间',
      task: 'pvt',
      icon: Target,
      unit: 'ms · 中位数',
      metric: 'medianRtMs',
    },
    {
      id: 'reading',
      title: '阅读理解',
      task: 'reading',
      icon: Brain,
      unit: '题正确 · 示例材料',
      metric: 'correct',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR MIND. YOUR PRACTICE."
        title="为大脑，留一点练习时间。"
        description="从容开始，专注当下。今天也按自己的节奏前进。"
        action={
          <span className="date-pill">
            <CalendarDays size={14} />
            {today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span className="status-dot" />
            今日建议 / DAILY PRACTICE
          </div>
          <h2>
            先让注意力，
            <br />
            回到此时此刻。
          </h2>
          <p>
            从 5 分钟的正念练习开始。留意呼吸，觉察走神，
            <br className="desktop-break" />
            再温和地回来。不必追求完美。
          </p>
          <div className="button-row">
            <Link href="/mindfulness" className="button primary">
              开始今日练习 <ArrowUpRight size={16} />
            </Link>
            <span className="hero-tag">
              <Clock3 size={13} />5 分钟 · 适合初学者
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg className="orbit-art" viewBox="0 0 300 300">
            <defs>
              <radialGradient id="orb">
                <stop stopColor="#cedba9" stopOpacity=".5" />
                <stop offset="1" stopColor="#b4c386" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="143" fill="url(#orb)" />
            {[61, 87, 112].map((r) => (
              <circle
                key={r}
                cx="150"
                cy="150"
                r={r}
                fill="none"
                stroke="#a5b68d"
                strokeOpacity=".37"
                strokeWidth=".7"
              />
            ))}
            <ellipse
              cx="150"
              cy="150"
              rx="112"
              ry="42"
              transform="rotate(-36 150 150)"
              fill="none"
              stroke="#9aaf7a"
              strokeOpacity=".5"
            />
            <ellipse
              cx="150"
              cy="150"
              rx="73"
              ry="109"
              transform="rotate(36 150 150)"
              fill="none"
              stroke="#9aaf7a"
              strokeOpacity=".35"
            />
            <circle cx="150" cy="150" r="39" fill="#d9e6bd" stroke="#adbd8c" strokeWidth=".6" />
            <path
              d="M133 150c0-12 7-19 17-19s17 7 17 19-7 20-17 20-17-8-17-20Z"
              fill="none"
              stroke="#778c5b"
              strokeWidth="1"
            />
            <path d="M150 129v43M130 150h40" stroke="#778c5b" strokeOpacity=".5" />
            <circle cx="64" cy="78" r="5" fill="#8da366" />
            <circle cx="234" cy="178" r="4" fill="#9baf7c" />
            <circle cx="131" cy="39" r="3" fill="#b4c596" />
            <path d="M48 221h31M63 206v31" stroke="#a4b58b" strokeWidth=".7" />
          </svg>
          <span className="orbit-label">FIND YOUR FOCUS</span>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          label="今日练习"
          value={Math.round(todaySessions.reduce((a, s) => a + s.duration, 0) / 60)}
          unit="分钟"
          detail={
            todaySessions.length
              ? `已记录 ${todaySessions.length} 次练习`
              : '让第一次练习从今天开始'
          }
          icon={<Clock3 />}
        />
        <Stat
          label="本周累计"
          value={Math.round(minutes)}
          unit="分钟"
          detail="近 7 个自然日的有效练习"
          icon={<Activity />}
        />
        <Stat
          label="已完成训练"
          value={completed}
          unit="次"
          detail="训练、体测与正念分别记录"
          icon={<Target />}
        />
        <Stat
          label="正念练习"
          value={Math.round(mindfulness.reduce((a, s) => a + s.duration, 0) / 60)}
          unit="分钟"
          detail={`${mindfulness.length} 次觉察与回归的练习`}
          icon={<Leaf />}
        />
      </div>
      <div className="dashboard-columns">
        <div className="stack">
          <section className="card">
            <CardTitle
              title="认知体测概况"
              subtitle="了解专项表现，建立自己的参考起点"
              action={
                <Link href="/assessment" className="text-link">
                  进入体测中心 <ArrowRight size={13} />
                </Link>
              }
            />
            {dimensions.map((d) => {
              const s = assessment.find((s) => s.taskId === d.task);
              return (
                <div className="assessment-mini" key={d.id}>
                  <div className="dimension-icon">
                    <d.icon size={18} />
                  </div>
                  <div>
                    <strong>{d.title}</strong>
                    <small>
                      {s
                        ? `最近一次有效测评 · 共 ${assessment.filter((a) => a.taskId === d.task).length} 次本地记录`
                        : '尚未建立个人基线'}
                    </small>
                  </div>
                  <div className="value">
                    <strong>
                      {s?.metrics[d.metric] !== undefined ? Math.round(s.metrics[d.metric]) : '—'}
                    </strong>
                    <small>{s ? d.unit : '等待测评'}</small>
                  </div>
                </div>
              );
            })}
          </section>
          <section>
            <CardTitle
              title="训练器械区"
              subtitle="按专项练习，找到适合自己的挑战"
              action={
                <Link href="/training" className="text-link">
                  全部器械 <ArrowRight size={13} />
                </Link>
              }
            />
            <div className="equipment-grid">
              {exercises
                .filter((e) => e.available)
                .map((e, i) => (
                  <EquipmentCard key={e.id} exercise={e} index={i} compact />
                ))}
            </div>
          </section>
          <section className="card">
            <CardTitle
              title="最近的练习"
              action={
                <Link className="text-link" href="/history">
                  全部记录 <ArrowRight size={13} />
                </Link>
              }
            />
            <SessionList sessions={sessions.slice(0, 3)} />
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <CardTitle
              title="每周练习节奏"
              subtitle="一点一滴，积累属于你的习惯"
              action={<span className="badge neutral">近 7 天</span>}
            />
            <WeekChart values={week} />
            <div className="chart-note">
              <span>本周练习时长</span>
              <strong>{Math.round(minutes)} 分钟</strong>
            </div>
          </section>
          <section className="card mindfulness-promo">
            <div className="eyebrow">MINDFULNESS TREADMILL</div>
            <h2>
              走神了？
              <br />
              回来就好。
            </h2>
            <p>
              正念没有分数。每一次觉察，
              <br />
              都是练习的一部分。
            </p>
            <Link className="text-link" href="/mindfulness">
              进入正念跑步机 <MoveUpRight size={13} />
            </Link>
            <div className="promo-circle" aria-hidden="true" />
          </section>
          <section className="card">
            <CardTitle title="练习小贴士" action={<Sparkles size={16} className="subtle" />} />
            <h3 style={{ fontSize: 12 }}>先稳定，再增加难度。</h3>
            <p style={{ fontSize: 11, lineHeight: 2, marginTop: 9 }}>
              相同条件下观察长期变化，比追逐单次高分更有价值。难度提高后的正确率下降，不一定意味着退步。
            </p>
          </section>
        </div>
      </div>
      <div className="evidence-strip">
        <ShieldCheck size={19} />
        <div>
          <h3>有方法地练习，有依据地理解。</h3>
          <p>
            训练可能改善特定任务表现，但不保证提高一般智力或产生远迁移。MindGym
            不提供医疗诊断或治疗。
          </p>
        </div>
        <Link href="/evidence" className="text-link">
          科学证据与局限 <ArrowUpRight size={13} />
        </Link>
      </div>
    </>
  );
}
