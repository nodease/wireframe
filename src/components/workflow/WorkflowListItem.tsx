import { BarChart3, Pencil, Trash2, Workflow } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';
import type { WorkflowRecord } from '../../domains/workflow/types';

type WorkflowListItemProps = {
  workflow: WorkflowRecord;
  hasFailureQueue?: boolean;
  onEdit: (workflow: WorkflowRecord) => void;
  onDelete: (workflowId: number) => void;
  onAnalytics: (workflowId: number) => void;
};

// 홈/목록에서 공통으로 쓰는 워크플로우 행 컴포넌트입니다.
// 본문 클릭은 보고 화면 진입, 편집은 별도 버튼으로 분리합니다.
export function WorkflowListItem({
  workflow,
  hasFailureQueue = false,
  onEdit,
  onDelete,
  onAnalytics,
}: WorkflowListItemProps) {
  const isActive = workflow.isActive !== false;

  return (
    <article
      className={cn(
        'flex min-h-[76px] w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50',
        hasFailureQueue && 'border-red-200 bg-red-50/70 hover:border-red-300 hover:bg-red-50',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onAnalytics(workflow.id)}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
          <Workflow size={18} />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-black text-slate-950">
            {workflow.name}
          </strong>
          <small className="mt-1 block text-xs font-semibold text-slate-500">
            노드 {workflow.nodes.length}개 · 연결 {workflow.edges.length}개
            {workflow.isTeamShared ? ' · 팀 공유' : ' · 개인'}
          </small>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? '활성' : '비활성'}
            </Badge>
            {hasFailureQueue && <Badge variant="warning">실패큐 있음</Badge>}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(workflow)}>
          <Pencil size={14} />
          편집
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onAnalytics(workflow.id)}>
          <BarChart3 size={14} />
          보고
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="text-red-600 hover:border-red-200 hover:bg-red-50"
          onClick={() => onDelete(workflow.id)}
        >
          <Trash2 size={14} />
          삭제
        </Button>
      </div>
    </article>
  );
}
