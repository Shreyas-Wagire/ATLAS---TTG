/**
 * parseLocationSheet.js — ATLAS v5.5 Location Sheet Parser
 *
 * Parses the "Location" sheet from the uploaded workbook.
 *
 * The Location sheet is the AUTHORITATIVE laboratory resource master.
 * It maps each physical lab to:
 *   - Lab Name       (full descriptive name, e.g. "Geotechnical Engineering Lab")
 *   - Labs Initial   (canonical timetable resource ID, e.g. "GEL")
 *   - Labs Features  (comma/newline-separated capability keywords)
 *   - Mapped Courses (one or more course names this lab is PRIMARILY assigned to)
 *
 * HARD RULES enforced at this layer:
 *   1. Lab Initial is the ONLY resource ID used in the timetable.
 *   2. Mapped Courses establish the PRIMARY course-to-lab relationship.
 *   3. Lab Features are preserved verbatim for downstream fallback matching.
 *   4. No course is created from this sheet — it is used for LOOKUP only.
 *
 * The parser is DEFENSIVE:
 *   - It auto-detects the header row (does not assume row index).
 *   - It handles merged/multi-row Mapped Courses (multiple rows per lab).
 *   - It normalises column names case-insensitively.
 *   - It deduplicates mapped courses per lab.
 */

// Column aliases recognised for each semantic field
export const TUTORIAL_ROOMS_ALIASES = ["tutorial rooms", "tutorial room", "tutorial", "tut room", "tut", "tutorialrooms"];
export const CLASSROOMS_ALIASES      = ["classrooms", "classroom", "class rooms", "class room", "cr"];
export const LAB_NAME_ALIASES        = ["lab name", "labname", "laboratory name", "name"];
export const LAB_INITIAL_ALIASES     = ["labs initial", "lab initial", "initial", "lab id", "labid", "code", "abbreviation"];
export const LAB_FEATURES_ALIASES    = ["labs features", "lab features", "features", "capabilities", "description"];
export const MAPPED_COURSES_ALIASES  = ["mapped courses", "mappedcourses", "courses", "course", "mapped course", "subjects", "subject"];

/**
 * Determine if a cell value represents "NA" or an empty/black-block placeholder.
 * Returns true if the cell has no actual room/lab content.
 */
export function isIgnoredOrNA(val) {
    if (val === null || val === undefined) return true;
    const s = String(val).trim().toUpperCase();
    if (!s) return true;
    return s === "NA" || s === "N/A" || s === "N.A." || s === "NONE" || s === "-" || s === "--" || s === "NIL" || s === "NULL";
}

/**
 * Normalise a cell value to a trimmed lowercase string for header matching.
 */
