import type {
  ExecutionLog,
  FailureQueueItem,
  WorkflowRecord,
} from '@/src/domains/workflow/types';

export const workflowStorageKey = 'nodease.workflows.v1';
export const runReportStorageKey = 'nodease.lastRunReport.v1';

// 시연 기본 상태에서는 실패 큐를 비워둡니다.
// 실패 시연이 필요하면 이 배열에 FailureQueueItem을 추가하면 됩니다.
export const demoFailureQueue: FailureQueueItem[] = [];

const getDemoNodeRunProfile = (
  node: WorkflowRecord['nodes'][number],
  index: number,
  workflow: WorkflowRecord,
): Pick<ExecutionLog, 'status' | 'duration' | 'credits' | 'message'> => {
  const isFailureDemo =
    workflow.name.includes('미확인 메일') ||
    workflow.name.includes('일정 정리');
  const shouldFail =
    isFailureDemo &&
    (node.typeLabel.includes('Slack') ||
      node.typeLabel.includes('Notion') ||
      node.label.includes('Slack') ||
      node.label.includes('Notion'));
  const durationByType =
    node.typeLabel.includes('AI Agent')
      ? 2.6
      : node.typeLabel.includes('LLM')
        ? 2.1
        : node.typeLabel.includes('GitHub')
          ? 1.4
          : node.typeLabel.includes('Slack') || node.typeLabel.includes('Notion')
            ? 1.2
            : 0.6;
  const creditsByType =
    node.typeLabel.includes('AI Agent')
      ? 3
      : node.typeLabel.includes('LLM')
        ? 2
        : node.typeLabel.includes('GitHub') ||
            node.typeLabel.includes('Slack') ||
            node.typeLabel.includes('Notion')
          ? 1
          : 0;

  if (!workflow.isActive) {
    return {
      status: 'Blocked',
      duration: 0,
      credits: 0,
      message: '워크플로우가 비활성화되어 실행되지 않았습니다.',
    };
  }

  if (shouldFail) {
    return {
      status: 'Failed',
      duration: Number((durationByType + index * 0.18).toFixed(2)),
      credits: Math.max(1, creditsByType),
      message: node.typeLabel.includes('Slack')
        ? 'Slack sender 권한이 만료되어 메시지를 전송하지 못했습니다.'
        : 'Notion 데이터베이스 ID가 비어 있어 조회를 완료하지 못했습니다.',
    };
  }

  return {
    status: 'Success',
    duration: Number((durationByType + index * 0.24).toFixed(2)),
    credits: creditsByType,
  };
};

export const createDemoExecutionLogsForWorkflow = (
  workflow: WorkflowRecord | null | undefined,
): ExecutionLog[] => {
  if (!workflow) {
    return [];
  }

  return workflow.nodes.map((node, index) => {
    const profile = getDemoNodeRunProfile(node, index, workflow);

    return {
      nodeId: node.id,
      name: node.label,
      typeLabel: node.typeLabel,
      description: node.description,
      ...profile,
    };
  });
};

export const createFailureDemoWorkflowRecord = (
  workflowId = 2026062303,
): WorkflowRecord => {
  const baseId = workflowId * 10;

  return {
    id: workflowId,
    name: 'Gmail 미확인 메일 요약 워크플로우',
    description: '안읽은 메일을 요약해 Slack으로 전송하지만 현재 Slack 권한 문제로 실패 큐가 쌓입니다.',
    nodes: [
      {
        id: baseId,
        label: 'Gmail Reader',
        description: '안읽은 메일을 가져옵니다',
        typeLabel: 'Gmail Reader',
        nodeRole: 'trigger',
        x: 180,
        y: 220,
        isExpanded: false,
      },
      {
        id: baseId + 1,
        label: 'LLM: 요약',
        description: '메일 내용을 핵심 요약으로 정리합니다',
        typeLabel: 'LLM',
        nodeRole: 'agent',
        x: 520,
        y: 220,
        isExpanded: false,
      },
      {
        id: baseId + 2,
        label: 'Slack Sender',
        description: '요약 결과를 Slack 채널로 전송합니다',
        typeLabel: 'Slack MCP',
        nodeRole: 'action',
        x: 860,
        y: 220,
        isExpanded: false,
      },
    ],
    edges: [
      {
        id: baseId + 10,
        fromNodeId: baseId,
        fromHandle: 'bottom',
        toNodeId: baseId + 1,
        toHandle: 'top',
      },
      {
        id: baseId + 11,
        fromNodeId: baseId + 1,
        fromHandle: 'bottom',
        toNodeId: baseId + 2,
        toHandle: 'top',
      },
    ],
    isActive: true,
    isTeamShared: true,
    teamId: null,
    updatedAt: Date.now() - 1000 * 60 * 42,
  };
};

