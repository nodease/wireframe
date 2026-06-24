import type { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type DashboardNavItem<TId extends string> = {
  id: TId;
  label: string;
  icon: LucideIcon;
  href: string;
};

type DashboardNavProps<TId extends string> = {
  activeId: TId;
  items: DashboardNavItem<TId>[];
  onNavigate?: (id: TId) => void;
};

// 라우팅 방식은 href로, SPA 상태 전환은 onNavigate로 처리할 수 있게 만든 범용 네비게이션입니다.
export function DashboardNav<TId extends string>({
  activeId,
  items,
  onNavigate,
}: DashboardNavProps<TId>) {
  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={item.href}
            className={cn(
              'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950',
              isActive && 'bg-slate-950 text-white hover:bg-slate-950 hover:text-white',
            )}
            onClick={(event) => {
              if (!onNavigate) {
                return;
              }

              event.preventDefault();
              onNavigate(item.id);
            }}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
