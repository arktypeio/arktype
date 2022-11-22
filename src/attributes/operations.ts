import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import { hasKey, satisfies } from "../utils/generics.js"
import type {
    Attribute,
    AttributeKey,
    AttributeOperations,
    Attributes,
    Branches,
    MutableAttributes,
    UndiscriminatedUnion
} from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { bounds } from "./bounds.js"
import { divisor } from "./divisor.js"
import { keySetOperations } from "./keySets.js"
import { propsOperations, requiredOperations } from "./props.js"
import { alias, type, value } from "./strings.js"

export const branchOperations = defineOperations<Attribute<"branches">>()({
    intersection: (a, b) => ["&", [...listUnions(a), ...listUnions(b)]],
    union: (a, b, scope) => {
        const unionsOfB = listUnions(b)
        const result = listUnions(a).filter(
            (unionA) =>
                !unionA[1].every((branchA) =>
                    unionsOfB.some((unionB) =>
                        unionB[1].some((branchB) =>
                            isSubtype(branchB, branchA, scope)
                        )
                    )
                )
        )
        return result.length === 0
            ? undefined
            : result.length === 1
            ? result[0]
            : ["&", result]
    }
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
        // TODO: Checking if subtype anyways, just do full comparison for better idea of universal attributes etc...
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
    const compressedUnion: UndiscriminatedUnion = ["|", compressedBranches]
    return {
        ...base,
        branches: base.branches
            ? branchOperations.intersection(base.branches, compressedUnion)
            : compressedUnion
    }
}

const unexpectedDiscriminatedBranchesMessage =
    "Unexpected operation on discriminated branches"

const listUnions = (branches: Branches) =>
    branches[0] === "|"
        ? [branches]
        : branches[0] === "&"
        ? branches[1].map((intersectedBranches) =>
              intersectedBranches[0] === "?"
                  ? throwInternalError(unexpectedDiscriminatedBranchesMessage)
                  : intersectedBranches
          )
        : throwInternalError(unexpectedDiscriminatedBranchesMessage)

export const excludeFromBranches = (
    branches: Branches,
    a: Attributes,
    scope: ScopeRoot
): Branches | null => {
    const unions = listUnions(branches)
    const unionsWithExclusion: Attributes[][] = []
    for (const union of unions) {
        const unionWithExclusion = excludeFromUnion(union[1], a, scope)
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

const excludeFromUnion = (
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

export const operations = satisfies<{
    [k in AttributeKey]: AttributeOperations<Attribute<k>>
}>()({
    value,
    type,
    bounds,
    divisor,
    alias,
    required: requiredOperations,
    regex: keySetOperations,
    contradiction: keySetOperations,
    props: propsOperations,
    branches: branchOperations
})

type DynamicOperation = (a: any, b: any, scope: ScopeRoot) => any

export const intersect = (
    a: Attributes,
    b: Attributes,
    scope: ScopeRoot
): Attributes => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result = { ...a, ...b }
    delete result.branches
    let k: AttributeKey
    for (k in result) {
        if (k in a && k in b) {
            const fn = operations[k].intersection as DynamicOperation
            const intersection = fn(a[k], b[k], scope)
            if (intersection === null) {
                // TODO: Delegate based on k
                result.contradiction = {
                    [`${JSON.stringify(a[k])} and ${JSON.stringify(
                        b[k]
                    )} have no overlap`]: true
                }
            } else {
                result[k] = intersection
            }
        }
    }
    // TODO: Figure out prop never propagation
    return result
}

const expandIfAlias = (a: Attributes, scope: ScopeRoot) =>
    a.alias ? scope.resolve(a.alias) : a

export const exclude = (a: Attributes, b: Attributes, scope: ScopeRoot) => {
    a = expandIfAlias(a, scope)
    b = expandIfAlias(b, scope)
    const result: MutableAttributes = {}
    let k: AttributeKey
    for (k in a) {
        if (k in b) {
            const fn = operations[k].union as DynamicOperation
            result[k] = fn(a[k], b[k], scope)
            if (result[k] === null) {
                delete result[k]
            }
        } else {
            result[k] = a[k] as any
        }
    }
    return isEmpty(result) ? null : result
}

export const isSubtype = (a: Attributes, b: Attributes, scope: ScopeRoot) =>
    exclude(b, a, scope) === null
