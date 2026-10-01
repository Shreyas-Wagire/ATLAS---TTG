/**
 * rcaa.js — Resource-Conflict Anticipation Algorithm (RCAA)
 *
 * Makes resource allocation PROACTIVE by evaluating future resource pressure
 * BEFORE assigning a session to a time slot.
 *
 * RCAA provides:
 *   1. Resource pressure scoring per candidate slot
 *   2. Compatibility-aware resource filtering
 *   3. Two-hour practical resource validation
 *   4. Resource conflict/warning reports
 *
 * RCAA NEVER:
 *   - Assigns an incompatible resource merely because it is free
 *   - Guesses course→lab mapping or any unknown compatibility
 *   - Invents resources that don't exist in the configured pool
 *   - Violates existing resource allocation logic
 *
 * Integration points:
 *   - allocateResources.js: Enhanced allocation with pressure-aware selection
 *   - allocateSessions.js: Soft preference for low-pressure slots
 */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS_PER_DAY = 6;

// ─── RESOURCE DEMAND ANALYSIS ────────────────────────────────────────────────

/**
 * Build a demand map: for each (day, slot, resourceType), count how many
 * sessions are scheduled or need that resource type.
 *
 * @param {Object} timetable - Current timetable state
 * @returns {Object} demandMap: { "day|slot|CLASSROOM": count, ... }
 */
function buildResourceDemandMap(timetable) {
    const demandMap = {};
    const divisionKeys = Object.keys(timetable);

    divisionKeys.forEach((key) => {
        DAYS.forEach((day) => {
            const daySlots = timetable[key]?.[day] || [];
            daySlots.forEach((cell, slotIdx) => {
                if (!cell || cell.span === 0) return;

                let resourceType = "CLASSROOM"; // default
                if (cell.type === "PRACTICAL") resourceType = "LAB";
                else if (cell.type === "TUTORIAL") resourceType = "TUTORIAL_ROOM";

                const demandKey = `${day}|${slotIdx}|${resourceType}`;
                if (!demandMap[demandKey]) demandMap[demandKey] = 0;

                if (cell.batchAllocations && cell.batchAllocations.length > 0) {
                    demandMap[demandKey] += cell.batchAllocations.length;
                } else {
                    demandMap[demandKey] += 1;
                }
            });
        });
    });

    return demandMap;
}

/**
 * Build a global resource occupancy map: for each (day, slot), track which
 * specific resources are already assigned.
 *
 * @param {Object} timetable - Current timetable state
 * @returns {Object} occupancyMap: { "day|slot": Set<resourceName> }
 */
function buildResourceOccupancyMap(timetable) {
    const occupancyMap = {};
    const divisionKeys = Object.keys(timetable);

    divisionKeys.forEach((key) => {
        DAYS.forEach((day) => {
            const daySlots = timetable[key]?.[day] || [];
            daySlots.forEach((cell, slotIdx) => {
                if (!cell) return;

                const occKey = `${day}|${slotIdx}`;
                if (!occupancyMap[occKey]) occupancyMap[occKey] = new Set();

                if (cell.location && cell.location !== "TBD") {
                    occupancyMap[occKey].add(String(cell.location).toUpperCase().trim());
                }

                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((alloc) => {
                        if (alloc.location && alloc.location !== "TBD") {
                            occupancyMap[occKey].add(String(alloc.location).toUpperCase().trim());
                        }
                    });
                }
            });
        });
    });

    return occupancyMap;
}

// ─── RESOURCE PRESSURE CALCULATION ───────────────────────────────────────────

/**
 * Calculate resource pressure for a specific (day, slot, resourceType) combination.
 *
 * ResourcePressure = RequiredDemand / AvailableResources
 *
 * Higher pressure = more contention = should be avoided when alternatives exist.
 *
 * @param {string} day - Day of the week
 * @param {number} slotIdx - Slot index (0-5)
 * @param {string} resourceType - "CLASSROOM", "LAB", or "TUTORIAL_ROOM"
 * @param {Object} demandMap - From buildResourceDemandMap
 * @param {Object} occupancyMap - From buildResourceOccupancyMap
 * @param {Object} resourcePools - Available resource pools { classrooms, labs, tutorialRooms }
 * @returns {{ pressure: number, available: number, demand: number, freeResources: string[] }}
 */
