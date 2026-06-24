'use client';

import { DatabaseZap, FileCheck2, Plus, Search } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';

const knowledgeMetrics = [
  { label: '등록 문서', value: '128', icon: DatabaseZap },
  { label: '임베딩 완료', value: '96%', icon: FileCheck2 },
  { label: '오늘 검색', value: '42', icon: Search },
];

const knowledgeSources = [
  { name: '제품 FAQ', meta: '12개 문서' },
  { name: '고객 문의 로그', meta: '84개 청크' },
  { name: '운영 정책 문서', meta: '32개 문서' },
];

export function KnowledgePage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">지식기반</h2>
          <p className="mt-2 text-sm text-slate-500">
            RAG 검색에 사용할 문서와 데이터 소스를 관리합니다.
          </p>
        </div>
        <Button type="button">
          <Plus className="h-4 w-4" />
          지식 추가
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {knowledgeMetrics.map(({ label, value, icon: Icon }) => (
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
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-950">RAG 데이터 소스</h3>
          <p className="text-sm text-slate-500">검색 가능한 지식 컬렉션</p>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {knowledgeSources.map((source) => (
            <div
              key={source.name}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <strong className="block text-sm font-semibold text-slate-950">
                  {source.name}
                </strong>
                <span className="text-sm text-slate-500">{source.meta}</span>
              </div>
              <small className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Ready
              </small>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