function normHeader(val) {
    return String(val || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Find a column index by checking all aliases against the header row.
 * Returns -1 if not found.
 */
function findCol(headerRow, aliases) {
    for (let i = 0; i < headerRow.length; i++) {
        const h = normHeader(headerRow[i]);
        if (aliases.some((a) => h === a || h.includes(a))) return i;
    }
    return -1;
}

/**
 * Split a multi-line or comma-delimited mapped courses value into
 * an array of trimmed, non-empty course names.
 */
function splitMappedCourses(rawVal) {
    if (!rawVal) return [];
    const raw = String(rawVal).trim();
    if (!raw) return [];

    // Try newline split first (xlsx often preserves line breaks as \n)
    // then fall back to comma split
    const byNewline = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    // Comma-separated
    const byComma = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (byComma.length > 1) return byComma;

    // Semicolon-separated
    const bySemicolon = raw.split(";").map((s) => s.trim()).filter(Boolean);
    if (bySemicolon.length > 1) return bySemicolon;

    return byNewline.length > 0 ? byNewline : [raw];
}

/**
 * Normalise a course name for matching purposes:
 * - Trim whitespace
 * - Collapse internal whitespace to single spaces
 * - Do NOT uppercase (case-insensitive comparison is done at match time)
 */
export function normaliseCourseName(name) {
    if (!name) return "";
    return String(name).trim().replace(/\s+/g, " ");
}

/**
 * Case-insensitive course name match with whitespace normalisation.
 * Uses exact match after normalisation as the authoritative check.
 * Falls back to a secondary "cleaned" comparison that strips common
 * punctuation differences (hyphens, dots).
 */
export function courseNamesMatch(a, b) {
    if (!a || !b) return false;
    const normA = normaliseCourseName(a).toLowerCase();
    const normB = normaliseCourseName(b).toLowerCase();
    if (normA === normB) return true;

    // Secondary: strip punctuation and re-compare
    const clean = (s) => s.replace(/[-_./()]/g, " ").replace(/\s+/g, " ").trim();
    return clean(normA) === clean(normB);
}

/**
 * Parse the Location sheet rows into a structured lab and room registry.
 *
 * Returns an object:
 * {
 *   labs: [
 *     {
 *       labName:      string,   // Full lab name
 *       labInitial:   string,   // Canonical resource ID (e.g. "GEL")
 *       labFeatures:  string,   // Raw features text (preserved verbatim)
 *       featureWords: string[], // Tokenised feature keywords for matching
 *       mappedCourses: string[] // Course names that primarily use this lab
 *     },
 *     ...
 *   ],
 *   classrooms: string[],       // Valid classroom names (ignoring "NA" / empty)
 *   tutorialRooms: string[],    // Valid tutorial room names (ignoring "NA" / empty)
 *   // Quick lookup: courseNameNorm → labInitial (primary mapping)
 *   courseToLabInitial: { [normalised course name]: string },
 *   // Quick lookup: labInitial → lab object
 *   labsByInitial: { [labInitial]: labEntry },
 *   // All lab initials in order
 *   allLabInitials: string[],
 *   // Diagnostics
 *   parseWarnings: string[],
 * }
 */
export function parseLocationSheet(rows) {
    const result = {
        labs: [],
        classrooms: [],
        tutorialRooms: [],
        courseToLabInitial: {},
        labsByInitial: {},
        allLabInitials: [],
        parseWarnings: [],
    };

    if (!rows || rows.length === 0) {
        result.parseWarnings.push("Location sheet is empty or not provided.");
        return result;
    }

    // ── Step 1: Auto-detect header row ─────────────────────────────────────
    // Scan up to first 10 rows; the header row must contain recognized columns
    let headerRowIndex = -1;
    let colTut         = -1;
    let colClassroom   = -1;
    let colLabName     = -1;
    let colLabInitial  = -1;
    let colFeatures    = -1;
    let colMapped      = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        const tut = findCol(row, TUTORIAL_ROOMS_ALIASES);
        const cr  = findCol(row, CLASSROOMS_ALIASES);
        const n   = findCol(row, LAB_NAME_ALIASES);
        const li  = findCol(row, LAB_INITIAL_ALIASES);
        const f   = findCol(row, LAB_FEATURES_ALIASES);
        const m   = findCol(row, MAPPED_COURSES_ALIASES);

        // Require at least Lab Initial OR (Classroom/Tutorial AND Lab Name)
        if (li !== -1 || (n !== -1 && (cr !== -1 || tut !== -1))) {
            headerRowIndex = i;
            colTut        = tut;
            colClassroom  = cr;
            colLabName    = n;
            colLabInitial = li;
            colFeatures   = f;
            colMapped     = m;
            break;
        }
    }

    if (headerRowIndex === -1) {
        // Fallback: assume first non-empty row is header
        headerRowIndex = 0;
        colTut        = 0;
        colClassroom  = 1;
        colLabName    = 2;
        colLabInitial = 3;
        colFeatures   = 4;
        colMapped     = 5;
        result.parseWarnings.push(
            "Location sheet: could not detect header row by column names. " +
            "Falling back to default columns (0=Tutorial, 1=Classroom, 2=LabName, 3=Initial, 4=Features, 5=MappedCourses)."
        );
    }

    // ── Step 2: Parse data rows ─────────────────────────────────────────────
    let currentLab = null;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];

        // Skip fully empty rows
        if (!row || row.every((cell) => String(cell || "").trim() === "")) continue;

        // 1. Parse Tutorial Rooms (ignore "NA" / empty)
        if (colTut >= 0) {
            const rawTut = String(row[colTut] || "").trim();
            if (!isIgnoredOrNA(rawTut) && !result.tutorialRooms.includes(rawTut)) {
                result.tutorialRooms.push(rawTut);
            }
        }

        // 2. Parse Classrooms (ignore "NA" / empty)
        if (colClassroom >= 0) {
            const rawCr = String(row[colClassroom] || "").trim();
            if (!isIgnoredOrNA(rawCr) && !result.classrooms.includes(rawCr)) {
                result.classrooms.push(rawCr);
            }
        }

        // 3. Parse Labs
        const rawLabName    = colLabName    >= 0 ? String(row[colLabName]    || "").trim() : "";
        const rawLabInitial = colLabInitial >= 0 ? String(row[colLabInitial] || "").trim() : "";
        const rawFeatures   = colFeatures   >= 0 ? String(row[colFeatures]   || "").trim() : "";
        const rawMapped     = colMapped     >= 0 ? String(row[colMapped]     || "").trim() : "";

        // Check for continuation row: Lab Name and Initial are blank/NA, but Mapped Courses has values
        const isContinuationRow = (!rawLabName || isIgnoredOrNA(rawLabName)) &&
                                  (!rawLabInitial || isIgnoredOrNA(rawLabInitial)) &&
                                  rawMapped && !isIgnoredOrNA(rawMapped);

        if (isContinuationRow && currentLab) {
            // This row adds more mapped courses to the current lab
            const moreCourses = splitMappedCourses(rawMapped);
            moreCourses.forEach((c) => {
                const norm = normaliseCourseName(c);
                if (norm && !isIgnoredOrNA(norm) && !currentLab.mappedCourses.includes(norm)) {
                    currentLab.mappedCourses.push(norm);
                }
            });
            continue;
        }

        // If no Lab Initial or it's NA, there is no lab defined in this row
        if (!rawLabInitial || isIgnoredOrNA(rawLabInitial)) {
            continue;
        }

        // ── Parse feature keywords ──────────────────────────────────────────
        const cleanFeatures = isIgnoredOrNA(rawFeatures) ? "" : rawFeatures;
        const featureWords = cleanFeatures
            ? cleanFeatures
                  .split(/[,;\n\r]+/)
                  .map((w) => w.trim().toLowerCase())
                  .filter((w) => Boolean(w) && !isIgnoredOrNA(w))
            : [];

        // ── Parse mapped courses ────────────────────────────────────────────
        const mappedCourses = isIgnoredOrNA(rawMapped)
            ? []
            : splitMappedCourses(rawMapped)
                  .map(normaliseCourseName)
                  .filter((c) => Boolean(c) && !isIgnoredOrNA(c));

        // Deduplicate
        const uniqueMapped = [...new Set(mappedCourses)];

        const cleanLabName = isIgnoredOrNA(rawLabName) ? "" : rawLabName;

        const labEntry = {
            labName:      cleanLabName,
            labInitial:   rawLabInitial,
            labFeatures:  cleanFeatures,
            featureWords,
            mappedCourses: uniqueMapped,
        };

        result.labs.push(labEntry);
        currentLab = labEntry;

        // ── Register in lookups (with duplicate disambiguation) ─────────────
        let effectiveInitial = rawLabInitial;
        let initialKey = rawLabInitial.toUpperCase().trim();
        if (result.labsByInitial[initialKey]) {
            let counter = 2;
            let candidate = `${rawLabInitial}${counter}`;
            while (result.labsByInitial[candidate.toUpperCase().trim()]) {
                counter++;
                candidate = `${rawLabInitial}${counter}`;
            }
            result.parseWarnings.push(
                `Location sheet row ${i + 1}: Lab "${cleanLabName}" shares duplicate initial "${rawLabInitial}" with an earlier lab. ` +
                `Auto-assigned distinct initial "${candidate}".`
            );
            effectiveInitial = candidate;
            initialKey = candidate.toUpperCase().trim();
            labEntry.labInitial = effectiveInitial;
        }

        result.labsByInitial[initialKey] = labEntry;
        result.allLabInitials.push(effectiveInitial);

        // Register course → lab initial mappings
        uniqueMapped.forEach((courseName) => {
            const normCourse = courseName.toLowerCase();
            result.courseToLabInitial[normCourse] = effectiveInitial;
        });
    }

    if (result.labs.length === 0) {
        result.parseWarnings.push("Location sheet: no lab entries could be parsed.");
    }

    return result;
}

