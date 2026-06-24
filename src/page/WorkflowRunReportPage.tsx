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

type LlmQualityMetric = {
  label: string;
  value: string;
  description: string;
  tone?: 'default' | 'warning' | 'danger';
};

type QualityTrendPoint = {
  label: string;
  score: number;
};

type RagDocumentMetric = {
  name: string;
  references: number;
  failures: number;
  missingFields: number;
  freshness: string;
  warning?: string;
};

type RagMetric = {
  label: string;
  value: string;
  description: string;
  tone?: 'default' | 'warning';
};

type WorkflowRunHistoryEntry = {
  id: string;
  runId: string;
  startedAt: string;
  endedAt: string;
  triggerLabel: string;
  executorLabel: string;
  executionSource: '자동 실행' | '수동 실행';
  status: '성공' | '실패';
  duration: number;
  tokens: number;
  costUsd: number;
  retried: boolean;
  nodeLogs: ExecutionLog[];
};

type NodeTraceRow = {
  log: ExecutionLog;
  inputSummary: string;
  outputSummary: string;
  model: string;
  tokens: number;
  costUsd: number;
  retried: boolean;
  traceId: string;
};

const estimateTokenUsage = (credits: number) => Math.max(0, Math.round(credits * 1250));

const estimateCost = (tokens: number) => Number(((tokens / 1000) * 0.006).toFixed(4));

const addSeconds = (startedAt: string, seconds: number) => {
  const [datePart, timePart] = startedAt.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);

  date.setSeconds(date.getSeconds() + Math.max(1, Math.round(seconds)));

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getModelForNode = (log: ExecutionLog) => {
  if (log.typeLabel.includes('AI Agent')) {
    return 'gpt-4o-mini';
  }

  if (log.typeLabel.includes('LLM')) {
    return 'gpt-4.1-mini';
  }

  if (log.typeLabel.includes('Notion')) {
    return 'notion-mcp';
  }

  if (log.typeLabel.includes('Slack')) {
    return 'slack-mcp';
  }

  if (log.typeLabel.includes('Gmail')) {
    return 'gmail-reader';
  }

  return 'system';
};

const buildInputSummary = (log: ExecutionLog) =>
  `${log.typeLabel} 입력 컨텍스트와 이전 노드 결과를 전달`;

