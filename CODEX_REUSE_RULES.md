# 재사용 가능한 프론트 코드 작업 철칙

이 문서는 Nodease wireframe 프론트엔드를 다른 프로젝트로 이식 가능한 형태로 유지하기 위한 작업 기준이다.  
다른 팀원이 Codex를 사용해 기능을 추가하거나 수정할 때도 이 문서를 기준으로 작업한다.

## 현재 리팩토링 상태

현재 프론트는 이식성을 고려해 다음 구조로 정리되어 있다.

- `Next App Router` 라우트는 `app/*/page.tsx`에 있다.
- 실제 화면 조합은 `src/page`에 있다.
- 재사용 컴포넌트는 `src/components`에 있다.
- 사이드바 같은 큰 레이아웃은 `src/layers`에 있다.
- 타입, 노드 정의, 통계 계산, 실행 순서 계산은 `src/domains`에 있다.
- 시연용 데이터는 `src/mocks`에 있다.
- CSS module 의존은 제거했고, 스타일은 TailwindCSS와 shadcn 호환 `src/components/ui`를 기준으로 한다.

단, `app/HomeClient.tsx`는 아직 데모 앱의 최상위 상태 컨테이너다.  
다른 프로젝트에 이식할 때는 `HomeClient.tsx`를 그대로 가져가기보다, 이 파일이 연결하는 `src` 하위 모듈을 가져가고 실제 API 상태 관리로 교체하는 것이 원칙이다.

## 이식 가능한 코드의 기준

이식 가능한 코드는 아래 조건을 만족해야 한다.

- props로 입력을 받고 callback으로 이벤트를 내보낸다.
- localStorage, window history, API 호출, 더미 데이터에 직접 의존하지 않는다.
- 특정 페이지의 레이아웃 크기나 사이드바 상태를 내부에서 가정하지 않는다.
- Tailwind class와 `src/components/ui` 기반으로 스타일을 가진다.
- 도메인 타입은 `src/domains`에서 import한다.
- React Flow 관련 컴포넌트는 React Flow API를 사용하고 DOM 좌표를 임의 문자열로 조작하지 않는다.

## 폴더별 책임

### `app`

Next 라우트만 담당한다.

좋은 예:

```tsx
import HomeClient from '../HomeClient';

export default function WorkflowsPage() {
  return <HomeClient initialView="workflowList" />;
}
```

나쁜 예:

```tsx
export default function WorkflowsPage() {
  const data = JSON.parse(localStorage.getItem('workflows') ?? '[]');
  return <div>{/* 전체 화면 구현 */}</div>;
}
```

### `src/page`

화면 단위 조합을 담당한다.  
비즈니스 계산이나 API 연결을 직접 많이 갖지 않고, props로 받은 데이터를 화면에 배치한다.

예:

- `HomeDashboardPage`
- `WorkflowListPage`
- `WorkflowBuilderPage`
- `WorkflowRunReportPage`
- `AccountPage`

### `src/components`

작고 재사용 가능한 UI 단위를 둔다.

예:

- `WorkflowListItem`
- `WorkflowCanvas`
- `CanvasNodeCard`
- `NodePalette`
- `ChatWidget`
- `AnalyticsView`

컴포넌트는 아래 형태를 우선한다.

```tsx
type ExampleProps = {
  value: string;
  onChange: (value: string) => void;
};

export function Example({ value, onChange }: ExampleProps) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} />;
}
```

### `src/domains`

UI와 무관한 타입, 상수, 순수 함수를 둔다.

예:

- 워크플로우 타입
- 노드 타입 정의
- 실행 순서 계산
- 통계 요약 계산
- 챗봇 안전성 규칙

순수 함수는 같은 입력에 같은 출력을 내야 한다.

```ts
export function summarizeAnalytics(workflows: WorkflowAnalytics[]): AnalyticsSummary {
  // DOM, localStorage, React state 사용 금지
}
```

### `src/mocks`

시연용 더미 데이터만 둔다.  
백엔드 연결 시 이 폴더의 데이터를 API 응답으로 교체한다.

### `src/hooks`

브라우저 상태나 반복되는 React 상태 로직을 둔다.

예:

- `usePersistentState`
- 이후 API 연결 시 `useWorkflows`, `useRunReports` 같은 hook 추가 가능

## 작업할 때 반드시 지킬 규칙

### 1. UI와 데이터 로직을 섞지 않는다

나쁜 예:

