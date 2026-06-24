'use client';

import {
  Bell,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';
import type { User, UserTeam } from '../domains/account/types';
import type { WorkflowRecord } from '../domains/workflow/types';

export type AccountTab = 'profile' | 'security' | 'providers' | 'connections';

type AccountPageProps = {
  accountTab: AccountTab;
  currentUser: User;
  userTeams: UserTeam[];
  workflows: WorkflowRecord[];
  onChangeTab: (tab: AccountTab) => void;
};

const accountTabs: Array<{ id: AccountTab; label: string }> = [
  { id: 'profile', label: '프로필' },
  { id: 'security', label: '보안' },
  { id: 'providers', label: 'Provider 등록' },
  { id: 'connections', label: '연결 서비스' },
];

export function AccountPage({
  accountTab,
  currentUser,
  userTeams,
  workflows,
  onChangeTab,
}: AccountPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">계정관리</h2>
        <p className="mt-2 text-sm text-slate-500">
          프로필, 팀, Provider 등록, 연결된 서비스를 한 곳에서 관리합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {accountTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={cn(
              'border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950',
              accountTab === id && 'border-slate-950 text-slate-950',
            )}
            onClick={() => onChangeTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {accountTab === 'profile' && (
        <ProfileTab
          currentUser={currentUser}
          userTeams={userTeams}
          workflows={workflows}
        />
      )}
      {accountTab === 'security' && <SecurityTab />}
      {accountTab === 'providers' && <ProvidersTab />}
      {accountTab === 'connections' && <ConnectionsTab />}
    </section>
  );
}

function ProfileTab({
  currentUser,
  userTeams,
  workflows,
}: Pick<AccountPageProps, 'currentUser' | 'userTeams' | 'workflows'>) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard icon={ShieldCheck} label="보안 상태" value="정상" />
        <MetricCard icon={Link2} label="연결 서비스" value="3" />
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-950">개인 계정</h3>
          <p className="text-sm text-slate-500">시연용 사용자 계정과 접근 설정</p>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {[
            ['프로필', `${currentUser.name} · ${currentUser.email}`, '관리'],
            ['워크스페이스 역할', `${currentUser.role} · 모든 워크플로우 생성 가능`, '수정'],
            ['알림 설정', '실행 실패와 사용량 알림 수신', '수정'],
          ].map(([name, description, action], index) => {
            const Icon = index === 0 ? UserCog : index === 1 ? KeyRound : Bell;

            return (
              <InfoRow
                key={name}
                icon={Icon}
                title={name}
                description={description}
                action={<Button type="button" variant="secondary" size="sm">{action}</Button>}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-950">연결된 팀</h3>
          <p className="text-sm text-slate-500">
            팀 단위로 워크플로우를 공유하고 공동 편집합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {userTeams.map((team) => {
            const sharedWorkflowCount = workflows.filter(
              (workflow) => workflow.isTeamShared && workflow.teamId === team.id,
            ).length;

            return (
              <div
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <strong className="block text-sm font-semibold text-slate-950">
                    {team.name}
                  </strong>
                  <span className="text-sm text-slate-500">
                    멤버 {team.memberCount}명 · 공유 워크플로우 {sharedWorkflowCount}개 ·
                    Slack {team.defaultSlackChannel}
                  </span>
                </div>
                <Badge variant="secondary">{team.membershipRole}</Badge>
              </div>
            );
          })}
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <strong className="block text-sm font-semibold text-slate-950">
              팀이 없는 개인 계정도 사용할 수 있습니다.
            </strong>
            <span className="mt-1 block text-sm text-slate-500">
              팀이 연결되지 않은 경우 워크플로우는 개인에게만 저장되고, 공유 토글은
              비활성화됩니다.
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function SecurityTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-slate-950">보안 설정</h3>
        <p className="text-sm text-slate-500">계정 접근과 API Key 보호 상태</p>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100">
        {[
          ['비밀번호', '마지막 변경 18일 전', '변경'],
          ['2단계 인증', '인증 앱으로 보호 중', '관리'],
          ['세션 관리', '활성 세션 2개', '확인'],
        ].map(([name, description, action], index) => {
          const Icon = index === 0 ? KeyRound : index === 1 ? ShieldCheck : UserCog;

          return (
            <InfoRow
              key={name}
              icon={Icon}
              title={name}
              description={description}
              action={<Button type="button" variant="secondary" size="sm">{action}</Button>}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function ProvidersTab() {
  const providers = [
    [
      'Google',
      'Google Gemini provider',
      'https://generativelanguage.googleapis.com/v1beta/openai',
      '7개 지원 (gemini-1.5-flash-8b, gemini-3-pro, gemini-3-flash...)',
      false,
    ],
    [
      'OpenAI',
      'OpenAI default provider',
      'https://api.openai.com/v1',
      '138개 지원 (chatgpt-4o-latest, gpt-4o-audio-preview...)',
      true,
    ],
    [
      'Anthropic',
      'Anthropic Claude provider',
      'https://api.anthropic.com/v1',
      '15개 지원 (claude-3-5-opus, claude-3-5-sonnet...)',
      false,
    ],
    [
      'LlamaParse',
      'LlamaParse high-quality document parser',
      'https://api.cloud.llamaindex.ai',
      '0개 지원',
      false,
    ],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-slate-950">LLM Provider 설정</h3>
        <p className="mt-2 text-sm text-slate-500">
          시스템이 지원하는 Provider에 본인의 API Key를 등록하여 사용하세요.
        </p>
      </div>

      {providers.map(([name, description, baseUrl, models, connected]) => (
        <Card key={name}>
          <CardContent className="p-5">
            <div className="flex flex-wrap justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-base font-semibold text-slate-950">{name}</strong>
                  {connected ? <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
                <small className="mt-2 block break-all text-xs text-slate-400">
                  Base URL: {baseUrl} · Models: {models}
                </small>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button type="button" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  API Key 등록
                </Button>
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-950"
                  onClick={(event) => event.preventDefault()}
                >
                  Get API Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {connected ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    오픈ai
                  </span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`${name} API Key 삭제`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <em className="text-sm text-slate-400">등록된 API Key가 없습니다.</em>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConnectionsTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-slate-950">연결된 서비스</h3>
        <p className="text-sm text-slate-500">워크플로우 실행에 사용하는 계정 연동</p>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100">
        {[
          ['Notion', 'OAuth 연결됨 · 프로젝트 문서 접근 허용', '연결됨'],
          ['Slack', '워크스페이스 알림 채널 연결됨', '연결됨'],
          ['Gmail', '읽기 권한 대기 중', '확인 필요'],
        ].map(([name, description, status]) => (
          <InfoRow
            key={name}
            title={name}
            description={description}
            action={<Badge variant={status === '확인 필요' ? 'warning' : 'secondary'}>{status}</Badge>}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <Icon className="h-5 w-5 text-slate-500" />
        <span className="text-sm text-slate-500">{label}</span>
        <strong className="text-3xl font-semibold text-slate-950">{value}</strong>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <strong className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
          {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
          {title}
        </strong>
        <span className="mt-1 block text-sm text-slate-500">{description}</span>
      </div>
      {action}
    </div>
  );
}
