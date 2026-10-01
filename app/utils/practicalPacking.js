/**
 * practicalPacking.js — Maximum Parallel Practical Stacking for ATLAS
 *
 * Implements PRIORITY 2: PRACTICAL / BATCH SESSIONS
 *
 * PRIMARY OBJECTIVE: MAXIMIZE PARALLEL PRACTICAL STACKING ACROSS DIFFERENT COURSES
 *
 * Stack Priority:
 *    4 practicals
 *       ↓
 *    3 practicals
 *       ↓
 *    2 practicals
 *       ↓
 *    1 practical
 *
 * ABSOLUTE INVARIANTS:
 * - Practicals from DIFFERENT COURSES can and should be stacked in the same 2-hour slot.
 * - Course name alone is NEVER a conflict (cross-course stacking is preferred).
 * - Primary hard conflicts:
 *     FACULTY_CONFLICT        → Same faculty cannot be in the same stack or busy elsewhere.
 *     BATCH_CONFLICT          → Same batch cannot appear twice in the same window.
 *     RESOURCE_CONFLICT       → Each practical must have its own distinct, available lab.
 *     GLOBAL_SESSION_CONFLICT → Global / fixed sessions remain completely immutable.
 * - Stack size priority is ABSOLUTE (4 → 3 → 2 → 1). Never reduce 4 to 3 for scarcity.
 * - When multiple valid stacks have the SAME SIZE:
 *     1. Prefer the stack containing more DIFFERENT COURSES (cross-course preference).
 *     2. Tie-break using DAPS / RCAA faculty & batch scarcity (constrained faculty first).
 * - Atomic transaction commit.
 * - Structured logging [PracticalStacking].
 */

import { isRealFaculty } from "./collegeOccupancy.js";

const VALID_PRACTICAL_STARTS = [0, 2, 4];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Generate combinations of an array of items of a given size k.
 */
export function getCombinations(arr, k) {
    if (k === 1) return arr.map((item) => [item]);
    if (k === arr.length) return [arr];
    if (k > arr.length) return [];

    const result = [];
    for (let i = 0; i <= arr.length - k; i++) {
        const head = arr[i];
        const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
        for (const tail of tailCombos) {
            result.push([head, ...tail]);
        }
    }
    return result;
}

/**
 * Resolve division key for a session matching the master timetable keys.
 */
export function getDivisionKeyForSession(session, timetable = {}) {
    if (session.year && session.division) {
        const fullKey = `${session.year}-${session.division}`;
        if (timetable[fullKey]) return fullKey;
    }
    if (session.division) {
        if (timetable[session.division]) return session.division;
        const matchingKey = Object.keys(timetable).find((k) => k.endsWith(`-${session.division}`));
        if (matchingKey) return matchingKey;
    }
    const keys = Object.keys(timetable);
    if (keys.length === 1) return keys[0];
    return session.year && session.division ? `${session.year}-${session.division}` : (keys[0] || "DIV_DEFAULT");
}

/**
 * Calculate course diversity (number of distinct courses) in a candidate group.
 */
export function getCourseDiversity(combo) {
    const courses = new Set();
    for (const session of combo) {
        const course = session.subject || session.subjectName || session.courseCode || "COURSE";
        courses.add(String(course).trim().toUpperCase());
    }
    return courses.size;
}

/**
 * Calculate scarcity score for a candidate group.
 * Lower remaining windows = higher scarcity weight (more constrained).
 */
export function getComboScarcityScore(combo, collegeOccupancy, divKey) {
    let score = 0;
    for (const s of combo) {
        const facScarcity = collegeOccupancy.calculateFacultyPracticalScarcity(s.faculty);
        const facWeight = Math.max(0, 15 - facScarcity);

        const batchScarcity = collegeOccupancy.calculateBatchPracticalScarcity(s.batch, divKey);
        const batchWeight = Math.max(0, 15 - batchScarcity);

        const priorityBonus = s.priorityScore || 0;
        score += facWeight * 10 + batchWeight * 2 + priorityBonus;
    }
    return score;
}

/**
 * Verify whether a candidate group of practical sessions can be scheduled together
 * in the given (day, slot) window.
 *
 * Checks primary hard conflicts:
 * - FACULTY_CONFLICT: Duplicate faculty within stack or faculty busy in college
 * - BATCH_CONFLICT: Duplicate batch within stack or batch busy / daily limit reached
 * - RESOURCE_CONFLICT: Required lab busy or insufficient available labs
 * - GLOBAL_SESSION_CONFLICT: Division slot blocked by immutable global session
 *
 * Returns { valid: boolean, assignedLabs: string[], conflictType: string|null, reason: string|null }
 */
