import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestCase } from '../types/qa';
import {
  calculateSuiteMetrics,
  createRateLimiter,
  evaluateReleaseGate,
  formatBugReportMarkdown,
  generateRtmCsv,
  getNextTestCaseNumber,
  normalizeGeneratedCases,
  sanitizeRequirementInput,
} from './coverageLogic';

function makeCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: 'TC-101',
    title: 'Sample test case',
    category: 'Positive',
    priority: 'Medium',
    preconditions: 'User is authenticated',
    steps: ['Open page', 'Submit valid input'],
    expectedResult: 'Action succeeds with HTTP 200',
    status: 'Untested',
    actualResult: '',
    requirementRef: 'REQ-01',
    updatedAt: '2026-11-19T00:00:00.000Z',
    ...overrides,
  };
}

test('calculateSuiteMetrics handles an empty test suite gracefully', () => {
  const metrics = calculateSuiteMetrics([]);
  assert.equal(metrics.total, 0);
  assert.equal(metrics.passRate, 0);
  assert.equal(metrics.executedPassRate, 0);
  assert.equal(metrics.executionCoverage, 0);
  assert.equal(metrics.categoryCoverageScore, 0);
  assert.equal(metrics.highPriorityFailures, 0);
  assert.equal(metrics.categoryBreakdown.length, 4);
});

test('calculateSuiteMetrics computes pass rates, category coverage, and high-priority failures accurately', () => {
  const suite: TestCase[] = [
    makeCase({ id: 'TC-101', category: 'Positive', priority: 'High', status: 'Passed' }),
    makeCase({ id: 'TC-102', category: 'Negative', priority: 'High', status: 'Failed' }),
    makeCase({ id: 'TC-103', category: 'Boundary', priority: 'Medium', status: 'Passed' }),
    makeCase({ id: 'TC-104', category: 'Security', priority: 'High', status: 'Passed' }),
    makeCase({ id: 'TC-105', category: 'Positive', priority: 'Low', status: 'Blocked' }),
    makeCase({ id: 'TC-106', category: 'Negative', priority: 'Low', status: 'Untested' }),
  ];

  const metrics = calculateSuiteMetrics(suite);
  assert.equal(metrics.total, 6);
  assert.equal(metrics.passed, 3);
  assert.equal(metrics.failed, 1);
  assert.equal(metrics.blocked, 1);
  assert.equal(metrics.untested, 1);
  assert.equal(metrics.executed, 5);
  assert.equal(metrics.passRate, 50); // 3/6 = 50%
  assert.equal(metrics.executedPassRate, 60); // 3/5 = 60%
  assert.equal(metrics.executionCoverage, 83.3); // 5/6 = 83.3%
  assert.equal(metrics.highPriorityFailures, 1);
  assert.equal(metrics.categoryCoverageScore, 100); // all 4 categories represented
  assert.equal(metrics.coveredCategories, 4);

  const positive = metrics.categoryBreakdown.find((c) => c.category === 'Positive');
  assert.ok(positive);
  assert.equal(positive.total, 2);
  assert.equal(positive.passed, 1);
  assert.equal(positive.blocked, 1);
  assert.equal(positive.passRate, 50);
});

test('calculateSuiteMetrics reports partial category coverage score when categories are missing', () => {
  const suite: TestCase[] = [
    makeCase({ id: 'TC-101', category: 'Positive', status: 'Passed' }),
    makeCase({ id: 'TC-102', category: 'Security', status: 'Passed' }),
  ];

  const metrics = calculateSuiteMetrics(suite);
  assert.equal(metrics.coveredCategories, 2);
  assert.equal(metrics.categoryCoverageScore, 50);
});

test('evaluateReleaseGate returns PENDING for empty or completely untested suites', () => {
  const emptyGate = evaluateReleaseGate([]);
  assert.equal(emptyGate.status, 'PENDING');
  assert.equal(emptyGate.canApprove, false);

  const untestedGate = evaluateReleaseGate([
    makeCase({ id: 'TC-101', status: 'Untested' }),
    makeCase({ id: 'TC-102', status: 'Untested' }),
  ]);
  assert.equal(untestedGate.status, 'PENDING');
  assert.equal(untestedGate.canApprove, false);
});

test('evaluateReleaseGate returns GO when pass rate meets threshold and zero high-priority failures exist', () => {
  const suite: TestCase[] = [
    makeCase({ id: 'TC-101', category: 'Positive', priority: 'High', status: 'Passed' }),
    makeCase({ id: 'TC-102', category: 'Negative', priority: 'High', status: 'Passed' }),
    makeCase({ id: 'TC-103', category: 'Boundary', priority: 'Medium', status: 'Passed' }),
    makeCase({ id: 'TC-104', category: 'Security', priority: 'High', status: 'Passed' }),
    makeCase({ id: 'TC-105', category: 'Positive', priority: 'Medium', status: 'Passed' }),
    makeCase({ id: 'TC-106', category: 'Negative', priority: 'Low', status: 'Passed' }),
    makeCase({ id: 'TC-107', category: 'Boundary', priority: 'Low', status: 'Failed' }), // low-priority failure allowed if pass rate >= 85%
  ];

  const gate = evaluateReleaseGate(suite, 85);
  assert.equal(gate.passRate, 85.7); // 6/7 = 85.7%
  assert.equal(gate.highPriorityFailures, 0);
  assert.equal(gate.status, 'GO');
  assert.equal(gate.canApprove, true);
  assert.equal(gate.blockers.length, 0);
});

