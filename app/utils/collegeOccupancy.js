/**
 * collegeOccupancy.js — College-Wide Master Occupancy State for ATLAS
 *
 * Implements one authoritative college-wide occupancy model:
 * CollegeOccupancy
 *  ├── globalReservations
 *  ├── facultyOccupancy
 *  ├── classroomOccupancy
 *  ├── labOccupancy
 *  ├── tutorialRoomOccupancy
 *  └── division/batch occupancy
 *
 * All departments (CSE, IoT, AIDS, Civil, Mech, Electrical, Aero, RAI, etc.)
 * compete against the exact same occupancy state.
 */

import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS_PER_DAY = 6;
const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);

export function isRealFaculty(f) {
    return f && !GHOST_FACULTIES.has(String(f).trim());
}

export class CollegeOccupancy {
    constructor(timetable, resources = {}, facultyAvailability = {}) {
        this.timetable = timetable;
        this.resources = resources || {};
        this.facultyAvailability = facultyAvailability || {};

        this.days = [...DAYS];
        this.slotsPerDay = SLOTS_PER_DAY;

        // Master occupancy tracking structures:
        // Keyed by: resource/entity -> day -> slot -> true | sessionRef
        this.globalReservations = {};      // divKey -> day -> slot -> session
        this.facultyOccupancy = {};        // faculty -> day -> slot -> session
        this.classroomOccupancy = {};      // roomName -> day -> slot -> session
        this.labOccupancy = {};            // labName -> day -> slot -> session
        this.tutorialRoomOccupancy = {};   // trName -> day -> slot -> session
        this.divisionOccupancy = {};       // divKey -> day -> slot -> session
        this.batchOccupancy = {};          // batchLabel -> day -> slot -> session

        // Daily practical count per batch (to enforce max 2 labs/day)
        this.batchDailyPracticalCount = {}; // batchLabel -> day -> count
    }

    // ─── LOCK GLOBAL COLLEGE-WIDE SESSIONS (PRIORITY 1) ───────────────────────

    /**
     * Lock all global / fixed sessions into the master occupancy.
     * Global sessions are immutable anchors and can NEVER be moved, swapped, or overwritten.
     */
    lockGlobalSessions(timetable, globalConstraints = []) {
        Object.entries(timetable || {}).forEach(([divKey, daysMap]) => {
            this.days.forEach((day) => {
                const slots = daysMap?.[day] || [];
                slots.forEach((cell, slot) => {
                    if (!cell) return;
                    if (cell.fixed || cell.isGlobal) {
                        cell.fixed = true;
                        cell.isGlobal = true;

                        // Lock into globalReservations
                        if (!this.globalReservations[divKey]) this.globalReservations[divKey] = {};
                        if (!this.globalReservations[divKey][day]) this.globalReservations[divKey][day] = {};
                        this.globalReservations[divKey][day][slot] = cell;

                        // Lock division slot
                        this.markDivisionOccupied(divKey, day, slot, cell);

                        // Lock faculty globally
                        if (isRealFaculty(cell.faculty)) {
                            this.markFacultyOccupied(cell.faculty, day, slot, cell);
                        }
                        if (Array.isArray(cell.batchAllocations)) {
                            cell.batchAllocations.forEach((alloc) => {
                                if (isRealFaculty(alloc.faculty)) {
                                    this.markFacultyOccupied(alloc.faculty, day, slot, alloc);
                                }
                                if (alloc.batch) {
                                    this.markBatchOccupied(alloc.batch, day, slot, alloc);
                                }
                                if (alloc.location) {
                                    this.markLabOccupied(alloc.location, day, slot, alloc);
                                }
                            });
                        }

                        // Lock batch if present
                        if (cell.batch) {
                            this.markBatchOccupied(cell.batch, day, slot, cell);
                        }

                        // Lock room / lab if present
                        if (cell.location && cell.location !== "TBD" && cell.location !== "FIXED") {
                            if (cell.type === "PRACTICAL") {
                                this.markLabOccupied(cell.location, day, slot, cell);
                            } else if (cell.type === "TUTORIAL") {
                                this.markTutorialRoomOccupied(cell.location, day, slot, cell);
                            } else {
                                this.markClassroomOccupied(cell.location, day, slot, cell);
                            }
                        }
                    }
                });
            });
        });
    }