export const createNotionFailureDemoWorkflowRecord = (
  workflowId = 2026062305,
): WorkflowRecord => {
  const baseId = workflowId * 10;

  return {
    id: workflowId,
    name: 'Notion 프로젝트 일정 정리 워크플로우',
    description: '회의록에서 결정사항과 일정을 정리하지만 현재 Notion DB 설정 누락으로 실패 큐가 쌓입니다.',
    nodes: [
      {
        id: baseId,
        label: 'Time Trigger',
        description: '매일 오전 10시에 회의록 정리를 시작합니다',
        typeLabel: 'Time Trigger',
        nodeRole: 'trigger',
        x: 180,
        y: 220,
        isExpanded: false,
      },
      {
        id: baseId + 1,
        label: 'Notion MCP',
        description: '관련 프로젝트 문서와 일정 DB를 조회합니다',
        typeLabel: 'Notion MCP',
        nodeRole: 'tool',
        x: 520,
        y: 220,
        isExpanded: false,
      },
      {
        id: baseId + 2,
        label: 'AI Agent: 후속 작업 정리',
        description: '결정사항, 담당자별 할 일, 일정 후보, 리스크를 요약합니다',
        typeLabel: 'AI Agent',
        nodeRole: 'agent',
        x: 860,
        y: 220,
        isExpanded: false,
      },
    ],
    edges: [
      {
        id: baseId + 10,
        fromNodeId: baseId,
        fromHandle: 'bottom',
        toNodeId: baseId + 1,
        toHandle: 'top',
      },
      {
        id: baseId + 11,
        fromNodeId: baseId + 1,
        fromHandle: 'bottom',
        toNodeId: baseId + 2,
        toHandle: 'top',
      },
    ],
    isActive: true,
    isTeamShared: false,
    teamId: null,
    updatedAt: Date.now() - 1000 * 60 * 26,
  };
};

export const createInactiveDemoWorkflowRecord = (
  workflowId = 2026062302,
): WorkflowRecord => {
  const baseId = workflowId * 10;

  return {
    id: workflowId,
    name: '월간 리포트 아카이브 워크플로우',
    description: '월간 운영 리포트를 Notion에 정리하는 보류 상태의 자동화입니다.',
    nodes: [
      {
        id: baseId,
        label: 'Time Trigger',
        description: '매월 1일 오전 9시에 실행됩니다',
        typeLabel: 'Time Trigger',
        nodeRole: 'trigger',
        x: 180,
        y: 220,
        isExpanded: false,
      },
      {
        id: baseId + 1,
        label: 'Notion MCP',
        description: '월간 리포트 데이터베이스에 페이지를 생성합니다',
        typeLabel: 'Notion MCP',
        nodeRole: 'tool',
        x: 520,
        y: 220,
        isExpanded: false,
      },
    ],
    edges: [
      {
        id: baseId + 10,
        fromNodeId: baseId,
        fromHandle: 'bottom',
        toNodeId: baseId + 1,
        toHandle: 'top',
      },
    ],
    isActive: false,
    isTeamShared: false,
    teamId: null,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  };
};

