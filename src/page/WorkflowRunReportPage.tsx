'use client';

import { ArrowLeft, X } from 'lucide-react';
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

const periodLabels = ['최근 7일', '최근 30일', '최근 6개월', '최근 1년'] as const;

type PeriodLabel = (typeof periodLabels)[number];

type PeriodUsage = {
  label: PeriodLabel;
  executions: number;
  tokens: number;
  avgDuration: number;
};

const estimateTokenUsage = (credits: number) => Math.max(0, Math.round(credits * 1250));

export function WorkflowRunReportPage({
  workflowName,
  workflow,
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
  const totalDuration = displayLogs.reduce((total, log) => total + log.duration, 0);
  const totalCredits = displayLogs.reduce((total, log) => total + log.credits, 0);
  const totalTokens = estimateTokenUsage(totalCredits);
  const failedLogs = displayLogs.filter(
    (log) => log.status === 'Failed' || log.status === 'Blocked',
  );
  const slowestLog = [...displayLogs].sort(
    (first, second) => second.duration - first.duration,
  )[0];
  const latestStatus =
    displayLogs.length === 0 ? '대기' : failedLogs.length > 0 ? '실패' : '성공';
  const nodeCount = selectedWorkflow?.nodeCount ?? workflow?.nodes.length ?? displayLogs.length;
  const edgeCount =
    selectedWorkflow?.edgeCount ?? workflow?.edges.length ?? Math.max(0, displayLogs.length - 1);
  const baseExecutions = selectedWorkflow?.executions ?? Math.max(1, summary.executions);
  const baseTokens = selectedWorkflow
    ? estimateTokenUsage(selectedWorkflow.credits)
    : estimateTokenUsage(summary.credits);
  const periodUsage: PeriodUsage[] = periodLabels.map((label, index) => {
    const ratios = [0.18, 0.42, 0.78, 1];
    const ratio = ratios[index] ?? 1;

    return {
      label,
      executions: Math.max(1, Math.round(baseExecutions * ratio)),
      tokens: Math.max(0, Math.round(baseTokens * ratio)),
      avgDuration: Number(
        ((selectedWorkflow?.avgDuration ?? Math.max(1, totalDuration || 1.2)) + index * 0.28).toFixed(1),
      ),
    };
  });
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
      title: '최신 실행 요약',
      description: `토큰 ${totalTokens.toLocaleString('ko-KR')}개 · 오류 ${failedLogs.length}건`,
      badge: selectedWorkflow?.lastRun ?? '최근 실행',
    },
    {
      title: '운영 지표',
      description:
        queuedFailures.length > 0
          ? `실패 큐 ${queuedFailures.length}건 대기`
          : '단순 자동화 반복 실행 효율 높음',
      badge: '최근 7일 · 기록',
    },
    ['실행 품질', '실패 횟수, 재시도 횟수, 마지막 실패 원인'],
    ['성능', `평균 실행 시간, 가장 느린 노드${slowestLog ? `: ${slowestLog.name}` : ''}, 대기 시간`],
    ['비용', `토큰 사용량 ${totalTokens.toLocaleString('ko-KR')}개, 실행당 평균 비용, LLM 호출 비용 비중`],
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
                          <Badge variant="secondary">
                            토큰 {estimateTokenUsage(item.credits).toLocaleString('ko-KR')}
                          </Badge>
                        </div>
                      </div>
                      <span className="mt-2 block text-sm text-slate-500">
                        실행 {item.executions}회 · 평균 {item.avgDuration}s · 오류 {item.errorCount}건
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">최신 실행 정보</h3>
                <p className="text-sm text-slate-500">
                  가장 최근 실행에서 어떤 노드가 얼마만큼의 시간과 토큰을 사용했는지 확인합니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <LatestExecutionField
                  label="실행 상태"
                  value={latestStatus}
                  description={failedLogs.length > 0 ? `실패 ${failedLogs.length}건 포함` : '정상 완료'}
                />
                <LatestExecutionField
                  label="마지막 실행"
                  value={selectedWorkflow?.lastRun ?? '최근 실행'}
                  description={visibleWorkflowName || '워크플로우'}
                />
                <LatestExecutionField
                  label="실행 시간"
                  value={formatDuration(totalDuration)}
                  description={slowestLog ? `가장 느린 노드 ${slowestLog.name}` : '노드 실행 합계'}
                />
                <LatestExecutionField
                  label="토큰 사용량"
                  value={totalTokens.toLocaleString('ko-KR')}
                  description={`크레딧 ${totalCredits} 기준 추정`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">기간별 실행 통계</h3>
                <p className="text-sm text-slate-500">
                  이 워크플로우의 최근 7일, 30일, 6개월, 1년 실행량과 토큰 사용량입니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                {periodUsage.map((period) => (
                  <PeriodSummaryCard key={period.label} period={period} />
                ))}
              </CardContent>
            </Card>

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
                  <h3 className="text-lg font-black text-slate-950">기간별 토큰 사용량</h3>
                  <p className="text-sm text-slate-500">
                    기간별 실행이 있었다면 해당 기간 동안 사용한 토큰량을 비교합니다.
                  </p>
                </CardHeader>
                <CardContent>
                  <TokenUsageChart periods={periodUsage} />
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

function LatestExecutionField({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="block text-xs font-black text-slate-500">{label}</span>
      <strong className="mt-2 block truncate text-xl font-black text-slate-950">
        {value}
      </strong>
      <small className="mt-2 block text-xs leading-5 text-slate-500">
        {description}
      </small>
    </div>
  );
}

function PeriodSummaryCard({ period }: { period: PeriodUsage }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <strong className="text-sm font-black text-slate-950">{period.label}</strong>
      <div className="mt-3 grid gap-2 text-sm text-slate-600">
        <span>실행 {period.executions.toLocaleString('ko-KR')}회</span>
        <span>토큰 {period.tokens.toLocaleString('ko-KR')}개</span>
        <span>평균 {period.avgDuration.toFixed(1)}s</span>
      </div>
    </div>
  );
}

function TokenUsageChart({ periods }: { periods: PeriodUsage[] }) {
  const maxTokens = Math.max(1, ...periods.map((period) => period.tokens));
  const yTicks = [maxTokens, Math.round(maxTokens / 2), 0];

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div className="relative flex h-64 flex-col justify-between text-right text-[11px] font-semibold text-slate-400">
          {yTicks.map((tick) => (
            <span key={tick}>{tick.toLocaleString('ko-KR')}</span>
          ))}
          <span className="absolute -left-1 top-1/2 -rotate-90 text-[10px] font-black text-slate-500">
            tokens
          </span>
        </div>
        <div className="relative h-64 border-b border-l border-slate-300 pl-4">
          <div className="absolute inset-x-4 top-0 border-t border-dashed border-slate-200" />
          <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-slate-200" />
          <div className="flex h-full items-end justify-around gap-3">
            {periods.map((period) => {
              const height = Math.max(6, (period.tokens / maxTokens) * 100);

              return (
                <div key={period.label} className="flex h-full flex-1 flex-col justify-end">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-black text-slate-600">
                      {period.tokens.toLocaleString('ko-KR')}
                    </span>
                    <div className="flex h-52 w-full items-end justify-center">
                      <span
                        className="block w-full max-w-12 rounded-t-md bg-slate-950"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <span />
        <div className="flex justify-around gap-3 pl-4 text-center text-xs font-black text-slate-500">
          {periods.map((period) => (
            <span key={period.label} className="flex-1">
              {period.label}
            </span>
          ))}
        </div>
      </div>
      <div className="text-center text-[11px] font-black text-slate-500">
        기간
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
