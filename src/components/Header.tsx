import {
  CheckSquare,
  Database,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wand2,
} from 'lucide-react';
import type { UserRole, WorkspaceView } from '../types/qa';

interface HeaderProps {
  role: UserRole;
  activeView: WorkspaceView;
  suiteCount: number;
  onRoleChange: (role: UserRole) => void;
  onViewChange: (view: WorkspaceView) => void;
  onLoadDemoData: () => void;
}

export function Header({
  role,
  activeView,
  suiteCount,
  onRoleChange,
  onViewChange,
  onLoadDemoData,
}: HeaderProps) {
  const isLead = role === 'QA_LEAD';
  const isTracker = activeView === 'tracker';

  return (
    <>
      <div className="md:sticky md:top-0 z-30">
        {/* Subtle 2px dashboard-themed accent rail */}
        <div
          className={`h-0.5 w-full transition-colors duration-200 ${
            isTracker ? 'bg-violet-500' : 'bg-sky-500'
          }`}
        />

        <header
          className={`bg-white/95 backdrop-blur-md border-b transition-colors duration-200 ${
            isTracker ? 'border-violet-200/90' : 'border-sky-200/90'
          }`}
        >
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-colors duration-200 ${
                  isTracker
                    ? 'bg-violet-50 border-violet-200 text-violet-600'
                    : 'bg-sky-50 border-sky-200 text-sky-600'
                }`}
                aria-hidden="true"
              >
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
                    TestCase AI
                  </span>
                  <span className="hidden xl:inline text-slate-300" aria-hidden="true">
                    /
                  </span>
                  <span className="hidden xl:inline text-xs text-slate-500 truncate">
                    AI-Powered Test Case Generator &amp; Coverage Tracker
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Navigation Tabs */}
            <nav
              aria-label="Workspace views"
              className={`flex items-center gap-1 p-1 rounded-lg border transition-colors duration-200 ${
                isTracker
                  ? 'bg-violet-50/75 border-violet-200/80'
                  : 'bg-sky-50/75 border-sky-200/80'
              }`}
            >
              <button
                type="button"
                onClick={() => onViewChange('generator')}
                aria-current={activeView === 'generator' ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'generator'
                    ? 'bg-white text-sky-700 border border-sky-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>AI Generator</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange('tracker')}
                aria-current={activeView === 'tracker' ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'tracker'
                    ? 'bg-white text-violet-700 border border-violet-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Coverage Tracker</span>
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                    isTracker
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {suiteCount}
                </span>
              </button>
            </nav>

            {/* Role Switcher & Demo Data Action */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div
                role="group"
                aria-label="Workspace role switcher"
                className="flex items-center p-1 rounded-lg bg-slate-100/90 border border-slate-200/90"
              >
                <button
                  type="button"
                  onClick={() => onRoleChange('QA_TESTER')}
                  aria-pressed={role === 'QA_TESTER'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    role === 'QA_TESTER'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>QA Tester</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRoleChange('QA_LEAD')}
                  aria-pressed={role === 'QA_LEAD'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    role === 'QA_LEAD'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>QA Lead</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onLoadDemoData}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <span>Load Demo Data</span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Role-Specific Workspace Banner (scrolls naturally to avoid mobile sticky overlap) */}
      <div
        data-testid="role-workspace-banner"
        className={`border-b transition-colors duration-200 ${
          isTracker
            ? 'bg-[#eae0fd] border-violet-200 text-violet-950'
            : 'bg-[#deecfd] border-sky-200 text-sky-950'
        }`}
      >
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          {isLead ? (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-white/85 border border-violet-300 text-violet-800 whitespace-nowrap shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-600" aria-hidden="true" />
                  <span>Lead Mode Active</span>
                </span>
                <span className={isTracker ? 'text-violet-900/90' : 'text-sky-900/90'}>
                  Full QA Lead governance unlocked: Release Gate sign-off, test case deletion, bulk passed cleanup, and full RTM CSV export.
                </span>
              </div>
              <span
                className={`font-mono hidden sm:inline whitespace-nowrap ${
                  isTracker ? 'text-violet-800/80' : 'text-sky-800/80'
                }`}
              >
                Role: QA Lead
              </span>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-white/85 border border-sky-300 text-sky-800 whitespace-nowrap shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                  <span>QA Tester Workspace</span>
                </span>
                <span className={isTracker ? 'text-violet-900/90' : 'text-sky-900/90'}>
                  Generate test suites, run Pass/Fail/Block executions, record notes, and copy defect drafts. Destructive and release actions require QA Lead mode.
                </span>
              </div>
              <span
                className={`font-mono hidden sm:inline whitespace-nowrap ${
                  isTracker ? 'text-violet-800/80' : 'text-sky-800/80'
                }`}
              >
                Role: QA Tester
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
