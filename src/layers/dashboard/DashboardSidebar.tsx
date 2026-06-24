import { Ellipsis, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { DashboardNav, type DashboardNavItem } from '@/src/components/layout/DashboardNav';
import { Button } from '@/src/components/ui/button';
import type { View } from '../../domains/workflow/types';

type NavigationItem = {
  id: View;
  label: string;
  icon: LucideIcon;
};

type DashboardSidebarProps = {
  activeView: View;
  items: NavigationItem[];
  onNavigate: (view: View) => void;
};

const sidebarHrefByView: Partial<Record<View, string>> = {
  home: '/dashboard',
  workflowList: '/workflows',
  workflowBuilder: '/builder',
  knowledge: '/knowledge',
  marketplace: '/marketplace',
  account: '/account',
  analytics: '/reports',
  runReport: '/reports',
};

export function DashboardSidebar({
  activeView,
  items,
  onNavigate,
}: DashboardSidebarProps) {
  const navItems: DashboardNavItem<View>[] = items.map((item) => ({
    ...item,
    href: sidebarHrefByView[item.id] ?? '/dashboard',
  }));

  return (
    <aside className="flex min-h-screen w-[248px] shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-5">
      <div>
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
            <LayoutDashboard size={20} />
          </div>
          <div className="min-w-0">
            <strong className="block text-sm font-black text-slate-950">Nodease</strong>
            <span className="block truncate text-xs font-semibold text-slate-500">
              AI automation workspace
            </span>
          </div>
        </div>

        <DashboardNav activeId={activeView} items={navItems} onNavigate={onNavigate} />
      </div>

      <div className="grid gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <strong className="font-black text-slate-800">남은 크레딧</strong>
            <span className="font-bold text-slate-500">5.2k / 5.0k</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-black text-slate-700">
            김
          </div>
          <strong className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
            김민지
          </strong>
          <Button type="button" variant="ghost" size="icon" aria-label="사용자 메뉴">
            <Ellipsis size={18} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
