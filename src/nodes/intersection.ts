import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import { hasType } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type {
    AttributesByType,
    BranchesOfType,
    ExtendableTypeName,
    Node,
    ResolutionNode
} from "./node.js"
import { bigintIntersection } from "./types/bigint.js"
import { booleanIntersection } from "./types/boolean.js"
import { numberIntersection } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node => {
    const lResolution = resolveIfName(l, scope)
    const rResolution = resolveIfName(r, scope)
    const result = resolutionIntersection(lResolution, rResolution, scope)
    // If the intersection included a name and its result is identical to the
    // original resolution of that name, return the name instead of its expanded
    // form as the result
    if (typeof l === "string" && deepEquals(result, lResolution)) {
        return l
    }
    if (typeof r === "string" && deepEquals(result, rResolution)) {
        return r
    }
    return result
}

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

const resolutionIntersection = (
    lNode: ResolutionNode,
    rNode: ResolutionNode,
    scope: ScopeRoot
): Node => {
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
    return !hasKeys(result) ? "never" : result
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

export type ResolvedBranchesOfType<typeName extends ExtendableTypeName> =
    AttributesByType[typeName][]

const resolveBranches = <TypeName extends ExtendableTypeName>(
    typeName: ExtendableTypeName,
    branches: BranchesOfType<TypeName>,
    scope: ScopeRoot<dict>
): ResolvedBranchesOfType<ExtendableTypeName> => {
    const resolvedBranches: ResolvedBranchesOfType<ExtendableTypeName> = []
    for (const branch of branches) {
        const subBranches =
            typeof branch === "object"
                ? [branch]
                : resolveBranchesOfName(typeName, branch, scope)
        for (const subBranch of subBranches) {
            // TODO: Don't push redundant branches
            resolvedBranches.push(subBranch)
        }
    }
    return resolvedBranches
}

const resolveBranchesOfName = (
    typeName: ExtendableTypeName,
    name: string,
    scope: ScopeRoot<dict>
): dict[] => {
    const resolution = scope.resolve(name)
    if (typeof resolution === "object" && resolution[typeName]) {
        const attributeValue = resolution[typeName]!
        if (attributeValue === true) {
            // Empty attributes fulfills the expected type while acting the same as true
            return [{}]
        }
        if (typeof attributeValue === "string") {
            return resolveBranchesOfName(typeName, attributeValue, scope)
        }
        if (hasType(attributeValue, "object", "dict")) {
            return [attributeValue]
        }
        return resolveBranches(typeName, attributeValue, scope)
    }
    return throwInternalError(
        `Unexpected failure to resolve '${name}' as a ${typeName}`
    )
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
