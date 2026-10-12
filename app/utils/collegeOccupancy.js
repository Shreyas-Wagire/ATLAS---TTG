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
    if (!f) return false;
    const str = String(f).trim().toUpperCase();
    if (GHOST_FACULTIES.has(str)) return false;
    // Common placeholder codes: X1, X2, Y1, Y2, Z1, Z2, EXT, EXTERNAL
    if (/^[XYZ]\d+$/i.test(str) || str.startsWith("EXT")) return false;
    return true;
}

export class CollegeOccupancy {
    constructor(timetable, resources = {}, facultyAvailability = {}) {
        this.timetable = timetable;
        this.resources = resources || {};
        this.facultyAvailability = facultyAvailability || {};

        this.days = [...DAYS];
        this.slotsPerDay = SLOTS_PER_DAY;

        // Master occupancy tracking structures:
        // Keyed by: resource/entity -> day -> slot -> { session, department }
        this.globalReservations = {};      // divKey -> day -> slot -> session
        this.facultyOccupancy = {};        // faculty -> day -> slot -> { session, department }
        this.classroomOccupancy = {};      // roomName -> day -> slot -> { session, department }
        this.labOccupancy = {};            // labName -> day -> slot -> { session, department }
        this.tutorialRoomOccupancy = {};   // trName -> day -> slot -> { session, department }
        this.divisionOccupancy = {};       // divKey -> day -> slot -> { session, department }
        this.batchOccupancy = {};          // batchLabel -> day -> slot -> { session, department }

        // Daily practical count per batch (to enforce max 2 labs/day)
        this.batchDailyPracticalCount = {}; // batchLabel -> day -> count

        // v6.5: Department ownership tracking for shared resources
        this.resourceOwnership = {};  // resourceKey -> day -> slot -> deptCode

        // v6.5: Current active department during per-department scheduling pass
        this.activeDepartment = null;
    }

    setActiveDepartment(deptCode) {
        this.activeDepartment = deptCode || null;
    }

    _resolveDivKey(divKey, dept = null) {
        if (!divKey) return divKey;
        if (divKey.includes(":")) return divKey;
        const d = dept || this.activeDepartment || CollegeOccupancy.extractDeptFromDivKey(divKey);
        return d ? `${d}:${divKey}` : divKey;
    }

    _resolveBatchKey(batch, dept = null) {
        if (!batch) return batch;
        if (String(batch).includes(":")) return batch;
        const d = dept || this.activeDepartment;
        return d ? `${d}:${batch}` : batch;
    }

    // ─── DEPARTMENT HELPERS ──────────────────────────────────────────────────

    /**
     * Extract department code from a div key like "CSE:SY-A" → "CSE", or "SY-A" → null.
     */
    static extractDeptFromDivKey(divKey) {
        if (!divKey) return null;
        const colonIdx = divKey.indexOf(":");
        if (colonIdx > 0) return divKey.substring(0, colonIdx);
        return null;
    }

    /**
     * Extract department from a session object.
     */
    static extractDeptFromSession(session) {
        if (!session) return null;
        if (typeof session === "object" && session.department) return session.department;
        if (typeof session === "object" && session._deptDivKey) {
            return CollegeOccupancy.extractDeptFromDivKey(session._deptDivKey);
        }
        return null;
    }

    /**
     * Build an occupancy record that includes department ownership.
     */
    _buildOccupancyRecord(session, dept) {
        const department = dept
            || CollegeOccupancy.extractDeptFromSession(session)
            || null;
        if (session && typeof session === "object") {
            return { ...session, _ownerDept: department };
        }
        return { _ownerDept: department, _marker: true };
    }

