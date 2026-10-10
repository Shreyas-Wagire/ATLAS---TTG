# ATLAS v5.5 — Course-Aware Lab Resource Allocation & Scheduler Architecture

## Executive Summary

**ATLAS v5.5** represents a fundamental architectural evolution from the previous heuristic-based allocation system to a **deterministic, course-aware, and resource-constrained academic timetable generator**.

In versions prior to 5.5, laboratory allocation operated under an unconstrained *"find any free lab"* model. This caused severe allocation anomalies—especially in non-technical engineering disciplines (such as Civil, Mechanical, Electrical, Aeronautical)—where specialised laboratories (e.g., Concrete Technology Lab, Geology Lab, Environmental Engineering Lab) were arbitrarily assigned to unrelated practical subjects (e.g., Geotechnical Engineering or CAD).

ATLAS v5.5 introduces **structured multi-sheet ingestion (Load, FIX, Location)**, **pre-scheduling course-to-lab compatibility resolution**, **resource-pressure weighted priority scoring (DAPS)**, **cohort-aware division practical packing**, **strict 1-batch-per-faculty rotation guarantees**, and **real-time controlled manual override workflows**.

---

## 1. Architectural Transformation Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              INPUT WORKBOOK                  │
                      │   Sheet 1: LOAD  |  Sheet 2: FIX  |  Sheet 3: LOCATION
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
          ┌─────────────────────────┐                 ┌─────────────────────────┐
          │     parseLoadSheet      │                 │   parseLocationSheet    │
          │  Loads, Batches, Divs   │                 │ Classrooms, Tuts, Labs  │
          └────────────┬────────────┘                 └────────────┬────────────┘
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │    courseLabResolver.js     │
                              │ Pre-calculates Primary Labs │
                              │   & Scored Fallback Matrix  │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │  generateSessionPool.js     │
                              │ Tags primaryLab, fallbacks, │
                              │    and hasBatchCols         │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │    DAPS Priority Scoring    │
                              │  Scarcity + Lab Pressure    │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │    practicalPacking.js      │
                              │ Pass 0: Division Cohorts    │
                              │ Pass 1-5: 4→3→2→1 Stacking  │
                              │ 1-Batch-Per-Faculty Invar.  │
                              └──────────────┬──────────────┘ 
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │    allocateResources.js     │
                              │ Harmonized Room Assignment  │
                              │  Classrooms & Tut Rooms     │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │ UI & Verification Layer     │
                              │ Badges: PRIMARY / FALLBACK  │
                              │ Controlled Override Modal   │
                              └─────────────────────────────┘
