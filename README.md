# TestCase AI

**AI-Powered Test Case Generator & Coverage Tracker**

TestCase AI is a dark-mode Software Quality Assurance (SQA) engineering workspace designed for QA Engineers and QA Leads to synthesize structured test suites from product requirements, execute test runs, draft Markdown defect reports, and enforce automated Go / No-Go release gates.

---

## Overview & Architecture

TestCase AI follows a decoupled client-server architecture with zero external database setup:

```text
Browser (React 19 + TypeScript + Tailwind CSS)
  ├── Local Persistence (localStorage)
  │     └── Test Suite, Execution Notes, Active Requirement, Role & Sign-off
  └── POST /api/generate-test-cases
        │
        ▼
Express Server (server.ts)
  ├── Security Headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
  ├── 50kb JSON Payload Cap & Control-Character Sanitization (4,000-char limit)
  ├── In-Memory IP Rate Limiter (15 requests / minute)
  └── @google/genai SDK (gemini-2.5-flash + strict JSON responseSchema)
```

- **Server-Side AI Proxy**: All Gemini API calls execute exclusively inside `server.ts`. The browser communicates only with `POST /api/generate-test-cases`.
- **Zero-Database Persistence**: Test suites, execution statuses, actual result notes, active requirements, and release sign-offs persist automatically in browser `localStorage`.
- **Decoupled Pure Domain Logic**: Pass-rate math, category coverage scoring, Go / No-Go release gating, Markdown defect generation, and RFC-4180 CSV export live in `src/utils/coverageLogic.ts` and are covered by unit tests.

---

## Key Features

### 1. AI Test Case & Edge-Case Generator
- Paste any User Story, Feature Requirement, or Acceptance Criteria (up to 4,000 characters with live counter and validation).
- Includes 3 one-click sample requirement presets (**E-Commerce Checkout**, **2FA Login & Lockout**, **Payment Webhook**) for rapid testing.
- Synthesizes structured test cases across four SQA categories: **Positive**, **Negative**, **Boundary**, and **Security**.
- Every generated case includes a sequential `id` (e.g., `TC-101`), `title`, `category`, `priority` (`High` | `Medium` | `Low`), `preconditions`, numbered `steps`, and `expectedResult`.
- Select individual or all staged candidates and save them directly to the persisted Test Suite.

### 2. Interactive Test Execution & Coverage Tracker
- **Live Coverage & Quality Metrics**: Real-time Total Test Cases, Overall Pass Rate %, Failed Count (with High-Priority failure tracking), Blocked Count, and per-category coverage progress bars.
- **Filtering & Search**: Filter by execution status (`All`, `Untested`, `Passed`, `Failed`, `Blocked`), priority (`High`, `Medium`, `Low`), or live text search across IDs, titles, and execution notes.
- **Expandable Execution Cards**: Inspect preconditions, numbered steps, and expected results; log **Actual Result / Execution Notes**; and update execution status in one click (**Pass**, **Fail**, **Block**).
- **Instant Defect Draft**: Marking any test case as **Failed** surfaces a **Copy Bug Report** button that copies a formatted Markdown defect report (Test ID, Priority, Category, Preconditions, Steps, Expected vs. Actual Result) directly to the clipboard.

### 3. Role-Based Access Control (QA Tester vs. QA Lead)
Switch roles at any time using the top header **Role Switcher** to experience role-scoped views, theming, and permissions:

| Capability | QA Tester Mode (Blue Theme) | QA Lead Mode (Purple Theme) |
| :--- | :---: | :---: |
| Default Landing View | AI Test Generator | Coverage & Execution Tracker |
| Workspace Banner | QA Tester Workspace | `Lead Mode Active` Banner |
| Generate & Save Test Cases | Allowed | Allowed |
| Execute Tests (Pass / Fail / Block) & Edit Notes | Allowed | Allowed |
| Copy Markdown Bug Reports | Allowed | Allowed |
| Delete Individual Test Cases | Locked (`QA Lead Only`) | Unlocked |
| Automated Go / No-Go Release Gate & Approve Release | Read-Only / Locked | Unlocked |
| Clear All Passed Tests & Clear Suite | Locked (`QA Lead Only`) | Unlocked |
| Export Full RTM & Coverage CSV | — | Unlocked |

