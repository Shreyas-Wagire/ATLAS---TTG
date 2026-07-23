export function parseSyncConstraints(rows) {
    if (!rows || rows.length === 0) return [];

    const groupMap = {}; // groupName -> Set of courses

    rows.forEach((row, index) => {
        // Skip header row if present
        if (
            index === 0 &&
            (String(row[0] || "").toLowerCase().includes("group") ||
             String(row[1] || "").toLowerCase().includes("course"))
        ) {
            return;
        }

        const groupName = String(row[0] || "").trim();
        const course = String(row[1] || "").trim();

        if (groupName && course) {
            if (!groupMap[groupName]) {
                groupMap[groupName] = new Set();
            }
            groupMap[groupName].add(course);
        }
    });

    return Object.entries(groupMap).map(([groupName, coursesSet]) => ({
        groupName,
        courses: Array.from(coursesSet),
    }));
}

export function autoDetectSyncConstraints(subjects = []) {
    const syncGroups = {};

    const uniqueCourseNames = Array.from(
        new Set(
            (subjects || []).map((s) => s.courseName?.trim() || s.courseCode?.trim()).filter(Boolean)
        )
    );

    uniqueCourseNames.forEach((name) => {
        const lower = name.toLowerCase();

        // 1. Open Electives (I, II, III, IV)
        if (lower.includes("open elective")) {
            const match = name.match(/Open Elective\s*[-–—:]?\s*([IVX]+|\d+)/i);
            const num = match ? match[1].toUpperCase() : "GENERAL";
            const groupKey = `SYNC_OE_${num}`;
            if (!syncGroups[groupKey]) syncGroups[groupKey] = new Set();
            syncGroups[groupKey].add(name);
        }
        // 2. Minor Courses (I, II, III, IV)
        else if (lower.includes("minor course")) {
            const match = name.match(/Minor Course\s*[-–—:]?\s*([IVX]+|\d+)/i);
            const num = match ? match[1].toUpperCase() : "GENERAL";
            const groupKey = `SYNC_MINOR_${num}`;
            if (!syncGroups[groupKey]) syncGroups[groupKey] = new Set();
            syncGroups[groupKey].add(name);
        }
        // 3. Aptitude and Reasoning Part (I, II, III, IV)
        else if (lower.includes("aptitude") || lower.includes("reasoning")) {
            const match = name.match(/(?:Part\s*[-–—:]?\s*|[-–—:]?\s*)([IVX]+|\d+)/i);
            const num = match ? match[1].toUpperCase() : "GENERAL";
            const groupKey = `SYNC_APTITUDE_${num}`;
            if (!syncGroups[groupKey]) syncGroups[groupKey] = new Set();
            syncGroups[groupKey].add(name);
        }
        // 4. Foreign Languages & Modern Indian Languages (MILFL)
        else if (
            lower.includes("foreign language") ||
            lower.includes("modern indian language") ||
            lower.includes("milfl")
        ) {
            const groupKey = `SYNC_MILFL`;
            if (!syncGroups[groupKey]) syncGroups[groupKey] = new Set();
            syncGroups[groupKey].add(name);
            syncGroups[groupKey].add("MILFL");
        }
    });

    return Object.entries(syncGroups).map(([groupName, coursesSet]) => ({
        groupName,
        courses: Array.from(coursesSet),
    }));
}
