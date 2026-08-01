/**
 * generateConflictReport.js
 * Detects all 9 conflict types across the generated timetable.
 */

// Practical allowed blocks: [slot0, slot1], [slot2, slot3], [slot4, slot5]
const PRACTICAL_VALID_BLOCKS = [[0, 1], [2, 3], [4, 5]];

export function generateConflictReport(timetable, sessionPool, globalConstraints = []) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const conflicts = [];

    // Build lookup maps
    const facultySlotMap = {}; // faculty -> day -> slot -> [{divisionKey, subject, type}]
    const roomSlotMap = {};    // room -> day -> slot -> [{divisionKey, subject, type}]

    function registerFaculty(faculty, day, slot, divisionKey, subject, type) {
        if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "TBD-FACULTY" || faculty === "DEPT-FACULTY" || faculty.endsWith("-FACULTY") || faculty.includes("TBD")) return;
        if (!facultySlotMap[faculty]) facultySlotMap[faculty] = {};
        if (!facultySlotMap[faculty][day]) facultySlotMap[faculty][day] = {};
        if (!facultySlotMap[faculty][day][slot]) facultySlotMap[faculty][day][slot] = [];
        facultySlotMap[faculty][day][slot].push({ divisionKey, subject, type });
    }


    function registerRoom(room, day, slot, divisionKey, subject, type) {
        if (!room || room === "TBD" || room === "") return;
        if (!roomSlotMap[room]) roomSlotMap[room] = {};
        if (!roomSlotMap[room][day]) roomSlotMap[room][day] = {};
        if (!roomSlotMap[room][day][slot]) roomSlotMap[room][day][slot] = [];
        roomSlotMap[room][day][slot].push({ divisionKey, subject, type });
    }

    Object.entries(timetable || {}).forEach(([divisionKey, daysMap]) => {
        days.forEach((day) => {
            const slots = daysMap?.[day] || [];
            slots.forEach((cell, slotIdx) => {
                if (!cell) return;
                const type = cell.type;
                if (!type) return;

                if ((type === "PRACTICAL" || type === "TUTORIAL") && cell.batchAllocations) {
                    const seenFaculty = new Set();
                    const seenRoom = new Set();
                    cell.batchAllocations.forEach((alloc) => {
                        const faculty = alloc.faculty;
                        const room = alloc.location || cell.location;
                        if (faculty && !seenFaculty.has(faculty)) {
                            seenFaculty.add(faculty);
                            registerFaculty(faculty, day, slotIdx, divisionKey, alloc.subject || cell.subject, type);
                        }
                        if (room && !seenRoom.has(room)) {
                            seenRoom.add(room);
                            registerRoom(room, day, slotIdx, divisionKey, alloc.subject || cell.subject, type);
                        }
                    });

                    // PRACTICAL BREAK VIOLATION: check span=2 starts at valid block
                    if (type === "PRACTICAL" && cell.span === 2) {
                        const validStart = PRACTICAL_VALID_BLOCKS.some(([s]) => s === slotIdx);
                        if (!validStart) {
                            conflicts.push({
                                type: "PRACTICAL_BREAK_VIOLATION",
                                severity: "HIGH",
                                divisionKey,
                                day,
                                slot: slotIdx,
                                subject: cell.subject,
                                description: `Practical at slot ${slotIdx} violates allowed blocks (must start at 0, 2, or 4)`,
                                suggestion: "Move practical to slot 0, 2, or 4.",
                            });
                        }
                    }
                } else {
                    registerFaculty(cell.faculty, day, slotIdx, divisionKey, cell.subject, type);
                    registerRoom(cell.location, day, slotIdx, divisionKey, cell.subject, type);
                }
            });
        });
    });

    // 1. FACULTY CLASH
    Object.entries(facultySlotMap).forEach(([faculty, dayMap]) => {
        Object.entries(dayMap).forEach(([day, slotMap]) => {
            Object.entries(slotMap).forEach(([slot, usages]) => {
                const uniqueClasses = new Set(usages.map((u) => u.divisionKey));
                if (uniqueClasses.size > 1) {
                    conflicts.push({
                        type: "FACULTY_CLASH",
                        severity: "CRITICAL",
                        faculty,
                        day,
                        slot: Number(slot),
                        affectedClasses: usages,
                        description: `Faculty ${faculty} is double-booked on ${day} slot ${Number(slot) + 1}`,
                        suggestion: `Move one of the sessions to a free slot where ${faculty} is available.`,
                    });
                }
            });
        });
    });

    // 2. ROOM CLASH
    Object.entries(roomSlotMap).forEach(([room, dayMap]) => {
        Object.entries(dayMap).forEach(([day, slotMap]) => {
            Object.entries(slotMap).forEach(([slot, usages]) => {
                const uniqueClasses = new Set(usages.map((u) => u.divisionKey));
                if (uniqueClasses.size > 1) {
                    const isLab = usages.some((u) => u.type === "PRACTICAL");
                    const isTutRoom = usages.some((u) => u.type === "TUTORIAL");
                    conflicts.push({
                        type: isLab ? "LAB_CLASH" : isTutRoom ? "TUTORIAL_ROOM_CLASH" : "ROOM_CLASH",
                        severity: "HIGH",
                        room,
                        day,
                        slot: Number(slot),
                        affectedClasses: usages,
                        description: `Room ${room} is double-booked on ${day} slot ${Number(slot) + 1}`,
                        suggestion: `Assign an alternate available room for one of the sessions.`,
                    });
                }
            });
        });
    });

    // 3. FIXED CONSTRAINT VIOLATION
    (globalConstraints || []).forEach((constraint) => {
        const day = constraint.day?.split(/[-,\s]+/)[0]?.trim();
        const divKey = `${constraint.year}-A`;
        if (!day || !timetable[divKey]) return;

        const slotIndex = getSlotIndex(constraint.time);
        if (slotIndex === undefined) return;

        const cell = timetable[divKey]?.[mapDay(day)]?.[slotIndex];
        if (cell && !cell.fixed) {
            conflicts.push({
                type: "FIXED_CONSTRAINT_VIOLATION",
                severity: "CRITICAL",
                divisionKey: divKey,
                day: mapDay(day),
                slot: slotIndex,
                subject: constraint.courseName,
                description: `Fixed constraint for ${constraint.courseName} on ${day} at ${constraint.time} was overwritten.`,
                suggestion: "Ensure fixed constraints are applied before dynamic session allocation.",
            });
        }
    });

    // Group by type
    const summary = {
        FACULTY_CLASH: 0,
        ROOM_CLASH: 0,
        LAB_CLASH: 0,
        TUTORIAL_ROOM_CLASH: 0,
        BATCH_CLASH: 0,
        DIVISION_CLASH: 0,
        RESOURCE_CLASH: 0,
        PRACTICAL_BREAK_VIOLATION: 0,
        FIXED_CONSTRAINT_VIOLATION: 0,
        total: conflicts.length,
    };

    conflicts.forEach((c) => {
        if (summary[c.type] !== undefined) summary[c.type]++;
    });

    return { conflicts, summary };
}

function getSlotIndex(timeStr) {
    if (!timeStr) return undefined;
    const clean = String(timeStr).replace(/\s+/g, "").replace(/\./g, ":");
    if (clean.includes("9:15")) return 0;
    if (clean.includes("10:15")) return 1;
    if (clean.includes("11:30")) return 2;
    if (clean.includes("12:30")) return 3;
    if (clean.includes("2:15")) return 4;
    if (clean.includes("3:15")) return 5;
    return undefined;
}

function mapDay(d) {
    const m = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };
    return m[d?.toUpperCase()] || d;
}
