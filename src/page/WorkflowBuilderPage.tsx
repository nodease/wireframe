'use client';

import { ArrowLeft, BarChart3, Play, Save, Settings2 } from 'lucide-react';
import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ChatWidget,
  type ChatResizeDirection,
} from '../components/builder/ChatWidget';
import { NodePalette } from '../components/builder/NodePalette';
import { WorkflowCanvas } from '../components/builder/WorkflowCanvas';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { cn } from '@/src/lib/utils';
import type { WorkflowNodeType } from '../domains/workflow/nodes';
import type {
  CanvasEdge,
  CanvasNode,
  ExecutionLog,
} from '../domains/workflow/types';
import type { UserTeam } from '../domains/account/types';

type WorkflowBuilderPageProps = {
  workflowName: string;
  workflowDescription: string;
  isNodeSidebarOpen: boolean;
  nodeSearch: string;
  nodeTypes: WorkflowNodeType[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: number | null;
  runNotice: string;
  runningNodeIds: number[];
  nodeRunStatuses: Record<number, 'running' | 'success' | 'failed'>;
  isChatOpen: boolean;
  chatPosition: { x: number; bottom: number };
  chatSize: { width: number; height: number };
  isWorkflowActive: boolean;
  isTeamShared: boolean;
  sharedTeamName: string;
  sharedTeamId: string | null;
  availableTeams: UserTeam[];
  workflowModal: React.ReactNode;
  onBack: () => void;
  onSave: () => void;
  onRun: () => void;
  onOpenAnalytics: () => void;
  onWorkflowNameChange: (name: string) => void;
  onWorkflowDescriptionChange: (description: string) => void;
  onWorkflowActiveChange: (isActive: boolean) => void;
  onTeamSharedChange: (isShared: boolean) => void;
  onSharedTeamChange: (teamId: string) => void;
  onToggleNodeSidebar: () => void;
  onNodeSearchChange: (value: string) => void;
  onCreateNode: (node: WorkflowNodeType) => void;
  onSelectNode: (nodeId: number | null) => void;
  onNodePositionChange: (nodeId: number, position: { x: number; y: number }) => void;
  onConnectNodes: (sourceNodeId: number, targetNodeId: number) => void;
  onDeleteEdge: (edgeId: number) => void;
  onToggleNodeDetails: (nodeId: number) => void;
  onUpdateNodeConfig: (
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
  ) => void;
  onExecuteNotionPrompt: (nodeId: number) => void;
  onChatPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onChatPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onChatPointerUp: () => void;
  onChatResizePointerDown: (
    direction: ChatResizeDirection,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onChatResizePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onChatResizePointerUp: () => void;
  onCloseChat: () => void;
  onOpenChatNearLauncher: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onCreateUnreadMailSummaryWorkflow: () => void;
  onCreateGithubPrReviewWorkflow: () => void;
  getNodeRunProfile: (node: CanvasNode) => Pick<ExecutionLog, 'duration' | 'credits'>;
};

export function WorkflowBuilderPage({
  workflowName,
  workflowDescription,
  isNodeSidebarOpen,
  nodeSearch,
  nodeTypes,
  nodes,
  edges,
  selectedNodeId,
  runNotice,
  runningNodeIds,
  nodeRunStatuses,
  isChatOpen,
  chatPosition,
  chatSize,
  isWorkflowActive,
  isTeamShared,
  sharedTeamName,
  sharedTeamId,
  availableTeams,
  workflowModal,
  onBack,
  onSave,
  onRun,
  onOpenAnalytics,
  onWorkflowNameChange,
  onWorkflowDescriptionChange,
  onWorkflowActiveChange,
  onTeamSharedChange,
  onSharedTeamChange,
  onToggleNodeSidebar,
  onNodeSearchChange,
  onCreateNode,
  onSelectNode,
  onNodePositionChange,
  onConnectNodes,
  onDeleteEdge,
  onToggleNodeDetails,
  onUpdateNodeConfig,
  onExecuteNotionPrompt,
  onChatPointerDown,
  onChatPointerMove,
  onChatPointerUp,
  onChatResizePointerDown,
  onChatResizePointerMove,
  onChatResizePointerUp,
  onCloseChat,
  onOpenChatNearLauncher,
  onCreateUnreadMailSummaryWorkflow,
  onCreateGithubPrReviewWorkflow,
  getNodeRunProfile,
}: WorkflowBuilderPageProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const selectedTeam =
    availableTeams.find((team) => team.id === sharedTeamId) ?? availableTeams[0];
  const failureNotificationTargets = isTeamShared
    ? [
        `${sharedTeamName} Slack ${
          availableTeams.find((team) => team.id === sharedTeamId)?.defaultSlackChannel ??
          '#workflow-alerts'
        }`,
        '계정주 이메일 owner@nodease.ai',
      ]
    : ['계정주 이메일 owner@nodease.ai'];

  return (
    <main className="relative flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-50">
      <header className="flex min-h-[74px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Button type="button" variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            워크플로우
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-slate-950">
              {workflowName || '이름 없는 워크플로우'}
            </h1>
            <p className="mt-1 truncate text-sm text-slate-500">
              {workflowDescription || '워크플로우 빌더 화면'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isTeamShared && <Badge variant="secondary">{sharedTeamName}에 공유 중</Badge>}
          <Button type="button" variant="secondary" size="sm" onClick={onOpenAnalytics}>
            <BarChart3 size={16} />
            보고
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 size={16} />
            워크플로우 설정
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSave}>
            <Save size={16} />
            저장
          </Button>
          <Button type="button" size="sm" onClick={onRun}>
            <Play size={16} />
            실행
          </Button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 overflow-hidden">
        <NodePalette
          isOpen={isNodeSidebarOpen}
          nodeSearch={nodeSearch}
          nodes={nodeTypes}
          onSearchChange={onNodeSearchChange}
          onToggle={onToggleNodeSidebar}
          onCreateNode={onCreateNode}
        />
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          workflowName={workflowName}
          selectedNodeId={selectedNodeId}
          runNotice={runNotice}
          runningNodeIds={runningNodeIds}
          nodeRunStatuses={nodeRunStatuses}
          onSelectNode={onSelectNode}
          onNodePositionChange={onNodePositionChange}
          onConnectNodes={onConnectNodes}
          onDeleteEdge={onDeleteEdge}
          onToggleNodeDetails={onToggleNodeDetails}
          onUpdateNodeConfig={onUpdateNodeConfig}
          onExecuteNotionPrompt={onExecuteNotionPrompt}
          getNodeRunProfile={getNodeRunProfile}
        />
      </section>

      <ChatWidget
        isOpen={isChatOpen}
        isNodeSidebarOpen={isNodeSidebarOpen}
        position={chatPosition}
        size={chatSize}
        onHeaderPointerDown={onChatPointerDown}
        onHeaderPointerMove={onChatPointerMove}
        onHeaderPointerUp={onChatPointerUp}
        onResizePointerDown={onChatResizePointerDown}
        onResizePointerMove={onChatResizePointerMove}
        onResizePointerUp={onChatResizePointerUp}
        onClose={onCloseChat}
        onOpenNearLauncher={onOpenChatNearLauncher}
        onCreateUnreadMailSummaryWorkflow={onCreateUnreadMailSummaryWorkflow}
        onCreateGithubPrReviewWorkflow={onCreateGithubPrReviewWorkflow}
      />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>워크플로우 설정</DialogTitle>
            <DialogDescription>
              이름, 설명, 공유 범위와 실패 알림 정책을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="block text-sm font-black text-slate-950">기본 정보</strong>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-slate-500">워크플로우 이름</span>
                  <Input
                    value={workflowName}
                    onChange={(event) => onWorkflowNameChange(event.target.value)}
                    placeholder="워크플로우 이름"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-slate-500">워크플로우 설명</span>
                  <textarea
                    value={workflowDescription}
                    onChange={(event) => onWorkflowDescriptionChange(event.target.value)}
                    className="min-h-24 rounded-md border border-input bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="이 워크플로우가 어떤 일을 하는지 입력하세요."
                  />
                </label>
              </div>
            </section>

            <SettingToggle
              title="워크플로우 상태"
              description={
                isWorkflowActive
                  ? '활성화되어 실행과 알림 대상에 포함됩니다.'
                  : '비활성화되어 실행과 예약 대상에서 제외됩니다.'
              }
              checked={isWorkflowActive}
              onCheckedChange={onWorkflowActiveChange}
              checkedLabel="활성"
              uncheckedLabel="비활성"
            />

            <SettingToggle
              title="팀 공유"
              description={
                isTeamShared
                  ? `${sharedTeamName} 팀에 공유되고 있습니다.`
                  : '현재 개인 워크플로우로 저장되어 있습니다.'
              }
              checked={isTeamShared}
              onCheckedChange={onTeamSharedChange}
              checkedLabel="팀 공유 켜짐"
              uncheckedLabel="팀 공유 꺼짐"
            />

            {isTeamShared && selectedTeam && (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <strong className="block text-sm font-black text-slate-950">공유 팀</strong>
                <span className="mt-1 block text-sm text-slate-500">
                  {selectedTeam.name} · Slack {selectedTeam.defaultSlackChannel}
                </span>
                <div className="mt-3 grid gap-2">
                  {availableTeams.map((team) => {
                    const isSelectedTeam = team.id === sharedTeamId;

                    return (
                      <button
                        key={team.id}
                        type="button"
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border bg-white p-3 text-left',
                          isSelectedTeam
                            ? 'border-slate-950 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50',
                        )}
                        onClick={() => onSharedTeamChange(team.id)}
                      >
                        <span>
                          <strong className="block text-sm font-black text-slate-950">
                            {team.name}
                          </strong>
                          <small className="mt-1 block text-xs text-slate-500">
                            Slack {team.defaultSlackChannel} · 팀원 {team.memberCount}명
                          </small>
                        </span>
                        <Badge variant={isSelectedTeam ? 'default' : 'secondary'}>
                          {isSelectedTeam ? '선택됨' : '선택'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <InfoRow
                title="실패 알림"
                description={
                  isTeamShared
                    ? `${sharedTeamName} 팀 채널과 계정주에게 10분마다 알림`
                    : '계정주에게 15분마다 알림'
                }
              />
              <div>
                <strong className="block text-sm font-black text-slate-950">알림 수신처</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  {failureNotificationTargets.map((target) => (
                    <Badge key={target} variant="secondary">
                      {target}
                    </Badge>
                  ))}
                </div>
              </div>
              <InfoRow
                title="공유 권한"
                description={
                  isTeamShared
                    ? '팀원은 워크플로우를 조회하고 복제할 수 있습니다.'
                    : '본인만 조회하고 실행할 수 있습니다.'
                }
              />
            </section>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => setIsSettingsOpen(false)}>
              완료
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {workflowModal}
    </main>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  checkedLabel,
  uncheckedLabel,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  checkedLabel: string;
  uncheckedLabel: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <section className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <strong className="block text-sm font-black text-slate-950">{title}</strong>
        <span className="mt-1 block text-sm text-slate-500">{description}</span>
      </div>
      <label className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-700">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
        <span>{checked ? checkedLabel : uncheckedLabel}</span>
      </label>
    </section>
  );
}

function InfoRow({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <strong className="block text-sm font-black text-slate-950">{title}</strong>
      <span className="mt-1 block text-sm text-slate-500">{description}</span>
    </div>
  );
}
