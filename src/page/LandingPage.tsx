'use client';

import { ArrowRight, Workflow } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

type LandingPageProps = {
  onOpenAuth: (view: 'login' | 'signup') => void;
};

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950">
            <Workflow className="h-5 w-5" />
          </span>
          <strong className="text-lg font-semibold">Nodease</strong>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenAuth('login')}>
            로그인
          </Button>
          <Button type="button" variant="secondary" onClick={() => onOpenAuth('signup')}>
            회원가입
          </Button>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 pb-16 pt-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)] lg:pt-20">
        <div>
          <span className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            AI automation workspace
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-normal md:text-6xl">
            자연어로 업무 흐름을 만들고 팀과 함께 실행하세요.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
            Notion, Slack, Gmail, LLM Provider를 연결해 반복 업무를 워크플로우로
            구성하고 실행 결과를 한 화면에서 확인합니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={() => onOpenAuth('signup')}>
              워크스페이스 만들기
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="border-white/20 bg-transparent text-white hover:bg-white hover:text-slate-950"
              onClick={() => onOpenAuth('login')}
            >
              기존 계정 로그인
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 text-slate-950 shadow-2xl">
          <div className="mb-4 flex gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="grid min-h-[420px] gap-4 rounded-xl bg-slate-100 p-4 md:grid-cols-[180px_1fr]">
            <aside className="space-y-2 rounded-lg bg-white p-3">
              {['홈화면', '워크플로우', 'Provider', '보고'].map((item) => (
                <span
                  key={item}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 first:bg-slate-950 first:text-white"
                >
                  {item}
                </span>
              ))}
            </aside>
            <section className="rounded-lg bg-white p-5">
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                <span className="rounded-lg border border-slate-200 p-4 text-sm font-semibold">
                  활성 워크플로우 12
                </span>
                <span className="rounded-lg border border-slate-200 p-4 text-sm font-semibold">
                  팀 공유 5
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {['Time Trigger', 'AI Agent', 'Notion MCP'].map((node, index) => (
                  <div key={node} className="flex items-center gap-4">
                    <b className="min-w-36 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                      {node}
                    </b>
                    {index < 2 && <i className="h-px flex-1 bg-slate-300" />}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
