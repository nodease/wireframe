import type { CanvasEdge, CanvasNode, FailureQueueItem } from './types';

export type FailureQueueInput = {
  workflowId: number | null;
  workflowName: string;
  node?: CanvasNode | null;
  reason: string;
  isTeamTarget: boolean;
  teamName?: string;
  teamSlackChannel?: string;
};

// 캔버스 그래프를 시작 노드 기준 실행 stage로 변환합니다.
// 같은 stage 안의 노드들은 병렬 실행 애니메이션에 사용할 수 있습니다.
export const buildWorkflowRunStages = (
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  startNode: CanvasNode,
) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const stages: CanvasNode[][] = [];
  const visited = new Set<number>([startNode.id]);
  let currentStage = [startNode];

  while (currentStage.length > 0) {
    stages.push(currentStage);

    const nextStage = currentStage
      .flatMap((node) =>
        edges
          .filter((edge) => edge.fromNodeId === node.id)
          .map((edge) => nodeById.get(edge.toNodeId))
          .filter((node): node is CanvasNode => Boolean(node)),
      )
      .filter((node) => {
        if (visited.has(node.id)) {
          return false;
        }

        visited.add(node.id);
        return true;
      })
      .sort((firstNode, secondNode) => firstNode.y - secondNode.y);

    currentStage = nextStage;
  }

  return stages;
};

export const createWorkflowFailureQueueItem = ({
  workflowId,
  workflowName,
  node,
  reason,
  isTeamTarget,
  teamName,
  teamSlackChannel,
}: FailureQueueInput): FailureQueueItem => {
  const now = Date.now();
  const notifyEveryMinutes = isTeamTarget ? 10 : 15;

  return {
    id: now + Math.floor(Math.random() * 1000),
    workflowId,
    workflowName,
    nodeId: node?.id ?? null,
    nodeName: node?.label ?? '워크플로우 검증',
    reason,
    recipientType: isTeamTarget ? 'team' : 'owner',
    recipients: isTeamTarget
      ? [
          `${teamName ?? 'Automation Team'} Slack ${teamSlackChannel ?? '#workflow-alerts'}`,
          '계정주 이메일 owner@nodease.ai',
        ]
      : ['김민지 owner@nodease.ai'],
    notifyEveryMinutes,
    notificationAttempts: 0,
    createdAt: now,
    nextNotifyAt: now + notifyEveryMinutes * 60 * 1000,
    status: 'queued',
  };
};