### 4. One-Click Demo Data
Click **Load Demo Data** in the top header at any time to populate a realistic 10-case 2FA & Lockout test suite distributed across **Passed**, **Failed**, **Blocked**, and **Untested** states—no API key required to evaluate the execution tracker, defect drafts, RBAC permissions, release gates, or CSV exports.

---

## Security Controls

- **Strict Server-Side Key Isolation**: `GEMINI_API_KEY` is read exclusively from `process.env` in `server.ts`. The `@google/genai` SDK is never imported in client-side code.
- **Security HTTP Headers**: Express applies Helmet-style headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`, and disables `X-Powered-By`.
- **Payload & Input Hardening**: Express enforces a `50kb` JSON body size cap (`HTTP 413` on overflow). Server-side validation rejects empty inputs, caps requirements at `4,000` characters (`HTTP 400`), and strips unsafe ASCII control characters.
- **In-Memory IP Rate Limiting**: `POST /api/generate-test-cases` enforces a limit of `15 requests/minute` per client IP (`HTTP 429` with `Retry-After` and `X-RateLimit-*` headers).
- **Strict Structured Schema Output**: Gemini is invoked with `responseMimeType: "application/json"` and a typed `responseSchema`, followed by server-side runtime normalization and enum validation without dynamic code execution.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite
- **Backend**: Express, `@google/genai` (`gemini-2.5-flash`), `tsx`, `dotenv`
- **Persistence**: Browser `localStorage`
- **Testing**: Node.js built-in test runner (`node:test` & `node:assert/strict`) via `tsx`

---

## Quick Start Guide

### Prerequisites
- Node.js `>= 20` (recommended `22+`)
- npm `>= 10`
- A Gemini API key (optional if evaluating with Demo Data; required for live AI generation)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and add your Gemini API key:
```bash
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

### 3. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
NODE_ENV=production npm start
```

---

## Instant Evaluation Guide (No API Key Required)

You can evaluate the full SQA workflow in under 60 seconds:

1. **Load Demo Data**: Click **Load Demo Data** in the top-right header to seed 10 realistic test cases across Passed, Failed, Blocked, and Untested states.
2. **Inspect QA Tester Restrictions**: Open **Coverage Tracker** while in **QA Tester** mode (blue banner). Notice that **Approve Release**, **Clear Suite**, and **Delete** controls are locked with `QA Lead Only` indicators, while test execution and note editing remain active.
3. **Test Instant Defect Drafts**: Filter by **Failed**, expand `TC-104`, edit the **Actual Result / Execution Notes**, and click **Copy Bug Report** to copy a ready-to-paste Markdown issue report.
4. **Switch to QA Lead Mode**: Click **QA Lead** in the header **Role Switcher**. The workspace shifts to the purple **Lead Mode Active** theme and unlocks the **QA Lead Release Control Panel** (currently showing **NO-GO — Release Blocked** due to a high-priority failure and sub-85% pass rate).
5. **Trigger Automated GO Gate & Export RTM**: Reset filters to **All**, mark `TC-104`, `TC-108`, and `TC-109` as **Pass** to watch the pass rate reach `90%` and the indicator flip live to **GO — Ready for Release**. Click **Approve Release** and **Export Full RTM & Coverage CSV** to download the full traceability report.

---

## Running Unit Tests

Unit tests verify pass-rate calculations, category coverage scoring, automated Go / No-Go release gate thresholds, Markdown defect formatting, RFC-4180 CSV escaping, and requirement input sanitization:

```bash
npx tsx --test src/utils/coverageLogic.test.ts
```

Or via npm script:

```bash
npm test
```

Type-check the entire project:

```bash
npm run lint
```
