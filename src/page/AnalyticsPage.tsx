import { AnalyticsView } from '../components/analytics/AnalyticsView';
import type {
  AnalyticsSummary,
  WorkflowAnalytics,
} from '../domains/workflow/types';

type AnalyticsPageProps = {
  summary: AnalyticsSummary;
  workflows: WorkflowAnalytics[];
  selectedWorkflow: WorkflowAnalytics | null;
  onShowAll: () => void;
  onSelectWorkflow: (workflowId: number) => void;
};

export function AnalyticsPage(props: AnalyticsPageProps) {
  return <AnalyticsView {...props} />;
}
