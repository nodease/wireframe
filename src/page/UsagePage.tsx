'use client';

import { BarChart3, Gauge, Zap } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';

const usageMetrics = [
  { label: '이번 달 실행', value: '1,248', icon: Zap },
  { label: '평균 지연', value: '1.8s', icon: Gauge },
  { label: '예상 비용', value: '$32', icon: BarChart3 },
];

const usageRows = [
  ['LLM 호출', '72%'],
  ['RAG 검색', '48%'],
  ['외부 도구', '34%'],
];

export function UsagePage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">사용량</h2>
        <p className="mt-2 text-sm text-slate-500">
          실행 횟수, 토큰, 비용 흐름을 간단히 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {usageMetrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex flex-col gap-3 p-6">
              <Icon className="h-5 w-5 text-slate-500" />
              <span className="text-sm text-slate-500">{label}</span>
              <strong className="text-3xl font-semibold text-slate-950">{value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          {usageRows.map(([label, value]) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <strong className="font-semibold text-slate-950">{label}</strong>
                <span className="text-slate-500">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-slate-950"
                  style={{ width: value }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