    // ─── OCCUPANCY MARKERS ───────────────────────────────────────────────────

    markFacultyOccupied(faculty, day, slot, session) {
        if (!isRealFaculty(faculty)) return;
        if (!this.facultyOccupancy[faculty]) this.facultyOccupancy[faculty] = {};
        if (!this.facultyOccupancy[faculty][day]) this.facultyOccupancy[faculty][day] = {};
        this.facultyOccupancy[faculty][day][slot] = session || true;
    }

    unmarkFacultyOccupied(faculty, day, slot) {
        if (!isRealFaculty(faculty)) return;
        if (this.facultyOccupancy[faculty]?.[day]) {
            delete this.facultyOccupancy[faculty][day][slot];
        }
    }

    markDivisionOccupied(divKey, day, slot, session) {
        if (!this.divisionOccupancy[divKey]) this.divisionOccupancy[divKey] = {};
        if (!this.divisionOccupancy[divKey][day]) this.divisionOccupancy[divKey][day] = {};
        this.divisionOccupancy[divKey][day][slot] = session || true;
    }

    unmarkDivisionOccupied(divKey, day, slot) {
        if (this.divisionOccupancy[divKey]?.[day]) {
            delete this.divisionOccupancy[divKey][day][slot];
        }
    }

    markBatchOccupied(batch, day, slot, session) {
        if (!batch) return;
        if (!this.batchOccupancy[batch]) this.batchOccupancy[batch] = {};
        if (!this.batchOccupancy[batch][day]) this.batchOccupancy[batch][day] = {};
        this.batchOccupancy[batch][day][slot] = session || true;
    }

    unmarkBatchOccupied(batch, day, slot) {
        if (!batch) return;
        if (this.batchOccupancy[batch]?.[day]) {
            delete this.batchOccupancy[batch][day][slot];
        }
    }

    markLabOccupied(lab, day, slot, session) {
        if (!lab || lab === "TBD") return;
        const norm = String(lab).toUpperCase().trim();
        if (!this.labOccupancy[norm]) this.labOccupancy[norm] = {};
        if (!this.labOccupancy[norm][day]) this.labOccupancy[norm][day] = {};
        this.labOccupancy[norm][day][slot] = session || true;
    }

    unmarkLabOccupied(lab, day, slot) {
        if (!lab || lab === "TBD") return;
        const norm = String(lab).toUpperCase().trim();
        if (this.labOccupancy[norm]?.[day]) {
            delete this.labOccupancy[norm][day][slot];
        }
    }

    markClassroomOccupied(room, day, slot, session) {
        if (!room || room === "TBD") return;
        const norm = String(room).toUpperCase().trim();
        if (!this.classroomOccupancy[norm]) this.classroomOccupancy[norm] = {};
        if (!this.classroomOccupancy[norm][day]) this.classroomOccupancy[norm][day] = {};
        this.classroomOccupancy[norm][day][slot] = session || true;
    }

    markTutorialRoomOccupied(room, day, slot, session) {
        if (!room || room === "TBD") return;
        const norm = String(room).toUpperCase().trim();
        if (!this.tutorialRoomOccupancy[norm]) this.tutorialRoomOccupancy[norm] = {};
        if (!this.tutorialRoomOccupancy[norm][day]) this.tutorialRoomOccupancy[norm][day] = {};
        this.tutorialRoomOccupancy[norm][day][slot] = session || true;
    }

    // ─── AVAILABILITY CHECKS ─────────────────────────────────────────────────

