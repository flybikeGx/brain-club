'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveClock } from '@/engine/telemetry/clock';
import { db, saveSession } from '@/storage/db';
import { createSession } from '@/storage/session';
import { newSeed } from '@/engine/generators/random';
import type { RawEvent, Session } from '@/domain/types';
export interface MindConfig {
  seconds: number;
  anchor: 'breath' | 'body';
  mode: 'guided' | 'quiet';
  sound: boolean;
  visual: boolean;
  guidance: boolean;
  frequency: number;
}
export type MindPhase = 'setup' | 'running' | 'paused' | 'review' | 'saved';
interface Snapshot {
  config: MindConfig;
  phase: MindPhase;
  elapsed: number;
  awareness: number;
  before: number;
  after: number;
  comfortable: boolean;
  reflection: string;
  stage: number;
  startedAt: string;
  seed: string;
  sessionId: string;
  events: RawEvent[];
}
export function useMindfulness() {
  const [config, setConfig] = useState<MindConfig>({
    seconds: 300,
    anchor: 'breath',
    mode: 'guided',
    sound: false,
    visual: true,
    guidance: true,
    frequency: 60,
  });
  const [phase, setPhase] = useState<MindPhase>('setup'),
    [elapsed, setElapsed] = useState(0),
    [awareness, setAwareness] = useState(0),
    [before, setBefore] = useState(3),
    [after, setAfter] = useState(3),
    [comfortable, setComfortable] = useState(true),
    [reflection, setReflection] = useState(''),
    [stage, setStage] = useState(1),
    [recovered, setRecovered] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<Session | null>(null);
  const clock = useRef(new ActiveClock()),
    events = useRef<RawEvent[]>([]),
    meta = useRef({ startedAt: '', seed: '', sessionId: '' }),
    snapshot = useRef<Snapshot | null>(null),
    audio = useRef<AudioContext | null>(null),
    lastCue = useRef(-1),
    saving = useRef(false);
  const chime = useCallback(() => {
    if (!config.sound) return;
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      void ctx.resume();
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 528;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 1.6);
    } catch {
      /* Optional audio; timer is independent. */
    }
  }, [config.sound]);
  const log = (type: string, value?: RawEvent['value']) =>
    events.current.push({
      type,
      at: clock.current.elapsed(),
      ...(value === undefined ? {} : { value }),
    });
  const persist = useCallback(async () => {
    const s = snapshot.current;
    if (saving.current) return;
    if (s && s.phase !== 'setup' && s.phase !== 'saved')
      await db.drafts.put({
        id: 'mindfulness',
        updatedAt: new Date().toISOString(),
        value: { ...s, elapsed: clock.current.elapsed() / 1000, events: [...events.current] },
      });
  }, []);
  const pause = useCallback(
    (reason = 'manual') => {
      if (!clock.current.running) return;
      clock.current.pause();
      events.current.push({ type: 'pause', at: clock.current.elapsed(), value: reason });
      setElapsed(clock.current.elapsed() / 1000);
      setPhase('paused');
      if (snapshot.current) snapshot.current = { ...snapshot.current, phase: 'paused' };
      void persist().catch(() => setError('浏览器无法保存恢复点，请检查本地存储权限。'));
    },
    [persist],
  );
  useEffect(() => {
    let alive = true;
    Promise.all([db.drafts.get('mindfulness'), db.preferences.get('user')])
      .then(([draft, p]) => {
        if (!alive) return;
        if (p) setStage(p.mindfulnessStage);
        const d = draft?.value as Snapshot | undefined;
        if (
          d &&
          ['running', 'paused', 'review'].includes(d.phase) &&
          d.config?.seconds > 0 &&
          Number.isFinite(d.elapsed)
        ) {
          setConfig(d.config);
          clock.current = new ActiveClock(undefined, d.elapsed * 1000);
          setElapsed(d.elapsed);
          setAwareness(d.awareness);
          setBefore(d.before);
          setAfter(d.after);
          setComfortable(d.comfortable);
          setReflection(d.reflection);
          setStage(d.stage);
          meta.current = { startedAt: d.startedAt, seed: d.seed, sessionId: d.sessionId };
          events.current = d.events;
          setPhase(d.phase === 'review' ? 'review' : 'paused');
          setRecovered(true);
        }
      })
      .catch(() => setError('本地存储不可用，无法恢复记录。'))
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  snapshot.current = {
    config,
    phase,
    elapsed,
    awareness,
    before,
    after,
    comfortable,
    reflection,
    stage,
    ...meta.current,
    events: events.current,
  };
  useEffect(() => {
    if (loaded) void persist().catch(() => setError('恢复点保存失败。'));
  }, [config, phase, awareness, before, after, comfortable, reflection, stage, loaded, persist]);
  useEffect(() => {
    const onBlur = () => pause('window-blur');
    const onVisibility = () => {
      if (document.hidden) pause('hidden');
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    const saveInterval = setInterval(() => void persist().catch(() => {}), 5000);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(saveInterval);
      clock.current.pause();
      void persist().catch(() => {});
    };
  }, [pause, persist]);
  // Elapsed time comes from performance.now(), never from interval tick counts.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const value = clock.current.elapsed() / 1000;
      setElapsed(Math.min(config.seconds, value));
      const cue = Math.floor(value / config.frequency);
      if (cue > lastCue.current) {
        lastCue.current = cue;
        if (cue > 0) chime();
      }
      if (value >= config.seconds) {
        clock.current.pause();
        log('complete');
        setElapsed(config.seconds);
        setPhase('review');
        chime();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, config.seconds, config.frequency, chime]);
  function start() {
    if (!loaded) return;
    clock.current = new ActiveClock();
    events.current = [];
    meta.current = {
      startedAt: new Date().toISOString(),
      seed: newSeed('mindfulness'),
      sessionId: crypto.randomUUID(),
    };
    setElapsed(0);
    setAwareness(0);
    setResult(null);
    setRecovered(false);
    setError('');
    lastCue.current = 0;
    clock.current.start();
    log('start', config.anchor);
    setPhase('running');
    chime();
  }
  function resume() {
    clock.current.start();
    log('resume');
    setRecovered(false);
    setPhase('running');
  }
  function finish() {
    clock.current.pause();
    log('early-finish');
    setElapsed(Math.min(config.seconds, clock.current.elapsed() / 1000));
    setPhase('review');
  }
  function notice() {
    if (phase === 'running') {
      log('awareness');
      setAwareness((x) => x + 1);
    }
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setError('');
    const s = createSession({
      kind: 'mindfulness',
      taskId: 'mindfulness',
      title: '正念练习',
      dimension: 'mindfulness',
      seed: meta.current.seed,
      generatorId: 'focused-attention',
      generatorVersion: '1.0.0',
      taskVariant: `${config.anchor}-${config.mode}`,
      difficulty: {
        plannedSeconds: config.seconds,
        stage,
        frequency: config.frequency,
        sound: config.sound,
        visual: config.visual,
        guidance: config.guidance,
      },
    });
    Object.assign(s, {
      ...meta.current,
      duration: Math.min(elapsed, config.seconds),
      endedAt: new Date().toISOString(),
      completed: elapsed >= config.seconds,
      eventLog: [...events.current, { type: 'review', at: elapsed * 1000, value: reflection }],
      metrics: { awarenessCount: awareness },
      mindfulness: {
        anchor: config.anchor,
        mode: config.mode,
        plannedSeconds: config.seconds,
        awarenessCount: awareness,
        before,
        after,
        comfortable,
        reflection,
        stage,
      },
    });
    try {
      await db.transaction('rw', db.sessions, db.drafts, async () => {
        await saveSession(s);
        await db.drafts.delete('mindfulness');
      });
      if (snapshot.current) snapshot.current.phase = 'saved';
      setResult(s);
      setPhase('saved');
    } catch {
      setError('保存失败。请勿关闭页面，检查浏览器存储后重试。');
    } finally {
      saving.current = false;
    }
  }
  async function chooseStage(next: number) {
    setStage(next);
    try {
      const p = await db.preferences.get('user');
      await db.preferences.put({
        id: 'user',
        schemaVersion: 2,
        locale: 'zh-CN',
        theme: p?.theme ?? 'system',
        mindfulnessStage: next,
      });
    } catch {
      setError('课程偏好保存失败。');
    }
  }
  async function reset() {
    await db.drafts.delete('mindfulness');
    setPhase('setup');
    setRecovered(false);
    setElapsed(0);
    setResult(null);
  }
  return {
    config,
    setConfig,
    phase,
    elapsed,
    awareness,
    before,
    setBefore,
    after,
    setAfter,
    comfortable,
    setComfortable,
    reflection,
    setReflection,
    stage,
    chooseStage,
    recovered,
    loaded,
    error,
    result,
    start,
    pause,
    resume,
    finish,
    notice,
    save,
    reset,
  };
}
