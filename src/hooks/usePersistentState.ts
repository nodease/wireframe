'use client';

import { useEffect, useState } from 'react';

// localStorage 기반 상태를 React state처럼 쓰기 위한 범용 hook입니다.
// 추후 FastAPI 연동 시 이 계층을 API adapter로 교체하면 컴포넌트 변경을 줄일 수 있습니다.
export function usePersistentState<TValue>(
  storageKey: string,
  initialValue: TValue,
) {
  const [value, setValue] = useState<TValue>(initialValue);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue) {
      setValue(JSON.parse(storedValue) as TValue);
    }
    setHasLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoaded || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }, [hasLoaded, storageKey, value]);

  return [value, setValue, hasLoaded] as const;
}
