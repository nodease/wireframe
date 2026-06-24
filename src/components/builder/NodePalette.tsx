'use client';

import { ChevronLeft, ChevronRight, Search, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { cn } from '@/src/lib/utils';

export type NodePaletteItem = {
  label: string;
  description: string;
  icon: LucideIcon;
};

type NodePaletteProps = {
  isOpen: boolean;
  nodeSearch: string;
  nodes: NodePaletteItem[];
  onSearchChange: (value: string) => void;
  onToggle: () => void;
  onCreateNode: (node: NodePaletteItem) => void;
};

type NodeCategory = 'all' | 'trigger' | 'ai' | 'mcp' | 'data' | 'control' | 'output';

const nodeCategories: Array<{ id: NodeCategory; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'trigger', label: '트리거' },
  { id: 'ai', label: 'AI' },
  { id: 'mcp', label: 'MCP' },
  { id: 'data', label: '데이터' },
  { id: 'control', label: '제어' },
  { id: 'output', label: '출력' },
];

const getNodeCategory = (label: string): NodeCategory => {
  if (label.includes('Trigger')) {
    return 'trigger';
  }

  if (label === 'LLM' || label === 'AI Agent') {
    return 'ai';
  }

  if (label.includes('MCP') || label.includes('Tool')) {
    return 'mcp';
  }

  if (
    label.includes('Gmail') ||
    label.includes('Google Sheets') ||
    label.includes('메일') ||
    label.includes('Slack')
  ) {
    return 'data';
  }

  if (
    label === 'Merge' ||
    label === '조건 분기' ||
    label === 'Guardrails' ||
    label === '코드 실행' ||
    label === 'Python Code'
  ) {
    return 'control';
  }

  if (label === 'Output' || label === '응답' || label === '문서 검증') {
    return 'output';
  }

  return 'control';
};

export function NodePalette({
  isOpen,
  nodeSearch,
  nodes,
  onSearchChange,
  onToggle,
  onCreateNode,
}: NodePaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory>('all');
  const categorizedNodes = useMemo(
    () =>
      selectedCategory === 'all'
        ? nodes
        : nodes.filter((node) => getNodeCategory(node.label) === selectedCategory),
    [nodes, selectedCategory],
  );

  return (
    <aside
      className={cn(
        'relative z-10 h-full shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200',
        isOpen ? 'w-[300px] px-4 py-4' : 'w-[72px] px-0 py-3',
      )}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute -right-4 top-6 z-20 h-8 w-8 rounded-full bg-white shadow-sm"
        onClick={onToggle}
        aria-label={isOpen ? '노드 사이드바 접기' : '노드 사이드바 펼치기'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </Button>

      {isOpen ? (
        <div className="flex h-full flex-col gap-4">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              className="pl-9"
              value={nodeSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="노드 검색"
            />
          </label>

          <div className="flex flex-wrap gap-1.5" aria-label="노드 분류">
            {nodeCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-black transition-colors',
                  selectedCategory === category.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1">
            {categorizedNodes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
                <strong className="block font-black text-slate-800">노드가 없습니다</strong>
                <span className="mt-1 block text-slate-500">
                  검색어 또는 분류를 바꿔보세요.
                </span>
              </div>
            ) : null}
            {categorizedNodes.map((node) => {
              const Icon = node.icon;

              return (
                <button
                  key={node.label}
                  type="button"
                  className="flex min-h-[82px] w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                  onClick={() => onCreateNode(node)}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
                    <Icon size={21} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-black text-slate-950">
                      {node.label}
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-slate-500">
                      {node.description}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
