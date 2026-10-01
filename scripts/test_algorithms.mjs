/**
 * scripts/test_algorithms.mjs
 * Comprehensive validation and test suite for ATLAS v4.4 extensions:
 *   1. DAPS (Dynamic Adaptive Priority Scheduling)
 *   2. RCAA (Resource-Conflict Anticipation Algorithm)
 *   3. CASC (Constraint-Aware Swap Cascade)
 *   4. College-Wide Priority Scheduling Pipeline (CollegeOccupancy)
 *   5. Final Multi-Course Parallel Practical Stacking Engine (4 → 3 → 2 → 1)
 *
 * Verifies all hard invariants, stress scenarios, and diagnostics.
 */

import { generateSmartTimetable } from "../app/utils/generateSmartTimetable.js";
import { createEmptyTimetable } from "../app/utils/createEmptyTimetable.js";
import { generateSessionPool } from "../app/utils/generateSessionPool.js";
import { validateTimetable } from "../app/utils/validateTimetable.js";
import { generateConflictReport } from "../app/utils/generateConflictReport.js";
import {
    prioritizeSessionPool,
    reprioritizeUnallocated,
    calculateSessionPriority,
    buildDAPSContext,
    generateDAPSReport,
} from "../app/utils/daps.js";
import {
    buildRCAAContext,
    calculateResourcePressure,
    calculatePracticalResourcePressure,
    scoreSlotResourcePressure,
    rankSlotsByResourcePressure,
    filterCompatibleResources,
    generateRCAAReport,
} from "../app/utils/rcaa.js";
import {
    attemptCascadePlacement,
    generateCASCReport,
} from "../app/utils/casc.js";
import { detectSyncViolations } from "../app/utils/detectSyncViolations.js";
import { CollegeOccupancy } from "../app/utils/collegeOccupancy.js";
import { packPracticals } from "../app/utils/practicalPacking.js";
import { allocateSessions, analyzeUnallocatedSession } from "../app/utils/allocateSessions.js";

