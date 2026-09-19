# START — Personal Anti-Procrastination Operating System

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-black?logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15+-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **START** is not a to-do list, calendar, habit tracker, Pomodoro timer, motivational article, or gamified productivity app.  
> It is an **Anti-Procrastination Operating System** specifically engineered to interrupt the psychological avoidance loop before starting resistance turns into avoidance, lost days, and guilt.

---

## Table of Contents

- [The Core Philosophy](#the-core-philosophy)
  - [The Avoidance Trap vs. The START Interrupt](#the-avoidance-trap-vs-the-start-interrupt)
  - [The 10 Core Operating Laws](#the-10-core-operating-laws)
- [Monorepo Architecture](#monorepo-architecture)
  - [Directory Structure](#directory-structure)
  - [Workspaces & Proxy Configuration](#workspaces--proxy-configuration)
- [Key Features & Subsystems](#key-features--subsystems)
- [Database Schema (Supabase PostgreSQL)](#database-schema-supabase-postgresql)
- [Complete Setup Guide](#complete-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Install Monorepo Dependencies](#step-2-install-monorepo-dependencies)
  - [Step 3: Set Up the Supabase Database](#step-3-set-up-the-supabase-database)
  - [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
  - [Step 5: Start the Development Environment](#step-5-start-the-development-environment)
- [Backend API Reference](#backend-api-reference)
- [Available NPM Scripts](#available-npm-scripts)
- [Security & Key Isolation](#security--key-isolation)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Production Deployment](#production-deployment)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [License](#license)

---

## The Core Philosophy

Traditional productivity software assumes motivation already exists and simply asks you to catalog your ambitions. Behavioral psychology reveals the exact opposite: **action precedes motivation**.

When a task feels distant, abstract, or overwhelming, the brain naturally interprets it as emotional discomfort and seeks immediate relief through distraction (social media, cleaning, checking emails, easy pseudo-work).

### The Avoidance Trap vs. The START Interrupt

```text
THE TRADITIONAL AVOIDANCE TRAP:
Distant deadline → "Plenty of time" → Discomfort (vague / hard) 
  → Escape into distraction (phone, social media, easy tasks) 
  → Lost day → Urgent deadline → Panic work → Guilt & Burnout → Repeat.

THE START BEHAVIORAL INTERRUPT:
Clarify concrete artifact → Isolate 15-second starter action → Move phone away 
  → Begin with zero friction → Catch impulses without following them 
  → Close session with next action already queued → Zero guilt on missed slots.
```

### The 10 Core Operating Laws

1. **Start Before Motivation** — Action generates motivation, never the reverse. You do not wait to "feel like it."
2. **Define a Concrete Output** — Never schedule abstract topics (*"Study Biology"* is rejected; *"Write 1-page summary on cell mitosis"* is accepted).
3. **Define the First Physical Action** — Reduce start friction to a physical motion executable in 15 seconds (*"Open Chapter 3 PDF on desktop"*).
4. **Define the Next Slot Before Leaving** — Friction between work sessions is eliminated by queuing tomorrow's starting trigger today.
5. **Keep the Phone Physically Out of Reach** — Distraction is an environmental design problem, not a willpower test.
6. **Capture Distractions Instead of Following Them** — Record intrusive thoughts into a dedicated urge collector and immediately return to work.
7. **Zero-Guilt 10-Minute Recovery** — A missed time slot never shows a red failure state; it immediately triggers a gentle 10-minute micro-recovery window.
8. **Measure Outputs & Behavior, Not Just Hours** — Track start delays, phone compliance, and finished artifacts instead of vanity metrics.
9. **Separate Drafting From Polishing** — Lower perfectionist dread by explicitly permitting ugly, unedited first passes.
10. **Plan Tomorrow at Night** — Protect morning cognitive energy by locking in Tomorrow's Top 1 before going to sleep.

---

## Monorepo Architecture

START is structured as an **npm workspaces monorepo** with strict physical separation between the frontend Single Page Application (SPA) and the Express backend service:

### Directory Structure

```text
START/
├── client/                     # Frontend SPA (React 19 + Vite 8 + Tailwind CSS v4)
│   ├── public/                 # Favicons, web manifest, PWA icons
│   ├── src/
│   │   ├── app/                # Root App component, routing, AuthGuard
│   │   ├── components/         # Design system (layout, UI primitives, theme context)
│   │   ├── contexts/           # AuthContext & Session management
│   │   ├── features/
│   │   │   ├── ai/             # Pragmatic AI Coach workflows & Overwhelm triage (Gemini)
│   │   │   ├── analytics/      # Weekly/Monthly behavioral pattern engine
│   │   │   ├── assignments/    # Milestone decomposition & deadline buffer math
│   │   │   ├── auth/           # Login / Register interface (dark-mode)
│   │   │   ├── dashboard/      # Today Page ("What should I do now?")
│   │   │   ├── onboarding/     # Baseline behavioral profiling wizard
│   │   │   ├── planner/        # Work slot scheduler & pre-flight checklist
│   │   │   ├── reviews/        # Phase 5 Guided Evening Review Protocol
│   │   │   ├── rules/          # Personal Operating Manual & Contextual Reminders
│   │   │   ├── sessions/       # Wall-clock focus timer & urge capture modal
│   │   │   └── settings/       # Theme, sound, timezone, notification toggles
│   │   ├── hooks/              # Query & PWA hooks (useSlots, useAssignments)
│   │   ├── lib/                # Storage cache, constants, Supabase browser client
│   │   ├── services/           # DataService (bidirectional mappers), notifications
│   │   ├── types/              # Strongly typed TypeScript domain models
│   │   └── utils/              # Timezone math, audio synth, classnames
│   ├── index.html              # HTML entry point
│   ├── package.json            # Client dependencies & scripts
│   ├── vite.config.ts          # Vite proxy (/api -> http://localhost:3001)
│   ├── tsconfig.json           # Client TypeScript configuration
│   ├── .env                    # Local client environment (VITE_* only)
│   └── .env.example
├── server/                     # Backend Service (Node.js + Express 5 + Supabase Admin)
│   ├── index.ts                # Express server (/api/health, /api/auth/signup, /api/stats)
│   ├── package.json            # Server dependencies & scripts
│   ├── tsconfig.json           # Server TypeScript configuration
│   ├── .env                    # Local server environment (SUPABASE_SERVICE_ROLE_KEY)
│   └── .env.example
├── supabase/
│   └── schema.sql              # Normalized PostgreSQL schema with RLS policies
├── docs/                       # Specifications and architectural documentation
├── package.json                # Root monorepo workspace orchestrator
├── .gitignore                  # Gitignore protecting all .env files and build outputs
└── README.md                   # System documentation & setup guide
```

### Workspaces & Proxy Configuration

- The root `package.json` defines `"workspaces": ["client", "server"]`.
- Running `npm run dev` from the root starts both services concurrently.
- `client/vite.config.ts` proxies all `/api` requests to `http://localhost:3001`:
  ```typescript
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  }
  ```
  This guarantees that the client never encounters Cross-Origin Resource Sharing (CORS) friction in development.

---

## Key Features & Subsystems

### 1. Today Dashboard ("What should I do now?")
- Focuses the user on a single primary question: *"What is the single next thing I need to execute?"*
- Prominently displays **Today's Top 1 Priority**, the **Next Immediate Action**, and a primary **START** trigger.
- Includes a live capacity meter preventing over-scheduling deep work beyond human cognitive limits (max 6 hours/day).

### 2. Assignment Deconstruction & Deadline Buffer Analysis
- Breaks large projects into concrete, sequential milestones.
- Requires every milestone to have visible evidence of completion (*"What counts as physical proof this step is done?"*).
- Automatically calculates safety buffers between estimated deep work hours and remaining calendar days, raising alerts *before* deadlines turn into emergencies.

### 3. Wall-Clock Focus Session & Timer
- Resilient timer calculated against wall-clock timestamps (`performance.now()` & `Date.now()`). It stays accurate even if the browser tab sleeps, the laptop lid closes, or the device hibernates.
- Enforces an environmental pre-flight check confirming the smartphone is physically out of reach.

### 4. Distraction Urge Capture Collector
- During an active focus session, sudden impulses (*"Check email"*, *"Look up flight prices"*, *"Buy coffee"*) can be dumped in under 3 seconds using the floating urge collector.
- Acknowledges the thought without acting on it, calming cognitive tension and returning attention immediately to the task.

### 5. Zero-Guilt 10-Minute Recovery Mode
- If a scheduled work slot is missed, START never displays shame-inducing red failure banners.
- Instead, it immediately invites the user to run a low-resistance **10-minute micro-recovery sprint** to overcome inertia and rebuild forward momentum.

### 6. Pragmatic AI Coach (Google Gemini Integration)
- **Not a generic conversational chatbot**. A specialized behavioral reasoning engine designed for friction reduction:
  - **Milestone Decomposition**: Automatically fragments large projects into verifiable steps.
  - **15-Second Starter Generator**: Formulates immediate physical starter motions.
  - **Obstacle & If-Then Planning**: Creates behavioral implementation intentions (*"If [distraction occurs], then I will [action]"*).
  - **Overwhelm Rescue Mode**: Rapid 3-step triage protocol when paralyzed by panic or anxiety.

### 7. Phase 5 Guided Evening Review Protocol
- Guided 12-step reflection to review actual outputs, capture delay triggers, log what helped initiate work, and select Tomorrow's Top 1 action before shutting down screens for the night.

---

## Database Schema (Supabase PostgreSQL)

The backend database runs on Supabase PostgreSQL with 10 normalized tables. All tables enforce **Row-Level Security (RLS)** with user ownership policies (`auth.uid() = user_id`):

| Table Name | Primary Role | Key Columns |
| :--- | :--- | :--- |
| `profiles` | User preferences & workday limits | `id`, `display_name`, `theme`, `work_day_start`, `work_day_end`, `is_onboarding_completed` |
| `onboarding_profiles` | Baseline psychological & behavioral profile | `id`, `name`, `primary_role`, `delay_triggers`, `common_distractions`, `first_commitment` |
| `assignments` | High-level projects & exam targets | `id`, `user_id`, `title`, `deadline`, `estimated_total_hours`, `importance`, `status` |
| `milestones` | Verifiable project deconstructions | `id`, `assignment_id`, `title`, `intended_output`, `sequence`, `estimated_hours`, `status` |
| `tasks` | Concrete physical tasks | `id`, `user_id`, `assignment_id`, `milestone_id`, `title`, `desired_output`, `first_physical_action` |
| `work_slots` | Planned calendar focus slots | `id`, `user_id`, `date`, `start_time`, `end_time`, `desired_output`, `first_physical_action`, `status` |
| `work_sessions` | Actual execution metrics & telemetry | `id`, `user_id`, `work_slot_id`, `actual_duration_minutes`, `resistance_level`, `phone_outside_reach` |
| `distractions` | Impulse / urge capture collector logs | `id`, `user_id`, `session_id`, `urge_text`, `returned_to_work`, `timestamp` |
| `daily_reviews` | Evening reviews & Tomorrow planning | `id`, `user_id`, `date`, `accomplished_summary`, `what_helped_start`, `tomorrow_top1` |
| `observed_patterns` | Behavioral engine pattern insights | `id`, `user_id`, `title`, `evidence`, `interpretation`, `suggested_experiment`, `category` |

---

## Complete Setup Guide

### Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: `v18.0.0` or higher (`v20.x` or `v22.x` LTS recommended). Check with:
  ```bash
  node -v
  ```
- **npm**: `v9.0.0` or higher (`v10.x` recommended). Check with:
  ```bash
  npm -v
  ```
- **Supabase Account**: Free tier at [supabase.com](https://supabase.com).
- **Google Gemini API Key** *(Optional)*: Free at [aistudio.google.com](https://aistudio.google.com).

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Kartik740/START.git
cd START
```

---

### Step 2: Install Monorepo Dependencies

Run `npm install` from the **root directory**. This uses npm workspaces to install dependencies for both `client` and `server`:

```bash
npm install
```

---

### Step 3: Set Up the Supabase Database

1. Log in to your [Supabase Dashboard](https://app.supabase.com/) and create a new project.
2. In the left navigation menu, click on the **SQL Editor** icon.
3. Click **New Query**.
4. Open the [`supabase/schema.sql`](supabase/schema.sql) file from this repository.
5. Copy its entire content, paste it into the Supabase SQL editor, and click **Run**.
6. Verify that all 10 tables appear in your **Table Editor** (`profiles`, `onboarding_profiles`, `assignments`, `milestones`, `tasks`, `work_slots`, `work_sessions`, `distractions`, `daily_reviews`, `observed_patterns`).

> [!TIP]
> Row Level Security (RLS) is automatically enabled for all 10 tables by `schema.sql`. Each user's data is isolated so that users can only read and modify their own records.

---

### Step 4: Configure Environment Variables

The project separates configuration between client and server. Two `.env` files are required:

#### 1. Backend Environment (`server/.env`)

Copy the example file:
```bash
cp server/.env.example server/.env
```
*(On Windows PowerShell: `Copy-Item server/.env.example server/.env`)*

Edit `server/.env` with your values:
```env
# Server port
PORT=3001

# Supabase Project URL (Dashboard -> Project Settings -> API)
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Service Role Key (Dashboard -> Project Settings -> API -> service_role secret)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

> [!IMPORTANT]
> The `SUPABASE_SERVICE_ROLE_KEY` is a private admin key. It is used exclusively by the Express backend to pre-verify user accounts and run system health checks. It is **never** sent to the client or exposed to the browser.

#### 2. Frontend Environment (`client/.env`)

Copy the example file:
```bash
cp client/.env.example client/.env
```
*(On Windows PowerShell: `Copy-Item client/.env.example client/.env`)*

Edit `client/.env` with your public values:
```env
# Supabase Project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Key (Dashboard -> Project Settings -> API -> anon public)
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Optional: Google Gemini API key for the AI Coach (https://aistudio.google.com/)
VITE_GEMINI_API_KEY=AIzaSy...
```

#### Environment Variables Reference

| Variable | Location | Public / Secret | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `server/.env` | Secret (Server) | Port for Express API (default: `3001`) |
| `SUPABASE_URL` | `server/.env` | Secret (Server) | Supabase project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `server/.env` | **Strictly Secret** | Admin key with full database bypass rights |
| `VITE_SUPABASE_URL` | `client/.env` | Public (Client) | Supabase project URL bundled into Vite SPA |
| `VITE_SUPABASE_ANON_KEY` | `client/.env` | Public (Client) | Safe browser key respecting PostgreSQL RLS |
| `VITE_GEMINI_API_KEY` | `client/.env` | Public (Client) | Gemini API key for anti-procrastination coaching |

---

### Step 5: Start the Development Environment

Launch both client and server concurrently from the repository root:

```bash
npm run dev
```

You should see output similar to:

```text
[CLIENT]   VITE v8.3.0  ready in 180 ms
[CLIENT]   ➜  Local:   http://localhost:5173/
[SERVER]   [START Server] Running on http://localhost:3001
[SERVER]   [START Server] Supabase URL: https://your-project-id.supabase.co
```

1. Open your browser and navigate to **`http://localhost:5173`**.
2. Create an account by clicking **Sign Up**.
3. Complete the quick onboarding flow to establish your baseline behavioral profile.
4. Verify your backend connection at **`http://localhost:3001/api/health`**.

---

## Backend API Reference

The Express server (`server/index.ts`) exposes the following endpoints:

### `GET /api/health`
Verifies database connectivity and tests table access across all 10 schema tables.

**Response:**
```json
{
  "status": "ok",
  "service": "START Backend API",
  "timestamp": "2026-09-19T21:55:00.000Z",
  "supabaseConnected": true,
  "tables": {
    "profiles": { "ok": true, "count": 1 },
    "onboarding_profiles": { "ok": true, "count": 1 },
    "assignments": { "ok": true, "count": 2 },
    "milestones": { "ok": true, "count": 5 },
    "tasks": { "ok": true, "count": 4 },
    "work_slots": { "ok": true, "count": 3 },
    "work_sessions": { "ok": true, "count": 2 },
    "distractions": { "ok": true, "count": 0 },
    "daily_reviews": { "ok": true, "count": 1 },
    "observed_patterns": { "ok": true, "count": 0 }
  }
}
```

### `POST /api/auth/signup`
Creates a pre-confirmed user in Supabase Auth via the Admin API. This circumvents the free-tier Supabase SMTP rate limit (which returns `429: Email rate limit reached`).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "displayName": "Alex"
}
```

**Response (201 Created):**
```json
{
  "status": "created",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "displayName": "Alex"
  }
}
```

### `GET /api/stats`
Returns system-wide aggregated counts (requires active service role credentials).

**Response:**
```json
{
  "userCount": 2,
  "totalSlots": 14,
  "totalAssignments": 6,
  "totalSessions": 11
}
```

### `GET /api/user/backup/:userId`
Exports all database records for a given user as a single, portable JSON document.

---

## Available NPM Scripts

All commands can be run directly from the repository root:

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `concurrently ...` | Starts both client (`:5173`) and server (`:3001`) with color-coded logs |
| `npm run dev:client` | `npm run dev --workspace=client` | Starts only the Vite frontend dev server |
| `npm run dev:server` | `npm run dev --workspace=server` | Starts only the Express backend dev server |
| `npm run build` | `npm run build --workspace=client` | Typechecks with `tsc` and compiles production bundle to `client/dist/` |
| `npm test` | `npm run test --workspace=client` | Runs Vitest unit tests (task validator, sessions, timezone math) |
| `npm run lint` | `npm run lint --workspace=client` | Runs Oxlint high-performance static analysis |
| `npm run preview` | `npm run preview --workspace=client` | Serves the production build bundle locally |

---

## Security & Key Isolation

START implements strict defense-in-depth boundaries to guarantee that sensitive credentials are never leaked:

1. **Service Role Key Quarantine**:
   - The `SUPABASE_SERVICE_ROLE_KEY` is placed strictly in `server/.env`.
   - It is never given the `VITE_` prefix, guaranteeing that Vite's bundler will never expose it to client code.
   - The compiled frontend bundle in `client/dist/` contains **zero** occurrences of the service role key.
2. **Row-Level Security (RLS)**:
   - Every single database table has RLS enabled with `USING (auth.uid() = user_id)`.
   - Even if an attacker were to acquire the public `VITE_SUPABASE_ANON_KEY`, they cannot read or tamper with another user's assignments, slots, or sessions.
3. **Pre-Confirmed User Registration**:
   - Free Supabase instances restrict email confirmation sending to 3-4 emails per hour.
   - The `/api/auth/signup` endpoint creates users with `email_confirm: true` server-side, eliminating SMTP rate-limit failures for new accounts.
4. **Git Protection**:
   - The root `.gitignore` explicitly prevents `.env`, `client/.env`, and `server/.env` from ever being tracked by Git.

---

## Testing & Quality Assurance

### Vitest Unit Tests
Run the test suite from the root:
```bash
npm test
```
The test suite covers:
- **`vagueTaskValidator.test.ts`**: Verifies that ambiguous task descriptions (e.g., *"study"*, *"work on paper"*) are correctly rejected with constructive prompts, while concrete actions are accepted.
- **`sessionStorage.test.ts`**: Validates active session state preservation, wall-clock duration calculation, and emergency recovery across storage cycles.
- **`timezone.test.ts`**: Ensures cross-timezone date math, ISO formatting, and midnight boundary calculations remain deterministic.

### Static Analysis
Run Oxlint across the codebase:
```bash
npm run lint
```

### Production Build Validation
Verify that TypeScript compiles cleanly and the Vite production bundle builds without errors:
```bash
npm run build
```

---

## Production Deployment

### 1. Deploy the Frontend (Vercel / Netlify / Cloudflare Pages)

1. Connect your repository to your hosting provider.
2. Set the **Root Directory** to `client`.
3. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add the frontend environment variables in your provider's dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY` *(optional)*

### 2. Deploy the Backend (Render / Railway / Fly.io / DigitalOcean)

1. Connect the repository and select the `server` directory (or use a Dockerfile).
2. Configure the start command:
   - **Start Command**: `npm start`
3. Add the server environment variables:
   - `PORT=3001` (or your platform's `$PORT`)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Configure your frontend reverse proxy or production API base URL to route `/api/*` to the deployed server.

---

## Troubleshooting & FAQ

### 1. "Email rate limit reached" (HTTP 429) during sign up
- **Cause**: Supabase's built-in email service on the free tier is strictly rate-limited.
- **Solution**: START's backend bypasses this by default. Ensure the Express server is running on port 3001. When you sign up via the UI, the client calls `/api/auth/signup`, which auto-confirms the account via the Supabase Admin API.

### 2. "SUPABASE_SERVICE_ROLE_KEY is not set" in server logs
- **Cause**: `server/.env` is missing or the key name is misspelled.
- **Solution**: Open your Supabase Dashboard $\rightarrow$ **Project Settings** $\rightarrow$ **API** $\rightarrow$ **Project API Keys** $\rightarrow$ copy the **`service_role`** key into `server/.env`.

### 3. "Cannot connect to backend" / 404 on `/api/auth/signup`
- **Cause**: The Vite development server cannot reach the Express backend.
- **Solution**:
  1. Verify the server is running by opening `http://localhost:3001/api/health`.
  2. Confirm `client/vite.config.ts` includes the `/api` proxy targeting port 3001.
  3. Start both services simultaneously using the root command: `npm run dev`.

### 4. How do I enable Google Gemini AI features?
- **Solution**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/). Add it to `client/.env` as `VITE_GEMINI_API_KEY=AIzaSy...`, then restart the client dev server.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

*START — Stop planning to plan. Start executing.*
