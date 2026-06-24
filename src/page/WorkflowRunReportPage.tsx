'use client';

import { ArrowLeft, Clock3, Coins, ListChecks, RotateCcw, X } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { cn } from '@/src/lib/utils';
import type {
  AnalyticsSummary,
  ExecutionLog,
  FailureQueueItem,
  WorkflowAnalytics,
  WorkflowRecord,
} from '../domains/workflow/types';

type WorkflowRunReportPageProps = {
  workflowName: string;
  workflow?: WorkflowRecord | null;
  workflowRecords: WorkflowRecord[];
  summary: AnalyticsSummary;
  workflows: WorkflowAnalytics[];
  selectedWorkflow: WorkflowAnalytics | null;
  executionLogs: ExecutionLog[];
  failureQueue: FailureQueueItem[];
  onClose: () => void;
  onSelectWorkflow: (workflowId: number) => void;
  onResolveFailure: (failureId: number) => void;
};

const formatDuration = (duration: number) => `${duration.toFixed(2)}s`;

export function WorkflowRunReportPage({
  workflowName,
  workflow,
  workflowRecords,
  summary,
  workflows,
  selectedWorkflow,
  executionLogs,
  failureQueue,
  onClose,
  onSelectWorkflow,
  onResolveFailure,
}: WorkflowRunReportPageProps) {
  const syntheticLogs = useMemo<ExecutionLog[]>(
    () =>
      workflow?.nodes.map((node, index) => ({
        nodeId: node.id,
        name: node.label,
        typeLabel: node.typeLabel,
        description: node.description,
        status:
          selectedWorkflow && selectedWorkflow.errorCount > 0 && index === workflow.nodes.length - 1
            ? 'Failed'
            : 'Success',
        duration: selectedWorkflow
          ? Number((selectedWorkflow.avgDuration / Math.max(1, workflow.nodes.length)).toFixed(2))
          : 0.8,
        credits: selectedWorkflow
          ? Math.max(1, Math.round(selectedWorkflow.credits / Math.max(1, workflow.nodes.length)))
          : 1,
      })) ?? [],
    [selectedWorkflow, workflow],
  );
  const displayLogs = executionLogs.length > 0 ? executionLogs : syntheticLogs;
  const visibleWorkflowName = selectedWorkflow?.name ?? workflowName;
  const activeWorkflowCount = workflowRecords.filter(
    (item) => item.isActive !== false,
  ).length;
  const inactiveWorkflowCount = workflowRecords.length - activeWorkflowCount;
  const queuedFailures = failureQueue.filter((item) => item.status !== 'resolved');
  const warningWorkflowIds = new Set(
    workflows
      .filter(
        (item) =>
          item.errorCount > 0 ||
          queuedFailures.some(
            (failure) => failure.workflowId === item.id || failure.workflowName === item.name,
          ),
      )
      .map((item) => item.id),
  );
  const warningWorkflowCount = warningWorkflowIds.size;
  const stableWorkflowCount = Math.max(0, activeWorkflowCount - warningWorkflowCount);
  const totalWorkflowCount = workflows.length;
  const totalDuration = displayLogs.reduce((total, log) => total + log.duration, 0);
  const totalCredits = displayLogs.reduce((total, log) => total + log.credits, 0);
  const failedLogs = displayLogs.filter(
    (log) => log.status === 'Failed' || log.status === 'Blocked',
  );
  const successRate =
    selectedWorkflow?.successRate ??
    (displayLogs.length === 0
      ? summary.avgSuccessRate
      : Math.round(((displayLogs.length - failedLogs.length) / displayLogs.length) * 100));
  const slowestLog = [...displayLogs].sort(
    (first, second) => second.duration - first.duration,
  )[0];
  const latestStatus =
    displayLogs.length === 0 ? '대기' : failedLogs.length > 0 ? '실패' : '성공';
  const nodeCount = selectedWorkflow?.nodeCount ?? workflow?.nodes.length ?? displayLogs.length;
  const edgeCount =
    selectedWorkflow?.edgeCount ?? workflow?.edges.length ?? Math.max(0, displayLogs.length - 1);
  const chartRows = selectedWorkflow
    ? displayLogs.map((log) => ({
        id: log.nodeId,
        label: log.name,
        value: log.duration,
        displayValue: formatDuration(log.duration),
      }))
    : workflows.map((item) => ({
        id: item.id,
        label: item.name,
        value: item.avgDuration,
        displayValue: `${item.avgDuration}s`,
      }));
  const maxChartValue = Math.max(1, ...chartRows.map((row) => row.value));
  const reportItems: Array<{ title: string; description: string; badge?: string }> = [
    {
      title: `${visibleWorkflowName || '워크플로우'} 실행 ${
        displayLogs.length === 0 ? '대기' : failedLogs.length > 0 ? '실패' : '완료'
      }`,
      description: `노드 ${nodeCount}개 · 연결 ${edgeCount}개 · ${formatDuration(totalDuration)}`,
      badge: `6월 23일 · ${latestStatus}`,
    },
    {
      title: '성공률 분석',
      description: `${successRate}% 성공 · 오류 ${failedLogs.length}건`,
      badge: '최근 24시간 · 점검',
    },
    {
      title: '운영 지표',
      description:
        queuedFailures.length > 0
          ? `실패 큐 ${queuedFailures.length}건 대기`
          : '단순 자동화 반복 실행 효율 높음',
      badge: '최근 7일 · 기록',
    },
    ['실행 품질', '성공률, 실패 횟수, 재시도 횟수, 마지막 실패 원인'],
    ['성능', `평균 실행 시간, 가장 느린 노드${slowestLog ? `: ${slowestLog.name}` : ''}, 대기 시간`],
    ['비용', `크레딧 사용량 ${totalCredits}, 실행당 평균 비용, LLM 호출 비용 비중`],
    ['생산성', `예상 절감 시간 ${Math.max(4, Math.round(nodeCount * 3))}분, 자동 처리 건수, 수작업 대체율`],
    ['구조', `노드 수 ${nodeCount}, 엣지 수 ${edgeCount}, 분기 수, 외부 MCP 의존도`],
    ['데이터 품질', '누락 필드, 빈 검색 결과, 가드레일 차단 건수'],
  ].map((item) => (Array.isArray(item) ? { title: item[0], description: item[1] } : item));

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              <ArrowLeft size={16} />
              이전 화면
            </Button>
            <h2 className="mt-4 text-3xl font-black text-slate-950">보고</h2>
            <p className="mt-2 text-sm text-slate-500">
              {selectedWorkflow
                ? `${selectedWorkflow.name}의 통계, 실행 로그, 실패 큐를 확인합니다.`
                : '워크플로우별 통계, 실행 로그, 실패 큐를 확인합니다.'}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="보고 닫기">
            <X size={18} />
          </Button>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="mb-5">
            <TabsTrigger value="stats">통계</TabsTrigger>
            <TabsTrigger value="logs">로그</TabsTrigger>
            <TabsTrigger value="failures">실패큐</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="grid gap-5">
            {!selectedWorkflow && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-black text-slate-950">워크플로우 목록</h3>
                  <p className="text-sm text-slate-500">
                    목록에서 워크플로우를 선택하면 개별 보고 페이지로 이동합니다.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {workflows.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white',
                        warningWorkflowIds.has(item.id) && 'border-red-200 bg-red-50',
                      )}
                      onClick={() => onSelectWorkflow(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="block font-black text-slate-950">{item.name}</strong>
                          <span className="mt-1 block text-sm text-slate-500">
                            노드 {item.nodeCount}개 · 연결 {item.edgeCount}개 · 마지막 실행 {item.lastRun}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {warningWorkflowIds.has(item.id) && (
                            <Badge variant="warning">실패큐 있음</Badge>
                          )}
                          <Badge variant="success">{item.successRate}%</Badge>
                        </div>
                      </div>
                      <span className="mt-2 block text-sm text-slate-500">
                        실행 {item.executions}회 · 평균 {item.avgDuration}s · 오류 {item.errorCount}건 · 크레딧 {item.credits}
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard
                icon={<ListChecks size={18} />}
                label={selectedWorkflow ? '실행 상태' : '활성 워크플로우'}
                value={selectedWorkflow ? latestStatus : '전체'}
                hint={
                  selectedWorkflow
                    ? `성공률 ${successRate}%`
                    : `실행 중 ${activeWorkflowCount}개 · 전체 ${totalWorkflowCount}개`
                }
              />
              <MetricCard
                icon={<Clock3 size={18} />}
                label={selectedWorkflow ? '총 실행 시간' : '활성 정상'}
                value={
                  selectedWorkflow
                    ? formatDuration(totalDuration || summary.executions * 0.8)
                    : `${stableWorkflowCount}개`
                }
                hint={
                  selectedWorkflow
                    ? slowestLog
                      ? `가장 느린 노드 ${slowestLog.name}`
                      : '전체 실행 추정'
                    : `성공률 95% 이상 · 평균 성공률 ${summary.avgSuccessRate}%`
                }
              />
              <MetricCard
                alert={!selectedWorkflow && warningWorkflowCount > 0}
                icon={<Coins size={18} />}
                label={selectedWorkflow ? '크레딧' : '활성 문제'}
                value={selectedWorkflow ? String(totalCredits) : `${warningWorkflowCount}개`}
                hint={
                  selectedWorkflow
                    ? '실행당 비용 추정'
                    : `오류가 있는 워크플로우 · 총 오류 ${summary.errors}건`
                }
              />
              <MetricCard
                icon={<RotateCcw size={18} />}
                label={selectedWorkflow ? '실패 큐' : '비활성'}
                value={selectedWorkflow ? String(queuedFailures.length) : `${inactiveWorkflowCount}개`}
                hint={
                  selectedWorkflow
                    ? '주기 알림 대기 항목'
                    : '실행 대상에서 제외된 워크플로우'
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_0.8fr]">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-black text-slate-950">
                    {selectedWorkflow ? '노드별 실행 시간' : '워크플로우별 평균 실행 시간'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedWorkflow
                      ? '각 노드가 실행에 사용한 시간을 비교합니다.'
                      : '전체 워크플로우의 평균 실행 시간을 비교합니다.'}
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {chartRows.length === 0 ? (
                    <EmptyState text="표시할 워크플로우가 없습니다." />
                  ) : (
                    chartRows.map((row) => (
                      <div key={`${row.id}-${row.label}`} className="grid gap-2 md:grid-cols-[180px_1fr_64px] md:items-center">
                        <span className="truncate text-sm font-bold text-slate-700">{row.label}</span>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500"
                            style={{ width: `${Math.max(8, (row.value / maxChartValue) * 100)}%` }}
                          />
                        </div>
                        <b className="text-right text-xs text-slate-500">{row.displayValue}</b>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-black text-slate-950">성공률</h3>
                  <p className="text-sm text-slate-500">최근 실행 기준 성공/실패 비율입니다.</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-5">
                  <div
                    className="grid h-36 w-36 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#16a34a ${successRate * 3.6}deg, #ef4444 0deg)`,
                    }}
                  >
                    <span className="grid h-24 w-24 place-items-center rounded-full bg-white text-2xl font-black text-slate-950">
                      {successRate}%
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm font-bold text-slate-600">
                    <span>성공 {Math.max(0, displayLogs.length - failedLogs.length)}건</span>
                    <span>실패 {failedLogs.length}건</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="grid gap-5">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">개별 실행 로그</h3>
                <p className="text-sm text-slate-500">
                  {visibleWorkflowName || '워크플로우'} 최근 실행 로그입니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {reportItems.map((item) => (
                  <article key={item.title} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <strong className="block text-sm font-black text-slate-950">{item.title}</strong>
                      <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
                    </div>
                    {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                  </article>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">노드 실행 상세</h3>
                <p className="text-sm text-slate-500">실행 순서와 노드별 상태입니다.</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {displayLogs.map((log) => (
                  <article key={`${log.nodeId}-${log.name}-detail`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <strong className="block text-sm font-black text-slate-950">{log.name}</strong>
                      <span className="mt-1 block text-sm text-slate-500">
                        {log.typeLabel} · {log.description}
                      </span>
                      {log.message && <small className="mt-1 block text-xs text-slate-400">{log.message}</small>}
                    </div>
                    <Badge variant={log.status === 'Success' ? 'success' : 'warning'}>
                      {log.status === 'Success' ? '성공' : '실패'}
                    </Badge>
                  </article>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failures">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">실패 큐</h3>
                <p className="text-sm text-slate-500">
                  실패 항목은 설정된 수신처로 주기 알림이 전송됩니다.
                </p>
              </CardHeader>
              <CardContent>
                {queuedFailures.length > 0 ? (
                  <div className="grid gap-3">
                    {queuedFailures.map((failure) => (
                      <article key={failure.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                        <div>
                          <strong className="block text-sm font-black text-red-900">{failure.nodeName}</strong>
                          <span className="mt-1 block text-sm text-slate-600">{failure.reason}</span>
                          <small className="mt-1 block text-xs text-slate-500">
                            알림 수신처: {failure.recipients.join(', ')}
                          </small>
                        </div>
                        <Button type="button" variant="secondary" onClick={() => onResolveFailure(failure.id)}>
                          해결
                        </Button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="대기 중인 실패 큐가 없습니다." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
}) {
  return (
    <Card className={cn(alert && 'border-red-200 bg-red-50')}>
      <CardContent className="p-5">
        <div className={cn('text-blue-600', alert && 'text-red-600')}>{icon}</div>
        <span className={cn('mt-3 block text-xs font-black text-slate-500', alert && 'text-red-700')}>
          {label}
        </span>
        <strong className={cn('mt-2 block text-2xl font-black text-slate-950', alert && 'text-red-900')}>
          {value}
        </strong>
        <small className="mt-2 block text-xs leading-5 text-slate-500">{hint}</small>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
