import type { Team, TeamMembership, User, UserTeam } from './types';

export const currentUser: User = {
  id: 'user-kim-minji',
  name: '김민지',
  email: 'kim.minji@nodease.ai',
  role: 'owner',
};

export const users: User[] = [
  currentUser,
  {
    id: 'user-lee-hyeyeon',
    name: '이혜연',
    email: 'hyeyeon.lee@nodease.ai',
    role: 'admin',
  },
  {
    id: 'user-park-jun',
    name: '박준',
    email: 'jun.park@nodease.ai',
    role: 'member',
  },
  {
    id: 'user-choi-seo',
    name: '최서연',
    email: 'seo.choi@nodease.ai',
    role: 'member',
  },
];

export const teams: Team[] = [
  {
    id: 'team-nodease-product',
    name: 'Nodease Product',
    slug: 'nodease-product',
    defaultSlackChannel: '#workflow-alerts',
  },
  {
    id: 'team-jungle-demo',
    name: 'Jungle Demo Squad',
    slug: 'jungle-demo',
    defaultSlackChannel: '#demo-ops',
  },
];

export const teamMemberships: TeamMembership[] = [
  {
    userId: 'user-kim-minji',
    teamId: 'team-nodease-product',
    role: 'owner',
    joinedAt: '2026-06-01',
  },
  {
    userId: 'user-lee-hyeyeon',
    teamId: 'team-nodease-product',
    role: 'admin',
    joinedAt: '2026-06-03',
  },
  {
    userId: 'user-park-jun',
    teamId: 'team-nodease-product',
    role: 'member',
    joinedAt: '2026-06-07',
  },
  {
    userId: 'user-kim-minji',
    teamId: 'team-jungle-demo',
    role: 'admin',
    joinedAt: '2026-06-10',
  },
  {
    userId: 'user-choi-seo',
    teamId: 'team-jungle-demo',
    role: 'member',
    joinedAt: '2026-06-12',
  },
];

export const getTeamsForUser = (userId: string): UserTeam[] =>
  teamMemberships
    .filter((membership) => membership.userId === userId)
    .map((membership) => {
      const team = teams.find((candidateTeam) => candidateTeam.id === membership.teamId);
      const memberCount = teamMemberships.filter(
        (candidateMembership) => candidateMembership.teamId === membership.teamId,
      ).length;

      if (!team) {
        return null;
      }

      return {
        ...team,
        membershipRole: membership.role,
        memberCount,
      };
    })
    .filter((team): team is UserTeam => team !== null);
