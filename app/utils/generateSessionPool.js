import { isAptitudeSubject } from "./normalizeSubjectName";

export function generateSessionPool(yearWiseData, syncConstraints = []) {
    const sessionPool = [];
    const possibleDivisions = ["A", "B", "C"];

    Object.entries(yearWiseData).forEach(([year, courses]) => {
        // 1. Generate LECTURE sessions (Division level: A/B/C)
        possibleDivisions.forEach((division) => {
            const divExists = courses.some(
                (c) => c.divisions?.[division] && String(c.divisions[division]).trim() !== ""
            );

            if (!divExists) return;

            courses.forEach((course) => {
                if (course.L > 0) {
                    createLecturesForDivision(sessionPool, year, course, division, syncConstraints);
                }
            });
        });

        // 2. Generate TUTORIAL sessions (Batch level: 1-12 or 1-8)
        courses.forEach((course) => {
            if (course.T > 0) {
                createTutorialSessionsForBatches(sessionPool, year, course, syncConstraints);
            }
        });

        // 3. Generate PRACTICAL sessions (Batch level: 1-12 or 1-8)
        courses.forEach((course) => {
            if (course.P > 0) {
                createPracticalSessionsForBatches(sessionPool, year, course, syncConstraints);
            }
        });
    });

    return sessionPool;
}

function isSpecialGlobalCourse(course) {
    const name = course.courseName || "";
    const code = course.courseCode || "";

    return (
        isAptitudeSubject(name) ||
        isAptitudeSubject(code) ||
        code.toUpperCase() === "MILFL" ||
        name.toLowerCase().includes("modern indian language") ||
        name.toLowerCase().includes("foreign language") ||
        name.toLowerCase().includes("milfl")
    );
}

function createLecturesForDivision(sessionPool, year, course, division, syncConstraints) {
    const rawFaculty = course.divisions?.[division];
    if (!rawFaculty || String(rawFaculty).trim() === "") return;
    const faculty = String(rawFaculty).trim();
    const syncGroup = findSyncGroup(course, syncConstraints);

    // If an Aptitude/MILFL course is covered by global constraints for this year, skip creating normal pool lectures
    if (isSpecialGlobalCourse(course)) {
        return;
    }

    // Standard Lectures (1 hour each)
    for (let i = 1; i <= course.L; i++) {
        sessionPool.push({
            year,
            division,
            subject: course.courseCode,
            subjectName: course.courseName,
            faculty,
            location: course.location || "",
            type: "LECTURE",
            duration: 1,
            resourceType: "CLASSROOM",
            syncGroup,
            allocated: false,
        });
    }
}

function createTutorialSessionsForBatches(sessionPool, year, course, syncConstraints) {
    if (isSpecialGlobalCourse(course)) return;

    const prefix = getBatchPrefix(year);
    const maxBatches = year === "BTECH" ? 8 : 12;
    const syncGroup = findSyncGroup(course, syncConstraints);
    const hasBatchCols = hasAnyBatchFaculty(course);

    for (let b = 1; b <= maxBatches; b++) {
        const division = getDivisionForBatch(b);
        const batchFaculty = course.batches?.[b];
        const divFaculty = course.divisions?.[division];

        const rawFaculty = batchFaculty && String(batchFaculty).trim() !== ""
            ? String(batchFaculty).trim()
            : (hasBatchCols ? null : divFaculty);

        if (!rawFaculty || String(rawFaculty).trim() === "" || String(rawFaculty).trim() === "-") continue;

        const batchLabel = `${prefix}${b}`;
        const faculty = String(rawFaculty).trim();

        for (let i = 1; i <= course.T; i++) {
            sessionPool.push({
                year,
                division,
                batch: batchLabel,
                subject: course.courseCode,
                subjectName: course.courseName,
                faculty,
                location: course.location || "",
                type: "TUTORIAL",
                duration: 1,
                resourceType: "TUTORIAL_ROOM",
                syncGroup,
                allocated: false,
            });
        }
    }
}

function createPracticalSessionsForBatches(sessionPool, year, course, syncConstraints) {
    if (isSpecialGlobalCourse(course)) return;

    const prefix = getBatchPrefix(year);
    const maxBatches = year === "BTECH" ? 8 : 12;
    const syncGroup = findSyncGroup(course, syncConstraints);
    const hasBatchCols = hasAnyBatchFaculty(course);

    for (let b = 1; b <= maxBatches; b++) {
        const division = getDivisionForBatch(b);
        const batchFaculty = course.batches?.[b];
        const divFaculty = course.divisions?.[division];

        const rawFaculty = batchFaculty && String(batchFaculty).trim() !== ""
            ? String(batchFaculty).trim()
            : (hasBatchCols ? null : divFaculty);

        if (!rawFaculty || String(rawFaculty).trim() === "" || String(rawFaculty).trim() === "-") continue;

        const batchLabel = `${prefix}${b}`;
        const faculty = String(rawFaculty).trim();

        sessionPool.push({
            year,
            division,
            batch: batchLabel,
            subject: course.courseCode,
            subjectName: course.courseName,
            faculty,
            location: course.location || "",
            type: "PRACTICAL",
            duration: 2,
            resourceType: "LAB",
            syncGroup,
            allocated: false,
        });
    }
}

function hasAnyBatchFaculty(course) {
    if (!course || !course.batches) return false;
    return Object.values(course.batches).some(
        (f) => f && String(f).trim() !== "" && String(f).trim() !== "-"
    );
}

function findSyncGroup(course, syncConstraints) {
    if (!syncConstraints || syncConstraints.length === 0) return null;
    const targetName = (course.courseName || "").toUpperCase().trim();
    const targetCode = (course.courseCode || "").toUpperCase().trim();

    for (const group of syncConstraints) {
        const uppercaseCourses = (group.courses || []).map((c) => c.toUpperCase().trim());
        if (uppercaseCourses.includes(targetName) || uppercaseCourses.includes(targetCode)) {
            return group.groupName;
        }
    }
    return null;
}

function getBatchPrefix(year) {
    if (year === "SY") return "S";
    if (year === "TY") return "T";
    if (year === "BTECH") return "B";
    return "B";
}

function getDivisionForBatch(batchNumber) {
    const num = Number(batchNumber);
    if (num <= 4) return "A";
    if (num <= 8) return "B";
    return "C";
}