export function validateCandidateGroup(group, day, slot, collegeOccupancy, divKey) {
    // 0. Global / Division check
    if (divKey && !collegeOccupancy.isDivisionFreeForPractical(divKey, day, slot)) {
        return {
            valid: false,
            assignedLabs: [],
            conflictType: "GLOBAL_SESSION_CONFLICT",
            reason: `Slot blocked by global or fixed reservation in ${divKey}`,
        };
    }

    // 1. Batch conflict check: All batches must be distinct and free
    const batches = new Set();
    for (const session of group) {
        if (!session.batch) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Session ${session.subject} has no batch identifier`,
            };
        }
        if (batches.has(session.batch)) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Duplicate batch ${session.batch} in parallel stack`,
            };
        }
        batches.add(session.batch);

        if (!collegeOccupancy.isBatchFreeForPractical(session.batch, day, slot)) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Batch ${session.batch} already occupied at ${day} L${slot + 1}-L${slot + 2}`,
            };
        }

        if (collegeOccupancy.getBatchDailyPracticalCount(session.batch, day) >= 2) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Batch ${session.batch} reached maximum daily practical limit (2) on ${day}`,
            };
        }
    }

    // 2. Faculty conflict check: All real faculties must be distinct and free
    const faculties = new Set();
    for (const session of group) {
        if (isRealFaculty(session.faculty)) {
            if (faculties.has(session.faculty)) {
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "FACULTY_CONFLICT",
                    reason: `Duplicate faculty ${session.faculty} in parallel stack`,
                };
            }
            faculties.add(session.faculty);

            if (!collegeOccupancy.isFacultyFreeForPractical(session.faculty, day, slot)) {
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "FACULTY_CONFLICT",
                    reason: `Faculty ${session.faculty} is busy elsewhere at ${day} L${slot + 1}-L${slot + 2}`,
                };
            }
        }
    }

    // 3. Resource / Lab conflict check: Each practical must have its own valid available lab
    const availableLabs = collegeOccupancy.getAvailableLabsForPractical(day, slot);
    const assignedLabs = [];
    const usedLabs = new Set();

    for (const session of group) {
        if (session.location && session.location !== "TBD" && session.location !== "FIXED") {
            const locNorm = String(session.location).toUpperCase().trim();
            if (usedLabs.has(locNorm) || !collegeOccupancy.isLabFreeForPractical(session.location, day, slot)) {
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "RESOURCE_CONFLICT",
                    reason: `Required lab ${session.location} unavailable for batch ${session.batch}`,
                };
            }
            usedLabs.add(locNorm);
            assignedLabs.push(session.location);
        } else {
            const labChoice = availableLabs.find((l) => !usedLabs.has(String(l).toUpperCase().trim()));
            if (!labChoice) {
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "RESOURCE_CONFLICT",
                    reason: `Insufficient available labs for batch ${session.batch} (need ${group.length})`,
                };
            }
            usedLabs.add(String(labChoice).toUpperCase().trim());
            assignedLabs.push(labChoice);
        }
    }

    return { valid: true, assignedLabs, conflictType: null, reason: null };
}

/**
 * Search for the best practical stack in a given window:
 * Absolute Priority: 4 → 3 → 2 → 1
 * Tie-breaker:
 *   1. Cross-course diversity (prefer more different courses)
 *   2. DAPS / RCAA faculty and batch scarcity (constrained faculty first)
 */