    /**
     * Get the department that owns a resource at a given (day, slot).
     * Supports both:
     *   getDepartmentForResource(resourceType, resourceKey, day, slot)
     *   getDepartmentForResource(resourceKey, day, slot)
     *
     * @returns {string|null} Department code or null
     */
    getDepartmentForResource(arg1, arg2, arg3, arg4) {
        let record = null;
        if (arg4 !== undefined) {
            // 4 arguments: (resourceType, resourceKey, day, slot)
            const resourceType = arg1;
            const resourceKey = arg2;
            const day = arg3;
            const slot = arg4;
            const norm = resourceKey ? String(resourceKey).toUpperCase().trim() : resourceKey;
            switch (resourceType) {
                case "faculty": record = this.facultyOccupancy[resourceKey]?.[day]?.[slot]; break;
                case "lab": record = this.labOccupancy[norm]?.[day]?.[slot]; break;
                case "classroom": record = this.classroomOccupancy[norm]?.[day]?.[slot]; break;
                case "tutorialRoom": record = this.tutorialRoomOccupancy[norm]?.[day]?.[slot]; break;
                case "division": record = this.divisionOccupancy[resourceKey]?.[day]?.[slot]; break;
                case "batch": record = this.batchOccupancy[resourceKey]?.[day]?.[slot]; break;
                default: break;
            }
        } else {
            // 3 arguments: (resourceKey, day, slot)
            const resourceKey = arg1;
            const day = arg2;
            const slot = arg3;
            const norm = resourceKey ? String(resourceKey).toUpperCase().trim() : resourceKey;
            record = this.classroomOccupancy[norm]?.[day]?.[slot]
                || this.labOccupancy[norm]?.[day]?.[slot]
                || this.tutorialRoomOccupancy[norm]?.[day]?.[slot]
                || this.facultyOccupancy[resourceKey]?.[day]?.[slot]
                || this.divisionOccupancy[resourceKey]?.[day]?.[slot];
        }

        if (!record) return null;
        if (typeof record === "object" && record._ownerDept) return record._ownerDept;
        if (typeof record === "object" && record.department) return record.department;
        return null;
    }

    /**
     * Convenience lookup: get department for occupied faculty.
     */
    getDepartmentForFaculty(faculty, day, slot) {
        const record = this.facultyOccupancy[faculty]?.[day]?.[slot];
        if (!record) return null;
        return record._ownerDept || record.department || null;
    }

    /**
     * Generate a department-aware occupancy diagnostic report.
     * Shows utilization per department for faculty, labs, classrooms, etc.
     */
    getOccupancyReport() {
        const report = {
            facultyByDept: {},     // deptCode -> { faculty -> slotsUsed }
            labsByDept: {},        // deptCode -> { lab -> slotsUsed }
            classroomsByDept: {},  // deptCode -> { room -> slotsUsed }
            sharedResources: [],   // resources used by multiple depts
            totalSlots: DAYS.length * SLOTS_PER_DAY,
        };

        // Faculty occupancy by department
        Object.entries(this.facultyOccupancy).forEach(([faculty, daysMap]) => {
            Object.entries(daysMap || {}).forEach(([day, slots]) => {
                Object.entries(slots || {}).forEach(([slot, record]) => {
                    const dept = (record && typeof record === "object")
                        ? (record._ownerDept || record.department || "UNKNOWN")
                        : "UNKNOWN";
                    if (!report.facultyByDept[dept]) report.facultyByDept[dept] = {};
                    if (!report.facultyByDept[dept][faculty]) report.facultyByDept[dept][faculty] = 0;
                    report.facultyByDept[dept][faculty]++;
                });
            });
        });

        // Lab occupancy by department
        Object.entries(this.labOccupancy).forEach(([lab, daysMap]) => {
            const labDepts = new Set();
            Object.entries(daysMap || {}).forEach(([day, slots]) => {
                Object.entries(slots || {}).forEach(([slot, record]) => {
                    const dept = (record && typeof record === "object")
                        ? (record._ownerDept || record.department || "UNKNOWN")
                        : "UNKNOWN";
                    labDepts.add(dept);
                    if (!report.labsByDept[dept]) report.labsByDept[dept] = {};
                    if (!report.labsByDept[dept][lab]) report.labsByDept[dept][lab] = 0;
                    report.labsByDept[dept][lab]++;
                });
            });
            if (labDepts.size > 1) {
                report.sharedResources.push({ type: "LAB", name: lab, departments: [...labDepts] });
            }
        });

        // Classroom occupancy by department
        Object.entries(this.classroomOccupancy).forEach(([room, daysMap]) => {
            const roomDepts = new Set();
            Object.entries(daysMap || {}).forEach(([day, slots]) => {
                Object.entries(slots || {}).forEach(([slot, record]) => {
                    const dept = (record && typeof record === "object")
                        ? (record._ownerDept || record.department || "UNKNOWN")
                        : "UNKNOWN";
                    roomDepts.add(dept);
                    if (!report.classroomsByDept[dept]) report.classroomsByDept[dept] = {};
                    if (!report.classroomsByDept[dept][room]) report.classroomsByDept[dept][room] = 0;
                    report.classroomsByDept[dept][room]++;
                });
            });
            if (roomDepts.size > 1) {
                report.sharedResources.push({ type: "CLASSROOM", name: room, departments: [...roomDepts] });
            }
        });

        return report;
    }

    // ─── LOCK GLOBAL COLLEGE-WIDE SESSIONS (PRIORITY 1) ───────────────────────

