# ATLAS — Changelog & Release History

All notable changes to the ATLAS (Adaptive Timetable and Learning Allocation System) project are documented in this file.

---

## 📌 Versioning System Architecture (`X.Y`)

ATLAS uses a custom semantic release taxonomy tailored for academic constraint engines:

- **`X` (Major Digit — Workflow & Engine Extensions)**:
  Represents fundamental new features added across the backend solver algorithms and frontend workflow pipelines that structurally enhance how timetables are generated, verified, or repaired.
  *(e.g., v1 $\to$ v2 $\to$ v3 $\to$ v4)*

- **`Y` (Decimal Digit — UI/UX & Interaction Refinements)**:
  Represents visual design enhancements, layout polish, interactive modal improvements, dashboard aesthetics, and usability tweaks applied to the interface.
  *(e.g., .1 $\to$ .2 $\to$ .3 $\to$ .4)*

---

## [v5.5] — 2026-10-10 (Current Release)

### 🚀 Major Engine & Architecture Additions (v5.0 Core)

#### 1. Campus Infrastructure Ingestion — The 3rd Sheet Parser (`parseLocationSheet.js`)
- **Campus Multi-Sheet Ingestion**: Upgraded the input workbook parser to ingest physical college campus infrastructure from the 3rd sheet (`Location`), alongside `Load` and `FIX`.
- **Infrastructure Extraction**:
  - **Classrooms**: General theory lecture halls (e.g., C1, C2, Room 101).
  - **Tutorial Rooms**: Dedicated small-batch problem-solving rooms (e.g., TR1, TR2).
  - **Specialized Laboratories**: Full physical name (`labName`), canonical timetable identifier (`labInitial`), equipment/facilities description (`labFeatures`), and officially designated course catalogs (`mappedCourses`).
- **Robust Character Normalization**: Handles multiline strings, carriage returns, slashes, dashes (en-dash `–`, em-dash `—`, hyphen `-`), and Roman numerals (`I`, `II`, `III`) to eliminate string mismatch failures. Filters out `"NA"`, empty cells, and darkened visual placeholder cells.

#### 2. Pre-Scheduling Course-to-Lab Resolver (`courseLabResolver.js`)
- **Deterministic Course-to-Lab Mapping**: Establishes deterministic lab bindings before scheduling begins, eliminating the unconstrained "find any free lab" anomaly where non-technical or specialized practicals were assigned to unrelated rooms.
- **Scored Compatible Fallback Matrix**: Calculates domain affinity scores for alternative labs based on shared subject equipment (e.g., if Concrete Technology Lab `CTL` is busy, Structural Engineering Lab `SEL` is scored as high-compatibility fallback; CAD drawing lab is scored as incompatible).
- **Standardized Status Designations**:
  - `MAPPED`: Primary designated laboratory confirmed.
  - `FALLBACK`: Primary lab occupied; secondary compatible lab assigned with affinity score.
  - `MANUAL`: Lab selected via human supervisor override.
  - `UNRESOLVED`: Flagged without corrupt placeholders when no compatible room exists.
- **Zero Phantom Courses**: Labs mapped in `Location` for courses not present in `LOAD` are marked as diagnostics (`MAPPED_BUT_NOT_IN_LOAD`) and never scheduled into timetables.

#### 3. Lab Resource Pressure Integration in DAPS
- **Dynamic Adaptive Priority Scheduling Integration**: Practical sessions demanding scarce, highly contended laboratories receive priority scoring boosts (+100 to +150 points).
- **Resource Depletion Avoidance**: Practicals requiring labs with zero fallbacks are locked in early, preventing general sessions from depleting slots.

#### 4. Division Practical Cohort Packing vs. Rotation Electives (Pass 0)
- **Problem Solved**: Courses without individual batch instructors (like *Construction Management*, `L=0, T=0, P=2`, faculty `SVP`, batch columns blank) were previously split into 4 separate 2-hour slots for one faculty, causing division schedule saturation and artificial backlog.
- **Pass 0 Cohort Packing**: Sessions tagged with `hasBatchCols === false` are scheduled as a unified division cohort where all batches attend the designated lab together in one 2-hour window with their division faculty, saving 3 practical slots per division.
- **Strict 1-Batch-Per-Faculty Invariant**: For rotation practicals (`hasBatchCols === true`, e.g., `BTECH GE-I / GE-II`), faculty members (e.g., `SSM`) are scheduled strictly across different days (Monday, Tuesday, Friday) for batches `B5`, `B6`, `B7`, guaranteeing zero co-scheduling in the same slot.

