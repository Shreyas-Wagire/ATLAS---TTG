/**
 * buildFacultyOccupancy.js
 *
 * Builds an in-memory faculty occupancy map and daily statistics
 * from a generated timetable. This structure is TEMPORARY — it is
 * used only during the timetable optimization phase and is never
 * persisted to any database or storage.
 *
 * Output shapes:
 *
 * facultyOccupancy = {
 *   "Prof A": {
 *     Monday: {
 *       "09:15-10:15": session | null,
 *       "10:15-11:15": session | null,
 *       ...
 *     }
 *   }
 * }
 *
 * facultyStats = {
 *   "Prof A": {
 *     Monday: {
 *       totalHours: 3,
 *       lectures: 2,
 *       practicals: 0,
 *       tutorials: 1,
 *       consecutiveHours: 2,
 *       freeSlots: ["10:15-11:15"],
 *       idleGaps: 1
 *     }
 *   }
 * }
 */

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** Canonical slot index → time label mapping (matches generateConflictReport.js) */
export const SLOT_TIMES = [
    "09:15-10:15",
    "10:15-11:15",
    "11:30-12:30",
    "12:30-01:30",
    "02:15-03:15",
    "03:15-04:15",
];

/** How many timetable hours each session type occupies */
export const SESSION_HOURS = { LECTURE: 1, TUTORIAL: 1, PRACTICAL: 2 };

/** Hard constraint thresholds */
export const MAX_DAILY_HOURS = 5;
export const MAX_CONSECUTIVE_LECTURES = 3;

const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);

function isRealFaculty(faculty) {
    return faculty && !GHOST_FACULTIES.has(String(faculty).trim());
}

/**
 * Registers a session into the occupancy map for a given faculty.
 * For PRACTICAL sessions (span:2), both slots (slotIdx and slotIdx+1) are registered
 * but only the head (span:2) cell is stored — the tail (span:0) stores a reference sentinel.
 */
function registerInOccupancy(occupancy, faculty, day, slotIdx, sessionRef) {
    if (!isRealFaculty(faculty)) return;
    if (!occupancy[faculty]) occupancy[faculty] = {};
    if (!occupancy[faculty][day]) {
        // Initialise all slots to null
        occupancy[faculty][day] = {};
        SLOT_TIMES.forEach((t) => { occupancy[faculty][day][t] = null; });
    }
    const timeLabel = SLOT_TIMES[slotIdx];
    if (!timeLabel) return;
    occupancy[faculty][day][timeLabel] = sessionRef;
}

/**
 * buildFacultyOccupancy
 *
 * Scans the timetable and returns:
 *   { occupancy, stats }
 *
 * @param {Object} timetable  - The generated timetable object
 * @returns {{ occupancy: Object, stats: Object }}
 */
export function buildFacultyOccupancy(timetable) {
    /** facultyOccupancy: faculty → day → slotLabel → session | null */
    const occupancy = {};

    /** facultyStats: faculty → day → stats */
    const stats = {};

    // ── Step 1: Scan every cell and populate the occupancy map ──────────
    Object.entries(timetable || {}).forEach(([divisionKey, daysMap]) => {
        DAYS.forEach((day) => {
            const slots = daysMap?.[day] || [];
            slots.forEach((cell, slotIdx) => {
                if (!cell) return;
                // Skip continuation (span:0) slots — already registered via the head
                if (cell.span === 0) return;

                const type = cell.type;
                if (!type) return;

                // Build a normalised session reference for occupancy
                const baseSession = {
                    type,
                    subject: cell.subject || cell.subjectName || "",
                    divisionKey,
                    day,
                    slotIdx,
                    span: cell.span ?? 1,
                    fixed: cell.fixed ?? false,
                    location: cell.location || null,
                };

                if ((type === "PRACTICAL" || type === "TUTORIAL") && cell.batchAllocations?.length) {
                    const seenFaculties = new Set();
                    cell.batchAllocations.forEach((alloc) => {
                        const faculty = alloc.faculty;
                        if (!isRealFaculty(faculty) || seenFaculties.has(faculty)) return;
                        seenFaculties.add(faculty);

                        const sessionRef = {
                            ...baseSession,
                            faculty,
                            batch: alloc.batch,
                            batchAllocations: cell.batchAllocations,
                        };

                        registerInOccupancy(occupancy, faculty, day, slotIdx, sessionRef);
                        // For PRACTICAL, also mark the continuation slot
                        if (type === "PRACTICAL" && slotIdx + 1 < SLOT_TIMES.length) {
                            registerInOccupancy(occupancy, faculty, day, slotIdx + 1, { ...sessionRef, isContinuation: true });
                        }
                    });
                } else {
                    const faculty = cell.faculty;
                    if (!isRealFaculty(faculty)) return;

                    const sessionRef = {
                        ...baseSession,
                        faculty,
                        batch: cell.batch || null,
                        batchAllocations: null,
                    };

                    registerInOccupancy(occupancy, faculty, day, slotIdx, sessionRef);
                    if (type === "PRACTICAL" && slotIdx + 1 < SLOT_TIMES.length) {
                        registerInOccupancy(occupancy, faculty, day, slotIdx + 1, { ...sessionRef, isContinuation: true });
                    }
                }
            });
        });
    });

    // ── Step 2: Compute daily stats for every faculty ────────────────────
    Object.entries(occupancy).forEach(([faculty, dayMap]) => {
        if (!stats[faculty]) stats[faculty] = {};

        DAYS.forEach((day) => {
            const daySlots = dayMap[day];
            if (!daySlots) {
                stats[faculty][day] = {
                    totalHours: 0,
                    lectures: 0,
                    practicals: 0,
                    tutorials: 0,
                    consecutiveHours: 0,
                    freeSlots: [...SLOT_TIMES],
                    idleGaps: 0,
                };
                return;
            }

            let totalHours = 0;
            let lectures = 0;
            let practicals = 0;
            let tutorials = 0;
            const freeSlots = [];
            let maxConsecutive = 0;
            let currentStreak = 0;
            let idleGaps = 0;
            let teachingStarted = false;
            let pendingGaps = 0;

            SLOT_TIMES.forEach((timeLabel, idx) => {
                const session = daySlots[timeLabel];
                if (!session || session.isContinuation) {
                    // Continuation slots of a practical are "occupied" but not counted again
                    if (session?.isContinuation) return;

                    // Free slot
                    freeSlots.push(timeLabel);
                    if (teachingStarted) pendingGaps++;
                    currentStreak = 0;
                } else {
                    teachingStarted = true;
                    idleGaps += pendingGaps;
                    pendingGaps = 0;

                    if (session.type === "LECTURE") {
                        lectures++;
                        totalHours += 1;
                        currentStreak++;
                    } else if (session.type === "TUTORIAL") {
                        tutorials++;
                        totalHours += 1;
                        currentStreak++;
                    } else if (session.type === "PRACTICAL") {
                        practicals++;
                        totalHours += 2; // practicals count 2h
                        currentStreak = 0; // labs reset streak (different activity)
                    }

                    if (currentStreak > maxConsecutive) maxConsecutive = currentStreak;
                }
            });

            stats[faculty][day] = {
                totalHours,
                lectures,
                practicals,
                tutorials,
                consecutiveHours: maxConsecutive,
                freeSlots,
                idleGaps,
            };
        });
    });

    return { occupancy, stats };
}
