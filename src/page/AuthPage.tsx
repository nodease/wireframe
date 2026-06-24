'use client';

import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';

type AuthPageProps = {
  mode: 'login' | 'signup';
  onBack: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthPage({ mode, onBack, onSwitchMode, onSubmit }: AuthPageProps) {
  const isSignup = mode === 'signup';

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <Button type="button" variant="ghost" className="-ml-3 mb-8" onClick={onBack}>
            Nodease
          </Button>

          <div className="mb-8">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
              {isSignup ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            </span>
            <h1 className="text-3xl font-semibold text-slate-950">
              {isSignup ? '회원가입' : '로그인'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isSignup
                ? '팀과 공유할 워크플로우 작업 공간을 생성합니다.'
                : '계정으로 로그인하면 Nodease 홈화면으로 이동합니다.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {isSignup && (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">이름</span>
                <Input required placeholder="김민지" />
              </label>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">이메일</span>
              <Input required type="email" placeholder="name@company.com" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">비밀번호</span>
              <Input required type="password" placeholder="8자 이상 입력" />
            </label>
            {isSignup && (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">팀 이름</span>
                <Input placeholder="예: Nodease Product" />
              </label>
            )}
            <Button type="submit" className="w-full justify-center">
              {isSignup ? '가입하고 홈화면으로 이동' : '로그인'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            {isSignup ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}
            <button
              type="button"
              className="font-semibold text-slate-950"
              onClick={() => onSwitchMode(isSignup ? 'login' : 'signup')}
            >
              {isSignup ? '로그인' : '회원가입'}
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
