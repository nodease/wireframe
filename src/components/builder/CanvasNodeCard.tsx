'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Settings2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { memo, useMemo, useState } from 'react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { cn } from '@/src/lib/utils';
import type { CanvasNode, ExecutionLog } from '../../domains/workflow/types';
import {
  knowledgeDocuments,
  registeredAgentModels,
} from '../../domains/workflow/knowledge';

export type CanvasNodeCardData = {
  canvasNode: CanvasNode;
  runStatus: 'running' | 'success' | 'failed' | null;
  onToggleNodeDetails: (nodeId: number) => void;
  onUpdateNodeConfig: (
    nodeId: number,
    key:
      | 'notionPrompt'
      | 'notionPromptExecuted'
      | 'notionProjectKeyword'
      | 'notionDatabaseId'
      | 'agentModel'
      | 'agentPrompt'
      | 'agentRagDocumentIds'
      | 'agentOutputFormat',
    value: string | boolean | string[],
  ) => void;
  onExecuteNotionPrompt: (nodeId: number) => void;
  getNodeRunProfile: (node: CanvasNode) => Pick<ExecutionLog, 'duration' | 'credits'>;
};

function CanvasNodeCardComponent({ data, selected }: NodeProps) {
  const {
    canvasNode: node,
    runStatus,
    onToggleNodeDetails,
    onUpdateNodeConfig,
    onExecuteNotionPrompt,
  } = data as unknown as CanvasNodeCardData;
  const Icon = node.icon;
  const [isRagPanelOpen, setIsRagPanelOpen] = useState(false);
  const [ragTab, setRagTab] = useState<'select' | 'linked'>('select');
  const [modelSearch, setModelSearch] = useState('');
  const [ragSearch, setRagSearch] = useState('');
  const [linkedSearch, setLinkedSearch] = useState('');
  const selectedRagDocumentIds = node.config?.agentRagDocumentIds ?? [];
  const filteredRegisteredModels = useMemo(() => {
    const keyword = modelSearch.trim().toLowerCase();

    if (!keyword) {
      return registeredAgentModels;
    }

    return registeredAgentModels.filter((model) => model.toLowerCase().includes(keyword));
  }, [modelSearch]);
  const selectedRagDocuments = knowledgeDocuments.filter((document) =>
    selectedRagDocumentIds.includes(document.id),
  );
  const filteredKnowledgeDocuments = useMemo(() => {
    const keyword = ragSearch.trim().toLowerCase();

    if (!keyword) {
      return knowledgeDocuments;
    }

    return knowledgeDocuments.filter((document) =>
      `${document.title} ${document.location}`.toLowerCase().includes(keyword),
    );
  }, [ragSearch]);
  const filteredLinkedDocuments = useMemo(() => {
    const keyword = linkedSearch.trim().toLowerCase();

    if (!keyword) {
      return selectedRagDocuments;
    }

    return selectedRagDocuments.filter((document) =>
      `${document.title} ${document.location}`.toLowerCase().includes(keyword),
    );
  }, [linkedSearch, selectedRagDocuments]);
  const toggleRagDocument = (documentId: string) => {
    const nextDocumentIds = selectedRagDocumentIds.includes(documentId)
      ? selectedRagDocumentIds.filter((selectedId) => selectedId !== documentId)
      : [...selectedRagDocumentIds, documentId];

    onUpdateNodeConfig(node.id, 'agentRagDocumentIds', nextDocumentIds);
  };
  const nodeDescription =
    node.typeLabel === 'Notion MCP' && !node.config?.notionPromptExecuted
      ? '프롬프트를 입력하고 실행하면 노션 작업 설정이 생성됩니다'
      : node.description;

  return (
    <div
      className={cn(
        'relative flex min-w-[280px] max-w-[360px] gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm transition',
        selected && 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.18)]',
        node.isExpanded && 'min-w-[420px] max-w-[520px] flex-col gap-4',
        node.isExpanded && node.typeLabel === 'AI Agent' && 'min-w-[520px]',
        runStatus === 'running' && 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.14)]',
        runStatus === 'success' && 'border-emerald-500',
        runStatus === 'failed' && 'border-red-500',
      )}
      data-node-id={node.id}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="!h-5 !w-5 !border-2 !border-white !bg-blue-600"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!h-5 !w-5 !border-2 !border-white !bg-blue-600"
      />

      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
          {node.typeLabel}
        </span>
        <strong className="block text-base font-semibold leading-5 text-slate-950">
          {node.label}
        </strong>
        <small className="mt-1 block text-sm leading-5 text-slate-500">
          {nodeDescription}
        </small>
      </span>

      {runStatus && (
        <Badge
          className="absolute right-12 top-4"
          variant={
            runStatus === 'running'
              ? 'secondary'
              : runStatus === 'success'
                ? 'success'
                : 'warning'
          }
        >
          {runStatus === 'running' ? '실행 중' : runStatus === 'success' ? '완료' : '실패'}
        </Badge>
      )}

      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="nodrag nopan absolute right-3 top-3 h-8 w-8"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onToggleNodeDetails(node.id);
        }}
        aria-label={
          node.isExpanded
            ? `${node.label} 상세 옵션 작게 보기`
            : `${node.label} 상세 옵션 크게 보기`
        }
      >
        <Settings2 size={14} />
      </Button>

      {node.isExpanded && (
        <div
          className="nodrag nopan w-full rounded-xl border border-slate-200 bg-slate-50 p-4"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {node.typeLabel === 'Notion MCP' ? (
            <NotionDetails
              node={node}
              onUpdateNodeConfig={onUpdateNodeConfig}
              onExecuteNotionPrompt={onExecuteNotionPrompt}
            />
          ) : node.typeLabel === 'AI Agent' ? (
            <AgentDetails
              node={node}
              modelSearch={modelSearch}
              ragSearch={ragSearch}
              linkedSearch={linkedSearch}
              ragTab={ragTab}
              isRagPanelOpen={isRagPanelOpen}
              filteredRegisteredModels={filteredRegisteredModels}
              filteredKnowledgeDocuments={filteredKnowledgeDocuments}
              filteredLinkedDocuments={filteredLinkedDocuments}
              selectedRagDocuments={selectedRagDocuments}
              selectedRagDocumentIds={selectedRagDocumentIds}
              onModelSearchChange={setModelSearch}
              onRagSearchChange={setRagSearch}
              onLinkedSearchChange={setLinkedSearch}
              onRagTabChange={setRagTab}
              onRagPanelOpenChange={setIsRagPanelOpen}
              onToggleRagDocument={toggleRagDocument}
              onUpdateNodeConfig={onUpdateNodeConfig}
            />
          ) : (
            <DefaultDetails node={node} />
          )}
        </div>
      )}
    </div>
  );
}

