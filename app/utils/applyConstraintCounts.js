import { isSubjectMatch, isAptitudeSubject } from "./normalizeSubjectName.js";
import { normalizeYearHeader } from "./parseLoadSheet.js";

export function applyConstraintCounts(yearWiseData, globalConstraints) {
    if (!globalConstraints || globalConstraints.length === 0 || !yearWiseData) {
        return yearWiseData;
    }

    globalConstraints.forEach((constraint) => {
        const rawYear = constraint.year || "";
        const normalizedYear = normalizeYearHeader(rawYear) || rawYear.trim().toUpperCase().split(/[-_\s]+/)[0];
        const coursesInYear = yearWiseData[normalizedYear] || yearWiseData[rawYear.trim().toUpperCase()];

        if (!coursesInYear) return;

        // Find matching course using Smart Exact/Fuzzy Match with specific Roman numeral parity
        const matchingCourses = coursesInYear.filter((c) => {
            const courseNameNorm = (c.courseName || "").toLowerCase().trim();
            const courseCodeNorm = (c.courseCode || "").toLowerCase().trim();
            const constrNameNorm = (constraint.courseName || "").toLowerCase().trim();

            if (courseNameNorm === constrNameNorm || courseCodeNorm === constrNameNorm) {
                return true;
            }

            // Aptitude & Reasoning: both must be aptitude and must match the part number if specified
            if (isAptitudeSubject(constraint.courseName) && (isAptitudeSubject(c.courseName) || isAptitudeSubject(c.courseCode))) {
                const cPart = (c.courseName + " " + c.courseCode).match(/(?:Part\s*[-–—:]?\s*|[-–—:]?\s*)([IVX]+|\d+)/i)?.[1];
                const constrPart = constraint.courseName.match(/(?:Part\s*[-–—:]?\s*|[-–—:]?\s*)([IVX]+|\d+)/i)?.[1];
                if (cPart && constrPart) {
                    return cPart.toUpperCase() === constrPart.toUpperCase();
                }
                return true;
            }

            // Minor Courses: both must be Minor Courses and must match the same Roman numeral/number
            const isMinorConstraint = /minor\s*course/i.test(constraint.courseName);
            const isMinorCourse = /minor\s*course/i.test(c.courseName) || /^MC[-_]/i.test(c.courseCode);
            if (isMinorConstraint && isMinorCourse) {
                const cNum = (c.courseName + " " + c.courseCode).match(/Minor Course\s*[-–—:]?\s*([IVX]+|\d+)/i)?.[1];
                const constrNum = constraint.courseName.match(/Minor Course\s*[-–—:]?\s*([IVX]+|\d+)/i)?.[1];
                if (cNum && constrNum) {
                    if (cNum.toUpperCase() === constrNum.toUpperCase()) return true;
                    // In BTech, Minor Course - III (Global) and Minor Course - IV (Load) refer to the single BTech minor course
                    if (normalizedYear === "BTECH" && ((cNum.toUpperCase() === "III" && constrNum.toUpperCase() === "IV") || (cNum.toUpperCase() === "IV" && constrNum.toUpperCase() === "III"))) {
                        return true;
                    }
                    return false;
                }
                return true;
            }

            // Open Electives: both must be Open Electives and must match the same Roman numeral/number
            const isOEConstraint = /open\s*elective/i.test(constraint.courseName) || /^OE[-_]/i.test(constraint.courseName);
            const isOECourse = /open\s*elective/i.test(c.courseName) || /^OE[-_]/i.test(c.courseCode);
            if (isOEConstraint && isOECourse) {
                const cNum = (c.courseName + " " + c.courseCode).match(/(?:Open Elective|OE)\s*[-–—:]?\s*([IVX]+|\d+)/i)?.[1];
                const constrNum = constraint.courseName.match(/(?:Open Elective|OE)\s*[-–—:]?\s*([IVX]+|\d+)/i)?.[1];
                if (cNum && constrNum) {
                    return cNum.toUpperCase() === constrNum.toUpperCase();
                }
                return true;
            }

            // Smart fuzzy match, guarding against single-letter course codes like "E"
            if (isSubjectMatch(c.courseName, constraint.courseName)) {
                return true;
            }
            if (c.courseCode && c.courseCode.length >= 2 && isSubjectMatch(c.courseCode, constraint.courseName)) {
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
