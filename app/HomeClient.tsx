'use client';

import {
  BarChart3,
  BookOpen,
  Home,
  type LucideIcon,
  Search,
  ShoppingBag,
  UserCog,
  Workflow,
  X,
} from 'lucide-react';
import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  buildWorkflowRunStages,
  buildWorkflowAnalytics,
  createWorkflowFailureQueueItem,
  summarizeAnalytics,
} from '../src/domains/workflow';
import { currentUser, getTeamsForUser } from '../src/domains/account/data';
import {
  getNodeRole,
  getNodeRunProfile,
  hydrateNode,
  nodeTypes,
  serializeNode,
} from '../src/domains/workflow/nodes';
import { DashboardSidebar } from '../src/layers/dashboard/DashboardSidebar';
import { AnalyticsPage, UsagePage, WorkflowRunReportPage } from '../src/page';
import { AccountPage } from '../src/page/AccountPage';
import { AuthPage } from '../src/page/AuthPage';
import { HomeDashboardPage } from '../src/page/HomeDashboardPage';
import { KnowledgePage } from '../src/page/KnowledgePage';
import { LandingPage } from '../src/page/LandingPage';
import { MarketplacePage } from '../src/page/MarketplacePage';
import { WorkflowBuilderPage } from '../src/page/WorkflowBuilderPage';
import { WorkflowListPage } from '../src/page/WorkflowListPage';
import { Button, Input, Switch } from '../src/components/ui';
import { cn } from '../src/lib/utils';
import type { ChatResizeDirection } from '../src/components/builder/ChatWidget';
import type {
  CanvasEdge,
  CanvasNode,
  ExecutionLog,
  FailureQueueItem,
  HandlePosition,
  View,
  WorkflowRecord,
} from '../src/domains/workflow/types';
import {
  createFailureDemoWorkflowRecord,
  createGithubPrReviewWorkflowRecord,
  createInactiveDemoWorkflowRecord,
  createNotionFailureDemoWorkflowRecord,
  demoFailureQueue,
  runReportStorageKey,
  workflowStorageKey,
} from '../src/mocks/workflows';

const validViews = new Set<View>([
  'landing',
  'login',
  'signup',
  'home',
  'workflowList',
  'workflowBuilder',
  'knowledge',
  'marketplace',
  'account',
  'analytics',
  'runReport',
]);

const viewPathMap: Record<View, string> = {
  landing: '/',
  login: '/login',
  signup: '/signup',
  home: '/dashboard',
  workflowList: '/workflows',
  workflowBuilder: '/builder',
  knowledge: '/knowledge',
  marketplace: '/marketplace',
  account: '/account',
  analytics: '/reports',
  runReport: '/reports',
  usage: '/reports',
};

const pathViewMap = new Map<string, View>(
  Object.entries(viewPathMap).map(([view, path]) => [path, view as View]),
);

const getViewFromLocation = (): View => {
  if (typeof window === 'undefined') {
    return 'landing';
  }

  const queryView = new URLSearchParams(window.location.search).get(
    'view',
  ) as View | null;
  const hashView = window.location.hash.replace('#', '') as View;
  const pathView = pathViewMap.get(window.location.pathname);
  const requestedView = queryView || hashView || pathView;

  return validViews.has(requestedView) ? requestedView : 'landing';
};

const navigationItems: Array<{
  id: View;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'home', label: '홈화면', icon: Home },
  { id: 'workflowList', label: '워크플로우', icon: Workflow },
  { id: 'knowledge', label: '지식기반', icon: BookOpen },
  { id: 'marketplace', label: '마켓플레이스', icon: ShoppingBag },
  { id: 'runReport', label: '보고', icon: BarChart3 },
  { id: 'account', label: '계정관리', icon: UserCog },
];

