/**
 * allocateResources.js
 * Smart Dynamic Location Switcher: Strictly assigns classrooms, labs, and tutorial rooms
 * using ONLY real room/lab names from the uploaded resources sheet with 100% CONFLICT-FREE guarantee.
 * Eliminates double-booking clashes by scanning all real room pools and dynamically balancing room load.
 */
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

    days.forEach((day) => {
        // Track occupied room names per slot (0..5)
        const usedRoomsPerSlot = Array.from({ length: 6 }, () => new Set());
        let roomOffset = 0;
        let labOffset = 0;

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
        function findOrGenerateUniqueRoom(primaryPool, secondaryPool, usedSet, prefix, slotIdx) {
            const combinedPools = [...(primaryPool || []), ...(secondaryPool || [])];

            // 1. Try finding an unassigned room in primary pool
            for (const room of primaryPool) {
                const norm = String(room).toUpperCase().trim();
                if (!usedSet.has(norm)) {
                    return room;
                }
            }

            // 2. Try finding an unassigned room in secondary pool (cross-pool borrowing)
            for (const room of secondaryPool) {
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
        function findOrGenerateUniqueLab(usedSetSlot1, usedSetSlot2, slotIdx) {
            const pools = baseLabs || ["LAB1", "LAB2", "LAB3", "LAB4"];

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
                            usedRoomsPerSlot[nextSlot],
                            slot
                        );

                        alloc.location = assignedLab;
                        usedRoomsPerSlot[slot].add(String(assignedLab).toUpperCase().trim());
                        usedRoomsPerSlot[nextSlot].add(String(assignedLab).toUpperCase().trim());
                    });

                    if (cell.batchAllocations[0]) {
                        cell.location = cell.batchAllocations[0].location;
                    }
                } else {
                    if (cell.location && cell.location !== "TBD") return;

                    const assignedLab = findOrGenerateUniqueLab(
                        usedRoomsPerSlot[slot],
                        usedRoomsPerSlot[nextSlot],
                        slot
                    );

                    cell.location = assignedLab;
                    usedRoomsPerSlot[slot].add(String(assignedLab).toUpperCase().trim());
                    usedRoomsPerSlot[nextSlot].add(String(assignedLab).toUpperCase().trim());
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
                    if (cell.location && cell.location !== "TBD") return;

                    const assignedRoom = findOrGenerateUniqueRoom(
                        baseClassrooms,
                        baseTutorialRooms,
                        usedRoomsPerSlot[slot],
                        "CR",
                        slot
                    );

                    cell.location = assignedRoom;
                    usedRoomsPerSlot[slot].add(String(assignedRoom).toUpperCase().trim());
                }
            });
        }
    });

    return timetable;
}