export function findBestPracticalStack(validCandidates, day, slot, collegeOccupancy, divKey, options = {}) {
    const maxTargetSize = Math.min(4, validCandidates.length);
    let selectedStack = null;
    let selectedAssignedLabs = null;
    const searchLogs = [];
    let totalCombosChecked = 0;

    for (let targetSize = maxTargetSize; targetSize >= 1; targetSize--) {
        searchLogs.push(`Trying stack size:`);
        searchLogs.push(`${targetSize}`);
        searchLogs.push(``);

        // Limit candidate subset to top 20 scarcity-sorted candidates if pool is very large
        const candidateSubset = validCandidates.length > 20 ? validCandidates.slice(0, 20) : validCandidates;
        const combos = getCombinations(candidateSubset, targetSize);
        totalCombosChecked += combos.length;

        const validCombos = [];
        const conflictReasons = new Set();

        for (const combo of combos) {
            const validation = validateCandidateGroup(combo, day, slot, collegeOccupancy, divKey);
            if (validation.valid) {
                validCombos.push({
                    combo,
                    assignedLabs: validation.assignedLabs,
                    diversity: getCourseDiversity(combo),
                    scarcity: getComboScarcityScore(combo, collegeOccupancy, divKey),
                });
            } else {
                if (validation.conflictType) {
                    conflictReasons.add(validation.conflictType);
                }
            }
        }

        if (validCombos.length > 0) {
            // Rank valid combos:
            // 1. Cross-course diversity DESCENDING (prefer more different courses)
            // 2. Scarcity score DESCENDING (constrained faculty first)
            validCombos.sort((a, b) => {
                if (a.diversity !== b.diversity) return b.diversity - a.diversity;
                return b.scarcity - a.scarcity;
            });

            selectedStack = validCombos[0].combo;
            selectedAssignedLabs = validCombos[0].assignedLabs;
            break; // Found largest valid stack! 4 -> 3 -> 2 -> 1 is absolute!
        } else {
            // This stack size failed
            searchLogs.push(`${targetSize}-stack:`);
            searchLogs.push(`FAILED`);
            searchLogs.push(``);
            searchLogs.push(`Reason:`);
            searchLogs.push(`Candidate combinations contain:`);
            if (conflictReasons.size > 0) {
                Array.from(conflictReasons).forEach((r) => searchLogs.push(`- ${r}`));
            } else {
                searchLogs.push(`- NO_COMPATIBLE_COMBINATION`);
            }
            searchLogs.push(``);
            if (targetSize > 1) {
                searchLogs.push(`Trying:`);
                searchLogs.push(`${targetSize - 1}-stack`);
                searchLogs.push(``);
            }
        }
    }

    if (selectedStack) {
        searchLogs.push(`Candidate combinations checked:`);
        searchLogs.push(`${totalCombosChecked}`);
        searchLogs.push(``);
        searchLogs.push(`Selected stack:`);
        selectedStack.forEach((s) => {
            searchLogs.push(`${s.subject}-${s.batch}`);
        });
        searchLogs.push(``);
        searchLogs.push(`Stack size:`);
        searchLogs.push(`${selectedStack.length}`);
        searchLogs.push(``);
        searchLogs.push(`Courses:`);
        searchLogs.push(selectedStack.map((s) => s.subject).join(" / "));
        searchLogs.push(``);
        searchLogs.push(`Faculty:`);
        searchLogs.push(selectedStack.map((s) => s.faculty).join(" / "));
        searchLogs.push(``);
        searchLogs.push(`Result:`);
        searchLogs.push(`MAXIMUM VALID STACK`);
    } else {
        searchLogs.push(`Result:`);
        searchLogs.push(`NO VALID STACK`);
    }

    return {
        selectedStack,
        selectedAssignedLabs,
        searchLogs,
        totalCombosChecked,
    };
}

/**
 * Perform Maximum Parallel Practical Stacking for all practical sessions across the college.
 *
 * Follows the FINAL PRACTICAL STACKING RULE:
 * 1. Collect ALL currently unscheduled practical batches across all courses.
 * 2. Filter candidates for the window.
 * 3. Sort candidates by scarcity.
 * 4. Priority: 4 → 3 → 2 → 1.
 * 5. Commit atomically and update global occupancy.
 *
 * @param {Object} timetable - Master college timetable
 * @param {Array} sessionPool - All sessions pool
 * @param {CollegeOccupancy} collegeOccupancy - Authoritative college-wide occupancy
 * @param {Object} [options] - Configuration / logger options
 * @returns {{ packedCount: number, unallocatedCount: number, packingLogs: string[] }}
 */