    /**
     * Check if a faculty is free at (day, slot) across the entire college.
     */
    isFacultyFree(faculty, day, slot) {
        if (!isRealFaculty(faculty)) return true;
        // 1. Availability blackout
        if (isFacultyBlockedByAvailability(this.facultyAvailability, faculty, day, slot)) {
            return false;
        }
        // 2. Master occupancy
        if (this.facultyOccupancy[faculty]?.[day]?.[slot]) {
            return false;
        }
        return true;
    }

    isFacultyFreeForPractical(faculty, day, slot) {
        return this.isFacultyFree(faculty, day, slot) && this.isFacultyFree(faculty, day, slot + 1);
    }

    /**
     * Check if a division slot is free and not locked by a global reservation.
     */
    isDivisionSlotFree(divKey, day, slot) {
        if (this.globalReservations[divKey]?.[day]?.[slot]) return false;
        if (this.divisionOccupancy[divKey]?.[day]?.[slot]) return false;
        const cell = this.timetable[divKey]?.[day]?.[slot];
        return cell === null || cell === undefined;
    }

    isDivisionFreeForPractical(divKey, day, slot) {
        if (slot + 1 >= this.slotsPerDay) return false;
        return this.isDivisionSlotFree(divKey, day, slot) && this.isDivisionSlotFree(divKey, day, slot + 1);
    }

    /**
     * Check if a batch is free at (day, slot).
     */
    isBatchFree(batch, day, slot) {
        if (!batch) return true;
        return !this.batchOccupancy[batch]?.[day]?.[slot];
    }

    isBatchFreeForPractical(batch, day, slot) {
        if (!batch) return true;
        return this.isBatchFree(batch, day, slot) && this.isBatchFree(batch, day, slot + 1);
    }

    getBatchDailyPracticalCount(batch, day) {
        if (!batch) return 0;
        return this.batchDailyPracticalCount[batch]?.[day] || 0;
    }

    incrementBatchDailyPracticalCount(batch, day) {
        if (!batch) return;
        if (!this.batchDailyPracticalCount[batch]) this.batchDailyPracticalCount[batch] = {};
        this.batchDailyPracticalCount[batch][day] = (this.batchDailyPracticalCount[batch][day] || 0) + 1;
    }

    /**
     * Check if a lab is free at (day, slot).
     */
    isLabFree(lab, day, slot) {
        if (!lab || lab === "TBD") return true;
        const norm = String(lab).toUpperCase().trim();
        return !this.labOccupancy[norm]?.[day]?.[slot];
    }

    isLabFreeForPractical(lab, day, slot) {
        return this.isLabFree(lab, day, slot) && this.isLabFree(lab, day, slot + 1);
    }

    /**
     * Get list of available labs free at (day, slot) and (day, slot + 1).
     */
    getAvailableLabsForPractical(day, slot) {
        const baseLabs = (this.resources.labs && this.resources.labs.length > 0)
            ? this.resources.labs
            : ["LAB1", "LAB2", "LAB3", "LAB4", "LAB5", "LAB6", "LAB7", "LAB8"];

        return baseLabs.filter((lab) => this.isLabFreeForPractical(lab, day, slot));
    }

    getAvailableClassrooms(day, slot) {
        const baseClassrooms = (this.resources.classrooms && this.resources.classrooms.length > 0)
            ? this.resources.classrooms
            : ["CR1", "CR2", "CR3", "CR4", "CR5", "CR6", "CR7", "CR8"];

        return baseClassrooms.filter((room) => {
            const norm = String(room).toUpperCase().trim();
            return !this.classroomOccupancy[norm]?.[day]?.[slot];
        });
    }

    getAvailableTutorialRooms(day, slot) {
        const baseTR = (this.resources.tutorialRooms && this.resources.tutorialRooms.length > 0)
            ? this.resources.tutorialRooms
            : ["TR1", "TR2", "TR3", "TR4"];

        return baseTR.filter((tr) => {
            const norm = String(tr).toUpperCase().trim();
            return !this.tutorialRoomOccupancy[norm]?.[day]?.[slot];
        });
    }

    // ─── DETERMINISTIC SCARCITY CALCULATORS ───────────────────────────────────