export const createGithubPrReviewWorkflowRecord = (
  workflowId = Date.now() + 1000,
): WorkflowRecord => {
  const now = Date.now();
  const baseId = workflowId * 10;
  const nodes: WorkflowRecord['nodes'] = [
    {
      id: baseId,
      label: 'Webhook Trigger: PR 요청 수신',
      description: 'GitHub PR request 이벤트를 받아 리뷰 워크플로우를 시작합니다',
      typeLabel: 'Webhook Trigger',
      nodeRole: 'trigger',
      x: 180,
      y: 280,
      isExpanded: false,
    },
    {
      id: baseId + 1,
      label: '보안 AI Agent',
      description: '취약점, 비밀정보, 권한 문제를 중심으로 PR을 검토합니다',
      typeLabel: 'AI Agent',
      nodeRole: 'agent',
      x: 520,
      y: 120,
      isExpanded: false,
    },
    {
      id: baseId + 2,
      label: '성능 AI Agent',
      description: '병목, 불필요한 연산, 확장성 문제를 중심으로 PR을 검토합니다',
      typeLabel: 'AI Agent',
      nodeRole: 'agent',
      x: 520,
      y: 280,
      isExpanded: false,
    },
    {
      id: baseId + 3,
      label: '코드스타일 AI Agent',
      description: '일관성, 네이밍, 유지보수성을 중심으로 PR을 검토합니다',
      typeLabel: 'AI Agent',
      nodeRole: 'agent',
      x: 520,
      y: 440,
      isExpanded: false,
      config: {
        agentRagDocumentIds: ['kb-code-style-guide'],
        agentPrompt:
          '코드 스타일 가이드를 기준으로 네이밍, 구조, 일관성, 가독성 문제를 검토합니다.',
      },
    },
    {
      id: baseId + 4,
      label: 'PM AI Agent: PR 메시지 정리',
      description: '3개의 리뷰 결과를 받아 PR 코멘트 메시지로 정리합니다',
      typeLabel: 'AI Agent',
      nodeRole: 'agent',
      x: 900,
      y: 280,
      isExpanded: false,
    },
    {
      id: baseId + 5,
      label: 'GitHub PR: 리뷰 코멘트 작성',
      description: '정리된 리뷰 메시지를 GitHub PR에 작성합니다',
      typeLabel: 'GitHub PR',
      nodeRole: 'action',
      x: 1260,
      y: 280,
      isExpanded: false,
    },
  ];

  return {
    id: workflowId,
    name: 'GitHub PR Review Workflow',
    description:
      'GitHub PR 요청을 받아 보안, 성능, 코드스타일 리뷰를 병렬 수행하고 PM Agent가 PR 메시지를 정리하는 워크플로우',
    nodes,
    edges: [
      { id: baseId + 10, fromNodeId: baseId, fromHandle: 'bottom', toNodeId: baseId + 1, toHandle: 'top' },
      { id: baseId + 11, fromNodeId: baseId, fromHandle: 'bottom', toNodeId: baseId + 2, toHandle: 'top' },
      { id: baseId + 12, fromNodeId: baseId, fromHandle: 'bottom', toNodeId: baseId + 3, toHandle: 'top' },
      { id: baseId + 13, fromNodeId: baseId + 1, fromHandle: 'bottom', toNodeId: baseId + 4, toHandle: 'top' },
      { id: baseId + 14, fromNodeId: baseId + 2, fromHandle: 'bottom', toNodeId: baseId + 4, toHandle: 'top' },
      { id: baseId + 15, fromNodeId: baseId + 3, fromHandle: 'bottom', toNodeId: baseId + 4, toHandle: 'top' },
      { id: baseId + 16, fromNodeId: baseId + 4, fromHandle: 'bottom', toNodeId: baseId + 5, toHandle: 'top' },
    ],
    isActive: true,
    isTeamShared: false,
    teamId: null,
    updatedAt: now,
  };
};