/**
 * Look up the primary lab initial for a given course name.
 *
 * @param {string} courseName - The course name from LOAD
 * @param {Object} locationData - Parsed location data from parseLocationSheet()
 * @returns {string|null} Lab initial (e.g. "GEL") or null if not mapped
 */
export function getPrimaryLabForCourse(courseName, locationData) {
    if (!courseName || !locationData?.labs?.length) return null;

    const normInput = normaliseCourseName(courseName).toLowerCase();

    // 1. Direct key match in courseToLabInitial
    if (locationData.courseToLabInitial[normInput]) {
        return locationData.courseToLabInitial[normInput];
    }

    // 2. Linear scan with courseNamesMatch (handles punctuation differences)
    for (const lab of locationData.labs) {
        for (const mapped of lab.mappedCourses) {
            if (courseNamesMatch(courseName, mapped)) {
                return lab.labInitial;
            }
        }
    }

    return null;
}

/**
 * Compute a compatibility score between a course and a candidate fallback lab.
 *
 * Strategy:
 *   1. If the candidate lab has the course in its Mapped Courses → score 1000
 *      (this is effectively the primary lab check, usually caught earlier)
 *   2. Match course name words against lab name words → partial score
 *   3. Match course name words against lab feature keywords → partial score
 *
 * Returns a numeric score ≥ 0.  A threshold of MIN_COMPATIBILITY_SCORE
 * must be met for the lab to be considered a valid fallback.
 *
 * @param {string} courseName - Course name from LOAD
 * @param {Object} labEntry   - Lab entry from parseLocationSheet()
 * @returns {number} compatibility score
 */
