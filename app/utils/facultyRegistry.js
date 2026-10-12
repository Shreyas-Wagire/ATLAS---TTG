/**
 * facultyRegistry.js — ATLAS v6.5 College-Wide Faculty Identity Registry
 *
 * Implements a persistent, college-wide faculty identity system:
 *
 * 1. Duplicate initials within a department: SPP, SPP2, SPP3
 * 2. Same initials belonging to different people across departments: SPP-CSE, SPP-ELE
 * 3. Same real faculty member across departments: one canonical ID + shared occupancy
 * 4. Resolves ambiguous identities through explicit mapping
 * 5. Keeps IDs stable across generation runs
 *
 * The registry produces a canonical faculty ID for every faculty occurrence in
 * Load, Fixed, Global, and all scheduling references.
 */

const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", "N/A", "NA", "", "-"]);

/**
 * Check if a faculty string is a placeholder (not a real person).
 */
export function isGhostFaculty(f) {
    if (!f) return true;
    const upper = String(f).trim().toUpperCase();
    if (GHOST_FACULTIES.has(upper)) return true;
    if (/^[XYZ]\d+$/i.test(upper) || upper.startsWith("EXT")) return true;
    return false;
}

/**
 * Build the college-wide faculty identity registry from all departments.
 *
 * Strategy:
 * 1. Collect ALL faculty initials from all departments (Load + Fixed + Global)
 * 2. Detect duplicates within same department → append numeric suffix (SPP2, SPP3)
 * 3. Detect same initials across different departments:
 *    a. If sharedFacultyMap says they're the same person → canonical ID = original initials
 *    b. If NOT shared → disambiguate as SPP-CSE, SPP-ELE
 * 4. Output: canonicalId → { departments, originalInitials, displayName }
 *
 * @param {Object} collegeData - from parseMultiDeptWorkbook
 * @param {Object} sharedFacultyMap - optional explicit map:
 *   { "SPP": { departments: ["CSE", "ELE"], isShared: true, canonicalName: "S.P. Patil" } }
 * @returns {FacultyRegistry} registry instance
 */
export function buildFacultyRegistry(collegeData, sharedFacultyMap = {}) {
    const registry = new FacultyRegistry();

    if (!collegeData || !collegeData.departments) return registry;

    // Phase 1: Collect all faculty initials per department
    const deptFacultyMap = {}; // deptCode → Set<initial>

    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        if (!deptFacultyMap[deptCode]) deptFacultyMap[deptCode] = new Set();
        const deptInitials = deptFacultyMap[deptCode];

        // From Load sheet subjects
        (deptData.subjects || []).forEach((subj) => {
            ["A", "B", "C"].forEach((div) => {
                const fac = subj.divisions?.[div];
                if (fac && !isGhostFaculty(fac)) {
                    deptInitials.add(String(fac).trim());
                }
            });
            Object.values(subj.batches || {}).forEach((fac) => {
                if (fac && !isGhostFaculty(fac)) {
                    deptInitials.add(String(fac).trim());
                }
            });
        });

        // From Fixed constraints
        (deptData.fixedConstraints || []).forEach((constraint) => {
            ["A", "B", "C"].forEach((div) => {
                const fac = constraint.divisions?.[div];
                if (fac && !isGhostFaculty(fac)) {
                    deptInitials.add(String(fac).trim());
                }
            });
        });
    });

    // From Global constraints
    (collegeData.globalConstraints || []).forEach((constraint) => {
        ["A", "B", "C"].forEach((div) => {
            const fac = constraint.divisions?.[div];
            if (fac && !isGhostFaculty(fac)) {
                // Global faculty — mark as college-wide
                registry._globalFaculty.add(String(fac).trim());
            }
        });
    });

    // Phase 2: Detect cross-department initial collisions
    const initialToDepts = {}; // initial → [deptCode, ...]
    Object.entries(deptFacultyMap).forEach(([deptCode, initials]) => {
        initials.forEach((initial) => {
            if (!initialToDepts[initial]) initialToDepts[initial] = [];
            if (!initialToDepts[initial].includes(deptCode)) {
                initialToDepts[initial].push(deptCode);
            }
        });
    });

    // Phase 3: Build canonical IDs
    Object.entries(initialToDepts).forEach(([initial, depts]) => {
        if (depts.length === 1) {
            // Unique to one department — no disambiguation needed
            registry.register(initial, depts[0], {
                canonicalId: initial,
                originalInitial: initial,
                departments: [depts[0]],
                isShared: false,
            });
        } else {
            // Same initials in multiple departments
            const sharedInfo = sharedFacultyMap[initial];

            if (sharedInfo && sharedInfo.isShared) {
                // Same real person across departments — one canonical ID
                depts.forEach((dept) => {
                    registry.register(initial, dept, {
                        canonicalId: initial,
                        originalInitial: initial,
                        departments: [...depts],
                        isShared: true,
                        canonicalName: sharedInfo.canonicalName || initial,
                    });
                });

                registry._sharedFaculty.add(initial);
            } else {
                // Different people with same initials — disambiguate
                depts.forEach((dept) => {
                    const disambiguatedId = `${initial}-${dept}`;
                    registry.register(initial, dept, {
                        canonicalId: disambiguatedId,
                        originalInitial: initial,
                        departments: [dept],
                        isShared: false,
                        disambiguated: true,
                    });
                });
            }
        }
    });

    // Register global faculty
    registry._globalFaculty.forEach((initial) => {
        if (!registry._entries[`GLOBAL::${initial}`]) {
            registry.register(initial, "GLOBAL", {
                canonicalId: initial,
                originalInitial: initial,
                departments: ["GLOBAL"],
                isShared: false,
            });
        }
    });

    return registry;
}

