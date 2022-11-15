import type { AttributeBranches } from "./attributes.js"
import type { AttributeOperation } from "./operations.js"

export const applyBranchesOperation: AttributeOperation<"branches"> = (
    operator,
    a,
    b
) =>
    operator === "&"
        ? applyBranchesIntersection(a, b)
        : // Currently we don't compress branch intersections, so we just return the original branch as the difference.
          a

const applyBranchesIntersection = (
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
