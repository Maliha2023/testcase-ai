import { useState } from 'react';
import {
  AlertOctagon,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Lock,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { TestCase, TestStatus, UserRole } from '../types/qa';
import { formatBugReportMarkdown } from '../utils/coverageLogic';
import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from './BadgeHelpers';

interface TestCaseCardProps {
  testCase: TestCase;
  role: UserRole;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (id: string, status: TestStatus) => void;
  onActualResultChange: (id: string, actualResult: string) => void;
  onDelete: (id: string) => void;
  onNotify: (message: string) => void;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function TestCaseCard({
  testCase,
  role,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onActualResultChange,
  onDelete,
  onNotify,
}: TestCaseCardProps) {
  const [copied, setCopied] = useState(false);
  const isLead = role === 'QA_LEAD';

  const handleStatusClick = (target: TestStatus) => {
    const nextStatus: TestStatus = testCase.status === target ? 'Untested' : target;
    onStatusChange(testCase.id, nextStatus);
  };

  const handleCopyBugReport = async () => {
    const markdown = formatBugReportMarkdown(testCase);
    const ok = await copyTextToClipboard(markdown);
    if (ok) {
      setCopied(true);
      onNotify(`Copied Markdown defect report for ${testCase.id}`);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify(`Could not access clipboard for ${testCase.id}`);
    }
  };

  return (
    <article
      data-testid={`test-card-${testCase.id}`}
      className={`rounded-xl border shadow-2xs transition-colors duration-150 bg-white ${
        testCase.status === 'Failed'
          ? 'border-rose-300'
          : 'border-violet-200/85 hover:border-violet-300'
      }`}
    >
      {/* Top Summary Row */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`details-${testCase.id}`}
          className="flex items-start gap-3 text-left min-w-0 flex-1 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
        >
          <span className="mt-0.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                {testCase.id}
              </span>
              <StatusBadge status={testCase.status} />
              <CategoryBadge category={testCase.category} />
              <PriorityBadge priority={testCase.priority} />
              {testCase.requirementRef && (
                <span className="font-mono text-[11px] text-slate-500">
                  · {testCase.requirementRef}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-[15px] font-medium text-slate-900 group-hover:text-slate-950 leading-snug">
              {testCase.title}
            </h3>
          </div>
        </button>

        {/* Quick Execution & Governance Actions */}
        <div className="flex flex-wrap items-center gap-2 pl-7 lg:pl-0 shrink-0">
          <div
            role="group"
            aria-label={`Execution status for ${testCase.id}`}
            className="inline-flex items-center p-0.5 rounded-lg bg-[#f8f5ff] border border-violet-200/80"
          >
            <button
              type="button"
              onClick={() => handleStatusClick('Passed')}
              aria-pressed={testCase.status === 'Passed'}
              aria-label={`Mark ${testCase.id} as Pass`}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                testCase.status === 'Passed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Pass</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusClick('Failed')}
              aria-pressed={testCase.status === 'Failed'}
              aria-label={`Mark ${testCase.id} as Fail`}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                testCase.status === 'Failed'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Fail</span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusClick('Blocked')}
              aria-pressed={testCase.status === 'Blocked'}
              aria-label={`Mark ${testCase.id} as Block`}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                testCase.status === 'Blocked'
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Block</span>
            </button>
          </div>

          {isLead ? (
            <button
              type="button"
              onClick={() => onDelete(testCase.id)}
              aria-label={`Delete ${testCase.id}`}
              title={`Delete ${testCase.id}`}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-violet-200 hover:border-rose-300 transition-colors duration-150 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-label={`Delete ${testCase.id} (QA Lead Only)`}
              title="QA Lead Only — Switch to QA Lead role to delete test cases"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed whitespace-nowrap"
            >
              <Lock className="w-3 h-3 text-violet-500 shrink-0" aria-hidden="true" />
              <span>QA Lead Only</span>
            </button>
          )}
        </div>
      </div>

      {/* Instant Defect Draft Strip when Failed */}
      {testCase.status === 'Failed' && (
        <div className="px-4 py-2.5 border-t border-rose-200 bg-rose-50/75 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-rose-900">
            <Bug className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
            <span>
              Test failed — Instant Defect Draft ready with reproduction steps and expected vs. actual result.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyBugReport}
            aria-label={`Copy Bug Report for ${testCase.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Copied Markdown</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Copy Bug Report</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Expandable Details Drawer */}
      {isExpanded && (
        <div
          id={`details-${testCase.id}`}
          className="px-4 pb-4 pt-3.5 border-t border-violet-100 bg-[#faf8ff] rounded-b-xl grid grid-cols-1 lg:grid-cols-12 gap-5"
        >
          {/* Left: Preconditions & Steps */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1.5">
                Preconditions
              </h4>
              <p className="text-sm text-slate-800 leading-relaxed">
                {testCase.preconditions}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1.5">
                Execution Steps
              </h4>
              <ol className="space-y-1.5 text-sm text-slate-800">
                {testCase.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="font-mono text-xs text-slate-400 tabular-nums mt-0.5 w-5 shrink-0">
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: Expected Result & Actual Result Notes */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1.5">
                Expected Result
              </h4>
              <p className="text-sm text-slate-800 leading-relaxed bg-white border border-violet-200/80 rounded-lg p-3">
                {testCase.expectedResult}
              </p>
            </div>

            <div>
              <label
                htmlFor={`notes-${testCase.id}`}
                className="block text-xs font-semibold text-slate-500 mb-1.5"
              >
                Actual Result / Execution Notes
              </label>
              <textarea
                id={`notes-${testCase.id}`}
                rows={3}
                value={testCase.actualResult}
                onChange={(e) => onActualResultChange(testCase.id, e.target.value)}
                placeholder="Record observed behavior, HTTP response codes, environment build, or defect ticket reference..."
                className="w-full rounded-lg bg-white border border-violet-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
