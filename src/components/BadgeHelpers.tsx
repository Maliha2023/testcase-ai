import {
  AlertOctagon,
  CheckCircle2,
  CircleDashed,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { TestCategory, TestPriority, TestStatus } from '../types/qa';

export function CategoryBadge({ category }: { category: TestCategory }) {
  const styles: Record<TestCategory, string> = {
    Positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Negative: 'bg-rose-50 text-rose-700 border-rose-200',
    Boundary: 'bg-amber-50 text-amber-800 border-amber-200',
    Security: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${styles[category]}`}
    >
      {category}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TestPriority }) {
  const styles: Record<TestPriority, string> = {
    High: 'bg-rose-50 text-rose-700 border-rose-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${styles[priority]}`}
    >
      {priority} Priority
    </span>
  );
}

export function StatusBadge({ status }: { status: TestStatus }) {
  const config: Record<
    TestStatus,
    { classes: string; Icon: typeof CheckCircle2 }
  > = {
    Passed: {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: CheckCircle2,
    },
    Failed: {
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      Icon: XCircle,
    },
    Blocked: {
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: AlertOctagon,
    },
    Untested: {
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
      Icon: CircleDashed,
    },
  };

  const { classes, Icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function QaLeadOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap shrink-0">
      <ShieldAlert className="w-3 h-3 text-violet-600 shrink-0" aria-hidden="true" />
      <span>QA Lead Only</span>
    </span>
  );
}
