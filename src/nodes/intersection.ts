import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type {
    AttributesByType,
    BranchesOfType,
    ExtendableTypeName,
    ResolutionNode
} from "./node.js"
import type { ResolvedBranchesOfType } from "./operation.js"
import { createOperation, resolveBranches } from "./operation.js"
import { bigintIntersection } from "./types/bigint.js"
import { booleanIntersection } from "./types/boolean.js"
import { numberIntersection } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"

export const intersection = createOperation((lNode, rNode, scope) => {
    const result: mutable<ResolutionNode> = {}
    let k: TypeName
    for (k in rNode) {
        const l = rNode[k]
        const r = lNode[k]
        if (l === undefined || r === undefined) {
            continue
        }
        if (l === true) {
            result[k] = r as any
            continue
        }
        if (r === true) {
            result[k] = l as any
            continue
        }
        const viableBranches = branchesIntersection(
            k as ExtendableTypeName,
            listFrom(l),
            listFrom(r),
            scope
        )
        if (viableBranches.length) {
            result[k] =
                viableBranches.length === 1
                    ? viableBranches[0]
                    : (viableBranches as any)
        }
    }
    return result
})

export type AttributesIntersection<attributes extends dict> = (
    l: attributes,
    r: attributes,
    scope: ScopeRoot
) => attributes | "never"

const intersectionsByType: {
    [typeName in ExtendableTypeName]: AttributesIntersection<
        AttributesByType[typeName]
    >
} = {
    bigint: bigintIntersection,
    boolean: booleanIntersection,
    number: numberIntersection,
    object: objectIntersection,
    string: stringIntersection
}

// TODO: Types uppercase when generic in function, lowercase when generic in type?
const branchesIntersection = <TypeName extends ExtendableTypeName>(
    typeName: TypeName,
    lBranches: BranchesOfType<TypeName>,
    rBranches: BranchesOfType<TypeName>,
    scope: ScopeRoot
) => {
    const result: ResolvedBranchesOfType<TypeName> = []
    for (const l of resolveBranches(typeName, lBranches, scope)) {
        for (const r of resolveBranches(typeName, rBranches, scope)) {
            const branchResult = intersectionsByType[typeName](
                l as any,
                r as any,
                scope
            )
            if (branchResult !== "never") {
                result.push(branchResult)
            }
        }
    }
    return result
}

// Returns, in order of precedence:
//  1.  "<=" if l extends r
//  2.  ">" if r extends  (but is not equivalent to) l
//  3.  null
export const compareAttributes = (
    typeName: ExtendableTypeName,
    l: dict,
    r: dict,
    scope: ScopeRoot
): "<=" | ">" | null => {
    const intersected = intersectionsByType[typeName](l as any, r as any, scope)
    return deepEquals(l, intersected)
        ? "<="
        : deepEquals(r, intersected)
        ? ">"
        : null
}
