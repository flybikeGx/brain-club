'use client';
import { useRef, useState } from 'react';
import { Download, HardDrive, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { clearData, db, exportData, importData } from '@/storage/db';
import { Notice, PageHeading } from '@/components/ui';
import type { UserPreferences } from '@/domain/types';
export default function Settings() {
  const [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    file = useRef<HTMLInputElement>(null);
  const count = useLiveQuery(() => db.sessions.count(), []) ?? 0,
    prefs = useLiveQuery(() => db.preferences.get('user'), []);
  async function download() {
    setBusy(true);
    try {
      const data = await exportData(),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        ),
        a = document.createElement('a');
      a.href = url;
      a.download = `mindgym-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`已导出 ${data.sessions.length} 条记录。请妥善保管文件。`);
      setError('');
    } catch {
      setError('导出失败，请检查浏览器存储权限。');
    } finally {
      setBusy(false);
    }
  }
  async function upload(f: File) {
    setBusy(true);
    setError('');
    try {
      if (f.size > 25 * 1024 * 1024) throw new Error('请选择小于 25MB 的 JSON 备份。');
      const n = await importData(JSON.parse(await f.text()));
      setStatus(`已导入 ${n} 条记录。同 ID 合并更新，其余记录保留。`);
      const p = await db.preferences.get('user');
      if (p) applyTheme(p.theme);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败，原有数据已保留。');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }
  function applyTheme(theme: UserPreferences['theme']) {
    document.documentElement.dataset.theme =
      theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light';
  }
  async function theme(value: UserPreferences['theme']) {
    try {
      await db.preferences.put({
        id: 'user',
        schemaVersion: 2,
        locale: 'zh-CN',
        mindfulnessStage: prefs?.mindfulnessStage ?? 1,
        theme: value,
      });
      applyTheme(value);
    } catch {
      setError('偏好保存失败。');
    }
  }
  async function erase() {
    if (confirmation !== '删除') return;
    setBusy(true);
    try {
      await clearData();
      setDeleting(false);
      setConfirmation('');
      setStatus('本机训练记录、草稿与偏好已删除。');
      setError('');
      applyTheme('system');
    } catch {
      setError('删除失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES & DATA"
        title="你的空间，你来管理。"
        description="所有练习记录保存在当前浏览器，不上传服务器。"
      />
      <div className="settings-section">
        {status && (
          <div role="status" className="notice section-gap">
            {status}
          </div>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <section className="card">
          <h2>外观与语言</h2>
          <label className="form-field section-gap">
            <span>主题</span>
            <select
              aria-label="主题"
              value={prefs?.theme ?? 'system'}
              onChange={(e) => void theme(e.target.value as UserPreferences['theme'])}
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label className="form-field">
            <span>界面语言</span>
            <select aria-label="界面语言" value="zh-CN" onChange={() => {}}>
              <option value="zh-CN">简体中文</option>
            </select>
            <small>语言字典与 locale 字段已预留扩展；当前版本仅支持简体中文。</small>
          </label>
        </section>
        <section className="card">
          <h2>
            <HardDrive
              size={18}
              style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}
            />
            本地数据
          </h2>
          <p>
            当前浏览器有 {count} 条训练记录。IndexedDB
            按浏览器和站点来源隔离。清除站点数据、更换浏览器、隐私模式结束或设备故障都可能导致记录丢失。
          </p>
          <p className="section-gap">
            建议定期导出 JSON 备份。导入会先完整校验格式，在单次事务中合并；同一 sessionId
            的记录会更新。失败不会部分写入。
          </p>
          <div className="button-row">
            <button className="button primary" disabled={busy} onClick={() => void download()}>
              <Download size={15} />
              导出 JSON 备份
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              <Upload size={15} />
              导入 JSON 备份
            </button>
            <input
              aria-label="选择 JSON 备份"
              type="file"
              accept=".json,application/json"
              hidden
              ref={file}
              onChange={(e) => {
                if (e.target.files?.[0]) void upload(e.target.files[0]);
              }}
            />
          </div>
        </section>
        <section className="card">
          <h2>隐私与运行方式</h2>
          <p>
            无需登录、无需付费
            API。所有题目、评分和可视化都在浏览器执行，不发送训练记录或遥测。首次访问和页面资源加载需要本地服务可用；已加载的训练能够离线生成题目。
          </p>
          <div className="section-gap">
            <Notice>
              本项目尚未实现完整 PWA
              缓存。断网后新页面导航、首次加载和强制刷新可能不可用。数据不会因为断网而主动上传或同步。
            </Notice>
          </div>
        </section>
        <section className="card danger-zone">
          <h2>删除本机数据</h2>
          <p>会永久清除当前站点的训练记录、正念草稿及偏好。请先导出需要保留的记录。</p>
          {deleting ? (
            <div className="section-gap">
              <label className="form-field">
                <span>输入“删除”确认清空</span>
                <input
                  aria-label="删除确认文字"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="button-row">
                <button
                  className="button danger"
                  disabled={confirmation !== '删除' || busy}
                  onClick={() => void erase()}
                >
                  永久删除全部本机数据
                </button>
                <button className="button secondary" onClick={() => setDeleting(false)}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button className="button danger section-gap" onClick={() => setDeleting(true)}>
              <Trash2 size={15} />
              删除所有本机数据
            </button>
          )}
        </section>
      </div>
    </>
  );
}