#### 5. Practical Stacking Optimization ($4 \to 3 \to 2 \to 1$)
- **Multi-Pass Parallel Execution Hierarchy**:
  - **Pass 0**: Division practical cohorts (all batches together in designated lab).
  - **Pass 1**: Full 4-batch parallel stacks across different courses (max 1 block per division per day).
  - **Pass 2**: 3-batch parallel stacks.
  - **Pass 3**: 2-batch paired stacks.
  - **Pass 4**: 2-batch paired stacks allowing afternoon 2nd practical block.
  - **Pass 5**: Clean-up single batches.
- **Cross-Course Preference**: Priority given to stacks with higher course diversity, rotating students across distinct laboratories.

#### 6. Tutorial Room Allocation & Faculty Harmonization (`allocateResources.js`)
- **Shared Room Invariant**: Batches sharing the same tutorial session and faculty member now co-occupy the assigned tutorial room, eliminating tutorial room double-booking clashes.

#### 7. UI Transparency, Clean Badges & Diagnostic Reason Reporting
- **Elimination of Mojibake Characters**: Removed corrupted UTF-8 symbols (`LABâ€ `, `âš `) and introduced styled, responsive status badges:
  - **PRIMARY** (Emerald Green badge)
  - **FALLBACK** (Amber / Yellow badge)
  - **MANUAL** (Blue badge)
  - **UNRESOLVED** (Rose / Red badge)
- **Controlled Manual Override Modal**: Interactive modal on practical cells displaying compatibility scores, restricting choices to compatible laboratories, and validating real-time slot occupancy to prevent double bookings.
- **Slot-by-Slot Unallocated Explanations**: Detailed diagnostic reasons explaining root causes (e.g., division schedule saturation or faculty slot occupancy).

#### 8. Empirical Verification Benchmarks
- **Conflict Audit**: 0 Faculty Clashes, 0 Room Clashes, 0 Lab Clashes, 0 Tutorial Room Clashes, 0 Batch Clashes, 0 Division Clashes, 0 Break Violations, 0 Fixed Constraint Violations (**Total Clashes: 0**).
- **Unallocated Practicals**: **0** unallocated practical sessions.
- **Clean Turbopack Build**: Compiles cleanly with Next.js 16 with zero errors.

---

## [v4.5] — 2026-10-05

### 🎨 UI/UX & Frontend Architecture (.5 Polish)
- **Mathematically Centered Header Navigation**: Main View Navigation switcher (Home / Semesters) centered via screen-midpoint alignment for balanced aesthetics.
- **Modern & Minimal Home Page Redesign**: Minimal luxury design language, subtle ambient mint glow, micro-hover transitions, and interactive 3-view studio preview (Division, Faculty Load, Lab Allocation).
- **Standardized Academic Year Selector**: Added structured Academic Year chips (AY 2024-25, AY 2025-26) with quick chips and custom format options, streamlining semester creation.
- **Dynamic Metric Engine**: Resolved property discrepancies in validation metrics, allocation percentages, and quality scores with real-time recalculation.
- **Interactive Team Showcase Modal**: Added dedicated credentials modal honoring the project lead, algorithm architects, systems engineers, and academic domain advisors.

---

## [v4.4] — 2026-10-01 (Previous Core Release)

### 🚀 Major Workflow & Backend Additions (v4.0 Core)

#### 1. Multi-Course Parallel Practical Stacking Engine ($4 \to 3 \to 2 \to 1$)
- **Different Course Stacking**: Practicals from different academic courses (e.g., `COA-S2`, `CP-S3`, `DSA-S4`, `OS-S1`) are now stacked in the same 2-hour practical window (Slots `[0, 2, 4]`). Course difference is never treated as a conflict.
- **Absolute Stacking Priority**: The solver rigorously attempts combinations in descending size order:
  $$\text{4 Practicals} \longrightarrow \text{3 Practicals} \longrightarrow \text{2 Practicals} \longrightarrow \text{1 Practical}$$
  The scheduler never settles for a smaller stack if a larger valid stack is feasible.
