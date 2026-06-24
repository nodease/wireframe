import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
};

// 대시보드형 화면에서 공통으로 쓰는 앱 셸입니다.
// 사이드바 구현과 본문 구현을 props로 분리해 다른 프로젝트에서도 쉽게 교체할 수 있습니다.
export function AppShell({ sidebar, children, className }: AppShellProps) {
  return (
    <main className={cn('flex min-h-screen bg-slate-50 text-slate-950', className)}>
      {sidebar}
      <section className="min-w-0 flex-1">{children}</section>
    </main>
  );
}