const STEM_SUFFIXES = /(ing|tional|tion|al|ed|es|s|ic|ics|ment)$/;

export function stemWord(w) {
    if (!w || w.length <= 3) return w;
    return w.replace(STEM_SUFFIXES, "");
}

export function wordsMatch(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const sa = stemWord(a);
    const sb = stemWord(b);
    if (sa.length >= 3 && sb.length >= 3) {
        if (sa === sb || sa.includes(sb) || sb.includes(sa)) return true;
    }
    return false;
}

export const MIN_COMPATIBILITY_SCORE = 2; // At least 2 keyword matches required

export function computeLabCompatibilityScore(courseName, labEntry, primaryLabInitial = null) {
    if (!courseName || !labEntry) return 0;

    // 1. Direct mapping check (catches cross-reference scenarios)
    for (const mapped of labEntry.mappedCourses) {
        if (courseNamesMatch(courseName, mapped)) return 1000;
    }

    let score = 0;

    // 2. Sibling lab affinity (e.g. CTL and CTL2)
    if (primaryLabInitial) {
        const cleanBase = (s) => String(s || "").replace(/\d+$/, "").toUpperCase().trim();
        if (cleanBase(labEntry.labInitial) && cleanBase(labEntry.labInitial) === cleanBase(primaryLabInitial)) {
            score += 5;
        }
    }

    // 3. Tokenise course name into meaningful words (≥3 chars, not stopwords)
    const STOPWORDS = new Set(["the", "and", "for", "of", "in", "to", "a", "an", "lab", "laboratory", "engineering"]);
    const courseWords = normaliseCourseName(courseName)
        .toLowerCase()
        .split(/[\s\-_/()]+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

    if (courseWords.length === 0) return score;

    // 4. Match against lab name using stem / substring matching
    const labNameWords = (labEntry.labName || "")
        .toLowerCase()
        .split(/[\s\-_/()]+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

    for (const cw of courseWords) {
        for (const lw of labNameWords) {
            if (wordsMatch(cw, lw)) {
                score += 3; // Name matches are stronger signals
            }
        }
    }

    // 5. Match against feature keywords
    for (const cw of courseWords) {
        for (const fw of labEntry.featureWords) {
            if (wordsMatch(cw, fw)) {
                score += 1;
            }
        }
    }

    // 6. Match against mapped courses in this candidate lab
    for (const mapped of labEntry.mappedCourses) {
        const mappedWords = normaliseCourseName(mapped)
            .toLowerCase()
            .split(/[\s\-_/()]+/)
            .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
        for (const cw of courseWords) {
            for (const mw of mappedWords) {
                if (wordsMatch(cw, mw)) {
                    score += 2;
                }
            }
        }
    }

    return score;
}

/**
 * Find compatible fallback labs for a course when the primary lab is unavailable.
 *
 * Returns all labs whose compatibility score >= MIN_COMPATIBILITY_SCORE,
 * sorted descending by score (best match first), EXCLUDING the primary lab.
 *
 * @param {string} courseName       - Course name from LOAD
 * @param {string} primaryLabInitial - The course's primary mapped lab (to exclude)
 * @param {Object} locationData     - Parsed location data
 * @returns {Array<{labEntry, score}>} sorted compatible labs
 */
export function findCompatibleFallbackLabs(courseName, primaryLabInitial, locationData) {
    if (!courseName || !locationData?.labs?.length) return [];

    const primaryNorm = primaryLabInitial ? primaryLabInitial.toUpperCase().trim() : null;
    const candidates = [];

    for (const lab of locationData.labs) {
        // Exclude primary
        if (primaryNorm && lab.labInitial.toUpperCase().trim() === primaryNorm) continue;

        const score = computeLabCompatibilityScore(courseName, lab, primaryLabInitial);
        if (score >= MIN_COMPATIBILITY_SCORE) {
            candidates.push({ labEntry: lab, score });
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
}
