import { useMemo, useState } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Database,
  Filter,
  Search,
  Wand2,
} from 'lucide-react';
import type {
  ReleaseApproval,
  ReleaseGateEvaluation,
  SuiteMetrics,
  TestCase,
  TestPriority,
  TestStatus,
  UserRole,
} from '../types/qa';
import { MetricsBar } from './MetricsBar';
import { ReleaseControlPanel } from './ReleaseControlPanel';
import { TestCaseCard } from './TestCaseCard';

interface TrackerViewProps {
  role: UserRole;
  testCases: TestCase[];
  metrics: SuiteMetrics;
  gate: ReleaseGateEvaluation;
  releaseApproval: ReleaseApproval | null;
  onStatusChange: (id: string, status: TestStatus) => void;
  onActualResultChange: (id: string, actualResult: string) => void;
  onDelete: (id: string) => void;
  onApproveRelease: () => void;
  onRevokeApproval: () => void;
  onClearPassed: () => void;
  onClearSuite: () => void;
  onExportCsv: () => void;
  onGoToGenerator: () => void;
  onLoadDemoData: () => void;
  onNotify: (message: string) => void;
}

const STATUS_FILTERS: Array<'All' | TestStatus> = [
  'All',
  'Untested',
  'Passed',
  'Failed',
  'Blocked',
];

const PRIORITY_FILTERS: Array<'All' | TestPriority> = [
  'All',
  'High',
  'Medium',
  'Low',
];

export function TrackerView({
  role,
  testCases,
  metrics,
  gate,
  releaseApproval,
  onStatusChange,
  onActualResultChange,
  onDelete,
  onApproveRelease,
  onRevokeApproval,
  onClearPassed,
  onClearSuite,
  onExportCsv,
  onGoToGenerator,
  onLoadDemoData,
  onNotify,
}: TrackerViewProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | TestStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TestPriority>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const statusCounts: Record<'All' | TestStatus, number> = {
    All: metrics.total,
    Untested: metrics.untested,
    Passed: metrics.passed,
    Failed: metrics.failed,
    Blocked: metrics.blocked,
  };

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return testCases.filter((tc) => {
      if (statusFilter !== 'All' && tc.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && tc.priority !== priorityFilter) return false;
      if (query) {
        const hay = `${tc.id} ${tc.title} ${tc.category} ${tc.requirementRef} ${tc.actualResult}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [testCases, statusFilter, priorityFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allFilteredExpanded =
    filteredCases.length > 0 && filteredCases.every((tc) => expandedIds.has(tc.id));

  const toggleExpandAll = () => {
    if (allFilteredExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredCases.map((tc) => tc.id)));
    }
  };

  const resetFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Test Execution &amp; Coverage Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Execute test cases, track live category coverage, draft defect reports, and evaluate release readiness.
          </p>
        </div>
      </div>

      {/* Live Coverage & Quality Metrics Bar */}
      <MetricsBar metrics={metrics} />

      {/* Role-Aware Release Control Panel */}
      <ReleaseControlPanel
        role={role}
        metrics={metrics}
        gate={gate}
        releaseApproval={releaseApproval}
        onApproveRelease={onApproveRelease}
        onRevokeApproval={onRevokeApproval}
        onClearPassed={onClearPassed}
        onClearSuite={onClearSuite}
        onExportCsv={onExportCsv}
      />

      {/* Filter & Search Toolbar */}
      {testCases.length > 0 && (
        <section
          aria-label="Test Suite Filters"
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1"
        >
          {/* Status Filter Tabs */}
          <div
            role="group"
            aria-label="Filter by execution status"
            className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-white border border-violet-200/90 shadow-2xs"
          >
            {STATUS_FILTERS.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-violet-50'
                  }`}
                >
                  <span>{status}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${
                      active ? 'bg-white/20 text-white' : 'bg-violet-50 text-violet-700'
                    }`}
                  >
                    {statusCounts[status]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Priority, Search & Expand Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial sm:w-60">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search test cases"
                placeholder="Search ID, title, notes..."
                className="w-full rounded-lg bg-white border border-violet-200/90 focus:border-violet-500 focus:outline-none pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-white border border-violet-200/90 rounded-lg px-2.5 py-1 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <label htmlFor="priority-filter" className="sr-only">
                Filter by Priority
              </label>
              <select
                id="priority-filter"
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as 'All' | TestPriority)
                }
                className="bg-transparent text-xs text-slate-700 focus:outline-none py-0.5 pr-1 cursor-pointer"
              >
                {PRIORITY_FILTERS.map((p) => (
                  <option key={p} value={p} className="bg-white text-slate-900">
                    {p === 'All' ? 'All Priorities' : `${p} Priority`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-violet-50 text-slate-700 border border-violet-200/90 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {allFilteredExpanded ? (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Expand All</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Test Case List or Empty States */}
      {testCases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-300/90 bg-white/80 px-6 py-14 text-center space-y-4">
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Your test suite is empty
            </h2>
            <p className="text-sm text-slate-600">
              Generate structured Positive, Negative, Boundary, and Security test cases from any requirement, or load the pre-built 2FA evaluation suite.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToGenerator}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open AI Test Generator</span>
            </button>
            <button
              type="button"
              onClick={onLoadDemoData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-white hover:bg-violet-50 text-slate-700 border border-violet-200 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-xl border border-violet-200/90 bg-white px-6 py-10 text-center space-y-3 shadow-xs">
          <p className="text-sm text-slate-700">
            No test cases match the active filters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-violet-100 hover:bg-violet-200 text-violet-900 transition-colors cursor-pointer"
          >
            <span>Reset Filters</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="test-suite-list">
          {filteredCases.map((tc) => (
            <TestCaseCard
              key={tc.id}
              testCase={tc}
              role={role}
              isExpanded={expandedIds.has(tc.id)}
              onToggleExpand={() => toggleExpand(tc.id)}
              onStatusChange={onStatusChange}
              onActualResultChange={onActualResultChange}
              onDelete={onDelete}
              onNotify={onNotify}
            />
          ))}
        </div>
      )}
    </div>
  );
}
