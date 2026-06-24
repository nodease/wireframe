import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui와 동일한 방식의 className 병합 유틸입니다.
// 조건부 클래스와 Tailwind 충돌 클래스를 안전하게 정리합니다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
