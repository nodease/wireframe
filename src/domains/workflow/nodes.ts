import {
  Bot,
  Brain,
  Clock,
  Code2,
  DatabaseZap,
  FileCheck2,
  FileSpreadsheet,
  Github,
  GitBranch,
  Inbox,
  Mail,
  Radio,
  Rows3,
  Send,
  ShieldCheck,
  Split,
  SquarePen,
  type LucideIcon,
} from 'lucide-react';
import type { CanvasNode, ExecutionLog, StoredCanvasNode } from './types';

export type WorkflowNodeType = {
  label: string;
  description: string;
  icon: LucideIcon;
};

export const nodeTypes: WorkflowNodeType[] = [
  {
    label: 'Time Trigger',
    description: '정해진 시간에 실행되는 시작 트리거',
    icon: Clock,
  },
  {
    label: 'Webhook Trigger',
    description: '외부 이벤트나 PR 요청으로 워크플로우 시작',
    icon: Radio,
  },
  {
    label: 'LLM',
    description: '프롬프트 기반 응답 생성',
    icon: Brain,
  },
  {
    label: 'AI Agent',
    description: '도구를 사용해 작업을 자율 수행',
    icon: Bot,
  },
  {
    label: 'Notion MCP',
    description: 'Notion 워크스페이스 검색과 데이터베이스 연동',
    icon: DatabaseZap,
  },
  {
    label: 'Notion Tool',
    description: 'search pages, fetch page, query database 실행',
    icon: DatabaseZap,
  },
  {
    label: 'Slack MCP',
    description: 'Slack 채널 조회 및 메시지 작업',
    icon: Send,
  },
  {
    label: 'Gmail Reader',
    description: '메일 내용을 읽고 후속 작업 생성',
    icon: Inbox,
  },
  {
    label: 'Gmail Sender',
    description: '작성된 결과를 Gmail로 전송',
    icon: Mail,
  },
  {
    label: 'Google Sheets Read',
    description: '스프레드시트 행과 범위를 읽기',
    icon: FileSpreadsheet,
  },
  {
    label: 'Google Sheets Write',
    description: '새 행 또는 값을 시트에 쓰기',
    icon: Rows3,
  },
  {
    label: 'Google Sheets Update',
    description: '기존 셀, 행, 범위를 수정하기',
    icon: SquarePen,
  },
  {
    label: 'Guardrails',
    description: '입출력 정책 검사 및 차단',
    icon: ShieldCheck,
  },
  {
    label: 'Merge',
    description: '여러 Agent 결과 스트림을 하나로 병합',
    icon: GitBranch,
  },
  {
    label: 'Output',
    description: '최종 결과를 모아서 사용자에게 반환',
    icon: Split,
  },
  {
    label: '조건 분기',
    description: '조건에 따라 다음 단계 선택',
    icon: GitBranch,
  },
  {
    label: '코드 실행',
    description: '사용자 정의 로직 처리',
    icon: Code2,
  },
  {
    label: 'Python Code',
    description: 'Python 스크립트로 데이터 변환과 커스텀 로직 실행',
    icon: Code2,
  },
  {
    label: '문서 검증',
    description: '파일 내용의 형식과 누락 항목 확인',
    icon: FileCheck2,
  },
  {
    label: '메일 발송',
    description: '결과를 이메일로 전달',
    icon: Mail,
  },
  {
    label: 'Slack 전송',
    description: '채널 또는 사용자에게 메시지 전송',
    icon: Send,
  },
  {
    label: '응답',
    description: '최종 결과 반환',
    icon: Split,
  },
  {
    label: 'GitHub PR',
    description: 'PR 코멘트 작성 또는 리뷰 요청 생성',
    icon: Github,
  },
];

const mcpToolLabels = new Set(['Notion MCP', 'Notion Tool', 'Slack MCP']);

export const getNodeType = (typeLabel: string) =>
  nodeTypes.find((nodeType) => nodeType.label === typeLabel) ?? nodeTypes[0];

export const getNodeRole = (typeLabel: string): CanvasNode['nodeRole'] => {
  if (typeLabel === 'AI Agent') {
    return 'agent';
  }

  if (mcpToolLabels.has(typeLabel)) {
    return 'tool';
  }

  if (typeLabel === 'Time Trigger' || typeLabel === 'Webhook Trigger') {
    return 'trigger';
  }

  return 'action';
};

export const hydrateNode = (node: StoredCanvasNode): CanvasNode => ({
  ...node,
  nodeRole: node.nodeRole ?? getNodeRole(node.typeLabel),
  icon: getNodeType(node.typeLabel).icon,
});

export const serializeNode = (node: CanvasNode): StoredCanvasNode => ({
  id: node.id,
  label: node.label,
  description: node.description,
  typeLabel: node.typeLabel,
  nodeRole: node.nodeRole,
  x: node.x,
  y: node.y,
  isExpanded: node.isExpanded,
  config: node.config,
});

export const getNodeRunProfile = (
  node: CanvasNode,
): Pick<ExecutionLog, 'duration' | 'credits'> => {
  const profiles: Record<string, { duration: number; credits: number }> = {
    'Time Trigger': { duration: 0.12, credits: 0 },
    'Webhook Trigger': { duration: 0.16, credits: 0 },
    'Manual Trigger': { duration: 0.12, credits: 0 },
    'Notion MCP': { duration: 1.18, credits: 1 },
    'Notion Tool': { duration: 1.44, credits: 2 },
    'Gmail Sender': { duration: 1.06, credits: 1 },
    'Google Sheets Read': { duration: 0.88, credits: 1 },
    'Google Sheets Write': { duration: 1.12, credits: 1 },
    'Google Sheets Update': { duration: 1.24, credits: 1 },
    Guardrails: { duration: 0.46, credits: 1 },
    'AI Agent': { duration: 2.38, credits: 3 },
    Merge: { duration: 0.64, credits: 1 },
    Output: { duration: 0.31, credits: 0 },
    LLM: { duration: 2.01, credits: 2 },
    'GitHub PR': { duration: 1.16, credits: 1 },
    'Python Code': { duration: 1.32, credits: 1 },
  };

  return profiles[node.typeLabel] ?? { duration: 0.92, credits: 1 };
};
