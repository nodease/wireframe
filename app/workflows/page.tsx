import HomeClient from '../HomeClient';

export default function WorkflowsPage({
  searchParams,
}: {
  searchParams?: { newWorkflow?: string };
}) {
  return (
    <HomeClient
      initialView="workflowList"
      initialIsModalOpen={searchParams?.newWorkflow === '1'}
    />
  );
}
