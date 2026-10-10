/**
 * parseResourcesSheet.js
 *
 * ATLAS v5.5: This file now handles BOTH the legacy 3-column Resources sheet
 * AND the new Location sheet format (Lab Name, Lab Initial, Lab Features, Mapped Courses).
 *
 * For backwards compatibility, the existing parseResourcesSheet() function is preserved.
 * The Location sheet is parsed by parseLocationSheet.js (imported in FileUpload).
 *
 * The `resources.labs` array is populated from Lab Initials (from the Location sheet)
 * when available. This ensures the entire pipeline uses Lab Initials as resource IDs.
 */

import { isIgnoredOrNA } from "./parseLocationSheet.js";

/**
 * Parse the legacy Resources sheet (3 columns: Classroom | Lab | Tutorial Room).
 * Returns { classrooms, labs, tutorialRooms }.
 */
export function parseResourcesSheet(rows) {
    const resources = {
        classrooms: [],
        labs: [],
        tutorialRooms: [],
    };

    if (!rows || rows.length === 0) return resources;

    // Detect column indexes from header row if available
    let headerRow = rows[0] || [];
    let colClassroom = -1;
    let colLab = -1;
    let colTut = -1;

    headerRow.forEach((cell, idx) => {
        const val = String(cell || "").toLowerCase().trim();
        if (val.includes("class")) colClassroom = idx;
        else if (val.includes("lab")) colLab = idx;
        else if (val.includes("tut")) colTut = idx;
    });

    const startIdx = (colClassroom !== -1 || colLab !== -1 || colTut !== -1) ? 1 : 0;
    if (colClassroom === -1) colClassroom = 0;
    if (colLab === -1) colLab = 1;
    if (colTut === -1) colTut = 2;

    for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const classroom = colClassroom >= 0 ? String(row[colClassroom] || "").trim() : "";
        const lab       = colLab >= 0       ? String(row[colLab] || "").trim() : "";
        const tutorial  = colTut >= 0       ? String(row[colTut] || "").trim() : "";

        if (classroom && !isIgnoredOrNA(classroom) && !resources.classrooms.includes(classroom)) {
            resources.classrooms.push(classroom);
        }

        if (lab && !isIgnoredOrNA(lab) && !resources.labs.includes(lab)) {
            resources.labs.push(lab);
        }

        if (tutorial && !isIgnoredOrNA(tutorial) && !resources.tutorialRooms.includes(tutorial)) {
            resources.tutorialRooms.push(tutorial);
        }
    }

    return resources;
}

/**
 * Build a resources object with lab initials, classrooms, and tutorial rooms
 * sourced from the Location sheet.
 *
 * @param {Object} legacyResources - From parseResourcesSheet() (fallback)
 * @param {Object} locationData    - From parseLocationSheet()
 * @returns {Object} merged resources { classrooms, labs, tutorialRooms, locationData }
 */
export function buildResourcesFromLocation(legacyResources, locationData) {
    const labs = (locationData?.allLabInitials || []).filter((l) => !isIgnoredOrNA(l));

    // Prefer classrooms parsed directly from Location sheet
    const locClassrooms = (locationData?.classrooms || []).filter((c) => !isIgnoredOrNA(c));
    const classrooms = locClassrooms.length > 0
        ? locClassrooms
        : (legacyResources?.classrooms || []).filter((c) => !isIgnoredOrNA(c));

    // Prefer tutorial rooms parsed directly from Location sheet
    const locTutRooms = (locationData?.tutorialRooms || []).filter((t) => !isIgnoredOrNA(t));
    const tutorialRooms = locTutRooms.length > 0
        ? locTutRooms
        : (legacyResources?.tutorialRooms || []).filter((t) => !isIgnoredOrNA(t));

    return {
        classrooms,
        labs: labs.length > 0 ? labs : (legacyResources?.labs || []).filter((l) => !isIgnoredOrNA(l)),
        tutorialRooms,
        // Attach the full location data for course-aware resolution downstream
        locationData: locationData || null,
    };
}