export type TestCategory = 'Positive' | 'Negative' | 'Boundary' | 'Security';

export type TestPriority = 'High' | 'Medium' | 'Low';

export type TestStatus = 'Untested' | 'Passed' | 'Failed' | 'Blocked';

export type UserRole = 'QA_TESTER' | 'QA_LEAD';

export type WorkspaceView = 'generator' | 'tracker';

export interface GeneratedTestCase {
  id: string;
  title: string;
  category: TestCategory;
  priority: TestPriority;
  preconditions: string;
  steps: string[];
  expectedResult: string;
}

export interface TestCase extends GeneratedTestCase {
  status: TestStatus;
  actualResult: string;
  requirementRef: string;
  updatedAt: string;
}

export interface CategoryMetric {
  category: TestCategory;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  passRate: number;
  sharePct: number;
}

export interface SuiteMetrics {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  executed: number;
  passRate: number;
  executedPassRate: number;
  executionCoverage: number;
  highPriorityFailures: number;
  categoryCoverageScore: number;
  coveredCategories: number;
  categoryBreakdown: CategoryMetric[];
}

export type ReleaseGateStatus = 'GO' | 'NO_GO' | 'PENDING';

export interface ReleaseGateEvaluation {
  status: ReleaseGateStatus;
  canApprove: boolean;
  passRate: number;
  threshold: number;
  highPriorityFailures: number;
  blockers: string[];
  warnings: string[];
  summary: string;
}

export interface ReleaseApproval {
  approvedAt: string;
  passRate: number;
  totalCases: number;
  passedCases: number;
  approvedBy: string;
}

export interface SampleRequirement {
  id: string;
  label: string;
  requirementRef: string;
  content: string;
}
