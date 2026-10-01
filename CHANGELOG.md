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

## [v4.4] — 2026-10-01 (Current Release)

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
