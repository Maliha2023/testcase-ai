import type {
  CategoryMetric,
  GeneratedTestCase,
  ReleaseGateEvaluation,
  SuiteMetrics,
  TestCase,
  TestCategory,
  TestPriority,
} from '../types/qa.ts';

export const TEST_CATEGORIES: readonly TestCategory[] = [
  'Positive',
  'Negative',
  'Boundary',
  'Security',
] as const;

export const MAX_REQUIREMENT_LENGTH = 4000;
export const DEFAULT_PASS_RATE_THRESHOLD = 85;

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface SanitizedRequirementResult {
  valid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Strips unsafe ASCII control characters (preserving tabs and newlines),
 * trims surrounding whitespace, and enforces non-empty and 4,000-char bounds.
 */
export function sanitizeRequirementInput(raw: unknown): SanitizedRequirementResult {
  if (typeof raw !== 'string') {
    return {
      valid: false,
      sanitized: '',
      error: 'Requirement input must be a text string.',
    };
  }

  // Strip ASCII control characters except \t (0x09), \n (0x0A), and \r (0x0D)
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

  if (cleaned.length === 0) {
    return {
      valid: false,
      sanitized: '',
      error: 'Please enter a user story, feature requirement, or acceptance criteria.',
    };
  }

  if (cleaned.length > MAX_REQUIREMENT_LENGTH) {
    return {
      valid: false,
      sanitized: cleaned.slice(0, MAX_REQUIREMENT_LENGTH),
      error: `Requirement exceeds the maximum length of ${MAX_REQUIREMENT_LENGTH.toLocaleString()} characters.`,
    };
  }

  return {
    valid: true,
    sanitized: cleaned,
  };
}

/**
 * Calculates live suite coverage, pass rates, high-priority failure counts,
 * and per-category breakdown.
 */
export function calculateSuiteMetrics(testCases: TestCase[]): SuiteMetrics {
  const total = testCases.length;
  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let untested = 0;
  let highPriorityFailures = 0;

  const categoryCounts: Record<
    TestCategory,
    { total: number; passed: number; failed: number; blocked: number; untested: number }
  > = {
    Positive: { total: 0, passed: 0, failed: 0, blocked: 0, untested: 0 },
    Negative: { total: 0, passed: 0, failed: 0, blocked: 0, untested: 0 },
    Boundary: { total: 0, passed: 0, failed: 0, blocked: 0, untested: 0 },
    Security: { total: 0, passed: 0, failed: 0, blocked: 0, untested: 0 },
  };

  for (const tc of testCases) {
    const bucket = categoryCounts[tc.category];
    if (bucket) {
      bucket.total += 1;
    }

    switch (tc.status) {
      case 'Passed':
        passed += 1;
        if (bucket) bucket.passed += 1;
        break;
      case 'Failed':
        failed += 1;
        if (bucket) bucket.failed += 1;
        if (tc.priority === 'High') {
          highPriorityFailures += 1;
        }
        break;
      case 'Blocked':
        blocked += 1;
        if (bucket) bucket.blocked += 1;
        break;
      case 'Untested':
      default:
        untested += 1;
        if (bucket) bucket.untested += 1;
        break;
    }
  }

  const executed = passed + failed + blocked;
  const passRate = total === 0 ? 0 : roundToOneDecimal((passed / total) * 100);
  const executedPassRate =
    executed === 0 ? 0 : roundToOneDecimal((passed / executed) * 100);
  const executionCoverage =
    total === 0 ? 0 : roundToOneDecimal((executed / total) * 100);

  let coveredCategories = 0;
  const categoryBreakdown: CategoryMetric[] = TEST_CATEGORIES.map((category) => {
    const c = categoryCounts[category];
    if (c.total > 0) coveredCategories += 1;
    return {
      category,
      total: c.total,
      passed: c.passed,
      failed: c.failed,
      blocked: c.blocked,
      untested: c.untested,
      passRate: c.total === 0 ? 0 : roundToOneDecimal((c.passed / c.total) * 100),
      sharePct: total === 0 ? 0 : roundToOneDecimal((c.total / total) * 100),
    };
  });

  const categoryCoverageScore = Math.round(
    (coveredCategories / TEST_CATEGORIES.length) * 100
  );

  return {
    total,
    passed,
    failed,
    blocked,
    untested,
    executed,
    passRate,
    executedPassRate,
    executionCoverage,
    highPriorityFailures,
    categoryCoverageScore,
    coveredCategories,
    categoryBreakdown,
  };
}

/**
 * Evaluates automated Go / No-Go release readiness based on overall pass rate
 * and zero high-priority failures.
 */
export function evaluateReleaseGate(
  testCases: TestCase[],
  passRateThreshold: number = DEFAULT_PASS_RATE_THRESHOLD
): ReleaseGateEvaluation {
  const metrics = calculateSuiteMetrics(testCases);

  if (metrics.total === 0) {
    return {
      status: 'PENDING',
      canApprove: false,
      passRate: 0,
      threshold: passRateThreshold,
      highPriorityFailures: 0,
      blockers: ['Test suite is empty. Add and execute test cases before sign-off.'],
      warnings: [],
      summary: 'Awaiting test cases to evaluate release readiness.',
    };
  }

  if (metrics.executed === 0) {
    return {
      status: 'PENDING',
      canApprove: false,
      passRate: 0,
      threshold: passRateThreshold,
      highPriorityFailures: 0,
      blockers: ['No test cases have been executed yet.'],
      warnings: [],
      summary: 'Execute test cases to unlock automated release gate scoring.',
    };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (metrics.highPriorityFailures > 0) {
    blockers.push(
      `${metrics.highPriorityFailures} High-priority test ${
        metrics.highPriorityFailures === 1 ? 'case is' : 'cases are'
      } currently failing.`
    );
  }

  if (metrics.passRate < passRateThreshold) {
    blockers.push(
      `Overall pass rate (${metrics.passRate}%) is below the ${passRateThreshold}% release threshold.`
    );
  }

  if (metrics.blocked > 0) {
    warnings.push(
      `${metrics.blocked} test ${metrics.blocked === 1 ? 'case is' : 'cases are'} blocked.`
    );
  }

  if (metrics.untested > 0) {
    warnings.push(
      `${metrics.untested} test ${metrics.untested === 1 ? 'case remains' : 'cases remain'} untested.`
    );
  }

  if (metrics.categoryCoverageScore < 100) {
    const missing = metrics.categoryBreakdown
      .filter((c) => c.total === 0)
      .map((c) => c.category)
      .join(', ');
    warnings.push(`Missing test coverage in: ${missing}.`);
  }

  if (blockers.length > 0) {
    return {
      status: 'NO_GO',
      canApprove: false,
      passRate: metrics.passRate,
      threshold: passRateThreshold,
      highPriorityFailures: metrics.highPriorityFailures,
      blockers,
      warnings,
      summary: 'Release blocked. Resolve high-priority failures and meet pass-rate gate.',
    };
  }

  return {
    status: 'GO',
    canApprove: true,
    passRate: metrics.passRate,
    threshold: passRateThreshold,
    highPriorityFailures: 0,
    blockers: [],
    warnings,
    summary: `All release criteria met (${metrics.passRate}% pass rate, 0 high-priority failures).`,
  };
}

/**
 * Formats a failed test case into a clean Markdown defect report for clipboard copy.
 */
export function formatBugReportMarkdown(tc: TestCase): string {
  const stepsList = tc.steps
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n');

  const actualNotes = tc.actualResult.trim()
    ? tc.actualResult.trim()
    : '_No actual result notes recorded yet._';

  return [
    `## Defect Report: ${tc.id} — ${tc.title}`,
    '',
    `- **Test Case ID:** \`${tc.id}\``,
    `- **Priority:** ${tc.priority}`,
    `- **Category:** ${tc.category}`,
    `- **Status:** ${tc.status}`,
    tc.requirementRef ? `- **Requirement Reference:** ${tc.requirementRef}` : null,
    '',
    '### Preconditions',
    tc.preconditions || '_None specified._',
    '',
    '### Steps to Reproduce',
    stepsList || '1. Execute test scenario.',
    '',
    '### Expected Result',
    tc.expectedResult,
    '',
    '### Actual Result',
    actualNotes,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

/**
 * Generates an RFC-4180 compliant Requirement Traceability Matrix (RTM) & Coverage CSV.
 */
export function generateRtmCsv(testCases: TestCase[]): string {
  const metrics = calculateSuiteMetrics(testCases);
  const gate = evaluateReleaseGate(testCases);

  const headers = [
    'Test ID',
    'Title',
    'Category',
    'Priority',
    'Status',
    'Requirement Reference',
    'Preconditions',
    'Steps',
    'Expected Result',
    'Actual Result / Notes',
    'Last Updated',
  ];

  const rows = testCases.map((tc) => [
    tc.id,
    tc.title,
    tc.category,
    tc.priority,
    tc.status,
    tc.requirementRef || 'General Requirement',
    tc.preconditions,
    tc.steps.map((s, i) => `${i + 1}. ${s}`).join(' | '),
    tc.expectedResult,
    tc.actualResult,
    tc.updatedAt,
  ]);

  const summaryRows = [
    [],
    ['RTM Coverage Summary'],
    ['Total Test Cases', String(metrics.total)],
    ['Passed', String(metrics.passed)],
    ['Failed', String(metrics.failed)],
    ['Blocked', String(metrics.blocked)],
    ['Untested', String(metrics.untested)],
    ['Overall Pass Rate (%)', `${metrics.passRate}%`],
    ['Category Coverage (%)', `${metrics.categoryCoverageScore}%`],
    ['High-Priority Failures', String(metrics.highPriorityFailures)],
    ['Release Gate Status', gate.status],
  ];

  const allRows = [headers, ...rows, ...summaryRows];
  return allRows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
}

/**
 * Computes the next sequential TC-NNN numeric index without colliding with existing IDs.
 */
export function getNextTestCaseNumber(existingCases: TestCase[]): number {
  let maxNum = 100;
  for (const tc of existingCases) {
    const match = /^TC-(\d+)$/i.exec(tc.id.trim());
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return maxNum + 1;
}

const VALID_CATEGORIES = new Set<TestCategory>([
  'Positive',
  'Negative',
  'Boundary',
  'Security',
]);

const VALID_PRIORITIES = new Set<TestPriority>(['High', 'Medium', 'Low']);

/**
 * Strictly validates and normalizes raw parsed JSON test case arrays
 * returned from the Gemini structured schema in both server and client modes.
 */
export function normalizeGeneratedCases(
  rawItems: unknown,
  nextIdStart: number
): GeneratedTestCase[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  const normalized: GeneratedTestCase[] = [];
  let seq = Number.isInteger(nextIdStart) && nextIdStart >= 1 ? nextIdStart : 101;

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;

    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    const preconditions =
      typeof rec.preconditions === 'string' && rec.preconditions.trim().length > 0
        ? rec.preconditions.trim()
        : 'None specified.';
    const expectedResult =
      typeof rec.expectedResult === 'string' ? rec.expectedResult.trim() : '';
    const rawSteps = Array.isArray(rec.steps) ? rec.steps : [];
    const steps = rawSteps
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim());

    if (!title || !expectedResult || steps.length === 0) continue;

    const category: TestCategory = VALID_CATEGORIES.has(rec.category as TestCategory)
      ? (rec.category as TestCategory)
      : 'Positive';

    const priority: TestPriority = VALID_PRIORITIES.has(rec.priority as TestPriority)
      ? (rec.priority as TestPriority)
      : 'Medium';

    normalized.push({
      id: `TC-${seq++}`,
      title,
      category,
      priority,
      preconditions,
      steps,
      expectedResult,
    });
  }

  return normalized;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  check: (key: string, nowMs?: number) => RateLimitCheckResult;
  cleanup: (nowMs?: number) => void;
}

/**
 * Lightweight fixed-window rate limiter shared by Express server IP limiting
 * and the client-side static fallback guard.
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number
): RateLimiter {
  const store = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string, nowMs: number = Date.now()): RateLimitCheckResult {
      const existing = store.get(key);
      if (!existing || existing.resetAt <= nowMs) {
        store.set(key, { count: 1, resetAt: nowMs + windowMs });
        return {
          allowed: true,
          remaining: Math.max(0, maxRequests - 1),
          retryAfterSec: 0,
        };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - existing.count),
        retryAfterSec: 0,
      };
    },
    cleanup(nowMs: number = Date.now()): void {
      for (const [k, entry] of store.entries()) {
        if (entry.resetAt <= nowMs) {
          store.delete(k);
        }
      }
    },
  };
}
