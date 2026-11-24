# TestCase AI

**AI-Powered Test Case Generator & Coverage Tracker**

TestCase AI is a Software Quality Assurance (SQA) engineering workspace for QA Testers and QA Leads to synthesize structured test matrices from product requirements, execute test runs, draft Markdown defect reports, evaluate automated Go / No-Go release gates, and export Requirement Traceability Matrix (RTM) reports.

---

## Features

### 1. AI Test Case & Edge-Case Generator (Soft Sky-Blue Dashboard)
- **Requirement Workbench**: Paste any User Story, API contract, or Acceptance Criteria (up to 4,000 characters with live character counter and validation).
- **Quick Sample Presets**: Three built-in presets (**E-Commerce Checkout**, **2FA Login & Lockout**, **Payment Webhook**) for instant test generation.
- **Structured 4-Category Synthesis**: Generates 8 structured test cases balanced across **Positive**, **Negative**, **Boundary**, and **Security** categories using `gemini-2.5-flash` with a strict JSON response schema.
- **Selective Staging**: Review preconditions, numbered steps, priorities (`High`, `Medium`, `Low`), and expected results; select individual or all candidates and save them into your persisted Test Suite with sequential `TC-NNN` IDs.

### 2. Test Execution & Coverage Tracker (Soft Lavender Dashboard)
- **Live Coverage & Quality KPIs**: Real-time totals (`executed` vs. `untested`), Overall Pass Rate %, Failed Cases (including High-Priority failure count), Blocked Cases, and per-category progress bars across all 4 SQA categories.
- **Search & Multi-Faceted Filtering**: Filter by execution status (`All`, `Untested`, `Passed`, `Failed`, `Blocked`), priority (`High`, `Medium`, `Low`), or live text search across test IDs, titles, requirement refs, and execution notes.
- **Expandable Execution Cards**: Toggle one-click **Pass**, **Fail**, or **Block** status, expand details to inspect preconditions/steps/expected results, and record **Actual Result / Execution Notes** persisted automatically in `localStorage`.
- **Instant Defect Drafts**: Marking any test case as **Failed** surfaces a **Copy Bug Report** action that copies a formatted Markdown issue report (metadata, preconditions, reproduction steps, expected vs. actual result) to the clipboard.

### 3. Role-Based Governance (`QA Tester` vs. `QA Lead`)
Switch roles at any time in the header **Role Switcher**:

| Capability | QA Tester (`QA_TESTER`) | QA Lead (`QA_LEAD`) |
| :--- | :---: | :---: |
| Default Landing Dashboard | AI Generator | Coverage Tracker |
| Generate & Save Test Cases | Allowed | Allowed |
| Execute Tests (Pass / Fail / Block) & Edit Notes | Allowed | Allowed |
| Copy Markdown Bug Reports | Allowed | Allowed |
| Delete Individual Test Cases | Locked (`QA Lead Only`) | Unlocked |
| Automated Release Gate & Approve / Revoke Sign-off | Read-Only / Locked | Unlocked |
| Clear All Passed Tests & Clear Suite | Locked (`QA Lead Only`) | Unlocked |
| Export Full RTM & Coverage CSV | — | Unlocked |

### 4. Automated Go / No-Go Release Gate & RTM Export
- **Automated Gate Evaluation**:
  - `GO`: Overall pass rate `>= 85%` and `0` High-priority failures.
  - `NO-GO`: Below `85%` pass rate or `>= 1` High-priority failure, with explicit blocker and advisory warning callouts.
  - `PENDING`: Empty suite or zero executed test cases.
- **Release Sign-Off**: QA Leads can record or revoke formal release approval (automatically invalidated if subsequent test changes break gate criteria).
- **RFC-4180 CSV Export**: Downloads a full Requirement Traceability Matrix and coverage summary CSV.

### 5. One-Click Demo Dataset
Click **Load Demo Data** in the header to load a 10-case 2FA & Lockout test suite across **Passed**, **Failed**, **Blocked**, and **Untested** states—ideal for evaluating all execution, defect-drafting, RBAC, and release-gate workflows without an API key.

---

## Architecture & Tech Stack

### System Flow

```text
Browser (React 19 + TypeScript + Tailwind CSS v4)
  ├── Local Persistence (window.localStorage)
  │     └── Test Suite, Execution Notes, Active Requirement, Role & Sign-off
  └── POST /api/generate-test-cases
        │
        ▼
Express Server (server.ts)
  ├── Security Headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
  ├── 50kb JSON Payload Cap & Control-Character Sanitization (4,000-char max)
  ├── In-Memory IP Rate Limiter (15 requests / 60s)
  └── @google/genai SDK (gemini-2.5-flash + typed JSON responseSchema)
```

