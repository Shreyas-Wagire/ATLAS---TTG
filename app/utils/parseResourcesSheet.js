export function parseResourcesSheet(rows) {
    const resources = {
        classrooms: [],
        labs: [],
        tutorialRooms: [],
    };

    rows.forEach((row, index) => {

        // Skip Header Row
        if (index === 0) return;

        const classroom =
            String(row[0] || "").trim();

        const lab =
            String(row[1] || "").trim();

        const tutorial =
            String(row[2] || "").trim();

        if (classroom) {
            resources.classrooms.push(
                classroom
            );
        }

        if (lab) {
            resources.labs.push(
                lab
            );
        }

        if (tutorial) {
            resources.tutorialRooms.push(
                tutorial
            );
        }
    });

    return resources;
}