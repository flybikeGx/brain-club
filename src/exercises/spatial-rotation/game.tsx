'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Box, Play } from 'lucide-react';
import type { ExerciseAttempt } from '@/domain/types';
import { type Cell, type RotationProblem } from './generator';
import { useTask } from '@/engine/telemetry/use-task';
import { rotationPlugin } from '@/exercises/plugins';
import { newSeed, RepeatGuard } from '@/engine/generators/random';
import { Notice, Result } from '@/components/ui';
const rotationGenerator = rotationPlugin.generator;
type RotationPhase = 'setup' | 'answer' | 'feedback' | 'paused' | 'finishing';
export function Shape({ cells, angle = 0 }: { cells: Cell[]; angle?: number }) {
  const maxX = Math.max(...cells.map((c) => c[0])) + 1,
    maxY = Math.max(...cells.map((c) => c[1])) + 1;
  const scale = 65 / Math.max(maxX, maxY);
  return (
    <svg className="shape-svg" viewBox="0 0 110 110" aria-hidden="true">
      <g
        transform={`translate(55 55) rotate(${angle}) scale(${scale}) translate(${-maxX / 2} ${-maxY / 2})`}
      >
        {cells.map(([x, y]) => (
          <rect
            key={`${x},${y}`}
            x={x + 0.025}
            y={y + 0.025}
            width=".95"
            height=".95"
            rx=".055"
            fill="currentColor"
          />
        ))}
      </g>
    </svg>
  );
}
export function RotationGame() {
  const [complexity, setComplexity] = useState(6),
    [options, setOptions] = useState(3),
    [phase, setPhase] = useState<RotationPhase>('setup'),
    [p, setP] = useState<RotationProblem | null>(null),
    [round, setRound] = useState(0),
    [feedback, setFeedback] = useState(''),
    [selected, setSelected] = useState<number | null>(null);
  const seed = useRef(''),
    attempts = useRef<ExerciseAttempt[]>([]),
    started = useRef(0),
    guard = useRef(new RepeatGuard()),
    currentProblem = useRef<RotationProblem | null>(null),
    answeredProblem = useRef<string | null>(null),
    phaseBeforePause = useRef<'answer' | 'feedback'>('answer'),
    optionsRef = useRef<HTMLDivElement>(null),
    continueRef = useRef<HTMLButtonElement>(null);
  const task = useTask(() => {
    phaseBeforePause.current = phase === 'feedback' ? 'feedback' : 'answer';
    setPhase('paused');
  });
  useEffect(() => {
    if (phase === 'feedback') continueRef.current?.focus({ preventScroll: true });
    if (phase === 'answer' && !optionsRef.current?.contains(document.activeElement)) {
      optionsRef.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus({ preventScroll: true });
    }
  }, [phase, p?.id]);

  function problem(c: number, r: number) {
    let next: RotationProblem;
    let retry = 0;
    do {
      next = rotationGenerator.generate(`${seed.current}:${r}:${retry++}`, {
        complexity: c,
        options,
      });
    } while (!guard.current.accept(JSON.stringify(next.cells)) && retry < 100);
    if (!rotationGenerator.validate(next)) throw new Error('Invalid spatial problem');
    currentProblem.current = next;
    setP(next);
    setSelected(null);
    setFeedback('');
    setPhase('answer');
    started.current = task.clock.current.elapsed();
    task.log('presentation', next.seed);
  }
  function start() {
    seed.current = newSeed('training');
    attempts.current = [];
    guard.current = new RepeatGuard();
    answeredProblem.current = null;
    setRound(0);
    task.begin({
      kind: 'training',
      taskId: 'spatial-rotation',
      title: '二维空间旋转',
      dimension: 'spatial',
      seed: seed.current,
      generatorId: rotationGenerator.id,
      generatorVersion: rotationGenerator.version,
      taskVariant: 'rotation-vs-mirror',
      difficulty: { complexity, options, feedbackMode: 'errors-only' },
    });
    problem(complexity, 0);
  }
  function answer(index: number) {
    if (
      phase !== 'answer' ||
      !p ||
      currentProblem.current?.id !== p.id ||
      answeredProblem.current === p.id
    )
      return;
    answeredProblem.current = p.id;
    const correct = rotationGenerator.score(p, index) === 1;
    attempts.current.push({
      id: crypto.randomUUID(),
      problemId: p.id,
      seed: p.seed,
      difficulty: p.difficulty,
      taskVariant: p.taskVariant,
      correct,
      responseMs: Math.max(0, task.clock.current.elapsed() - started.current),
    });
    task.log('answer', index);
    if (correct) {
      next();
      return;
    }
    setSelected(index);
    setFeedback(
      `正确选项是 ${String.fromCharCode(65 + rotationGenerator.solve(p))}。其他选项经过了镜像，不能仅靠平面旋转重合。`,
    );
    setPhase('feedback');
  }
  function next() {
    if (!p || currentProblem.current?.id !== p.id || answeredProblem.current !== p.id) return;
    if (round === 9) {
      setPhase('finishing');
      const a = attempts.current;
      void task.finish({
        accuracy: a.filter((x) => x.correct).length / a.length,
        score: null,
        attempts: a,
        metrics: {
          correct: a.filter((x) => x.correct).length,
          trials: a.length,
          meanRtMs: a.reduce((sum, x) => sum + x.responseMs, 0) / a.length,
        },
      });
      return;
    }
    let c = Number(p.difficulty.complexity);
    if ((round + 1) % 2 === 0) {
      const previous = c;
      c = Number(
        rotationPlugin.adapt({ complexity: c, options }, attempts.current.slice(-2)).complexity,
      );
      if (previous !== c)
        task.session.current?.difficultyHistory.push({
          at: task.clock.current.elapsed(),
          from: previous,
          to: c,
          reason: 'two-trial-accuracy',
        });
    }
    setRound(round + 1);
    problem(c, round + 1);
  }
  if (task.result)
    return (
      <>
        <Result
          session={task.result}
          error={task.error}
          onAgain={() => {
            task.setResult(null);
            setPhase('setup');
          }}
        />
        {task.error && (
          <button className="button secondary" onClick={() => void task.retrySave()}>
            重试保存
          </button>
        )}
      </>
    );

  const columns = options > 3 ? 2 : options;
  const rows = Math.ceil(options / columns),
    mobileRows = Math.ceil(options / 2);
  const correctIndex = p && phase === 'feedback' ? rotationGenerator.solve(p) : -1;
  const layoutStyle = {
    '--rotation-desktop-columns': columns,
    '--rotation-desktop-space': `${rows * 140 + (rows - 1) * 10}px`,
    '--rotation-mobile-space': `${mobileRows * 125 + (mobileRows - 1) * 10}px`,
  } as CSSProperties;
  return (
    <div className="training-layout">
      <section className="card game-card rotation-game-card" style={layoutStyle} data-phase={phase}>
        {phase === 'setup' ? (
          <div className="game-idle">
            <Box size={43} strokeWidth={1} />
            <h2>在心中，转动它。</h2>
            <p>
              选择与上方图形仅经过旋转就能重合的选项。其余均为镜像。答对自动进入下一题；答错时显示答案，准备好后再继续。共
              10 题，每两题调整形状复杂度。
            </p>
            <button className="button primary" onClick={start}>
              <Play size={15} />
              开始训练
            </button>
          </div>
        ) : phase === 'paused' ? (
          <div className="game-idle">
            <h2>练习已暂停</h2>
            <p>
              {phaseBeforePause.current === 'feedback'
                ? '答案解析已保留，继续后可选择下一题。'
                : '窗口失焦时停止计时。继续后会重新计时当前题目。'}
            </p>
            <button
              className="button primary"
              onClick={() => {
                task.resume();
                if (phaseBeforePause.current === 'answer')
                  started.current = task.clock.current.elapsed();
                setPhase(phaseBeforePause.current);
              }}
            >
              {phaseBeforePause.current === 'feedback' ? '继续查看解析' : '继续本题'}
            </button>
          </div>
        ) : (
          <>
            <div className="game-status">
              <span>
                训练进度 <strong>{round + 1} / 10</strong>
              </span>
              <span>
                形状复杂度 <strong>{p?.difficulty.complexity}</strong>
              </span>
              <span>
                {phase === 'feedback' ? '查看解析' : phase === 'finishing' ? '保存中' : '请选择'}
              </span>
            </div>
            <div className="rotation-target-slot">
              <p className="subtle">目标图形</p>
              <div className="rotation-reference">{p && <Shape cells={p.cells} />}</div>
            </div>
            <p className="subtle rotation-instruction">
              哪个选项仅经过旋转？使用 Tab / Enter 选择。
            </p>
            <div className="rotation-options" ref={optionsRef}>
              {p?.options.map((o, i) => (
                <button
                  className={`rotation-choice ${i === correctIndex ? 'correct-answer' : ''} ${phase === 'feedback' && selected === i ? 'incorrect-answer' : ''}`}
                  key={i}
                  aria-label={`选项 ${String.fromCharCode(65 + i)}`}
                  aria-describedby={phase === 'feedback' ? 'rotation-feedback' : undefined}
                  disabled={phase !== 'answer'}
                  onKeyDown={(event) => {
                    if (event.repeat && (event.key === 'Enter' || event.key === ' '))
                      event.preventDefault();
                  }}
                  onClick={(event) => {
                    if (event.detail <= 1) answer(i);
                  }}
                >
                  <Shape cells={o.cells} angle={o.angle} />
                  <span className="rotation-choice-label">
                    {String.fromCharCode(65 + i)}
                    {i === correctIndex
                      ? ' · 正确答案'
                      : phase === 'feedback' && selected === i
                        ? ' · 你的选择'
                        : ''}
                  </span>
                </button>
              ))}
            </div>
            <div className="rotation-feedback-slot" aria-live="polite">
              {phase === 'feedback' ? (
                <p className="feedback" id="rotation-feedback">
                  {feedback}
                </p>
              ) : (
                <p className="subtle">
                  {phase === 'finishing'
                    ? '正在保存本次练习…'
                    : '答对自动继续；答错查看答案后，手动继续。'}
                </p>
              )}
            </div>
            <div className="rotation-actions-slot">
              {phase === 'feedback' && (
                <button ref={continueRef} className="button primary" onClick={next}>
                  {round === 9 ? '查看结果' : '下一题'}
                </button>
              )}
            </div>
            <div className="progress-track" aria-label="训练完成进度">
              <div style={{ width: `${attempts.current.length * 10}%` }} />
            </div>
          </>
        )}
      </section>
      <aside className="card settings-card">
        <h2>器械设置</h2>
        <label className="form-field">
          <span>初始形状复杂度</span>
          <input
            aria-label="形状复杂度"
            type="number"
            min="5"
            max="12"
            disabled={phase !== 'setup'}
            value={complexity}
            onChange={(e) => setComplexity(Math.min(12, Math.max(5, Number(e.target.value) || 5)))}
          />
          <small>用 5–12 个相连方块组成不对称图形</small>
        </label>
        <label className="form-field">
          <span>选项数量</span>
          <select
            aria-label="选项数量"
            value={options}
            disabled={phase !== 'setup'}
            onChange={(e) => setOptions(Number(e.target.value))}
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} 个 · {n - 1} 个镜像干扰项
              </option>
            ))}
          </select>
        </label>
        <Notice>
          生成器验证每题恰有一个旋转答案，并排除与镜像等价的对称图形。空间旋转训练成绩不代表总体空间能力。
        </Notice>
      </aside>
    </div>
  );
}
