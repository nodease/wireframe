# Frontend Architecture

이 프로젝트의 프론트엔드는 다른 Next + React + TailwindCSS + React Flow 프로젝트로 옮기기 쉽도록 아래 계층으로 나눕니다.

Codex로 새 기능을 추가하거나 구조를 바꿀 때는 루트의 `AGENTS.md`와 `CODEX_REUSE_RULES.md`를 먼저 확인합니다.

## components

- `components/ui`: shadcn 호환 공통 UI입니다. `Button`, `Card`, `Input`, `Badge`, `Tabs`, `Switch`처럼 도메인과 무관한 컴포넌트만 둡니다.
- `components/layout`: 대시보드 셸, 네비게이션처럼 앱 레이아웃에 재사용되는 컴포넌트입니다.
- `components/flow`: React Flow 자체를 감싼 범용 컴포넌트입니다. 워크플로우, AI Agent, MCP 같은 Nodease 도메인 지식은 넣지 않습니다.
- `components/workflow`: 여러 화면에서 반복되는 워크플로우 UI 조각입니다.

## features

- `features/workflow`: Nodease 워크플로우 도메인에 묶인 화면/빌더/보고 기능입니다.
- React Flow의 범용 동작은 `components/flow`에 두고, 노드 설정이나 RAG 문서 같은 서비스 기능은 `features/workflow`에 둡니다.

## domains

- 타입, 노드 정의, 통계 계산, 계정 더미 데이터처럼 화면과 분리 가능한 순수 도메인 로직을 둡니다.
- 이후 FastAPI와 연결할 때 이 계층의 mock/localStorage 의존을 API adapter로 바꾸면 됩니다.

## hooks

- 재사용 가능한 상태 로직을 둡니다.
- 예: `usePersistentState`는 localStorage 기반 mock 상태를 관리하며, 추후 API hook으로 교체하기 위한 경계 역할을 합니다.

## app

- Next App Router 경로를 둡니다.
- 기존 `HomeClient`는 아직 데모 상태 컨테이너 역할을 유지하지만, 라우트는 `/dashboard`, `/workflows`, `/builder`, `/reports`처럼 실제 페이지 경로로 나뉘어 있습니다.