// Helper: Assertion runner
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ ${message}`);
    } else {
        failedTests++;
        console.error(`  ✗ FAIL: ${message}`);
    }
}

console.log("============================================================");
console.log("ATLAS v4.4 — ALGORITHM VALIDATION & TEST SUITE");
console.log("============================================================\n");

// ============================================================
// TEST SUITE 1: DAPS (Dynamic Adaptive Priority Scheduling)
// ============================================================
console.log("--- TEST SUITE 1: DAPS Core Functionality ---");

// Mock sample curriculum
const sampleGroupedData = {
    SY: [
        {
            code: "CS201",
            courseName: "Data Structures",
            L: 3, T: 1, P: 2,
            divisions: { A: "Prof. Sharma", B: "Prof. Verma" },
            batches: {
                1: "Prof. Sharma", 2: "Prof. Sharma",
                3: "Prof. Verma", 4: "Prof. Verma",
            }
        },
        {
            code: "CS202",
            courseName: "Discrete Mathematics",
            L: 3, T: 1, P: 0,
            divisions: { A: "Prof. Gupta", B: "Prof. Gupta" },
            batches: { 1: "Prof. Gupta", 2: "Prof. Gupta" }
        }
    ],
    TY: [
        {
            code: "CS301",
            courseName: "Operating Systems",
            L: 3, T: 0, P: 2,
            divisions: { A: "Prof. Iyer", B: "Prof. Iyer" },
            batches: { 1: "Prof. Iyer", 2: "Prof. Iyer" }
        }
    ]
};

const facultyAvailability = {
    "Prof. Sharma": {
        Monday: [0, 1, 2], // Blocked morning
        Tuesday: [0, 1],
    },
    "Prof. Iyer": {
        Monday: [0, 1, 2, 3, 4, 5], // Full Monday blocked
        Friday: [0, 1, 2, 3],       // Constrained
    }
};

const timetable = createEmptyTimetable(sampleGroupedData);
const sessionPool = generateSessionPool(sampleGroupedData);

assert(sessionPool.length > 0, `Session pool generated with ${sessionPool.length} sessions`);

// 1.1: Calculate priority scores
const dapsContext = buildDAPSContext(timetable, sessionPool, facultyAvailability);
const session1 = sessionPool.find(s => s.faculty === "Prof. Iyer" && s.type === "PRACTICAL");
const session2 = sessionPool.find(s => s.faculty === "Prof. Gupta" && s.type === "LECTURE");

assert(session1 !== undefined, "Found practical session for Prof. Iyer");
assert(session2 !== undefined, "Found lecture session for Prof. Gupta");

if (session1 && session2) {
    const p1 = calculateSessionPriority(session1, dapsContext);
    const p2 = calculateSessionPriority(session2, dapsContext);

    assert(typeof p1.score === "number" && p1.score >= 0 && p1.score <= 1, `Practical priority score valid: ${p1.score}`);
    assert(typeof p2.score === "number" && p2.score >= 0 && p2.score <= 1, `Lecture priority score valid: ${p2.score}`);
    assert(p1.score > p2.score, `Prof. Iyer practical has higher constraint priority (${p1.score.toFixed(3)}) than Prof. Gupta lecture (${p2.score.toFixed(3)})`);

    // Verify diagnostic factors exist
    assert(p1.factors.slotScarcity !== undefined, "Slot scarcity factor computed");
    assert(p1.factors.facultyScarcity !== undefined, "Faculty scarcity factor computed");
    assert(p1.factors.practicalWindowScarcity !== undefined, "Practical window scarcity factor computed");
}

// 1.2: Pool prioritization preserving type order
const { sessionPool: prioritizedPool, diagnostics: dapsDiag } = prioritizeSessionPool(
    [...sessionPool], timetable, facultyAvailability, { preserveTypeOrder: true }
);

assert(prioritizedPool.length === sessionPool.length, "DAPS preserved exact session count");
// Practicals should be before lectures
const firstPracticalIdx = prioritizedPool.findIndex(s => s.type === "PRACTICAL");
const firstLectureIdx = prioritizedPool.findIndex(s => s.type === "LECTURE");
assert(firstPracticalIdx < firstLectureIdx, "DAPS preserved Practical before Lecture ordering");

// 1.3: DAPS Diagnostic report
const dapsReport = generateDAPSReport(dapsDiag);
assert(dapsReport.totalSessions === sessionPool.length, `DAPS report tracks all ${dapsReport.totalSessions} sessions`);
assert(Array.isArray(dapsReport.topConstrained) && dapsReport.topConstrained.length > 0, "DAPS top constrained sessions listed");
console.log(`  [DAPS Diagnostic] Top constrained session: ${dapsReport.topConstrained[0]?.session} (Score: ${dapsReport.topConstrained[0]?.score})`);
console.log(`  [DAPS Diagnostic] Reason: ${dapsReport.topConstrained[0]?.reason}`);


// ============================================================
// TEST SUITE 2: RCAA (Resource-Conflict Anticipation Algorithm)
// ============================================================
console.log("\n--- TEST SUITE 2: RCAA Core Functionality ---");

const resources = {
    classrooms: ["CR1", "CR2", "CR3"],
    labs: ["LAB1", "LAB2"],
    tutorialRooms: ["TR1"]
};

const rcaaContext = buildRCAAContext(timetable, resources);

// 2.1: Free slot pressure
const freeSlotPressure = calculateResourcePressure("Monday", 0, "CLASSROOM", rcaaContext.demandMap, rcaaContext.occupancyMap, rcaaContext.resourcePools);
assert(freeSlotPressure.pressure < 1.0, `Unoccupied classroom slot has low pressure: ${freeSlotPressure.pressure}`);
assert(freeSlotPressure.available === 3, `All 3 classrooms available in empty slot`);

// 2.2: Contiguous 2-hour practical validation
const pracPressure = calculatePracticalResourcePressure("Monday", 0, rcaaContext.demandMap, rcaaContext.occupancyMap, rcaaContext.resourcePools);
assert(pracPressure.available === 2, `Both 2 labs free for 2-hour practical window`);
assert(pracPressure.pressure < 1.0, `Practical pressure within threshold: ${pracPressure.pressure}`);

// 2.3: Slot ranking by resource pressure
const candidates = [
    { day: "Monday", slotIdx: 0 },
    { day: "Tuesday", slotIdx: 2 },
    { day: "Wednesday", slotIdx: 4 }
];
const rankedSlots = rankSlotsByResourcePressure(session1, candidates, rcaaContext);
assert(rankedSlots.length === 3, "Ranked all candidate slots");
assert(rankedSlots[0].pressure <= rankedSlots[2].pressure, "Candidates sorted by resource pressure ascending");

// 2.4: Compatibility filtering — no hallucination
const compatPrac = filterCompatibleResources(session1, rcaaContext.resourcePools);
assert(compatPrac.compatible.length === 2 && compatPrac.compatible.includes("LAB1"), "Compatible practical labs filtered correctly");

const fixedLocSession = { ...session1, location: "CUSTOM_LAB_99" };
const compatFixed = filterCompatibleResources(fixedLocSession, rcaaContext.resourcePools);
assert(compatFixed.compatible.length === 1 && compatFixed.compatible[0] === "CUSTOM_LAB_99", "Pre-assigned location respected without hallucination");

// 2.5: RCAA Conflict/Warning report
const rcaaReport = generateRCAAReport(timetable, resources);
assert(rcaaReport.summary.resourcePoolSizes.classrooms === 3, "RCAA tracks classroom pool size");
assert(rcaaReport.summary.resourcePoolSizes.labs === 2, "RCAA tracks lab pool size");
console.log(`  [RCAA Diagnostic] Resource Pools: CR=${rcaaReport.summary.resourcePoolSizes.classrooms}, LAB=${rcaaReport.summary.resourcePoolSizes.labs}, TR=${rcaaReport.summary.resourcePoolSizes.tutorialRooms}`);


// ============================================================
// TEST SUITE 3: COURSE-PRESERVING GLOBAL FACULTY-AWARE CASCADE SWAP
// ============================================================
console.log("\n--- TEST SUITE 3: Course-Preserving Global Faculty-Aware Cascade Swap ---");

// --- SCENARIO 1: Lecture blocked -> cascade repair ---
console.log("\n  [Scenario 1] Lecture blocked -> cascade repair");
const cascTimetable1 = {
    "SY-A": {
        Monday: [
            { type: "LECTURE", faculty: "Prof. Blocked", subject: "MATH1", span: 1, fixed: false },
            null, null, null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const cascFacultySchedule1 = {
    "Prof. Blocked": { Monday: { 0: true } },
    "Prof. Target": {
        Tuesday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Wednesday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Thursday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Friday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
    }
};

const stuckSession1 = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "PHYS1",
    faculty: "Prof. Target",
    allocated: false
};

const cascResult1 = attemptCascadePlacement({
    timetable: cascTimetable1,
    session: stuckSession1,
    facultySchedule: cascFacultySchedule1,
    facultyAvailability: {},
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResult1.success === true, `Scenario 1: Lecture placed via cascade`);
assert(stuckSession1.allocated === true, "Scenario 1: Target session marked allocated");
assert(cascResult1.chain && cascResult1.chain.length === 1, `Scenario 1: Chain length 1`);
assert(cascTimetable1["SY-A"].Monday[0].subject === "PHYS1", "Scenario 1: PHYS1 placed at slot 0");
assert(cascTimetable1["SY-A"].Monday[0].faculty === "Prof. Target", "Scenario 1: Course-faculty binding preserved (PHYS1 -> Prof. Target)");
assert(cascTimetable1["SY-A"].Monday[1].subject === "MATH1", "Scenario 1: MATH1 moved to slot 1");
assert(cascTimetable1["SY-A"].Monday[1].faculty === "Prof. Blocked", "Scenario 1: Course-faculty binding preserved (MATH1 -> Prof. Blocked)");

// --- SCENARIO 2: Tutorial blocked -> cascade repair ---
console.log("\n  [Scenario 2] Tutorial blocked -> cascade repair");
const cascTimetableTut = {
    "SY-A": {
        Monday: [
            { type: "LECTURE", faculty: "Prof. Movable", subject: "STATS", span: 1, fixed: false },
            null, null, null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const stuckTutorial = {
    year: "SY",
    division: "A",
    type: "TUTORIAL",
    subject: "MATH_TUT",
    faculty: "Prof. TutLead",
    batch: "B1",
    allocated: false
};

const cascResultTut = attemptCascadePlacement({
    timetable: cascTimetableTut,
    session: stuckTutorial,
    facultySchedule: { "Prof. Movable": { Monday: { 0: true } } },
    facultyAvailability: { "Prof. TutLead": { Monday: [1, 2, 3, 4, 5] } }, // Only free at Mon 0
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultTut.success === true, "Scenario 2: Tutorial placed via cascade");
assert(stuckTutorial.allocated === true, "Scenario 2: Tutorial marked allocated");
assert(cascTimetableTut["SY-A"].Monday[0].type === "TUTORIAL", "Scenario 2: Placed cell retains type TUTORIAL");
assert(cascTimetableTut["SY-A"].Monday[0].batch === "B1", "Scenario 2: Placed tutorial retains batch B1");
assert(cascTimetableTut["SY-A"].Monday[0].faculty === "Prof. TutLead", "Scenario 2: Course-faculty binding preserved");

// --- SCENARIO 3: Practical blocked -> 2-hour atomic cascade repair ---
console.log("\n  [Scenario 3] Practical blocked -> 2-hour atomic cascade repair");
const cascTimetablePrac = {
    "SY-A": {
        Monday: [
            { type: "PRACTICAL", faculty: "Prof. OldLab", subject: "OLD_LAB", span: 2, fixed: false },
            { type: "PRACTICAL", faculty: "Prof. OldLab", subject: "OLD_LAB", span: 0, fixed: false },
            null, null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const stuckPractical = {
    year: "SY",
    division: "A",
    type: "PRACTICAL",
    subject: "NEW_LAB",
    faculty: "Prof. NewLab",
    allocated: false
};

const cascResultPrac = attemptCascadePlacement({
    timetable: cascTimetablePrac,
    session: stuckPractical,
    facultySchedule: { "Prof. OldLab": { Monday: { 0: true, 1: true } } },
    facultyAvailability: { "Prof. NewLab": { Monday: [2, 3, 4, 5] } }, // Only free at slots 0, 1
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultPrac.success === true, "Scenario 3: Practical placed via atomic 2-hour cascade");
assert(stuckPractical.allocated === true, "Scenario 3: Practical marked allocated");
assert(cascTimetablePrac["SY-A"].Monday[0].type === "PRACTICAL", "Scenario 3: Slot 0 has type PRACTICAL");
assert(cascTimetablePrac["SY-A"].Monday[0].span === 2, "Scenario 3: Slot 0 is practical head (span 2)");
assert(cascTimetablePrac["SY-A"].Monday[1].type === "PRACTICAL", "Scenario 3: Slot 1 has type PRACTICAL");
assert(cascTimetablePrac["SY-A"].Monday[1].span === 0, "Scenario 3: Slot 1 is practical tail (span 0)");
assert(cascTimetablePrac["SY-A"].Monday[2].subject === "OLD_LAB", "Scenario 3: Displaced practical moved to valid start slot 2");
assert(cascTimetablePrac["SY-A"].Monday[2].span === 2, "Scenario 3: Displaced practical head span 2");
assert(cascTimetablePrac["SY-A"].Monday[3].span === 0, "Scenario 3: Displaced practical tail span 0");

// --- SCENARIO 4: Batch practical blocked -> preserve all batch allocations ---
console.log("\n  [Scenario 4] Batch practical blocked -> preserve all batch allocations");
const cascTimetableBatchPrac = {
    "SY-A": {
        Monday: [
            { type: "PRACTICAL", faculty: "Prof. P1", subject: "PARKING_LAB", span: 2, fixed: false },
            { type: "PRACTICAL", faculty: "Prof. P1", subject: "PARKING_LAB", span: 0, fixed: false },
            null, null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const batchPractical = {
    year: "SY",
    division: "A",
    type: "PRACTICAL",
    subject: "NETWORK_LAB",
    faculty: "Prof. NetLead",
    batchAllocations: [
        { batch: "B1", faculty: "Prof. Net1" },
        { batch: "B2", faculty: "Prof. Net2" },
        { batch: "B3", faculty: "Prof. Net3" }
    ],
    allocated: false
};

const cascResultBatchPrac = attemptCascadePlacement({
    timetable: cascTimetableBatchPrac,
    session: batchPractical,
    facultySchedule: { "Prof. P1": { Monday: { 0: true, 1: true } } },
    facultyAvailability: { "Prof. NetLead": { Monday: [2, 3, 4, 5] } },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultBatchPrac.success === true, "Scenario 4: Batch practical placed via cascade");
assert(batchPractical.allocated === true, "Scenario 4: Batch practical marked allocated");
const placedBatchPrac = cascTimetableBatchPrac["SY-A"].Monday[0];
assert(Array.isArray(placedBatchPrac.batchAllocations), "Scenario 4: Batch allocations array preserved");
assert(placedBatchPrac.batchAllocations.length === 3, "Scenario 4: All 3 batches preserved");
assert(placedBatchPrac.batchAllocations[0].batch === "B1" && placedBatchPrac.batchAllocations[0].faculty === "Prof. Net1", "Scenario 4: Batch B1 preserved");
assert(placedBatchPrac.batchAllocations[1].batch === "B2" && placedBatchPrac.batchAllocations[1].faculty === "Prof. Net2", "Scenario 4: Batch B2 preserved");
assert(placedBatchPrac.batchAllocations[2].batch === "B3" && placedBatchPrac.batchAllocations[2].faculty === "Prof. Net3", "Scenario 4: Batch B3 preserved");

// --- SCENARIO 5: Cross-division faculty conflict ---
console.log("\n  [Scenario 5] Cross-division faculty conflict");
// PSP teaches SY-A (DSA), SY-C (DS), TY-B (DB), BTECH-A (DCC)
// In TY-B, PSP teaches at Tuesday Slot 3
// DSA (PSP) needs placement in SY-C. SY-C Tuesday Slot 3 must NOT be selected even if empty!
const cascTimetableCrossDiv = {
    "TY-B": {
        Monday: [null, null, null, null, null, null],
        Tuesday: [
            null, null, null,
            { type: "LECTURE", faculty: "PSP", subject: "DB", span: 1, fixed: false },
            null, null
        ],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    },
    "SY-C": {
        Monday: [null, null, null, null, null, null],
        Tuesday: [
            { type: "LECTURE", faculty: "BAJ", subject: "OS", span: 1, fixed: false },
            null, null, null, null, null
        ],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const dsaSession = {
    year: "SY",
    division: "C",
    type: "LECTURE",
    subject: "DSA",
    faculty: "PSP",
    allocated: false
};

const cascResultCrossDiv = attemptCascadePlacement({
    timetable: cascTimetableCrossDiv,
    session: dsaSession,
    facultySchedule: {
        "PSP": { Tuesday: { 3: true } },
        "BAJ": { Tuesday: { 0: true } }
    },
    facultyAvailability: {
        // Block PSP everywhere else except Tuesday slot 0 and Tuesday slot 3
        "PSP": {
            Monday: [0, 1, 2, 3, 4, 5],
            Tuesday: [1, 2, 4, 5], // Free only at slot 0 and slot 3 (but slot 3 is busy in TY-B!)
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultCrossDiv.success === true, "Scenario 5: Cascade succeeded avoiding cross-division faculty conflict");
assert(dsaSession.allocated === true, "Scenario 5: DSA allocated");
assert(cascTimetableCrossDiv["SY-C"].Tuesday[0].subject === "DSA", "Scenario 5: DSA placed at Tuesday slot 0 by cascading OS-BAJ");
assert(cascTimetableCrossDiv["SY-C"].Tuesday[3] === null, "Scenario 5: Tuesday slot 3 in SY-C remained untouched (cross-division conflict prevented)");
assert(cascTimetableCrossDiv["TY-B"].Tuesday[3].subject === "DB", "Scenario 5: TY-B Tuesday slot 3 DB session completely intact");

// --- SCENARIO 6: Multi-hop cascade (depth 2+) ---
console.log("\n  [Scenario 6] Multi-hop cascade (depth 2)");
const cascTimetable2 = {
    "SY-A": {
        Monday: [
            { type: "LECTURE", faculty: "Prof. A", subject: "COURSE_A", span: 1, fixed: false },
            { type: "LECTURE", faculty: "Prof. B", subject: "COURSE_B", span: 1, fixed: false },
            null, null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const cascFacultySchedule2 = {
    "Prof. A": {
        Monday: { 0: true, 2: true, 3: true, 4: true, 5: true },
        Tuesday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Wednesday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Thursday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Friday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
    },
    "Prof. B": {
        Monday: { 1: true }
    },
    "Prof. X_Target": {
        Monday: { 1: true, 2: true, 3: true, 4: true, 5: true },
        Tuesday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Wednesday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Thursday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        Friday: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
    }
};

const stuckSession2 = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "COURSE_X",
    faculty: "Prof. X_Target",
    allocated: false
};

const cascResult2 = attemptCascadePlacement({
    timetable: cascTimetable2,
    session: stuckSession2,
    facultySchedule: cascFacultySchedule2,
    facultyAvailability: {
        "Prof. X_Target": {
            Monday: [1, 2, 3, 4, 5],
            Tuesday: [0, 1, 2, 3, 4, 5],
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        },
        "Prof. A": {
            Monday: [2, 3, 4, 5],
            Tuesday: [0, 1, 2, 3, 4, 5],
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResult2.success === true, `Scenario 6: Multi-hop cascade succeeded (depth 2)`);
assert(stuckSession2.allocated === true, "Scenario 6: Target session marked allocated");
assert(cascResult2.chain && cascResult2.chain.length === 2, `Scenario 6: Chain length 2`);
assert(cascResult2.diagnostics?.formattedLog?.includes("CASCADE SUCCESS"), "Scenario 6: Diagnostics formattedLog contains CASCADE SUCCESS");

// --- SCENARIO 7: Cascade blocked by a global constraint ---
console.log("\n  [Scenario 7] Cascade blocked by a global constraint");
const cascTimetableFixed = {
    "SY-A": {
        Monday: [
            { type: "FIXED", faculty: "FIXED", subject: "ASSEMBLY", span: 1, fixed: true },
            null, null, null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const stuckSessionFixed = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "BLOCKED_COURSE",
    faculty: "Prof. BlockedFixed",
    allocated: false
};

const cascResultFixed = attemptCascadePlacement({
    timetable: cascTimetableFixed,
    session: stuckSessionFixed,
    facultySchedule: {},
    facultyAvailability: {
        "Prof. BlockedFixed": {
            // Blocked everywhere except Monday slot 0 (which is fixed!)
            Monday: [1, 2, 3, 4, 5],
            Tuesday: [0, 1, 2, 3, 4, 5],
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultFixed.success === false, "Scenario 7: Cascade rejected when encountering fixed/global constraint");
assert(cascTimetableFixed["SY-A"].Monday[0].fixed === true, "Scenario 7: Fixed session untouched (immutable anchor)");
assert(cascTimetableFixed["SY-A"].Monday[0].subject === "ASSEMBLY", "Scenario 7: Assembly remained in place");
assert(cascResultFixed.diagnostics?.rejectedReasons?.has("Fixed/global constraint encountered"), "Scenario 7: Rejection recorded Fixed/global constraint encountered");

// --- SCENARIO 8: Faculty unavailable on Monday -> search Tuesday ---
console.log("\n  [Scenario 8] Faculty unavailable on Monday -> search Tuesday");
const cascTimetableMonTue = {
    "SY-A": {
        Monday: [null, null, null, null, null, null],
        Tuesday: [
            { type: "LECTURE", faculty: "Prof. TueOcc", subject: "SUBJ_TUE", span: 1, fixed: false },
            null, null, null, null, null
        ],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const stuckSessionTue = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "SUBJ_NEW",
    faculty: "Prof. TueSeeker",
    allocated: false
};

const cascResultTue = attemptCascadePlacement({
    timetable: cascTimetableMonTue,
    session: stuckSessionTue,
    facultySchedule: { "Prof. TueOcc": { Tuesday: { 0: true } } },
    facultyAvailability: {
        "Prof. TueSeeker": {
            Monday: [0, 1, 2, 3, 4, 5], // Entire Monday blocked
            Tuesday: [1, 2, 3, 4, 5],   // Free only at Tuesday 0
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultTue.success === true, "Scenario 8: Succeeded on Tuesday after Monday blocked");
assert(stuckSessionTue.allocated === true, "Scenario 8: Allocated on Tuesday");
assert(cascTimetableMonTue["SY-A"].Tuesday[0].subject === "SUBJ_NEW", "Scenario 8: Placed at Tuesday slot 0");
const movedTue = cascResultTue.chain[0];
assert(movedTue.toDay !== null && movedTue.toSlot !== null, "Scenario 8: Displaced session moved to a free slot");
assert(cascTimetableMonTue["SY-A"][movedTue.toDay][movedTue.toSlot].subject === "SUBJ_TUE", "Scenario 8: Displaced session preserved in timetable");

// --- SCENARIO 9: Faculty unavailable Monday/Tuesday -> continue Wednesday/Thursday/Friday ---
console.log("\n  [Scenario 9] Faculty unavailable Monday/Tuesday -> continue Wed/Thu/Fri");
const cascTimetableWed = {
    "SY-A": {
        Monday: [null, null, null, null, null, null],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [
            { type: "LECTURE", faculty: "Prof. WedOcc", subject: "SUBJ_WED", span: 1, fixed: false },
            null, null, null, null, null
        ],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const stuckSessionWed = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "SUBJ_WED_NEW",
    faculty: "Prof. WedSeeker",
    allocated: false
};

const cascResultWed = attemptCascadePlacement({
    timetable: cascTimetableWed,
    session: stuckSessionWed,
    facultySchedule: { "Prof. WedOcc": { Wednesday: { 0: true } } },
    facultyAvailability: {
        "Prof. WedSeeker": {
            Monday: [0, 1, 2, 3, 4, 5],  // Mon blocked
            Tuesday: [0, 1, 2, 3, 4, 5], // Tue blocked
            Wednesday: [1, 2, 3, 4, 5],  // Free only Wed 0
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultWed.success === true, "Scenario 9: Succeeded on Wednesday after Mon/Tue blocked");
assert(stuckSessionWed.allocated === true, "Scenario 9: Allocated on Wednesday");
assert(cascTimetableWed["SY-A"].Wednesday[0].subject === "SUBJ_WED_NEW", "Scenario 9: Placed at Wednesday slot 0");

// --- SCENARIO 10: No valid cascade exists -> produce precise unresolved-session diagnostic ---
console.log("\n  [Scenario 10] No valid cascade exists -> produce precise diagnostic");
const cascTimetableNoCasc = {
    "SY-A": {
        Monday: [{ type: "FIXED", faculty: "FIXED", subject: "FIXED_1", span: 1, fixed: true }, null, null, null, null, null],
        Tuesday: [{ type: "FIXED", faculty: "FIXED", subject: "FIXED_2", span: 1, fixed: true }, null, null, null, null, null],
        Wednesday: [{ type: "FIXED", faculty: "FIXED", subject: "FIXED_3", span: 1, fixed: true }, null, null, null, null, null],
        Thursday: [{ type: "FIXED", faculty: "FIXED", subject: "FIXED_4", span: 1, fixed: true }, null, null, null, null, null],
        Friday: [{ type: "FIXED", faculty: "FIXED", subject: "FIXED_5", span: 1, fixed: true }, null, null, null, null, null],
    }
};

const hopelessSession = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "HOPELESS",
    faculty: "Prof. Hopeless",
    allocated: false
};

const cascResultHopeless = attemptCascadePlacement({
    timetable: cascTimetableNoCasc,
    session: hopelessSession,
    facultySchedule: {},
    facultyAvailability: {
        // Faculty blocked everywhere across Mon-Fri except slot 0 which has fixed session!
        "Prof. Hopeless": {
            Monday: [1, 2, 3, 4, 5],
            Tuesday: [1, 2, 3, 4, 5],
            Wednesday: [1, 2, 3, 4, 5],
            Thursday: [1, 2, 3, 4, 5],
            Friday: [1, 2, 3, 4, 5],
        }
    },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(cascResultHopeless.success === false, "Scenario 10: Cascade correctly failed");
assert(hopelessSession.allocated === false, "Scenario 10: Session remains legitimately unallocated");
assert(typeof cascResultHopeless.diagnostics?.formattedLog === "string", "Scenario 10: formattedLog generated");
assert(cascResultHopeless.diagnostics.formattedLog.includes("CASCADE FAILED"), "Scenario 10: Log contains CASCADE FAILED");
assert(cascResultHopeless.diagnostics.formattedLog.includes("Rejected because:"), "Scenario 10: Log contains Rejected because:");
console.log("  [Scenario 10 Sample Log Preview]:\n" + cascResultHopeless.diagnostics.formattedLog.trim());

// --- SCENARIO 11: Multiple unallocated sessions -> repair sequentially without breaking ---
console.log("\n  [Scenario 11] Multiple unallocated sessions repaired sequentially");
const cascTimetableMulti = {
    "SY-A": {
        Monday: [
            { type: "LECTURE", faculty: "Prof. Multi1", subject: "MULTI_A", span: 1, fixed: false },
            null,
            { type: "LECTURE", faculty: "Prof. Multi2", subject: "MULTI_B", span: 1, fixed: false },
            null, null, null
        ],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    }
};

const multiSchedule = {
    "Prof. Multi1": { Monday: { 0: true } },
    "Prof. Multi2": { Monday: { 2: true } },
};

const unalloc1 = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "UNALLOC_1",
    faculty: "Prof. U1",
    allocated: false
};

const unalloc2 = {
    year: "SY",
    division: "A",
    type: "LECTURE",
    subject: "UNALLOC_2",
    faculty: "Prof. U2",
    allocated: false
};

// Prof U1 only free at Monday 0
const rMulti1 = attemptCascadePlacement({
    timetable: cascTimetableMulti,
    session: unalloc1,
    facultySchedule: multiSchedule,
    facultyAvailability: { "Prof. U1": { Monday: [1, 2, 3, 4, 5] } },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(rMulti1.success === true, "Scenario 11: First unallocated session placed");
assert(unalloc1.allocated === true, "Scenario 11: First marked allocated");

// Prof U2 only free at Monday 2
const rMulti2 = attemptCascadePlacement({
    timetable: cascTimetableMulti,
    session: unalloc2,
    facultySchedule: multiSchedule,
    facultyAvailability: { "Prof. U2": { Monday: [0, 1, 3, 4, 5] } },
    config: { MAX_CASCADE_DEPTH: 4 }
});

assert(rMulti2.success === true, "Scenario 11: Second unallocated session placed");
assert(unalloc2.allocated === true, "Scenario 11: Second marked allocated");
assert(cascTimetableMulti["SY-A"].Monday[0].subject === "UNALLOC_1", "Scenario 11: UNALLOC_1 remains at slot 0");
assert(cascTimetableMulti["SY-A"].Monday[2].subject === "UNALLOC_2", "Scenario 11: UNALLOC_2 remains at slot 2");

// Verify CASC Report generator
const cascReport = generateCASCReport([cascResult1, cascResult2, cascResultTut, cascResultPrac, cascResultHopeless]);
assert(cascReport.successfulCascades === 4, "CASC report recorded 4 successful cascades");
assert(cascReport.failedCascades === 1, "CASC report recorded 1 failed cascade");
console.log(`  [CASC Report] Success: ${cascReport.successfulCascades}, Failed: ${cascReport.failedCascades}, Avg Depth: ${cascReport.averageCascadeDepth}`);


// ============================================================
// TEST SUITE 4: END-TO-END SCENARIO — 200+ COURSES & MULTIPLE DIVISIONS
// ============================================================
console.log("\n--- TEST SUITE 4: End-to-End Stress Test (200+ Course Sessions) ---");

// Generate a realistic multi-year, multi-division, multi-department dataset
function generateLargeDataset() {
    const years = ["SY", "TY", "BTECH"];
    const divisions = ["A", "B", "C"];
    const grouped = {};

    let totalL = 0;
    let totalT = 0;
    let totalP = 0;

    years.forEach((yr, yrIdx) => {
        grouped[yr] = [];
        // 5 distinct courses per year
        for (let c = 1; c <= 5; c++) {
            const courseCode = `${yr}${100 + c * 10}`;
            const courseName = `${yr} Course ${c}`;
            const isElective = (c === 2 || c === 4) && yr === "SY";
            const L = 3;
            const T = isElective ? 0 : (c % 2 === 0 ? 1 : 0);
            const P = isElective ? 0 : (c % 2 !== 0 ? 2 : 0);

            const divMap = {};
            if (c === 2 && yr === "SY") {
                divMap["A"] = `Prof_${yr}_A_C${c}`;
            } else if (c === 4 && yr === "SY") {
                divMap["B"] = `Prof_${yr}_B_C${c}`;
            } else {
                divisions.forEach((div) => {
                    divMap[div] = `Prof_${yr}_${div}_C${c}`;
                });
            }

            const batchMap = {};
            if (!isElective) {
                const maxBatches = yr === "BTECH" ? 4 : 4;
                for (let b = 1; b <= maxBatches; b++) {
                    batchMap[b] = `Prof_${yr}_Lab_C${c}_B${b}`;
                }
            }

            grouped[yr].push({
                code: courseCode,
                courseName,
                L,
                T,
                P,
                divisions: divMap,
                batches: batchMap
            });

            Object.keys(divMap).forEach(() => {
                totalL += L;
                totalT += T;
                totalP += P;
            });
        }
    });

    return { grouped, totalL, totalT, totalP };
}

const largeData = generateLargeDataset();
const largeResources = {
    classrooms: ["CR101", "CR102", "CR103", "CR104", "CR105", "CR106", "CR107", "CR108", "CR109", "CR110"],
    labs: ["LAB1", "LAB2", "LAB3", "LAB4", "LAB5", "LAB6", "LAB7", "LAB8"],
    tutorialRooms: ["TR1", "TR2", "TR3", "TR4"]
};

// Global constraints: institutional fixed sessions (Assembly, Mentor Hour)
const globalConstraints = [
    {
        day: "Monday",
        slotIndex: 0,
        time: "9:15 - 10:15",
        type: "FIXED",
        courseName: "Institutional Assembly",
        subject: "Institutional Assembly",
        faculty: "FIXED",
        location: "Auditorium",
        year: "ALL"
    },
    {
        day: "Wednesday",
        slotIndex: 3,
        time: "12:30 - 1:30",
        type: "FIXED",
        courseName: "Mentor Hour",
        subject: "Mentor Hour",
        faculty: "FIXED",
        location: "CR101",
        year: "SY"
    }
];

// Cross-division sync rules
const syncRules = [
    {
        groupName: "SYNC_SY_ELECTIVES",
        courses: ["SY120", "SY140"],
    }
];

// Faculty availability constraints
const largeFacultyAvailability = {
    "Prof_SY_A_C1": { Monday: [1, 2] },
    "Prof_TY_B_C2": { Friday: [3, 4, 5] },
    "Prof_BTECH_C_C3": { Wednesday: [0, 1] }
};

console.log("Generating full smart timetable with DAPS + RCAA + CASC enabled...");
const genResult = generateSmartTimetable(
    largeData.grouped,
    globalConstraints,
    syncRules,
    largeResources,
    15, // maxTrials
    largeFacultyAvailability
);

assert(genResult.timetable !== null, "Timetable generation produced non-null output");

// ============================================================
// TEST SUITE 5: HARD INVARIANT VERIFICATIONS
// ============================================================
console.log("\n--- TEST SUITE 5: Hard Invariant Verifications ---");

const finalTimetable = genResult.timetable;
const conflictReport = genResult.conflictReport;
const report = genResult.report;

// 5.1: No faculty double-booked
const facultyClashes = conflictReport.summary.FACULTY_CLASH;
assert(facultyClashes === 0, `Zero faculty double-bookings: found ${facultyClashes}`);

// 5.2: No room double-booked
const roomClashes = conflictReport.summary.ROOM_CLASH;
assert(roomClashes === 0, `Zero room double-bookings: found ${roomClashes}`);

// 5.3: No lab double-booked
const labClashes = conflictReport.summary.LAB_CLASH;
assert(labClashes === 0, `Zero laboratory double-bookings: found ${labClashes}`);

// 5.4: No batch double-booked
const batchClashes = conflictReport.summary.BATCH_CLASH;
assert(batchClashes === 0, `Zero batch double-bookings: found ${batchClashes}`);

// 5.5: Fixed sessions never moved
let fixedSessionsIntact = true;
Object.entries(finalTimetable).forEach(([divKey, daysMap]) => {
    // Check Monday slot 0 Assembly
    const cellMon0 = daysMap?.Monday?.[0];
    if (cellMon0?.subject !== "Institutional Assembly" || !cellMon0?.fixed) {
        fixedSessionsIntact = false;
    }
    // Check Wednesday slot 3 Mentor Hour for SY divisions
    if (divKey.startsWith("SY-")) {
        const cellWed3 = daysMap?.Wednesday?.[3];
        if (cellWed3?.subject !== "Mentor Hour" || !cellWed3?.fixed) {
            fixedSessionsIntact = false;
        }
    }
});
assert(fixedSessionsIntact, "All fixed institutional sessions remained 100% locked and un-moved");

// 5.6: Practicals do not cross breaks (valid start slots 0, 2, 4 only)
let practicalBreaksValid = true;
Object.values(finalTimetable).forEach((daysMap) => {
    Object.values(daysMap).forEach((slots) => {
        slots.forEach((cell, idx) => {
            if (cell?.type === "PRACTICAL" && cell.span === 2) {
                if (idx !== 0 && idx !== 2 && idx !== 4) {
                    practicalBreaksValid = false;
                }
            }
        });
    });
});
assert(practicalBreaksValid, "All 2-hour practicals adhere to valid 2-hour block boundaries (no break crossing)");

// 5.7: Diagnostic reports presence
assert(genResult.dapsReport !== undefined, "DAPS diagnostic report generated");
assert(genResult.rcaaReport !== undefined, "RCAA diagnostic report generated");
assert(genResult.cascReport !== undefined, "CASC diagnostic report generated");

// ============================================================
// TEST SUITE 6: STRICT L/T/P IMMUTABILITY VERIFICATION
// ============================================================
console.log("\n--- TEST SUITE 6: Strict L/T/P Immutability Verification ---");

// Check validation report audit
assert(report.missingLectures.length === 0, `Zero missing lectures: ${report.missingLectures.length}`);
assert(report.missingTutorials.length === 0, `Zero missing tutorials: ${report.missingTutorials.length}`);
assert(report.missingPracticals.length === 0, `Zero missing practicals: ${report.missingPracticals.length}`);

// Every course scheduled count MUST equal required count
assert(report.summary.lecture.allocated === report.summary.lecture.required, `All ${report.summary.lecture.required} required lectures allocated`);
assert(report.summary.tutorial.allocated === report.summary.tutorial.required, `All ${report.summary.tutorial.required} required tutorials allocated`);
assert(report.summary.practical.allocated === report.summary.practical.required, `All ${report.summary.practical.required} required practicals allocated`);

console.log(`  [Immutability Audit] Scheduled L: ${report.summary.lecture.allocated}/${report.summary.lecture.required} (100%)`);
console.log(`  [Immutability Audit] Scheduled T: ${report.summary.tutorial.allocated}/${report.summary.tutorial.required} (100%)`);
console.log(`  [Immutability Audit] Scheduled P: ${report.summary.practical.allocated}/${report.summary.practical.required} (100%)`);

// ============================================================
// TEST SUITE 7: CROSS-DIVISION SYNCHRONIZATION VERIFICATION
// ============================================================
console.log("\n--- TEST SUITE 7: Cross-Division Synchronization Verification ---");

const syncViolations = detectSyncViolations(finalTimetable, syncRules);
assert(syncViolations.length === 0, `Zero cross-division sync violations: found ${syncViolations.length}`);
if (syncViolations.length === 0) {
    console.log(`  [Sync Diagnostic] Cross-division synchronization for SY120 & SY140 perfectly aligned across all slots`);
} else {
    console.error(`  [Sync Diagnostic] Sync violations detected: ${JSON.stringify(syncViolations)}`);
}

// ============================================================
// TEST SUITE 8: COLLEGE-WIDE PRIORITY & PRACTICAL PACKING ACCEPTANCE TESTS
// ============================================================
console.log("\n--- TEST SUITE 8: College-Wide Priority & Practical Packing Acceptance Tests ---");

// Helper to create blank timetable for testing
function makeTestTimetable(divisions = ["SY-A", "SY-B", "TY-A"]) {
    const tt = {};
    divisions.forEach((div) => {
        tt[div] = {};
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((day) => {
            tt[div][day] = [null, null, null, null, null, null];
        });
    });
    return tt;
}

// --- Acceptance Test 1: 4 compatible practical batches ---
console.log("\n  [Acceptance Test 1] 4 compatible practical batches -> all 4 run simultaneously");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "B1", subject: "DSA_LAB", faculty: "Prof. F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B2", subject: "DSA_LAB", faculty: "Prof. F2", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B3", subject: "DSA_LAB", faculty: "Prof. F3", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B4", subject: "DSA_LAB", faculty: "Prof. F4", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2", "LAB3", "LAB4"] }, {});
    const result = packPracticals(tt, batches, collegeOcc, { verbose: false });

    assert(result.packedCount === 4, "Acceptance 1: All 4 batches successfully packed");
    assert(result.unallocatedCount === 0, "Acceptance 1: Zero unallocated batches");

    // Check first valid practical start slot (Monday slot 0 and slot 1)
    const headCell = tt["SY-A"].Monday[0];
    const tailCell = tt["SY-A"].Monday[1];
    assert(headCell && headCell.type === "PRACTICAL" && headCell.span === 2, "Acceptance 1: Head cell span 2");
    assert(tailCell && tailCell.type === "PRACTICAL" && tailCell.span === 0, "Acceptance 1: Tail cell span 0");
    assert(headCell.batchAllocations.length === 4, "Acceptance 1: Exactly 4 batches running in parallel");
    const packedBatches = headCell.batchAllocations.map((b) => b.batch);
    assert(packedBatches.includes("B1") && packedBatches.includes("B2") && packedBatches.includes("B3") && packedBatches.includes("B4"), "Acceptance 1: B1, B2, B3, B4 all present");
}

// --- Acceptance Test 2: One faculty unavailable -> 4 fails, 3 selected ---
console.log("\n  [Acceptance Test 2] One faculty unavailable -> 4 fails, 3 selected");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "B1", subject: "DSA_LAB", faculty: "Prof. F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B2", subject: "DSA_LAB", faculty: "Prof. F2", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B3", subject: "DSA_LAB", faculty: "Prof. F3", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B4", subject: "DSA_LAB", faculty: "Prof. F4_Busy", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    // Prof. F4_Busy is completely blocked on all practical slots
    const facultyAvail = {
        "Prof. F4_Busy": {
            Monday: [0, 1, 2, 3, 4, 5],
            Tuesday: [0, 1, 2, 3, 4, 5],
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    };
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2", "LAB3", "LAB4"] }, facultyAvail);
    const result = packPracticals(tt, batches, collegeOcc, { verbose: false });

    assert(result.packedCount === 3, "Acceptance 2: Exactly 3 batches packed when 1 faculty is unavailable");
    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 3, "Acceptance 2: 3 batches selected in first window");
    const packedBatches = headCell.batchAllocations.map((b) => b.batch);
    assert(packedBatches.includes("B1") && packedBatches.includes("B2") && packedBatches.includes("B3"), "Acceptance 2: B1, B2, B3 running in parallel");
    assert(!packedBatches.includes("B4"), "Acceptance 2: B4 excluded due to unavailable faculty");
}

// --- Acceptance Test 3: Only 2 can fit -> 4 fails, 3 fails, 2 selected ---
console.log("\n  [Acceptance Test 3] Only 2 can fit -> 4 fails, 3 fails, 2 selected");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "B1", subject: "DSA_LAB", faculty: "Prof. F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B2", subject: "DSA_LAB", faculty: "Prof. F2", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B3", subject: "DSA_LAB", faculty: "Prof. F3_Busy", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B4", subject: "DSA_LAB", faculty: "Prof. F4_Busy", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const facultyAvail = {
        "Prof. F3_Busy": { Monday: [0, 1, 2, 3, 4, 5], Tuesday: [0, 1, 2, 3, 4, 5], Wednesday: [0, 1, 2, 3, 4, 5], Thursday: [0, 1, 2, 3, 4, 5], Friday: [0, 1, 2, 3, 4, 5] },
        "Prof. F4_Busy": { Monday: [0, 1, 2, 3, 4, 5], Tuesday: [0, 1, 2, 3, 4, 5], Wednesday: [0, 1, 2, 3, 4, 5], Thursday: [0, 1, 2, 3, 4, 5], Friday: [0, 1, 2, 3, 4, 5] },
    };
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2", "LAB3", "LAB4"] }, facultyAvail);
    const result = packPracticals(tt, batches, collegeOcc, { verbose: false });

    assert(result.packedCount === 2, "Acceptance 3: Exactly 2 batches packed");
    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 2, "Acceptance 3: 2-batch group selected");
    const packedBatches = headCell.batchAllocations.map((b) => b.batch);
    assert(packedBatches.includes("B1") && packedBatches.includes("B2"), "Acceptance 3: B1 and B2 running simultaneously");
}

// --- Acceptance Test 4: Only 1 can fit -> 1 selected ---
console.log("\n  [Acceptance Test 4] Only 1 can fit -> 1 selected");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "B1", subject: "DSA_LAB", faculty: "Prof. F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B2", subject: "DSA_LAB", faculty: "Prof. F2_Busy", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B3", subject: "DSA_LAB", faculty: "Prof. F3_Busy", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B4", subject: "DSA_LAB", faculty: "Prof. F4_Busy", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const facultyAvail = {
        "Prof. F2_Busy": { Monday: [0, 1, 2, 3, 4, 5], Tuesday: [0, 1, 2, 3, 4, 5], Wednesday: [0, 1, 2, 3, 4, 5], Thursday: [0, 1, 2, 3, 4, 5], Friday: [0, 1, 2, 3, 4, 5] },
        "Prof. F3_Busy": { Monday: [0, 1, 2, 3, 4, 5], Tuesday: [0, 1, 2, 3, 4, 5], Wednesday: [0, 1, 2, 3, 4, 5], Thursday: [0, 1, 2, 3, 4, 5], Friday: [0, 1, 2, 3, 4, 5] },
        "Prof. F4_Busy": { Monday: [0, 1, 2, 3, 4, 5], Tuesday: [0, 1, 2, 3, 4, 5], Wednesday: [0, 1, 2, 3, 4, 5], Thursday: [0, 1, 2, 3, 4, 5], Friday: [0, 1, 2, 3, 4, 5] },
    };
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2"] }, facultyAvail);
    const result = packPracticals(tt, batches, collegeOcc, { verbose: false });

    assert(result.packedCount === 1, "Acceptance 4: Exactly 1 batch packed");
    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 1, "Acceptance 4: 1-batch group selected");
    assert(headCell.batchAllocations[0].batch === "B1", "Acceptance 4: Batch B1 placed");
}

// --- Acceptance Test 5: Global session occupies the slot ---
console.log("\n  [Acceptance Test 5] Global session occupies slot -> practical cannot use it, global untouched");
{
    const tt = makeTestTimetable(["SY-A"]);
    // Lock Monday slots 0 & 1 with a Global Session
    tt["SY-A"].Monday[0] = { fixed: true, isGlobal: true, subject: "MILFL_GLOBAL", span: 2, type: "LECTURE", faculty: "FIXED" };
    tt["SY-A"].Monday[1] = { fixed: true, isGlobal: true, subject: "MILFL_GLOBAL", span: 0, type: "LECTURE", faculty: "FIXED" };

    const batches = [
        { year: "SY", division: "A", batch: "B1", subject: "DSA_LAB", faculty: "Prof. F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "B2", subject: "DSA_LAB", faculty: "Prof. F2", type: "PRACTICAL", duration: 2, allocated: false },
    ];

    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2"] }, {});
    collegeOcc.lockGlobalSessions(tt);

    packPracticals(tt, batches, collegeOcc, { verbose: false });

    assert(tt["SY-A"].Monday[0].subject === "MILFL_GLOBAL", "Acceptance 5: Global session remained 100% untouched at slot 0");
    assert(tt["SY-A"].Monday[0].isGlobal === true && tt["SY-A"].Monday[0].fixed === true, "Acceptance 5: Global session remained locked");

    // Practical was placed at next valid practical window: Slot 2
    const pracHead = tt["SY-A"].Monday[2];
    assert(pracHead && pracHead.type === "PRACTICAL" && pracHead.span === 2, "Acceptance 5: Practical placed in slot 2 instead of slot 0");
    assert(pracHead.batchAllocations.length === 2, "Acceptance 5: Both batches placed at slot 2");
}

// --- Acceptance Test 6: Faculty collision detected globally across departments ---
console.log("\n  [Acceptance Test 6] Faculty collision detected globally across departments");
{
    const tt = makeTestTimetable(["SY-A", "TY-B"]);
    // Faculty Prof. Shared is teaching TY-B on Monday slot 0
    tt["TY-B"].Monday[0] = { fixed: false, subject: "TY_SUBJECT", span: 1, type: "LECTURE", faculty: "Prof. Shared" };

    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2"] }, {});
    collegeOcc.markFacultyOccupied("Prof. Shared", "Monday", 0, tt["TY-B"].Monday[0]);
    collegeOcc.markDivisionOccupied("TY-B", "Monday", 0, tt["TY-B"].Monday[0]);

    // Now try to schedule a practical in SY-A with Prof. Shared
    const batches = [
        { year: "SY", division: "A", batch: "B1", subject: "DSA_LAB", faculty: "Prof. Shared", type: "PRACTICAL", duration: 2, allocated: false }
    ];

    // Prof. Shared cannot be at Monday slot 0-1 for SY-A because busy in TY-B!
    packPracticals(tt, batches, collegeOcc, { verbose: false });

    assert(tt["SY-A"].Monday[0] === null, "Acceptance 6: SY-A Monday slot 0 remained empty (faculty clash prevented)");
    // Practical was placed at another window where Prof. Shared is free
    assert(batches[0].allocated === true, "Acceptance 6: Batch placed at a non-conflicting window");
    assert(tt["TY-B"].Monday[0].faculty === "Prof. Shared", "Acceptance 6: TY-B session intact");
}

// --- Acceptance Test 7: CASC scenario with complete 2-hour practical block ---
console.log("\n  [Acceptance Test 7] CASC: course-faculty unchanged, global never moved, practical moves 2-hour atomic");
{
    const tt = makeTestTimetable(["SY-A"]);
    // Slot 0 has a movable practical
    tt["SY-A"].Monday[0] = { type: "PRACTICAL", span: 2, fixed: false, subject: "MOVABLE_LAB", faculty: "Prof. Movable", batchAllocations: [{ batch: "B1", faculty: "Prof. Movable" }] };
    tt["SY-A"].Monday[1] = { type: "PRACTICAL", span: 0, fixed: false, subject: "MOVABLE_LAB", faculty: "Prof. Movable", batchAllocations: [{ batch: "B1", faculty: "Prof. Movable" }] };

    const targetPrac = {
        year: "SY",
        division: "A",
        type: "PRACTICAL",
        subject: "TARGET_LAB",
        faculty: "Prof. TargetPrac",
        allocated: false
    };

    const cascResult = attemptCascadePlacement({
        timetable: tt,
        session: targetPrac,
        facultySchedule: { "Prof. Movable": { Monday: { 0: true, 1: true } } },
        facultyAvailability: {
            "Prof. TargetPrac": { Monday: [2, 3, 4, 5] }, // Only free at slot 0
        },
        config: { MAX_CASCADE_DEPTH: 4 }
    });

    assert(cascResult.success === true, "Acceptance 7: CASC succeeded for 2-hour practical");
    assert(targetPrac.allocated === true, "Acceptance 7: Target practical allocated");
    assert(tt["SY-A"].Monday[0].subject === "TARGET_LAB", "Acceptance 7: Target practical placed at slot 0");
    assert(tt["SY-A"].Monday[0].faculty === "Prof. TargetPrac", "Acceptance 7: Course-faculty binding preserved");
    assert(tt["SY-A"].Monday[0].span === 2 && tt["SY-A"].Monday[1].span === 0, "Acceptance 7: Target practical span 2 and span 0 intact");
    assert(tt["SY-A"].Monday[2].subject === "MOVABLE_LAB", "Acceptance 7: Movable practical relocated to valid start slot 2");
    assert(tt["SY-A"].Monday[2].span === 2 && tt["SY-A"].Monday[3].span === 0, "Acceptance 7: Movable practical atomic 2-hour block preserved");
}

// ============================================================
// TEST SUITE 9: ATLAS Final Multi-Course Practical Stacking Acceptance Tests
// ============================================================
console.log("\n--- TEST SUITE 9: Final Multi-Course Practical Stacking Acceptance Tests ---");

// --- TEST A: 4 practicals across 4 different courses -> 4-stack ---
console.log("\n  [Acceptance Test A] COA-S2 / YSL, CP-S3 / ASD, DSA-S4 / PSP, OS-S1 / VAK -> 4-stack");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "S2", subject: "COA", faculty: "YSL", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "CP", faculty: "ASD", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S4", subject: "DSA", faculty: "PSP", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S1", subject: "OS", faculty: "VAK", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["DBL", "PRL", "ASL", "ML"] }, {});
    const result = packPracticals(tt, batches, collegeOcc, { verbose: true });

    assert(result.packedCount === 4, "Test A: All 4 practicals packed across 4 different courses");
    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 4, "Test A: Head cell has exactly 4 batch allocations");
    const subjects = headCell.batchAllocations.map((b) => b.subject);
    assert(subjects.includes("COA") && subjects.includes("CP") && subjects.includes("DSA") && subjects.includes("OS"), "Test A: Contains all 4 distinct courses COA, CP, DSA, OS");
    const faculties = headCell.batchAllocations.map((b) => b.faculty);
    assert(faculties.includes("YSL") && faculties.includes("ASD") && faculties.includes("PSP") && faculties.includes("VAK"), "Test A: Contains all 4 distinct faculties YSL, ASD, PSP, VAK");

    // Verify debug logs format
    const logStr = result.packingLogs.join("\n");
    assert(logStr.includes("[PracticalStacking]"), "Test A: Log contains [PracticalStacking]");
    assert(logStr.includes("Stack size:\n4"), "Test A: Log contains Stack size: 4");
    assert(logStr.includes("Courses:\nCOA / CP / DSA / OS") || logStr.includes("COA") && logStr.includes("OS"), "Test A: Log lists distinct courses");
    assert(logStr.includes("MAXIMUM VALID STACK"), "Test A: Log contains MAXIMUM VALID STACK");
}

// --- TEST B: Duplicate faculty YSL -> 4-stack impossible -> Try 3-stack ---
console.log("\n  [Acceptance Test B] COA-S2 / YSL, CP-S3 / ASD, DSA-S4 / YSL, OS-S1 / VAK -> 4 fails (YSL repeats), 3-stack");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "S2", subject: "COA", faculty: "YSL", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "CP", faculty: "ASD", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S4", subject: "DSA", faculty: "YSL", type: "PRACTICAL", duration: 2, allocated: false }, // Duplicate YSL
        { year: "SY", division: "A", batch: "S1", subject: "OS", faculty: "VAK", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2", "LAB3", "LAB4"] }, {});
    const result = packPracticals(tt, batches, collegeOcc, { verbose: true });

    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 3, "Test B: Exactly 3 practicals selected in first window");
    const logStr = result.packingLogs.join("\n");
    assert(logStr.includes("4-stack:\nFAILED"), "Test B: Log indicates 4-stack FAILED");
    assert(logStr.includes("FACULTY_CONFLICT"), "Test B: Rejection reason mentions FACULTY_CONFLICT");
    assert(logStr.includes("Trying:\n3-stack"), "Test B: Log indicates fallback to 3-stack");
}

// --- TEST C: Batch conflict S2 repeats -> scheduler avoids conflict and finds alternate 4-stack ---
console.log("\n  [Acceptance Test C] COA-S2 / YSL, CP-S2 / ASD, DSA-S4 / PSP, OS-S1 / VAK, SE-S3 / KRM -> avoids batch clash, finds 4-stack");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "S2", subject: "COA", faculty: "YSL", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S2", subject: "CP", faculty: "ASD", type: "PRACTICAL", duration: 2, allocated: false }, // Duplicate S2
        { year: "SY", division: "A", batch: "S4", subject: "DSA", faculty: "PSP", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S1", subject: "OS", faculty: "VAK", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "SE", faculty: "KRM", type: "PRACTICAL", duration: 2, allocated: false }, // Compatible 4th
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2", "LAB3", "LAB4"] }, {});
    const result = packPracticals(tt, batches, collegeOcc, { verbose: true });

    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 4, "Test C: Valid 4-stack formed by avoiding duplicate batch");
    const allocatedBatches = headCell.batchAllocations.map((b) => b.batch);
    const uniqueBatches = new Set(allocatedBatches);
    assert(uniqueBatches.size === 4, "Test C: All 4 batches in stack are mutually distinct");
    assert(uniqueBatches.has("S1") && uniqueBatches.has("S3") && uniqueBatches.has("S4") && uniqueBatches.has("S2"), "Test C: Contains S1, S2, S3, S4");
}

// --- TEST D: Only two mutually compatible practicals exist -> 2-stack ---
console.log("\n  [Acceptance Test D] Only two mutually compatible practicals exist -> 2-stack");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "S2", subject: "COA", faculty: "YSL", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "CP", faculty: "ASD", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2"] }, {});
    const result = packPracticals(tt, batches, collegeOcc, { verbose: true });

    assert(result.packedCount === 2, "Test D: Exactly 2 practicals packed");
    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 2, "Test D: Stack size is 2");
}

// --- TEST E: Only one practical can fit -> 1-stack ---
console.log("\n  [Acceptance Test E] Only one practical can fit -> 1-stack");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        { year: "SY", division: "A", batch: "S2", subject: "COA", faculty: "YSL", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1"] }, {});
    const result = packPracticals(tt, batches, collegeOcc, { verbose: true });

    assert(result.packedCount === 1, "Test E: Exactly 1 practical packed");
    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 1, "Test E: Stack size is 1");
    assert(headCell.batchAllocations[0].batch === "S2", "Test E: Placed batch is S2");
}

// --- TEST F: Cross-Course Preference (Section 11) ---
console.log("\n  [Acceptance Test F] Cross-Course Preference: 4 different courses preferred over 4 same-course practicals");
{
    const tt = makeTestTimetable(["SY-A"]);
    const batches = [
        // Same course (COA x 4)
        { year: "SY", division: "A", batch: "S1", subject: "COA", faculty: "F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S2", subject: "COA", faculty: "F2", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "COA", faculty: "F3", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S4", subject: "COA", faculty: "F4", type: "PRACTICAL", duration: 2, allocated: false },
        // Different courses (CP, DSA, OS, SE)
        { year: "SY", division: "A", batch: "S1", subject: "CP", faculty: "F5", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S2", subject: "DSA", faculty: "F6", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "OS", faculty: "F7", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S4", subject: "SE", faculty: "F8", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] }, {});
    packPracticals(tt, batches, collegeOcc, { verbose: true });

    const headCell = tt["SY-A"].Monday[0];
    assert(headCell && headCell.batchAllocations.length === 4, "Test F: 4-stack selected");
    const subjectsInStack = new Set(headCell.batchAllocations.map((b) => b.subject));
    assert(subjectsInStack.size === 4, "Test F: Stack with 4 distinct courses was chosen over same-course stack (diversity = 4 > 1)");
}

// --- TEST G: Scarcity Priority within Same Stack Size (Section 10) ---
console.log("\n  [Acceptance Test G] Constrained faculty prioritized when stack sizes and diversity are equal");
{
    const tt = makeTestTimetable(["SY-A"]);
    // Stack A: YSL is constrained (only available on Monday slot 0)
    // Stack B: VAK is unconstrained (available all week)
    const batches = [
        { year: "SY", division: "A", batch: "S1", subject: "COA", faculty: "YSL_Constrained", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S2", subject: "CP", faculty: "ASD", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S1", subject: "OS", faculty: "VAK_Unconstrained", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S2", subject: "DSA", faculty: "PSP", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    // Block YSL on all days except Monday slot 0
    const facultyAvail = {
        "YSL_Constrained": {
            Monday: [2, 3, 4, 5],
            Tuesday: [0, 1, 2, 3, 4, 5],
            Wednesday: [0, 1, 2, 3, 4, 5],
            Thursday: [0, 1, 2, 3, 4, 5],
            Friday: [0, 1, 2, 3, 4, 5],
        }
    };
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2"] }, facultyAvail);
    packPracticals(tt, batches, collegeOcc, { verbose: true });

    const headCell = tt["SY-A"].Monday[0];
    const facultiesInStack = headCell.batchAllocations.map((b) => b.faculty);
    assert(facultiesInStack.includes("YSL_Constrained"), "Test G: Stack containing more constrained faculty YSL_Constrained was selected first");
}

// --- TEST H: Absolute Stack Size Priority (Section 10) ---
console.log("\n  [Acceptance Test H] 4-stack is ALWAYS chosen over 3-stack (stack size priority is absolute)");
{
    const tt = makeTestTimetable(["SY-A"]);
    // Option of a 4-stack vs option of a 3-stack
    const batches = [
        { year: "SY", division: "A", batch: "S1", subject: "COA", faculty: "F1", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S2", subject: "CP", faculty: "F2", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S3", subject: "DSA", faculty: "F3", type: "PRACTICAL", duration: 2, allocated: false },
        { year: "SY", division: "A", batch: "S4", subject: "OS", faculty: "F4", type: "PRACTICAL", duration: 2, allocated: false },
    ];
    const collegeOcc = new CollegeOccupancy(tt, { labs: ["LAB1", "LAB2", "LAB3", "LAB4"] }, {});
    packPracticals(tt, batches, collegeOcc, { verbose: true });

    const headCell = tt["SY-A"].Monday[0];
    assert(headCell.batchAllocations.length === 4, "Test H: Scheduler strictly formed a 4-stack rather than any smaller stack");
}

console.log("\n============================================================");
console.log("ALGORITHM DIAGNOSTIC SUMMARY");
console.log("============================================================");
console.log("DAPS Report:");
console.log(`  - Total sessions prioritized: ${genResult.dapsReport.totalSessions}`);
console.log(`  - High constraint sessions: ${genResult.dapsReport.highPriorityCount}`);
console.log(`  - Average priority score: ${genResult.dapsReport.avgPriority}`);
console.log("RCAA Report:");
console.log(`  - Resource warnings: ${genResult.rcaaReport.warnings.length}`);
console.log(`  - Critical shortages: ${genResult.rcaaReport.summary.criticalWarnings}`);
console.log(`  - Unresolved allocations: ${genResult.rcaaReport.summary.unresolvedCount}`);
console.log("CASC Report:");
console.log(`  - Total cascade attempts: ${genResult.cascReport.totalAttempts}`);
console.log(`  - Successful cascades: ${genResult.cascReport.successfulCascades}`);
console.log(`  - Sessions moved via cascades: ${genResult.cascReport.totalSessionsMoved}`);

console.log("\n============================================================");
console.log(`FINAL RESULT: ${passedTests}/${totalTests} tests passed, ${failedTests} failed.`);
console.log("============================================================");

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