```

---

## 2. In-Depth Breakdown of Features Added in Version 5.5

### 2.1 The 3rd Sheet Parser: `parseLocationSheet.js`
- **File**: `app/utils/parseLocationSheet.js`
- **Purpose**: Ingests physical college campus infrastructure from the 3rd workbook sheet (`Location`).
- **Data Extracted**:
  1. **Classrooms**: Regular theory lecture rooms (e.g., C1, C2, C3, Room 101).
  2. **Tutorial Rooms**: Dedicated rooms for small-batch problem solving (e.g., TR1, TR2).
  3. **Laboratories**:
     - `labName`: Full physical laboratory name (e.g., "Concrete Technology Lab").
     - `labInitial`: Canonical identifier used in timetables (e.g., "CTL").
     - `labFeatures`: Equipment/facilities description (e.g., "Compression testing machines, slump cones").
     - `mappedCourses`: List of courses officially designated to use this lab.
- **Robust Normalization**:
  - Handles multi-line strings, carriage returns, comma-separated lists, and slashes.
  - Normalizes dashes (en-dash `–`, em-dash `—`, hyphen `-`) and Roman numerals (`I`, `II`, `III`) to prevent string mismatch failures.
  - Filters out `"NA"`, empty cells, and darkened visual placeholder cells.

### 2.2 Pre-Scheduling Course-to-Lab Resolver: `courseLabResolver.js`
- **File**: `app/utils/courseLabResolver.js`
- **Purpose**: Establishes a deterministic mapping between courses and laboratories before scheduling begins.
- **Key Mechanics**:
  - **Primary Lab Identification**: Matches the course name against the `mappedCourses` catalog of each lab using normalized tokens.
  - **Compatible Fallback Options**: Calculates affinity scores for alternative labs based on shared subject domains (e.g., if Concrete Technology Lab `CTL` is busy, Structural Engineering Lab `SEL` is scored as a high-compatibility fallback; CAD drawing lab is scored as incompatible).
  - **Status Designation**:
    - `MAPPED`: Primary lab found and confirmed.
    - `FALLBACK`: Primary lab occupied; secondary compatible lab assigned with exact scoring.
    - `MANUAL`: Lab selected by human user override.
    - `UNRESOLVED`: Course has no compatible lab available in the designated window (flagged without corrupt placeholders).
  - **No Phantom Courses**: Laboratories mapped in the `Location` sheet for courses that do not exist in `LOAD` are marked as `MAPPED_BUT_NOT_IN_LOAD` diagnostics and are **never** scheduled into the timetable.

### 2.3 Lab Resource Pressure Integration in DAPS
- **File**: `app/utils/daps.js` and `app/utils/generateSmartTimetable.js`
- **Purpose**: In Dynamic Adaptive Priority Scheduling (DAPS), practicals that require rare, highly contended labs must be scheduled earlier than flexible practicals.
- **Mechanism**:
  - A laboratory with 0 fallbacks receives a maximum resource pressure boost (+100 to +150 score).
  - A laboratory with multiple compatible fallbacks receives lower pressure.
  - This ensures that constrained labs are locked in before general rooms or slots are depleted.

### 2.4 Division Practical Cohorts vs. Rotation Electives (Pass 0)
- **File**: `app/utils/practicalPacking.js` & `app/utils/generateSessionPool.js`
- **Context & Problem Solved**:
  - When enforcing strict 1-batch-per-faculty rules, courses with no individual batch instructors (like *Construction Management*, where the Load sheet defines `L=0, T=0, P=2`, faculty `SVP`, but columns 1–8 are blank) were erroneously split into 4 separate 2-hour slots for one faculty. This saturated the division schedule and created artificial backlog in TY-B.
- **The Solution**:
  - Tagged `hasBatchCols: boolean` on every practical session in `generateSessionPool.js`.
  - Added **Pass 0 (Division Practical Cohort Packing)** in `practicalPacking.js`:
    - Courses with `hasBatchCols === false` are scheduled as a **unified division cohort**: all batches (e.g., T5, T6, T7, T8) attend the lab (`CTL2`) together in **one** 2-hour slot with their division faculty (`SVP`).
    - This saves 3 entire 2-hour practical windows in the division, eliminating backlog.
  - For rotation practicals with `hasBatchCols === true` (such as `BTECH GE-I / GE-II`), the **strict 1-batch-per-faculty rule** is enforced: faculty member `SSM` is placed across different days (Monday, Tuesday, Friday) for batches `B5`, `B6`, `B7`, never co-scheduled in the same slot.

### 2.5 Practical Stacking Optimization (4 → 3 → 2 → 1)
- **File**: `app/utils/practicalPacking.js`
- **Multi-Pass Parallel Execution**:
  - **Pass 0**: Division practical cohorts (all batches together in designated lab).
  - **Pass 1**: Full 4-batch parallel stacks across different courses (max 1 block per division per day).
  - **Pass 2**: 3-batch parallel stacks.
  - **Pass 3**: 2-batch paired stacks.
  - **Pass 4**: 2-batch paired stacks allowing afternoon 2nd practical block.
  - **Pass 5**: Clean-up single batches.
- **Cross-Course Preference**: Stacks with higher course diversity are prioritized, ensuring students rotate across different laboratories during the practical window.

### 2.6 Tutorial Room Allocation & Faculty Harmonization
- **File**: `app/utils/allocateResources.js`
- **Problem Solved**: When multiple batches in a division were scheduled for a tutorial at the same period with the same faculty member, the scheduler previously attempted to allocate multiple tutorial rooms, resulting in tutorial room double-booking clashes.
- **Solution**: Batches sharing the same tutorial session and same faculty now share the assigned tutorial room, eliminating all tutorial room clashes.

### 2.7 UI Transparency, Clean Badges & Diagnostic Reason Reporting
- **Files**: `app/components/GenerationReport.jsx` & `app/components/TimetableGrid.jsx`
- **Elimination of Mojibake Characters**:
  - Removed corrupted UTF-8 symbols (`LABâ€ `, `âš `) and replaced them with styled, responsive UI badges:
    - **PRIMARY** (Emerald Green badge)
    - **FALLBACK** (Amber / Yellow badge)
    - **MANUAL** (Blue badge)
    - **UNRESOLVED** (Rose / Red badge)
- **Controlled Manual Override Modal**:
  - Clicking on any practical cell opens an interactive modal.
  - Displays currently assigned lab, compatibility score, and only permits selecting **compatible** physical laboratories.
  - Real-time hard conflict check prevents user overrides that would create lab double-bookings.
- **Human-Readable Unallocated Explanations**:
  - Detailed diagnostic table explains the exact root cause for any unallocated session (e.g., *"Division TY-B schedule fully saturated (30/30 periods filled). Course load exceeds weekly 30h timetable capacity"* or *"Faculty SVP occupied elsewhere at Thursday L5-L6"*).

---

## 3. Comparative Summary: v4.4 vs. v5.5

| Feature / Dimension | ATLAS v4.4 | ATLAS v5.5 |
| :--- | :--- | :--- |
| **Lab Allocation Strategy** | Heuristic: *"Find any available free lab"* | Course-Aware: Primary Mapped Lab → Scored Compatible Fallback |
| **Location Data Ingestion** | Only parsed raw room strings if present | Full 3rd sheet parsing (`Classroom`, `Tutorial Room`, `Lab Name`, `Initials`, `Features`, `Mapped Course`) |
| **Compatibility Awareness** | None (Civil courses could be placed in Computer Labs) | Domain-scored fallback matrix based on physical equipment and features |
| **Division Practicals (`!hasBatchCols`)** | Split into individual batch sessions, wasting practical slots | Pass 0 Cohort Packing: all batches attend together in designated lab |
| **Rotation Practicals (`hasBatchCols`)** | Could place multiple batches with same faculty in same slot | Strict 1-batch-per-faculty invariant across separate days |
| **Tutorial Room Handling** | Allocated separate rooms even if same faculty | Same faculty co-attending batches share physical tutorial room |
| **UI Status & Visual Indicators** | Corrupted symbols (`LABâ€ `, `âš `) | Polished badges (`PRIMARY`, `FALLBACK`, `MANUAL`, `UNRESOLVED`) |
| **Manual Override Safety** | Permitted selecting any room without validation | Strictly validates compatibility and checks real-time slot occupancy |
| **Unallocated Diagnostics** | Generic counter without explanation | Detailed slot-by-slot rejection reason and division saturation analysis |

---

## 4. Verification and Empirical Benchmarks

The v5.5 engine was empirically validated against test datasets:

- **Conflict Report**:
  - Faculty Clashes: **0**
  - Room Clashes: **0**
  - Lab Clashes: **0**
  - Tutorial Room Clashes: **0**
  - Batch Clashes: **0**
  - Division Clashes: **0**
  - Practical Break Violations: **0**
  - Fixed Constraint Violations: **0**
  - **Total Clashes: 0**
- **Unallocated Practicals**: **0**
- **BTECH GE-I SSM Allocation**: `B5` on Monday Slot 3, `B6` on Tuesday Slot 3, `B7` on Friday Slot 1 (1 batch per faculty per day).
- **TY-B CM Allocation**: Fully scheduled without slot starvation.
- **Production Build Status**: Next.js 16 (Turbopack) build compiles cleanly with 0 type errors.
