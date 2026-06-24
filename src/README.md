# UI 구조

이 폴더는 데모 UI를 다른 React/Next 프로젝트에서도 옮겨 쓰기 쉽도록 나눈 영역입니다.

Codex 작업자는 루트의 `AGENTS.md`와 `CODEX_REUSE_RULES.md`를 우선 기준으로 삼아야 합니다.

## folders

- `components/`: 재사용 가능한 작은 UI 단위입니다.
  - `analytics/`: 통계 화면 조각
  - `builder/`: React Flow 기반 워크플로우 빌더 조각
  - `flow/`: React Flow 래퍼
  - `workflow/`: 워크플로우 목록, 액션 버튼 등
  - `ui/`: shadcn 호환 기본 UI 컴포넌트
- `layers/`: 여러 페이지가 공유하는 큰 레이아웃입니다.
  - `dashboard/`: 사이드바 기반 대시보드 레이아웃
- `page/`: 화면 단위 조합 컴포넌트입니다. Next의 `pages` 라우터와 충돌하지 않도록 단수 폴더명을 씁니다.
- `domains/`: UI와 분리된 타입, 상수, 계산 로직입니다.
  - `workflow/`: 워크플로우 타입과 통계 계산 로직
- `mocks/`: 시연용 더미 데이터입니다. 백엔드 연결 시 이 폴더부터 교체하면 됩니다.

## import entrypoints

```ts
import { AnalyticsView, WorkflowListItem } from './src/components';
import { DashboardSidebar } from './src/layers';
import { buildWorkflowAnalytics, summarizeAnalytics } from './src/domains/workflow';
```

## styling

화면 컴포넌트는 TailwindCSS와 `src/components/ui`의 shadcn 호환 컴포넌트를 기준으로 작성되어 있습니다.
이제 `app/page.module.css` 의존은 없습니다.

## container boundary

`app/HomeClient.tsx`는 아직 데모 앱의 최상위 상태 컨테이너입니다. 다른 프로젝트로 옮길 때는
`domains`, `components`, `layers`, `page`, `mocks` 폴더를 먼저 옮기고, 실제 API 연결 시
`mocks`와 `HomeClient`의 로컬스토리지 상태를 백엔드 호출로 교체하면 됩니다.
