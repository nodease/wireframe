export type KnowledgeDocument = {
  id: string;
  title: string;
  location: string;
};

// 빌더 데모용 RAG 문서 목록입니다.
// 실제 서비스에서는 FastAPI의 지식기반 API 응답으로 이 배열을 대체하면 됩니다.
export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: 'kb-meeting-summary',
    title: '회의록 정리 가이드',
    location: '지식기반 / 회의 자동화',
  },
  {
    id: 'kb-pr-review',
    title: 'GitHub PR 리뷰 체크리스트',
    location: '지식기반 / 개발 프로세스',
  },
  {
    id: 'kb-code-style-guide',
    title: 'Nodease 코드 스타일 가이드',
    location: '지식기반 / 개발 프로세스 / 코드 스타일',
  },
  {
    id: 'kb-security-policy',
    title: '보안 검토 정책 문서',
    location: '지식기반 / 보안',
  },
  {
    id: 'kb-slack-template',
    title: 'Slack 보고 메시지 템플릿',
    location: '지식기반 / 커뮤니케이션',
  },
];

// Provider 등록 화면과 연결될 모델 더미입니다.
// 추후 OpenAI/Google Provider API 응답으로 교체하기 위한 경계입니다.
export const registeredAgentModels = [
  'OpenAI · gpt-4o-mini',
  'OpenAI · gpt-4o',
  'Google · gemini-1.5-flash',
];
