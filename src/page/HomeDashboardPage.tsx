'use client';

import { Plus, Workflow } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { WorkflowListItem } from '../components/workflow/WorkflowListItem';
import type { FailureQueueItem, WorkflowRecord } from '../domains/workflow/types';

type HomeDashboardPageProps = {
  workflows: WorkflowRecord[];
  recentWorkflows: WorkflowRecord[];
  failureQueue: FailureQueueItem[];
  onCreateWorkflow: () => void;
  onShowWorkflowList: () => void;
  onOpenWorkflowBuilder: (workflow: WorkflowRecord) => void;
  onDeleteWorkflow: (workflowId: number) => void;
  onOpenAnalytics: (workflowId: number) => void;
};

export function HomeDashboardPage({
  workflows,
  recentWorkflows,
  failureQueue,
  onCreateWorkflow,
  onShowWorkflowList,
  onOpenWorkflowBuilder,
  onDeleteWorkflow,
  onOpenAnalytics,
}: HomeDashboardPageProps) {
  const activeWorkflowCount = workflows.filter(
    (workflow) => workflow.isActive !== false,
  ).length;
  const hasFailureQueue = (workflow: WorkflowRecord) =>
    failureQueue.some(
      (failure) =>
        failure.status !== 'resolved' &&
        (failure.workflowId === workflow.id || failure.workflowName === workflow.name),
    );

  return (
    <section className="w-full">
      <div className="mb-10 flex min-h-[clamp(260px,30vh,360px)] flex-col items-center justify-center gap-5 py-14 text-center">
        <div className="w-full max-w-5xl">
          <h2 className="m-0 text-[clamp(34px,3.8vw,52px)] font-extrabold leading-tight tracking-normal text-slate-950">
            <span className="font-black">Nodease</span> 에 오신 걸 환영합니다
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-700">
            AI와 함께 워크플로우를 손쉽게 자동화하고 관리해보세요!
          </p>
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ['활성 워크플로우', activeWorkflowCount],
          ['연결된 지식기반', 0],
          ['이번 달 사용량', 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <span className="text-sm font-bold text-slate-500">{label}</span>
              <strong className="mt-3 block text-3xl font-black text-slate-950">
                {value}
              </strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="m-0 text-lg font-black text-slate-950">
                최근 사용한 워크플로우
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                저장된 워크플로우를 클릭하면 바로 빌더 화면으로 이동합니다.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={onShowWorkflowList}>
              전체 보기
            </Button>
          </div>

          {recentWorkflows.length === 0 ? (
            <div className="grid min-h-44 place-items-center content-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
              <Workflow size={24} />
              <strong className="text-sm font-black text-slate-800">
                최근 워크플로우가 없습니다
              </strong>
              <span className="text-sm">워크플로우를 만들고 저장하면 여기에 표시됩니다.</span>
            </div>
          ) : (
            <div className="grid gap-3">
              {recentWorkflows.map((workflow) => (
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
        </CardContent>
      </Card>
    </section>
  );
}
