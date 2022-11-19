import type { AttributeBranches } from "./attributes.js"

export const applyBranchesIntersection = (
    a: AttributeBranches,
    b: AttributeBranches
): AttributeBranches => {
    if (a[0] === "&") {
        if (b[0] === "&") {
            a[1].push(...b[1])
        } else {
            a[1].push({ branches: b })
        }
        return a
    }
    if (b[0] === "&") {
        b[1].push({ branches: a })
        return b
    }
    return ["&", [{ branches: a }, { branches: b }]]
}
