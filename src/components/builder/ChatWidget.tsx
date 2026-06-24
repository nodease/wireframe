'use client';

import { Bot, X } from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { cn } from '@/src/lib/utils';
import {
  detectSensitiveInfo,
  isInScopeChatRequest,
  offTopicReply,
  sensitiveInfoReply,
} from '../../domains/chat/safety';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  action?: 'createUnreadMailSummaryWorkflow' | 'createGithubPrReviewWorkflow';
};

export type ChatResizeDirection = 'top' | 'right' | 'bottom' | 'left';

type ChatWidgetProps = {
  isOpen: boolean;
  isNodeSidebarOpen: boolean;
  position: { x: number; bottom: number };
  size: { width: number; height: number };
  onHeaderPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onHeaderPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onHeaderPointerUp: () => void;
  onResizePointerDown: (
    direction: ChatResizeDirection,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onResizePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onResizePointerUp: () => void;
  onClose: () => void;
  onOpenNearLauncher: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onCreateUnreadMailSummaryWorkflow: () => void;
  onCreateGithubPrReviewWorkflow: () => void;
};

export function ChatWidget({
  isOpen,
  isNodeSidebarOpen,
  position,
  size,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onClose,
  onOpenNearLauncher,
  onCreateUnreadMailSummaryWorkflow,
  onCreateGithubPrReviewWorkflow,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: 'end',
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  const isUnreadMailSummaryRequest = (content: string) => {
    const normalizedContent = content.toLowerCase();

    return (
      (content.includes('안읽') || content.includes('안 읽')) &&
      (content.includes('메일') || normalizedContent.includes('gmail')) &&
      content.includes('요약') &&
      (content.includes('슬랙') || normalizedContent.includes('slack'))
    );
  };
  const isGithubPrReviewRequest = (content: string) => {
    const normalizedContent = content.toLowerCase();

    return (
      (normalizedContent.includes('github') || content.includes('깃허브')) &&
      (normalizedContent.includes('pr') || content.includes('풀리퀘')) &&
      (content.includes('리뷰') || normalizedContent.includes('review'))
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextContent = inputValue.trim();
    if (!nextContent || isSending) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: nextContent },
    ];

    setMessages(nextMessages);
    setInputValue('');

    if (detectSensitiveInfo(nextContent)) {
      setMessages([...nextMessages, { role: 'assistant', content: sensitiveInfoReply }]);
      return;
    }

    if (!isInScopeChatRequest(nextContent)) {
      setMessages([...nextMessages, { role: 'assistant', content: offTopicReply }]);
      return;
    }

    if (isUnreadMailSummaryRequest(nextContent)) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            '다음 워크플로우를 세로 흐름으로 생성할 수 있습니다.\n\n1. Time Trigger 노드: 정해진 시간마다 실행을 시작합니다.\n2. Gmail Reader 노드: 안읽은 메일을 가져옵니다.\n3. LLM: 요약 노드: 메일 내용을 핵심 요약으로 정리합니다.\n4. Slack Sender 노드: 요약 결과를 Slack 채널로 전송합니다.',
          action: 'createUnreadMailSummaryWorkflow',
        },
      ]);
      return;
    }

    if (isGithubPrReviewRequest(nextContent)) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            '다음 GitHub PR 리뷰 워크플로우를 생성할 수 있습니다.\n\n1. Webhook Trigger 노드: PR 요청 이벤트를 받습니다.\n2. 보안 AI Agent 노드: 취약점, 비밀정보, 권한 문제를 검토합니다.\n3. 성능 AI Agent 노드: 병목, 불필요한 연산, 확장성 문제를 검토합니다.\n4. 코드스타일 AI Agent 노드: 일관성, 네이밍, 유지보수성을 검토합니다.\n5. PM AI Agent 노드: 3개 리뷰 결과를 받아 PR 메시지로 정리합니다.\n6. GitHub PR 노드: 정리된 리뷰 메시지를 PR에 작성합니다.',
          action: 'createGithubPrReviewWorkflow',
        },
      ]);
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await response.json()) as { reply?: string };

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content:
            data.reply ??
            '응답을 받지 못했습니다. Provider 설정을 확인한 뒤 다시 시도해 주세요.',
        },
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: '챗봇 서버에 연결하지 못했습니다. 로컬 서버 상태를 확인해 주세요.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="icon"
        className={cn(
          'fixed bottom-6 z-40 h-12 w-12 rounded-full shadow-lg',
          isNodeSidebarOpen ? 'left-[324px]' : 'left-[96px]',
        )}
        onClick={onOpenNearLauncher}
        aria-label="AI 챗봇 열기"
      >
        <Bot size={22} />
      </Button>
    );
  }

  return (
    <section
      className="fixed z-40 flex min-h-[360px] min-w-[320px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      style={{
        left: position.x,
        bottom: position.bottom,
        width: size.width,
        height: size.height,
        maxWidth: 'min(680px, calc(100vw - 24px))',
        maxHeight: 'calc(100vh - 24px)',
      }}
    >
      <div
        className="flex cursor-move items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerLeave={onHeaderPointerUp}
      >
        <div>
          <strong className="block text-sm font-black text-slate-950">AI 챗봇</strong>
          <span className="block text-xs text-slate-500">워크플로우 생성 도우미</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="챗봇 닫기"
        >
          <X size={15} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-slate-50 p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                'max-w-[88%] whitespace-pre-line rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm',
                message.role === 'user' &&
                  'ml-auto border-slate-900 bg-slate-900 text-white',
              )}
            >
              {message.content}
              {message.action === 'createUnreadMailSummaryWorkflow' && (
                <ChatActionCard
                  title="생성할까요?"
                  buttonLabel="워크플로우 생성"
                  onClick={onCreateUnreadMailSummaryWorkflow}
                />
              )}
              {message.action === 'createGithubPrReviewWorkflow' && (
                <ChatActionCard
                  title="생성할까요?"
                  buttonLabel="PR 리뷰 워크플로우 생성"
                  onClick={onCreateGithubPrReviewWorkflow}
                />
              )}
            </div>
          ))}
          {isSending && (
            <div className="max-w-[88%] rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-sm">
              답변을 생성하는 중입니다...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="flex gap-2 border-t border-slate-200 bg-white p-3" onSubmit={handleSubmit}>
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="어떤 도움이 필요하신가요?"
          />
          <Button type="submit" disabled={isSending || !inputValue.trim()}>
            전송
          </Button>
        </form>
      </div>

      {(['top', 'right', 'bottom', 'left'] as const).map((direction) => (
        <button
          key={direction}
          type="button"
          className={cn(
            'absolute z-10 bg-transparent',
            direction === 'top' && 'left-0 top-0 h-2 w-full cursor-ns-resize',
            direction === 'right' && 'right-0 top-0 h-full w-2 cursor-ew-resize',
            direction === 'bottom' && 'bottom-0 left-0 h-2 w-full cursor-ns-resize',
            direction === 'left' && 'left-0 top-0 h-full w-2 cursor-ew-resize',
          )}
          onPointerDown={(event) => onResizePointerDown(direction, event)}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerLeave={onResizePointerUp}
          aria-label={`챗봇 ${direction} 크기 조정`}
        />
      ))}
    </section>
  );
}

function ChatActionCard({
  title,
  buttonLabel,
  onClick,
}: {
  title: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <strong className="block text-sm font-black text-slate-950">{title}</strong>
      <Button type="button" size="sm" className="mt-2" onClick={onClick}>
        {buttonLabel}
      </Button>
    </div>
  );
}
