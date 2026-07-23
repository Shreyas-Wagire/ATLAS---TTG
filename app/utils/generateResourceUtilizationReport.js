/**
 * generateResourceUtilizationReport.js
 * Computes classroom, lab, and tutorial room utilization across all slots.
 */
export function generateResourceUtilizationReport(timetable, resources = {}) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const TOTAL_SLOTS = 6;
    const TOTAL_POSSIBLE = days.length * TOTAL_SLOTS; // 30 slots/week

    // Track usage per resource
    const resourceUsage = {}; // locationId -> { used: 0, total: 30, type, sessions: [] }
    const resourceConflicts = []; // same room assigned to 2 sessions at same slot

    // Track slot -> location -> divisionKey for conflict detection
    const slotLocationMap = {}; // `${day}|${slot}` -> Set of locations

    function registerResource(location, type) {
        if (!location || location === "" || location === "TBD") return;
        if (!resourceUsage[location]) {
            resourceUsage[location] = { location, type: type || "CLASSROOM", used: 0, sessions: [] };
        }
    }

    // Pre-register known resources
    (resources.classrooms || []).forEach((r) => registerResource(r.name || r, "CLASSROOM"));
    (resources.labs || []).forEach((r) => registerResource(r.name || r, "LAB"));
    (resources.tutorialRooms || []).forEach((r) => registerResource(r.name || r, "TUTORIAL_ROOM"));

    Object.entries(timetable || {}).forEach(([divisionKey, daysMap]) => {
        days.forEach((day) => {
            const slots = daysMap?.[day] || [];
            slots.forEach((cell, slotIdx) => {
                if (!cell || cell.span === 0) return;

                const type = cell.type;
                if (!type) return;

                const slotKey = `${day}|${slotIdx}`;

                if ((type === "PRACTICAL" || type === "TUTORIAL") && cell.batchAllocations) {
                    const seenLocations = new Set();
                    cell.batchAllocations.forEach((alloc) => {
                        const loc = alloc.location || cell.location;
                        if (!loc || seenLocations.has(loc)) return;
                        seenLocations.add(loc);

                        registerResource(loc, type === "PRACTICAL" ? "LAB" : "TUTORIAL_ROOM");
                        resourceUsage[loc].used++;
                        resourceUsage[loc].sessions.push({ day, slot: slotIdx, divisionKey, subject: alloc.subject || cell.subject });

                        // Conflict: same location at same slot
                        if (!slotLocationMap[slotKey]) slotLocationMap[slotKey] = {};
                        if (!slotLocationMap[slotKey][loc]) slotLocationMap[slotKey][loc] = [];
                        slotLocationMap[slotKey][loc].push({ divisionKey, subject: alloc.subject || cell.subject, type });
                    });
                } else {
                    const loc = cell.location;
                    if (loc && loc !== "TBD") {
                        registerResource(loc, "CLASSROOM");
                        resourceUsage[loc].used++;
                        resourceUsage[loc].sessions.push({ day, slot: slotIdx, divisionKey, subject: cell.subject });

                        if (!slotLocationMap[slotKey]) slotLocationMap[slotKey] = {};
                        if (!slotLocationMap[slotKey][loc]) slotLocationMap[slotKey][loc] = [];
                        slotLocationMap[slotKey][loc].push({ divisionKey, subject: cell.subject, type });
                    }
                }
            });
        });
    });

    // Find location conflicts
    Object.entries(slotLocationMap).forEach(([slotKey, locationMap]) => {
        const [day, slotIdx] = slotKey.split("|");
        Object.entries(locationMap).forEach(([location, usages]) => {
            const uniqueClasses = new Set(usages.map((u) => u.divisionKey));
            if (uniqueClasses.size > 1) {
                resourceConflicts.push({
                    location,
                    day,
                    slot: Number(slotIdx),
                    type: "ROOM_CLASH",
                    conflictingClasses: usages,
                });
            }
        });
    });

    const report = Object.values(resourceUsage).map((entry) => ({
        location: entry.location,
        type: entry.type,
        usedSlots: entry.used,
        totalSlots: TOTAL_POSSIBLE,
        utilizationPercent: Math.round((entry.used / TOTAL_POSSIBLE) * 100),
        status: entry.used === 0 ? "UNUSED" : entry.used > TOTAL_POSSIBLE * 0.85 ? "HEAVILY_USED" : "OPTIMAL",
    }));

    report.sort((a, b) => b.usedSlots - a.usedSlots);

    return { resources: report, conflicts: resourceConflicts };
}
