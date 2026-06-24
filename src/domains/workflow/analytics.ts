import type {
  AnalyticsSummary,
  WorkflowAnalytics,
  WorkflowRecord,
} from './types';

export const demoWorkflowAnalytics: WorkflowAnalytics[] = [
  {
    id: 1,
    name: '회의록 후속 작업 자동 정리',
    executions: 42,
    successRate: 96,
    avgDuration: 5.8,
    credits: 184,
    savedMinutes: 520,
    nodeCount: 6,
    edgeCount: 5,
    errorCount: 2,
    lastRun: '오늘 10:42',
    topMetric: '담당자별 할 일 추출 정확도 92%',
  },
  {
    id: 2,
    name: 'Notion 일정 후보 조회',
    executions: 31,
    successRate: 94,
    avgDuration: 3.4,
    credits: 88,
    savedMinutes: 260,
    nodeCount: 4,
    edgeCount: 3,
    errorCount: 2,
    lastRun: '어제 18:10',
    topMetric: '일정 후보 DB 조회 성공률 97%',
  },
  {
    id: 3,
    name: '리스크/결정사항 분류',
    executions: 24,
    successRate: 91,
    avgDuration: 4.6,
    credits: 112,
    savedMinutes: 310,
    nodeCount: 5,
    edgeCount: 4,
    errorCount: 3,
    lastRun: '2일 전',
    topMetric: '리스크 탐지 평균 3.1건',
  },
];

export function buildWorkflowAnalytics(
  workflows: WorkflowRecord[],
): WorkflowAnalytics[] {
  if (workflows.length === 0) {
    return demoWorkflowAnalytics;
  }

  return workflows.map((workflow, index) => {
    const nodeCount = workflow.nodes.length;
    const edgeCount = workflow.edges.length;
    const complexity = Math.max(1, nodeCount + edgeCount);
    const executions = Math.max(6, complexity * 5 + index * 4);
    const errorCount = 0;
    const successRate = 100;
    const avgDuration = Number(
      (1.2 + nodeCount * 0.42 + edgeCount * 0.24).toFixed(1),
    );
    const credits = Math.round(executions * Math.max(1, nodeCount) * 0.72);
    const savedMinutes =
      executions * Math.max(5, nodeCount * 3 + edgeCount * 2);

    return {
      id: workflow.id,
      name: workflow.name,
      executions,
      successRate,
      avgDuration,
      credits,
      savedMinutes,
      nodeCount,
      edgeCount,
      errorCount,
      lastRun: new Date(workflow.updatedAt).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
      topMetric:
        nodeCount >= 5
          ? '복합 자동화 경로 안정화 필요'
          : '단순 자동화 반복 실행 효율 높음',
    };
  });
}

export function summarizeAnalytics(
  workflows: WorkflowAnalytics[],
): AnalyticsSummary {
  const totals = workflows.reduce(
    (acc, workflow) => ({
      executions: acc.executions + workflow.executions,
      credits: acc.credits + workflow.credits,
      savedMinutes: acc.savedMinutes + workflow.savedMinutes,
      errors: acc.errors + workflow.errorCount,
      successRate: acc.successRate + workflow.successRate,
    }),
    { executions: 0, credits: 0, savedMinutes: 0, errors: 0, successRate: 0 },
  );

  return {
    ...totals,
    avgSuccessRate: Math.round(totals.successRate / workflows.length),
    savedHours: Math.round(totals.savedMinutes / 60),
  };
}
