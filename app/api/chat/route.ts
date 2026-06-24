import { NextResponse } from 'next/server';
import {
  detectSensitiveInfo,
  isInScopeChatRequest,
  offTopicReply,
  sensitiveInfoReply,
} from '../../../src/domains/chat/safety';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const fallbackReply =
  'LLM 연결을 사용하려면 서버 환경변수 OPENAI_API_KEY를 설정해야 합니다. 지금은 데모 모드로 동작 중입니다.';

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const body = (await request.json().catch(() => null)) as
    | { messages?: ChatMessage[] }
    | null;
  const messages = body?.messages?.filter(
    (message) =>
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0,
  );

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { reply: '메시지를 입력해 주세요.' },
      { status: 400 },
    );
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user');

  if (latestUserMessage && detectSensitiveInfo(latestUserMessage.content)) {
    return NextResponse.json(
      { reply: sensitiveInfoReply, blocked: true },
      { status: 400 },
    );
  }

  if (latestUserMessage && !isInScopeChatRequest(latestUserMessage.content)) {
    return NextResponse.json(
      { reply: offTopicReply, blocked: true },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            '너는 Nodease 워크플로우 빌더 안의 한국어 AI 도우미다. 사용자의 자연어 요청을 워크플로우 구성, 노드 추천, 실행 전 점검, 실패 큐 대응 관점에서 짧고 실행 가능하게 답한다.',
        },
        ...messages.slice(-12),
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        reply:
          'LLM 호출에 실패했습니다. Provider API Key와 모델 설정을 확인해 주세요.',
      },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();

  return NextResponse.json({
    reply: reply || '응답을 생성하지 못했습니다. 다시 시도해 주세요.',
  });
}
