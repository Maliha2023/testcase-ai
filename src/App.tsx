import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Header } from './components/Header';
import { GeneratorView } from './components/GeneratorView';
import { TrackerView } from './components/TrackerView';
import {
  createDemoTestSuite,
  DEMO_REQUIREMENT_REF,
  DEMO_REQUIREMENT_TEXT,
} from './data/samples';
import type {
  GeneratedTestCase,
  ReleaseApproval,
  TestCase,
  TestStatus,
  UserRole,
  WorkspaceView,
} from './types/qa';
import {
  calculateSuiteMetrics,
  evaluateReleaseGate,
  generateRtmCsv,
  getNextTestCaseNumber,
} from './utils/coverageLogic';

const STORAGE_KEYS = {
  SUITE: 'testcase_ai_suite_v1',
  REQUIREMENT: 'testcase_ai_requirement_v1',
  REQUIREMENT_REF: 'testcase_ai_requirement_ref_v1',
  ROLE: 'testcase_ai_role_v1',
  APPROVAL: 'testcase_ai_release_approval_v1',
} as const;

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEYS.ROLE);
    return saved === 'QA_LEAD' ? 'QA_LEAD' : 'QA_TESTER';
  });

  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    const savedRole = window.localStorage.getItem(STORAGE_KEYS.ROLE);
    return savedRole === 'QA_LEAD' ? 'tracker' : 'generator';
  });

  const [testCases, setTestCases] = useState<TestCase[]>(() =>
    loadStoredJson<TestCase[]>(STORAGE_KEYS.SUITE, [])
  );

  const [requirementText, setRequirementText] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.REQUIREMENT) ?? '';
    } catch {
      return '';
    }
  });

  const [requirementRef, setRequirementRef] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.REQUIREMENT_REF) ?? '';
    } catch {
      return '';
    }
  });

  const [releaseApproval, setReleaseApproval] = useState<ReleaseApproval | null>(() =>
    loadStoredJson<ReleaseApproval | null>(STORAGE_KEYS.APPROVAL, null)
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.SUITE, JSON.stringify(testCases));
    } catch {
      // Ignore storage quota errors
    }
  }, [testCases]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.REQUIREMENT, requirementText);
      window.localStorage.setItem(STORAGE_KEYS.REQUIREMENT_REF, requirementRef);
    } catch {
      // Ignore storage errors
    }
  }, [requirementText, requirementRef]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.ROLE, role);
    } catch {
      // Ignore storage errors
    }
  }, [role]);

  useEffect(() => {
    try {
      if (releaseApproval) {
        window.localStorage.setItem(
          STORAGE_KEYS.APPROVAL,
          JSON.stringify(releaseApproval)
        );
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.APPROVAL);
      }
    } catch {
      // Ignore storage errors
    }
  }, [releaseApproval]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const metrics = useMemo(() => calculateSuiteMetrics(testCases), [testCases]);
  const gate = useMemo(() => evaluateReleaseGate(testCases), [testCases]);
  const nextIdStart = useMemo(() => getNextTestCaseNumber(testCases), [testCases]);

  // Automatically invalidate release approval if gate is no longer GO
  useEffect(() => {
    if (releaseApproval && !gate.canApprove) {
      setReleaseApproval(null);
    }
  }, [gate.canApprove, releaseApproval]);

  const notify = (message: string) => {
    setToastMessage(message);
  };

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setActiveView(nextRole === 'QA_LEAD' ? 'tracker' : 'generator');
    notify(
      nextRole === 'QA_LEAD'
        ? 'Switched to QA Lead mode — Release Control & Delete unlocked'
        : 'Switched to QA Tester mode — AI Test Generator active'
    );
  };

  const handleLoadDemoData = () => {
    const demoSuite = createDemoTestSuite();
    setTestCases(demoSuite);
    setRequirementText(DEMO_REQUIREMENT_TEXT);
    setRequirementRef(DEMO_REQUIREMENT_REF);
    setReleaseApproval(null);
    notify(`Loaded demo dataset (${demoSuite.length} test cases across all execution states)`);
  };

  const handleSaveToSuite = (
    drafts: GeneratedTestCase[],
    refLabel: string
  ) => {
    const now = new Date().toISOString();
    setTestCases((prev) => {
      let nextNum = getNextTestCaseNumber(prev);
      const existingIds = new Set(prev.map((tc) => tc.id));

      const appended: TestCase[] = drafts.map((draft) => {
        const finalId = existingIds.has(draft.id) ? `TC-${nextNum++}` : draft.id;
        existingIds.add(finalId);
        return {
          ...draft,
          id: finalId,
          status: 'Untested',
          actualResult: '',
          requirementRef: refLabel || 'CUSTOM-REQ',
          updatedAt: now,
        };
      });

      return [...prev, ...appended];
    });
    setReleaseApproval(null);
    notify(`Saved ${drafts.length} generated test cases to the Test Suite`);
  };

  const handleStatusChange = (id: string, status: TestStatus) => {
    const now = new Date().toISOString();
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, status, updatedAt: now } : tc))
    );
    setReleaseApproval(null);
  };

  const handleActualResultChange = (id: string, actualResult: string) => {
    const now = new Date().toISOString();
    setTestCases((prev) =>
      prev.map((tc) =>
        tc.id === id ? { ...tc, actualResult, updatedAt: now } : tc
      )
    );
  };

  const handleDeleteTestCase = (id: string) => {
    if (role !== 'QA_LEAD') return;
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    setReleaseApproval(null);
    notify(`Deleted ${id} from Test Suite`);
  };

  const handleClearPassed = () => {
    if (role !== 'QA_LEAD') return;
    const passedCount = testCases.filter((tc) => tc.status === 'Passed').length;
    if (passedCount === 0) return;
    setTestCases((prev) => prev.filter((tc) => tc.status !== 'Passed'));
    setReleaseApproval(null);
    notify(`Cleared ${passedCount} passed test ${passedCount === 1 ? 'case' : 'cases'}`);
  };

  const handleClearSuite = () => {
    if (role !== 'QA_LEAD') return;
    setTestCases([]);
    setReleaseApproval(null);
    notify('Cleared entire test suite');
  };

  const handleApproveRelease = () => {
    if (role !== 'QA_LEAD' || !gate.canApprove) return;
    setReleaseApproval({
      approvedAt: new Date().toISOString(),
      passRate: metrics.passRate,
      totalCases: metrics.total,
      passedCases: metrics.passed,
      approvedBy: 'QA Lead',
    });
    notify('Release approved and recorded');
  };

  const handleRevokeApproval = () => {
    if (role !== 'QA_LEAD') return;
    setReleaseApproval(null);
    notify('Release sign-off revoked');
  };

  const handleExportCsv = () => {
    if (role !== 'QA_LEAD' || testCases.length === 0) return;
    const csv = generateRtmCsv(testCases);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `testcase-ai-rtm-coverage-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('Exported full RTM & Coverage CSV');
  };

  const isTracker = activeView === 'tracker';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 text-slate-900 ${
        isTracker ? 'bg-[#f3eefe]' : 'bg-[#ebf3fe]'
      }`}
    >
      <Header
        role={role}
        activeView={activeView}
        suiteCount={testCases.length}
        onRoleChange={handleRoleChange}
        onViewChange={setActiveView}
        onLoadDemoData={handleLoadDemoData}
      />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'generator' ? (
          <GeneratorView
            role={role}
            requirementText={requirementText}
            requirementRef={requirementRef}
            nextIdStart={nextIdStart}
            suiteCount={testCases.length}
            onRequirementChange={(text, ref) => {
              setRequirementText(text);
              if (ref !== undefined) setRequirementRef(ref);
            }}
            onSaveToSuite={handleSaveToSuite}
            onGoToTracker={() => setActiveView('tracker')}
          />
        ) : (
          <TrackerView
            role={role}
            testCases={testCases}
            metrics={metrics}
            gate={gate}
            releaseApproval={releaseApproval}
            onStatusChange={handleStatusChange}
            onActualResultChange={handleActualResultChange}
            onDelete={handleDeleteTestCase}
            onApproveRelease={handleApproveRelease}
            onRevokeApproval={handleRevokeApproval}
            onClearPassed={handleClearPassed}
            onClearSuite={handleClearSuite}
            onExportCsv={handleExportCsv}
            onGoToGenerator={() => setActiveView('generator')}
            onLoadDemoData={handleLoadDemoData}
            onNotify={notify}
          />
        )}
      </main>

      <footer
        className={`border-t py-4 px-4 sm:px-6 text-xs text-slate-500 bg-white/55 transition-colors duration-200 ${
          isTracker ? 'border-violet-200/80' : 'border-sky-200/80'
        }`}
      >
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>TestCase AI — AI-Powered Test Case Generator &amp; Coverage Tracker</span>
          <span>Local workspace persistence enabled via browser storage</span>
        </div>
      </footer>

      {/* Accessible Live Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          data-testid="toast-notification"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg bg-white border border-slate-200 shadow-lg px-4 py-2.5 flex items-center gap-2.5 text-xs font-medium text-slate-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
