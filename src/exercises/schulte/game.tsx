'use client';
import { useState } from 'react';
import { Grid2X2, Play } from 'lucide-react';
import { scoreSchulte, type SchulteProblem } from './generator';
import { useTask } from '@/engine/telemetry/use-task';
import { newSeed } from '@/engine/generators/random';
import { Notice, Result } from '@/components/ui';
import { timeWithMilliseconds } from '@/lib/format';
import { suggestSchulteSize } from '@/engine/adaptation';
import { schultePlugin } from '@/exercises/plugins';
const schulteGenerator = schultePlugin.generator;
export function SchulteGame() {
  const [size, setSize] = useState(4),
    [font, setFont] = useState(26),
    [perNumber, setPerNumber] = useState(true),
    [dimCompleted, setDimCompleted] = useState(false),
    [phase, setPhase] = useState<'setup' | 'running' | 'paused'>('setup'),
    [problem, setProblem] = useState<SchulteProblem | null>(null),
    [next, setNext] = useState(1),
    [errors, setErrors] = useState(0);
  const task = useTask(() => setPhase('paused'), 'frame');
  function start() {
    const p = schulteGenerator.generate(newSeed('training'), {
      size,
      fontSize: font,
      perNumber,
      dimCompleted,
    });
    setProblem(p);
    setNext(1);
    setErrors(0);
    task.begin({
      kind: 'training',
      taskId: 'schulte',
      title: '舒尔特方格',
      dimension: 'attention',
      seed: p.seed,
      generatorId: p.generatorId,
      generatorVersion: p.generatorVersion,
      taskVariant: p.taskVariant,
      difficulty: p.difficulty,
    });
    setPhase('running');
  }
  function choose(n: number) {
    if (phase !== 'running' || !problem) return;
    task.log('select', n);
    if (n !== next) {
      setErrors((x) => x + 1);
      return;
    }
    setNext((x) => x + 1);
    if (n === size ** 2) {
      const score = scoreSchulte(problem, task.session.current!.eventLog);
      void task.finish({
        duration: score.durationMs / 1000,
        accuracy: score.correct / (score.correct + score.errors),
        score: null,
        metrics: {
          errors: score.errors,
          ...(perNumber
            ? {
                meanRtMs:
                  score.reactionTimes.reduce((a, b) => a + b, 0) / score.reactionTimes.length,
              }
            : {}),
        },
        attempts: perNumber
          ? score.reactionTimes.map((ms, i) => ({
              id: crypto.randomUUID(),
              problemId: problem.id,
              seed: problem.seed,
              difficulty: problem.difficulty,
              taskVariant: `target-${i + 1}`,
              correct: true,
              responseMs: ms,
            }))
          : [],
      });
    }
  }
  if (task.result)
    return (
      <>
        <Result
          session={task.result}
          error={task.error}
          onAgain={() => {
            setSize(suggestSchulteSize(size, task.result!.accuracy ?? 0, task.result!.duration));
            task.setResult(null);
            setPhase('setup');
          }}
        />
        <div className="section-gap">
          <Notice>
            下次建议：{suggestSchulteSize(size, task.result.accuracy ?? 0, task.result.duration)} ×{' '}
            {suggestSchulteSize(size, task.result.accuracy ?? 0, task.result.duration)}
            。建议仅依据本次错误与每目标平均用时；可在重新训练前自由修改，不是人群能力等级。
          </Notice>
        </div>
        {task.error && (
          <button className="button secondary" onClick={() => void task.retrySave()}>
            重试保存
          </button>
        )}
      </>
    );
  return (
    <div className="training-layout">
      <section className="card game-card">
        {phase === 'setup' ? (
          <div className="game-idle">
            <Grid2X2 size={42} strokeWidth={1} />
            <h2>按顺序，找到每一个数字。</h2>
            <p>
              从 1 开始，依次点击到 {size ** 2}。使用 Tab 键移动焦点，Enter
              或空格确认。开始后才计时。
            </p>
            <button className="button primary" onClick={start}>
              <Play size={15} />
              开始训练
            </button>
          </div>
        ) : phase === 'paused' ? (
          <div className="game-idle">
            <h2>计时已暂停</h2>
            <p>窗口失焦时会暂停。准备好后继续本次训练。</p>
            <button
              className="button primary"
              onClick={() => {
                task.resume();
                setPhase('running');
              }}
            >
              继续训练
            </button>
          </div>
        ) : (
          <>
            <div className="game-status">
              <span>
                下一个目标 <strong>{next}</strong>
              </span>
              <span>
                用时{' '}
                <strong
                  role="timer"
                  aria-label="训练用时"
                  aria-live="off"
                  data-testid="schulte-timer"
                >
                  {timeWithMilliseconds(task.elapsed)}
                </strong>
              </span>
              <span>
                错误 <strong>{errors}</strong>
              </span>
            </div>
            <div className="schulte-grid" style={{ gridTemplateColumns: `repeat(${size},1fr)` }}>
              {problem?.cells.map((n) => (
                <button
                  key={n}
                  aria-label={`数字 ${n}`}
                  className={`schulte-cell ${dimCompleted && n < next ? 'done' : ''}`}
                  style={{ fontSize: font }}
                  onClick={() => choose(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="progress-track">
              <div style={{ width: `${((next - 1) / size ** 2) * 100}%` }} />
            </div>
            <button
              className="button ghost section-gap"
              onClick={() => {
                task.pause();
                setPhase('paused');
              }}
            >
              暂停
            </button>
          </>
        )}
      </section>
      <aside className="card settings-card">
        <h2>器械设置</h2>
        <label className="form-field">
          <span>网格尺寸</span>
          <select
            aria-label="网格尺寸"
            disabled={phase !== 'setup'}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {[3, 4, 5, 6].map((s) => (
              <option key={s} value={s}>
                {s} × {s}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>字体大小：{font}px</span>
          <input
            aria-label="字体大小"
            type="range"
            min="16"
            max="36"
            disabled={phase !== 'setup'}
            value={font}
            onChange={(e) => setFont(Number(e.target.value))}
          />
        </label>
        <label className="form-field">
          <span>已点击数字</span>
          <select
            aria-label="已点击数字"
            disabled={phase !== 'setup'}
            value={dimCompleted ? 'dim' : 'unchanged'}
            onChange={(e) => setDimCompleted(e.target.value === 'dim')}
          >
            <option value="unchanged">保持原样（标准模式）</option>
            <option value="dim">变灰（辅助模式）</option>
          </select>
          <small>标准模式不标记已完成的位置，保留完整的搜索难度。</small>
        </label>
        <label className="switch-row">
          <span>记录逐个数字反应时间</span>
          <input
            type="checkbox"
            disabled={phase !== 'setup'}
            checked={perNumber}
            onChange={(e) => setPerNumber(e.target.checked)}
          />
        </label>
        <Notice>
          这是视觉搜索专项练习。成绩受网格、字体与策略影响，不代表一般智力或长期注意力。不同设置请分别比较。
        </Notice>
      </aside>
    </div>
  );
}
