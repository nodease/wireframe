'use client';

import { Workflow } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';

const templates = [
  ['고객 문의 자동 분류', '문의 내용을 분류하고 FAQ 지식기반으로 답변 초안을 생성'],
  ['문서 요약 리포트', '업로드 문서를 요약하고 검토 체크리스트를 자동 생성'],
  ['회의 후속 작업 생성', '회의록에서 액션 아이템을 추출해 담당자별 작업 정리'],
  ['장애 알림 분석', '로그와 운영 문서를 바탕으로 원인 후보와 대응안 제안'],
  ['채용 지원서 스크리닝', '이력서와 JD를 비교해 적합도와 질문 후보 생성'],
  ['영업 리드 리서치', '회사 정보를 수집하고 맞춤형 아웃리치 메시지 작성'],
  ['VOC 트렌드 분석', '고객 피드백을 주제별로 묶고 개선 우선순위 산출'],
  ['릴리즈 노트 생성', 'PR과 커밋 요약을 기반으로 배포 노트 초안 작성'],
];

export function MarketplacePage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">마켓플레이스</h2>
        <p className="mt-2 text-sm text-slate-500">
          바로 가져다 쓸 수 있는 워크플로우 템플릿을 둘러봅니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map(([name, description]) => (
          <Card key={name} className="overflow-hidden">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Workflow className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <strong className="block text-base font-semibold text-slate-950">
                  {name}
                </strong>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </div>
              <Button type="button" variant="secondary" className="justify-center">
                템플릿 사용
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