- **Server-Side AI Proxy**: In development (`npm run dev`) and production (`npm start`), Gemini calls execute inside `server.ts` using `GEMINI_API_KEY` from environment variables.
- **Static-Hosting Fallback**: If `/api/generate-test-cases` is unreachable (e.g., `404`/`405` on static-only hosting), `src/services/testCaseGenerator.ts` supports an optional `VITE_GEMINI_API_KEY` client fallback with client-side rate limiting.
- **Decoupled Pure Logic**: Metrics math, release-gate scoring, Markdown bug formatting, RFC-4180 CSV serialization, input sanitization, ID allocation, and rate limiting are isolated in `src/utils/coverageLogic.ts` and unit-tested with `node:test`.

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons (`lucide-react`), Motion (`motion`), Vite 8
- **Backend**: Node.js, Express 4, `@google/genai` (`gemini-2.5-flash`), `dotenv`, `tsx`
- **Persistence**: Browser `localStorage` (zero external database setup required)
- **Testing**: Node built-in test runner (`tsx --test`)

### Project Structure

```text
├── server.ts                         # Express API proxy, security middleware, Vite dev/static serving
├── index.html                        # HTML entry point & Google Fonts (Plus Jakarta Sans, DM Sans, JetBrains Mono)
├── .env.example                      # Environment variable template (GEMINI_API_KEY, PORT)
├── src/
│   ├── App.tsx                       # Root state, localStorage persistence, RBAC & view orchestration
│   ├── index.css                     # Tailwind CSS v4 entry & base typography/scrollbar styling
│   ├── types/qa.ts                   # Shared TypeScript interfaces and status/category/role types
│   ├── data/samples.ts               # Sample requirement presets and 10-case 2FA demo suite
│   ├── services/testCaseGenerator.ts # API client with static-hosting fallback
│   ├── utils/
│   │   ├── coverageLogic.ts          # Pure coverage metrics, release gate, CSV/Markdown & validation logic
│   │   └── coverageLogic.test.ts     # Unit tests (13 test cases via node:test)
│   └── components/
│       ├── Header.tsx                # Top bar, dashboard view tabs, role switcher & workspace banner
│       ├── GeneratorView.tsx         # AI Generator dashboard (soft sky-blue theme)
│       ├── TrackerView.tsx           # Coverage Tracker dashboard (soft lavender theme)
│       ├── MetricsBar.tsx            # KPI strip & category coverage progress bars
│       ├── ReleaseControlPanel.tsx   # Automated Go/No-Go gate, sign-off, CSV export & cleanup controls
│       ├── TestCaseCard.tsx          # Expandable test execution card & instant defect draft strip
│       └── BadgeHelpers.tsx          # Status, category, priority, and QA Lead badges
```

---

## Setup & Installation

### Prerequisites
- **Node.js** `>= 20` (Node `22.14+` recommended for running `server.ts` cleanly)
- **npm** `>= 10`
- A **Gemini API Key** (required for live AI test generation; optional if evaluating with **Load Demo Data**)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
No secrets are hardcoded in the repository. Create a local `.env` file from `.env.example` (already ignored by `.gitignore`):

```bash
cp .env.example .env
```

Update `.env` with your Gemini API key:

```env
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

> **Note:** Keep `.env` private—`.gitignore` ignores `.env`, `.env.local`, `.env.*.local`, and `.env*` while tracking `.env.example`.

### 3. Run in Development
```bash
npm run dev
```

This starts the Express server with Vite middleware at [http://localhost:3000](http://localhost:3000).

### 4. Production Build & Start
```bash
npm run build
NODE_ENV=production npm start
```

---

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts `server.ts` in development mode with Vite middleware on port `3000` |
| `npm run build` | Builds the React + Vite frontend bundle into `dist/` |
| `npm start` | Runs `server.ts` to serve `dist/` and `/api/*` routes |
| `npm test` | Runs unit tests in `src/utils/coverageLogic.test.ts` via `tsx --test` |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Removes `dist/` and `server.js` build artifacts |

---

## Usage & Quick Evaluation

1. **Generate Test Cases (AI Generator)**:
   - Select one of the quick presets (**E-Commerce Checkout**, **2FA Login & Lockout**, or **Payment Webhook**) or paste your own requirement.
   - Click **Generate Test Cases**, review the staged candidates, and click **Save to Test Suite**.
2. **Evaluate Without an API Key (Load Demo Data)**:
   - Click **Load Demo Data** in the header to seed 10 realistic 2FA test cases across all execution states.
3. **Execute & Draft Defect Reports (Coverage Tracker)**:
   - In **QA Tester** mode, switch to **Coverage Tracker**, toggle **Pass / Fail / Block**, expand a failed card (e.g., `TC-104`), update execution notes, and click **Copy Bug Report** to copy a Markdown defect report.
4. **Release Sign-Off & RTM Export (QA Lead)**:
   - Switch the header **Role Switcher** to **QA Lead** to unlock **Approve Release**, **Clear All Passed Tests**, **Clear Suite**, test case deletion, and **Export Full RTM & Coverage CSV**.
   - Mark `TC-104`, `TC-108`, and `TC-109` as **Pass** to watch the pass rate cross the `85%` threshold (`90%` with `0` High-priority failures) and flip the release gate to **GO — Ready for Release**.
