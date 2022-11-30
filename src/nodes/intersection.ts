import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import { hasType } from "../utils/typeOf.js"
import type {
    AttributesByType,
    BranchesOfType,
    ExtendableTypeName,
    Node,
    TypedNode
} from "./node.js"
import { bigintIntersection } from "./types/bigint.js"
import { booleanIntersection } from "./types/boolean.js"
import { degeneratableIntersection } from "./types/degenerate.js"
import { numberIntersection } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) =>
    degeneratableIntersection(l, r, scope) ??
    typeIntersection(l as TypedNode, r as TypedNode, scope)

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
export const branchesIntersection = <typeName extends ExtendableTypeName>(
    typeName: typeName,
    lBranches: BranchesOfType<typeName>,
    rBranches: BranchesOfType<typeName>,
    scope: ScopeRoot
) => {
    const result: ResolvedBranchesOfType<typeName> = []
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

export type ResolvedBranchesOfType<typeName extends ExtendableTypeName> =
    AttributesByType[typeName][]

const resolveBranches = <TypeName extends ExtendableTypeName>(
    typeName: ExtendableTypeName,
    branches: BranchesOfType<TypeName>,
    scope: ScopeRoot<dict>
): ResolvedBranchesOfType<ExtendableTypeName> => {
    const resolvedBranches: ResolvedBranchesOfType<ExtendableTypeName> = []
    for (const branch of branches) {
        if (typeof branch === "object") {
            // TODO: Don't push redundant branches
            resolvedBranches.push(branch)
        } else {
            resolvedBranches.push(
                ...resolveAliasBranches(typeName, branch, scope)
            )
        }
    }
    return resolvedBranches
}

const resolveAliasBranches = (
    typeName: ExtendableTypeName,
    alias: string,
    scope: ScopeRoot<dict>
): dict[] => {
    const resolution = scope.resolve(alias)
    if (typeof resolution === "object" && resolution[typeName]) {
        const attributeValue = resolution[typeName]!
        if (attributeValue === true) {
            // Empty attributes fulfills the expected type while acting the same as true
            return [{}]
        }
        if (typeof attributeValue === "string") {
            return resolveAliasBranches(typeName, attributeValue, scope)
        }
        if (hasType(attributeValue, "object", "dict")) {
            return [attributeValue]
        }
        return resolveBranches(typeName, attributeValue, scope)
    } else if (resolution === "any") {
        return [{}]
    }
    return throwInternalError(
        `Unexpected failure to resolve '${alias}' as a ${typeName}`
    )
}

const typeIntersection = (
    lNode: TypedNode,
    rNode: TypedNode,
    scope: ScopeRoot
): Node => {
    const result: mutable<TypedNode> = {}
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
    return !hasKeys(result) ? "never" : result
}

// Returns, in order of precedence:
//  1.  "<=" if l extends r
//  3.  null
//  2.  ">" if r extends  (but is not equivalent to) l
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