    /**
     * Lock all global / fixed sessions into the master occupancy.
     * Global sessions are immutable anchors and can NEVER be moved, swapped, or overwritten.
     */
    lockGlobalSessions(timetable, globalConstraints = []) {
        Object.entries(timetable || {}).forEach(([divKey, daysMap]) => {
            const dept = CollegeOccupancy.extractDeptFromDivKey(divKey) || "GLOBAL";
            this.days.forEach((day) => {
                const slots = daysMap?.[day] || [];
                slots.forEach((cell, slot) => {
                    if (!cell) return;
                    if (cell.fixed || cell.isGlobal) {
                        cell.fixed = true;
                        cell.isGlobal = true;
                        cell.department = cell.department || dept;

                        // Lock into globalReservations
                        if (!this.globalReservations[divKey]) this.globalReservations[divKey] = {};
                        if (!this.globalReservations[divKey][day]) this.globalReservations[divKey][day] = {};
                        this.globalReservations[divKey][day][slot] = cell;

                        // Lock division slot
                        this.markDivisionOccupied(divKey, day, slot, cell, dept);

                        // Lock faculty globally
                        if (isRealFaculty(cell.faculty)) {
                            this.markFacultyOccupied(cell.faculty, day, slot, cell, dept);
                        }
                        if (Array.isArray(cell.batchAllocations)) {
                            cell.batchAllocations.forEach((alloc) => {
                                if (isRealFaculty(alloc.faculty)) {
                                    this.markFacultyOccupied(alloc.faculty, day, slot, alloc, dept);
                                }
                                if (alloc.batch) {
                                    this.markBatchOccupied(alloc.batch, day, slot, alloc, dept);
                                }
                                if (alloc.location) {
                                    this.markLabOccupied(alloc.location, day, slot, alloc, dept);
                                }
                            });
                        }

                        // Lock batch if present
                        if (cell.batch) {
                            this.markBatchOccupied(cell.batch, day, slot, cell, dept);
                        }

                        // Lock room / lab if present
                        if (cell.location && cell.location !== "TBD" && cell.location !== "FIXED") {
                            if (cell.type === "PRACTICAL") {
                                this.markLabOccupied(cell.location, day, slot, cell, dept);
                            } else if (cell.type === "TUTORIAL") {
                                this.markTutorialRoomOccupied(cell.location, day, slot, cell, dept);
                            } else {
                                this.markClassroomOccupied(cell.location, day, slot, cell, dept);
                            }
                        }
                    }
                });
            });
        });
    }

    // ─── OCCUPANCY MARKERS ───────────────────────────────────────────────────
    // All markers now accept an optional `dept` parameter for department ownership.

    markFacultyOccupied(faculty, day, slot, session, dept) {
        if (!isRealFaculty(faculty)) return;
        if (!this.facultyOccupancy[faculty]) this.facultyOccupancy[faculty] = {};
        if (!this.facultyOccupancy[faculty][day]) this.facultyOccupancy[faculty][day] = {};
        this.facultyOccupancy[faculty][day][slot] = this._buildOccupancyRecord(session, dept);
    }

    unmarkFacultyOccupied(faculty, day, slot) {
        if (!isRealFaculty(faculty)) return;
        if (this.facultyOccupancy[faculty]?.[day]) {
            delete this.facultyOccupancy[faculty][day][slot];
        }
    }

    markDivisionOccupied(divKey, day, slot, session, dept) {
        const key = this._resolveDivKey(divKey, dept || session?.department);
        if (!this.divisionOccupancy[key]) this.divisionOccupancy[key] = {};
        if (!this.divisionOccupancy[key][day]) this.divisionOccupancy[key][day] = {};
        this.divisionOccupancy[key][day][slot] = this._buildOccupancyRecord(session, dept);
    }

    unmarkDivisionOccupied(divKey, day, slot) {
        const key = this._resolveDivKey(divKey);
        if (this.divisionOccupancy[key]?.[day]) {
            delete this.divisionOccupancy[key][day][slot];
        }
    }

    markBatchOccupied(batch, day, slot, session, dept) {
        if (!batch) return;
        const key = this._resolveBatchKey(batch, dept || session?.department);
        if (!this.batchOccupancy[key]) this.batchOccupancy[key] = {};
        if (!this.batchOccupancy[key][day]) this.batchOccupancy[key][day] = {};
        this.batchOccupancy[key][day][slot] = this._buildOccupancyRecord(session, dept);
    }

