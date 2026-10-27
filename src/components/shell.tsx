'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Menu,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { db } from '@/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';
const nav = [
  { url: '/dashboard', label: '训练概览', english: 'OVERVIEW', icon: LayoutDashboard },
  { url: '/assessment', label: '认知体测', english: 'ASSESSMENT LAB', icon: FlaskConical },
  { url: '/mindfulness', label: '正念跑步机', english: 'MINDFULNESS', icon: Leaf },
  { url: '/training', label: '训练器械', english: 'TRAINING FLOOR', icon: Dumbbell },
  { url: '/history', label: '训练记录', english: 'YOUR PROGRESS', icon: Activity },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [dark, setDark] = useState(false),
    [menu, setMenu] = useState(false),
    [ready, setReady] = useState(false);
  const preference = useLiveQuery(() => db.preferences.get('user'), []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark =
        preference?.theme === 'dark' ||
        ((!preference || preference.theme === 'system') && media.matches);
      setDark(dark);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      setReady(true);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  async function theme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    const existing = await db.preferences.get('user');
    await db.preferences.put({
      id: 'user',
      schemaVersion: 2,
      locale: 'zh-CN',
      mindfulnessStage: existing?.mindfulnessStage ?? 1,
      theme: next ? 'dark' : 'light',
    });
  }
  const active = nav.find((n) => path.startsWith(n.url));
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳转到主要内容
      </a>
      <button
        className="mobile-menu icon-button"
        aria-label={menu ? '关闭导航' : '打开导航'}
        onClick={() => setMenu(!menu)}
      >
        {menu ? <X /> : <Menu />}
      </button>
      {menu && (
        <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setMenu(false)} />
      )}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Link href="/dashboard" className="brand" aria-label="MindGym 首页">
          <span className="brand-mark">
            <Activity size={27} />
          </span>
          <span>
            MindGym<span className="brand-sub">健 脑 房</span>
          </span>
        </Link>
        <div className="sidebar-label">你的认知训练空间</div>
        <nav aria-label="主导航">
          {nav.map((n) => (
            <Link
              key={n.url}
              href={n.url}
              className={`nav-link ${path.startsWith(n.url) ? 'active' : ''}`}
              aria-current={path.startsWith(n.url) ? 'page' : undefined}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {path.startsWith(n.url) && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <ShieldCheck size={20} />
            <div>
              <strong>只属于你的训练</strong>
              <p>无需账号 · 数据保存在本机</p>
            </div>
            <span className="status-dot" />
          </div>
          <Link href="/evidence" className={`nav-link ${path === '/evidence' ? 'active' : ''}`}>
            <BookOpen size={18} />
            科学证据
          </Link>
          <Link href="/settings" className={`nav-link ${path === '/settings' ? 'active' : ''}`}>
            <Settings2 size={18} />
            偏好与数据
          </Link>
          <div className="sidebar-footer">
            <span>持续练习，保持好奇。</span>
            <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>我的健脑房</span>
            <ChevronRight size={14} />
            <strong>{active?.label ?? (path === '/evidence' ? '科学证据' : '偏好与数据')}</strong>
          </div>
          <div className="topbar-actions">
            <span className="local-indicator">
              <span className="status-dot" />
              本地私密空间
            </span>
            <button
              className="icon-button"
              onClick={() => void theme().catch(() => {})}
              disabled={!ready}
              aria-label={dark ? '切换浅色主题' : '切换深色主题'}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link href="/evidence" className="icon-button" aria-label="了解科学证据与局限">
              <CircleHelp size={19} />
            </Link>
            <span className="avatar">M</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          {children}
        </main>
        <footer className="page-footer">
          <span>MindGym 健脑房</span>
          <span>
            以练习为起点，以证据为边界。
            <Link href="/evidence">
              了解训练局限 <ArrowUpRight size={12} />
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