const buildOutputSummary = (log: ExecutionLog) =>
  log.status === 'Success'
    ? `${log.name} 처리 결과를 다음 노드로 전달`
    : log.message ?? `${log.name} 실행 중 오류 발생`;

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
  const hasRetriedRun = failedLogs.length > 0 || (selectedWorkflow?.errorCount ?? 0) > 0;
  const llmLogs = displayLogs.filter(
    (log) => log.typeLabel.includes('LLM') || log.typeLabel.includes('AI Agent'),
  );
  const ragLogs = displayLogs.filter(
    (log) =>
      log.typeLabel.includes('RAG') ||
      log.typeLabel.includes('Notion') ||
      log.typeLabel.includes('Knowledge') ||
      log.name.includes('RAG'),
  );
  const slowestLog = [...displayLogs].sort(
    (first, second) => second.duration - first.duration,
  )[0];
  const latestStatus =
    displayLogs.length === 0 ? '대기' : failedLogs.length > 0 ? '실패' : '성공';
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
  const llmQualityMetrics: LlmQualityMetric[] = [
    {
      label: '응답 성공률',
      value: `${Math.max(88, 100 - failedLogs.length * 7)}%`,
      description: 'LLM/Agent 노드가 정상 응답을 반환한 비율',
    },
    {
      label: '평균 응답 길이',
      value: `${Math.max(420, Math.round(totalTokens / Math.max(1, llmLogs.length || 1) / 2)).toLocaleString('ko-KR')}자`,
      description: '최근 실행 기준 응답 본문 평균 길이',
    },
    {
      label: '빈 응답 비율',
      value: failedLogs.length > 0 ? '2.1%' : '0%',
      description: '내용이 없거나 후속 노드로 전달할 수 없는 응답',
      tone: failedLogs.length > 0 ? 'warning' : 'default',
    },
    {
      label: 'JSON/schema 파싱 실패율',
      value: failedLogs.length > 0 ? '3.4%' : '0%',
      description: '구조화 출력 파싱에 실패한 비율',
      tone: failedLogs.length > 0 ? 'warning' : 'default',
    },
    {
      label: 'hallucination 의심',
      value: `${Math.min(3, failedLogs.length + (ragLogs.length === 0 ? 1 : 0))}건`,
      description: 'RAG 근거 없이 단정한 답변으로 표시된 건수',
      tone: ragLogs.length === 0 ? 'warning' : 'default',
    },
    {
      label: '사용자 수정/재실행',
      value: hasRetriedRun ? '1건' : '0건',
      description: '사람이 결과를 수정하거나 다시 실행한 비율',
    },
    {
      label: 'RAG 참조 사용률',
      value: ragLogs.length > 0 ? '76%' : '0%',
      description: 'LLM 응답이 검색 문서를 참조한 비율',
      tone: ragLogs.length > 0 ? 'default' : 'warning',
    },
    {
      label: 'RAG 검색 결과 없음',
      value: ragLogs.length > 0 ? '5.8%' : '100%',
      description: '검색 호출 중 유효 문서를 찾지 못한 비율',
      tone: ragLogs.length > 0 ? 'default' : 'danger',
    },
    {
      label: '가드레일 차단',
      value: failedLogs.some((log) => log.typeLabel.includes('Guardrail')) ? '1건' : '0건',
      description: '정책 또는 민감 정보 규칙으로 차단된 응답',
    },
  ];
  const qualityTrend: QualityTrendPoint[] = [
    { label: '6/17', score: 82 },
    { label: '6/18', score: 85 },
    { label: '6/19', score: 87 },
    { label: '6/20', score: 86 },
    { label: '6/21', score: 90 },
    { label: '6/22', score: failedLogs.length > 0 ? 84 : 91 },
    { label: '6/23', score: failedLogs.length > 0 ? 88 : 93 },
  ];
  const ragMetrics: RagMetric[] = [
    {
      label: '연결된 문서 수',
      value: `${Math.max(1, ragLogs.length + 2)}개`,
      description: '이 워크플로우가 참조하는 지식기반 문서',
    },
    {
      label: '검색 호출 수',
      value: `${Math.max(12, baseExecutions * Math.max(1, ragLogs.length)).toLocaleString('ko-KR')}회`,
      description: '최근 30일 RAG 검색 호출',
    },
    {
      label: '검색 결과 없음',
      value: ragLogs.length > 0 ? '5.8%' : '100%',
      description: 'top-k 결과가 비어 있던 호출 비율',
      tone: ragLogs.length > 0 ? 'default' : 'warning',
    },
    {
      label: '평균 top-k 점수',
      value: ragLogs.length > 0 ? '0.82' : '0.00',
      description: '상위 검색 결과의 평균 유사도 점수',
      tone: ragLogs.length > 0 ? 'default' : 'warning',
    },
  ];
  const ragDocuments: RagDocumentMetric[] = [
    {
      name: '프로젝트 회의록 및 결정사항',
      references: 34,
      failures: 0,
      missingFields: 1,
      freshness: '2일 전 업데이트',
    },
    {
      name: '코드스타일 리뷰 가이드',
      references: 21,
      failures: 0,
      missingFields: 0,
      freshness: '5일 전 업데이트',
    },
    {
      name: '월간 리포트 아카이브',
      references: 9,
      failures: 2,
      missingFields: 3,
      freshness: '118일 전 업데이트',
      warning: '오래된 문서',
    },
  ];
  const runHistory: WorkflowRunHistoryEntry[] = useMemo(() => {
    const baseLogs = displayLogs.length > 0 ? displayLogs : syntheticLogs;
    const runTemplates = [
      {
        id: 'latest',
        runId: 'run_20260624_194218_a01',
        startedAt: '2026-06-24 19:42:18',
        triggerLabel: '실행 버튼',
        executorLabel: '김민지',
        executionSource: '수동 실행' as const,
        durationMultiplier: 1,
        tokenMultiplier: 1,
        retried: false,
      },
      {
        id: 'auto-1',
        runId: 'run_20260624_090000_sch',
        startedAt: '2026-06-24 09:00:00',
        triggerLabel: 'Time Trigger',
        executorLabel: '자동 실행',
        executionSource: '자동 실행' as const,
        durationMultiplier: 0.92,
        tokenMultiplier: 0.88,
        retried: false,
      },
      {
        id: 'manual-2',
        runId: 'run_20260623_181437_u02',
        startedAt: '2026-06-23 18:14:37',
        triggerLabel: '실행 버튼',
        executorLabel: '이혜연',
        executionSource: '수동 실행' as const,
        durationMultiplier: 1.18,
        tokenMultiplier: 1.12,
        retried: true,
      },
      {
        id: 'auto-3',
        runId: 'run_20260623_090000_sch',
        startedAt: '2026-06-23 09:00:00',
        triggerLabel: 'Time Trigger',
        executorLabel: '자동 실행',
        executionSource: '자동 실행' as const,
        durationMultiplier: 0.86,
        tokenMultiplier: 0.8,
        retried: false,
      },
      {
        id: 'manual-4',
        runId: 'run_20260622_163205_web',
        startedAt: '2026-06-22 16:32:05',
        triggerLabel: 'Webhook Trigger',
        executorLabel: '박준',
        executionSource: '수동 실행' as const,
        durationMultiplier: 1.05,
        tokenMultiplier: 1.02,
        retried: false,
      },
    ];

    return runTemplates.map((template, runIndex) => {
      const nodeLogs = baseLogs.map((log, logIndex) => {
        const isSyntheticFailure =
          runIndex === 2 && logIndex === baseLogs.length - 1 && failedLogs.length > 0;

        return {
          ...log,
          status: isSyntheticFailure ? 'Failed' : log.status,
          duration: Number((log.duration * template.durationMultiplier).toFixed(2)),
          credits: Math.max(1, Math.round(log.credits * template.tokenMultiplier)),
          message: isSyntheticFailure
            ? log.message ?? '이전 실행에서 외부 도구 응답 지연이 발생했습니다.'
            : log.message,
        };
      });
      const hasFailure = nodeLogs.some((log) => log.status !== 'Success');
      const runCredits = nodeLogs.reduce((total, log) => total + log.credits, 0);
      const duration = nodeLogs.reduce((total, log) => total + log.duration, 0);
      const tokens = estimateTokenUsage(runCredits);

      return {
        id: template.id,
        runId: template.runId,
        startedAt: template.startedAt,
        endedAt: addSeconds(template.startedAt, duration),
        triggerLabel: template.triggerLabel,
        executorLabel: template.executorLabel,
        executionSource: template.executionSource,
        status: hasFailure ? '실패' : '성공',
        duration,
        tokens,
        costUsd: estimateCost(tokens),
        retried: template.retried,
        nodeLogs,
      };
    });
  }, [displayLogs, failedLogs.length, selectedWorkflow?.lastRun, syntheticLogs]);
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
          <TabsList className="mb-5 flex-wrap">
            <TabsTrigger value="stats">통계</TabsTrigger>
            <TabsTrigger value="logs">로그</TabsTrigger>
            <TabsTrigger value="llm-quality">LLM 품질</TabsTrigger>
            <TabsTrigger value="rag">데이터/RAG</TabsTrigger>
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
                <h3 className="text-lg font-black text-slate-950">워크플로우 실행 이력</h3>
                <p className="text-sm text-slate-500">
                  자동 실행인지 수동 실행인지, 수동 실행이면 누가 실행했는지 확인합니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[1320px] gap-3">
                    <div className="grid grid-cols-[170px_160px_160px_72px_84px_92px_80px_72px_80px_72px] gap-3 px-4 text-xs font-black text-slate-400">
                      <span>실행 ID</span>
                      <span>시작 시각</span>
                      <span>종료 시각</span>
                      <span>방식</span>
                      <span>실행자</span>
                      <span>상태</span>
                      <span className="text-right">소요 시간</span>
                      <span className="text-right">토큰</span>
                      <span className="text-right">비용</span>
                      <span>재시도</span>
                    </div>
                    {runHistory.map((run) => (
                      <RunHistoryCard key={run.id} run={run} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">최신 실행 노드 상세</h3>
                <p className="text-sm text-slate-500">
                  가장 최근 실행의 노드별 처리 순서와 상태입니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(runHistory[0]?.nodeLogs ?? displayLogs).map((log) => (
                  <NodeLogRow key={`${log.nodeId}-${log.name}-latest`} log={log} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="llm-quality" className="grid gap-5">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">LLM 품질 지표</h3>
                <p className="text-sm text-slate-500">
                  LLM/Agent 노드의 응답 품질, 구조화 출력 안정성, RAG 근거 활용 여부를 확인합니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {llmQualityMetrics.map((metric) => (
                  <QualityMetricCard key={metric.label} metric={metric} />
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-black text-slate-950">품질 점수 추이</h3>
                  <p className="text-sm text-slate-500">
                    최근 실행 결과의 응답 완성도, 파싱 안정성, RAG 근거 사용률을 합산한 예시 점수입니다.
                  </p>
                </CardHeader>
                <CardContent>
                  <QualityTrendChart points={qualityTrend} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-black text-slate-950">품질 리스크</h3>
                  <p className="text-sm text-slate-500">
                    운영 중 바로 확인해야 하는 LLM 품질 경고입니다.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <RiskRow
                    title="구조화 출력 실패"
                    description="JSON/schema 파싱 실패가 발생하면 후속 노드 입력이 비어 있을 수 있습니다."
                    status={failedLogs.length > 0 ? '점검 필요' : '정상'}
                    warning={failedLogs.length > 0}
                  />
                  <RiskRow
                    title="RAG 근거 부족"
                    description="검색 결과 없음 비율이 높으면 답변 근거가 약해질 수 있습니다."
                    status={ragLogs.length > 0 ? '관찰 중' : '점검 필요'}
                    warning={ragLogs.length === 0}
                  />
                  <RiskRow
                    title="사용자 재실행"
                    description="재실행이 반복되면 프롬프트나 문서 연결을 조정해야 합니다."
                    status={hasRetriedRun ? '관찰 중' : '정상'}
                    warning={hasRetriedRun}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rag" className="grid gap-5">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">데이터/RAG 운영 지표</h3>
                <p className="text-sm text-slate-500">
                  연결된 문서와 검색 호출 품질을 확인해 LLM 답변의 근거 상태를 점검합니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                {ragMetrics.map((metric) => (
                  <RagMetricCard key={metric.label} metric={metric} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">문서별 참조 및 실패 현황</h3>
                <p className="text-sm text-slate-500">
                  자주 참조되는 문서, 오래된 문서 경고, 문서별 실패/누락 건수를 표로 확인합니다.
                </p>
              </CardHeader>
              <CardContent>
                <RagDocumentTable documents={ragDocuments} />
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

function QualityMetricCard({ metric }: { metric: LlmQualityMetric }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4',
        metric.tone === 'warning' && 'border-amber-200 bg-amber-50',
        metric.tone === 'danger' && 'border-red-200 bg-red-50',
        !metric.tone && 'border-slate-200',
      )}
    >
      <span className="block text-xs font-black text-slate-500">{metric.label}</span>
      <strong className="mt-2 block text-2xl font-black text-slate-950">
        {metric.value}
      </strong>
      <small className="mt-2 block leading-5 text-slate-500">{metric.description}</small>
    </div>
  );
}

function QualityTrendChart({ points }: { points: QualityTrendPoint[] }) {
  const maxScore = 100;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[48px_1fr] gap-3">
        <div className="relative flex h-64 flex-col justify-between text-right text-[11px] font-semibold text-slate-400">
          {[100, 75, 50].map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
          <span className="absolute -left-2 top-1/2 -rotate-90 text-[10px] font-black text-slate-500">
            score
          </span>
        </div>
        <div className="relative h-64 border-b border-l border-slate-300 pl-4">
          <div className="absolute inset-x-4 top-0 border-t border-dashed border-slate-200" />
          <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-slate-200" />
          <div className="flex h-full items-end justify-around gap-3">
            {points.map((point) => (
              <div key={point.label} className="flex h-full flex-1 flex-col justify-end">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-black text-slate-600">{point.score}</span>
                  <div className="flex h-52 w-full items-end justify-center">
                    <span
                      className="block w-full max-w-12 rounded-t-md bg-blue-600"
                      style={{ height: `${Math.max(8, (point.score / maxScore) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[48px_1fr] gap-3">
        <span />
        <div className="flex justify-around gap-3 pl-4 text-center text-xs font-black text-slate-500">
          {points.map((point) => (
            <span key={point.label} className="flex-1">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskRow({
  title,
  description,
  status,
  warning = false,
}: {
  title: string;
  description: string;
  status: string;
  warning?: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border p-4',
        warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <strong className="text-sm font-black text-slate-950">{title}</strong>
        <Badge variant={warning ? 'warning' : 'success'}>{status}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}

function RagMetricCard({ metric }: { metric: RagMetric }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4',
        metric.tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200',
      )}
    >
      <span className="block text-xs font-black text-slate-500">{metric.label}</span>
      <strong className="mt-2 block text-2xl font-black text-slate-950">
        {metric.value}
      </strong>
      <small className="mt-2 block leading-5 text-slate-500">{metric.description}</small>
    </div>
  );
}

function RagDocumentTable({ documents }: { documents: RagDocumentMetric[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[1.5fr_100px_110px_110px_150px_110px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
          <span>문서</span>
          <span className="text-right">참조</span>
          <span className="text-right">실패</span>
          <span className="text-right">누락</span>
          <span>최신성</span>
          <span>경고</span>
        </div>
        {documents.map((document) => (
          <div
            key={document.name}
            className="grid grid-cols-[1.5fr_100px_110px_110px_150px_110px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
          >
            <strong className="truncate text-slate-950">{document.name}</strong>
            <span className="text-right font-bold text-slate-600">
              {document.references.toLocaleString('ko-KR')}회
            </span>
            <span className="text-right font-bold text-slate-600">
              {document.failures.toLocaleString('ko-KR')}건
            </span>
            <span className="text-right font-bold text-slate-600">
              {document.missingFields.toLocaleString('ko-KR')}건
            </span>
            <span className="font-bold text-slate-500">{document.freshness}</span>
            <span>
              {document.warning ? (
                <Badge variant="warning">{document.warning}</Badge>
              ) : (
                <Badge variant="success">정상</Badge>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunHistoryCard({ run }: { run: WorkflowRunHistoryEntry }) {
  const isFailed = run.status === '실패';

  return (
    <details
      className={cn(
        'group rounded-lg border bg-white',
        isFailed ? 'border-red-200 bg-red-50' : 'border-slate-200',
      )}
    >
      <summary className="grid cursor-pointer list-none grid-cols-[170px_160px_160px_72px_84px_92px_80px_72px_80px_72px] items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-50">
        <span className="truncate font-mono text-xs font-black text-slate-950">
          {run.runId}
        </span>
        <span className="font-mono text-xs font-bold text-slate-700">
          {run.startedAt}
        </span>
        <span className="font-mono text-xs font-bold text-slate-700">
          {run.endedAt}
        </span>
        <span className="text-xs font-bold text-slate-600">{run.executionSource}</span>
        <span className="truncate text-xs font-bold text-slate-600">
          {run.executorLabel}
        </span>
        <Badge variant={isFailed ? 'warning' : 'success'}>{run.status}</Badge>
        <span className="text-right text-xs font-black text-slate-600">
          {formatDuration(run.duration)}
        </span>
        <span className="text-right text-xs font-black text-slate-600">
          {run.tokens.toLocaleString('ko-KR')}
        </span>
        <span className="text-right text-xs font-black text-slate-600">
          ${run.costUsd.toFixed(4)}
        </span>
        <span className="text-xs font-bold text-slate-600">
          {run.retried ? '있음' : '없음'}
        </span>
      </summary>

      <div className="grid gap-3 border-t border-slate-200 p-4">
        <div className="grid gap-2 rounded-lg bg-white p-3 text-xs text-slate-600 md:grid-cols-3">
          <RunMeta label="실행 ID" value={run.runId} />
          <RunMeta label="실행 방식" value={run.executionSource} />
          <RunMeta label="실행자" value={run.executorLabel} />
          <RunMeta label="트리거" value={run.triggerLabel} />
          <RunMeta label="시작 시각" value={run.startedAt} />
          <RunMeta label="종료 시각" value={run.endedAt} />
          <RunMeta label="재시도" value={run.retried ? '있음' : '없음'} />
        </div>
        <NodeTraceTable run={run} />
      </div>
    </details>
  );
}

function RunMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2">
      <span className="font-black text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-slate-700">{value}</span>
    </div>
  );
}

function NodeTraceTable({ run }: { run: WorkflowRunHistoryEntry }) {
  const rows: NodeTraceRow[] = run.nodeLogs.map((log, index) => {
    const tokens = estimateTokenUsage(log.credits);

    return {
      log,
      inputSummary: buildInputSummary(log),
      outputSummary: buildOutputSummary(log),
      model: getModelForNode(log),
      tokens,
      costUsd: estimateCost(tokens),
      retried: run.retried && index === run.nodeLogs.length - 1,
      traceId: `trace_${run.runId}_${String(index + 1).padStart(2, '0')}`,
    };
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-[1320px]">
        <div className="grid grid-cols-[140px_82px_210px_210px_130px_90px_80px_160px_72px_150px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-400">
          <span>노드</span>
          <span>상태</span>
          <span>입력 요약</span>
          <span>출력 요약</span>
          <span>사용 모델</span>
          <span className="text-right">토큰</span>
          <span className="text-right">비용</span>
          <span>에러 메시지</span>
          <span>재시도</span>
          <span>실행 트레이스 보기</span>
        </div>
        {rows.map((row) => {
          const isSuccess = row.log.status === 'Success';

          return (
            <div
              key={row.traceId}
              className="grid grid-cols-[140px_82px_210px_210px_130px_90px_80px_160px_72px_150px] gap-3 border-b border-slate-100 px-3 py-3 text-xs last:border-b-0"
            >
              <span className="truncate font-black text-slate-950">{row.log.name}</span>
              <Badge variant={isSuccess ? 'success' : 'warning'}>
                {isSuccess ? '성공' : '실패'}
              </Badge>
              <span className="max-h-10 overflow-hidden text-slate-600">{row.inputSummary}</span>
              <span className="max-h-10 overflow-hidden text-slate-600">{row.outputSummary}</span>
              <span className="truncate font-mono text-slate-600">{row.model}</span>
              <span className="text-right font-black text-slate-700">
                {row.tokens.toLocaleString('ko-KR')}
              </span>
              <span className="text-right font-black text-slate-700">
                ${row.costUsd.toFixed(4)}
              </span>
              <span className={cn('max-h-10 overflow-hidden', isSuccess ? 'text-slate-400' : 'text-red-600')}>
                {isSuccess ? '-' : row.log.message ?? '외부 도구 응답 실패'}
              </span>
              <span className="font-bold text-slate-600">{row.retried ? '있음' : '없음'}</span>
              <button
                type="button"
                className="truncate text-left font-black text-blue-600 hover:text-blue-800"
                title={row.traceId}
              >
                {row.traceId}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeLogRow({ log, compact = false }: { log: ExecutionLog; compact?: boolean }) {
  const isSuccess = log.status === 'Success';

  return (
    <article
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4',
        compact && 'p-3',
        isSuccess ? 'border-slate-200' : 'border-red-200 bg-red-50',
      )}
    >
      <div className="min-w-0">
        <strong className="block truncate text-sm font-black text-slate-950">
          {log.name}
        </strong>
        <span className="mt-1 block text-sm text-slate-500">
          {log.typeLabel} · {log.description ?? '설명 없음'}
        </span>
        <small className="mt-1 block text-xs text-slate-400">
          실행 시간 {formatDuration(log.duration)} · 크레딧 {log.credits}
        </small>
        {log.message && (
          <small className="mt-1 block text-xs text-red-600">{log.message}</small>
        )}
      </div>
      <Badge variant={isSuccess ? 'success' : 'warning'}>
        {isSuccess ? '성공' : '실패'}
      </Badge>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