- **Cross-Course Preference**: When multiple valid stacks have the same size, stacks containing more distinct courses are prioritized (e.g., `COA + CP + DSA + OS` is selected over `COA + COA + COA + COA`).
- **Primary Conflict Enforcement**:
  - `FACULTY_CONFLICT`: Duplicate faculty in parallel stack or faculty busy in another division.
  - `BATCH_CONFLICT`: Duplicate batch running simultaneously or batch daily practical limit reached.
  - `RESOURCE_CONFLICT`: Required lab busy or insufficient available labs in college.
  - `GLOBAL_SESSION_CONFLICT`: Slot blocked by immutable institutional session.
- **Deterministic Scarcity Tie-Breaking**: Combines DAPS faculty scarcity (remaining valid practical windows) and batch scarcity to break ties within identical stack sizes.
- **Structured Diagnostics**: Standardized `[PracticalStacking]` logging output detailing candidates, combinations checked, selected stack, courses, faculty, and failure reasons.

#### 2. College-Wide Master Scheduling Priority & `CollegeOccupancy`
- **Single Institutional State**: Replaces independent departmental scheduling with an authoritative college-wide `CollegeOccupancy` master tracker.
- **Strict 7-Stage Scheduling Pipeline**:
  1. **Priority 1**: Global College-Wide Sessions (pre-locked & 100% immutable).
  2. **Priority 2**: Practical / Batch Stacking ($4 \to 3 \to 2 \to 1$).
  3. **Priority 3**: Synchronized Sessions (cross-division simultaneous common time).
  4. **Priority 4**: Tutorials (batch-level rooms).
  5. **Priority 5**: Lectures (division-level classrooms with human-brain distribution).
  6. **Priority 6**: Course-Preserving Global Cascade Repair (CASC).
  7. **Priority 7**: Multi-Trial Evolutionary Fitness Minimization (MTEFM).

#### 3. Course-Preserving Global Faculty-Aware Cascade Repair (CASC)
- **100% Invariant Preservation**: Zero hallucinated faculty reassignments. Preserves course, assigned faculty, division, batch, and session type.
- **Multi-Hop Backtracking Swaps**: Relocates non-fixed sessions to create valid positions for stuck sessions.
- **Atomic 2-Hour Practical Moves**: Relocates practicals as complete 2-hour atomic blocks strictly on valid start slots `[0, 2, 4]` without crossing break/lunch boundaries.

#### 4. DAPS — Dynamic Adaptive Priority Scheduling
- **Multi-Factor Scarcity Ranking**: Dynamically prioritizes sessions by faculty availability windows, batch constraints, lab scarcity, tutorial room availability, and division schedule flexibility.

#### 5. RCAA — Resource Contention Avoidance Algorithm
- **Proactive Capacity Auditing**: Audits classrooms, laboratories, and tutorial rooms before and during allocation to prevent bottlenecks and produce diagnostic shortage warnings.

### 🎨 UI/UX & Frontend Refinements (.4 Polish)
- **Interactive Version Changelog Modal**: Added rich dialog with feature breakdowns, release badges, and versioning scheme notes.
- **Version Badges & Status Indicators**: Synchronized header, hero section, footer, and launch buttons to v4.4.
- **Algorithm Transparency Section**: Updated documentation and visual pipeline diagrams highlighting 7-stage college-wide flow.

---

## [v3.4] — Previous Release

### ⚙️ Core Engine Features
- **In-Memory Faculty Occupancy & Optimizer Engine**: Live tracking of faculty schedules, double-booking prevention, consecutive lecture streak dampening, and 1-hop swaps.
- **Faculty Constraints & Time Availability**: Configurable per-faculty blackout slots and daily workload boundaries.
- **Semester Workspace Lifecycle**: Complete Draft, Active, and Archived workspace management with export controls.
- **Subject-Group Practical Solver**: Initial parallel batch lab allocation grouping batches by subject.
