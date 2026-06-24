import HomeClient from './HomeClient';

const validViews = new Set([
  'landing',
  'login',
  'signup',
  'home',
  'workflowList',
  'workflowBuilder',
  'knowledge',
  'marketplace',
  'account',
  'analytics',
  'runReport',
]);

export default function Page({
  searchParams,
}: {
  searchParams?: { view?: string; newWorkflow?: string };
}) {
  const requestedView = searchParams?.view ?? 'landing';
  const initialView = validViews.has(requestedView) ? requestedView : 'landing';
  const initialIsModalOpen = searchParams?.newWorkflow === '1';

  return (
    <HomeClient
      initialView={initialView}
      initialIsModalOpen={initialIsModalOpen}
    />
  );
}
