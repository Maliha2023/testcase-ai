import type { SuiteMetrics, TestCategory } from '../types/qa';

interface MetricsBarProps {
  metrics: SuiteMetrics;
}

const CATEGORY_BAR_COLOR: Record<TestCategory, string> = {
  Positive: 'bg-emerald-500',
  Negative: 'bg-rose-500',
  Boundary: 'bg-amber-500',
  Security: 'bg-sky-500',
};

const CATEGORY_TEXT_COLOR: Record<TestCategory, string> = {
  Positive: 'text-emerald-700',
  Negative: 'text-rose-700',
  Boundary: 'text-amber-800',
  Security: 'text-sky-700',
};

export function MetricsBar({ metrics }: MetricsBarProps) {
  const passRateTone =
    metrics.total === 0
      ? 'text-slate-400'
      : metrics.passRate >= 85
        ? 'text-emerald-600'
        : metrics.passRate >= 60
          ? 'text-amber-600'
          : 'text-rose-600';

  return (
    <section
      aria-label="Coverage and Quality Metrics"
      className="rounded-xl bg-white border border-violet-200/90 shadow-xs overflow-hidden"
    >
      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-violet-100">
        <div className="p-4 sm:p-5 bg-white">
          <p className="text-xs font-medium text-slate-500">Total Test Cases</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span
              data-testid="metric-total"
              className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-slate-900"
            >
              {metrics.total}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {metrics.executed} executed · {metrics.untested} untested
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white">
          <p className="text-xs font-medium text-slate-500">Overall Pass Rate</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span
              data-testid="metric-pass-rate"
              className={`text-2xl sm:text-3xl font-semibold font-mono tabular-nums ${passRateTone}`}
            >
              {metrics.passRate}%
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {metrics.passed}/{metrics.total} passed
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white">
          <p className="text-xs font-medium text-slate-500">Failed Cases</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span
              data-testid="metric-failed"
              className={`text-2xl sm:text-3xl font-semibold font-mono tabular-nums ${
                metrics.failed > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {metrics.failed}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {metrics.highPriorityFailures} High priority
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white">
          <p className="text-xs font-medium text-slate-500">Blocked Cases</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span
              data-testid="metric-blocked"
              className={`text-2xl sm:text-3xl font-semibold font-mono tabular-nums ${
                metrics.blocked > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {metrics.blocked}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {metrics.coveredCategories}/4 categories covered
            </span>
          </div>
        </div>
      </div>

      {/* Category Coverage Breakdown */}
      <div className="border-t border-violet-100 px-4 sm:px-5 py-3.5 bg-[#f8f5ff]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-700">
            Category Coverage Breakdown
          </span>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Category Score: {metrics.categoryCoverageScore}% · Execution Progress:{' '}
            {metrics.executionCoverage}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.categoryBreakdown.map((item) => (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${CATEGORY_TEXT_COLOR[item.category]}`}>
                  {item.category}
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {item.passed}/{item.total} passed
                  {item.failed > 0 ? ` · ${item.failed} fail` : ''}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-violet-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    CATEGORY_BAR_COLOR[item.category]
                  }`}
                  style={{ width: `${item.total === 0 ? 0 : item.passRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
