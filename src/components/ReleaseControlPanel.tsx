import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  ReleaseApproval,
  ReleaseGateEvaluation,
  SuiteMetrics,
  UserRole,
} from '../types/qa';

interface ReleaseControlPanelProps {
  role: UserRole;
  metrics: SuiteMetrics;
  gate: ReleaseGateEvaluation;
  releaseApproval: ReleaseApproval | null;
  onApproveRelease: () => void;
  onRevokeApproval: () => void;
  onClearPassed: () => void;
  onClearSuite: () => void;
  onExportCsv: () => void;
}

export function ReleaseControlPanel({
  role,
  metrics,
  gate,
  releaseApproval,
  onApproveRelease,
  onRevokeApproval,
  onClearPassed,
  onClearSuite,
  onExportCsv,
}: ReleaseControlPanelProps) {
  const [confirmClearSuite, setConfirmClearSuite] = useState(false);

  const isLead = role === 'QA_LEAD';

  const gateConfig = {
    GO: {
      label: 'GO — Ready for Release',
      shortLabel: 'GO',
      badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: CheckCircle2,
    },
    NO_GO: {
      label: 'NO-GO — Release Blocked',
      shortLabel: 'NO-GO',
      badgeClasses: 'bg-rose-50 text-rose-700 border-rose-200',
      Icon: XCircle,
    },
    PENDING: {
      label: 'PENDING — Awaiting Execution',
      shortLabel: 'PENDING',
      badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: Clock,
    },
  }[gate.status];

  const GateIcon = gateConfig.Icon;

  // QA Tester View: Read-only readiness status + explicitly locked QA Lead controls
  if (!isLead) {
    return (
      <section
        aria-label="Release Governance Controls"
        className="rounded-xl bg-white border border-violet-200/90 shadow-xs px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-600">
            Release Readiness
          </span>
          <span
            data-testid="release-gate-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${gateConfig.badgeClasses}`}
          >
            <GateIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{gateConfig.shortLabel}</span>
          </span>
          <span className="text-xs text-slate-600">{gate.summary}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled
            aria-label="Approve Release (QA Lead Only)"
            title="QA Lead Only — Switch to QA Lead role to approve releases"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5 text-violet-500 shrink-0" aria-hidden="true" />
            <span>Approve Release</span>
            <span className="text-[11px] text-slate-400 border-l border-slate-200 pl-2">
              QA Lead Only
            </span>
          </button>

          <button
            type="button"
            disabled
            aria-label="Clear Suite (QA Lead Only)"
            title="QA Lead Only — Switch to QA Lead role to clear the test suite"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5 text-violet-500 shrink-0" aria-hidden="true" />
            <span>Clear Suite</span>
            <span className="text-[11px] text-slate-400 border-l border-slate-200 pl-2">
              QA Lead Only
            </span>
          </button>
        </div>
      </section>
    );
  }

  // QA Lead View: Exclusive QA Lead Release Control Panel
  return (
    <section
      aria-label="QA Lead Release Control Panel"
      data-testid="qa-lead-release-panel"
      className="rounded-xl bg-white border border-violet-300/90 shadow-xs p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" aria-hidden="true" />
              <span>QA Lead Release Control Panel</span>
            </h2>
            <span
              data-testid="release-gate-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap ${gateConfig.badgeClasses}`}
            >
              <GateIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{gateConfig.label}</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl">{gate.summary}</p>
        </div>

        {/* Gate Threshold Readout */}
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums bg-[#f8f5ff] border border-violet-200/80 rounded-lg px-3.5 py-2">
          <div>
            <span className="text-slate-500 block text-[11px]">Pass Rate Gate</span>
            <span
              className={
                gate.passRate >= gate.threshold
                  ? 'text-emerald-600 font-semibold'
                  : 'text-rose-600 font-semibold'
              }
            >
              {gate.passRate}% / {gate.threshold}%
            </span>
          </div>
          <div className="w-px h-7 bg-violet-200" aria-hidden="true" />
          <div>
            <span className="text-slate-500 block text-[11px]">High-Priority Fails</span>
            <span
              className={
                gate.highPriorityFailures === 0
                  ? 'text-emerald-600 font-semibold'
                  : 'text-rose-600 font-semibold'
              }
            >
              {gate.highPriorityFailures} (max 0)
            </span>
          </div>
        </div>
      </div>

      {/* Blockers & Warnings */}
      {(gate.blockers.length > 0 || gate.warnings.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {gate.blockers.length > 0 && (
            <div className="rounded-lg bg-rose-50/90 border border-rose-200 p-3 space-y-1">
              <p className="font-semibold text-rose-700 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Release Blockers</span>
              </p>
              <ul className="space-y-1 text-rose-800 pl-5 list-disc">
                {gate.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          {gate.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50/90 border border-amber-200 p-3 space-y-1">
              <p className="font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Advisory Warnings</span>
              </p>
              <ul className="space-y-1 text-amber-900 pl-5 list-disc">
                {gate.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Release Approval Sign-off Banner if approved */}
      {releaseApproval && (
        <div
          data-testid="release-approved-banner"
          className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>
              Release approved by <strong>{releaseApproval.approvedBy}</strong> at{' '}
              <span className="font-mono tabular-nums">
                {new Date(releaseApproval.approvedAt).toLocaleString()}
              </span>{' '}
              ({releaseApproval.passedCases}/{releaseApproval.totalCases} passed ·{' '}
              {releaseApproval.passRate}%).
            </span>
          </div>
          <button
            type="button"
            onClick={onRevokeApproval}
            className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer whitespace-nowrap font-medium"
          >
            Revoke Sign-off
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="pt-2 border-t border-violet-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onApproveRelease}
            disabled={!gate.canApprove || Boolean(releaseApproval)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
              gate.canApprove && !releaseApproval
                ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{releaseApproval ? 'Release Approved' : 'Approve Release'}</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={metrics.total === 0}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
              metrics.total > 0
                ? 'bg-white hover:bg-violet-50 text-slate-700 border-violet-200 cursor-pointer'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Export Full RTM &amp; Coverage CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onClearPassed}
            disabled={metrics.passed === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
              metrics.passed > 0
                ? 'bg-white hover:bg-violet-50 text-slate-700 border-violet-200 cursor-pointer'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Clear All Passed Tests ({metrics.passed})</span>
          </button>

          {!confirmClearSuite ? (
            <button
              type="button"
              onClick={() => setConfirmClearSuite(true)}
              disabled={metrics.total === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
                metrics.total > 0
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Clear Suite</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2.5 py-1">
              <span className="text-xs text-rose-800 whitespace-nowrap">
                Clear all {metrics.total}?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearSuite();
                  setConfirmClearSuite(false);
                }}
                className="px-2 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearSuite(false)}
                className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
