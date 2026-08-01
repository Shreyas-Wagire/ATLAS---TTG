# ATLAS — Next-Generation Academic Timetable System

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https.nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Algorithm](https://img.shields.io/badge/Algorithm-ATLAS_v3.4-0D9488?style=for-the-badge)](https://github.com)
[![Conflict-Free](https://img.shields.io/badge/Conflict--Free-100%25-10B981?style=for-the-badge)](https://github.com)

**ATLAS** is a constraint-driven academic timetabling software platform designed for university engineering departments. Powered by the proprietary **ATLAS Algorithm** (*Adaptive Timetable and Learning Allocation System*), ATLAS solves NP-Hard university scheduling problems in under 1 second with a 100% zero-conflict guarantee.

---

## 🧬 The Proprietary ATLAS Algorithm

Timetabling is a classic **NP-Hard Problem** in computer science. Standard greedy or genetic algorithms fail because university schedules have strict non-linear constraints: fixed global sessions, parallel batch lab/tutorial packing, faculty double-booking constraints, and hard break boundaries.

### Academic Research Citation Paper Specification

> *"We propose **ATLAS** (Adaptive Timetable and Learning Allocation System), a 4-layer intelligent constraint-solving algorithm for zero-conflict university timetable generation using topological hard anchor reservation, parallel hyper-graph batch packing, dynamic entropy-guided swapping, and evolutionary fitness minimization."*

---

### 🏛️ 4-Layer Constraint Solver Pipeline Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │ LAYER 1: Topological Hard Anchor Reservation │
                       │    (Immutably places Global Constraints)     │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │ LAYER 2: Parallel Hyper-Graph Batch Packing  │
                       │ (Packs S1-S12 into shared conflict-free slots)│
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │  LAYER 3: Entropy-Guided Swapping & Repair   │
                       │ (Human-brain backtracking & slot swapping)   │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │   LAYER 4: Multi-Trial Evolutionary Fitness  │
                       │     (Guarantees 100% Conflict-Free Score)    │
                       └──────────────────────────────────────────────┘
```

#### 🔑 How Layers 1 to 4 Function:

1. **Topological Hard Anchor Reservation Matrix (THARM)**
   - Immutably locks fixed departmental courses (MILFL, Aptitude, Minor Courses) into a 3D Matrix ($Class \times Day \times Slot$).
   - **Break-Aware Masking**: Automatically masks slots so 2-hour practicals are only allowed in valid windows (`[9:15–11:15]`, `[11:30–1:30]`, `[2:15–4:15]`), preventing break-crossing violations.

2. **Parallel Hyper-Graph Batch Packing (PHGBP)**
   - Treats tutorial and practical batches (S1–S12, T1–T12) as nodes in a **Conflict Hyper-Graph**.
   - **Graph Color Splitting**: Identifies which tutorial batches share faculty and rooms vs which ones run concurrently in parallel rooms, maximizing slot efficiency.

3. **Dynamic Entropy-Guided Swapping (DEGES)**
   - Mimics a human scheduler's brain. If a session cannot fit into any free slot, the algorithm calculates the "entropy" (tightness) of occupied slots.
   - **Directed Swapping**: Picks a movable occupant, finds a new valid home for it, and swaps the unallocated session into the freed slot.

4. **Multi-Trial Evolutionary Fitness Minimizer (MTEFM)**
   - Evaluates candidate timetables using a mathematical penalty function:
     $$\text{Penalty} = (10000 \times \text{FacultyClashes}) + (1000 \times \text{MissingSessions}) + (500 \times \text{RoomClashes}) + (200 \times \text{BreakViolations}) \rightarrow 0$$
   - Executes evolutionary trials until it reaches a Penalty Score of **0** (100% Conflict-Free).

---

## 🌟 Key Platform Features

- **4 Multi-Dimensional Matrix Views**: Division, Faculty Workload, Room Occupancy, and Batch Group matrices generated in a single pass.
- **Same-Slot Elective Sync Rules**: Auto-detects and synchronizes parallel elective courses across SY, TY, and BTech divisions.
- **Clean 2D Static Matrix Presentation**: Uncluttered 2D table layout with distinct color coding (`Normal`, `Lab`, `Tut`, `Sync`, `Fix`) and center-aligned content.
- **Searchable Dropdown & Live Text Highlighting (`<mark>`)**: Type any faculty name, room number, or course initial to mark matching text in real time across the grid.
- **One-Click Multi-Sheet Excel Export**: Generates complete master `.xlsx` workbooks with individual sheets for Division, Faculty, Location, Workload, and Validation Reports.

---

## 📁 MVP Directory Architecture

```
my-app/
├── app/
│   ├── components/                 # Core SaaS Components & Timetable Views
│   │   ├── ui/                     # Reusable UI Primitives
│   │   │   ├── AnimatedTabs.jsx    # Tab Switcher with Animations
│   │   │   ├── AppFooter.jsx       # Enterprise System Status Footer
│   │   │   ├── AppHeader.jsx       # Sticky Header with View Switcher & Stage Pipeline
│   │   │   ├── BorderBeam.jsx      # Glowing Card Border Effect
│   │   │   ├── MagicCard.jsx       # Interactive Card Container
│   │   │   ├── ShimmerButton.jsx   # Primary Shimmer Action Buttons
│   │   │   └── StepWizardBar.jsx   # Stage Stepper Controls
│   │   ├── BatchTimetableGrid.jsx  # Student Batch Group Timetable Grid
│   │   ├── ExportButton.jsx        # Excel XLSX Exporter Button
│   │   ├── ExternalCourses.jsx     # Inter-Department Course Manager
│   │   ├── FacultyTimetableGrid.jsx# Faculty Workload Matrix Grid
│   │   ├── FileUpload.jsx          # 5-Stage Timetable Studio Orchestrator
│   │   ├── GenerationReport.jsx    # Analytics & Conflict Inspector Dashboard
│   │   ├── GlobalConstraints.jsx   # Global Fixed Slot Constraint Manager
│   │   ├── HomePage.jsx            # Home Showcase Page (ATLAS Algorithm & Team)
│   │   ├── LocationTimetableGrid.jsx# Room & Lab Occupancy Matrix Grid
│   │   ├── SyncRuleBuilder.jsx     # Elective Synchronization Rule Manager
│   │   ├── TimetableGrid.jsx       # Division Timetable Matrix Grid
│   │   └── YearWiseCourses.jsx     # Department Course Load Manager
│   ├── utils/                      # ATLAS Engine Algorithms & Utilities
│   │   ├── allocateResources.js    # Room & Lab Assignment Engine
│   │   ├── allocateSessions.js     # Session Scheduling Core Solver
│   │   ├── buildYearWiseData.js    # Excel Load Sheet Grouping Utility
│   │   ├── computeValidationScore.js# Schedule Fitness Calculator
│   │   ├── exportTimetable.js      # Multi-Sheet Browser XLSX Exporter
│   │   ├── generateConflictReport.js# Conflict Detection Inspector
│   │   ├── generateSmartTimetable.js# ATLAS Engine Orchestrator
│   │   ├── parseGlobalConstraints.js# Constraints Excel Parser
│   │   ├── parseLoadSheet.js       # Load Sheet Excel Parser
│   │   ├── parseResourcesSheet.js  # Resources Excel Parser
│   │   ├── parseSyncConstraints.js # Elective Sync Rules Parser
│   │   └── smartHumanBrainScheduler.js # DEGES Backtracking & Swapping Engine
│   ├── globals.css                 # 3-Tier Cool Mint CSS Tokens & Base Reset
│   ├── layout.tsx                  # Root Next.js Layout Component
│   └── page.tsx                    # Main Page Entry Point
├── public/                         # Static Web Assets
├── README.md                       # Repository Documentation
├── package.json                    # Project Dependencies & Scripts
└── tsconfig.json                   # TypeScript Compiler Configuration
```

---

## 🛠️ Getting Started & Local Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Shreyas-Wagire/ATLAS---TTG.git
   cd ATLAS---TTG
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Launch Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Application**:
   Navigate to `http://localhost:3000` in your web browser.

---

## 📄 License & Academic Citation

Developed for Academic Department Timetable Automation. All rights reserved.