function NotionDetails({
  node,
  onUpdateNodeConfig,
  onExecuteNotionPrompt,
}: {
  node: CanvasNode;
  onUpdateNodeConfig: CanvasNodeCardData['onUpdateNodeConfig'];
  onExecuteNotionPrompt: CanvasNodeCardData['onExecuteNotionPrompt'];
}) {
  if (node.config?.notionPromptExecuted) {
    return (
      <>
        <DetailsHeader
          title="노션 프로젝트 & 일정 추출기"
          description="노션 프로젝트 페이지를 검색하고 일정 데이터베이스를 조회합니다"
        />
        <div className="grid gap-3">
          <Field label="프로젝트 키워드">
            <Input
              value={node.config?.notionProjectKeyword ?? ''}
              onChange={(event) =>
                onUpdateNodeConfig(node.id, 'notionProjectKeyword', event.target.value)
              }
              placeholder="프로젝트 키워드 또는 페이지 제목 입력"
            />
          </Field>
          <Field label="데이터베이스 ID">
            <Input
              value={node.config?.notionDatabaseId ?? ''}
              onChange={(event) =>
                onUpdateNodeConfig(node.id, 'notionDatabaseId', event.target.value)
              }
              placeholder="일정/캘린더 데이터베이스 ID 입력 (선택)"
            />
          </Field>
        </div>
      </>
    );
  }

  return (
    <>
      <DetailsHeader
        title="노션 MCP 프롬프트"
        description="수행할 노션 검색 및 데이터베이스 작업을 먼저 입력하세요."
      />
      <Field label="프롬프트">
        <textarea
          className={textareaClassName}
          value={node.config?.notionPrompt ?? ''}
          onChange={(event) =>
            onUpdateNodeConfig(node.id, 'notionPrompt', event.target.value)
          }
          placeholder="예: 프로젝트 페이지를 찾고 일정 데이터베이스에서 이번 주 일정을 추출해줘"
        />
      </Field>
      <Button
        type="button"
        className="mt-3"
        disabled={!node.config?.notionPrompt?.trim()}
        onClick={(event) => {
          event.stopPropagation();
          onExecuteNotionPrompt(node.id);
        }}
      >
        실행
      </Button>
    </>
  );
}

