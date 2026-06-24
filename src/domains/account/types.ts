export type User = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
};

export type Team = {
  id: string;
  name: string;
  slug: string;
  defaultSlackChannel: string;
};

export type TeamMembership = {
  userId: string;
  teamId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
};

export type UserTeam = Team & {
  membershipRole: TeamMembership['role'];
  memberCount: number;
};
