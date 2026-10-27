'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Brain, Clock3, FlaskConical } from 'lucide-react';
import { assessments } from '@/assessments/engine';
import { PageHeading, Notice } from '@/components/ui';
import { SequenceGame } from '@/components/sequence-game';
import { PvtGame } from '@/assessments/pvt-game';
import { ReadingGame } from '@/assessments/reading-game';
function AssessmentContent() {
  const id = useSearchParams().get('test'),
    test = assessments.find((a) => a.id === id);
  if (test)
    return (
      <>
        <PageHeading
          eyebrow={`ASSESSMENT LAB / V${test.version}`}
          title={test.title}
          description="先熟悉规则，再测量表现。每个维度独立记录。"
          action={
            <Link className="button ghost" href="/assessment">
              <ArrowLeft size={14} />
              返回体测中心
            </Link>
          }
        />
        {test.id === 'pvt' ? (
          <PvtGame />
        ) : test.id === 'reading' ? (
          <ReadingGame />
        ) : (
          <SequenceGame key={test.id} assessmentId={test.id} />
        )}
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENT LAB"
        title="认知体测中心"
        description="建立个人基线，了解在具体任务上的表现。"
        action={
          <span className="badge">
            <FlaskConical size={12} />5 项独立测评
          </span>
        }
      />
      <Notice>
        请在安静环境中、使用相同设备完成测评。疲劳、睡眠、练习经验和输入设备均会影响成绩。无常模，不提供
        IQ、脑力总分或人群排名。
      </Notice>
      <div className="assessment-grid section-gap">
        {assessments.map((a, i) => (
          <article key={a.id} className="card assessment-card">
            <div className="eyebrow">
              0{i + 1} / {a.dimension.toUpperCase()}
            </div>
            <h2>{a.title}</h2>
            <p>{a.instructions[0]}</p>
            <div className="subtle">
              {a.practiceTrials} 次练习 ·{' '}
              {a.formalTrials ? `${a.formalTrials} 次正式试次` : '默认 3 分钟短测'} · v{a.version}
            </div>
            <details className="info-detail">
              <summary>操作规则、评分与测量限制</summary>
              <ol className="instructions">
                {a.instructions.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
              <p>{a.scoring}</p>
              <p>{a.repeatControl}</p>
              {a.limitations.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </details>
            <div className="button-row">
              <span className="badge neutral">
                {a.id === 'reading' ? '有限原创材料' : '本机种子生成'}
              </span>
              <Link className="button secondary" href={`/assessment?test=${a.id}`}>
                进入测评 <ArrowUpRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="evidence-strip">
        <Brain size={20} />
        <div>
          <h3>专项成绩是一个观察窗口。</h3>
          <p>
            本次测得的成绩、同用户历史变化、测量波动与练习效应，将在记录中分别呈现。整体认知能力和训练迁移仍需独立、不同形式的任务检验。
          </p>
        </div>
      </div>
    </>
  );
}
export default function Assessment() {
  return (
    <Suspense fallback={<p>正在准备测评…</p>}>
      <AssessmentContent />
    </Suspense>
  );
}
