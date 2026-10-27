'use client';
import { useEffect, useRef, useState } from 'react';
import { Brain, Play } from 'lucide-react';
import type { ExerciseAttempt, Session } from '@/domain/types';
import {
  assessmentDigitGenerator,
  assessments,
  advanceSpan,
  corsiGenerator,
  type CorsiProblem,
} from '@/assessments/engine';
import {
  parseDigits,
  type DigitProblem,
  type DigitVariant,
} from '@/exercises/digit-span/generator';
import { newSeed, RepeatGuard } from '@/engine/generators/random';
import { digitPlugin } from '@/exercises/plugins';
const digitGenerator = digitPlugin.generator;
import { useTask } from '@/engine/telemetry/use-task';
import { Notice, Result } from './ui';
import { LineChart } from './charts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/storage/db';
import { DigitRecallPanel } from './digit-recall-panel';
type SequenceProblem = DigitProblem | CorsiProblem;
type Phase = 'setup' | 'present' | 'answer' | 'feedback' | 'interrupted';
export function SequenceGame({ assessmentId }: { assessmentId?: string }) {
  const isAssessment = Boolean(assessmentId),
    spatial = assessmentId === 'corsi',
    definition = assessments.find((a) => a.id === assessmentId);
  const [variant, setVariant] = useState<DigitVariant>(
      assessmentId === 'digit-backward' ? 'backward' : 'forward',
    ),
    [initial, setInitial] = useState(3),
    [speed, setSpeed] = useState(900),
    [length, setLength] = useState(3),
    [phase, setPhase] = useState<Phase>('setup'),
    [problem, setProblem] = useState<SequenceProblem | null>(null),
    [display, setDisplay] = useState(-1),
    [input, setInput] = useState(''),
    [selected, setSelected] = useState<number[]>([]),
    [trial, setTrial] = useState(0),
    [practice, setPractice] = useState(isAssessment),
    [feedback, setFeedback] = useState(''),
    [maxSpan, setMaxSpan] = useState(0);
  const attempts = useRef<ExerciseAttempt[]>([]),
    answerStarted = useRef(0),
    seed = useRef(''),
    streak = useRef(0),
    guard = useRef(new RepeatGuard()),
    lastAnswer = useRef(false),
    history =
      useLiveQuery(
        () =>
          db.sessions
            .where('taskId')
            .equals(assessmentId ?? 'digit-training')
            .toArray(),
        [assessmentId],
      ) ?? [];
  const task = useTask(() => setPhase('interrupted'));
  const trials = isAssessment ? 8 : 10;
  function nextProblem(l: number, index: number, isPractice: boolean) {
    let p: SequenceProblem;
    let retries = 0;
    do {
      const itemSeed = `${seed.current}:${isPractice ? 'practice' : 'formal'}:${index}:${retries++}`;
      p = spatial
        ? corsiGenerator.generate(itemSeed, { length: l })
        : (isAssessment ? assessmentDigitGenerator : digitGenerator).generate(itemSeed, {
            length: l,
            variant,
            speed,
          });
      if (retries > 100) throw new Error('Unable to generate a new sequence');
    } while (!guard.current.accept(JSON.stringify('sequence' in p ? p.sequence : [])));
    setProblem(p);
    setInput('');
    setSelected([]);
    setDisplay(-1);
    setPhase('present');
    task.log(isPractice ? 'practice-presentation' : 'presentation', p.seed);
  }
  function start() {
    seed.current = newSeed(isAssessment ? 'assessment' : 'training');
    attempts.current = [];
    streak.current = 0;
    guard.current = new RepeatGuard();
    const startLength = isAssessment ? 3 : initial;
    setLength(startLength);
    setTrial(0);
    setMaxSpan(0);
    setPractice(isAssessment);
    task.begin({
      kind: isAssessment ? 'assessment' : 'training',
      taskId: assessmentId ?? 'digit-training',
      title: definition?.title ?? '数字记忆训练',
      dimension: spatial ? 'spatial' : 'memory',
      seed: seed.current,
      generatorId: spatial
        ? 'assessment-corsi'
        : isAssessment
          ? 'assessment-digit'
          : 'digit-training',
      generatorVersion: '1.0.0',
      taskVariant: spatial ? 'spatial-forward' : variant,
      difficulty: {
        initialLength: startLength,
        speed: isAssessment ? 900 : speed,
        variant,
        trials,
        feedback: !isAssessment,
        adaptation: isAssessment ? 'two-trial-staircase' : 'two-trial-accuracy',
      },
    });
    nextProblem(startLength, 0, isAssessment);
  }
  useEffect(() => {
    if (phase !== 'present' || !problem) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ms = isAssessment ? 900 : speed;
    problem.sequence.forEach((_, i) => {
      timers.push(setTimeout(() => setDisplay(i), 450 + i * ms));
      timers.push(setTimeout(() => setDisplay(-1), 450 + i * ms + ms * 0.68));
    });
    timers.push(
      setTimeout(
        () => {
          setDisplay(-1);
          setPhase('answer');
          answerStarted.current = task.clock.current.elapsed();
        },
        450 + problem.sequence.length * ms,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [problem, phase, isAssessment, speed, task.clock]);
  function submit(answer?: number[]) {
    if (!problem || phase !== 'answer') return;
    const a = answer ?? parseDigits(input);
    const correct = spatial
      ? corsiGenerator.score(problem as CorsiProblem, a) === 1
      : digitGenerator.score(problem as DigitProblem, a) === 1;
    lastAnswer.current = correct;
    task.log(practice ? 'practice-answer' : 'answer', spatial ? a.join(',') : a.join(''));
    if (!practice) {
      attempts.current.push({
        id: crypto.randomUUID(),
        problemId: problem.id,
        seed: problem.seed,
        difficulty: problem.difficulty,
        taskVariant: problem.taskVariant,
        correct,
        responseMs: Math.max(0, task.clock.current.elapsed() - answerStarted.current),
      });
      if (correct) setMaxSpan((m) => Math.max(m, length));
    }
    const solved = spatial ? [] : digitGenerator.solve(problem as DigitProblem);
    setFeedback(
      isAssessment
        ? practice
          ? correct
            ? '练习完成。准备进入正式测评。'
            : '练习未正确复现。确认规则后进入正式测评。'
          : '本试次已记录。'
        : correct
          ? '完整复现，继续下一组。'
          : `这组的正确序列是 ${solved.join(' ')}。按自己的节奏继续。`,
    );
    setPhase('feedback');
  }
  function proceed() {
    if (practice) {
      setPractice(false);
      setTrial(0);
      setLength(3);
      nextProblem(3, 0, false);
      return;
    }
    const nextIndex = trial + 1;
    if (nextIndex >= trials) {
      complete();
      return;
    }
    const previousLength = length;
    let nextLength: number;
    if (isAssessment) {
      const next = advanceSpan(length, streak.current, lastAnswer.current, spatial ? 9 : 12);
      nextLength = next.length;
      streak.current = next.streak;
    } else {
      const window = attempts.current.slice(-2);
      nextLength =
        window.length === 2 && nextIndex % 2 === 0
          ? Number(digitPlugin.adapt({ length }, window).length)
          : length;
    }
    if (nextLength !== previousLength)
      task.session.current?.difficultyHistory.push({
        at: task.clock.current.elapsed(),
        from: previousLength,
        to: nextLength,
        reason: isAssessment ? 'two-trial-staircase' : 'two-trial-accuracy',
      });
    setLength(nextLength);
    setTrial(nextIndex);
    nextProblem(nextLength, nextIndex, false);
  }
  function complete(invalid = false) {
    const a = attempts.current,
      correct = a.filter((x) => x.correct).length;
    const metrics = {
      ...(a.length
        ? { meanRtMs: a.reduce((sum, item) => sum + item.responseMs, 0) / a.length }
        : {}),
      maxSpan: a
        .filter((x) => x.correct)
        .reduce((m, x) => Math.max(m, Number(x.difficulty.length)), 0),
      correct,
      trials: a.length,
      length,
    };
    const patch: Partial<Session> = {
      attempts: a,
      accuracy: a.length ? correct / a.length : null,
      score: null,
      metrics,
      valid: !invalid,
      completed: !invalid,
      ...(invalid
        ? { invalidReason: '测评期间窗口失焦或切到后台，本次结果不能作为有效基线。' }
        : {}),
      ...(isAssessment
        ? {
            assessment: {
              testId: assessmentId!,
              testVersion: '1.0.0',
              practiceTrials: 1,
              metrics,
              limitations: definition!.limitations,
            },
          }
        : {}),
    };
    void task.finish(patch);
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
        <section className="card section-gap">
          <h3>同任务历史 · 最大成功广度</h3>
          <LineChart
            label="广度学习曲线"
            points={history
              .filter((s) => s.valid)
              .slice(-15)
              .map((s, i) => ({ label: `第 ${i + 1} 次`, value: s.metrics.maxSpan ?? 0 }))}
            unit=" 位"
          />
        </section>
      </>
    );
  if (phase === 'interrupted')
    return (
      <section className="card setup-panel">
        <h2>练习已中断</h2>
        <Notice>
          检测到窗口失焦或页面进入后台。数字与空间序列不能从中间继续，以免改变记忆条件。本次将记为无效；重新开始会使用新的随机种子。
        </Notice>
        <div className="button-row">
          <button className="button primary" onClick={() => complete(true)}>
            结束并记录中断
          </button>
        </div>
      </section>
    );
  return (
    <div className="training-layout">
      <section className={`card game-card ${spatial ? '' : 'digit-game-card'}`}>
        {phase === 'setup' ? (
          <div className="game-idle">
            <Brain size={42} strokeWidth={1} />
            <h2>{definition?.title ?? '让记忆，接受一点挑战。'}</h2>
            <p>
              {spatial
                ? '观察方块依次亮起，随后复现点击顺序。'
                : variant === 'updating'
                  ? `数字会持续更新，请记住最后 ${initial} 位。`
                  : variant === 'backward'
                    ? '记住依次出现的数字，再按相反顺序输入。'
                    : '记住依次出现的数字，再按原顺序输入。'}
              {isAssessment
                ? '先练习 1 次，再正式测评 8 次。'
                : '共 10 组，每两组根据正确率调整长度。'}
            </p>
            <button className="button primary" onClick={start}>
              <Play size={15} />
              {isAssessment ? '开始练习阶段' : '开始训练'}
            </button>
          </div>
        ) : (
          <>
            <div className="game-status">
              <span>
                {practice ? '练习阶段' : isAssessment ? '正式测评' : '正式训练'}{' '}
                <strong>{practice ? '1 / 1' : `${trial + 1} / ${trials}`}</strong>
              </span>
              <span>
                当前广度 <strong>{length}</strong>
              </span>
              <span>
                {phase === 'present' ? '观察中' : phase === 'answer' ? '请复现' : '已记录'}
              </span>
            </div>
            {spatial ? (
              <>
                <div className="corsi-board" aria-label="空间序列区域">
                  {(problem as CorsiProblem)?.positions.map((p, i) => (
                    <button
                      key={i}
                      aria-label={`位置 ${i + 1}`}
                      disabled={phase !== 'answer'}
                      style={{ left: `${p.x}%`, top: `${p.y}%` }}
                      className={`corsi-cell ${display >= 0 && problem?.sequence[display] === i ? 'lit' : ''} ${selected.includes(i) ? 'chosen' : ''}`}
                      onClick={() => {
                        const a = [...selected, i];
                        setSelected(a);
                        task.log('spatial-select', i);
                        if (a.length === problem?.sequence.length) submit(a);
                      }}
                    />
                  ))}
                </div>
                {phase === 'answer' && (
                  <p className="subtle">
                    已输入 {selected.length} / {problem?.sequence.length} 个位置 · 可用 Tab 与 Enter
                    逐个选择
                  </p>
                )}
              </>
            ) : (
              <DigitRecallPanel
                phase={phase}
                digit={display >= 0 ? problem?.sequence[display] : undefined}
                variant={variant}
                recallLength={length}
                input={input}
                feedback={feedback}
                proceedLabel={
                  practice ? '进入正式测评' : trial + 1 >= trials ? '查看结果' : '下一组'
                }
                onInputChange={setInput}
                onKeypadAction={(action) => task.log('keypad-input', action)}
                onSubmit={() => submit()}
                onProceed={proceed}
              />
            )}
            {spatial && phase === 'feedback' && (
              <div className="game-idle">
                <p className="trial-feedback" aria-live="polite">
                  {feedback}
                </p>
                <button className="button primary" onClick={proceed}>
                  {practice ? '进入正式测评' : trial + 1 >= trials ? '查看结果' : '下一组'}
                </button>
              </div>
            )}
            <div className="progress-track section-gap">
              <div
                style={{ width: `${((trial + (phase === 'feedback' ? 1 : 0)) / trials) * 100}%` }}
              />
            </div>
          </>
        )}
      </section>
      <aside className="card settings-card">
        <h2>{isAssessment ? '测评规则' : '训练设置'}</h2>
        {isAssessment ? (
          <>
            <ol className="instructions">
              {definition?.instructions.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <details className="info-detail">
              <summary>计分与重复测量</summary>
              <p>{definition?.scoring}</p>
              <p>{definition?.repeatControl}</p>
            </details>
            <Notice>
              正式阶段不显示正确答案。失焦或进入后台将中断并标记无效。{definition?.limitations[0]}
            </Notice>
          </>
        ) : (
          <>
            <label className="form-field">
              <span>训练方式</span>
              <select
                aria-label="训练方式"
                value={variant}
                disabled={phase !== 'setup'}
                onChange={(e) => setVariant(e.target.value as DigitVariant)}
              >
                <option value="forward">正向复现</option>
                <option value="backward">反向复现</option>
                <option value="updating">动态更新 · 保留末尾</option>
              </select>
            </label>
            <label className="form-field">
              <span>初始序列长度</span>
              <input
                aria-label="初始序列长度"
                type="number"
                min="2"
                max="12"
                disabled={phase !== 'setup'}
                value={initial}
                onChange={(e) => setInitial(Math.max(2, Math.min(12, Number(e.target.value) || 2)))}
              />
            </label>
            <label className="form-field">
              <span>每位展示间隔</span>
              <select
                aria-label="每位展示间隔"
                value={speed}
                disabled={phase !== 'setup'}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[500, 700, 900, 1200, 1500].map((s) => (
                  <option key={s} value={s}>
                    {s} ms
                  </option>
                ))}
              </select>
            </label>
            <Notice>
              训练有即时反馈，体测没有。训练与测评使用独立的种子命名空间和配置，不能直接混合比较成绩。
            </Notice>
          </>
        )}
      </aside>
    </div>
  );
}
