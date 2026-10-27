'use client';

import { useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';
import type { DigitVariant } from '@/exercises/digit-span/generator';

interface DigitRecallPanelProps {
  phase: 'present' | 'answer' | 'feedback';
  digit: number | undefined;
  variant: DigitVariant;
  recallLength: number;
  input: string;
  feedback: string;
  proceedLabel: string;
  onInputChange: (value: string) => void;
  onKeypadAction: (action: string) => void;
  onSubmit: () => void;
  onProceed: () => void;
}

const maximumInputLength = 30;

export function DigitRecallPanel({
  phase,
  digit,
  variant,
  recallLength,
  input,
  feedback,
  proceedLabel,
  onInputChange,
  onKeypadAction,
  onSubmit,
  onProceed,
}: DigitRecallPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const answering = phase === 'answer';

  useEffect(() => {
    if (answering) inputRef.current?.focus({ preventScroll: true });
  }, [answering]);

  useEffect(() => {
    if (pendingCaret.current === null) return;
    inputRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [input]);

  function edit(action: string) {
    if (!answering) return;
    const start = inputRef.current?.selectionStart ?? input.length;
    const end = inputRef.current?.selectionEnd ?? input.length;
    let value: string;
    let caret: number;
    if (action === 'clear') {
      value = '';
      caret = 0;
    } else if (action === 'backspace') {
      const from = start === end ? Math.max(0, start - 1) : start;
      value = input.slice(0, from) + input.slice(end);
      caret = from;
    } else {
      value = input.slice(0, start) + action + input.slice(end);
      caret = start + 1;
    }
    if (value.length > maximumInputLength || value === input) return;
    pendingCaret.current = caret;
    onInputChange(value);
    onKeypadAction(action);
  }

  const answerInstruction =
    variant === 'updating'
      ? `按原顺序输入最后 ${recallLength} 位`
      : variant === 'backward'
        ? '按相反顺序输入'
        : '按原顺序输入';

  return (
    <form
      className="digit-task-stage"
      data-phase={phase}
      aria-label="数字记忆练习区"
      onSubmit={(event) => {
        event.preventDefault();
        if (answering && input.trim()) onSubmit();
      }}
    >
      <div className="digit-instruction" id="digit-recall-instruction">
        {answering ? (
          <label htmlFor="digits-answer">{answerInstruction}</label>
        ) : phase === 'present' ? (
          '观察数字，准备复现'
        ) : (
          '本组已记录'
        )}
      </div>
      <div className="digit-response-slot">
        {phase === 'present' ? (
          <div className="digit-display" aria-live="off">
            {digit ?? '·'}
          </div>
        ) : answering ? (
          <input
            ref={inputRef}
            id="digits-answer"
            className="answer-input"
            type="text"
            inputMode="none"
            autoComplete="off"
            spellCheck={false}
            maxLength={maximumInputLength}
            value={input}
            onChange={(event) => onInputChange(event.target.value.replace(/[^0-9\s]/g, ''))}
            aria-label="数字序列答案"
            aria-describedby="digit-recall-instruction digit-input-hint"
          />
        ) : (
          <p className="trial-feedback" aria-live="polite">
            {feedback}
          </p>
        )}
      </div>
      <p className="subtle digit-input-hint" id="digit-input-hint">
        {answering
          ? `已输入 ${input.replace(/\s/g, '').length} 位 · 可点击下方数字或直接键入`
          : phase === 'present'
            ? variant === 'updating'
              ? `只记住最后 ${recallLength} 位`
              : '请留意，数字将依次出现'
            : '准备好后，再继续下一步。'}
      </p>
      <div className="digit-keypad-slot">
        {answering && (
          <div className="digit-keypad" role="group" aria-label="屏幕数字键盘">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, 'backspace'].map((key) => (
              <button
                key={key}
                className={`digit-key ${typeof key === 'string' ? 'digit-key-edit' : ''}`}
                type="button"
                aria-label={
                  key === 'clear'
                    ? '清空答案'
                    : key === 'backspace'
                      ? '删除上一位'
                      : `输入数字 ${key}`
                }
                disabled={typeof key === 'string' && input.length === 0}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => edit(String(key))}
              >
                {key === 'clear' ? (
                  '清空'
                ) : key === 'backspace' ? (
                  <>
                    <Delete size={16} />
                    <span>退格</span>
                  </>
                ) : (
                  key
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="digit-action-slot">
        {answering ? (
          <button className="button primary" disabled={!input.trim()} type="submit">
            提交答案
          </button>
        ) : phase === 'feedback' ? (
          <button className="button primary" type="button" onClick={onProceed}>
            {proceedLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
