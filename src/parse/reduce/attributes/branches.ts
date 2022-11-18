import type { AttributeBranches } from "./attributes.js"

export const applyBranchesIntersection = (
    a: AttributeBranches,
    b: AttributeBranches
): AttributeBranches => {
    if (a.kind === "all") {
        if (b.kind === "all") {
            a.of.push(...b.of)
        } else {
            a.of.push({ branches: b })
        }
        return a
    }
    if (b.kind === "all") {
        b.of.push({ branches: a })
        return b
    }
    return {
        kind: "all",
        of: [{ branches: a }, { branches: b }]
    }
}
