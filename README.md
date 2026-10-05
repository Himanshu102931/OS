# PlacementOS — Personal Placement Control System

PlacementOS is a deterministic, local-first placement preparation dashboard and adaptive engine designed for systematic computer science placement preparation (Horizon: September 1, 2026 – May 31, 2027).

Unlike generic educational tools or consumer platforms, PlacementOS operates as a studio-grade developer workspace built for disciplined, deliberate practice.

---

## 🚀 Key Architectural Pillars

- **Local-First & Offline-Capable**: 100% client-side React + TypeScript application with zero external cloud API dependencies. All progress, evidence logs, attempt histories, and target overlays are safely stored in browser `localStorage`.
- **Deterministic Adaptive Recommendation Engine**: Uses an explicit 6-factor weight formula ($1.00$ total) to calculate daily study priorities without random selection or runtime LLM dependencies:
  $$\text{Score} = 0.25(\text{Urgency}) + 0.20(\text{Weakness}) + 0.20(\text{Importance}) + 0.15(\text{Company}) + 0.10(\text{Spaced Repetition}) + 0.10(\text{Recovery})$$
- **Leitner 4-Box Spaced Repetition**: Automated DSA review intervals operating on append-only attempt logs:
  - **Box 1**: 1-day interval
  - **Box 2**: 3-day interval
  - **Box 3**: 7-day interval
  - **Box 4**: 14-day interval (Mastered)
- **4-Phase Authoritative Roadmap**:
  - **Phase 1** (Sep 1 – Nov 30, 2026): Core Foundations & Early Skills (DSA, Python, SQL, DBMS, OS, CN, OOP, Aptitude, Communication, Projects, Mock Interviews)
  - **Phase 2** (Dec 1, 2026 – Jan 31, 2027): Advanced Topics & Core CS Deep-Dive (DSA, Python, SQL, OS, CN, OOP)
  - **Phase 3** (Feb 1 – Mar 31, 2027): Intensive Mock Drills & Timed Assessments
  - **Phase 4** (Apr 1 – May 31, 2027): Placement Sprint & Final Drive Sweep
- **11-Domain Skill Matrix**: Real-time strength calculation (0–100) and freshness tracking (`Fresh`, `Aging`, `Untested`) across DSA, SQL, Python, DBMS, OS, CN, OOP, Projects, Communication, Aptitude, and Mock Interviews.
- **Skill Freshness Explanation**: Plain-language explanation of why a skill has its current freshness state (`fresh`, `aging`, `stale`, or `untested`), based on deterministic analysis of last practice/assessment evidence. Uses existing canonical evidence data — no new freshness calculation. Explains: "Fresh because recent evidence demonstrates the skill," "Aging because evidence is becoming old," "Stale because no sufficiently recent evidence exists," "Untested because no demonstrated evidence found."
- **Company Target Overlays**: Priority boosting for active hiring drives (e.g., Amazon, TCS Digital).
- **Daily Execution & Sealing Protocol**: Structured workflow featuring Morning Planning, Task Execution, Evidence Logging, Evening Reflection, and Day Sealing immutability.
- **Daily Plan & Adaptive Session Convergence**: Unified "What should I do today?" execution loop directly connecting Morning Planning (`todayAssignments`) with the Adaptive Session Composer (`SessionDisplay`). Committed daily assignments seamlessly guide adaptive session composition (flagged with a `Plan Aligned` session indicator and `Daily Plan` activity badges), while completing mapped session activities deterministically synchronizes assignment completion back to the daily plan with strict day-sealing immutability, duplicate-candidate filtering, and zero duplicate evidence.
- **Direct Leitner DSA Reviews in Morning Planning**: Morning Planning allows users to intentionally select and commit due Leitner DSA review and eligible new algorithmic problems directly into the Daily Plan. Committed DSA assignments converge deterministically into Adaptive Sessions without duplicate scheduling against the review engine. Completing a committed DSA problem through canonical attempt logging synchronously records evidence, advances Leitner box intervals and review dates, and marks the corresponding daily assignment as completed under strict day-sealing protection.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript 6.0
- **Build Tool**: Vite 8
- **Styling**: TailwindCSS 4 (Dark mode studio design system: `surface-canvas` `#0D0F12`, warm bronze accent `#E5A93C`)
- **Icons**: Lucide React
- **Testing**: Vitest (476 automated scenario & engine tests across 27 test files)
- **Routing**: Client-side hash routing (`#/${route}`)
- **Persistence**: `StorageAdapter` with JSON backup export/import

---

## 📖 Project Documentation

- 🎨 **Design System Reference**: Detailed color tokens, typography scale (Inter + JetBrains Mono), elevation planes, and component specifications are documented in [`docs/design/DESIGN.md`](docs/design/DESIGN.md).
- 🎯 **System Customizations**: Application rules and agent guidance are organized under [`.agents/rules/`](.agents/rules/).

---

## 💻 Local Development

### 1. Installation
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Quality Suite
```bash
npm test        # Execute Vitest scenario tests
npm run lint    # Run ESLint check
```

### 4. Build for Production
```bash
npm run build   # Generate static dist bundle
```

---

## 🌐 Production Deployment

PlacementOS builds as a pure static web application. It can be deployed to static web hosts (Vercel, Netlify, GitHub Pages) without server URL rewrite configuration due to its hash-based routing.

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Storage Note**: *Hosting the frontend makes the application accessible from multiple devices, but LocalStorage remains device/browser-specific.* Use the built-in **Export / Import JSON Backup** in Settings to transfer state between browsers or devices.

---

## 📜 License

Private personal placement preparation system.
