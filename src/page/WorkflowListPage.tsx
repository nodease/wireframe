'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Workflow } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { WorkflowListItem } from '../components/workflow/WorkflowListItem';
import type { FailureQueueItem, WorkflowRecord } from '../domains/workflow/types';

type WorkflowListPageProps = {
  workflows: WorkflowRecord[];
  failureQueue: FailureQueueItem[];
  onCreateWorkflow: () => void;
  onOpenWorkflowBuilder: (workflow: WorkflowRecord) => void;
  onDeleteWorkflow: (workflowId: number) => void;
  onOpenAnalytics: (workflowId: number) => void;
};

export function WorkflowListPage({
  workflows,
  failureQueue,
  onCreateWorkflow,
  onOpenWorkflowBuilder,
  onDeleteWorkflow,
  onOpenAnalytics,
}: WorkflowListPageProps) {
  const [workflowSearch, setWorkflowSearch] = useState('');
  const filteredWorkflows = useMemo(() => {
    const keyword = workflowSearch.trim().toLowerCase();

    if (!keyword) {
      return workflows;
    }

    return workflows.filter((workflow) =>
      `${workflow.name} ${workflow.description ?? ''}`.toLowerCase().includes(keyword),
    );
  }, [workflowSearch, workflows]);
  const hasFailureQueue = (workflow: WorkflowRecord) =>
    failureQueue.some(
      (failure) =>
        failure.status !== 'resolved' &&
        (failure.workflowId === workflow.id || failure.workflowName === workflow.name),
    );

  return (
    <section className="w-full">
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <h2 className="m-0 text-2xl font-black text-slate-950">워크플로우</h2>
          <p className="mt-2 text-sm text-slate-500">생성한 워크플로우 목록입니다.</p>
        </div>
        <Button asChild>
          <a
            href="/workflows?newWorkflow=1"
            onClick={(event) => {
              event.preventDefault();
              onCreateWorkflow();
            }}
          >
            <Plus size={17} />
            워크플로우 생성
          </a>
        </Button>
      </div>

      <label className="mb-4 block max-w-xl">
        <span className="mb-2 block text-xs font-black text-slate-500">
          워크플로우 검색
        </span>
        <span className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            className="pl-10"
            value={workflowSearch}
            onChange={(event) => setWorkflowSearch(event.target.value)}
            placeholder="워크플로우 이름 또는 설명 검색"
          />
        </span>
      </label>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="grid min-h-80 place-items-center content-center gap-2 text-center text-slate-500">
            <Workflow size={28} />
            <strong className="text-base font-black text-slate-900">
              아직 생성된 워크플로우가 없습니다
            </strong>
            <span className="text-sm">새 워크플로우를 만들어 빌더 화면으로 이동하세요.</span>
          </CardContent>
        </Card>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="grid min-h-80 place-items-center content-center gap-2 text-center text-slate-500">
            <Search size={28} />
            <strong className="text-base font-black text-slate-900">검색 결과가 없습니다</strong>
            <span className="text-sm">다른 이름이나 설명으로 검색해 보세요.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredWorkflows.map((workflow) => (
            <WorkflowListItem
              key={workflow.id}
              workflow={workflow}
              hasFailureQueue={hasFailureQueue(workflow)}
              onOpenBuilder={onOpenWorkflowBuilder}
              onDelete={onDeleteWorkflow}
              onAnalytics={onOpenAnalytics}
            />
          ))}
        </div>
      )}
    </section>
  );
}
