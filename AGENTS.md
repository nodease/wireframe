# Codex 작업 지침

이 저장소에서 Codex로 코드를 수정할 때는 아래 원칙을 반드시 따른다.

## 답변 언어

- 사용자에게 보내는 답변은 한국어로 작성한다.

## 최우선 목표

- 이 프로젝트의 프론트 코드는 다른 `Next + React + TailwindCSS + React Flow + shadcn` 프로젝트로 옮겨 쓸 수 있어야 한다.
- 새 기능을 만들 때 화면에만 맞춘 일회성 코드를 만들지 말고, 가능한 한 `domains`, `hooks`, `components`, `layers`, `page` 경계 안에 재사용 가능한 단위로 둔다.
- 상세 기준은 `CODEX_REUSE_RULES.md`를 따른다.

## 디렉터리 경계

- `src/components/ui`: shadcn 호환 기본 UI만 둔다. 도메인 지식을 넣지 않는다.
- `src/components/flow`: React Flow 범용 래퍼와 Flow 공통 표현만 둔다.
- `src/components/builder`: 워크플로우 빌더의 재사용 가능한 조각을 둔다.
- `src/components/workflow`: 워크플로우 목록, 행, 배지 등 여러 화면에서 반복되는 UI를 둔다.
- `src/components/analytics`: 보고/통계 화면 조각을 둔다.
- `src/layers`: 사이드바, 앱 셸처럼 여러 페이지가 공유하는 큰 레이아웃을 둔다.
- `src/page`: 화면 단위 조합 컴포넌트를 둔다. Next 라우트 파일은 가능한 한 얇게 유지한다.
- `src/domains`: 타입, 상수, 노드 정의, 통계 계산, 실행 순서 계산처럼 UI와 분리 가능한 순수 로직을 둔다.
- `src/hooks`: 재사용 가능한 상태/브라우저 연동 로직을 둔다.
- `src/mocks`: 시연용 더미 데이터만 둔다. 실제 API 연결 시 이 폴더부터 교체한다.

## 금지 사항

- 새 CSS module을 만들거나 `app/page.module.css` 같은 전역 모듈에 스타일을 몰아넣지 않는다.
- 한 화면에서만 쓰인다는 이유로 `HomeClient.tsx`에 UI, 계산 로직, 더미 데이터, API 경계를 계속 추가하지 않는다.
- 컴포넌트 안에 하드코딩된 더미 데이터와 계산 로직을 섞지 않는다.
- React Flow 노드/엣지 동작을 문자열 DOM 조작으로 처리하지 않는다.
- 페이지 컴포넌트가 localStorage, API 호출, 도메인 계산을 모두 직접 들고 있게 하지 않는다.

## 새 기능 추가 순서

1. 타입과 순수 계산이 필요한지 확인하고 `src/domains`에 먼저 둔다.
2. 더미 데이터가 필요하면 `src/mocks`에 둔다.
3. 반복 UI는 `src/components`에 props 기반 컴포넌트로 만든다.
4. 여러 페이지가 공유하는 구조는 `src/layers`에 둔다.
5. 화면 조합은 `src/page`에 둔다.
6. `app/*/page.tsx`는 해당 page 컴포넌트를 연결하는 얇은 라우트로 유지한다.
7. `HomeClient.tsx`에 코드를 추가해야 한다면, 상태 연결과 라우팅 수준으로만 제한한다.

## 검증

작업 후 최소한 아래를 확인한다.

```powershell
npx tsc --noEmit
rg -n "page\\.module\\.css|styles\\." app src --glob "*.tsx" --glob "*.ts"
```

라우트 변경이 있으면 관련 URL이 `200`으로 응답하는지도 확인한다.
