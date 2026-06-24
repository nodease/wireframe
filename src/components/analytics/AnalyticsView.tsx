import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { cn } from '@/src/lib/utils';
import type {
  AnalyticsSummary,
  WorkflowAnalytics,
} from '../../domains/workflow/types';

type AnalyticsViewProps = {
  summary: AnalyticsSummary;
  workflows: WorkflowAnalytics[];
  selectedWorkflow: WorkflowAnalytics | null;
  onShowAll: () => void;
  onSelectWorkflow: (workflowId: number) => void;
};

type TrendPoint = {
  day: string;
  credits: number;
  duration: number;
  successRate: number;
};

const buildTrendPoints = (
  summary: AnalyticsSummary,
  workflows: WorkflowAnalytics[],
): TrendPoint[] => {
  const labels = ['6/17', '6/18', '6/19', '6/20', '6/21', '6/22', '6/23'];
  const workflowWeight = Math.max(1, workflows.length);
  const baseCredits = Math.max(12, Math.round(summary.credits / 7));
  const baseDuration =
    workflows.length === 0
      ? 4.2
      : workflows.reduce((total, workflow) => total + workflow.avgDuration, 0) /
        workflows.length;
  const baseSuccessRate = summary.avgSuccessRate || 96;

  return labels.map((day, index) => {
    const spread = index - 3;

    return {
      day,
      credits: Math.max(4, baseCredits + spread * workflowWeight + (index % 2) * 6),
      duration: Number(
        Math.max(1.2, baseDuration + spread * 0.18 + (index % 3) * 0.32).toFixed(1),
      ),
      successRate: Math.min(100, Math.max(82, baseSuccessRate - 3 + (index % 4) * 2)),
    };
  });
};

