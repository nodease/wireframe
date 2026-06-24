const sensitivePatterns = [
  {
    label: 'API Key 또는 Access Token',
    pattern:
      /(sk-[A-Za-z0-9_-]{12,}|xox[baprs]-[A-Za-z0-9-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|api[_ -]?key\s*[:=]\s*\S+)/i,
  },
  {
    label: '비밀번호',
    pattern: /(password|passwd|비밀번호|패스워드)\s*[:=]\s*\S+/i,
  },
  {
    label: '주민등록번호',
    pattern: /\b\d{6}-[1-4]\d{6}\b/,
  },
  {
    label: '카드번호',
    pattern: /\b(?:\d[ -]*?){13,19}\b/,
  },
  {
    label: '인증 코드',
    pattern: /(인증\s?코드|verification\s?code|otp)\s*[:=]?\s*\d{4,8}/i,
  },
  {
    label: '개인 키',
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/i,
  },
];

export const sensitiveInfoReply =
  '민감 정보가 포함된 요청은 처리할 수 없습니다. API Key, 비밀번호, 토큰, 주민등록번호, 카드번호 같은 값은 제거하거나 마스킹한 뒤 다시 요청해 주세요.';

export const detectSensitiveInfo = (content: string) =>
  sensitivePatterns.find(({ pattern }) => pattern.test(content)) ?? null;

const inScopePatterns = [
  /워크\s?플로우|workflow/i,
  /노드|node/i,
  /자동화|automation/i,
  /빌더|builder/i,
  /실행|로그|실패|큐|알림|공유|설정|통계|사용량/,
  /gmail|메일|email|slack|슬랙|notion|노션|mcp|llm|agent|ai/i,
  /api\s?key|provider|프로바이더|계정|팀|권한/i,
  /요약|분류|전송|읽어|가져와|생성|연결|저장|삭제|편집|수정/,
];

const shortUtilityPatterns = [
  /^(안녕|안녕하세요|도움|help|\?)$/i,
  /^(뭐 할 수 있어|무엇을 할 수 있어|사용법|가이드)$/i,
];

export const offTopicReply =
  '이 챗봇은 Nodease 워크플로우 생성과 편집, 노드 구성, 실행 로그, 연동 설정을 돕는 용도입니다. 워크플로우 자동화와 관련된 요청으로 다시 입력해 주세요.';

export const isInScopeChatRequest = (content: string) => {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    return true;
  }

  return (
    inScopePatterns.some((pattern) => pattern.test(normalizedContent)) ||
    shortUtilityPatterns.some((pattern) => pattern.test(normalizedContent))
  );
};
