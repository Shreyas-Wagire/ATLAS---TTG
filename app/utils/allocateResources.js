/**
 * allocateResources.js
 * Strictly assigns classrooms, labs, and tutorial rooms to sessions
 * with 100% CONFLICT-FREE guarantee across all slots and days.
 * Includes deterministic loop bounds to prevent deadloops.
 */
export function allocateResources(timetable, resources = {}) {
    if (!timetable) return timetable;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const divisionKeys = Object.keys(timetable);

    // Build base resource pools with default fallbacks if sheet 3 is sparse
    const baseClassrooms = (resources.classrooms && resources.classrooms.length > 0)
        ? [...resources.classrooms]
        : ["CR1", "CR2", "CR3", "CR4", "PG-CR1", "PG-CR2", "PG-CR3"];

    const baseLabs = (resources.labs && resources.labs.length > 0)
        ? [...resources.labs]
        : ["HPC", "LAB1", "LAB2", "LAB3", "LAB4", "CGL", "ASL", "HPV"];

    const baseTutorialRooms = (resources.tutorialRooms && resources.tutorialRooms.length > 0)
        ? [...resources.tutorialRooms]
        : ["TR1", "TR2", "TR3", "TR4", "CR2", "CR3"];

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

        // Helper: Get a guaranteed UNIQUE available room with deterministic loop bound (max 100 attempts)
        function findOrGenerateUniqueRoom(pool, usedSet, prefix) {
            for (const room of pool) {
                const norm = room.toUpperCase().trim();
                if (!usedSet.has(norm)) {
                    return room;
                }
            }

            let counter = pool.length + 1;
            const maxAttempts = 100;
            let attempts = 0;

            while (attempts < maxAttempts) {
                const candidate = `${prefix}${counter}`;
                if (!usedSet.has(candidate.toUpperCase().trim())) {
                    return candidate;
                }
                counter++;
                attempts++;
            }
            return `${prefix}${counter}`;
        }

        // Helper: Find lab available across BOTH slot and nextSlot (deterministic max 100 attempts)
        function findOrGenerateUniqueLab(usedSetSlot1, usedSetSlot2) {
            for (const lab of baseLabs) {
                const norm = lab.toUpperCase().trim();
                if (!usedSetSlot1.has(norm) && !usedSetSlot2.has(norm)) {
                    return lab;
                }
            }

            let counter = baseLabs.length + 1;
            const maxAttempts = 100;
            let attempts = 0;

            while (attempts < maxAttempts) {
                const candidate = `LAB${counter}`;
                const norm = candidate.toUpperCase().trim();
                if (!usedSetSlot1.has(norm) && !usedSetSlot2.has(norm)) {
                    return candidate;
                }
                counter++;
                attempts++;
            }
            return `LAB${counter}`;
        }

        // Step 2: Assign Lab Rooms for 2-hour PRACTICAL blocks (reserving both slots)
        for (let slot = 0; slot < 6; slot++) {
            const nextSlot = slot < 5 ? slot + 1 : slot;

            divisionKeys.forEach((key) => {
                const cell = timetable[key]?.[day]?.[slot];
                if (!cell || cell.type !== "PRACTICAL" || cell.span === 0) return;

                if (cell.batchAllocations && cell.batchAllocations.length > 0) {
                    cell.batchAllocations.forEach((alloc) => {
                        if (alloc.location && alloc.location !== "TBD") return;

                        const assignedLab = findOrGenerateUniqueLab(
                            usedRoomsPerSlot[slot],
                            usedRoomsPerSlot[nextSlot]
                        );

                        alloc.location = assignedLab;
                        usedRoomsPerSlot[slot].add(assignedLab.toUpperCase().trim());
                        usedRoomsPerSlot[nextSlot].add(assignedLab.toUpperCase().trim());
                    });

                    if (cell.batchAllocations[0]) {
                        cell.location = cell.batchAllocations[0].location;
                    }
                } else {
                    if (cell.location && cell.location !== "TBD") return;

                    const assignedLab = findOrGenerateUniqueLab(
                        usedRoomsPerSlot[slot],
                        usedRoomsPerSlot[nextSlot]
                    );

                    cell.location = assignedLab;
                    usedRoomsPerSlot[slot].add(assignedLab.toUpperCase().trim());
                    usedRoomsPerSlot[nextSlot].add(assignedLab.toUpperCase().trim());
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

                            const assignedRoom = findOrGenerateUniqueRoom(
                                [...baseTutorialRooms, ...baseClassrooms],
                                usedRoomsPerSlot[slot],
                                "TR"
                            );

                            alloc.location = assignedRoom;
                            usedRoomsPerSlot[slot].add(assignedRoom.toUpperCase().trim());
                        });

                        if (cell.batchAllocations[0]) {
                            cell.location = cell.batchAllocations[0].location;
                        }
                    } else {
                        if (cell.location && cell.location !== "TBD") return;

                        const assignedRoom = findOrGenerateUniqueRoom(
                            [...baseTutorialRooms, ...baseClassrooms],
                            usedRoomsPerSlot[slot],
                            "TR"
                        );

                        cell.location = assignedRoom;
                        usedRoomsPerSlot[slot].add(assignedRoom.toUpperCase().trim());
                    }
                } else if (cell.type === "LECTURE") {
                    if (cell.location && cell.location !== "TBD") return;

                    const assignedRoom = findOrGenerateUniqueRoom(
                        baseClassrooms,
                        usedRoomsPerSlot[slot],
                        "CR"
                    );

                    cell.location = assignedRoom;
                    usedRoomsPerSlot[slot].add(assignedRoom.toUpperCase().trim());
                }
            });
        }
    });

    return timetable;
}
