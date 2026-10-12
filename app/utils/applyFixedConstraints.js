import { isSubjectMatch, isAptitudeSubject } from "./normalizeSubjectName.js";
import { normalizeYearHeader } from "./parseLoadSheet.js";

/**
 * Apply fixed constraints to a timetable.
 *
 * @param {Object} timetable - The timetable object (divKey -> day -> slots[])
 * @param {Array} globalConstraints - Array of constraint objects
 * @param {Object} options - Optional configuration
 * @param {string} options.department - Department code for dept-scoped fixed sessions
 * @param {boolean} options.isGlobalSheet - Whether these come from the Global sheet (college-wide)
 * @param {Array} options.overlapDiagnostics - Array to push overlap warnings into
 * @returns {Object} The modified timetable
 */
export function applyFixedConstraints(timetable, globalConstraints, options = {}) {
    const {
        department = null,
        isGlobalSheet = true,
        overlapDiagnostics = null,
    } = options;

    const dayMap = {
        MON: "Monday",
        MONDAY: "Monday",
        TUE: "Tuesday",
        TUESDAY: "Tuesday",
        WED: "Wednesday",
        WEDNESDAY: "Wednesday",
        THU: "Thursday",
        THURSDAY: "Thursday",
        FRI: "Friday",
        FRIDAY: "Friday",
    };

    function getSlotIndex(timeStr) {
        if (!timeStr) return undefined;
        const cleanTime = String(timeStr).replace(/\s+/g, "").replace(/\./g, ":");

        if (cleanTime.includes("9:15")) return 0;
        if (cleanTime.includes("10:15")) return 1;
        if (cleanTime.includes("11:30")) return 2;
        if (cleanTime.includes("12:30")) return 3;
        if (cleanTime.includes("2:15")) return 4;
        if (cleanTime.includes("3:15")) return 5;

        return undefined;
    }

    /**
     * Check for overlap before placing a fixed constraint.
     * Never silently move/delete/duplicate existing fixed sessions.
     */
    function checkAndPlace(timetableKey, day, slot, newCell) {
        if (!timetable[timetableKey]?.[day]) return;

        const existing = timetable[timetableKey][day][slot];
        if (existing && existing.fixed) {
            // Existing fixed session — never overwrite!
            const msg = `Fixed constraint overlap at ${timetableKey} ${day} slot ${slot}: ` +
                `existing "${existing.subject}" (${existing.department || "unknown"}) ` +
                `vs new "${newCell.subject}" (${newCell.department || department || "unknown"}). ` +
                `Keeping existing; skipping new.`;
            console.warn(msg);
            if (overlapDiagnostics) {
                overlapDiagnostics.push({
                    level: "WARNING",
                    type: "FIXED_OVERLAP",
                    timetableKey,
                    day,
                    slot,
                    existing: existing.subject,
                    incoming: newCell.subject,
                    existingDept: existing.department,
                    incomingDept: newCell.department || department,
                    message: msg,
                });
            }
            return; // Do NOT overwrite
        }

        timetable[timetableKey][day][slot] = newCell;
    }

    // Deduplicate Aptitude constraints per year (keep at most 1 official Aptitude constraint per year)
    const seenAptitudePerYear = new Set();
    const cleanConstraints = [];

    (globalConstraints || []).forEach((constraint) => {
        const rawYear = constraint.year || "";
        const year = normalizeYearHeader(rawYear) || rawYear.trim().toUpperCase().split(/[-_\s]+/)[0];

        const isAptitude = isAptitudeSubject(constraint.courseName);

        if (isAptitude) {
            if (seenAptitudePerYear.has(year)) {
                console.log(`Deduplicating extra Aptitude constraint '${constraint.courseName}' for year ${year}`);
                return; // Skip duplicate Aptitude entry for this year!
            }
            seenAptitudePerYear.add(year);
        }

        cleanConstraints.push(constraint);
    });

    cleanConstraints.forEach((constraint) => {
        const rawYear = constraint.year || "";
        const constraintYear = normalizeYearHeader(rawYear) || rawYear.trim().toUpperCase().split(/[-_\s]+/)[0];

        const days = constraint.day
            ? constraint.day.split(/[-,\s]+/).map((d) => d.trim().toUpperCase()).filter(Boolean)
            : [];

        const slot = typeof constraint.slotIndex === "number" ? constraint.slotIndex : getSlotIndex(constraint.time);

        if (slot === undefined) {
            console.warn("Unknown Time Slot in Global Constraint:", constraint.time);
            return;
        }

        const divisions = ["A", "B", "C"];

        const hasDivisionFaculty = Object.values(constraint.divisions || {}).some(
            (f) => f && String(f).trim() !== ""
        );

        // Normalize display name for official titles
        let displayName = constraint.courseName || constraint.subject || "FIXED";
        const normUpper = displayName.toUpperCase().replace(/[^A-Z0-9]/g, "");

        const isAptitude = isAptitudeSubject(displayName);

        if (isAptitude) {
            if (constraintYear === "TY" || normUpper.includes("III") || normUpper.includes("3")) {
                displayName = "Aptitude and Reasoning - Part III";
            } else if (constraintYear === "BTECH" || normUpper.includes("IV") || normUpper.includes("4")) {
                displayName = "Aptitude and Reasoning - Part IV";
            } else if (normUpper.includes("II") || normUpper.includes("2")) {
                displayName = "Aptitude and Reasoning - Part II";
            } else {
                displayName = "Aptitude and Reasoning - Part I";
            }
        } else if (normUpper.includes("MILFL") || normUpper.includes("FOREIGN") || normUpper.includes("MODERN")) {
            displayName = "Modern Indian Language/ Foreign Languages";
        }

        const targetYears = (constraintYear === "ALL" || !constraintYear)
            ? ["SY", "TY", "BTECH"]
            : [constraintYear];

        targetYears.forEach((cYear) => {
            divisions.forEach((division) => {
                const constraintFaculty = constraint.divisions?.[division];

                if (hasDivisionFaculty && (!constraintFaculty || String(constraintFaculty).trim() === "")) {
                    return;
                }

                const timetableKey = `${cYear}-${division}`;

                if (!timetable[timetableKey]) return;

            days.forEach((dayCode) => {
                const day = dayMap[dayCode];
                if (!day) return;

                const is2HourBlock =
                    constraint.P > 0 ||
                    isAptitude ||
                    normUpper.includes("MILFL") ||
                    normUpper.includes("FOREIGN") ||
                    normUpper.includes("MODERN") ||
                    (constraint.time && (
                        constraint.time.includes("11:15") ||
                        constraint.time.includes("1:30") ||
                        constraint.time.includes("4:15")
                    ));

                const facultyValue = constraintFaculty && String(constraintFaculty).trim() !== ""
                    ? String(constraintFaculty).trim()
                    : "FIXED";

                if (is2HourBlock && slot < 5) {
                    checkAndPlace(timetableKey, day, slot, {
                        year: cYear,
                        division,
                        subject: displayName,
                        type: getConstraintType(constraint),
                        faculty: facultyValue,
                        fixed: true,
                        isGlobal: isGlobalSheet,
                        isSync: true,
                        span: 2,
                        day: constraint.day,
                        time: constraint.time,
                        department: department,
                    });
                    checkAndPlace(timetableKey, day, slot + 1, {
                        year: cYear,
                        division,
                        subject: displayName,
                        type: getConstraintType(constraint),
                        faculty: facultyValue,
                        fixed: true,
                        isGlobal: isGlobalSheet,
                        isSync: true,
                        span: 0,
                        day: constraint.day,
                        time: constraint.time,
                        department: department,
                    });
                } else {
                    checkAndPlace(timetableKey, day, slot, {
                        year: cYear,
                        division,
                        subject: displayName,
                        type: getConstraintType(constraint),
                        faculty: facultyValue,
                        fixed: true,
                        isGlobal: isGlobalSheet,
                        isSync: true,
                        span: 1,
                        day: constraint.day,
                        time: constraint.time,
                        department: department,
                    });
                }
            });
        });
    });
});

    return timetable;
}

function getConstraintType(constraint) {
    if (constraint.P > 0) return "PRACTICAL";
    if (constraint.T > 0) return "TUTORIAL";
    return "LECTURE";
}