    unmarkBatchOccupied(batch, day, slot) {
        if (!batch) return;
        const key = this._resolveBatchKey(batch);
        if (this.batchOccupancy[key]?.[day]) {
            delete this.batchOccupancy[key][day][slot];
        }
    }

    markLabOccupied(lab, day, slot, session, dept) {
        if (!lab || lab === "TBD") return;
        const norm = String(lab).toUpperCase().trim();
        if (!this.labOccupancy[norm]) this.labOccupancy[norm] = {};
        if (!this.labOccupancy[norm][day]) this.labOccupancy[norm][day] = {};
        this.labOccupancy[norm][day][slot] = this._buildOccupancyRecord(session, dept);
    }

    unmarkLabOccupied(lab, day, slot) {
        if (!lab || lab === "TBD") return;
        const norm = String(lab).toUpperCase().trim();
        if (this.labOccupancy[norm]?.[day]) {
            delete this.labOccupancy[norm][day][slot];
        }
    }

    markClassroomOccupied(room, day, slot, session, dept) {
        if (!room || room === "TBD") return;
        const norm = String(room).toUpperCase().trim();
        if (!this.classroomOccupancy[norm]) this.classroomOccupancy[norm] = {};
        if (!this.classroomOccupancy[norm][day]) this.classroomOccupancy[norm][day] = {};
        this.classroomOccupancy[norm][day][slot] = this._buildOccupancyRecord(session, dept);
    }

    markTutorialRoomOccupied(room, day, slot, session, dept) {
        if (!room || room === "TBD") return;
        const norm = String(room).toUpperCase().trim();
        if (!this.tutorialRoomOccupancy[norm]) this.tutorialRoomOccupancy[norm] = {};
        if (!this.tutorialRoomOccupancy[norm][day]) this.tutorialRoomOccupancy[norm][day] = {};
        this.tutorialRoomOccupancy[norm][day][slot] = this._buildOccupancyRecord(session, dept);
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
        const key = this._resolveDivKey(divKey);
        if (this.globalReservations[key]?.[day]?.[slot]) return false;
        if (this.divisionOccupancy[key]?.[day]?.[slot]) return false;
        const cell = (this.timetable[key] || this.timetable[divKey])?.[day]?.[slot];
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
        const key = this._resolveBatchKey(batch);
        return !this.batchOccupancy[key]?.[day]?.[slot];
    }

    isBatchFreeForPractical(batch, day, slot) {
        if (!batch) return true;
        return this.isBatchFree(batch, day, slot) && this.isBatchFree(batch, day, slot + 1);
    }

    getBatchDailyPracticalCount(batch, day) {
        if (!batch) return 0;
        const key = this._resolveBatchKey(batch);
        return this.batchDailyPracticalCount[key]?.[day] || 0;
    }