export function calculateResourcePressure(
    day, slotIdx, resourceType, demandMap, occupancyMap, resourcePools
) {
    // Select the appropriate resource pool
    let pool = [];
    if (resourceType === "CLASSROOM") {
        pool = resourcePools.classrooms || [];
    } else if (resourceType === "LAB") {
        pool = resourcePools.labs || [];
    } else if (resourceType === "TUTORIAL_ROOM") {
        pool = resourcePools.tutorialRooms || [];
    }

    const totalResources = pool.length;
    if (totalResources === 0) {
        return { pressure: 1.0, available: 0, demand: 0, freeResources: [] };
    }

    // Count occupied resources at this slot
    const occKey = `${day}|${slotIdx}`;
    const occupiedSet = occupancyMap[occKey] || new Set();

    // Find free resources in the pool
    const freeResources = pool.filter(
        (r) => !occupiedSet.has(String(r).toUpperCase().trim())
    );

    const availableCount = freeResources.length;

    // Current demand at this slot for this resource type
    const demandKey = `${day}|${slotIdx}|${resourceType}`;
    const currentDemand = demandMap[demandKey] || 0;

    // Future demand: adding 1 for the session we're evaluating
    const projectedDemand = currentDemand + 1;

    // Resource pressure: higher = more contention
    const pressure = availableCount > 0
        ? Math.min(1.0, projectedDemand / availableCount)
        : 1.0;

    return {
        pressure: parseFloat(pressure.toFixed(4)),
        available: availableCount,
        demand: currentDemand,
        freeResources,
    };
}

/**
 * Calculate resource pressure for a 2-hour practical window (slotIdx and slotIdx+1).
 * Both slots must have available labs.
 *
 * @param {string} day
 * @param {number} slotIdx - Start slot (must be 0, 2, or 4)
 * @param {Object} demandMap
 * @param {Object} occupancyMap
 * @param {Object} resourcePools
 * @returns {{ pressure: number, available: number, freeResourcesBothSlots: string[] }}
 */
export function calculatePracticalResourcePressure(
    day, slotIdx, demandMap, occupancyMap, resourcePools
) {
    const nextSlot = slotIdx + 1;
    if (nextSlot >= SLOTS_PER_DAY) {
        return { pressure: 1.0, available: 0, freeResourcesBothSlots: [] };
    }

    const pool = resourcePools.labs || [];
    if (pool.length === 0) {
        return { pressure: 1.0, available: 0, freeResourcesBothSlots: [] };
    }

    const occKey1 = `${day}|${slotIdx}`;
    const occKey2 = `${day}|${nextSlot}`;
    const occupied1 = occupancyMap[occKey1] || new Set();
    const occupied2 = occupancyMap[occKey2] || new Set();

    // A lab must be free in BOTH slots for a practical
    const freeResourcesBothSlots = pool.filter((r) => {
        const norm = String(r).toUpperCase().trim();
        return !occupied1.has(norm) && !occupied2.has(norm);
    });

    const availableCount = freeResourcesBothSlots.length;

    // Demand across both slots
    const demand1 = demandMap[`${day}|${slotIdx}|LAB`] || 0;
    const demand2 = demandMap[`${day}|${nextSlot}|LAB`] || 0;
    const maxDemand = Math.max(demand1, demand2) + 1;

    const pressure = availableCount > 0
        ? Math.min(1.0, maxDemand / availableCount)
        : 1.0;

    return {
        pressure: parseFloat(pressure.toFixed(4)),
        available: availableCount,
        freeResourcesBothSlots,
    };
}

// ─── CANDIDATE SLOT SCORING ──────────────────────────────────────────────────

/**
 * Score a candidate slot for a session based on resource pressure.
 * Lower score = better candidate (less resource contention).
 *
 * @param {Object} session - The session to place
 * @param {string} day
 * @param {number} slotIdx
 * @param {Object} context - RCAA context from buildRCAAContext
 * @returns {{ score: number, pressure: number, details: Object }}
 */
export function scoreSlotResourcePressure(session, day, slotIdx, context) {
    const { demandMap, occupancyMap, resourcePools } = context;

    let resourceType = "CLASSROOM";
    if (session.type === "PRACTICAL" || session.resourceType === "LAB") resourceType = "LAB";
    else if (session.type === "TUTORIAL" || session.resourceType === "TUTORIAL_ROOM") resourceType = "TUTORIAL_ROOM";

    if (session.type === "PRACTICAL") {
        const result = calculatePracticalResourcePressure(
            day, slotIdx, demandMap, occupancyMap, resourcePools
        );
        return {
            score: result.pressure,
            pressure: result.pressure,
            details: {
                type: "PRACTICAL_2HR",
                available: result.available,
                freeResourcesBothSlots: result.freeResourcesBothSlots,
                day,
                slotIdx,
            },
        };
    }

    const result = calculateResourcePressure(
        day, slotIdx, resourceType, demandMap, occupancyMap, resourcePools
    );

    return {
        score: result.pressure,
        pressure: result.pressure,
        details: {
            type: resourceType,
            available: result.available,
            demand: result.demand,
            freeResources: result.freeResources,
            day,
            slotIdx,
        },
    };
}

// ─── COMPATIBILITY-AWARE RESOURCE FILTERING ──────────────────────────────────

