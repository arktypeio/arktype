import type { ScopeRoot } from "../scope.js"
import { throwInternalError } from "../utils/errors.js"
import { hasKey } from "../utils/generics.js"
import { defineOperations } from "./attributes.js"
import type {
    Attribute,
    AttributeBranches,
    Attributes,
    UndiscriminatedBranches
} from "./attributes.js"
import {
    exclude,
    extract,
    intersect,
    isSubtype,
    operations
} from "./operations.js"

export const branches = defineOperations<Attribute<"branches">>()({
    intersect: (a, b) => {
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
    },
    extract: (a, b) => a as any,
    exclude: (a, b) => {}
})

export const compress = (uncompressed: Attributes[], scope: ScopeRoot) => {
    if (uncompressed.length === 1) {
        return uncompressed[0]
    }
    const branches = uncompressed.map((branch) => {
        if (hasKey(branch, "alias")) {
            const { alias, ...rest } = branch
            return intersect(rest, scope.resolve(alias), scope)
        }
        return branch
    })
    let universalAttributes: Attributes | null = branches[0]
    const redundantIndices: Record<number, true> = {}
    for (let i = 0; i < branches.length; i++) {
        if (redundantIndices[i]) {
            continue
        }
        if (i > 0 && universalAttributes) {
            universalAttributes = extract(
                universalAttributes,
                branches[i],
                scope
            )
        }
        for (let j = i + 1; j < branches.length; j++) {
            if (isSubtype(branches[i], branches[j], scope)) {
                redundantIndices[i] = true
                break
            } else if (isSubtype(branches[j], branches[i], scope)) {
                redundantIndices[j] = true
            }
        }
    }
    const base = universalAttributes ?? {}
    const compressedBranches: Attributes[] = []
    for (let i = 0; i < branches.length; i++) {
        if (redundantIndices[i]) {
            continue
        }
        const uniqueBranchAttributes = universalAttributes
            ? exclude(branches[i], universalAttributes, scope)
            : branches[i]
        if (uniqueBranchAttributes) {
            compressedBranches.push(uniqueBranchAttributes)
        }
    }
    const compressedUnion: UndiscriminatedBranches = ["|", compressedBranches]
    return {
        ...base,
        branches: base.branches
            ? operations.branches.intersect(
                  base.branches,
                  compressedUnion,
                  scope
              )
            : compressedUnion
    }
}

export const excludeFromBranches = (
    branches: AttributeBranches,
    a: Attributes,
    scope: ScopeRoot
): AttributeBranches | null => {
    if (branches[0] === "?") {
        return throwInternalError(unexpectedDiscriminatedBranchesMessage)
    }
    const unions =
        branches[0] === "|"
            ? [branches[1]]
            : branches[1].map((intersectedBranches) =>
                  intersectedBranches[0] === "?"
                      ? throwInternalError(
                            unexpectedDiscriminatedBranchesMessage
                        )
                      : intersectedBranches[1]
              )
    const unionsWithExclusion: Attributes[][] = []
    for (const union of unions) {
        const unionWithExclusion = excludeFromUnion(union, a, scope)
        if (unionWithExclusion) {
            unionsWithExclusion.push(unionWithExclusion)
        }
    }
    if (unionsWithExclusion.length === 0) {
        return null
    }
    if (unionsWithExclusion.length === 1) {
        return ["|", unionsWithExclusion[0]]
    }
    return ["&", unionsWithExclusion.map((union) => ["|", union] as const)]
}

const unexpectedDiscriminatedBranchesMessage =
    "Unexpected attempt to prune discriminated branches"

export const excludeFromUnion = (
    union: Attributes[],
    a: Attributes,
    scope: ScopeRoot
) => {
    for (let i = 0; i < union.length; i++) {
        const remainingBranchAttributes = exclude(union[i], a, scope)
        if (remainingBranchAttributes === null) {
            // If any of the branches is empty, assign is a subtype of
            // the branch and the branch will always be fulfilled. In
            // that scenario, we can safely remove all branches in that set.
            return null
        }
        union[i] = remainingBranchAttributes
    }
    return union
}
