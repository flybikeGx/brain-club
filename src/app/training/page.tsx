'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { exercises } from '@/exercises/catalog';
import { EquipmentCard } from '@/components/equipment';
import { Notice, PageHeading } from '@/components/ui';
import { SchulteGame } from '@/exercises/schulte/game';
import { SequenceGame } from '@/components/sequence-game';
import { RotationGame } from '@/exercises/spatial-rotation/game';
function TrainingContent() {
  const id = useSearchParams().get('exercise'),
    exercise = exercises.find((e) => e.id === id && e.available);
  if (exercise)
    return (
      <>
        <PageHeading
          eyebrow="TRAINING FLOOR / EQUIPMENT"
          title={exercise.title}
          description={exercise.description}
          action={
            <Link className="button ghost" href="/training">
              <ArrowLeft size={14} />
              器械目录
            </Link>
          }
        />
        {id === 'schulte' ? (
          <SchulteGame />
        ) : id === 'digit-training' ? (
          <SequenceGame />
        ) : (
          <RotationGame />
        )}
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="TRAINING FLOOR"
        title="认知训练器械区"
        description="从一个具体任务开始，在合适的难度上持续练习。"
        action={<span className="badge">3 台器械开放中</span>}
      />
      <div className="catalog-grid">
        {exercises
          .filter((e) => e.available)
          .map((e, i) => (
            <EquipmentCard exercise={e} index={i} key={e.id} />
          ))}
      </div>
      <div className="section-gap">
        <Notice>
          题目由本机程序按种子生成，不依赖在线
          API。大量随机题目仍可能共享相同策略；训练表现的改善不等于广泛认知迁移。
        </Notice>
      </div>
      <div className="page-heading section-gap">
        <div>
          <div className="eyebrow">ON THE DRAWING BOARD</div>
          <h2>下一批器械</h2>
          <p>以下功能尚未开放，不包含训练或模拟成绩。</p>
        </div>
      </div>
      <div className="catalog-grid">
        {exercises
          .filter((e) => !e.available)
          .map((e) => (
            <article className="planned-card" key={e.id}>
              <span className="badge neutral">规划中</span>
              <h3>{e.title}</h3>
              <p>{e.description}</p>
            </article>
          ))}
      </div>
    </>
  );
}
export default function Training() {
  return (
    <Suspense fallback={<p>正在准备器械…</p>}>
      <TrainingContent />
    </Suspense>
  );
}