    incrementBatchDailyPracticalCount(batch, day) {
        if (!batch) return;
        const key = this._resolveBatchKey(batch);
        if (!this.batchDailyPracticalCount[key]) this.batchDailyPracticalCount[key] = {};
        this.batchDailyPracticalCount[key][day] = (this.batchDailyPracticalCount[key][day] || 0) + 1;
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

    isClassroomFree(room, day, slot) {
        if (!room || room === "TBD") return true;
        const norm = String(room).toUpperCase().trim();
        return !this.classroomOccupancy[norm]?.[day]?.[slot];
    }

    isClassroomFreeForPractical(room, day, slot) {
        return this.isClassroomFree(room, day, slot) && this.isClassroomFree(room, day, slot + 1);
    }

    isTutorialRoomFree(room, day, slot) {
        if (!room || room === "TBD") return true;
        const norm = String(room).toUpperCase().trim();
        return !this.tutorialRoomOccupancy[norm]?.[day]?.[slot];
    }

    isTutorialRoomFreeForPractical(room, day, slot) {
        return this.isTutorialRoomFree(room, day, slot) && this.isTutorialRoomFree(room, day, slot + 1);
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
        const dept = CollegeOccupancy.extractDeptFromDivKey(divKey)
            || (batchSessions[0] && batchSessions[0].department)
            || this.activeDepartment
            || null;
        const resolvedDivKey = this._resolveDivKey(divKey, dept);
        const grid = this.timetable[resolvedDivKey] || this.timetable[divKey];
        if (!grid?.[day]) return false;

        // v5.5: assignedLabs can be either:
        //   - Plain strings (legacy): "GEL"
        //   - Lab assignment objects: { labInitial, status, primaryLab, reason }
        const resolveLabInfo = (labValue, idx) => {
            if (!labValue) return { labInitial: null, status: "UNRESOLVED", primaryLab: null, reason: "No lab assigned" };
            if (typeof labValue === "string") {
                return { labInitial: labValue, status: "MAPPED", primaryLab: labValue, reason: "Legacy assignment" };
            }
            return {
                labInitial: labValue.labInitial || null,
                status:     labValue.status     || "MAPPED",
                primaryLab: labValue.primaryLab || labValue.labInitial || null,
                fallbackLab: labValue.fallbackLab || null,
                isTutorial: labValue.isTutorial || false,
                reason:     labValue.reason     || "",
            };
        };

        const practicalAllocations = [];
        const tutorialAllocations = [];

        batchSessions.forEach((session, idx) => {
            const labInfo = resolveLabInfo(assignedLabs[idx], idx);
            if (session.type === "TUTORIAL") {
                tutorialAllocations.push({
                    ...session,
                    location: labInfo.labInitial || "",
                    resourceType: "TUTORIAL_ROOM",
                    embeddedInLab: true,
                    labSubSlot: slot,
                    department: dept || session.department,
                });
            } else {
                practicalAllocations.push({
                    ...session,
                    location:         labInfo.labInitial || "",
                    labAssignedInitial: labInfo.labInitial,
                    labAssignedStatus:  labInfo.status,
                    primaryLabInitial:  labInfo.primaryLab || session.primaryLabInitial,
                    fallbackLabInitial: labInfo.fallbackLab || null,
                    labAssignedReason:  labInfo.reason,
                    department: dept || session.department,
                });
            }
        });

        const headCell = {
            type: "PRACTICAL",
            span: 2,
            fixed: false,
            department: dept,
            batchAllocations: practicalAllocations,
            tutorialAllocations: tutorialAllocations.length > 0 ? tutorialAllocations : undefined,
        };

        const tailCell = {
            type: "PRACTICAL",
            span: 0,
            fixed: false,
            department: dept,
            batchAllocations: practicalAllocations,
            tutorialAllocations: tutorialAllocations.length > 0 ? tutorialAllocations : undefined,
        };

        // Write to timetable
        grid[day][slot] = headCell;
        grid[day][slot + 1] = tailCell;

        // Mark division occupied
        this.markDivisionOccupied(resolvedDivKey, day, slot, headCell, dept);
        this.markDivisionOccupied(resolvedDivKey, day, slot + 1, tailCell, dept);

        // Update occupancies for each batch in the group
        batchSessions.forEach((session, idx) => {
            const labInfo = resolveLabInfo(assignedLabs[idx], idx);
            const roomOrLab = labInfo.labInitial;
            this.markFacultyOccupied(session.faculty, day, slot, session, dept);
            this.markFacultyOccupied(session.faculty, day, slot + 1, session, dept);

            this.markBatchOccupied(session.batch, day, slot, session, dept);
            this.markBatchOccupied(session.batch, day, slot + 1, session, dept);

            if (roomOrLab) {
                if (session.type === "TUTORIAL") {
                    this.markTutorialRoomOccupied(roomOrLab, day, slot, session, dept);
                    this.markTutorialRoomOccupied(roomOrLab, day, slot + 1, session, dept);
                } else {
                    this.markLabOccupied(roomOrLab, day, slot, session, dept);
                    this.markLabOccupied(roomOrLab, day, slot + 1, session, dept);
                }
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
        const dept = CollegeOccupancy.extractDeptFromDivKey(divKey)
            || session?.department
            || this.activeDepartment
            || null;
        const resolvedDivKey = this._resolveDivKey(divKey, dept);
        const grid = this.timetable[resolvedDivKey] || this.timetable[divKey];
        if (!grid?.[day]) return false;

        const cell = {
            ...session,
            location: assignedRoom || session.location || "",
            span: 1,
            fixed: session.fixed !== undefined ? session.fixed : false,
            department: dept || session.department,
        };

        grid[day][slot] = cell;
        this.markDivisionOccupied(resolvedDivKey, day, slot, cell, dept);

        if (isRealFaculty(session.faculty)) {
            this.markFacultyOccupied(session.faculty, day, slot, cell, dept);
        }

        if (session.batch) {
            this.markBatchOccupied(session.batch, day, slot, cell, dept);
        }

        if (assignedRoom) {
            if (session.type === "TUTORIAL") {
                this.markTutorialRoomOccupied(assignedRoom, day, slot, cell, dept);
            } else {
                this.markClassroomOccupied(assignedRoom, day, slot, cell, dept);
            }
        }

        session.allocated = true;
        return true;
    }
}
