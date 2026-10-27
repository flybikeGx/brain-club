'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, RawEvent } from '@/domain/types';
import { ActiveClock } from './clock';
import { createSession } from '@/storage/session';
import { saveSession } from '@/storage/db';
export function useTask(onInterrupt: () => void, refreshMode: 'interval' | 'frame' = 'interval') {
  const clock = useRef(new ActiveClock()),
    session = useRef<Session | null>(null),
    active = useRef(false),
    interrupt = useRef(onInterrupt),
    finishing = useRef(false);
  const [elapsed, setElapsed] = useState(0),
    [result, setResult] = useState<Session | null>(null),
    [error, setError] = useState('');
  interrupt.current = onInterrupt;
  const log = useCallback((type: string, value?: RawEvent['value']) => {
    session.current?.eventLog.push({
      type,
      at: clock.current.elapsed(),
      ...(value === undefined ? {} : { value }),
    });
  }, []);
  function begin(input: Parameters<typeof createSession>[0]) {
    session.current = createSession(input);
    clock.current = new ActiveClock();
    clock.current.start();
    active.current = true;
    finishing.current = false;
    setResult(null);
    setError('');
    setElapsed(0);
    log('start');
    return session.current;
  }
  function pause(reason = 'manual') {
    if (active.current) {
      clock.current.pause();
      active.current = false;
      log('pause', reason);
      setElapsed(clock.current.elapsed() / 1000);
    }
  }
  function resume() {
    clock.current.start();
    active.current = true;
    log('resume');
  }
  async function finish(patch: Partial<Session> = {}) {
    if (!session.current || finishing.current) return;
    finishing.current = true;
    pause('finish');
    const s = {
      ...session.current,
      endedAt: new Date().toISOString(),
      duration: clock.current.elapsed() / 1000,
      ...patch,
    };
    session.current = s;
    try {
      await saveSession(s);
    } catch {
      setError('本次记录保存失败。请检查浏览器存储权限，可在下方重试保存。');
    }
    setResult(s);
  }
  async function retrySave() {
    if (!result) return;
    try {
      await saveSession(result);
      setError('');
    } catch {
      setError('保存仍然失败，请检查浏览器本地存储。');
    }
  }
  useEffect(() => {
    const stop = () => {
      if (!active.current) return;
      clock.current.pause();
      active.current = false;
      session.current?.eventLog.push({ type: 'focus-lost', at: clock.current.elapsed() });
      interrupt.current();
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', hidden);
    const updateElapsed = () => {
      if (active.current) setElapsed(clock.current.elapsed() / 1000);
    };
    let interval: ReturnType<typeof setInterval> | undefined;
    let frame: number | undefined;
    if (refreshMode === 'frame') {
      const updateFrame = () => {
        updateElapsed();
        frame = requestAnimationFrame(updateFrame);
      };
      frame = requestAnimationFrame(updateFrame);
    } else {
      interval = setInterval(updateElapsed, 100);
    }
    return () => {
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', hidden);
      if (interval !== undefined) clearInterval(interval);
      if (frame !== undefined) cancelAnimationFrame(frame);
      clock.current.pause();
      active.current = false;
    };
  }, [refreshMode]);
  return {
    clock,
    session,
    elapsed,
    result,
    error,
    begin,
    pause,
    resume,
    finish,
    log,
    retrySave,
    setResult,
  };
}