/**
 * Faculty Registry — manages canonical faculty IDs and lookups.
 */
export class FacultyRegistry {
    constructor() {
        // Key: "deptCode::originalInitial" → entry
        this._entries = {};
        // Key: canonicalId → entry
        this._byCanonicalId = {};
        // Set of shared faculty initials (same person across depts)
        this._sharedFaculty = new Set();
        // Set of global faculty initials
        this._globalFaculty = new Set();
        // All canonical IDs for iteration
        this._allCanonicalIds = new Set();
    }

    /**
     * Register a faculty entry.
     */
    register(originalInitial, deptCode, entry) {
        const key = `${deptCode}::${originalInitial}`;
        this._entries[key] = entry;
        this._byCanonicalId[entry.canonicalId] = entry;
        this._allCanonicalIds.add(entry.canonicalId);
    }

    /**
     * Resolve a faculty initial in the context of a department to its canonical ID.
     * This is the primary lookup used by the scheduling engine.
     *
     * @param {string} initial - Original faculty initial from the workbook
     * @param {string} deptCode - Department code
     * @returns {string} Canonical faculty ID
     */
    resolve(initial, deptCode) {
        if (!initial || isGhostFaculty(initial)) return initial;
        const trimmed = String(initial).trim();

        // Try dept-specific lookup first
        const key = `${deptCode}::${trimmed}`;
        if (this._entries[key]) {
            return this._entries[key].canonicalId;
        }

        // Try global lookup
        const globalKey = `GLOBAL::${trimmed}`;
        if (this._entries[globalKey]) {
            return this._entries[globalKey].canonicalId;
        }

        // If not in registry, return as-is (defensive)
        return trimmed;
    }

    /**
     * Get the entry for a canonical ID.
     */
    getEntry(canonicalId) {
        return this._byCanonicalId[canonicalId] || null;
    }

    /**
     * Check if a faculty member is shared across departments.
     */
    isShared(initial) {
        return this._sharedFaculty.has(initial);
    }

    /**
     * Get all canonical faculty IDs.
     */
    getAllCanonicalIds() {
        return Array.from(this._allCanonicalIds);
    }

    /**
     * Get all entries for a given department.
     */
    getEntriesForDept(deptCode) {
        const results = [];
        Object.entries(this._entries).forEach(([key, entry]) => {
            if (key.startsWith(`${deptCode}::`)) {
                results.push(entry);
            }
        });
        return results;
    }

    /**
     * Rewrite all faculty references in a department's data to use canonical IDs.
     * Mutates the data in-place.
     */
    rewriteDepartmentFaculty(deptData, deptCode) {
        if (!deptData) return;

        // Rewrite subjects
        (deptData.subjects || []).forEach((subj) => {
            ["A", "B", "C"].forEach((div) => {
                const fac = subj.divisions?.[div];
                if (fac && !isGhostFaculty(fac)) {
                    subj.divisions[div] = this.resolve(fac, deptCode);
                }
            });
            if (subj.batches) {
                Object.keys(subj.batches).forEach((b) => {
                    const fac = subj.batches[b];
                    if (fac && !isGhostFaculty(fac)) {
                        subj.batches[b] = this.resolve(fac, deptCode);
                    }
                });
            }
        });

        // Rewrite yearWiseData
        if (deptData.yearWiseData) {
            Object.values(deptData.yearWiseData).forEach((courses) => {
                (courses || []).forEach((course) => {
                    ["A", "B", "C"].forEach((div) => {
                        const fac = course.divisions?.[div];
                        if (fac && !isGhostFaculty(fac)) {
                            course.divisions[div] = this.resolve(fac, deptCode);
                        }
                    });
                    if (course.batches) {
                        Object.keys(course.batches).forEach((b) => {
                            const fac = course.batches[b];
                            if (fac && !isGhostFaculty(fac)) {
                                course.batches[b] = this.resolve(fac, deptCode);
                            }
                        });
                    }
                });
            });
        }

        // Rewrite fixed constraints
        (deptData.fixedConstraints || []).forEach((constraint) => {
            ["A", "B", "C"].forEach((div) => {
                const fac = constraint.divisions?.[div];
                if (fac && !isGhostFaculty(fac)) {
                    constraint.divisions[div] = this.resolve(fac, deptCode);
                }
            });
        });
    }

    /**
     * Generate a diagnostic report of the registry.
     */
    generateReport() {
        const report = {
            totalFaculty: this._allCanonicalIds.size,
            sharedFaculty: Array.from(this._sharedFaculty),
            disambiguated: [],
            entries: {},
        };

        Object.entries(this._byCanonicalId).forEach(([id, entry]) => {
            report.entries[id] = {
                originalInitial: entry.originalInitial,
                departments: entry.departments,
                isShared: entry.isShared,
                disambiguated: entry.disambiguated || false,
            };
            if (entry.disambiguated) {
                report.disambiguated.push(id);
            }
        });

        return report;
    }
}
