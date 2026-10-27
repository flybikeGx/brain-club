'use client';
import { useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { originalReadingProvider } from './reading';
import { assessments } from './engine';
import { useTask } from '@/engine/telemetry/use-task';
import { newSeed } from '@/engine/generators/random';
import { Notice, Result } from '@/components/ui';
export function ReadingGame() {
  const materials = originalReadingProvider.list(),
    [materialId, setMaterialId] = useState(materials[0].id),
    [phase, setPhase] = useState<
      'setup' | 'practice' | 'practice-feedback' | 'formal' | 'interrupted'
    >('setup'),
    [practiceAnswer, setPracticeAnswer] = useState(-1),
    [answers, setAnswers] = useState<number[]>([-1, -1, -1]),
    [feedback, setFeedback] = useState(''),
    answerTimes = useRef<number[]>([0, 0, 0]);
  const task = useTask(() => setPhase('interrupted'));
  const m = originalReadingProvider.get(materialId)!;
  function begin(practice: boolean) {
    task.begin({
      kind: 'assessment',
      taskId: 'reading',
      title: '阅读理解',
      dimension: 'reading',
      seed: newSeed('assessment'),
      generatorId: originalReadingProvider.id,
      generatorVersion: originalReadingProvider.version,
      taskVariant: m.id,
      difficulty: { bankVersion: m.version, materialId: m.id, questions: m.questions.length },
    });
    setAnswers([-1, -1, -1]);
    answerTimes.current = [0, 0, 0];
    setPhase(practice ? 'practice' : 'formal');
  }
  function complete(invalid = false) {
    const correct = answers.filter((a, i) => a === m.questions[i].answer).length;
    const metrics = { correct, trials: m.questions.length };
    void task.finish({
      accuracy: correct / m.questions.length,
      score: null,
      valid: !invalid,
      completed: !invalid,
      ...(invalid ? { invalidReason: '阅读测评期间窗口失焦，本次测评标记无效。' } : {}),
      metrics,
      attempts: m.questions.map((q, i) => ({
        id: crypto.randomUUID(),
        problemId: `${m.id}:q${i + 1}`,
        seed: task.session.current!.seed,
        difficulty: task.session.current!.difficulty,
        taskVariant: m.id,
        correct: answers[i] === q.answer,
        responseMs: answerTimes.current[i],
      })),
      assessment: {
        testId: 'reading',
        testVersion: '1.0.0',
        practiceTrials: 1,
        metrics,
        limitations: assessments.find((a) => a.id === 'reading')!.limitations,
      },
    });
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
  if (phase === 'interrupted')
    return (
      <section className="card">
        <h2>测评已中断</h2>
        <Notice>检测到窗口失焦或页面进入后台。本次不能作为有效基线。</Notice>
        <button className="button primary section-gap" onClick={() => complete(true)}>
          结束并记录中断
        </button>
      </section>
    );
  return (
    <div className="training-layout">
      <section className="card">
        {phase === 'setup' ? (
          <div className="game-card">
            <div className="game-idle">
              <BookOpen size={43} strokeWidth={1} />
              <h2>读懂，也留意推断。</h2>
              <p>
                先完成一道练习，再阅读原创短文并回答 3
                个问题。可以回看原文，无时间限制；计时只作原始记录。
              </p>
              <button className="button primary" onClick={() => begin(true)}>
                开始练习阶段
              </button>
            </div>
          </div>
        ) : phase === 'practice' || phase === 'practice-feedback' ? (
          <>
            <span className="badge">独立练习材料</span>
            <p className="reading-text section-gap">
              小林每天骑车去公园。有一天下雨，他选择乘公交，以免淋湿。
            </p>
            <div className="question">
              <p>根据这段话，小林那天乘公交的直接原因是什么？</p>
              {['他不会骑车', '他想避免被雨淋湿', '公园永久关闭'].map((s, i) => (
                <label className="answer-option" key={s}>
                  <input
                    type="radio"
                    name="practice"
                    value={i}
                    disabled={phase === 'practice-feedback'}
                    checked={practiceAnswer === i}
                    onChange={() => setPracticeAnswer(i)}
                  />
                  {s}
                </label>
              ))}
            </div>
            {phase === 'practice' ? (
              <button
                className="button primary section-gap"
                disabled={practiceAnswer < 0}
                onClick={() => {
                  setFeedback(
                    practiceAnswer === 1
                      ? '正确。题目询问文中明确给出的原因。'
                      : '答案是“他想避免被雨淋湿”。请区分文本信息与额外推断。',
                  );
                  task.pause('practice-complete');
                  setPhase('practice-feedback');
                }}
              >
                提交练习
              </button>
            ) : (
              <>
                <p className="feedback">{feedback}</p>
                <button className="button primary" onClick={() => begin(false)}>
                  进入正式测评
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <span className="badge">
              原创示例 · {m.id} · v{m.version}
            </span>
            <h2 className="section-gap">{m.title}</h2>
            <div className="reading-text section-gap">{m.text}</div>
            {m.questions.map((q, i) => (
              <fieldset className="question" key={q.prompt}>
                <legend>
                  {i + 1}. {q.prompt}
                </legend>
                {q.options.map((o, j) => (
                  <label key={o} className="answer-option">
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={answers[i] === j}
                      onChange={() => {
                        setAnswers((a) => a.map((v, k) => (k === i ? j : v)));
                        answerTimes.current[i] = task.clock.current.elapsed();
                        task.log(`answer-q${i}`, j);
                      }}
                    />
                    {o}
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              className="button primary section-gap"
              disabled={answers.some((a) => a < 0)}
              onClick={() => complete()}
            >
              提交本次测评
            </button>
          </>
        )}
      </section>
      <aside className="card settings-card">
        <h2>材料与限制</h2>
        <label className="form-field">
          <span>原创示例材料</span>
          <select
            aria-label="阅读测评材料"
            value={materialId}
            disabled={phase !== 'setup'}
            onChange={(e) => setMaterialId(e.target.value)}
          >
            {materials.map((m) => (
              <option value={m.id} key={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <Notice>
          目前仅有 2
          篇原创示例，未标准化。读过的材料会产生明显练习效应。不能据此推断整体阅读能力，也不能视为无限题库。
        </Notice>
        <p className="subtle section-gap">
          ReadingProvider 插件接口支持后续接入经过授权与质量审查的新材料。
        </p>
      </aside>
    </div>
  );
}
