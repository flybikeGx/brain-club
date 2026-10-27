'use client';
import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { useTask } from '@/engine/telemetry/use-task';
import { newSeed } from '@/engine/generators/random';
import { scorePvt } from './pvt';
import { pvtScheduleGenerator } from './pvt-generator';
import { assessments } from './engine';
import { Notice, Result } from '@/components/ui';
import { time } from '@/lib/format';
import type { RawEvent } from '@/domain/types';
export function PvtGame() {
  const [seconds, setSeconds] = useState(180),
    [phase, setPhase] = useState<'setup' | 'practice' | 'practice-done' | 'formal' | 'interrupted'>(
      'setup',
    ),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState('等待信号'),
    [practiceCount, setPracticeCount] = useState(0);
  const task = useTask(() => setPhase('interrupted')),
    stimulusAt = useRef<number | null>(null),
    waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    missTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    intervals = useRef<number[]>([]),
    intervalIndex = useRef(0),
    respondRef = useRef(() => {}),
    scheduleRef = useRef(() => {}),
    isPractice = useRef(true),
    active = useRef(false),
    count = useRef(0);
  function clear() {
    if (waitTimer.current) clearTimeout(waitTimer.current);
    if (missTimer.current) clearTimeout(missTimer.current);
    stimulusAt.current = null;
    setReady(false);
  }
  function done(invalid = false) {
    active.current = false;
    if (stimulusAt.current !== null) task.log('censored');
    clear();
    const events = task.session.current?.eventLog ?? [];
    const metrics = scorePvt(events);
    void task.finish({
      valid: !invalid,
      completed: !invalid,
      ...(invalid ? { invalidReason: '窗口失焦、页面后台运行或计时调度异常，本次测评无效。' } : {}),
      accuracy: null,
      score: null,
      metrics,
      assessment: {
        testId: 'pvt',
        testVersion: '1.0.0',
        practiceTrials: 3,
        metrics,
        limitations: assessments.find((a) => a.id === 'pvt')!.limitations,
      },
    });
  }
  function advance() {
    if (!active.current) return;
    if (isPractice.current) {
      count.current++;
      setPracticeCount(count.current);
      if (count.current >= 3) {
        active.current = false;
        task.pause('practice-complete');
        setPhase('practice-done');
        return;
      }
    }
    scheduleRef.current();
  }
  scheduleRef.current = () => {
    if (!active.current) return;
    setReady(false);
    setMessage('等待信号');
    stimulusAt.current = null;
    const wait = intervals.current[intervalIndex.current++];
    if (wait === undefined) {
      done(true);
      return;
    }
    task.log('interval', wait);
    const expected = performance.now() + wait;
    waitTimer.current = setTimeout(() => {
      if (!active.current) return;
      if (performance.now() - expected > 250) {
        active.current = false;
        setPhase('interrupted');
        task.pause('timer-throttled');
        return;
      }
      stimulusAt.current = performance.now();
      task.log('stimulus');
      setReady(true);
      setMessage('现在反应');
      missTimer.current = setTimeout(() => {
        if (stimulusAt.current === null || !active.current) return;
        task.log('omission');
        stimulusAt.current = null;
        setReady(false);
        setMessage('未反应 · 下一次继续');
        advance();
      }, 1500);
    }, wait);
  };
  respondRef.current = () => {
    if (!active.current) return;
    if (stimulusAt.current === null) {
      task.log('false-start');
      setMessage('抢答 · 请等待绿色信号');
      return;
    }
    const rt = performance.now() - stimulusAt.current;
    stimulusAt.current = null;
    if (missTimer.current) clearTimeout(missTimer.current);
    setReady(false);
    if (rt < 100) {
      task.log('anticipation', rt);
      setMessage('过早反应 · 下一次继续');
    } else if (rt > 1500) {
      task.log('omission');
      setMessage('未及时反应');
    } else {
      task.log('response', rt);
      setMessage(`${Math.round(rt)} ms`);
    }
    advance();
  };
  function start(practice: boolean) {
    clear();
    isPractice.current = practice;
    count.current = 0;
    setPracticeCount(0);
    const seed = newSeed('assessment');
    const schedule = pvtScheduleGenerator.generate(seed, {
      seconds,
      minInterval: 2000,
      maxInterval: 5000,
    });
    intervals.current = schedule.intervals;
    intervalIndex.current = 0;
    task.begin({
      kind: 'assessment',
      taskId: 'pvt',
      title: '简短警觉性任务',
      dimension: 'attention',
      seed,
      generatorId: 'assessment-pvt',
      generatorVersion: '1.0.0',
      taskVariant: practice ? 'practice' : 'short-pvt',
      difficulty: { seconds, minInterval: 2000, maxInterval: 5000, timeoutMs: 1500 },
    });
    active.current = true;
    setPhase(practice ? 'practice' : 'formal');
    scheduleRef.current();
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' && active.current) {
        e.preventDefault();
        if (!e.repeat) respondRef.current();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      active.current = false;
      if (waitTimer.current) clearTimeout(waitTimer.current);
      if (missTimer.current) clearTimeout(missTimer.current);
    };
  }, []);
  useEffect(() => {
    if (phase === 'formal' && task.elapsed >= seconds) done();
  }, [task.elapsed, seconds, phase]);
  useEffect(() => {
    if (phase === 'interrupted') {
      active.current = false;
      clear();
    }
  }, [phase]);
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
          <h3>本次反应时分布（有效反应）</h3>
          <div className="result-stats">
            {[
              [100, 250],
              [250, 500],
              [500, 1000],
              [1000, 1501],
            ].map(([lo, hi]) => (
              <div className="stat-card" key={lo}>
                <span className="subtle">
                  {lo}–{hi - 1}ms
                </span>
                <div className="stat-number">
                  {
                    task.result!.eventLog.filter(
                      (e: RawEvent) =>
                        e.type === 'response' && Number(e.value) >= lo && Number(e.value) < hi,
                    ).length
                  }
                </div>
              </div>
            ))}
          </div>
          <p className="subtle">
            有效反应为 100–1500ms；<span>{'<100ms'}</span>{' '}
            单列为预期性反应。无有效反应时不显示中位数。
          </p>
        </section>
      </>
    );
  return (
    <div className="training-layout">
      <section className="card game-card">
        {phase === 'setup' ? (
          <div className="game-idle">
            <Target size={43} strokeWidth={1} />
            <h2>等待，然后反应。</h2>
            <p>
              信号变绿后，尽快按空格键或点击反应区。信号之前请等待。先练习 3 次，再开始计时测评。
            </p>
            <button className="button primary" onClick={() => start(true)}>
              开始练习阶段
            </button>
          </div>
        ) : phase === 'practice-done' ? (
          <div className="game-idle">
            <h2>练习结束，准备好了。</h2>
            <p>正式任务持续 {seconds / 60} 分钟。请使用同一种输入方式，保持窗口在前台。</p>
            <button className="button primary" onClick={() => start(false)}>
              开始正式测评
            </button>
          </div>
        ) : phase === 'interrupted' ? (
          <div className="game-idle">
            <h2>测评已中断</h2>
            <Notice>检测到窗口失焦或调度延迟。本次不能作为有效测评。</Notice>
            <button className="button primary" onClick={() => done(true)}>
              结束并记录无效结果
            </button>
          </div>
        ) : (
          <>
            <div className="game-status">
              <span>{phase === 'practice' ? `练习 ${practiceCount} / 3` : '正式测评'}</span>
              <strong>{phase === 'formal' ? time(seconds - task.elapsed) : '熟悉操作'}</strong>
            </div>
            <button
              className={`pvt-area ${ready ? 'ready' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                respondRef.current();
              }}
              aria-label={ready ? '绿色信号，请反应' : '等待信号，提前操作记为抢答'}
            >
              <Target size={40} strokeWidth={1.2} />
              <span>{message}</span>
              <small>空格键 / 点击反应区</small>
            </button>
            <button
              className="button ghost section-gap"
              onClick={() => {
                task.pause('user-abort');
                setPhase('interrupted');
              }}
            >
              提前结束本次测评
            </button>
          </>
        )}
      </section>
      <aside className="card settings-card">
        <h2>测评设置</h2>
        <label className="form-field">
          <span>正式测评时长</span>
          <select
            aria-label="警觉性测评时长"
            disabled={phase !== 'setup'}
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
          >
            <option value="60">1 分钟 · 演示短测</option>
            <option value="180">3 分钟 · 默认短测</option>
            <option value="300">5 分钟</option>
          </select>
        </label>
        <ol className="instructions">
          <li>刺激间隔 2–5 秒。</li>
          <li>1.5 秒未反应记为遗漏。</li>
          <li>反应时超过 500ms 单列为迟缓。</li>
          <li>不同设备及时长的记录请分开比较。</li>
        </ol>
        <Notice>
          PVT-like 浏览器短测不等同于临床标准 PVT。屏幕刷新率、键盘与触屏延迟会影响结果。
        </Notice>
      </aside>
    </div>
  );
}
