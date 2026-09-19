# START — Personal Anti-Procrastination Operating System

START is **not** a generic productivity app, to-do list, habit tracker, calendar, Pomodoro timer, motivational dashboard, or gamified task manager.

START is a **personal anti-procrastination operating system** specifically engineered to interrupt the psychological avoidance cycle:

```
Distant deadline → Permission to postpone → Discomfort (vague, hard, overwhelming) → Escape into distraction (phone, social media, random tasks) → Lost day → Urgent deadline → Panic work → Regret → Repeat.
```

---

## Core Product Principles

1. **Start Before Motivation**: Motivation follows physical motion. Every session reduces starting friction to a single 10-second physical action.
2. **Tasks Must Become Concrete Actions**: Ambiguous tasks like *"Study Computer Vision"* are strictly rejected. Valid items specify:
   - **Task**
   - **Desired Output** (artifact to produce)
   - **First Physical Action** (e.g., *"Open Tutorial 3 and solve Question 1"*)
   - **Estimated Duration**
3. **Distant Deadlines Are Not Start Signals**: Large assignments are deconstructed into earlier milestones with deadline buffer calculations to prevent last-minute cramming.
4. **The Next Slot Must Always Be Easy to Start**: Before closing a focus slot, define what was completed and the exact first action of the next slot.
5. **Phone Distraction Is an Environment Problem**: Physical separation of the phone (*"Outside reach"*) is enforced before any work session begins.
6. **Zero-Guilt Recovery**: Missed time slots never trigger guilt. The system immediately offers a 10-minute micro-recovery session.
7. **Track Behavior, Not Just Hours**: Tracks delay triggers, start friction, phone compliance, and recovery velocity rather than an artificial "productivity score."
8. **Pattern Recognition Over Diagnoses**: Identifies recurring friction with concrete evidence and suggested behavioral experiments.
9. **No Toxic Gamification**: No artificial XP, coins, badges, cartoon avatars, or fake urgency.
10. **The User Does Not Need to Remember the Method**: START walks you through the behavioral protocol step-by-step.

---

## Daily Operating Loop (5 Phases)

- **Phase 1 — Plan**: Select Today's Top 1 (anchor priority), Top 2 & 3, and schedule discrete work windows.
- **Phase 2 — Prepare the Next Slot**: 8 pre-flight questions (clarify desired output, exact first action, anticipated obstacle, if-then plan, phone check).
- **Phase 3 — Work & Distraction Capture**: Distraction-free timer with live impulse capture (*"Captured. Return to the task."*) and emergency recovery options.
- **Phase 4 — Close the Slot**: Document output produced and define the next slot's first action immediately.
- **Phase 5 — Night Review & Plan Tomorrow**: 12-step guided evening reflection and lock in tomorrow's Top 1 with first physical actions before sleeping.

---

## Technical Architecture

Built with a modular, production-oriented feature-first structure:

```
src/
├── app/
│   ├── App.tsx                     # Master routing & provider setup
│   └── index.css                   # Tailwind CSS v4 design tokens
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx           # Global header with sound & theme toggles
│   │   ├── AppSidebar.tsx          # Desktop navigation sidebar
│   │   ├── MobileNav.tsx           # Mobile bottom navigation bar
│   │   ├── PageContainer.tsx       # Reusable layout wrapper
│   │   ├── ThemeContext.tsx        # Dark / Light / System theme engine
│   │   └── ErrorBoundary.tsx       # Graceful UI crash protection
│   └── ui/
│       ├── Button.tsx              # Accessible button with 6 variants & sizes
│       ├── Input.tsx               # Accessible Input and Textarea
│       ├── Card.tsx                # Card, CardHeader, CardTitle, CardContent, CardFooter
│       ├── Badge.tsx               # Status & context badges
│       ├── Progress.tsx            # Accessible progress bar
│       ├── Dialog.tsx              # Focus-trapped accessible modal
│       ├── Tooltip.tsx             # Accessible hover/focus tooltip
│       ├── EmptyState.tsx          # Respectful empty states (no fake metrics)
│       ├── LoadingState.tsx        # Minimal spinner and skeleton components
│       └── ConfirmDialog.tsx       # Danger confirmation dialog
├── features/
│   ├── dashboard/TodayPage.tsx     # Route: /today ("What should I do now?")
│   ├── planner/PlannerPage.tsx     # Route: /planner (Top 1-2-3 & work slots)
│   ├── assignments/AssignmentsPage.tsx # Route: /assignments (Milestones & buffers)
│   ├── reviews/ReviewPage.tsx      # Route: /review (Phase 5 night review)
│   ├── analytics/AnalyticsPage.tsx # Route: /analytics (Behavioral patterns & delay triggers)
│   ├── rules/RulesPage.tsx         # Route: /rules (10 core anti-procrastination laws)
│   └── settings/SettingsPage.tsx   # Route: /settings (Theme, audio, Supabase sync)
├── hooks/
│   ├── useSlots.ts                 # TanStack Query work slots hook
│   └── useAssignments.ts           # TanStack Query assignments hook
├── lib/
│   ├── constants.ts                # The 10 rules and default configurations
│   ├── storage.ts                  # Reactive local storage engine
│   └── supabase.ts                 # Supabase PostgreSQL client integration
├── services/
│   └── dataService.ts              # Unified repository interface (Local + Cloud sync)
├── types/
│   └── models.ts                   # Strongly typed TypeScript domain models
└── utils/
    ├── cn.ts                       # Tailwind classnames merger
    ├── dates.ts                    # date-fns utilities & deadline buffer math
    └── sound.ts                    # Web Audio API ambient tone synthesizer
```

---

## Database Architecture (`supabase/schema.sql`)

The repository includes a normalized PostgreSQL schema with Row Level Security (RLS) policies:
- `profiles`: user preferences & work windows
- `assignments`: title, deadline, importance, estimated effort, buffer days
- `milestones`: sequential stages (Research → Outline → Draft → Figures → Revision → Review → Submission)
- `tasks`: concrete tasks requiring desired output and first physical action
- `work_slots`: daily scheduled time blocks
- `work_sessions`: execution resistance, energy level, and phone compliance
- `distractions`: captured impulse urges during work
- `daily_reviews`: 12-question night review logs
- `observed_patterns`: evidence-backed behavioral patterns and experiments

---

## Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build and TypeScript check
npm run build
```
