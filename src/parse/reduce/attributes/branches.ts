import type { AttributeBranches } from "./attributes.js"

export const intersectBranches = (
    a: AttributeBranches,
    b: AttributeBranches
): AttributeBranches => {
    if (a[0] === "&") {
        if (b[0] === "&") {
            a[1].push(...b[1])
        } else {
            a[1].push(b)
        }
        return a
    }
    if (b[0] === "&") {
        b[1].push(a)
        return b
    }
    return ["&", [a, b]]
}