export function AnalyticsView({
  summary,
  workflows,
  onShowAll,
  onSelectWorkflow,
}: AnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows'>('overview');
  const [workflowSearch, setWorkflowSearch] = useState('');
  const filteredWorkflows = useMemo(() => {
    const keyword = workflowSearch.trim().toLowerCase();

    if (!keyword) {
      return workflows;
    }

    return workflows.filter((workflow) =>
      `${workflow.name} ${workflow.topMetric}`.toLowerCase().includes(keyword),
    );
  }, [workflowSearch, workflows]);
  const trendPoints = useMemo(
    () => buildTrendPoints(summary, workflows),
    [summary, workflows],
  );
  const maxCredits = Math.max(1, ...trendPoints.map((point) => point.credits));
  const maxDuration = Math.max(1, ...trendPoints.map((point) => point.duration));
  const totalFailureCount = workflows.reduce(
    (total, workflow) => total + workflow.errorCount,
    0,
  );
  const avgDuration =
    workflows.length === 0
      ? 0
      : Number(
          (
            workflows.reduce((total, workflow) => total + workflow.avgDuration, 0) /
            workflows.length
          ).toFixed(1),
        );

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">보고</h2>
        <p className="mt-2 text-sm text-slate-500">
          전체 워크플로우 운영 지표와 워크플로우별 상세 보고를 확인합니다.
        </p>
      </div>

      <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          className={cn(
            'rounded-md px-4 py-2 text-sm font-semibold text-slate-500 transition-colors',
            activeTab === 'overview' && 'bg-slate-950 text-white',
          )}
          onClick={() => {
            setActiveTab('overview');
            onShowAll();
          }}
        >
          전체 통계
        </button>
        <button
          type="button"
          className={cn(
            'rounded-md px-4 py-2 text-sm font-semibold text-slate-500 transition-colors',
            activeTab === 'workflows' && 'bg-slate-950 text-white',
          )}
          onClick={() => setActiveTab('workflows')}
        >
          워크플로우 목록
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="총 실행 횟수"
              value={`${summary.executions}회`}
              description="사용자가 다루는 전체 워크플로우 누적 실행"
            />
            <MetricCard
              label="평균 성공률"
              value={`${summary.avgSuccessRate}%`}
              description="전체 워크플로우 정상 완료 비율"
            />
            <MetricCard
              label="평균 실행 시간"
              value={`${avgDuration}s`}
              description="워크플로우별 평균 실행 시간의 평균"
            />
            <MetricCard
              label="사용 크레딧"
              value={String(summary.credits)}
              description="LLM/MCP 호출 기반 사용량 예시"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TrendCard title="일자별 크레딧 사용량" description="최근 7일간 전체 워크플로우 크레딧 소모 추이입니다.">
              <div className="flex h-64 items-end gap-3">
                {trendPoints.map((point) => (
                  <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-end justify-center rounded-md bg-slate-50 px-1">
                      <i
                        className="block w-full max-w-8 rounded-t-md bg-slate-950"
                        style={{ height: `${Math.max(12, (point.credits / maxCredits) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{point.day}</span>
                    <b className="text-xs text-slate-950">{point.credits}</b>
                  </div>
                ))}
              </div>
            </TrendCard>

            <TrendCard title="일자별 실행 시간" description="실행 시간이 길어지는 날을 빠르게 확인합니다.">
              <HorizontalBars
                points={trendPoints.map((point) => ({
                  label: point.day,
                  value: `${point.duration}s`,
                  width: Math.max(8, (point.duration / maxDuration) * 100),
                }))}
              />
            </TrendCard>

            <TrendCard title="일자별 성공률" description="실패 큐 증가나 외부 도구 장애를 감지하는 지표입니다.">
              <HorizontalBars
                points={trendPoints.map((point) => ({
                  label: point.day,
                  value: `${point.successRate}%`,
                  width: point.successRate,
                }))}
              />
            </TrendCard>

            <TrendCard title="운영 상태" description="전체 워크플로우 기준으로 즉시 확인해야 할 항목입니다.">
              <div className="space-y-3">
                {[
                  ['실패 큐', `${totalFailureCount}건`, totalFailureCount > 0 ? '점검' : '정상'],
                  ['예상 절감 시간', `${summary.savedHours}시간`, '누적'],
                  ['관리 워크플로우', `${workflows.length}개`, '활성'],
                ].map(([title, value, status]) => (
                  <article
                    key={title}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <strong className="block text-sm font-semibold text-slate-950">
                        {title}
                      </strong>
                      <span className="text-sm text-slate-500">{value}</span>
                    </div>
                    <Badge variant={status === '점검' ? 'warning' : 'secondary'}>
                      {status}
                    </Badge>
                  </article>
                ))}
              </div>
            </TrendCard>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950">워크플로우 목록</h3>
              <p className="mt-1 text-sm text-slate-500">
                원하는 워크플로우를 검색하고 클릭하면 상세 보고 페이지로 이동합니다.
              </p>
            </div>
            <label className="w-full max-w-sm space-y-2">
              <span className="text-xs font-semibold text-slate-500">
                워크플로우 검색
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={workflowSearch}
                  onChange={(event) => setWorkflowSearch(event.target.value)}
                  placeholder="워크플로우 이름 또는 지표 검색"
                />
              </div>
            </label>
          </CardHeader>

          <CardContent className="space-y-3">
            {filteredWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50"
                onClick={() => onSelectWorkflow(workflow.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="block text-base font-semibold text-slate-950">
                      {workflow.name}
                    </strong>
                    <span className="mt-1 block text-sm text-slate-500">
                      노드 {workflow.nodeCount}개 · 연결 {workflow.edgeCount}개 · 마지막
                      실행 {workflow.lastRun}
                    </span>
                  </div>
                  <Badge variant={workflow.successRate < 90 ? 'warning' : 'success'}>
                    {workflow.successRate}%
                  </Badge>
                </div>
                <span className="mt-3 block text-sm text-slate-500">
                  실행 {workflow.executions}회 · 평균 {workflow.avgDuration}s · 오류{' '}
                  {workflow.errorCount}건 · 크레딧 {workflow.credits} · {workflow.topMetric}
                </span>
              </button>
            ))}
            {filteredWorkflows.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <strong className="block text-sm font-semibold text-slate-950">
                  검색 결과가 없습니다
                </strong>
                <span className="mt-1 block text-sm text-slate-500">
                  다른 워크플로우 이름이나 지표로 검색해 보세요.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-36 flex-col justify-between p-5">
        <span className="text-sm text-slate-500">{label}</span>
        <strong className="mt-3 text-3xl font-semibold text-slate-950">{value}</strong>
        <small className="mt-3 text-xs leading-5 text-slate-400">{description}</small>
      </CardContent>
    </Card>
  );
}

function TrendCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function HorizontalBars({
  points,
}: {
  points: Array<{ label: string; value: string; width: number }>;
}) {
  return (
    <div className="space-y-4">
      {points.map((point) => (
        <div key={point.label} className="grid grid-cols-[48px_1fr_56px] items-center gap-3">
          <span className="text-xs text-slate-500">{point.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <i
              className="block h-full rounded-full bg-slate-950"
              style={{ width: `${point.width}%` }}
            />
          </div>
          <b className="text-right text-xs text-slate-950">{point.value}</b>
        </div>
      ))}
    </div>
  );
}
