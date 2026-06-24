'use client';

import { ArrowLeft, BarChart3, CalendarDays, Filter, SlidersHorizontal, X } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { cn } from '@/src/lib/utils';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

type LlmConfigChange = {
  version: string;
  changedAt: string;
  changedBy: string;
  beforeRunId: string;
  afterRunId: string;
  targetNode: string;
  changeSummary: string;
  promptSummary: string;
  outputChangeSummary: string;
  beforeOutputSample: string;
  afterOutputSample: string;
  model: string;
  temperature: string;
  schemaMode: string;
  ragSetting: string;
  qualityScore: number;
  parseFailureRate: string;
  emptyResponseRate: string;
  rerunRate: string;
};

type LangSmithEvaluatorMetric = {
  key: string;
  label: string;
  source: 'online evaluator' | 'offline experiment' | 'human annotation';
  target: 'root run' | 'LLM span' | 'retrieval span' | 'tool span';
  score: number;
  passRate: string;
  sampleCount: number;
  trend: string;
  description: string;
};

type LangSmithTraceReviewItem = {
  traceId: string;
  runId: string;
  spanName: string;
  evaluatorKey: string;
  score: number;
  verdict: '통과' | '검토 필요' | '실패';
  inputSummary: string;
  outputSummary: string;
  feedbackComment: string;
  correction: string;
  nextAction: string;
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

type ReportChartMetric = 'tokens' | 'avgDuration' | 'executions' | 'cost' | 'errors';
type ReportChartUnit = 'day' | 'week' | 'month';
type ReportActorFilter = 'all' | 'auto' | 'users';
type ReportStatusFilter = 'all' | 'success' | 'failed';
type ReportChartMode = 'combo' | 'bar' | 'line' | 'area';
type ChartSortOrder = 'timeAsc' | 'valueDesc' | 'valueAsc';

type InteractiveReportPoint = {
  label: string;
  executions: number;
  avgDuration: number;
  tokens: number;
  cost: number;
  errors: number;
  autoExecutions: number;
  manualExecutions: number;
  userExecutions: number;
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
  const [reportMetric, setReportMetric] = useState<ReportChartMetric>('tokens');
  const [reportUnit, setReportUnit] = useState<ReportChartUnit>('day');
  const [actorFilter, setActorFilter] = useState<ReportActorFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [chartMode, setChartMode] = useState<ReportChartMode>('combo');
  const [executionTimeSort, setExecutionTimeSort] = useState<ChartSortOrder>('timeAsc');
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
  const totalTokens = estimateTokenUsage(
    displayLogs.reduce((total, log) => total + log.credits, 0),
  );
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
  const llmConfigChanges: LlmConfigChange[] = [
    {
      version: 'v1',
      changedAt: '2026-06-17 10:20:12',
      changedBy: '김민지',
      beforeRunId: '-',
      afterRunId: 'run_20260617_102012_cfg',
      targetNode: llmLogs[0]?.name ?? 'AI Agent',
      changeSummary: '초기 프롬프트 적용',
      promptSummary: '회의록에서 결정사항과 할 일을 한 번에 추출',
      outputChangeSummary: '초기 출력 기준선 생성',
      beforeOutputSample: '비교 대상 없음',
      afterOutputSample: '회의 내용을 일반 요약문 중심으로 정리',
      model: 'gpt-4o-mini',
      temperature: '0.7',
      schemaMode: '자유 텍스트',
      ragSetting: '미사용',
      qualityScore: 82,
      parseFailureRate: '6.2%',
      emptyResponseRate: '1.8%',
      rerunRate: '9.4%',
    },
    {
      version: 'v2',
      changedAt: '2026-06-20 15:44:03',
      changedBy: '이혜연',
      beforeRunId: 'run_20260620_090000_sch',
      afterRunId: 'run_20260620_154403_cfg',
      targetNode: llmLogs[0]?.name ?? 'AI Agent',
      changeSummary: '출력 형식과 역할 지시 강화',
      promptSummary: '결정사항, 담당자별 할 일, 일정 후보, 리스크를 고정 섹션으로 분리',
      outputChangeSummary: '자유 텍스트 요약에서 섹션형 구조화 결과로 변경',
      beforeOutputSample: '결정사항과 할 일이 문단 안에 섞여 표시됨',
      afterOutputSample: '결정사항 / 담당자별 할 일 / 일정 후보 / 리스크로 분리',
      model: 'gpt-4o-mini',
      temperature: '0.3',
      schemaMode: 'JSON schema',
      ragSetting: '프로젝트 문서 3개 참조',
      qualityScore: 88,
      parseFailureRate: '2.1%',
      emptyResponseRate: '0.8%',
      rerunRate: '4.6%',
    },
    {
      version: 'v3',
      changedAt: '2026-06-23 18:14:37',
      changedBy: '박준',
      beforeRunId: 'run_20260623_090000_sch',
      afterRunId: 'run_20260623_181437_u02',
      targetNode: llmLogs[1]?.name ?? llmLogs[0]?.name ?? 'PM AI Agent',
      changeSummary: 'RAG 근거 사용 규칙과 가드레일 추가',
      promptSummary: '근거 문서가 없으면 추정하지 않고 확인 필요로 표시',
      outputChangeSummary: '근거 없는 단정 표현이 줄고 확인 필요 항목이 명시됨',
      beforeOutputSample: '일정 후보를 문서 근거 없이 추천',
      afterOutputSample: '근거 문서가 없는 일정은 확인 필요로 표시',
      model: 'gpt-4.1-mini',
      temperature: '0.2',
      schemaMode: 'JSON schema + guardrail',
      ragSetting: 'top-k 5, 최소 점수 0.72',
      qualityScore: failedLogs.length > 0 ? 88 : 93,
      parseFailureRate: failedLogs.length > 0 ? '1.4%' : '0.4%',
      emptyResponseRate: '0.3%',
      rerunRate: hasRetriedRun ? '2.8%' : '1.2%',
    },
  ];
  const langSmithEvaluatorMetrics: LangSmithEvaluatorMetric[] = [
    {
      key: 'correctness',
      label: '정확성',
      source: 'offline experiment',
      target: 'root run',
      score: 0.91,
      passRate: '92%',
      sampleCount: 128,
      trend: '+6.4%',
      description: '기대 출력과 실제 출력의 의미 일치 여부',
    },
    {
      key: 'groundedness',
      label: '근거 충실도',
      source: 'online evaluator',
      target: 'LLM span',
      score: 0.86,
      passRate: '88%',
      sampleCount: 342,
      trend: '+3.1%',
      description: 'RAG 문서 근거 없이 단정한 답변을 탐지',
    },
    {
      key: 'schema_validity',
      label: 'Schema 유효성',
      source: 'online evaluator',
      target: 'LLM span',
      score: failedLogs.length > 0 ? 0.89 : 0.97,
      passRate: failedLogs.length > 0 ? '89%' : '97%',
      sampleCount: 342,
      trend: failedLogs.length > 0 ? '-2.0%' : '+1.2%',
      description: 'JSON/schema 파싱 가능 여부와 필수 필드 누락 여부',
    },
    {
      key: 'retrieval_relevance',
      label: '검색 적합도',
      source: 'online evaluator',
      target: 'retrieval span',
      score: ragLogs.length > 0 ? 0.82 : 0.34,
      passRate: ragLogs.length > 0 ? '84%' : '34%',
      sampleCount: 214,
      trend: ragLogs.length > 0 ? '+4.8%' : '-18.0%',
      description: '검색된 문서가 사용자 입력과 실제로 관련 있는지 평가',
    },
    {
      key: 'human_review',
      label: '사람 검수',
      source: 'human annotation',
      target: 'root run',
      score: 0.78,
      passRate: '78%',
      sampleCount: 37,
      trend: '+9.0%',
      description: '운영자가 직접 남긴 평가/수정 의견 기준',
    },
  ];
  const langSmithTraceReviewItems: LangSmithTraceReviewItem[] = [
    {
      traceId: 'trace_run_20260623_181437_u02_03',
      runId: 'run_20260623_181437_u02',
      spanName: 'AI Agent: 후속 작업 정리',
      evaluatorKey: 'groundedness',
      score: 0.42,
      verdict: '검토 필요',
      inputSummary: '회의록과 Notion 프로젝트 문서 2개를 근거로 후속 작업 정리 요청',
      outputSummary: '일정 후보 2개를 제안했지만 참조 문서 근거가 부족함',
      feedbackComment: '일정 DB에서 찾지 못한 날짜를 추천처럼 표현했습니다.',
      correction: '근거 없음 항목은 추천하지 말고 확인 필요로 분리',
      nextAction: 'annotation queue에 추가하고 v4 프롬프트 테스트 케이스로 승격',
    },
    {
      traceId: 'trace_run_20260620_154403_cfg_02',
      runId: 'run_20260620_154403_cfg',
      spanName: 'LLM: 요약',
      evaluatorKey: 'schema_validity',
      score: 0.58,
      verdict: '실패',
      inputSummary: 'Gmail 미확인 메일 12건 요약 후 Slack 전송 payload 생성',
      outputSummary: '담당자 필드가 배열이 아닌 문자열로 반환됨',
      feedbackComment: '후속 Slack Sender에서 payload validation 실패 가능성이 큽니다.',
      correction: 'assignees는 항상 string[]로 반환',
      nextAction: 'schema evaluator 실패 샘플로 dataset에 저장',
    },
    {
      traceId: 'trace_run_20260624_090000_sch_01',
      runId: 'run_20260624_090000_sch',
      spanName: 'Notion MCP',
      evaluatorKey: 'retrieval_relevance',
      score: 0.91,
      verdict: '통과',
      inputSummary: '프로젝트 키워드로 관련 Notion 페이지와 일정 DB 검색',
      outputSummary: '상위 문서 3개와 일정 후보 4건 반환',
      feedbackComment: '검색 결과가 최종 답변 근거로 적절하게 사용되었습니다.',
      correction: '-',
      nextAction: '정상 샘플로 유지',
    },
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
    const shouldUseLargeLogSet =
      selectedWorkflow?.name.includes('GitHub PR Review') ||
      workflow?.name.includes('GitHub PR Review');
    const demoExecutors = ['김민지', '이혜연', '박준', '정형민', '윤기', '호준', '영훈'];
    const expandedRunTemplates = shouldUseLargeLogSet
      ? Array.from({ length: 84 }, (_, index) => {
          const date = new Date(2026, 5, 24, 20, 30, 0);
          date.setHours(date.getHours() - index * 3);

          const pad = (value: number) => String(value).padStart(2, '0');
          const startedAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
            date.getDate(),
          )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
          const isAuto = index % 4 === 0;
          const hasRetry = index % 13 === 0;
          const triggerLabel = isAuto ? 'Webhook Trigger' : '실행 버튼';
          const executorLabel = isAuto ? '자동 실행' : demoExecutors[index % demoExecutors.length];
          const runSuffix = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
            date.getDate(),
          )}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

          return {
            id: `github-pr-demo-${index + 1}`,
            runId: `run_${runSuffix}_${isAuto ? 'webhook' : `u${pad((index % 9) + 1)}`}`,
            startedAt,
            triggerLabel,
            executorLabel,
            executionSource: isAuto ? ('자동 실행' as const) : ('수동 실행' as const),
            durationMultiplier: Number((0.72 + (index % 9) * 0.08).toFixed(2)),
            tokenMultiplier: Number((0.76 + (index % 11) * 0.05).toFixed(2)),
            retried: hasRetry,
          };
        })
      : runTemplates;

    return expandedRunTemplates.map((template, runIndex) => {
      const nodeLogs = baseLogs.map((log, logIndex) => {
        const isSyntheticFailure =
          (runIndex === 2 && logIndex === baseLogs.length - 1 && failedLogs.length > 0) ||
          (shouldUseLargeLogSet && runIndex % 17 === 0 && logIndex === baseLogs.length - 1);

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
  }, [
    displayLogs,
    failedLogs.length,
    selectedWorkflow?.lastRun,
    selectedWorkflow?.name,
    syntheticLogs,
    workflow?.name,
  ]);
  const interactiveReportData = useMemo<InteractiveReportPoint[]>(() => {
    const labelsByUnit: Record<ReportChartUnit, string[]> = {
      day: ['6/17', '6/18', '6/19', '6/20', '6/21', '6/22', '6/23'],
      week: ['5월 4주', '6월 1주', '6월 2주', '6월 3주', '6월 4주'],
      month: ['1월', '2월', '3월', '4월', '5월', '6월'],
    };
    const base = selectedWorkflow?.executions ?? summary.executions;
    const labels = labelsByUnit[reportUnit];
    const unitMultiplier = reportUnit === 'day' ? 0.16 : reportUnit === 'week' ? 0.42 : 0.76;

    return labels.map((label, index) => {
      const wave = 1 + ((index % 3) - 1) * 0.12;
      const executions = Math.max(1, Math.round(base * unitMultiplier * wave));
      const avgDuration = Number(
        ((selectedWorkflow?.avgDuration ?? Math.max(1.2, totalDuration || 2.4)) + index * 0.18).toFixed(1),
      );
      const tokens = Math.max(900, Math.round(baseTokens * unitMultiplier * wave));
      const errors = Math.max(0, Math.round((selectedWorkflow?.errorCount ?? failedLogs.length) * wave));
      const autoExecutions = Math.round(executions * (0.58 + (index % 2) * 0.08));

      return {
        label,
        executions,
        avgDuration,
        tokens,
        cost: estimateCost(tokens),
        errors,
        autoExecutions,
        manualExecutions: Math.max(0, executions - autoExecutions),
        userExecutions: Math.max(0, executions - autoExecutions),
      };
    });
  }, [
    baseTokens,
    failedLogs.length,
    reportUnit,
    selectedWorkflow?.avgDuration,
    selectedWorkflow?.errorCount,
    selectedWorkflow?.executions,
    summary.executions,
    totalDuration,
  ]);
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
  const sortedChartRows = [...chartRows].sort((first, second) => {
    if (executionTimeSort === 'valueDesc') {
      return second.value - first.value;
    }

    if (executionTimeSort === 'valueAsc') {
      return first.value - second.value;
    }

    return 0;
  });
  const maxChartValue = Math.max(1, ...sortedChartRows.map((row) => row.value));
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

            <InteractiveReportChart
              data={interactiveReportData}
              metric={reportMetric}
              unit={reportUnit}
              actorFilter={actorFilter}
              statusFilter={statusFilter}
              chartMode={chartMode}
              onChangeMetric={setReportMetric}
              onChangeUnit={setReportUnit}
              onChangeActorFilter={setActorFilter}
              onChangeStatusFilter={setStatusFilter}
              onChangeChartMode={setChartMode}
            />

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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {selectedWorkflow ? '노드별 실행 시간' : '워크플로우별 평균 실행 시간'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedWorkflow
                          ? '각 노드가 실행에 사용한 시간을 비교합니다.'
                          : '전체 워크플로우의 평균 실행 시간을 비교합니다.'}
                      </p>
                    </div>
                    <CompactSelect
                      ariaLabel="실행 시간 그래프 정렬"
                      value={executionTimeSort}
                      options={[
                        ['timeAsc', '기본순'],
                        ['valueDesc', '시간 긴순'],
                        ['valueAsc', '시간 짧은순'],
                      ]}
                      onChange={(value) => setExecutionTimeSort(value as ChartSortOrder)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {sortedChartRows.length === 0 ? (
                    <EmptyState text="표시할 워크플로우가 없습니다." />
                  ) : (
                    sortedChartRows.map((row) => (
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
                <RunLogOverviewCharts runs={runHistory} />
                <RunHistoryDataGrid runs={runHistory} />
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

            <LangSmithEvaluationPanel
              evaluatorMetrics={langSmithEvaluatorMetrics}
              traceReviewItems={langSmithTraceReviewItems}
            />

            <Card>
              <CardHeader>
                <h3 className="text-lg font-black text-slate-950">프롬프트/설정 변경별 품질 변화</h3>
                <p className="text-sm text-slate-500">
                  LLM/Agent 노드의 프롬프트, 모델, schema, RAG 설정이 바뀐 실행끼리 품질 지표가 어떻게 달라졌는지 비교합니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ConfigChangeScoreChart changes={llmConfigChanges} />
                <LlmConfigChangeTable changes={llmConfigChanges} />
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
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>('timeAsc');
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

function InteractiveReportChart({
  data,
  metric,
  unit,
  actorFilter,
  statusFilter,
  chartMode,
  onChangeMetric,
  onChangeUnit,
  onChangeActorFilter,
  onChangeStatusFilter,
  onChangeChartMode,
}: {
  data: InteractiveReportPoint[];
  metric: ReportChartMetric;
  unit: ReportChartUnit;
  actorFilter: ReportActorFilter;
  statusFilter: ReportStatusFilter;
  chartMode: ReportChartMode;
  onChangeMetric: (metric: ReportChartMetric) => void;
  onChangeUnit: (unit: ReportChartUnit) => void;
  onChangeActorFilter: (filter: ReportActorFilter) => void;
  onChangeStatusFilter: (filter: ReportStatusFilter) => void;
  onChangeChartMode: (mode: ReportChartMode) => void;
}) {
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>('timeAsc');
  const metricLabels: Record<ReportChartMetric, string> = {
    tokens: '토큰 사용량',
    avgDuration: '평균 실행 시간',
    executions: '실행 횟수',
    cost: '비용',
    errors: '오류 수',
  };
  const unitLabels: Record<ReportChartUnit, string> = {
    day: '일 단위',
    week: '주 단위',
    month: '월 단위',
  };
  const chartModeLabels: Record<ReportChartMode, string> = {
    combo: '막대+추이선',
    bar: '막대',
    line: '선 추이',
    area: '면적 추이',
  };
  const metricOptions: Array<[ReportChartMetric, string]> = [
    ['tokens', '토큰 사용량'],
    ['avgDuration', '평균 실행 시간'],
    ['executions', '실행 횟수'],
    ['cost', '비용'],
    ['errors', '오류 수'],
  ];
  const unitOptions: Array<[ReportChartUnit, string]> = [
    ['day', '일'],
    ['week', '주'],
    ['month', '월'],
  ];
  const chartModeOptions: Array<[ReportChartMode, string]> = [
    ['combo', '복합'],
    ['bar', '막대'],
    ['line', '선'],
    ['area', '면적'],
  ];
  const actorOptions: Array<[ReportActorFilter, string]> = [
    ['all', '전체 주체'],
    ['auto', '자동 실행'],
    ['users', '사용자 실행'],
  ];
  const statusOptions: Array<[ReportStatusFilter, string]> = [
    ['all', '전체 상태'],
    ['success', '성공만'],
    ['failed', '실패만'],
  ];
  const sortOptions: Array<[ChartSortOrder, string]> = [
    ['timeAsc', '시간순'],
    ['valueDesc', '값 높은순'],
    ['valueAsc', '값 낮은순'],
  ];
  const filteredData = data.map((point) => {
    const actorRatio =
      actorFilter === 'auto'
        ? point.autoExecutions / Math.max(1, point.executions)
        : actorFilter === 'users'
          ? point.userExecutions / Math.max(1, point.executions)
          : 1;
    const statusRatio =
      statusFilter === 'failed'
        ? point.errors / Math.max(1, point.executions)
        : statusFilter === 'success'
          ? Math.max(0, point.executions - point.errors) / Math.max(1, point.executions)
          : 1;
    const ratio = Math.max(0, actorRatio * statusRatio);

    return {
      ...point,
      executions: Math.max(0, Math.round(point.executions * ratio)),
      tokens: Math.max(0, Math.round(point.tokens * ratio)),
      cost: Number((point.cost * ratio).toFixed(4)),
      errors: statusFilter === 'success' ? 0 : Math.max(0, Math.round(point.errors * ratio)),
      avgDuration: Number((point.avgDuration * (statusFilter === 'failed' ? 1.18 : 1)).toFixed(1)),
    };
  });
  const getMetricValue = (point: InteractiveReportPoint) => {
    if (metric === 'avgDuration') {
      return point.avgDuration;
    }

    return point[metric];
  };
  const sortedData = [...filteredData].sort((first, second) => {
    if (sortOrder === 'valueDesc') {
      return getMetricValue(second) - getMetricValue(first);
    }

    if (sortOrder === 'valueAsc') {
      return getMetricValue(first) - getMetricValue(second);
    }

    return 0;
  });
  const formatMetricValue = (value: number) => {
    if (metric === 'avgDuration') {
      return `${value.toFixed(1)}s`;
    }

    if (metric === 'tokens') {
      return value.toLocaleString('ko-KR');
    }

    if (metric === 'cost') {
      return `$${value.toFixed(4)}`;
    }

    return `${Math.round(value).toLocaleString('ko-KR')}회`;
  };
  const values = sortedData.map(getMetricValue);
  const maxValue = Math.max(1, ...values);
  const totalValue = values.reduce((total, value) => total + value, 0);
  const averageValue = totalValue / Math.max(1, values.length);
  const peak = sortedData.reduce(
    (currentPeak, point) => (getMetricValue(point) > getMetricValue(currentPeak) ? point : currentPeak),
    sortedData[0] ?? data[0],
  );
  const chartData = sortedData.map((point) => ({
    ...point,
    selectedValue: getMetricValue(point),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">맞춤 보고 그래프</h3>
            <p className="mt-1 text-sm text-slate-500">
              지표, 기간 단위, 실행 주체와 상태를 바꿔 원하는 관점으로 운영 데이터를 필터링합니다.
            </p>
          </div>
          <Badge variant="secondary">
            {metricLabels[metric]} · {unitLabels[unit]} · {chartModeLabels[chartMode]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.15fr)_minmax(360px,1fr)_minmax(280px,0.9fr)]">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
                <BarChart3 size={14} />
                보고 지표
              </div>
              <select
                value={metric}
                onChange={(event) => onChangeMetric(event.target.value as ReportChartMetric)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-slate-950"
              >
                {metricOptions.map(([optionValue, optionLabel]) => (
                  <option key={optionValue} value={optionValue}>
                    {optionLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
              <SegmentedControl
                icon={<CalendarDays size={14} />}
                label="기간"
                value={unit}
                options={unitOptions}
                onChange={(value) => onChangeUnit(value as ReportChartUnit)}
              />
              <SegmentedControl
                icon={<SlidersHorizontal size={14} />}
                label="그래프"
                value={chartMode}
                options={chartModeOptions}
                onChange={(value) => onChangeChartMode(value as ReportChartMode)}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
                <Filter size={14} />
                필터
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <CompactSelect
                  ariaLabel="실행 주체"
                  value={actorFilter}
                  options={actorOptions}
                  onChange={(value) => onChangeActorFilter(value as ReportActorFilter)}
                />
                <CompactSelect
                  ariaLabel="상태"
                  value={statusFilter}
                  options={statusOptions}
                  onChange={(value) => onChangeStatusFilter(value as ReportStatusFilter)}
                />
                <CompactSelect
                  ariaLabel="정렬"
                  value={sortOrder}
                  options={sortOptions}
                  onChange={(value) => setSortOrder(value as ChartSortOrder)}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              {metricLabels[metric]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              {unitLabels[unit]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              {chartModeLabels[chartMode]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              {actorOptions.find(([value]) => value === actorFilter)?.[1]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              {statusOptions.find(([value]) => value === statusFilter)?.[1]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              {sortOptions.find(([value]) => value === sortOrder)?.[1]}
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <strong className="text-sm font-black text-slate-950">
                  {chartModeLabels[chartMode]}
                </strong>
                <p className="mt-1 text-xs text-slate-500">
                  {chartMode === 'combo'
                    ? '막대는 구간별 수치, 선은 같은 지표의 변화 흐름을 보여줍니다.'
                    : chartMode === 'bar'
                      ? '기간별 수치를 구간 단위로 비교합니다.'
                      : chartMode === 'line'
                        ? '시간 흐름에 따른 지표 변화만 선으로 확인합니다.'
                        : '추세선과 면적으로 기간별 누적 흐름을 강조합니다.'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {metricLabels[metric]}
              </span>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 18, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(value) => formatMetricValue(Number(value))}
                    width={76}
                    domain={[0, Math.ceil(maxValue * 1.12)]}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) {
                        return null;
                      }

                      const value = Number(payload[0]?.value ?? 0);

                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <strong className="block text-slate-950">{label}</strong>
                          <span className="mt-1 block font-bold text-blue-600">
                            {metricLabels[metric]} {formatMetricValue(value)}
                          </span>
                        </div>
                      );
                    }}
                  />
                  {(chartMode === 'combo' || chartMode === 'bar') && (
                    <Bar
                      dataKey="selectedValue"
                      fill="#0f172a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                      isAnimationActive={false}
                    />
                  )}
                  {chartMode === 'area' && (
                    <Area
                      type="monotone"
                      dataKey="selectedValue"
                      fill="#2563eb"
                      fillOpacity={0.12}
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      isAnimationActive={false}
                    />
                  )}
                  {(chartMode === 'combo' || chartMode === 'line') && (
                    <Line
                      type="monotone"
                      dataKey="selectedValue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-3">
            <ReportInsight label="합계" value={formatMetricValue(totalValue)} />
            <ReportInsight label="평균" value={formatMetricValue(averageValue)} />
            <ReportInsight
              label="최고 구간"
              value={peak ? `${peak.label} · ${formatMetricValue(getMetricValue(peak))}` : '-'}
            />
            <ReportInsight
              label="필터"
              value={`${unitLabels[unit]} · ${metricLabels[metric]}`}
              muted
            />
            <ReportInsight label="그래프" value={chartModeLabels[chartMode]} muted />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentedControl({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
        {icon}
        {label}
      </div>
      <div className="grid grid-flow-col auto-cols-fr rounded-lg bg-slate-100 p-1">
        {options.map(([optionValue, optionLabel]) => {
          const isSelected = optionValue === value;

          return (
            <button
              key={optionValue}
              type="button"
              className={cn(
                'h-9 rounded-md px-2 text-xs font-black text-slate-500 transition',
                isSelected && 'bg-white text-slate-950 shadow-sm',
              )}
              onClick={() => onChange(optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompactSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-950"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function ReportSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-950"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReportTextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950"
      />
    </label>
  );
}

function ReportInsight({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border p-4', muted ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white')}>
      <span className="block text-xs font-black text-slate-500">{label}</span>
      <strong className="mt-2 block break-words text-lg font-black text-slate-950">
        {value}
      </strong>
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
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>('timeAsc');
  const sortedPeriods = [...periods].sort((first, second) => {
    if (sortOrder === 'valueDesc') {
      return second.tokens - first.tokens;
    }

    if (sortOrder === 'valueAsc') {
      return first.tokens - second.tokens;
    }

    return 0;
  });
  const maxTokens = Math.max(1, ...sortedPeriods.map((period) => period.tokens));
  const yTicks = [maxTokens, Math.round(maxTokens / 2), 0];

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <CompactSelect
          ariaLabel="기간별 토큰 정렬"
          value={sortOrder}
          options={[
            ['timeAsc', '기간순'],
            ['valueDesc', '토큰 많은순'],
            ['valueAsc', '토큰 적은순'],
          ]}
          onChange={(value) => setSortOrder(value as ChartSortOrder)}
        />
      </div>
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
            {sortedPeriods.map((period) => {
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
          {sortedPeriods.map((period) => (
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

function LangSmithEvaluationPanel({
  evaluatorMetrics,
  traceReviewItems,
}: {
  evaluatorMetrics: LangSmithEvaluatorMetric[];
  traceReviewItems: LangSmithTraceReviewItem[];
}) {
  const averageScore =
    evaluatorMetrics.reduce((total, metric) => total + metric.score, 0) /
    Math.max(1, evaluatorMetrics.length);
  const reviewQueueCount = traceReviewItems.filter((item) => item.verdict !== '통과').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">LangSmith 평가 운영</h3>
            <p className="mt-1 text-sm text-slate-500">
              trace/run/span에 붙은 evaluator 점수와 사람 검수 대상을 한 화면에서 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">평균 {Math.round(averageScore * 100)}점</Badge>
            <Badge variant={reviewQueueCount > 0 ? 'warning' : 'success'}>
              검토 큐 {reviewQueueCount}건
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <LangSmithFlowCard
            title="Dataset"
            value="128 examples"
            description="수동 케이스, 운영 trace, 실패 샘플을 평가용 입력/기대 출력으로 관리"
          />
          <LangSmithFlowCard
            title="Experiment"
            value="v1 -> v3"
            description="프롬프트/모델/설정 버전별 결과와 evaluator 점수 비교"
          />
          <LangSmithFlowCard
            title="Online Eval"
            value="342 traces"
            description="운영 실행을 실시간으로 scoring하고 이상 징후를 감지"
          />
          <LangSmithFlowCard
            title="Annotation"
            value={`${reviewQueueCount} queued`}
            description="사람 검수가 필요한 run/span을 큐에 쌓고 correction을 기록"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {evaluatorMetrics.map((metric) => (
            <LangSmithEvaluatorCard key={metric.key} metric={metric} />
          ))}
        </div>

        <LangSmithTraceReviewTable items={traceReviewItems} />
      </CardContent>
    </Card>
  );
}

function LangSmithFlowCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="text-xs font-black text-slate-400">{title}</span>
      <strong className="mt-2 block text-xl font-black text-slate-950">{value}</strong>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

function LangSmithEvaluatorCard({ metric }: { metric: LangSmithEvaluatorMetric }) {
  const score = Math.round(metric.score * 100);
  const isRisk = score < 80;

  return (
    <article
      className={cn(
        'rounded-lg border bg-white p-4',
        isRisk ? 'border-amber-200 bg-amber-50' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <strong className="block text-sm font-black text-slate-950">{metric.label}</strong>
          <span className="mt-1 block font-mono text-[11px] font-bold text-slate-400">
            {metric.key}
          </span>
        </div>
        <span className={cn('text-xs font-black', isRisk ? 'text-amber-700' : 'text-emerald-700')}>
          {metric.trend}
        </span>
      </div>
      <div className="mt-4">
        <span className="text-3xl font-black text-slate-950">{score}</span>
        <span className="ml-1 text-xs font-bold text-slate-400">/ 100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <span
          className={cn('block h-full rounded-full', isRisk ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-3 grid gap-1 text-xs text-slate-500">
        <span>통과율 {metric.passRate} · 샘플 {metric.sampleCount}개</span>
        <span>{metric.source} · {metric.target}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{metric.description}</p>
    </article>
  );
}

function LangSmithTraceReviewTable({ items }: { items: LangSmithTraceReviewItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-[1320px]">
        <div className="grid grid-cols-[170px_170px_150px_130px_80px_100px_220px_220px_220px_180px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
          <span>trace id</span>
          <span>run id</span>
          <span>span</span>
          <span>evaluator</span>
          <span className="text-right">score</span>
          <span>판정</span>
          <span>입력 요약</span>
          <span>출력 요약</span>
          <span>피드백/수정</span>
          <span>다음 액션</span>
        </div>
        {items.map((item) => (
          <div
            key={item.traceId}
            className="grid grid-cols-[170px_170px_150px_130px_80px_100px_220px_220px_220px_180px] gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"
          >
            <span className="truncate font-mono font-black text-blue-700">{item.traceId}</span>
            <span className="truncate font-mono text-slate-600">{item.runId}</span>
            <span className="truncate font-bold text-slate-700">{item.spanName}</span>
            <span className="font-mono text-slate-600">{item.evaluatorKey}</span>
            <span className="text-right font-black text-slate-950">
              {Math.round(item.score * 100)}
            </span>
            <span>
              <Badge
                variant={
                  item.verdict === '통과'
                    ? 'success'
                    : item.verdict === '실패'
                      ? 'warning'
                      : 'secondary'
                }
              >
                {item.verdict}
              </Badge>
            </span>
            <span className="max-h-10 overflow-hidden text-slate-600">{item.inputSummary}</span>
            <span className="max-h-10 overflow-hidden text-slate-600">{item.outputSummary}</span>
            <span className="max-h-10 overflow-hidden text-slate-600">
              {item.feedbackComment} / {item.correction}
            </span>
            <span className="max-h-10 overflow-hidden font-bold text-slate-700">
              {item.nextAction}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityTrendChart({ points }: { points: QualityTrendPoint[] }) {
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>('timeAsc');
  const sortedPoints = [...points].sort((first, second) => {
    if (sortOrder === 'valueDesc') {
      return second.score - first.score;
    }

    if (sortOrder === 'valueAsc') {
      return first.score - second.score;
    }

    return 0;
  });
  const maxScore = 100;

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <CompactSelect
          ariaLabel="품질 점수 정렬"
          value={sortOrder}
          options={[
            ['timeAsc', '날짜순'],
            ['valueDesc', '점수 높은순'],
            ['valueAsc', '점수 낮은순'],
          ]}
          onChange={(value) => setSortOrder(value as ChartSortOrder)}
        />
      </div>
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
            {sortedPoints.map((point) => (
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
          {sortedPoints.map((point) => (
            <span key={point.label} className="flex-1">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigChangeScoreChart({ changes }: { changes: LlmConfigChange[] }) {
  const [sortOrder, setSortOrder] = useState<ChartSortOrder>('timeAsc');
  const chartData = [...changes]
    .sort((first, second) => {
      if (sortOrder === 'valueDesc') {
        return second.qualityScore - first.qualityScore;
      }

      if (sortOrder === 'valueAsc') {
        return first.qualityScore - second.qualityScore;
      }

      return 0;
    })
    .map((change) => ({
      version: change.version,
      qualityScore: change.qualityScore,
    }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <strong className="text-sm font-black text-slate-950">설정 버전별 품질 점수</strong>
          <p className="mt-1 text-xs text-slate-500">
            프롬프트와 모델 설정이 바뀐 시점별 품질 점수 추이입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CompactSelect
            ariaLabel="설정 버전 품질 정렬"
            value={sortOrder}
            options={[
              ['timeAsc', '버전순'],
              ['valueDesc', '점수 높은순'],
              ['valueAsc', '점수 낮은순'],
            ]}
            onChange={(value) => setSortOrder(value as ChartSortOrder)}
          />
          <Badge variant="secondary">Prompt/config version</Badge>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 18, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="version"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
              width={44}
              domain={[70, 100]}
            />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <strong className="block text-slate-950">{label}</strong>
                    <span className="mt-1 block font-bold text-blue-600">
                      품질 점수 {payload[0].value}
                    </span>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="qualityScore"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LlmConfigChangeTable({ changes }: { changes: LlmConfigChange[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-[1760px]">
        <div className="grid grid-cols-[70px_150px_90px_170px_170px_140px_190px_230px_260px_220px_220px_90px_96px_96px_90px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
          <span>버전</span>
          <span>변경 시각</span>
          <span>변경자</span>
          <span>변경 전 실행 ID</span>
          <span>변경 후 실행 ID</span>
          <span>대상 노드</span>
          <span>변경 요약</span>
          <span>프롬프트 요약</span>
          <span>출력 변화 요약</span>
          <span>이전 출력 예시</span>
          <span>변경 후 출력 예시</span>
          <span className="text-right">품질</span>
          <span className="text-right">파싱 실패</span>
          <span className="text-right">빈 응답</span>
          <span className="text-right">재실행</span>
        </div>
        {changes.map((change, index) => {
          const previous = changes[index - 1];
          const scoreDelta = previous ? change.qualityScore - previous.qualityScore : 0;

          return (
            <div
              key={change.version}
              className="grid grid-cols-[70px_150px_90px_170px_170px_140px_190px_230px_260px_220px_220px_90px_96px_96px_90px] gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"
            >
              <strong className="font-black text-slate-950">{change.version}</strong>
              <span className="font-mono text-slate-600">{change.changedAt}</span>
              <span className="font-bold text-slate-600">{change.changedBy}</span>
              <span className="truncate font-mono text-blue-700">{change.beforeRunId}</span>
              <span className="truncate font-mono text-blue-700">{change.afterRunId}</span>
              <span className="truncate font-bold text-slate-700">{change.targetNode}</span>
              <span className="max-h-10 overflow-hidden text-slate-600">{change.changeSummary}</span>
              <span className="max-h-10 overflow-hidden text-slate-600">{change.promptSummary}</span>
              <span className="max-h-10 overflow-hidden font-bold text-slate-700">
                {change.outputChangeSummary}
              </span>
              <span className="max-h-10 overflow-hidden text-slate-500">
                {change.beforeOutputSample}
              </span>
              <span className="max-h-10 overflow-hidden text-slate-700">
                {change.afterOutputSample}
              </span>
              <span className="text-right font-black text-slate-900">
                {change.qualityScore}
                {previous && (
                  <small
                    className={cn(
                      'ml-1 font-black',
                      scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}
                  </small>
                )}
              </span>
              <span className="text-right font-bold text-slate-600">{change.parseFailureRate}</span>
              <span className="text-right font-bold text-slate-600">{change.emptyResponseRate}</span>
              <span className="text-right font-bold text-slate-600">{change.rerunRate}</span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 md:grid-cols-3">
        {changes.map((change) => (
          <div key={`${change.version}-settings`} className="rounded-md bg-white p-3">
            <strong className="block font-black text-slate-800">
              {change.version} 설정
            </strong>
            <span className="mt-1 block">
              모델 {change.model} · temperature {change.temperature}
            </span>
            <span className="mt-1 block">
              {change.schemaMode} · {change.ragSetting}
            </span>
          </div>
        ))}
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

function RunLogOverviewCharts({ runs }: { runs: WorkflowRunHistoryEntry[] }) {
  const [sortOrder, setSortOrder] = useState<
    'timeAsc' | 'durationDesc' | 'tokensDesc' | 'costDesc' | 'failedDesc'
  >('timeAsc');
  const chartData = runs
    .slice()
    .reverse()
    .map((run) => ({
      label: run.startedAt.slice(5, 16),
      runId: run.runId,
      duration: Number(run.duration.toFixed(2)),
      tokens: run.tokens,
      cost: run.costUsd,
      failedNodes: run.nodeLogs.filter((log) => log.status !== 'Success').length,
      retried: run.retried ? 1 : 0,
    }))
    .sort((first, second) => {
      if (sortOrder === 'durationDesc') {
        return second.duration - first.duration;
      }

      if (sortOrder === 'tokensDesc') {
        return second.tokens - first.tokens;
      }

      if (sortOrder === 'costDesc') {
        return second.cost - first.cost;
      }

      if (sortOrder === 'failedDesc') {
        return second.failedNodes - first.failedNodes;
      }

      return 0;
    });
  const totalFailedNodes = chartData.reduce((total, item) => total + item.failedNodes, 0);
  const maxDuration = Math.max(1, ...chartData.map((item) => item.duration));
  const maxTokens = Math.max(1, ...chartData.map((item) => item.tokens));

  return (
    <div className="mb-5 grid gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <strong className="text-sm font-black text-slate-950">실행 로그 그래프 정렬</strong>
          <p className="mt-1 text-xs text-slate-500">
            토큰, 비용, 실행 시간, 실패 노드가 큰 실행을 먼저 볼 수 있습니다.
          </p>
        </div>
        <CompactSelect
          ariaLabel="실행 로그 그래프 정렬"
          value={sortOrder}
          options={[
            ['timeAsc', '시간순'],
            ['tokensDesc', '토큰 많은순'],
            ['durationDesc', '실행 시간 긴순'],
            ['costDesc', '비용 높은순'],
            ['failedDesc', '실패 노드 많은순'],
          ]}
          onChange={(value) =>
            setSortOrder(value as 'timeAsc' | 'durationDesc' | 'tokensDesc' | 'costDesc' | 'failedDesc')
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <LatestExecutionField
          label="로그 수"
          value={`${runs.length}건`}
          description="현재 필터 전 전체 실행 이력"
        />
        <LatestExecutionField
          label="최대 실행 시간"
          value={formatDuration(maxDuration)}
          description="실행별 총 소요 시간 기준"
        />
        <LatestExecutionField
          label="최대 토큰"
          value={maxTokens.toLocaleString('ko-KR')}
          description="실행 1건 기준 최대 사용량"
        />
        <LatestExecutionField
          label="실패 노드"
          value={`${totalFailedNodes}개`}
          description="최근 실행 로그 내 실패/차단 노드 합계"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-slate-950">실행별 시간/토큰 추이</h4>
              <p className="mt-1 text-sm text-slate-500">
                막대는 토큰 사용량, 선은 실행 소요 시간을 의미합니다.
              </p>
            </div>
            <Badge variant="secondary">duration + tokens</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 18, bottom: 4, left: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  yAxisId="tokens"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  width={64}
                />
                <YAxis
                  yAxisId="duration"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const item = chartData.find((row) => row.label === label);

                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <strong className="block text-slate-950">{item?.runId ?? label}</strong>
                        <span className="mt-1 block text-slate-600">
                          토큰 {item?.tokens.toLocaleString('ko-KR')} · 시간 {item?.duration}s
                        </span>
                        <span className="mt-1 block text-slate-600">
                          비용 ${item?.cost.toFixed(4)} · 실패 노드 {item?.failedNodes}개
                        </span>
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="tokens"
                  dataKey="tokens"
                  fill="#0f172a"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="duration"
                  type="monotone"
                  dataKey="duration"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-slate-950">실패/재시도 신호</h4>
              <p className="mt-1 text-sm text-slate-500">
                실행별 실패 노드 수와 재시도 여부를 함께 봅니다.
              </p>
            </div>
            <Badge variant="secondary">ops signal</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  width={34}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const item = chartData.find((row) => row.label === label);

                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <strong className="block text-slate-950">{item?.runId ?? label}</strong>
                        <span className="mt-1 block text-red-600">
                          실패 노드 {item?.failedNodes}개
                        </span>
                        <span className="mt-1 block text-slate-600">
                          재시도 {item?.retried ? '있음' : '없음'}
                        </span>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="failedNodes"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="retried"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function RunHistoryDataGrid({ runs }: { runs: WorkflowRunHistoryEntry[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [actorFilter, setActorFilter] = useState<'all' | 'auto' | 'manual'>('all');
  const [retryFilter, setRetryFilter] = useState<'all' | 'retried' | 'notRetried'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id ?? '');
  const columns = useMemo<ColumnDef<WorkflowRunHistoryEntry>[]>(
    () => [
      {
        accessorKey: 'runId',
        header: '실행 ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-black text-slate-950">
            {row.original.runId}
          </span>
        ),
      },
      {
        accessorKey: 'startedAt',
        header: '시작 시각',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.startedAt}</span>,
      },
      {
        accessorKey: 'endedAt',
        header: '종료 시각',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.endedAt}</span>,
      },
      {
        accessorKey: 'executionSource',
        header: '실행 주체',
      },
      {
        accessorKey: 'executorLabel',
        header: '실행자',
      },
      {
        accessorKey: 'triggerLabel',
        header: '트리거',
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'duration',
        header: '소요 시간',
        cell: ({ row }) => (
          <span className="font-black">{formatDuration(row.original.duration)}</span>
        ),
      },
      {
        accessorKey: 'tokens',
        header: '토큰',
        cell: ({ row }) => (
          <span className="font-black">{row.original.tokens.toLocaleString('ko-KR')}</span>
        ),
      },
      {
        accessorKey: 'costUsd',
        header: '비용',
        cell: ({ row }) => (
          <span className="font-black">${row.original.costUsd.toFixed(4)}</span>
        ),
      },
      {
        accessorKey: 'retried',
        header: '재시도',
        cell: ({ row }) => (row.original.retried ? '있음' : '없음'),
      },
      {
        id: 'nodeCount',
        header: '노드',
        accessorFn: (run) => run.nodeLogs.length,
        cell: ({ row }) => `${row.original.nodeLogs.length}개`,
      },
    ],
    [],
  );
  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        const normalizedSearch = search.trim().toLowerCase();
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [
            run.runId,
            run.startedAt,
            run.endedAt,
            run.executionSource,
            run.executorLabel,
            run.triggerLabel,
            run.status,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'success' && run.status === '성공') ||
          (statusFilter === 'failed' && run.status === '실패');
        const matchesActor =
          actorFilter === 'all' ||
          (actorFilter === 'auto' && run.executionSource === '자동 실행') ||
          (actorFilter === 'manual' && run.executionSource === '수동 실행');
        const matchesRetry =
          retryFilter === 'all' ||
          (retryFilter === 'retried' && run.retried) ||
          (retryFilter === 'notRetried' && !run.retried);

        return matchesSearch && matchesStatus && matchesActor && matchesRetry;
      }),
    [actorFilter, retryFilter, runs, search, statusFilter],
  );
  const table = useReactTable({
    data: filteredRuns,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const sortedRows = table.getRowModel().rows;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [pageIndex, totalPages]);
  const visibleRows = sortedRows.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize,
  );
  const selectedRun =
    filteredRuns.find((run) => run.id === selectedRunId) ?? filteredRuns[0] ?? null;
  const visibleColumnLabels = table
    .getAllLeafColumns()
    .filter((column) => column.getIsVisible())
    .map((column) => String(column.columnDef.header ?? column.id));

  const exportCsv = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const headers = [
      '실행 ID',
      '시작 시각',
      '종료 시각',
      '실행 주체',
      '실행자',
      '트리거',
      '상태',
      '소요 시간',
      '토큰',
      '비용',
      '재시도',
      '노드 수',
    ];
    const rows = filteredRuns.map((run) => [
      run.runId,
      run.startedAt,
      run.endedAt,
      run.executionSource,
      run.executorLabel,
      run.triggerLabel,
      run.status,
      formatDuration(run.duration),
      run.tokens,
      run.costUsd.toFixed(4),
      run.retried ? '있음' : '없음',
      run.nodeLogs.length,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nodease-workflow-run-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 md:grid-cols-[1.2fr_160px_160px_160px] lg:flex-1">
            <ReportTextInput
              label="검색"
              value={search}
              placeholder="실행 ID, 실행자, 트리거 검색"
              onChange={setSearch}
            />
            <ReportSelect
              label="상태"
              value={statusFilter}
              options={[
                ['all', '전체'],
                ['success', '성공'],
                ['failed', '실패'],
              ]}
              onChange={(value) => setStatusFilter(value as 'all' | 'success' | 'failed')}
            />
            <ReportSelect
              label="실행 주체"
              value={actorFilter}
              options={[
                ['all', '전체'],
                ['auto', '자동 실행'],
                ['manual', '수동 실행'],
              ]}
              onChange={(value) => setActorFilter(value as 'all' | 'auto' | 'manual')}
            />
            <ReportSelect
              label="재시도"
              value={retryFilter}
              options={[
                ['all', '전체'],
                ['retried', '있음'],
                ['notRetried', '없음'],
              ]}
              onChange={(value) =>
                setRetryFilter(value as 'all' | 'retried' | 'notRetried')
              }
            />
            <ReportSelect
              label="행 표시"
              value={String(pageSize)}
              options={[
                ['10', '10개씩'],
                ['20', '20개씩'],
                ['50', '50개씩'],
              ]}
              onChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={exportCsv}>
              CSV 내보내기
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setActorFilter('all');
                setRetryFilter('all');
                setSorting([]);
                setColumnVisibility({});
                setPageIndex(0);
              }}
            >
              초기화
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <strong className="text-xs font-black text-slate-500">표시 컬럼</strong>
            <span className="text-xs font-bold text-slate-400">
              {visibleColumnLabels.length}개 표시
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {table.getAllLeafColumns().map((column) => (
              <label
                key={column.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
              >
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                {String(column.columnDef.header ?? column.id)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="grid min-w-0 gap-3">
          <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[1220px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sortState = header.column.getIsSorted();

                      return (
                        <th
                          key={header.id}
                          className="border-b border-slate-200 px-4 py-3 text-left text-xs font-black text-slate-400"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-slate-700"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="text-[10px]">
                              {sortState === 'asc' ? '↑' : sortState === 'desc' ? '↓' : '↕'}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => {
                    const isSelected = row.original.id === selectedRun?.id;

                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'cursor-pointer border-b border-slate-100 transition hover:bg-slate-50',
                          isSelected && 'bg-blue-50/70',
                        )}
                        onClick={() => setSelectedRunId(row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-xs text-slate-700">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="px-4 py-10 text-center text-sm font-bold text-slate-400"
                    >
                      조건에 맞는 실행 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
            <span>
              {filteredRuns.length.toLocaleString('ko-KR')}건 표시 / 전체 {runs.length.toLocaleString('ko-KR')}건
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              >
                이전
              </Button>
              <span>
                {safePageIndex + 1} / {totalPages} 페이지
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
              >
                다음
              </Button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          {selectedRun ? (
            <div className="max-h-[760px] overflow-auto rounded-xl border border-blue-200 bg-blue-50/40 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <strong className="text-sm font-black text-slate-950">선택한 실행 상세</strong>
                  <p className="mt-1 text-xs text-slate-500">
                    왼쪽 표의 행을 클릭하면 이 패널이 갱신됩니다.
                  </p>
                </div>
                <span className="rounded-md bg-white px-3 py-2 font-mono text-xs font-black text-blue-700">
                  {selectedRun.runId}
                </span>
              </div>
              <div className="grid gap-3 border-t border-blue-100 pt-3">
                <div className="grid gap-2 rounded-lg bg-white p-3 text-xs text-slate-600">
                  <RunMeta label="실행 ID" value={selectedRun.runId} />
                  <RunMeta label="실행 방식" value={selectedRun.executionSource} />
                  <RunMeta label="실행자" value={selectedRun.executorLabel} />
                  <RunMeta label="트리거" value={selectedRun.triggerLabel} />
                  <RunMeta label="시작 시각" value={selectedRun.startedAt} />
                  <RunMeta label="종료 시각" value={selectedRun.endedAt} />
                  <RunMeta label="재시도" value={selectedRun.retried ? '있음' : '없음'} />
                </div>
                <NodeTraceTable run={selectedRun} compact />
              </div>
            </div>
          ) : (
            <EmptyState text="선택한 실행 로그가 없습니다." />
          )}
        </aside>
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
        <StatusBadge status={run.status} />
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

function NodeTraceTable({
  run,
  compact = false,
}: {
  run: WorkflowRunHistoryEntry;
  compact?: boolean;
}) {
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
  const [selectedTraceId, setSelectedTraceId] = useState(rows[0]?.traceId ?? '');
  const selectedTrace = rows.find((row) => row.traceId === selectedTraceId) ?? rows[0] ?? null;

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className={compact ? 'min-w-[980px]' : 'min-w-[1320px]'}>
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
            const isSelected = row.traceId === selectedTrace?.traceId;

            return (
              <div
                key={row.traceId}
                className={cn(
                  'grid grid-cols-[140px_82px_210px_210px_130px_90px_80px_160px_72px_150px] gap-3 border-b border-slate-100 px-3 py-3 text-xs last:border-b-0',
                  isSelected && 'bg-blue-50/70',
                )}
              >
                <button
                  type="button"
                  className="truncate text-left font-black text-slate-950 transition hover:text-blue-700"
                  title={`${row.log.name} 트레이스 보기`}
                  onClick={() => setSelectedTraceId(row.traceId)}
                >
                  {row.log.name}
                </button>
                <StatusBadge status={isSuccess ? '성공' : '실패'} />
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
                  className={cn(
                    'truncate rounded-md px-2 py-1 text-left font-black transition',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-800',
                  )}
                  title={row.traceId}
                  onClick={() => setSelectedTraceId(row.traceId)}
                >
                  보기
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {selectedTrace && <TraceDetailPanel run={run} trace={selectedTrace} />}
    </div>
  );
}

function TraceDetailPanel({
  run,
  trace,
}: {
  run: WorkflowRunHistoryEntry;
  trace: NodeTraceRow;
}) {
  const isSuccess = trace.log.status === 'Success';
  const startedAt = run.startedAt;
  const endedAt = addSeconds(run.startedAt, trace.log.duration);
  const toolCalls = trace.log.typeLabel.includes('MCP')
    ? ['mcp.search', 'mcp.fetch_result']
    : trace.log.typeLabel.includes('GitHub')
      ? ['github.get_pull_request', 'github.create_review_comment']
      : trace.log.typeLabel.includes('AI Agent') || trace.log.typeLabel.includes('LLM')
        ? ['llm.chat.completions', 'output.schema_validate']
        : ['workflow.dispatch'];
  const ragRefs =
    trace.log.typeLabel.includes('AI Agent') || trace.log.typeLabel.includes('LLM')
      ? ['프로젝트 회의록 및 결정사항', '코드스타일 리뷰 가이드']
      : [];

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-col gap-3 border-b border-blue-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-black text-slate-950">노드 실행 트레이스</h4>
            <StatusBadge status={isSuccess ? '성공' : '실패'} />
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            한 번의 실행 안에서 이 노드가 받은 입력, 호출한 모델/도구, 만든 출력과 오류를 추적합니다.
          </p>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
          <span className="block font-black text-slate-400">trace id</span>
          <strong className="mt-1 block font-mono text-blue-700">{trace.traceId}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <TraceMetric label="실행 ID" value={run.runId} />
        <TraceMetric label="노드" value={trace.log.name} />
        <TraceMetric label="시작/종료" value={`${startedAt} -> ${endedAt}`} />
        <TraceMetric label="토큰/비용" value={`${trace.tokens.toLocaleString('ko-KR')} · $${trace.costUsd.toFixed(4)}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TraceTextBlock
          title="입력"
          eyebrow="input summary"
          body={`${trace.inputSummary}\n\n이전 노드 결과, 워크플로우 설정, 실행 주체(${run.executorLabel}) 정보를 포함합니다.`}
        />
        <TraceTextBlock
          title="출력"
          eyebrow="output summary"
          body={`${trace.outputSummary}\n\n후속 노드로 전달 가능한 요약 payload를 생성합니다.`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
        <TraceListBlock title="도구 호출" items={toolCalls} emptyText="도구 호출 없음" />
        <TraceListBlock title="RAG 참조" items={ragRefs} emptyText="참조 문서 없음" />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <span className="block text-xs font-black text-slate-400">실행 설정</span>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <span>모델: <b className="text-slate-950">{trace.model}</b></span>
            <span>재시도: <b className="text-slate-950">{trace.retried ? '있음' : '없음'}</b></span>
            <span>소요 시간: <b className="text-slate-950">{formatDuration(trace.log.duration)}</b></span>
            <span>raw ref: <b className="font-mono text-blue-700">payload://{trace.traceId}</b></span>
          </div>
        </div>
      </div>

      {!isSuccess && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong className="block font-black">오류 메시지</strong>
          <span className="mt-1 block">{trace.log.message ?? '외부 도구 응답 실패'}</span>
        </div>
      )}
    </section>
  );
}

function TraceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="block text-xs font-black text-slate-400">{label}</span>
      <strong className="mt-2 block break-words text-sm font-black text-slate-950">{value}</strong>
    </div>
  );
}

function TraceTextBlock({
  title,
  eyebrow,
  body,
}: {
  title: string;
  eyebrow: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <span className="block text-xs font-black uppercase text-slate-400">{eyebrow}</span>
      <strong className="mt-1 block text-sm font-black text-slate-950">{title}</strong>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function TraceListBlock({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <strong className="text-sm font-black text-slate-950">{title}</strong>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span key={item} className="rounded-md bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{emptyText}</span>
        )}
      </div>
    </article>
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
      <StatusBadge status={isSuccess ? '성공' : '실패'} />
    </article>
  );
}

function StatusBadge({ status }: { status: '성공' | '실패' }) {
  const isSuccess = status === '성공';

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-black leading-none',
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isSuccess ? 'bg-emerald-500' : 'bg-red-500',
        )}
      />
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