export default function HomePage({
  initialView = 'landing',
  initialIsModalOpen = false,
}: {
  initialView?: string;
  initialIsModalOpen?: boolean;
}) {
  const [activeView, setActiveView] = useState<View>(() =>
    validViews.has(initialView as View)
      ? (initialView as View)
      : getViewFromLocation(),
  );
  const [isModalOpen, setIsModalOpen] = useState(initialIsModalOpen);
  const [isNodeSidebarOpen, setIsNodeSidebarOpen] = useState(true);
  const [nodeSearch, setNodeSearch] = useState('');
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [copiedNode, setCopiedNode] = useState<CanvasNode | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isWorkflowActive, setIsWorkflowActive] = useState(true);
  const [isWorkflowTeamShared, setIsWorkflowTeamShared] = useState(false);
  const userTeams = useMemo(() => getTeamsForUser(currentUser.id), []);
  const defaultWorkflowTeamId = userTeams[0]?.id ?? null;
  const [selectedWorkflowTeamId, setSelectedWorkflowTeamId] = useState<string | null>(
    defaultWorkflowTeamId,
  );
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(null);
  const [createdWorkflowName, setCreatedWorkflowName] = useState('');
  const [createdWorkflowDescription, setCreatedWorkflowDescription] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [hasLoadedStoredWorkflows, setHasLoadedStoredWorkflows] = useState(false);
  const [accountTab, setAccountTab] = useState<
    'profile' | 'security' | 'providers' | 'connections'
  >('profile');
  const [selectedAnalyticsWorkflowId, setSelectedAnalyticsWorkflowId] = useState<
    number | null
  >(null);
  const [reportReturnView, setReportReturnView] = useState<View>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 0, bottom: 0 });
  const [chatSize, setChatSize] = useState({ width: 360, height: 800 });
  const [runNotice, setRunNotice] = useState('');
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [runningNodeIds, setRunningNodeIds] = useState<number[]>([]);
  const [nodeRunStatuses, setNodeRunStatuses] = useState<
    Record<number, 'running' | 'success' | 'failed'>
  >({});
  const [failureQueue, setFailureQueue] = useState<FailureQueueItem[]>(
    demoFailureQueue,
  );
  const [draggingChat, setDraggingChat] = useState<{
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startBottom: number;
  } | null>(null);
  const [resizingChat, setResizingChat] = useState<{
    direction: ChatResizeDirection;
    startPointerX: number;
    startPointerY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startBottom: number;
  } | null>(null);
  const runAnimationTimers = useRef<number[]>([]);

  const title = useMemo(() => {
    if (activeView === 'workflowBuilder' && createdWorkflowName) {
      return createdWorkflowName;
    }

    if (activeView === 'runReport') {
      return '보고';
    }

    return (
      navigationItems.find((item) => item.id === activeView)?.label ?? '홈화면'
    );
  }, [activeView, createdWorkflowName]);

  const filteredNodeTypes = useMemo(() => {
    const keyword = nodeSearch.trim().toLowerCase();

    if (!keyword) {
      return nodeTypes;
    }

    return nodeTypes.filter((node) =>
      `${node.label} ${node.description}`.toLowerCase().includes(keyword),
    );
  }, [nodeSearch]);

  const recentWorkflows = useMemo(
    () =>
      [...workflows]
        .sort((first, second) => second.updatedAt - first.updatedAt)
        .slice(0, 5),
    [workflows],
  );

  const workflowAnalytics = useMemo(
    () => buildWorkflowAnalytics(workflows),
    [workflows],
  );

  const selectedAnalyticsWorkflow = useMemo(
    () =>
      selectedAnalyticsWorkflowId === null
        ? null
        : workflowAnalytics.find(
            (workflow) => workflow.id === selectedAnalyticsWorkflowId,
          ) ?? null,
    [selectedAnalyticsWorkflowId, workflowAnalytics],
  );

  const analyticsSummary = useMemo(
    () => summarizeAnalytics(workflowAnalytics),
    [workflowAnalytics],
  );
  const selectedWorkflowTeam =
    userTeams.find((team) => team.id === selectedWorkflowTeamId) ?? userTeams[0] ?? null;
  const isUserTeamId = (teamId?: string | null) =>
    Boolean(teamId && userTeams.some((team) => team.id === teamId));

  const openWorkflowModal = () => {
    setWorkflowName('');
    setWorkflowDescription('');
    setIsWorkflowTeamShared(false);
    setSelectedWorkflowTeamId(defaultWorkflowTeamId);
    setIsModalOpen(true);
  };

  const handleNavigation = (view: View) => {
    if (view === 'analytics' || view === 'runReport') {
      setSelectedAnalyticsWorkflowId(null);
    }

    if (view === 'analytics') {
      setActiveView('analytics');
      return;
    }

    if (view === 'runReport') {
      setReportReturnView(activeView);
    }

    setActiveView(view);
    if (typeof window !== 'undefined') {
      const nextUrl = viewPathMap[view] ?? `/?view=${view}`;
      window.history.pushState({ view }, '', nextUrl);
    }
  };

  const openWorkflowAnalytics = (workflowId: number) => {
    setSelectedAnalyticsWorkflowId(workflowId);
    setCurrentWorkflowId(workflowId);
    setReportReturnView(activeView);
    setActiveView('runReport');

    if (typeof window !== 'undefined') {
      window.history.pushState(
        { view: 'runReport', workflowId },
        '',
        `${viewPathMap.runReport}?workflowId=${workflowId}`,
      );
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      setActiveView(getViewFromLocation());
    };

    const handleDelegatedNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const navButton = target?.closest<HTMLElement>('[data-view]');
      const view = navButton?.dataset.view as View | undefined;

      if (!view) {
        return;
      }

      event.preventDefault();
      handleNavigation(view);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    document.addEventListener('click', handleDelegatedNavigation);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      document.removeEventListener('click', handleDelegatedNavigation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const shouldSeedGithubPrWorkflow =
      searchParams.get('seed') === 'github-pr-review';
    const storedWorkflows = window.localStorage.getItem(workflowStorageKey);
    let parsedWorkflows = storedWorkflows
      ? (JSON.parse(storedWorkflows) as WorkflowRecord[])
      : [];

    let seededWorkflow: WorkflowRecord | null = null;
    const inactiveDemoWorkflow = createInactiveDemoWorkflowRecord();
    const failureDemoWorkflow = createFailureDemoWorkflowRecord();
    const notionFailureDemoWorkflow = createNotionFailureDemoWorkflowRecord();

    if (parsedWorkflows.length === 0) {
      seededWorkflow = createGithubPrReviewWorkflowRecord();
      parsedWorkflows = [
        seededWorkflow,
        failureDemoWorkflow,
        notionFailureDemoWorkflow,
        inactiveDemoWorkflow,
      ];
      window.localStorage.setItem(workflowStorageKey, JSON.stringify(parsedWorkflows));
    }

    if (
      parsedWorkflows.length > 0 &&
      !parsedWorkflows.some((workflow) => workflow.id === inactiveDemoWorkflow.id)
    ) {
      parsedWorkflows = [...parsedWorkflows, inactiveDemoWorkflow];
      window.localStorage.setItem(workflowStorageKey, JSON.stringify(parsedWorkflows));
    }

    if (
      parsedWorkflows.length > 0 &&
      !parsedWorkflows.some((workflow) => workflow.id === failureDemoWorkflow.id)
    ) {
      parsedWorkflows = [failureDemoWorkflow, ...parsedWorkflows];
      window.localStorage.setItem(workflowStorageKey, JSON.stringify(parsedWorkflows));
    }

    if (
      parsedWorkflows.length > 0 &&
      !parsedWorkflows.some((workflow) => workflow.id === notionFailureDemoWorkflow.id)
    ) {
      parsedWorkflows = [notionFailureDemoWorkflow, ...parsedWorkflows];
      window.localStorage.setItem(workflowStorageKey, JSON.stringify(parsedWorkflows));
    }

    parsedWorkflows = parsedWorkflows.map((workflow) => ({
      ...workflow,
      nodes: workflow.nodes.map((node) =>
        node.label === '코드스타일 AI Agent'
          ? {
              ...node,
              config: {
                ...node.config,
                agentRagDocumentIds: Array.from(
                  new Set([
                    ...(node.config?.agentRagDocumentIds ?? []),
                    'kb-code-style-guide',
                  ]),
                ),
                agentPrompt:
                  node.config?.agentPrompt ??
                  '코드 스타일 가이드를 기준으로 네이밍, 구조, 일관성, 가독성 문제를 검토합니다.',
              },
            }
          : node,
      ),
    }));
    window.localStorage.setItem(workflowStorageKey, JSON.stringify(parsedWorkflows));

    if (shouldSeedGithubPrWorkflow) {
      seededWorkflow = createGithubPrReviewWorkflowRecord();
      parsedWorkflows = [
        seededWorkflow,
        ...parsedWorkflows.filter(
          (workflow) => workflow.name !== seededWorkflow?.name,
        ),
      ];
      window.localStorage.setItem(workflowStorageKey, JSON.stringify(parsedWorkflows));
      window.history.replaceState(
        { view: 'workflowBuilder', workflowId: seededWorkflow.id },
        '',
        `${viewPathMap.workflowBuilder}?workflowId=${seededWorkflow.id}`,
      );
      setActiveView('workflowBuilder');
    }

    const requestedWorkflowId = Number(
      seededWorkflow?.id ?? searchParams.get('workflowId'),
    );
    const workflowFromUrl = parsedWorkflows.find(
      (workflow) => workflow.id === requestedWorkflowId,
    );

    setWorkflows(parsedWorkflows);

    if ((activeView === 'workflowBuilder' || seededWorkflow) && workflowFromUrl) {
      setCreatedWorkflowName(workflowFromUrl.name);
      setCreatedWorkflowDescription(workflowFromUrl.description ?? '');
      setCurrentWorkflowId(workflowFromUrl.id);
      setCanvasNodes(workflowFromUrl.nodes.map(hydrateNode));
      setCanvasEdges(workflowFromUrl.edges);
      setSelectedNodeId(null);
      setCopiedNode(null);
      setIsWorkflowActive(workflowFromUrl.isActive !== false);
      setIsWorkflowTeamShared(
        Boolean(workflowFromUrl.isTeamShared && isUserTeamId(workflowFromUrl.teamId)),
      );
      setSelectedWorkflowTeamId(
        isUserTeamId(workflowFromUrl.teamId)
          ? workflowFromUrl.teamId ?? null
          : defaultWorkflowTeamId,
      );
    }

    if (activeView === 'analytics' && workflowFromUrl) {
      setSelectedAnalyticsWorkflowId(workflowFromUrl.id);
    }

    if (activeView === 'runReport') {
      if (workflowFromUrl) {
        setSelectedAnalyticsWorkflowId(workflowFromUrl.id);
        setCurrentWorkflowId(workflowFromUrl.id);
        setCreatedWorkflowName(workflowFromUrl.name);
        setCreatedWorkflowDescription(workflowFromUrl.description ?? '');
      }

      const storedRunReport = window.localStorage.getItem(runReportStorageKey);

      if (storedRunReport) {
        const parsedRunReport = JSON.parse(storedRunReport) as {
          workflowId: number | null;
          workflowName: string;
          executionLogs: ExecutionLog[];
        };
        const reportWorkflow = parsedWorkflows.find(
          (workflow) => workflow.id === parsedRunReport.workflowId,
        );

        if (!workflowFromUrl || workflowFromUrl.id === parsedRunReport.workflowId) {
          setExecutionLogs(parsedRunReport.executionLogs);
          setCurrentWorkflowId(parsedRunReport.workflowId);
          setSelectedAnalyticsWorkflowId(parsedRunReport.workflowId);
          setCreatedWorkflowName(reportWorkflow?.name ?? parsedRunReport.workflowName);
          setCreatedWorkflowDescription(reportWorkflow?.description ?? '');
        }

        if (!workflowFromUrl && reportWorkflow) {
          setCanvasNodes(reportWorkflow.nodes.map(hydrateNode));
          setCanvasEdges(reportWorkflow.edges);
          setIsWorkflowActive(reportWorkflow.isActive !== false);
          setIsWorkflowTeamShared(
            Boolean(reportWorkflow.isTeamShared && isUserTeamId(reportWorkflow.teamId)),
          );
          setSelectedWorkflowTeamId(
            isUserTeamId(reportWorkflow.teamId)
              ? reportWorkflow.teamId ?? null
              : defaultWorkflowTeamId,
          );
        }
      }
    }

    setHasLoadedStoredWorkflows(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredWorkflows || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(workflowStorageKey, JSON.stringify(workflows));
  }, [hasLoadedStoredWorkflows, workflows]);

  useEffect(() => {
    if (!hasLoadedStoredWorkflows || currentWorkflowId === null) {
      return;
    }

    setWorkflows((currentWorkflows) => {
      const nextWorkflow: WorkflowRecord = {
        id: currentWorkflowId,
        name: createdWorkflowName || '이름 없는 워크플로우',
        description: createdWorkflowDescription,
        nodes: canvasNodes.map(serializeNode),
        edges: canvasEdges,
        isActive: isWorkflowActive,
        isTeamShared: isWorkflowTeamShared && selectedWorkflowTeamId !== null,
        teamId:
          isWorkflowTeamShared && selectedWorkflowTeamId !== null
            ? selectedWorkflowTeamId
            : null,
        updatedAt: Date.now(),
      };
      const hasWorkflow = currentWorkflows.some(
        (workflow) => workflow.id === currentWorkflowId,
      );

      if (!hasWorkflow) {
        return [nextWorkflow, ...currentWorkflows];
      }

      return currentWorkflows.map((workflow) =>
        workflow.id === currentWorkflowId ? nextWorkflow : workflow,
      );
    });
  }, [
    canvasEdges,
    canvasNodes,
    createdWorkflowName,
    createdWorkflowDescription,
    currentWorkflowId,
    hasLoadedStoredWorkflows,
    isWorkflowTeamShared,
    isWorkflowActive,
    selectedWorkflowTeamId,
  ]);

  const handleCreateWorkflow = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get('workflowName') ?? '').trim();
    const nextDescription = String(formData.get('workflowDescription') ?? '').trim();
    if (!nextName) {
      return;
    }

    const nextWorkflow: WorkflowRecord = {
      id: Date.now(),
      name: nextName,
      description: nextDescription,
      nodes: [],
      edges: [],
      isActive: true,
      isTeamShared: isWorkflowTeamShared && selectedWorkflowTeamId !== null,
      teamId:
        isWorkflowTeamShared && selectedWorkflowTeamId !== null
          ? selectedWorkflowTeamId
          : null,
      updatedAt: Date.now(),
    };

    setCreatedWorkflowName(nextName);
    setCreatedWorkflowDescription(nextDescription);
    setCurrentWorkflowId(nextWorkflow.id);
    setIsWorkflowActive(true);
    setWorkflows((currentWorkflows) => [nextWorkflow, ...currentWorkflows]);
    setCanvasNodes([]);
    setCanvasEdges([]);
    setSelectedNodeId(null);
    setCopiedNode(null);
    setWorkflowName('');
    setWorkflowDescription('');
    setIsModalOpen(false);
    setActiveView('workflowBuilder');

    if (typeof window !== 'undefined') {
      window.history.pushState(
        { view: 'workflowBuilder', workflowId: nextWorkflow.id },
        '',
        `${viewPathMap.workflowBuilder}?workflowId=${nextWorkflow.id}`,
      );
    }
  };

  const openWorkflowBuilder = (workflow: WorkflowRecord) => {
    setCreatedWorkflowName(workflow.name);
    setCreatedWorkflowDescription(workflow.description ?? '');
    setCurrentWorkflowId(workflow.id);
    setCanvasNodes(workflow.nodes.map(hydrateNode));
    setCanvasEdges(workflow.edges);
    setSelectedNodeId(null);
    setCopiedNode(null);
    setIsWorkflowActive(workflow.isActive !== false);
    setIsWorkflowTeamShared(
      Boolean(workflow.isTeamShared && isUserTeamId(workflow.teamId)),
    );
    setSelectedWorkflowTeamId(
      isUserTeamId(workflow.teamId) ? workflow.teamId ?? null : defaultWorkflowTeamId,
    );
    setActiveView('workflowBuilder');

    if (typeof window !== 'undefined') {
      window.history.pushState(
        { view: 'workflowBuilder', workflowId: workflow.id },
        '',
        `${viewPathMap.workflowBuilder}?workflowId=${workflow.id}`,
      );
    }
  };

  const handleSaveWorkflow = () => {
    if (currentWorkflowId === null) {
      return;
    }

    setWorkflows((currentWorkflows) =>
      currentWorkflows.map((workflow) =>
        workflow.id === currentWorkflowId
          ? {
              ...workflow,
              name: createdWorkflowName,
              description: createdWorkflowDescription,
              nodes: canvasNodes.map(serializeNode),
              edges: canvasEdges,
              isActive: isWorkflowActive,
              isTeamShared: isWorkflowTeamShared && selectedWorkflowTeamId !== null,
              teamId:
                isWorkflowTeamShared && selectedWorkflowTeamId !== null
                  ? selectedWorkflowTeamId
                  : null,
              updatedAt: Date.now(),
            }
          : workflow,
      ),
    );
  };

  const createFailureQueueItem = ({
    node,
    reason,
  }: {
    node?: CanvasNode | null;
    reason: string;
  }): FailureQueueItem =>
    createWorkflowFailureQueueItem({
      workflowId: currentWorkflowId,
      workflowName: createdWorkflowName || '이름 없는 워크플로우',
      node,
      reason,
      isTeamTarget: isWorkflowTeamShared && selectedWorkflowTeam !== null,
      teamName: selectedWorkflowTeam?.name,
      teamSlackChannel: selectedWorkflowTeam?.defaultSlackChannel,
    });

  const enqueueFailure = (failure: FailureQueueItem) => {
    setFailureQueue((currentQueue) => [failure, ...currentQueue]);
  };

  const clearRunAnimation = () => {
    runAnimationTimers.current.forEach((timerId) => window.clearTimeout(timerId));
    runAnimationTimers.current = [];
    setRunningNodeIds([]);
  };

  const playNodeRunAnimation = (
    stages: ExecutionLog[][],
    onComplete?: () => void,
  ) => {
    clearRunAnimation();
    setNodeRunStatuses({});

    let elapsedMs = 0;

    stages.forEach((stageLogs) => {
      const runMs = Math.max(
        450,
        ...stageLogs.map((log) => Math.round(log.duration * 1000)),
      );
      const startTimer = window.setTimeout(() => {
        setRunningNodeIds(stageLogs.map((log) => log.nodeId));
        setNodeRunStatuses((currentStatuses) => ({
          ...currentStatuses,
          ...Object.fromEntries(
            stageLogs.map((log) => [log.nodeId, 'running'] as const),
          ),
        }));
      }, elapsedMs);

      const finishTimer = window.setTimeout(() => {
        setRunningNodeIds((currentIds) =>
          currentIds.filter(
            (nodeId) => !stageLogs.some((log) => log.nodeId === nodeId),
          ),
        );
        setNodeRunStatuses((currentStatuses) => {
          const nextStatuses = { ...currentStatuses };
          stageLogs.forEach((log) => {
            delete nextStatuses[log.nodeId];
          });
          return nextStatuses;
        });
      }, elapsedMs + runMs);

      runAnimationTimers.current.push(startTimer, finishTimer);
      elapsedMs += runMs + 180;
    });

    const endTimer = window.setTimeout(() => {
      setRunningNodeIds([]);
      setNodeRunStatuses({});
      onComplete?.();
    }, elapsedMs);
    runAnimationTimers.current.push(endTimer);
  };

  const handleRunWorkflow = () => {
    if (!isWorkflowActive) {
      setRunNotice('비활성 워크플로우는 실행할 수 없습니다');
      window.setTimeout(() => setRunNotice(''), 2200);
      return;
    }

    const triggerNode = canvasNodes.find(
      (node) =>
        node.typeLabel === 'Time Trigger' ||
        node.label === 'Time Trigger' ||
        node.typeLabel === 'Webhook Trigger' ||
        node.label.includes('Webhook Trigger') ||
        node.typeLabel === 'Manual Trigger' ||
        node.label === 'Manual Trigger' ||
        node.label === '시작',
    );
    const fallbackStartNode = [...canvasNodes].sort(
      (firstNode, secondNode) =>
        firstNode.x - secondNode.x || firstNode.y - secondNode.y,
    )[0];
    const startNode = triggerNode ?? fallbackStartNode;

    if (!startNode) {
      const failure = createFailureQueueItem({
        reason: '시작 노드가 없어 워크플로우 실행을 시작할 수 없습니다.',
      });

      enqueueFailure(failure);
      const logs: ExecutionLog[] = [
        {
          nodeId: failure.id,
          name: '워크플로우 검증',
          typeLabel: 'Validation',
          description: '실행 가능한 시작 노드를 확인합니다.',
          status: 'Failed',
          duration: 0,
          credits: 0,
          message: failure.reason,
        },
      ];

      setExecutionLogs(logs);
      persistRunReport(logs);
      setRunNotice('실패 실행을 큐에 등록했습니다');
      openWorkflowRunReport();
      window.setTimeout(() => setRunNotice(''), 2200);
      return;
    }

    const runStages = buildWorkflowRunStages(canvasNodes, canvasEdges, startNode);
    const nodesToRun = runStages.flat();
    const failedNode = nodesToRun.find(
      (node) =>
        node.typeLabel === 'Notion MCP' &&
        !node.config?.notionPromptExecuted,
    );

    if (failedNode) {
      const failure = createFailureQueueItem({
        node: failedNode,
        reason:
          'Notion MCP 노드의 Provider/API Key 또는 프로젝트 추출 설정이 완료되지 않았습니다.',
      });

      enqueueFailure(failure);
      const logStages: ExecutionLog[][] = runStages.map((stageNodes) =>
        stageNodes.map((node) => {
          const profile = getNodeRunProfile(node);
          const isFailedNode = node.id === failedNode.id;

          return {
            nodeId: node.id,
            name: node.label,
            typeLabel: node.typeLabel,
            description: node.description,
            status: isFailedNode ? 'Failed' : 'Success',
            duration: isFailedNode ? 0.18 : profile.duration,
            credits: isFailedNode ? 0 : profile.credits,
            message: isFailedNode ? failure.reason : undefined,
          };
        }),
      );
      const logs = logStages.flat();

      setExecutionLogs(logs);
      persistRunReport(logs);
      playNodeRunAnimation(logStages, openWorkflowRunReport);
      setRunNotice('실패 실행을 큐에 등록했습니다');
      window.setTimeout(() => setRunNotice(''), 2200);
      return;
    }

    const logStages: ExecutionLog[][] = runStages.map((stageNodes) =>
      stageNodes.map((node) => {
        const profile = getNodeRunProfile(node);

        return {
          nodeId: node.id,
          name: node.label,
          typeLabel: node.typeLabel,
          description: node.description,
          status: 'Success',
          duration: profile.duration,
          credits: profile.credits,
        };
      }),
    );
    const logs = logStages.flat();

    setExecutionLogs(logs);
    persistRunReport(logs);
    playNodeRunAnimation(logStages, openWorkflowRunReport);
    setRunNotice('');
  };

  useEffect(() => clearRunAnimation, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();

      setFailureQueue((currentQueue) =>
        currentQueue.map((item) => {
          if (item.status === 'resolved' || item.nextNotifyAt > now) {
            return item;
          }

          return {
            ...item,
            status: 'notified',
            notificationAttempts: item.notificationAttempts + 1,
            lastNotifiedAt: now,
            nextNotifyAt: now + item.notifyEveryMinutes * 60 * 1000,
          };
        }),
      );
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const handleResolveFailure = (failureId: number) => {
    setFailureQueue((currentQueue) =>
      currentQueue.map((item) =>
        item.id === failureId ? { ...item, status: 'resolved' } : item,
      ),
    );
  };

  const handleDeleteWorkflow = (workflowId: number) => {
    setWorkflows((currentWorkflows) =>
      currentWorkflows.filter((workflow) => workflow.id !== workflowId),
    );
    setSelectedAnalyticsWorkflowId((currentId) =>
      currentId === workflowId ? null : currentId,
    );

    if (workflowId === currentWorkflowId) {
      setCurrentWorkflowId(null);
      setCreatedWorkflowName('');
      setCreatedWorkflowDescription('');
      setCanvasNodes([]);
      setCanvasEdges([]);
      setSelectedNodeId(null);
      setCopiedNode(null);
      setIsWorkflowActive(true);
      setIsWorkflowTeamShared(false);
      setSelectedWorkflowTeamId(defaultWorkflowTeamId);
    }
  };

  const showAllAnalytics = () => {
    setSelectedAnalyticsWorkflowId(null);
    setActiveView('analytics');

    if (typeof window !== 'undefined') {
      window.history.pushState(
        { view: 'analytics' },
        '',
        viewPathMap.runReport,
      );
    }
  };

  const persistRunReport = (logs: ExecutionLog[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      runReportStorageKey,
      JSON.stringify({
        workflowId: currentWorkflowId,
        workflowName: createdWorkflowName || '이름 없는 워크플로우',
        executionLogs: logs,
        createdAt: Date.now(),
      }),
    );
  };

  const openWorkflowRunReport = () => {
    setSelectedAnalyticsWorkflowId(currentWorkflowId);
    setReportReturnView('workflowBuilder');
    setActiveView('runReport');

    if (typeof window !== 'undefined') {
      const workflowQuery =
        currentWorkflowId === null ? '' : `?workflowId=${currentWorkflowId}`;

      window.history.pushState(
        { view: 'runReport', workflowId: currentWorkflowId },
        '',
        `${viewPathMap.runReport}${workflowQuery}`,
      );
    }
  };

  const openAuthView = (view: 'login' | 'signup') => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      window.history.pushState({ view }, '', viewPathMap[view]);
    }
  };

  const enterWorkspace = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActiveView('home');
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: 'home' }, '', viewPathMap.home);
    }
  };

  const handleTeamSharedChange = (isShared: boolean) => {
    if (isShared && selectedWorkflowTeamId === null) {
      return;
    }

    setIsWorkflowTeamShared(isShared);

    if (currentWorkflowId === null) {
      return;
    }

    setWorkflows((currentWorkflows) =>
      currentWorkflows.map((workflow) =>
        workflow.id === currentWorkflowId
          ? {
              ...workflow,
              isTeamShared: isShared,
              teamId: isShared ? selectedWorkflowTeamId : null,
              updatedAt: Date.now(),
            }
          : workflow,
      ),
    );
  };

  const handleWorkflowActiveChange = (isActive: boolean) => {
    setIsWorkflowActive(isActive);

    if (currentWorkflowId === null) {
      return;
    }

    setWorkflows((currentWorkflows) =>
      currentWorkflows.map((workflow) =>
        workflow.id === currentWorkflowId
          ? {
              ...workflow,
              isActive,
              updatedAt: Date.now(),
            }
          : workflow,
      ),
    );
  };

  const handleSharedTeamChange = (teamId: string) => {
    setSelectedWorkflowTeamId(teamId);

    if (currentWorkflowId === null) {
      return;
    }

    setWorkflows((currentWorkflows) =>
      currentWorkflows.map((workflow) =>
        workflow.id === currentWorkflowId
          ? {
              ...workflow,
              isTeamShared: true,
              teamId,
              updatedAt: Date.now(),
            }
          : workflow,
      ),
    );
  };

  const handleCreateNode = (node: (typeof nodeTypes)[number]) => {
    const nodeCount = canvasNodes.length;
    const column = nodeCount % 3;
    const row = Math.floor(nodeCount / 3);
    const nextNode = {
      id: Date.now(),
      label: node.label,
      description: node.description,
      typeLabel: node.label,
      nodeRole: getNodeRole(node.label),
      icon: node.icon,
      x: 220 + column * 320,
      y: 160 + row * 180,
      isExpanded: false,
      config:
        node.label === 'Notion MCP'
          ? {
              notionPrompt: '',
              notionPromptExecuted: false,
              notionProjectKeyword: '',
              notionDatabaseId: '',
              mcpTransport: 'Streamable HTTP',
              mcpEndpoint: 'https://mcp.notion.com/mcp',
              mcpAuth: 'OAuth2',
              selectedTool: 'query_database',
            }
          : undefined,
    };

    setCanvasNodes((currentNodes) => [...currentNodes, nextNode]);
    setSelectedNodeId(nextNode.id);
  };

  const handleCreateUnreadMailSummaryWorkflow = () => {
    const timeTriggerNodeType = nodeTypes.find((node) => node.label === 'Time Trigger');
    const gmailNodeType = nodeTypes.find((node) => node.label === 'Gmail Reader');
    const llmNodeType = nodeTypes.find((node) => node.label === 'LLM');
    const slackNodeType =
      nodeTypes.find((node) => node.label === 'Slack 전송') ??
      nodeTypes.find((node) => node.label === 'Slack MCP');

    if (!timeTriggerNodeType || !gmailNodeType || !llmNodeType || !slackNodeType) {
      return;
    }

    const baseId = Date.now();
    const nextNodes: CanvasNode[] = [
      {
        id: baseId,
        label: 'Time Trigger',
        description: '정해진 시간마다 워크플로우 실행을 시작합니다',
        typeLabel: timeTriggerNodeType.label,
        nodeRole: getNodeRole(timeTriggerNodeType.label),
        icon: timeTriggerNodeType.icon,
        x: 560,
        y: 120,
        isExpanded: false,
      },
      {
        id: baseId + 1,
        label: 'Gmail Reader',
        description: '안읽은 메일을 가져옵니다',
        typeLabel: gmailNodeType.label,
        nodeRole: getNodeRole(gmailNodeType.label),
        icon: gmailNodeType.icon,
        x: 560,
        y: 320,
        isExpanded: false,
      },
      {
        id: baseId + 2,
        label: 'LLM: 요약',
        description: '메일 내용을 핵심 요약으로 정리합니다',
        typeLabel: llmNodeType.label,
        nodeRole: getNodeRole(llmNodeType.label),
        icon: llmNodeType.icon,
        x: 560,
        y: 520,
        isExpanded: false,
      },
      {
        id: baseId + 3,
        label: 'Slack Sender',
        description: '요약 결과를 Slack 채널로 전송합니다',
        typeLabel: slackNodeType.label,
        nodeRole: getNodeRole(slackNodeType.label),
        icon: slackNodeType.icon,
        x: 560,
        y: 720,
        isExpanded: false,
      },
    ];

    setCanvasNodes(nextNodes);
    setCanvasEdges([
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
      {
        id: baseId + 12,
        fromNodeId: baseId + 2,
        fromHandle: 'bottom',
        toNodeId: baseId + 3,
        toHandle: 'top',
      },
    ]);
    setSelectedNodeId(baseId);
    setRunNotice('챗봇이 안읽은 메일 요약 워크플로우를 생성했습니다');
    window.setTimeout(() => setRunNotice(''), 2400);
  };

  const handleCreateGithubPrReviewWorkflow = () => {
    const webhookNodeType = nodeTypes.find((node) => node.label === 'Webhook Trigger');
    const agentNodeType = nodeTypes.find((node) => node.label === 'AI Agent');
    const githubNodeType = nodeTypes.find((node) => node.label === 'GitHub PR');

    if (!webhookNodeType || !agentNodeType || !githubNodeType) {
      return;
    }

    const baseId = Date.now();
    const nextWorkflowId = currentWorkflowId ?? baseId + 1000;
    const nextWorkflowName = 'GitHub PR Review Workflow';
    const nextWorkflowDescription =
      'GitHub PR 요청을 받아 보안, 성능, 코드스타일 리뷰를 병렬 수행하고 PM Agent가 PR 메시지를 정리하는 워크플로우';
    const nextNodes: CanvasNode[] = [
      {
        id: baseId,
        label: 'Webhook Trigger: PR 요청 수신',
        description: 'GitHub PR request 이벤트를 받아 리뷰 워크플로우를 시작합니다',
        typeLabel: webhookNodeType.label,
        nodeRole: getNodeRole(webhookNodeType.label),
        icon: webhookNodeType.icon,
        x: 180,
        y: 280,
        isExpanded: false,
      },
      {
        id: baseId + 1,
        label: '보안 AI Agent',
        description: '취약점, 비밀정보, 권한 문제를 중심으로 PR을 검토합니다',
        typeLabel: agentNodeType.label,
        nodeRole: getNodeRole(agentNodeType.label),
        icon: agentNodeType.icon,
        x: 520,
        y: 120,
        isExpanded: false,
      },
      {
        id: baseId + 2,
        label: '성능 AI Agent',
        description: '병목, 불필요한 연산, 확장성 문제를 중심으로 PR을 검토합니다',
        typeLabel: agentNodeType.label,
        nodeRole: getNodeRole(agentNodeType.label),
        icon: agentNodeType.icon,
        x: 520,
        y: 280,
        isExpanded: false,
      },
      {
        id: baseId + 3,
        label: '코드스타일 AI Agent',
        description: '일관성, 네이밍, 유지보수성을 중심으로 PR을 검토합니다',
        typeLabel: agentNodeType.label,
        nodeRole: getNodeRole(agentNodeType.label),
        icon: agentNodeType.icon,
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
        typeLabel: agentNodeType.label,
        nodeRole: getNodeRole(agentNodeType.label),
        icon: agentNodeType.icon,
        x: 900,
        y: 280,
        isExpanded: false,
      },
      {
        id: baseId + 5,
        label: 'GitHub PR: 리뷰 코멘트 작성',
        description: '정리된 리뷰 메시지를 GitHub PR에 작성합니다',
        typeLabel: githubNodeType.label,
        nodeRole: getNodeRole(githubNodeType.label),
        icon: githubNodeType.icon,
        x: 1260,
        y: 280,
        isExpanded: false,
      },
    ];
    const nextEdges: CanvasEdge[] = [
      {
        id: baseId + 10,
        fromNodeId: baseId,
        fromHandle: 'bottom',
        toNodeId: baseId + 1,
        toHandle: 'top',
      },
      {
        id: baseId + 11,
        fromNodeId: baseId,
        fromHandle: 'bottom',
        toNodeId: baseId + 2,
        toHandle: 'top',
      },
      {
        id: baseId + 12,
        fromNodeId: baseId,
        fromHandle: 'bottom',
        toNodeId: baseId + 3,
        toHandle: 'top',
      },
      {
        id: baseId + 13,
        fromNodeId: baseId + 1,
        fromHandle: 'bottom',
        toNodeId: baseId + 4,
        toHandle: 'top',
      },
      {
        id: baseId + 14,
        fromNodeId: baseId + 2,
        fromHandle: 'bottom',
        toNodeId: baseId + 4,
        toHandle: 'top',
      },
      {
        id: baseId + 15,
        fromNodeId: baseId + 3,
        fromHandle: 'bottom',
        toNodeId: baseId + 4,
        toHandle: 'top',
      },
      {
        id: baseId + 16,
        fromNodeId: baseId + 4,
        fromHandle: 'bottom',
        toNodeId: baseId + 5,
        toHandle: 'top',
      },
    ];

    setCreatedWorkflowName(nextWorkflowName);
    setCreatedWorkflowDescription(nextWorkflowDescription);
    setCurrentWorkflowId(nextWorkflowId);
    setIsWorkflowActive(true);
    setCanvasNodes(nextNodes);
    setCanvasEdges(nextEdges);
    setWorkflows((currentWorkflows) => {
      const nextWorkflow: WorkflowRecord = {
        id: nextWorkflowId,
        name: nextWorkflowName,
        description: nextWorkflowDescription,
        nodes: nextNodes.map(serializeNode),
        edges: nextEdges,
        isActive: true,
        isTeamShared: isWorkflowTeamShared && selectedWorkflowTeamId !== null,
        teamId:
          isWorkflowTeamShared && selectedWorkflowTeamId !== null
            ? selectedWorkflowTeamId
            : null,
        updatedAt: Date.now(),
      };
      const hasWorkflow = currentWorkflows.some(
        (workflow) => workflow.id === nextWorkflowId,
      );

      return hasWorkflow
        ? currentWorkflows.map((workflow) =>
            workflow.id === nextWorkflowId ? nextWorkflow : workflow,
          )
        : [nextWorkflow, ...currentWorkflows];
    });
    setSelectedNodeId(baseId);
    setRunNotice('GitHub PR 리뷰 워크플로우를 생성했습니다');
    if (typeof window !== 'undefined') {
      window.history.pushState(
        { view: 'workflowBuilder', workflowId: nextWorkflowId },
        '',
        `${viewPathMap.workflowBuilder}?workflowId=${nextWorkflowId}`,
      );
    }
    window.setTimeout(() => setRunNotice(''), 2400);
  };

  const handleChatPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingChat({
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startX: chatPosition.x,
      startBottom: chatPosition.bottom,
    });
  };

  const handleChatPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingChat) {
      return;
    }

    const minChatX = isNodeSidebarOpen ? 340 : 92;
    const panelWidth = 360;
    const margin = 16;

    setChatPosition({
      x: Math.min(
        Math.max(
          minChatX,
          draggingChat.startX + event.clientX - draggingChat.startPointerX,
        ),
        window.innerWidth - panelWidth - margin,
      ),
      bottom: Math.min(
        Math.max(
          margin,
          draggingChat.startBottom - (event.clientY - draggingChat.startPointerY),
        ),
        window.innerHeight - 120,
      ),
    });
  };

  const handleChatPointerUp = () => {
    setDraggingChat(null);
  };

  const handleChatResizePointerDown = (
    direction: ChatResizeDirection,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingChat({
      direction,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startWidth: chatSize.width,
      startHeight: chatSize.height,
      startX: chatPosition.x,
      startBottom: chatPosition.bottom,
    });
  };

  const handleChatResizePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!resizingChat) {
      return;
    }

    const maxWidth = Math.min(560, window.innerWidth - 32);
    const maxHeight = Math.min(840, window.innerHeight - 96);
    const minWidth = 320;
    const minHeight = 360;
    const deltaX = event.clientX - resizingChat.startPointerX;
    const deltaY = event.clientY - resizingChat.startPointerY;
    let nextWidth = resizingChat.startWidth;
    let nextHeight = resizingChat.startHeight;
    let nextX = chatPosition.x;
    let nextBottom = chatPosition.bottom;

    if (resizingChat.direction === 'right') {
      nextWidth = resizingChat.startWidth + deltaX;
    }

    if (resizingChat.direction === 'left') {
      nextWidth = resizingChat.startWidth - deltaX;
    }

    if (resizingChat.direction === 'top') {
      nextHeight = resizingChat.startHeight - deltaY;
    }

    if (resizingChat.direction === 'bottom') {
      nextHeight = resizingChat.startHeight + deltaY;
    }

    const clampedWidth = Math.min(Math.max(minWidth, nextWidth), maxWidth);
    const clampedHeight = Math.min(Math.max(minHeight, nextHeight), maxHeight);

    if (resizingChat.direction === 'left') {
      nextX =
        resizingChat.startX + (resizingChat.startWidth - clampedWidth);
    }

    if (resizingChat.direction === 'bottom') {
      nextBottom =
        resizingChat.startBottom - (clampedHeight - resizingChat.startHeight);
    }

    setChatSize({
      width: clampedWidth,
      height: clampedHeight,
    });
    setChatPosition((currentPosition) => ({
      x:
        resizingChat.direction === 'left'
          ? Math.min(
              Math.max(isNodeSidebarOpen ? 340 : 92, nextX),
              window.innerWidth - clampedWidth - 16,
            )
          : currentPosition.x,
      bottom:
        resizingChat.direction === 'bottom'
          ? Math.min(Math.max(16, nextBottom), window.innerHeight - 120)
          : currentPosition.bottom,
    }));
  };

  const handleChatResizePointerUp = () => {
    setResizingChat(null);
  };

  const openChatNearLauncher = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const launcherRect = event.currentTarget.getBoundingClientRect();
    const panelWidth = chatSize.width;
    const margin = 18;
    const minChatX = isNodeSidebarOpen ? 340 : 92;
    const centeredX =
      launcherRect.left + launcherRect.width / 2 - panelWidth / 2;

    setChatPosition({
      x: Math.min(
        Math.max(minChatX, centeredX),
        window.innerWidth - panelWidth - margin,
      ),
      bottom: window.innerHeight - launcherRect.top,
    });
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  const createConnection = (
    fromNodeId: number,
    fromHandle: HandlePosition,
    toNodeId: number,
    toHandle: HandlePosition,
  ) => {
    if (fromNodeId === toNodeId) {
      return;
    }

    setCanvasEdges((currentEdges) => {
      const alreadyExists = currentEdges.some(
        (edge) =>
          edge.fromNodeId === fromNodeId &&
          edge.fromHandle === fromHandle &&
          edge.toNodeId === toNodeId &&
          edge.toHandle === toHandle,
      );

      if (alreadyExists) {
        return currentEdges;
      }

      return [
        ...currentEdges,
        {
          id: Date.now(),
          fromNodeId,
          fromHandle,
          toNodeId,
          toHandle,
        },
      ];
    });
  };

  const handleDeleteEdgeById = (edgeId: number) => {
    setCanvasEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.id !== edgeId),
    );
  };

  const handleNodePositionChange = (
    nodeId: number,
    position: { x: number; y: number },
  ) => {
    setCanvasNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId ? { ...node, x: position.x, y: position.y } : node,
      ),
    );
  };

  const handleConnectNodes = (sourceNodeId: number, targetNodeId: number) => {
    createConnection(sourceNodeId, 'bottom', targetNodeId, 'top');
  };

  const toggleNodeDetails = (nodeId: number) => {
    setCanvasNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId ? { ...node, isExpanded: !node.isExpanded } : node,
      ),
    );
  };

  const updateNodeConfig = (
    nodeId: number,
    key:
      | 'notionPrompt'
      | 'notionPromptExecuted'
      | 'notionProjectKeyword'
      | 'notionDatabaseId'
      | 'mcpTransport'
      | 'mcpEndpoint'
      | 'mcpAuth'
      | 'selectedTool'
      | 'agentModel'
      | 'agentPrompt'
      | 'agentRagDocumentIds'
      | 'agentOutputFormat',
    value: string | boolean | string[],
  ) => {
    setCanvasNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              config: {
                ...node.config,
                [key]: value,
              },
            }
          : node,
      ),
    );
  };

  const executeNotionPrompt = (nodeId: number) => {
    setCanvasNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              config: {
                ...node.config,
                notionPromptExecuted: true,
              },
            }
          : node,
      ),
    );
  };

  const deleteCanvasNode = (nodeId: number) => {
    setCanvasNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== nodeId),
    );
    setCanvasEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId,
      ),
    );
    setSelectedNodeId((currentId) => (currentId === nodeId ? null : currentId));
    setCopiedNode((currentNode) =>
      currentNode?.id === nodeId ? null : currentNode,
    );
  };

  useEffect(() => {
    if (activeView !== 'workflowBuilder') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if (
        selectedNodeId !== null &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault();
        deleteCanvasNode(selectedNodeId);
        return;
      }

      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      if (event.key.toLowerCase() === 'c' && selectedNodeId !== null) {
        const selectedNode = canvasNodes.find((node) => node.id === selectedNodeId);
        if (selectedNode) {
          event.preventDefault();
          setCopiedNode(selectedNode);
        }
      }

      if (event.key.toLowerCase() === 'v' && copiedNode) {
        event.preventDefault();
        const pastedNode = {
          ...copiedNode,
          id: Date.now(),
          x: copiedNode.x + 28,
          y: copiedNode.y + 28,
        };

        setCanvasNodes((currentNodes) => [...currentNodes, pastedNode]);
        setSelectedNodeId(pastedNode.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeView, canvasNodes, copiedNode, selectedNodeId]);

  const workflowModal = isModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <form
        className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl"
        onSubmit={handleCreateWorkflow}
      >
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">워크플로우 생성</h2>
            <p className="mt-2 text-sm text-slate-500">
              새 워크플로우 이름을 입력하세요.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsModalOpen(false)}
            aria-label="닫기"
          >
            <X size={18} />
          </Button>
        </div>

        <label className="mb-5 block space-y-2">
          <span className="text-sm font-semibold text-slate-700">워크플로우 이름</span>
          <Input
            autoFocus
            name="workflowName"
            required
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
            placeholder="예: 고객 문의 자동 분류"
          />
        </label>

        <label className="mb-5 block space-y-2">
          <span className="text-sm font-semibold text-slate-700">워크플로우 설명</span>
          <textarea
            className="min-h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            name="workflowDescription"
            value={workflowDescription}
            onChange={(event) => setWorkflowDescription(event.target.value)}
            placeholder="예: 고객 문의를 분류하고 Slack으로 처리 결과를 공유합니다"
          />
        </label>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <strong className="block text-sm font-semibold text-slate-950">팀 공유</strong>
              <span className="mt-1 block text-sm text-slate-500">
                {userTeams.length === 0
                  ? '소속 팀이 없어 개인 워크플로우로 생성됩니다.'
                  : isWorkflowTeamShared && selectedWorkflowTeam
                  ? `${selectedWorkflowTeam.name} 팀에 공유합니다.`
                  : '개인 워크플로우로 생성합니다.'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={isWorkflowTeamShared}
                disabled={userTeams.length === 0}
                onCheckedChange={setIsWorkflowTeamShared}
              />
              <span className="text-sm font-semibold text-slate-700">
                {isWorkflowTeamShared ? '팀 공유 켜짐' : '팀 공유 꺼짐'}
              </span>
            </div>
          </div>

          {isWorkflowTeamShared && selectedWorkflowTeam && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="block text-sm font-semibold text-slate-950">
                공유 팀
              </strong>
              <span className="mt-1 block text-sm text-slate-500">
                {selectedWorkflowTeam.name} · Slack{' '}
                {selectedWorkflowTeam.defaultSlackChannel}
              </span>
              <div className="mt-3 space-y-2">
                {userTeams.map((team) => {
                  const isSelectedTeam = team.id === selectedWorkflowTeamId;

                  return (
                    <button
                      key={team.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400',
                        isSelectedTeam && 'border-slate-950 bg-slate-50',
                      )}
                      onClick={() => setSelectedWorkflowTeamId(team.id)}
                    >
                      <span>
                        <strong className="block text-sm font-semibold text-slate-950">
                          {team.name}
                        </strong>
                        <small className="text-xs text-slate-500">
                          Slack {team.defaultSlackChannel} · 팀원 {team.memberCount}명
                        </small>
                      </span>
                      <b className="text-xs font-semibold text-slate-600">
                        {isSelectedTeam ? '선택됨' : '선택'}
                      </b>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsModalOpen(false)}
          >
            취소
          </Button>
          <Button type="submit">
            생성하기
          </Button>
        </div>
      </form>
    </div>
  );

  if (activeView === 'landing') {
    return <LandingPage onOpenAuth={openAuthView} />;
  }

  if (activeView === 'login' || activeView === 'signup') {
    return (
      <AuthPage
        mode={activeView}
        onBack={() => {
          setActiveView('landing');
          window.history.pushState({ view: 'landing' }, '', '/');
        }}
        onSwitchMode={openAuthView}
        onSubmit={enterWorkspace}
      />
    );
  }

  if (activeView === 'workflowBuilder') {
    return (
      <WorkflowBuilderPage
        workflowName={createdWorkflowName}
        workflowDescription={createdWorkflowDescription}
        isNodeSidebarOpen={isNodeSidebarOpen}
        nodeSearch={nodeSearch}
        nodeTypes={filteredNodeTypes}
        nodes={canvasNodes}
        edges={canvasEdges}
        selectedNodeId={selectedNodeId}
        runNotice={runNotice}
        runningNodeIds={runningNodeIds}
        nodeRunStatuses={nodeRunStatuses}
        isChatOpen={isChatOpen}
        chatPosition={chatPosition}
        chatSize={chatSize}
        isWorkflowActive={isWorkflowActive}
        isTeamShared={isWorkflowTeamShared && selectedWorkflowTeam !== null}
        sharedTeamName={selectedWorkflowTeam?.name ?? ''}
        sharedTeamId={selectedWorkflowTeamId}
        availableTeams={userTeams}
        workflowModal={workflowModal}
        onBack={() => setActiveView('workflowList')}
        onSave={handleSaveWorkflow}
        onRun={handleRunWorkflow}
        onOpenAnalytics={() => {
          if (currentWorkflowId !== null) {
            openWorkflowAnalytics(currentWorkflowId);
          }
        }}
        onWorkflowNameChange={setCreatedWorkflowName}
        onWorkflowDescriptionChange={setCreatedWorkflowDescription}
        onWorkflowActiveChange={handleWorkflowActiveChange}
        onTeamSharedChange={handleTeamSharedChange}
        onSharedTeamChange={handleSharedTeamChange}
        onToggleNodeSidebar={() => setIsNodeSidebarOpen((current) => !current)}
        onNodeSearchChange={setNodeSearch}
        onCreateNode={handleCreateNode}
        onSelectNode={setSelectedNodeId}
        onNodePositionChange={handleNodePositionChange}
        onConnectNodes={handleConnectNodes}
        onDeleteEdge={handleDeleteEdgeById}
        onToggleNodeDetails={toggleNodeDetails}
        onUpdateNodeConfig={updateNodeConfig}
        onExecuteNotionPrompt={executeNotionPrompt}
        onChatPointerDown={handleChatPointerDown}
        onChatPointerMove={handleChatPointerMove}
        onChatPointerUp={handleChatPointerUp}
        onChatResizePointerDown={handleChatResizePointerDown}
        onChatResizePointerMove={handleChatResizePointerMove}
        onChatResizePointerUp={handleChatResizePointerUp}
        onCloseChat={closeChat}
        onOpenChatNearLauncher={openChatNearLauncher}
        onCreateUnreadMailSummaryWorkflow={handleCreateUnreadMailSummaryWorkflow}
        onCreateGithubPrReviewWorkflow={handleCreateGithubPrReviewWorkflow}
        getNodeRunProfile={getNodeRunProfile}
      />
    );

  }

  const renderRunReportPage = () => {
    const reportWorkflowId = selectedAnalyticsWorkflowId;
    const reportWorkflow =
      reportWorkflowId === null
        ? null
        : workflows.find((workflow) => workflow.id === reportWorkflowId) ?? null;
    const closeReport = () => {
      const fallbackView =
        reportReturnView === 'runReport'
          ? 'home'
          : reportReturnView;

      if (fallbackView === 'analytics') {
        setSelectedAnalyticsWorkflowId(null);
      }

      setActiveView(fallbackView);

      if (typeof window !== 'undefined') {
        const workflowQuery =
          fallbackView === 'workflowBuilder' && currentWorkflowId !== null
            ? `?workflowId=${currentWorkflowId}`
            : '';

        window.history.pushState(
          { view: fallbackView, workflowId: currentWorkflowId },
          '',
          `${viewPathMap[fallbackView]}${workflowQuery}`,
        );
      }
    };

    return (
      <WorkflowRunReportPage
            workflowName={reportWorkflow?.name ?? createdWorkflowName}
            workflow={reportWorkflow}
            workflowRecords={workflows}
            summary={analyticsSummary}
        workflows={workflowAnalytics}
        selectedWorkflow={selectedAnalyticsWorkflow}
        executionLogs={executionLogs}
        failureQueue={failureQueue}
        onClose={closeReport}
        onSelectWorkflow={openWorkflowAnalytics}
        onResolveFailure={handleResolveFailure}
      />
    );
  };

  const hasStandaloneReportTarget =
    selectedAnalyticsWorkflowId !== null ||
    currentWorkflowId !== null ||
    executionLogs.length > 0;

  if (activeView === 'runReport' && hasStandaloneReportTarget) {
    return renderRunReportPage();
  }

  const renderWorkspacePage = () => {
    switch (activeView) {
      case 'home':
        return (
          <HomeDashboardPage
            workflows={workflows}
            recentWorkflows={recentWorkflows}
            failureQueue={failureQueue}
            onCreateWorkflow={openWorkflowModal}
            onShowWorkflowList={() => handleNavigation('workflowList')}
            onEditWorkflow={openWorkflowBuilder}
            onDeleteWorkflow={handleDeleteWorkflow}
            onOpenAnalytics={openWorkflowAnalytics}
          />
        );
      case 'workflowList':
        return (
          <WorkflowListPage
            workflows={workflows}
            failureQueue={failureQueue}
            onCreateWorkflow={openWorkflowModal}
            onEditWorkflow={openWorkflowBuilder}
            onDeleteWorkflow={handleDeleteWorkflow}
            onOpenAnalytics={openWorkflowAnalytics}
          />
        );
      case 'knowledge':
        return <KnowledgePage />;
      case 'marketplace':
        return <MarketplacePage />;
      case 'account':
        return (
          <AccountPage
            accountTab={accountTab}
            currentUser={currentUser}
            userTeams={userTeams}
            workflows={workflows}
            onChangeTab={setAccountTab}
          />
        );
      case 'analytics':
      case 'runReport':
        return (
          <AnalyticsPage
            summary={analyticsSummary}
            workflows={workflowAnalytics}
            selectedWorkflow={selectedAnalyticsWorkflow}
            onShowAll={showAllAnalytics}
            onSelectWorkflow={openWorkflowAnalytics}
          />
        );
      case 'usage':
        return <UsagePage />;
      default:
        return null;
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-100 text-slate-950">
      <DashboardSidebar
        activeView={activeView}
        items={navigationItems}
        onNavigate={handleNavigation}
      />

      <section className="min-w-0 flex-1 overflow-auto">
        {activeView !== 'home' && (
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                시연을 위한 간단한 워크플로우 프로토타입
              </p>
            </div>
            <div className="flex h-10 min-w-48 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
              <Search size={17} />
              <span>검색</span>
            </div>
          </header>
        )}

        <div className="min-h-[calc(100vh-81px)]">{renderWorkspacePage()}</div>
      </section>

      {workflowModal}
    </main>
  );
}