```tsx
export function WorkflowListItem() {
  const workflows = JSON.parse(localStorage.getItem('workflows') ?? '[]');
  return <div>{workflows.length}</div>;
}
```

좋은 예:

```tsx
export function WorkflowListItem({ workflow, onOpenBuilder }: Props) {
  return <button onClick={() => onOpenBuilder(workflow)}>{workflow.name}</button>;
}
```

### 2. 더미 데이터는 컴포넌트 안에 넣지 않는다

나쁜 예:

```tsx
const workflows = [{ id: 1, name: 'Demo' }];
```

좋은 예:

```ts
// src/mocks/workflows.ts
export const demoWorkflows = [];
```

### 3. 스타일은 Tailwind와 UI 컴포넌트를 쓴다

나쁜 예:

```tsx
import styles from './page.module.css';
```

좋은 예:

```tsx
<Card>
  <CardContent className="p-5">...</CardContent>
</Card>
```

### 4. 페이지 라우트는 얇게 유지한다

라우트 파일에 화면 전체 구현을 넣지 않는다.  
라우트 파일은 초기 view나 URL params를 연결하는 정도로 유지한다.

### 5. React Flow 컴포넌트는 독립적으로 유지한다

- `FlowCanvas`는 범용 React Flow 래퍼다.
- `WorkflowCanvas`는 워크플로우 도메인용 캔버스다.
- `CanvasNodeCard`는 노드 UI만 담당한다.
- 엣지 삭제, 핸들, 드래그는 React Flow API를 사용한다.

### 6. 보고/로그/통계 화면은 별도 페이지로 유지한다

워크플로우 실행 로그나 실패 큐를 빌더 내부 사이드 패널로 다시 넣지 않는다.  
보고 화면은 `/reports`의 전체 보고와 `/reports?workflowId=...`의 개별 보고로 분리한다.

### 7. 버튼 동작은 명확히 나눈다

- 워크플로우 목록 행 클릭: 빌더로 이동
- `보고` 버튼: 개별 보고 페이지로 이동
- `삭제` 버튼: 삭제 동작

중복되는 `편집` 버튼은 만들지 않는다.

## 백엔드 연결 시 교체 기준

현재는 데모 목적상 `HomeClient.tsx`와 `src/mocks`가 localStorage 기반 상태를 갖는다.  
FastAPI, SQLAlchemy, PostgreSQL과 연결할 때는 아래 순서로 바꾼다.

1. `src/domains/workflow/types.ts` 타입을 API 스키마와 맞춘다.
2. `src/mocks/workflows.ts`를 API adapter로 대체한다.
3. localStorage 읽기/쓰기를 `hooks` 또는 API client로 옮긴다.
4. `HomeClient.tsx`는 API hook을 호출하고 page 컴포넌트에 props만 넘긴다.
5. 기존 `src/components`는 되도록 수정하지 않는다.

## Codex에게 작업을 맡길 때 프롬프트 예시

좋은 프롬프트:

```text
AGENTS.md와 CODEX_REUSE_RULES.md를 지켜서 구현해줘.
새 UI는 props 기반 컴포넌트로 분리하고,
도메인 계산은 src/domains에 둬.
HomeClient에는 상태 연결만 추가해.
```

피해야 할 프롬프트:

```text
그냥 HomeClient에 빨리 넣어줘.
```

## 작업 후 체크리스트

작업이 끝나면 최소한 아래를 확인한다.

```powershell
npx tsc --noEmit
rg -n "page\\.module\\.css|styles\\." app src --glob "*.tsx" --glob "*.ts"
```

그리고 변경한 주요 라우트를 확인한다.

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/dashboard
Invoke-WebRequest -UseBasicParsing http://localhost:3000/workflows
Invoke-WebRequest -UseBasicParsing http://localhost:3000/builder
Invoke-WebRequest -UseBasicParsing http://localhost:3000/reports
```

## 새 PR/브랜치 리뷰 기준

리뷰할 때 아래 질문에 모두 답할 수 있어야 한다.

- 이 컴포넌트를 다른 프로젝트로 복사해도 동작하는가?
- props와 callback으로 충분히 제어 가능한가?
- 더미 데이터가 `src/mocks` 밖에 새로 생기지 않았는가?
- 도메인 계산이 컴포넌트 내부에 숨어 있지 않은가?
- CSS module이나 전역 CSS 의존이 다시 생기지 않았는가?
- `HomeClient.tsx`가 불필요하게 더 커지지 않았는가?
