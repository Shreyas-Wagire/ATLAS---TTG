export function createLabTracker(days = [], slotCount = 6) {
    const usage = {};

    days.forEach((day) => {
        usage[day] = {};
        for (let slot = 0; slot < slotCount; slot++) {
            usage[day][slot] = {}; // labName -> sessionInfo
        }
    });

    return {
        isLabFree(lab, day, slot) {
            if (!usage[day] || usage[day][slot] === undefined) return true;
            return !usage[day][slot][lab];
        },

        markLabUsed(lab, day, slot, sessionInfo) {
            if (!usage[day]) usage[day] = {};
            if (!usage[day][slot]) usage[day][slot] = {};
            usage[day][slot][lab] = sessionInfo;
        },

        getLabUsage() {
            return usage;
        },
    };
}
