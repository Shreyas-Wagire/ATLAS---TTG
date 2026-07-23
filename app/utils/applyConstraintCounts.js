import { isSubjectMatch, isAptitudeSubject } from "./normalizeSubjectName";
import { normalizeYearHeader } from "./parseLoadSheet";

export function applyConstraintCounts(yearWiseData, globalConstraints) {
    if (!globalConstraints || globalConstraints.length === 0 || !yearWiseData) {
        return yearWiseData;
    }

    globalConstraints.forEach((constraint) => {
        const rawYear = constraint.year || "";
        const normalizedYear = normalizeYearHeader(rawYear) || rawYear.trim().toUpperCase().split(/[-_\s]+/)[0];
        const coursesInYear = yearWiseData[normalizedYear] || yearWiseData[rawYear.trim().toUpperCase()];

        if (!coursesInYear) return;

        // Find matching course using Smart Fuzzy Subject Match & isAptitudeSubject
        const matchingCourses = coursesInYear.filter((c) => {
            if (isSubjectMatch(c.courseName, constraint.courseName) || isSubjectMatch(c.courseCode, constraint.courseName)) {
                return true;
            }
            if (isAptitudeSubject(constraint.courseName) && (isAptitudeSubject(c.courseName) || isAptitudeSubject(c.courseCode))) {
                return true;
            }
            return false;
        });

        matchingCourses.forEach((matchingCourse) => {
            // Global fixed constraints fully satisfy the course load for the division
            matchingCourse.L = 0;
            matchingCourse.T = 0;
            matchingCourse.P = 0;
        });
    });

    return yearWiseData;
}
