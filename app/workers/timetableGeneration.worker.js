import { generateSmartTimetable } from "../utils/generateSmartTimetable.js";
import { generateCollegeTimetable } from "../utils/generateCollegeTimetable.js";
import { parseFacultyConstraints } from "../utils/parseFacultyConstraints.js";

self.onmessage = (event) => {
    const { id, kind, payload } = event.data || {};
    try {
        let result;
        if (kind === "college") {
            result = generateCollegeTimetable(payload.collegeData, {
                maxTrials: 30,
                facultyConstraints: payload.facultyConstraints,
                onProgress: (department, stage, percent) => {
                    self.postMessage({ id, type: "progress", message: `[${department}] ${stage}`, percent: Math.round(percent) });
                },
            });
        } else {
            result = generateSmartTimetable(
                payload.groupedData,
                payload.globalConstraints,
                payload.syncRules,
                payload.resources,
                30,
                parseFacultyConstraints(payload.facultyConstraints),
                payload.subjects,
                (stage, percent) => self.postMessage({ id, type: "progress", message: stage, percent })
            );
        }
        self.postMessage({ id, type: "complete", result });
    } catch (error) {
        self.postMessage({ id, type: "error", message: error?.message || "Generation failed." });
    }
};
