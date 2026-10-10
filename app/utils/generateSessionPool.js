import { isAptitudeSubject } from "./normalizeSubjectName.js";
import { getResolutionForCourse, LAB_STATUS } from "./courseLabResolver.js";

/**
 * Generate the session pool from yearWiseData.
 *
 * v5.5: Accepts an optional courseLabResolutions map so that each
 * practical session is stamped with its primary lab initial and
 * resource status at creation time.
 *
 * @param {Object} yearWiseData
 * @param {Array}  syncConstraints
 * @param {Object} courseLabResolutions - from buildCourseLabResolutions() (optional)
 */
export function generateSessionPool(yearWiseData, syncConstraints = [], courseLabResolutions = null) {
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
                createPracticalSessionsForBatches(sessionPool, year, course, syncConstraints, courseLabResolutions);
            }
        });
    });

    return sessionPool;
}

function isSpecialGlobalCourse(course) {
    const name = course.courseName || course.name || "";
    const code = course.courseCode || course.code || "";

    return (
        isAptitudeSubject(name) ||
        isAptitudeSubject(code) ||
        code.toUpperCase() === "MILFL" ||
        name.toLowerCase().includes("modern indian language") ||
        name.toLowerCase().includes("foreign language") ||
        name.toLowerCase().includes("milfl")
    );
}

function getSubjectIdentifier(course) {
    const code = (course.courseCode || course.code || "").trim();
    const name = (course.courseName || course.name || "").trim();
    return code || name || "Subject";
}

function createLecturesForDivision(sessionPool, year, course, division, syncConstraints) {
    const rawFaculty = course.divisions?.[division];
    if (!rawFaculty || String(rawFaculty).trim() === "") return;
    const faculty = String(rawFaculty).trim();
    const syncGroup = findSyncGroup(course, syncConstraints);
    const subject = getSubjectIdentifier(course);

    // If an Aptitude/MILFL course is covered by global constraints for this year, skip creating normal pool lectures
    if (isSpecialGlobalCourse(course)) {
        return;
    }

    // Standard Lectures (1 hour each)
    for (let i = 1; i <= course.L; i++) {
        sessionPool.push({
            year,
            division,
            subject,
            subjectName: course.courseName || subject,
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
    const subject = getSubjectIdentifier(course);

    for (let b = 1; b <= maxBatches; b++) {
        const division = getDivisionForBatch(b);
        const batchFaculty = course.batches?.[b];
        const divFaculty = course.divisions?.[division];

        const hasBatchInDiv = hasBatchFacultyForDivision(course, division);
        const rawFaculty = batchFaculty && String(batchFaculty).trim() !== ""
            ? String(batchFaculty).trim()
            : (hasBatchInDiv ? null : divFaculty);

        if (!rawFaculty || String(rawFaculty).trim() === "" || String(rawFaculty).trim() === "-") continue;

        const batchLabel = `${prefix}${b}`;
        const faculty = String(rawFaculty).trim();

        for (let i = 1; i <= course.T; i++) {
            sessionPool.push({
                year,
                division,
                batch: batchLabel,
                subject,
                subjectName: course.courseName || subject,
                faculty,
                location: course.location || "",
                type: "TUTORIAL",
                duration: 1,
                resourceType: "TUTORIAL_ROOM",
                syncGroup,
                allocated: false,
                hasBatchCols,
                // TY and BTECH tutorials MUST be co-located in the lab session window
                pairedWithLab: (year === "TY" || year === "BTECH"),
            });
        }
    }
}

function createPracticalSessionsForBatches(sessionPool, year, course, syncConstraints, courseLabResolutions = null) {
    if (isSpecialGlobalCourse(course)) return;

    const prefix = getBatchPrefix(year);
    const maxBatches = year === "BTECH" ? 8 : 12;
    const syncGroup = findSyncGroup(course, syncConstraints);
    const hasBatchCols = hasAnyBatchFaculty(course);
    const subject = getSubjectIdentifier(course);

    // ── v5.5: Attach course-to-lab resolution ──────────────────────────────
    // Look up the pre-built resolution record for this course so that every
    // practical session knows its primary lab and compatible fallbacks.
    const labResolution = courseLabResolutions
        ? getResolutionForCourse(course.courseName || subject, courseLabResolutions)
        : null;

    // Primary lab initial: used as the preferred location for scheduling.
    // If null (UNMAPPED), the session will remain UNRESOLVED unless a
    // MANUAL override is applied.
    const primaryLabInitial = labResolution?.primaryLab || null;
    const labResourceStatus = labResolution?.status || (primaryLabInitial ? LAB_STATUS.MAPPED : LAB_STATUS.UNMAPPED);

    for (let b = 1; b <= maxBatches; b++) {
        const division = getDivisionForBatch(b);
        const batchFaculty = course.batches?.[b];
        const divFaculty = course.divisions?.[division];
        const hasBatchInDiv = hasBatchFacultyForDivision(course, division);

        const rawFaculty = batchFaculty && String(batchFaculty).trim() !== ""
            ? String(batchFaculty).trim()
            : (hasBatchInDiv ? null : divFaculty);

        if (!rawFaculty || String(rawFaculty).trim() === "" || String(rawFaculty).trim() === "-") continue;

        const batchLabel = `${prefix}${b}`;
        const faculty = String(rawFaculty).trim();

        sessionPool.push({
            year,
            division,
            batch: batchLabel,
            subject,
            subjectName: course.courseName || subject,
            faculty,
            // location is intentionally empty ("") so the scheduler uses primaryLabInitial.
            // This prevents the old "any free lab" fallback in allocateResources.
            location: "",
            type: "PRACTICAL",
            duration: 2,
            resourceType: "LAB",
            syncGroup,
            allocated: false,
            hasBatchCols,
            // ── v5.5 Lab Resolution Fields ──────────────────────────────────
            primaryLabInitial,         // The canonical mapped lab initial (e.g. "GEL")
            labResourceStatus,         // LAB_STATUS constant
            labResolution,             // Full resolution record (for fallback lookup at schedule time)
            // labAssignedInitial is set by the scheduler when it commits a practical
            // labAssignedStatus is updated to MAPPED/FALLBACK/MANUAL at commit time
        });
    }
}

function hasAnyBatchFaculty(course) {
    if (!course || !course.batches) return false;
    return Object.values(course.batches).some(
        (f) => f && String(f).trim() !== "" && String(f).trim() !== "-"
    );
}

function hasBatchFacultyForDivision(course, division) {
    if (!course || !course.batches) return false;
    for (const [bStr, f] of Object.entries(course.batches)) {
        const b = Number(bStr);
        if (getDivisionForBatch(b) === division && f && String(f).trim() !== "" && String(f).trim() !== "-") {
            return true;
        }
    }
    return false;
}

function findSyncGroup(course, syncConstraints) {
    if (!syncConstraints || syncConstraints.length === 0) return null;
    const targetName = (course.courseName || course.name || "").toUpperCase().trim();
    const targetCode = (course.courseCode || course.code || "").toUpperCase().trim();

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