/**
 * Filter resources to only those compatible with a session.
 * Uses ONLY explicitly configured data — never guesses compatibility.
 *
 * If the session has a pre-assigned location (from load sheet), only that
 * location is considered compatible. Otherwise, the full pool for the
 * resource type is used.
 *
 * @param {Object} session - The session needing a resource
 * @param {Object} resourcePools - { classrooms, labs, tutorialRooms }
 * @returns {{ compatible: string[], source: string }}
 */
export function filterCompatibleResources(session, resourcePools) {
    // If session has a pre-assigned specific location, use only that
    if (session.location && session.location !== "TBD" && session.location !== "" && session.location !== "FIXED") {
        return {
            compatible: [session.location],
            source: "pre-assigned",
        };
    }

    // Otherwise, use the full pool for the resource type
    let pool = [];
    let source = "pool";

    if (session.type === "PRACTICAL" || session.resourceType === "LAB") {
        pool = resourcePools.labs || [];
        source = "labs-pool";
    } else if (session.type === "TUTORIAL" || session.resourceType === "TUTORIAL_ROOM") {
        pool = resourcePools.tutorialRooms || [];
        source = "tutorial-rooms-pool";
    } else {
        pool = resourcePools.classrooms || [];
        source = "classrooms-pool";
    }

    return { compatible: [...pool], source };
}

// ─── ENHANCED RESOURCE ALLOCATION ────────────────────────────────────────────

/**
 * Select the best resource for a session at a given (day, slot) using
 * pressure-aware selection.
 *
 * Prefers resources that:
 *   1. Are compatible with the session
 *   2. Are free at the required slot(s)
 *   3. Are in slots with lower overall pressure
 *
 * @param {Object} session - Session to allocate a resource for
 * @param {string} day
 * @param {number} slotIdx
 * @param {Object} context - RCAA context
 * @returns {{ resource: string | null, reason: string }}
 */
export function selectBestResource(session, day, slotIdx, context) {
    const { occupancyMap, resourcePools } = context;
    const { compatible, source } = filterCompatibleResources(session, resourcePools);

    if (compatible.length === 0) {
        return {
            resource: null,
            reason: `No compatible ${session.resourceType || session.type} resources configured`,
        };
    }

    const occKey = `${day}|${slotIdx}`;
    const occupied = occupancyMap[occKey] || new Set();

    if (session.type === "PRACTICAL") {
        const nextSlot = slotIdx + 1;
        if (nextSlot >= SLOTS_PER_DAY) {
            return { resource: null, reason: "Practical needs 2 contiguous slots, slot+1 exceeds limit" };
        }
        const occKeyNext = `${day}|${nextSlot}`;
        const occupiedNext = occupancyMap[occKeyNext] || new Set();

        // Find resources free in BOTH slots
        const freeBoth = compatible.filter((r) => {
            const norm = String(r).toUpperCase().trim();
            return !occupied.has(norm) && !occupiedNext.has(norm);
        });

        if (freeBoth.length === 0) {
            return {
                resource: null,
                reason: `All ${compatible.length} compatible labs occupied at ${day} slots ${slotIdx}-${nextSlot}`,
            };
        }

        // Prefer the lab with lowest overall weekly occupancy (least used)
        return {
            resource: freeBoth[0],
            reason: `Selected from ${freeBoth.length} free labs (pressure-aware)`,
        };
    }

    // Single-slot resource
    const freeResources = compatible.filter(
        (r) => !occupied.has(String(r).toUpperCase().trim())
    );

    if (freeResources.length === 0) {
        return {
            resource: null,
            reason: `All ${compatible.length} compatible resources occupied at ${day} slot ${slotIdx}`,
        };
    }

    return {
        resource: freeResources[0],
        reason: `Selected from ${freeResources.length} free resources`,
    };
}

// ─── CONTEXT BUILDER ─────────────────────────────────────────────────────────

/**
 * Build a reusable RCAA analysis context from current timetable state.
 *
 * @param {Object} timetable - Current timetable state
 * @param {Object} resources - Resource configuration { classrooms, labs, tutorialRooms }
 * @returns {Object} RCAA context
 */
export function buildRCAAContext(timetable, resources = {}) {
    const resourcePools = {
        classrooms: (resources.classrooms && resources.classrooms.length > 0)
            ? [...resources.classrooms]
            : ["CR1", "CR2", "CR3", "CR4", "PG-CR1", "PG-CR2", "PG-CR3"],
        labs: (resources.labs && resources.labs.length > 0)
            ? [...resources.labs]
            : ["HPC", "LAB1", "LAB2", "LAB3", "LAB4", "CGL", "ASL", "HPV"],
        tutorialRooms: (resources.tutorialRooms && resources.tutorialRooms.length > 0)
            ? [...resources.tutorialRooms]
            : ["TR1", "TR2", "TR3", "TR4", "CR2", "CR3"],
    };

    const demandMap = buildResourceDemandMap(timetable);
    const occupancyMap = buildResourceOccupancyMap(timetable);

    return {
        timetable,
        resourcePools,
        demandMap,
        occupancyMap,
    };
}

