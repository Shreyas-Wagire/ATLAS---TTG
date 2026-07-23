/**
 * computeValidationScore.js
 * Computes a 0-100 Final Validation Score for the generated timetable.
 *
 * Scoring:
 *   +60  — 100% sessions allocated (lectures + tutorials + practicals)
 *   +20  — 0 faculty clashes
 *   +10  — 0 resource clashes (room, lab, tutorial room)
 *   +10  — 0 practical break violations
 *
 * Partial credit is given proportionally for each category.
 */
export function computeValidationScore(report, conflictReport) {
    const { summary: allocSummary, facultyConflicts } = report || {};
    const { summary: conflictSummary } = conflictReport || {};

    // --- SCORE CATEGORY 1: Allocation Completeness (60 pts) ---
    const lectureReq = allocSummary?.lecture?.required || 0;
    const lectureAlloc = allocSummary?.lecture?.allocated || 0;
    const tutorialReq = allocSummary?.tutorial?.required || 0;
    const tutorialAlloc = allocSummary?.tutorial?.allocated || 0;
    const practicalReq = allocSummary?.practical?.required || 0;
    const practicalAlloc = allocSummary?.practical?.allocated || 0;

    const totalRequired = lectureReq + tutorialReq + practicalReq;
    const totalAllocated = lectureAlloc + tutorialAlloc + practicalAlloc;
    const allocationRate = totalRequired > 0 ? totalAllocated / totalRequired : 1;
    const allocationScore = Math.round(allocationRate * 60);

    // --- SCORE CATEGORY 2: Faculty Conflict Free (20 pts) ---
    const facultyClashCount = (facultyConflicts || []).length + (conflictSummary?.FACULTY_CLASH || 0);
    const facultyScore = facultyClashCount === 0 ? 20 : Math.max(0, 20 - facultyClashCount * 4);

    // --- SCORE CATEGORY 3: Resource Conflict Free (10 pts) ---
    const resourceClashes =
        (conflictSummary?.ROOM_CLASH || 0) +
        (conflictSummary?.LAB_CLASH || 0) +
        (conflictSummary?.TUTORIAL_ROOM_CLASH || 0) +
        (conflictSummary?.RESOURCE_CLASH || 0);
    const resourceScore = resourceClashes === 0 ? 10 : Math.max(0, 10 - resourceClashes * 2);

    // --- SCORE CATEGORY 4: Practical Break Violation Free (10 pts) ---
    const breakViolations = conflictSummary?.PRACTICAL_BREAK_VIOLATION || 0;
    const breakScore = breakViolations === 0 ? 10 : Math.max(0, 10 - breakViolations * 3);

    const totalScore = allocationScore + facultyScore + resourceScore + breakScore;

    const grade =
        totalScore >= 95 ? "A+" :
        totalScore >= 85 ? "A" :
        totalScore >= 75 ? "B" :
        totalScore >= 60 ? "C" :
        "D";

    return {
        totalScore,
        grade,
        breakdown: {
            allocation: { score: allocationScore, maxScore: 60, rate: Math.round(allocationRate * 100) },
            facultyClash: { score: facultyScore, maxScore: 20, clashes: facultyClashCount },
            resourceClash: { score: resourceScore, maxScore: 10, clashes: resourceClashes },
            breakViolation: { score: breakScore, maxScore: 10, violations: breakViolations },
        },
    };
}
