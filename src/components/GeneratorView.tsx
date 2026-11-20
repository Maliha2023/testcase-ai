import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckSquare,
  Eraser,
  Layers,
  Loader2,
  PlusCircle,
  Square,
  Wand2,
} from 'lucide-react';
import { SAMPLE_REQUIREMENTS } from '../data/samples';
import { generateTestCases } from '../services/testCaseGenerator';
import type { GeneratedTestCase, SampleRequirement, UserRole } from '../types/qa';
import {
  MAX_REQUIREMENT_LENGTH,
  sanitizeRequirementInput,
} from '../utils/coverageLogic';
import { CategoryBadge, PriorityBadge } from './BadgeHelpers';

interface GeneratorViewProps {
  role: UserRole;
  requirementText: string;
  requirementRef: string;
  nextIdStart: number;
  suiteCount: number;
  onRequirementChange: (text: string, ref?: string) => void;
  onSaveToSuite: (cases: GeneratedTestCase[], requirementRef: string) => void;
  onGoToTracker: () => void;
}

export function GeneratorView({
  role,
  requirementText,
  requirementRef,
  nextIdStart,
  suiteCount,
  onRequirementChange,
  onSaveToSuite,
  onGoToTracker,
}: GeneratorViewProps) {
  const [generatedCases, setGeneratedCases] = useState<GeneratedTestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedNoticeCount, setSavedNoticeCount] = useState<number | null>(null);

  const isLead = role === 'QA_LEAD';
  const charCount = requirementText.length;
  const isOverLimit = charCount > MAX_REQUIREMENT_LENGTH;

  const handleApplySample = (sample: SampleRequirement) => {
    onRequirementChange(sample.content, sample.requirementRef);
    setErrorMessage(null);
    setSavedNoticeCount(null);
  };

  const handleGenerate = async () => {
    setSavedNoticeCount(null);
    const validation = sanitizeRequirementInput(requirementText);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please provide a valid requirement.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const { testCases: produced } = await generateTestCases(
        validation.sanitized,
        nextIdStart
      );

      setGeneratedCases(produced);
      setSelectedIds(new Set(produced.map((tc) => tc.id)));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach the test generation service.';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected =
    generatedCases.length > 0 && selectedIds.size === generatedCases.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generatedCases.map((tc) => tc.id)));
    }
  };

  const handleSaveSelected = () => {
    const toSave = generatedCases.filter((tc) => selectedIds.has(tc.id));
    if (toSave.length === 0) return;

    onSaveToSuite(toSave, requirementRef || 'CUSTOM-REQ');
    setSavedNoticeCount(toSave.length);

    // Keep unselected items staged; remove saved items so user doesn't double-save
    const remaining = generatedCases.filter((tc) => !selectedIds.has(tc.id));
    setGeneratedCases(remaining);
    setSelectedIds(new Set(remaining.map((tc) => tc.id)));
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            AI Test Case &amp; Edge-Case Generator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Paste a user story or acceptance criteria to synthesize Positive, Negative, Boundary, and Security test cases.
          </p>
        </div>

        {suiteCount > 0 && (
          <button
            type="button"
            onClick={onGoToTracker}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors cursor-pointer"
          >
            <span>Open Active Test Suite ({suiteCount})</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Requirement Input Workbench */}
        <section
          aria-label="Requirement Input"
          className="lg:col-span-5 rounded-xl bg-white border border-sky-200/90 shadow-xs p-5 space-y-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Quick Sample Requirements
              </span>
              {requirementText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onRequirementChange('', '');
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Eraser className="w-3 h-3" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_REQUIREMENTS.map((sample) => {
                const isActive = requirementRef === sample.requirementRef && requirementText.trim().length > 0;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleApplySample(sample)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-100 border-sky-300 text-sky-900'
                        : 'bg-[#f4f8ff] hover:bg-sky-50 border-sky-200/80 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {sample.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="requirement-input"
                className="text-xs font-semibold text-slate-700"
              >
                User Story / Feature Requirement / Acceptance Criteria
              </label>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isOverLimit ? 'text-rose-600 font-semibold' : 'text-slate-500'
                }`}
              >
                {charCount.toLocaleString()} / {MAX_REQUIREMENT_LENGTH.toLocaleString()}
              </span>
            </div>

            <textarea
              id="requirement-input"
              rows={13}
              value={requirementText}
              onChange={(e) => {
                onRequirementChange(e.target.value, requirementRef);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste your user story, API contract, or acceptance criteria here..."
              className={`w-full rounded-lg bg-[#f7faff] border px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:ring-1 resize-y ${
                isOverLimit
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
                  : 'border-sky-200 focus:border-sky-500 focus:ring-sky-500/30'
              }`}
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              data-testid="generator-error"
              className="rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
              isGenerating
                ? 'bg-slate-200 text-slate-500 cursor-wait'
                : isLead
                  ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer'
                  : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Generating Structured Test Cases...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" aria-hidden="true" />
                <span>Generate Test Cases</span>
              </>
            )}
          </button>
        </section>

        {/* Right: Generated Test Cases Staging Area */}
        <section
          aria-label="Generated Test Cases"
          className="lg:col-span-7 space-y-4"
        >
          {/* Staging Toolbar */}
          <div className="rounded-xl bg-white border border-sky-200/90 shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Generated Candidates
              </h2>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {generatedCases.length} staged · {selectedIds.size} selected
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {generatedCases.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 bg-[#f4f8ff] hover:bg-sky-50 border border-sky-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {allSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Select All</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveSelected}
                disabled={selectedIds.size === 0}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                  selectedIds.size > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Save to Test Suite
                  {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </span>
              </button>
            </div>
          </div>

          {/* Saved confirmation callout */}
          {savedNoticeCount !== null && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>
                  Saved <strong>{savedNoticeCount}</strong> test{' '}
                  {savedNoticeCount === 1 ? 'case' : 'cases'} to your persisted Test Suite.
                </span>
              </div>
              <button
                type="button"
                onClick={onGoToTracker}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer whitespace-nowrap"
              >
                <span>Execute in Coverage Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isGenerating ? (
            <div className="space-y-3" aria-busy="true" aria-label="Generating test cases">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-sky-200/80 p-4 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-4 rounded bg-sky-100" />
                    <div className="w-16 h-4 rounded bg-sky-100" />
                    <div className="w-20 h-4 rounded bg-sky-100" />
                  </div>
                  <div className="w-3/4 h-4 rounded bg-sky-100" />
                  <div className="w-full h-3 rounded bg-sky-50" />
                  <div className="w-5/6 h-3 rounded bg-sky-50" />
                </div>
              ))}
            </div>
          ) : generatedCases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sky-300/90 bg-white/80 px-6 py-14 min-h-[416px] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
                <Layers className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Ready to synthesize your test matrix
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select one of the three realistic requirement presets on the left or paste your own acceptance criteria, then click <strong>Generate Test Cases</strong> to produce Positive, Negative, Boundary, and Security coverage.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <CategoryBadge category="Positive" />
                <CategoryBadge category="Negative" />
                <CategoryBadge category="Boundary" />
                <CategoryBadge category="Security" />
              </div>
            </div>
          ) : (
            <div className="space-y-3" data-testid="generated-cases-list">
              {generatedCases.map((tc) => {
                const isSelected = selectedIds.has(tc.id);
                return (
                  <article
                    key={tc.id}
                    className={`rounded-xl border p-4 space-y-3 transition-colors duration-150 ${
                      isSelected
                        ? 'bg-white border-sky-300 shadow-xs'
                        : 'bg-white/65 border-sky-200/70 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(tc.id)}
                        aria-label={`Select ${tc.id}: ${tc.title}`}
                        className="mt-1 w-4 h-4 rounded border-sky-300 bg-white text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                            {tc.id}
                          </span>
                          <CategoryBadge category={tc.category} />
                          <PriorityBadge priority={tc.priority} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                          {tc.title}
                        </h3>
                        <p className="text-xs text-slate-600">
                          <span className="text-slate-500 font-medium">Preconditions: </span>
                          {tc.preconditions}
                        </p>

                        <ol className="space-y-1 text-xs text-slate-700 pt-1">
                          {tc.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="font-mono text-slate-400 tabular-nums w-4 shrink-0">
                                {i + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>

                        <div className="pt-2 border-t border-sky-100 text-xs text-slate-800">
                          <span className="text-slate-500 font-medium">Expected Result: </span>
                          {tc.expectedResult}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