/**
 * Refresh the RCAA context after timetable changes.
 * Rebuilds demand and occupancy maps from current state.
 *
 * @param {Object} context - Existing RCAA context
 * @param {Object} timetable - Updated timetable
 * @returns {Object} Updated context
 */
export function refreshRCAAContext(context, timetable) {
    return {
        ...context,
        timetable,
        demandMap: buildResourceDemandMap(timetable),
        occupancyMap: buildResourceOccupancyMap(timetable),
    };
}

// ─── CONFLICT/WARNING REPORT ─────────────────────────────────────────────────

/**
 * Generate an RCAA resource conflict/warning report.
 * Identifies slots with high resource pressure and potential conflicts.
 *
 * @param {Object} timetable - Current timetable state
 * @param {Object} resources - Resource configuration
 * @returns {Object} Report with warnings and statistics
 */
export function generateRCAAReport(timetable, resources = {}) {
    const context = buildRCAAContext(timetable, resources);
    const { demandMap, occupancyMap, resourcePools } = context;

    const warnings = [];
    const pressureStats = {};

    DAYS.forEach((day) => {
        for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
            ["CLASSROOM", "LAB", "TUTORIAL_ROOM"].forEach((resourceType) => {
                const result = calculateResourcePressure(
                    day, slot, resourceType, demandMap, occupancyMap, resourcePools
                );

                const key = `${day}|${slot}|${resourceType}`;
                pressureStats[key] = result;

                if (result.pressure > 0.8 && result.demand > 0) {
                    warnings.push({
                        type: "HIGH_RESOURCE_PRESSURE",
                        severity: result.pressure >= 1.0 ? "CRITICAL" : "WARNING",
                        day,
                        slot,
                        resourceType,
                        pressure: result.pressure,
                        available: result.available,
                        demand: result.demand,
                        description: `${resourceType} pressure at ${day} slot ${slot + 1}: ${(result.pressure * 100).toFixed(0)}% (${result.available} free of ${resourcePools[resourceType === "CLASSROOM" ? "classrooms" : resourceType === "LAB" ? "labs" : "tutorialRooms"].length})`,
                    });
                }
            });
        }
    });

    // Check for unresolved resource allocations
    const unresolved = [];
    Object.entries(timetable).forEach(([divKey, daysMap]) => {
        DAYS.forEach((day) => {
            (daysMap?.[day] || []).forEach((cell, slotIdx) => {
                if (!cell || cell.span === 0) return;
                if (!cell.location || cell.location === "TBD") {
                    unresolved.push({
                        divisionKey: divKey,
                        day,
                        slot: slotIdx,
                        type: cell.type,
                        subject: cell.subject || cell.subjectName || "?",
                    });
                }
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((alloc) => {
                        if (!alloc.location || alloc.location === "TBD") {
                            unresolved.push({
                                divisionKey: divKey,
                                day,
                                slot: slotIdx,
                                type: cell.type,
                                batch: alloc.batch,
                                subject: alloc.subject || alloc.subjectName || "?",
                            });
                        }
                    });
                }
            });
        });
    });

    return {
        warnings: warnings.sort((a, b) => b.pressure - a.pressure),
        unresolvedAllocations: unresolved,
        pressureStats,
        summary: {
            totalWarnings: warnings.length,
            criticalWarnings: warnings.filter((w) => w.severity === "CRITICAL").length,
            unresolvedCount: unresolved.length,
            resourcePoolSizes: {
                classrooms: resourcePools.classrooms.length,
                labs: resourcePools.labs.length,
                tutorialRooms: resourcePools.tutorialRooms.length,
            },
        },
    };
}

/**
 * Get soft placement preference scores for all candidate slots for a session.
 * Returns slots sorted by preference (lowest pressure first).
 *
 * Used as a SOFT preference in allocateSessions to choose better slots.
 *
 * @param {Object} session - Session to evaluate
 * @param {Array} candidateSlots - Array of { day, slotIdx } candidates
 * @param {Object} context - RCAA context
 * @returns {Array} Sorted array of { day, slotIdx, pressure, details }
 */
export function rankSlotsByResourcePressure(session, candidateSlots, context) {
    const scored = candidateSlots.map(({ day, slotIdx }) => {
        const { score, pressure, details } = scoreSlotResourcePressure(
            session, day, slotIdx, context
        );
        return { day, slotIdx, pressure, score, details };
    });

    // Sort by pressure ascending (prefer lower pressure slots)
    scored.sort((a, b) => a.pressure - b.pressure);
    return scored;
}
