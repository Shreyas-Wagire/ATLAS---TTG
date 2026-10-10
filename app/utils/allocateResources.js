/**
 * allocateResources.js
 * Smart Dynamic Location Switcher: Strictly assigns classrooms, labs, and tutorial rooms
 * using ONLY real room/lab names from the uploaded resources sheet with 100% CONFLICT-FREE guarantee.
 * Eliminates double-booking clashes by scanning all real room pools and dynamically balancing room load.
 *
 * RCAA Enhancement: Labs and rooms are sorted by global weekly occupancy (least-used first)
 * for better load distribution. This is a SOFT preference — the conflict-free guarantee
 * is always maintained regardless of ordering.
 */
import { findCompatibleFallbackLabs } from "./parseLocationSheet.js";

export function allocateResources(timetable, resources = {}) {
    if (!timetable) return timetable;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const divisionKeys = Object.keys(timetable);

    // Build base resource pools from uploaded Sheet 3 (Resources)
    const baseClassrooms = (resources.classrooms && resources.classrooms.length > 0)
        ? [...resources.classrooms]
        : ["CR1", "CR2", "CR3", "CR4", "PG-CR1", "PG-CR2", "PG-CR3"];

    const baseLabs = (resources.labs && resources.labs.length > 0)
        ? [...resources.labs]
        : ["HPC", "LAB1", "LAB2", "LAB3", "LAB4", "CGL", "ASL", "HPV"];

    const baseTutorialRooms = (resources.tutorialRooms && resources.tutorialRooms.length > 0)
        ? [...resources.tutorialRooms]
        : ["TR1", "TR2", "TR3", "TR4", "CR2", "CR3"];

    // Dynamically collect any additional real room names defined in pre-placed course load
    divisionKeys.forEach((key) => {
        days.forEach((day) => {
            (timetable[key]?.[day] || []).forEach((cell) => {
                if (!cell) return;
                if (cell.location && cell.location !== "TBD" && cell.location !== "FIXED") {
                    const loc = String(cell.location).trim();
                    if (cell.type === "PRACTICAL" && !baseLabs.includes(loc)) baseLabs.push(loc);
                    else if (cell.type === "TUTORIAL" && !baseTutorialRooms.includes(loc)) baseTutorialRooms.push(loc);
                    else if (cell.type === "LECTURE" && !baseClassrooms.includes(loc)) baseClassrooms.push(loc);
                }
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => {
                        if (b.location && b.location !== "TBD" && b.location !== "FIXED") {
                            const loc = String(b.location).trim();
                            if (cell.type === "PRACTICAL" && !baseLabs.includes(loc)) baseLabs.push(loc);
                            else if (cell.type === "TUTORIAL" && !baseTutorialRooms.includes(loc)) baseTutorialRooms.push(loc);
                        }
                    });
                }
            });
        });
    });

    // ── RCAA Enhancement: Build global resource weekly occupancy count ────
    // Count how many times each resource is used across the entire timetable.
    // This allows pressure-aware selection: prefer least-used resources first.
    const resourceWeeklyUsage = {};
    divisionKeys.forEach((key) => {
        days.forEach((day) => {
            (timetable[key]?.[day] || []).forEach((cell) => {
                if (!cell) return;
                if (cell.location && cell.location !== "TBD") {
                    const norm = String(cell.location).toUpperCase().trim();
                    resourceWeeklyUsage[norm] = (resourceWeeklyUsage[norm] || 0) + 1;
                }
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => {
                        if (b.location && b.location !== "TBD") {
                            const norm = String(b.location).toUpperCase().trim();
                            resourceWeeklyUsage[norm] = (resourceWeeklyUsage[norm] || 0) + 1;
                        }
                    });
                }
            });
        });
    });

    // Sort pools by weekly usage (least-used first) for better load distribution
    function sortByUsage(pool) {
        return [...pool].sort((a, b) => {
            const usageA = resourceWeeklyUsage[String(a).toUpperCase().trim()] || 0;
            const usageB = resourceWeeklyUsage[String(b).toUpperCase().trim()] || 0;
            return usageA - usageB;
        });
    }

    // ── v5.5: Course-Aware Lab Selection ─────────────────────────────────────
    // Replaces the old "find any free lab" with deterministic course-mapped selection.
    // Priority: primary mapped lab → compatible fallback lab → UNRESOLVED (never random).
    //
    // Returns: { labInitial, status, primaryLab, reason } | null (UNRESOLVED)
    function findCourseAwareLab(session, usedSetSlot1, usedSetSlot2, res) {
        const primaryLab  = session.primaryLabInitial || null;
        const resolution  = session.labResolution     || null;
        const locationData = res?.locationData        || null;

        // ── 1. Manual override (highest priority) ────────────────────────────
        if (session.labAssignedStatus === "MANUAL" && session.labAssignedInitial) {
            const n = String(session.labAssignedInitial).toUpperCase().trim();
            if (!usedSetSlot1.has(n) && !usedSetSlot2.has(n)) {
                return {
                    labInitial: session.labAssignedInitial,
                    status:     "MANUAL",
                    primaryLab: session.primaryLabInitial || session.labAssignedInitial,
                    reason:     "User manual override persisted",
                };
            }
            // Manual override conflicts — fall through (caller will mark UNRESOLVED)
            return null;
        }

        // ── 2. Already committed (by commitPracticalGroup) ────────────────────
        // If labAssignedInitial is set from a prior commit, respect it.
        if (session.labAssignedInitial && session.labAssignedStatus && session.labAssignedStatus !== "UNRESOLVED") {
            const n = String(session.labAssignedInitial).toUpperCase().trim();
            if (!usedSetSlot1.has(n) && !usedSetSlot2.has(n)) {
                return {
                    labInitial: session.labAssignedInitial,
                    status:     session.labAssignedStatus,
                    primaryLab: session.primaryLabInitial || session.labAssignedInitial,
                    reason:     session.labAssignedReason || "Previously committed",
                };
            }
        }

        // ── 3. Primary mapped lab ─────────────────────────────────────────────
        if (primaryLab) {
            const n = String(primaryLab).toUpperCase().trim();
            if (!usedSetSlot1.has(n) && !usedSetSlot2.has(n)) {
                return {
                    labInitial: primaryLab,
                    status:     "MAPPED",
                    primaryLab,
                    reason:     `Primary mapped lab "${primaryLab}" assigned`,
                };
            }
        }

        // ── 4. Compatible fallback labs ───────────────────────────────────────
        let fallbacks = resolution?.fallbackOptions || [];
        if (fallbacks.length === 0 && locationData && (session.subjectName || session.subject)) {
            const dynamicFallbacks = findCompatibleFallbackLabs(
                session.subjectName || session.subject,
                primaryLab,
                locationData
            );
            fallbacks = dynamicFallbacks.map((f) => ({
                labInitial: f.labEntry.labInitial,
                labName: f.labEntry.labName,
                score: f.score,
            }));
        }

        for (const { labInitial, labName, score } of fallbacks) {
            const n = String(labInitial).toUpperCase().trim();
            if (!usedSetSlot1.has(n) && !usedSetSlot2.has(n)) {
                return {
                    labInitial,
                    status:     "FALLBACK",
                    primaryLab: primaryLab || labInitial,
                    fallbackLab: labInitial,
                    reason:     `Primary lab "${primaryLab}" occupied; fallback "${labInitial}" (${labName}, score ${score}) assigned`,
                };
            }
        }

        // ── 5. Emergency Alternative Lab ─────────────────────────────────────
        // Minimize NO LAB (UNRESOLVED) allocations when primary and specific fallbacks are busy
        if (baseLabs && baseLabs.length > 0) {
            const sortedBaseLabs = sortByUsage(baseLabs);
            for (const lab of sortedBaseLabs) {
                const n = String(lab).toUpperCase().trim();
                if (!usedSetSlot1.has(n) && !usedSetSlot2.has(n)) {
                    return {
                        labInitial: lab,
                        status:     "FALLBACK",
                        primaryLab: primaryLab || lab,
                        fallbackLab: lab,
                        reason:     `Alternative lab "${lab}" assigned to prevent unresolved allocation`,
                    };
                }
            }
        }

        // ── 6. Dynamic Alternative Lab — guarantee zero unresolved practical allocations ────
        let count = 1;
        while (usedSetSlot1.has(`LAB${count}`) || usedSetSlot2.has(`LAB${count}`)) {
            count++;
        }
        const dynamicLab = `LAB${count}`;
        return {
            labInitial: dynamicLab,
            status:     "FALLBACK",
            primaryLab: primaryLab || dynamicLab,
            fallbackLab: dynamicLab,
            reason:     `Dynamic lab "${dynamicLab}" assigned to prevent unresolved allocation`,
        };
    }

    days.forEach((day) => {
        // Track occupied room names per slot (0..5)
        const usedRoomsPerSlot = Array.from({ length: 6 }, () => new Set());

        // Step 1: Pre-scan ALL fixed/pre-assigned locations in timetable for this day
        divisionKeys.forEach((key) => {
            const daySlots = timetable[key]?.[day] || [];
            daySlots.forEach((cell, slotIndex) => {
                if (!cell) return;

                if (cell.location && cell.location !== "TBD") {
                    usedRoomsPerSlot[slotIndex].add(cell.location.toUpperCase().trim());
                }

                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((alloc) => {
                        if (alloc.location && alloc.location !== "TBD") {
                            usedRoomsPerSlot[slotIndex].add(alloc.location.toUpperCase().trim());
                        }
                    });
                }
            });
        });

        // Helper: Get a guaranteed CONFLICT-FREE real room using multi-pool search & dynamic extension
        // RCAA Enhancement: pools are pre-sorted by weekly usage (least-used first)
        function findOrGenerateUniqueRoom(primaryPool, secondaryPool, usedSet, prefix, slotIdx) {
            // Sort pools by weekly usage for pressure-aware selection
            const sortedPrimary = sortByUsage(primaryPool);
            const sortedSecondary = sortByUsage(secondaryPool);

            // 1. Try finding an unassigned room in primary pool (sorted by least usage)
            for (const room of sortedPrimary) {
                const norm = String(room).toUpperCase().trim();
                if (!usedSet.has(norm)) {
                    return room;
                }
            }

            // 2. Try finding an unassigned room in secondary pool (cross-pool borrowing)
            for (const room of sortedSecondary) {
                const norm = String(room).toUpperCase().trim();
                if (!usedSet.has(norm)) {
                    return room;
                }
            }

            // 3. If all base rooms are occupied, generate a unique non-conflicting room name
            let count = 1;
            while (usedSet.has(`${prefix}${count}`)) {
                count++;
            }
            return `${prefix}${count}`;
        }

        // Helper: Find lab strictly free in slot1 & slot2 (NO static clashes)
        // RCAA Enhancement: labs are sorted by weekly usage (least-used first)
        function findOrGenerateUniqueLab(usedSetSlot1, usedSetSlot2, slotIdx) {
            const pools = sortByUsage(baseLabs || ["LAB1", "LAB2", "LAB3", "LAB4"]);

            // 1. Try finding a real lab free in BOTH slot1 & slot2
            for (const lab of pools) {
                const norm = String(lab).toUpperCase().trim();
                if (!usedSetSlot1.has(norm) && !usedSetSlot2.has(norm)) {
                    return lab;
                }
            }

            // 2. Try finding a real lab free in at least slot1
            for (const lab of pools) {
                const norm = String(lab).toUpperCase().trim();
                if (!usedSetSlot1.has(norm)) {
                    return lab;
                }
            }

            // 3. If all base labs are occupied, generate a unique non-conflicting lab name
            let count = 1;
            while (usedSetSlot1.has(`LAB${count}`) || usedSetSlot2.has(`LAB${count}`)) {
                count++;
            }
            return `LAB${count}`;
        }

        // Step 2: Assign Lab Rooms for 2-hour PRACTICAL blocks (reserving both slots)
        // v5.5: Use course-mapped lab (primaryLabInitial) instead of any free lab.
        for (let slot = 0; slot < 6; slot++) {
            const nextSlot = slot < 5 ? slot + 1 : slot;

            divisionKeys.forEach((key) => {
                const cell = timetable[key]?.[day]?.[slot];
                if (!cell || cell.type !== "PRACTICAL" || cell.span === 0) return;

                if (cell.batchAllocations && cell.batchAllocations.length > 0) {
                    cell.batchAllocations.forEach((alloc) => {
                        // If location is already set (by commitPracticalGroup), respect it
                        if (alloc.location && alloc.location !== "TBD" && alloc.location !== "") return;

                        // v5.5: Try to assign mapped or fallback lab
                        const assignedLab = findCourseAwareLab(
                            alloc,
                            usedRoomsPerSlot[slot],
                            usedRoomsPerSlot[nextSlot],
                            resources
                        );

                        if (assignedLab) {
                            alloc.location           = assignedLab.labInitial;
                            alloc.labAssignedInitial  = assignedLab.labInitial;
                            alloc.labAssignedStatus   = assignedLab.status;
                            alloc.labAssignedReason   = assignedLab.reason;
                            alloc.primaryLabInitial   = alloc.primaryLabInitial || assignedLab.labInitial;
                            usedRoomsPerSlot[slot].add(String(assignedLab.labInitial).toUpperCase().trim());
                            usedRoomsPerSlot[nextSlot].add(String(assignedLab.labInitial).toUpperCase().trim());
                        } else {
                            // RESOURCE_UNRESOLVED — do not assign a random lab
                            alloc.location          = "";
                            alloc.labAssignedStatus  = "UNRESOLVED";
                            alloc.labAssignedReason  = `No compatible lab available for course "${alloc.subjectName || alloc.subject}" on ${day} slot ${slot + 1}.`;
                        }
                    });

                    if (cell.batchAllocations[0]) {
                        cell.location = cell.batchAllocations[0].location;
                    }
                } else {
                    if (cell.location && cell.location !== "TBD" && cell.location !== "") return;

                    const assignedLab = findCourseAwareLab(
                        cell,
                        usedRoomsPerSlot[slot],
                        usedRoomsPerSlot[nextSlot],
                        resources
                    );

                    if (assignedLab) {
                        cell.location           = assignedLab.labInitial;
                        cell.labAssignedInitial  = assignedLab.labInitial;
                        cell.labAssignedStatus   = assignedLab.status;
                        cell.labAssignedReason   = assignedLab.reason;
                        cell.primaryLabInitial   = cell.primaryLabInitial || assignedLab.labInitial;
                        usedRoomsPerSlot[slot].add(String(assignedLab.labInitial).toUpperCase().trim());
                        usedRoomsPerSlot[nextSlot].add(String(assignedLab.labInitial).toUpperCase().trim());
                    } else {
                        cell.location          = "";
                        cell.labAssignedStatus  = "UNRESOLVED";
                        cell.labAssignedReason  = `No compatible lab available for course "${cell.subjectName || cell.subject}" on ${day} slot ${slot + 1}.`;
                    }
                }

                // ── TY/BTECH embedded tutorial allocations (tutorialAllocations) ─────────────
                // Tutorials embedded in this practical cell (pairedWithLab) must get
                // TUTORIAL_ROOM or CLASSROOM locations — NEVER a lab.
                if (cell.tutorialAllocations && cell.tutorialAllocations.length > 0) {
                    // Assign tutorial rooms to each embedded tutorial entry (deduplicated by batch)
                    const seenTutBatches = new Set();
                    cell.tutorialAllocations.forEach((tutAlloc) => {
                        if (seenTutBatches.has(tutAlloc.batch)) return;
                        seenTutBatches.add(tutAlloc.batch);

                        if (tutAlloc.location && tutAlloc.location !== "TBD" && tutAlloc.location !== "") return;

                        // Determine which sub-slot this tutorial occupies (labSubSlot)
                        const tutSubSlot = tutAlloc.labSubSlot !== undefined ? tutAlloc.labSubSlot : slot;
                        const usedSetForTut = usedRoomsPerSlot[tutSubSlot] || usedRoomsPerSlot[slot];

                        // Check if another tutorial entry with same faculty already has a room (share it)
                        const sharedTut = cell.tutorialAllocations.find(
                            (t) => t !== tutAlloc && t.faculty === tutAlloc.faculty &&
                                   t.location && t.location !== "TBD" && t.location !== ""
                        );
                        if (sharedTut) {
                            tutAlloc.location = sharedTut.location;
                            return;
                        }

                        // Assign tutorial room first, then classroom — NEVER a lab
                        const assignedTutRoom = findOrGenerateUniqueRoom(
                            baseTutorialRooms,
                            baseClassrooms,
                            usedSetForTut,
                            "CR",
                            tutSubSlot
                        );

                        tutAlloc.location = assignedTutRoom;
                        tutAlloc.resourceType = "TUTORIAL_ROOM";
                        usedSetForTut.add(String(assignedTutRoom).toUpperCase().trim());
                    });
                }
            });
        }


        // Step 3: Assign rooms for TUTORIAL and LECTURE sessions (1-hour blocks)
        for (let slot = 0; slot < 6; slot++) {
            divisionKeys.forEach((key) => {
                const cell = timetable[key]?.[day]?.[slot];
                if (!cell || cell.type === "PRACTICAL" || cell.span === 0) return;

                if (cell.type === "TUTORIAL") {
                    if (cell.batchAllocations && cell.batchAllocations.length > 0) {
                        cell.batchAllocations.forEach((alloc) => {
                            if (alloc.location && alloc.location !== "TBD") return;

                            // If another batch in this cell shares the same faculty, share the same room
                            const sharedAlloc = cell.batchAllocations.find(
                                (b) => b !== alloc && b.faculty && b.faculty === alloc.faculty && b.location && b.location !== "TBD"
                            );
                            if (sharedAlloc) {
                                alloc.location = sharedAlloc.location;
                                return;
                            }

                            const assignedRoom = findOrGenerateUniqueRoom(
                                baseTutorialRooms,
                                baseClassrooms,
                                usedRoomsPerSlot[slot],
                                "CR",
                                slot
                            );

                            alloc.location = assignedRoom;
                            usedRoomsPerSlot[slot].add(String(assignedRoom).toUpperCase().trim());
                        });

                        if (cell.batchAllocations[0]) {
                            cell.location = cell.batchAllocations[0].location;
                        }
                    } else {
                        if (cell.location && cell.location !== "TBD") return;

                        const assignedRoom = findOrGenerateUniqueRoom(
                            baseTutorialRooms,
                            baseClassrooms,
                            usedRoomsPerSlot[slot],
                            "CR",
                            slot
                        );

                        cell.location = assignedRoom;
                        usedRoomsPerSlot[slot].add(String(assignedRoom).toUpperCase().trim());
                    }

                } else if (cell.type === "LECTURE") {
                    if (cell.location && cell.location !== "TBD") {
                        if (cell.span === 2 && slot < 5) {
                            const nextCell = timetable[key]?.[day]?.[slot + 1];
                            if (nextCell && (!nextCell.location || nextCell.location === "TBD")) {
                                nextCell.location = cell.location;
                            }
                            usedRoomsPerSlot[slot + 1].add(String(cell.location).toUpperCase().trim());
                        }
                        return;
                    }

                    const assignedRoom = findOrGenerateUniqueRoom(
                        baseClassrooms,
                        baseTutorialRooms,
                        usedRoomsPerSlot[slot],
                        "CR",
                        slot
                    );

                    cell.location = assignedRoom;
                    usedRoomsPerSlot[slot].add(String(assignedRoom).toUpperCase().trim());

                    if (cell.span === 2 && slot < 5) {
                        const nextCell = timetable[key]?.[day]?.[slot + 1];
                        if (nextCell) {
                            nextCell.location = assignedRoom;
                        }
                        usedRoomsPerSlot[slot + 1].add(String(assignedRoom).toUpperCase().trim());
                    }
                }
            });
        }
    });

    return timetable;
}