function AgentDetails({
  node,
  modelSearch,
  ragSearch,
  linkedSearch,
  ragTab,
  isRagPanelOpen,
  filteredRegisteredModels,
  filteredKnowledgeDocuments,
  filteredLinkedDocuments,
  selectedRagDocuments,
  selectedRagDocumentIds,
  onModelSearchChange,
  onRagSearchChange,
  onLinkedSearchChange,
  onRagTabChange,
  onRagPanelOpenChange,
  onToggleRagDocument,
  onUpdateNodeConfig,
}: {
  node: CanvasNode;
  modelSearch: string;
  ragSearch: string;
  linkedSearch: string;
  ragTab: 'select' | 'linked';
  isRagPanelOpen: boolean;
  filteredRegisteredModels: string[];
  filteredKnowledgeDocuments: typeof knowledgeDocuments;
  filteredLinkedDocuments: typeof knowledgeDocuments;
  selectedRagDocuments: typeof knowledgeDocuments;
  selectedRagDocumentIds: string[];
  onModelSearchChange: (value: string) => void;
  onRagSearchChange: (value: string) => void;
  onLinkedSearchChange: (value: string) => void;
  onRagTabChange: (tab: 'select' | 'linked') => void;
  onRagPanelOpenChange: (isOpen: boolean) => void;
  onToggleRagDocument: (documentId: string) => void;
  onUpdateNodeConfig: CanvasNodeCardData['onUpdateNodeConfig'];
}) {
  return (
    <>
      <DetailsHeader
        title="AI Agent 상세 설정"
        description="모델, 프롬프트, RAG 문서, 출력 형식을 설정합니다."
      />
      <div className="space-y-4">
        <ConfigSection title="1. 모델" description="Provider로 등록된 모델 중 하나를 선택합니다.">
          {registeredAgentModels.length === 0 ? (
            <Notice>등록된 Provider 모델이 없습니다. 계정관리에서 Provider를 먼저 등록하세요.</Notice>
          ) : (
            <>
              <Input
                placeholder="모델 검색"
                value={modelSearch}
                onChange={(event) => onModelSearchChange(event.target.value)}
              />
              <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-auto">
                {filteredRegisteredModels.map((model) => (
                  <button
                    key={model}
                    type="button"
                    className={cn(
                      'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600',
                      node.config?.agentModel === model &&
                        'border-slate-950 bg-slate-950 text-white',
                    )}
                    onClick={() => onUpdateNodeConfig(node.id, 'agentModel', model)}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </>
          )}
        </ConfigSection>

        <Field label="2. 프롬프트">
          <textarea
            className={textareaClassName}
            value={node.config?.agentPrompt ?? ''}
            onChange={(event) =>
              onUpdateNodeConfig(node.id, 'agentPrompt', event.target.value)
            }
            placeholder="이 Agent가 수행할 역할과 판단 기준을 입력하세요."
          />
        </Field>

        <ConfigSection title="3. RAG 설정" description="참고할 지식기반 문서를 연결합니다.">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onRagPanelOpenChange(true)}
          >
            RAG 문서 선택 · {selectedRagDocumentIds.length}개 연결
          </Button>
          {isRagPanelOpen && (
            <RagPanel
              ragTab={ragTab}
              ragSearch={ragSearch}
              linkedSearch={linkedSearch}
              filteredKnowledgeDocuments={filteredKnowledgeDocuments}
              filteredLinkedDocuments={filteredLinkedDocuments}
              selectedRagDocuments={selectedRagDocuments}
              selectedRagDocumentIds={selectedRagDocumentIds}
              onRagTabChange={onRagTabChange}
              onRagSearchChange={onRagSearchChange}
              onLinkedSearchChange={onLinkedSearchChange}
              onToggleRagDocument={onToggleRagDocument}
              onClose={() => onRagPanelOpenChange(false)}
            />
          )}
        </ConfigSection>

        <Field label="4. 출력 형식 지정">
          <textarea
            className={textareaClassName}
            value={node.config?.agentOutputFormat ?? ''}
            onChange={(event) =>
              onUpdateNodeConfig(node.id, 'agentOutputFormat', event.target.value)
            }
            placeholder="예: Markdown 표, JSON, 담당자별 체크리스트 등"
          />
        </Field>
      </div>
    </>
  );
}

function RagPanel({
  ragTab,
  ragSearch,
  linkedSearch,
  filteredKnowledgeDocuments,
  filteredLinkedDocuments,
  selectedRagDocuments,
  selectedRagDocumentIds,
  onRagTabChange,
  onRagSearchChange,
  onLinkedSearchChange,
  onToggleRagDocument,
  onClose,
}: {
  ragTab: 'select' | 'linked';
  ragSearch: string;
  linkedSearch: string;
  filteredKnowledgeDocuments: typeof knowledgeDocuments;
  filteredLinkedDocuments: typeof knowledgeDocuments;
  selectedRagDocuments: typeof knowledgeDocuments;
  selectedRagDocumentIds: string[];
  onRagTabChange: (tab: 'select' | 'linked') => void;
  onRagSearchChange: (value: string) => void;
  onLinkedSearchChange: (value: string) => void;
  onToggleRagDocument: (documentId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-[calc(100%+12px)] top-0 z-50 w-[340px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-sm font-semibold text-slate-950">RAG 문서 선택</strong>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>
      <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          className={cn(
            'rounded-md px-2 py-2 text-xs font-semibold text-slate-500',
            ragTab === 'select' && 'bg-white text-slate-950 shadow-sm',
          )}
          onClick={() => onRagTabChange('select')}
        >
          지식기반 문서 선택
        </button>
        <button
          type="button"
          className={cn(
            'rounded-md px-2 py-2 text-xs font-semibold text-slate-500',
            ragTab === 'linked' && 'bg-white text-slate-950 shadow-sm',
          )}
          onClick={() => onRagTabChange('linked')}
        >
          참고 중인 문서
        </button>
      </div>

      {ragTab === 'select' ? (
        <>
          <Input
            value={ragSearch}
            onChange={(event) => onRagSearchChange(event.target.value)}
            placeholder="연동할 문서 검색"
          />
          <DocumentList
            documents={filteredKnowledgeDocuments}
            selectedIds={selectedRagDocumentIds}
            onToggle={onToggleRagDocument}
          />
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <strong className="block text-xs font-semibold text-slate-700">
              선택한 문서/폴더
            </strong>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedRagDocuments.length === 0 ? (
                <span className="text-xs text-slate-400">선택한 문서가 없습니다.</span>
              ) : (
                selectedRagDocuments.map((document) => (
                  <Badge key={document.id} variant="secondary">{document.title}</Badge>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <Input
            value={linkedSearch}
            onChange={(event) => onLinkedSearchChange(event.target.value)}
            placeholder="참고 중인 문서 검색"
          />
          {filteredLinkedDocuments.length === 0 ? (
            <Notice className="mt-3">참고 중인 문서가 없습니다.</Notice>
          ) : (
            <DocumentList
              documents={filteredLinkedDocuments}
              selectedIds={selectedRagDocumentIds}
              onToggle={onToggleRagDocument}
            />
          )}
        </>
      )}

      <Button type="button" className="mt-3 w-full" onClick={onClose}>
        확인
      </Button>
    </div>
  );
}

function DocumentList({
  documents,
  selectedIds,
  onToggle,
}: {
  documents: typeof knowledgeDocuments;
  selectedIds: string[];
  onToggle: (documentId: string) => void;
}) {
  return (
    <div className="mt-3 max-h-52 space-y-2 overflow-auto">
      {documents.map((document) => {
        const isSelected = selectedIds.includes(document.id);

        return (
          <button
            key={document.id}
            type="button"
            className={cn(
              'w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400',
              isSelected && 'border-blue-500 bg-blue-50',
            )}
            onClick={() => onToggle(document.id)}
          >
            <strong className="block text-xs font-semibold text-slate-950">
              {document.title}
            </strong>
            <span className="mt-1 block text-xs text-slate-500">{document.location}</span>
          </button>
        );
      })}
    </div>
  );
}

function DefaultDetails({ node }: { node: CanvasNode }) {
  return (
    <>
      <DetailsHeader title="상세 옵션" description={`${node.label} 설정`} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="노드 이름">
          <Input value={node.label} readOnly />
        </Field>
        <Field label="실행 모드">
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            defaultValue="auto"
          >
            <option value="auto">자동</option>
            <option value="manual">수동</option>
          </select>
        </Field>
      </div>
    </>
  );
}

function DetailsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <strong className="block text-sm font-semibold text-slate-950">{title}</strong>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
    </div>
  );
}

function ConfigSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3">
        <strong className="block text-sm font-semibold text-slate-950">{title}</strong>
        <span className="mt-1 block text-xs text-slate-500">{description}</span>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Notice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-700', className)}>
      {children}
    </div>
  );
}

const textareaClassName =
  'min-h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

export const CanvasNodeCard = memo(CanvasNodeCardComponent);
