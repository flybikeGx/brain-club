import Link from 'next/link';
import { ArrowRight, Box, Grid2X2 } from 'lucide-react';
import type { ExerciseDefinition } from '@/domain/types';
export function EquipmentArt({ id, index = 0 }: { id: string; index?: number }) {
  return (
    <div className="equipment-art">
      <span className="number-tag">EQUIPMENT / 0{index + 1}</span>
      {id === 'schulte' ? (
        <div className="mini-grid">
          {[8, 1, 6, 3, 5, 7, 4, 9, 2].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      ) : id === 'digit-training' ? (
        <div className="digit-art">
          4 <span>7</span> 2
        </div>
      ) : (
        <div className="rotation-art">
          <svg width="110" height="85" viewBox="0 0 110 85" fill="none">
            <path d="M25 14H47V36H69V58H47V79H25V58H4V36H25V14Z" fill="currentColor" opacity=".4" />
            <path d="M75 5H95V25H75V45H55V25H75V5Z" fill="currentColor" opacity=".75" />
          </svg>
        </div>
      )}
    </div>
  );
}
export function EquipmentCard({
  exercise,
  index = 0,
  compact = false,
}: {
  exercise: ExerciseDefinition;
  index?: number;
  compact?: boolean;
}) {
  return (
    <Link href={`/training?exercise=${exercise.id}`} className="equipment-card">
      <EquipmentArt id={exercise.id} index={index} />
      <div className="equipment-copy">
        <h3>{exercise.title}</h3>
        <p>{exercise.description}</p>
        <div className="equipment-meta">
          <span>
            {exercise.dimension === 'attention'
              ? '视觉搜索'
              : exercise.dimension === 'memory'
                ? '工作记忆'
                : '空间能力'}
          </span>
          <ArrowRight size={13} />
        </div>
        {!compact && (
          <span className="button secondary">
            开始训练 <ArrowRight size={14} />
          </span>
        )}
      </div>
    </Link>
  );
}
export const equipmentIcon = (id: string) => (id === 'schulte' ? Grid2X2 : Box);
