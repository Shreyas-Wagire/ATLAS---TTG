/**
 * parseFacultyConstraints.js
 * Converts the FacultyConstraints UI list into a facultyAvailability map
 * that the allocation engine uses to block specific session windows per faculty.
 *
 * Session mapping:
 *   Morning   = slots [0, 1]  (9:15 AM  – 11:15 AM)
 *   Midday    = slots [2, 3]  (11:30 AM – 1:30 PM)
 *   Afternoon = slots [4, 5]  (2:15 PM  – 4:15 PM)
 */

const SESSION_SLOT_MAP = {
    "morning":   [0, 1],
    "midday":    [2, 3],
    "afternoon": [4, 5],
};

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * @param {Array} facultyConstraints - Array of constraint objects from FacultyConstraints.jsx
 * @returns {Object} facultyAvailability map:
 *   {
 *     "Prof. Sharma": {
 *       "Monday":    [0, 1],   // blocked slots on Monday
 *       "ALL":       [0, 1],   // blocked slots on every day (if "All Days" selected)
 *     }
 *   }
 */
export function parseFacultyConstraints(facultyConstraints = []) {
    const facultyAvailability = {};

    facultyConstraints.forEach((constraint) => {
        const { facultyName, day, session, type } = constraint;
        if (!facultyName || !session) return;

        // Only process "Not Available" constraints (preferred-only handled as soft hint)
        if (type !== "not_available") return;

        const blockedSlots = SESSION_SLOT_MAP[session.toLowerCase()] || [];
        if (blockedSlots.length === 0) return;

        const name = facultyName.trim();
        if (!facultyAvailability[name]) {
            facultyAvailability[name] = {};
        }

        if (day === "ALL" || !day) {
            // Block on every weekday
            ALL_DAYS.forEach((d) => {
                if (!facultyAvailability[name][d]) {
                    facultyAvailability[name][d] = [];
                }
                blockedSlots.forEach((slot) => {
                    if (!facultyAvailability[name][d].includes(slot)) {
                        facultyAvailability[name][d].push(slot);
                    }
                });
            });
        } else {
            // Block on specific day only
            if (!facultyAvailability[name][day]) {
                facultyAvailability[name][day] = [];
            }
            blockedSlots.forEach((slot) => {
                if (!facultyAvailability[name][day].includes(slot)) {
                    facultyAvailability[name][day].push(slot);
                }
            });
        }
    });

    return facultyAvailability;
}

/**
 * Check if a faculty member is blocked at a given day+slot.
 * @param {Object} facultyAvailability - Result of parseFacultyConstraints()
 * @param {string} faculty
 * @param {string} day
 * @param {number} slot
 * @returns {boolean} true if blocked (unavailable)
 */
export function isFacultyBlockedByAvailability(facultyAvailability, faculty, day, slot) {
    if (!facultyAvailability || !faculty) return false;

    const name = faculty.trim();
    const blockedSlotsForDay = facultyAvailability[name]?.[day] || [];
    return blockedSlotsForDay.includes(slot);
}
