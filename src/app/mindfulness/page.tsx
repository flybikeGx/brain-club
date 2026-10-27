'use client';
import {
  ArrowRight,
  Check,
  CirclePause,
  Eye,
  Leaf,
  Pause,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMindfulness } from '@/mindfulness/use-mindfulness';
import { CardTitle, Notice, PageHeading, Stat } from '@/components/ui';
import { time } from '@/lib/format';
import { db } from '@/storage/db';
import { lastWeek, WeekChart } from '@/components/charts';
function Toggle({
  label,
  help,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="switch-row">
      <div>
        {label}
        <small>{help}</small>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span />
      </label>
    </div>
  );
}
export default function Mindfulness() {
  const m = useMindfulness(),
    { config, phase } = m,
    locked = phase !== 'setup' && phase !== 'saved';
  const history =
    useLiveQuery(() => db.sessions.where('taskId').equals('mindfulness').toArray(), []) ?? [];
  const update = (patch: Partial<typeof config>) => m.setConfig({ ...config, ...patch });
  const stageDescriptions = [
    '学习操作与注意回归',
    '建立稳定练习习惯',
    '逐渐减少外部提示',
    '按舒适度自由探索',
  ];
  const cues =
    config.anchor === 'breath'
      ? [
          '把注意力轻放在自然呼吸上。',
          '留意空气经过鼻尖，或腹部的轻微起伏。',
          '发现走神，不需要评价自己。',
          '温和地将注意力带回呼吸。',
        ]
      : [
          '感受身体与座椅、地面的接触。',
          '留意此刻身体中的感觉，不必改变它。',
          '发现思绪飘走，是正常的过程。',
          '温和地回到身体的感觉。',
        ];
  const cue =
    config.mode === 'quiet'
      ? '此刻，只需安静地觉察。'
      : config.guidance
        ? cues[Math.floor(m.elapsed / config.frequency) % cues.length]
        : cues[0];
  return (
    <>
      <PageHeading
        eyebrow="MINDFULNESS TREADMILL"
        title="正念跑步机"
        description="不必让思绪停止。发现它，再温和地回来。"
        action={
          <span className="badge">
            <Leaf size={12} />
            无评分 · 自由练习
          </span>
        }
      />
      {m.recovered && (
        <div className="recovery">
          <Notice>
            已恢复上次练习，并保持暂停。后台和关闭页面的时间不会计入练习。
            {phase === 'paused' ? '点击继续，准备好后再回来。' : '请完成复盘后保存。'}
          </Notice>
        </div>
      )}
      {m.error && (
        <p className="error-message" role="alert">
          {m.error}
        </p>
      )}
      {phase === 'saved' && m.result ? (
        <section className="card result-panel">
          <div className="completion-icon">
            <Leaf size={26} />
          </div>
          <div className="eyebrow">A MOMENT FOR YOURSELF</div>
          <h2>谢谢你，留出这段时间。</h2>
          <p>走神、觉察、再回来。这就是练习。</p>
          <span className="badge">
            <Check size={12} />
            已保存到本机
          </span>
          <div className="result-stats">
            <Stat label="本次实际练习" value={time(m.result.duration)} />
            <Stat label="主观状态" value={`${m.before} → ${m.after}`} unit="/ 5" />
            <Stat
              label="主动觉察记录"
              value={m.awareness}
              unit="次"
              detail="不代表真实走神次数，无好坏之分"
            />
          </div>
          <Notice>
            睁开眼睛，恢复自然呼吸，感受周围的环境。若仍不舒服，请停止练习并休息。你可以始终按自己的舒适度选择时长。
          </Notice>
          <div className="button-row">
            <button className="button primary" onClick={() => void m.reset()}>
              回到练习设置 <ArrowRight size={15} />
            </button>
          </div>
        </section>
      ) : phase === 'review' ? (
        <section className="card setup-panel">
          <div className="eyebrow">POST PRACTICE CHECK-IN</div>
          <h2>停下来，感受一下现在。</h2>
          <p className="subtle">本次练习 {time(m.elapsed)}。提前结束同样会如实记录。</p>
          <div className="spacer" />
          <label className="form-field">
            <span>此刻的主观状态：{m.after} / 5</span>
            <input
              aria-label="练习后状态"
              type="range"
              min="1"
              max="5"
              value={m.after}
              onChange={(e) => m.setAfter(Number(e.target.value))}
            />
            <small>1 = 很疲惫 / 烦乱，5 = 清醒 / 平稳。只是个人感受记录。</small>
          </label>
          <label className="switch-row">
            <span>这次练习总体舒适</span>
            <input
              type="checkbox"
              checked={m.comfortable}
              onChange={(e) => m.setComfortable(e.target.checked)}
            />
          </label>
          <label className="form-field">
            <span>一句话复盘（可选）</span>
            <textarea
              maxLength={1000}
              rows={3}
              placeholder="此刻身体和注意力是什么感觉？"
              value={m.reflection}
              onChange={(e) => m.setReflection(e.target.value)}
            />
          </label>
          <Notice>
            出现不适时，可以睁眼、自然呼吸、活动身体并停止练习。无需为了完成时长勉强坚持。
          </Notice>
          <button className="button primary section-gap" onClick={() => void m.save()}>
            保存本次练习 <Check size={15} />
          </button>
        </section>
      ) : (
        <div className="mind-layout">
          <section className="card mind-stage">
            <div className="stage-header">
              <span>
                <Leaf
                  size={13}
                  style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}
                />
                {config.anchor === 'breath' ? '呼吸注意' : '身体感觉'} ·{' '}
                {config.mode === 'guided' ? '初学者引导' : '安静模式'}
              </span>
              <span className="badge neutral">
                {phase === 'running' ? '练习中' : phase === 'paused' ? '已暂停' : '准备开始'}
              </span>
            </div>
            <div className="breath-zone">
              <div
                className={`breath-ring ${config.visual && phase === 'running' ? 'breathing' : ''}`}
                aria-hidden="true"
              />
              <div
                className="timer"
                data-testid="mindfulness-timer"
                role="timer"
                aria-label={`剩余 ${time(config.seconds - m.elapsed)}`}
              >
                {time(config.seconds - m.elapsed)}
              </div>
              <div className="timer-label">
                {phase === 'paused'
                  ? '在这里，等你回来'
                  : phase === 'running'
                    ? '让注意力轻轻安住'
                    : '为自己留出片刻'}
              </div>
            </div>
            <p className="mind-guidance" aria-live="polite">
              {phase === 'paused'
                ? '练习已暂停。准备好后，按自己的节奏继续。'
                : phase === 'setup'
                  ? '找一个舒适的姿势，不必改变自然呼吸。'
                  : cue}
            </p>
            <div className="button-row">
              {phase === 'setup' ? (
                <button className="button primary" disabled={!m.loaded} onClick={m.start}>
                  <Play size={15} />
                  开始练习
                </button>
              ) : (
                <>
                  <button
                    className="button primary"
                    onClick={() => (phase === 'running' ? m.pause() : m.resume())}
                  >
                    {phase === 'running' ? <Pause size={15} /> : <Play size={15} />}
                    {phase === 'running' ? '暂停' : '继续练习'}
                  </button>
                  <button className="button secondary" onClick={m.finish}>
                    <Square size={13} />
                    结束练习
                  </button>
                </>
              )}
            </div>
            {phase !== 'setup' && (
              <button
                className="awareness-button"
                onClick={m.notice}
                disabled={phase !== 'running'}
              >
                <Eye size={15} />
                觉察到走神 <span className="awareness-count">{m.awareness}</span>
              </button>
            )}
            <p className="stage-footnote">
              {phase === 'setup'
                ? '呼吸视觉仅作可选引导，不需要屏息，也不必跟随动画调整呼吸。'
                : '点击只记录你主动觉察的次数，不等于真实走神次数，也不计算注意力百分比。无需为了分数压制思绪。'}
            </p>
            <div className="progress-track section-gap">
              <div style={{ width: `${(m.elapsed / config.seconds) * 100}%` }} />
            </div>
          </section>
          <div className="stack">
            <section className="card settings-card">
              <h2>练习设置</h2>
              <div className="form-field">
                <span>练习时长 · 分钟</span>
                <div className="duration-options">
                  {[3, 5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      className={`duration-option ${config.seconds === n * 60 ? 'selected' : ''}`}
                      disabled={locked}
                      onClick={() => update({ seconds: n * 60 })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <label className="subtle">
                  自定义分钟
                  <input
                    aria-label="自定义练习分钟"
                    style={{ width: '100%', marginTop: 6 }}
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    disabled={locked}
                    value={config.seconds / 60}
                    onChange={(e) =>
                      update({
                        seconds: Math.min(120, Math.max(1, Number(e.target.value) || 1)) * 60,
                      })
                    }
                  />
                </label>
              </div>
              <div className="form-field">
                <span>注意锚点</span>
                <div className="segments">
                  {(['breath', 'body'] as const).map((a) => (
                    <button
                      key={a}
                      className={`segment ${config.anchor === a ? 'selected' : ''}`}
                      disabled={locked}
                      onClick={() => update({ anchor: a })}
                    >
                      {a === 'breath' ? '呼吸注意' : '身体感觉'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <span>训练模式</span>
                <div className="segments">
                  {(['guided', 'quiet'] as const).map((a) => (
                    <button
                      key={a}
                      className={`segment ${config.mode === a ? 'selected' : ''}`}
                      disabled={locked}
                      onClick={() => update({ mode: a })}
                    >
                      {a === 'guided' ? '初学者引导' : '安静模式'}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle
                label="轻柔提示音"
                help="开始、阶段转换与结束时响起"
                checked={config.sound}
                onChange={(v) => update({ sound: v })}
                disabled={locked}
              />
              <Toggle
                label="呼吸视觉"
                help="缓慢起伏的视觉参考，可随时关闭"
                checked={config.visual}
                onChange={(v) => update({ visual: v })}
              />
              <Toggle
                label="阶段文字提示"
                help="以温和的提醒帮助注意回归"
                checked={config.guidance}
                onChange={(v) => update({ guidance: v })}
                disabled={config.mode === 'quiet'}
              />
              <label className="form-field">
                <span>提示频率</span>
                <select
                  aria-label="提示频率"
                  value={config.frequency}
                  onChange={(e) => update({ frequency: Number(e.target.value) })}
                  disabled={locked}
                >
                  <option value="30">每 30 秒</option>
                  <option value="60">每 1 分钟</option>
                  <option value="120">每 2 分钟</option>
                  <option value="300">每 5 分钟</option>
                </select>
              </label>
              {phase === 'setup' && (
                <label className="form-field">
                  <span>练习前主观状态：{m.before} / 5</span>
                  <input
                    aria-label="练习前状态"
                    type="range"
                    min="1"
                    max="5"
                    value={m.before}
                    onChange={(e) => m.setBefore(Number(e.target.value))}
                  />
                  <small>1 = 疲惫 / 烦乱，5 = 清醒 / 平稳</small>
                </label>
              )}
            </section>
          </div>
        </div>
      )}
      <div className="two-columns section-gap">
        <section className="card">
          <CardTitle
            title="循序渐进，由你选择"
            subtitle="按练习依从性、舒适度和个人意愿调整，无自动升级门槛"
          />
          <div className="course-track">
            {[1, 2, 3, 4].map((s, i) => (
              <button
                className={`course-step ${m.stage === s ? 'selected' : ''}`}
                key={s}
                disabled={locked}
                onClick={() => void m.chooseStage(s)}
              >
                <span>阶段 0{s}</span>
                <strong>{['3–5 分钟', '5–10 分钟', '10–15 分钟', '自由练习'][i]}</strong>
                <small>{stageDescriptions[i]}</small>
              </button>
            ))}
          </div>
          <p className="subtle">
            已完成 {history.filter((s) => s.completed).length}{' '}
            次练习。近期感到舒适且能够持续时，可自行选择下一阶段；也可以保持当前阶段。
          </p>
        </section>
        <section className="card">
          <CardTitle title="每周正念时长" subtitle="记录实际练习时间，不评判思绪" />
          <WeekChart values={lastWeek(history)} />
        </section>
      </div>
    </>
  );
}