test('evaluateReleaseGate returns NO_GO when a high-priority failure exists even if pass rate >= 85%', () => {
  const suite: TestCase[] = [
    ...Array.from({ length: 9 }, (_, i) =>
      makeCase({
        id: `TC-${101 + i}`,
        priority: 'Medium',
        status: 'Passed',
      })
    ),
    makeCase({
      id: 'TC-110',
      category: 'Security',
      priority: 'High',
      status: 'Failed',
    }),
  ];

  const gate = evaluateReleaseGate(suite, 85);
  assert.equal(gate.passRate, 90);
  assert.equal(gate.highPriorityFailures, 1);
  assert.equal(gate.status, 'NO_GO');
  assert.equal(gate.canApprove, false);
  assert.ok(gate.blockers.some((b) => b.includes('High-priority')));
});

test('evaluateReleaseGate returns NO_GO when pass rate falls below threshold', () => {
  const suite: TestCase[] = [
    makeCase({ id: 'TC-101', status: 'Passed' }),
    makeCase({ id: 'TC-102', status: 'Passed' }),
    makeCase({ id: 'TC-103', status: 'Passed' }),
    makeCase({ id: 'TC-104', status: 'Blocked' }),
  ];

  const gate = evaluateReleaseGate(suite, 85);
  assert.equal(gate.passRate, 75);
  assert.equal(gate.status, 'NO_GO');
  assert.equal(gate.canApprove, false);
  assert.ok(gate.blockers.some((b) => b.includes('below the 85%')));
});

test('formatBugReportMarkdown produces structured Markdown containing ID, steps, expected, and actual results', () => {
  const failedCase = makeCase({
    id: 'TC-204',
    title: 'Reject expired HMAC signature on webhook',
    category: 'Security',
    priority: 'High',
    status: 'Failed',
    steps: ['Send webhook with timestamp older than 5 minutes', 'Inspect HTTP response'],
    expectedResult: 'Server responds with HTTP 401 Unauthorized',
    actualResult: 'Server returned HTTP 200 and processed replay event.',
  });

  const md = formatBugReportMarkdown(failedCase);
  assert.ok(md.includes('TC-204'));
  assert.ok(md.includes('Reject expired HMAC signature on webhook'));
  assert.ok(md.includes('1. Send webhook with timestamp older than 5 minutes'));
  assert.ok(md.includes('Server responds with HTTP 401 Unauthorized'));
  assert.ok(md.includes('Server returned HTTP 200 and processed replay event.'));
});

test('generateRtmCsv outputs valid CSV headers, escaped commas/quotes, and summary rows', () => {
  const suite: TestCase[] = [
    makeCase({
      id: 'TC-101',
      title: 'Checkout with "VIP20", free shipping',
      status: 'Passed',
    }),
  ];

  const csv = generateRtmCsv(suite);
  assert.ok(csv.startsWith('Test ID,Title,Category,Priority,Status'));
  assert.ok(csv.includes('"Checkout with ""VIP20"", free shipping"'));
  assert.ok(csv.includes('RTM Coverage Summary'));
  assert.ok(csv.includes('Release Gate Status,GO'));
});

test('sanitizeRequirementInput strips control chars and validates bounds', () => {
  assert.equal(sanitizeRequirementInput('   ').valid, false);
  assert.equal(sanitizeRequirementInput('a'.repeat(4001)).valid, false);

  const ok = sanitizeRequirementInput('User logs in\x00\x07\nwith valid TOTP\x1F');
  assert.equal(ok.valid, true);
  assert.equal(ok.sanitized, 'User logs in\nwith valid TOTP');
});

test('getNextTestCaseNumber increments from highest existing TC number', () => {
  assert.equal(getNextTestCaseNumber([]), 101);
  assert.equal(
    getNextTestCaseNumber([makeCase({ id: 'TC-105' }), makeCase({ id: 'TC-112' })]),
    113
  );
});

test('normalizeGeneratedCases validates structure, enforces enums, and assigns sequential IDs', () => {
  const normalized = normalizeGeneratedCases(
    [
      {
        title: '  Valid login  ',
        category: 'Security',
        priority: 'High',
        preconditions: 'Account exists',
        steps: ['Step 1', '  ', 'Step 2'],
        expectedResult: 'HTTP 200',
      },
      {
        title: 'Fallback enum test',
        category: 'UnknownCategory',
        priority: 'Critical',
        preconditions: '',
        steps: ['Run boundary check'],
        expectedResult: 'Handled safely',
      },
      {
        // Invalid item missing expectedResult should be filtered out
        title: 'Broken item',
        steps: ['Step 1'],
      },
    ],
    201
  );

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].id, 'TC-201');
  assert.equal(normalized[0].title, 'Valid login');
  assert.equal(normalized[0].category, 'Security');
  assert.equal(normalized[0].priority, 'High');
  assert.deepEqual(normalized[0].steps, ['Step 1', 'Step 2']);

  assert.equal(normalized[1].id, 'TC-202');
  assert.equal(normalized[1].category, 'Positive');
  assert.equal(normalized[1].priority, 'Medium');
  assert.equal(normalized[1].preconditions, 'None specified.');
});

test('createRateLimiter enforces max requests per window and resets after expiry', () => {
  const limiter = createRateLimiter(2, 60_000);
  const t0 = 1_000_000;

  const r1 = limiter.check('127.0.0.1', t0);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 1);

  const r2 = limiter.check('127.0.0.1', t0 + 1000);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 0);

  const r3 = limiter.check('127.0.0.1', t0 + 2000);
  assert.equal(r3.allowed, false);
  assert.equal(r3.retryAfterSec, 58);

  // Window resets after 60s
  const r4 = limiter.check('127.0.0.1', t0 + 60_001);
  assert.equal(r4.allowed, true);
  assert.equal(r4.remaining, 1);
});
