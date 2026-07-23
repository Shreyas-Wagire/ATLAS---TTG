export function normalizeSubjectName(str) {
    if (!str) return "";
    return String(str)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "") // Remove spaces, dashes, slashes, punctuation
        .trim();
}

export function getSubjectInitials(name) {
    if (!name) return "";
    const cleanStr = String(name)
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .trim();
    const words = cleanStr.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return cleanStr.toUpperCase();
    return words.map((w) => w[0]).join("").toUpperCase();
}

export function isAptitudeSubject(name) {
    if (!name) return false;
    const norm = normalizeSubjectName(name);
    if (!norm) return false;

    return (
        norm.includes("APTITUDE") ||
        norm.includes("REASONING") ||
        norm.startsWith("ARPI") ||
        norm.startsWith("AR1") ||
        norm.startsWith("AR2") ||
        norm.startsWith("AR3") ||
        norm.startsWith("AR4") ||
        norm.startsWith("ARP") ||
        norm === "AR"
    );
}

export function isSubjectMatch(nameA, nameB) {
    if (!nameA || !nameB) return false;

    const normA = normalizeSubjectName(nameA);
    const normB = normalizeSubjectName(nameB);

    if (normA === normB) return true;

    // Both are Aptitude & Reasoning courses -> match!
    if (isAptitudeSubject(nameA) && isAptitudeSubject(nameB)) {
        return true;
    }

    // Direct alias mappings
    const aliasMap = {
        DM: ["DISCRETEMATHEMATICS", "DISCRETEMATHS", "DISCRETE"],
        DS: ["DATASTRUCTURES", "DATASTRUCTURE", "DATASTR"],
        COA: ["COMPUTERORGANIZATIONANDARCHITECTURE", "COMPUTERORGANIZATIONARCHITECTURE", "COMPUTERORGANIZATION"],
        OS: ["OPERATINGSYSTEMS", "OPERATINGSYSTEM", "OPERATING"],
        CPP: ["CPROGRAMMING", "OBJECTORIENTEDPROGRAMMING", "CPPPROGRAMMING", "CPP"],
        PS: ["PROBABILITYANDSTATISTICS", "PROBABILITYSTATISTICS", "PROBABILITY"],
        SE: ["SOFTWAREENGINEERING", "SOFTWAREENG"],
        ES: ["ENVIRONMENTALSTUDIES", "ENVSTUDIES", "ENVIRONMENTAL"],
        TOC: ["THEORYOFCOMPUTATION", "THEORYCOMPUTATION"],
        DCC: ["DATACOMMUNICATIONANDCOMPUTERNETWORKS", "DATACOMMUNICATION"],
        MILFL: ["MODERNINDIANLANGUAGEFOREIGNLANGUAGES", "MODERNINDIANLANGUAGE", "FOREIGNLANGUAGE", "FOREIGNLANGUAGES", "MIL", "FL"],
        AR: [
            "APTITUDEANDREASONINGPARTI",
            "APTITUDEANDREASONINGPARTII",
            "APTITUDEANDREASONINGPARTIII",
            "APTITUDEANDREASONINGPARTIV",
            "APTITUDEANDREASONING",
            "APTITUDEREASONING",
            "APTITUDE",
            "REASONING",
            "ARPI",
            "ARPII",
            "ARPIII",
            "ARPIV",
            "AR1",
            "AR2",
            "AR3",
            "AR4",
            "ARP1",
            "ARP2",
            "ARP3",
            "ARP4",
            "AR",
            "ARP",
        ],
        OE1: ["OPENELECTIVEI", "OPENELECTIVE1", "OEI", "OPENELECTIVE"],
        OE2: ["OPENELECTIVEII", "OPENELECTIVE2", "OEII"],
        MINOR1: ["MINORCOURSEI", "MINORCOURSE1", "MINORI"],
        MINOR2: ["MINORCOURSEII", "MINORCOURSE2", "MINORII"],
        MINOR3: ["MINORCOURSEIII", "MINORCOURSE3", "MINORIII"],
        MINOR4: ["MINORCOURSEIV", "MINORCOURSE4", "MINORIV"],
    };

    // Check bidirectional alias matches
    for (const [key, aliases] of Object.entries(aliasMap)) {
        const normKey = normalizeSubjectName(key);
        const normAliases = aliases.map(normalizeSubjectName);

        const aMatches = normA === normKey || normAliases.includes(normA);
        const bMatches = normB === normKey || normAliases.includes(normB);

        if (aMatches && bMatches) return true;
    }

    // Check Initials Match (e.g. DM vs Discrete Mathematics)
    const initA = getSubjectInitials(nameA);
    const initB = getSubjectInitials(nameB);

    if (initA === normB || initB === normA || initA === initB) return true;

    // Check Substring / Contains Match
    if (normA.includes(normB) || normB.includes(normA)) return true;

    return false;
}