export function packPracticals(timetable, sessionPool, collegeOccupancy, options = {}) {
    const verbose = options.verbose ?? true;
    const printLogs = options.printLogs ?? false;
    const packingLogs = [];

    function log(msg) {
        packingLogs.push(msg);
        if (verbose && printLogs) {
            console.log(msg);
        }
    }

    // Collect all unscheduled practical sessions
    const practicalSessions = sessionPool.filter((s) => s.type === "PRACTICAL" && !s.allocated);
    if (practicalSessions.length === 0) {
        return { packedCount: 0, unallocatedCount: 0, packingLogs };
    }

    // Map practical sessions by division key
    const divisionPracticalMap = {};
    practicalSessions.forEach((s) => {
        const divKey = getDivisionKeyForSession(s, timetable);
        if (!divisionPracticalMap[divKey]) divisionPracticalMap[divKey] = [];
        divisionPracticalMap[divKey].push(s);
    });

    const divisionKeys = Object.keys(divisionPracticalMap);

    // Build staggered window ordering across valid 2-hour practical windows (Slots [0, 2, 4])
    const windowOrder = [];
    DAYS.forEach((day, dayIdx) => {
        VALID_PRACTICAL_STARTS.forEach((slot) => {
            windowOrder.push({ day, slot, dayIdx });
        });
    });

    // Iterate through all practical windows
    windowOrder.forEach(({ day, slot }) => {
        // Prioritize divisions with more unallocated sessions
        const sortedDivKeys = [...divisionKeys].sort((a, b) => {
            const unallocA = divisionPracticalMap[a].filter((s) => !s.allocated).length;
            const unallocB = divisionPracticalMap[b].filter((s) => !s.allocated).length;
            return unallocB - unallocA;
        });

        sortedDivKeys.forEach((divKey) => {
            const unallocatedInDiv = divisionPracticalMap[divKey].filter((s) => !s.allocated);
            if (unallocatedInDiv.length === 0) return;

            // Check if division window is free
            if (!collegeOccupancy.isDivisionFreeForPractical(divKey, day, slot)) {
                return;
            }

            // STEP 1: Collect candidates for this window across ALL courses
            const candidates = unallocatedInDiv;

            // STEP 2: Filter candidates that individually cannot use the window
            const validCandidates = candidates.filter((session) => {
                if (!collegeOccupancy.isFacultyFreeForPractical(session.faculty, day, slot)) {
                    return false;
                }
                if (!collegeOccupancy.isBatchFreeForPractical(session.batch, day, slot)) {
                    return false;
                }
                if (collegeOccupancy.getBatchDailyPracticalCount(session.batch, day) >= 2) {
                    return false;
                }
                if (session.location && session.location !== "TBD" && session.location !== "FIXED") {
                    if (!collegeOccupancy.isLabFreeForPractical(session.location, day, slot)) {
                        return false;
                    }
                }
                return true;
            });

            if (validCandidates.length === 0) return;

            // STEP 3: Sort valid candidates by scarcity
            validCandidates.sort((a, b) => {
                const facScarcityA = collegeOccupancy.calculateFacultyPracticalScarcity(a.faculty);
                const facScarcityB = collegeOccupancy.calculateFacultyPracticalScarcity(b.faculty);
                if (facScarcityA !== facScarcityB) return facScarcityA - facScarcityB;

                const batchScarcityA = collegeOccupancy.calculateBatchPracticalScarcity(a.batch, divKey);
                const batchScarcityB = collegeOccupancy.calculateBatchPracticalScarcity(b.batch, divKey);
                if (batchScarcityA !== batchScarcityB) return batchScarcityA - batchScarcityB;

                const pA = a.priorityScore || 0;
                const pB = b.priorityScore || 0;
                return pB - pA;
            });

            // STEP 4: Maximum Parallel Practical Stacking: 4 → 3 → 2 → 1 with cross-course preference
            const stackResult = findBestPracticalStack(
                validCandidates,
                day,
                slot,
                collegeOccupancy,
                divKey,
                options
            );

            // Record debug log
            const logHeader = [
                `[PracticalStacking]`,
                ``,
                `Window:`,
                `${day} L${slot + 1}-L${slot + 2}`,
                ``,
                `Total candidates:`,
                `${candidates.length}`,
                ``,
            ];
            const fullLog = [...logHeader, ...stackResult.searchLogs].join("\n");
            log(fullLog);

            // STEP 5: Commit atomically
            if (stackResult.selectedStack && stackResult.selectedAssignedLabs) {
                collegeOccupancy.commitPracticalGroup(
                    divKey,
                    day,
                    slot,
                    stackResult.selectedStack,
                    stackResult.selectedAssignedLabs
                );
            }
        });
    });

    const remainingUnallocated = practicalSessions.filter((s) => !s.allocated);
    const packedCount = practicalSessions.length - remainingUnallocated.length;

    return {
        packedCount,
        unallocatedCount: remainingUnallocated.length,
        packingLogs,
    };
}

