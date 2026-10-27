import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/shell';
export const metadata: Metadata = {
  title: { default: 'MindGym · 健脑房', template: '%s · MindGym' },
  description: '有方法地练习，有依据地进步。认知训练、正念与个人测评，数据只保存在你的浏览器。',
  applicationName: 'MindGym',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
