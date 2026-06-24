import type { LucideIcon } from 'lucide-react';

export type View =
  | 'landing'
  | 'login'
  | 'signup'
  | 'home'
  | 'workflowList'
  | 'workflowBuilder'
  | 'knowledge'
  | 'marketplace'
  | 'account'
  | 'analytics'
  | 'runReport'
  | 'usage';

export type CanvasNode = {
  id: number;
  label: string;
  description: string;
  typeLabel: string;
  nodeRole?: 'trigger' | 'action' | 'agent' | 'tool';
  icon: LucideIcon;
  x: number;
  y: number;
  isExpanded: boolean;
  config?: {
    notionPrompt?: string;
    notionPromptExecuted?: boolean;
    notionProjectKeyword?: string;
    notionDatabaseId?: string;
    mcpTransport?: string;
    mcpEndpoint?: string;
    mcpAuth?: string;
    selectedTool?: string;
    agentModel?: string;
    agentPrompt?: string;
    agentRagDocumentIds?: string[];
    agentOutputFormat?: string;
  };
};

export type StoredCanvasNode = Omit<CanvasNode, 'icon'>;

export type HandlePosition = 'top' | 'bottom' | 'tools';

export type CanvasEdge = {
  id: number;
  fromNodeId: number;
  fromHandle: HandlePosition;
  toNodeId: number;
  toHandle: HandlePosition;
};

export type PendingConnection = {
  nodeId: number;
  handle: HandlePosition;
};

export type DragConnection = PendingConnection & {
  x: number;
  y: number;
};

export type WorkflowRecord = {
  id: number;
  name: string;
  description?: string;
  nodes: StoredCanvasNode[];
  edges: CanvasEdge[];
  isActive?: boolean;
  isTeamShared?: boolean;
  teamId?: string | null;
  updatedAt: number;
};

export type ExecutionLog = {
  nodeId: number;
  name: string;
  typeLabel: string;
  description?: string;
  status: 'Success' | 'Running' | 'Blocked' | 'Failed';
  duration: number;
  credits: number;
  message?: string;
};

export type FailureQueueItem = {
  id: number;
  workflowId: number | null;
  workflowName: string;
  nodeId: number | null;
  nodeName: string;
  reason: string;
  recipientType: 'owner' | 'team';
  recipients: string[];
  notifyEveryMinutes: number;
  notificationAttempts: number;
  createdAt: number;
  nextNotifyAt: number;
  lastNotifiedAt?: number;
  status: 'queued' | 'notified' | 'resolved';
};

export type WorkflowAnalytics = {
  id: number;
  name: string;
  executions: number;
  successRate: number;
  avgDuration: number;
  credits: number;
  savedMinutes: number;
  nodeCount: number;
  edgeCount: number;
  errorCount: number;
  lastRun: string;
  topMetric: string;
};

export type AnalyticsSummary = {
  executions: number;
  credits: number;
  savedMinutes: number;
  errors: number;
  successRate: number;
  avgSuccessRate: number;
  savedHours: number;
};