    /**
     * Calculate faculty practical scarcity: number of remaining valid 2-hour windows (slots 0, 2, 4)
     * where this faculty is available across the week.
     * Lower number = more constrained faculty.
     */
    calculateFacultyPracticalScarcity(faculty) {
        if (!isRealFaculty(faculty)) return 15; // Unconstrained
        let validWindows = 0;
        const validStarts = [0, 2, 4];
        this.days.forEach((day) => {
            validStarts.forEach((slot) => {
                if (this.isFacultyFreeForPractical(faculty, day, slot)) {
                    validWindows++;
                }
            });
        });
        return validWindows;
    }

    /**
     * Calculate batch practical scarcity: number of remaining valid 2-hour windows for this batch.
     */
    calculateBatchPracticalScarcity(batch, divKey) {
        if (!batch) return 15;
        let validWindows = 0;
        const validStarts = [0, 2, 4];
        this.days.forEach((day) => {
            validStarts.forEach((slot) => {
                if (this.isDivisionFreeForPractical(divKey, day, slot) && this.isBatchFreeForPractical(batch, day, slot)) {
                    validWindows++;
                }
            });
        });
        return validWindows;
    }

    // ─── ATOMIC COMMIT OPERATIONS ────────────────────────────────────────────

    /**
     * Commit a parallel practical group atomically.
     * Places the group into timetable[divKey][day][slot] (span 2) and slot + 1 (span 0).
     * Updates faculty, batch, lab, and division occupancies.
     */
    commitPracticalGroup(divKey, day, slot, batchSessions, assignedLabs = []) {
        if (!this.timetable[divKey]?.[day]) return false;

        const allocations = batchSessions.map((session, idx) => ({
            ...session,
            location: assignedLabs[idx] || session.location || "",
        }));

        const headCell = {
            type: "PRACTICAL",
            span: 2,
            fixed: false,
            batchAllocations: allocations,
        };

        const tailCell = {
            type: "PRACTICAL",
            span: 0,
            fixed: false,
            batchAllocations: allocations,
        };

        // Write to timetable
        this.timetable[divKey][day][slot] = headCell;
        this.timetable[divKey][day][slot + 1] = tailCell;

        // Mark division occupied
        this.markDivisionOccupied(divKey, day, slot, headCell);
        this.markDivisionOccupied(divKey, day, slot + 1, tailCell);

        // Update occupancies for each batch in the group
        batchSessions.forEach((session, idx) => {
            const lab = assignedLabs[idx] || session.location;
            this.markFacultyOccupied(session.faculty, day, slot, session);
            this.markFacultyOccupied(session.faculty, day, slot + 1, session);

            this.markBatchOccupied(session.batch, day, slot, session);
            this.markBatchOccupied(session.batch, day, slot + 1, session);

            if (lab) {
                this.markLabOccupied(lab, day, slot, session);
                this.markLabOccupied(lab, day, slot + 1, session);
            }

            this.incrementBatchDailyPracticalCount(session.batch, day);
            session.allocated = true;
        });

        return true;
    }

    /**
     * Commit a single 1-hour session (Tutorial or Lecture) atomically.
     */
    commitSingleSession(divKey, day, slot, session, assignedRoom = null) {
        if (!this.timetable[divKey]?.[day]) return false;

        const cell = {
            ...session,
            location: assignedRoom || session.location || "",
            span: 1,
            fixed: false,
        };

        this.timetable[divKey][day][slot] = cell;
        this.markDivisionOccupied(divKey, day, slot, cell);

        if (isRealFaculty(session.faculty)) {
            this.markFacultyOccupied(session.faculty, day, slot, cell);
        }

        if (session.batch) {
            this.markBatchOccupied(session.batch, day, slot, cell);
        }

        if (assignedRoom) {
            if (session.type === "TUTORIAL") {
                this.markTutorialRoomOccupied(assignedRoom, day, slot, cell);
            } else {
                this.markClassroomOccupied(assignedRoom, day, slot, cell);
            }
        }

        session.allocated = true;
        return true;
    }
}
